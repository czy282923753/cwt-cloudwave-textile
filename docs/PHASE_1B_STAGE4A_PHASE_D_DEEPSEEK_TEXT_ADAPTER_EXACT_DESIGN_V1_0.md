# CWT Phase 1B Stage 4A Phase D DeepSeek Text Adapter Exact Design V1.0

Status: **DESIGN CANDIDATE — NOT REVIEWED / NOT ACCEPTED / NOT IMPLEMENTATION AUTHORITY**
Prepared: `2026-08-12` (Asia/Shanghai)
Role: Phase D Exact Design Engineer
Phase C base: `9006b638ed51f981f7477829086244627c488d6b`
Phase C proof-bound code: `6de5fac1d676c5d01ccfedaeb90c1bcb0285c89a`
Phase C independent PASS review: `5d7371c0b83d0a90c271b403c392b8a978411bd4` (direct parent `9006b638ed51f981f7477829086244627c488d6b`)
Current authority supplement: [Phase D–G Owner Decision V1.0](./PHASE_1B_STAGE4A_PHASE_DG_OWNER_DECISION_V1_0.md)
Detailed design evidence: [`phase-1b-stage4a-phase-d-exact-design-v1/`](./review-evidence/phase-1b-stage4a-phase-d-exact-design-v1/)

## 1. Disposition and exact scope

This Candidate defines an implementation-ready, replacement-oriented Phase D for exactly one DeepSeek text adapter behind the accepted CWT `TextAiProvider` boundary and one bounded, opt-in real-Provider validation harness. It preserves the accepted Phase C `ai_runs` lifecycle, Worker, Provider-neutral orchestration, configuration, Prompt, pricing and evidence authorities.

This document does not:

- accept or self-review its own design;
- implement source, configuration, Schema, Migration, dependency, lockfile, environment, Prompt body or checkpoint changes;
- access, verify or expose a credential;
- make a DeepSeek API call or any other real-Provider call;
- deploy or operate Staging or Production;
- implement Phase E business use cases/UI, Phase F protected-Staging flow validation or Phase G acceptance/freeze; or
- authorize Production, Production data, public release/traffic, DNS/CDN, Publish, Index, formal data or unrelated external action.

The next gate is a fresh independent Phase D Exact Design Review in a different task. A later implementer may act only after that review and the established coordinator gate.

## 2. Authority and reconciliation

The governing order is the root `AGENTS.md`, frozen CWT V1.1, accepted ADR-0017 and ADR-0018, the Stage 4A Pre-Development Final Review, the Stage 4 implementation plan, the accepted Phase C checkpoint, and the current Owner Decision supplement.

The `2026-08-12` Owner Decision supersedes the earlier inaccurate interpretation that formal DeepSeek questionnaire, DPA, security, no-training, processing-region or subprocessor replies had to arrive before Phase D–G could progress. It authorizes the coordinator to progress the existing sequential D→E→F→G design, implementation, testing, remediation, independent-review and acceptance flows without a separate start permission for every phase. It also authorizes only the controlled Phase D Provider/API validation, necessary network calls and Phase F protected-Staging validation within that sequence.

That decision does not convert missing supplier assurance into evidence. `PD-04`–`PD-08` and `PD-10` remain unresolved external assurance and Owner-accepted residual risk. `C-002` and `C-003` remain active under the current interpretation but cannot re-block the expressly authorized D–G work. Historical reports remain unchanged audit records.

## 3. Accepted Phase C inventory and direct consumers

The complete accepted-tree inventory and reproducible consumer scans are in [the accepted Phase C inventory evidence](./review-evidence/phase-1b-stage4a-phase-d-exact-design-v1/ACCEPTED_PHASE_C_INVENTORY_V1_0.md). The implementation boundary is summarized here.

| Authority | Accepted Phase C path/symbol | Direct consumer disposition in Phase D |
|---|---|---|
| Provider-neutral request/result | `src/ai/providers/text-provider.ts`: `ProviderNeutralTextRequestV1`, `TextAiProvider`, `ProviderTextResultV1`, normalized completion/status/usage | Preserve the stable request and boundary, replace result/usage with V2 and add one pre-dispatch prepared-call seam. Delete V1 result/usage and the old direct `generateText` method; no compatibility method. |
| Provider registry | `src/ai/providers/registry.ts`: `TextProviderRegistryV1`, `createTextProviderRegistryV1`, exact-empty `productionTextProviderRegistryV1` | Preserve as the only Provider registry authority. Production remains exact-empty. The Phase D root constructs a separate Staging-only registry from the same factory. |
| Core orchestration | `src/ai/core/orchestrator.ts`: `createGenericAiOrchestratorV1`, `createAiClaimedExecutionServiceV2` | Preserve as the only Prompt render, local validation, dispatch-marker, Provider execution and protected-output orchestration. Replace its one direct `generateText` call with prepare→authorize→execute. |
| Configuration | `src/ai/config/model-config-resolver.ts`, `model-config-service.ts`, repositories and service tests | Preserve `ai_model_config` as the only Provider/model/parameter/token/retry/default authority. Business/request callers cannot supply endpoint, credential or price. |
| Prompt | `src/ai/prompts/loader.ts`, renderer and compiled production bundle | Preserve as the only Prompt authority. Production bundle stays exact-empty in Phase D; no Prompt body changes. |
| Pricing | `src/ai/runs/pricing-policy.ts` and its consumers in config, enqueue, Worker and repository | Extend the one registry/calculator with a strict versioned cache-split snapshot. Do not add a second pricing service or remote runtime price lookup. |
| Durable lifecycle | `src/ai/runs/repository.ts`, `service.ts`, `worker.ts`, `ai_runs` | Preserve the sole run/history/retry/budget authority. No new queue, outbox, table, run history, scheduler or retry loop. |
| Server composition | `src/server/ai/phase-c-composition.ts`; CLI `scripts/process-ai-runs.ts` | Replace with the sole `phase-d-provider-composition.ts` root and exact Phase D exports. Delete the Phase C root/test and move the CLI import; no alias or compatibility export. |
| Architecture authority | sole `scripts/verify-ai-architecture.ts` consuming standalone V4 profile `test-fixtures/ai-architecture/graph-faults.phase-c.v4_0.json` | Replace the checker input with one complete standalone V5 profile. V4 remains immutable history and is not co-consumed. No second checker. |
| Application consumers | Draft-assistance composition/read scopes and the conspicuous Synthetic test application | Remain Provider-neutral. They may not import `deepseek`, its model, endpoint, credential or integration module. |

Accepted internal names such as `createPhaseCClaimedApplicationRegistryV1` describe the accepted contract version, not a second composition root. Phase D does not rename those stable internal APIs merely for phase branding. The obsolete server root and its exported factories are removed because they are the current composition authority being replaced.

## 4. Replacement architecture

### 4.1 One execution path

The only supported runtime sequence is:

```text
authorized Domain Service request
  -> accepted config/Prompt/context resolution
  -> one ai_runs row
  -> one accepted Worker claim/lease
  -> one Provider-neutral core
  -> one TextAiProvider.prepareTextDispatch(...)
  -> one committed authorizeProviderDispatch fence
  -> one PreparedTextDispatchV1.execute(signal)
  -> one normalized attempt evidence envelope
  -> one accepted settlement/retry decision
```

The adapter owns only DeepSeek protocol mapping, credential loading, fixed-host network execution and safe response normalization. It does not own use-case selection, Prompt selection/body, context selection, run state, retry, fallback, pricing policy, budget admission, candidate schema, Draft mutation, Audit, Publish or Index.

### 4.2 Exact successor composition root

Final current tree:

```text
required present: src/server/ai/phase-d-provider-composition.ts
required absent:  src/server/ai/phase-c-composition.ts
server root count under src/server/ai/: exactly 1
```

The new root exports exactly:

- `createPhaseDServerAiServiceV1`; and
- `createPhaseDAiRunWorkerV1`.

`scripts/process-ai-runs.ts` is the only permitted current Production/runtime incoming edge and imports only `createPhaseDAiRunWorkerV1`. The service factory remains an explicit server build/manifest root until Phase E authorizes business callers. There is no re-export of either Phase C root factory.

The root uses the accepted `databaseConnection.kind` discriminant and this exact capability matrix:

| Database / environment | Provider registry | Pricing registry | Prompt loader | Result |
|---|---|---|---|---|
| PGlite / any | exact-empty Production Provider | exact-empty Production pricing | exact-empty Production Prompt | availability/manual degradation only; Worker factory throws before durable construction |
| PostgreSQL / `production` | exact-empty Production Provider | exact-empty Production pricing | exact-empty Production Prompt | service remains disabled; Worker factory throws; DeepSeek factory is not invoked |
| PostgreSQL / `local` or `test` through ordinary root | exact-empty Production Provider | exact-empty Production pricing | exact-empty Production Prompt | no DeepSeek composition or credential probe; direct fake/test composition remains test-owned |
| PostgreSQL / `staging`, `FEATURE_AI=false` | exact-empty Production Provider | exact-empty Production pricing | exact-empty Production Prompt | Worker factory throws before claim; no DeepSeek construction/probe |
| PostgreSQL / `staging`, `FEATURE_AI=true` | one registry entry `deepseek` | one reviewed DeepSeek cache-split snapshot | exact-empty Production Prompt in Phase D | capability can be constructed, but no Phase D business Prompt/config/use-case activation is added |

The root evaluates the trusted `APP_ENV` and `FEATURE_AI` projection first. It calls the DeepSeek adapter/pricing factories only in the PostgreSQL `staging` plus `FEATURE_AI=true` branch. A disabled Staging Worker factory throws a fixed error before repository or adapter construction. Importing the module does not read a credential. Production never constructs a DeepSeek instance or billable registry.

Phase D intentionally does not change the accepted core/feature-gate rule that ordinary business availability is local/test-only. Phase E/F must separately review the exact protected-Staging activation change before end-to-end flow validation. This prevents adapter readiness from silently becoming a Staging business activation. The explicitly opt-in Phase D validation harness described in Section 15 is the only test-environment exception and is not a business composition root.

### 4.3 One architecture authority

Phase D creates one complete standalone profile:

```text
path: test-fixtures/ai-architecture/graph-faults.phase-d.v5_0.json
schemaVersion: 50
profileId: cwt.phase1b.stage4a.phased.deepseek-text-adapter.v5_0_candidate
profileVersion: 5.0.0-candidate
```

The sole checker embeds and verifies both the raw V5 SHA-256 and the selected-pointer JCS SHA-256 before tree enumeration. V5 copies every V4 case, positive case, topology rule, lifecycle/classification rule and mutation probe into one independent document, then adds the Phase D rules in Section 18. V4 remains byte-immutable historical evidence; runtime/checker co-consumption, inheritance, fallback selectors, compatibility collectors and second scanners fail closed.

## 5. Provider contract successor and dispatch truth

### 5.1 In-place `TextAiProvider` replacement

`TextAiProvider` remains the accepted Provider-neutral boundary and keeps `key`, `capability`, `resolveConfiguration`, `describeEnvelope` and `estimateInputTokens`. Its direct `generateText` method is deleted and replaced by:

```ts
interface PreparedTextDispatchV1 {
  readonly provider: string;
  readonly requestedModel: string;
  execute(input: { readonly signal: AbortSignal }): Promise<ProviderTextResultV2>;
}

interface TextAiProvider {
  // accepted fields/methods unchanged
  prepareTextDispatch(input: {
    readonly model: string;
    readonly parameters: ReadonlyJsonObject;
    readonly request: ProviderNeutralTextRequestV1;
  }): AiServiceResult<PreparedTextDispatchV1>;
}
```

`prepareTextDispatch` is synchronous and network-free. It revalidates resolved model/parameters, request version/format/token ceilings, constructs the exact immutable UTF-8 request bytes, lazily reads and validates the credential, and returns a one-shot closure. The credential stays only in the adapter's closure and is not a return field, enumerable object property, hash input or error detail.

The core calls `prepareTextDispatch` after Prompt render and token estimation but before `authorizeProviderDispatch`. A local config, request, credential or construction failure therefore creates `not_dispatched` evidence and no false Provider-dispatch marker. Only after the database fence returns `authorized` may the core call `execute` once. A second call to the same prepared closure returns a fixed non-retryable adapter failure and performs no network call.

Fake adapters and inline Worker test adapters move to this same contract. The old `.generateText(` execution seam must be absent from current executable source after replacement. No compatibility shim or alternate direct-fetch path remains.

### 5.2 Provider identity and envelope hash

The only Phase D adapter identity is:

```text
provider key: deepseek
capability: text
requested model alias: deepseek-v4-flash
official published model version observed 2026-08-12: DeepSeek-V4-Flash-0731
```

`describeEnvelope()` returns `ProviderEnvelopeIdentityV1 { version: 1, hash }`. `hash` is the accepted canonical JSON hash of exactly:

```json
{
  "schema": "cwt.deepseek.text-envelope",
  "version": 1,
  "provider": "deepseek",
  "host": "api.deepseek.com",
  "path": "/chat/completions",
  "model_alias": "deepseek-v4-flash",
  "published_model_version": "DeepSeek-V4-Flash-0731",
  "thinking": "disabled",
  "stream": false,
  "response_format": "json_object",
  "max_input_tokens": 16000,
  "max_output_tokens": 4000,
  "timeout_ms": 120000,
  "max_response_bytes": 1048576,
  "parameter_allowlist": ["temperature", "top_p"]
}
```

Any protocol/model-version change requires a new reviewed envelope hash and new immutable `ai_model_config` row for new runs. Existing runs retain their stored envelope identity. Model substitution or fallback is forbidden.

## 6. Exact configuration and request envelope

### 6.1 Configuration allowlist

`resolveConfiguration` accepts only exact model `deepseek-v4-flash` and a plain canonical JSON object containing either no optional key, `temperature`, or `top_p`:

- `temperature`: finite number in inclusive range `0..2`;
- `top_p`: finite number in inclusive range `0..1`;
- `temperature` and `top_p` together: `parameters_invalid`;
- every unknown key, nested value, null, string coercion, `NaN`, infinity, prototype-bearing object or attempt to override a fixed envelope field: `parameters_invalid`;
- every other model: `model_unsupported`.

There is no Provider/model/endpoint/fallback in any business module. `ai_model_config` remains the only selection authority for the admitted Provider/model/parameters and keeps maximum attempts `1..3`, maximum input `16,000`, maximum output `4,000`, and per-run hard ceiling `20,000` microusd.

### 6.2 Exact HTTP request

The adapter constructs exactly one request target from constants, never configuration or input:

```text
method: POST
URL: https://api.deepseek.com/chat/completions
redirect: error
protocol: TLS/HTTPS only
port/query/userinfo/fragment: absent
```

Request headers are exactly `Accept: application/json`, `Content-Type: application/json`, and `Authorization: Bearer <credential>`. No caller-provided header, forwarding header, cookie, trace body, client request ID or URL is accepted. Header names/values are never returned, persisted or logged.

The JSON body has exactly:

```json
{
  "model": "deepseek-v4-flash",
  "messages": [
    { "role": "system", "content": "<ProviderNeutralTextRequestV1.instructions>" },
    { "role": "user", "content": "<ProviderNeutralTextRequestV1.input>" }
  ],
  "thinking": { "type": "disabled" },
  "stream": false,
  "response_format": { "type": "json_object" },
  "max_tokens": "<request.maxOutputTokens>"
}
```

If the resolved configuration contains the one permitted optional sampling parameter, that one key/value is appended. JSON Output instructions must explicitly require a single JSON object and satisfy `instructions.toLowerCase().includes("json")`; absence is `prompt_contract_mismatch` before credential read.

The adapter admits request version `1`, response format `json_object`, nonempty instructions/input within their existing Prompt bounds, and `maxOutputTokens` `1..4000`. Its conservative input estimate is:

```text
utf8_byte_length(instructions) + utf8_byte_length(input) + 512
```

The estimate must be a safe integer and `<= 16,000`; otherwise `input_token_limit_exceeded`. The Provider-reported `prompt_tokens` is rechecked after response and must also be `<= 16,000`. Provider-reported completion tokens must be `<= requested max_tokens` and `<= 4,000`.

The request cannot contain tools, tool choice, retrieval, files, images, audio, URL input, remote content, FIM, Beta prefix completion, conversation state/history, assistant messages, arbitrary system roles, `user_id`, streaming, logprobs, stop sequences, `reasoning_effort`, raw reasoning, fallback, another model, another endpoint or Customer Service data.

## 7. Bounded network behavior

### 7.1 Timeout, abort and response cap

The adapter uses Node 24 built-in `fetch`, `AbortSignal`, `TextDecoder` and existing canonical JSON utilities. No SDK or new dependency is needed or authorized.

`execute` creates a `120,000 ms` total wall-clock timeout and combines it with the Worker/caller signal. The timeout begins immediately before `fetch` and covers connection, headers, every response byte, decoding and parse/normalization. Provider keep-alive blank lines or whitespace never reset it. An already-aborted caller performs no fetch. Caller abort is `provider_cancelled`, non-retryable; internal deadline expiry is `provider_timeout`, same-provider transient.

The response body is read incrementally. More than `1,048,576` actual bytes cancels the reader, discards buffered bytes and returns `output_too_large`, non-retryable. UTF-8 decoding uses `fatal: true`. Leading/trailing whitespace and empty keep-alive lines are ignored only around the one JSON document. An empty document is `output_empty`. Invalid UTF-8, multiple JSON documents or malformed JSON is `output_invalid_json`. A transport that ends with a detectable incomplete body/connection error is `provider_transport_error`, same-provider transient; syntactically complete but semantically incomplete JSON is non-retryable invalid response.

HTTP `200` requires a media type of `application/json` (parameters such as `charset=utf-8` are allowed). Other success status codes, redirects and a `200` non-JSON response fail closed. Redirect following is disabled.

### 7.2 Exact HTTP/network classification

| Condition | Normalized code/status | Retry class |
|---|---|---|
| caller abort | `provider_cancelled` / cancelled | not retryable |
| 120-second adapter deadline | `provider_timeout` / timeout | same-provider transient |
| DNS, TLS, socket reset or detectable incomplete transport | `provider_transport_error` / transport error | same-provider transient |
| HTTP `408` | `provider_timeout` | same-provider transient |
| HTTP `429` | `provider_rate_limited` | same-provider transient |
| HTTP `500..599` | `provider_server_error` | same-provider transient |
| HTTP `401` | `provider_auth_failed` | not retryable |
| HTTP `402` | `provider_quota_exceeded` | not retryable |
| HTTP `400`, `403`, `404`, `409`, `422`, other `4xx` | `provider_client_error` | not retryable |
| redirect, other `3xx`, `1xx`, or `2xx` other than `200` | `adapter_unexpected_failure` | not retryable |
| bounded response schema/body error | existing `output_*` or `adapter_unexpected_failure` | not retryable |
| `finish_reason=insufficient_system_resource` | `provider_server_error` | same-provider transient |

The adapter never sleeps or retries. The accepted Phase C Worker remains the sole retry authority: maximum three total attempts, same Provider and same model only, existing backoff, same dispatch fence and remaining-budget test. No API status may trigger model fallback, endpoint change, another Provider, an unrecorded call or a retry inside the adapter. `Retry-After` is not authority in Phase D and is not persisted.

## 8. Exact success schema and unknown-field policy

After safe transport parsing, HTTP `200` must match one strict response object. Allowed top-level fields are exactly `id`, `object`, `created`, `model`, `system_fingerprint`, `choices`, `usage`, and optional `service_tier`. `id`, `model`, `choices` and `usage` are required. An unknown top-level or nested success field fails closed as invalid response.

The response must have exactly one choice with `index=0`. Allowed choice fields are `index`, `finish_reason`, `message`, and nullable `logprobs`. The message must have `role="assistant"`, string `content`, and may contain nullable `reasoning_content` and nullable `tool_calls`. Any nonempty reasoning content, any tool call, an extra choice or a different role fails closed; it is discarded in memory and never returned as evidence.

Allowed usage fields are exactly:

- `prompt_tokens`;
- `completion_tokens`;
- `total_tokens`;
- `prompt_cache_hit_tokens`;
- `prompt_cache_miss_tokens`; and
- optional `completion_tokens_details` containing only `reasoning_tokens`.

All token values are safe nonnegative integers. The following equalities are mandatory:

```text
prompt_cache_hit_tokens + prompt_cache_miss_tokens = prompt_tokens
prompt_tokens + completion_tokens = total_tokens
reasoning_tokens is absent or 0
```

Missing cache split, arithmetic mismatch, token ceiling breach or unexpected usage field is a non-retryable invalid response. DeepSeek disk context caching is default and no official cache-disable control was found; the design therefore records the split and does not claim cache disablement.

`model` must exactly equal requested alias `deepseek-v4-flash`. A different alias/version is `model_drift`, no candidate and no retry/fallback. `system_fingerprint`, when present, must be a trimmed printable identifier of `1..256` bytes; otherwise invalid response. Its absence is permitted but recorded `null` because official availability is not guaranteed.

Completion mapping is exact:

| DeepSeek `finish_reason` | CWT outcome |
|---|---|
| `stop` | complete; continue to one-object/application schema protection |
| `length` | `output_truncated`, no candidate, not retryable |
| `content_filter` | `provider_safety_rejected`, no candidate, not retryable |
| `tool_calls` | invalid response because tools are forbidden |
| `insufficient_system_resource` | Provider server failure, same-provider transient |
| null/unknown | invalid response, not retryable |

For non-`200`, status classification is authoritative even if the error body is empty or malformed. The adapter may extract only an `error.code` that is a number or a trimmed printable string matching `[A-Za-z0-9._-]{1,64}`. All other error fields, including message/type/param and unknown fields, are ignored and discarded. No undocumented response header is used as a Provider request identity.

## 9. Normalized result and durable evidence

### 9.1 Provider-neutral result successor

`NormalizedTokenUsageV2` replaces `NormalizedTokenUsage` and adds the optional pair `cacheHitInputTokens?` and `cacheMissInputTokens?`; they are either both absent or both present and must sum to `inputTokens`. The V3 evidence normalizer converts absence to explicit nulls. DeepSeek success requires both numeric fields, while Provider-neutral fake or future non-cache Providers may omit both. `ProviderTextResultV2` replaces `ProviderTextResultV1`; success adds optional `providerSystemFingerprint`. The Provider response `id` is the only success `providerRequestId` because it is actually exposed by the official response contract. Error request identity remains null unless a later reviewed official contract establishes one.

The old result/usage symbols and every source consumer are removed/moved atomically; there is no V1 runtime writer or compatibility conversion. The request remains `ProviderNeutralTextRequestV1` because its semantics do not change.

The Provider-neutral failure-code union adds exactly these safe adapter response classes, mapped to existing CWT errors:

| New Provider-neutral class | Existing CWT error |
|---|---|
| `empty_response` | `output_empty` |
| `invalid_response_json` | `output_invalid_json` |
| `invalid_response_schema` | `output_schema_invalid` |
| `response_too_large` | `output_too_large` |

Detectable incomplete transport remains the existing `transport` class; `finish_reason=length` remains the existing completion mapping to `output_truncated`. No new `aiErrorCodes`, error category or retry authority is introduced.

### 9.2 Attempt evidence

`NormalizedAttemptEvidenceV3` replaces the current V2 writer contract and `AttemptHistoryEntryV2` replaces the current V1 writer contract. They add nullable:

- `providerSystemFingerprint` / `provider_system_fingerprint`;
- `cacheHitInputTokens` / `cache_hit_input_tokens`; and
- `cacheMissInputTokens` / `cache_miss_input_tokens`.

The current writer symbols become `normalizeAttemptEvidenceV3`, `createAttemptHistoryEntryV2`, `attemptResponseFingerprintV2` and `sanitizedAttemptEvidenceJsonV2`; the former V2/V1 source writer symbols are deleted without compatibility exports. A private strict historical V1 entry reader remains only so already-persisted Phase C JSON can be retained/read; it cannot create a V1 entry. A history may therefore contain retained V1 entries followed by current V2 entries, while every new Phase D entry is V2 and its `version` participates in the response fingerprint.

The accepted top-level `ai_runs.input_tokens`, `output_tokens` and `total_tokens` remain aggregate totals. The existing JSON `attempt_history_json` and `pricing_snapshot_json` can carry the versioned bounded fields without a Schema/Migration. Exact validation, size constraints and the successor response fingerprint cover the added fields.

Durable evidence contains only requested/actual Provider, requested/returned model, envelope identity, Provider response ID if exposed, system fingerprint if exposed, HTTP status, safe Provider code, normalized finish/status, dispatch/responded timestamps, duration, aggregate/cache split tokens, cost inputs/results, failure code and the existing candidate/response fingerprints.

The adapter/core/repository must never persist or emit raw response/error body, raw JSON candidate before protection, Prompt body, rendered instructions/input, selected context, headers, credential or derived credential fingerprint, endpoint, exception message/stack, reasoning content, tool content, customer/private identifiers, PII or formal data. Fixed safe messages and enum codes remain the only error details.

## 10. Pricing, model drift and fail-closed freshness

### 10.1 One versioned pricing authority

The accepted `PricingPolicyRegistryV1` remains the only pricing registry. It is extended to accept a strict union of the existing V1 aggregate snapshot and a V2 cache-split snapshot. Existing V1 nonbillable rows remain readable for compatibility; current local/test fake entries remain nonbillable. Only the Staging DeepSeek entry uses V2.

The V2 snapshot contains exactly:

```json
{
  "version": 2,
  "currency": "USD",
  "billing_unit_tokens": 1000000,
  "cache_hit_input_microusd_per_unit": 2800,
  "cache_miss_input_microusd_per_unit": 140000,
  "output_microusd_per_unit": 280000,
  "formula": "ceil-cache-split-v1",
  "source_id": "deepseek-official-pricing",
  "source_url": "https://api-docs.deepseek.com/quick_start/pricing/",
  "source_content_sha256": "b7b5819eb2eea0efab609aee5068ee10ef39216f0cab797bfbe5e02e8f807002",
  "source_version": "2026-08-12-deepseek-v4-flash",
  "model_alias": "deepseek-v4-flash",
  "published_model_version": "DeepSeek-V4-Flash-0731",
  "effective_from": "<official effective instant or observed_at when none is published>",
  "observed_at": "<implementation-time UTC instant>",
  "max_age_seconds": 86400
}
```

The values above are the `2026-08-12` official-source design snapshot, not a permanent price guarantee. The implementation task must re-fetch the exact official pricing URL, hash raw bytes, verify alias/version/rates, and compile the reverified values. A changed hash, model, price, structure or uncertainty stops before the billable POST and requires an ordinary reviewed snapshot update; it is never silently accepted.

V2 cost is:

```text
ceil(cache_hit_input_tokens  * hit_rate    / 1_000_000) +
ceil(cache_miss_input_tokens * miss_rate   / 1_000_000) +
ceil(output_tokens           * output_rate / 1_000_000)
```

Upper cost treats every input token as cache miss. If a dispatched response has valid aggregate usage but no complete cache split, accounting conservatively charges every input token at the miss rate and records `actual_cost_complete=false`; for the DeepSeek strict success contract, missing split also prevents a candidate. Unknown, inconsistent or unsafe arithmetic fails closed.

At the current rates, the maximum one-attempt upper cost for `16,000` input and `4,000` output is `3,360` microusd; three attempts are `10,080` microusd, below the accepted `20,000` microusd logical-run hard ceiling. The existing Staging daily hard limit `5,000,000`, monthly warning `50,000,000`, monthly hard limit `100,000,000`, and Production budget `0` remain unchanged.

### 10.2 Pre-call confirmation

Before every Worker dispatch marker, the accepted reconstruction rechecks stored config/model/parameters, Prompt tuple/hash, envelope hash, pricing snapshot identity and pricing age. The Worker compares every V1/V2 pricing field through the one pricing authority. Stale/changed pricing returns `pricing_stale` and makes no Provider call.

The compiled snapshot expires exactly `86,400` seconds after `observed_at`. There is no runtime remote pricing lookup in the Worker. Phase F operations must refresh and independently review the snapshot before protected-Staging validation. The controlled validation harness additionally performs the official remote source check immediately before its one billable POST.

Unexpected returned model, usage shape, cache arithmetic, model document or pricing behavior fails closed. Pricing/service terms may change; no current snapshot is evidence of future availability or price.

## 11. Secret and environment boundary

The sole credential name is `DEEPSEEK_API_KEY`. It is read only by a module-private injected/default credential reader inside `deepseek-text-adapter.ts` when `prepareTextDispatch` is called. It is deliberately absent from `src/config/env.ts`, client/public configuration, build-time validation, `.env` examples, reports and evidence.

The validated value must:

- exist without default;
- be a string of `20..512` printable ASCII bytes;
- contain no leading/trailing whitespace or control character; and
- be used unchanged only to create the Authorization header.

The loader never trims, hashes, fingerprints, logs, serializes or includes the value in an error. Missing/invalid credential returns fixed `provider_auth_failed` before the dispatch marker and before fetch. Tests inject a reader and fake fetch; they do not read the process environment.

Ordinary Build, unit/integration tests, PGlite, local fake composition, disabled feature, exact-empty Production registry and Production-disabled paths neither require nor probe the key. Credential presence is reported by the controlled harness only as a boolean gate outcome and is not written to evidence. No secret value or derivative may enter code, Git, docs, report, callback, command output, CI artifact, log or persistent project file.

Credential revocation/rotation is an operational rollback step. Phase D does not create, edit or inspect Provider accounts, keys, quotas or billing settings.

## 12. Preserved data and business boundaries

- Production Provider, Prompt and pricing capabilities remain exact-empty/disabled and Production budget remains zero/unconfigured.
- Only the explicitly authorized direct Phase D validation harness and the later protected Phase F Staging branch can reach DeepSeek. Ordinary local/test/Build/PGlite/Production cannot.
- Phase D uses no Production data, customer/private/PII/formal data, Inquiry/CRM, private Asset, raw Object Key, file, URL, retrieval, knowledge base or external content.
- AI output remains a non-public candidate under the accepted local protection path; Phase D adds no Draft application or business UI.
- No output can change verified facts, Product/category/application authority, Route/Redirect, rights, Publish, Index, SEO/public truth or public storage.
- Missing Provider/credential/config/Prompt/pricing leaves manual Draft editing and existing public reads healthy.
- Provider cache persistence is acknowledged; no cache disablement, no-training, data region, DPA, subprocessor or enterprise isolation guarantee is claimed.

## 13. Controlled real-Provider validation design

### 13.1 Opt-in and execution envelope

Real calls occur only in the later authorized Phase D implementation/validation task, never in this design task. The exact command entry is `scripts/validate-deepseek-text-adapter.ts` and requires all of:

```text
APP_ENV=test
explicit CLI flag: --execute-controlled-real-provider-validation
exact PD-11 Synthetic fixture identity
current official-source preflight PASS
credential presence/shape PASS without printing
```

The script refuses `staging` and `production`, missing/extra flags, interactive input, arbitrary text, arbitrary model/URL, retry count above one or a non-Synthetic fixture. It imports only the adapter/pricing/source constants and test contract; it does not import a business service, Worker, repository, Prompt body, Product/Content/Inquiry/CRM/storage module or Production data.

The fixed request uses conspicuously Synthetic PD-11 content, asks for one small JSON object, has conservative estimated input `<=512`, output ceiling `64`, no PII/private/customer/formal fact, and no selected context. The hard billable ceiling is `100` microusd. Network allowance is exactly one `GET` to the official pricing document plus one billable `POST` to the exact Chat Completion endpoint. Provider attempts are exactly one; the validation harness does not exercise the Worker retry loop.

The official-source preflight verifies retrieval URL, raw SHA-256, current model alias/published version and the three exact rates. It verifies the compiled snapshot is no older than `86,400` seconds and that the conservative request upper cost is `<=100` microusd. Failure performs zero billable calls.

### 13.2 Required executable proofs

Fake/injected transport tests, with zero real calls, must cover:

1. exact URL/method/header/body allowlist and no redirect;
2. parameter ranges, mutual exclusion and fixed-field override rejection;
3. explicit non-thinking, non-streaming JSON Output and token ceilings;
4. credential absent/invalid redaction and no pre-dispatch marker;
5. caller abort, total timeout, DNS/TLS/socket/partial-read failures and one-shot execution;
6. HTTP classification for `400/401/402/403/404/408/409/422/429/5xx/redirect/unexpected 2xx`;
7. byte cap, fatal UTF-8, empty/whitespace, malformed/multiple/truncated JSON;
8. strict known fields, unknown field, multi-choice, model drift and system fingerprint bounds;
9. every finish reason, reasoning/tool rejection and JSON-object candidate parsing;
10. aggregate/cache usage arithmetic, ceilings, price calculation and incomplete conservative debit;
11. proof that raw body, Prompt/context, headers, secret/derivative, error text/stack and reasoning never enter evidence/telemetry; and
12. sole same-run/same-provider Worker retry interaction without an adapter retry.

The one real POST may prove only observed reachability, exact request acceptance, returned model, non-thinking JSON behavior, bounded usage/cache split, finish reason, safe response ID/system fingerprint if supplied, duration and calculated cost. The raw response is processed in memory and discarded. Evidence records the normalized fields, test status, call counts `official_source_get=1` and `billable_post=1`, upper/actual cost, source hash and a CWT response fingerprint. It records no raw body or sensitive value.

An unexecuted real test is `NOT RUN`, never PASS. A failed or interrupted real test is FAIL/INCONCLUSIVE with actual observed call count and safe code; it is never rewritten as PASS. Passing contract/API observations do not resolve external assurances in Section 14.

## 14. Owner-accepted residual risk

| Item | Phase D status under current Owner Decision | Evidence that could improve it later |
|---|---|---|
| `PD-04` API input/output training or service-improvement use | unresolved external assurance; non-blocking residual risk | signed/current Provider reply or contract clause specific to API data use and retention |
| `PD-05` processing/storage region and cross-border transfer | unresolved external assurance; non-blocking residual risk | contractual region list, transfer mechanism and account-specific processing evidence |
| `PD-06` cache behavior/control | partially observed technical behavior; cache is default and commonly persists hours-to-days; no disable control verified | official disable/retention control plus account-specific executed evidence; until then send Synthetic-only data |
| `PD-07` enterprise data security | unresolved external assurance; non-blocking residual risk | current security documentation, independent assurance and contract commitments scoped to the API account |
| `PD-08` endpoint/model/account capability | official public endpoint/model facts verified; account-specific behavior remains External Validation | bounded executed contract/API evidence from the authorized later task |
| `PD-10` independent Security/Privacy assurance | unresolved external assurance; non-blocking residual risk | independent reviewer report plus improved supplier evidence; no generic terms inference |

The current public terms do not establish DPA, no-training, processing region, subprocessor list, enterprise cache guarantee or enterprise isolation. The Owner accepts proceeding within the bounded Synthetic-only design despite that gap. None of these rows is closed or PASS.

## 15. Phase boundaries

| Phase | Exact responsibility | Explicitly not this Phase D design/implementation |
|---|---|---|
| D | Provider contract replacement, one DeepSeek adapter, Staging-only composition seam, price/evidence normalization, contract tests and one bounded opt-in Synthetic real-Provider validation | business use-case/UI/Prompt bodies, Staging deployment/flow, final acceptance |
| E | four reviewed business use-case integrations, authorized context, Prompt resources, UI/state/Diff and existing Draft/Revision Domain Service path | deployment, Production, final freeze |
| F | isolated access-protected noindex Synthetic-only Staging deployment and end-to-end role/lifecycle/Draft-review-Publish/Index-control validation | Production data/enablement/release; supplier assurance inference |
| G | independent code/security/privacy review, remediation/re-review, Fresh Acceptance, Version Manager evidence and Owner checkpoint decision | automatic Production authorization, Push/Deploy/Publish/Index |

Sequential authorization does not collapse technical gates or role separation. Phase D stops after its later independent implementation review; it does not start Phase E from the same role.

## 16. Exact implementation mutation allowlist

The later Phase D implementer may mutate only the following paths. There is no wildcard for source/config/test files.

### 16.1 Add

```text
src/integrations/ai/providers/deepseek-text-adapter.ts
src/integrations/ai/providers/deepseek-text-adapter.test.ts
src/integrations/ai/providers/deepseek-pricing.ts
src/integrations/ai/providers/deepseek-pricing.test.ts
src/server/ai/phase-d-provider-composition.ts
src/server/ai/phase-d-provider-composition.test.ts
scripts/validate-deepseek-text-adapter.ts
scripts/validate-deepseek-text-adapter.test.ts
test-fixtures/ai-architecture/graph-faults.phase-d.v5_0.json
docs/PHASE_1B_STAGE4A_PHASE_D_DEEPSEEK_TEXT_ADAPTER_IMPLEMENTATION_REPORT_V1_0.md
```

The implementation evidence directory is exactly:

```text
docs/review-evidence/phase-1b-stage4a-phase-d-implementation-v1/
```

and may contain only:

```text
BASELINE_AND_DIFF_VERIFICATION.txt
DEEPSEEK_CONTRACT_TEST_RESULTS.txt
DEEPSEEK_CONTROLLED_REAL_PROVIDER_VALIDATION.json
DEEPSEEK_REDACTION_NEGATIVE_PROOF.txt
OFFICIAL_DEEPSEEK_SOURCE_REVALIDATION.json
AI_ARCHITECTURE_PHASE_D_V5_MANIFEST.json
AI_ACTUAL_TREE_AND_STATIC_LANGUAGE_PROOF_PHASE_D_V5_0.json
AI_STATIC_MODULE_AND_RESOURCE_GRAPH_PROOF_PHASE_D_V5_0.json
AI_CAPABILITY_ORIGIN_AND_NON_REACHABILITY_PROOF_PHASE_D_V5_0.json
AI_PHASE_D_COMPOSITION_PROVIDER_SECRET_PROOF_V5_0.json
AI_SERVER_PUBLIC_BUNDLE_BOUNDARY_PHASE_D_V5_0.json
AI_ARCHITECTURE_MUTATION_PROBE_RESULTS_PHASE_D_V5_0.json
VERIFICATION_COMMANDS_AND_RESULTS.md
SHA256SUMS
```

### 16.2 Modify

```text
package.json
scripts/process-ai-runs.ts
scripts/verify-ai-architecture.ts
src/ai/providers/text-provider.ts
src/ai/core/contracts.ts
src/ai/core/orchestrator.ts
src/ai/core/claimed-execution.integration.test.ts
src/ai/testing/fake-text-provider.ts
src/ai/runs/contracts.ts
src/ai/runs/attempt-evidence.ts
src/ai/runs/attempt-evidence.test.ts
src/ai/runs/pricing-policy.ts
src/ai/runs/pricing-policy.test.ts
src/ai/runs/repository.ts
src/ai/runs/repository.integration.test.ts
src/ai/runs/service.integration.test.ts
src/ai/runs/worker.ts
src/ai/runs/worker.integration.test.ts
src/ai/runs/worker-shutdown.integration.test.ts
```

`package.json` may add only deterministic Phase D test/validation commands; dependencies and lockfile are unchanged. Tests may change only for the exact contract/pricing/evidence/root effects described here. `src/ai/errors.ts`, Schema, Migration, environment schema, Prompt body/bundle/manifest, business application, UI/Server Action, public route and storage paths are not authorized.

### 16.3 Delete

```text
src/server/ai/phase-c-composition.ts
src/server/ai/phase-c-composition.test.ts
```

V4, Phase C design/review/evidence/checkpoint refs and accepted historical files remain byte-immutable. If the implementation cannot compile and pass the required proof without another path, it stops as `NEEDS_OWNER_DECISION`; it must not use an inline duplicate, compatibility export, copied retry/pricing path, monkey patch or broader wildcard.

## 17. Implementation order and exact tests

The later implementer follows this dependency order:

1. reverify clean exact Phase C base and official source facts; do not read credential;
2. replace the Provider-neutral prepare/execute contract and update fake/inline test adapters;
3. extend normalized usage/evidence and one pricing authority, with unit tests first;
4. implement the DeepSeek pricing constants/source verifier and adapter using injected fetch/credential seams;
5. replace the sole root and CLI import; delete obsolete root/test;
6. create standalone V5 and replace the sole checker input/semantics;
7. run zero-network contract, core, run/repository/Worker, root, architecture, type, lint and build gates;
8. only after all local gates pass, run the exact opt-in source preflight and one billable Synthetic POST if the authorized task explicitly includes execution;
9. write only redacted evidence and implementation report, close the allowlist/diff, commit a clean Candidate; and
10. stop for fresh independent Phase D implementation review.

Required zero-network test paths are the exact added/modified tests in Section 16. They must prove all Section 13.2 cases plus accepted Phase C regression suites. Required repository/Worker tests use the existing isolated PostgreSQL proof mechanism where applicable. Build and ordinary test commands must pass with `DEEPSEEK_API_KEY` absent and must assert that no injected/default credential reader or real fetch was called.

The controlled real validation result is independent execution evidence, not a substitute for contract/failure tests or supplier assurance. Its JSON schema must reject unknown evidence fields and credential-shaped values.

## 18. V5 architecture proof and reviewer obligations

V5 preserves every accepted V4 rule and additionally fails closed on:

1. restored/imported Phase C root or old factory symbol;
2. missing/multiple/aliased/case-colliding Phase D roots;
3. any root incoming runtime edge other than the exact CLI Worker edge;
4. DeepSeek/model/endpoint/credential/integration imports from business/public/client/Refine/Prompt/context modules;
5. Provider SDK or new dependency/lockfile mutation;
6. arbitrary URL/model/header, fallback or second Provider registration;
7. Production or ordinary local/test DeepSeek composition/credential probe;
8. old `.generateText(` execution path, second orchestration/retry/fetch API path or adapter sleep;
9. raw body/Prompt/context/header/secret/exception/reasoning evidence path or restored V1 result/evidence writer;
10. credential in `src/config/env.ts`, public env, docs/evidence or a derived fingerprint;
11. controlled validation without exact opt-in/test/Synthetic/call-count/cost gates;
12. V4 co-consumption, V5 hash/integrity mismatch, selector fallback, second checker or compatibility collector;
13. missing/stale/mixed-Candidate proof artifact or manifest hash mismatch; and
14. any Production Provider/Prompt/pricing capability becoming nonempty.

The checker permits exactly two explicit external fetch sites: the adapter's fixed Chat Completion POST and the validation script's fixed official-pricing GET. Both are server/test-only and fixed-host. Any other Provider/network call site fails.

The fresh independent design reviewer must:

- verify Candidate/base/parent/branch/clean identity and the Owner Decision's direct-parent commit;
- reproduce official source retrieval/hashes without treating changed content as accepted;
- reproduce direct-consumer and accepted-tree scans;
- challenge the prepare→dispatch-marker→execute ordering and false-dispatch/abort races;
- challenge request allowlist, timeout/cap/HTTP matrix, strict response parsing and retry ownership;
- verify cache-split arithmetic, freshness, model drift, Stage 4 budgets and conservative missing-usage debit;
- verify credential non-probing in Build/test/PGlite/Production and no value/derivative evidence;
- verify root/profile replacement and no dual authority;
- verify the closed implementation/evidence allowlist and every unchanged direct consumer disposition;
- classify unexecuted real validation as External Validation `NOT RUN`, not PASS;
- keep `PD-04`–`PD-08`/`PD-10` unresolved assurance as residual-risk-only; and
- report Blocker/High/Medium/Low and External Validation separately.

This design author's checks are design preparation evidence only and cannot accept the Candidate.

## 19. Rollback and recovery

Operational rollback order:

1. keep `FEATURE_AI=false` and every DeepSeek config disabled/non-default, or disable them before another claim;
2. stop new Worker claims and let accepted fencing settle/expire in-flight work without accepting a public result;
3. remove/revoke/rotate the protected `DEEPSEEK_API_KEY` without recording its value;
4. restore the exact-empty registry selection for new non-Production runs; and
5. retain every `ai_runs` attempt, pricing/envelope identity, redacted Provider evidence and human disposition.

Code rollback restores the prior accepted Phase C root/CLI/profile and Provider contract together as one reviewed revert. It does not retain a Phase D compatibility root/adapter path. Existing JSON evidence/snapshot additions are backward-compatible and remain retained; rollback performs no data deletion, run rewrite, automatic retry, Draft/public mutation or history erasure.

Production remains disabled throughout, so rollback does not include Production data deletion, traffic switch, DNS/CDN or public-state action.

## 20. Stop conditions and architecture conclusion

The design/implementation must stop as `NEEDS_OWNER_DECISION` if:

- a new dependency/SDK, Schema, Migration or ADR is materially required;
- another mutation path or evidence file is required;
- official model/price/request facts conflict with this envelope;
- returned model/usage cannot be verified fail closed;
- credential cannot remain module-private and nonpersistent;
- a second queue/history/retry/pricing/Prompt/composition/network authority appears;
- business modules must know DeepSeek/model/endpoint;
- Production or private/customer/PII/formal data becomes necessary;
- bounded call/token/cost/timeout/response limits cannot be enforced;
- raw body/Prompt/context/header/secret/error/reasoning can reach evidence; or
- manual Draft/public behavior depends on Provider availability.

No Schema or Migration is needed: the accepted columns already store aggregate tokens and bounded JSON attempt/pricing evidence, and Phase D adds no table, relation, status or constraint change. No ADR is needed: one adapter behind the accepted Provider-neutral boundary, one accepted Worker/run authority and one modular-monolith root are exactly ADR-0017/0018. No dependency is needed because Node 24 provides the required HTTP/abort/stream/decode primitives.

If independent review confirms these premises, Phase D is implementable within the closed allowlist. This Candidate is not itself a PASS and does not start implementation. The only next gate is a **fresh independent Phase D Exact Design Review in a different task**.
