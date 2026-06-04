import { startOfDay } from "date-fns"
import type { CalendarEvent } from "@/types/calendar"
import {
  CALENDAR_SNAP_MINUTES,
  dateFromDayAndMinutes,
  getTimedDragSegments,
  minutesFromGridY,
  snapCalendarMinutes,
  CALENDAR_HOUR_HEIGHT_PX,
} from "@/lib/calendar-utils"

export type ScheduleSlot = { day: Date; minutes: number }

export type EventDragPreviewSegment = {
  day: Date
  startMin: number
  endMin: number
  color: string
}

export function slotFromPointInGrid(
  clientX: number,
  clientY: number,
  hourHeight = CALENDAR_HOUR_HEIGHT_PX
): ScheduleSlot | null {
  const el = document.elementFromPoint(clientX, clientY)
  const column = (el as HTMLElement | null)?.closest("[data-gcal-day-column]")
  if (!column) return null
  const iso = column.getAttribute("data-gcal-day")
  if (!iso) return null
  const day = startOfDay(new Date(iso))
  const rect = column.getBoundingClientRect()
  const minutes = minutesFromGridY(clientY - rect.top, hourHeight)
  return { day, minutes }
}

export function computeMovePreviewSegments(
  targetDay: Date,
  targetStartMin: number,
  durationMs: number,
  color: string
): EventDragPreviewSegment[] {
  const minDuration = Math.max(durationMs, CALENDAR_SNAP_MINUTES * 60_000)
  const start = dateFromDayAndMinutes(targetDay, targetStartMin)
  const end = new Date(start.getTime() + minDuration)
  const endDay = startOfDay(end)
  const endMin = (end.getTime() - endDay.getTime()) / 60_000
  return getTimedDragSegments(targetDay, targetStartMin, endDay, endMin).map((seg) => ({
    ...seg,
    color,
  }))
}

export function computeResizePreviewSegment(
  event: CalendarEvent,
  targetDay: Date,
  targetEndMin: number,
  color: string
): EventDragPreviewSegment {
  const dayStart = startOfDay(targetDay)
  const rawStartMin = Math.max(0, (event.start.getTime() - dayStart.getTime()) / 60_000)
  const startMin = snapCalendarMinutes(rawStartMin)
  let endMin = snapCalendarMinutes(targetEndMin)
  if (endMin - startMin < CALENDAR_SNAP_MINUTES) {
    endMin = startMin + CALENDAR_SNAP_MINUTES
  }
  endMin = Math.min(24 * 60, endMin)
  return { day: dayStart, startMin, endMin, color }
}

export function applyEventMove(event: CalendarEvent, targetDay: Date, targetStartMin: number) {
  const durationMs = Math.max(
    event.end.getTime() - event.start.getTime(),
    CALENDAR_SNAP_MINUTES * 60_000
  )
  const start = dateFromDayAndMinutes(targetDay, targetStartMin)
  const end = new Date(start.getTime() + durationMs)
  return { start, end }
}

export function applyEventResize(event: CalendarEvent, targetDay: Date, targetEndMin: number) {
  let end = dateFromDayAndMinutes(targetDay, targetEndMin)
  if (end <= event.start) {
    end = new Date(event.start.getTime() + CALENDAR_SNAP_MINUTES * 60_000)
  }
  return { start: event.start, end }
}
