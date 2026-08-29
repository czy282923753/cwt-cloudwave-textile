import { createHash } from "node:crypto";
import { count, eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  auditLogs,
  contacts,
  inquiries,
  inquiryAssets,
  inquiryStatusHistory,
  notificationOutbox,
} from "@/db/schema";
import { createTestDatabase } from "@/test/database";

import {
  createInquiry,
  createInquiryRequestFingerprintV1,
  createInquiryRequestFingerprintV2,
  InquiryIdempotencyConflictError,
  INQUIRY_REQUEST_FINGERPRINT_VERSION,
  type CreateInquiryInput,
} from "./inquiry-service";

const goldenV1Input: CreateInquiryInput = {
  idempotencyKey: "golden-v1",
  name: " Canonical Buyer ",
  email: "CANONICAL@EXAMPLE.TEST ",
  countryCode: " ",
  whatsapp: " +1 555 0100 ",
  description: "Need\r\na fabric match.",
  assetIds: [
    "20000000-0000-4000-8000-000000000002",
    "10000000-0000-4000-8000-000000000001",
  ],
  sourcePagePath: "/GET-QUOTE?ignored=true",
  landingPagePath: "",
  referrer: " ",
  attributionConfidence: "unavailable",
  sessionId: "11111111-1111-4111-8111-111111111111",
};

async function tableCount(
  database: Parameters<typeof createInquiry>[0],
  table: typeof contacts | typeof inquiries | typeof inquiryAssets |
    typeof inquiryStatusHistory | typeof notificationOutbox | typeof auditLogs,
): Promise<number> {
  const rows = await database.select({ value: count() }).from(table);
  return Number(rows[0]?.value ?? 0);
}

describe("S5-F1 request identity replacement", () => {
  it("pins the exact frozen v1 reader while new identity is v2 only", () => {
    expect(createInquiryRequestFingerprintV1(goldenV1Input)).toBe(
      "edc9c0a1ba6afb6cf9fee6cfbf8ed1371498ff44153f41a8467b2a9fcd6d0b85",
    );
    expect(INQUIRY_REQUEST_FINGERPRINT_VERSION).toBe(2);
    expect(createInquiryRequestFingerprintV2({
      ...goldenV1Input,
      sourcePagePath: "/get-quote/",
    })).not.toBe(createInquiryRequestFingerprintV1(goldenV1Input));
  });

  it("persists safe siblings, omits unsafe attribution, and stores only bounded Audit reasons", async () => {
    const connection = await createTestDatabase();
    const unsafe = "launch-2026-08-29_phone:138:0013:8000";
    try {
      const result = await createInquiry(connection.db, {
        idempotencyKey: "choice-a-privacy-0001",
        name: "Choice A Buyer",
        email: "choice-a@example.test",
        description: "Synthetic safe-field omission request.",
        sourcePagePath: "/get-quote/",
        landingPagePath: "/products/synthetic-fabric/",
        utmSource: "spring-launch",
        submitReferrer: "https://campaign.example/",
        submitUtmSource: "safe-submit-source",
        submitUtmMedium: "paid-social",
        submitUtmCampaign: unsafe,
        attributionConfidence: "unavailable",
      });

      const [row] = await connection.db.select().from(inquiries)
        .where(eq(inquiries.id, result.inquiryId));
      expect(row).toMatchObject({
        requestFingerprintVersion: 2,
        landingPagePath: "/products/synthetic-fabric/",
        utmSource: "spring-launch",
        submitReferrer: "https://campaign.example",
        submitUtmSource: "safe-submit-source",
        submitUtmMedium: "paid-social",
        submitUtmCampaign: null,
        sourceEntityType: null,
        sourceEntityId: null,
        attributionConfidence: "high",
      });
      expect(row?.requestFingerprint).toBe(createInquiryRequestFingerprintV2({
        idempotencyKey: "choice-a-privacy-0001",
        name: "Choice A Buyer",
        email: "choice-a@example.test",
        description: "Synthetic safe-field omission request.",
        sourcePagePath: "/get-quote/",
        landingPagePath: "/products/synthetic-fabric/",
        utmSource: "spring-launch",
        submitReferrer: "https://campaign.example/",
        submitUtmSource: "safe-submit-source",
        submitUtmMedium: "paid-social",
        submitUtmCampaign: unsafe,
      }));

      const [outbox] = await connection.db.select().from(notificationOutbox)
        .where(eq(notificationOutbox.aggregateId, result.inquiryId));
      const [audit] = await connection.db.select().from(auditLogs)
        .where(eq(auditLogs.entityId, result.inquiryId));
      expect(audit?.afterSummary).toEqual({
        status: "new",
        attachmentCount: 0,
        sourcePagePath: "/get-quote/",
        attributionOmissions: [
          { field: "submit_utm_campaign", reason: "digit_budget" },
        ],
      });
      const forbiddenSinks = JSON.stringify({ row, outbox, audit, result });
      expect(forbiddenSinks).not.toContain(unsafe);
      expect(forbiddenSinks).not.toContain(
        createHash("sha256").update(unsafe).digest("hex"),
      );
    } finally {
      await connection.close();
    }
  });

  it("collapses different unsafe raw values to null identity and conflicts safe versus null", async () => {
    const connection = await createTestDatabase();
    const base: CreateInquiryInput = {
      idempotencyKey: "choice-a-null-equality-0001",
      name: "Null Identity Buyer",
      email: "null-identity@example.test",
      description: "Synthetic null identity request.",
      sourcePagePath: "/get-quote/",
      submitUtmCampaign: "campaign-1234567",
    };
    try {
      const first = await createInquiry(connection.db, base);
      const replay = await createInquiry(connection.db, {
        ...base,
        submitUtmCampaign: "phone:138:0013:8000",
      });
      expect(replay).toMatchObject({ inquiryId: first.inquiryId, replayed: true });
      await expect(createInquiry(connection.db, {
        ...base,
        submitUtmCampaign: "spring-launch",
      })).rejects.toBeInstanceOf(InquiryIdempotencyConflictError);

      const safeBase = {
        ...base,
        idempotencyKey: "choice-a-safe-difference-0001",
        email: "safe-difference@example.test",
        submitUtmCampaign: "spring-launch",
      };
      await createInquiry(connection.db, safeBase);
      await expect(createInquiry(connection.db, {
        ...safeBase,
        submitUtmCampaign: "autumn-launch",
      })).rejects.toBeInstanceOf(InquiryIdempotencyConflictError);
      expect(await tableCount(connection.db, inquiries)).toBe(2);
    } finally {
      await connection.close();
    }
  });

  it("dispatches exact v1 replay without Submit/source backfill or side effects", async () => {
    const connection = await createTestDatabase();
    const input: CreateInquiryInput = {
      idempotencyKey: "legacy-v1-dispatch-0001",
      name: "Legacy Buyer",
      email: "legacy-dispatch@example.test",
      description: "Synthetic historical request.",
      sourcePagePath: "/GET-QUOTE//?historical=true",
      referrer: "https://first.example",
      utmSource: "first-source",
      attributionConfidence: "high",
    };
    try {
      const [contact] = await connection.db.insert(contacts).values({
        name: input.name,
        email: input.email,
        normalizedEmail: input.email,
      }).returning({ id: contacts.id });
      const [legacy] = await connection.db.insert(inquiries).values({
        publicReference: "CWT-SYNTHETIC-V1-DISPATCH",
        contactId: contact!.id,
        submittedName: input.name,
        submittedEmail: input.email,
        description: input.description,
        idempotencyKey: input.idempotencyKey,
        requestFingerprint: createInquiryRequestFingerprintV1(input),
        requestFingerprintVersion: 1,
        sourcePagePath: "/get-quote/",
        referrer: input.referrer,
        utmSource: input.utmSource,
        attributionConfidence: "high",
      }).returning({ id: inquiries.id });

      const replay = await createInquiry(connection.db, {
        ...input,
        submitReferrer: "https://submit.example/",
        submitUtmSource: "ignored-by-v1",
      });
      expect(replay).toMatchObject({
        inquiryId: legacy!.id,
        publicReference: "CWT-SYNTHETIC-V1-DISPATCH",
        replayed: true,
      });
      const [unchanged] = await connection.db.select().from(inquiries)
        .where(eq(inquiries.id, legacy!.id));
      expect(unchanged).toMatchObject({
        requestFingerprintVersion: 1,
        submitReferrer: null,
        submitUtmSource: null,
        sourceEntityType: null,
        sourceEntityId: null,
      });
      expect(await tableCount(connection.db, notificationOutbox)).toBe(0);
      expect(await tableCount(connection.db, auditLogs)).toBe(0);
    } finally {
      await connection.close();
    }
  });

  it("fails closed for null, unsupported, malformed, uppercase and unequal stored identity", async () => {
    const connection = await createTestDatabase();
    const base: CreateInquiryInput = {
      idempotencyKey: "stored-identity-boundary-0001",
      name: "Stored Identity Buyer",
      email: "stored-identity@example.test",
      description: "Synthetic stored identity boundary.",
      sourcePagePath: "/get-quote/",
    };
    try {
      const [contact] = await connection.db.insert(contacts).values({
        name: base.name,
        email: base.email,
        normalizedEmail: base.email,
      }).returning({ id: contacts.id });
      const insertRow = async (
        suffix: string,
        fingerprint: string | null,
        version: number | null,
      ) => {
        await connection.db.insert(inquiries).values({
          publicReference: `CWT-STORED-${suffix}`,
          contactId: contact!.id,
          submittedName: base.name,
          submittedEmail: base.email,
          description: base.description,
          idempotencyKey: `${base.idempotencyKey}-${suffix}`,
          requestFingerprint: fingerprint,
          requestFingerprintVersion: version,
          sourcePagePath: "/get-quote/",
        });
      };
      await insertRow("null", null, null);
      await insertRow("unsupported", "f".repeat(64), 9);
      await insertRow("unequal", "e".repeat(64), 2);
      for (const suffix of ["null", "unsupported", "unequal"]) {
        await expect(createInquiry(connection.db, {
          ...base,
          idempotencyKey: `${base.idempotencyKey}-${suffix}`,
        })).rejects.toBeInstanceOf(InquiryIdempotencyConflictError);
      }

      await connection.db.execute(sql.raw(
        "alter table inquiries drop constraint inquiries_request_fingerprint_check",
      ));
      await insertRow("malformed", "not-a-digest", 2);
      await insertRow("uppercase", "A".repeat(64), 2);
      for (const suffix of ["malformed", "uppercase"]) {
        await expect(createInquiry(connection.db, {
          ...base,
          idempotencyKey: `${base.idempotencyKey}-${suffix}`,
        })).rejects.toBeInstanceOf(InquiryIdempotencyConflictError);
      }
    } finally {
      await connection.close();
    }
  });

  it("keeps attachment identity order-insensitive while different attachments conflict", () => {
    const base: CreateInquiryInput = {
      idempotencyKey: "attachment-identity-0001",
      name: "Attachment Buyer",
      email: "attachment@example.test",
      description: "Synthetic attachment identity.",
      sourcePagePath: "/get-quote/",
      uploadTokens: ["token-a-000000000000000000000000", "token-b-000000000000000000000000"],
    };
    expect(createInquiryRequestFingerprintV2(base)).toBe(
      createInquiryRequestFingerprintV2({
        ...base,
        uploadTokens: [...base.uploadTokens!].reverse(),
      }),
    );
    expect(createInquiryRequestFingerprintV2(base)).not.toBe(
      createInquiryRequestFingerprintV2({
        ...base,
        uploadTokens: ["token-c-000000000000000000000000"],
      }),
    );
    expect(createInquiryRequestFingerprintV2(base)).not.toContain(base.uploadTokens![0]!);
  });

  it("serializes concurrent equal and different requests under one key", async () => {
    const connection = await createTestDatabase();
    const equal: CreateInquiryInput = {
      idempotencyKey: "concurrent-equal-v2-0001",
      name: "Concurrent Equal Buyer",
      email: "concurrent-equal@example.test",
      description: "Synthetic equal concurrency.",
      sourcePagePath: "/get-quote/",
      submitUtmCampaign: "campaign-1234567",
    };
    try {
      const equalResults = await Promise.all([
        createInquiry(connection.db, equal),
        createInquiry(connection.db, {
          ...equal,
          submitUtmCampaign: "phone:138:0013:8000",
        }),
      ]);
      expect(new Set(equalResults.map((result) => result.inquiryId))).toHaveLength(1);
      expect(equalResults.filter((result) => result.replayed)).toHaveLength(1);

      const different = {
        ...equal,
        idempotencyKey: "concurrent-different-v2-0001",
        email: "concurrent-different@example.test",
        submitUtmCampaign: "spring-launch",
      };
      const settled = await Promise.allSettled([
        createInquiry(connection.db, different),
        createInquiry(connection.db, {
          ...different,
          submitUtmCampaign: "autumn-launch",
        }),
      ]);
      expect(settled.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      const rejected = settled.find((result) => result.status === "rejected");
      expect(rejected).toMatchObject({
        status: "rejected",
        reason: expect.any(InquiryIdempotencyConflictError),
      });
      expect(await tableCount(connection.db, inquiries)).toBe(2);
    } finally {
      await connection.close();
    }
  });

  it("hard-fails unsafe required source paths and rolls back every required table on Audit failure", async () => {
    const connection = await createTestDatabase();
    const base: CreateInquiryInput = {
      idempotencyKey: "hard-failure-0001",
      name: "Hard Failure Buyer",
      email: "hard-failure@example.test",
      description: "Synthetic hard failure.",
      sourcePagePath: "/api/inquiry-assets/private-id/",
    };
    try {
      await expect(createInquiry(connection.db, base)).rejects.toThrow(
        "A valid source page path is required.",
      );
      await expect(createInquiry(connection.db, {
        ...base,
        idempotencyKey: "audit-failure-0001",
        sourcePagePath: "/get-quote/",
        submitUtmCampaign: "campaign-1234567",
      }, {
        auditWriter: async () => {
          throw new Error("Synthetic required Audit failure");
        },
      })).rejects.toThrow("Synthetic required Audit failure");
      for (const table of [
        contacts,
        inquiries,
        inquiryAssets,
        inquiryStatusHistory,
        notificationOutbox,
        auditLogs,
      ] as const) {
        expect(await tableCount(connection.db, table), table[Symbol.for("drizzle:Name") as never])
          .toBe(0);
      }
    } finally {
      await connection.close();
    }
  });

  it("rejects every raw v2 repeated-slash position before any six-table mutation", async () => {
    const connection = await createTestDatabase();
    try {
      for (const [index, sourcePagePath] of [
        "//products/synthetic-fabric/",
        "/products//synthetic-fabric/",
        "/products///synthetic-fabric/",
        "/products/synthetic-fabric//",
        "///",
      ].entries()) {
        await expect(createInquiry(connection.db, {
          idempotencyKey: `raw-repeated-slash-${index}-0001`,
          name: "Repeated Slash Buyer",
          email: `repeated-slash-${index}@example.test`,
          description: "Synthetic malformed required path.",
          sourcePagePath,
        })).rejects.toThrow("A valid source page path is required.");
      }
      for (const table of [
        contacts,
        inquiries,
        inquiryAssets,
        inquiryStatusHistory,
        notificationOutbox,
        auditLogs,
      ] as const) {
        expect(await tableCount(connection.db, table)).toBe(0);
      }
    } finally {
      await connection.close();
    }
  });
});
