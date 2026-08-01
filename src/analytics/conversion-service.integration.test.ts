import { describe, expect, it } from "vitest";

import { conversionEvents } from "@/db/schema";
import { createTestDatabase } from "@/test/database";

import { assertPiiFreeProperties, recordConversionEvent } from "./conversion-service";

describe("Conversion Events privacy boundary", () => {
  it("stores allowlisted behavioral context without PII", async () => {
    const connection = await createTestDatabase();
    await recordConversionEvent(connection.db, {
      eventId: "test-event-quote-cta-0001",
      eventName: "quote_cta_click",
      anonymousSessionId: "8d9bfe9b-3168-4c47-86c0-06f7e1097a60",
      routePath: "/products/test-product/",
      consentState: "unknown",
      safeProperties: { placement: "product_hero" },
    });
    const rows = await connection.db.select().from(conversionEvents);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.safeProperties).toEqual({
      placement: "product_hero",
    });
    await connection.close();
  });

  it("blocks PII-like keys and values", () => {
    expect(() => assertPiiFreeProperties({ file_count: 2 })).not.toThrow();
    expect(() => assertPiiFreeProperties({ email: "hidden" })).toThrow();
    expect(() => assertPiiFreeProperties({ file_name: "customer.jpg" })).toThrow();
    expect(() =>
      assertPiiFreeProperties({ label: "buyer@example.test" }),
    ).toThrow();
    expect(() => assertPiiFreeProperties({ label: "+1 555 123 4567" })).toThrow();
  });

  it("deduplicates Event IDs and suppresses denied-consent events", async () => {
    const connection = await createTestDatabase();
    const input = {
      eventId: "dedupe-event-0001",
      eventName: "quote_cta_click" as const,
      anonymousSessionId: "8d9bfe9b-3168-4c47-86c0-06f7e1097a60",
      routePath: "/products/example/",
      consentState: "granted" as const,
      safeProperties: { placement: "product_footer" },
    };
    const first = await recordConversionEvent(connection.db, input);
    const second = await recordConversionEvent(connection.db, input);
    expect(second).toBe(first);
    await expect(
      recordConversionEvent(connection.db, {
        ...input,
        eventId: "denied-event-0001",
        consentState: "denied",
      }),
    ).resolves.toBeNull();
    const rows = await connection.db.select().from(conversionEvents);
    expect(rows).toHaveLength(1);
    await connection.close();
  });

  it("enforces the per-event allowlist and stores first/last-touch attribution", async () => {
    const connection = await createTestDatabase();
    await expect(
      recordConversionEvent(connection.db, {
        eventId: "disallowed-property-0001",
        eventName: "product_view",
        anonymousSessionId: "8d9bfe9b-3168-4c47-86c0-06f7e1097a60",
        routePath: "/products/example/",
        consentState: "granted",
        safeProperties: { file_count: 1 },
      }),
    ).rejects.toThrow(/not allowed/);
    await expect(
      recordConversionEvent(connection.db, {
        eventId: "private-value-0001",
        eventName: "quote_cta_click",
        anonymousSessionId: "8d9bfe9b-3168-4c47-86c0-06f7e1097a60",
        routePath: "/products/example/",
        consentState: "granted",
        safeProperties: { placement: "/api/inquiry-assets/private-file" },
      }),
    ).rejects.toThrow(/customer data/);
    await recordConversionEvent(connection.db, {
      eventId: "attribution-event-0001",
      eventName: "quote_submit_success",
      anonymousSessionId: "8d9bfe9b-3168-4c47-86c0-06f7e1097a60",
      routePath: "/get-quote/",
      landingPagePath: "/products/first-touch/",
      referrerOrigin: "https://www.google.com",
      utmSource: "google",
      utmMedium: "organic",
      utmCampaign: "first-touch",
      lastNonDirectSource: "newsletter",
      lastNonDirectMedium: "email",
      lastNonDirectCampaign: "follow-up",
      submitSourcePagePath: "/get-quote/",
      attributionConfidence: "high",
      consentState: "granted",
      safeProperties: { placement: "quote_form" },
    });
    const rows = await connection.db.select().from(conversionEvents);
    expect(rows[0]).toMatchObject({
      landingPagePath: "/products/first-touch/",
      referrerOrigin: "https://www.google.com",
      utmSource: "google",
      lastNonDirectSource: "newsletter",
      lastNonDirectMedium: "email",
      submitSourcePagePath: "/get-quote/",
      attributionConfidence: "high",
    });
    await connection.close();
  });
});
