# CWT Stage 4A Phase B — Corrected Exact Design V1.9 V18-M01/M02/M03 Remediation and Derivation Audit V1.0

## 1. Status and authority

- Status: **REMEDIATION CANDIDATE / NOT SELF-APPROVED / IMPLEMENTATION NOT AUTHORIZED**
- Scope: docs/profile/verifier/evidence only
- Exact V1.8 parent: `a2cd31f53c34dad479862a1c67260ab71fda9805`
- V1.8 direct parent: `8eac88210d41b5e37ab5963acc7ee28d007c4fd3`
- V1.9 branch: `codex/phase-1b-stage4a-phase-b-corrected-design-v1-9`
- Immutable checkpoint: `codex/checkpoint/phase-1b-stage4a-phase-b-nm01-pre-design-v1 -> b7ad96b24da45de00cae2cdb961a9aefcbc99496`
- Accepted V1.7 ancestor: `3f475e13d73d9d68a4dfb9a040941c57f1ee92e6`
- Frozen Tag peel: `phase-1b-stage3-approved-2026-08-09 -> 31c0e405acfdd0d05200d0fb2531e897a541a2c4`
- V1.8 independent result: **FAIL**, Blocker `0`, High `0`, Medium `3`, Low `0`
- Remediation content checkpoint: recorded after its atomic commit below

This task corrects only V18-M01, V18-M02 and V18-M03. The Owner-selected `IMP2-NM01-STRUCTURAL-INTEGRITY-DOMAIN`, `M02-D1-INCLUDE` and `M03-D1-DISCRIMINATED-SEAM` directions remain unchanged. This record is not Owner approval, independent Review, implementation authorization or consumption of implementation correction attempt 3.

## 2. Fixed input verification

Before the first V1.9 mutation, the formal worktree was clean at exact V1.8 HEAD. Parent, checkpoint, accepted V1.7 ancestry and frozen Tag peel all matched. The immutable checkpoint record remained SHA-256 `07e6c7a6335b34e1c5dd30411e38ff4d7610b4988a31cfd29a51e9f7d414b167`.

The V1.8 fixed artifacts recomputed exactly:

| Artifact | SHA-256 |
|---|---|
| Standalone V1.8 Design | `4fc11c42c4091f8ed8d1e802dc1b4829a6df89a82c4668f898469135eda0666b` |
| V1.8 derivation report | `bb623d36490a81b15df54055ff38c2762abffc796905e2f9d1cfeabc175dcf4d` |
| IMP2-NM01 Owner record | `277b0f8ac7379552bea53f08304dad59dbeb492c61c02f987ff86c76c69866fa` |
| V1.8 machine profile | `16084d40d00b21e184e42a65caa2c11e85e2861ea3d081b5235265967ac408d4` |
| V1.8 fixed vectors | `435f8f6ff515ce33923fe642bca1cba4e1406b91d26a4770bddde21633ee4a7d` |
| V1.8 verifier | `22f304c55fb81499fcac8f35c3b2ae090d056aba8d89b8f699572b4f31282fc7` |
| V1.8 capture | `8cac7702a0332cb3fbb0d97c88228caabe38eb4eda738ae0904c24157f4aa27d` |
| V1.8 fixed inputs | `abb437961273700781cf14fb652fb482526040b0e97022bd93bab6a80a33fe24` |
| V1.8 manifest | `ca51146d16d16372dbef4cc5f7d5153d09f5502de95b11659c2ee3bc44a9bb1a`, `21/21` PASS |

The Fresh independent V1.8 FAIL authority was fully read, recomputed and imported byte-identically:

| Artifact | SHA-256 |
|---|---|
| Review report | `556efabf708a74c2ab76a2725354f91f1094a198fb791935563e26b7adc2665a` |
| Review evidence | `9e29864e4253f1e053be95bb5965756ea6c2fa7d8fbae826c269b7ab84c92d80` |
| Reviewer challenge | `ed175fbae34940faef2b6811e1ee7ee2b8a8c0f0e65cdb05214b02be476fcb18` |
| Challenge output | `b58ab3d1b0d3b2b20168062817a22139b3a4ef337de08f4cc1b8adc63364577d` |
| Reviewer manifest | `73a08831eb64751d87b0b798be95194da05753cef33c28f1d3b3cc10f44eb29f`, `7/7` PASS |

The import is atomic commit `901e87c620c52458c0a56613ec87353dbe240319`, direct child of V1.8. Imported Markdown hard-break spaces are immutable Reviewer bytes and are excluded from owned-file whitespace claims.

## 3. Root cause and replacement boundary

The three findings share one design-package authority defect:

1. V1.8 prose invented two traversal result names outside the unique closed `AiErrorCode` tuple.
2. V1.8 profile/§13 context order and §18 claimed order acted as two writable replay authorities.
3. V1.8 mutation evidence changed a field assignment without binding the validator to the reviewed profile identity, then incremented a counter after successful validation. Its evidence-value helper also stopped at primitive arrays/one object level.

V1.9 replaces those projections instead of layering compatibility:

- traversal zero/multiple/profile-identity failure maps directly to existing `context_provenance_mismatch`;
- one profile object owns the closed taxonomy projection, recursive grammar and `CR-01..CR-14` claimed order;
- the compiled profile identity is checked before recursive traversal, so a domain demotion cannot become accepted merely because the demoted payload satisfies a broad structural string check;
- the verifier increments mutation results only after it captures an actual failure;
- one child self-test deliberately restores the old false counter behavior and must exit `97`, proving a restored bug makes the verifier nonzero.

There is no second error map, classifier, traversal, replay array, gap table, path exception, consumer exception or compatibility route.

## 4. Exact V1.8 → V1.9 change map

| Boundary | V1.8 defect | V1.9 exact replacement |
|---|---|---|
| V18-M01 error code | `context_domain_unclassified` / `context_domain_ambiguous` absent from `AiErrorCode` | both and profile identity drift return existing `context_provenance_mismatch`; proof reasons are non-public assertion labels only |
| V18-M01 projection | category/retry/manual/persistence projection incomplete | all 69 codes are byte/order-checked against `aiErrorCodes`; `aiFailure` fixes category, retryable, manual and safe message; one common rule fixes telemetry, persistence, Phase C and precedence |
| V18-M02 order | context-before-config profile contradicted config-before-context §18 | profile `CR-01..CR-14` is sole order; §13.2.3 marker, §18.4 list and §18.5 rows are exact checked projections |
| Context order | no single phase boundary | `CR-03..CR-08` completes association/context shape, profile, recursion, M02 and JCS/hash before config/Prompt/envelope/adapter resolution |
| Adapter boundary | adapter policy was consulted before context despite contrary prose | config `CR-09`, Prompt `CR-10`, envelope `CR-11`, resolution/request `CR-12`, sole call `CR-13`, output `CR-14` |
| V18-M03 demotion | successful demoted validation counted as detection | reviewed profile projection SHA `48d2b635...` checked before traversal; machine/closed demotions both actually throw `context_provenance_mismatch` |
| Evidence grammar | primitive array or one-level object subset | exact recursive JSON value grammar with depth/node/context bounds; every object key and string leaf uses the same selected M02 identity |
| Mutation accounting | unconditional counter increment | one `detect` helper first captures an actual thrown failure, optionally checks its exact code, then appends its label |
| Verifier self-test | absent | restored-old-bug child accepts the demoted email and deliberately exits `97`; parent requires exactly that nonzero status |

All other V1.8 clauses remain standalone in V1.9. The V1.8 file and all historical manifests remain byte-identical.

## 5. Single machine authority

[V18 M01/M02/M03 Machine Profile V1.0](review-evidence/phase-1b-stage4a-phase-b-corrected-exact-design-v1-9-v18-remediation-v1/V18_M01_M02_M03_MACHINE_PROFILE_V1_0.json) has:

- one profile ID/version and compiled projection SHA;
- exactly `35` context-node assignments and `3` disjoint domains;
- one selected M02 registry identity, SHA-256 `264ca6358dcec00da5bc17e134c89e52d5321c87683212b8c32ba12756700b66`, `32` rules;
- one recursive evidence grammar;
- one complete `69`-code checked error projection;
- one `14`-step claimed-replay order; and
- zero second classifier, consumer exception, path exception, compatibility traversal or bypass.

The TypeScript probe derives its legal return tuple against the real `AiErrorCode` union under `--strict`, and the verifier compares the complete profile projection to `aiErrorCodes` and `aiFailure`. The probe/profile are checked derivatives; `src/ai/errors.ts` remains the unique implementation tuple/factory authority.

## 6. Executed proof

Pinned runtime: Node `24.14.0`, V8 `13.6.233.17-node.41`, ICU `78.2`, Unicode `17.0`, CLDR `48.0`, Darwin arm64.

Fresh verification reported:

- error taxonomy `69/69` exact and strict type probe PASS;
- claimed order `CR-01..CR-14` exact across profile, §13.2.3, §18.4 and §18.5;
- baseline field-domain coverage `31` materialized nodes, missing `0`, duplicate `0`;
- `1,000/1,000` deterministic lowercase Revision snapshot hashes structurally accepted; `594` contain seven-or-more decimal digits; lexical snapshot calls `0`;
- Reviewer first hash accepted only on exact recomputation/match;
- integrity negatives `8/8`, protected placements `35/35`, machine-field arbitrary text `18/18` rejected;
- recursive nested protected value/key rejected; object-key permutation has equal JCS but different original bytes; array order remains semantic;
- `22/22` executed mutations produced actual failures; the list comes from executed assertions, not declared totals;
- old-bug self-test child exit `97` captured;
- persisted fixed bytes/JCS/`input_hash` identical;
- association metadata Provider leak `0`;
- V1.8 manifest `21/21` and imported independent FAIL `7/7`;
- M03 profile SHA unchanged; Schema map `21/21 + 96/96`.

The capture is deterministic and must equal a fresh verifier stream byte-for-byte. These are design-consistency claims only; no implementation compliance is claimed.

## 7. Non-regression and impact

- M02-D1-INCLUDE: unchanged selected 32-rule bytes, runtime tuple, Unicode grammar/gaps/counters and A-07 identity.
- M03-D1-DISCRIMINATED-SEAM: unchanged profile SHA `1f0b56a870ecbab61c970e1c7000dff591674e0f8ad0a04341538c724a36c173` and type seam.
- Historical closure: `H-01`, `H-02`, `M-01..M-06`, `L-01`, `N-M01..N-M04`, V15-M01 and next-env lifecycle retained.
- Four Draft use cases, human-review-only, no fallback/RAG/vision/customer_support/private data, Provider-neutral core and Phase boundaries retained.
- `input_context_json` shape/bytes, complete-context JCS/`input_hash`, `input_sources_json` purpose and Prompt projection retained.
- `ai_model_config`: `21/21`; `ai_runs`: `96/96`.
- Implementation review state: IMP2-NH01 CLOSED; IMP2-M01/M02/M04 OPEN after attempt 2; IMP2-NM01 remains design-gated; IMP2-M03/M05/L01/L02 frozen CLOSED. No attempt 3 is consumed.
- Schema/Migration/snapshot/journal/seed: none.
- ADR/Owner decision: none required.
- Dependency/package/lockfile: none.
- Persistent coordination/Complexity: none added; compiled proof cost only.
- SEO/URL/Redirect/data/import: none.
- Product source/test/config/Prompt runtime: none changed.

## 8. Rollback and commit plan

The linear rollback points are:

1. `a2cd31f...`: immutable V1.8 Candidate / complete V1.9 rollback;
2. `901e87c...`: byte-identical V1.8 independent FAIL import;
3. remediation content checkpoint: standalone V1.9/profile/vectors/type probe/verifier/capture/audit;
4. final manifest checkpoint: audit identity update plus V1.9 `SHA256SUMS.txt`.

Rollback never moves the existing checkpoint ref or Tag. No merge, Push or history rewrite is authorized.

## 9. Disposition and next gate

- V18-M01: **CORRECTED CANDIDATE**, not independently closed.
- V18-M02: **CORRECTED CANDIDATE**, not independently closed.
- V18-M03: **CORRECTED CANDIDATE**, not independently closed.
- Open Owner decisions: **none**.
- Implementation eligibility: **NO**.

The only next gate is Fresh Independent Corrected Design V1.9 Review by the original Phase B Design Reviewer against the exact final V1.9 commit. PASS must precede any Owner/Coordinator implementation opening. This task does not start Review, implementation correction attempt 3, merge, Push, Provider/API/network work or Phase C/D/E.
