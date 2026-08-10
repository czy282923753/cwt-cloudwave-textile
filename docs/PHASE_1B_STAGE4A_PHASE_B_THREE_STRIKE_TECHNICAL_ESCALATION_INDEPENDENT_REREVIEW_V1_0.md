# CWT Stage 4A Phase B — Technical Escalation Remediation V1 Fresh Independent Re-review

**Review conclusion: PASS**

**TECH-M01: CLOSED**

**M03: NON-REGRESSION PASS**

**Owner-decision eligibility: YES**

**Implementation eligibility: NO**

**Finding count: Blocker 0 / High 0 / Medium 0 / Low 0 / External Validation 0**

Date: 2026-08-10 Asia/Shanghai

## 1. Decision

The exact Technical Escalation Remediation V1 Candidate at `377181cd76e5427f344ff0c259fc9bd32ec7b670` is **PASS** under `docs/REVIEW_POLICY.md`.

The V1.1 package corrects the sole prior finding at its semantic authority boundary. INCLUDE and EXCLUDE now consist of complete, mutually exclusive selected registries. Each rule carries its own inline closed grammar, gap-set AST and counters; direct, insertion-aware, structured and overflow results derive from that one transition graph. The two INCLUDE-only DeepSeek rules use the exact narrower gap language promised to the Owner:

```text
Default_Ignorable_Code_Point | Mark | LF
minus invalid-control-set-v1
```

Independent full-graph challenges confirm that bounded U+200B/U+2060/U+061C, U+20DD/U+034F/U+05B0 and LF variants are protected while visible punctuation, Separator and ordinary White_Space splits are intentionally allowed. TAB/CR fail first, per-gap 4/5 and total 64/65 are exact, and the old LF/U+034F/U+200B shortcut cannot produce a false PASS.

M03 remains unchanged and independently passes its strict positive/negative TypeScript proofs. The clean-restart and three-strike governance boundary is intact: no failed implementation is a code source, no attempt 4 exists, and no corrected Design or implementation has begun.

PASS means only that the Coordinator may submit the two exact decisions to the Owner. It does not choose an option, authorize a corrected Design, approve implementation, accept Phase B, merge, Push or begin Phase C/D/E.

## 2. Exact Candidate identity and isolation

| Item | Independently verified value |
|---|---|
| Candidate ref | `codex/phase-1b-stage4a-phase-b-three-strike-technical-escalation-v1` |
| Exact ref / detached review HEAD | `377181cd76e5427f344ff0c259fc9bd32ec7b670` |
| Direct parent | `6a74823666cebc67912ed90c44381d8399076fc3` |
| Remediation parent ancestor | `87bf5025587b223aef3929172411cfeeb6fb1ca7` |
| Accepted clean-restart checkpoint | `6bc26cf035608a21a057d6f4e87da8d4f7f23d40` |
| Candidate worktree | `/Users/calvin/.codex/worktrees/263d/CWT（CloudWave Textile）项目` |
| Reviewer worktree | `/private/tmp/cwt-technical-escalation-remediation-rereview-v1.dUEhq8` |
| Candidate tracked state | clean before and after verification |
| Frozen tag object / peel | `1c626f9b788e4c6ed0480a7040aa54ccef3e6c76` / `31c0e405acfdd0d05200d0fb2531e897a541a2c4` |

The exact remediation-parent-to-HEAD chain is five linear commits. The final scope is 23 added paths / 10,839 insertions, entirely under `docs/` and `docs/review-evidence/`. There is no Product source, project runtime script, test fixture, Schema, Migration, ADR, accepted Design, package, lockfile or configuration change.

Failed implementation refs `755e514...`, `a696325...`, `b1a73bb...`, `d8a24d...` and prior diagnostic `f27cadf...` remain non-ancestors/evidence only.

## 3. Fixed artifacts and manifest

| Artifact | SHA-256 / result |
|---|---|
| Technical Escalation V1.1 | `ab561395788756a285e54b91486124e8c2bda830a4c38ae8692a94dcba85b2bf` |
| Owner Decision Package V1.1 | `342e88e61292e2e25fce21ddaf5e769402f5086e8195d02a5fbe8b083f08e7ea` |
| V1.1 Candidate manifest | `7613959e9dadded7261f68e9b2dfbc5c51d5969a0435f87a3cb2187c62bb9c34`, 22/22 PASS |
| V1.0 report/package/manifest | fixed hashes byte-identical |
| Prior independent FAIL report/evidence/manifest | fixed hashes byte-identical |
| Accepted Design V1.4 | `48e6afebfba53f65c03077a1ca27522f0245f17cbd0b3b46ff492929cf1e0c07` |
| ADR-0018 | `c60d71f293da6fe082c94927650e731d26abcdb238ba94863655053e22ab1f2f` |

The Candidate manifest and every fixed authority/type/package/lock hash pass independently.

## 4. Review authority and method

The review read the required governance, accepted Design, prior FAIL and complete V1.1 decision/evidence package. It inspected actual database/types/runtime/package facts rather than treating the closure report as authority.

Verification was offline and proportional to a docs/profile Candidate:

- exact Git/ref/parent/ancestry/tag/scope/clean-state checks;
- SHA-256 and 22/22 manifest reproduction;
- two fixed-runtime author-verifier runs plus runtime-mismatch negative;
- a fresh independent compiler/matcher for all 62 selected-registry rule instances;
- full Unicode-property enumeration and fresh non-author property witnesses;
- independent M03 strict positive/negative TypeScript probes; and
- exact whitespace-boundary checks.

No package manager, installation, download, registry, network or external action was used.

## 5. Prior finding disposition

### TECH-M01 — CLOSED

The prior root was a split authority: V1.0's normative five-property gap admitted punctuation/space in `deepseek`, while its verifier executed only LF/U+034F/U+200B and its Owner corpus promised punctuation/space would be allowed.

V1.1 replaces that mechanism rather than layering a special-case scanner:

- every rule now has a complete inline `gapSetAst` and counters;
- both DeepSeek-only rules share one narrow inline gap contract;
- every other value rule retains one full-property inline contract;
- key rules have the empty gap set;
- the selected registry is the only semantic authority;
- the same canonical graph performs direct, bounded insertion, structured and overflow evaluation; and
- the verifier's former three-character shortcut is retained only as a mutation that must fail.

Independent results:

| Boundary | Result |
|---|---|
| INCLUDE / EXCLUDE counts | 32 / 30 |
| Common rules | 30/30 semantically identical, only documented later priority shift |
| INCLUDE-only delta | exactly two DeepSeek rules |
| Fresh DICP witnesses | U+061C and U+FE00 protected under INCLUDE |
| Fresh Mark witness | U+05B0 protected under INCLUDE |
| Visible punctuation/separator/space | `deep-seek`, `deep; seek`, `deep—seek`, U+2028/U+1680/space allowed |
| Invalid controls | TAB/CR `invalid_control` under both options |
| Counters | per-gap 4 match / 5 overflow; total 64 match / 65 overflow |
| Persisted bytes | unchanged |
| Full property execution | all five property predicates enumerated under Unicode 17.0 |

The Owner-facing INCLUDE consequence is now accurate: it protects direct and bounded stealth-format variants, but a visible separator can evade only the two DeepSeek literal rules. That tradeoff is explicit and mechanically aligned with the proposed grammar.

## 6. M03 non-regression disposition

**PASS / unchanged.** Profile SHA-256 remains `ce5bdd54c7924e86fcf36e89f10c96a039814366862382c2df81e0a15cf13141`.

| Probe | Independent result |
|---|---|
| exhaustive discriminated PGlite/Postgres seam | exit 0, no diagnostics |
| unnarrowed database union projection | exit 2, TS2375 |
| cross-driver PGlite→Postgres-HKT handoff | exit 2, TS2375 |
| prior independent Reviewer positive | exit 0, no diagnostics |

The exact Phase B root, five imports, explicit two branches, one runtime generic factory call, zero wrapper/discriminator crossing, Phase D/adapter absence and empty Production Provider registry remain coherent. V1.1 neither reopens nor changes M03.

## 7. Findings

### Blocker

None.

### High

None.

### Medium

None. TECH-M01 is closed by independent semantic reproduction.

### Low

None.

### External Validation

None. This gate makes no Provider, network, database-runtime, deployment or Production claim.

## 8. Disclosed whitespace boundary

The global `git diff --check 87bf502...HEAD` exits 2 for exactly three Markdown two-space hard breaks in the imported, SHA-protected prior Reviewer evidence. The V1.1-owned `git diff --check f1af1f8...HEAD` exits 0.

This review does not misreport the global check and does not alter immutable independent evidence. The preserved historical hard breaks are not a V1.1 defect.

## 9. Owner package and governance ruling

The combined package is **Owner-decision-ready**:

- `M02-D1-INCLUDE` and `M02-D1-EXCLUDE` are exact, mutually exclusive and hash-bound;
- INCLUDE's protected forms and visible-separator evasion boundary are fully disclosed;
- EXCLUDE's loss of direct DeepSeek/model protection and security-exception ADR requirement are fully disclosed;
- `M03-D1-DISCRIMINATED-SEAM` versus return for a new scoped proposal is precise;
- technical recommendation, null Owner selection and absent implementation authority are distinct; and
- no fourth implementation, failed-code reuse, corrected Design or later-phase start exists.

Decision/complexity impact:

| Item | Ruling |
|---|---|
| Schema / Migration | none |
| Dependency / package / lock | none for recommended route |
| New persistent-coordination Complexity Approval | none |
| ADR for INCLUDE | none |
| ADR for EXCLUDE | Owner-approved security-exception ADR required |
| Corrected Design | required only after Owner selection; must be hash-bound and independently reviewed |

## 10. Eligibility and next gate

Owner-decision eligibility: **YES**.

Implementation eligibility: **NO**.

The next and only gate is Coordinator submission to the Owner of these two exact choices:

1. `M02-D1-INCLUDE` versus `M02-D1-EXCLUDE`; and
2. `M03-D1-DISCRIMINATED-SEAM` versus return for a newly scoped proposal.

No option is selected by this review. After Owner selection, the process still requires an exact corrected Design Candidate and Fresh Independent Design Review PASS before any implementation cycle. No merge, Push, Provider/API/credential/network/spend, Staging/Production, Deploy, Publish, Index, formal import or Phase C/D/E action is authorized.

## 11. Deliverables

- Main report: `docs/PHASE_1B_STAGE4A_PHASE_B_THREE_STRIKE_TECHNICAL_ESCALATION_INDEPENDENT_REREVIEW_V1_0.md`
- Evidence: `docs/review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-independent-rereview-v1/INDEPENDENT_TECHNICAL_ESCALATION_REREVIEW_EVIDENCE_V1_0.md`
- Independent TECH-M01 compiler/challenge and output in the same evidence directory
- Verification summary in the same evidence directory
- Manifest: `docs/review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-independent-rereview-v1/SHA256SUMS.txt`

Exact reviewer artifact hashes are recorded in the manifest and Coordinator callback.
