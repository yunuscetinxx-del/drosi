import type { ChatMessage } from "@/lib/openrouter-client"

const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434").replace(/\/$/, "")
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL?.trim() || "qwen2.5vl:7b"

function parseDataUrl(url: string): string | null {
  const match = url.match(/^data:[^;]+;base64,(.+)$/i)
  return match?.[1] ?? null
}

async function imageUrlToBase64(url: string): Promise<string | null> {
  const data = parseDataUrl(url)
  if (data) return data
  if (!url.startsWith("http://") && !url.startsWith("https://")) return null

  try {
    const response = await fetch(url)
    if (!response.ok) return null
    return Buffer.from(await response.arrayBuffer()).toString("base64")
  } catch {
    return null
  }
}

async function toOllamaMessages(messages: ChatMessage[]) {
  return Promise.all(
    messages.map(async (message) => {
      if (typeof message.content === "string") return message

      const text = message.content
        .filter((part) => part.type === "text")
        .map((part) => part.text ?? "")
        .join("\n")
        .trim()
      const images = (
        await Promise.all(
          message.content
            .filter((part) => part.type === "image_url" && part.image_url?.url)
            .map((part) => imageUrlToBase64(part.image_url!.url))
        )
      ).filter((image): image is string => Boolean(image))

      return { role: message.role, content: text, ...(images.length ? { images } : {}) }
    })
  )
}

export async function isOllamaModelAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { signal: AbortSignal.timeout(800) })
    if (!response.ok) return false
    const data = (await response.json()) as { models?: Array<{ name?: string; model?: string }> }
    return data.models?.some((model) => model.name === OLLAMA_MODEL || model.model === OLLAMA_MODEL) ?? false
  } catch {
    return false
  }
}

export async function callOllama(
  messages: ChatMessage[],
  opts?: { maxTokens?: number; temperature?: number; json?: boolean; german?: boolean }
): Promise<string> {
  const request = async (requestMessages: ChatMessage[]) => fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: await toOllamaMessages(requestMessages),
      stream: false,
      ...(opts?.json ? { format: "json" } : {}),
      options: {
        temperature: opts?.temperature ?? 0.7,
        num_predict: opts?.maxTokens ?? 2000,
      },
    }),
  })

  let response = await request(messages)
  if (!response.ok) throw new Error(`تعذّر الاتصال بـ Ollama المحلي (${response.status})`)
  let data = (await response.json()) as { message?: { content?: string } }
  let content = data.message?.content?.trim() ?? ""

  if (opts?.german && /\p{Script=Han}/u.test(content)) {
    response = await request([
      ...messages,
      {
        role: "user",
        content: "Rewrite your previous answer in German at CEFR B1 level only. Never use Chinese characters. Keep the requested JSON format if one was requested.",
      },
    ])
    if (!response.ok) throw new Error(`تعذّر إعادة طلب Ollama المحلي (${response.status})`)
    data = (await response.json()) as { message?: { content?: string } }
    content = data.message?.content?.trim() ?? ""
  }
  return content
}