# CWT Stage 4A Phase B — Corrected Exact Design V1.5 Fresh Independent Review

**Review conclusion: FAIL**

**Design implementation eligibility: NO**

**Finding count: Blocker 0 / High 0 / Medium 1 / Low 0 / External Validation 0**

Date: 2026-08-11 Asia/Shanghai

## 1. Decision

The exact Corrected Exact Design V1.5 Candidate at `da2143654a372f70a93ff22f9fcb6e999f1e528e` is **FAIL** under `docs/REVIEW_POLICY.md`.

The Candidate correctly incorporates `M02-D1-INCLUDE`, and the selected M03 PGlite/Postgres discriminated seam is literally type-implementable. The accepted 21/21 and 96/96 mappings, all 13 historical finding closures, frozen scope and phase boundaries otherwise remain intact. However, the newly selected M03 graph contract is not complete for the actual accepted repository: six existing executable files receive none of its 12 required root classes even though the contract requires every executable/resource node to be classified and fails closed on zero matches.

This makes the mandatory architecture proof self-fail on the unchanged repository or forces an implementer to invent an exclusion/classification not present in the exact Design. V1.5 therefore cannot enter a new Phase B implementation Candidate until the design/profile/verifier is corrected and freshly re-reviewed.

FAIL does not revoke the Owner's two selections, authorize remediation, start an implementation attempt, or permit merge/Push/Phase C/D/E.

## 2. Candidate identity and isolation

| Item | Independently verified value |
|---|---|
| Candidate ref | `codex/phase-1b-stage4a-phase-b-corrected-design-v1` |
| Exact HEAD / ref | `da2143654a372f70a93ff22f9fcb6e999f1e528e` |
| Direct parent | `9cedefd618a168176f8d70a85e3ec8cb684967a7` |
| Required technical-escalation ancestor | `377181cd76e5427f344ff0c259fc9bd32ec7b670` |
| Accepted Design rollback/checkpoint | `6bc26cf035608a21a057d6f4e87da8d4f7f23d40` |
| Frozen tag object / peel | `1c626f9b788e4c6ed0480a7040aa54ccef3e6c76` / `31c0e405acfdd0d05200d0fb2531e897a541a2c4` |
| Candidate worktree | `/Users/calvin/.codex/worktrees/263d/CWT（CloudWave Textile）项目` |
| Reviewer detached worktree | `/tmp/cwt-corrected-design-v15-review.NmkiA4` |
| Candidate tracked state | clean before and after verification |

From `377181cd...` the exact scope is 23 added paths / 5,529 insertions / zero deletions. Every path is under `docs/` or `docs/review-evidence/`; there is no source, project script, test-fixture, Schema, Migration, ADR, package, lockfile or runtime/config change. `git diff --check` passes for the full range and V1.5-owned range. Imported independent-review bytes remain unchanged.

Failed implementation refs `755e514...`, `a696325...`, `b1a73bb...` and `d8a24d...` are non-ancestors and evidence only. No attempt 4, cherry-pick, compatibility layer or failed-code implementation base exists.

## 3. Fixed artifacts

| Artifact | SHA-256 / result |
|---|---|
| Owner Selection Record | `21c5db60154374f52546dae730dd2893d1fb53689757cf969106b9f1c7c96fa2` |
| Corrected Exact Design V1.5 | `22d9820f1faa5b318bb6904adcefbb96ba59559f132c9dcd611e16c574643698` |
| Derivation Report | `481947f06bd51139d081b46bf3ef852f1ce233191428e568b1c970ad36547d65` |
| Contract profile | `bbdc730b3b1a6d9d9ec0c26d50e8eabcbc33c132762775f80947b85919383a08` |
| Fixed inputs | `e3895fb405a0ad15cf9f73b35898161ebcae45cf41683137bd3e40de2c7569fe` |
| Author verifier | `55b2c00cf55d8522e1cba2ae3f266eab3ee62242022629ac5e8bccc191697e71` |
| Candidate manifest | `a98890959e9e24c522367b9e788cdd797cb6e98d5d1d57e35dcbdea01e853d6e`, 22/22 PASS |
| Imported technical-escalation PASS report/evidence/manifest | fixed hashes PASS, manifest 5/5 |
| Accepted V1.4 / Remediation V1.3 | fixed hashes PASS |

## 4. Review method and proportional verification

The review read the controlling governance and ADR, accepted V1.4, technical escalation V1.1 and independent PASS, exact Owner record, V1.5, derivation and machine profiles. It inspected actual source/types/Schema and did not treat the author closure matrix or verifier as review authority.

Offline checks used exact Node `24.14.0`, V8 `13.6.233.17-node.41`, ICU `78.2`, Unicode `17.0`, CLDR `48.0`, pnpm `11.9.0` and TypeScript `5.9.3`. No package installation, download, registry, network, Provider/API, credential or external environment was used.

Verification included:

- exact Git identity, ancestry, tag, scope, clean state and failed-code isolation;
- all fixed hashes and both manifests;
- two exact-runtime author-verifier runs with byte-identical output plus default-Node mismatch negative;
- fresh M02 selected-boundary variants and a fresh rerun of the prior independent all-rule transition compiler;
- author and fresh reviewer M03 strict positive/negative TypeScript probes;
- independent TypeScript-AST/SQL extraction of all accepted Schema fields; and
- a fresh actual-tree M03 classification challenge.

Full application build/tests were not run for this docs/profile-only Candidate. The targeted checks directly cover design identity, type implementability, Unicode grammar, Schema mapping and structural proof completeness. The controlling defect is static and deterministic.

## 5. Owner selection incorporation

### M02-D1-INCLUDE — incorporated

**PASS.** The selected authority is exactly 32 rules: 30 common plus two DeepSeek-only. Common INCLUDE/EXCLUDE rules remain semantically identical except the declared priority shift. Both DeepSeek rules carry the same inline DICP/Mark/LF-minus-invalid gap AST, per-gap 4 and total 64 counters. Direct, bounded insertion-aware, nine structured and overflow paths derive from one closed registry/compiler identity. EXCLUDE is history only, not a runtime alternative.

Fresh variants confirm DICP/Mark/LF admission, visible punctuation/Separator/ordinary whitespace exclusion, TAB/CR invalid-control rejection, 4/5 boundary, NFKC detection with persisted bytes unchanged, and exact runtime mismatch fail-closed behavior. No second classifier or compatibility path appears.

### M03-D1-DISCRIMINATED-SEAM — partial; graph incomplete

The actual database type seam **passes**: the exact two branch-local `.db` values are accepted by one generic factory; direct union, cross-driver and destructured-union forms fail TS2375. The one outer root, five edges, trusted two-field DTO, prohibited type escapes, Phase D/adapter absence and exact-empty Provider registry are specified coherently.

The complete graph portion **fails** V15-M01 below. This does not alter the Owner's selected discriminated seam, but it prevents its exact V1.5 proof package from being implementation-ready.

## 6. Historical finding non-regression

| Finding | V1.5 disposition |
|---|---|
| H-01 | CLOSED / non-regression PASS — application-neutral opaque core and application-owned binders remain; Section 18 is byte-identical. |
| H-02 | CLOSED / non-regression PASS — strict raw parser/output unions and human-review candidate refs remain; A-07 now uses the sole selected M02 identity. |
| M-01 | CLOSED / non-regression PASS — complete single-snapshot config aggregate and failure states remain; Section 10 is byte-identical. |
| M-02 | CLOSED / non-regression PASS — Prompt manifest/resource/generated/history authority remains; Section 12 is byte-identical. |
| M-03 | CLOSED / non-regression PASS — authorization/replay/read sequences remain normative and byte-identical in Section 18. |
| M-04 | CLOSED / non-regression PASS — durable association/context/config/Prompt/hash/tamper reconstruction remains. |
| M-05 | CLOSED / non-regression PASS — Product provenance and no-Product-Code boundary remain; only the protected-data consumer identity changes. |
| M-06 | CLOSED original root; new V15-M01 — accepted AST/bundle proof remains, but V1.5's added 12-class complete-graph extension is incomplete. |
| L-01 | CLOSED / non-regression PASS — RFC 8785/JCS domain and vectors remain; Section 9 is byte-identical. |
| N-M01 | CLOSED / non-regression PASS — 20-key config hash/requested-vs-actual dispatch semantics remain; 0020 mapping unchanged. |
| N-M02 | CLOSED / non-regression PASS — common read subtype assignability/transaction authority remains. |
| N-M03 | CLOSED / non-regression PASS — A-01–A-10 and provenance-not-entailment/human review remain. |
| N-M04 | CLOSED / non-regression PASS — dual binders/private carriers/opaque core flow remain; Section 18 is byte-identical. |

V1.5 retains all 26 top-level sections. Sections 3, 4, 5, 9, 10, 11, 12, 15, 16, 17, 18, 21 and 24 are byte-identical to V1.4. The independently parsed Design/Drizzle/Migration field order is exact: `ai_model_config` 21/21 and `ai_runs` 96/96.

## 7. Findings

### Blocker

None.

### High

None.

### Medium — V15-M01: selected M03 complete graph leaves six accepted executable nodes unclassified

**Exact contract:** V1.5 §2.3 states that every tracked or untracked executable/resource node after fixed physical exclusions receives exactly one of 12 root classes and that an unclassified node fails closed. §19.3–19.5 and §23 make the complete graph and its build evidence mandatory. The selected graph profile declares the executable extensions, recursive candidate set, exact classes and `noCandidateNodeLeftAmbiguous=true`.

**Independent reproduction:** actual-tree enumeration at exact HEAD found 391 executable/protected-resource candidates and these six zero-class nodes:

1. `drizzle.config.ts`
2. `playwright.config.ts`
3. `tests/e2e/global-teardown.ts`
4. `tests/e2e/product-import.spec.ts`
5. `tests/e2e/public.spec.ts`
6. `vitest.config.mts`

The root-control class omits the three root configuration files. The other-test class covers `test-fixtures/` and the declared `.test`/`.integration.test` suffix family, not `tests/e2e`, `.spec.ts` or global teardown. No other class matches these paths.

**Impact:** a faithful mandatory verifier fails on the unchanged accepted repository. A verifier that silently ignores or guesses these nodes violates the exact complete-graph/fail-closed contract. An implementer cannot satisfy V1.5 without architecture/profile judgment, so the design is not implementation-eligible.

**Author-verifier blind spot:** the fresh author verifier passes because it asserts the profile contains 12 classes and selected M03 metadata; it does not classify the actual repository tree. Its PASS is reproducible but does not test this invariant.

**Required correction:** update the standalone design, selected profile and verifier so every existing root configuration and `tests/e2e` executable has one explicit bounded class, including `.spec` and setup/teardown semantics, and add actual-tree positive plus mutation negatives proving zero unclassified/ambiguous nodes. Do not weaken the complete-graph guarantee through an implicit exclusion. Recompute exact hashes and obtain a Fresh Independent Design Review.

This is a genuinely new corrected-design graph-completeness root. It is not the prior M03 database-union root, not failed-code reuse and not implementation attempt 4.

### Low

None.

### External Validation

None. The Candidate makes no Provider/network/deployment/Production behavior claim.

## 8. Frozen scope and authority ruling

The remaining frozen boundaries pass: one Provider-agnostic Service Layer; Draft-only four text use cases; `ai_model_config` config authority; `ai_runs` sole lifecycle/provenance authority; empty Production Prompt bodies and Provider registry; no fallback/RAG/vision/customer_support/private/customer data; AI output remains protected `human_review_required`; no durable runtime, real adapter, business integration, Publish/Index or external action in Phase B design.

Impact ruling:

| Item | Result |
|---|---|
| Schema / Migration | none |
| ADR | none for the reproduced correction |
| Dependency / package / lock | none |
| Persistent-coordination Complexity Approval | none |
| SEO / URL / Redirect | none |
| Data reconciliation/import | none |
| Additional Owner choice | none if the exact approved selections and complete graph guarantee are preserved |

## 9. Eligibility and next gate

Corrected Design acceptance eligibility: **NO**.

Phase B design implementation eligibility: **NO**.

The next gate is a docs/profile/verifier correction for V15-M01 followed by a new Fresh Independent Corrected Design Review. The Owner selection record remains authoritative; this review does not choose or revoke an option. No implementation Candidate, merge, Push, Provider/API/credential/network/spend, Staging/Production, Deploy, Publish, Index, formal import or Phase C/D/E action is authorized.

## 10. Deliverables

- Main report: `docs/PHASE_1B_STAGE4A_PHASE_B_CORRECTED_EXACT_DESIGN_INDEPENDENT_REVIEW_V1_0.md`
- Evidence: `docs/review-evidence/phase-1b-stage4a-phase-b-corrected-exact-design-independent-review-v1/INDEPENDENT_CORRECTED_EXACT_DESIGN_REVIEW_EVIDENCE_V1_0.md`
- Fresh M02, M03 graph/type, Schema and standalone probes plus outputs in the same evidence directory
- Verification summary: `REVIEWER_VERIFICATION_RESULTS_V1_0.txt`
- Manifest: `SHA256SUMS.txt`

Exact reviewer artifact hashes are recorded in the manifest and Coordinator callback. Candidate bytes remain unchanged and reviewer artifacts are uncommitted.
