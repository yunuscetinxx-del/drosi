import { NextRequest, NextResponse } from "next/server"
import { AI_MODEL, AI_MODEL_CONFIG } from "@/lib/ai-model"
import { formatOpenRouterError } from "@/lib/openrouter-errors"

export async function POST(req: NextRequest) {
  const { lesson } = await req.json()

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY غير مضبوط" }, { status: 500 })
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
        model: AI_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: AI_MODEL_CONFIG.temperature,
        max_tokens: AI_MODEL_CONFIG.maxTokensLesson,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.log("[v0] OpenRouter error:", err)
      return NextResponse.json(
        { error: formatOpenRouterError(err, response.status) },
        { status: response.status === 429 ? 429 : 500 }
      )
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content ?? ""

    let analysis
    try {
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
