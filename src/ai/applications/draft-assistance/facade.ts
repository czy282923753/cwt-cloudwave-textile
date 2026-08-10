import { z } from "zod";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import type { GenericAiOrchestratorV1 } from "@/ai/core/contracts";
import { aiFailure, type AiServiceResult } from "@/ai/errors";
import type { AppDatabase } from "@/db/types";
import type { TypedApplicationRegistry } from "@/ai/applications/contracts";
import type { ReconstructibleDraftContextV1 } from "./context";
import type {
  AiAvailabilityV1,
  AiRunSummaryV1,
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

const uuid = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
);
const actorSchema = z.object({
  userId: uuid,
  role: z.enum(["admin", "product_editor", "content_editor", "reviewer_publisher", "sales", "analyst"]),
}).strict();
const targetSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("product_draft"), productId: uuid, locale: z.literal("en"), expectedVersion: z.number().int().positive() }).strict(),
  z.object({ type: z.literal("content_draft"), contentId: uuid, locale: z.literal("en"), expectedVersion: z.number().int().positive() }).strict(),
  z.object({ type: z.literal("editorial_revision"), revisionId: uuid, expectedVersion: z.number().int().positive() }).strict(),
]);
const selectorSchema = z.array(z.object({ sourceClass: z.string() }).passthrough()).max(32);

type ProductionRegistryV1<TQueryResult extends PgQueryResultHKT> = TypedApplicationRegistry<
  DraftAssistanceCommandV1,
  DraftDurableAssociationWithoutHashV1,
  ReconstructibleDraftContextV1,
  ProtectedDraftCandidateV1,
  DraftConsistentReadScope<TQueryResult>,
  ReadOnlyDraftAvailabilityScope<TQueryResult>,
  TransactionBoundDraftEnqueueScope<TQueryResult>
>;

function coarseRoleAllowed(role: string): boolean {
  return role === "admin" || role === "product_editor" || role === "content_editor";
}

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
): AiServiceResult<DraftAssistanceCommandV1> {
  const actor = actorSchema.safeParse(input.actor);
  if (!actor.success) return aiFailure("authorization_denied");
  if (!coarseRoleAllowed(actor.data.role)) return aiFailure("authorization_denied");
  if (typeof input.useCase !== "string" || !/^[a-z][a-z0-9_]{0,63}$/.test(input.useCase)) {
    return aiFailure("use_case_unknown");
  }
  const target = targetSchema.safeParse(input.target);
  if (!target.success) return aiFailure("target_scope_mismatch");
  if (!selectorSchema.safeParse(input.contextSelections).success) {
    return aiFailure("context_field_forbidden");
  }
  const base = {
    useCase: input.useCase,
    actor: actor.data,
    target: target.data,
    idempotencyKey: "00000000-0000-4000-8000-000000000000",
    contextSelections: input.contextSelections,
  };
  return input.explicitInput === undefined
    ? { ok: true, value: base }
    : { ok: true, value: { ...base, explicitInput: input.explicitInput } };
}

export function createDraftAssistanceFacadeV1<
  TQueryResult extends PgQueryResultHKT,
>(dependencies: {
  readonly database: AppDatabase<TQueryResult>;
  readonly registry: ProductionRegistryV1<TQueryResult>;
  readonly orchestrator: GenericAiOrchestratorV1;
}): DraftAssistanceService {
  return {
    async inspectDraftAssistanceAvailability(query) {
      const command = availabilityCommand(query);
      if (!command.ok) return availabilityFailure(command);
      const prepared = dependencies.registry.prepareInvocation({
        applicationClass: "draft_assistance",
        capability: "text",
        useCase: command.value.useCase,
        actor: {
          principalId: command.value.actor.userId,
          roleKey: command.value.actor.role,
        },
        applicationPayload: command.value,
      });
      if (!prepared.ok) return availabilityFailure(prepared);
      return withReadOnlyDraftAvailabilityScope(dependencies.database, async (scope) => {
        const invocation = prepared.value.bindAvailability(scope);
        if (!invocation.ok) return availabilityFailure(invocation);
        return dependencies.orchestrator.inspect(invocation.value);
      });
    },
    async requestDraftAssistance(command): Promise<AiServiceResult<AiRunSummaryV1>> {
      const actor = actorSchema.safeParse(command.actor);
      if (!actor.success || !coarseRoleAllowed(actor.data.role)) {
        return aiFailure("authorization_denied");
      }
      if (!uuid.safeParse(command.idempotencyKey).success) {
        return aiFailure("idempotency_conflict");
      }
      const prepared = dependencies.registry.prepareInvocation({
        applicationClass: "draft_assistance",
        capability: "text",
        useCase: command.useCase,
        actor: { principalId: actor.data.userId, roleKey: actor.data.role },
        applicationPayload: command,
      });
      if (!prepared.ok) return prepared;
      return aiFailure("integration_not_ready");
    },
  };
}
