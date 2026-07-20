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

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ")
}

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string; name?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : ""
  const password = typeof body.password === "string" ? body.password : ""
  const name = typeof body.name === "string" ? normalizeName(body.name) : ""

  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Name is required (2+ characters)" }, { status: 400 })
  }
  if (name.length > 80) {
    return NextResponse.json({ error: "Name is too long" }, { status: 400 })
  }
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  let user
  try {
    user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        lessons: "[]",
        isAdmin: false,
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "هذا البريد مسجّل مسبقاً" }, { status: 409 })
    }
    console.error("[register]", e)
    return NextResponse.json({ error: "تعذّر إنشاء الحساب" }, { status: 500 })
  }

  const token = await createSessionToken(user.id, user.email, false)
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
    user: { name: user.name, email: user.email, isAdmin: false },
  })
}
