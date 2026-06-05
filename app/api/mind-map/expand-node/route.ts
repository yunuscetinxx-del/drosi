import { NextRequest, NextResponse } from "next/server"
import { AI_MODEL_CONFIG } from "@/lib/ai-model"
import { callAiChat } from "@/lib/ai-chat-client"
import { parseJsonFromModel } from "@/lib/openrouter-client"
import { getSessionFromRequest } from "@/lib/auth-server"
import { AiNotConfiguredError, resolveAiCredentials } from "@/lib/user-ai-credentials"

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 })
  }

  const { nodeText, lessonTitle, subject } = await req.json()

  if (!nodeText || typeof nodeText !== "string") {
    return NextResponse.json({ error: "نص العقدة مطلوب" }, { status: 400 })
  }

  const prompt = `أنت مساعد تعليمي. من عقدة خريطة ذهنية بعنوان «${nodeText}» في درس «${lessonTitle || "درس"}» (${subject || "مادة"})، اقترح 4–6 عقد فرعية قصيرة بالعربية للمراجعة.

أعد JSON فقط بدون markdown:
{"branches":["فرع 1","فرع 2","فرع 3","فرع 4"]}`

  try {
    const credentials = await resolveAiCredentials(session.userId)
    const text = await callAiChat(
      [{ role: "user", content: prompt }],
      credentials,
      { maxTokens: 512, temperature: AI_MODEL_CONFIG.temperature, title: "Durusi - Mind Map" }
    )

    const parsed = parseJsonFromModel<{ branches?: string[] }>(text, { branches: [] })
    const branches = Array.isArray(parsed.branches)
      ? parsed.branches.filter((b): b is string => typeof b === "string" && b.trim().length > 0)
      : []

    return NextResponse.json({ branches })
  } catch (err) {
    if (err instanceof AiNotConfiguredError) {
      return NextResponse.json({ error: err.message, code: "AI_NOT_CONFIGURED" }, { status: 503 })
    }
    return NextResponse.json({ error: "فشل توسيع العقدة" }, { status: 500 })
  }
}
