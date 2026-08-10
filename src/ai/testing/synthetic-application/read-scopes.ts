import type { ApplicationReadScope } from "@/ai/applications/contracts";
import type { AiServiceResult } from "@/ai/errors";

export interface SyntheticObservationInputV1 {
  readonly suiteKey: string;
  readonly sampleOrdinal: number;
}

export interface SyntheticObservationV1 {
  readonly epochLabel: string;
  readonly observation: string;
}

export interface SyntheticReadExecutorV1 {
  observe(input: SyntheticObservationInputV1):
    Promise<AiServiceResult<SyntheticObservationV1>>;
}

export interface SyntheticCaseOperationsV1 {
  authorizeReserveAndSnapshotCase(input: SyntheticObservationInputV1):
    Promise<AiServiceResult<SyntheticObservationV1>>;
}

const syntheticReadScopeBrand = Symbol("synthetic-read-scope");
const syntheticReadExecutor = Symbol("synthetic-read-executor");

interface SyntheticPrivateReadStateV1 {
  readonly [syntheticReadScopeBrand]: {
    readonly [syntheticReadExecutor]: SyntheticReadExecutorV1;
  };
}

export interface SyntheticObservationReadScope
  extends ApplicationReadScope, SyntheticPrivateReadStateV1 {
  readonly mode: "synthetic_observation";
}

export interface SyntheticCaseTransactionScope
  extends ApplicationReadScope,
    SyntheticPrivateReadStateV1,
    SyntheticCaseOperationsV1 {
  readonly mode: "synthetic_case_transaction";
}

export function observeSyntheticCase(
  scope: SyntheticObservationReadScope | SyntheticCaseTransactionScope,
  input: SyntheticObservationInputV1,
): Promise<AiServiceResult<SyntheticObservationV1>> {
  return scope[syntheticReadScopeBrand][syntheticReadExecutor].observe(input);
}

export function withSyntheticObservationScope<T>(
  executor: SyntheticReadExecutorV1,
  work: (scope: SyntheticObservationReadScope) => Promise<T>,
): Promise<T> {
  return work({
    [syntheticReadScopeBrand]: { [syntheticReadExecutor]: executor },
    mode: "synthetic_observation",
  });
}

export function withSyntheticCaseTransactionScope<T>(
  executor: SyntheticReadExecutorV1,
  operations: SyntheticCaseOperationsV1,
  work: (scope: SyntheticCaseTransactionScope) => Promise<T>,
): Promise<T> {
  return work({
    [syntheticReadScopeBrand]: { [syntheticReadExecutor]: executor },
    mode: "synthetic_case_transaction",
    authorizeReserveAndSnapshotCase: operations.authorizeReserveAndSnapshotCase,
  });
}
