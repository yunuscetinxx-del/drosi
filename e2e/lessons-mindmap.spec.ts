import { test, expect } from "@playwright/test"
import { createLesson, openMindMapTabWithMap } from "./helpers/lesson"

const lessonTitle = () => `درس E2E ${Date.now()}`

test.describe("الدروس والخريطة الذهنية", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await expect(page).not.toHaveURL(/\/login/)
  })

  test("إنشاء درس وفتح تبويب الخريطة", async ({ page }) => {
    const title = lessonTitle()
    await createLesson(page, title)
    await openMindMapTabWithMap(page)

    await expect(
      page.getByRole("toolbar", { name: /أدوات الخريطة الذهنية|mind map tools/i })
    ).toBeVisible({ timeout: 15_000 })
  })

  test("شريط الخريطة مضغوط: قائمة أدوات وليس صف أزرار طويل", async ({ page }) => {
    const title = `${lessonTitle()}-map`
    await createLesson(page, title)
    await openMindMapTabWithMap(page)

    const toolsButton = page.getByTitle(/أدوات الخريطة|map tools|kartenwerkzeuge/i)
    await expect(toolsButton).toBeVisible({ timeout: 15_000 })

    const importButton = page.getByRole("button", { name: /من النقاط الرئيسية|from key points/i })
    await expect(importButton).toHaveCount(0)

    await toolsButton.click()
    await expect(
      page.getByRole("menuitem", { name: /من النقاط الرئيسية|from key points/i })
    ).toBeVisible()
  })

  test("استيراد خريطة من النقاط الرئيسية", async ({ page }) => {
    const title = `${lessonTitle()}-kp`
    await createLesson(page, title)

    await page.getByRole("tab", { name: /النقاط|key points/i }).click()
    const keyPointInput = page.getByPlaceholder(/نقطة رئيسية|key point/i)
    await keyPointInput.fill("مفهوم أول")
    await keyPointInput.press("Enter")
    await expect(page.locator('input[value="مفهوم أول"]')).toBeVisible()

    await openMindMapTabWithMap(page)
    await page.getByTitle(/أدوات الخريطة|map tools/i).click()
    await page
      .getByRole("menuitem", { name: /من النقاط الرئيسية|from key points/i })
      .click()

    await expect(page.getByText("مفهوم أول")).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole("toolbar", { name: /أدوات الخريطة الذهنية|mind map tools/i })
    ).toBeVisible()
  })
})
