export const LOCALES = ["ar", "en", "de"] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = "en"
export const LOCALE_COOKIE = "durusi_locale"

export const LOCALE_LABELS: Record<Locale, string> = {
  ar: "العربية",
  en: "English",
  de: "Deutsch",
}

export function isLocale(value: string | undefined | null): value is Locale {
  return LOCALES.includes(value as Locale)
}

export function resolveLocale(value: string | undefined | null): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE
}

/** يطابق لغة المتصفح (Accept-Language) مع اللغات المدعومة */
export function localeFromAcceptLanguage(
  header: string | null | undefined
): Locale | null {
  if (!header?.trim()) return null

  const entries = header.split(",").map((part) => {
    const [langPart, ...params] = part.trim().split(";")
    const code = langPart.split("-")[0]?.toLowerCase() ?? ""
    let q = 1
    for (const p of params) {
      const m = p.trim().match(/^q=([\d.]+)$/i)
      if (m) q = Number.parseFloat(m[1])
    }
    return { code, q: Number.isFinite(q) ? q : 0 }
  })

  entries.sort((a, b) => b.q - a.q)

  for (const { code } of entries) {
    if (code === "ar") return "ar"
    if (code === "de") return "de"
    if (code === "en") return "en"
  }

  return null
}

/** كوكي المستخدم أولاً، ثم لغة المتصفح، ثم الافتراضي */
export function resolveRequestLocale(
  cookieValue: string | undefined | null,
  acceptLanguage: string | null | undefined
): Locale {
  if (isLocale(cookieValue)) return cookieValue
  return localeFromAcceptLanguage(acceptLanguage) ?? DEFAULT_LOCALE
}

export function getDirection(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr"
}

export function getIntlLocale(locale: Locale): string {
  if (locale === "ar") return "ar-SA"
  if (locale === "de") return "de-DE"
  return "en-US"
}
