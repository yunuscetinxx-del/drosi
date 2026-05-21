import { NextRequest, NextResponse } from "next/server"

export const MODEL_OPTIONS = {
  "x-ai/grok-3-mini": { name: "Grok 3 Mini", description: "سريع وقوي للتحليل التعليمي" },
  "nvidia/llama-nemotron-embed-vl-1b-v2:free": { name: "Llama Nemotron", description: "نموذج متقدم للفهم العميق" },
} as const

type ModelKey = keyof typeof MODEL_OPTIONS

export async function POST(req: NextRequest) {
  const { lesson, model = "x-ai/grok-3-mini" } = await req.json()

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY غير مضبوط" }, { status: 500 })
  }

  const selectedModel = model as ModelKey
  if (!(selectedModel in MODEL_OPTIONS)) {
    return NextResponse.json({ error: "نموذج غير صحيح" }, { status: 400 })
  }

  const prompt = `أنت مساعد تعليمي متخصص. قم بتحليل الدرس التالي وأعطِ تحليلاً شاملاً باللغة العربية.

الدرس: ${lesson.title}
المادة: ${lesson.subject}
الوصف: ${lesson.description}
الملخص: ${lesson.summary}
النقاط الرئيسية:
${lesson.keyPoints.map((p: string, i: number) => `${i + 1}. ${p}`).join("\n")}
الملاحظات: ${lesson.notes}

قدّم التحليل بالتنسيق JSON التالي حرفياً بدون أي markdown أو \`\`\` أو نص خارج الـ JSON:
{
  "difficulty": "سهل | متوسط | صعب",
  "difficultyScore": 1-10,
  "completeness": 1-100,
  "strengths": ["نقطة قوة 1", "نقطة قوة 2", "نقطة قوة 3"],
  "improvements": ["اقتراح تحسين 1", "اقتراح تحسين 2", "اقتراح تحسين 3"],
  "studyTips": ["نصيحة دراسية 1", "نصيحة دراسية 2", "نصيحة دراسية 3"],
  "relatedTopics": ["موضوع مرتبط 1", "موضوع مرتبط 2", "موضوع مرتبط 3"],
  "estimatedStudyTime": "مثلاً: 45 دقيقة",
  "mindMapSuggestions": ["عقدة مقترحة 1", "عقدة مقترحة 2", "عقدة مقترحة 3", "عقدة مقترحة 4"],
  "summary": "ملخص تحليلي شامل للدرس في جملتين أو ثلاث"
}`

  const modelConfig: Record<ModelKey, { temperature: number; maxTokens: number }> = {
    "x-ai/grok-3-mini": { temperature: 0.7, maxTokens: 1200 },
    "nvidia/llama-nemotron-embed-vl-1b-v2:free": { temperature: 0.8, maxTokens: 1500 },
  }

  const config = modelConfig[selectedModel]

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://durusi.app",
        "X-Title": "Durusi - Lesson Manager",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [{ role: "user", content: prompt }],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.log("[v0] OpenRouter error:", err)
      return NextResponse.json({ error: "خطأ من OpenRouter: " + err }, { status: 500 })
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content ?? ""

    let analysis
    try {
      // Strip any markdown code fences if model wraps output
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
      analysis = JSON.parse(cleaned)
    } catch {
      console.log("[v0] JSON parse failed, raw text:", text)
      return NextResponse.json({ error: "فشل في تحليل استجابة النموذج", raw: text }, { status: 500 })
    }

    return NextResponse.json({ analysis })
  } catch (err) {
    console.log("[v0] fetch error:", err)
    return NextResponse.json({ error: "خطأ في الاتصال بـ OpenRouter" }, { status: 500 })
  }
}
