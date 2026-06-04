"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { CalendarEvent } from "@/types/calendar"
import { reviveCalendarEventsFromJSON } from "@/lib/calendar-revive"
import {
  mergeImportedEvents,
  type CalendarImportMode,
  type ParsedIcsEvent,
} from "@/lib/ics-calendar"
import { clearNotifiedForEvent } from "@/lib/calendar-notifications"

const generateId = () => Math.random().toString(36).substring(2, 11)
const SAVE_DEBOUNCE_MS = 700

function notifyCalendarChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("durusi_calendar_updated"))
  }
}

export function useCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const eventsRef = useRef<CalendarEvent[]>([])

  useEffect(() => {
    eventsRef.current = events
  }, [events])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/calendar", { credentials: "include" })
        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = "/login"
            return
          }
          if (!cancelled) {
            setEvents([])
            setIsLoaded(true)
          }
          return
        }
        const data = (await res.json()) as { events?: unknown }
        if (!cancelled) {
          setEvents(reviveCalendarEventsFromJSON(data.events ?? []))
          setIsLoaded(true)
          notifyCalendarChanged()
        }
      } catch {
        if (!cancelled) {
          setEvents([])
          setIsLoaded(true)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isLoaded) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null
      const payload = eventsRef.current
      void (async () => {
        try {
          const res = await fetch("/api/calendar", {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ events: payload }),
          })
          if (res.status === 401) window.location.href = "/login"
        } catch {
          /* ignore */
        }
      })()
    }, SAVE_DEBOUNCE_MS)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [events, isLoaded])

  const addEvent = useCallback(
    (event: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">) => {
      const newEvent: CalendarEvent = {
        ...event,
        id: generateId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setEvents((prev) => [...prev, newEvent])
      notifyCalendarChanged()
      return newEvent
    },
    []
  )

  const updateEvent = useCallback((id: string, updates: Partial<CalendarEvent>) => {
    if (updates.start) clearNotifiedForEvent(id)
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates, updatedAt: new Date() } : e))
    )
    notifyCalendarChanged()
  }, [])

  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id))
    notifyCalendarChanged()
  }, [])

  const importEvents = useCallback(
    (imported: ParsedIcsEvent[], mode: CalendarImportMode = "skip-duplicates") => {
      const merged = mergeImportedEvents(eventsRef.current, imported, mode)
      setEvents(merged.events)
      notifyCalendarChanged()
      return { added: merged.added, updated: merged.updated, skipped: merged.skipped }
    },
    []
  )

  return {
    events,
    isLoaded,
    addEvent,
    updateEvent,
    deleteEvent,
    importEvents,
    setEvents,
  }
}
