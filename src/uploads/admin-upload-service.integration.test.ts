import { and, eq } from "drizzle-orm";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { env } from "@/config/env";
import { writeAuditLog } from "@/audit/service";
import { assetUploadBatches, assets, assetVariants, auditLogs, authSessions, objectCleanupJobs, productAssets, products, productTaxonomyTerms, taxonomyTerms, uploadIntents, uploadRecoveryJobs, users } from "@/db/schema";
import { InMemoryObjectStorage } from "@/test/in-memory-storage";
import { createTestDatabase } from "@/test/database";
import { findPublicAssetForDelivery } from "@/public-site/public-asset-access";

import {
  completeAdminUploadIntent,
  createAdminUploadBatch,
  finalizeAdminUploadBatch,
  inspectAdminUploadIntent,
  linkAssetRelation,
  unlinkAssetRelation,
  type AdminUploadActor,
} from "./admin-upload-service";
import {
  CLEANUP_MAX_ATTEMPTS,
  UPLOAD_RECOVERY_SYSTEM_ACTOR,
  claimObjectCleanupJob,
  processObjectCleanupJob,
  processPendingObjectCleanupJobs,
  registerObjectCleanup,
} from "./object-cleanup-service";
import { DevelopmentFileScanner } from "./scanner";
import { processPendingUploadRecoveryJobs } from "./upload-recovery-service";

const allowLimiter = { consume: async () => true };
const failingAudit = async (): Promise<string> => { throw new Error("TEST audit failure"); };
const failReleasedAudit: typeof writeAuditLog = async (db, input) => {
  if (input.action === "asset.released_public") throw new Error("TEST release Audit failure");
  return writeAuditLog(db, input);
};
const cleanLimitScanner = { scan: async () => ({ clean: true, provider: "test-limit-scanner", reference: "test:clean" }) };

async function jpegWithSize(size?: number): Promise<Uint8Array> {
  const base = new Uint8Array(await sharp({ create: { width: 16, height: 16, channels: 3, background: "teal" } }).jpeg().toBuffer());
  if (!size) return base;
  if (size < base.byteLength) throw new Error("Requested fixture is too small.");
  const bytes = new Uint8Array(size);
  bytes.set(base);
  return bytes;
}

async function createDraftProducts(
  db: Awaited<ReturnType<typeof createTestDatabase>>["db"],
  key: string,
  amount: number,
): Promise<string[]> {
  const [taxonomy] = await db.insert(taxonomyTerms).values({ internalKey: key, dimension: "material_fiber" }).returning({ id: taxonomyTerms.id });
  if (!taxonomy) throw new Error("Missing Taxonomy.");
  return db.transaction(async (transaction) => {
    const rows = await transaction.insert(products).values(Array.from({ length: amount }, () => ({ status: "draft" as const }))).returning({ id: products.id });
    await transaction.insert(productTaxonomyTerms).values(rows.map((row) => ({ productId: row.id, taxonomyTermId: taxonomy.id, isPrimary: true })));
    return rows.map((row) => row.id);
  });
}

async function stageImageBatch(
  db: Awaited<ReturnType<typeof createTestDatabase>>["db"],
  storage: InMemoryObjectStorage,
  actor: AdminUploadActor,
  productId: string,
  fixtureName: string,
) {
  const bytes = await jpegWithSize();
  const batch = await createAdminUploadBatch(db, actor, {
    files: [{ fileName: `${fixtureName}.jpg`, declaredMimeType: "image/jpeg", declaredByteSize: bytes.byteLength }],
    category: "product",
    role: "gallery",
    sortOrder: 0,
    associationType: "product",
    associationEntityId: productId,
    sourceDeclarationEnabled: false,
  }, { rateLimiter: allowLimiter });
  const assetId = await completeAdminUploadIntent(
    db,
    storage,
    new DevelopmentFileScanner(),
    actor,
    { token: batch.intents[0]!.token, bytes },
  );
  return { batch, assetId };
}

class FaultInjectingStorage extends InMemoryObjectStorage {
  publicPublicPutCount = 0;
  throwAfterPublicPutAt: number | null = null;
  failDeleteCount = 0;

  override async put(...args: Parameters<InMemoryObjectStorage["put"]>) {
    const result = await super.put(...args);
    if (args[0] === "public") {
      this.publicPublicPutCount += 1;
      if (this.throwAfterPublicPutAt === this.publicPublicPutCount) {
        throw new Error("TEST put persisted then failed");
      }
    }
    return result;
  }

  override async delete(...args: Parameters<InMemoryObjectStorage["delete"]>) {
    if (this.failDeleteCount > 0) {
      this.failDeleteCount -= 1;
      throw new Error("TEST cleanup delete failed");
    }
    return super.delete(...args);
  }
}

describe("Admin Asset Upload Intents", () => {
  it("keeps a committed Finalize successful when post-commit Cleanup Audit and warning writes remain unavailable", async () => {
    const connection = await createTestDatabase();
    const storage = new InMemoryObjectStorage();
    try {
      const [user] = await connection.db.insert(users).values({
        email: "post-commit-audit@example.test",
        displayName: "TEST Post Commit Audit",
        role: "admin",
        passwordHash: "test",
      }).returning({ id: users.id, role: users.role });
      if (!user) throw new Error("Missing User.");
      const [session] = await connection.db.insert(authSessions).values({
        userId: user.id,
        tokenHash: "post-commit-audit-session",
        expiresAt: new Date(Date.now() + 60_000),
      }).returning({ id: authSessions.id });
      if (!session) throw new Error("Missing Session.");
      const actor: AdminUploadActor = { userId: user.id, role: user.role, authSessionId: session.id };
      const [productId] = await createDraftProducts(connection.db, "post-commit-audit-product", 1);
      if (!productId) throw new Error("Missing Product.");
      const staged = await stageImageBatch(connection.db, storage, actor, productId, "post-commit-audit");
      let postCommitOutage = false;
      const postCommitFailingAudit: typeof writeAuditLog = async (database, input) => {
        if (postCommitOutage) throw new Error("TEST persistent post-commit Audit outage");
        const id = await writeAuditLog(database, input);
        if (input.action === "asset.upload_batch.completed") postCommitOutage = true;
        return id;
      };

      const result = await finalizeAdminUploadBatch(
        connection.db,
        storage,
        actor,
        staged.batch.batchId,
        { auditWriter: postCommitFailingAudit },
      );
      expect(result).toMatchObject({
        success: true,
        batchId: staged.batch.batchId,
        assetId: staged.assetId,
        alreadyFinalized: false,
        privateCleanupPending: true,
        maintenanceWarning: expect.stringMatching(/cleanup.*pending/i),
      });
      expect((await connection.db.select().from(assetUploadBatches)
        .where(eq(assetUploadBatches.id, staged.batch.batchId)))[0]?.status).toBe("completed");
      expect((await connection.db.select().from(assets)
        .where(eq(assets.id, staged.assetId)))[0]).toMatchObject({
        storagePartition: "public",
        access: "public",
        status: "ready",
      });
      expect((await connection.db.select().from(uploadRecoveryJobs).where(and(
        eq(uploadRecoveryJobs.uploadBatchId, staged.batch.batchId),
        eq(uploadRecoveryJobs.kind, "finalize"),
      )))[0]).toMatchObject({ status: "completed", stage: "completed" });
      expect((await connection.db.select().from(objectCleanupJobs).where(and(
        eq(objectCleanupJobs.uploadBatchId, staged.batch.batchId),
        eq(objectCleanupJobs.storagePartition, "public"),
      ))).every((job) => job.status === "cancelled")).toBe(true);
      const [privateCleanup] = await connection.db.select().from(objectCleanupJobs).where(and(
        eq(objectCleanupJobs.uploadBatchId, staged.batch.batchId),
        eq(objectCleanupJobs.storagePartition, "private"),
      ));
      expect(privateCleanup?.status).toBe("pending");
      expect(await connection.db.select().from(auditLogs).where(and(
        eq(auditLogs.action, "asset.finalize.recovery_required"),
        eq(auditLogs.entityId, staged.batch.batchId),
      ))).toHaveLength(0);
      await expect(processObjectCleanupJob(
        connection.db,
        storage,
        privateCleanup!.id,
        { workerId: "post-commit-retry" },
      )).resolves.toBe("completed");
      expect(storage.objects.has(`private:${privateCleanup!.objectKey}`)).toBe(false);
    } finally {
      await connection.close();
    }
  }, 20_000);

  it("isolates post-commit wake and Private delete failures without rearming Public compensation", async () => {
    for (const failure of ["wake", "delete", "state"] as const) {
      const connection = await createTestDatabase();
      const storage = new FaultInjectingStorage();
      try {
        const [user] = await connection.db.insert(users).values({
          email: `post-commit-${failure}@example.test`,
          displayName: `TEST Post Commit ${failure}`,
          role: "admin",
          passwordHash: "test",
        }).returning({ id: users.id, role: users.role });
        if (!user) throw new Error("Missing User.");
        const [session] = await connection.db.insert(authSessions).values({
          userId: user.id,
          tokenHash: `post-commit-${failure}-session`,
          expiresAt: new Date(Date.now() + 60_000),
        }).returning({ id: authSessions.id });
        if (!session) throw new Error("Missing Session.");
        const actor: AdminUploadActor = { userId: user.id, role: user.role, authSessionId: session.id };
        const [productId] = await createDraftProducts(connection.db, `post-commit-${failure}-product`, 1);
        if (!productId) throw new Error("Missing Product.");
        const staged = await stageImageBatch(connection.db, storage, actor, productId, `post-commit-${failure}`);
        if (failure === "delete") storage.failDeleteCount = 1;
        const stateFailingAudit: typeof writeAuditLog = async (database, input) => {
          if (input.action === "object_cleanup.completed") {
            throw new Error("TEST post-commit Cleanup state Audit failure");
          }
          return writeAuditLog(database, input);
        };
        const result = await finalizeAdminUploadBatch(
          connection.db,
          storage,
          actor,
          staged.batch.batchId,
          failure === "wake" ? {
            faultInjector: (point) => {
              if (point === "before_post_commit_cleanup") throw new Error("TEST worker wake failure");
            },
          } : failure === "state" ? { auditWriter: stateFailingAudit } : {},
        );
        expect(result).toMatchObject({
          success: true,
          batchId: staged.batch.batchId,
          privateCleanupPending: true,
        });
        expect((await connection.db.select().from(assetUploadBatches)
          .where(eq(assetUploadBatches.id, staged.batch.batchId)))[0]?.status).toBe("completed");
        expect((await connection.db.select().from(uploadRecoveryJobs).where(and(
          eq(uploadRecoveryJobs.uploadBatchId, staged.batch.batchId),
          eq(uploadRecoveryJobs.kind, "finalize"),
        )))[0]?.status).toBe("completed");
        expect((await connection.db.select().from(objectCleanupJobs).where(and(
          eq(objectCleanupJobs.uploadBatchId, staged.batch.batchId),
          eq(objectCleanupJobs.storagePartition, "public"),
        ))).every((job) => job.status === "cancelled")).toBe(true);
      } finally {
        await connection.close();
      }
    }
  }, 30_000);

  it("dead-letters exhausted Finalize Private cleanup without reversing the committed Finalize", async () => {
    const connection = await createTestDatabase();
    const storage = new FaultInjectingStorage();
    try {
      const [user] = await connection.db.insert(users).values({
        email: "finalize-private-dead@example.test",
        displayName: "TEST Finalize Private Dead",
        role: "admin",
        passwordHash: "test",
      }).returning({ id: users.id, role: users.role });
      if (!user) throw new Error("Missing User.");
      const [session] = await connection.db.insert(authSessions).values({
        userId: user.id,
        tokenHash: "finalize-private-dead-session",
        expiresAt: new Date(Date.now() + 60_000),
      }).returning({ id: authSessions.id });
      if (!session) throw new Error("Missing Session.");
      const actor: AdminUploadActor = {
        userId: user.id,
        role: user.role,
        authSessionId: session.id,
      };
      const [productId] = await createDraftProducts(
        connection.db,
        "finalize-private-dead-product",
        1,
      );
      if (!productId) throw new Error("Missing Product.");
      const staged = await stageImageBatch(
        connection.db,
        storage,
        actor,
        productId,
        "finalize-private-dead",
      );

      storage.failDeleteCount = CLEANUP_MAX_ATTEMPTS;
      await expect(finalizeAdminUploadBatch(
        connection.db,
        storage,
        actor,
        staged.batch.batchId,
      )).resolves.toMatchObject({
        success: true,
        batchId: staged.batch.batchId,
        assetId: staged.assetId,
        alreadyFinalized: false,
        privateCleanupPending: true,
      });

      const [privateCleanup] = await connection.db.select().from(objectCleanupJobs).where(and(
        eq(objectCleanupJobs.uploadBatchId, staged.batch.batchId),
        eq(objectCleanupJobs.cleanupKind, "finalize_private"),
      ));
      if (!privateCleanup) throw new Error("Missing Finalize Private Cleanup.");
      expect(privateCleanup).toMatchObject({ status: "pending", attemptCount: 1 });

      for (let attempt = 2; attempt <= CLEANUP_MAX_ATTEMPTS; attempt += 1) {
        const current = (await connection.db.select().from(objectCleanupJobs)
          .where(eq(objectCleanupJobs.id, privateCleanup.id)))[0];
        if (!current) throw new Error("Finalize Private Cleanup disappeared.");
        const result = await processObjectCleanupJob(
          connection.db,
          storage,
          current.id,
          {
            now: new Date(current.nextAttemptAt.getTime() + 1),
            workerId: attempt === CLEANUP_MAX_ATTEMPTS
              ? "system:unauthorized-cleanup-worker"
              : `finalize-private-retry-${attempt}`,
          },
        );
        expect(result, `attempt ${attempt}`).toBe(
          attempt === CLEANUP_MAX_ATTEMPTS ? "dead" : "retry",
        );
      }

      const deadCleanup = (await connection.db.select().from(objectCleanupJobs)
        .where(eq(objectCleanupJobs.id, privateCleanup.id)))[0];
      expect(deadCleanup).toMatchObject({
        status: "dead",
        attemptCount: CLEANUP_MAX_ATTEMPTS,
        lastError: "TEST cleanup delete failed",
      });
      expect((await connection.db.select().from(assetUploadBatches)
        .where(eq(assetUploadBatches.id, staged.batch.batchId)))[0]).toMatchObject({
        status: "completed",
        failureReason: null,
      });
      const releasedAsset = (await connection.db.select().from(assets)
        .where(eq(assets.id, staged.assetId)))[0];
      expect(releasedAsset).toMatchObject({
        storagePartition: "public",
        access: "public",
        status: "ready",
        scanStatus: "passed",
      });
      expect(await connection.db.select().from(productAssets).where(and(
        eq(productAssets.productId, productId),
        eq(productAssets.assetId, staged.assetId),
      ))).toHaveLength(1);
      const recoveries = await connection.db.select().from(uploadRecoveryJobs)
        .where(eq(uploadRecoveryJobs.uploadBatchId, staged.batch.batchId));
      expect(recoveries.find((row) => row.kind === "finalize")).toMatchObject({
        status: "completed",
        stage: "completed",
      });
      expect(recoveries.find((row) => row.kind === "staging")).toMatchObject({
        status: "completed",
        stage: "completed",
      });
      expect((await connection.db.select().from(uploadIntents)
        .where(eq(uploadIntents.uploadBatchId, staged.batch.batchId)))[0]).toMatchObject({
        status: "consumed",
        isConsumed: true,
      });
      const publicCompensation = await connection.db.select().from(objectCleanupJobs).where(and(
        eq(objectCleanupJobs.uploadBatchId, staged.batch.batchId),
        eq(objectCleanupJobs.cleanupKind, "finalize_public"),
      ));
      expect(publicCompensation).not.toHaveLength(0);
      expect(publicCompensation.every((job) => job.status === "cancelled")).toBe(true);
      expect(storage.objects.has(`public:${releasedAsset!.objectKey}`)).toBe(true);
      expect(storage.objects.has(`private:${privateCleanup.objectKey}`)).toBe(true);

      const [deadAudit] = await connection.db.select().from(auditLogs).where(and(
        eq(auditLogs.action, "object_cleanup.dead"),
        eq(auditLogs.entityId, privateCleanup.id),
      ));
      expect(deadAudit?.afterSummary).toMatchObject({
        systemActor: UPLOAD_RECOVERY_SYSTEM_ACTOR,
        cleanupKind: "finalize_private",
        maintenanceOnly: true,
        requiresManualCleanup: true,
        outcome: "private_staging_cleanup_exhausted",
      });
      expect(await connection.db.select().from(auditLogs).where(and(
        eq(auditLogs.action, "asset.finalize.cleanup_dead"),
        eq(auditLogs.entityId, staged.batch.batchId),
      ))).toHaveLength(0);

      await expect(finalizeAdminUploadBatch(
        connection.db,
        storage,
        actor,
        staged.batch.batchId,
      )).resolves.toMatchObject({
        success: true,
        batchId: staged.batch.batchId,
        assetId: staged.assetId,
        alreadyFinalized: true,
        privateCleanupPending: true,
      });
    } finally {
      await connection.close();
    }
  }, 30_000);

  it("rolls back Finalize Private dead-letter state when its required Audit fails", async () => {
    const connection = await createTestDatabase();
    const storage = new FaultInjectingStorage();
    try {
      const [user] = await connection.db.insert(users).values({
        email: "finalize-private-dead-audit@example.test",
        displayName: "TEST Finalize Private Dead Audit",
        role: "admin",
        passwordHash: "test",
      }).returning({ id: users.id, role: users.role });
      if (!user) throw new Error("Missing User.");
      const [session] = await connection.db.insert(authSessions).values({
        userId: user.id,
        tokenHash: "finalize-private-dead-audit-session",
        expiresAt: new Date(Date.now() + 60_000),
      }).returning({ id: authSessions.id });
      if (!session) throw new Error("Missing Session.");
      const actor: AdminUploadActor = {
        userId: user.id,
        role: user.role,
        authSessionId: session.id,
      };
      const [productId] = await createDraftProducts(
        connection.db,
        "finalize-private-dead-audit-product",
        1,
      );
      if (!productId) throw new Error("Missing Product.");
      const staged = await stageImageBatch(
        connection.db,
        storage,
        actor,
        productId,
        "finalize-private-dead-audit",
      );
      storage.failDeleteCount = 1;
      await finalizeAdminUploadBatch(connection.db, storage, actor, staged.batch.batchId);
      const [cleanup] = await connection.db.select().from(objectCleanupJobs).where(and(
        eq(objectCleanupJobs.uploadBatchId, staged.batch.batchId),
        eq(objectCleanupJobs.cleanupKind, "finalize_private"),
      ));
      if (!cleanup) throw new Error("Missing Finalize Private Cleanup.");
      await connection.db.update(objectCleanupJobs).set({ maxAttempts: 2 })
        .where(eq(objectCleanupJobs.id, cleanup.id));
      storage.failDeleteCount = 2;
      const deadAuditFailure: typeof writeAuditLog = async (database, input) => {
        if (input.action === "object_cleanup.dead") {
          throw new Error("TEST Finalize Private dead Audit failure");
        }
        return writeAuditLog(database, input);
      };
      await expect(processObjectCleanupJob(
        connection.db,
        storage,
        cleanup.id,
        {
          now: new Date(cleanup.nextAttemptAt.getTime() + 1),
          workerId: "finalize-private-dead-audit-worker",
          auditWriter: deadAuditFailure,
        },
      )).rejects.toThrow(/dead Audit failure/);
      const rolledBack = (await connection.db.select().from(objectCleanupJobs)
        .where(eq(objectCleanupJobs.id, cleanup.id)))[0];
      expect(rolledBack).toMatchObject({
        status: "processing",
        attemptCount: 2,
        lockedBy: "finalize-private-dead-audit-worker",
      });
      expect((await connection.db.select().from(assetUploadBatches)
        .where(eq(assetUploadBatches.id, staged.batch.batchId)))[0]?.status).toBe("completed");
      expect((await connection.db.select().from(uploadRecoveryJobs).where(and(
        eq(uploadRecoveryJobs.uploadBatchId, staged.batch.batchId),
        eq(uploadRecoveryJobs.kind, "finalize"),
      )))[0]?.status).toBe("completed");

      expect(await processObjectCleanupJob(
        connection.db,
        storage,
        cleanup.id,
        {
          now: new Date(rolledBack!.leaseExpiresAt!.getTime() + 1),
          workerId: "finalize-private-dead-audit-retry",
        },
      )).toBe("dead");
      expect((await connection.db.select().from(objectCleanupJobs)
        .where(eq(objectCleanupJobs.id, cleanup.id)))[0]?.status).toBe("dead");
      expect((await connection.db.select().from(assetUploadBatches)
        .where(eq(assetUploadBatches.id, staged.batch.batchId)))[0]?.status).toBe("completed");
    } finally {
      await connection.close();
    }
  }, 30_000);

  it("returns completed Finalize idempotently only for the exact authorized owner and intact object graph", async () => {
    const connection = await createTestDatabase();
    const storage = new FaultInjectingStorage();
    try {
      const usersInserted = await connection.db.insert(users).values([
        { email: "idempotent-owner@example.test", displayName: "TEST Owner", role: "admin", passwordHash: "test" },
        { email: "idempotent-other@example.test", displayName: "TEST Other", role: "admin", passwordHash: "test" },
      ]).returning({ id: users.id, role: users.role, email: users.email });
      const owner = usersInserted.find((user) => user.email === "idempotent-owner@example.test")!;
      const other = usersInserted.find((user) => user.email === "idempotent-other@example.test")!;
      const sessions = await connection.db.insert(authSessions).values([
        { userId: owner.id, tokenHash: "idempotent-owner-session", expiresAt: new Date(Date.now() + 60_000) },
        { userId: other.id, tokenHash: "idempotent-other-session", expiresAt: new Date(Date.now() + 60_000) },
      ]).returning({ id: authSessions.id, userId: authSessions.userId });
      const ownerActor: AdminUploadActor = { userId: owner.id, role: owner.role, authSessionId: sessions.find((session) => session.userId === owner.id)!.id };
      const otherActor: AdminUploadActor = { userId: other.id, role: other.role, authSessionId: sessions.find((session) => session.userId === other.id)!.id };
      const [productId] = await createDraftProducts(connection.db, "idempotent-owner-product", 1);
      if (!productId) throw new Error("Missing Product.");
      const staged = await stageImageBatch(connection.db, storage, ownerActor, productId, "idempotent-owner");
      const first = await finalizeAdminUploadBatch(connection.db, storage, ownerActor, staged.batch.batchId);
      const publicPuts = storage.publicPublicPutCount;
      await expect(finalizeAdminUploadBatch(
        connection.db,
        storage,
        ownerActor,
        staged.batch.batchId,
      )).resolves.toMatchObject({
        success: true,
        batchId: first.batchId,
        assetId: first.assetId,
        alreadyFinalized: true,
      });
      expect(storage.publicPublicPutCount).toBe(publicPuts);
      await expect(finalizeAdminUploadBatch(
        connection.db,
        storage,
        otherActor,
        staged.batch.batchId,
      )).rejects.toThrow(/unavailable|incomplete|expired|finalized/i);

      await connection.db.update(assets).set({ uploadBatchId: null }).where(eq(assets.id, staged.assetId));
      await expect(finalizeAdminUploadBatch(
        connection.db,
        storage,
        ownerActor,
        staged.batch.batchId,
      )).rejects.toThrow(/identity|integrity/i);
      await connection.db.update(assets).set({ uploadBatchId: staged.batch.batchId }).where(eq(assets.id, staged.assetId));
      const released = (await connection.db.select().from(assets).where(eq(assets.id, staged.assetId)))[0]!;
      const publicBytes = await storage.get("public", released.objectKey);
      await storage.delete("public", released.objectKey);
      await expect(finalizeAdminUploadBatch(
        connection.db,
        storage,
        ownerActor,
        staged.batch.batchId,
      )).rejects.toThrow(/incomplete|integrity/i);
      await storage.put("public", released.objectKey, publicBytes, released.detectedMimeType!);
    } finally {
      await connection.close();
    }
  }, 25_000);

  it("binds User and Session, transitions the Batch, finalizes atomically, and keeps declaration OFF/null", async () => {
    const connection = await createTestDatabase();
    const storage = new InMemoryObjectStorage();
    try {
      const userRows = await connection.db.insert(users).values([
        { email: "asset-admin@example.test", displayName: "Asset Admin", role: "admin", passwordHash: "test" },
        { email: "asset-other-admin@example.test", displayName: "Other Admin", role: "admin", passwordHash: "test" },
      ]).returning({ id: users.id, role: users.role, email: users.email });
      const user = userRows.find((row) => row.email === "asset-admin@example.test");
      const otherUser = userRows.find((row) => row.email === "asset-other-admin@example.test");
      if (!user || !otherUser) throw new Error("Missing User.");
      const sessions = await connection.db.insert(authSessions).values([
        { userId: user.id, tokenHash: "asset-session-a", expiresAt: new Date(Date.now() + 60_000) },
        { userId: user.id, tokenHash: "asset-session-b", expiresAt: new Date(Date.now() + 60_000) },
        { userId: otherUser.id, tokenHash: "asset-session-other-user", expiresAt: new Date(Date.now() + 60_000) },
      ]).returning({ id: authSessions.id, userId: authSessions.userId });
      const ownSessions = sessions.filter((row) => row.userId === user.id);
      const actor = { userId: user.id, role: user.role, authSessionId: ownSessions[0]!.id };
      const crossSession = { ...actor, authSessionId: ownSessions[1]!.id };
      const crossUser = { userId: otherUser.id, role: otherUser.role, authSessionId: sessions.find((row) => row.userId === otherUser.id)!.id };
      const [productId] = await createDraftProducts(connection.db, "upload-product-a", 1);
      if (!productId) throw new Error("Missing Product.");
      const bytes = await jpegWithSize(1_048_577);
      const batch = await createAdminUploadBatch(connection.db, actor, {
        files: [{ fileName: "TEST-over-one-mib.jpg", declaredMimeType: "image/jpeg", declaredByteSize: bytes.byteLength }],
        category: "product", role: "gallery", sortOrder: 2,
        associationType: "product", associationEntityId: productId,
        sourceDeclarationEnabled: false, sourceDeclaration: null,
      }, { rateLimiter: allowLimiter });
      await expect(inspectAdminUploadIntent(connection.db, crossSession, batch.intents[0]!.token)).rejects.toThrow(/invalid|expired|used/i);
      await expect(inspectAdminUploadIntent(connection.db, crossUser, batch.intents[0]!.token)).rejects.toThrow(/invalid|expired|used/i);
      await completeAdminUploadIntent(connection.db, storage, new DevelopmentFileScanner(), actor, { token: batch.intents[0]!.token, bytes });
      await expect(completeAdminUploadIntent(connection.db, storage, new DevelopmentFileScanner(), actor, { token: batch.intents[0]!.token, bytes })).rejects.toThrow(/invalid|expired|used/i);
      expect((await connection.db.select().from(assetUploadBatches).where(eq(assetUploadBatches.id, batch.batchId)))[0]).toMatchObject({ status: "ready_to_finalize", completedFileCount: 1 });
      const result = await finalizeAdminUploadBatch(connection.db, storage, actor, batch.batchId);
      const released = (await connection.db.select().from(assets).where(eq(assets.id, result.assetIds[0]!)))[0]!;
      expect(released).toMatchObject({ storagePartition: "public", access: "public", status: "ready", scanStatus: "passed", sourceDeclarationEnabled: false });
      expect(released.sourceType).toBeNull();
      expect(released.rightsStatus).toBeNull();
      expect(released.publicUsePermission).toBeNull();
      expect(released.declarationReviewerUserId).toBeNull();
      expect(await connection.db.select().from(productAssets).where(eq(productAssets.assetId, released.id))).toHaveLength(1);
      expect((await connection.db.select().from(assetUploadBatches).where(eq(assetUploadBatches.id, batch.batchId)))[0]?.status).toBe("completed");
      await expect(finalizeAdminUploadBatch(connection.db, storage, actor, batch.batchId)).resolves.toMatchObject({
        success: true,
        batchId: batch.batchId,
        assetId: released.id,
        alreadyFinalized: true,
      });
    } finally { await connection.close(); }
  }, 20_000);

  it("accepts the exact configured limit, rejects limit plus one and expired/unauthorized intents", async () => {
    const connection = await createTestDatabase();
    const storage = new InMemoryObjectStorage();
    try {
      const inserted = await connection.db.insert(users).values([
        { email: "limit-admin@example.test", displayName: "Limit Admin", role: "admin", passwordHash: "test" },
        { email: "limit-analyst@example.test", displayName: "Limit Analyst", role: "analyst", passwordHash: "test" },
      ]).returning({ id: users.id, role: users.role });
      const admin = inserted.find((row) => row.role === "admin")!;
      const analyst = inserted.find((row) => row.role === "analyst")!;
      const sessions = await connection.db.insert(authSessions).values([
        { userId: admin.id, tokenHash: "limit-admin-session", expiresAt: new Date(Date.now() + 60_000) },
        { userId: analyst.id, tokenHash: "limit-analyst-session", expiresAt: new Date(Date.now() + 60_000) },
      ]).returning({ id: authSessions.id, userId: authSessions.userId });
      const actor = { userId: admin.id, role: admin.role, authSessionId: sessions.find((row) => row.userId === admin.id)!.id };
      await expect(createAdminUploadBatch(connection.db, { userId: analyst.id, role: analyst.role, authSessionId: sessions.find((row) => row.userId === analyst.id)!.id }, {
        files: [{ fileName: "forbidden.jpg", declaredMimeType: "image/jpeg", declaredByteSize: 10 }], category: "product", role: "gallery", sortOrder: 0, sourceDeclarationEnabled: false,
      }, { rateLimiter: allowLimiter })).rejects.toThrow(/permission/i);
      await expect(createAdminUploadBatch(connection.db, actor, {
        files: [{ fileName: "too-large.jpg", declaredMimeType: "image/jpeg", declaredByteSize: env.MAX_PUBLIC_FILE_BYTES + 1 }], category: "product", role: "gallery", sortOrder: 0, sourceDeclarationEnabled: false,
      }, { rateLimiter: allowLimiter })).rejects.toThrow(/size/i);
      const exact = await jpegWithSize(env.MAX_PUBLIC_FILE_BYTES);
      const batch = await createAdminUploadBatch(connection.db, actor, {
        files: [{ fileName: "exact-limit.jpg", declaredMimeType: "image/jpeg", declaredByteSize: exact.byteLength }], category: "product", role: "gallery", sortOrder: 0, sourceDeclarationEnabled: false,
      }, { rateLimiter: allowLimiter });
      await expect(inspectAdminUploadIntent(connection.db, actor, batch.intents[0]!.token, new Date(batch.expiresAt.getTime() + 1))).rejects.toThrow(/invalid|expired/i);
      await completeAdminUploadIntent(connection.db, storage, cleanLimitScanner, actor, { token: batch.intents[0]!.token, bytes: exact });
      expect((await connection.db.select().from(uploadIntents).where(eq(uploadIntents.uploadBatchId, batch.batchId)))[0]?.status).toBe("passed");
    } finally { await connection.close(); }
  }, 30_000);

  it("fails closed on scanning and rolls back public release and Asset relations when Audit or association writes fail", async () => {
    const connection = await createTestDatabase();
    const storage = new InMemoryObjectStorage();
    try {
      const [user] = await connection.db.insert(users).values({ email: "rollback-admin@example.test", displayName: "Rollback Admin", role: "admin", passwordHash: "test" }).returning({ id: users.id, role: users.role });
      if (!user) throw new Error("Missing User.");
      const [session] = await connection.db.insert(authSessions).values({ userId: user.id, tokenHash: "rollback-session", expiresAt: new Date(Date.now() + 60_000) }).returning({ id: authSessions.id });
      if (!session) throw new Error("Missing Session.");
      const actor = { userId: user.id, role: user.role, authSessionId: session.id };
      const bytes = await jpegWithSize();
      const infected = new Uint8Array(bytes.byteLength + 40);
      infected.set(bytes);
      infected.set(new TextEncoder().encode("EICAR-STANDARD-ANTIVIRUS-TEST-FILE"), bytes.byteLength);
      const bad = await createAdminUploadBatch(connection.db, actor, {
        files: [{ fileName: "scan-failure.jpg", declaredMimeType: "image/jpeg", declaredByteSize: infected.byteLength }], category: "product", role: "gallery", sortOrder: 0, sourceDeclarationEnabled: false,
      }, { rateLimiter: allowLimiter });
      await expect(completeAdminUploadIntent(connection.db, storage, new DevelopmentFileScanner(), actor, { token: bad.intents[0]!.token, bytes: infected })).rejects.toThrow(/malware/i);
      const failedRecovery = (await connection.db.select().from(uploadRecoveryJobs).where(eq(uploadRecoveryJobs.uploadBatchId, bad.batchId)))[0];
      if (!failedRecovery?.leaseExpiresAt) throw new Error("Missing durable staging Recovery lease.");
      await processPendingUploadRecoveryJobs(connection.db, storage, {
        now: new Date(failedRecovery.leaseExpiresAt.getTime() + 1),
        workerId: "scan-failure-recovery",
      });
      expect((await connection.db.select().from(assetUploadBatches).where(eq(assetUploadBatches.id, bad.batchId)))[0]?.status).toBe("failed");

      const [productA, productB] = await createDraftProducts(connection.db, "upload-product-rollback", 2);
      const batch = await createAdminUploadBatch(connection.db, actor, {
        files: [{ fileName: "rollback.jpg", declaredMimeType: "image/jpeg", declaredByteSize: bytes.byteLength }], category: "product", role: "gallery", sortOrder: 0,
        associationType: "product", associationEntityId: productA!, sourceDeclarationEnabled: false,
      }, { rateLimiter: allowLimiter });
      const assetId = await completeAdminUploadIntent(connection.db, storage, new DevelopmentFileScanner(), actor, { token: batch.intents[0]!.token, bytes });
      const staged = (await connection.db.select().from(assets).where(eq(assets.id, assetId)))[0]!;
      await connection.db.update(products).set({ status: "archived" }).where(eq(products.id, productA!));
      await expect(finalizeAdminUploadBatch(connection.db, storage, actor, batch.batchId)).rejects.toThrow(/unavailable/i);
      expect(storage.objects.has(`public:${staged.objectKey}`)).toBe(false);
      expect((await connection.db.select().from(assets).where(eq(assets.id, assetId)))[0]).toMatchObject({ storagePartition: "private", access: "internal" });
      await connection.db.update(products).set({ status: "draft" }).where(eq(products.id, productA!));
      await expect(finalizeAdminUploadBatch(connection.db, storage, actor, batch.batchId, { auditWriter: failReleasedAudit })).rejects.toThrow("TEST release Audit failure");
      expect((await connection.db.select().from(assets).where(eq(assets.id, assetId)))[0]).toMatchObject({ storagePartition: "private", access: "internal" });
      expect([...storage.objects.keys()].filter((key) => key.startsWith(`public:${staged.objectKey}`))).toEqual([]);
      expect(await connection.db.select().from(productAssets).where(eq(productAssets.assetId, assetId))).toHaveLength(0);

      await finalizeAdminUploadBatch(connection.db, storage, actor, batch.batchId);
      await expect(linkAssetRelation(connection.db, actor, { assetId, associationType: "product", associationEntityId: productB!, role: "gallery", sortOrder: 0 }, { auditWriter: failingAudit })).rejects.toThrow("TEST audit failure");
      expect(await connection.db.select().from(productAssets).where(eq(productAssets.productId, productB!))).toHaveLength(0);
      await linkAssetRelation(connection.db, actor, { assetId, associationType: "product", associationEntityId: productB!, role: "gallery", sortOrder: 0 });
      await expect(unlinkAssetRelation(connection.db, actor, { assetId, associationType: "product", associationEntityId: productB! }, { auditWriter: failingAudit })).rejects.toThrow("TEST audit failure");
      expect(await connection.db.select().from(productAssets).where(eq(productAssets.productId, productB!))).toHaveLength(1);
      await unlinkAssetRelation(connection.db, actor, { assetId, associationType: "product", associationEntityId: productB! });
    } finally { await connection.close(); }
  }, 30_000);

  it("persists compensation before public puts, retries cleanup, recovers leases, and serializes concurrent Finalize", async () => {
    const connection = await createTestDatabase();
    const storage = new FaultInjectingStorage();
    try {
      const [user] = await connection.db.insert(users).values({
        email: "cleanup-admin@example.test",
        displayName: "Cleanup Admin",
        role: "admin",
        passwordHash: "test",
      }).returning({ id: users.id, role: users.role });
      if (!user) throw new Error("Missing User.");
      const [session] = await connection.db.insert(authSessions).values({
        userId: user.id,
        tokenHash: "cleanup-session",
        expiresAt: new Date(Date.now() + 10 * 60_000),
      }).returning({ id: authSessions.id });
      if (!session) throw new Error("Missing Session.");
      const actor: AdminUploadActor = { userId: user.id, role: user.role, authSessionId: session.id };
      const [productId] = await createDraftProducts(connection.db, "cleanup-finalize-product", 1);
      if (!productId) throw new Error("Missing Product.");

      const failed = await stageImageBatch(connection.db, storage, actor, productId, "put-after-persist");
      const failedAsset = (await connection.db.select().from(assets).where(eq(assets.id, failed.assetId)))[0]!;
      storage.throwAfterPublicPutAt = 1;
      storage.failDeleteCount = 1;
      await expect(
        finalizeAdminUploadBatch(connection.db, storage, actor, failed.batch.batchId),
      ).rejects.toThrow(/persisted then failed/);
      expect(storage.objects.has(`public:${failedAsset.objectKey}`)).toBe(true);
      expect((await connection.db.select().from(assets).where(eq(assets.id, failed.assetId)))[0]).toMatchObject({
        storagePartition: "private",
        access: "internal",
      });
      await expect(findPublicAssetForDelivery(connection.db, failed.assetId)).resolves.toBeNull();
      const cleanup = (await connection.db.select().from(objectCleanupJobs).where(and(
        eq(objectCleanupJobs.storagePartition, "public"),
        eq(objectCleanupJobs.objectKey, failedAsset.objectKey),
      )))[0]!;
      expect(cleanup.status).toBe("pending");
      await processPendingObjectCleanupJobs(connection.db, storage, {
        workerId: "retry-worker",
        now: new Date(Date.now() + 2 * 60_000),
      });
      expect(storage.objects.has(`public:${failedAsset.objectKey}`)).toBe(false);
      expect((await connection.db.select().from(objectCleanupJobs).where(eq(objectCleanupJobs.id, cleanup.id)))[0]?.status).toBe("completed");
      expect((await connection.db.select().from(assetUploadBatches).where(eq(assetUploadBatches.id, failed.batch.batchId)))[0]?.status).toBe("failed");

      for (const failureOffset of [2, 3]) {
        const partial = await stageImageBatch(
          connection.db,
          storage,
          actor,
          productId,
          `variant-failure-${failureOffset}`,
        );
        const partialAsset = (await connection.db.select().from(assets).where(eq(assets.id, partial.assetId)))[0]!;
        storage.throwAfterPublicPutAt = storage.publicPublicPutCount + failureOffset;
        await expect(finalizeAdminUploadBatch(
          connection.db,
          storage,
          actor,
          partial.batch.batchId,
        )).rejects.toThrow(/persisted then failed/);
        expect([...storage.objects.keys()].filter((key) => key.startsWith(`public:${partialAsset.objectKey}`))).toEqual([]);
        expect((await connection.db.select().from(assetVariants).where(eq(assetVariants.sourceAssetId, partial.assetId)))).toHaveLength(0);
        expect((await connection.db.select().from(assetUploadBatches).where(eq(assetUploadBatches.id, partial.batch.batchId)))[0]?.status).toBe("failed");
      }

      const leaseKey = "cleanup/lease-recovery.bin";
      storage.objects.set(`public:${leaseKey}`, new Uint8Array([1, 2, 3]));
      const leaseJobId = await registerObjectCleanup(connection.db, {
        storagePartition: "public",
        objectKey: leaseKey,
        reason: "test_lease_recovery",
      });
      const leaseStart = new Date();
      expect(await claimObjectCleanupJob(connection.db, leaseJobId, "crashed-worker", leaseStart, 1_000)).toBeTruthy();
      await expect(processObjectCleanupJob(connection.db, storage, leaseJobId, {
        workerId: "early-worker",
        now: new Date(leaseStart.getTime() + 500),
      })).resolves.toBe("not_claimed");
      await expect(processObjectCleanupJob(connection.db, storage, leaseJobId, {
        workerId: "recovery-worker",
        now: new Date(leaseStart.getTime() + 1_001),
      })).resolves.toBe("completed");
      expect(storage.objects.has(`public:${leaseKey}`)).toBe(false);

      const deadKey = "cleanup/dead-alert.bin";
      storage.objects.set(`public:${deadKey}`, new Uint8Array([4, 5, 6]));
      const deadJobId = await registerObjectCleanup(connection.db, {
        storagePartition: "public",
        objectKey: deadKey,
        reason: "test_dead_alert",
      });
      await connection.db.update(objectCleanupJobs).set({ maxAttempts: 1 }).where(eq(objectCleanupJobs.id, deadJobId));
      storage.failDeleteCount = 1;
      await expect(processObjectCleanupJob(connection.db, storage, deadJobId, {
        workerId: "dead-worker",
      })).resolves.toBe("dead");
      expect((await connection.db.select().from(objectCleanupJobs).where(eq(objectCleanupJobs.id, deadJobId)))[0]?.status).toBe("dead");
      expect(await connection.db.select().from(auditLogs).where(and(
        eq(auditLogs.action, "object_cleanup.dead"),
        eq(auditLogs.entityId, deadJobId),
      ))).toHaveLength(1);

      storage.throwAfterPublicPutAt = null;
      const concurrent = await stageImageBatch(connection.db, storage, actor, productId, "concurrent-finalize");
      const results = await Promise.allSettled([
        finalizeAdminUploadBatch(connection.db, storage, actor, concurrent.batch.batchId),
        finalizeAdminUploadBatch(connection.db, storage, actor, concurrent.batch.batchId),
      ]);
      expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
      expect((await connection.db.select().from(assetUploadBatches).where(eq(assetUploadBatches.id, concurrent.batch.batchId)))[0]?.status).toBe("completed");
      expect(await connection.db.select().from(assetVariants).where(eq(assetVariants.sourceAssetId, concurrent.assetId))).not.toHaveLength(0);
      await expect(finalizeAdminUploadBatch(connection.db, storage, actor, concurrent.batch.batchId)).resolves.toMatchObject({
        success: true,
        batchId: concurrent.batch.batchId,
        assetId: concurrent.assetId,
        alreadyFinalized: true,
      });
    } finally {
      await connection.close();
    }
  }, 30_000);
});
