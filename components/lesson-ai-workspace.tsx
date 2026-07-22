"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Lesson, MindMapNode } from "@/types/lesson"
import type { ChatSourceScope, LessonAnalysisEntry, LessonChatThread } from "@/types/lesson-analysis"
import { emptyChatSourceScope } from "@/types/lesson-analysis"
import {
  appendChatMessage,
  createAnalysisEntry,
  createChatThread,
  formatAnalysisForNotes,
  getLessonAnalyses,
  getLessonChatThreads,
  sortAnalysesNewestFirst,
} from "@/lib/lesson-analysis"
import { buildChatContextFromLesson, countActiveSources } from "@/lib/lesson-chat-context"
import { buildMindMapNodesFromSources } from "@/lib/lesson-ai-mindmap"
import { requestImageAnalysis, requestLessonChat } from "@/lib/analyze-image-client"
import { getLessonNotes } from "@/lib/lesson-notes"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useTranslations } from "@/components/locale-provider"
import { cn } from "@/lib/utils"
import {
  BookOpen,
  FileText,
  History,
  ImageIcon,
  Loader2,
  MessageSquarePlus,
  Network,
  Send,
  Sparkles,
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
  const notes = useMemo(() => getLessonNotes(lesson), [lesson])
  const wordPages = lesson.wordPages ?? []

  const [subjectMode, setSubjectMode] = useState<"auto" | "manual">("auto")
  const [subject, setSubject] = useState(lesson.subject || "")
  const [level, setLevel] = useState("")
  const [instructions, setInstructions] = useState("")
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(threads[0]?.id ?? null)
  const [mindMapPromptOpen, setMindMapPromptOpen] = useState(false)

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

  const updateScope = useCallback(
    (patch: Partial<ChatSourceScope>) => {
      if (!activeThread || readOnly) return
      const nextScope: ChatSourceScope = {
        analysisIds: patch.analysisIds ?? scope.analysisIds,
        imageIds: patch.imageIds ?? scope.imageIds,
        noteIds: patch.noteIds ?? scope.noteIds,
        wordPageIds: patch.wordPageIds ?? scope.wordPageIds,
      }
      persistThreads(
        threads.map((t) =>
          t.id === activeThread.id
            ? { ...t, sourceScope: nextScope, updatedAt: new Date() }
            : t
        )
      )
    },
    [activeThread, readOnly, scope, threads, persistThreads]
  )

  const toggleId = (key: keyof ChatSourceScope, id: string) => {
    const list = scope[key]
    const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
    updateScope({ [key]: next })
  }

  const handleNewChat = () => {
    const thread = createChatThread({
      title: `${t("aiWorkspace.newChat")} ${threads.length + 1}`,
      sourceScope: { ...scope },
    })
    persistThreads([thread, ...threads])
    setActiveThreadId(thread.id)
    setChatInput("")
  }

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

  const handleAnalyzeUpload = async () => {
    if (!uploadPreview) return
    setAnalyzing(true)
    setError(null)
    try {
      const res = await requestImageAnalysis(uploadPreview, instructions, {
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

      onUpdateLesson({
        lessonAnalyses: [entry, ...analyses],
        lessonChatThreads: [thread, ...threads],
      })
      setActiveThreadId(thread.id)
      setUploadPreview(null)
      setInstructions("")
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
    })

    setChatLoading(false)
    if (!res.ok) {
      setError(res.error)
      return
    }

    const withReply = appendChatMessage(withUser, "assistant", res.reply)
    persistThreads(list.map((t) => (t.id === withReply.id ? withReply : t)))
  }

  const applyMindMap = (mode: "new" | "active") => {
    const nodes = buildMindMapNodesFromSources(lesson.title, lesson, scope, analyses)
    if (nodes.length === 0) return
    const title = `${lesson.title} — ${t("aiWorkspace.mindMapFromSources")}`
    if (mode === "new") {
      onCreateMindMap(title, nodes)
    } else {
      onAddToActiveMindMap(nodes.map(({ id: _id, ...rest }) => rest))
    }
    setMindMapPromptOpen(false)
    onOpenMindMapTab?.()
  }

  const sourceCount = countActiveSources(scope)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* مصادر */}
        <aside className="flex w-full shrink-0 flex-col border-b border-border lg:w-72 lg:border-b-0 lg:border-e">
          <div className="border-b border-border px-3 py-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              {t("aiWorkspace.sources")}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t("aiWorkspace.sourcesHint")}</p>
          </div>
          <ScrollArea className="min-h-0 flex-1 max-h-[40vh] lg:max-h-none">
            <div className="space-y-4 p-3">
              {!readOnly && (
                <div className="space-y-2 rounded-lg border border-dashed p-3">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleUpload(f)
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 ml-1" />
                    {t("aiWorkspace.uploadPage")}
                  </Button>
                  {uploadPreview && (
                    <img src={uploadPreview} alt="" className="max-h-24 rounded border object-contain w-full" />
                  )}
                  <Textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder={t("aiHub.instructionsPlaceholder")}
                    rows={2}
                    className="text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
                    disabled={!uploadPreview || analyzing}
                    onClick={() => void handleAnalyzeUpload()}
                  >
                    {analyzing ? (
                      <Loader2 className="h-4 w-4 ml-1 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 ml-1" />
                    )}
                    {t("aiWorkspace.analyzeAndAdd")}
                  </Button>
                </div>
              )}

              <SourceSection title={t("aiWorkspace.registry")} icon={<History className="h-3.5 w-3.5" />}>
                {analyses.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-1">{t("aiHub.noAnalyses")}</p>
                ) : (
                  analyses.map((a) => (
                    <SourceRow
                      key={a.id}
                      checked={scope.analysisIds.includes(a.id)}
                      disabled={readOnly}
                      onCheckedChange={() => toggleId("analysisIds", a.id)}
                      label={a.title}
                      sub={a.summary.slice(0, 60)}
                    />
                  ))
                )}
              </SourceSection>

              <SourceSection title={t("lesson.tabImages")} icon={<ImageIcon className="h-3.5 w-3.5" />}>
                {lesson.images.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-1">{t("imageAi.noLessonImages")}</p>
                ) : (
                  lesson.images.map((img, i) => (
                    <SourceRow
                      key={img.id}
                      checked={scope.imageIds.includes(img.id)}
                      disabled={readOnly}
                      onCheckedChange={() => toggleId("imageIds", img.id)}
                      label={t("imageAi.imageOption", { n: i + 1 })}
                      sub={img.aiAnalysis ? t("imageAi.alreadyAnalyzed") : undefined}
                    />
                  ))
                )}
              </SourceSection>

              <SourceSection title={t("lesson.tabNotes")} icon={<StickyNote className="h-3.5 w-3.5" />}>
                {notes.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-1">{t("lesson.notesEmpty")}</p>
                ) : (
                  notes.map((n) => (
                    <SourceRow
                      key={n.id}
                      checked={scope.noteIds.includes(n.id)}
                      disabled={readOnly}
                      onCheckedChange={() => toggleId("noteIds", n.id)}
                      label={n.title || t("lesson.untitledNote")}
                    />
                  ))
                )}
              </SourceSection>

              <SourceSection title={t("lesson.tabWord")} icon={<FileText className="h-3.5 w-3.5" />}>
                {wordPages.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-1">—</p>
                ) : (
                  wordPages.map((p) => (
                    <SourceRow
                      key={p.id}
                      checked={scope.wordPageIds.includes(p.id)}
                      disabled={readOnly}
                      onCheckedChange={() => toggleId("wordPageIds", p.id)}
                      label={p.title}
                    />
                  ))
                )}
              </SourceSection>
            </div>
          </ScrollArea>
        </aside>

        {/* شات + سجل */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2 flex-wrap">
            <Badge variant="secondary">{sourceCount} {t("aiWorkspace.sourcesActive")}</Badge>
            {!readOnly && (
              <>
                <Button type="button" size="sm" variant="outline" onClick={handleNewChat}>
                  <MessageSquarePlus className="h-4 w-4 ml-1" />
                  {t("aiWorkspace.newChat")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={sourceCount === 0}
                  onClick={() => setMindMapPromptOpen(true)}
                >
                  <Network className="h-4 w-4 ml-1" />
                  {t("aiWorkspace.mindMapFromSources")}
                </Button>
              </>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            {/* قائمة المحادثات */}
            <div className="shrink-0 border-b border-border md:w-48 md:border-b-0 md:border-e">
              <ScrollArea className="h-28 md:h-full max-h-32 md:max-h-none">
                <div className="p-2 space-y-1">
                  {threads.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-2">{t("aiWorkspace.noChats")}</p>
                  ) : (
                    threads.map((th) => (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => setActiveThreadId(th.id)}
                        className={cn(
                          "w-full rounded-md px-2 py-2 text-start text-xs transition-colors",
                          activeThreadId === th.id
                            ? "bg-primary/10 text-foreground font-medium"
                            : "hover:bg-muted/60 text-muted-foreground"
                        )}
                      >
                        <span className="line-clamp-2">{th.title}</span>
                        <span className="text-[10px] opacity-60">{th.messages.length} رسالة</span>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* الرسائل */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-3 p-4">
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
                <div className="flex gap-2 border-t border-border p-3">
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
              )}
            </div>
          </div>

          {/* سجل الصفحات */}
          <div className="hidden xl:block border-t border-border max-h-40 overflow-y-auto">
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">
              {t("aiWorkspace.pageRegistry")} ({analyses.length})
            </div>
            <div className="flex gap-2 overflow-x-auto px-3 pb-3">
              {analyses.map((a: LessonAnalysisEntry) => (
                <div
                  key={a.id}
                  className="shrink-0 w-56 rounded-lg border bg-card p-2 text-xs"
                >
                  <p className="font-semibold truncate">{a.title}</p>
                  <p className="text-muted-foreground line-clamp-2 mt-1">{a.summary}</p>
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 mt-1 text-xs"
                      onClick={() => onAddNote(a.title, formatAnalysisForNotes(a))}
                    >
                      {t("aiHub.addToNotes")}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={mindMapPromptOpen} onOpenChange={setMindMapPromptOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("aiWorkspace.mindMapWhere")}</AlertDialogTitle>
            <AlertDialogDescription>{t("aiWorkspace.mindMapWhereDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction onClick={() => applyMindMap("new")}>
              {t("aiWorkspace.newMindMap")}
            </AlertDialogAction>
            <AlertDialogAction onClick={() => applyMindMap("active")}>
              {t("aiWorkspace.activeMindMap")}
            </AlertDialogAction>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SourceSection({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2 px-1">
        {icon}
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function SourceRow({
  checked,
  disabled,
  onCheckedChange,
  label,
  sub,
}: {
  checked: boolean
  disabled?: boolean
  onCheckedChange: () => void
  label: string
  sub?: string
}) {
  return (
    <label className="flex items-start gap-2 rounded-md px-1 py-1.5 hover:bg-muted/50 cursor-pointer">
      <Checkbox checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} className="mt-0.5" />
      <span className="min-w-0 flex-1">
        <span className="text-xs font-medium block truncate">{label}</span>
        {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
      </span>
    </label>
  )
}
