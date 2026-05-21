export interface Lesson {
  id: string
  title: string
  subject: string
  description: string
  summary: string
  keyPoints: string[]
  notes: string
  images: LessonImage[]
  mindMapNodes: MindMapNode[]
  mindMapSaved: boolean
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

export interface MindMapNode {
  id: string
  text: string
  x: number
  y: number
  parentId: string | null
  color: string
}
