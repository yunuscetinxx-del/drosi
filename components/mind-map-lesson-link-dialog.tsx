"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useTranslations } from "@/components/locale-provider"
import type { LessonImage, WordPage } from "@/types/lesson"
import { FileText, ImageIcon, Lightbulb } from "lucide-react"

export type MindMapLessonLinkTarget =
  | { type: "image"; id: string }
  | { type: "word"; id: string }
  | { type: "keyPoint"; index: number }
  | null

interface MindMapLessonLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  images: LessonImage[]
  wordPages: WordPage[]
  keyPoints: string[]
  current: MindMapLessonLinkTarget
  onSelect: (target: MindMapLessonLinkTarget) => void
}

export function MindMapLessonLinkDialog({
  open,
  onOpenChange,
  images,
  wordPages,
  keyPoints,
  current,
  onSelect,
}: MindMapLessonLinkDialogProps) {
  const { t } = useTranslations()

  const isActive = (target: MindMapLessonLinkTarget) => {
    if (!current && !target) return true
    if (!current || !target) return false
    if (current.type !== target.type) return false
    if (current.type === "keyPoint" && target.type === "keyPoint") {
      return current.index === target.index
    }
    if (current.type === "image" && target.type === "image") return current.id === target.id
    if (current.type === "word" && target.type === "word") return current.id === target.id
    return false
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("mindMap.linkToLessonTitle")}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">{t("mindMap.linkToLessonHint")}</p>

        <Button
          type="button"
          variant={!current ? "secondary" : "outline"}
          className="w-full justify-start"
          onClick={() => {
            onSelect(null)
            onOpenChange(false)
          }}
        >
          {t("mindMap.unlinkLesson")}
        </Button>

        {keyPoints.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{t("lesson.tabKeyPoints")}</p>
            {keyPoints.map((point, index) => (
              <Button
                key={index}
                type="button"
                variant={isActive({ type: "keyPoint", index }) ? "secondary" : "ghost"}
                className="h-auto w-full justify-start whitespace-normal py-2 text-start text-sm"
                onClick={() => {
                  onSelect({ type: "keyPoint", index })
                  onOpenChange(false)
                }}
              >
                <Lightbulb className="me-2 h-4 w-4 shrink-0" />
                <span className="line-clamp-2">{point}</span>
              </Button>
            ))}
          </div>
        )}

        {images.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{t("lesson.tabImages")}</p>
            {images.map((img, i) => (
              <Button
                key={img.id}
                type="button"
                variant={isActive({ type: "image", id: img.id }) ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => {
                  onSelect({ type: "image", id: img.id })
                  onOpenChange(false)
                }}
              >
                <ImageIcon className="me-2 h-4 w-4 shrink-0" />
                {t("mindMap.linkImageItem", { n: i + 1 })}
              </Button>
            ))}
          </div>
        )}

        {wordPages.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{t("lesson.tabWord")}</p>
            {wordPages.map((page) => (
              <Button
                key={page.id}
                type="button"
                variant={isActive({ type: "word", id: page.id }) ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => {
                  onSelect({ type: "word", id: page.id })
                  onOpenChange(false)
                }}
              >
                <FileText className="me-2 h-4 w-4 shrink-0" />
                <span className="truncate">{page.title || t("mindMap.defaultMapTitle")}</span>
              </Button>
            ))}
          </div>
        )}

        {keyPoints.length === 0 && images.length === 0 && wordPages.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("mindMap.noLessonLinksAvailable")}</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
