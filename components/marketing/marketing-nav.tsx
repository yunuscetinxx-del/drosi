"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useTranslations } from "@/components/locale-provider"
import { cn } from "@/lib/utils"

export function MarketingNav({ active }: { active?: "home" | "pricing" }) {
  const { t } = useTranslations()
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" })
        if (!cancelled) setLoggedIn(res.ok)
      } catch {
        if (!cancelled) setLoggedIn(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const linkClass = (on: boolean) =>
    cn(
      "text-sm font-medium transition-colors",
      on ? "text-foreground" : "text-muted-foreground hover:text-foreground"
    )

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-bold">{t("app.title")}</span>
        </Link>

        <nav className="hidden items-center gap-6 sm:flex">
          <Link href="/" className={linkClass(active === "home")}>
            {t("marketing.nav.home")}
          </Link>
          <Link href="/pricing" className={linkClass(active === "pricing")}>
            {t("marketing.nav.pricing")}
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {loggedIn ? (
            <Button asChild size="sm">
              <Link href="/lessons">{t("marketing.nav.openApp")}</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">{t("auth.login")}</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/login?mode=register">{t("marketing.nav.startFree")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
