import { NextRequest, NextResponse } from "next/server"
import { getSessionFromCookies } from "@/lib/auth-server"
import { reviveLessonsFromJSON } from "@/lib/lessons-revive"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export async function GET() {
  const session = await getSessionFromCookies()
  if (!session) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { lessons: true },
    })
    if (!user) {
      return NextResponse.json({ error: "غير مصرّح" }, { status: 401 })
    }

    const raw = user.lessons
    const arr = Array.isArray(raw) ? raw : []
    const lessons = reviveLessonsFromJSON(arr)
    return NextResponse.json({ lessons })
  } catch (e) {
    console.error("[lessons GET]", e)
    return NextResponse.json({ error: "تعذّر قراءة الدروس" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromCookies()
  if (!session) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 })
  }

  const lessons = (body as { lessons?: unknown }).lessons
  if (!Array.isArray(lessons)) {
    return NextResponse.json({ error: "تنسيق الدروس غير صالح" }, { status: 400 })
  }

  try {
    await prisma.user.update({
      where: { id: session.userId },
      data: { lessons: lessons as Prisma.InputJsonValue },
    })
  } catch (e) {
    console.error("[lessons PUT]", e)
    return NextResponse.json({ error: "تعذّر الحفظ" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
