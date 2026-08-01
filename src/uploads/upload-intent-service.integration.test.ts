import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { contacts, inquiries, uploadIntents } from "@/db/schema";
import { createTestDatabase } from "@/test/database";
import { InMemoryObjectStorage } from "@/test/in-memory-storage";

import { DevelopmentFileScanner } from "./scanner";
import { purgeExpiredUploadIntents } from "./retention-service";
import {
  completeInquiryUploadIntent,
  createInquiryUploadIntent,
  finalizeInquiryUploadTokens,
  reserveInquiryUploadTokens,
} from "./upload-intent-service";

async function imageBytes() {
  return sharp({ create: { width: 8, height: 8, channels: 3, background: "green" } }).jpeg().toBuffer();
}

describe("private Inquiry Upload Intent", () => {
  it("binds a scanned one-time Asset Token to its anonymous Session", async () => {
    const connection = await createTestDatabase();
    const storage = new InMemoryObjectStorage();
    const bytes = await imageBytes();
    const sessionId = "11111111-1111-4111-8111-111111111111";
    const otherSession = "22222222-2222-4222-8222-222222222222";
    const intent = await createInquiryUploadIntent(connection.db, {
      anonymousSessionId: sessionId,
      fileName: "sample.jpg",
      declaredMimeType: "image/jpeg",
      declaredByteSize: bytes.byteLength,
    });
    await expect(
      completeInquiryUploadIntent(connection.db, storage, new DevelopmentFileScanner(), {
        token: intent.token,
        anonymousSessionId: otherSession,
        bytes,
      }),
    ).rejects.toThrow(/invalid, expired, or already used/);
    await completeInquiryUploadIntent(connection.db, storage, new DevelopmentFileScanner(), {
      token: intent.token,
      anonymousSessionId: sessionId,
      bytes,
    });
    await expect(
      reserveInquiryUploadTokens(connection.db, otherSession, [intent.token]),
    ).rejects.toThrow(/invalid, expired, or already used/);
    const reserved = await reserveInquiryUploadTokens(connection.db, sessionId, [intent.token]);
    expect(reserved.assetIds).toHaveLength(1);
    const contactRows = await connection.db.insert(contacts).values({ name: "Intent Buyer", email: "intent@example.test", normalizedEmail: "intent@example.test" }).returning({ id: contacts.id });
    const inquiryId = "33333333-3333-4333-8333-333333333333";
    await connection.db.insert(inquiries).values({ id: inquiryId, publicReference: "CWT-UPLOAD-INTENT", contactId: contactRows[0]!.id, submittedName: "Intent Buyer", submittedEmail: "intent@example.test", idempotencyKey: "intent-test-00000001", sourcePagePath: "/get-quote/" });
    await finalizeInquiryUploadTokens(
      connection.db,
      reserved.intentIds,
      inquiryId,
    );
    const rows = await connection.db.select().from(uploadIntents);
    expect(rows[0]).toMatchObject({ status: "consumed", isConsumed: true, consumedByInquiryId: inquiryId });
    await expect(
      reserveInquiryUploadTokens(connection.db, sessionId, [intent.token]),
    ).rejects.toThrow(/already used/);
    await connection.close();
  });

  it("rejects declared-size mismatches before an Asset Token can pass", async () => {
    const connection = await createTestDatabase();
    const bytes = await imageBytes();
    const sessionId = "44444444-4444-4444-8444-444444444444";
    const intent = await createInquiryUploadIntent(connection.db, {
      anonymousSessionId: sessionId,
      fileName: "size.jpg",
      declaredMimeType: "image/jpeg",
      declaredByteSize: bytes.byteLength + 1,
    });
    await expect(
      completeInquiryUploadIntent(connection.db, new InMemoryObjectStorage(), new DevelopmentFileScanner(), {
        token: intent.token,
        anonymousSessionId: sessionId,
        bytes,
      }),
    ).rejects.toThrow(/does not match/);
    const rows = await connection.db.select().from(uploadIntents);
    expect(rows[0]).toMatchObject({ status: "failed", failureReason: "declared_size_mismatch" });
    await connection.close();
  });

  it("links a failed scan to its Intent so expiry cleanup removes the private quarantine", async () => {
    const connection = await createTestDatabase();
    const storage = new InMemoryObjectStorage();
    const infected = Buffer.concat([
      await imageBytes(),
      Buffer.from("EICAR-STANDARD-ANTIVIRUS-TEST-FILE"),
    ]);
    const sessionId = "55555555-5555-4555-8555-555555555555";
    const intent = await createInquiryUploadIntent(connection.db, {
      anonymousSessionId: sessionId,
      fileName: "failed-scan.jpg",
      declaredMimeType: "image/jpeg",
      declaredByteSize: infected.byteLength,
    });
    await expect(
      completeInquiryUploadIntent(
        connection.db,
        storage,
        new DevelopmentFileScanner(),
        { token: intent.token, anonymousSessionId: sessionId, bytes: infected },
      ),
    ).rejects.toThrow(/malware scanning/);
    const failedRows = await connection.db.select().from(uploadIntents);
    expect(failedRows[0]).toMatchObject({ status: "failed" });
    expect(failedRows[0]?.assetId).toBeTruthy();
    expect(storage.objects.size).toBe(1);
    await expect(
      purgeExpiredUploadIntents(connection.db, storage, {
        dryRun: false,
        now: new Date(intent.expiresAt.getTime() + 1),
      }),
    ).resolves.toEqual({ eligible: 1, deleted: 1, dryRun: false });
    expect(storage.objects.size).toBe(0);
    await connection.close();
  });
});
