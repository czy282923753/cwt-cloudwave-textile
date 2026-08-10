# CWT Stage 4A Phase B — Three-Strike Technical Escalation Fresh Independent Review V1

**Review conclusion: FAIL**

**Owner-decision eligibility: NO**

**Implementation status: FROZEN / NOT ELIGIBLE / NO ATTEMPT 4**

**Finding count: Blocker 0 / High 0 / Medium 1 / Low 0 / External Validation 0**

Date: 2026-08-10 Asia/Shanghai

## 1. Decision

The exact technical-escalation Candidate at `87bf5025587b223aef3929172411cfeeb6fb1ca7` is **FAIL** under `docs/REVIEW_POLICY.md`.

The clean-restart lineage, M03 discriminated database seam, capability graph, exact Owner/implementation authority separation and three-strike governance all pass this review. The package nevertheless is not ready for Owner choice because its recommended M02-D1-INCLUDE option contains a deterministic contradiction between its normative grammar and its promised false-positive boundary:

- the common policy admits `Punctuation` and `White_Space` as insertion code points;
- the DeepSeek whole-token rule permits up to four admitted insertion code points between every consecutive literal atom; therefore `deep-seek` and `deep; seek` match the `deepseek` rule; but
- the escalation report, Owner package and mandatory corpus all state those same strings are allowed.

The checked-in verifier reports 25/25 corpus PASS only because its witness classifier removes exactly LF, U+034F and U+200B. It does not evaluate the normative Unicode insertion-property union, so it never exercises hyphen, semicolon or ordinary space as declared insertion characters.

This is one Medium finding at the M02 decision-contract root, not a new implementation attempt or a fourth patch. The M03 option is precise and implementable, but the package must present both Owner choices accurately before either may be submitted. Candidate code, accepted Design and ADR remain untouched.

## 2. Exact identity, clean restart and isolation

| Item | Independently verified value |
|---|---|
| Candidate ref | `codex/phase-1b-stage4a-phase-b-three-strike-technical-escalation-v1` |
| Exact ref / detached review HEAD | `87bf5025587b223aef3929172411cfeeb6fb1ca7` |
| Direct parent | `6bf81cbebbe9c17aff668049fbc6f3c43a44bf80` |
| Clean restart checkpoint ancestor | `6bc26cf035608a21a057d6f4e87da8d4f7f23d40` |
| Escalation commit chain | `f854c3e1...` -> `8d7622c8...` -> `6bf81cbe...` -> `87bf5025...` |
| Candidate worktree | `/Users/calvin/.codex/worktrees/263d/CWT（CloudWave Textile）项目` |
| Independent review worktree | `/private/tmp/cwt-three-strike-technical-escalation-review-v1.xO5nYn` |
| Candidate tracked state | clean before and after verification |
| Review tracked state | Candidate tracked files clean; only this new untracked reviewer package added |
| Frozen tag object / peel | `1c626f9b788e4c6ed0480a7040aa54ccef3e6c76` / `31c0e405acfdd0d05200d0fb2531e897a541a2c4` |

The complete checkpoint-to-Candidate diff is exactly 22 added paths and 8,637 insertions, confined to the two reports and their `docs/review-evidence` package. There is no Product source, project script, test-fixture, package, lockfile, Schema, Migration, ADR, accepted-Design, runtime or configuration change.

`f27cadf97a1b3187bdc9655a7411ce7aac1ebc4b` and failed implementation commits `755e514...`, `a696325...`, `b1a73bb...`, and `d8a24d...` are not Candidate ancestors. The escalation commits descend directly from accepted checkpoint `6bc26cf...`; failed code is not a code source or compatibility base.

## 3. Fixed artifacts and manifest

All fixed identities match:

| Artifact | SHA-256 |
|---|---|
| Technical Escalation V1.0 | `417d52671ba1348407c8daf90005c9c8054694d7e5a8da943eb8d26162d55014` |
| Owner Decision Package V1.0 | `e331f16b86c0f35122fbfa550b5af60d063861756f9dcb11a80dd406e534222e` |
| Candidate `SHA256SUMS.txt` | `8eee38478e3d652520fbc1363b66a0edd47d989c25f7e0e1b15fa2c7d9797908` |
| Accepted Design V1.4 | `48e6afebfba53f65c03077a1ca27522f0245f17cbd0b3b46ff492929cf1e0c07` |
| ADR-0018 | `c60d71f293da6fe082c94927650e731d26abcdb238ba94863655053e22ab1f2f` |

The Candidate manifest verifies all 21 entries. Authority, database type, package/lock and paused prior-review hashes in `FIXED_INPUTS_V1_0.json` were independently recomputed. No identity mismatch was found.

## 4. Authority and method

The review read the applicable authority and full escalation decision package, including:

- root `AGENTS.md`, `docs/ENGINEERING_GOVERNANCE.md`, and `docs/REVIEW_POLICY.md`;
- accepted ADR-0018 and accepted Design V1.4;
- both technical-escalation reports;
- fixed-input, M02 decision/common-policy/INCLUDE/EXCLUDE/corpus profiles;
- the complete M03 graph/seam profile and all three type probes/configurations/captures;
- the offline verifier and captured output; and
- actual `src/db/types.ts`, `src/db/client.ts`, `src/config/env.ts`, `tsconfig.json`, `package.json` and repository database-discrimination conventions.

Failed implementations were used only as negative historical evidence. Accepted Design/ADR/Owner instructions remained authoritative.

Verification was offline and proportional to a docs/evidence Candidate. No package manager, install, download, registry, Provider/API/credential, network, spend, database mutation, Staging/Production, Deploy, Publish, Index, formal import, merge or Push was used. Installed local dependencies were used read-only for TypeScript probes.

## 5. Offline verifier reproduction

Exact positive runtime:

```text
Node 24.14.0
V8 13.6.233.17-node.41
ICU 78.2
Unicode 17.0
CLDR 48.0
darwin / arm64
TypeScript 5.9.3
```

The author verifier was run twice from the clean Candidate worktree:

- both runs exited 0;
- their output was byte-identical;
- the payload was byte-identical to the captured output after its command/exit header; and
- default Node 25.8.1 failed closed with exit 1 before profile acceptance.

The reproducible author PASS is evidence, not review authority. Its M02 classifier does not implement its own declared insertion language: at lines 543 and 624 it strips only `U+000A`, `U+034F` and `U+200B`, while the policy admits five whole Unicode properties. The independent semantic challenge therefore reaches a different and controlling result for punctuation/space cases.

## 6. Finding dispositions

| Boundary | Disposition | Ruling |
|---|---|---|
| Clean-restart/three-strike governance | PASS | No fourth implementation, cherry-pick, failed-code ancestor or compatibility base. |
| M02 INCLUDE/EXCLUDE identity and single-authority shape | PASS in structure | Options are unselected, mutually named and differ at rule level only by the DeepSeek prefix, one whole-token rule and later priority shift. |
| M02 exact false-positive/security semantics | **FAIL / OPEN** | INCLUDE's normative insertion language contradicts its mandatory corpus and Owner-facing consequences. |
| M03 discriminated AppDatabase seam | PASS | Exact switch is type-safe; invalid union/cross-driver handoffs fail. |
| M03 graph/capability containment | PASS | Root, edge, absence, empty-registry and unsupported-acquisition contracts are coherent. |
| Owner/Design/implementation authority separation | PASS | Recommendation, pending Owner selection and absent implementation authority are explicit. |

## 7. Findings

### Blocker

None.

### High

None. No executable Product change or prohibited capability was introduced.

### Medium

#### TECH-M01 — M02-D1-INCLUDE promises a false-positive boundary that its normative insertion grammar cannot satisfy

**Locations:** Technical Escalation V1.0 §§4.4, 4.6 and 4.8 (notably lines 163, 247 and 251); Owner Decision Package §2 line 51; `M02_PROTECTED_DATA_AUTHORITY_PROFILE_V2_0.json` lines 139–146; `M02_GRAMMAR_REGISTRY_INCLUDE_DEEPSEEK_V2_0.json` rule `value.provider-selected-name.lexical.v1` beginning line 2016; mandatory corpus lines 120 and 148; verifier lines 543 and 624.

**Deterministic reproduction:** the whole-token rule is:

```text
wordBoundary + literal("deepseek") + wordBoundary
```

and declares a gap between every consecutive consuming atom with 0..4 admitted insertion code points. The admitted set includes `Punctuation`, `White_Space`, `Separator`, `Mark` and `Default_Ignorable_Code_Point`, minus invalid controls. Therefore:

- `deep-seek` matches because `-` is `Punctuation` in the p→s gap;
- `deep; seek` matches because `;` plus ordinary space are two admitted insertions in the p→s gap; and
- both are classified `provider_override` under INCLUDE.

The mandatory corpus and Owner package instead promise `allow` for those forms. A fresh Node 24.14.0 matcher derived directly from the selected rule and policy reproduced both matches while also reproducing the intended direct, U+200B, LF, U+034F and model-prefix matches.

**Verifier integrity:** `classifyWitness` is only a three-character shortcut. It transforms `[normalized, normalized.replace(/[\u000a\u034f\u200b]/gu, "")]` and never evaluates `Punctuation`, general `White_Space`, `Separator` or the full declared property union. Its 25/25 PASS therefore mirrors selected fixtures, not the normative insertion language.

**Impact:** the Owner cannot know the actual operational/security tradeoff of M02-D1-INCLUDE. If implemented as specified, legitimate B2B prose containing `deep-seek` or ordinary `deep; seek` is rejected despite the package's contrary promise. If implemented to satisfy the corpus, the implementer must invent a rule-specific gap exception that the sole authority does not define. Either path breaks the exact decision contract and risks another grammar/proof split.

**Required docs/profile-only correction:** reconcile one authority before resubmission. Either:

1. retain the declared all-adjacency insertion set and truthfully present `deep-seek` / `deep; seek` as rejected, with exact false-positive consequences for Owner selection; or
2. define a mechanically closed, single-authority DeepSeek gap policy that preserves the promised safe forms while stating which obfuscations are no longer covered.

The mandatory corpus and offline verifier must be generated/evaluated against the full selected transition language, including every admitted Unicode property—not a handpicked deletion list. This review does not choose the tradeoff or edit the Candidate.

### Low

None.

### External Validation

None. This gate makes no Provider, PostgreSQL runtime, deployment or Production claim.

## 8. M02 independent ruling

| Check | Result |
|---|---|
| Owner selection remains null | PASS |
| INCLUDE vs EXCLUDE mutually exclusive and exact-hash-bound | PASS |
| 31 vs 30 rules | PASS |
| Only DeepSeek prefix/new whole-token/later priority semantic delta | PASS |
| Direct whole-token `DeepSeek` | PASS |
| Direct prefix `deepseek-` and `deepseek-v4-flash` | PASS |
| Bounded U+200B/U+034F/LF insertion | PASS |
| Same closed AST authority for direct/insertion/structured | PASS as proposed architecture |
| Runtime tuple/control/domain/traversal/limits/byte identity | PASS as proposed contract |
| False-positive corpus agrees with normative grammar | **FAIL** |
| Author verifier evaluates full insertion set | **FAIL** |
| EXCLUDE lost guarantee and mandatory security-exception ADR | PASS / accurately disclosed |
| No cumulative word table, second classifier or unbounded equivalence claim | PASS |

The M02 choice is not precise enough for Owner selection until TECH-M01 is corrected.

## 9. M03 independent ruling

The actual repository types confirm:

```text
AppDatabase<TQueryResult> = PgDatabase<TQueryResult, typeof schema>
databaseConnection =
  { kind: "pglite"; db: PgliteAppDatabase; ... }
  | { kind: "postgres"; db: PostgresAppDatabase; ... }
```

Independent results under TypeScript 5.9.3 strict settings:

| Probe | Result |
|---|---|
| checked-in exhaustive discriminated seam | exit 0 |
| checked-in unnarrowed union projection | exit 2 / TS2375 |
| checked-in PGlite→Postgres-HKT swap | exit 2 / TS2375 |
| fresh reviewer `DatabaseConnection`-parameter discriminated seam | exit 0 |

The switch preserves driver-specific HKT inference in each branch. The discriminator, wrapper and driver type do not cross inward. No cast, assertion, `any`, `unknown` round trip, wrapper, visitor, overload escape or second database authority is needed.

The profile's one Phase B root, five imports, protected/excluded roots, exact Phase D/adapter absence, empty Production Provider registry, unsupported acquisition failure and build-only proof requirements are coherent. M03-D1-DISCRIMINATED-SEAM is Owner-decision-ready on its own, but the combined package is not.

## 10. Owner package, decisions and complexity

The package correctly separates:

- technical recommendations;
- unmade Owner selections; and
- absent corrected-Design/implementation authority.

M03-D1-DISCRIMINATED-SEAM versus return-for-new-proposal is clear. M02-D1-INCLUDE versus EXCLUDE is structurally clear, but INCLUDE's false-positive consequence is materially inaccurate, so the full package cannot be submitted for selection.

No Schema or Migration change is indicated. INCLUDE plus the discriminated seam needs no new ADR, dependency, package/lock change or persistent-coordination Complexity Approval after the M02 contract is made internally exact. EXCLUDE still requires the disclosed Owner-approved security-exception ADR. Any alternate database visitor/shared-authority/dependency proposal still requires a new scoped decision as stated.

## 11. Governance and next gate

- Root Cause First / Replace-not-Layer: PASS in direction; the M02 verifier must be converged with the sole grammar rather than patched with another fixture list.
- Clean restart from `6bc26cf...`: PASS.
- Failed implementation refs: evidence-only / PASS.
- Fourth implementation attempt: absent and prohibited / PASS.
- Corrected Design: not authored or authorized / PASS.
- Phase C/D/E and external actions: not authorized / PASS.

Owner-decision eligibility is **NO**. Implementation eligibility is **NO**.

The next gate is a docs/profile/evidence-only correction of TECH-M01 followed by a Fresh independent technical-escalation re-review. No Owner option may be selected, no corrected Design may be drafted as accepted, and no implementation may begin from this FAIL.

## 12. Deliverables

- Main report: `docs/PHASE_1B_STAGE4A_PHASE_B_THREE_STRIKE_TECHNICAL_ESCALATION_INDEPENDENT_REVIEW_V1_0.md`
- Evidence: `docs/review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-independent-review-v1/INDEPENDENT_TECHNICAL_ESCALATION_REVIEW_EVIDENCE_V1_0.md`
- Independent M02 semantic challenge and capture in the same evidence directory
- Fresh M03 positive probe/configuration and combined type-probe result in the same evidence directory
- Author verifier rerun summary in the same evidence directory
- Manifest: `docs/review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-independent-review-v1/SHA256SUMS.txt`

Exact hashes are finalized in the manifest and coordinator callback. This review does not remediate the Candidate or select an Owner option.
