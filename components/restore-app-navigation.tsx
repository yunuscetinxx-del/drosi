"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { readLastRoute, writeLastRoute, type AppRoute } from "@/lib/app-navigation"

/** يحفظ آخر مسار (دروس / تقويم) ويعيد التوجيه عند فتح الموقع */
export function RestoreAppNavigation() {
  const pathname = usePathname()
  const router = useRouter()
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) {
      if (pathname === "/" || pathname === "/calendar") {
        writeLastRoute(pathname as AppRoute)
      }
      return
    }

    initialized.current = true

    if (pathname === "/") {
      const last = readLastRoute()
      if (last === "/calendar") {
        router.replace("/calendar")
        return
      }
    }

    if (pathname === "/" || pathname === "/calendar") {
      writeLastRoute(pathname as AppRoute)
    }
  }, [pathname, router])

  return null
}
