import { decryptApiKey } from "@/lib/ai-key-crypto"
import { prisma } from "@/lib/prisma"

export type AiCredentialSource = "gemini" | "openrouter"

export type AiCredentials = {
  source: AiCredentialSource
  apiKey: string
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super(
      "لا يوجد مفتاح ذكاء اصطناعي. اربط Gemini من الإعدادات (مجاني) أو اطلب من مدير الموقع تفعيل خادم OpenRouter."
    )
    this.name = "AiNotConfiguredError"
  }
}

export async function resolveAiCredentials(userId: string): Promise<AiCredentials> {
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
  geminiConnected: boolean
  geminiKeyHint: string | null
  geminiKeyUpdatedAt: string | null
  serverFallbackAvailable: boolean
  activeSource: "gemini" | "openrouter" | "none"
}

export async function getPublicAiSettings(userId: string): Promise<AiSettingsPublic> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { geminiApiKeyEnc: true, geminiKeyHint: true, geminiKeyUpdatedAt: true },
  })

  const geminiConnected = Boolean(user?.geminiApiKeyEnc)
  const serverFallbackAvailable = Boolean(process.env.OPENROUTER_API_KEY?.trim())

  let activeSource: AiSettingsPublic["activeSource"] = "none"
  if (geminiConnected) activeSource = "gemini"
  else if (serverFallbackAvailable) activeSource = "openrouter"

  return {
    geminiConnected,
    geminiKeyHint: user?.geminiKeyHint ?? null,
    geminiKeyUpdatedAt: user?.geminiKeyUpdatedAt?.toISOString() ?? null,
    serverFallbackAvailable,
    activeSource,
  }
}
