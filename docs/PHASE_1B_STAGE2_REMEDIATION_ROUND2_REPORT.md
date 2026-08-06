# CWT Phase 1B Stage 2 Focused Remediation Round 2 Report

Status: Focused Remediation Round 2 implementation complete; awaiting Independent Joint Review

Date: 2026-08-06

Production Ready: **No**

Formal data status: **Waiting for Real Product Data Validation**

This is developer implementation evidence. It does not close H2, H3, M3 or L1 independently, does not declare Review Passed, and does not accept or freeze Stage 2.

## 1. Baseline, branch and commit chain

| Item | Value |
|---|---|
| Remediation starting branch | `phase/1b-stage2` |
| Remediation starting HEAD | `0429cbb011fea8b7979aa97ae6613214d3817487` |
| Starting HEAD parent | `ad0f085530bc13ce58b90f1c028c77911dbef124` |
| Parent of `ad0f085` | `e51a03e117bbb174c5c22bb37b91e67eb3adbad7` |
| Stage 2 starting baseline | `phase-1b-stage1-approved-2026-08-06^{}` → `3c1d057845b415eaac2ee54ca42001b5ce0a3afb` |
| Stage 1 accepted code parent | `99688a9a65ea9d4bc55636c4c7050e6f7b48dcce` |
| Final branch | `phase/1b-stage2` |
| Main implementation/test commit | `9fd989925772ef35ecdadfb23f6f26b7ff63f42f` — `fix: close stage 2 remaining authority gaps` |
| Stable anonymous denial follow-up | `fd12750e40ed08fd4e43f18decc91626a917bc94` — `fix: stabilize anonymous admin denial` |
| Final implementation HEAD | `fd12750e40ed08fd4e43f18decc91626a917bc94`, directly before the pure documentation checkpoint containing this report |

The pre-existing Stage 1 and Stage 2 history was not rebased, squashed, amended or rewritten.

## 2. Modified files

The main implementation checkpoint changes 38 files, with 1,594 insertions and 166 deletions. The one-file follow-up replaces a thrown anonymous Dashboard authentication error with the same controlled login redirect already used by the Admin layout.

New files:

- `scripts/verify-postgres-stage2-round2.ts`
- `src/admin/editorial-resource-access.test.ts`
- `src/seo/system-public-routes.ts`
- `src/seo/system-public-routes.integration.test.ts`

Changed test and fixture files:

- `scripts/seed-e2e-block-projection.ts`
- `src/admin/components/block-editor.test.tsx`
- `src/admin/stage2-editor-boundaries.static.test.ts`
- `src/content/static-page-settings.integration.test.ts`
- `src/content/static-page-settings.test.ts`
- `src/editorial/block-editor-state.test.ts`
- `src/editorial/block-reference-projection.integration.test.tsx`
- `src/public-site/static-page-renderer.test.tsx`
- `tests/e2e/public.spec.ts`

Changed implementation files:

- `src/admin/actions.ts`
- `src/admin/components/block-editor.tsx`
- `src/admin/data.ts`
- `src/admin/refine/refine-admin-provider.tsx`
- `src/app/(admin-preview)/admin/preview/site/[pageKey]/page.tsx`
- `src/app/admin/applications/[id]/page.tsx`
- `src/app/admin/assets/page.tsx`
- `src/app/admin/contents/[id]/page.tsx`
- `src/app/admin/contents/page.tsx`
- `src/app/admin/fabric-library/[id]/page.tsx`
- `src/app/admin/layout.tsx`
- `src/app/admin/page.tsx`
- `src/app/admin/products/[id]/page.tsx`
- `src/app/admin/products/new/page.tsx`
- `src/app/admin/products/page.tsx`
- `src/app/admin/site/[pageKey]/page.tsx`
- `src/app/api/admin/preview-assets/[entityType]/[entityId]/[assetId]/route.ts`
- `src/content/static-page-projection.ts`
- `src/content/static-page-settings.ts`
- `src/db/seed.ts`
- `src/editorial/block-editor-state.ts`
- `src/editorial/block-references.ts`
- `src/public-site/data.ts`
- `src/public-site/public-asset-access.ts`
- `src/public-site/static-page-renderer.tsx`

This documentation checkpoint adds only `docs/PHASE_1B_STAGE2_REMEDIATION_ROUND2_REPORT.md`.

## 3. Schema and Migration integrity

Schema/Migration change: **No**.

- SQL files: 19; latest remains `0018_phase1b_editorial_media_foundation.sql`.
- Snapshots: 19; latest remains `0018_snapshot.json`.
- Journal entries: 19.
- `0019` does not exist.
- 0018 SQL SHA-256: `a7583d03b59d5858cb5e2cb2542dbc43bf6c620e2067ed900fe6d0d1d0257148`.
- 0018 Snapshot SHA-256: `faa9a0819303e82d097874c348d6258533a305da30df00da360055b70dac3073`.
- Journal SHA-256: `dfb08dad283762e80db4978c8381f88998cfde276ffb1f39c0f5de6f73e34867`.
- `src/db/schema`, `drizzle`, `package.json`, `pnpm-lock.yaml`, dependencies, environment files and production configuration have no diff from `0429cbb`.

## 4. H2 — fact-sensitive free-copy bypass

### Root cause

Home Manufacturing Strength and About Owned/Service Strength reused ordinary `moduleCopySchema`. Free Title, Eyebrow, Summary and placement Caption/Alt values could therefore become public assertions without Company Fact evidence.

### Remediation

- Fact-sensitive copy accepts only governed Fact keys; Service Strength has no free-copy payload.
- Fixed labels are code-level frozen structure labels:
  - `CWT Manufacturing & Service Strength`
  - `Own Manufacturing`
  - `Fabric Development & Matching`
  - `Sampling & Customization`
  - `Quality Check`
  - `Packing & Delivery Support`
- Admin forms no longer expose or submit sensitive Title, Eyebrow, Summary, Alt or Caption fields.
- Server parsing ignores legacy free-copy form fields, fixes placement Alt, and sets Caption to `null`.
- Domain parsing compatibly reads old settings but strips legacy sensitive copy. It does not create a second writer or dual-write old fields.
- Preview and Public share `StaticHomeRenderer` / `StaticAboutRenderer` and `projectStaticPageEvidenceGates`.

### Evidence Gate

A sensitive module enters Preview/Public DOM only when all of the following are current:

1. module enabled;
2. at least one selected verified, public-use, non-expired Company Fact with verifier, verification time and evidence identity;
3. at least one visible Public/Ready/scan-passed/rights-eligible/live-related Asset for that placement;
4. `subjectRelationship = cwt` and `isCwtOwnedFacility = true`.

Missing or revoked evidence removes the entire module, including fixed heading, Fact list, media and container. Public and Preview Asset delivery recheck the same current predicates. Tests cover Fact public-use revocation, expiry, rejection and deletion; partner/false ownership, rights revocation, scan failure, Asset deletion and relation closure; module disabled; legacy free copy; and Preview/Public renderer parity.

Compatibility behavior is deterministic: old free fields remain readable input, stop normal writes, stop public rendering, and normalize on the next legal save. They do not invalidate the whole approved page authority or restore Bootstrap copy.

## 5. H3 — complete resource-level Editorial policy

### Root cause

The existing resource policy already protected details, Preview, Preview Assets and Domain Services, but Product/Content indexes, create entry points, list queries and navigation still relied on coarse `*.read` capabilities. Cross-resource Draft metadata could be exposed before a page-level denial, and thrown authorization errors could surface as unstable server failures.

### Remediation

- Reused the single `canAccessEditorialResource` / `requireEditorialResourceAccess` policy; no new role system was added.
- Product and Content list/detail data functions require resource `manage` before issuing record queries.
- Product index/create/detail, Content index/create/detail, Home/About editor, Preview and Preview Assets use controlled server-side denial.
- Admin dashboard and Refine resources derive navigation from the same resource policy.
- Asset Library requests Product/Content lists only for resources the actor may manage.
- Product-dependent Application/Fabric Library detail queries fail closed before listing Product Drafts.
- Product, Content and Static Domain Services continue rechecking `write`, `review` and `apply` capabilities before persistence.
- Anonymous Admin Dashboard now uses a controlled login redirect instead of throwing during parallel child rendering; the focused browser rerun emitted no authentication exception log.

### Seven-role matrix

| Actor | Product | Content | Home/About |
|---|---|---|---|
| Admin | allowed per existing capabilities | allowed | allowed |
| Product Editor | index/create/detail/edit/Preview/Preview Asset | denied for unpublished Editorial resources | denied |
| Content Editor | denied for unpublished Product resources | index/create/detail/edit/Preview/Preview Asset | allowed within existing Content scope |
| Reviewer/Publisher | access only where existing review/apply capability and resource kind both allow it | same | same |
| Sales | denied | denied | denied |
| Analyst | denied | denied | denied |
| Anonymous | redirected/controlled denial with no metadata | same | same |

Unit, integration and browser tests assert indexes, create entry points, details, Preview, Preview Assets, navigation, direct list query calls and direct Domain Service calls. Denied pages expose no Draft title, status, timestamp, internal Route, edit link or record existence, and return controlled 404/login behavior rather than 500.

## 6. M3 — fixed public pages in current Route-ID authority

### Root cause

The Block Resolver allowed ten fixed paths through a string allowlist while the Admin picker used synthetic `fixed-*` IDs. Public CTA rendering could succeed without a persistent Route ID, so `internal_link_relations` and the Index Gate could not observe the link.

### Registration and single authority

- A shared code catalog lists the ten approved existing public paths:
  `/`, `/products/`, `/applications/`, `/fabric-library/`, `/resources/`, `/fabric-knowledge/`, `/china-textile-guide/`, `/china-sourcing-guide/`, `/about/`, `/get-quote/`.
- `registerSystemPublicRoutes` transactionally and idempotently registers them in the existing `routes` table.
- Existing current Route rows are reused only when locale, entity type, null system entity ID and current status match exactly.
- Route or active Redirect-source conflicts fail closed and roll back the whole registration.
- `seedCoreData` invokes the registration in the existing explicit Fresh/Test `db:seed` path. Runtime page reads, Block Save and public rendering never write Routes implicitly.
- Stage 6 must include the same explicit initialization step for deployment; this round does not implement deployment configuration.

The code catalog is not a second persistent authority: current database Route rows and stable Route IDs remain authoritative. No pseudo UUID, second table or second internal-link system was introduced.

### Resolver, Apply and Index behavior

- A fixed CTA fails closed before registration.
- The Resolver obtains the current Route ID and normalizes `/get-quote/#upload` to the `/get-quote/` Route while retaining the approved fragment.
- Redirect inputs continue normalizing to the final current Route.
- Product and Content Revision Apply use the existing transaction-scoped `synchronizeBlockInternalLinks` writer.
- CTA changes/deletions remove stale relations; duplicate destinations converge to one relation.
- Required Audit failure rolls back document/relation state.
- Public href, relation destination Route ID and Index Gate read the same authority.
- Canonical, Sitemap paths and the Frozen URL set are unchanged.

Fresh/current-0018 registration, current-0018 missing-registration recovery, repeat reuse, concurrent registration, Route conflict, Redirect conflict, Product Apply, Content Apply, deletion, deduplication and Audit rollback are covered. Quick-create remains route-less.

## 7. L1 — Locked Block sorting anchors

### Root cause and rule

The shared Reducer rejected direct mutation of a Locked Block but allowed a neighboring unlocked Block to cross it, indirectly changing the Locked Block index.

`canMoveBlock` now simulates the requested reorder and accepts it only when every Locked Block remains at its original index. The existing Reducer is final authority; Move Up, Move Down and pointer drop call the same function. No persistent Lock system or second Reducer was added.

- Unlocked Blocks may reorder inside the same continuous interval.
- Crossing a Locked anchor is rejected.
- Edge anchors are protected.
- UI disables invalid Move targets and marks invalid drop targets with an understandable unavailable state.
- Explicit Unlock restores normal ordering.
- Undo/Redo, saved/reloaded documents, Product and Content use the same behavior.

Unit/component tests cover edge, middle, pointer, interval, Unlock and history cases. Browser fixtures persist a middle Locked media Block in Product and Content; Playwright confirms the adjacent controls are disabled until explicit Unlock.

## 8. Previously closed Finding regression

Developer regression evidence remains green for:

- H1 Static Page unique Live authority and invalid/live/bootstrap behavior;
- H4 route-less quick-create;
- M1 autosave replay and typed conflict;
- M2 one Published Draft Revision;
- M4 responsive behavior and zoom;
- M5 Preview in public visual context;
- M6 Admin accessibility;
- L2 `window.opener = null`.

No Bootstrap/Live dual authority, second Revision, second Route/Link system, Preview-only renderer, old Textarea writer, public Admin dependency, or Stage 3 feature was introduced.

## 9. PostgreSQL 18.4 evidence

A new `postgres:18.4` container was bound only to `127.0.0.1:55432`. It used Synthetic/Test data and random disposable databases.

Results:

- Migration compatibility: **19/19 passed**, including Fresh, repeat/no-op, `0017→0018`, interruption/retry, two-client migration locking and contradiction fail-closed.
- Stage 1 remediation regression: **13/13 passed**.
- Stage 2 Round 2 focused PostgreSQL matrix: **6/6 passed**:
  - Fresh `0000→0018` and repeat/no-op;
  - H3 seven-role policy and direct service denial;
  - M3 registration, concurrency, Product/Content relations and Audit rollback;
  - H2 fixed copy, Evidence Gate and revocation;
  - L1 persisted anchor and Unlock;
  - zero residual transaction/lock state.
- Migration Journal in the focused database: 19.
- System public current Routes: 10.
- Final `idle in transaction`: 0.
- Final waiting locks: 0.
- Final granted advisory locks: 0.

The temporary databases, container, anonymous Volume and Synthetic storage were removed. No development, Preview, Production or shared database was used.

## 10. Automated quality gates

| Gate | Result |
|---|---|
| `pnpm env:diagnose` | passed; Node `v24.14.0`, pnpm `11.9.0`, ARM64 native dependencies healthy |
| `pnpm env:check` | passed |
| `pnpm lint` | passed, zero warnings |
| `pnpm typecheck` | passed |
| `pnpm exec drizzle-kit check` | passed |
| `pnpm test:run` | **72 files, 277/277 passed** |
| Focused final Vitest | **77/77 passed** |
| `pnpm build` | **40/40 routes passed** in a fresh migrated isolated PGlite directory |
| `pnpm check:bundle` | passed; 23 public manifests and 32 manifest/chunk files |
| `pnpm audit --prod` | passed; 0 known vulnerabilities |
| `pnpm exec playwright test --retries=0` | **35/35 passed, 0 retries** |
| `git diff --check` | passed before implementation commits and before this report |

The first default Build attempt correctly exposed the previously documented stale local PGlite Technical Debt (`content_localizations.structured_blocks` absent). The repository `.data` directory was not deleted, rebuilt or modified. A newly migrated isolated PGlite directory passed the final Build and was removed afterward.

No test uses `skip`, `todo` or `only`; no new `ts-ignore`, `ts-nocheck`, `eslint-disable`, dangerous `any`, empty catch or weakened assertion was added. The PostgreSQL validation script intentionally catches expected fail-closed scenarios and asserts that every expected failure occurred.

## 11. Browser, responsive and accessibility evidence

- Desktop Chromium and Pixel 7 Playwright projects passed.
- Widths `320`, `375`, `390`, `768`, `1024` and `1440` passed Admin/Public Preview overflow and operability checks.
- Product index/create/detail, Content index/create/detail, Home and About were exercised.
- Product/Content/Home/About Preview and Preview Assets were exercised through the role matrix.
- Home with missing sensitive evidence emitted no sensitive module container or title.
- About with current Fact and owned media emitted fixed labels and application-controlled media only.
- Empty/Divider Product emitted no narrative heading/container; Paragraph/Image/Gallery emitted the shared renderable projection.
- Product Editor saw Product navigation/data only; direct Content URL returned controlled 404 with no Draft metadata.
- Sales saw no Editorial navigation; direct Product URL returned controlled 404 with no Draft metadata.
- Fixed Content CTA rendered `/get-quote/` from its registered Route ID.
- Product and Content Locked anchor controls remained disabled until Unlock.
- Axe Critical: 0.
- Axe Serious: 0.
- Console errors/warnings: 0 in the independent in-app browser run.
- Page errors: 0.
- Hydration errors: 0.
- Critical horizontal overflow: 0.
- Preview remains authenticated, `noindex`, private/no-store and in Public visual context.

## 12. Authority and complexity accounting

Added:

- one code-level fixed-page Route catalog;
- one explicit, idempotent registrar over the existing Route table;
- one shared `canMoveBlock` predicate inside the existing Reducer module;
- additional tests and an isolated PostgreSQL harness.

Removed or narrowed:

- fixed-path string bypass in the Block Resolver;
- synthetic `fixed-*` picker identities;
- fact-sensitive free-copy writers and rendering;
- coarse resource assumptions in Editorial list/navigation entry points;
- cross-anchor reorder behavior.

No new table, field, Enum, Migration, Worker, Lease, Revision system, Asset relation, Preview mechanism, Autosave mechanism, Route authority, Internal Link relation system, persistent Lock system or role system was added.

## 13. URL, SEO, privacy and security impact

- Frozen public paths, Canonical behavior and Sitemap output are unchanged.
- System fixed pages gain stable current Route IDs only; no public URL is added or renamed.
- No Index eligibility predicate was duplicated or loosened.
- Non-production remains noindex.
- Sensitive facility copy cannot be user-authored through ordinary settings.
- Fact and owned-media revocation takes immediate effect in DOM and Asset delivery.
- Cross-resource Draft metadata and Preview Assets remain server-protected.
- No raw Object Key, permanent bucket URL, Private Inquiry data, credential or Provider data entered public output or test reports.

## 14. Known issues and review status

Developer-observed new issues after final verification:

- Blocker: 0.
- High: 0 newly observed; H2 and H3 still require independent review disposition.
- Medium: 0 newly observed; M3 still requires independent review disposition.
- Low: 1 pre-existing — `next/font/google` prevents guaranteed fully offline default Production Build reproduction; remains Stage 6 build/deployment scope. L1 still requires independent review disposition.

This accounting is not an independent closure of H2/H3/M3/L1.

## 15. Technical Debt and External Validation

Technical Debt:

- An old local PGlite directory can expose missing Stage 1 columns during a database-dependent Build. Stage 6 must enforce Migration/Readiness/Build ordering against the selected target database.
- Stage 6 must make fixed System Public Route registration an explicit deployment initialization/readiness step. Runtime reads intentionally never repair Route state.
- Provider-independent load, restore and production observability remain outside this round.

External Validation remains required for:

- formal Canonical and Cloudflare behavior;
- Tencent Cloud target resource limits;
- Production/Staging database, storage, secrets and administrator isolation;
- COS, backup and complete restore drill;
- Zoho, Scanner, shared Rate Limiter, Sentry and independent monitoring/alerting;
- AI Provider/Model/budget gate;
- formal Product, Company Fact and authorized Media validation.

## 16. Stage boundary and prohibited actions

- Push: **No**.
- Deploy: **No**.
- Tag create/move: **No**.
- Stage 3 implementation: **No**.
- Schema/Migration change: **No**.
- Real Provider connection: **No**.
- Production credential use: **No**.
- Formal Product/customer/Company Fact data use: **No**.
- Independent Review execution: **No**.
- Stage 2 Accepted/Frozen declaration: **No**.
- Production Ready: **No**.

Focused Remediation Round 2 implementation complete; awaiting Independent Joint Review.
