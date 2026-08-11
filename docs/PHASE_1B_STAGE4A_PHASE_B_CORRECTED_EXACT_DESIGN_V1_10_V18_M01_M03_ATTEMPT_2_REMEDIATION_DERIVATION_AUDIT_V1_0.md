# CWT Stage 4A Phase B — Corrected Exact Design V1.10 V18-M01/M03 Attempt-2 Remediation and Derivation Audit

- Status: **CANDIDATE / NOT SELF-APPROVED / IMPLEMENTATION NOT AUTHORIZED**
- Scope: `V18-M01` and `V18-M03` correction attempt 2 only
- Frozen closed finding: `V18-M02`
- Exact start: `c0fe5b57100ff7fd83ef50b85288e6160397af80`
- Start parent: `fcb060edb47c04187ccdaea4cb65b1032dffa828`
- V1.8 ancestor: `a2cd31f53c34dad479862a1c67260ab71fda9805`
- V1.9 FAIL import commit / authoring parent: `487a75a18e5f6f8b57cf13eba765657221aa1619`
- Branch: `codex/phase-1b-stage4a-phase-b-corrected-design-v1-10`
- Worktree: `/Users/calvin/.codex/worktrees/07a1/CWT（CloudWave Textile）项目`
- Immutable checkpoint: `codex/checkpoint/phase-1b-stage4a-phase-b-nm01-pre-design-v1 -> b7ad96b24da45de00cae2cdb961a9aefcbc99496`
- Full rollback: `c0fe5b57100ff7fd83ef50b85288e6160397af80`; architecture-chain rollback remains the immutable checkpoint
- Prepared: 2026-08-11 Asia/Shanghai

## 1. Fixed Fresh FAIL authority

The original independent Reviewer returned FAIL at exact V1.9 Candidate `c0fe5b57100ff7fd83ef50b85288e6160397af80`: Blocker `0`, High `0`, Medium `2`, Low `0`. The imported package is immutable:

| Artifact | SHA-256 | Disposition |
|---|---|---|
| V1.9 independent review report | `d94716f0184642d0b5dedec3f2beab6e7f9ae4fe1925103fad1090f9b3a0b36a` | byte-identical |
| review evidence | `4756eb532e1edd47367cbc43e3a8279e1e8e57c6c7ae73d31f5f0347b8210c65` | byte-identical |
| Reviewer challenge | `9f1acd0afd89a6ebf496561ee7a3b5cdb3372602df29a5e8f0adf42f13255093` | byte-identical |
| challenge output | `447f1750bbde8f8443bc37e4a70c9289de6dcb49538b894f15a396277779a98a` | byte-identical |
| identity capture | `465917afdb0c34c24562140433c47884ad7531bd8a69f858ff279fbd1cdd04a0` | byte-identical |
| author Fresh output | `0c4d4ed6aa69f3d8f4c49a31a1ad04a4e922958a636679070ce2919f9f89d703` | byte-identical |
| imported manifest | `fee6dbfcc572910c958e03cf5f1623723bede5351c56c1cac5ef031ffa53806c` | `6/6 PASS` |

The Reviewer established two same-root residuals. V18-M01's TypeScript file imported the profile only through `void profile`, while the prose claimed a profile-derived 69-member literal union and an impossible 69-to-5 inverse. V18-M03's `baselineProfileCompiled` shortcut returned the mutable source JSON after the first check; post-compile demotion of either protected root accepted an email and exited `97`.

## 2. Root-cause replacement map

### 2.1 V18-M01 attempt 2

Removed authority claim:

- no JSON import is claimed to derive an `as const` 69-member union;
- no inverse from the full `AiErrorCode` union to the five traversal codes exists;
- no generated 69-code TypeScript derivative or second error map is added.

Replacement contract:

1. `src/ai/errors.ts` `aiErrorCodes` plus `aiFailure` remain the unique runtime authority.
2. Layer A is the normative offline runtime closure. The verifier compares the derivative profile against all 69 source codes in source order and against every `aiFailure` projection: code, category, retryability, manual-editor degradation, and default safe message.
3. Layer B is the selected traversal subset. One positive TypeScript probe fixes five literals with `satisfies readonly AiErrorCode[]`; it proves subset assignability only. The unknown catch returns `internal_failure`.
4. Three independent negative fixtures must produce real nonzero TypeScript results: the forbidden full-union inverse, JSON widening presented as a literal union, and an unknown traversal result.
5. Runtime mutations remove, add, reorder, or drift a profile code and add or duplicate a traversal code. Each must cause a caught compiler failure. Zero/multiple/profile identity still map only to `context_provenance_mismatch`; protected evidence remains `context_prohibited_data`; no code is added.

### 2.2 V18-M03 attempt 2

Deleted mechanism:

- `baselineProfileCompiled` and the identity-based early return of the mutable input object are absent;
- validation accepts no candidate profile override and has no `skipCompiledIdentity` route;
- traversal never reads imported profile JSON.

Replacement compiler:

1. accepts only the repository-reviewed profile bytes/plain value;
2. rejects custom prototypes, cycles, sparse arrays and shared object aliases;
3. validates fixed identity keys, the 35 assignments, three domains, recursive grammar, selected M02 identity, 69-code runtime projection, five-code subset, frozen V18-M02 order and Provider projection;
4. recursively copies into new plain arrays/objects, then recursively freezes the detached value;
5. returns one recursively frozen module-private closure with only identity, a count-only frozen summary and `validateContext(context, external)`; source JSON, assignments and domains are not exposed;
6. permits at most a module-private singleton of this sealed product keyed by the fixed identity; it never caches or returns source JSON.

The two decisive Reviewer sequences compile a fresh baseline source, mutate the original `/task/guideIntent` or `/sources/*/fields/*/value/**` assignment to a machine domain, and supply `sales@example.com`. Both traversals use the already detached product and must catch `context_prohibited_data`; neither is run in an exit-97 child. Direct product method/summary/prototype mutation, nested source replacement, custom source prototypes, and alias sharing also fail or demonstrate zero shared reference. The sole child negative precisely restores V1.9's mutable-source/cache shortcut and must exit `97`; any other child result fails the author verifier.

## 3. Frozen V18-M02 and non-regression

V18-M02 remains **CLOSED** and is not redesigned. The V1.10 profile `executionOrders` subtree must be byte-identical to V1.9. The complete §18.4 and §18.5 byte ranges must also be identical; the §13 order marker contains exactly the same `CR-01..CR-14` sequence. Context/integrity remains `CR-03..CR-08`, config/Prompt/envelope remains `CR-09..CR-11`, adapter resolution remains `CR-12`, the sole call remains `CR-13`, and output remains `CR-14`.

The following authorities remain unchanged:

- Owner `IMP2-NM01-STRUCTURAL-INTEGRITY-DOMAIN` direction;
- `M02-D1-INCLUDE`, selected 32-rule registry SHA-256 `264ca6358dcec00da5bc17e134c89e52d5321c87683212b8c32ba12756700b66`, one context/A-07 identity;
- `M03-D1-DISCRIMINATED-SEAM`, V2.2 profile SHA-256 `1f0b56a870ecbab61c970e1c7000dff591674e0f8ad0a04341538c724a36c173`;
- accepted V1.7 context, lifecycle and graph boundaries; all 13 historical closures;
- exact 21/21 `ai_model_config` and 96/96 `ai_runs` mappings;
- unchanged `input_context_json` shape/bytes, full-context JCS/`input_hash`, and `input_sources_json` purpose;
- four Draft use cases, human-review-only output, no fallback/RAG/retrieval/vision/customer-support/private data;
- IMP2-NH01 CLOSED; implementation IMP2-M01/M02/M04 remain OPEN after attempt 2 and are untouched.

## 4. Impact and governance disposition

| Area | Impact |
|---|---|
| Product source/runtime/tests/fixtures/config | none; prohibited and unchanged |
| Schema/Migration/snapshot/journal/seed | none |
| ADR | none required |
| dependency/package/lock | none |
| persistent state/coordination/Complexity Approval | none |
| SEO/URL/Redirect/public behavior | none |
| Provider/API/credential/network/spend | none |
| Phase C/D/E/implementation correction attempt 3 | not started; not authorized |

Complexity falls at the proof boundary: one false type-level inverse and one mutable-source cache disappear. The replacement adds no persistent mechanism, second classifier, second profile, consumer exception or compatibility path. The compiler's immutable closure is the sole representation traversed after validation.

## 5. Deliverables and verification contract

| Deliverable | Path | SHA-256 |
|---|---|---|
| standalone Corrected Exact Design V1.10 | `docs/PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_CORRECTED_EXACT_DESIGN_V1_10.md` | `039c26e3026bddff4b398fd516005cb2e2a664e7fd914be6cf31ff8ed1f0ea22` |
| this audit | `docs/PHASE_1B_STAGE4A_PHASE_B_CORRECTED_EXACT_DESIGN_V1_10_V18_M01_M03_ATTEMPT_2_REMEDIATION_DERIVATION_AUDIT_V1_0.md` | manifest authority; self-hash omitted to avoid recursion |
| single machine profile | `docs/review-evidence/phase-1b-stage4a-phase-b-corrected-exact-design-v1-10-v18-m01-m03-attempt-2-v1/V18_M01_M03_ATTEMPT_2_MACHINE_PROFILE_V2_0.json` | `8f1c7c9c023ed98477cfe9420ceac3648e3e20d2e59032493a1d9f8db15aba83` |
| fixed vectors | `docs/review-evidence/phase-1b-stage4a-phase-b-corrected-exact-design-v1-10-v18-m01-m03-attempt-2-v1/V18_M01_M03_ATTEMPT_2_FIXED_VECTORS_V2_0.json` | `c3c0c35a0d6535689b127471e973373ed59c894c9fd22ac37f7fe2c4e388dab0` |
| honest positive TypeScript probe | `docs/review-evidence/phase-1b-stage4a-phase-b-corrected-exact-design-v1-10-v18-m01-m03-attempt-2-v1/ERROR_TAXONOMY_TWO_LAYER_POSITIVE_PROBE_V1_0.ts` | `3dd2befc93b2bc975339a1c636e6d902f9dc16cfe3bac1af1d9243f91d781f85` |
| three independent negative fixtures | same evidence directory | manifest authority |
| offline verifier | same evidence directory, `VERIFY_CORRECTED_EXACT_DESIGN_V1_10.mjs` | `ec014b6983f86f32199af889879f70a2ecfb9449ccc1ed8e2b16979fafaec5ad` |
| deterministic capture | same evidence directory, `VERIFY_CORRECTED_EXACT_DESIGN_V1_10_OUTPUT_V1_0.txt` | `afffb18ba8f48b58d82e41e56522f7b5945a72f3bc03ab9210153c3d80842919` |
| fixed identities | same evidence directory, `FIXED_INPUT_IDENTITIES_V1_0.txt` | `TO_BE_SEALED` |
| manifest | same evidence directory, `SHA256SUMS.txt` | self-hash reported outside the manifest |

Required final checks are: pinned runtime tuple; profile identity; 69/69 Layer A; positive and three negative TypeScript probes; all executed profile/domain/order/mutability mutations; exact two Reviewer post-compile probes; old-bug child exit `97`; V18-M02 byte/semantic equality; V1.9 FAIL 6/6; V1.8 manifests; persisted bytes/JCS/hash; M02/M03; 21/21 + 96/96; Markdown links/fences/final LF/owned whitespace; `c0fe5b...HEAD` docs/evidence-only scope; V1.9 byte identity; clean worktree; checkpoint exact before and after.

## 6. Attempt and gate disposition

Atomic rollback map:

1. `487a75a18e5f6f8b57cf13eba765657221aa1619` imports only the byte-identical V1.9 independent FAIL package; parent `c0fe5b57100ff7fd83ef50b85288e6160397af80`.
2. `34934943c438b1a619cfd43acdce006605fa76b5` adds the standalone design, this audit, profile, vectors, honest type probes, verifier and deterministic capture; parent `487a75a...`.
3. `8ea17ddc1dc55a41b0fdd09fceb42f0bf1c270c6` changes only the verifier's temporary probe name to include the process ID after a parallel Fresh-run cleanup collision was detected; proof semantics and captured output are unchanged; parent `34934943...`.
4. The final seal commit adds the fixed identities and `SHA256SUMS.txt` and finalizes only this audit's atomic map; its parent is `8ea17ddc...`, and the exact final commit is reported by Git/callback because a commit cannot contain its own hash.

Each commit is independently revertible. Full V1.10 rollback is `c0fe5b...`; the immutable architecture checkpoint remains `b7ad96b...`.

- `V18-M01`: correction attempt 2 Candidate; **not closed until Fresh independent PASS**.
- `V18-M03`: correction attempt 2 Candidate; **not closed until Fresh independent PASS**.
- `V18-M02`: frozen **CLOSED**; unchanged.
- If either open design finding remains after Fresh Review, only one ordinary design correction attempt remains. This task does not authorize escalation, attempt 4, or implementation.
- Next and only gate: original independent Phase B Design Reviewer performs a Fresh Independent Corrected Design V1.10 Review against the exact new commit.

No self-approval, Review launch, implementation, merge, Push, Provider/API/network, Staging/Production, Deploy, Publish, Index, formal data, or Phase C/D/E action is authorized or performed.
