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
  X,
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
  Loader2,
  Brain,
  Lightbulb,
  BookOpen,
  Link2,
} from "lucide-react"

const HIGHLIGHT_COLORS = [
  { name: "أصفر", value: "#fef08a", border: "#eab308" },
  { name: "أخضر", value: "#bbf7d0", border: "#22c55e" },
  { name: "أزرق", value: "#bfdbfe", border: "#3b82f6" },
  { name: "وردي", value: "#fbcfe8", border: "#ec4899" },
  { name: "برتقالي", value: "#fed7aa", border: "#f97316" },
  { name: "بنفسجي", value: "#ddd6fe", border: "#8b5cf6" },
]

interface ImageEditorProps {
  image: LessonImage
  open: boolean
  onClose: () => void
  onAddAnnotation: (annotation: Omit<ImageAnnotation, "id" | "createdAt">) => void
  onUpdateAnnotation: (annotationId: string, updates: Partial<ImageAnnotation>) => void
  onRemoveAnnotation: (annotationId: string) => void
  onSetAIAnalysis: (analysis: Omit<ImageAIAnalysis, "analyzedAt">) => void
  onAddToNotes: (text: string) => void
  selectedModel: string
}

type EditorMode = "view" | "highlight" | "annotate"

export function ImageEditor({
  image,
  open,
  onClose,
  onAddAnnotation,
  onUpdateAnnotation,
  onRemoveAnnotation,
  onSetAIAnalysis,
  onAddToNotes,
  selectedModel,
}: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<EditorMode>("view")
  const [zoom, setZoom] = useState(1)
  const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0])
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 })
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [selectedAnnotation, setSelectedAnnotation] = useState<ImageAnnotation | null>(null)
  const [noteText, setNoteText] = useState("")
  const [analyzing, setAnalyzing] = useState(false)
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 })

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

  // Draw canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !imgDimensions.width) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const img = new window.Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      // Set canvas size
      canvas.width = imgDimensions.width
      canvas.height = imgDimensions.height

      // Clear and draw image
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)

      // Draw existing annotations
      image.annotations.forEach((annotation) => {
        const colorObj = HIGHLIGHT_COLORS.find((c) => c.value === annotation.color) || HIGHLIGHT_COLORS[0]
        
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
        ctx.fillStyle = selectedColor.value + "60"
        ctx.fillRect(currentRect.x, currentRect.y, currentRect.w, currentRect.h)
        ctx.strokeStyle = selectedColor.border
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.strokeRect(currentRect.x, currentRect.y, currentRect.w, currentRect.h)
        ctx.setLineDash([])
      }
    }
    img.src = image.url
  }, [image.url, image.annotations, currentRect, selectedColor, imgDimensions])

  useEffect(() => {
    drawCanvas()
  }, [drawCanvas])

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
    if (mode === "view") {
      // Check if clicked on an annotation
      const coords = getCanvasCoords(e)
      const clicked = image.annotations.find(
        (a) =>
          coords.x >= a.x &&
          coords.x <= a.x + a.width &&
          coords.y >= a.y &&
          coords.y <= a.y + a.height
      )
      if (clicked) {
        setSelectedAnnotation(clicked)
        setNoteText(clicked.note)
      } else {
        setSelectedAnnotation(null)
      }
      return
    }

    if (mode === "highlight" || mode === "annotate") {
      const coords = getCanvasCoords(e)
      setIsDrawing(true)
      setDrawStart(coords)
      setCurrentRect({ x: coords.x, y: coords.y, w: 0, h: 0 })
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || mode === "view") return
    const coords = getCanvasCoords(e)
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

    // Only create annotation if rectangle is big enough
    if (currentRect.w > 10 && currentRect.h > 10) {
      if (mode === "annotate") {
        // Show note input
        setSelectedAnnotation({
          id: "temp",
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
      // New annotation
      onAddAnnotation({
        x: selectedAnnotation.x,
        y: selectedAnnotation.y,
        width: selectedAnnotation.width,
        height: selectedAnnotation.height,
        color: selectedAnnotation.color,
        note: noteText,
      })
    } else {
      // Update existing
      onUpdateAnnotation(selectedAnnotation.id, { note: noteText })
    }

    setSelectedAnnotation(null)
    setNoteText("")
    setMode("view")
  }

  const handleAddNoteToLesson = () => {
    if (noteText.trim()) {
      onAddToNotes(noteText.trim())
    }
  }

  // AI Analysis
  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      const res = await fetch("/api/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: image.url, model: selectedModel }),
      })
      const data = await res.json()
      if (data.analysis) {
        onSetAIAnalysis(data.analysis)
      }
    } catch (err) {
      console.log("[v0] Image analysis error:", err)
    } finally {
      setAnalyzing(false)
    }
  }

  const maxWidth = 800
  const maxHeight = 500
  const scale = Math.min(maxWidth / imgDimensions.width, maxHeight / imgDimensions.height, 1)
  const displayWidth = imgDimensions.width * scale * zoom
  const displayHeight = imgDimensions.height * scale * zoom

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[95vw] w-[1200px] max-h-[95vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">محرر الصورة</DialogTitle>
            <div className="flex items-center gap-2">
              {/* Mode buttons */}
              <div className="flex gap-1 bg-secondary/50 p-1 rounded-lg">
                <Button
                  variant={mode === "view" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setMode("view")}
                  className="gap-1.5"
                >
                  <Eye className="w-4 h-4" />
                  عرض
                </Button>
                <Button
                  variant={mode === "highlight" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setMode("highlight")}
                  className="gap-1.5"
                >
                  <Highlighter className="w-4 h-4" />
                  تظليل
                </Button>
                <Button
                  variant={mode === "annotate" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setMode("annotate")}
                  className="gap-1.5"
                >
                  <MessageSquare className="w-4 h-4" />
                  ملاحظة
                </Button>
              </div>

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

          {/* Color picker for highlight/annotate mode */}
          {(mode === "highlight" || mode === "annotate") && (
            <div className="flex items-center gap-3 mt-3">
              <span className="text-sm text-muted-foreground">لون التظليل:</span>
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

        <div className="flex flex-1 overflow-hidden">
          {/* Canvas area */}
          <div
            ref={containerRef}
            className="flex-1 overflow-auto p-4 bg-secondary/20"
            style={{ maxHeight: "calc(95vh - 140px)" }}
          >
            <div className="flex items-center justify-center min-h-full">
              <canvas
                ref={canvasRef}
                className="border border-border rounded-lg shadow-lg"
                style={{
                  width: displayWidth,
                  height: displayHeight,
                  cursor: mode === "view" ? "default" : "crosshair",
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => {
                  if (isDrawing) handleMouseUp()
                }}
              />
            </div>
          </div>

          {/* Side panel */}
          <div className="w-80 border-r border-border flex flex-col bg-card">
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Selected annotation note editor */}
                {selectedAnnotation && (
                  <Card className="border-primary">
                    <CardHeader className="p-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Edit3 className="w-4 h-4" />
                        {selectedAnnotation.id === "temp" ? "ملاحظة جديدة" : "تعديل الملاحظة"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-3">
                      <Textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="اكتب ملاحظتك هنا..."
                        rows={3}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveNote} className="flex-1">
                          <Save className="w-4 h-4 ml-1" />
                          حفظ
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleAddNoteToLesson}
                          disabled={!noteText.trim()}
                        >
                          <StickyNote className="w-4 h-4 ml-1" />
                          نقل للملاحظات
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
                          }}
                        >
                          <Trash2 className="w-4 h-4 ml-1" />
                          حذف التظليل
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
                        التظليلات ({image.annotations.length})
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    {image.annotations.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        لا توجد تظليلات بعد. استخدم أداة التظليل أو الملاحظة لإضافة تظليلات.
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
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: annotation.color }}
                              />
                              <span className="text-xs font-medium">تظليل {idx + 1}</span>
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
                      تحليل بالذكاء الاصطناعي
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-3">
                    <Button
                      onClick={handleAnalyze}
                      disabled={analyzing}
                      className="w-full"
                      style={{ background: analyzing ? undefined : "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                          جاري التحليل...
                        </>
                      ) : (
                        <>
                          <Brain className="w-4 h-4 ml-2" />
                          تحليل الصورة
                        </>
                      )}
                    </Button>

                    {image.aiAnalysis && (
                      <div className="space-y-3 pt-2">
                        <div>
                          <h4 className="text-xs font-medium flex items-center gap-1 mb-1">
                            <BookOpen className="w-3 h-3" />
                            الوصف
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {image.aiAnalysis.description}
                          </p>
                        </div>

                        {image.aiAnalysis.keyElements.length > 0 && (
                          <div>
                            <h4 className="text-xs font-medium flex items-center gap-1 mb-1">
                              <Lightbulb className="w-3 h-3" />
                              العناصر الرئيسية
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {image.aiAnalysis.keyElements.map((el, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {el}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {image.aiAnalysis.studyNotes.length > 0 && (
                          <div>
                            <h4 className="text-xs font-medium flex items-center gap-1 mb-1">
                              <StickyNote className="w-3 h-3" />
                              ملاحظات دراسية
                            </h4>
                            <ul className="space-y-1">
                              {image.aiAnalysis.studyNotes.map((note, i) => (
                                <li key={i} className="text-xs text-muted-foreground flex gap-1">
                                  <span className="text-primary">•</span>
                                  {note}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {image.aiAnalysis.relatedConcepts.length > 0 && (
                          <div>
                            <h4 className="text-xs font-medium flex items-center gap-1 mb-1">
                              <Link2 className="w-3 h-3" />
                              مفاهيم مرتبطة
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {image.aiAnalysis.relatedConcepts.map((concept, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {concept}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            const fullText = [
                              `## تحليل الصورة`,
                              `**الوصف:** ${image.aiAnalysis!.description}`,
                              `**العناصر:** ${image.aiAnalysis!.keyElements.join("، ")}`,
                              `**ملاحظات:** ${image.aiAnalysis!.studyNotes.join(" | ")}`,
                            ].join("\n")
                            onAddToNotes(fullText)
                          }}
                        >
                          <StickyNote className="w-4 h-4 ml-1" />
                          نقل التحليل للملاحظات
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
