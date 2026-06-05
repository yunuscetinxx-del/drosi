import { execSync, spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")

const MAX_ATTEMPTS = 30
const RETRY_DELAY_MS = 3000

// All migration names in chronological order — used for baselining an
// existing database that pre-dates the _prisma_migrations table.
const MIGRATIONS = [
  "20260221140000_init",
  "20260222103000_add_user_is_admin",
  "20260523120000_add_lesson_share",
  "20260530120000_add_lesson_share_scope",
  "20260605120000_add_gemini_api_key",
]

function maskDatabaseUrl(url) {
  try {
    const u = new URL(url)
    if (u.password) u.password = "***"
    return u.toString()
  } catch {
    return "(invalid)"
  }
}

/**
 * Run a Prisma CLI command, preferring the local binary over npx.
 * Returns { success, stdout, stderr, output } where output is the combined
 * stdout+stderr string (useful for error-code detection).
 */
function runPrisma(args) {
  const prismaCli = resolve(root, "node_modules/prisma/build/index.js")
  const cmd = existsSync(prismaCli)
    ? `node "${prismaCli}" ${args}`
    : `npx prisma ${args}`
  try {
    const output = execSync(cmd, {
      env: process.env,
      cwd: root,
      shell: true,
      // Capture output so we can inspect error codes; still pipe to console
      // via the returned string when needed.
      stdio: ["inherit", "pipe", "pipe"],
    })
    return { success: true, output: output?.toString() ?? "" }
  } catch (err) {
    const stdout = err.stdout?.toString() ?? ""
    const stderr = err.stderr?.toString() ?? ""
    const output = stdout + stderr
    return { success: false, output, err }
  }
}

/**
 * Baseline all known migrations as "already applied" so that
 * `prisma migrate deploy` can proceed on a database whose schema was
 * created outside of Prisma's migration history (P3005).
 */
function baselineMigrations() {
  console.log(
    "[start] Detected non-empty database without migration history (P3005)."
  )
  console.log(
    "[start] Baselining all existing migrations as already applied…"
  )
  for (const migration of MIGRATIONS) {
    console.log(`[start]   → resolving ${migration} as applied`)
    const { success, output } = runPrisma(
      `migrate resolve --applied "${migration}"`
    )
    if (!success) {
      // "already recorded" is fine — the migration was already in the table
      if (output.includes("already") || output.includes("recorded")) {
        console.log(`[start]     (already recorded, skipping)`)
      } else {
        console.error(
          `[start] Failed to baseline migration ${migration}:`,
          output.split("\n")[0]
        )
        return false
      }
    }
  }
  console.log("[start] Baseline complete.")
  return true
}

function tryMigrate() {
  const { success, output } = runPrisma("migrate deploy")

  if (success) return true

  // P3005: database schema is not empty — the _prisma_migrations table does
  // not exist yet but the schema was already created by a previous deploy.
  // Baseline all migrations so Prisma knows the current state, then retry.
  if (output.includes("P3005")) {
    if (!baselineMigrations()) return false
    // Retry once after baselining
    const retry = runPrisma("migrate deploy")
    if (retry.success) return true
    console.error(
      "[start] prisma migrate deploy failed after baselining:",
      retry.output.split("\n")[0]
    )
    return false
  }

  console.error(
    "[start] prisma migrate deploy failed:",
    output.split("\n")[0]
  )
  return false
}

function startNext() {
  const port = process.env.PORT || "3000"
  const hostname = process.env.HOSTNAME || "0.0.0.0"
  const nextBin = resolve(root, "node_modules/next/dist/bin/next")

  const cmd = existsSync(nextBin) ? "node" : "npx"
  const args = existsSync(nextBin)
    ? [nextBin, "start", "-H", hostname, "-p", port]
    : ["next", "start", "-H", hostname, "-p", port]

  console.log(`[start] Starting Next.js on http://${hostname}:${port}`)

  const child = spawn(cmd, args, {
    stdio: "inherit",
    env: { ...process.env, HOSTNAME: hostname, PORT: port },
    cwd: root,
    shell: false,
  })

  child.on("error", (err) => {
    console.error("[start] Failed to launch Next.js:", err.message)
    process.exit(1)
  })

  child.on("exit", (code, signal) => {
    if (signal) console.error(`[start] Next.js stopped (signal: ${signal})`)
    process.exit(code ?? 1)
  })
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const dbUrl = process.env.DATABASE_URL?.trim()
if (!dbUrl) {
  console.error(
    "[start] DATABASE_URL is missing. On Railway: Variables → New Variable → Reference → Postgres → DATABASE_URL"
  )
  process.exit(1)
}

console.log("[start] DATABASE_URL:", maskDatabaseUrl(dbUrl))
console.log("[start] Applying migrations (waiting for PostgreSQL if needed)…")

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  if (tryMigrate()) {
    console.log("[start] Database ready.")
    startNext()
    break
  }

  if (attempt === MAX_ATTEMPTS) {
    console.error(
      "[start] Cannot reach database after retries. Check Railway deploy logs and verify:"
    )
    console.error("  • Postgres service status is Running")
    console.error("  • Web service DATABASE_URL references Postgres (not an old/deleted service)")
    console.error("  • Redeploy after fixing variables")
    process.exit(1)
  }

  console.log(
    `[start] Database unreachable (${attempt}/${MAX_ATTEMPTS}), retry in ${RETRY_DELAY_MS / 1000}s…`
  )
  await sleep(RETRY_DELAY_MS)
}
