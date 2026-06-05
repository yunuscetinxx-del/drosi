import type { ImageAnnotation, Lesson, LessonImage, WordPage } from "@/types/lesson"
import type { LessonAnalysisEntry, LessonChatThread } from "@/types/lesson-analysis"
import { normalizeMindMaps, normalizeMindMapFolders } from "@/lib/mind-maps-utils"

/** Restore Date fields after JSON.parse (client or server). */
export function reviveLesson(l: Lesson): Lesson {
  return {
    ...l,
    createdAt: new Date(l.createdAt as unknown as string),
    updatedAt: new Date(l.updatedAt as unknown as string),
    wordPages: (l.wordPages ?? []).map((page: WordPage) => ({
      ...page,
      createdAt: new Date(page.createdAt as unknown as string),
      updatedAt: new Date(page.updatedAt as unknown as string),
    })),
    images: (l.images ?? []).map((img: LessonImage) => ({
      ...img,
      annotations: (img.annotations ?? []).map((a: ImageAnnotation) => ({
        ...a,
        createdAt: new Date(a.createdAt as unknown as string),
      })),
      aiAnalysis: img.aiAnalysis
        ? {
            ...img.aiAnalysis,
            analyzedAt: new Date(img.aiAnalysis.analyzedAt as unknown as string),
          }
        : undefined,
    })),
    mindMaps: normalizeMindMaps(l, l.id),
    mindMapFolders: normalizeMindMapFolders(l),
    lessonAnalyses: (l.lessonAnalyses ?? []).map((a: LessonAnalysisEntry) => ({
      ...a,
      createdAt: new Date(a.createdAt as unknown as string),
      updatedAt: new Date(a.updatedAt as unknown as string),
    })),
    lessonChatThreads: (l.lessonChatThreads ?? []).map((t: LessonChatThread) => ({
      ...t,
      createdAt: new Date(t.createdAt as unknown as string),
      updatedAt: new Date(t.updatedAt as unknown as string),
      messages: (t.messages ?? []).map((m) => ({
        ...m,
        createdAt: new Date(m.createdAt as unknown as string),
      })),
    })),
  }
}

export function reviveLessonsFromJSON(data: unknown): Lesson[] {
  if (!Array.isArray(data)) return []
  return data.map((item) => reviveLesson(item as Lesson))
}
