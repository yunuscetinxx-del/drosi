import { NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth-server"
import { prisma } from "@/lib/prisma"
import { getBackupStatus, runBackupNow } from "@/lib/backup-scheduler"

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
  const status = await getBackupStatus()
  return NextResponse.json(status)
}

export async function POST() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  try {
    await runBackupNow()
    const status = await getBackupStatus()
    return NextResponse.json(status)
  } catch (e) {
    const message = e instanceof Error ? e.message : "فشل النسخ الاحتياطي"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
