import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth-server"
import { isFullShareScope, parseShareScope } from "@/lib/lesson-share-scope"
import { prisma } from "@/lib/prisma"
import { buildShareUrl } from "@/lib/share-token"
import type { SharePermission } from "@/types/share"

type RouteCtx = { params: Promise<{ shareId: string }> }

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 })

  const { shareId } = await ctx.params
  const existing = await prisma.lessonShare.findUnique({ where: { id: shareId } })
  if (!existing || existing.ownerId !== session.userId) {
    return NextResponse.json({ error: "غير موجود" }, { status: 404 })
  }

  let body: { permission?: string; allowCopy?: boolean; active?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 })
  }

  const data: { permission?: string; allowCopy?: boolean; active?: boolean } = {}
  const scope = parseShareScope((existing as { scope?: unknown }).scope)
  const scopeIsFull = isFullShareScope(scope)

  if (body.permission === "edit" || body.permission === "read") {
    data.permission = body.permission === "edit" && scopeIsFull ? "edit" : "read"
  }
  if (typeof body.allowCopy === "boolean") data.allowCopy = body.allowCopy
  if (typeof body.active === "boolean") data.active = body.active

  const row = await prisma.lessonShare.update({
    where: { id: shareId },
    data,
  })

  const permission: SharePermission = row.permission === "edit" ? "edit" : "read"

  return NextResponse.json({
    share: {
      id: row.id,
      token: row.token,
      permission,
      allowCopy: row.allowCopy,
      active: row.active,
      createdAt: row.createdAt.toISOString(),
      shareUrl: buildShareUrl(row.token, req.nextUrl.origin),
      scope,
      scopeIsFull,
    },
  })
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 })

  const { shareId } = await ctx.params
  const existing = await prisma.lessonShare.findUnique({ where: { id: shareId } })
  if (!existing || existing.ownerId !== session.userId) {
    return NextResponse.json({ error: "غير موجود" }, { status: 404 })
  }

  await prisma.lessonShare.delete({ where: { id: shareId } })
  return NextResponse.json({ ok: true })
}
