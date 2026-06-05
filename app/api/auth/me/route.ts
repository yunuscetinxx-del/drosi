import { NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth-server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getSessionFromRequest()
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, email: true, isAdmin: true },
  })

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  return NextResponse.json({
    user: { name: user.name, email: user.email, isAdmin: user.isAdmin },
  })
}
