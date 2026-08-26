import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js/session";
import { z } from "zod";

import {
  runGovernedMutation,
  type GovernedMutationOptions,
} from "@/audit/governed-mutation";
import type { UserRole } from "@/auth/permissions";
import type { ReadonlyJsonObject, ReadonlyJsonValue } from "@/ai/canonical-json";
import { aiFailure, aiSuccess, type AiServiceResult } from "@/ai/errors";
import type { PromptBundleLoaderV1 } from "@/ai/prompts/loader";
import type { TextProviderRegistryV1 } from "@/ai/providers/registry";
import {
  calculateAttemptUpperCostMicrousdV1,
  type PricingPolicyRegistryV1,
} from "@/ai/runs/pricing-policy";
import {
  authoritativeAiActorCanPerformV1,
  resolveAuthoritativeAiActorV1,
} from "@/ai/runs/repository";
import { aiModelConfig } from "@/db/schema";
import type { AppDatabase } from "@/db/types";
import {
  aiModelConfigMutationReadRepositoryV1,
  type AiModelConfigMutationReadRepositoryV1,
} from "./model-config-repository";

const useCaseSchema = z.enum([
  "seo_content_draft",
  "fabric_knowledge_draft",
  "product_description_draft",
  "sourcing_guide_draft",
]);
const identifier = z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/);
const model = z.string().trim().min(1).max(128)
  .refine((value) => !/[\u0000-\u001f\u007f]/u.test(value));
const promptId = z.string().regex(/^[a-z][a-z0-9-]{0,63}$/);
const hash = z.string().regex(/^[0-9a-f]{64}$/);
const uuid = z.string().uuid();

export interface AiModelConfigActorV1 {
  readonly userId: string;
  readonly role: UserRole;
}

export interface AiModelConfigApplicationContractV1 {
  readonly useCase: z.infer<typeof useCaseSchema>;
  readonly inputSchemaVersion: number;
  readonly outputSchemaVersion: number;
  readonly policyVersion: string;
}

export interface AiModelConfigSubstantiveInputV1 {
  readonly provider: string;
  readonly model: string;
  readonly parameters: ReadonlyJsonObject;
  readonly maxInputTokens: number;
  readonly maxOutputTokens: number;
  readonly maxAttempts: number;
  readonly runCostLimitMicrousd: number;
  readonly promptId: string;
  readonly promptVersion: number;
  readonly promptHash: string;
}

export interface AiModelConfigServiceV1 {
  create(input: AiModelConfigSubstantiveInputV1 & {
    readonly actor: AiModelConfigActorV1;
    readonly useCase: z.infer<typeof useCaseSchema>;
  }): Promise<AiServiceResult<{ readonly id: string; readonly recordVersion: number }>>;
  updateSubstantive(input: AiModelConfigSubstantiveInputV1 & {
    readonly actor: AiModelConfigActorV1;
    readonly id: string;
    readonly expectedRecordVersion: number;
  }): Promise<AiServiceResult<{ readonly id: string; readonly recordVersion: number }>>;
  activateDefault(input: {
    readonly actor: AiModelConfigActorV1;
    readonly useCase: z.infer<typeof useCaseSchema>;
    readonly selectedConfigId: string;
    readonly expectedRecordVersions: Readonly<Record<string, number>>;
  }): Promise<AiServiceResult<{ readonly selectedConfigId: string; readonly recordVersion: number }>>;
  disable(input: {
    readonly actor: AiModelConfigActorV1;
    readonly id: string;
    readonly expectedRecordVersion: number;
  }): Promise<AiServiceResult<{ readonly id: string; readonly recordVersion: number }>>;
}

interface ValidatedSubstantiveV1 {
  readonly provider: string;
  readonly model: string;
  readonly parameters: ReadonlyJsonObject;
  readonly maxInputTokens: number;
  readonly maxOutputTokens: number;
  readonly maxAttempts: number;
  readonly runCostLimitMicrousd: number;
  readonly promptId: string;
  readonly promptVersion: number;
  readonly promptHash: string;
}

function jsonValue(value: unknown): value is ReadonlyJsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(jsonValue);
  if (typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return (prototype === Object.prototype || prototype === null) &&
    Object.values(value).every(jsonValue);
}

function applicationContract(
  contracts: readonly AiModelConfigApplicationContractV1[],
  useCase: string,
): AiModelConfigApplicationContractV1 | undefined {
  const matches = contracts.filter((candidate) => candidate.useCase === useCase);
  return matches.length === 1 ? matches[0] : undefined;
}

function validateSubstantive(input: {
  readonly value: AiModelConfigSubstantiveInputV1;
  readonly useCase: string;
  readonly at: Date;
  readonly contracts: readonly AiModelConfigApplicationContractV1[];
  readonly providers: TextProviderRegistryV1;
  readonly prompts: PromptBundleLoaderV1;
  readonly pricing: PricingPolicyRegistryV1;
}): AiServiceResult<ValidatedSubstantiveV1> {
  const contract = applicationContract(input.contracts, input.useCase);
  if (contract === undefined || !identifier.safeParse(input.value.provider).success ||
    !model.safeParse(input.value.model).success || !jsonValue(input.value.parameters) ||
    Array.isArray(input.value.parameters) || input.value.parameters === null ||
    !Number.isInteger(input.value.maxInputTokens) || input.value.maxInputTokens < 1 ||
    input.value.maxInputTokens > 16_000 || !Number.isInteger(input.value.maxOutputTokens) ||
    input.value.maxOutputTokens < 1 || input.value.maxOutputTokens > 4_000 ||
    !Number.isInteger(input.value.maxAttempts) || input.value.maxAttempts < 1 ||
    input.value.maxAttempts > 3 || !Number.isSafeInteger(input.value.runCostLimitMicrousd) ||
    input.value.runCostLimitMicrousd < 1 || input.value.runCostLimitMicrousd > 500_000 ||
    !promptId.safeParse(input.value.promptId).success ||
    !Number.isInteger(input.value.promptVersion) || input.value.promptVersion < 1 ||
    !hash.safeParse(input.value.promptHash).success) return aiFailure("config_invalid");
  const provider = input.providers.resolve(input.value.provider);
  if (!provider.ok) return provider;
  const resolved = provider.value.resolveConfiguration({
    model: input.value.model,
    parameters: input.value.parameters,
  });
  if (!resolved.ok) return resolved;
  if (resolved.value.model !== input.value.model) return aiFailure("model_unsupported");
  const prompt = input.prompts.load({
    promptId: input.value.promptId,
    promptVersion: input.value.promptVersion,
    promptHash: input.value.promptHash,
    applicationClass: "draft_assistance",
    capability: "text",
    useCase: input.useCase,
    inputSchemaVersion: contract.inputSchemaVersion,
    outputSchemaVersion: contract.outputSchemaVersion,
    policyVersion: contract.policyVersion,
  });
  if (!prompt.ok) return prompt;
  const pricing = input.pricing.resolve({
    provider: input.value.provider,
    model: input.value.model,
    at: input.at,
  });
  if (!pricing.ok) return pricing;
  const cost = calculateAttemptUpperCostMicrousdV1({
    maxInputTokens: input.value.maxInputTokens,
    maxOutputTokens: input.value.maxOutputTokens,
    maxAttempts: input.value.maxAttempts,
    pricing: pricing.value,
  });
  if (!cost.ok || cost.value.estimatedMax > input.value.runCostLimitMicrousd) {
    return aiFailure("config_invalid");
  }
  return aiSuccess({
    ...input.value,
    parameters: resolved.value.parameters,
  });
}

type PhaseCPgDatabase = AppDatabase<PostgresJsQueryResultHKT>;

async function databaseClock(
  transaction: PhaseCPgDatabase,
): Promise<Date> {
  const result = await transaction.execute<{ readonly value: string }>(sql`
    select clock_timestamp() as value
  `);
  const at = new Date(result[0]?.value ?? Number.NaN);
  if (!Number.isFinite(at.getTime())) throw new Error("Database clock observation failed.");
  return at;
}

function validActorClaim(actor: AiModelConfigActorV1): boolean {
  return uuid.safeParse(actor.userId).success;
}

export function createAiModelConfigServiceV1(
  database: PhaseCPgDatabase,
  dependencies: {
    readonly contracts: readonly AiModelConfigApplicationContractV1[];
    readonly providerRegistry: TextProviderRegistryV1;
    readonly promptLoader: PromptBundleLoaderV1;
    readonly pricingRegistry: PricingPolicyRegistryV1;
    readonly repository?: AiModelConfigMutationReadRepositoryV1;
    readonly governedMutationOptions?: GovernedMutationOptions;
  },
): AiModelConfigServiceV1 {
  const repository = dependencies.repository ?? aiModelConfigMutationReadRepositoryV1;
  return {
    async create(input) {
      if (!validActorClaim(input.actor)) return aiFailure("authorization_denied");
      return runGovernedMutation(database, async ({ transaction, audit }) => {
        const actor = await resolveAuthoritativeAiActorV1(transaction, input.actor);
        if (actor === null || !authoritativeAiActorCanPerformV1(actor, "config_mutation")) {
          return aiFailure("authorization_denied");
        }
        if (!useCaseSchema.safeParse(input.useCase).success) return aiFailure("use_case_unknown");
        const at = await databaseClock(transaction);
        const validated = validateSubstantive({
          value: input,
          useCase: input.useCase,
          at,
          contracts: dependencies.contracts,
          providers: dependencies.providerRegistry,
          prompts: dependencies.promptLoader,
          pricing: dependencies.pricingRegistry,
        });
        if (!validated.ok) return validated;
        const rows = await transaction.insert(aiModelConfig).values({
          capability: "text",
          useCase: input.useCase,
          provider: validated.value.provider,
          model: validated.value.model,
          parametersJson: validated.value.parameters,
          maxInputTokens: validated.value.maxInputTokens,
          maxOutputTokens: validated.value.maxOutputTokens,
          maxAttempts: validated.value.maxAttempts,
          runCostLimitMicrousd: validated.value.runCostLimitMicrousd,
          promptId: validated.value.promptId,
          promptVersion: validated.value.promptVersion,
          promptHash: validated.value.promptHash,
          enabled: false,
          isDefault: false,
          fallbackConfigId: null,
          recordVersion: 1,
          createdByUserId: actor.userId,
          updatedByUserId: actor.userId,
          createdAt: at,
          updatedAt: at,
        }).returning({ id: aiModelConfig.id, recordVersion: aiModelConfig.recordVersion });
        const row = rows[0];
        if (row === undefined) throw new Error("Model configuration insert failed.");
        await audit({
          actorUserId: actor.userId,
          action: "ai.model_config.created",
          entityType: "ai_model_config",
          entityId: row.id,
          afterSummary: { useCase: input.useCase, recordVersion: row.recordVersion },
        });
        return aiSuccess(row);
      }, dependencies.governedMutationOptions);
    },

    async updateSubstantive(input) {
      if (!validActorClaim(input.actor)) return aiFailure("authorization_denied");
      return runGovernedMutation(database, async ({ transaction, audit }) => {
        const actor = await resolveAuthoritativeAiActorV1(transaction, input.actor);
        if (actor === null || !authoritativeAiActorCanPerformV1(actor, "config_mutation")) {
          return aiFailure("authorization_denied");
        }
        if (!uuid.safeParse(input.id).success || !Number.isSafeInteger(input.expectedRecordVersion) ||
          input.expectedRecordVersion < 1) return aiFailure("config_invalid");
        const current = await repository.lockRowById(transaction, input.id);
        if (!current.ok) return current;
        if (current.value === null) return aiFailure("config_missing");
        if (current.value.recordVersion !== input.expectedRecordVersion) return aiFailure("state_conflict");
        const references = await repository.countRunReferences(transaction, input.id);
        if (!references.ok) return references;
        if (references.value !== 0) return aiFailure("state_conflict");
        const at = await databaseClock(transaction);
        const validated = validateSubstantive({
          value: input,
          useCase: current.value.useCase,
          at,
          contracts: dependencies.contracts,
          providers: dependencies.providerRegistry,
          prompts: dependencies.promptLoader,
          pricing: dependencies.pricingRegistry,
        });
        if (!validated.ok) return validated;
        const rows = await transaction.update(aiModelConfig).set({
          provider: validated.value.provider,
          model: validated.value.model,
          parametersJson: validated.value.parameters,
          maxInputTokens: validated.value.maxInputTokens,
          maxOutputTokens: validated.value.maxOutputTokens,
          maxAttempts: validated.value.maxAttempts,
          runCostLimitMicrousd: validated.value.runCostLimitMicrousd,
          promptId: validated.value.promptId,
          promptVersion: validated.value.promptVersion,
          promptHash: validated.value.promptHash,
          updatedByUserId: actor.userId,
          updatedAt: at,
          recordVersion: current.value.recordVersion + 1,
        }).where(and(
          eq(aiModelConfig.id, input.id),
          eq(aiModelConfig.recordVersion, current.value.recordVersion),
        )).returning({ id: aiModelConfig.id, recordVersion: aiModelConfig.recordVersion });
        const row = rows[0];
        if (row === undefined) return aiFailure("state_conflict");
        await audit({
          actorUserId: actor.userId,
          action: "ai.model_config.updated",
          entityType: "ai_model_config",
          entityId: row.id,
          beforeSummary: { recordVersion: current.value.recordVersion },
          afterSummary: { recordVersion: row.recordVersion },
        });
        return aiSuccess(row);
      }, dependencies.governedMutationOptions);
    },

    async activateDefault(input) {
      if (!validActorClaim(input.actor)) return aiFailure("authorization_denied");
      return runGovernedMutation(database, async ({ transaction, audit }) => {
        const actor = await resolveAuthoritativeAiActorV1(transaction, input.actor);
        if (actor === null || !authoritativeAiActorCanPerformV1(actor, "config_mutation")) {
          return aiFailure("authorization_denied");
        }
        if (!useCaseSchema.safeParse(input.useCase).success ||
          !uuid.safeParse(input.selectedConfigId).success) return aiFailure("config_invalid");
        const locked = await repository.lockUseCaseRows(transaction, {
          capability: "text",
          useCase: input.useCase,
        });
        if (!locked.ok) return locked;
        const selected = locked.value.find((row) => row.id === input.selectedConfigId);
        if (selected === undefined) return aiFailure("config_missing");
        const changed = locked.value.filter((row) => row.id === selected.id || row.isDefault);
        if (changed.some((row) => input.expectedRecordVersions[row.id] !== row.recordVersion)) {
          return aiFailure("state_conflict");
        }
        if (selected.enabled && selected.isDefault && changed.length === 1) {
          return aiFailure("state_conflict");
        }
        const at = await databaseClock(transaction);
        const validated = validateSubstantive({
          value: {
            provider: selected.provider,
            model: selected.model,
            parameters: selected.parametersJson,
            maxInputTokens: selected.maxInputTokens,
            maxOutputTokens: selected.maxOutputTokens,
            maxAttempts: selected.maxAttempts,
            runCostLimitMicrousd: selected.runCostLimitMicrousd,
            promptId: selected.promptId,
            promptVersion: selected.promptVersion,
            promptHash: selected.promptHash,
          },
          useCase: selected.useCase,
          at,
          contracts: dependencies.contracts,
          providers: dependencies.providerRegistry,
          prompts: dependencies.promptLoader,
          pricing: dependencies.pricingRegistry,
        });
        if (!validated.ok) return validated;
        const changedIds = changed.filter((row) => row.id !== selected.id).map((row) => row.id);
        if (changedIds.length > 0) {
          await transaction.update(aiModelConfig).set({
            isDefault: false,
            updatedByUserId: actor.userId,
            updatedAt: at,
            recordVersion: sql`${aiModelConfig.recordVersion} + 1`,
          }).where(inArray(aiModelConfig.id, changedIds));
        }
        const rows = await transaction.update(aiModelConfig).set({
          enabled: true,
          isDefault: true,
          updatedByUserId: actor.userId,
          updatedAt: at,
          recordVersion: sql`${aiModelConfig.recordVersion} + 1`,
        }).where(eq(aiModelConfig.id, selected.id)).returning({
          id: aiModelConfig.id,
          recordVersion: aiModelConfig.recordVersion,
        });
        const row = rows[0];
        if (row === undefined) return aiFailure("state_conflict");
        await audit({
          actorUserId: actor.userId,
          action: "ai.model_config.activation_changed",
          entityType: "ai_model_config",
          entityId: selected.id,
          afterSummary: { selectedConfigId: selected.id, recordVersion: row.recordVersion },
        });
        return aiSuccess({ selectedConfigId: row.id, recordVersion: row.recordVersion });
      }, dependencies.governedMutationOptions);
    },

    async disable(input) {
      if (!validActorClaim(input.actor)) return aiFailure("authorization_denied");
      return runGovernedMutation(database, async ({ transaction, audit }) => {
        const actor = await resolveAuthoritativeAiActorV1(transaction, input.actor);
        if (actor === null || !authoritativeAiActorCanPerformV1(actor, "config_mutation")) {
          return aiFailure("authorization_denied");
        }
        if (!uuid.safeParse(input.id).success || !Number.isSafeInteger(input.expectedRecordVersion) ||
          input.expectedRecordVersion < 1) return aiFailure("config_invalid");
        const locked = await repository.lockRowById(transaction, input.id);
        if (!locked.ok) return locked;
        if (locked.value === null) return aiFailure("config_missing");
        if (locked.value.recordVersion !== input.expectedRecordVersion) return aiFailure("state_conflict");
        const at = await databaseClock(transaction);
        const rows = await transaction.update(aiModelConfig).set({
          enabled: false,
          updatedByUserId: actor.userId,
          updatedAt: at,
          recordVersion: locked.value.recordVersion + 1,
        }).where(and(
          eq(aiModelConfig.id, input.id),
          eq(aiModelConfig.recordVersion, locked.value.recordVersion),
        )).returning({ id: aiModelConfig.id, recordVersion: aiModelConfig.recordVersion });
        const row = rows[0];
        if (row === undefined) return aiFailure("state_conflict");
        await audit({
          actorUserId: actor.userId,
          action: "ai.model_config.activation_changed",
          entityType: "ai_model_config",
          entityId: row.id,
          beforeSummary: { enabled: locked.value.enabled, recordVersion: locked.value.recordVersion },
          afterSummary: { enabled: false, recordVersion: row.recordVersion },
        });
        return aiSuccess(row);
      }, dependencies.governedMutationOptions);
    },
  };
}
