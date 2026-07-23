"use client"

import { useCallback, useRef, useState } from "react"
import type { AiImageNote, ImageAIAnalysis, ImageAnnotation, LessonImage } from "@/types/lesson"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ImagePlus, X, Upload, Edit3, Sparkles, MessageSquare } from "lucide-react"
import { ImageEditor } from "@/components/image-editor"
import { ImageAiAnalyzeDialog } from "@/components/image-ai-analyze-dialog"
import { useTranslations } from "@/components/locale-provider"

interface ImageUploaderProps {
  images: LessonImage[]
  readOnly?: boolean
  onAddImage: (imageUrl: string) => void
  onRemoveImage: (imageId: string) => void
  onAddAnnotation: (imageId: string, annotation: Omit<ImageAnnotation, "id" | "createdAt">) => ImageAnnotation
  onUpdateAnnotation: (imageId: string, annotationId: string, updates: Partial<ImageAnnotation>) => void
  onRemoveAnnotation: (imageId: string, annotationId: string) => void
  onSetAIAnalysis: (imageId: string, analysis: Omit<ImageAIAnalysis, "analyzedAt">) => void
  onSetAiImageNote: (imageId: string, note: AiImageNote) => void
  onAddToNotes: (text: string) => void
}

export function ImageUploader({
  images,
  readOnly = false,
  onAddImage,
  onRemoveImage,
  onAddAnnotation,
  onUpdateAnnotation,
  onRemoveAnnotation,
  onSetAIAnalysis,
  onSetAiImageNote,
  onAddToNotes,
}: ImageUploaderProps) {
  const { t } = useTranslations()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editingImageId, setEditingImageId] = useState<string | null>(null)
  const [analyzeImageId, setAnalyzeImageId] = useState<string | null>(null)

  // نحتفظ بآخر نسخة معروفة من الصورة المفتوحة حالياً. هذا يمنع إغلاق نافذة التعديل/التحليل
  // بشكل مفاجئ في حال حدث تحديث عابر لمصفوفة الصور (مثلاً أثناء الحفظ التلقائي) لم تحتوِ
  // مؤقتاً على هذا المعرّف — بدل الاعتماد فقط على نتيجة .find() في كل رندر.
  const lastEditingImageRef = useRef<LessonImage | null>(null)
  const lastAnalyzeImageRef = useRef<LessonImage | null>(null)

  const foundEditingImage = editingImageId
    ? images.find((img) => img.id === editingImageId) ?? null
    : null
  if (foundEditingImage) lastEditingImageRef.current = foundEditingImage
  const editingImage = editingImageId
    ? foundEditingImage ?? lastEditingImageRef.current
    : null

  const foundAnalyzeImage = analyzeImageId
    ? images.find((img) => img.id === analyzeImageId) ?? null
    : null
  if (foundAnalyzeImage) lastAnalyzeImageRef.current = foundAnalyzeImage
  const analyzeImage = analyzeImageId
    ? foundAnalyzeImage ?? lastAnalyzeImageRef.current
    : null

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files) return

      Array.from(files).forEach((file) => {
        if (file.type.startsWith("image/")) {
          const reader = new FileReader()
          reader.onload = (event) => {
            if (event.target?.result) {
              onAddImage(event.target.result as string)
            }
          }
          reader.readAsDataURL(file)
        }
      })

      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    },
    [onAddImage]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const files = e.dataTransfer.files

      Array.from(files).forEach((file) => {
        if (file.type.startsWith("image/")) {
          const reader = new FileReader()
          reader.onload = (event) => {
            if (event.target?.result) {
              onAddImage(event.target.result as string)
            }
          }
          reader.readAsDataURL(file)
        }
      })
    },
    [onAddImage]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="cursor-pointer rounded-xl border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="mb-2 text-muted-foreground">{t("imageUploader.dropHint")}</p>
          <p className="text-xs text-muted-foreground">{t("imageUploader.formats")}</p>
        </div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {images.map((image) => (
            <div
              key={image.id}
              className="group relative overflow-hidden rounded-lg border border-border bg-card"
            >
              <img
                src={image.url}
                alt={t("imageUploader.lessonImageAlt")}
                className="h-32 w-full cursor-pointer object-cover"
                onClick={() => setEditingImageId(image.id)}
              />

              <div className="absolute end-2 top-2 flex gap-1">
                {image.annotations.length > 0 && (
                  <Badge variant="secondary" className="bg-amber-500/80 text-xs text-white">
                    <MessageSquare className="ms-1 h-3 w-3" />
                    {image.annotations.length}
                  </Badge>
                )}
                {image.aiAnalysis && (
                  <Badge variant="secondary" className="bg-violet-500/80 text-xs text-white">
                    <Sparkles className="h-3 w-3" />
                  </Badge>
                )}
              </div>

              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingImageId(image.id)
                  }}
                >
                  <Edit3 className="ms-1 h-4 w-4" />
                  {t("common.open")}
                </Button>
                {!readOnly && (
                  <>
                    <Button
                      size="sm"
                      className="bg-violet-600 text-white hover:bg-violet-500"
                      onClick={(e) => {
                        e.stopPropagation()
                        setAnalyzeImageId(image.id)
                      }}
                    >
                      <Sparkles className="ms-1 h-4 w-4" />
                      AI
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoveImage(image.id)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>

              {image.annotations.length > 0 && (
                <div className="border-t border-border p-2">
                  <p className="truncate text-xs text-muted-foreground">
                    {image.annotations[0].note || t("imageUploader.highlightNoNote")}
                    {image.annotations.length > 1 && ` (+${image.annotations.length - 1})`}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className="ms-2 h-4 w-4" />
          {t("imageUploader.addImages")}
        </Button>
      )}

      {editingImage && (
        <ImageEditor
          image={editingImage}
          readOnly={readOnly}
          open={!!editingImage}
          onClose={() => setEditingImageId(null)}
          onAddAnnotation={(annotation) => onAddAnnotation(editingImage.id, annotation)}
          onUpdateAnnotation={(annotationId, updates) =>
            onUpdateAnnotation(editingImage.id, annotationId, updates)
          }
          onRemoveAnnotation={(annotationId) =>
            onRemoveAnnotation(editingImage.id, annotationId)
          }
          onSetAIAnalysis={(analysis) => onSetAIAnalysis(editingImage.id, analysis)}
          onSetAiImageNote={(note) => onSetAiImageNote(editingImage.id, note)}
          onAddToNotes={onAddToNotes}
        />
      )}

      <ImageAiAnalyzeDialog
        open={!!analyzeImage}
        onOpenChange={(open) => !open && setAnalyzeImageId(null)}
        image={analyzeImage}
        onSaveAnalysis={
          analyzeImage
            ? (analysis) => onSetAIAnalysis(analyzeImage.id, analysis)
            : undefined
        }
        onAddToNotes={onAddToNotes}
      />
    </div>
  )
}
