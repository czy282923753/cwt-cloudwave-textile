import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import {
  attributionConfidenceEnum,
  consentStateEnum,
  conversionEventEnum,
} from "./enums";
import { inquiries } from "./crm";

export const conversionEvents = pgTable(
  "conversion_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: text("event_id").notNull(),
    eventName: conversionEventEnum("event_name").notNull(),
    anonymousSessionId: text("anonymous_session_id").notNull(),
    routePath: text("route_path").notNull(),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    inquiryId: uuid("inquiry_id").references(() => inquiries.id, {
      onDelete: "set null",
    }),
    landingPagePath: text("landing_page_path"),
    submitSourcePagePath: text("submit_source_page_path"),
    referrerOrigin: text("referrer_origin"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    lastNonDirectSource: text("last_non_direct_source"),
    lastNonDirectMedium: text("last_non_direct_medium"),
    lastNonDirectCampaign: text("last_non_direct_campaign"),
    attributionConfidence: attributionConfidenceEnum("attribution_confidence")
      .notNull()
      .default("unavailable"),
    consentState: consentStateEnum("consent_state").notNull().default("unknown"),
    countryCode: text("country_code"),
    safeProperties: jsonb("safe_properties"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("conversion_events_event_id_unique").on(table.eventId),
    index("conversion_events_name_time_idx").on(table.eventName, table.occurredAt),
    index("conversion_events_route_time_idx").on(table.routePath, table.occurredAt),
    index("conversion_events_inquiry_idx").on(table.inquiryId),
  ],
);
