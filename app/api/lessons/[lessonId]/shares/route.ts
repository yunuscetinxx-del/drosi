import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth-server"
import { getUserLesson } from "@/lib/lesson-storage"
import { buildShareUrl, generateShareToken } from "@/lib/share-token"
import {
  isFullShareScope,
  parseShareScope,
  validateShareScope,
} from "@/lib/lesson-share-scope"
import { prisma } from "@/lib/prisma"
import { stringifyJsonColumn } from "@/lib/json-column"
import type { SharePermission, ShareScope } from "@/types/share"

type RouteCtx = { params: Promise<{ lessonId: string }> }

function mapShareRow(
  r: {
    id: string
    token: string
    permission: string
    allowCopy: boolean
    active: boolean
    createdAt: Date
    scope?: unknown
  },
  origin: string
) {
  const scope = parseShareScope(r.scope)
  return {
    id: r.id,
    token: r.token,
    permission: r.permission === "edit" ? "edit" : "read",
    allowCopy: r.allowCopy,
    active: r.active,
    createdAt: r.createdAt.toISOString(),
    shareUrl: buildShareUrl(r.token, origin),
    scope,
    scopeIsFull: isFullShareScope(scope),
  }
}

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 })

  const { lessonId } = await ctx.params
  const lesson = await getUserLesson(session.userId, lessonId)
  if (!lesson) return NextResponse.json({ error: "الدرس غير موجود" }, { status: 404 })

  const origin = req.nextUrl.origin
  const rows = await prisma.lessonShare.findMany({
    where: { ownerId: session.userId, lessonId },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({
    shares: rows.map((r) => mapShareRow(r, origin)),
  })
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 })

  const { lessonId } = await ctx.params
  const lesson = await getUserLesson(session.userId, lessonId)
  if (!lesson) return NextResponse.json({ error: "الدرس غير موجود" }, { status: 404 })

  let body: { permission?: string; allowCopy?: boolean; scope?: ShareScope | null }
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const scope = body.scope ?? null
  if (scope) {
    const err = validateShareScope(lesson, scope)
    if (err === "empty") {
      return NextResponse.json({ error: "اختر محتوى واحداً على الأقل للمشاركة" }, { status: 400 })
    }
    if (err === "invalid") {
      return NextResponse.json({ error: "محتوى المشاركة غير صالح" }, { status: 400 })
    }
  }

  const scopeIsFull = isFullShareScope(scope)
  let permission: SharePermission = body.permission === "edit" ? "edit" : "read"
  if (!scopeIsFull) permission = "read"

  const allowCopy = body.allowCopy !== false
  const token = generateShareToken()
  const origin = req.nextUrl.origin

  const row = await prisma.lessonShare.create({
    data: {
      ownerId: session.userId,
      lessonId,
      token,
      permission,
      allowCopy,
      active: true,
      scope: scope ? stringifyJsonColumn(scope) : undefined,
    },
  })

  return NextResponse.json({
    share: mapShareRow(row, origin),
  })
}
