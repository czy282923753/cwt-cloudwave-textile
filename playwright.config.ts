import { defineConfig, devices } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const e2eRoot = mkdtempSync(join(tmpdir(), "cwt-phase1a-e2e-"));
process.env.CWT_E2E_TEMP_ROOT = e2eRoot;

export default defineConfig({
  testDir: "./tests/e2e",
  globalTeardown: "./tests/e2e/global-teardown.ts",
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
      "pnpm db:migrate && pnpm db:seed && pnpm db:seed:fixtures && pnpm exec tsx scripts/seed-e2e-retryable-asset.ts && pnpm start --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      APP_ENV: "test",
      NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3100",
      NON_PRODUCTION_NOINDEX: "true",
      PGLITE_DATA_DIR: join(e2eRoot, "database"),
      PUBLIC_STORAGE_ROOT: join(e2eRoot, "storage", "public"),
      PRIVATE_STORAGE_ROOT: join(e2eRoot, "storage", "private"),
      IMPORT_STORAGE_ROOT: join(e2eRoot, "storage", "imports"),
      AUTH_COOKIE_NAME: "cwt_e2e_session",
    },
  },
});
