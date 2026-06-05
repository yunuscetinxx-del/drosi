"use client"

import Link from "next/link"
import { BookOpen } from "lucide-react"
import { useTranslations } from "@/components/locale-provider"

export function MarketingFooter() {
  const { t } = useTranslations()

  return (
    <footer className="border-t border-border/60 bg-card/30">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <span className="font-semibold">{t("app.title")}</span>
        </div>
        <p className="text-sm text-muted-foreground">{t("marketing.footer.tagline")}</p>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/pricing" className="text-muted-foreground hover:text-foreground">
            {t("marketing.nav.pricing")}
          </Link>
          <Link href="/login" className="text-muted-foreground hover:text-foreground">
            {t("auth.login")}
          </Link>
        </div>
      </div>
    </footer>
  )
}
