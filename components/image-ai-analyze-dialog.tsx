"use client"

import { useEffect, useState } from "react"
import type { ImageAIAnalysis, LessonImage } from "@/types/lesson"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ImageAnalysisResults, formatAnalysisForNotes } from "@/components/image-analysis-results"
import { requestImageAnalysis } from "@/lib/analyze-image-client"
import { useTranslations } from "@/components/locale-provider"
import { Brain, Loader2, Sparkles } from "lucide-react"

interface ImageAiAnalyzeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  image: Pick<LessonImage, "url" | "aiAnalysis"> | null
  onSaveAnalysis?: (analysis: Omit<ImageAIAnalysis, "analyzedAt">) => void
  onAddToNotes: (text: string) => void
}

export function ImageAiAnalyzeDialog({
  open,
  onOpenChange,
  image,
  onSaveAnalysis,
  onAddToNotes,
}: ImageAiAnalyzeDialogProps) {
  const { t } = useTranslations()
  const [instructions, setInstructions] = useState("")
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Omit<ImageAIAnalysis, "analyzedAt"> | null>(null)

  useEffect(() => {
    if (!open) return
    setInstructions("")
    setError(null)
    setResult(image?.aiAnalysis ?? null)
  }, [open, image?.url, image?.aiAnalysis])

  const resultLabels = {
    description: t("imageEditor.description"),
    keyElements: t("imageEditor.keyElements"),
    studyNotes: t("imageEditor.studyNotes"),
    relatedConcepts: t("imageEditor.relatedConcepts"),
  }

  const handleAnalyze = async () => {
    if (!image?.url) return

    setAnalyzing(true)
    setError(null)

    const response = await requestImageAnalysis(image.url, instructions || "Describe the image in German at B1 level.", {
      mode: "school",
      subject: "Deutsch",
      level: "B1",
      subjectMode: "manual",
    })

    setAnalyzing(false)

    if (!response.ok) {
      setError(response.error)
      return
    }

    setResult(response.analysis)
    onSaveAnalysis?.(response.analysis)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-400" />
            {t("imageEditor.aiAnalysis")}
          </DialogTitle>
          <DialogDescription>{t("imageAi.dialogHint")}</DialogDescription>
        </DialogHeader>

        {image && (
          <img
            src={image.url}
            alt=""
            className="max-h-44 w-full rounded-lg border border-border object-contain bg-muted/30"
          />
        )}

        <div className="space-y-2">
          <Label htmlFor="image-analyze-instructions">{t("imageAi.instructionsLabel")}</Label>
          <Textarea
            id="image-analyze-instructions"
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
          disabled={analyzing || !image}
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
          <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
            {onSaveAnalysis && (
              <p className="text-xs text-emerald-500">{t("imageAi.savedToImage")}</p>
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
      </DialogContent>
    </Dialog>
  )
}
