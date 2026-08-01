# Testing and Phase 1A acceptance

## Required checks

- Production build, lint, strict TypeScript, unit, database/migration integration, idempotent seed, permission matrix, audit, publishing/index separation, redirects, SEO outputs, upload/scanning/isolation, inquiry variants, contact matching, CRM activities, conversion PII blocking, critical E2E, mobile, accessibility, and public-bundle isolation.

## Prohibited shortcuts

Do not delete or skip critical tests, weaken strict TypeScript, use `any` to conceal issues, disable lint rules to hide failures, swallow exceptions, suppress failures, or label incomplete work complete.

## Real data boundary

Synthetic fixtures validate the system only. Real product launch, authenticity, and final SEO quality remain `Waiting for Real Product Data Validation` until 10–15 real products and authorized imagery are supplied.

## Reporting

Record command results, migrations, role tests, route/SEO checks, upload security, CRM flows, bundle checks, accessibility, performance, placeholders, known issues, and blocked external requirements.

## Phase 1A remediation local evidence

- Strict TypeScript and ESLint: pass with no suppressed errors.
- Vitest: 22 files and 44 unit/integration tests pass, including fresh and upgrade migration paths.
- Playwright: 12 desktop/mobile business-flow and primary-surface scenarios pass in an isolated per-run environment with no skipped applicable scenarios.
- Production build: 37 generated routes complete successfully.
- Public bundle: all 20 non-admin public page manifests and 28 referenced manifest/chunk files contain no Refine/admin module.
- Database: six original migrations plus remediation migration `0006` apply in PGlite; core and 12-fixture seeds are repeatable; relationship verification passes.
- Security audit: `pnpm audit --prod` reports no known vulnerability.
- Accessibility: automated critical/serious Axe violations are zero on the tested Home surface; mobile viewport has no horizontal overflow.
- Real PostgreSQL: not verified because this workstation exposes neither Docker nor PostgreSQL. This is the sole external database-environment blocker and Phase 1A final acceptance must not be claimed until the specified real-PostgreSQL matrix passes.

These local measurements are evidence, not a production SLA. Production performance/Core Web Vitals and SEO crawling must be rechecked after the formal domain, CDN, analytics consent, real assets, and hosting configuration exist.
