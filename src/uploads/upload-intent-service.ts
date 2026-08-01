import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, inArray } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import { z } from "zod";

import { env } from "@/config/env";
import { assets, uploadIntents } from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import type { ObjectStorage } from "@/storage";

import { acceptedInquiryMimeTypes } from "./file-validation";
import type { FileScanner } from "./scanner";
import { uploadAsset } from "./service";

const sessionSchema = z.uuid();

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function inspectInquiryUploadIntentForRequest<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  input: { token: string; anonymousSessionId: string },
): Promise<{ declaredByteSize: number; declaredMimeType: string }> {
  const anonymousSessionId = sessionSchema.parse(input.anonymousSessionId);
  const rows = await db
    .select({
      declaredByteSize: uploadIntents.declaredByteSize,
      declaredMimeType: uploadIntents.declaredMimeType,
    })
    .from(uploadIntents)
    .where(
      and(
        eq(uploadIntents.tokenHash, tokenHash(input.token)),
        eq(uploadIntents.anonymousSessionId, anonymousSessionId),
        eq(uploadIntents.status, "created"),
        gt(uploadIntents.expiresAt, new Date()),
      ),
    )
    .limit(1);
  const intent = rows[0];
  if (!intent) throw new Error("Upload Intent is invalid, expired, or already used.");
  return intent;
}

export async function createInquiryUploadIntent<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  input: {
    anonymousSessionId: string;
    fileName: string;
    declaredMimeType: string;
    declaredByteSize: number;
  },
): Promise<{ token: string; expiresAt: Date }> {
  const anonymousSessionId = sessionSchema.parse(input.anonymousSessionId);
  const fileName = input.fileName.trim();
  if (!fileName || fileName.length > 200 || /[\\/\u0000-\u001f]/.test(fileName)) {
    throw new Error("Upload file name is invalid.");
  }
  if (!(acceptedInquiryMimeTypes as readonly string[]).includes(input.declaredMimeType)) {
    throw new Error("Upload MIME type is not permitted.");
  }
  if (
    !Number.isInteger(input.declaredByteSize) ||
    input.declaredByteSize < 1 ||
    input.declaredByteSize > env.MAX_INQUIRY_FILE_BYTES
  ) {
    throw new Error("Upload size is invalid.");
  }
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + env.UPLOAD_INTENT_TTL_SECONDS * 1_000);
  await db.insert(uploadIntents).values({
    tokenHash: tokenHash(token),
    anonymousSessionId,
    declaredFileName: fileName,
    declaredMimeType: input.declaredMimeType,
    declaredByteSize: input.declaredByteSize,
    expiresAt,
  });
  return { token, expiresAt };
}

export async function completeInquiryUploadIntent<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  storage: ObjectStorage,
  scanner: FileScanner,
  input: { token: string; anonymousSessionId: string; bytes: Uint8Array },
): Promise<string> {
  const anonymousSessionId = sessionSchema.parse(input.anonymousSessionId);
  const claimed = await db
    .update(uploadIntents)
    .set({ status: "uploading", updatedAt: new Date() })
    .where(
      and(
        eq(uploadIntents.tokenHash, tokenHash(input.token)),
        eq(uploadIntents.anonymousSessionId, anonymousSessionId),
        eq(uploadIntents.status, "created"),
        gt(uploadIntents.expiresAt, new Date()),
      ),
    )
    .returning();
  const intent = claimed[0];
  if (!intent) throw new Error("Upload Intent is invalid, expired, or already used.");
  if (input.bytes.byteLength !== intent.declaredByteSize) {
    await db
      .update(uploadIntents)
      .set({ status: "failed", failureReason: "declared_size_mismatch", updatedAt: new Date() })
      .where(eq(uploadIntents.id, intent.id));
    throw new Error("Uploaded size does not match the Upload Intent.");
  }
  try {
    const retentionExpiresAt = env.INQUIRY_FILE_RETENTION_DAYS
      ? new Date(Date.now() + env.INQUIRY_FILE_RETENTION_DAYS * 86_400_000)
      : null;
    const assetId = await uploadAsset(db, storage, scanner, {
      fileName: intent.declaredFileName,
      declaredMimeType: intent.declaredMimeType,
      bytes: input.bytes,
      category: "inquiry",
      purpose: "inquiry",
      retentionExpiresAt,
      uploadIntentId: intent.id,
    });
    await db
      .update(uploadIntents)
      .set({ assetId, status: "passed", failureReason: null, updatedAt: new Date() })
      .where(eq(uploadIntents.id, intent.id));
    return assetId;
  } catch (error) {
    await db
      .update(uploadIntents)
      .set({
        status: "failed",
        failureReason: error instanceof Error ? error.name.slice(0, 100) : "upload_failed",
        updatedAt: new Date(),
      })
      .where(eq(uploadIntents.id, intent.id));
    throw error;
  }
}

export async function reserveInquiryUploadTokens<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  anonymousSessionId: string,
  tokens: readonly string[],
): Promise<{ intentIds: string[]; assetIds: string[] }> {
  sessionSchema.parse(anonymousSessionId);
  const distinct = [...new Set(tokens)];
  if (distinct.length !== tokens.length || distinct.length > env.MAX_FILES_PER_UPLOAD) {
    throw new Error("Upload Tokens are duplicated or exceed the configured limit.");
  }
  if (distinct.length === 0) return { intentIds: [], assetIds: [] };
  return db.transaction(async (transaction) => {
    const intentIds: string[] = [];
    const assetIds: string[] = [];
    for (const token of distinct) {
      const rows = await transaction
        .update(uploadIntents)
        .set({ status: "consumed", updatedAt: new Date() })
        .where(
          and(
            eq(uploadIntents.tokenHash, tokenHash(token)),
            eq(uploadIntents.anonymousSessionId, anonymousSessionId),
            eq(uploadIntents.status, "passed"),
            eq(uploadIntents.isConsumed, false),
            gt(uploadIntents.expiresAt, new Date()),
          ),
        )
        .returning({ id: uploadIntents.id, assetId: uploadIntents.assetId });
      const row = rows[0];
      if (!row?.assetId) throw new Error("Upload Token is invalid, expired, or already used.");
      const eligible = await transaction
        .select({ id: assets.id })
        .from(assets)
        .where(
          and(
            eq(assets.id, row.assetId),
            eq(assets.category, "inquiry"),
            eq(assets.access, "private"),
            eq(assets.storagePartition, "private"),
            eq(assets.status, "ready"),
            eq(assets.scanStatus, "passed"),
          ),
        );
      if (!eligible[0]) throw new Error("Upload Token Asset is not eligible.");
      intentIds.push(row.id);
      assetIds.push(row.assetId);
    }
    return { intentIds, assetIds };
  });
}

export async function finalizeInquiryUploadTokens<
  TQueryResult extends PgQueryResultHKT,
>(
  db: AppDatabase<TQueryResult>,
  intentIds: readonly string[],
  inquiryId: string,
): Promise<void> {
  if (!intentIds.length) return;
  await db
    .update(uploadIntents)
    .set({
      isConsumed: true,
      consumedByInquiryId: inquiryId,
      usedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        inArray(uploadIntents.id, [...intentIds]),
        eq(uploadIntents.status, "consumed"),
        eq(uploadIntents.isConsumed, false),
      ),
    );
}

export async function releaseReservedInquiryUploadTokens<
  TQueryResult extends PgQueryResultHKT,
>(db: AppDatabase<TQueryResult>, intentIds: readonly string[]): Promise<void> {
  if (!intentIds.length) return;
  await db
    .update(uploadIntents)
    .set({ status: "passed", updatedAt: new Date() })
    .where(
      and(
        inArray(uploadIntents.id, [...intentIds]),
        eq(uploadIntents.status, "consumed"),
        eq(uploadIntents.isConsumed, false),
      ),
    );
}
