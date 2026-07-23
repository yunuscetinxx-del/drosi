import { buildMindMapNodesFromTexts } from "@/lib/mind-map-import"
import { getLessonNotes } from "@/lib/lesson-notes"
import { notePreviewText } from "@/lib/lesson-note-content"
import type { Lesson, MindMapNode } from "@/types/lesson"
import type { ChatSourceScope, LessonAnalysisEntry } from "@/types/lesson-analysis"

export type AiMindMapPlan = {
  title?: string
  categories?: Array<{ title?: string; note?: string; items?: Array<{ text?: string; note?: string }> }>
}

export function buildMindMapNodesFromAiPlan(plan: AiMindMapPlan, fallbackTitle: string): MindMapNode[] {
  const centerId = crypto.randomUUID()
  const categories = (plan.categories ?? []).filter((category) => category.title?.trim()).slice(0, 6)
  if (!categories.length) return []

  const nodes: MindMapNode[] = [{
    id: centerId,
    text: plan.title?.trim() || fallbackTitle,
    x: 616,
    y: 374,
    parentId: null,
    color: "#fef08a",
    role: "main",
    note: "خريطة ذهنية مولدة من تحليل الدرس بالذكاء الاصطناعي.",
  }]

  categories.forEach((category, categoryIndex) => {
    const angle = (categoryIndex / categories.length) * Math.PI * 2 - Math.PI / 2
    const categoryId = crypto.randomUUID()
    const x = 700 + Math.cos(angle) * 250
    const y = 400 + Math.sin(angle) * 180
    nodes.push({
      id: categoryId,
      text: category.title!.trim(),
      x: x - 72,
      y: y - 20,
      parentId: centerId,
      color: ["#bbf7d0", "#bfdbfe", "#fbcfe8", "#fed7aa", "#ddd6fe", "#ccfbf1"][categoryIndex],
      role: "branch",
      note: category.note?.trim() || "",
    })

    ;(category.items ?? []).filter((item) => item.text?.trim()).slice(0, 6).forEach((item, itemIndex) => {
      const offset = (itemIndex - ((category.items?.length ?? 1) - 1) / 2) * 58
      nodes.push({
        id: crypto.randomUUID(),
        text: item.text!.trim(),
        x: x + Math.cos(angle) * 165 - 60,
        y: y + Math.sin(angle) * 105 + offset - 17,
        parentId: categoryId,
        color: "#ffffff",
        role: "branch",
        note: item.note?.trim() || "",
      })
    })
  })
  return nodes
}

export function collectMindMapBranchesFromSources(
  lesson: Lesson,
  scope: ChatSourceScope,
  analyses: LessonAnalysisEntry[]
): string[] {
  const branches = new Set<string>()

  for (const id of scope.analysisIds) {
    const a = analyses.find((x) => x.id === id)
    if (!a) continue
    for (const k of a.content.keyElements ?? []) if (k.trim()) branches.add(k.trim())
    for (const g of a.content.grammarTopics ?? []) if (g.trim()) branches.add(g.trim())
    for (const c of a.content.relatedConcepts ?? []) if (c.trim()) branches.add(c.trim())
    for (const n of a.content.studyNotes ?? []) if (n.trim()) branches.add(n.trim().slice(0, 80))
    for (const ex of a.content.exercises ?? []) {
      if (ex.title.trim()) branches.add(`تمرين ${ex.number}: ${ex.title}`)
    }
    for (const v of a.content.vocabulary ?? []) {
      if (v.term.trim()) branches.add(`${v.term}: ${v.meaning}`)
    }
  }

  for (const id of scope.imageIds) {
    const img = lesson.images.find((i) => i.id === id)
    if (img?.aiAnalysis) {
      for (const k of img.aiAnalysis.keyElements) branches.add(k)
      for (const c of img.aiAnalysis.relatedConcepts) branches.add(c)
    }
  }

  const notes = getLessonNotes(lesson)
  for (const id of scope.noteIds) {
    const n = notes.find((x) => x.id === id)
    if (n?.title.trim()) branches.add(n.title.trim())
  }

  for (const id of scope.wordPageIds) {
    const p = (lesson.wordPages ?? []).find((w) => w.id === id)
    if (p?.title.trim()) branches.add(p.title.trim())
  }

  return [...branches].slice(0, 24)
}

export function buildMindMapNodesFromSources(
  lessonTitle: string,
  lesson: Lesson,
  scope: ChatSourceScope,
  analyses: LessonAnalysisEntry[]
): MindMapNode[] {
  const branches = collectMindMapBranchesFromSources(lesson, scope, analyses)
  const center =
    analyses.find((a) => scope.analysisIds.includes(a.id))?.title ||
    lessonTitle ||
    "الدرس"
  return buildMindMapNodesFromTexts(center, branches)
}
