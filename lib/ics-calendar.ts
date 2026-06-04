import { addDays, endOfDay, startOfDay } from "date-fns"
import type { CalendarEvent } from "@/types/calendar"
import { DEFAULT_EVENT_COLOR } from "@/types/calendar"

export type CalendarImportMode = "add" | "skip-duplicates" | "update"

export type ParsedIcsEvent = Omit<CalendarEvent, "id" | "createdAt" | "updatedAt">

export type IcsParseResult = {
  events: ParsedIcsEvent[]
  calendarName?: string
  skipped: number
  warnings: string[]
}

type IcsProperty = {
  name: string
  params: Record<string, string>
  value: string
}

const ACCEPTED_EXTENSIONS = [".ics", ".ical", ".ifb"]

function unfoldIcsLines(text: string): string[] {
  const raw = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")
  const lines: string[] = []
  for (const line of raw) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1)
    } else if (line.trim()) {
      lines.push(line.trim())
    }
  }
  return lines
}

function unescapeIcsText(value: string): string {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
}

function parseIcsProperty(line: string): IcsProperty {
  const colon = line.indexOf(":")
  const head = colon >= 0 ? line.slice(0, colon) : line
  const value = colon >= 0 ? line.slice(colon + 1) : ""
  const parts = head.split(";")
  const name = parts[0]?.toUpperCase() ?? ""
  const params: Record<string, string> = {}
  for (let i = 1; i < parts.length; i++) {
    const p = parts[i]
    const eq = p.indexOf("=")
    if (eq >= 0) {
      params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1)
    }
  }
  return { name, params, value: unescapeIcsText(value) }
}

function parseIcsDate(
  value: string,
  params: Record<string, string>
): { date: Date; allDay: boolean } | null {
  if (!value) return null
  const isDate = params.VALUE === "DATE" || (!value.includes("T") && value.length === 8)
  if (isDate) {
    const y = Number(value.slice(0, 4))
    const m = Number(value.slice(4, 6)) - 1
    const d = Number(value.slice(6, 8))
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null
    return { date: new Date(y, m, d), allDay: true }
  }

  const isUtc = value.endsWith("Z")
  const clean = isUtc ? value.slice(0, -1) : value.replace(/[+-]\d{4}$/, "")
  if (clean.length < 8) return null

  const y = Number(clean.slice(0, 4))
  const mo = Number(clean.slice(4, 6)) - 1
  const d = Number(clean.slice(6, 8))
  const h = clean.length >= 11 ? Number(clean.slice(9, 11)) : 0
  const mi = clean.length >= 13 ? Number(clean.slice(11, 13)) : 0
  const s = clean.length >= 15 ? Number(clean.slice(13, 15)) : 0
  if (![y, mo, d, h, mi, s].every(Number.isFinite)) return null

  if (isUtc) {
    return { date: new Date(Date.UTC(y, mo, d, h, mi, s)), allDay: false }
  }
  return { date: new Date(y, mo, d, h, mi, s), allDay: false }
}

function allDayEndFromExclusive(endDate: Date): Date {
  return endOfDay(addDays(startOfDay(endDate), -1))
}

function blocksFromLines(lines: string[], type: string): Record<string, IcsProperty[]>[] {
  const blocks: Record<string, IcsProperty[]>[] = []
  let current: Record<string, IcsProperty[]> | null = null

  for (const line of lines) {
    if (line === `BEGIN:${type}`) {
      current = {}
      continue
    }
    if (line === `END:${type}`) {
      if (current) blocks.push(current)
      current = null
      continue
    }
    if (!current) continue
    const prop = parseIcsProperty(line)
    if (!current[prop.name]) current[prop.name] = []
    current[prop.name].push(prop)
  }

  return blocks
}

function firstProp(block: Record<string, IcsProperty[]>, name: string): IcsProperty | undefined {
  return block[name]?.[0]
}

function generateId() {
  return Math.random().toString(36).substring(2, 11)
}

export function parseIcsCalendar(text: string, sourceHint?: string): IcsParseResult {
  const lines = unfoldIcsLines(text)
  const warnings: string[] = []
  let skipped = 0

  const calendarBlocks = blocksFromLines(lines, "VCALENDAR")
  const calendarProps = calendarBlocks[0] ?? {}
  const calendarName =
    firstProp(calendarProps, "X-WR-CALNAME")?.value ||
    firstProp(calendarProps, "NAME")?.value ||
    sourceHint

  const eventBlocks = blocksFromLines(lines, "VEVENT")
  const events: ParsedIcsEvent[] = []

  for (const block of eventBlocks) {
    const startProp = firstProp(block, "DTSTART")
    if (!startProp) {
      skipped++
      continue
    }

    const startParsed = parseIcsDate(startProp.value, startProp.params)
    if (!startParsed) {
      skipped++
      warnings.push("DTSTART invalid")
      continue
    }

    let start = startParsed.date
    let end: Date
    let allDay = startParsed.allDay

    const endProp = firstProp(block, "DTEND")
    const durationProp = firstProp(block, "DURATION")

    if (endProp) {
      const endParsed = parseIcsDate(endProp.value, endProp.params)
      if (endParsed) {
        if (allDay || endParsed.allDay) {
          allDay = true
          start = startOfDay(start)
          end = allDayEndFromExclusive(endParsed.date)
          if (end < start) end = endOfDay(start)
        } else {
          end = endParsed.date
        }
      } else {
        end = allDay ? endOfDay(start) : new Date(start.getTime() + 60 * 60 * 1000)
      }
    } else if (durationProp) {
      const ms = parseIcsDuration(durationProp.value)
      end = new Date(start.getTime() + (ms ?? 60 * 60 * 1000))
    } else {
      end = allDay ? endOfDay(start) : new Date(start.getTime() + 60 * 60 * 1000)
    }

    if (end < start) {
      end = allDay ? endOfDay(start) : new Date(start.getTime() + 60 * 60 * 1000)
    }

    let description = firstProp(block, "DESCRIPTION")?.value ?? ""
    const location = firstProp(block, "LOCATION")?.value
    if (location) {
      description = description ? `${description}\n${location}` : location
    }

    const rrule = firstProp(block, "RRULE")?.value
    if (rrule) {
      description = description
        ? `${description}\n\n[RRULE: ${rrule}]`
        : `[RRULE: ${rrule}]`
    }

    const uid = firstProp(block, "UID")?.value ?? null
    const summary = firstProp(block, "SUMMARY")?.value?.trim() || "Untitled"

    events.push({
      title: summary,
      description,
      start: allDay ? startOfDay(start) : start,
      end: allDay ? endOfDay(end) : end,
      allDay,
      color: DEFAULT_EVENT_COLOR,
      lessonId: null,
      externalUid: uid,
      source: calendarName ?? sourceHint ?? null,
    })
  }

  return { events, calendarName, skipped, warnings }
}

function parseIcsDuration(value: string): number | null {
  const match = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i.exec(value)
  if (!match) return null
  const weeks = Number(match[1] || 0)
  const days = Number(match[2] || 0)
  const hours = Number(match[3] || 0)
  const minutes = Number(match[4] || 0)
  const seconds = Number(match[5] || 0)
  return (((weeks * 7 + days) * 24 + hours) * 60 + minutes) * 60 * 1000 + seconds * 1000
}

export function isAcceptedCalendarFile(file: File): boolean {
  const lower = file.name.toLowerCase()
  if (ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))) return true
  return file.type.includes("text/calendar") || file.type.includes("application/ics")
}

export async function parseIcsFiles(files: File[]): Promise<IcsParseResult> {
  const merged: ParsedIcsEvent[] = []
  const warnings: string[] = []
  let skipped = 0
  let calendarName: string | undefined

  for (const file of files) {
    if (!isAcceptedCalendarFile(file)) {
      warnings.push(file.name)
      continue
    }
    const text = await file.text()
    const result = parseIcsCalendar(text, file.name.replace(/\.[^.]+$/, ""))
    merged.push(...result.events)
    skipped += result.skipped
    warnings.push(...result.warnings.map((w) => `${file.name}: ${w}`))
    if (!calendarName && result.calendarName) calendarName = result.calendarName
  }

  return { events: merged, calendarName, skipped, warnings }
}

export function mergeImportedEvents(
  existing: CalendarEvent[],
  imported: ParsedIcsEvent[],
  mode: CalendarImportMode
): { events: CalendarEvent[]; added: number; updated: number; skipped: number } {
  const now = new Date()
  let added = 0
  let updated = 0
  let skipped = 0
  const next = [...existing]

  for (const item of imported) {
    const uid = item.externalUid?.trim()
    const existingIdx =
      uid != null && uid !== ""
        ? next.findIndex((e) => e.externalUid === uid)
        : -1

    if (existingIdx >= 0) {
      if (mode === "skip-duplicates") {
        skipped++
        continue
      }
      if (mode === "update") {
        next[existingIdx] = {
          ...next[existingIdx],
          ...item,
          id: next[existingIdx].id,
          createdAt: next[existingIdx].createdAt,
          updatedAt: now,
        }
        updated++
        continue
      }
    }

    next.push({
      ...item,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    })
    added++
  }

  return { events: next, added, updated, skipped }
}

function formatIcsUtc(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  )
}

function formatIcsDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return date.getFullYear() + pad(date.getMonth() + 1) + pad(date.getDate())
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
}

function foldIcsLine(line: string, maxLen = 73): string[] {
  if (line.length <= maxLen) return [line]
  const out: string[] = []
  out.push(line.slice(0, maxLen))
  let i = maxLen
  while (i < line.length) {
    out.push(" " + line.slice(i, i + maxLen - 1))
    i += maxLen - 1
  }
  return out
}

export function serializeEventsToIcs(events: CalendarEvent[], calendarName = "Durusi Calendar"): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Durusi//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
  ]

  const stamp = formatIcsUtc(new Date())

  for (const event of events) {
    lines.push("BEGIN:VEVENT")
    lines.push(`UID:${escapeIcsText(event.externalUid ?? `${event.id}@durusi`)}`)
    lines.push(`DTSTAMP:${stamp}`)
    lines.push(`SUMMARY:${escapeIcsText(event.title || "Untitled")}`)

    if (event.description) {
      for (const l of foldIcsLine(`DESCRIPTION:${escapeIcsText(event.description)}`)) {
        lines.push(l)
      }
    }

    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(startOfDay(event.start))}`)
      lines.push(`DTEND;VALUE=DATE:${formatIcsDate(addDays(startOfDay(event.end), 1))}`)
    } else {
      lines.push(`DTSTART:${formatIcsUtc(event.start)}`)
      lines.push(`DTEND:${formatIcsUtc(event.end)}`)
    }

    lines.push("END:VEVENT")
  }

  lines.push("END:VCALENDAR")
  return lines.join("\r\n") + "\r\n"
}

export function downloadIcsFile(events: CalendarEvent[], filename?: string) {
  const content = serializeEventsToIcs(events)
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename ?? `durusi-calendar-${formatIcsDate(new Date())}.ics`
  a.click()
  URL.revokeObjectURL(url)
}
