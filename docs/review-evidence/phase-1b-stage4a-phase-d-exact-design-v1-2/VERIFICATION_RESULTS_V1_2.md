# Phase D Exact Design V1.2 Verification Results

Prepared: `2026-08-13`

This is design-author verification evidence, not independent acceptance.

## 1. Baseline and immutability

```text
branch = codex/phase-1b-stage4a-phase-d-exact-design-v1
Candidate parent = 097d6a570762fb2f19d499fb9fc873bae0dc1d67
V1.1 parent = 52244f7f80bec29ccedb0ba1faa0075be50db36f
accepted Phase C base = 9006b638ed51f981f7477829086244627c488d6b
Attempt 1 re-review = 33f2e5619dc3c1a75345c077858fe1f91d6317c0
Attempt 1 re-review parent = 097d6a570762fb2f19d499fb9fc873bae0dc1d67
```

Immutable document SHA-256 checks:

```text
Owner Decision V1.0 = c28f025dda1f91de7ed7040f588e37e4d9defccee0207c5aded5cf34feabb6d6
Exact Design V1.0 = 94baa8c87655baf6d482e27dfe5d550588a911a2374167f7f548ab84b1d480f5
Exact Design V1.1 = 5cb292497b69ca8681584f859956949672ab8111eeb4d4fcf7b7da037c03db5d
```

Neither predecessor nor either independent review/evidence tree changed.

## 2. Accepted-contract and finding verification

- Pinned Node `24.14.0` reran the immutable Attempt 1 fixture and reproduced `context_prohibited_data` plus `output_policy_rejected`.
- The replacement fixture passed PD-11 prefix, accepted classifier (`allow`), accepted request binder/fingerprint and accepted Product output policy (`draft_human_review`).
- Every current byte/hash/identity/cost fact was derived from accepted code, not copied from an authored expectation.
- V1.1's L-02 contradictory one-versus-two source statements and L-03 preflight-versus-preparation credential reads were reproduced from immutable line evidence before replacement.
- M-02 manual no-follow/header semantics and L-01 strict success/service-tier removal remain unchanged and independently closed; no current design clause weakens them.

Detailed results: [accepted-contract execution](./ACCEPTED_CONTRACT_EXECUTION_RESULTS_V1_2.md), [finding dispositions](./FINDING_REPRODUCTIONS_AND_AUTHOR_DISPOSITIONS_V1_2.md).

## 3. Official-source verification

Two and only two public documentation reads were executed with Node built-in fetch, `redirect:"manual"`, bounded bytes and no credential/API call:

```text
official_pricing_get=1
official_chat_completion_schema_get=1
official_source_get_total=2
billable_post=0
```

Both fixed URLs returned `200`; raw byte counts/hashes and required model/version/rate/schema facts matched the V1.1 observation. `service_tier` occurrences remained zero. Supplier assurance remains unresolved residual-risk-only. See [official-source evidence](./OFFICIAL_DEEPSEEK_PRIMARY_SOURCE_REVALIDATION_V1_2.md).

## 4. Consumer and architecture impact

Accepted-tree symbol scans covered Provider contracts/results, attempt evidence/history, pricing, durable service/Worker/fence, explicit source identity/context policy, request binder/Product output policy, root and architecture checker. The only new edges are the controlled runner to one two-source preflight module and adapter preparation to its sole private selected credential reader.

The design preserves one Provider registry, orchestration, `ai_runs`, Worker/retry/fence/writer/settlement, pricing, Prompt, root and checker. It adds no persistent state or compatibility path. No Schema, Migration, ADR, env-schema, Production Prompt, dependency or lockfile change is needed. See [consumer closure](./ACCEPTED_PHASE_C_CONSUMER_CLOSURE_V1_2.md) and [governance assessment](./GOVERNANCE_AND_COMPLEXITY_ASSESSMENT_V1_2.md).

## 5. Structural gates

- relative Markdown links: **PASS**;
- closed V1.2 stale Attempt 1 tuple scan: **PASS**, every named stale value count zero;
- credential-shaped value scan: **PASS**, every configured secret shape count zero; values were never printed;
- path inventory: **PASS**, only the V1.2 design and its V1.2 evidence directory are new;
- exact implementation mutation allowlist: **PASS**, two new source-preflight paths are explicitly named and no wildcard exists;
- docs-only whitespace/diff check: **PASS** after staging/final verification;
- artifact manifest and SHA-256 inventory: **PASS** in the package root; and
- final worktree cleanliness: required after the docs-only commit.

No Build, product unit/browser suite, database mutation, credential check or real Provider/API/model test was run. Those are unnecessary or forbidden for this docs-only design task. The future real validation remains `NOT_RUN`, never PASS.

## 6. Decisive readiness result

`DESIGN_AUTHOR_READINESS=READY_FOR_FRESH_INDEPENDENT_V1_2_REREVIEW`

This means the three bounded findings are addressed in design and the Candidate is coherent enough to review. It is not an acceptance verdict and does not authorize implementation.
