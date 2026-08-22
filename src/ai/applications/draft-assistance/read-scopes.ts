import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js/session";
import { sql } from "drizzle-orm";

import type { AppDatabase } from "@/db/types";
import type { AuditInput } from "@/audit/service";
import type { ApplicationReadScope } from "@/ai/applications/contracts";
import type {
  AiModelConfigRow,
  CoreAiActorV1,
  PreparedCoreRunV1,
  PreparedRunCommitResultV1,
  ReplayLookupResultV1,
} from "@/ai/core/contracts";
import type { AiServiceResult } from "@/ai/errors";
import { aiFailure, aiSuccess } from "@/ai/errors";
import {
  type AiModelConfigMutationReadRepositoryV1,
} from "@/ai/config/model-config-repository";
import {
  type PricingPolicyRegistryV1,
} from "@/ai/runs/pricing-policy";
import type {
  AuthoritativeAiActorV1,
  AiRunRepositoryV1,
} from "@/ai/runs/repository";
import { createProductAiDraftReaderV1 } from "@/catalog/product-ai-context-reader";
import { createContentAiDraftReaderV1 } from "@/content/content-ai-context-reader";
import type {
  AuthorizedDraftAssociationV1,
  DraftAssistanceCommandV1,
  DraftDurableAssociationWithoutHashV1,
} from "./contracts";

const draftConsistentReadScopeBrand = Symbol("draft-consistent-read-scope");
const draftReadExecutor = Symbol("draft-read-executor");
const draftAvailabilityEntityAuthorizations = new WeakMap<
  object,
  (entityType: "product" | "content" | null) => boolean
>();

interface DraftPrivateReadState<TQueryResult extends PgQueryResultHKT> {
  readonly [draftConsistentReadScopeBrand]: {
    readonly [draftReadExecutor]: Pick<AppDatabase<TQueryResult>, "select">;
  };
}

export interface DraftConsistentReadScope<
  TQueryResult extends PgQueryResultHKT,
> extends ApplicationReadScope, DraftPrivateReadState<TQueryResult> {
  readonly mode: "read_only" | "governed_enqueue_transaction";
}

export interface AuthorizedReplayLookupV1 {
  readonly idempotencyKey: string;
  readonly requestedByPrincipalId: string;
  readonly association: import("@/ai/core/contracts").DurableApplicationAssociationV1;
  readonly fingerprintVersion: 1;
  readonly fingerprint: string;
}

export interface DraftTransactionScopeOperationsV1 {
  findReplay(input: AuthorizedReplayLookupV1):
    Promise<AiServiceResult<ReplayLookupResultV1>>;
  authorizeLockAndSnapshotTargetForNewRequest(input: {
    readonly scope: TransactionBoundDraftEnqueueScope<PostgresJsQueryResultHKT>;
    readonly actor: CoreAiActorV1;
    readonly command: DraftAssistanceCommandV1;
    readonly association: DraftDurableAssociationWithoutHashV1;
  }): Promise<AiServiceResult<AuthorizedDraftAssociationV1>>;
  lockSelectedConfigForNewRequest(input: {
    readonly modelConfigId: string;
    readonly expectedRecordVersion: number;
  }): Promise<AiServiceResult<AiModelConfigRow>>;
  insertPreparedWithRequiredAudit(input: PreparedCoreRunV1):
    Promise<AiServiceResult<PreparedRunCommitResultV1>>;
}

export interface ReadOnlyDraftAvailabilityScope<
  TQueryResult extends PgQueryResultHKT,
> extends DraftConsistentReadScope<TQueryResult> {
  readonly mode: "read_only";
}

export interface TransactionBoundDraftEnqueueScope<
  TQueryResult extends PgQueryResultHKT,
> extends DraftConsistentReadScope<TQueryResult> {
  readonly mode: "governed_enqueue_transaction";
  findReplay: DraftTransactionScopeOperationsV1["findReplay"];
  authorizeLockAndSnapshotTargetForNewRequest(input: {
    readonly actor: CoreAiActorV1;
    readonly command: DraftAssistanceCommandV1;
    readonly association: DraftDurableAssociationWithoutHashV1;
  }): Promise<AiServiceResult<AuthorizedDraftAssociationV1>>;
  lockSelectedConfigForNewRequest: DraftTransactionScopeOperationsV1["lockSelectedConfigForNewRequest"];
  insertPreparedWithRequiredAudit: DraftTransactionScopeOperationsV1["insertPreparedWithRequiredAudit"];
}

export function withDraftReadExecutor<
  TQueryResult extends PgQueryResultHKT,
  T,
>(
  scope: DraftConsistentReadScope<TQueryResult>,
  work: (query: Pick<AppDatabase<TQueryResult>, "select">) => Promise<T>,
): Promise<T> {
  return work(scope[draftConsistentReadScopeBrand][draftReadExecutor]);
}

function createReadOnlyDraftAvailabilityScope<
  TQueryResult extends PgQueryResultHKT,
>(
  executor: Pick<AppDatabase<TQueryResult>, "select">,
  authorizeEntityType: (entityType: "product" | "content" | null) => boolean,
): ReadOnlyDraftAvailabilityScope<TQueryResult> {
  const scope: ReadOnlyDraftAvailabilityScope<TQueryResult> = {
    [draftConsistentReadScopeBrand]: { [draftReadExecutor]: executor },
    mode: "read_only",
  };
  draftAvailabilityEntityAuthorizations.set(scope, authorizeEntityType);
  return scope;
}

function createTransactionBoundDraftEnqueueScope<
  TQueryResult extends PgQueryResultHKT,
>(
  executor: Pick<AppDatabase<TQueryResult>, "select">,
  operations: DraftTransactionScopeOperationsV1,
): TransactionBoundDraftEnqueueScope<TQueryResult> {
  const scope: TransactionBoundDraftEnqueueScope<TQueryResult> = {
    [draftConsistentReadScopeBrand]: { [draftReadExecutor]: executor },
    mode: "governed_enqueue_transaction",
    findReplay: operations.findReplay,
    authorizeLockAndSnapshotTargetForNewRequest: (input) =>
      operations.authorizeLockAndSnapshotTargetForNewRequest({
        ...input,
        scope: scope as TransactionBoundDraftEnqueueScope<PostgresJsQueryResultHKT>,
      }),
    lockSelectedConfigForNewRequest: operations.lockSelectedConfigForNewRequest,
    insertPreparedWithRequiredAudit: operations.insertPreparedWithRequiredAudit,
  };
  return scope;
}

export function authoritativeAvailabilityActorCanAccessEntityTypeV1<
  TQueryResult extends PgQueryResultHKT,
>(
  scope: ReadOnlyDraftAvailabilityScope<TQueryResult>,
  entityType: "product" | "content" | null,
): boolean {
  return draftAvailabilityEntityAuthorizations.get(scope)?.(entityType) ?? false;
}

export function withReadOnlyDraftAvailabilityScope<
  TQueryResult extends PgQueryResultHKT,
  T,
>(
  database: AppDatabase<TQueryResult>,
  work: (scope: ReadOnlyDraftAvailabilityScope<TQueryResult>) => Promise<T>,
): Promise<T>;
export function withReadOnlyDraftAvailabilityScope<
  TQueryResult extends PgQueryResultHKT,
  T,
>(
  database: AppDatabase<TQueryResult>,
  authority: {
    readonly resolveActor: (
      transaction: AppDatabase<TQueryResult>,
    ) => Promise<AuthoritativeAiActorV1 | null>;
    readonly actorCanAccessEntityType: (
      actor: AuthoritativeAiActorV1,
      entityType: "product" | "content" | null,
    ) => boolean;
  },
  work: (
    scope: ReadOnlyDraftAvailabilityScope<TQueryResult>,
    actor: AuthoritativeAiActorV1,
  ) => Promise<T>,
): Promise<T | null>;
export function withReadOnlyDraftAvailabilityScope<
  TQueryResult extends PgQueryResultHKT,
  T,
>(
  database: AppDatabase<TQueryResult>,
  authorityOrWork: {
    readonly resolveActor: (
      transaction: AppDatabase<TQueryResult>,
    ) => Promise<AuthoritativeAiActorV1 | null>;
    readonly actorCanAccessEntityType: (
      actor: AuthoritativeAiActorV1,
      entityType: "product" | "content" | null,
    ) => boolean;
  } | ((scope: ReadOnlyDraftAvailabilityScope<TQueryResult>) => Promise<T>),
  authorizedWork?: (
    scope: ReadOnlyDraftAvailabilityScope<TQueryResult>,
    actor: AuthoritativeAiActorV1,
  ) => Promise<T>,
): Promise<T | null> {
  return database.transaction(
    async (transaction) => {
      if (typeof authorityOrWork === "function") {
        return authorityOrWork(createReadOnlyDraftAvailabilityScope(transaction, () => false));
      }
      const actor = await authorityOrWork.resolveActor(transaction);
      if (actor === null || authorizedWork === undefined) return null;
      return authorizedWork(
        createReadOnlyDraftAvailabilityScope(
          transaction,
          (entityType) => authorityOrWork.actorCanAccessEntityType(actor, entityType),
        ),
        actor,
      );
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

export function withTransactionBoundDraftEnqueueScope<
  TQueryResult extends PgQueryResultHKT,
  T,
>(
  transaction: Pick<AppDatabase<TQueryResult>, "select">,
  operations: DraftTransactionScopeOperationsV1,
  work: (scope: TransactionBoundDraftEnqueueScope<TQueryResult>) => Promise<T>,
): Promise<T> {
  return work(createTransactionBoundDraftEnqueueScope(transaction, operations));
}

type PhaseCPgDatabase = AppDatabase<PostgresJsQueryResultHKT>;

function associationMatchesRow(
  association: import("@/ai/core/contracts").DurableApplicationAssociationV1,
  row: Awaited<ReturnType<AiRunRepositoryV1["insertPreparedWithinTransaction"]>>["row"],
): boolean {
  const value = association.value;
  if (value.targetType === "product_draft") {
    return row.targetType === "product_draft" && row.targetProductId === value.targetProductId &&
      row.targetContentId === null && row.targetRevisionId === null && row.targetLocale === "en" &&
      row.expectedTargetVersion === value.expectedTargetVersion;
  }
  if (value.targetType === "content_draft") {
    return row.targetType === "content_draft" && row.targetContentId === value.targetContentId &&
      row.targetProductId === null && row.targetRevisionId === null && row.targetLocale === "en" &&
      row.expectedTargetVersion === value.expectedTargetVersion;
  }
  return value.targetType === "editorial_revision" && row.targetType === "editorial_revision" &&
    row.targetRevisionId === value.targetRevisionId && row.targetProductId === null &&
    row.targetContentId === null && row.targetLocale === null &&
    row.expectedTargetVersion === value.expectedTargetVersion;
}

async function databaseClock(transaction: PhaseCPgDatabase): Promise<Date> {
  const result = await transaction.execute<{ readonly value: string }>(sql`
    select clock_timestamp() as value
  `);
  const value = new Date(result[0]?.value ?? Number.NaN);
  if (!Number.isFinite(value.getTime())) throw new Error("Database clock observation failed.");
  return value;
}

export function createPostgresDraftEnqueueOperationsV1(input: {
  readonly transaction: PhaseCPgDatabase;
  readonly command: DraftAssistanceCommandV1;
  readonly actor: AuthoritativeAiActorV1;
  readonly actorCanEnqueueEntityType: (entityType: "product" | "content") => boolean;
  readonly actorCanReplayRun: (
    row: Awaited<ReturnType<AiRunRepositoryV1["insertPreparedWithinTransaction"]>>["row"],
  ) => Promise<boolean>;
  readonly executionEnvironment: "local" | "test" | "staging";
  readonly pricingRegistry: PricingPolicyRegistryV1;
  readonly audit: (input: AuditInput) => Promise<string>;
  readonly runRepository: AiRunRepositoryV1;
  readonly configRepository: AiModelConfigMutationReadRepositoryV1;
  readonly calculateAttemptUpperCost:
    typeof import("@/ai/runs/pricing-policy").calculateAttemptUpperCostMicrousdV1;
  readonly summarizeRun:
    typeof import("@/ai/runs/repository").coreRunSummaryFromRepositoryRowV1;
}): DraftTransactionScopeOperationsV1 {
  const productReader = createProductAiDraftReaderV1<PostgresJsQueryResultHKT>();
  const contentReader = createContentAiDraftReaderV1<PostgresJsQueryResultHKT>();
  return {
    async findReplay(lookup) {
      if (lookup.requestedByPrincipalId !== input.actor.userId) {
        return aiFailure("authorization_denied");
      }
      const replay = await input.runRepository.findReplayWithinTransaction(input.transaction, {
        idempotencyKey: lookup.idempotencyKey,
        requestedByUserId: lookup.requestedByPrincipalId,
        requestFingerprintVersion: lookup.fingerprintVersion,
        requestFingerprint: lookup.fingerprint,
      });
      if (replay.kind === "new_request") return aiSuccess(replay);
      if (replay.kind === "conflict" || !associationMatchesRow(lookup.association, replay.row)) {
        return aiFailure("idempotency_conflict");
      }
      if (!await input.actorCanReplayRun(replay.row)) {
        return aiFailure("authorization_denied");
      }
      return aiSuccess({
        kind: "exact_replay",
        summary: input.summarizeRun(replay.row),
      });
    },

    async authorizeLockAndSnapshotTargetForNewRequest(request) {
      if (request.actor.principalId !== input.actor.userId ||
        request.actor.roleKey !== input.actor.role) return aiFailure("authorization_denied");
      const readerInput = {
        scope: request.scope,
        actor: request.actor,
        command: request.command,
        association: request.association,
      };
      if (request.association.targetType === "product_draft") {
        if (!input.actorCanEnqueueEntityType("product")) return aiFailure("authorization_denied");
        const target = await productReader.readTargetSnapshot(readerInput);
        return target.ok ? aiSuccess(target.value.authorizedAssociation) : target;
      }
      if (request.association.targetType === "content_draft") {
        if (!input.actorCanEnqueueEntityType("content")) return aiFailure("authorization_denied");
        const target = await contentReader.readTargetSnapshot(readerInput);
        return target.ok ? aiSuccess(target.value.authorizedAssociation) : target;
      }
      if (input.actor.role === "product_editor") {
        if (!input.actorCanEnqueueEntityType("product")) return aiFailure("authorization_denied");
        const target = await productReader.readTargetSnapshot(readerInput);
        return target.ok ? aiSuccess(target.value.authorizedAssociation) : target;
      }
      if (input.actor.role === "content_editor") {
        if (!input.actorCanEnqueueEntityType("content")) return aiFailure("authorization_denied");
        const target = await contentReader.readTargetSnapshot(readerInput);
        return target.ok ? aiSuccess(target.value.authorizedAssociation) : target;
      }
      if (input.actor.role !== "admin") return aiFailure("authorization_denied");
      const product = await productReader.readTargetSnapshot(readerInput);
      if (product.ok) return aiSuccess(product.value.authorizedAssociation);
      if (product.error.code !== "target_scope_mismatch") return product;
      const content = await contentReader.readTargetSnapshot(readerInput);
      return content.ok ? aiSuccess(content.value.authorizedAssociation) : content;
    },

    async lockSelectedConfigForNewRequest(configuration) {
      const locked = await input.configRepository.lockUseCaseRows(input.transaction, {
        capability: "text",
        useCase: input.command.useCase,
      });
      if (!locked.ok) return locked;
      const row = locked.value.find((candidate) => candidate.id === configuration.modelConfigId);
      if (row === undefined || row.recordVersion !== configuration.expectedRecordVersion ||
        !row.enabled || !row.isDefault || row.fallbackConfigId !== null) {
        return aiFailure("state_conflict");
      }
      return aiSuccess(row);
    },

    async insertPreparedWithRequiredAudit(preparedRun) {
      if (preparedRun.requestIdentity.requestedByPrincipalId !== input.actor.userId) {
        return aiFailure("authorization_denied");
      }
      const at = await databaseClock(input.transaction);
      const pricing = input.pricingRegistry.resolve({
        provider: preparedRun.resolvedConfig.requestedProvider,
        model: preparedRun.resolvedConfig.requestedModel,
        at,
      });
      if (!pricing.ok) return pricing;
      const cost = input.calculateAttemptUpperCost({
        maxInputTokens: preparedRun.resolvedConfig.maxInputTokens,
        maxOutputTokens: preparedRun.resolvedConfig.maxOutputTokens,
        maxAttempts: preparedRun.resolvedConfig.maxAttempts,
        pricing: pricing.value,
      });
      if (!cost.ok || cost.value.estimatedMax > preparedRun.resolvedConfig.runCostLimitMicrousd ||
        input.executionEnvironment === "staging" && cost.value.attemptUpper === 0) {
        return aiFailure("config_invalid");
      }
      const local = input.executionEnvironment !== "staging";
      const committed = await input.runRepository.insertPreparedWithinTransaction(input.transaction, {
        preparedRun,
        executionEnvironment: input.executionEnvironment,
        pricingSnapshot: { ...pricing.value },
        estimatedMaxCostMicrousd: local ? 0 : cost.value.estimatedMax,
        dailyHardLimitMicrousd: local ? 0 : 5_000_000,
        monthlyWarningLimitMicrousd: local ? 0 : 50_000_000,
        monthlyHardLimitMicrousd: local ? 0 : 100_000_000,
      });
      if (committed.kind === "unique_loser") {
        if (committed.row.requestedByUserId !== preparedRun.requestIdentity.requestedByPrincipalId ||
          committed.row.requestFingerprintVersion !== 1 ||
          committed.row.requestFingerprint !== preparedRun.requestIdentity.fingerprint ||
          !associationMatchesRow(preparedRun.association, committed.row)) {
          return aiFailure("idempotency_conflict");
        }
        return aiSuccess({
          kind: "unique_loser_exact_replay",
          summary: input.summarizeRun(committed.row),
        });
      }
      await input.audit({
        actorUserId: input.actor.userId,
        action: "ai.run.enqueued",
        entityType: "ai_run",
        entityId: committed.row.id,
        afterSummary: {
          applicationClass: preparedRun.applicationClass,
          useCase: preparedRun.useCase,
          status: committed.row.status,
        },
      });
      return aiSuccess({
        kind: "inserted",
        summary: input.summarizeRun(committed.row),
      });
    },
  };
}
