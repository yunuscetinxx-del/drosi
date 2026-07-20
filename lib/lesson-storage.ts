import type { Lesson } from "@/types/lesson"
import { reviveLesson, reviveLessonsFromJSON } from "@/lib/lessons-revive"
import { prisma } from "@/lib/prisma"
import { parseJsonColumn, stringifyJsonColumn } from "@/lib/json-column"

export async function getUserLessons(userId: string): Promise<Lesson[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lessons: true },
  })
  if (!user) return []
  const raw = parseJsonColumn<unknown[]>(user.lessons, [])
  return reviveLessonsFromJSON(Array.isArray(raw) ? raw : [])
}

export async function saveUserLessons(userId: string, lessons: Lesson[]): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { lessons: stringifyJsonColumn(lessons) },
  })
}

export async function getUserLesson(userId: string, lessonId: string): Promise<Lesson | null> {
  const lessons = await getUserLessons(userId)
  return lessons.find((l) => l.id === lessonId) ?? null
}

export async function updateUserLesson(userId: string, lessonId: string, lesson: Lesson): Promise<boolean> {
  const lessons = await getUserLessons(userId)
  const idx = lessons.findIndex((l) => l.id === lessonId)
  if (idx === -1) return false
  lessons[idx] = reviveLesson({ ...lesson, id: lessonId, updatedAt: new Date() })
  await saveUserLessons(userId, lessons)
  return true
}

export async function addLessonToUser(userId: string, lesson: Lesson): Promise<void> {
  const lessons = await getUserLessons(userId)
  lessons.push(reviveLesson(lesson))
  await saveUserLessons(userId, lessons)
}
