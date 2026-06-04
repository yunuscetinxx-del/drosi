import { test, expect } from "@playwright/test"

test.describe("تسجيل الدخول (عام)", () => {
  test("يحوّل الزائر غير المسجّل إلى صفحة الدخول", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveURL(/\/login/)
  })

  test("تعرض صفحة الدخول الحقول الأساسية", async ({ page }) => {
    await page.goto("/login")
    await expect(page.locator("#email")).toBeVisible()
    await expect(page.locator("#password")).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  })

  test("رابط المشاركة يفتح بدون تسجيل دخول", async ({ page }) => {
    await page.goto("/share/invalid-token-for-e2e")
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator("body")).toContainText(/درس|lesson|مشاركة|share/i)
  })
})
