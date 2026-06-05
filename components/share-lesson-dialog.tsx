"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useTranslations } from "@/components/locale-provider"
import type { Lesson } from "@/types/lesson"
import type { LessonShareRecord, SharePermission, ShareScope } from "@/types/share"
import { formatShareScopeLabel, isFullShareScope } from "@/lib/lesson-share-scope"
import {
  Copy,
  FileText,
  ImageIcon,
  Link2,
  Map,
  Plus,
  Share2,
  Trash2,
} from "lucide-react"

interface ShareLessonDialogProps {
  lesson: Lesson
  open: boolean
  onOpenChange: (open: boolean) => void
}

function describeStoredScope(
  scope: ShareScope | null | undefined,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  return formatShareScopeLabel(scope, t)
}

function buildScopeFromSelection(
  lesson: Lesson,
  includeDetails: boolean,
  imageIds: Set<string>,
  wordPageIds: Set<string>,
  mindMapIds: Set<string>
): ShareScope | null {
  const allImages = imageIds.size === lesson.images.length
  const allWord = wordPageIds.size === lesson.wordPages.length
  const allMaps = mindMapIds.size === lesson.mindMaps.length

  if (includeDetails && allImages && allWord && allMaps) return null

  return {
    includeDetails,
    imageIds: allImages ? null : [...imageIds],
    wordPageIds: allWord ? null : [...wordPageIds],
    mindMapIds: allMaps ? null : [...mindMapIds],
  }
}

function SharePermissionToggle({
  value,
  onChange,
  editDisabled,
  showPartialHint,
  t,
}: {
  value: SharePermission
  onChange: (value: SharePermission) => void
  editDisabled?: boolean
  showPartialHint?: boolean
  t: (key: string, params?: Record<string, string | number>) => string
}) {
  return (
    <div className="space-y-2">
      <Label>{t("share.permission")}</Label>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={value === "read" ? "default" : "outline"}
          onClick={() => onChange("read")}
        >
          {t("share.permissionRead")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={value === "edit" ? "default" : "outline"}
          disabled={editDisabled}
          onClick={() => onChange("edit")}
        >
          {t("share.permissionEdit")}
        </Button>
      </div>
      {editDisabled && showPartialHint && (
        <p className="text-xs text-muted-foreground">{t("share.permissionPartialLocked")}</p>
      )}
    </div>
  )
}

export function ShareLessonDialog({ lesson, open, onOpenChange }: ShareLessonDialogProps) {
  const { t } = useTranslations()
  const [shares, setShares] = useState<LessonShareRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [permission, setPermission] = useState<SharePermission>("read")
  const [allowCopy, setAllowCopy] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [includeDetails, setIncludeDetails] = useState(true)
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set())
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set())
  const [selectedMapIds, setSelectedMapIds] = useState<Set<string>>(new Set())

  const resetSelection = useCallback(() => {
    setIncludeDetails(true)
    setSelectedImageIds(new Set(lesson.images.map((i) => i.id)))
    setSelectedWordIds(new Set(lesson.wordPages.map((p) => p.id)))
    setSelectedMapIds(new Set(lesson.mindMaps.map((m) => m.id)))
    setPermission("read")
    setAllowCopy(true)
    setCreateError(null)
  }, [lesson])

  useEffect(() => {
    if (open) resetSelection()
  }, [open, resetSelection])

  const scopePreview = useMemo(
    () =>
      buildScopeFromSelection(
        lesson,
        includeDetails,
        selectedImageIds,
        selectedWordIds,
        selectedMapIds
      ),
    [lesson, includeDetails, selectedImageIds, selectedWordIds, selectedMapIds]
  )

  const isPartialScope = scopePreview !== null && !isFullShareScope(scopePreview)
  const effectivePermission = isPartialScope ? "read" : permission

  const toggleId = (set: Set<string>, id: string, checked: boolean) => {
    const next = new Set(set)
    if (checked) next.add(id)
    else next.delete(id)
    return next
  }

  const loadShares = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/lessons/${encodeURIComponent(lesson.id)}/shares`, {
        credentials: "include",
      })
      if (!res.ok) return
      const data = (await res.json()) as { shares?: LessonShareRecord[] }
      setShares(data.shares ?? [])
    } finally {
      setLoading(false)
    }
  }, [lesson.id])

  useEffect(() => {
    if (open) void loadShares()
  }, [open, loadShares])

  const createShare = async () => {
    setCreating(true)
    setCreateError(null)
    try {
      const scope = buildScopeFromSelection(
        lesson,
        includeDetails,
        selectedImageIds,
        selectedWordIds,
        selectedMapIds
      )

      const res = await fetch(`/api/lessons/${encodeURIComponent(lesson.id)}/shares`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permission: effectivePermission,
          allowCopy,
          scope,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setCreateError(data.error ?? t("common.error"))
        return
      }
      const data = (await res.json()) as { share?: LessonShareRecord }
      if (data.share) setShares((prev) => [data.share!, ...prev])
    } finally {
      setCreating(false)
    }
  }

  const patchShare = async (
    shareId: string,
    patch: { permission?: SharePermission; allowCopy?: boolean; active?: boolean },
    share: LessonShareRecord
  ) => {
    if (patch.permission === "edit" && share.scopeIsFull === false) return

    const res = await fetch(`/api/shares/${encodeURIComponent(shareId)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
    if (!res.ok) return
    const data = (await res.json()) as { share?: LessonShareRecord }
    if (data.share) {
      setShares((prev) => prev.map((s) => (s.id === shareId ? { ...s, ...data.share! } : s)))
    }
  }

  const deleteShare = async (shareId: string) => {
    const res = await fetch(`/api/shares/${encodeURIComponent(shareId)}`, {
      method: "DELETE",
      credentials: "include",
    })
    if (!res.ok) return
    setShares((prev) => prev.filter((s) => s.id !== shareId))
  }

  const copyLink = async (share: LessonShareRecord) => {
    const url = share.shareUrl || `/share/${share.token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(share.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      /* ignore */
    }
  }

  const selectAllContent = () => {
    setIncludeDetails(true)
    setSelectedImageIds(new Set(lesson.images.map((i) => i.id)))
    setSelectedWordIds(new Set(lesson.wordPages.map((p) => p.id)))
    setSelectedMapIds(new Set(lesson.mindMaps.map((m) => m.id)))
  }

  const hasAnySelection =
    includeDetails ||
    selectedImageIds.size > 0 ||
    selectedWordIds.size > 0 ||
    selectedMapIds.size > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            {t("share.title")}
          </DialogTitle>
          <DialogDescription>{t("share.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-sm font-medium">{t("share.whatToShare")}</Label>
            <Button type="button" variant="ghost" size="sm" onClick={selectAllContent}>
              {t("share.selectAll")}
            </Button>
          </div>

          <div className="flex items-start gap-3 rounded-md border border-border/60 p-3">
            <Checkbox
              id="share-details"
              checked={includeDetails}
              onCheckedChange={(v) => setIncludeDetails(v === true)}
            />
            <div className="space-y-0.5">
              <Label htmlFor="share-details" className="cursor-pointer font-normal">
                {t("share.scopeDetails")}
              </Label>
              <p className="text-xs text-muted-foreground">{t("share.scopeDetailsHint")}</p>
            </div>
          </div>

          {lesson.images.length > 0 && (
            <div className="space-y-2 rounded-md border border-border/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ImageIcon className="h-4 w-4" />
                  {t("share.imagesSection", { count: lesson.images.length })}
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setSelectedImageIds(new Set(lesson.images.map((i) => i.id)))}
                  >
                    {t("share.selectAll")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setSelectedImageIds(new Set())}
                  >
                    {t("share.selectNone")}
                  </Button>
                </div>
              </div>
              <div className="max-h-32 space-y-2 overflow-y-auto">
                {lesson.images.map((img, index) => (
                  <label key={img.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedImageIds.has(img.id)}
                      onCheckedChange={(v) =>
                        setSelectedImageIds(toggleId(selectedImageIds, img.id, v === true))
                      }
                    />
                    <span className="truncate">{t("share.imageItem", { n: index + 1 })}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {lesson.wordPages.length > 0 && (
            <div className="space-y-2 rounded-md border border-border/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4" />
                  {t("share.wordSection", { count: lesson.wordPages.length })}
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setSelectedWordIds(new Set(lesson.wordPages.map((p) => p.id)))}
                  >
                    {t("share.selectAll")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setSelectedWordIds(new Set())}
                  >
                    {t("share.selectNone")}
                  </Button>
                </div>
              </div>
              <div className="max-h-32 space-y-2 overflow-y-auto">
                {lesson.wordPages.map((page) => (
                  <label key={page.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedWordIds.has(page.id)}
                      onCheckedChange={(v) =>
                        setSelectedWordIds(toggleId(selectedWordIds, page.id, v === true))
                      }
                    />
                    <span className="truncate">{page.title || t("word.defaultPageTitle")}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {lesson.mindMaps.length > 0 && (
            <div className="space-y-2 rounded-md border border-border/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Map className="h-4 w-4" />
                  {t("share.mapsSection", { count: lesson.mindMaps.length })}
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setSelectedMapIds(new Set(lesson.mindMaps.map((m) => m.id)))}
                  >
                    {t("share.selectAll")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setSelectedMapIds(new Set())}
                  >
                    {t("share.selectNone")}
                  </Button>
                </div>
              </div>
              <div className="max-h-32 space-y-2 overflow-y-auto">
                {lesson.mindMaps.map((map) => (
                  <label key={map.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedMapIds.has(map.id)}
                      onCheckedChange={(v) =>
                        setSelectedMapIds(toggleId(selectedMapIds, map.id, v === true))
                      }
                    />
                    <span className="truncate">{map.title || t("mindMap.defaultMapTitle")}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {isPartialScope && (
            <p className="text-xs text-muted-foreground">{t("share.partialScopeHint")}</p>
          )}

          <SharePermissionToggle
            value={effectivePermission}
            onChange={setPermission}
            editDisabled={isPartialScope}
            showPartialHint={isPartialScope}
            t={t}
          />

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="allow-copy-new">{t("share.allowCopy")}</Label>
              <p className="text-xs text-muted-foreground">{t("share.allowCopyHint")}</p>
            </div>
            <Switch id="allow-copy-new" checked={allowCopy} onCheckedChange={setAllowCopy} />
          </div>

          {createError && <p className="text-sm text-destructive">{createError}</p>}

          <Button
            className="w-full"
            onClick={() => void createShare()}
            disabled={creating || !hasAnySelection}
          >
            <Plus className="me-2 h-4 w-4" />
            {creating ? t("common.processing") : t("share.createLink")}
          </Button>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium">{t("share.existingLinks")}</h3>
          {loading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
          {!loading && shares.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("share.noLinks")}</p>
          )}
          {shares.map((share) => (
            <div
              key={share.id}
              className="space-y-3 rounded-lg border border-border p-3 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={share.active ? "default" : "secondary"}>
                  {share.active ? t("share.linkActive") : t("share.linkInactive")}
                </Badge>
                <Badge variant="outline">
                  {share.permission === "edit"
                    ? t("share.permissionEdit")
                    : t("share.permissionRead")}
                </Badge>
                {!share.allowCopy && (
                  <Badge variant="outline">{t("share.copyDisabled")}</Badge>
                )}
                {share.scopeIsFull === false && (
                  <Badge variant="outline">{t("share.scopePartial")}</Badge>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                {describeStoredScope(share.scope, t)}
              </p>

              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
                  {share.shareUrl}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title={t("share.copyLink")}
                  onClick={() => void copyLink(share)}
                >
                  {copiedId === share.id ? (
                    <span className="text-xs">✓</span>
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-between gap-2">
                <Label htmlFor={`active-${share.id}`} className="text-xs">
                  {t("share.enableLink")}
                </Label>
                <Switch
                  id={`active-${share.id}`}
                  checked={share.active}
                  onCheckedChange={(checked) => void patchShare(share.id, { active: checked }, share)}
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <Label htmlFor={`copy-${share.id}`} className="text-xs">
                  {t("share.allowCopy")}
                </Label>
                <Switch
                  id={`copy-${share.id}`}
                  checked={share.allowCopy}
                  onCheckedChange={(checked) =>
                    void patchShare(share.id, { allowCopy: checked }, share)
                  }
                />
              </div>

              <SharePermissionToggle
                value={share.permission}
                onChange={(v) => void patchShare(share.id, { permission: v }, share)}
                editDisabled={share.scopeIsFull === false}
                showPartialHint={share.scopeIsFull === false}
                t={t}
              />

              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => void deleteShare(share.id)}
              >
                <Trash2 className="me-2 h-4 w-4" />
                {t("share.deleteLink")}
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** زر فتح حوار المشاركة */
export function ShareLessonButton({
  lesson,
  className,
}: {
  lesson: Lesson
  className?: string
}) {
  const { t } = useTranslations()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={className}
        onClick={() => setOpen(true)}
      >
        <Link2 className="me-2 h-4 w-4" />
        {t("share.shareButton")}
      </Button>
      <ShareLessonDialog lesson={lesson} open={open} onOpenChange={setOpen} />
    </>
  )
}
