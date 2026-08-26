import { spawnSync } from "node:child_process";

import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";

import { createProductDraft } from "@/catalog/product-service";
import type { DatabaseConnection, PostgresAppDatabase } from "@/db/client";
import { migrateDatabase } from "@/db/migrate";
import {
  aiModelConfig,
  aiRuns,
  assets,
  auditLogs,
  featureFlags,
  productLocalizations,
  products,
  taxonomyTermLocalizations,
  taxonomyTerms,
  users,
} from "@/db/schema";
import * as schema from "@/db/schema";
import { setFeatureFlag } from "@/settings/feature-flag-service";
import { InMemoryObjectStorage } from "@/test/in-memory-storage";
import { DevelopmentFileScanner } from "@/uploads/scanner";
import { uploadAsset } from "@/uploads/service";

const postgresUrl = process.env.CWT_PHASE_F_POSTGRES_URL;
const bootstrapPath = "scripts/phase-f-bounded-bootstrap.ts";
const diagnosticPath = "scripts/phase-f-m6-one-case-diagnostic.ts";
const adminPassword = "synthetic-phase-f-admin-password";
const fixedIdempotency = "702a422b-4bee-4130-bd8b-8f39c6e90528";

async function withDatabase<T>(operation: (db: PostgresAppDatabase, client: Sql) => Promise<T>): Promise<T> {
  if (postgresUrl === undefined) throw new Error("K1 PostgreSQL URL is absent.");
  const client = postgres(postgresUrl, { max: 6, prepare: false, onnotice: () => undefined });
  try {
    return await operation(drizzle(client, { schema }), client);
  } finally {
    await client.end();
  }
}

function output(value: string | Buffer | null): string {
  return typeof value === "string" ? value : value?.toString("utf8") ?? "";
}

function spawnExecutable(path: string, nodeOptions = "--conditions=react-server"): ReturnType<typeof spawnSync> {
  return spawnSync(process.execPath, ["--import=tsx", path], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      NODE_OPTIONS: nodeOptions,
      APP_ENV: path === bootstrapPath ? "staging" : "staging",
      FEATURE_AI: path === bootstrapPath ? "false" : "true",
      DATABASE_DRIVER: "postgres",
      DATABASE_URL: postgresUrl ?? "",
      DEV_ADMIN_PASSWORD: adminPassword,
      DEEPSEEK_API_KEY: path === diagnosticPath ? "synthetic-local-fake-provider-only" : "",
    },
    timeout: 30_000,
  });
}

function fakeProviderPreload(kind: "valid" | "usage_shape"): string {
  const source = String.raw`
    let callCount = 0;
    globalThis.fetch = async (_url, init) => {
      callCount += 1;
      if (callCount !== 1) throw new Error("K1 fake Provider refused a second call");
      const request = JSON.parse(String(init.body));
      if (!String(request.messages[0].content).includes('"product_description_draft"')) throw new Error("K1 Prompt identity drifted");
      const response = {
        id: "synthetic_k1_response",
        object: "chat.completion",
        model: "deepseek-v4-flash",
        system_fingerprint: "synthetic_k1_fp",
        choices: [{ index: 0, finish_reason: "stop", logprobs: null, message: { role: "assistant", reasoning_content: null, tool_calls: null, content: JSON.stringify({
          schemaVersion: 1,
          useCase: "product_description_draft",
          locale: "en",
          summaryProposal: { text: "SYNTHETIC TEST DATA FOR LOCAL PHASE F EXERCISE ONLY", sourceRefs: ["src_01:text"] },
          descriptionBlocks: [], featureProposals: [], faqProposals: [], mediaTextProposals: [],
        }) } }],
        usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30, prompt_cache_hit_tokens: 0, prompt_cache_miss_tokens: 20, completion_tokens_details: { reasoning_tokens: 0 } },
      };
      if (${JSON.stringify(kind)} === "usage_shape") response.usage = {};
      return new Response(JSON.stringify(response), { status: 200, headers: { "content-type": "application/json" } });
    };
  `;
  return `--conditions=react-server --import=tsx --import=data:text/javascript,${encodeURIComponent(source)}`;
}

async function reset(): Promise<void> {
  await withDatabase(async (db) => {
    await db.execute(sql`truncate table users, taxonomy_terms, assets cascade`);
  });
}

async function bootstrapAndMaterialize(): Promise<{ readonly actorId: string; readonly productId: string }> {
  const bootstrapped = spawnExecutable(bootstrapPath);
  expect(bootstrapped.status, output(bootstrapped.stderr)).toBe(0);
  const safe = JSON.parse(output(bootstrapped.stdout)) as { readonly actorId: string };
  return withDatabase(async (db) => {
    const actor = (await db.select().from(users).where(eq(users.id, safe.actorId)))[0];
    const flag = (await db.select().from(featureFlags).where(eq(featureFlags.key, "ai")))[0];
    if (actor === undefined || flag === undefined) throw new Error("K1 bootstrap evidence missing.");
    const [category] = await db.insert(taxonomyTerms).values({
      internalKey: "synthetic_phase_f_m6_k1_product",
      dimension: "material_fiber",
      isActive: true,
    }).returning({ id: taxonomyTerms.id });
    if (category === undefined) throw new Error("K1 category insert failed.");
    await db.insert(taxonomyTermLocalizations).values({
      taxonomyTermId: category.id,
      locale: "en",
      name: "Synthetic M6 K1 Product Category — NOT CWT DATA",
    });
    const image = await sharp({ create: { width: 64, height: 48, channels: 3, background: { r: 36, g: 76, b: 126 } } }).jpeg().toBuffer();
    const assetId = await uploadAsset(db, new InMemoryObjectStorage(), new DevelopmentFileScanner(), {
      fileName: "synthetic-m6-k1-product.jpg",
      declaredMimeType: "image/jpeg",
      bytes: image,
      category: "product",
      purpose: "public_asset",
      uploadedByUserId: actor.id,
    });
    const productId = await createProductDraft(db, { userId: actor.id, role: "admin" }, {
      name: "Synthetic M6 K1 Product Description Diagnostic Target — NOT CWT DATA",
      primaryTaxonomyTermId: category.id,
      assetIds: [assetId],
    });
    await setFeatureFlag(db, { userId: actor.id, role: "admin" }, flag.id, true);
    return { actorId: actor.id, productId };
  });
}

describe.skipIf(postgresUrl === undefined)("Phase F M6 one-case diagnostic PostgreSQL proof", () => {
  beforeAll(async () => {
    if (postgresUrl === undefined) return;
    await withDatabase(async (db) => {
      const connection: DatabaseConnection = {
        kind: "postgres",
        db,
        createMigrationClient: () => postgres(postgresUrl, { max: 1, prepare: false, onnotice: () => undefined }),
        close: async () => undefined,
      };
      await migrateDatabase(connection);
    });
  }, 30_000);

  it("makes one fake call and persists one complete draft-ready row without Product/public mutation", async () => {
    await reset();
    const fixture = await bootstrapAndMaterialize();
    const before = await withDatabase(async (db) => ({
      product: await db.select().from(products),
      localization: await db.select().from(productLocalizations),
      assets: await db.select().from(assets),
    }));
    const executed = spawnExecutable(diagnosticPath, fakeProviderPreload("valid"));
    expect(executed.status, output(executed.stderr)).toBe(0);
    expect(JSON.parse(output(executed.stdout))).toMatchObject({ status: "draft_ready", attemptCount: 1, publish: false, index: false });
    await withDatabase(async (db) => {
      const rows = await db.select().from(aiRuns);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        useCase: "product_description_draft",
        targetType: "product_draft",
        targetProductId: fixture.productId,
        targetLocale: "en",
        expectedTargetVersion: 1,
        idempotencyKey: fixedIdempotency,
        status: "draft_ready",
        attemptCount: 1,
        maxAttempts: 1,
        runCostLimitMicrousd: 20_000,
        estimatedMaxCostMicrousd: 7_304,
        actualCostComplete: true,
        budgetReservedCostMicrousd: 0,
        costAccountingState: "final",
        humanDisposition: "not_evaluated",
        appliedTargetVersion: null,
        appliedRevisionId: null,
      });
      expect(rows[0]?.candidateJson).not.toBeNull();
      expect(await db.select().from(auditLogs).where(eq(auditLogs.action, "ai.run.enqueued"))).toHaveLength(1);
      expect(await db.select().from(auditLogs).where(eq(auditLogs.action, "ai.run.candidate_applied"))).toHaveLength(0);
      expect(await db.select().from(products)).toEqual(before.product);
      expect(await db.select().from(productLocalizations)).toEqual(before.localization);
      expect(await db.select().from(assets)).toEqual(before.assets);
    });
    const reentry = spawnExecutable(diagnosticPath, fakeProviderPreload("valid"));
    expect(reentry.status).toBe(1);
    expect(output(reentry.stdout)).toBe("");
    expect(output(reentry.stderr)).toContain("preflight rejected nonexact or previously used state");
    await withDatabase(async (db) => expect(await db.select().from(aiRuns)).toHaveLength(1));
  }, 30_000);

  it("retains the sanitized adapter predicate with null usage, incomplete cost and no candidate", async () => {
    await reset();
    await bootstrapAndMaterialize();
    const executed = spawnExecutable(diagnosticPath, fakeProviderPreload("usage_shape"));
    expect(executed.status, output(executed.stderr)).toBe(0);
    expect(JSON.parse(output(executed.stdout))).toMatchObject({ status: "failed", attemptCount: 1, publish: false, index: false });
    await withDatabase(async (db) => {
      const rows = await db.select().from(aiRuns);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        status: "failed",
        attemptCount: 1,
        providerResponseStatus: "invalid_response",
        providerErrorCode: "cwt_response_usage_shape",
        failureCode: "output_schema_invalid",
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        actualCostMicrousd: 0,
        actualCostComplete: false,
        budgetAccountedCostMicrousd: 7_304,
        budgetReservedCostMicrousd: 0,
        candidateJson: null,
      });
      expect(await db.select().from(auditLogs).where(eq(auditLogs.action, "ai.run.candidate_applied"))).toHaveLength(0);
      expect(await db.select().from(aiModelConfig).where(eq(aiModelConfig.useCase, "product_description_draft"))).toHaveLength(1);
    });
  }, 30_000);
});
