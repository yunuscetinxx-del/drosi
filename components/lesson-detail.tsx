"use client"

import { useState } from "react"
import { Lesson, ImageAnnotation, ImageAIAnalysis } from "@/types/lesson"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ImageUploader } from "@/components/image-uploader"
import { MindMap } from "@/components/mind-map"
import { AIAnalysis } from "@/components/ai-analysis"
import { MindMapNode } from "@/types/lesson"
import {
  FileText,
  Lightbulb,
  StickyNote,
  Image as ImageIcon,
  Network,
  Save,
  Plus,
  Trash2,
  ChevronRight,
  Sparkles,
  Check,
  AlertCircle,
} from "lucide-react"

interface LessonDetailProps {
  lesson: Lesson
  onUpdate: (id: string, updates: Partial<Lesson>) => void
  onAddImage: (lessonId: string, imageUrl: string) => void
  onRemoveImage: (lessonId: string, imageId: string) => void
  onAddImageAnnotation: (lessonId: string, imageId: string, annotation: Omit<ImageAnnotation, "id" | "createdAt">) => void
  onUpdateImageAnnotation: (lessonId: string, imageId: string, annotationId: string, updates: Partial<ImageAnnotation>) => void
  onRemoveImageAnnotation: (lessonId: string, imageId: string, annotationId: string) => void
  onSetImageAIAnalysis: (lessonId: string, imageId: string, analysis: Omit<ImageAIAnalysis, "analyzedAt">) => void
  onAddMindMapNode: (lessonId: string, node: Omit<MindMapNode, "id">) => void
  onUpdateMindMapNode: (lessonId: string, nodeId: string, updates: Partial<MindMapNode>) => void
  onDeleteMindMapNode: (lessonId: string, nodeId: string) => void
  onSaveMindMap: (lessonId: string) => void
  onClose: () => void
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
  onAddMindMapNode,
  onUpdateMindMapNode,
  onDeleteMindMapNode,
  onSaveMindMap,
  onClose,
}: LessonDetailProps) {
  const [editing, setEditing] = useState(false)
  const [editedLesson, setEditedLesson] = useState(lesson)
  const [newKeyPoint, setNewKeyPoint] = useState("")
  const [selectedModel, setSelectedModel] = useState<string>("x-ai/grok-3-mini")

  const handleSave = () => {
    onUpdate(lesson.id, {
      title: editedLesson.title,
      subject: editedLesson.subject,
      description: editedLesson.description,
      summary: editedLesson.summary,
      keyPoints: editedLesson.keyPoints,
      /** الملاحظات تُحدَّث مباشرة من تبويب الملاحظات؛ نقرأ آخر قيمة من الدرس */
      notes: lesson.notes,
    })
    setEditing(false)
  }

  const addKeyPoint = () => {
    if (newKeyPoint.trim()) {
      setEditedLesson({
        ...editedLesson,
        keyPoints: [...editedLesson.keyPoints, newKeyPoint.trim()],
      })
      setNewKeyPoint("")
    }
  }

  const removeKeyPoint = (index: number) => {
    setEditedLesson({
      ...editedLesson,
      keyPoints: editedLesson.keyPoints.filter((_, i) => i !== index),
    })
  }

  const updateKeyPoint = (index: number, text: string) => {
    setEditedLesson({
      ...editedLesson,
      keyPoints: editedLesson.keyPoints.map((p, i) => (i === index ? text : p)),
    })
  }

  const handleAddMindMapNodes = (nodes: Omit<MindMapNode, "id">[]) => {
    nodes.forEach((node) => onAddMindMapNode(lesson.id, node))
  }

  const handleAddToNotes = (text: string) => {
    const currentNotes = lesson.notes || ""
    const newNotes = currentNotes ? `${currentNotes}\n\n---\n\n${text}` : text
    onUpdate(lesson.id, { notes: newNotes })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
            <ChevronRight className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">{lesson.title}</h2>
            <Badge variant="secondary" className="mt-1">
              {lesson.subject}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditedLesson(lesson)
                  setEditing(false)
                }}
              >
                إلغاء
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="w-4 h-4 ml-2" />
                حفظ
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditedLesson(lesson)
                setEditing(true)
              }}
            >
              تعديل
            </Button>
          )}
        </div>
      </div>

      <Tabs
        defaultValue="details"
        orientation="vertical"
        dir="ltr"
        className="flex min-h-0 flex-1 flex-row gap-0 overflow-hidden"
      >
        <aside
          aria-label="أقسام الدرس"
          dir="rtl"
          className="z-20 flex w-14 shrink-0 flex-col border-e border-border bg-muted/35 backdrop-blur-sm supports-[backdrop-filter]:bg-muted/25 sm:w-52"
        >
          <TabsList className="flex h-full min-h-0 w-full flex-col items-stretch gap-0.5 rounded-none border-0 bg-transparent p-2 sm:gap-1 sm:p-2.5">
            <TabsTrigger
              value="details"
              className="inline-flex h-auto min-h-11 w-full shrink-0 flex-none flex-row items-center justify-start gap-2.5 rounded-lg border border-transparent px-2.5 py-2.5 text-start text-xs font-medium transition-colors hover:bg-muted/70 data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground sm:min-h-12 sm:text-sm"
            >
              <FileText className="size-4 shrink-0 opacity-80 sm:size-[1.05rem]" />
              <span className="min-w-0 flex-1 truncate leading-snug">التفاصيل</span>
            </TabsTrigger>
            <TabsTrigger
              value="keypoints"
              className="inline-flex h-auto min-h-11 w-full shrink-0 flex-none flex-row items-center justify-start gap-2.5 rounded-lg border border-transparent px-2.5 py-2.5 text-start text-xs font-medium transition-colors hover:bg-muted/70 data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground sm:min-h-12 sm:text-sm"
            >
              <Lightbulb className="size-4 shrink-0 opacity-80 sm:size-[1.05rem]" />
              <span className="min-w-0 flex-1 truncate leading-snug">النقاط</span>
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="inline-flex h-auto min-h-11 w-full shrink-0 flex-none flex-row items-center justify-start gap-2.5 rounded-lg border border-transparent px-2.5 py-2.5 text-start text-xs font-medium transition-colors hover:bg-muted/70 data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground sm:min-h-12 sm:text-sm"
            >
              <StickyNote className="size-4 shrink-0 opacity-80 sm:size-[1.05rem]" />
              <span className="min-w-0 flex-1 truncate leading-snug">الملاحظات</span>
            </TabsTrigger>
            <TabsTrigger
              value="images"
              className="inline-flex h-auto min-h-11 w-full shrink-0 flex-none flex-row items-center justify-start gap-2.5 rounded-lg border border-transparent px-2.5 py-2.5 text-start text-xs font-medium transition-colors hover:bg-muted/70 data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground sm:min-h-12 sm:text-sm"
            >
              <ImageIcon className="size-4 shrink-0 opacity-80 sm:size-[1.05rem]" />
              <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate leading-snug">
                <span className="truncate">الصور</span>
                {lesson.images.length > 0 && (
                  <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px] tabular-nums sm:text-xs">
                    {lesson.images.length}
                  </Badge>
                )}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="mindmap"
              className="inline-flex h-auto min-h-11 w-full shrink-0 flex-none flex-row items-center justify-start gap-2.5 rounded-lg border border-transparent px-2.5 py-2.5 text-start text-xs font-medium transition-colors hover:bg-muted/70 data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground sm:min-h-12 sm:text-sm"
            >
              <span className="relative inline-flex shrink-0">
                <Network className="size-4 opacity-80 sm:size-[1.05rem]" />
                {!lesson.mindMapSaved && lesson.mindMapNodes.length > 0 && (
                  <span className="absolute -start-0.5 -top-0.5 size-2 rounded-full bg-amber-500 ring-2 ring-muted/35 sm:-start-1" />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate leading-snug">الخريطة</span>
            </TabsTrigger>
            <TabsTrigger
              value="ai"
              className="inline-flex h-auto min-h-11 w-full shrink-0 flex-none flex-row items-center justify-start gap-2.5 rounded-lg border border-transparent px-2.5 py-2.5 text-start text-xs font-medium transition-colors hover:bg-muted/70 data-[state=active]:border-border data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground sm:min-h-12 sm:text-sm"
            >
              <Sparkles className="size-4 shrink-0 text-violet-400 sm:size-[1.05rem]" />
              <span className="min-w-0 flex-1 truncate leading-snug text-violet-300 sm:text-violet-400">
                تحليل AI
              </span>
            </TabsTrigger>
          </TabsList>
        </aside>

        <div dir="rtl" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {/* Details */}
          <TabsContent value="details" className="mt-0 flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain p-4 outline-none data-[state=inactive]:hidden">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">معلومات الدرس</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editing ? (
                  <>
                    <div className="space-y-2">
                      <Label>عنوان الدرس</Label>
                      <Input
                        value={editedLesson.title}
                        onChange={(e) => setEditedLesson({ ...editedLesson, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>المادة</Label>
                      <Input
                        value={editedLesson.subject}
                        onChange={(e) => setEditedLesson({ ...editedLesson, subject: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>الوصف</Label>
                      <Textarea
                        value={editedLesson.description}
                        onChange={(e) => setEditedLesson({ ...editedLesson, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">{lesson.description}</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">الملخص</CardTitle>
              </CardHeader>
              <CardContent>
                {editing ? (
                  <Textarea
                    value={editedLesson.summary}
                    onChange={(e) => setEditedLesson({ ...editedLesson, summary: e.target.value })}
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
                  النقاط الرئيسية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editing && (
                  <div className="flex gap-2">
                    <Input
                      value={newKeyPoint}
                      onChange={(e) => setNewKeyPoint(e.target.value)}
                      placeholder="أضف نقطة رئيسية..."
                      onKeyDown={(e) => { if (e.key === "Enter") addKeyPoint() }}
                    />
                    <Button onClick={addKeyPoint}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <ul className="space-y-3">
                  {(editing ? editedLesson.keyPoints : lesson.keyPoints).map((point, index) => (
                    <li key={index} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      {editing ? (
                        <Input
                          value={point}
                          onChange={(e) => updateKeyPoint(index, e.target.value)}
                          className="flex-1 text-sm h-9"
                          aria-label={`نقطة رئيسية ${index + 1}`}
                        />
                      ) : (
                        <span className="flex-1 text-sm">{point}</span>
                      )}
                      {editing && (
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
          <TabsContent value="notes" className="mt-0 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 outline-none data-[state=inactive]:hidden">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <StickyNote className="w-5 h-5 text-primary" />
                  الملاحظات الشخصية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  يمكنك تعديل الملاحظات في أي وقت؛ تُحفظ مع الدرس مباشرة.
                </p>
                <Textarea
                  value={lesson.notes}
                  onChange={(e) => onUpdate(lesson.id, { notes: e.target.value })}
                  placeholder="أضف ملاحظاتك هنا..."
                  rows={10}
                  className="min-h-[200px]"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Images */}
          <TabsContent value="images" className="mt-0 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 outline-none data-[state=inactive]:hidden">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  صور الدرس
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ImageUploader
                  images={lesson.images}
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
                  onAddToNotes={handleAddToNotes}
                  selectedModel={selectedModel}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mind Map */}
          <TabsContent
            value="mindmap"
            className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden p-0 outline-none data-[state=inactive]:hidden sm:p-0"
          >
            <Card className="flex min-h-0 flex-1 flex-col gap-0 border-0 bg-card py-0 shadow-none">
              <CardHeader className="shrink-0 space-y-0 border-b border-border px-4 py-3 pb-3">
                <CardTitle className="flex items-center justify-between text-lg">
                  <span className="flex items-center gap-2">
                    <Network className="h-5 w-5 text-primary" />
                    الخريطة الذهنية
                  </span>
                  <div className="flex items-center gap-2">
                    {lesson.mindMapSaved ? (
                      <Badge variant="secondary" className="gap-1">
                        <Check className="h-3 w-3" />
                        محفوظة
                      </Badge>
                    ) : lesson.mindMapNodes.length > 0 ? (
                      <Badge variant="outline" className="gap-1 border-amber-500 text-amber-500">
                        <AlertCircle className="h-3 w-3" />
                        تغييرات غير محفوظة
                      </Badge>
                    ) : null}
                    <Button
                      size="sm"
                      onClick={() => onSaveMindMap(lesson.id)}
                      disabled={lesson.mindMapSaved}
                    >
                      <Save className="ml-1 h-4 w-4" />
                      حفظ الخريطة
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-3 pt-0">
                <MindMap
                  nodes={lesson.mindMapNodes}
                  onAddNode={(node) => onAddMindMapNode(lesson.id, node)}
                  onUpdateNode={(nodeId, updates) => onUpdateMindMapNode(lesson.id, nodeId, updates)}
                  onDeleteNode={(nodeId) => onDeleteMindMapNode(lesson.id, nodeId)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Analysis */}
          <TabsContent
            value="ai"
            className="mt-0 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 outline-none data-[state=inactive]:hidden"
          >
            <AIAnalysis
              lesson={lesson}
              onAddMindMapNodes={handleAddMindMapNodes}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
