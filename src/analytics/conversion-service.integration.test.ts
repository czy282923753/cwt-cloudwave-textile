import { describe, expect, it } from "vitest";

import { applications, conversionEvents, routes } from "@/db/schema";
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
      consentState: "granted",
      safeProperties: { placement: "product_hero" },
    });
    const rows = await connection.db.select().from(conversionEvents);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.safeProperties).toEqual({
      placement: "product_hero",
    });
    await connection.close();
  });

  it("resolves a public entity path server-side without accepting a client-visible internal ID", async () => {
    const connection = await createTestDatabase();
    const applicationRows = await connection.db
      .insert(applications)
      .values({ internalKey: "analytics-path-fixture", status: "published" })
      .returning({ id: applications.id });
    const applicationId = applicationRows[0]?.id;
    if (!applicationId) throw new Error("Missing analytics Application fixture.");
    await connection.db.insert(routes).values({
      path: "/applications/analytics-path-fixture/",
      entityType: "application",
      entityId: applicationId,
    });
    await recordConversionEvent(connection.db, {
      eventId: "evt_public_path_fixture_0001",
      eventName: "quote_cta_click",
      anonymousSessionId: "8d9bfe9b-3168-4c47-86c0-06f7e1097a60",
      routePath: "/applications/analytics-path-fixture/",
      entityType: "application",
      entityPath: "/applications/analytics-path-fixture/",
      consentState: "granted",
    });
    const rows = await connection.db.select().from(conversionEvents);
    expect(rows[0]).toMatchObject({ entityType: "application", entityId: applicationId });
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
    await expect(
      recordConversionEvent(connection.db, {
        ...input,
        eventId: "unknown-consent-event-0001",
        consentState: "unknown",
      }),
    ).resolves.toBeNull();
    await expect(
      recordConversionEvent(connection.db, {
        ...input,
        eventName: "whatsapp_click",
      }),
    ).rejects.toThrow(/replay payload/);
    const rows = await connection.db.select().from(conversionEvents);
    expect(rows).toHaveLength(1);
    await connection.close();
  });

  it("blocks PII and private identifiers in every top-level attribution field", async () => {
    const connection = await createTestDatabase();
    const base = {
      eventId: "top-level-privacy-0001",
      eventName: "quote_cta_click" as const,
      anonymousSessionId: "8d9bfe9b-3168-4c47-86c0-06f7e1097a60",
      routePath: "/get-quote/",
      consentState: "granted" as const,
      safeProperties: { placement: "hero" },
    };
    await expect(recordConversionEvent(connection.db, { ...base, utmSource: "buyer@example.test" })).rejects.toThrow(/unsupported characters|customer or private data/);
    await expect(recordConversionEvent(connection.db, { ...base, eventId: "top-level-privacy-0002", referrerOrigin: "https://example.test/buyer@example.test" })).rejects.toThrow(/privacy safe/);
    await expect(recordConversionEvent(connection.db, { ...base, eventId: "top-level-privacy-0003", utmCampaign: "11111111-1111-4111-8111-111111111111" })).rejects.toThrow(/customer or private data/);
    await expect(recordConversionEvent(connection.db, { ...base, eventId: "top-level-privacy-0004", utmMedium: "x".repeat(101) })).rejects.toThrow(/too long/);
    await expect(recordConversionEvent(connection.db, { ...base, eventId: "top-level-privacy-0005", landingPagePath: "/api/inquiry-assets/private/" })).rejects.toThrow(/safe public path/);
    await expect(recordConversionEvent(connection.db, { ...base, eventId: "11111111-1111-4111-8111-111111111111" })).rejects.toThrow(/Event ID is invalid/);
    const rows = await connection.db.select().from(conversionEvents);
    expect(rows).toHaveLength(0);
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
