import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import sharp from "sharp";

import { databaseConnection } from "../src/db/client";
import {
  assetUploadBatches,
  authSessions,
  products,
  uploadRecoveryJobs,
} from "../src/db/schema";
import { seedCoreData } from "../src/db/seed";
import type { AppDatabase } from "../src/db/types";
import { createObjectStorage } from "../src/storage";
import {
  completeAdminUploadIntent,
  createAdminUploadBatch,
  finalizeAdminUploadBatch,
  type AdminUploadActor,
} from "../src/uploads/admin-upload-service";
import { createFileScanner } from "../src/uploads/scanner";
import { recoverUploadRecoveryJob } from "../src/uploads/upload-recovery-service";

const e2eRetrySessionToken = "cwt-e2e-retryable-asset-session";
const allowLimiter = {
  consume: async () => ({ kind: "allowed" as const, remaining: 29, retryAfterMs: 60_000 }),
};

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function seed<TQueryResult extends PgQueryResultHKT>(
  db: AppDatabase<TQueryResult>,
): Promise<string> {
  const { adminUserId } = await seedCoreData(db);
  const existingSession = (await db.select({ id: authSessions.id }).from(authSessions).where(
    eq(authSessions.tokenHash, tokenHash(e2eRetrySessionToken)),
  ).limit(1))[0];
  const sessionId = existingSession?.id ?? (await db.insert(authSessions).values({
    userId: adminUserId,
    tokenHash: tokenHash(e2eRetrySessionToken),
    expiresAt: new Date(Date.now() + 60 * 60_000),
  }).returning({ id: authSessions.id }))[0]?.id;
  if (!sessionId) throw new Error("Unable to seed the retryable Asset E2E Session.");
  const existingBatch = (await db.select({ id: assetUploadBatches.id })
    .from(assetUploadBatches)
    .where(and(
      eq(assetUploadBatches.authSessionId, sessionId),
      eq(assetUploadBatches.createdByUserId, adminUserId),
    )).limit(1))[0];
  if (existingBatch) return existingBatch.id;

  const product = (await db.select({ id: products.id }).from(products)
    .where(eq(products.productCode, "FIXTURE-01")).limit(1))[0];
  if (!product) throw new Error("The retryable Asset E2E fixture requires FIXTURE-01.");
  const actor: AdminUploadActor = {
    userId: adminUserId,
    role: "admin",
    authSessionId: sessionId,
  };
  const bytes = new Uint8Array(await sharp({
    create: { width: 16, height: 16, channels: 3, background: "teal" },
  }).jpeg().toBuffer());
  const fixtureNow = new Date(Date.now() - 5_000);
  const storage = createObjectStorage();
  const batch = await createAdminUploadBatch(db, actor, {
    files: [{
      fileName: "TEST interrupted upload — retry without re-upload.jpg",
      declaredMimeType: "image/jpeg",
      declaredByteSize: bytes.byteLength,
    }],
    category: "product",
    role: "gallery",
    sortOrder: 99,
    associationType: "product",
    associationEntityId: product.id,
    sourceDeclarationEnabled: false,
  }, { now: fixtureNow, rateLimiter: allowLimiter });
  await completeAdminUploadIntent(
    db,
    storage,
    createFileScanner(),
    actor,
    { token: batch.intents[0]!.token, bytes },
    { now: fixtureNow },
  );
  try {
    await finalizeAdminUploadBatch(db, storage, actor, batch.batchId, {
      now: fixtureNow,
      workerId: "e2e-interrupted-finalizer",
      leaseMilliseconds: 1_000,
      faultInjector: (point) => {
        if (point === "after_finalize_claim") throw new Error("TEST E2E pre-Manifest interruption");
      },
    });
    throw new Error("Retryable Asset E2E fixture did not interrupt Finalize.");
  } catch (error) {
    if (!(error instanceof Error) || !/TEST E2E pre-Manifest interruption/.test(error.message)) throw error;
  }
  const recovery = (await db.select().from(uploadRecoveryJobs).where(and(
    eq(uploadRecoveryJobs.uploadBatchId, batch.batchId),
    eq(uploadRecoveryJobs.kind, "finalize"),
  )).limit(1))[0];
  if (!recovery?.leaseExpiresAt) throw new Error("Retryable Asset E2E Recovery was not created.");
  const result = await recoverUploadRecoveryJob(db, storage, recovery.id, {
    now: new Date(recovery.leaseExpiresAt.getTime() + 1),
    workerId: "e2e-recovery-worker",
  });
  if (result !== "retryable") throw new Error("Retryable Asset E2E handoff was not created.");
  return batch.batchId;
}

async function main(): Promise<void> {
  if (process.env.APP_ENV !== "test" || !process.env.CWT_E2E_TEMP_ROOT) {
    throw new Error("Retryable Asset E2E fixture is restricted to an isolated E2E environment.");
  }
  try {
    const batchId = databaseConnection.kind === "pglite"
      ? await seed(databaseConnection.db)
      : await seed(databaseConnection.db);
    process.stdout.write(`Retryable Asset E2E fixture ready: ${batchId}\n`);
  } finally {
    await databaseConnection.close();
  }
}

void main();
