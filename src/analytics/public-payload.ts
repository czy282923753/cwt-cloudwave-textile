import type { conversionEvents } from "@/db/schema";

type ConversionEvent = typeof conversionEvents.$inferSelect;

export interface PublicAnalyticsPayload {
  eventId: string;
  eventName: ConversionEvent["eventName"];
  routePath: string;
  entityType: string | null;
  externalReference: string | null;
  landingPagePath: string | null;
  submitSourcePagePath: string | null;
  referrerOrigin: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  safeProperties: unknown;
  occurredAt: string;
}

/**
 * Provider payload boundary. Internal database IDs and anonymous Consent Session
 * identifiers are intentionally absent and cannot enter GA4 through this mapper.
 */
export function toPublicAnalyticsPayload(
  event: ConversionEvent,
): PublicAnalyticsPayload {
  return {
    eventId: event.eventId,
    eventName: event.eventName,
    routePath: event.routePath,
    entityType: event.entityType,
    externalReference: event.externalReference,
    landingPagePath: event.landingPagePath,
    submitSourcePagePath: event.submitSourcePagePath,
    referrerOrigin: event.referrerOrigin,
    utmSource: event.utmSource,
    utmMedium: event.utmMedium,
    utmCampaign: event.utmCampaign,
    safeProperties: event.safeProperties,
    occurredAt: event.occurredAt.toISOString(),
  };
}
