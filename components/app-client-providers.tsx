"use client"

import { Toaster } from "sonner"
import { useTranslations } from "@/components/locale-provider"
import { useCalendarEventNotifier } from "@/hooks/use-calendar-notifications"

function CalendarEventNotifierInner() {
  const { t, locale } = useTranslations()
  useCalendarEventNotifier(t, locale)
  return null
}

export function AppClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster theme="dark" richColors closeButton position="top-center" />
      <CalendarEventNotifierInner />
    </>
  )
}
