"use client"

import { useCalendar } from "@/hooks/use-calendar"
import { CalendarApp } from "@/components/calendar/calendar-app"
import { AppNav } from "@/components/app-nav"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTranslations } from "@/components/locale-provider"
import { CalendarDays, LogOut } from "lucide-react"
import { useEffect, useState } from "react"

export default function CalendarPage() {
  const { t } = useTranslations()
  const { events, isLoaded, addEvent, updateEvent, deleteEvent, importEvents } = useCalendar()
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
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{t("calendar.title")}</h1>
                <p className="text-xs text-muted-foreground">{t("app.subtitle")}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <AppNav />
              <LanguageSwitcher />
              {me?.email && (
                <span className="hidden max-w-[140px] truncate text-xs text-muted-foreground sm:inline" dir="ltr">
                  {me.email}
                </span>
              )}
              {me?.isAdmin && (
                <Badge variant="secondary" className="text-xs">
                  {t("auth.admin")}
                </Badge>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => void logout()}>
                <LogOut className="w-4 h-4 ml-2" />
                {t("auth.logout")}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CalendarApp
          events={events}
          isLoaded={isLoaded}
          onAddEvent={addEvent}
          onUpdateEvent={updateEvent}
          onDeleteEvent={deleteEvent}
          onImportEvents={importEvents}
        />
      </div>
    </div>
  )
}
