import type {
  AILearningProfile,
  QuestionHistoryEntry,
  SubjectLearningProfile,
} from "@/types/ai-learning"
import { EMPTY_LEARNING_PROFILE } from "@/types/ai-learning"
import type { LessonAnalysisContent } from "@/types/lesson-analysis"

export function parseLearningProfile(raw: unknown): AILearningProfile {
  let value: unknown = raw
  if (typeof value === "string") {
    try {
      value = JSON.parse(value)
    } catch {
      value = null
    }
  }
  if (!value || typeof value !== "object") return EMPTY_LEARNING_PROFILE()
  const p = value as Partial<AILearningProfile>
  return {
    version: 1,
    updatedAt: typeof p.updatedAt === "string" ? p.updatedAt : new Date().toISOString(),
    subjects: (p.subjects as Record<string, SubjectLearningProfile>) ?? {},
    globalInsights: Array.isArray(p.globalInsights) ? p.globalInsights.map(String) : [],
    questionHistory: Array.isArray(p.questionHistory)
      ? (p.questionHistory as QuestionHistoryEntry[])
      : [],
    analysisCount: typeof p.analysisCount === "number" ? p.analysisCount : 0,
    preferredDetailLevel:
      p.preferredDetailLevel === "brief" || p.preferredDetailLevel === "exam"
        ? p.preferredDetailLevel
        : "detailed",
    aiObservations: Array.isArray(p.aiObservations) ? p.aiObservations.map(String) : [],
  }
}

export function mergeProfileFromAnalysis(
  profile: AILearningProfile,
  content: LessonAnalysisContent,
  subject: string
): AILearningProfile {
  const key = (content.detectedSubject || subject || "عام").trim() || "عام"
  const existing = profile.subjects[key] ?? emptySubjectProfile()

  const topics = new Set(existing.topicsStudied)
  for (const t of content.grammarTopics ?? []) topics.add(t)
  for (const t of content.relatedConcepts ?? []) topics.add(t)

  const vocab = new Set(existing.vocabularySeen)
  for (const v of content.vocabulary ?? []) vocab.add(v.term)

  const grammar = new Set(existing.grammarFocus)
  for (const g of content.grammarTopics ?? []) grammar.add(g)

  const updated: AILearningProfile = {
    ...profile,
    updatedAt: new Date().toISOString(),
    analysisCount: profile.analysisCount + 1,
    subjects: {
      ...profile.subjects,
      [key]: {
        ...existing,
        level: content.detectedLevel ?? existing.level,
        topicsStudied: [...topics].slice(-40),
        grammarFocus: [...grammar].slice(-30),
        vocabularySeen: [...vocab].slice(-80),
        analysisCount: existing.analysisCount + 1,
        lastStudiedAt: new Date().toISOString(),
      },
    },
  }

  if (content.summary) {
    const insight = `${key}: ${content.summary.slice(0, 200)}`
    if (!updated.globalInsights.includes(insight)) {
      updated.globalInsights = [...updated.globalInsights, insight].slice(-25)
    }
  }

  return updated
}

export function mergeProfileFromQuestion(
  profile: AILearningProfile,
  entry: QuestionHistoryEntry
): AILearningProfile {
  const key = (entry.subject || entry.topic || "عام").trim() || "عام"
  const existing = profile.subjects[key] ?? emptySubjectProfile()
  const questions = [...existing.commonQuestions, entry.question].slice(-30)

  const topics = new Set(existing.topicsStudied)
  topics.add(entry.topic)

  return {
    ...profile,
    updatedAt: new Date().toISOString(),
    questionHistory: [...profile.questionHistory, entry].slice(-100),
    subjects: {
      ...profile.subjects,
      [key]: {
        ...existing,
        commonQuestions: questions,
        topicsStudied: [...topics].slice(-40),
        lastStudiedAt: new Date().toISOString(),
      },
    },
  }
}

function emptySubjectProfile(): SubjectLearningProfile {
  return {
    topicsStudied: [],
    grammarFocus: [],
    vocabularySeen: [],
    commonQuestions: [],
    weaknesses: [],
    strengths: [],
    analysisCount: 0,
  }
}

/** تصدير MD للأدمن — قابل للنسخ لذكاء آخر */
export function learningProfileToMarkdown(
  email: string,
  profile: AILearningProfile,
  meta?: { userId: string; createdAt?: string }
): string {
  const lines: string[] = [
    `# ملف تعلّم — ${email}`,
    "",
    `> معرّف المستخدم: \`${meta?.userId ?? "—"}\``,
    `> آخر تحديث: ${profile.updatedAt}`,
    `> عدد التحليلات: ${profile.analysisCount}`,
    `> أسلوب التفصيل: ${profile.preferredDetailLevel}`,
    "",
    "## ملخص عام",
    "",
  ]

  if (profile.globalInsights.length) {
    for (const i of profile.globalInsights) lines.push(`- ${i}`)
  } else {
    lines.push("- لا رؤى عامة بعد")
  }

  lines.push("", "## ملاحظات الذكاء عن أسلوب التعلّم", "")
  if (profile.aiObservations.length) {
    for (const o of profile.aiObservations) lines.push(`- ${o}`)
  } else {
    lines.push("- لا ملاحظات بعد")
  }

  lines.push("", "## المواد والمواضيع", "")
  const subjects = Object.entries(profile.subjects)
  if (!subjects.length) {
    lines.push("لا مواد مسجّلة.")
  } else {
    for (const [name, s] of subjects) {
      lines.push(`### ${name}${s.level ? ` (${s.level})` : ""}`)
      lines.push(`- تحليلات: ${s.analysisCount}`)
      if (s.lastStudiedAt) lines.push(`- آخر نشاط: ${s.lastStudiedAt}`)
      if (s.topicsStudied.length)
        lines.push(`- مواضيع: ${s.topicsStudied.join("، ")}`)
      if (s.grammarFocus.length)
        lines.push(`- قواعد/مفاهيم: ${s.grammarFocus.join("، ")}`)
      if (s.vocabularySeen.length)
        lines.push(`- مفردات (${s.vocabularySeen.length}): ${s.vocabularySeen.slice(-15).join("، ")}`)
      if (s.commonQuestions.length) {
        lines.push("- أسئلة متكررة:")
        for (const q of s.commonQuestions.slice(-8)) lines.push(`  - ${q}`)
      }
      if (s.strengths.length) lines.push(`- نقاط قوة: ${s.strengths.join("؛ ")}`)
      if (s.weaknesses.length) lines.push(`- نقاط ضعف: ${s.weaknesses.join("؛ ")}`)
      lines.push("")
    }
  }

  lines.push("## آخر الأسئلة في الدردشة", "")
  const recent = profile.questionHistory.slice(-20)
  if (!recent.length) {
    lines.push("لا أسئلة مسجّلة.")
  } else {
    for (const q of recent) {
      lines.push(`- **${q.subject ?? q.topic}** (${q.askedAt}): ${q.question}`)
    }
  }

  lines.push("", "---", "*ملف مُولَّد تلقائياً من دروسي — للاستخدام في تدريب ذكاء آخر*")
  return lines.join("\n")
}
