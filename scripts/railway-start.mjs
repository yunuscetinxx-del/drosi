import { execSync, spawn } from "node:child_process"
import { existsSync, readdirSync } from "node:fs"
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

function prismaCli() {
  const bin = resolve(root, "node_modules/prisma/build/index.js")
  return existsSync(bin) ? bin : null
}

function runPrisma(args, { inherit = false } = {}) {
  const cli = prismaCli()
  const cmd = cli ? `node "${cli}" ${args}` : `npx prisma ${args}`
  try {
    const output = execSync(cmd, {
      stdio: inherit ? "inherit" : "pipe",
      env: process.env,
      cwd: root,
      shell: true,
      encoding: "utf8",
    })
    return { ok: true, output: output ?? "" }
  } catch (err) {
    const stdout = err?.stdout?.toString?.() ?? ""
    const stderr = err?.stderr?.toString?.() ?? ""
    const message = err instanceof Error ? err.message : String(err)
    const output = `${stdout}\n${stderr}\n${message}`
    return { ok: false, output }
  }
}

function listMigrationNames() {
  const dir = resolve(root, "prisma/migrations")
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
}

function isConnectionError(output) {
  return (
    output.includes("P1001") ||
    output.includes("Can't reach database server") ||
    output.includes("Connection refused") ||
    output.includes("ECONNREFUSED")
  )
}

function isBaselineError(output) {
  return output.includes("P3005") || output.includes("database schema is not empty")
}

function baselineMigrations() {
  const names = listMigrationNames()
  console.log(
    `[start] Baselining ${names.length} migration(s) for existing production database…`
  )
  for (const name of names) {
    const result = runPrisma(`migrate resolve --applied "${name}"`)
    if (!result.ok && !result.output.includes("already")) {
      console.warn(`[start] migrate resolve ${name}:`, result.output.split("\n")[0])
    }
  }
}

function tryDbPush() {
  console.log("[start] Syncing schema with prisma db push…")
  return runPrisma("db push --accept-data-loss", { inherit: true }).ok
}

function tryDbSetup() {
  let result = runPrisma("migrate deploy", { inherit: true })
  if (result.ok) return { ok: true, retry: false }

  const output = result.output
  if (isConnectionError(output)) {
    console.error("[start] Database connection failed (will retry if attempts remain)")
    return { ok: false, retry: true }
  }

  if (isBaselineError(output)) {
    baselineMigrations()
    result = runPrisma("migrate deploy", { inherit: true })
    if (result.ok) return { ok: true, retry: false }

    if (isConnectionError(result.output)) {
      return { ok: false, retry: true }
    }
  }

  if (tryDbPush()) return { ok: true, retry: false }

  console.error("[start] Database setup failed:", output.split("\n").slice(-4).join("\n"))
  return { ok: false, retry: isConnectionError(output) }
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
    "[start] DATABASE_URL is missing. On Railway: Variables → Reference → Postgres → DATABASE_URL"
  )
  process.exit(1)
}

console.log("[start] DATABASE_URL:", maskDatabaseUrl(dbUrl))
console.log("[start] Preparing database (migrations / baseline / push)…")

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  const result = tryDbSetup()
  if (result.ok) {
    console.log("[start] Database ready.")
    startNext()
    break
  }

  if (!result.retry || attempt === MAX_ATTEMPTS) {
    console.error("[start] Cannot prepare database. Check Railway deploy logs.")
    process.exit(1)
  }

  console.log(
    `[start] Retrying database setup (${attempt}/${MAX_ATTEMPTS}) in ${RETRY_DELAY_MS / 1000}s…`
  )
  await sleep(RETRY_DELAY_MS)
}
