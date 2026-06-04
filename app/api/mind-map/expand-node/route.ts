import { NextRequest, NextResponse } from "next/server"
import { AI_MODEL, AI_MODEL_CONFIG } from "@/lib/ai-model"
import { formatOpenRouterError } from "@/lib/openrouter-errors"

export async function POST(req: NextRequest) {
  const { nodeText, lessonTitle, subject } = await req.json()

  if (!nodeText || typeof nodeText !== "string") {
    return NextResponse.json({ error: "نص العقدة مطلوب" }, { status: 400 })
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY غير مضبوط" }, { status: 500 })
  }

  const prompt = `أنت مساعد تعليمي. من عقدة خريطة ذهنية بعنوان «${nodeText}» في درس «${lessonTitle || "درس"}» (${subject || "مادة"})، اقترح 4–6 عقد فرعية قصيرة بالعربية للمراجعة.

أعد JSON فقط بدون markdown:
{"branches":["فرع 1","فرع 2","فرع 3","فرع 4"]}`

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://durusi.app",
        "X-Title": "Durusi - Mind Map",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: AI_MODEL_CONFIG.temperature,
        max_tokens: 512,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return NextResponse.json(
        { error: formatOpenRouterError(err, response.status) },
        { status: response.status === 429 ? 429 : 500 }
      )
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content ?? ""
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    const parsed = JSON.parse(cleaned) as { branches?: string[] }
    const branches = Array.isArray(parsed.branches)
      ? parsed.branches.filter((b): b is string => typeof b === "string" && b.trim().length > 0)
      : []

    return NextResponse.json({ branches })
  } catch {
    return NextResponse.json({ error: "فشل توسيع العقدة" }, { status: 500 })
  }
}
