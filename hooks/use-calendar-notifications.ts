"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { toast } from "sonner"
import type { CalendarEvent } from "@/types/calendar"
import { reviveCalendarEventsFromJSON } from "@/lib/calendar-revive"
import {
  formatNotificationTime,
  getDueEvents,
  hasBeenNotified,
  markNotified,
  msUntilNextCheck,
  notificationKey,
  readNotificationsEnabled,
  requestNotificationPermission,
  showBrowserNotification,
  writeNotificationsEnabled,
} from "@/lib/calendar-notifications"

type TranslateFn = (key: string) => string

function notifyEvent(event: CalendarEvent, t: TranslateFn, locale: string) {
  if (hasBeenNotified(event)) return

  const time = formatNotificationTime(event, locale)
  const title = t("calendar.notifyTitle")
  const body = event.allDay
    ? `${event.title} — ${t("calendar.allDay")}`
    : time
      ? `${event.title} — ${time}`
      : event.title

  showBrowserNotification(title, body, notificationKey(event))
  toast(title, {
    description: body,
    duration: 12_000,
  })

  markNotified(event)
}

export function useCalendarNotificationControls(t: TranslateFn) {
  const [enabled, setEnabled] = useState(true)
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default")

  useEffect(() => {
    setEnabled(readNotificationsEnabled())
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission)
    } else {
      setPermission("unsupported")
    }
  }, [])

  const enableNotifications = useCallback(async () => {
    writeNotificationsEnabled(true)
    setEnabled(true)
    const result = await requestNotificationPermission()
    setPermission(result === "unsupported" ? "unsupported" : result)
    if (result === "granted") {
      toast.success(t("calendar.notifyEnabled"))
    } else if (result === "denied") {
      toast.error(t("calendar.notifyDenied"))
    }
  }, [t])

  const disableNotifications = useCallback(() => {
    writeNotificationsEnabled(false)
    setEnabled(false)
    toast(t("calendar.notifyDisabled"))
  }, [t])

  const toggleNotifications = useCallback(async () => {
    if (enabled) {
      disableNotifications()
      return
    }
    await enableNotifications()
  }, [disableNotifications, enableNotifications, enabled])

  return {
    enabled,
    permission,
    toggleNotifications,
    enableNotifications,
  }
}

export function useCalendarEventNotifier(t: TranslateFn, locale: string) {
  const pathname = usePathname()
  const eventsRef = useRef<CalendarEvent[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const checkDue = useCallback(() => {
    if (!readNotificationsEnabled()) return
    const due = getDueEvents(eventsRef.current)
    for (const event of due) {
      notifyEvent(event, t, locale)
    }
  }, [locale, t])

  const scheduleNext = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const delay = msUntilNextCheck(eventsRef.current)
    timerRef.current = setTimeout(() => {
      checkDue()
      scheduleNext()
    }, delay)
  }, [checkDue])

  useEffect(() => {
    if (pathname.startsWith("/login")) return

    let cancelled = false
    let intervalId: ReturnType<typeof setInterval> | null = null

    const load = async () => {
      try {
        const res = await fetch("/api/calendar", { credentials: "include" })
        if (!res.ok || cancelled) return
        const data = (await res.json()) as { events?: unknown }
        eventsRef.current = reviveCalendarEventsFromJSON(data.events ?? [])
        checkDue()
        scheduleNext()
      } catch {
        /* ignore */
      }
    }

    void load()
    intervalId = setInterval(() => {
      void load()
    }, 60_000)

    const pollId = setInterval(checkDue, 30_000)

    const onCalendarUpdated = () => {
      void load()
    }
    window.addEventListener("durusi_calendar_updated", onCalendarUpdated)

    return () => {
      cancelled = true
      if (intervalId) clearInterval(intervalId)
      clearInterval(pollId)
      window.removeEventListener("durusi_calendar_updated", onCalendarUpdated)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [checkDue, pathname, scheduleNext])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") checkDue()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [checkDue])
}
