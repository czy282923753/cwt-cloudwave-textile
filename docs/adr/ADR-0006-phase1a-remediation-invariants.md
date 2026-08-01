# ADR-0006: Phase 1A remediation invariants and fail-closed boundaries

Status: Accepted implementation decision under frozen V1.1  
Date: 2026-08-01

## Context

Independent review found that several frozen policies were represented in UI or application checks but were not consistently protected across direct service calls, erroneous database links, concurrent writes, retries, and public delivery. The remediation must strengthen enforcement without changing the approved Product, URL, publishing, CRM, or modular-monolith model.

## Decision

- Keep one authoritative Product Primary Category in `product_taxonomy_terms`; enforce exactly one primary row with a deferred database constraint.
- Protect Route and Redirect namespaces with transactional advisory locking plus database triggers that reject collisions, missing destinations, loops, and chains. Published Slug changes return HTTP 301.
- Treat approved Published data as the live version. Product, Application, Fabric Library, and Content changes create latest-only Editorial Revisions until Reviewer/Publisher or Admin approval.
- Authorize every public Asset delivery by storage/access/processing/scan/deletion state and by a live association with a Published entity. Authorize every Inquiry attachment by private boundary and record ownership.
- Scope raw CRM records to Admin or the assigned Sales user. Analyst remains aggregate-only.
- Commit Inquiry, Idempotency Key, submitted snapshots, status history, and notification outbox atomically. Notification transport is retryable and does not determine submission success.
- Deduplicate Conversion Events by Event ID, honor consent, validate linked entity publication, and accept only per-event allowlisted non-PII properties.
- Re-evaluate entity quality inside sitemap queries and keep non-production robots, metadata, sitemap, and headers consistently Noindex.
- Run E2E with per-run isolated database, storage roots, and Auth Cookie. Inspect every non-admin public manifest and referenced chunk from a fresh production build.

## Consequences

The database migration adds backfill and constraint logic, new CRM/analytics fields, Asset scan state, and a notification-outbox table. Domain services become the only workflow entry points, while database constraints provide a second line of defense. Some local checks are heavier, but they are deterministic and test direct-write failure modes. Real PostgreSQL validation remains mandatory because PGlite cannot be the final acceptance engine.

## Compatibility and rollback

The migration first copies the former Product primary-category value into the authoritative relation and validates every Product before dropping the duplicate column. Application rollback is safe only to a build compatible with migration `0006`; reverting the schema requires a reviewed data migration and restore plan. No public URL namespace or frozen business model changes.
