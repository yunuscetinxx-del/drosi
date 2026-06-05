import { getLessonNotes } from "@/lib/lesson-notes"
import { notePreviewText } from "@/lib/lesson-note-content"
import type { Lesson } from "@/types/lesson"
import type { ChatSourceScope, LessonAnalysisEntry } from "@/types/lesson-analysis"

export function buildChatContextFromLesson(
  lesson: Lesson,
  scope: ChatSourceScope,
  analyses: LessonAnalysisEntry[]
): string {
  const blocks: string[] = []

  for (const id of scope.analysisIds) {
    const a = analyses.find((x) => x.id === id)
    if (a) {
      blocks.push(`### سجل تحليل: ${a.title}\n${a.markdownReport || a.summary}`)
    }
  }

  for (const id of scope.imageIds) {
    const img = lesson.images.find((i) => i.id === id)
    if (!img) continue
    if (img.aiAnalysis) {
      const a = img.aiAnalysis
      blocks.push(
        `### صورة الدرس\n${a.description}\nعناصر: ${a.keyElements.join("، ")}\nملاحظات: ${a.studyNotes.join(" | ")}`
      )
    } else {
      const linked = analyses.find((x) => x.imageId === id)
      if (linked) {
        blocks.push(`### صورة (تحليل مرتبط)\n${linked.summary}`)
      } else {
        blocks.push(`### صورة مرفقة\n[صورة من الدرس — اطلب تحليلها إن لزم]`)
      }
    }
  }

  const notes = getLessonNotes(lesson)
  for (const id of scope.noteIds) {
    const n = notes.find((x) => x.id === id)
    if (n) {
      const plain = notePreviewText(n.content, 8000)
      blocks.push(`### ملاحظة: ${n.title}\n${plain}`)
    }
  }

  for (const id of scope.wordPageIds) {
    const p = (lesson.wordPages ?? []).find((w) => w.id === id)
    if (p) {
      const text = p.content.replace(/<[^>]+>/g, " ").trim().slice(0, 4000)
      blocks.push(`### صفحة Word: ${p.title}\n${text}`)
    }
  }

  return blocks.length ? blocks.join("\n\n---\n\n") : ""
}

export function countActiveSources(scope: ChatSourceScope): number {
  return (
    scope.analysisIds.length +
    scope.imageIds.length +
    scope.noteIds.length +
    scope.wordPageIds.length
  )
}
