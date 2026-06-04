import { randomBytes } from "crypto"

export function generateShareToken(): string {
  return randomBytes(24).toString("base64url")
}

export function buildShareUrl(token: string, origin?: string): string {
  const base = origin ?? process.env.NEXT_PUBLIC_APP_URL ?? ""
  if (base) return `${base.replace(/\/$/, "")}/share/${token}`
  return `/share/${token}`
}
