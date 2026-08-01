# CWT Phase 1A Final Local Remediation implementation report

Date: 2026-08-02

Baseline: frozen CWT Product and Technical Architecture V1.1

Scope: the fourth independent review's three Medium and two Low findings only. Phase 1B, provider/external acceptance, deployment and formal data remain excluded.

## 1. Three Medium findings

1. **Admin writes through Domain Services — fixed locally.** Author creation/update and Company Fact creation/review now join Organization, Contact and Feature Flag writes behind permission-checking Domain Services. `src/admin/actions.ts` contains no business `insert/update/delete`, Audit writer or file buffering. Asset Batch/relation/release writes are domain-owned.
2. **One real-Product public authority — fixed locally.** Product public eligibility is reused by Taxonomy, Application, Fabric Library, related Products, sitemap, keyword-owner quality and readiness. A direct invalid `Published` row cannot qualify a derived route.
3. **Admin Asset streaming upload — fixed locally.** The Asset Library uses User-and-Auth-Session-bound Admin Upload Intents, bounded binary PUT endpoints, Private/Internal staging, decode/scan, and a small-JSON atomic finalize operation. Server Actions no longer receive Asset files.

## 2. Two Low findings

1. **Conversion Event constraint authority — fixed.** `conversion_events_public_only_check` now exists in Drizzle Schema and snapshot while remaining added exactly once by Migration 0008.
2. **Product Code nonblank database constraint — fixed.** Null remains valid; non-null empty, spaces, tabs, newlines and mixed whitespace are rejected; unique non-null codes remain enforced.

## 3. Added or adjusted Domain Services

- Added `content/author-service`: create/update with `content.write`, validation, atomic Audit.
- Extended `content/company-facts-service`: create/update/verify/reject are transactional and Audit-atomic.
- Added `uploads/admin-upload-service`: Batch/Intent creation, staged completion, public finalization, Asset relation create/delete and lifecycle handling.
- Strengthened Organization/Contact and Feature Flag services with injectable Audit writers for real rollback verification; production defaults still use the standard Audit writer.
- Admin API handlers and Server Actions remain transport adapters and recheck no domain invariants on behalf of services.

## 4. Audit atomicity

Author, Company Fact, Organization, Contact, Feature Flag, Asset relation, Admin Upload Batch transition and Asset public-release mutations write their required Audit rows inside the same database transaction. Tests inject an Audit writer that throws and confirm the business row, changed fields, relation, status or public activation does not commit. Association/session/permission state is rechecked in the transaction where the final mutation occurs.

## 5. Unified Product Eligibility

`publicProductEligibilityConditions` remains the sole real-Product public predicate: Published state, real basis, active Admin/Reviewer-Publisher confirmer, confirmation time, current nonblank English localization, current English route, and an allowed image in Public/Ready/Passed state with effective rights. Correlated helpers expose that predicate to Taxonomy, Application and Fabric Entry queries.

The same authority now governs Index gates, sitemap inclusion, related Product IDs, keyword-owner quality and readiness. Removing the last eligible Product immediately removes derived routes from sitemap results and makes a stale Index flag fail database readiness.

## 6. Admin streaming upload architecture

1. Authenticated operator submits small JSON declaring file facts, category, role, optional association/order and optional Source Declaration state.
2. Domain Service validates `assets.write`, active User/Auth Session binding, count, declared MIME/size, role compatibility, rate limit and target state; it creates one Batch and short-lived single-use Intents transactionally.
3. Each file is sent as a raw binary PUT. Supplied Content-Length is an early/exact check; missing length remains bounded by actual streamed bytes. The server never calls `arrayBuffer`, `blob` or `formData` on the upload request.
4. MIME signature, image decoding and malware scanning finish before a Private/Internal staged Asset becomes Passed.
5. Small `{}` JSON finalization rechecks Session, permissions, Batch state, detected MIME and associations; it activates Public objects, derivatives, declaration statement, relations, Intent consumption, Batch completion and Audit in one transaction.
6. Finalization failure deletes copied Public objects and preserves only nonpublic staging. TTL retention expires Intents/Batches and deletes unconsumed staged files.

Source Declaration stays OFF by default and every source/right/reviewer/expiry/facility field remains null. Cross-User, cross-Session, expired, replayed, unauthorized, oversize, interrupted, scanner-rejected and association-failed paths fail closed.

## 7. Migration and Schema changes

- Added Migration `0010_soft_marrow.sql`, snapshot 0010 and journal entry.
- Added Admin Batch status and Upload Intent kind enums.
- Extended `asset_upload_batches` with Session, lifecycle, counts, optional declaration payload, expiry/completion/failure.
- Extended `upload_intents` with kind, User/Session/Batch, category/role/association/order and supporting indexes.
- Added `products_product_code_nonblank_check` once in Migration 0010.
- Declared `conversion_events_public_only_check` in current Drizzle Schema/Snapshot without a duplicate ADD in Migration 0010.
- Fresh migration, repeat migration, pre-remediation upgrade and generated-schema consistency pass locally. `SET CONSTRAINTS ALL IMMEDIATE` in 0010 safely drains older deferred Product trigger events before altering the Product table during a multi-migration upgrade transaction.
- Rollback strategy before production remains forward restoration: stop new Admin Intents, retain nullable new columns, and deploy a compensating migration only after confirming no active batches. No deployed old Migration was rewritten.

## 8. File changes

New implementation/test/migration files:

- `drizzle/0010_soft_marrow.sql`
- `drizzle/meta/0010_snapshot.json`
- `src/app/api/admin/upload-intents/route.ts`
- `src/app/api/admin/upload-intents/[token]/route.ts`
- `src/app/api/admin/upload-intents/[token]/route.test.ts`
- `src/app/api/admin/upload-batches/[batchId]/finalize/route.ts`
- `src/content/author-service.ts`
- `src/content/admin-domain-services.integration.test.ts`
- `src/seo/derived-product-eligibility.integration.test.ts`
- `src/uploads/admin-upload-service.ts`
- `src/uploads/admin-upload-service.integration.test.ts`

Modified implementation/test files:

- `drizzle/meta/_journal.json`
- `src/admin/actions.ts`, `src/admin/actions.test.ts`, `src/admin/components/asset-upload-form.tsx`
- `src/auth/session.ts`
- `src/catalog/application-service.ts`, `fabric-library-service.ts`, `product-eligibility.ts`, `taxonomy-index-service.ts`, `taxonomy-service.ts`
- `src/content/company-facts-service.ts`, `src/crm/contact-service.ts`, `src/settings/feature-flag-service.ts`
- `src/db/migrations.integration.test.ts`, `readiness.ts`, and Analytics/Asset/Catalog/CRM/Enum schemas
- `src/public-site/data.ts`, `src/seo/keyword-mapping-service.ts`, `src/seo/public-index.ts`
- `src/uploads/file-validation.ts`, `retention-service.ts`, `service.ts`
- `tests/e2e/public.spec.ts`

Modified governance documents: `AGENTS.md`, `ARCHITECTURE.md`, `ASSET_AND_UPLOADS.md`, `CMS_AND_PERMISSIONS.md`, `DATA_MODEL.md`, `SEO_URL_STRATEGY.md`, `TESTING_AND_ACCEPTANCE.md`, and this report. No file was deleted.

## 9. Tests added or changed

- Static Server Action mutation/buffering prohibition.
- Author create/update, direct permission and Audit rollback.
- Company Fact create/verify and Audit rollback.
- Organization creation, Contact assignment and Feature Flag Audit rollback.
- Asset relation create/delete, permission and Audit rollback.
- Admin Batch lifecycle, User/Session binding, expiry, replay, rate/role/size validation, exact 12 MiB and over-1-MiB valid images.
- Shared stream guard: missing/forged Content-Length, chunked body, limit +1 cancellation and interruption.
- Scanner failure, association failure and Audit failure leave no orphan Public Asset.
- Source Declaration OFF/null after Admin release.
- Invalid direct Published Product cannot qualify Taxonomy/Application/Fabric; valid Product can; eligibility removal fails sitemap/readiness; keyword owner uses the same authority.
- Database constraint introspection and direct Product Code null/valid/duplicate/blank/space/tab/newline cases.
- Browser Asset Library upload through the new Intent/binary/finalize flow.

No original test was deleted, skipped, marked TODO or conditionally bypassed. The former 81 Vitest assertions remain and the suite now has 91.

## 10. Build, Lint, TypeScript and Drizzle

- Environment diagnosis: Node 24.14.0 arm64, pnpm 11.9.0, Sharp 0.35.3, Lightning CSS 1.32.0 and Next SWC 16.2.12 load successfully.
- ESLint: pass with zero warnings.
- Strict TypeScript: pass.
- Drizzle Check: pass.
- Drizzle Generate consistency: no schema changes remain to migrate after 0010.
- Fresh Production Build: pass under Next.js 16.2.12; 40 static-generation units/dynamic routes complete.

## 11. Vitest, Playwright and Bundle

- Vitest: 39 files, 91 tests, all pass.
- Migration Fresh/Upgrade and core/Fixture Seed repeatability: pass in the integration suite and isolated Playwright setup.
- Playwright: 16/16 pass across Desktop Chromium and Pixel 7; the original 15 remain active plus one Admin Asset Intent upload scenario.
- HTTP: all 11 principal public paths return 200 in browser acceptance.
- Accessibility: Home has zero Axe Critical/Serious findings in Desktop and Pixel 7 projects; mobile has no horizontal overflow.
- Public Bundle: 20 public page manifests and 29 manifest/chunk files contain no Refine/admin dependency.
- Production dependency audit: no known vulnerabilities.

## 12. Admin upload actual test results

- A valid JPEG larger than 1 MiB and smaller than 12 MiB stages and finalizes.
- A valid JPEG exactly at the configured 12 MiB limit stages successfully.
- Declared limit +1 is rejected; actual limit +1 is cancelled by the shared stream reader.
- Missing length, chunked stream and interruption are covered by shared binary infrastructure tests; forged length is rejected before processing.
- Expiry, replay, cross-User, cross-Session and unauthorized role are rejected.
- Development scanner rejection marks Intent/Batch failed without Public release.
- Association target failure and injected Audit failure remove copied Public objects and keep the Asset Private/Internal.
- Browser upload completes through three API calls and the refreshed Asset list shows the released file.

## 13. Existing-function regression result

Historical Asset rescan/readiness, real Product publication, effective rights, Source Declaration separation/versioning, analytics/CRM privacy, server consent, Inquiry streaming Intent, role/MIME rules, Published/Index separation, revision flow, HTTP 301/slash URLs, governed media paths, CRM record authorization, Outbox lease, Contact snapshot protection, Inquiry idempotency, Refine bundle isolation and non-production global Noindex remain covered and pass.

## 14. Remaining severity assessment

- Local authorized scope self-check: Blocker 0, High 0, Medium 0, Low 0 identified after remediation.
- This is not a substitute for the requested independent difference review.
- Phase 1B remains paused.
- Real Product launch remains **Waiting for Real Product Data Validation**.

## 15. External validation items

Not executed: real PostgreSQL query-plan/locking/migration rehearsal; R2/S3 access policy and object behavior; production malware scanner; SMTP/Outbox provider behavior; analytics providers; Preview/Production deployment; DNS; backup/restore; approved production retention values; real Company Facts, rights and 10–15 Product validation; production Core Web Vitals and crawling.

## 16. Git record

- `3101b3d` — `fix: complete phase 1a final local remediation`
- Documentation/evidence commit: the commit containing this report; use local `git log` for its immutable hash.

No external push, provider call, Preview/Production deployment, production database/key, DNS mutation or formal data import occurred.

## 17. Final targeted independent review recommendation

Recommended. Diff from `f4d7c0a` through the documentation commit and focus only on the three Medium/two Low findings, especially Server Action static boundaries, Asset finalize storage cleanup, the correlated Product predicates and Migration 0010's one-time constraints.

## 18. Real PostgreSQL external acceptance recommendation

Recommended only after the final targeted independent review confirms no remaining Blocker/High/Medium in this authorized scope. Then run the frozen `POSTGRESQL_EXTERNAL_VALIDATION.md` plan before approving Phase 1A external acceptance. Do not enter Phase 1B merely because local checks pass.
