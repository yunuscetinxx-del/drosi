import type { Page } from "@playwright/test"

export function getTestCredentials(): { email: string; password: string } | null {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL ?? process.env.ADMIN_EMAIL
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD ?? process.env.ADMIN_PASSWORD
  if (!email?.trim() || !password?.trim()) return null
  return { email: email.trim(), password: password.trim() }
}

export async function loginViaUi(
  page: Page,
  credentials: { email: string; password: string },
  nextPath = "/"
) {
  await page.goto(`/login?next=${encodeURIComponent(nextPath)}`)
  await page.locator("#email").fill(credentials.email)
  await page.locator("#password").fill(credentials.password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 })
}
