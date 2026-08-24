import "server-only";

import { count, sql } from "drizzle-orm";

import { createAiModelConfigServiceV1 } from "@/ai/config/model-config-service";
import { draftOutputDefinitionV1 } from "@/ai/output/registry";
import { createTextProviderRegistryV1 } from "@/ai/providers/registry";
import { productionPromptLoaderV1 } from "@/ai/prompts/loader";
import { hashPassword } from "@/auth/password";
import { runGovernedMutation } from "@/audit/governed-mutation";
import { databaseConnection } from "@/db/client";
import { aiModelConfig, aiRuns, auditLogs, featureFlags, users } from "@/db/schema";
import { createDeepSeekPricingPolicyRegistryV1 } from "@/integrations/ai/providers/deepseek-pricing";
import {
  createDeepSeekTextProviderV1,
  DEEPSEEK_TEXT_MODEL_ALIAS_V1,
  DEEPSEEK_TEXT_PROVIDER_KEY_V1,
} from "@/integrations/ai/providers/deepseek-text-adapter";

const syntheticAdminEmail = "phase-f-synthetic-admin@cloudwave.invalid";
const syntheticAdminName = "Synthetic Phase F Admin — NOT CWT DATA";
const isolatedDatabaseName = /^cwt_phase_f_synthetic_[a-z0-9_]+$/u;
const fixedConfigs = Object.freeze([
  {
    useCase: "product_description_draft",
    promptId: "product-description-draft",
    promptHash: "0aefaeb2dba08c76587f6501451dc0031b6f825ab3bb903be00f28dda5e0b198",
  },
  {
    useCase: "seo_content_draft",
    promptId: "seo-content-draft",
    promptHash: "91f8868efad16310a5ed26c85a6001024572949c59725efe2b6c0df935499195",
  },
  {
    useCase: "fabric_knowledge_draft",
    promptId: "fabric-knowledge-draft",
    promptHash: "b3b65d50e9ea0d5f5da2e0dca25d808463a47fbf59a7dfcb9b71b64823501a8c",
  },
  {
    useCase: "sourcing_guide_draft",
    promptId: "sourcing-guide-draft",
    promptHash: "e4aaf2e39483bde7569edb529f1c1d213b0a11d68ac4a9b99075992620238adf",
  },
] as const);

interface ConfigOutput {
  readonly useCase: (typeof fixedConfigs)[number]["useCase"];
  readonly id: string;
  readonly recordVersion: number;
}

async function governedBootstrapMutation(passwordHash: string): Promise<string> {
  if (databaseConnection.kind !== "postgres") {
    throw new Error("Phase F bootstrap requires isolated PostgreSQL.");
  }
  return runGovernedMutation(databaseConnection.db, async ({ transaction, audit }) => {
    const topology = await transaction.execute<{
      readonly database_name: string;
      readonly lock_acquired: boolean;
      readonly other_clients: number;
    }>(sql`
      select current_database() as database_name,
             pg_try_advisory_xact_lock(1129792598, 1) as lock_acquired,
             (
               select count(*)::integer
               from pg_stat_activity
               where datname = current_database()
                 and pid <> pg_backend_pid()
                 and backend_type = 'client backend'
             ) as other_clients
    `);
    const observed = topology[0];
    if (observed === undefined || !isolatedDatabaseName.test(observed.database_name) ||
      observed.lock_acquired !== true || Number(observed.other_clients) !== 0) {
      throw new Error("Phase F bootstrap refused non-isolated or concurrent-writer topology.");
    }
    const [userCount, flagCount, auditCount, configCount, runCount] = await Promise.all([
      transaction.select({ value: count() }).from(users),
      transaction.select({ value: count() }).from(featureFlags),
      transaction.select({ value: count() }).from(auditLogs),
      transaction.select({ value: count() }).from(aiModelConfig),
      transaction.select({ value: count() }).from(aiRuns),
    ]);
    if ([userCount, flagCount, auditCount, configCount, runCount]
      .some((result) => Number(result[0]?.value ?? -1) !== 0)) {
      throw new Error("Phase F bootstrap requires a fresh disposable database.");
    }

    const actorRows = await transaction.insert(users).values({
      email: syntheticAdminEmail,
      displayName: syntheticAdminName,
      role: "admin",
      passwordHash,
      isActive: true,
    }).returning({ id: users.id });
    const actor = actorRows[0];
    if (actor === undefined) throw new Error("Synthetic Admin bootstrap insert failed.");
    await audit({
      actorUserId: actor.id,
      action: "auth.phase_f_staging_bootstrapped",
      entityType: "user",
      entityId: actor.id,
      afterSummary: {
        classification: "SYNTHETIC_TEST_DATA_NOT_CWT_FACT",
        role: "admin",
        active: true,
      },
    });

    const flagRows = await transaction.insert(featureFlags).values({
      key: "ai",
      enabled: false,
      configuration: { classification: "SYNTHETIC_TEST_DATA_NOT_CWT_FACT" },
      updatedByUserId: actor.id,
    }).returning({ id: featureFlags.id });
    const flag = flagRows[0];
    if (flag === undefined) throw new Error("Disabled AI feature bootstrap insert failed.");
    await audit({
      actorUserId: actor.id,
      action: "feature_flag.created",
      entityType: "feature_flag",
      entityId: flag.id,
      afterSummary: { key: "ai", enabled: false },
    });
    return actor.id;
  }, { transactionConfig: { isolationLevel: "serializable" } });
}

async function createFixedConfigurations(actorId: string): Promise<readonly ConfigOutput[]> {
  if (databaseConnection.kind !== "postgres") {
    throw new Error("Phase F bootstrap requires isolated PostgreSQL.");
  }
  const contracts = fixedConfigs.map((fixed) => {
    const output = draftOutputDefinitionV1(fixed.useCase);
    if (output === undefined) throw new Error(`Phase F output contract missing: ${fixed.useCase}.`);
    return {
      useCase: fixed.useCase,
      inputSchemaVersion: 1,
      outputSchemaVersion: output.schemaVersion,
      policyVersion: output.policyVersion,
    };
  });
  const providers = createTextProviderRegistryV1([createDeepSeekTextProviderV1({
    fetchImplementation: async () => {
      throw new Error("Phase F bootstrap denied Provider fetch.");
    },
    credentialReader: () => {
      throw new Error("Phase F bootstrap denied Provider credential access.");
    },
  })]);
  if (!providers.ok) throw new Error(`Phase F Provider registry failed: ${providers.error.code}.`);
  const service = createAiModelConfigServiceV1(databaseConnection.db, {
    contracts,
    providerRegistry: providers.value,
    promptLoader: productionPromptLoaderV1,
    pricingRegistry: createDeepSeekPricingPolicyRegistryV1(),
  });
  const configs: ConfigOutput[] = [];
  for (const fixed of fixedConfigs) {
    const created = await service.create({
      actor: { userId: actorId, role: "admin" },
      useCase: fixed.useCase,
      provider: DEEPSEEK_TEXT_PROVIDER_KEY_V1,
      model: DEEPSEEK_TEXT_MODEL_ALIAS_V1,
      parameters: { temperature: 0 },
      maxInputTokens: 16_000,
      maxOutputTokens: 200,
      maxAttempts: 1,
      runCostLimitMicrousd: 20_000,
      promptId: fixed.promptId,
      promptVersion: 1,
      promptHash: fixed.promptHash,
    });
    if (!created.ok || created.value.recordVersion !== 1) {
      throw new Error(`Phase F config create failed: ${fixed.useCase}.`);
    }
    const activated = await service.activateDefault({
      actor: { userId: actorId, role: "admin" },
      useCase: fixed.useCase,
      selectedConfigId: created.value.id,
      expectedRecordVersions: { [created.value.id]: created.value.recordVersion },
    });
    if (!activated.ok || activated.value.selectedConfigId !== created.value.id ||
      activated.value.recordVersion !== 2) {
      throw new Error(`Phase F config activation failed: ${fixed.useCase}.`);
    }
    configs.push({ useCase: fixed.useCase, id: created.value.id, recordVersion: activated.value.recordVersion });
  }

  const [actors, flags, rows, runs, audits] = await Promise.all([
    databaseConnection.db.select().from(users),
    databaseConnection.db.select().from(featureFlags),
    databaseConnection.db.select().from(aiModelConfig),
    databaseConnection.db.select().from(aiRuns),
    databaseConnection.db.select().from(auditLogs),
  ]);
  if (actors.length !== 1 || actors[0]?.id !== actorId || actors[0].role !== "admin" || !actors[0].isActive ||
    flags.length !== 1 || flags[0]?.key !== "ai" || flags[0].enabled || runs.length !== 0 ||
    rows.length !== fixedConfigs.length || configs.length !== fixedConfigs.length ||
    new Set(configs.map((config) => config.id)).size !== fixedConfigs.length) {
    throw new Error("Phase F bootstrap postcondition failed.");
  }
  for (const fixed of fixedConfigs) {
    const row = rows.find((candidate) => candidate.useCase === fixed.useCase);
    const output = configs.find((candidate) => candidate.useCase === fixed.useCase);
    if (row === undefined || output === undefined || row.id !== output.id || row.capability !== "text" ||
      row.provider !== DEEPSEEK_TEXT_PROVIDER_KEY_V1 || row.model !== DEEPSEEK_TEXT_MODEL_ALIAS_V1 ||
      JSON.stringify(row.parametersJson) !== JSON.stringify({ temperature: 0 }) ||
      row.maxInputTokens !== 16_000 || row.maxOutputTokens !== 200 || row.maxAttempts !== 1 ||
      row.runCostLimitMicrousd !== 20_000 || row.promptId !== fixed.promptId || row.promptVersion !== 1 ||
      row.promptHash !== fixed.promptHash || !row.enabled || !row.isDefault || row.fallbackConfigId !== null ||
      row.recordVersion !== 2 || output.recordVersion !== 2 || row.createdByUserId !== actorId ||
      row.updatedByUserId !== actorId) {
      throw new Error(`Phase F config postcondition failed: ${fixed.useCase}.`);
    }
    const configAudits = audits.filter((audit) => audit.entityType === "ai_model_config" && audit.entityId === row.id);
    if (configAudits.length !== 2 ||
      configAudits.filter((audit) => audit.action === "ai.model_config.created").length !== 1 ||
      configAudits.filter((audit) => audit.action === "ai.model_config.activation_changed").length !== 1) {
      throw new Error(`Phase F config Audit postcondition failed: ${fixed.useCase}.`);
    }
  }
  if (audits.length !== 10 ||
    audits.filter((audit) => audit.action === "auth.phase_f_staging_bootstrapped").length !== 1 ||
    audits.filter((audit) => audit.action === "feature_flag.created").length !== 1) {
    throw new Error("Phase F bootstrap Audit postcondition failed.");
  }
  return configs;
}

async function main(): Promise<void> {
  if (process.argv.length !== 2) throw new Error("Phase F bootstrap accepts no CLI arguments.");
  if (process.env.APP_ENV !== "staging" || process.env.FEATURE_AI !== "false") {
    throw new Error("Phase F bootstrap requires Staging with process AI disabled.");
  }
  if (databaseConnection.kind !== "postgres") {
    throw new Error("Phase F bootstrap requires isolated PostgreSQL.");
  }
  try {
    const actorId = await governedBootstrapMutation(await hashPassword(process.env.DEV_ADMIN_PASSWORD ?? ""));
    const configs = await createFixedConfigurations(actorId);
    process.stdout.write(`${JSON.stringify({
      status: "bootstrapped",
      classification: "SYNTHETIC_TEST_DATA_NOT_CWT_FACT",
      actorId,
      featureAiEnabled: false,
      configs,
    })}\n`);
  } finally {
    await databaseConnection.close();
  }
}

void main().catch(async (error: unknown) => {
  await databaseConnection.close().catch(() => undefined);
  process.stderr.write(`${error instanceof Error ? error.message : "Phase F bootstrap failed."}\n`);
  process.exitCode = 1;
});
