import "server-only";

import { randomUUID } from "node:crypto";
import {
  and,
  asc,
  count,
  eq,
  gt,
  lte,
  or,
  sql,
} from "drizzle-orm";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js/session";

import type { ReadonlyJsonObject, ReadonlyJsonValue } from "@/ai/canonical-json";
import type { PreparedCoreRunV1 } from "@/ai/core/contracts";
import { aiFailure } from "@/ai/errors";
import {
  noOpAiTelemetrySink,
  type AiTelemetryEvent,
  type AiTelemetrySink,
} from "@/ai/telemetry";
import type { AppDatabase } from "@/db/types";
import {
  aiModelConfig,
  aiRuns,
  editorialRevisions,
  featureFlags,
  users,
} from "@/db/schema";
import {
  createAttemptHistoryEntryV2,
  normalizeAttemptEvidenceV3,
} from "./attempt-evidence";
import type {
  ClaimedLeaseHandleV1,
  AiRunAuthorizedEvidenceV1,
  DispatchAuthorizationOutcomeV1,
  HeartbeatOutcomeV1,
  HumanLifecycleMutationOutcomeV1,
  LateAccountingOutcomeV1,
  LifecycleLockOutcomeV1,
  NormalizedAttemptEvidenceV3,
  RunDispositionInputV1,
  SettlementOutcomeV1,
  WorkerClaimResultV1,
} from "./contracts";
import {
  calculateTextCostBreakdownMicrousdV2,
  type PricingSnapshotV1,
} from "./pricing-policy";
import {
  AI_CLAIM_LEASE_SECONDS_V1,
  automaticRetryBackoffSecondsV1,
  mayAutomaticallyRetryV1,
} from "./retry-policy";

export const CWT_AI_TEXT_CLAIM_BUDGET_ADVISORY_KEY_V1 = Object.freeze([
  1_129_792_594,
  1,
] as const);

type PhaseCPgDatabase = AppDatabase<PostgresJsQueryResultHKT>;
const authoritativeAiActorBrand = Symbol("authoritative-ai-actor");

export interface AuthoritativeAiActorV1 {
  readonly [authoritativeAiActorBrand]: true;
  readonly userId: string;
  readonly role: typeof users.$inferSelect.role;
}

export type HumanAiOperationV1 =
  | "availability"
  | "enqueue"
  | "inspect"
  | "cancel"
  | "manual_retry"
  | "disposition"
  | "config_mutation";

export async function resolveAuthoritativeAiActorV1<
  TQueryResult extends PgQueryResultHKT,
>(
  transaction: AppDatabase<TQueryResult>,
  claim: { readonly userId: string; readonly role: string },
): Promise<AuthoritativeAiActorV1 | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(claim.userId)) return null;
  const selected = await transaction.select({
    userId: users.id,
    role: users.role,
  }).from(users).where(and(
    eq(users.id, claim.userId),
    eq(users.isActive, true),
  )).limit(2);
  const actor = selected.length === 1 ? selected[0] : undefined;
  if (actor === undefined || actor.role !== claim.role) return null;
  return {
    [authoritativeAiActorBrand]: true,
    userId: actor.userId,
    role: actor.role,
  };
}

export function authoritativeAiActorCanPerformV1(
  actor: AuthoritativeAiActorV1,
  operation: HumanAiOperationV1,
  entityType?: "product" | "content" | null,
): boolean {
  if (operation === "config_mutation") return actor.role === "admin";
  if (actor.role === "admin") return true;
  if (operation === "availability" && entityType === undefined) {
    return actor.role === "product_editor" || actor.role === "content_editor";
  }
  if (entityType === undefined || entityType === null) return false;
  const matchingEditor = entityType === "product"
    ? actor.role === "product_editor"
    : actor.role === "content_editor";
  if (operation === "availability" || operation === "enqueue" || operation === "cancel" ||
    operation === "manual_retry") {
    return matchingEditor;
  }
  return matchingEditor || actor.role === "reviewer_publisher";
}
type LifecycleOperation =
  | "claim_or_recover"
  | "heartbeat"
  | "dispatch"
  | "settlement"
  | "cancellation"
  | "manual_retry"
  | "late_accounting"
  | "shutdown_settlement";

export interface AiLifecycleBarrierHooksV1 {
  afterAdvisoryAcquired?(input: {
    readonly operation: LifecycleOperation;
    readonly observedAt: Date;
  }): Promise<void>;
  afterRunMutation?(input: {
    readonly operation: LifecycleOperation;
    readonly runId: string;
    readonly observedAt: Date;
  }): Promise<void>;
  beforeCommit?(input: {
    readonly operation: LifecycleOperation;
    readonly runId: string | null;
    readonly observedAt: Date;
  }): Promise<void>;
}

export interface AiRunRepositoryV1 {
  claimOrRecover(input: {
    readonly executionEnvironment: "local" | "test" | "staging";
    readonly workerId: string;
  }): Promise<WorkerClaimResultV1>;
  heartbeat(input: ClaimedLeaseHandleV1): Promise<HeartbeatOutcomeV1>;
  authorizeProviderDispatch(input: ClaimedLeaseHandleV1 & {
    readonly pricingCurrent: boolean;
  }): Promise<DispatchAuthorizationOutcomeV1>;
  settle(input: ClaimedLeaseHandleV1 & {
    readonly evidence: NormalizedAttemptEvidenceV3<
      import("@/ai/core/contracts").ProtectedApplicationResultEnvelopeV1
    >;
    readonly origin?: "worker" | "shutdown";
  }): Promise<SettlementOutcomeV1>;
  cancelWithinGovernedTransaction(
    transaction: PhaseCPgDatabase,
    input: {
      readonly runId: string;
      readonly actor: AuthoritativeAiActorV1;
      readonly expectedStateVersion: number;
      readonly reason: string;
    },
  ): Promise<HumanLifecycleMutationOutcomeV1>;
  manualRetryWithinGovernedTransaction(
    transaction: PhaseCPgDatabase,
    input: {
      readonly runId: string;
      readonly actor: AuthoritativeAiActorV1;
      readonly expectedStateVersion: number;
    },
  ): Promise<HumanLifecycleMutationOutcomeV1>;
  rejectDispositionWithinGovernedTransaction(
    transaction: PhaseCPgDatabase,
    input: Omit<RunDispositionInputV1, "actorUserId" | "actorRole"> & {
      readonly actor: AuthoritativeAiActorV1;
    },
  ): Promise<HumanLifecycleMutationOutcomeV1>;
  recordCancelledLateAccounting(input: {
    readonly runId: string;
    readonly executionEnvironment: "local" | "test" | "staging";
    readonly cancelledLeaseToken: string;
    readonly expectedStateVersion: number;
    readonly evidence: NormalizedAttemptEvidenceV3<unknown>;
  }): Promise<LateAccountingOutcomeV1>;
  readAuthorizedWithinTransaction(transaction: PhaseCPgDatabase, input: {
    readonly runId: string;
    readonly actor: AuthoritativeAiActorV1;
  }): Promise<AiRunAuthorizedEvidenceV1 | null>;
  readPricingForWorker(runId: string): Promise<{
    readonly provider: string;
    readonly model: string;
    readonly snapshot: PricingSnapshotV1;
  } | null>;
  readCancelledFenceForWorker(input: {
    readonly runId: string;
    readonly cancelledLeaseToken: string;
  }): Promise<{ readonly stateVersion: number } | null>;
  readRunForWorker(runId: string): Promise<unknown | null>;
  findReplayWithinTransaction(
    transaction: PhaseCPgDatabase,
    input: {
      readonly idempotencyKey: string;
      readonly requestedByUserId: string;
      readonly requestFingerprintVersion: 1;
      readonly requestFingerprint: string;
    },
  ): Promise<
    | { readonly kind: "new_request" }
    | { readonly kind: "exact_replay"; readonly row: typeof aiRuns.$inferSelect }
    | { readonly kind: "conflict" }
  >;
  insertPreparedWithinTransaction(
    transaction: PhaseCPgDatabase,
    input: {
      readonly preparedRun: PreparedCoreRunV1;
      readonly executionEnvironment: "local" | "test" | "staging";
      readonly pricingSnapshot: Readonly<Record<string, ReadonlyJsonValue>>;
      readonly estimatedMaxCostMicrousd: number;
      readonly dailyHardLimitMicrousd: number;
      readonly monthlyWarningLimitMicrousd: number;
      readonly monthlyHardLimitMicrousd: number;
    },
  ): Promise<
    | { readonly kind: "inserted"; readonly row: typeof aiRuns.$inferSelect }
    | { readonly kind: "unique_loser"; readonly row: typeof aiRuns.$inferSelect }
  >;
}

function isJsonValue(value: unknown): value is ReadonlyJsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return (prototype === Object.prototype || prototype === null) &&
    Object.values(value).every(isJsonValue);
}

function attemptHistory(value: unknown): readonly ReadonlyJsonValue[] | undefined {
  return Array.isArray(value) && value.every(isJsonValue) ? value : undefined;
}

function jsonRecord(value: unknown): Readonly<Record<string, ReadonlyJsonValue>> | undefined {
  if (!isJsonValue(value) || typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  return Object.freeze(Object.fromEntries(Object.entries(value)));
}

function controlledAttemptIdentity(
  row: typeof aiRuns.$inferSelect,
): import("./attempt-evidence").ControlledAttemptIdentityV1 | null {
  if (!Array.isArray(row.inputSourcesJson)) {
    throw new Error("Stored input source provenance was invalid.");
  }
  const controlled = row.inputSourcesJson.filter((value) => {
    const source = jsonRecord(value);
    const identity = source === undefined ? undefined : jsonRecord(source.sourceIdentity);
    return identity !== undefined && Object.keys(identity)
      .some((key) => key.startsWith("controlled_validation_"));
  });
  if (controlled.length === 0) return null;
  if (controlled.length !== 1) throw new Error("Controlled validation provenance was ambiguous.");
  const source = jsonRecord(controlled[0]);
  const identity = source === undefined ? undefined : jsonRecord(source.sourceIdentity);
  if (source === undefined || identity === undefined || source.sourceClass !== "explicit_human_input" ||
    identity.origin !== "typed_brief" ||
    typeof identity.controlled_validation_fixture_id !== "string" ||
    identity.controlled_validation_fixture_version !== 1 ||
    typeof identity.controlled_validation_fixture_hash !== "string" ||
    !/^[0-9a-f]{64}$/.test(identity.controlled_validation_fixture_hash) ||
    Object.keys(identity).sort().join("\u0000") !== [
      "controlled_validation_fixture_hash",
      "controlled_validation_fixture_id",
      "controlled_validation_fixture_version",
      "origin",
    ].join("\u0000")) {
    throw new Error("Controlled validation provenance was invalid.");
  }
  const safeProviderRequestIdentity: ReadonlyJsonObject = Object.freeze({
    schema: "cwt.provider-request-identity",
    version: 1,
    application_class: row.applicationClass,
    use_case: row.useCase,
    idempotency_key: row.idempotencyKey,
    request_fingerprint_version: row.requestFingerprintVersion,
    request_fingerprint: row.requestFingerprint,
    model_config_id: row.modelConfigId,
    model_config_version: row.modelConfigVersion,
    resolved_config_hash: row.resolvedConfigHash,
    requested_provider: row.requestedProvider,
    requested_model: row.requestedModel,
    parameters_snapshot_json: row.parametersSnapshotJson as ReadonlyJsonObject,
    max_input_tokens: row.maxInputTokens,
    max_output_tokens: row.maxOutputTokens,
    max_attempts: row.maxAttempts,
    prompt_id: row.promptId,
    prompt_version: row.promptVersion,
    prompt_hash: row.promptHash,
    provider_envelope_version: row.providerEnvelopeVersion,
    provider_envelope_hash: row.providerEnvelopeHash,
    input_schema_version: row.inputSchemaVersion,
    output_schema_version: row.outputSchemaVersion,
    policy_version: row.policyVersion,
    input_hash: row.inputHash,
    controlled_validation_fixture_id: identity.controlled_validation_fixture_id,
    controlled_validation_fixture_hash: identity.controlled_validation_fixture_hash,
  });
  return Object.freeze({
    fixtureId: identity.controlled_validation_fixture_id,
    fixtureHash: identity.controlled_validation_fixture_hash,
    safeProviderRequestIdentity,
  });
}

function pricingSnapshot(value: unknown): PricingSnapshotV1 | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  if (record.currency !== "USD" || record.billing_unit_tokens !== 1_000_000 ||
    typeof record.output_microusd_per_unit !== "number" ||
    typeof record.source_id !== "string" || typeof record.source_version !== "string" ||
    typeof record.effective_from !== "string" || typeof record.observed_at !== "string") return undefined;
  if (record.version === 1 && record.formula === "ceil-separate-v1" &&
    typeof record.input_microusd_per_unit === "number") {
    return {
      version: 1,
      currency: "USD",
      billing_unit_tokens: 1_000_000,
      input_microusd_per_unit: record.input_microusd_per_unit,
      output_microusd_per_unit: record.output_microusd_per_unit,
      formula: "ceil-separate-v1",
      source_id: record.source_id,
      source_version: record.source_version,
      effective_from: record.effective_from,
      observed_at: record.observed_at,
    };
  }
  if (record.version !== 2 || record.formula !== "ceil-cache-split-v1" ||
    typeof record.cache_hit_input_microusd_per_unit !== "number" ||
    typeof record.cache_miss_input_microusd_per_unit !== "number" ||
    typeof record.source_url !== "string" || typeof record.source_content_sha256 !== "string" ||
    typeof record.model_alias !== "string" || typeof record.published_model_version !== "string" ||
    record.max_age_seconds !== 86_400) return undefined;
  return {
    version: 2,
    currency: "USD",
    billing_unit_tokens: 1_000_000,
    cache_hit_input_microusd_per_unit: record.cache_hit_input_microusd_per_unit,
    cache_miss_input_microusd_per_unit: record.cache_miss_input_microusd_per_unit,
    output_microusd_per_unit: record.output_microusd_per_unit,
    formula: "ceil-cache-split-v1",
    source_id: record.source_id,
    source_url: record.source_url,
    source_content_sha256: record.source_content_sha256,
    source_version: record.source_version,
    model_alias: record.model_alias,
    published_model_version: record.published_model_version,
    effective_from: record.effective_from,
    observed_at: record.observed_at,
    max_age_seconds: 86_400,
  };
}

function attemptUpperCost(row: typeof aiRuns.$inferSelect): number {
  return row.maxAttempts === 0 ? 0 : Math.ceil(row.estimatedMaxCostMicrousd / row.maxAttempts);
}

function cumulativeTokens(
  history: readonly ReadonlyJsonValue[],
  current: NormalizedAttemptEvidenceV3<unknown>,
): { readonly input: number; readonly output: number; readonly total: number } | null {
  let input = 0;
  let output = 0;
  let total = 0;
  for (const value of history) {
    const entry = jsonRecord(value);
    if (entry === undefined) return null;
    if (entry.dispatch_state !== "dispatched") continue;
    if (typeof entry.input_tokens !== "number" || typeof entry.output_tokens !== "number" ||
      typeof entry.total_tokens !== "number") return null;
    input += entry.input_tokens;
    output += entry.output_tokens;
    total += entry.total_tokens;
  }
  if (current.dispatchState === "dispatched") {
    if (current.usage === null) return null;
    input += current.usage.inputTokens;
    output += current.usage.outputTokens;
    total += current.usage.totalTokens;
  }
  return Number.isSafeInteger(input) && Number.isSafeInteger(output) &&
    Number.isSafeInteger(total) && total === input + output
    ? { input, output, total }
    : null;
}

export async function resolveAuthoritativeRunEntityTypeV1(
  transaction: PhaseCPgDatabase,
  row: typeof aiRuns.$inferSelect,
): Promise<"product" | "content" | null> {
  if (row.targetType === "product_draft") {
    return row.targetProductId !== null && row.targetContentId === null &&
      row.targetRevisionId === null && row.targetLocale === "en" ? "product" : null;
  }
  if (row.targetType === "content_draft") {
    return row.targetContentId !== null && row.targetProductId === null &&
      row.targetRevisionId === null && row.targetLocale === "en" ? "content" : null;
  }
  if (row.targetType !== "editorial_revision" || row.targetRevisionId === null ||
    row.targetProductId !== null || row.targetContentId !== null || row.targetLocale !== null) return null;
  const selected = await transaction.select({
    entityType: editorialRevisions.entityType,
    locale: editorialRevisions.locale,
  }).from(editorialRevisions).where(eq(editorialRevisions.id, row.targetRevisionId)).limit(2);
  const revision = selected.length === 1 ? selected[0] : undefined;
  return revision !== undefined && revision.locale === "en" &&
    (revision.entityType === "product" || revision.entityType === "content")
    ? revision.entityType : null;
}

async function humanCanPerformRunOperationV1(
  transaction: PhaseCPgDatabase,
  row: typeof aiRuns.$inferSelect,
  actor: AuthoritativeAiActorV1,
  operation: Exclude<HumanAiOperationV1, "availability" | "enqueue" | "config_mutation">,
): Promise<boolean> {
  const entityType = await resolveAuthoritativeRunEntityTypeV1(transaction, row);
  if (entityType === null || !authoritativeAiActorCanPerformV1(actor, operation, entityType)) {
    return false;
  }
  if (operation !== "cancel" && operation !== "manual_retry") return true;
  return actor.role === "admin" || row.requestedByUserId === actor.userId;
}

async function manualRetryPolicyAllowsV1(
  transaction: PhaseCPgDatabase,
  row: typeof aiRuns.$inferSelect,
): Promise<boolean> {
  if (row.status !== "failed" || row.retryState !== "not_retryable" ||
    row.attemptCount >= row.maxAttempts ||
    (row.failureCode !== "provider_auth_failed" &&
      row.failureCode !== "provider_quota_exceeded")) return false;
  const feature = await transaction.select({ enabled: featureFlags.enabled }).from(featureFlags)
    .where(eq(featureFlags.key, "ai")).limit(2);
  const config = await transaction.select({ enabled: aiModelConfig.enabled }).from(aiModelConfig)
    .where(eq(aiModelConfig.id, row.modelConfigId)).limit(1);
  if (feature.length !== 1 || feature[0]?.enabled !== true || config[0]?.enabled !== true) {
    return false;
  }
  if (row.executionEnvironment !== "staging") return true;
  if (row.budgetChargeDay === null || row.budgetChargeMonth === null) return false;
  const reservation = Math.max(0, row.runCostLimitMicrousd - row.budgetAccountedCostMicrousd);
  const totals = await transaction.select({
    day: sql<number>`coalesce(sum(${aiRuns.budgetAccountedCostMicrousd} + ${aiRuns.budgetReservedCostMicrousd}) filter (where ${aiRuns.budgetChargeDay} = ${row.budgetChargeDay}), 0)`,
    month: sql<number>`coalesce(sum(${aiRuns.budgetAccountedCostMicrousd} + ${aiRuns.budgetReservedCostMicrousd}) filter (where ${aiRuns.budgetChargeMonth} = ${row.budgetChargeMonth}), 0)`,
  }).from(aiRuns).where(eq(aiRuns.executionEnvironment, "staging"));
  const total = totals[0];
  return total !== undefined &&
    Number(total.day) + reservation <= row.dailyHardLimitMicrousd &&
    Number(total.month) + reservation <= row.monthlyHardLimitMicrousd;
}

function humanMutationProjection(row: typeof aiRuns.$inferSelect) {
  const targetId = row.targetProductId ?? row.targetContentId ?? row.targetRevisionId;
  if (targetId === null) throw new Error("Stored AI run target was invalid.");
  const status = summaryFromRow(row).status;
  const retryState = (() => {
    switch (row.retryState) {
      case "none":
      case "scheduled":
      case "exhausted":
      case "not_retryable": return row.retryState;
      default: throw new Error("Stored AI run retry state was invalid.");
    }
  })();
  return {
    runId: row.id,
    targetType: row.targetType,
    targetId,
    status,
    retryState,
    stateVersion: row.stateVersion,
    candidateHash: row.candidateHash,
    humanDisposition: row.humanDisposition,
    qualityRating: row.qualityRating,
    qualityLabels: Object.freeze([...row.qualityLabels]),
  };
}

function claimedRowProjection(
  row: typeof aiRuns.$inferSelect,
  claimAuthority: import("@/ai/core/contracts").ClaimedTargetOwnerAuthorityV1,
) {
  return {
    claimAuthority,
    runId: row.id,
    applicationClass: row.applicationClass,
    capability: row.capability,
    useCase: row.useCase,
    idempotencyKey: row.idempotencyKey,
    requestFingerprintVersion: row.requestFingerprintVersion,
    requestFingerprint: row.requestFingerprint,
    targetType: row.targetType,
    targetProductId: row.targetProductId,
    targetContentId: row.targetContentId,
    targetRevisionId: row.targetRevisionId,
    targetLocale: row.targetLocale,
    expectedTargetVersion: row.expectedTargetVersion,
    targetSnapshotHash: row.targetSnapshotHash,
    modelConfigId: row.modelConfigId,
    modelConfigVersion: row.modelConfigVersion,
    resolvedConfigHash: row.resolvedConfigHash,
    requestedProvider: row.requestedProvider,
    actualProvider: row.actualProvider,
    requestedModel: row.requestedModel,
    parametersSnapshotJson: row.parametersSnapshotJson,
    maxInputTokens: row.maxInputTokens,
    maxOutputTokens: row.maxOutputTokens,
    maxAttempts: row.maxAttempts,
    runCostLimitMicrousd: row.runCostLimitMicrousd,
    promptId: row.promptId,
    promptVersion: row.promptVersion,
    promptHash: row.promptHash,
    providerEnvelopeVersion: row.providerEnvelopeVersion,
    providerEnvelopeHash: row.providerEnvelopeHash,
    inputSchemaVersion: row.inputSchemaVersion,
    outputSchemaVersion: row.outputSchemaVersion,
    policyVersion: row.policyVersion,
    inputContextJson: row.inputContextJson,
    inputSourcesJson: row.inputSourcesJson,
    inputHash: row.inputHash,
    status: row.status,
    retryState: row.retryState,
    attemptCount: row.attemptCount,
    leaseOwner: row.leaseOwner,
    leaseToken: row.leaseToken,
    leaseExpiresAt: row.leaseExpiresAt,
    stateVersion: row.stateVersion,
    activeAttemptDispatchedAt: row.activeAttemptDispatchedAt,
    providerDispatchedAt: row.providerDispatchedAt,
  };
}

async function resolveClaimedTargetOwnerAuthorityV1(
  transaction: PhaseCPgDatabase,
  row: typeof aiRuns.$inferSelect,
): Promise<import("@/ai/core/contracts").ClaimedTargetOwnerAuthorityV1 | null> {
  if (row.targetType === "product_draft") {
    return row.targetProductId !== null && row.targetContentId === null &&
      row.targetRevisionId === null && row.targetLocale === "en"
      ? Object.freeze({ version: 1, owner: "product" }) : null;
  }
  if (row.targetType === "content_draft") {
    return row.targetProductId === null && row.targetContentId !== null &&
      row.targetRevisionId === null && row.targetLocale === "en"
      ? Object.freeze({ version: 1, owner: "content" }) : null;
  }
  if (row.targetType !== "editorial_revision" || row.targetProductId !== null ||
    row.targetContentId !== null || row.targetRevisionId === null || row.targetLocale !== null) {
    return null;
  }
  const revisions = await transaction.select({
    entityType: editorialRevisions.entityType,
    locale: editorialRevisions.locale,
  }).from(editorialRevisions).where(eq(editorialRevisions.id, row.targetRevisionId)).limit(2);
  const revision = revisions.length === 1 ? revisions[0] : undefined;
  return revision !== undefined && revision.locale === "en" &&
    (revision.entityType === "product" || revision.entityType === "content")
    ? Object.freeze({ version: 1, owner: revision.entityType }) : null;
}

function shanghaiPeriods(observedAt: Date): { readonly day: string; readonly month: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(observedAt);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (year === undefined || month === undefined || day === undefined) {
    throw new Error("Database timestamp could not be projected to Asia/Shanghai.");
  }
  return { day: `${year}-${month}-${day}`, month: `${year}-${month}-01` };
}

async function tryLifecycleLock(
  transaction: PhaseCPgDatabase,
  knownLeaseExpiresAt: Date | null,
): Promise<LifecycleLockOutcomeV1> {
  const result = await transaction.execute<{
    readonly observedAt: string;
    readonly acquired: boolean;
  }>(sql`
    select
      clock_timestamp() as "observedAt",
      pg_try_advisory_xact_lock(
        ${CWT_AI_TEXT_CLAIM_BUDGET_ADVISORY_KEY_V1[0]},
        ${CWT_AI_TEXT_CLAIM_BUDGET_ADVISORY_KEY_V1[1]}
      ) as acquired
  `);
  const row = result[0];
  const observedAt = row === undefined ? new Date(Number.NaN) : new Date(row.observedAt);
  if (row === undefined || !Number.isFinite(observedAt.getTime()) || typeof row.acquired !== "boolean") {
    throw new Error("PostgreSQL lifecycle lock observation was invalid.");
  }
  return row.acquired
    ? { kind: "acquired", observedAt }
    : { kind: "lock_busy", observedAt, currentLeaseExpiresAt: knownLeaseExpiresAt };
}

function summaryFromRow(row: typeof aiRuns.$inferSelect) {
  const status = (() => {
    switch (row.status) {
      case "pending":
      case "processing":
      case "draft_ready":
      case "failed":
      case "cancelled": return row.status;
      default: throw new Error("Stored AI run status was invalid.");
    }
  })();
  return {
    runId: row.id,
    applicationClass: "draft_assistance" as const,
    useCase: row.useCase,
    status,
    queuedAt: row.queuedAt.toISOString(),
  };
}

function targetColumns(association: PreparedCoreRunV1["association"]): {
  readonly targetType: string;
  readonly targetProductId: string | null;
  readonly targetContentId: string | null;
  readonly targetRevisionId: string | null;
  readonly targetLocale: string | null;
  readonly expectedTargetVersion: number;
} {
  const value = association.value;
  if (value.targetType === "product_draft" && typeof value.targetProductId === "string" &&
    value.targetLocale === "en" && typeof value.expectedTargetVersion === "number") {
    return {
      targetType: "product_draft",
      targetProductId: value.targetProductId,
      targetContentId: null,
      targetRevisionId: null,
      targetLocale: "en",
      expectedTargetVersion: value.expectedTargetVersion,
    };
  }
  if (value.targetType === "content_draft" && typeof value.targetContentId === "string" &&
    value.targetLocale === "en" && typeof value.expectedTargetVersion === "number") {
    return {
      targetType: "content_draft",
      targetProductId: null,
      targetContentId: value.targetContentId,
      targetRevisionId: null,
      targetLocale: "en",
      expectedTargetVersion: value.expectedTargetVersion,
    };
  }
  if (value.targetType === "editorial_revision" && typeof value.targetRevisionId === "string" &&
    typeof value.expectedTargetVersion === "number") {
    return {
      targetType: "editorial_revision",
      targetProductId: null,
      targetContentId: null,
      targetRevisionId: value.targetRevisionId,
      targetLocale: null,
      expectedTargetVersion: value.expectedTargetVersion,
    };
  }
  throw new Error("Prepared run target columns were invalid.");
}

export function createAiRunRepositoryV1(
  database: PhaseCPgDatabase,
  options: {
    readonly barriers?: AiLifecycleBarrierHooksV1;
    readonly telemetry?: AiTelemetrySink;
    readonly uuid?: () => string;
  } = {},
): AiRunRepositoryV1 {
  const barriers = options.barriers;
  const telemetry = options.telemetry ?? noOpAiTelemetrySink;
  const uuid = options.uuid ?? randomUUID;
  const emitPostCommit = (event: AiTelemetryEvent | undefined): void => {
    if (event === undefined) return;
    try {
      telemetry.emit(event);
    } catch {
      // Telemetry is deliberately non-critical and never reverses durable truth.
    }
  };
  return {
    async claimOrRecover(input) {
      let postCommitEvent: AiTelemetryEvent | undefined;
      const outcome = await database.transaction(async (transaction): Promise<WorkerClaimResultV1> => {
        const lock = await tryLifecycleLock(transaction, null);
        if (lock.kind === "lock_busy") return { kind: "idle", reason: "lock_busy" };
        await barriers?.afterAdvisoryAcquired?.({ operation: "claim_or_recover", observedAt: lock.observedAt });

        const expiredRows = await transaction.select().from(aiRuns).where(and(
          eq(aiRuns.executionEnvironment, input.executionEnvironment),
          eq(aiRuns.status, "processing"),
          lte(aiRuns.leaseExpiresAt, lock.observedAt),
        )).orderBy(asc(aiRuns.leaseExpiresAt), asc(aiRuns.id)).limit(1)
          .for("update", { skipLocked: true, of: aiRuns });
        const expired = expiredRows[0];
        if (expired !== undefined) {
          const history = attemptHistory(expired.attemptHistoryJson);
          if (history === undefined) throw new Error("Stored attempt history was invalid.");
          const dispatched = expired.activeAttemptDispatchedAt !== null;
          const failure = aiFailure(dispatched ? "provider_transport_error" : "claim_expired");
          if (failure.ok) throw new Error("Static recovery failure was invalid.");
          const evidence = normalizeAttemptEvidenceV3<unknown>({
            version: 3,
            dispatchState: dispatched ? "dispatched" : "not_dispatched",
            protectedResult: null,
            error: failure.error,
            responseStatus: dispatched ? "transport_error" : "unknown",
            retryClass: "same_provider_transient",
            returnedModel: null,
            completion: null,
            usage: null,
            providerHttpStatus: null,
            providerErrorCode: null,
            providerRequestId: null,
            providerSystemFingerprint: null,
            durationMs: 0,
          });
          if (!evidence.ok) throw new Error("Recovery evidence normalization failed.");
          const attemptUpper = expired.maxAttempts === 0
            ? 0 : Math.ceil(expired.estimatedMaxCostMicrousd / expired.maxAttempts);
          const entry = createAttemptHistoryEntryV2({
            attempt: expired.attemptCount,
            outcome: expired.attemptCount < expired.maxAttempts ? "retry_scheduled" : "failed",
            requestedProvider: expired.requestedProvider,
            actualProvider: expired.actualProvider,
            requestedModel: expired.requestedModel,
            providerEnvelopeVersion: expired.providerEnvelopeVersion,
            providerEnvelopeHash: expired.providerEnvelopeHash,
            dispatchedAt: expired.activeAttemptDispatchedAt,
            respondedAt: null,
            attemptUpperCostMicrousd: attemptUpper,
            actualCostMicrousd: 0,
            accountedCostMicrousd: dispatched ? attemptUpper : 0,
            actualCostComplete: !dispatched,
            evidence: evidence.value,
            candidateHash: null,
            controlledIdentity: controlledAttemptIdentity(expired),
          });
          if (!entry.ok) throw new Error("Recovery attempt entry failed.");
          const retry = expired.attemptCount < expired.maxAttempts;
          const accounted = expired.budgetAccountedCostMicrousd +
            (dispatched && expired.executionEnvironment === "staging" ? attemptUpper : 0);
          const reserved = retry && input.executionEnvironment === "staging"
            ? Math.max(0, expired.runCostLimitMicrousd - accounted) : 0;
          await transaction.update(aiRuns).set({
            status: retry ? "pending" : "failed",
            retryState: retry ? "scheduled" : "exhausted",
            nextAttemptAt: retry
              ? new Date(lock.observedAt.getTime() + automaticRetryBackoffSecondsV1(expired.attemptCount) * 1_000)
              : null,
            leaseOwner: null,
            leaseToken: null,
            leaseAcquiredAt: null,
            leaseExpiresAt: null,
            activeAttemptDispatchedAt: null,
            attemptHistoryJson: [...history, entry.value],
            providerResponseStatus: evidence.value.responseStatus,
            failureCode: failure.error.code,
            failureDetail: "The prior Worker lease expired before a durable response was recorded.",
            completedAt: retry ? null : lock.observedAt,
            costAccountingState: retry ? "reserved" : "final",
            budgetAccountedCostMicrousd: accounted,
            budgetReservedCostMicrousd: reserved,
            actualCostComplete: expired.actualCostComplete && !dispatched,
            stateVersion: expired.stateVersion + 1,
            updatedAt: lock.observedAt,
          }).where(and(eq(aiRuns.id, expired.id), eq(aiRuns.stateVersion, expired.stateVersion)));
          await barriers?.afterRunMutation?.({ operation: "claim_or_recover", runId: expired.id, observedAt: lock.observedAt });
          await barriers?.beforeCommit?.({ operation: "claim_or_recover", runId: expired.id, observedAt: lock.observedAt });
          postCommitEvent = {
            schemaVersion: 1,
            eventName: "ai_lease_recovered",
            applicationClass: expired.applicationClass,
            useCase: expired.useCase,
            capability: "text",
            environment: expired.executionEnvironment,
            status: retry ? "pending" : "failed",
            attemptCount: expired.attemptCount,
          };
          return { kind: "recovered", runId: expired.id };
        }

        const feature = await transaction.select({ enabled: featureFlags.enabled })
          .from(featureFlags).where(eq(featureFlags.key, "ai")).limit(2);
        if (feature.length !== 1 || feature[0]?.enabled !== true) return { kind: "idle", reason: "disabled" };
        const activeRows = await transaction.select({ value: count() }).from(aiRuns).where(and(
          eq(aiRuns.executionEnvironment, input.executionEnvironment),
          eq(aiRuns.status, "processing"),
          gt(aiRuns.leaseExpiresAt, lock.observedAt),
        ));
        if ((activeRows[0]?.value ?? 0) >= 2) return { kind: "idle", reason: "concurrency" };
        const dueRows = await transaction.select({ id: aiRuns.id }).from(aiRuns)
          .innerJoin(aiModelConfig, and(
            eq(aiModelConfig.id, aiRuns.modelConfigId),
            eq(aiModelConfig.enabled, true),
          )).where(and(
            eq(aiRuns.executionEnvironment, input.executionEnvironment),
            eq(aiRuns.status, "pending"),
            lte(aiRuns.nextAttemptAt, lock.observedAt),
          )).orderBy(asc(aiRuns.nextAttemptAt), asc(aiRuns.queuedAt), asc(aiRuns.id)).limit(1)
          .for("update", { skipLocked: true, of: aiRuns });
        const dueId = dueRows[0]?.id;
        if (dueId === undefined) return { kind: "idle", reason: "empty" };
        const candidates = await transaction.select().from(aiRuns).where(eq(aiRuns.id, dueId)).limit(1);
        const due = candidates[0];
        if (due === undefined) return { kind: "idle", reason: "empty" };
        const claimAuthority = await resolveClaimedTargetOwnerAuthorityV1(transaction, due);
        if (claimAuthority === null) return { kind: "idle", reason: "empty" };
        const periods = due.budgetChargeDay === null ? shanghaiPeriods(lock.observedAt) : null;
        const additionalReservation = input.executionEnvironment === "staging"
          ? Math.max(0, due.runCostLimitMicrousd - due.budgetAccountedCostMicrousd - due.budgetReservedCostMicrousd)
          : 0;
        if (input.executionEnvironment === "staging") {
          const totals = await transaction.select({
            day: sql<number>`coalesce(sum(${aiRuns.budgetAccountedCostMicrousd} + ${aiRuns.budgetReservedCostMicrousd}) filter (where ${aiRuns.budgetChargeDay} = ${periods?.day ?? due.budgetChargeDay}), 0)`,
            month: sql<number>`coalesce(sum(${aiRuns.budgetAccountedCostMicrousd} + ${aiRuns.budgetReservedCostMicrousd}) filter (where ${aiRuns.budgetChargeMonth} = ${periods?.month ?? due.budgetChargeMonth}), 0)`,
          }).from(aiRuns).where(eq(aiRuns.executionEnvironment, "staging"));
          const total = totals[0];
          if (total === undefined || Number(total.day) + additionalReservation > due.dailyHardLimitMicrousd ||
            Number(total.month) + additionalReservation > due.monthlyHardLimitMicrousd) {
            postCommitEvent = {
              schemaVersion: 1,
              eventName: "ai_budget_hard_stop",
              applicationClass: due.applicationClass,
              useCase: due.useCase,
              capability: "text",
              environment: due.executionEnvironment,
              status: "pending",
              attemptCount: due.attemptCount,
            };
            return { kind: "idle", reason: "budget" };
          }
          if (Number(total.month) < due.monthlyWarningLimitMicrousd &&
            Number(total.month) + additionalReservation >= due.monthlyWarningLimitMicrousd) {
            postCommitEvent = {
              schemaVersion: 1,
              eventName: "ai_budget_monthly_warning_crossed",
              applicationClass: due.applicationClass,
              useCase: due.useCase,
              capability: "text",
              environment: due.executionEnvironment,
              status: "processing",
              attemptCount: due.attemptCount + 1,
            };
          }
        }
        const leaseToken = uuid();
        const updated = await transaction.update(aiRuns).set({
          status: "processing",
          retryState: "none",
          attemptCount: due.attemptCount + 1,
          nextAttemptAt: null,
          leaseOwner: input.workerId,
          leaseToken,
          leaseAcquiredAt: lock.observedAt,
          leaseExpiresAt: new Date(lock.observedAt.getTime() + AI_CLAIM_LEASE_SECONDS_V1 * 1_000),
          activeAttemptDispatchedAt: null,
          returnedModel: null,
          providerResponseStatus: "not_dispatched",
          providerHttpStatus: null,
          providerErrorCode: null,
          providerRequestId: null,
          failureCode: null,
          failureDetail: null,
          budgetChargeDay: periods?.day ?? due.budgetChargeDay,
          budgetChargeMonth: periods?.month ?? due.budgetChargeMonth,
          budgetReservedCostMicrousd: due.budgetReservedCostMicrousd + additionalReservation,
          costAccountingState: "reserved",
          stateVersion: due.stateVersion + 1,
          updatedAt: lock.observedAt,
        }).where(and(eq(aiRuns.id, due.id), eq(aiRuns.stateVersion, due.stateVersion))).returning();
        const row = updated[0];
        if (row === undefined) return { kind: "idle", reason: "empty" };
        await barriers?.afterRunMutation?.({ operation: "claim_or_recover", runId: row.id, observedAt: lock.observedAt });
        await barriers?.beforeCommit?.({ operation: "claim_or_recover", runId: row.id, observedAt: lock.observedAt });
        if (postCommitEvent === undefined) {
          postCommitEvent = {
            schemaVersion: 1,
            eventName: "ai_run_claimed",
            applicationClass: row.applicationClass,
            useCase: row.useCase,
            capability: "text",
            environment: row.executionEnvironment,
            status: "processing",
            attemptCount: row.attemptCount,
          };
        }
        return { kind: "claimed", row: claimedRowProjection(row, claimAuthority) };
      });
      emitPostCommit(postCommitEvent);
      return outcome;
    },

    async heartbeat(input) {
      return database.transaction(async (transaction): Promise<HeartbeatOutcomeV1> => {
        const lock = await tryLifecycleLock(transaction, input.leaseExpiresAt);
        if (lock.kind === "lock_busy") return lock;
        await barriers?.afterAdvisoryAcquired?.({ operation: "heartbeat", observedAt: lock.observedAt });
        const expiresAt = new Date(lock.observedAt.getTime() + AI_CLAIM_LEASE_SECONDS_V1 * 1_000);
        const rows = await transaction.update(aiRuns).set({
          leaseExpiresAt: expiresAt,
          stateVersion: input.stateVersion + 1,
          updatedAt: lock.observedAt,
        }).where(and(
          eq(aiRuns.id, input.runId),
          eq(aiRuns.executionEnvironment, input.executionEnvironment),
          eq(aiRuns.status, "processing"),
          eq(aiRuns.leaseOwner, input.leaseOwner),
          eq(aiRuns.leaseToken, input.leaseToken),
          eq(aiRuns.stateVersion, input.stateVersion),
          gt(aiRuns.leaseExpiresAt, new Date(lock.observedAt.getTime() + 10_000)),
        )).returning({ stateVersion: aiRuns.stateVersion });
        const row = rows[0];
        if (row === undefined) return { kind: "lease_lost_or_unsafe", observedAt: lock.observedAt };
        await barriers?.afterRunMutation?.({ operation: "heartbeat", runId: input.runId, observedAt: lock.observedAt });
        await barriers?.beforeCommit?.({ operation: "heartbeat", runId: input.runId, observedAt: lock.observedAt });
        return { kind: "renewed", observedAt: lock.observedAt, leaseExpiresAt: expiresAt, stateVersion: row.stateVersion };
      });
    },

    async authorizeProviderDispatch(input) {
      return database.transaction(async (transaction): Promise<DispatchAuthorizationOutcomeV1> => {
        const lock = await tryLifecycleLock(transaction, input.leaseExpiresAt);
        if (lock.kind === "lock_busy") return lock;
        await barriers?.afterAdvisoryAcquired?.({ operation: "dispatch", observedAt: lock.observedAt });
        const selected = await transaction.select().from(aiRuns).where(and(
          eq(aiRuns.id, input.runId),
          eq(aiRuns.executionEnvironment, input.executionEnvironment),
        )).limit(1).for("update", { of: aiRuns });
        const current = selected[0];
        if (current === undefined || current.status !== "processing" ||
          current.leaseOwner !== input.leaseOwner || current.leaseToken !== input.leaseToken ||
          current.stateVersion !== input.stateVersion || current.leaseExpiresAt === null ||
          current.leaseExpiresAt <= lock.observedAt || current.activeAttemptDispatchedAt !== null ||
          (current.actualProvider !== null && current.actualProvider !== current.requestedProvider)) {
          return { kind: "lease_lost_or_unsafe", observedAt: lock.observedAt };
        }
        if (!input.pricingCurrent) {
          const history = attemptHistory(current.attemptHistoryJson);
          if (history === undefined) throw new Error("Stored attempt history was invalid.");
          const failure = aiFailure("pricing_stale");
          if (failure.ok) throw new Error("Static pricing failure was invalid.");
          const evidence = normalizeAttemptEvidenceV3<unknown>({
            version: 3,
            dispatchState: "not_dispatched",
            protectedResult: null,
            error: failure.error,
            responseStatus: "not_dispatched",
            retryClass: "not_retryable",
            returnedModel: null,
            completion: null,
            usage: null,
            providerHttpStatus: null,
            providerErrorCode: null,
            providerRequestId: null,
            providerSystemFingerprint: null,
            durationMs: 0,
          });
          if (!evidence.ok) throw new Error("Pricing failure evidence normalization failed.");
          const entry = createAttemptHistoryEntryV2({
            attempt: current.attemptCount,
            outcome: "failed",
            requestedProvider: current.requestedProvider,
            actualProvider: current.actualProvider,
            requestedModel: current.requestedModel,
            providerEnvelopeVersion: current.providerEnvelopeVersion,
            providerEnvelopeHash: current.providerEnvelopeHash,
            dispatchedAt: null,
            respondedAt: null,
            attemptUpperCostMicrousd: attemptUpperCost(current),
            actualCostMicrousd: 0,
            accountedCostMicrousd: 0,
            actualCostComplete: true,
            evidence: evidence.value,
            candidateHash: null,
            controlledIdentity: controlledAttemptIdentity(current),
          });
          if (!entry.ok) throw new Error("Pricing failure attempt entry failed.");
          await transaction.update(aiRuns).set({
            status: "failed",
            retryState: "not_retryable",
            nextAttemptAt: null,
            leaseOwner: null,
            leaseToken: null,
            leaseAcquiredAt: null,
            leaseExpiresAt: null,
            activeAttemptDispatchedAt: null,
            attemptHistoryJson: [...history, entry.value],
            providerResponseStatus: "not_dispatched",
            failureCode: "pricing_stale",
            failureDetail: "The immutable pricing source is no longer current.",
            completedAt: lock.observedAt,
            budgetReservedCostMicrousd: 0,
            costAccountingState: "final",
            stateVersion: current.stateVersion + 1,
            updatedAt: lock.observedAt,
          }).where(and(eq(aiRuns.id, current.id), eq(aiRuns.stateVersion, current.stateVersion)));
          await barriers?.afterRunMutation?.({ operation: "dispatch", runId: current.id, observedAt: lock.observedAt });
          await barriers?.beforeCommit?.({ operation: "dispatch", runId: current.id, observedAt: lock.observedAt });
          return { kind: "pricing_stale", observedAt: lock.observedAt };
        }
        const rows = await transaction.update(aiRuns).set({
          activeAttemptDispatchedAt: lock.observedAt,
          providerDispatchedAt: sql`coalesce(
            ${aiRuns.providerDispatchedAt},
            ${lock.observedAt.toISOString()}::timestamptz
          )`,
          actualProvider: sql`coalesce(${aiRuns.actualProvider}, ${aiRuns.requestedProvider})`,
          stateVersion: input.stateVersion + 1,
          updatedAt: lock.observedAt,
        }).where(and(
          eq(aiRuns.id, input.runId),
          eq(aiRuns.executionEnvironment, input.executionEnvironment),
          eq(aiRuns.status, "processing"),
          eq(aiRuns.leaseOwner, input.leaseOwner),
          eq(aiRuns.leaseToken, input.leaseToken),
          eq(aiRuns.stateVersion, input.stateVersion),
          gt(aiRuns.leaseExpiresAt, lock.observedAt),
          sql`${aiRuns.activeAttemptDispatchedAt} is null`,
          or(
            sql`${aiRuns.actualProvider} is null`,
            sql`${aiRuns.actualProvider} = ${aiRuns.requestedProvider}`,
          ),
        )).returning({
          stateVersion: aiRuns.stateVersion,
          leaseExpiresAt: aiRuns.leaseExpiresAt,
          activeAttemptDispatchedAt: aiRuns.activeAttemptDispatchedAt,
        });
        const row = rows[0];
        if (row === undefined || row.leaseExpiresAt === null || row.activeAttemptDispatchedAt === null) {
          return { kind: "lease_lost_or_unsafe", observedAt: lock.observedAt };
        }
        await barriers?.afterRunMutation?.({ operation: "dispatch", runId: input.runId, observedAt: lock.observedAt });
        await barriers?.beforeCommit?.({ operation: "dispatch", runId: input.runId, observedAt: lock.observedAt });
        return {
          kind: "authorized",
          observedAt: lock.observedAt,
          dispatchedAt: row.activeAttemptDispatchedAt,
          leaseExpiresAt: row.leaseExpiresAt,
          stateVersion: row.stateVersion,
        };
      });
    },

    async settle(input) {
      return database.transaction(async (transaction): Promise<SettlementOutcomeV1> => {
        const lock = await tryLifecycleLock(transaction, input.leaseExpiresAt);
        if (lock.kind === "lock_busy") return lock;
        const operation = input.origin === "shutdown" ? "shutdown_settlement" : "settlement";
        await barriers?.afterAdvisoryAcquired?.({ operation, observedAt: lock.observedAt });
        const selected = await transaction.select().from(aiRuns).where(and(
          eq(aiRuns.id, input.runId),
          eq(aiRuns.executionEnvironment, input.executionEnvironment),
        )).limit(1).for("update", { of: aiRuns });
        const row = selected[0];
        if (row?.status === "cancelled") return { kind: "cancelled_fence", observedAt: lock.observedAt };
        if (row === undefined || row.status !== "processing" || row.leaseOwner !== input.leaseOwner ||
          row.leaseToken !== input.leaseToken || row.stateVersion !== input.stateVersion ||
          row.leaseExpiresAt === null || row.leaseExpiresAt <= lock.observedAt ||
          (input.evidence.dispatchState === "dispatched") !==
            (row.activeAttemptDispatchedAt !== null)) {
          return { kind: "lease_lost_or_unsafe", observedAt: lock.observedAt };
        }
        const history = attemptHistory(row.attemptHistoryJson);
        if (history === undefined) throw new Error("Stored attempt history was invalid.");
        const attemptUpper = attemptUpperCost(row);
        const usagePresent = input.evidence.usage !== null;
        const storedPricing = pricingSnapshot(row.pricingSnapshotJson);
        if (storedPricing === undefined) throw new Error("Stored pricing snapshot was invalid.");
        const calculated = usagePresent ? calculateTextCostBreakdownMicrousdV2({
          inputTokens: input.evidence.usage?.inputTokens ?? 0,
          outputTokens: input.evidence.usage?.outputTokens ?? 0,
          ...(input.evidence.usage?.cacheHitInputTokens === undefined ? {} : {
            cacheHitInputTokens: input.evidence.usage.cacheHitInputTokens,
          }),
          ...(input.evidence.usage?.cacheMissInputTokens === undefined ? {} : {
            cacheMissInputTokens: input.evidence.usage.cacheMissInputTokens,
          }),
          pricing: storedPricing,
        }) : null;
        if (calculated !== null && !calculated.ok) throw new Error("Stored pricing calculation failed.");
        const actualAttemptCost = row.executionEnvironment === "staging" && calculated?.ok === true
          ? calculated.value.costMicrousd : 0;
        const usageComplete = calculated?.ok === true && calculated.value.complete;
        const accountedAttemptCost = row.executionEnvironment === "staging"
          ? usageComplete ? actualAttemptCost : attemptUpper
          : 0;
        const accounted = row.budgetAccountedCostMicrousd + accountedAttemptCost;
        const actual = row.actualCostMicrousd + actualAttemptCost;
        const overrun = accounted > row.runCostLimitMicrousd;
        const protectedResult = input.evidence.protectedResult;
        const transientRetry = input.evidence.error !== null && mayAutomaticallyRetryV1({
          retryClass: input.evidence.retryClass,
          attemptCount: row.attemptCount,
          maxAttempts: row.maxAttempts,
          remainingReservationMicrousd: Math.max(0, row.runCostLimitMicrousd - accounted),
          nextAttemptUpperMicrousd: attemptUpper,
        });
        const status = overrun ? "failed" : protectedResult !== null
          ? "draft_ready" : transientRetry ? "pending" : "failed";
        const retryState = status === "pending" ? "scheduled" : status === "failed"
          ? row.attemptCount >= row.maxAttempts && input.evidence.retryClass === "same_provider_transient"
            ? "exhausted" : "not_retryable"
          : "none";
        const failureCode = overrun ? "run_cost_limit_exceeded" : input.evidence.error?.code ?? null;
        const entry = createAttemptHistoryEntryV2({
          attempt: row.attemptCount,
          outcome: status === "draft_ready" ? "draft_ready" : status === "pending" ? "retry_scheduled" : "failed",
          requestedProvider: row.requestedProvider,
          actualProvider: row.actualProvider,
          requestedModel: row.requestedModel,
          providerEnvelopeVersion: row.providerEnvelopeVersion,
          providerEnvelopeHash: row.providerEnvelopeHash,
          dispatchedAt: row.activeAttemptDispatchedAt,
          respondedAt: lock.observedAt,
          attemptUpperCostMicrousd: attemptUpper,
          actualCostMicrousd: actualAttemptCost,
          accountedCostMicrousd: accountedAttemptCost,
          actualCostComplete: usageComplete,
          evidence: input.evidence,
          candidateHash: status === "draft_ready" ? protectedResult?.hash ?? null : null,
          controlledIdentity: controlledAttemptIdentity(row),
        });
        if (!entry.ok) throw new Error("Settlement attempt entry failed.");
        const nextAttemptAt = status === "pending"
          ? new Date(lock.observedAt.getTime() + automaticRetryBackoffSecondsV1(row.attemptCount) * 1_000)
          : null;
        const reserved = status === "pending" && row.executionEnvironment === "staging"
          ? Math.max(0, row.runCostLimitMicrousd - accounted) : 0;
        const tokens = cumulativeTokens(history, input.evidence);
        const updated = await transaction.update(aiRuns).set({
          status,
          retryState,
          nextAttemptAt,
          leaseOwner: null,
          leaseToken: null,
          leaseAcquiredAt: null,
          leaseExpiresAt: null,
          activeAttemptDispatchedAt: null,
          attemptHistoryJson: [...history, entry.value],
          candidateJson: status === "draft_ready" ? protectedResult?.value ?? null : null,
          candidateHash: status === "draft_ready" ? protectedResult?.hash ?? null : null,
          returnedModel: input.evidence.returnedModel,
          providerResponseStatus: input.evidence.responseStatus,
          providerHttpStatus: input.evidence.providerHttpStatus,
          providerErrorCode: input.evidence.providerErrorCode,
          providerRequestId: input.evidence.providerRequestId,
          failureCode,
          failureDetail: failureCode === null ? null : "The AI attempt ended with a typed failure.",
          generatedAt: lock.observedAt,
          completedAt: status === "pending" ? null : lock.observedAt,
          generationDurationMs: row.generationDurationMs + input.evidence.durationMs,
          inputTokens: tokens?.input ?? null,
          outputTokens: tokens?.output ?? null,
          totalTokens: tokens?.total ?? null,
          actualCostMicrousd: actual,
          actualCostComplete: row.actualCostComplete && usageComplete,
          budgetAccountedCostMicrousd: accounted,
          budgetReservedCostMicrousd: reserved,
          costAccountingState: status === "pending" ? "reserved" : "final",
          stateVersion: row.stateVersion + 1,
          updatedAt: lock.observedAt,
        }).where(and(eq(aiRuns.id, row.id), eq(aiRuns.stateVersion, row.stateVersion))).returning({
          stateVersion: aiRuns.stateVersion,
        });
        const result = updated[0];
        if (result === undefined) return { kind: "lease_lost_or_unsafe", observedAt: lock.observedAt };
        await barriers?.afterRunMutation?.({ operation, runId: row.id, observedAt: lock.observedAt });
        await barriers?.beforeCommit?.({ operation, runId: row.id, observedAt: lock.observedAt });
        return { kind: "settled", status, retryState, stateVersion: result.stateVersion };
      });
    },

    async cancelWithinGovernedTransaction(transaction, input) {
      const lock = await tryLifecycleLock(transaction, null);
      if (lock.kind === "lock_busy") return lock;
      await barriers?.afterAdvisoryAcquired?.({ operation: "cancellation", observedAt: lock.observedAt });
      const selected = await transaction.select().from(aiRuns).where(eq(aiRuns.id, input.runId))
        .limit(1).for("update", { of: aiRuns });
      const row = selected[0];
      if (row === undefined || !await humanCanPerformRunOperationV1(
        transaction, row, input.actor, "cancel",
      )) return { kind: "not_found_or_unauthorized" };
      if (row.stateVersion !== input.expectedStateVersion) return { kind: "state_conflict" };
      if (row.status !== "pending" && row.status !== "processing") {
        return { kind: "transition_forbidden" };
      }
      const history = attemptHistory(row.attemptHistoryJson);
      if (history === undefined) throw new Error("Stored attempt history was invalid.");
      const processing = row.status === "processing";
      const dispatched = processing && row.activeAttemptDispatchedAt !== null;
      let nextHistory = history;
      if (processing) {
        const failure = aiFailure("provider_cancelled");
        if (failure.ok) throw new Error("Static cancellation failure was invalid.");
        const evidence = normalizeAttemptEvidenceV3<unknown>({
          version: 3,
          dispatchState: dispatched ? "dispatched" : "not_dispatched",
          protectedResult: null,
          error: failure.error,
          responseStatus: dispatched ? "cancelled_no_response" : "not_dispatched",
          retryClass: "not_retryable",
          returnedModel: null,
          completion: { kind: "cancelled" },
          usage: null,
          providerHttpStatus: null,
          providerErrorCode: null,
          providerRequestId: null,
          providerSystemFingerprint: null,
          durationMs: 0,
        });
        if (!evidence.ok) throw new Error("Cancellation evidence normalization failed.");
        const entry = createAttemptHistoryEntryV2({
          attempt: row.attemptCount,
          outcome: "discarded_cancelled",
          requestedProvider: row.requestedProvider,
          actualProvider: row.actualProvider,
          requestedModel: row.requestedModel,
          providerEnvelopeVersion: row.providerEnvelopeVersion,
          providerEnvelopeHash: row.providerEnvelopeHash,
          dispatchedAt: row.activeAttemptDispatchedAt,
          respondedAt: null,
          attemptUpperCostMicrousd: attemptUpperCost(row),
          actualCostMicrousd: 0,
          accountedCostMicrousd: dispatched && row.executionEnvironment === "staging"
            ? attemptUpperCost(row) : 0,
          actualCostComplete: !dispatched,
          evidence: evidence.value,
          candidateHash: null,
          controlledIdentity: controlledAttemptIdentity(row),
        });
        if (!entry.ok) throw new Error("Cancellation attempt entry failed.");
        nextHistory = [...history, entry.value];
      }
      const cancellationDebit = dispatched && row.executionEnvironment === "staging"
        ? attemptUpperCost(row) : 0;
      const updated = await transaction.update(aiRuns).set({
        status: "cancelled",
        retryState: "none",
        nextAttemptAt: null,
        leaseOwner: null,
        leaseToken: null,
        leaseAcquiredAt: null,
        leaseExpiresAt: null,
        activeAttemptDispatchedAt: null,
        cancelledLeaseToken: processing ? row.leaseToken : null,
        cancelledByUserId: input.actor.userId,
        cancellationReason: input.reason,
        cancelledAt: lock.observedAt,
        completedAt: lock.observedAt,
        attemptHistoryJson: nextHistory,
        candidateJson: null,
        candidateHash: null,
        returnedModel: null,
        providerResponseStatus: dispatched ? "cancelled_no_response" : "not_dispatched",
        providerHttpStatus: null,
        providerErrorCode: null,
        providerRequestId: null,
        failureCode: null,
        failureDetail: null,
        actualCostComplete: row.actualCostComplete && !dispatched,
        budgetAccountedCostMicrousd: row.budgetAccountedCostMicrousd + cancellationDebit,
        budgetReservedCostMicrousd: 0,
        costAccountingState: "final",
        stateVersion: row.stateVersion + 1,
        updatedAt: lock.observedAt,
      }).where(and(eq(aiRuns.id, row.id), eq(aiRuns.stateVersion, row.stateVersion))).returning();
      const result = updated[0];
      if (result === undefined) return { kind: "state_conflict" };
      await barriers?.afterRunMutation?.({ operation: "cancellation", runId: row.id, observedAt: lock.observedAt });
      await barriers?.beforeCommit?.({ operation: "cancellation", runId: row.id, observedAt: lock.observedAt });
      return { kind: "updated", row: humanMutationProjection(result) };
    },

    async manualRetryWithinGovernedTransaction(transaction, input) {
      const lock = await tryLifecycleLock(transaction, null);
      if (lock.kind === "lock_busy") return lock;
      await barriers?.afterAdvisoryAcquired?.({ operation: "manual_retry", observedAt: lock.observedAt });
      const selected = await transaction.select().from(aiRuns).where(eq(aiRuns.id, input.runId))
        .limit(1).for("update", { of: aiRuns });
      const row = selected[0];
      if (row === undefined || !await humanCanPerformRunOperationV1(
        transaction, row, input.actor, "manual_retry",
      )) return { kind: "not_found_or_unauthorized" };
      if (row.stateVersion !== input.expectedStateVersion) return { kind: "state_conflict" };
      if (!await manualRetryPolicyAllowsV1(transaction, row)) {
        return { kind: "transition_forbidden" };
      }
      const reservation = row.executionEnvironment === "staging"
        ? Math.max(0, row.runCostLimitMicrousd - row.budgetAccountedCostMicrousd) : 0;
      const updated = await transaction.update(aiRuns).set({
        status: "pending",
        retryState: "scheduled",
        nextAttemptAt: lock.observedAt,
        completedAt: null,
        budgetReservedCostMicrousd: reservation,
        costAccountingState: "reserved",
        stateVersion: row.stateVersion + 1,
        updatedAt: lock.observedAt,
      }).where(and(eq(aiRuns.id, row.id), eq(aiRuns.stateVersion, row.stateVersion))).returning();
      const result = updated[0];
      if (result === undefined) return { kind: "state_conflict" };
      await barriers?.afterRunMutation?.({ operation: "manual_retry", runId: row.id, observedAt: lock.observedAt });
      await barriers?.beforeCommit?.({ operation: "manual_retry", runId: row.id, observedAt: lock.observedAt });
      return { kind: "updated", row: humanMutationProjection(result) };
    },

    async rejectDispositionWithinGovernedTransaction(transaction, input) {
      const selected = await transaction.select().from(aiRuns).where(eq(aiRuns.id, input.runId))
        .limit(1).for("update", { of: aiRuns });
      const row = selected[0];
      if (row === undefined || !await humanCanPerformRunOperationV1(
        transaction, row, input.actor, "disposition",
      )) return { kind: "not_found_or_unauthorized" };
      if (row.stateVersion !== input.expectedStateVersion) return { kind: "state_conflict" };
      if (row.status !== "draft_ready" || row.humanDisposition !== "not_evaluated" ||
        row.candidateHash !== input.candidateHash || input.disposition !== "rejected") {
        return { kind: "transition_forbidden" };
      }
      const updated = await transaction.update(aiRuns).set({
        humanDisposition: "rejected",
        qualityRating: input.qualityRating,
        qualityLabels: [...input.qualityLabels],
        qualityComment: input.qualityComment,
        evaluatedByUserId: input.actor.userId,
        evaluatedAt: sql`statement_timestamp()`,
        stateVersion: row.stateVersion + 1,
        updatedAt: sql`statement_timestamp()`,
      }).where(and(eq(aiRuns.id, row.id), eq(aiRuns.stateVersion, row.stateVersion))).returning();
      const result = updated[0];
      return result === undefined
        ? { kind: "state_conflict" }
        : { kind: "updated", row: humanMutationProjection(result) };
    },

    async recordCancelledLateAccounting(input) {
      return database.transaction(async (transaction): Promise<LateAccountingOutcomeV1> => {
        const lock = await tryLifecycleLock(transaction, null);
        if (lock.kind === "lock_busy") return lock;
        await barriers?.afterAdvisoryAcquired?.({ operation: "late_accounting", observedAt: lock.observedAt });
        const selected = await transaction.select().from(aiRuns).where(and(
          eq(aiRuns.id, input.runId),
          eq(aiRuns.executionEnvironment, input.executionEnvironment),
        )).limit(1).for("update", { of: aiRuns });
        const row = selected[0];
        if (row === undefined || row.status !== "cancelled" ||
          row.cancelledLeaseToken !== input.cancelledLeaseToken ||
          row.stateVersion !== input.expectedStateVersion || input.evidence.dispatchState !== "dispatched" ||
          input.evidence.usage === null) return { kind: "state_conflict" };
        const history = attemptHistory(row.attemptHistoryJson);
        const lastValue = history?.at(-1);
        const last = lastValue === undefined ? undefined : jsonRecord(lastValue);
        if (history === undefined || last === undefined || last.outcome !== "discarded_cancelled" ||
          last.attempt !== row.attemptCount || last.dispatch_state !== "dispatched" ||
          typeof last.accounted_cost_microusd !== "number" ||
          typeof last.actual_cost_microusd !== "number" ||
          typeof last.responded_at !== "string" && last.responded_at !== null) {
          return { kind: "state_conflict" };
        }
        const storedPricing = pricingSnapshot(row.pricingSnapshotJson);
        if (storedPricing === undefined) throw new Error("Stored pricing snapshot was invalid.");
        const calculated = calculateTextCostBreakdownMicrousdV2({
          inputTokens: input.evidence.usage.inputTokens,
          outputTokens: input.evidence.usage.outputTokens,
          ...(input.evidence.usage.cacheHitInputTokens === undefined ? {} : {
            cacheHitInputTokens: input.evidence.usage.cacheHitInputTokens,
          }),
          ...(input.evidence.usage.cacheMissInputTokens === undefined ? {} : {
            cacheMissInputTokens: input.evidence.usage.cacheMissInputTokens,
          }),
          pricing: storedPricing,
        });
        if (!calculated.ok) throw new Error("Late accounting pricing calculation failed.");
        const lateCost = row.executionEnvironment === "staging" ? calculated.value.costMicrousd : 0;
        const priorRespondedAt = typeof last.responded_at === "string"
          ? new Date(last.responded_at) : lock.observedAt;
        const entry = createAttemptHistoryEntryV2({
          attempt: row.attemptCount,
          outcome: "discarded_cancelled",
          requestedProvider: row.requestedProvider,
          actualProvider: row.actualProvider,
          requestedModel: row.requestedModel,
          providerEnvelopeVersion: row.providerEnvelopeVersion,
          providerEnvelopeHash: row.providerEnvelopeHash,
          dispatchedAt: typeof last.dispatched_at === "string" ? new Date(last.dispatched_at) : row.providerDispatchedAt,
          respondedAt: priorRespondedAt,
          attemptUpperCostMicrousd: attemptUpperCost(row),
          actualCostMicrousd: lateCost,
          accountedCostMicrousd: lateCost,
          actualCostComplete: calculated.value.complete,
          evidence: input.evidence,
          candidateHash: null,
          controlledIdentity: controlledAttemptIdentity(row),
        });
        if (!entry.ok) throw new Error("Late accounting attempt entry failed.");
        if (row.providerResponseStatus === "cancelled_late_response") {
          return last.response_fingerprint === entry.value.response_fingerprint
            ? { kind: "exact_replay", stateVersion: row.stateVersion }
            : { kind: "state_conflict" };
        }
        const prefix = history.slice(0, -1);
        const tokens = cumulativeTokens(prefix, input.evidence);
        const accounted = row.budgetAccountedCostMicrousd - last.accounted_cost_microusd + lateCost;
        const actual = row.actualCostMicrousd - last.actual_cost_microusd + lateCost;
        const updated = await transaction.update(aiRuns).set({
          attemptHistoryJson: [...prefix, entry.value],
          returnedModel: input.evidence.returnedModel,
          providerResponseStatus: "cancelled_late_response",
          providerHttpStatus: input.evidence.providerHttpStatus,
          providerErrorCode: input.evidence.providerErrorCode,
          providerRequestId: input.evidence.providerRequestId,
          generatedAt: lock.observedAt,
          generationDurationMs: row.generationDurationMs + input.evidence.durationMs,
          inputTokens: tokens?.input ?? null,
          outputTokens: tokens?.output ?? null,
          totalTokens: tokens?.total ?? null,
          actualCostMicrousd: actual,
          actualCostComplete: calculated.value.complete &&
            prefix.every((value) => jsonRecord(value)?.actual_cost_complete === true),
          budgetAccountedCostMicrousd: accounted,
          stateVersion: row.stateVersion + 1,
          updatedAt: lock.observedAt,
        }).where(and(eq(aiRuns.id, row.id), eq(aiRuns.stateVersion, row.stateVersion))).returning({
          stateVersion: aiRuns.stateVersion,
        });
        const result = updated[0];
        if (result === undefined) return { kind: "state_conflict" };
        await barriers?.afterRunMutation?.({ operation: "late_accounting", runId: row.id, observedAt: lock.observedAt });
        await barriers?.beforeCommit?.({ operation: "late_accounting", runId: row.id, observedAt: lock.observedAt });
        return { kind: "enriched", stateVersion: result.stateVersion };
      });
    },

    async readAuthorizedWithinTransaction(transaction, input) {
      const selected = await transaction.select().from(aiRuns).where(eq(aiRuns.id, input.runId)).limit(1);
      const row = selected[0];
      if (row === undefined || !await humanCanPerformRunOperationV1(
        transaction, row, input.actor, "inspect",
      )) return null;
      const summary = humanMutationProjection(row);
      const candidate = row.candidateJson === null || jsonRecord(row.candidateJson) === undefined
        ? null : jsonRecord(row.candidateJson) ?? null;
      const context = jsonRecord(row.inputContextJson);
      const sources = Array.isArray(row.inputSourcesJson) && row.inputSourcesJson.every((value) =>
        jsonRecord(value) !== undefined,
      ) ? row.inputSourcesJson.map((value) => jsonRecord(value)!) : null;
      const history = attemptHistory(row.attemptHistoryJson);
      const attemptObjects = history?.every((value) => jsonRecord(value) !== undefined)
        ? history.map((value) => jsonRecord(value)!) : null;
      if (context === undefined || sources === null || attemptObjects === null) {
        throw new Error("Stored AI run review evidence was invalid.");
      }
      const cancelAvailable = (row.status === "pending" || row.status === "processing") &&
        await humanCanPerformRunOperationV1(transaction, row, input.actor, "cancel");
      const manualRetryAvailable =
        await humanCanPerformRunOperationV1(transaction, row, input.actor, "manual_retry") &&
        await manualRetryPolicyAllowsV1(transaction, row);
      const rejectAvailable = row.status === "draft_ready" &&
        row.humanDisposition === "not_evaluated" && row.candidateHash !== null &&
        await humanCanPerformRunOperationV1(transaction, row, input.actor, "disposition");
      return {
        runId: row.id,
        applicationClass: "draft_assistance",
        useCase: row.useCase,
        status: summary.status,
        retryState: summary.retryState,
        attemptCount: row.attemptCount,
        stateVersion: row.stateVersion,
        queuedAt: row.queuedAt.toISOString(),
        targetType: row.targetType,
        targetProductId: row.targetProductId,
        targetContentId: row.targetContentId,
        targetRevisionId: row.targetRevisionId,
        targetLocale: row.targetLocale,
        expectedTargetVersion: row.expectedTargetVersion,
        targetSnapshotHash: row.targetSnapshotHash,
        outputSchemaVersion: row.outputSchemaVersion,
        policyVersion: row.policyVersion,
        inputContext: context,
        inputSources: sources as unknown as readonly import("@/ai/core/contracts").SafeInputSourceReferenceV1[],
        inputHash: row.inputHash,
        attemptHistory: attemptObjects,
        candidateHash: row.candidateHash,
        candidate,
        failureCode: row.failureCode,
        humanDisposition: row.humanDisposition,
        qualityRating: row.qualityRating,
        qualityLabels: Object.freeze([...row.qualityLabels]),
        cancelAvailable,
        manualRetryAvailable,
        rejectAvailable,
      };
    },

    async readPricingForWorker(runId) {
      const selected = await database.select({
        provider: aiRuns.requestedProvider,
        model: aiRuns.requestedModel,
        snapshot: aiRuns.pricingSnapshotJson,
      }).from(aiRuns).where(eq(aiRuns.id, runId)).limit(1);
      const row = selected[0];
      if (row === undefined) return null;
      const snapshot = pricingSnapshot(row.snapshot);
      if (snapshot === undefined) throw new Error("Stored pricing snapshot was invalid.");
      return { provider: row.provider, model: row.model, snapshot };
    },

    async readCancelledFenceForWorker(input) {
      const selected = await database.select({
        status: aiRuns.status,
        token: aiRuns.cancelledLeaseToken,
        stateVersion: aiRuns.stateVersion,
      }).from(aiRuns).where(eq(aiRuns.id, input.runId)).limit(1);
      const row = selected[0];
      return row?.status === "cancelled" && row.token === input.cancelledLeaseToken
        ? { stateVersion: row.stateVersion } : null;
    },

    async readRunForWorker(runId) {
      const rows = await database.select().from(aiRuns).where(eq(aiRuns.id, runId)).limit(1);
      return rows[0] ?? null;
    },

    async findReplayWithinTransaction(transaction, input) {
      const rows = await transaction.select().from(aiRuns)
        .where(eq(aiRuns.idempotencyKey, input.idempotencyKey)).limit(1);
      const row = rows[0];
      if (row === undefined) return { kind: "new_request" };
      return row.requestedByUserId === input.requestedByUserId &&
        row.requestFingerprintVersion === input.requestFingerprintVersion &&
        row.requestFingerprint === input.requestFingerprint
        ? { kind: "exact_replay", row }
        : { kind: "conflict" };
    },

    async insertPreparedWithinTransaction(transaction, input) {
      const prepared = input.preparedRun;
      const target = targetColumns(prepared.association);
      const local = input.executionEnvironment !== "staging";
      const values: typeof aiRuns.$inferInsert = {
        applicationClass: "draft_assistance",
        capability: "text",
        useCase: prepared.useCase,
        requestedByUserId: prepared.requestIdentity.requestedByPrincipalId,
        idempotencyKey: prepared.requestIdentity.idempotencyKey,
        requestFingerprintVersion: 1,
        requestFingerprint: prepared.requestIdentity.fingerprint,
        ...target,
        targetSnapshotHash: prepared.associationSnapshotHash,
        modelConfigId: prepared.resolvedConfig.modelConfigId,
        modelConfigVersion: prepared.resolvedConfig.modelConfigVersion,
        resolvedConfigHash: prepared.resolvedConfig.resolvedConfigHash,
        requestedProvider: prepared.resolvedConfig.requestedProvider,
        requestedModel: prepared.resolvedConfig.requestedModel,
        parametersSnapshotJson: prepared.resolvedConfig.parametersSnapshot,
        maxInputTokens: prepared.resolvedConfig.maxInputTokens,
        maxOutputTokens: prepared.resolvedConfig.maxOutputTokens,
        maxAttempts: prepared.resolvedConfig.maxAttempts,
        promptId: prepared.promptIdentity.promptId,
        promptVersion: prepared.promptIdentity.promptVersion,
        promptHash: prepared.promptIdentity.promptHash,
        providerEnvelopeVersion: prepared.providerEnvelope.version,
        providerEnvelopeHash: prepared.providerEnvelope.hash,
        inputSchemaVersion: prepared.inputSchemaVersion,
        outputSchemaVersion: prepared.outputSchemaVersion,
        policyVersion: prepared.policyVersion,
        inputSourcesJson: prepared.inputSources,
        inputContextJson: prepared.inputContext,
        inputHash: prepared.inputHash,
        executionEnvironment: input.executionEnvironment,
        budgetPolicyVersion: local ? "nonbillable-v1" : "stage4a-staging-v1",
        budgetTimezone: "Asia/Shanghai",
        budgetCurrency: "USD",
        textConcurrencyLimit: 2,
        runCostLimitMicrousd: prepared.resolvedConfig.runCostLimitMicrousd,
        dailyHardLimitMicrousd: input.dailyHardLimitMicrousd,
        monthlyWarningLimitMicrousd: input.monthlyWarningLimitMicrousd,
        monthlyHardLimitMicrousd: input.monthlyHardLimitMicrousd,
        estimatedMaxCostMicrousd: input.estimatedMaxCostMicrousd,
        pricingSnapshotJson: input.pricingSnapshot,
      };
      const inserted = await transaction.insert(aiRuns).values(values)
        .onConflictDoNothing({ target: aiRuns.idempotencyKey }).returning();
      const row = inserted[0];
      if (row !== undefined) return { kind: "inserted", row };
      const losers = await transaction.select().from(aiRuns)
        .where(eq(aiRuns.idempotencyKey, prepared.requestIdentity.idempotencyKey)).limit(1);
      const loser = losers[0];
      if (loser === undefined) throw new Error("Idempotency loser row disappeared.");
      return { kind: "unique_loser", row: loser };
    },
  };
}

export function coreRunSummaryFromRepositoryRowV1(row: typeof aiRuns.$inferSelect) {
  return summaryFromRow(row);
}
