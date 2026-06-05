import { NextRequest, NextResponse } from "next/server"
import { resolveAppPublicConfig, saveAppPublicConfig } from "@/lib/app-public-config"
import { getSessionFromRequest } from "@/lib/auth-server"
import { prisma } from "@/lib/prisma"

async function requireAdmin() {
  const session = await getSessionFromRequest()
  if (!session) return null
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { isAdmin: true },
  })
  if (!user?.isAdmin) return null
  return session
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const config = await resolveAppPublicConfig()
  return NextResponse.json(config)
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: { apiBaseUrl?: string; forceApiBaseUrl?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const apiBaseUrl = typeof body.apiBaseUrl === "string" ? body.apiBaseUrl : ""
  if (!apiBaseUrl) {
    return NextResponse.json({ error: "apiBaseUrl is required" }, { status: 400 })
  }

  try {
    const saved = await saveAppPublicConfig({
      apiBaseUrl,
      forceApiBaseUrl: body.forceApiBaseUrl === true,
    })
    return NextResponse.json(saved)
  } catch (e) {
    const message = e instanceof Error ? e.message : "Save failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
