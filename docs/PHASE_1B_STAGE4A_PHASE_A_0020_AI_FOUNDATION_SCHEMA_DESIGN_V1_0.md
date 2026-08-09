# CWT Phase 1B Stage 4A Phase A — `0020_phase1b_ai_foundation` Schema Design

- Status: **DESIGN CANDIDATE — READY FOR INDEPENDENT MIGRATION REVIEW; NO MIGRATION GENERATED**
- Design version: `1.0`
- Prepared: `2026-08-10` (Asia/Shanghai)
- Schema baseline: `31c0e405acfdd0d05200d0fb2531e897a541a2c4` (`phase-1b-stage3-approved-2026-08-09`) plus the preserved local `0019` working-tree artifacts
- Planned Migration identity: `0020_phase1b_ai_foundation`
- Review owner: independent Migration Reviewer

## 1. Authority and authorization reconciliation

The Project Owner's current instruction for this Phase A task is the controlling authority:

- `PD-04` through `PD-07` Provider evidence is a non-blocking reference evaluation;
- the Owner accepts the current incomplete-Provider-information risk for the approved public company, Product, and business-content inputs;
- Stage 4A is `Architecture Approved / Development Authorized`;
- Provider-agnostic architecture, current Stage 4A scope, explicit-context/no-RAG, deferred visual AI, and deferred AI Customer Service remain frozen; and
- Deploy, Provider/API calls, credentials, formal-data import, Publish, and Index remain prohibited.

The older status lines in ADR-0018 and the pre-development review/plan still say development is not authorized. The current explicit Owner instruction supersedes those status lines only to permit this bounded Phase A design task. It does not amend ADR-0018's architecture, data, role, lifecycle, Provider, Prompt, Draft, review, Publish, Index, RAG, vision, fallback, or Customer Service decisions.

This document is not a Migration, Schema implementation, Stage 4A acceptance, Provider approval, Staging authorization, or Production authorization. Migration generation must wait for an independent Migration-design decision on this exact version or an explicitly revised successor.

## 2. Scope and non-scope

### 2.1 In scope

The future `0020` may create exactly two tables:

1. `ai_model_config` — the selectable model-configuration authority; and
2. `ai_runs` — the single AI work, claim, retry, provenance, candidate, cost, and human-disposition authority.

The design defines exact columns, types, defaults, foreign keys, delete behavior, Checks, partial unique indexes, idempotency, claim/lease fencing, retry, cancellation, optimistic concurrency, Audit transaction boundaries, Stage 4A Staging budget evidence, concurrency-safe budget admission, Fresh/Upgrade/repeat behavior, rollback compatibility, catalog evidence, and real-PostgreSQL query-plan evidence.

### 2.2 Frozen use cases

`use_case` is limited to:

1. `seo_content_draft`;
2. `fabric_knowledge_draft`;
3. `product_description_draft`; and
4. `sourcing_guide_draft`.

All four are `application_class = 'draft_assistance'` and `capability = 'text'`.

### 2.3 Explicitly absent

`0020` adds no:

- Prompt table or live Prompt-body editor;
- queue, run-history, attempt, evaluation, budget-ledger, or Draft/Revision table beyond `ai_runs`;
- RAG knowledge base, document ingestion, chunk, embedding, vector, retrieval, citation, or automatic-search state;
- visual/vision model, image Prompt, Asset transfer, generated-image, rights, or media-pipeline state;
- `customer_support` use case, conversation, message, tool, CRM/Inquiry relation, or outbound action;
- Inquiry, Contact, Organization, Customer Activity, private-file, PII, analytics-identity, Secret, credential, endpoint, raw header, private URL, or Object Key relation;
- fallback execution, fallback chain, or alternate-Provider retry state;
- Publish, Index, Route, Redirect, Canonical, Sitemap, public eligibility, rights approval, or public-state field; or
- new PostgreSQL enum, function, trigger, scheduled task, Worker table, Outbox kind, or persistent coordination authority.

Prompt bodies remain immutable reviewed repository resources in the independent Prompt Registry. Only Prompt identity/version/hash snapshots enter these tables.

## 3. Design decisions

1. New AI lifecycle values use Check-constrained `text`, not PostgreSQL enums. This avoids the enum upgrade hazard governed by ADR-0010.
2. Both tables are additive and initially empty. `0020` performs no seed, fixture, or backfill.
3. The later application bootstrap creates the four disabled-first DeepSeek configurations only through the authorized Domain Service with a real Admin actor and required Audit. The Migration never invents an actor.
4. `ai_runs` combines work and provenance intentionally. Bounded JSONB is used only where a second normalized table would violate ADR-0017/ADR-0018: sanitized source references, resolved parameters, per-attempt summaries, pricing evidence, and the validated candidate.
5. Current Product/Content/Revision targets use real restrictive foreign keys rather than an unconstrained polymorphic UUID.
6. No database trigger is introduced. Same-row structural validity is enforced with Checks; cross-row lifecycle transitions, immutable-field rules, Prompt/adapter registry agreement, authorization, and Audit are enforced by Domain Services with compare-and-swap updates and real PostgreSQL tests.
7. Stage 4A billable runs are structurally limited to Staging. `production` is rejected by a Check; a future Production decision requires a separately reviewed forward change.
8. Global text concurrency and daily/monthly spend admission use the `ai_runs` rows plus one transaction-scoped PostgreSQL advisory lock. No counter or budget table is added.

## 4. `ai_model_config`

### 4.1 Columns

| Column | PostgreSQL type | Null | Default | Meaning |
|---|---|---:|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | Primary key and stable configuration identity. |
| `capability` | `text` | No | `'text'` | Current capability; only `text` is legal. |
| `use_case` | `text` | No | none | One of the four frozen use cases. |
| `provider` | `text` | No | none | Normalized adapter-registry key; initially `deepseek`. |
| `model` | `text` | No | none | Provider model identifier; initially `deepseek-v4-flash`. |
| `parameters_json` | `jsonb` | No | `'{}'::jsonb` | Bounded adapter-allowlisted parameters only. No endpoint, credential, Prompt, tool, file, or data payload. |
| `max_input_tokens` | `integer` | No | `16000` | Per-attempt input-token ceiling. |
| `max_output_tokens` | `integer` | No | `4000` | Per-attempt output-token ceiling. |
| `max_attempts` | `integer` | No | `3` | Maximum total Provider attempts on the same logical run. |
| `run_cost_limit_microusd` | `bigint` | No | `20000` | Maximum all-attempt logical-run cost; `1 USD = 1,000,000 microusd`. |
| `prompt_id` | `text` | No | none | Immutable Prompt Registry ID. Prompt body is absent. |
| `prompt_version` | `integer` | No | none | Positive immutable Prompt Registry version. |
| `prompt_hash` | `text` | No | none | Lowercase SHA-256 of the reviewed Prompt resource. |
| `enabled` | `boolean` | No | `false` | Whether new runs may resolve this configuration. |
| `is_default` | `boolean` | No | `false` | Whether this row is a default candidate for its capability/use-case pair. A disabled default is permitted but is not resolvable. |
| `fallback_config_id` | `uuid` | Yes | `NULL` | Reserved self-reference. Current Stage 4A requires `NULL`. |
| `record_version` | `bigint` | No | `1` | Optimistic configuration version; incremented by every successful mutation. |
| `created_by_user_id` | `uuid` | No | none | Creating Admin evidence. |
| `updated_by_user_id` | `uuid` | No | none | Most recent authorized Admin evidence. |
| `created_at` | `timestamptz` | No | `now()` | Creation time. |
| `updated_at` | `timestamptz` | No | `now()` | Last successful mutation time. |

### 4.2 Foreign keys and delete policy

| Constraint name | Columns → target | `ON DELETE` | Reason |
|---|---|---|---|
| `ai_model_config_created_by_fk` | `created_by_user_id` → `users.id` | `RESTRICT` | Configuration provenance must retain the creating operator. Users are deactivated, not provenance-erased. |
| `ai_model_config_updated_by_fk` | `updated_by_user_id` → `users.id` | `RESTRICT` | Same for the latest operator. |
| `ai_model_config_fallback_fk` | `fallback_config_id` → `ai_model_config.id` | `RESTRICT` | Reserves a real explainable relation while the Stage 4A null Check keeps it inactive. |

All foreign keys use `ON UPDATE NO ACTION`.

An `ai_runs.model_config_id` reference, defined below, prevents deletion of every used configuration. The Domain Service exposes no physical-delete operation even for an unused configuration; disablement is the supported retirement path.

### 4.3 Check constraints

| Constraint name | Required expression/meaning |
|---|---|
| `ai_model_config_capability_check` | `capability = 'text'`. |
| `ai_model_config_use_case_check` | `use_case IN ('seo_content_draft','fabric_knowledge_draft','product_description_draft','sourcing_guide_draft')`. |
| `ai_model_config_provider_check` | `length(provider) BETWEEN 1 AND 64`, `provider = btrim(provider)`, and `provider ~ '^[a-z][a-z0-9_-]{0,63}$'`. |
| `ai_model_config_model_check` | `length(model) BETWEEN 1 AND 128`, `model = btrim(model)`, and `model !~ '[[:cntrl:]]'`. |
| `ai_model_config_parameters_check` | `jsonb_typeof(parameters_json) = 'object'` and `octet_length(parameters_json::text) <= 8192`. Recursive forbidden-key and adapter-schema validation remains a Domain Service invariant. |
| `ai_model_config_limits_check` | `max_input_tokens BETWEEN 1 AND 16000`, `max_output_tokens BETWEEN 1 AND 4000`, `max_attempts BETWEEN 1 AND 3`, and `run_cost_limit_microusd BETWEEN 0 AND 20000`. A zero cost limit is disabled-by-budget and cannot dispatch. |
| `ai_model_config_prompt_id_check` | `prompt_id ~ '^[a-z][a-z0-9-]{0,63}$'`. |
| `ai_model_config_prompt_version_check` | `prompt_version > 0`. |
| `ai_model_config_prompt_hash_check` | `prompt_hash ~ '^[0-9a-f]{64}$'`. |
| `ai_model_config_fallback_disabled_check` | `fallback_config_id IS NULL`. This is intentionally stricter than the nullable FK for current Stage 4A. |
| `ai_model_config_record_version_check` | `record_version > 0`. |
| `ai_model_config_timestamps_check` | `updated_at >= created_at`. |

### 4.4 Indexes

| Index | Definition | Purpose |
|---|---|---|
| `ai_model_config_pkey` | unique B-tree on `id` | Primary key. |
| `ai_model_config_enabled_default_unique` | unique B-tree on `(capability, use_case)` **where `enabled = true AND is_default = true`** | Enforces at most one resolvable default for each capability/use-case pair. This is the principal required partial unique index. |
| `ai_model_config_created_by_idx` | B-tree on `created_by_user_id` | FK/delete inspection and operator evidence. |
| `ai_model_config_updated_by_idx` | B-tree on `updated_by_user_id` | FK/delete inspection and operator evidence. |

Multiple disabled rows, including prepared/retired alternatives, are allowed. Only the partial-unique enabled default is resolvable.

### 4.5 Domain Service invariants

- The compiled use-case registry must agree on application class, capability, context policy, output schema, result rules, and allowed target class.
- `provider` must resolve to a compiled approved text adapter and Provider policy. A normalized unknown key still fails closed.
- `parameters_json` is recursively parsed by the adapter-specific allowlist. Unknown keys and nested endpoint, credential, authorization, header, Prompt, tool, file, URL, Object Key, customer, or private-data keys fail.
- `prompt_id`/`prompt_version`/`prompt_hash` must exactly match one reviewed immutable Prompt Registry resource for the same use case and capability.
- An enabled configuration must have a non-zero cost ceiling and a current locally validated pricing policy.
- Once referenced by an `ai_run`, capability, use case, Provider, model, parameters, limits, and Prompt identity are immutable on that row. A substantive change creates a new configuration; only `enabled`/`is_default` retirement or restoration may mutate a referenced row.
- Every mutation uses `WHERE id = :id AND record_version = :expected`, sets `record_version = record_version + 1`, and updates operator/time. Zero returned rows is a typed optimistic conflict.
- A default switch locks every affected configuration row in stable UUID order, validates all expected versions, clears the old default, sets the new state, and relies on the partial unique index as the final contention authority.
- Product/Content Editors and Reviewer/Publishers cannot mutate this table. No request-level Provider/model/parameter override exists.

### 4.6 Initial logical bootstrap (not Migration seed)

After later implementation and only through the audited Admin configuration service, one row per use case is expected with:

| Capability | Use case | Provider/model | Prompt | `is_default` | `enabled` | Fallback |
|---|---|---|---|---:|---:|---|
| `text` | `seo_content_draft` | `deepseek` / `deepseek-v4-flash` | `seo-content-draft@1` plus actual registry hash | `true` | `false` | `NULL` |
| `text` | `fabric_knowledge_draft` | `deepseek` / `deepseek-v4-flash` | `fabric-knowledge-draft@1` plus actual registry hash | `true` | `false` | `NULL` |
| `text` | `product_description_draft` | `deepseek` / `deepseek-v4-flash` | `product-description-draft@1` plus actual registry hash | `true` | `false` | `NULL` |
| `text` | `sourcing_guide_draft` | `deepseek` / `deepseek-v4-flash` | `sourcing-guide-draft@1` plus actual registry hash | `true` | `false` | `NULL` |

No placeholder Prompt hash is legal. Bootstrap waits for the real reviewed repository resource.

## 5. `ai_runs`

### 5.1 Identity, request, and target columns

| Column | PostgreSQL type | Null | Default | Meaning |
|---|---|---:|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | Logical run, work item, and provenance identity. |
| `application_class` | `text` | No | `'draft_assistance'` | Current application class only. |
| `capability` | `text` | No | `'text'` | Current capability only. |
| `use_case` | `text` | No | none | One of the four approved cases. |
| `requested_by_user_id` | `uuid` | No | none | Authorized resource-scoped operator. |
| `idempotency_key` | `uuid` | No | none | Globally unique enqueue-request identity supplied before first insert; retries remain transitions on this row and do not receive a new key. |
| `request_fingerprint_version` | `integer` | No | `1` | Canonical request-fingerprint contract. |
| `request_fingerprint` | `text` | No | none | Lowercase SHA-256 of the semantic request. |
| `target_type` | `text` | No | none | `product_draft`, `content_draft`, or `editorial_revision`. |
| `target_product_id` | `uuid` | Yes | `NULL` | Product localization owner when `target_type = 'product_draft'`. |
| `target_content_id` | `uuid` | Yes | `NULL` | Content localization owner when `target_type = 'content_draft'`. |
| `target_revision_id` | `uuid` | Yes | `NULL` | Existing Editorial Revision when `target_type = 'editorial_revision'`. |
| `target_locale` | `text` | Yes | `NULL` | Must be `en` for Product/Content Draft targets and null for a Revision, which owns its locale. |
| `expected_target_version` | `integer` | No | none | Enqueue-time `editor_document_version` for localization targets or parsed snapshot `draftVersion` for an editable Revision target. `editorial_revisions.version_number` is a stable lineage number, not its mutable Draft concurrency version. |
| `target_snapshot_hash` | `text` | No | none | Lowercase SHA-256 of the authorized target projection used for context. |

The request fingerprint version 1 is the lowercase SHA-256 of an RFC 8785-canonical JSON object containing exactly the caller-controlled semantic request: actor ID, application class, capability, use case, target type and identity, locale, expected target version, target snapshot hash, ordered explicitly selected safe source references, and the canonical explicit operator-input hash. It excludes transport metadata, timestamps, idempotency key, resolved configuration, Provider/model, Prompt, policy/schema versions, pricing/budget snapshots, and all current registry/default state. Those resolved values are independently frozen on the inserted run. Therefore an exact response-loss replay still returns the original run after a later configuration, Prompt, policy, or deployment switch; changing any caller-controlled semantic input with the same key is a conflict.

At enqueue and again at human acceptance, the Domain Service resolves the parent record under actor scope. `product_draft` and `content_draft` require the parent Product/Content record to remain Draft. A Published parent must use an ordinary Draft Editorial Revision instead. `editorial_revision` requires `entity_type` to be Product or Content, `locale = 'en'`, the Revision to be in its editable Draft state, and its locally validated Product/Content snapshot to expose a positive `draftVersion`; approved, applied, rejected, already-submitted, legacy-unversioned, or otherwise unsupported Revision snapshots are not AI write targets. A Product Revision permits only the same use cases as `product_draft`; a Content Revision permits only the same use cases as `content_draft`. These cross-table status/type rules do not justify a trigger or another target table.

### 5.2 Resolved configuration, Prompt, and policy snapshot columns

| Column | PostgreSQL type | Null | Default | Meaning |
|---|---|---:|---|---|
| `model_config_id` | `uuid` | No | none | Selected `ai_model_config` identity. |
| `model_config_version` | `bigint` | No | none | Selected `record_version`. |
| `resolved_config_hash` | `text` | No | none | SHA-256 of the canonical resolved snapshot. |
| `requested_provider` | `text` | No | none | Provider selected by configuration. |
| `actual_provider` | `text` | Yes | `NULL` | Adapter actually dispatched; no fallback means it must equal the requested Provider for a usable candidate. |
| `requested_model` | `text` | No | none | Model selected by configuration. |
| `returned_model` | `text` | Yes | `NULL` | Provider-reported model. A usable candidate requires an exact approved match. |
| `parameters_snapshot_json` | `jsonb` | No | none | Bounded resolved adapter parameters, without Secrets or endpoints. |
| `max_input_tokens` | `integer` | No | none | Immutable copied input ceiling. |
| `max_output_tokens` | `integer` | No | none | Immutable copied output ceiling. |
| `max_attempts` | `integer` | No | none | Immutable copied maximum attempts. |
| `prompt_id` | `text` | No | none | CWT Prompt ID. |
| `prompt_version` | `integer` | No | none | CWT Prompt version. |
| `prompt_hash` | `text` | No | none | CWT Prompt content hash. |
| `provider_envelope_version` | `integer` | No | none | Reviewed Provider-envelope version. |
| `provider_envelope_hash` | `text` | No | none | Reviewed Provider-envelope hash. |
| `input_schema_version` | `integer` | No | none | Context/input contract version. |
| `output_schema_version` | `integer` | No | none | Candidate contract version. |
| `policy_version` | `text` | No | none | Compiled use-case/context/factual/output policy version. |

These explicit columns plus `parameters_snapshot_json` are the immutable configuration snapshot; no second opaque configuration payload is stored.

`resolved_config_hash` is the lowercase SHA-256 of an RFC 8785-canonical JSON object containing exactly: `application_class`, `capability`, `use_case`, `model_config_id`, `model_config_version`, `requested_provider`, `requested_model`, `parameters_snapshot_json`, the three copied token/attempt ceilings, `run_cost_limit_microusd`, Prompt ID/version/hash, Provider-envelope version/hash, input/output schema versions, and `policy_version`. Budget-policy/pricing snapshots and target/input data are deliberately outside this configuration hash and have their own immutable columns/hashes.

### 5.3 Bounded input, attempt, and candidate columns

| Column | PostgreSQL type | Null | Default | Meaning |
|---|---|---:|---|---|
| `input_sources_json` | `jsonb` | No | `'[]'::jsonb` | Sanitized explicit source references and safe provenance only; never source bodies, private paths, or arbitrary URLs. |
| `input_context_json` | `jsonb` | No | none | Exact bounded, sanitized Provider-neutral context required for durable claim/retry; contains only the data classes permitted by DF-02. It is protected run data, not a Prompt or public payload. |
| `input_hash` | `text` | No | none | SHA-256 of the exact bounded Provider-neutral input document. |
| `attempt_history_json` | `jsonb` | No | `'[]'::jsonb` | Append-only, maximum-three sanitized attempt summaries. No raw Prompt, raw Provider body, credential, or protected content. |
| `candidate_json` | `jsonb` | Yes | `NULL` | Locally schema- and policy-validated Draft candidate only. |
| `candidate_hash` | `text` | Yes | `NULL` | SHA-256 of canonical `candidate_json`. |

Each attempt summary contains only: attempt number, a lowercase SHA-256 response fingerprint when a response exists, requested/actual Provider and requested/returned Model, Provider-envelope version/hash, dispatch/response times and duration, reported token counts, estimated/actual/accounted microusd, actual-cost completeness, normalized response status, HTTP status, safe Provider code/request ID, safe CWT failure code, and outcome (`retry_scheduled`, `failed`, `draft_ready`, or `discarded_cancelled`). The response fingerprint is derived from the normalized safe envelope and retains no raw response. Array membership, order, and attempt identity are append-only. A cancelled active attempt may first append a closed `discarded_cancelled` summary with response fields null; the only permitted later mutation is monotonic enrichment for that same attempt and former lease token. Its attempt identity, request/dispatch evidence, and original conservative upper bound remain immutable; late actual evidence may fill null response/usage fields, change `actual_cost_complete`, and recompute only the accounted amount under the rule in Section 10.5.

### 5.4 Lifecycle, claim, retry, cancellation, and timing columns

| Column | PostgreSQL type | Null | Default | Meaning |
|---|---|---:|---|---|
| `status` | `text` | No | `'pending'` | Exactly `pending`, `processing`, `draft_ready`, `failed`, or `cancelled`. |
| `retry_state` | `text` | No | `'none'` | Exactly `none`, `scheduled`, `exhausted`, or `not_retryable`. |
| `attempt_count` | `integer` | No | `0` | Number of Provider-attempt claims begun on this logical run. |
| `next_attempt_at` | `timestamptz` | Yes | `now()` | Due time for initial work or an approved retry. |
| `lease_owner` | `text` | Yes | `NULL` | Bounded Worker instance identity. |
| `lease_token` | `uuid` | Yes | `NULL` | Random attempt claim token used in every Worker compare-and-swap. |
| `lease_acquired_at` | `timestamptz` | Yes | `NULL` | Claim time. |
| `lease_expires_at` | `timestamptz` | Yes | `NULL` | Finite lease deadline. |
| `active_attempt_dispatched_at` | `timestamptz` | Yes | `NULL` | Dispatch marker for the current lease/attempt only. It distinguishes a claimed-but-undispatched retry from a dispatched retry and is cleared on every transition out of `processing`. |
| `state_version` | `bigint` | No | `1` | Optimistic run/lease/cancellation fence version. |
| `cancelled_lease_token` | `uuid` | Yes | `NULL` | Former active token retained only when a processing run is cancelled; permits accounting-only late-response recording and can never authorize a candidate. |
| `cancelled_by_user_id` | `uuid` | Yes | `NULL` | Authorized cancellation actor. |
| `cancellation_reason` | `text` | Yes | `NULL` | Bounded sanitized reason. |
| `cancelled_at` | `timestamptz` | Yes | `NULL` | Durable cancellation fence time. |
| `queued_at` | `timestamptz` | No | `now()` | Durable enqueue/creation time. |
| `provider_dispatched_at` | `timestamptz` | Yes | `NULL` | First actual Provider dispatch time across the logical run; unlike `active_attempt_dispatched_at`, it is retained historically. |
| `generated_at` | `timestamptz` | Yes | `NULL` | Most recent Provider response completion time. |
| `completed_at` | `timestamptz` | Yes | `NULL` | Terminal generation outcome time. |
| `generation_duration_ms` | `bigint` | No | `0` | Cumulative external generation time across attempts. |
| `updated_at` | `timestamptz` | No | `now()` | Last durable state/accounting/disposition update. |

### 5.5 Provider outcome, token, and failure columns

| Column | PostgreSQL type | Null | Default | Meaning |
|---|---|---:|---|---|
| `input_tokens` | `integer` | Yes | `NULL` | Cumulative reported input tokens when complete evidence is available. |
| `output_tokens` | `integer` | Yes | `NULL` | Cumulative reported output tokens when complete evidence is available. |
| `total_tokens` | `integer` | Yes | `NULL` | Cumulative reported total tokens when supplied/derivable. |
| `provider_response_status` | `text` | No | `'not_dispatched'` | Normalized last-attempt response class. |
| `provider_http_status` | `integer` | Yes | `NULL` | Safe HTTP status, if any. |
| `provider_error_code` | `text` | Yes | `NULL` | Sanitized Provider code. |
| `provider_request_id` | `text` | Yes | `NULL` | Sanitized Provider request identifier. |
| `failure_code` | `text` | Yes | `NULL` | Current safe CWT failure/retry classification. |
| `failure_detail` | `text` | Yes | `NULL` | Sanitized operator-safe detail, maximum 500 characters. |

Allowed `provider_response_status` values are:

```text
not_dispatched
success
timeout
transport_error
rate_limited
quota_exceeded
client_error
server_error
safety_rejected
invalid_response
model_drift
cancelled_no_response
cancelled_late_response
unknown
```

Provider-specific response bodies are never stored.

### 5.6 Staging budget and concurrency snapshot columns

| Column | PostgreSQL type | Null | Default | Meaning |
|---|---|---:|---|---|
| `execution_environment` | existing `app_environment` enum | No | none | Current `0020` permits `local`, `test`, or `staging`; never `production`. |
| `budget_policy_version` | `text` | No | none | `stage4a-staging-v1` or `nonbillable-v1`. |
| `budget_timezone` | `text` | No | `'Asia/Shanghai'` | Budget-period authority. |
| `budget_currency` | `text` | No | `'USD'` | Accounting currency. |
| `text_concurrency_limit` | `integer` | No | `2` | Frozen current text concurrency ceiling. |
| `budget_charge_day` | `date` | Yes | `NULL` | Asia/Shanghai day of the first successful claim; immutable thereafter. |
| `budget_charge_month` | `date` | Yes | `NULL` | First day of the corresponding charge month; immutable thereafter. |
| `run_cost_limit_microusd` | `bigint` | No | none | Copied logical-run ceiling, at most `20000` in Staging. |
| `daily_hard_limit_microusd` | `bigint` | No | none | Staging value `5000000` (`USD 5`). |
| `monthly_warning_limit_microusd` | `bigint` | No | none | Staging value `50000000` (`USD 50`). |
| `monthly_hard_limit_microusd` | `bigint` | No | none | Staging value `100000000` (`USD 100`). |
| `estimated_max_cost_microusd` | `bigint` | No | none | Locally calculated worst-case all-attempt cost under token/attempt ceilings. |
| `actual_cost_microusd` | `bigint` | No | `0` | Sum of known actual attempt costs. |
| `actual_cost_complete` | `boolean` | No | `true` | False if any dispatched attempt lacked complete usage/cost evidence. |
| `budget_accounted_cost_microusd` | `bigint` | No | `0` | Budget debit: known actual cost or a conservative precomputed attempt upper bound when actual evidence is incomplete. |
| `budget_reserved_cost_microusd` | `bigint` | No | `0` | Remaining conservative reservation while work may continue. |
| `cost_accounting_state` | `text` | No | `'preflight'` | `preflight`, `reserved`, or `final`. |
| `pricing_snapshot_json` | `jsonb` | No | none | Bounded source/version/rates/formula/effective-time evidence; no credential or arbitrary endpoint. |

The entire logical run, including retries across midnight or month-end, remains charged to its first-claim day/month. The full remaining logical-run ceiling is reserved before the first Provider call, so a later retry never obtains a second budget allowance. This is an authorization-cohort budget, not a claim about the Provider's invoice-calendar grouping.

If Provider usage/cost is missing after dispatch, the precomputed attempt upper bound is debited to `budget_accounted_cost_microusd`, `actual_cost_complete` becomes false, and the missing evidence is retained in `attempt_history_json`. No dispatch is allowed unless a defensible upper bound exists before the call. This is the fail-closed path for unknown/unreportable cost.

For a non-cancelled Provider completion, if stronger actual evidence exceeds the logical-run ceiling despite preflight, the overrun is still durably recorded, the reservation becomes zero, and the run terminates `failed + not_retryable` with `failure_code = 'run_cost_limit_exceeded'`; no candidate may be retained. A late response cannot change an already cancelled generation status, but its overrun is still accounted. Accounting truth is never rejected to make the cap appear satisfied.

### 5.7 Human disposition and quality columns

| Column | PostgreSQL type | Null | Default | Meaning |
|---|---|---:|---|---|
| `human_disposition` | `text` | No | `'not_evaluated'` | `not_evaluated`, `accepted`, `accepted_with_edits`, or `rejected`. |
| `quality_rating` | `smallint` | Yes | `NULL` | Optional `1`–`5`. |
| `quality_labels` | `text[]` | No | `'{}'::text[]` | Optional allowlisted labels. |
| `quality_comment` | `text` | Yes | `NULL` | Optional sanitized comment, maximum 1000 characters. |
| `evaluated_by_user_id` | `uuid` | Yes | `NULL` | Authorized evaluator/disposition actor. |
| `evaluated_at` | `timestamptz` | Yes | `NULL` | Evaluation/disposition time. |
| `applied_target_version` | `integer` | Yes | `NULL` | New `editor_document_version` when accepted directly into the Product/Content Draft. |
| `applied_revision_id` | `uuid` | Yes | `NULL` | Existing/new ordinary Editorial Revision linked when the accepted proposal is saved through Revision authority. |
| `applied_revision_version` | `integer` | Yes | `NULL` | Parsed Revision snapshot `draftVersion` returned by the atomic accepted-proposal save; paired with `applied_revision_id` so later Revision edits do not erase which Draft version received the proposal. |

Initial quality labels are exactly:

```text
factual_issue
relevance
clarity
tone
format
duplication
unsafe_claim
```

No evaluation is sent to a Provider or used for Provider training automatically.

## 6. `ai_runs` foreign keys and delete behavior

| Constraint name | Columns → target | `ON DELETE` | Reason |
|---|---|---|---|
| `ai_runs_requested_by_fk` | `requested_by_user_id` → `users.id` | `RESTRICT` | Mandatory operator provenance. |
| `ai_runs_model_config_fk` | `model_config_id` → `ai_model_config.id` | `RESTRICT` | Historical configuration identity cannot disappear. |
| `ai_runs_target_product_localization_fk` | (`target_product_id`,`target_locale`) → `product_localizations(product_id,locale)` | `RESTRICT` | Real target and locale; blocks provenance-erasing Product/localization deletion. |
| `ai_runs_target_content_localization_fk` | (`target_content_id`,`target_locale`) → `content_localizations(content_id,locale)` | `RESTRICT` | Same for Content. |
| `ai_runs_target_revision_fk` | `target_revision_id` → `editorial_revisions.id` | `RESTRICT` | Existing Revision provenance. |
| `ai_runs_cancelled_by_fk` | `cancelled_by_user_id` → `users.id` | `RESTRICT` | Cancellation evidence. |
| `ai_runs_evaluated_by_fk` | `evaluated_by_user_id` → `users.id` | `RESTRICT` | Human disposition/evaluation evidence. |
| `ai_runs_applied_revision_fk` | `applied_revision_id` → `editorial_revisions.id` | `RESTRICT` | Accepted-output association. |

All use `ON UPDATE NO ACTION`. There is no cascade or set-null path from an existing business/user record into AI provenance.

## 7. `ai_runs` Check-constraint catalog

The Migration Reviewer must compare the generated definitions with this catalog, not merely check that similarly named constraints exist.

| Constraint name | Required rule |
|---|---|
| `ai_runs_application_scope_check` | `application_class = 'draft_assistance'`, `capability = 'text'`, and `use_case` is one of the four frozen values. |
| `ai_runs_target_shape_check` | Exactly one target FK is non-null. Product/Content targets require `target_locale = 'en'`; Revision requires `target_locale IS NULL`. `target_type` must agree with the non-null FK. |
| `ai_runs_target_use_case_check` | Product Draft permits `seo_content_draft` or `product_description_draft`; Content Draft permits `seo_content_draft`, `fabric_knowledge_draft`, or `sourcing_guide_draft`; Revision permits any frozen use case, with its `entity_type` agreement rechecked by the service. |
| `ai_runs_target_version_check` | `expected_target_version > 0`; `target_snapshot_hash ~ '^[0-9a-f]{64}$'`. |
| `ai_runs_request_identity_check` | `request_fingerprint_version = 1` and `request_fingerprint ~ '^[0-9a-f]{64}$'`. |
| `ai_runs_config_identity_check` | `model_config_version > 0`, `resolved_config_hash ~ '^[0-9a-f]{64}$'`, and requested/actual Provider and requested/returned Model identifiers satisfy the same normalization/bounds as `ai_model_config` when non-null. An unexpected actual Provider/model must remain recordable as failed `model_drift` evidence; only `draft_ready` requires exact equality. |
| `ai_runs_config_snapshot_check` | `jsonb_typeof(parameters_snapshot_json) = 'object'`, size at most 8192 bytes; copied token/attempt limits match the same numeric bounds as `ai_model_config`. |
| `ai_runs_prompt_policy_check` | `prompt_id ~ '^[a-z][a-z0-9-]{0,63}$'`; Prompt/envelope hashes match `^[0-9a-f]{64}$`; Prompt, Provider-envelope, input-schema, and output-schema versions are positive; `policy_version` has length 1–80, equals `btrim(policy_version)`, has no control character, and matches `^[a-z0-9][a-z0-9._-]{0,79}$`. |
| `ai_runs_input_attempt_json_check` | `input_sources_json` and `attempt_history_json` are arrays; each is at most 65536 bytes. `input_context_json` is an object at most 131072 bytes. `jsonb_array_length(attempt_history_json) <= max_attempts` and `<= attempt_count`; `input_hash` matches `^[0-9a-f]{64}$`. Content/hash equality and element schemas are Domain Service invariants, not claims made by this Check. |
| `ai_runs_candidate_check` | `status = 'draft_ready'` iff both candidate fields are non-null; candidate is a JSON object at most 262144 bytes; `candidate_hash` matches `^[0-9a-f]{64}$`. Every other status requires both candidate fields null. Content/hash equality is a Domain Service invariant. |
| `ai_runs_status_check` | Status is exactly `pending`, `processing`, `draft_ready`, `failed`, or `cancelled`. |
| `ai_runs_retry_state_check` | Retry state is exactly `none`, `scheduled`, `exhausted`, or `not_retryable`. Pending permits `none`/`scheduled`; processing, draft-ready, and cancelled require `none`; failed requires `exhausted`/`not_retryable`. |
| `ai_runs_attempt_check` | `attempt_count BETWEEN 0 AND max_attempts`; processing/draft-ready/failed require `attempt_count >= 1`; a scheduled retry requires `attempt_count >= 1`; only an initial pending row or a cancellation before any claim may have attempt zero. |
| `ai_runs_next_attempt_check` | Pending requires non-null `next_attempt_at`; all other statuses require it null. |
| `ai_runs_lease_shape_check` | Processing requires all of `lease_owner`, `lease_token`, `lease_acquired_at`, and `lease_expires_at`, with owner length 1–128, `lease_owner = btrim(lease_owner)`, no control character, and expiry strictly after acquisition. Non-processing requires all four null. |
| `ai_runs_active_attempt_dispatch_check` | `active_attempt_dispatched_at` is null or (`status = 'processing'`, `lease_acquired_at IS NOT NULL`, `active_attempt_dispatched_at >= lease_acquired_at`, `active_attempt_dispatched_at < lease_expires_at`, `provider_dispatched_at IS NOT NULL`, and `provider_dispatched_at <= active_attempt_dispatched_at`). `(provider_dispatched_at IS NULL) = (actual_provider IS NULL)` and a non-null first-dispatch time is not before `queued_at`. |
| `ai_runs_state_version_check` | `state_version > 0`. |
| `ai_runs_cancellation_check` | `status = 'cancelled'` iff cancellation actor/reason/time are all non-null; reason length 1–500 and control-character free. `cancelled_lease_token` is null unless status is cancelled. |
| `ai_runs_terminal_time_check` | `completed_at` is non-null exactly for draft-ready/failed/cancelled; queued time is not after dispatch/generated/completed/update times when those values exist; a non-null `generated_at` requires and is not before `provider_dispatched_at`; draft-ready requires a non-null generated time. Draft-ready/failed completion is not before a non-null generated time. Cancelled may record a later generated time only with `provider_response_status = 'cancelled_late_response'`. `updated_at` is not before queued/generated/completed times when those values exist; duration is non-negative. |
| `ai_runs_token_check` | Token values are null or non-negative; when input, output, and total are all non-null, `total_tokens = input_tokens + output_tokens`. |
| `ai_runs_provider_response_check` | Normalized response status is in the frozen list; HTTP status is null or 100–599; Provider code length at most 80; request ID length at most 200; neither permits control characters. `cancelled_no_response` requires cancelled status, a former lease token, and a prior dispatch; `cancelled_late_response` additionally requires a non-null generated time. Draft-ready requires response `success`, `actual_provider = requested_provider`, `returned_model = requested_model`, and null top-level failure fields. |
| `ai_runs_failure_check` | Failure code is null or matches `^[a-z0-9_]{1,80}$`; detail length at most 500/control-character free. Failed and scheduled-retry rows require a failure code. |
| `ai_runs_environment_budget_policy_check` | Production is rejected. Staging requires policy `stage4a-staging-v1`, timezone `Asia/Shanghai`, currency `USD`, concurrency `2`, run limit 1–20000, daily hard 5000000, monthly warning 50000000, and monthly hard 100000000. Local/test require `nonbillable-v1`, concurrency 2, daily/monthly limits and all estimated/actual/accounted/reserved costs zero; the copied configuration run ceiling may remain 0–20000 but grants no non-Staging spend authority. |
| `ai_runs_budget_period_check` | Charge day/month are both null or both non-null; a non-null month is its first calendar day and equals the month containing the charge day. Preflight requires both null. Post-first-claim immutability is enforced by the typed Domain Service transition allowlists. |
| `ai_runs_cost_values_check` | Estimated, actual, accounted, and reserved values are non-negative; Staging estimated maximum is 1–run limit; `actual <= accounted`; a positive reservation requires `accounted + reserved <= run limit`. A recorded actual overrun is preserved by raising accounted to actual and setting reservation to zero, even when accounted then exceeds the run limit. Pricing snapshot is a JSON object, non-empty in Staging, at most 8192 bytes. |
| `ai_runs_cost_state_check` | Cost state is `preflight`, `reserved`, or `final`. Preflight requires pending/attempt zero/null charge period/no reservation/no accounted cost. Reserved requires pending or processing and a non-null charge period. Final requires draft-ready/failed/cancelled and zero reservation. A final null charge period is legal only when `status = 'cancelled'`, `attempt_count = 0`, `provider_dispatched_at IS NULL`, and actual/accounted costs are zero; every other final row requires the retained charge period. |
| `ai_runs_disposition_check` | Disposition is one of the four frozen values and any non-`not_evaluated` value requires `status = 'draft_ready'`, evaluator, and evaluation time. `not_evaluated` requires all evaluation/association fields empty. Rejected requires no applied association. Accepted/accepted-with-edits requires exactly one association shape: (a) `applied_target_version > expected_target_version` with both Revision association fields null, or (b) a non-null `applied_revision_id` plus positive `applied_revision_version` with direct target version null. For an Editorial Revision target, the applied ID must equal the target ID and the applied Revision version must exceed the expected target version. |
| `ai_runs_quality_check` | Rating null or 1–5; labels contain no null or duplicate element, are a subset of the seven frozen labels, and have cardinality at most 7; comment null or length at most 1000/control-character free. Duplicate-freedom is enforced by requiring cardinality to equal the sum of the seven per-label presence indicators. A direct `applied_target_version` is legal only for Product/Content Draft targets. |

The transition graph itself is not implemented as a trigger. It is enforced by typed compare-and-swap Domain Service commands and transition tests:

```text
pending -> processing | cancelled
processing -> draft_ready | failed | cancelled | pending
failed -> pending          # authorized manual retry only when policy still permits
```

`draft_ready` and `cancelled` are terminal for generation. Human disposition does not rewrite generation status. `dead` and `succeeded` are invalid.

## 8. `ai_runs` indexes

| Index | Exact leading columns/predicate | Principal query |
|---|---|---|
| `ai_runs_pkey` | unique `(id)` | Primary key. |
| `ai_runs_idempotency_key_unique` | unique `(idempotency_key)` | Exact replay and key-reuse conflict. |
| `ai_runs_active_lease_token_unique` | unique `(lease_token)` where `lease_token IS NOT NULL` | One active claim token maps to one run; required partial unique fence. |
| `ai_runs_claimable_idx` | `(execution_environment, next_attempt_at, queued_at, id)` where `status = 'pending'` | Due-work ordered claim with `FOR UPDATE SKIP LOCKED`. |
| `ai_runs_active_lease_idx` | `(execution_environment, lease_expires_at, id)` where `status = 'processing'` | Active-concurrency count and expired-lease recovery. |
| `ai_runs_budget_day_idx` | `(budget_charge_day)` include (`budget_accounted_cost_microusd`,`budget_reserved_cost_microusd`) where `execution_environment = 'staging' AND budget_charge_day IS NOT NULL` | Daily hard-stop aggregate. |
| `ai_runs_budget_month_idx` | `(budget_charge_month)` include (`budget_accounted_cost_microusd`,`budget_reserved_cost_microusd`) where `execution_environment = 'staging' AND budget_charge_month IS NOT NULL` | Monthly warning/hard-stop aggregate. |
| `ai_runs_model_config_idx` | `(model_config_id, queued_at DESC)` | Configuration history and FK lookup. |
| `ai_runs_requester_history_idx` | `(requested_by_user_id, queued_at DESC, id)` | Resource-scoped operator history. |
| `ai_runs_admin_status_idx` | `(status, use_case, queued_at DESC, id)` | Bounded redacted Admin list. |
| `ai_runs_target_product_idx` | `(target_product_id, queued_at DESC, id)` where `target_product_id IS NOT NULL` | Product target history and FK lookup. |
| `ai_runs_target_content_idx` | `(target_content_id, queued_at DESC, id)` where `target_content_id IS NOT NULL` | Content target history and FK lookup. |
| `ai_runs_target_revision_idx` | `(target_revision_id, queued_at DESC, id)` where `target_revision_id IS NOT NULL` | Revision target history and FK lookup. |
| `ai_runs_applied_revision_idx` | `(applied_revision_id)` where `applied_revision_id IS NOT NULL` | Accepted Revision association and FK lookup. |
| `ai_runs_cancelled_by_idx` | `(cancelled_by_user_id)` where `cancelled_by_user_id IS NOT NULL` | Sparse cancellation-actor FK lookup. |
| `ai_runs_evaluated_by_idx` | `(evaluated_by_user_id)` where `evaluated_by_user_id IS NOT NULL` | Sparse evaluator FK lookup. |

No partial unique “one active run per target” is added. Distinct authorized requests may produce alternative candidates; idempotency prevents the same semantic request from duplicating a run, global concurrency bounds work, and target-version/Audit fencing prevents duplicate accepted Draft mutation. A target-level uniqueness rule would impose an unapproved UX policy.

## 9. Idempotent enqueue and retry

### 9.1 Enqueue

The authorized enqueue transaction:

1. rechecks actor role and target record scope;
2. validates explicit-context sources and target expected version/hash, then canonicalizes request fingerprint version 1;
3. looks up the idempotency key under that record scope. An exact existing replay returns immediately without consulting current feature/configuration state or writing another Audit; mismatched or unauthorized cases follow the rules below;
4. for a genuinely new request, checks the global feature gate;
5. resolves and row-locks one `enabled AND is_default` configuration;
6. validates the compiled use-case, adapter, Provider, Prompt, schema, pricing, and budget policy;
7. inserts one pending `ai_runs` row with immutable snapshots; and
8. writes the required Audit in the same transaction.

The early lookup is only a replay fast path; the unique idempotency index remains the contention authority. The insert uses `ON CONFLICT (idempotency_key) DO NOTHING RETURNING id`, avoiding a PostgreSQL transaction-abort path. Required Audit is written only when this transaction receives the inserted ID. A no-row return is followed by a scoped fetch and the same comparison:

- same actor/scope and exact fingerprint returns the existing run without a second Audit or run;
- a mismatched fingerprint returns a typed conflict and exposes no prior payload; and
- an unauthorized caller receives no existence information.

### 9.2 Retry

- Automatic and manual retry always advance the same `ai_runs.id`; they never insert another row.
- Provider/model/Prompt/policy/target/input snapshots never change on retry.
- Retry never dispatches a fallback configuration.
- An approved transient failure moves `processing -> pending`, sets `retry_state = 'scheduled'`, records safe attempt evidence, moves the known actual or conservative current-attempt debit from reservation to accounted cost, retains only the remaining logical-run reservation (`run_cost_limit_microusd - budget_accounted_cost_microusd`, never below zero), clears the lease and active-attempt dispatch tuple, sets the next due time, and increments `state_version`.
- Exhaustion is `failed + exhausted`; a non-retryable classification is `failed + not_retryable`.
- Manual `failed -> pending` is an authorized, audited compare-and-swap and is permitted only when attempt and logical-run budget ceilings still permit another attempt. In the same transaction it takes the AI claim/budget advisory lock and reacquires only the remaining logical-run reservation against the immutable original charge period; a budget denial leaves the run failed. The existence of the lifecycle edge does not override the ceiling or grant a second per-run allowance.

## 10. Claim, lease, retry recovery, and cancellation fence

### 10.1 Single claim/budget lock

Every claim, budget reservation/release, terminal cost update, cancellation that changes a reservation, and expired-lease recovery takes the transaction-scoped lock:

```sql
select pg_try_advisory_xact_lock(1129792594, 1) as acquired;
```

The fixed key is reserved in CWT code as `CWT_AI_TEXT_CLAIM_BUDGET`. A false result performs no mutation: a claimant backs off on its poll schedule, a lease holder retries within its valid lease, and a user-driven operation returns a typed retryable-busy result. The lock serializes only short database admission/accounting transactions, never the external Provider call. This one non-blocking transaction lock gives a stable order for concurrency count and daily/monthly budget sums without a third table, long wait, or session lock.

Lock ordering is invariant: every participating command obtains this advisory lock before any `ai_runs` row lock, then locks run rows in ascending UUID order if more than one is ever needed, and writes required Audit last. No path may hold an `ai_runs` row lock while attempting the advisory lock. Configuration/target locks used by enqueue or human acceptance do not overlap a budget transition in the same transaction.

### 10.2 Claim transaction

Under the lock, the Worker:

1. reconciles an expired processing row before admitting more work;
2. counts `processing` rows for its environment with `lease_expires_at > clock_timestamp()` and stops when the count is `>= 2`;
3. selects one due pending row ordered by `next_attempt_at, queued_at, id` with `FOR UPDATE SKIP LOCKED`;
4. on its first claim, fixes `budget_charge_day = (transaction_timestamp() AT TIME ZONE 'Asia/Shanghai')::date` and `budget_charge_month = date_trunc('month', transaction_timestamp() AT TIME ZONE 'Asia/Shanghai')::date`; later attempts retain both values;
5. computes daily and monthly `SUM(budget_accounted_cost_microusd + budget_reserved_cost_microusd)`;
6. calculates the additional reservation. The first Staging claim reserves the full remaining logical-run ceiling; an automatic scheduled retry already owns that reservation and adds zero; an authorized manual retry has reacquired only the remaining reservation in its audited transition. Local/test fake work remains nonbillable with zero reservation;
7. rejects the claim if the daily total plus additional reservation exceeds `5,000,000`, or the monthly total exceeds `100,000,000`;
8. emits a controlled post-commit Admin/Operations warning when this transaction moves the monthly accounted-plus-reserved total from at/below `50,000,000` to above it; warning delivery is non-critical and cannot reverse or misreport the committed claim;
9. atomically changes pending to processing, increments attempt and state versions, creates a fresh lease token, sets the lease tuple, clears both `next_attempt_at` and `active_attempt_dispatched_at`, and moves cost state to reserved; and
10. commits and releases the database connection before any network work.

The global feature kill switch and configuration/provider readiness are rechecked before claim. Disabling the global feature stops claims. A later model switch does not rewrite an already enqueued run snapshot.

Terminal, retry, recovery, cancellation, and late-response accounting transactions perform the same serialized before/after monthly-crossing test, so stronger actual evidence can trigger the warning even when claim-time reservation did not. No warning path grants budget or changes a committed run outcome.

### 10.3 Worker fences

Every heartbeat, dispatch marker, response persistence, retry schedule, and terminal update includes:

```text
id = expected run
status = processing
lease_owner = expected Worker
lease_token = expected attempt token
state_version = expected version
lease_expires_at > database clock
```

A successful update increments `state_version`. Zero rows means authority is lost; the Worker must not retry that write as success or expose a candidate.

Before the external call, a separately committed fenced dispatch-marker transaction sets `active_attempt_dispatched_at`, first-fills the immutable `provider_dispatched_at`, sets `actual_provider`, and increments `state_version`. The Worker uses the returned version for the call's later persistence. No network request may start unless this marker commit succeeds; recovery and cancellation classify the current attempt only from this active marker, never from the historical first-dispatch timestamp.

Immediately before that marker, the Worker revalidates the immutable pricing source/version/effective-time snapshot against the currently approved local pricing registry. A mismatch takes the common budget lock and performs a fenced `processing -> failed + not_retryable` transition with `failure_code = 'pricing_stale'`, zero current-attempt cost, released reservation, and no Provider call. The historical snapshot is never silently rewritten in place.

### 10.4 Expired lease

- If `active_attempt_dispatched_at IS NULL`, recovery records the abandoned claimed attempt and returns the same run to scheduled pending when attempts remain; otherwise it fails exhausted.
- If `active_attempt_dispatched_at IS NOT NULL` but response/cost evidence is incomplete, the precomputed attempt upper bound becomes the budget debit. Retry is allowed only for an approved transient class and only when the remaining worst-case attempts still fit the same `USD 0.02` logical-run ceiling. If a defensible bound is absent, the run fails not-retryable.
- Recovery never creates a new run and never creates or accepts a candidate from an expired token.

### 10.5 Cancellation and late response

Cancellation is an authorized compare-and-swap from pending or processing:

- it writes actor/reason/time, sets status cancelled and terminal time, and increments `state_version`. Cancellation before the first claim finishes with a null charge period and zero cost. For a claimed run, an active attempt with `active_attempt_dispatched_at IS NULL` releases all remaining unused logical-run reservation while retaining prior accounted cost; a non-null active dispatch marker first converts the current-attempt upper bound from reservation into conservative accounted cost, then releases every unused future-attempt reservation. Every cancelled row finishes with zero reservation;
- when cancelling processing, it copies the former `lease_token` to `cancelled_lease_token` before clearing the active lease;
- it appends the current attempt's closed `discarded_cancelled` summary when cancelling processing, sets the top-level response class to `cancelled_no_response` when that attempt was dispatched (or `not_dispatched` when it was not), then clears `active_attempt_dispatched_at` with the rest of the active lease tuple;
- the stale Worker cannot satisfy the processing/token/version predicate, so a late response can never become `draft_ready`;
- an accounting-only late-response command may match `status = 'cancelled' AND cancelled_lease_token = :former_token` plus the expected `state_version`, monotonically enrich only the matching closed attempt summary, record tokens/cost/model/status, replace the conservative current-attempt debit with stronger evidence (lower or higher, while never reducing prior-attempt debits), and set `provider_response_status = 'cancelled_late_response'`. An exact response-fingerprint replay returns the already-recorded evidence without another mutation; a different second result for the same attempt is a typed conflict;
- that command has no code path or SQL assignment for candidate, disposition, target, Publish, Index, or public state, and the candidate Check independently requires null under cancelled.

## 11. Optimistic concurrency and immutable fields

- `ai_model_config.record_version` governs every configuration mutation.
- `ai_runs.state_version` governs every claim, heartbeat, retry, cancellation, result, accounting, and evaluation transition.
- Target Draft acceptance also compares the current Product/Content `editor_document_version` or parsed ordinary Revision snapshot `draftVersion` with the run's `expected_target_version` and `target_snapshot_hash`.
- Enqueue identity, target, resolved configuration, Prompt/envelope, input/policy, budget policy/ceilings, first charge period, and request fingerprint are immutable after insert/first claim as applicable.
- The generic repository layer must not expose arbitrary update objects. Each typed command has an explicit column allowlist.
- A stale candidate cannot overwrite a newer Draft. Failed optimistic acceptance leaves `human_disposition = 'not_evaluated'` and preserves the existing Draft.
- At enqueue, the locked configuration row and compiled registries must exactly reproduce every copied snapshot field and the RFC 8785 `resolved_config_hash`; `input_hash`, `target_snapshot_hash`, `candidate_hash`, and response fingerprints are likewise recomputed from their specified canonical safe documents before persistence. Database Checks validate their representation, while the Domain Service validates content equality.
- `input_sources_json`, `input_context_json`, `attempt_history_json`, `candidate_json`, and `pricing_snapshot_json` pass versioned local schemas and byte limits before persistence. Recursive privacy/factual/forbidden-key checks reject customer, Inquiry, private-file, credential, endpoint, Prompt-body, arbitrary URL/file, RAG, tool, Publish, and Index data even when the JSON shape is otherwise valid.
- The dispatch marker is a dedicated fenced transition. `provider_dispatched_at` is first-fill immutable; `active_attempt_dispatched_at` belongs only to the current processing lease and is cleared on exit. `actual_provider` must be set by that marker, and a usable candidate still requires exact requested/actual Provider and requested/returned Model equality.
- `execution_environment`, budget-policy identity, pricing snapshot, and ceilings are trusted-server snapshots, never request fields. The Domain Service requires the row environment to equal the isolated server environment; a Staging request cannot label itself local/test to bypass spend accounting, and Production is structurally rejected. First-claim charge day/month is immutable. Every accounting transition under the common advisory lock recomputes cumulative actual, conservative accounted, and remaining reservation values from prior durable evidence; no client supplies authoritative cost totals. A non-cancelled actual overrun is persisted and forces the typed failed/no-candidate outcome defined in Section 5.6; cancellation remains the stronger candidate fence.
- An accepted `applied_revision_id`/`applied_revision_version` pair must resolve under actor scope to the same Product/Content entity and English locale as the run target, and the stored version must be the parsed `draftVersion` returned by the atomic save. For an `editorial_revision` target the ID equals `target_revision_id` and the returned version exceeds `expected_target_version`; for a Product/Content Draft target, a newly created/linked ordinary Revision identifies that same parent and remains Draft. A direct `applied_target_version` is allowed only for the original Draft localization and must be the version returned by its atomic compare-and-swap mutation.

## 12. Required Audit atomic boundaries

The existing `runGovernedMutation`/`audit_logs` authority is reused; no AI Audit table or Audit FK is added.

| Operation | One required transaction |
|---|---|
| Configuration create/update/enable/disable/default switch/Prompt selection | Lock + expected-version mutation(s) + required Audit. Audit failure rolls back every configuration change. |
| Enqueue | Authorization/config/target checks + idempotent run insert + required Audit. Exact replay creates neither a new run nor duplicate Audit. |
| Cancel or authorized manual retry | Run compare-and-swap + required Audit. |
| Human reject/evaluation | Run disposition/evaluation compare-and-swap + required Audit. |
| Human accept/accept-with-edits | Reauthorize and lock target; revalidate schema/factual denylist/locked Blocks/expected target version; mutate only the ordinary Draft or create/link the existing Editorial Revision; update `ai_runs` disposition/link; write required Audit; commit all or none. |

Worker claim, heartbeat, normalized attempt, and retry-scheduling transitions are operational provenance already stored in the single run authority and do not create an Audit row per heartbeat. They still use fenced transactions. No Provider call occurs inside any database or business mutation transaction.

Required Audit summaries contain only safe operation identity, actor, run/config/target IDs, status/version transitions, and approved hashes. They never duplicate `input_context_json`, candidate text, Prompt bodies, raw Provider material, pricing payloads, credentials, or private/customer data.

## 13. Migration construction contract

When independently approved and later generated, `0020` must:

1. leave `0000` through `0019`, every historical snapshot, and every existing Journal entry byte-immutable;
2. add one Journal entry tagged exactly `0020_phase1b_ai_foundation` and one new snapshot;
3. create `ai_model_config`, then its user/self FKs, Checks, and indexes;
4. create `ai_runs`, then its existing-table/config FKs, Checks, and indexes;
5. add no enum value/type, function, trigger, policy, extension, seed, or backfill;
6. create no configuration or run rows; and
7. complete in the existing real-PostgreSQL migration transaction and Session Advisory Lock path. Because `0020` has no enum mutation, it needs no new ADR-0010 compatibility branch.

If generation produces unrelated DDL, a third table, an enum, a Prompt body, a fallback path, a production allowance, or a modification of existing business tables, stop and return to design review.

## 14. Migration verification matrix

### 14.1 Fresh `0000 -> 0020`

On a new disposable PostgreSQL 18.4 database:

- the normal migration entry reaches 21 Journal rows (`0000` through `0020`);
- a second invocation is a no-op;
- the public catalog adds exactly two tables plus their declared constraints/indexes;
- no new enum/type, trigger, function, extension, or sequence appears;
- both tables contain zero rows;
- all default expressions, types, nullability, FK actions, predicates, included columns, and Check expressions match this document; and
- conspicuous Synthetic inserts prove every legal state and reject every boundary violation with the expected SQLSTATE.

PGlite Fresh coverage remains useful for repository compatibility but is not evidence for PostgreSQL claim locks, advisory locks, query plans, or concurrency.

### 14.2 Upgrade `0019 -> 0020`

Build a real PostgreSQL database through `0019`, insert representative Synthetic/Test users, Product and Content localizations, Editorial Revisions, Product Import batches/items, Audit rows, routes, Assets, and CRM records, then apply only the new Migration.

Pass requires:

- every pre-existing row count, selected row hash, relationship, and Journal identity remains unchanged;
- the two AI tables are empty;
- the old fixture remains writable through the supported `0019` behavior;
- valid target/config/run fixtures can then be inserted under `0020`;
- target/user/config deletion tests return SQLSTATE `23503` while referenced;
- Check failures return `23514` and uniqueness conflicts return `23505`; and
- the final table/constraint/index/trigger/type catalog exactly matches Fresh.

### 14.3 Repeat/no-op and interruption

- Invoke the approved migration entry twice for Fresh and Upgrade; the second invocation must create no object, row, Audit, or Journal entry.
- Do not test repeatability by manually replaying raw `CREATE TABLE` SQL; Drizzle Journal no-op behavior is the contract.
- Force failure before the migration commit in a disposable database and prove both DDL and the `0020` Journal marker roll back together.
- A process interruption after commit is a completed Migration and the next invocation is a no-op.
- Preserve the existing dedicated `max:1` migration client, Session Advisory Lock, backend-PID fence, and ADR-0010 historical compatibility tests.

### 14.4 Constraint/catalog capture

Capture and diff at least:

```sql
select conrelid::regclass::text as relation,
       conname,
       contype,
       confdeltype,
       confupdtype,
       confmatchtype,
       condeferrable,
       condeferred,
       convalidated,
       pg_get_constraintdef(oid, true) as definition
from pg_constraint
where conrelid in ('ai_model_config'::regclass, 'ai_runs'::regclass)
order by relation, conname;

select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('ai_model_config', 'ai_runs')
order by tablename, indexname;
```

Also capture `information_schema.columns` including `data_type`, `udt_name`, nullability, default, ordinal position, numeric precision/scale, and datetime precision. Compare definitions, not only names/counts.

## 15. Real PostgreSQL contention tests

Use at least two independent application connections plus a separate observer:

1. Same idempotency key/same fingerprint: exactly one run and one enqueue Audit; both callers receive the same ID.
2. Same key/different fingerprint: one run, the conflicting caller receives a safe conflict, and no prior payload leaks.
3. Two Workers claim one due run: one processing token/attempt only.
4. At least three due runs with two Workers: valid active processing count never exceeds 2.
5. Lease heartbeat versus cancellation: exactly one compare-and-swap wins; cancellation prevents candidate persistence.
6. Late Provider response after cancellation: accounting-only evidence may persist, candidate remains null and status remains cancelled.
7. Expired current-attempt lease with a null active dispatch marker: same run returns to pending or fails exhausted with no second run, including a retry whose historical `provider_dispatched_at` is already non-null.
8. Expired current-attempt lease with a non-null active dispatch marker and incomplete usage: conservative debit/attempt evidence persists and any retry remains inside the original run/ceiling.
9. Two simultaneous Staging claims just below daily/monthly hard limits: the advisory lock admits only the amount that fits; aggregate never exceeds the ceiling through admission race.
10. Actual Provider overrun above reservation/run ceiling: terminal accounting is recorded rather than rejected, the run becomes failed/not-retryable with no candidate, and subsequent claims stop fail-closed.
11. Concurrent default switch: one enabled default only; one stale operator gets an optimistic conflict; required Audit failure rolls the whole switch back.
12. Concurrent Draft acceptance/cancellation or acceptance/acceptance: one valid target-version/Audit mutation only; no duplicate accepted Blocks/Revision.
13. Dispatch-marker fence: marker commit failure or lost lease causes zero Provider calls; a crash after a successful marker is recovered as dispatched and conservatively accounted, never as an undispatched free retry.

After every test, assert zero idle-in-transaction sessions and no residual advisory/row locks.

## 16. Real PostgreSQL query-plan verification

Actual plan evidence is impossible before an approved `0020` exists. The Migration Candidate must run the following on disposable real PostgreSQL 18.4 using conspicuous Synthetic rows, `VACUUM (ANALYZE)`, default planner settings, and `EXPLAIN (ANALYZE, BUFFERS, SETTINGS, FORMAT JSON)`. Do not set `enable_seqscan = off`.

Use a scale fixture large enough to exercise selectivity (minimum 10,000 configurations and 100,000 runs distributed across statuses, targets, 365 charge days, and 24 charge months). Tiny-table sequential scans are not failures, but they are not growing-table plan evidence.

| Query | Expected usable index/shape |
|---|---|
| Resolve `WHERE capability='text' AND use_case=$1 AND enabled AND is_default` | `ai_model_config_enabled_default_unique`; at most one row. |
| Claim due Staging work ordered by `next_attempt_at, queued_at, id FOR UPDATE SKIP LOCKED LIMIT 1` | `LockRows` over index scan using `ai_runs_claimable_idx`; no unbounded sort/scan. |
| Count valid processing leases for Staging | partial index/bitmap/index-only access through `ai_runs_active_lease_idx`. |
| Find/reconcile expired processing leases | ordered/range index access through `ai_runs_active_lease_idx`. |
| Sum Staging accounted+reserved cost for one charge day | `ai_runs_budget_day_idx`; index-only/bitmap access is acceptable. |
| Sum Staging accounted+reserved cost for one charge month | `ai_runs_budget_month_idx`; index-only/bitmap access is acceptable. |
| List one Product/Content/Revision target's latest 50 runs | matching partial target index with backward/ordered access and no full-table sort. |
| List one actor's latest 50 authorized runs | `ai_runs_requester_history_idx`. |
| Admin list by status/use case/latest 50 | `ai_runs_admin_status_idx`. |
| Resolve idempotency key | unique index lookup through `ai_runs_idempotency_key_unique`. |

Record PostgreSQL exact version, planner settings, row distribution, table/index sizes, plan JSON, actual rows/loops, shared hit/read blocks, and execution time. Acceptance asserts index identity and bounded plan shape, not a machine-specific millisecond threshold. Investigate a growing-table sequential scan or external sort; do not hide it by weakening the fixture or forcing the planner.

## 17. Rollback compatibility

### Before `0020` commit

A failure rolls back both tables, indexes, constraints, and the Journal marker. Restore is not needed for a normal transactional failure.

### After `0020` commit but before AI rows

The `0019` application remains compatible because the change is additive and empty. Roll back application code by leaving the two unknown tables in place, with global AI disabled and no Worker claims. Do not hand-delete Journal/catalog objects.

### After configuration/run rows exist

- Stop new claims and disable the global feature/configurations.
- Leave both tables and all provenance intact.
- Older application code remains able to serve non-AI paths; a physical delete of a referenced user/target/revision fails safely because of restrictive FKs.
- Manual editing, Product Import, Revision, Publish, Index, and public reads do not depend on AI tables.
- A model rollback restores a previous approved default for new runs in one audited configuration transaction; historical rows are not rewritten or replayed.
- Database rollback requiring removal of committed AI data uses an explicitly approved pre-Migration backup/restore decision, not an ad hoc down Migration or `DROP TABLE`.

## 18. Independent Migration Reviewer decision checklist

The reviewer should return PASS, CONDITIONAL PASS, or FAIL against this exact version and explicitly address:

- only two new tables and no hidden third authority;
- complete column/default/nullability agreement;
- restrictive FK targets and delete compatibility;
- exact Check expressions and canonical five-status lifecycle;
- both partial unique indexes and idempotency uniqueness;
- target mapping and composite localization FKs;
- optimistic configuration/run/target fencing;
- current-attempt dispatch marking across retries and lease loss;
- cancellation accounting-only fence;
- same-run retry and budget reservation across all attempts;
- Staging exact `USD 0.02` / `USD 5` / `USD 50` / `USD 100` policy and concurrency 2;
- advisory-lock ordering and absence of database connections across Provider calls;
- atomic required Audit boundaries;
- Prompt Registry independence and fallback null enforcement;
- no RAG, vision, Customer Service, customer/private data, Publish/Index, or production authority;
- Fresh, `0019 -> 0020`, repeat/no-op, interruption, catalog, contention, and real-query-plan design; and
- additive rollback compatibility with preserved provenance.

Any proposed change that adds a table/state/queue, weakens the Draft/privacy/public-state boundary, enables fallback/RAG/vision/Customer Service/Production, or alters ADR-0018 requires return to the Owner rather than a silent Migration-review rewrite.

## 19. Phase A self-check result

| Check | Result |
|---|---|
| Required authority/governance/ADR/review/plan read completely | **PASS** |
| Current Owner authorization reconciled without editing ADR-0018 | **PASS** |
| Design limited to `ai_model_config` and `ai_runs` | **PASS** |
| Four Draft-assistance use cases only | **PASS** |
| Fallback structurally null | **PASS** |
| Prompt Registry remains repository-owned and independent | **PASS** |
| No RAG/vision/Customer Service/customer/private data | **PASS** |
| No Publish/Index/Route/public-state authority | **PASS** |
| Canonical lifecycle/retry/cancellation/lease/idempotency covered | **PASS** |
| Optimistic concurrency and required Audit boundaries covered | **PASS** |
| Staging cost fields, conservative accounting, daily/monthly admission, and concurrency 2 covered | **PASS** |
| Fresh/Upgrade/repeat/rollback/catalog/contention/query-plan evidence specified | **PASS** |
| Migration, TypeScript Schema, business code, ADR, credentials, API, Deploy, formal import, Publish, Index modified or invoked | **NO — PASS** |
| Actual real-PostgreSQL DDL/query-plan evidence | **PENDING BY DESIGN — requires independently approved Migration Candidate** |
| Independent Migration Reviewer approval | **PENDING** |

Phase A conclusion: **DESIGN COMPLETE; PAUSE BEFORE MIGRATION GENERATION.**

## Appendix A — principal input identities

The design was prepared from the current working-tree versions of these inputs:

| Input | SHA-256 |
|---|---|
| `AGENTS.md` | `f7ccb8a2ccc9f5171804511ef4b2c969a546a5ecc50b81c9d68e9ff5100a6a5f` |
| `docs/ENGINEERING_GOVERNANCE.md` | `6c27a0075229ebb131643460897e49b891c8fb534cfc6a3026216da6e0028647` |
| `docs/REVIEW_POLICY.md` | `97a8f4fc8dfa13ee2e748cc5c14c61346b4c539345225ea6662c86a8f94829e2` |
| ADR-0010 | `ea70d3a970982187936218228b4ef59e415f330fa08527339236e50878229a74` |
| ADR-0017 | `1948e5fc541bc1dd317a8a5e8823f987462b37deb5ad148d3753b7ce9179429b` |
| ADR-0018 | `9bef5150abe0c60a9c9e1da40be8c673b80b0263ac03aa9fb75e38a7231f1c5d` |
| Stage 4A Pre-Development Final Review | `80b70a38cb056548644cf2bb5067b185c7a2908198e91a35d5517c5b36f74faa` |
| Stage 4A Pre-Development Implementation Plan v1.4 | `0f826c1a9e4e8fba5a8090bf99150f339727ea0119ecce4edcc692f9eb2399a4` |
| Phase 1B Implementation Plan | `d8920174b907e5d6b698b57154b7078622903b3b46d0df61b2bcef62586fccf3` |
| `src/db/schema/identity.ts` | `eebeeb4ee5d2652ef4435d40005372c72ac779c187035953d5888ce84036c3d4` |
| `src/db/schema/catalog.ts` | `3bdfa195999c4ec53d5b408e1816a69e8b1e1d941de31f8a7241afe75bd22d3e` |
| `src/db/schema/content.ts` | `b99c693d8184dee453ddcc48697df8468a2f0897b00dbb524ca13838766c46db` |
| `src/db/schema/imports.ts` | `07282592fe0b57c4c7b314a25fc002ad61fbc674e0adf176957b3c8f8f4c7715` |
| Current `0019` SQL | `ea8d51f971fe160bcded1f588645db0e0f6f16d704eff34fa38350fb5d1314ed` |
| Current Drizzle Journal | `1ecf43a8d0fd625457bf3677c174f6b8ea2e6bf2b49daf5f7d3a660392690c09` |

The Owner's current authorization/risk decision is conveyed by the controlling task instruction and therefore has no repository-file hash in this Phase A artifact.
