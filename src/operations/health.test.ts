import { describe, expect, it, vi } from "vitest";

import {
  assertReadinessConfiguration,
  checkReadiness,
  HEALTH_CHECK_TIMEOUT_MILLISECONDS,
  processLiveness,
  READINESS_COMPONENTS,
  type ReadinessDependencies,
} from "./health";

function dependencies(overrides: Partial<ReadinessDependencies> = {}): ReadinessDependencies {
  const pass = vi.fn(async () => undefined);
  return {
    configuration: pass,
    storage: pass,
    database: pass,
    valkey: pass,
    localDependencies: pass,
    ...overrides,
  };
}

describe("operations health authority", () => {
  it("keeps liveness process-only", () => {
    const probes = dependencies();
    expect(processLiveness()).toEqual({ status: "live" });
    expect(Object.values(probes).every((probe) => vi.mocked(probe).mock.calls.length === 0)).toBe(true);
  });

  it("returns only fixed redacted component states when all local dependencies pass", async () => {
    await expect(checkReadiness(dependencies())).resolves.toEqual({
      status: "ready",
      checks: Object.fromEntries(READINESS_COMPONENTS.map((component) => [component, "pass"])),
    });
  });

  it("requires the exact protected local dependency drivers and keeps local/test permissive", () => {
    const protectedConfiguration = {
      APP_ENV: "production" as const,
      DATABASE_DRIVER: "postgres" as const,
      STORAGE_DRIVER: "local" as const,
      SHARED_RATE_LIMIT_DRIVER: "valkey" as const,
      FILE_SCAN_DRIVER: "cloudmersive" as const,
      TRUSTED_PROXY_MODE: "cloudflare" as const,
      MONITORING_DRIVER: "external" as const,
    };
    expect(() => assertReadinessConfiguration(protectedConfiguration)).not.toThrow();
    for (const invalid of [
      { ...protectedConfiguration, DATABASE_DRIVER: "pglite" as const },
      { ...protectedConfiguration, STORAGE_DRIVER: "s3" as const },
      { ...protectedConfiguration, SHARED_RATE_LIMIT_DRIVER: "memory" as const },
      { ...protectedConfiguration, FILE_SCAN_DRIVER: "development" as const },
      { ...protectedConfiguration, TRUSTED_PROXY_MODE: "none" as const },
      { ...protectedConfiguration, MONITORING_DRIVER: "log" as const },
    ]) expect(() => assertReadinessConfiguration(invalid)).toThrow(/not ready/u);
    expect(() => assertReadinessConfiguration({ ...protectedConfiguration, APP_ENV: "test", DATABASE_DRIVER: "pglite" })).not.toThrow();
  });

  it.each([
    "configuration",
    "storage",
    "database",
    "valkey",
    "localDependencies",
  ] as const)("fails closed when %s fails without exposing its error", async (component) => {
    const result = await checkReadiness(dependencies({
      [component]: vi.fn(async () => { throw new Error("postgres://user:secret@private-host/customer-id"); }),
    }));
    expect(result.status).toBe("not_ready");
    expect(JSON.stringify(result)).not.toMatch(/secret|private-host|customer-id|postgres:/u);
  });

  it("bounds hung checks and rejects invalid deadline configuration", async () => {
    vi.useFakeTimers();
    const pending = checkReadiness(dependencies({
      database: vi.fn(() => new Promise<void>(() => undefined)),
    }), 25);
    await vi.advanceTimersByTimeAsync(25);
    await expect(pending).resolves.toMatchObject({ status: "not_ready", checks: { database: "fail" } });
    vi.useRealTimers();
    await expect(checkReadiness(dependencies(), 0)).rejects.toThrow(/timeout is invalid/u);
    expect(HEALTH_CHECK_TIMEOUT_MILLISECONDS).toBe(2_000);
  });
});
