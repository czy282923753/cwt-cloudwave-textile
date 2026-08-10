import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import type { ReadOnlyDraftAvailabilityScope } from "@/ai/applications/draft-assistance/read-scopes";
import type { SyntheticObservationReadScope } from "@/ai/testing/synthetic-application/read-scopes";

function consumeDraftScope<TQueryResult extends PgQueryResultHKT>(
  scope: ReadOnlyDraftAvailabilityScope<TQueryResult>,
): void {
  void scope;
}

export function rejectSyntheticMode(scope: SyntheticObservationReadScope): void {
  consumeDraftScope(scope);
}
