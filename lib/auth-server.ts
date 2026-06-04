import { cookies, headers } from "next/headers"
import type { NextRequest } from "next/server"
import { AUTH_SESSION_COOKIE } from "@/lib/auth-constants"
import { verifySessionToken } from "@/lib/auth-session"

export type SessionUser = {
  userId: string
  email: string
  isAdmin: boolean
}

function tokenFromAuthorizationHeader(value: string | null): string | null {
  if (!value) return null
  const m = value.match(/^Bearer\s+(.+)$/i)
  return m?.[1]?.trim() || null
}

export async function getSessionFromCookies(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value
  if (!token) return null
  return verifySessionToken(token)
}

/** جلسة من كوكي المتصفح أو Authorization: Bearer (تطبيق Flutter). */
export async function getSessionFromRequest(req?: NextRequest): Promise<SessionUser | null> {
  if (req) {
    const bearer = tokenFromAuthorizationHeader(req.headers.get("authorization"))
    if (bearer) {
      const session = await verifySessionToken(bearer)
      if (session) return session
    }
    const cookieToken = req.cookies.get(AUTH_SESSION_COOKIE)?.value
    if (cookieToken) {
      const session = await verifySessionToken(cookieToken)
      if (session) return session
    }
    return null
  }

  const h = await headers()
  const bearer = tokenFromAuthorizationHeader(h.get("authorization"))
  if (bearer) {
    const session = await verifySessionToken(bearer)
    if (session) return session
  }

  return getSessionFromCookies()
}
