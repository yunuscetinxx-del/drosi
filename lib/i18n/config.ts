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

export function getDirection(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr"
}

export function getIntlLocale(locale: Locale): string {
  if (locale === "ar") return "ar-SA"
  if (locale === "de") return "de-DE"
  return "en-US"
}
