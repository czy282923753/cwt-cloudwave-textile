# CWT Phase 1A implementation report

Date: 2026-08-01  
Baseline: frozen CWT Product and Technical Architecture V1.1  
Scope: locally executable A0–A13 only; no production deployment or formal data import

## 1. Files and repository shape

The repository now contains the Next.js application, Drizzle schema and six migrations, public and operations routes, modular domain services, secure upload/storage adapters, local scripts, CI, unit/integration/E2E tests, frozen architecture documents, AGENTS rules, and five ADRs. Generated build, test, local database, and storage artifacts are ignored. No application file was deleted.

## 2. Formal documents

The frozen requirements, architecture, data model, product dictionary, SEO URL strategy, publishing, content/taxonomy, CMS/permissions, assets/uploads, security/privacy, CRM/attribution, analytics dictionary, environments/deployment, testing, operations, phase plan, AI governance, technology validation, ADR index, and this implementation report are committed under `docs/`.

## 3. AGENTS governance

`AGENTS.md` protects the frozen positioning, truth boundary, real Product definition, taxonomy/Application/Fabric Library separation, English-root URLs, one-intent ownership, publication/index separation, AI draft-only rules, storage isolation, minimal inquiry/CRM relationships, modular monolith, Source Declaration OFF/null defaults, quality gates, and external-action restrictions.

## 4. ADRs

- ADR-0001: modular monolith.
- ADR-0002: English at root and future language prefixes.
- ADR-0003: conditional Refine UI-shell boundary.
- ADR-0004: isolated public/private/import storage.
- ADR-0005: separate publishing and indexing.

No frozen-architecture change was required during Phase 1A.

## 5. Locked technology

Node 24.14.0 LTS, pnpm 11.9.0, Next.js 16.2.12, React 19.2.8, TypeScript 5.9.3 strict, Tailwind 4.3.3, Drizzle ORM 0.45.2/Kit 0.31.10, PostgreSQL in production with PGlite for local/test, Sharp 0.35.3, Refine Core 5.0.12/Next router 7.0.5, Playwright 1.62.1, and Vitest 4.1.10. Workspace overrides keep Next's transitive Sharp/PostCSS on audited patched versions.

## 6. Refine conclusion

Conditional Go. Refine is limited to admin navigation/list/detail/simple CRUD shell behavior beneath `/admin`. Server services and relational constraints own all permissions, workflows, uploads, publication, indexing, routes, CRM, and public rendering. Public bundle inspection passes.

## 7. Database

There are 49 relational tables across identity/governance, assets, catalog, editorial, SEO/routing, CRM, analytics, and settings. Six ordered migrations define enum types, foreign keys, compound unique keys, partial unique ownership rules, checks, and indexes. Core relationships include Product-to-primary/multiple taxonomy, Product-to-Application, independent Fabric Library Entry links, versioned Content, path ownership/redirects/keywords/topics, Organization-to-Contact-to-Inquiry, private Inquiry Assets, Activities/Status History, and PII-free Conversion Events.

## 8. Environment variables

Names and purposes are documented in `.env.example` and `ENVIRONMENT_AND_DEPLOYMENT.md`. No real secret is committed. Local/test values are explicit substitutes. Production startup fails closed for the formal URL, PostgreSQL, isolated S3 buckets and CDN, scanner, shared limiter, SMTP/inquiry recipient, WhatsApp, retention values, and external monitoring.

## 9. Operations/admin functions

Delivered: authentication/session/logout, fixed roles and server permissions, Products and quality gates, taxonomy dimensions, Applications, Assets and declarations, Fabric Library Entries, Contents/Authors/Revisions, Company Facts, route/metadata/redirect/topic/keyword services, Inquiries, Contacts, lightweight Organizations, assignments, statuses, Activities, private-file grants, Conversion Events, feature-flag storage, and Audit Logs. User provisioning, aggregate dashboards, and advanced approval UI are intentionally not Phase 1A workflows.

## 10. Public pages

Delivered: Home, Products/detail, taxonomy landing, Applications/detail, Fabric Library/detail, Resources, the three independent content hubs and articles, About, Get Quote, Privacy, global navigation/footer, desktop floating inquiry CTA, and mobile fixed CTA. Fixtures are conspicuously synthetic and noindex. Unknown/hidden Product fields render no empty blocks.

## 11. Build, lint, and types

The optimized production build completes with 35 routes. ESLint passes with zero warnings. Strict TypeScript passes; strictness was not reduced and no `any` was added to hide failures. The public-bundle check finds no Refine/admin dependency in the public home manifest.

## 12. Automated tests

Vitest passes 18 files/29 tests. Playwright passes eight applicable desktop/mobile scenarios with project selection rather than skipped applicable cases. Coverage includes migrations, seed repeatability, permissions, sessions, audit, Products/publication/indexing, taxonomy/Application boundaries, Fabric Library, Content revisions, redirects, assets, retention, inquiries/CRM, attribution/PII, public SEO outputs, mobile layout, accessibility, image-only/text-only inquiries, and admin authentication.

## 13. Permissions and audit

Fixed roles are Admin, Product Editor, Content Editor, Reviewer/Publisher, Sales, and Analyst. Server permission tests pass. Audit records cover governed creation/change/publish/index/route/declaration/private-access/CRM/retention actions without secrets or customer file contents.

## 14. SEO and routing

English uses `/`; future locales reserve `/es/`, `/vi/`, `/tr/`, and `/zh-cn/`. Route ownership, canonical, metadata, robots, sitemap, Breadcrumb/Product/Article/FAQ/Organization schemas, noindex control, keyword ownership, topic/internal links, and transactional slug-to-301 are implemented. Redirect conflicts, loops, incoming and outgoing chains are rejected. Non-production returns noindex headers, disallows robots, and emits no sitemap entries.

## 15. Files and privacy

MIME, magic bytes, image decode, configured size/count, rate limiting, quarantine, scanning, random safe keys, derivative generation, partition isolation, expiring grants, access audit, and retention preview/execution are implemented. EICAR development-signature rejection passes. Inquiry files stay private and cannot enter public Assets or AI knowledge. Source Declaration is OFF; fields stay null on ordinary upload, hints are non-blocking, disabling preserves history, and changes are audited.

## 16. Inquiry, Contacts, CRM, and attribution

Name/Email plus Description or image is enforced. Text-only and image-only E2E flows pass. Exact normalized email reuses a Contact while creating distinct Inquiries. Pipeline transitions, Qualified, Lost Reason, assignment/priority/qualification, first response, Activities, Status History, and audited private access are implemented. UTM/landing/referrer/last-non-direct/confidence and anonymous session data are stored without promising per-inquiry Google keywords.

## 17. Mobile, accessibility, and performance

Desktop and Pixel 7 flows pass with no horizontal overflow. Axe finds no critical/serious violation on the tested Home surface after AA contrast corrections. Local production Lighthouse Home scores: mobile Performance 94, desktop Performance 100, Accessibility 100, Best Practices 100, CLS 0. Non-production SEO is 66 because noindex/robots blocking is intentionally active.

## 18. Substitutes and placeholders

PGlite, local filesystem partitions, development malware scanner, memory limiter, log email notifier, disabled GA4/GSC, localhost/preview URL, local auth fixture, local logs, and 12 synthetic noindex Product fixtures are in use. All are environment/feature controlled and rejected where required in production.

## 19. Externally blocked items

Formal domain/address, inquiry email, WhatsApp, production accounts/keys, PostgreSQL provider, S3/CDN, scanner, shared limiter, SMTP, monitoring, DNS, privacy/legal retention periods, backup/restore ownership, verified company facts, facility relationships, and old-site URL inventory are not available. No production deployment, DNS change, external push, formal import, or irreversible external operation was performed.

## 20. Waiting for Real Product Data Validation

The system has not completed real Product launch, real Product SEO quality review, factual specification validation, or imagery-rights review. The first 10–15 real records and authorized assets are still required. The 12 fixtures validate mechanics only and may never be represented as real CWT Products.

## 21. Known limitations and risks

- Production integrations and provider-specific backup/restore/monitoring are unconfigured by instruction.
- Formal privacy copy and retention schedules await business/legal decisions.
- Analytics dashboards, Excel import, AI, multilingual publication, country pages, advanced Fabric Library filtering, complex Organizations, and notification retry queues are later scope.
- CSP currently permits inline framework styles/scripts required by the selected Next.js rendering setup; tightening to nonce/hash policy is a launch-hardening task.
- Local Lighthouse is not field Core Web Vitals; production RUM and device/network sampling remain necessary.

## 22. Recommended Phase 1B order

Receive/validate 10–15 real Products and assets → confirm company/contact/privacy facts → implement Excel template/preview/validation/idempotent import → run real template/SEO quality review → expand reviewed Products toward 30–50 → configure production providers and restore rehearsal → preview acceptance → explicit production launch authorization.

## 23. Checkpoint commits

Checkpoint 1 `2a2e32d`, `b66ed59`; Checkpoint 2 `1d8a0be`; Checkpoint 3 `ee280c3`; Checkpoint 4 `0720f4e`; Checkpoint 5 is recorded by the final Phase 1A delivery commit.

## 24. Deployment state

Local development and local production-build validation only. Preview: not deployed. Production: not deployed. DNS: unchanged. External Git: not pushed.
