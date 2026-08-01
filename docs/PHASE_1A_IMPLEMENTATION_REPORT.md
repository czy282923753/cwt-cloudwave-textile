# CWT Phase 1A remediation implementation report

Date: 2026-08-01  
Baseline: frozen CWT Product and Technical Architecture V1.1  
Scope: Phase 1A remediation only; no Phase 1B, production deployment, DNS, external push, or formal data import

## 1. Remediation outcome

All locally executable Blocker and specified High findings from the independent review have been addressed and reproduced under the locked Node 24.14.0 ARM runtime. Phase 1A final acceptance is **not** claimed because neither Docker nor a local PostgreSQL server is available for the mandatory real-PostgreSQL matrix. The code is ready for a second independent review, with real PostgreSQL validation remaining the external database-environment blocker.

## 2. Architecture governance

The V1.1 positioning, real Product definition, Taxonomy/Application/Fabric boundary, English-root trailing-slash URLs, one-intent ownership, publish/index separation, AI draft-only rule, storage isolation, minimal Inquiry/Contact/Organization relationships, and modular monolith remain unchanged. ADR-0006 records the remediation enforcement decisions and rollback boundary.

## 3. Public Asset and private-file boundary

Public delivery now requires Public partition/access, Ready status, Passed scan, no deletion, and a valid relation to a currently Published Product, Fabric Entry, or Content. Direct erroneous Private, Import, Quarantined, Draft, or Archived associations fail closed. Inquiry attachments use a separate private endpoint with record authorization and expiring access; they cannot become public or enter AI knowledge automatically.

## 4. Record-level CRM authorization

Admin can access all Inquiries. Sales reads/manages only assigned records. Analyst is aggregate-only and cannot read customer PII or attachments. Reviewer/Publisher, Product Editor, and Content Editor receive no CRM access through their publishing roles. Owners are limited to active Admin/Sales users and all changes are audited.

## 5. Revisions, publishing, and Company Facts

Published Product, Application, Fabric Library, and Content edits create Editorial Revisions. Public pages stay on approved data until the latest revision is applied by Reviewer/Publisher or Admin; stale revisions are rejected. Fabric Library enforces Draft → In Review → Published → Archived. Company Facts publish only when Verified and explicitly public; edits reset verification. Public factual hard-coding was removed or replaced with safe brand-level copy.

## 6. Asset declaration permissions

Source Declaration remains OFF with null fields on ordinary upload. Writers cannot forge reviewer/date. Review-only operators see a read-only declaration and can record only their own review. Later content changes invalidate an older review. Disabling preserves history and writes an Audit Log.

## 7. Product and CMS operations

The Product editor covers Primary/Additional Taxonomy, Applications, Tags, ordered Assets/Hero, Features, FAQs, facts and review status, display controls, SEO, Index, revision, publication, archive, and transactional Slug changes. Operational edit/review/publish/index/archive surfaces now exist for Application, Fabric Library, Content, Company Facts, Authors, Taxonomy, Feature Flags, and Audit Logs. Refine remains a conditional navigation/list shell only.

## 8. CRM consistency and delivery

Unauthenticated inquiries match Contact only by exact normalized email and never overwrite the Contact master. Submitted name/email/country/WhatsApp are retained on the Inquiry snapshot. A unique Idempotency Key returns the original Inquiry on retry. Inquiry and notification-outbox row commit together; notification transport failure does not roll back a valid submission. `pnpm outbox:process` retries due rows.

## 9. Pipeline and first response

Database/service rules enforce legal Owner, Qualified/qualification agreement, Lost Reason, and Customer Activity/Inquiry Contact consistency. Spam is excluded from effective metrics. Activity direction is Inbound/Outbound/Internal. First Response recalculates from the earliest valid Outbound Email, WhatsApp, Quote, or Sample; Internal Notes never count. Failed uploads and concurrent idempotent losers clean unlinked private objects.

## 10. Analytics and attribution

Conversion Events have unique Event IDs, consent state, anonymous Session ID, receive limiting, published-entity validation, and strict per-event property allowlists. Denied consent stores nothing. Email, phone, URLs, UUID/private identifiers, filenames, descriptions, and other customer content are rejected. First landing/referrer/UTM, last non-direct touch, submit page, and attribution confidence are retained. `whatsapp_click` remains a click only.

## 11. URLs, redirects, and discovery

Public routes, Canonicals, Breadcrumbs, links, Sitemap entries, and Redirect targets use lowercase trailing-slash paths. Published Slug changes return HTTP 301 through the proxy, not `permanentRedirect`. Domain checks plus database locking/triggers reject route/source collisions, missing destinations, loops, and chains; inbound redirects flatten to the current route and changes are audited.

## 12. Sitemap and non-production indexing

Sitemap queries independently validate Published state, localization, current route, Index flag, content/metadata, public Asset and relationship gates, and search-intent ownership. Static pages use an explicit allowlist. Non-production returns Noindex in metadata and HTTP headers, disallows robots, and emits an empty Sitemap.

## 13. Database and migration

Phase 1A contains 50 relational tables and seven ordered migrations (`0000` through remediation `0006`). The remediation migration backfills the old Product primary field into authoritative `product_taxonomy_terms`, validates every Product, drops the duplicate field, then adds Asset scan, Inquiry snapshot/idempotency/consent, activity direction, notification outbox, Conversion Event dedupe/attribution, and database triggers for primary category, CRM, and route/redirect invariants.

Fresh PGlite migration, repeated migration, upgrade from `0000–0005`, core seed repeatability, 12-fixture repeatability, and relationship verification pass. PGlite is local evidence only and not final database acceptance.

## 14. Authentication and audit

Login uses hashed network/account limit keys. Login success/failure, disabled-user attempt, logout, and session revocation are audited without passwords, session tokens, or customer PII. Audit views and tests cover governed changes and private access.

## 15. Build and dependency reproducibility

The stale x64 dependency tree was isolated and dependencies restored strictly from the unchanged lockfile under Node 24.14.0 ARM/pnpm 11.9.0. Sharp and Lightning CSS load their ARM native modules. A stale `.next` was isolated before a clean Next.js 16.2.12 production build. `pnpm audit --prod` reports no known vulnerability.

## 16. Automated evidence

- ESLint: pass, zero warnings.
- Strict TypeScript: pass.
- Vitest: 22 files, 44 tests pass.
- Playwright: 12 desktop/mobile flows pass, including 11 primary public surfaces returning HTTP 200.
- Production build: 37 routes complete.
- Public bundle: 20 public page manifests and 28 manifest/chunk files inspected; no Refine/admin dependency found.
- PGlite migrations/seeds/constraints: pass, including `0006` upgrade backfill.
- Axe: no critical/serious violation on tested Home; mobile horizontal-overflow check passes.
- Production dependency audit: no known vulnerability.

## 17. E2E isolation and business flows

Each Playwright run uses its own temporary PGlite database, Public/Private/Import storage roots, and Auth Cookie, then safely removes only that recognized temporary root. E2E covers primary public-surface HTTP 200 responses, non-production Noindex, Product metadata/schema/empty-field behavior, mobile CTA/layout, text-only and image-only Inquiry, private attachment link, auth/logout/audit, pending Product revision then approval, real 301, CRM assignment/status/outbound activity.

## 18. Placeholders and external blockers

Local substitutes remain: PGlite, local isolated object storage, development scanner, memory limiter, log email, disabled GA4/GSC, localhost, local test Admin, local logging, and 12 explicit Noindex fixtures. Production configuration fails closed.

Unavailable external items include formal domain/address/contact channels, verified company/factory facts, 10–15 real Products and rights-cleared assets, production PostgreSQL/S3/scanner/limiter/SMTP/monitoring accounts, legal retention periods, backup/restore rehearsal, DNS, and old-URL inventory. Real Product final validation remains `Waiting for Real Product Data Validation`.

## 19. Known limitations and technical debt

- Mandatory real PostgreSQL fresh/upgrade/concurrency/query matrix is unexecuted because no engine is installed; do not claim final Phase 1A acceptance.
- Production provider integration, backup/restore rehearsal, alert routing, privacy copy, and retention schedules require external decisions/accounts.
- Performance evidence in this remediation is the successful optimized build and bounded public Bundle; production field Core Web Vitals still require the final host/CDN/real assets.
- Phase 1B import, AI, dashboards, multilingual publishing, country pages, advanced filtering, and complex Organizations remain intentionally out of scope.

## 20. Deployment and next action

Local development/build/test only. Preview and Production are not deployed, DNS is unchanged, and no external Git push occurred. Do not enter Phase 1B. Request a second independent Phase 1A code review and provide a temporary real PostgreSQL environment for the remaining acceptance matrix.
