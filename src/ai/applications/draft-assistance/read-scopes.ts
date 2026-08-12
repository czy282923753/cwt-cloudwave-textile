import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js/session";
import { and, eq, sql } from "drizzle-orm";

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
  aiModelConfigMutationReadRepositoryV1,
  type AiModelConfigMutationReadRepositoryV1,
} from "@/ai/config/model-config-repository";
import {
  calculateAttemptUpperCostMicrousdV1,
  type PricingPolicyRegistryV1,
} from "@/ai/runs/pricing-policy";
import {
  coreRunSummaryFromRepositoryRowV1,
  createAiRunRepositoryV1,
  type AiRunRepositoryV1,
} from "@/ai/runs/repository";
import {
  contentLocalizations,
  contents,
  editorialRevisions,
  productLocalizations,
  products,
} from "@/db/schema";

import { buildAuthorizedDraftAssociationV1 } from "./association";
import type {
  AuthorizedDraftAssociationV1,
  DraftAssistanceCommandV1,
  DraftDurableAssociationWithoutHashV1,
} from "./contracts";

const draftConsistentReadScopeBrand = Symbol("draft-consistent-read-scope");
const draftReadExecutor = Symbol("draft-read-executor");

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
> extends DraftConsistentReadScope<TQueryResult>,
    DraftTransactionScopeOperationsV1 {
  readonly mode: "governed_enqueue_transaction";
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
): ReadOnlyDraftAvailabilityScope<TQueryResult> {
  return {
    [draftConsistentReadScopeBrand]: { [draftReadExecutor]: executor },
    mode: "read_only",
  };
}

function createTransactionBoundDraftEnqueueScope<
  TQueryResult extends PgQueryResultHKT,
>(
  executor: Pick<AppDatabase<TQueryResult>, "select">,
  operations: DraftTransactionScopeOperationsV1,
): TransactionBoundDraftEnqueueScope<TQueryResult> {
  return {
    [draftConsistentReadScopeBrand]: { [draftReadExecutor]: executor },
    mode: "governed_enqueue_transaction",
    findReplay: operations.findReplay,
    authorizeLockAndSnapshotTargetForNewRequest:
      operations.authorizeLockAndSnapshotTargetForNewRequest,
    lockSelectedConfigForNewRequest: operations.lockSelectedConfigForNewRequest,
    insertPreparedWithRequiredAudit: operations.insertPreparedWithRequiredAudit,
  };
}

export function withReadOnlyDraftAvailabilityScope<
  TQueryResult extends PgQueryResultHKT,
  T,
>(
  database: AppDatabase<TQueryResult>,
  work: (scope: ReadOnlyDraftAvailabilityScope<TQueryResult>) => Promise<T>,
): Promise<T> {
  return database.transaction(
    async (transaction) => work(createReadOnlyDraftAvailabilityScope(transaction)),
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

function actorCanEditEntityType(role: string, entityType: "product" | "content"): boolean {
  if (role === "admin") return true;
  return entityType === "product" ? role === "product_editor" : role === "content_editor";
}

function contentChannelAllowed(
  useCase: DraftAssistanceCommandV1["useCase"],
  channel: string | null,
): boolean {
  if (useCase === "fabric_knowledge_draft") return channel === "fabric_knowledge";
  if (useCase === "sourcing_guide_draft") return channel === "china_sourcing_guide";
  if (useCase === "product_description_draft") return false;
  return channel !== null;
}

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
  readonly executionEnvironment: "local" | "test" | "staging";
  readonly pricingRegistry: PricingPolicyRegistryV1;
  readonly audit: (input: AuditInput) => Promise<string>;
  readonly runRepository?: AiRunRepositoryV1;
  readonly configRepository?: AiModelConfigMutationReadRepositoryV1;
}): DraftTransactionScopeOperationsV1 {
  const runRepository = input.runRepository ?? createAiRunRepositoryV1(input.transaction);
  const configRepository = input.configRepository ?? aiModelConfigMutationReadRepositoryV1;
  return {
    async findReplay(lookup) {
      const replay = await runRepository.findReplayWithinTransaction(input.transaction, {
        idempotencyKey: lookup.idempotencyKey,
        requestedByUserId: lookup.requestedByPrincipalId,
        requestFingerprintVersion: lookup.fingerprintVersion,
        requestFingerprint: lookup.fingerprint,
      });
      if (replay.kind === "new_request") return aiSuccess(replay);
      if (replay.kind === "conflict" || !associationMatchesRow(lookup.association, replay.row)) {
        return aiFailure("idempotency_conflict");
      }
      return aiSuccess({
        kind: "exact_replay",
        summary: coreRunSummaryFromRepositoryRowV1(replay.row),
      });
    },

    async authorizeLockAndSnapshotTargetForNewRequest(request) {
      const association = request.association;
      if (association.targetType === "product_draft") {
        const rows = await input.transaction.select({
          status: products.status,
          version: productLocalizations.editorDocumentVersion,
        }).from(products).innerJoin(productLocalizations, and(
          eq(productLocalizations.productId, products.id),
          eq(productLocalizations.locale, "en"),
        )).where(eq(products.id, association.targetProductId)).limit(1)
          .for("update", { of: productLocalizations });
        const row = rows[0];
        if (row === undefined || !actorCanEditEntityType(request.actor.roleKey, "product")) {
          return aiFailure("authorization_denied");
        }
        if (request.command.useCase !== "product_description_draft" &&
          request.command.useCase !== "seo_content_draft") return aiFailure("target_scope_mismatch");
        if (row.status !== "draft") return aiFailure("target_not_editable");
        if (row.version !== association.expectedTargetVersion) return aiFailure("target_version_conflict");
        return buildAuthorizedDraftAssociationV1(association);
      }
      if (association.targetType === "content_draft") {
        const rows = await input.transaction.select({
          status: contents.status,
          channel: contents.channel,
          version: contentLocalizations.editorDocumentVersion,
        }).from(contents).innerJoin(contentLocalizations, and(
          eq(contentLocalizations.contentId, contents.id),
          eq(contentLocalizations.locale, "en"),
        )).where(eq(contents.id, association.targetContentId)).limit(1)
          .for("update", { of: contentLocalizations });
        const row = rows[0];
        if (row === undefined || !actorCanEditEntityType(request.actor.roleKey, "content")) {
          return aiFailure("authorization_denied");
        }
        if (!contentChannelAllowed(request.command.useCase, row.channel)) {
          return aiFailure("target_scope_mismatch");
        }
        if (row.status !== "draft") return aiFailure("target_not_editable");
        if (row.version !== association.expectedTargetVersion) return aiFailure("target_version_conflict");
        return buildAuthorizedDraftAssociationV1(association);
      }
      const rows = await input.transaction.select({
        status: editorialRevisions.status,
        entityType: editorialRevisions.entityType,
        locale: editorialRevisions.locale,
        version: editorialRevisions.versionNumber,
        contentChannel: contents.channel,
      }).from(editorialRevisions).leftJoin(contents, and(
        eq(editorialRevisions.entityType, "content"),
        eq(contents.id, editorialRevisions.entityId),
      )).where(eq(editorialRevisions.id, association.targetRevisionId)).limit(1)
        .for("update", { of: editorialRevisions });
      const row = rows[0];
      if (row === undefined || row.entityType !== "product" && row.entityType !== "content" ||
        !actorCanEditEntityType(request.actor.roleKey, row.entityType)) {
        return aiFailure("authorization_denied");
      }
      if (row.locale !== "en" ||
        row.entityType === "product" && request.command.useCase !== "product_description_draft" &&
          request.command.useCase !== "seo_content_draft" ||
        row.entityType === "content" && !contentChannelAllowed(request.command.useCase, row.contentChannel)) {
        return aiFailure("target_scope_mismatch");
      }
      if (row.status !== "draft") return aiFailure("target_not_editable");
      if (row.version !== association.expectedTargetVersion) return aiFailure("target_version_conflict");
      return buildAuthorizedDraftAssociationV1(association);
    },

    async lockSelectedConfigForNewRequest(configuration) {
      const locked = await configRepository.lockUseCaseRows(input.transaction, {
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
      const at = await databaseClock(input.transaction);
      const pricing = input.pricingRegistry.resolve({
        provider: preparedRun.resolvedConfig.requestedProvider,
        model: preparedRun.resolvedConfig.requestedModel,
        at,
      });
      if (!pricing.ok) return pricing;
      const cost = calculateAttemptUpperCostMicrousdV1({
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
      const committed = await runRepository.insertPreparedWithinTransaction(input.transaction, {
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
          summary: coreRunSummaryFromRepositoryRowV1(committed.row),
        });
      }
      await input.audit({
        actorUserId: preparedRun.requestIdentity.requestedByPrincipalId,
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
        summary: coreRunSummaryFromRepositoryRowV1(committed.row),
      });
    },
  };
}
