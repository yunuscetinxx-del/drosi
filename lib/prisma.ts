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

/**
 * يُرجع client واحداً محفوظاً عالمياً (singleton).
 * لا يُستدعى عند تحميل الوحدة — فقط عند أول وصول فعلي عبر Proxy —
 * مما يمنع فشل البناء على Railway حين لا تكون DATABASE_URL متاحة.
 */
function getPrismaClient(): PrismaClient {
  const databaseUrl = resolveDatabaseUrl()

  if (
    globalForPrisma.prisma &&
    globalForPrisma.prismaDatabaseUrl === databaseUrl
  ) {
    return globalForPrisma.prisma
  }

  if (globalForPrisma.prisma && globalForPrisma.prismaDatabaseUrl !== databaseUrl) {
    void globalForPrisma.prisma.$disconnect()
  }

  const client = createPrismaClient(databaseUrl)
  globalForPrisma.prisma = client
  globalForPrisma.prismaDatabaseUrl = databaseUrl
  return client
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (prop === "then") return undefined
    return Reflect.get(getPrismaClient(), prop)
  },
})
