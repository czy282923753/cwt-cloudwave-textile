# CWT Stage 4A Phase B — V111-M01 Replacement Corrected Design V2.2 Independent Re-review Evidence

Status: **FRESH REVIEW COMPLETE / PASS / V2-M01 CLOSED AFTER REPLACEMENT-CYCLE CORRECTION ATTEMPT 2**

Date: `2026-08-11` (`Asia/Shanghai`)

## 1. Isolation and method

- Formal Candidate: `/Users/calvin/.codex/worktrees/c883/CWT（CloudWave Textile）项目`, clean and attached to the exact V2.2 full ref.
- Independent snapshot: `/tmp/cwt-v22-independent-review.KJKTNd`, clean and detached at exact `156cbafc061d36ce2395529a3150b0c974f3c603`.
- Reviewer evidence: `/Users/calvin/.codex/worktrees/2a07/CWT（CloudWave Textile）项目/docs/review-evidence/phase-1b-stage4a-phase-b-independent-v111-m01-replacement-corrected-design-rereview-v2-2/`.
- Runtime: pinned Node `24.14.0`; V8 `13.6.233.17-node.41`; ICU `78.2`; Unicode `17.0`; CLDR `48.0`; `darwin arm64`.
- Package manager, install, materialization, download, registry, network, Provider, API and credential actions: zero.
- Candidate files were never edited. Mutation probes used disposable local clones with `git clone --no-hardlinks`.

The complete root `AGENTS.md`, Engineering Governance, Review Policy, ADR-0018, V2.2 standalone Design, derivation audit, README, canonical root, technical profile, proof matrix, verifier, controlling V2.1 FAIL report/evidence/challenge/output and material accepted source/schema authorities were read and independently checked.

## 2. Identity and immutable evidence

The exact full ref, HEAD `156cbafc...`, parent `626552c4...`, tree `00a2cf04...`, V2.1 failed ref, direct three-commit chain, pre-L3 checkpoint, record direct-child/one-path shape, all prior checkpoints and frozen tag matched. Formal attachment and clean state, plus detached clean snapshot, passed both before and after review.

Scope results:

- V2.1-to-HEAD: 27 added docs/evidence paths;
- V2.2 content commit: 15 added mode-`100644` blobs, exactly 14 payload members plus the sole manifest;
- disallowed paths: zero;
- symlinks: zero;
- V2.1-to-HEAD and content-commit `git diff --check`: exit `0`;
- failed V1.12/V1.13/V1.14 commits: non-ancestors.

Hash and manifest results:

- Design `acbb32e6...`; audit `de6f06bd...`;
- Candidate manifest `44f9f7bb...`, `14/14 PASS`;
- root file `9e532330...`; authority JCS `5a8d15ea...`;
- profile `dce9f0c0...`; matrix `7234c069...`; verifier `b2672388...`;
- author CLI/identity/mutation/package captures all matched their fixed hashes;
- controlling V2.1 FAIL files remained exact and its Reviewer manifest `7a6ff778...` passed `10/10`;
- Max analysis `12/12`, V1.10 `35/35` and V1.10 independent `7/7` passed.

## 3. Actual CLI proof

The Reviewer-owned `REVIEWER_FRESH_REAL_CLI_CHALLENGE_V2_2.mjs` invokes the exact verifier through spawned Node child processes. It does not import verifier helpers.

### Baseline

- canonical package-only: exit `0`; stdout SHA `a7dff9ae...`; `acceptanceEligible=false`;
- detached full review: exit `0`; stdout SHA `94420f63...`;
- attached full review: exit `0`; stdout SHA `ce20eff7...`;
- attached/detached normalized semantic equality: true.

### Causal reproduction

On exact V2.1, exact, `./`, duplicate slash and canonical absolute realpath all exit `0` and emit the same output SHA `012fb82a...`. This is a direct real-CLI reproduction of the controlling defect.

### V2.2 alternative strings

Thirty-one representable alternatives were exercised. They include absolute, dot, dot-dot, duplicate/trailing slash, backslash, percent, case, Unicode normalization/lookalike/control, whitespace, tilde/home/env, file URL, empty and unnamed suffix cases. Every case:

- spawned a real child process;
- exited `1`;
- reported `raw_authority_spelling_not_canonical`;
- emitted empty stdout.

NUL was rejected before process invocation with `ERR_INVALID_ARG_VALUE`. From a non-Git directory, the invalid alias stopped at the raw boundary; the canonical spelling passed that boundary and failed later at Git discovery. This dynamically proves the required validation order.

Ignored copy, ignored hard-link and ignored self-consistently resealed root were rejected `3/3` by the same raw boundary. Resolve-before-validation and helper-only verifier mutations changed the sealed current verifier role and rejected.

## 4. Envelope and Git closure

The new Reviewer-owned post-commit envelope is `CANDIDATE_REVIEW_ENVELOPE_V2_0.json`:

- file SHA-256: `d48a2d9a2eaf59cea53d1970cff1d35cc6b0d6a12e2bbfdc604816078d32fb58`;
- JCS SHA-256: `aea5b1f08fcdaf4313f5e1b7115f7ac9e78e264ceca6ff246cdad399b0b028fe`.

It binds exact root role/path/file/JCS, ref, HEAD, parent, tree, cleanliness, attachment policy and Reviewer provenance. All 16 leaves were changed. Fourteen authority/Git/policy/schema changes rejected; the two descriptive provenance changes passed but changed the recorded output/JCS hash, establishing their consumption without granting them authority.

Fresh Git/membership results:

- moved ref, wrong attachment and dirty state: rejected;
- staged root drift, unstaged root drift and manifest drift: rejected;
- root symlink and root/profile hard-link variants: rejected;
- committed manifest missing root, duplicate root, wrong root hash and reordered entries: rejected by both package and full-review modes;
- committed root mode `100755` and missing root: rejected;
- disposable mutation clones restored cleanly to the exact Candidate between cases.

The current physical identity set comprises 19 regular non-symlink paths with 19 unique device/inode pairs. The canonical package has one root, one verifier role, one manifest root entry and no Candidate-current review envelope.

## 5. REMEDIATION_FINDINGS_REVIEW evidence map

The review sequence first completed all remediation-closure checks:

1. **Raw CLI real entry — PASS:** causal V2.1 reproduction plus 31 V2.2 process negatives, NUL interface negative, dynamic order proof and two killed implementation-regression mutations.
2. **Ignored/untracked alternate roots — PASS:** exact copy, hard-link and resealed altered root reject before semantic load.
3. **Tracked-root membership — PASS:** fixed canonical path, `HEAD` mode/blob, index and worktree join; missing/mode/staged/unstaged cases reject.
4. **Sole manifest — PASS:** exact 14-entry manifest; missing, duplicate, wrong hash and order committed mutations reject.
5. **Physical identity — PASS:** 19/19 injective regular files; symlink/hard-link variants reject.
6. **External envelope — PASS:** new Reviewer envelope, attached/detached positives and every one of 16 leaves consumed/cross-bound.
7. **Git closure — PASS:** ref, target, HEAD, parent, tree, cleanliness and attachment mutations reject.
8. **Canonical root/schema/JCS/DAG — PASS:** duplicate-aware parse and closed-schema/cardinality/hash/role/path/DAG families execute; independent root/subject/hash recomputation matches.
9. **Markdown independence — PASS:** five CommonMark witnesses remain non-authoritative; source/dataflow inspection finds zero Markdown parser edge.
10. **Removed mechanisms — PASS:** no dual/fallback loader, alias allowlist, Candidate-current envelope, separate seal, generated pointer or helper-only acceptance route.
11. **Package/full-review separation — PASS:** package-only is explicitly ineligible; attached/detached external-envelope review is semantically equivalent.
12. **Entire proof contract — PASS:** sealed verifier executes all `10` positive, `91` negative and `16` property entries; Fresh Reviewer probes cover every causal closure family and add unnamed variants.

This completes remediation-closure review before broader-scope consideration.

## 6. FULL_REVIEW_NECESSITY

Decision: **NOT_REQUIRED**.

The correction is strictly docs/evidence-only and changes the raw CLI authority-entry proof without expanding architecture, runtime, Product, Schema, dependencies or external behavior. The complete closure review above plus identity/checkpoint/manifest and frozen-boundary non-regression are sufficient and proportionate. No concrete interaction risk or governance trigger remains that would justify unrelated exhaustive application review.

## 7. Mandatory non-regression evidence

- canonical root bytes equal JCS plus one LF;
- authority JCS, subject JCS, 14-key closed root schema and root cardinality independently recomputed;
- accepted V1.10, M02 A-08, M03 discriminated seam and M04 V3.1 source Git objects independently equal embedded selected authority values `4/4`;
- `ai_model_config` SQL/profile ordered mapping `21/21` equal;
- `ai_runs` SQL/profile ordered mapping `96/96` equal;
- author matrix declares and executes `10` positive, `91` negative and `16` property proofs;
- current verifier contains the actual CLI spawn proof and has no legacy current-loader symbols, Candidate-current envelope, fallback loader or alias allowlist;
- M02/M03/M04/NM01 and Phase B security/product/provider/Prompt boundaries are unchanged.

This docs-only review proportionately omitted full Build, test suites and optional Next lifecycle. Exact Git/schema/JCS inspection and adversarial real-CLI/envelope/manifest/physical tests cover the changed risk directly.

## 8. Reviewer process disclosure

The first final committed-membership probe run used the disposable clone's noncanonical filesystem spelling, so the verifier main-module equality guard did not execute and returned empty exit `0`. The Reviewer corrected only the Reviewer-owned script to resolve the clone realpath. A first restore attempt also correctly hit Git's overwrite protection because an intentional mutation was still present. The final probe restores the disposable clone explicitly and all recorded Candidate results come from a genuine real-CLI rerun. Candidate bytes and identity were unaffected.

## 9. Evidence disposition

`V2-M01` and the replacement `V111-M01.one-fail-closed-executable-authority` root are **CLOSED after replacement-cycle correction attempt 2**. No new finding was discovered. The exact V2.2 Candidate is Design-gate eligible; it remains implementation-ineligible until Coordinator Design Gate acceptance and separate explicit implementation authorization.
