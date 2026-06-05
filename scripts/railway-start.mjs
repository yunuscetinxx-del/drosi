import { execSync, spawn } from "node:child_process"

const MAX_ATTEMPTS = 30
const RETRY_DELAY_MS = 3000

function tryDbPush() {
  try {
    execSync("npx prisma db push --accept-data-loss", {
      stdio: "inherit",
      env: process.env,
    })
    return true
  } catch {
    return false
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

console.log("[start] Waiting for PostgreSQL…")

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  if (tryDbPush()) {
    console.log("[start] Database ready — starting Next.js…")
    const child = spawn("npx", ["next", "start"], {
      stdio: "inherit",
      env: process.env,
      shell: true,
    })
    child.on("exit", (code) => process.exit(code ?? 0))
    break
  }

  if (attempt === MAX_ATTEMPTS) {
    console.error(
      "[start] Cannot reach database after retries. On Railway: restart the Postgres service and verify DATABASE_URL."
    )
    process.exit(1)
  }

  console.log(`[start] Database unreachable (${attempt}/${MAX_ATTEMPTS}), retry in ${RETRY_DELAY_MS / 1000}s…`)
  await sleep(RETRY_DELAY_MS)
}
