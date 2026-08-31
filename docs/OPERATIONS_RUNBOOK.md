# Operations runbook — Phase 1A

## Post-commit Finalize and Manifest evidence incidents

- A completed Batch with a completed Finalize Recovery and cancelled Public compensation is committed business success. Private staging cleanup in pending/retryable/dead state is a maintenance incident; do not downgrade the Batch, re-arm Public compensation or tell the operator that the upload failed.
- For pending Private cleanup, inspect Batch, Intent, staging Recovery, Cleanup identity/version and Audit together, then run the approved cleanup worker. Audit failure must leave the job retryable. Never manually mark cleanup completed merely because the staging object is absent.
- Before any Cleanup deletion, all locked identity fields must agree. A `dead` row with an identity-mismatch reason is manual-review evidence: preserve the object and records, investigate the divergence and use an audited remediation. Do not edit keys/foreign IDs to force deletion.
- After Migration 0015, legacy Manifest rows show `evidence_status = unverified`. This is expected and fail-closed. Run the byte-backed historical Manifest revalidation through the authorized system service/worker before expecting those Assets to satisfy public readiness. Missing objects, MIME/size mismatch or failed Audit remain unverified and must not be bypassed.
- Upgrade order now includes Migration 0015 after 0014. It aborts on orphan Finalize Recovery references or incomplete Finalize Cleanup identity; resolve such rows through a reviewed, audited data-remediation plan rather than deleting evidence. Back up database/storage first and re-run Fresh/Upgrade verification before deployment authorization.

## Upgrade order for existing Phase 1A data

1. Back up the database and all storage partitions.
2. Apply migration 0007. Do not serve traffic as ready.
3. Run `pnpm assets:rescan-legacy`; stale interrupted claims older than 15 minutes are reclaimed automatically. Resolve every missing/rejected item required by a Published entity or Inquiry, then retry one repaired item with `pnpm assets:rescan-legacy --retry-manual {assetId}`.
4. Apply migrations 0008–0015. Review every Product marked `publication_remediation_required`; never manufacture basis evidence. Reconfirm with an active Reviewer/Publisher or Admin, complete the normal In Review workflow, and republish only after current localization, route, image and verified Manifest-evidence gates pass.
5. Inspect Source Declaration rows whose Effective Rights is Pending Review, Not Allowed, Revoked, Expired, or Restricted. Turning the UI switch off is not remediation. Only an authorized current-record-version review or reason-required Admin Override may change the effective decision.
6. Verify server Consent storage and that `conversion_events` contains no Inquiry column before enabling any analytics adapter.
7. Run `pnpm cleanup:objects` until no due cleanup job remains; investigate every `dead` row and its `object_cleanup.dead` Audit before serving traffic.
8. Run `pnpm db:verify`; it must not pass while a public/private relation is broken.
9. Run retention preview for expired Upload Intents, then an approved execution.
10. Run the full gate and external PostgreSQL/R2 checklist before deployment authorization.

Outbox workers use 60-second leases and a stable Delivery Key. Monitor `processing` past lease, `failed` and `dead`; never manually mark Sent without provider evidence.

## Local release verification

Use Node 24.14 and pnpm 11.9. Apply migrations, run both repeatable seeds as needed, run `db:verify`, then execute `check:all`. Synthetic fixtures are local/test-only and noindex. Never use the development user, PGlite database, local storage, log email, in-memory limiter, or development scanner in production.

For an Option F Candidate, build once from the clean committed implementation source and retain the exact OCI index, both children and detached evidence. Validate both children locally/Synthetically, then create the append-only Staging transition for the exact current-host child. Promotion authorization may be appended only for that same index and child after every accepted gate. Never rebuild after Staging and substitute the replacement, use a tag as identity, edit a transition in place or restore a revoked subject.

The only repository-authorized protected Staging start is the installed zero-argument `/usr/local/sbin/cwt-staging-start` described by `deploy/host/README.md`. There is no authorized raw Compose start. Ordinary `INT`, `TERM` and `HUP` are deferred while one FD9/lifecycle tree settles. Do not use `SIGKILL`. If all FD9 holders are lost, stop every local lifecycle action, preserve read-only evidence, report and escalate; do not rerun the gate, roll back locally or treat time/events/snapshots as re-entry authority.

Registry readers can obtain the accepted Next framework material, so registry read access is security-sensitive. Keep immutable digest storage private, least-read and audited; retain one separately protected complete replica and the detached evidence. If every subject or required evidence copy is lost, record `NEW_RELEASE_REQUIRED` and begin a newly authorized release. Do not infer or reconstruct the old digest.

## Migration and rollback

Back up the target database before a production migration. Apply committed migrations in order and run relationship verification. Application rollback may use the preceding release only when its schema remains forward-compatible. Destructive or data-rewriting migrations require a separate approved ADR, rehearsed restore, and explicit maintenance plan; none exist in Phase 1A.

PostgreSQL migrations must use `pnpm db:migrate`, never an application Web process or a manual copy of hidden SQL. ADR-0010 gives this entry one dedicated `max: 1` client and a Session Advisory Lock. `LOCK_UNAVAILABLE` means another migration process owns the boundary; do not bypass the lock. An enum compatibility identity, Journal/catalog, enum-order, Backend PID or final-verification error is fail-closed: preserve the database, capture sanitized command/SQLSTATE/Journal/catalog evidence and escalate. Do not edit 0011, add a manual Journal row, rerun 0013 alone or move the frozen Tag.

If execution stops after the enum preflight commits, Journal 0010 plus correctly ordered `finalizing` is a recognized recovery state. Re-running the same standard command is the supported recovery; it must not ask an operator to add the enum again. The compatibility branch may be retired only after separately approved evidence proves that no supported deployment or backup remains at 0010.

## Backups and restore

Production PostgreSQL point-in-time recovery, object versioning/lifecycle, backup ownership, retention, encryption, and a restore rehearsal require the selected providers. Deployment is blocked until a documented restore exercise proves recovery to an isolated environment. Do not treat a provider's “backup enabled” indicator as a restore test.

## Upload and scan incidents

Unknown or failed scans remain quarantined and are not publicly released. Verify scanner health, do not bypass scanning, and use Audit Logs plus request references without copying customer content into logs. Private/public/import storage boundaries remain intact during incident handling. Rotate exposed object-store credentials and invalidate grants if private access is suspected.

For a failed upload or Asset Finalize, inspect the Batch, Intent/Asset, `upload_recovery_jobs` and `object_cleanup_jobs` together. Run `pnpm cleanup:objects`; it first reconciles/reclaims due or expired upload-recovery leases, then retries idempotent object deletions. A Batch in `finalizing` must have a live or recoverable Finalize row. A missing/completed/dead mismatch is repaired through the audited system reconciliation path and remains explicitly failed/retryable—not silently reset. Do not manually clear leases or mark a job completed. An Audit outage must leave the row reclaimable. A `dead` recovery/cleanup row or its Audit requires operator escalation, provider diagnostics and an explicit retried/remediated record before a new authorized Finalize claim. Keep provider buckets private; a copied object must never be reachable except through the governed media route.

For Finalize incidents, also inspect `finalize_object_manifest_items`. `standby` Cleanup is expected while the Finalize lease is valid and must never be manually armed merely because time passed. Recovery after lease expiry reconstructs missing Cleanup projections from the latest durable Manifest attempt and writes an Audit. If a Manifest projection mismatch is marked `dead`, preserve it for manual investigation; do not delete an unverified key. An Audit outage must roll back failure arming or reconciliation state, leaving the Recovery lease/job discoverable for retry.

## Retention

`pnpm retention:preview` reports expired private inquiry assets and abandoned/failed Upload Intents without deleting them. `pnpm retention:execute` deletes eligible stored objects, retains deleted database records, expires Intent state, and adds Audit Logs. Production scheduling and execution are blocked until the project/legal retention values are approved and a backup/restore policy exists.

## Inquiry and email incidents

An Inquiry and its notification-outbox item are committed in one transaction. A notification outage must alert operations; do not ask the buyer to resubmit blindly. Run `pnpm outbox:process` from the approved scheduler/worker context to deliver due rows. Delivery failures increment attempts, schedule a retry, and eventually mark a row dead for operator investigation. Development logs omit PII. Production scheduling and alert thresholds must be configured before launch.

## Test isolation

Playwright creates a fresh per-run temporary PGlite database, Public/Private/Import storage roots, and test-only Auth Cookie, then validates and deletes only that recognized temporary directory during teardown. Local development, E2E, Preview, and Production resources must never be shared.

## Redirect and SEO incidents

Do not edit a published path outside the route service. Resolve redirect conflicts, loops, or chains before publishing; never redirect unrelated removals to Home. Non-production remains noindex. A production indexing incident triggers robots, response-header, canonical, route ownership, and sitemap checks before cache purge.

## Credentials, monitoring, and emergency controls

Rotate database, S3, SMTP, scanner, rate-limit, auth-session, analytics, and monitoring credentials independently. Feature flags can disable Refine shell exposure and future optional modules, but cannot bypass domain security. Production monitoring/alerts and provider-specific runbooks remain blocked on account selection and explicit deployment approval.

## S6-05 health, work and log hooks

- `/api/health/live/` is process-only and must remain independent of configuration files, database, Valkey, storage and every external Provider.
- `/api/health/ready/` is the sole application readiness authority. HTTP `200` means the fixed configuration/storage/database/Valkey/local-dependency checks passed within their deadlines; HTTP `503` means at least one failed. Its body exposes only `ready`/`not_ready` and fixed component pass/fail states. Never add raw errors, paths, hostnames, identifiers, payloads or credential metadata.
- The root Production and Staging protected environment maps are the sole Web bind authority: exact `HOSTNAME=0.0.0.0`, inherited by the unchanged `node .next/standalone/server.js` command. The unchanged Compose healthcheck must remain on exact loopback `http://127.0.0.1:3000/api/health/ready/`. Missing, empty, service-only, hostname-derived or alternate-target overrides are unsupported and fail the Compose gate.
- Readiness performs no Cloudmersive, Sentry, AI, SMTP, Tencent or uptime call and consumes no Provider quota. External uptime may observe the route only after separate account/deployment authorization.
- The redacted work-health hook classifies Outbox backlog older than 30 minutes, repeated delivery failures, dead Outbox work, terminal AI Worker failures and daily database backup completion older than 26 hours. It emits aggregate counts only. Exit `2` is an operationally unhealthy observation and does not reverse or misreport an already committed Inquiry, Outbox delivery, Upload Finalize or cleanup business success; investigate the durable records under their existing runbooks.
- Missing backup completion is expected to remain unhealthy until the separately implemented S6-06 backup authority creates valid environment-specific completion evidence. Never fabricate or manually edit a completion marker to make health pass.
- Image decode and derivative work share one process-local bounded semaphore: one active operation and at most eight waiting operations. Capacity refusal is backpressure, not permission to start a parallel path. Accepted AI text concurrency remains two and is independent.
- All application/container operational output stays on Docker `journald`. The future authorized Linux host installs the exact `deploy/monitoring/journald-cwt.conf` template for a 14-day/4-GiB bound. Do not enable a second JSON/file log path or log payloads/raw errors.
- External monitoring is optional and provider-neutral. Its event boundary permits only fixed codes, environment/release identity and scrubbed allowlisted attributes. Transport failure is non-critical telemetry failure; journald/readiness/work exit codes remain authoritative. Zoho/SMTP cannot be the only critical alert channel.

These are local implementation hooks, not proof of target-host journald behavior, external delivery, protected credentials or Production readiness. Provider/host activation remains HOLD.
