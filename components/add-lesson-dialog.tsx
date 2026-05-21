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

interface AddLessonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (lesson: Omit<Lesson, "id" | "createdAt" | "updatedAt" | "mindMapSaved">) => void
}

export function AddLessonDialog({ open, onOpenChange, onAdd }: AddLessonDialogProps) {
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
      mindMapNodes: [],
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
          <DialogTitle>إضافة درس جديد</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">عنوان الدرس</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="أدخل عنوان الدرس"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">المادة</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="مثال: الرياضيات، الفيزياء، اللغة العربية"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">الوصف (اختياري)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف مختصر للدرس"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || !subject.trim()}>
            إضافة الدرس
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
