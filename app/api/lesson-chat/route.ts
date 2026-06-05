import { NextRequest, NextResponse } from "next/server"
import {
  mergeProfileFromQuestion,
  parseLearningProfile,
} from "@/lib/ai-learning-profile"
import { callOpenRouter } from "@/lib/openrouter-client"
import { getSessionFromRequest } from "@/lib/auth-server"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"
import type { LessonAnalysisEntry } from "@/types/lesson-analysis"

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 })
  }

  let body: {
    message?: string
    lessonTitle?: string
    lessonSubject?: string
    lessonId?: string
    analysisId?: string
    analyses?: LessonAnalysisEntry[]
    previousMessages?: Array<{ role: "user" | "assistant"; content: string }>
    topic?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 })
  }

  const message = body.message?.trim()
  if (!message) {
    return NextResponse.json({ error: "الرسالة مطلوبة" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { aiLearningProfile: true },
  })
  const profile = parseLearningProfile(user?.aiLearningProfile)

  const analyses = body.analyses ?? []
  const focused = body.analysisId
    ? analyses.find((a) => a.id === body.analysisId)
    : analyses[0]

  const contextBlock = focused
    ? `تحليل مرتبط:\n${focused.markdownReport ?? focused.summary}`
    : analyses.length
      ? analyses
          .slice(0, 3)
          .map((a) => `- ${a.title}: ${a.summary}`)
          .join("\n")
      : "لا تحليلات محفوظة بعد"

  const profileSummary = Object.entries(profile.subjects)
    .slice(0, 5)
    .map(([k, s]) => `${k}: ${s.topicsStudied.slice(-5).join("، ")}`)
    .join("\n")

  const systemPrompt = `أنت معلّم شخصي يجيب عن أسئلة الطالب حول درسه المحدد.
- أجب بالعربية بوضوح واختصار مناسب
- استخدم سياق التحليل والملف التعليمي للمستخدم
- إن سُئلت عن تمرين، اشرح خطوة بخطوة
- لا تخترع محتوى غير موجود في التحليل إلا كتفسير تعليمي عام`

  const userPrompt = `الدرس: ${body.lessonTitle ?? "—"} (${body.lessonSubject ?? "—"})
سياق التحليل:
${contextBlock}

ملف تعلّم الطالب:
${profileSummary || "جديد"}

سؤال الطالب: ${message}`

  const history = (body.previousMessages ?? []).slice(-8)

  try {
    const reply = await callOpenRouter(
      [
        { role: "system", content: systemPrompt },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: userPrompt },
      ],
      { maxTokens: 1200, title: "Durusi - Lesson Chat" }
    )

    const topic =
      body.topic?.trim() ||
      focused?.content.grammarTopics?.[0] ||
      body.lessonSubject ||
      "عام"

    const updated = mergeProfileFromQuestion(profile, {
      topic,
      question: message,
      askedAt: new Date().toISOString(),
      lessonId: body.lessonId,
      analysisId: body.analysisId ?? focused?.id,
      subject: body.lessonSubject || focused?.subject,
    })

    await prisma.user.update({
      where: { id: session.userId },
      data: { aiLearningProfile: updated as unknown as Prisma.InputJsonValue },
    })

    return NextResponse.json({ reply: reply.trim() || "تعذّر توليد إجابة." })
  } catch (err) {
    console.error("[lesson-chat]", err)
    const msg = err instanceof Error ? err.message : "خطأ في الاتصال"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
