import path from "node:path"
import fs from "node:fs/promises"
import { getUploadsDir } from "@/lib/local-storage-config"

const EXT_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
}

export const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
}

export function mimeFromExt(ext: string): string {
  return EXT_MIME[ext.toLowerCase()] ?? "application/octet-stream"
}

export const LOCAL_FILES_URL_PREFIX = "/api/files/"

export function isLocalFileUrl(url: string): boolean {
  return url.startsWith(LOCAL_FILES_URL_PREFIX)
}

/**
 * يحوّل أجزاء المسار (بعد /api/files/) إلى مسار فعلي داخل مجلد الرفع،
 * مع منع الخروج خارج المجلد (path traversal).
 */
export function resolveLocalFilePathFromSegments(segments: string[]): string | null {
  if (segments.length === 0) return null
  if (segments.some((s) => !s || s === "." || s === "..")) return null

  const uploadsDir = getUploadsDir()
  const normalizedRoot = path.resolve(uploadsDir)
  const target = path.resolve(normalizedRoot, ...segments)

  if (target !== normalizedRoot && !target.startsWith(normalizedRoot + path.sep)) {
    return null
  }
  return target
}

function resolveLocalFileUrlToPath(urlPath: string): string | null {
  if (!isLocalFileUrl(urlPath)) return null
  const rel = urlPath.slice(LOCAL_FILES_URL_PREFIX.length)
  const segments = rel.split("/").filter(Boolean)
  return resolveLocalFilePathFromSegments(segments)
}

/** يقرأ ملفاً محلياً (مساره /api/files/...) ويحوّله إلى data URL — لاستخدامه مع نماذج الذكاء الاصطناعي. */
export async function readLocalFileAsDataUrl(urlPath: string): Promise<string | null> {
  const filePath = resolveLocalFileUrlToPath(urlPath)
  if (!filePath) return null
  try {
    const buf = await fs.readFile(filePath)
    const mime = mimeFromExt(path.extname(filePath))
    return `data:${mime};base64,${buf.toString("base64")}`
  } catch {
    return null
  }
}
