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

export async function deliverInquiryNotification<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  notifier: EmailNotifier,
  inquiryId: string,
): Promise<boolean> {
  const claimed = await db
    .update(notificationOutbox)
    .set({ status: "processing", attempts: sql`${notificationOutbox.attempts} + 1` })
    .where(
      and(
        eq(notificationOutbox.aggregateId, inquiryId),
        eq(notificationOutbox.kind, "inquiry_notification"),
        inArray(notificationOutbox.status, ["pending", "failed"]),
        or(
          isNull(notificationOutbox.nextAttemptAt),
          lte(notificationOutbox.nextAttemptAt, new Date()),
        ),
      ),
    )
    .returning({
      id: notificationOutbox.id,
      payload: notificationOutbox.payload,
      attempts: notificationOutbox.attempts,
    });
  const job = claimed[0];
  if (!job) return false;
  try {
    await notifier.notifyInquiry(inquiryNotificationPayloadSchema.parse(job.payload));
    await db
      .update(notificationOutbox)
      .set({ status: "sent", processedAt: new Date(), lastErrorCode: null })
      .where(eq(notificationOutbox.id, job.id));
    return true;
  } catch (error) {
    await db
      .update(notificationOutbox)
      .set({
        status: job.attempts >= 5 ? "dead" : "failed",
        nextAttemptAt: new Date(Date.now() + 60_000),
        lastErrorCode: error instanceof Error ? error.name.slice(0, 80) : "unknown",
      })
      .where(eq(notificationOutbox.id, job.id));
    return false;
  }
}

export async function deliverPendingInquiryNotifications<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  notifier: EmailNotifier,
  limit = 25,
): Promise<{ attempted: number; sent: number }> {
  const due = await db
    .select({ aggregateId: notificationOutbox.aggregateId })
    .from(notificationOutbox)
    .where(
      and(
        eq(notificationOutbox.kind, "inquiry_notification"),
        inArray(notificationOutbox.status, ["pending", "failed"]),
        or(
          isNull(notificationOutbox.nextAttemptAt),
          lte(notificationOutbox.nextAttemptAt, new Date()),
        ),
      ),
    )
    .orderBy(asc(notificationOutbox.createdAt))
    .limit(Math.max(1, Math.min(limit, 100)));
  let sent = 0;
  for (const row of due) {
    if (await deliverInquiryNotification(db, notifier, row.aggregateId)) sent += 1;
  }
  return { attempted: due.length, sent };
}
