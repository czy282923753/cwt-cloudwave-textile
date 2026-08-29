import { randomUUID } from "node:crypto";
import { and, asc, count, eq, gt, gte, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import { z } from "zod";

import { inquiries, inquiryAssets, notificationOutbox } from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import { codeEmailTemplateFallback } from "@/email-templates/fallbacks";
import {
  buildCustomerTemplateContext,
  buildInternalTemplateContext,
  renderEmailTemplate,
} from "@/email-templates/renderer";

import {
  buildTrustedEmailEnvelope,
  dispatchTrustedEmail,
  emailEnvelopePolicyFromEnvironment,
  type EmailEnvelopePolicy,
  type EmailTransport,
} from "./email";
import {
  NOTIFICATION_OUTBOX_KINDS,
  parseNotificationOutboxPayload,
  templateFromNotificationSnapshot,
  type NotificationOutboxKind,
} from "./notification-outbox-payload";

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

function claimableAttemptCounters() {
  return and(
    eq(notificationOutbox.attempts, notificationOutbox.attemptCount),
    lt(notificationOutbox.attempts, OUTBOX_MAX_ATTEMPTS),
    lt(notificationOutbox.attemptCount, OUTBOX_MAX_ATTEMPTS),
  );
}

function exhaustedAt(now: Date) {
  return or(
    inArray(notificationOutbox.status, ["pending", "failed"]),
    and(
      eq(notificationOutbox.status, "processing"),
      lte(notificationOutbox.leaseExpiresAt, now),
    ),
  );
}

async function terminalizeExhaustedNotificationOutboxJobs<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  now: Date,
  jobId?: string,
): Promise<readonly string[]> {
  const rows = await db.update(notificationOutbox).set({
    status: "dead",
    nextAttemptAt: now,
    lastErrorCode: "outbox_attempts_exhausted",
    lastError: "Notification delivery attempt limit was exhausted.",
    lockedAt: null,
    lockedBy: null,
    leaseExpiresAt: null,
    processedAt: now,
  }).where(and(
    ...(jobId ? [eq(notificationOutbox.id, z.uuid().parse(jobId))] : []),
    eq(notificationOutbox.aggregateType, "inquiry"),
    inArray(notificationOutbox.kind, NOTIFICATION_OUTBOX_KINDS),
    eq(notificationOutbox.attempts, notificationOutbox.attemptCount),
    gte(notificationOutbox.attempts, OUTBOX_MAX_ATTEMPTS),
    gte(notificationOutbox.attemptCount, OUTBOX_MAX_ATTEMPTS),
    exhaustedAt(now),
  )).returning({ id: notificationOutbox.id });
  return Object.freeze(rows.map((row) => row.id));
}

export async function listDueNotificationOutboxJobIds<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  now = new Date(),
  limit = 25,
): Promise<readonly string[]> {
  const rows = await db
    .select({ id: notificationOutbox.id })
    .from(notificationOutbox)
    .where(and(
      eq(notificationOutbox.aggregateType, "inquiry"),
      inArray(notificationOutbox.kind, NOTIFICATION_OUTBOX_KINDS),
      claimableAttemptCounters(),
      claimableAt(now),
    ))
    .orderBy(asc(notificationOutbox.createdAt), asc(notificationOutbox.id))
    .limit(Math.max(1, Math.min(limit, 100)));
  return Object.freeze(rows.map((row) => row.id));
}

export async function claimNotificationOutboxJob<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  jobId: string,
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
      lastErrorCode: null,
      lastError: null,
    })
    .where(and(
      eq(notificationOutbox.id, z.uuid().parse(jobId)),
      eq(notificationOutbox.aggregateType, "inquiry"),
      inArray(notificationOutbox.kind, NOTIFICATION_OUTBOX_KINDS),
      claimableAttemptCounters(),
      claimableAt(now),
    ))
    .returning({
      id: notificationOutbox.id,
      kind: notificationOutbox.kind,
      aggregateId: notificationOutbox.aggregateId,
      status: notificationOutbox.status,
      payload: notificationOutbox.payload,
      attempts: notificationOutbox.attempts,
      attemptCount: notificationOutbox.attemptCount,
      deliveryKey: notificationOutbox.deliveryKey,
      leaseExpiresAt: notificationOutbox.leaseExpiresAt,
    });
  return rows[0] ?? null;
}

function parsedSourceEntityType(value: string | null) {
  return z.enum(["product", "application", "content"]).nullable().parse(value);
}

async function loadInquiryRenderSnapshot<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  inquiryId: string,
) {
  const rows = await db.select({
    id: inquiries.id,
    publicReference: inquiries.publicReference,
    submittedName: inquiries.submittedName,
    submittedEmail: inquiries.submittedEmail,
    submittedCountryCode: inquiries.submittedCountryCode,
    submittedWhatsapp: inquiries.submittedWhatsapp,
    description: inquiries.description,
    sourcePagePath: inquiries.sourcePagePath,
    landingPagePath: inquiries.landingPagePath,
    referrer: inquiries.referrer,
    utmSource: inquiries.utmSource,
    utmMedium: inquiries.utmMedium,
    utmCampaign: inquiries.utmCampaign,
    lastNonDirectSource: inquiries.lastNonDirectSource,
    lastNonDirectMedium: inquiries.lastNonDirectMedium,
    lastNonDirectCampaign: inquiries.lastNonDirectCampaign,
    sourceEntityType: inquiries.sourceEntityType,
    createdAt: inquiries.createdAt,
  }).from(inquiries).where(eq(inquiries.id, inquiryId)).limit(1);
  const inquiry = rows[0];
  if (!inquiry) throw new Error("Outbox Inquiry snapshot was not found.");
  const attachmentRows = await db.select({ value: count() })
    .from(inquiryAssets).where(eq(inquiryAssets.inquiryId, inquiryId));
  return Object.freeze({
    ...inquiry,
    sourceEntityType: parsedSourceEntityType(inquiry.sourceEntityType),
    attachmentCount: Number(attachmentRows[0]?.value ?? 0),
  });
}

function retryDelay(attempt: number): number {
  return Math.min(60_000 * 2 ** Math.max(0, attempt - 1), 3_600_000);
}

async function recordFailedAttempt<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  input: {
    readonly jobId: string;
    readonly workerId: string;
    readonly attempt: number;
    readonly now: Date;
    readonly errorCode: string;
  },
): Promise<boolean> {
  const isDead = input.attempt >= OUTBOX_MAX_ATTEMPTS;
  const rows = await db.update(notificationOutbox).set({
    status: isDead ? "dead" : "failed",
    nextAttemptAt: new Date(input.now.getTime() + retryDelay(input.attempt)),
    lastErrorCode: input.errorCode.slice(0, 80),
    lastError: "Notification delivery was not confirmed; details omitted.",
    lockedAt: null,
    lockedBy: null,
    leaseExpiresAt: null,
  }).where(and(
    eq(notificationOutbox.id, input.jobId),
    eq(notificationOutbox.status, "processing"),
    eq(notificationOutbox.lockedBy, input.workerId),
    gt(notificationOutbox.leaseExpiresAt, input.now),
  )).returning({ id: notificationOutbox.id });
  return Boolean(rows[0]);
}

export async function deliverNotificationOutboxJob<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  transport: EmailTransport,
  jobId: string,
  options: {
    readonly workerId?: string;
    readonly clock?: () => Date;
    readonly policy?: EmailEnvelopePolicy;
  } = {},
): Promise<boolean> {
  const workerId = options.workerId ?? `worker-${randomUUID()}`;
  const clock = options.clock ?? (() => new Date());
  const claimAt = clock();
  const policy = options.policy ?? emailEnvelopePolicyFromEnvironment();
  await terminalizeExhaustedNotificationOutboxJobs(db, claimAt, jobId);
  const job = await claimNotificationOutboxJob(db, jobId, workerId, claimAt);
  if (!job) return false;
  try {
    if (job.attempts !== job.attemptCount) {
      throw new Error("Outbox attempt counters do not match.");
    }
    const parsed = parseNotificationOutboxPayload(job);
    const kind = z.enum(NOTIFICATION_OUTBOX_KINDS).parse(job.kind) as NotificationOutboxKind;
    const payloadInquiryId = parsed.format === "v1"
      ? parsed.value.inquiry_id
      : parsed.value.inquiryId;
    if (payloadInquiryId !== job.aggregateId) {
      throw new Error("Outbox Inquiry pointer does not match its aggregate.");
    }
    const inquiry = await loadInquiryRenderSnapshot(db, payloadInquiryId);
    const template = parsed.format === "v1"
      ? templateFromNotificationSnapshot(parsed.value.template_snapshot)
      : codeEmailTemplateFallback("inquiry_notification");
    const sourceLabel = parsed.format === "v1"
      ? parsed.value.source_entity_label_snapshot
      : null;
    const context = kind === "inquiry_customer_confirmation"
      ? buildCustomerTemplateContext({
          customerName: inquiry.submittedName,
          inquiryReference: inquiry.publicReference,
          submittedAt: inquiry.createdAt,
        })
      : buildInternalTemplateContext({
          inquiryReference: inquiry.publicReference,
          submittedAt: inquiry.createdAt,
          customerName: inquiry.submittedName,
          customerEmail: inquiry.submittedEmail,
          countryCode: inquiry.submittedCountryCode,
          whatsapp: inquiry.submittedWhatsapp,
          inquiryDescription: inquiry.description,
          attachmentCount: inquiry.attachmentCount,
          sourcePagePath: inquiry.sourcePagePath,
          landingPagePath: inquiry.landingPagePath,
          referrer: inquiry.referrer,
          utmSource: inquiry.utmSource,
          utmMedium: inquiry.utmMedium,
          utmCampaign: inquiry.utmCampaign,
          lastNonDirectSource: inquiry.lastNonDirectSource,
          lastNonDirectMedium: inquiry.lastNonDirectMedium,
          lastNonDirectCampaign: inquiry.lastNonDirectCampaign,
          sourceEntityType: inquiry.sourceEntityType,
          sourceEntityLabel: sourceLabel,
          applicationOrigin: policy.applicationOrigin,
          inquiryId: inquiry.id,
        });
    const rendered = renderEmailTemplate(template, context);
    const envelope = buildTrustedEmailEnvelope({
      policy,
      logicalTo: kind === "inquiry_notification"
        ? policy.internalRecipient
        : inquiry.submittedEmail,
      subject: rendered.subject,
      textBody: rendered.textBody,
      deliveryKey: job.deliveryKey,
    });
    const outcome = await dispatchTrustedEmail(transport, policy, envelope);
    if (outcome.outcome !== "success") {
      const failedAt = clock();
      await recordFailedAttempt(db, {
        jobId: job.id,
        workerId,
        attempt: job.attemptCount,
        now: failedAt,
        errorCode: `email_transport_${outcome.outcome}`,
      });
      return false;
    }
    const completedAt = clock();
    const sent = await db.update(notificationOutbox).set({
      status: "sent",
      processedAt: completedAt,
      nextAttemptAt: completedAt,
      lastErrorCode: null,
      lastError: null,
      lockedAt: null,
      lockedBy: null,
      leaseExpiresAt: null,
    }).where(and(
      eq(notificationOutbox.id, job.id),
      eq(notificationOutbox.status, "processing"),
      eq(notificationOutbox.lockedBy, workerId),
      gt(notificationOutbox.leaseExpiresAt, completedAt),
    )).returning({ id: notificationOutbox.id });
    return Boolean(sent[0]);
  } catch {
    const failedAt = clock();
    await recordFailedAttempt(db, {
      jobId: job.id,
      workerId,
      attempt: job.attemptCount,
      now: failedAt,
      errorCode: "outbox_contract_rejected",
    });
    return false;
  }
}

export async function deliverPendingNotificationOutbox<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  transport: EmailTransport,
  options: {
    readonly limit?: number;
    readonly workerId?: string;
    readonly clock?: () => Date;
    readonly policy?: EmailEnvelopePolicy;
  } = {},
): Promise<{ attempted: number; sent: number }> {
  const clock = options.clock ?? (() => new Date());
  const discoveryAt = clock();
  await terminalizeExhaustedNotificationOutboxJobs(db, discoveryAt);
  const ids = await listDueNotificationOutboxJobIds(db, discoveryAt, options.limit ?? 25);
  let sent = 0;
  for (const id of ids) {
    if (await deliverNotificationOutboxJob(db, transport, id, {
      clock,
      ...(options.workerId ? { workerId: options.workerId } : {}),
      ...(options.policy ? { policy: options.policy } : {}),
    })) sent += 1;
  }
  return { attempted: ids.length, sent };
}
