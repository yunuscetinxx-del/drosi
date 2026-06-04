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

  throw new Error(
    "Missing database connection. Set SUPABASE_DB_PASSWORD or DATABASE_URL in .env"
  )
}
