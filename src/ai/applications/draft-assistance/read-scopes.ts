import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import type { AppDatabase } from "@/db/types";
import type { ApplicationReadScope } from "@/ai/applications/contracts";
import type {
  AiModelConfigRow,
  CoreAiActorV1,
  PreparedCoreRunV1,
  PreparedRunCommitResultV1,
  ReplayLookupResultV1,
} from "@/ai/core/contracts";
import type { AiServiceResult } from "@/ai/errors";

import type {
  AuthorizedDraftAssociationV1,
  DraftAssistanceCommandV1,
  DraftDurableAssociationWithoutHashV1,
} from "./contracts";

const draftConsistentReadScopeBrand = Symbol("draft-consistent-read-scope");
const draftReadExecutor = Symbol("draft-read-executor");

interface DraftPrivateReadState<TQueryResult extends PgQueryResultHKT> {
  readonly [draftConsistentReadScopeBrand]: {
    readonly [draftReadExecutor]: Pick<AppDatabase<TQueryResult>, "select" | "execute">;
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
  work: (query: Pick<AppDatabase<TQueryResult>, "select" | "execute">) => Promise<T>,
): Promise<T> {
  return work(scope[draftConsistentReadScopeBrand][draftReadExecutor]);
}

function createReadOnlyDraftAvailabilityScope<
  TQueryResult extends PgQueryResultHKT,
>(
  executor: Pick<AppDatabase<TQueryResult>, "select" | "execute">,
): ReadOnlyDraftAvailabilityScope<TQueryResult> {
  return {
    [draftConsistentReadScopeBrand]: { [draftReadExecutor]: executor },
    mode: "read_only",
  };
}

function createTransactionBoundDraftEnqueueScope<
  TQueryResult extends PgQueryResultHKT,
>(
  executor: Pick<AppDatabase<TQueryResult>, "select" | "execute">,
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
  transaction: Pick<AppDatabase<TQueryResult>, "select" | "execute">,
  operations: DraftTransactionScopeOperationsV1,
  work: (scope: TransactionBoundDraftEnqueueScope<TQueryResult>) => Promise<T>,
): Promise<T> {
  return work(createTransactionBoundDraftEnqueueScope(transaction, operations));
}
