import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth-server"
import { callAiChat } from "@/lib/ai-chat-client"
import { parseJsonFromModel } from "@/lib/openrouter-client"
import { AiNotConfiguredError, resolveAiCredentials } from "@/lib/user-ai-credentials"

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 })

  const { lesson } = (await req.json()) as { lesson?: unknown }
  if (!lesson || typeof lesson !== "object") return NextResponse.json({ error: "الدرس مطلوب" }, { status: 400 })

  const prompt = `You are an expert German B1 teacher. Study the complete lesson data below, including image analyses. Create a concise, useful German-learning mind map.

Return JSON only:
{
  "title": "German map title",
  "categories": [
    {
      "title": "Category in German, e.g. Verben",
      "note": "Short Arabic explanation of the category",
      "items": [{"text": "German word or short phrase", "note": "Arabic meaning, grammar note, or B1 example"}]
    }
  ]
}

Use 3-6 categories. Prefer these when relevant: Bildbeschreibung, Wortschatz, Verben, Grammatik, Redemittel, Übungen. Each category must have 2-6 useful items. Use only facts and German phrases supported by the lesson data; do not invent image details.

Lesson data:
${JSON.stringify(lesson)}`

  try {
    const credentials = await resolveAiCredentials(session.userId)
    const text = await callAiChat([{ role: "user", content: prompt }], credentials, {
      maxTokens: 1800,
      temperature: 0.25,
      json: true,
      title: "Drosi - German Mind Map",
    })
    const fallback = { title: "Deutsch B1", categories: [] as unknown[] }
    const raw = parseJsonFromModel<Record<string, unknown>>(text, fallback)
    const categories = Array.isArray(raw.categories)
      ? raw.categories
          .filter((category): category is Record<string, unknown> => Boolean(category) && typeof category === "object")
          .map((category) => ({
            title: String(category.title ?? category.category ?? category.name ?? "").trim(),
            note: String(category.note ?? category.description ?? "").trim(),
            items: Array.isArray(category.items)
              ? category.items
                  .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
                  .map((item) => ({
                    text: String(item.text ?? item.word ?? item.term ?? "").trim(),
                    note: String(item.note ?? item.arabic_note ?? item.meaning ?? "").trim(),
                  }))
              : [],
          }))
          .filter((category) => category.title)
      : []
    return NextResponse.json({ plan: { title: String(raw.title ?? "Deutsch B1"), categories } })
  } catch (error) {
    if (error instanceof AiNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "تعذّر إنشاء الخريطة" }, { status: 500 })
  }
}