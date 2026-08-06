# CWT Phase 1B Stage 2 — Google SEO Controlled Remediation Report

**Status:** Authorized and In Progress — developer remediation evidence awaiting Independent Google SEO Audit
**Date:** 2026-08-06 (Asia/Shanghai)
**Production Ready:** No
**Formal Product Status:** Waiting for Real Product Data Validation
**Stage 3:** Planned / Deferred — not authorized

## 1. Authorization and immutable starting point

This work was explicitly authorized as a forward Stage 2 SEO remediation. It does not rewrite or move the accepted Stage 2 history.

| Authority | Identity |
| --- | --- |
| Starting branch | `codex/phase-1b-stage2-seo-remediation` |
| Starting Freeze Commit | `70ae0159ddf5ab4dedf405df1154374f065bd8b9` |
| Candidate Code Baseline before remediation | `0a748e828d0b1265fce801879e4d3f2136ae0702` |
| Existing Stage 2 Approved Tag | `phase-1b-stage2-approved-2026-08-06` |
| Existing Stage 2 Tag Object | `73cac88d3039ee21ed95c9387553a57c19928319` |
| Existing Stage 2 Tag peeled Commit | `70ae0159ddf5ab4dedf405df1154374f065bd8b9` |
| Existing Stage 1 Tag Object | `53893bc936a9d2a1a9adfa75e1f27e265431192f` |
| Existing Stage 1 Tag peeled Commit | `3c1d057845b415eaac2ee54ca42001b5ce0a3afb` |

The original Independent Google SEO Audit was read in full and its final thirteen Findings were used as the remediation checklist. No Approved Tag was created, moved, deleted or replaced. No history was rebased, squashed or amended.

## 2. Local Commit chain

The remediation is a linear descendant of the exact Freeze Commit:

1. `70ae0159ddf5ab4dedf405df1154374f065bd8b9` — immutable Stage 2 Freeze Commit.
2. `014b09a34e4ec3691c519083e20e227daea52c21` — `fix: align public seo and media authorities`.
3. `0f6f0e88eaca619b86b637b6478f20d8c177afff` — `test: verify stage 2 seo remediation`.
4. The final report Commit is recorded in Git history immediately after this document is committed.

## 3. Finding-by-Finding remediation evidence

The statuses below describe developer implementation evidence only. They do not independently close a Finding or declare the audit passed.

### SEO-H-01 — one authoritative real-Product eligibility boundary

- **Root cause:** public derived lists and relation projections could be built from a globally truncated Product list or entity publication alone, while metadata and public link surfaces were not uniformly coupled to the existing authoritative real-Product predicate.
- **Implementation:** `src/public-site/data.ts` now uses the existing `publicProductEligibilityConditions` and existing derived eligibility conditions directly in Product, Application, Taxonomy and Fabric Library queries. Public hub lists only expose entities backed by an eligible Product; active/public detail entities with no eligible Product remain `200` with `noindex,follow`; inactive or non-public entities remain `404`. Empty Product/Application/Fabric collections are noindex and are omitted from the Sitemap. Dynamic Sitemap eligibility remains in the existing `src/seo/public-index.ts` authority.
- **Changed surfaces:** `src/public-site/data.ts`, `src/seo/page-indexability.ts`, Product/Application/Taxonomy/Fabric page modules, `src/app/sitemap.ts`, and the Home link projections that consume those filtered lists.
- **Evidence:** `src/seo/derived-product-eligibility.integration.test.ts`, `src/public-site/product-pagination.integration.test.ts`, `src/seo/seo-contracts.test.ts`, and the isolated PostgreSQL 18.4 matrix. Revoking `realProductBasis` removed Product and derived list/index/Sitemap eligibility while preserving active detail `200` noindex semantics.

### SEO-H-02 — exact Production canonical origin

- **Root cause:** Production accepted a broader URL shape and therefore allowed wrong hosts, paths or non-canonical forms to become metadata authority.
- **Implementation:** Production now accepts only the exact raw value `https://cwtextile.com`. HTTP, loopback, wrong host, userinfo, non-default port, path, query, fragment and trailing-slash input fail closed. URL construction uses `URL`, preventing double slashes.
- **Changed surfaces:** `src/config/env.ts`, `src/app/layout.tsx`, `src/app/robots.ts`, `src/app/sitemap.ts`, and structured-data builders.
- **Evidence:** the complete rejection matrix in `src/config/env.test.ts` and canonical-origin assertions in `src/seo/seo-contracts.test.ts` and `tests/e2e/public.spec.ts`.

### SEO-M-01 — robots boundary for governed Public Assets

- **Root cause:** the broad `/api/` disallow unintentionally blocked the governed Public Asset route.
- **Implementation:** robots explicitly allows `/api/public-assets/` while retaining the broader `/api/`, Admin and operations restrictions. Asset eligibility is unchanged and still excludes Inquiry/Private storage.
- **Changed surfaces:** `src/app/robots.ts`.
- **Evidence:** `src/seo/seo-contracts.test.ts` checks both the narrow allow and retained sensitive disallows.

### SEO-M-02 — Home/About thin-page and operational-failure semantics

- **Root cause:** valid-but-empty projections and invalid/failed projections both reached indexable `200` output.
- **Implementation:** the shared Static Page projection exposes `hasRenderableContent`. Valid empty pages remain `200` but are `noindex,follow` in Production and leave the Sitemap. Invalid authority or operational projection failure throws a sanitized server failure instead of rendering an indexable unavailable page. Public and Preview remain separate at the access boundary; authenticated Preview keeps its existing unavailable representation.
- **Changed surfaces:** `src/content/static-page-projection.ts`, `src/public-site/data.ts`, `src/app/page.tsx`, `src/app/about/page.tsx`, `src/seo/page-indexability.ts`, and `src/app/sitemap.ts`.
- **Evidence:** `src/public-site/static-page-public-boundary.test.ts`, `src/seo/seo-contracts.test.ts`, the existing Static Page authority tests, final Production Build and Playwright.

### SEO-M-03 — Public Asset 404 versus temporary 503

- **Root cause:** all database, storage and eligibility failures were collapsed into `404`.
- **Implementation:** invalid identifiers and business ineligibility return sanitized `404`. Database/storage failures return sanitized `503` with `private, no-store`; logs contain only the Asset ID and error class. No object key, bucket URL or internal exception detail enters the response.
- **Changed surfaces:** `src/app/api/public-assets/[assetId]/route.ts`, `src/public-site/public-asset-access.ts`.
- **Evidence:** `src/app/api/public-assets/[assetId]/route.test.ts` and `src/public-site/public-asset-access.integration.test.ts`.

### SEO-M-04 — unverified Product brand removed

- **Root cause:** Product JSON-LD hardcoded the platform brand as Product brand without an approved, visible Product brand fact.
- **Implementation:** the shared Product structured-data builder omits `brand`. No replacement or inferred brand was added.
- **Changed surfaces:** `src/seo/structured-data.ts`, `src/app/products/[slug]/page.tsx`.
- **Evidence:** `src/seo/structured-data.test.ts` and the Product JSON-LD browser assertion in `tests/e2e/public.spec.ts`.

### SEO-M-05 — inactive Taxonomy cannot create a public 404 link

- **Root cause:** Product detail projections could include related Taxonomy without rechecking the term's current active status.
- **Implementation:** Product Taxonomy projection now requires the existing `taxonomy_terms.is_active` authority. No inactive term is rendered or linked.
- **Changed surfaces:** `src/public-site/data.ts`, `src/app/products/[slug]/page.tsx`.
- **Evidence:** the final inactive-Taxonomy assertion in `src/seo/derived-product-eligibility.integration.test.ts`.

### SEO-M-06 — stable crawlable Product pagination and direct relations

- **Root cause:** public Product queries defaulted to a global `100` cap and Application/Taxonomy/Fabric relations were filtered from that truncated in-memory list.
- **Implementation:** public Product queries now use stable `publishedAt DESC, id ASC` ordering, count and page directly in the database at 24 records per page. Page one canonical is `/products/`; later pages self-canonicalize; Previous/Next and bounded page-number links are crawlable; malformed and out-of-range pages are controlled `404`. Relation projections query their actual eligible Product IDs and no longer depend on a global first-100 list.
- **Changed surfaces:** `src/public-site/data.ts`, `src/app/products/page.tsx`, Application/Taxonomy/Fabric detail pages.
- **Evidence:** `src/app/products/page.test.ts`, `src/public-site/product-pagination.integration.test.ts`, `scripts/verify-seo-remediation-postgres.ts`, and browser canonical/navigation checks. A PostgreSQL dataset of 101 eligible Products produced five pages with no omissions or duplicates and returned all 101 Application and Taxonomy relations.

### SEO-M-07 — existing responsive variants and governed delivery

- **Root cause:** public views rendered only original Asset URLs and Static desktop/mobile Hero markup could create two hidden high-priority image candidates.
- **Implementation:** existing `asset_variants` rows are projected as AVIF/WebP `srcset` candidates with `sizes`. Variant URLs stay on `/api/public-assets/[assetId]?variant=...`. Delivery resolves a variant only after the base Asset and current live relation pass the existing storage, scan, status, deletion, rights and relation eligibility checks. The original remains the fallback. Static desktop/mobile Hero uses one picture/image request with media-specific sources; only the actual Hero is eager/high priority and lower content is lazy.
- **Changed surfaces:** `src/public-site/data.ts`, `src/public-site/responsive-image.tsx`, public Product/Content/Fabric/Static renderers, `src/public-site/public-asset-access.ts`, and the Public Asset route.
- **Evidence:** `src/public-site/responsive-image.test.tsx`, `src/public-site/public-asset-access.integration.test.ts`, `src/public-site/static-page-renderer.test.tsx`, and browser assertions for controlled URLs, `srcset`, Hero priority and lazy lower images.

No new variant table, job, state machine, storage authority or Migration was introduced.

### SEO-L-01 — Home self-canonical

- **Implementation:** Home metadata now emits canonical `/`, resolved through the validated site origin.
- **Evidence:** browser metadata assertion and `src/seo/seo-contracts.test.ts`.

### SEO-L-02 — Sitemap lastmod integrity

- **Root cause:** `route.updatedAt` could imply freshness unrelated to an approved material public-page change.
- **Implementation:** Sitemap omits `lastModified` until a reliable approved Live Revision timestamp is available. It no longer fabricates freshness from Route maintenance.
- **Evidence:** `src/seo/seo-contracts.test.ts` asserts every emitted entry omits `lastModified`.

### SEO-L-03 — Article author type

- **Implementation:** public Content projection carries the authoritative `authors.isOrganization` value; JSON-LD emits `Organization` or `Person` accordingly.
- **Changed surfaces:** `src/public-site/data.ts`, `src/public-site/content-pages.tsx`, `src/seo/structured-data.ts`.
- **Evidence:** both author types are asserted in `src/seo/structured-data.test.ts`.

### SEO-L-04 — nonexistent Taxonomy hub breadcrumb removed

- **Implementation:** Taxonomy breadcrumb contains Home and the current Taxonomy only. It does not link `/fabric-types/`, and no new hub page was added.
- **Changed surfaces:** `src/app/fabric-types/[slug]/page.tsx`, `src/seo/structured-data.ts`.
- **Evidence:** `src/seo/structured-data.test.ts` and browser JSON-LD assertions.

## 4. Files changed

Implementation areas:

- Environment/metadata: `src/config/env.ts`, `src/app/layout.tsx`, `src/app/robots.ts`, `src/app/sitemap.ts`, `src/seo/page-indexability.ts`, `src/seo/structured-data.ts`.
- Public routes: Home, About, Products, Applications, Fabric Library and Taxonomy page modules under `src/app/`.
- Public data and rendering: `src/public-site/data.ts`, Product/Content/Static renderers, cards and the new responsive image component.
- Governed media delivery: `src/public-site/public-asset-access.ts` and `src/app/api/public-assets/[assetId]/route.ts`.
- Tests and verification: fourteen Vitest/Playwright/PostgreSQL test or harness files in the second Commit.

No file under `src/db/schema/`, `drizzle/`, package manifests, Lockfile or production configuration changed.

## 5. PostgreSQL 18.4 independent local verification

A new localhost-only PostgreSQL 18.4 container, database, role, volume and Synthetic/Test storage were created solely for this run. The environment was not a development, Review or Production database.

Results:

- Fresh `0000→0018`: Passed.
- Repeat migration/no-op: Passed.
- Recorded migrations: 19; latest journal tag `0018_phase1b_editorial_media_foundation`.
- 101 eligible Products: five stable pages, 101 unique IDs, no omission and no duplicate.
- Application relation query: 101/101.
- Taxonomy relation query: 101/101.
- Eligibility revocation: Product total became 0; eligible Application hub list became 0; direct active entity projection remained available with `hasEligibleProducts=false`.
- `idle in transaction`: 0.
- waiting locks: 0.
- advisory locks: 0.

The temporary container and its exact anonymous volume, database, role and storage were removed after verification. No project `.data` or `.storage` directory was deleted or rebuilt.

## 6. Quality gates and exact results

| Gate | Final result |
| --- | --- |
| `pnpm env:diagnose` | Passed — Node `v24.14.0`, pnpm `11.9.0`, arm64; Sharp, Lightning CSS and SWC healthy |
| `pnpm env:check` | Passed |
| `pnpm lint` | Passed, 0 warnings/errors |
| `pnpm typecheck` | Passed |
| `pnpm exec drizzle-kit check` | Passed |
| `pnpm test:run` | Passed — 80/80 files, 299/299 tests |
| Production Build | Passed against a fresh isolated migrated Synthetic/Test database using the accepted local font-response harness; 40/40 static pages generated |
| `pnpm check:bundle` | Passed — 23 public page manifests and 31 manifest/chunk files; no Admin/DB/Private boundary leak |
| `pnpm audit --prod` | Passed after read-only registry access was allowed — 0 known production dependency vulnerabilities |
| `pnpm exec playwright test --retries=0` | Passed — 38/38, 0 failed, 0 skipped, 0 retries, approximately 1.5 minutes |
| `git diff --check` | Passed before Commit and after implementation/test Commits |

The first default build attempt was blocked by the already-frozen `next/font/google` network dependency. A controlled local font response then proved compilation and type checking, but the pre-existing local database selected by the default environment was stale and lacked Stage 1 columns. The official final build used a new migrated isolated database and passed without changing repository code or dependencies. These two environment/harness failures are not hidden and are not reported as Candidate failures.

Source/test hygiene checks found no new `.skip`, `.only`, `.todo`, `@ts-ignore`, `@ts-nocheck`, `eslint-disable`, explicit dangerous `any` escape or empty catch. Tests were added and strengthened; none were removed or weakened.

## 7. Browser, HTTP and accessibility evidence

- Browser projects: Desktop Chromium and Pixel 7.
- Viewports exercised: 320, 375, 390, 768, 1024 and 1440.
- Public surfaces: Home, About, Products, Product, Content, Application, Taxonomy, Fabric Library, Public Asset, robots and Sitemap contracts.
- SEO checks: canonical page one/later page behavior, invalid pagination, no unverified Product brand, correct author type, no nonexistent Taxonomy hub breadcrumb, responsive `srcset/sizes`, governed Asset URLs, Hero priority and lazy lower media.
- HTTP behavior: active/public derived detail versus inactive/non-public distinction, Public Asset 404/503 distinction, invalid page 404, Preview/noindex isolation and public route success.
- Accessibility: existing six-width Axe matrix and focused public checks passed with Critical 0 and Serious 0.
- Browser errors: Console error/warning 0, page error 0, hydration error 0, critical horizontal overflow 0.
- A supplemental local in-app browser inspection confirmed the Home canonical, a single high-priority Hero, no document overflow, controlled media URLs and zero console warnings/errors. The localhost-only Preview was stopped immediately afterward.

## 8. Migration and frozen-history integrity

- SQL files: 19.
- Snapshots: 19.
- Journal entries: 19; latest `0018`.
- `0019`: absent.
- `0018` SQL SHA-256: `a7583d03b59d5858cb5e2cb2542dbc43bf6c620e2067ed900fe6d0d1d0257148`.
- `0018` Snapshot SHA-256: `faa9a0819303e82d097874c348d6258533a305da30df00da360055b70dac3073`.
- Journal SHA-256: `dfb08dad283762e80db4978c8381f88998cfde276ffb1f39c0f5de6f73e34867`.
- Stage 2 introduced no Schema or Migration change.
- Existing Stage 1 and Stage 2 Annotated Approved Tags retain the objects and peeled commits recorded in Section 1.

## 9. Authority and complexity impact

No new persistent authority was added. The remediation converges public behavior on existing authorities:

- authoritative real-Product eligibility;
- current Route plus SEO metadata;
- current approved Static Page projection;
- existing Asset and `asset_variants` records;
- current live entity-media relations;
- existing application-controlled Public Asset route.

Added code consists of projection helpers, a responsive render component and test harnesses. There is no second Product qualification predicate, Route system, Sitemap state, Asset relation, media queue, storage contract or operational worker.

## 10. Remaining Technical Debt and external validation

Not resolved by this scope:

1. `next/font/google` keeps the default Production Build non-Hermetic. Stage 6 must choose the approved reproducible build/deployment treatment. The controlled local harness is evidence only, not a repository fix.
2. Production must externally validate the exact `https://cwtextile.com` origin together with real DNS, Cloudflare, canonical redirects and proxy behavior.
3. Responsive candidates depend on existing derived variants. Production throughput, storage capacity and real-media output remain Stage 6/8 external validation.
4. Real Product eligibility, formal Product copy, Company Facts, authorized Media, final SEO content and public Product-field policy remain Waiting for Real Product Data Validation.
5. Production/Staging isolation, Tencent Cloud resources, COS backup/restore, Zoho, Scanner, shared Rate Limiter, Sentry/monitoring and formal providers remain unvalidated.
6. The inherited Inquiry runtime/product-contract convergence remains Owner Confirmation Required and was not changed.
7. The previously recorded Stage 2 Low and unrelated font debt were not expanded or opportunistically fixed.

## 11. Explicit scope statements

- Push: No.
- Deploy: No.
- Tag creation or movement: No.
- Production or external Provider connection: No.
- Formal Product, customer or Company Fact data: No.
- Schema/Migration/0019: No.
- Stage 3 implementation: No.
- Production Ready: No.
- Formal Product Status: Waiting for Real Product Data Validation.

This report is developer evidence. It does not declare any Finding independently closed, does not declare the Google SEO review passed, and does not mark the remediation Accepted or Frozen. The candidate must return to the original Independent Google SEO Audit task for review.

**Developer completion statement:** Stage 2 Google SEO Controlled Remediation implementation complete; awaiting Independent Google SEO Audit.
