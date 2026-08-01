import { and, eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import {
  applications,
  contents,
  conversionEvents,
  fabricLibraryEntries,
  products,
  routes,
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
const fileLike = /(?:^|[\/\\])[^/\\]+\.(?:jpe?g|png|webp|avif|pdf|docx?|xlsx?|zip)(?:$|[?#])/i;

function containsCustomerOrPrivateData(value: string): boolean {
  return (
    emailLike.test(value) ||
    phoneLike.test(value) ||
    uuidLike.test(value) ||
    /\/api\/(?:storage|inquiry-assets)\//i.test(value) ||
    fileLike.test(value)
  );
}

function optionalToken(
  label: string,
  value: string | null | undefined,
  maximum: number,
): string | null {
  const normalized = value?.trim() || null;
  if (!normalized) return null;
  if (normalized.length > maximum) throw new Error(`${label} is too long.`);
  if (!/^[a-z0-9][a-z0-9 ._:-]*$/i.test(normalized)) {
    throw new Error(`${label} contains unsupported characters.`);
  }
  if (containsCustomerOrPrivateData(normalized)) {
    throw new Error(`${label} appears to contain customer or private data.`);
  }
  return normalized;
}

function optionalPath(label: string, value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  if (value.length > 500 || /[?#]/.test(value) || containsCustomerOrPrivateData(value)) {
    throw new Error(`${label} is not a safe public path.`);
  }
  return normalizePath(value);
}

function optionalReferrer(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  if (value.length > 200 || containsCustomerOrPrivateData(value)) {
    throw new Error("Referrer is not privacy safe.");
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Referrer must be an absolute HTTP origin.");
  }
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== "/"
  ) {
    throw new Error("Referrer must contain only an HTTP origin.");
  }
  return parsed.origin;
}

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
  entityPath?: string | null;
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
  if (input.consentState !== "granted") return null;
  const safeProperties = input.safeProperties ?? {};
  assertAllowedEventProperties(input.eventName, safeProperties);
  const eventId = input.eventId.trim();
  if (
    !eventId ||
    eventId.length > 128 ||
    !/^[a-z0-9:_-]+$/i.test(eventId) ||
    emailLike.test(eventId) ||
    phoneLike.test(eventId) ||
    uuidLike.test(eventId)
  ) {
    throw new Error("Event ID is invalid.");
  }
  if (!/^[0-9a-f-]{36}$/i.test(input.anonymousSessionId)) {
    throw new Error("Anonymous Session ID is invalid.");
  }
  if (
    Boolean(input.entityType) !== Boolean(input.entityId || input.entityPath) ||
    Boolean(input.entityId && input.entityPath)
  ) {
    throw new Error("Analytics entity type requires exactly one server ID or public path.");
  }
  let resolvedEntityId = input.entityId ?? null;
  if (input.entityType && input.entityPath) {
    const entityPath = optionalPath("Entity Path", input.entityPath);
    const routeRows = await db
      .select({ entityId: routes.entityId })
      .from(routes)
      .where(
        and(
          eq(routes.path, entityPath ?? "/"),
          eq(routes.entityType, input.entityType),
          eq(routes.isCurrent, true),
        ),
      )
      .limit(1);
    resolvedEntityId = routeRows[0]?.entityId ?? null;
    if (!resolvedEntityId) {
      throw new Error("Analytics entity path must resolve to a current public route.");
    }
  }
  if (input.entityType && resolvedEntityId) {
    const entityRows =
      input.entityType === "product"
        ? await db
            .select({ id: products.id })
            .from(products)
            .where(and(eq(products.id, resolvedEntityId), eq(products.status, "published")))
            .limit(1)
        : input.entityType === "application"
          ? await db
              .select({ id: applications.id })
              .from(applications)
              .where(
                and(eq(applications.id, resolvedEntityId), eq(applications.status, "published")),
              )
              .limit(1)
          : input.entityType === "fabric_entry"
            ? await db
                .select({ id: fabricLibraryEntries.id })
                .from(fabricLibraryEntries)
                .where(
                  and(
                    eq(fabricLibraryEntries.id, resolvedEntityId),
                    eq(fabricLibraryEntries.status, "published"),
                  ),
                )
                .limit(1)
            : await db
                .select({ id: contents.id })
                .from(contents)
                .where(and(eq(contents.id, resolvedEntityId), eq(contents.status, "published")))
                .limit(1);
    if (!entityRows[0]) throw new Error("Analytics entity must be currently published.");
  }
  const rows = await db
    .insert(conversionEvents)
    .values({
      eventId,
      eventName: input.eventName,
      anonymousSessionId: input.anonymousSessionId,
      routePath: optionalPath("Route Path", input.routePath) ?? "/",
      consentState: input.consentState,
      entityType: truncate(input.entityType, 50),
      entityId: resolvedEntityId,
      inquiryId: input.inquiryId ?? null,
      landingPagePath: optionalPath("Landing Page", input.landingPagePath),
      submitSourcePagePath: optionalPath("Submit Source", input.submitSourcePagePath),
      referrerOrigin: optionalReferrer(input.referrerOrigin),
      utmSource: optionalToken("UTM Source", input.utmSource, 100),
      utmMedium: optionalToken("UTM Medium", input.utmMedium, 100),
      utmCampaign: optionalToken("UTM Campaign", input.utmCampaign, 100),
      lastNonDirectSource: input.lastNonDirectSource?.startsWith("http")
        ? optionalReferrer(input.lastNonDirectSource)
        : optionalToken("Last Non-Direct Source", input.lastNonDirectSource, 200),
      lastNonDirectMedium: optionalToken(
        "Last Non-Direct Medium",
        input.lastNonDirectMedium,
        100,
      ),
      lastNonDirectCampaign: optionalToken(
        "Last Non-Direct Campaign",
        input.lastNonDirectCampaign,
        100,
      ),
      attributionConfidence: input.attributionConfidence ?? "unavailable",
      countryCode: input.countryCode
        ? /^[A-Z]{2}$/.test(input.countryCode)
          ? input.countryCode
          : (() => { throw new Error("Country Code is invalid."); })()
        : null,
      safeProperties,
    })
    .onConflictDoNothing({ target: conversionEvents.eventId })
    .returning({ id: conversionEvents.id });
  if (rows[0]?.id) return rows[0].id;
  const existing = await db
    .select({
      id: conversionEvents.id,
      eventName: conversionEvents.eventName,
      sessionId: conversionEvents.anonymousSessionId,
      routePath: conversionEvents.routePath,
    })
    .from(conversionEvents)
    .where(eq(conversionEvents.eventId, eventId))
    .limit(1);
  const replay = existing[0];
  if (
    replay &&
    (replay.eventName !== input.eventName ||
      replay.sessionId !== input.anonymousSessionId ||
      replay.routePath !== (optionalPath("Route Path", input.routePath) ?? "/"))
  ) {
    throw new Error("Event ID replay payload does not match the original event.");
  }
  return replay?.id ?? null;
}
