import { and, eq, inArray } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { writeAuditLog } from "@/audit/service";
import { recordConversionEvent } from "@/analytics/conversion-service";
import { requirePermission } from "@/auth/permissions";
import type { Actor } from "@/catalog/product-service";
import {
  assets,
  contacts,
  customerActivities,
  inquiries,
  inquiryAssets,
  inquiryStatusHistory,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import type { EmailNotifier } from "@/integrations/email";

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

export function assertInquiryStatusTransition(
  fromStatus: InquiryStatus,
  toStatus: InquiryStatus,
): void {
  if (!statusTransitions[fromStatus].has(toStatus)) {
    throw new Error(`Inquiry status cannot change from ${fromStatus} to ${toStatus}.`);
  }
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
  sessionId?: string | null;
  requestId?: string | null;
}

export async function createInquiry<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  notifier: EmailNotifier,
  input: CreateInquiryInput,
): Promise<string> {
  const name = input.name.trim();
  const email = normalizeContactEmail(input.email);
  const description = input.description?.trim() || null;
  const assetIds = [...new Set(input.assetIds)];
  if (!name || !email) throw new Error("Name and Email are required.");
  if (!description && assetIds.length === 0) {
    throw new Error("Provide a description or upload at least one image.");
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
        ),
      );
    if (validAssets.length !== assetIds.length) {
      throw new Error("Inquiry attachments must be ready private inquiry Assets.");
    }
  }

  const result = await db.transaction(async (transaction) => {
    const contactRows = await transaction
      .insert(contacts)
      .values({
        name,
        email,
        normalizedEmail: email,
        countryCode: input.countryCode?.trim() || null,
        whatsapp: input.whatsapp?.trim() || null,
      })
      .onConflictDoUpdate({
        target: contacts.normalizedEmail,
        set: {
          name,
          email,
          ...(input.countryCode?.trim()
            ? { countryCode: input.countryCode.trim() }
            : {}),
          ...(input.whatsapp?.trim() ? { whatsapp: input.whatsapp.trim() } : {}),
          updatedAt: new Date(),
        },
      })
      .returning({ id: contacts.id });
    const contactId = contactRows[0]?.id;
    if (!contactId) throw new Error("Contact upsert failed.");
    const inquiryRows = await transaction
      .insert(inquiries)
      .values({
        contactId,
        status: "new",
        description,
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
    await transaction.insert(inquiryStatusHistory).values({
      inquiryId,
      fromStatus: null,
      toStatus: "new",
      reason: "Public inquiry received",
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

  await notifier.notifyInquiry({
    inquiryId: result.inquiryId,
    name,
    email,
    countryCode: input.countryCode,
    whatsapp: input.whatsapp,
    description,
    attachmentCount: assetIds.length,
  });
  return result.inquiryId;
}

export async function changeInquiryStatus<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  inquiryId: string,
  toStatus: InquiryStatus,
  reason?: string,
): Promise<void> {
  requirePermission(actor.role, "crm.manage");
  const rows = await db
    .select({
      status: inquiries.status,
      contactId: inquiries.contactId,
      sessionId: inquiries.sessionId,
      sourcePagePath: inquiries.sourcePagePath,
      landingPagePath: inquiries.landingPagePath,
      utmSource: inquiries.utmSource,
      utmMedium: inquiries.utmMedium,
      utmCampaign: inquiries.utmCampaign,
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
        eventName: conversionName,
        anonymousSessionId: current.sessionId,
        routePath: current.sourcePagePath,
        inquiryId,
        landingPagePath: current.landingPagePath,
        utmSource: current.utmSource,
        utmMedium: current.utmMedium,
        utmCampaign: current.utmCampaign,
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
    content: string;
    occurredAt?: Date;
  },
): Promise<string> {
  requirePermission(actor.role, "crm.manage");
  const inquiryRows = await db
    .select({
      contactId: inquiries.contactId,
      firstResponseAt: inquiries.firstResponseAt,
      sessionId: inquiries.sessionId,
      sourcePagePath: inquiries.sourcePagePath,
      landingPagePath: inquiries.landingPagePath,
      utmSource: inquiries.utmSource,
      utmMedium: inquiries.utmMedium,
      utmCampaign: inquiries.utmCampaign,
    })
    .from(inquiries)
    .where(eq(inquiries.id, inquiryId))
    .limit(1);
  const inquiry = inquiryRows[0];
  if (!inquiry) throw new Error("Inquiry was not found.");
  const occurredAt = input.occurredAt ?? new Date();
  const responseTypes = new Set(["email", "whatsapp", "quote", "sample"]);
  return db.transaction(async (transaction) => {
    const rows = await transaction
      .insert(customerActivities)
      .values({
        inquiryId,
        contactId: inquiry.contactId,
        type: input.type,
        content: input.content.trim(),
        createdByUserId: actor.userId,
        occurredAt,
      })
      .returning({ id: customerActivities.id });
    const activityId = rows[0]?.id;
    if (!activityId) throw new Error("Customer Activity insert failed.");
    if (!inquiry.firstResponseAt && responseTypes.has(input.type)) {
      await transaction
        .update(inquiries)
        .set({ firstResponseAt: occurredAt, updatedAt: new Date() })
        .where(eq(inquiries.id, inquiryId));
    }
    await writeAuditLog(transaction, {
      actorUserId: actor.userId,
      action: "customer_activity.created",
      entityType: "customer_activity",
      entityId: activityId,
      afterSummary: { inquiryId, type: input.type },
    });
    const conversionName =
      input.type === "quote"
        ? "quote_recorded"
        : input.type === "sample"
          ? "sample_recorded"
          : null;
    if (conversionName && inquiry.sessionId) {
      await recordConversionEvent(transaction, {
        eventName: conversionName,
        anonymousSessionId: inquiry.sessionId,
        routePath: inquiry.sourcePagePath,
        inquiryId,
        landingPagePath: inquiry.landingPagePath,
        utmSource: inquiry.utmSource,
        utmMedium: inquiry.utmMedium,
        utmCampaign: inquiry.utmCampaign,
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
  requirePermission(actor.role, "crm.manage");
  await db
    .update(inquiries)
    .set({
      ownerUserId: input.ownerUserId ?? null,
      priority: input.priority,
      qualificationStatus: input.qualificationStatus,
      updatedAt: new Date(),
    })
    .where(eq(inquiries.id, inquiryId));
  await writeAuditLog(db, {
    actorUserId: actor.userId,
    action: "inquiry.assignment.updated",
    entityType: "inquiry",
    entityId: inquiryId,
    afterSummary: {
      ownerUserId: input.ownerUserId ?? null,
      priority: input.priority,
      qualificationStatus: input.qualificationStatus,
    },
  });
}
