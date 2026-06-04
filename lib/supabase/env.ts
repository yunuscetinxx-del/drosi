/** URL مشروع Supabase (لوحة المشروع → Settings → API). */
export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL")
  }
  return url
}

/**
 * المفتاح العام للعميل: إما Publishable الجديد أو Anon الكلاسيكي (JWT).
 * يُمرَّر لـ createClient كـ "anon key" في واجهة الـ SDK.
 */
export function getSupabaseBrowserKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    )
  }
  return key
}
