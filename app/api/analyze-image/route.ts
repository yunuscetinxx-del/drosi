import { NextRequest, NextResponse } from "next/server"
import { AI_MODEL_CONFIG } from "@/lib/ai-model"
import {
  mergeProfileFromAnalysis,
  parseLearningProfile,
} from "@/lib/ai-learning-profile"
import { buildImageAnalysisPrompt } from "@/lib/image-analysis-prompt"
import { parseAnalysisContent } from "@/lib/lesson-analysis"
import { callAiChat } from "@/lib/ai-chat-client"
import { parseJsonFromModel } from "@/lib/openrouter-client"
import { AiNotConfiguredError, resolveAiCredentials } from "@/lib/user-ai-credentials"
import { buildSchoolAnalysisPrompt } from "@/lib/school-analysis-prompt"
import { getSessionFromRequest } from "@/lib/auth-server"
import { prisma } from "@/lib/prisma"
import { stringifyJsonColumn } from "@/lib/json-column"
import { isLocalFileUrl, readLocalFileAsDataUrl } from "@/lib/local-files"

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 })
  }

  let body: {
    imageUrl?: string
    instructions?: string
    mode?: "general" | "school"
    subject?: string
    level?: string
    subjectMode?: "auto" | "manual"
    lessonTitle?: string
    lessonSubject?: string
    updateProfile?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 })
  }

  const { imageUrl, instructions, mode = "school", subject, level, subjectMode, lessonTitle, lessonSubject } =
    body
  if (!imageUrl || typeof imageUrl !== "string") {
    return NextResponse.json({ error: "رابط الصورة مطلوب" }, { status: 400 })
  }

  // الصور المخزَّنة محلياً (/api/files/...) لا يمكن لخدمة الذكاء الاصطناعي الوصول إليها مباشرة؛
  // نقرأها من القرص ونحوّلها إلى data URL قبل الإرسال.
  let resolvedImageUrl = imageUrl
  if (isLocalFileUrl(imageUrl)) {
    const dataUrl = await readLocalFileAsDataUrl(imageUrl)
    if (!dataUrl) {
      return NextResponse.json({ error: "تعذّر تحميل الصورة" }, { status: 404 })
    }
    resolvedImageUrl = dataUrl
  }

  let userProfile = null
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { aiLearningProfile: true },
    })
    userProfile = parseLearningProfile(user?.aiLearningProfile)
  } catch {
    /* ignore */
  }

  const isSchool = mode === "school"
  const prompt = isSchool
    ? buildSchoolAnalysisPrompt({
        subject,
        level,
        mode: subjectMode ?? (subject || level ? "manual" : "auto"),
        instructions,
        lessonTitle,
        lessonSubject,
        userProfile,
      })
    : buildImageAnalysisPrompt(instructions)

  try {
    const credentials = await resolveAiCredentials(session.userId)
    const text = await callAiChat(
      [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: resolvedImageUrl } },
          ],
        },
      ],
      credentials,
      { maxTokens: isSchool ? 2000 : AI_MODEL_CONFIG.maxTokensImage, title: "Durusi - Analyzer" }
    )

    const fallback = {
      description: text || "تعذر تحليل الصورة",
      keyElements: [] as string[],
      studyNotes: [] as string[],
      relatedConcepts: [] as string[],
    }

    const raw = parseJsonFromModel<Record<string, unknown>>(text, fallback)
    const content = parseAnalysisContent(raw)

    if (body.updateProfile !== false && isSchool) {
      try {
        const profile = userProfile ?? parseLearningProfile(null)
        const updated = mergeProfileFromAnalysis(
          profile,
          content,
          lessonSubject || subject || "عام"
        )
        await prisma.user.update({
          where: { id: session.userId },
          data: { aiLearningProfile: stringifyJsonColumn(updated) },
        })
      } catch (e) {
        console.error("[analyze-image profile]", e)
      }
    }

    return NextResponse.json({
      analysis: {
        description: content.description,
        keyElements: content.keyElements,
        studyNotes: content.studyNotes,
        relatedConcepts: content.relatedConcepts,
        visibleText: content.visibleText,
      },
      content,
      mode: isSchool ? "school" : "general",
    })
  } catch (err) {
    console.log("[analyze-image]", err)
    if (err instanceof AiNotConfiguredError) {
      return NextResponse.json({ error: err.message, code: "AI_NOT_CONFIGURED" }, { status: 503 })
    }
    const msg = err instanceof Error ? err.message : "خطأ في الاتصال بالذكاء الاصطناعي"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
