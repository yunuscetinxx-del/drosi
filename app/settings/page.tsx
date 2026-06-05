"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AppNav } from "@/components/app-nav"
import { AiSettingsPanel } from "@/components/ai-settings-panel"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTranslations } from "@/components/locale-provider"
import { LogOut, Settings } from "lucide-react"

export default function SettingsPage() {
  const { t } = useTranslations()
  const [me, setMe] = useState<{ email: string; isAdmin: boolean } | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" })
        if (!res.ok) return
        const data = (await res.json()) as { user?: { email: string; isAdmin?: boolean } }
        if (!cancelled && data.user?.email)
          setMe({ email: data.user.email, isAdmin: data.user.isAdmin === true })
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
    } catch {
      /* ignore */
    }
    window.location.href = "/login"
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <header className="sticky top-0 z-50 shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-full px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{t("settings.title")}</h1>
                <p className="text-xs text-muted-foreground">{t("settings.subtitle")}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <AppNav />
              <LanguageSwitcher />
              {me?.email && (
                <span
                  className="hidden max-w-[160px] truncate text-xs text-muted-foreground sm:inline"
                  dir="ltr"
                  title={me.email}
                >
                  {me.email}
                </span>
              )}
              {me?.isAdmin && (
                <>
                  <Badge variant="secondary" className="text-xs">
                    {t("auth.admin")}
                  </Badge>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/admin">لوحة الأدمن</Link>
                  </Button>
                </>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => void logout()}>
                <LogOut className="w-4 h-4 ml-2" />
                {t("auth.logout")}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-2xl space-y-6">
          <AiSettingsPanel />
        </div>
      </main>
    </div>
  )
}
