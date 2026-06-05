import type { ImageAIAnalysis } from "@/types/lesson"
import type { LessonAnalysisContent } from "@/types/lesson-analysis"

export type AnalyzeImageOptions = {
  imageUrl: string
  instructions?: string
  mode?: "general" | "school"
  subject?: string
  level?: string
  subjectMode?: "auto" | "manual"
  lessonTitle?: string
  lessonSubject?: string
}

export async function requestImageAnalysis(
  imageUrl: string,
  instructions?: string,
  opts?: Omit<AnalyzeImageOptions, "imageUrl" | "instructions">
): Promise<
  | {
      ok: true
      analysis: Omit<ImageAIAnalysis, "analyzedAt"> & Record<string, unknown>
      content: LessonAnalysisContent
      mode: string
    }
  | { ok: false; error: string }
> {
  const res = await fetch("/api/analyze-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageUrl,
      instructions: instructions?.trim() || undefined,
      mode: opts?.mode ?? "school",
      subject: opts?.subject,
      level: opts?.level,
      subjectMode: opts?.subjectMode,
      lessonTitle: opts?.lessonTitle,
      lessonSubject: opts?.lessonSubject,
    }),
  })

  const data = (await res.json()) as {
    analysis?: Record<string, unknown>
    content?: LessonAnalysisContent
    mode?: string
    error?: string
  }

  if (!res.ok || data.error) {
    return { ok: false, error: data.error ?? "تعذّر تحليل الصورة" }
  }

  if (!data.analysis || !data.content) {
    return { ok: false, error: "تعذّر تحليل الصورة" }
  }

  return {
    ok: true,
    analysis: data.analysis as Omit<ImageAIAnalysis, "analyzedAt"> & Record<string, unknown>,
    content: data.content,
    mode: data.mode ?? "school",
  }
}

export async function requestLessonChat(params: {
  message: string
  lessonId: string
  lessonTitle: string
  lessonSubject: string
  analysisId?: string
  contextText?: string
  analyses?: Array<{
    id: string
    title: string
    summary: string
    markdownReport: string
    subject: string
    content: { grammarTopics?: string[] }
  }>
  previousMessages: Array<{ role: "user" | "assistant"; content: string }>
  topic?: string
}): Promise<{ ok: true; reply: string } | { ok: false; error: string }> {
  const res = await fetch("/api/lesson-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: params.message,
      lessonId: params.lessonId,
      lessonTitle: params.lessonTitle,
      lessonSubject: params.lessonSubject,
      analysisId: params.analysisId,
      contextText: params.contextText,
      previousMessages: params.previousMessages,
      topic: params.topic,
    }),
  })
  const data = (await res.json()) as { reply?: string; error?: string }
  if (!res.ok || data.error) {
    return { ok: false, error: data.error ?? "تعذّر إرسال الرسالة" }
  }
  return { ok: true, reply: data.reply ?? "" }
}
