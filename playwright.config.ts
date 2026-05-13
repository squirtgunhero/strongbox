import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for StrongBox smoke + critical-flow e2e tests.
 *
 * Usage:
 *   PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e
 *
 * In CI, point PLAYWRIGHT_BASE_URL at a deployed preview URL. Locally,
 * the webServer block boots `npm run dev` automatically if it isn't already
 * running.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  timeout: 30_000,

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        port: 3000,
        reuseExistingServer: !process.env.CI,
        timeout: 90_000,
      },
});
