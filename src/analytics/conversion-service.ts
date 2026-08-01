import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { conversionEvents } from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import { normalizePath } from "@/seo/path";

type SafePrimitive = string | number | boolean | null;
type SafeProperties = Readonly<Record<string, SafePrimitive>>;

const forbiddenKey = /(email|e-mail|phone|whatsapp|name|description|message|address|file)/i;
const emailLike = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/;
const phoneLike = /(?:\+?\d[\d\s().-]{6,}\d)/;

export function assertPiiFreeProperties(properties: SafeProperties): void {
  for (const [key, value] of Object.entries(properties)) {
    if (forbiddenKey.test(key)) throw new Error(`Analytics property ${key} is not allowed.`);
    if (typeof value === "string" && (emailLike.test(value) || phoneLike.test(value))) {
      throw new Error("Analytics property value appears to contain PII.");
    }
  }
}

function truncate(value: string | null | undefined, limit = 200): string | null {
  return value?.trim() ? value.trim().slice(0, limit) : null;
}

export interface ConversionInput {
  eventName: typeof conversionEvents.$inferInsert.eventName;
  anonymousSessionId: string;
  routePath: string;
  entityType?: string | null | undefined;
  entityId?: string | null | undefined;
  inquiryId?: string | null | undefined;
  landingPagePath?: string | null | undefined;
  referrerOrigin?: string | null | undefined;
  utmSource?: string | null | undefined;
  utmMedium?: string | null | undefined;
  utmCampaign?: string | null | undefined;
  countryCode?: string | null | undefined;
  safeProperties?: SafeProperties | undefined;
}

export async function recordConversionEvent<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  input: ConversionInput,
): Promise<string> {
  const safeProperties = input.safeProperties ?? {};
  assertPiiFreeProperties(safeProperties);
  const rows = await db
    .insert(conversionEvents)
    .values({
      eventName: input.eventName,
      anonymousSessionId: input.anonymousSessionId,
      routePath: normalizePath(input.routePath),
      entityType: truncate(input.entityType, 50),
      entityId: input.entityId ?? null,
      inquiryId: input.inquiryId ?? null,
      landingPagePath: input.landingPagePath
        ? normalizePath(input.landingPagePath)
        : null,
      referrerOrigin: truncate(input.referrerOrigin),
      utmSource: truncate(input.utmSource, 100),
      utmMedium: truncate(input.utmMedium, 100),
      utmCampaign: truncate(input.utmCampaign, 100),
      countryCode: truncate(input.countryCode, 2),
      safeProperties,
    })
    .returning({ id: conversionEvents.id });
  const eventId = rows[0]?.id;
  if (!eventId) throw new Error("Conversion Event insert failed.");
  return eventId;
}
