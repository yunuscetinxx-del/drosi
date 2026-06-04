export type CalendarView = "day" | "week" | "month" | "agenda"

export interface CalendarEvent {
  id: string
  title: string
  description: string
  start: Date
  end: Date
  allDay: boolean
  color: string
  lessonId: string | null
  /** UID from imported ICS (Google, Outlook, Apple, etc.) */
  externalUid?: string | null
  /** Source calendar name from import */
  source?: string | null
  createdAt: Date
  updatedAt: Date
}

export const CALENDAR_COLORS = [
  { id: "blue", value: "#039be5" },
  { id: "lavender", value: "#7986cb" },
  { id: "green", value: "#33b679" },
  { id: "purple", value: "#8e24aa" },
  { id: "coral", value: "#e67c73" },
  { id: "yellow", value: "#f6bf26" },
  { id: "orange", value: "#f4511e" },
  { id: "gray", value: "#616161" },
] as const

export const DEFAULT_EVENT_COLOR = CALENDAR_COLORS[0].value
