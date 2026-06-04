/** رسائل OpenRouter مفهومة للمستخدم */
export function formatOpenRouterError(raw: string, status?: number): string {
  if (status === 429) {
    return "النموذج مشغول مؤقتاً (حد الطلبات). انتظر دقيقة ثم أعد المحاولة، أو أضف مفتاح OpenRouter خاصاً من openrouter.ai/settings"
  }

  try {
    const parsed = JSON.parse(raw) as {
      error?: {
        message?: string
        code?: number
        metadata?: { raw?: string; is_byok?: boolean }
      }
    }
    const code = parsed.error?.code ?? status
    const inner = parsed.error?.metadata?.raw ?? parsed.error?.message ?? ""

    if (code === 429 || inner.includes("rate-limited")) {
      return "النموذج مشغول مؤقتاً (حد الطلبات). انتظر دقيقة ثم أعد المحاولة، أو أضف مفتاح OpenRouter خاصاً من openrouter.ai/settings"
    }
    if (
      inner.includes("API_KEY_INVALID") ||
      inner.includes("API key not valid") ||
      parsed.error?.metadata?.raw?.includes("API_KEY_INVALID")
    ) {
      return "مفتاح Google AI Studio المربوط في OpenRouter غير صالح. من openrouter.ai/settings/integrations احذف مفتاح Google أو استبدله بمفتاح صحيح من aistudio.google.com/apikey"
    }
    if (inner) return inner.length > 280 ? `${inner.slice(0, 280)}…` : inner
    if (parsed.error?.message) return parsed.error.message
  } catch {
    if (raw.includes("rate-limited") || raw.includes("429")) {
      return "النموذج مشغول مؤقتاً. أعد المحاولة بعد قليل."
    }
  }

  return raw.length > 280 ? `${raw.slice(0, 280)}…` : raw || "حدث خطأ من OpenRouter"
}
