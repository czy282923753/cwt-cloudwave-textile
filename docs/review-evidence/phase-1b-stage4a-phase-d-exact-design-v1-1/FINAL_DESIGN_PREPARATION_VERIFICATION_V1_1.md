# Phase D Exact Design V1.1 Final Preparation Verification

Status: **PREPARED FOR FRESH INDEPENDENT RE-REVIEW / NOT SELF-ACCEPTED**

Date: `2026-08-12`

## 1. Identity and immutable history

```text
accepted Phase C checkpoint/ref:
9006b638ed51f981f7477829086244627c488d6b

original V1.0 Candidate / required V1.1 parent:
52244f7f80bec29ccedb0ba1faa0075be50db36f

independent FAIL review:
797bbe29972e3c9e67b43879cf513b9eed457c84

independent FAIL review direct parent:
52244f7f80bec29ccedb0ba1faa0075be50db36f

Phase C independent PASS review direct parent:
9006b638ed51f981f7477829086244627c488d6b

branch:
codex/phase-1b-stage4a-phase-d-exact-design-v1
```

The Owner Decision, V1.0 Design/evidence and independent FAIL review were not edited, deleted, merged or rewritten. Recomputed immutable hashes:

```text
c28f025dda1f91de7ed7040f588e37e4d9defccee0207c5aded5cf34feabb6d6  Owner Decision V1.0
94baa8c87655baf6d482e27dfe5d550588a911a2374167f7f548ab84b1d480f5  Exact Design V1.0
314e809838edc30b0db77b9d1d9d8df5644d7bebd5e92290f04036fa81665d35  V1.0 SHA256SUMS
93a7f870610229802945b3451a755d1c393f1051cd2391a9e42cb857bed057ad  independent FAIL report
89d7c301a529233d1c47a61f21f670f3ef65c8b9ba69e4fc3edc762bfc25c0e9  independent finding reproductions
9c97f5cdf759ed68992953750ad148076c58b43f762758df7ede49ae9d27cf98  independent reproduction
```

The entire predecessor V1.0 manifest passed `shasum -a 256 -c`. Source/scripts/config/package/lockfile/test-fixture bytes at `52244f7...` are identical to accepted Phase C base `9006b63...`; the predecessor range is docs-only.

## 2. Finding reproduction and addressed result

| Finding | Reproduced | V1.1 preparation result |
|---|---|---|
| `M-01` | V1.0 direct script→adapter/projection bypass and unfrozen fixture confirmed | one Domain Service/enqueue/Audit/row/claim/fence/execute/settlement path; exact fixture/identity/projection/fault model frozen |
| `M-02` | Node 24 `redirect:error` broad rejection and runtime-added headers confirmed | `redirect:manual`, status-first no-follow, exact app/runtime header policy and actual loopback obligation frozen |
| `L-01` | current official schema page has zero `service_tier` occurrences | field removed; unknown success fields remain fail closed |

These are remediation preparation results, not an independent PASS.

## 3. Fixture and architecture closure

- Sole fixture JSON block strict-parsed successfully.
- Fixture JCS hash reproduced: `5dca06e49a917c926ccf049e27fd176e8ecf0faccf5680fc74eae4c2140d18db`.
- Prompt JCS-plus-LF hash/bytes reproduced: `4b10f323eff0afd5cc856371f0655eef09c4b2eea86c47d308658950b3f142be`, `1,247` bytes.
- `maxAttempts=1`, input/output `2,048/64`, upper/run ceiling `305/400` microusd and exact fixed UUIDs are closed.
- Request/input/config/Prompt/envelope/Provider-request identity hash chain is specified and reproducible from accepted canonicalization.
- Accepted-tree Provider/result/evidence/pricing/root/service/Worker/fence/context/claimed consumers were scanned and dispositioned.
- Every newly required implementation/test/evidence path is named; any other need is `NEEDS_OWNER_DECISION`.
- No second root, queue, retry, history, writer, pricing, Prompt, budget or dispatch authority is introduced.
- No Schema, Migration, ADR or dependency is needed.

The accepted Phase C V4 architecture gate was run unchanged against this docs-only worktree with the exact installed dependency binding. It exited `0`. The temporary physical dependency projection used only to satisfy the checker's excluded-root invariant was removed immediately and is absent from the Candidate.

## 4. Official-source result

Nine exact official URLs were fetched through HTTPS on `2026-08-12` without credential or API/model call. All returned `200`; raw byte counts and SHA-256 are recorded in the source evidence. API-doc raw hashes drifted after V1.0/review publication, while the bounded model/rate/protocol facts remained stable. V1.1 updates the pricing source hash rather than concealing drift.

Current strict findings:

```text
pricing source SHA-256:
3af5e5d6992a4e26709ed37f02d9bfbc46ee92dc825e6588404728419f41ce71

Chat Completion source SHA-256:
2948bb768f4fedca3837bd402ca5bf7ca864b7bc6ef68312f82ebe4fb8ea9a3a

service_tier literal occurrences in Chat Completion page:
0
```

Supplier assurance remains unresolved/Owner-accepted residual risk only. No DPA/no-training/region/cache-disable/subprocessor/enterprise guarantee is inferred.

## 5. Structural and negative checks

Preparation checks completed:

```text
relative/local Markdown links: 6 checked, 0 missing
V1.1 mutation paths outside exact two allowed scopes: 0
predecessor source/config/Schema/Migration/dependency/lockfile/env/Prompt mutation: 0
credential-shaped DeepSeek key patterns: 0
Bearer-value patterns: 0
direct DEEPSEEK_API_KEY assignments: 0
real DeepSeek credential access: NOT RUN
real DeepSeek API/model call: NOT RUN
billable POST: NOT RUN
database migration/seed/Provider harness: NOT RUN
Staging deployment/Phase E/F/G/Production/Publish/Index/Push: NOT RUN / NOT AUTHORIZED
```

The negative scan reported counts only and printed no matching value. Final staged `git diff --check`, closed diff, manifest verification, commit ancestry and clean-state checks are completed after this file is frozen; exact Candidate HEAD/clean state belongs in the coordinator callback and fresh review binding, not a self-referential document.

## 6. Preparation conclusion and next gate

The V1.1 Candidate is prepared to be independently challenged for exactly `M-01`, `M-02`, `L-01` plus every preserved-closed boundary. The Design author does not accept it. Real Provider behavior and protected Staging remain `NOT RUN`.

Next gate: **fresh independent Phase D V1.1 Exact Design re-review in a different task**. No implementation may start from this preparation record alone.
