# CWT Stage 4A Phase B — Corrected Exact Design V1.6 Fresh Independent Review V1.1

## Review conclusion

**FAIL**

Finding counts:

- Blocker: 0
- High: 0
- Medium: 1
- Low: 0
- External Validation: 0

The exact V1.6 Candidate is **not design-implementation-eligible**. The current clean 402-node snapshot is classified correctly, the six V1.5 omissions are individually corrected, and both Owner-selected technical seams remain sound. However, the same `V15-M01` complete-graph root remains open: the closed actual-filesystem selector has no class for the normal, ignored, build-generated root executable `next-env.d.ts`.

This FAIL neither changes nor rejects the Owner choices `M02-D1-INCLUDE` and `M03-D1-DISCRIMINATED-SEAM`. It does not authorize remediation or implementation.

## Exact Candidate identity

| Item | Verified value |
|---|---|
| branch/ref | `codex/phase-1b-stage4a-phase-b-corrected-design-v1` |
| exact HEAD | `49ba05ff0e40efce4ba8feb1bc87528414e3fad9` |
| direct parent | `d217a4413bbeb5c0a318caa754f37624be82e763` |
| V1.5 ancestor | `da2143654a372f70a93ff22f9fcb6e999f1e528e` |
| technical-escalation ancestor | `377181cd76e5427f344ff0c259fc9bd32ec7b670` |
| accepted rollback | `6bc26cf035608a21a057d6f4e87da8d4f7f23d40` |
| frozen tag peel | `31c0e405acfdd0d05200d0fb2531e897a541a2c4` |
| Candidate worktree | `/Users/calvin/.codex/worktrees/263d/CWT（CloudWave Textile）项目` |
| reviewer worktree | `/tmp/cwt-corrected-design-v16-review.FV4I0Z` |
| Candidate tracked state | clean before and after review |

The V1.5-to-V1.6 delta is exactly 25 added docs/evidence paths and 12,118 insertions. It contains no source, configuration, test-fixture, Schema/Migration, ADR, package or lockfile change. The original, V1, V2 and V3 failed implementation refs are not Candidate ancestors.

## Inputs and integrity

The review read the required governance, ADR, accepted Design, Owner selection, V1.5 FAIL, V1.6 design/audit and machine evidence completely and independently recomputed the fixed identities.

Verified primary hashes:

| Artifact | SHA-256 |
|---|---|
| Corrected Exact Design V1.6 | `06fb0795cc05e6651f63f46226c67290e108103cb567e5aa5e80a8b09a33eec2` |
| V15-M01 remediation audit | `d3bcf40c999672f7e7a8b3fb05c09a98457e68c9171294ac0c1ef5494ab73c31` |
| M03 profile V2.1 | `12860f30803c14bda5aac2c40cc0dbbf7176093037180ccb2bb50e26addc6702` |
| author verifier | `7cd0f74dfc25d0d5cf9f7a46e556457028d37e36ef52529846b041336fad6ff8` |
| actual-tree capture | `a33cd1e9d0becd92d380911aab4bc325469f1544445ee620749a1acf231c1f2b` |
| verifier capture | `0ffcb97f8fe46a4708fdd8f8d6e5763fc57691530f8c334c6b36531ce2e54aa9` |
| V1.6 manifest | `36da610be6e29ef9fd461bd10b0d12c09fa48573384b33356aa1fc0da79af48b` |

Manifests verified: V1.6 28/28; imported V1.5 FAIL 17/17; immutable V1.5 Candidate 22/22; technical-escalation PASS 5/5. Imported review evidence remained byte-identical.

## Verification summary

- Author verifier: two pinned-Node runs exit 0; output and inventory bytes match both captures exactly.
- Independent raw `lstat` graph: 402 candidates, 362 executables, 12 classes, `zero=[]`, `ambiguous=[]`; all three graph hashes exactly reproduced.
- Six original V1.5 paths: each now has exactly its required sole class.
- `src/test/**`: current candidates are test-only.
- Author-required classification/physical/generated/composition mutations: independently challenged and fail closed as specified.
- Fresh boundaries: path+suffix duplicate test signals remain one class; similar prefixes do not overmatch; unknown root control/executable paths remain fail closed.
- M03 database seam: two strict positives exit 0; unnarrowed, cross-driver and destructured negatives produce `TS2375`.
- M02 selected INCLUDE: 32-rule and full Unicode transition probes PASS.
- accepted 0020 mapping: `ai_model_config=21/21`, `ai_runs=96/96`, exact order PASS.
- 13 historical design findings and frozen phase/security/application boundaries: non-regression PASS.
- Runtime mismatch: fail closed.

No full application build was needed for this docs-only design review. The decisive build artifact was generated directly with the already installed Next writer in a disposable external directory, without touching the Candidate or using network/package resolution.

## Findings

### Medium — V15-M01 remains OPEN: normal Next build creates an ignored Candidate with zero class

Affected contract:

- V1.6 §2.3, actual-tree/candidate/classification contract;
- V1.6 §§19.3–19.5, canonical module graph and dependency/capability enforcement;
- V1.6 §§20.3/20.5 and §23, proof and exit gates;
- `M03_CAPABILITY_GRAPH_AND_DATABASE_SEAM_PROFILE_V2_1.json` fields `filesystemEnumeration`, `classificationModel`, `actualTreeProof` and `profileIntegrity`.

Exact reproduction:

1. The profile admits every `.ts` regular file as an actual-tree Candidate, regardless of tracked/ignored state.
2. `next-env.d.ts` matches none of the 12 selectors: `classify("next-env.d.ts") = []`.
3. The accepted repository explicitly lists `next-env.d.ts` in `.gitignore` and `tsconfig.json#include`.
4. Installed Next `16.2.12` build/type-setup code writes `<baseDir>/next-env.d.ts`; the independent probe generated it in a disposable directory.
5. Therefore, after the normal required Next build, a subsequent architecture proof deterministically fails `fail_closed_unclassified` unless an operator manually deletes the generated file.

Reality/impact:

- The clean captured tree has 402 tracked candidates and zero untracked or ignored candidates. Its PASS does not prove the asserted ignored-state completeness.
- This is a normal supported build state, not manual corruption or a speculative Provider behavior.
- The architecture gate becomes order-sensitive and fails in an ordinary post-build developer worktree, contradicting the claimed total actual-tree contract and creating an undocumented cleanup requirement.
- The correction benefit is high relative to its bounded selector/profile/evidence cost; an operator deletion loop is not an adequate architectural answer.

Required correction before eligibility:

- Version the single M03 selector/profile so this already known Next-generated root artifact receives one explicit bounded disposition and capability ceiling, or otherwise define one equally exact single-authority treatment consistent with raw actual-tree/ignored-state inclusion.
- Add an actual or faithfully generated ignored-candidate proof covering the normal Next build state; Git ignore must not silently remove it from scope.
- Preserve selector disjointness, sealed inventory/profile integrity, test/control capability ceilings and the existing M03 branch-local database seam.
- Do not add a compatibility selector, broad root wildcard, hidden cleanup step or second inventory authority.
- Re-run Fresh independent design review on the corrected exact commit.

Root classification: same `V15-M01` completeness root, not a genuinely new architecture root.

## Finding dispositions and non-regression

| Area | Disposition |
|---|---|
| `V15-M01` | **OPEN** — six known paths fixed, complete actual-tree selector still misses normal `next-env.d.ts` build state |
| Owner `M02-D1-INCLUDE` | CLOSED/non-regressed |
| Owner `M03-D1-DISCRIMINATED-SEAM` | CLOSED/non-regressed |
| H-01, H-02, M-01..M-06, L-01, N-M01..N-M04 | CLOSED/non-regressed |
| 21/21 + 96/96 accepted Schema mapping | PASS |
| Draft-only four use cases and human-review-only output | PASS |
| no fallback/RAG/vision/customer_support/private data | PASS |
| no Provider/network/durable Phase C/Phase D/E integration | PASS |
| three-strike governance and failed-code isolation | PASS |

## Decisions and impact

- Schema/Migration change required: no.
- ADR required: no.
- dependency/package/lock change required: no.
- persistent-coordination Complexity Approval required: no.
- SEO/URL/data impact: none.
- new Owner decision required: no; both existing Owner selections remain intact.
- implementation authorization: no.

## Eligibility and next gate

Exact commit `49ba05ff0e40efce4ba8feb1bc87528414e3fad9` is **not eligible** to open a Phase B implementation Candidate.

The next gate is a bounded docs/profile/evidence correction for the still-open `V15-M01` complete actual-tree selector root, followed by Fresh independent Design Review. No implementation, Phase C/D/E, Provider action, merge or Push may begin from this review.
