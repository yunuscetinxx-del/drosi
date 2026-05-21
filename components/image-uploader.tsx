"use client"

import { useCallback, useRef, ChangeEvent, useState } from "react"
import { LessonImage, ImageAnnotation, ImageAIAnalysis } from "@/types/lesson"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ImagePlus, X, Upload, Edit3, Sparkles, MessageSquare } from "lucide-react"
import { ImageEditor } from "@/components/image-editor"

interface ImageUploaderProps {
  images: LessonImage[]
  onAddImage: (imageUrl: string) => void
  onRemoveImage: (imageId: string) => void
  onAddAnnotation: (imageId: string, annotation: Omit<ImageAnnotation, "id" | "createdAt">) => void
  onUpdateAnnotation: (imageId: string, annotationId: string, updates: Partial<ImageAnnotation>) => void
  onRemoveAnnotation: (imageId: string, annotationId: string) => void
  onSetAIAnalysis: (imageId: string, analysis: Omit<ImageAIAnalysis, "analyzedAt">) => void
  onAddToNotes: (text: string) => void
  selectedModel: string
}

export function ImageUploader({
  images,
  onAddImage,
  onRemoveImage,
  onAddAnnotation,
  onUpdateAnnotation,
  onRemoveAnnotation,
  onSetAIAnalysis,
  onAddToNotes,
  selectedModel,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editingImage, setEditingImage] = useState<LessonImage | null>(null)

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
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
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
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
        <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground mb-2">اسحب الصور هنا أو اضغط للاختيار</p>
        <p className="text-xs text-muted-foreground">يدعم JPG, PNG, GIF</p>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative group rounded-lg overflow-hidden border border-border bg-card"
            >
              <img
                src={image.url}
                alt="صورة الدرس"
                className="w-full h-32 object-cover cursor-pointer"
                onClick={() => setEditingImage(image)}
              />
              
              {/* Badges overlay */}
              <div className="absolute top-2 right-2 flex gap-1">
                {image.annotations.length > 0 && (
                  <Badge variant="secondary" className="text-xs bg-amber-500/80 text-white">
                    <MessageSquare className="w-3 h-3 ml-1" />
                    {image.annotations.length}
                  </Badge>
                )}
                {image.aiAnalysis && (
                  <Badge variant="secondary" className="text-xs bg-violet-500/80 text-white">
                    <Sparkles className="w-3 h-3" />
                  </Badge>
                )}
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingImage(image)
                  }}
                >
                  <Edit3 className="w-4 h-4 ml-1" />
                  فتح
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemoveImage(image.id)
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Annotations preview */}
              {image.annotations.length > 0 && (
                <div className="p-2 border-t border-border">
                  <p className="text-xs text-muted-foreground truncate">
                    {image.annotations[0].note || "تظليل بدون ملاحظة"}
                    {image.annotations.length > 1 && ` (+${image.annotations.length - 1})`}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Button
        variant="outline"
        className="w-full"
        onClick={() => fileInputRef.current?.click()}
      >
        <ImagePlus className="w-4 h-4 ml-2" />
        إضافة صور
      </Button>

      {/* Image Editor Dialog */}
      {editingImage && (
        <ImageEditor
          image={editingImage}
          open={!!editingImage}
          onClose={() => setEditingImage(null)}
          onAddAnnotation={(annotation) => onAddAnnotation(editingImage.id, annotation)}
          onUpdateAnnotation={(annotationId, updates) =>
            onUpdateAnnotation(editingImage.id, annotationId, updates)
          }
          onRemoveAnnotation={(annotationId) =>
            onRemoveAnnotation(editingImage.id, annotationId)
          }
          onSetAIAnalysis={(analysis) => onSetAIAnalysis(editingImage.id, analysis)}
          onAddToNotes={onAddToNotes}
          selectedModel={selectedModel}
        />
      )}
    </div>
  )
}
