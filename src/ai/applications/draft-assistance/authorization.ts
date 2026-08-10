import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import type {
  ApplicationAvailabilityAuthorization,
  ApplicationRequestAuthorization,
} from "@/ai/applications/contracts";
import type { AiServiceResult } from "@/ai/errors";

import type {
  AuthorizedDraftAssociationV1,
  DraftAssistanceCommandV1,
  DraftDurableAssociationWithoutHashV1,
} from "./contracts";
import type {
  ReadOnlyDraftAvailabilityScope,
  TransactionBoundDraftEnqueueScope,
} from "./read-scopes";

export interface DraftTargetReadRepository<
  TQueryResult extends PgQueryResultHKT,
> {
  authorizeAndReadTargetForAvailability(input: {
    readonly scope: ReadOnlyDraftAvailabilityScope<TQueryResult>;
    readonly actor: import("@/ai/core/contracts").CoreAiActorV1;
    readonly command: DraftAssistanceCommandV1;
    readonly association: DraftDurableAssociationWithoutHashV1;
  }): Promise<AiServiceResult<AuthorizedDraftAssociationV1>>;
}

export function createDraftAvailabilityAuthorization<
  TQueryResult extends PgQueryResultHKT,
>(
  repository: DraftTargetReadRepository<TQueryResult>,
): ApplicationAvailabilityAuthorization<
  DraftAssistanceCommandV1,
  DraftDurableAssociationWithoutHashV1,
  ReadOnlyDraftAvailabilityScope<TQueryResult>
> {
  return {
    associationKind: "draft_target.v1",
    authorizeAndSnapshotForAvailability(input) {
      return repository.authorizeAndReadTargetForAvailability({
        scope: input.scope,
        actor: input.actor,
        command: input.command,
        association: input.association,
      });
    },
  };
}

export function createDraftRequestAuthorization<
  TQueryResult extends PgQueryResultHKT,
>(): ApplicationRequestAuthorization<
  DraftAssistanceCommandV1,
  DraftDurableAssociationWithoutHashV1,
  TransactionBoundDraftEnqueueScope<TQueryResult>
> {
  return {
    associationKind: "draft_target.v1",
    authorizeAndSnapshotForRequest(input) {
      return input.scope.authorizeLockAndSnapshotTargetForNewRequest({
        actor: input.actor,
        command: input.command,
        association: input.association,
      });
    },
  };
}
