import { callGemini } from "@/lib/gemini-client"
import { callOllama } from "@/lib/ollama-client"
import { callOpenRouter, type ChatMessage } from "@/lib/openrouter-client"
import type { AiCredentials } from "@/lib/user-ai-credentials"

export type { ChatMessage }

export async function callAiChat(
  messages: ChatMessage[],
  credentials: AiCredentials,
  opts?: { maxTokens?: number; temperature?: number; title?: string; json?: boolean }
): Promise<string> {
  if (credentials.source === "ollama") {
    return callOllama(messages, opts)
  }
  if (credentials.source === "gemini") {
    return callGemini(messages, credentials.apiKey, opts)
  }
  return callOpenRouter(messages, { ...opts, apiKey: credentials.apiKey })
}
