"use client"

import { createBrowserClient } from "@supabase/ssr"
import { getSupabaseBrowserKey, getSupabaseUrl } from "@/lib/supabase/env"

/** عميل Supabase للمتصفح (مكوّنات `"use client"` فقط). */
export function createSupabaseBrowserClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseBrowserKey())
}
