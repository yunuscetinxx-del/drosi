"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import {
  Lesson,
  MindMapNode,
  LessonImage,
  ImageAnnotation,
  ImageAIAnalysis,
} from "@/types/lesson"
import { reviveLessonsFromJSON } from "@/lib/lessons-revive"

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

  const addLesson = useCallback((lesson: Omit<Lesson, "id" | "createdAt" | "updatedAt" | "mindMapSaved">) => {
    const newLesson: Lesson = {
      ...lesson,
      id: generateId(),
      mindMapSaved: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setLessons((prev) => [...prev, newLesson])
    return newLesson
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
    setSelectedLesson((prev) => (prev?.id === id ? null : prev))
  }, [])

  const addImage = useCallback((lessonId: string, imageUrl: string) => {
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
  }, [])

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

  const addMindMapNode = useCallback(
    (lessonId: string, node: Omit<MindMapNode, "id">) => {
      const newNode: MindMapNode = { ...node, id: generateId() }
      setLessons((prev) =>
        prev.map((lesson) =>
          lesson.id === lessonId
            ? {
                ...lesson,
                mindMapNodes: [...lesson.mindMapNodes, newNode],
                mindMapSaved: false,
                updatedAt: new Date(),
              }
            : lesson
        )
      )
      setSelectedLesson((prev) =>
        prev?.id === lessonId
          ? {
              ...prev,
              mindMapNodes: [...prev.mindMapNodes, newNode],
              mindMapSaved: false,
              updatedAt: new Date(),
            }
          : prev
      )
      return newNode
    },
    []
  )

  const updateMindMapNode = useCallback(
    (lessonId: string, nodeId: string, updates: Partial<MindMapNode>) => {
      setLessons((prev) =>
        prev.map((lesson) =>
          lesson.id === lessonId
            ? {
                ...lesson,
                mindMapNodes: lesson.mindMapNodes.map((node) =>
                  node.id === nodeId ? { ...node, ...updates } : node
                ),
                mindMapSaved: false,
                updatedAt: new Date(),
              }
            : lesson
        )
      )
      setSelectedLesson((prev) =>
        prev?.id === lessonId
          ? {
              ...prev,
              mindMapNodes: prev.mindMapNodes.map((node) =>
                node.id === nodeId ? { ...node, ...updates } : node
              ),
              mindMapSaved: false,
              updatedAt: new Date(),
            }
          : prev
      )
    },
    []
  )

  const deleteMindMapNode = useCallback((lessonId: string, nodeId: string) => {
    setLessons((prev) =>
      prev.map((lesson) =>
        lesson.id === lessonId
          ? {
              ...lesson,
              mindMapNodes: lesson.mindMapNodes.filter((node) => node.id !== nodeId),
              mindMapSaved: false,
              updatedAt: new Date(),
            }
          : lesson
      )
    )
    setSelectedLesson((prev) =>
      prev?.id === lessonId
        ? {
            ...prev,
            mindMapNodes: prev.mindMapNodes.filter((node) => node.id !== nodeId),
            mindMapSaved: false,
            updatedAt: new Date(),
          }
        : prev
    )
  }, [])

  const saveMindMap = useCallback((lessonId: string) => {
    setLessons((prev) =>
      prev.map((lesson) =>
        lesson.id === lessonId
          ? { ...lesson, mindMapSaved: true, updatedAt: new Date() }
          : lesson
      )
    )
    setSelectedLesson((prev) =>
      prev?.id === lessonId
        ? { ...prev, mindMapSaved: true, updatedAt: new Date() }
        : prev
    )
  }, [])

  return {
    lessons,
    selectedLesson,
    setSelectedLesson,
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
    addMindMapNode,
    updateMindMapNode,
    deleteMindMapNode,
    saveMindMap,
  }
}
