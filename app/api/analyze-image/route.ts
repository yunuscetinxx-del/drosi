import { NextRequest, NextResponse } from "next/server"
import { AI_MODEL, AI_MODEL_CONFIG } from "@/lib/ai-model"
import { buildImageAnalysisPrompt } from "@/lib/image-analysis-prompt"
import { formatOpenRouterError } from "@/lib/openrouter-errors"

export async function POST(req: NextRequest) {
  let body: { imageUrl?: string; instructions?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 })
  }

  const { imageUrl, instructions } = body
  if (!imageUrl || typeof imageUrl !== "string") {
    return NextResponse.json({ error: "رابط الصورة مطلوب" }, { status: 400 })
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY غير مضبوط" }, { status: 500 })
  }

  const prompt = buildImageAnalysisPrompt(
    typeof instructions === "string" ? instructions : undefined
  )

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
        model: AI_MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        temperature: AI_MODEL_CONFIG.temperature,
        max_tokens: AI_MODEL_CONFIG.maxTokensImage,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.log("[v0] OpenRouter image analysis error:", err)
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
      console.log("[v0] Image analysis JSON parse failed, raw text:", text)
      analysis = {
        description: text || "تعذر تحليل الصورة",
        keyElements: [] as string[],
        studyNotes: [] as string[],
        relatedConcepts: [] as string[],
      }
    }

    return NextResponse.json({ analysis })
  } catch (err) {
    console.log("[v0] Image analysis fetch error:", err)
    return NextResponse.json({ error: "خطأ في الاتصال بـ OpenRouter" }, { status: 500 })
  }
}
