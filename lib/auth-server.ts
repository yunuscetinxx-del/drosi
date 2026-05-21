import { cookies } from "next/headers"
import { AUTH_SESSION_COOKIE } from "@/lib/auth-constants"
import { verifySessionToken } from "@/lib/auth-session"

export async function getSessionFromCookies(): Promise<{ userId: string; email: string } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value
  if (!token) return null
  return verifySessionToken(token)
}
