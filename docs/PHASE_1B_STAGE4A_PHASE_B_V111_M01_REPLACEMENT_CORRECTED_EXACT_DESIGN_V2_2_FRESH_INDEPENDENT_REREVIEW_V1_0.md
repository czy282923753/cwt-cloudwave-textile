# CWT Stage 4A Phase B — V111-M01 Replacement Corrected Exact Design V2.2 Fresh Independent Re-review V1.0

Review conclusion: **PASS**

Status: **COMPLETED / V2-M01 CLOSED AFTER REPLACEMENT-CYCLE CORRECTION ATTEMPT 2 / DESIGN GATE ELIGIBLE / IMPLEMENTATION NOT AUTHORIZED**

Date: `2026-08-11` (`Asia/Shanghai`)

## 1. Executive ruling

The exact Candidate at `156cbafc061d36ce2395529a3150b0c974f3c603` is accurate, bounded, deterministic and standalone-implementable for the Phase B Corrected Design Gate.

V2.2 closes the controlling V2.1 defect at the supported CLI boundary. The verifier compares the raw `--authority` value to the one canonical repo-relative POSIX string before Git discovery, path resolution, normalization, filesystem access or physical-identity inspection. The exact spelling passes. Thirty-one process-representable alternative spellings independently exercised through the real child-process CLI all exit `1`, emit `raw_authority_spelling_not_canonical`, and produce no success stdout. NUL cannot cross Node's process argument interface and is rejected before the verifier starts.

The previously closed V2.0 alternate-root, committed-membership, manifest, physical-injectivity, external-envelope and package-only-ineligibility protections remain closed. The exact V2.1 defect was independently reproduced, so this ruling does not rely on the author's capture or internal helper matrix.

Finding counts:

| Severity | Count |
| --- | ---: |
| Blocker | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |
| External Validation | 0 |

## 2. Exact Candidate and checkpoint

| Item | Independently verified value |
| --- | --- |
| Candidate full ref | `refs/heads/codex/phase-1b-stage4a-phase-b-v111-m01-replacement-design-remediation-v2` |
| HEAD | `156cbafc061d36ce2395529a3150b0c974f3c603` |
| parent | `626552c4b3eb2ef3f0dbeadddcf5202444102368` |
| tree | `00a2cf04c8834339f917ba67c05e719acb67108c` |
| formal worktree | clean and attached to the exact full ref |
| review snapshot | clean and detached at the exact HEAD |
| failed V2.1 ref | unchanged at `3d424821aab67c03c3b8ec02a62b5577044837c9` |
| pre-L3 checkpoint | unchanged at `3d424821aab67c03c3b8ec02a62b5577044837c9` |
| checkpoint record | direct one-path child `eca7843fa3ced513cc199514bbf5afad30dc5553`; tree `be9141a4062fe450b799222bc2c28c5407ef8a0e`; record SHA-256 `53da981a...` |
| frozen tag | object `1c626f9b788e4c6ed0480a7040aa54ccef3e6c76`; peel `31c0e405acfdd0d05200d0fb2531e897a541a2c4` |
| V2.2 scope | V2.1-to-HEAD: 27 added docs/evidence paths; V2.2 content commit: 15 added mode-`100644` blobs, comprising 14 payload members plus the sole manifest |
| prohibited changes | none: no source, config, test fixture, Schema, Migration, snapshot, journal, seed, ADR, package, lock, Product or public change |
| Candidate manifest | `14/14 PASS`; SHA-256 `44f9f7bb...` |
| controlling V2.1 FAIL package | byte-identical; Reviewer manifest `10/10 PASS` |

All prior checkpoint refs remained exact. The failed V1.12, V1.13 and V1.14 commits are non-ancestors. Both V2.1-to-HEAD and the V2.2 content range pass `git diff --check` with exit `0`; no symlink or non-blob Candidate entry was introduced.

## 3. V2-M01 decisive disposition

### 3.1 Prior defect reproduction

On an immutable disposable V2.1 snapshot, the supported CLI continued to accept the exact spelling, `./` spelling, duplicate slash and absolute realpath with exit `0` and the same output SHA-256 `012fb82a...`. This independently preserves the causal identity of the controlling finding.

### 3.2 Raw boundary and ordering

On exact V2.2, the one canonical authority spelling passes package-only with exit `0`, output SHA-256 `a7dff9ae...`, and `acceptanceEligible=false`.

The Reviewer passed 31 alternative strings through actual spawned verifier processes, including absolute realpath, multiple dot and dot-dot forms, duplicate/trailing slash, backslash, percent forms, case changes, NFD, full-width and division slash, zero-width and bidi controls, whitespace controls, tilde/home/env-like strings, file URL, empty and unnamed lookalikes. Every representable alternative exited `1` with the exact diagnostic `raw_authority_spelling_not_canonical` and empty stdout. A NUL-bearing argument was rejected by Node with `ERR_INVALID_ARG_VALUE` before child-process invocation.

Ordering was independently established without relying only on source inspection: from a non-Git directory, an invalid alias stopped at `raw_authority_spelling_not_canonical`, while the canonical spelling passed that boundary and then failed at Git discovery. Static inspection independently confirmed that raw equality precedes `findRepoRoot`, `path.resolve`, `path.relative`, `realpath`, `lstat`, `stat`, Unicode normalization and case folding.

The checked-in proof matrix actually spawns the CLI child process. Reviewer mutations that restored resolve-before-validation or reduced proof to helper-only logic changed the sealed verifier role and failed closed.

### 3.3 Retained closure

| Contract | Fresh result |
| --- | --- |
| ignored copy, ignored hard-link, ignored resealed root | rejected `3/3` at the raw boundary |
| visible/case/symlink/alternate authority paths | rejected; only the exact canonical string can reach package loading |
| manifest root missing/duplicate/wrong hash/reorder | committed variants rejected `4/4` with exact manifest diagnostics |
| root mode/membership | committed `100755` and missing-root variants rejected |
| index/worktree drift | staged and unstaged root drift rejected separately |
| moved ref/wrong attachment/dirty state | rejected |
| physical injectivity | 19 current package/checkpoint/manifest paths are regular, non-symlink and have 19 distinct device/inode identities; alias mutations reject |
| one current authority | one canonical root, one verifier role, one sole manifest root entry, no Candidate-current envelope |
| package-only gate | always not independently acceptance eligible |
| Markdown/legacy paths | no Markdown authority, dual/fallback loader, alias allowlist or V2.1 current-loader edge |

### 3.4 External envelope

The Reviewer created a new post-commit external envelope only after verifying the exact Candidate. File SHA-256 is `d48a2d9a...`; JCS SHA-256 is `aea5b1f08...`. It binds the canonical authority role/path/file/JCS hashes and exact ref, HEAD, parent, tree, cleanliness, attachment policy and Reviewer provenance.

Attached exact-full-ref and detached exact-HEAD full review both exited `0`. After removing only the documented attachment diagnostic, their semantic payloads are byte-equivalent. All 16 leaves were independently changed: 14 authority/Git/schema/policy leaves rejected; the two intentionally descriptive provenance strings remained valid but changed the recorded envelope JCS/output evidence, proving consumption without converting description into acceptance authority.

Disposition: **V2-M01 CLOSED after replacement-cycle correction attempt 2.** The replacement `V111-M01.one-fail-closed-executable-authority` root is closed. No replacement-cycle attempt 3 and no further Max escalation are indicated by this review.

## 4. REMEDIATION_FINDINGS_REVIEW

The complete remediation series was reviewed before making any decision about broader review scope. This table records every closure class asserted by the V2.2 derivation audit and proof matrix, not only the latest raw-spelling symptom.

| Claimed remediation closure | Independent disposition | Decisive evidence |
| --- | --- | --- |
| current raw CLI spelling / real-entry defect | **PASS / CLOSED** | exact positive plus 31 process-representable negatives through spawned real CLI; NUL process-boundary negative; non-Git-cwd ordering proof; resolve-before-validation and helper-only mutations killed |
| V2.0 ignored/untracked exact copy | **PASS / remains CLOSED** | Fresh ignored `.next` copy rejected before semantic consumption |
| V2.0 ignored/untracked hard-link | **PASS / remains CLOSED** | Fresh hard-link to exact root rejected at raw path boundary |
| V2.0 self-consistently resealed alternate root | **PASS / remains CLOSED** | Fresh altered/resealed root rejected before its semantic seal can matter |
| visible/tracked/case/symlink alternate authority | **PASS / remains CLOSED** | raw variants reject; canonical-path symlink and coordinated alternate path cannot pass current binding |
| exact `HEAD` root membership | **PASS / remains CLOSED** | exact case-sensitive path, mode `100644`, HEAD blob, index and worktree equality; committed missing/wrong-mode plus staged/unstaged drift reject |
| sole manifest join | **PASS / remains CLOSED** | sole fixed manifest `14/14`; committed missing/duplicate/wrong-hash/reordered root cases reject with exact diagnostics |
| global physical identity injectivity | **PASS / remains CLOSED** | 19 regular non-symlink paths / 19 unique device-inode pairs; root/profile hard-link and root symlink variants reject |
| external envelope consumption/cross-binding | **PASS / remains CLOSED** | new Reviewer-owned envelope; attached/detached full review; 16/16 leaves consumed; 14 authority/Git leaves reject and two descriptive leaves alter recorded evidence |
| Git ref/HEAD/tree/parent/clean/attachment closure | **PASS / remains CLOSED** | exact envelope binding; moved ref, wrong attachment, dirty state and identity leaf changes reject |
| one closed canonical structured root | **PASS / remains CLOSED** | duplicate-aware parser, closed 14-key schema, exact role/cardinality/path/hash/JCS/DAG checks; root/subject hashes independently recomputed |
| Markdown presentation independence | **PASS / remains CLOSED** | verifier has no Markdown read/parse/dataflow edge; five CommonMark witnesses remain positive without adding a machine role |
| dual/fallback/compatibility authority removal | **PASS / remains CLOSED** | one root, one verifier, one manifest; no Candidate-current envelope, V2.0/V2.1 loader fallback, alias allowlist, helper-only authority path, generated pointer, second seal or Markdown authority |
| package-only non-acceptance | **PASS / remains CLOSED** | exact package-only result says `acceptanceEligible=false`; only full review consumes external post-commit envelope |
| deterministic attached/detached review | **PASS / remains CLOSED** | both real-CLI runs exit `0`; normalized semantic payload equal after the documented attachment diagnostic |
| proof-matrix closed families | **PASS** | all declared `10` positives, `91` negatives and `16` properties executed by the sealed verifier; Reviewer independently challenged each causal family above with additional unnamed variants rather than relying on the matrix alone |

No claimed remediation finding is open, superseded by a weaker mechanism or deferred to implementation.

## 5. FULL_REVIEW_NECESSITY

**NOT_REQUIRED.**

Rationale: V2.1-to-V2.2 is an additive docs/evidence-only correction to one already isolated CLI identity boundary. It introduces no source, runtime, Schema, Migration, ADR, dependency, package, lock, Product, public, SEO, URL or data change; does not alter the accepted V1.10/M02/M03/M04 values; and adds no architectural interaction or scope expansion. The complete remediation-closure review above, exact Candidate/checkpoint/evidence gates and mandatory frozen-boundary non-regression directly cover the changed risk. An unrelated exhaustive application review would add no evidence about this correction and would violate proportional review.

The checks in Sections 2, 4 and 6 remain mandatory gates; they are not treated as optional or as an unrelated full review.

## 6. Mandatory non-regression

- canonical root file SHA-256 `9e532330...`, canonical JCS-plus-LF bytes, authority JCS `5a8d15ea...`, subject seal and closed 14-key root schema independently recomputed;
- Max analysis manifest `12/12`, V1.10 manifest `35/35`, V1.10 independent manifest `7/7`, Candidate `14/14` and controlling V2.1 Reviewer `10/10` verified;
- accepted V1.10, M02 A-08 successor, M03 discriminated seam and M04 V3.1 source Git objects equal the embedded selected authorities `4/4` by file SHA and JCS value;
- `ai_model_config` independently extracted and ordered equal `21/21`; `ai_runs` independently extracted and ordered equal `96/96`;
- M02/M03/M04/NM01 and closed NH01/M01/M03/M05/L01/L02 contracts did not regress;
- Provider-neutral, Draft-only, four-use-case, exact-empty Production Provider/Prompt, no fallback/RAG/vision/customer-support/private-data and Phase B/C/D/E boundaries remain unchanged;
- no second config, run, queue, Prompt, Provider, current-authority or acceptance authority was introduced.

Full application tests, Next lifecycle and builds were proportionately omitted. This Candidate is docs/evidence-only, and dependency-free exact Git/schema/JCS verification plus real-CLI, envelope, manifest and physical-identity fault injection directly covers the changed boundary.

## 7. Process compliance

- runtime: Node `24.14.0`, V8 `13.6.233.17-node.41`, ICU `78.2`, Unicode `17.0`, CLDR `48.0`, `darwin arm64`;
- package manager, install, materialization, download, registry, network, Provider, API and credential actions: zero;
- all mutations were confined to disposable local clones made from local Git objects;
- Candidate bytes, HEAD, tree, branch ref and both formal/detached clean states remained unchanged.

Reviewer process disclosure: the first run of the final Reviewer-only committed-membership probe addressed its disposable clone using a noncanonical path spelling; the verifier's own main-module guard therefore did not run, producing empty exit `0`. The probe was corrected only in the Reviewer evidence to call the clone by realpath and rerun. A separate first restore attempt also demonstrated Git's refusal to overwrite intentional disposable mutations. Neither event touched the Candidate or contributes to the PASS; all reported committed-membership results are from the corrected genuine CLI run.

## 8. Impact and eligibility

| Area | Ruling |
| --- | --- |
| Schema / Migration | none |
| ADR / Owner decision | none required |
| dependency / package / lock | none |
| Complexity Approval | none |
| Product / public / SEO / URL / data | none |
| Provider / network / credentials | none and unauthorized |
| Design Gate eligibility | **YES, for exact V2.2 only** |
| implementation eligibility | **NO** until Coordinator accepts the Design Gate and a later explicit implementation task is authorized |

## 9. Next gate

The only next gate is Coordinator acceptance of exact V2.2 as the corrected Phase B Design Gate. A later implementation must be a separately authorized task. This review does not accept the gate on the Coordinator's behalf, implement code, merge, Push, call a Provider or start Phase C/D/E.
