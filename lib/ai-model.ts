/** النموذج الوحيد عبر OpenRouter */
export const AI_MODEL = "google/gemma-4-31b-it:free" as const

export const AI_MODEL_CONFIG = {
  temperature: 0.7,
  maxTokensLesson: 1200,
  maxTokensImage: 1000,
} as const
