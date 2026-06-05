"use client"

import { useState, useEffect, useRef } from "react"
import { Lesson, ImageAnnotation, ImageAIAnalysis } from "@/types/lesson"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ImageUploader } from "@/components/image-uploader"
import { LessonAiWorkspace } from "@/components/lesson-ai-workspace"
import { prependLessonNote } from "@/lib/lesson-notes"
import { createEmptyMindMap } from "@/lib/mind-maps-utils"
import { getLessonAnalyses } from "@/lib/lesson-analysis"
import { WordEditor } from "@/components/word-editor"
import { LessonNotesPanel } from "@/components/lesson-notes-panel"
import { appendToLessonNotes, getLessonNotes } from "@/lib/lesson-notes"
import { MindMapsEditor, type MindMapsEditorHandle } from "@/components/mind-maps-editor"
import {
  FileText,
  FileType,
  Lightbulb,
  StickyNote,
  Image as ImageIcon,
  Network,
  Plus,
  Trash2,
  ChevronRight,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { useTranslations } from "@/components/locale-provider"
import { cn } from "@/lib/utils"
import { readLessonTab, writeLessonTab, type LessonTab } from "@/lib/app-navigation"

const SECTIONS_SIDEBAR_KEY = "durusi_sections_sidebar_open"

interface LessonDetailProps {
  lesson: Lesson
  onUpdate: (id: string, updates: Partial<Lesson>) => void
  onAddImage: (lessonId: string, imageUrl: string) => void
  onRemoveImage: (lessonId: string, imageId: string) => void
  onAddImageAnnotation: (lessonId: string, imageId: string, annotation: Omit<ImageAnnotation, "id" | "createdAt">) => void
  onUpdateImageAnnotation: (lessonId: string, imageId: string, annotationId: string, updates: Partial<ImageAnnotation>) => void
  onRemoveImageAnnotation: (lessonId: string, imageId: string, annotationId: string) => void
  onSetImageAIAnalysis: (lessonId: string, imageId: string, analysis: Omit<ImageAIAnalysis, "analyzedAt">) => void
  onClose: () => void
  readOnly?: boolean
}

export function LessonDetail({
  lesson,
  onUpdate,
  onAddImage,
  onRemoveImage,
  onAddImageAnnotation,
  onUpdateImageAnnotation,
  onRemoveImageAnnotation,
  onSetImageAIAnalysis,
  onClose,
  readOnly = false,
}: LessonDetailProps) {
  const { t, dir, isRtl } = useTranslations()
  const mindMapsEditorRef = useRef<MindMapsEditorHandle>(null)
  const mindMaps = lesson.mindMaps ?? []
  const [newKeyPoint, setNewKeyPoint] = useState("")
  const [sectionsOpen, setSectionsOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<LessonTab>("details")

  useEffect(() => {
    setActiveTab(readLessonTab(lesson.id))
  }, [lesson.id])

  const handleTabChange = (value: string) => {
    const tab = value as LessonTab
    setActiveTab(tab)
    writeLessonTab(lesson.id, tab)
  }

  useEffect(() => {
    try {
      const v = localStorage.getItem(SECTIONS_SIDEBAR_KEY)
      if (v === "0") setSectionsOpen(false)
      if (v === "1") setSectionsOpen(true)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(SECTIONS_SIDEBAR_KEY, sectionsOpen ? "1" : "0")
    } catch {
      /* ignore */
    }
  }, [sectionsOpen])

  const addKeyPoint = () => {
    if (!newKeyPoint.trim()) return
    onUpdate(lesson.id, { keyPoints: [...lesson.keyPoints, newKeyPoint.trim()] })
    setNewKeyPoint("")
  }

  const removeKeyPoint = (index: number) => {
    onUpdate(lesson.id, {
      keyPoints: lesson.keyPoints.filter((_, i) => i !== index),
    })
  }

  const updateKeyPoint = (index: number, text: string) => {
    onUpdate(lesson.id, {
      keyPoints: lesson.keyPoints.map((p, i) => (i === index ? text : p)),
    })
  }

  const lessonNotes = getLessonNotes(lesson)
  const lessonAnalyses = getLessonAnalyses(lesson)

  const handleAddToNotes = (text: string) => {
    onUpdate(lesson.id, { lessonNotes: appendToLessonNotes(lesson, text) })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 lg:hidden" onClick={onClose}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="min-w-0 truncate text-base font-bold sm:text-lg">{lesson.title}</h2>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {lesson.subject}
          </Badge>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        orientation="vertical"
        dir={isRtl ? "ltr" : "rtl"}
        className="flex min-h-0 flex-1 flex-row gap-0 overflow-hidden"
      >
        <div
          className={cn(
            "relative z-20 shrink-0 overflow-hidden border-e border-border bg-muted/35 backdrop-blur-sm transition-[width] duration-300 ease-in-out supports-[backdrop-filter]:bg-muted/25",
            sectionsOpen ? "w-14 sm:w-52" : "w-0 border-e-0"
          )}
        >
          <aside
            id="lesson-sections-sidebar"
            aria-label={t("lesson.sectionsLabel")}
            aria-hidden={!sectionsOpen}
            dir={dir}
            className="flex h-full w-14 shrink-0 flex-col sm:w-52"
          >
            <TabsList className="flex h-full min-h-0 w-full flex-col items-stretch gap-0.5 rounded-none border-0 bg-transparent p-2 sm:gap-1 sm:p-2.5">
            <TabsTrigger
              value="details"
              className="inline-flex h-auto min-h-11 w-full shrink-0 flex-none flex-row items-center justify-start gap-2.5 rounded-lg border border-transparent px-2.5 py-2.5 text-start text-xs font-medium transition-colors hover:bg-muted/70 data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground sm:min-h-12 sm:text-sm"
            >
              <FileText className="size-4 shrink-0 opacity-80 sm:size-[1.05rem]" />
              <span className="min-w-0 flex-1 truncate leading-snug">{t("lesson.tabDetails")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="keypoints"
              className="inline-flex h-auto min-h-11 w-full shrink-0 flex-none flex-row items-center justify-start gap-2.5 rounded-lg border border-transparent px-2.5 py-2.5 text-start text-xs font-medium transition-colors hover:bg-muted/70 data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground sm:min-h-12 sm:text-sm"
            >
              <Lightbulb className="size-4 shrink-0 opacity-80 sm:size-[1.05rem]" />
              <span className="min-w-0 flex-1 truncate leading-snug">{t("lesson.tabKeyPoints")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="inline-flex h-auto min-h-11 w-full shrink-0 flex-none flex-row items-center justify-start gap-2.5 rounded-lg border border-transparent px-2.5 py-2.5 text-start text-xs font-medium transition-colors hover:bg-muted/70 data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground sm:min-h-12 sm:text-sm"
            >
              <StickyNote className="size-4 shrink-0 opacity-80 sm:size-[1.05rem]" />
              <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate leading-snug">
                <span className="truncate">{t("lesson.tabNotes")}</span>
                {lessonNotes.length > 0 && (
                  <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px] tabular-nums sm:text-xs">
                    {lessonNotes.length}
                  </Badge>
                )}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="images"
              className="inline-flex h-auto min-h-11 w-full shrink-0 flex-none flex-row items-center justify-start gap-2.5 rounded-lg border border-transparent px-2.5 py-2.5 text-start text-xs font-medium transition-colors hover:bg-muted/70 data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground sm:min-h-12 sm:text-sm"
            >
              <ImageIcon className="size-4 shrink-0 opacity-80 sm:size-[1.05rem]" />
              <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate leading-snug">
                <span className="truncate">{t("lesson.tabImages")}</span>
                {lesson.images.length > 0 && (
                  <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px] tabular-nums sm:text-xs">
                    {lesson.images.length}
                  </Badge>
                )}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="word"
              className="inline-flex h-auto min-h-11 w-full shrink-0 flex-none flex-row items-center justify-start gap-2.5 rounded-lg border border-transparent px-2.5 py-2.5 text-start text-xs font-medium transition-colors hover:bg-muted/70 data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground sm:min-h-12 sm:text-sm"
            >
              <FileType className="size-4 shrink-0 text-blue-500 opacity-90 sm:size-[1.05rem]" />
              <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate leading-snug">
                <span className="truncate">{t("lesson.tabWord")}</span>
                {(lesson.wordPages?.length ?? 0) > 0 && (
                  <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px] tabular-nums sm:text-xs">
                    {(lesson.wordPages ?? []).length}
                  </Badge>
                )}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="mindmap"
              className="inline-flex h-auto min-h-11 w-full shrink-0 flex-none flex-row items-center justify-start gap-2.5 rounded-lg border border-transparent px-2.5 py-2.5 text-start text-xs font-medium transition-colors hover:bg-muted/70 data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground sm:min-h-12 sm:text-sm"
            >
              <Network className="size-4 shrink-0 opacity-80 sm:size-[1.05rem]" />
              <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate leading-snug">
                <span className="truncate">{t("lesson.tabMindMap")}</span>
                {mindMaps.length > 0 && (
                  <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px] tabular-nums sm:text-xs">
                    {mindMaps.length}
                  </Badge>
                )}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="ai"
              className="inline-flex h-auto min-h-11 w-full shrink-0 flex-none flex-row items-center justify-start gap-2.5 rounded-lg border border-transparent px-2.5 py-2.5 text-start text-xs font-medium transition-colors hover:bg-muted/70 data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground sm:min-h-12 sm:text-sm"
            >
              <Sparkles className="size-4 shrink-0 text-violet-400 sm:size-[1.05rem]" />
              <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate leading-snug text-violet-300 sm:text-violet-400">
                <span className="truncate">{t("lesson.tabAi")}</span>
                {lessonAnalyses.length > 0 && (
                  <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px] tabular-nums sm:text-xs">
                    {lessonAnalyses.length}
                  </Badge>
                )}
              </span>
            </TabsTrigger>
          </TabsList>
          </aside>
        </div>

        <div className="relative z-30 flex w-0 shrink-0 self-stretch pointer-events-none">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="pointer-events-auto absolute top-1/2 left-1/2 h-11 w-7 -translate-x-1/2 -translate-y-1/2 rounded-md border border-border bg-card shadow-md"
            aria-expanded={sectionsOpen}
            aria-controls="lesson-sections-sidebar"
            title={sectionsOpen ? t("lesson.hideSections") : t("lesson.showSections")}
            onClick={() => setSectionsOpen((v) => !v)}
          >
            {sectionsOpen ? (
              <PanelLeftClose className="h-4 w-4" aria-hidden />
            ) : (
              <PanelLeftOpen className="h-4 w-4" aria-hidden />
            )}
          </Button>
        </div>

        <div dir={dir} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {/* Details */}
          <TabsContent value="details" className="mt-0 flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain p-4 outline-none data-[state=inactive]:hidden">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">{t("lesson.lessonInfo")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!readOnly ? (
                  <>
                    <div className="space-y-2">
                      <Label>{t("lesson.lessonTitle")}</Label>
                      <Input
                        value={lesson.title}
                        onChange={(e) => onUpdate(lesson.id, { title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("lesson.subject")}</Label>
                      <Input
                        value={lesson.subject}
                        onChange={(e) => onUpdate(lesson.id, { subject: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("lesson.description")}</Label>
                      <Textarea
                        value={lesson.description}
                        onChange={(e) => onUpdate(lesson.id, { description: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{t("lesson.detailsEditHint")}</p>
                  </>
                ) : (
                  <p className="text-muted-foreground">{lesson.description}</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">{t("lesson.summary")}</CardTitle>
              </CardHeader>
              <CardContent>
                {!readOnly ? (
                  <Textarea
                    value={lesson.summary}
                    onChange={(e) => onUpdate(lesson.id, { summary: e.target.value })}
                    rows={4}
                  />
                ) : (
                  <p className="text-muted-foreground leading-relaxed">{lesson.summary}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Key Points */}
          <TabsContent value="keypoints" className="mt-0 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 outline-none data-[state=inactive]:hidden">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  {t("lesson.keyPointsTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!readOnly && (
                  <div className="flex gap-2">
                    <Input
                      value={newKeyPoint}
                      onChange={(e) => setNewKeyPoint(e.target.value)}
                      placeholder={t("lesson.addKeyPointPlaceholder")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addKeyPoint()
                      }}
                    />
                    <Button onClick={addKeyPoint}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <ul className="space-y-3">
                  {lesson.keyPoints.map((point, index) => (
                    <li key={index} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      {!readOnly ? (
                        <Input
                          value={point}
                          onChange={(e) => updateKeyPoint(index, e.target.value)}
                          className="flex-1 text-sm h-9"
                          aria-label={t("lesson.keyPointAria", { index: index + 1 })}
                        />
                      ) : (
                        <span className="flex-1 text-sm">{point}</span>
                      )}
                      {!readOnly && (
                        <Button variant="ghost" size="icon" onClick={() => removeKeyPoint(index)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notes */}
          <TabsContent
            value="notes"
            className="mt-0 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-0 outline-none data-[state=inactive]:hidden"
          >
            <LessonNotesPanel
              notes={lessonNotes}
              readOnly={readOnly}
              onNotesChange={(next) => onUpdate(lesson.id, { lessonNotes: next })}
            />
          </TabsContent>

          {/* Images */}
          <TabsContent value="images" className="mt-0 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 outline-none data-[state=inactive]:hidden">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  {t("lesson.lessonImages")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ImageUploader
                  images={lesson.images}
                  readOnly={readOnly}
                  onAddImage={(url) => onAddImage(lesson.id, url)}
                  onRemoveImage={(imageId) => onRemoveImage(lesson.id, imageId)}
                  onAddAnnotation={(imageId, annotation) =>
                    onAddImageAnnotation(lesson.id, imageId, annotation)
                  }
                  onUpdateAnnotation={(imageId, annotationId, updates) =>
                    onUpdateImageAnnotation(lesson.id, imageId, annotationId, updates)
                  }
                  onRemoveAnnotation={(imageId, annotationId) =>
                    onRemoveImageAnnotation(lesson.id, imageId, annotationId)
                  }
                  onSetAIAnalysis={(imageId, analysis) =>
                    onSetImageAIAnalysis(lesson.id, imageId, analysis)
                  }
                  onAddToNotes={readOnly ? () => {} : handleAddToNotes}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Word */}
          <TabsContent
            value="word"
            className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden p-0 outline-none data-[state=inactive]:hidden"
          >
            <WordEditor
              pages={lesson.wordPages ?? []}
              images={lesson.images}
              readOnly={readOnly}
              onPagesChange={(wordPages) => onUpdate(lesson.id, { wordPages })}
            />
          </TabsContent>

          {/* Mind Map */}
          <TabsContent
            value="mindmap"
            className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden p-0 outline-none data-[state=inactive]:hidden sm:p-0"
          >
            <MindMapsEditor
              ref={mindMapsEditorRef}
              lessonId={lesson.id}
              lessonTitle={lesson.title}
              lessonSubject={lesson.subject}
              keyPoints={lesson.keyPoints}
              summary={lesson.summary}
              images={lesson.images}
              wordPages={lesson.wordPages ?? []}
              maps={mindMaps}
              folders={lesson.mindMapFolders ?? []}
              readOnly={readOnly}
              onMapsChange={(next) => onUpdate(lesson.id, { mindMaps: next })}
              onFoldersChange={
                readOnly
                  ? undefined
                  : (mindMapFolders) => onUpdate(lesson.id, { mindMapFolders })
              }
              onOpenLessonTab={(tab) => {
                setActiveTab(tab)
                writeLessonTab(lesson.id, tab)
              }}
            />
          </TabsContent>

          {/* AI — تحليل صفحات مدرسية + سجل + دردشة */}
          <TabsContent
            value="ai"
            className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden outline-none data-[state=inactive]:hidden"
          >
            <LessonAiWorkspace
              lesson={lesson}
              readOnly={readOnly}
              onUpdateLesson={(updates) => onUpdate(lesson.id, updates)}
              onAddNote={
                readOnly
                  ? () => {}
                  : (title, content) =>
                      onUpdate(lesson.id, {
                        lessonNotes: prependLessonNote(lesson, title, content),
                      })
              }
              onCreateMindMap={
                readOnly
                  ? () => {}
                  : (title, nodes) => {
                      const map = {
                        ...createEmptyMindMap(title),
                        nodes,
                        saved: true,
                      }
                      onUpdate(lesson.id, {
                        mindMaps: [map, ...(lesson.mindMaps ?? [])],
                      })
                    }
              }
              onAddToActiveMindMap={
                readOnly
                  ? () => {}
                  : (nodes) => mindMapsEditorRef.current?.addNodesToActive(nodes)
              }
              onOpenMindMapTab={() => {
                setActiveTab("mindmap")
                writeLessonTab(lesson.id, "mindmap")
              }}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
