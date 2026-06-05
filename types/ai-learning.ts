/** ملف تعلّم المستخدم — JSON منظم + تصدير MD للأدمن */

export interface SubjectLearningProfile {
  level?: string
  topicsStudied: string[]
  grammarFocus: string[]
  vocabularySeen: string[]
  commonQuestions: string[]
  weaknesses: string[]
  strengths: string[]
  analysisCount: number
  lastStudiedAt?: string
}

export interface QuestionHistoryEntry {
  topic: string
  question: string
  askedAt: string
  lessonId?: string
  analysisId?: string
  subject?: string
}

export interface AILearningProfile {
  version: 1
  updatedAt: string
  subjects: Record<string, SubjectLearningProfile>
  globalInsights: string[]
  questionHistory: QuestionHistoryEntry[]
  analysisCount: number
  preferredDetailLevel: "brief" | "detailed" | "exam"
  /** ملاحظات الذكاء عن أسلوب تعلّم المستخدم */
  aiObservations: string[]
}

export const EMPTY_LEARNING_PROFILE = (): AILearningProfile => ({
  version: 1,
  updatedAt: new Date().toISOString(),
  subjects: {},
  globalInsights: [],
  questionHistory: [],
  analysisCount: 0,
  preferredDetailLevel: "detailed",
  aiObservations: [],
})
