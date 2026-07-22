"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { LessonImage, ImageAnnotation, ImageAIAnalysis } from "@/types/lesson"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Highlighter,
  MessageSquare,
  Trash2,
  Sparkles,
  Save,
  Eye,
  Edit3,
  StickyNote,
  Tags,
  MapPin,
  ArrowUpRight,
} from "lucide-react"
import { ImageAnalysisResults, formatAnalysisForNotes } from "@/components/image-analysis-results"
import { ImageAiAnalyzeDialog } from "@/components/image-ai-analyze-dialog"
import { useTranslations } from "@/components/locale-provider"

const HIGHLIGHT_COLOR_DEFS = [
  { key: "yellow" as const, value: "#fef08a", border: "#eab308" },
  { key: "green" as const, value: "#bbf7d0", border: "#22c55e" },
  { key: "blue" as const, value: "#bfdbfe", border: "#3b82f6" },
  { key: "pink" as const, value: "#fbcfe8", border: "#ec4899" },
  { key: "orange" as const, value: "#fed7aa", border: "#f97316" },
  { key: "purple" as const, value: "#ddd6fe", border: "#8b5cf6" },
  { key: "red" as const, value: "#fecaca", border: "#ef4444" },
  { key: "teal" as const, value: "#ccfbf1", border: "#14b8a6" },
  { key: "cyan" as const, value: "#cffafe", border: "#06b6d4" },
  { key: "lime" as const, value: "#d9f99d", border: "#84cc16" },
  { key: "indigo" as const, value: "#c7d2fe", border: "#6366f1" },
]

interface ImageEditorProps {
  image: LessonImage
  readOnly?: boolean
  open: boolean
  onClose: () => void
  onAddAnnotation: (annotation: Omit<ImageAnnotation, "id" | "createdAt">) => void
  onUpdateAnnotation: (annotationId: string, updates: Partial<ImageAnnotation>) => void
  onRemoveAnnotation: (annotationId: string) => void
  onSetAIAnalysis: (analysis: Omit<ImageAIAnalysis, "analyzedAt">) => void
  onAddToNotes: (text: string) => void
}

type EditorMode = "view" | "highlight" | "annotate" | "pin" | "arrow"

function drawArrow(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  color: string,
  dashed = false
) {
  const angle = Math.atan2(endY - startY, endX - startX)
  const headLength = 14

  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 3
  ctx.lineCap = "round"
  if (dashed) ctx.setLineDash([7, 5])
  ctx.beginPath()
  ctx.moveTo(startX, startY)
  ctx.lineTo(endX, endY)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.moveTo(endX, endY)
  ctx.lineTo(
    endX - headLength * Math.cos(angle - Math.PI / 6),
    endY - headLength * Math.sin(angle - Math.PI / 6)
  )
  ctx.lineTo(
    endX - headLength * Math.cos(angle + Math.PI / 6),
    endY - headLength * Math.sin(angle + Math.PI / 6)
  )
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

export function ImageEditor({
  image,
  readOnly = false,
  open,
  onClose,
  onAddAnnotation,
  onUpdateAnnotation,
  onRemoveAnnotation,
  onSetAIAnalysis,
  onAddToNotes,
}: ImageEditorProps) {
  const { t } = useTranslations()
  const HIGHLIGHT_COLORS = HIGHLIGHT_COLOR_DEFS.map((color) => ({
    ...color,
    name: t(`colors.${color.key}`),
  }))
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<EditorMode>("view")
  const [zoom, setZoom] = useState(1)
  const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLOR_DEFS[0])
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 })
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [selectedAnnotation, setSelectedAnnotation] = useState<ImageAnnotation | null>(null)
  const [hoveredAnnotation, setHoveredAnnotation] = useState<ImageAnnotation | null>(null)
  const [noteText, setNoteText] = useState("")
  const [showAllNotes, setShowAllNotes] = useState(false)
  const [showAiDialog, setShowAiDialog] = useState(false)
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 })
  const [canvasViewport, setCanvasViewport] = useState({ maxW: 1200, maxH: 720 })

  useEffect(() => {
    if (readOnly && open) setMode("view")
  }, [readOnly, open])

  useEffect(() => {
    if (!open) {
      setHoveredAnnotation(null)
      setShowAllNotes(false)
      return
    }
    const updateViewport = () => {
      setCanvasViewport({
        maxW: Math.min(window.innerWidth * 0.68, 1600),
        maxH: Math.min(window.innerHeight * 0.78, 960),
      })
    }
    updateViewport()
    window.addEventListener("resize", updateViewport)
    return () => window.removeEventListener("resize", updateViewport)
  }, [open])

  useEffect(() => {
    if (!open || readOnly) return

    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        return
      }

      const modes: Record<string, EditorMode> = {
        "0": "view",
        "1": "pin",
        "2": "highlight",
        "3": "annotate",
        "4": "arrow",
      }
      const nextMode = modes[event.key]
      if (!nextMode) return

      event.preventDefault()
      setMode(nextMode)
      setIsDrawing(false)
      setCurrentRect(null)
      setSelectedAnnotation(null)
      setHoveredAnnotation(null)
    }

    window.addEventListener("keydown", handleShortcut)
    return () => window.removeEventListener("keydown", handleShortcut)
  }, [open, readOnly])

  // Load image and set dimensions
  useEffect(() => {
    if (!open || !image.url) return
    const img = new window.Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      setImgDimensions({ width: img.width, height: img.height })
    }
    img.src = image.url
  }, [open, image.url])

  // ذاكرة تخزين مؤقت لعنصر الصورة المحمّل بالفعل — لتفادي إعادة تحميل الصورة (وما يسببه
  // من "ومضة"/تحديث ملحوظ) في كل مرة تُضاف أو تُعدَّل ملاحظة/تظليل، طالما رابط الصورة نفسه لم يتغيّر.
  const loadedImageRef = useRef<{ url: string; img: HTMLImageElement } | null>(null)

  // Draw canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !imgDimensions.width) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const render = (img: HTMLImageElement) => {
      // Set canvas size
      canvas.width = imgDimensions.width
      canvas.height = imgDimensions.height

      // Clear and draw image
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)

      // Draw existing annotations
      image.annotations.forEach((annotation) => {
        const colorObj = HIGHLIGHT_COLORS.find((c) => c.value === annotation.color) || HIGHLIGHT_COLORS[0]

        if (annotation.kind === "pin") {
          const pinX = annotation.x + annotation.width / 2
          const pinTop = annotation.y + 3

          ctx.fillStyle = colorObj.border
          ctx.beginPath()
          ctx.arc(pinX, pinTop + 8, 8, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.moveTo(pinX - 6, pinTop + 13)
          ctx.lineTo(pinX, annotation.y + annotation.height)
          ctx.lineTo(pinX + 6, pinTop + 13)
          ctx.closePath()
          ctx.fill()
          ctx.fillStyle = "#fff"
          ctx.beginPath()
          ctx.arc(pinX, pinTop + 8, 2.5, 0, Math.PI * 2)
          ctx.fill()
          return
        }

        if (annotation.kind === "arrow") {
          drawArrow(
            ctx,
            annotation.x,
            annotation.y,
            annotation.x + annotation.width,
            annotation.y + annotation.height,
            colorObj.border
          )
          return
        }
        
        // Draw highlight rectangle
        ctx.fillStyle = annotation.color + "80" // 50% opacity
        ctx.fillRect(annotation.x, annotation.y, annotation.width, annotation.height)
        
        // Draw border
        ctx.strokeStyle = colorObj.border
        ctx.lineWidth = 2
        ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height)

        // Draw note indicator if has note
        if (annotation.note) {
          ctx.fillStyle = colorObj.border
          ctx.beginPath()
          ctx.arc(annotation.x + annotation.width - 8, annotation.y + 8, 8, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = "#fff"
          ctx.font = "bold 10px sans-serif"
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.fillText("!", annotation.x + annotation.width - 8, annotation.y + 8)
        }
      })

      // Draw current selection rectangle
      if (currentRect) {
        if (mode === "arrow") {
          drawArrow(
            ctx,
            currentRect.x,
            currentRect.y,
            currentRect.x + currentRect.w,
            currentRect.y + currentRect.h,
            selectedColor.border,
            true
          )
          return
        }
        ctx.fillStyle = selectedColor.value + "60"
        ctx.fillRect(currentRect.x, currentRect.y, currentRect.w, currentRect.h)
        ctx.strokeStyle = selectedColor.border
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.strokeRect(currentRect.x, currentRect.y, currentRect.w, currentRect.h)
        ctx.setLineDash([])
      }
    }

    const cached = loadedImageRef.current
    if (cached && cached.url === image.url && cached.img.complete && cached.img.naturalWidth > 0) {
      render(cached.img)
      return
    }

    const img = new window.Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      loadedImageRef.current = { url: image.url, img }
      render(img)
    }
    img.src = image.url
  }, [image.url, image.annotations, currentRect, selectedColor, imgDimensions])

  useEffect(() => {
    drawCanvas()
  }, [drawCanvas])

  useEffect(() => {
    if (!hoveredAnnotation) return
    const updated = image.annotations.find((a) => a.id === hoveredAnnotation.id)
    if (updated) {
      setHoveredAnnotation(updated)
    } else {
      setHoveredAnnotation(null)
    }
  }, [image.annotations, hoveredAnnotation?.id])

  const findAnnotationAt = (coords: { x: number; y: number }) =>
    [...image.annotations].reverse().find((annotation) => {
      if (annotation.kind === "arrow") {
        const endX = annotation.x + annotation.width
        const endY = annotation.y + annotation.height
        const lineLengthSquared = annotation.width ** 2 + annotation.height ** 2
        if (lineLengthSquared === 0) return false
        const progress = Math.max(
          0,
          Math.min(
            1,
            ((coords.x - annotation.x) * annotation.width +
              (coords.y - annotation.y) * annotation.height) /
              lineLengthSquared
          )
        )
        const nearestX = annotation.x + progress * annotation.width
        const nearestY = annotation.y + progress * annotation.height
        return (
          Math.hypot(coords.x - nearestX, coords.y - nearestY) <= 14 ||
          Math.hypot(coords.x - endX, coords.y - endY) <= 18
        )
      }

      return (
        coords.x >= annotation.x &&
        coords.x <= annotation.x + annotation.width &&
        coords.y >= annotation.y &&
        coords.y <= annotation.y + annotation.height
      )
    })

  // Mouse handlers
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly && mode !== "view") return
    if (mode === "view") {
      const coords = getCanvasCoords(e)
      const clicked = findAnnotationAt(coords)
      if (clicked) {
        setSelectedAnnotation(clicked)
        setNoteText(clicked.note)
        if (!showAllNotes) {
          setHoveredAnnotation(clicked)
        }
      } else {
        setSelectedAnnotation(null)
        setHoveredAnnotation(null)
      }
      return
    }

    if (readOnly) return

    if (mode === "pin") {
      const coords = getCanvasCoords(e)
      setSelectedAnnotation({
        id: "temp",
        kind: "pin",
        x: coords.x - 10,
        y: coords.y - 28,
        width: 20,
        height: 28,
        color: selectedColor.value,
        note: "",
        createdAt: new Date(),
      })
      setNoteText("")
      return
    }

    if (mode === "highlight" || mode === "annotate" || mode === "arrow") {
      const coords = getCanvasCoords(e)
      setIsDrawing(true)
      setDrawStart(coords)
      setCurrentRect({ x: coords.x, y: coords.y, w: 0, h: 0 })
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode === "view" && !showAllNotes) {
      const coords = getCanvasCoords(e)
      const hovered = findAnnotationAt(coords)
      setHoveredAnnotation(hovered ?? null)
      return
    }

    if (!isDrawing || mode === "view") return
    const coords = getCanvasCoords(e)
    if (mode === "arrow") {
      setCurrentRect({
        x: drawStart.x,
        y: drawStart.y,
        w: coords.x - drawStart.x,
        h: coords.y - drawStart.y,
      })
      return
    }

    setCurrentRect({
      x: Math.min(drawStart.x, coords.x),
      y: Math.min(drawStart.y, coords.y),
      w: Math.abs(coords.x - drawStart.x),
      h: Math.abs(coords.y - drawStart.y),
    })
  }

  const handleMouseUp = () => {
    if (!isDrawing || !currentRect) {
      setIsDrawing(false)
      return
    }

    const isValidSelection =
      mode === "arrow"
        ? Math.hypot(currentRect.w, currentRect.h) > 12
        : currentRect.w > 10 && currentRect.h > 10

    if (isValidSelection) {
      if (mode === "annotate" || mode === "arrow") {
        // Show note input
        setSelectedAnnotation({
          id: "temp",
          kind: mode === "arrow" ? "arrow" : undefined,
          x: currentRect.x,
          y: currentRect.y,
          width: currentRect.w,
          height: currentRect.h,
          color: selectedColor.value,
          note: "",
          createdAt: new Date(),
        })
        setNoteText("")
      } else {
        // Just highlight without note
        onAddAnnotation({
          x: currentRect.x,
          y: currentRect.y,
          width: currentRect.w,
          height: currentRect.h,
          color: selectedColor.value,
          note: "",
        })
      }
    }

    setIsDrawing(false)
    setCurrentRect(null)
  }

  const handleSaveNote = () => {
    if (!selectedAnnotation) return

    if (selectedAnnotation.id === "temp") {
      onAddAnnotation({
        x: selectedAnnotation.x,
        y: selectedAnnotation.y,
        width: selectedAnnotation.width,
        height: selectedAnnotation.height,
        kind: selectedAnnotation.kind,
        color: selectedAnnotation.color,
        note: noteText,
      })
    } else {
      onUpdateAnnotation(selectedAnnotation.id, { note: noteText })
    }

    setSelectedAnnotation(null)
    setNoteText("")
    setHoveredAnnotation(null)
    setMode("view")
  }

  const handleAddNoteToLesson = () => {
    if (noteText.trim()) {
      onAddToNotes(noteText.trim())
    }
  }

  const maxWidth = canvasViewport.maxW
  const maxHeight = canvasViewport.maxH
  const scale = Math.min(maxWidth / imgDimensions.width, maxHeight / imgDimensions.height, 1)
  const displayWidth = imgDimensions.width * scale * zoom
  const displayHeight = imgDimensions.height * scale * zoom
  const canvasDisplayScale = imgDimensions.width ? displayWidth / imgDimensions.width : 1
  const annotationsWithNotes = image.annotations.filter((a) => a.note.trim())
  const annotationLabel = (annotation: ImageAnnotation, index: number) =>
    annotation.kind === "pin"
      ? t("imageEditor.pin", { index: index + 1 })
      : annotation.kind === "arrow"
        ? t("imageEditor.arrow", { index: index + 1 })
        : t("imageEditor.highlight", { index: index + 1 })

  const getAnnotationNoteAnchor = (annotation: ImageAnnotation) =>
    annotation.kind === "arrow"
      ? {
          x: (annotation.x + annotation.width) * canvasDisplayScale,
          y: (annotation.y + annotation.height) * canvasDisplayScale,
        }
      : {
          x: (annotation.x + annotation.width / 2) * canvasDisplayScale,
          y: annotation.y * canvasDisplayScale,
        }

  const layoutNoteLabels = () => {
    const labels = image.annotations
      .map((annotation, idx) => ({ annotation, idx }))
      .filter(({ annotation }) => annotation.note.trim())
      .map(({ annotation, idx }) => {
        const colorObj =
          HIGHLIGHT_COLORS.find((c) => c.value === annotation.color) || HIGHLIGHT_COLORS[0]
        const { x: centerX, y: topY } = getAnnotationNoteAnchor(annotation)
        return { annotation, idx, colorObj, centerX, topY, finalTop: topY }
      })
      .sort((a, b) => a.topY - b.topY || a.centerX - b.centerX)

    const labelHeight = 56
    const labelHalfWidth = 88
    const placed: { left: number; right: number; top: number; bottom: number }[] = []

    for (const label of labels) {
      let top = label.topY - 8

      for (let attempt = 0; attempt < 24; attempt++) {
        const left = label.centerX - labelHalfWidth
        const right = label.centerX + labelHalfWidth
        const bottom = top
        const topEdge = top - labelHeight

        const overlaps = placed.some(
          (p) => !(right < p.left || left > p.right || topEdge > p.bottom || bottom < p.top)
        )

        if (!overlaps) {
          placed.push({ left, right, top: topEdge, bottom })
          label.finalTop = top
          break
        }

        top -= labelHeight + 6
      }
    }

    return labels
  }

  const noteLabels = showAllNotes ? layoutNoteLabels() : []

  const renderAnnotationNoteBubble = (
    annotation: ImageAnnotation,
    idx: number,
    centerX: number,
    topY: number,
    zIndex = 40
  ) => {
    const colorObj =
      HIGHLIGHT_COLORS.find((c) => c.value === annotation.color) || HIGHLIGHT_COLORS[0]

    return (
      <div
        key={annotation.id}
        className="absolute max-w-[11rem] -translate-x-1/2 -translate-y-full rounded-md border-2 bg-popover/95 px-2.5 py-1.5 text-popover-foreground shadow-md backdrop-blur-sm pointer-events-none animate-in fade-in-0 zoom-in-95 duration-150"
        style={{
          left: centerX,
          top: topY - 6,
          borderColor: colorObj.border,
          zIndex,
        }}
      >
        <div className="mb-1 flex items-center gap-1.5">
          <div
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: annotation.color }}
          />
          <span className="text-[10px] font-semibold" style={{ color: colorObj.border }}>
            {annotationLabel(annotation, idx)}
          </span>
        </div>
        {annotation.note.trim() ? (
          <p className="text-xs leading-snug whitespace-pre-wrap break-words line-clamp-4">
            {annotation.note}
          </p>
        ) : (
          <p className="text-xs italic text-muted-foreground">{t("imageEditor.noNoteOnHighlight")}</p>
        )}
        <div
          className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b-2 border-r-2 bg-popover/95"
          style={{ borderColor: colorObj.border }}
        />
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="flex h-[94vh] max-h-[94vh] w-[min(1600px,98vw)] max-w-[98vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[98vw]"
      >
        <DialogHeader className="shrink-0 border-b border-border p-4">
          <div className="flex items-center justify-between gap-4 pe-8">
            <DialogTitle className="text-lg">{t("imageEditor.title")}</DialogTitle>
            <div className="flex items-center gap-2">
              {/* Mode buttons */}
              <div className="flex gap-1 bg-secondary/50 p-1 rounded-lg">
                <Button
                  variant={mode === "view" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setMode("view")}
                  className="gap-1.5"
                  title={t("imageEditor.shortcutView")}
                >
                  <Eye className="w-4 h-4" />
                  {t("imageEditor.modeView")}
                </Button>
                {!readOnly && (
                  <>
                    <Button
                      variant={mode === "highlight" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setMode("highlight")}
                      className="gap-1.5"
                      title={t("imageEditor.shortcutHighlight")}
                    >
                      <Highlighter className="w-4 h-4" />
                      {t("imageEditor.modeHighlight")}
                    </Button>
                    <Button
                      variant={mode === "annotate" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setMode("annotate")}
                      className="gap-1.5"
                      title={t("imageEditor.shortcutAnnotate")}
                    >
                      <MessageSquare className="w-4 h-4" />
                      {t("imageEditor.modeAnnotate")}
                    </Button>
                    <Button
                      variant={mode === "pin" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setMode("pin")}
                      className="gap-1.5"
                      title={t("imageEditor.shortcutPin")}
                    >
                      <MapPin className="w-4 h-4" />
                      {t("imageEditor.modePin")}
                    </Button>
                    <Button
                      variant={mode === "arrow" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setMode("arrow")}
                      className="gap-1.5"
                      title={t("imageEditor.shortcutArrow")}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      {t("imageEditor.modeArrow")}
                    </Button>
                  </>
                )}
              </div>

              <Button
                variant={showAllNotes ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setShowAllNotes((v) => {
                    if (!v) setHoveredAnnotation(null)
                    return !v
                  })
                }}
                disabled={annotationsWithNotes.length === 0}
                className="gap-1.5"
                title={t("imageEditor.showNotesTitle")}
              >
                <Tags className="w-4 h-4" />
                {showAllNotes ? t("imageEditor.hideNotes") : t("imageEditor.showNotes")}
              </Button>

              {/* Zoom controls */}
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="w-8 h-8" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="flex items-center justify-center w-12 text-sm">{Math.round(zoom * 100)}%</span>
                <Button variant="outline" size="icon" className="w-8 h-8" onClick={() => setZoom((z) => Math.min(3, z + 0.25))}>
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="w-8 h-8" onClick={() => setZoom(1)}>
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Color picker for highlight, note, and pin modes */}
          {(mode === "highlight" || mode === "annotate" || mode === "pin" || mode === "arrow") && (
            <div className="flex items-center gap-3 mt-3">
              <span className="text-sm text-muted-foreground">{t("imageEditor.highlightColor")}</span>
              <div className="flex gap-1.5">
                {HIGHLIGHT_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setSelectedColor(color)}
                    className={`w-7 h-7 rounded-md border-2 transition-all ${
                      selectedColor.value === color.value
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          )}
        </DialogHeader>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Canvas area */}
          <div
            ref={containerRef}
            className="relative min-w-0 flex-1 overflow-auto bg-secondary/20 p-4"
          >
            <div className="flex items-center justify-center min-h-full">
              <div
                className="relative inline-block"
                style={{ width: displayWidth, height: displayHeight }}
              >
                <canvas
                  ref={canvasRef}
                  className="block rounded-lg border border-border shadow-lg"
                  style={{
                    width: displayWidth,
                    height: displayHeight,
                    cursor: mode === "view" ? "pointer" : "crosshair",
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={() => {
                    if (isDrawing) handleMouseUp()
                    if (mode === "view" && !showAllNotes) setHoveredAnnotation(null)
                  }}
                />

                {showAllNotes &&
                  noteLabels.map(({ annotation, idx, finalTop, centerX }) =>
                    renderAnnotationNoteBubble(annotation, idx, centerX, finalTop)
                  )}

                {!showAllNotes &&
                  hoveredAnnotation &&
                  renderAnnotationNoteBubble(
                    hoveredAnnotation,
                    image.annotations.findIndex((a) => a.id === hoveredAnnotation.id),
                    (hoveredAnnotation.x + hoveredAnnotation.width / 2) * canvasDisplayScale,
                    hoveredAnnotation.y * canvasDisplayScale,
                    50
                  )}
              </div>
            </div>
          </div>

          {/* Side panel */}
          <div className="flex w-72 shrink-0 flex-col border-r border-border bg-card sm:w-80">
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Selected annotation note editor */}
                {selectedAnnotation && (
                  <Card className="border-primary">
                    <CardHeader className="p-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Edit3 className="w-4 h-4" />
                          {selectedAnnotation.id === "temp"
                            ? selectedAnnotation.kind === "pin"
                              ? t("imageEditor.newPinNote")
                              : t("imageEditor.newNote")
                            : t("imageEditor.editNote")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-3">
                      <Textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder={t("imageEditor.notePlaceholder")}
                        rows={3}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveNote} className="flex-1">
                          <Save className="w-4 h-4 ml-1" />
                          {t("common.save")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleAddNoteToLesson}
                          disabled={!noteText.trim()}
                        >
                          <StickyNote className="w-4 h-4 ml-1" />
                          {t("imageEditor.moveToNotes")}
                        </Button>
                      </div>
                      {selectedAnnotation.id !== "temp" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full"
                          onClick={() => {
                            onRemoveAnnotation(selectedAnnotation.id)
                            setSelectedAnnotation(null)
                            setHoveredAnnotation(null)
                          }}
                        >
                          <Trash2 className="w-4 h-4 ml-1" />
                          {t("imageEditor.deleteAnnotation")}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Annotations list */}
                <Card>
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Highlighter className="w-4 h-4" />
                        {t("imageEditor.annotations", { count: image.annotations.length })}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    {image.annotations.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        {t("imageEditor.noAnnotations")}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {image.annotations.map((annotation, idx) => (
                          <div
                            key={annotation.id}
                            className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                              selectedAnnotation?.id === annotation.id
                                ? "border-primary bg-primary/10"
                                : "border-border hover:bg-secondary/50"
                            }`}
                            onClick={() => {
                              setSelectedAnnotation(annotation)
                              setNoteText(annotation.note)
                              setHoveredAnnotation(annotation)
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: annotation.color }}
                              />
                              <span className="text-xs font-medium">
                                {annotationLabel(annotation, idx)}
                              </span>
                            </div>
                            {annotation.note && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {annotation.note}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* AI Analysis */}
                <Card>
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-violet-400" />
                      {t("imageEditor.aiAnalysis")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-3">
                    {!readOnly && (
                      <Button
                        onClick={() => setShowAiDialog(true)}
                        className="w-full"
                        style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
                      >
                        <Sparkles className="w-4 h-4 ml-2" />
                        {t("imageEditor.analyzeImage")}
                      </Button>
                    )}

                    {image.aiAnalysis && (
                      <ImageAnalysisResults
                        analysis={image.aiAnalysis}
                        labels={{
                          description: t("imageEditor.description"),
                          keyElements: t("imageEditor.keyElements"),
                          studyNotes: t("imageEditor.studyNotes"),
                          relatedConcepts: t("imageEditor.relatedConcepts"),
                        }}
                        t={t}
                        addToNotesLabel={t("imageEditor.moveAnalysisToNotes")}
                        onAddToNotes={() =>
                          onAddToNotes(formatAnalysisForNotes(image.aiAnalysis!, t))
                        }
                      />
                    )}

                    {!image.aiAnalysis && readOnly && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        {t("imageAi.noAnalysisYet")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>

      <ImageAiAnalyzeDialog
        open={showAiDialog}
        onOpenChange={setShowAiDialog}
        image={image}
        onSaveAnalysis={readOnly ? undefined : onSetAIAnalysis}
        onAddToNotes={onAddToNotes}
      />
    </Dialog>
  )
}
