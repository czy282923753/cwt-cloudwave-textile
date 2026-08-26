# CWT Phase F Minimal Experiment M6 Sanitized Adapter Diagnostic Implementation V1.0

Date: `2026-08-26`

Role: Original Fresh Strategy A Product/Exercise Implementer

Classification: **SANITIZED_DIAGNOSTIC_IMPLEMENTATION_CANDIDATE / NOT INDEPENDENTLY REVIEWED / NOT ACCEPTED / NO RUN AUTHORITY**

## 1. Outcome

The bounded offline diagnostic recommended by the verified M6 root-cause analysis is implemented.

The strict DeepSeek HTTP-success response normalizer now attaches one closed, adapter-owned first-failing-predicate code to its existing `invalid_response_schema` failure through the existing `providerErrorCode` field. The unchanged orchestrator and repository already carry that value to normalized attempt evidence, attempt history and `ai_runs.provider_error_code`.

No acceptance/rejection condition, retry decision, usage validity rule, cost arithmetic, candidate decision, Prompt/output-policy rule, Draft/Apply/Publish/Index boundary or external authority changed. No Provider-controlled key or value is copied into diagnostic evidence.

## 2. Immutable inputs and ancestry

| Item | Exact identity |
| --- | --- |
| Branch | `codex/phase-f-minimal-experiment-v1` |
| Authorized parent HEAD / tree | `0d81e1f71106902da4dd617fd25d2e9127aad534` / `03bc2341fe726ba46b69f09ebfdde720b3f614ba` |
| Root-cause report SHA-256 | `cbc47920ee2541d6ece776e35372b5d04d23020ce0eab88f56c65900ce25e5ed` |
| Implementation commit / tree | `c8e219c95953fce69ba51fb40f32f1018320992f` / `9456c88ffb8c0832c3d6923ee7f8d467bc3d8f93` |

The implementation commit is an ordinary direct descendant of the exact authorized parent. No amend, rebase, rewrite, reset or prior-Candidate modification occurred. The previously untracked, hash-bound root-cause report pair was the only expected starting artifact and was committed byte-identically with the implementation so the Candidate contains its immutable analysis provenance.

The final packaging commit is the direct child containing only this report and its adjacent sidecar; its exact HEAD/tree is reported in the Coordinator callback because a report cannot contain the hash of the commit that contains its own bytes.

## 3. Exact implementation

### 3.1 Closed diagnostic set

`deepseek-text-adapter.ts` adds one private, non-exported TypeScript union containing exactly these fixed codes:

```text
cwt_response_content_type
cwt_response_top_level_shape
cwt_response_identity_shape
cwt_response_choice_shape
cwt_response_message_shape
cwt_response_usage_shape
cwt_response_usage_scalar
cwt_response_usage_cache_split
cwt_response_usage_total
cwt_response_completion_details
cwt_response_finish_reason
```

The existing local `invalid` helper now requires one member of that union and returns it as `providerErrorCode`. The content-type rejection uses the same fixed channel. No runtime input can select or construct a code.

### 3.2 Behavior preservation

The prior combined predicates were decomposed only to label their existing failure points:

- top-level object/exact keys;
- response identity and optional identity metadata;
- choice count/shape;
- assistant message shape;
- usage object/exact keys;
- token scalar/range limits;
- cache-split arithmetic;
- total-token arithmetic;
- completion-token details; and
- finish reason.

Every previously accepted response remains accepted. Every previously rejected response remains rejected with the same:

```text
responseStatus=invalid_response
failureCode=invalid_response_schema
retryClass=not_retryable
usage absent
```

Only the new fixed `providerErrorCode` differs. Invalid usage remains absent and cannot enter actual-cost calculation. Conservative accounting remains unchanged.

### 3.3 Sanitization

The implementation never copies a response key, JSON path, value, body fragment or hash into the diagnostic. The codes are source literals only. Tests use explicit Provider-controlled key/value/body markers and prove they are absent from returned attempt evidence.

No raw body, model content, reasoning, Prompt/input/context, header, credential, tool payload or exception text is retained. No response store, log stream, second evidence path or error taxonomy was added.

## 4. Exact changed-file inventory

Implementation commit:

| Path | Change | Purpose |
| --- | --- | --- |
| `src/integrations/ai/providers/deepseek-text-adapter.ts` | Modified | Private closed diagnostic union and fixed code at each existing rejection predicate |
| `src/integrations/ai/providers/deepseek-text-adapter.test.ts` | Modified | Exact category mapping, raw-key/value/body negative proofs and success non-regression |
| `src/ai/core/claimed-execution.integration.test.ts` | Modified | Pure in-memory fake-adapter/orchestrator proof for mapping, null/retained usage and protected success |
| `scripts/verify-ai-architecture.ts` | Modified | Seven exact change-budget paths only; no wildcard, prefix, graph or semantic relaxation |
| Root-cause report and sidecar | Added byte-identically | Immutable implementation provenance |

Packaging adds only this report and its adjacent sidecar.

No other Product, test, configuration, Prompt, output schema/policy, Schema/Migration, dependency/lockfile, Worker, pricing, exercise, bootstrap, public, SEO, Apply, Publish, Index or deployment path changed.

## 5. Focused offline proof

### 5.1 Adapter corpus

Command scope: `src/integrations/ai/providers/deepseek-text-adapter.test.ts`

Result: **PASS — 1 file / 53 tests**.

Proof includes:

- existing extra top-level, unknown top-level, reasoning, tool-call, usage-total, second-choice and finish-reason mutations mapped to their exact fixed categories;
- additional identity, usage-shape, usage-scalar, total and completion-details cases;
- content-type category;
- no `usage` or `outputText` on adapter schema failures;
- Provider-controlled key/value/body markers absent from serialized result; and
- valid fake response unchanged and without `providerErrorCode`.

### 5.2 Orchestrator mapping

Command scope: only the `sanitized DeepSeek adapter diagnostic propagation` describe in `src/ai/core/claimed-execution.integration.test.ts`.

Result: **PASS — 3 tests; 12 unrelated tests skipped**.

This filtered describe uses only in-memory fake fetch/credential seams. Its enclosing database-backed describe was not selected, so no database was created.

Proof:

1. adapter schema rejection becomes `invalid_response / output_schema_invalid`, with the exact fixed code, `usage=null`, `protectedResult=null` and no Provider-controlled marker;
2. valid envelope plus complete invalid JSON root (`[]`) becomes `output_invalid_json` with normalized usage retained;
3. valid envelope plus rejected use-case schema becomes `output_schema_invalid` with normalized usage retained; and
4. fully valid fake response remains protected Draft-candidate evidence (`responseStatus=success`, `draft_candidate`, `draft_human_review`).

An initial test input of `{` correctly produced the existing `output_truncated` classification. The proof was corrected to use the complete but invalid JSON root `[]`; no Product code changed for that test correction.

### 5.3 Supporting pure tests

Command scope:

- `src/ai/runs/attempt-evidence.test.ts`;
- `src/ai/output/raw-json.test.ts`; and
- `src/ai/output/common.test.ts`.

Result: **PASS — 3 files / 59 tests**.

These prove safe `providerErrorCode` evidence retention without raw payload authority, exact invalid/truncated JSON distinction, strict use-case output schemas and existing protected-output behavior.

## 6. Static and governance gates

| Gate | Result |
| --- | --- |
| Exact AI architecture checker with pinned installed dependency directory | PASS |
| ESLint on all four modified implementation/test/checker paths | PASS |
| TypeScript `--noEmit` | PASS |
| `git diff --check` | PASS |
| Root-cause report sidecar | PASS |

The direct architecture invocation without `CWT_INSTALLED_NODE_MODULES` first failed closed under its existing dependency identity guard. With the pinned local `node_modules`, it then correctly rejected the new paths until the allowed mechanical exact-path budget was added. The final architecture gate passed without semantic relaxation.

One intermediate typecheck identified the missing type-only `ReadonlyJsonObject` import in the focused test; that import was added and the final typecheck passed.

Full Vitest was **NOT RUN**. This task explicitly prohibits database use, while the full suite includes database-backed tests. The focused pure/in-memory suites are the proportionate evidence for this diagnostic-only change. Next build, E2E, PostgreSQL, provisioning and package audit were also **NOT RUN** and are not claimed.

## 7. Preserved boundary hashes

| Preserved path | SHA-256 |
| --- | --- |
| `scripts/phase-f-bounded-bootstrap.ts` | `21b15c2fe90488664e087fd0bcf7f7b077ec1d4dce99f36e74a5c55dea95b3ee` |
| `scripts/phase-f-bounded-exercise.ts` | `dc72feb2920501240b8137fa5ab129e8be42dfd3f321b053cdaac7a3ef329ed6` |
| `src/ai/core/orchestrator.ts` | `22480e5e18e81e3a02e265e7776c2d97a6f1aad02a9a1438dde97a86b7b7234f` |
| `src/ai/runs/repository.ts` | `afb6f99090d7d86b7e8d13cbe11094eca50ec054124b8a3d719b3d343487f933` |
| Product/SEO/Fabric/Sourcing output schemas | `4f15b5e…`, `d5875642…`, `38bc8070…`, `7d7395d1…` respectively |
| `package.json` | `7fac662d864eb10703abb3d80eeec16bd48731ce43ce2b4240f3c57019e88943` |
| `pnpm-lock.yaml` | `fd9f24c7cc27d2faff8d08f98f815ac60876c45d4b51f32b81118da2e6b40266` |

The unchanged exercise/config caps remain one attempt, USD `0.02` per run, four-row USD `0.08`, and Draft-only with no Apply/Publish/Index path. The unchanged repository remains the sole usage/cost/candidate persistence authority.

## 8. Complexity and security disposition

- Runtime files added: `0`.
- Public exports added: `0`.
- Database fields/states added: `0`.
- Error codes/taxonomy entries added: `0`.
- Retry/fallback/normalization branches added: `0`.
- Provider-controlled diagnostic data retained: `0`.
- New mechanism/framework/registry/store/log stream: `0`.

Complexity increased only by one private 11-member literal union and fixed labels on existing rejection branches. This is the smallest semantically correct diagnostic at the proven root boundary and reuses the existing evidence channel.

## 9. No-external-action and cleanup

No real Provider, network, API key, account, credential, database, environment reconstruction, package installation, provisioning or external execution occurred. The only credential reader values and fetch responses were local Synthetic in-memory test seams.

No temporary container, database, process, runtime root or credential resource was created. No cleanup mutation was required.

## 10. Rollback and open finding

Rollback is one reviewed revert of the implementation commit and its packaging commit. It removes the diagnostic labels and tests while restoring the previous undifferentiated `invalid_response_schema` evidence. It does not require data rollback, Schema/Migration or compatibility handling.

The M6 finding remains open. This Candidate does not identify the historical exact predicate and does not authorize another call. It only makes a future separately authorized one-case/one-attempt response diagnosable without raw response retention.

## 11. Next gate

Next gate: **Fresh Independent Code/Security Review of the exact immutable packaged Candidate only.**

No credential, Provider/network call, environment reconstruction, retry, Fresh Acceptance, Phase F acceptance or phase advancement is authorized.

**END — SANITIZED DIAGNOSTIC IMPLEMENTATION CANDIDATE / NOT REVIEWED / NOT ACCEPTED.**
