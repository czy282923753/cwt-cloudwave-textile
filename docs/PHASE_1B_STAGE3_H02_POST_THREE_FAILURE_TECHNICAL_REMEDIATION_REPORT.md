# CWT Stage 3 H02 Post-Three-Failure Technical Remediation Report

Date: 2026-08-07

Developer conclusion: **the approved Option B technical remediation is implemented and verified at source Candidate `97f9333bf7644d498481d7d47401f6e2adc4a43c`; ready for Project Owner handoff, Version Manager certification, and a newly created independent review.**

This is a Developer remediation report only. It does **not** declare `CWT-S3-H02` Closed, Stage 3 Accepted/Frozen, Production Ready, Fresh Acceptance, or authorization for Stage 4.

## 1. Fixed identity, status, and source-control boundary

| Item | Evidence |
| --- | --- |
| Formal task | `CWT Stage 3 H02 Post-Three-Failure Technical Remediation` |
| Owner task | `019fd59b-dcbd-77c2-afc0-842b6ecac6f3` |
| Dedicated branch | `codex/phase-1b-stage3-h02-post-escalation` |
| Exact starting point | `7dbefdca3b6ac8a4d387d8c4cbb8dff58717e255` |
| Source Candidate | `97f9333bf7644d498481d7d47401f6e2adc4a43c` |
| Original continuation branch | `codex/phase-1b-stage3-product-import-continuation` remains exactly `7dbefdca3b6ac8a4d387d8c4cbb8dff58717e255` |
| RR2 reference | `2135bfc3a50a81f17733ec67f02ce2a8eea9cfe0` was logic-design reference only; it was not restored or used as the Candidate |

The dedicated branch was attached only after rechecking the clean detached worktree, exact refs, worktree ownership, Writer state, and absence of persistent Git locks. The implementation is a linear forward history from `7dbefdc`. No history, tag, or original continuation ref was moved, reset, rebased, amended, or rewritten.

### Linear commits after the fixed starting point

1. `62252dadc73065f0ce9e8fc8788210800f6ae59f` — `fix: replace product import workbook authority`
2. `97f9333bf7644d498481d7d47401f6e2adc4a43c` — `test: assert safe workbook limit alert`
3. This report is committed separately as the required report-only commit. Its SHA is the final handoff Candidate recorded in the Owner notification; it does not change the verified source Candidate.

### Stage and Finding identity

| Identity | Handoff state |
| --- | --- |
| Stage 3 | Authorized and In Progress; not Accepted/Frozen |
| Stage 4 | Planned / Deferred; not authorized |
| Production Ready | No |
| Formal Product Status | Waiting for Real Product Data Validation |
| Inquiry convergence | Owner Confirmation Required |
| `CWT-S3-H01` | Closed; historical remediation failure count 1; mechanism unchanged |
| `CWT-S3-H02` | Partially Closed; remediation failure count 3; awaiting independent disposition |
| `CWT-S3-H03` | Closed; failure count 0; mechanism unchanged |
| New Finding | No Developer-raised new Finding; independent review remains authoritative |

## 2. Three-failure root cause and Option B convergence

The three failed H02 corrections shared one causal defect: workbook acceptance and Product-row extraction were not owned by one end-to-end semantic authority. Earlier corrections progressively strengthened an explicit package validator, but original workbook bytes were still passed to `read-excel-file`, which independently resolved relationships, worksheet parts, formulas, and cell values with different namespace semantics. RR3 also added a handwritten generic XML tree and recursive descendant traversal without the frozen event-time structural budget. Patching another observed mutation would have retained dual interpretation and repeated the systemic failure.

The implemented Option B replaces that boundary with one composed authority:

```text
XLSX bytes
  -> bounded @zip.js container index and actual decompressed entry reads
  -> one saxes namespace-aware event stream and shared package budget
  -> narrow Content Types / RELS / workbook / shared strings / styles / worksheet state machines
  -> one resolved two-sheet Template V1 package model
  -> existing parseRow field normalization
```

The same resolved model now supplies package topology, relationship targets, sheet identity, formula evidence, dimensions, cell coordinates, styles, shared strings, and returned cell values. No accepted original or canonicalized bytes are handed to another workbook parser.

### Replaced and deleted authorities

- Removed the runtime `read-excel-file` import and call.
- Removed direct `read-excel-file@9.3.4` dependency.
- Deleted the RR3 generic `PackageXmlElement` tree, namespace-map cloning, `parsePackageXml`, recursive `xmlDescendants*`, and related duplicated tree interpretation.
- Added no fallback, literal-prefix adapter, canonicalization layer, second parser, feature flag, catch-only path, local dependency fork, or vendored parser.
- `parseProductImportWorkbook()` remains the single public workbook entry and preserves the existing Template V1 field normalization and Row Error behavior.

## 3. Narrow OOXML state machines and safety semantics

`src/imports/workbook-xml.ts` contains the event adapter and part-specific machines; it is not a generic DOM or general OOXML object graph.

- Content Types requires the exact transitional Template V1 Default and Override declarations, normalized unique part names, and complete convergence with the relationship-resolved parts.
- Every consumed `.rels` part uses the transitional package relationships namespace, rejects duplicate IDs and external targets, and shares the same event budget.
- Workbook sheets are resolved by the expanded Office relationship attribute name, `{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id`; the literal prefix is never authority.
- Shared strings, styles, and both relationship-resolved worksheets have narrow topology checks. Duplicate or unattributable governed evidence fails closed.
- Formula cached values never become Product input. Safely attributable Products formulas retain `formula_not_allowed` Row Error evidence; metadata or unattributable formulas reject the package.
- Numeric, string, inline string, boolean, blank, error/date, style, cell-reference, dimension, row, and sheet bounds are interpreted only by this model.
- Legal transitional default/custom prefixes, nested prefix rebinding, and multiple prefixes for one URI are equivalent. Canonical and exact `office:id` workbooks return deeply equal parsed results.
- Strict OOXML namespaces/types, wrong/missing/unbound/reserved bindings, DTDs, entity declarations, external entity declarations, external relationships/resolution, unsupported processing instructions, comments, CDATA, malformed UTF-8/XML, encrypted packages, macros, external links, and incomplete/dangerous topology fail closed.
- Package/parser failures cross the stable `ProductImportWorkbookPackageError` boundary with `code = invalid_workbook_package`. Unknown dependency/container errors become a fixed safe message; no dependency stack or raw internal message reaches the operator.

## 4. Frozen event-time resource authority

One `WorkbookXmlBudget` is shared across every XML/RELS part actually consumed by the Template V1 authority. Counters are enforced as decompressed bytes and parser events arrive, before row/shared-string state is extended beyond a limit.

| Limit | Maximum and exact counting semantics |
| --- | --- |
| Depth | 32; document root is depth 1; 31/32 accepted, 33 rejected |
| Total start-elements/nodes | 20,000 across all consumed parts |
| Attributes per element | 32 lexical attributes, including namespace declarations |
| Total attributes | 20,000 across all consumed parts |
| Single attribute value | 4,096 decoded UTF-8 bytes |
| Logical text run | 32 KiB decoded UTF-8, accumulated across parser callbacks until an element boundary |
| Total decoded text | 8 MiB across all consumed parts, including whitespace |
| Actual XML/RELS source | 16 MiB actual decompressed bytes delivered to the parser; ZIP metadata is not authority |

`src/imports/workbook-limits.test.ts` proves below, exactly-at, and one-above for all eight limits. The logical text test deliberately splits one run across many parser writes. `src/imports/workbook.test.ts` additionally supplies one full XLSX above-limit typed rejection for each resource family. All above-limit paths return no partial row result, raw parser error, stack overflow, or out-of-memory behavior.

## 5. Dependency and supply-chain disposition

| Dependency evidence | Result |
| --- | --- |
| Direct production parser | Exact `saxes@6.0.0` |
| Parser production closure | `saxes@6.0.0 -> xmlchars@2.2.0`; one version of each |
| Licenses | `saxes` ISC; `xmlchars` MIT |
| Removed direct dependency | `read-excel-file@9.3.4` |
| Removed unused closure | `saxen@11.1.1`, `unzipper-esm@0.13.3`, `node-int64@0.4.0` |
| Retained independently used packages | `fflate@0.8.3` remains through `write-excel-file@4.1.1`; `graceful-fs@4.2.11` remains only through the development Tailwind/enhanced-resolve path |
| Frozen install | `pnpm install --frozen-lockfile` passed |
| Production audit | `pnpm audit --prod`: no known vulnerabilities |

Static repository proof found no production `read-excel-file`, `readExcelFile`, `PackageXmlElement`, `parsePackageXml`, or `xmlDescendants*` path. The lockfile contains only the approved `saxes/xmlchars` parser closure.

## 6. Complete changed-file and invariant impact

The two source commits change 12 files: 1,582 insertions and 563 deletions from `7dbefdc` to `97f9333`. This report is the only file in the final report-only commit.

| Area | Files | Impact |
| --- | --- | --- |
| Single OOXML authority | `src/imports/workbook-xml.ts`, `src/imports/workbook.ts` | Adds the bounded event adapter/resolved package model and removes the generic tree plus downstream workbook reader |
| Frozen limits | `src/imports/contract.ts` | Adds only the eight Owner-approved structural constants; no Template version, field, row, or mode change |
| H02 evidence | `src/imports/workbook.test.ts`, `src/imports/workbook-limits.test.ts` | Retains historical matrix; adds prefix/deep-equivalence, golden cells, strict/dangerous XML, narrow topology, typed error, and all boundary tests |
| Integration evidence | `src/imports/service.integration.test.ts`, `scripts/verify-stage3-postgres.ts`, `tests/e2e/product-import.spec.ts` | Exercises actual `office:id` through Upload/Domain/PostgreSQL/browser paths and an above-limit safe browser failure |
| Dependency convergence | `package.json`, `pnpm-lock.yaml` | Exact direct parser addition and obsolete reader closure removal |
| Owner-approved contract record | `docs/PRODUCT_IMPORT_TEMPLATE_V1.md`, `docs/PHASE_1B_ACCEPTANCE_MATRIX.md` | Records only frozen values, counting semantics, below/at/above evidence, and typed failure contract |

No Product/Revision, Upload/Finalize/Recovery/Cleanup, Asset/storage, permissions, transaction/Audit, Publish/Index, SEO/URL/redirect, Inquiry, persistent coordination, Schema/Migration, ADR-0016, Template V1 business field/version/import semantics, formal data, or Stage 4 implementation changed.

## 7. H01 and H03 regression preservation

### `CWT-S3-H01`

No H01 Product/Revision mechanism was modified or redefined. The six-file focused regression, full Vitest, PostgreSQL 18.4, production build, and browser suite retain different-field and additive-media convergence, deterministic `product_revision_conflict`, latest-state retry, one pending Revision, six successful item Audits, and approved public Applications/media isolation. The Developer does not independently re-close H01.

### `CWT-S3-H03`

No H03 Upload Intent/Batch, scan, Finalize, Variant, Manifest, Recovery, Cleanup, retention, lease, JSONB binding, Folder/ZIP route, or operator resume/cancel mechanism was modified or redefined. Focused regressions, PostgreSQL, and browser evidence retain same-token durable identity, active/expired lease behavior, no duplicate Assets/Variants/relations, cleanup/expiry convergence, and reload/resume/cancel behavior. The Developer does not independently re-close H03.

## 8. Final verification at source Candidate `97f9333bf7644d498481d7d47401f6e2adc4a43c`

| Gate | Exact final result |
| --- | --- |
| Runtime | Node `v24.14.0`; pnpm `11.9.0` |
| H02 focused | Workbook, eight-limit, and service integration: 3/3 files, 38/38 tests passed |
| H01/H03 focused | Six historical integration files: 6/6 files, 29/29 tests passed |
| Lint | `eslint . --max-warnings=0` passed |
| Strict TypeScript | `tsc --noEmit` passed |
| Drizzle | `drizzle-kit check`: `Everything's fine` |
| Diff / history | `git diff --check` passed; linear merge-base is exact `7dbefdc`; continuation ref unchanged |
| Full Vitest | Final run: 93/93 files, 360/360 tests passed in 262.47s |
| PostgreSQL 18.4 | Final fresh isolated Stage 3 Fresh/Upgrade/concurrency/Revision/Audit/Import/Recovery matrix passed |
| Production build | Final isolated migrated/seeded build compiled, typechecked, and generated 43/43 static page units |
| Existing public-bundle gate | Passed across 23 public page manifests and 31 referenced manifest/chunk files |
| Parser/import public closure | `saxes`, `xmlchars`, `read-excel-file`, parser error strings, and Admin Product Import closure absent from the same 23/31 public files |
| Lock/license/audit | Frozen install passed; ISC/MIT parser licenses verified; production audit found no known vulnerabilities |
| Playwright | `CI=1 ... --retries=0`: final 48/48 passed in 1.8m across Desktop Chromium and Pixel 7 |
| Test hygiene | No skip/only, retry, threshold reduction, disabled test, governance allowlist, or contract weakening added |

### PostgreSQL 18.4 final matrix

The final verifier used a new disposable localhost `postgres:18.4` Debian aarch64 container with `APP_ENV=test`, `DATABASE_DRIVER=postgres`, `CWT_POSTGRES_VALIDATION=stage3-isolated`, and `NODE_OPTIONS=--conditions=react-server`. It generated the workbook with the custom `office:id` relationship prefix and created/dropped randomized Fresh and Upgrade databases.

- Fresh `0000 -> 0019`, repeat/no-op, and representative `0018 -> 0019`: migrations count/latest `20/20`.
- Import catalog: 2 tables, 45 constraints, 9 foreign keys, 8 indexes.
- Required Audit rollback/retry: Product count `0 -> 1`.
- Same fingerprint: one Batch; concurrent Apply: one Product and one Product-Asset relation; Product Code contention: one Product with `applied,error` item states.
- H01: different fields `applied,applied`; additive media `applied,applied`; same-field conflict `product_revision_conflict`; retry `applied,applied`; Gallery order `0/1`; six item Audits; approved Applications/media `0/1`.
- H03: JSONB bindings/declarations `2/2`; active lease rejected; expired lease attempted/completed `1/1`; Variants `12`; Import cleanup attempted/completed `1/1`; retained cleanup expired `1`, failed Batches `1`, attempted/completed/dead `7/7/0`.
- Final idle-in-transaction, waiting, and advisory locks: `0/0/0`.

Only the established identifier-truncation and repeat/no-op migration notices appeared; no database assertion failed.

### Browser, responsive, accessibility, and runtime evidence

The final zero-retry browser run includes an actual custom-`office:id` workbook through the real Upload Saga, preview, partial success, correction, Apply, and durable replay path. The above-limit workbook remains on the import index and shows the existing generic safe operator alert with no `TypeError`, parser name, stack, or `node_modules` disclosure. The complete suite retains Desktop/Pixel 7, 320/375/390/768/1024/1440 widths where applicable, Axe Critical/Serious zero, no captured console/page/hydration errors, H01 pending Revision/public isolation, and H03 Folder/ZIP response-loss recovery. The only output was the established `NO_COLOR`/`FORCE_COLOR` harness warning.

## 9. Preserved first failures and harness facts

All final required gates are Green. The following first failures were preserved rather than hidden:

1. Before direct installation, the compatibility probe could not resolve `saxes` from the application root because its prior transitive copy was not root-linked. Exact `saxes@6.0.0` was then added as the approved direct production dependency.
2. The exact `xmlns:office` plus `office:id` regression against the starting implementation failed with the raw downstream `TypeError: readFiles(...).then is not a function`, reproducing the third-failure dual-parser boundary before replacement.
3. The first lint after implementation found one unused compatibility-spike namespace constant; it was deleted, not suppressed.
4. The first above-limit integration assertion expected rejection during Batch validation, but the existing Upload completion boundary correctly rejected the workbook earlier with typed `invalid_workbook_package`. The test now proves that earlier safe boundary.
5. The first six-file H01/H03 focused run passed four files/seven tests but two unchanged H03 suites stopped at a new low-level `server-only` marker. The marker was removed from the parser layer rather than modifying H03 tests; existing server-only Domain Service ownership plus production public-bundle closure remain the isolation proof. Final result was 6/6 files and 29/29 tests.
6. One intermediate typecheck found an incomplete control-flow return around safe ZIP close translation; the adapter now always returns a resolved model or throws the typed safe package error.
7. The first ordinary production build compiled and typechecked, then failed prerender because the default local PGlite root lacked `system_settings`. A new isolated root was migrated and seeded with synthetic fixtures; the fixed-Candidate build passed 43/43.
8. The first zero-retry full Playwright run passed 47/48. The new safe-error assertion matched both the visible business alert and Next's empty route announcer and incorrectly expected internal limit detail. It was narrowed to the visible business alert and the established generic safe message; focused rerun passed 1/1 and the final full run passed 48/48 with retries still zero.
9. Two optional read-only evidence probes had command-only errors: an unsupported Vitest reporter name and one malformed ad hoc JavaScript regex. Neither changed product/test code or counted as a passed gate; the repository-default reporter and corrected read-only bundle scan subsequently passed.

No failing product assertion was hidden, no test or threshold was weakened, and every source-affecting correction was followed by the risk-proportionate final reruns at the fixed source Candidate.

## 10. Historical identities and cleanup

| Artifact | SHA-256 |
| --- | --- |
| `drizzle/0019_needy_slyde.sql` | `ea8d51f971fe160bcded1f588645db0e0f6f16d704eff34fa38350fb5d1314ed` |
| `drizzle/meta/0019_snapshot.json` | `46b68b39c738b03f9f69aee5574a4626c425afa497b1a1d60531f1efed94c5c9` |
| `drizzle/meta/_journal.json` | `1ecf43a8d0fd625457bf3677c174f6b8ea2e6bf2b49daf5f7d3a660392690c09` |

The complete `7dbefdc..97f9333` diff under `drizzle/` is empty; no `0020+` Migration exists. Both task-owned PostgreSQL 18.4 containers and all random verifier databases were removed. The isolated build root was moved intact and recoverably to `/Users/calvin/.Trash/cwt-stage3-h02-build.coUMzB`. Playwright handled its isolated data roots through the existing global teardown. The pre-existing unrelated PostgreSQL container remained running and untouched.

No Tag / Push / Merge / Deploy / Production / Staging / credential / formal data / Stage 4 action occurred.

## 11. Handoff boundary

At report creation, source Candidate `97f9333` is clean and this report is the only uncommitted file. After the report-only commit, the worktree and index must be clean. The Owner handoff records that final commit SHA, the complete linear chain, this report SHA-256, and the unchanged continuation ref.

Project Owner next steps are the authorized Version Manager certification and then JIT creation of a new Independent Reviewer. The Developer does not contact or assign the former reviewer and does not determine Finding closure or Stage acceptance.
