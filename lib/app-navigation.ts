import type { CalendarView } from "@/types/calendar"

export type LessonTab =
  | "details"
  | "keypoints"
  | "notes"
  | "images"
  | "word"
  | "mindmap"
  | "ai"

export type AppRoute = "/lessons" | "/calendar"

const ROUTE_KEY = "durusi_last_route"
const LESSON_ID_KEY = "durusi_selected_lesson_id"
const LESSON_TAB_KEY = "durusi_lesson_tab"
const LESSON_TABS_MAP_KEY = "durusi_lesson_tabs_map"
const CALENDAR_VIEW_KEY = "durusi_calendar_view"
const CALENDAR_DATE_KEY = "durusi_calendar_date"

const VALID_TABS = new Set<LessonTab>([
  "details",
  "keypoints",
  "notes",
  "images",
  "word",
  "mindmap",
  "ai",
])

const VALID_ROUTES = new Set<AppRoute>(["/lessons", "/calendar"])
const VALID_CALENDAR_VIEWS = new Set<CalendarView>(["day", "week", "month", "agenda"])

function readTabsMap(): Record<string, LessonTab> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(LESSON_TABS_MAP_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const out: Record<string, LessonTab> = {}
    for (const [id, tab] of Object.entries(parsed)) {
      if (typeof tab === "string" && VALID_TABS.has(tab as LessonTab)) {
        out[id] = tab as LessonTab
      }
    }
    return out
  } catch {
    return {}
  }
}

function writeTabsMap(map: Record<string, LessonTab>): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(LESSON_TABS_MAP_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

export function readLastRoute(): AppRoute | null {
  if (typeof window === "undefined") return null
  try {
    const v = localStorage.getItem(ROUTE_KEY)
    if (v && VALID_ROUTES.has(v as AppRoute)) return v as AppRoute
  } catch {
    /* ignore */
  }
  return null
}

export function writeLastRoute(route: AppRoute): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(ROUTE_KEY, route)
  } catch {
    /* ignore */
  }
}

export function readSelectedLessonId(): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem(LESSON_ID_KEY)
  } catch {
    return null
  }
}

export function writeSelectedLessonId(lessonId: string): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(LESSON_ID_KEY, lessonId)
  } catch {
    /* ignore */
  }
}

export function clearSelectedLessonId(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(LESSON_ID_KEY)
  } catch {
    /* ignore */
  }
}

/** آخر تبويب لدرس معيّن (Word، خريطة، …) */
export function readLessonTab(lessonId: string): LessonTab {
  const perLesson = readTabsMap()[lessonId]
  if (perLesson) return perLesson

  if (typeof window === "undefined") return "details"
  try {
    const legacy = localStorage.getItem(LESSON_TAB_KEY)
    if (legacy && VALID_TABS.has(legacy as LessonTab)) return legacy as LessonTab
  } catch {
    /* ignore */
  }
  return "details"
}

export function writeLessonTab(lessonId: string, tab: string): void {
  if (typeof window === "undefined") return
  if (!VALID_TABS.has(tab as LessonTab)) return
  const map = readTabsMap()
  map[lessonId] = tab as LessonTab
  writeTabsMap(map)
  try {
    localStorage.setItem(LESSON_TAB_KEY, tab)
  } catch {
    /* ignore */
  }
}

export function readCalendarView(): CalendarView {
  if (typeof window === "undefined") return "month"
  try {
    const v = localStorage.getItem(CALENDAR_VIEW_KEY)
    if (v && VALID_CALENDAR_VIEWS.has(v as CalendarView)) return v as CalendarView
  } catch {
    /* ignore */
  }
  return "month"
}

export function writeCalendarView(view: CalendarView): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(CALENDAR_VIEW_KEY, view)
  } catch {
    /* ignore */
  }
}

export function readCalendarDate(): Date {
  if (typeof window === "undefined") return new Date()
  try {
    const v = localStorage.getItem(CALENDAR_DATE_KEY)
    if (v) {
      const d = new Date(v)
      if (!Number.isNaN(d.getTime())) return d
    }
  } catch {
    /* ignore */
  }
  return new Date()
}

export function writeCalendarDate(date: Date): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(CALENDAR_DATE_KEY, date.toISOString())
  } catch {
    /* ignore */
  }
}
