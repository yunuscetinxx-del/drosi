/** رسائل أخطاء Gemini API مفهومة للمستخدم */
export function formatGeminiError(raw: string, status?: number): string {
  if (status === 429) {
    return "تجاوزت حد الطلبات المجاني لـ Gemini. انتظر قليلاً أو راجع حدودك في Google AI Studio."
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
    if (code === 429 || msg.includes("RESOURCE_EXHAUSTED")) {
      return "تجاوزت حد الطلبات المجاني لـ Gemini. انتظر قليلاً أو راجع حدودك في Google AI Studio."
    }
    if (msg) return msg.length > 280 ? `${msg.slice(0, 280)}…` : msg
  } catch {
    if (raw.includes("429") || raw.includes("RESOURCE_EXHAUSTED")) {
      return "تجاوزت حد الطلبات. أعد المحاولة بعد قليل."
    }
  }

  return raw.length > 280 ? `${raw.slice(0, 280)}…` : raw || "حدث خطأ من Gemini API"
}
