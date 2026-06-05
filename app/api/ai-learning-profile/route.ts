import { NextRequest, NextResponse } from "next/server"
import { parseLearningProfile, learningProfileToMarkdown } from "@/lib/ai-learning-profile"
import { getSessionFromRequest } from "@/lib/auth-server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 })
  }

  const format = req.nextUrl.searchParams.get("format")
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { aiLearningProfile: true, email: true },
  })
  if (!user) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 })
  }

  const profile = parseLearningProfile(user.aiLearningProfile)

  if (format === "md") {
    const md = learningProfileToMarkdown(user.email, profile, { userId: session.userId })
    return new NextResponse(md, {
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    })
  }

  return NextResponse.json({ profile })
}
