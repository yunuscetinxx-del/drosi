"use client"

import type { ImageAIAnalysis } from "@/types/lesson"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BookOpen, Lightbulb, Link2, StickyNote } from "lucide-react"
import { formatAnalysisForNotes } from "@/lib/image-analysis-prompt"

interface ImageAnalysisResultsProps {
  analysis: Omit<ImageAIAnalysis, "analyzedAt">
  onAddToNotes?: () => void
  addToNotesLabel: string
  labels: {
    description: string
    keyElements: string
    studyNotes: string
    relatedConcepts: string
  }
  t: (key: string, params?: Record<string, string | number>) => string
}

export function ImageAnalysisResults({
  analysis,
  onAddToNotes,
  addToNotesLabel,
  labels,
  t,
}: ImageAnalysisResultsProps) {
  return (
    <div className="space-y-3">
      <div>
        <h4 className="mb-1 flex items-center gap-1 text-xs font-medium">
          <BookOpen className="h-3 w-3" />
          {labels.description}
        </h4>
        <p className="text-xs text-muted-foreground">{analysis.description}</p>
      </div>

      {analysis.keyElements.length > 0 && (
        <div>
          <h4 className="mb-1 flex items-center gap-1 text-xs font-medium">
            <Lightbulb className="h-3 w-3" />
            {labels.keyElements}
          </h4>
          <div className="flex flex-wrap gap-1">
            {analysis.keyElements.map((el, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {el}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {analysis.studyNotes.length > 0 && (
        <div>
          <h4 className="mb-1 flex items-center gap-1 text-xs font-medium">
            <StickyNote className="h-3 w-3" />
            {labels.studyNotes}
          </h4>
          <ul className="space-y-1">
            {analysis.studyNotes.map((note, i) => (
              <li key={i} className="flex gap-1 text-xs text-muted-foreground">
                <span className="text-primary">•</span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.relatedConcepts.length > 0 && (
        <div>
          <h4 className="mb-1 flex items-center gap-1 text-xs font-medium">
            <Link2 className="h-3 w-3" />
            {labels.relatedConcepts}
          </h4>
          <div className="flex flex-wrap gap-1">
            {analysis.relatedConcepts.map((concept, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {concept}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {onAddToNotes && (
        <Button size="sm" variant="outline" className="w-full" onClick={onAddToNotes}>
          <StickyNote className="ms-1 h-4 w-4" />
          {addToNotesLabel}
        </Button>
      )}
    </div>
  )
}

export { formatAnalysisForNotes }
