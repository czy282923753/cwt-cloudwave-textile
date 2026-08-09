# CWT Stage 4A Phase A｜0020 Independent Migration Candidate Review V1.0

- Review date: 2026-08-10 (Asia/Shanghai)
- Reviewer role: Independent Migration Candidate Reviewer
- Review conclusion: **PASS**
- Candidate disposition: Candidate may enter coordinator-controlled integration / Phase A completion gates. This conclusion does **not** authorize or start Phase B.

## 1. Decision

The fixed Candidate is acceptable for integration into the Stage 4A Phase A completion gate.

The review found no Blocker, High, or Medium issue. One Low finding records an acceptance-oracle mismatch: the design asks an explicit PostgreSQL `ON DELETE RESTRICT` constraint to return SQLSTATE `23503`, while PostgreSQL 18.4 correctly returns `23001` (`restrict_violation`). The Candidate implements and enforces the required `RESTRICT` semantics; all referenced deletes were blocked. This documentation/test-oracle mismatch does not create a supported-path security, privacy, publication, or data-integrity defect and therefore does not block Phase A under `docs/REVIEW_POLICY.md`.

No Candidate file was repaired, rewritten, staged, committed, pushed, deployed, published, indexed, or self-approved during this review.

## 2. Fixed review identity and start gate

All mandatory identity checks passed before substantive review.

| Item | Verified value |
| --- | --- |
| Project | CWT (CloudWave Textile) |
| Candidate branch ref | `codex/phase-1b-stage4a-0020-migration-candidate-v1` |
| Candidate HEAD | `15bc6462d2e314f50ff238af70ad31fc6502c40f` |
| Candidate parent | `31c0e405acfdd0d05200d0fb2531e897a541a2c4` |
| Checkout state | Detached at the exact Candidate HEAD; branch ref resolves to the same commit |
| Frozen tag | `phase-1b-stage3-approved-2026-08-09` |
| Frozen tag object | `1c626f9b788e4c6ed0480a7040aa54ccef3e6c76` |
| Frozen tag peeled commit | `31c0e405acfdd0d05200d0fb2531e897a541a2c4` |
| Worktree | `/Users/calvin/.codex/worktrees/a301/CWT（CloudWave Textile）项目` |
| Design SHA-256 | `db6ae44d3548e2c0c23ab2b95ee3550fefedb93224f878f5a9ab3070898b60a8` |
| Independent design review SHA-256 | `fe17a42990f1b55fca89e1f038cede9c09aff3c418379ff8d4c54d882ff3e6b2` |

The external independent design review was used only as a read-only input. Owner-approved Architecture Approved / Development Authorized status was respected. DeepSeek PD-04 through PD-07 were treated as non-blocking references and were not reinstated as Candidate gates.

## 3. Authority and inputs read

The reviewer read the complete applicable inputs before testing:

| Input | SHA-256 |
| --- | --- |
| `AGENTS.md` | `f7ccb8a2ccc9f5171804511ef4b2c969a546a5ecc50b81c9d68e9ff5100a6a5f` |
| `docs/ENGINEERING_GOVERNANCE.md` | `6c27a0075229ebb131643460897e49b891c8fb534cfc6a3026216da6e0028647` |
| `docs/REVIEW_POLICY.md` | `97a8f4fc8dfa13ee2e748cc5c14c61346b4c539345225ea6662c86a8f94829e2` |
| `docs/adr/ADR-0017-ai-run-work-and-provenance-authority.md` | `1948e5fc541bc1dd317a8a5e8823f987462b37deb5ad148d3753b7ce9179429b` |
| External `docs/adr/ADR-0018-provider-agnostic-ai-service-and-model-configuration.md` | `9bef5150abe0c60a9c9e1da40be8c673b80b0263ac03aa9fb75e38a7231f1c5d` |
| Fixed 0020 schema design | `db6ae44d3548e2c0c23ab2b95ee3550fefedb93224f878f5a9ab3070898b60a8` |
| External independent design PASS report | `fe17a42990f1b55fca89e1f038cede9c09aff3c418379ff8d4c54d882ff3e6b2` |

ADR-0010 and the Stage 4A pre-development planning/review inputs were also read because the Candidate uses the established PostgreSQL migration compatibility runner.

## 4. Scope and Candidate integrity

### 4.1 Exact Candidate files

The parent-to-Candidate diff contains exactly nine files and 12,051 insertions. Their Candidate SHA-256 identities are:

| File | SHA-256 |
| --- | --- |
| `docs/PHASE_1B_STAGE4A_PHASE_A_0020_AI_FOUNDATION_SCHEMA_DESIGN_V1_0.md` | `db6ae44d3548e2c0c23ab2b95ee3550fefedb93224f878f5a9ab3070898b60a8` |
| `drizzle/0020_phase1b_ai_foundation.sql` | `a7e2192b1dd60f41b66b1f19db1a44e2a35c01d246ae97787ef9aaaec60cac3c` |
| `drizzle/meta/0020_snapshot.json` | `274ad623210843981a27d262df2057213230f3943c3faafa16a2f15397792321` |
| `drizzle/meta/_journal.json` | `bea61c8329c1dd78d6a1620e8357dfc153e05af46beb47629b4510c9f831eef7` |
| `package.json` | `3f288f10bbb11e9a657e038af198bb31f0a471ecacb4f7d9e9ae6848ac241ed4` |
| `scripts/verify-ai-foundation-candidate.ts` | `bb5d7f945bd17903b6ff492d5a1927528cc6d1a00aa7bcc8274e0abafdc16be1` |
| `src/db/schema/ai.integration.test.ts` | `f87d5765c19cd8ac5f0c3be042f2128578dfd9e1fb61eec18600560d77b572b4` |
| `src/db/schema/ai.ts` | `9f09c3a2e4532556384c8527886ec235a8ff9d9f390eb91d09e29712f5287449` |
| `src/db/schema/index.ts` | `09badb6cbc33665d85918f1244a140409908518696a49a690c7df7bddc931070` |

The reviewer verified that these nine tracked files remained byte-identical to Candidate HEAD throughout the review.

### 4.2 Migration history and generated identities

- All 40 historical artifacts for migrations and snapshots `0000` through `0019` are byte-identical between parent and Candidate.
- The Journal has 21 entries and appends only `0020_phase1b_ai_foundation` at index 20 with timestamp `1786311287317`.
- Snapshot identity is `ae9de118-43fa-4bff-b647-c3640e72f709`; its predecessor is `b4f8e486-60ab-4ad8-b6c5-caf8b9425546`.
- Independent Drizzle generation from an archived Candidate tree reported `No schema changes, nothing to migrate`.
- Candidate verifier independently passed exact columns, types, defaults, nullability, constraints, indexes, Journal append, history identity, and scope checks.
- Fresh and upgrade database catalogs produced the same catalog signature: `d3ec059c98bb6e66df952bd4e692329788d0921e9ee3d7da5acdd7d015285d87`.

### 4.3 Boundary scan

The implementation diff contains no Provider network call, Provider credential environment lookup, vector/RAG dependency, migration seed, Provider API invocation, fallback activation, or Production AI path. The migration adds only `ai_model_config` and `ai_runs`; existing enum, function, trigger, extension, and sequence inventories are unchanged.

The review used only conspicuously synthetic data. It did not use private, customer, Inquiry, formal Product, Staging, or Production data or credentials.

## 5. PostgreSQL 18.4 isolation identity

All database evidence was produced on a disposable real PostgreSQL instance, not PGlite and not another PostgreSQL version.

| Property | Verified value |
| --- | --- |
| Exact version | `PostgreSQL 18.4 (Debian 18.4-1.pgdg13+1) on aarch64-unknown-linux-gnu, compiled by gcc (Debian 14.2.0-19) 14.2.0, 64-bit` |
| `server_version_num` | `180004` |
| Image | `postgres:18.4` |
| Image ID / digest | `sha256:3a82e1f56c8f0f5616a11103ac3d47e632c3938698946a7ad26da0df1334744a` |
| Container ID | `6db4921ad88cd269817706dd093a25ceded949d0a54e5ba9be087a15ce21d1ee` |
| Container name | `cwt_stage4a_candidate_review_a301` |
| Review role / admin DB | `cwt_review_admin` / `cwt_review_admin` |
| Network isolation | Docker bridge; PostgreSQL bound only to `127.0.0.1:56178` |
| Storage isolation | No mounts; `/var/lib/postgresql` was a 2 GiB tmpfs with `noexec,nosuid` |
| Data | Synthetic-only fixtures in per-scenario temporary databases |

Every per-scenario database was dropped. Before container removal, the matching review-database count was zero. The exact disposable container was then stopped and removed; its tmpfs synthetic contents are not recoverable. The local immutable PostgreSQL image remains cached.

## 6. Verification results

| Requirement | Result | Evidence summary |
| --- | --- | --- |
| Candidate scope, hashes, SQL/schema/snapshot/Journal | PASS | Exactly nine expected files; verifier PASS; regenerated snapshot produced no change |
| Historical migration/snapshot identity | PASS | 40/40 artifacts `0000`-`0019` byte-identical |
| Fresh `0000 -> 0020` | PASS | Journal 21 entries; only two new empty AI tables; repeat invocation did not change Journal |
| Upgrade `0019 -> 0020` | PASS | Representative legacy rows retained exact signature; two new tables added; old localization update and Audit write still work |
| Repeat/no-op | PASS | Fresh second run and post-interruption next run both exact no-op |
| Forced transaction failure/resume | PASS | Deliberate relation collision returned `42P07`; 0020 DDL and Journal rolled back; removal plus rerun reached entry 21 |
| Interruption/resume/Journal | PASS | Child exited with code 86 immediately after commit; committed Journal remained authoritative; next invocation no-op |
| Actual catalog | PASS | 21 configuration columns, 96 run columns, defaults/nullability/types, named Checks, FKs/RESTRICT, 18 named secondary/unique indexes plus two primary-key indexes captured from catalog |
| Check boundaries | PASS | 40 exact negative Check cases returned `23514`; 30 legal states persisted across pending/processing/draft_ready/failed/cancelled |
| Uniqueness | PASS | Default-config, idempotency-key, and active-lease-token collisions returned `23505` |
| RESTRICT behavior | PASS with Low documentation finding | Four referenced deletes were blocked with PostgreSQL 18.4 SQLSTATE `23001`; see L-01 |
| Idempotency | PASS | Same key/fingerprint returned one run and one Audit; different fingerprint returned conflict without prior payload |
| `SKIP LOCKED` and claim ownership | PASS | Locked row skipped; two claimers produced one token/attempt and one empty result |
| Concurrency limit 2 | PASS | Three concurrent claimers produced two active runs and one concurrency denial |
| Lease recovery and same-run retry | PASS | Same run ID reached attempt 2; accounting/reservation/history preserved; undispatched and dispatched recovery paths fenced correctly |
| Dispatch marker | PASS | Failed CAS marker caused zero simulated Provider calls; successful marker caused one |
| Cancel/late response | PASS | Stale candidate update affected zero rows; late response was accounting-only and candidate remained null |
| Heartbeat/cancel race | PASS | Exactly one competing CAS won; stale completion remained fenced |
| Daily/monthly/run budgets | PASS | Daily and monthly hard caps admitted one contender and denied one; monthly warning crossing observed; actual overrun persisted as non-retryable failure without candidate |
| Default model switch + Audit | PASS | Concurrent switch yielded one winner/one conflict; exactly one default and one Audit; forced Audit failure rolled back the switch |
| Acceptance fencing + Audit | PASS within Candidate-supported schema | Concurrent acceptance yielded one accepted/one conflict; target version and Audit advanced once; forced Audit failure rolled back target and run changes |
| Locks and sessions | PASS | No residual advisory lock, tuple lock, or idle-in-transaction session |
| Scaled query plans | PASS | 10,000 configurations + 100,000 runs; 365 charge days / 24 months; `VACUUM ANALYZE`; 13/13 required default-planner plans used intended indexes |

The scaled plan evidence includes `EXPLAIN (ANALYZE, BUFFERS, SETTINGS, FORMAT JSON)` output for config resolution, due claims, active/expired leases, daily/monthly budgets, three target histories, requester history, admin listing, and idempotency lookup. Both `clock_timestamp()` and `transaction_timestamp()` active-lease variants used `ai_runs_active_lease_idx`. Planner switches remained at their defaults, including `enable_seqscan=on`.

## 7. Repository quality gates

| Gate | Result |
| --- | --- |
| `pnpm db:verify:ai-foundation-candidate` | PASS |
| Independent snapshot reproduction | PASS — no schema changes |
| `pnpm lint` | PASS — zero warnings |
| `pnpm typecheck` | PASS |
| Targeted AI schema test | PASS — 1 file, 1 test |
| Full test suite | PASS — 98 files, 417 tests |
| Production build against isolated migrated PostgreSQL 18.4 | PASS — 43 static pages generated |
| Public bundle boundary | PASS — 23 public page manifests and 31 manifest/chunk files |

An initial supplementary `pnpm build` invocation used the review worktree's unmigrated default database and failed during `/about` prerender because `system_settings` did not exist (`42P01`). Compilation and TypeScript had already passed. The reviewer preserved that log, provisioned a separate synthetic-only PostgreSQL 18.4 database, applied `0000 -> 0020` through the repository migration command, and reran the build successfully. Because the failure was fully explained by missing review-environment schema and did not reproduce on the isolated migrated Candidate database, it is not a Candidate finding.

## 8. Findings by root cause

### Blocker: 0

None.

### High: 0

None.

### Medium: 0

None.

### Low: 1

#### L-01 — Fixed design expects the wrong SQLSTATE for explicit `ON DELETE RESTRICT`

- Root cause: Section 14.2 of the fixed design requires target/user/config delete tests to return SQLSTATE `23503`. The same design explicitly requires `ON DELETE RESTRICT`. PostgreSQL 18.4 reports an immediately enforced `RESTRICT` action as SQLSTATE `23001` (`restrict_violation`); `23503` is the usual `foreign_key_violation` code associated with other FK violations, including `NO ACTION` behavior.
- Reproduction: Deleting a referenced model configuration, Product localization, Content localization, and editorial Revision each returned `23001` with the intended named FK constraint.
- Safety outcome: All four deletes were rejected. Provenance remains protected; the Candidate's FK action and catalog exactly match the frozen design.
- Impact: An acceptance script that hard-codes `23503` would falsely reject a safe Candidate or misclassify a legitimate RESTRICT error. There is no current Phase service deletion path or durable-state corruption.
- Recommendation: At the next owner-controlled documentation/acceptance maintenance point, correct the expected SQLSTATE to `23001` or accept the named RESTRICT constraint plus the appropriate integrity-class code. Do not change `RESTRICT` merely to satisfy the erroneous oracle.
- Candidate action taken: None; independent reviewer did not modify Candidate.

### External Validation

No External Validation item blocks this migration Candidate: exact PostgreSQL 18.4 migration, locking, contention, and query-plan evidence was obtained locally in an isolated real server.

Provider response/billing semantics, real Staging/Production deployment, cache/DNS/traffic, and formal Product/media data remain intentionally unvalidated because they are outside this Candidate and were expressly prohibited. No Production or Provider claim is made by this PASS.

## 9. Evidence and exact command index

Evidence directory:

`/Users/calvin/.codex/worktrees/a301/CWT（CloudWave Textile）项目/docs/review-evidence/phase-1b-stage4a-0020-candidate-v1`

Evidence manifest:

- `SHA256SUMS.txt`
- SHA-256: `57d89f5f11a92444de62dfd894d3582b3718533a490b43831767eae8fc2bcbaf`
- Entries: 19

Principal evidence:

| Evidence | SHA-256 | Contents |
| --- | --- | --- |
| `candidate-static-review.json` | `6ab304d7cef2d79f3f5bf72d0170e3a144224e18ee382228c998e374a61cb195` | Git identity, fixed hashes, nine-file scope, all 40 historical artifact hashes, Journal/snapshot identity, boundary scan |
| `postgres-isolation-identity.json` | `bdcd81f04e9b932f4dc0eaba022613d60cfad126bcb2a9e5e776298099afcda0` | Exact PostgreSQL image/container/version/network/tmpfs identity and zero remaining review DBs |
| `postgres-migration-catalog-constraints.json` | `90a99d1d87fff7c98e25c2040e762140a3dbcee8ee6b0d940a89d63e6c0f2c2d` | Fresh, upgrade, no-op, rollback/resume, interruption, actual catalog, 40 Check negatives, uniqueness, RESTRICT SQLSTATE, lock health |
| `postgres-contention-lifecycle-budget.json` | `6160a21553b35a7a8fbdef949a5845350e8456313af2302ad4ee881fee721709` | Multi-connection idempotency, claims, concurrency, leases, dispatch, cancellation, budgets, Audit rollback, acceptance fencing |
| `postgres-scale-query-plans.json` | `f3d2b623637795d877c8f5bb2f6dbad4d3c8261d3d56e0127290eb09558fd0ee` | 100k-run fixtures, VACUUM ANALYZE state, planner settings, full JSON plans, 13/13 index expectations, lock health |
| `candidate-verifier.log` | `b7a123e19cfa98b7eea33ec0c7832b2b32c2de64fdcc5948ad79d589a43c367b` | Candidate verifier PASS |
| `snapshot-reproduction.log` | `3425520181908d63c05a1e67d9884639a2d6ba5210d4c89ad1fdff5b608c04d5` | Independent Drizzle generation: no changes |
| `lint.log` | `b543827ce56a63357c629028555ecec2cc964dda33dbbf2a9a2872b1a2ab20f8` | lint PASS |
| `typecheck.log` | `8366207267355d3e3d5bf3bf6e8c94c5f93f6078c34f08973fa2b38cdda6cc92` | typecheck PASS |
| `targeted-test.log` | `422e023bc701d3fdea52aa64b7f97af4191e9fdd675c2df02a28da7cd4ab7706` | targeted test PASS |
| `full-test.log` | `277bcfa2c7ed93b6965d74c984d0ed6ba1643d5af2812785bb0a93f2f13f3eb8` | full suite PASS |
| `build.log` | `e43b5b90fe40c5579eca5885700de8d12160c943831316ca76b6d0888b262e7e` | preserved first environment failure |
| `build-database-migrate.log` | `f331ce53ded4e4106918189f8c9a11a23419d10ffff07f724921b666b30a3307` | repository migration command PASS on isolated build DB |
| `build-with-isolated-postgres.log` | `26c2cd231865f9daa3d3431c3e6af6eff9291bfd46e649813a75405da672e7fe` | build PASS on isolated migrated PostgreSQL |
| `public-bundle-check.log` | `4d55dc37fd5898ef99f94ab382e35d976d7d18e7f1cba47e30688ed65a334252` | public bundle boundary PASS |

The three `.ts.txt` and one `.mjs.txt` files in the evidence directory are the exact reviewer harness sources. Each executable copy was temporary and deleted after execution. Key invocations were:

```text
git rev-parse HEAD HEAD^ refs/heads/codex/phase-1b-stage4a-0020-migration-candidate-v1
git rev-parse phase-1b-stage3-approved-2026-08-09^{commit}
sha256sum <fixed design> <external independent design review>

CWT_REVIEW_EVIDENCE_PATH=<candidate-static-review.json> node <candidate-static-review.mjs>
CWT_REVIEW_DATABASE_URL=<localhost synthetic-only PostgreSQL 18.4 admin URL> \
  CWT_REVIEW_EVIDENCE_PATH=<postgres-migration-catalog-constraints.json> \
  pnpm exec tsx <postgres-migration-catalog-constraints.ts>
CWT_REVIEW_DATABASE_URL=<same isolated URL> \
  CWT_REVIEW_EVIDENCE_PATH=<postgres-contention-lifecycle-budget.json> \
  pnpm exec tsx <postgres-contention-lifecycle-budget.ts>
CWT_REVIEW_DATABASE_URL=<same isolated URL> \
  CWT_REVIEW_EVIDENCE_PATH=<postgres-scale-query-plans.json> \
  pnpm exec tsx <postgres-scale-query-plans.ts>

pnpm db:verify:ai-foundation-candidate
<archived Candidate tree>/node_modules/.bin/drizzle-kit generate
pnpm lint
pnpm typecheck
pnpm exec vitest run src/db/schema/ai.integration.test.ts
pnpm test:run -- src/db/schema/ai.integration.test.ts
APP_ENV=test DATABASE_DRIVER=postgres DATABASE_URL=<isolated migrated PostgreSQL 18.4 URL> pnpm db:migrate
APP_ENV=test DATABASE_DRIVER=postgres DATABASE_URL=<same isolated URL> pnpm build
pnpm check:bundle
```

The `pnpm test:run -- ...` invocation passed the separator through to Vitest and therefore executed the full configured suite; that output is correctly archived as `full-test.log`. The subsequent direct Vitest invocation is the actual one-file targeted run.

## 10. Residual risks and next gate

- Phase B service code does not exist in this Candidate. The contention/lifecycle evidence proves the schema can support the fixed protocol; it does not pre-approve a future service implementation.
- A future dispatch implementation must assign `provider_dispatched_at` and `active_attempt_dispatched_at` from one stable database statement timestamp. Independent harness construction demonstrated that separate volatile clock evaluations can differ by microseconds and be correctly rejected by the Candidate Check.
- Future service acceptance must re-run authorization, request canonicalization, Audit atomicity, dispatch fencing, budget, cancellation, and target-application fencing through the actual Domain Service path.
- Provider credentials/API calls, Staging/Production AI, fallback, RAG, vision, `customer_support`, private/Inquiry data, publish, and Index remain outside this PASS.
- L-01 should be corrected in the acceptance documentation/oracle under owner control; it does not require a Candidate migration change.

**Next gate:** coordinator verifies this independent report/evidence identity and may proceed with integration / Phase A completion acceptance. No Phase B work starts automatically. Stop after callback.
