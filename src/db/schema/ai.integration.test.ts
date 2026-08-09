import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  aiModelConfig,
  aiRuns,
  productLocalizations,
  productTaxonomyTerms,
  products,
  taxonomyTerms,
  users,
} from "@/db/schema";
import { migrateDatabase } from "@/db/migrate";
import { createTestDatabase } from "@/test/database";

const hash = (character: string) => character.repeat(64);

describe("Stage 4A AI foundation schema", () => {
  it("migrates fresh and enforces the approved scope, uniqueness, Checks, and RESTRICT provenance", async () => {
    const connection = await createTestDatabase();
    try {
      await migrateDatabase(connection);
      const [actor] = await connection.db
        .insert(users)
        .values({
          email: "ai-foundation-schema@example.test",
          displayName: "Synthetic AI Schema Actor",
          role: "product_editor",
          passwordHash: "test",
        })
        .returning({ id: users.id });
      const [primaryCategory] = await connection.db
        .insert(taxonomyTerms)
        .values({
          internalKey: "synthetic-ai-schema-primary-term",
          dimension: "material_fiber",
        })
        .returning({ id: taxonomyTerms.id });
      let productId = "";
      await connection.db.transaction(async (transaction) => {
        const [product] = await transaction
          .insert(products)
          .values({ createdByUserId: actor!.id })
          .returning({ id: products.id });
        productId = product!.id;
        await transaction.insert(productLocalizations).values({
          productId,
          locale: "en",
          name: "Synthetic AI Schema Product",
        });
        await transaction.insert(productTaxonomyTerms).values({
          productId,
          taxonomyTermId: primaryCategory!.id,
          isPrimary: true,
        });
      });
      const [modelConfig] = await connection.db
        .insert(aiModelConfig)
        .values({
          useCase: "product_description_draft",
          provider: "deepseek",
          model: "deepseek-v4-flash",
          promptId: "product-description-draft",
          promptVersion: 1,
          promptHash: hash("a"),
          enabled: true,
          isDefault: true,
          createdByUserId: actor!.id,
          updatedByUserId: actor!.id,
        })
        .returning({ id: aiModelConfig.id });

      const baseRun: typeof aiRuns.$inferInsert = {
        useCase: "product_description_draft",
        requestedByUserId: actor!.id,
        idempotencyKey: randomUUID(),
        requestFingerprint: hash("b"),
        targetType: "product_draft",
        targetProductId: productId,
        targetLocale: "en",
        expectedTargetVersion: 1,
        targetSnapshotHash: hash("c"),
        modelConfigId: modelConfig!.id,
        modelConfigVersion: 1,
        resolvedConfigHash: hash("d"),
        requestedProvider: "deepseek",
        requestedModel: "deepseek-v4-flash",
        parametersSnapshotJson: {},
        maxInputTokens: 16000,
        maxOutputTokens: 4000,
        maxAttempts: 3,
        promptId: "product-description-draft",
        promptVersion: 1,
        promptHash: hash("e"),
        providerEnvelopeVersion: 1,
        providerEnvelopeHash: hash("f"),
        inputSchemaVersion: 1,
        outputSchemaVersion: 1,
        policyVersion: "stage4a-v1",
        inputContextJson: { product: { name: "Synthetic AI Schema Product" } },
        inputHash: hash("0"),
        executionEnvironment: "test",
        budgetPolicyVersion: "nonbillable-v1",
        runCostLimitMicrousd: 20000,
        dailyHardLimitMicrousd: 0,
        monthlyWarningLimitMicrousd: 0,
        monthlyHardLimitMicrousd: 0,
        estimatedMaxCostMicrousd: 0,
        pricingSnapshotJson: {},
      };

      const [run] = await connection.db
        .insert(aiRuns)
        .values(baseRun)
        .returning({ id: aiRuns.id });
      expect(run?.id).toBeTruthy();

      await expect(
        connection.db.insert(aiModelConfig).values({
          useCase: "product_description_draft",
          provider: "deepseek",
          model: "deepseek-v4-flash",
          promptId: "product-description-draft",
          promptVersion: 2,
          promptHash: hash("1"),
          enabled: true,
          isDefault: true,
          createdByUserId: actor!.id,
          updatedByUserId: actor!.id,
        }),
      ).rejects.toThrow();

      await expect(
        connection.db.insert(aiModelConfig).values({
          useCase: "seo_content_draft",
          provider: "deepseek",
          model: "deepseek-v4-flash",
          promptId: "seo-content-draft",
          promptVersion: 1,
          promptHash: hash("2"),
          fallbackConfigId: modelConfig!.id,
          createdByUserId: actor!.id,
          updatedByUserId: actor!.id,
        }),
      ).rejects.toThrow();

      await expect(connection.db.insert(aiRuns).values(baseRun)).rejects.toThrow();
      await expect(
        connection.db.insert(aiRuns).values({
          ...baseRun,
          idempotencyKey: randomUUID(),
          executionEnvironment: "production",
        }),
      ).rejects.toThrow();
      await expect(
        connection.db.insert(aiRuns).values({
          ...baseRun,
          idempotencyKey: randomUUID(),
          candidateJson: { description: "Synthetic candidate" },
          candidateHash: hash("3"),
        }),
      ).rejects.toThrow();
      await expect(
        connection.db.insert(aiRuns).values({
          ...baseRun,
          idempotencyKey: randomUUID(),
          retryState: "scheduled",
          failureCode: "synthetic_retry",
        }),
      ).rejects.toThrow();

      const claimAt = new Date();
      const leaseToken = randomUUID();
      await connection.db
        .update(aiRuns)
        .set({
          status: "processing",
          attemptCount: 1,
          nextAttemptAt: null,
          leaseOwner: "synthetic-worker",
          leaseToken,
          leaseAcquiredAt: claimAt,
          leaseExpiresAt: new Date(claimAt.getTime() + 60_000),
          stateVersion: 2,
          budgetChargeDay: "2026-08-10",
          budgetChargeMonth: "2026-08-01",
          costAccountingState: "reserved",
          updatedAt: claimAt,
        })
        .where(eq(aiRuns.id, run!.id));
      await expect(
        connection.db.update(aiRuns).set({ stateVersion: 0 }).where(eq(aiRuns.id, run!.id)),
      ).rejects.toThrow();

      const cancellationAt = new Date(claimAt.getTime() + 1_000);
      await connection.db
        .update(aiRuns)
        .set({
          status: "cancelled",
          leaseOwner: null,
          leaseToken: null,
          leaseAcquiredAt: null,
          leaseExpiresAt: null,
          stateVersion: 3,
          cancelledLeaseToken: leaseToken,
          cancelledByUserId: actor!.id,
          cancellationReason: "Synthetic cancellation fence verification",
          cancelledAt: cancellationAt,
          completedAt: cancellationAt,
          costAccountingState: "final",
          updatedAt: cancellationAt,
        })
        .where(eq(aiRuns.id, run!.id));
      await expect(
        connection.db
          .update(aiRuns)
          .set({
            candidateJson: { description: "Forbidden post-cancellation candidate" },
            candidateHash: hash("4"),
          })
          .where(eq(aiRuns.id, run!.id)),
      ).rejects.toThrow();

      await expect(
        connection.db.delete(aiModelConfig).where(eq(aiModelConfig.id, modelConfig!.id)),
      ).rejects.toThrow();
      await expect(connection.db.delete(products).where(eq(products.id, productId))).rejects.toThrow();
      await expect(connection.db.delete(users).where(eq(users.id, actor!.id))).rejects.toThrow();
    } finally {
      await connection.close();
    }
  });
});
