export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  try {
    const { ensureAdminUserFromEnv } = await import("./lib/ensure-admin")
    await ensureAdminUserFromEnv()
  } catch (e) {
    console.error("[instrumentation] ensureAdminUserFromEnv:", e)
  }
}
