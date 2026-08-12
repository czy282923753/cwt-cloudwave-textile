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
import type { PricingPolicyRegistryV1 } from "@/ai/runs/pricing-policy";
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
  };
}
