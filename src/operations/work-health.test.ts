import { describe, expect, it } from "vitest";

import {
  BACKUP_COMPLETION_LIMIT_MILLISECONDS,
  backupCompletionPath,
  evaluateWorkHealth,
  OUTBOX_BACKLOG_LIMIT_MILLISECONDS,
  probeBackupCompletion,
  type DatabaseWorkState,
} from "./work-health";

const now = new Date("2026-08-31T12:00:00.000Z");

function database(overrides: Partial<DatabaseWorkState> = {}): DatabaseWorkState {
  return {
    outboxBacklog: 0,
    outboxRepeatedFailures: 0,
    outboxDead: 0,
    oldestOutboxCreatedAt: null,
    workerDead: 0,
    ...overrides,
  };
}

describe("redacted work-health authority", () => {
  it("returns healthy without identifiers or topology", () => {
    const result = evaluateWorkHealth(database(), "healthy", now);
    expect(result).toMatchObject({ status: "healthy", outbox: "healthy", worker: "healthy", backup: "healthy" });
    expect(JSON.stringify(result)).not.toMatch(/id|path|host|inquiry|contact|asset|secret/iu);
  });

  it.each([
    ["backlog", database({ outboxBacklog: 1, oldestOutboxCreatedAt: new Date(now.getTime() - OUTBOX_BACKLOG_LIMIT_MILLISECONDS - 1) }), "backlog"],
    ["failure", database({ outboxRepeatedFailures: 1 }), "failed"],
    ["outbox dead", database({ outboxDead: 1 }), "dead"],
  ] as const)("reports %s as unhealthy", (_name, state, expected) => {
    expect(evaluateWorkHealth(state, "healthy", now)).toMatchObject({ status: "unhealthy", outbox: expected });
  });

  it("reports terminal Worker work and backup failures without row details", () => {
    expect(evaluateWorkHealth(database({ workerDead: 2 }), "healthy", now)).toMatchObject({
      status: "unhealthy", worker: "dead", counts: { workerDead: 2 },
    });
    for (const backup of ["missing", "stale", "invalid"] as const) {
      expect(evaluateWorkHealth(database(), backup, now)).toMatchObject({ status: "unhealthy", backup });
    }
  });

  it("validates exact environment-specific backup completion evidence", async () => {
    const valid = JSON.stringify({
      schemaVersion: 1,
      environment: "staging",
      kind: "daily_database",
      status: "complete",
      completedAt: new Date(now.getTime() - BACKUP_COMPLETION_LIMIT_MILLISECONDS).toISOString(),
    });
    await expect(probeBackupCompletion({ environment: "staging", now, readText: async (path) => {
      expect(path).toBe(backupCompletionPath("staging"));
      return valid;
    } })).resolves.toBe("healthy");
    await expect(probeBackupCompletion({ environment: "production", now, readText: async () => {
      throw new Error("synthetic missing");
    } })).resolves.toBe("missing");
    await expect(probeBackupCompletion({ environment: "test", now, readText: async () => "" })).resolves.toBe("not_required");
  });

  it("rejects stale, cross-environment and extended marker shapes", async () => {
    const marker = (value: Record<string, unknown>) => probeBackupCompletion({
      environment: "production",
      now,
      readText: async () => JSON.stringify(value),
    });
    await expect(marker({ schemaVersion: 1, environment: "production", kind: "daily_database", status: "complete", completedAt: new Date(now.getTime() - BACKUP_COMPLETION_LIMIT_MILLISECONDS - 1).toISOString() })).resolves.toBe("stale");
    await expect(marker({ schemaVersion: 1, environment: "staging", kind: "daily_database", status: "complete", completedAt: now.toISOString() })).resolves.toBe("invalid");
    await expect(marker({ schemaVersion: 1, environment: "production", kind: "daily_database", status: "complete", completedAt: now.toISOString(), objectKey: "private/customer" })).resolves.toBe("invalid");
  });
});
