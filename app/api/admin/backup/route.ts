import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth-server"
import { requireAdmin } from "@/lib/admin-auth"
import {
  exportSystemBackup,
  getSystemBackupStats,
  importSystemBackup,
  validateSystemBackup,
} from "@/lib/system-backup"

export const maxDuration = 300

async function adminSession(req?: NextRequest) {
  const session = await getSessionFromRequest(req)
  return requireAdmin(session)
}

export async function GET(req: NextRequest) {
  const session = await adminSession(req)
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const backup = await exportSystemBackup()
    const stats = getSystemBackupStats(backup)
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")
    const filename = `drosi-backup-${stamp}.json`
    const body = JSON.stringify(backup)

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Backup-Users": String(stats.users),
        "X-Backup-Lessons": String(stats.lessons),
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Export failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await adminSession(req)
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const contentType = req.headers.get("content-type") ?? ""
    let payload: unknown
    let confirm = ""

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData()
      confirm = String(form.get("confirm") ?? "")
      const file = form.get("file")
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "ملف النسخة الاحتياطية مطلوب" }, { status: 400 })
      }
      const text = await file.text()
      payload = JSON.parse(text)
    } else {
      const body = (await req.json()) as { confirm?: string; backup?: unknown }
      confirm = body.confirm ?? ""
      payload = body.backup ?? body
    }

    if (confirm !== "RESTORE_ALL") {
      return NextResponse.json(
        { error: 'اكتب RESTORE_ALL للتأكيد في حقل التأكيد' },
        { status: 400 }
      )
    }

    const backup = validateSystemBackup(payload)
    const stats = await importSystemBackup(backup)

    return NextResponse.json({
      ok: true,
      message: "تم استيراد النسخة الاحتياطية بنجاح",
      stats,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import failed"
    const status = message.includes("JSON") ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
