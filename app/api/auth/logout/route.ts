import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { AUTH_SESSION_COOKIE } from "@/lib/auth-constants"

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.set(AUTH_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: process.env.NODE_ENV === "production",
  })
  return NextResponse.json({ ok: true })
}
