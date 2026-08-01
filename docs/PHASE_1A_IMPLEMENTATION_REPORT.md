# CWT Phase 1A Remediation Round 3 implementation report

Date: 2026-08-02

Baseline: frozen CWT Product and Technical Architecture V1.1

Scope: third independent review findings only; no Phase 1B or external validation

## 1. Four High findings

1. **Historical Published Product gate — fixed.** Public list, detail, sitemap/index discovery, public Asset relation and analytics entity validation share a fail-closed Product boundary: Published, verified real basis, active Admin/Reviewer-Publisher confirmer, confirmation time, current English localization/route and eligible Public/Ready/Passed image. Published + Noindex and direct database legacy rows receive no exception.
2. **Effective Rights Decision — fixed.** Declaration UI state is no longer an authorization input. Not Allowed, Revoked, Expired, Pending Review and Restricted without public-website permission remain unavailable when the declaration switch is OFF. Reviewer Allowed or an explicit Admin Override is required to replace the decision.
3. **Analytics/CRM and Consent — fixed.** `conversion_events` has no Inquiry, Contact or private Asset foreign key. CRM outcomes remain in CRM tables. Anonymous Consent is server-persisted and versioned; Unknown, Denied and Revoked reject writes even if the client sends stale or forged state. Provider payload mapping omits database entity and Consent Session identifiers.
4. **Actual upload bytes — fixed.** Binary bodies are read incrementally and aborted above the server Intent limit. Content-Length is only an early/exact check and may be absent. Mismatch, interruption or overflow does not create a storage object or consume the Intent.

## 2. Two Medium findings

1. **Source Declaration concurrency and Audit atomicity — fixed.** Statement Version tracks content; Record Version increments on every edit, review and Admin Override. Stale operations fail. Business mutation and Audit Log share one database transaction, including injected Audit-failure rollback tests.
2. **Fabric/Content role-MIME readiness — fixed.** Hero, Gallery, Cover, Detail, Thumbnail and Inline require JPEG/PNG/WebP/AVIF. PDF is allowed only as Document/Download and cannot satisfy Product, Fabric Entry or Content image readiness. Direct database corruption fails readiness and public read.

## 3. Historical Published Product strategy

Migration 0008 chooses explicit remediation rather than silent masking alone: every invalid historical Published Product is forced Noindex, demoted to In Review, marked `publication_remediation_required` with a reason and given an Audit Log. Public reads independently recheck the boundary in case a future direct database write violates it. The admin Product list exposes the remediation queue. No basis, confirmer or technical fact is fabricated. Re-publication requires normal reviewer confirmation and workflow.

The 12 local synthetic Product fixtures remain In Review/Noindex after ordinary Seed. Isolated E2E scenarios may explicitly confirm and publish a fixture only to test the workflow. Real acceptance remains **Waiting for Real Product Data Validation**.

## 4. Effective Rights Decision model

- UI state: `source_declaration_enabled`; visibility/edit convenience only.
- Content: declaration fields plus Statement Version and Last Editor.
- Effective decision: Allowed, Restricted, Not Allowed, Expired, Revoked or Pending Review.
- Restricted use requires an explicit public-website boolean.
- Expiry is evaluated at access time even after an earlier Allowed review.
- The decision and declaration history survive switch-off.
- Public SQL predicates and object-delivery policy use the same effective-rights rules.

## 5. Source Declaration concurrency and transaction strategy

Every edit/review/override request carries expected Record Version. The SQL update predicate includes that version and increments it atomically. Content edits also increment Statement Version and invalidate old review fields/effective rights to Pending Review. Normal review records the reviewed Statement Version and cannot be performed by the last editor. Admin Override is separate, Admin-only and reason-required. Mutation, review invalidation/effective decision and Audit Log are one transaction; a failing Audit writer rolls everything back.

## 6. Analytics and CRM separation

Public/provider-safe behavior and aggregate conversion events live in `conversion_events`; the schema check permits only the public event set. The old Inquiry foreign key/column is removed. A random `CWT-…` external reference may be used but cannot reveal the internal Inquiry UUID. Name, email, WhatsApp, description, filenames, private URLs/IDs and UUID-like customer identifiers are rejected.

Inquiry creation, qualification, Quote, Sample, Won and Lost persist through Inquiry, Status History and Customer Activities regardless of optional analytics consent. They no longer write to the public analytics table and cannot enter the provider mapper.

## 7. Server Consent model

`analytics_consents` stores anonymous Consent Session ID, status, version, Granted time, Revoked time and updated time. An HttpOnly, SameSite=Lax cookie holds only the random session ID. GET ensures an Unknown row; same-origin POST updates it with optimistic versioning. Conversion and Inquiry analytics resolve the cookie server-side. Client payload schemas do not accept consent authority. Unknown, Denied and Revoked write no analytics event; a stale page cannot override a later revocation.

## 8. Streaming Upload implementation

The binary route validates same-origin, rate keys, Upload Intent, Session binding, TTL, declared MIME and any supplied Content-Length before reading. `ReadableStream` chunks are counted against the server-side declared Intent size; the reader cancels on the first excess byte. Exact size is verified after end-of-stream before storage/scanning starts. Missing Content-Length and chunked bodies remain bounded. Oversized or interrupted bodies leave the Intent Created/retryable and storage empty. Completed bodies still enter Private Quarantine, decode/MIME checks and malware scan before single-use token release.

## 9. Fabric/Content MIME role rules

Image roles: Hero, Gallery, Cover, Detail, Thumbnail, Inline. Allowed MIME: JPEG, PNG, WebP, AVIF. Attachment roles: Document, Download. Allowed attachment MIME: the image set plus PDF. Services validate on draft/revision/publish; readiness detects invalid direct writes; Fabric public queries require a usable Hero image; Content public image queries exclude PDF so image components never receive document URLs.

## 10. Migration changes

- `0008_phase1a-remediation-round3.sql`: adds Effective Rights enum/fields, Cover/Download roles, Revoked Consent, `analytics_consents`, analytics external reference, Product remediation fields, conservative rights backfill, removal of CRM-outcome analytics rows and Inquiry FK/column, public-event check, invalid historical Product Noindex/demotion queue and migration Audit Logs.
- `0009_source-declaration-record-version.sql`: adds non-null optimistic declaration Record Version with zero default.
- Drizzle snapshots 0008/0009 and journal are committed. Schema has 52 tables; migrations 0000–0009 apply repeatedly in PGlite. Drizzle schema check passes.
- Real PostgreSQL execution was intentionally not started.

## 11. File changes

No file was deleted. New implementation files:

- `drizzle/0008_phase1a-remediation-round3.sql`
- `drizzle/0009_source-declaration-record-version.sql`
- `drizzle/meta/0008_snapshot.json`
- `drizzle/meta/0009_snapshot.json`
- `src/analytics/consent-service.ts`
- `src/analytics/consent-service.integration.test.ts`
- `src/analytics/public-payload.ts`
- `src/app/api/analytics-consent/route.ts`
- `src/catalog/product-eligibility.ts`
- `src/public-site/product-publication-boundary.integration.test.ts`
- `src/uploads/asset-eligibility.ts`
- `src/uploads/asset-role-readiness.integration.test.ts`
- `docs/adr/ADR-0009-round3-fail-closed-boundaries.md`

Modified implementation areas: environment sample/config; Drizzle journal and Product/Asset/Analytics enums/tables; Product/Fabric/Content services; readiness, fixture seed and migration tests; public Product/media/index reads; Source Declaration admin forms/actions; Consent UI and APIs; Conversion service/API/Inquiry integration; CRM outcome handling; upload request guard/route/services/tests; E2E scenarios. Modified governance documents: `AGENTS.md`, Data Model, Publishing, Security/Privacy, Asset/Uploads, CRM/Attribution, Analytics Dictionary, Environment, Operations, Testing/Acceptance, ADR index and this report.

## 12. Tests added or changed

New assertions cover missing basis/confirmer/time/localization/route, PDF/non-image/Pending/Failed Product images, Published + Noindex and direct database violations, sitemap/public read/readiness rejection, migration demotion/audit, declaration switch-off after Not Allowed/Expired, Restricted purpose, explicit reviewer restoration, concurrent edits/reviews/override, stale versions, edit/review Audit rollback, server Consent lifecycle and forged client state, analytics schema/payload privacy, consent-independent CRM outcomes, missing/chunked/forged length, exact limit/+1/interrupted streaming, retry/no-storage, forged proxy/rate limits, PDF Fabric Hero, PDF Content Cover, valid attachment and direct role corruption.

The original test suites remain active. No critical test was deleted, skipped or weakened; no Fixture seed bypass automatically confirms real-Product truth.

## 13. Build, lint and TypeScript

- Environment diagnosis: Node 24.14.0 arm64, pnpm 11.9.0, Sharp 0.35.3, Lightning CSS 1.32.0 and native Next SWC 16.2.12 load successfully.
- ESLint: pass, zero warnings.
- TypeScript strict: pass.
- Production Build: pass; 39 static-generation units/dynamic routes completed.
- Drizzle check: pass.
- Production dependency audit: no known vulnerabilities.

## 14. Vitest, Playwright and Bundle

- Vitest: 35 files, 81 tests, all passed.
- Migration tests: migrations create the complete schema, upgrade prior states and are repeatable.
- Seed: core Seed twice and fixture Seed twice completed without duplicates; persisted readiness is zero across every reported invalid relation.
- Playwright: 15/15 passed across Desktop Chromium and Pixel 7. The original 14 remain active; one governed Asset Library scenario was added.
- Public Bundle: pass across 20 public page manifests and 29 manifest/chunk files; Refine/admin dependencies are absent.

## 15. UI and HTTP checks

All 11 principal public paths return HTTP 200. Historical/unreviewed synthetic Product detail returns controlled 404 on Desktop and Pixel 7 and is absent from Product listing. Product confirmation/publish/revision/301, Asset Library list/detail with declaration OFF, text-only Inquiry, image-only private Inquiry, authenticated CRM status/activity and public Consent grant/withdraw all pass in browser tests. Home has zero Axe Critical/Serious findings in both projects; Pixel 7 has no horizontal overflow and retains the fixed inquiry action.

Local checks are not production Core Web Vitals evidence. Real assets, CDN/storage latency, formal domain and hosting must be measured later.

## 16. Remaining Blocker, High, Medium and Low

- Local executable scope Blocker: none identified.
- Known unresolved High: none in the third-review scope.
- Known unresolved Medium: none in the third-review scope.
- Low/operational: production provider behavior, retention values, monitoring thresholds and field performance remain external/project inputs; no local simulation is claimed as provider acceptance.
- Business validation: **Waiting for Real Product Data Validation** for the first 10–15 real Products and authorized imagery.

## 17. External validation items

Not executed: real PostgreSQL migration/constraint/locking rehearsal; R2/S3 policy, object limits and malware scanner; SMTP/outbox provider duplicate suppression; analytics provider delivery and consent configuration; formal domain/DNS; Preview/Production deployment; production backup/restore; approved file/customer/audit retention; real Product/Company Fact/rights review; production Core Web Vitals and crawl checks.

## 18. Git record

- `bda9a77` — `fix: enforce phase 1a round 3 fail-closed boundaries`
- Documentation/evidence commit: the commit containing this report; use local `git log` for its immutable hash.

No external push, Preview/Production deployment, production database, production key, DNS mutation or formal data import occurred.

## 19. Fourth targeted independent review

Recommended. The review should diff from `bda9a77`, focus only on the five authorized Round 3 areas, inspect migrations 0008/0009 and verify that tests exercise public/direct-database fail-closed behavior rather than only Domain Service happy paths.

## 20. Recommendation for real PostgreSQL external acceptance

Do not begin it before the fourth targeted review passes. If that review finds no remaining Blocker/High/Medium in the authorized scope, proceed next with the already documented real PostgreSQL external validation checklist. Phase 1B remains paused until Phase 1A and that external acceptance are explicitly approved.
