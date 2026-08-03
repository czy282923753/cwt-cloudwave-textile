# PostgreSQL External Validation — Phase 1A

Status: PostgreSQL 18.4 ARM64 Stage 2A, Stage 2B and Stage 2C **Passed** at candidate code baseline `3a93c8ddae96f4cf70a721bfc9cbf6ed2404ee10`. Findings are Blocker **0**, High **0**, Medium **0**, with **2 existing non-blocking Low items and 0 new**. The Phase 1A candidate is frozen and Phase 1B remains paused. R2/S3, SMTP, distributed rate limiting, production-scale Query Plans, Backup/Restore, Deployment and formal Product/Media validation remain pending; Production Ready: **No**.

## Stage 2C independent acceptance — 2026-08-03

| Acceptance field | Result |
| --- | --- |
| Candidate code baseline | `3a93c8ddae96f4cf70a721bfc9cbf6ed2404ee10` |
| PostgreSQL | **18.4 ARM64; official image digest locked** |
| Stage 2A / Stage 2B / Stage 2C | **Passed / Passed / Passed** |
| Journal | **18 entries, `0000`–`0017`** |
| Tables / enums / application triggers | **55 / 44 / 8** |
| Blocker / High / Medium | **0 / 0 / 0** |
| Low | **2 existing non-blocking items; 0 new** |
| Phase 1A candidate | **Frozen** |
| Phase 1B | **Paused** |
| Production Ready | **No** |

Independent acceptance used a locked official PostgreSQL image, a new isolated container, Volume, Role and database, and synthetic data only. Fresh `0000 → 0017`, repeat no-op, and `0005`, `0010`, `0011`, `0012`, `0014`, `0015`, `0016 → 0017` upgrades passed. The 0010 Enum Migration compatibility boundary did not regress.

Real multi-connection evidence passed Upload/Finalize/Recovery/Cleanup concurrency, exact Inquiry idempotency and attachment replay, Route/Redirect graph chain/cycle protection and deferred final-state triggers, Product Revision compare-and-set, Migration Session Lock, normal lock order, and complete rollback of a deliberate SQLSTATE `40P01` deadlock victim. Seed and Readiness were idempotent, the complete quality gate passed, and the final database had no idle-in-transaction Session, waiting lock or Advisory Lock. Independent acceptance changed no code, test, Schema, Migration, Snapshot, Journal or dependency.

The retained Low items are Harness-maintenance debt: the ordinary suite does not continuously maintain the complete race between two operating-system Migration processes, and part of the broader Stage 2C matrix remains in temporary Acceptance Harnesses. The critical D01/D02/D03 PostgreSQL Harness is Git-managed. They do not block Stage 2C acceptance or the Phase 1A candidate freeze and require no code change in this documentation task.

## Remaining External Validation Required

1. R2/S3 Conditional Write, HEAD consistency, deletion, interruption recovery and real Provider behavior, including Origin isolation and Public Media revocation.
2. SMTP Provider delivery, Delivery Key deduplication, retry and failure recovery.
3. Multi-instance distributed rate limiting with shared authoritative storage, contention, Trusted Proxy and degradation behavior.
4. Production-scale Query Plans, Index selection and fallback behavior.
5. Backup, Restore and rollout Restore Drill.
6. Preview/Production deployment on required Linux x64/ARM64 environments, Cache, DNS, CDN and real traffic.
7. Formal Product evidence and authorized Media.

These remaining items do not block the Phase 1A candidate freeze, but they continue to block Production readiness. They do not authorize Phase 1B or start automatically.

## Stage 2B independent acceptance — 2026-08-02

| Acceptance field | Result |
| --- | --- |
| PostgreSQL | **18.4 ARM64** |
| Stage 2A / Stage 2B | **Passed / Passed** |
| Candidate code baseline | `4b092be396ca54a3e6fe6ec37dc75a7d327ea146` |
| Blocker / High / Medium | **0 / 0 / 0** |
| Low | **1 non-blocking Harness automation debt** |
| Code review | **Passed** |
| Stage 2C at this checkpoint | **Stage 2C-1 failed; remediation was pending independent rerun** |
| Production Ready | **No** |

Independent evidence passed Fresh and repeat Migration; upgrades from 0005, 0010, 0011, 0012 and 0014; the original SQLSTATE `55P04` path; Journal and original 0011 hash preservation; and catalog verification for 55 tables, 44 enums and 6 triggers. Constraint behavior, idempotent Seed and Readiness checks passed. Identifier truncation produced no actual collision. The evidence worktree was clean and used no formal data or production credential.

The retained Low is Harness automation debt: the formal Harness does not yet automate direct termination of a running Migrator Backend or competition between two operating-system Migration processes. Independent review used temporary real fault injection to validate the current implementation safely. The debt does not block Stage 2B and may be completed during future Migration Harness maintenance.

This historical Stage 2B acceptance was deliberately bounded. Stage 2C subsequently passed at the final candidate baseline. R2/S3, SMTP, distributed rate limiting, production-scale Query Plans, Backup/Restore and Deployment remain pending.

## Accepted enum compatibility evidence

The formal `pnpm db:migrate` entry now uses a dedicated `max: 1` PostgreSQL client. One Session Advisory Lock and Backend PID fence cover Journal/catalog inspection, the committed 0010 enum preflight when required, Drizzle migration and final verification. Only the approved 0011 enum statement is adapted in memory for an exact 0010 compatibility/recovery state. Historical Migration files, hashes, Journal metadata and business Schema remain unchanged.

Run the isolated validation Harness only against a new disposable PostgreSQL server:

```sh
APP_ENV=test \
DATABASE_DRIVER=postgres \
DATABASE_URL='postgres://.../postgres' \
CWT_POSTGRES_COMPAT_VALIDATION=isolated-test-database \
pnpm exec tsx scripts/verify-postgres-enum-compatibility.ts
```

The Harness creates and destroys only random databases prefixed `cwt_enum_compat_`. It covers Fresh/repeat, 0005, 0010, 0011, 0012, 0014, 0015 and 0016 upgrades, the standard command entry, preflight interruption/recovery, enum transaction failure, 0011/0013 rollback, competing migration clients, backend termination and fail-closed Journal/catalog contradiction. The 2026-08-02 Stage 2B run was independently accepted against PostgreSQL 18.4; the later start points are local forward-Migration coverage and do not alter that historical acceptance. Stage 2C subsequently passed and revalidated the compatibility boundary.

## Stage 2C-1 retryable Asset Admin recovery remediation — local evidence

The server-side legal pre-Manifest handoff already preserves the original Batch, Session-bound Intents, Private/Internal Assets, Staging objects and retryable Finalize Recovery. Asset Library now obtains eligible handoffs only through the Upload Domain Service and retries the original `batchId` through the existing Finalize API. It does not create another Intent, upload, Asset, relation path, status, Worker or Recovery type.

A new disposable PostgreSQL `18.4 (Debian 18.4-1.pgdg13+1)` database with two independent connections verified: the current actor can query the original retryable Batch; the original Finalize completes; no Intent or Asset is duplicated; exactly one intended relation is created; the stale Worker remains fenced; and the run ends with zero idle-in-transaction sessions and zero residual locks. The disposable remediation container was removed after the run, and the independent Stage 2C evidence environment was not modified.

This paragraph records the implementation checkpoint. Independent code review and the complete Stage 2C rerun subsequently passed at the final candidate baseline. The retained non-blocking Low remains Harness-maintenance debt for the complete two-operating-system-process Migration race.

## Stage 2C joint-review D01/D02 remediation — local evidence

Joint review confirmed D03 Product Revision Apply and the server-side D02 fingerprint contract, but found two remaining supported-path gaps. The 0016 immediate trigger could not prove the Redirect graph's final transaction state after direct SQL moved a destination Route. The public form retained an Idempotency Key across response loss but created new Upload Tokens on retry, changing the otherwise-correct fingerprint.

Forward Migration `0017_redirect_graph_final_state.sql` keeps the existing graph Domain Service and advisory-lock namespace and adds deferred Route/Redirect constraint triggers. Commit now rejects an active Redirect whose source is a current Route, whose destination is not current, or whose destination is another active Redirect source. A legal application transaction may move `Y → Z`, flatten `X → Z`, create `Y → Z`, then pass final-state validation. The Migration adds no table, field, enum, lock table or second graph writer and does not modify 0011–0016.

The public form now freezes the Idempotency Key, complete request/attribution payload, ordered Upload Tokens and safe filenames after upload. Result-uncertain transport failures resend that exact component-memory snapshot. They do not create another Intent or upload. A definitive 4xx/409 requires explicit start-over with a new key and uploads; no Token enters browser persistence, URLs, Analytics or visible output.

A new disposable PostgreSQL `18.4 (Debian 18.4-1.pgdg13+1)` environment passed: SQLSTATE `23514` rollback of the dangling direct Route move and its Audit; the legal flattened move; a real advisory-lock wait and bounded closure retry; an adversarial reciprocal race with one PostgreSQL-aborted writer and a valid final graph; same-fingerprint two-Backend Inquiry convergence with exactly one Inquiry, Contact, attachment relation, History, Outbox and Audit; different-fingerprint conflict; and D03 single Apply owner/Audit rollback regression. Advisory locks and idle-in-transaction Sessions ended at zero.

Run that dedicated Harness only against an isolated non-production PostgreSQL administrative database. It creates and removes its own `cwt_joint_remediation_*` database and refuses Production mode or a missing isolation flag:

```sh
APP_ENV=test \
DATABASE_DRIVER=postgres \
DATABASE_URL='postgres://.../postgres' \
CWT_POSTGRES_JOINT_REMEDIATION_VALIDATION=isolated-test-database \
pnpm exec tsx scripts/verify-postgres-stage2c-joint-remediation.ts
```

The real Migration Harness passed Fresh/repeat and 0005, 0010, 0011, 0012, 0014, 0015 and 0016 upgrade/repeat paths; the original enum-compatibility scenarios remained green. Repeat Seed and Readiness passed with 55 tables unchanged. A real browser test let the server return 201 internally, aborted the response before the page received it, then observed an exact second payload and 200 replay with one Intent and one object upload.

This paragraph records local remediation evidence. Joint independent code review and the fresh independent Stage 2C run subsequently passed at the final candidate baseline. The approved candidate freeze is recorded above; Phase 1B remains paused.

## Historical Stage 2C validation runbook

The following safety, fixture and concurrency sections preserve the validation method used during the PostgreSQL program. They are not a newer status declaration and do not reopen the passed Stage 2C gate. Query-plan, real-provider and Backup/Restore items within the runbook remain external work exactly as listed in the current status above.

## Safety preconditions

- Use a new, isolated, non-production PostgreSQL database and independent credentials.
- Take and verify a backup before testing an upgrade copy.
- Set `DATABASE_DRIVER=postgres`, `APP_ENV=test`, the isolated `DATABASE_URL`, and `CWT_POSTGRES_VALIDATION=isolated-test-database`.
- Never point the validation command at production. The command refuses `APP_ENV=production`.
- Restore dependencies under Node 24 ARM64 with `pnpm install --frozen-lockfile` and run `pnpm env:diagnose` first.

## Automated preparation

Run `pnpm db:validate:postgres`. It applies all migrations, runs the idempotent core seed, executes the database readiness gate, confirms PostgreSQL version/timezone behavior, required PL/pgSQL triggers, the partial/unique indexes, and advisory-lock availability. It intentionally reports only a partial pass until the following multi-connection scenarios and restore drill are witnessed.

## Required upgrade fixture

Build a copy at migration 0005 containing:

- Public Ready, Private Inquiry, Import, missing-object, and deleted Assets.
- A Published Product related to both an existing Public Asset and a missing Asset.
- An Inquiry related to the Private Asset.
- Existing Conversion Events, Routes, and Redirects.

Upgrade 0000–0005 to the latest migration. Confirm every surviving historical Asset is `required/pending`, deleted rows are `manual_review`, no row becomes `passed` without a new scanner provider, result, and completion time, and `db:verify` fails while a Published entity or Inquiry references an unusable Asset. Run `pnpm assets:rescan-legacy`; confirm existing files pass, missing/rejected files stay nonpublic with a reason, and the manual list remains visible.

## Fresh database and SQL semantics

- Apply 0000 through latest to an empty database twice; the second migrate is a no-op.
- Verify deferred Primary Category constraints at COMMIT, not only statement time.
- Verify the Customer Activity and Inquiry-owner PL/pgSQL guards.
- Verify the partial unique Primary Category index and all FK delete behaviors.
- Round-trip JSONB, enums, timestamps, UTC/non-UTC client timezones, and nullable fields.
- Run core seed and test-fixture seed twice and compare counts/keys.

## Required concurrency scenarios

Use two independent PostgreSQL connections and barriers so writes overlap:

1. Competing Product Primary Category changes: exactly one authoritative relation at commit.
2. Competing Route/Redirect claims for the same path: one succeeds; no collision, loop, or chain.
3. Two public Inquiry submissions with the same Idempotency Key: one Inquiry, one Contact match, one Outbox Delivery Key.
4. Two Outbox workers claiming one pending job: exactly one lease owner.
5. Reclaim a `processing` Outbox job after `lease_expires_at`; confirm attempt count and Delivery Key remain stable.
6. Simulate provider success before the Sent update. Confirm the same provider idempotency/message key is reused and record the SMTP-provider deduplication result.
7. Competing consumption of one Upload Intent token from two sessions and from the same session: only one reservation succeeds.

## Query-plan and HTTP validation

Capture `EXPLAIN (ANALYZE, BUFFERS)` for published Product-by-route, public Asset authorization, Inquiry list by owner/status, Contact exact email match, due Outbox claim, and expired Upload Intent cleanup. Investigate sequential scans on growing relation tables. Then validate public-media revocation with the actual R2/S3 origin: no raw Bucket URL in HTML, private buckets, Phase 1A `no-store` preservation, Archive/Unlink/Delete/Rights revocation on the next request, and private Inquiry denial. A future CDN cache requires separate purge/version validation before enablement.

## Failure and restore drill

Interrupt a migration on a disposable copy, verify transactional rollback, restore the pre-upgrade backup to a new database, run integrity checks, then repeat the forward migration and rescan. Record timestamps, commands, operator, database identifiers, results, and any forward-fix migration. A production rollout remains prohibited until this evidence is approved.
