import type { Page } from "@playwright/test"

/** يفتح تبويب الخريطة وينشئ خريطة إن لم تكن موجودة */
export async function openMindMapTabWithMap(page: Page) {
  await page.getByRole("tab", { name: /الخريطة|mind map/i }).click()

  const createMap = page
    .getByRole("button", { name: /أنشئ أول خريطة|خريطة جديدة|create first|new map/i })
    .first()

  if (await createMap.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await createMap.click()
  }
}

export async function createLesson(
  page: Page,
  title: string,
  subject = "اختبار"
) {
  await page.getByRole("button", { name: /درس جديد|new lesson/i }).click()
  const dialog = page.getByRole("dialog")
  await dialog.locator("#title").fill(title)
  await dialog.locator("#subject").fill(subject)
  await dialog.getByRole("button", { name: /إضافة الدرس|add lesson/i }).click()
  await dialog.waitFor({ state: "hidden", timeout: 15_000 })
  await page.getByText(title).click()
}
