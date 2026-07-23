"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { ImageAIAnalysis, LessonImage } from "@/types/lesson"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ImageAnalysisResults, formatAnalysisForNotes } from "@/components/image-analysis-results"
import { requestImageAnalysis } from "@/lib/analyze-image-client"
import { useTranslations } from "@/components/locale-provider"
import { cn } from "@/lib/utils"
import { Brain, ImagePlus, Loader2, Sparkles, Upload } from "lucide-react"

type SourceMode = "lesson" | "upload"

interface ImageAiAnalyzerProps {
  images: LessonImage[]
  readOnly?: boolean
  onSetAIAnalysis?: (imageId: string, analysis: Omit<ImageAIAnalysis, "analyzedAt">) => void
  onAddImageWithAnalysis?: (
    imageUrl: string,
    analysis: Omit<ImageAIAnalysis, "analyzedAt">
  ) => void
  onAddToNotes: (text: string) => void
}

export function ImageAiAnalyzer({
  images,
  readOnly = false,
  onSetAIAnalysis,
  onAddImageWithAnalysis,
  onAddToNotes,
}: ImageAiAnalyzerProps) {
  const { t } = useTranslations()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [sourceMode, setSourceMode] = useState<SourceMode>("lesson")
  const [selectedImageId, setSelectedImageId] = useState<string>("")
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [instructions, setInstructions] = useState("")
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Omit<ImageAIAnalysis, "analyzedAt"> | null>(null)

  useEffect(() => {
    if (images.length === 0) {
      setSourceMode("upload")
      setSelectedImageId("")
      return
    }
    if (!selectedImageId || !images.some((img) => img.id === selectedImageId)) {
      setSelectedImageId(images[0].id)
    }
  }, [images, selectedImageId])

  const selectedLessonImage = images.find((img) => img.id === selectedImageId) ?? null
  const activeImageUrl =
    sourceMode === "lesson" ? selectedLessonImage?.url ?? null : uploadPreview

  const resultLabels = {
    description: t("imageEditor.description"),
    keyElements: t("imageEditor.keyElements"),
    studyNotes: t("imageEditor.studyNotes"),
    relatedConcepts: t("imageEditor.relatedConcepts"),
  }

  const handleUpload = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setUploadPreview(event.target.result)
        setResult(null)
        setError(null)
      }
    }
    reader.readAsDataURL(file)
  }, [])

  const handleAnalyze = async () => {
    if (!activeImageUrl) {
      setError(t("imageAi.noImageSelected"))
      return
    }

    setAnalyzing(true)
    setError(null)
    setResult(null)

    try {
      const response = await requestImageAnalysis(activeImageUrl, instructions || "Describe the image in German at B1 level.", {
        mode: "school",
        subject: "Deutsch",
        level: "B1",
        subjectMode: "manual",
      })

      if (!response.ok) {
        setError(response.error)
        return
      }

      setResult(response.analysis)

      if (sourceMode === "lesson" && selectedImageId && onSetAIAnalysis) {
        onSetAIAnalysis(selectedImageId, response.analysis)
      }
    } catch {
      setError(t("aiAnalysis.errorConnection"))
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSaveUploadToLesson = () => {
    if (!uploadPreview || !result || !onAddImageWithAnalysis) return
    onAddImageWithAnalysis(uploadPreview, result)
    setUploadPreview(null)
    setSourceMode("lesson")
  }

  if (readOnly) return null

  return (
    <Card className="border-violet-500/20 bg-gradient-to-br from-card to-violet-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-5 w-5 text-violet-400" />
          {t("imageAi.title")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t("imageAi.subtitle")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={sourceMode === "lesson" ? "default" : "outline"}
            disabled={images.length === 0}
            onClick={() => setSourceMode("lesson")}
          >
            {t("imageAi.fromLesson")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={sourceMode === "upload" ? "default" : "outline"}
            onClick={() => setSourceMode("upload")}
          >
            <Upload className="me-1 h-3.5 w-3.5" />
            {t("imageAi.uploadNew")}
          </Button>
        </div>

        {sourceMode === "lesson" ? (
          <div className="space-y-2">
            <Label>{t("imageAi.pickImage")}</Label>
            {images.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("imageAi.noLessonImages")}</p>
            ) : (
              <Select value={selectedImageId} onValueChange={setSelectedImageId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {images.map((img, index) => (
                    <SelectItem key={img.id} value={img.id}>
                      {t("imageAi.imageOption", { n: index + 1 })}
                      {img.aiAnalysis ? ` · ${t("imageAi.alreadyAnalyzed")}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedLessonImage && (
              <img
                src={selectedLessonImage.url}
                alt=""
                className="max-h-40 w-full rounded-lg border border-border object-contain bg-muted/30"
              />
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Label>{t("imageAi.uploadImage")}</Label>
            <div
              className={cn(
                "cursor-pointer rounded-lg border border-dashed border-border p-4 text-center transition-colors hover:border-primary/40",
                uploadPreview && "border-solid"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUpload(file)
                  e.target.value = ""
                }}
              />
              {uploadPreview ? (
                <img
                  src={uploadPreview}
                  alt=""
                  className="mx-auto max-h-40 rounded-md object-contain"
                />
              ) : (
                <>
                  <ImagePlus className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{t("imageAi.uploadHint")}</p>
                </>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="image-ai-instructions">{t("imageAi.instructionsLabel")}</Label>
          <Textarea
            id="image-ai-instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder={t("imageAi.instructionsPlaceholder")}
            rows={4}
            className="resize-y text-sm"
          />
          <p className="text-[11px] text-muted-foreground">{t("imageAi.instructionsHint")}</p>
        </div>

        <Button
          className="w-full"
          disabled={analyzing || !activeImageUrl}
          onClick={() => void handleAnalyze()}
          style={{ background: analyzing ? undefined : "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
        >
          {analyzing ? (
            <>
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
              {t("imageEditor.analyzing")}
            </>
          ) : (
            <>
              <Brain className="me-2 h-4 w-4" />
              {t("imageAi.analyzeButton")}
            </>
          )}
        </Button>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {result && (
          <div className="space-y-3 rounded-lg border border-border bg-card/80 p-3">
            {sourceMode === "lesson" && onSetAIAnalysis && (
              <p className="text-xs text-emerald-500">{t("imageAi.savedToImage")}</p>
            )}
            {sourceMode === "upload" && onAddImageWithAnalysis && (
              <Button type="button" size="sm" variant="outline" onClick={handleSaveUploadToLesson}>
                <ImagePlus className="me-1 h-3.5 w-3.5" />
                {t("imageAi.addToLessonWithAnalysis")}
              </Button>
            )}
            <ImageAnalysisResults
              analysis={result}
              labels={resultLabels}
              t={t}
              addToNotesLabel={t("imageEditor.moveAnalysisToNotes")}
              onAddToNotes={() => onAddToNotes(formatAnalysisForNotes(result, t))}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
