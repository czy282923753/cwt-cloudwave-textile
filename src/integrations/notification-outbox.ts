import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import { z } from "zod";

import { notificationOutbox } from "@/db/schema";
import type { AppDatabase } from "@/db/types";

import type { EmailNotifier } from "./email";

export const inquiryNotificationPayloadSchema = z.object({
  inquiryId: z.uuid(),
  name: z.string().min(1),
  email: z.email(),
  countryCode: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  attachmentCount: z.number().int().min(0),
});

export const OUTBOX_MAX_ATTEMPTS = 5;
export const OUTBOX_LEASE_MILLISECONDS = 60_000;

function claimableAt(now: Date) {
  return or(
    and(
      inArray(notificationOutbox.status, ["pending", "failed"]),
      or(
        isNull(notificationOutbox.nextAttemptAt),
        lte(notificationOutbox.nextAttemptAt, now),
      ),
    ),
    and(
      eq(notificationOutbox.status, "processing"),
      lte(notificationOutbox.leaseExpiresAt, now),
    ),
  );
}

export async function claimInquiryNotification<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  inquiryId: string,
  workerId: string,
  now = new Date(),
  leaseMilliseconds = OUTBOX_LEASE_MILLISECONDS,
) {
  const rows = await db
    .update(notificationOutbox)
    .set({
      status: "processing",
      attempts: sql`${notificationOutbox.attempts} + 1`,
      attemptCount: sql`${notificationOutbox.attemptCount} + 1`,
      lockedAt: now,
      lockedBy: workerId,
      leaseExpiresAt: new Date(now.getTime() + leaseMilliseconds),
      lastError: null,
    })
    .where(
      and(
        eq(notificationOutbox.aggregateId, inquiryId),
        eq(notificationOutbox.kind, "inquiry_notification"),
        claimableAt(now),
      ),
    )
    .returning({
      id: notificationOutbox.id,
      payload: notificationOutbox.payload,
      attempts: notificationOutbox.attemptCount,
      deliveryKey: notificationOutbox.deliveryKey,
    });
  return rows[0] ?? null;
}

export async function deliverInquiryNotification<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  notifier: EmailNotifier,
  inquiryId: string,
  options: { workerId?: string; now?: Date } = {},
): Promise<boolean> {
  const workerId = options.workerId ?? `worker-${randomUUID()}`;
  const now = options.now ?? new Date();
  const job = await claimInquiryNotification(db, inquiryId, workerId, now);
  if (!job) return false;
  try {
    await notifier.notifyInquiry(
      inquiryNotificationPayloadSchema.parse(job.payload),
      job.deliveryKey,
    );
    const sent = await db
      .update(notificationOutbox)
      .set({
        status: "sent",
        processedAt: new Date(),
        lastErrorCode: null,
        lastError: null,
        lockedAt: null,
        lockedBy: null,
        leaseExpiresAt: null,
      })
      .where(
        and(
          eq(notificationOutbox.id, job.id),
          eq(notificationOutbox.status, "processing"),
          eq(notificationOutbox.lockedBy, workerId),
        ),
      )
      .returning({ id: notificationOutbox.id });
    if (!sent[0]) {
      throw new Error("Outbox lease was lost after external delivery.");
    }
    return true;
  } catch (error) {
    const isDead = job.attempts >= OUTBOX_MAX_ATTEMPTS;
    const delay = Math.min(60_000 * 2 ** Math.max(0, job.attempts - 1), 3_600_000);
    await db
      .update(notificationOutbox)
      .set({
        status: isDead ? "dead" : "failed",
        nextAttemptAt: new Date(Date.now() + delay),
        lastErrorCode: error instanceof Error ? error.name.slice(0, 80) : "unknown",
        lastError: error instanceof Error ? error.message.slice(0, 500) : "unknown",
        lockedAt: null,
        lockedBy: null,
        leaseExpiresAt: null,
      })
      .where(
        and(
          eq(notificationOutbox.id, job.id),
          eq(notificationOutbox.lockedBy, workerId),
        ),
      );
    return false;
  }
}

export async function deliverPendingInquiryNotifications<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  notifier: EmailNotifier,
  limit = 25,
  workerId = `worker-${randomUUID()}`,
): Promise<{ attempted: number; sent: number }> {
  const now = new Date();
  const due = await db
    .select({ aggregateId: notificationOutbox.aggregateId })
    .from(notificationOutbox)
    .where(
      and(
        eq(notificationOutbox.kind, "inquiry_notification"),
        claimableAt(now),
      ),
    )
    .orderBy(asc(notificationOutbox.createdAt))
    .limit(Math.max(1, Math.min(limit, 100)));
  let sent = 0;
  for (const row of due) {
    if (
      await deliverInquiryNotification(db, notifier, row.aggregateId, {
        workerId,
        now,
      })
    ) {
      sent += 1;
    }
  }
  return { attempted: due.length, sent };
}
