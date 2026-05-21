import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { Prisma } from "@prisma/client"
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

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "البريد غير صالح" }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  let user
  try {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        lessons: [],
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "هذا البريد مسجّل مسبقاً" }, { status: 409 })
    }
    console.error("[register]", e)
    return NextResponse.json({ error: "تعذّر إنشاء الحساب" }, { status: 500 })
  }

  const token = await createSessionToken(user.id, user.email)
  const cookieStore = await cookies()
  cookieStore.set(AUTH_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  })

  return NextResponse.json({ ok: true, user: { email: user.email } })
}
