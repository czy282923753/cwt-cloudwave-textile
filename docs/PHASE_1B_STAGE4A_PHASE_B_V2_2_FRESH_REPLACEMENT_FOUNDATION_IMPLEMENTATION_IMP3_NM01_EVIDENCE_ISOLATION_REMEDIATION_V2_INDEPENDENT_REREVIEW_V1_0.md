# CWT Stage 4A Phase B — IMP3-NM01 Evidence-Isolation Remediation V2 Fresh Independent Re-review

## Review conclusion

**FAIL**

- Blocker: 0
- High: 0
- Medium: 1
- Low: 0
- External Validation: 0
- Phase B implementation eligibility: **NO**
- IMP3-NM01: **OPEN after correction attempt 2**
- Three-strike status: **NOT TRIGGERED**; only ordinary correction attempt 3 remains

The exact Candidate closes the ordinary direct, re-export, type-only, transitive, untracked and ignored Production-to-evidence witnesses. It still accepts a Production/current edge whose target is a case-variant spelling of the same physical evidence file on the required macOS case-insensitive filesystem. The common target-class ceiling therefore remains bypassable and the same bidirectional evidence-isolation root is open.

## Exact Candidate

- Ref: `refs/heads/codex/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-implementation-imp3-nm01-evidence-isolation-remediation-v2`
- HEAD: `d60d5cc2398eeeb06263c58924896250f12f3756`
- Parent: `4b06f4d8c68a728d94c8afb7b0ee1d7c85fc8a1b`
- Tree: `fe8645642d1b2d511506e20d269b3250864cc88c`
- Executable-tree seal: `627779d294e45f1fb166f70b94067c4b811aaaff`
- Seal parent/tree: `3c9bb6cbebde6b17351c38951c63b47d49a67e19` / `f99ef5c47ba4be828a8232682a6ee3a8d3776efd`
- Executable-tree SHA-256: `a45c8cb0a5d15830d601442ced747067b6718a32f09ccff8c2572f11a4ea06e8`
- Failed attempt-1 ref preserved: `b48f33f35d5d46824a8c4dec6b40d4a093050285`
- Formal and independent detached tracked states: clean

Identity, ancestry, the three inherited checkpoints, frozen Tag, successor path modes, fixed hashes, the current `20/20` manifest, controlling FAIL package, and immutable historical probe all PASS. The only Product-code delta is `scripts/verify-ai-architecture.ts`; all ten post-seal paths are regular mode-`100644` non-executable documentation/evidence.

## Medium finding

### IMP3-NM01 remains open: a case-variant physical target bypasses the Production target-class ceiling

The new common edge rule obtains the target class with the resolved path as a key. On the required macOS filesystem, a case-variant import resolves to the same device and inode as the canonical evidence file, but the resulting realpath string preserves the requested case. It therefore misses the canonical actual-tree map key. The target node is treated as absent and the class ceiling returns without rejecting the edge.

Two independent real-gate witnesses exit `0`:

1. `src/storage/index.ts` imports the immutable historical executable probe through a case-variant filename. The canonical and variant paths identify the same device/inode.
2. The same Production source imports the current evidence authority JSON through a lowercase filename variant. This also identifies the same device/inode, the architecture gate exits `0`, and strict TypeScript exits `0`.

The second witness has no historical unresolved acquisition, so the result cannot be attributed to the old probe's contents. Normal canonical direct, side-effect, re-export, type-only, all four Production-class, transitive, visible-untracked and ignored-untracked evidence targets do reject with `class_capability_violation`. Symlink/hard-link, stale-proof, post-seal executable, compatibility-shim and silent-exclusion controls also reject. The defect is narrowly the failure to canonicalize the resolved physical target back to the single actual-tree identity before the common class ceiling.

This is the same IMP3-NM01 Production/current incoming non-reachability root, not a new root. L02 is affected only through the same acceptance-proof defect and is not counted separately.

## REMEDIATION_FINDINGS_REVIEW

| Item | Disposition |
| --- | --- |
| IMP3-NM01 attempt 2 | **FAIL / OPEN** — case-variant spelling of the same physical evidence target exits `0` |
| H-01 / M04 attempt 3 | **PASS / CLOSED** — Fresh ambient alias rejects and emitted local shadow passes; 69 faults / 10 positives retained |
| H-02 / NH01 attempt 1 | **PASS / CLOSED** — Fresh PGlite real-service matrix, 2 files / 7 tests |
| Owner DB convergence | **PASS / CLOSED** — exact `globalThis.cwtDatabaseConnection` member/path exception only |
| M02 replacement | **PASS / CLOSED** |
| NM01 replacement | **PASS / CLOSED** |
| M01 reconstruction | **PASS / CLOSED** |
| M03 | **PASS / CLOSED** — 2 positive / 6 negative type seams |
| M05 | **PASS / CLOSED** — public/Product/SEO surface unchanged |
| L01 | **PASS / CLOSED** — availability-only Production surface |
| L02 | **FAIL as the same IMP3-NM01 effect** — proof gate accepts the physical-alias edge |
| Frozen Provider/Prompt/security/public/SEO/URL/Schema/Migration/package/lock/phase boundaries | **PASS / CLOSED** |

Historical evidence remains tracked, physically inventoried, uniquely classified `diagnostic-documentation` / `evidence_only_not_production`, and unable to emit current outgoing authority. Evidence-to-Product review observation remains allowed. No second checker, compatibility target, broad unresolved allowance, historical-profile runtime read, selector weakening, or H-01 regression was found.

## Verification

- Exact attempt-1 Production-to-evidence unsafe PASS: reproduced.
- Author verifier Fresh attached + detached: PASS after independently supplying only local ref/dependency context; exact final HEAD, seal, tree SHA, 20 entries and five proofs.
- Source-clean real gate: 668 candidates / 478 executables / 2,269 edges; zero unclassified, ambiguous or current-unresolved; 21 ordinary URLs.
- Official-present real gate: 669 candidates / 479 executables / 2,270 edges; attached/detached executable identities match.
- Architecture cases: 69/69 faults, 10/10 positives, inherited 28/28 mutations and closure 12/12 mutations.
- Decisive Fresh challenge: 23 cases; 17 expected negatives, 5 Candidate positives, prior unsafe PASS reproduced, two Candidate case-variant unsafe acceptances reproduced.
- All AI: 14 files / 163 tests PASS.
- H-02 Fresh real-service matrix: 2 files / 7 tests PASS.
- Affected DB/public/SEO focus: 5 files / 7 tests PASS.
- Lint and strict typecheck: PASS.
- DB verifier and independent extraction: PASS; `ai_model_config` 21/21/21 and `ai_runs` 96/96/96 in exact order.
- Prompt bundle/history and exact-empty Production Prompt/Provider registries: PASS.
- Official Next typegen: PASS.
- Isolated network-denied server/public bundle: PASS; 51 server files / 16 client chunks.
- Package manager/install/materialization/download/registry/network/Provider actions: 0.

## FULL_REVIEW_NECESSITY

**NOT_REQUIRED.** The sole Product-code delta is the architecture checker. The complete remediation series, all explicitly preserved closures, and mandatory identity, evidence, schema, security, Prompt/Provider, authorization, public and bundle gates were reviewed first. A deterministic blocking same-root defect is reproduced inside that exact boundary. An unrelated exhaustive application suite cannot change its classification; the all-AI and proportionate affected/frozen verification is sufficient.

## Impacts and next gate

No Schema, Migration, ADR, dependency, package/lock, Complexity Approval, Product, public, SEO, URL, data, or Owner decision is required to state the finding. No genuinely new root was found.

The next gate is a bounded IMP3-NM01 correction attempt 3 followed by another Fresh independent re-review. This review does not remediate, accept, merge, Push, authorize Provider work, or start Phase C/D/E.
