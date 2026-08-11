# CWT Stage 4A Phase B — Corrected Exact Design V1.10 Fresh Independent Review

## 1. Review result

- Review conclusion: **PASS**
- Blocker: **0**
- High: **0**
- Medium: **0**
- Low: **0**
- External Validation: **0**
- Exact Candidate: `codex/phase-1b-stage4a-phase-b-corrected-design-v1-10` at `234cd90211c45c6cc86c988d02c8d5dc2f7858d2`
- Direct parent: `8ea17ddc1dc55a41b0fdd09fceb42f0bf1c270c6`
- Exact start / V1.9: `c0fe5b57100ff7fd83ef50b85288e6160397af80`
- Review role: original independent Phase B Design Reviewer
- Review date: 2026-08-11 Asia/Shanghai
- Design implementation eligibility: **ELIGIBLE FOR COORDINATOR DESIGN-GATE ACCEPTANCE**

V1.10 closes both remaining V1.8 design roots. V18-M01 now states an honest, implementable two-layer proof: all 69 runtime error projections are compared exactly against the unique `src/ai/errors.ts` authority, while TypeScript proves only the selected five-code traversal subset. V18-M03 now requires one input-detached, recursively frozen, module-private compiled product; traversal cannot consume or recover the mutable source profile.

This PASS permits only coordinator acceptance of the exact V1.10 Design Gate. It does not start implementation correction attempt 3, merge, Push, Provider work, or Phase C/D/E.

## 2. Identity, checkpoint, and scope

All mandatory gates passed:

- Candidate ref, exact HEAD, parent, and four-commit linear history matched the assignment;
- the immutable checkpoint ref remained `b7ad96b24da45de00cae2cdb961a9aefcbc99496`;
- checkpoint record SHA-256 remained `07e6c7a6335b34e1c5dd30411e38ff4d7610b4988a31cfd29a51e9f7d414b167`;
- `a90d642da38274ae3fab67ba4d8f284d8ddc5c35` remained a direct child of the checkpoint and changed only the checkpoint record;
- the frozen annotated Tag peeled to `31c0e405acfdd0d05200d0fb2531e897a541a2c4`;
- `c0fe5b5..234cd90` changed exactly 19 added paths and 6,135 insertions, all under `docs/` or `docs/review-evidence/`;
- no source, script, test fixture, Schema, Migration, snapshot, journal, seed, ADR, package, lockfile, runtime, or configuration changed;
- Candidate manifest passed 35/35 and the imported V1.9 FAIL manifest passed 6/6;
- all supplied fixed hashes matched, local links resolved, code fences balanced, no added symlink existed, and start-to-HEAD `git diff --check` exited 0;
- the formal Candidate worktree and detached review snapshot had clean tracked state at review close.

The formal Candidate remained untouched. Fresh probes used only the detached exact-HEAD snapshot and the versioned independent evidence package.

## 3. Fixed artifact verification

| Artifact | SHA-256 |
|---|---|
| Standalone V1.10 Design | `039c26e3026bddff4b398fd516005cb2e2a664e7fd914be6cf31ff8ed1f0ea22` |
| V1.10 remediation/derivation audit | `bcc6182901653d28293000bca206a8be4dea7ea0e01d345e2a3ed2dd214f3f3c` |
| Machine profile | `8f1c7c9c023ed98477cfe9420ceac3648e3e20d2e59032493a1d9f8db15aba83` |
| Compiled identity | `efdec023f886a9ca9d1a558bfba0e54781292e0e8215609c4b68a68268caba01` |
| Fixed vectors | `c3c0c35a0d6535689b127471e973373ed59c894c9fd22ac37f7fe2c4e388dab0` |
| Author verifier | `ec014b6983f86f32199af889879f70a2ecfb9449ccc1ed8e2b16979fafaec5ad` |
| Captured output | `afffb18ba8f48b58d82e41e56522f7b5945a72f3bc03ab9210153c3d80842919` |
| Fixed identities | `97c6c6eea2f59d417aedf07530010f72773ed085088bdfa918a4a5197a2552b2` |
| Candidate manifest | `c28ad59a3ae89f18970c58c87cb50e29e4a43bfe98c322adb8dfb055f712d3f0` |

The imported V1.9 FAIL report/evidence/challenge/output/identity/author-output/manifest hashes also matched `d94716f0...`, `4756eb53...`, `9f1acd0a...`, `447f1750...`, `465917af...`, `0c4d4ed...`, and `fee6dbfc...` respectively.

## 4. Finding dispositions

### V18-M01 — CLOSED after correction attempt 2

`src/ai/errors.ts` remains the sole runtime authority. The profile is a checked derivative and adds no second tuple or map.

The two layers are now explicit and mechanically implementable:

1. Runtime validation compares all 69 codes in source order plus category, retryability, manual-editor availability, and default safe message against `aiErrorCodes` and `aiFailure`.
2. The five traversal codes use `as const satisfies readonly AiErrorCode[]`. No JSON literal-union derivation and no 69-to-5 inverse are claimed.

Fresh verification accepted the positive subset probe and produced real TypeScript failures for an unknown traversal literal, widened JSON string, and false inverse. Twelve independent runtime mutations covering missing/extra/reordered/duplicate codes, category/retry/manual/message drift, and missing/extra/reordered/duplicate traversal members were all rejected.

Zero assignments, multiple assignments, and compiled-profile identity mismatch map only to existing `context_provenance_mismatch`; protected data maps to `context_prohibited_data`; unknown caught failures map to `internal_failure`. No new persisted, telemetry, public, or Phase C code was introduced.

### V18-M02 — CLOSED, non-regression PASS

The V1.10 `executionOrders` subtree is byte-equivalent to V1.9. §13.2.3, §18.4, and §18.5 retain one `CR-01..CR-14` order. Association/context/profile/traversal/M02/JCS/hash checks finish before config, Prompt, envelope, and adapter resolution; the sole adapter call remains `CR-13`.

Fresh order mutations for CR-05/CR-06 swap, context-after-config, missing CR-08, and a second adapter call were rejected.

### V18-M03 — CLOSED after correction attempt 2

The normative compiler accepts only the fixed repository-reviewed profile input, validates the complete identity and contracts, creates a detached recursive copy, freezes the entire retained value, and exposes only a module-private registered product containing identity, a count-only frozen summary, and the validator closure. Traversal accepts the registered compiled product, never raw profile JSON.

The author verifier reproduced both exact V1.9 post-compile demotions and rejected the protected emails. Fresh independent lifecycle challenges additionally established:

- a hostile accessor source was read once during detachment; three later validations did not read it and still rejected the email after the source changed;
- source replacement and a separately compiled product did not affect the first product;
- both independently compiled products rejected nested protected data after the replacement source was demoted;
- a lookalike product with the same public identity/summary was rejected by module-private product membership;
- direct product method, nested summary, and prototype mutation, custom source prototype, shared source alias, and the exact old mutable-source/cache shortcut all failed.

The accessor probe is deliberately outside the normative JSON-byte ingress; it demonstrates closure lifetime and does not authorize getters as profile authority. No traversal path reads the mutable import/source after compilation.

### New findings — none

No genuinely new architecture, security, Schema, scope, or implementability root was found.

## 5. Non-regression and impacts

The following remained exact:

- Owner `IMP2-NM01-STRUCTURAL-INTEGRITY-DOMAIN`, `M02-D1-INCLUDE`, and `M03-D1-DISCRIMINATED-SEAM` selections;
- selected M02 registry SHA-256 `264ca6358dcec00da5bc17e134c89e52d5321c87683212b8c32ba12756700b66` and single context/A-07 identity;
- M03 graph/seam profile SHA-256 `1f0b56a870ecbab61c970e1c7000dff591674e0f8ad0a04341538c724a36c173`;
- accepted V1.7 and all 13 historical closure contracts;
- `ai_model_config` 21/21 and `ai_runs` 96/96; the offline AI-foundation verifier passed;
- `input_context_json` shape/bytes, JCS/`input_hash`, `input_sources_json` purpose, four Draft use cases, human-review-only status, and exact-empty Production Prompt authority;
- Provider-neutral, no fallback, no RAG/retrieval, no vision, no customer-support/private-data, no durable Phase C runtime, and no Publish/Index authority.

Impact disposition:

- Schema/Migration/snapshot/journal/seed: **none**;
- ADR or new Owner decision: **none**;
- dependency/package/lock: **none**;
- persistent coordination/Complexity Approval: **none**;
- SEO/URL/Redirect/public product behavior: **none**;
- formal data/import: **none**.

Implementation finding state remains NH01 closed and implementation M01/M02/M04 open after attempt 2. This design review consumes no implementation correction attempt 3.

## 6. Verification scope and process

Fresh checks used pinned Node `24.14.0`, V8 `13.6.233.17-node.41`, ICU `78.2`, Unicode `17.0`, CLDR `48.0`, Darwin arm64, TypeScript `5.9.3`, and already installed local dependencies. Network, registry, download, materialization, package installation, and Provider calls were zero.

The author verifier ran twice, exited 0 twice, produced byte-identical output, and matched the checked-in capture. The independent challenge then exercised new taxonomy, type, order, source-lifetime, product-membership, and cache/source-replacement variants.

Full application Build/test was not run because the Candidate is docs/evidence-only and changes no executable artifact. Identity, complete machine-profile contracts, actual TypeScript failures, compiled-product behavior, Schema identity, and immutable non-regression hashes are the proportionate risk evidence.

## 7. Eligibility and next gate

Exact Candidate `234cd90211c45c6cc86c988d02c8d5dc2f7858d2` is **eligible for coordinator acceptance of the V1.10 Design Gate**.

The next gate is coordinator design acceptance. Only a later explicit task may decide whether to start implementation correction attempt 3. No implementation, merge, Push, Provider/external action, or Phase C/D/E starts from this review.
