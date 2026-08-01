import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { assets, auditLogs } from "@/db/schema";
import { createTestDatabase } from "@/test/database";
import { InMemoryObjectStorage } from "@/test/in-memory-storage";

import { purgeExpiredInquiryAssets } from "./retention-service";

describe("inquiry Asset retention", () => {
  it("previews safely, then deletes only the object and retains an audited record", async () => {
    const connection = await createTestDatabase();
    const storage = new InMemoryObjectStorage();
    const objectKey = "2026/01/01/expired.jpg";
    await storage.put("private", objectKey, new Uint8Array([1, 2, 3]), "image/jpeg");
    const inserted = await connection.db
      .insert(assets)
      .values({
        originalFileName: "expired-customer-image.jpg",
        storageProvider: "memory",
        storagePartition: "private",
        objectKey,
        access: "private",
        category: "inquiry",
        status: "ready",
        scanStatus: "passed",
        declaredMimeType: "image/jpeg",
        detectedMimeType: "image/jpeg",
        byteSize: 3,
        sha256: "expired-fixture",
        retentionExpiresAt: new Date("2026-01-01T00:00:00Z"),
      })
      .returning({ id: assets.id });
    const assetId = inserted[0]?.id;
    if (!assetId) throw new Error("Missing test Asset.");

    const preview = await purgeExpiredInquiryAssets(connection.db, storage, {
      dryRun: true,
      now: new Date("2026-02-01T00:00:00Z"),
    });
    expect(preview).toEqual({ eligible: 1, deleted: 0, dryRun: true });
    expect(storage.objects.has(`private:${objectKey}`)).toBe(true);

    const result = await purgeExpiredInquiryAssets(connection.db, storage, {
      dryRun: false,
      now: new Date("2026-02-01T00:00:00Z"),
    });
    expect(result).toEqual({ eligible: 1, deleted: 1, dryRun: false });
    expect(storage.objects.has(`private:${objectKey}`)).toBe(false);
    const rows = await connection.db.select().from(assets).where(eq(assets.id, assetId));
    expect(rows[0]?.status).toBe("deleted");
    expect(rows[0]?.deletedAt).toBeInstanceOf(Date);
    const audits = await connection.db.select().from(auditLogs);
    expect(audits[0]?.action).toBe("asset.retention.deleted");
    await connection.close();
  });
});
