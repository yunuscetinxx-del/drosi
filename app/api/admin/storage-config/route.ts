import { NextRequest, NextResponse } from "next/server"
import fs from "node:fs/promises"
import { getSessionFromRequest } from "@/lib/auth-server"
import { prisma, disconnectPrisma } from "@/lib/prisma"
import {
  getStorageConfig,
  getDefaultDataDir,
  relocateStorage,
} from "@/lib/local-storage-config"

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
  const config = getStorageConfig()
  return NextResponse.json({
    dataDir: config.dataDir,
    defaultDataDir: getDefaultDataDir(),
  })
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: { dataDir?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 })
  }

  const dataDir = typeof body.dataDir === "string" ? body.dataDir.trim() : ""
  if (!dataDir) {
    return NextResponse.json({ error: "المسار مطلوب" }, { status: 400 })
  }
  if (!/^([a-zA-Z]:[\\/]|\\\\|\/)/.test(dataDir)) {
    return NextResponse.json({ error: "أدخل مساراً مطلقاً صحيحاً (مثال: D:\\DrosiData)" }, { status: 400 })
  }

  try {
    // نتأكد من إمكانية الكتابة في المسار الجديد قبل نقل أي بيانات
    await fs.mkdir(dataDir, { recursive: true })
    await fs.access(dataDir)
  } catch {
    return NextResponse.json({ error: "تعذّر الوصول إلى هذا المسار أو إنشاؤه" }, { status: 400 })
  }

  try {
    // نغلق اتصال قاعدة البيانات الحالي قبل نقل ملف SQLite لتفادي القفل
    await disconnectPrisma()
    const updated = await relocateStorage(dataDir)
    return NextResponse.json({
      dataDir: updated.dataDir,
      defaultDataDir: getDefaultDataDir(),
    })
  } catch (e) {
    console.error("[storage-config PUT]", e)
    const message = e instanceof Error ? e.message : "فشل نقل البيانات"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
