import { createHash, randomBytes } from "node:crypto";
import { and, asc, count, eq, inArray, isNull, ne } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { writeAuditLog } from "@/audit/service";
import type { GovernedMutationOptions } from "@/audit/governed-mutation";
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
import { normalizePath } from "@/seo/path";
import { reserveInquiryUploadTokensInTransaction } from "@/uploads/upload-intent-service";

import { requireInquiryRecordAccess } from "./authorization";
import { normalizeOptionalCountryCode } from "./country-codes";

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
  assetIds?: readonly string[];
  uploadTokens?: readonly string[];
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
}

export interface InquirySubmissionResult {
  inquiryId: string;
  publicReference: string;
  replayed: boolean;
}

export class InquiryIdempotencyConflictError extends Error {
  readonly code = "INQUIRY_IDEMPOTENCY_CONFLICT" as const;

  constructor() {
    super("This Idempotency Key was already used for a different Inquiry request.");
    this.name = "InquiryIdempotencyConflictError";
  }
}

export const INQUIRY_REQUEST_FINGERPRINT_VERSION = 1;

function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalized = value?.normalize("NFC").trim() ?? "";
  return normalized || null;
}

function normalizeMessage(value: string | null | undefined): string | null {
  const normalized = value?.normalize("NFC").replace(/\r\n?/g, "\n").trim() ?? "";
  return normalized || null;
}

function digestAttachmentToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function canonicalInquiryInput(input: CreateInquiryInput) {
  const uploadTokens = [...(input.uploadTokens ?? [])];
  const assetIds = [...new Set(input.assetIds ?? [])].sort();
  if (uploadTokens.length > 0 && assetIds.length > 0) {
    throw new Error("Inquiry attachments must use Upload Tokens or Asset IDs, not both.");
  }
  if (new Set(uploadTokens).size !== uploadTokens.length) {
    throw new Error("Upload Tokens are duplicated or exceed the configured limit.");
  }
  const name = input.name.normalize("NFC").trim();
  const email = normalizeContactEmail(input.email.normalize("NFC"));
  const description = normalizeMessage(input.description);
  const sourcePagePath = normalizePath(input.sourcePagePath);
  const landingPagePath = input.landingPagePath
    ? normalizePath(input.landingPagePath)
    : null;
  const sessionId = normalizeOptionalText(input.sessionId)?.toLowerCase() ?? null;
  const attachmentIdentity = uploadTokens.length
    ? uploadTokens.map(digestAttachmentToken).sort().map((digest) => `token:${digest}`)
    : assetIds.map((assetId) => `asset:${assetId}`);
  return {
    name,
    email,
    countryCode: normalizeOptionalCountryCode(input.countryCode),
    whatsapp: normalizeOptionalText(input.whatsapp),
    description,
    sourcePagePath,
    landingPagePath,
    referrer: normalizeOptionalText(input.referrer),
    utmSource: normalizeOptionalText(input.utmSource),
    utmMedium: normalizeOptionalText(input.utmMedium),
    utmCampaign: normalizeOptionalText(input.utmCampaign),
    lastNonDirectSource: normalizeOptionalText(input.lastNonDirectSource),
    lastNonDirectMedium: normalizeOptionalText(input.lastNonDirectMedium),
    lastNonDirectCampaign: normalizeOptionalText(input.lastNonDirectCampaign),
    attributionConfidence: input.attributionConfidence ?? "unavailable",
    sessionId,
    uploadTokens,
    assetIds,
    attachmentIdentity,
  };
}

export function createInquiryRequestFingerprint(input: CreateInquiryInput): string {
  const canonical = canonicalInquiryInput(input);
  const orderedPayload = [
    ["name", canonical.name],
    ["email", canonical.email],
    ["countryCode", canonical.countryCode],
    ["whatsapp", canonical.whatsapp],
    ["description", canonical.description],
    ["sourcePagePath", canonical.sourcePagePath],
    ["landingPagePath", canonical.landingPagePath],
    ["referrer", canonical.referrer],
    ["utmSource", canonical.utmSource],
    ["utmMedium", canonical.utmMedium],
    ["utmCampaign", canonical.utmCampaign],
    ["lastNonDirectSource", canonical.lastNonDirectSource],
    ["lastNonDirectMedium", canonical.lastNonDirectMedium],
    ["lastNonDirectCampaign", canonical.lastNonDirectCampaign],
    ["attributionConfidence", canonical.attributionConfidence],
    ["attachments", canonical.attachmentIdentity],
  ] as const;
  return createHash("sha256")
    .update(`${INQUIRY_REQUEST_FINGERPRINT_VERSION}\n${JSON.stringify(orderedPayload)}`, "utf8")
    .digest("hex");
}

export async function findInquiryReferenceByIdempotencyKey<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  idempotencyKey: string,
): Promise<{
  id: string;
  publicReference: string;
  requestFingerprint: string | null;
  requestFingerprintVersion: number | null;
} | null> {
  const rows = await db
    .select({
      id: inquiries.id,
      publicReference: inquiries.publicReference,
      requestFingerprint: inquiries.requestFingerprint,
      requestFingerprintVersion: inquiries.requestFingerprintVersion,
    })
    .from(inquiries)
    .where(eq(inquiries.idempotencyKey, idempotencyKey))
    .limit(1);
  return rows[0] ?? null;
}

export async function createInquiry<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  notifier: EmailNotifier,
  input: CreateInquiryInput,
  options: GovernedMutationOptions = {},
): Promise<InquirySubmissionResult> {
  const canonical = canonicalInquiryInput(input);
  const { name, email, description } = canonical;
  const idempotencyKey = input.idempotencyKey.trim();
  const requestFingerprint = createInquiryRequestFingerprint(input);
  if (!name || !email) throw new Error("Name and Email are required.");
  if (!idempotencyKey || idempotencyKey.length > 200) {
    throw new Error("A valid Idempotency Key is required.");
  }
  const assertMatchingRequest = (
    existing: NonNullable<Awaited<ReturnType<typeof findInquiryReferenceByIdempotencyKey>>>,
  ): InquirySubmissionResult => {
    if (
      existing.requestFingerprintVersion !== INQUIRY_REQUEST_FINGERPRINT_VERSION ||
      existing.requestFingerprint !== requestFingerprint
    ) {
      throw new InquiryIdempotencyConflictError();
    }
    return {
      inquiryId: existing.id,
      publicReference: existing.publicReference,
      replayed: true,
    };
  };
  const existing = await findInquiryReferenceByIdempotencyKey(db, idempotencyKey);
  if (existing) return assertMatchingRequest(existing);
  if (!description && canonical.assetIds.length === 0 && canonical.uploadTokens.length === 0) {
    throw new Error("Provide a description or upload at least one image.");
  }

  let result: InquirySubmissionResult;
  try {
    result = await db.transaction(async (transaction) => {
    const concurrentExisting = await findInquiryReferenceByIdempotencyKey(
      transaction,
      idempotencyKey,
    );
    if (concurrentExisting) return assertMatchingRequest(concurrentExisting);
    const reserved = canonical.uploadTokens.length
      ? await reserveInquiryUploadTokensInTransaction(
          transaction,
          canonical.sessionId ?? "",
          canonical.uploadTokens,
        )
      : { intentIds: [] as string[], assetIds: canonical.assetIds };
    const assetIds = [...new Set(reserved.assetIds)];
    const reservedIntentIds = [...new Set(reserved.intentIds)];
    if (reservedIntentIds.length > 0 && reservedIntentIds.length !== assetIds.length) {
      throw new Error("Reserved Upload Tokens must exactly match Inquiry attachments.");
    }
    if (assetIds.length > 0) {
      const validAssets = await transaction
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
        countryCode: canonical.countryCode,
        whatsapp: canonical.whatsapp,
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
    const publicReference = createPublicInquiryReference();
    const inquiryRows = await transaction
      .insert(inquiries)
      .values({
        publicReference,
        contactId,
        status: "new",
        description,
        submittedName: name,
        submittedEmail: email,
        submittedCountryCode: canonical.countryCode,
        submittedWhatsapp: canonical.whatsapp,
        idempotencyKey,
        requestFingerprint,
        requestFingerprintVersion: INQUIRY_REQUEST_FINGERPRINT_VERSION,
        sourcePagePath: canonical.sourcePagePath,
        landingPagePath: canonical.landingPagePath,
        referrer: canonical.referrer,
        utmSource: canonical.utmSource,
        utmMedium: canonical.utmMedium,
        utmCampaign: canonical.utmCampaign,
        lastNonDirectSource: canonical.lastNonDirectSource,
        lastNonDirectMedium: canonical.lastNonDirectMedium,
        lastNonDirectCampaign: canonical.lastNonDirectCampaign,
        attributionConfidence: canonical.attributionConfidence,
        analyticsConsentState: input.analyticsConsentState ?? "unknown",
        sessionId: canonical.sessionId,
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
        countryCode: canonical.countryCode,
        whatsapp: canonical.whatsapp,
        description,
        attachmentCount: assetIds.length,
      },
    });
    await (options.auditWriter ?? writeAuditLog)(transaction, {
      action: "inquiry.created",
      entityType: "inquiry",
      entityId: inquiryId,
      requestId: input.requestId ?? null,
      afterSummary: {
        status: "new",
        attachmentCount: assetIds.length,
        sourcePagePath: canonical.sourcePagePath,
      },
    });
      return { inquiryId, publicReference, replayed: false };
    });
  } catch (error) {
    const racedInquiry = await findInquiryReferenceByIdempotencyKey(db, idempotencyKey);
    if (!racedInquiry) throw error;
    return assertMatchingRequest(racedInquiry);
  }

  if (!result.replayed) {
    try {
      await deliverInquiryNotification(db, notifier, result.inquiryId);
    } catch {
      process.stderr.write(
        `[inquiry-notification-deferred] Inquiry ${result.publicReference}; details omitted.\n`,
      );
    }
  }
  return result;
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
