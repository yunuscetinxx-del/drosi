import { startOfDay } from "date-fns"
import { format } from "date-fns"
import { arSA, de, enUS } from "date-fns/locale"
import type { CalendarEvent } from "@/types/calendar"

export const CALENDAR_NOTIFICATIONS_ENABLED_KEY = "durusi_calendar_notifications_enabled"
export const CALENDAR_NOTIFIED_KEY = "durusi_calendar_notified"

const LOOKBACK_MS = 5 * 60 * 1000
const ALL_DAY_NOTIFY_HOUR = 8

export function readNotificationsEnabled(): boolean {
  if (typeof window === "undefined") return true
  try {
    const v = localStorage.getItem(CALENDAR_NOTIFICATIONS_ENABLED_KEY)
    if (v === null) return true
    return v === "1"
  } catch {
    return true
  }
}

export function writeNotificationsEnabled(enabled: boolean) {
  try {
    localStorage.setItem(CALENDAR_NOTIFICATIONS_ENABLED_KEY, enabled ? "1" : "0")
  } catch {
    /* ignore */
  }
}

function readNotifiedSet(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = localStorage.getItem(CALENDAR_NOTIFIED_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as string[]
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

function writeNotifiedSet(set: Set<string>) {
  try {
    const trimmed = [...set].slice(-500)
    localStorage.setItem(CALENDAR_NOTIFIED_KEY, JSON.stringify(trimmed))
  } catch {
    /* ignore */
  }
}

export function notificationKey(event: CalendarEvent): string {
  return `${event.id}:${event.start.getTime()}`
}

export function hasBeenNotified(event: CalendarEvent): boolean {
  return readNotifiedSet().has(notificationKey(event))
}

export function markNotified(event: CalendarEvent) {
  const set = readNotifiedSet()
  set.add(notificationKey(event))
  writeNotifiedSet(set)
}

export function clearNotifiedForEvent(eventId: string) {
  const set = readNotifiedSet()
  for (const key of [...set]) {
    if (key.startsWith(`${eventId}:`)) set.delete(key)
  }
  writeNotifiedSet(set)
}

function allDayNotifyTime(day: Date): Date {
  const d = startOfDay(day)
  d.setHours(ALL_DAY_NOTIFY_HOUR, 0, 0, 0)
  return d
}

export function isEventDue(event: CalendarEvent, now = new Date()): boolean {
  if (hasBeenNotified(event)) return false

  if (event.allDay) {
    if (startOfDay(event.start).getTime() !== startOfDay(now).getTime()) return false
    return now >= allDayNotifyTime(event.start)
  }

  const startMs = event.start.getTime()
  const nowMs = now.getTime()
  return startMs <= nowMs && startMs > nowMs - LOOKBACK_MS
}

export function getDueEvents(events: CalendarEvent[], now = new Date()): CalendarEvent[] {
  return events.filter((e) => isEventDue(e, now))
}

export function msUntilNextCheck(events: CalendarEvent[], now = new Date()): number {
  let next = 30_000
  for (const event of events) {
    if (hasBeenNotified(event)) continue
    let target: number
    if (event.allDay) {
      if (startOfDay(event.start).getTime() !== startOfDay(now).getTime()) continue
      target = allDayNotifyTime(event.start).getTime()
    } else {
      target = event.start.getTime()
    }
    const delta = target - now.getTime()
    if (delta > 0 && delta < next) next = delta
  }
  return Math.max(1000, Math.min(next, 60_000))
}

export function getDateFnsLocaleForNotifications(locale: string) {
  if (locale === "ar") return arSA
  if (locale === "de") return de
  return enUS
}

export function formatNotificationTime(event: CalendarEvent, locale: string): string {
  const loc = getDateFnsLocaleForNotifications(locale)
  if (event.allDay) return ""
  return format(event.start, "HH:mm", { locale: loc })
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported"
  if (Notification.permission === "granted") return "granted"
  if (Notification.permission === "denied") return "denied"
  return Notification.requestPermission()
}

export function showBrowserNotification(title: string, body: string, tag: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return
  if (Notification.permission !== "granted") return
  try {
    new Notification(title, {
      body,
      tag,
      icon: "/icon.svg",
    })
  } catch {
    /* ignore */
  }
}
