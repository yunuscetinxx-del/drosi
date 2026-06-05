"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  getDirection,
  getIntlLocale,
  resolveLocale,
  type Locale,
} from "@/lib/i18n/config"
import { getMessages } from "@/lib/i18n/messages"
import { createTranslator, type Translator } from "@/lib/i18n/translator"

type LocaleContextValue = {
  locale: Locale
  dir: "rtl" | "ltr"
  intlLocale: string
  t: Translator
  setLocale: (locale: Locale) => void
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function setLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=31536000;samesite=lax`
}

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale
  children: ReactNode
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  useEffect(() => {
    setLocaleState(initialLocale)
  }, [initialLocale])

  // احفظ لغة المتصفح في الكوكي عند أول زيارة (بدون إعادة تحميل).
  useEffect(() => {
    const hasCookie = document.cookie
      .split(";")
      .some((c) => c.trim().startsWith(`${LOCALE_COOKIE}=`))
    if (!hasCookie) setLocaleCookie(initialLocale)
  }, [initialLocale])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    setLocaleCookie(next)
    document.documentElement.lang = next
    document.documentElement.dir = getDirection(next)
    window.location.reload()
  }, [])

  const value = useMemo(() => {
    const messages = getMessages(locale)
    return {
      locale,
      dir: getDirection(locale),
      intlLocale: getIntlLocale(locale),
      t: createTranslator(messages),
      setLocale,
    }
  }, [locale, setLocale])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    const locale = DEFAULT_LOCALE
    const messages = getMessages(locale)
    return {
      locale,
      dir: getDirection(locale),
      intlLocale: getIntlLocale(locale),
      t: createTranslator(messages),
      setLocale: () => {},
    }
  }
  return ctx
}

export function useTranslations() {
  const { t, locale, dir, intlLocale, setLocale } = useLocale()
  return { t, locale, dir, intlLocale, setLocale, isRtl: dir === "rtl" }
}
