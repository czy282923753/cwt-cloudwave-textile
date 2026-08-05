# CWT Phase 1B Stage 1 Final Narrow Remediation Report

Status: Implementation and local verification complete; awaiting `Phase 1B Stage 1 Final Targeted Review`

Date: 2026-08-05
Production Ready: **No**

This report records the narrowly authorized implementation and verification evidence for the remaining Medium finding and the associated non-blocking Low finding. It does not independently close either finding and does not begin Fresh Acceptance or Stage 2.

## 1. Start HEAD and final HEAD

- Branch: `phase/1b-stage1`
- Start HEAD: `45bc6097a6a5eb127abc133a758839c6ebe46c07`
- Final implementation/test checkpoint before this report: `8f2f9457e620e245f324cc1ed5f4ceeeec1e0812`
- Final handoff HEAD: the final local documentation Commit containing this formatted report. Its exact full hash is recorded in the final handoff because a Git Commit cannot embed its own content-derived hash.
- The worktree, index and ordinary untracked-file set were clean at the start. No review-thread code modification was present.

## 2. New local Commits

| Commit | Subject | Scope |
|---|---|---|
| `8a2176fc1135544716aa4c650c6d2c62d37b5807` | `fix: use renderable product block projection` | Shared Product renderable projection, public query/template and integration coverage |
| `87fcbdfe344e4f0a873721fead5bb005da38f944` | `fix: improve content author contrast` | Existing design-token correction for the public Content byline |
| `8f2f9457e620e245f324cc1ed5f4ceeeec1e0812` | `test: verify final stage 1 remediation` | Synthetic DOM fixtures, PostgreSQL scenarios, responsive/Axe/Console coverage and isolated E2E Build alignment |
| `d765d27ad396b7efe417264a3866d3b81722c0c0` | `docs: record final stage 1 remediation` | Final narrow-remediation evidence only |
| This report's finalization Commit | `docs: normalize final remediation report formatting` | `diff --check` formatting correction only |

No earlier Stage 1 history was amended or rewritten. No Commit was pushed and no Tag was created.

## 3. Remaining Medium original path

The reviewed Product public template at `src/app/products/[slug]/page.tsx` used `product.narrativeBlocks.blocks.length` twice:

1. the outer Product context/Features/Applications section switch; and
2. the inner `Product context` / `About this fabric` narrative switch.

That raw structural count considered a Divider-only document, or a document whose media/related references no longer resolved, to contain public narrative. The Renderer could then output nothing or only a separator after the template had already emitted the narrative headings and container.

## 4. Root cause

Stage 1 already had one owner-aware `resolveBlockPublicProjection` authority for validating media and related references and preparing Renderer inputs. The Product public query returned the raw approved Block document, however, and the template made a second weaker visibility decision from raw array length. Structural existence and actual public renderability therefore diverged.

The fix extends the existing projection result instead of introducing another Block validator, resolver, Renderer or `has-content` helper.

## 5. Product public Projection repair call chain

The authoritative call chain is now:

`approved Product localization Block document → resolveBlockPublicProjection({ type: "product", id }, document, { invalidReferences: "filter" }) → public-ready owner relationships and related records → renderableDocument + hasRenderableContent + readableText + referencesValid → Product public projection → shared BlockRenderer and template module switch`

The shared projection now exposes:

- `renderableDocument`: the approved, versioned document after invalid public references are filtered;
- `hasRenderableContent`: true only when the projected Renderer input contains at least one non-Divider Block;
- `readableText`: text derived from that same projected document and its resolved related labels;
- `referencesValid`: whether the raw approved document still resolves completely; and
- the existing resolved media and related-record maps consumed by the shared Renderer.

Strict Draft, Revision, Apply, Publish, Index and sitemap callers retain the default fail-closed `reject` behavior. Only the Product public read requests `filter`, allowing an otherwise public/noindex Product to remain HTTP 200 while invalid Blocks disappear. Image and Gallery Blocks require visible, role-compatible, public-ready relationships; an unresolved Gallery is filtered as one Block. Related Product/Article IDs are projected to current public records, and an all-filtered Related Block disappears.

Heading, Paragraph and valid Image/Gallery Blocks count as renderable content. Empty documents, Divider-only documents, unresolved/hidden media-only documents and all-filtered Related documents do not.

## 6. Removed raw `blocks.length` decisions

Both Product-template `product.narrativeBlocks.blocks.length` conditions were removed from `src/app/products/[slug]/page.tsx`:

- the outer section now uses `product.narrativeProjection.hasRenderableContent || product.features.length || product.applications.length`;
- the narrative column now uses only `product.narrativeProjection.hasRenderableContent`; and
- `BlockRenderer` receives `product.narrativeProjection.document`, not the raw approved document.

Repository search found no remaining Product public-template narrative switch based on `blocks.length`, `jsonb_array_length` or arbitrary Block existence. Features and Applications remain independent and retain their existing collection-length checks.

## 7. Product public DOM regression results

All assertions exercised the actual Next Product page DOM rather than only the Resolver return value.

| Scenario | Result |
|---|---|
| Empty Block document | HTTP 200; no Product context, About this fabric or narrative container |
| Divider-only | No narrative headings, container or `main hr` separator |
| Unresolved Image-only | HTTP 200/noindex; no narrative module |
| Hidden Image-only | HTTP 200/noindex; no narrative module |
| Unresolved Gallery-only | HTTP 200/noindex; no narrative module |
| All-filtered Related Product/Article | HTTP 200/noindex; no narrative module |
| Paragraph | Narrative headings and exact approved text rendered |
| Heading | The approved Heading independently constitutes renderable content and is rendered consistently with the projection |
| Valid Image/Gallery | Narrative module rendered three images; every `src` used `/api/public-assets/{assetId}/` |
| Features/Application with empty narrative | Features and Applications rendered; narrative headings/container absent |
| Published Revision before approval | Existing approved Paragraph remained public |
| Published Revision after approval | Approved Divider-only projection removed the narrative module and the prior Paragraph disappeared |

The non-renderable and renderable groups run on Desktop Chromium and Pixel 7. Manual in-app-browser inspection independently reproduced Empty, Divider, Paragraph, valid media and independent-module behavior.

## 8. Sitemap, Index and Metadata non-regression

- `queryIndexableRoutes` and its strict shared projection remain the sitemap authority; no second SEO predicate was created.
- Product metadata continues to require the existing environment and stored Index controls and additionally consumes the same projection's `referencesValid` result, preventing invalid references from producing metadata Index behavior that sitemap excludes.
- JSON-LD narrative fallback now uses the shared projected `readableText`, not raw Block text.
- Non-production and all synthetic fixtures remain noindex; Noindex Product fixtures return HTTP 200 while emitting no empty narrative module.
- The fresh PostgreSQL scenarios prove Divider-only approval leaves the Product absent from sitemap eligibility, while valid media restores the public renderable projection without weakening the stored noindex state.
- The E2E sitemap excludes the synthetic Product and Content paths. Canonical output remains present and unchanged for the tested Content route.
- No public URL, route, redirect, canonical-path, sitemap format or Index-state mechanism changed.

## 9. Content author color before and after

`src/public-site/content-pages.tsx` changed only the byline token for `By {content.authorName}`:

- before: Tailwind `text-stone-500` (`#79716b`) on the existing `#eadfce` header background, contrast approximately **3.63:1**;
- after: existing design-system token `text-stone-600` (`#57534e`) on `#eadfce`, contrast approximately **5.79:1**.

The result exceeds WCAG AA 4.5:1 for ordinary text. Font size, copy, spacing and layout did not change; no local hexadecimal color was added.

## 10. Axe, Desktop and mobile accessibility results

- The complete Content page is analyzed by Axe; the former scoped/excluded-region check was removed.
- Content Critical/Serious violations: **0** on Desktop Chromium and Pixel 7.
- The author byline is asserted to use `text-stone-600`; it produces no `color-contrast` Serious finding.
- Product public pages with valid shared projection have Critical/Serious violations: **0** on Desktop Chromium and Pixel 7.
- Home Critical/Serious violations: **0** on Desktop Chromium and Pixel 7.
- Manual Desktop and 390 px inspection confirmed the same byline token and no horizontal overflow.

## 11. Schema and Migration change

**No.**

There is no Schema, Migration, Snapshot, Journal, table, column, enum, state, Worker, Lease, dependency, package, Lockfile or production-configuration change. No `0019` was created. The implementation reuses the existing Block document, shared owner-aware projection, Revision, Asset relationship, public Asset eligibility, Renderer and Audit mechanisms.

## 12. `0000–0018` integrity proof

`git diff 45bc6097... -- drizzle src/db/schema package.json pnpm-lock.yaml next.config.ts drizzle.config.ts` is empty.

The start and final SHA-256 values are identical:

| Frozen artifact | SHA-256 |
|---|---|
| `drizzle/0018_phase1b_editorial_media_foundation.sql` | `a7583d03b59d5858cb5e2cb2542dbc43bf6c620e2067ed900fe6d0d1d0257148` |
| `drizzle/meta/0018_snapshot.json` | `faa9a0819303e82d097874c348d6258533a305da30df00da360055b70dac3073` |
| `drizzle/meta/_journal.json` | `dfb08dad283762e80db4978c8381f88998cfde276ffb1f39c0f5de6f73e34867` |

Historical `0000–0017` SQL/Snapshots and reviewed `0018` SQL/Snapshot/Journal were not edited.

## 13. Full Vitest, Build and Playwright statistics

| Gate | Result |
|---|---|
| `pnpm env:diagnose` | Pass — Node `v24.14.0`, ARM64, pnpm `11.9.0`, Sharp/Lightning CSS/SWC native bindings available |
| `pnpm env:check` | Pass |
| `pnpm lint` | Pass, zero warnings |
| `pnpm typecheck` | Pass |
| `pnpm exec drizzle-kit check` | Pass, no Schema drift |
| Focused Resolver/Product-public integration tests | Pass — 31/31 |
| `pnpm test:run` | Pass — 61 files, 227/227 tests |
| `pnpm build` | Pass — fresh isolated migrated PGlite, 40/40 static generation units |
| `pnpm check:bundle` | Pass — 20 public page manifests and 29 manifest/chunk files |
| `pnpm audit --prod` | Pass — no known vulnerabilities |
| Focused Product DOM/Content Axe Playwright | Pass — 7/7 |
| `pnpm exec playwright test --retries=0` | Pass — 29/29, retries disabled |
| `git diff --check` | Pass |

One diagnostic Build against the repository's preserved default local PGlite correctly failed because that database is still pre-0018 and lacks `content_localizations.structured_blocks`. The database was not migrated, cleared or modified. Final Build evidence used a fresh disposable test/noindex PGlite migrated through 0018; two earlier isolated Build runs also passed. This is local environment state, not a product-code Build failure.

The E2E web server now migrates and seeds its disposable database before building. This keeps statically generated Asset IDs, the runtime database and isolated storage in the same snapshot and prevents test-only 404s caused by mixing one Build snapshot with another runtime fixture set.

## 14. PostgreSQL 18.4 validation results

A new disposable official PostgreSQL `18.4` container was bound only to `127.0.0.1:55482`, used synthetic credentials/data and `tmpfs` storage, and was stopped and removed after validation. Existing retained CWT validation containers were not touched.

- Migration/compatibility matrix: **19/19** scenarios, including fresh `0000→0018`, repeat/no-op, `0017→0018`, standard entry, Journal/catalog consistency and existing compatibility/locking cases.
- Stage 1 remediation harness: **13/13** scenarios.
- New Product evidence includes approved Paragraph before Revision approval, injected required-Audit failure preserving the old public projection, successful approved Divider-only projection with HTTP 200/no narrative/no sitemap regression, and a later valid Image projection restoring renderable media.
- Existing Static, Product/Content media invalidation, concurrency, Revision, Index/Sitemap and required-Audit rollback scenarios continued to pass.
- Journal count remained 19 entries (`0000–0018`) after the repeat migration.

No shared, Preview, Staging or Production database was contacted.

## 15. Browser and responsive verification

- Automated projects: Desktop Chromium and Pixel 7.
- Explicit viewports: 320, 375, 390, 768 and 1440 px.
- Routes at each explicit width: Home, Product Empty, Product Paragraph, Product valid Image/Gallery, complete Content and Get a Quote.
- Navigation, mobile Menu, CTA, form controls and independent Product modules remained visible and usable.
- Critical horizontal overflow: **0**.
- Console error/warning: **0** across Home, Empty, Divider, Paragraph, valid Product media and Content.
- Page error: **0**; Hydration error: **0**.
- Public Asset delivery for the tested static and Product/Content media used application-controlled routes and produced no unexpected resource 404 after the isolated Build/runtime alignment.

Manual in-app-browser verification repeated the Desktop and 390 px checks against a localhost-only Production-mode server with synthetic/noindex data. The temporary server was stopped and its disposable database/storage directory was removed afterward.

## 16. Stage boundary check

Implemented scope is limited to:

- the existing shared Block public projection's renderability output;
- Product public data/template consumption of that output;
- the Content byline design token; and
- directly supporting unit/integration/PostgreSQL/E2E fixtures and tests.

Not implemented: Fresh Acceptance, Stage 2 Block Editor UX, drag/drop, Undo/Redo, Autosave, Preview, Excel/ZIP import, AI, email templates, attribution, new Worker/Lease/state, Docker, deployment, Cloudflare, Zoho, COS, Sentry, malware-scanner Provider or shared rate-limiter Provider.

## 17. Known Issues

| Severity | Status |
|---|---|
| Blocker | None observed in the authorized scope |
| High | None observed in the authorized scope |
| Medium | The targeted implementation and regression evidence are complete; closure is reserved for the independent Final Targeted Review |
| Low | The byline contrast implementation and Axe evidence are complete; acceptance is reserved for the independent Final Targeted Review |

This report does not self-close the reviewed findings.

## 18. Technical Debt and External Validation

Technical debt / local environment note:

- The preserved repository-default PGlite remains at its prior Migration level and cannot build Stage 1 code until a separately authorized local migration is performed. It was intentionally left unchanged. All authoritative final Build and database evidence used fresh disposable environments.

External validation still required before any Production-ready claim:

- independent `Phase 1B Stage 1 Final Targeted Review`;
- later Fresh Acceptance only if separately authorized;
- formal Product data and licensed media acceptance;
- Production/Staging credentials, administrators, isolation, storage, email, scanner/rate-limiter, monitoring and deployment validation in their approved later stages; and
- Stage 4/6 Provider gates and Stage 6/7 deployment gates from the frozen plan.

## 19. `git diff --check` and worktree status

- `git diff --check` passed before implementation Commits and again across `45bc6097...` to the final implementation checkpoint.
- After the local report Checkpoint Commit, the worktree, index and ordinary untracked-file set are expected and verified to be clean.
- Changed implementation/test files are exactly:
  - `playwright.config.ts`
  - `scripts/seed-e2e-block-projection.ts`
  - `scripts/verify-postgres-stage1-remediation.ts`
  - `src/app/products/[slug]/page.tsx`
  - `src/editorial/block-reference-projection.integration.test.tsx`
  - `src/editorial/block-references.ts`
  - `src/public-site/content-pages.tsx`
  - `src/public-site/data.ts`
  - `src/public-site/product-publication-boundary.integration.test.ts`
  - `tests/e2e/public.spec.ts`
- This report is the only additional documentation file.

## 20. Final declarations and stop condition

- Not pushed.
- Not deployed.
- No Tag created.
- No formal Product, customer or Company Fact data used.
- No external service or real credential used.
- Fresh Acceptance was not entered.
- Stage 2 was not entered.
- Production Ready remains **No**.

Work stops after this report's local Checkpoint Commit. The next permitted step is project-owner-arranged `Phase 1B Stage 1 Final Targeted Review`.
