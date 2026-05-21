import type { ImageAnnotation, Lesson, LessonImage } from "@/types/lesson"

/** Restore Date fields after JSON.parse (client or server). */
export function reviveLesson(l: Lesson): Lesson {
  return {
    ...l,
    createdAt: new Date(l.createdAt as unknown as string),
    updatedAt: new Date(l.updatedAt as unknown as string),
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
  }
}

export function reviveLessonsFromJSON(data: unknown): Lesson[] {
  if (!Array.isArray(data)) return []
  return data.map((item) => reviveLesson(item as Lesson))
}
