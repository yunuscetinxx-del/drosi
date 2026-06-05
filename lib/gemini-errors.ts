export class GeminiApiError extends Error {
  readonly status?: number
  readonly raw: string

  constructor(message: string, status?: number, raw = "") {
    super(message)
    this.name = "GeminiApiError"
    this.status = status
    this.raw = raw
  }
}

export function isGeminiRateLimitError(err: unknown): boolean {
  if (err instanceof GeminiApiError) {
    return err.status === 429 || isGeminiRateLimitRaw(err.raw, err.status)
  }
  if (err instanceof Error) {
    return isGeminiRateLimitRaw(err.message)
  }
  return false
}

function isGeminiRateLimitRaw(raw: string, status?: number): boolean {
  if (status === 429) return true
  return (
    raw.includes("429") ||
    raw.includes("RESOURCE_EXHAUSTED") ||
    raw.toLowerCase().includes("quota") ||
    raw.includes("حد الطلبات")
  )
}

/** رسائل أخطاء Gemini API مفهومة للمستخدم */
export function formatGeminiError(raw: string, status?: number): string {
  if (status === 404 || raw.includes("NOT_FOUND") || raw.includes("is not found")) {
    return "النموذج غير متاح على مفتاحك. جرّب تحديث التطبيق أو أنشئ مفتاحاً جديداً في AI Studio."
  }

  if (isGeminiRateLimitRaw(raw, status)) {
    return "تجاوزت حد الطلبات في Google AI Studio (ليس اشتراك Gemini في التطبيق). انتظر 1–2 دقيقة أو فعّل الفوترة في AI Studio."
  }

  try {
    const parsed = JSON.parse(raw) as {
      error?: { message?: string; status?: string; code?: number }
    }
    const msg = parsed.error?.message ?? ""
    const code = parsed.error?.code ?? status

    if (code === 400 && (msg.includes("API key not valid") || msg.includes("API_KEY_INVALID"))) {
      return "مفتاح Gemini غير صالح. أنشئ مفتاحاً جديداً من Google AI Studio ثم أعد الربط."
    }
    if (code === 403 || msg.includes("PERMISSION_DENIED")) {
      return "المفتاح لا يملك صلاحية استخدام Gemini API. تأكد من تفعيل Generative Language API."
    }
    if (code === 404 || msg.includes("not found")) {
      return "النموذج غير متاح. حدّث التطبيق أو أنشئ مفتاح API جديداً."
    }
    if (code === 429 || msg.includes("RESOURCE_EXHAUSTED")) {
      return "تجاوزت حد الطلبات في Google AI Studio (ليس اشتراك Gemini في التطبيق). انتظر 1–2 دقيقة أو فعّل الفوترة في AI Studio."
    }
    if (msg) return msg.length > 280 ? `${msg.slice(0, 280)}…` : msg
  } catch {
    /* fall through */
  }

  return raw.length > 280 ? `${raw.slice(0, 280)}…` : raw || "حدث خطأ من Gemini API"
}
