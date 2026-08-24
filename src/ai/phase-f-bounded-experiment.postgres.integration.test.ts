import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { and, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import sharp from "sharp";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createPhaseCDurableDraftAssistanceServiceV1 } from "@/ai/applications/draft-assistance/composition";
import type { DraftAssistanceCommandV1, ProductionAiUseCase } from "@/ai/applications/draft-assistance/contracts";
import { createAiModelConfigServiceV1 } from "@/ai/config/model-config-service";
import { draftOutputDefinitionV1 } from "@/ai/output/registry";
import { createTextProviderRegistryV1 } from "@/ai/providers/registry";
import { productionPromptLoaderV1 } from "@/ai/prompts/loader";
import { createPricingPolicyRegistryV1 } from "@/ai/runs/pricing-policy";
import { createProductDraft } from "@/catalog/product-service";
import { createContentDraft } from "@/content/content-service";
import { setFeatureFlag } from "@/settings/feature-flag-service";
import type { DatabaseConnection, PostgresAppDatabase } from "@/db/client";
import { migrateDatabase } from "@/db/migrate";
import {
  aiModelConfig,
  aiRuns,
  auditLogs,
  assets,
  authors,
  contentLocalizations,
  contents,
  editorialRevisions,
  featureFlags,
  productLocalizations,
  productTaxonomyTerms,
  products,
  routes,
  seoMetadata,
  taxonomyTerms,
  users,
} from "@/db/schema";
import * as schema from "@/db/schema";
import {
  createDeepSeekTextProviderV1,
  DEEPSEEK_TEXT_MODEL_ALIAS_V1,
  DEEPSEEK_TEXT_PROVIDER_KEY_V1,
} from "@/integrations/ai/providers/deepseek-text-adapter";
import { InMemoryObjectStorage } from "@/test/in-memory-storage";
import { DevelopmentFileScanner } from "@/uploads/scanner";
import { uploadAsset } from "@/uploads/service";

const postgresUrl = process.env.CWT_PHASE_F_POSTGRES_URL;
const exercisePath = "scripts/phase-f-bounded-exercise.ts";
const bootstrapPath = "scripts/phase-f-bounded-bootstrap.ts";
const adminPassword = "synthetic-phase-f-admin-password";
const historicalPricingAt = new Date("2026-08-13T00:00:00.000Z");
const localPricingSnapshot = {
  version: 1 as const,
  currency: "USD" as const,
  billing_unit_tokens: 1_000_000 as const,
  input_microusd_per_unit: 140_000,
  output_microusd_per_unit: 280_000,
  formula: "ceil-separate-v1" as const,
  source_id: "phase-f-local-fake",
  source_version: "synthetic-v1",
  effective_from: "2026-01-01T00:00:00.000Z",
  observed_at: "2026-08-24T00:00:00.000Z",
};

const useCases = [
  "product_description_draft",
  "seo_content_draft",
  "fabric_knowledge_draft",
  "sourcing_guide_draft",
] as const;

async function withDatabase<T>(operation: (db: PostgresAppDatabase, client: Sql) => Promise<T>): Promise<T> {
  if (postgresUrl === undefined) throw new Error("Phase F PostgreSQL URL is absent.");
  const client = postgres(postgresUrl, { max: 6, prepare: false, onnotice: () => undefined });
  try {
    return await operation(drizzle(client, { schema }), client);
  } finally {
    await client.end();
  }
}

async function truncateExerciseState(): Promise<void> {
  await withDatabase(async (db) => {
    await db.execute(sql`
      truncate table
        ${aiRuns}, ${aiModelConfig}, ${auditLogs}, ${featureFlags}, ${assets},
        ${contentLocalizations}, ${contents}, ${authors}, ${editorialRevisions},
        ${productLocalizations}, ${productTaxonomyTerms}, ${products}, ${taxonomyTerms}, ${users}
        , ${seoMetadata}, ${routes}
      cascade
    `);
  });
}

function spawnExecutable(path: string, argumentsList: readonly string[], environment: Record<string, string>): ReturnType<typeof spawnSync> {
  return spawnSync(process.execPath, ["--import=tsx", path, ...argumentsList], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      NODE_OPTIONS: environment.NODE_OPTIONS ?? "--conditions=react-server",
      APP_ENV: environment.APP_ENV,
      FEATURE_AI: environment.FEATURE_AI,
      DATABASE_DRIVER: "postgres",
      DATABASE_URL: postgresUrl ?? "",
      DEV_ADMIN_PASSWORD: adminPassword,
      ...environment,
    },
    timeout: 30_000,
  });
}

function withoutMutationTimestamp<T extends { readonly updatedAt: unknown }>(rows: readonly T[]) {
  return rows.map(({ updatedAt, ...state }) => {
    void updatedAt;
    return state;
  });
}

function processOutput(value: string | Buffer | null): string {
  return typeof value === "string" ? value : value?.toString("utf8") ?? "";
}

function isDispatchedAttempt(value: unknown): boolean {
  return typeof value === "object" && value !== null && Reflect.get(value, "dispatch_state") === "dispatched";
}

function bootstrap(): ReturnType<typeof spawnSync> {
  return spawnExecutable(bootstrapPath, [], {
    APP_ENV: "staging",
    FEATURE_AI: "false",
  });
}

function command(input: {
  readonly useCase: ProductionAiUseCase;
  readonly actorId: string;
  readonly targetId: string;
  readonly idempotencyKey: string;
}): DraftAssistanceCommandV1 {
  const target = input.useCase === "product_description_draft" || input.useCase === "seo_content_draft"
    ? { type: "product_draft" as const, productId: input.targetId, locale: "en" as const, expectedVersion: 1 }
    : { type: "content_draft" as const, contentId: input.targetId, locale: "en" as const, expectedVersion: 1 };
  const task = input.useCase === "product_description_draft"
    ? { kind: input.useCase, tone: "concise_professional_b2b" as const, selectedMediaPlacementIds: [] }
    : input.useCase === "seo_content_draft"
      ? { kind: input.useCase, tone: "concise_professional_b2b" as const, pageIntent: "Synthetic English B2B fabric draft page", selectedInternalLinkIds: [] }
      : input.useCase === "fabric_knowledge_draft"
        ? { kind: input.useCase, tone: "neutral_editorial" as const, topic: "Synthetic fabric knowledge exercise" }
        : { kind: input.useCase, tone: "concise_professional_b2b" as const, guideIntent: "Synthetic sourcing guide exercise" };
  const explicitInput = input.useCase === "product_description_draft"
    ? "SYNTHETIC TEST DATA FOR LOCAL PHASE F EXERCISE ONLY — draft an English product description from the supplied synthetic target text; omit unknown specifications and do not change routes, publishing, or indexing"
    : input.useCase === "seo_content_draft"
      ? "SYNTHETIC TEST DATA FOR LOCAL PHASE F EXERCISE ONLY — propose an English SEO title and meta description from the supplied synthetic target text; do not change slugs, routes, publishing, or indexing"
      : input.useCase === "fabric_knowledge_draft"
        ? "SYNTHETIC TEST DATA FOR LOCAL PHASE F EXERCISE ONLY — draft neutral English fabric knowledge from this supplied synthetic brief; omit every unknown detail"
        : "SYNTHETIC TEST DATA FOR LOCAL PHASE F EXERCISE ONLY — draft a concise English sourcing guide from this supplied synthetic brief; omit supply chain and company claims";
  return {
    useCase: input.useCase,
    task,
    actor: { userId: input.actorId, role: "admin" },
    target,
    idempotencyKey: input.idempotencyKey,
    contextSelections: [{ sourceClass: "explicit_human_input", origin: "typed_brief" }],
    explicitInput,
  };
}

function fakeProviderPreload(): string {
  const pricingPolicyUrl = pathToFileURL(resolve(process.cwd(), "src/ai/runs/pricing-policy.ts")).href;
  const fakePricingModule = `
    import { createPricingPolicyRegistryV1 } from ${JSON.stringify(pricingPolicyUrl)};
    export function createDeepSeekPricingPolicyRegistryV1() {
      const result = createPricingPolicyRegistryV1([{
        provider: "deepseek",
        model: "deepseek-v4-flash",
        snapshot: ${JSON.stringify(localPricingSnapshot)},
      }]);
      if (!result.ok) throw new Error("Local Phase F pricing fake is invalid");
      return result.value;
    }
  `;
  const source = String.raw`
    const { registerHooks } = await import("node:module");
    registerHooks({
      resolve(specifier, context, nextResolve) {
        if (specifier === "@/integrations/ai/providers/deepseek-pricing") {
          return { url: "phase-f-fake:pricing", shortCircuit: true };
        }
        return nextResolve(specifier, context);
      },
      load(url, context, nextLoad) {
        if (url === "phase-f-fake:pricing") {
          return { format: "module", source: ${JSON.stringify(fakePricingModule)}, shortCircuit: true };
        }
        return nextLoad(url, context);
      },
    });
    let callCount = 0;
    globalThis.fetch = async (_url, init) => {
      callCount += 1;
      if (callCount > 4) throw new Error("Synthetic Provider fifth call refused");
      const request = JSON.parse(String(init.body));
      const instructions = String(request.messages[0].content);
      const evidence = (text) => ({ text, sourceRefs: ["src_01:text"] });
      let output;
      if (instructions.includes('"product_description_draft"')) output = {
        schemaVersion: 1, useCase: "product_description_draft", locale: "en",
        summaryProposal: evidence("Synthetic Product description proposal."),
        descriptionBlocks: [], featureProposals: [], faqProposals: [], mediaTextProposals: [],
      };
      else if (instructions.includes('"seo_content_draft"')) output = {
        schemaVersion: 1, useCase: "seo_content_draft", locale: "en",
        titleProposal: evidence("Synthetic SEO title"),
        metaDescriptionProposal: evidence("Synthetic SEO description."),
        outline: [], blocks: [], internalLinkSuggestions: [],
      };
      else if (instructions.includes('"fabric_knowledge_draft"')) output = {
        schemaVersion: 1, useCase: "fabric_knowledge_draft", locale: "en",
        titleProposal: evidence("Synthetic Fabric Knowledge"), outline: [], blocks: [],
      };
      else if (instructions.includes('"sourcing_guide_draft"')) output = {
        schemaVersion: 1, useCase: "sourcing_guide_draft", locale: "en",
        titleProposal: evidence("Synthetic Sourcing Guide"), outline: [], blocks: [],
      };
      else throw new Error("Synthetic Provider received unknown Prompt");
      return new Response(JSON.stringify({
        id: "synthetic_phase_f_" + callCount,
        object: "chat.completion",
        created: 1786579200,
        model: "deepseek-v4-flash",
        choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: JSON.stringify(output) } }],
        usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30, prompt_cache_hit_tokens: 0, prompt_cache_miss_tokens: 20 },
      }), { status: 200, headers: { "content-type": "application/json" } });
    };
  `;
  return `--conditions=react-server --import=tsx --import=data:text/javascript,${encodeURIComponent(source)}`;
}

function exerciseArguments(input: {
  readonly actorId: string;
  readonly productDescriptionId: string;
  readonly seoId: string;
  readonly fabricId: string;
  readonly sourcingId: string;
  readonly idempotencyKeys: readonly [string, string, string, string];
  readonly start: string;
  readonly exclusiveEnd: string;
}): string[] {
  return [
    "--actor-id", input.actorId,
    "--window-start", input.start,
    "--window-exclusive-end", input.exclusiveEnd,
    "--product-description-target-id", input.productDescriptionId,
    "--product-description-target-version", "1",
    "--product-description-idempotency-key", input.idempotencyKeys[0],
    "--seo-target-id", input.seoId,
    "--seo-target-version", "1",
    "--seo-idempotency-key", input.idempotencyKeys[1],
    "--fabric-knowledge-target-id", input.fabricId,
    "--fabric-knowledge-target-version", "1",
    "--fabric-knowledge-idempotency-key", input.idempotencyKeys[2],
    "--sourcing-guide-target-id", input.sourcingId,
    "--sourcing-guide-target-version", "1",
    "--sourcing-guide-idempotency-key", input.idempotencyKeys[3],
  ];
}

describe.skipIf(postgresUrl === undefined)("Phase F bounded experiment PostgreSQL proofs", () => {
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

  it("rolls the private bootstrap and both required Audits back atomically", async () => {
    await truncateExerciseState();
    await withDatabase(async (db) => {
      await db.execute(sql`
        create or replace function phase_f_reject_feature_audit() returns trigger language plpgsql as $$
        begin
          if new.action = 'feature_flag.created' then raise exception 'synthetic required Audit failure'; end if;
          return new;
        end $$
      `);
      await db.execute(sql`
        create trigger phase_f_reject_feature_audit before insert on audit_logs
        for each row execute function phase_f_reject_feature_audit()
      `);
    });
    const failed = bootstrap();
    expect(failed.status).toBe(1);
    expect(processOutput(failed.stderr)).toMatch(/Required Audit log write failed|synthetic required Audit failure/u);
    await withDatabase(async (db) => {
      expect(await db.select().from(users)).toHaveLength(0);
      expect(await db.select().from(featureFlags)).toHaveLength(0);
      expect(await db.select().from(auditLogs)).toHaveLength(0);
      await db.execute(sql`drop trigger phase_f_reject_feature_audit on audit_logs`);
      await db.execute(sql`drop function phase_f_reject_feature_audit()`);
    });
  });

  it("rejects before-start and exact-exclusive-end windows with zero run or enqueue Audit", async () => {
    await truncateExerciseState();
    const created = bootstrap();
    expect(created.status, processOutput(created.stderr)).toBe(0);
    const fixture = await withDatabase(async (db) => {
      const actor = (await db.select().from(users))[0];
      if (actor === undefined) throw new Error("Bootstrap actor missing.");
      return { actorId: actor.id };
    });
    const ids = [randomUUID(), randomUUID(), randomUUID(), randomUUID()] as const;
    const targets = [randomUUID(), randomUUID(), randomUUID(), randomUUID()] as const;
    const beforeStart = exerciseArguments({
      actorId: fixture.actorId,
      productDescriptionId: targets[0], seoId: targets[1], fabricId: targets[2], sourcingId: targets[3],
      idempotencyKeys: ids,
      start: "2099-01-01T00:00:00.000Z",
      exclusiveEnd: "2099-01-01T00:05:00.000Z",
    });
    const before = spawnExecutable(exercisePath, beforeStart, { APP_ENV: "staging", FEATURE_AI: "true" });
    expect(before.status).toBe(1);
    expect(processOutput(before.stderr)).toContain("invalid, inactive, or has insufficient remaining time");
    const observed = await withDatabase(async (db) => (await db.execute<{ readonly value: Date | string }>(sql`select statement_timestamp() as value`))[0]?.value);
    if (observed === undefined) throw new Error("PostgreSQL time observation missing.");
    const observedInstant = observed instanceof Date ? observed : new Date(observed);
    const end = observedInstant.toISOString();
    const start = new Date(observedInstant.getTime() - 60_000).toISOString();
    const atEnd = spawnExecutable(exercisePath, exerciseArguments({
      actorId: fixture.actorId,
      productDescriptionId: targets[0], seoId: targets[1], fabricId: targets[2], sourcingId: targets[3],
      idempotencyKeys: ids,
      start,
      exclusiveEnd: end,
    }), { APP_ENV: "staging", FEATURE_AI: "true" });
    expect(atEnd.status).toBe(1);
    await withDatabase(async (db) => {
      expect(await db.select().from(aiRuns)).toHaveLength(0);
      expect(await db.select().from(auditLogs).where(eq(auditLogs.action, "ai.run.enqueued"))).toHaveLength(0);
    });
  });

  it("runs the single four-case fake-Provider composition and applies only audited Draft changes", async () => {
    await truncateExerciseState();
    const created = bootstrap();
    expect(created.status, processOutput(created.stderr)).toBe(0);

    const fixture = await withDatabase(async (db) => {
      const actor = (await db.select().from(users))[0];
      const flag = (await db.select().from(featureFlags).where(eq(featureFlags.key, "ai")))[0];
      if (actor === undefined || flag === undefined) throw new Error("Governed bootstrap evidence missing.");
      const [author] = await db.insert(authors).values({
        internalKey: "synthetic-phase-f-author",
        displayName: "Synthetic Phase F Author — NOT CWT DATA",
      }).returning({ id: authors.id });
      const [category] = await db.insert(taxonomyTerms).values({
        internalKey: "synthetic-phase-f-category",
        dimension: "material_fiber",
      }).returning({ id: taxonomyTerms.id });
      if (author === undefined || category === undefined) throw new Error("Synthetic materialization failed.");
      const imageBytes = await sharp({
        create: { width: 32, height: 24, channels: 3, background: { r: 30, g: 70, b: 120 } },
      }).jpeg().toBuffer();
      const assetId = await uploadAsset(db, new InMemoryObjectStorage(), new DevelopmentFileScanner(), {
        fileName: "synthetic-phase-f-product.jpg",
        declaredMimeType: "image/jpeg",
        bytes: imageBytes,
        category: "product",
        purpose: "public_asset",
        uploadedByUserId: actor.id,
      });
      const productIds: string[] = [];
      for (const name of ["Synthetic Phase F Product Description Target", "Synthetic Phase F SEO Target"]) {
        productIds.push(await createProductDraft(db, { userId: actor.id, role: "admin" }, {
          name,
          primaryTaxonomyTermId: category.id,
          assetIds: [assetId],
        }));
      }
      const fabricId = await createContentDraft(db, { userId: actor.id, role: "admin" }, {
        channel: "fabric_knowledge",
        type: "guide",
        authorId: author.id,
        title: "Synthetic Phase F Fabric Target",
        body: "Synthetic local Phase F fabric editorial paragraph",
      });
      const sourcingId = await createContentDraft(db, { userId: actor.id, role: "admin" }, {
        channel: "china_sourcing_guide",
        type: "guide",
        authorId: author.id,
        title: "Synthetic Phase F Sourcing Target",
        body: "Synthetic local Phase F sourcing editorial paragraph",
      });

      const providers = createTextProviderRegistryV1([createDeepSeekTextProviderV1({
        fetchImplementation: async () => { throw new Error("Parent proof must not call Provider."); },
        credentialReader: () => undefined,
      })]);
      const pricing = createPricingPolicyRegistryV1([{
        provider: DEEPSEEK_TEXT_PROVIDER_KEY_V1,
        model: DEEPSEEK_TEXT_MODEL_ALIAS_V1,
        snapshot: localPricingSnapshot,
      }]);
      if (!providers.ok || !pricing.ok) throw new Error("Local fake configuration registries failed.");
      const contracts = useCases.map((useCase) => {
        const output = draftOutputDefinitionV1(useCase);
        if (output === undefined) throw new Error("Production output contract missing.");
        return { useCase, inputSchemaVersion: 1, outputSchemaVersion: output.schemaVersion, policyVersion: output.policyVersion };
      });
      const configService = createAiModelConfigServiceV1(db, {
        contracts,
        providerRegistry: providers.value,
        promptLoader: productionPromptLoaderV1,
        pricingRegistry: pricing.value,
      });
      const configIds: string[] = [];
      for (const contract of contracts) {
        const output = draftOutputDefinitionV1(contract.useCase)!;
        const promptId = contract.useCase.replaceAll("_", "-");
        const prompt = productionPromptLoaderV1.load({
          promptId,
          promptVersion: 1,
          promptHash: {
            product_description_draft: "0aefaeb2dba08c76587f6501451dc0031b6f825ab3bb903be00f28dda5e0b198",
            seo_content_draft: "91f8868efad16310a5ed26c85a6001024572949c59725efe2b6c0df935499195",
            fabric_knowledge_draft: "b3b65d50e9ea0d5f5da2e0dca25d808463a47fbf59a7dfcb9b71b64823501a8c",
            sourcing_guide_draft: "e4aaf2e39483bde7569edb529f1c1d213b0a11d68ac4a9b99075992620238adf",
          }[contract.useCase],
          applicationClass: "draft_assistance",
          capability: "text",
          useCase: contract.useCase,
          inputSchemaVersion: 1,
          outputSchemaVersion: output.schemaVersion,
          policyVersion: output.policyVersion,
        });
        if (!prompt.ok) throw new Error(`Prompt ${contract.useCase} failed.`);
        const config = await configService.create({
          actor: { userId: actor.id, role: "admin" },
          useCase: contract.useCase,
          provider: DEEPSEEK_TEXT_PROVIDER_KEY_V1,
          model: DEEPSEEK_TEXT_MODEL_ALIAS_V1,
          parameters: { temperature: 0 },
          maxInputTokens: 16_000,
          maxOutputTokens: 200,
          maxAttempts: 1,
          runCostLimitMicrousd: 20_000,
          promptId,
          promptVersion: 1,
          promptHash: prompt.value.tuple.promptHash,
        });
        if (!config.ok) throw new Error(`Config ${contract.useCase} create failed: ${config.error.code}.`);
        const activated = await configService.activateDefault({
          actor: { userId: actor.id, role: "admin" },
          useCase: contract.useCase,
          selectedConfigId: config.value.id,
          expectedRecordVersions: { [config.value.id]: config.value.recordVersion },
        });
        if (!activated.ok) throw new Error(`Config ${contract.useCase} activation failed.`);
        configIds.push(config.value.id);
      }
      await db.update(aiModelConfig).set({ createdAt: historicalPricingAt, updatedAt: historicalPricingAt })
        .where(inArray(aiModelConfig.id, configIds));
      await setFeatureFlag(db, { userId: actor.id, role: "admin" }, flag.id, true);

      const targets = {
        productDescription: productIds[0]!,
        seo: productIds[1]!,
        fabric: fabricId,
        sourcing: sourcingId,
      };
      const webDenied = createPhaseCDurableDraftAssistanceServiceV1({
        database: db,
        trustedEnvironment: { appEnvironment: "staging", processFeatureAiEnabled: true },
        providerRegistry: providers.value,
        promptLoader: productionPromptLoaderV1,
        pricingRegistry: pricing.value,
      });
      const denial = await webDenied.requestDraftAssistance(command({
        useCase: "product_description_draft",
        actorId: actor.id,
        targetId: targets.productDescription,
        idempotencyKey: randomUUID(),
      }));
      expect(denial).toMatchObject({ ok: false, error: { code: "environment_not_authorized" } });
      expect(await db.select().from(aiRuns)).toHaveLength(0);
      return { actor, flag, targets, configIds, providers: providers.value, pricing: pricing.value };
    });

    const observed = await withDatabase(async (db) => (await db.execute<{ readonly value: Date | string }>(sql`select statement_timestamp() as value`))[0]?.value);
    if (observed === undefined) throw new Error("Combined proof time observation missing.");
    const observedInstant = observed instanceof Date ? observed : new Date(observed);
    const ids = [randomUUID(), randomUUID(), randomUUID(), randomUUID()] as const;
    const argumentsList = exerciseArguments({
      actorId: fixture.actor.id,
      productDescriptionId: fixture.targets.productDescription,
      seoId: fixture.targets.seo,
      fabricId: fixture.targets.fabric,
      sourcingId: fixture.targets.sourcing,
      idempotencyKeys: ids,
      start: new Date(observedInstant.getTime() - 30_000).toISOString(),
      exclusiveEnd: new Date(observedInstant.getTime() + 5 * 60_000).toISOString(),
    });
    const executed = spawnExecutable(exercisePath, argumentsList, {
      APP_ENV: "staging",
      FEATURE_AI: "true",
      DEEPSEEK_API_KEY: "synthetic-test-credential-never-sent",
      NODE_OPTIONS: fakeProviderPreload(),
    });
    expect(executed.status, processOutput(executed.stderr)).toBe(0);
    expect(JSON.parse(processOutput(executed.stdout))).toMatchObject({ status: "draft_ready", runCount: 4, publish: false, index: false });

    await withDatabase(async (db) => {
      const rows = await db.select().from(aiRuns);
      expect(rows).toHaveLength(4);
      expect(new Set(rows.map((row) => row.useCase)).size).toBe(4);
      expect(rows.every((row) => row.status === "draft_ready" && row.attemptCount === 1 && row.maxAttempts === 1 &&
        row.runCostLimitMicrousd <= 20_000 && row.budgetReservedCostMicrousd === 0 && row.candidateJson !== null)).toBe(true);
      expect(rows.reduce((total, row) => total + row.runCostLimitMicrousd, 0)).toBeLessThanOrEqual(80_000);
      expect(await db.select().from(auditLogs).where(eq(auditLogs.action, "ai.run.enqueued"))).toHaveLength(4);
      expect(rows.flatMap((row) => row.attemptHistoryJson).filter(isDispatchedAttempt)).toHaveLength(4);

      const beforeProducts = await db.select().from(products).where(inArray(products.id, [fixture.targets.productDescription, fixture.targets.seo]));
      const beforeContents = await db.select().from(contents).where(inArray(contents.id, [fixture.targets.fabric, fixture.targets.sourcing]));
      await setFeatureFlag(db, { userId: fixture.actor.id, role: "admin" }, fixture.flag.id, false);
      const configService = createAiModelConfigServiceV1(db, {
        contracts: useCases.map((useCase) => {
          const output = draftOutputDefinitionV1(useCase)!;
          return { useCase, inputSchemaVersion: 1, outputSchemaVersion: output.schemaVersion, policyVersion: output.policyVersion };
        }),
        providerRegistry: fixture.providers,
        promptLoader: productionPromptLoaderV1,
        pricingRegistry: fixture.pricing,
      });
      for (const config of await db.select().from(aiModelConfig).where(inArray(aiModelConfig.id, fixture.configIds))) {
        const disabled = await configService.disable({
          actor: { userId: fixture.actor.id, role: "admin" },
          id: config.id,
          expectedRecordVersion: config.recordVersion,
        });
        expect(disabled.ok).toBe(true);
      }

      const service = createPhaseCDurableDraftAssistanceServiceV1({
        database: db,
        trustedEnvironment: { appEnvironment: "test", processFeatureAiEnabled: false },
        providerRegistry: fixture.providers,
        promptLoader: productionPromptLoaderV1,
        pricingRegistry: fixture.pricing,
      });
      for (const row of rows) {
        const read = await service.readRun({ runId: row.id, actor: { userId: fixture.actor.id, role: "admin" } });
        if (!read.ok || read.value.reviewProjection === null || read.value.candidateHash === null) {
          throw new Error(`Protected projection ${row.useCase} missing.`);
        }
        const projection = read.value.reviewProjection;
        const proposalNodes = [
          ...projection.proposal.nodes,
          ...(projection.proposal.seo?.title === undefined ? [] : [projection.proposal.seo.title]),
          ...(projection.proposal.seo?.metaDescription === undefined ? [] : [projection.proposal.seo.metaDescription]),
        ];
        const decisions = proposalNodes.filter((node) => node.editable && !node.previewOnly).map((node) => ({
          candidatePath: node.path,
          decision: "accepted" as const,
        }));
        expect(decisions.length).toBeGreaterThan(0);
        const applied = await service.applyDraftAssistanceCandidate({
          actor: { userId: fixture.actor.id, role: "admin" },
          command: {
            runId: row.id,
            expectedRunStateVersion: read.value.stateVersion,
            candidateHash: read.value.candidateHash,
            expectedTargetVersion: projection.target.draftVersion,
            expectedRevisionId: projection.target.revisionId,
            expectedRevisionDraftVersion: projection.target.revisionId === null ? null : projection.target.draftVersion,
            decisions,
            qualityRating: 5,
            qualityLabels: [],
            qualityComment: "Synthetic Phase F local composition proof.",
          },
        });
        expect(applied.ok, JSON.stringify(applied)).toBe(true);
      }
      expect(await db.select().from(auditLogs).where(eq(auditLogs.action, "ai.run.candidate_applied"))).toHaveLength(4);
      expect(withoutMutationTimestamp(await db.select().from(products)
        .where(inArray(products.id, [fixture.targets.productDescription, fixture.targets.seo]))))
        .toEqual(withoutMutationTimestamp(beforeProducts));
      expect(withoutMutationTimestamp(await db.select().from(contents)
        .where(inArray(contents.id, [fixture.targets.fabric, fixture.targets.sourcing]))))
        .toEqual(withoutMutationTimestamp(beforeContents));
      expect(await db.select().from(aiRuns).where(and(eq(aiRuns.status, "pending"), inArray(aiRuns.idempotencyKey, ids))))
        .toHaveLength(0);
    });
  }, 30_000);
});
