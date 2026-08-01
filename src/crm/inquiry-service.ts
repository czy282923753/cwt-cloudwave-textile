import { randomBytes } from "node:crypto";
import { and, asc, count, eq, inArray, isNull, ne } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { writeAuditLog } from "@/audit/service";
import { recordConversionEvent } from "@/analytics/conversion-service";
import type { Actor } from "@/catalog/product-service";
import {
  assets,
  contacts,
  customerActivities,
  inquiries,
  inquiryAssets,
  inquiryStatusHistory,
  notificationOutbox,
  uploadIntents,
  users,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import type { EmailNotifier } from "@/integrations/email";
import { deliverInquiryNotification } from "@/integrations/notification-outbox";

import { requireInquiryRecordAccess } from "./authorization";

type InquiryStatus = typeof inquiries.$inferSelect.status;

const statusTransitions: Readonly<Record<InquiryStatus, ReadonlySet<InquiryStatus>>> = {
  new: new Set(["reviewing", "spam", "archived"]),
  reviewing: new Set(["qualified", "lost", "spam", "archived"]),
  qualified: new Set(["quoted", "sample", "negotiation", "lost", "archived"]),
  quoted: new Set(["sample", "negotiation", "won", "lost", "archived"]),
  sample: new Set(["quoted", "negotiation", "won", "lost", "archived"]),
  negotiation: new Set(["quoted", "sample", "won", "lost", "archived"]),
  won: new Set(["archived"]),
  lost: new Set(["reviewing", "archived"]),
  spam: new Set(["reviewing", "archived"]),
  archived: new Set(["reviewing"]),
};

export function normalizeContactEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createPublicInquiryReference(): string {
  return `CWT-${randomBytes(10).toString("hex").toUpperCase()}`;
}

export function assertInquiryStatusTransition(
  fromStatus: InquiryStatus,
  toStatus: InquiryStatus,
): void {
  if (!statusTransitions[fromStatus].has(toStatus)) {
    throw new Error(`Inquiry status cannot change from ${fromStatus} to ${toStatus}.`);
  }
}

export async function countValidInquiries<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
): Promise<number> {
  const rows = await db
    .select({ value: count() })
    .from(inquiries)
    .where(ne(inquiries.status, "spam"));
  return Number(rows[0]?.value ?? 0);
}

export interface CreateInquiryInput {
  name: string;
  email: string;
  countryCode?: string | null;
  whatsapp?: string | null;
  description?: string | null;
  assetIds: readonly string[];
  sourcePagePath: string;
  landingPagePath?: string | null;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  lastNonDirectSource?: string | null;
  lastNonDirectMedium?: string | null;
  lastNonDirectCampaign?: string | null;
  attributionConfidence?: typeof inquiries.$inferInsert.attributionConfidence;
  analyticsConsentState?: typeof inquiries.$inferInsert.analyticsConsentState;
  sessionId?: string | null;
  requestId?: string | null;
  idempotencyKey: string;
  reservedUploadIntentIds?: readonly string[];
}

export async function findInquiryByIdempotencyKey<
  TQueryResult extends PgQueryResultHKT,
>(db: AppDatabase<TQueryResult>, idempotencyKey: string): Promise<string | null> {
  const rows = await db
    .select({ id: inquiries.id })
    .from(inquiries)
    .where(eq(inquiries.idempotencyKey, idempotencyKey))
    .limit(1);
  return rows[0]?.id ?? null;
}

export async function findInquiryReferenceByIdempotencyKey<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  idempotencyKey: string,
): Promise<{ id: string; publicReference: string } | null> {
  const rows = await db
    .select({ id: inquiries.id, publicReference: inquiries.publicReference })
    .from(inquiries)
    .where(eq(inquiries.idempotencyKey, idempotencyKey))
    .limit(1);
  return rows[0] ?? null;
}

export async function createInquiry<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  notifier: EmailNotifier,
  input: CreateInquiryInput,
): Promise<string> {
  const name = input.name.trim();
  const email = normalizeContactEmail(input.email);
  const description = input.description?.trim() || null;
  const idempotencyKey = input.idempotencyKey.trim();
  const assetIds = [...new Set(input.assetIds)];
  const reservedIntentIds = [...new Set(input.reservedUploadIntentIds ?? [])];
  if (!name || !email) throw new Error("Name and Email are required.");
  if (!idempotencyKey || idempotencyKey.length > 200) {
    throw new Error("A valid Idempotency Key is required.");
  }
  const existingInquiryId = await findInquiryByIdempotencyKey(db, idempotencyKey);
  if (existingInquiryId) return existingInquiryId;
  if (!description && assetIds.length === 0) {
    throw new Error("Provide a description or upload at least one image.");
  }
  if (reservedIntentIds.length > 0 && reservedIntentIds.length !== assetIds.length) {
    throw new Error("Reserved Upload Tokens must exactly match Inquiry attachments.");
  }
  if (assetIds.length > 0) {
    const validAssets = await db
      .select({ id: assets.id })
      .from(assets)
      .where(
        and(
          inArray(assets.id, assetIds),
          eq(assets.category, "inquiry"),
          eq(assets.access, "private"),
          eq(assets.storagePartition, "private"),
          eq(assets.status, "ready"),
          eq(assets.scanStatus, "passed"),
          isNull(assets.deletedAt),
        ),
      );
    if (validAssets.length !== assetIds.length) {
      throw new Error("Inquiry attachments must be ready private inquiry Assets.");
    }
  }

  let result: { inquiryId: string; contactId: string };
  try {
    result = await db.transaction(async (transaction) => {
    if (reservedIntentIds.length > 0) {
      const reservedRows = await transaction
        .select({ id: uploadIntents.id, assetId: uploadIntents.assetId })
        .from(uploadIntents)
        .where(
          and(
            inArray(uploadIntents.id, reservedIntentIds),
            eq(uploadIntents.status, "consumed"),
            eq(uploadIntents.isConsumed, false),
          ),
        );
      const expectedAssets = new Set(assetIds);
      if (
        reservedRows.length !== reservedIntentIds.length ||
        reservedRows.some((row) => !row.assetId || !expectedAssets.has(row.assetId))
      ) {
        throw new Error("Reserved Upload Tokens do not match Inquiry attachments.");
      }
    }
    const insertedContacts = await transaction
      .insert(contacts)
      .values({
        name,
        email,
        normalizedEmail: email,
        countryCode: input.countryCode?.trim() || null,
        whatsapp: input.whatsapp?.trim() || null,
      })
      .onConflictDoNothing({ target: contacts.normalizedEmail })
      .returning({ id: contacts.id });
    const existingContacts = insertedContacts[0]
      ? []
      : await transaction
          .select({ id: contacts.id })
          .from(contacts)
          .where(eq(contacts.normalizedEmail, email))
          .limit(1);
    const contactId = insertedContacts[0]?.id ?? existingContacts[0]?.id;
    if (!contactId) throw new Error("Contact upsert failed.");
    const inquiryRows = await transaction
      .insert(inquiries)
      .values({
        publicReference: createPublicInquiryReference(),
        contactId,
        status: "new",
        description,
        submittedName: name,
        submittedEmail: email,
        submittedCountryCode: input.countryCode?.trim() || null,
        submittedWhatsapp: input.whatsapp?.trim() || null,
        idempotencyKey,
        sourcePagePath: input.sourcePagePath,
        landingPagePath: input.landingPagePath ?? null,
        referrer: input.referrer ?? null,
        utmSource: input.utmSource ?? null,
        utmMedium: input.utmMedium ?? null,
        utmCampaign: input.utmCampaign ?? null,
        lastNonDirectSource: input.lastNonDirectSource ?? null,
        lastNonDirectMedium: input.lastNonDirectMedium ?? null,
        lastNonDirectCampaign: input.lastNonDirectCampaign ?? null,
        attributionConfidence: input.attributionConfidence ?? "unavailable",
        analyticsConsentState: input.analyticsConsentState ?? "unknown",
        sessionId: input.sessionId ?? null,
        requestId: input.requestId ?? null,
      })
      .returning({ id: inquiries.id });
    const inquiryId = inquiryRows[0]?.id;
    if (!inquiryId) throw new Error("Inquiry insert failed.");
    if (assetIds.length > 0) {
      await transaction.insert(inquiryAssets).values(
        assetIds.map((assetId) => ({ inquiryId, assetId })),
      );
    }
    if (reservedIntentIds.length > 0) {
      const finalized = await transaction
        .update(uploadIntents)
        .set({
          isConsumed: true,
          consumedByInquiryId: inquiryId,
          usedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            inArray(uploadIntents.id, reservedIntentIds),
            eq(uploadIntents.status, "consumed"),
            eq(uploadIntents.isConsumed, false),
          ),
        )
        .returning({ id: uploadIntents.id });
      if (finalized.length !== reservedIntentIds.length) {
        throw new Error("Reserved Upload Tokens could not be finalized atomically.");
      }
    }
    await transaction.insert(inquiryStatusHistory).values({
      inquiryId,
      fromStatus: null,
      toStatus: "new",
      reason: "Public inquiry received",
    });
    await transaction.insert(notificationOutbox).values({
      kind: "inquiry_notification",
      aggregateType: "inquiry",
      aggregateId: inquiryId,
      deliveryKey: `inquiry_notification:${inquiryId}`,
      payload: {
        inquiryId,
        name,
        email,
        countryCode: input.countryCode?.trim() || null,
        whatsapp: input.whatsapp?.trim() || null,
        description,
        attachmentCount: assetIds.length,
      },
    });
    await writeAuditLog(transaction, {
      action: "inquiry.created",
      entityType: "inquiry",
      entityId: inquiryId,
      requestId: input.requestId ?? null,
      afterSummary: {
        status: "new",
        attachmentCount: assetIds.length,
        sourcePagePath: input.sourcePagePath,
      },
    });
      return { inquiryId, contactId };
    });
  } catch (error) {
    const racedInquiryId = await findInquiryByIdempotencyKey(db, idempotencyKey);
    if (!racedInquiryId) throw error;
    if (reservedIntentIds.length > 0) {
      await db
        .update(uploadIntents)
        .set({ status: "passed", updatedAt: new Date() })
        .where(
          and(
            inArray(uploadIntents.id, reservedIntentIds),
            eq(uploadIntents.status, "consumed"),
            eq(uploadIntents.isConsumed, false),
          ),
        );
    }
    await deliverInquiryNotification(db, notifier, racedInquiryId);
    return racedInquiryId;
  }

  await deliverInquiryNotification(db, notifier, result.inquiryId);
  return result.inquiryId;
}

export async function changeInquiryStatus<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  inquiryId: string,
  toStatus: InquiryStatus,
  reason?: string,
): Promise<void> {
  await requireInquiryRecordAccess(db, actor, inquiryId, "manage");
  const rows = await db
    .select({
      status: inquiries.status,
      contactId: inquiries.contactId,
      publicReference: inquiries.publicReference,
      sessionId: inquiries.sessionId,
      sourcePagePath: inquiries.sourcePagePath,
      landingPagePath: inquiries.landingPagePath,
      utmSource: inquiries.utmSource,
      utmMedium: inquiries.utmMedium,
      utmCampaign: inquiries.utmCampaign,
      lastNonDirectSource: inquiries.lastNonDirectSource,
      lastNonDirectMedium: inquiries.lastNonDirectMedium,
      lastNonDirectCampaign: inquiries.lastNonDirectCampaign,
      attributionConfidence: inquiries.attributionConfidence,
      analyticsConsentState: inquiries.analyticsConsentState,
      createdAt: inquiries.createdAt,
    })
    .from(inquiries)
    .where(eq(inquiries.id, inquiryId))
    .limit(1);
  const current = rows[0];
  if (!current) throw new Error("Inquiry was not found.");
  assertInquiryStatusTransition(current.status, toStatus);
  if (toStatus === "lost" && !reason?.trim()) {
    throw new Error("Lost Reason is required.");
  }
  await db.transaction(async (transaction) => {
    await transaction
      .update(inquiries)
      .set({
        status: toStatus,
        lostReason: toStatus === "lost" ? reason?.trim() : null,
        ...(toStatus === "qualified"
          ? { qualificationStatus: "qualified" as const }
          : {}),
        archivedAt: toStatus === "archived" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(inquiries.id, inquiryId));
    await transaction.insert(inquiryStatusHistory).values({
      inquiryId,
      fromStatus: current.status,
      toStatus,
      reason: reason?.trim() || null,
      changedByUserId: actor.userId,
    });
    await transaction.insert(customerActivities).values({
      inquiryId,
      contactId: current.contactId,
      type: "status_change",
      direction: "internal",
      content: `Status changed from ${current.status} to ${toStatus}.`,
      createdByUserId: actor.userId,
    });
    await writeAuditLog(transaction, {
      actorUserId: actor.userId,
      action: "inquiry.status.changed",
      entityType: "inquiry",
      entityId: inquiryId,
      beforeSummary: { status: current.status },
      afterSummary: { status: toStatus, hasReason: Boolean(reason?.trim()) },
    });
    const conversionName =
      toStatus === "qualified"
        ? "inquiry_qualified"
        : toStatus === "won"
          ? "inquiry_won"
          : toStatus === "lost"
            ? "inquiry_lost"
            : null;
    if (conversionName && current.sessionId) {
      await recordConversionEvent(transaction, {
        eventId: `${conversionName}:${current.publicReference}:${toStatus}`,
        eventName: conversionName,
        anonymousSessionId: current.sessionId,
        routePath: current.sourcePagePath,
        inquiryId,
        consentState: current.analyticsConsentState,
        landingPagePath: current.landingPagePath,
        utmSource: current.utmSource,
        utmMedium: current.utmMedium,
        utmCampaign: current.utmCampaign,
        lastNonDirectSource: current.lastNonDirectSource,
        lastNonDirectMedium: current.lastNonDirectMedium,
        lastNonDirectCampaign: current.lastNonDirectCampaign,
        attributionConfidence: current.attributionConfidence,
        submitSourcePagePath: current.sourcePagePath,
      });
    }
  });
}

export async function addCustomerActivity<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  inquiryId: string,
  input: {
    type: typeof customerActivities.$inferInsert.type;
    direction: typeof customerActivities.$inferInsert.direction;
    content: string;
    occurredAt?: Date;
  },
): Promise<string> {
  await requireInquiryRecordAccess(db, actor, inquiryId, "manage");
  const inquiryRows = await db
    .select({
      contactId: inquiries.contactId,
      publicReference: inquiries.publicReference,
      sessionId: inquiries.sessionId,
      sourcePagePath: inquiries.sourcePagePath,
      landingPagePath: inquiries.landingPagePath,
      utmSource: inquiries.utmSource,
      utmMedium: inquiries.utmMedium,
      utmCampaign: inquiries.utmCampaign,
      lastNonDirectSource: inquiries.lastNonDirectSource,
      lastNonDirectMedium: inquiries.lastNonDirectMedium,
      lastNonDirectCampaign: inquiries.lastNonDirectCampaign,
      attributionConfidence: inquiries.attributionConfidence,
      analyticsConsentState: inquiries.analyticsConsentState,
      createdAt: inquiries.createdAt,
    })
    .from(inquiries)
    .where(eq(inquiries.id, inquiryId))
    .limit(1);
  const inquiry = inquiryRows[0];
  if (!inquiry) throw new Error("Inquiry was not found.");
  const occurredAt = input.occurredAt ?? new Date();
  if (!input.content.trim()) throw new Error("Customer Activity content is required.");
  if (occurredAt.getTime() < inquiry.createdAt.getTime()) {
    throw new Error("Customer Activity cannot predate the Inquiry.");
  }
  if (occurredAt.getTime() > Date.now() + 5 * 60_000) {
    throw new Error("Customer Activity cannot be recorded in the future.");
  }
  if (input.type === "status_change" && input.direction !== "internal") {
    throw new Error("Status Change activities must be Internal.");
  }
  if (input.type === "note" && input.direction === "outbound") {
    throw new Error("Internal Notes cannot be outbound responses.");
  }
  return db.transaction(async (transaction) => {
    const rows = await transaction
      .insert(customerActivities)
      .values({
        inquiryId,
        contactId: inquiry.contactId,
        type: input.type,
        direction: input.direction,
        content: input.content.trim(),
        createdByUserId: actor.userId,
        occurredAt,
      })
      .returning({ id: customerActivities.id });
    const activityId = rows[0]?.id;
    if (!activityId) throw new Error("Customer Activity insert failed.");
    const responseRows = await transaction
      .select({ occurredAt: customerActivities.occurredAt })
      .from(customerActivities)
      .where(
        and(
          eq(customerActivities.inquiryId, inquiryId),
          eq(customerActivities.direction, "outbound"),
          inArray(customerActivities.type, ["email", "whatsapp", "quote", "sample"]),
        ),
      )
      .orderBy(asc(customerActivities.occurredAt))
      .limit(1);
    const firstResponseAt = responseRows[0]?.occurredAt ?? null;
    if (firstResponseAt) {
      await transaction
        .update(inquiries)
        .set({ firstResponseAt, updatedAt: new Date() })
        .where(eq(inquiries.id, inquiryId));
    }
    await writeAuditLog(transaction, {
      actorUserId: actor.userId,
      action: "customer_activity.created",
      entityType: "customer_activity",
      entityId: activityId,
      afterSummary: { inquiryId, type: input.type, direction: input.direction },
    });
    const conversionName =
      input.type === "quote"
        ? "quote_recorded"
        : input.type === "sample"
          ? "sample_recorded"
          : null;
    if (conversionName && inquiry.sessionId) {
      await recordConversionEvent(transaction, {
        eventId: `${conversionName}:${inquiry.publicReference}:${activityId.slice(0, 12)}`,
        eventName: conversionName,
        anonymousSessionId: inquiry.sessionId,
        routePath: inquiry.sourcePagePath,
        inquiryId,
        consentState: inquiry.analyticsConsentState,
        landingPagePath: inquiry.landingPagePath,
        utmSource: inquiry.utmSource,
        utmMedium: inquiry.utmMedium,
        utmCampaign: inquiry.utmCampaign,
        lastNonDirectSource: inquiry.lastNonDirectSource,
        lastNonDirectMedium: inquiry.lastNonDirectMedium,
        lastNonDirectCampaign: inquiry.lastNonDirectCampaign,
        attributionConfidence: inquiry.attributionConfidence,
        submitSourcePagePath: inquiry.sourcePagePath,
      });
    }
    return activityId;
  });
}

export async function assignInquiry<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  inquiryId: string,
  input: {
    ownerUserId?: string | null;
    priority: typeof inquiries.$inferInsert.priority;
    qualificationStatus: typeof inquiries.$inferInsert.qualificationStatus;
  },
): Promise<void> {
  const current = await requireInquiryRecordAccess(db, actor, inquiryId, "manage");
  if (actor.role !== "admin" && input.ownerUserId !== undefined && input.ownerUserId !== current.ownerUserId) {
    throw new Error("Only an Admin can reassign an Inquiry.");
  }
  const ownerUserId = input.ownerUserId === undefined ? current.ownerUserId : input.ownerUserId;
  if (ownerUserId) {
    const ownerRows = await db
      .select({ role: users.role, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, ownerUserId))
      .limit(1);
    const owner = ownerRows[0];
    if (!owner?.isActive || (owner.role !== "admin" && owner.role !== "sales")) {
      throw new Error("Inquiry owner must be an active Sales or Admin user.");
    }
  }
  if (current.status === "qualified" && input.qualificationStatus !== "qualified") {
    throw new Error("A Qualified Inquiry must retain Qualified qualification status.");
  }
  await db.transaction(async (transaction) => {
    await transaction
      .update(inquiries)
      .set({
        ownerUserId,
        priority: input.priority,
        qualificationStatus: input.qualificationStatus,
        updatedAt: new Date(),
      })
      .where(eq(inquiries.id, inquiryId));
    await writeAuditLog(transaction, {
      actorUserId: actor.userId,
      action: "inquiry.assignment.updated",
      entityType: "inquiry",
      entityId: inquiryId,
      beforeSummary: {
        ownerUserId: current.ownerUserId,
        priority: current.priority,
        qualificationStatus: current.qualificationStatus,
      },
      afterSummary: {
        ownerUserId,
        priority: input.priority,
        qualificationStatus: input.qualificationStatus,
      },
    });
  });
}
