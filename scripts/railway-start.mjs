import { execSync, spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")

const MAX_ATTEMPTS = 30
const RETRY_DELAY_MS = 3000

function maskDatabaseUrl(url) {
  try {
    const u = new URL(url)
    if (u.password) u.password = "***"
    return u.toString()
  } catch {
    return "(invalid)"
  }
}

function tryMigrate() {
  const prismaCli = resolve(root, "node_modules/prisma/build/index.js")
  try {
    if (existsSync(prismaCli)) {
      execSync(`node "${prismaCli}" migrate deploy`, {
        stdio: "inherit",
        env: process.env,
        cwd: root,
        shell: true,
      })
    } else {
      execSync("npx prisma migrate deploy", {
        stdio: "inherit",
        env: process.env,
        cwd: root,
        shell: true,
      })
    }
    return true
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[start] prisma migrate deploy failed:", msg.split("\n")[0])
    return false
  }
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
