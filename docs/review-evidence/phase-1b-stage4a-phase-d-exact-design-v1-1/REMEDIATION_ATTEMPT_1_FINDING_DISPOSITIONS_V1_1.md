# Phase D Exact Design Remediation Attempt 1 — Finding Dispositions V1.1

Prepared: `2026-08-12`

Original Candidate: `52244f7f80bec29ccedb0ba1faa0075be50db36f`

Independent FAIL review: `797bbe29972e3c9e67b43879cf513b9eed457c84`

Accepted Phase C base: `9006b638ed51f981f7477829086244627c488d6b`

This file records author remediation dispositions only. It is not independent review or acceptance.

## 1. Finding reproduction before remediation

The independent review artifacts were read from exact commit `797bbe29972e3c9e67b43879cf513b9eed457c84` without merging or editing them:

```text
docs/PHASE_1B_STAGE4A_PHASE_D_DEEPSEEK_TEXT_ADAPTER_EXACT_DESIGN_FRESH_INDEPENDENT_REVIEW_V1_0.md
docs/review-evidence/phase-1b-stage4a-phase-d-exact-design-fresh-independent-review-v1/FINDING_REPRODUCTIONS_V1_0.md
docs/review-evidence/phase-1b-stage4a-phase-d-exact-design-fresh-independent-review-v1/INDEPENDENT_REPRODUCTION_V1_0.md
```

Their exact SHA-256 values were independently recomputed as:

```text
93a7f870610229802945b3451a755d1c393f1051cd2391a9e42cb857bed057ad  review report
89d7c301a529233d1c47a61f21f670f3ef65c8b9ba69e4fc3edc762bfc25c0e9  finding reproductions
9c97f5cdf759ed68992953750ad148076c58b43f762758df7ede49ae9d27cf98  independent reproduction
```

Reproduced defects:

- `M-01`: V1.0 Section 13 explicitly kept the validation script away from Domain Service/Worker/repository and gave it a direct adapter result JSON. That bypassed the sole durable fence/attempt/settlement authority and left the after-POST/before-file crash unresolved. It also did not freeze exact fixture bytes/hashes.
- `M-02`: local Node 24 reproduction confirmed `redirect:"error"` rejects without stable HTTP status and built-in fetch emits transport headers beyond the three application headers.
- `L-01`: the current official Chat Completion page contained zero `service_tier` occurrences while V1.0 admitted it as an optional success key.

## 2. `M-01` addressed disposition

V1.1 deletes the direct billable exception at design level. The controlled path must now use:

```text
Draft Domain Service -> governed enqueue/Audit -> one ai_runs row
-> accepted Worker claim -> claimed Provider-neutral core
-> committed authorizeProviderDispatch -> one-shot adapter
-> normalized attempt writer -> accepted settlement
```

The script can call only the sole controlled runner; it cannot import/execute the adapter or mutate lifecycle state. One strict read-only projection is generated from the terminal `ai_runs` row. The projection is not an alternate call record.

The fixture authority is one exact resource with fixed IDs, literal input, Prompt bytes, response object, `maxAttempts=1`, token/cost limits and canonical hashes. Fixture attestation is durably stored in existing `input_sources_json`; the sole attempt writer stores safe fixture/request identity hashes. No Schema/Migration, second queue/history/retry/budget/evidence writer or compatibility path is added.

Crash behavior is exact: before-marker means no call; after-marker unknown outcome is conservatively durably failed/debited; `maxAttempts=1` prevents a second call; projection failure is recoverable by row read only.

Disposition: **ADDRESSED FOR FRESH INDEPENDENT RE-REVIEW**.

## 3. `M-02` addressed disposition

V1.1 uses `redirect:"manual"`, checks every `3xx` before any `Location`/body access, never follows/resolves a target, and preserves non-retryable classification. It defines exactly three application-controlled header names and separately binds the unavoidable runtime-generated names.

A real Node 24 adapter loopback integration test is mandatory in addition to fake transport tests. Runtime tuple/header/manual-redirect drift stops before credential/claim/external call; exception messages/stacks are never authority.

Disposition: **ADDRESSED FOR FRESH INDEPENDENT RE-REVIEW**.

## 4. `L-01` addressed disposition

`service_tier` is removed. Exact current top-level success names are `id`, `object`, `created`, `model`, `system_fingerprint`, `choices`, `usage`; required-field and all nested V1.0 rules remain. Any unknown key fails closed.

Disposition: **ADDRESSED FOR FRESH INDEPENDENT RE-REVIEW**.

## 5. Preserved-closed boundary challenge

The remediation does not change Provider/model/endpoint ownership, non-thinking/non-streaming JSON Output, 16,000/4,000 global ceilings, no tools/retrieval/files/URL/FIM/Beta/conversation/fallback/reasoning/Customer Service, timeout/byte/UTF-8/JSON bounds, sole Worker retry ownership, pricing freshness/model drift, secret non-probing, exact-empty Production capability, Phase separation, Owner residual risk or Production/public exclusions.

The only bounded numerical change is the controlled fixture's cost ceiling `100 -> 400` microusd because the accepted renderer produces an `811`-byte instruction and the V1.0 estimator adds `512`, making the actual conservative estimate `1,323`. The replacement still has one attempt, current upper cost `305`, no arbitrary input and a ceiling far below the accepted per-run limit. Retaining `100` would make the frozen validation path unexecutable and would not close `M-01`.

No broader rewrite, Schema, Migration, ADR or dependency is required.
