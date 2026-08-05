# CWT Phase 1B Stage 1 Consolidated Remediation Report

Status: Remediation implementation complete; awaiting `Phase 1B Stage 1 Remediation Joint Review`

Date: 2026-08-05
Production Ready: **No**

This report records implementation and verification evidence for the two Medium findings authorized in the consolidated remediation batch. It does not close either finding; closure belongs to the independent joint review.

## 1. Remediation start Branch and HEAD

- Branch: `phase/1b-stage1`
- Independent-review candidate HEAD: `a589ff98e156554048b2b007baf7e7c739fa8fc8`
- Stage 0 baseline: `90f386f09cd0a117b93b2ac639f785663544c911`
- The worktree, index and ordinary untracked-file set were clean at the start.
- No business changes were left by a review task.

## 2. Final Branch and HEAD

- Final Branch: `phase/1b-stage1`
- Final implementation/test checkpoint before this report: `f92ed7a5af47a83a9cafbe69708bf8eedf392f51`
- Final handoff HEAD: the local `docs: record stage 1 remediation` Commit containing this report. Its exact full hash is recorded in the accompanying final handoff because a Git Commit cannot embed its own content-derived hash.

## 3. New local Commits

| Commit | Subject | Scope |
|---|---|---|
| `f599e4cde9d39566fd7306c3553a001456052682` | `fix: align static page live projection` | Medium 1 shared projection, Apply behavior, public delivery and integration tests |
| `e4a60a36cf8d8aadc8e3ccd0b498008e5191baca` | `fix: enforce renderable block integrity` | Medium 2 owner-aware resolver, mutation/public/SEO call sites and integration tests |
| `f92ed7a5af47a83a9cafbe69708bf8eedf392f51` | `test: verify stage 1 review remediation` | PostgreSQL harness, isolated browser fixtures and E2E coverage |
| This report's Commit | `docs: record stage 1 remediation` | Remediation evidence only |

No earlier Stage 1 Commit was amended, rebased or otherwise rewritten.

## 4. Original Medium findings

### Medium 1

> Static Page Apply/live projection不具备一致的幂等和模块可见性语义。

The reviewed implementation could persist a visible Placement even when its owning module was disabled. A repeat Apply of an already committed Revision was reported as ineligible rather than as the same successful business result, while public delivery trusted an incomplete subset of the live rules.

### Medium 2

> Block完整性仅按键或数组存在判断，未按最终可渲染公共projection验证。

Block references were checked as IDs or keys without proving that they resolved through the current Product/Content owner to a visible, role-compatible, finalized public image. Readability and sitemap checks could also treat a non-readable Block array as narrative content.

## 5. Root causes

### Medium 1 root cause

Static configuration validation, relation persistence and public Asset authorization each interpreted visibility locally. There was no single projection function combining fixed schema validity, module enablement and Placement visibility. Apply also used an `in_review → applied` update as the entry condition, so response-loss retry could not distinguish a successful prior commit from an invalid operation.

### Medium 2 root cause

The existing reference helper answered only whether related entity IDs existed. Product and Content media relationships, their owner, visibility, role and public Asset readiness were not part of that authority. Public reads and SEO repeated separate partial rules, and SQL `jsonb_array_length(...) > 0` treated structural presence as readable narrative.

## 6. Repair files and call chains

### Static Page files

- `src/content/static-page-projection.ts`
- `src/content/static-page-settings.ts`
- `src/public-site/public-asset-access.ts`
- `src/content/static-page-settings.integration.test.ts`

Call chain:

`approved Revision snapshot → staticPageConfigSchema → deriveStaticPageLivePlacements → expected live rows → atomic Setting/relation/Revision/Audit write → public delivery rechecks current Setting with isPersistedStaticPagePlacementLive`

### Block projection files

- `src/editorial/block-references.ts`
- `src/catalog/product-service.ts`
- `src/content/content-service.ts`
- `src/public-site/data.ts`
- `src/seo/public-index.ts`
- `src/editorial/block-reference-projection.integration.test.tsx`
- Adjusted boundary fixtures/expectations in the existing Content, Product-publication and Asset-role integration tests

Call chain:

`versioned Block document + explicit owner → resolveBlockPublicProjection → owner relationship + public Asset readiness + role compatibility + public related entity resolution → resolved Renderer inputs + normalized readableText → Draft/Revision/Publish/Public/Index/Sitemap gates`

### Verification files

- `scripts/verify-postgres-stage1-remediation.ts`
- `scripts/seed-e2e-block-projection.ts`
- `playwright.config.ts`
- `tests/e2e/public.spec.ts`

## 7. One Static Page live projection

`static-page-projection.ts` is the sole shared authority for the Stage 1 live relation shape. It:

1. parses only the fixed Home/About module, Placement Key and viewport schemas;
2. includes a Placement only when its module is enabled and `isVisible=true`;
3. derives the exact persisted relation rows for one `system_settings` owner;
4. compares persisted rows to the approved configuration as a complete, order-independent set; and
5. exposes the same row predicate to public Asset delivery.

Apply validates public image readiness and CWT-owned-manufacturing evidence for the derived live set. Disabled or hidden Placements are not inserted into `site_page_assets`. Public delivery still rechecks the current Setting/configuration and exact relation, so a stale relation cannot become authority.

## 8. Repeat Apply idempotency and Audit evidence

`applyStaticPageConfigRevision` locks the target Revision and its Setting. The first Apply validates the newest Revision, derives the live set and commits Setting, relations, Revision state and required Audit in one governed transaction.

For an already `applied` Revision, it parses the current Setting and compares the complete persisted relation projection. An exact match returns the same `home` or `about` result without writing another relation or Audit. Any Setting/relation mismatch throws the typed `StaticPageProjectionMismatchError` and performs no repair.

Evidence:

- same `revisionId` repeat succeeds;
- simulated committed-response loss followed by retry succeeds;
- Audit count remains exactly one;
- two PostgreSQL connections concurrently applying the same Revision converge to the same result with one relation and one success Audit;
- a deliberately drifted projection fails closed and is not auto-repaired.

## 9. Module closure and immediate public Asset revocation

The integration and browser fixtures prove:

- an enabled Home Hero with an eligible public Asset is deliverable;
- a new approved Revision with `modules.hero=false` persists no live Hero relation;
- the previously known `/api/public-assets/{assetId}/` immediately returns `404`/the domain lookup returns `null`;
- no Cleanup, Worker or cache expiry is involved;
- re-enabling restores only Placements explicitly present in the new approved configuration; and
- Private, Import, unscanned, non-ready and rights-ineligible Assets remain fail closed through existing Asset predicates.

## 10. Shared Block resolver design

`resolveBlockPublicProjection` evolves the existing Block-reference module; it is not a second Validator or Renderer. The caller supplies exactly one owner:

- `{ type: "product", id, media? }`, or
- `{ type: "content", id, media? }`.

Optional media is the proposed final relation set during Draft/Revision validation. When omitted, the resolver reads the current persisted relations. The result contains:

- media key → eligible Asset ID;
- resolved current public Product links;
- resolved current published Content links; and
- normalized readable public text.

Invalid media or related-entity resolution throws `BlockReferenceResolutionError`. Public reads catch that failure and omit the invalid public entity/projection; they do not silently claim that the document is complete.

## 11. Product and Content media-reference evidence

### Product

A Product Image/Gallery key resolves only through the current Product's `product_assets`, or through that Product's proposed final relation set at the authorized mutation boundary. The relationship must be visible; the Asset must be an eligible public, ready, scanned, non-deleted, rights-valid image with existing Finalize evidence; and the Product media role must be compatible with Image versus Gallery usage.

Tests reject missing keys, another Product's relationship, hidden/unbound relationships, Private and Import Assets, pending/failed scan, revoked rights and incompatible roles. A valid Product Image and Gallery saves, applies and renders from application-controlled public Asset routes.

### Content

A Content Image/Gallery key resolves only through the current Content's unique non-null `content_assets.block_key`, or through that Content's proposed final relation set. The relation and Asset eligibility rules are the same public fail-closed boundary, with Content role compatibility.

Tests reject missing keys, another Content's relationship, hidden/unbound relationships, duplicate/ambiguous Block Keys, Private/non-ready/scan-failed/rights-revoked Assets and incompatible roles. Valid Image and Gallery Blocks save, apply and render.

## 12. Save, Revision, Apply, Publish and public revalidation

The same resolver now executes at these boundaries:

- Product Draft editorial save;
- Product structure Draft save against the proposed final media set, then against persisted relations after the write;
- Product Revision Apply, using the final narrative and final structure/media combination;
- Product Publish and Product Index change;
- Content Draft save against the proposed final media set, then against persisted relations after the write;
- Content Revision proposal and Apply;
- Content Publish and Content Index change;
- Product and Content public reads before Renderer input is assembled; and
- sitemap/index eligibility.

Tests change a valid relationship after Save but before Apply. Apply fails without changing the approved document. Later public invalidation also makes the public projection and sitemap eligibility fail closed.

## 13. Sitemap and Index readable-text threshold

Product and Content sitemap queries no longer use `jsonb_array_length(blocks) > 0` as narrative evidence. They parse Block document version 1 and use the shared projection's normalized `readableText`.

The threshold excludes:

- empty and Divider-only documents;
- unresolved Image-only and Gallery-only documents;
- hidden or otherwise ineligible media-only documents;
- documents whose only Related Product/Article references are not publicly resolvable; and
- unknown Block versions.

A valid Paragraph and the deterministic legacy Paragraph backfill retain equivalent readable eligibility. An indexed Content Revision that would remove all readable public narrative is rejected at Apply; independent public/sitemap qualification also re-evaluates the current state. No legacy text is consulted as a second writer.

## 14. Required Audit and concurrency evidence

Injected required-Audit failures roll back the complete transaction:

- Static Setting, `site_page_assets` and Revision status remain unchanged;
- Product approved localization and Revision state remain unchanged;
- Content localization/media and Revision state remain unchanged; and
- a safe retry remains possible.

Real PostgreSQL multi-connection tests verify concurrent Static Apply and concurrent Product Revision Apply. Each produces one committed business result and one required Audit, without duplicate relations or partial state.

## 15. Schema and Migration impact

**No Schema or Migration change was made.**

There are no new tables, columns, enums, Workers, Leases, state machines, relation systems or dependency changes. No `0019`, `0020` or `0021` was created. The repair reuses:

- `system_settings`, `site_page_assets` and `editorial_revisions`;
- `product_assets` and `content_assets`;
- the existing Asset readiness/Finalize predicates;
- existing Product/Content Revisions and required Audit transaction support; and
- the existing Block schema and Renderer.

## 16. Migration integrity proof

`git diff a589ff98... -- drizzle src/db/schema.ts package.json pnpm-lock.yaml` is empty.

Candidate and final SHA-256 values are identical:

| Frozen artifact | SHA-256 |
|---|---|
| `drizzle/0018_phase1b_editorial_media_foundation.sql` | `a7583d03b59d5858cb5e2cb2542dbc43bf6c620e2067ed900fe6d0d1d0257148` |
| `drizzle/meta/0018_snapshot.json` | `faa9a0819303e82d097874c348d6258533a305da30df00da360055b70dac3073` |
| `drizzle/meta/_journal.json` | `dfb08dad283762e80db4978c8381f88998cfde276ffb1f39c0f5de6f73e34867` |

Historical `0000–0017` SQL/Snapshots and the reviewed `0018` SQL/Snapshot/Journal were not edited.

## 17. Complete local test results

| Gate | Result |
|---|---|
| `pnpm env:diagnose` | Pass — Node `v24.14.0`, ARM64, pnpm `11.9.0`, Sharp/Lightning CSS/SWC native bindings available |
| `pnpm env:check` | Pass |
| `pnpm lint` | Pass, zero warnings |
| `pnpm typecheck` | Pass |
| `pnpm exec drizzle-kit check` | Pass, no Schema drift |
| Static Page focused integration file | Pass — 10 required cases |
| Block projection focused integration file | Pass — 28 cases, exceeding the 23-case minimum |
| `pnpm test:run` | Pass — 61 files, 225 tests |
| `pnpm build` | Pass — isolated test PGlite after Migration, 40/40 static generation units |
| `pnpm check:bundle` | Pass — 20 public page manifests and 29 manifest/chunk files |
| `pnpm audit --prod` | Pass — no known vulnerabilities |
| `pnpm exec playwright test --retries=0` | Pass — 23/23, retries disabled |

The final Build used a fresh disposable directory under `/tmp`, with test/noindex configuration and local storage roots. It did not read or modify the repository's `.data` or `.storage` directories.

## 18. PostgreSQL 18.4 results

A new disposable official PostgreSQL `18.4` container was bound only to `127.0.0.1`. It used synthetic data and was removed after validation. A previously retained CWT validation container/database was not touched.

Two harnesses passed:

- Migration/enum compatibility matrix: **19/19 scenarios**. This covers Fresh `0000→0018`, repeat/no-op, upgrade paths including `0017→0018`, standard migration entry, interruption/locking cases and catalog/Journal consistency.
- Stage 1 remediation harness: **10/10 scenarios**. This covers Static repeat/response-loss/concurrency, module revocation and Audit rollback; Product/Content valid and invalid Block Save/Apply/Publish flows; media invalidation between Save and Apply; Product Revision concurrency; required Audit rollback; readable Index/Sitemap re-evaluation; and final Journal verification.

The final Journal contained 19 entries (`0000–0018`). No real or shared database was contacted.

## 19. Browser, mobile and accessibility results

The isolated Production-mode E2E server used synthetic assets and noindex test configuration.

- Home enabled Static media returned `200`; module-disabled Static media returned `404`.
- Valid Product Image/Gallery and Content Image/Gallery Blocks rendered through `/api/public-assets/{assetId}/`.
- Existing Published Revision approval-before-live behavior remained green.
- Synthetic Product and Content remained noindex and absent from sitemap output.
- Desktop Chromium and Pixel 7 projects passed.
- Fixed widths `320`, `375`, `390`, `768` and `1440` showed no horizontal overflow or blocked primary navigation, CTA or inquiry form.
- The Product page full Axe Critical/Serious check passed.
- The Content Block-rendering region Axe Critical/Serious check passed.
- Console/page errors and Hydration checks passed on Home, Product and Content.
- A separate in-app browser inspection confirmed the rendered media, noindex metadata, no horizontal overflow and an empty error log.

One pre-existing page-shell accessibility issue was observed by the initially over-broad Content full-page Axe assertion: the `By {author}` text uses `#79716b` over `#eadfce`, measured at `3.63:1` where WCAG AA expects `4.5:1`. It is not caused by the Block projection repair and was not changed under this two-finding authorization. It is recorded under Known Issues rather than hidden by a visual change.

The expected unauthenticated Admin boundary emitted `Authentication required` on the server while its E2E test passed; this is not an application failure.

## 20. Technical Debt handling

The authorized Technical Debt was documented, not expanded into Stage 6 work:

- a Production Build may execute code that reads the database while collecting page data;
- a deployment must complete target-database Migration and readiness verification before any Build that depends on that database;
- against a stale Schema the current failure is a low-level missing-column error rather than a dedicated deployment preflight message;
- the repository's local setup already orders `pnpm db:migrate` before running/build verification, so no incorrect current setup order was changed;
- a new deployment state/service or complex preflight is deferred to Stage 6; and
- per ADR-0014, after a persisted `staging` value is written, a Preview-only binary is not a valid rollback target.

The final isolated Build explicitly applied Migration before `pnpm build`, demonstrating the required safe sequence without creating Docker, Compose or deployment machinery.

## 21. Proof that Stage 2–8 was not implemented

This remediation did not add or change:

- the Stage 2 Block Editor UX, drag/drop, Undo/Redo, autosave or Preview;
- full Home/About administration;
- Excel/ZIP import or Import Batch authority;
- AI, AI Providers or local models;
- email templates or a second Inquiry email;
- attribution;
- Docker, Compose or deployment automation;
- Cloudflare, Zoho, COS, Sentry, Scanner or shared Rate Limiter configuration;
- production/staging credentials or external monitoring;
- formal Product, customer, Inquiry, Company Fact or media data; or
- any Stage 3–8 implementation.

## 22. Known Issues

| Severity | Status |
|---|---|
| Blocker | None found within the authorized remediation evidence. |
| High | None found within the authorized remediation evidence. |
| Medium | Existing Content article author byline color contrast is `3.63:1`, below the WCAG AA `4.5:1` threshold. It is outside the two authorized root-cause repairs and awaits owner/review disposition. |
| Low | Database-dependent Production Build currently surfaces stale Schema as a low-level missing-column error; a deployment-oriented readiness/preflight contract remains deferred to Stage 6. |

These classifications are implementation observations, not an independent acceptance decision.

## 23. Remaining external validation

- Phase 1B Stage 1 Remediation Joint Review must independently decide whether the two original Medium findings are closed.
- The Content byline contrast observation requires review and explicit authorization before any visual change.
- Formal Product content, licensed media and Company Facts remain `Waiting for Real Product Data Validation`.
- Production/Staging isolation, external monitoring, real storage, scanner, rate limiter, email and DNS remain later-stage external configuration/validation gates.
- Real administrator identities and Secrets remain unconfigured and were not requested or accessed.

## 24. Diff check and worktree state

- `git diff --check`: pass before each Checkpoint and for the final report diff.
- Final expected worktree after the report Commit: clean; no staged or ordinary untracked files.
- Diff against the remediation candidate contains only the listed implementation, tests, scripts and this report.
- Diff against the candidate is empty for `drizzle/`, `src/db/schema.ts`, `package.json`, `pnpm-lock.yaml` and production configuration.

The exact final `git status` and `git diff --check` result are repeated in the final handoff after this report Commit.

## 25. Required declarations and stop condition

- **Not pushed.**
- **Not deployed.**
- **No Tag, including no Approved Tag, was created.**
- **No formal Product, customer, Inquiry, Company Fact or media data was used.**
- **No real credentials or external service was accessed.**
- **Stage 2 was not entered.**
- **Production Ready remains No.**

Implementation and self-verification stop at this report. The two Medium findings are not self-declared closed. The next authorized activity is owner-arranged `Phase 1B Stage 1 Remediation Joint Review`.
