import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { withReadOnlyDraftAvailabilityScope } from "@/ai/applications/draft-assistance/read-scopes";
import { aiModelConfigRepositoryV1 } from "@/ai/config/model-config-repository";
import { aiModelConfig, users } from "@/db/schema";
import { createTestDatabase } from "@/test/database";

describe("single-snapshot ai_model_config repository", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  const userId = "11111111-1111-4111-8111-111111111111";
  const disabledDefaultId = "22222222-2222-4222-8222-222222222222";
  const enabledDefaultId = "33333333-3333-4333-8333-333333333333";

  beforeAll(async () => {
    database = await createTestDatabase();
    await database.db.insert(users).values({
      id: userId,
      email: "synthetic-ai-config@example.invalid",
      displayName: "SYNTHETIC TEST DATA — NOT A CWT FACT",
      role: "admin",
      passwordHash: "synthetic-not-a-password-hash",
    });
    await database.db.insert(aiModelConfig).values([
      {
        id: disabledDefaultId,
        useCase: "product_description_draft",
        provider: "deepseek",
        model: "deepseek-v4-flash",
        parametersJson: {},
        promptId: "product-description-draft",
        promptVersion: 1,
        promptHash: "a".repeat(64),
        enabled: false,
        isDefault: true,
        createdByUserId: userId,
        updatedByUserId: userId,
      },
      ...[enabledDefaultId,
        "44444444-4444-4444-8444-444444444444",
        "55555555-5555-4555-8555-555555555555"].map((id) => ({
          id,
          useCase: "product_description_draft" as const,
          provider: "deepseek",
          model: "deepseek-v4-flash",
          parametersJson: {},
          promptId: "product-description-draft",
          promptVersion: 1,
          promptHash: "a".repeat(64),
          enabled: true,
          isDefault: false,
          createdByUserId: userId,
          updatedByUserId: userId,
        })),
    ]);
  });

  afterAll(async () => database.close());

  async function read() {
    return withReadOnlyDraftAvailabilityScope(database.db, (scope) =>
      aiModelConfigRepositoryV1.readResolutionState(scope, {
        applicationClass: "draft_assistance",
        capability: "text",
        useCase: "product_description_draft",
      })
    );
  }

  it("returns complete counts and no row for a disabled default", async () => {
    const result = await read();
    expect(result).toMatchObject({
      ok: true,
      value: {
        totalRowCount: 4,
        defaultRowCount: 1,
        enabledDefaultRowCount: 0,
        enabledDefaultRows: [],
      },
    });
  });

  it("returns the exact enabled default and all 21 decoded fields after switch", async () => {
    await database.db.transaction(async (transaction) => {
      await transaction.update(aiModelConfig).set({ isDefault: false })
        .where(eq(aiModelConfig.id, disabledDefaultId));
      await transaction.update(aiModelConfig).set({ isDefault: true })
        .where(eq(aiModelConfig.id, enabledDefaultId));
    });
    const result = await read();
    expect(result).toMatchObject({
      ok: true,
      value: {
        totalRowCount: 4,
        defaultRowCount: 1,
        enabledDefaultRowCount: 1,
        enabledDefaultRows: [{
          id: enabledDefaultId,
          capability: "text",
          useCase: "product_description_draft",
          enabled: true,
          isDefault: true,
          fallbackConfigId: null,
          recordVersion: 1,
        }],
      },
    });
    if (result.ok) expect(Object.keys(result.value.enabledDefaultRows[0] ?? {})).toHaveLength(21);
  });
});
