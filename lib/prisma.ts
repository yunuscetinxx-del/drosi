import { PrismaClient } from "@prisma/client"
import { resolveDatabaseUrl } from "@/lib/database-url"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaDatabaseUrl: string | undefined
}

function createPrismaClient(databaseUrl: string): PrismaClient {
  const client = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })

  // PRAGMA (مع SET) يُرجع صفاً بالقيمة الجديدة في SQLite، لذا نستخدم queryRaw لا executeRaw
  // (executeRaw يرفض أي استعلام يُرجع نتائج تحت SQLite).
  // WAL mode: يقلّل تعارض القفل بين القراءة والكتابة المتزامنة. إعداد دائم في ملف القاعدة —
  // تكراره عند كل اتصال غير ضار (idempotent).
  void client.$queryRawUnsafe("PRAGMA journal_mode = WAL;").catch(() => {})
  // busy_timeout: ينتظر بدل فشل فوري برسالة "database is locked" عند تزاحم كتابة نادر.
  void client.$queryRawUnsafe("PRAGMA busy_timeout = 5000;").catch(() => {})
  // synchronous=NORMAL: التوازن الموصى به مع WAL بين الأمان والأداء (توصية SQLite/Prisma الرسمية).
  void client.$queryRawUnsafe("PRAGMA synchronous = NORMAL;").catch(() => {})

  return client
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

/** يغلق اتصال Prisma الحالي — يُستخدم قبل نقل ملف قاعدة البيانات إلى مكان آخر. */
export async function disconnectPrisma(): Promise<void> {
  if (globalForPrisma.prisma) {
    await globalForPrisma.prisma.$disconnect()
    globalForPrisma.prisma = undefined
    globalForPrisma.prismaDatabaseUrl = undefined
  }
}
