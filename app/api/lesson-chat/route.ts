import { NextRequest, NextResponse } from "next/server"
import {
  mergeProfileFromQuestion,
  parseLearningProfile,
} from "@/lib/ai-learning-profile"
import { callAiChat } from "@/lib/ai-chat-client"
import { AiNotConfiguredError, resolveAiCredentials } from "@/lib/user-ai-credentials"
import { getSessionFromRequest } from "@/lib/auth-server"
import { prisma } from "@/lib/prisma"
import { stringifyJsonColumn } from "@/lib/json-column"

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
    contextText?: string
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

  const contextBlock =
    body.contextText?.trim() ||
    "لا مصادر محددة — أجب بناءً على سؤال الطالب فقط إن لم يتوفر سياق."

  const profileSummary = Object.entries(profile.subjects)
    .slice(0, 5)
    .map(([k, s]) => `${k}: ${s.topicsStudied.slice(-5).join("، ")}`)
    .join("\n")

  const systemPrompt = `أنت مساعد تعليمي رسمي (مثل NotebookLM) متخصص في تحليل الدروس المدرسية.
- أجب بالعربية بأسلوب واضح ومنظم
- استند فقط إلى المصادر المرفقة أدناه؛ إن نقصت معلومة قل ذلك صراحة
- عند شرح تمارين: خطوة بخطوة مع أمثلة
- يمكنك اقتراح خطة مراجعة أو خريطة مفاهيم نصية عند الطلب
- لا تخترع حقائق خارج المصادر`

  const userPrompt = `الدرس: ${body.lessonTitle ?? "—"} (${body.lessonSubject ?? "—"})

═══ المصادر المحددة ═══
${contextBlock}

═══ ملف تعلّم الطالب ═══
${profileSummary || "جديد"}

═══ سؤال الطالب ═══
${message}`

  const history = (body.previousMessages ?? []).slice(-12)

  try {
    const credentials = await resolveAiCredentials(session.userId)
    const reply = await callAiChat(
      [
        { role: "system", content: systemPrompt },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: userPrompt },
      ],
      credentials,
      { maxTokens: 2000, title: "Durusi - Lesson Chat" }
    )

    const topic = body.topic?.trim() || body.lessonSubject || "عام"

    const updated = mergeProfileFromQuestion(profile, {
      topic,
      question: message,
      askedAt: new Date().toISOString(),
      lessonId: body.lessonId,
      analysisId: body.analysisId,
      subject: body.lessonSubject,
    })

    await prisma.user.update({
      where: { id: session.userId },
      data: { aiLearningProfile: stringifyJsonColumn(updated) },
    })

    return NextResponse.json({ reply: reply.trim() || "تعذّر توليد إجابة." })
  } catch (err) {
    console.error("[lesson-chat]", err)
    if (err instanceof AiNotConfiguredError) {
      return NextResponse.json({ error: err.message, code: "AI_NOT_CONFIGURED" }, { status: 503 })
    }
    const msg = err instanceof Error ? err.message : "خطأ في الاتصال"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
