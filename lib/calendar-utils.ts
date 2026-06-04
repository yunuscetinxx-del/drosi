import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns"
import { arSA, de, enUS } from "date-fns/locale"
import type { CalendarEvent, CalendarView } from "@/types/calendar"

export function getDateFnsLocale(locale: string) {
  if (locale === "ar") return arSA
  if (locale === "de") return de
  return enUS
}

export function getWeekStartsOn(locale: string): 0 | 1 | 6 {
  if (locale === "ar") return 6
  return 0
}

export function navigateDate(date: Date, view: CalendarView, direction: -1 | 1): Date {
  if (view === "day") return addDays(date, direction)
  if (view === "week") return addWeeks(date, direction)
  if (view === "month") return addMonths(date, direction)
  return addMonths(date, direction)
}

export function getViewTitle(date: Date, view: CalendarView, locale: string): string {
  const loc = getDateFnsLocale(locale)
  if (view === "day") return format(date, "EEEE، d MMMM yyyy", { locale: loc })
  if (view === "week") {
    const start = startOfWeek(date, { weekStartsOn: getWeekStartsOn(locale) })
    const end = endOfWeek(date, { weekStartsOn: getWeekStartsOn(locale) })
    return `${format(start, "d MMM", { locale: loc })} – ${format(end, "d MMM yyyy", { locale: loc })}`
  }
  if (view === "agenda") return format(date, "MMMM yyyy", { locale: loc })
  return format(date, "MMMM yyyy", { locale: loc })
}

export function getMonthGridDays(date: Date, locale: string): Date[] {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: getWeekStartsOn(locale) })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: getWeekStartsOn(locale) })
  return eachDayOfInterval({ start: gridStart, end: gridEnd })
}

export function getWeekDays(date: Date, locale: string): Date[] {
  const start = startOfWeek(date, { weekStartsOn: getWeekStartsOn(locale) })
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function eventOccursOnDay(event: CalendarEvent, day: Date): boolean {
  const dayStart = startOfDay(day)
  const dayEnd = endOfDay(day)
  return event.start <= dayEnd && event.end >= dayStart
}

export function eventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events
    .filter((e) => eventOccursOnDay(e, day))
    .sort((a, b) => a.start.getTime() - b.start.getTime())
}

export function eventsForRange(
  events: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date
): CalendarEvent[] {
  return events
    .filter((e) => e.start <= rangeEnd && e.end >= rangeStart)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
}

export function getTimedEventStyle(event: CalendarEvent, day: Date) {
  const dayStart = startOfDay(day)
  const startMin = Math.max(
    0,
    (event.start.getTime() - dayStart.getTime()) / 60000
  )
  const endMin = Math.min(
    24 * 60,
    (event.end.getTime() - dayStart.getTime()) / 60000
  )
  const duration = Math.max(15, endMin - startMin)
  const top = (startMin / (24 * 60)) * 100
  const height = (duration / (24 * 60)) * 100
  return { top: `${top}%`, height: `${Math.max(height, 2)}%` }
}

export function formatEventTime(event: CalendarEvent, locale: string): string {
  const loc = getDateFnsLocale(locale)
  if (event.allDay) return ""
  return `${format(event.start, "HH:mm", { locale: loc })} – ${format(event.end, "HH:mm", { locale: loc })}`
}

/** ارتفاع ساعة واحدة في شبكة الأسبوع/اليوم (px) — يطابق calendar.css */
export const CALENDAR_HOUR_HEIGHT_PX = 48
export const CALENDAR_SNAP_MINUTES = 15

export function snapCalendarMinutes(rawMinutes: number): number {
  return Math.round(rawMinutes / CALENDAR_SNAP_MINUTES) * CALENDAR_SNAP_MINUTES
}

export function minutesFromGridY(y: number, hourHeight = CALENDAR_HOUR_HEIGHT_PX): number {
  const raw = (y / hourHeight) * 60
  return Math.max(
    0,
    Math.min(24 * 60 - CALENDAR_SNAP_MINUTES, snapCalendarMinutes(raw))
  )
}

export function dateFromDayAndMinutes(day: Date, totalMinutes: number): Date {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const d = startOfDay(day)
  d.setHours(hours, minutes, 0, 0)
  return d
}

export function dragSelectStyle(startMin: number, endMin: number) {
  const topMin = Math.min(startMin, endMin)
  const bottomMin = Math.max(startMin, endMin)
  const duration = Math.max(CALENDAR_SNAP_MINUTES, bottomMin - topMin)
  const top = (topMin / (24 * 60)) * 100
  const height = (duration / (24 * 60)) * 100
  return { top: `${top}%`, height: `${Math.max(height, 1.5)}%` }
}

export function getTimedDragSegments(
  startDay: Date,
  startMin: number,
  endDay: Date,
  endMin: number
): { day: Date; startMin: number; endMin: number }[] {
  let start = dateFromDayAndMinutes(startDay, startMin)
  let end = dateFromDayAndMinutes(endDay, endMin)
  if (end < start) {
    const tmp = start
    start = end
    end = tmp
  }
  if (end.getTime() - start.getTime() < CALENDAR_SNAP_MINUTES * 60_000) {
    end = new Date(start.getTime() + CALENDAR_SNAP_MINUTES * 60_000)
  }

  const segments: { day: Date; startMin: number; endMin: number }[] = []
  let cursor = startOfDay(start)
  const lastDay = startOfDay(end)

  while (cursor <= lastDay) {
    const dayStart = startOfDay(cursor)
    const dayEnd = endOfDay(cursor)
    const segStart = start > dayStart ? start : dayStart
    const segEnd = end < dayEnd ? end : dayEnd

    if (segEnd > segStart) {
      const startMinSeg = (segStart.getTime() - dayStart.getTime()) / 60_000
      const endMinSeg = (segEnd.getTime() - dayStart.getTime()) / 60_000
      const snappedStart = snapCalendarMinutes(startMinSeg)
      let snappedEnd = snapCalendarMinutes(endMinSeg)
      if (snappedEnd - snappedStart < CALENDAR_SNAP_MINUTES) {
        snappedEnd = snappedStart + CALENDAR_SNAP_MINUTES
      }
      segments.push({
        day: dayStart,
        startMin: snappedStart,
        endMin: Math.min(24 * 60, snappedEnd),
      })
    }
    cursor = addDays(cursor, 1)
  }

  return segments
}

export { isSameDay, isSameMonth, isToday, startOfDay, endOfDay, subMonths }
