"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { readLastRoute, writeLastRoute, type AppRoute } from "@/lib/app-navigation"

/** يحفظ آخر مسار (دروس / تقويم) ويعيد التوجيه عند فتح التطبيق */
export function RestoreAppNavigation() {
  const pathname = usePathname()
  const router = useRouter()
  const initialized = useRef(false)

  useEffect(() => {
    const isAppRoute = pathname === "/lessons" || pathname === "/calendar"

    if (initialized.current) {
      if (isAppRoute) writeLastRoute(pathname as AppRoute)
      return
    }

    initialized.current = true

    if (pathname === "/lessons") {
      const last = readLastRoute()
      if (last === "/calendar") {
        router.replace("/calendar")
        return
      }
    }

    if (isAppRoute) writeLastRoute(pathname as AppRoute)
  }, [pathname, router])

  return null
}
