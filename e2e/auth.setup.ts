import { test as setup } from "@playwright/test"
import path from "path"
import { getTestCredentials, loginViaUi } from "./helpers/auth"

const authFile = path.join(__dirname, "../playwright/.auth/user.json")

setup("authenticate test user", async ({ page }) => {
  const credentials = getTestCredentials()
  if (!credentials) {
    setup.skip(true, "Set PLAYWRIGHT_TEST_EMAIL/PASSWORD or ADMIN_EMAIL/PASSWORD in .env")
  }

  await loginViaUi(page, credentials!)
  await page.context().storageState({ path: authFile })
})
