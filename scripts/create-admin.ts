import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const db = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
})

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@drosi.de"
  const password = process.env.ADMIN_PASSWORD ?? "AdminPass12345"
  const hash = await bcrypt.hash(password, 10)
  const user = await db.user.upsert({
    where: { email },
    update: { passwordHash: hash, isAdmin: true },
    create: { email, passwordHash: hash, isAdmin: true, lessons: [] },
  })
  console.log(`✓ User ${user.email} (isAdmin=${user.isAdmin}) ready.`)
  await db.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
