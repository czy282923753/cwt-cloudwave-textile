import "server-only";

import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js/session";

import type { TypedApplicationRegistry } from "@/ai/applications/contracts";
import type {
  DraftAssistanceCommandV1,
  DraftDurableAssociationWithoutHashV1,
} from "@/ai/applications/draft-assistance/contracts";
import type { ReconstructibleDraftContextV1 } from "@/ai/applications/draft-assistance/context";
import {
  createPostgresDraftEnqueueOperationsV1,
  type DraftConsistentReadScope,
  type ReadOnlyDraftAvailabilityScope,
  type TransactionBoundDraftEnqueueScope,
  withTransactionBoundDraftEnqueueScope,
} from "@/ai/applications/draft-assistance/read-scopes";
import type { GenericAiOrchestratorV1 } from "@/ai/core/contracts";
import { aiFailure, type AiServiceResult } from "@/ai/errors";
import type { ProtectedDraftCandidateV1 } from "@/ai/output/common";
import type {
  AiRunAuthorizedReadV1,
  RunDispositionInputV1,
} from "@/ai/runs/contracts";
import type { PricingPolicyRegistryV1 } from "@/ai/runs/pricing-policy";
import { createAiRunRepositoryV1 } from "@/ai/runs/repository";
import {
  runGovernedMutation,
  type GovernedMutationOptions,
} from "@/audit/governed-mutation";
import type { AppDatabase } from "@/db/types";

type PhaseCPgDatabase = AppDatabase<PostgresJsQueryResultHKT>;
type ProductionRegistryV1 = TypedApplicationRegistry<
  DraftAssistanceCommandV1,
  DraftDurableAssociationWithoutHashV1,
  ReconstructibleDraftContextV1,
  ProtectedDraftCandidateV1,
  DraftConsistentReadScope<PostgresJsQueryResultHKT>,
  ReadOnlyDraftAvailabilityScope<PostgresJsQueryResultHKT>,
  TransactionBoundDraftEnqueueScope<PostgresJsQueryResultHKT>
>;

export interface AiRunServiceV1 {
  requestDraftAssistance(command: DraftAssistanceCommandV1): Promise<
    AiServiceResult<import("@/ai/core/contracts").CoreCommittedRunSummaryV1>
  >;
  readRun(input: {
    readonly runId: string;
    readonly actor: { readonly userId: string; readonly role: string };
  }): Promise<AiServiceResult<AiRunAuthorizedReadV1>>;
  cancelRun(input: {
    readonly runId: string;
    readonly actor: { readonly userId: string; readonly role: string };
    readonly expectedStateVersion: number;
    readonly reason: string;
  }): Promise<AiServiceResult<AiRunAuthorizedReadV1>>;
  manualRetry(input: {
    readonly runId: string;
    readonly actor: { readonly userId: string; readonly role: string };
    readonly expectedStateVersion: number;
  }): Promise<AiServiceResult<AiRunAuthorizedReadV1>>;
  rejectDisposition(input: Omit<RunDispositionInputV1, "actorUserId" | "actorRole"> & {
    readonly actor: { readonly userId: string; readonly role: string };
  }): Promise<AiServiceResult<AiRunAuthorizedReadV1>>;
}

function validActor(actor: { readonly userId: string; readonly role: string }): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(actor.userId) && ["admin", "product_editor", "content_editor"].includes(actor.role);
}

function validExpectedVersion(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function sanitizedText(value: string, max: number): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= max && !/[\u0000-\u001f\u007f]/u.test(trimmed)
    ? trimmed : null;
}

function lifecycleFailure(kind:
  | "not_found_or_unauthorized"
  | "state_conflict"
  | "transition_forbidden"
  | "lock_busy",
) {
  return aiFailure(kind === "not_found_or_unauthorized" ? "authorization_denied" : "state_conflict");
}

export function createAiRunServiceV1(
  database: PhaseCPgDatabase,
  dependencies: {
    readonly executionEnvironment: "local" | "test" | "staging" | "production";
    readonly pricingRegistry: PricingPolicyRegistryV1;
    readonly registry: ProductionRegistryV1;
    readonly orchestrator: GenericAiOrchestratorV1;
    readonly governedMutationOptions?: GovernedMutationOptions;
  },
): AiRunServiceV1 {
  const repository = createAiRunRepositoryV1(database);
  const readAfterMutation = async (input: {
    readonly runId: string;
    readonly actor: { readonly userId: string; readonly role: string };
  }): Promise<AiServiceResult<AiRunAuthorizedReadV1>> => {
    const row = await repository.readAuthorized({
      runId: input.runId,
      actorUserId: input.actor.userId,
      actorRole: input.actor.role,
    });
    return row === null ? aiFailure("authorization_denied") : { ok: true, value: row };
  };
  return {
    async requestDraftAssistance(command) {
      const prepared = dependencies.registry.prepareInvocation({
        applicationClass: "draft_assistance",
        capability: "text",
        useCase: command.useCase,
        actor: {
          principalId: command.actor.userId,
          roleKey: command.actor.role,
        },
        applicationPayload: command,
      });
      if (!prepared.ok) return prepared;
      if (dependencies.executionEnvironment === "production") {
        return aiFailure("environment_not_authorized");
      }
      const executionEnvironment = dependencies.executionEnvironment;
      return runGovernedMutation(database, async ({ transaction, audit }) => {
        const operations = createPostgresDraftEnqueueOperationsV1({
          transaction,
          command,
          executionEnvironment,
          pricingRegistry: dependencies.pricingRegistry,
          audit,
        });
        return withTransactionBoundDraftEnqueueScope<
          PostgresJsQueryResultHKT,
          AiServiceResult<import("@/ai/core/contracts").CoreCommittedRunSummaryV1>
        >(
          transaction,
          operations,
          async (scope) => {
            const invocation = prepared.value.bindRequest({
              scope,
              idempotencyKey: command.idempotencyKey,
            });
            return invocation.ok ? dependencies.orchestrator.request(invocation.value) : invocation;
          },
        );
      }, dependencies.governedMutationOptions);
    },

    async readRun(input) {
      if (!validActor(input.actor)) return aiFailure("authorization_denied");
      return readAfterMutation(input);
    },

    async cancelRun(input) {
      const reason = sanitizedText(input.reason, 500);
      if (!validActor(input.actor) || !validExpectedVersion(input.expectedStateVersion) || reason === null) {
        return aiFailure("state_conflict");
      }
      const outcome = await runGovernedMutation(database, async ({ transaction, audit }) => {
        const result = await repository.cancelWithinGovernedTransaction(transaction, {
          runId: input.runId,
          actorUserId: input.actor.userId,
          actorRole: input.actor.role,
          expectedStateVersion: input.expectedStateVersion,
          reason,
        });
        if (result.kind !== "updated") return result;
        await audit({
          actorUserId: input.actor.userId,
          action: "ai.run.cancelled",
          entityType: "ai_run",
          entityId: result.row.runId,
          beforeSummary: { stateVersion: input.expectedStateVersion },
          afterSummary: {
            targetType: result.row.targetType,
            targetId: result.row.targetId,
            status: result.row.status,
            reasonPresent: true,
            stateVersion: result.row.stateVersion,
          },
        });
        return result;
      }, dependencies.governedMutationOptions);
      if (outcome.kind !== "updated") return lifecycleFailure(outcome.kind);
      return readAfterMutation(input);
    },

    async manualRetry(input) {
      if (!validActor(input.actor) || !validExpectedVersion(input.expectedStateVersion)) {
        return aiFailure("state_conflict");
      }
      const outcome = await runGovernedMutation(database, async ({ transaction, audit }) => {
        const result = await repository.manualRetryWithinGovernedTransaction(transaction, {
          runId: input.runId,
          actorUserId: input.actor.userId,
          actorRole: input.actor.role,
          expectedStateVersion: input.expectedStateVersion,
        });
        if (result.kind !== "updated") return result;
        await audit({
          actorUserId: input.actor.userId,
          action: "ai.run.manual_retry_scheduled",
          entityType: "ai_run",
          entityId: result.row.runId,
          beforeSummary: { stateVersion: input.expectedStateVersion },
          afterSummary: {
            targetType: result.row.targetType,
            targetId: result.row.targetId,
            status: result.row.status,
            retryState: result.row.retryState,
            stateVersion: result.row.stateVersion,
          },
        });
        return result;
      }, dependencies.governedMutationOptions);
      if (outcome.kind !== "updated") return lifecycleFailure(outcome.kind);
      return readAfterMutation(input);
    },

    async rejectDisposition(input) {
      const allowedLabels = new Set([
        "factual_issue", "relevance", "clarity", "tone", "format", "duplication", "unsafe_claim",
      ]);
      const labels = [...input.qualityLabels];
      const comment = input.qualityComment === null ? null : sanitizedText(input.qualityComment, 1_000);
      if (!validActor(input.actor) || !validExpectedVersion(input.expectedStateVersion) ||
        input.disposition !== "rejected" || !/^[0-9a-f]{64}$/.test(input.candidateHash) ||
        (input.qualityRating !== null && (!Number.isInteger(input.qualityRating) ||
          input.qualityRating < 1 || input.qualityRating > 5)) ||
        labels.some((label) => !allowedLabels.has(label)) || new Set(labels).size !== labels.length ||
        (input.qualityComment !== null && comment === null)) {
        return aiFailure("state_conflict");
      }
      const outcome = await runGovernedMutation(database, async ({ transaction, audit }) => {
        const result = await repository.rejectDispositionWithinGovernedTransaction(transaction, {
          runId: input.runId,
          actorUserId: input.actor.userId,
          actorRole: input.actor.role,
          expectedStateVersion: input.expectedStateVersion,
          disposition: "rejected",
          candidateHash: input.candidateHash,
          qualityRating: input.qualityRating,
          qualityLabels: labels,
          qualityComment: comment,
        });
        if (result.kind !== "updated") return result;
        await audit({
          actorUserId: input.actor.userId,
          action: "ai.run.disposition_recorded",
          entityType: "ai_run",
          entityId: result.row.runId,
          beforeSummary: { stateVersion: input.expectedStateVersion },
          afterSummary: {
            targetType: result.row.targetType,
            targetId: result.row.targetId,
            disposition: result.row.humanDisposition,
            candidateHash: result.row.candidateHash,
            ratingPresent: result.row.qualityRating !== null,
            qualityLabels: result.row.qualityLabels,
            stateVersion: result.row.stateVersion,
          },
        });
        return result;
      }, dependencies.governedMutationOptions);
      if (outcome.kind !== "updated") return lifecycleFailure(outcome.kind);
      return readAfterMutation({ runId: input.runId, actor: input.actor });
    },
  };
}
