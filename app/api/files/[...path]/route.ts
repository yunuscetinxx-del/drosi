import { NextResponse } from "next/server"
import { existsSync } from "node:fs"
import fs from "node:fs/promises"
import path from "node:path"
import { resolveLocalFilePathFromSegments, mimeFromExt } from "@/lib/local-files"

type RouteCtx = { params: Promise<{ path: string[] }> }

/**
 * يخدم ملفات الرفع المحلية (صور الدروس). أسماء الملفات عشوائية (UUID) وغير قابلة للتخمين،
 * لذا لا تُطلب جلسة دخول هنا — هذا يطابق سلوك النظام الحالي حيث تُضمَّن الصور كاملة
 * (Base64) داخل استجابة روابط المشاركة العامة دون أي مصادقة.
 */
export async function GET(_req: Request, ctx: RouteCtx) {
  const { path: segments } = await ctx.params
  const filePath = resolveLocalFilePathFromSegments(segments ?? [])
  if (!filePath || !existsSync(filePath)) {
    return NextResponse.json({ error: "الملف غير موجود" }, { status: 404 })
  }

  try {
    const buf = await fs.readFile(filePath)
    const mime = mimeFromExt(path.extname(filePath))
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (e) {
    console.error("[files GET]", e)
    return NextResponse.json({ error: "تعذّرت قراءة الملف" }, { status: 500 })
  }
}
