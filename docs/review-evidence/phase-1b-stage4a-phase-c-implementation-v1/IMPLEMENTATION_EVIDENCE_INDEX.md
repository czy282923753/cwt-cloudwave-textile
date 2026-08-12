# Stage 4A Phase C implementation evidence index

## Role and status

This directory is implementation evidence prepared by the Phase C Implementation Engineer. It is not an implementation review, Phase acceptance, checkpoint, merge, release, Production-readiness claim, deployment record, or authority to advance to Phase D–G.

- Candidate code commit: `4e68ecacac74541ffdf8f9e013327c5a371a2507`
- Exact base and merge-base: `21662c2c110f17cd095249fe91c2c019f6f508ab`
- Task-local branch at evidence preparation: `codex/phase-1b-stage4a-phase-c-implementation-v1`
- Accepted Phase B baseline/checkpoint target, unchanged: `cc5715f4a9eb07293bf932cfbd822bfa6bf14a45`
- Accepted Design Candidate: `21662c2c110f17cd095249fe91c2c019f6f508ab`
- Independent design PASS review: `40b05d81e503e7d092c99b33bd03cef883f4f162`
- Verified review parent: `21662c2c110f17cd095249fe91c2c019f6f508ab`

The final evidence commit is intentionally a descendant of the clean code commit. The V4.0 proof manifest binds the executable tree to the clean code commit above; the checker must be rerun with `--proof-bound-commit` from the evidence commit.

## Decisive results

| Area | Result | Principal evidence |
|---|---:|---|
| Full repository regression | PASS: 117 files passed, 7 skipped; 594 tests passed, 32 skipped | `FULL_REGRESSION_TEST.log` |
| Real PostgreSQL Phase C suite | PASS: 11 files, 41 tests | `REAL_POSTGRESQL_PHASE_C_TESTS.log` |
| H-01 R1/R2/R3 barrier | PASS in both advisory-owner orders | `EV-01_H01_BARRIER_TEST.log`; code test contains database-time observer barriers and final zero-lock checks |
| Scaled PostgreSQL plans | PASS: 13/13 at 100,000 runs and 10,000 configs | `EV-01_POSTGRESQL_SCALE_QUERY_PLANS.json` |
| EV-02 fake-adapter resource/operations | PASS: exactly two active calls; 3/3 settled; five lock-busy observations; one abort; zero residual lock/idle transaction | `EV-02_TWO_SLOT_RESOURCE_AND_CONTENTION.json` |
| Catalog equality | PASS: 21/96 columns, 40 Checks, 11 FKs, 18 explicit indexes | `POSTGRESQL_CATALOG_IDENTITY.json` |
| Type/lint/Prompt/foundation | PASS | `TYPECHECK.log`, `LINT.log`, `PROMPT_GATE.log`, `AI_FOUNDATION_TEST.log` |
| PostgreSQL application build | PASS | `POSTGRESQL_BUILD.log` |
| Server/public fixture bundle | PASS: all three server markers and the raw Synthetic Prompt retained; public-client leak count zero; positive client/leak controls fired | `SERVER_PUBLIC_BUNDLE_BUILD.log`; V4.0 bundle proof |
| AI Architecture V4.0 | PASS: 28 inherited mutation probes, 6 Phase C Synthetic probes, inherited graph/type/topology gates and five proofs plus one manifest; proof-bound verification passed from the evidence commit | `architecture-v4/`; `ARCHITECTURE_V4_EMISSION.log`; `ARCHITECTURE_V4_PROOF_BOUND_VERIFICATION.log` |

## PostgreSQL identity and isolation

All lifecycle tests and EV-01 ran against a disposable local Docker PostgreSQL instance with no Production credentials or data:

- PostgreSQL `17.10`, server version `170010`, `aarch64-unknown-linux-musl`.
- Test database: `cwt_phase_c`; scale-plan proof used a separately created disposable database and dropped it with zero matching databases remaining.
- Query-plan distribution: 100,000 `ai_runs`, 10,000 `ai_model_config`, all five statuses, all three target types, 365 charge days and 24 charge months.
- Default planner controls remained enabled (`enable_seqscan`, `enable_indexscan`, `enable_bitmapscan`, `enable_indexonlyscan` all `on`).
- End observations: zero idle-in-transaction sessions, zero lifecycle advisory locks, zero tuple locks in the scale-plan database.

The PostgreSQL lifecycle suite covers idempotency, one-row replay/conflict, two-slot claims, field/charge-period preservation, recovery, marker-before-call, pricing drift, missing usage, actual overrun, hard budget concurrency, monthly warning failure isolation, cancellation/late accounting, manual retry, record-scoped read authorization, config/enqueue races and required-Audit rollback. Governed target/run/Audit atomicity remains separately exercised by the accepted Draft atomicity harness.

## EV-01 commands and observations

Representative exact commands (the connection contained only the local disposable test password):

```text
CWT_PHASE_C_POSTGRES_URL=<disposable-local-pg17> pnpm vitest run \
  src/ai/runs src/ai/config/model-config-service.integration.test.ts \
  src/ai/config/model-config-repository.integration.test.ts \
  src/ai/testing/accepted-draft-atomicity-harness.integration.test.ts \
  --maxWorkers=1

CWT_PHASE_C_POSTGRES_URL=<disposable-local-pg17> pnpm vitest run \
  src/ai/runs/heartbeat-serialization.integration.test.ts

CWT_REVIEW_DATABASE_URL=<disposable-local-admin-pg17> \
CWT_REVIEW_EVIDENCE_PATH=/tmp/cwt-phase-c-postgres-scale-query-plans.json \
pnpm exec tsx /tmp/cwt-phase-c-scale-query-plans.ts
```

The H-01 test establishes committed, unexpired R1/R2 plus due R3. In heartbeat-owner order, H holds the shared transaction advisory lock after updating R1 and before commit; the observer uses `clock_timestamp()` until the old committed expiry passes, C returns lock-busy without row access/mutation, then renewed R1/R2 prevent R3. In recovery-owner order, C holds the advisory lock after recovering R1, H returns lock-busy without touching R1, the stale later heartbeat fails its fence, and only then R3 is admitted. No observed committed snapshot contains three unexpired processing leases.

The standalone query-plan harness is retained as `EV-01_QUERY_PLAN_HARNESS_SOURCE.ts.txt`; its raw JSON includes planner settings, full JSON plans, chosen indexes, data distribution, timings, buffer observations, lock health and cleanup.

## EV-02 command and observations

The fake-adapter-only harness was bundled from the exact Candidate source using the installed pinned toolchain, then executed against the disposable PostgreSQL database:

```text
esbuild /tmp/cwt-phase-c-ev02.ts --bundle --platform=node --format=esm \
  --target=node24 --tsconfig=tsconfig.json --alias:server-only=<empty-test-module> \
  --outfile=/tmp/cwt-phase-c-ev02.mjs

CWT_PHASE_C_POSTGRES_URL=<disposable-local-pg17> \
node /tmp/cwt-phase-c-ev02.mjs
```

- Target-equivalent envelope: 2 vCPU / 4 GiB. Validation used measured-demand-below-equivalent-capacity because the local macOS Node process could not be hard-cgrouped without adding an external runtime/dependency.
- Measured average demand: `0.3519254010` vCPU; maximum RSS: `177,946,624` bytes; both are materially below the target envelope.
- Event-loop mean/p99/max: about `11.59 / 36.37 / 74.58 ms` during deliberate database contention and five bounded retries.
- Exactly two Provider calls were concurrently active while the third durable row remained pending; all three rows ended `draft_ready`, one call per row.
- Under heartbeat advisory contention, exactly five busy attempts were observed, the Provider signal was aborted with `lease_renewal_unavailable`, the durable row remained fenced `processing` with no candidate, and no settlement bypass occurred.
- Final health: zero shared lifecycle advisory locks and zero idle-in-transaction sessions.

The exact evidence harness source is retained as `EV-02_HARNESS_SOURCE.ts.txt`. Its raw result is `EV-02_TWO_SLOT_RESOURCE_AND_CONTENTION.json`.

## V4.0 source/typegen/bundle lifecycle

The source-clean gate ran with the pinned installed dependency directory. The full Next application build was run against disposable PostgreSQL and passed. The dedicated tracked server/public fixture was built using Next `16.2.12` with webpack from a disposable copied dependency tree; `verify.mjs` reported:

```json
{"ok":true,"serverFileCount":51,"clientFileCount":16,"serverMarkers":3,"rawPromptMarker":true,"positiveLeakControl":true}
```

The built server and public-static trees were copied to isolated no-symlink inputs. The sole checker then generated exactly the five V4.0 proofs and one manifest in `architecture-v4/`. Manifest facts include:

- Candidate commit `4e68ecacac74541ffdf8f9e013327c5a371a2507`;
- checker SHA-256 `9c990020f3ec5a433fee1187f706e50db58b935eb32027b7cc34a4f54fc7a4f1`;
- raw profile SHA-256 `51699e6da13fb572289851df9c0f984a13b02ce48cc5db878b1d320aabee1ddb`;
- integrity projection SHA-256 `9dbd93121e9d6fadfb6c6af6a38cef1762b292722078a79a916d9ced06988bd9`;
- 28 inherited mutation probes and 6 Phase C Synthetic mutation probes.

After committing the evidence, the checker was rerun with the exact `--proof-bound-commit` and `--verify-evidence-dir` command shown below. It passed, proving that the committed evidence directory is internally bound to the clean executable Candidate and that the evidence-only descendant introduced no executable-tree drift.

## Mutation and frozen-boundary record

`MUTATION_INVENTORY.txt` is the exact `git diff --name-status` from accepted Design Candidate to clean code Candidate. It contains 47 changed paths and remains within the closed Section 23.2/23.3 authority. The only deletion is `src/server/ai/phase-b-composition.ts`; it was deleted in the same ordinary implementation commit that added the sole Phase C composition root. No compatibility alias or second root exists.

The following remained unchanged from the accepted Design Candidate through the clean code Candidate:

- `pnpm-lock.yaml`, every dependency field, all Migration/Schema paths and ADRs;
- accepted/failure design and review artifacts;
- V3.1 historical architecture profile/evidence;
- all four negative read-scope fixture sources and all five fixture tsconfigs;
- Production Provider registry and Production Prompt manifest exact-empty;
- the accepted Phase B checkpoint ref.

There was no queue, Outbox reuse, second run history, Production PGlite/in-memory durable runtime, real Provider adapter, SDK/network/credential/endpoint, Product Import enablement, public/factual mutation, Publish, Index, Route, rights, push, deploy, merge or external Production action.

## Commands for fresh independent reproduction

```text
pnpm typecheck
pnpm lint
pnpm check:ai-prompts
pnpm test:ai-foundation
pnpm test:run

CWT_PHASE_C_POSTGRES_URL=<fresh-disposable-supported-postgresql> \
pnpm vitest run src/ai/runs \
  src/ai/config/model-config-service.integration.test.ts \
  src/ai/config/model-config-repository.integration.test.ts \
  src/ai/testing/accepted-draft-atomicity-harness.integration.test.ts \
  --maxWorkers=1

DATABASE_DRIVER=postgres DATABASE_URL=<fresh-disposable-supported-postgresql> pnpm build

CWT_INSTALLED_NODE_MODULES=<pinned-installed-node_modules> \
pnpm exec tsx scripts/verify-ai-architecture.ts \
  --proof-bound-commit 4e68ecacac74541ffdf8f9e013327c5a371a2507 \
  --verify-evidence-dir \
    docs/review-evidence/phase-1b-stage4a-phase-c-implementation-v1/architecture-v4
```

## Open conditions and limitations

- C-002 remains active: RW-005/RW-006/RW-007 continue to block Production Ready, Deploy, Release, Launch, formal data and public truth.
- C-003 remains active: `FEATURE_PRODUCT_IMPORT=false`; PF-007/Product Import remains outside Phase C.
- EV-02 is fake-adapter and measured target-equivalent evidence, not a claim about a real Provider, staging scheduler or deployed container hard limits. Real Provider latency/abort/usage/cost/credentials/network/deployment remains Phase D/F External Validation.
- No implementation or Phase acceptance is granted here. A fresh independent implementation review in a different task is the only next gate.
