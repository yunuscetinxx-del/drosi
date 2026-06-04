import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth-server"
import { reviveCalendarEventsFromJSON } from "@/lib/calendar-revive"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { calendarEvents: true },
    })
    if (!user) {
      return NextResponse.json({ error: "غير مصرّح" }, { status: 401 })
    }

    const raw = user.calendarEvents
    const arr = Array.isArray(raw) ? raw : []
    const events = reviveCalendarEventsFromJSON(arr)
    return NextResponse.json({ events })
  } catch (e) {
    console.error("[calendar GET]", e)
    return NextResponse.json({ error: "تعذّر قراءة التقويم" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 })
  }

  const events = (body as { events?: unknown }).events
  if (!Array.isArray(events)) {
    return NextResponse.json({ error: "تنسيق غير صالح" }, { status: 400 })
  }

  try {
    await prisma.user.update({
      where: { id: session.userId },
      data: { calendarEvents: events as Prisma.InputJsonValue },
    })
  } catch (e) {
    console.error("[calendar PUT]", e)
    return NextResponse.json({ error: "تعذّر الحفظ" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
