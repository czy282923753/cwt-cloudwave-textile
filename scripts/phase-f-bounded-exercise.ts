import "server-only";

import { inArray, sql } from "drizzle-orm";

import { createPhaseCClaimedApplicationRegistryV1, createPhaseCDurableDraftAssistanceServiceV1 } from "@/ai/applications/draft-assistance/composition";
import type { ControlledValidationSourceAttestorV1 } from "@/ai/applications/draft-assistance/context";
import type { DraftAssistanceCommandV1, ProductionAiUseCase } from "@/ai/applications/draft-assistance/contracts";
import type { ControlledValidationExecutionAuthorityV1, PreparedCoreRunV1, SafeInputSourceReferenceV1 } from "@/ai/core/contracts";
import { aiFailure, aiSuccess } from "@/ai/errors";
import { createAiRunWorkerV1 } from "@/ai/internal/worker-entry";
import { createTextProviderRegistryV1 } from "@/ai/providers/registry";
import { productionPromptLoaderV1 } from "@/ai/prompts/loader";
import { createDeepSeekPricingPolicyRegistryV1 } from "@/integrations/ai/providers/deepseek-pricing";
import { createDeepSeekTextProviderV1, DEEPSEEK_TEXT_ENVELOPE_HASH_V1, DEEPSEEK_TEXT_MODEL_ALIAS_V1, DEEPSEEK_TEXT_PROVIDER_KEY_V1 } from "@/integrations/ai/providers/deepseek-text-adapter";
import { databaseConnection } from "@/db/client";
import { aiRuns } from "@/db/schema";

const isolatedDatabaseName = /^cwt_phase_f_synthetic_[a-z0-9_]+$/u;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const maximumWindowMilliseconds = 15 * 60 * 1_000;
const minimumRemainingMilliseconds = 60 * 1_000;
const perRowReservationCapMicrousd = 20_000;

type TargetKind = "product_draft" | "content_draft";
interface FixedCase {
  readonly useCase: ProductionAiUseCase;
  readonly targetKind: TargetKind;
  readonly targetIdArgument: string;
  readonly targetVersionArgument: string;
  readonly idempotencyArgument: string;
  readonly fixtureId: string;
  readonly fixtureHash: string;
  readonly brief: string;
  readonly promptId: string;
  readonly promptHash: string;
  command(input: { readonly actorId: string; readonly targetId: string; readonly targetVersion: number; readonly idempotencyKey: string }): DraftAssistanceCommandV1;
}

const productDescriptionBrief = "SYNTHETIC TEST DATA FOR LOCAL PHASE F EXERCISE ONLY — draft an English product description from the supplied synthetic target text; omit unknown specifications and do not change routes, publishing, or indexing";
const seoContentBrief = "SYNTHETIC TEST DATA FOR LOCAL PHASE F EXERCISE ONLY — propose an English SEO title and meta description from the supplied synthetic target text; do not change slugs, routes, publishing, or indexing";
const fabricKnowledgeBrief = "SYNTHETIC TEST DATA FOR LOCAL PHASE F EXERCISE ONLY — draft neutral English fabric knowledge from this supplied synthetic brief; omit every unknown detail";
const sourcingGuideBrief = "SYNTHETIC TEST DATA FOR LOCAL PHASE F EXERCISE ONLY — draft a concise English sourcing guide from this supplied synthetic brief; omit supply chain and company claims";

const fixedCases: readonly FixedCase[] = Object.freeze([
  {
    useCase: "product_description_draft",
    targetKind: "product_draft",
    targetIdArgument: "--product-description-target-id",
    targetVersionArgument: "--product-description-target-version",
    idempotencyArgument: "--product-description-idempotency-key",
    fixtureId: "SYN-AI-PHASE-F-PRODUCT-DESCRIPTION-V1",
    fixtureHash: "059362d1dbbf92db0746bfd4402ff6fe89c3815d82c134141c02896af473f5e8",
    brief: productDescriptionBrief,
    promptId: "product-description-draft",
    promptHash: "0aefaeb2dba08c76587f6501451dc0031b6f825ab3bb903be00f28dda5e0b198",
    command: ({ actorId, targetId, targetVersion, idempotencyKey }) => ({
      useCase: "product_description_draft",
      task: { kind: "product_description_draft", tone: "concise_professional_b2b", selectedMediaPlacementIds: [] },
      actor: { userId: actorId, role: "admin" },
      target: { type: "product_draft", productId: targetId, locale: "en", expectedVersion: targetVersion },
      idempotencyKey,
      contextSelections: [{ sourceClass: "explicit_human_input", origin: "typed_brief" }],
      explicitInput: productDescriptionBrief,
    }),
  },
  {
    useCase: "seo_content_draft",
    targetKind: "product_draft",
    targetIdArgument: "--seo-target-id",
    targetVersionArgument: "--seo-target-version",
    idempotencyArgument: "--seo-idempotency-key",
    fixtureId: "SYN-AI-PHASE-F-SEO-CONTENT-V1",
    fixtureHash: "7f11074a2ce35003b7cc06c35a3bec481f664e04a0e7e987d01b192cf44d1924",
    brief: seoContentBrief,
    promptId: "seo-content-draft",
    promptHash: "91f8868efad16310a5ed26c85a6001024572949c59725efe2b6c0df935499195",
    command: ({ actorId, targetId, targetVersion, idempotencyKey }) => ({
      useCase: "seo_content_draft",
      task: { kind: "seo_content_draft", tone: "concise_professional_b2b", pageIntent: "Synthetic English B2B fabric draft page", selectedInternalLinkIds: [] },
      actor: { userId: actorId, role: "admin" },
      target: { type: "product_draft", productId: targetId, locale: "en", expectedVersion: targetVersion },
      idempotencyKey,
      contextSelections: [{ sourceClass: "explicit_human_input", origin: "typed_brief" }],
      explicitInput: seoContentBrief,
    }),
  },
  {
    useCase: "fabric_knowledge_draft",
    targetKind: "content_draft",
    targetIdArgument: "--fabric-knowledge-target-id",
    targetVersionArgument: "--fabric-knowledge-target-version",
    idempotencyArgument: "--fabric-knowledge-idempotency-key",
    fixtureId: "SYN-AI-PHASE-F-FABRIC-KNOWLEDGE-V1",
    fixtureHash: "2081c6bbf5cc950ca878a7f739e6fece13796bae5564c63dc0971ca63f5cf471",
    brief: fabricKnowledgeBrief,
    promptId: "fabric-knowledge-draft",
    promptHash: "b3b65d50e9ea0d5f5da2e0dca25d808463a47fbf59a7dfcb9b71b64823501a8c",
    command: ({ actorId, targetId, targetVersion, idempotencyKey }) => ({
      useCase: "fabric_knowledge_draft",
      task: { kind: "fabric_knowledge_draft", tone: "neutral_editorial", topic: "Synthetic fabric knowledge exercise" },
      actor: { userId: actorId, role: "admin" },
      target: { type: "content_draft", contentId: targetId, locale: "en", expectedVersion: targetVersion },
      idempotencyKey,
      contextSelections: [{ sourceClass: "explicit_human_input", origin: "typed_brief" }],
      explicitInput: fabricKnowledgeBrief,
    }),
  },
  {
    useCase: "sourcing_guide_draft",
    targetKind: "content_draft",
    targetIdArgument: "--sourcing-guide-target-id",
    targetVersionArgument: "--sourcing-guide-target-version",
    idempotencyArgument: "--sourcing-guide-idempotency-key",
    fixtureId: "SYN-AI-PHASE-F-SOURCING-GUIDE-V1",
    fixtureHash: "86ffe86f66838a02b766db69ef9a673404d9e7f2f32707e8ba1712e60e8f15ac",
    brief: sourcingGuideBrief,
    promptId: "sourcing-guide-draft",
    promptHash: "e4aaf2e39483bde7569edb529f1c1d213b0a11d68ac4a9b99075992620238adf",
    command: ({ actorId, targetId, targetVersion, idempotencyKey }) => ({
      useCase: "sourcing_guide_draft",
      task: { kind: "sourcing_guide_draft", tone: "concise_professional_b2b", guideIntent: "Synthetic sourcing guide exercise" },
      actor: { userId: actorId, role: "admin" },
      target: { type: "content_draft", contentId: targetId, locale: "en", expectedVersion: targetVersion },
      idempotencyKey,
      contextSelections: [{ sourceClass: "explicit_human_input", origin: "typed_brief" }],
      explicitInput: sourcingGuideBrief,
    }),
  },
]);

const fixedArguments = Object.freeze([
  "--actor-id", "--window-start", "--window-exclusive-end",
  ...fixedCases.flatMap((item) => [item.targetIdArgument, item.targetVersionArgument, item.idempotencyArgument]),
]);

function parseArguments(): ReadonlyMap<string, string> {
  const values = new Map<string, string>();
  const received = process.argv.slice(2);
  if (received.length !== fixedArguments.length * 2) throw new Error("Phase F exercise requires the exact fixed argument set.");
  for (let index = 0; index < received.length; index += 2) {
    const key = received[index];
    const value = received[index + 1];
    if (key === undefined || value === undefined || !fixedArguments.includes(key) || values.has(key) || value.length === 0) {
      throw new Error("Phase F exercise rejected an unknown, duplicate, or empty argument.");
    }
    values.set(key, value);
  }
  if (fixedArguments.some((key) => !values.has(key))) throw new Error("Phase F exercise argument set is incomplete.");
  return values;
}

function required(values: ReadonlyMap<string, string>, key: string): string {
  const value = values.get(key);
  if (value === undefined) throw new Error(`Missing fixed Phase F value: ${key}.`);
  return value;
}

function positiveVersion(value: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || String(parsed) !== value) throw new Error("Target version is invalid.");
  return parsed;
}

function sameExplicitSource(left: readonly SafeInputSourceReferenceV1[], right: readonly SafeInputSourceReferenceV1[]): boolean {
  if (left.length !== 1 || right.length !== 1) return false;
  const leftSource = left[0];
  const rightSource = right[0];
  return leftSource?.alias === rightSource?.alias && leftSource?.sourceClass === "explicit_human_input" &&
    rightSource?.sourceClass === "explicit_human_input" && JSON.stringify(leftSource.sourceIdentity) === JSON.stringify(rightSource.sourceIdentity) &&
    JSON.stringify(leftSource.selectedFields) === JSON.stringify(["text"]) &&
    JSON.stringify(leftSource.fieldProvenance) === JSON.stringify([{ field: "text", provenance: "provided" }]);
}

function associationMatches(active: { readonly specification: FixedCase; readonly targetId: string; readonly targetVersion: number }, prepared: PreparedCoreRunV1): boolean {
  const value = prepared.association.value;
  return prepared.association.kind === "draft_target.v1" && value.targetType === active.specification.targetKind &&
    value.targetLocale === "en" && value.expectedTargetVersion === active.targetVersion &&
    (active.specification.targetKind === "product_draft"
      ? value.targetProductId === active.targetId
      : value.targetContentId === active.targetId);
}

async function main(): Promise<void> {
  const values = parseArguments();
  if (process.env.APP_ENV !== "staging" || process.env.FEATURE_AI !== "true" || databaseConnection.kind !== "postgres") {
    throw new Error("Phase F exercise requires enabled Staging on isolated PostgreSQL.");
  }
  const actorId = required(values, "--actor-id");
  if (!uuid.test(actorId)) throw new Error("Actor ID is invalid.");
  const inputCases = fixedCases.map((specification) => {
    const targetId = required(values, specification.targetIdArgument);
    const idempotencyKey = required(values, specification.idempotencyArgument);
    if (!uuid.test(targetId) || !uuid.test(idempotencyKey)) throw new Error("Target or idempotency UUID is invalid.");
    return {
      specification,
      targetId,
      targetVersion: positiveVersion(required(values, specification.targetVersionArgument)),
      idempotencyKey,
    };
  });
  if (new Set(inputCases.map((item) => item.idempotencyKey)).size !== fixedCases.length) {
    throw new Error("Each fixed case requires one distinct idempotency UUID.");
  }

  let worker: ReturnType<typeof createAiRunWorkerV1> | undefined;
  let stopping = false;
  const stop = (signal: "SIGINT" | "SIGTERM") => {
    if (stopping) return;
    stopping = true;
    void worker?.stop(signal);
  };
  process.once("SIGINT", () => stop("SIGINT"));
  process.once("SIGTERM", () => stop("SIGTERM"));
  try {
    const preflight = await databaseConnection.db.execute<{
      readonly observed_at: Date | string;
      readonly database_name: string;
      readonly run_count: number;
    }>(sql`
      select statement_timestamp() as observed_at,
             current_database() as database_name,
             (select count(*)::integer from ai_runs) as run_count
    `);
    const observed = preflight[0];
    if (observed === undefined || !isolatedDatabaseName.test(observed.database_name) || Number(observed.run_count) !== 0) {
      throw new Error("Phase F exercise requires the fresh isolated one-window topology.");
    }
    const observedMilliseconds = observed.observed_at instanceof Date
      ? observed.observed_at.getTime()
      : Date.parse(observed.observed_at);
    const startText = required(values, "--window-start");
    const exclusiveEndText = required(values, "--window-exclusive-end");
    const timestampFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
    const startMilliseconds = Date.parse(startText);
    const exclusiveEndMilliseconds = Date.parse(exclusiveEndText);
    if (!timestampFormat.test(startText) || !timestampFormat.test(exclusiveEndText) ||
      !Number.isFinite(startMilliseconds) || !Number.isFinite(exclusiveEndMilliseconds) ||
      startText.slice(0, 10) !== exclusiveEndText.slice(0, 10) || startMilliseconds >= exclusiveEndMilliseconds ||
      exclusiveEndMilliseconds - startMilliseconds > maximumWindowMilliseconds || observedMilliseconds < startMilliseconds ||
      observedMilliseconds >= exclusiveEndMilliseconds || exclusiveEndMilliseconds - observedMilliseconds < minimumRemainingMilliseconds) {
      throw new Error("Phase F approved interval is invalid, inactive, or has insufficient remaining time.");
    }

    const providerRegistryResult = createTextProviderRegistryV1([createDeepSeekTextProviderV1()]);
    if (!providerRegistryResult.ok) throw new Error("Fixed Provider registry is invalid.");
    const providerRegistry = providerRegistryResult.value;
    const pricingRegistry = createDeepSeekPricingPolicyRegistryV1();
    let active: undefined | {
      readonly specification: FixedCase;
      readonly actorId: string;
      readonly targetId: string;
      readonly targetVersion: number;
      readonly idempotencyKey: string;
      readonly requestFingerprint?: string;
      readonly inputHash?: string;
      readonly inputSources?: readonly SafeInputSourceReferenceV1[];
    };
    const sourceAttestor: ControlledValidationSourceAttestorV1 = {
      attestExplicitSource(input) {
        const current = active ?? inputCases
          .filter((item) => item.specification.useCase === input.command.useCase &&
            item.idempotencyKey === input.command.idempotencyKey)
          .map((item) => ({ ...item, actorId }))[0];
        if (current === undefined || input.origin !== "typed_brief" || input.command.useCase !== current.specification.useCase ||
          input.command.actor.userId !== current.actorId || input.command.idempotencyKey !== current.idempotencyKey ||
          input.command.explicitInput !== current.specification.brief || input.association.targetType !== current.specification.targetKind ||
          input.association.expectedTargetVersion !== current.targetVersion ||
          (input.association.targetType === "product_draft"
            ? input.association.targetProductId !== current.targetId
            : input.association.targetContentId !== current.targetId)) return aiFailure("context_provenance_mismatch");
        return aiSuccess({ fixtureId: current.specification.fixtureId, fixtureVersion: 1, fixtureHash: current.specification.fixtureHash });
      },
    };
    const executionAuthority: ControlledValidationExecutionAuthorityV1 = {
      authorizePreConfiguration(input) {
        const current = active;
        const source = input.inputSources[0];
        if (current === undefined || input.environment !== "staging" || input.applicationClass !== "draft_assistance" ||
          input.capability !== "text" || input.useCase !== current.specification.useCase || input.idempotencyKey !== current.idempotencyKey ||
          input.requestedByPrincipalId !== current.actorId || input.inputSources.length !== 1 || source?.sourceClass !== "explicit_human_input" ||
          source.sourceIdentity.controlled_validation_fixture_id !== current.specification.fixtureId ||
          source.sourceIdentity.controlled_validation_fixture_version !== 1 ||
          source.sourceIdentity.controlled_validation_fixture_hash !== current.specification.fixtureHash) return aiFailure("environment_not_authorized");
        active = { ...current, requestFingerprint: input.requestFingerprint, inputHash: input.inputHash, inputSources: input.inputSources };
        return aiSuccess(true);
      },
      authorizePreparedRun(input) {
        const current = active;
        const prepared = input.preparedRun;
        if (current === undefined || current.requestFingerprint === undefined || current.inputHash === undefined || current.inputSources === undefined ||
          input.environment !== "staging" || prepared.applicationClass !== "draft_assistance" || prepared.capability !== "text" ||
          prepared.useCase !== current.specification.useCase || prepared.requestIdentity.idempotencyKey !== current.idempotencyKey ||
          prepared.requestIdentity.requestedByPrincipalId !== current.actorId || prepared.requestIdentity.fingerprint !== current.requestFingerprint ||
          prepared.inputHash !== current.inputHash || !sameExplicitSource(prepared.inputSources, current.inputSources) ||
          !associationMatches(current, prepared) || prepared.resolvedConfig.requestedProvider !== DEEPSEEK_TEXT_PROVIDER_KEY_V1 ||
          prepared.resolvedConfig.requestedModel !== DEEPSEEK_TEXT_MODEL_ALIAS_V1 || prepared.resolvedConfig.maxAttempts !== 1 ||
          prepared.resolvedConfig.runCostLimitMicrousd > perRowReservationCapMicrousd || prepared.promptIdentity.promptId !== current.specification.promptId ||
          prepared.promptIdentity.promptVersion !== 1 || prepared.promptIdentity.promptHash !== current.specification.promptHash ||
          prepared.providerEnvelope.version !== 1 || prepared.providerEnvelope.hash !== DEEPSEEK_TEXT_ENVELOPE_HASH_V1) {
          return aiFailure("environment_not_authorized");
        }
        return aiSuccess(true);
      },
    };
    const service = createPhaseCDurableDraftAssistanceServiceV1({
      database: databaseConnection.db,
      trustedEnvironment: { appEnvironment: "staging", processFeatureAiEnabled: true },
      providerRegistry,
      promptLoader: productionPromptLoaderV1,
      pricingRegistry,
      controlledValidationAuthority: executionAuthority,
      controlledValidationSourceAttestor: sourceAttestor,
    });
    const runIds: string[] = [];
    for (const item of inputCases) {
      if (stopping) throw new Error("Phase F job stopped before enqueue completed.");
      active = { ...item, actorId };
      try {
        const result = await service.requestDraftAssistance(item.specification.command({
          actorId,
          targetId: item.targetId,
          targetVersion: item.targetVersion,
          idempotencyKey: item.idempotencyKey,
        }));
        if (!result.ok) throw new Error(`Fixed ${item.specification.useCase} enqueue failed: ${result.error.code}.`);
        runIds.push(result.value.runId);
      } finally {
        active = undefined;
      }
    }
    if (runIds.length !== fixedCases.length || new Set(runIds).size !== fixedCases.length) {
      throw new Error("Phase F fixed invocation did not create exactly four logical rows.");
    }
    worker = createAiRunWorkerV1({
      database: databaseConnection.db,
      trustedEnvironment: { appEnvironment: "staging", processFeatureAiEnabled: true },
      providerRegistry,
      promptLoader: productionPromptLoaderV1,
      pricingRegistry,
      applicationRegistry: createPhaseCClaimedApplicationRegistryV1({ controlledValidationSourceAttestor: sourceAttestor }),
      slotCount: 1,
      workerId: "cwt-phase-f-bounded-exercise",
    });
    await worker.start();
    let finalRows: readonly { readonly id: string; readonly status: string; readonly attemptCount: number }[] = [];
    while (!stopping) {
      finalRows = await databaseConnection.db.select({ id: aiRuns.id, status: aiRuns.status, attemptCount: aiRuns.attemptCount })
        .from(aiRuns).where(inArray(aiRuns.id, runIds));
      if (finalRows.length === fixedCases.length && finalRows.every((row) => row.status === "draft_ready" || row.status === "failed" || row.status === "cancelled")) break;
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
    }
    await worker.stop(stopping ? "SIGTERM" : undefined);
    await worker.join();
    if (stopping) throw new Error("Phase F job ended INCOMPLETE after cutoff or signal.");
    process.stdout.write(`${JSON.stringify({
      status: finalRows.every((row) => row.status === "draft_ready") ? "draft_ready" : "incomplete",
      classification: "SYNTHETIC_TEST_DATA_NOT_CWT_FACT",
      runCount: finalRows.length,
      rows: finalRows,
      publish: false,
      index: false,
    })}\n`);
  } finally {
    if (worker?.running === true) await worker.stop("SIGTERM");
    await databaseConnection.close();
  }
}

void main().catch(async (error: unknown) => {
  await databaseConnection.close().catch(() => undefined);
  process.stderr.write(`${error instanceof Error ? error.message : "Phase F exercise failed."}\n`);
  process.exitCode = 1;
});
