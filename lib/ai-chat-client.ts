import { callGemini } from "@/lib/gemini-client"
import { callOpenRouter, type ChatMessage } from "@/lib/openrouter-client"
import type { AiCredentials } from "@/lib/user-ai-credentials"

export type { ChatMessage }

export async function callAiChat(
  messages: ChatMessage[],
  credentials: AiCredentials,
  opts?: { maxTokens?: number; temperature?: number; title?: string }
): Promise<string> {
  if (credentials.source === "gemini") {
    return callGemini(messages, credentials.apiKey, opts)
  }
  return callOpenRouter(messages, { ...opts, apiKey: credentials.apiKey })
}
