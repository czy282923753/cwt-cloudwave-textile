# CWT Phase 1B Stage 4A Phase D DeepSeek Text Adapter Exact Design V1.2

Status: **REMEDIATED DESIGN CANDIDATE — NOT REVIEWED / NOT ACCEPTED / NOT IMPLEMENTATION AUTHORITY**

Prepared: `2026-08-13` (`Asia/Shanghai`)

Role: Phase D Exact Design Engineer

Required direct parent: `097d6a570762fb2f19d499fb9fc873bae0dc1d67`

Accepted Phase C checkpoint/base: `9006b638ed51f981f7477829086244627c488d6b`

Attempt 1 fresh independent re-review: `33f2e5619dc3c1a75345c077858fe1f91d6317c0` (direct parent `097d6a570762fb2f19d499fb9fc873bae0dc1d67`)

Current authority supplement: [Phase D–G Owner Decision V1.0](./PHASE_1B_STAGE4A_PHASE_DG_OWNER_DECISION_V1_0.md)

Immutable predecessors: [V1.0](./PHASE_1B_STAGE4A_PHASE_D_DEEPSEEK_TEXT_ADAPTER_EXACT_DESIGN_V1_0.md), [V1.1](./PHASE_1B_STAGE4A_PHASE_D_DEEPSEEK_TEXT_ADAPTER_EXACT_DESIGN_V1_1.md)

Attempt 2 evidence: [`phase-1b-stage4a-phase-d-exact-design-v1-2/`](./review-evidence/phase-1b-stage4a-phase-d-exact-design-v1-2/)

## 1. Candidate authority and replacement map

V1.2 is the sole current Phase D Design Candidate. It is a bounded replacement amendment to immutable V1.1, whose exact SHA-256 is `5cb292497b69ca8681584f859956949672ab8111eeb4d4fcf7b7da037c03db5d`. V1.0 and V1.1 remain historical audit records. Every unaffected requirement in V1.0 and V1.1 remains normative; on conflict V1.2 controls.

V1.2 replaces only:

- V1.1 Section 3.1's sentence assigning the sole official-source call site to `deepseek-pricing.ts`, with Sections 5 and 10; the durable execution sequence in that section remains unchanged;
- V1.1 Sections 3.2–3.4 with this document's Sections 3–4;
- V1.1 Section 4.2 and the external-call fields in Section 4.4 with Sections 5–6;
- V1.1 Section 7 with Section 5.2;
- V1.1 Section 8 items 3, 4, 7, 8 and 10 with Section 8;
- V1.1 Section 9's network-target, fixture and credential-reader additions with Section 9;
- V1.1 Section 10 only by the two exact additions in Section 10; and
- V1.1 Sections 11–14 only where this document gives an explicit successor instruction, reviewer obligation, rollback step or stop condition.

V1.1's earlier controlled fixture tuple, one-source preflight count and separate preflight credential probe are not current authority. No stale Attempt 1 fixture ID, literal, hash or manually authored fingerprint is copied into this Candidate.

This task accessed no credential, made no Provider/API/model call, deployed nothing, mutated no database or product code, moved no checkpoint and started no Phase E/F/G work.

## 2. Finding dispositions and preserved closures

| Finding | V1.2 author disposition |
|---|---|
| `M-01 DURABLE-CONTROLLED-VALIDATION-AUTHORITY` Attempt 2 | **ADDRESSED FOR FRESH RE-REVIEW**: a PD-11-valid fixture derived by executing the unmodified accepted Phase C contracts reaches accepted request binding and protected output; the sole later POST remains behind one durable row/claim/fence/attempt/settlement route. |
| `L-02 OFFICIAL-SOURCE-PREFLIGHT-COUNT` | **ADDRESSED FOR FRESH RE-REVIEW**: the required pricing and Chat Completion reads are two exact ordered GETs with separate counters and total `2`; neither can redirect/retry or occur after credential/claim authority. |
| `L-03 SOLE-CREDENTIAL-READER-CONTRADICTION` | **ADDRESSED FOR FRESH RE-REVIEW**: the earlier preflight probe is removed; only `prepareTextDispatch` invokes the adapter-private reader once per accepted Worker attempt. |
| `M-02 NODE-FETCH-REDIRECT-AND-HEADER-SEMANTICS` | **PRESERVED PASS/CLOSED**: V1.1 Sections 5 and 8.1–8.2 remain byte-for-byte authority; no redirect/header redesign. |
| `L-01 SUCCESS-SCHEMA-SERVICE-TIER` | **PRESERVED PASS/CLOSED**: V1.1 Section 6 remains authority; `service_tier` is absent and all unknown success fields fail closed. |

These are author dispositions only. Phase D implementation remains frozen. The next gate is a fresh independent V1.2 Exact Design re-review in a different task.

The Owner Decision remains unchanged: `C-002`/`C-003` remain active but cannot re-block expressly authorized bounded D–G work; missing DPA/no-training/processing-region/cache-disable/subprocessor/enterprise guarantees remain non-blocking unresolved external assurance and never PASS.

All Provider-neutrality, single registry/orchestrator/`ai_runs`/Worker/retry/pricing/Prompt/root/checker, fixed endpoint/model/envelope, response/usage/cost/budget, Production exact-empty, business/public/data, phase-separation and rollback boundaries preserved by V1.0/V1.1 remain closed. No compatibility path, second queue, history, writer, retry, budget, Prompt or dispatch authority is added.

## 3. M-01 replacement: one accepted fixture and identity chain

### 3.1 Sole immutable fixture authority

The sole future resource remains:

```text
test-fixtures/ai/deepseek-controlled-validation.v1.json
```

Its entire exact JSON object, literal bytes, expected output and derived tuple are frozen once, without inline duplicates, in [Controlled Validation Fixture Specification V1.2](./review-evidence/phase-1b-stage4a-phase-d-exact-design-v1-2/CONTROLLED_VALIDATION_FIXTURE_SPEC_V1_2.md). The fixture ID is exactly:

```text
SYN-AI-PRODUCT-BASE-01-PHASE-D-CONTROLLED-01
```

It begins with the accepted PD-11 prefix and uses the `SYN-AI-PRODUCT-BASE-01` semantics. All Provider-bound fixture text begins with the conspicuous Synthetic marker where required. The strict loader rejects unknown/duplicate keys, invalid UTF-8, BOM, CR, trailing JSON, missing final LF, altered scalar/order or any second fixture resource.

The database seed is direct Synthetic test setup only. It creates, in one transaction, the exact active `product_editor` actor, Draft Product/localization version `1`, one taxonomy term and primary link, feature row and exact model config from the fixture. Every table must be empty for first start. Conflict, existing non-fixture data, role mismatch, non-Draft state or different value fails before enqueue. It does not bypass request authorization, context policy, protected-data classifier, output policy, Domain Service, required Audit, `ai_runs`, Worker, dispatch fence, attempt writer or settlement.

### 3.2 Executed accepted-contract tuple

Pinned Node `24.14.0` directly executed the accepted Phase C canonicalizer, association codec, protected-data classifier, context policy, request binder, Prompt renderer, config preparation and `product_description_draft` output schema/policy. The exact result is:

| Projection | Exact V1.2 authority |
|---|---|
| fixture JCS SHA-256 / bytes | `6ee8e7504844d0a63aca49590c0d790e22cf911bea58b2d377bf23cf30bbe24a` / `3,299` |
| Prompt JCS+LF SHA-256 / bytes | `1edce2035e15e32a4e4fd4bca04f4a9f6d4c3796c86b63cdb9a28e4810f4c522` / `1,259` |
| target snapshot hash | `36dd336154ebf19626d2b1921506544bb6e8727ddfc916094838eb9321111e3f` |
| input-context hash / bytes | `f6da8cb61c760f6ddb92da64a0495beff690287417d83271b3954e41c5cffeb8` / `785` |
| explicit-input array hash / literal bytes | `a5d32996087908d35645955d54a7bb419e247fd9e2f275f6527ca1a962f163c9` / `182` |
| accepted request fingerprint | `023fa10bb4fa8451cd2b8306e9f6f2794f90190ac5af231d0e6e9626cd026813` |
| expected-output / protected-output hashes | `0c02a4bd2e5965a396b7eda1e816eacf989d074d48334e947f9ec5b4e2c812fc` / `3efbc524f3df75c73e97ef9e414a47fb531d544bc650c66b4df38fdc7e63506f` |
| resolved-config hash | `9b312bfeadaf10af5daeb1e67ccc5deef267dff42da720a10cd863332b73a49d` |
| Provider-envelope hash | `28bdd2cedf963e65a817103fc41b5c0e636fff110938c590e6d80aedb6d68a0e` |
| rendered-instruction hash / bytes | `4aeaa1ba6f799a32f821fb007caecf8625dfbd1503b2f7123c31d6e9288a789e` / `914` |
| Provider-neutral input / conservative adapter estimate | `0` / `1,426` bytes |
| safe Provider-request identity hash | `afba78fff0b7aff8660bfe0b6db0b15ae7cdb3b5edb628cb7722226d4d78b3ef` |
| conservative one-attempt cost | `305` microusd |

The executable result is classifier `allow`, request binder `accepted`, accepted output policy `accepted`, protected disposition `draft_human_review`. The Worker may settle the exact protected value only through the accepted `draft_ready` candidate path. No test-only classifier, output-policy bypass, alternate fingerprint or compatibility branch exists.

The config remains exact: Provider `deepseek`, model `deepseek-v4-flash`, parameters `{}`, `maxInputTokens=2048`, `maxOutputTokens=64`, `maxAttempts=1`, `runCostLimitMicrousd=400`, one enabled/default config and no fallback. The fixed envelope remains explicit non-thinking, non-streaming JSON object at the one approved TLS host/path with the V1.0 parameter/feature exclusions.

Any later accepted-code, runtime, classifier, renderer, fixture, Prompt, envelope, config or hash drift stops before credential/API access. It is not silently recomputed into implementation authority.

### 3.3 Exact controlled execution authority

`ControlledValidationExecutionAuthorityV1` remains absent from every ordinary root. The sole strict fixture loader constructs it for logical `staging` only when all of these values match:

```text
applicationClass=draft_assistance
capability=text
useCase=product_description_draft
idempotencyKey=d5555555-5555-4555-8555-555555555555
requestFingerprint=023fa10bb4fa8451cd2b8306e9f6f2794f90190ac5af231d0e6e9626cd026813
inputHash=f6da8cb61c760f6ddb92da64a0495beff690287417d83271b3954e41c5cffeb8
fixtureId=SYN-AI-PRODUCT-BASE-01-PHASE-D-CONTROLLED-01
fixtureHash=6ee8e7504844d0a63aca49590c0d790e22cf911bea58b2d377bf23cf30bbe24a
promptHash=1edce2035e15e32a4e4fd4bca04f4a9f6d4c3796c86b63cdb9a28e4810f4c522
resolvedConfigHash=9b312bfeadaf10af5daeb1e67ccc5deef267dff42da720a10cd863332b73a49d
providerEnvelopeHash=28bdd2cedf963e65a817103fc41b5c0e636fff110938c590e6d80aedb6d68a0e
providerRequestIdentityHash=afba78fff0b7aff8660bfe0b6db0b15ae7cdb3b5edb628cb7722226d4d78b3ef
```

It cannot authorize `inspect`, Production, another application/use case/actor/role/target/input/config/Prompt/model/fixture/row or a second attempt. Absence, mismatch or successor-root/business/public/client/Phase E reachability is `environment_not_authorized` before credential or billable network.

### 3.4 Durable route and provenance

The sole billable route remains:

```text
strict fixture + credential-independent preflight
  -> isolated loopback PostgreSQL
  -> accepted createPhaseCDurableDraftAssistanceServiceV1
  -> requestDraftAssistance(exact command)
  -> authorization + context/classifier + config lock + one ai_runs INSERT + required Audit
  -> one accepted Worker claim
  -> accepted reconstruction and prepareTextDispatch
  -> one committed authorizeProviderDispatch fence
  -> one one-shot execute(signal)
  -> normalized attempt evidence
  -> accepted output policy and settlement in the same ai_runs row
  -> strict redacted terminal-row projection
```

The script still imports only `runControlledDeepSeekValidationV1` from `src/ai/testing/controlled-provider-validation.ts`. It cannot import adapter/fetch/prepared dispatch/repository mutation/fence/attempt writer/settlement. The runner composes accepted factories and contains no second loop, retry, queue, run history, budget, dispatch or evidence writer.

`ControlledValidationSourceAttestorV1` adds the exact fixture ID/version/hash only to the accepted explicit source's `sourceIdentity` in durable `input_sources_json`. It never changes the raw explicit-input/context/Prompt/Provider bytes and is absent for ordinary callers. `AttemptHistoryEntryV2` retains the all-null-or-all-present fixture ID/hash and Provider-request identity version/hash through the sole accepted attempt writer. Existing safe `ai_runs` columns retain target/input/request/config/Prompt/envelope identities. No raw Prompt, input, context, header, endpoint, body, secret or reasoning is retained.

The exported validation JSON is a strict read-only projection of the terminal row plus bounded official-source/runtime observations. Fixture/request hashes must cross-check the resource, source attestation, row and sole attempt entry. Candidate equality is proved by protected-output hash, not raw output. Projection failure cannot mutate/reset/retry the row.

## 4. Isolated PostgreSQL lifecycle, replay and crash behavior

The V1.1 loopback URL/database/user/session guards remain exact. Two database states are admissible:

1. **first start**: every CWT business/AI/Audit table is empty; apply accepted migrations, seed the one exact fixture transaction, enqueue once; or
2. **exact retained recovery**: only the exact fixture seed, its required Audit and at most its single `ai_runs` row exist; every identity is revalidated and `requestDraftAssistance` returns the same idempotent row. No seed, row or POST is duplicated.

Any other row, actor, Product, Audit, config, changed fixture value, active conflicting session or unrelated data fails closed. The database is never dropped/truncated by validation. It remains retained for independent evidence disposition.

One Worker instance and one accepted slot may process the sole row. `maxAttempts=1` makes the outcomes exact:

| Boundary | Durable result and recovery |
|---|---|
| before enqueue commit | no row/Audit/credential read/POST; corrected invocation may restart |
| enqueue or required Audit failure | atomic rollback; no row/read/POST |
| committed pending row before claim | replay returns same row; a later one Worker claim may perform the sole attempt |
| claim before `prepareTextDispatch` | one processing attempt; later preparation may invoke the sole reader once |
| missing/invalid credential in preparation | fixed `provider_auth_failed`, no dispatch marker/fetch; sole writer settles terminal failed; no retry |
| after preparation before committed fence | no POST; lease recovery records `not_dispatched` and terminal failure; no second reader/attempt |
| fence transaction failure/lost lease | no authorized marker/POST; accepted terminal recovery only |
| committed fence before/during/after POST but before settlement | external outcome unknown; accepted recovery records dispatched, conservatively charges upper cost and terminates; no second POST |
| settlement commit succeeds | one terminal row/attempt; idempotent replay returns it; projection may be regenerated by read only |
| projection write fails | terminal row remains sole authority; no Provider call or row mutation |

Cleanup stops the Worker, aborts pending local work, releases response/credential references and closes handles. It never deletes run/Audit evidence. A fresh billable call requires a separately authorized task and new reviewed fixture/database identity.

## 5. L-02 replacement: exact two-source preflight

### 5.1 Ordered preflight

The later controlled runner performs this exact order and stops on first failure:

1. verify Candidate/branch binding, CLI/environment gates, fixed fixture and absence of arbitrary/interactively supplied data;
2. strict-parse/recompute every Section 3 fixture identity using accepted code;
3. execute the preserved Node `24.14.0` loopback redirect/header semantic gate;
4. invoke `official_pricing_get` once;
5. only if step 4 passes, invoke `official_chat_completion_schema_get` once;
6. only if both pass, guard/seed or revalidate the isolated PostgreSQL and compose the accepted service/root;
7. enqueue/replay once, start one Worker and allow at most one claim;
8. at that accepted Worker attempt, let `prepareTextDispatch` perform the sole lazy credential read;
9. authorize the fence only after successful preparation, execute at most one POST, settle through accepted authorities; and
10. re-read the terminal row and create the strict projection.

Neither official-source module nor preflight/harness/script/root/config reads or probes the credential. Failure of either official source occurs before database claim, dispatch marker, credential read or billable POST. Unexecuted validation is `NOT_RUN`, never PASS.

### 5.2 Fixed official source contracts

The mandatory source set is exactly:

| Counter | Method / exact URL | Status/body cap | Required raw SHA-256 and facts |
|---|---|---|---|
| `official_pricing_get` | `GET https://api-docs.deepseek.com/quick_start/pricing/` | `200`; `<=65,536` bytes; observed `21,969` | `3af5e5d6992a4e26709ed37f02d9bfbc46ee92dc825e6588404728419f41ce71`; alias `deepseek-v4-flash`, version `DeepSeek-V4-Flash-0731`, hit/miss/output rates `2,800/140,000/280,000` microusd per million |
| `official_chat_completion_schema_get` | `GET https://api-docs.deepseek.com/api/create-chat-completion/` | `200`; `<=262,144` bytes; observed `125,153` | `2948bb768f4fedca3837bd402ca5bf7ca864b7bc6ef68312f82ebe4fb8ea9a3a`; `/chat/completions`, admitted model, `thinking.type=disabled`, `response_format.type=json_object`, non-streaming schema and zero `service_tier` occurrences |

Retrieval was completed at `2026-08-13T00:38:29+08:00` (`2026-08-12T16:38:29Z`) with Node `24.14.0`, no credential and no API/model call. Both hashes match immutable V1.1 observations.

Each GET uses HTTPS, the exact host/path, `redirect:"manual"`, `30,000 ms` timeout, fatal UTF-8 and its cap. Every `3xx` is rejected before `Location`/body use; no redirect is followed. There is no retry, mirror, alternate host/path, HEAD, cache fallback or hidden third read. Changed bytes/hash/facts/schema/rates, ambiguity or inability to parse the required bounded projection is a fail-closed reviewed-reconciliation stop before credential/claim/POST.

The exact normal-result counters are:

```text
official_pricing_get=1
official_chat_completion_schema_get=1
official_source_get_total=2
billable_post<=1
```

`official_source_get_total` must equal the sum of the two named counters. If pricing fails, counts are `1/0/1/0`; if Chat Completion fails, `1/1/2/0`. A normal completed PASS has `1/1/2/1`. Counters are invocation observations cross-checked against the fixed transport and terminal row; they are not a second attempt history.

The Worker still performs no remote price/schema lookup. Its compiled V2 pricing snapshot and freshness checks remain the sole dispatch pricing authority; current-source preflight only proves the separately authorized controlled invocation has not drifted.

## 6. L-03 replacement: sole lazy credential reader

The sole credential name remains `DEEPSEEK_API_KEY`. V1.0 Section 11's module-private reader/shape rules remain, except every statement permitting the controlled harness to report, inspect or probe presence/shape is deleted and replaced here.

`deepseek-text-adapter.ts` owns the only credential read/validation path. Its module-private default reader accesses `process.env.DEEPSEEK_API_KEY`; importing/constructing the adapter does not invoke it. The successor Phase D non-Production composition calls the adapter factory without a reader override; Production remains exact-empty and never constructs it. An injected reader exists only as a zero-secret test seam and is invoked by the adapter, never by the test/harness/root.

At one accepted Worker attempt, `prepareTextDispatch` performs credential-independent model/parameter/request/Prompt/envelope validation first, then invokes the chosen reader exactly once and validates the returned value in the same private frame. The value must be `20..512` printable ASCII bytes with no leading/trailing whitespace or control characters. It is never trimmed, copied into an exposed object, hashed, fingerprinted, serialized, logged or placed in an exception. Success captures the shortest-lived private reference needed by the one-shot closure; only `execute` constructs the one Authorization header after the committed fence. The reference is released on execution completion/cancellation.

Missing, non-string or invalid shape returns fixed redacted `provider_auth_failed` from preparation before the committed marker and before fetch. `maxAttempts=1` makes this the only reader opportunity for the controlled run. Pre-fence recovery cannot call it again; committed-fence recovery cannot execute again.

The controlled script, runner, official-source preflight, root, config, fixture loader, loopback gate, evidence projection and database guard must not read/probe/hash/fingerprint/buffer the key or report a presence boolean. Build, ordinary tests, PGlite, local/fake, disabled, Production and exact-empty Production registry paths must observe reader invocation count `0`.

Injected tests use an in-memory Synthetic sentinel and prove: valid preparation count `1`; missing/invalid count `1` with no marker/fetch; repeated call to the same prepared closure adds no reader/fetch; all preflight/ordinary/Production-disabled paths count `0`; no value or derivative reaches returned errors, durable evidence, output, logs or snapshots. The default reader is never invoked by ordinary tests.

## 7. Preserved M-02 and L-01 contracts

V1.1 Section 5 remains exact: built-in fetch uses `redirect:"manual"`; checks every `3xx` status before `Location` or body; never follows/resolves; redirect is non-retryable under sole Worker ownership. Application-controlled headers remain exactly `accept`, `content-type`, `authorization`; the pinned Node runtime-emitted name set and loopback proof remain unchanged. Runtime/header drift fails before controlled preflight proceeds. Exception text/stack is not authority.

V1.1 Section 6 remains exact: HTTP `200` top-level allowlist is only `id`, `object`, `created`, `model`, `system_fingerprint`, `choices`, `usage`; required fields and all nested rules remain strict; `service_tier` and every unknown success field are non-retryable invalid response. The current official schema check in Section 5 must continue to observe no support before any controlled call; it does not widen the schema automatically.

## 8. Exact executable proof obligations

All V1.0/V1.1 unaffected tests remain required. Attempt 2 adds/replaces these exact proofs:

1. execute [the accepted-contract reproduction](./review-evidence/phase-1b-stage4a-phase-d-exact-design-v1-2/ACCEPTED_CONTRACT_FIXTURE_REPRODUCTION_V1_2.mts) under Node `24.14.0`; require PD-11 prefix, classifier `allow`, binder accepted/fingerprint equality, output-policy accepted and protected `draft_human_review`;
2. strict fixture parser and every V1.2 byte/hash/identity assertion; no V1.1 tuple is accepted;
3. actual accepted authorization with active `product_editor`, Draft target/version and direct Synthetic seed; wrong role/status/version is pre-enqueue failure;
4. isolated PostgreSQL fake-Provider end-to-end path: required Audit + one row + one claim + one preparation + fence + one execution + one writer/settlement + protected `draft_ready` + terminal projection;
5. idempotent replay and both admissible database states, with zero second row/claim/reader/POST;
6. every Section 4 crash boundary, especially pre/post-fence, terminal recovery and projection regeneration, with `maxAttempts=1`;
7. source-attestation and Provider-request identity retention/cross-check without raw content;
8. exact pricing/schema GET order, method/URL/status/redirect/cap/hash/facts, normal `1/1/2`, each failure count, zero retry/third read and zero claim/credential/POST on source failure;
9. injected reader counts `1` for the accepted attempt and `0` for preflight/ordinary/disabled/Production paths, including missing/invalid redaction;
10. preserved fake-transport and real Node loopback redirect/header proof;
11. preserved strict success-schema proof, including `service_tier`/unknown-field rejection; and
12. projection unknown-field and credential/Prompt/input/context/header/exception/reasoning negative proof.

The later real Provider call may occur only after all zero-Provider-call proofs pass in the separately authorized implementation task. It is at most one Synthetic POST. PASS proves only observed API/account/schema/model/usage/timing/cost behavior; unexecuted is `NOT_RUN`; supplier assurance remains unresolved.

## 9. V5 architecture rules

V1.0 Section 18 and V1.1 Section 9 remain except this successor rule set controls fixture/source/credential semantics. V5 must fail on:

- any stale/non-V1.2 fixture tuple, second fixture, inline duplicate or mutable payload;
- any accepted-path classifier/output-policy/test bypass;
- any script/harness direct adapter/fetch/fence/repository/attempt/settlement authority;
- any Provider POST without the exact durable route or any `maxAttempts!=1` controlled run;
- any official-source GET outside `deepseek-official-source-preflight.ts`;
- any credential read/probe outside `deepseek-text-adapter.ts#prepareTextDispatch`, including preflight/root/config/script/harness;
- source counts other than the exact Section 5 state machine, retry, redirect follow/Location read, alternate URL or hidden source;
- raw Prompt/input/context/body/header/secret/derivative/exception/reasoning in durable/projected evidence;
- `redirect:"error"`, `redirect:"follow"`, caller headers, proxy/agent/dispatcher or weakened M-02 rules;
- `service_tier` or any unknown-success-field admission; or
- Production Provider/Prompt/pricing/budget reachability, Phase E/F/G reachability or residual-assurance relabeling.

External network endpoint/method pairs are exactly:

```text
GET  api-docs.deepseek.com /quick_start/pricing/
GET  api-docs.deepseek.com /api/create-chat-completion/
POST api.deepseek.com      /chat/completions
```

The first two share one official-doc origin but are distinct counted targets. Loopback-only Node/database tests are local, must reject non-loopback binding/destination and are not external calls. No other external origin/path/method is permitted.

## 10. Exact implementation mutation allowlist delta

V1.1 Section 10 remains the complete exact implementation add/modify/delete/evidence allowlist. V1.2 adds only these two implementation paths:

```text
src/integrations/ai/providers/deepseek-official-source-preflight.ts
src/integrations/ai/providers/deepseek-official-source-preflight.test.ts
```

The new module owns exactly the two credential-free official GETs and returns the strict bounded source projections/counters. `deepseek-pricing.ts` remains compiled pricing authority and performs no remote call. `OFFICIAL_DEEPSEEK_SOURCE_REVALIDATION.json` remains the sole implementation evidence path for both source projections. No other new implementation/test/evidence path is required (`NEW_PATHS_RELATIVE_TO_V1_1=2`).

No Schema, Migration, ADR, dependency/lockfile, env schema/example, Production Prompt/body/manifest, business/UI/Server Action, public route, Asset/storage or data-import path is authorized. Any unlisted need is `NEEDS_OWNER_DECISION`.

## 11. Dependency order and reviewer obligations

The later implementer must follow V1.1 Section 11, with these successor steps first:

1. implement/execute the sole strict fixture and accepted-contract tests before database/network work;
2. implement the two-source preflight and prove exact order/counters/zero-claim failure behavior;
3. implement the sole adapter-private lazy reader and invocation-count proofs;
4. implement the durable harness/attestation/identity/crash/replay proof;
5. rerun preserved M-02/L-01 and all Phase C regressions; then proceed with remaining V1.1 dependency order.

The fresh independent V1.2 reviewer must bind the exact Candidate and independently:

- reproduce Attempt 1 M-01 failure and V1.1 L-02/L-03 contradictions before evaluating closure;
- execute the V1.2 fixture against actual accepted Phase C contracts, not authored hashes;
- prove the exact durable route, role authorization, idempotency, crash/recovery and terminal-only projection;
- prove two-source order/count/redirect/failure behavior and sole reader counts;
- rerun M-02 manual redirect/header and L-01 strict schema as preserved closed findings;
- rerun consumer closure, official source/hash/facts, links, immutable predecessor hashes, manifest, docs-only/outside-allowlist diff and credential-shaped negative scan;
- challenge every preserved V1.0/V1.1 boundary and report severities independently; and
- keep Provider behavior `NOT_RUN` unless later independently executed, and supplier assurance residual-risk-only.

This author's evidence is preparation evidence, never self-acceptance.

## 12. Environment, phase and residual-risk boundaries

Production Provider/Prompt/pricing remain exact-empty/disabled and Production budget remains zero. Only this future protected, opt-in, non-Production Phase D controlled route may compose the adapter; ordinary local/test/Build/PGlite/disabled/Production paths do not. Phase D adds no business use-case/UI/application flow (Phase E), no deployed protected-Staging flow validation (Phase F), and no final review/freeze (Phase G).

No Production/customer/private/PII/formal/Product fact, Inquiry/CRM, file/URL/retrieval/Asset or public data is admitted. The output is a protected Draft candidate requiring human review; it cannot directly apply, infer a fact, Review/Publish/Index, change Route/rights/public truth or write public storage.

`PD-04`–`PD-08` and `PD-10` remain exactly the V1.0/V1.1 Owner-accepted non-blocking unresolved external assurance. Only signed/current account-specific Provider commitments on API data use/training, DPA, region/transfers, cache retention/disablement, subprocessors, isolation/security/SLA/incident terms could improve them. Public docs, contract tests or a successful POST do not close them.

## 13. Rollback and stop conditions

V1.1 rollback remains, with these exact corrections:

1. omit the controlled CLI gate and keep ordinary/Production composition disabled;
2. stop the Worker without reset/retry/delete; retain row/Audit/projection;
3. remove the two-source preflight, sole fixture/authority/attestor/runner and adapter/root changes together in one reviewed revert, restoring Phase C rather than layering compatibility;
4. revoke/rotate the protected credential operationally without recording it; and
5. retain already-written safe source/run/attempt/pricing/envelope/fixture/request evidence. No history rewrite or data deletion.

Stop as `NEEDS_OWNER_DECISION` if implementation requires any Schema/Migration/ADR/dependency/lockfile/env-schema/Production Prompt change, another fixture/source/call/retry/history/writer/budget/dispatch authority, a non-loopback/shared database, a changed exact tuple/cost/runtime/header/schema rule, a credential read outside preparation, or any unlisted path.

No Schema/Migration is needed because accepted JSON provenance/history and identity columns carry the bounded safe fields. No ADR is needed because the route converges on ADR-0017/0018's sole service/run/Worker authority. No dependency is needed because Node 24 and existing PostgreSQL/Prompt/canonicalization utilities suffice.

Subject only to a fresh independent V1.2 re-review, M-01 Attempt 2, L-02 and L-03 are design-addressed; M-02 and L-01 remain preserved closed. This Candidate is not accepted and does not authorize implementation.
