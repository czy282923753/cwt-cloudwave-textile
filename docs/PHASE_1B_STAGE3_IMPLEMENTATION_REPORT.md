# Phase 1B Stage 3 — Product Import Implementation Report

Date: 2026-08-07  
Developer conclusion: **Implementation Complete — Candidate ready for Project Owner review.**  
This report does **not** claim Independent Review passed, Fresh Acceptance, Accepted/Frozen, Production Ready, or authorization for Stage 4.

## 1. Candidate and takeover boundary

| Item | Evidence |
| --- | --- |
| Frozen Stage 2 SEO remediation baseline | `5624ca993e31a07d9c7e19a5504aa82b5aba92ff` |
| Frozen tag | `phase-1b-stage2-seo-remediation-approved-2026-08-07` resolves to the Freeze commit |
| Authorized takeover checkpoint | `f28915f4e738951d82343ea62a37d660b71fa902` |
| Exclusive branch | `codex/phase-1b-stage3-product-import-continuation` |
| Source-code Candidate HEAD before this report-only commit | `10b22fb63fda4c3dc967c198750e5c9780de8f25` |
| Source branch handling | The original `codex/phase-1b-stage3-product-import` remained at `f28915f`; it was not checked out, modified, or committed to from this worktree. |

At takeover, the worktree was clean, the Freeze was an ancestor of `f28915f`, the exact Freeze-to-checkpoint distance was seven commits, `git diff --check` passed, and the historical tag had not moved. No rebase, amend, squash, tag, push, deployment, provider connection, formal-data import, or Production/Staging access occurred.

The old task was read only through its latest **Stage 3 Context Handoff** as a fact index. The handoff stated that the seven inherited commits had completed the Stage 3 implementation but still required final PostgreSQL, browser, and report evidence. This continuation independently re-read the governing documents and revalidated code, Git, migration, and tests rather than treating the handoff as proof.

### Inherited Stage 3 commit chain

1. `f91c1becf85075e633d6e3f30c4e851890e9a131` — durable Product Import authority.
2. `82c32b1f42016eaa228eec1fee0e7cfa71a9df00` — governed Product Import pipeline.
3. `3f4ad167274e181ff1625d045dd671a35c2a1c67` — Product Import operations workflow.
4. `1c10206e59ddb443ec7b426e23d9347557215740` — Stage 3 verification coverage.
5. `5dac25c9525489e2b769561224658653fd7b0990` — browser folder-import coverage.
6. `78bdc0a1c4d16bf94ac7743f70698044ef16b814` — Stage 3 safety-boundary coverage.
7. `f28915f4e738951d82343ea62a37d660b71fa902` — idempotent Import upload recovery.

### Continuation implementation commit

`10b22fb63fda4c3dc967c198750e5c9780de8f25` — `fix: harden stage 3 import replay and recovery`

- Removes the browser-side full-file SHA-256 read. The client no longer calls `File.arrayBuffer()` for folder media; trusted identity is always the finalized server Asset SHA-256.
- Keeps the legacy request SHA field optional and ignored so old clients cannot become a second identity authority.
- Prevents a stale failed Apply caller from overwriting a concurrently committed item result.
- Prevents a caller from marking a batch completed while another caller still owns a durable `valid` or `pending` item.
- Adds an operator-visible, authorization-scoped `Resume interrupted Apply` affordance for an `applying` batch. It invokes the existing Apply route and existing durable state; it adds no lease, worker, queue, table, or recovery authority.
- Adds a real browser HTTP response-loss regression: the first workbook PUT reaches the server and has its response aborted; the retry must reuse exactly the same Upload Intent URL.
- Replaces the prior limited PostgreSQL checker with an isolated localhost PostgreSQL 18.4 matrix that creates and removes its own databases and includes an actual `0018 → 0019` path.

## 2. Governing-boundary review

The implementation remains inside Template V1, ADR-0016, and Migration `0019`:

- Exactly two new durable Import tables exist: `product_import_batches` and `product_import_items`.
- `0019` does not mutate `0000`–`0018`; there is no `0020`, AI run, email/CRM, deployment, provider, or formal-data work.
- The Import authority owns parsing, normalized bounded evidence, row/item lifecycle, partial-success orchestration, and safe error export only. Product, Taxonomy, Application, Asset, Finalize, Variant, Product-Asset relation, Revision, Route/301, Audit, Recovery, and Cleanup remain existing authorities.
- Create and Update stay immutable modes. Create produces Draft/noindex Products; Published Product updates create pending Revisions. Import cannot Publish, enable Index, approve rights/facts, infer factual specifications, create taxonomy silently, or make a public URL from package paths.
- No direct `uploadAsset(... purpose=import)` entry point remains. Archive and folder flows converge on `createAdminUploadBatch`, `completeAdminUploadIntent`, and `finalizeAdminUploadBatch`; there is no second Finalize path.

### Upload metadata binding and source-declaration isolation

The only existing-Upload metadata extension is a bounded `declaration_input.importMediaBinding` on the child media upload batch. It is permitted only for a single isolated Product/gallery upload with `source_declaration_enabled = false`.

- The binding carries package Asset ID, deterministic source key/order, bounded relative path/display name, and SHA-256; it carries no source, rights, or declaration values.
- `source_declaration_enabled` remains a separate false column. Standard Finalize reads declaration/right data only when that column is true, so this Import binding is not Source Declaration evidence and cannot authorize public rights.
- Lookup is owner/session-scoped and uses the exact JSONB predicate `declaration_input -> 'importMediaBinding' ->> 'packageAssetId' = $packageAssetId`.
- The PostgreSQL matrix proved two declaration-off bindings for the package, the package stayed `imports`/`internal`, and child assets reached Public only through the existing scan/Finalize authority.

### Durable state and transaction design

`product_import_batches` has constrained `draft → validated → applying → completed|failed` lifecycle evidence. `product_import_items` holds both `row` and `media` kinds and constrained `pending|valid|applied|error|skipped` state, stable source identity, bounded JSONB, attempt count, and target IDs.

Each valid row Apply is one governed transaction: it claims the item from `valid` to `pending`, calls the existing Product/Revision services, records `applied`, and writes required Audit atomically. A required Audit failure rolls back the Product mutation and becomes a safe retryable row failure. A second caller cannot overwrite an already-applied row with a stale failure, and a batch only completes after no valid/pending rows remain. The batch remains durably `applying` for a safe re-entry if another caller still owns work or a process stops.

Same-token archive replay byte-verifies the entire new response stream against the completed package SHA-256, then returns the same package and bound child results. A valid active recovery lease rejects re-entry; an expired lease is reclaimed through existing Import-partition Recovery/Cleanup. Crash/retry tests proved no duplicate child Asset, Finalize result, Variant, Product, Product Code, or Product-Asset relation.

## 3. Complete changed-file and invariant impact

The full Freeze-to-source-candidate diff contains 59 Stage 3 implementation files. The final report itself is the only additional file in its report-only commit.

| Area | Files | Invariant impact |
| --- | --- | --- |
| Migration authority | `drizzle/0019_needy_slyde.sql`; `drizzle/meta/0019_snapshot.json`; `drizzle/meta/_journal.json`; `src/db/schema/imports.ts`; `src/db/schema/index.ts`; `src/db/phase1b-migration.integration.test.ts` | Adds only the approved two Import tables, bounded checks/FKs/indexes, and schema evidence. |
| Contract, parser, archive, matcher, orchestration | `src/imports/archive.ts`; `archive.test.ts`; `archive-upload.integration.test.ts`; `contract.ts`; `matching.ts`; `matching.test.ts`; `workbook.ts`; `workbook.test.ts`; `template.ts`; `service.ts`; `service.integration.test.ts`; `permission.test.ts`; `schema.integration.test.ts` | Template V1 parsing, ZIP safety, deterministic matching, Create/Update, partial success, retries, permissions, and synthetic/noindex behavior. |
| Existing Upload convergence | `src/uploads/admin-upload-service.ts`; `admin-upload-service.integration.test.ts`; `file-validation.ts`; `legacy-rescan-service.ts`; `object-cleanup-service.ts`; `service.ts`; `upload-recovery-service.ts`; `src/storage/local.ts`; `src/storage/s3.ts`; `src/storage/types.ts`; `src/test/in-memory-storage.ts`; `src/app/api/admin/upload-intents/[token]/route.ts` | Uses the existing Upload Intent/Batch, actual stream-byte, scan, Finalize, Import Recovery, and Cleanup mechanisms; Public/Private/Import boundaries remain isolated. |
| Product and access integration | `src/catalog/product-service.ts`; `src/auth/permissions.ts`; `src/config/env.ts`; `src/db/seed.ts`; `src/db/seed.integration.test.ts` | Uses existing Product Draft/Revision/route and permission authorities; feature remains default-off outside the authorized test fixture. |
| Admin UI and transport | `src/admin/components/product-import-wizard.tsx`; `product-import-wizard.test.tsx`; `product-import-apply.tsx`; `product-import-row-correction.tsx`; `src/admin/components/admin-table.tsx`; `src/admin/refine/refine-admin-provider.tsx`; `src/app/admin/layout.tsx`; `page.tsx`; `src/app/admin/products/page.tsx`; `src/app/admin/product-imports/page.tsx`; `src/app/admin/product-imports/[batchId]/page.tsx`; all seven `src/app/api/admin/product-imports/**` routes | Server routes parse/translate only; Domain Services enforce access/invariants. The UI is authenticated/noindex and exposes no raw Object Key, private path, rights approval, Publish, or Index control. |
| Dependencies and verification | `package.json`; `pnpm-lock.yaml`; `playwright.config.ts`; `scripts/verify-stage3-postgres.ts`; `tests/e2e/product-import.spec.ts` | Adds approved Excel/ZIP dependencies and Stage 3 verification only. No public Refine dependency, provider, credential, or deployment configuration was introduced. |

## 4. Migration identities and historical integrity

| Artifact | SHA-256 |
| --- | --- |
| `drizzle/0019_needy_slyde.sql` | `ea8d51f971fe160bcded1f588645db0e0f6f16d704eff34fa38350fb5d1314ed` |
| `drizzle/meta/0019_snapshot.json` | `46b68b39c738b03f9f69aee5574a4626c425afa497b1a1d60531f1efed94c5c9` |
| Final `drizzle/meta/_journal.json` | `1ecf43a8d0fd625457bf3677c174f6b8ea2e6bf2b49daf5f7d3a660392690c09` |
| Freeze `0000`–`0018` journal | `dfb08dad283762e80db4978c8381f88998cfde276ffb1f39c0f5de6f73e34867` |

`git diff --quiet` over all `0000`–`0018` SQL and snapshot files confirmed historical immutability. PostgreSQL Fresh and representative Upgrade both finished with 20 journal rows, latest ID 20. The catalog evidence for the two new tables was 2 tables, 45 constraints, 9 foreign keys, and 8 indexes; all required constraints and indexes were present.

## 5. Final verification evidence

| Gate | Exact final result |
| --- | --- |
| Focused continuation regression | 8 files, 31 tests passed. |
| ESLint | `pnpm lint` passed with `--max-warnings=0`. |
| TypeScript | `pnpm typecheck` passed. |
| Drizzle | `pnpm exec drizzle-kit check` passed: `Everything's fine`. |
| Full Vitest | `pnpm test:run`: **89/89 files, 328/328 tests passed** in 250.58s. |
| PostgreSQL | Disposable localhost **PostgreSQL 18.4** matrix passed; databases and container were removed afterward. |
| Production build | Fresh migrated/seeded isolated PGlite build passed: compile/type complete and **43/43** static page units generated. |
| Public bundle | Passed across 23 public page manifests and 31 referenced manifest/chunk files. |
| Production dependency audit | `pnpm audit --prod`: **No known vulnerabilities found**. |
| Playwright | `pnpm exec playwright test --retries=0`: **45/45 passed** in 1.8m, covering Desktop Chromium and Pixel 7. |
| Browser manual check | Isolated local Production build: Admin login and Product Import page rendered correctly; no warning/error logs, `scrollWidth = width = 1280`. |
| Hygiene | `git diff --check` passed; changed Stage 3 test/import sources contain no focused/skip marker. |

### PostgreSQL 18.4 matrix detail

The final run used `postgres:18.4` on localhost only, with `APP_ENV=test`, `DATABASE_DRIVER=postgres`, a local disposable administrator database, and `CWT_POSTGRES_VALIDATION=stage3-isolated`. The verifier created random `cwt_stage3_fresh_*` and `cwt_stage3_upgrade_*` databases, then removed both.

- Fresh `0000 → 0019`, then repeat/no-op: passed.
- Representative `0018 → 0019`: applied exactly one new migration, created exactly the two Import tables: passed.
- `0019` table/catalog/FK/index checks and `0000`–`0018` integrity: passed.
- Required Audit rollback, partial success/retry, same fingerprint concurrent creation/apply, and Product Code contention: passed. The contention result was exactly one Product with item states `applied,error`.
- Exact JSONB binding predicate: passed with two declaration-off Import-media bindings.
- Same-token byte-verified response-loss replay: returned the same durable package/child result; no Variant count increase.
- Active lease: safe re-entry rejected. Expired lease: Recovery reclaimed exactly one job.
- Import partition cleanup/expiry/storage interruption: Recovery and Cleanup completed exactly once; the expired Import Asset became deleted and its object was absent.
- Duplicate resistance: one Product-Asset relation for concurrent Apply, no duplicate child Assets, and 12 pre-existing archive Variants retained without replay growth.
- `pg_stat_activity`: idle-in-transaction 0, waiting 0. `pg_locks`: advisory locks 0.

### Browser and accessibility detail

The zero-retry Playwright run covered template download/upload, ZIP, an actual browser folder selection, preview, Apply, partial success, correction, retry, cancel, error export, authorization, and the new real HTTP response-loss path. In that path the first workbook PUT was delivered to the server, its response was aborted, the UI retried the exact same Intent URL, and the durable result was returned. The Desktop and Pixel 7 projects covered widths 320, 375, 390, 768, 1024, and 1440 where applicable; Axe Critical/Serious was zero and captured console/page/hydration errors were zero.

## 6. First failures and harness observations

None of the final Candidate gates failed. The following first-pass observations were retained rather than hidden:

1. Removing the browser SHA property initially broke existing typed test inputs; the field was retained as an optional legacy/ignored transport field while trusted SHA remains the finalized Asset record.
2. The first PostgreSQL invocation lacked Node's `react-server` condition and stopped at the existing `server-only` guard. The final isolated command uses `NODE_OPTIONS=--conditions=react-server`; no application authority changed.
3. The first exact JSONB verifier query incorrectly expected `sourceDeclarationEnabled` inside JSON. It is deliberately the separate false column. The verifier was corrected to prove the actual isolation design.
4. The first verifier estimate expected 25 catalog constraints. PostgreSQL reported the correct catalog count of 45 for the two relations; the strict expected catalog was corrected and then passed.
5. The default `pnpm build` used the preserved stale local database and failed static export on a missing `system_settings` relation. That local data was not deleted, migrated, or modified. A newly migrated/seeded isolated database then built 43/43 successfully.
6. A previous Playwright web-server process was present but no longer accepting connections. A new isolated local instance was used for manual browser inspection. The final 45-test Playwright run passed.
7. A cleanup-size inspection accidentally used Zsh's special `path` variable, hiding `du`; no deletion occurred. It was rerun with a non-special variable before exact-path cleanup.

## 7. Technical debt, external validation, and owner confirmations

### Technical debt / known limitations

- The preserved repository-default local PGlite data remains stale and can fail a database-dependent default build. It was intentionally not changed. Build orchestration/readiness belongs to the approved later operational scope.
- The accepted `next/font/google` non-hermetic/offline reproducibility limitation remains outside Stage 3.
- The PostgreSQL verification command needs the established `react-server` Node condition because the tested Domain Service is server-only. This is a local test-harness invocation requirement, not a runtime workaround.
- The continuation found no unresolved Stage 3 Candidate defect after final gates.

### External validation still required

- No Production/Staging database, bucket, secret, scanner, rate limiter, mail, analytics, provider, deployment, DNS, or formal Product/media data was contacted or configured.
- Stage 4 remains not authorized. AI/`ai_runs`, provider selection, and AI handoff are not implemented.
- Formal Product/media import remains **Waiting for Real Product Data Validation**. Synthetic fixtures only were used, remain noindex, and establish no company/product fact.
- Production Ready remains **No**.

### Owner confirmation required

Inquiry convergence remains **Owner Confirmation Required** and was not changed by this Stage 3 work.

## 8. Cleanup and handoff

The exact inherited isolated build directory `/private/tmp/cwt-stage3-final-build.6Dekav` (41 MB) was removed after verification. The continuation's exact isolated build/browser directories and the disposable PostgreSQL 18.4 container/databases were also removed. Repository `.data`, storage roots, workspace root, source branch, tags, and uncertain targets were not deleted.

At report creation the worktree is clean apart from this report file staged for the required report-only commit. After that commit, the expected state is clean. No Tag / Push / Deploy was performed.

Project Owner next step: inspect this Candidate and report, then decide whether to create the separate, just-in-time Stage 3 Independent Joint Review. Do not treat this developer report as an acceptance decision.
