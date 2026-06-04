"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import {
  Lesson,
  LessonImage,
  ImageAnnotation,
  ImageAIAnalysis,
} from "@/types/lesson"
import { reviveLesson } from "@/lib/lessons-revive"
import type { SharePermission, ShareScope } from "@/types/share"

const generateId = () => Math.random().toString(36).substring(2, 11)
const SAVE_DEBOUNCE_MS = 700

export type SharedLessonMeta = {
  permission: SharePermission
  allowCopy: boolean
  active: boolean
  ownerEmail: string
  isOwner: boolean
  scope?: ShareScope | null
  scopeIsFull?: boolean
}

export function useSharedLesson(token: string) {
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [meta, setMeta] = useState<SharedLessonMeta | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lessonRef = useRef<Lesson | null>(null)
  const canEdit = meta?.permission === "edit"

  useEffect(() => {
    lessonRef.current = lesson
  }, [lesson])

  const persistLesson = useCallback(
    (next: Lesson) => {
      if (!canEdit) return
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null
        void (async () => {
          try {
            const res = await fetch(`/api/share/${encodeURIComponent(token)}`, {
              method: "PUT",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lesson: next }),
            })
            if (res.status === 401) {
              const nextUrl = `/login?next=${encodeURIComponent(`/share/${token}`)}`
              window.location.href = nextUrl
            }
          } catch {
            /* ignore */
          }
        })()
      }, SAVE_DEBOUNCE_MS)
    },
    [token, canEdit]
  )

  const patchLesson = useCallback(
    (updater: (prev: Lesson) => Lesson) => {
      setLesson((prev) => {
        if (!prev) return prev
        const next = updater(prev)
        persistLesson(next)
        return next
      })
    },
    [persistLesson]
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/share/${encodeURIComponent(token)}`, {
          credentials: "include",
        })
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string }
          if (!cancelled) {
            setError(data.error ?? "تعذّر تحميل الدرس")
            setIsLoaded(true)
          }
          return
        }
        const data = (await res.json()) as {
          lesson?: unknown
          share?: SharedLessonMeta
        }
        const revived = reviveLesson(data.lesson as Lesson)
        if (!cancelled) {
          setLesson(revived)
          setMeta(data.share ?? null)
          setIsLoaded(true)
        }
      } catch {
        if (!cancelled) {
          setError("تعذّر الاتصال")
          setIsLoaded(true)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const copyToMyLessons = useCallback(async () => {
    const res = await fetch(`/api/share/${encodeURIComponent(token)}/copy`, {
      method: "POST",
      credentials: "include",
    })
    if (res.status === 401) {
      window.location.href = `/login?next=${encodeURIComponent(`/share/${token}`)}`
      return null
    }
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(data.error ?? "تعذّر النسخ")
    }
    const data = (await res.json()) as { lesson?: unknown }
    return reviveLesson(data.lesson as Lesson)
  }, [token])

  const updateLesson = useCallback(
    (id: string, updates: Partial<Lesson>) => {
      patchLesson((lesson) =>
        lesson.id === id ? { ...lesson, ...updates, updatedAt: new Date() } : lesson
      )
    },
    [patchLesson]
  )

  const addImage = useCallback(
    (lessonId: string, imageUrl: string) => {
      const newImage: LessonImage = { id: generateId(), url: imageUrl, annotations: [] }
      patchLesson((lesson) =>
        lesson.id === lessonId
          ? { ...lesson, images: [...lesson.images, newImage], updatedAt: new Date() }
          : lesson
      )
    },
    [patchLesson]
  )

  const removeImage = useCallback(
    (lessonId: string, imageId: string) => {
      patchLesson((lesson) =>
        lesson.id === lessonId
          ? {
              ...lesson,
              images: lesson.images.filter((img) => img.id !== imageId),
              updatedAt: new Date(),
            }
          : lesson
      )
    },
    [patchLesson]
  )

  const addImageAnnotation = useCallback(
    (lessonId: string, imageId: string, annotation: Omit<ImageAnnotation, "id" | "createdAt">) => {
      const newAnnotation: ImageAnnotation = {
        ...annotation,
        id: generateId(),
        createdAt: new Date(),
      }
      patchLesson((lesson) =>
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
    },
    [patchLesson]
  )

  const updateImageAnnotation = useCallback(
    (lessonId: string, imageId: string, annotationId: string, updates: Partial<ImageAnnotation>) => {
      patchLesson((lesson) =>
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
    },
    [patchLesson]
  )

  const removeImageAnnotation = useCallback(
    (lessonId: string, imageId: string, annotationId: string) => {
      patchLesson((lesson) =>
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
    },
    [patchLesson]
  )

  const setImageAIAnalysis = useCallback(
    (lessonId: string, imageId: string, analysis: Omit<ImageAIAnalysis, "analyzedAt">) => {
      const fullAnalysis: ImageAIAnalysis = { ...analysis, analyzedAt: new Date() }
      patchLesson((lesson) =>
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
    },
    [patchLesson]
  )

  return {
    lesson,
    meta,
    isLoaded,
    error,
    canEdit,
    updateLesson,
    addImage,
    removeImage,
    addImageAnnotation,
    updateImageAnnotation,
    removeImageAnnotation,
    setImageAIAnalysis,
    copyToMyLessons,
  }
}
