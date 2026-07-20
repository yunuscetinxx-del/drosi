import fs from "node:fs"
import path from "node:path"

/**
 * إعداد التخزين المحلي: مكان حفظ قاعدة البيانات (SQLite) وملفات الرفع (صور/مستندات).
 * يُحفظ في ملف صغير عند جذر المشروع يشير إلى المجلد الفعلي — بحيث يمكن للمستخدم
 * نقل مكان البيانات لأي قرص/مجلد يريده من لوحة الإعدادات.
 */

const CONFIG_FILE = path.join(process.cwd(), "storage.config.json")

export type StorageConfig = {
  dataDir: string
}

/** المجلد الافتراضي: <جذر المشروع>/data */
export function getDefaultDataDir(): string {
  return path.join(process.cwd(), "data")
}

function readConfigFile(): StorageConfig | null {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf8")
    const json = JSON.parse(raw) as Partial<StorageConfig>
    if (typeof json.dataDir === "string" && json.dataDir.trim()) {
      return { dataDir: json.dataDir.trim() }
    }
  } catch {
    /* لا يوجد ملف إعداد بعد — سيُستخدم المسار الافتراضي */
  }
  return null
}

function writeConfigFile(config: StorageConfig): void {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n", "utf8")
}

/** يقرأ إعداد التخزين الحالي، وينشئه بالقيمة الافتراضية أول مرة. */
export function getStorageConfig(): StorageConfig {
  const existing = readConfigFile()
  if (existing) return existing
  const fallback: StorageConfig = { dataDir: getDefaultDataDir() }
  try {
    writeConfigFile(fallback)
  } catch {
    /* في بيئة القراءة فقط (مثل بناء الإنتاج) قد يفشل الكتابة — نتجاهل */
  }
  return fallback
}

/** مجلد البيانات الحالي (يُنشأ إن لم يكن موجوداً). */
export function getDataDir(): string {
  const dir = getStorageConfig().dataDir
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

/** مجلد ملفات الرفع (صور الدروس وغيرها). */
export function getUploadsDir(): string {
  const dir = path.join(getDataDir(), "uploads")
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

/** مسار ملف قاعدة بيانات SQLite. */
export function getDbFilePath(): string {
  return path.join(getDataDir(), "app.db")
}

/** ينقل قاعدة البيانات وملفات الرفع إلى مجلد جديد، ويحدّث ملف الإعداد. */
export async function relocateStorage(newDataDir: string): Promise<StorageConfig> {
  const fsp = fs.promises
  const current = getStorageConfig()
  const resolvedNew = path.resolve(newDataDir)
  const resolvedCurrent = path.resolve(current.dataDir)

  if (resolvedNew === resolvedCurrent) {
    return current
  }

  await fsp.mkdir(resolvedNew, { recursive: true })
  await fsp.mkdir(path.join(resolvedNew, "uploads"), { recursive: true })

  const oldDbFile = path.join(resolvedCurrent, "app.db")
  const newDbFile = path.join(resolvedNew, "app.db")
  const sidecarSuffixes = ["", "-journal", "-wal", "-shm"]
  for (const suffix of sidecarSuffixes) {
    const src = oldDbFile + suffix
    if (fs.existsSync(src)) {
      await fsp.copyFile(src, newDbFile + suffix)
    }
  }

  const oldUploads = path.join(resolvedCurrent, "uploads")
  const newUploads = path.join(resolvedNew, "uploads")
  if (fs.existsSync(oldUploads)) {
    await fsp.cp(oldUploads, newUploads, { recursive: true, force: true })
  }

  writeConfigFile({ dataDir: resolvedNew })

  // تنظيف المكان القديم — أفضل جهد فقط، لا نفشل العملية إن تعذّر
  try {
    for (const suffix of sidecarSuffixes) {
      const src = oldDbFile + suffix
      if (fs.existsSync(src)) await fsp.rm(src, { force: true })
    }
    if (fs.existsSync(oldUploads)) {
      await fsp.rm(oldUploads, { recursive: true, force: true })
    }
  } catch {
    /* تنظيف غير حرج */
  }

  return { dataDir: resolvedNew }
}
