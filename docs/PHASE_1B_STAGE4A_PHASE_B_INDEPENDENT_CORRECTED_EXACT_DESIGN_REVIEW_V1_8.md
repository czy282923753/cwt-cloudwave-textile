# CWT Stage 4A Phase B — Corrected Exact Design V1.8 Fresh Independent Review

## Review result

**Conclusion: FAIL**

**Finding counts:** Blocker 0 / High 0 / Medium 3 / Low 0 / External Validation 0.

The checkpoint, Candidate identity, hashes, docs-only scope, selected field-domain shape, 1,000-hash corpus, protected-evidence boundary, Provider projection and M02/M03/Schema non-regression all pass. The exact V1.8 Candidate is nevertheless not implementable without architectural guessing: its new traversal errors are absent from the closed error union, its sole claimed-execution order contradicts the profile and its own pre-adapter guarantee, and its fixed verifier falsely reports a domain-demotion mutation as detected although it accepts the demoted protected email.

This FAIL does not reject the Owner-selected `IMP2-NM01-STRUCTURAL-INTEGRITY-DOMAIN` direction. It rejects this exact integration/proof package as the design gate.

## Candidate identity

| Item | Verified value |
|---|---|
| Ref | `codex/phase-1b-stage4a-phase-b-corrected-design-v1-8` |
| Exact HEAD | `a2cd31f53c34dad479862a1c67260ab71fda9805` |
| Direct parent | `8eac88210d41b5e37ab5963acc7ee28d007c4fd3` |
| Exact start | `b7ad96b24da45de00cae2cdb961a9aefcbc99496` |
| Accepted V1.7 | `3f475e13d73d9d68a4dfb9a040941c57f1ee92e6` |
| Checkpoint ref | `codex/checkpoint/phase-1b-stage4a-phase-b-nm01-pre-design-v1 -> b7ad96b...` |
| Frozen tag peel | `phase-1b-stage3-approved-2026-08-09 -> 31c0e405...` |
| Formal worktree | `/Users/calvin/.codex/worktrees/07a1/CWT（CloudWave Textile）项目`, clean |
| Review snapshot | `/tmp/cwt-v18-design-review.sKxr51/candidate`, detached exact HEAD, clean |
| Scope | 15 added paths / 5,341 insertions / docs and review evidence only |

The first checkpoint record commit `a90d642da38274ae3fab67ba4d8f284d8ddc5c35` is a direct child of the checkpoint and initially changes only the checkpoint record. The checkpoint ref remained fixed. Candidate `diff --check` passed. No source, test, fixture, Schema, Migration, snapshot, journal, seed, package, lockfile or ADR path changed from the exact start.

## Fixed artifact verification

All supplied fixed hashes recomputed exactly. The Candidate manifest verified 21/21. The imported V2.2 independent FAIL authority remained byte-identical and its manifest verified 4/4. The difference between 15 Git-added paths and the 21-entry artifact manifest is legitimate: the latter also protects immutable inputs outside this Candidate's Git delta.

## Required finding dispositions

### IMP2-NM01 — OPEN

The core technical direction is substantially correct:

- exactly one closed field-domain profile with 35 assignments and three disjoint domains;
- all four use cases and nested evidence subtrees receive exactly one domain;
- the five association fields are narrow structural/integrity metadata;
- authorized JCS/SHA recomputation removes the pseudo-random lexical collision without skipping source evidence;
- all protected task/source/link surfaces remain under the exact selected M02 classifier;
- Provider projections omit association metadata;
- input context shape/JCS/input hash and `input_sources_json` purpose remain unchanged.

However, the three Medium findings below prevent closure of the exact design/proof package.

### Owner decision incorporation — DIRECTION INCORPORATED, EXACT CANDIDATE NOT ACCEPTABLE

The Candidate implements only the approved structural-integrity field-domain direction and does not alter the earlier M02-D1-INCLUDE or M03-D1-DISCRIMINATED-SEAM selections. It adds no EXCLUDE path, second classifier, fallback, Provider integration or Phase C/D/E runtime. No new Owner decision is needed to correct the findings.

### Checkpoint — PASS

The mandatory pre-design checkpoint exists, is immutable, has the exact record/hash/first-child shape and was not moved through Candidate completion.

## Findings

### Medium — V18-M01: new traversal failures are absent from the closed `AiErrorCode` authority

**Exact sections:** V1.8 §13.2 step 3 and context-domain profile `traversalAuthority.zeroMatches/multipleMatches`, versus V1.8 §17 closed `AiErrorCode` table.

**Evidence:** §13.2 normatively returns `context_domain_unclassified` and `context_domain_ambiguous`. The strict `SafeAiError.code: AiErrorCode` table lists neither code. It also declares unknown failures become `internal_failure`, but does not define that as the mapping for these named domain failures.

**Real impact:** a strict TypeScript implementation cannot return the two exact required codes through `SafeAiError` without changing the closed union, silently mapping them, or weakening type strictness. That is implementation-time architectural guessing and can make tests/telemetry/Phase C failure persistence disagree.

**Required correction:** add both codes to the one closed error taxonomy with exact category/retry/manual-editor semantics, or explicitly replace the §13.2/profile result names with one existing exact code and update all profile/tests/evidence consistently. Do not add a parallel error mapping.

### Medium — V18-M02: the sole claimed-execution order contradicts the profile and its pre-adapter guarantee

**Exact sections:** context-domain profile `replayOrder`; V1.8 §13.2.3 final sentence; V1.8 §18.4 steps 7–10; V1.8 §18.5 rows 18.4.7–18.4.10.

**Evidence:** the profile and §13.2.3 put association/context-domain/input-hash validation before Prompt/config/envelope and adapter resolution. The only normative §18 sequence instead validates config “through the exact requested adapter” at step 7, loads Prompt at step 8, verifies compiled adapter envelope at step 9, and only decodes/scans context at step 10—while step 10 still says every context check completes before adapter resolution. The caller matrix repeats the same 7/8/9/10 order.

**Real impact:** an implementer must choose between two incompatible normative orders. The choice changes when untrusted durable context is rejected and whether adapter/config/Prompt registry resolution occurs first, which is directly within the Owner-required fail-closed replay boundary.

**Required correction:** make the profile, §13.2.3, sole §18.4 numbered sequence and §18.5 matrix one exact order. The corrected order must perform structural/integrity and protected-evidence context validation before adapter resolution as required by the approved boundary, while retaining all config/Prompt/envelope checks before the one adapter call.

### Medium — V18-M03: the fixed verifier falsely counts an accepted domain demotion as “detected”

**Exact sections/files:** derivation report mutation table (`10/10 detected`, including domain demotion); `VERIFY_CORRECTED_EXACT_DESIGN_V1_8.mjs` lines 406–413 and 465; captured `TRAVERSAL_AND_AUTHORITY_MUTATIONS=10/10_DETECTED`.

**Evidence:** the verifier changes `/task/guideIntent` from protected evidence to machine integrity, injects the protected email vector, then calls `validateContext(candidate, ...)` normally. It does not use `expectReject`. Because the protected-domain scan no longer sees that field and structural validation accepts a bounded email string, validation succeeds. The script increments `traversalMutations` and prints `DETECTED` anyway. The Fresh reviewer probe independently reproduced this accepted demotion.

The same verifier also runs coverage before the design's stated strict outer parse and its `acceptedEvidenceValue` accepts only primitive arrays or one-level objects, rather than executing the design's recursive object/array evidence grammar. These are corroborating proof-model mismatches under the same root, not separate classifier authorities.

**Real impact:** the exact fixed evidence claims proof of the central IMP2-NM01 invariant while its decisive demotion mutation survives. A later implementation could mirror this test and receive a false green for moving Provider-visible evidence out of M02 coverage.

**Required correction:** make domain demotion/reclassification reach an actual fail-closed assertion against the one compiled profile/validator; assert the protected payload cannot pass; validate exact assignment/domain/validator authority rather than only incrementing a counter; and report only assertions that executed. Retain the single traversal and classifier—do not add a second scanner or exception list.

## Fresh verification summary

| Verification | Result |
|---|---|
| Ref/HEAD/parent/start/ancestry/tag/worktree | PASS |
| Mandatory checkpoint and first record | PASS |
| Candidate docs-only scope and `diff --check` | PASS |
| Fixed hashes and Candidate manifest | PASS, 21/21 |
| Imported FAIL authority | PASS, 4/4 |
| Author verifier under pinned Node | exit 0 twice; byte-identical; output SHA equals fixed capture |
| Independent four-use-case traversal | PASS, 165 materialized nodes; missing 0; ambiguous 0 |
| Independent assignment mutations | removal 35/35 and duplicate 35/35 fail; unknown/overlap fail |
| Independent snapshot corpus | PASS, 1,000/1,000; 594 digit-run hashes; lexical calls 0 |
| Association integrity negatives | PASS, 9/9; arbitrary text in five machine fields 5/5 rejected |
| Fresh protected surfaces | PASS, 7/7 rejected |
| Provider association leak | PASS, zero across four projections |
| Closed error taxonomy challenge | FAIL, two missing codes |
| Claimed replay order challenge | FAIL, profile/§13 versus §18 contradiction |
| Author demotion mutation challenge | FAIL, accepted but counted as detected |
| Accepted Schema verifier | PASS; exact identity/history/columns/constraints/indexes |
| `ai_model_config` / `ai_runs` mapping | PASS, 21/21 and 96/96 |

No full application build/test was run: this is a docs/profile-only design Candidate, and full runtime execution cannot resolve the three normative/evidence contradictions. The targeted checks are proportional to the changed risk.

## Non-regression and impact ruling

- M02-D1-INCLUDE: non-regression PASS; exact 32-rule identity and runtime tuple unchanged.
- M03 discriminated seam and actual-graph boundary: non-regression PASS; profile identity unchanged.
- H-01, H-02, M-01..M-06, L-01, N-M01..N-M04, V15-M01: design-text non-regression PASS.
- Prompt authority, raw JSON/output policy, four Draft use cases, human-review-only behavior, no fallback/RAG/vision/customer_support/private data and phase boundaries: non-regression PASS.
- `ai_model_config` 21/21 and `ai_runs` 96/96: PASS.
- Current implementation finding state remains unchanged: NH01 closed; M01/M02/M04 open after attempt 2. This design task consumes no correction attempt 3.
- Schema/Migration: none.
- ADR: none.
- Dependency/package/lockfile: none.
- Persistent-coordination Complexity Approval: none.
- SEO/URL/Redirect/data/import: none.
- New Owner decision: none.

## Eligibility and next gate

**Design implementation eligibility: NO.** Exact commit `a2cd31f...` is not eligible for coordinator design acceptance or implementation authorization.

**Next gate:** a docs/evidence-only V1.8 correction must reconcile the closed error taxonomy, make the claimed replay order singular, and replace the false mutation proof with an actual fail-closed assertion. That corrected exact Candidate then requires a Fresh independent Design Review. No implementation attempt 3, Provider work, merge, Push or Phase C/D/E may start from this FAIL.
