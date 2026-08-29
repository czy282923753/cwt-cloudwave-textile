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

function inquiryCreatedInput(publicReference: string) {
  return {
    eventId: `inquiry_created:${publicReference}`,
    eventName: "inquiry_created" as const,
    consentSessionId,
    routePath: "/get-quote/",
    externalReference: publicReference,
    safeProperties: {},
  };
}

function countPhoneLikeHexSuffixes(length: number): bigint {
  let states = Array.from({ length: 8 }, () => 0n);
  states[0] = 1n;
  let rejected = 0n;
  for (let position = 0; position < length; position += 1) {
    const next = Array.from({ length: 8 }, () => 0n);
    rejected *= 16n;
    for (let runLength = 0; runLength < states.length; runLength += 1) {
      const count = states[runLength]!;
      next[0] = next[0]! + count * 6n;
      if (runLength === 7) rejected += count * 10n;
      else next[runLength + 1] = next[runLength + 1]! + count * 10n;
    }
    states = next;
  }
  return rejected;
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
        recordConversionEvent(
          connection.db,
          inquiryCreatedInput(`CWT-1234567890123456789${index}`),
        ),
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
    const publicReference = "CWT-0123456789ABCDEF0123";
    await recordConversionEvent(connection.db, {
      ...baseInput(`inquiry_created:${publicReference}`),
      eventName: "inquiry_created",
      externalReference: publicReference,
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

  it("accepts the exact canonical inquiry identity across the hex grammar, including phone-like runs", async () => {
    const connection = await createTestDatabase();
    await persistConsent(connection, "granted");
    const references = new Set([
      "CWT-12345678901234567890",
      "CWT-AAAAAAAA12345678BBBB",
      "CWT-00000000ABCDEF123456",
    ]);
    for (let position = 0; position < 20; position += 1) {
      for (const symbol of "0123456789ABCDEF") {
        const suffix = Array.from({ length: 20 }, () => "A");
        suffix[position] = symbol;
        references.add(`CWT-${suffix.join("")}`);
      }
    }
    for (const publicReference of references) {
      await expect(
        recordConversionEvent(connection.db, inquiryCreatedInput(publicReference)),
      ).resolves.toEqual(expect.any(String));
    }
    expect(await connection.db.select().from(conversionEvents)).toHaveLength(references.size);
    expect(countPhoneLikeHexSuffixes(20)).toBe(153275237190860800000000n);
    await connection.close();
  });

  it("requires the exact inquiry-created Event ID and canonical external-reference pair", async () => {
    const connection = await createTestDatabase();
    await persistConsent(connection, "granted");
    const canonical = "CWT-12345678901234567890";
    const malformedInputs = [
      { ...inquiryCreatedInput(canonical), eventId: `inquiry_created:CWT-AAAAAAAAAAAAAAAAAAAA` },
      { ...inquiryCreatedInput(canonical), externalReference: null },
      { ...inquiryCreatedInput(canonical), eventName: "quote_cta_click" as const },
      inquiryCreatedInput("XWT-12345678901234567890"),
      inquiryCreatedInput("CWT-1234567890123456789"),
      inquiryCreatedInput("CWT-123456789012345678901"),
      inquiryCreatedInput("CWT-abcdefabcdefabcdefab"),
      inquiryCreatedInput("prefix-CWT-12345678901234567890"),
      inquiryCreatedInput("CWT-12345678901234567890-suffix"),
      inquiryCreatedInput("CWT-1234567890123456789Z"),
      { ...inquiryCreatedInput(canonical), eventId: ` ${inquiryCreatedInput(canonical).eventId}` },
      { ...inquiryCreatedInput(canonical), eventId: `${inquiryCreatedInput(canonical).eventId} ` },
      { ...inquiryCreatedInput(canonical), externalReference: ` ${canonical}` },
      { ...inquiryCreatedInput(canonical), externalReference: `${canonical} ` },
      { ...baseInput("customer-phone-13800138000"), externalReference: null },
      { ...baseInput("buyer@example.test"), externalReference: null },
      { ...baseInput("11111111-1111-4111-8111-111111111111"), externalReference: null },
    ];
    for (const input of malformedInputs) {
      await expect(recordConversionEvent(connection.db, input)).rejects.toThrow();
    }
    expect(await connection.db.select().from(conversionEvents)).toHaveLength(0);
    await connection.close();
  });

  it("deduplicates deterministic inquiry-created replay and rejects a changed pair", async () => {
    const connection = await createTestDatabase();
    await persistConsent(connection, "granted");
    const input = inquiryCreatedInput("CWT-12345678901234567890");
    const first = await recordConversionEvent(connection.db, input);
    expect(await recordConversionEvent(connection.db, input)).toBe(first);
    await expect(
      recordConversionEvent(connection.db, {
        ...input,
        externalReference: "CWT-AAAAAAAAAAAAAAAAAAAA",
      }),
    ).rejects.toThrow(/identity/);
    expect(await connection.db.select().from(conversionEvents)).toHaveLength(1);
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
