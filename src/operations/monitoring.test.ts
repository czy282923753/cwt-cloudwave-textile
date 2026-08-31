import { describe, expect, it, vi } from "vitest";

import { createMonitoringReporter, scrubMonitoringAttributes } from "./monitoring";

const release = "a".repeat(40);

describe("provider-neutral monitoring boundary", () => {
  it("attaches environment/release identity and sends only scrubbed fields through a fake transport", async () => {
    const send = vi.fn(async () => undefined);
    const reporter = createMonitoringReporter({ mode: "external", environment: "staging", release, transport: { send } });
    await expect(reporter.report({
      severity: "error",
      code: "work_health.unhealthy",
      attributes: {
        component: "outbox",
        count: 2,
        secret: "synthetic-secret",
        email: "buyer@example.test",
        path: "/srv/private/customer",
        outcome: "customer@example.test",
      },
    })).resolves.toBe("delivered");
    expect(send).toHaveBeenCalledWith({
      schemaVersion: 1,
      environment: "staging",
      release,
      severity: "error",
      code: "work_health.unhealthy",
      attributes: { component: "outbox", count: 2 },
    });
  });

  it("keeps the adapter optional and contains transport failure", async () => {
    const disabled = createMonitoringReporter({ mode: "disabled", environment: "test", release });
    await expect(disabled.report({ severity: "info", code: "health.ready" })).resolves.toBe("disabled");
    const failing = createMonitoringReporter({
      mode: "external", environment: "production", release,
      transport: { send: vi.fn(async () => { throw new Error("provider token and payload"); }) },
    });
    await expect(failing.report({ severity: "warning", code: "health.not_ready" })).resolves.toBe("unavailable");
  });

  it("refuses invalid identity/code and arbitrary or sensitive attributes", async () => {
    expect(() => createMonitoringReporter({ mode: "disabled", environment: "local", release: "latest" })).toThrow(/release identity/u);
    expect(scrubMonitoringAttributes({
      component: "postgres://secret@host/db",
      outcome: "healthy",
      payload: { inquiryId: "synthetic" },
      duration_ms: 12,
    })).toEqual({ outcome: "healthy", duration_ms: 12 });
    const send = vi.fn(async () => undefined);
    const reporter = createMonitoringReporter({ mode: "external", environment: "test", release, transport: { send } });
    await expect(reporter.report({ severity: "error", code: "INVALID CODE" })).resolves.toBe("unavailable");
    expect(send).not.toHaveBeenCalled();
  });
});
