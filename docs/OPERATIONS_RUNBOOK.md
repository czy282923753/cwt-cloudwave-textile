# Operations runbook — Phase 1A

## Local release verification

Use Node 24.14 and pnpm 11.9. Apply migrations, run both repeatable seeds as needed, run `db:verify`, then execute `check:all`. Synthetic fixtures are local/test-only and noindex. Never use the development user, PGlite database, local storage, log email, in-memory limiter, or development scanner in production.

## Migration and rollback

Back up the target database before a production migration. Apply committed migrations in order and run relationship verification. Application rollback may use the preceding release only when its schema remains forward-compatible. Destructive or data-rewriting migrations require a separate approved ADR, rehearsed restore, and explicit maintenance plan; none exist in Phase 1A.

## Backups and restore

Production PostgreSQL point-in-time recovery, object versioning/lifecycle, backup ownership, retention, encryption, and a restore rehearsal require the selected providers. Deployment is blocked until a documented restore exercise proves recovery to an isolated environment. Do not treat a provider's “backup enabled” indicator as a restore test.

## Upload and scan incidents

Unknown or failed scans remain quarantined and are not publicly released. Verify scanner health, do not bypass scanning, and use Audit Logs plus request references without copying customer content into logs. Private/public/import storage boundaries remain intact during incident handling. Rotate exposed object-store credentials and invalidate grants if private access is suspected.

## Retention

`pnpm retention:preview` reports expired private inquiry assets without deleting them. `pnpm retention:execute` deletes eligible stored objects, retains a deleted database record, and adds an Audit Log. Production scheduling and execution are blocked until the project/legal retention values are approved and a backup/restore policy exists.

## Inquiry and email incidents

An inquiry transaction is stored before notification. A notification outage must alert operations and be retried by an approved operational process; do not ask the buyer to resubmit blindly. Development logs omit PII. Formal retry queues are not part of Phase 1A and must be added before high-volume operation.

## Redirect and SEO incidents

Do not edit a published path outside the route service. Resolve redirect conflicts, loops, or chains before publishing; never redirect unrelated removals to Home. Non-production remains noindex. A production indexing incident triggers robots, response-header, canonical, route ownership, and sitemap checks before cache purge.

## Credentials, monitoring, and emergency controls

Rotate database, S3, SMTP, scanner, rate-limit, auth-session, analytics, and monitoring credentials independently. Feature flags can disable Refine shell exposure and future optional modules, but cannot bypass domain security. Production monitoring/alerts and provider-specific runbooks remain blocked on account selection and explicit deployment approval.
