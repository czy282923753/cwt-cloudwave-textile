# Stage 4A Phase C PCIR-H-01 remediation attempt 2 evidence

## Role and status

This is implementation-engineer evidence, not self-review, implementation acceptance, Phase acceptance, checkpoint authority, merge authority, Production readiness, release, Push, Deploy, or authorization to begin Phase D–G.

- Finding: `PCIR-H-01`
- Proof-bound clean code commit: `6de5fac1d676c5d01ccfedaeb90c1bcb0285c89a`
- Pre-remediation evidence Candidate: `a6ef39b93b4b36eeb2fa37cf93ae2106ef18902d`
- Failed independent Attempt 1 re-review: `9430baf67b4e67598eeccf3502f55c415b53f1a5`
- Accepted Exact Design base and merge-base: `21662c2c110f17cd095249fe91c2c019f6f508ab`
- Branch: `codex/phase-1b-stage4a-phase-c-implementation-v1`
- Accepted Phase B checkpoint target, unchanged: `cc5715f4a9eb07293bf932cfbd822bfa6bf14a45`

The evidence commit is intentionally an evidence-only descendant of the clean code commit. The new V4 manifest binds the executable tree to `6de5fac...`.

## Causal repair

Availability now resolves exactly one persisted active actor inside its repeatable-read, read-only transaction before registry preparation, target resolution, feature state or model-config readiness. The existing Phase C actor resolver and closed operation policy are the sole authority for both PGlite availability and PostgreSQL availability/durable paths. DTO role is only an exact-match claim.

The local `actorCanEditEntityType` and coarse caller-role authorization were deleted. A module-private read-scope binding carries only the resolved actor's closed entity-scope decision; it adds no public scope member, durable authority, second repository, binder, definition or permission map. The accepted read-scope positive/negative type contract remains unchanged and passes V4.

Admin can inspect any allowed Product/Content Draft or Revision. Product and Content editors can inspect only their matching direct/Revision type. Reviewer/Publisher, Sales and Analyst cannot use availability. Unknown, inactive, malformed and persisted-role/claim-mismatched principals fail uniformly before protected state. Revision `entity_type` and locale are read in the same transaction before an authorized target-state result. Availability remains read-only and creates no run or Audit.

## Decisive authorization proof

The accepted PGlite foundation path covers true Admin/matching editors; all cross-scope direct/Revision cases; forged Sales/Reviewer; true Reviewer/Analyst; inactive, unknown, malformed and role mismatch; existing versus missing target; ready versus disabled-feature versus missing-config non-disclosure; and zero run/Audit mutation.

The real PostgreSQL service path independently covers the same persisted-role matrix for Product/Content direct targets and Product/Content Revisions with enabled feature/config, including true positive `available` outcomes. It retains the complete durable enqueue/read/cancel/retry/disposition/config/Audit matrix.

The exact original `PCIR-H-01` reproduction from `91c5805...` and exact Attempt 1 availability reproduction from `9430baf...` are retained byte-for-byte. Each fails at its first old-defect assertion: persisted Sales claiming Admin cannot read a protected run, and forged/inactive/unknown availability actors receive `authorization_denied` instead of `available`. The accepted-path tests prove every later positive and negative case without relying on expected-failure reproduction files.

## Complete gate results

Environment: Node `v24.14.0`, pnpm `11.9.0`, Next `16.2.12`, disposable local Docker PostgreSQL `17.10`. Only conspicuously Synthetic data was used.

- TypeScript, Lint and Prompt gate: PASS.
- AI foundation: 17 files / 175 tests PASS; 7 PostgreSQL-conditioned files / 36 tests skipped by that command.
- Full regression: 117 files / 595 tests PASS; 7 PostgreSQL-conditioned files / 36 tests skipped by that command.
- Fresh real PostgreSQL Phase C: 11 files / 45 tests PASS.
- H-01 R1/R2/R3 barrier: PASS in both advisory-owner orders, including the database-time safety-window barrier.
- PostgreSQL application Build: PASS, 43/43 static pages.
- Dedicated webpack server/public fixture: PASS, 51 server files / 16 client files; server markers and raw Synthetic Prompt retained; zero public-client leak; positive controls fired.
- V4.0: PASS with exact inherited type/graph/topology gates, 28 inherited mutation probes and six Phase C Synthetic probes. Proof artifacts are in `architecture-v4-remediation2/` and bind `6de5fac...`.

Representative commands:

```text
pnpm typecheck
pnpm lint
pnpm check:ai-prompts
pnpm test:ai-foundation
pnpm test:run

CWT_PHASE_C_POSTGRES_URL=<disposable-local-pg17> pnpm exec vitest run \
  src/ai/runs \
  src/ai/config/model-config-service.integration.test.ts \
  src/ai/config/model-config-repository.integration.test.ts \
  src/ai/testing/accepted-draft-atomicity-harness.integration.test.ts \
  --maxWorkers=1

DATABASE_DRIVER=postgres DATABASE_URL=<disposable-local-pg17> pnpm build
```

## EV-01 and EV-02

EV-01 passed 13/13 scaled plans with 100,000 runs, 10,000 configurations, all five statuses, all three target types, 365 charge days and 24 months. Planner controls stayed enabled. The scale database was dropped, no matching scale database remained, and final lock health was zero advisory locks, tuple locks and idle-in-transaction sessions. Full output: `REMEDIATION_ATTEMPT_2_EV-01_POSTGRESQL_SCALE_QUERY_PLANS.json`.

EV-02 passed with exactly two active fake Provider calls while a third row remained pending, 3/3 final `draft_ready`, five heartbeat-busy observations, one `lease_renewal_unavailable` abort, candidate null on the fenced abandoned row, and zero residual locks/idle transactions. Measured demand was about `0.308` vCPU with maximum RSS `136,626,176` bytes, below the 2-vCPU/4-GiB-equivalent envelope. Full output: `REMEDIATION_ATTEMPT_2_EV-02_TWO_SLOT_RESOURCE_AND_CONTENTION.json`. It is fake-adapter validation, not real-Provider evidence.

## Scope and open conditions

The code delta after `a6ef39b...` changes only six accepted Phase C implementation/test paths. The accepted 47-path executable allowlist remains exact from Design base to proof-bound code. No Schema, Migration, ADR, dependency, lockfile, environment authority, Provider/Prompt Production registry, Product/Content/Public/SEO/CRM/Inquiry/Asset/Upload/Import implementation, Phase D–G adapter, real Provider, SDK/network/credential/endpoint, queue, Outbox, second run history, checkpoint, accepted review/design artifact or external system changed.

C-002 and C-003 remain active. The only next gate is a Fresh independent Phase C implementation re-review of the exact evidence Candidate; this implementer does not create that task or grant acceptance.
