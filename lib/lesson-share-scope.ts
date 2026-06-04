import type { Lesson } from "@/types/lesson"
import type { ShareScope } from "@/types/share"

export function fullShareScope(lesson: Lesson): ShareScope {
  return {
    includeDetails: true,
    imageIds: null,
    wordPageIds: null,
    mindMapIds: null,
  }
}

export function isFullShareScope(scope: ShareScope | null | undefined): boolean {
  if (!scope) return true
  if (scope.includeDetails === false) return false
  if (scope.imageIds !== null && scope.imageIds !== undefined) return false
  if (scope.wordPageIds !== null && scope.wordPageIds !== undefined) return false
  if (scope.mindMapIds !== null && scope.mindMapIds !== undefined) return false
  return true
}

function filterByIds<T extends { id: string }>(
  items: T[],
  ids: string[] | null | undefined
): T[] {
  if (ids === null || ids === undefined) return items
  const set = new Set(ids)
  return items.filter((item) => set.has(item.id))
}

export function applyShareScope(lesson: Lesson, scope: ShareScope | null | undefined): Lesson {
  if (!scope || isFullShareScope(scope)) return lesson

  const includeDetails = scope.includeDetails !== false

  return {
    ...lesson,
    subject: includeDetails ? lesson.subject : "",
    description: includeDetails ? lesson.description : "",
    summary: includeDetails ? lesson.summary : "",
    keyPoints: includeDetails ? [...(lesson.keyPoints ?? [])] : [],
    notes: includeDetails ? lesson.notes : "",
    images: filterByIds(lesson.images ?? [], scope.imageIds),
    wordPages: filterByIds(lesson.wordPages ?? [], scope.wordPageIds),
    mindMaps: filterByIds(lesson.mindMaps ?? [], scope.mindMapIds),
  }
}

export function validateShareScope(
  lesson: Lesson,
  scope: ShareScope
): "empty" | "invalid" | null {
  const imageIds = scope.imageIds
  const wordPageIds = scope.wordPageIds
  const mindMapIds = scope.mindMapIds

  const valid = (ids: string[] | null | undefined, pool: { id: string }[]) => {
    if (ids === null || ids === undefined) return true
    const poolSet = new Set(pool.map((p) => p.id))
    return ids.every((id) => poolSet.has(id))
  }

  if (
    !valid(imageIds, lesson.images ?? []) ||
    !valid(wordPageIds, lesson.wordPages ?? []) ||
    !valid(mindMapIds, lesson.mindMaps ?? [])
  ) {
    return "invalid"
  }

  const filtered = applyShareScope(lesson, scope)
  const hasContent =
    scope.includeDetails !== false ||
    filtered.images.length > 0 ||
    filtered.wordPages.length > 0 ||
    filtered.mindMaps.length > 0

  return hasContent ? null : "empty"
}

export type ShareScopeCounts = {
  details: boolean
  images: number
  wordPages: number
  mindMaps: number
  totalImages: number
  totalWordPages: number
  totalMindMaps: number
  isFull: boolean
}

export function getShareScopeCounts(
  lesson: Lesson,
  scope: ShareScope | null | undefined
): ShareScopeCounts {
  const filtered = applyShareScope(lesson, scope)
  return {
    details: scope?.includeDetails !== false,
    images: filtered.images.length,
    wordPages: filtered.wordPages.length,
    mindMaps: filtered.mindMaps.length,
    totalImages: lesson.images?.length ?? 0,
    totalWordPages: lesson.wordPages?.length ?? 0,
    totalMindMaps: lesson.mindMaps?.length ?? 0,
    isFull: isFullShareScope(scope),
  }
}

export function parseShareScope(raw: unknown): ShareScope | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  const scope: ShareScope = {}
  if (typeof o.includeDetails === "boolean") scope.includeDetails = o.includeDetails
  if (o.imageIds === null) scope.imageIds = null
  else if (Array.isArray(o.imageIds)) scope.imageIds = o.imageIds.filter((x) => typeof x === "string")
  if (o.wordPageIds === null) scope.wordPageIds = null
  else if (Array.isArray(o.wordPageIds))
    scope.wordPageIds = o.wordPageIds.filter((x) => typeof x === "string")
  if (o.mindMapIds === null) scope.mindMapIds = null
  else if (Array.isArray(o.mindMapIds))
    scope.mindMapIds = o.mindMapIds.filter((x) => typeof x === "string")
  return scope
}

type ScopeLabelFn = (key: string, params?: Record<string, string | number>) => string

export function formatShareScopeLabel(
  scope: ShareScope | null | undefined,
  t: ScopeLabelFn
): string {
  if (!scope || isFullShareScope(scope)) return t("share.scopeFull")

  const parts: string[] = []
  if (scope.includeDetails !== false) parts.push(t("share.scopeDetails"))

  if (scope.imageIds === null) parts.push(t("share.scopeAllImages"))
  else if (scope.imageIds && scope.imageIds.length > 0) {
    parts.push(t("share.scopeImagesCount", { count: scope.imageIds.length }))
  }

  if (scope.wordPageIds === null) parts.push(t("share.scopeAllWord"))
  else if (scope.wordPageIds && scope.wordPageIds.length > 0) {
    parts.push(t("share.scopeWordCount", { count: scope.wordPageIds.length }))
  }

  if (scope.mindMapIds === null) parts.push(t("share.scopeAllMaps"))
  else if (scope.mindMapIds && scope.mindMapIds.length > 0) {
    parts.push(t("share.scopeMapsCount", { count: scope.mindMapIds.length }))
  }

  return parts.length > 0 ? parts.join(" · ") : t("share.scopePartial")
}
