# CWT Phase 1B Stage 2 Consolidated Remediation Report

Status: Remediation implementation complete; awaiting Consolidated Remediation Review

Date: 2026-08-06

Production Ready: **No**

Formal data status: **Waiting for Real Product Data Validation**

This is a developer remediation record. It does not declare the Independent Joint Review passed and does not accept or freeze Stage 2.

## 1. Baseline, branch and commits

| Item | Value |
|---|---|
| Remediation starting branch | `phase/1b-stage2` |
| Remediation starting HEAD | `e51a03e117bbb174c5c22bb37b91e67eb3adbad7` |
| Stage 2 starting baseline | `phase-1b-stage1-approved-2026-08-06^{}` → `3c1d057845b415eaac2ee54ca42001b5ce0a3afb` |
| Final branch | `phase/1b-stage2` |
| Remediation implementation commit | `ad0f085530bc13ce58b90f1c028c77911dbef124` — `fix: complete stage 2 consolidated remediation` |
| Final HEAD | The pure documentation checkpoint containing this report, directly after `ad0f085530bc13ce58b90f1c028c77911dbef124` |

The three pre-existing Stage 2 commits were not rebased, squashed, amended or otherwise rewritten.

## 2. Changed files

The implementation checkpoint changes 56 files: 2,284 insertions and 453 deletions. The Preview pages are moves into a route group, not a second set of page implementations.

Configuration and validation scripts:

- `playwright.config.ts`
- `scripts/seed-e2e-block-projection.ts`
- `scripts/seed-e2e-editorial-roles.ts`
- `scripts/verify-postgres-stage1-remediation.ts`
- `scripts/verify-postgres-stage2.ts`
- `tests/e2e/public.spec.ts`

Admin actions, policy, data and components:

- `src/admin/actions.ts`
- `src/admin/data.ts`
- `src/admin/preview-data.ts`
- `src/admin/preview-policy.ts`
- `src/admin/preview-policy.test.ts`
- `src/admin/stage2-editor-boundaries.static.test.ts`
- `src/admin/components/admin-action-form.tsx`
- `src/admin/components/admin-action-form.test.tsx`
- `src/admin/components/admin-table.tsx`
- `src/admin/components/asset-upload-form.tsx`
- `src/admin/components/block-editor.tsx`
- `src/admin/components/block-editor.test.tsx`
- `src/admin/components/media-placement-editor.tsx`
- `src/admin/components/preview-viewport-panel.tsx`
- `src/admin/components/preview-viewport-panel.test.tsx`
- `src/admin/components/product-relation-selectors.tsx`

Routes and pages:

- `src/app/page.tsx`
- `src/app/about/page.tsx`
- `src/app/admin/layout.tsx`
- `src/app/admin/products/[id]/page.tsx`
- `src/app/admin/contents/[id]/page.tsx`
- `src/app/admin/site/[pageKey]/page.tsx`
- `src/app/admin/taxonomy/page.tsx`
- `src/app/admin/applications/[id]/page.tsx`
- `src/app/admin/preview/product/[id]/page.tsx` moved to `src/app/(admin-preview)/admin/preview/product/[id]/page.tsx`
- `src/app/admin/preview/content/[id]/page.tsx` moved to `src/app/(admin-preview)/admin/preview/content/[id]/page.tsx`
- `src/app/admin/preview/site/[pageKey]/page.tsx` moved to `src/app/(admin-preview)/admin/preview/site/[pageKey]/page.tsx`
- `src/app/api/admin/preview-assets/[entityType]/[entityId]/[assetId]/route.ts`

Domain, editorial and public projection:

- `src/catalog/application-service.ts`
- `src/catalog/product-service.ts`
- `src/catalog/product-service.integration.test.ts`
- `src/catalog/stage2-quick-create.integration.test.ts`
- `src/catalog/taxonomy-service.ts`
- `src/content/company-facts-service.ts`
- `src/content/content-service.ts`
- `src/content/content-service.integration.test.ts`
- `src/content/static-page-projection.ts`
- `src/content/static-page-settings.ts`
- `src/content/static-page-settings.test.ts`
- `src/content/static-page-settings.integration.test.ts`
- `src/editorial/block-editor-state.ts`
- `src/editorial/block-editor-state.test.ts`
- `src/editorial/block-references.ts`
- `src/editorial/block-reference-projection.integration.test.tsx`
- `src/editorial/conflict.ts`
- `src/editorial/stage2-autosave.integration.test.ts`
- `src/public-site/data.ts`
- `src/public-site/public-asset-access.ts`
- `src/public-site/static-page-renderer.tsx`
- `src/public-site/static-page-renderer.test.tsx`

This documentation checkpoint adds only `docs/PHASE_1B_STAGE2_REMEDIATION_REPORT.md`.

## 3. Schema and Migration integrity

Schema/Migration changed: **No**.

- No `0019` exists.
- SQL files: 19.
- Snapshot files: 19.
- Journal entries: 19; latest remains `0018_phase1b_editorial_media_foundation`.
- `0018` SQL SHA-256: `a7583d03b59d5858cb5e2cb2542dbc43bf6c620e2067ed900fe6d0d1d0257148`.
- `0018` Snapshot SHA-256: `faa9a0819303e82d097874c348d6258533a305da30df00da360055b70dac3073`.
- Journal SHA-256: `dfb08dad283762e80db4978c8381f88998cfde276ffb1f39c0f5de6f73e34867`.
- `git diff e51a03e... -- drizzle package.json pnpm-lock.yaml drizzle.config.ts src/db/schema.ts` is empty.
- All `0000`–`0018` historical identities therefore remain unchanged from the remediation baseline.

No table, field, enum, Snapshot, Journal entry, dependency, Lockfile entry or production configuration was added or changed.

## 4. High findings H1–H4

### H1 — Static Page unique Live authority

Root cause: approved Setting reads, Admin and the renderer could independently replace missing or invalid database values with `DEFAULT_STATIC_PAGE_CONFIGS`, creating a second Live authority.

Correction:

- `resolveStaticPageLiveAuthority` now produces exactly `bootstrap`, `live` or `invalid`.
- Bootstrap is used only when no approved Setting exists.
- A valid approved Setting is the only Live authority and is not completed from code defaults.
- An existing malformed or unsupported Setting fails closed; Public emits a minimal unavailable state and a sanitized error, while Admin reports `Invalid Live Configuration`.
- Public data, Admin data, Preview data and the shared renderer consume that same authority result.
- Renderer-level copy fallback was removed, so missing optional approved copy remains absent.

Evidence: unit and integration coverage verifies absent Setting bootstrap, complete approved replacement, no copy refill, invalid fail-closed, shared Admin/Public/Preview state and no double render.

### H2 — current Company Fact and Owned Facility boundary

Root cause: Apply-time validation and copied free-form summaries could outlive a Fact or Asset eligibility change.

Correction:

- `currentPublicCompanyFactConditions` is the shared current predicate for Save, Review, Apply, Admin/Public projection and Preview.
- It requires verified/public state, verifier and verification time, non-empty fact identity/evidence, and an unexpired `reviewAfter` lifecycle.
- Manufacturing/Owned modules no longer emit arbitrary factual summaries; verified Fact references are the factual output authority.
- Public HTML, Public Asset delivery and Preview Asset delivery recheck public partition, readiness, scan, deletion, rights, current live relationship, module visibility, `subjectRelationship = cwt` and `isCwtOwnedFacility = true` at request time.
- A Fact expiry/revocation or an Owned Asset metadata/relationship change immediately removes the HTML projection and, absent another eligible public relationship, denies the old controlled Asset URL.

Evidence covers partner/non-CWT/null/false ownership, lifecycle expiry, rights/deletion/scan/module revocation, alternative valid relationship handling and continued Private/Internal/Import denial.

### H3 — one resource-level editor and Preview policy

Root cause: broad `*.read` checks were used as unpublished editor/Preview authority, and some anonymous paths surfaced internal authorization errors.

Correction:

- `canAccessEditorialResource` and `requireEditorialResourceAccess` combine the existing permission capability with the resource boundary for Product, Content and Static Page actions.
- Admin editor pages, Preview pages, Preview data, Preview Asset delivery, Server Actions and Domain Services reuse the same policy.
- Product Editor is Product-only; Content Editor covers Content and allowed Static Pages; Reviewer/Publisher and Admin retain governed responsibilities; Sales, Analyst and cross-resource editors fail closed.
- Editor pages and Preview pages resolve the session then return a controlled 404 for an unauthorized resource. Authenticated cross-resource Preview Asset access returns 404 to avoid existence disclosure; anonymous Preview Asset access returns controlled 403. No unauthorized path returns 500.
- Preview Asset delivery requires an exact Entity relation from the active Draft/in-review Revision or the exact current Live projection, plus visible/module/public-ready eligibility.

The automated matrix covers Admin, Product Editor, Content Editor, Reviewer/Publisher, Sales, Analyst and Anonymous across Product, Content, Home, About, their four Preview pages and four Preview Asset classes.

### H4 — Quick-create is internal-only

Root cause: quick creation reused a public creation flow that allocated Route and SEO authority before approval.

Correction:

- `quickCreateTaxonomyTerm` and `quickCreateApplicationDraft` create only normalized internal entities and English Localization records under `taxonomy.manage` and Required Audit.
- They do not create a Route, SEO row, Published status or Index authority.
- Concurrent normalized duplicates converge on the same internal authority rather than creating two records.
- Public taxonomy/Application queries require the existing approved current Route and public eligibility.
- The existing explicit category approval and Application publication flows are the only paths that allocate Route and noindex SEO records, with collision checks.

Evidence verifies immediate internal selection, no public page/Sitemap entry before approval, one Route after explicit approval and retained Route collision rejection.

## 5. Medium findings M1–M6

### M1 — replay-safe autosave and typed conflict

`EditorialDraftConflictError` is the shared conflict type. Direct Product/Content and Static Page saves compare the submitted canonical projection after an optimistic version miss: an exact response-loss replay returns the current successful result without another version or Audit; a different payload raises typed conflict and never overwrites. Admin Action and Block Editor map it to `Conflict`, retain local values and expose `Reload latest server Draft`; network errors remain `Save failed`.

### M2 — one Published Draft Revision

Published Product and Content changes now get or patch the single current editable `editorial_revisions` Draft. Product `pendingChanges` canonically merges Blocks, name/summary, facts, structure, media, taxonomy/Application/features/FAQ, SEO and Product Code correction. Content merges Blocks, metadata and media into its one Draft snapshot. Editor data and Preview overlay that same Draft; Review remains explicit and Apply atomically projects all changes to Live. Exact retries create neither a second Revision nor another success Audit, and two-tab divergence conflicts.

### M3 — existing Internal Link authority synchronized

The shared Block Resolver returns the resolved current destination Route ID and normalized current path. Active redirect input is normalized one step to the current destination, so an old redirect path is never stored as approved document authority. `synchronizeBlockInternalLinks` runs inside Product and Content Apply transactions: it removes obsolete relations, deduplicates destinations and inserts the approved set in `internal_link_relations`. Target invalidation fails before Apply, Route movement remains traceable by Route ID, and Required Audit failure rolls the relation changes back with the business mutation.

### M4 — 320–390px and zoom-equivalent reflow

Admin headers, forms, Asset Upload, fixed-page settings, media placement, Block controls and relation pickers now use shrinkable grid/flex children, `min-w-0`, `w-full`, wrapping and narrow-screen padding. Long Select options, Asset names and Block IDs cannot force page-level horizontal scroll. No global overflow hiding was added; existing complex tables retain local scrolling.

### M5 — Preview uses Public visual context

The three Preview pages moved from the Admin layout into the `(admin-preview)` route group while retaining the same `/admin/preview/...` URLs. They keep authentication, resource policy, noindex and private/no-store behavior, but render through `PublicShell` and the same Product, Content and Static renderers as Public. No Admin header/theme is inherited and no Preview-only renderer was introduced.

### M6 — Admin accessibility

Index, reject, archive, slug, Product Code and other decisions have explicit labels instead of placeholder-only names. Block IDs use an AA-capable text token. Autosave/conflict/failure states use live regions; media, taxonomy/Application and Preview controls have explicit names; focus remains visibly styled. The unnecessary Admin child `Suspense` boundary was removed so child authorization can return the correct HTTP status instead of streaming a 200 error surface.

## 6. Low findings L1–L2

### L1 — Locked Block structural protection

The shared reducer rejects update, remove, move and duplicate commands for a locked Block. The Product/Content UI disables fields, pointer drag, keyboard Move, Copy and Delete; only explicit Unlock is available. Lock remains part of the strict Block document, so persistence/reload is preserved. Undo/Redo coverage verifies deterministic Lock/Unlock history and Copy cannot derive an unlocked duplicate from a locked source.

### L2 — Preview popup opener isolation

Desktop/Mobile Preview opens `about:blank`, immediately sets `window.opener = null`, then navigates through a protected `noopener noreferrer` link with `no-referrer`. Direct Preview links carry the same relationship/referrer policy. A blocked popup produces an announced failure instead of a false success; sizes, authenticated session and noindex remain unchanged.

## 7. Authority and invariants evidence

- Static Page Live authority: one resolver, one schema/projection and one public renderer; Bootstrap only when no approved Setting exists.
- Business truth: Company Facts and Owned media are checked for current eligibility at every public read/delivery boundary.
- Revision authority: one editable Published Draft per Product/Content; Live remains on the approved Revision until Apply.
- Asset authority: existing Product/Content/Static relations and application-controlled delivery only; no Object Key or bucket URL is exposed as a contract.
- Link authority: existing `internal_link_relations`, synchronized transactionally during Apply.
- Quick-created Category/Application: internal and selectable, but route-less, no SEO authority and publicly unavailable until explicit approval/publication.
- Required Audit: mutation and required Audit remain atomic; injected Audit failure tests confirm rollback.
- SEO: existing Canonical, Sitemap and Index predicates remain authoritative; Draft Preview and quick-created entities never enter Index/Sitemap authority.

## 8. Automated verification

| Gate | Result |
|---|---|
| `pnpm env:diagnose` | Passed — Node `v24.14.0`, pnpm `11.9.0`, Sharp and native CSS/SWC modules OK |
| `pnpm env:check` | Passed |
| `pnpm lint` | Passed, zero warnings |
| `pnpm typecheck` | Passed |
| `pnpm exec drizzle-kit check` | Passed |
| `pnpm test:run` | **70 files, 261/261 tests passed** |
| Isolated PostgreSQL 18.4 Production build | **40/40 routes generated; passed** |
| `pnpm check:bundle` | Passed — 23 public page manifests and 32 manifest/chunk files |
| `pnpm audit --prod` | **0 known vulnerabilities** |
| `pnpm exec playwright test --retries=0` | **33/33 passed, zero retries** |
| `git diff --check` | Passed before implementation commit and after report |

The default build against the preserved stale local PGlite directory was attempted and failed on its already-recorded missing Stage 1 `structured_blocks` column. That directory was not deleted, rebuilt, migrated or modified. The final build succeeded against the new isolated PostgreSQL 18.4 database migrated through `0018`.

## 9. PostgreSQL 18.4 matrix

All database validation used a new disposable PostgreSQL `18.4` container bound only to `127.0.0.1:55436`, explicitly named temporary databases and Synthetic/Test data. It did not access or alter any pre-existing CWT database. The temporary databases, container and browser fixture directory were removed after validation.

- Migration compatibility: **19/19 passed**.
  - Fresh `0000→0018` and Repeat/no-op.
  - Upgrade from `0005`, `0010`, `0011`, `0012`, `0014`, `0015`, `0016` and `0017` to `0018`, each including repeat.
  - Standard entrypoint, failure/retry, interruption/resume, concurrent clients and advisory-lock release.
- Stage 1 remediation regression: **13/13 passed**.
- Updated Stage 2 matrix: **7/7 passed**.
  1. Fresh `0000→0018` and Repeat/no-op.
  2. Product autosave replay, multi-tab conflict and Live isolation.
  3. Content required-Audit rollback, replay and Live isolation.
  4. Home conflict, Preview/Live isolation, required-Audit rollback and idempotent Apply.
  5. Category/Application quick-create convergence without Route/SEO authority.
  6. Internal CTA target invalidated before Apply fails closed.
  7. No idle-in-transaction validation sessions.
- Final PostgreSQL inspection: idle in transaction `0`; waiting locks `0`; residual advisory locks `0`.
- Catalog, Snapshot and Journal counts and hashes matched the frozen `0018` identity.

## 10. Browser, responsive, Preview and Axe evidence

Playwright covered Desktop Chromium and Pixel 7. The consolidated tests include Public Home/About/Product/Content, Admin Home/About/Product/Content, four Preview types, the full role matrix and the following widths:

- `320`
- `375`
- `390`
- `768`
- `1024`
- `1440`

Results:

- Document-level critical horizontal overflow: `0` across the six-width Admin and Preview matrix.
- Critical Save, Review, Apply, Preview, Block, media and taxonomy/Application controls remained visible and reachable.
- Preview inherited the Public visual context and had no Admin header.
- Axe Critical: `0`.
- Axe Serious: `0`.
- Console error: `0`.
- Unexpected Console warning: `0`.
- Page error: `0`.
- Hydration error: `0`.
- Popup `window.opener`: `null`.

A separate in-app browser check against the final local Production Build confirmed:

- Home, About, Product and Content at 320px all had `scrollWidth = innerWidth` and retained non-production noindex.
- Home Admin and Home Preview at 320px had no horizontal overflow.
- Product and Content Preview at 1440px had no Admin header, no overflow and used only governed Preview Asset URLs for Draft media.
- Browser warning/error log count was `0`.

## 11. Remaining severity status

Developer self-check for the twelve authorized remediation findings:

| Severity | Authorized findings | Developer-known remaining | Review disposition |
|---|---:|---:|---|
| Blocker | 0 | 0 | Not independently reviewed in this task |
| High | 4 | 0 | Awaiting Consolidated Remediation Review |
| Medium | 6 | 0 | Awaiting Consolidated Remediation Review |
| Low | 2 | 0 | Awaiting Consolidated Remediation Review |

These counts do not declare Review Passed or Stage 2 Accepted.

## 12. Technical Debt and External Validation

Technical Debt intentionally unchanged:

- The preserved stale local PGlite schema may fail a database-dependent build until the accepted Migration/readiness sequence is run. Stage 6 owns target orchestration.
- `next/font/google` keeps the previously accepted offline-build reproducibility limitation for Stage 6.
- Real Product media, Company Facts and copy still require owner evidence and authorization.

External Validation still required:

- formal Product, Company Fact and licensed Media review;
- Canonical host and Cloudflare behavior;
- Tencent target-server CPU, memory, disk, Swap and log behavior;
- Production/Staging database, administrator, media-root and Secret isolation;
- COS backup and full restore;
- Zoho;
- malware Scanner and shared Rate Limiter;
- Hosted Sentry, uptime and independent non-Zoho alerting;
- cloud AI Provider, Model, budget and privacy gate.

## 13. Stage boundary and final declarations

Stage 3–8 work was not implemented. There is no Excel/ZIP import, AI, email-template/Outbox expansion, Attribution expansion, Docker/Compose deployment work, Cloudflare, Zoho, COS, Sentry, Scanner or shared Rate Limiter implementation in this remediation.

- Worktree after report checkpoint: **Clean**.
- `git diff --check`: **Passed**.
- Push: **No**.
- Deployment: **No**.
- Tag created: **No**.
- External Provider connected/configured: **No**.
- Real Product, customer, Inquiry, Company Fact or Media data used: **No**.
- Fresh Acceptance entered: **No**.
- Stage 3 entered: **No**.
- Production Ready: **No**.
- Formal data status: **Waiting for Real Product Data Validation**.

Implementation stops here. The next process is the original Stage 2 Independent Joint Review thread performing one **Consolidated Remediation Review** over all remediation commits.
