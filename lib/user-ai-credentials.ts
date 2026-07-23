import { decryptApiKey } from "@/lib/ai-key-crypto"
import { isOllamaModelAvailable } from "@/lib/ollama-client"
import { prisma } from "@/lib/prisma"

export type AiCredentialSource = "ollama" | "gemini" | "openrouter"

export type AiCredentials = {
  source: AiCredentialSource
  apiKey: string
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super(
      "لم يتم العثور على Ollama محلي أو مفتاح ذكاء اصطناعي. شغّل Ollama وحمّل نموذج qwen2.5vl:7b، أو اربط Gemini من الإعدادات."
    )
    this.name = "AiNotConfiguredError"
  }
}

export async function resolveAiCredentials(userId: string): Promise<AiCredentials> {
  if (await isOllamaModelAvailable()) {
    return { source: "ollama", apiKey: "" }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { geminiApiKeyEnc: true },
  })

  if (user?.geminiApiKeyEnc) {
    const key = decryptApiKey(user.geminiApiKeyEnc)
    if (key?.trim()) {
      return { source: "gemini", apiKey: key.trim() }
    }
  }

  const serverKey = process.env.OPENROUTER_API_KEY?.trim()
  if (serverKey) {
    return { source: "openrouter", apiKey: serverKey }
  }

  throw new AiNotConfiguredError()
}

export type AiSettingsPublic = {
  ollamaAvailable: boolean
  geminiConnected: boolean
  geminiKeyHint: string | null
  geminiKeyUpdatedAt: string | null
  serverFallbackAvailable: boolean
  activeSource: "ollama" | "gemini" | "openrouter" | "none"
}

export async function getPublicAiSettings(userId: string): Promise<AiSettingsPublic> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { geminiApiKeyEnc: true, geminiKeyHint: true, geminiKeyUpdatedAt: true },
  })

  const geminiConnected = Boolean(user?.geminiApiKeyEnc)
  const serverFallbackAvailable = Boolean(process.env.OPENROUTER_API_KEY?.trim())
  const ollamaAvailable = await isOllamaModelAvailable()

  let activeSource: AiSettingsPublic["activeSource"] = "none"
  if (ollamaAvailable) activeSource = "ollama"
  else if (geminiConnected) activeSource = "gemini"
  else if (serverFallbackAvailable) activeSource = "openrouter"

  return {
    ollamaAvailable,
    geminiConnected,
    geminiKeyHint: user?.geminiKeyHint ?? null,
    geminiKeyUpdatedAt: user?.geminiKeyUpdatedAt?.toISOString() ?? null,
    serverFallbackAvailable,
    activeSource,
  }
}
