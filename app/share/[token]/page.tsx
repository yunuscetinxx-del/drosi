"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { LessonDetail } from "@/components/lesson-detail"
import { useSharedLesson } from "@/hooks/use-shared-lesson"
import { useTranslations } from "@/components/locale-provider"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatShareScopeLabel } from "@/lib/lesson-share-scope"
import { BookOpen, Copy, Home } from "lucide-react"

export default function SharedLessonPage() {
  const routeParams = useParams()
  const token =
    typeof routeParams.token === "string" ? routeParams.token : ""
  const router = useRouter()
  const { t } = useTranslations()
  const {
    lesson,
    meta,
    isLoaded,
    error,
    canEdit,
    updateLesson,
    addImage,
    removeImage,
    addImageAnnotation,
    updateImageAnnotation,
    removeImageAnnotation,
    setImageAIAnalysis,
    copyToMyLessons,
  } = useSharedLesson(token)

  const [copying, setCopying] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)

  const scopeSummary = useMemo(() => {
    if (!meta) return null
    return formatShareScopeLabel(meta.scope, t)
  }, [meta, t])

  const handleCopy = async () => {
    setCopying(true)
    setCopyError(null)
    try {
      const copied = await copyToMyLessons()
      if (copied) router.push("/")
    } catch (e) {
      setCopyError(e instanceof Error ? e.message : t("common.error"))
    } finally {
      setCopying(false)
    }
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <BookOpen className="h-6 w-6 shrink-0 text-primary" />
          <span className="truncate font-semibold">{t("share.sharedLesson")}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <LanguageSwitcher />
          <Button variant="outline" size="sm" asChild>
            <Link href="/lessons">
              <Home className="me-2 h-4 w-4" />
              {t("share.myLessons")}
            </Link>
          </Button>
        </div>
      </header>

      {!isLoaded && (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          {t("common.loading")}
        </div>
      )}

      {isLoaded && error && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-destructive">{error}</p>
          <Button asChild variant="outline">
            <Link href="/lessons">{t("share.myLessons")}</Link>
          </Button>
        </div>
      )}

      {isLoaded && lesson && meta && (
        <>
          <div className="shrink-0 space-y-3 border-b border-border bg-muted/30 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t("share.sharedBy", { email: meta.ownerEmail })}
              </span>
              <Badge variant="secondary">
                {canEdit ? t("share.permissionEdit") : t("share.permissionRead")}
              </Badge>
              {meta.isOwner && (
                <Badge variant="outline">{t("share.youAreOwner")}</Badge>
              )}
              {meta.scopeIsFull === false && (
                <Badge variant="outline">{t("share.scopePartial")}</Badge>
              )}
            </div>

            {scopeSummary && (
              <p className="text-xs text-muted-foreground">
                {t("share.includedContent")}: {scopeSummary}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {meta.allowCopy && !meta.isOwner && (
                <Button size="sm" disabled={copying} onClick={() => void handleCopy()}>
                  <Copy className="me-2 h-4 w-4" />
                  {copying ? t("common.processing") : t("share.saveCopy")}
                </Button>
              )}
              {!meta.allowCopy && !meta.isOwner && (
                <p className="text-xs text-muted-foreground">{t("share.copyNotAllowed")}</p>
              )}
            </div>
            {copyError && <p className="text-sm text-destructive">{copyError}</p>}
            {canEdit && (
              <p className="text-xs text-muted-foreground">{t("share.editHint")}</p>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <LessonDetail
              lesson={lesson}
              readOnly={!canEdit}
              onUpdate={updateLesson}
              onAddImage={addImage}
              onRemoveImage={removeImage}
              onAddImageAnnotation={addImageAnnotation}
              onUpdateImageAnnotation={updateImageAnnotation}
              onRemoveImageAnnotation={removeImageAnnotation}
              onSetImageAIAnalysis={setImageAIAnalysis}
              onClose={() => router.push("/")}
            />
          </div>
        </>
      )}
    </div>
  )
}
