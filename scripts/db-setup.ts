import "dotenv/config"
import { execSync } from "node:child_process"

import { resolveDatabaseUrl } from "@/lib/database-url"

async function main() {
  process.env.DATABASE_URL = resolveDatabaseUrl()
  console.log("[db:setup] الاتصال بـ Supabase Postgres…")

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: process.env,
  })

  execSync("npx tsx scripts/seed-admin.ts", {
    stdio: "inherit",
    env: process.env,
  })

  console.log("[db:setup] تم: الجداول + حساب المدير.")
  console.log(`  البريد: ${process.env.ADMIN_EMAIL ?? "admin@drosi.local"}`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
