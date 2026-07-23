"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { AiImageNote, ImageAnnotation, LessonImage } from "@/types/lesson"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { ArrowUpRight, Check, Edit3, ImageIcon, Link2, Palette, PanelBottom, PanelRight, Save } from "lucide-react"
import { useTranslations } from "@/components/locale-provider"

const EMPTY_NOTE: AiImageNote = { content: "", layout: "below", links: [] }

const LINK_COLORS = [
  { name: "Yellow", value: "#fef08a" },
  { name: "Green", value: "#bbf7d0" },
  { name: "Blue", value: "#bfdbfe" },
  { name: "Pink", value: "#fbcfe8" },
  { name: "Orange", value: "#fed7aa" },
  { name: "Purple", value: "#ddd6fe" },
]

interface AiImageNotesPanelProps {
  images: LessonImage[]
  note?: AiImageNote
  readOnly?: boolean
  embedded?: boolean
  onActiveAnnotationChange?: (annotation: ImageAnnotation | null) => void
  onChange: (note: AiImageNote) => void
}

export function AiImageNotesPanel({
  images,
  note: savedNote,
  readOnly = false,
  embedded = false,
  onActiveAnnotationChange,
  onChange,
}: AiImageNotesPanelProps) {
  const { t } = useTranslations()
  const [note, setNote] = useState<AiImageNote>(savedNote ?? EMPTY_NOTE)
  const [target, setTarget] = useState("")
  const [linkColor, setLinkColor] = useState(LINK_COLORS[0].value)
  const [isEditing, setIsEditing] = useState(!readOnly && !savedNote?.content)
  const [activeLinkId, setActiveLinkId] = useState<string | null>(null)
  const [imageDimensions, setImageDimensions] = useState<Record<string, { width: number; height: number }>>({})
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setNote(savedNote ?? EMPTY_NOTE)
    setTarget("")
    setActiveLinkId(null)
  }, [savedNote])

  const annotationTargets = useMemo(
    () =>
      images.flatMap((image, imageIndex) =>
        image.annotations.map((annotation, annotationIndex) => ({
          value: `${image.id}:${annotation.id}`,
          label: `${t("aiImageNotes.image", { index: imageIndex + 1 })} - ${annotationLabel(annotation, annotationIndex + 1, t)}`,
          image,
          annotation,
        }))
      ),
    [images, t]
  )

  const activeLink = note.links.find((link) => link.id === activeLinkId) ?? null
  const activeTarget = activeLink
    ? annotationTargets.find((item) => item.value === `${activeLink.imageId}:${activeLink.annotationId}`) ?? null
    : null
  const previewImage = activeTarget?.image ?? images[0] ?? null

  useEffect(() => {
    onActiveAnnotationChange?.(activeTarget?.annotation ?? null)
  }, [activeTarget?.annotation, onActiveAnnotationChange])

  const save = (next: AiImageNote) => {
    setNote(next)
    onChange(next)
  }

  const handleContentChange = (content: string) => {
    setNote((current) => ({
      ...current,
      content,
      links: current.links.filter((link) => link.end <= content.length),
    }))
  }

  const linkSelection = () => {
    const textarea = textareaRef.current
    if (!textarea || !target) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    if (start === end) return
    const [imageId, annotationId] = target.split(":")
    const newLink: AiImageNoteLink = { id: crypto.randomUUID(), start, end, imageId, annotationId, color: linkColor }
    const next: AiImageNote = {
      ...note,
      links: [
        ...note.links.filter((link) => end <= link.start || start >= link.end),
        newLink,
      ].sort((a, b) => a.start - b.start),
    }
    save(next)
    setActiveLinkId(newLink.id)
  }

  const linkedPreview = () => {
    const parts: React.ReactNode[] = []
    let cursor = 0
    for (const link of [...note.links].sort((a, b) => a.start - b.start)) {
      if (link.start > cursor) parts.push(note.content.slice(cursor, link.start))
      const linkedText = note.content.slice(link.start, link.end)
      parts.push(
        <mark
          key={link.id}
          className={cn(
            "cursor-pointer rounded px-0.5 underline decoration-2 underline-offset-2 transition-opacity",
            activeLinkId === link.id && "ring-2 ring-primary/40"
          )}
          style={{ backgroundColor: link.color ?? LINK_COLORS[0].value }}
          onMouseEnter={() => setActiveLinkId(link.id)}
          onMouseLeave={() => setActiveLinkId(null)}
          onFocus={() => setActiveLinkId(link.id)}
          onBlur={() => setActiveLinkId(null)}
          onClick={() => setActiveLinkId(link.id)}
          tabIndex={0}
        >
          {linkedText}
        </mark>
      )
      cursor = link.end
    }
    if (cursor < note.content.length) parts.push(note.content.slice(cursor))
    return parts
  }

  const changeLayout = () => save({ ...note, layout: note.layout === "side" ? "below" : "side" })
  const saveAndFinishEditing = () => {
    save(note)
    setIsEditing(false)
  }

  const noteContent = (
    <div className="min-w-0 space-y-3">
      {isEditing && !readOnly && (
        <>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="space-y-1">
              <Label className="text-xs">{t("aiImageNotes.marker")}</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger className="h-9"><SelectValue placeholder={t("aiImageNotes.selectMarker")} /></SelectTrigger>
                <SelectContent>
                  {annotationTargets.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-xs"><Palette className="h-3.5 w-3.5" />{t("aiImageNotes.highlightColor")}</Label>
              <div className="flex h-9 items-center gap-1 rounded-md border px-2">
                {LINK_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={cn("h-5 w-5 rounded-full border-2", linkColor === color.value ? "border-foreground" : "border-transparent")}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                    onClick={() => setLinkColor(color.value)}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={linkSelection} disabled={!target || annotationTargets.length === 0}>
              <Link2 className="ms-1 h-4 w-4" />
              {t("aiImageNotes.linkSelection")}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={saveAndFinishEditing}>
              <Save className="ms-1 h-4 w-4" />
              {t("aiImageNotes.saveNote")}
            </Button>
          </div>
        </>
      )}

      <div className="min-h-24 whitespace-pre-wrap rounded-md border bg-muted/20 p-3 text-sm leading-relaxed">
        {isEditing && !readOnly ? (
          <Textarea
            ref={textareaRef}
            value={note.content}
            onChange={(event) => handleContentChange(event.target.value)}
            placeholder={t("aiImageNotes.placeholder")}
            rows={10}
            className="min-h-24 resize-y border-0 bg-transparent p-0 text-sm leading-relaxed shadow-none focus-visible:ring-0"
          />
        ) : note.content ? linkedPreview() : <span className="text-muted-foreground">{t("aiImageNotes.previewEmpty")}</span>}
      </div>
    </div>
  )

  const imageContent = (
    <div className="min-w-0">
      {previewImage ? (
        <ImageMarkerPreview
          image={previewImage}
          annotation={activeTarget?.annotation}
          dimensions={imageDimensions[previewImage.id]}
          onLoad={(dimensions) => setImageDimensions((current) => ({ ...current, [previewImage.id]: dimensions }))}
          t={t}
        />
      ) : (
        <div className="flex min-h-44 items-center justify-center rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
          <ImageIcon className="me-2 h-4 w-4" />
          {t("aiImageNotes.hoverHint")}
        </div>
      )}
    </div>
  )

  return (
    <section className={cn("border-t border-border bg-card", embedded && "shrink-0")}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Link2 className="h-4 w-4 text-primary" />
            {t("aiImageNotes.title")}
          </h3>
          <p className="text-[11px] text-muted-foreground">{t("aiImageNotes.hint")}</p>
        </div>
        <div className="flex gap-2">
          {!embedded && (
            <Button type="button" size="sm" variant="outline" onClick={changeLayout} disabled={readOnly}>
              {note.layout === "side" ? <PanelBottom className="ms-1 h-4 w-4" /> : <PanelRight className="ms-1 h-4 w-4" />}
              {note.layout === "side" ? t("aiImageNotes.moveBelow") : t("aiImageNotes.moveSide")}
            </Button>
          )}
          {!readOnly && (
            <Button type="button" size="sm" variant={isEditing ? "secondary" : "outline"} onClick={() => isEditing ? saveAndFinishEditing() : setIsEditing(true)}>
              {isEditing ? <Check className="ms-1 h-4 w-4" /> : <Edit3 className="ms-1 h-4 w-4" />}
              {isEditing ? t("aiImageNotes.doneEditing") : t("common.edit")}
            </Button>
          )}
        </div>
      </div>

      <div className={cn(
        !embedded && "grid gap-4 p-3",
        !embedded && note.layout === "side" && "lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]",
        embedded && "max-h-[38vh] overflow-y-auto p-3 pt-0"
      )}>
        {embedded ? noteContent : note.layout === "below" ? <>{imageContent}{noteContent}</> : <>{noteContent}{imageContent}</>}
      </div>
    </section>
  )
}

function annotationLabel(annotation: ImageAnnotation, index: number, t: (key: string, params?: Record<string, string | number>) => string) {
  if (annotation.kind === "pin") return t("aiImageNotes.pin", { index })
  if (annotation.kind === "arrow") return t("aiImageNotes.arrow", { index })
  return t("aiImageNotes.highlight", { index })
}

function ImageMarkerPreview({
  image,
  annotation,
  dimensions,
  onLoad,
  t,
}: {
  image: LessonImage
  annotation?: ImageAnnotation
  dimensions?: { width: number; height: number }
  onLoad: (dimensions: { width: number; height: number }) => void
  t: (key: string, params?: Record<string, string | number>) => string
}) {
  const left = dimensions && annotation ? (annotation.x / dimensions.width) * 100 : 0
  const top = dimensions && annotation ? (annotation.y / dimensions.height) * 100 : 0
  const width = dimensions && annotation ? (annotation.width / dimensions.width) * 100 : 0
  const height = dimensions && annotation ? (annotation.height / dimensions.height) * 100 : 0

  return (
    <figure className="space-y-2">
      <div className="relative overflow-hidden rounded-md border bg-muted">
        <img
          src={image.url}
          alt={t("aiImageNotes.imagePreview")}
          className="block max-h-80 w-full object-contain"
          onLoad={(event) => onLoad({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
        />
        {dimensions && annotation?.kind === "pin" && (
          <span className="absolute h-5 w-5 -translate-x-1/2 -translate-y-full rounded-full border-2 border-white bg-primary shadow" style={{ left: `${left + width / 2}%`, top: `${top + height}%` }} />
        )}
        {dimensions && annotation?.kind === "arrow" && (
          <>
            <span className="absolute origin-left border-t-[3px] border-primary" style={{ left: `${left}%`, top: `${top}%`, width: `${Math.hypot(width, height)}%`, transform: `rotate(${Math.atan2(height, width) * (180 / Math.PI)}deg)` }} />
            <ArrowUpRight className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-primary drop-shadow" style={{ left: `${left + width}%`, top: `${top + height}%` }} />
          </>
        )}
        {dimensions && annotation && (!annotation.kind || annotation.kind === "highlight") && (
          <span className="absolute border-[3px] border-primary bg-primary/15" style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }} />
        )}
      </div>
      <figcaption className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
        <p>{annotation ? t("aiImageNotes.markerShown") : t("aiImageNotes.hoverHint")}</p>
        {annotation?.note.trim() && <p className="mt-1 whitespace-pre-wrap text-foreground">{annotation.note}</p>}
      </figcaption>
    </figure>
  )
}