import { PrismaClient } from "@prisma/client"
import { resolveDatabaseUrl } from "@/lib/database-url"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaDatabaseUrl: string | undefined
}

function createPrismaClient(databaseUrl: string): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url: databaseUrl } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
}

function getPrismaClient(): PrismaClient {
  const databaseUrl = resolveDatabaseUrl()

  if (
    process.env.NODE_ENV !== "production" &&
    globalForPrisma.prisma &&
    globalForPrisma.prismaDatabaseUrl === databaseUrl
  ) {
    return globalForPrisma.prisma
  }

  if (
    process.env.NODE_ENV !== "production" &&
    globalForPrisma.prisma &&
    globalForPrisma.prismaDatabaseUrl !== databaseUrl
  ) {
    void globalForPrisma.prisma.$disconnect()
  }

  const client = createPrismaClient(databaseUrl)

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client
    globalForPrisma.prismaDatabaseUrl = databaseUrl
  }

  return client
}

export const prisma = getPrismaClient()
