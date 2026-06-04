import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth-server"
import { resolveShareByToken } from "@/lib/share-resolve"
import { addLessonToUser } from "@/lib/lesson-storage"
import { cloneLessonForUser } from "@/lib/lesson-clone"

type RouteCtx = { params: Promise<{ token: string }> }

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: "يجب تسجيل الدخول لحفظ نسخة" }, { status: 401 })
  }

  const { token } = await ctx.params
  const resolved = await resolveShareByToken(token)
  if (!resolved) {
    return NextResponse.json({ error: "الرابط غير صالح أو معطّل" }, { status: 404 })
  }

  if (!resolved.allowCopy) {
    return NextResponse.json({ error: "المالك لا يسمح بنسخ هذا الدرس" }, { status: 403 })
  }

  if (session.userId === resolved.ownerId) {
    return NextResponse.json({ error: "هذا درسك بالفعل" }, { status: 400 })
  }

  const copy = cloneLessonForUser(resolved.lesson)
  await addLessonToUser(session.userId, copy)

  return NextResponse.json({ lesson: copy })
}
