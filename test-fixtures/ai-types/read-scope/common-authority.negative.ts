import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import type { DraftConsistentReadScope } from "@/ai/applications/draft-assistance/read-scopes";

export function rejectCommonMutationAuthority<TQueryResult extends PgQueryResultHKT>(
  scope: DraftConsistentReadScope<TQueryResult>,
) {
  return scope.lockSelectedConfigForNewRequest;
}
