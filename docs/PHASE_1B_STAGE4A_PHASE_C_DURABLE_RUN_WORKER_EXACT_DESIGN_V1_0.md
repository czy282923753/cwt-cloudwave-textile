# CWT Stage 4A Phase C — Durable `ai_runs` Lifecycle and Modular-Monolith Worker Exact Design V1.0

Status: **DESIGN CANDIDATE / IMPLEMENTATION-READY / NOT SELF-APPROVED / PHASE C PRODUCT IMPLEMENTATION NOT AUTHORIZED BY THIS DOCUMENT**

- Prepared: `2026-08-12` (`Asia/Shanghai`)
- Exact base: `cc5715f4a9eb07293bf932cfbd822bfa6bf14a45`
- Accepted checkpoint: `refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-implementation-accepted-v1` → exact base
- Candidate branch: `codex/phase-1b-stage4a-phase-c-exact-design-v1`

## 1. Decision, outcome, and non-goals

### 1.1 Exact Phase C outcome

Phase C will replace the Phase B `integration_not_ready` durable seam with one PostgreSQL-backed `ai_runs` Domain Service and one modular-monolith Worker. One `ai_runs` row is simultaneously the logical request identity, due work item, active claim, retry/recovery record, protected candidate, normalized attempt/cost provenance, and human-disposition record. The Worker claims that row directly; there is no queue table, Outbox reuse, second run-history authority, in-memory Production repository, synchronous Provider fallback path, or alternate runtime.

The only generation statuses are:

```text
pending
processing
draft_ready
failed
cancelled
```

Retry is orthogonal: `none`, `scheduled`, `exhausted`, or `not_retryable`. `dead` and `succeeded` are invalid AI Run statuses. Exhaustion is `failed + exhausted`.

The current Phase C executable environment remains offline: real Provider adapters, credentials, network calls and spend are absent. Production Provider and Prompt manifests remain empty, and Production composition therefore remains fail-closed. Phase C proves the full lifecycle with deterministic fake text adapters and real PostgreSQL.

### 1.2 Non-goals

Phase C does not implement or authorize:

- DeepSeek or another real Provider adapter, endpoint, SDK, credential, request, account, quota, billing action, or network access (Phase D);
- business UI, Server Actions, candidate Diff/application, Production Prompt bodies, or real Product/Content integration (Phase E);
- Staging deployment/provider validation (Phase F) or final acceptance/freeze (Phase G);
- fallback routing, a second Provider/model attempt, RAG, knowledge-base, document ingestion, embeddings, retrieval, tools, vision, Customer Service, Inquiry/CRM/customer input, or outbound messages;
- AI-created facts, direct factual-field changes, Draft acceptance, Publish, Index, Route, Redirect, Canonical, Sitemap, rights, Asset or public-state mutation;
- a Schema, Migration, ADR, dependency, package-install, configuration or accepted-document change in this design task; or
- a phase-completion checkpoint, merge, Push, Deploy, formal-data import, Production/Staging operation, Publish, or Index action.

Phase C may implement an unexported transaction-bound seam for a later owning Draft service and a test-only atomicity harness. It does not add a Production caller that applies a candidate.

## 2. Authority and contradiction resolution

This design applies the authority order in root [`AGENTS.md`](../AGENTS.md), the frozen V1.1 baseline, accepted [ADR-0017](./adr/ADR-0017-ai-run-work-and-provenance-authority.md) and [ADR-0018](./adr/ADR-0018-provider-agnostic-ai-service-and-model-configuration.md), then the domain/governance inputs.

The Phase C authority is the [Stage 4 pre-development implementation plan](./PHASE_1B_STAGE4_PRE_DEVELOPMENT_IMPLEMENTATION_PLAN.md), the accepted [Phase B V2.2 exact design](./PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_THREE_STRIKE_REPLACEMENT_CORRECTED_EXACT_DESIGN_V2_2.md), the [Phase B implementation-gate acceptance](./PHASE_1B_STAGE4A_PHASE_B_IMPLEMENTATION_GATE_ACCEPTANCE_RECORD_V1_0.md), and its controlling [Fresh independent re-review](./PHASE_1B_STAGE4A_PHASE_B_V2_2_FRESH_REPLACEMENT_FOUNDATION_IMPLEMENTATION_IMP3_NM01_PHYSICAL_TARGET_IDENTITY_REMEDIATION_V3_INDEPENDENT_REREVIEW_V1_0.md).

The accepted [`0020_phase1b_ai_foundation` Schema design](./PHASE_1B_STAGE4A_PHASE_A_0020_AI_FOUNDATION_SCHEMA_DESIGN_V1_0.md), implemented by [`drizzle/0020_phase1b_ai_foundation.sql`](../drizzle/0020_phase1b_ai_foundation.sql) and [`src/db/schema/ai.ts`](../src/db/schema/ai.ts), supplies the exact relational/state authority. Historical failed Phase B designs and remediation mechanisms are not imported.

Resolution rules:

1. ADR-0018 supersedes ADR-0017's earlier generic success/dead language with the five statuses and separate retry state.
2. The accepted Phase B Production registry contains the four implemented Draft-assistance keys. Earlier plan wording that names the same four business outcomes differently does not reopen the accepted registry.
3. Phase B's `durableEnqueueAvailable=false`, availability-only server composition, type-only Worker entry and empty Production Provider/Prompt registries are intentional Phase B stop boundaries. Phase C replaces only the durable lifecycle seams described here.
4. Migration 0020 is frozen. No observed lifecycle requirement requires an additional field, constraint, table, enum, trigger or index. A future implementation that cannot meet this design with the existing 21/96 fields must stop as `NEEDS_OWNER_DECISION`; it may not silently generate Migration 0021.
5. `target_snapshot_hash` retains the accepted meaning: the JCS/SHA-256 hash of the authorized structural association snapshot (target identity, locale and expected version). The exact selected target/source values are separately bound by `input_context_json` and `input_hash`; Phase C must not reinterpret the target hash as a second full-context hash.

## 3. Single authority and module boundary

```text
future Server Action (parse/call/translate only)
  -> DraftAssistance Domain facade
     -> governed enqueue transaction
        -> target lock + context reconstruction
        -> config rows lock + immutable resolution
        -> one ai_runs insert + required Audit

scripts/process-ai-runs.ts
  -> one Phase C server composition root
     -> AiRunWorker (two local slots maximum)
        -> PostgreSQL ai_runs claim/recover/heartbeat/dispatch/result ports
        -> existing Provider-neutral application/Prompt/output core
        -> injected fake TextAiProvider in tests only
```

Authority rules:

- `AiModelConfigServiceV1` is the sole writer of `ai_model_config`; all resolution reads use `AiModelConfigRepository`.
- `AiRunServiceV1` plus its Worker-only repository commands is the sole writer of `ai_runs`. Command-specific methods expose closed column allowlists; no generic update object is accepted.
- `AiRunReadServiceV1` is the sole business/admin reader. Worker claim projections are read only by the Worker repository. Direct UI/Server Action selects are forbidden.
- The Worker is a separate process entry in the same repository/deployable modular monolith, not a microservice or second business runtime. Both web and Worker composition use the same Provider-neutral contracts and database authority.
- PGlite remains availability/manual-editor only. Durable enqueue and Worker composition require the discriminated `databaseConnection.kind = 'postgres'` branch. There is no PGlite/in-memory lifecycle substitute.
- Notification Outbox remains notification-owned. No AI work is inserted there and no AI retry semantics are copied into it.
- Required Audits reuse `runGovernedMutation`/`audit_logs`; Worker heartbeat and attempt provenance do not create a second Audit stream.

## 4. Observed Schema and contract findings

### 4.1 Schema result

`ai_model_config` is exactly 21 fields and `ai_runs` exactly 96 fields in Migration 0020 and Drizzle. The existing Checks/FKs/indexes cover the five statuses, retry state, current-attempt marker, cancellation fence, budget/cost states, disposition shape, idempotency, due claims, active leases, budget sums and target histories. **No Schema/Migration mismatch was found.**

### 4.2 Contract successors required in Phase C

These are bounded replacement changes, not parallel compatibility paths:

| ID | Observed accepted-code seam | Required Phase C replacement |
|---|---|---|
| `PC-M01` | `ConstructedClaimedRunV1` requires `actualProvider`, `activeAttemptDispatchedAt` and `providerDispatchedAt` before `executeClaimedTextAttempt`, while the method still performs local registry/config/Prompt/context/token validation before the network call. Marking before those checks falsely records a dispatch and can conservatively debit a call that never began. | Replace with a pre-dispatch claimed authority containing `lease_owner/token/version` and current-marker-null proof. The core performs all local CR-01–CR-12 validation first, invokes one fenced `authorizeProviderDispatch` callback, and may call the adapter only after that callback commits. Remove the V1 marked-row construction path; no fallback remains. |
| `PC-M02` | `ProviderTextResultV1.failure` carries HTTP status, safe Provider code/request ID, but `AiAttemptResult.failure` discards them; post-result validation paths also discard returned model, usage and request ID. | Replace `AiAttemptResult` with one normalized attempt-evidence envelope that retains every safe available field for success and failure. The persistence layer hashes that envelope and never receives raw output/headers/exceptions. |
| `PC-M03` | The accepted Schema design names terminal failures `pricing_stale` and `run_cost_limit_exceeded`, but the sole `aiErrorCodes` authority has neither. | Create a versioned 71-code context-integrity successor, add exactly those two codes to `src/ai/errors.ts`, replace the 69-code runtime profile/compiler assertion, and update affected proofs/tests. The old 69-code profile remains Git history/evidence only and is not a runtime fallback. |
| `PC-M04` | `ConstructedClaimedRunV1` omits `lease_owner`, and local `now()` checks can only advise; they cannot prove database-clock lease authority. | The V2 claimed handle contains owner/token/version/expiry. All committing fences use PostgreSQL `clock_timestamp()`; application time is never authority. Local time can only trigger an early abort. |
| `PC-M05` | `DraftAssistanceService` Production composition exposes availability only; `worker-entry.ts` is type-only; the transaction scope operations intentionally have no implementation. | Replace the Phase B server composition with Phase C availability+request composition on PostgreSQL, implement the existing transaction scope with closed repositories, and make `worker-entry.ts` export only the Worker composition contract. PGlite continues availability-only. |
| `PC-M06` | `PreparedCoreRunV1` intentionally excludes trusted environment, pricing and budget snapshots required by 0020. | Keep it Provider-neutral. The transaction-bound `commitPreparedRun` is the sole trusted composer of target columns plus server-owned execution/budget/pricing fields before insert; callers cannot provide them. |

No accepted Phase B authority file or proof is edited in place. Phase C creates current successors where a runtime profile/proof must change and keeps prior evidence immutable.

## 5. State machine and transition ownership

`AiRunServiceV1` owns the graph below. The Worker can invoke only system transitions; human actors can invoke only the explicitly authorized commands.

| From | To | Command/owner | Required fence | Candidate rule | Cost rule |
|---|---|---|---|---|---|
| absent | `pending + none` | governed enqueue / authorized Editor or Admin | locked target/config + unique idempotency key | null | `preflight`, zero accounted/reserved |
| `pending` | `processing + none` | Worker claim | advisory lock + due row lock + environment/concurrency/budget checks | null | `reserved`; first claim fixes charge period |
| `processing` | `processing` | Worker heartbeat | owner/token/version/unexpired lease | unchanged null | unchanged |
| `processing` | `processing` | dispatch marker | owner/token/version/unexpired lease, current marker null | null | unchanged reservation |
| `processing` | `draft_ready + none` | Worker successful settlement | advisory lock + current owner/token/version/unexpired lease | validated candidate+hash set atomically | `final`; zero reservation |
| `processing` | `pending + scheduled` | Worker transient settlement or expired-lease recovery | advisory lock + current/expired row fence | null | current attempt accounted; remaining logical ceiling retained |
| `processing` | `failed + exhausted` | Worker settlement/recovery | same; `attempt_count = max_attempts` or no remaining permitted attempt | null | `final`; zero reservation |
| `processing` | `failed + not_retryable` | Worker settlement | same; typed non-retryable/policy/cost failure | null | `final`; zero reservation |
| `pending` | `cancelled + none` | governed human cancel | advisory lock + actor/run version | null forever | `final`; release reservation or zero preflight |
| `processing` | `cancelled + none` | governed human cancel | advisory lock + actor/run version; former token copied | null forever | current dispatched upper bound accounted; unused reservation released |
| `failed` | `pending + scheduled` | governed manual retry | advisory lock + actor/run version + allowlist/attempt/budget | null | reacquire only remaining logical-run reservation |
| `cancelled` | `cancelled` | accounting-only late response | former cancelled token + version + attempt fingerprint | null forever | replace current conservative debit with stronger evidence |
| `draft_ready` | `draft_ready` | reject/evaluate or later owning Draft service | actor/run version; acceptance additionally target lock/version | unchanged protected candidate | final unchanged |

No other edge exists. `draft_ready` and `cancelled` are generation-terminal. Human disposition never rewrites `status`. A failed optimistic update returns a typed conflict and cannot be retried as success.

## 6. Transaction and lock order

### 6.1 Global lock orders

The following orders are closed:

1. **Enqueue:** target row → every matching config row in ascending UUID order → new `ai_runs` insert → required Audit last.
2. **Config mutation/switch:** matching config rows in ascending UUID order → required Audit last. It never locks a target or run.
3. **Budget/lifecycle transition:** `pg_try_advisory_xact_lock(1129792594, 1)` (`CWT_AI_TEXT_CLAIM_BUDGET`) → `ai_runs` rows in ascending UUID order → required Audit last when the command is human-governed.
4. **Human candidate application seam:** target row → `ai_runs` row → target mutation → run disposition/link → required Audit last. It never acquires the budget advisory lock because generation cost is already final.
5. **Heartbeat/dispatch marker:** one `ai_runs` row only; neither changes aggregate reservation and neither attempts the advisory lock.

No path may lock a run and then request the AI advisory lock. A human cancellation/manual retry derives record authorization from actor role plus the locked run's target projection; it does not add a target row lock to the budget transaction. Foreign keys retain target existence, and candidate application separately reauthorizes/locks the target.

`pg_try_advisory_xact_lock` is non-blocking. Failure performs no mutation. Worker callers back off; human callers receive `state_conflict` with manual editing still available.

### 6.2 Database/network boundary

Every enqueue, claim, heartbeat, dispatch marker, settlement, recovery, cancel, retry and disposition mutation is a short database transaction. No transaction or connection remains open across Prompt rendering, token estimation or Provider/fake-adapter execution. No Provider call begins before a committed dispatch marker.

## 7. Durable enqueue, target/config snapshots, and replay

One `READ COMMITTED` governed transaction performs a new request:

1. Parse the closed command and authenticate the server actor. The caller supplies only use case, target, expected version, explicit selectors/input and UUID idempotency key.
2. Determine authoritative entity type before returning distinguishable target state. Lock the English Product/Content localization or editable Editorial Revision; recheck Admin/Product Editor/Content Editor record scope, Draft/editable state, allowed use case and expected version.
3. Build `DraftAuthorizedTargetSnapshotV1`; JCS/hash it into `target_snapshot_hash`. Build the reconstructible allowlisted context and `input_hash`. Unknown facts remain absent.
4. Compute request fingerprint V1 from actor ID, application/use-case/capability, durable target association, target snapshot hash, ordered safe selections/provenance and explicit-input hash. It excludes idempotency key, time, feature/config/default, Provider/model, Prompt, pricing and deployment state.
5. Look up the key under the now-authorized record scope. Same actor/association/fingerprint returns the existing summary without checking current feature/config and without Audit. Same key with a different fingerprint returns `idempotency_conflict` without revealing the prior request. Unauthorized callers receive `authorization_denied` with no existence disclosure.
6. For new work, require trusted environment authorization, `FEATURE_AI`, the persisted `ai` feature flag and a PostgreSQL durable port.
7. Lock all `ai_model_config` rows for the exact capability/use case in ascending ID order. Resolve exactly one enabled default and revalidate registry, adapter descriptor, parameter allowlist, immutable Prompt tuple/hash, schemas/policy, null fallback, nonzero cost ceiling and pricing policy from the locked values.
8. Compose all 96 insert fields. Application-owned data produces target/context columns; the core produces resolved hashes/contracts; the server composition produces environment/budget/pricing fields. No request field can set a Provider, model, endpoint, credential, price or budget.
9. Insert with `ON CONFLICT (idempotency_key) DO NOTHING RETURNING id`. On insert, write `ai.run.enqueued` Audit in the same transaction. On a unique loser, fetch under scope and apply the exact replay/conflict rules; write no duplicate Audit.
10. Commit and return the durable summary. A process crash after commit is an exact replay; a crash before commit created neither run nor Audit.

`ai_model_config` changes affect new runs only. Every copied configuration field and `resolved_config_hash` is immutable on the run. Referenced config rows may change only activation/default metadata; substantive changes require a new config row.

## 8. Claim, lease, dispatch, and concurrency

### 8.1 Worker constants

Phase C freezes these code constants; they are not user/environment inputs:

```text
text concurrency:              2 globally per execution environment
claim lease:                  60 seconds
heartbeat interval:           15 seconds
idle poll base:                1 second
automatic retry backoff:      min(30 seconds * 2^(attempt_count - 1), 5 minutes)
graceful shutdown drain:      20 seconds
post-abort persistence grace:  5 seconds
```

Maximum attempts is copied from configuration and remains `1..3`. Backoff has no persisted random jitter; each process may add at most 250 ms of non-authoritative poll jitter to avoid synchronized empty polls. `next_attempt_at` is exact database state.

### 8.2 Claim/recovery loop

Each local slot requests work only while the process is accepting claims. Under the advisory lock the repository first selects the oldest expired `processing` row for the current environment with `FOR UPDATE SKIP LOCKED`. If one exists, it performs exactly one recovery and commits without also claiming new work; the loop then continues.

If no expired row exists, the claim transaction:

1. rechecks the global feature flag;
2. counts unexpired `processing` rows for the environment with database time and stops at `>= 2`;
3. selects one due `pending` row ordered by `next_attempt_at, queued_at, id FOR UPDATE SKIP LOCKED`, joined to an enabled referenced config (it need not remain default);
4. on first claim fixes the Asia/Shanghai charge day/month from one database statement timestamp;
5. aggregates daily/monthly accounted+reserved cost and computes the additional reservation;
6. denies a Staging admission that would exceed the daily USD 5 or monthly USD 100 hard stop; crossing USD 50 only emits a non-critical post-commit warning;
7. changes the row to `processing`, increments `attempt_count` and `state_version`, creates a fresh UUID token, sets owner/acquired/expiry, clears `next_attempt_at` and current dispatch marker, resets current-attempt top-level failure/response detail, and moves cost to `reserved`; and
8. returns one closed pre-dispatch projection after commit.

First claim reserves `run_cost_limit_microusd - budget_accounted_cost_microusd`; an automatic pending retry already retains that reservation and adds zero. Local/test remains nonbillable with zero cost fields.

### 8.3 Pre-dispatch reconstruction and marker

The V2 claimed projection validates the persisted association/context/config/Prompt/policy hashes and reconstructs the exact Provider-neutral request. It includes run ID, owner, token, state version and lease expiry, while current `active_attempt_dispatched_at` must be null. A historical first dispatch/actual Provider from an older attempt is allowed and must match the requested Provider.

The core completes accepted replay order CR-01–CR-12 locally. Only then it invokes `authorizeProviderDispatch` once. That transaction requires:

```text
id = runId
status = processing
lease_owner = workerId
lease_token = attemptToken
state_version = expectedVersion
lease_expires_at > clock_timestamp()
active_attempt_dispatched_at IS NULL
```

It uses one stable database statement timestamp to set `active_attempt_dispatched_at`, first-fill `provider_dispatched_at`, first-fill/verify `actual_provider = requested_provider`, and increment the state version. Immediately beforehand it revalidates the immutable pricing source/version/effective time. Pricing drift performs a fenced `failed + not_retryable` settlement with `pricing_stale`, releases reservation and makes zero Provider calls.

A zero-row marker or lost lease aborts the attempt. After a successful marker, the adapter may be called at most once. The lease supervisor starts heartbeats and updates its in-memory expected version only from committed heartbeat results. The result path stops/joins the heartbeat before using that latest version in settlement.

### 8.4 Heartbeat and fencing

Every 15 seconds a heartbeat applies the same owner/token/version/unexpired predicate, sets expiry to the statement timestamp plus 60 seconds and increments the state version. A zero-row result aborts the adapter signal. Local clock checks are early warnings only; every committing decision uses PostgreSQL time.

After an adapter result, settlement first takes the advisory lock, then the run lock, and applies the latest owner/token/version/unexpired fence. If cancellation already won, the ordinary result path writes no candidate and may attempt only the cancellation late-evidence path. If expiry/recovery won, the stale Worker discards the result.

## 9. Retry, expiry, response loss, and shutdown

### 9.1 Automatic retry policy

Only `same_provider_transient` outcomes retry automatically: timeout, transport error, rate limit and Provider 5xx/server error. Retry is allowed only when `attempt_count < max_attempts` and the remaining logical-run reservation can cover the next precomputed attempt upper bound. It never changes Provider, model, configuration, Prompt, target, input, policy or charge period.

Settlement appends exactly one sanitized attempt entry, debits known actual cost or the precomputed attempt upper bound, sets `actual_cost_complete=false` when usage is incomplete, clears the active lease/marker, and:

- sets `pending + scheduled`, `next_attempt_at = database_response_time + backoff(attempt_count)` and retains `run_limit - accounted` reservation; or
- sets `failed + exhausted` when no attempt remains; or
- sets `failed + not_retryable` for every other typed outcome.

Top-level token totals are all non-null only when every dispatched attempt has complete input/output/total usage; otherwise all three are null and per-attempt known values remain in history.

### 9.2 Manual retry

Manual retry is immediate (`next_attempt_at = database statement time`) but still stored as `pending + scheduled`. It is Admin or record-scoped requester only, required-Audited, same-row and allowed only when:

- current state is `failed + not_retryable`;
- `attempt_count < max_attempts`;
- failure code is exactly `provider_auth_failed` or `provider_quota_exceeded`, an operator-remediable external condition that does not require changing the frozen request/config snapshot;
- the global feature and referenced config are enabled; and
- the advisory-locked daily/monthly budgets can reacquire `run_limit - accounted` for the original charge period.

`failed + exhausted`, safety/output/policy/factual/provenance/model/config/pricing/cost failures are never manually retryable. A new semantic request uses a new idempotency key/run.

### 9.3 Expired lease

- Marker null: append an undispatched abandoned attempt with zero cost; schedule the same run using normal backoff when attempts remain, otherwise fail exhausted. Retain reservation only for a scheduled retry.
- Marker non-null: classify response loss as safe `provider_transport_error`/normalized `unknown`, debit the attempt upper bound and set `actual_cost_complete=false`; schedule or exhaust under the same ceilings.
- Recovery clears owner/token/acquired/expiry/current marker and increments the state version. It never creates a run/candidate or accepts output.

An old token has no late-enrichment authority after ordinary expiry/recovery. Only a human cancellation deliberately retains `cancelled_lease_token` for the one bounded accounting path in Section 10.

### 9.4 Safe shutdown

On `SIGTERM`/`SIGINT`, the Worker stops claims immediately and keeps heartbeats for in-flight calls for at most 20 seconds. At the deadline it aborts each call. A supervisor-originated abort is treated as an operational transient/response-loss outcome, not human `cancelled`: if fenced persistence succeeds it accounts conservatively and schedules/exhausts the same run; otherwise the lease-expiry recovery path owns the result. After a further five-second persistence grace, the process may exit. No shutdown path invents a user cancellation actor.

## 10. Cancellation and late response

Human cancellation is permitted only from `pending` or `processing`. Admin may cancel any run; otherwise only the original requester may cancel after the service rechecks the run's Product/Content module against the current actor role. Target editability/version is not required to stop spend.

The governed transaction takes the advisory lock then the run row, checks expected `state_version`, writes actor/reason/time and terminal time, sets `cost_accounting_state=final`, zeroes reservation and increments state version.

- Initial pending/preflight: charge period stays null; cost stays zero.
- Pending scheduled: retain accounted prior attempts and original charge period; release remaining reservation.
- Processing before marker: append `discarded_cancelled`, response `not_dispatched`, zero current cost, copy the active token, clear lease/marker and release reservation.
- Processing after marker: append `discarded_cancelled`, set `cancelled_no_response`, copy the active token, convert the current attempt upper bound to accounted cost, clear lease/marker and release unused future reservation.

The cancellation Check and candidate Check make `candidate_json/hash` null forever. The stale Worker cannot satisfy processing/token/version.

One accounting-only late command may match `status=cancelled`, `cancelled_lease_token`, current version and the closed current attempt. It JCS-hashes normalized evidence:

- exact fingerprint replay is a no-op success;
- a different second fingerprint is `state_conflict`;
- the first evidence monotonically fills response/model/usage fields, sets `generated_at`, `cancelled_late_response`, and replaces only that attempt's conservative debit with locally priced stronger evidence, whether lower or higher;
- prior-attempt debits never fall; actual overruns remain visible even above the run limit; and
- the update type has no candidate, disposition, target, Audit, Publish or Index assignment.

## 11. Normalized attempt evidence and typed failure

### 11.1 Attempt-history V1

`attempt_history_json` is an ordered append-only array of at most three strict objects with exactly these keys; optional values are stored as JSON null rather than omitted so fingerprints are stable:

```text
version, attempt, dispatch_state, outcome,
requested_provider, actual_provider, requested_model, returned_model,
provider_envelope_version, provider_envelope_hash,
dispatched_at, responded_at, duration_ms,
input_tokens, output_tokens, total_tokens,
attempt_upper_cost_microusd, actual_cost_microusd,
accounted_cost_microusd, actual_cost_complete,
provider_response_status, provider_http_status,
provider_error_code, provider_request_id,
failure_code, response_fingerprint
```

Closed values:

- `dispatch_state`: `not_dispatched | dispatched`;
- `outcome`: `retry_scheduled | failed | draft_ready | discarded_cancelled`;
- Provider response status: the 14 values accepted by Migration 0020;
- failure code: one value from the sole current `AiErrorCode` authority or null.

`response_fingerprint` is SHA-256 of JCS normalized evidence containing only the fields above plus `candidate_hash` for a protected success. It never covers or stores raw output text. The current attempt entry is written once; a cancelled entry alone may receive the monotonic enrichment already defined.

### 11.2 Evidence normalization

The Phase C `NormalizedAttemptEvidenceV2` carries, when available: response status, HTTP status, safe Provider code/request ID, returned model, completion kind, token usage, duration and protected-result hash. Bounds match Migration 0020. Control characters, invalid token arithmetic, unsafe integer/duration, unexpected model, malformed result and oversized safe identifiers become typed local failures.

Raw response bodies, raw Prompt/rendered request, headers, endpoint, credentials, exception messages/stacks, customer/private identifiers and unvalidated output are never returned to the persistence layer, Audit or telemetry.

### 11.3 Failure authority

`src/ai/errors.ts` remains the sole tuple authority. Phase C adds exactly:

- `pricing_stale` — category `configuration`, non-retryable, manual editor available; and
- `run_cost_limit_exceeded` — category `configuration`, non-retryable, manual editor available.

Every other lifecycle result reuses existing codes: authorization/state/idempotency conflicts, `claim_expired`, Provider classes, model/output/context/provenance codes and `internal_failure`. Safe persisted `failure_detail` is an allowlisted fixed message, never an exception or Provider body.

## 12. Budget reservation and settlement

### 12.1 Pricing snapshot seam

Phase C adds a server-only compiled `PricingPolicyRegistryV1`; requests cannot select it. Production registry has no billable Provider entry. Local/test uses the exact nonbillable snapshot. A future Phase D entry must be reviewed separately before Staging can dispatch:

```json
{
  "version": 1,
  "currency": "USD",
  "billing_unit_tokens": 1000000,
  "input_microusd_per_unit": 0,
  "output_microusd_per_unit": 0,
  "formula": "ceil-separate-v1",
  "source_id": "cwt-nonbillable",
  "source_version": "1",
  "effective_from": "1970-01-01T00:00:00.000Z",
  "observed_at": "1970-01-01T00:00:00.000Z"
}
```

For billable snapshots, rates are non-negative safe integers and the snapshot is non-empty/bounded. Formula V1 is:

```text
cost(input, output) =
  ceil(input_tokens  * input_microusd_per_unit  / 1_000_000) +
  ceil(output_tokens * output_microusd_per_unit / 1_000_000)

attempt_upper = cost(max_input_tokens, max_output_tokens)
estimated_max = attempt_upper * max_attempts
```

Enqueue fails closed unless the pricing source is current, `attempt_upper > 0` for Staging, `estimated_max <= run_cost_limit_microusd <= 20000`, and arithmetic remains within safe/PostgreSQL bigint bounds. Local/test stores zero estimated/actual/accounted/reserved cost and may use the nonbillable snapshot.

### 12.2 Admission and accounting

Budget totals are `SUM(accounted + reserved)` for the immutable first-claim day/month. The advisory lock serializes claim, reservation, release, settlement, cancellation, manual retry and late accounting. Daily/monthly hard stops are inclusive ceilings: a claim is denied only when the proposed total is greater than the limit.

Known complete usage produces locally calculated actual cost. Missing/incomplete usage debits `attempt_upper` and makes `actual_cost_complete=false`. A successful protected candidate may still become `draft_ready` after the conservative debit because cost is bounded; a non-cancelled stronger actual cost above the run ceiling is recorded and forces `failed + not_retryable + run_cost_limit_exceeded`, with no candidate.

The monthly-warning crossing is non-critical post-commit telemetry/operations output. Failure to emit it cannot reverse the committed transition. It is not an Outbox/queue and grants no external notification or deployment authority.

## 13. Complete field ownership ledger

### 13.1 Ledger conventions

There is one table writer per aggregate:

- **Config writer:** `AiModelConfigServiceV1`, through closed create/update/activation commands.
- **Run writer:** `AiRunServiceV1`, including its closed Worker-only transition repository. A future Draft owner calls the transaction-bound run disposition port; it never writes `ai_runs` directly.
- **Config reader:** `AiModelConfigRepository` → resolver, plus Admin-safe config projection.
- **Run reader:** `AiRunReadServiceV1` for authorized humans, or the Worker repository's closed claim projection. No other module selects the tables.

The “command” column is a subcommand of the one authoritative writer, not a second authority.

### 13.2 `ai_model_config` — 21/21

| Field | Authoritative writer command | Authoritative reader / meaning |
|---|---|---|
| `id` | config create; database UUID default | config resolver/Admin projection; stable identity |
| `capability` | config create, immutable | resolver; exact `text` |
| `use_case` | config create, immutable | resolver; accepted Production registry key |
| `provider` | config create or pre-reference update; immutable after first run | resolver/adapter registry |
| `model` | create or pre-reference update; immutable after first run | resolver/adapter configuration |
| `parameters_json` | create or pre-reference update after recursive allowlist | resolver; detached/read-only copy |
| `max_input_tokens` | create or pre-reference update | enqueue/token preflight |
| `max_output_tokens` | create or pre-reference update | enqueue/Provider-neutral request |
| `max_attempts` | create or pre-reference update | enqueue/Worker retry ceiling |
| `run_cost_limit_microusd` | create or pre-reference update | enqueue/budget policy |
| `prompt_id` | create or pre-reference Prompt selection | Prompt resolver |
| `prompt_version` | same Prompt-selection command | Prompt resolver |
| `prompt_hash` | same Prompt-selection command; recomputed registry tuple | Prompt loader/history gate |
| `enabled` | activation/disable/rollback command | enqueue resolver and Worker claim eligibility |
| `is_default` | stable-order default-switch command | new-run resolver only |
| `fallback_config_id` | writer always sets null | resolver rejects non-null; no traversal |
| `record_version` | every config mutation increments | optimistic locks and resolved snapshot version |
| `created_by_user_id` | create from authenticated Admin | Admin/Audit provenance |
| `updated_by_user_id` | every mutation from authenticated Admin | Admin/Audit provenance |
| `created_at` | create from database statement time | Admin/history |
| `updated_at` | every mutation from database statement time | Admin/history/optimistic evidence |

Physical delete has no service command. A referenced row's substantive fields are immutable; disable/default changes remain allowed and audited.

### 13.3 `ai_runs` identity, target, config and Prompt — 34/96

| Field | Run-writer command | Authoritative reader / meaning |
|---|---|---|
| `id` | enqueue insert; database UUID default | all run projections; logical work/provenance identity |
| `application_class` | enqueue from compiled definition | Worker/application registry; `draft_assistance` |
| `capability` | enqueue from compiled definition | Worker/provider registry; `text` |
| `use_case` | enqueue from compiled definition | application/Prompt/output registry |
| `requested_by_user_id` | enqueue from authenticated actor | scoped read/cancel/retry/Audit |
| `idempotency_key` | enqueue from parsed UUID | replay lookup only |
| `request_fingerprint_version` | enqueue constant `1` | replay comparator |
| `request_fingerprint` | enqueue JCS/SHA-256 | replay comparator; never input-body disclosure |
| `target_type` | enqueue application persistence codec | authorization/read/acceptance port |
| `target_product_id` | enqueue target projection | Product-scoped read/acceptance; otherwise null |
| `target_content_id` | enqueue target projection | Content-scoped read/acceptance; otherwise null |
| `target_revision_id` | enqueue target projection | Revision-scoped read/acceptance; otherwise null |
| `target_locale` | enqueue target projection | English target validation; Revision null |
| `expected_target_version` | enqueue locked target snapshot | later acceptance fence/read UI |
| `target_snapshot_hash` | enqueue association JCS/SHA-256 | claimed reconstruction/acceptance fence |
| `model_config_id` | enqueue locked resolver | config history/claim projection |
| `model_config_version` | enqueue locked resolver | immutable resolved-hash verification |
| `resolved_config_hash` | enqueue core JCS/SHA-256 | claimed reconstruction |
| `requested_provider` | enqueue locked config | Provider registry/attempt evidence |
| `actual_provider` | first successful dispatch marker; later immutable | attempt evidence; exact match required for candidate |
| `requested_model` | enqueue locked config | adapter/attempt evidence |
| `returned_model` | each settled current response; cleared when a new attempt is claimed | top-level last response/read; history retains prior models |
| `parameters_snapshot_json` | enqueue detached validated config | claimed adapter configuration |
| `max_input_tokens` | enqueue copied config | local token gate/cost upper bound |
| `max_output_tokens` | enqueue copied config | request/cost upper bound |
| `max_attempts` | enqueue copied config | claim/retry/exhaustion |
| `prompt_id` | enqueue resolved Prompt tuple | claimed Prompt loader |
| `prompt_version` | enqueue resolved Prompt tuple | claimed Prompt loader |
| `prompt_hash` | enqueue resolved Prompt tuple | Prompt immutability verification |
| `provider_envelope_version` | enqueue adapter descriptor | claimed envelope verification/evidence |
| `provider_envelope_hash` | enqueue adapter descriptor | claimed envelope verification/evidence |
| `input_schema_version` | enqueue compiled application definition | claimed application registry |
| `output_schema_version` | enqueue compiled output definition | claimed parser/protector |
| `policy_version` | enqueue compiled definition | claimed context/output policy |

### 13.4 `ai_runs` context, candidate, lifecycle and timing — 26/96

| Field | Run-writer command | Authoritative reader / meaning |
|---|---|---|
| `input_sources_json` | enqueue context policy | authorized provenance view; safe references only |
| `input_context_json` | enqueue context policy | Worker reconstruction; protected authorized read only |
| `input_hash` | enqueue context JCS/SHA-256 | claimed integrity verification |
| `attempt_history_json` | settlement/recovery/cancel append; cancelled-late monotonic enrichment only | Worker accounting/read provenance |
| `candidate_json` | successful fenced settlement only | authorized candidate read/future Draft owner |
| `candidate_hash` | same successful settlement, recomputed JCS hash | read/acceptance/Audit safe identity |
| `status` | enqueue/claim/settlement/recovery/cancel only through graph | claim/read/disposition |
| `retry_state` | enqueue/claim/settlement/recovery/manual retry | Worker/read; orthogonal to status |
| `attempt_count` | claim increments exactly once | retry ceiling/history validation |
| `next_attempt_at` | enqueue, retry/recovery/manual retry; claim clears | due-work index/Worker |
| `lease_owner` | claim; heartbeat retains; exit clears | Worker fence only |
| `lease_token` | claim fresh UUID; exit clears | Worker fence only |
| `lease_acquired_at` | claim database time; exit clears | Worker fence/operations |
| `lease_expires_at` | claim/heartbeat; exit clears | Worker fence/recovery/concurrency |
| `active_attempt_dispatched_at` | dispatch marker; transition out clears | current-attempt response-loss classifier |
| `state_version` | every run mutation increments | every optimistic/fenced command |
| `cancelled_lease_token` | processing cancellation copies former token | cancelled late-evidence matcher only |
| `cancelled_by_user_id` | governed human cancel | scoped read/Audit provenance |
| `cancellation_reason` | governed human cancel after sanitization | authorized detail read; not Audit/telemetry |
| `cancelled_at` | governed cancel database time | read/late-response fence |
| `queued_at` | enqueue database time | ordering/read |
| `provider_dispatched_at` | dispatch marker first-fill only | first-dispatch provenance |
| `generated_at` | result settlement or cancelled late evidence | response/completion provenance |
| `completed_at` | terminal generation transition only | read/operations |
| `generation_duration_ms` | settlement/late evidence; cumulative checked sum | redacted operations/quality analysis |
| `updated_at` | every mutation database time | reads/operations |

### 13.5 `ai_runs` Provider, failure and budget — 27/96

| Field | Run-writer command | Authoritative reader / meaning |
|---|---|---|
| `input_tokens` | settlement/late evidence recomputed all-or-none cumulative total | authorized provenance/budget analysis |
| `output_tokens` | same | same |
| `total_tokens` | same; exact input+output | same |
| `provider_response_status` | claim reset; settlement/recovery/cancel/late evidence | top-level current/last normalized outcome |
| `provider_http_status` | settlement/late evidence, claim clears | authorized redacted provenance |
| `provider_error_code` | settlement/late evidence after bounds, claim clears | authorized redacted provenance |
| `provider_request_id` | settlement/late evidence after bounds, claim clears | authorized redacted provenance |
| `failure_code` | settlement/recovery; pending scheduled retains; claim clears | typed operator result/retry policy |
| `failure_detail` | settlement fixed safe message; claim clears | authorized operator detail |
| `execution_environment` | enqueue from trusted server | claim environment partition/budget Check |
| `budget_policy_version` | enqueue trusted policy | budget calculator/readiness |
| `budget_timezone` | enqueue constant `Asia/Shanghai` | charge-period calculation |
| `budget_currency` | enqueue constant `USD` | pricing/accounting |
| `text_concurrency_limit` | enqueue constant `2` | claim invariant evidence |
| `budget_charge_day` | first claim database time; then immutable | daily aggregate/manual retry |
| `budget_charge_month` | first claim database time; then immutable | monthly aggregate/manual retry |
| `run_cost_limit_microusd` | enqueue copied config | logical-run reservation/hard cap |
| `daily_hard_limit_microusd` | enqueue trusted policy | claim admission |
| `monthly_warning_limit_microusd` | enqueue trusted policy | non-critical crossing signal |
| `monthly_hard_limit_microusd` | enqueue trusted policy | claim/manual-retry admission |
| `estimated_max_cost_microusd` | enqueue pricing calculator | preflight proof/read |
| `actual_cost_microusd` | settlement/late evidence recomputed from complete usage | cost provenance |
| `actual_cost_complete` | settlement/recovery/late evidence | cost-confidence/readiness |
| `budget_accounted_cost_microusd` | claim/settlement/recovery/cancel/late/manual retry under advisory lock | daily/monthly admission authority |
| `budget_reserved_cost_microusd` | same budget-locked transitions | daily/monthly admission authority |
| `cost_accounting_state` | enqueue/claim/terminal/manual retry | budget state invariant |
| `pricing_snapshot_json` | enqueue trusted compiled pricing policy; immutable | calculation reconstruction/claim staleness check |

### 13.6 `ai_runs` human disposition — 9/96

| Field | Run-writer command | Authoritative reader / meaning |
|---|---|---|
| `human_disposition` | reject/evaluate or future atomic application; write-once | authorized quality/read |
| `quality_rating` | same disposition command, optional 1–5 | authorized quality analysis |
| `quality_labels` | same, exact allowlist/no duplicates | authorized quality analysis |
| `quality_comment` | same, sanitized/bounded | authorized quality analysis; excluded from Audit/telemetry |
| `evaluated_by_user_id` | same authenticated actor | evaluation provenance |
| `evaluated_at` | same database time | evaluation provenance |
| `applied_target_version` | future Draft owner transaction only | accepted direct-Draft association |
| `applied_revision_id` | future Draft owner transaction only | accepted Revision association |
| `applied_revision_version` | future Draft owner transaction only | exact applied Draft Revision version |

The groups above total exactly 96 fields. No field has a UI, Server Action, Provider adapter, fake adapter or business table as an independent writer.

## 14. Existing interface disposition ledger

| Existing interface/module | Phase C use and authoritative owner | Disposition |
|---|---|---|
| `DraftAssistanceService` / `DraftAssistanceAvailabilityService` | Domain facade for availability and durable request | Extend Production facade with request only on PostgreSQL; no synchronous generation |
| `GenericAiOrchestratorV1` | Provider-neutral enqueue ordering and preparation | Retain semantics; wire transaction-bound durable scope and trusted server composer |
| `OpaqueRequestInvocationV1`, `OpaqueRequestContextStageV1` | application-owned auth/context/replay/config-lock/commit operations | Retain opaque boundary; implement operations only inside one governed enqueue transaction |
| `TransactionBoundDraftEnqueueScope`, `DraftTransactionScopeOperationsV1` | sole target/replay/config/insert port | Implement with PostgreSQL repository; no public constructor or generic DB authority |
| `PreparedRequestIdentityV1` | idempotency key/fingerprint/actor | Retain exactly |
| `PreparedCoreRunV1` | Provider-neutral immutable application/config/context projection | Retain; trusted server composer supplies remaining 0020 columns |
| `ReplayLookupResultV1`, `PreparedRunCommitResultV1`, `CoreCommittedRunSummaryV1` | exact replay/unique-loser/result | Retain; unauthorized/mismatch remains typed failure |
| `AiModelConfigRow`, `AiModelConfigResolutionReadV1`, repository/resolver | one exact config resolution | Retain; add locked-row revalidation and separate Admin mutation service |
| `ResolvedModelConfigV1`, `resolvedConfigHashV1` | immutable run snapshot/hash | Retain exactly; activation/default metadata remains outside hash |
| `ApplicationPersistenceCodec`, Draft association/context/output policies | target columns, durable context reconstruction and protected result | Retain accepted codecs; no second visitor or context builder |
| `ConstructedClaimedRunV1` | current marked claimed projection | Replace with V2 pre-dispatch projection per `PC-M01/M04`; remove V1 runtime export |
| `AiClaimedExecutionService`, `ExecuteClaimedTextAttemptCommand` | CR-01–CR-14 and one adapter dispatch | Replace command with fenced dispatch callback; no parallel V1 method |
| `AiAttemptResult` | normalized result to lifecycle settlement | Replace with evidence-complete V2 per `PC-M02` |
| `TextAiProvider`, `ProviderTextResultV1` | injected capability adapter; fake only in Phase C | Retain capability interface; normalize every safe optional failure/success field before persistence |
| `PromptBundleLoaderV1`, renderer and output parser/policy | immutable Prompt/request/output validation | Retain; Production bundle remains exact-empty |
| `SafeAiError`, `AiServiceResult`, `aiErrorCodes` | sole typed error authority | Add exact two-code successor per `PC-M03`; no second run-error map |
| `AiTelemetrySink` | non-authoritative redacted operational events | Extend closed event names; never lifecycle/cost truth |
| `worker-entry.ts` | server-only Worker boundary | Replace type-only content with exports of Worker contract/factory types; no web/public reachability |
| `phase-b-composition.ts` | availability-only Production server root | Replace naming/exports with one Phase C root; PGlite availability only, PostgreSQL full lifecycle, empty Production Provider registry |
| `AppDatabase` / discriminated `databaseConnection` | persistence branch | Retain accepted M03 narrowing; no cast/union projection/second connection factory |
| `runGovernedMutation`, `writeAuditLog` | atomic human/config/enqueue mutations | Reuse exactly; Worker operations remain fenced non-Audit provenance |

## 15. Record-scoped authorization and role matrix

Authorization derives target entity type before returning existence/state. Revision targets resolve their authoritative `entity_type` inside the service. UI visibility, actor-supplied role and run requester ID alone are never sufficient.

| Operation | Admin | Product Editor | Content Editor | Reviewer/Publisher | Sales | Analyst | System Worker |
|---|---|---|---|---|---|---|---|
| availability/enqueue | any allowed Draft target | Product Draft/Product Revision only | Content Draft/Content Revision only | no | no | no | no |
| inspect summary/candidate/safe provenance | all | Product-scoped | Content-scoped | Product/Content scoped under existing review/read permission | no | no raw runs | claimed projection only |
| cancel | all pending/processing | own-request Product-scoped | own-request Content-scoped | no | no | no | no human cancellation |
| manual retry | all eligible | own-request Product-scoped | own-request Content-scoped | no | no | no | automatic only |
| reject/quality disposition | all Draft-ready | Product-scoped | Content-scoped | Product/Content scoped | no | no | no |
| accept/apply candidate | no Phase C caller; later ordinary authority only | Phase E only | Phase E only | ordinary review after Draft save only | no | no | no |
| config create/update/default/enable/disable | yes | no | no | no | no | no | no |
| global redacted operations list | yes | no | no | no | no | no | due/claimed rows only |

Product/Content scope still requires the target/revision type, English locale and role permission. A list query joins/filters the authoritative target type before returning rows. Admin log lists omit candidate/context/comment/reason bodies by default. Full protected candidate/context reads require a distinct record-authorized method.

Analyst receives no Phase C raw run endpoint; a future aggregate/de-identified analytics feature is separate scope. No role obtains Inquiry/CRM/private-file access through AI.

## 16. Required Audit contract

### 16.1 Event names and atomic mutations

| Event | Atomic transaction content | Safe `beforeSummary` / `afterSummary` keys |
|---|---|---|
| `ai.model_config.created` | config insert + Audit | config ID, capability, use case, enabled/default, record version, Prompt ID/version/hash |
| `ai.model_config.updated` | locked expected-version mutable fields + Audit | config ID, changed field names, old/new record version, Prompt tuple when changed |
| `ai.model_config.activation_changed` | stable-order enable/disable/default switch for all affected rows + one Audit | use case, old/new enabled-default IDs, affected IDs/versions |
| `ai.run.enqueued` | target/config checks + one run insert + Audit | run/use-case/target type+ID, requester, request fingerprint version/hash, config ID/version, status/version |
| `ai.run.cancelled` | budget-locked cancellation/cost release + Audit | run ID, old/new status/version, attempt count, dispatch-state enum, `reasonRecorded=true` |
| `ai.run.manual_retry_scheduled` | budget-locked failed→pending reservation + Audit | run ID, failure code, attempt count, old/new version, next-attempt time |
| `ai.run.disposition_recorded` | draft-ready reject/quality write + Audit | run ID, target type+ID, disposition, candidate hash, rating presence, allowlisted labels, version |
| `ai.run.candidate_applied` | later owning Draft/Revision mutation + run link/disposition + Audit | run/target/revision IDs, candidate hash, old/new target/run versions, accepted vs accepted-with-edits |

Audit payloads never duplicate context/candidate/Prompt/pricing JSON, explicit input, quality comment, cancellation reason text, raw Provider material, headers, credentials, private IDs, or exceptions.

### 16.2 Non-Audit operational transitions

Claim, heartbeat, dispatch marker, normalized settlement, automatic retry and expired-lease recovery commit fenced provenance in `ai_runs` without per-heartbeat Audit noise. They have no human business mutation and no second operational history. A required Audit failure on a human/config/enqueue/application transaction rolls the entire mutation back.

## 17. Human disposition and Draft-only boundary

Phase C implements write-once `rejected` plus optional rating/labels/comment for an authorized `draft_ready` run. `accepted` and `accepted_with_edits` are only available through a transaction-bound port that requires an owning Product/Content Domain Service to supply and then re-read one exact applied target version or Revision/version inside the same transaction.

The port enforces:

- current run remains `draft_ready + not_evaluated` and candidate hash matches;
- actor remains authorized for the authoritative target entity;
- the current target is editable and matches `expected_target_version`/target association;
- the protected candidate schema, factual denylist, locked Blocks and application policy are revalidated;
- exactly one direct-target or Revision association shape is returned by the real mutation; and
- target mutation, run disposition/link and required Audit commit all or none.

Phase C Production composition exports no caller for this port. A test-only PostgreSQL harness performs a conspicuously Synthetic target mutation to prove Audit rollback and concurrency. Phase E must add the real owning service and Diff/Undo/UI under separate design/review; it may not bypass this transaction contract.

AI output remains protected candidate data. It cannot mutate factual columns, Product Code, composition, GSM, width, MOQ, facilities, certifications, company facts, Asset rights, Route, Redirect, Publish or Index. Public reads continue to use approved revisions and the authoritative real-Product/public-eligibility predicate only.

## 18. Configuration mutation semantics

Phase C adds an Admin-only Domain Service but no Admin page or Server Action. Every command uses a required-Audit governed transaction.

### 18.1 Create and update

- Create accepts the four frozen use cases/text capability, a compiled Provider/model/parameter descriptor, token/attempt/run ceilings and exact immutable Prompt tuple. It always starts `enabled=false`, `is_default=false`, `fallback_config_id=null`, version 1.
- A substantive update locks the row by ID/version and checks whether any `ai_runs` reference exists. With no reference it may change Provider/model/parameters/limits/Prompt after complete registry/policy validation. With a reference it rejects every substantive field; activation/default metadata alone may change.
- Physical delete is absent. Retirement is disablement.
- Production's empty Provider and Prompt registries mean no current Production configuration can pass create/enable validation. Fake configuration creation exists only in injected tests.

### 18.2 Default activation and rollback

The switch command locks all rows for one capability/use-case in ascending UUID order, validates expected versions for every changed row, clears `is_default` on the old selection, and sets exactly one selected row `is_default=true`. Enabling additionally requires its complete current registry/Prompt/pricing validation and nonzero run ceiling. Disable may leave the selected row `is_default=true` so availability reports `config_disabled`; a rollback/switch explicitly transfers the default marker.

One transaction updates actor/time/version on all changed rows and writes one `ai.model_config.activation_changed` Audit. The partial unique index is the final race authority. Zero changed rows or uniqueness conflict returns a safe optimistic/state conflict; no partial switch commits.

No configuration command enables fallback, Staging dispatch, Production AI or external Provider authority.

## 19. Security, privacy, logs, and public-bundle boundary

### 19.1 Data policy

Permitted context is limited to the accepted explicit/structured/operator-selected Draft-assistance sources. The existing closed context classifier and application policy remain the only traversal. Unknown facts are absent. Missing real Product evidence remains `Waiting for Real Product Data Validation` where the Product contract requires it.

The following are structurally rejected from selectors, context, attempt history, candidate evidence, Audit and telemetry:

- Inquiry, Contact, Organization, Customer Activity, customer identifiers, private attachments, PII, analytics identities and sessions;
- raw Object Keys, permanent/private URLs, arbitrary URLs/files, credentials, Secrets, environment values, endpoints, headers and authorization material;
- unverified company/facility/capacity/ownership/certification/customer claims and AI-inferred technical facts;
- RAG/retrieval/chunk/vector/embedding/tool/web/remote/file results;
- raw Provider payloads, raw Prompt/rendered requests and exception messages/stacks; and
- Publish, Index, Route, Redirect, rights or public-state commands.

Public, Private and Import storage contexts remain isolated. Phase C reads no file bytes and creates no Asset relation.

### 19.2 Telemetry

Telemetry is non-authoritative and adds only closed operational events such as `ai_run_claimed`, `ai_lease_recovered`, `ai_attempt_settled`, `ai_budget_hard_stop`, `ai_budget_monthly_warning_crossed`, and `ai_worker_draining`. Payloads contain enums, environment, run/use-case technical identity, attempt count, bounded timings/cost counts and safe error code only. They exclude target/candidate/context/Prompt bodies, user/CRM/private Asset identifiers, comments, reasons, Provider request IDs, credentials and raw failures.

### 19.3 Bundle/capability graph

All run/config/Worker repositories, database clocks, pricing policy, Prompt resources, Provider registry and server composition remain `server-only`. Public/client modules cannot reach them by static, dynamic, re-export, generated or protected-resource paths. Refine/admin dependencies remain absent from the public bundle.

Phase C proof updates extend the current architecture graph with exactly the new server/Worker roots and prove no public edge, no evidence-to-Production authority and no real Provider root. Existing accepted Phase B evidence is not rewritten.

## 20. Deterministic seams and PostgreSQL proof

### 20.1 Time and randomness

- Database statement/clock time is authoritative for queued/claim/lease/dispatch/response/completion/evaluation timestamps, charge periods and due comparisons.
- Pure policy functions accept explicit `Date`/integer inputs for unit tests; they do not write them directly to business tables.
- PostgreSQL tests create past/future rows with SQL relative to `clock_timestamp()` and avoid wall-clock sleeps.
- UUID generation is injected in pure/contract tests. Production uses cryptographically random UUIDs/database defaults. Fixed Synthetic UUIDs are conspicuous.
- Fake providers use explicit deferred promises/barriers so claim, heartbeat, cancellation, response-loss and shutdown interleavings are deterministic.
- Backoff is the exact pure formula in Section 8.1; no hidden jitter enters durable state.

### 20.2 Required real PostgreSQL evidence

PGlite proves only availability/manual-editor compatibility. The Phase C implementation Candidate must run against a disposable supported PostgreSQL 17/18 instance with at least two independent Worker connections and an observer:

1. same key/same fingerprint → one row, one enqueue Audit, same summary;
2. same key/different fingerprint → one row and safe conflict without payload disclosure;
3. two Workers/one due row → one token and attempt;
4. at least three due rows/multiple Worker processes → valid active count never above 2;
5. heartbeat versus cancel and result versus cancel → exactly one fence winner, no candidate after cancel;
6. marker failure → zero fake Provider calls; crash after marker → conservative response-loss accounting;
7. expired undispatched/dispatched retry paths → same row, exact attempt/backoff/cost evidence;
8. same-day and midnight/month-boundary logical runs → immutable original charge period;
9. two claims at daily/monthly boundary → advisory lock admits only work within hard limits;
10. missing usage and actual overrun → conservative debit/failed overrun without hiding cost;
11. manual retry versus cancel/claim → one legal transition and no double reservation;
12. default switch versus enqueue → locked exact snapshot or clean optimistic conflict;
13. disposition/acceptance-harness races → one target/run/Audit mutation; Audit failure rolls all back;
14. graceful and forced Worker shutdown → no new claims, no lost durable authority, later expiry recovery; and
15. after each case, zero idle-in-transaction sessions and no residual advisory/row locks.

The accepted Migration query-plan suite is rerun for due claim, active/expired lease, budget day/month, idempotency, requester/target/admin history and enabled-default resolution at scale. Record exact PostgreSQL version, data distribution, planner settings, JSON plans, selected indexes and lock observations. Local inference is not proof of PostgreSQL locking, isolation, deadlock behavior or query plans.

### 20.3 Target-resource and operational validation

With fake adapters only, exercise two concurrent text slots on the target 2 vCPU/4 GB-equivalent non-Production envelope and record memory/CPU/event-loop/DB-pool behavior. Real Provider latency, cancellation semantics, usage accuracy and deployment scheduling remain Phase D/F External Validation and cannot be claimed here.

## 21. Operational stop, recovery, and rollback

### 21.1 Normal stop and operator recovery

1. Disable the global `ai` feature flag to stop enqueue availability and new Worker claims; or disable a referenced config to park its pending rows.
2. Signal the Worker to drain under Section 9.4. Manual Product/Content editing remains available throughout.
3. Inspect authorized redacted run state. Do not edit lease/cost/status fields directly.
4. Restart the same modular-monolith Worker. It reconciles expired work before claiming new work.
5. Admin may cancel pending/processing work or manually retry only the exact allowed terminal failures. No operator requeues by inserting another row.

Pending rows bound to a disabled config remain durable and unclaimed until re-enabled or human-cancelled. A model/default switch does not rewrite them. Terminal/candidate/disposition history remains intact.

### 21.2 Code rollback

Rollback order is:

1. stop Worker claims and disable global/config AI;
2. revert the Phase C application commit(s) to the accepted Phase B checkpoint while leaving Migration 0020 tables/data intact;
3. keep manual editing and existing non-AI Asset/Revision/Publish/Index/public-read paths operational, while preserving Product Import's default-false state; and
4. later resume only with code that understands the existing run records and fencing semantics.

Rollback never deletes `ai_runs`/config/Audit history, requeues terminal work, applies a candidate, changes public state, or uses an ad hoc down Migration. The accepted checkpoint is local-only and is not a release artifact.

## 22. Complexity Approval

### 22.1 Why existing mechanisms are insufficient

In-memory promises lose work/cost/provenance after restart. Notification Outbox has short delivery semantics and cannot safely own long Provider attempts, protected candidates, cancellation fences, model/Prompt snapshots or cost settlement. A synchronous call inside a Draft transaction would hold locks across external latency and let Provider failure misreport an unrelated business mutation. Phase B deliberately stops before persistence and Worker composition.

### 22.2 Reuse and replacement

Reused:

- existing `ai_runs` and `ai_model_config` Migration 0020 fields/indexes/constraints;
- existing PostgreSQL transaction/advisory/row-lock capabilities;
- accepted Provider-neutral application, context, Prompt, output and fake-provider contracts;
- existing global feature flag, role system, Draft/Revision authority and required Audit transaction helper; and
- existing manual editor/public-read paths.

Replaced:

- Phase B `durableEnqueueAvailable=false` and `integration_not_ready` request seam by the one durable PostgreSQL service;
- type-only Worker boundary by one direct-claim Worker;
- premarked claimed-execution contract by the pre-dispatch/fenced-callback contract;
- evidence-dropping attempt result by the normalized evidence-complete result; and
- 69-code current runtime profile by one 71-code successor, with no dual profile.

### 22.3 Exact new states and failure modes

No new persisted status/table exists beyond 0020. Phase C activates the already-approved status/retry/cost/lease/disposition values. Runtime failures newly reachable include lock busy, lease loss/expiry, response loss, budget denial, pricing drift, cost overrun, idempotency conflict, cancellation/result race and required-Audit rollback. Each maps to an existing 0020 state and one typed outcome; none creates Recovery/queue/dead state.

### 22.4 Deleted/forbidden paths

The implementation must delete or keep absent:

- the V1 marked-before-local-validation claimed path;
- any direct `ai_runs`/config write outside the Domain/Worker repositories;
- any PGlite/in-memory/fake Production repository or synchronous generation endpoint;
- Outbox AI kind, second history/attempt/budget table, local model, fallback, real Provider adapter and temporary compatibility exports;
- generic update DTOs and client-supplied time/environment/provider/model/pricing/budget fields; and
- Phase D–G integration/UI/deployment paths.

### 22.5 Cost and proportionality

Operational cost is one Worker command, two bounded local slots, one short advisory lock around global budget transitions, row-level leases/heartbeats, config/run Admin Domain Services, and real PostgreSQL tests/runbook. Maintenance cost is bounded because all durable meaning stays on one existing row and Provider/application policies remain modular.

The benefit is proportionate: recoverable work, exact cost/provenance, safe cancellation/late-response fencing, global concurrency 2, auditable human/config mutations and optional-AI degradation are required business/data correctness. A third table, distributed queue, scheduler service or generic workflow framework would add more complexity without satisfying a missing invariant.

Complexity increases from an intentionally non-operational Phase B seam to one approved lifecycle/Worker, but stays within the already accepted two-table architecture and removes every temporary/dual path.

## 23. Exact future implementation mutation inventory

This inventory is authorization guidance for a later separately approved Phase C implementation task. It does not authorize implementation now.

### 23.1 Existing files to modify

| Path | Exact ownership/change |
|---|---|
| `src/ai/core/contracts.ts` | replace claimed execution/attempt result with evidence-complete V2 and dispatch callback; retain enqueue contracts |
| `src/ai/core/orchestrator.ts` | local CR-01–CR-12 then fenced marker then one dispatch; preserve Provider-neutrality |
| `src/ai/errors.ts` | add exact `pricing_stale` and `run_cost_limit_exceeded` tuples |
| `src/ai/internal/claimed-run-authority.ts` | replace V1 marked projection with pre-dispatch owner/token/version V2; remove V1 export |
| `src/ai/internal/worker-entry.ts` | expose server-only Worker composition contract only |
| `src/ai/applications/draft-assistance/read-scopes.ts` | bind real transaction operations without exposing DB/generic update |
| `src/ai/applications/draft-assistance/facade.ts` | add governed request method on PostgreSQL; preserve availability behavior |
| `src/ai/applications/draft-assistance/composition.ts` | compose target/context repositories for durable scope; no UI/Provider adapter |
| `src/ai/applications/draft-assistance/context-integrity.ts` | compile only the new 71-code versioned profile |
| `src/ai/applications/draft-assistance/context-integrity.test.ts` | update exact profile/error closure proofs |
| `src/ai/config/model-config-repository.ts` | add locked exact-row/config-set reads, still no writes |
| `src/ai/config/model-config-resolver.ts` | locked-row revalidation and trusted pricing tuple agreement |
| `src/ai/providers/text-provider.ts` | ensure normalized safe evidence survives every result path; no real adapter |
| `src/ai/telemetry.ts` | closed Phase C operational event names/fields |
| `src/server/ai/phase-b-composition.ts` | replace availability-only export with import-compatible Phase C successor or delete after callers move; no two current roots |
| `src/ai/index.ts` | export only safe server/domain public contracts; no Worker/repository capability to clients |
| `scripts/verify-ai-architecture.ts` | classify/prove exact Phase C server/Worker roots and absence boundaries; preserve V3.1 physical identity rules |
| `package.json` | add one `ai:runs:process` entry invoking the modular-monolith Worker; no dependency change |

### 23.2 New files/modules

| Path | Owner |
|---|---|
| `src/ai/applications/draft-assistance/context-integrity-profile.v3_0.json` | sole current 71-code compiled context profile; replaces V2 runtime use |
| `src/ai/config/model-config-service.ts` | Admin-only governed config writer |
| `src/ai/runs/contracts.ts` | closed run/read/claim/transition/evidence DTOs |
| `src/ai/runs/attempt-evidence.ts` | strict normalization, JCS fingerprint and append/enrichment rules |
| `src/ai/runs/pricing-policy.ts` | compiled pricing snapshots/formula; Production billable registry empty |
| `src/ai/runs/retry-policy.ts` | exact backoff/manual allowlist pure policy |
| `src/ai/runs/repository.ts` | PostgreSQL selects/locks/CAS updates with explicit column lists |
| `src/ai/runs/service.ts` | enqueue/read/cancel/manual retry/disposition Domain Service |
| `src/ai/runs/worker.ts` | two-slot claim/recover/heartbeat/dispatch/settlement supervisor |
| `src/server/ai/phase-c-composition.ts` | one discriminated server composition; fake injection only from tests |
| `scripts/process-ai-runs.ts` | signal-aware CLI entry; no business logic |
| `src/ai/runs/*.test.ts` | pure contract/policy/evidence tests |
| `src/ai/runs/*.integration.test.ts` | real PostgreSQL idempotency/locks/budget/recovery/cancel/Audit tests |
| `src/ai/testing/accepted-draft-atomicity-harness.ts` | test-only conspicuous Synthetic transaction owner; excluded from Production graph |
| `docs/review-evidence/phase-1b-stage4a-phase-c-implementation-v1/` | later Candidate proof outputs only; absent during design |

Exact test filenames may split by risk but remain under these owners. A new table/schema/Migration/config/env/dependency/Provider-adapter/business UI path is not on the allowlist.

### 23.3 Files explicitly unchanged

- `drizzle/0020_phase1b_ai_foundation.sql`, all migrations/snapshots/journal and `src/db/schema/ai.ts`;
- accepted ADRs, Phase A/B designs/reviews/evidence/checkpoint refs;
- Product/Content/SEO/Public/CRM/Inquiry/Asset/Upload business implementations except test fixtures used through public Domain contracts;
- Production Prompt manifest/bundle and Production Provider registry contents;
- `.env.example`, `src/config/env.ts`, package lock and dependencies; and
- Product Import default behavior.

### 23.4 Dependency order

1. Add pure retry/pricing/evidence contracts and the 71-code profile successor; make existing AI/architecture tests green.
2. Add PostgreSQL run repository with field/transition allowlists and real transaction tests.
3. Add config writer/read service and required-Audit/default-switch tests.
4. Wire governed enqueue/replay/target/config locking and request facade; keep Worker disabled.
5. Replace claimed execution with pre-dispatch V2, then add marker/heartbeat/settlement/recovery.
6. Add cancellation/manual retry/read/disposition and test-only accepted-Draft atomicity proof.
7. Add two-slot Worker/CLI/safe shutdown and multi-connection PostgreSQL/pressure tests.
8. Update architecture/profile/bundle proofs and prepare implementation Candidate/evidence for independent review.

At every step, old callable seams are removed when the successor lands. No intermediate commit may expose a Production direct/fake/in-memory generation path.

## 24. Acceptance matrix and reviewer proof obligations

| Risk/requirement | Required implementation evidence |
|---|---|
| exact 21/96 authority | ordered Drizzle/Migration/catalog field mapping unchanged; every field appears once in writer/read projections |
| five statuses only | transition matrix positives/negatives; `dead`/`succeeded` rejected |
| idempotency/replay | same/different fingerprint concurrent PostgreSQL cases and one Audit |
| target/config lock | stale target/default switch/Audit failure tests; immutable snapshots/hash recomputation |
| direct `ai_runs` Worker | architecture scan proves no queue/Outbox/second history/in-memory Production repository |
| dispatch truth | local rejection before marker makes zero calls/no dispatch evidence; marker failure makes zero calls; post-marker crash is response loss |
| lease/fence | heartbeat/cancel/expiry/result interleavings with database clock and current version/token |
| retry/backoff/exhaustion | exact formula, maximum attempts, same-row/same-provider snapshots, manual allowlist |
| cancellation/late response | candidate always null; exact replay/different fingerprint; conservative-to-strong accounting only |
| normalized evidence | every safe success/failure field retained; raw payload/header/exception negative corpus |
| budget/cost | exact formula, reservation, hard-limit races, missing usage, warning crossing, overrun truth |
| authorization | full role matrix, entity-type-first non-disclosure, unrelated target/run negatives |
| required Audit | config/enqueue/cancel/manual retry/disposition/acceptance harness rolls back on Audit failure |
| Draft/public boundary | no factual/Publish/Index/Route/rights/public writer reachable; public reads/regressions unchanged |
| privacy | context/JSON/Audit/telemetry prohibited-data recursive negatives; no CRM/Inquiry/private Asset relation |
| modular monolith/bundle | one Worker composition, PostgreSQL only, no public/client reachability, no Refine/public leak |
| operations | graceful/forced shutdown, disabled config/global stop, expired recovery, restart runbook |
| manual degradation | PGlite, missing config/Prompt/provider, disabled feature and Worker outage preserve editor/public behavior |
| frozen scope | empty Production Provider/Prompt registries; no Phase D–G, dependency, Migration, external action |

The Fresh independent reviewer must verify exact Candidate SHA/base/branch/clean state; review all contract successors rather than only tests; compare every transition's lock/fence/idempotency/cost/Audit evidence; rerun real PostgreSQL contention/query-plan proofs from a clean checkout; verify architecture/public-bundle/prohibited-path scans; and report Blocker/High/Medium/Low plus External Validation separately. Developer tests cannot self-accept Phase C.

Any implementation need for a new persisted field/state/table, altered 0020 constraint/index, new dependency, real Provider semantics, PGlite fallback runtime, business candidate application or external operation is `NEEDS_OWNER_DECISION`, not an implementation convenience.

## 25. Impact, compatibility, conditions, and next gate

### 25.1 Schema/Migration and compatibility

Schema/Migration impact: **none**. Migration 0020 remains the additive compatibility boundary. Phase C code must read existing empty or historical rows without deleting/reinterpreting them. Manual editing, Product Import, Asset processing, Revision, Publish, Index and public reads do not depend on AI availability.

### 25.2 SEO/URL/Redirect/public truth

SEO/URL/Redirect impact: **none**. Runs/configs have no public route, Canonical, Sitemap or Index surface. A candidate is neither accepted content nor public truth. Public reads remain approved-revision-only and retain the real-Product eligibility predicate.

### 25.3 Security/privacy

Security/privacy impact is bounded to protected server-side Draft context/candidate/provenance under record authorization. No private/customer data class, file, storage or Provider credential path is added. Environments remain isolated and Production-critical capability fails closed.

### 25.4 Active conditions

- **C-002 remains active:** `RW-005`, `RW-006` and `RW-007` remain hard blockers for Production Ready, deployment, release, launch, formal-data import and public-truth enablement. Phase C design/implementation/review cannot close or bypass them.
- **C-003 remains active:** `FEATURE_PRODUCT_IMPORT` preserves default-false behavior and Product Import is not enabled. `PF-007`'s `.env.example` citation is a later docs-maintenance item and is not edited or claimed by Phase C.
- Provider/api/credential/Staging/Production/Deploy/Publish/Index/formal-data actions remain unauthorized.

### 25.5 Design conclusion and next gate

The accepted Schema and ADRs are sufficient; no Owner/ADR/Schema/dependency decision is presently required. This V1.0 Candidate defines one implementable lifecycle/Worker authority, exact field/contract ownership, every transaction/fence/failure path, proportional proof obligations and rollback without authorizing its implementation.

The only next gate is a **Fresh independent Phase C Exact Design Review by a different task**. This author does not self-review, implement, create the reviewer task, merge, checkpoint, Push, Deploy, Publish, Index or advance to Phase D–G.
