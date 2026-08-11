# CWT Stage 4A Phase B — V111-M01 Replacement Corrected Design V2.1 Independent Re-review Evidence

Status: **FRESH REVIEW COMPLETE / CANDIDATE READ-ONLY / ONE SAME-ROOT FINDING OPEN**

Date: `2026-08-11` (`Asia/Shanghai`)

## 1. Isolation and process

- Formal Candidate: `/Users/calvin/.codex/worktrees/c883/CWT（CloudWave Textile）项目`, clean and attached to the exact full V2.1 ref.
- Independent exact snapshot: `/tmp/cwt-v21-review.TzREPS/candidate`, clean and detached at `3d424821aab67c03c3b8ec02a62b5577044837c9`.
- Independent V2.0 reproduction snapshot: `/tmp/cwt-v21-review.TzREPS/v20`, detached at `4b626fc9278f4c49957ecf165d7d5c5fc4058dca`.
- Reviewer package: `/Users/calvin/.codex/worktrees/2a07/CWT（CloudWave Textile）项目/docs/review-evidence/phase-1b-stage4a-phase-b-independent-v111-m01-replacement-corrected-design-rereview-v2-1/`.
- Runtime: `/Users/calvin/.nvm/versions/node/v24.14.0/bin/node`; V8 `13.6.233.17-node.41`; ICU `78.2`; Unicode `17.0`; `darwin arm64`.
- Package manager, install, materialization, download, registry, network, Provider, API and credential actions: zero.
- Candidate files were never edited. All mutation work occurred in disposable local clones created with `git clone --no-hardlinks` from local Git objects.

Reviewer process disclosure: the first execution of the Reviewer-owned clone challenge used the non-realpath clone spelling under macOS `/tmp`; the verifier's `invokedAsMain` comparison therefore produced an empty exit `0`. The Reviewer corrected only the Reviewer-owned script to call the clone through `fs.realpathSync`. The next run correctly executed but exposed absent local checkpoint refs in the clone. The final run installed only the already verified local checkpoint refs with `git update-ref` inside the disposable clone. All reported results below come from that final genuine execution. Neither exception changed Candidate bytes or is counted as a Candidate finding.

## 2. Identity, history and byte evidence

The exact ref, HEAD `3d424821...`, parent `ac080b1d...`, tree `2feaecc...`, failed V2.0 ref, remediation checkpoint, checkpoint record, three-parent linear chain, frozen tag and formal attachment all matched. The checkpoint record is the one-path direct child `3c387781...`; its record SHA-256 is `24c59acc...`.

The V2.1 content commit adds exactly 14 mode-`100644` docs/evidence paths. It changes no source, config, test fixture, Schema, Migration, snapshot, journal, seed, ADR, package or lock file and adds no symlink. V1.12, V1.13 and V1.14 are non-ancestors.

All supplied V2.1 artifact hashes matched. The sole Candidate manifest passed `13/13`. The prior independent FAIL package remained byte-identical and passed `9/9`.

Independent canonical recomputation:

- root file SHA-256: `c2040ed884c2f6b0765e8d01aa510d61d8f4cae0912dcc97796883e10815fad1`;
- root canonical bytes: true, RFC-8785-compatible JCS plus one LF;
- authority JCS SHA-256: `927b4956cacf1f59749b8cc6d0066b25251c37dbe601415bc4757d30be69147e`;
- subject JCS SHA-256: `48e4891f6ae3a2c03542b180f412d324674df66dc1653e0d37a42048bd2787af`;
- top-level key count: `14`.

The checkpoint commit and V2.1-owned content commit each pass `git diff --check`. The full V2.0-to-V2.1 range truthfully exits `2` only for the two immutable imported Reviewer EOF blank-line diagnostics at report line 115 and evidence line 59.

## 3. Baseline and prior-root reproduction

The Reviewer-owned external envelope was created only after exact V2.1 identity verification. Its JCS SHA-256 is `0092881553987df6ab32073ebe9a577719b4ab4f1dd4c62e05530374ddc63f99`.

- package-only: exit `0`, `acceptanceEligible=false`, `10/65/14`;
- attached exact full-ref: exit `0`;
- detached exact HEAD: exit `0`;
- all 16 envelope leaves challenged: 14 rejected; the two descriptive provenance strings changed the recorded envelope JCS evidence;
- historical V2.0 Reviewer envelope: rejected and has zero current edge.

The controlling V2.0 defect was independently reproduced before testing the correction. On exact V2.0, ignored copied root, ignored hard-link root and ignored self-consistently resealed altered root each exited `0`. On exact V2.1, all three exit `1` with `authority-path-not-canonical`.

V2.1 also rejected visible dirty state, moved ref, wrong symbolic attachment, staged root drift, unstaged root drift, manifest drift and the imported historical envelope. Committed manifest mutations—missing root, duplicate root, wrong root hash and reordered entries—each rejected at the appropriate boundary.

## 4. Decisive Fresh finding evidence

Design §§17–19 require the one accepted `--authority` argument to be the exact closed repo-relative POSIX path and explicitly state that absolute, dot, dot-dot and duplicate-slash spellings fail closed.

The actual entry boundary at verifier lines 1121–1128 instead performs:

1. `path.resolve(authorityArgument)`;
2. `path.relative(repoRoot, argumentAbsolute)`; and only then
3. `validateExactAuthorityPath(lexicalPath)`.

This erases the forbidden spelling before it reaches `validateRepoPath`. In a Fresh disposable exact V2.1 clone, these five package-only invocations all emitted the byte-identical author capture SHA `012fb82a...` and exit `0`:

1. exact repo-relative path;
2. `./`-prefixed path;
3. a `..` cancellation inside the package path;
4. duplicate slash after `docs/`; and
5. the exact canonical absolute realpath.

Backslash, percent, case-only and NFD variants correctly rejected.

The author matrix does not exercise the real CLI boundary for the four accepted aliases. Its `path-absolute`, `path-dot`, `path-dot-dot` and `path-duplicate-slash` cases call `validateRepoPath` directly with synthetic strings. The property `exact-canonical-authority-path` calls `validateExactAuthorityPath(AUTHORITY_PATH)` only with the already canonical positive. Thus `10/65/14` is internally green while the supported CLI contradicts the normative path contract.

This does not restore the V2.0 ability to select different bytes: all accepted aliases resolve to the exact tracked root, whose HEAD/index/worktree/manifest joins remain effective. It nevertheless leaves the same one-fail-closed-current-authority identity root open and makes the Candidate's exact-path proof false.

## 5. Non-regression evidence

- `ai_model_config`: independent SQL extraction `21/21`, ordered equal, order hash `9a1e4a7...`.
- `ai_runs`: independent SQL extraction `96/96`, ordered equal, order hash `413824f3...`.
- accepted V1.10, M02 A-08, M03 V2.2 and M04 V3.1 source Git-object hashes equal the embedded selected values `4/4`.
- Markdown has no executable parser/dataflow edge; legacy subject/identity/pointer/second-seal mechanisms are absent from the current verifier.
- M02/M03/M04/NM01 and closed NH01/M01/M03/M05/L01/L02 dispositions did not regress.
- Provider-neutral, Draft-only, four-use-case, empty Production Provider/Prompt, no fallback/RAG/vision/customer-support/private-data and Phase B/C/D/E boundaries did not change.

Full application Build/tests were not run. This is a docs-only authority-boundary review, and dependency-free verifier, exact Git-object inspection, schema extraction and adversarial CLI/Git/manifest tests directly cover the changed risk.

## 6. Evidence ruling

The V2.1 correction successfully joins the consumed bytes to the exact tracked root, index, worktree, sole manifest and physical identity set. However, its supported CLI still accepts four forbidden path spellings because normalization precedes validation, while its proof matrix tests only a lower-level helper. `V2-M01` therefore remains **OPEN after replacement-cycle correction attempt 1** under the same `V111-M01.one-fail-closed-executable-authority` root.

No Schema, Migration, ADR, dependency, package, lock, Complexity Approval, Product, public, SEO, URL, data, Provider or Owner decision is required to address this exact design defect.
