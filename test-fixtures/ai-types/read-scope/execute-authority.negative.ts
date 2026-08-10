import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import {
  withDraftReadExecutor,
  type DraftConsistentReadScope,
} from "@/ai/applications/draft-assistance/read-scopes";

export function rejectRawExecution<TQueryResult extends PgQueryResultHKT>(
  scope: DraftConsistentReadScope<TQueryResult>,
) {
  return withDraftReadExecutor(scope, async (database) => database.execute("select 1"));
}
