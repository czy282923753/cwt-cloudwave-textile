import { createHash } from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  applicationLocalizations,
  applications,
  auditLogs,
  authSessions,
  editorialRevisions,
  featureFlags,
  productApplications,
  productAssets,
  productImportBatches,
  productImportItems,
  products,
  productTagAssignments,
  productTags,
  taxonomyTermLocalizations,
  taxonomyTerms,
  users,
} from "@/db/schema";
import { createProductDraft, updateProductStructure } from "@/catalog/product-service";
import { createTestDatabase } from "@/test/database";
import { InMemoryObjectStorage } from "@/test/in-memory-storage";
import {
  completeAdminUploadIntent,
  createAdminUploadBatch,
  finalizeAdminUploadBatch,
  type AdminUploadActor,
} from "@/uploads/admin-upload-service";
import { DevelopmentFileScanner } from "@/uploads/scanner";

import { applyProductImportBatch, retryProductImportErrors } from "./service";

const allowLimiter = { consume: async () => true };

type NormalizedUpdate = {
  productCode: string;
  targetProductId: string;
  applicationIds?: string[];
  tags?: string[];
  media?: Array<{
    sourceKey: string;
    assetId: string;
    role: "hero" | "gallery" | "detail" | "application";
    sortOrder: number;
    altText: string | null;
    caption: string | null;
  }>;
};

function pendingStructure(snapshot: unknown): Record<string, unknown> {
  const root = snapshot as { kind?: unknown; pendingChanges?: unknown[] };
  const changes = root.kind === "editorial_blocks" ? root.pendingChanges ?? [] : [root];
  const structure = changes.find((change) => (change as { kind?: unknown }).kind === "structure");
  if (!structure) throw new Error("Synthetic fixture expected one pending structure change.");
  return structure as Record<string, unknown>;
}

function structureSha256(structure: Record<string, unknown>): string {
  const canonicalJson = (value: unknown): string => {
    if (Array.isArray(value)) return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
        .join(",")}}`;
    }
    return JSON.stringify(value);
  };
  return createHash("sha256").update(canonicalJson(structure)).digest("hex");
}

describe("Published Product Import structure concurrency", () => {
  it("merges different fields and additive media, and makes same-field conflicts retryable", async () => {
    const connection = await createTestDatabase();
    const storage = new InMemoryObjectStorage();
    try {
      const [user] = await connection.db.insert(users).values({
        email: "stage3-published-concurrency@example.test",
        displayName: "Synthetic Published Concurrency Editor",
        role: "product_editor",
        passwordHash: "test",
      }).returning({ id: users.id, role: users.role });
      const [session] = await connection.db.insert(authSessions).values({
        userId: user!.id,
        tokenHash: "stage3-published-concurrency-session",
        expiresAt: new Date(Date.now() + 120_000),
      }).returning({ id: authSessions.id });
      await connection.db.insert(featureFlags).values({
        key: "product_import",
        enabled: true,
        updatedByUserId: user!.id,
      }).onConflictDoUpdate({ target: featureFlags.key, set: { enabled: true } });
      const actor: AdminUploadActor = {
        userId: user!.id,
        role: user!.role,
        authSessionId: session!.id,
      };
      const productActor = { userId: user!.id, role: user!.role } as const;

      const [category] = await connection.db.insert(taxonomyTerms).values({
        internalKey: "synthetic-published-concurrency",
        dimension: "structure_construction",
        productCodePrefix: "CONCUR",
      }).returning({ id: taxonomyTerms.id });
      await connection.db.insert(taxonomyTermLocalizations).values({
        taxonomyTermId: category!.id,
        locale: "en",
        name: "Synthetic Published Concurrency",
      });
      const applicationRows = await connection.db.insert(applications).values([
        { internalKey: "synthetic-concurrency-base", createdByUserId: user!.id },
        { internalKey: "synthetic-concurrency-next", createdByUserId: user!.id },
      ]).returning({ id: applications.id });
      await connection.db.insert(applicationLocalizations).values([
        { applicationId: applicationRows[0]!.id, locale: "en", name: "Synthetic Base Application" },
        { applicationId: applicationRows[1]!.id, locale: "en", name: "Synthetic Next Application" },
      ]);

      const imageBytes = await Promise.all(["teal", "orange", "purple"].map(async (background) =>
        new Uint8Array(await sharp({
          create: { width: 32, height: 24, channels: 3, background },
        }).webp().toBuffer()),
      ));
      const upload = await createAdminUploadBatch(connection.db, actor, {
        files: imageBytes.map((bytes, index) => ({
          fileName: `CWT-CONCUR-001-${index + 1}.webp`,
          declaredMimeType: "image/webp",
          declaredByteSize: bytes.byteLength,
        })),
        category: "product",
        role: "gallery",
        sortOrder: 0,
        associationType: null,
        associationEntityId: null,
        sourceDeclarationEnabled: false,
      }, { rateLimiter: allowLimiter });
      const assetIds: string[] = [];
      for (const [index, bytes] of imageBytes.entries()) {
        assetIds.push(await completeAdminUploadIntent(
          connection.db,
          storage,
          new DevelopmentFileScanner(),
          actor,
          { token: upload.intents[index]!.token, bytes },
          { rateLimiter: allowLimiter },
        ));
      }
      await finalizeAdminUploadBatch(connection.db, storage, actor, upload.batchId, {
        rateLimiter: allowLimiter,
      });

      const productId = await createProductDraft(connection.db, productActor, {
        name: "Synthetic Published Concurrency Product",
        primaryTaxonomyTermId: category!.id,
        assetIds: [assetIds[0]!],
        productCode: "CWT-CONCUR-001",
      });
      await updateProductStructure(connection.db, productActor, productId, {
        primaryTaxonomyTermId: category!.id,
        additionalTaxonomyTermIds: [],
        applicationIds: [applicationRows[0]!.id],
        tagNames: ["Synthetic Base Tag"],
        assetIds: [assetIds[0]!],
        heroAssetId: assetIds[0]!,
        media: [{
          assetId: assetIds[0]!,
          role: "hero",
          sortOrder: 0,
          altText: "Synthetic approved hero",
          caption: null,
          isVisible: true,
        }],
        features: ["Synthetic preserved feature"],
        faqs: [{ question: "Synthetic preserved question?", answer: "Synthetic preserved answer." }],
        colorOptionsDisplay: "show",
        customAvailableDisplay: "hide",
        sampleAvailableDisplay: "show",
        moqNoteDisplay: "inherit",
      });
      await connection.db.update(products).set({
        status: "published",
        publishedAt: new Date(),
      }).where(eq(products.id, productId));

      let fingerprintIndex = 0;
      const createBatch = async (normalizedData: NormalizedUpdate) => {
        fingerprintIndex += 1;
        const [batch] = await connection.db.insert(productImportBatches).values({
          createdByUserId: user!.id,
          authSessionId: session!.id,
          mode: "update",
          sourceFingerprint: fingerprintIndex.toString(16).padStart(64, "0"),
          status: "validated",
          validatedAt: new Date(),
        }).returning({ id: productImportBatches.id });
        const [item] = await connection.db.insert(productImportItems).values({
          batchId: batch!.id,
          kind: "row",
          sourceKey: "row:002",
          rowNumber: 2,
          status: "valid",
          rawData: { productCode: normalizedData.productCode },
          normalizedData,
        }).returning({ id: productImportItems.id });
        return { batchId: batch!.id, itemId: item!.id };
      };

      const applicationBatch = await createBatch({
        productCode: "CWT-CONCUR-001",
        targetProductId: productId,
        applicationIds: [applicationRows[1]!.id],
      });
      const tagBatch = await createBatch({
        productCode: "CWT-CONCUR-001",
        targetProductId: productId,
        tags: ["Synthetic Concurrent Tag"],
      });
      await Promise.all([
        applyProductImportBatch(connection.db, actor, applicationBatch.batchId),
        applyProductImportBatch(connection.db, actor, tagBatch.batchId),
      ]);
      let fieldItems = await connection.db.select().from(productImportItems).where(inArray(
        productImportItems.id,
        [applicationBatch.itemId, tagBatch.itemId],
      ));
      for (const item of fieldItems.filter((entry) => entry.status === "error")) {
        expect(item).toMatchObject({ errorCode: "product_revision_conflict" });
        await retryProductImportErrors(connection.db, actor, item.batchId);
        await applyProductImportBatch(connection.db, actor, item.batchId);
      }
      fieldItems = await connection.db.select().from(productImportItems).where(inArray(
        productImportItems.id,
        [applicationBatch.itemId, tagBatch.itemId],
      ));
      expect(fieldItems.map((item) => item.status)).toEqual(["applied", "applied"]);

      const mediaBatches = await Promise.all(assetIds.slice(1).map((assetId, index) => createBatch({
        productCode: "CWT-CONCUR-001",
        targetProductId: productId,
        media: [{
          sourceKey: `m_concurrent_${index}`,
          assetId,
          role: "hero",
          sortOrder: 0,
          altText: `Synthetic concurrent image ${index + 1}`,
          caption: null,
        }],
      })));
      await Promise.all(mediaBatches.map((batch) =>
        applyProductImportBatch(connection.db, actor, batch.batchId),
      ));
      const mediaItems = await connection.db.select().from(productImportItems).where(inArray(
        productImportItems.id,
        mediaBatches.map((batch) => batch.itemId),
      ));
      expect(mediaItems.map((item) => item.status)).toEqual(["applied", "applied"]);

      const sameFieldA = await createBatch({
        productCode: "CWT-CONCUR-001",
        targetProductId: productId,
        tags: ["Synthetic Same Field A"],
      });
      const sameFieldB = await createBatch({
        productCode: "CWT-CONCUR-001",
        targetProductId: productId,
        tags: ["Synthetic Same Field B"],
      });
      await Promise.all([
        applyProductImportBatch(connection.db, actor, sameFieldA.batchId),
        applyProductImportBatch(connection.db, actor, sameFieldB.batchId),
      ]);
      let sameFieldItems = await connection.db.select().from(productImportItems).where(inArray(
        productImportItems.id,
        [sameFieldA.itemId, sameFieldB.itemId],
      ));
      const conflicted = sameFieldItems.find((item) => item.status === "error");
      if (conflicted) {
        expect(conflicted.errorCode).toBe("product_revision_conflict");
        await retryProductImportErrors(connection.db, actor, conflicted.batchId);
        await applyProductImportBatch(connection.db, actor, conflicted.batchId);
        sameFieldItems = await connection.db.select().from(productImportItems).where(inArray(
          productImportItems.id,
          [sameFieldA.itemId, sameFieldB.itemId],
        ));
      }
      expect(sameFieldItems.map((item) => item.status)).toEqual(["applied", "applied"]);

      const [revision] = await connection.db.select().from(editorialRevisions).where(and(
        eq(editorialRevisions.entityType, "product"),
        eq(editorialRevisions.entityId, productId),
        eq(editorialRevisions.status, "draft"),
      ));
      expect(revision).toBeDefined();
      const structure = pendingStructure(revision!.snapshot);
      expect(structure.applicationIds).toEqual([applicationRows[1]!.id]);
      expect(structure.tagNames).toEqual(expect.arrayContaining([
        expect.stringMatching(/^Synthetic Same Field [AB]$/),
      ]));
      expect(JSON.stringify(structure)).toContain("Synthetic preserved feature");
      expect(JSON.stringify(structure)).toContain("Synthetic preserved question?");
      const revisionMedia = structure.media as Array<{
        assetId: string;
        role: string;
        sortOrder: number;
      }>;
      expect(revisionMedia.filter((entry) => assetIds.slice(1).includes(entry.assetId))).toEqual(
        expect.arrayContaining(assetIds.slice(1).map((assetId) => expect.objectContaining({
          assetId,
          role: "gallery",
        }))),
      );
      expect(new Set(revisionMedia.map((entry) => entry.assetId)).size).toBe(3);
      const concurrentOrders = revisionMedia
        .filter((entry) => assetIds.slice(1).includes(entry.assetId))
        .map((entry) => entry.sortOrder)
        .sort((left, right) => left - right);
      expect(concurrentOrders).toEqual([0, 1]);

      for (const item of mediaItems) {
        const normalized = item.normalizedData as NormalizedUpdate;
        const placement = revisionMedia.find((entry) => entry.assetId === normalized.media![0]!.assetId);
        expect(normalized.media![0]).toMatchObject({
          role: placement!.role,
          sortOrder: placement!.sortOrder,
        });
      }
      const appliedAudits = await connection.db.select().from(auditLogs).where(and(
        eq(auditLogs.action, "product_import.item_applied"),
        inArray(auditLogs.entityId, [
          applicationBatch.itemId,
          tagBatch.itemId,
          ...mediaBatches.map((batch) => batch.itemId),
          sameFieldA.itemId,
          sameFieldB.itemId,
        ]),
      ));
      expect(appliedAudits).toHaveLength(6);
      expect(appliedAudits.every((audit) => {
        const summary = audit.afterSummary as { revisionId?: unknown; structureSha256?: unknown };
        return summary.revisionId === revision!.id &&
          typeof summary.structureSha256 === "string" &&
          summary.structureSha256.length === 64;
      })).toBe(true);
      const revisionAudits = await connection.db.select().from(auditLogs).where(and(
        inArray(auditLogs.action, ["product.draft.created", "product.draft.saved"]),
        eq(auditLogs.entityId, revision!.id),
      ));
      expect(revisionAudits.some((audit) =>
        (audit.afterSummary as { structureSha256?: unknown }).structureSha256 === structureSha256(structure),
      )).toBe(true);

      expect(await connection.db.select().from(productApplications).where(eq(productApplications.productId, productId)))
        .toMatchObject([{ applicationId: applicationRows[0]!.id }]);
      const approvedTags = await connection.db.select({ name: productTags.name }).from(productTagAssignments)
        .innerJoin(productTags, eq(productTags.id, productTagAssignments.tagId))
        .where(eq(productTagAssignments.productId, productId));
      expect(approvedTags.map((tag) => tag.name)).toEqual(["Synthetic Base Tag"]);
      expect(await connection.db.select().from(productAssets).where(eq(productAssets.productId, productId)))
        .toHaveLength(1);
    } finally {
      await connection.close();
    }
  });
});
