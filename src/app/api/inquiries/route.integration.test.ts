import nodeCrypto, { createHash } from "node:crypto";
import { syncBuiltinESMExports } from "node:module";
import { count, eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";

import { toPublicAnalyticsPayload } from "@/analytics/public-payload";
import {
  analyticsConsents,
  assets,
  auditLogs,
  contacts,
  conversionEvents,
  inquiries,
  inquiryAssets,
  inquiryStatusHistory,
  notificationOutbox,
  uploadIntents,
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
  vi.spyOn(nodeCrypto, "randomBytes").mockImplementation(
    ((size: number) => Buffer.alloc(size, 0xab)) as typeof nodeCrypto.randomBytes,
  );
  syncBuiltinESMExports();
  globalThis.cwtDatabaseConnection = connection;
  vi.resetModules();
  return (await import("./route")).POST;
}

afterEach(() => {
  globalThis.cwtDatabaseConnection = undefined;
  vi.restoreAllMocks();
  syncBuiltinESMExports();
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
        landingPagePath: "/products/synthetic-fabric/",
        utmSource: "spring-launch",
        utmCampaign: "spring-campaign",
        lastNonDirectSource: "partner-network",
        submitSourcePagePath: null,
        routePath: "/get-quote/",
      });
      expect(analytics).not.toHaveProperty("submitUtmCampaign");
      expect(toPublicAnalyticsPayload(analytics!)).toMatchObject({
        routePath: "/get-quote/",
        landingPagePath: "/products/synthetic-fabric/",
        utmSource: "spring-launch",
        utmCampaign: "spring-campaign",
        submitSourcePagePath: null,
      });

      const allSinks = JSON.stringify({ inquiry, audit, outbox, analytics, publicBody, output });
      expect(allSinks).not.toContain(unsafe);
      expect(allSinks).not.toContain(createHash("sha256").update(unsafe).digest("hex"));
    } finally {
      await connection.close();
    }
  });

  it.each([
    {
      label: "First-only",
      unsafe: ["campaign-1234567"],
      overrides: { utmSource: "campaign-1234567" },
      expectedFirst: null,
      expectedLast: "safe-last-source",
    },
    {
      label: "Last-only",
      unsafe: ["call-13800138000"],
      overrides: { lastNonDirectSource: "call-13800138000" },
      expectedFirst: "safe-first-source",
      expectedLast: null,
    },
    {
      label: "Submit-only",
      unsafe: ["phone:138:0013:8000"],
      overrides: { submitUtmCampaign: "phone:138:0013:8000" },
      expectedFirst: "safe-first-source",
      expectedLast: "safe-last-source",
    },
    {
      label: "combined",
      unsafe: ["campaign-1234567", "call-13800138000", "phone:138:0013:8000"],
      overrides: {
        utmSource: "campaign-1234567",
        lastNonDirectSource: "call-13800138000",
        submitUtmCampaign: "phone:138:0013:8000",
      },
      expectedFirst: null,
      expectedLast: null,
    },
  ])("persists only sanitized First/Last analytics for $label unsafe attribution", async (testCase) => {
    const connection = await createTestDatabase();
    const consentSessionId = crypto.randomUUID();
    const output: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      output.push(String(chunk));
      return true;
    });
    vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
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
      const response = await POST(publicRequest({
        idempotencyKey: crypto.randomUUID(),
        utmSource: "safe-first-source",
        utmMedium: "safe-first-medium",
        utmCampaign: "safe-first-campaign",
        lastNonDirectSource: "safe-last-source",
        lastNonDirectMedium: "safe-last-medium",
        lastNonDirectCampaign: "safe-last-campaign",
        submitReferrer: "https://safe-submit.example/",
        submitUtmSource: "safe-submit-source-hidden",
        submitUtmMedium: "safe-submit-medium-hidden",
        submitUtmCampaign: "safe-submit-campaign-hidden",
        ...testCase.overrides,
      }, consentSessionId));
      expect(response.status).toBe(201);
      const publicBody = await response.json() as Record<string, unknown>;
      const [inquiry] = await connection.db.select().from(inquiries);
      const [audit] = await connection.db.select().from(auditLogs);
      const [outbox] = await connection.db.select().from(notificationOutbox);
      const [analytics] = await connection.db.select().from(conversionEvents)
        .where(eq(conversionEvents.eventName, "inquiry_created"));
      const provider = toPublicAnalyticsPayload(analytics!);

      expect(inquiry).toMatchObject({
        utmSource: testCase.expectedFirst,
        utmMedium: "safe-first-medium",
        lastNonDirectSource: testCase.expectedLast,
        lastNonDirectMedium: "safe-last-medium",
        submitUtmSource: "safe-submit-source-hidden",
        submitUtmMedium: "safe-submit-medium-hidden",
        submitUtmCampaign: testCase.label === "Submit-only" || testCase.label === "combined"
          ? null
          : "safe-submit-campaign-hidden",
      });
      expect(analytics).toMatchObject({
        eventName: "inquiry_created",
        routePath: "/get-quote/",
        utmSource: testCase.expectedFirst,
        utmMedium: "safe-first-medium",
        lastNonDirectSource: testCase.expectedLast,
        lastNonDirectMedium: "safe-last-medium",
        submitSourcePagePath: null,
      });
      expect(provider).toMatchObject({
        eventName: "inquiry_created",
        routePath: "/get-quote/",
        utmSource: testCase.expectedFirst,
        utmMedium: "safe-first-medium",
        submitSourcePagePath: null,
      });
      const analyticsSinks = JSON.stringify({ analytics, provider });
      for (const submitValue of [
        "https://safe-submit.example/",
        "safe-submit-source-hidden",
        "safe-submit-medium-hidden",
        "safe-submit-campaign-hidden",
        "phone:138:0013:8000",
      ]) {
        expect(analyticsSinks).not.toContain(submitValue);
      }
      const forbiddenSinks = JSON.stringify({
        inquiry,
        audit,
        outbox,
        analytics,
        provider,
        publicBody,
        output,
      });
      for (const raw of testCase.unsafe) {
        expect(forbiddenSinks).not.toContain(raw);
        expect(forbiddenSinks).not.toContain(
          createHash("sha256").update(raw).digest("hex"),
        );
      }
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

  it("keeps image-upload analytics and replay deduplication intact without Submit attribution", async () => {
    const connection = await createTestDatabase();
    const consentSessionId = crypto.randomUUID();
    const token = "private-upload-token-00000000000001";
    const anonymousSessionId = "71000000-0000-4000-8000-000000000001";
    try {
      await connection.db.insert(analyticsConsents).values({
        consentSessionId,
        status: "granted",
        consentVersion: 1,
        grantedAt: new Date(),
      });
      const [asset] = await connection.db.insert(assets).values({
        originalFileName: "synthetic-private-sample.jpg",
        storageProvider: "test",
        storagePartition: "private",
        objectKey: "inquiry/synthetic-private-sample.jpg",
        access: "private",
        category: "inquiry",
        status: "ready",
        scanStatus: "passed",
        declaredMimeType: "image/jpeg",
        detectedMimeType: "image/jpeg",
        byteSize: 32,
        sha256: "synthetic-private-sample-sha256",
      }).returning({ id: assets.id });
      await connection.db.insert(uploadIntents).values({
        tokenHash: createHash("sha256").update(token).digest("hex"),
        anonymousSessionId,
        declaredFileName: "synthetic-private-sample.jpg",
        declaredMimeType: "image/jpeg",
        declaredByteSize: 32,
        status: "passed",
        assetId: asset!.id,
        expiresAt: new Date(Date.now() + 60_000),
      });
      const POST = await loadActualHandler(connection);
      const overrides = {
        idempotencyKey: "actual-handler-upload-replay-0001",
        uploadTokens: [token],
      };
      const first = await POST(publicRequest(overrides, consentSessionId));
      const replay = await POST(publicRequest(overrides, consentSessionId));
      expect(first.status).toBe(201);
      expect(replay.status).toBe(200);
      await expect(replay.json()).resolves.toMatchObject({ replayed: true });

      const events = await connection.db.select().from(conversionEvents);
      const imageUpload = events.find((event) => event.eventName === "image_upload_completed");
      const inquiryCreated = events.find((event) => event.eventName === "inquiry_created");
      expect(events).toHaveLength(2);
      expect(imageUpload).toMatchObject({
        routePath: "/get-quote/",
        safeProperties: { file_count: 1 },
        submitSourcePagePath: null,
      });
      expect(inquiryCreated).toMatchObject({
        routePath: "/get-quote/",
        submitSourcePagePath: null,
      });
      expect(await connection.db.select().from(inquiryAssets)).toHaveLength(1);
      const [intent] = await connection.db.select().from(uploadIntents);
      expect(intent).toMatchObject({ status: "consumed", isConsumed: true });
    } finally {
      await connection.close();
    }
  });

  it.each([
    ["private required path", { sourcePagePath: "/api/inquiry-assets/private-id/" }],
    ["storage required path", { sourcePagePath: "/api/storage/private/object/" }],
    ["admin required path", { sourcePagePath: "/admin/inquiries/" }],
    ["origin required path", { sourcePagePath: "https://cwtextile.com/get-quote/" }],
    ["required path query", { sourcePagePath: "/products/synthetic-fabric/?private=1" }],
    ["required path fragment", { sourcePagePath: "/applications/activewear/#private" }],
    ["leading repeated-slash required path", { sourcePagePath: "//products/synthetic-fabric/" }],
    ["internal repeated-slash required path", { sourcePagePath: "/products//synthetic-fabric/" }],
    ["long internal slash-run required path", { sourcePagePath: "/products///synthetic-fabric/" }],
    ["trailing repeated-slash required path", { sourcePagePath: "/products/synthetic-fabric//" }],
    ["root-only slash-run required path", { sourcePagePath: "///" }],
    ["control required path", { sourcePagePath: "/products/\u0000synthetic-fabric/" }],
    ["encoded-slash required path", { sourcePagePath: "/products/%2Fsynthetic-fabric/" }],
    ["slash-lookalike required path", { sourcePagePath: "/products/／synthetic-fabric/" }],
    ["backslash required path", { sourcePagePath: "/products/\\synthetic-fabric/" }],
    ["unsupported-grammar required path", { sourcePagePath: "/products/synthetic_fabric/" }],
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
      const responseBody = await response.json() as Record<string, unknown>;
      const body = JSON.stringify(responseBody);
      expect(body).not.toContain("private-id");
      if (_label.includes("required path")) {
        expect(responseBody).toEqual({
          ok: false,
          error: "A valid source page path is required.",
        });
      }
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

  it.each([
    "/",
    "/products/",
    "/products/synthetic-fabric/",
    "/fabric-types/synthetic-weave/",
    "/applications/activewear/",
    "/fabric-library/",
    "/resources/",
    "/fabric-knowledge/",
    "/fabric-knowledge/synthetic-guide/",
    "/china-sourcing-guide/",
    "/china-sourcing-guide/synthetic-topic/",
    "/china-textile-guide/",
    "/china-textile-guide/synthetic-topic/",
    "/authors/synthetic-author/",
    "/about/",
    "/get-quote/",
    "/markets/synthetic-market/",
  ])("accepts representative required public path %s through the actual handler", async (path) => {
    const connection = await createTestDatabase();
    try {
      const POST = await loadActualHandler(connection);
      const response = await POST(publicRequest({
        idempotencyKey: crypto.randomUUID(),
        sourcePagePath: path,
      }));
      expect(response.status).toBe(201);
      const [inquiry] = await connection.db.select().from(inquiries);
      expect(inquiry?.sourcePagePath).toBe(path);
    } finally {
      await connection.close();
    }
  });
});
