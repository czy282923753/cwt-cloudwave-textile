# Testing and Phase 1A acceptance

## Required checks

- Production build, lint, strict TypeScript, unit, database/migration integration, idempotent seed, permission matrix, audit, publishing/index separation, redirects, SEO outputs, upload/scanning/isolation, inquiry variants, contact matching, CRM activities, conversion PII blocking, critical E2E, mobile, accessibility, and public-bundle isolation.

## Prohibited shortcuts

Do not delete or skip critical tests, weaken strict TypeScript, use `any` to conceal issues, disable lint rules to hide failures, swallow exceptions, suppress failures, or label incomplete work complete.

## Real data boundary

Synthetic fixtures validate the system only. Real product launch, authenticity, and final SEO quality remain `Waiting for Real Product Data Validation` until 10–15 real products and authorized imagery are supplied.

## Reporting

Record command results, migrations, role tests, route/SEO checks, upload security, CRM flows, bundle checks, accessibility, performance, placeholders, known issues, and blocked external requirements.

## Phase 1A final local evidence

- Strict TypeScript and ESLint: pass with no suppressed errors.
- Vitest: 18 files and 29 unit/integration tests pass.
- Playwright: 8 applicable desktop/mobile E2E scenarios pass with no skipped applicable scenarios.
- Production build: 35 generated routes complete successfully.
- Public bundle: no Refine/admin module leakage detected.
- Database: six migrations apply; core and 12-fixture seeds are repeatable; relationship verification passes.
- Security audit: no known production dependency vulnerability after reviewed Sharp/PostCSS overrides.
- Accessibility: automated critical/serious Axe violations are zero; Lighthouse accessibility is 100 on tested home routes.
- Local Lighthouse home: mobile performance 94, desktop performance 100, Best Practices 100, CLS 0. SEO is intentionally 66 because non-production robots/noindex controls are enabled.

These local measurements are evidence, not a production SLA. Production Core Web Vitals and SEO crawling must be rechecked after the formal domain, CDN, analytics consent, real assets, and hosting configuration exist.
