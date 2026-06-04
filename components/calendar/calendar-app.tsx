"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  addDays,
  addHours,
  endOfMonth,
  endOfDay,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  setHours,
  setMinutes,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import type { CalendarEvent, CalendarView } from "@/types/calendar"
import type { CalendarImportMode, ParsedIcsEvent } from "@/lib/ics-calendar"
import { Button } from "@/components/ui/button"
import { CalendarEventDialog } from "@/components/calendar/calendar-event-dialog"
import { CalendarImportExportDialog } from "@/components/calendar/calendar-import-export-dialog"
import { CalendarNotificationButton } from "@/components/calendar/calendar-notification-button"
import {
  eventsForDay,
  eventsForRange,
  formatEventTime,
  getDateFnsLocale,
  getMonthGridDays,
  getTimedEventStyle,
  getViewTitle,
  getWeekDays,
  getWeekStartsOn,
  navigateDate,
  minutesFromGridY,
  dateFromDayAndMinutes,
  dragSelectStyle,
  getTimedDragSegments,
  CALENDAR_HOUR_HEIGHT_PX,
  CALENDAR_SNAP_MINUTES,
} from "@/lib/calendar-utils"
import { useTranslations } from "@/components/locale-provider"
import { ChevronLeft, ChevronRight, Loader2, Plus, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import { slotFromPointInGrid, type EventDragPreviewSegment } from "@/lib/calendar-event-drag"
import { useScheduleEventDrag, type EventDragMode } from "@/components/calendar/use-schedule-event-drag"
import {
  readCalendarDate,
  readCalendarView,
  writeCalendarDate,
  writeCalendarView,
} from "@/lib/app-navigation"
import "./calendar.css"

const HOUR_HEIGHT = CALENDAR_HOUR_HEIGHT_PX
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const
const DRAG_CLICK_THRESHOLD_PX = 6

interface CalendarAppProps {
  events: CalendarEvent[]
  isLoaded: boolean
  onAddEvent: (event: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">) => void
  onUpdateEvent: (id: string, updates: Partial<CalendarEvent>) => void
  onDeleteEvent: (id: string) => void
  onImportEvents: (
    events: ParsedIcsEvent[],
    mode: CalendarImportMode
  ) => { added: number; updated: number; skipped: number }
}

export function CalendarApp({
  events,
  isLoaded,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  onImportEvents,
}: CalendarAppProps) {
  const { t, locale } = useTranslations()
  const [view, setView] = useState<CalendarView>(() => readCalendarView())
  const [currentDate, setCurrentDate] = useState(() => readCalendarDate())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [createStart, setCreateStart] = useState<Date | undefined>()
  const [createEnd, setCreateEnd] = useState<Date | undefined>()
  const [createAllDay, setCreateAllDay] = useState(false)
  const weekStartsOn = getWeekStartsOn(locale)

  useEffect(() => {
    writeCalendarView(view)
  }, [view])

  useEffect(() => {
    writeCalendarDate(currentDate)
  }, [currentDate])

  const openCreate = (start?: Date) => {
    setEditingEvent(null)
    setCreateStart(start ?? new Date())
    setCreateEnd(undefined)
    setCreateAllDay(false)
    setDialogOpen(true)
  }

  const openCreateRange = (start: Date, end: Date, allDay = false) => {
    setEditingEvent(null)
    setCreateStart(start)
    setCreateEnd(end)
    setCreateAllDay(allDay)
    setDialogOpen(true)
  }

  const openEdit = (event: CalendarEvent) => {
    setEditingEvent(event)
    setCreateStart(undefined)
    setCreateEnd(undefined)
    setCreateAllDay(false)
    setDialogOpen(true)
  }

  const title = getViewTitle(currentDate, view, locale)

  const views: { id: CalendarView; label: string }[] = [
    { id: "day", label: t("calendar.day") },
    { id: "week", label: t("calendar.week") },
    { id: "month", label: t("calendar.month") },
    { id: "agenda", label: t("calendar.agenda") },
  ]

  if (!isLoaded) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="gcal-root flex min-h-0 flex-1 flex-col">
      <div className="gcal-toolbar">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 border-border"
          onClick={() => setCurrentDate(new Date())}
        >
          {t("calendar.today")}
        </Button>
        <div className="flex items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setCurrentDate((d) => navigateDate(d, view, -1))}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setCurrentDate((d) => navigateDate(d, view, 1))}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        <h2 className="min-w-[140px] text-xl font-normal text-[var(--gcal-text)]">{title}</h2>
        <div className="flex-1" />
        <div className="gcal-view-tabs">
          {views.map((v) => (
            <button
              key={v.id}
              type="button"
              className={cn("gcal-view-tab", view === v.id && "active")}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
        <CalendarNotificationButton />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1 border-border"
          onClick={() => setImportDialogOpen(true)}
        >
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">{t("calendar.importExport")}</span>
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-9 gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => openCreate()}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t("calendar.create")}</span>
        </Button>
      </div>

      <div className="gcal-body">
        <aside className="gcal-sidebar hidden md:block">
            <Button
              type="button"
              className="mb-4 w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => openCreate()}
            >
              <Plus className="h-4 w-4" />
              {t("calendar.create")}
            </Button>
            <MiniMonth
              date={currentDate}
              locale={locale}
              weekStartsOn={weekStartsOn}
              onSelect={(d) => {
                setCurrentDate(d)
                if (view === "month") setView("day")
              }}
            />
        </aside>

        <div className="gcal-main">
          {(view === "week" || view === "day") && (
            <p className="shrink-0 border-b border-[var(--gcal-border)] px-4 py-1.5 text-xs text-[var(--gcal-text-secondary)]">
              {t("calendar.dragSelectHint")}
            </p>
          )}
          {view === "month" && (
            <p className="shrink-0 border-b border-[var(--gcal-border)] px-4 py-1.5 text-xs text-[var(--gcal-text-secondary)]">
              {t("calendar.dragSelectMonthHint")}
            </p>
          )}
          {view === "month" && (
            <MonthView
              date={currentDate}
              events={events}
              locale={locale}
              weekStartsOn={weekStartsOn}
              t={t}
              onDayClick={(d) => {
                setCurrentDate(d)
                setView("day")
              }}
              onSlotClick={(d) => openCreate(d)}
              onRangeSelect={(start, end) => openCreateRange(start, end, true)}
              onEventClick={openEdit}
            />
          )}
          {view === "week" && (
            <WeekView
              date={currentDate}
              events={events}
              locale={locale}
              weekStartsOn={weekStartsOn}
              t={t}
              onSlotClick={openCreate}
              onRangeSelect={openCreateRange}
              onEventClick={openEdit}
              onUpdateEvent={onUpdateEvent}
            />
          )}
          {view === "day" && (
            <DayView
              date={currentDate}
              events={events}
              locale={locale}
              t={t}
              onSlotClick={openCreate}
              onRangeSelect={openCreateRange}
              onEventClick={openEdit}
              onUpdateEvent={onUpdateEvent}
            />
          )}
          {view === "agenda" && (
            <AgendaView
              date={currentDate}
              events={events}
              locale={locale}
              t={t}
              onEventClick={openEdit}
              onDayClick={(d) => {
                setCurrentDate(d)
                setView("day")
              }}
            />
          )}
        </div>
      </div>

      <CalendarEventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={editingEvent}
        defaultStart={createStart}
        defaultEnd={createEnd}
        defaultAllDay={createAllDay}
        onSave={onAddEvent}
        onUpdate={onUpdateEvent}
        onDelete={onDeleteEvent}
        t={t}
      />

      <CalendarImportExportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        events={events}
        onImport={onImportEvents}
        t={t}
      />
    </div>
  )
}

function MiniMonth({
  date,
  locale,
  weekStartsOn,
  onSelect,
}: {
  date: Date
  locale: string
  weekStartsOn: 0 | 1 | 6
  onSelect: (d: Date) => void
}) {
  const loc = getDateFnsLocale(locale)
  const [displayMonth, setDisplayMonth] = useState(startOfMonth(date))
  const days = getMonthGridDays(displayMonth, locale)

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          className="rounded p-1 hover:bg-[var(--gcal-hover)]"
          onClick={() => setDisplayMonth((m) => {
            const d = new Date(m)
            d.setMonth(d.getMonth() - 1)
            return startOfMonth(d)
          })}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">
          {format(displayMonth, "MMMM yyyy", { locale: loc })}
        </span>
        <button
          type="button"
          className="rounded p-1 hover:bg-[var(--gcal-hover)]"
          onClick={() => setDisplayMonth((m) => {
            const d = new Date(m)
            d.setMonth(d.getMonth() + 1)
            return startOfMonth(d)
          })}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="gcal-mini-month mb-1">
        {Array.from({ length: 7 }, (_, i) => {
          const wd = addDays(startOfWeek(new Date(), { weekStartsOn }), i)
          return (
            <div key={i} className="text-center text-[10px] text-[var(--gcal-text-secondary)]">
              {format(wd, "EEEEE", { locale: loc })}
            </div>
          )
        })}
      </div>
      <div className="gcal-mini-month">
        {days.map((d) => (
          <button
            key={d.toISOString()}
            type="button"
            className={cn(
              "gcal-mini-day",
              !isSameMonth(d, displayMonth) && "other",
              isToday(d) && "today",
              isSameDay(d, date) && !isToday(d) && "selected"
            )}
            onClick={() => onSelect(d)}
          >
            {format(d, "d")}
          </button>
        ))}
      </div>
    </div>
  )
}

function dayFromEventTarget(target: EventTarget | null): Date | null {
  const cell = (target as HTMLElement | null)?.closest("[data-gcal-day]")
  if (!cell) return null
  const iso = cell.getAttribute("data-gcal-day")
  if (!iso) return null
  return startOfDay(new Date(iso))
}

function normalizeDayRange(a: Date, b: Date) {
  const dayA = startOfDay(a)
  const dayB = startOfDay(b)
  return dayA <= dayB ? { start: dayA, end: dayB } : { start: dayB, end: dayA }
}

function isDayInRange(day: Date, start: Date, end: Date) {
  const t = startOfDay(day).getTime()
  return t >= start.getTime() && t <= end.getTime()
}

function MonthView({
  date,
  events,
  locale,
  weekStartsOn,
  t,
  onDayClick,
  onSlotClick,
  onRangeSelect,
  onEventClick,
}: {
  date: Date
  events: CalendarEvent[]
  locale: string
  weekStartsOn: 0 | 1 | 6
  t: (k: string) => string
  onDayClick: (d: Date) => void
  onSlotClick: (d: Date) => void
  onRangeSelect: (start: Date, end: Date) => void
  onEventClick: (e: CalendarEvent) => void
}) {
  const loc = getDateFnsLocale(locale)
  const days = getMonthGridDays(date, locale)
  const dragRef = useRef<{ startDay: Date; startY: number } | null>(null)
  const [dragRange, setDragRange] = useState<{ start: Date; end: Date } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const finishDrag = useCallback(
    (clientY: number, target: EventTarget | null) => {
      const ctx = dragRef.current
      dragRef.current = null
      setDragRange(null)
      setIsDragging(false)

      if (!ctx) return

      const movedPx = Math.abs(clientY - ctx.startY)
      const endDay = dayFromEventTarget(target) ?? ctx.startDay
      const { start, end } = normalizeDayRange(ctx.startDay, endDay)

      if (movedPx < DRAG_CLICK_THRESHOLD_PX) {
        onSlotClick(setHours(setMinutes(start, 0), 9))
        return
      }

      onRangeSelect(start, endOfDay(end))
    },
    [onRangeSelect, onSlotClick]
  )

  useEffect(() => {
    if (!isDragging) return

    document.body.classList.add("gcal-is-dragging")

    const onMove = (e: PointerEvent) => {
      if (!dragRef.current) return
      e.preventDefault()
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const hoverDay = dayFromEventTarget(el) ?? dragRef.current.startDay
      setDragRange(normalizeDayRange(dragRef.current.startDay, hoverDay))
    }

    const onUp = (e: PointerEvent) => {
      if (!dragRef.current) return
      finishDrag(e.clientY, e.target)
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
  }, [isDragging, finishDrag])

  return (
    <>
      <div className="gcal-month-head">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="gcal-month-head-cell">
            {format(addDays(startOfWeek(new Date(), { weekStartsOn }), i), "EEE", { locale: loc })}
          </div>
        ))}
      </div>
      <div className={cn("gcal-month-grid", isDragging && "is-dragging")}>
        {days.map((day) => {
          const dayEvents = eventsForDay(events, day)
          const visible = dayEvents.slice(0, 3)
          const more = dayEvents.length - 3
          const inRange = dragRange ? isDayInRange(day, dragRange.start, dragRange.end) : false
          return (
            <div
              key={day.toISOString()}
              data-gcal-day={startOfDay(day).toISOString()}
              className={cn(
                "gcal-day-cell",
                !isSameMonth(day, date) && "other-month",
                inRange && "in-drag-range",
                dragRange && isSameDay(day, dragRange.start) && "drag-range-start",
                dragRange && isSameDay(day, dragRange.end) && "drag-range-end"
              )}
              onPointerDown={(e) => {
                if (e.button !== 0) return
                if (
                  (e.target as HTMLElement).closest(
                    ".gcal-event-chip, .gcal-more, .gcal-day-num"
                  )
                ) {
                  return
                }
                e.preventDefault()
                const startDay = startOfDay(day)
                dragRef.current = { startDay, startY: e.clientY }
                setDragRange({ start: startDay, end: startDay })
                setIsDragging(true)
              }}
            >
              <button
                type="button"
                className={cn("gcal-day-num", isToday(day) && "today")}
                onClick={() => onDayClick(day)}
              >
                {format(day, "d")}
              </button>
              {visible.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  className="gcal-event-chip"
                  style={{ backgroundColor: ev.color }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    onEventClick(ev)
                  }}
                >
                  {!ev.allDay && format(ev.start, "HH:mm")} {ev.title}
                </button>
              ))}
              {more > 0 && (
                <button
                  type="button"
                  className="gcal-more"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => onDayClick(day)}
                >
                  +{more} {t("calendar.more")}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

function WeekView({
  date,
  events,
  locale,
  weekStartsOn,
  t,
  onSlotClick,
  onRangeSelect,
  onEventClick,
  onUpdateEvent,
}: {
  date: Date
  events: CalendarEvent[]
  locale: string
  weekStartsOn: 0 | 1 | 6
  t: (k: string) => string
  onSlotClick: (d: Date) => void
  onRangeSelect: (start: Date, end: Date) => void
  onEventClick: (e: CalendarEvent) => void
  onUpdateEvent: (id: string, updates: Partial<CalendarEvent>) => void
}) {
  const loc = getDateFnsLocale(locale)
  const weekDays = getWeekDays(date, locale)
  const dragRef = useRef<{
    startDay: Date
    startMin: number
    startY: number
    startX: number
  } | null>(null)
  const [dragRange, setDragRange] = useState<{
    startDay: Date
    startMin: number
    endDay: Date
    endMin: number
  } | null>(null)
  const dragRangeRef = useRef(dragRange)
  dragRangeRef.current = dragRange
  const [isDragging, setIsDragging] = useState(false)

  const slotFromPoint = useCallback(
    (clientX: number, clientY: number) => slotFromPointInGrid(clientX, clientY, HOUR_HEIGHT),
    []
  )

  const {
    isEventDragging,
    draggingEventId,
    previewByDay,
    startEventDrag,
  } = useScheduleEventDrag({
    slotFromPoint,
    onUpdateEvent,
    onEventClick,
  })

  const handleEventDragStart = useCallback(
    (event: CalendarEvent, mode: EventDragMode, e: React.PointerEvent, day: Date) => {
      startEventDrag(event, mode, e.clientX, e.clientY, day)
    },
    [startEventDrag]
  )

  const finishDrag = useCallback(
    (clientX: number, clientY: number) => {
      const ctx = dragRef.current
      dragRef.current = null
      setDragRange(null)
      setIsDragging(false)

      if (!ctx) return

      const endSlot = slotFromPoint(clientX, clientY) ??
        (dragRangeRef.current
          ? { day: dragRangeRef.current.endDay, minutes: dragRangeRef.current.endMin }
          : { day: ctx.startDay, minutes: ctx.startMin })

      const movedPx = Math.hypot(clientX - ctx.startX, clientY - ctx.startY)

      if (movedPx < DRAG_CLICK_THRESHOLD_PX) {
        onSlotClick(dateFromDayAndMinutes(ctx.startDay, ctx.startMin))
        return
      }

      const segments = getTimedDragSegments(
        ctx.startDay,
        ctx.startMin,
        endSlot.day,
        endSlot.minutes
      )
      if (segments.length === 0) return

      const first = segments[0]
      const last = segments[segments.length - 1]
      onRangeSelect(
        dateFromDayAndMinutes(first.day, first.startMin),
        dateFromDayAndMinutes(last.day, last.endMin)
      )
    },
    [onRangeSelect, onSlotClick, slotFromPoint]
  )

  useEffect(() => {
    if (!isDragging) return

    document.body.classList.add("gcal-is-dragging")

    const onMove = (e: PointerEvent) => {
      if (!dragRef.current) return
      e.preventDefault()
      const endSlot = slotFromPoint(e.clientX, e.clientY) ?? {
        day: dragRef.current.startDay,
        minutes: dragRef.current.startMin,
      }
      setDragRange({
        startDay: dragRef.current.startDay,
        startMin: dragRef.current.startMin,
        endDay: endSlot.day,
        endMin: endSlot.minutes,
      })
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
  }, [isDragging, finishDrag, slotFromPoint])

  const dragSegments = useMemo(() => {
    if (!dragRange) return new Map<string, { startMin: number; endMin: number }>()
    const map = new Map<string, { startMin: number; endMin: number }>()
    for (const seg of getTimedDragSegments(
      dragRange.startDay,
      dragRange.startMin,
      dragRange.endDay,
      dragRange.endMin
    )) {
      map.set(seg.day.toISOString(), { startMin: seg.startMin, endMin: seg.endMin })
    }
    return map
  }, [dragRange])

  const handleColumnPointerDown = useCallback(
    (e: React.PointerEvent, day: Date) => {
      if (e.button !== 0) return
      if (isEventDragging) return
      if ((e.target as HTMLElement).closest(".gcal-timed-event")) return
      e.preventDefault()
      e.stopPropagation()
      const column = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const startMin = minutesFromGridY(e.clientY - column.top, HOUR_HEIGHT)
      const startDay = startOfDay(day)
      dragRef.current = { startDay, startMin, startY: e.clientY, startX: e.clientX }
      setDragRange({ startDay, startMin, endDay: startDay, endMin: startMin + CALENDAR_SNAP_MINUTES })
      setIsDragging(true)
    },
    [isEventDragging]
  )

  return (
    <div className="gcal-week-scroll">
      <div className="gcal-all-day-row">
        <div className="flex items-center justify-end pe-2 text-[10px] text-[var(--gcal-text-secondary)]">
          {t("calendar.allDay")}
        </div>
        {weekDays.map((day) => (
          <AllDayCell key={day.toISOString()} day={day} events={events} onEventClick={onEventClick} />
        ))}
      </div>
      <div className="gcal-week-header">
        <div />
        {weekDays.map((day) => (
          <div key={day.toISOString()} className="border-b border-[var(--gcal-border)] py-2 text-center">
            <div className="text-[11px] text-[var(--gcal-text-secondary)]">
              {format(day, "EEE", { locale: loc })}
            </div>
            <div
              className={cn(
                "mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm",
                isToday(day) && "bg-[var(--gcal-today)] text-[var(--gcal-on-accent)]"
              )}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>
      <div className={cn("gcal-week-grid", (isDragging || isEventDragging) && "is-dragging")}>
        <div className="gcal-time-gutter">
          {HOURS.map((h) => (
            <div key={h} className="gcal-time-slot-label">
              {h > 0 ? format(setHours(startOfDay(new Date()), h), "HH:mm") : ""}
            </div>
          ))}
        </div>
        {weekDays.map((day) => (
          <TimedDayColumn
            key={day.toISOString()}
            day={day}
            events={events}
            onEventClick={onEventClick}
            dragSegment={dragSegments.get(startOfDay(day).toISOString()) ?? null}
            isDragging={isDragging}
            onColumnPointerDown={handleColumnPointerDown}
            draggingEventId={draggingEventId}
            eventPreviewSegments={previewByDay.get(startOfDay(day).toISOString()) ?? []}
            onEventDragStart={handleEventDragStart}
          />
        ))}
      </div>
    </div>
  )
}

function DayView({
  date,
  events,
  locale,
  t,
  onSlotClick,
  onRangeSelect,
  onEventClick,
  onUpdateEvent,
}: {
  date: Date
  events: CalendarEvent[]
  locale: string
  t: (k: string) => string
  onSlotClick: (d: Date) => void
  onRangeSelect: (start: Date, end: Date) => void
  onEventClick: (e: CalendarEvent) => void
  onUpdateEvent: (id: string, updates: Partial<CalendarEvent>) => void
}) {
  const slotFromPoint = useCallback(
    (clientX: number, clientY: number) => slotFromPointInGrid(clientX, clientY, HOUR_HEIGHT),
    []
  )

  const {
    isEventDragging,
    draggingEventId,
    previewByDay,
    startEventDrag,
  } = useScheduleEventDrag({
    slotFromPoint,
    onUpdateEvent,
    onEventClick,
  })

  const handleEventDragStart = useCallback(
    (event: CalendarEvent, mode: EventDragMode, e: React.PointerEvent, day: Date) => {
      startEventDrag(event, mode, e.clientX, e.clientY, day)
    },
    [startEventDrag]
  )

  return (
    <div className="gcal-week-scroll">
      <div className="gcal-all-day-row" style={{ gridTemplateColumns: "56px 1fr" }}>
        <div className="flex items-center justify-end pe-2 text-[10px] text-[var(--gcal-text-secondary)]">
          {t("calendar.allDay")}
        </div>
        <AllDayCell day={date} events={events} onEventClick={onEventClick} />
      </div>
      <div className="gcal-week-grid" style={{ gridTemplateColumns: "56px 1fr" }}>
        <div className="gcal-time-gutter">
          {HOURS.map((h) => (
            <div key={h} className="gcal-time-slot-label">
              {h > 0 ? format(setHours(startOfDay(date), h), "HH:mm") : ""}
            </div>
          ))}
        </div>
        <TimedDayColumn
          day={date}
          events={events}
          onSlotClick={onSlotClick}
          onRangeSelect={onRangeSelect}
          onEventClick={onEventClick}
          draggingEventId={draggingEventId}
          eventPreviewSegments={previewByDay.get(startOfDay(date).toISOString()) ?? []}
          onEventDragStart={handleEventDragStart}
          blockCreateDrag={isEventDragging}
        />
      </div>
    </div>
  )
}

function AllDayCell({
  day,
  events,
  onEventClick,
}: {
  day: Date
  events: CalendarEvent[]
  onEventClick: (e: CalendarEvent) => void
}) {
  const allDay = eventsForDay(
    events.filter((e) => e.allDay),
    day
  )
  return (
    <div className="flex min-h-[28px] flex-col gap-0.5 border-b border-[var(--gcal-border)] p-0.5">
      {allDay.map((ev) => (
        <button
          key={ev.id}
          type="button"
          className="gcal-event-chip"
          style={{ backgroundColor: ev.color }}
          onClick={() => onEventClick(ev)}
        >
          {ev.title}
        </button>
      ))}
    </div>
  )
}

function TimedDayColumn({
  day,
  events,
  onSlotClick,
  onRangeSelect,
  onEventClick,
  dragSegment,
  isDragging,
  onColumnPointerDown,
  draggingEventId,
  eventPreviewSegments,
  onEventDragStart,
  blockCreateDrag,
}: {
  day: Date
  events: CalendarEvent[]
  onSlotClick?: (d: Date) => void
  onRangeSelect?: (start: Date, end: Date) => void
  onEventClick: (e: CalendarEvent) => void
  dragSegment?: { startMin: number; endMin: number } | null
  isDragging?: boolean
  onColumnPointerDown?: (e: React.PointerEvent, day: Date) => void
  draggingEventId?: string | null
  eventPreviewSegments?: EventDragPreviewSegment[]
  onEventDragStart?: (
    event: CalendarEvent,
    mode: EventDragMode,
    e: React.PointerEvent,
    day: Date
  ) => void
  blockCreateDrag?: boolean
}) {
  const columnRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startMin: number; startY: number } | null>(null)
  const [localDragSelection, setLocalDragSelection] = useState<{
    startMin: number
    endMin: number
  } | null>(null)
  const [localDragging, setLocalDragging] = useState(false)
  const weekMode = Boolean(onColumnPointerDown)

  const dayTimed = eventsForDay(events, day).filter((e) => !e.allDay)
  const dragSelection = weekMode ? dragSegment : localDragSelection
  const dragging = weekMode ? isDragging : localDragging

  const minutesFromClientY = useCallback((clientY: number) => {
    const rect = columnRef.current?.getBoundingClientRect()
    if (!rect) return 0
    return minutesFromGridY(clientY - rect.top, HOUR_HEIGHT)
  }, [])

  const finishDrag = useCallback(
    (clientY: number) => {
      const ctx = dragRef.current
      dragRef.current = null
      setLocalDragSelection(null)
      setLocalDragging(false)

      if (!ctx || !onSlotClick || !onRangeSelect) return

      const endMin = minutesFromClientY(clientY)
      const movedPx = Math.abs(clientY - ctx.startY)

      if (movedPx < DRAG_CLICK_THRESHOLD_PX) {
        onSlotClick(dateFromDayAndMinutes(day, ctx.startMin))
        return
      }

      let startMin = Math.min(ctx.startMin, endMin)
      let endMinFinal = Math.max(ctx.startMin, endMin)
      if (endMinFinal - startMin < CALENDAR_SNAP_MINUTES) {
        endMinFinal = startMin + CALENDAR_SNAP_MINUTES
      }
      if (endMinFinal > 24 * 60) endMinFinal = 24 * 60

      onRangeSelect(
        dateFromDayAndMinutes(day, startMin),
        dateFromDayAndMinutes(day, endMinFinal)
      )
    },
    [day, minutesFromClientY, onRangeSelect, onSlotClick]
  )

  useEffect(() => {
    if (weekMode || !localDragging) return

    document.body.classList.add("gcal-is-dragging")

    const onMove = (e: PointerEvent) => {
      if (!dragRef.current) return
      e.preventDefault()
      const endMin = minutesFromClientY(e.clientY)
      setLocalDragSelection({
        startMin: dragRef.current.startMin,
        endMin,
      })
    }

    const onUp = (e: PointerEvent) => {
      if (!dragRef.current) return
      finishDrag(e.clientY)
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
  }, [weekMode, localDragging, finishDrag, minutesFromClientY])

  return (
    <div
      ref={columnRef}
      data-gcal-day-column
      data-gcal-day={startOfDay(day).toISOString()}
      className={cn("gcal-day-column", dragging && "is-dragging")}
      onPointerDown={(e) => {
        if (weekMode) {
          onColumnPointerDown?.(e, day)
          return
        }
        if (blockCreateDrag) return
        if (e.button !== 0) return
        if ((e.target as HTMLElement).closest(".gcal-timed-event")) return
        e.preventDefault()
        e.stopPropagation()
        const startMin = minutesFromClientY(e.clientY)
        dragRef.current = { startMin, startY: e.clientY }
        setLocalDragSelection({ startMin, endMin: startMin + CALENDAR_SNAP_MINUTES })
        setLocalDragging(true)
      }}
    >
      {HOURS.map((h) => (
        <div key={h} className="gcal-hour-line" />
      ))}
      {dragSelection && (
        <div
          className="gcal-drag-selection"
          style={dragSelectStyle(dragSelection.startMin, dragSelection.endMin)}
        />
      )}
      {eventPreviewSegments?.map((seg, i) => (
        <div
          key={`preview-${i}`}
          className="gcal-event-drag-preview"
          style={{
            ...dragSelectStyle(seg.startMin, seg.endMin),
            backgroundColor: seg.color,
          }}
        />
      ))}
      {dayTimed.map((ev) => {
        if (draggingEventId === ev.id) return null
        const style = getTimedEventStyle(ev, day)
        return (
          <div
            key={ev.id}
            className="gcal-timed-event"
            style={{ ...style, backgroundColor: ev.color }}
            onPointerDown={(e) => {
              if (e.button !== 0) return
              if ((e.target as HTMLElement).closest(".gcal-event-resize-handle")) return
              e.stopPropagation()
              e.preventDefault()
              onEventDragStart?.(ev, "move", e, day)
            }}
            onDoubleClick={(e) => {
              e.stopPropagation()
              onEventClick(ev)
            }}
          >
            <div className="truncate font-medium pointer-events-none">{ev.title}</div>
            <div
              className="gcal-event-resize-handle"
              onPointerDown={(e) => {
                if (e.button !== 0) return
                e.stopPropagation()
                e.preventDefault()
                onEventDragStart?.(ev, "resize", e, day)
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

function AgendaView({
  date,
  events,
  locale,
  t,
  onEventClick,
  onDayClick,
}: {
  date: Date
  events: CalendarEvent[]
  locale: string
  t: (k: string) => string
  onEventClick: (e: CalendarEvent) => void
  onDayClick: (d: Date) => void
}) {
  const loc = getDateFnsLocale(locale)
  const rangeStart = startOfMonth(date)
  const rangeEnd = endOfMonth(date)
  const rangeEvents = eventsForRange(events, rangeStart, rangeEnd)

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const ev of rangeEvents) {
      const key = format(startOfDay(ev.start), "yyyy-MM-dd")
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ev)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [rangeEvents])

  if (byDay.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-[var(--gcal-text-secondary)]">
        <p>{t("calendar.noEvents")}</p>
        <Button variant="outline" size="sm" onClick={() => onDayClick(new Date())}>
          {t("calendar.create")}
        </Button>
      </div>
    )
  }

  return (
    <div className="gcal-agenda-list">
      {byDay.map(([key, dayEvents]) => {
        const day = new Date(key)
        return (
          <div key={key} className="gcal-agenda-day">
            <div className="gcal-agenda-day-title">
              {isToday(day) ? t("calendar.today") : format(day, "EEEE، d MMMM", { locale: loc })}
            </div>
            {dayEvents.map((ev) => (
              <button
                key={ev.id}
                type="button"
                className="gcal-agenda-item w-full text-start"
                onClick={() => onEventClick(ev)}
              >
                <div
                  className="mt-1 h-10 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: ev.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{ev.title}</div>
                  <div className="text-sm text-[var(--gcal-text-secondary)]">
                    {ev.allDay ? t("calendar.allDay") : formatEventTime(ev, locale)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )
      })}
    </div>
  )
}
