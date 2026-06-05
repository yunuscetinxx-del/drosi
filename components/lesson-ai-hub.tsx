"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { Lesson, LessonImage } from "@/types/lesson"
import type { LessonAnalysisEntry, LessonChatThread } from "@/types/lesson-analysis"
import {
  appendChatMessage,
  createAnalysisEntry,
  createChatThread,
  formatAnalysisForNotes,
  getLessonAnalyses,
  getLessonChatThreads,
  sortAnalysesNewestFirst,
} from "@/lib/lesson-analysis"
import { requestImageAnalysis, requestLessonChat } from "@/lib/analyze-image-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useTranslations } from "@/components/locale-provider"
import {
  BookOpen,
  Brain,
  History,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  StickyNote,
  Upload,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface LessonAiHubProps {
  lesson: Lesson
  readOnly?: boolean
  onUpdateLesson: (updates: Partial<Lesson>) => void
  onAddToNotes: (text: string) => void
}

export function LessonAiHub({
  lesson,
  readOnly = false,
  onUpdateLesson,
  onAddToNotes,
}: LessonAiHubProps) {
  const { t } = useTranslations()
  const fileRef = useRef<HTMLInputElement>(null)
  const analyses = sortAnalysesNewestFirst(getLessonAnalyses(lesson))
  const threads = getLessonChatThreads(lesson)

  const [subject, setSubject] = useState(lesson.subject || "")
  const [level, setLevel] = useState("")
  const [subjectMode, setSubjectMode] = useState<"auto" | "manual">("auto")
  const [instructions, setInstructions] = useState("")
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [selectedImageId, setSelectedImageId] = useState("")
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(
    analyses[0]?.id ?? null
  )
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)

  useEffect(() => {
    if (lesson.images.length && !selectedImageId) {
      setSelectedImageId(lesson.images[0].id)
    }
  }, [lesson.images, selectedImageId])

  const activeAnalysis = analyses.find((a) => a.id === activeAnalysisId) ?? analyses[0] ?? null
  const activeThread =
    threads.find((t) => t.id === activeThreadId) ??
    (activeAnalysis
      ? threads.find((t) => t.id === activeAnalysis.chatThreadId) ?? null
      : null)

  const persistAnalyses = useCallback(
    (next: LessonAnalysisEntry[], nextThreads?: LessonChatThread[]) => {
      onUpdateLesson({
        lessonAnalyses: next,
        ...(nextThreads ? { lessonChatThreads: nextThreads } : {}),
      })
    },
    [onUpdateLesson]
  )

  const handleUpload = (file: File) => {
    if (!file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = (e) => {
      if (typeof e.target?.result === "string") {
        setImageUrl(e.target.result)
        setError(null)
      }
    }
    reader.readAsDataURL(file)
  }

  const resolveImageUrl = (): string | null => {
    if (imageUrl) return imageUrl
    const img = lesson.images.find((i) => i.id === selectedImageId)
    return img?.url ?? null
  }

  const handleAnalyze = async () => {
    const url = resolveImageUrl()
    if (!url) {
      setError(t("imageAi.noImageSelected"))
      return
    }
    setAnalyzing(true)
    setError(null)
    try {
      const res = await requestImageAnalysis(url, instructions, {
        mode: "school",
        subject: subjectMode === "manual" ? subject : undefined,
        level: subjectMode === "manual" ? level : undefined,
        subjectMode,
        lessonTitle: lesson.title,
        lessonSubject: lesson.subject,
      })
      if (!res.ok) {
        setError(res.error)
        return
      }

      const title =
        res.content.detectedSubject && res.content.pageType
          ? `${res.content.detectedSubject} — ${res.content.pageType}`
          : t("aiHub.analysisTitle")

      const entry = createAnalysisEntry({
        type: "school_page",
        title,
        subject: res.content.detectedSubject || lesson.subject || subject || "عام",
        content: res.content,
        imageId: selectedImageId || undefined,
        imageUrl: url,
        level: res.content.detectedLevel,
        mode: subjectMode,
      })

      const thread = createChatThread(entry.id, `دردشة: ${title}`)
      const nextAnalyses = [entry, ...analyses]
      const nextThreads = [thread, ...threads]
      persistAnalyses(nextAnalyses, nextThreads)
      setActiveAnalysisId(entry.id)
      setActiveThreadId(thread.id)
    } catch {
      setError(t("aiAnalysis.errorConnection"))
    } finally {
      setAnalyzing(false)
    }
  }

  const handleAddAnalysisToNotes = (entry: LessonAnalysisEntry) => {
    onAddToNotes(formatAnalysisForNotes(entry))
  }

  const handleSendChat = async () => {
    const msg = chatInput.trim()
    if (!msg || readOnly) return

    let thread = activeThread
    let nextThreads = [...threads]

    if (!thread && activeAnalysis) {
      thread = threads.find((t) => t.id === activeAnalysis.chatThreadId) ?? createChatThread(
        activeAnalysis.id,
        `دردشة: ${activeAnalysis.title}`
      )
      if (!threads.some((t) => t.id === thread!.id)) {
        nextThreads = [thread, ...threads]
      }
    }
    if (!thread) {
      thread = createChatThread(undefined, t("aiHub.generalChat"))
      nextThreads = [thread, ...nextThreads]
    }

    const withUser = appendChatMessage(thread, "user", msg)
    setChatInput("")
    setChatLoading(true)
    onUpdateLesson({ lessonChatThreads: nextThreads.map((t) => (t.id === withUser.id ? withUser : t)) })
    setActiveThreadId(withUser.id)

    const res = await requestLessonChat({
      message: msg,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      lessonSubject: lesson.subject,
      analysisId: activeAnalysis?.id,
      analyses: analyses.map((a) => ({
        id: a.id,
        title: a.title,
        summary: a.summary,
        markdownReport: a.markdownReport,
        subject: a.subject,
        content: a.content,
      })),
      previousMessages: withUser.messages
        .slice(0, -1)
        .map((m) => ({ role: m.role, content: m.content })),
      topic: activeAnalysis?.content.grammarTopics?.[0],
    })

    setChatLoading(false)
    if (!res.ok) {
      setError(res.error)
      return
    }

    const withReply = appendChatMessage(withUser, "assistant", res.reply)
    onUpdateLesson({
      lessonChatThreads: nextThreads.map((t) => (t.id === withReply.id ? withReply : t)),
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      {!readOnly && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-violet-400" />
              {t("aiHub.analyzePage")}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{t("aiHub.analyzeHint")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("aiHub.subjectMode")}</Label>
                <Select
                  value={subjectMode}
                  onValueChange={(v) => setSubjectMode(v as "auto" | "manual")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{t("aiHub.autoDetect")}</SelectItem>
                    <SelectItem value="manual">{t("aiHub.manualSubject")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {subjectMode === "manual" && (
                <>
                  <div className="space-y-2">
                    <Label>{t("lesson.subject")}</Label>
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="ألمانية، رياضيات..." />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("aiHub.level")}</Label>
                    <Input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="B1، ثانوي..." />
                  </div>
                </>
              )}
            </div>

            {lesson.images.length > 0 && (
              <div className="space-y-2">
                <Label>{t("aiHub.lessonImage")}</Label>
                <Select value={selectedImageId} onValueChange={(v) => { setSelectedImageId(v); setImageUrl(null) }}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("imageAi.pickImage")} />
                  </SelectTrigger>
                  <SelectContent>
                    {lesson.images.map((img: LessonImage, i) => (
                      <SelectItem key={img.id} value={img.id}>
                        {t("imageAi.imageOption", { n: i + 1 })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleUpload(f)
              }} />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4 ml-1" />
                {t("imageAi.uploadImage")}
              </Button>
            </div>

            {resolveImageUrl() && (
              <img
                src={resolveImageUrl()!}
                alt=""
                className="max-h-48 rounded-lg border object-contain"
              />
            )}

            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={t("aiHub.instructionsPlaceholder")}
              rows={2}
            />

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="button" onClick={() => void handleAnalyze()} disabled={analyzing}>
              {analyzing ? <Loader2 className="h-4 w-4 ml-1 animate-spin" /> : <Brain className="h-4 w-4 ml-1" />}
              {t("aiHub.analyzeButton")}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            {t("aiHub.analysesHistory")}
            {analyses.length > 0 && (
              <Badge variant="secondary">{analyses.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {analyses.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("aiHub.noAnalyses")}</p>
          ) : (
            analyses.map((a) => (
              <div
                key={a.id}
                className={cn(
                  "rounded-lg border p-3 cursor-pointer transition-colors",
                  activeAnalysisId === a.id && "border-primary bg-primary/5"
                )}
                onClick={() => {
                  setActiveAnalysisId(a.id)
                  setActiveThreadId(a.chatThreadId)
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.summary}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Badge variant="outline" className="text-[10px]">{a.subject}</Badge>
                      {a.level && <Badge variant="outline" className="text-[10px]">{a.level}</Badge>}
                    </div>
                  </div>
                  {!readOnly && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAddAnalysisToNotes(a)
                      }}
                    >
                      <StickyNote className="h-3.5 w-3.5 ml-1" />
                      {t("aiHub.addToNotes")}
                    </Button>
                  )}
                </div>
                {activeAnalysisId === a.id && (
                  <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs leading-relaxed rounded-md bg-muted/50 p-3">
                    {a.markdownReport}
                  </pre>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="flex min-h-[280px] flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-4 w-4" />
            {t("aiHub.askAboutLesson")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{t("aiHub.chatHint")}</p>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3">
          <div className="flex-1 max-h-72 overflow-y-auto space-y-2 rounded-md border p-3 bg-muted/30">
            {(activeThread?.messages ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                {t("aiHub.chatEmpty")}
              </p>
            ) : (
              activeThread!.messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm max-w-[90%]",
                    m.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-card border"
                  )}
                >
                  {m.content}
                </div>
              ))
            )}
            {chatLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t("aiHub.thinking")}
              </div>
            )}
          </div>
          {!readOnly && (
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={t("aiHub.chatPlaceholder")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    void handleSendChat()
                  }
                }}
                disabled={chatLoading}
              />
              <Button type="button" onClick={() => void handleSendChat()} disabled={chatLoading || !chatInput.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
