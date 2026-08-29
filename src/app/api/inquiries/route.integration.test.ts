import { createHash } from "node:crypto";
import { count, eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  analyticsConsents,
  auditLogs,
  contacts,
  conversionEvents,
  inquiries,
  inquiryAssets,
  inquiryStatusHistory,
  notificationOutbox,
} from "@/db/schema";
import { createTestDatabase } from "@/test/database";

function publicRequest(
  overrides: Readonly<Record<string, unknown>> = {},
  consentSessionId?: string,
): Request {
  const idempotencyKey = String(
    overrides.idempotencyKey ?? "70000000-0000-4000-8000-000000000001",
  );
  const anonymousSessionId = "71000000-0000-4000-8000-000000000001";
  const body = JSON.stringify({
    name: "Actual Handler Buyer",
    email: "actual-handler@example.test",
    description: "Synthetic actual-handler request.",
    uploadTokens: [],
    sourcePagePath: "/get-quote/",
    landingPagePath: "/products/synthetic-fabric/",
    referrer: "https://first.example/",
    utmSource: "spring-launch",
    utmMedium: "organic",
    utmCampaign: "spring-campaign",
    lastNonDirectSource: "partner-network",
    lastNonDirectMedium: "referral",
    lastNonDirectCampaign: "safe-last-campaign",
    submitReferrer: "https://submit.example/",
    submitUtmSource: "safe-submit-source",
    submitUtmMedium: "paid-social",
    submitUtmCampaign: "campaign-1234567",
    attributionConfidence: "unavailable",
    anonymousSessionId,
    idempotencyKey,
    website: null,
    ...overrides,
  });
  return new Request("http://localhost:3000/api/inquiries/", {
    method: "POST",
    headers: {
      origin: "http://localhost:3000",
      "content-type": "application/json",
      "content-length": String(Buffer.byteLength(body)),
      "idempotency-key": idempotencyKey,
      "x-cwt-upload-session": anonymousSessionId,
      ...(consentSessionId
        ? { cookie: `cwt_analytics_session=${consentSessionId}` }
        : {}),
    },
    body,
  });
}

async function loadActualHandler(
  connection: Awaited<ReturnType<typeof createTestDatabase>>,
) {
  globalThis.cwtDatabaseConnection = connection;
  vi.resetModules();
  return (await import("./route")).POST;
}

afterEach(() => {
  globalThis.cwtDatabaseConnection = undefined;
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("actual public Inquiry handler with actual Domain and disposable database", () => {
  it("returns ordinary success while only the unsafe field becomes null in every sink", async () => {
    const connection = await createTestDatabase();
    const consentSessionId = "72000000-0000-4000-8000-000000000001";
    const unsafe = "campaign-1234567";
    const output: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      output.push(String(chunk));
      return true;
    });
    try {
      await connection.db.insert(analyticsConsents).values({
        consentSessionId,
        status: "granted",
        consentVersion: 1,
        grantedAt: new Date(),
      });
      const POST = await loadActualHandler(connection);
      const response = await POST(publicRequest({}, consentSessionId));
      expect(response.status).toBe(201);
      const publicBody = await response.json() as Record<string, unknown>;
      expect(publicBody).toMatchObject({ ok: true, replayed: false });
      expect(Object.keys(publicBody).sort()).toEqual(["ok", "reference", "replayed"]);

      const [inquiry] = await connection.db.select().from(inquiries);
      expect(inquiry).toMatchObject({
        utmSource: "spring-launch",
        utmCampaign: "spring-campaign",
        submitReferrer: "https://submit.example",
        submitUtmSource: "safe-submit-source",
        submitUtmMedium: "paid-social",
        submitUtmCampaign: null,
        sourceEntityType: null,
        sourceEntityId: null,
        requestFingerprintVersion: 2,
        attributionConfidence: "high",
      });
      const [audit] = await connection.db.select().from(auditLogs);
      expect(audit?.afterSummary).toMatchObject({
        attributionOmissions: [
          { field: "submit_utm_campaign", reason: "digit_budget" },
        ],
      });
      const [outbox] = await connection.db.select().from(notificationOutbox);
      const [analytics] = await connection.db.select().from(conversionEvents)
        .where(eq(conversionEvents.eventName, "inquiry_created"));
      expect(analytics).toMatchObject({
        utmSource: "spring-launch",
        utmCampaign: "spring-campaign",
        routePath: "/get-quote/",
      });
      expect(analytics).not.toHaveProperty("submitUtmCampaign");

      const allSinks = JSON.stringify({ inquiry, audit, outbox, analytics, publicBody, output });
      expect(allSinks).not.toContain(unsafe);
      expect(allSinks).not.toContain(createHash("sha256").update(unsafe).digest("hex"));
    } finally {
      await connection.close();
    }
  });

  it.each([
    { label: "empty", field: "submitUtmCampaign", column: "submitUtmCampaign", raw: " ", reason: "empty" },
    { label: "oversize", field: "submitUtmCampaign", column: "submitUtmCampaign", raw: `safe-${"a".repeat(100)}`, reason: "oversize" },
    { label: "invalid path", field: "landingPagePath", column: "landingPagePath", raw: "/get-quote/?private=1", reason: "invalid_path" },
    { label: "private path", field: "landingPagePath", column: "landingPagePath", raw: "/api/inquiry-assets/private-id/", reason: "private_path" },
    { label: "invalid origin", field: "submitReferrer", column: "submitReferrer", raw: "https://example.test/private", reason: "invalid_origin" },
    { label: "same origin", field: "lastNonDirectSource", column: "lastNonDirectSource", raw: "http://localhost:3000/", reason: "same_origin" },
    { label: "invalid token", field: "submitUtmMedium", column: "submitUtmMedium", raw: "unsafe/value", reason: "invalid_token" },
    { label: "email", field: "submitUtmCampaign", column: "submitUtmCampaign", raw: "private.person@leak.test", reason: "email_like" },
    { label: "UUID", field: "submitUtmCampaign", column: "submitUtmCampaign", raw: "11111111-1111-4111-8111-111111111111", reason: "uuid_like" },
    { label: "file", field: "submitUtmCampaign", column: "submitUtmCampaign", raw: "private-sample.pdf", reason: "file_like" },
    { label: "digit budget", field: "submitUtmCampaign", column: "submitUtmCampaign", raw: "phone:138:0013:8000", reason: "digit_budget" },
  ])("keeps the Inquiry available for $label optional attribution", async (testCase) => {
    const connection = await createTestDatabase();
    const output: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      output.push(String(chunk));
      return true;
    });
    try {
      const POST = await loadActualHandler(connection);
      const response = await POST(publicRequest({
        idempotencyKey: crypto.randomUUID(),
        [testCase.field]: testCase.raw,
      }));
      expect(response.status).toBe(201);
      const publicBody = await response.json() as Record<string, unknown>;
      const [inquiry] = await connection.db.select().from(inquiries);
      const [audit] = await connection.db.select().from(auditLogs);
      const [outbox] = await connection.db.select().from(notificationOutbox);
      expect(inquiry?.[testCase.column as keyof typeof inquiry]).toBeNull();
      expect(inquiry?.utmSource).toBe("spring-launch");
      expect(audit?.afterSummary).toMatchObject({
        attributionOmissions: expect.arrayContaining([
          { field: testCase.field.replace(/[A-Z]/g, (value) => `_${value.toLowerCase()}`), reason: testCase.reason },
        ]),
      });
      expect(outbox).toBeDefined();
      expect(await connection.db.select().from(conversionEvents)).toHaveLength(0);
      expect(await connection.db.select().from(contacts)).toHaveLength(1);
      expect(await connection.db.select().from(inquiries)).toHaveLength(1);
      expect(await connection.db.select().from(notificationOutbox)).toHaveLength(1);
      expect(await connection.db.select().from(auditLogs)).toHaveLength(1);
      const forbiddenSinks = JSON.stringify({ inquiry, audit, outbox, publicBody, output });
      if (testCase.raw.trim()) expect(forbiddenSinks).not.toContain(testCase.raw);
      expect(forbiddenSinks).not.toContain(
        createHash("sha256").update(testCase.raw).digest("hex"),
      );
    } finally {
      await connection.close();
    }
  });

  it.each([
    ["private required path", { sourcePagePath: "/api/inquiry-assets/private-id/" }],
    ["malformed optional type", { submitUtmCampaign: { nested: "not-a-string" } }],
    ["invalid required core", { name: "" }],
  ])("keeps %s as a generic zero-mutation hard failure", async (_label, overrides) => {
    const connection = await createTestDatabase();
    try {
      const POST = await loadActualHandler(connection);
      const response = await POST(publicRequest({
        idempotencyKey: crypto.randomUUID(),
        ...overrides,
      }));
      expect(response.status).toBe(400);
      const body = JSON.stringify(await response.json());
      expect(body).not.toContain("private-id");
      for (const table of [
        contacts,
        inquiries,
        inquiryAssets,
        inquiryStatusHistory,
        notificationOutbox,
        auditLogs,
      ] as const) {
        const rows = await connection.db.select({ value: count() }).from(table);
        expect(Number(rows[0]?.value ?? 0)).toBe(0);
      }
    } finally {
      await connection.close();
    }
  });
});
