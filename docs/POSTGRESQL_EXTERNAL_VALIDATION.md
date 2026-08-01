# PostgreSQL External Validation — Phase 1A Remediation Round 2

Status: **External Validation Required**. No Docker or PostgreSQL server was installed by this remediation.

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
