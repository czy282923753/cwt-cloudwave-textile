import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import type { AppDatabase } from "@/db/types";
import type { AiServiceResult } from "@/ai/errors";
import {
  withReadOnlyDraftAvailabilityScope,
  withTransactionBoundDraftEnqueueScope,
  type DraftTransactionScopeOperationsV1,
} from "@/ai/applications/draft-assistance/read-scopes";
import {
  withSyntheticCaseTransactionScope,
  withSyntheticObservationScope,
  type SyntheticCaseOperationsV1,
  type SyntheticCaseTransactionScope,
  type SyntheticObservationInputV1,
  type SyntheticObservationV1,
  type SyntheticReadExecutorV1,
} from "@/ai/testing/synthetic-application/read-scopes";

export function constructRealDraftScopes<TQueryResult extends PgQueryResultHKT>(
  database: AppDatabase<TQueryResult>,
  operations: DraftTransactionScopeOperationsV1,
): Promise<readonly ["read_only", "governed_enqueue_transaction"]> {
  return withReadOnlyDraftAvailabilityScope(database, async (readScope) =>
    withTransactionBoundDraftEnqueueScope(database, operations, async (requestScope) =>
      [readScope.mode, requestScope.mode]
    )
  );
}

export function constructRealSyntheticScopes(
  executor: SyntheticReadExecutorV1,
  operations: SyntheticCaseOperationsV1,
): Promise<readonly ["synthetic_observation", "synthetic_case_transaction"]> {
  return withSyntheticObservationScope(executor, async (readScope) =>
    withSyntheticCaseTransactionScope(executor, operations, async (requestScope) => {
      requireExactSyntheticTransactionScope(requestScope);
      return [readScope.mode, requestScope.mode];
    })
  );
}

function requireExactSyntheticTransactionScope(
  scope: SyntheticCaseTransactionScope,
): void {
  void scope.authorizeReserveAndSnapshotCase;
  void scope.findReplay;
  void scope.readFeatureState;
  void scope.readConfigResolution;
  void scope.confirmResolvedConfiguration;
  void scope.commitPreparedRun;
}

export function structuralExecutorProof(
  input: SyntheticObservationInputV1,
): Promise<AiServiceResult<SyntheticObservationV1>> {
  return Promise.resolve({
    ok: true,
    value: {
      epochLabel: "synthetic_epoch",
      observation: `${input.suiteKey}:${input.sampleOrdinal}`,
    },
  });
}
