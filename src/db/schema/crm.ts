import {
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
  attributionConfidenceEnum,
  inquiryStatusEnum,
  priorityEnum,
  qualificationStatusEnum,
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
