import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import { expectTypeOf, it } from "vitest";

import type { ApplicationReadScope } from "@/ai/applications/contracts";

import type {
  DraftConsistentReadScope,
  ReadOnlyDraftAvailabilityScope,
  TransactionBoundDraftEnqueueScope,
} from "./read-scopes";

it("keeps generic, read-only, and transaction capabilities non-interchangeable", () => {
  expectTypeOf<ReadOnlyDraftAvailabilityScope<PgQueryResultHKT>>()
    .toMatchTypeOf<DraftConsistentReadScope<PgQueryResultHKT>>();
  expectTypeOf<TransactionBoundDraftEnqueueScope<PgQueryResultHKT>>()
    .toMatchTypeOf<DraftConsistentReadScope<PgQueryResultHKT>>();

  type ReadOnlyHasInsert = "insertPreparedWithRequiredAudit" extends
    keyof ReadOnlyDraftAvailabilityScope<PgQueryResultHKT> ? true : false;
  type CommonHasLock = "lockSelectedConfigForNewRequest" extends
    keyof DraftConsistentReadScope<PgQueryResultHKT> ? true : false;
  type CommonHasSelect = "select" extends
    keyof DraftConsistentReadScope<PgQueryResultHKT> ? true : false;
  type GenericHasLock = "authorizeLockAndSnapshotTargetForNewRequest" extends
    keyof ApplicationReadScope ? true : false;
  type TransactionHasInsert = "insertPreparedWithRequiredAudit" extends
    keyof TransactionBoundDraftEnqueueScope<PgQueryResultHKT> ? true : false;

  expectTypeOf<ReadOnlyHasInsert>().toEqualTypeOf<false>();
  expectTypeOf<CommonHasLock>().toEqualTypeOf<false>();
  expectTypeOf<CommonHasSelect>().toEqualTypeOf<false>();
  expectTypeOf<GenericHasLock>().toEqualTypeOf<false>();
  expectTypeOf<TransactionHasInsert>().toEqualTypeOf<true>();
});
