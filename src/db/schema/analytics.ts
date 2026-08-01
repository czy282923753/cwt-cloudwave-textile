import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { conversionEventEnum } from "./enums";
import { inquiries } from "./crm";

export const conversionEvents = pgTable(
  "conversion_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventName: conversionEventEnum("event_name").notNull(),
    anonymousSessionId: text("anonymous_session_id").notNull(),
    routePath: text("route_path").notNull(),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    inquiryId: uuid("inquiry_id").references(() => inquiries.id, {
      onDelete: "set null",
    }),
    landingPagePath: text("landing_page_path"),
    referrerOrigin: text("referrer_origin"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    countryCode: text("country_code"),
    safeProperties: jsonb("safe_properties"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("conversion_events_name_time_idx").on(table.eventName, table.occurredAt),
    index("conversion_events_route_time_idx").on(table.routePath, table.occurredAt),
    index("conversion_events_inquiry_idx").on(table.inquiryId),
  ],
);
