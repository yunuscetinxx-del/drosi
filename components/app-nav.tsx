"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, CalendarDays, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations } from "@/components/locale-provider"
import { ShareLessonButton } from "@/components/share-lesson-dialog"
import type { Lesson } from "@/types/lesson"

interface AppNavProps {
  shareLesson?: Lesson | null
}

const linkClass = (active: boolean) =>
  cn(
    "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
    active
      ? "bg-background text-foreground shadow-sm"
      : "text-muted-foreground hover:text-foreground hover:bg-background/60"
  )

export function AppNav({ shareLesson }: AppNavProps) {
  const pathname = usePathname()
  const { t } = useTranslations()
  const lessonsActive = pathname === "/"
  const showShare = Boolean(shareLesson && lessonsActive)

  return (
    <nav className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
      <div
        className={cn(
          "inline-flex items-center gap-1 rounded-md",
          lessonsActive && "bg-background shadow-sm"
        )}
      >
        {showShare && shareLesson && (
          <ShareLessonButton lesson={shareLesson} className="shrink-0 rounded-e-none border-0 shadow-none" />
        )}
        <Link href="/" className={cn(linkClass(lessonsActive), showShare && "rounded-s-none ps-2")}>
          <BookOpen className="h-4 w-4" />
          <span className="hidden sm:inline">{t("nav.lessons")}</span>
        </Link>
      </div>

      <Link href="/calendar" className={linkClass(pathname === "/calendar")}>
        <CalendarDays className="h-4 w-4" />
        <span className="hidden sm:inline">{t("nav.calendar")}</span>
      </Link>

      <Link href="/settings" className={linkClass(pathname === "/settings")}>
        <Settings className="h-4 w-4" />
        <span className="hidden sm:inline">{t("nav.settings")}</span>
      </Link>
    </nav>
  )
}
