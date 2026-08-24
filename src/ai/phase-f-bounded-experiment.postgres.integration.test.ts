import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";

import { and, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import sharp from "sharp";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createPhaseCDurableDraftAssistanceServiceV1 } from "@/ai/applications/draft-assistance/composition";
import type { DraftAssistanceCommandV1, ProductionAiUseCase } from "@/ai/applications/draft-assistance/contracts";
import { createTextProviderRegistryV1 } from "@/ai/providers/registry";
import { productionPromptLoaderV1 } from "@/ai/prompts/loader";
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
import { createDeepSeekPricingPolicyRegistryV1 } from "@/integrations/ai/providers/deepseek-pricing";
import { createDeepSeekTextProviderV1 } from "@/integrations/ai/providers/deepseek-text-adapter";
import { InMemoryObjectStorage } from "@/test/in-memory-storage";
import { DevelopmentFileScanner } from "@/uploads/scanner";
import { uploadAsset } from "@/uploads/service";

const postgresUrl = process.env.CWT_PHASE_F_POSTGRES_URL;
const exercisePath = "scripts/phase-f-bounded-exercise.ts";
const bootstrapPath = "scripts/phase-f-bounded-bootstrap.ts";
const adminPassword = "synthetic-phase-f-admin-password";

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

function processOutput(value: string | Buffer | null): string {
  return typeof value === "string" ? value : value?.toString("utf8") ?? "";
}

function isDispatchedAttempt(value: unknown): boolean {
  return typeof value === "object" && value !== null && Reflect.get(value, "dispatch_state") === "dispatched";
}

function bootstrap(environment: Record<string, string> = {}): ReturnType<typeof spawnSync> {
  return spawnExecutable(bootstrapPath, [], {
    APP_ENV: "staging",
    FEATURE_AI: "false",
    ...environment,
  });
}

function bootstrapResult(value: ReturnType<typeof spawnSync>): {
  readonly status: "bootstrapped";
  readonly classification: "SYNTHETIC_TEST_DATA_NOT_CWT_FACT";
  readonly actorId: string;
  readonly featureAiEnabled: false;
  readonly configs: readonly {
    readonly useCase: ProductionAiUseCase;
    readonly id: string;
    readonly recordVersion: number;
  }[];
} {
  if (value.status !== 0) throw new Error(`Bootstrap failed: ${processOutput(value.stderr)}`);
  return JSON.parse(processOutput(value.stdout));
}

function bootstrapFaultPreload(fault: "missing_contract" | "prompt" | "provider" | "pricing_stale"): string {
  const replacement = fault === "missing_contract"
    ? {
      specifier: "@/ai/output/registry",
      source: "export function draftOutputDefinitionV1() { return undefined; }",
    }
    : fault === "prompt"
      ? {
        specifier: "@/ai/prompts/loader",
        source: "export const productionPromptLoaderV1 = { load() { return { ok: false, error: { code: 'prompt_not_found' } }; } };",
      }
      : fault === "provider"
        ? {
          specifier: "@/integrations/ai/providers/deepseek-text-adapter",
          source: `
            export const DEEPSEEK_TEXT_PROVIDER_KEY_V1 = "deepseek";
            export const DEEPSEEK_TEXT_MODEL_ALIAS_V1 = "deepseek-v4-flash";
            export function createDeepSeekTextProviderV1() {
              return { key: "deepseek", capability: "text", resolveConfiguration() {
                return { ok: false, error: { code: "model_unsupported" } };
              } };
            }
          `,
        }
        : {
          specifier: "@/integrations/ai/providers/deepseek-pricing",
          source: `export function createDeepSeekPricingPolicyRegistryV1() {
            return { keys: ["deepseek\\u0000deepseek-v4-flash"], resolve() {
              return { ok: false, error: { code: "pricing_stale" } };
            } };
          }`,
        };
  const preload = String.raw`
    const { registerHooks } = await import("node:module");
    registerHooks({
      resolve(specifier, context, nextResolve) {
        if (specifier === ${JSON.stringify(replacement.specifier)}) {
          return { url: "phase-f-bootstrap-fault:module", shortCircuit: true };
        }
        return nextResolve(specifier, context);
      },
      load(url, context, nextLoad) {
        if (url === "phase-f-bootstrap-fault:module") {
          return { format: "module", source: ${JSON.stringify(replacement.source)}, shortCircuit: true };
        }
        return nextLoad(url, context);
      },
    });
  `;
  return `--conditions=react-server --import=tsx --import=data:text/javascript,${encodeURIComponent(preload)}`;
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
  const source = String.raw`
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

  it("bootstraps exactly four governed active defaults while feature AI remains disabled", async () => {
    await truncateExerciseState();
    const created = bootstrap();
    const output = bootstrapResult(created);
    expect(output).toMatchObject({
      status: "bootstrapped",
      classification: "SYNTHETIC_TEST_DATA_NOT_CWT_FACT",
      featureAiEnabled: false,
    });
    expect(output.configs).toHaveLength(4);
    expect(new Set(output.configs.map((config) => config.id)).size).toBe(4);
    expect(output.configs.map((config) => config.useCase)).toEqual(useCases);
    expect(output.configs.every((config) => config.recordVersion === 2)).toBe(true);
    expect(processOutput(created.stdout)).not.toMatch(/password|credential|authorization|promptBody|source_content/iu);

    await withDatabase(async (db) => {
      const actors = await db.select().from(users);
      const flags = await db.select().from(featureFlags);
      const configs = await db.select().from(aiModelConfig);
      const runs = await db.select().from(aiRuns);
      const audits = await db.select().from(auditLogs);
      expect(actors).toHaveLength(1);
      expect(actors[0]).toMatchObject({ id: output.actorId, role: "admin", isActive: true });
      expect(flags).toHaveLength(1);
      expect(flags[0]).toMatchObject({ key: "ai", enabled: false });
      expect(configs).toHaveLength(4);
      expect(runs).toHaveLength(0);
      for (const expected of [
        ["product_description_draft", "product-description-draft", "0aefaeb2dba08c76587f6501451dc0031b6f825ab3bb903be00f28dda5e0b198"],
        ["seo_content_draft", "seo-content-draft", "91f8868efad16310a5ed26c85a6001024572949c59725efe2b6c0df935499195"],
        ["fabric_knowledge_draft", "fabric-knowledge-draft", "b3b65d50e9ea0d5f5da2e0dca25d808463a47fbf59a7dfcb9b71b64823501a8c"],
        ["sourcing_guide_draft", "sourcing-guide-draft", "e4aaf2e39483bde7569edb529f1c1d213b0a11d68ac4a9b99075992620238adf"],
      ] as const) {
        const config = configs.find((candidate) => candidate.useCase === expected[0]);
        expect(config).toMatchObject({
          capability: "text",
          provider: "deepseek",
          model: "deepseek-v4-flash",
          parametersJson: { temperature: 0 },
          maxInputTokens: 16_000,
          maxOutputTokens: 200,
          maxAttempts: 1,
          runCostLimitMicrousd: 20_000,
          promptId: expected[1],
          promptVersion: 1,
          promptHash: expected[2],
          enabled: true,
          isDefault: true,
          fallbackConfigId: null,
          recordVersion: 2,
          createdByUserId: output.actorId,
          updatedByUserId: output.actorId,
        });
        expect(audits.filter((audit) => audit.entityId === config?.id &&
          audit.action === "ai.model_config.created")).toHaveLength(1);
        expect(audits.filter((audit) => audit.entityId === config?.id &&
          audit.action === "ai.model_config.activation_changed")).toHaveLength(1);
      }
      expect(audits).toHaveLength(10);
      expect(audits.filter((audit) => audit.action === "feature_flag.created")).toHaveLength(1);
      expect(audits.filter((audit) => audit.action === "auth.phase_f_staging_bootstrapped")).toHaveLength(1);
    });
  });

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
      expect(await db.select().from(aiModelConfig)).toHaveLength(0);
      expect(await db.select().from(aiRuns)).toHaveLength(0);
      expect(await db.select().from(auditLogs)).toHaveLength(0);
      await db.execute(sql`drop trigger phase_f_reject_feature_audit on audit_logs`);
      await db.execute(sql`drop function phase_f_reject_feature_audit()`);
    });
  });

  it("fails closed without success output for fixed contract, Prompt, Provider and stale-pricing faults", async () => {
    for (const fault of ["missing_contract", "prompt", "provider", "pricing_stale"] as const) {
      await truncateExerciseState();
      const failed = bootstrap({ NODE_OPTIONS: bootstrapFaultPreload(fault) });
      expect(failed.status).toBe(1);
      expect(processOutput(failed.stdout)).toBe("");
      await withDatabase(async (db) => {
        expect(await db.select().from(users)).toHaveLength(1);
        expect(await db.select().from(featureFlags)).toHaveLength(1);
        expect(await db.select().from(aiModelConfig)).toHaveLength(0);
        expect(await db.select().from(aiRuns)).toHaveLength(0);
        expect(await db.select().from(auditLogs)).toHaveLength(2);
      });
    }
  });

  it("fails closed for a config mutation, required Audit or unexpected record version", async () => {
    for (const target of ["config", "audit", "version"] as const) {
      await truncateExerciseState();
      await withDatabase(async (db) => {
        if (target === "config") {
          await db.execute(sql`
            create or replace function phase_f_reject_config_insert() returns trigger language plpgsql as $$
            begin raise exception 'synthetic config mutation failure'; end $$
          `);
          await db.execute(sql`
            create trigger phase_f_reject_config_insert before insert on ai_model_config
            for each row execute function phase_f_reject_config_insert()
          `);
        } else if (target === "audit") {
          await db.execute(sql`
            create or replace function phase_f_reject_config_audit() returns trigger language plpgsql as $$
            begin
              if new.action = 'ai.model_config.created' then raise exception 'synthetic config Audit failure'; end if;
              return new;
            end $$
          `);
          await db.execute(sql`
            create trigger phase_f_reject_config_audit before insert on audit_logs
            for each row execute function phase_f_reject_config_audit()
          `);
        } else {
          await db.execute(sql`
            create or replace function phase_f_unexpected_config_version() returns trigger language plpgsql as $$
            begin new.record_version := 3; return new; end $$
          `);
          await db.execute(sql`
            create trigger phase_f_unexpected_config_version before update on ai_model_config
            for each row execute function phase_f_unexpected_config_version()
          `);
        }
      });
      const failed = bootstrap();
      expect(failed.status).toBe(1);
      expect(processOutput(failed.stdout)).toBe("");
      await withDatabase(async (db) => {
        expect(await db.select().from(users)).toHaveLength(1);
        expect(await db.select().from(featureFlags)).toHaveLength(1);
        expect(await db.select().from(aiModelConfig)).toHaveLength(target === "version" ? 1 : 0);
        expect(await db.select().from(aiRuns)).toHaveLength(0);
        expect(await db.select().from(auditLogs)).toHaveLength(target === "version" ? 4 : 2);
        if (target === "config") {
          await db.execute(sql`drop trigger phase_f_reject_config_insert on ai_model_config`);
          await db.execute(sql`drop function phase_f_reject_config_insert()`);
        } else if (target === "audit") {
          await db.execute(sql`drop trigger phase_f_reject_config_audit on audit_logs`);
          await db.execute(sql`drop function phase_f_reject_config_audit()`);
        } else {
          await db.execute(sql`drop trigger phase_f_unexpected_config_version on ai_model_config`);
          await db.execute(sql`drop function phase_f_unexpected_config_version()`);
        }
      });
    }
  });

  it("rejects wrong environment, concurrent topology and a nonempty rerun without success JSON", async () => {
    await truncateExerciseState();
    const wrongEnvironment = bootstrap({ APP_ENV: "test" });
    expect(wrongEnvironment.status).toBe(1);
    expect(processOutput(wrongEnvironment.stdout)).toBe("");
    await withDatabase(async (db) => {
      expect(await db.select().from(users)).toHaveLength(0);
    });

    const otherClient = postgres(postgresUrl!, { max: 1, prepare: false, onnotice: () => undefined });
    try {
      await otherClient`select 1`;
      const concurrent = bootstrap();
      expect(concurrent.status).toBe(1);
      expect(processOutput(concurrent.stdout)).toBe("");
      expect(processOutput(concurrent.stderr)).toContain("non-isolated or concurrent-writer topology");
    } finally {
      await otherClient.end();
    }

    const first = bootstrapResult(bootstrap());
    expect(first.configs).toHaveLength(4);
    const rerun = bootstrap();
    expect(rerun.status).toBe(1);
    expect(processOutput(rerun.stdout)).toBe("");
    expect(processOutput(rerun.stderr)).toContain("fresh disposable database");
    await withDatabase(async (db) => {
      expect(await db.select().from(users)).toHaveLength(1);
      expect(await db.select().from(featureFlags)).toHaveLength(1);
      expect(await db.select().from(aiModelConfig)).toHaveLength(4);
      expect(await db.select().from(aiRuns)).toHaveLength(0);
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

  it("runs the narrowed four-case fake-Provider composition without Product, Content or public mutation", async () => {
    await truncateExerciseState();
    const created = bootstrap();
    const bootstrapEvidence = bootstrapResult(created);

    const fixture = await withDatabase(async (db) => {
      const actor = (await db.select().from(users).where(eq(users.id, bootstrapEvidence.actorId)))[0];
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
      const pricing = createDeepSeekPricingPolicyRegistryV1();
      if (!providers.ok) throw new Error("Local fake Provider registry failed.");
      const configIds = bootstrapEvidence.configs.map((config) => config.id);
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
        pricingRegistry: pricing,
      });
      const denial = await webDenied.requestDraftAssistance(command({
        useCase: "product_description_draft",
        actorId: actor.id,
        targetId: targets.productDescription,
        idempotencyKey: randomUUID(),
      }));
      expect(denial).toMatchObject({ ok: false, error: { code: "environment_not_authorized" } });
      expect(await db.select().from(aiRuns)).toHaveLength(0);
      return {
        actor,
        flag,
        targets,
        configIds,
        before: {
          assets: await db.select().from(assets),
          products: await db.select().from(products),
          productLocalizations: await db.select().from(productLocalizations),
          contents: await db.select().from(contents),
          contentLocalizations: await db.select().from(contentLocalizations),
          revisions: await db.select().from(editorialRevisions),
          routes: await db.select().from(routes),
          seo: await db.select().from(seoMetadata),
        },
      };
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
        row.estimatedMaxCostMicrousd === 7_304 && row.runCostLimitMicrousd === 20_000 &&
        row.actualCostMicrousd !== null && row.actualCostMicrousd <= 7_304 && row.actualCostComplete === true &&
        row.budgetReservedCostMicrousd === 0 && row.costAccountingState === "final" && row.candidateJson !== null &&
        row.humanDisposition === "not_evaluated" && row.appliedTargetVersion === null &&
        row.appliedRevisionId === null)).toBe(true);
      expect(rows.reduce((total, row) => total + row.runCostLimitMicrousd, 0)).toBeLessThanOrEqual(80_000);
      expect(rows.reduce((total, row) => total + row.estimatedMaxCostMicrousd, 0)).toBe(29_216);
      expect(await db.select().from(auditLogs).where(eq(auditLogs.action, "ai.run.enqueued"))).toHaveLength(4);
      expect(rows.flatMap((row) => row.attemptHistoryJson).filter(isDispatchedAttempt)).toHaveLength(4);

      await setFeatureFlag(db, { userId: fixture.actor.id, role: "admin" }, fixture.flag.id, false);
      expect(await db.select().from(auditLogs).where(eq(auditLogs.action, "ai.run.candidate_applied"))).toHaveLength(0);
      const configs = await db.select().from(aiModelConfig).where(inArray(aiModelConfig.id, fixture.configIds));
      expect(configs).toHaveLength(4);
      expect(configs.every((config) => config.enabled && config.isDefault && config.recordVersion === 2)).toBe(true);
      expect(await db.select().from(assets)).toEqual(fixture.before.assets);
      expect(await db.select().from(products)).toEqual(fixture.before.products);
      expect(await db.select().from(productLocalizations)).toEqual(fixture.before.productLocalizations);
      expect(await db.select().from(contents)).toEqual(fixture.before.contents);
      expect(await db.select().from(contentLocalizations)).toEqual(fixture.before.contentLocalizations);
      expect(await db.select().from(editorialRevisions)).toEqual(fixture.before.revisions);
      expect(await db.select().from(routes)).toEqual(fixture.before.routes);
      expect(await db.select().from(seoMetadata)).toEqual(fixture.before.seo);
      expect(await db.select().from(aiRuns).where(and(eq(aiRuns.status, "pending"), inArray(aiRuns.idempotencyKey, ids))))
        .toHaveLength(0);
    });
  }, 30_000);
});
