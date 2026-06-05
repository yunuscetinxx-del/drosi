import { NextRequest, NextResponse } from "next/server"
import { encryptApiKey, keyHint } from "@/lib/ai-key-crypto"
import { validateGeminiApiKey } from "@/lib/gemini-client"
import { isGeminiRateLimitError } from "@/lib/gemini-errors"
import { getSessionFromRequest } from "@/lib/auth-server"
import { getPublicAiSettings } from "@/lib/user-ai-credentials"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 })
  }

  const settings = await getPublicAiSettings(session.userId)
  return NextResponse.json(settings)
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 })
  }

  let body: { apiKey?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 })
  }

  const apiKey = body.apiKey?.trim()
  if (!apiKey || apiKey.length < 20) {
    return NextResponse.json({ error: "مفتاح Gemini غير صالح أو قصير جداً" }, { status: 400 })
  }

  let verifyWarning: string | undefined
  try {
    await validateGeminiApiKey(apiKey)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "فشل التحقق من المفتاح"
    if (isGeminiRateLimitError(msg)) {
      verifyWarning =
        "تم حفظ المفتاح لكن التحقق تأخر بسبب حد الطلبات في AI Studio. انتظر دقيقة ثم جرّب التحليل."
    } else {
      return NextResponse.json({ error: msg }, { status: 400 })
    }
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      geminiApiKeyEnc: encryptApiKey(apiKey),
      geminiKeyHint: keyHint(apiKey),
      geminiKeyUpdatedAt: new Date(),
    },
  })

  const settings = await getPublicAiSettings(session.userId)
  return NextResponse.json({ ...settings, warning: verifyWarning })
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 })
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      geminiApiKeyEnc: null,
      geminiKeyHint: null,
      geminiKeyUpdatedAt: null,
    },
  })

  const settings = await getPublicAiSettings(session.userId)
  return NextResponse.json(settings)
}
