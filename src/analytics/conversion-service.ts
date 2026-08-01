import { and, eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import {
  applications,
  contents,
  conversionEvents,
  fabricLibraryEntries,
  products,
} from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import { normalizePath } from "@/seo/path";

type SafePrimitive = string | number | boolean | null;
type SafeProperties = Readonly<Record<string, SafePrimitive>>;
type EventName = typeof conversionEvents.$inferInsert.eventName;
type PublicEntityType = "product" | "application" | "fabric_entry" | "content";

const propertyAllowlist: Readonly<Record<EventName, ReadonlySet<string>>> = {
  product_view: new Set(["placement"]),
  quote_cta_click: new Set(["placement"]),
  whatsapp_click: new Set(["placement"]),
  upload_started: new Set(["file_count"]),
  image_upload_completed: new Set(["file_count"]),
  quote_submit_success: new Set(["placement"]),
  inquiry_created: new Set(),
  inquiry_qualified: new Set(),
  quote_recorded: new Set(),
  sample_recorded: new Set(),
  inquiry_won: new Set(),
  inquiry_lost: new Set(),
};

const emailLike = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/;
const phoneLike = /(?:\+?\d[\d\s().-]{6,}\d)/;
const urlLike = /(?:https?:\/\/|\/api\/(?:storage|inquiry-assets)\/)/i;
const uuidLike = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;

export function assertAllowedEventProperties(
  eventName: EventName,
  properties: SafeProperties,
): void {
  const allowed = propertyAllowlist[eventName];
  for (const [key, value] of Object.entries(properties)) {
    if (!allowed.has(key)) {
      throw new Error(`Analytics property ${key} is not allowed for ${eventName}.`);
    }
    if (typeof value === "string") {
      if (value.length > 120) throw new Error("Analytics property value is too long.");
      if (
        emailLike.test(value) ||
        phoneLike.test(value) ||
        urlLike.test(value) ||
        uuidLike.test(value)
      ) {
        throw new Error("Analytics property value appears to contain customer data.");
      }
    }
    if (key === "file_count" && (typeof value !== "number" || !Number.isInteger(value))) {
      throw new Error("file_count must be an integer.");
    }
  }
}

/** Compatibility-level privacy assertion for callers that do not yet know an event name. */
export function assertPiiFreeProperties(properties: SafeProperties): void {
  for (const [key, value] of Object.entries(properties)) {
    if (!/^(placement|file_count)$/.test(key)) {
      throw new Error(`Analytics property ${key} is not globally allowed.`);
    }
    if (
      typeof value === "string" &&
      (value.length > 120 ||
        emailLike.test(value) ||
        phoneLike.test(value) ||
        urlLike.test(value) ||
        uuidLike.test(value))
    ) {
      throw new Error("Analytics property value appears to contain customer data.");
    }
  }
}

function truncate(value: string | null | undefined, limit = 200): string | null {
  return value?.trim() ? value.trim().slice(0, limit) : null;
}

export interface ConversionInput {
  eventId: string;
  eventName: EventName;
  anonymousSessionId: string;
  routePath: string;
  consentState: typeof conversionEvents.$inferInsert.consentState;
  entityType?: PublicEntityType | null;
  entityId?: string | null;
  inquiryId?: string | null;
  landingPagePath?: string | null;
  submitSourcePagePath?: string | null;
  referrerOrigin?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  lastNonDirectSource?: string | null;
  lastNonDirectMedium?: string | null;
  lastNonDirectCampaign?: string | null;
  attributionConfidence?: typeof conversionEvents.$inferInsert.attributionConfidence;
  countryCode?: string | null;
  safeProperties?: SafeProperties;
}

export async function recordConversionEvent<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  input: ConversionInput,
): Promise<string | null> {
  if (input.consentState === "denied") return null;
  const safeProperties = input.safeProperties ?? {};
  assertAllowedEventProperties(input.eventName, safeProperties);
  const eventId = input.eventId.trim();
  if (!eventId || eventId.length > 200) throw new Error("Event ID is invalid.");
  if (Boolean(input.entityType) !== Boolean(input.entityId)) {
    throw new Error("Analytics entity type and ID must be provided together.");
  }
  if (input.entityType && input.entityId) {
    const entityRows =
      input.entityType === "product"
        ? await db
            .select({ id: products.id })
            .from(products)
            .where(and(eq(products.id, input.entityId), eq(products.status, "published")))
            .limit(1)
        : input.entityType === "application"
          ? await db
              .select({ id: applications.id })
              .from(applications)
              .where(
                and(eq(applications.id, input.entityId), eq(applications.status, "published")),
              )
              .limit(1)
          : input.entityType === "fabric_entry"
            ? await db
                .select({ id: fabricLibraryEntries.id })
                .from(fabricLibraryEntries)
                .where(
                  and(
                    eq(fabricLibraryEntries.id, input.entityId),
                    eq(fabricLibraryEntries.status, "published"),
                  ),
                )
                .limit(1)
            : await db
                .select({ id: contents.id })
                .from(contents)
                .where(and(eq(contents.id, input.entityId), eq(contents.status, "published")))
                .limit(1);
    if (!entityRows[0]) throw new Error("Analytics entity must be currently published.");
  }
  const rows = await db
    .insert(conversionEvents)
    .values({
      eventId,
      eventName: input.eventName,
      anonymousSessionId: input.anonymousSessionId,
      routePath: normalizePath(input.routePath),
      consentState: input.consentState,
      entityType: truncate(input.entityType, 50),
      entityId: input.entityId ?? null,
      inquiryId: input.inquiryId ?? null,
      landingPagePath: input.landingPagePath
        ? normalizePath(input.landingPagePath)
        : null,
      submitSourcePagePath: input.submitSourcePagePath
        ? normalizePath(input.submitSourcePagePath)
        : null,
      referrerOrigin: truncate(input.referrerOrigin),
      utmSource: truncate(input.utmSource, 100),
      utmMedium: truncate(input.utmMedium, 100),
      utmCampaign: truncate(input.utmCampaign, 100),
      lastNonDirectSource: truncate(input.lastNonDirectSource, 200),
      lastNonDirectMedium: truncate(input.lastNonDirectMedium, 100),
      lastNonDirectCampaign: truncate(input.lastNonDirectCampaign, 100),
      attributionConfidence: input.attributionConfidence ?? "unavailable",
      countryCode: truncate(input.countryCode, 2),
      safeProperties,
    })
    .onConflictDoNothing({ target: conversionEvents.eventId })
    .returning({ id: conversionEvents.id });
  if (rows[0]?.id) return rows[0].id;
  const existing = await db
    .select({ id: conversionEvents.id })
    .from(conversionEvents)
    .where(eq(conversionEvents.eventId, eventId))
    .limit(1);
  return existing[0]?.id ?? null;
}
