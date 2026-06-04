import "dotenv/config"
import { ensureAdminUserFromEnv } from "../lib/ensure-admin"

async function main() {
  await ensureAdminUserFromEnv()
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
