import type { LessonAnalysisEntry, LessonChatThread } from "@/types/lesson-analysis"

export interface Lesson {
  id: string
  title: string
  subject: string
  description: string
  summary: string
  keyPoints: string[]
  notes: string
  /** ملاحظات متعددة (تطبيق الجوال والمزامنة) */
  lessonNotes?: LessonNoteEntry[]
  /** سجل تحليلات الذكاء الاصطناعي لهذا الدرس */
  lessonAnalyses?: LessonAnalysisEntry[]
  /** دردشات استفسار عن نقاط الدرس */
  lessonChatThreads?: LessonChatThread[]
  images: LessonImage[]
  wordPages: WordPage[]
  mindMaps: MindMap[]
  mindMapFolders?: MindMapFolder[]
  createdAt: Date
  updatedAt: Date
}

export interface AiImageNote {
  content: string
  layout: "side" | "below"
  links: AiImageNoteLink[]
}

export interface AiImageNoteLink {
  id: string
  start: number
  end: number
  imageId: string
  annotationId: string
  color?: string
}

/** مجلد لتنظيم الخرائط داخل الدرس */
export interface MindMapFolder {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
}

/** خريطة ذهنية مستقلة داخل الدرس */
export interface MindMap {
  id: string
  title: string
  nodes: MindMapNode[]
  saved: boolean
  folderId?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface LessonImage {
  id: string
  url: string
  annotations: ImageAnnotation[]
  aiAnalysis?: ImageAIAnalysis
  /** ملاحظة تحليل مرتبطة بعلامات هذه الصورة */
  aiImageNote?: AiImageNote
}

export interface ImageAnnotation {
  id: string
  kind?: "highlight" | "pin" | "arrow"
  x: number
  y: number
  width: number
  height: number
  color: string
  note: string
  createdAt: Date
}

export interface ImageAIAnalysis {
  description: string
  visibleText?: string
  markers?: Array<{
    phrase: string
    note: string
    x: number
    y: number
  }>
  keyElements: string[]
  studyNotes: string[]
  relatedConcepts: string[]
  analyzedAt: Date
}

export interface LessonNoteEntry {
  id: string
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
}

export interface WordPage {
  id: string
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
}

export type MindMapNodeRole = "main" | "branch"

export interface MindMapNode {
  id: string
  text: string
  x: number
  y: number
  parentId: string | null
  color: string
  /** رئيسي = شكل بارز؛ فرعي = شكل أصغر */
  role?: MindMapNodeRole
  /** ملاحظة تظهر أسفل البلوك */
  note?: string
  /** الانتقال إلى خريطة أخرى في نفس الدرس */
  linkedMapId?: string | null
  /** رابط لصورة في الدرس */
  linkedImageId?: string | null
  /** رابط لصفحة Word في الدرس */
  linkedWordPageId?: string | null
  /** رابط لفهرس نقطة رئيسية في الدرس */
  linkedKeyPointIndex?: number | null
}
