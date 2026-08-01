# Environment and deployment

## Environments

Local, test, preview, and production do not share databases, storage, secrets, authentication, or analytics configuration. Non-production is noindex.

## Local substitutes

Local/independent PostgreSQL, MinIO or a development storage adapter, a local mail catcher, disabled analytics/search-data adapters, test auth secrets, synthetic fixtures, local logs, and a development scan adapter are permitted when explicitly flagged.

## Production gates

Production requires approved accounts and secrets, verified domain/DNS, formal email/WhatsApp, database backups and restore access, private/public storage policies, real malware scanning, monitoring/alerts, approved retention, privacy/terms, and verified public content.

Production deployment, DNS modification, external pushes, formal product/customer imports, and irreversible external actions require explicit approval.

## Secrets

Only variable names and descriptions are committed. Startup validation rejects invalid or missing production-critical values. Placeholder or disabled integrations must never silently run in production.

## Implemented configuration groups

- Runtime/indexing: `APP_ENV`, `NEXT_PUBLIC_SITE_URL`, `NON_PRODUCTION_NOINDEX`.
- Database: `DATABASE_DRIVER`, `DATABASE_URL`, `PGLITE_DATA_DIR`.
- Authentication: `AUTH_SESSION_SECRET`, `AUTH_COOKIE_NAME`, local-only admin fixture credentials.
- Storage: local roots or S3 endpoint/region/credentials and three separate bucket names, plus public CDN base URL.
- Upload controls: public/inquiry byte limits, file-count limit, scanner endpoint/token, private URL TTL, retention periods, and rate-limiter endpoint/token.
- Communications: log/SMTP adapter, sender, inquiry recipient, SMTP transport, and WhatsApp.
- Analytics/operations: disabled/GA4 adapter, GSC site URL, and monitoring driver.
- Feature flags: Refine shell, optional source declaration, AI, and SEO Assistant.

The committed `.env.example` uses local-only values, disables analytics/AI/SEO Assistant, and keeps Source Declaration OFF. Production startup refuses PGlite/local storage, missing isolated buckets/CDN, development scanning, memory rate limiting, log email, missing WhatsApp, missing approved retention, local URL, or local monitoring.
