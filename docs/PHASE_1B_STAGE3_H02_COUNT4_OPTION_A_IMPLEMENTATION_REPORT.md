# CWT Phase 1B Stage 3 H02 Count4 — Option A Implementation Report

**Report date:** 2026-08-07

**Project Owner task:** `019fd59b-dcbd-77c2-afc0-842b6ecac6f3`

**Implementation branch:** `codex/phase-1b-stage3-h02-option-a-implementation`

**Fixed base:** `dd550b365de0d074613e238e6e349c98a49ca797`

**Implementation HEAD at report preparation:** `4f3265f28cc16c519ecfa76fded06d20fd54d78e`

**Report-only handoff commit:** pending explicit Owner authorization

## 1. Executive disposition

Option A has been implemented within the Owner-frozen boundary and verified against the authorized quality matrix. The implementation places one pure lexical, bounded, pre-forward resource meter before `saxes@6.0.0`, uses one shared budget across all consumed XML/RELS parts, and removes the competing post-saxes resource-counting authority. `saxes` remains the only XML/OOXML semantic authority, and accepted semantic values continue to originate only from its events.

The implementation and test history is linear from the fixed base:

1. `294898e3fd27e73b6bf51cb8056d626e3abbd4c2` — `test: reproduce Option A pre-forward XML limits`
2. `4f3265f28cc16c519ecfa76fded06d20fd54d78e` — `fix: enforce workbook XML limits before saxes`
3. Report-only handoff commit — not yet created; Owner authorization required

This is a Developer implementation report, not an independent acceptance decision. It does **not** declare H02 Closed, Review Passed, Stage 3 Accepted/Frozen, or Production Ready. Reviewer and Fresh Acceptance remain HOLD. Version Manager remains HOLD.

## 2. Formal project status preserved

- Stage 1: Accepted and Frozen.
- Stage 2 and Stage 2 SEO Remediation: Accepted and Frozen.
- Stage 3: Authorized and In Progress; not Accepted or Frozen.
- Stage 4 and later: Planned / Deferred.
- Production Ready: No.
- Formal Product Status: Waiting for Real Product Data Validation.
- Inquiry convergence: Owner Confirmation Required.
- H01: Closed, historical failure count 1; regression-only in this task.
- H02: Partially Closed, failure count 4; the existing Finding identity and history were preserved.
- H03: Closed, count 0, New Findings 0; regression-only in this task.
- Product Import default: OFF.
- Reviewer `019fda32-c085-7b90-aa70-325f4380d415`: HOLD; no Developer contact or premature development-process disclosure.
- Fresh Acceptance: HOLD.
- Version Manager: HOLD; not invoked.

No new Product Finding is declared by this report. Platform, permission, network, dependency-state, command-progress, and read-only evidence-harness interruptions listed below are not Product Findings and do not change the H02 count.

## 3. Authority and evidence identities

The implementation was based on the frozen contracts and independent source inspection, not on inherited Developer pass claims.

| Evidence | Identity / disposition |
| --- | --- |
| Pre-implementation checkpoint branch gate | SHA-256 `6ef428ec9169413af3199d22b799637a32367afe96c68998bddaf53530e44ac8` |
| Count4 Technical Failure Analysis | SHA-256 `63fb8f38bd6d89391801db53a229361d6d063d620ff76bc384453c5b3d29c744` |
| Option A Node 24 Verification | SHA-256 `3622fc0de841e943d126505117b56c984c5bf934b2e4d015d48c520a87c67d0f`; feasibility evidence only |
| Original Option A spike | SHA-256 `2d2631d56f24b45522eab85a7119c948d33e0dbf93258ab3879c79dd93c6bd98`; reference only, no Pass inherited |
| Spike runtime correction | Its Section 3 said Node 24, but its first/final runtime was Node `25.8.1` |
| Stage 2 SEO tag object | `6b40fd078078fd762c3f5808cb0fb72e7e5b7622` |
| Stage 2 SEO peeled commit | `5624ca993e31a07d9c7e19a5504aa82b5aba92ff` |
| Migration 0019 SQL | SHA-256 `ea8d51f971fe160bcded1f588645db0e0f6f16d704eff34fa38350fb5d1314ed` |
| Migration 0019 snapshot | SHA-256 `46b68b39c738b03f9f69aee5574a4626c425afa497b1a1d60531f1efed94c5c9` |
| Migration 0019 journal | SHA-256 `1ecf43a8d0fd625457bf3677c174f6b8ea2e6bf2b49daf5f7d3a660392690c09` |

Root `AGENTS.md`, `docs/ENGINEERING_GOVERNANCE.md`, `docs/REVIEW_POLICY.md`, ADR-0016, Product Import Template V1, Stage 3 acceptance/implementation/review evidence, and the applicable frozen contracts remained governing authorities. No ADR change was required because the implementation did not change the frozen architecture or product contract.

## 4. Root cause and implemented correction

The common Count4 cause was enforcement timing and authority placement: resource values derived only after content had already entered the semantic parser could reject the package while still allowing the offending decoded code point or subchunk to be consumed or retained by `saxes`; the source iterator could also be pulled beyond the exact point required by the frozen fail-closed contract.

Option A corrects that boundary as follows:

- `WorkbookXmlResourceMeter` performs only lexical XML resource accounting before forwarding source to `saxes`.
- `WorkbookXmlResourceBudget` is created once per package parse and shared by every consumed XML/RELS part.
- Input is decoded and scanned in bounded subchunks of at most 64 KiB.
- Safe source is forwarded unchanged; the meter does not canonicalize, reserialize, reconstruct, or create an accepted value/model.
- The offending decoded code point or closing subchunk is rejected before it is forwarded.
- After rejection, the current parser is discarded and the next source chunk is not requested.
- Existing typed package failure remains `ProductImportWorkbookPackageError` / `invalid_workbook_package`; no partial row or model is returned and raw internal parser errors are not exposed.
- Namespace, OOXML, worksheet, relationship, row, and business meaning remain in the existing narrow namespace-aware `saxes` state machines.
- Namespace declarations count as lexical attributes; semantic matching continues by expanded name.
- DTD/entity declarations, external entities/relationships, unsupported processing instructions, dangerous or incomplete packages, and non-strict OOXML remain fail closed through the existing semantic path.

The new mechanism replaces, rather than layers over, the old path. Candidate post-saxes attribute, text, source, and related resource counters were deleted. There is no second budget or second semantic parser.

## 5. Frozen eight-limit contract

| Resource | Frozen limit | Implemented timing and coverage |
| --- | ---: | --- |
| XML depth | 32, root = 1 | Lexical start/end tracking; below/exact/above |
| Start-elements | 20,000 | Shared package total; below/exact/above and cross-part accumulation |
| Attributes per element | 32 | Namespace declarations included; below/exact/above |
| Total attributes | 20,000 | Shared package total; below/exact/above and cross-part accumulation |
| Single attribute value | 4,096 decoded UTF-8 bytes | Literal/entity decoding accounted before forward; below/exact/above, including 4-byte edge |
| Logical text run | 32 KiB | Maintained across source/parser callback boundaries; below/exact/above |
| Total decoded text | 8 MiB | Shared package total; below/exact/above and cross-part accumulation |
| All consumed XML/RELS source | 16 MiB actual decompressed bytes | Shared package total; +1 rejected before decode/forward and before sentinel pull |

Additional contract behavior was fixed in executable tests:

- UTF-8 1-, 2-, 3-, and 4-byte code points, including a four-byte code point split after byte 1, 2, and 3.
- Cross-chunk attribute values, text runs, entity references, CR/LF normalization, and package-part totals.
- Five predefined named entities through a fixed candidate/DFA state.
- Decimal and hexadecimal numeric references with O(1) radix, digit, saturation, and invalid state.
- Arbitrarily many numeric-reference leading zeros remain legal; decimal and hexadecimal cases exceeded 96 KiB and crossed the 64 KiB scan boundary.
- No complete attribute, text, or entity token cache is introduced.
- No ninth raw entity-token-length limit is introduced.
- Safe raw prefixes of incomplete cross-chunk entity references may be forwarded unchanged.
- A subchunk containing `;` is completely scanned before forwarding; a closing subchunk that would exceed decoded budget is withheld as a whole.
- Literal attribute TAB/LF/CR/CRLF matches XML/`saxes` normalization; a literal CRLF, including one split across chunks, counts as one space.
- Numeric CR/LF references preserve their referenced code points and do not participate in literal CRLF merging.
- Attribute-value +1, logical-text +1, entity-closing +1, and source +1 stop at the offending input and do not request a later sentinel chunk.
- Canonical and custom namespace prefixes remain semantically equivalent through existing expanded-name handling.

## 6. Explicitly absent mechanisms and changes

The implementation does not contain or require:

- a fallback parser or second semantic parser;
- `saxes` private fields or private APIs;
- a fork or patch of `saxes`;
- canonicalization, reserialization, prefix reconstruction, or a prefix-compatibility layer;
- a second resource authority or second package budget;
- full attribute/text/entity token buffering;
- a raw entity-token length restriction;
- rejection of otherwise legal numeric references only because they contain long leading-zero sequences;
- changes to Template V1, ADR-0016, Schema/Migrations, SEO/URL/Redirect behavior, Asset/storage boundaries, permissions, Product/Revision/Publish/Index behavior, transactions, Audit, persistent coordination, Inquiry, or UI;
- changes to H01 or H03 mechanisms;
- a dependency-version or lockfile change.

## 7. Source and commit scope

The two implementation commits contain only the approved code/test scope:

| Commit | Files | Change summary |
| --- | --- | --- |
| `294898e3fd27e73b6bf51cb8056d626e3abbd4c2` | `src/imports/workbook-limits.test.ts` | 67 insertions; test-only pre-forward pull-count reproduction |
| `4f3265f28cc16c519ecfa76fded06d20fd54d78e` | `src/imports/workbook-xml-resource-meter.ts`, `src/imports/workbook-xml-resource-meter.test.ts`, `src/imports/workbook-xml.ts` | 813 insertions, 92 deletions; new meter, direct tests, and replacement integration |

Across the two commits: 880 insertions and 92 deletions in four approved import files. The first implementation commit has the fixed base as its only direct parent; the second has the test-only commit as its only direct parent. No merge, rebase, history rewrite, dependency change, schema change, documentation change, or unrelated feature change is present in those two commits.

This report is the only planned third-commit file.

## 8. Reproduction and focused verification

The frozen failure timing was first committed as tests before implementation.

### 8.1 Red reproduction

- 11 tests executed.
- 8 existing tests passed.
- The 3 new pre-forward pull-count tests failed for the expected reason only:
  - attribute-value case: actual 3 reads, expected 2;
  - logical-text case: actual 4 reads, expected 3;
  - entity-closing case: actual 5 reads, expected 4.
- These expected red tests were evidence of the pre-existing timing gap, not three new Product Findings.

### 8.2 Green focused suites

- Lexical resource meter: 18/18 passed.
- Workbook limit integration: 11/11 passed.
- Workbook/package/service focused regression set: 30/30 passed.
- Focused total: 59/59 passed.
- No skip, only, retry, threshold reduction, or strictness reduction was introduced.

The focused matrix includes all eight below/exact/above edges, shared totals across parts, Unicode width and chunk boundaries, literal/numeric whitespace, long-leading-zero entities, withheld offending closers, no-next-pull sentinels, namespace declarations, canonical/custom prefixes, and the historical H02 security matrix.

## 9. Static and repository quality gates

Runtime identity for formal verification:

- Node.js `v24.14.0`, Darwin arm64.
- pnpm `11.9.0`.

Results:

- Affected-file lint: passed.
- Strict TypeScript typecheck: passed.
- Full lint: passed.
- Full typecheck: passed.
- Drizzle schema check: passed (`Everything's fine`).
- Full Vitest: 94/94 files, 381/381 tests, 235.16 seconds, explicit `--retry=0`.
- No migration 0020 or later was added; 0019 identities did not change.
- Diff/test hygiene checks passed for the implementation commits.

The first full-Vitest observation window showed only the runner start marker for 30 seconds. Under the registered long-no-output protocol, work stopped and Owner authorized one continuation of the same session. It then completed naturally with the result above. There was no second Vitest attempt.

## 10. PostgreSQL 18.4 validation

The Owner-provided initial Docker snapshot identified one protected, pre-existing environment:

- Container: `cwt-validation-stage2c-20260802-pg184`
- Image identity: `3a82e1f56c8f`
- Existing host port: `127.0.0.1:55435 -> 5432`
- Status at snapshot: Up 5 days

That container, database, port, volume, and network were not used or modified.

A single task-owned disposable PostgreSQL 18.4 container was used:

- Container: `cwt-h02-option-a-55f6-pg184-20260807-a1`
- Image: PostgreSQL 18.4, matching the authorized image identity
- Host binding: `127.0.0.1:61552 -> 5432`
- Credentials/database: conspicuously synthetic and task-specific

The existing validation harness completed the authorized matrix:

- Fresh migration 0000 through 0019.
- Repeat/no-op migration behavior.
- Representative 0018 through 0019 upgrade.
- Migration count/latest: 20/20.
- Catalog: 2 tables, 45 constraints, 9 foreign keys, and 8 indexes in the migration verifier scope.
- 0019 SQL/snapshot/journal identities matched the fixed hashes.
- Required Audit rollback and atomicity.
- H01 Product/Revision concurrency, Product Code contention, same-field conflict, different-field/additive-media convergence, retry, gallery ordering, item Audit, and public approved-revision isolation.
- H03 import token durability, JSONB declaration preservation, active-lease rejection, expired-attempt completion/recovery, no duplicate child Assets/variants, cleanup, replay, retained failure, and dead-row checks.
- Final database locks: idle 0, waiting 0, advisory 0.

Observed historical identifier-truncation and repeat/no-op notices were expected harness notices, not failures. After successful verification, only the exact task-owned container was stopped and removed. A read-only post-check showed it absent. The protected pre-existing container was not touched.

The Developer's initial Docker process-list read was permission denied. Owner classified that as a system/permission interruption, supplied the authoritative snapshot, and authorized the narrowly scoped elevated task-container operations. It was not a Product Finding.

## 11. Isolated Production Build and public closure

One task-owned isolated build root was used and remains preserved pending Owner cleanup authorization:

`/private/tmp/cwt-h02-option-a-55f6-build.gyQnhb`

Results in that root:

- Migrations through 0019: passed with fixed identities.
- Core seed: passed; one conspicuously synthetic user.
- Synthetic fixtures: passed; 12 conspicuously synthetic products.
- Readiness verification: passed. It reported users 1, authors 1, feature flags 5, products 12, with the expected readiness/Asset/eligibility/historical counters at zero.
- Production Build: passed; compile, TypeScript, page-data collection, and 43/43 static outputs completed.
- Official public bundle closure gate: passed; 23 public manifests and 31 closure files.
- Supplemental read-only parser/import closure probe: the same 23 manifests and 31 closure files, 8 fixed forbidden terms, 0 hits.

The public closure contained no `saxes`, `xmlchars`, `read-excel-file`, `ProductImportWorkbookPackageError`, `invalid_workbook_package` internal parser implementation string, or Admin Product Import/parser dependency closure.

The first isolated migration command was blocked before application migration logic by a sandbox `tsx` IPC `listen EPERM`. Owner authorized one elevated retry with the exact same root, environment, Node/pnpm identity, and command; it completed successfully. The first core-seed observation window and the first `db:verify` observation window had no effective output within their declared windows; Owner authorized one continuation of each same live handle, and both completed naturally with exit 0. No second seed or verification command was started.

The first supplemental closure probe had an invalid JavaScript regular-expression construction and stopped with `SyntaxError: Invalid regular expression flags` before reading or asserting against any build file. Owner authorized one exact read-only correction limited to the escaping defect; the unchanged scan scope and forbidden-term set then passed with 0 hits. The formal Production Build and official bundle gate were not rerun and were not invalidated by the probe harness error.

## 12. Dependency, license, audit, and browser evidence

### 12.1 Frozen dependency closure

- `saxes@6.0.0` remains the only XML semantic parser authority.
- Exact production closure: project -> `saxes@6.0.0` -> `xmlchars@2.2.0`.
- `saxes@6.0.0` license: ISC.
- `xmlchars@2.2.0` license: MIT.
- No old `read-excel-file` / `readExcelFile` source, lockfile, or production-tree path remains.
- `pnpm audit --prod`: `No known vulnerabilities found`.

The first read-only production-tree query failed with `[ERR_SQLITE_ERROR] unable to open database file` while pnpm attempted to read the project-external task store index. Owner classified this as a store-read permission interruption and authorized one elevated retry of the identical command. The retry completed and produced the exact two-package production closure above. No store repair, reinstall, or alternate query was used.

### 12.2 Playwright

The single authorized Playwright attempt completed:

- 48/48 passed.
- Duration: 1.6 minutes.
- Desktop and Mobile projects covered.
- CLI retries: 0.
- Failures: 0.
- Skips: 0.
- Retries: 0.
- Existing responsive widths include 320, 375, 390, 768, 1024, and 1440.
- Axe critical/serious violations: 0.
- Browser console/page/hydration errors: 0 under the existing gate.
- H01/H03 and public-isolation behavior remained regression coverage; their mechanisms were not changed.

The run emitted only the existing `NO_COLOR` / `FORCE_COLOR` warnings.

At Playwright startup, `pnpm exec` automatically recreated the worktree's `node_modules`, reporting 526 packages reused, 0 downloaded, and running the existing `unrs-resolver` postinstall. This was not a second explicit install command, but it was treated as a material dependency/environment state event and not assumed to be valid merely because downloads were zero. Owner authorized continuation of the same Playwright session. After natural exit 0, package, lock, virtual-store lock, exact parser loads, production closure, Git identity, refs, Writer identity, and locks were audited before Playwright was counted Green.

Post-run identities:

- `package.json` SHA-256: `31e8a1698e6abe68e0f78d2118448ef8bdede0e98df9460764e791302e2c2379`
- `pnpm-lock.yaml` SHA-256: `678bfa9f9c12d4bc56adfb9a5ea0bad543c32cff3c28a0e07642fb23fe0a3c4c`
- Virtual-store lock SHA-256: `678bfa9f9c12d4bc56adfb9a5ea0bad543c32cff3c28a0e07642fb23fe0a3c4c`
- `node_modules/.modules.yaml` SHA-256: `7f84b0e553c02cf5f411856a539869061acddee3db4b836d5d100eacdcba85ac`

Exact Node 24 loading after recreation resolved `saxes@6.0.0` and `xmlchars@2.2.0`, and a namespace-aware parse produced the expected expanded root `{ local: "r", uri: "urn:cwt:post-playwright" }`.

Owner then directly completed the final read-only `.modules.yaml` identity audit:

- `hoistPattern`: present at line 1393.
- `layoutVersion`: 5.
- `nodeLinker`: `isolated`.
- `packageManager`: `pnpm@11.9.0`.
- `storeDir`: `/Users/calvin/Library/pnpm/store/v11`; directory exists.
- `virtualStoreDir`: `.pnpm`; `node_modules/.pnpm` exists.
- `virtualStoreDirMaxLength`: 120.

Owner concluded this metadata/store identity was consistent with the fixed package/lock/virtual-lock, exact parser loads, and production tree, and formally counted Playwright Green.

Two Developer metadata extraction attempts did not change any file and did not weaken this evidence:

1. The first `rg` field query did not match because its indentation pattern was wrong.
2. The Owner-authorized single Node/YAML metadata extraction over-escaped `\s` and exited with `Required store identity is missing` despite the fields being present.

Owner classified both as read-only evidence-harness errors, not Product Findings or H02 failures, and completed the successful direct audit recorded above.

## 13. Install recovery and preserved evidence

The first frozen dependency-install attempt encountered `ENOTFOUND` during the package manager's network retry. Under the long-no-output and environment-interruption protocol, no second command or alternative mode was started. The original execution-cell handle was later unavailable; Owner-authorized audits established that no install process remained and that `node_modules` plus the project-local `.pnpm-store` were incomplete.

The initially authorized macOS Trash recovery path could not be read because of macOS permissions. No move was attempted. Owner replaced that target with one exact, recoverable, project-external isolation root:

`/Users/calvin/.codex/cwt-h02-option-a-55f6-incomplete-install-20260807-attempt1`

The incomplete directories were moved there as `node_modules` and `pnpm-store` without copying, deleting, following symlinks, or touching other paths.

A fresh task-owned install root was then created outside the project:

`/Users/calvin/.codex/cwt-h02-option-a-install.RsexQ4`

The one newly authorized network install used its `store` subdirectory and the exact command contract `pnpm install --frozen-lockfile --store-dir <task-owned-root>/store`. It completed naturally in 8.2 seconds with 526/526 packages, exact Node `v24.14.0` and pnpm `11.9.0`, and no package, lockfile, source, ref, or Git identity change.

The incomplete-install recovery root and task-owned install root remain preserved pending an exact Owner cleanup instruction.

## 14. Chronological governance and interruption log

Every abnormal condition stopped later dependent work until the exact Owner responded. No silent retry, alternate command, threshold reduction, or environment workaround was used.

1. Initial takeover found the worktree detached instead of attached to the dedicated branch. Owner authorized one exact non-destructive branch attachment; the fixed HEAD/ref, clean state, locks, protected branch, and single Writer then passed the full takeover gate.
2. The first dependency install encountered `ENOTFOUND`. Owner authorized bounded continuation/audits; the execution handle was later unavailable, and incomplete install state was preserved. This was a network/environment interruption.
3. The macOS Trash pre-move check was permission blocked. Owner authorized the exact project-external recovery root; no Trash access was retried.
4. The fresh external-store frozen install completed successfully.
5. The three test-only pull-count failures were the expected red reproduction, not new Product failures.
6. The first `git add` handle produced abnormal long-no-output. Owner authorized one bounded wait of the same cell; it completed exit 0, after which the exact staged diff and fixed parent were verified before the test-only commit.
7. Full Vitest initially produced only the runner start marker for 30 seconds. Owner authorized one bounded continuation of the same session; it completed 94/94 files and 381/381 tests.
8. Docker process-list access was permission denied. Owner supplied the read-only environment snapshot and authorized only the task-owned PostgreSQL container operations.
9. The isolated build's first migration attempt hit `tsx` IPC `listen EPERM` before application logic. Owner authorized one elevated retry in the same root/environment; it passed.
10. Core seed's first observation window had no effective output. Owner authorized one continuation of the same cell; it passed.
11. `db:verify`'s first observation window had no effective output. Owner authorized one continuation of the same cell; it passed.
12. The first supplemental closure probe failed at temporary-harness parse time with an invalid RegExp. Owner authorized one escaping-only correction; the unchanged probe passed with zero hits.
13. The first read-only `pnpm list` hit a task-store SQLite read-permission error. Owner authorized one elevated retry of the identical query; it passed.
14. `pnpm exec` automatically recreated `node_modules` before Playwright (526 reused, 0 downloaded). Owner authorized continuation of the same session; Playwright passed, and the dependency/Git post-audit was completed.
15. The first Developer `.modules.yaml` field extraction failed to match because of an indentation regex error.
16. The second, Owner-authorized Developer metadata extraction over-escaped its whitespace pattern and reported a false evidence gap. Owner directly completed the read-only metadata audit and declared the evidence consistent.
17. Stopping the task-owned PostgreSQL container emitted a Docker deprecation warning for the timeout option but succeeded; removal and absence checks passed.

All platform/system/environment events above left the Candidate without a known product-impacting mutation and do not change H02 failure count 4.

## 15. Security and product invariants

Verification preserved the relevant historical boundaries:

- Published Revision, concurrent edits, required Audit rollback, and public approved-revision isolation.
- Upload/Finalize/Manifest/Recovery/Cleanup/lease/replay/no-duplicate behavior.
- Strict namespace-aware OOXML relationship and row semantics.
- External relationships/entities, DTD/entity declarations, unsupported processing instructions, and malformed/incomplete packages fail closed.
- Public/Admin bundle isolation and parser closure exclusion.
- Product Import remains default OFF.
- No production data, formal customer/product import, production credentials, deployment, DNS change, tag, push, or external-provider mutation occurred.

## 16. Handoff and cleanup state

Developer conclusion: the frozen Option A implementation is present in the two linear implementation commits and the authorized verification matrix is Green. The Candidate is ready for Owner identity/content verification and a later independent review handoff. This conclusion does not substitute for Reviewer acceptance and does not close H02.

At report preparation, these evidence roots are deliberately retained and must not be removed, moved, or modified before the Owner supplies the exact final cleanup boundary:

- Isolated build root: `/private/tmp/cwt-h02-option-a-55f6-build.gyQnhb`
- Playwright evidence and current dependency state in the task worktree
- Task-owned install root: `/Users/calvin/.codex/cwt-h02-option-a-install.RsexQ4`
- Incomplete-install recovery root: `/Users/calvin/.codex/cwt-h02-option-a-55f6-incomplete-install-20260807-attempt1`

The task-owned PostgreSQL container has already been safely stopped and removed; no other container was changed.

The report-only third commit and final cleanup remain pending explicit Owner authorization. Reviewer contact, Fresh Acceptance, Version Manager action, H02 closure, Stage 3 acceptance/freeze, and any Production Ready statement remain outside Developer authority.
