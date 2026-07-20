import { prisma } from "@/lib/prisma"
import { parseJsonColumn, stringifyJsonColumn } from "@/lib/json-column"

export const SYSTEM_BACKUP_VERSION = 1
export const SYSTEM_BACKUP_APP = "drosi" as const

export type SystemBackupUser = {
  id: string
  name: string
  email: string
  passwordHash: string
  lessons: unknown
  calendarEvents: unknown
  aiLearningProfile: unknown
  geminiApiKeyEnc: string | null
  geminiKeyHint: string | null
  geminiKeyUpdatedAt: string | null
  isAdmin: boolean
  createdAt: string
  updatedAt: string
}

export type SystemBackupShare = {
  id: string
  ownerId: string
  lessonId: string
  token: string
  permission: string
  allowCopy: boolean
  active: boolean
  scope: unknown | null
  createdAt: string
}

export type SystemBackupPublicConfig = {
  singleton: string
  apiBaseUrl: string
  forceApiBaseUrl: boolean
  updatedAt: string
}

export type SystemBackup = {
  version: number
  exportedAt: string
  app: typeof SYSTEM_BACKUP_APP
  users: SystemBackupUser[]
  lessonShares: SystemBackupShare[]
  appPublicConfig: SystemBackupPublicConfig | null
}

export type SystemBackupStats = {
  users: number
  lessons: number
  lessonNotes: number
  images: number
  mindMaps: number
  wordPages: number
  shares: number
  hasPublicConfig: boolean
}

function asLessonArray(lessons: unknown): Record<string, unknown>[] {
  return Array.isArray(lessons) ? (lessons as Record<string, unknown>[]) : []
}

export function getSystemBackupStats(backup: SystemBackup): SystemBackupStats {
  let lessons = 0
  let lessonNotes = 0
  let images = 0
  let mindMaps = 0
  let wordPages = 0

  for (const user of backup.users) {
    for (const lesson of asLessonArray(user.lessons)) {
      lessons++
      lessonNotes += Array.isArray(lesson.lessonNotes) ? lesson.lessonNotes.length : 0
      images += Array.isArray(lesson.images) ? lesson.images.length : 0
      mindMaps += Array.isArray(lesson.mindMaps) ? lesson.mindMaps.length : 0
      wordPages += Array.isArray(lesson.wordPages) ? lesson.wordPages.length : 0
    }
  }

  return {
    users: backup.users.length,
    lessons,
    lessonNotes,
    images,
    mindMaps,
    wordPages,
    shares: backup.lessonShares.length,
    hasPublicConfig: backup.appPublicConfig != null,
  }
}

export function validateSystemBackup(data: unknown): SystemBackup {
  if (!data || typeof data !== "object") {
    throw new Error("ملف النسخة الاحتياطية غير صالح")
  }

  const raw = data as Partial<SystemBackup>

  if (raw.app !== SYSTEM_BACKUP_APP) {
    throw new Error("هذا الملف ليس نسخة احتياطية لتطبيق دروسي")
  }

  if (raw.version !== SYSTEM_BACKUP_VERSION) {
    throw new Error(`إصدار غير مدعوم: ${String(raw.version)}`)
  }

  if (!Array.isArray(raw.users) || raw.users.length === 0) {
    throw new Error("النسخة الاحتياطية لا تحتوي مستخدمين")
  }

  for (const user of raw.users) {
    if (!user || typeof user !== "object") {
      throw new Error("بيانات مستخدم غير صالحة")
    }
    const u = user as Partial<SystemBackupUser>
    if (!u.id || !u.email || !u.passwordHash) {
      throw new Error(`مستخدم ناقص البيانات: ${u.email ?? "غير معروف"}`)
    }
    if (u.lessons === undefined || u.lessons === null) {
      throw new Error(`دروس المستخدم مفقودة: ${u.email}`)
    }
  }

  if (!Array.isArray(raw.lessonShares)) {
    throw new Error("قسم روابط المشاركة مفقود")
  }

  const hasAdmin = raw.users.some((u) => (u as SystemBackupUser).isAdmin === true)
  if (!hasAdmin) {
    throw new Error("النسخة الاحتياطية يجب أن تحتوي حساب أدمن واحد على الأقل")
  }

  return {
    version: SYSTEM_BACKUP_VERSION,
    exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : new Date().toISOString(),
    app: SYSTEM_BACKUP_APP,
    users: raw.users as SystemBackupUser[],
    lessonShares: raw.lessonShares as SystemBackupShare[],
    appPublicConfig: (raw.appPublicConfig as SystemBackupPublicConfig | null) ?? null,
  }
}

export async function exportSystemBackup(): Promise<SystemBackup> {
  const [users, lessonShares, appPublicConfig] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
    }),
    prisma.lessonShare.findMany({
      orderBy: { createdAt: "asc" },
    }),
    prisma.appPublicConfig.findUnique({
      where: { singleton: "global" },
    }),
  ])

  return {
    version: SYSTEM_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    app: SYSTEM_BACKUP_APP,
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      passwordHash: u.passwordHash,
      lessons: parseJsonColumn<unknown[]>(u.lessons, []),
      calendarEvents: parseJsonColumn<unknown[]>(u.calendarEvents, []),
      aiLearningProfile: parseJsonColumn<Record<string, unknown>>(u.aiLearningProfile, {}),
      geminiApiKeyEnc: u.geminiApiKeyEnc,
      geminiKeyHint: u.geminiKeyHint,
      geminiKeyUpdatedAt: u.geminiKeyUpdatedAt?.toISOString() ?? null,
      isAdmin: u.isAdmin,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    })),
    lessonShares: lessonShares.map((s) => ({
      id: s.id,
      ownerId: s.ownerId,
      lessonId: s.lessonId,
      token: s.token,
      permission: s.permission,
      allowCopy: s.allowCopy,
      active: s.active,
      scope: parseJsonColumn<unknown | null>(s.scope, null),
      createdAt: s.createdAt.toISOString(),
    })),
    appPublicConfig: appPublicConfig
      ? {
          singleton: appPublicConfig.singleton,
          apiBaseUrl: appPublicConfig.apiBaseUrl,
          forceApiBaseUrl: appPublicConfig.forceApiBaseUrl,
          updatedAt: appPublicConfig.updatedAt.toISOString(),
        }
      : null,
  }
}

export async function importSystemBackup(backup: SystemBackup): Promise<SystemBackupStats> {
  const validated = validateSystemBackup(backup)
  const ownerIds = new Set(validated.users.map((u) => u.id))

  await prisma.$transaction(async (tx) => {
    await tx.lessonShare.deleteMany()
    await tx.user.deleteMany()

    for (const user of validated.users) {
      await tx.user.create({
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          passwordHash: user.passwordHash,
          lessons: stringifyJsonColumn(user.lessons ?? []),
          calendarEvents: stringifyJsonColumn(user.calendarEvents ?? []),
          aiLearningProfile: stringifyJsonColumn(user.aiLearningProfile ?? {}),
          geminiApiKeyEnc: user.geminiApiKeyEnc,
          geminiKeyHint: user.geminiKeyHint,
          geminiKeyUpdatedAt: user.geminiKeyUpdatedAt
            ? new Date(user.geminiKeyUpdatedAt)
            : null,
          isAdmin: user.isAdmin,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt),
        },
      })
    }

    for (const share of validated.lessonShares) {
      if (!ownerIds.has(share.ownerId)) continue
      await tx.lessonShare.create({
        data: {
          id: share.id,
          ownerId: share.ownerId,
          lessonId: share.lessonId,
          token: share.token,
          permission: share.permission,
          allowCopy: share.allowCopy,
          active: share.active,
          scope: share.scope != null ? stringifyJsonColumn(share.scope) : null,
          createdAt: new Date(share.createdAt),
        },
      })
    }

    if (validated.appPublicConfig) {
      await tx.appPublicConfig.upsert({
        where: { singleton: "global" },
        create: {
          singleton: "global",
          apiBaseUrl: validated.appPublicConfig.apiBaseUrl,
          forceApiBaseUrl: validated.appPublicConfig.forceApiBaseUrl,
          updatedAt: new Date(validated.appPublicConfig.updatedAt),
        },
        update: {
          apiBaseUrl: validated.appPublicConfig.apiBaseUrl,
          forceApiBaseUrl: validated.appPublicConfig.forceApiBaseUrl,
          updatedAt: new Date(validated.appPublicConfig.updatedAt),
        },
      })
    }
  })

  return getSystemBackupStats(validated)
}
