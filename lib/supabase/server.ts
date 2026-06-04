import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getSupabaseBrowserKey, getSupabaseUrl } from "@/lib/supabase/env"

/**
 * عميل Supabase على الخادم (مسارات API، Server Components، Server Actions).
 * يزامن جلسة المستخدم مع الكوكيز عند استخدام Supabase Auth.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(getSupabaseUrl(), getSupabaseBrowserKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          /* يُستدعى أحياناً من Server Component بدون إمكانية تعيين الكوكيز */
        }
      },
    },
  })
}
