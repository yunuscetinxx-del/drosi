import { NextRequest, NextResponse } from "next/server"
import { learningProfileToMarkdown, parseLearningProfile } from "@/lib/ai-learning-profile"
import { requireAdmin } from "@/lib/admin-auth"
import { getSessionFromRequest } from "@/lib/auth-server"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ userId: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const session = await requireAdmin(await getSessionFromRequest(req))
  if (!session) {
    return NextResponse.json({ error: "صلاحية أدمن مطلوبة" }, { status: 403 })
  }

  const { userId } = await params
  const format = req.nextUrl.searchParams.get("format")

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, aiLearningProfile: true, createdAt: true },
  })
  if (!user) {
    return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 })
  }

  const profile = parseLearningProfile(user.aiLearningProfile)

  if (format === "md") {
    const md = learningProfileToMarkdown(user.email, profile, {
      userId: user.id,
      createdAt: user.createdAt.toISOString(),
    })
    const filename = `learning-profile-${user.email.replace(/[@.]/g, "_")}.md`
    return new NextResponse(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  }

  return NextResponse.json({
    userId: user.id,
    email: user.email,
    profile,
    markdown: learningProfileToMarkdown(user.email, profile, { userId: user.id }),
  })
}
