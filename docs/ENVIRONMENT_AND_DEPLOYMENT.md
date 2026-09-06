# Environment and deployment

## Reproducible local runtime

The accepted local runtime is Node 24.14.0 ARM64 with pnpm 11.9.0. Restore dependencies with `pnpm install --frozen-lockfile`; do not reuse x64 `node_modules` or stale `.next`. Run `pnpm env:check` and read-only `pnpm env:diagnose` to print Node/platform/architecture/pnpm and exercise Sharp, Lightning CSS and SWC bindings.

The locked application framework set remains Next.js 16.2.12, React/React DOM 19.2.8, TypeScript 5.9.3, Drizzle ORM 0.45.2, and Refine Core 5.0.12 with Next router 7.0.5. Round 2 did not upgrade these framework versions.

## Stage 6 Option F release image

The implementation release boundary is one trusted `pnpm build:release-once -- --output <absolute-empty-path>` execution from a clean committed source. Dependency acquisition produces hash-inventoried per-platform inputs outside Git. One subsequent network-none, no-cache Buildx invocation emits one ordered OCI index (`linux/amd64`, then `linux/arm64`) with attached SBOM/provenance disabled. The existing `deploy/scripts/preflight-image.mjs` is the sole digest/evidence lifecycle checker.

The immutable built record freezes source commit/tree/archive/epoch, index, both child manifests/configs/layers/diff IDs, tool pins, framework schema counts and detached per-child SBOM/scan/provenance hashes. Append-only records permit only `built -> staging_validated -> promotion_authorized` for the same index and the same selected host child. Tags, wrong/rebuilt indexes, wrong children/configs/order, stale evidence and revoked subjects fail before lifecycle action. Independent rebuild equality is optional, nonblocking evidence and never a hidden promotion gate.

The same image may share only Next 16.2.12 build-generated Preview/Draft and Server Actions material. Values and hashes are never emitted. Database, auth/session, Valkey, scanner, SMTP, AI/API, storage/COS, Admin, analytics/monitoring and backup secrets remain runtime-only and environment-private. Runtime proxy policy, root Metadata, robots and sitemap are dynamic: Production is indexable with HSTS; Staging has HSTS plus noindex. This changes application routes from prior ISR/static classification to runtime rendering; capacity and cache behavior require proportional protected-environment validation before Stage 7.

`compose.yaml` is the sole topology authority and accepts only the immutable index reference plus the exact selected child identity. Production and on-demand Staging on the current single host must select the same child. Every future intended Production child requires its own staging-like validation first; mixed-architecture replicas inside one environment are unauthorized.

`TRUSTED_PROXY_MODE` is `none` locally and must explicitly be `cloudflare` or `vercel` in production. Upload Intent and JSON size/TTL limits are environment variables. Production public storage remains origin-private and does not require or expose a permanent public Asset base URL.

## Environments

Local, test, Staging, and Production do not share databases, storage, secrets, authentication, or analytics configuration. Non-production is noindex. Preview is an authenticated route capability inside an environment, not a deployment environment or session authority.

## Local substitutes

Local/independent PostgreSQL, MinIO or a development storage adapter, a local mail catcher, disabled analytics/search-data adapters, test auth secrets, synthetic fixtures, local logs, and a development scan adapter are permitted when explicitly flagged.

## Production gates

Production requires approved accounts and secrets, verified domain/DNS, formal email/WhatsApp, database backups and restore access, private/public storage policies, real malware scanning, monitoring/alerts, approved retention, privacy/terms, and verified public content.

Production deployment, DNS modification, external pushes, formal product/customer imports, and irreversible external actions require explicit approval.

Stage 6 local/Synthetic evidence does not prove an external CI or registry. Before activation, verify private immutable registry retention, deny overwrite/early deletion, least-read audit, one protected complete replica and detached-evidence retention. Total subject/evidence loss is `NEW_RELEASE_REQUIRED`; it never authorizes reconstruction or promotion under an old record. The exact locked Staging gate and total-FD9-holder-loss fail-stop procedure are documented in `deploy/host/README.md`.

## Secrets

Only variable names and descriptions are committed. Startup validation rejects invalid or missing production-critical values. Placeholder or disabled integrations must never silently run in production.

## Implemented configuration groups

- Runtime/indexing: `APP_ENV`, `NEXT_PUBLIC_SITE_URL`, `NON_PRODUCTION_NOINDEX`.
- Database: `DATABASE_DRIVER`, `DATABASE_URL`, `PGLITE_DATA_DIR`.
- Authentication/consent: `AUTH_SESSION_SECRET`, `AUTH_COOKIE_NAME`, `ANALYTICS_CONSENT_COOKIE_NAME`, local-only admin fixture credentials.
- Storage: local roots or S3 endpoint/region/credentials and three isolated origin buckets. There is no permanent public Asset base URL.
- Upload controls: public/inquiry byte limits, file-count limit, scanner endpoint/token, private URL TTL, retention periods, and rate-limiter endpoint/token.
- Communications: log/SMTP adapter, sender, inquiry recipient, SMTP transport, and WhatsApp.
- Analytics/operations: disabled/GA4 adapter, GSC site URL, and monitoring driver.
- Feature flags: Refine shell, optional source declaration, AI, and SEO Assistant.

The committed `.env.example` uses local-only development values, disables analytics/AI/SEO Assistant, and keeps Source Declaration OFF. Under accepted ADR-0013, protected Staging and Production require `STORAGE_DRIVER=local` with the exact environment-specific, canonical, absolute and nonoverlapping Public, Private and Import roots enforced by `src/config/env.ts`; these hardened local host volumes are the sole online media origin for the initial topology. Startup refuses PGlite, any other storage driver, missing or incorrect protected roots, development scanning, memory rate limiting, log email, missing WhatsApp, missing approved retention, an incorrect site origin, or local monitoring. S3-compatible storage remains a future migration target, and COS remains backup-only until a separately authorized migration; neither is a simultaneous online-origin fallback.

## Local S6-06 backup integration

The Scheduler has two environment-private writable roots: `/srv/cwt/backups/postgresql/{environment}` for daily/pre-deploy sets and `/srv/cwt/backups/sets/{environment}` for weekly work/read-back/cache. Provision UID/GID `10001:10001`, directories `0700`, files `0600`; Web/Worker receive no backup mount. A read-only file mount of root-provisioned `/run/lock/cwt/backup-migration.lock` provides one Linux mutex for both environments' backups and direct Migration, acquired before DB probing. The nested pre-deploy path inherits descriptor 8. Host lifecycle FD9 and per-Scheduler job overlap controls remain unchanged.

[ADR-0021](adr/ADR-0021-environment-provider-egress-and-backup-budget.md) approves `production-outbound` for Production Web/Scheduler and `staging-outbound` for Staging Web/Scheduler/AI Worker, both ordinary Compose bridges with `internal: false` and `gw_priority: 1`. Production AI Worker stays dormant/internal. Database/cache/ingress networks, secret grants, public proxy ports, cgroups and Staging headroom remain unchanged. This is general outbound routing, not a hostname filter. The connection allocation is **13 application + 2 weekly backup = 15/30**, with 15 reserve; no Scheduler-slot borrowing, concurrent environment backups or backup/Migration overlap.

The next Candidate image packages PostgreSQL 18.4 clients, SHA-256 tools, `flock`, Restic 0.19.1 and `deploy/backup`. Tool acquisition enters the existing per-platform dependency bundle; final build remains network-none. This source change does not modify or add files to any already emitted immutable image. Integrated successor packaging/runtime validation and its separately authorized Build Once are still required.

Cron runs daily PostgreSQL backup at 03:31, weekly complete-set entry at 04:43 Sunday, and work-health every five minutes; verify timezone before activation. Protected weekly execution selects the matching private COS repository from non-secret `BACKUP_COS_REPOSITORY` and existing secret-file grants, with no local fallback. Only Synthetic tests use a local Restic repository. Verify the exact new snapshot once, perform one full repository integrity pass and check older metadata before four-valid retention. Post-admission maintenance failure remains separately reported. COS initialization/private policy, real Provider egress, independent failure alerts and target-host capacity require separately authorized external validation before O-20 can pass; see [the backup runbook](../deploy/backup/README.md).

Before a major deployment/Migration, invoke `deploy/backup/pre-deploy` with the approved change command inside the matching scheduler one-shot boundary. It creates and verifies a new extra backup before executing that command; an existing marker or old dump cannot satisfy it. This wrapper does not authorize bypassing the existing host lifecycle/start gate. Keep Production and Staging normally running/stopped according to their existing policy.
