import { desc, eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { requirePermission } from "@/auth/permissions";
import type { Actor } from "@/catalog/product-service";
import {
  assets,
  contacts,
  customerActivities,
  inquiries,
  inquiryAssets,
  inquiryStatusHistory,
  users,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";

import { requireInquiryRecordAccess } from "./authorization";
import { allowedInquiryStatusTransitions } from "./inquiry-service";
import {
  resolveInquirySourcePresentation,
  type InquirySourceEntity,
} from "./inquiry-source-resolution";

const sourceTypeLabels: Readonly<Record<InquirySourceEntity["type"], string>> = {
  product: "Product",
  application: "Application",
  content: "Content",
};

function storedSourceEntity(
  inquiry: typeof inquiries.$inferSelect,
): InquirySourceEntity | null {
  if (!inquiry.sourceEntityId) return null;
  if (
    inquiry.sourceEntityType !== "product" &&
    inquiry.sourceEntityType !== "application" &&
    inquiry.sourceEntityType !== "content"
  ) return null;
  return { type: inquiry.sourceEntityType, id: inquiry.sourceEntityId };
}

export async function listInquiryCrmSummaries<
  TQueryResult extends PgQueryResultHKT,
>(db: AppDatabase<TQueryResult>, actor: Actor) {
  requirePermission(actor.role, "inquiries.read");
  return db
    .select({
      id: inquiries.id,
      contactName: contacts.name,
      email: contacts.email,
      status: inquiries.status,
      priority: inquiries.priority,
      qualificationStatus: inquiries.qualificationStatus,
      ownerName: users.displayName,
      sourcePagePath: inquiries.sourcePagePath,
      createdAt: inquiries.createdAt,
    })
    .from(inquiries)
    .innerJoin(contacts, eq(contacts.id, inquiries.contactId))
    .leftJoin(users, eq(users.id, inquiries.ownerUserId))
    .where(actor.role === "admin" ? undefined : eq(inquiries.ownerUserId, actor.userId))
    .orderBy(desc(inquiries.createdAt));
}

/**
 * The sole record-scoped Inquiry CRM detail projection. Stored attribution is
 * historical evidence; the optional label/link is independently rechecked
 * against current public authority and never exposes the stored entity UUID.
 */
export async function getInquiryCrmReadProjection<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  actor: Actor,
  inquiryId: string,
) {
  const inquiry = await requireInquiryRecordAccess(db, actor, inquiryId, "read");
  const sourceEntity = storedSourceEntity(inquiry);
  const [contactRows, activities, history, files, currentPublicSource] = await Promise.all([
    db
      .select({
        name: contacts.name,
        email: contacts.email,
        countryCode: contacts.countryCode,
        whatsapp: contacts.whatsapp,
      })
      .from(contacts)
      .where(eq(contacts.id, inquiry.contactId))
      .limit(1),
    db
      .select({
        type: customerActivities.type,
        direction: customerActivities.direction,
        content: customerActivities.content,
        operator: users.displayName,
        occurredAt: customerActivities.occurredAt,
      })
      .from(customerActivities)
      .leftJoin(users, eq(users.id, customerActivities.createdByUserId))
      .where(eq(customerActivities.inquiryId, inquiryId))
      .orderBy(desc(customerActivities.occurredAt)),
    db
      .select({
        fromStatus: inquiryStatusHistory.fromStatus,
        toStatus: inquiryStatusHistory.toStatus,
        reason: inquiryStatusHistory.reason,
        changedAt: inquiryStatusHistory.changedAt,
      })
      .from(inquiryStatusHistory)
      .where(eq(inquiryStatusHistory.inquiryId, inquiryId))
      .orderBy(desc(inquiryStatusHistory.changedAt)),
    db
      .select({ id: assets.id, fileName: assets.originalFileName })
      .from(inquiryAssets)
      .innerJoin(assets, eq(assets.id, inquiryAssets.assetId))
      .where(eq(inquiryAssets.inquiryId, inquiryId)),
    sourceEntity
      ? resolveInquirySourcePresentation(db, sourceEntity)
      : Promise.resolve(null),
  ]);
  const contact = contactRows[0];
  if (!contact) return null;

  return {
    id: inquiry.id,
    contactName: contact.name,
    email: contact.email,
    countryCode: contact.countryCode,
    whatsapp: contact.whatsapp,
    submittedName: inquiry.submittedName,
    submittedEmail: inquiry.submittedEmail,
    submittedCountryCode: inquiry.submittedCountryCode,
    submittedWhatsapp: inquiry.submittedWhatsapp,
    description: inquiry.description,
    status: inquiry.status,
    priority: inquiry.priority,
    qualificationStatus: inquiry.qualificationStatus,
    ownerUserId: inquiry.ownerUserId,
    lostReason: inquiry.lostReason,
    createdAt: inquiry.createdAt,
    firstResponseAt: inquiry.firstResponseAt,
    firstResponseMinutes: inquiry.firstResponseAt
      ? Math.round(
          (inquiry.firstResponseAt.getTime() - inquiry.createdAt.getTime()) / 60_000,
        )
      : null,
    isEffectiveInquiry: inquiry.status !== "spam",
    allowedNextStatuses: allowedInquiryStatusTransitions(inquiry.status),
    attribution: {
      confidence: inquiry.attributionConfidence,
      firstTouch: {
        landingPagePath: inquiry.landingPagePath,
        referrer: inquiry.referrer,
        utmSource: inquiry.utmSource,
        utmMedium: inquiry.utmMedium,
        utmCampaign: inquiry.utmCampaign,
      },
      lastNonDirect: {
        source: inquiry.lastNonDirectSource,
        medium: inquiry.lastNonDirectMedium,
        campaign: inquiry.lastNonDirectCampaign,
      },
      submitTouch: {
        sourcePagePath: inquiry.sourcePagePath,
        referrer: inquiry.submitReferrer,
        utmSource: inquiry.submitUtmSource,
        utmMedium: inquiry.submitUtmMedium,
        utmCampaign: inquiry.submitUtmCampaign,
      },
      sourceEntityEvidence: sourceEntity
        ? {
            type: sourceEntity.type,
            typeLabel: sourceTypeLabels[sourceEntity.type],
            currentPublicSource,
          }
        : null,
    },
    activities,
    history,
    files,
  } as const;
}
