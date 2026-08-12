# CWT Phase 1B Stage 4A Phase D DeepSeek Text Adapter Exact Design V1.1

Status: **REMEDIATED DESIGN CANDIDATE — NOT REVIEWED / NOT ACCEPTED / NOT IMPLEMENTATION AUTHORITY**

Prepared: `2026-08-12` (`Asia/Shanghai`)

Role: Phase D Exact Design Engineer

Direct parent required for this Candidate: `52244f7f80bec29ccedb0ba1faa0075be50db36f`

Accepted Phase C checkpoint/base: `9006b638ed51f981f7477829086244627c488d6b`

Independent FAIL review: `797bbe29972e3c9e67b43879cf513b9eed457c84` (direct parent `52244f7f80bec29ccedb0ba1faa0075be50db36f`)

Current authority supplement: [Phase D–G Owner Decision V1.0](./PHASE_1B_STAGE4A_PHASE_DG_OWNER_DECISION_V1_0.md)

Immutable predecessor: [Phase D Exact Design V1.0](./PHASE_1B_STAGE4A_PHASE_D_DEEPSEEK_TEXT_ADAPTER_EXACT_DESIGN_V1_0.md)

Remediation evidence: [`phase-1b-stage4a-phase-d-exact-design-v1-1/`](./review-evidence/phase-1b-stage4a-phase-d-exact-design-v1-1/)

## 1. Candidate disposition and authority

This V1.1 is the sole current Phase D Design Candidate. It is a bounded replacement amendment to immutable V1.0, whose exact SHA-256 is `94baa8c87655baf6d482e27dfe5d550588a911a2374167f7f548ab84b1d480f5`. Every V1.0 requirement remains normative unless this document explicitly replaces it. On conflict, V1.1 controls. Historical V1.0, the Owner Decision and the independent FAIL review remain unchanged audit records.

V1.1 closes exactly the design defects identified as:

| Finding | V1.1 disposition |
|---|---|
| `M-01 DURABLE-CONTROLLED-VALIDATION-AUTHORITY` | **ADDRESSED FOR RE-REVIEW**: the only billable POST now traverses the accepted Draft Domain Service, one durable `ai_runs` row, one Worker claim, the committed dispatch fence, one-shot adapter, normalized attempt history and accepted settlement. The exported JSON is a strict read-only projection of that row. |
| `M-02 NODE-FETCH-REDIRECT-AND-HEADER-SEMANTICS` | **ADDRESSED FOR RE-REVIEW**: `redirect:"manual"` exposes and rejects every `3xx` before `Location` or body access; the application/runtime header distinction and a real Node 24 loopback gate are exact. |
| `L-01 SUCCESS-SCHEMA-SERVICE-TIER` | **ADDRESSED FOR RE-REVIEW**: `service_tier` is removed. Unknown success fields remain fail closed. |

These are author dispositions, not an acceptance verdict. The next gate is a fresh independent V1.1 Exact Design re-review in a different task. Phase D implementation remains frozen until that gate passes through the established flow.

This task did not access a credential, call the Provider/API, deploy, mutate a database, implement product code, move a checkpoint, or start Phase E/F/G.

## 2. Preserved boundaries

The Owner Decision remains authoritative exactly as recorded. In particular:

- missing questionnaire/DPA/no-training/processing-region/subprocessor/security replies do not re-block authorized D–G work;
- missing supplier guarantees remain Owner-accepted unresolved external assurance, never PASS or verified;
- `C-002` and `C-003` remain active under the Owner Decision and cannot re-block the expressly authorized bounded work;
- Production, Production data/credentials/spend/deploy, public release/traffic, DNS/CDN, Publish, Index, formal import and unrelated Push/external actions remain excluded; and
- credentials and other secrets never enter code, Git, docs, callbacks, reports, logs or persistent project files.

Except for the exact replacements below, V1.0 Sections 1–5, 6.1, 7.1, 7.2's non-redirect classifications, 8's remaining response rules, 9–12, 14–15, and the unchanged portions of 16–20 are incorporated without weakening. There remains exactly one Provider-neutral boundary, Provider registry, orchestration, `ai_runs` history, Worker retry authority, pricing authority, Prompt authority, budget authority, successor server root and architecture checker/profile. Business modules remain ignorant of DeepSeek/model/endpoint. No compatibility path is added.

The accepted direct-consumer inventory remains the V1.0 Section 3 inventory, extended only by the controlled-validation consumers in Sections 5 and 12 below. [Consumer-closure evidence](./review-evidence/phase-1b-stage4a-phase-d-exact-design-v1-1/ACCEPTED_PHASE_C_CONSUMER_CLOSURE_V1_1.md) records the exact accepted-tree scan and path dispositions.

## 3. Replacement architecture for controlled validation (`M-01`)

### 3.1 Sole durable sequence

V1.0 Section 13 is replaced. The controlled validation has no direct adapter/test-contract exception. Its only billable path is:

```text
exact opt-in script
  -> strict immutable PD-11 fixture loader and preflight
  -> isolated loopback PostgreSQL with accepted migrations
  -> accepted createPhaseCDurableDraftAssistanceServiceV1
  -> requestDraftAssistance(exact Synthetic command)
  -> one transaction: authorization + config lock + one ai_runs INSERT + required Audit
  -> accepted createAiRunWorkerV1
  -> one claim of that one row
  -> accepted claimed reconstruction / Provider-neutral core
  -> DeepSeek prepareTextDispatch (network-free, one-shot)
  -> one committed authorizeProviderDispatch fence
  -> PreparedTextDispatchV1.execute(signal) exactly once
  -> normalized Provider-neutral evidence
  -> accepted repository settlement into the same ai_runs row
  -> strict redacted read-only projection of that row
```

The script `scripts/validate-deepseek-text-adapter.ts` may import only `runControlledDeepSeekValidationV1` from `src/ai/testing/controlled-provider-validation.ts`. It may not import the adapter, `fetch`, `PreparedTextDispatchV1`, repository mutation methods or `authorizeProviderDispatch`. The controlled module composes the accepted service and Worker factories; it does not implement an orchestration loop, claim, retry, fence, settlement, budget calculation or attempt writer.

The sole external billable call site remains `deepseek-text-adapter.ts`. The sole external official-source call site remains `deepseek-pricing.ts`. No source outside the Provider-neutral core may invoke a prepared dispatch's `execute`. The validation script and module contain no alternate call record.

### 3.2 Exact controlled execution authority

Ordinary V1.0 environment behavior remains unchanged: availability/request readiness accepts only `local`/`test`, ordinary Staging business use remains disabled pending Phase E/F, and Production remains disabled/empty.

The core contract adds one optional Provider-neutral `ControlledValidationExecutionAuthorityV1`, absent from every ordinary root. On the request path only, after authorization/context/fingerprint construction and before config resolution, the existing environment-readiness check may admit logical `staging` only when this injected authority returns `authorized` for the exact safe tuple:

```text
applicationClass=draft_assistance
capability=text
useCase=product_description_draft
idempotencyKey=d5555555-5555-4555-8555-555555555555
requestFingerprint=f1674771829d9fde16b8727b4043794490d9b93bc0b2a6e92b052745d54e5192
inputHash=9093011e329e0507eae12d112228f0b807bd4cd6962a36af2e7781993e26b803
fixtureId=pd11-deepseek-text-adapter-v1
fixtureHash=5dca06e49a917c926ccf049e27fd176e8ecf0faccf5680fc74eae4c2140d18db
```

The authority is constructed only by the strict fixture loader. It has no wildcard, callback injection, alternate tuple, mutable registration or Production export. It cannot authorize `inspect`, another application/use case/target/input/config/Prompt/model/fixture, `production`, or a second row. Absence, mismatch or reuse outside the exact harness is `environment_not_authorized` before config, credential or network.

This exception supplies logical `staging` accounting to the existing Stage 4A budget path while the database itself is an isolated local test database. It is not a deployed Staging flow and grants no Phase F authority.

### 3.3 Durable fixture attestation without Schema change

The one future resource `test-fixtures/ai/deepseek-controlled-validation.v1.json` is the sole fixture authority. Its exact object, literals and canonical hashes are frozen in [the fixture specification](./review-evidence/phase-1b-stage4a-phase-d-exact-design-v1-1/CONTROLLED_VALIDATION_FIXTURE_SPEC_V1_1.md). No inline Synthetic payload in the script, adapter test, root or report is permitted.

`createDraftContextPolicy` gains an optional `ControlledValidationSourceAttestorV1`. It is absent for every ordinary caller. When and only when the exact fixture command is built, it extends the already-durable explicit-input `SafeInputSourceReferenceV1.sourceIdentity` to exactly:

```json
{
  "origin": "typed_brief",
  "controlled_validation_fixture_id": "pd11-deepseek-text-adapter-v1",
  "controlled_validation_fixture_version": 1,
  "controlled_validation_fixture_hash": "5dca06e49a917c926ccf049e27fd176e8ecf0faccf5680fc74eae4c2140d18db"
}
```

This provenance is stored by the existing enqueue writer in `input_sources_json`. It never enters `input_context_json`, Prompt variables or Provider payload. Ordinary source identities remain byte/shape compatible. A partial, duplicate, misplaced or unknown controlled-validation field fails before Provider dispatch.

Current `AttemptHistoryEntryV2` adds the following all-null-or-all-present safe fields:

```text
controlled_validation_fixture_id
controlled_validation_fixture_hash
provider_request_identity_version (=1)
provider_request_identity_hash
```

The existing single attempt-history writer derives them from the claimed/stored row; the adapter and harness cannot write them. Recovery, cancellation, pricing failure and normal settlement use the same helper. Ordinary runs write all four as `null`.

`provider_request_identity_hash` is RFC8785/JCS SHA-256 over exactly this safe persisted projection:

```text
schema=cwt.provider-request-identity; version=1;
application_class; use_case; idempotency_key;
request_fingerprint_version; request_fingerprint;
model_config_id; model_config_version; resolved_config_hash;
requested_provider; requested_model; parameters_snapshot_json;
max_input_tokens; max_output_tokens; max_attempts;
prompt_id; prompt_version; prompt_hash;
provider_envelope_version; provider_envelope_hash;
input_schema_version; output_schema_version; policy_version; input_hash;
controlled_validation_fixture_id; controlled_validation_fixture_hash
```

For the frozen fixture its expected hash is `17184416d9a4e0ca73b42330fa9931fd3988f4f77a04930d4105e3a5aacbb1ae`. It is an identity over already-approved safe hashes/IDs, not a credential fingerprint, raw request-body hash, Prompt/input substitute or alternate evidence authority.

### 3.4 Exact fixture request and expected output

The fixture has exact fixed actor, taxonomy, Product, config and idempotency UUIDs. It uses one `product_description_draft` target at version `1`, one explicit-input selection and no Company Fact, private, customer, formal, file, URL or retrieved source.

The literal explicit input is:

```text
SYNTHETIC TEST DATA — NOT A CWT FACT. State only that this is a synthetic textile sample.
```

The sole Prompt resource is embedded in the fixture resource, converted by the harness to canonical JSON plus one LF, then loaded through the accepted `createPromptBundleLoaderV1`. Its exact SHA-256 is `4b10f323eff0afd5cc856371f0655eef09c4b2eea86c47d308658950b3f142be`. No Production Prompt bundle/manifest/body changes.

For this exact accepted renderer, the Provider-neutral `instructions` bytes are the rendered Prompt and the Provider-neutral `input` is exactly the zero-byte empty string. The instruction is `811` UTF-8 bytes with SHA-256 `b854c7a47a3d383eb0532095e775b9ffc5c6f87688971a8b58ce4cf65b5dc8ef`; the conservative adapter estimate is `1,323`. This exact fixture clarification replaces V1.0's inaccurate “nonempty input” and `<=512` fixture statements only; the adapter still rejects empty instructions and accepts no caller-defined message structure.

The model config is exact: `deepseek`, `deepseek-v4-flash`, `{}`, `maxInputTokens=2048`, `maxOutputTokens=64`, `maxAttempts=1`, `runCostLimitMicrousd=400`, one enabled/default config and no fallback. At the reviewed rates, the conservative one-attempt upper cost is `305` microusd. Raising the V1.0 fixture ceiling from `100` to `400` microusd is required by the accepted renderer's real byte estimate; it remains far below the accepted `20,000` per-run ceiling and cannot authorize a second attempt.

The expected Provider JSON is exactly the fixture's `expectedOutput` object: one safe Synthetic sentence citing `src_01:text`, with empty description/features/FAQ/media arrays and no extra key. The accepted application parser/protector must produce `draft_ready`; a different sentence, field, reference, schema, unsafe claim or extra key is a failed/inconclusive validation, never massaged into PASS.

## 4. Exact harness preflight and lifecycle

### 4.1 Operator gates and isolated PostgreSQL

The later authorized implementation/validation task requires all of:

```text
APP_ENV=staging
FEATURE_AI=true
NON_PRODUCTION_NOINDEX=true
CWT_PHASE_D_CONTROLLED_VALIDATION=isolated-synthetic-postgres-v1
--execute-controlled-real-provider-validation
```

The database secret name is `CWT_PHASE_D_VALIDATION_DATABASE_URL`; it is read only by the test-only controlled module and never registered in application env/client config. Its value, username, password, host string and derivative are never printed or persisted.

Before any migration or seed, the parsed URL must use PostgreSQL, have no query option that changes TLS/proxy/search path, resolve to loopback only, and name a dedicated database matching `^cwt_phase_d_pd11_[a-f0-9]{12}$`. After connection, `inet_server_addr()` must be loopback, the current user must not be superuser, the database name must match, and no non-system session other than the harness may be active. The accepted migrations are then applied. Every CWT business/AI/Audit table must be empty before seed. A failed guard closes the connection and performs no Provider call.

The database is not dropped or truncated after the call. It is retained as the sole durable record until independent review/evidence-retention disposition. Cleanup means stop Worker, abort pending local work, release response/credential buffers and close network/database handles; it never deletes the `ai_runs` row or Audit.

### 4.2 Ordered preflight

The harness performs exactly this order and stops at the first failure:

1. verify branch/Candidate binding supplied by the implementation task, exact CLI/environment gates and no interactive/arbitrary payload options;
2. strict-parse the sole fixture with unknown fields rejected; recompute canonical fixture, Prompt, target snapshot, input, explicit-input, request-fingerprint, resolved-config, envelope, rendered-instruction and Provider-request-identity hashes;
3. verify the exact Node `24.14.0` runtime tuple and execute the local loopback transport semantic gate in Section 6; no credential access;
4. fetch exactly the official pricing URL once, require HTTPS/fixed host/path/`200`, bounded bytes, current raw hash/model/version/rates and freshness, and require upper cost `305 <= 400` microusd;
5. validate only the presence/shape of `DEEPSEEK_API_KEY` without output, logging, hashing or persistence;
6. connect to and guard the isolated PostgreSQL, apply accepted migrations, seed only the exact Synthetic actor/taxonomy/Product/localization/primary taxonomy link, `ai` feature row and exact `ai_model_config`; direct fixture seed is test setup, not a business mutation;
7. compose the accepted durable Draft service with the exact fixture Prompt loader, one DeepSeek Provider registry, one V2 pricing registry and the exact controlled authority/attestor;
8. call `requestDraftAssistance` once with the frozen command; require exactly one pending `ai_runs` row plus the required `ai.run.enqueued` Audit in the same successful transaction;
9. start one accepted Worker instance; exactly one of its accepted slots may claim the sole row; poll the existing durable row to a terminal state, then stop the Worker;
10. require one attempt, one committed dispatch timestamp, one attempt-history entry, terminal settlement, exact identity cross-checks and call counts `official_source_get=1`, `billable_post<=1`; and
11. write the strict redacted projection only after re-reading the terminal row. A zero-POST preflight failure is `NOT RUN`; a post-fence crash/recovery is FAIL/INCONCLUSIVE with conservative cost evidence.

The key is read lazily by `prepareTextDispatch` only after claim/local reconstruction. The preflight shape check may read it into a short-lived private buffer but exposes only success/failure to control flow. The adapter header is constructed only after the committed fence authorizes execution. No key or derivative enters the durable row or projection.

### 4.3 Transaction, fence and crash outcomes

| Failure point | Durable/result behavior | Later behavior |
|---|---|---|
| before enqueue transaction | zero row, zero Audit, zero POST | same invocation may retry preflight |
| enqueue or required Audit failure | transaction rolls back; zero row, zero POST | correct cause, then exact invocation may retry |
| committed enqueue before claim | one pending row, zero POST | exact idempotent invocation reuses row; Worker may claim once |
| after claim before committed dispatch marker | processing row, no marker, zero POST | lease recovery records `not_dispatched`; because `maxAttempts=1`, terminal failed, no automatic or harness retry |
| marker transaction fails/loses lease | no authorized marker, zero POST | existing recovery/terminal behavior, no direct execute |
| committed marker before/during/after POST but before settlement | row proves dispatched; external outcome may be unknown | expiry recovery appends conservative dispatched attempt and charges upper cost; `maxAttempts=1` makes it terminal; no second POST |
| settlement commit succeeds | one terminal row and one attempt entry | fixed idempotency returns exact replay; no second row/call |
| projection write fails | terminal durable row remains authority | regenerate projection only by read; never call Provider again |

The harness never calls manual retry. A failed terminal row cannot be reset, deleted or reused for another billable call. A fresh call would require a separately authorized task and a fresh isolated database/fixture version.

### 4.4 Strict exported projection

`DEEPSEEK_CONTROLLED_REAL_PROVIDER_VALIDATION.json` is not an event log. Its schema rejects unknown fields and contains only:

- schema/status/Candidate/runtime/source observation identifiers;
- fixture ID/version/hash and the exact safe expected hashes;
- `ai_runs.id`, environment, application/use case, status/retry state/attempt count/state version and safe timestamps;
- idempotency UUID, request fingerprint/version, target snapshot hash, input hash, model-config ID/version/resolved hash;
- Prompt ID/version/hash, requested/actual Provider, requested/returned model, parameter snapshot, input/output/attempt ceilings and envelope identity;
- attempt-history fixture/request identities, dispatch/response state, safe HTTP/Provider code/request ID/system fingerprint, normalized finish/safety state, duration and aggregate/cache token counts;
- pricing source/model/rates/freshness, upper/actual/accounted costs and completeness;
- candidate hash and the boolean that the protected candidate equals the fixture's expected safe output; and
- exact external call counts and `PASS | FAIL | INCONCLUSIVE | NOT_RUN`.

It never contains `input_context_json`, `input_sources_json` as a whole, Prompt/rendered bytes, explicit input, candidate/raw response JSON, selected context, headers/values, endpoint, credential/derivative, exception/message/stack, reasoning/tool content, database URL, user email/password hash, Customer Service/private/formal/PII data, or a Provider error message. Projection mismatch is fail closed and does not mutate the row.

## 5. Redirect and header replacement (`M-02`)

### 5.1 Stable no-follow rule

V1.0 Section 6.2's `redirect:error` is replaced with built-in Node `fetch` option `redirect:"manual"`. The adapter accepts only the fixed `https://api.deepseek.com/chat/completions` URL and then:

1. receives the `Response` without following;
2. checks `status` before content type, headers or body;
3. classifies every `300..399` as `adapter_unexpected_failure`, not retryable;
4. cancels/discards any exposed body without parsing it; and
5. never calls `headers.get("location")`, resolves a redirect target, constructs a new URL or issues another fetch.

Fake transport tests use a throwing `Location` accessor/body reader to prove neither is touched. A loopback redirect supplies a destination hit counter and a deliberately unusable `Location`; destination hits must remain `0`. Redirect remains owned by the existing non-retryable Worker classification and cannot trigger same-Provider retry.

### 5.2 Exact header policy

“Exactly three headers” now means exactly three **application-controlled** header names, each inserted once from constants:

```text
accept: application/json
content-type: application/json
authorization: Bearer <module-private credential>
```

No caller header object or spread is accepted. The request API exposes no cookie, credentials mode, referrer, forwarding identity, trace/baggage, dispatcher/agent/proxy, alternate authorization, origin or user identity. Specifically forbidden names include `cookie`, `set-cookie`, `forwarded`, every `x-forwarded-*`, `proxy-authorization`, `origin`, `referer`, `traceparent`, `tracestate`, `baggage`, `x-api-key` and any second `authorization`.

Node 24.14.0 necessarily adds transport/runtime headers. The supported captured name set is exactly:

```text
accept
accept-encoding
accept-language
authorization
connection
content-length
content-type
host
sec-fetch-mode
user-agent
```

Of those, only `accept`, `authorization` and `content-type` are application-controlled. The remaining seven must be generated by the selected built-in transport with no application/caller value. Tests compare lowercase header-name multiset equality, one occurrence per application-controlled header, exact safe application values except that the credential value is checked only against an in-memory sentinel, and absence of every prohibited header. Runtime header values are not persisted or treated as authority.

### 5.3 Real Node loopback semantic gate

`deepseek-text-adapter.node-fetch.integration.test.ts` must use the real Node 24 built-in `fetch` and a loopback HTTP server, not an injected fake. It proves:

- `redirect:"manual"` returns observable `302`, `redirected=false`, and no destination hit;
- adapter classification is non-retryable before `Location`/body access;
- the emitted header-name multiset equals the exact set above;
- only the three application headers are provided by adapter construction;
- no cookie/forwarding/trace/extra authorization header appears; and
- a separate unreachable loopback socket remains the transient network class, not redirect.

The adapter supports only the exact pinned runtime tuple Node `24.14.0`, V8 `13.6.233.17-node.41`, ICU `78.2`, Unicode `17.0`, CLDR `48.0`, `darwin/arm64` for this Candidate proof. A different runtime tuple, a changed emitted header set, changed manual-redirect semantics or failed loopback proof prevents controlled validation before credential access or claim. Phase F must rerun the same semantic gate for its deployment runtime and return to reviewed design if the tuple differs; it may not infer equivalence. Exception message/stack/cause text is never a classifier or evidence field.

Injected fake-transport tests remain required for all V1.0 failure/status/body cases. The real loopback test supplements rather than replaces them.

## 6. Strict success schema replacement (`L-01`)

V1.0 Section 8's first paragraph is replaced by:

> HTTP `200` must be one strict non-streaming response object. Allowed top-level fields are exactly `id`, `object`, `created`, `model`, `system_fingerprint`, `choices` and `usage`. `id`, `model`, `choices` and `usage` are required. `service_tier` is not admitted. Every unknown top-level or nested success field fails closed as a non-retryable invalid response.

All remaining V1.0 strict choice/message/usage/finish/model/reasoning/tool rules remain unchanged. The official Chat Completion page fetched on `2026-08-12` contains zero `service_tier` occurrences. Current support was not established, so removal is the only bounded correction. Any future field requires new official evidence, exact type/value/normalization/evidence rules and review before admission.

## 7. Official-source and pricing revalidation

The official facts and URLs remain those in V1.0, plus the exact Chat Completion schema URL used for L-01. The `2026-08-12T15:47:20Z` retrieval found the same material endpoint/model/price/thinking/JSON/cache/error/terms facts but regenerated API-doc HTML bytes. Therefore V1.0 Section 10.1's compiled pricing `source_content_sha256` is replaced with:

```text
3af5e5d6992a4e26709ed37f02d9bfbc46ee92dc825e6588404728419f41ce71
```

The alias remains `deepseek-v4-flash`, published version `DeepSeek-V4-Flash-0731`, cache-hit input `2,800`, cache-miss input `140,000`, and output `280,000` microusd per one million tokens. The implementation task must fetch again; any raw hash/model/rate/structure ambiguity stops before credential/billable call and requires a reviewed snapshot update.

The current Chat Completion raw SHA-256 is `2948bb768f4fedca3837bd402ca5bf7ca864b7bc6ef68312f82ebe4fb8ea9a3a`. Source bytes/hashes and bounded projections are in [official-source evidence](./review-evidence/phase-1b-stage4a-phase-d-exact-design-v1-1/OFFICIAL_DEEPSEEK_PRIMARY_SOURCE_REVALIDATION_V1_1.md). Public terms still do not establish DPA, no-training, processing/storage region, cache disablement, subprocessor completeness, enterprise isolation/security/SLA or incident guarantees.

## 8. Required executable proof obligations

All V1.0 Section 13.2 zero-network adapter tests remain required, with these additions/replacements:

1. real Node 24 loopback redirect/header semantic gate from Section 5;
2. fake redirect response whose `Location` and body access throw, proving status-first rejection;
3. exact fixture strict parser, unknown-field rejection and every frozen hash/byte/count assertion;
4. controlled authority negative tests for absent/wrong environment, fixture, idempotency, request/input/config/Prompt/envelope hash and ordinary Staging/Production callers;
5. source-attestation tests proving provenance persists only in `input_sources_json`, never Prompt/context/provider payload;
6. isolated PostgreSQL end-to-end fake-Provider proof through service → transaction/Audit → one row → one claim → fence → one-shot execution → settlement → strict projection;
7. fault injection at every Section 4.3 boundary, including projection failure, with `maxAttempts=1` and no second call;
8. attempt writer/recovery tests for all-null/all-present controlled identity fields and exact Provider-request identity recomputation;
9. projection schema unknown-field/credential-shape/Prompt/input/header/exception/reasoning negative tests; and
10. real validation, if run, requires exactly one official pricing GET and at most one billable POST. Unexecuted is `NOT RUN`, never PASS.

The real POST proves only observed account/API reachability, exact request acceptance, returned model/schema/usage/cache/finish behavior, protected candidate, timing and bounded cost. It cannot close supplier assurance.

## 9. V5 architecture additions

V1.0 Section 18 remains and V5 must additionally fail closed on:

1. the validation script importing adapter/fetch/repository/fence/execute or any symbol other than the single controlled runner;
2. any `PreparedTextDispatchV1.execute` call outside the Provider-neutral core;
3. a billable POST not reached from a claimed `ai_runs` row and committed dispatch authorization;
4. a second validation call record/history/evidence writer, or projection created from adapter memory rather than a terminal row read;
5. controlled authority/attestor construction reachable from the successor server root, business/public/client/Production code, Phase E modules or any path other than the sole test module and its tests/script;
6. more than one controlled fixture resource, inline duplicate payload, arbitrary input/ID/model/config/Prompt or fixture mutation;
7. `maxAttempts` other than `1`, run ceiling above `400`, output above `64`, input above `2,048`, or more than one pending/processing row in the isolated database;
8. controlled provenance entering `input_context_json`, Prompt variables/body, Provider content or raw projection;
9. `redirect:"error"`, `redirect:"follow"`, `Location` read/resolution, a second fetch after redirect, caller headers or dispatcher/proxy/agent injection;
10. absent/stale Node loopback proof, runtime/header-set drift, prohibited header or exception-text classification;
11. `service_tier` in adapter schema/types/evidence or any unknown-success-field acceptance; and
12. Production Provider/Prompt/pricing capability, Phase E/F/G flow or external-assurance status changing as a consequence of this remediation.

V5 permits exactly three network origins: adapter fixed Provider POST, pricing verifier fixed official HTTPS GET, and loopback-only semantic test. Loopback must reject non-loopback binding/destination and is not an external call.

## 10. Exact implementation mutation allowlist

This list replaces V1.0 Section 16 in full. Any unlisted path is `NEEDS_OWNER_DECISION`.

### 10.1 Add

```text
src/integrations/ai/providers/deepseek-text-adapter.ts
src/integrations/ai/providers/deepseek-text-adapter.test.ts
src/integrations/ai/providers/deepseek-text-adapter.node-fetch.integration.test.ts
src/integrations/ai/providers/deepseek-pricing.ts
src/integrations/ai/providers/deepseek-pricing.test.ts
src/ai/testing/controlled-provider-validation.ts
src/ai/testing/controlled-provider-validation.test.ts
src/server/ai/phase-d-provider-composition.ts
src/server/ai/phase-d-provider-composition.test.ts
scripts/validate-deepseek-text-adapter.ts
scripts/validate-deepseek-text-adapter.test.ts
test-fixtures/ai/deepseek-controlled-validation.v1.json
test-fixtures/ai-architecture/graph-faults.phase-d.v5_0.json
docs/PHASE_1B_STAGE4A_PHASE_D_DEEPSEEK_TEXT_ADAPTER_IMPLEMENTATION_REPORT_V1_0.md
```

Implementation evidence directory:

```text
docs/review-evidence/phase-1b-stage4a-phase-d-implementation-v1/
```

Allowed evidence files only:

```text
BASELINE_AND_DIFF_VERIFICATION.txt
DEEPSEEK_CONTRACT_TEST_RESULTS.txt
DEEPSEEK_CONTROLLED_REAL_PROVIDER_VALIDATION.json
DEEPSEEK_REDACTION_NEGATIVE_PROOF.txt
OFFICIAL_DEEPSEEK_SOURCE_REVALIDATION.json
NODE24_BUILTIN_FETCH_LOOPBACK_SEMANTICS.json
CONTROLLED_VALIDATION_FIXTURE_MANIFEST.json
CONTROLLED_VALIDATION_DURABLE_PATH_PROOF.json
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

### 10.2 Modify

```text
package.json
scripts/process-ai-runs.ts
scripts/verify-ai-architecture.ts
src/ai/applications/draft-assistance/composition.ts
src/ai/applications/draft-assistance/context.ts
src/ai/applications/draft-assistance/context.test.ts
src/ai/core/contracts.ts
src/ai/core/orchestrator.ts
src/ai/core/claimed-execution.integration.test.ts
src/ai/internal/claimed-run-authority.ts
src/ai/providers/text-provider.ts
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

`package.json` may add scripts only; dependencies and lockfiles remain unchanged. The context changes may only add the optional test-only authority/attestor and safe provenance described here; they may not change normal context/Prompt content or application rules. The claimed authority/repository changes may only validate/derive/write the safe identity fields through the one accepted attempt writer.

### 10.3 Delete

```text
src/server/ai/phase-c-composition.ts
src/server/ai/phase-c-composition.test.ts
```

No Schema, Migration, ADR, env schema/example, Production Prompt resource/manifest/bundle, business/UI/Server Action, public route, Asset/storage, dependency or lockfile path is authorized.

## 11. Implementation dependency order

The later implementer must:

1. rebind exact base/Candidate and reverify official sources without credential access;
2. implement the in-place Provider-neutral prepare/execute, V2 usage/V3 evidence/V2 attempt/pricing successors and fake migrations from V1.0;
3. implement strict DeepSeek pricing and adapter, then the real loopback/fake transport tests;
4. implement the one fixture resource and strict loader/controlled authority/attestor, with hash tests before database/network code;
5. extend claimed reconstruction/one attempt writer for safe controlled identity;
6. implement the isolated PostgreSQL fake-Provider durable harness/fault proofs;
7. replace root/CLI/profile/checker and delete obsolete Phase C root/test;
8. pass all zero-external-network unit/integration/PostgreSQL/architecture/type/lint/build/redaction gates with both secrets absent;
9. only in the separately authorized implementation/validation task, run exact preflight and at most one real Synthetic POST;
10. write only strict projection/evidence, close allowlist/diff, commit clean and stop for independent implementation review.

No implementation step may start Phase E business Prompt/UI integration, Phase F deployed protected-Staging validation or Phase G final review/freeze.

## 12. Reviewer obligations

The fresh independent V1.1 reviewer must bind the exact Candidate and independently:

- reproduce `M-01`, `M-02`, `L-01` from the immutable FAIL review before evaluating their closures;
- verify the sole fixture literals/hashes, accepted Domain Service/Audit/enqueue/Worker/fence/settlement route and absence of direct adapter exception;
- fault the pre/post-fence and projection boundaries and confirm `maxAttempts=1` prevents a second call;
- verify logical Staging budget accounting is reachable only through the exact test-only authority against a loopback isolated database;
- reproduce Node 24 `redirect:error` ambiguity and `redirect:manual` observable `3xx`, exact emitted header names and no destination hit;
- verify `service_tier` is absent from official current schema and implementation allowlist;
- rerun official source/hash/model/rate checks and treat any later drift as a stop, not implicit acceptance;
- rerun accepted consumer closure, relative links, immutable predecessor hashes, manifest, docs-only/outside-allowlist diff and credential-shaped negative scan;
- challenge every preserved V1.0 closed boundary and report Blocker/High/Medium/Low and External Validation separately; and
- keep real Provider/account behavior `NOT RUN` unless independently executed later, and keep supplier assurance unresolved residual-risk-only.

This author's evidence is preparation evidence only.

## 13. Rollback and recovery

V1.0 rollback remains, with these controlled-validation additions:

1. omit the exact CLI opt-in and keep ordinary feature/default config disabled;
2. stop the controlled Worker; do not reset/retry/delete the durable validation row;
3. retain the isolated database and redacted projection for review; no business/public data deletion is involved;
4. revoke/rotate the DeepSeek credential through the protected mechanism without recording it;
5. remove the test-only authority/attestor, sole fixture and controlled script together when reverting the reviewed Phase D commit;
6. reverse root/registry/adapter/provider contract as one reviewed revert, restoring the accepted Phase C root rather than layering compatibility; and
7. retain already-written attempt/pricing/envelope/fixture/request evidence. No history rewrite or data deletion.

Production remains disabled/empty and therefore has no traffic, data, DNS/CDN, Publish or Index rollback action.

## 14. Stop conditions and conclusion

All V1.0 stop conditions remain. Additionally stop as `NEEDS_OWNER_DECISION` if implementation requires:

- a Schema/Migration/ADR/dependency/lockfile/env-schema/Prompt-authority change;
- a direct billable adapter exception, second call/history/projection authority or new retry/budget authority;
- a non-loopback/shared/development/Staging/Production database for Phase D controlled validation;
- a fixture/input/model/Prompt/config/cost/call count outside the exact frozen tuple;
- a runtime/header/redirect behavior other than the pinned, reproduced semantics;
- `service_tier` or another undocumented success field; or
- any unlisted mutation/evidence path.

No Schema/Migration is needed because existing `input_sources_json`, `attempt_history_json` and identity columns carry the bounded versioned safe provenance. No ADR is needed because validation now converges on, rather than bypasses, ADR-0017/0018's sole service/run/Worker authority. No dependency is needed because Node 24 built-ins and existing PostgreSQL/Prompt/canonicalization utilities suffice.

Subject to fresh independent V1.1 re-review, the three reported findings are design-addressed. This Candidate is not self-accepted and does not authorize implementation.
