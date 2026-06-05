import { AI_MODEL, AI_MODEL_CONFIG } from "@/lib/ai-model"
import { formatOpenRouterError } from "@/lib/openrouter-errors"

export type ChatMessage = {
  role: "user" | "assistant" | "system"
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
}

export async function callOpenRouter(
  messages: ChatMessage[],
  opts?: { maxTokens?: number; temperature?: number; title?: string }
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error("OPENROUTER_API_KEY غير مضبوط")

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://durusi.app",
      "X-Title": opts?.title ?? "Durusi",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages,
      temperature: opts?.temperature ?? AI_MODEL_CONFIG.temperature,
      max_tokens: opts?.maxTokens ?? AI_MODEL_CONFIG.maxTokensImage,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(formatOpenRouterError(err, response.status))
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content ?? ""
}

export function parseJsonFromModel<T>(text: string, fallback: T): T {
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    return JSON.parse(cleaned) as T
  } catch {
    return fallback
  }
}
