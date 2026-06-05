function isLocalHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname.endsWith(".local")
  )
}

/** عنوان الموقع العام — لروابط المشاركة والروابط المطلقة */
export function resolveAppBaseUrl(requestOrigin?: string): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, "")

  const railway = process.env.RAILWAY_PUBLIC_DOMAIN?.trim()
  if (railway) return `https://${railway.replace(/\/$/, "")}`

  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`

  if (requestOrigin) {
    try {
      const u = new URL(requestOrigin)
      if (!isLocalHost(u.hostname)) return requestOrigin.replace(/\/$/, "")
    } catch {
      /* ignore */
    }
  }

  return ""
}

export function buildShareUrl(token: string, requestOrigin?: string): string {
  const base = resolveAppBaseUrl(requestOrigin)
  if (base) return `${base}/share/${token}`
  return `/share/${token}`
}
