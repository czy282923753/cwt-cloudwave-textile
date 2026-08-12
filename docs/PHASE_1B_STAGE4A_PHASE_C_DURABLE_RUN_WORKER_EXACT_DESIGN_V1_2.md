# CWT Stage 4A Phase C — Durable `ai_runs` Lifecycle and Modular-Monolith Worker Corrected Exact Design V1.2

Status: **CORRECTED DESIGN CANDIDATE / NOT ACCEPTED / NOT SELF-APPROVED / PHASE C IMPLEMENTATION NOT AUTHORIZED BY THIS DOCUMENT**

- Prepared: `2026-08-12` (`Asia/Shanghai`)
- Accepted base: `cc5715f4a9eb07293bf932cfbd822bfa6bf14a45`
- Accepted checkpoint: `refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-implementation-accepted-v1` → exact base
- Candidate branch: `codex/phase-1b-stage4a-phase-c-exact-design-v1`
- Exact Candidate parent: failed V1.1 commit `cf44be2bc7f0086a87099492b6a75883b0c44083`
- Finding authority: V1.1 Fresh independent FAIL re-review commit `1ba56c942a15eb243edabeb393ccec8c8ae40972`
- Attempt accounting: `H-01` is PASS/CLOSED at design level; this is `M-01` correction attempt 2
- Developer verification: [`DESIGN_REMEDIATION_VERIFICATION_V1_2.md`](./review-evidence/phase-1b-stage4a-phase-c-exact-design-v1-2/DESIGN_REMEDIATION_VERIFICATION_V1_2.md)

## 1. Decision, outcome, and non-goals

### 1.1 Exact Phase C outcome

Phase C will replace the Phase B `integration_not_ready` durable seam with one PostgreSQL-backed `ai_runs` Domain Service and one modular-monolith Worker. One `ai_runs` row is simultaneously the logical request identity, due work item, active claim, retry/recovery record, protected candidate, normalized attempt/cost provenance, and human-disposition record. The Worker claims that row directly; there is no queue table, Outbox reuse, second run-history authority, in-memory Production repository, synchronous Provider fallback path, or alternate runtime. Every active-lease membership mutation, including heartbeat renewal, is serialized by the one accepted environment-scoped transaction advisory lock before any run-row lock.

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

The Phase C authority is the [Stage 4 pre-development implementation plan](./PHASE_1B_STAGE4_PRE_DEVELOPMENT_IMPLEMENTATION_PLAN.md), the accepted [Phase B V2.2 exact design](./PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_THREE_STRIKE_REPLACEMENT_CORRECTED_EXACT_DESIGN_V2_2.md), the [Phase B implementation-gate acceptance](./PHASE_1B_STAGE4A_PHASE_B_IMPLEMENTATION_GATE_ACCEPTANCE_RECORD_V1_0.md), and its controlling [Fresh independent re-review](./PHASE_1B_STAGE4A_PHASE_B_V2_2_FRESH_REPLACEMENT_FOUNDATION_IMPLEMENTATION_IMP3_NM01_PHYSICAL_TARGET_IDENTITY_REMEDIATION_V3_INDEPENDENT_REREVIEW_V1_0.md). The exact independent V1.0 FAIL report is read from review commit `8572f678cb608ff7dc41fd60a241fcbb0b4b18f3` at `docs/PHASE_1B_STAGE4A_PHASE_C_DURABLE_RUN_WORKER_EXACT_DESIGN_INDEPENDENT_REVIEW_V1_0.md`; it is finding authority for H-01 and M-01 and is not imported or edited on this branch.

The accepted [`0020_phase1b_ai_foundation` Schema design](./PHASE_1B_STAGE4A_PHASE_A_0020_AI_FOUNDATION_SCHEMA_DESIGN_V1_0.md), implemented by [`drizzle/0020_phase1b_ai_foundation.sql`](../drizzle/0020_phase1b_ai_foundation.sql) and [`src/db/schema/ai.ts`](../src/db/schema/ai.ts), supplies the exact relational/state authority. Historical failed Phase B designs and remediation mechanisms are not imported.

Resolution rules:

1. ADR-0018 supersedes ADR-0017's earlier generic success/dead language with the five statuses and separate retry state.
2. The accepted Phase B Production registry contains the four implemented Draft-assistance keys. Earlier plan wording that names the same four business outcomes differently does not reopen the accepted registry.
3. Phase B's `durableEnqueueAvailable=false`, availability-only server composition, type-only Worker entry and empty Production Provider/Prompt registries are intentional Phase B stop boundaries. Phase C replaces only the durable lifecycle seams described here.
4. Migration 0020 is frozen. No observed lifecycle requirement requires an additional field, constraint, table, enum, trigger or index. A future implementation that cannot meet this design with the existing 21/96 fields must stop as `NEEDS_OWNER_DECISION`; it may not silently generate Migration 0021.
5. `target_snapshot_hash` retains the accepted meaning: the JCS/SHA-256 hash of the authorized structural association snapshot (target identity, locale and expected version). The exact selected target/source values are separately bound by `input_context_json` and `input_hash`; Phase C must not reinterpret the target hash as a second full-context hash.
6. V1.0 and V1.1 are immutable failed history. This V1.2 is one complete replacement Candidate, not a patch layer: where V1.2 differs, only V1.2 is current for re-review; V1.0/V1.1 supply no runtime or implementation authority.
7. The V1.1 Fresh independent re-review is read from exact commit `1ba56c942a15eb243edabeb393ccec8c8ae40972` at `docs/PHASE_1B_STAGE4A_PHASE_C_DURABLE_RUN_WORKER_EXACT_DESIGN_V1_1_FRESH_INDEPENDENT_REREVIEW_V1_0.md`. It closes H-01 at design level and keeps M-01 open because the accepted Synthetic definition/scope/type fixture were missing from the mutation authority.
8. The re-review found no Owner/ADR/Schema/Migration/dependency decision need. V1.2 preserves the entire H-01 design unchanged and corrects only M-01 semantic inventory/allowlist closure without adding a persistent mechanism or expanding Phase C.

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

`ai_model_config` is exactly 21 fields and `ai_runs` exactly 96 fields in Migration 0020 and Drizzle. Ordered names agree. The catalog is exactly 40 named Checks (12 config + 28 run), 11 named FKs (3 + 8) and 18 explicit secondary/unique indexes (3 + 15), also name-set equal between Migration and Drizzle. They cover the five statuses, retry state, current-attempt marker, cancellation fence, budget/cost states, disposition shape, idempotency, due claims, active leases, budget sums and target histories. **No Schema/Migration mismatch was found.**

### 4.2 Contract successors required in Phase C

These are bounded replacement changes, not parallel compatibility paths:

| ID | Observed accepted-code seam | Required Phase C replacement |
|---|---|---|
| `PC-M01` | `ConstructedClaimedRunV1` requires `actualProvider`, `activeAttemptDispatchedAt` and `providerDispatchedAt` before `executeClaimedTextAttempt`, while the method still performs local registry/config/Prompt/context/token validation before the network call. Marking before those checks falsely records a dispatch and can conservatively debit a call that never began. | Replace with a pre-dispatch claimed authority containing `lease_owner/token/version` and current-marker-null proof. The core performs all local CR-01–CR-12 validation first, invokes one fenced `authorizeProviderDispatch` callback, and may call the adapter only after that callback commits. Remove the V1 marked-row construction path; no fallback remains. |
| `PC-M02` | `ProviderTextResultV1.failure` carries HTTP status, safe Provider code/request ID, but `AiAttemptResult.failure` discards them; post-result validation paths also discard returned model, usage and request ID. | Replace `AiAttemptResult` with one normalized attempt-evidence envelope that retains every safe available field for success and failure. The persistence layer hashes that envelope and never receives raw output/headers/exceptions. |
| `PC-M03` | The accepted Schema design names terminal failures `pricing_stale` and `run_cost_limit_exceeded`, but the sole `aiErrorCodes` authority has neither. | Create a versioned 71-code context-integrity successor, add exactly those two codes to `src/ai/errors.ts`, replace the 69-code runtime profile/compiler assertion, and update affected proofs/tests. The old 69-code profile remains Git history/evidence only and is not a runtime fallback. |
| `PC-M04` | `ConstructedClaimedRunV1` omits `lease_owner`, and local `now()` checks can only advise; they cannot prove database-clock lease or environment active-count authority. | The V2 claimed handle contains owner/token/version/expiry. Every heartbeat first obtains the same transaction advisory lock used by recovery/count/admission, then applies a PostgreSQL-clock row fence. Application time can only trigger an early abort. The review's H-01 split lock domain is removed. |
| `PC-M05` | `DraftAssistanceService` Production composition exposes availability only; `worker-entry.ts` is type-only; the transaction scope operations intentionally have no implementation. | Delete the obsolete Phase B root/export after moving its callers. Retain exactly one root, `src/server/ai/phase-c-composition.ts`, with PGlite availability-only and PostgreSQL durable service/Worker branches. Replace every actual direct consumer and bind the gate to the standalone Phase C V4.0 profile in Section 23; no compatibility re-export remains. |
| `PC-M06` | `PreparedCoreRunV1` intentionally excludes trusted environment, pricing and budget snapshots required by 0020. | Keep it Provider-neutral. The transaction-bound `commitPreparedRun` is the sole trusted composer of target columns plus server-owned execution/budget/pricing fields before insert; callers cannot provide them. |

No accepted Phase B authority file or proof is edited in place. Phase C creates current successors where a runtime profile/proof must change and keeps prior evidence immutable.

### 4.3 Remediation finding disposition

| Finding | Causal correction | Primary sections |
|---|---|---|
| `H-01 HEARTBEAT-CLAIM-SERIALIZATION` | **PASS/CLOSED AT DESIGN LEVEL in V1.1; preserved unchanged.** One fixed advisory serialization domain covers claim, expired recovery, active count, admission, heartbeat, dispatch marker, settlement, cancellation, manual retry, late accounting and shutdown-originated persistence before any run row. | 6, 8, 9, 20, 21, 22, 24, 26 |
| `M-01 REPLACEMENT-INVENTORY-CLOSURE` | The literal 11-path scan is retained, and a second semantic scan closes the real accepted Synthetic definition, transaction scope, type fixtures, type checker and application-contract consumers. The one existing `createSyntheticDefinitionV1` delegates its request operations to the one existing `SyntheticCaseTransactionScope`; no inline/duplicate binder or out-of-allowlist edit is permitted. | 14, 19, 22–24, 26 |

H-01 is preserved closed, not redesigned. M-01 is the only current correction. These are design/static authorities only; real PostgreSQL and implementation-tree proofs remain future Phase C implementation evidence, not claims made by this document.

## 5. State machine and transition ownership

`AiRunServiceV1` owns the graph below. The Worker can invoke only system transitions; human actors can invoke only the explicitly authorized commands.

| From | To | Command/owner | Required fence | Candidate rule | Cost rule |
|---|---|---|---|---|---|
| absent | `pending + none` | governed enqueue / authorized Editor or Admin | locked target/config + unique idempotency key | null | `preflight`, zero accounted/reserved |
| `pending` | `processing + none` | Worker claim | environment advisory lock + due row lock + environment/concurrency/budget checks | null | `reserved`; first claim fixes charge period |
| `processing` | `processing` | Worker heartbeat | environment advisory lock first + owner/token/version/safety-window lease fence | unchanged null | unchanged |
| `processing` | `processing` | dispatch marker | environment advisory lock first + owner/token/version/unexpired lease, current marker null, no unresolved heartbeat | null | unchanged reservation |
| `processing` | `draft_ready + none` | Worker successful settlement | environment advisory lock + current owner/token/version/unexpired lease | validated candidate+hash set atomically | `final`; zero reservation |
| `processing` | `pending + scheduled` | Worker transient settlement or expired-lease recovery | environment advisory lock + current/expired row fence | null | current attempt accounted; remaining logical ceiling retained |
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
3. **Every active lifecycle/budget/lease transition:** `pg_try_advisory_xact_lock(1129792594, 1)` (`CWT_AI_TEXT_CLAIM_BUDGET`) → `ai_runs` rows in ascending UUID order → required Audit last when human-governed. This exact order applies to expired recovery, active-count/new claim, heartbeat, dispatch marker, Worker settlement/automatic retry, cancellation, manual retry, late accounting, and shutdown-originated settlement. There is no heartbeat exception and no blocking advisory call.
4. **Human candidate application seam:** target row → `ai_runs` row → target mutation → run disposition/link → required Audit last. It never acquires the budget advisory lock because generation cost is already final.
5. **Terminal quality-only disposition:** one already-terminal `ai_runs` row → required Audit. It never acquires the advisory lock and can never transition a processing lease or cost state.

The pair `(1129792594, 1)` remains the exact accepted Phase A key. It is environment-scoped because CWT environments never share a database and every command additionally requires `ai_runs.execution_environment` to equal the trusted server environment. Per-row keys, hashed environment keys, session locks, blocking locks and a second lock domain are forbidden.

No path may lock a run and then request the AI advisory lock. A human cancellation/manual retry derives record authorization from actor role plus the advisory-locked run's target projection; it does not add a target row lock to the lifecycle transaction. Foreign keys retain target existence, and candidate application separately reauthorizes/locks the target. Enqueue/config/application transactions never later request the lifecycle advisory lock, so they cannot form a target/config/run/advisory cycle.

`pg_try_advisory_xact_lock` is non-blocking. Failure occurs before any run-row read-for-update or mutation. Claim/recovery slots wait the one-second idle poll; governed human commands return typed `state_conflict` with manual editing available; Worker heartbeat/dispatch/settlement follow the bounded lease-safe behavior in Sections 8.3–8.4. Lock-busy itself is the ephemeral `LifecycleLockOutcomeV1.kind = "lock_busy"`; it is not an `AiErrorCode`, `failure_code`, status, retry state or persisted event.

Deadlock argument: every transaction that can change active membership or budget owns the single advisory lock before rows, then uses ascending run IDs. A transaction holding a run never waits for that lock. Target/config transactions never enter its domain; terminal disposition never becomes active again. Therefore the lifecycle wait graph has a single root and no lock-order cycle. Real PostgreSQL verification must still prove this under Section 20.

### 6.2 Database/network boundary

Every enqueue, claim, heartbeat, dispatch marker, settlement, recovery, cancel, retry and disposition mutation is a short database transaction. No transaction or connection remains open across Prompt rendering, token estimation or Provider/fake-adapter execution. No Provider call begins before a committed dispatch marker. A lifecycle transaction never intentionally waits on the advisory lock; it either obtains it immediately or returns its exact no-mutation outcome.

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
heartbeat safety window:      10 seconds before current database expiry
heartbeat lock attempts:       5 total (initial + 4 retries)
heartbeat lock retry delay:    1 second
idle poll base:                1 second
automatic retry backoff:      min(30 seconds * 2^(attempt_count - 1), 5 minutes)
graceful shutdown drain:      20 seconds
post-abort persistence grace:  5 seconds
```

Maximum attempts is copied from configuration and remains `1..3`. Backoff has no persisted random jitter; each process may add at most 250 ms of non-authoritative poll jitter to avoid synchronized empty polls. `next_attempt_at` is exact database state. Heartbeat/dispatch lock retries have no jitter and never alter durable retry state.

### 8.2 Claim/recovery loop

Each local slot requests work only while the process is accepting claims. It must first obtain the advisory lock; lock-busy means no run query and a one-second poll. Under that lock the repository first selects the oldest expired `processing` row for the current environment with `FOR UPDATE SKIP LOCKED`. If one exists, it performs exactly one recovery and commits without also claiming new work; the loop then continues.

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

The core completes accepted replay order CR-01–CR-12 locally. Only then it invokes `authorizeProviderDispatch` once. The callback first obtains the same advisory lock and then locks/updates the run; it is prohibited while the slot has an unresolved heartbeat lock-busy outcome. It requires:

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

A lock-busy dispatch marker performs no row access and no Provider call. It may use the same one-second/five-attempt/safety-window rule as heartbeat; exhaustion aborts the slot. A zero-row marker or lost lease also aborts. After a successful marker, the adapter may be called at most once. The lease supervisor starts before dispatch, records exactly one current expected version, and updates it only from committed marker/heartbeat results. The result path stops/joins the heartbeat before using that latest version in settlement.

### 8.4 Heartbeat and fencing

Every 15 seconds a heartbeat opens a short transaction and obtains a single database observation plus the non-blocking advisory result. If lock-busy, it performs no row select-for-update, mutation, lease extension, state-version change or dispatch authorization. The slot enters ephemeral `renewal_pending`; it remains occupied and cannot claim replacement work. Before dispatch it cannot cross the marker, and after dispatch it may only keep the already-started call alive during the bounded retry sequence. The slot is released only after committed settlement, terminal fence loss, or abort followed by persistence/expiry handoff.

The first attempt plus at most four retries are spaced exactly one second apart. A retry is scheduled only when the database `observed_at` returned by the lock-busy attempt shows that the next attempt would begin strictly before `current_lease_expires_at - 10 seconds`. No local clock is authority. Five busy attempts, entry into the ten-second safety window, or a database-time/transport failure produces ephemeral `lease_renewal_unavailable`, aborts the Provider signal and forbids new dispatch/settlement as current authority. It adds no persisted error/state; ordinary fenced shutdown settlement may persist if it subsequently obtains the lock within the valid lease, otherwise expiry recovery owns the row.

After obtaining the advisory lock, heartbeat locks the one run and captures one `clock_timestamp()` value. Its update requires owner/token/expected-version, `status=processing`, matching trusted environment and `lease_expires_at > observed_at + interval '10 seconds'`; it sets expiry to `observed_at + interval '60 seconds'` and increments state version. A zero-row result is `lease_lost_or_unsafe`, aborts immediately and is never retried as renewal. This predicate makes renewal after expiry, or inside the safety window, impossible.

The advisory lock is held through the heartbeat row update/commit. Thus a heartbeat may hold both across the old committed expiry, but recovery/count/admission cannot enter until that transaction commits. Conversely, if claim/recovery owns the advisory lock first, heartbeat cannot lock the row; after recovery its later row fence fails. There is no supported commit order in which the old lease is renewed and a third active lease is admitted.

After an adapter result, settlement stops/joins heartbeat, then first takes the advisory lock, the run lock, and the latest owner/token/version/unexpired fence. Lock-busy settlement retries at one-second intervals, at most five attempts, only while database observations remain before the ten-second safety boundary; no further heartbeat can race the captured expected version. If it cannot persist safely, it discards the result and expiry recovery conservatively owns response loss. If cancellation already won, the ordinary result path writes no candidate and may attempt only the cancellation late-evidence path. If expiry/recovery won, the stale Worker discards the result.

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

The manual-retry transaction first tries the environment advisory lock and only then reads/locks the run. Lock-busy returns `state_conflict`, writes neither run nor Audit, and reserves no budget. Automatic retry settlement uses the Worker lease-safe behavior in Section 8.4.

### 9.3 Expired lease

- Marker null: append an undispatched abandoned attempt with zero cost; schedule the same run using normal backoff when attempts remain, otherwise fail exhausted. Retain reservation only for a scheduled retry.
- Marker non-null: classify response loss as safe `provider_transport_error`/normalized `unknown`, debit the attempt upper bound and set `actual_cost_complete=false`; schedule or exhaust under the same ceilings.
- Recovery clears owner/token/acquired/expiry/current marker and increments the state version. It never creates a run/candidate or accepts output.

An old token has no late-enrichment authority after ordinary expiry/recovery. Only a human cancellation deliberately retains `cancelled_lease_token` for the one bounded accounting path in Section 10.

### 9.4 Safe shutdown

On `SIGTERM`/`SIGINT`, the Worker stops new claims immediately; an already lock-busy claim attempt cannot continue into row access. It keeps the normal advisory-serialized heartbeats for in-flight calls for at most 20 seconds. A heartbeat busy retry never receives a shutdown exception or a blocking lock; failure to renew under Section 8.4 aborts that call early.

At the drain deadline the supervisor aborts each call. Supervisor-originated abort is an operational transient/response-loss outcome, not human `cancelled`. Shutdown persistence uses the same advisory-first row fence and at most the ordinary five-second post-abort grace; lock-busy performs no mutation. If fenced persistence cannot commit inside the still-valid lease, the process exits and later advisory-serialized expiry recovery owns conservative accounting. No shutdown path renews an expired lease, bypasses global concurrency, invents a user cancellation actor or holds a database transaction while waiting for the Provider.

## 10. Cancellation and late response

Human cancellation is permitted only from `pending` or `processing`. Admin may cancel any run; otherwise only the original requester may cancel after the service rechecks the run's Product/Content module against the current actor role. Target editability/version is not required to stop spend.

The governed transaction non-blockingly takes the advisory lock then the run row, checks expected `state_version`, writes actor/reason/time and terminal time, sets `cost_accounting_state=final`, zeroes reservation and increments state version. Lock-busy returns `state_conflict` and writes neither run nor required Audit. This order serializes cancellation with heartbeat, dispatch, settlement, recovery and admission.

- Initial pending/preflight: charge period stays null; cost stays zero.
- Pending scheduled: retain accounted prior attempts and original charge period; release remaining reservation.
- Processing before marker: append `discarded_cancelled`, response `not_dispatched`, zero current cost, copy the active token, clear lease/marker and release reservation.
- Processing after marker: append `discarded_cancelled`, set `cancelled_no_response`, copy the active token, convert the current attempt upper bound to accounted cost, clear lease/marker and release unused future reservation.

The cancellation Check and candidate Check make `candidate_json/hash` null forever. The stale Worker cannot satisfy processing/token/version.

One accounting-only late command first obtains the advisory lock, then may match `status=cancelled`, `cancelled_lease_token`, current version and the closed current attempt. Lock-busy is a no-mutation retryable operational result. It JCS-hashes normalized evidence:

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

Budget totals are `SUM(accounted + reserved)` for the immutable first-claim day/month. The same advisory lock serializes heartbeat/recovery/active-count/admission as well as reservation, release, settlement, cancellation, manual retry and late accounting. Heartbeat changes no cost column, but joining the same lock domain prevents an uncommitted renewal from being invisible to active-count admission. Daily/monthly hard stops are inclusive ceilings: a claim is denied only when the proposed total is greater than the limit.

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
| `lease_owner` | advisory-serialized claim; heartbeat retains; exit clears | Worker fence only |
| `lease_token` | advisory-serialized claim fresh UUID; exit clears | Worker fence only |
| `lease_acquired_at` | advisory-serialized claim database time; exit clears | Worker fence/operations |
| `lease_expires_at` | advisory-serialized claim/heartbeat; exit clears | Worker fence/recovery/environment concurrency |
| `active_attempt_dispatched_at` | dispatch marker; transition out clears | current-attempt response-loss classifier |
| `state_version` | every run mutation increments; heartbeat only after advisory lock | every optimistic/fenced command |
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
| `createSyntheticDefinitionV1`, `SyntheticDefinitionV1` | sole accepted Synthetic application definition and request binder | Retain the one definition; replace its five request-side `integration_not_ready` closures with exact delegation to its injected `SyntheticCaseTransactionScope`; availability stays fail-closed |
| `SyntheticCaseTransactionScope`, `SyntheticCaseOperationsV1`, `withSyntheticCaseTransactionScope` | sole test-only Synthetic transaction-bound durable request port and private constructor | Extend in place with the closed replay/feature/config/confirm/commit operations in Section 23.2; do not add a second scope, binder, factory or public constructor |
| `PreparedRequestIdentityV1` | idempotency key/fingerprint/actor | Retain exactly |
| `PreparedCoreRunV1` | Provider-neutral immutable application/config/context projection | Retain; trusted server composer supplies remaining 0020 columns |
| `ReplayLookupResultV1`, `PreparedRunCommitResultV1`, `CoreCommittedRunSummaryV1` | exact replay/unique-loser/result | Retain; unauthorized/mismatch remains typed failure |
| `AiModelConfigRow`, `AiModelConfigResolutionReadV1`, repository/resolver | one exact config resolution | Retain; add locked-row revalidation and separate Admin mutation service |
| `ResolvedModelConfigV1`, `resolvedConfigHashV1` | immutable run snapshot/hash | Retain exactly; activation/default metadata remains outside hash |
| `ApplicationPersistenceCodec`, Draft association/context/output policies | target columns, durable context reconstruction and protected result | Retain accepted codecs; no second visitor or context builder |
| `ConstructedClaimedRunV1`, `constructClaimedRunV1` | current marked claimed projection/factory | Delete both and replace with `PreDispatchClaimedRunV2`/`constructPreDispatchClaimedRunV2` per `PC-M01/M04`; no V1 runtime export |
| `AiClaimedExecutionService`, `ExecuteClaimedTextAttemptCommand`, `createAiClaimedExecutionServiceV1` | CR-01–CR-14 and one adapter dispatch | Delete all three V1 symbols; replace with `AiClaimedExecutionServiceV2`, a pre-dispatch command and required fenced callback; no parallel method |
| `AiAttemptResult` | normalized result to lifecycle settlement | Delete and replace with `NormalizedAttemptEvidenceV2`; no evidence-dropping adapter |
| `TextAiProvider`, `ProviderTextResultV1` | injected capability adapter; fake only in Phase C | Retain capability interface; normalize every safe optional failure/success field before persistence |
| `PromptBundleLoaderV1`, renderer and output parser/policy | immutable Prompt/request/output validation | Retain; Production bundle remains exact-empty |
| `SafeAiError`, `AiServiceResult`, `aiErrorCodes` | sole typed error authority | Add exact two-code successor per `PC-M03`; no second run-error map |
| `AiTelemetrySink` | non-authoritative redacted operational events | Extend closed event names; never lifecycle/cost truth |
| `worker-entry.ts` | server-only Worker boundary | Replace its V1 type re-export with the narrow Phase C Worker contract/factory export; no web/public reachability |
| `phase-b-composition.ts` | availability-only Production server root | Delete file and export after all callers move. The sole successor is `src/server/ai/phase-c-composition.ts`; no re-export/shim remains. |
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

Phase C has exactly one server composition file: `src/server/ai/phase-c-composition.ts`. It exports exactly `createPhaseCServerAiServiceV1` and `createPhaseCAiRunWorkerV1`. The first returns availability-only for a narrowed PGlite branch and durable availability/request for a narrowed PostgreSQL branch. The second returns a Worker only for PostgreSQL and fails closed for PGlite/unauthorized environments. `scripts/process-ai-runs.ts` may import only the Worker factory from that root. No `src/app/**`, public/business module or second server composition imports it in Phase C.

The root projects only `env.APP_ENV`, `env.FEATURE_AI`, and the branch-narrowed opaque database executor. It imports the exact-empty `productionTextProviderRegistryV1` and exact-empty `productionPromptLoaderV1`; it cannot import `src/ai/testing/**`, an in-memory/PGlite durable repository, Provider adapter/SDK/network/credential/endpoint or Phase D root. `src/server/ai/phase-b-composition.ts` and both of its factories are absent after replacement.

### 19.4 One current Phase C architecture authority

The only checker remains `scripts/verify-ai-architecture.ts`. Phase C replaces its current profile input with exactly:

```text
path: test-fixtures/ai-architecture/graph-faults.phase-c.v4_0.json
schemaVersion: 40
profileId: cwt.phase1b.stage4a.phasec.durable-run-worker-boundary.v4_0_candidate
profileVersion: 4.0.0-candidate
```

V4.0 is a complete, standalone profile/fixture. The checker reads no V3.1/V3.0/V2.2 profile as a runtime input and has no embedded selector fallback, compatibility collector or second scanner. `graph-faults.v3_1.json` remains byte-immutable historical Phase B authority and is merely an ordinary classified historical fixture in the actual-tree inventory.

At implementation time the checker must embed and verify (a) SHA-256 of the exact raw V4.0 bytes and (b) SHA-256/JCS of the V4.0 selected-pointer integrity projection. Mismatch fails before tree enumeration. The profile contains the complete selectors, exact one-root template, production/test/evidence capability rules, all 66 accepted fault IDs, all 10 positive IDs, all three topology IDs, and all 28 accepted lifecycle/classification mutation probes copied into V4.0 without runtime inheritance. It adds the exact Phase C negative probes listed in Section 23.5. Removing, renaming, skipping or expected-failure weakening of an inherited probe fails closed.

One implementation proof directory is current:

```text
docs/review-evidence/phase-1b-stage4a-phase-c-implementation-v1/architecture-v4/
```

It contains exactly these current architecture outputs:

1. `AI_ACTUAL_TREE_AND_STATIC_LANGUAGE_PROOF_PHASE_C_V4_0.json`;
2. `AI_STATIC_MODULE_AND_RESOURCE_GRAPH_PROOF_PHASE_C_V4_0.json`;
3. `AI_CAPABILITY_ORIGIN_AND_NON_REACHABILITY_PROOF_PHASE_C_V4_0.json`;
4. `AI_PHASE_C_COMPOSITION_AND_WORKER_PROOF_V4_0.json`;
5. `AI_SERVER_PUBLIC_BUNDLE_BOUNDARY_PHASE_C_V4_0.json`; and
6. `AI_PHASE_C_ARCHITECTURE_PROOF_MANIFEST_V4_0.json`.

Every proof uses canonical JSON plus one LF and includes `schemaVersion=40`, profile ID/version, raw profile hash, integrity hash, checker SHA-256, exact implementation Candidate commit, exact input hashes and its own content-derived `proofHash`. The manifest JCS-binds the first five relative paths to exact file SHA-256/proof hashes plus checker/profile hashes, inherited/new mutation-probe-set hashes and Candidate commit; it does not list its own hash. `AI_ACTUAL_TREE_AND_STATIC_LANGUAGE_PROOF_PHASE_C_V4_0.json` additionally binds the exact hashes of the Synthetic definition, scope, existing test, positive fixture and all preserved negative fixtures/configs; it records the sole definition/factory paths, exact six-operation transaction-scope key set, zero durable operation on the observation scope, and the checker-produced positive/negative compiler outcomes. These facts are checker-derived from the actual Candidate, never self-declared inputs. The terminal implementation callback and independent review record the manifest SHA-256 externally. Placeholder, self-declared-only, partial, stale-commit or mixed V3/V4 proof fails closed. Existing accepted Phase B evidence is never rewritten or promoted to Phase C current proof.

## 20. Deterministic seams and PostgreSQL proof

### 20.1 Time and randomness

- Database statement/clock time is authoritative for queued/claim/lease/dispatch/response/completion/evaluation timestamps, charge periods and due comparisons.
- Pure policy functions accept explicit `Date`/integer inputs for unit tests; they do not write them directly to business tables.
- PostgreSQL tests create past/future rows with SQL relative to `clock_timestamp()` and avoid wall-clock sleeps.
- UUID generation is injected in pure/contract tests. Production uses cryptographically random UUIDs/database defaults. Fixed Synthetic UUIDs are conspicuous.
- Fake providers use explicit deferred promises/barriers so claim, heartbeat, cancellation, response-loss and shutdown interleavings are deterministic.
- Backoff is the exact pure formula in Section 8.1; no hidden jitter enters durable state.
- Lifecycle tests expose barriers after advisory acquisition, after row lock/update, before commit and after commit. For H-01, an observer connection polls `clock_timestamp()` until the exact old-expiry predicate becomes true, then releases the next barrier; no fixed-duration sleep or local clock decides the schedule.

### 20.2 Required real PostgreSQL evidence

PGlite proves only availability/manual-editor compatibility. The Phase C implementation Candidate must run against a disposable supported PostgreSQL 17/18 instance with at least two independent Worker connections and an observer:

1. same key/same fingerprint → one row, one enqueue Audit, same summary;
2. same key/different fingerprint → one row and safe conflict without payload disclosure;
3. two Workers/one due row → one token and attempt;
4. at least three due rows/multiple Worker processes → committed unexpired active count never above 2;
5. **H-01 mandatory barrier:** establish committed R1/R2 `processing` and unexpired in one environment plus due R3. Give R1 enough database-time headroom to pass the ten-second renewal predicate. Connection H obtains the shared advisory lock, locks/updates R1 heartbeat and pauses before commit; an observer waits on the database predicate until the old committed expiry passes. Connection C attempts the exact expired-recovery `FOR UPDATE SKIP LOCKED` → active-count → admission sequence. Because C cannot obtain the advisory lock, it performs no row read/mutation/claim. Release H, then C counts renewed R1/R2 and cannot claim R3. Repeat with C owning the advisory lock first: H is lock-busy and never locks R1; C either counts pre-expiry R1/R2 and admits none, or recovers expired R1 then may admit R3; a later H fence fails. Observe every commit order and assert no snapshot contains three committed unexpired processing leases, no lock-busy heartbeat row mutation, and no lease renewal after expiry/safety window;
6. heartbeat lock-busy initial+four one-second retries, ten-second safety boundary, dispatch gating and abort path use database observations and make no persisted lock-busy state; heartbeat versus cancel and result versus cancel yield exactly one fence winner and no candidate after cancel;
7. marker failure/lock-busy → zero fake Provider calls; crash after committed marker → conservative response-loss accounting;
8. expired undispatched/dispatched retry paths → same row, exact attempt/backoff/cost evidence;
9. same-day and midnight/month-boundary logical runs → immutable original charge period;
10. two claims at daily/monthly boundary → advisory lock admits only work within hard limits;
11. missing usage and actual overrun → conservative debit/failed overrun without hiding cost;
12. manual retry versus cancel/claim → one legal transition and no double reservation;
13. default switch versus enqueue → locked exact snapshot or clean optimistic conflict;
14. disposition/acceptance-harness races → one target/run/Audit mutation; Audit failure rolls all back;
15. graceful and forced Worker shutdown, including advisory contention during drain → no new claims/late renewal/third lease, no lost durable authority, later expiry recovery; and
16. after each case, zero idle-in-transaction sessions and no residual advisory/row locks.

The accepted Migration query-plan suite is rerun for due claim, active/expired lease, budget day/month, idempotency, requester/target/admin history and enabled-default resolution at scale. Record exact PostgreSQL version, data distribution, planner settings, JSON plans, selected indexes and lock observations. Local inference is not proof of PostgreSQL locking, isolation, deadlock behavior or query plans.

### 20.3 Target-resource and operational validation

With fake adapters only, exercise two concurrent text slots on the target 2 vCPU/4 GB-equivalent non-Production envelope and record memory/CPU/event-loop/DB-pool behavior, including advisory contention and heartbeat retry/abort rates. Real Provider latency, cancellation semantics, usage accuracy and deployment scheduling remain Phase D/F External Validation and cannot be claimed here.

This document and its V1.2 evidence perform design/static verification only. They do not claim that the H-01 PostgreSQL schedule, lock plans or resource envelope have executed; those are mandatory EV-01/EV-02 implementation proofs.

## 21. Operational stop, recovery, and rollback

### 21.1 Normal stop and operator recovery

1. Disable the global `ai` feature flag to stop enqueue availability and new Worker claims; or disable a referenced config to park its pending rows.
2. Signal the Worker to drain under Section 9.4. It never uses a blocking advisory wait; lock-busy heartbeat/shutdown persistence follows the bounded no-mutation path and later recovery. Manual Product/Content editing remains available throughout.
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
- the one existing PostgreSQL transaction advisory key and row-lock capabilities, now uniformly ordered for heartbeat as well as claim/recovery;
- accepted Provider-neutral application, context, Prompt, output and fake-provider contracts;
- the one accepted `createSyntheticDefinitionV1` application path, its private `SyntheticCaseTransactionScope` constructor and the existing positive/negative type-fixture checker;
- existing global feature flag, role system, Draft/Revision authority and required Audit transaction helper; and
- existing manual editor/public-read paths.

Replaced:

- Phase B `durableEnqueueAvailable=false` and `integration_not_ready` request seam by the one durable PostgreSQL service;
- the five request-side Synthetic `integration_not_ready` closures by delegation from the existing definition to the existing transaction scope, without replacing the definition or duplicating its binder;
- type-only Worker boundary by one direct-claim Worker;
- split heartbeat/claim serialization by one advisory-first lifecycle domain;
- premarked claimed-execution contract by the pre-dispatch/fenced-callback contract;
- evidence-dropping attempt result by the normalized evidence-complete result; and
- 69-code current runtime profile by one 71-code successor, with no dual profile.

### 22.3 Exact new states and failure modes

No new persisted status/table exists beyond 0020. Phase C activates the already-approved status/retry/cost/lease/disposition values. Runtime failures newly reachable include lock busy, ephemeral `lease_renewal_unavailable`, lease loss/expiry, response loss, budget denial, pricing drift, cost overrun, idempotency conflict, cancellation/result race and required-Audit rollback. Lock-busy/renewal-unavailable are process outcomes only; every durable result maps to an existing 0020 state. None creates Recovery/queue/dead state or a second error-code authority.

### 22.4 Deleted/forbidden paths

The implementation must delete or keep absent:

- the V1 marked-before-local-validation claimed path;
- any second Synthetic application definition, copied/inline request binder, monkey patch, alternate transaction scope/factory, test-only durable closure or compatibility export that bypasses `createSyntheticDefinitionV1` plus `withSyntheticCaseTransactionScope`;
- `src/server/ai/phase-b-composition.ts`, both Phase B factory exports and any import/re-export/alias/compatibility shim to them;
- any direct `ai_runs`/config write outside the Domain/Worker repositories;
- any PGlite/in-memory/fake Production repository or synchronous generation endpoint;
- Outbox AI kind, second history/attempt/budget table, local model, fallback, real Provider adapter and temporary compatibility exports;
- generic update DTOs and client-supplied time/environment/provider/model/pricing/budget fields; and
- Phase D–G integration/UI/deployment paths.

### 22.5 Cost and proportionality

Operational cost is one Worker command, two bounded local slots, one short non-blocking advisory lock around every active lifecycle/budget transition, row-level leases/heartbeats, config/run Admin Domain Services, and real PostgreSQL tests/runbook. Heartbeats contend on the same lock, but there are at most two slots and each transaction is database-only/short; the five-attempt/safety policy fails closed. Maintenance cost is bounded because all durable meaning stays on one existing row and Provider/application policies remain modular.

The benefit is proportionate: recoverable work, exact cost/provenance, safe cancellation/late-response fencing, global concurrency 2, auditable human/config mutations and optional-AI degradation are required business/data correctness. A third table, distributed queue, scheduler service or generic workflow framework would add more complexity without satisfying a missing invariant.

Complexity increases from an intentionally non-operational Phase B seam to one approved lifecycle/Worker and one versioned architecture-profile successor, but stays within the accepted two-table/one-checker architecture. Serializing heartbeat on the existing key is simpler and safer than adding a lease counter, second lock key or coordination table, and the replacement inventory removes every temporary/dual path.

## 23. Exact future implementation mutation allowlist

This is the closed mutation authority for a later, separately approved Phase C implementation task. It does not authorize implementation now. Every path not listed as modify, delete or add is immutable; expansion is `NEEDS_OWNER_DECISION`.

### 23.1 Exact accepted-tree literal and semantic consumer rescan

A literal identifier/path rescan at exact accepted tree `cc5715f4a9eb07293bf932cfbd822bfa6bf14a45` found these direct PC-M01/PC-M02/PC-M05 definitions or consumers:

| Existing path | Direct dependency found | Exact future disposition |
|---|---|---|
| `src/ai/core/contracts.ts` | defines `ExecuteClaimedTextAttemptCommand`, `AiAttemptResult` and `AiClaimedExecutionService`; imports `ConstructedClaimedRunV1` | **MODIFY**: delete the three V1 contracts/import and add only the V2 pre-dispatch/evidence-complete contracts; preserve the opaque request-stage method signatures consumed by application definitions |
| `src/ai/core/orchestrator.ts` | defines `createAiClaimedExecutionServiceV1` and consumes/drops V1 attempt evidence | **MODIFY**: delete V1 factory/result path; implement CR-01–CR-12 → advisory/fenced dispatch callback → one adapter call → V2 evidence; retain one generic request invocation path with no Synthetic branch |
| `src/ai/internal/claimed-run-authority.ts` | defines `ConstructedClaimedRunV1`/`constructClaimedRunV1` | **MODIFY**: delete both V1 symbols and replace with pre-dispatch V2 owner/token/version authority |
| `src/ai/internal/worker-entry.ts` | re-exports `AiClaimedExecutionService` | **MODIFY**: remove V1 re-export and expose only the narrow Phase C Worker contract/factory |
| `src/ai/core/claimed-execution.integration.test.ts` | imports both V1 factories and constructs marked V1 rows | **REPLACE IN PLACE**: same path becomes the V2 pre-dispatch/marker/no-call/evidence-retention contract suite |
| `src/ai/applications/draft-assistance/composition.ts` | defines `createPhaseBAvailabilityServiceV1` and supplies `durableEnqueueAvailable=false` | **MODIFY**: delete Phase B factory/flag; add separate availability-only PGlite and durable PostgreSQL Phase C factories |
| `src/ai/provider-neutral-foundation.integration.test.ts` | imports `createPhaseBAvailabilityServiceV1` and asserts Phase B `integration_not_ready` | **REPLACE IN PLACE**: same path proves Phase C PGlite degradation, PostgreSQL durable request seam, empty Production Provider/Prompt and no synchronous call |
| `src/ai/testing/synthetic-application/synthetic-application.test.ts` | directly constructs the orchestrator with `durableEnqueueAvailable=false` | **MODIFY IN PLACE**: remove the deleted flag and prove the sole accepted Synthetic definition delegates to its transaction-bound durable scope, including exact-replay and new-run config/commit paths |
| `src/server/ai/phase-b-composition.ts` | defines sole Phase B root and `createPhaseBServerAiAvailabilityV1` | **DELETE** after callers move; no alias, re-export or compatibility file |
| `scripts/verify-ai-architecture.ts` | pins V3.1 raw/integrity hashes, Phase B root/factory and V3.1 proofs | **MODIFY** into the sole V4.0 checker described in Sections 19.4/23.5 and the semantic/type gate below; no second script |
| `test-fixtures/ai-architecture/graph-faults.v3_1.json` | current Phase B profile/root/probe authority | **PRESERVE BYTE-UNCHANGED** as historical evidence; add the standalone V4.0 successor and remove V3.1 from checker runtime inputs |

That 11-path literal result is retained exactly; it is not treated as semantic closure. A separate accepted-tree Synthetic definition/scope/type/application-contract scan establishes the following complete additional dispositions.

#### 23.1.1 Synthetic single-authority semantic owners

| Existing path | Semantic role | Exact future disposition |
|---|---|---|
| `src/ai/testing/synthetic-application/definition.ts` | sole accepted `SyntheticDefinitionV1` / `createSyntheticDefinitionV1` and owner of five hard-coded request failures | **MODIFY IN PLACE** exactly as Section 23.2: retain the definition and replace only its five request closures with delegation to `input.scope` |
| `src/ai/testing/synthetic-application/read-scopes.ts` | sole private Synthetic read/transaction scope and factory; currently exposes only authorization/reservation | **MODIFY IN PLACE** exactly as Section 23.2: extend the existing operations/scope/factory with the closed five durable request operations |
| `src/ai/testing/synthetic-application/synthetic-application.test.ts` | sole executable proof of the real accepted Synthetic definition | **MODIFY IN PLACE** as above; no inline definition, copied binder, monkey patch or second scope |
| `test-fixtures/ai-types/read-scope/positive.ts` | constructs the exact Synthetic transaction scope for the positive compiler gate | **MODIFY IN PLACE**: require and access every corrected operation on the scope created by `withSyntheticCaseTransactionScope` |
| `test-fixtures/ai-types/read-scope/mode-mismatch.negative.ts` | proves the Synthetic observation scope cannot be consumed as a Draft availability scope | **PRESERVE UNCHANGED**; it must continue failing with `TS2345` |

The remaining Synthetic application implementation paths — `association.ts`, `context.ts` and `output.ts` — do not construct request operations and are **PRESERVE UNCHANGED**. No second application definition, request binder, scope, factory, checker or runtime is authorized anywhere.

#### 23.1.2 Generic application contract and real Draft comparison paths

| Existing path | Scan result | Exact future disposition |
|---|---|---|
| `src/ai/applications/contracts.ts` | generic `AiApplicationDefinition`/binder/scope relationships already express one request scope | **PRESERVE UNCHANGED**; no Synthetic-specific method or authority is added |
| `src/ai/core/contracts.ts` | owns the opaque request-stage operation signatures used by both Draft and Synthetic binders | **MODIFY only for already-authorized PC-M01/PC-M02 claimed-execution replacement**; preserve `findReplay`, feature/config read, confirm and commit request-stage signatures |
| `src/ai/core/orchestrator.ts` | invokes those five opaque operations | **MODIFY only as already authorized**; retain one application-neutral request path and no Synthetic dispatch |
| `src/ai/registry/application-registry.ts` | preserves the one definition/binder selected by application key | **PRESERVE UNCHANGED** |
| `src/ai/registry/production-use-cases.ts` | real Draft binder already delegates transaction-bound replay/config/commit operations and is the comparison proof, not a Synthetic authority | **PRESERVE UNCHANGED** |
| `src/ai/applications/draft-assistance/read-scopes.ts` | real Draft transaction-scope pattern and separately authorized PostgreSQL operation seam | **MODIFY only as already listed in Section 23.2**; it does not implement or export the Synthetic scope |
| `src/ai/applications/draft-assistance/read-scopes.type.test.ts` | Draft-only capability non-interchangeability proof | **PRESERVE UNCHANGED** |
| `scripts/verify-ai-architecture.ts` | sole accepted type-fixture compiler and future sole V4 semantic gate | **MODIFY** as already authorized; it must compile the corrected positive fixture and all preserved negative fixtures and run the V4 probes below |

#### 23.1.3 Complete read-scope fixture/compiler disposition

Exactly one fixture source changes: `test-fixtures/ai-types/read-scope/positive.ts`. The following sources/configurations remain byte-unchanged and continue under the sole checker:

- `common-authority.negative.ts` → expected `TS2339`;
- `execute-authority.negative.ts` → expected `TS2339`;
- `external-fabrication.negative.ts` → expected `TS2741`;
- `mode-mismatch.negative.ts` → expected `TS2345`;
- `tsconfig.positive.json`;
- `tsconfig.common-authority-negative.json`;
- `tsconfig.execute-authority-negative.json`;
- `tsconfig.external-fabrication-negative.json`; and
- `tsconfig.mode-mismatch-negative.json`.

The positive fixture proves construction only through the existing `withSyntheticCaseTransactionScope` factory and exact access to all six transaction operations. It may not use `declare`, `any`, `unknown` casts, `@ts-` suppression, object fabrication or a copied scope. The negative fixtures retain non-disclosure, no raw execute, no external fabrication and mode-isolation closure; they receive no durable operation.

The same rescan inspected `src/ai/providers/text-provider.ts` and `src/ai/testing/fake-text-provider.ts`. Their Provider result already contains the safe optional HTTP/code/request/model/usage evidence and both are **PRESERVE UNCHANGED**. The V1 loss remains in core normalization.

These tables close both literal and semantic inventory. The only newly authorized existing-file mutations beyond V1.1 are `definition.ts`, `read-scopes.ts` and the positive type fixture; the Synthetic test and sole checker were already authorized and now have exact obligations. No other accepted-tree file needs mutation to compile, execute or prove the mandated Synthetic seam.
### 23.2 Existing files authorized to modify or delete

| Path | Operation and exact ownership |
|---|---|
| `src/ai/core/contracts.ts` | modify as Section 23.1; retain enqueue/application contracts |
| `src/ai/core/orchestrator.ts` | modify claimed execution and remove the readiness flag; retain Provider-neutral orchestration |
| `src/ai/errors.ts` | modify sole tuple with exactly `pricing_stale` and `run_cost_limit_exceeded` |
| `src/ai/internal/claimed-run-authority.ts` | modify to V2 pre-dispatch authority |
| `src/ai/internal/worker-entry.ts` | modify to narrow Worker factory boundary |
| `src/ai/core/claimed-execution.integration.test.ts` | replace contents in place with V2 contract tests |
| `src/ai/applications/draft-assistance/read-scopes.ts` | modify to implement closed PostgreSQL transaction operations, never generic DB write authority |
| `src/ai/applications/draft-assistance/facade.ts` | modify to add governed request; preserve parse/call/translate boundary |
| `src/ai/applications/draft-assistance/composition.ts` | modify to replace Phase B factory with exact PGlite-availability/PostgreSQL-durable factories |
| `src/ai/applications/draft-assistance/context-integrity.ts` | modify to consume only the 71-code profile successor |
| `src/ai/applications/draft-assistance/context-integrity.test.ts` | modify exact profile/error closure |
| `src/ai/provider-neutral-foundation.integration.test.ts` | replace Phase B assertions in place as Section 23.1 |
| `src/ai/testing/synthetic-application/synthetic-application.test.ts` | modify as Section 23.1 |
| `src/ai/testing/synthetic-application/definition.ts` | modify the sole accepted definition in place; request binder delegates all five durable operations to `input.scope` and availability remains fail-closed |
| `src/ai/testing/synthetic-application/read-scopes.ts` | modify the one private transaction scope/factory in place with the exact six-operation surface below |
| `test-fixtures/ai-types/read-scope/positive.ts` | modify the existing positive compiler fixture to construct and inspect the corrected exact Synthetic scope |
| `src/ai/config/model-config-repository.ts` | modify locked exact-row/config-set reads; still no write methods |
| `src/ai/config/model-config-resolver.ts` | modify locked-row/pricing/Prompt revalidation |
| `src/ai/telemetry.ts` | modify closed Phase C operational enums, including non-authoritative heartbeat lock-busy/renewal-unavailable |
| `src/ai/index.ts` | modify only safe server/domain exports; no Worker/repository export |
| `scripts/verify-ai-architecture.ts` | modify as the sole V4.0 checker |
| `package.json` | modify scripts only: add `ai:runs:process`; no dependency field change |
| `src/server/ai/phase-b-composition.ts` | **delete**; successor is the exact path below |

No rename or move is authorized for an existing test. Deletion is authorized only for the Phase B composition root.

#### 23.2.1 Exact Synthetic transaction-scope replacement contract

`src/ai/testing/synthetic-application/read-scopes.ts` retains the existing exported names `SyntheticCaseOperationsV1`, `SyntheticCaseTransactionScope` and `withSyntheticCaseTransactionScope`. It adds `SyntheticAuthorizedReplayLookupV1` in that same file with exactly `idempotencyKey`, `requestedByPrincipalId`, `association: DurableApplicationAssociationV1`, `fingerprintVersion: 1`, and `fingerprint`. `SyntheticCaseOperationsV1` then has exactly these methods and no generic query/execute/update/repository handle:

~~~ts
authorizeReserveAndSnapshotCase(input: SyntheticObservationInputV1):
  Promise<AiServiceResult<SyntheticObservationV1>>;
findReplay(input: SyntheticAuthorizedReplayLookupV1):
  Promise<AiServiceResult<ReplayLookupResultV1>>;
readFeatureState(): Promise<AiServiceResult<AiFeatureStateReadV1>>;
readConfigResolution(): Promise<AiServiceResult<AiModelConfigResolutionReadV1>>;
confirmResolvedConfiguration(input: {
  readonly modelConfigId: string;
  readonly expectedRecordVersion: number;
}): Promise<AiServiceResult<AiModelConfigRow>>;
commitPreparedRun(input: PreparedCoreRunV1):
  Promise<AiServiceResult<PreparedRunCommitResultV1>>;
~~~

`SyntheticCaseTransactionScope` continues to extend the branded private read state and exactly that operations interface. `withSyntheticCaseTransactionScope` remains its only constructor and copies each of the six named functions explicitly; object spread, generic database access, optional operations and a second factory are forbidden. `SyntheticObservationReadScope` and `withSyntheticObservationScope` remain unchanged and expose none of those six operations. This preserves read-only/availability non-disclosure and makes durable authority transaction-bound and test-only.

#### 23.2.2 Exact accepted-definition delegation

`src/ai/testing/synthetic-application/definition.ts` retains the one `SyntheticDefinitionV1` and one `createSyntheticDefinitionV1`. Only the five request-context closures change. After the existing authorization, durable association, context, fingerprint and `PreparedRequestIdentityV1` construction succeed, the returned opaque request context delegates exactly:

~~~ts
findReplay: () => input.scope.findReplay({
  idempotencyKey: requestIdentity.idempotencyKey,
  requestedByPrincipalId: requestIdentity.requestedByPrincipalId,
  association: durable.value,
  fingerprintVersion: requestIdentity.fingerprintVersion,
  fingerprint: requestIdentity.fingerprint,
}),
readFeatureState: () => input.scope.readFeatureState(),
readConfigResolution: () => input.scope.readConfigResolution(),
confirmResolvedConfiguration: (configuration) =>
  input.scope.confirmResolvedConfiguration(configuration),
commitPreparedRun: (preparedRun) => input.scope.commitPreparedRun(preparedRun),
~~~

There is no repository construction, callback replacement, mode switch or hard-coded request-side `integration_not_ready` in that binder. The availability binder keeps its current fail-closed `integration_not_ready` feature/config reads and can be bound only with `SyntheticObservationReadScope`; availability can neither discover nor invoke the durable methods.

#### 23.2.3 Exact Synthetic proof ownership

The existing `synthetic-application.test.ts` must exercise the registry binding returned from the real `createSyntheticDefinitionV1`, under scopes constructed only by `withSyntheticCaseTransactionScope`:

1. a new-run case records the ordered durable callback subsequence `findReplay(no_match) → readFeatureState(enabled) → readConfigResolution(one enabled default) → confirmResolvedConfiguration(exact id/version) → commitPreparedRun`, and proves the returned committed summary came from that injected commit callback;
2. an exact-replay case records `findReplay(exact_replay)` and proves feature/config/confirm/commit were not invoked;
3. the existing availability case remains fail-closed through `withSyntheticObservationScope` and cannot receive or call a durable operation; and
4. the test imports no Production composition root/repository and does not declare, copy, fabricate or monkey-patch an `AiApplicationDefinition`, request binder, opaque invocation or transaction scope.

The positive type fixture constructs the same exact scope factory and passes the resulting scope to a typed helper requiring all six methods. The four negative fixture sources and all five fixture tsconfigs remain unchanged with their exact expected compiler failures from Section 23.1.3.

The separately authorized `accepted-draft-atomicity-harness.ts` remains only the conspicuous Synthetic **owning target/run/Audit mutation** proof from Section 17. It must not import `synthetic-application/definition.ts`, `synthetic-application/read-scopes.ts`, `createOpaqueRequestInvocation` or the Synthetic registry/test binder, and it must not implement replay/config/commit. Thus it cannot become a second Synthetic request authority.

### 23.3 Exact new implementation and test paths

| New path | Exact owner |
|---|---|
| `src/ai/applications/draft-assistance/context-integrity-profile.v3_0.json` | sole current 71-code context profile; V2.0 remains immutable history, not runtime input |
| `src/ai/config/model-config-service.ts` | Admin-only governed config writer |
| `src/ai/config/model-config-service.integration.test.ts` | real PostgreSQL config/default/Audit/concurrency proof |
| `src/ai/runs/contracts.ts` | closed run/read/claim/transition/evidence DTOs and ephemeral lock outcomes |
| `src/ai/runs/attempt-evidence.ts` | strict normalization, JCS fingerprint and cancelled enrichment |
| `src/ai/runs/attempt-evidence.test.ts` | pure normalization/privacy/fingerprint proof |
| `src/ai/runs/pricing-policy.ts` | compiled immutable pricing snapshots/formula; billable Production registry empty |
| `src/ai/runs/pricing-policy.test.ts` | exact arithmetic/bounds/staleness proof |
| `src/ai/runs/retry-policy.ts` | exact backoff/manual allowlist/heartbeat retry-safety pure policy |
| `src/ai/runs/retry-policy.test.ts` | exact attempt, backoff, lock-retry and safety-window proof |
| `src/ai/runs/repository.ts` | PostgreSQL advisory/row locks and explicit field/transition assignments |
| `src/ai/runs/repository.integration.test.ts` | real PostgreSQL field, idempotency, budget, CAS and lock-order proof |
| `src/ai/runs/service.ts` | enqueue/read/cancel/manual retry/disposition Domain Service |
| `src/ai/runs/service.integration.test.ts` | authorization, Audit atomicity, replay, cancel/retry/disposition proof |
| `src/ai/runs/worker.ts` | two-slot claim/recover/heartbeat/dispatch/settlement supervisor |
| `src/ai/runs/worker.integration.test.ts` | real PostgreSQL lifecycle/response-loss/cost/fence proof |
| `src/ai/runs/heartbeat-serialization.integration.test.ts` | exact H-01 R1/R2/R3 multi-connection barrier |
| `src/ai/runs/worker-shutdown.integration.test.ts` | drain, lock-busy, abort, exit and restart/recovery proof |
| `src/ai/testing/accepted-draft-atomicity-harness.ts` | test-only conspicuous Synthetic target/run/Audit owning mutation, excluded from Production graph and forbidden from Synthetic definition/scope/binder imports |
| `src/ai/testing/accepted-draft-atomicity-harness.integration.test.ts` | target/run/Audit all-or-none proof |
| `src/server/ai/phase-c-composition.ts` | the only server/Production composition root |
| `src/server/ai/phase-c-composition.test.ts` | exact PGlite/PostgreSQL branch, empty-registry and no-fake root proof |
| `scripts/process-ai-runs.ts` | signal-aware CLI; imports only the Worker factory from the sole root |
| `test-fixtures/ai-architecture/graph-faults.phase-c.v4_0.json` | complete standalone current Phase C architecture profile/fixture |
| `docs/review-evidence/phase-1b-stage4a-phase-c-implementation-v1/` | later implementation evidence only; absent from this design Candidate |

There is no wildcard authorization for an existing file. Test cases may be added only inside the exact test paths above. Any additional Product/runtime/test/script/fixture path requires `NEEDS_OWNER_DECISION`.

### 23.4 Sole composition root replacement

Required final tree:

~~~text
required present: src/server/ai/phase-c-composition.ts
required absent:  src/server/ai/phase-b-composition.ts
server root count under src/server/ai/: exactly 1
~~~

The Phase C root has exactly two named exports: `createPhaseCServerAiServiceV1` and `createPhaseCAiRunWorkerV1`. `scripts/process-ai-runs.ts` has the only permitted Production incoming runtime edge and imports only the Worker export. The service export is an explicit manifest/build root until Phase E separately authorizes a business caller.

Its exact import set is: side-effect `server-only`; `env` from `@/config/env`; `databaseConnection` from `@/db/client`; type `TrustedPhaseBEnvironmentV1`; `createPhaseCAvailabilityServiceV1` and `createPhaseCDurableDraftAssistanceServiceV1` from the Draft-assistance composition; `createAiRunWorkerV1` from `@/ai/internal/worker-entry`; `productionTextProviderRegistryV1`; `productionPromptLoaderV1`; and `productionPricingPolicyRegistryV1`. No other import is allowed. The root constructs one frozen trusted environment projection and uses exhaustive `databaseConnection.kind` branches: PGlite can construct only availability/manual-degradation and Worker creation throws before repository construction; PostgreSQL can construct the durable service/Worker. It opens no second connection/factory/cache.

The deleted Phase B file/symbols are forbidden in executable/current V4 source, tests, aliases and re-exports. Their literal historical definitions inside the byte-immutable `graph-faults.v3_1.json` are the only exception; the checker may inventory that file but may not parse/read it as current authority.

### 23.5 V4.0 profile, inherited gates and new probes

The V4.0 profile is the single current input defined in Section 19.4. The implementation must publish the sorted inherited V3.1 case/probe ID sets and their SHA-256 in the V4 manifest, then add these closed Phase C failures without deleting any inherited one:

- physically reintroduced/currently imported `src/server/ai/phase-b-composition.ts` or either deleted Phase B factory, excluding immutable unconsumed V3.1 historical fixture text;
- missing or second `src/server/ai/phase-c-composition.ts`, shadow/alias/symlink/hard-link/case/canonical collision;
- any incoming edge to the root except the exact CLI Worker edge;
- CLI direct import of protected repository/Provider/Prompt/database code instead of the root;
- PGlite or in-memory durable run/Worker repository;
- Production import/reachability of fake/Synthetic code;
- non-empty Production Provider registry or Prompt manifest;
- Phase D composition/adapter/SDK/network/credential/endpoint before authorization;
- public/client/business reachability to root, Worker, runs/config/pricing/Prompt/Provider/database;
- V3.1/V3.0/V2.2 co-consumption, V4 hash/integrity mismatch, selector fallback, second checker or compatibility collector;
- missing/partial/stale-commit/mixed-profile proof artifact, manifest hash mismatch or evidence-to-Production import; and
- heartbeat repository path that locks/updates a run before the exact advisory acquisition.

The sole V4 checker also owns these exact Synthetic semantic assertions over the actual Candidate:

- exactly one exported `createSyntheticDefinitionV1`, at `src/ai/testing/synthetic-application/definition.ts`, and exactly one `withSyntheticCaseTransactionScope`, at `src/ai/testing/synthetic-application/read-scopes.ts`;
- the definition's request binder delegates exactly `findReplay`, `readFeatureState`, `readConfigResolution`, `confirmResolvedConfiguration` and `commitPreparedRun` to `input.scope`, while the availability binder retains no durable edge and remains fail-closed;
- the transaction scope exposes exactly the six Section 23.2.1 methods and its factory explicitly assigns all six; the observation scope exposes zero of them;
- `synthetic-application.test.ts` imports and exercises the accepted definition and scope factory and contains no second application-definition/opaque-request-invocation construction, copied binder, scope fabrication or monkey patch;
- the positive fixture compiles and structurally requires every six-operation scope member, while the four unchanged negative fixtures fail with their exact expected codes; and
- `accepted-draft-atomicity-harness.ts` has no Synthetic definition/scope/binder edge, and no Production/server/public/client node reaches any Synthetic path.

V4.0 adds six named mutation probes to the one mutation-probe authority: `phase-c-synthetic-request-fallback-restored`, `phase-c-synthetic-scope-operation-omitted`, `phase-c-synthetic-observation-write-authority`, `phase-c-synthetic-second-definition-or-binder`, `phase-c-synthetic-test-scope-fabrication`, and `phase-c-synthetic-atomicity-harness-binder-edge`. Each injected mutation must make the sole checker exit nonzero with its profile-declared reason. Renaming, skipping, coalescing, expected-pass treatment or moving one of these probes to a second script/profile is a gate failure. Their sorted ID-set hash joins the inherited/new mutation-probe-set hashes in the current V4 manifest.

The profile preserves exact physical enumeration/injectivity, source-state handling, generated-resource lifecycle, TypeScript static acquisition/origin deny language, no public/client edge, evidence isolation and all inherited mutation probes. The checker must fail closed on zero/multiple class, unresolved/ambiguous edge, unmanifested executable/resource, early future root or any weakened expected-failure result.

### 23.6 Files explicitly immutable

- `drizzle/0020_phase1b_ai_foundation.sql`, all migrations/snapshots/journal and `src/db/schema/ai.ts`;
- `test-fixtures/ai-architecture/graph-faults.v3_1.json` and all accepted Phase B proof artifacts/reviews;
- `src/ai/providers/text-provider.ts`, `src/ai/testing/fake-text-provider.ts`, Production Provider registry contents, Production Prompt manifest/bundle and Prompt bodies;
- `src/ai/config/trusted-phase-b-environment.ts`, `src/config/env.ts` and `.env.example`;
- the four `test-fixtures/ai-types/read-scope/*.negative.ts` files and all five `tsconfig.*.json` files named in Section 23.1.3;
- Product/Content/SEO/Public/CRM/Inquiry/Asset/Upload implementations;
- package lock/dependencies and Product Import default behavior; and
- failed V1.0 and V1.1 Designs/evidence plus both independent FAIL reviews/evidence.

### 23.7 Dependency order

1. Add pure attempt/retry/pricing contracts, the exact two error tuples and the 71-code profile; replace the V1 claimed/result contracts and in-place claimed test while preserving the opaque request-stage operation signatures.
2. In one ordinary implementation commit, add the standalone V4.0 profile; update the sole checker; extend the existing Synthetic scope; delegate from the existing Synthetic definition; update the existing Synthetic test and positive type fixture; and run all positive/negative compiler plus six Synthetic mutation probes. V3.1 and the negative fixtures/configs remain byte-unchanged. This step introduces no second definition/binder/scope/checker and leaves no intermediate hard-coded request fallback.
3. Add the PostgreSQL repository and exact lock-order/idempotency/budget tests, including the unchanged H-01 barrier before any Worker composition.
4. Add config writer/read service and required-Audit/default-switch tests.
5. Wire governed Draft enqueue/replay/target/config locks, request facade/composition and the in-place provider-neutral successor test; keep the Worker root absent. The already-correct Synthetic definition continues to receive only injected test transaction operations and gains no Production edge.
6. Add advisory-first marker/heartbeat/settlement/recovery, cancellation/manual retry/read/disposition and the separate accepted-Draft atomicity harness. The harness must pass the no-Synthetic-binder-edge probe.
7. Delete `src/server/ai/phase-b-composition.ts` in the same commit that adds the sole Phase C root and moves checker/root consumers; no commit may contain two callable roots or a compatibility export.
8. Add the two-slot Worker, CLI and shutdown tests; Production registries stay empty and no real call is possible.
9. Run the V4 source/typegen/bundle lifecycle, real PostgreSQL/contention/query-plan/resource proofs and create the six exact architecture artifacts/manifest for independent implementation review.

The implementation must change only the exact Section 23.2/23.3 paths. If any step cannot compile or satisfy its mandated proof without another existing/new file mutation, it must stop as `NEEDS_OWNER_DECISION`; a test-only inline definition/binder, monkey patch, copied request operations or compatibility export is never a permitted workaround.
Intermediate implementation commits may be ordinary local commits, but none is a checkpoint/design/phase acceptance artifact and none may expose dual authority, Production fake/in-memory generation, Phase D code or an out-of-allowlist mutation.
## 24. Acceptance matrix and reviewer proof obligations

| Risk/requirement | Required implementation evidence |
|---|---|
| exact relational authority | ordered 21/96 Migration/Drizzle/ledger equality plus unchanged 40 Checks, 11 FKs and 18 explicit indexes |
| five statuses only | transition matrix positives/negatives; `dead`/`succeeded` rejected |
| idempotency/replay | same/different fingerprint concurrent PostgreSQL cases and one Audit |
| target/config lock | stale target/default switch/Audit failure tests; immutable snapshots/hash recomputation |
| direct `ai_runs` Worker | V4 scan proves no queue/Outbox/second history/in-memory/PGlite durable Production repository and exactly one Phase C root |
| replacement closure | reproduce both the literal 11-path and full semantic Synthetic/application/type-fixture sets; every change-required path is in Section 23.2; old executable/current symbols/root absent; V3.1 and negative fixtures/configs immutable; no out-of-allowlist path |
| Synthetic single authority | the real `createSyntheticDefinitionV1` delegates all five request operations through the exact six-operation `SyntheticCaseTransactionScope`; new-run plus exact-replay tests exercise that definition; availability has zero durable authority; no inline/duplicate definition/binder/scope/harness authority |
| Synthetic type/architecture gate | corrected positive fixture compiles, four unchanged negatives fail with exact codes, six named V4 mutation probes fail closed, and the current proof/manifest bind every relevant path/hash/outcome |
| dispatch truth | unresolved heartbeat or advisory/marker failure makes zero calls; CR-01–CR-12 precede marker; post-marker crash is response loss |
| H-01 concurrency | exact R1/R2/R3 barrier in both advisory-owner orders; no commit order yields three committed unexpired processing leases |
| heartbeat/fence | advisory-first, five attempts/one-second delay/ten-second database safety window, no mutation on busy, no renewal after expiry, cancel/result races |
| retry/backoff/exhaustion | exact formula, maximum attempts, same-row/same-provider snapshots, manual allowlist |
| cancellation/late response | candidate always null; exact replay/different fingerprint; conservative-to-strong accounting only |
| normalized evidence | every safe success/failure field retained; raw payload/header/exception negative corpus |
| budget/cost | exact formula, reservation, hard-limit races, missing usage, warning crossing, overrun truth |
| authorization | full role matrix, entity-type-first non-disclosure, unrelated target/run negatives |
| required Audit | config/enqueue/cancel/manual retry/disposition/acceptance harness rolls back on Audit failure |
| Draft/public boundary | no factual/Publish/Index/Route/rights/public writer reachable; public reads/regressions unchanged |
| privacy | context/JSON/Audit/telemetry prohibited-data recursive negatives; no CRM/Inquiry/private Asset relation |
| V4 architecture authority | one checker/profile/manifest, raw+integrity+checker/proof hashes, inherited+new probes, no V3 runtime input/evidence import |
| modular monolith/bundle | sole `phase-c-composition.ts`, obsolete root absent, PostgreSQL Worker only, no public/client/Refine reachability |
| operations | graceful/forced shutdown under advisory contention, disabled config/global stop, no late renewal, expired recovery, restart runbook |
| manual degradation | PGlite, missing config/Prompt/provider, disabled feature and Worker outage preserve editor/public behavior |
| frozen scope | empty Production Provider/Prompt registries; no Phase D–G, dependency, Migration, external action |

The Fresh independent **design re-reviewer** must verify exact Candidate SHA/parent/base/branch/clean state; preserve the already-closed H-01 mechanism and independently check its affected invariants; reproduce the literal 11-path scan plus the semantic Synthetic definition/scope/type-fixture/application-contract scan; verify every change-required path is in the closed allowlist and every unchanged fixture/consumer has an exact disposition; reproduce 21/96 plus 40/11/18 structure; challenge both advisory-owner commit orders; verify the one accepted Synthetic definition/scope contract, V4 hash/probe/proof contract, sole-root rule and all preserved boundaries; and report Blocker/High/Medium/Low plus External Validation separately. Real PostgreSQL execution remains a future implementation proof and must not be misreported as having run in this docs-only remediation. Developer checks cannot self-accept Phase C.

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

The accepted Schema and ADRs are sufficient; no Owner/ADR/Schema/dependency decision is presently required. This corrected V1.2 Candidate defines one implementable lifecycle/Worker authority, exact field/contract ownership, every transaction/fence/failure path, a semantically closed replacement allowlist/Synthetic seam/V4 architecture authority, proportional proof obligations and rollback. It is not accepted and does not authorize implementation by itself.

The only next gate is a **Fresh independent Phase C Exact Design Re-review by a different reviewer task**. This author does not self-review, implement, create the reviewer task, merge, checkpoint, Push, Deploy, Publish, Index or advance to Phase D–G.

## 26. Remediation closure crosswalk

### 26.1 H-01 closure and affected invariants

| Required closure | Corrected authority | Proof obligation |
|---|---|---|
| heartbeat serializes with recovery/count/admission | Sections 1.1, 5, 6.1, 8.2–8.4, 12.2 | Section 20.2 cases 4–6 and Section 24 H-01 row |
| exact non-blocking busy behavior | Sections 6.1, 8.1, 8.3–8.4 | zero row access/mutation, five attempts, one-second delay, database ten-second window, no dispatch/late renewal |
| cancellation/settlement/manual/late/shutdown order | Sections 6, 8.4, 9.2–9.4, 10, 21 | heartbeat-cancel/result races, cost fence, shutdown contention and recovery |
| deadlock/resource/complexity | Sections 6.1, 20.3, 22 | one advisory root, no run→advisory path, no idle transaction/residual lock, two-slot pressure evidence |

Related invariants re-evaluated: global concurrency two, advisory-serialized budget totals, same-row lease token/version fencing, marker-before-call, conservative response loss, candidate-null cancellation, automatic/manual retry ceilings and restart recovery remain compatible. Heartbeat changes no budget field; it joins the lock only to make its active-membership renewal visible to admission.

### 26.2 M-01 Attempt 2 closure and affected invariants

| Attempt-2 root requirement | Corrected authority | Proof obligation |
|---|---|---|
| literal inventory retained, semantic inventory added | Sections 23.1–23.1.3 | reproduce the exact 11-path literal set plus all Synthetic definition/scope/test/type-fixture/generic-contract paths and dispositions |
| accepted definition receives durable seam | Sections 14, 22.2/22.4 and 23.2.1–23.2.3 | the real `createSyntheticDefinitionV1` delegates exact replay/feature/config/confirm/commit operations; no request-side fallback |
| one transaction-bound scope | Sections 23.2.1–23.2.2 | existing private factory constructs exact six-operation scope; observation scope has zero durable authority |
| compile/test closure | Sections 23.1.3, 23.2.3 and 24 | positive fixture compiles with all six operations; four unchanged negatives keep exact failures; real accepted definition passes new-run and replay cases |
| atomicity harness remains separate | Sections 17 and 23.2.3/23.5 | no definition/scope/binder import and no replay/config/commit implementation in the target/run/Audit harness |
| one root, no compatibility | Sections 19.3, 22.4, 23.2/23.4/23.7 | Phase B file/symbol absence, exactly one Phase C root and one CLI incoming edge |
| one versioned current architecture authority | Sections 19.4 and 23.5 | standalone V4.0 raw/integrity hashes, one checker, six proof/manifest paths, six named Synthetic probes and V3.1 non-current |
| no out-of-allowlist invention | Sections 23.2–23.3/23.7 and 24 | exact implementation path diff equals the closed allowlist; no inline definition/binder, monkey patch, copied scope, second checker/profile/root or unlisted mutation |

The Attempt-2 future allowlist names every existing mutation/deletion and every new Product/test/script/fixture path needed to compile and prove the mandated Synthetic seam. The three newly authorized existing-file mutations are the accepted definition, its read scope and the positive type fixture; the already-authorized Synthetic test/checker now have exact semantic obligations. No material Owner/ADR/Schema/Migration/dependency decision is required.

Related invariants rechecked: PC-M01/PC-M02 claimed/evidence replacement remains application-neutral; PC-M05 now closes both Production Draft composition and the accepted Synthetic test seam; PC-M03/PC-M04/PC-M06 are unchanged. The type gate still prevents common/read-only authority escalation, raw execute, external scope fabrication and Draft/Synthetic mode interchange. Production never imports Synthetic code.
### 26.3 Previously passing boundaries preserved closed

- H-01 remains one advisory-first lifecycle domain with no run-before-advisory path, five total non-blocking attempts, exact one-second spacing, a ten-second database safety window, global concurrency two, no-mutation lock-busy behavior, both R1/R2/R3 owner orders and future EV-01/EV-02 proof. Sections 5–12 and the H-01 core of Sections 20–21 are unchanged from V1.1.
- The V1.1 full-review PASS boundaries for state transitions/retry/cancellation/late evidence, cost/pricing/budget/evidence, authorization/Audit/privacy/public truth, Complexity Approval/operations/rollback and the root/V4 contracts remain closed. The sole prior full-review failure was M-01 semantic implementation readiness, corrected here without altering those mechanisms.
- Exact 21/96 field ledger, 40 Checks, 11 FKs and 18 explicit secondary/unique indexes; no Schema/Migration/ADR/dependency.
- Exactly five statuses (`pending`, `processing`, `draft_ready`, `failed`, `cancelled`); retry remains orthogonal and there is no `dead`/`succeeded` state.
- One direct PostgreSQL `ai_runs` Worker; no queue, Outbox reuse, second history, PGlite/in-memory Production durable runtime, fallback or dual authority.
- PC-M01 pre-dispatch truth, PC-M02 complete safe evidence, PC-M03 exact two error additions and PC-M06 trusted commit composer remain replacement-only.
- Durable idempotency, target/config snapshot locks, budget/cost truth, cancellation late accounting, record-scoped authorization and required-Audit atomicity remain unchanged except for joining heartbeat to the same lock order.
- AI remains Draft-only; no factual inference, real candidate application, Publish, Index, Route/Redirect/rights/public-truth writer. Public reads remain approved-revision-only and reuse real-Product eligibility.
- Inquiry/CRM/PII/private file/Object Key/credential/raw Provider/RAG/vision/Customer Service remain excluded; storage/environment/bundle boundaries remain isolated.
- Production Provider registry and Prompt manifest remain exact-empty; fake/Synthetic code stays test-only; Phase D–G and all external operations remain unauthorized.
- C-002 remains a hard Production Ready/deploy/release/launch/formal-import/public-truth block. C-003 preserves `FEATURE_PRODUCT_IMPORT` default false and leaves PF-007 outside Phase C.

### 26.4 External Validation disposition

| ID | Disposition |
|---|---|
| `EV-01` | Mandatory future Phase C implementation evidence on disposable supported PostgreSQL 17/18, including the exact H-01 barrier, all contention/lock observations and scaled query plans. Not executed or claimed by this design remediation. |
| `EV-02` | Mandatory future Phase C fake-adapter two-slot evidence on the 2 vCPU/4 GB-equivalent non-Production envelope, including heartbeat advisory contention and shutdown. Not executed or claimed here. |
| `EV-03` | Real Provider latency/abort/usage/cost/credential/network/Staging/deployment evidence belongs only to separately authorized Phase D/F. It is explicitly not Phase C design or current implementation evidence. |

**Remediation Candidate disposition:** H-01 remains PASS/CLOSED at design level exactly as independently established for V1.1; V1.2 does not redesign or weaken it. M-01 Attempt 2 is addressed by the semantic inventory, exact single-authority Synthetic replacement and closed allowlist above, but only a new Fresh independent reviewer and later Coordinator acceptance can close it. V1.2 does not accept itself, does not authorize implementation and does not unfreeze Phase C implementation.
