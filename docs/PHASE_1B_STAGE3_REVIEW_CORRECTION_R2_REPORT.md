# Phase 1B Stage 3 — Independent Review Correction Round 2 Report

Date: 2026-08-07

Developer conclusion: **Correction Round 2 implemented — Candidate ready for independent re-review.**

This is a Developer disposition report only. It does **not** declare `CWT-S3-H01` or `CWT-S3-H02` Closed and does not claim Independent Review passed, Fresh Acceptance, Accepted/Frozen, Production Ready, or authorization for Stage 4.

## 1. Fixed starting point and correction boundary

| Item | Evidence |
| --- | --- |
| Exclusive branch | `codex/phase-1b-stage3-product-import-continuation` |
| RR1 Candidate | `3f435ac810f8dd68b5d0a1d1fe2163e88e087be3` |
| RR1 conclusion | Changes Required |
| RR1 report | `/Users/calvin/Downloads/CWT（CloudWave Textile）项目/.data/PHASE_1B_STAGE3_INDEPENDENT_JOINT_REVIEW_RR1_REPORT.md` |
| RR1 report SHA-256 | `eb188eb2b5a00990884e373c2fc81877ec45a616484d480fad76a8e2f5659759` |
| `CWT-S3-H01` entering state | Partially Closed; remediation failure count 1 |
| `CWT-S3-H02` entering state | Partially Closed; remediation failure count 1 |
| `CWT-S3-H03` entering state | Closed by RR1; failure count 0; regression closure must be preserved |
| New RR1 findings | Blocker 0 / High 0 / Medium 0 / Low 0 |

Before modification, HEAD was exactly the RR1 Candidate, the worktree/index/ordinary-untracked state was clean, the branch had one writer/worktree, Stage 2 Freeze remained an ancestor, historical tag mapping had not moved, and no Migration `0020+` existed. The 326-line RR1 report was read in full and its SHA-256 matched exactly.

Round 2 changes only the residual H01 Published cross-Batch structure-patch boundary, the residual H02 OOXML package-topology boundary, and necessary H03 regression evidence. There was no brand-color, Inquiry, SEO, Publish/Index, Stage 4, provider, deployment, production/staging, or formal-data work.

### Linear implementation commits after the RR1 Candidate

1. `21fcf7088544ab3cce14fba47c4fae7759a8fce4` — `fix: close workbook package topology`
2. `2503353c0d948983bf64e1a7f0cdb238c1a65851` — `fix: merge published import structure patches`
3. This report is committed separately in the required report-only commit. That commit's SHA is the final Round 2 Candidate recorded in the Owner and independent-review handoffs.

No commit at or before `3f435ac8` was rebased, amended, squashed, or rewritten.

## 2. Finding dispositions

### CWT-S3-H01 — Published cross-Batch structure patch convergence

**Developer disposition: residual boundary remediated in this Candidate; awaiting independent Round 2 re-review.**

**Implementation commit:** `2503353c0d948983bf64e1a7f0cdb238c1a65851`

#### Root cause

The RR1 Import Update implementation read the live Product structure before entering the Product Revision lock, expanded an explicit Template V1 patch into a complete structure snapshot, and passed that stale replacement snapshot to the Product Domain Service. The unified pending Revision correctly serialized writes, but its one `structure` change key replaced the previous full snapshot. Two different Batches could therefore both become immutable `applied` items while the later stale snapshot silently omitted the earlier Batch's explicit patch.

#### Correction

- Import Update now sends only the explicit Template V1 structure patch to `patchProductStructure` in the existing Product Domain Service. Import no longer constructs a complete Published structure snapshot.
- The Product Domain Service loads the expected pending structure as conflict evidence, then enters the existing unified Product Revision authority. After the localization/revision locks are held, it reloads the latest live and pending structure and constructs the one complete persisted snapshot there.
- Different replacement fields merge into the latest locked structure. Concurrent Applications and Tags patches therefore both survive in the one pending Revision.
- Same-field concurrency is explicit and deterministic. If the latest locked value differs from both the caller's expected base and desired value, the Product Domain Service throws `ProductRevisionConflictError`; Import persists the typed retryable code `product_revision_conflict`. An already-equal desired value remains idempotent.
- `retryProductImportErrors` accepts that typed conflict. Retry calls the Product Domain patch service again, reloads the latest unified pending structure, rebuilds the patch, and never reuses the stale full snapshot.
- Additive media is always planned against the latest locked pending structure. Asset identity is de-duplicated; an incoming Hero remains additive and becomes Gallery when a Hero already exists; role orders advance from the latest role maximum.
- The actual locked media role/order is written back into the successful Import item's immutable `normalizedData`. Preview uses the same Product Domain planning function against current pending state rather than a second Import-layer planner.
- Every persisted structure snapshot receives a canonical SHA-256 identity. The required Product Revision Audit and successful `product_import.item_applied` Audit carry that identity and the same Revision ID. A failed/conflicting transaction cannot leave a Product Revision Audit or successful item behind.
- Approved public Product structure remains unchanged. All Published changes still converge in one pending unified Revision and require existing authorized human approval.
- Draft updates continue through the existing Product structure mutation authority. Ordinary explicit-patch, omitted-field preservation, additive media, preview, retry, and same-Batch idempotency behavior remains covered and passing.

#### Deterministic concurrency contract

- Different explicit fields: merge in serialized Product Revision lock order; both may become `applied` because both patches remain present.
- Different additive media: merge in serialized lock order; both become `applied`, Asset IDs are unique, and actual role/order evidence is persisted in each item.
- Same field with different desired values and the same pre-lock base: one succeeds and the other receives `product_revision_conflict`.
- Same field after the first operation is already committed: the later operation starts from that latest base and is an ordinary explicit later patch.
- Retry after conflict: rebuild from the latest pending Revision; the approved public revision remains unchanged.

#### Regression evidence

- New `src/imports/published-update-concurrency.integration.test.ts` covers two different Batches changing different fields, two different additive media Assets, same-field concurrency, typed conflict/retry, unique media role/order, actual successful-item normalized evidence, Audit/Revision identity, and approved public isolation.
- `src/imports/update-patch.integration.test.ts` retains Draft additive media, omitted Features/FAQs/Tags/display flags, Hero/Gallery preservation, exact preview, same-Batch concurrency, and Published pending-revision assertions.
- The PostgreSQL 18.4 verifier uses a real held Product localization lock so both writers load the same base before release. It proves different-field merge, different-media merge, one same-field conflict, latest-base retry, six successful item Audits, and unchanged approved public Applications/media.

#### Known limitations / Owner Decision

No Owner Decision or architecture change was required. Template V1 still has no media replace/delete contract; media remains deterministic additive-only. Published changes still require human Revision approval. H01 remains subject to independent Round 2 disposition.

### CWT-S3-H02 — Complete OOXML package topology authority

**Developer disposition: residual boundary remediated in this Candidate; awaiting independent Round 2 re-review.**

**Implementation commit:** `21fcf7088544ab3cce14fba47c4fae7759a8fce4`

#### Root cause

RR1 correctly followed `xl/workbook.xml` relationships to the actual worksheet parts for formula/dimension checks, but recognized worksheet relationships by a string suffix and did not parse `[Content_Types].xml`. Duplicate worksheet targets and incomplete or wrong worksheet content-type topology could therefore pass the explicit package gate, leaving downstream `read-excel-file` behavior to decide the outcome.

#### Correction

- `inspectWorkbookContainer` remains the single package/parser authority and now requires exactly one readable `[Content_Types].xml`, `xl/workbook.xml`, and `xl/_rels/workbook.xml.rels` before downstream parsing.
- The only supported worksheet relationship URI is the exact transitional OOXML URI `http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet`.
- Strict OOXML worksheet relationship URI `http://purl.oclc.org/ooxml/officeDocument/relationships/worksheet` is explicitly unsupported and fails at the package gate. No suffix matching remains.
- Workbook, Relationships, and Content Types XML envelopes and relevant empty-element topology are parsed completely enough to fail closed on malformed/partial tags, unsupported markup, duplicate attributes, invalid entities, and unsafe part names.
- Every relationship-resolved worksheet part must have exactly one `Override` whose content type is `application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml`. Missing, wrong, or duplicate declarations fail closed.
- Duplicate relationship IDs, duplicate normalized worksheet targets, unreferenced supported worksheet relationships, unreferenced worksheet parts, missing targets, external/invalid TargetMode, unsafe targets, and incomplete workbook/rels topology fail before `read-excel-file`.
- The package gate requires exactly the relationship-resolved `Products` and `_CWT_META` sheet identities. Formula, dimension, and cell-bound checks still run on those actual parts before cached values can be trusted.
- Template V1 fields and facts are unchanged; formulas remain prohibited evidence.

#### Regression evidence

- `src/imports/workbook.test.ts` now has 14 tests, including a fake unsupported URI ending in `/worksheet`, explicit strict-URI rejection, missing/wrong/duplicate worksheet Content Types, duplicate relationship IDs and targets, extra unreferenced relationship/part, missing relationship/content-type authority, canonical Template V1, renamed Products/_CWT_META formula/dimension, and all existing bounded workbook protections.
- Existing macro, external-link, encrypted, malformed/truncated ZIP, duplicate package part, entry-count, actual-byte, expanded-size, row-count, dimension, formula attribution, and cell-bound regressions remain passing with harmless synthetic fixtures.

#### Known limitations / Owner Decision

No Owner Decision is required. Transitional OOXML is the explicit Template V1 contract. Strict OOXML is deliberately rejected at the audited package boundary rather than relying on downstream library behavior. H02 remains subject to independent Round 2 disposition.

### CWT-S3-H03 — Closed finding regression preservation

**Developer disposition: RR1 closure behavior preserved in regression; no new closure claim is made here.**

Round 2 did not alter `admin-upload-service.ts`, Upload Intent/Finalize/Manifest/Variant/Recovery/Cleanup implementation, retention, lease authority, Batch-first media ownership, bounded JSONB binding, Folder/ZIP transport routes, or operator resume/cancel UI.

- No production `createValidatedProductImport` symbol or reachable post-Finalize Batch creation path exists.
- Migration `0019` remains the two-table authority; no `0020`, Worker, Queue, new Lease authority, second Upload/Finalize, or second Product/Revision authority was added.
- Full Vitest, PostgreSQL 18.4, and zero-retry Playwright retained Folder/ZIP reload/resume, same-token response-loss, active/expired lease fencing, cancel/expiry/cleanup, retention, and no-duplicate Asset/Variant/Product-Asset evidence.
- PostgreSQL final evidence remained: JSONB bindings 2 with Source Declaration false; same durable archive replay; Variants 12 without replay growth; expired lease attempted/completed 1/1; retained-media cleanup expired 1, failed Batches 1, attempted/completed/dead 7/7/0; final idle/waiting/advisory locks 0/0/0.

## 3. Complete changed-file and invariant impact

Round 2 implementation changes seven files across the two implementation commits. This report is the only file in its final report-only commit.

| Area | Files | Invariant impact |
| --- | --- | --- |
| Product/Revision authority | `src/catalog/product-service.ts` | Builds explicit structure patches against the latest locked unified pending state, enforces same-field conflict semantics, merges additive media, and emits canonical structure evidence. No second Revision or business-table authority. |
| Import orchestration | `src/imports/service.ts` | Removes Import-layer complete Published structure snapshots and duplicate media planning; maps typed Revision conflicts to retryable item state; persists actual role/order and structure identity in successful item/Audit evidence. |
| H01 integration evidence | `src/imports/published-update-concurrency.integration.test.ts`; `src/imports/update-patch.integration.test.ts`; `scripts/verify-stage3-postgres.ts` | Reproduces cross-Batch Published field/media concurrency, deterministic same-field conflict/retry, Audit correspondence, public isolation, and the full Stage 3 PostgreSQL/H03 matrix. |
| OOXML package authority | `src/imports/workbook.ts`; `src/imports/workbook.test.ts` | Completes exact relationship/content-type/topology validation before cached workbook values reach the reader. No Template V1 business-field change. |

No dependency, lockfile, schema, migration, feature-flag default, public bundle dependency, Product URL/SEO, Publish/Index, Source Declaration, rights/facts, or provider configuration changed.

## 4. Migration and historical identities

| Artifact | SHA-256 |
| --- | --- |
| `drizzle/0019_needy_slyde.sql` | `ea8d51f971fe160bcded1f588645db0e0f6f16d704eff34fa38350fb5d1314ed` |
| `drizzle/meta/0019_snapshot.json` | `46b68b39c738b03f9f69aee5574a4626c425afa497b1a1d60531f1efed94c5c9` |
| `drizzle/meta/_journal.json` | `1ecf43a8d0fd625457bf3677c174f6b8ea2e6bf2b49daf5f7d3a660392690c09` |
| Sorted historical tag mapping | `d488448f6c8e65115f7b0ef00c6ca7a4784228eb4122ab97f7441c51b5299ce5` |

`0000–0018` remain unchanged, `0019` remains unchanged, no `0020+` exists, and the historical tag mapping matches the pre-Round-2 identity.

## 5. Final verification evidence

| Gate / command | Exact final result |
| --- | --- |
| H02 focused | `pnpm exec vitest run src/imports/workbook.test.ts`: **1/1 file, 14/14 tests passed**. |
| H01/H03 focused | Six files: **6/6 files, 12/12 tests passed**. |
| `pnpm lint` | Passed with `--max-warnings=0`. |
| `pnpm typecheck` | Passed. |
| `pnpm exec drizzle-kit check` | Passed: `Everything's fine`. |
| `git diff --check` | Passed for the complete RR1-to-source-Candidate range. |
| `pnpm test:run` | **92/92 files, 337/337 tests passed** in 252.49s. |
| PostgreSQL 18.4 | Final isolated Fresh/Upgrade/concurrency/Revision/Audit/Import/Recovery matrix passed at the committed source HEAD. |
| `pnpm build` | Isolated migrated/seeded production build compiled, typechecked, and generated **43/43** static page units. |
| `pnpm check:bundle` | Passed across 23 public page manifests and 31 referenced manifest/chunk files. |
| `pnpm audit --prod` | **No known vulnerabilities found.** |
| `CI=1 pnpm exec playwright test --retries=0` | **47/47 passed** in 1.8m across Desktop Chromium and Pixel 7. |
| Test hygiene | No focused/skip marker, added retry, lowered threshold, governance allowlist change, or disabled test. |

### PostgreSQL 18.4 final matrix

The final run used a new local `postgres:18.4` container on `127.0.0.1`, `APP_ENV=test`, `DATABASE_DRIVER=postgres`, `CWT_POSTGRES_VALIDATION=stage3-isolated`, and the repository-required `NODE_OPTIONS=--conditions=react-server`. The verifier created and removed random Fresh and Upgrade databases.

- Identity: PostgreSQL 18.4 Debian aarch64, 64-bit.
- Fresh `0000 → 0019`, repeat/no-op, and representative `0018 → 0019`: passed; 20 journal rows, latest ID 20.
- Catalog: 2 Import tables, 45 constraints, 9 foreign keys, 8 indexes.
- Required Audit rollback: Product count 0 before retry, 1 after safe retry.
- Same fingerprint: one Batch. Concurrent Create Apply: one Product and one Product-Asset relation. Product Code contention: `applied,error`.
- Published different-field lock test: `applied,applied`; both patches present in one pending Revision.
- Published different-media lock test: `applied,applied`; both Assets present exactly once as Gallery at role orders 0 and 1.
- Published same-field lock test: one `product_revision_conflict`; retry rebuilt from latest pending state and finished `applied,applied`.
- Published successful item Audits: 6, each with the same Revision ID and a 64-character canonical structure identity. Approved public Applications/media stayed 0/1.
- Exact declaration-off JSONB binding query: 2. Same-token replay returned the same package/children; no duplicate children; Variant count remained 12.
- Active lease rejected; expired lease Recovery attempted/completed 1/1.
- Import cleanup/expiry attempted/completed 1/1. Retained media: expired 1, failed Batch 1, Cleanup attempted/completed/dead 7/7/0.
- Final idle-in-transaction 0, waiting 0, advisory locks 0.

### Browser, responsive, accessibility, and runtime evidence

The final zero-retry Playwright run retained 47 tests across Desktop Chromium and Pixel 7. It covered template/upload/validation/preview/Apply/partial success/correction/retry/cancel/error export, actual browser folder selection, Folder response loss with reload/history resume, ZIP child response loss and explicit cancel, authorization, and H03 same-Intent durable behavior.

The established 320/375/390/768/1024/1440 matrices passed. Axe Critical/Serious remained 0 and captured console/page/hydration errors remained 0. Frozen public Product Revision, media, SEO, URL, Publish/Index, and redirect regressions passed.

## 6. First failures and harness observations

Final gates are green. First failures were retained rather than hidden:

1. H02's first focused run passed 13/14. The new package gate correctly rejected a third worksheet earlier than the downstream reader, but its safe message did not contain the existing test's `only generated Template V1` phrase. The package-gate message was standardized without relaxing validation; the next run passed 14/14.
2. H01's first typecheck after removing the Import-layer structure snapshot/planner found three compile errors: Product media `sortOrder` was optional at the projection type boundary, and preview still referenced the two removed Import helpers. Sort order was safely normalized and preview was converged onto `previewProductStructurePatch` in the Product Domain Service.
3. H01's first six-file focused run passed 10/11. The Draft preview row failed closed because the new strict Product structure schema received the Import-only `sourceKey`. The boundary now maps only the six authorized media placement fields into Product authority; rerun passed.
4. A diagnostic assertion was added to expose that Row Error's stable code/detail and retained as useful regression evidence; it does not weaken the original preview assertion.
5. The first final evidence-summary shell command had an unmatched quote in a read-only search expression and exited before executing checks. The checks were split into unambiguous commands and all passed.
6. PostgreSQL emitted only historical identifier-truncation and repeat-migration notices. The first and final Round 2 PostgreSQL application runs both passed, including the new real-lock concurrency harness.
7. Playwright emitted the established `NO_COLOR/FORCE_COLOR` harness warning. The one requested full run used explicit `--retries=0` and passed 47/47 on its first application run.

No gate was made easier, no retry was added, no threshold or security limit was lowered, no test was skipped, and no governance scanner/allowlist was changed.

## 7. Technical debt, external validation, and Owner confirmation

### Known limitations

- Product Import remains feature-flagged and default OFF.
- Pending Published Product revisions still require the existing authorized human review.
- Transitional OOXML is the only accepted worksheet relationship contract; strict OOXML is deliberately rejected.
- Template V1 remains additive-only for media and has no replace/delete contract.
- The PostgreSQL verifier requires the established `react-server` Node condition because it imports server-only Domain Services.

### External validation

- No Production/Staging database, bucket, secret, scanner, provider, deployment, DNS, or formal Product/media data was contacted.
- Synthetic fixtures remain synthetic/noindex and establish no CloudWave Textile product, supply, facility, certification, capacity, rights, or other business fact.
- Formal Product status remains **Waiting for Real Product Data Validation**.
- Production Ready remains **No**.
- Stage 4 remains planned/deferred and not authorized.

### Owner confirmation

Inquiry convergence remains **Owner Confirmation Required** and outside this correction. No new Owner Decision or ADR was needed for H01/H02 because the corrections remain inside Template V1, ADR-0016, the existing Product/Revision and workbook authorities, the two-table `0019` boundary, and existing Upload metadata.

## 8. Cleanup and handoff

The disposable PostgreSQL 18.4 container and all verifier databases were removed. The exact isolated build directory `/private/tmp/cwt-stage3-r2-build.QTxcZM` was moved intact and recoverably to `/Users/calvin/.Trash/cwt-stage3-r2-build.QTxcZM`. Playwright's isolated data roots were handled by its existing global teardown. Repository `.data`, storage roots, workspace root, tags, source branch, and uncertain targets were not deleted.

At report creation, both implementation commits are clean and this report is the only file awaiting its report-only commit. After that commit, the expected worktree/index/ordinary-untracked state is clean.

No Tag / Push / Deploy / Production / formal data / Fresh Acceptance / Accepted and Frozen / Stage 4 action was performed.

Project Owner next step: verify the final Round 2 Candidate and this report, then return the same Finding identities to the original Independent Joint Review task. The reviewer, not this Developer report, must determine whether H01 and H02 are Closed and whether H03 remains Closed. If H01 or H02 is not Closed, its failure count becomes 2; this task does not start Round 3 or technical-failure analysis.
