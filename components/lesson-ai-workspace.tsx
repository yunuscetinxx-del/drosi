"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Lesson, MindMapNode } from "@/types/lesson"
import type { ChatSourceScope, LessonAnalysisContent, LessonChatThread } from "@/types/lesson-analysis"
import { emptyChatSourceScope } from "@/types/lesson-analysis"
import {
  appendChatMessage,
  createAnalysisEntry,
  createChatThread,
  getLessonAnalyses,
  getLessonChatThreads,
  sortAnalysesNewestFirst,
} from "@/lib/lesson-analysis"
import { buildChatContextFromLesson } from "@/lib/lesson-chat-context"
import { buildMindMapNodesFromAiPlan, type AiMindMapPlan } from "@/lib/lesson-ai-mindmap"
import { requestImageAnalysis, requestLessonChat } from "@/lib/analyze-image-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useTranslations } from "@/components/locale-provider"
import { cn } from "@/lib/utils"
import {
  Loader2,
  Network,
  Send,
  StickyNote,
  Upload,
} from "lucide-react"

export interface LessonAiWorkspaceProps {
  lesson: Lesson
  readOnly?: boolean
  onUpdateLesson: (updates: Partial<Lesson>) => void
  onAddNote: (title: string, content: string) => void
  onCreateMindMap: (title: string, nodes: MindMapNode[]) => void
  onAddToActiveMindMap: (nodes: Omit<MindMapNode, "id">[]) => void
  onOpenMindMapTab?: () => void
}

export function LessonAiWorkspace({
  lesson,
  readOnly = false,
  onUpdateLesson,
  onAddNote,
  onCreateMindMap,
  onAddToActiveMindMap,
  onOpenMindMapTab,
}: LessonAiWorkspaceProps) {
  const { t } = useTranslations()
  const fileRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const analyses = useMemo(() => sortAnalysesNewestFirst(getLessonAnalyses(lesson)), [lesson])
  const threads = useMemo(() => getLessonChatThreads(lesson), [lesson])

  const [subjectMode] = useState<"auto" | "manual">("manual")
  const [subject] = useState("Deutsch")
  const [level] = useState("B1")
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(threads[0]?.id ?? null)
  const [creatingAiMindMap, setCreatingAiMindMap] = useState(false)

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? threads[0] ?? null
  const scope: ChatSourceScope = activeThread?.sourceScope ?? emptyChatSourceScope()

  useEffect(() => {
    if (!activeThreadId && threads[0]) setActiveThreadId(threads[0].id)
  }, [threads, activeThreadId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [activeThread?.messages.length, chatLoading])

  const persistThreads = useCallback(
    (next: LessonChatThread[]) => {
      onUpdateLesson({ lessonChatThreads: next })
    },
    [onUpdateLesson]
  )

  const handleUpload = (file: File) => {
    if (!file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = (e) => {
      if (typeof e.target?.result === "string") {
        setUploadPreview(e.target.result)
        setError(null)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleAnalyzeUpload = async (prompt = "") => {
    if (!uploadPreview) return
    setAnalyzing(true)
    setError(null)
    try {
      const res = await requestImageAnalysis(uploadPreview, prompt || "Describe the image in German at B1 level, translate important text into Arabic, and explain any grammar with an example.", {
        mode: "school",
        subject,
        level,
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
        subject: res.content.detectedSubject || lesson.subject || "عام",
        content: res.content,
        imageUrl: uploadPreview,
        level: res.content.detectedLevel,
        mode: subjectMode,
      })

      const thread = createChatThread({
        analysisId: entry.id,
        title: `${t("aiWorkspace.chatFor")} ${title}`,
        sourceScope: {
          ...emptyChatSourceScope(),
          analysisIds: [entry.id],
        },
      })

      const imageMessage = appendChatMessage(thread, "user", `📷 ${prompt || "Bitte beschreibe dieses Bild auf Deutsch B1."}`)
      const withAnalysis = appendChatMessage(imageMessage, "assistant", formatImageStudyReply(res.content))

      onUpdateLesson({
        lessonAnalyses: [entry, ...analyses],
        lessonChatThreads: [withAnalysis, ...threads],
      })
      setActiveThreadId(withAnalysis.id)
      setUploadPreview(null)
    } catch {
      setError(t("aiAnalysis.errorConnection"))
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSendChat = async () => {
    const msg = chatInput.trim()
    if (!msg || readOnly) return

    let thread = activeThread
    let list = [...threads]
    if (!thread) {
      thread = createChatThread({ sourceScope: { ...scope } })
      list = [thread, ...list]
      persistThreads(list)
      setActiveThreadId(thread.id)
    }

    const withUser = appendChatMessage(thread, "user", msg)
    list = list.map((t) => (t.id === withUser.id ? withUser : t))
    persistThreads(list)
    setChatInput("")
    setChatLoading(true)
    setError(null)

    const contextText = buildChatContextFromLesson(lesson, scope, analyses)

    const res = await requestLessonChat({
      message: msg,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      lessonSubject: lesson.subject,
      contextText,
      previousMessages: withUser.messages
        .slice(0, -1)
        .map((m) => ({ role: m.role, content: m.content })),
      learningLanguage: "de",
    })

    setChatLoading(false)
    if (!res.ok) {
      setError(res.error)
      return
    }

    const withReply = appendChatMessage(withUser, "assistant", res.reply)
    persistThreads(list.map((t) => (t.id === withReply.id ? withReply : t)))
  }

  const createAiMindMapForLesson = async () => {
    if (readOnly) return
    setCreatingAiMindMap(true)
    setError(null)
    try {
      const response = await fetch("/api/lesson-mindmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson }),
      })
      const data = (await response.json()) as { plan?: AiMindMapPlan; error?: string }
      if (!response.ok || !data.plan) throw new Error(data.error ?? "تعذّر إنشاء الخريطة")
      const nodes = buildMindMapNodesFromAiPlan(data.plan, lesson.title)
      if (!nodes.length) throw new Error("لم ينتج الذكاء عقداً كافية للخريطة")
      onCreateMindMap(data.plan.title?.trim() || `${lesson.title} — Deutsch B1`, nodes)
      onOpenMindMapTab?.()
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذّر إنشاء الخريطة")
    } finally {
      setCreatingAiMindMap(false)
    }
  }

  const addReplyToMindMap = (content: string) => {
    const title = content.replace(/\s+/g, " ").slice(0, 52).trim() || "شرح الذكاء الاصطناعي"
    onAddToActiveMindMap([{
      text: title,
      note: content,
      x: 760,
      y: 430,
      parentId: null,
      color: "#bfdbfe",
      role: "branch",
    }])
    onOpenMindMapTab?.()
  }

  const activeAnalysis = activeThread?.analysisId
    ? analyses.find((analysis) => analysis.id === activeThread.analysisId)
    : undefined

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2 flex-wrap">
            {!readOnly && (
              <>
                <Button
                  type="button"
                  size="sm"
                  disabled={creatingAiMindMap}
                  onClick={() => void createAiMindMapForLesson()}
                >
                  {creatingAiMindMap ? <Loader2 className="h-4 w-4 ml-1 animate-spin" /> : <Network className="h-4 w-4 ml-1" />}
                  تحليل الدرس وإنشاء خريطة
                </Button>
              </>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-3 p-4">
                  {activeAnalysis?.imageUrl && (
                    <div className="max-w-[92%] overflow-hidden rounded-lg border bg-card">
                      <img src={activeAnalysis.imageUrl} alt="الصورة المرفوعة للمناقشة" className="max-h-72 w-full object-contain bg-muted/30" />
                      <p className="px-3 py-2 text-xs text-muted-foreground">صورة للمناقشة - Deutsch B1</p>
                    </div>
                  )}
                  {(activeThread?.messages ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-12">
                      {t("aiWorkspace.chatEmpty")}
                    </p>
                  ) : (
                    activeThread!.messages.map((m) => (
                      <div
                        key={m.id}
                        className={cn(
                          "rounded-lg px-3 py-2 text-sm max-w-[92%] whitespace-pre-wrap",
                          m.role === "user"
                            ? "ml-auto bg-primary text-primary-foreground"
                            : "bg-muted/50 border"
                        )}
                      >
                        {m.content}
                        {m.role === "assistant" && !readOnly && (
                          <div className="mt-2 flex flex-wrap gap-1 border-t border-border/50 pt-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() =>
                                onAddNote(t("aiWorkspace.noteFromChat"), m.content)
                              }
                            >
                              <StickyNote className="h-3 w-3 ml-1" />
                              {t("aiHub.addToNotes")}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => addReplyToMindMap(m.content)}
                            >
                              <Network className="h-3 w-3 ml-1" />
                              إضافة إلى الخريطة
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  {chatLoading && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {t("aiHub.thinking")}
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              {error && (
                <p className="px-4 text-sm text-destructive border-t border-border py-2">{error}</p>
              )}

              {!readOnly && (
                <div className="border-t border-border">
                  <div className="border-b bg-muted/30 px-3 py-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleUpload(file)
                        e.target.value = ""
                      }}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileRef.current?.click()}
                        disabled={analyzing}
                      >
                        <Upload className="h-4 w-4 ml-1" />
                        أضف صورة للشات
                      </Button>
                      <span className="text-xs text-muted-foreground">سيظهر التحليل والصورة هنا مباشرة.</span>
                    </div>
                    {uploadPreview && (
                      <div className="mt-2 flex gap-2 rounded-md border bg-background p-2">
                        <img src={uploadPreview} alt="صورة للدراسة" className="h-20 w-24 rounded border object-contain" />
                        <div className="min-w-0 flex-1">
                          <p className="mb-2 text-xs text-muted-foreground">ماذا تريد أن يفعل الذكاء بالصورة؟</p>
                          <div className="flex flex-wrap gap-2">
                            {[
                              ["صف الصورة", "Beschreibe das Bild auf Deutsch B1. Übersetze wichtige Wörter ins Arabische."],
                              ["حلّ المثال", "Löse die Aufgabe im Bild Schritt für Schritt. Erkläre die Lösung auf Deutsch B1 und übersetze sie ins Arabische."],
                              ["اشرح القاعدة", "Erkläre die Grammatikregel im Bild auf Deutsch B1 mit einer arabischen Übersetzung und zwei Beispielen."],
                            ].map(([label, prompt]) => (
                              <Button
                                key={label}
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={analyzing}
                                onClick={() => void handleAnalyzeUpload(prompt)}
                              >
                                {analyzing ? <Loader2 className="h-4 w-4 ml-1 animate-spin" /> : null}
                                {label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 p-3">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={t("aiWorkspace.chatPlaceholder")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          void handleSendChat()
                        }
                      }}
                      disabled={chatLoading}
                    />
                    <Button type="button" onClick={() => void handleSendChat()} disabled={chatLoading}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
    </div>
  )
}

function formatImageStudyReply(content: LessonAnalysisContent): string {
  const sections = [
    content.description ? `**Beschreibung**\n${content.description}` : "",
    content.visibleText && content.visibleText !== "Leer" ? `**Text im Bild**\n${content.visibleText}` : "",
    content.vocabulary?.length
      ? `**Wortschatz**\n${content.vocabulary.map((word) => `- ${word.term}: ${word.meaning}`).join("\n")}`
      : "",
    content.grammarTopics?.length ? `**Grammatik**\n${content.grammarTopics.map((topic) => `- ${topic}`).join("\n")}` : "",
    content.exercises?.length
      ? `**Übungen und Beispiele**\n${content.exercises.map((exercise) => {
          const examples = exercise.sampleAnswers?.length ? `\nBeispiel: ${exercise.sampleAnswers.join(" | ")}` : ""
          return `- ${exercise.title}: ${exercise.explanation}${examples}`
        }).join("\n")}`
      : "",
    content.studyNotes?.length ? `**Lerntipp**\n${content.studyNotes.map((note) => `- ${note}`).join("\n")}` : "",
  ].filter(Boolean)

  return sections.join("\n\n") || "Ich konnte aus dem Bild keine eindeutigen Lerninformationen lesen."
}
