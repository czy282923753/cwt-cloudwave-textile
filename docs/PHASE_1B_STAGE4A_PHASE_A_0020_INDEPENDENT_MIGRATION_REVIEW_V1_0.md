# CWT Phase 1B Stage 4A Phase A — `0020` Independent Migration Design Review

- Review status: **PASS**
- Review version: `1.0`
- Reviewed: `2026-08-10` (Asia/Shanghai)
- Reviewer role: independent Migration Reviewer
- Reviewer worktree: `/Users/calvin/.codex/worktrees/900f/CWT（CloudWave Textile）项目`
- Review type: exact-input, read-only Schema/Migration design review

## 1. Exact review object

| Item | Frozen identity |
|---|---|
| Design | `/Users/calvin/.codex/worktrees/7f8f/CWT（CloudWave Textile）项目/docs/PHASE_1B_STAGE4A_PHASE_A_0020_AI_FOUNDATION_SCHEMA_DESIGN_V1_0.md` |
| Required SHA-256 | `db6ae44d3548e2c0c23ab2b95ee3550fefedb93224f878f5a9ab3070898b60a8` |
| Recomputed SHA-256 before review | `db6ae44d3548e2c0c23ab2b95ee3550fefedb93224f878f5a9ab3070898b60a8` |
| Baseline Commit | `31c0e405acfdd0d05200d0fb2531e897a541a2c4` |
| Frozen Tag | `phase-1b-stage3-approved-2026-08-09` |
| Tag resolution | `31c0e405acfdd0d05200d0fb2531e897a541a2c4` |
| Planned Migration | `0020_phase1b_ai_foundation` |

The SHA-256 matched before substantive review. The review therefore proceeded against the fixed v1.0 object. The reviewed file was not modified.

## 2. Authority reconciliation

The current Owner instruction controls the authorization state for this review:

- `PD-04` through `PD-07` DeepSeek Provider evidence remains non-blocking reference material;
- the Owner has accepted that Provider-evidence risk;
- the current state is Architecture Approved / Development Authorized;
- Provider-agnostic design, the four Draft-assistance text use cases, repository Prompt Registry, Draft and human-review boundaries, no fallback, no RAG, no vision, no Customer Service, no customer/Inquiry/private data, and no Production AI budget remain frozen; and
- Provider/API calls, credentials, Deploy, Publish, Index, formal import, and Push remain outside this review.

Accordingly, older status text saying that development was not yet authorized was not treated as a current blocker. The Provider questionnaire was not reopened as a Migration-design gate.

## 3. Conclusion

**PASS.** The exact v1.0 design is sufficiently complete, internally consistent, bounded, and implementable to enter the next gate: generation of an exact `0020_phase1b_ai_foundation` Migration Candidate.

This PASS is limited to the design. It does not approve a not-yet-generated Migration, TypeScript Schema, Domain Service, Worker, Provider adapter, Provider call, Staging execution, or any Production/public-state action. Migration generation may begin in the assigned development session after this callback; this reviewer does not start it.

## 4. Findings by `docs/REVIEW_POLICY.md`

| Classification | Count | Result |
|---|---:|---|
| Blocker | `0` | None. |
| High | `0` | None. |
| Medium | `0` | None meeting the policy. |
| Low | `0` | None recorded. |
| External Validation | `4` groups | Required at the next Candidate gate; these are not design defects. |

No conditional correction is required before Migration Candidate generation. No root cause was split into multiple findings, and no Provider-semantics hypothesis was promoted into a local design defect.

### External Validation required after Candidate generation

1. **Exact DDL and catalog:** verify every column, default, nullability, Check expression, FK action, index predicate/include column, Journal entry, and snapshot against this fixed design on real PostgreSQL 18.4.
2. **Migration paths:** prove Fresh `0000 -> 0020`, Upgrade `0019 -> 0020`, repeat/no-op, forced transactional failure, interruption/resume, preserved historical hashes, and additive rollback compatibility.
3. **Concurrency and fencing:** run the specified multi-connection idempotency, claim, concurrency-2, lease-expiry, dispatch-marker, cancellation/late-response, retry, budget-admission, actual-overrun, default-switch, Audit-rollback, and Draft-acceptance contention scenarios, ending with no residual advisory/row locks or idle-in-transaction sessions.
4. **Real query plans:** run the specified scale fixture, `VACUUM (ANALYZE)`, and default-planner `EXPLAIN (ANALYZE, BUFFERS, SETTINGS, FORMAT JSON)` evidence for configuration resolution, claims, active/expired leases, day/month budget sums, target/requester/Admin history, and idempotency lookup.

These proofs require the generated Candidate and real PostgreSQL. Their current absence is expected by design and was not counted as a finding.

## 5. Review matrix

| Area | Decision | Review result |
|---|---|---|
| Persistent scope | PASS | Exactly two new tables are authorized: `ai_model_config` and `ai_runs`. There is no third queue, attempt, evaluation, budget, Prompt, Draft/Revision, RAG, vision, Customer Service, or private-data authority. |
| Single authority | PASS | `ai_runs` is the one work/lifecycle/provenance/cost/disposition row. Provider logs are non-authoritative; existing Editorial Revision remains content authority; existing Audit remains governed-mutation evidence. No old/new AI path exists to preserve. |
| Configuration fields | PASS | UUID identity; constrained text capability/use case/provider/model; bounded JSON parameters; token/attempt/run-cost ceilings; immutable Prompt identity; disabled-first enable/default state; null-only fallback; optimistic version; actor and timestamp evidence are complete and proportionate. |
| Run fields | PASS | Identity, actor, target/version/hash, immutable configuration and Prompt snapshots, bounded input/attempt/candidate data, lifecycle, lease/retry/cancellation, Provider evidence, tokens/cost, environment/budget, timestamps, disposition/evaluation, and applied Draft/Revision association are all represented. |
| Existing-type compatibility | PASS | Baseline `app_environment` contains `local`, `test`, `staging`, and `production`; the proposed Check can reject Production without changing the enum. No new enum/type is required. |
| Target FKs | PASS | Product and Content localization targets match existing composite primary keys `(id, locale)`. Revision targets use the existing UUID primary key. Nullable target columns plus the target-shape Check make exactly one association legal. |
| Delete policy | PASS | User, configuration, target localization, target Revision, cancellation/evaluation actor, and applied Revision references are `RESTRICT`; no cascade or set-null path can erase run provenance. Existing parent cascade attempts are safely blocked once a referenced localization exists. |
| Configuration uniqueness | PASS | The partial unique `(capability, use_case) WHERE enabled AND is_default` enforces at most one resolvable default while permitting disabled prepared/retired alternatives. |
| Run uniqueness | PASS | Global UUID idempotency uniqueness is the final enqueue contention authority. The partial active-lease-token uniqueness and status/lease shape prevent one active token from identifying multiple runs. No unapproved one-active-run-per-target policy is introduced. |
| Check catalog | PASS | The design covers application/use-case/target shape, request/config/Prompt/hash forms, JSON bounds, five-status lifecycle, retry/attempt/next-attempt agreement, lease and dispatch shape, cancellation, terminal timing, Provider/failure evidence, environment/budget periods and values, cost states, candidate shape, and human disposition/quality. Cross-row and registry facts correctly remain typed Domain Service invariants rather than impractical database triggers. |
| Canonical lifecycle | PASS | Only `pending`, `processing`, `draft_ready`, `failed`, and `cancelled` exist. `dead` is excluded; exhaustion is `failed + exhausted`. Candidate presence is equivalent to `draft_ready`, and human disposition remains orthogonal. |
| Enqueue idempotency | PASS | Exact response-loss replay returns the original run without rereading mutable configuration or duplicating Audit. Same-key/different-fingerprint and unauthorized collisions fail without prior-payload disclosure. `ON CONFLICT ... DO NOTHING RETURNING` avoids transaction-abort handling. |
| Same-run retry | PASS | Automatic and authorized manual retry mutate the same run, preserve resolved snapshots and original charge cohort, never switch Provider/model, respect attempt/run-cost ceilings, and do not create a second allowance or work row. |
| Claim/concurrency | PASS | One transaction-scoped advisory lock serializes short claim/accounting admission; it is acquired before run-row locks. Active non-expired processing leases are counted under that lock, enforcing text concurrency `2` for the environment without holding a database connection across the Provider call. |
| Lease/dispatch fence | PASS | Fresh attempt tokens, state-version compare-and-swap, finite database-clock leases, and a separately committed active-attempt dispatch marker distinguish undispatched from dispatched recovery across retries. A marker failure authorizes no Provider call. |
| Cancellation fence | PASS | Cancellation changes status/version and clears the active lease. The former token permits accounting-only late evidence, while status, token, version, candidate Check, and the command column allowlist jointly prevent a late response from becoming a candidate or public mutation. |
| Optimistic concurrency | PASS | Configuration `record_version`, run `state_version`, and target `editor_document_version`/Revision `draftVersion` cover their distinct authorities. Stale acceptance leaves the Draft and run disposition unchanged. |
| Required Audit | PASS | Configuration mutation, enqueue, manual retry/cancel, evaluation/reject, and human acceptance define atomic governed transactions. Required Audit failure rolls back the governed mutation. Worker operational transitions remain fenced provenance in `ai_runs` without creating per-heartbeat Audit noise. |
| Per-run budget | PASS | Staging copies a `USD 0.02` all-attempt logical-run ceiling, precomputes a defensible maximum, reserves the remaining ceiling before dispatch, and converts complete actual or conservative incomplete-attempt evidence into accounted cost. Actual overruns remain recorded and force failed/no-candidate state. |
| Day/month admission | PASS | The shared advisory lock serializes day/month accounted-plus-reserved sums. Limits are exactly daily `USD 5`, monthly warning `USD 50`, and monthly hard stop `USD 100`. The immutable first-claim charge cohort prevents retries from obtaining a second period allowance. |
| Environment authority | PASS | Trusted server snapshots and an exact environment equality check prevent a Staging caller from labelling work local/test. The database rejects Production rows, and local/test work is structurally nonbillable. |
| Prompt/fallback | PASS | Prompt bodies stay in reviewed immutable repository resources; only identity/version/hash snapshots are stored. The fallback FK is reserved but a Check requires every current value to be null, and retry remains on the same resolved Provider/model. |
| Privacy/security | PASS | Bounded protected context is limited to the frozen explicit allowlist. Customer, Inquiry, Contact, Organization, CRM, PII, private files/URLs/Object Keys, Secrets, credentials, raw headers, arbitrary tools/URLs, RAG, and Provider raw bodies are excluded by Schema scope and Domain Service validation. |
| Draft/public boundary | PASS | A successful result is only a protected `draft_ready` candidate. Human acceptance is a separate authorized, audited, target-version-fenced Draft/Revision mutation. No Publish, Index, Route, Redirect, Canonical, Sitemap, rights, eligibility, or Production AI authority is present. |
| Migration contract | PASS | Additive empty-table construction, exact `0020` Journal/snapshot behavior, preservation of `0000`–`0019`, no seed/backfill/trigger/function/extension/enum mutation, real PostgreSQL matrix, and provenance-preserving rollback are specified. |

## 6. Verification performed

- Recomputed the design SHA-256 before review: exact match.
- Read the complete root `AGENTS.md`, `docs/ENGINEERING_GOVERNANCE.md`, `docs/REVIEW_POLICY.md`, ADR-0017, ADR-0018, Stage 4A Pre-Development Final Review, Stage 4 Pre-Development Implementation Plan, and the fixed 770-line v1.0 design.
- Confirmed every principal input hash recorded in Appendix A, including ADR-0010, Schema source files, current `0019` SQL, and Drizzle Journal.
- Confirmed the frozen Tag resolves to the stated baseline Commit.
- Confirmed the reviewer worktree is independently detached at the same baseline and that the design source worktree is a different worktree.
- Confirmed the current Journal contains 20 entries through `0019_needy_slyde`; a valid `0020` would be the twenty-first entry.
- Confirmed the existing `app_environment` values and the actual Product/Content localization composite primary keys, `editor_document_version` columns, Editorial Revision identity/status/snapshot shape, and user identity key needed by the proposed FKs and service fences.
- Performed a root-cause review of duplicate authority, lifecycle reachability, retry/cancellation fencing, cost loss/double count, budget and claim races, stale acceptance, privacy, and public-state authority. No policy-level finding remained.
- Did not generate or execute a Migration and did not claim real PostgreSQL DDL, locking, contention, or query-plan proof.

## 7. Next gate and stop condition

The approved next gate is:

1. the original development/design owner generates the exact `0020_phase1b_ai_foundation` Migration Candidate and matching TypeScript Schema/Journal/snapshot artifacts without broadening scope; then
2. an independent Candidate review executes the exact catalog, Fresh/Upgrade/repeat/interruption, constraint, contention, lock-health, and real PostgreSQL query-plan contract against the fixed Candidate identity.

This review stops here. It does not self-start Migration generation and grants no Provider/API, Deploy, Publish, Index, formal-import, Push, Staging-call, or Production authority.
