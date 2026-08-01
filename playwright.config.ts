import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      grep: /@(all|desktop)/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      grep: /@(all|mobile)/,
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command:
      "pnpm db:migrate && pnpm db:seed && pnpm db:seed:fixtures && pnpm start --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      APP_ENV: "local",
      NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3100",
      NON_PRODUCTION_NOINDEX: "true",
    },
  },
});
