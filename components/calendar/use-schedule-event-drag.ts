"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { startOfDay } from "date-fns"
import type { CalendarEvent } from "@/types/calendar"
import {
  applyEventMove,
  applyEventResize,
  computeMovePreviewSegments,
  computeResizePreviewSegment,
  type EventDragPreviewSegment,
  type ScheduleSlot,
} from "@/lib/calendar-event-drag"

export type EventDragMode = "move" | "resize"

const DRAG_CLICK_THRESHOLD_PX = 6

type DragContext = {
  event: CalendarEvent
  mode: EventDragMode
  startX: number
  startY: number
  originDay: Date
}

export function useScheduleEventDrag({
  slotFromPoint,
  onUpdateEvent,
  onEventClick,
}: {
  slotFromPoint: (clientX: number, clientY: number) => ScheduleSlot | null
  onUpdateEvent: (id: string, updates: Partial<CalendarEvent>) => void
  onEventClick: (event: CalendarEvent) => void
}) {
  const dragRef = useRef<DragContext | null>(null)
  const previewRef = useRef<EventDragPreviewSegment[]>([])
  const [isEventDragging, setIsEventDragging] = useState(false)
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null)
  const [previewSegments, setPreviewSegments] = useState<EventDragPreviewSegment[]>([])

  const clearDrag = useCallback(() => {
    dragRef.current = null
    previewRef.current = []
    setPreviewSegments([])
    setDraggingEventId(null)
    setIsEventDragging(false)
  }, [])

  const startEventDrag = useCallback(
    (event: CalendarEvent, mode: EventDragMode, clientX: number, clientY: number, originDay: Date) => {
      dragRef.current = { event, mode, startX: clientX, startY: clientY, originDay }
      setDraggingEventId(event.id)
      setIsEventDragging(true)

      if (mode === "move") {
        const durationMs = event.end.getTime() - event.start.getTime()
        const slot = slotFromPoint(clientX, clientY) ?? {
          day: originDay,
          minutes: Math.max(
            0,
            (event.start.getTime() - startOfDay(originDay).getTime()) / 60_000
          ),
        }
        const segments = computeMovePreviewSegments(slot.day, slot.minutes, durationMs, event.color)
        previewRef.current = segments
        setPreviewSegments(segments)
      } else {
        const slot = slotFromPoint(clientX, clientY) ?? {
          day: originDay,
          minutes: Math.max(
            0,
            (event.end.getTime() - startOfDay(originDay).getTime()) / 60_000
          ),
        }
        const segment = computeResizePreviewSegment(event, slot.day, slot.minutes, event.color)
        previewRef.current = [segment]
        setPreviewSegments([segment])
      }
    },
    [slotFromPoint]
  )

  const finishDrag = useCallback(
    (clientX: number, clientY: number) => {
      const ctx = dragRef.current
      if (!ctx) return

      const movedPx = Math.hypot(clientX - ctx.startX, clientY - ctx.startY)
      if (movedPx < DRAG_CLICK_THRESHOLD_PX) {
        clearDrag()
        onEventClick(ctx.event)
        return
      }

      const slot =
        slotFromPoint(clientX, clientY) ??
        (previewRef.current[0]
          ? { day: previewRef.current[0].day, minutes: previewRef.current[0].endMin }
          : { day: ctx.originDay, minutes: 0 })

      if (ctx.mode === "move") {
        const { start, end } = applyEventMove(ctx.event, slot.day, slot.minutes)
        onUpdateEvent(ctx.event.id, { start, end })
      } else {
        const { start, end } = applyEventResize(ctx.event, slot.day, slot.minutes)
        onUpdateEvent(ctx.event.id, { start, end })
      }

      clearDrag()
    },
    [clearDrag, onEventClick, onUpdateEvent, slotFromPoint]
  )

  useEffect(() => {
    if (!isEventDragging) return

    document.body.classList.add("gcal-is-dragging")

    const onMove = (e: PointerEvent) => {
      const ctx = dragRef.current
      if (!ctx) return
      e.preventDefault()

      const slot = slotFromPoint(e.clientX, e.clientY)
      if (!slot) return

      if (ctx.mode === "move") {
        const durationMs = ctx.event.end.getTime() - ctx.event.start.getTime()
        const segments = computeMovePreviewSegments(slot.day, slot.minutes, durationMs, ctx.event.color)
        previewRef.current = segments
        setPreviewSegments(segments)
      } else {
        const segment = computeResizePreviewSegment(ctx.event, slot.day, slot.minutes, ctx.event.color)
        previewRef.current = [segment]
        setPreviewSegments([segment])
      }
    }

    const onUp = (e: PointerEvent) => {
      if (!dragRef.current) return
      finishDrag(e.clientX, e.clientY)
    }

    window.addEventListener("pointermove", onMove, { passive: false })
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)

    return () => {
      document.body.classList.remove("gcal-is-dragging")
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
    }
  }, [finishDrag, isEventDragging, slotFromPoint])

  const previewByDay = useMemo(() => {
    const map = new Map<string, EventDragPreviewSegment[]>()
    for (const seg of previewSegments) {
      const key = startOfDay(seg.day).toISOString()
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(seg)
    }
    return map
  }, [previewSegments])

  return {
    isEventDragging,
    draggingEventId,
    previewByDay,
    startEventDrag,
  }
}
