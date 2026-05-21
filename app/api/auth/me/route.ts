import { NextResponse } from "next/server"
import { getSessionFromCookies } from "@/lib/auth-server"

export async function GET() {
  const session = await getSessionFromCookies()
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 })
  }
  return NextResponse.json({ user: { email: session.email } })
}
