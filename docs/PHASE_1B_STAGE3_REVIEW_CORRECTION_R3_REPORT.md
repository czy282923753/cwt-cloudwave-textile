# Phase 1B Stage 3 — Independent Review Correction Round 3 Report

Date: 2026-08-07

Developer conclusion: **Correction Round 3 implemented — Candidate ready for Project Owner verification and independent Round 3 re-review.**

This is a Developer disposition report only. It does **not** declare `CWT-S3-H02` Closed and does not claim Independent Review passed, Fresh Acceptance, Accepted/Frozen, Production Ready, or authorization for Stage 4.

## 1. Fixed starting point and correction boundary

| Item | Evidence |
| --- | --- |
| Exclusive branch | `codex/phase-1b-stage3-product-import-continuation` |
| RR2 Candidate | `2135bfc3a50a81f17733ec67f02ce2a8eea9cfe0` |
| RR2 conclusion | Changes Required |
| RR2 report | `/Users/calvin/Downloads/CWT（CloudWave Textile）项目/.data/PHASE_1B_STAGE3_INDEPENDENT_JOINT_REVIEW_RR2_REPORT.md` |
| RR2 report SHA-256 | `dc1bc0630eb2b5b429d7b6706dec45bdd113a0c75c3edb11c393f6758c1c07c3` |
| `CWT-S3-H01` entering state | Closed; historical remediation failure count 1; mechanism frozen for this correction |
| `CWT-S3-H02` entering state | Partially Closed; remediation failure count 2; this is the third normal remediation attempt |
| `CWT-S3-H03` entering state | Closed; failure count 0; mechanism frozen for this correction |
| New RR2 findings | Blocker 0 / High 0 / Medium 0 / Low 0 |

Before modification, HEAD was exactly the RR2 Candidate. Worktree, index, and ordinary-untracked state were clean. The continuation branch had only this writer worktree; same-SHA reviewer worktrees were detached. Historical tags had not moved, no Migration `0020+` existed, and the 251-line RR2 report was read in full with the exact expected SHA-256.

Round 3 changes only the residual `inspectWorkbookContainer` XML namespace and complete OPC Content Types proof, its necessary harmless regression tests, and this report. It does not change Product/Revision concurrency, Import orchestration, Upload/Finalize/Recovery/Cleanup, schema, Migration, UI, feature flags, SEO, Inquiry, provider configuration, or Stage 4 scope.

### Linear commits after the RR2 Candidate

1. `679d4818a6d44fe58579fbbd96c0ee823e4eb8f4` — `fix: prove workbook package namespaces`
2. `58d7b4a3d49c744ed40b7896903c0ceea662f461` — `fix: type workbook package failures`
3. This report is committed separately in the required report-only commit. That commit SHA is the final Round 3 Candidate recorded in the Owner and independent-review handoffs.

No commit at or before `2135bfc3` was rebased, amended, squashed, or rewritten.

## 2. Finding dispositions

### CWT-S3-H02 — XML namespace and complete Content Types package proof

**Developer disposition: the reported residual boundary is remediated in this Candidate; awaiting independent Round 3 re-review. The Developer does not mark H02 Closed.**

**Implementation commits:** `679d4818a6d44fe58579fbbd96c0ee823e4eb8f4`, `58d7b4a3d49c744ed40b7896903c0ceea662f461`

#### Root cause

The RR2 package gate proved root spelling and enough structural shape through regular expressions, but it did not resolve XML namespace bindings. A lookalike `Types`, `Relationships`, `workbook`, or `worksheet` root with a wrong or missing namespace URI could therefore pass. The same gate consumed only `Override` declarations from `[Content_Types].xml`; it did not parse, normalize, de-duplicate, or prove the complete `Default` set. Duplicate or ambiguous Defaults could consequently reach the downstream workbook reader.

#### Correction

- `inspectWorkbookContainer` remains the single package authority before `read-excel-file`. The old root/tag and formula/dimension filename-oriented regular-expression authority was removed, not retained as a compatibility layer.
- One strict, bounded namespace-aware package XML reader now resolves element and attribute expanded names from in-scope namespace declarations. It consumes the already bounded XML entries only; no dependency, second workbook parser, persistent state, or external access was added.
- XML markup, declarations, names, attributes, entities, nesting, namespace declarations, duplicate expanded attributes, text placement, and document-root closure fail closed. Unknown underlying ZIP/parser errors are translated into one safe package error rather than exposing internal details.
- `[Content_Types].xml` root `Types` must resolve to `http://schemas.openxmlformats.org/package/2006/content-types`.
- `xl/_rels/workbook.xml.rels` root `Relationships` and each governed `Relationship` must resolve to `http://schemas.openxmlformats.org/package/2006/relationships`.
- `xl/workbook.xml` root `workbook`, governed `sheet` elements, and each relationship-resolved Products and `_CWT_META` worksheet root/evidence element must resolve to the supported transitional SpreadsheetML namespace `http://schemas.openxmlformats.org/spreadsheetml/2006/main`.
- The workbook relationship attribute is resolved by its transitional Office relationships namespace, not by the literal `r` prefix. Legal custom prefixes and the default namespace are semantically equivalent. Wrong, missing, unresolved, or reserved namespace bindings fail closed.
- Strict OOXML SpreadsheetML and worksheet relationship URIs remain explicitly unsupported at the package gate. The exact transitional worksheet relationship allowlist, normalized target resolution, duplicate ID/target protection, orphan relationship/part rejection, and external-target rejection remain the one topology contract.
- The complete Content Types declaration tree is consumed. Every direct declaration must be an in-namespace, attribute-complete, childless `Default` or `Override`; malformed, foreign-namespace, unknown, nested, or text-bearing declarations fail closed.
- Default extensions are XML-decoded, NFC-normalized, ASCII-validated, and case-normalized before uniqueness checks. The exact Template V1 set is `xml → application/xml` and `rels → application/vnd.openxmlformats-package.relationships+xml`. Missing, empty, illegal, unknown, wrong-content-type, exact duplicate, case duplicate, and entity-encoding duplicate forms fail closed.
- Override PartNames are XML-decoded and NFC/path normalized through the existing safe package-part rule. The fixed Template V1 workbook/sharedStrings/styles declarations and every relationship-resolved worksheet declaration must be exact. Missing, wrong, normalized duplicate, encoded duplicate, unreferenced, or unsupported Overrides fail closed.
- The governed worksheet type cannot be supplied ambiguously through a Default: `xml` retains the canonical generic XML type and every actual worksheet requires its exact worksheet Override. The relationship-resolved worksheet set and the consumed worksheet Override set must converge exactly.
- Formula, dimension, and cell-bound checks now consume the same namespace-aware tree for the actual Products and `_CWT_META` relationship targets. Cached formula values remain prohibited. A formula with any legal custom prefix but the supported SpreadsheetML URI is still attributed and rejected as formula evidence.
- Package failures now have the stable type `ProductImportWorkbookPackageError` and code `invalid_workbook_package`. Known gate messages come only from a bounded safe allowlist; unknown container/parser details become `Workbook package could not be validated safely.`

#### Regression evidence

`src/imports/workbook.test.ts` now contains 21 test cases and covers:

- wrong and missing namespace URIs on `[Content_Types].xml`, workbook relationships, workbook, Products worksheet, and `_CWT_META` worksheet roots;
- strict SpreadsheetML rejection and wrong/missing namespaces on governed `Relationship`, `Default`, workbook `sheet`, and worksheet evidence elements;
- accepted default and custom-prefix representations of the same supported URIs, including prefixed `Default`, `Override`, `Relationship`, `sheet`, and formula elements;
- exact/case/entity-encoded duplicate Defaults, empty/illegal extensions, empty/wrong content types, missing required Defaults, unknown Defaults, conflicting generic XML/worksheet types, and missing fixed Overrides;
- normalized entity-encoded duplicate Overrides, unknown/unconsumed Overrides, malformed/nested declarations, and existing missing/wrong/duplicate worksheet Overrides;
- canonical Template V1, renamed Products formula/dimension, relationship-resolved `_CWT_META` formula, exact transitional relationship Type, strict/forged relationship rejection, duplicate relationship ID/target, orphan relationship/part, and incomplete topology;
- macro, external, encrypted, malformed/truncated, normalized duplicate package part, entry-count, expanded-size, actual-byte, row-count, formula, dimension, and cell-bound limits;
- typed stable package error identity and safe unknown-container fallback.

All fixtures are local, synthetic, non-executable consistency mutations. No external target, malicious payload, production data, or credential was used.

#### Known limitations / Owner Decision

No Owner Decision, ADR, dependency, schema, Migration, or second authority was required. Template V1 continues to support only the explicit transitional OOXML contract; strict OOXML remains rejected. H02 remains subject to the original Independent Joint Review task's Round 3 disposition.

If that review does not mark H02 Closed, its remediation failure count becomes 3. This Developer task must stop: it does not authorize Round 4, split/renamed Finding identity, or avoidance of the Technical Failure Analyst and Version/Rollback Manager escalation.

### CWT-S3-H01 — Closed finding regression preservation

**Developer disposition: RR2 closure behavior preserved; no Product/Revision implementation changed.**

- `src/catalog/product-service.ts`, `src/imports/service.ts`, Published Revision tests, and Import item/Audit behavior were not modified.
- Final full Vitest and PostgreSQL 18.4 retained different-field merge, different additive media merge, deterministic same-field `product_revision_conflict`, latest-pending retry, one unified pending Revision, six successful item Audits, and approved public isolation.
- PostgreSQL final evidence remained: different fields `applied,applied`; different media `applied,applied`; Gallery orders `0/1`; same-field conflict followed by `applied,applied` retry; approved Applications/media `0/1`.

This report does not reopen, rewrite, or independently re-close H01.

### CWT-S3-H03 — Closed finding regression preservation

**Developer disposition: RR2 closure behavior preserved; no Upload/Recovery implementation changed.**

- No Upload Intent/Batch, scan, Finalize, Variant, Manifest, Recovery, Cleanup, retention, JSONB binding, Folder/ZIP route, or operator resume/cancel source changed.
- No post-Finalize `createValidatedProductImport` path, second Upload/Finalize authority, Worker, Queue, new Lease authority, or new persistent state was introduced.
- Final PostgreSQL and browser evidence retained Batch-first Folder/ZIP ownership, same-token response-loss replay, active/expired lease fencing, reload/resume/cancel, cleanup/expiry, and no duplicate Asset/Variant/relation.
- PostgreSQL final evidence remained: JSONB binding count/declarations `2/2`; expired lease attempted/completed `1/1`; retained-media expiry `1`, failed Batch `1`, cleanup attempted/completed/dead `7/7/0`; Variants `12`; final idle/waiting/advisory locks `0/0/0`.

This report does not reopen, rewrite, or independently re-close H03.

## 3. Complete changed-file and invariant impact

Round 3 implementation changes exactly two files across the two implementation commits. This report is the only file in the final report-only commit.

| Area | Files | Invariant impact |
| --- | --- | --- |
| OOXML package authority | `src/imports/workbook.ts` | Replaces prefix/text regex authority with one namespace-aware package tree; proves exact supported namespaces, complete Default/Override topology, formula/dimension/cell evidence, and typed safe failures before the downstream reader. Template V1 business fields are unchanged. |
| H02 regression evidence | `src/imports/workbook.test.ts` | Adds harmless namespace, Content Types normalization/conflict, custom-prefix, typed-error, archive-safety, and resource-limit regressions while retaining all RR2 topology tests. |

The committed RR2-to-Round-3 implementation diff is 557 insertions and 97 deletions across those two files. No dependency or lockfile changed. No Product, Revision, Import orchestration, Upload, Recovery, database, Migration, feature flag, UI, public bundle dependency, SEO/URL, Publish/Index, rights/facts, Inquiry, or provider source changed.

## 4. Migration and historical identities

| Artifact | SHA-256 |
| --- | --- |
| `drizzle/0019_needy_slyde.sql` | `ea8d51f971fe160bcded1f588645db0e0f6f16d704eff34fa38350fb5d1314ed` |
| `drizzle/meta/0019_snapshot.json` | `46b68b39c738b03f9f69aee5574a4626c425afa497b1a1d60531f1efed94c5c9` |
| `drizzle/meta/_journal.json` | `1ecf43a8d0fd625457bf3677c174f6b8ea2e6bf2b49daf5f7d3a660392690c09` |
| Sorted historical tag mapping | `d488448f6c8e65115f7b0ef00c6ca7a4784228eb4122ab97f7441c51b5299ce5` |

The complete RR2-to-Round-3 diff under `drizzle/` is empty. `0000–0018` and `0019` are unchanged, no `0020+` exists, the two-table `0019` authority is unchanged, and the tag mapping matches the prior correction identities.

## 5. Final verification evidence at source HEAD `58d7b4a3d49c744ed40b7896903c0ceea662f461`

| Gate / command | Exact final result |
| --- | --- |
| Environment | Node `v24.14.0`, macOS arm64; Sharp `0.35.3`, Lightning CSS, and Next SWC loaded; runtime check passed. |
| H02 focused | `pnpm exec vitest run src/imports/workbook.test.ts`: **1/1 file, 21/21 tests passed**. |
| `pnpm lint` | Passed with `--max-warnings=0`. |
| `pnpm typecheck` | Passed. |
| `pnpm exec drizzle-kit check` | Passed: `Everything's fine`. |
| `git diff 2135bfc3..HEAD --check` | Passed. |
| `pnpm test:run` | Final run: **92/92 files, 344/344 tests passed** in 228.58s. |
| PostgreSQL 18.4 | Final fresh isolated Stage 3 Fresh/Upgrade/concurrency/Revision/Audit/Import/Recovery matrix passed. |
| `pnpm build` | Final isolated migrated/seeded production build compiled, typechecked, and generated **43/43** static page units. |
| `pnpm check:bundle` | Passed across 23 public page manifests and 31 referenced manifest/chunk files. |
| `pnpm audit --prod` | **No known vulnerabilities found.** |
| `CI=1 pnpm exec playwright test --retries=0` | Final run: **47/47 passed** in 1.6m across Desktop Chromium and Pixel 7. |
| Test hygiene | No added focused/skip marker, retry, lowered threshold, disabled test, dependency, or governance allowlist change. |

### PostgreSQL 18.4 final matrix

The final verifier used a new disposable local `postgres:18.4` container with `APP_ENV=test`, `DATABASE_DRIVER=postgres`, `CWT_POSTGRES_VALIDATION=stage3-isolated`, and `NODE_OPTIONS=--conditions=react-server`. It created and dropped randomized Fresh and Upgrade databases.

- Identity: PostgreSQL 18.4 Debian aarch64, 64-bit.
- Fresh `0000 → 0019`, repeat/no-op, and representative `0018 → 0019`: passed; migration rows/latest `20/20`.
- Catalog: two Import tables, 45 constraints, 9 foreign keys, 8 indexes.
- Required Audit rollback/retry: Product count `0 → 1`.
- Same fingerprint: one Batch. Concurrent Apply: one Product and one Product-Asset relation. Product Code contention: one Product with item statuses `applied,error`.
- H01 Published concurrency: different fields `applied,applied`; different media `applied,applied`; same-field typed conflict; retry `applied,applied`; two unique Gallery media at orders `0/1`; six item Audits; approved Applications/media `0/1`.
- H03: same durable archive package/children on same-token replay; exact JSONB bindings `2/2`; active lease rejected; expired lease attempted/completed `1/1`; no duplicate child Assets; Variant count `12`; Import cleanup attempted/completed `1/1`; retained cleanup attempted/completed/dead `7/7/0`.
- Final idle-in-transaction, waiting, and advisory lock counts: `0/0/0`.

PostgreSQL emitted only the existing deterministic identifier-truncation and repeat-migration notices. No database assertion failed.

### Browser, responsive, accessibility, and runtime evidence

The final zero-retry Playwright run retained all 47 tests across Desktop Chromium and Pixel 7. It covered template/upload/validation/preview/Apply/partial success/correction/retry/cancel/error export, actual browser folder selection, same-Intent workbook response loss, Folder response loss with reload/history resume, ZIP child response loss and explicit cancel, authorization, and H03 durable identity.

The established 320/375/390/768/1024/1440 matrices passed. Axe Critical/Serious remained 0. Captured console, page, and hydration errors remained 0. H01 Published pending Revision and frozen public SEO/URL/media regressions passed. Playwright emitted only the established `NO_COLOR`/`FORCE_COLOR` harness warning; retries were explicitly zero.

## 6. First failures and harness observations

All final product gates are Green. First failures and non-product harness issues were retained:

1. The first read-only canonical-package probe used top-level `await` under the local `tsx` CJS output mode and failed before application code ran. Wrapping only the temporary probe removed that harness error.
2. The second canonical probe imported the server-only template module from a raw CLI context and was rejected by the intended `server-only` guard. A direct invocation of the already locked workbook writer generated the same canonical two-sheet package for inspection; no source was changed for the probe.
3. The first resource-limit focused run passed 19/20; its duplicate-part fixture never reached the parser because ZipWriter rejected adding an exact duplicate name. The harmless fixture was corrected to use byte-distinct NFC-equivalent names, which the product package normalizer must reject. The rerun passed 20/20.
4. The first static check after adding resource fixtures found one `exactOptionalPropertyTypes` error because the test helper explicitly supplied `options: undefined`. The helper now omits the optional field when absent. Product code and runtime assertions had passed; the rerun passed typecheck.
5. The first isolated build command was rejected before process creation by the local command safety policy because its cleanup trap contained recursive deletion. No gate ran. The replacement used a precise temporary root and moved it intact to Trash on success.
6. The typed package-error requirement was identified during final delivery review after the first full gate set. It was added as the separate linear commit `58d7b4a`; all required final gates, including full Vitest, PostgreSQL, build/bundle/audit, and zero-retry Playwright, were rerun at that final source HEAD.
7. PostgreSQL produced only historical identifier-truncation and repeat/no-op notices. Playwright produced only its established color-environment warning.

No application assertion failed after the H02 implementation. No test was weakened, removed, skipped, focused, or retried; no threshold, parser contract, archive limit, or security gate was lowered to obtain a pass.

## 7. Technical debt, external validation, and Owner confirmation

### Known limitations

- Product Import remains feature-flagged and default OFF.
- Transitional OOXML is the only accepted Template V1 package contract; strict OOXML is deliberately rejected.
- The bounded package XML reader intentionally rejects XML features not needed by the generated Template V1, including DTDs, entities, CDATA, comments, and non-declaration processing instructions.
- H01 Published changes still require existing authorized human Revision approval. Template V1 media remains additive-only.
- The PostgreSQL verifier requires the established `react-server` Node condition because it imports server-only Domain Services.

### External validation

- No Production/Staging database, bucket, secret, scanner, provider, deployment, DNS, or formal Product/media data was contacted.
- Synthetic fixtures establish no CloudWave Textile product, supply, facility, certification, capacity, rights, or other business fact.
- Formal Product Status remains **Waiting for Real Product Data Validation**.
- Production Ready remains **No**.
- Stage 4 remains **Planned / Deferred and not authorized**.

### Owner confirmation

Inquiry convergence remains **Owner Confirmation Required** and is outside this correction. No new Owner Decision or ADR was required because the correction remains inside Template V1, the existing workbook authority, and the unchanged two-table `0019` boundary.

## 8. Cleanup and handoff

Both disposable PostgreSQL 18.4 containers and all verifier databases were removed. The preliminary isolated build root `/private/tmp/cwt-stage3-r3-build.hMjcMp` and final root `/private/tmp/cwt-stage3-r3-final-build.JtoFKx` were moved intact and recoverably to `/Users/calvin/.Trash/cwt-stage3-r3-build.hMjcMp` and `/Users/calvin/.Trash/cwt-stage3-r3-final-build.JtoFKx`. Playwright's isolated data roots were handled by its existing global teardown. Repository `.data`, storage roots, workspace root, historical tags, source branch, and uncertain targets were not deleted.

At report creation, both implementation commits are clean and this report is the only file awaiting its report-only commit. After that commit, the expected worktree/index/ordinary-untracked state is clean.

No Tag / Push / Deploy / Production / formal data / Fresh Acceptance / Accepted and Frozen / Stage 4 action was performed.

Project Owner next step: verify the final Round 3 Candidate and this report, then return the unchanged `CWT-S3-H02` identity and failure history to the original Independent Joint Review task `019fd8b7-aed0-7ce2-9177-20f1ac937f8c`. The reviewer alone determines whether H02 is Closed and whether H01/H03 remain Closed. If H02 is not Closed, the failure count becomes 3 and this Developer task stops; the Project Owner then starts the required Technical Failure Analyst and Version/Rollback Manager evaluation. No Round 4 is authorized.
