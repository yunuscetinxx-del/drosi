import type { SessionUser } from "@/lib/auth-server"
import { prisma } from "@/lib/prisma"

export async function requireAdmin(session: SessionUser | null): Promise<SessionUser | null> {
  if (!session) return null
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { isAdmin: true, email: true },
  })
  if (!user?.isAdmin) return null
  return { ...session, isAdmin: true, email: user.email }
}
