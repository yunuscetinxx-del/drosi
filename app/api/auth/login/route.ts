import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { AUTH_SESSION_COOKIE } from "@/lib/auth-constants"
import { createSessionToken } from "@/lib/auth-session"
import { prisma } from "@/lib/prisma"

const SESSION_MAX_AGE = 60 * 60 * 24 * 14

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 })
  }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : ""
  const password = typeof body.password === "string" ? body.password : ""

  if (!email || !password) {
    return NextResponse.json({ error: "البريد وكلمة المرور مطلوبان" }, { status: 400 })
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 })
    }

    const match = await bcrypt.compare(password, user.passwordHash)
    if (!match) {
      return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 })
    }

    const token = await createSessionToken(user.id, user.email, user.isAdmin)
    const cookieStore = await cookies()
    cookieStore.set(AUTH_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
      secure: process.env.NODE_ENV === "production",
    })

    return NextResponse.json({
      ok: true,
      token,
      user: { email: user.email, isAdmin: user.isAdmin },
    })
  } catch (e) {
    console.error("[login]", e)
    return NextResponse.json({ error: "تعذّر الاتصال بقاعدة البيانات" }, { status: 500 })
  }
}
