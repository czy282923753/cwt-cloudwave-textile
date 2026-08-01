# Testing and Phase 1A acceptance

## Remediation Round 3 gates

Acceptance adds historical/direct-database Product fail-closed reads, migration demotion queue, Effective Rights independent of declaration UI state, optimistic Source Declaration record versions and atomic Audit rollback, public analytics/CRM separation, server-persisted revocable Consent, streaming actual-byte limits, and Fabric/Content role-MIME readiness. Original assertions remain; no critical test is skipped.

## Remediation Round 2 gates

Acceptance includes 0000–0005 Asset upgrade/rescan fixtures, Product real-basis and image-MIME publication gates, declaration separation/override, public media revocation, top-level analytics privacy/replay/consent, Outbox lease recovery, Upload Intent Session binding and pre-body guards, controlled private-attachment denial, consent UI, dynamic Open Graph/Breadcrumb output and stale-build rejection. Real PostgreSQL scenarios are in `POSTGRESQL_EXTERNAL_VALIDATION.md` and remain **External Validation Required**.

## Required checks

- Production build, lint, strict TypeScript, unit, database/migration integration, idempotent seed, permission matrix, audit, publishing/index separation, redirects, SEO outputs, upload/scanning/isolation, inquiry variants, contact matching, CRM activities, conversion PII blocking, critical E2E, mobile, accessibility, and public-bundle isolation.

## Prohibited shortcuts

Do not delete or skip critical tests, weaken strict TypeScript, use `any` to conceal issues, disable lint rules to hide failures, swallow exceptions, suppress failures, or label incomplete work complete.

## Real data boundary

Synthetic fixtures validate the system only. Real product launch, authenticity, and final SEO quality remain `Waiting for Real Product Data Validation` until 10–15 real products and authorized imagery are supplied.

## Reporting

Record command results, migrations, role tests, route/SEO checks, upload security, CRM flows, bundle checks, accessibility, performance, placeholders, known issues, and blocked external requirements.

## Phase 1A Remediation Round 3 local evidence

- Environment: Node 24.14.0 arm64, pnpm 11.9.0, Sharp 0.35.3, Lightning CSS 1.32.0 and Next SWC 16.2.12 native modules load successfully.
- Static quality: ESLint has zero warnings; strict TypeScript passes; Drizzle schema check passes.
- Vitest: 35 files and 81 tests pass, including all Migration, repeatable Seed, readiness, rights concurrency/rollback, Consent/privacy, upload stream and role/MIME cases.
- Production build: all 39 static-generation units and dynamic routes complete under Next.js 16.2.12.
- Public Bundle: 20 public page manifests and 29 manifest/chunk files contain no Refine/admin dependency.
- Playwright: 15/15 pass across Desktop Chromium and Pixel 7. The original 14 scenarios remain active, plus governed Asset Library UI coverage. Home has no Critical/Serious Axe violation, mobile has no horizontal overflow, and all 11 principal public paths return HTTP 200.
- Local persistent data: migrations 0000–0009 apply; core and Fixture Seed each repeat safely; 12 synthetic Products remain In Review/Noindex unless a test explicitly confirms and publishes inside an isolated E2E database; readiness has zero invalid relations.
- Dependency audit: no known production vulnerabilities.

Real PostgreSQL, provider storage, provider analytics and production field performance remain external validation, not local pass claims.

## Phase 1A Remediation Round 2 local evidence

- Strict TypeScript and ESLint: pass with no suppressed errors or warnings.
- Vitest: 32 files and 68 unit/integration/route tests pass, including 0000–0005 upgrade/rescan, delivery revocation, Upload Intent cleanup, Outbox leases, analytics privacy, declaration separation and pre-body guards.
- Playwright: 14 desktop/mobile business-flow and public-surface scenarios pass in an isolated per-run environment with no skipped applicable scenarios.
- Production build: all 38 static-generation units and dynamic routes complete successfully under Next.js 16.2.12.
- Public bundle: all 20 non-admin public page manifests and 29 referenced manifest/chunk files contain no Refine/admin module.
- Database: migrations `0000`–`0007` apply repeatedly in PGlite; 18 historical local Assets rescan with fresh evidence; core and 12-Product fixture seeds are repeatable; the readiness report has zero invalid or pending public/private relations.
- Security audit: `pnpm audit --prod` reports no known vulnerability.
- Accessibility: automated critical/serious Axe violations are zero on the tested Home surface in desktop and mobile projects; mobile viewport has no horizontal overflow.
- Real PostgreSQL: not verified because this workstation exposes neither Docker nor PostgreSQL. This remains **External Validation Required** and Phase 1A external database acceptance must not be claimed until the documented matrix passes.

These local measurements are evidence, not a production SLA. Production performance/Core Web Vitals and SEO crawling must be rechecked after the formal domain, CDN, analytics consent, real assets, and hosting configuration exist.
