import type { ApplicationReadScope } from "@/ai/applications/contracts";
import type {
  AiFeatureStateReadV1,
  AiModelConfigResolutionReadV1,
  AiModelConfigRow,
  DurableApplicationAssociationV1,
  PreparedCoreRunV1,
  PreparedRunCommitResultV1,
  ReplayLookupResultV1,
} from "@/ai/core/contracts";
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
  findReplay(input: SyntheticAuthorizedReplayLookupV1):
    Promise<AiServiceResult<ReplayLookupResultV1>>;
  readFeatureState(): Promise<AiServiceResult<AiFeatureStateReadV1>>;
  readConfigResolution(): Promise<AiServiceResult<AiModelConfigResolutionReadV1>>;
  confirmResolvedConfiguration(input: {
    readonly modelConfigId: string;
    readonly expectedRecordVersion: number;
  }): Promise<AiServiceResult<AiModelConfigRow>>;
  commitPreparedRun(input: PreparedCoreRunV1):
    Promise<AiServiceResult<PreparedRunCommitResultV1>>;
}

export interface SyntheticAuthorizedReplayLookupV1 {
  readonly idempotencyKey: string;
  readonly requestedByPrincipalId: string;
  readonly association: DurableApplicationAssociationV1;
  readonly fingerprintVersion: 1;
  readonly fingerprint: string;
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
    findReplay: operations.findReplay,
    readFeatureState: operations.readFeatureState,
    readConfigResolution: operations.readConfigResolution,
    confirmResolvedConfiguration: operations.confirmResolvedConfiguration,
    commitPreparedRun: operations.commitPreparedRun,
  });
}
