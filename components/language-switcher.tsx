"use client"

import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config"
import { useTranslations } from "@/components/locale-provider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Languages } from "lucide-react"

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useTranslations()

  return (
    <Select value={locale} onValueChange={(value) => setLocale(value as Locale)}>
      <SelectTrigger className={className ?? "w-[130px] h-9"} aria-label={t("lang.label")}>
        <Languages className="w-4 h-4 ml-2 shrink-0 opacity-70" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LOCALES.map((code) => (
          <SelectItem key={code} value={code}>
            {LOCALE_LABELS[code]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
