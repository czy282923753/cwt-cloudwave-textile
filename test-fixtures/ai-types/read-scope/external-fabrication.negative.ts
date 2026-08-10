import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";

import type { ReadOnlyDraftAvailabilityScope } from "@/ai/applications/draft-assistance/read-scopes";

export function fabricateDraftScope<TQueryResult extends PgQueryResultHKT>():
  ReadOnlyDraftAvailabilityScope<TQueryResult> {
  return { mode: "read_only" };
}
