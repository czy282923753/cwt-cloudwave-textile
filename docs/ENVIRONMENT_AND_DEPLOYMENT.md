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
