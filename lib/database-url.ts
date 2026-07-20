import { getDbFilePath } from "@/lib/local-storage-config"

function stripQuotes(value: string): string {
  return value.replace(/^"|"$/g, "").trim()
}

/** يحوّل مسار Windows/Unix إلى صيغة رابط SQLite المقبولة من Prisma. */
function toSqliteFileUrl(absolutePath: string): string {
  return `file:${absolutePath.replace(/\\/g, "/")}`
}

/**
 * يبني رابط قاعدة البيانات المحلية (SQLite) ضمن مجلد التخزين المحلي —
 * أو يستخدم DATABASE_URL صراحةً إن كان مضبوطاً (لدعم Postgres/سحابي عند الحاجة).
 */
export function resolveDatabaseUrl(): string {
  const direct = process.env.DATABASE_URL ? stripQuotes(process.env.DATABASE_URL) : ""
  if (direct) {
    return direct
  }

  // أثناء مرحلة البناء الساكن (next build) لا حاجة لاتصال فعلي بقاعدة البيانات.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return "file:./placeholder-build.db"
  }

  return toSqliteFileUrl(getDbFilePath())
}
