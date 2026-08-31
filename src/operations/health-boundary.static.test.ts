import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("health and monitoring call-path isolation", () => {
  it("keeps liveness pure and readiness free of external Provider call paths", async () => {
    const [health, liveRoute, readinessRuntime, workRuntime, monitoring] = await Promise.all([
      readFile(resolve(process.cwd(), "src/operations/health.ts"), "utf8"),
      readFile(resolve(process.cwd(), "src/app/api/health/live/route.ts"), "utf8"),
      readFile(resolve(process.cwd(), "src/operations/readiness-runtime.ts"), "utf8"),
      readFile(resolve(process.cwd(), "src/operations/work-health-runtime.ts"), "utf8"),
      readFile(resolve(process.cwd(), "src/operations/monitoring.ts"), "utf8"),
    ]);
    expect(liveRoute).toContain("processLiveness");
    expect(liveRoute).not.toMatch(/runApplicationReadiness|db|storage|valkey|fetch/iu);
    expect(health).not.toMatch(/\bimport\(|@\/(?:db|storage|security|integrations)|sharp|fetch\(|SENTRY_DSN|SMTP_|COS_/u);
    expect(readinessRuntime).toContain('import "server-only"');
    expect(workRuntime).toContain('import "server-only"');
    expect(`${readinessRuntime}\n${workRuntime}`).not.toMatch(/\bimport\(/u);
    expect(readinessRuntime).not.toMatch(/@\/(?:integrations\/malware|integrations\/email|integrations\/ai)|fetch\(|SENTRY_DSN|SMTP_|COS_/u);
    expect(monitoring).not.toMatch(/fetch\(|@\/integrations|SENTRY_DSN|SMTP_|COS_/u);
  });

  it("binds scheduler work health to a distinct non-success exit without raw errors", async () => {
    const source = await readFile(resolve(process.cwd(), "scripts/process-notification-outbox.ts"), "utf8");
    expect(source).toContain("runApplicationWorkHealth");
    expect(source).toContain("health.status !== \"healthy\") process.exitCode = 2");
    expect(source).toContain("Notification outbox processed:");
    expect(source).toContain("Work health probe failed: unavailable.");
    expect(source).not.toContain("error.message");
  });
});
