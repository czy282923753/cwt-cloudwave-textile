# PostgreSQL External Validation — Phase 1A

Status: PostgreSQL Stage 2A **Passed**; PostgreSQL 18.4 ARM64 Stage 2B **Passed**; Stage 2C-1 remains **stopped**. Independent review confirmed the Pre-Manifest Recovery High is fixed. The remaining retryable-Asset Admin operability Medium has local remediation evidence and awaits independent code review, after which Stage 2C-1 must be rerun completely from a new database. Remaining Stage 2C work is stopped, complete PostgreSQL External Validation and Production readiness have not passed, and Phase 1B remains paused.

## Stage 2B independent acceptance — 2026-08-02

| Acceptance field | Result |
| --- | --- |
| PostgreSQL | **18.4 ARM64** |
| Stage 2A / Stage 2B | **Passed / Passed** |
| Candidate code baseline | `4b092be396ca54a3e6fe6ec37dc75a7d327ea146` |
| Blocker / High / Medium | **0 / 0 / 0** |
| Low | **1 non-blocking Harness automation debt** |
| Code review | **Passed** |
| Stage 2C | **Stage 2C-1 failed; remediation pending independent rerun** |
| Production Ready | **No** |

Independent evidence passed Fresh and repeat Migration; upgrades from 0005, 0010, 0011, 0012 and 0014; the original SQLSTATE `55P04` path; Journal and original 0011 hash preservation; and catalog verification for 55 tables, 44 enums and 6 triggers. Constraint behavior, idempotent Seed and Readiness checks passed. Identifier truncation produced no actual collision. The evidence worktree was clean and used no formal data or production credential.

The retained Low is Harness automation debt: the formal Harness does not yet automate direct termination of a running Migrator Backend or competition between two operating-system Migration processes. Independent review used temporary real fault injection to validate the current implementation safely. The debt does not block Stage 2B and may be completed during future Migration Harness maintenance.

This acceptance is deliberately bounded. It does not mean Stage 2C concurrency/locking/deadlock/query-plan/backup-restore validation, R2/S3, SMTP, deployment or complete PostgreSQL External Validation has passed.

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

The Harness creates and destroys only random databases prefixed `cwt_enum_compat_`. It covers Fresh/repeat, 0005, 0010, 0011, 0012 and 0014 upgrades, the standard command entry, preflight interruption/recovery, enum transaction failure, 0011/0013 rollback, competing migration clients, backend termination and fail-closed Journal/catalog contradiction. The 2026-08-02 implementation run passed against PostgreSQL `18.4 (Debian 18.4-1.pgdg13+1)`, and independent PostgreSQL 18.4 Stage 2B review subsequently accepted the bounded result. Stage 2C remains a separate stopped gate.

## Stage 2C-1 retryable Asset Admin recovery remediation — local evidence

The server-side legal pre-Manifest handoff already preserves the original Batch, Session-bound Intents, Private/Internal Assets, Staging objects and retryable Finalize Recovery. Asset Library now obtains eligible handoffs only through the Upload Domain Service and retries the original `batchId` through the existing Finalize API. It does not create another Intent, upload, Asset, relation path, status, Worker or Recovery type.

A new disposable PostgreSQL `18.4 (Debian 18.4-1.pgdg13+1)` database with two independent connections verified: the current actor can query the original retryable Batch; the original Finalize completes; no Intent or Asset is duplicated; exactly one intended relation is created; the stale Worker remains fenced; and the run ends with zero idle-in-transaction sessions and zero residual locks. The disposable remediation container was removed after the run, and the independent Stage 2C evidence environment was not modified.

This is implementation evidence, not Stage 2C-1 acceptance. Independent code review and a complete Stage 2C-1 rerun from a new database remain required. The retained non-blocking Low is the previously recorded Harness automation debt for direct Migrator Backend termination and two operating-system Migration processes.

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
