import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import type { GenericAiOrchestratorV1 } from "@/ai/core/contracts";
import { aiFailure, type AiServiceResult } from "@/ai/errors";
import type { AppDatabase } from "@/db/types";
import type { TypedApplicationRegistry } from "@/ai/applications/contracts";
import type { ReconstructibleDraftContextV1 } from "./context";
import type {
  AiAvailabilityV1,
  DraftAssistanceAvailabilityService,
  DraftAssistanceAvailabilityQueryV1,
  DraftAssistanceCommandV1,
  DraftAssistanceService,
  DraftDurableAssociationWithoutHashV1,
} from "./contracts";
import type {
  DraftConsistentReadScope,
  ReadOnlyDraftAvailabilityScope,
  TransactionBoundDraftEnqueueScope,
} from "./read-scopes";
import { withReadOnlyDraftAvailabilityScope } from "./read-scopes";
import type { ProtectedDraftCandidateV1 } from "@/ai/output/common";
import type {
  AuthoritativeAiActorV1,
  HumanAiOperationV1,
} from "@/ai/runs/repository";
import type { AiRunServiceV1 } from "@/ai/runs/service";

type ProductionRegistryV1<TQueryResult extends PgQueryResultHKT> = TypedApplicationRegistry<
  DraftAssistanceCommandV1,
  DraftDurableAssociationWithoutHashV1,
  ReconstructibleDraftContextV1,
  ProtectedDraftCandidateV1,
  DraftConsistentReadScope<TQueryResult>,
  ReadOnlyDraftAvailabilityScope<TQueryResult>,
  TransactionBoundDraftEnqueueScope<TQueryResult>
>;

function availabilityFailure(
  failure: AiServiceResult<never>,
): AiServiceResult<AiAvailabilityV1> {
  if (failure.ok) return aiFailure("internal_failure");
  return {
    ok: true,
    value: {
      available: false,
      manualEditorAvailable: failure.error.manualEditorAvailable,
      code: failure.error.code,
    },
  };
}

function availabilityCommand(
  input: DraftAssistanceAvailabilityQueryV1,
): DraftAssistanceCommandV1 {
  return {
    ...input,
    idempotencyKey: "00000000-0000-4000-8000-000000000000",
  };
}

export function createDraftAssistanceAvailabilityFacadeV1<
  TQueryResult extends PgQueryResultHKT,
>(dependencies: {
  readonly database: AppDatabase<TQueryResult>;
  readonly registry: ProductionRegistryV1<TQueryResult>;
  readonly orchestrator: GenericAiOrchestratorV1;
  readonly resolveAuthoritativeActor: (
    transaction: AppDatabase<TQueryResult>,
    claim: { readonly userId: string; readonly role: string },
  ) => Promise<AuthoritativeAiActorV1 | null>;
  readonly authoritativeActorCanPerform: (
    actor: AuthoritativeAiActorV1,
    operation: HumanAiOperationV1,
    entityType?: "product" | "content" | null,
  ) => boolean;
}): DraftAssistanceAvailabilityService {
  return {
    async inspectDraftAssistanceAvailability(query) {
      const command = availabilityCommand(query);
      const inspected = await withReadOnlyDraftAvailabilityScope(
        dependencies.database,
        {
          resolveActor: async (transaction) => {
            const actor = await dependencies.resolveAuthoritativeActor(
              transaction,
              command.actor,
            );
            return actor !== null &&
              dependencies.authoritativeActorCanPerform(actor, "availability")
              ? actor : null;
          },
          actorCanAccessEntityType: (actor, entityType) =>
            dependencies.authoritativeActorCanPerform(actor, "availability", entityType),
        },
        async (scope, actor) => {
          const authoritativeCommand: DraftAssistanceCommandV1 = {
            ...command,
            actor: { userId: actor.userId, role: actor.role },
          };
          const prepared = dependencies.registry.prepareInvocation({
            applicationClass: "draft_assistance",
            capability: "text",
            useCase: authoritativeCommand.useCase,
            actor: {
              principalId: actor.userId,
              roleKey: actor.role,
            },
            applicationPayload: authoritativeCommand,
          });
          if (!prepared.ok) return availabilityFailure(prepared);
          const invocation = prepared.value.bindAvailability(scope);
          if (!invocation.ok) return availabilityFailure(invocation);
          return dependencies.orchestrator.inspect(invocation.value);
        },
      );
      return inspected ?? availabilityFailure(aiFailure("authorization_denied"));
    },
  };
}

export function createDraftAssistanceDurableFacadeV1(dependencies: {
  readonly availability: DraftAssistanceAvailabilityService;
  readonly runService: AiRunServiceV1;
}): DraftAssistanceService & Pick<
  AiRunServiceV1,
  "readRun" | "cancelRun" | "manualRetry" | "rejectDisposition"
> {
  return {
    inspectDraftAssistanceAvailability: (query) =>
      dependencies.availability.inspectDraftAssistanceAvailability(query),
    async requestDraftAssistance(command) {
      const result = await dependencies.runService.requestDraftAssistance(command);
      if (!result.ok) return result;
      if (result.value.applicationClass !== "draft_assistance" ||
        result.value.useCase !== command.useCase) return aiFailure("internal_failure");
      return {
        ok: true,
        value: {
          runId: result.value.runId,
          applicationClass: "draft_assistance",
          useCase: command.useCase,
          status: result.value.status,
          queuedAt: result.value.queuedAt,
        },
      };
    },
    readRun: (input) => dependencies.runService.readRun(input),
    cancelRun: (input) => dependencies.runService.cancelRun(input),
    manualRetry: (input) => dependencies.runService.manualRetry(input),
    rejectDisposition: (input) => dependencies.runService.rejectDisposition(input),
  };
}
