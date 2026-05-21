import { NextRequest, NextResponse } from "next/server"

const MODEL_OPTIONS = {
  "x-ai/grok-3-mini": { name: "Grok 3 Mini" },
  "nvidia/llama-nemotron-embed-vl-1b-v2:free": { name: "Llama Nemotron" },
} as const

type ModelKey = keyof typeof MODEL_OPTIONS

export async function POST(req: NextRequest) {
  const { imageUrl, model = "x-ai/grok-3-mini" } = await req.json()

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY غير مضبوط" }, { status: 500 })
  }

  const selectedModel = model as ModelKey
  if (!(selectedModel in MODEL_OPTIONS)) {
    return NextResponse.json({ error: "نموذج غير صحيح" }, { status: 400 })
  }

  const prompt = `أنت مساعد تعليمي متخصص في تحليل الصور التعليمية. قم بتحليل هذه الصورة وأعطِ تحليلاً شاملاً باللغة العربية.

المطلوب:
1. وصف شامل لمحتوى الصورة
2. تحديد العناصر الرئيسية والمفاهيم المهمة
3. ملاحظات دراسية مفيدة للطالب
4. مفاهيم مرتبطة يمكن البحث عنها

قدّم التحليل بالتنسيق JSON التالي حرفياً بدون أي markdown أو \`\`\` أو نص خارج الـ JSON:
{
  "description": "وصف شامل للصورة",
  "keyElements": ["عنصر 1", "عنصر 2", "عنصر 3"],
  "studyNotes": ["ملاحظة دراسية 1", "ملاحظة دراسية 2", "ملاحظة دراسية 3"],
  "relatedConcepts": ["مفهوم مرتبط 1", "مفهوم مرتبط 2"]
}`

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://durusi.app",
        "X-Title": "Durusi - Image Analyzer",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.log("[v0] OpenRouter image analysis error:", err)
      return NextResponse.json({ error: "خطأ من OpenRouter: " + err }, { status: 500 })
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content ?? ""

    let analysis
    try {
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
      analysis = JSON.parse(cleaned)
    } catch {
      console.log("[v0] Image analysis JSON parse failed, raw text:", text)
      // Return a fallback analysis
      analysis = {
        description: text || "تعذر تحليل الصورة",
        keyElements: [],
        studyNotes: [],
        relatedConcepts: [],
      }
    }

    return NextResponse.json({ analysis })
  } catch (err) {
    console.log("[v0] Image analysis fetch error:", err)
    return NextResponse.json({ error: "خطأ في الاتصال بـ OpenRouter" }, { status: 500 })
  }
}
