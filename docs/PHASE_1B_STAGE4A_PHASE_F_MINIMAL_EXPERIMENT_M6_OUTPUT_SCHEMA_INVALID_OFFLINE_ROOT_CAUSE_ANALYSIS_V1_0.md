# CWT Phase F Minimal Experiment M6 Output-Schema-Invalid Offline Root-Cause Analysis V1.0

Date: `2026-08-26`

Role: Strategy A Product/Exercise Technical Analyst

Classification: **OFFLINE ROOT-CAUSE ANALYSIS / DECISION-COMPLETE RECOMMENDATION / NO IMPLEMENTATION / NO PROVIDER AUTHORITY**

## 1. Executive conclusion

M6 did not reach the four use-case model-content schemas. The common failure occurred earlier, inside the strict DeepSeek HTTP-success response normalizer.

The decisive evidence is the exact combination recorded for every one-attempt run:

- `provider_response_status=invalid_response`;
- `failure_code=output_schema_invalid`;
- input/output/total tokens all `null`;
- `actual_cost_complete=false`; and
- no candidate.

In the current code, a valid Provider envelope with valid usage followed by invalid model-content JSON or an invalid use-case output object retains normalized usage in the attempt evidence. The repository then persists those token totals even though the run fails and no candidate is stored. Conversely, a DeepSeek adapter `invalid_response_schema` failure contains no usage; the orchestrator maps it to `output_schema_invalid`, and the repository writes exactly the M6 null-token/incomplete-cost/no-candidate state.

Therefore:

1. **Proven root boundary:** all four responses failed the DeepSeek adapter's outer HTTP-success response/usage normalization before model-content parsing and use-case schema enforcement.
2. **Not recoverable from M6:** the destroyed database and intentionally minimized evidence do not reveal which exact response predicate failed. The current adapter conflates outer envelope shape, nested choice/message shape, usage keys, usage scalar validity/arithmetic, completion details and finish reason under one `invalid_response_schema` code.
3. **Not supported as root cause:** the evidence does not support changing the four Prompts, the common model-output wrapper, code-fence handling, or an envelope-unwrapping normalizer. M6 never reached that layer.
4. **Recommended smallest next step:** add one bounded, sanitized first-failing-predicate diagnostic inside the existing DeepSeek adapter, propagate it through the already-existing `providerErrorCode`/`provider_error_code` evidence channel, prove the mapping with local fake payloads, obtain Fresh Independent review, and only then seek separate Owner authorization for one one-case/one-attempt diagnostic call. Do not retain raw response text.

This is a complete recommendation. It does not authorize implementation, credentials, a Provider call, environment reconstruction, retry, Phase F acceptance or any operational action.

## 2. Exact identities and evidence custody

| Item | Exact identity |
| --- | --- |
| Product worktree | `/Users/calvin/.codex/worktrees/bac1/CWT（CloudWave Textile）项目` |
| Product HEAD / tree | `0d81e1f71106902da4dd617fd25d2e9127aad534` / `03bc2341fe726ba46b69f09ebfdde720b3f614ba` |
| Control HEAD / tree | `1fc216d1112590f7aaee5d97efe9656b3d40b53e` / `0b2dd21c7f33f0405aa07815b97a0a4992a1dcb5` |
| M6 Operator report SHA-256 | `c50cd3ac1c0ee1c0b98c91ed570fed2c1297d4b420508a92a4cda058d83155a4` |
| M6 Independent PASS SHA-256 | `5038e718b80d344e86a302422991d20650798c06a355d6199ab4c67c7435ee20` |
| Sanitized archive | `/private/tmp/cwt-phase-f-m6-external-run-evidence-archive-20260826` |
| Archive inventory | `17` files; relative inventory SHA-256 `4df4a2ab0adcc4fdedc4a783e55feaa8622b6d9dc2784a4525928b1bbfb7ec27` |

The Product branch, HEAD, tree and clean state were verified before analysis. The Control commit exists with the exact tree and is an ancestor of the Product HEAD. Both report hashes and adjacent sidecars were verified. Every archive file was read; job stdout/stderr are empty, and no raw Provider body, response content, credential or reconstructable secret is retained.

I1 remains destroyed and was not reconstructed. The Owner-confirmed M6 key deletion remains an external governance fact; no credential was accessed in this task.

## 3. Proven M6 facts

- Exactly four fixed Synthetic use cases were dispatched, one attempt each: `product_description_draft`, `seo_content_draft`, `fabric_knowledge_draft`, and `sourcing_guide_draft`.
- All four ended `failed / invalid_response / output_schema_invalid`.
- All four had null tokens, `actual_cost_microusd=0`, `actual_cost_complete=false`, and no candidate hash.
- Conservative accounted cost was `29,216` microusd = USD `0.029216`, below the USD `0.08` experiment cap. Zero database actual cost is not a zero-billing claim.
- No retry, fallback, fifth case, Apply, Publish, Index, Production action or public mutation occurred.
- All target entities remained Draft version `1`.
- The independent M6 review found the evidence reliable but explicitly identified the four schema-invalid outcomes as an open business result, not Phase F acceptance.

## 4. Mandatory source trace

### 4.1 Fixed exercise and configuration

`scripts/phase-f-bounded-exercise.ts` fixes the four use cases, their Synthetic English briefs, Prompt identities, target types, `locale=en`, four distinct ordinary idempotency UUIDs, one Worker slot and no Apply/Publish/Index path.

`scripts/phase-f-bounded-bootstrap.ts` creates and activates one exact default configuration for each case through the existing governed model-config service:

- Provider/model: `deepseek/deepseek-v4-flash`;
- parameters: `{temperature:0}`;
- `maxInputTokens=16000`;
- `maxOutputTokens=200`;
- `maxAttempts=1`;
- `runCostLimitMicrousd=20000`;
- Prompt version `1`, with the four exact production Prompt hashes;
- no fallback.

The exercise resolves the production Prompt loader, compiled pricing registry, DeepSeek Provider adapter, accepted Draft-assistance service, run repository and Worker. No arbitrary Prompt, model, Provider, fallback, task or cap input exists.

### 4.2 Production Prompts and JSON request

The four immutable Prompt resources all say, in substance and explicitly, to return exactly one strict JSON object and nothing else, with no Markdown fence, commentary, HTML, JSON comments or unrecognized keys. Each resource defines its complete use-case output shape and exact EvidenceText contract.

`renderPromptV1` renders the entire production Prompt into `instructions` and uses an empty Provider-neutral `input`. The DeepSeek adapter independently requires the instructions to contain `json` and requires `responseFormat.kind=json_object`.

The actual request body already includes:

```json
{
  "model": "deepseek-v4-flash",
  "thinking": {"type": "disabled"},
  "stream": false,
  "response_format": {"type": "json_object"},
  "max_tokens": 200,
  "temperature": 0
}
```

The accepted local official-source evidence also records DeepSeek support for `response_format.type=json_object` and its explicit JSON-instruction requirement. Thus neither a missing JSON request flag nor missing JSON wording is a plausible M6 explanation.

### 4.3 DeepSeek HTTP and outer response parsing

For HTTP `200`, `deepseek-text-adapter.ts` performs these ordered checks:

1. exact `content-type=application/json`;
2. bounded body (`<=1,048,576` bytes), fatal UTF-8 and exactly one JSON document without duplicate object keys;
3. exact top-level key set and required `id`, `model`, `choices`, `usage`;
4. safe request ID/model, optional `object/created/system_fingerprint` constraints;
5. exactly one choice with exact keys, index `0`, and no non-null logprobs;
6. exact assistant message keys, string content, empty/absent reasoning content and tool calls;
7. exact usage keys with all five base/cache token fields required;
8. safe integer/range checks and both token arithmetic identities;
9. optional completion details containing only zero/absent reasoning tokens; and
10. the accepted finish-reason set.

Any failure at steps 1 or 3-10 returns:

```text
kind=failure
responseStatus=invalid_response
failureCode=invalid_response_schema
retryClass=not_retryable
usage absent
```

Malformed/duplicate JSON instead returns `invalid_response_json`, which maps to `output_invalid_json`, not the M6 `output_schema_invalid`. Empty content and length/content-filter finish reasons also map to distinct Product errors after appropriate normalization. Those alternatives do not match M6.

### 4.4 Model-content parsing and four output schemas

Only after the adapter returns success does the orchestrator:

1. confirm returned-model identity and completion status;
2. parse `message.content` with `parseOneJsonObjectV1`; and
3. call the claimed Draft application `parseAndProtect` policy.

All four Zod schemas are strict and share these three required fields:

```json
{
  "schemaVersion": 1,
  "useCase": "<the exact fixed use case>",
  "locale": "en"
}
```

They then require use-case-specific arrays and optional proposal fields. Every nonempty EvidenceText is exactly `{text,sourceRefs}`. Product additionally requires `descriptionBlocks`, `featureProposals`, `faqProposals` and `mediaTextProposals`; SEO requires `outline`, `blocks` and `internalLinkSuggestions`; Fabric Knowledge and Sourcing Guide require `outline` and `blocks`.

The production Prompts state these same fields and constraints. There is no common hidden wrapper mismatch: the model emits the raw use-case object above, and CWT constructs the protected internal candidate envelope only after schema and policy acceptance.

A content object that is syntactically valid JSON but fails one of these Zod schemas returns `output_schema_invalid`. However, because this happens after adapter success, the orchestrator attaches the already-normalized Provider usage to the failed attempt. That is not the M6 null-token shape.

### 4.5 Protected-data and output-policy enforcement

After use-case schema acceptance, `protectDraftCandidateV1` applies the accepted output policy:

- reconstructible source-ref validation and ordered provenance;
- numeric evidence and banned claim/action/currency/time checks;
- the pinned protected-data classifier;
- repetition, block, heading, link/media and size bounds; and
- canonical protected Draft-candidate hashing.

Those failures are `output_policy_rejected` or another specific typed code, not M6 `output_schema_invalid` unless the earlier Zod schema itself failed. The classifier is pinned to the exact Node/V8/ICU/Unicode/CLDR tuple and the immutable 32-rule registry; no classifier mismatch was evidenced in M6.

### 4.6 Orchestrator mapping and Worker persistence

The orchestrator's exact Provider-neutral mapping is:

```text
invalid_response_json   -> output_invalid_json
invalid_response_schema -> output_schema_invalid
```

For a Provider adapter failure, the orchestrator deliberately passes no usage because `ProviderTextResultV2.failure` has no usage member and the adapter returned none. For post-adapter model-content JSON/schema/policy failures, the `successFailure` helper explicitly passes `result.usage`.

The repository then:

- sets terminal `failed` because the error is non-retryable and `maxAttempts=1`;
- writes `provider_response_status` and the typed `failure_code` from attempt evidence;
- writes candidate JSON/hash only for `draft_ready`, therefore none for M6;
- calculates actual cost only when normalized usage exists;
- uses the conservative attempt upper bound when usage is absent/incomplete;
- sets cumulative token columns to null if any dispatched attempt has null usage; and
- preserves `actual_cost_complete=false`.

This is the exact code branch that produced the five M6 database facts.

## 5. What the M6 database facts mean

| Candidate explanation | M6 compatibility | Evidence-backed conclusion |
| --- | --- | --- |
| (a) Invalid outer Provider response envelope | Yes | Proven as part of the failing boundary, but the exact outer predicate is unknown. |
| (b) Valid Provider envelope/usage, invalid model-content JSON/schema | No | Excluded by null tokens for every one-attempt row: that later path retains usage. Invalid content JSON would also be `output_invalid_json`, not `output_schema_invalid`. |
| (c) Usage parsing/validation failure | Yes | Usage is a nested part of the same adapter normalization and is conflated with outer-envelope failures. Missing/extra fields, invalid scalars, arithmetic mismatch or limit mismatch all produce the M6 shape. |
| (d) Ordering/error-mapping conflation | Yes, narrowly | This is not evidence of incorrect execution order. It is a diagnostic conflation: multiple adapter response/usage predicates map to one `invalid_response_schema`, which maps to one Product `output_schema_invalid`. |

The four identical results are strong evidence of a common response-envelope incompatibility repeated across all four calls, because the response normalizer is shared and executes before use-case-specific content parsing. They do **not** prove which exact field or usage condition differed. A deterministic shared Product validation boundary is proven; a deterministic exact field-level Product bug is not.

## 6. Local fake-payload mapping

No database or external network was needed. The repository's accepted fake corpus was executed locally:

```text
Test files: 4 passed
Tests: 105 passed
Files:
- deepseek-text-adapter.test.ts
- attempt-evidence.test.ts
- raw-json.test.ts
- common.test.ts
```

The adapter corpus proves that each of these materially different payloads collapses to `invalid_response / invalid_response_schema / not_retryable` with no normalized usage:

- extra top-level `service_tier`;
- another unknown top-level key;
- nonempty `reasoning_content`;
- inconsistent usage totals/cache split;
- nonempty `tool_calls`;
- a second choice; and
- an unknown finish reason.

The pure attempt-evidence and source-traced repository mapping then yields `output_schema_invalid`, null tokens, incomplete actual cost and no candidate. The raw-json/output-policy corpus separately confirms that model-content failures occur only after successful Provider normalization. No raw Provider data was used or reconstructed.

## 7. Unknowns and evidence limits

The following cannot be recovered from M6:

- the raw Provider response body or model content;
- the exact failing JSON path/key/category;
- whether the mismatch was an extra/missing outer key, choice/message shape, usage shape/value/arithmetic, completion details or finish reason;
- the returned model/request ID/system fingerprint if not present in the minimized report;
- valid Provider token usage or final Provider billing; and
- whether the model content would have satisfied any use-case schema had the outer response normalized.

The database cannot be re-queried because whole-I1 teardown was completed and must not be reversed. The archive intentionally contains no raw payload. Guessing a response shape from four identical codes would exceed the evidence.

## 8. Options and tradeoffs

### Option A — change Prompts or use-case schemas now

Advantage: superficially targets the reported Product error name.

Risks: the code/evidence proves M6 did not reach those schemas. This would be a symptom-level, unsupported change and could weaken the Draft evidence contract without affecting the actual failure.

Disposition: **reject**.

### Option B — add tolerant parsing or output normalization now

Examples include stripping Markdown fences, unwrapping a guessed envelope, admitting unknown Provider fields or relaxing usage arithmetic.

Advantage: could accidentally admit one possible response shape.

Risks: no M6 evidence proves any such shape. Broad tolerance would weaken the strict Provider and protected-output boundaries, could hide future drift, and would create maintenance burden without identifying the root predicate.

Disposition: **reject unless a later sanitized diagnostic proves one exact, bounded shape and official evidence supports admitting it**.

### Option C — add one sanitized adapter diagnostic, then one separately authorized call

Advantage: targets the proven causal boundary, reuses existing evidence transport, requires no Schema/Migration/dependency/framework, exposes no response text, and gives the next call decision value.

Risk: it requires one future implementation/review cycle and a separately authorized billable call. A first-failure diagnostic may identify only the first of multiple mismatches, which is acceptable for the smallest next step.

Disposition: **recommended**.

## 9. Exact recommended minimal next step

### 9.1 Bounded implementation

In `deepseek-text-adapter.ts`, replace the undifferentiated local `invalid(returnedModel?)` helper with the same failure plus one **closed, adapter-owned first-failing-predicate code**. Pass that code through the already-existing optional `ProviderTextResultV2.failure.providerErrorCode`; the orchestrator, normalized attempt evidence, attempt history and `ai_runs.provider_error_code` already propagate and persist that safe identifier. Do not add a new database field, error taxonomy, state, log stream or response store.

The closed code set should distinguish only the existing checks, for example:

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

The exact implementation should prefer a known path/category code over copying Provider-controlled key text. If an unknown key must be distinguished, record only a bounded schema path after a strict schema-key allow-pattern and length check; otherwise use the closed container-level category. Never persist values from `message.content`, raw JSON fragments, Prompt/input/context, headers, credentials, reasoning content, tool payloads or exception text.

Do not mark invalid usage as complete or feed it into cost arithmetic. The existing conservative accounting remains authoritative. No raw response body or full response hash is needed.

Expected Product mutation scope should remain narrowly bounded to:

- `src/integrations/ai/providers/deepseek-text-adapter.ts`;
- `src/integrations/ai/providers/deepseek-text-adapter.test.ts`;
- at most one existing focused orchestrator/repository test file proving safe propagation and null usage; and
- one implementation report/sidecar plus only mechanical architecture identity budget if an existing gate requires it.

No Prompt, use-case output schema, protected-data/output policy, exercise, bootstrap, config, pricing, Worker lifecycle, Schema/Migration, dependency, public/Product/SEO/Publish/Index or control machinery should change.

### 9.2 Focused proof before any external action

Use local fake payloads to prove:

1. every existing outer/choice/message/usage/completion mutation returns its exact closed diagnostic code;
2. the raw response and model content are absent from all returned/durable/sanitized evidence;
3. adapter-level schema failure still maps to `invalid_response / output_schema_invalid`, null usage, incomplete cost and no candidate;
4. valid envelope plus invalid content JSON maps to `output_invalid_json` with usage retained;
5. valid envelope plus invalid use-case schema maps to `output_schema_invalid` with usage retained;
6. a fully valid fake response remains `draft_ready` under existing protected-output policy; and
7. cost/call/Draft-only/no Apply/Publish/Index boundaries remain unchanged.

Then run only the proportionate architecture, lint, typecheck and focused/full tests required by the future authorized implementation task. Fresh Independent Code/Security Review must PASS before any credential or call is considered.

### 9.3 Separately authorized diagnostic call

Only after implementation and independent PASS, seek explicit Owner authorization for **one fixed Synthetic use case, one attempt, one call**, using the existing per-run USD `0.02`, same-day USD `5` backstop, Draft-only/no-Apply/Publish/Index and teardown boundaries. One case is sufficient because the proven failure boundary is common and precedes use-case content parsing.

Retain only:

- the closed schema issue code/path category;
- already-safe returned-model/request/status metadata if accepted by existing evidence rules;
- normalized usage only if it passes the existing full usage contract; and
- existing conservative cost facts when usage remains incomplete.

Never retain raw response text, model content, reasoning, Prompt/input/context, headers, secrets or Provider payloads. A later exact schema admission or normalization may be proposed only if that sanitized diagnostic plus current reviewed official evidence proves the concrete shape.

## 10. Rollback, stop and no-run boundary

Rollback for the recommended implementation is a reviewed revert of the diagnostic-only adapter/test/report delta. It must restore the same response acceptance behavior; the diagnostic must not change success/failure decisions, retry behavior, usage accounting or candidate creation.

Stop for Owner decision if implementation requires a new persistent mechanism, Schema/Migration, dependency, Prompt/output-policy change, broad tolerant parsing, dynamic Provider authority, raw payload retention, new call/retry/control machinery, or any public/Product/Publish/Index change.

This analysis performed no Provider/network/database/secret/credential action, reconstructed no environment, changed no Product/control/test/config/Prompt/schema/dependency source, made no commit and authorized no retry. The only intended worktree artifacts are this report and its adjacent sidecar, both untracked.

## 11. Terminal disposition and next gate

Status: **COMPLETED — decision-complete offline root-cause recommendation.**

Proven root: shared DeepSeek adapter HTTP-success response/usage normalization, before use-case model-content schema/policy.

Remaining unknown: the exact first failing response/usage predicate, irrecoverable from M6's intentionally minimized evidence.

Next gate: **Owner-authorized bounded sanitized-diagnostic implementation, followed by Fresh Independent Code/Security Review.** Any later one-shot Provider call requires separate explicit authority after that review.

**END — OFFLINE ANALYSIS ONLY / NO IMPLEMENTATION / NO RUN AUTHORITY.**
