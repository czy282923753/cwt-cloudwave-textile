# Operations runbook — Phase 1A

## Upgrade order for existing Phase 1A data

1. Back up the database and all storage partitions.
2. Apply migration 0007. Do not serve traffic as ready.
3. Run `pnpm assets:rescan-legacy`; stale interrupted claims older than 15 minutes are reclaimed automatically. Resolve every missing/rejected item required by a Published entity or Inquiry, then retry one repaired item with `pnpm assets:rescan-legacy --retry-manual {assetId}`.
4. Apply migrations 0008–0011. Review every Product marked `publication_remediation_required`; never manufacture basis evidence. Reconfirm with an active Reviewer/Publisher or Admin, complete the normal In Review workflow, and republish only after current localization, route and image gates pass.
5. Inspect Source Declaration rows whose Effective Rights is Pending Review, Not Allowed, Revoked, Expired, or Restricted. Turning the UI switch off is not remediation. Only an authorized current-record-version review or reason-required Admin Override may change the effective decision.
6. Verify server Consent storage and that `conversion_events` contains no Inquiry column before enabling any analytics adapter.
7. Run `pnpm cleanup:objects` until no due cleanup job remains; investigate every `dead` row and its `object_cleanup.dead` Audit before serving traffic.
8. Run `pnpm db:verify`; it must not pass while a public/private relation is broken.
9. Run retention preview for expired Upload Intents, then an approved execution.
10. Run the full gate and external PostgreSQL/R2 checklist before deployment authorization.

Outbox workers use 60-second leases and a stable Delivery Key. Monitor `processing` past lease, `failed` and `dead`; never manually mark Sent without provider evidence.

## Local release verification

Use Node 24.14 and pnpm 11.9. Apply migrations, run both repeatable seeds as needed, run `db:verify`, then execute `check:all`. Synthetic fixtures are local/test-only and noindex. Never use the development user, PGlite database, local storage, log email, in-memory limiter, or development scanner in production.

## Migration and rollback

Back up the target database before a production migration. Apply committed migrations in order and run relationship verification. Application rollback may use the preceding release only when its schema remains forward-compatible. Destructive or data-rewriting migrations require a separate approved ADR, rehearsed restore, and explicit maintenance plan; none exist in Phase 1A.

## Backups and restore

Production PostgreSQL point-in-time recovery, object versioning/lifecycle, backup ownership, retention, encryption, and a restore rehearsal require the selected providers. Deployment is blocked until a documented restore exercise proves recovery to an isolated environment. Do not treat a provider's “backup enabled” indicator as a restore test.

## Upload and scan incidents

Unknown or failed scans remain quarantined and are not publicly released. Verify scanner health, do not bypass scanning, and use Audit Logs plus request references without copying customer content into logs. Private/public/import storage boundaries remain intact during incident handling. Rotate exposed object-store credentials and invalidate grants if private access is suspected.

For a failed Asset Finalize, inspect the Batch and its `object_cleanup_jobs`. Run `pnpm cleanup:objects`; it safely reclaims expired leases and retries due deletions. Do not manually mark a job completed without verifying the exact partition/key is absent. A `dead` job or `object_cleanup.dead` Audit requires operator escalation, provider diagnostics and an explicit retried/remediated record before retrying Finalize. Keep provider buckets private; a copied object must never be reachable except through the governed media route.

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
