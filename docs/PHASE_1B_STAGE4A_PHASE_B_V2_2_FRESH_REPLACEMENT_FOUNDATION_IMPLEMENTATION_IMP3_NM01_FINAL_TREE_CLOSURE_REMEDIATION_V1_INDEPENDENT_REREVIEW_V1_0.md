# CWT Stage 4A Phase B — IMP3-NM01 Final-Tree Closure Remediation V1 Fresh Independent Re-review

## Review conclusion

**FAIL**

- Blocker: 0
- High: 0
- Medium: 1
- Low: 0
- External Validation: 0
- Phase B implementation eligibility: **NO**
- IMP3-NM01: **OPEN after correction attempt 1**
- Three-strike status: **NOT TRIGGERED**; ordinary correction attempt 2 remains available

The exact Candidate's Product/runtime tree is clean, and every other reviewed closure remains closed. The sole architecture checker nonetheless accepts a Fresh Production/current import of an `evidence_only_not_production` executable. That leaves the same IMP3-NM01 current-graph/evidence-isolation root open.

## Exact Candidate

- Ref: `refs/heads/codex/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-implementation-imp3-nm01-final-tree-closure-remediation-v1`
- HEAD: `b48f33f35d5d46824a8c4dec6b40d4a093050285`
- Parent / executable-tree seal: `87966f118766b60aeacc51ceca61c68ea57a62cf`
- Tree: `15f642e9d910d9625ff786d829986da6cfa7221e`
- Seal parent: `22bc452526513a8e47da6689f0012f45f0d0c0af`
- Seal tree: `c39f57beb85a47decd5a73947270e4c28269b49b`
- Executable-tree SHA-256: `8c9579d32caa482687253235d8f2d56831a62a872c2ac26370cafc4bd0331f5f`
- Failed ref preserved: `10de3daf142561247e141c140b10966954f8dc9e`
- Formal and detached tracked states: clean

Identity, ancestry, three inherited checkpoints, frozen Tag, post-seal modes/scope, fixed hashes, `20/20` Candidate manifest, controlling `6/6` FAIL manifest, and immutable probe bytes all PASS. The sole Product-code delta is `scripts/verify-ai-architecture.ts`; every post-seal successor is non-executable documentation/evidence.

## Medium finding

### IMP3-NM01 remains open: evidence-only isolation is one-sided

The checker assigns the immutable historical probe to `diagnostic-documentation` with `evidence_only_not_production`, retains it in physical inventory, and skips acquisitions emitted by that class. However, its capability-edge enforcement rejects Production imports of test/synthetic classes but does not reject Production imports of `diagnostic-documentation`.

A Fresh disposable mutation added one static import from the existing Production node `src/storage/index.ts` to the exact historical probe. The real checker, run on the pre-seal generation path, exited `0`. Because acquisitions from the diagnostic target are then skipped, even its historically unresolved import disappears from the current graph.

This permits a Product tree that directly reaches executable Reviewer evidence to obtain a green architecture proof. It violates the required `evidence_only_not_production` boundary and makes the acceptance gate incomplete. An unresolved Production import control still rejects, so the defect is specifically the missing Production-to-diagnostic class edge rule.

The real exact-final lifecycle gate also reports 657 candidates / 477 executables, while the supplied capture states 654 candidates "with five proofs" and does not assert the exact final total. This evidence-fidelity mismatch is consolidated into the same root and L02 effect, not split into another finding.

## REMEDIATION_FINDINGS_REVIEW

| Item | Disposition |
| --- | --- |
| IMP3-NM01 attempt 1 | **FAIL / OPEN** — Production/current → diagnostic evidence exits 0 |
| H-01 / M04 attempt 3 | **PASS / CLOSED** — 69 faults, 10 positives; origin denial unchanged |
| H-02 / NH01 attempt 1 | **PASS / CLOSED** — Fresh PGlite 2 files / 7 tests |
| Owner DB convergence | **PASS / CLOSED** — exact member/path exception only |
| M02 replacement | **PASS / CLOSED** |
| NM01 replacement | **PASS / CLOSED** |
| M01 reconstruction | **PASS / CLOSED** |
| M03 | **PASS / CLOSED** — 2 positive / 6 negative type seams |
| M05 | **PASS / CLOSED** |
| L01 | **PASS / CLOSED** — availability-only Production surface |
| L02 | **FAIL as the same IMP3-NM01 effect** |
| Frozen Provider/Prompt/security/public/SEO/URL/Schema/Migration/package/lock/phase boundaries | **PASS / CLOSED** |

Controls reject post-seal executables, unresolved Production edges, `docs/docs` shims, stale proofs, symlinks, and hard links. The five canonical proof hashes and seal bindings independently recompute. There is no broad unresolved-edge allowance, second checker, historical-profile runtime input, or H-01 regression.

## Verification

- Prior exact attached-equivalent and detached failure: `unresolved_static_edge` reproduced.
- Author verifier Fresh attached + detached: PASS.
- Exact proof-bound real gate: PASS baseline; 657 candidates, 477 executables, zero unclassified/ambiguous/current-unresolved, 21 ordinary URLs, 2,270 edges.
- Faults/positives/mutations: 69/69, 10/10, inherited 28/28, final-tree 6/6.
- All AI: 14 files / 163 tests PASS.
- H-02 Fresh real-service matrix: 2 files / 7 tests PASS.
- Affected DB/public/SEO focus: 5 files / 12 tests PASS.
- Lint and strict typecheck: PASS.
- DB verifier and independent mapping: PASS; 21/21 and 96/96 exact order.
- Prompt bundle/history and exact-empty Production Prompt/Provider: PASS.
- Official Next typegen: PASS; fixed 247-byte `next-env.d.ts`.
- Isolated network-denied server/public bundle: PASS; 51 server files / 16 client chunks.
- Package manager/install/materialization/download/registry/network/Provider actions: 0.

## FULL_REVIEW_NECESSITY

**NOT_REQUIRED.** The checker is the only Product-code delta. All claimed remediation closures and mandatory identity/security/schema/public gates were completed first. The deterministically reproduced blocker to eligibility is inside that exact boundary; unrelated full application testing would not change it. The performed all-AI, focused, lint, type, DB, Prompt, lifecycle, and bundle verification is proportionate.

## Impacts and next gate

No Schema, Migration, ADR, dependency, package/lock, Complexity Approval, Product, public, SEO, URL, data, or Owner decision is required. No new independent root was found.

The next gate is a bounded IMP3-NM01 correction attempt 2 followed by another Fresh independent re-review. This review does not remediate, accept, merge, Push, or start Phase C/D/E.
