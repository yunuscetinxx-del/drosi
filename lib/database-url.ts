const SUPABASE_PROJECT_REF = "ibvgndobpiqzxbffokup"

function stripQuotes(value: string): string {
  return value.replace(/^"|"$/g, "").trim()
}

function isPlaceholderDatabaseUrl(url: string): boolean {
  return (
    url.includes("localhost") ||
    url.includes("127.0.0.1") ||
    url.includes("johndoe") ||
    url.includes("@mydb")
  )
}

/** يبني رابط Postgres لـ Supabase من SUPABASE_DB_PASSWORD أو DATABASE_URL. */
export function resolveDatabaseUrl(): string {
  const password = process.env.SUPABASE_DB_PASSWORD?.trim()
  if (password) {
    return `postgresql://postgres:${encodeURIComponent(password)}@db.${SUPABASE_PROJECT_REF}.supabase.co:5432/postgres`
  }

  const direct = process.env.DATABASE_URL ? stripQuotes(process.env.DATABASE_URL) : ""
  if (direct && !isPlaceholderDatabaseUrl(direct)) {
    return direct
  }

  // أثناء مرحلة البناء الساكن (next build) لا يوجد اتصال بقاعدة بيانات؛
  // نُرجع رابطاً وهمياً ليكتمل البناء دون فشل. الخطأ سيظهر فقط عند استخدام
  // prisma فعلياً في وقت التشغيل (runtime) إن لم تكن DATABASE_URL مضبوطة.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return "postgresql://placeholder:placeholder@localhost:5432/placeholder"
  }

  throw new Error(
    "Missing database connection. Set SUPABASE_DB_PASSWORD or DATABASE_URL in .env"
  )
}
