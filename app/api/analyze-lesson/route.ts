import { NextRequest, NextResponse } from "next/server"
import { AI_MODEL_CONFIG } from "@/lib/ai-model"
import { callAiChat } from "@/lib/ai-chat-client"
import { parseJsonFromModel } from "@/lib/openrouter-client"
import { getSessionFromRequest } from "@/lib/auth-server"
import { AiNotConfiguredError, resolveAiCredentials } from "@/lib/user-ai-credentials"

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 })
  }

  const { lesson } = await req.json()

  const prompt = `أنت مساعد تعليمي متخصص. قم بتحليل الدرس التالي وأعطِ تحليلاً شاملاً باللغة العربية.

الدرس: ${lesson.title}
المادة: ${lesson.subject}
الوصف: ${lesson.description}
الملخص: ${lesson.summary}
النقاط الرئيسية:
${lesson.keyPoints.map((p: string, i: number) => `${i + 1}. ${p}`).join("\n")}
الملاحظات: ${lesson.notes}

قدّم التحليل بالتنسيق JSON التالي حرفياً بدون أي markdown أو \`\`\` أو نص خارج الـ JSON:
{
  "difficulty": "سهل | متوسط | صعب",
  "difficultyScore": 1-10,
  "completeness": 1-100,
  "strengths": ["نقطة قوة 1", "نقطة قوة 2", "نقطة قوة 3"],
  "improvements": ["اقتراح تحسين 1", "اقتراح تحسين 2", "اقتراح تحسين 3"],
  "studyTips": ["نصيحة دراسية 1", "نصيحة دراسية 2", "نصيحة دراسية 3"],
  "relatedTopics": ["موضوع مرتبط 1", "موضوع مرتبط 2", "موضوع مرتبط 3"],
  "estimatedStudyTime": "مثلاً: 45 دقيقة",
  "mindMapSuggestions": ["عقدة مقترحة 1", "عقدة مقترحة 2", "عقدة مقترحة 3", "عقدة مقترحة 4"],
  "summary": "ملخص تحليلي شامل للدرس في جملتين أو ثلاث"
}`

  try {
    const credentials = await resolveAiCredentials(session.userId)
    const text = await callAiChat(
      [{ role: "user", content: prompt }],
      credentials,
      { maxTokens: AI_MODEL_CONFIG.maxTokensLesson, title: "Durusi - Lesson Manager" }
    )

    const fallback = {
      difficulty: "متوسط",
      difficultyScore: 5,
      completeness: 50,
      strengths: [] as string[],
      improvements: [] as string[],
      studyTips: [] as string[],
      relatedTopics: [] as string[],
      estimatedStudyTime: "—",
      mindMapSuggestions: [] as string[],
      summary: text || "تعذر التحليل",
    }

    const analysis = parseJsonFromModel(text, fallback)
    return NextResponse.json({ analysis })
  } catch (err) {
    console.log("[analyze-lesson]", err)
    if (err instanceof AiNotConfiguredError) {
      return NextResponse.json({ error: err.message, code: "AI_NOT_CONFIGURED" }, { status: 503 })
    }
    const msg = err instanceof Error ? err.message : "خطأ في الاتصال بالذكاء الاصطناعي"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
