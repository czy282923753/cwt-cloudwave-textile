import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { notificationOutbox } from "@/db/schema";
import { createTestDatabase } from "@/test/database";

import { loadDatabaseWorkState } from "./work-health-runtime";

describe("work-health database projection", () => {
  it("aggregates backlog, repeated failure and dead work without returning row identity", async () => {
    const connection = await createTestDatabase();
    try {
      const createdAt = new Date("2026-08-31T10:00:00.000Z");
      await connection.db.insert(notificationOutbox).values([
        {
          kind: "inquiry_notification",
          aggregateType: "inquiry",
          aggregateId: randomUUID(),
          status: "pending",
          attempts: 0,
          attemptCount: 0,
          deliveryKey: `synthetic-${randomUUID()}`,
          payload: {},
          createdAt,
        },
        {
          kind: "inquiry_customer_confirmation",
          aggregateType: "inquiry",
          aggregateId: randomUUID(),
          status: "failed",
          attempts: 2,
          attemptCount: 2,
          deliveryKey: `synthetic-${randomUUID()}`,
          payload: {},
          createdAt: new Date(createdAt.getTime() + 1_000),
        },
        {
          kind: "inquiry_notification",
          aggregateType: "inquiry",
          aggregateId: randomUUID(),
          status: "dead",
          attempts: 5,
          attemptCount: 5,
          deliveryKey: `synthetic-${randomUUID()}`,
          payload: {},
          createdAt: new Date(createdAt.getTime() + 2_000),
        },
      ]);
      const result = await loadDatabaseWorkState(connection.db);
      expect(result).toEqual({
        outboxBacklog: 2,
        outboxRepeatedFailures: 1,
        outboxDead: 1,
        oldestOutboxCreatedAt: createdAt,
        workerDead: 0,
      });
      expect(JSON.stringify(result)).not.toMatch(/[0-9a-f]{8}-[0-9a-f-]{27}/iu);
    } finally {
      await connection.close();
    }
  });
});
