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
  images: LessonImage[]
  wordPages: WordPage[]
  mindMaps: MindMap[]
  mindMapFolders?: MindMapFolder[]
  createdAt: Date
  updatedAt: Date
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
}

export interface ImageAnnotation {
  id: string
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
