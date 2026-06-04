"use client"

import { useEffect, useState } from "react"
import type { CalendarEvent } from "@/types/calendar"
import { CALENDAR_COLORS, DEFAULT_EVENT_COLOR } from "@/types/calendar"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Trash2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export type EventFormState = {
  title: string
  description: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  allDay: boolean
  color: string
}

function toFormState(
  event?: CalendarEvent | null,
  defaultStart?: Date,
  defaultEnd?: Date,
  defaultAllDay?: boolean
): EventFormState {
  const base = defaultStart ?? new Date()
  const start = event?.start ?? base
  const end =
    event?.end ??
    defaultEnd ??
    new Date(base.getTime() + 60 * 60 * 1000)
  return {
    title: event?.title ?? "",
    description: event?.description ?? "",
    startDate: format(start, "yyyy-MM-dd"),
    startTime: format(start, "HH:mm"),
    endDate: format(end, "yyyy-MM-dd"),
    endTime: format(end, "HH:mm"),
    allDay: event?.allDay ?? defaultAllDay ?? false,
    color: event?.color ?? DEFAULT_EVENT_COLOR,
  }
}

function formToDates(form: EventFormState) {
  const start = new Date(`${form.startDate}T${form.allDay ? "00:00" : form.startTime}`)
  const end = new Date(`${form.endDate}T${form.allDay ? "23:59" : form.endTime}`)
  if (end < start) return { start, end: new Date(start.getTime() + 60 * 60 * 1000) }
  return { start, end }
}

interface CalendarEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event?: CalendarEvent | null
  defaultStart?: Date
  defaultEnd?: Date
  defaultAllDay?: boolean
  onSave: (data: Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">) => void
  onUpdate?: (id: string, data: Partial<CalendarEvent>) => void
  onDelete?: (id: string) => void
  t: (key: string) => string
}

export function CalendarEventDialog({
  open,
  onOpenChange,
  event,
  defaultStart,
  defaultEnd,
  defaultAllDay,
  onSave,
  onUpdate,
  onDelete,
  t,
}: CalendarEventDialogProps) {
  const [form, setForm] = useState<EventFormState>(() =>
    toFormState(event, defaultStart, defaultEnd, defaultAllDay)
  )

  useEffect(() => {
    if (open) setForm(toFormState(event, defaultStart, defaultEnd, defaultAllDay))
  }, [open, event, defaultStart, defaultEnd, defaultAllDay])

  const handleSubmit = () => {
    if (!form.title.trim()) return
    const { start, end } = formToDates(form)
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      start,
      end,
      allDay: form.allDay,
      color: form.color,
      lessonId: event?.lessonId ?? null,
    }
    if (event && onUpdate) {
      onUpdate(event.id, payload)
    } else {
      onSave(payload)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{event ? t("calendar.editEvent") : t("calendar.newEvent")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t("calendar.eventTitle")}</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={t("calendar.eventTitlePlaceholder")}
              autoFocus
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="all-day">{t("calendar.allDay")}</Label>
            <Switch
              id="all-day"
              checked={form.allDay}
              onCheckedChange={(v) => setForm({ ...form, allDay: v })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("calendar.start")}</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
              {!form.allDay && (
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("calendar.end")}</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
              {!form.allDay && (
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                />
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("calendar.color")}</Label>
            <div className="flex flex-wrap gap-2">
              {CALENDAR_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition-transform hover:scale-110",
                    form.color === c.value ? "border-foreground scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: c.value }}
                  onClick={() => setForm({ ...form, color: c.value })}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("calendar.description")}</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder={t("calendar.descriptionPlaceholder")}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {event && onDelete ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                onDelete(event.id)
                onOpenChange(false)
              }}
            >
              <Trash2 className="h-4 w-4 ml-1" />
              {t("common.delete")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={!form.title.trim()}>
              {t("common.save")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
