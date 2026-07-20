import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import fs from "node:fs/promises"
import path from "node:path"
import { getSessionFromRequest } from "@/lib/auth-server"
import { getUploadsDir } from "@/lib/local-storage-config"
import { MIME_EXT } from "@/lib/local-files"

const MAX_BYTES = 15 * 1024 * 1024 // 15MB
const DATA_URL_RE = /^data:([\w/+.-]+);base64,(.+)$/

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 })
  }

  let body: { dataUrl?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 })
  }

  const match = typeof body.dataUrl === "string" ? body.dataUrl.match(DATA_URL_RE) : null
  if (!match) {
    return NextResponse.json({ error: "صورة غير صالحة" }, { status: 400 })
  }

  const [, mime, base64] = match
  const ext = MIME_EXT[mime.toLowerCase()]
  if (!ext) {
    return NextResponse.json({ error: "نوع صورة غير مدعوم" }, { status: 400 })
  }

  let buffer: Buffer
  try {
    buffer = Buffer.from(base64, "base64")
  } catch {
    return NextResponse.json({ error: "صورة غير صالحة" }, { status: 400 })
  }

  if (buffer.byteLength === 0 || buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "حجم الصورة غير صالح (الحد الأقصى 15MB)" }, { status: 413 })
  }

  try {
    const userDir = path.join(getUploadsDir(), session.userId)
    await fs.mkdir(userDir, { recursive: true })
    const filename = `${randomUUID()}.${ext}`
    await fs.writeFile(path.join(userDir, filename), buffer)

    return NextResponse.json({
      url: `/api/files/${session.userId}/${filename}`,
    })
  } catch (e) {
    console.error("[uploads POST]", e)
    return NextResponse.json({ error: "تعذّر حفظ الملف" }, { status: 500 })
  }
}
