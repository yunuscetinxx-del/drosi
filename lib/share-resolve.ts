import { prisma } from "@/lib/prisma"
import { getUserLesson } from "@/lib/lesson-storage"
import {
  applyShareScope,
  isFullShareScope,
  parseShareScope,
} from "@/lib/lesson-share-scope"
import type { SharePermission, ShareScope } from "@/types/share"

export type ResolvedShare = {
  shareId: string
  ownerId: string
  lessonId: string
  token: string
  permission: SharePermission
  allowCopy: boolean
  active: boolean
  ownerEmail: string
  scope: ShareScope | null
  scopeIsFull: boolean
  lesson: import("@/types/lesson").Lesson
}

export async function resolveShareByToken(token: string): Promise<ResolvedShare | null> {
  const row = await prisma.lessonShare.findUnique({
    where: { token },
    include: { owner: { select: { email: true } } },
  })
  if (!row || !row.active) return null

  const fullLesson = await getUserLesson(row.ownerId, row.lessonId)
  if (!fullLesson) return null

  const scope = parseShareScope((row as { scope?: unknown }).scope)
  const scopeIsFull = isFullShareScope(scope)
  const lesson = applyShareScope(fullLesson, scope)

  let permission: SharePermission = row.permission === "edit" ? "edit" : "read"
  if (!scopeIsFull) permission = "read"

  return {
    shareId: row.id,
    ownerId: row.ownerId,
    lessonId: row.lessonId,
    token: row.token,
    permission,
    allowCopy: row.allowCopy,
    active: row.active,
    ownerEmail: row.owner.email,
    scope,
    scopeIsFull,
    lesson,
  }
}
