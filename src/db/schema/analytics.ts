import {
  check,
  integer,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import {
  attributionConfidenceEnum,
  consentStateEnum,
  conversionEventEnum,
} from "./enums";

export const analyticsConsents = pgTable(
  "analytics_consents",
  {
    consentSessionId: text("consent_session_id").primaryKey(),
    status: consentStateEnum("status").notNull().default("unknown"),
    consentVersion: integer("consent_version").notNull().default(0),
    grantedAt: timestamp("granted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("analytics_consents_status_idx").on(table.status)],
);

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
    externalReference: text("external_reference"),
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
    index("conversion_events_external_reference_idx").on(table.externalReference),
    check(
      "conversion_events_public_only_check",
      sql`${table.entityType} is null or ${table.entityType} in ('product', 'application', 'fabric_entry', 'content', 'taxonomy')`,
    ),
  ],
);
