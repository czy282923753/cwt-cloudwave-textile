# Phase 1B Stage 3 — Independent Review Correction Round 1 Report

Date: 2026-08-07
Developer conclusion: **Correction Round 1 implemented — Candidate ready for independent re-review.**

This is a developer disposition report. It does **not** declare any finding Closed and does not claim Independent Review passed, Fresh Acceptance, Accepted/Frozen, Production Ready, or authorization for Stage 4.

## 1. Reviewed Candidate and correction boundary

| Item | Evidence |
| --- | --- |
| Stage 2 Freeze | `5624ca993e31a07d9c7e19a5504aa82b5aba92ff` |
| Reviewed Stage 3 Candidate | `d1e5b657d2226ad1af1b96647b3e0d208695ec29` |
| Exclusive branch | `codex/phase-1b-stage3-product-import-continuation` |
| Independent review result | Changes Required — Blocker 0 / High 3 / Medium 0 / Low 0 |
| Independent review report | `/Users/calvin/Downloads/CWT（CloudWave Textile）项目/.data/PHASE_1B_STAGE3_INDEPENDENT_JOINT_REVIEW_REPORT.md` |
| Review report SHA-256 | `bdaff3a5fa1570b58923174b8edce93dfa5d180bd52d5af39da7e3522119a13c` |
| Correction attempt | Round 1; first remediation attempt for each finding; pre-review remediation failure count remains 0 |

Before correction work, the branch HEAD was exactly the reviewed Candidate, the worktree and index were clean, ordinary untracked files were absent, no second writer was active, the Freeze remained an ancestor, and the historical tag mapping had not moved. The independent report was read in full and the original finding IDs were retained.

The only authorized correction scope was `CWT-S3-H01`, `CWT-S3-H02`, `CWT-S3-H03`, their necessary regression tests, and this report. There was no unrelated refactor, brand-color work, Inquiry convergence work, Stage 4 work, schema expansion, production/staging connection, provider use, or formal-data import.

### Linear correction commits after the reviewed Candidate

1. `ce26cacd3bf18c69b6605d8f094d2fb9b181597e` — `fix: validate related product import worksheets`
2. `591a0889aabcb0cce3e322872ece127ec45fe9ad` — `fix: preserve product patches and durable import media`
3. This document is committed separately as the required report-only commit. Its SHA is the final Correction R1 Candidate SHA recorded in the Project Owner and independent-review handoff messages.

No commit at or before `d1e5b657` was rebased, amended, squashed, or otherwise rewritten.

## 2. Finding dispositions

### CWT-S3-H01 — Update implicitly deleted existing Product structure

**Developer disposition: Remediated in this Candidate; awaiting independent re-review.**
**Implementation commit:** `591a0889aabcb0cce3e322872ece127ec45fe9ad`

#### Root cause

The Update path normalized absent Template V1 inputs into defaults and then built a replacement-shaped Product input. Existing media relations and Product structures not governed by explicit workbook columns could consequently be replaced or omitted. Preview represented the import row rather than the exact additive result. That violated Template V1's bounded-field contract and made absence behave like a destructive instruction.

#### Correction

- Update now loads the existing Product's categories, applications, tags, media, Features, FAQs, localization, and display flags before constructing the governed patch.
- Only fields explicitly represented by Template V1 alter their authorized domain. Missing values no longer become empty arrays or default flags that overwrite unexpressed data.
- Existing media relations retain their role, visibility, and sort order. New import media produces deterministic additive relations only, with identity de-duplication across retry and concurrent Apply.
- If the Product already has a Hero, incoming Hero-requested media is deterministically added as Gallery media; no existing Hero or Gallery relation is replaced or deleted. Preview exposes the final additive role/order decision.
- Draft updates retain existing structural data while applying only the requested patch.
- Published Product updates create one pending unified Revision. The approved public revision remains unchanged until human approval. Import media needed by the pending revision remains retained and is released only when the existing Product revision authority applies the relation.
- Product Domain Service remains the sole Product mutation authority. UI and API routes do not write Product business tables directly, and no second update path was introduced.

#### Regression evidence

- `src/imports/update-patch.integration.test.ts` proves Draft additive media, preservation of existing Hero/Gallery and invisible relations, preservation of Tags/Features/FAQs/display flags when not expressed, bounded category/application changes, exact preview behavior, retry/concurrent Apply idempotency, and no duplicate Product-Asset relation.
- The same suite proves a Published Product keeps its approved live revision while one pending unified Revision is created and retained media remains non-live until approval.
- Existing service and browser suites continue to prove Create remains Draft/noindex, Update cannot Publish or enable Index, required Audit is atomic, and partial success/correction/retry behavior is preserved.

#### Known limitations / Owner Decision

No Owner Decision is required for this correction. Template V1 remains intentionally patch-bounded: it does not provide replace/delete semantics for media, Features, FAQs, Tags, or display flags beyond fields explicitly governed by the contract.

### CWT-S3-H02 — OOXML checks did not follow Workbook Relationships

**Developer disposition: Remediated in this Candidate; awaiting independent re-review.**
**Implementation commit:** `ce26cacd3bf18c69b6605d8f094d2fb9b181597e`

#### Root cause

Formula and worksheet-dimension checks selected `xl/worksheets/sheet\d+.xml` by filename convention rather than resolving the worksheet parts referenced by `xl/workbook.xml` and its relationship file. A valid OOXML package can place worksheets at other internal part names, so cached formula values or oversized dimensions could reach the workbook reader without the intended guard.

#### Correction

- Workbook sheet names and relationship IDs are parsed from `xl/workbook.xml`; targets and relationship types are resolved from `xl/_rels/workbook.xml.rels`.
- The actual worksheet parts for `Products` and `_CWT_META` are normalized as internal package paths and checked before `read-excel-file` may trust cached values.
- External targets, unsafe or out-of-package traversal, missing targets, duplicate relationship IDs, duplicate governed sheet names/targets, unsupported relationship types, and incomplete relationships fail closed.
- Formula detection covers the complete referenced sheet XML, including prefixed formula elements; declared dimensions and actual cell references are both bounded.
- XML decoding is limited to the governed XML parts and rejects malformed XML entities/control characters. Formula results never become Product facts.
- Template V1 business columns, values, and matching rules are unchanged.

#### Regression evidence

- `src/imports/workbook.test.ts` covers cached formulas and over-limit dimensions at non-default legal worksheet targets for both `Products` and `_CWT_META`.
- It covers missing and external relationships and retains the canonical-template pass case.
- Existing macro-enabled, external-link, encrypted, malformed, entry-count, per-entry byte, total byte, and expanded-size protections continue to pass with harmless synthetic fixtures.

#### Known limitations / Owner Decision

No Owner Decision is required. The parser supports the internal worksheet relationship form needed by Template V1 and deliberately fails closed on ambiguous or unsupported package structures.

### CWT-S3-H03 — Finalize before durable Batch ownership could strand Public Assets

**Developer disposition: Remediated in this Candidate; awaiting independent re-review.**
**Implementation commit:** `591a0889aabcb0cce3e322872ece127ec45fe9ad`

#### Root cause

The browser previously finalized child media before creating the durable Product Import Batch. A reload, lost response, or process interruption in that interval could leave finalized Public-ready child Assets whose only ownership facts lived in browser state. The later Batch could not always diagnose, resume, cancel, or expire those children, and retry could allocate a second Asset.

#### Correction

- The flow now uploads the isolated workbook, calls the Product Import Domain Service to create a durable Draft Batch and its bounded file plan, then creates/finalizes media or archive uploads already bound to that Batch and Import item authority, and only then validates and applies.
- The former production `createValidatedProductImport` post-Finalize Batch-creation path was removed. There is one Product Import preparation/validation path and one existing Upload/Finalize authority.
- A deterministic HMAC upload token is derived for each Import Batch/item. A Product Import row lock serializes issuance, so same-item concurrent calls return the same Upload Batch/token rather than creating another Asset.
- Folder relative path, source order, package Asset ID, child binding, finalized Asset ID, and server-calculated SHA-256 are stored under the existing Product Import and Upload metadata authorities. Browser reload/process loss resumes from Import history and the same durable Upload/Asset result.
- Archive children retain deterministic package/source binding. Same-token response-loss replay byte-verifies the received stream and returns the same package and child results without another Asset, Finalize, Variant, or relation.
- Import media without a live authorized Product relation retains a 30-day Import retention/compensation boundary. Draft Product relations release retention atomically when the relation is made; Published pending-revision media remains retained until the existing unified Revision authority approves and applies it.
- Cancel/abandon arms the existing Finalize/Staging Recovery and Cleanup mechanisms for workbook, package, unmatched, unrelated, and child Assets while preserving Import and Audit history.
- Existing cleanup processing now expires retained unassociated import media and converges the Batch to `preparation_expired`; it uses the existing cleanup/recovery jobs and creates no worker, queue, lease system, or new authority.
- A discovered recovery-version mismatch was fixed at the existing Upload authority: when Recovery advances an archive package, its cleanup evidence now tracks the current recovery version, allowing package and children to converge without bypassing fencing.
- The operator UI exposes understandable Resume upload / Validate / Cancel actions from durable Import history and does not expose internal lease concepts.

#### Regression evidence

- `src/imports/durable-preparation.integration.test.ts` covers Batch-first ownership, same-item concurrent issuance, reload/resume with the same Asset, longer-than-immediate response loss, cancellation, expiry, cleanup, and absence of duplicate Asset/Finalize/Variant/relation state.
- `src/imports/archive-upload.integration.test.ts` covers archive child interruption, same-token replay, Recovery version fencing, package/child cancellation cleanup, and retained Audit history.
- `tests/e2e/product-import.spec.ts` uses real browser folder selection and validates interruption after durable Batch creation, response loss, reload/resume, same Upload Intent reuse, ZIP child recovery, and explicit cancel convergence.
- `scripts/verify-stage3-postgres.ts` proves the final PostgreSQL concurrency, replay, active/expired lease, retention expiry, cleanup, duplicate-resistance, and zero-lock matrix.

#### Known limitations / Owner Decision

No schema or architecture decision was needed. The correction reuses `product_import_batches`, `product_import_items`, existing `asset_upload_batches.declaration_input` binding, and existing Recovery/Cleanup. It adds no table, Migration `0020`, Worker, Queue, Lease authority, second Upload/Finalize, or second Product/Revision authority.

The feature remains default OFF. Real Product/media validation and production-provider behavior remain external validation, not facts established by synthetic tests.

## 3. Changed-file and invariant impact

The Correction R1 implementation changes 20 source/test/script files across the two implementation commits. This report is the only file in the final report-only commit.

| Area | Files | Invariant impact |
| --- | --- | --- |
| OOXML relationship authority | `src/imports/workbook.ts`; `src/imports/workbook.test.ts` | Validates the actual governed worksheet parts before cached values are parsed; no Template V1 field or Product fact authority changed. |
| Product patch and Import orchestration | `src/imports/service.ts`; `src/imports/service.integration.test.ts`; `src/imports/update-patch.integration.test.ts`; `src/imports/durable-preparation.integration.test.ts` | Makes Update patch-bounded, media additive, preview exact, and Import ownership durable before child activation; preserves Product Domain Service authority. |
| Existing Upload/Recovery/Cleanup | `src/uploads/admin-upload-service.ts`; `src/imports/archive-upload.integration.test.ts`; `scripts/process-object-cleanup.ts`; `scripts/verify-stage3-postgres.ts` | Reuses one Upload/Finalize/Recovery/Cleanup authority, deterministic Import item binding, compensation/retention, fencing, expiry, and cleanup; no new persistent coordination mechanism. |
| Existing Product Revision release | `src/catalog/product-service.ts` | Releases retained import media only when the existing Revision application makes its Product relation live; approved public revision is unchanged before approval. |
| Admin UI and transport | `src/admin/components/product-import-wizard.tsx`; `src/admin/components/product-import-wizard.test.tsx`; `src/admin/components/product-import-resume.tsx`; `src/app/admin/product-imports/[batchId]/page.tsx`; `src/app/api/admin/product-imports/route.ts`; `src/app/api/admin/product-imports/[batchId]/uploads/route.ts`; `src/app/api/admin/product-imports/[batchId]/validate/route.ts`; `src/app/api/admin/product-imports/[batchId]/cancel/route.ts` | Uses Batch-first APIs and durable history for resume/cancel; routes parse/translate while Domain Services recheck permission and mutate business state. |
| Browser regression | `tests/e2e/product-import.spec.ts` | Adds real folder and archive interruption/reload/response-loss/cancel evidence with zero retries. |

No dependency or lockfile changed in Correction R1. No public-bundle dependency, provider, secret, deployment configuration, Publish/Index control, fuzzy matcher, taxonomy creator, Source Declaration authority, or AI/Stage 4 mechanism was added.

### Source Declaration and public-media isolation

The bounded Import binding remains inside `asset_upload_batches.declaration_input.importMediaBinding` or `importPackageBinding` while `source_declaration_enabled = false`. The binding carries operational ownership facts only; it is not source, rights, or fact evidence. Existing Finalize logic does not derive rights from it. Public delivery still requires a live eligible Product relation, so retained media for a pending revision or incomplete Batch is not publicly deliverable merely because scan/Finalize completed.

Required Audit remains atomic with business mutation. Authorization is rechecked in Domain Services. Create remains Draft/noindex. Publish, Index, route/301, rights/fact approval, SEO eligibility, and public revision authority are unchanged.

## 4. Migration and historical identities

No schema change was needed for any finding.

| Artifact | SHA-256 |
| --- | --- |
| `drizzle/0019_needy_slyde.sql` | `ea8d51f971fe160bcded1f588645db0e0f6f16d704eff34fa38350fb5d1314ed` |
| `drizzle/meta/0019_snapshot.json` | `46b68b39c738b03f9f69aee5574a4626c425afa497b1a1d60531f1efed94c5c9` |
| `drizzle/meta/_journal.json` | `1ecf43a8d0fd625457bf3677c174f6b8ea2e6bf2b49daf5f7d3a660392690c09` |
| Sorted historical tag mapping | `d488448f6c8e65115f7b0ef00c6ca7a4784228eb4122ab97f7441c51b5299ce5` |

Migration `0019` still contains exactly the authorized `product_import_batches` and `product_import_items` additions. Import binding continues to use the already-approved JSONB field on existing Upload metadata, without a schema addition. `0000`–`0018` are unchanged, no `0020` exists, and the tag mapping matches the pre-correction value.

## 5. Final verification evidence

| Gate / command | Exact final result |
| --- | --- |
| Focused correction tests | Latest focused run: 5 files, 20 tests passed. All finding-specific suites also passed during development. |
| `pnpm lint` | Passed with `--max-warnings=0`. |
| `pnpm typecheck` | Passed. |
| `pnpm exec drizzle-kit check` | Passed: `Everything's fine`. |
| `git diff --check` | Passed. |
| `pnpm test:run` | **91/91 files, 333/333 tests passed** in 259.24s. |
| PostgreSQL matrix | Disposable localhost `postgres:18.4` container passed the complete Stage 3 matrix; databases and container were removed afterward. |
| `pnpm build` | Isolated migrated/seeded production build passed compile/type and generated **43/43** static page units. |
| `pnpm check:bundle` | Passed across 23 public page manifests and 31 referenced manifest/chunk files. |
| `pnpm audit --prod` | **No known vulnerabilities found.** |
| `CI=1 pnpm exec playwright test --retries=0` | **47/47 passed** in 1.7m across Desktop Chromium and Pixel 7. |
| Manual browser check | Local production Admin/Product Import page rendered at 1280 px with `scrollWidth = width = 1280`; console warning/error arrays were empty. Default-OFF safe state rendered as expected. |
| Test hygiene | No new focused/skip marker or weakened retry/threshold; Playwright final retry count was zero. |

### PostgreSQL 18.4 matrix detail

The final verifier ran with the required server-only Node condition and the explicit safety envelope `APP_ENV=test`, `DATABASE_DRIVER=postgres`, `CWT_POSTGRES_VALIDATION=stage3-isolated`, and a localhost administrative URL. It created random isolated Fresh and Upgrade databases and removed them on completion.

- PostgreSQL identity: **18.4**, Debian aarch64, 64-bit.
- Fresh `0000 → 0019`, then repeat/no-op: 20 journal rows, latest ID 20.
- Representative `0018 → 0019`: applied exactly one migration and created exactly the two authorized Import tables.
- Catalog: 2 Import tables, 45 constraints, 9 foreign keys, 8 indexes; required catalog and hash checks passed.
- Required Audit rollback: Product count was 0 before safe retry and 1 after retry.
- Same fingerprint/item concurrent retry: one durable Batch. Concurrent Apply: one Product and one Product-Asset relation.
- Product Code contention: item states were exactly `applied,error`.
- Exact JSONB binding query: 2 archive child bindings; both declaration columns remained false.
- Same-token byte-verified response-loss replay: same durable package and children; no duplicate child, Finalize, or Variant growth. Variant count remained 12.
- Valid active lease rejected re-entry. Expired lease Recovery attempted 1 and completed 1.
- Import staging cleanup/expiry/storage interruption attempted 1 and completed 1.
- Retained-media expiry: expired 1, failed Batches 1; Cleanup attempted 7, completed 7, dead 0.
- Final database health: idle-in-transaction 0, waiting 0, advisory locks 0.

### Browser, responsive, and accessibility detail

The final zero-retry Playwright run covered template download/upload, workbook validation, ZIP, actual browser folder selection, preview, Apply, partial success, row correction, retry, cancel, error export, authorization, durable resume, folder response loss with reload, archive-child response loss, and archive cancel convergence.

The response-loss tests prove that the first request reaches the server and loses its response, then a later browser action resumes the same durable Upload Intent/Batch/Asset rather than reallocating an Asset. Desktop Chromium and Pixel 7 cover 320, 375, 390, 768, 1024, and 1440 widths where applicable. Axe Critical/Serious findings were 0, and captured console, page, and hydration errors were 0.

## 6. First failures and harness observations

Final gates are green. The following first failures and harness observations are retained explicitly:

1. The initial H02 focused run had three failures, then two: synthetic fixtures did not all contain actual dimensions, one expected error message did not match the fail-closed layer, and an unreferenced-sheet expectation did not reflect relationship authority. Fixtures and implementation were corrected without relaxing validation.
2. An ad hoc OOXML `tsx -e` diagnostic first failed because top-level `await` was emitted in CommonJS mode; the same read-only diagnostic was rerun inside an async function.
3. H01's first typecheck exposed an `isVisible` value inferred as `unknown`; the patch was narrowed so Create uses the contractual true value and Update preserves the existing boolean.
4. The first durable-preparation integration run found a test-plan shape mismatch (`fileName` versus canonical `displayName`); raw file-plan data was canonicalized at the Domain Service boundary.
5. The first combined wizard test lacked a response for the new Validate request; the transport mock was completed to represent the real flow.
6. The first lint run reported two unused imports introduced during convergence; both were removed.
7. The archive-cancel integration test first reached the repository's `server-only` guard because it newly imported the Domain Service; it was given the standard Vitest `server-only` mock used by server integration suites.
8. The next archive-cancel run correctly failed closed because the synthetic fixture had bypassed Batch preparation and had not enabled Product Import; the fixture now explicitly enables the default-OFF feature.
9. The following archive-cancel run exposed a real defect: Recovery advanced the package version while Cleanup retained stale identity evidence, leaving the package scanning. The existing Upload authority now synchronizes cleanup evidence to the current recovery version; package and child convergence are asserted.
10. The first full Vitest run passed 90/91 files and 332/333 tests. The governance scanner rejected a temporary fifth coordination-mutation module. Its logic was consolidated into the existing `admin-upload-service.ts`, the temporary module was deleted, and the governance scanner was not changed. Final full Vitest passed 91/91 and 333/333.
11. The first PostgreSQL invocation omitted `NODE_OPTIONS=--conditions=react-server` and stopped at the intentional `server-only` guard before database work. The exact final invocation included the condition and passed; application code was not weakened.
12. Playwright run 1 passed 45/47. Both new tests used a broad `getByRole("alert")` selector that also matched Next's route announcer; assertions were narrowed to the visible wizard alert.
13. Playwright run 2 passed 46/47. The folder test captured the URL before Next's soft navigation and reloaded the index; the test was changed to wait for the durable Batch detail URL.
14. Playwright run 3 passed 45/47. Folder navigation still required an explicit URL wait, and ZIP cancel asserted an ephemeral screen-reader message removed by refresh. Stable assertions now use the detail URL, cancel-action disappearance, and durable failed history state.
15. The two new browser scenarios then passed 2/2 in 34.5s; the final complete zero-retry matrix passed 47/47.
16. A read-only ad hoc database query after the browser build again used `tsx -e` with top-level `await` and stopped in the CommonJS transform. It was not a product gate. The manual page check still verified the safe feature-disabled state, while Playwright verified the enabled path.
17. The first attempt to remove the exact isolated build directory with a direct recursive delete was rejected by the command safety layer before execution. The directory was instead moved, intact and recoverably, to the user's Trash after exact-path validation. No repository or project data was removed.

No retry was added, no threshold was lowered, no governance allowlist was expanded, and no test was disabled to obtain a pass.

## 7. Technical debt, external validation, and owner confirmation

### Technical debt / known limitations

- Product Import remains feature-flagged and default OFF. Enabling it is an explicit environment/owner operation outside this correction.
- Pending Published Product revisions still require the existing authorized human review. Import deliberately cannot approve or publish them.
- The PostgreSQL verifier requires the established `react-server` Node condition because it directly imports server-only Domain Services; this is a test-harness invocation requirement.
- The correction establishes deterministic additive media semantics. Template V1 still has no media replacement/deletion contract; adding one would require an approved contract/architecture decision rather than inference.

### External validation still required

- No Production/Staging database, bucket, secret, scanner, provider, deployment, DNS, or formal Product/media data was accessed.
- Synthetic fixtures remain conspicuously synthetic/noindex and establish no CloudWave Textile product, factory, capacity, certification, rights, or other business fact.
- Formal Product status remains **Waiting for Real Product Data Validation**.
- Production Ready remains **No**.
- Stage 4 remains planned/deferred and not authorized. No AI/`ai_runs`, email/CRM, or provider work was performed.

### Owner confirmation required

Inquiry convergence remains **Owner Confirmation Required** and outside this correction scope. None of the three findings required a new Owner Decision or ADR because the root causes were corrected inside Template V1, ADR-0016, Migration `0019`, and existing Upload/Product authorities.

## 8. Cleanup and handoff status

The disposable PostgreSQL 18.4 container and its isolated databases were removed. The exact 42 MB isolated build directory `/private/tmp/cwt-stage3-r1-build.FoNA5r` was validated and moved intact to `/Users/calvin/.Trash/cwt-stage3-r1-build.FoNA5r`; it is recoverable. Project `.data`, storage roots, workspace root, source branch, tags, and uncertain targets were not deleted.

At report creation, the implementation commits are clean and this report is the only new file awaiting its required report-only commit. After that commit, the expected branch state is clean.

No Tag / Push / Deploy / Production / formal data / Fresh Acceptance / Accepted and Frozen action was performed.

Project Owner next step: verify the Correction R1 Candidate SHA, linear commits, evidence, and this report, then send the Candidate to the original Stage 3 Independent Joint Review task for independent Correction Round 1 re-review of `CWT-S3-H01`, `CWT-S3-H02`, and `CWT-S3-H03`.
