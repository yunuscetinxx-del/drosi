import { formatGeminiError, GeminiApiError } from "@/lib/gemini-errors"
import type { ChatMessage } from "@/lib/openrouter-client"

/** gemini-2.0-flash أُوقف 2026-06-01 — نجرب الأحدث أولاً */
export const GEMINI_MODEL_CANDIDATES = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash",
] as const

export type GeminiModelId = (typeof GEMINI_MODEL_CANDIDATES)[number]

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

function isRetryableModelError(status: number, raw: string): boolean {
  return (
    status === 404 ||
    raw.includes("NOT_FOUND") ||
    raw.includes("not found") ||
    raw.includes("deprecated") ||
    raw.includes("no longer available")
  )
}

async function callGeminiWithModel(
  model: GeminiModelId,
  payload: {
    systemInstruction?: { parts: GeminiPart[] }
    contents: GeminiContent[]
  },
  apiKey: string,
  opts?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: payload.systemInstruction,
      contents: payload.contents,
      generationConfig: {
        temperature: opts?.temperature ?? 0.7,
        maxOutputTokens: opts?.maxTokens ?? 2000,
      },
    }),
  })

  const raw = await response.text()

  if (!response.ok) {
    const message = formatGeminiError(raw, response.status)
    throw new GeminiApiError(message, response.status, raw)
  }

  const data = JSON.parse(raw) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  return (
    data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim() ?? ""
  )
}

export async function callGemini(
  messages: ChatMessage[],
  apiKey: string,
  opts?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const payload = await messagesToGeminiPayload(messages)
  if (payload.contents.length === 0) {
    throw new Error("لا رسائل لإرسالها إلى Gemini")
  }

  let lastError: GeminiApiError | null = null

  for (const model of GEMINI_MODEL_CANDIDATES) {
    try {
      const text = await callGeminiWithModel(model, payload, apiKey, opts)
      if (text) return text
      lastError = new GeminiApiError("لم يصل رد من Gemini", undefined, "")
    } catch (err) {
      if (err instanceof GeminiApiError) {
        lastError = err
        if (isRetryableModelError(err.status ?? 0, err.raw)) continue
        throw err
      }
      throw err
    }
  }

  throw lastError ?? new GeminiApiError("فشل الاتصال بجميع نماذج Gemini", undefined, "")
}

/** تحقق سريع من صلاحية المفتاح — يجرب عدة نماذج */
export async function validateGeminiApiKey(apiKey: string): Promise<void> {
  const text = await callGemini(
    [{ role: "user", content: "رد بكلمة: ok" }],
    apiKey,
    { maxTokens: 16, temperature: 0 }
  )
  if (!text) throw new GeminiApiError("لم يصل رد من Gemini — تحقق من المفتاح")
}
