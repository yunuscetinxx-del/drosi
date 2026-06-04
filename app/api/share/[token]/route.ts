import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth-server"
import { resolveShareByToken } from "@/lib/share-resolve"
import { updateUserLesson } from "@/lib/lesson-storage"
import { reviveLesson } from "@/lib/lessons-revive"
import type { Lesson } from "@/types/lesson"

type RouteCtx = { params: Promise<{ token: string }> }

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const { token } = await ctx.params
  const resolved = await resolveShareByToken(token)
  if (!resolved) {
    return NextResponse.json({ error: "الرابط غير صالح أو معطّل" }, { status: 404 })
  }

  const session = await getSessionFromRequest(req)
  const isOwner = session?.userId === resolved.ownerId

  return NextResponse.json({
    lesson: resolved.lesson,
    share: {
      permission: resolved.permission,
      allowCopy: resolved.allowCopy,
      active: resolved.active,
      ownerEmail: resolved.ownerEmail,
      isOwner,
      scope: resolved.scope,
      scopeIsFull: resolved.scopeIsFull,
    },
  })
}

export async function PUT(req: NextRequest, ctx: RouteCtx) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: "يجب تسجيل الدخول للتعديل" }, { status: 401 })
  }

  const { token } = await ctx.params
  const resolved = await resolveShareByToken(token)
  if (!resolved) {
    return NextResponse.json({ error: "الرابط غير صالح أو معطّل" }, { status: 404 })
  }

  if (resolved.permission !== "edit") {
    return NextResponse.json({ error: "ليس لديك صلاحية التعديل" }, { status: 403 })
  }

  let body: { lesson?: Partial<Lesson> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 })
  }

  if (!body.lesson || typeof body.lesson !== "object") {
    return NextResponse.json({ error: "بيانات الدرس مطلوبة" }, { status: 400 })
  }

  const merged = reviveLesson({
    ...resolved.lesson,
    ...body.lesson,
    id: resolved.lessonId,
  })

  const ok = await updateUserLesson(resolved.ownerId, resolved.lessonId, merged)
  if (!ok) return NextResponse.json({ error: "تعذّر الحفظ" }, { status: 500 })

  return NextResponse.json({ lesson: merged })
}
