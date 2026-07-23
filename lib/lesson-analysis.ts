import type {
  ChatSourceScope,
  LessonAnalysisContent,
  LessonAnalysisEntry,
  LessonChatMessage,
  LessonChatThread,
  SchoolExercise,
} from "@/types/lesson-analysis"
import { emptyChatSourceScope } from "@/types/lesson-analysis"
import type { Lesson } from "@/types/lesson"

export function newId(): string {
  return crypto.randomUUID()
}

export function getLessonAnalyses(lesson: Lesson): LessonAnalysisEntry[] {
  return lesson.lessonAnalyses ?? []
}

export function getLessonChatThreads(lesson: Lesson): LessonChatThread[] {
  return lesson.lessonChatThreads ?? []
}

export function sortAnalysesNewestFirst(list: LessonAnalysisEntry[]): LessonAnalysisEntry[] {
  return [...list].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function parseAnalysisContent(raw: Record<string, unknown>): LessonAnalysisContent {
  const arr = (key: string) =>
    Array.isArray(raw[key]) ? (raw[key] as unknown[]).map(String) : []
  const text = (key: string) =>
    Array.isArray(raw[key]) ? arr(key).join("\n") : raw[key] ? String(raw[key]) : undefined
  const markers = Array.isArray(raw.markers)
    ? raw.markers
        .filter((marker): marker is Record<string, unknown> => Boolean(marker) && typeof marker === "object")
        .map((marker) => ({
          phrase: String(marker.phrase ?? "").trim(),
          note: String(marker.note ?? "").trim(),
          x: Math.max(0, Math.min(1000, Number(marker.x) || 500)),
          y: Math.max(0, Math.min(1000, Number(marker.y) || 500)),
        }))
        .filter((marker) => marker.phrase && marker.note)
        .slice(0, 6)
    : undefined

  const vocabulary = Array.isArray(raw.vocabulary)
    ? (raw.vocabulary as Array<{ term?: string; meaning?: string }>)
        .filter((v) => v?.term)
        .map((v) => ({ term: String(v.term), meaning: String(v.meaning ?? "") }))
    : undefined

  const exercises = Array.isArray(raw.exercises)
    ? (raw.exercises as SchoolExercise[]).map((e) => ({
        number: String(e.number ?? ""),
        title: String(e.title ?? ""),
        type: String(e.type ?? "other"),
        explanation: String(e.explanation ?? ""),
        hints: Array.isArray(e.hints) ? e.hints.map(String) : [],
        sampleAnswers: Array.isArray(e.sampleAnswers)
          ? e.sampleAnswers.map(String)
          : undefined,
      }))
    : undefined

  return {
    visibleText: text("visibleText"),
    description: text("description") ?? "",
    markers,
    keyElements: arr("keyElements"),
    studyNotes: arr("studyNotes"),
    relatedConcepts: arr("relatedConcepts"),
    summary: raw.summary ? String(raw.summary) : undefined,
    detectedSubject: raw.detectedSubject ? String(raw.detectedSubject) : undefined,
    detectedLevel: raw.detectedLevel ? String(raw.detectedLevel) : undefined,
    pageType: raw.pageType ? String(raw.pageType) : undefined,
    grammarTopics: arr("grammarTopics").length ? arr("grammarTopics") : undefined,
    vocabulary,
    exercises,
    studyPlan: arr("studyPlan").length ? arr("studyPlan") : undefined,
  }
}

export function analysisToMarkdown(
  title: string,
  subject: string,
  content: LessonAnalysisContent
): string {
  const lines: string[] = [
    `# ${title}`,
    `**المادة:** ${content.detectedSubject || subject}`,
  ]
  if (content.detectedLevel) lines.push(`**المستوى:** ${content.detectedLevel}`)
  if (content.summary) lines.push("", content.summary)
  lines.push("", "## الوصف", content.description)

  if (content.grammarTopics?.length) {
    lines.push("", "## القواعد / المفاهيم", ...content.grammarTopics.map((g) => `- ${g}`))
  }
  if (content.vocabulary?.length) {
    lines.push("", "## المفردات")
    for (const v of content.vocabulary) lines.push(`- **${v.term}**: ${v.meaning}`)
  }
  if (content.exercises?.length) {
    lines.push("", "## التمارين")
    for (const ex of content.exercises) {
      lines.push(`### تمرين ${ex.number}: ${ex.title}`)
      lines.push(`*النوع:* ${ex.type}`, "", ex.explanation)
      if (ex.hints.length) lines.push("", "**تلميحات:**", ...ex.hints.map((h) => `- ${h}`))
      if (ex.sampleAnswers?.length)
        lines.push("", "**إجابات نموذجية:**", ...ex.sampleAnswers.map((a) => `- ${a}`))
      lines.push("")
    }
  }
  if (content.studyNotes.length) {
    lines.push("## ملاحظات دراسية", ...content.studyNotes.map((n) => `- ${n}`))
  }
  if (content.studyPlan?.length) {
    lines.push("## خطة المراجعة", ...content.studyPlan.map((s) => `- ${s}`))
  }
  if (content.keyElements.length) {
    lines.push("## عناصر رئيسية", ...content.keyElements.map((e) => `- ${e}`))
  }
  if (content.relatedConcepts.length) {
    lines.push("## مفاهيم مرتبطة", ...content.relatedConcepts.map((c) => `- ${c}`))
  }
  return lines.join("\n")
}

export function createAnalysisEntry(params: {
  type: LessonAnalysisEntry["type"]
  title: string
  subject: string
  content: LessonAnalysisContent
  imageId?: string
  imageUrl?: string
  level?: string
  mode?: "auto" | "manual"
}): LessonAnalysisEntry {
  const now = new Date()
  const threadId = newId()
  const summary =
    params.content.summary ||
    params.content.description.slice(0, 240) ||
    "تحليل بدون ملخص"

  return {
    id: newId(),
    type: params.type,
    imageId: params.imageId,
    imageUrl: params.imageUrl,
    title: params.title,
    subject: params.subject,
    level: params.level ?? params.content.detectedLevel,
    mode: params.mode ?? "auto",
    summary,
    content: params.content,
    markdownReport: analysisToMarkdown(params.title, params.subject, params.content),
    chatThreadId: threadId,
    createdAt: now,
    updatedAt: now,
  }
}

export function createChatThread(
  opts?: {
    analysisId?: string
    title?: string
    sourceScope?: ChatSourceScope
  }
): LessonChatThread {
  const now = new Date()
  return {
    id: newId(),
    analysisId: opts?.analysisId,
    title: opts?.title ?? "محادثة جديدة",
    sourceScope: opts?.sourceScope ?? emptyChatSourceScope(),
    messages: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function appendChatMessage(
  thread: LessonChatThread,
  role: LessonChatMessage["role"],
  content: string
): LessonChatThread {
  const msg: LessonChatMessage = {
    id: newId(),
    role,
    content,
    createdAt: new Date(),
  }
  return {
    ...thread,
    messages: [...thread.messages, msg],
    updatedAt: new Date(),
  }
}

export function formatAnalysisForNotes(entry: LessonAnalysisEntry): string {
  return entry.markdownReport
}
