"use client"

import { useEffect, useState } from "react"
import { useLessons } from "@/hooks/use-lessons"
import { LessonCard } from "@/components/lesson-card"
import { LessonDetail } from "@/components/lesson-detail"
import { AddLessonDialog } from "@/components/add-lesson-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BookOpen,
  Plus,
  Search,
  LayoutGrid,
  SlidersHorizontal,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations } from "@/components/locale-provider"
import { LanguageSwitcher } from "@/components/language-switcher"
import { AppNav } from "@/components/app-nav"

export default function LessonsPage() {
  const { t } = useTranslations()
  const {
    lessons,
    selectedLesson,
    setSelectedLesson,
    isLoaded,
    addLesson,
    updateLesson,
    deleteLesson,
    addImage,
    removeImage,
    addImageAnnotation,
    updateImageAnnotation,
    removeImageAnnotation,
    setImageAIAnalysis,
    setAiImageNote,
  } = useLessons()

  const [searchQuery, setSearchQuery] = useState("")
  const [subjectFilter, setSubjectFilter] = useState<string>("all")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [me, setMe] = useState<{ name?: string | null; email: string; isAdmin: boolean } | null>(
    null
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" })
        if (!res.ok) return
        const data = (await res.json()) as {
          user?: { name?: string | null; email: string; isAdmin?: boolean }
        }
        if (!cancelled && data.user?.email)
          setMe({
            name: data.user.name,
            email: data.user.email,
            isAdmin: data.user.isAdmin === true,
          })
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
    } catch {
      /* ignore */
    }
    window.location.href = "/login"
  }

  useEffect(() => {
    try {
      const v = localStorage.getItem("durusi_sidebar_open")
      if (v === "0") setSidebarOpen(false)
      if (v === "1") setSidebarOpen(true)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem("durusi_sidebar_open", sidebarOpen ? "1" : "0")
    } catch {
      /* ignore */
    }
  }, [sidebarOpen])

  const subjects = Array.from(new Set(lessons.map((l) => l.subject)))

  const filteredLessons = lessons.filter((lesson) => {
    const matchesSearch =
      lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lesson.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lesson.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSubject = subjectFilter === "all" || lesson.subject === subjectFilter
    return matchesSearch && matchesSubject
  })

  if (!isLoaded) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">{t("home.loadingLessons")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <header className="sticky top-0 z-50 shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{t("app.title")}</h1>
                <p className="text-xs text-muted-foreground">{t("app.subtitle")}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <AppNav shareLesson={selectedLesson} />
              <LanguageSwitcher />
              {me?.email && (
                <span
                  className="hidden max-w-[180px] truncate text-xs text-muted-foreground sm:inline"
                  title={me.email}
                >
                  {me.name?.trim() || me.email}
                </span>
              )}
              {me?.isAdmin && (
                <>
                  <Badge variant="secondary" className="text-xs">
                    {t("auth.admin")}
                  </Badge>
                  <Button asChild variant="outline" size="sm">
                    <a href="/admin">لوحة الأدمن</a>
                  </Button>
                </>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => void logout()}>
                <LogOut className="w-4 h-4 ml-2" />
                {t("auth.logout")}
              </Button>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 ml-2" />
                {t("home.newLesson")}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden",
          !selectedLesson && "px-4 py-4 sm:px-6 lg:px-8"
        )}
      >
        <div
          className={cn(
            "flex w-full min-h-0 flex-1 flex-col lg:flex-row lg:items-stretch",
            selectedLesson ? "gap-0" : "gap-6 lg:gap-0"
          )}
        >
          <div
            className={cn(
              "flex max-h-full min-h-0 flex-col",
              selectedLesson ? "hidden lg:flex" : "",
              "lg:max-h-full lg:min-h-0 lg:shrink-0 lg:overflow-hidden lg:transition-[width] lg:duration-300 lg:ease-in-out",
              sidebarOpen ? "lg:w-[400px]" : "lg:w-0 lg:min-w-0"
            )}
          >
            <aside
              id="lessons-sidebar"
              className="flex w-full min-h-0 max-h-full flex-col gap-4 lg:w-[400px] lg:min-w-[400px]"
            >
              <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("home.searchPlaceholder")}
                  className="pr-10"
                />
              </div>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SlidersHorizontal className="w-4 h-4 ml-2" />
                  <SelectValue placeholder={t("home.filterSubject")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("home.allSubjects")}</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              </div>

            <div className="flex shrink-0 items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t("home.lessonCount", { count: filteredLessons.length })}
              </span>
              <Button variant="ghost" size="icon">
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {filteredLessons.length === 0 ? (
              <div className="py-12 text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-4">
                  {searchQuery || subjectFilter !== "all"
                    ? t("home.noSearchResults")
                    : t("home.noLessons")}
                </p>
                {!searchQuery && subjectFilter === "all" && (
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="w-4 h-4 ml-2" />
                    {t("home.addFirstLesson")}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLessons.map((lesson) => (
                  <div key={lesson.id} className="group">
                    <LessonCard
                      lesson={lesson}
                      isSelected={selectedLesson?.id === lesson.id}
                      onSelect={() => setSelectedLesson(lesson)}
                      onDelete={() => deleteLesson(lesson.id)}
                    />
                  </div>
                ))}
              </div>
            )}
            </div>
            </aside>
          </div>

          <div className="relative z-20 hidden min-h-0 w-0 shrink-0 self-stretch justify-center pointer-events-none lg:flex">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="pointer-events-auto absolute top-1/2 left-1/2 h-11 w-7 -translate-x-1/2 -translate-y-1/2 rounded-md border border-border bg-card shadow-md"
              aria-expanded={sidebarOpen}
              aria-controls="lessons-sidebar"
              title={sidebarOpen ? t("home.hideSidebar") : t("home.showSidebar")}
              onClick={() => setSidebarOpen((v) => !v)}
            >
              {sidebarOpen ? (
                <PanelRightClose className="h-4 w-4" aria-hidden />
              ) : (
                <PanelRightOpen className="h-4 w-4" aria-hidden />
              )}
            </Button>
          </div>

          <main
            className={cn(
              "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
              !selectedLesson ? "hidden lg:flex" : ""
            )}
          >
            {selectedLesson ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card">
                <LessonDetail
                  lesson={selectedLesson}
                  onUpdate={updateLesson}
                  onAddImage={addImage}
                  onRemoveImage={removeImage}
                  onAddImageAnnotation={addImageAnnotation}
                  onUpdateImageAnnotation={updateImageAnnotation}
                  onRemoveImageAnnotation={removeImageAnnotation}
                  onSetImageAIAnalysis={setImageAIAnalysis}
                  onSetAiImageNote={setAiImageNote}
                  onClose={() => setSelectedLesson(null)}
                />
              </div>
            ) : (
              <div className="flex flex-1 min-h-0 items-center justify-center bg-card">
                <div className="text-center">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-muted-foreground">{t("home.selectLesson")}</p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      <AddLessonDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdd={addLesson}
      />
    </div>
  )
}
