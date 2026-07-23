/** تحليلات ودردشة مرتبطة بكل درس */

/** مصادر جلسة الشات (مثل NotebookLM) */
export interface ChatSourceScope {
  analysisIds: string[]
  imageIds: string[]
  noteIds: string[]
  wordPageIds: string[]
}

export function emptyChatSourceScope(): ChatSourceScope {
  return { analysisIds: [], imageIds: [], noteIds: [], wordPageIds: [] }
}

export interface SchoolExercise {
  number: string
  title: string
  type: string
  explanation: string
  hints: string[]
  sampleAnswers?: string[]
}

export interface VocabularyEntry {
  term: string
  meaning: string
}

export interface LessonAnalysisContent {
  visibleText?: string
  markers?: Array<{ phrase: string; note: string; x: number; y: number }>
  description: string
  keyElements: string[]
  studyNotes: string[]
  relatedConcepts: string[]
  summary?: string
  detectedSubject?: string
  detectedLevel?: string
  pageType?: string
  grammarTopics?: string[]
  vocabulary?: VocabularyEntry[]
  exercises?: SchoolExercise[]
  studyPlan?: string[]
}

export interface LessonAnalysisEntry {
  id: string
  type: "image" | "lesson" | "school_page"
  imageId?: string
  imageUrl?: string
  title: string
  subject: string
  level?: string
  mode: "auto" | "manual"
  summary: string
  content: LessonAnalysisContent
  markdownReport: string
  chatThreadId: string
  createdAt: Date
  updatedAt: Date
}

export interface LessonChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: Date
}

export interface LessonChatThread {
  id: string
  analysisId?: string
  title: string
  /** مصادر مفعّلة لهذه الجلسة */
  sourceScope?: ChatSourceScope
  messages: LessonChatMessage[]
  createdAt: Date
  updatedAt: Date
}
