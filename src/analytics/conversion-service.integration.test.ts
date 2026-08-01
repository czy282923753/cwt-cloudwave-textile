import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  analyticsConsents,
  applications,
  conversionEvents,
  routes,
} from "@/db/schema";
import { createTestDatabase } from "@/test/database";

import { toPublicAnalyticsPayload } from "./public-payload";
import {
  assertPiiFreeProperties,
  recordConversionEvent,
} from "./conversion-service";

const consentSessionId = "8d9bfe9b-3168-4c47-86c0-06f7e1097a60";

async function persistConsent(
  connection: Awaited<ReturnType<typeof createTestDatabase>>,
  status: "unknown" | "granted" | "denied" | "revoked",
) {
  await connection.db
    .insert(analyticsConsents)
    .values({ consentSessionId, status })
    .onConflictDoUpdate({
      target: analyticsConsents.consentSessionId,
      set: { status, consentVersion: 1, updatedAt: new Date() },
    });
}

function baseInput(eventId: string) {
  return {
    eventId,
    eventName: "quote_cta_click" as const,
    consentSessionId,
    routePath: "/products/test-product/",
    safeProperties: { placement: "product_hero" },
  };
}

describe("Conversion Events privacy boundary", () => {
  it("stores allowlisted behavior only after server-persisted Granted consent", async () => {
    const connection = await createTestDatabase();
    await persistConsent(connection, "granted");
    await recordConversionEvent(connection.db, baseInput("test-event-quote-cta-0001"));
    const rows = await connection.db.select().from(conversionEvents);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      consentState: "granted",
      anonymousSessionId: consentSessionId,
      safeProperties: { placement: "product_hero" },
    });
    await connection.close();
  });

  it("rejects Unknown, Denied, and Revoked consent including an old-page retry", async () => {
    const connection = await createTestDatabase();
    for (const [index, status] of ["unknown", "denied", "revoked"] .entries()) {
      await persistConsent(connection, status as "unknown" | "denied" | "revoked");
      await expect(
        recordConversionEvent(connection.db, baseInput(`server-consent-${index}-0001`)),
      ).resolves.toBeNull();
    }
    expect(await connection.db.select().from(conversionEvents)).toHaveLength(0);
    await connection.close();
  });

  it("resolves a public entity path without accepting a client entity UUID", async () => {
    const connection = await createTestDatabase();
    await persistConsent(connection, "granted");
    const applicationRows = await connection.db
      .insert(applications)
      .values({ internalKey: "analytics-path-fixture", status: "published" })
      .returning({ id: applications.id });
    const applicationId = applicationRows[0]!.id;
    await connection.db.insert(routes).values({
      path: "/applications/analytics-path-fixture/",
      entityType: "application",
      entityId: applicationId,
    });
    await recordConversionEvent(connection.db, {
      ...baseInput("evt_public_path_fixture_0001"),
      routePath: "/applications/analytics-path-fixture/",
      entityType: "application",
      entityPath: "/applications/analytics-path-fixture/",
    });
    const rows = await connection.db.select().from(conversionEvents);
    expect(rows[0]).toMatchObject({ entityType: "application", entityId: applicationId });
    await connection.close();
  });

  it("contains no Inquiry foreign key and exports no internal identifiers", async () => {
    const connection = await createTestDatabase();
    await persistConsent(connection, "granted");
    await recordConversionEvent(connection.db, {
      ...baseInput("inquiry-created-public-ref-0001"),
      eventName: "inquiry_created",
      externalReference: "CWT-0123456789ABCDEF0123",
      safeProperties: {},
    });
    const columns = await connection.db.execute<{ column_name: string }>(sql`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'conversion_events'
    `);
    expect(columns.rows.map((row) => row.column_name)).not.toContain("inquiry_id");
    const event = (await connection.db.select().from(conversionEvents))[0]!;
    const payload = toPublicAnalyticsPayload(event);
    expect(payload.externalReference).toBe("CWT-0123456789ABCDEF0123");
    expect(JSON.stringify(payload)).not.toContain(event.id);
    expect(JSON.stringify(payload)).not.toContain(consentSessionId);
    expect(Object.keys(payload)).not.toEqual(
      expect.arrayContaining(["entityId", "inquiryId", "contactId", "assetId"]),
    );
    await connection.close();
  });

  it("deduplicates Event IDs and rejects mismatched replay payloads", async () => {
    const connection = await createTestDatabase();
    await persistConsent(connection, "granted");
    const input = baseInput("dedupe-event-0001");
    const first = await recordConversionEvent(connection.db, input);
    expect(await recordConversionEvent(connection.db, input)).toBe(first);
    await expect(
      recordConversionEvent(connection.db, { ...input, eventName: "whatsapp_click" }),
    ).rejects.toThrow(/replay payload/);
    expect(await connection.db.select().from(conversionEvents)).toHaveLength(1);
    await connection.close();
  });

  it("blocks PII, private identifiers, and non-allowlisted properties", async () => {
    const connection = await createTestDatabase();
    await persistConsent(connection, "granted");
    expect(() => assertPiiFreeProperties({ file_count: 2 })).not.toThrow();
    expect(() => assertPiiFreeProperties({ email: "hidden" })).toThrow();
    expect(() => assertPiiFreeProperties({ file_name: "customer.jpg" })).toThrow();
    await expect(
      recordConversionEvent(connection.db, {
        ...baseInput("top-level-privacy-0001"),
        utmSource: "buyer@example.test",
      }),
    ).rejects.toThrow(/unsupported characters|customer or private data/);
    await expect(
      recordConversionEvent(connection.db, {
        ...baseInput("top-level-privacy-0002"),
        landingPagePath: "/api/inquiry-assets/private/",
      }),
    ).rejects.toThrow(/safe public path/);
    await expect(
      recordConversionEvent(connection.db, {
        ...baseInput("top-level-privacy-0003"),
        eventName: "product_view",
        safeProperties: { file_count: 1 },
      }),
    ).rejects.toThrow(/not allowed/);
    expect(await connection.db.select().from(conversionEvents)).toHaveLength(0);
    await connection.close();
  });

  it("records bounded first/last-touch attribution without customer data", async () => {
    const connection = await createTestDatabase();
    await persistConsent(connection, "granted");
    await recordConversionEvent(connection.db, {
      ...baseInput("attribution-event-0001"),
      eventName: "quote_submit_success",
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
      safeProperties: { placement: "quote_form" },
    });
    const rows = await connection.db
      .select()
      .from(conversionEvents)
      .where(eq(conversionEvents.eventId, "attribution-event-0001"));
    expect(rows[0]).toMatchObject({
      utmSource: "google",
      lastNonDirectSource: "newsletter",
      attributionConfidence: "high",
    });
    await connection.close();
  });
});
