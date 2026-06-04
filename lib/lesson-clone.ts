import type { Lesson, LessonImage, ImageAnnotation, WordPage } from "@/types/lesson"
import { cloneMindMapsForUser } from "@/lib/mind-maps-utils"

const newId = () => Math.random().toString(36).substring(2, 11)

/** نسخة مستقلة من الدرس بمعرّفات جديدة لحفظها عند مستخدم آخر */
export function cloneLessonForUser(lesson: Lesson): Lesson {
  const now = new Date()
  const imageIdMap = new Map<string, string>()

  const images: LessonImage[] = (lesson.images ?? []).map((img) => {
    const newImageId = newId()
    imageIdMap.set(img.id, newImageId)
    return {
      ...img,
      id: newImageId,
      annotations: (img.annotations ?? []).map((a: ImageAnnotation) => ({
        ...a,
        id: newId(),
        createdAt: new Date(a.createdAt),
      })),
      aiAnalysis: img.aiAnalysis
        ? { ...img.aiAnalysis, analyzedAt: new Date(img.aiAnalysis.analyzedAt) }
        : undefined,
    }
  })

  const wordPages: WordPage[] = (lesson.wordPages ?? []).map((p) => ({
    ...p,
    id: newId(),
    createdAt: now,
    updatedAt: now,
  }))

  const { maps: mindMaps, folders: mindMapFolders } = cloneMindMapsForUser(
    lesson.mindMaps ?? [],
    lesson.mindMapFolders ?? []
  )

  return {
    ...lesson,
    id: newId(),
    images,
    wordPages,
    mindMaps,
    mindMapFolders,
    createdAt: now,
    updatedAt: now,
  }
}
