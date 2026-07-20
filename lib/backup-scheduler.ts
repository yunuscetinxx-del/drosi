import fs from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import { prisma } from "@/lib/prisma"
import { getDataDir, getUploadsDir } from "@/lib/local-storage-config"

/** كل كم مدة نتحقق (أثناء عمل السيرفر) مما إذا حان وقت نسخة احتياطية جديدة. */
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000 // 6 ساعات
/** أقل فارق زمني بين نسختين احتياطيتين تلقائيتين. */
const MIN_GAP_MS = 24 * 60 * 60 * 1000 // 24 ساعة
/** عدد النسخ الاحتياطية المُبقاة — الأقدم تُحذف تلقائياً. */
const RETAIN_COUNT = 7

function getBackupsDir(): string {
  return path.join(getDataDir(), "backups")
}

export type BackupInfo = {
  name: string
  createdAt: string
  sizeBytes: number
}

/** يسرد النسخ الاحتياطية المحفوظة، الأحدث أولاً. */
export async function listBackups(): Promise<BackupInfo[]> {
  const dir = getBackupsDir()
  if (!existsSync(dir)) return []

  const entries = await fs.readdir(dir, { withFileTypes: true })
  const backups: BackupInfo[] = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const dbFile = path.join(dir, entry.name, "app.db")
    if (!existsSync(dbFile)) continue
    const stat = await fs.stat(dbFile)
    backups.push({ name: entry.name, createdAt: stat.mtime.toISOString(), sizeBytes: stat.size })
  }
  return backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

async function pruneOldBackups(): Promise<void> {
  const backups = await listBackups()
  const toDelete = backups.slice(RETAIN_COUNT)
  const dir = getBackupsDir()
  for (const b of toDelete) {
    await fs.rm(path.join(dir, b.name), { recursive: true, force: true })
  }
}

async function getLastBackupAt(): Promise<Date | null> {
  const backups = await listBackups()
  return backups.length > 0 ? new Date(backups[0].createdAt) : null
}

let backupInFlight = false

/** ينشئ نسخة احتياطية الآن: قاعدة البيانات (عبر VACUUM INTO الآمن أثناء التشغيل) + مجلد الرفع. */
export async function runBackupNow(): Promise<BackupInfo> {
  if (backupInFlight) {
    throw new Error("نسخ احتياطي آخر قيد التنفيذ بالفعل — حاول بعد قليل")
  }
  backupInFlight = true
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-")
    const dir = path.join(getBackupsDir(), stamp)
    await fs.mkdir(dir, { recursive: true })

    const dbBackupPath = path.join(dir, "app.db")
    // VACUUM INTO: نسخة متّسقة وآمنة لقاعدة SQLite حتى أثناء استخدام السيرفر (متوافق مع WAL).
    const escaped = dbBackupPath.replace(/\\/g, "/").replace(/'/g, "''")
    await prisma.$executeRawUnsafe(`VACUUM INTO '${escaped}';`)

    const uploadsDir = getUploadsDir()
    if (existsSync(uploadsDir)) {
      await fs.cp(uploadsDir, path.join(dir, "uploads"), { recursive: true })
    }

    await pruneOldBackups()

    const stat = await fs.stat(dbBackupPath)
    return { name: stamp, createdAt: stat.mtime.toISOString(), sizeBytes: stat.size }
  } finally {
    backupInFlight = false
  }
}

/** معلومات سريعة للوحة الأدمن: آخر نسخة + القائمة الكاملة. */
export async function getBackupStatus(): Promise<{
  lastBackupAt: string | null
  retainCount: number
  minGapHours: number
  backups: BackupInfo[]
}> {
  const backups = await listBackups()
  return {
    lastBackupAt: backups[0]?.createdAt ?? null,
    retainCount: RETAIN_COUNT,
    minGapHours: MIN_GAP_MS / (60 * 60 * 1000),
    backups,
  }
}

async function backupIfDue(reason: string): Promise<void> {
  try {
    const last = await getLastBackupAt()
    if (last && Date.now() - last.getTime() < MIN_GAP_MS) return
    await runBackupNow()
    console.info(`[backup] تم إنشاء نسخة احتياطية تلقائية (${reason})`)
  } catch (e) {
    console.error(`[backup] فشل النسخ الاحتياطي التلقائي (${reason}):`, e)
  }
}

let schedulerStarted = false

/**
 * يبدأ جدولة النسخ الاحتياطي: نسخة فورية إن لم توجد نسخة حديثة (خلال 24 ساعة) عند بدء
 * التشغيل — لأن الموقع محلي وقد لا يبقى السيرفر عاملاً طوال الوقت — بالإضافة لفحص دوري
 * كل 6 ساعات أثناء تشغيل السيرفر لتغطية الجلسات الطويلة.
 */
export function startBackupScheduler(): void {
  if (schedulerStarted) return
  schedulerStarted = true

  void backupIfDue("عند بدء التشغيل")

  const timer = setInterval(() => void backupIfDue("فحص دوري"), CHECK_INTERVAL_MS)
  timer.unref()
}
