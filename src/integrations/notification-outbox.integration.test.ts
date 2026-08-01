import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { notificationOutbox } from "@/db/schema";
import type { EmailNotifier, InquiryNotification } from "@/integrations/email";
import { createTestDatabase } from "@/test/database";

import {
  claimInquiryNotification,
  deliverInquiryNotification,
} from "./notification-outbox";

const inquiryId = "11111111-1111-4111-8111-111111111111";
const payload = {
  inquiryId,
  name: "Synthetic Buyer",
  email: "synthetic@example.test",
  attachmentCount: 0,
};

class RecordingNotifier implements EmailNotifier {
  readonly deliveryKeys: string[] = [];
  constructor(private readonly onNotify?: () => Promise<void>) {}
  async notifyInquiry(_input: InquiryNotification, deliveryKey?: string): Promise<void> {
    if (deliveryKey) this.deliveryKeys.push(deliveryKey);
    await this.onNotify?.();
  }
}

class FailingNotifier implements EmailNotifier {
  async notifyInquiry(): Promise<void> {
    throw new Error("Synthetic provider outage");
  }
}

async function insertJob(
  db: Awaited<ReturnType<typeof createTestDatabase>>["db"],
  values: Partial<typeof notificationOutbox.$inferInsert> = {},
) {
  await db.insert(notificationOutbox).values({
    kind: "inquiry_notification",
    aggregateType: "inquiry",
    aggregateId: inquiryId,
    deliveryKey: "inquiry_notification:test-job",
    payload,
    ...values,
  });
}

describe("Notification Outbox lease recovery", () => {
  it("atomically allows only one worker to claim a due job", async () => {
    const connection = await createTestDatabase();
    await insertJob(connection.db);
    const [first, second] = await Promise.all([
      claimInquiryNotification(connection.db, inquiryId, "worker-a"),
      claimInquiryNotification(connection.db, inquiryId, "worker-b"),
    ]);
    expect([first, second].filter(Boolean)).toHaveLength(1);
    await connection.close();
  });

  it("reclaims an expired processing lease after a worker crash", async () => {
    const connection = await createTestDatabase();
    await insertJob(connection.db, {
      status: "processing",
      lockedBy: "dead-worker",
      lockedAt: new Date(0),
      leaseExpiresAt: new Date(1),
    });
    await expect(
      claimInquiryNotification(connection.db, inquiryId, "recovery-worker", new Date(10)),
    ).resolves.toMatchObject({ deliveryKey: "inquiry_notification:test-job" });
    const rows = await connection.db.select().from(notificationOutbox);
    expect(rows[0]).toMatchObject({ lockedBy: "recovery-worker", attemptCount: 1 });
    await connection.close();
  });

  it("enforces a unique Delivery Key and moves exhausted retries to Dead", async () => {
    const connection = await createTestDatabase();
    await insertJob(connection.db, { attempts: 4, attemptCount: 4 });
    await expect(insertJob(connection.db, { aggregateId: "22222222-2222-4222-8222-222222222222" })).rejects.toThrow();
    await expect(deliverInquiryNotification(connection.db, new FailingNotifier(), inquiryId, { workerId: "retry-worker" })).resolves.toBe(false);
    const rows = await connection.db.select().from(notificationOutbox);
    expect(rows[0]).toMatchObject({ status: "dead", attemptCount: 5 });
    expect(rows[0]?.lastError).toMatch(/provider outage/);
    await connection.close();
  });

  it("reuses the Delivery Key when delivery succeeds but the sent-state update is lost", async () => {
    const connection = await createTestDatabase();
    await insertJob(connection.db);
    const notifier = new RecordingNotifier(async () => {
      await connection.db
        .update(notificationOutbox)
        .set({ lockedBy: "simulated-db-failure" })
        .where(eq(notificationOutbox.aggregateId, inquiryId));
    });
    await expect(deliverInquiryNotification(connection.db, notifier, inquiryId, { workerId: "first-worker" })).resolves.toBe(false);
    await connection.db
      .update(notificationOutbox)
      .set({ leaseExpiresAt: new Date(0) })
      .where(eq(notificationOutbox.aggregateId, inquiryId));
    const recoveryNotifier = new RecordingNotifier();
    await expect(deliverInquiryNotification(connection.db, recoveryNotifier, inquiryId, { workerId: "recovery-worker" })).resolves.toBe(true);
    expect([...notifier.deliveryKeys, ...recoveryNotifier.deliveryKeys]).toEqual([
      "inquiry_notification:test-job",
      "inquiry_notification:test-job",
    ]);
    await connection.close();
  });
});
