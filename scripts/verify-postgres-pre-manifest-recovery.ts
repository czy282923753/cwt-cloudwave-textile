import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import sharp from "sharp";

import { writeAuditLog } from "../src/audit/service";
import type { DatabaseConnection } from "../src/db/client";
import { migrateDatabase } from "../src/db/migrate";
import {
  assetUploadBatches,
  assets,
  authSessions,
  finalizeObjectManifestItems,
  objectCleanupJobs,
  productTaxonomyTerms,
  products,
  taxonomyTerms,
  uploadRecoveryJobs,
  users,
} from "../src/db/schema";
import * as schema from "../src/db/schema";
import { InMemoryObjectStorage } from "../src/test/in-memory-storage";
import {
  completeAdminUploadIntent,
  createAdminUploadBatch,
  finalizeAdminUploadBatch,
  type AdminUploadActor,
} from "../src/uploads/admin-upload-service";
import { DevelopmentFileScanner } from "../src/uploads/scanner";
import {
  advanceUploadRecoveryStage,
  recoverUploadRecoveryJob,
} from "../src/uploads/upload-recovery-service";

const validationFlag = "isolated-test-database";
const allowLimiter = { consume: async () => true };

function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

async function expectFailure(operation: Promise<unknown>, pattern: RegExp): Promise<void> {
  try {
    await operation;
  } catch (error) {
    if (error instanceof Error && pattern.test(error.message)) return;
    throw error;
  }
  throw new Error(`Expected failure matching ${pattern.source}.`);
}

async function imageBytes(): Promise<Uint8Array> {
  return new Uint8Array(await sharp({
    create: { width: 12, height: 12, channels: 3, background: "#147d7e" },
  }).jpeg().toBuffer());
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (
    process.env.APP_ENV !== "test" ||
    process.env.DATABASE_DRIVER !== "postgres" ||
    process.env.CWT_POSTGRES_PRE_MANIFEST_VALIDATION !== validationFlag ||
    !databaseUrl
  ) {
    throw new Error(
      "Pre-Manifest PostgreSQL validation requires APP_ENV=test, DATABASE_DRIVER=postgres, a disposable DATABASE_URL, and the isolated validation flag.",
    );
  }
  const url = new URL(databaseUrl);
  if (!["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("Pre-Manifest PostgreSQL validation only accepts a loopback disposable database.");
  }

  const clientA = postgres(databaseUrl, { max: 1, prepare: false });
  const clientB = postgres(databaseUrl, { max: 1, prepare: false });
  const dbA = drizzle(clientA, { schema });
  const dbB = drizzle(clientB, { schema });
  const connection: DatabaseConnection = {
    kind: "postgres",
    db: dbA,
    createMigrationClient: () => postgres(databaseUrl, { max: 1, prepare: false }),
    close: async () => clientA.end(),
  };
  const storage = new InMemoryObjectStorage();
  try {
    await migrateDatabase(connection);
    const [user] = await dbA.insert(users).values({
      email: "pre-manifest-postgres@example.test",
      displayName: "TEST PostgreSQL Pre-Manifest",
      role: "admin",
      passwordHash: "test",
    }).returning({ id: users.id, role: users.role });
    invariant(user, "PostgreSQL validation User was not created.");
    const [session] = await dbA.insert(authSessions).values({
      userId: user.id,
      tokenHash: "pre-manifest-postgres-session",
      expiresAt: new Date(Date.now() + 60 * 60_000),
    }).returning({ id: authSessions.id });
    invariant(session, "PostgreSQL validation Session was not created.");
    const [taxonomy] = await dbA.insert(taxonomyTerms).values({
      internalKey: "pre-manifest-postgres-material",
      dimension: "material_fiber",
    }).returning({ id: taxonomyTerms.id });
    invariant(taxonomy, "PostgreSQL validation Taxonomy was not created.");
    const productId = await dbA.transaction(async (transaction) => {
      const [product] = await transaction.insert(products).values({ status: "draft" })
        .returning({ id: products.id });
      invariant(product, "PostgreSQL validation Product was not created.");
      await transaction.insert(productTaxonomyTerms).values({
        productId: product.id,
        taxonomyTermId: taxonomy.id,
        isPrimary: true,
      });
      return product.id;
    });
    const actor: AdminUploadActor = {
      userId: user.id,
      role: user.role,
      authSessionId: session.id,
    };
    const stage = async (label: string) => {
      const bytes = await imageBytes();
      const batch = await createAdminUploadBatch(dbA, actor, {
        files: [{
          fileName: `TEST-${label}.jpg`,
          declaredMimeType: "image/jpeg",
          declaredByteSize: bytes.byteLength,
        }],
        category: "product",
        role: "gallery",
        sortOrder: 0,
        associationType: "product",
        associationEntityId: productId,
        sourceDeclarationEnabled: false,
      }, { rateLimiter: allowLimiter });
      const assetId = await completeAdminUploadIntent(
        dbA,
        storage,
        new DevelopmentFileScanner(),
        actor,
        { token: batch.intents[0]!.token, bytes },
      );
      return { batchId: batch.batchId, assetId };
    };

    const takeoverFixture = await stage("takeover");
    const initialNow = new Date();
    await expectFailure(finalizeAdminUploadBatch(
      dbA,
      storage,
      actor,
      takeoverFixture.batchId,
      {
        now: initialNow,
        workerId: "postgres-old-finalizer",
        leaseMilliseconds: 1_000,
        faultInjector: (point) => {
          if (point === "after_finalize_claim") throw new Error("TEST PostgreSQL Pre-Manifest crash");
        },
      },
    ), /Pre-Manifest crash/);
    const recovery = (await dbA.select().from(uploadRecoveryJobs).where(and(
      eq(uploadRecoveryJobs.uploadBatchId, takeoverFixture.batchId),
      eq(uploadRecoveryJobs.kind, "finalize"),
    )))[0];
    invariant(recovery?.leaseExpiresAt, "PostgreSQL Finalize claim did not persist a lease.");
    invariant(await recoverUploadRecoveryJob(
      dbB,
      storage,
      recovery.id,
      {
        now: new Date(recovery.leaseExpiresAt.getTime() - 1),
        workerId: "postgres-early-recovery",
      },
    ) === "not_claimed", "A valid PostgreSQL lease allowed an early takeover.");

    let releaseTakeover: (() => void) | undefined;
    let signalTakeover: (() => void) | undefined;
    const takeoverClaimed = new Promise<void>((resolve) => {
      signalTakeover = resolve;
    });
    const holdTakeover = new Promise<void>((resolve) => {
      releaseTakeover = resolve;
    });
    const takeoverAt = new Date(recovery.leaseExpiresAt.getTime() + 1);
    const takeover = recoverUploadRecoveryJob(dbB, storage, recovery.id, {
      now: takeoverAt,
      workerId: "postgres-takeover-recovery",
      leaseMilliseconds: 5_000,
      faultInjector: async (point) => {
        if (point === "after_claim") {
          signalTakeover?.();
          await holdTakeover;
        }
      },
    });
    await takeoverClaimed;
    const claimed = (await dbA.select().from(uploadRecoveryJobs)
      .where(eq(uploadRecoveryJobs.id, recovery.id)))[0];
    invariant(claimed?.leaseExpiresAt, "PostgreSQL takeover did not persist its lease.");
    invariant(claimed.lockedBy === "postgres-takeover-recovery", "PostgreSQL takeover owner is incorrect.");
    invariant(claimed.version > recovery.version, "PostgreSQL takeover did not advance the fence version.");
    invariant(await recoverUploadRecoveryJob(
      dbA,
      storage,
      recovery.id,
      { now: new Date(takeoverAt.getTime() + 1), workerId: "postgres-second-recovery" },
    ) === "not_claimed", "A second PostgreSQL Recovery worker claimed an active lease.");
    await expectFailure(advanceUploadRecoveryStage(dbA, {
      id: recovery.id,
      workerId: "postgres-old-finalizer",
      version: recovery.version,
      attemptCount: recovery.attemptCount,
      leaseExpiresAt: recovery.leaseExpiresAt,
    }, "source_copy_started", new Date(takeoverAt.getTime() + 2)), /lease|version/i);
    releaseTakeover?.();
    invariant(await takeover === "retryable", "PostgreSQL Pre-Manifest takeover was not made retryable.");
    const handedOff = (await dbA.select().from(uploadRecoveryJobs)
      .where(eq(uploadRecoveryJobs.id, recovery.id)))[0];
    invariant(
      handedOff?.status === "retryable" && handedOff.lockedBy === null,
      "PostgreSQL Pre-Manifest takeover did not create a clear Finalize handoff.",
    );
    invariant((await dbA.select().from(assetUploadBatches).where(
      eq(assetUploadBatches.id, takeoverFixture.batchId),
    ))[0]?.status === "failed", "PostgreSQL Batch was not made retryable through the existing failed path.");
    invariant((await dbA.select().from(finalizeObjectManifestItems).where(
      eq(finalizeObjectManifestItems.recoveryJobId, recovery.id),
    )).length === 0, "PostgreSQL Pre-Manifest takeover fabricated a Manifest.");
    invariant((await dbA.select().from(objectCleanupJobs).where(and(
      eq(objectCleanupJobs.uploadBatchId, takeoverFixture.batchId),
      eq(objectCleanupJobs.storagePartition, "public"),
    ))).length === 0, "PostgreSQL Pre-Manifest takeover created Public Cleanup.");
    invariant((await dbA.select().from(assets).where(
      eq(assets.id, takeoverFixture.assetId),
    ))[0]?.storagePartition === "private", "PostgreSQL Pre-Manifest takeover exposed the Asset.");
    const completed = await finalizeAdminUploadBatch(
      dbB,
      storage,
      actor,
      takeoverFixture.batchId,
      { now: new Date(takeoverAt.getTime() + 2), workerId: "postgres-new-finalizer" },
    );
    invariant(completed.success, "PostgreSQL takeover handoff did not complete Finalize.");
    invariant((await dbA.select().from(assetUploadBatches).where(
      eq(assetUploadBatches.id, takeoverFixture.batchId),
    ))[0]?.status === "completed", "PostgreSQL Batch remained stuck after retry.");

    const auditFixture = await stage("audit-rollback");
    await expectFailure(finalizeAdminUploadBatch(
      dbA,
      storage,
      actor,
      auditFixture.batchId,
      {
        workerId: "postgres-audit-old-finalizer",
        leaseMilliseconds: 1_000,
        faultInjector: (point) => {
          if (point === "after_finalize_claim") throw new Error("TEST PostgreSQL Audit fixture crash");
        },
      },
    ), /Audit fixture crash/);
    const auditRecovery = (await dbA.select().from(uploadRecoveryJobs).where(and(
      eq(uploadRecoveryJobs.uploadBatchId, auditFixture.batchId),
      eq(uploadRecoveryJobs.kind, "finalize"),
    )))[0];
    invariant(auditRecovery?.leaseExpiresAt, "PostgreSQL Audit fixture lease is missing.");
    const failAudit: typeof writeAuditLog = async (db, input) => {
      if (
        input.action === "asset.finalize.crash_recovered" &&
        input.afterSummary?.recoveryMode === "pre_manifest_retryable"
      ) {
        throw new Error("TEST PostgreSQL required Audit failure");
      }
      return writeAuditLog(db, input);
    };
    await expectFailure(recoverUploadRecoveryJob(dbB, storage, auditRecovery.id, {
      now: new Date(auditRecovery.leaseExpiresAt.getTime() + 1),
      workerId: "postgres-audit-takeover",
      leaseMilliseconds: 1_000,
      auditWriter: failAudit,
    }), /required Audit failure/);
    const rolledBack = (await dbA.select().from(uploadRecoveryJobs)
      .where(eq(uploadRecoveryJobs.id, auditRecovery.id)))[0];
    invariant(
      rolledBack?.status === "processing" && rolledBack.lockedBy === "postgres-audit-takeover",
      "PostgreSQL required Audit failure did not roll back the handoff transition.",
    );
    invariant((await dbA.select().from(assetUploadBatches).where(
      eq(assetUploadBatches.id, auditFixture.batchId),
    ))[0]?.status === "finalizing", "PostgreSQL required Audit failure changed the Batch.");
    invariant(rolledBack.leaseExpiresAt, "PostgreSQL rolled-back claim lost its recoverable lease.");
    invariant(await recoverUploadRecoveryJob(dbA, storage, auditRecovery.id, {
      now: new Date(rolledBack.leaseExpiresAt.getTime() + 1),
      workerId: "postgres-audit-retry",
    }) === "retryable", "PostgreSQL Audit rollback was not recoverable after lease expiry.");

    const [databaseInfo] = await clientA<{ serverVersion: string }[]>`
      select current_setting('server_version') as "serverVersion"
    `;
    const [transactionState] = await clientA<{ idleInTransaction: number }[]>`
      select count(*)::int as "idleInTransaction"
      from pg_stat_activity
      where datname = current_database()
        and pid <> pg_backend_pid()
        and state in ('idle in transaction', 'idle in transaction (aborted)')
    `;
    const [residualLocks] = await clientA<{ count: number }[]>`
      select count(*)::int as count
      from pg_locks locks
      join pg_stat_activity activity on activity.pid = locks.pid
      where activity.datname = current_database()
        and activity.pid <> pg_backend_pid()
        and locks.granted
        and locks.locktype not in ('virtualxid')
    `;
    invariant(transactionState?.idleInTransaction === 0, "PostgreSQL validation left an idle transaction.");
    invariant(residualLocks?.count === 0, "PostgreSQL validation left a residual lock.");
    process.stdout.write(`${JSON.stringify({
      status: "passed",
      postgres: databaseInfo?.serverVersion,
      independentConnections: 2,
      validLeaseDenied: true,
      expiredLeaseTakeover: true,
      staleWorkerFenced: true,
      secondRecoveryNotClaimed: true,
      preManifestRetryCompleted: true,
      requiredAuditRollback: true,
      idleInTransaction: transactionState?.idleInTransaction,
      residualLocks: residualLocks?.count,
    }, null, 2)}\n`);
  } finally {
    await Promise.allSettled([clientA.end(), clientB.end()]);
  }
}

void main();
