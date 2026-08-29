import { execFileSync } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { createRequire } from "node:module";

const browserPathOverride = "PLAYWRIGHT_BROWSERS_PATH";

if (Object.hasOwn(process.env, browserPathOverride)) {
  process.stderr.write(
    `${browserPathOverride} is set. The default CWT readiness path only accepts Playwright's standard per-user OS cache.\n`,
  );
  process.exit(1);
}

const require = createRequire(import.meta.url);
const playwrightVersion = require("@playwright/test/package.json").version;
const { chromium } = await import("@playwright/test");

let browser;

try {
  // The standard CLI remains the authority for the dependency's expected
  // browser build and install location. Dry-run reports them without download.
  execFileSync("pnpm", ["exec", "playwright", "install", "--dry-run", "chromium"], {
    stdio: "inherit",
  });

  const executablePath = chromium.executablePath();
  await access(executablePath, constants.X_OK);

  browser = await chromium.launch({ headless: true });
  const browserVersion = browser.version();
  await browser.close();
  browser = undefined;

  process.stdout.write(
    `${JSON.stringify(
      {
        status: "ready",
        playwrightVersion,
        platform: process.platform,
        architecture: process.arch,
        browserVersion,
        executablePath,
        cachePolicy: "Playwright default per-user OS cache",
      },
      null,
      2,
    )}\n`,
  );
} catch (error) {
  await browser?.close().catch(() => undefined);
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Playwright readiness failed: ${message}\n`);
  process.stderr.write(
    "Run `pnpm test:e2e:ensure-browser` only if the required browser is absent or the accepted Playwright dependency changed.\n",
  );
  process.exitCode = 1;
}
