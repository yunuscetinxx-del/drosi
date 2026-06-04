import type { CalendarEvent } from "@/types/calendar"

export function reviveCalendarEvent(e: CalendarEvent): CalendarEvent {
  return {
    ...e,
    start: new Date(e.start as unknown as string),
    end: new Date(e.end as unknown as string),
    createdAt: new Date(e.createdAt as unknown as string),
    updatedAt: new Date(e.updatedAt as unknown as string),
    externalUid: e.externalUid ?? null,
    source: e.source ?? null,
  }
}

export function reviveCalendarEventsFromJSON(data: unknown): CalendarEvent[] {
  if (!Array.isArray(data)) return []
  return data.map((item) => reviveCalendarEvent(item as CalendarEvent))
}
