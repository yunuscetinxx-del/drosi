"use client"

import { useState } from "react"
import { Lesson } from "@/types/lesson"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useTranslations } from "@/components/locale-provider"

interface AddLessonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (lesson: Omit<Lesson, "id" | "createdAt" | "updatedAt">) => void
}

export function AddLessonDialog({ open, onOpenChange, onAdd }: AddLessonDialogProps) {
  const { t } = useTranslations()
  const [title, setTitle] = useState("")
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")

  const handleSubmit = () => {
    if (!title.trim() || !subject.trim()) return

    onAdd({
      title: title.trim(),
      subject: subject.trim(),
      description: description.trim(),
      summary: "",
      keyPoints: [],
      notes: "",
      images: [],
      wordPages: [],
      mindMaps: [],
    })

    setTitle("")
    setSubject("")
    setDescription("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card">
        <DialogHeader>
          <DialogTitle>{t("addLesson.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t("addLesson.lessonTitle")}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("addLesson.lessonTitlePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">{t("addLesson.subject")}</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("addLesson.subjectPlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t("addLesson.description")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("addLesson.descriptionPlaceholder")}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || !subject.trim()}>
            {t("addLesson.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
