import { defineConfig, devices } from "@playwright/test"
import path from "path"
import dotenv from "dotenv"

dotenv.config({ path: path.resolve(__dirname, ".env") })
dotenv.config({ path: path.resolve(__dirname, ".env.local") })

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000"
const authFile = path.join(__dirname, "playwright/.auth/user.json")

const hasAuthCredentials = Boolean(
  (process.env.PLAYWRIGHT_TEST_EMAIL || process.env.ADMIN_EMAIL) &&
    (process.env.PLAYWRIGHT_TEST_PASSWORD || process.env.ADMIN_PASSWORD)
)

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "ar-SA",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "public",
      testMatch: /login\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    ...(hasAuthCredentials
      ? [
          {
            name: "authenticated",
            testMatch: /lessons-mindmap\.spec\.ts/,
            dependencies: ["setup"],
            use: {
              ...devices["Desktop Chrome"],
              storageState: authFile,
            },
          },
        ]
      : []),
  ],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
