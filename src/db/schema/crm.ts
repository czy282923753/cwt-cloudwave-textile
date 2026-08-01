import {
  boolean,
  integer,
  jsonb,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { assets } from "./assets";
import {
  activityTypeEnum,
  activityDirectionEnum,
  attributionConfidenceEnum,
  consentStateEnum,
  inquiryStatusEnum,
  priorityEnum,
  qualificationStatusEnum,
  outboxStatusEnum,
  uploadIntentStatusEnum,
} from "./enums";
import { users } from "./identity";

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  website: text("website"),
  countryCode: text("country_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    normalizedEmail: text("normalized_email").notNull(),
    countryCode: text("country_code"),
    whatsapp: text("whatsapp"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("contacts_normalized_email_unique").on(table.normalizedEmail),
    index("contacts_organization_idx").on(table.organizationId),
  ],
);

export const inquiries = pgTable(
  "inquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicReference: text("public_reference").notNull(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "restrict" }),
    ownerUserId: uuid("owner_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: inquiryStatusEnum("status").notNull().default("new"),
    priority: priorityEnum("priority").notNull().default("normal"),
    qualificationStatus: qualificationStatusEnum("qualification_status")
      .notNull()
      .default("unassessed"),
    description: text("description"),
    submittedName: text("submitted_name").notNull(),
    submittedEmail: text("submitted_email").notNull(),
    submittedCountryCode: text("submitted_country_code"),
    submittedWhatsapp: text("submitted_whatsapp"),
    idempotencyKey: text("idempotency_key").notNull(),
    lostReason: text("lost_reason"),
    sourcePagePath: text("source_page_path").notNull(),
    landingPagePath: text("landing_page_path"),
    referrer: text("referrer"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    lastNonDirectSource: text("last_non_direct_source"),
    lastNonDirectMedium: text("last_non_direct_medium"),
    lastNonDirectCampaign: text("last_non_direct_campaign"),
    attributionConfidence: attributionConfidenceEnum("attribution_confidence")
      .notNull()
      .default("unavailable"),
    analyticsConsentState: consentStateEnum("analytics_consent_state")
      .notNull()
      .default("unknown"),
    sessionId: text("session_id"),
    requestId: text("request_id"),
    firstResponseAt: timestamp("first_response_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    index("inquiries_status_created_idx").on(table.status, table.createdAt),
    index("inquiries_owner_status_idx").on(table.ownerUserId, table.status),
    index("inquiries_contact_idx").on(table.contactId),
    uniqueIndex("inquiries_idempotency_key_unique").on(table.idempotencyKey),
    uniqueIndex("inquiries_public_reference_unique").on(table.publicReference),
  ],
);

export const uploadIntents = pgTable(
  "upload_intents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: text("token_hash").notNull(),
    anonymousSessionId: text("anonymous_session_id").notNull(),
    declaredFileName: text("declared_file_name").notNull(),
    declaredMimeType: text("declared_mime_type").notNull(),
    declaredByteSize: integer("declared_byte_size").notNull(),
    status: uploadIntentStatusEnum("status").notNull().default("created"),
    assetId: uuid("asset_id").references(() => assets.id, { onDelete: "restrict" }),
    consumedByInquiryId: uuid("consumed_by_inquiry_id").references(
      (): typeof inquiries.id => inquiries.id,
      { onDelete: "set null" },
    ),
    isConsumed: boolean("is_consumed").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("upload_intents_token_hash_unique").on(table.tokenHash),
    index("upload_intents_session_status_idx").on(
      table.anonymousSessionId,
      table.status,
    ),
    index("upload_intents_expiry_idx").on(table.expiresAt),
  ],
);

export const inquiryAssets = pgTable(
  "inquiry_assets",
  {
    inquiryId: uuid("inquiry_id")
      .notNull()
      .references(() => inquiries.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "restrict" }),
  },
  (table) => [primaryKey({ columns: [table.inquiryId, table.assetId] })],
);

export const customerActivities = pgTable(
  "customer_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inquiryId: uuid("inquiry_id")
      .notNull()
      .references(() => inquiries.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "restrict" }),
    type: activityTypeEnum("type").notNull(),
    direction: activityDirectionEnum("direction").notNull().default("internal"),
    content: text("content").notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("customer_activities_inquiry_idx").on(table.inquiryId, table.occurredAt),
    index("customer_activities_contact_idx").on(table.contactId),
  ],
);

export const notificationOutbox = pgTable(
  "notification_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    status: outboxStatusEnum("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    attemptCount: integer("attempt_count").notNull().default(0),
    deliveryKey: text("delivery_key").notNull(),
    payload: jsonb("payload").notNull(),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastErrorCode: text("last_error_code"),
    lastError: text("last_error"),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("notification_outbox_kind_aggregate_unique").on(
      table.kind,
      table.aggregateType,
      table.aggregateId,
    ),
    uniqueIndex("notification_outbox_delivery_key_unique").on(table.deliveryKey),
    index("notification_outbox_delivery_idx").on(table.status, table.nextAttemptAt),
  ],
);

export const inquiryStatusHistory = pgTable(
  "inquiry_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inquiryId: uuid("inquiry_id")
      .notNull()
      .references(() => inquiries.id, { onDelete: "cascade" }),
    fromStatus: inquiryStatusEnum("from_status"),
    toStatus: inquiryStatusEnum("to_status").notNull(),
    reason: text("reason"),
    changedByUserId: uuid("changed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("inquiry_status_history_idx").on(table.inquiryId, table.changedAt)],
);
