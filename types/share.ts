export type SharePermission = "read" | "edit"

/** ما يُشارك من الدرس — null في الحقل = الكل */
export interface ShareScope {
  includeDetails?: boolean
  imageIds?: string[] | null
  wordPageIds?: string[] | null
  mindMapIds?: string[] | null
}

export interface LessonShareRecord {
  id: string
  token: string
  permission: SharePermission
  allowCopy: boolean
  active: boolean
  createdAt: string
  shareUrl: string
  scope?: ShareScope | null
  scopeIsFull?: boolean
}

export interface SharedLessonPayload {
  lesson: import("@/types/lesson").Lesson
  share: {
    permission: SharePermission
    allowCopy: boolean
    active: boolean
    ownerEmail: string
    isOwner: boolean
    scope?: ShareScope | null
    scopeIsFull?: boolean
  }
}
