import { NextRequest, NextResponse } from "next/server"
import { parseLearningProfile } from "@/lib/ai-learning-profile"
import { requireAdmin } from "@/lib/admin-auth"
import { getSessionFromRequest } from "@/lib/auth-server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await requireAdmin(await getSessionFromRequest(req))
  if (!session) {
    return NextResponse.json({ error: "صلاحية أدمن مطلوبة" }, { status: 403 })
  }

  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? ""

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      aiLearningProfile: true,
      updatedAt: true,
      createdAt: true,
    },
    orderBy: { updatedAt: "desc" },
  })

  const list = users
    .map((u) => {
      const profile = parseLearningProfile(u.aiLearningProfile)
      return {
        userId: u.id,
        email: u.email,
        analysisCount: profile.analysisCount,
        subjects: Object.keys(profile.subjects),
        questionCount: profile.questionHistory.length,
        profileUpdatedAt: profile.updatedAt,
        userUpdatedAt: u.updatedAt.toISOString(),
      }
    })
    .filter((u) => !q || u.email.toLowerCase().includes(q) || u.subjects.some((s) => s.toLowerCase().includes(q)))

  return NextResponse.json({ users: list })
}
