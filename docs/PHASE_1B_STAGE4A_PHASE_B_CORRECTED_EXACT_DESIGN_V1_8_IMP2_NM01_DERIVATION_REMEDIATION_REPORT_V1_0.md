# CWT Stage 4A Phase B — Corrected Exact Design V1.8 IMP2-NM01 Derivation and Remediation Report V1.0

Status: **DESIGN REMEDIATION CANDIDATE / NOT SELF-APPROVED / IMPLEMENTATION NOT AUTHORIZED**

Prepared: 2026-08-11 (Asia/Shanghai)

## 1. Outcome

Corrected Exact Design V1.8 replaces one invalid V1.7 proof responsibility: application-generated cryptographic association metadata is no longer modeled as natural-language evidence. One application-owned, closed typed traversal assigns every strict context node exactly one of three domains. Human/business/Provider-evidence roots keep the byte-identical selected M02 classifier; the complete association object uses exact structural parsing plus authorized target-snapshot recomputation. Context shape/bytes, full-context JCS/`input_hash`, `input_sources_json`, Schema/Migration, M02 grammar, M03 seam, and Provider-neutral boundaries do not change.

This is a Candidate conclusion only. It makes no implementation-completion claim and does not approve itself.

## 2. Fixed start and checkpoint

| Item | Exact identity / result |
|---|---|
| source ref | `codex/phase-1b-stage4a-phase-b-foundation-implementation-v2-remediation-v2` |
| start / rollback | `b7ad96b24da45de00cae2cdb961a9aefcbc99496` |
| direct parent | `846888a409b2b62869ff7ff8fca36b88b70d0bf9` |
| implementation code HEAD | `111301aea82569768661c6401b16054161ed19ff` |
| accepted V1.7 ancestor | `3f475e13d73d9d68a4dfb9a040941c57f1ee92e6` |
| immutable local checkpoint ref | `codex/checkpoint/phase-1b-stage4a-phase-b-nm01-pre-design-v1` |
| checkpoint target | `b7ad96b24da45de00cae2cdb961a9aefcbc99496` |
| checkpoint record commit | `a90d642da38274ae3fab67ba4d8f284d8ddc5c35` |
| immutable FAIL import commit | `8eac88210d41b5e37ab5963acc7ee28d007c4fd3` |
| V1.8 branch | `codex/phase-1b-stage4a-phase-b-corrected-design-v1-8` |
| formal worktree | `/Users/calvin/.codex/worktrees/07a1/CWT（CloudWave Textile）项目` |
| frozen tag peel | `31c0e405acfdd0d05200d0fb2531e897a541a2c4` |

The checkpoint ref was created atomically before the first file mutation, was never a Tag, and must remain pinned after final commit. The checkpoint record was the first V1.8 commit and its only artifact.

## 3. Causal diagnosis

V1.7 correctly froze the selected 32-rule M02 natural-language classifier and required exact reconstructible context. It incorrectly stated that the classifier should traverse the complete accepted JSON value without first assigning field authority domains. The implementation faithfully scanned `association.snapshotHash`, a machine-generated SHA-256 integrity value. The structured phone grammar regards a decimal run of at least seven digits as possible personal data, so valid hexadecimal hashes collided by chance.

Fresh Independent Implementation Re-review V2.2 measured 590 protected matches in 1,000 deterministic valid Revision hashes. The first collision, `b574a4fc557400009c7cc935adad4ceda3b1dbaa7f07fd35972605390f06dafc`, is exactly the SHA-256 of the authorized JCS Revision snapshot for `b534aed1-c661-4d8f-84cb-38c12157c622`, version `7`. The rejection was unrelated to protected business content.

The misplaced responsibility was domain selection, not the M02 phone rule, Unicode grammar, association bytes, or hash algorithm. Editing the registry would weaken a selected security authority; adding `/association/snapshotHash` to an exception list would create a second authority. V1.8 instead makes the typed application context schema the single field-domain authority.

## 4. Exact V1.7 → V1.8 change map

| V1.7 location/contract | V1.8 disposition | Mechanical effect |
|---|---|---|
| document identity/status/gate | versioned to V1.8; new fixed start/checkpoint/import/Owner authority recorded | no runtime or source effect |
| Section 2.1 | adds the approved IMP2-NM01 boundary and exact V2.2 FAIL identity | distinguishes this new root from M02/M03 and remaining attempt-3 findings |
| Section 13.2 | preserves the exact `ReconstructibleDraftContextV1` shape and adds the sole field-domain profile/traversal | every node is uniquely closed-container, machine-integrity, or protected-evidence; zero/ambiguous fail |
| Section 13.2.1 | makes complete association validators/recomputation normative | hash accepts only on strict lowercase-64 SHA-256 equality to authorized JCS target snapshot and durable copy |
| Section 13.2.2 | exhaustively assigns protected text/value surfaces to the selected M02 identity | task narrative, source labels/value subtrees and link labels keep full protection |
| Section 13.2.3 | restates the unchanged persistence and four Prompt projections | full context remains persisted/hash-covered; association metadata never reaches Provider variables |
| Section 13.6 | replaces “classifier over complete JSON” with the one typed traversal plus domain-specific validators | removes the causal category error without an exception path |
| Section 18.4 step 10 | orders association recomputation, typed coverage, protected scans and full-context hash before adapter resolution | replay/tamper behavior is fail-closed and deterministic |
| Sections 20/23 | adds 1,000 hashes, Reviewer vector, complete protected/machine surface tests, domain mutations, byte identity and leak proof | mechanically reviewable design acceptance |
| Sections 25/26 | records unchanged complexity and Fresh Independent V1.8 Review gate | no self-approval or implementation authority |

All other V1.7 clauses are reproduced in the standalone V1.8 file. Section 11 remains byte-identical inside the design, retaining exact `ai_model_config` 21/21 and `ai_runs` 96/96 mappings. The selected M03 V2.2 profile remains SHA-256 `1f0b56a870ecbab61c970e1c7000dff591674e0f8ad0a04341538c724a36c173`. The selected M02 registry remains SHA-256 `264ca6358dcec00da5bc17e134c89e52d5321c87683212b8c32ba12756700b66`, 32 rules.

## 5. Single-authority result

The V1.8 profile owns every context node assignment. It has no fallback order: each node must match exactly one entry. The recursive `**` form exists only for the source evidence value subtree, where the one selected classifier already walks arbitrary accepted evidence keys and strings. A new field cannot inherit a broad machine classification and cannot be silently skipped.

The selected M02 registry remains the sole language-classifier authority shared by protected context evidence and output A-07. The context traversal does not contain rule IDs, grammar, gaps, Unicode tables, or protected categories. Conversely, the classifier does not decide whether a field is machine metadata. The association codec/JCS/hash authority validates only the closed five-field association and accepted target snapshot; it cannot classify arbitrary strings.

No second scanner, second gap table, second field selector, consumer-local exception list, compatibility traversal, path ignore, or serialized second context exists.

## 6. Offline proof disposition

The versioned verifier interprets the machine profile and executes the frozen classifier under Node `24.14.0`, V8 `13.6.233.17-node.41`, ICU `78.2`, Unicode `17.0`, CLDR `48.0`, `darwin/arm64`.

| Proof | Candidate result |
|---|---|
| comprehensive fixed context domain coverage | 31 materialized nodes; 10 container, 17 machine, 4 protected; missing 0, duplicate 0 |
| deterministic Revision corpus | 1,000/1,000 accepted; 594 hashes contain a seven-or-more decimal digit run; hash lexical calls 0 |
| Reviewer first collision | accepted only on exact recomputation/durable equality; its direct M02 result remains `protected_match` and is deliberately not consumed for machine metadata |
| integrity negatives | 8/8 rejected: tamper, uppercase, wrong length, wrong algorithm, wrong target, wrong version, wrong snapshot version, replay mismatch |
| protected evidence placements | 35/35 rejected across 7 protected patterns × phone/email/credential/Provider/private payloads |
| arbitrary text in machine fields | 18/18 rejected structurally |
| traversal/authority mutations | 10/10 detected, including missing/duplicate/new field, exception/compat/bypass, domain demotion, registry identity, Provider leak and registry bytes |
| persistence | accepted JSON bytes identical; JCS identical; fixed `input_hash=54bb74fa4d9c0a6458ddf522746f900369758e8c701a7adbdccbd7c0e7d62828` |
| Provider association leak | zero |
| M03 / Schema map | unchanged profile hash; `21/21` and `96/96` |

The verifier demonstrates consistency of the proposed design contract against fixed authorities. It does not assert that product implementation already follows V1.8.

## 7. Frozen implementation-review status

- `IMP2-NH01`: CLOSED.
- `IMP2-M01`, `IMP2-M02`, `IMP2-M04`: OPEN after correction attempt 2; exactly one final ordinary correction attempt remains for each. V1.8 performs none.
- `IMP2-NM01`: new/open at entry with no correction attempt; V1.8 corrects its design boundary only.
- `IMP2-M03`, `IMP2-M05`, `IMP2-L01`, `IMP2-L02`: frozen CLOSED and non-regression PASS required.

The prior failed implementation remains evidence only. No failed implementation logic is copied or authorized by this package.

## 8. Impact and rollback

| Area | Impact |
|---|---|
| Schema/Migration/snapshot/journal/seed | none |
| dependency/package/lockfile | none |
| ADR | none; Provider-neutral ADR-0018 remains unchanged |
| persistent coordination/Complexity Approval | none; one compile-time typed traversal replaces an overbroad traversal responsibility |
| SEO/URL/Redirect | none |
| Provider/model/Prompt runtime | none; Production Provider registry remains empty and association metadata is not Provider-bound |
| Phase C/D/E | unchanged and unauthorized |

Rollback is deletion/reversion of the new documentation/evidence commits to immutable checkpoint `b7ad96b24da45de00cae2cdb961a9aefcbc99496`; accepted V1.7 at `3f475e13d73d9d68a4dfb9a040941c57f1ee92e6` remains the full design ancestor. No data rollback or Migration exists.

## 9. Next gate

Only the original independent Design Reviewer may perform a Fresh Independent Corrected Design V1.8 Review against the exact final commit and manifest. PASS is required before a later coordinator task may authorize any implementation or remaining correction attempt. This task does not start Review, implementation, merge, or Push.
