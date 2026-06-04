import { NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth-server"

export async function GET() {
  const session = await getSessionFromRequest()
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 })
  }
  return NextResponse.json({
    user: { email: session.email, isAdmin: session.isAdmin },
  })
}
