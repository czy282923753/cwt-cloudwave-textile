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
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js/session";

import type { ReadonlyJsonValue } from "@/ai/canonical-json";
import type { PreparedCoreRunV1 } from "@/ai/core/contracts";
import { aiFailure } from "@/ai/errors";
import type { AppDatabase } from "@/db/types";
import { aiModelConfig, aiRuns, featureFlags } from "@/db/schema";
import {
  createAttemptHistoryEntryV1,
  normalizeAttemptEvidenceV2,
} from "./attempt-evidence";
import type {
  ClaimedLeaseHandleV1,
  DispatchAuthorizationOutcomeV1,
  HeartbeatOutcomeV1,
  LifecycleLockOutcomeV1,
  NormalizedAttemptEvidenceV2,
  SettlementOutcomeV1,
  WorkerClaimResultV1,
} from "./contracts";
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
    readonly evidence: NormalizedAttemptEvidenceV2<
      import("@/ai/core/contracts").ProtectedApplicationResultEnvelopeV1
    >;
  }): Promise<SettlementOutcomeV1>;
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
  return {
    runId: row.id,
    applicationClass: "draft_assistance" as const,
    useCase: row.useCase,
    status: row.status,
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
    readonly uuid?: () => string;
  } = {},
): AiRunRepositoryV1 {
  const barriers = options.barriers;
  const uuid = options.uuid ?? randomUUID;
  return {
    async claimOrRecover(input) {
      return database.transaction(async (transaction): Promise<WorkerClaimResultV1> => {
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
          const evidence = normalizeAttemptEvidenceV2<unknown>({
            version: 2,
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
            durationMs: 0,
          });
          if (!evidence.ok) throw new Error("Recovery evidence normalization failed.");
          const attemptUpper = expired.maxAttempts === 0
            ? 0 : Math.ceil(expired.estimatedMaxCostMicrousd / expired.maxAttempts);
          const entry = createAttemptHistoryEntryV1({
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
            return { kind: "idle", reason: "budget" };
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
        return { kind: "claimed", row };
      });
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
        if (!input.pricingCurrent) return { kind: "pricing_stale", observedAt: lock.observedAt };
        const rows = await transaction.update(aiRuns).set({
          activeAttemptDispatchedAt: lock.observedAt,
          providerDispatchedAt: sql`coalesce(${aiRuns.providerDispatchedAt}, ${lock.observedAt})`,
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
        await barriers?.afterAdvisoryAcquired?.({ operation: "settlement", observedAt: lock.observedAt });
        const selected = await transaction.select().from(aiRuns).where(and(
          eq(aiRuns.id, input.runId),
          eq(aiRuns.executionEnvironment, input.executionEnvironment),
        )).limit(1).for("update", { of: aiRuns });
        const row = selected[0];
        if (row?.status === "cancelled") return { kind: "cancelled_fence", observedAt: lock.observedAt };
        if (row === undefined || row.status !== "processing" || row.leaseOwner !== input.leaseOwner ||
          row.leaseToken !== input.leaseToken || row.stateVersion !== input.stateVersion ||
          row.leaseExpiresAt === null || row.leaseExpiresAt <= lock.observedAt ||
          row.activeAttemptDispatchedAt === null) {
          return { kind: "lease_lost_or_unsafe", observedAt: lock.observedAt };
        }
        const history = attemptHistory(row.attemptHistoryJson);
        if (history === undefined) throw new Error("Stored attempt history was invalid.");
        const attemptUpper = Math.ceil(row.estimatedMaxCostMicrousd / row.maxAttempts);
        const usageComplete = input.evidence.usage !== null;
        const actualAttemptCost = row.executionEnvironment === "staging" && usageComplete
          ? attemptUpper
          : 0;
        const accountedAttemptCost = usageComplete ? actualAttemptCost : attemptUpper;
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
        const entry = createAttemptHistoryEntryV1({
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
        });
        if (!entry.ok) throw new Error("Settlement attempt entry failed.");
        const nextAttemptAt = status === "pending"
          ? new Date(lock.observedAt.getTime() + automaticRetryBackoffSecondsV1(row.attemptCount) * 1_000)
          : null;
        const reserved = status === "pending" && row.executionEnvironment === "staging"
          ? Math.max(0, row.runCostLimitMicrousd - accounted) : 0;
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
          inputTokens: usageComplete ? input.evidence.usage?.inputTokens ?? null : null,
          outputTokens: usageComplete ? input.evidence.usage?.outputTokens ?? null : null,
          totalTokens: usageComplete ? input.evidence.usage?.totalTokens ?? null : null,
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
        await barriers?.afterRunMutation?.({ operation: "settlement", runId: row.id, observedAt: lock.observedAt });
        await barriers?.beforeCommit?.({ operation: "settlement", runId: row.id, observedAt: lock.observedAt });
        return { kind: "settled", status, retryState, stateVersion: result.stateVersion };
      });
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
