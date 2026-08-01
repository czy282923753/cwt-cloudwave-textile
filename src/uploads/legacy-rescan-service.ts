import { and, asc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import { env } from "@/config/env";
import { assets } from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import type { ObjectStorage, StoragePartition } from "@/storage";

import { validateUploadedFile } from "./file-validation";
import type { FileScanner } from "./scanner";

export interface LegacyAssetRescanResult {
  assetId: string;
  outcome: "passed" | "failed" | "missing" | "skipped";
  reason: string | null;
}

export const LEGACY_RESCAN_STALE_MILLISECONDS = 15 * 60_000;

export async function recoverStaleLegacyAssetRescans<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  staleBefore = new Date(Date.now() - LEGACY_RESCAN_STALE_MILLISECONDS),
): Promise<number> {
  const recovered = await db
    .update(assets)
    .set({
      rescanStatus: "required",
      scanStatus: "pending",
      scanFailureReason: "historical_rescan_interrupted",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(assets.rescanStatus, "processing"),
        lt(assets.lastRescanAttemptAt, staleBefore),
        isNull(assets.deletedAt),
      ),
    )
    .returning({ id: assets.id });
  return recovered.length;
}

function purposeFor(asset: {
  category: typeof assets.$inferSelect.category;
  storagePartition: string;
}): "public_asset" | "inquiry" | "import" {
  if (asset.category === "inquiry" && asset.storagePartition === "private") {
    return "inquiry";
  }
  if (asset.storagePartition === "public") return "public_asset";
  return "import";
}

function maximumBytesFor(purpose: ReturnType<typeof purposeFor>): number {
  return purpose === "inquiry"
    ? env.MAX_INQUIRY_FILE_BYTES
    : env.MAX_PUBLIC_FILE_BYTES;
}

function safeFailureReason(error: unknown): string {
  const message = error instanceof Error ? error.message : "unknown rescan error";
  if (/not found|enoent|missing/i.test(message)) return "source_object_missing";
  if (/decode/i.test(message)) return "image_decode_failed";
  if (/mime|signature|type/i.test(message)) return "file_type_validation_failed";
  if (/size|limit/i.test(message)) return "file_size_validation_failed";
  return "scanner_or_storage_error";
}

export async function rescanLegacyAsset<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  storage: ObjectStorage,
  scanner: FileScanner,
  assetId: string,
  options: { retryManualReview?: boolean } = {},
): Promise<LegacyAssetRescanResult> {
  const eligibleStatuses = options.retryManualReview
    ? (["required", "manual_review"] as const)
    : (["required"] as const);
  const claimed = await db
    .update(assets)
    .set({
      rescanStatus: "processing",
      rescanAttemptCount: sql`${assets.rescanAttemptCount} + 1`,
      lastRescanAttemptAt: new Date(),
      scanFailureReason: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(assets.id, assetId),
        inArray(assets.rescanStatus, eligibleStatuses),
        isNull(assets.deletedAt),
      ),
    )
    .returning();
  const asset = claimed[0];
  if (!asset) {
    return { assetId, outcome: "skipped", reason: "not_claimable" };
  }
  const partition = asset.storagePartition as StoragePartition;
  if (!(["public", "private", "imports"] as const).includes(partition)) {
    await db
      .update(assets)
      .set({
        rescanStatus: "manual_review",
        scanStatus: "error",
        status: "quarantined",
        scanFailureReason: "unknown_storage_partition",
        updatedAt: new Date(),
      })
      .where(eq(assets.id, assetId));
    return { assetId, outcome: "failed", reason: "unknown_storage_partition" };
  }
  try {
    const bytes = await storage.get(partition, asset.objectKey);
    const purpose = purposeFor(asset);
    const validated = await validateUploadedFile({
      bytes,
      declaredMimeType: asset.declaredMimeType,
      maximumBytes: maximumBytesFor(purpose),
      purpose,
    });
    const scan = await scanner.scan(bytes, asset.originalFileName);
    if (!scan.clean) {
      await db
        .update(assets)
        .set({
          status: "rejected",
          scanStatus: "failed",
          scanProvider: scan.provider,
          scanResult: scan.reference,
          scanCompletedAt: new Date(),
          rescanStatus: "manual_review",
          scanFailureReason: "malware_scan_rejected",
          updatedAt: new Date(),
        })
        .where(eq(assets.id, assetId));
      return { assetId, outcome: "failed", reason: "malware_scan_rejected" };
    }
    await db
      .update(assets)
      .set({
        status: "ready",
        detectedMimeType: validated.detectedMimeType,
        width: validated.width,
        height: validated.height,
        scanStatus: "passed",
        scanProvider: scan.provider,
        scanResult: scan.reference,
        scanCompletedAt: new Date(),
        rescanStatus: "completed",
        scanFailureReason: null,
        updatedAt: new Date(),
      })
      .where(eq(assets.id, assetId));
    return { assetId, outcome: "passed", reason: null };
  } catch (error) {
    const reason = safeFailureReason(error);
    await db
      .update(assets)
      .set({
        status: "quarantined",
        scanStatus: "error",
        scanCompletedAt: new Date(),
        rescanStatus: "manual_review",
        scanFailureReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(assets.id, assetId));
    return {
      assetId,
      outcome: reason === "source_object_missing" ? "missing" : "failed",
      reason,
    };
  }
}

export async function rescanLegacyAssets<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
  storage: ObjectStorage,
  scanner: FileScanner,
  limit = 100,
): Promise<LegacyAssetRescanResult[]> {
  await recoverStaleLegacyAssetRescans(db);
  const rows = await db
    .select({ id: assets.id })
    .from(assets)
    .where(eq(assets.rescanStatus, "required"))
    .orderBy(asc(assets.createdAt))
    .limit(Math.max(1, Math.min(limit, 500)));
  const results: LegacyAssetRescanResult[] = [];
  for (const row of rows) {
    results.push(await rescanLegacyAsset(db, storage, scanner, row.id));
  }
  return results;
}

export async function listLegacyAssetsRequiringManualReview<
  TQueryResult extends PgQueryResultHKT,
>(db: AppDatabase<TQueryResult>) {
  return db
    .select({
      id: assets.id,
      category: assets.category,
      storagePartition: assets.storagePartition,
      objectKey: assets.objectKey,
      reason: assets.scanFailureReason,
      attempts: assets.rescanAttemptCount,
    })
    .from(assets)
    .where(eq(assets.rescanStatus, "manual_review"))
    .orderBy(asc(assets.updatedAt));
}
