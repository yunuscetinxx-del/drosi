import { formatGeminiError } from "@/lib/gemini-errors"
import type { ChatMessage } from "@/lib/openrouter-client"

export const GEMINI_MODEL = "gemini-2.0-flash" as const

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } }

type GeminiContent = {
  role?: "user" | "model"
  parts: GeminiPart[]
}

function parseDataUrl(url: string): { mime: string; data: string } | null {
  const m = url.match(/^data:([^;]+);base64,(.+)$/i)
  if (!m) return null
  return { mime: m[1], data: m[2] }
}

async function imageUrlToPart(url: string): Promise<GeminiPart | null> {
  const data = parseDataUrl(url)
  if (data) {
    return { inline_data: { mime_type: data.mime, data: data.data } }
  }
  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const res = await fetch(url)
      if (!res.ok) return null
      const buf = Buffer.from(await res.arrayBuffer())
      const mime = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg"
      return { inline_data: { mime_type: mime, data: buf.toString("base64") } }
    } catch {
      return null
    }
  }
  return null
}

async function openRouterContentToParts(
  content: ChatMessage["content"]
): Promise<GeminiPart[]> {
  if (typeof content === "string") {
    return content.trim() ? [{ text: content }] : []
  }
  const parts: GeminiPart[] = []
  for (const block of content) {
    if (block.type === "text" && block.text?.trim()) {
      parts.push({ text: block.text })
    } else if (block.type === "image_url" && block.image_url?.url) {
      const img = await imageUrlToPart(block.image_url.url)
      if (img) parts.push(img)
    }
  }
  return parts
}

async function messagesToGeminiPayload(messages: ChatMessage[]): Promise<{
  systemInstruction?: { parts: GeminiPart[] }
  contents: GeminiContent[]
}> {
  let systemText = ""
  const contents: GeminiContent[] = []

  for (const msg of messages) {
    if (msg.role === "system") {
      const parts = await openRouterContentToParts(msg.content)
      const text = parts.map((p) => ("text" in p ? p.text : "")).join("\n")
      if (text) systemText += (systemText ? "\n" : "") + text
      continue
    }

    const parts = await openRouterContentToParts(msg.content)
    if (parts.length === 0) continue

    contents.push({
      role: msg.role === "assistant" ? "model" : "user",
      parts,
    })
  }

  return {
    systemInstruction: systemText ? { parts: [{ text: systemText }] } : undefined,
    contents,
  }
}

export async function callGemini(
  messages: ChatMessage[],
  apiKey: string,
  opts?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const { systemInstruction, contents } = await messagesToGeminiPayload(messages)
  if (contents.length === 0) {
    throw new Error("لا رسائل لإرسالها إلى Gemini")
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction,
      contents,
      generationConfig: {
        temperature: opts?.temperature ?? 0.7,
        maxOutputTokens: opts?.maxTokens ?? 2000,
      },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(formatGeminiError(err, response.status))
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text =
    data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim() ?? ""

  return text
}

/** تحقق سريع من صلاحية المفتاح */
export async function validateGeminiApiKey(apiKey: string): Promise<void> {
  const text = await callGemini(
    [{ role: "user", content: "رد بكلمة: ok" }],
    apiKey,
    { maxTokens: 16, temperature: 0 }
  )
  if (!text) throw new Error("لم يصل رد من Gemini — تحقق من المفتاح")
}
