"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import {
  Lesson,
  LessonImage,
  ImageAnnotation,
  ImageAIAnalysis,
} from "@/types/lesson"
import { reviveLessonsFromJSON } from "@/lib/lessons-revive"
import {
  clearSelectedLessonId,
  readSelectedLessonId,
  writeSelectedLessonId,
} from "@/lib/app-navigation"
import { uploadImageDataUrl } from "@/lib/upload-client"

const generateId = () => Math.random().toString(36).substring(2, 11)

const LEGACY_STORAGE_KEY = "durusi_lessons"
const SAVE_DEBOUNCE_MS = 700

async function readLegacyLessonsFromLocalStorage(): Promise<Lesson[] | null> {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const list = reviveLessonsFromJSON(Array.isArray(parsed) ? parsed : [])
    return list.length > 0 ? list : null
  } catch {
    return null
  }
}

export function useLessons() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lessonsRef = useRef<Lesson[]>([])

  useEffect(() => {
    lessonsRef.current = lessons
  }, [lessons])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/lessons", { credentials: "include" })
        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = "/login"
            return
          }
          if (!cancelled) {
            setLessons([])
            setIsLoaded(true)
          }
          return
        }
        const data = (await res.json()) as { lessons?: unknown }
        let list = reviveLessonsFromJSON(data.lessons ?? [])
        if (list.length === 0) {
          const migrated = await readLegacyLessonsFromLocalStorage()
          if (migrated) {
            list = migrated
            try {
              localStorage.removeItem(LEGACY_STORAGE_KEY)
            } catch {
              /* ignore */
            }
          }
        }
        if (!cancelled) {
          setLessons(list)
          const savedId = readSelectedLessonId()
          const savedLesson = savedId ? list.find((l) => l.id === savedId) : null
          if (savedLesson) setSelectedLesson(savedLesson)
          setIsLoaded(true)
        }
      } catch {
        if (!cancelled) {
          setLessons([])
          setIsLoaded(true)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isLoaded) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null
      const payload = lessonsRef.current
      void (async () => {
        try {
          const res = await fetch("/api/lessons", {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lessons: payload }),
          })
          if (res.status === 401) {
            window.location.href = "/login"
          }
        } catch {
          /* ignore */
        }
      })()
    }, SAVE_DEBOUNCE_MS)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [lessons, isLoaded])

  const addLesson = useCallback((lesson: Omit<Lesson, "id" | "createdAt" | "updatedAt">) => {
    const newLesson: Lesson = {
      ...lesson,
      id: generateId(),
      mindMaps: lesson.mindMaps ?? [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setLessons((prev) => [...prev, newLesson])
    return newLesson
  }, [])

  const selectLesson = useCallback((lesson: Lesson | null) => {
    setSelectedLesson(lesson)
    if (lesson) writeSelectedLessonId(lesson.id)
    else clearSelectedLessonId()
  }, [])

  const updateLesson = useCallback((id: string, updates: Partial<Lesson>) => {
    setLessons((prev) =>
      prev.map((lesson) =>
        lesson.id === id ? { ...lesson, ...updates, updatedAt: new Date() } : lesson
      )
    )
    setSelectedLesson((prev) =>
      prev?.id === id ? { ...prev, ...updates, updatedAt: new Date() } : prev
    )
  }, [])

  const deleteLesson = useCallback((id: string) => {
    setLessons((prev) => prev.filter((lesson) => lesson.id !== id))
    setSelectedLesson((prev) => {
      if (prev?.id === id) {
        clearSelectedLessonId()
        return null
      }
      return prev
    })
  }, [])

  const applyImageUrl = useCallback((lessonId: string, imageId: string, url: string) => {
    setLessons((prev) =>
      prev.map((lesson) =>
        lesson.id === lessonId
          ? {
              ...lesson,
              images: lesson.images.map((img) => (img.id === imageId ? { ...img, url } : img)),
            }
          : lesson
      )
    )
    setSelectedLesson((prev) =>
      prev?.id === lessonId
        ? {
            ...prev,
            images: prev.images.map((img) => (img.id === imageId ? { ...img, url } : img)),
          }
        : prev
    )
  }, [])

  const addImage = useCallback(
    (lessonId: string, imageUrl: string) => {
      const newImage: LessonImage = {
        id: generateId(),
        url: imageUrl,
        annotations: [],
      }
      setLessons((prev) =>
        prev.map((lesson) =>
          lesson.id === lessonId
            ? { ...lesson, images: [...lesson.images, newImage], updatedAt: new Date() }
            : lesson
        )
      )
      setSelectedLesson((prev) =>
        prev?.id === lessonId
          ? { ...prev, images: [...prev.images, newImage], updatedAt: new Date() }
          : prev
      )

      // نحفظ الصورة كملف محلي على القرص في الخلفية، ثم نستبدل الرابط الطويل (data URL)
      // برابط ملف قصير — دون التأثير على تجربة الإضافة الفورية.
      if (imageUrl.startsWith("data:")) {
        void (async () => {
          const savedUrl = await uploadImageDataUrl(imageUrl)
          if (savedUrl) applyImageUrl(lessonId, newImage.id, savedUrl)
        })()
      }
    },
    [applyImageUrl]
  )

  const removeImage = useCallback((lessonId: string, imageId: string) => {
    setLessons((prev) =>
      prev.map((lesson) =>
        lesson.id === lessonId
          ? {
              ...lesson,
              images: lesson.images.filter((img) => img.id !== imageId),
              updatedAt: new Date(),
            }
          : lesson
      )
    )
    setSelectedLesson((prev) =>
      prev?.id === lessonId
        ? {
            ...prev,
            images: prev.images.filter((img) => img.id !== imageId),
            updatedAt: new Date(),
          }
        : prev
    )
  }, [])

  const addImageAnnotation = useCallback(
    (lessonId: string, imageId: string, annotation: Omit<ImageAnnotation, "id" | "createdAt">) => {
      const newAnnotation: ImageAnnotation = {
        ...annotation,
        id: generateId(),
        createdAt: new Date(),
      }
      setLessons((prev) =>
        prev.map((lesson) =>
          lesson.id === lessonId
            ? {
                ...lesson,
                images: lesson.images.map((img) =>
                  img.id === imageId
                    ? { ...img, annotations: [...img.annotations, newAnnotation] }
                    : img
                ),
                updatedAt: new Date(),
              }
            : lesson
        )
      )
      setSelectedLesson((prev) =>
        prev?.id === lessonId
          ? {
              ...prev,
              images: prev.images.map((img) =>
                img.id === imageId
                  ? { ...img, annotations: [...img.annotations, newAnnotation] }
                  : img
              ),
              updatedAt: new Date(),
            }
          : prev
      )
      return newAnnotation
    },
    []
  )

  const updateImageAnnotation = useCallback(
    (lessonId: string, imageId: string, annotationId: string, updates: Partial<ImageAnnotation>) => {
      setLessons((prev) =>
        prev.map((lesson) =>
          lesson.id === lessonId
            ? {
                ...lesson,
                images: lesson.images.map((img) =>
                  img.id === imageId
                    ? {
                        ...img,
                        annotations: img.annotations.map((a) =>
                          a.id === annotationId ? { ...a, ...updates } : a
                        ),
                      }
                    : img
                ),
                updatedAt: new Date(),
              }
            : lesson
        )
      )
      setSelectedLesson((prev) =>
        prev?.id === lessonId
          ? {
              ...prev,
              images: prev.images.map((img) =>
                img.id === imageId
                  ? {
                      ...img,
                      annotations: img.annotations.map((a) =>
                        a.id === annotationId ? { ...a, ...updates } : a
                      ),
                    }
                  : img
              ),
              updatedAt: new Date(),
            }
          : prev
      )
    },
    []
  )

  const removeImageAnnotation = useCallback(
    (lessonId: string, imageId: string, annotationId: string) => {
      setLessons((prev) =>
        prev.map((lesson) =>
          lesson.id === lessonId
            ? {
                ...lesson,
                images: lesson.images.map((img) =>
                  img.id === imageId
                    ? {
                        ...img,
                        annotations: img.annotations.filter((a) => a.id !== annotationId),
                      }
                    : img
                ),
                updatedAt: new Date(),
              }
            : lesson
        )
      )
      setSelectedLesson((prev) =>
        prev?.id === lessonId
          ? {
              ...prev,
              images: prev.images.map((img) =>
                img.id === imageId
                  ? {
                      ...img,
                      annotations: img.annotations.filter((a) => a.id !== annotationId),
                    }
                  : img
              ),
              updatedAt: new Date(),
            }
          : prev
      )
    },
    []
  )

  const setImageAIAnalysis = useCallback(
    (lessonId: string, imageId: string, analysis: Omit<ImageAIAnalysis, "analyzedAt">) => {
      const fullAnalysis: ImageAIAnalysis = {
        ...analysis,
        analyzedAt: new Date(),
      }
      setLessons((prev) =>
        prev.map((lesson) =>
          lesson.id === lessonId
            ? {
                ...lesson,
                images: lesson.images.map((img) =>
                  img.id === imageId ? { ...img, aiAnalysis: fullAnalysis } : img
                ),
                updatedAt: new Date(),
              }
            : lesson
        )
      )
      setSelectedLesson((prev) =>
        prev?.id === lessonId
          ? {
              ...prev,
              images: prev.images.map((img) =>
                img.id === imageId ? { ...img, aiAnalysis: fullAnalysis } : img
              ),
              updatedAt: new Date(),
            }
          : prev
      )
    },
    []
  )

  return {
    lessons,
    selectedLesson,
    setSelectedLesson: selectLesson,
    isLoaded,
    addLesson,
    updateLesson,
    deleteLesson,
    addImage,
    removeImage,
    addImageAnnotation,
    updateImageAnnotation,
    removeImageAnnotation,
    setImageAIAnalysis,
  }
}
