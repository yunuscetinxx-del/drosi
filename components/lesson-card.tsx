"use client"

import { Lesson } from "@/types/lesson"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2, Image as ImageIcon, Network, FileText } from "lucide-react"

interface LessonCardProps {
  lesson: Lesson
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
}

export function LessonCard({ lesson, isSelected, onSelect, onDelete }: LessonCardProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(date))
  }

  return (
    <Card
      className={`cursor-pointer transition-all hover:border-primary/50 ${
        isSelected ? "border-primary bg-primary/5" : "bg-card border-border"
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate mb-1">{lesson.title}</h3>
            <Badge variant="secondary" className="mb-2">
              {lesson.subject}
            </Badge>
            {lesson.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {lesson.description}
              </p>
            )}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {lesson.keyPoints.length} نقاط
              </span>
              <span className="flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                {lesson.images.length} صور
              </span>
              <span className="flex items-center gap-1">
                <Network className="w-3 h-3" />
                {lesson.mindMapNodes.length} عقد
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        <div className="mt-3 pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground">
            آخر تحديث: {formatDate(lesson.updatedAt)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
