"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { AiImageNote, ImageAnnotation, Lesson } from "@/types/lesson"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { ArrowUpRight, ImageIcon, Link2, MapPin, PanelBottom, PanelRight, Save } from "lucide-react"
import { useTranslations } from "@/components/locale-provider"

const EMPTY_NOTE: AiImageNote = { content: "", layout: "side", links: [] }

interface AiImageNotesPanelProps {
  lesson: Lesson
  readOnly?: boolean
  onChange: (note: AiImageNote) => void
}

export function AiImageNotesPanel({ lesson, readOnly = false, onChange }: AiImageNotesPanelProps) {
  const { t } = useTranslations()
  const [note, setNote] = useState<AiImageNote>(lesson.aiImageNote ?? EMPTY_NOTE)
  const [target, setTarget] = useState("")
  const [activeLinkId, setActiveLinkId] = useState<string | null>(null)
  const [imageDimensions, setImageDimensions] = useState<Record<string, { width: number; height: number }>>({})
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setNote(lesson.aiImageNote ?? EMPTY_NOTE)
    setTarget("")
    setActiveLinkId(null)
  }, [lesson.id, lesson.aiImageNote])

  const annotationTargets = useMemo(
    () =>
      lesson.images.flatMap((image, imageIndex) =>
        image.annotations.map((annotation, annotationIndex) => ({
          value: `${image.id}:${annotation.id}`,
          label: `${t("aiImageNotes.image", { index: imageIndex + 1 })} - ${annotationLabel(annotation, annotationIndex + 1, t)}`,
          image,
          annotation,
        }))
      ),
    [lesson.images, t]
  )

  const activeLink = note.links.find((link) => link.id === activeLinkId) ?? null
  const activeTarget = activeLink
    ? annotationTargets.find((item) => item.value === `${activeLink.imageId}:${activeLink.annotationId}`) ?? null
    : null

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
    const next: AiImageNote = {
      ...note,
      links: [
        ...note.links.filter((link) => end <= link.start || start >= link.end),
        { id: crypto.randomUUID(), start, end, imageId, annotationId },
      ].sort((a, b) => a.start - b.start),
    }
    save(next)
    setActiveLinkId(next.links.at(-1)?.id ?? null)
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
            "cursor-pointer rounded px-0.5 underline decoration-2 underline-offset-2 transition-colors",
            activeLinkId === link.id ? "bg-primary/30 decoration-primary" : "bg-amber-200/60 dark:bg-amber-400/20"
          )}
          onMouseEnter={() => setActiveLinkId(link.id)}
          onFocus={() => setActiveLinkId(link.id)}
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

  return (
    <section className="border-t border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Link2 className="h-4 w-4 text-primary" />
            {t("aiImageNotes.title")}
          </h3>
          <p className="text-[11px] text-muted-foreground">{t("aiImageNotes.hint")}</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={changeLayout} disabled={readOnly}>
          {note.layout === "side" ? <PanelBottom className="ms-1 h-4 w-4" /> : <PanelRight className="ms-1 h-4 w-4" />}
          {note.layout === "side" ? t("aiImageNotes.moveBelow") : t("aiImageNotes.moveSide")}
        </Button>
      </div>

      <div className={cn("grid gap-4 p-3", note.layout === "side" && "lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]")}>
        <div className="min-w-0 space-y-3">
          {!readOnly && (
            <>
              <Textarea
                ref={textareaRef}
                value={note.content}
                onChange={(event) => handleContentChange(event.target.value)}
                onBlur={() => save(note)}
                placeholder={t("aiImageNotes.placeholder")}
                rows={8}
                className="resize-y text-sm leading-relaxed"
              />
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-52 flex-1 space-y-1">
                  <Label className="text-xs">{t("aiImageNotes.marker")}</Label>
                  <Select value={target} onValueChange={setTarget}>
                    <SelectTrigger className="h-9"><SelectValue placeholder={t("aiImageNotes.selectMarker")} /></SelectTrigger>
                    <SelectContent>
                      {annotationTargets.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" size="sm" onClick={linkSelection} disabled={!target || annotationTargets.length === 0}>
                  <Link2 className="ms-1 h-4 w-4" />
                  {t("aiImageNotes.linkSelection")}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => save(note)}>
                  <Save className="ms-1 h-4 w-4" />
                  {t("common.save")}
                </Button>
              </div>
            </>
          )}

          <div className="min-h-24 whitespace-pre-wrap rounded-md border bg-muted/20 p-3 text-sm leading-relaxed">
            {note.content ? linkedPreview() : <span className="text-muted-foreground">{t("aiImageNotes.previewEmpty")}</span>}
          </div>
        </div>

        <div className="min-w-0">
          {activeTarget ? (
            <ImageMarkerPreview
              image={activeTarget.image}
              annotation={activeTarget.annotation}
              dimensions={imageDimensions[activeTarget.image.id]}
              onLoad={(dimensions) => setImageDimensions((current) => ({ ...current, [activeTarget.image.id]: dimensions }))}
              t={t}
            />
          ) : (
            <div className="flex min-h-44 items-center justify-center rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
              <ImageIcon className="me-2 h-4 w-4" />
              {t("aiImageNotes.hoverHint")}
            </div>
          )}
        </div>
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
  image: Lesson["images"][number]
  annotation: ImageAnnotation
  dimensions?: { width: number; height: number }
  onLoad: (dimensions: { width: number; height: number }) => void
  t: (key: string, params?: Record<string, string | number>) => string
}) {
  const left = dimensions ? (annotation.x / dimensions.width) * 100 : 0
  const top = dimensions ? (annotation.y / dimensions.height) * 100 : 0
  const width = dimensions ? (annotation.width / dimensions.width) * 100 : 0
  const height = dimensions ? (annotation.height / dimensions.height) * 100 : 0

  return (
    <figure className="space-y-2">
      <div className="relative overflow-hidden rounded-md border bg-muted">
        <img
          src={image.url}
          alt={t("aiImageNotes.imagePreview")}
          className="block max-h-80 w-full object-contain"
          onLoad={(event) => onLoad({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
        />
        {dimensions && annotation.kind === "pin" && (
          <span className="absolute h-5 w-5 -translate-x-1/2 -translate-y-full rounded-full border-2 border-white bg-primary shadow" style={{ left: `${left + width / 2}%`, top: `${top + height}%` }} />
        )}
        {dimensions && annotation.kind === "arrow" && (
          <>
            <span className="absolute origin-left border-t-[3px] border-primary" style={{ left: `${left}%`, top: `${top}%`, width: `${Math.hypot(width, height)}%`, transform: `rotate(${Math.atan2(height, width) * (180 / Math.PI)}deg)` }} />
            <ArrowUpRight className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-primary drop-shadow" style={{ left: `${left + width}%`, top: `${top + height}%` }} />
          </>
        )}
        {dimensions && (!annotation.kind || annotation.kind === "highlight") && (
          <span className="absolute border-[3px] border-primary bg-primary/15" style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }} />
        )}
      </div>
      <figcaption className="text-xs text-muted-foreground">{t("aiImageNotes.markerShown")}</figcaption>
    </figure>
  )
}