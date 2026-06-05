import type { Lesson, LessonNoteEntry } from "@/types/lesson"

export function generateNoteId(): string {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36)
}

/** ملاحظات الدرس مع ترحيل الحقل القديم notes */
export function getLessonNotes(lesson: Lesson): LessonNoteEntry[] {
  const parsed = lesson.lessonNotes ?? []
  if (parsed.length > 0) return parsed

  const legacy = lesson.notes?.trim() ?? ""
  if (!legacy) return []

  const now = new Date()
  return [
    {
      id: generateNoteId(),
      title: "ملاحظات عامة",
      content: legacy,
      createdAt: now,
      updatedAt: now,
    },
  ]
}

export function sortLessonNotes(notes: LessonNoteEntry[]): LessonNoteEntry[] {
  return [...notes].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}

export function createLessonNote(title = "ملاحظة جديدة", content = ""): LessonNoteEntry {
  const now = new Date()
  return {
    id: generateNoteId(),
    title,
    content,
    createdAt: now,
    updatedAt: now,
  }
}

/** ملاحظة جديدة من الشات أو التحليل */
export function prependLessonNote(
  lesson: Lesson,
  title: string,
  content: string
): LessonNoteEntry[] {
  const note = createLessonNote(title, content)
  return [note, ...getLessonNotes(lesson)]
}

export function appendToLessonNotes(lesson: Lesson, text: string): LessonNoteEntry[] {
  const notes = getLessonNotes(lesson)
  const now = new Date()
  if (notes.length === 0) {
    return [createLessonNote("من الصور", text)]
  }
  const [first, ...rest] = notes
  const merged = first.content.trim() ? `${first.content.trim()}\n\n${text}` : text
  return [{ ...first, content: merged, updatedAt: now }, ...rest]
}
