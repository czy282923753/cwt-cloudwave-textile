import "server-only";
import { readFileSync } from "node:fs";
import { eq, sql } from "drizzle-orm";
import { createPhaseCClaimedApplicationRegistryV1, createPhaseCDurableDraftAssistanceServiceV1 } from "@/ai/applications/draft-assistance/composition";
import type { ControlledValidationSourceAttestorV1 } from "@/ai/applications/draft-assistance/context";
import type { DraftAssistanceCommandV1 } from "@/ai/applications/draft-assistance/contracts";
import type { ControlledValidationExecutionAuthorityV1, PreparedCoreRunV1, SafeInputSourceReferenceV1 } from "@/ai/core/contracts";
import { aiFailure, aiSuccess } from "@/ai/errors";
import { createAiRunWorkerV1 } from "@/ai/internal/worker-entry";
import { createTextProviderRegistryV1 } from "@/ai/providers/registry";
import { productionPromptLoaderV1 } from "@/ai/prompts/loader";
import { databaseConnection } from "@/db/client";
import { aiRuns } from "@/db/schema";
import { createDeepSeekPricingPolicyRegistryV1 } from "@/integrations/ai/providers/deepseek-pricing";
import { createDeepSeekTextProviderV1, DEEPSEEK_TEXT_ENVELOPE_HASH_V1, DEEPSEEK_TEXT_MODEL_ALIAS_V1, DEEPSEEK_TEXT_PROVIDER_KEY_V1 } from "@/integrations/ai/providers/deepseek-text-adapter";

const databaseName = "cwt_phase_f_synthetic_20260826_k1";
const adminEmail = "phase-f-synthetic-admin@cloudwave.invalid";
const adminName = "Synthetic Phase F Admin — NOT CWT DATA";
const targetName = "Synthetic M6 K1 Product Description Diagnostic Target — NOT CWT DATA";
const categoryKey = "synthetic_phase_f_m6_k1_product";
const categoryName = "Synthetic M6 K1 Product Category — NOT CWT DATA";
const useCase = "product_description_draft";
const fixtureId = "SYN-AI-PHASE-F-PRODUCT-DESCRIPTION-V1";
const fixtureHash = "059362d1dbbf92db0746bfd4402ff6fe89c3815d82c134141c02896af473f5e8";
const promptId = "product-description-draft";
const promptHash = "0aefaeb2dba08c76587f6501451dc0031b6f825ab3bb903be00f28dda5e0b198";
const brief = "SYNTHETIC TEST DATA FOR LOCAL PHASE F EXERCISE ONLY — draft an English product description from the supplied synthetic target text; omit unknown specifications and do not change routes, publishing, or indexing";
const plannedIdempotencyKeys = Object.freeze([
  "702a422b-4bee-4130-bd8b-8f39c6e90528",
  "0b197c05-6005-4e3d-98a3-72f811f85a46",
  "07cd0500-39fa-4952-a3fe-7bcb8121edae",
  "33dec4ca-9690-44bb-8aba-ecc1978970da",
] as const);
const attemptUpperMicrousd = 7_304;
const batchHardCapMicrousd = 500_000;

type Fixture = { readonly actorId: string; readonly targetId: string; readonly configId: string };
type PreflightRow = Record<string, unknown> & { readonly database_name: string; readonly actor_count: number; readonly actor_id: string | null;
  readonly product_count: number; readonly product_id: string | null; readonly primary_category_count: number; readonly public_asset_count: number;
  readonly run_count: number; readonly feature_count: number; readonly config_count: number; readonly config_id: string | null };
const continuableTerminalOutcomes = Object.freeze([
  ["draft_ready", "success", null],
  ["failed", "invalid_response", "output_empty"],
  ["failed", "invalid_response", "output_truncated"],
  ["failed", "invalid_response", "output_invalid_json"],
  ["failed", "invalid_response", "output_schema_invalid"],
  ["failed", "invalid_response", "output_policy_rejected"],
  ["failed", "invalid_response", "output_too_large"],
  ["failed", "safety_rejected", "provider_safety_rejected"],
  ["failed", "timeout", "provider_timeout"],
  ["failed", "rate_limited", "provider_rate_limited"],
  ["failed", "server_error", "provider_server_error"],
] as const);

function mayContinueAfterTerminal(input: {
  readonly status: string;
  readonly providerResponseStatus: string;
  readonly failureCode: string | null;
}): boolean {
  return continuableTerminalOutcomes.some(([status, providerResponseStatus, failureCode]) =>
    input.status === status && input.providerResponseStatus === providerResponseStatus &&
    input.failureCode === failureCode);
}

function readCredential(): Buffer {
  const input = readFileSync(0);
  try {
    if (input.length === 0 || input.length > 512 || input.includes(0) || input.includes(10) || input.includes(13)) throw new Error("K1 diagnostic rejected the stdin credential record.");
    const boundary = new Set([9, 11, 12, 32]);
    let start = 0; let end = input.length;
    while (start < end && boundary.has(input[start]!)) start += 1;
    while (end > start && boundary.has(input[end - 1]!)) end -= 1;
    if (start === end) throw new Error("K1 diagnostic rejected the empty stdin credential record.");
    return Buffer.from(input.subarray(start, end));
  } finally { input.fill(0); }
}

function sameExplicitSource(left: readonly SafeInputSourceReferenceV1[], right: readonly SafeInputSourceReferenceV1[]): boolean {
  if (left.length !== 1 || right.length !== 1) return false;
  const a = left[0]; const b = right[0];
  return a?.alias === b?.alias && a?.sourceClass === "explicit_human_input" && b?.sourceClass === "explicit_human_input" &&
    JSON.stringify(a.sourceIdentity) === JSON.stringify(b.sourceIdentity) && JSON.stringify(a.selectedFields) === JSON.stringify(["text"]) &&
    JSON.stringify(a.fieldProvenance) === JSON.stringify([{ field: "text", provenance: "provided" }]);
}

function associationMatches(targetId: string, prepared: PreparedCoreRunV1): boolean {
  return prepared.association.kind === "draft_target.v1" && prepared.association.value.targetType === "product_draft" &&
    prepared.association.value.targetProductId === targetId && prepared.association.value.targetLocale === "en" && prepared.association.value.expectedTargetVersion === 1;
}

function fixedCommand(actorId: string, targetId: string, idempotencyKey: string): DraftAssistanceCommandV1 {
  return { useCase, task: { kind: useCase, tone: "concise_professional_b2b", selectedMediaPlacementIds: [] }, actor: { userId: actorId, role: "admin" },
    target: { type: "product_draft", productId: targetId, locale: "en", expectedVersion: 1 }, idempotencyKey,
    contextSelections: [{ sourceClass: "explicit_human_input", origin: "typed_brief" }], explicitInput: brief };
}

async function preflight(): Promise<Fixture> {
  if (databaseConnection.kind !== "postgres") throw new Error("K1 diagnostic preflight requires PostgreSQL.");
  const rows = await databaseConnection.db.execute<PreflightRow>(sql`
    select current_database() as database_name,
      (select count(*)::integer from users where email=${adminEmail} and display_name=${adminName} and role='admin' and is_active) as actor_count,
      (select id::text from users where email=${adminEmail} and display_name=${adminName} and role='admin' and is_active limit 1) as actor_id,
      (select count(*)::integer from products p join product_localizations pl on pl.product_id=p.id where p.status='draft' and pl.locale='en' and pl.name=${targetName} and pl.editor_document_version=1) as product_count,
      (select p.id::text from products p join product_localizations pl on pl.product_id=p.id where p.status='draft' and pl.locale='en' and pl.name=${targetName} and pl.editor_document_version=1 limit 1) as product_id,
      (select count(*)::integer from product_taxonomy_terms pt join taxonomy_terms t on t.id=pt.taxonomy_term_id join taxonomy_term_localizations tl on tl.taxonomy_term_id=t.id and tl.locale='en'
        where pt.product_id=(select p.id from products p join product_localizations pl on pl.product_id=p.id where pl.locale='en' and pl.name=${targetName}) and pt.is_primary and t.internal_key=${categoryKey} and t.is_active and t.product_code_prefix is null and tl.name=${categoryName}) as primary_category_count,
      (select count(*)::integer from product_assets pa join assets a on a.id=pa.asset_id where pa.product_id=(select p.id from products p join product_localizations pl on pl.product_id=p.id where pl.locale='en' and pl.name=${targetName}) and a.status='ready' and a.access='public' and a.storage_partition='public' and a.deleted_at is null) as public_asset_count,
      (select count(*)::integer from ai_runs) as run_count,
      (select count(*)::integer from feature_flags where key='ai' and enabled) as feature_count,
      (select count(*)::integer from ai_model_config where capability='text' and use_case=${useCase} and provider=${DEEPSEEK_TEXT_PROVIDER_KEY_V1} and model=${DEEPSEEK_TEXT_MODEL_ALIAS_V1} and parameters_json='{"temperature":0}'::jsonb and max_input_tokens=16000 and max_output_tokens=200 and max_attempts=1 and run_cost_limit_microusd=500000 and prompt_id=${promptId} and prompt_version=1 and prompt_hash=${promptHash} and enabled and is_default and fallback_config_id is null and record_version=2) as config_count,
      (select id::text from ai_model_config where capability='text' and use_case=${useCase} and provider=${DEEPSEEK_TEXT_PROVIDER_KEY_V1} and model=${DEEPSEEK_TEXT_MODEL_ALIAS_V1} and parameters_json='{"temperature":0}'::jsonb and max_input_tokens=16000 and max_output_tokens=200 and max_attempts=1 and run_cost_limit_microusd=500000 and prompt_id=${promptId} and prompt_version=1 and prompt_hash=${promptHash} and enabled and is_default and fallback_config_id is null and record_version=2 limit 1) as config_id
  `);
  const row = rows[0];
  if (row === undefined || row.database_name !== databaseName || Number(row.actor_count) !== 1 || row.actor_id === null || Number(row.product_count) !== 1 || row.product_id === null ||
    Number(row.primary_category_count) !== 1 || Number(row.public_asset_count) !== 1 || Number(row.run_count) !== 0 || Number(row.feature_count) !== 1 || Number(row.config_count) !== 1 || row.config_id === null) throw new Error("K1 batch preflight rejected nonexact state.");
  return { actorId: row.actor_id, targetId: row.product_id, configId: row.config_id };
}

async function assertCompletedPrefix(expected: number, fixture: Fixture): Promise<void> {
  const rows = await databaseConnection.db.select().from(aiRuns).orderBy(aiRuns.queuedAt);
  if (rows.length !== expected) throw new Error("K1 batch prefix contains an unexpected row.");
  let accounted = 0;
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]!;
    if (row.idempotencyKey !== plannedIdempotencyKeys[index] || row.requestedByUserId !== fixture.actorId || row.targetType !== "product_draft" || row.targetProductId !== fixture.targetId || row.targetLocale !== "en" ||
      row.expectedTargetVersion !== 1 || row.modelConfigId !== fixture.configId || row.modelConfigVersion !== 2 || row.requestedProvider !== DEEPSEEK_TEXT_PROVIDER_KEY_V1 || row.requestedModel !== DEEPSEEK_TEXT_MODEL_ALIAS_V1 ||
      row.maxAttempts !== 1 || row.attemptCount !== 1 || !["draft_ready", "failed", "cancelled"].includes(row.status) || row.costAccountingState !== "final" || row.budgetReservedCostMicrousd !== 0) throw new Error("K1 batch prefix identity or accounting drifted.");
    accounted += Math.max(row.budgetAccountedCostMicrousd, row.actualCostMicrousd, row.actualCostComplete ? 0 : attemptUpperMicrousd);
  }
  if (accounted + attemptUpperMicrousd > batchHardCapMicrousd) throw new Error("K1 batch hard cap would be exceeded.");
}

async function waitForTerminal(runId: string) {
  const rows = await databaseConnection.db.select({ id: aiRuns.id, status: aiRuns.status, attemptCount: aiRuns.attemptCount,
    providerResponseStatus: aiRuns.providerResponseStatus, failureCode: aiRuns.failureCode }).from(aiRuns).where(eq(aiRuns.id, runId));
  const row = rows[0];
  if (rows.length !== 1 || row === undefined) throw new Error("K1 batch run identity drifted.");
  if (["draft_ready", "failed", "cancelled"].includes(row.status)) return row;
  await new Promise<void>((resolve) => setTimeout(resolve, 100));
  return waitForTerminal(runId);
}

async function main(): Promise<void> {
  if (process.argv.length !== 2) throw new Error("K1 diagnostic accepts no CLI arguments.");
  const credential = readCredential();
  let worker: ReturnType<typeof createAiRunWorkerV1> | undefined;
  try {
    if (process.env.APP_ENV !== "staging" || process.env.FEATURE_AI !== "true" || databaseConnection.kind !== "postgres") throw new Error("K1 diagnostic requires enabled Staging on PostgreSQL.");
    const fixture = await preflight();
    const providerResult = createTextProviderRegistryV1([createDeepSeekTextProviderV1({ credentialReader: () => credential.toString("utf8") })]);
    if (!providerResult.ok) throw new Error("K1 fixed Provider registry is invalid.");
    const providerRegistry = providerResult.value; const pricingRegistry = createDeepSeekPricingPolicyRegistryV1();
    let activeKey: string | undefined; let requestFingerprint: string | undefined; let inputHash: string | undefined;
    let inputSources: readonly SafeInputSourceReferenceV1[] | undefined;
    const sourceAttestor: ControlledValidationSourceAttestorV1 = { attestExplicitSource(input) {
      if (activeKey === undefined || input.origin !== "typed_brief" || input.command.useCase !== useCase || input.command.actor.userId !== fixture.actorId || input.command.idempotencyKey !== activeKey || input.command.explicitInput !== brief ||
        input.association.targetType !== "product_draft" || input.association.targetProductId !== fixture.targetId || input.association.targetLocale !== "en" || input.association.expectedTargetVersion !== 1) return aiFailure("context_provenance_mismatch");
      return aiSuccess({ fixtureId, fixtureVersion: 1, fixtureHash }); } };
    const authority: ControlledValidationExecutionAuthorityV1 = {
      authorizePreConfiguration(input) { const source = input.inputSources[0];
        if (activeKey === undefined || input.environment !== "staging" || input.applicationClass !== "draft_assistance" || input.capability !== "text" || input.useCase !== useCase || input.idempotencyKey !== activeKey || input.requestedByPrincipalId !== fixture.actorId || input.inputSources.length !== 1 || source?.sourceClass !== "explicit_human_input" || source.sourceIdentity.controlled_validation_fixture_id !== fixtureId || source.sourceIdentity.controlled_validation_fixture_version !== 1 || source.sourceIdentity.controlled_validation_fixture_hash !== fixtureHash) return aiFailure("environment_not_authorized");
        requestFingerprint = input.requestFingerprint; inputHash = input.inputHash; inputSources = input.inputSources; return aiSuccess(true); },
      authorizePreparedRun(input) { const prepared = input.preparedRun;
        if (activeKey === undefined || requestFingerprint === undefined || inputHash === undefined || inputSources === undefined || input.environment !== "staging" || prepared.applicationClass !== "draft_assistance" || prepared.capability !== "text" || prepared.useCase !== useCase || prepared.requestIdentity.idempotencyKey !== activeKey || prepared.requestIdentity.requestedByPrincipalId !== fixture.actorId || prepared.requestIdentity.fingerprint !== requestFingerprint || prepared.inputHash !== inputHash || !sameExplicitSource(prepared.inputSources, inputSources) || !associationMatches(fixture.targetId, prepared) || prepared.resolvedConfig.modelConfigId !== fixture.configId || prepared.resolvedConfig.modelConfigVersion !== 2 || prepared.resolvedConfig.requestedProvider !== DEEPSEEK_TEXT_PROVIDER_KEY_V1 || prepared.resolvedConfig.requestedModel !== DEEPSEEK_TEXT_MODEL_ALIAS_V1 || JSON.stringify(prepared.resolvedConfig.parametersSnapshot) !== JSON.stringify({ temperature: 0 }) || prepared.resolvedConfig.maxInputTokens !== 16_000 || prepared.resolvedConfig.maxOutputTokens !== 200 || prepared.resolvedConfig.maxAttempts !== 1 || prepared.resolvedConfig.runCostLimitMicrousd !== batchHardCapMicrousd || prepared.promptIdentity.promptId !== promptId || prepared.promptIdentity.promptVersion !== 1 || prepared.promptIdentity.promptHash !== promptHash || prepared.providerEnvelope.version !== 1 || prepared.providerEnvelope.hash !== DEEPSEEK_TEXT_ENVELOPE_HASH_V1) return aiFailure("environment_not_authorized");
        return aiSuccess(true); },
    };
    const service = createPhaseCDurableDraftAssistanceServiceV1({ database: databaseConnection.db, trustedEnvironment: { appEnvironment: "staging", processFeatureAiEnabled: true }, providerRegistry, promptLoader: productionPromptLoaderV1, pricingRegistry, controlledValidationAuthority: authority, controlledValidationSourceAttestor: sourceAttestor });
    worker = createAiRunWorkerV1({ database: databaseConnection.db, trustedEnvironment: { appEnvironment: "staging", processFeatureAiEnabled: true }, providerRegistry, promptLoader: productionPromptLoaderV1, pricingRegistry, applicationRegistry: createPhaseCClaimedApplicationRegistryV1({ controlledValidationSourceAttestor: sourceAttestor }), slotCount: 1, workerId: "cwt-phase-f-m6-four-call-diagnostic" });
    await worker.start();
    const results: { ordinal: number; runId: string; status: string; attemptCount: number; publish: false; index: false }[] = [];
    for (let ordinal = 0; ordinal < plannedIdempotencyKeys.length; ordinal += 1) {
      await assertCompletedPrefix(ordinal, fixture); activeKey = plannedIdempotencyKeys[ordinal]!;
      requestFingerprint = undefined; inputHash = undefined; inputSources = undefined;
      const requested = await service.requestDraftAssistance(fixedCommand(fixture.actorId, fixture.targetId, activeKey));
      if (!requested.ok) throw new Error(`K1 batch enqueue failed at ordinal ${ordinal + 1}: ${requested.error.code}.`);
      const terminal = await waitForTerminal(requested.value.runId);
      results.push({ ordinal: ordinal + 1, runId: terminal.id, status: terminal.status, attemptCount: terminal.attemptCount, publish: false, index: false });
      if (!mayContinueAfterTerminal(terminal)) break;
    }
    await assertCompletedPrefix(results.length, fixture); await worker.stop(); await worker.join();
    process.stdout.write(`${JSON.stringify({ status: results.length === 4 ? "completed" : "stopped", plannedCount: 4, completedCount: results.length, rows: results, publish: false, index: false })}\n`);
  } finally { if (worker?.running) await worker.stop("SIGTERM"); credential.fill(0); await databaseConnection.close(); }
}

void main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.message : "K1 diagnostic failed."}\n`); process.exitCode = 1; });
