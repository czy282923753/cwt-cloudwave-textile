# CWT Phase 1A Remediation Round 2 implementation report

Date: 2026-08-01  
Baseline: frozen CWT Product and Technical Architecture V1.1  
Scope: the one Blocker, six High findings, and specified Medium findings only

## 1. Blocker repair evidence

Migration `0007_phase1a-remediation-round2.sql` never infers a clean historical scan. Surviving old Assets become `pending/required`; deleted rows enter `manual_review`. `assets:rescan-legacy` reads the original Public, Private, or Import object, repeats file validation, image decode, and malware scan, then stores fresh provider/result/time evidence. Claims interrupted in `processing` for more than 15 minutes are automatically returned to work; a repaired manual item has an explicit single-Asset retry command. Missing, invalid, rejected, or deleted objects remain unavailable with a reason. `db:verify` fails when a Published Product, Fabric Entry, Content record, or Inquiry references an unusable Asset, and it also fails while any historical rescan remains `required`.

The integration fixture upgrades a real 0000–0005 database containing Public, Private Inquiry, Import, missing and deleted Assets, a Published Product relation, and an Inquiry attachment. Local persisted data upgraded successfully: 18/18 historical Assets rescanned to Passed and the manual-review list is empty. Fixtures are seeded only after the migration/rescan check and cannot manufacture scan evidence for old rows.

## 2. Six High findings

1. Product publication requires an allowed Real Product Basis, confirmer and time, plus at least one Public/Ready/Passed JPEG, PNG, WebP, or AVIF. PDF and certificate records cannot satisfy either Draft image or Published image requirements. Published + Noindex uses the same publication gate; Index remains a stricter later gate.
2. Source Declaration content and review are separate actions. Every material edit increments Statement Version, records Last Editor, and invalidates the old review. The last editor cannot normally review the same version. Review records version, reviewer, time, decision and reason. Admin Override is a separate reason-required audited operation.
3. Public HTML emits only `/api/public-assets/{assetId}/`, never Object Keys or permanent Bucket/CDN URLs. The route rechecks current Published association, public partition/access, Ready/Passed status, MIME, deletion, rights denial and expiry. Phase 1A uses `private, no-store`, so Archive, Unlink, Delete and Rights changes take effect on the next request. Local and S3 adapters share the same policy.
4. Analytics stores only granted-consent events. Public entity tracking submits a current public path, not an internal entity UUID; server-side resolution establishes the relation. Inquiry responses/events use random `CWT-…` references while the internal Inquiry FK remains server-only. Every attribution string and allowlisted property has format, length, PII/private identifier and replay validation.
5. Notification Outbox claims are conditional and lease-bound. Pending/failed due rows and expired processing leases are reclaimable; attempts use bounded exponential retry and Dead state. Delivery Key is unique and stable, and SMTP receives a deterministic Message-ID. Provider-level duplicate suppression after external success/database failure remains external validation.
6. Public files use Upload Intent, mandatory pre-body Content-Length, declared length/MIME match, pre-body global/Session/trusted-IP limits, a Session-bound one-time token, private quarantine, scan/decode, and small strict Inquiry JSON. Arbitrary `x-forwarded-for` is ignored. Failed/interrupted Assets are linked to the Intent and retention can delete them after expiry.

## 3. Medium findings

Unauthorized private attachment access returns controlled 404. Organization, Contact assignment, and Feature Flag writes use Domain Services. Consent UI defaults analytics off and supports allow, decline, withdraw, and modify. Product, Application, Fabric Library, taxonomy, and Article dynamic pages provide Open Graph and Breadcrumb JSON-LD. Public Bundle verification refuses a missing or stale build.

## 4. Asset upgrade and rescan strategy

ADR-0007 defines a two-stage forward migration: schema/state transition first, evidence-producing rescan second, readiness gate third. Public, Private Inquiry, and Import objects are read from their recorded partitions. Missing/deleted records are never silently restored. Recovery uses stale-claim reclamation, retryable `manual_review`, an attempt counter, failure reason, operator list, and explicit `--retry-manual {assetId}`. Production rollout requires database/storage backup and an isolated rehearsal.

## 5. Product publication changes

Draft still requires only Product Name, Primary Category, and at least one eligible image. Real facts remain nullable and AI may not infer them. Publication additionally requires reviewed workflow state, confirmed Real Product Basis, and a usable public image. Index requires published state plus the existing SEO-quality and keyword-ownership checks. No facts were invented for real products; all 12 seeded Products remain explicit synthetic, Noindex fixtures.

## 6. Source Declaration model

Default OFF still hides and leaves all source/rights fields null. Enabling does not infer any right. Normal edit, normal review, and Admin Override are separate server actions and UI panels. Closing a populated declaration preserves history and audits the switch. Optimistic version conditions prevent a stale review from being written after a concurrent edit.

## 7. Public media and CDN model

ADR-0008 removes permanent origin URLs. Application authorization happens per request and both Local and S3 origin storage remain behind the route. Phase 1A deliberately disables shared media caching to make revocation immediate. R2/S3 public-access blocking, origin authentication, streaming/range behavior, and any future CDN purge/version mechanism are **External Validation Required** before production.

## 8. Analytics privacy changes

The public API is strict and accepts only public event names, granted consent, safe paths/origin, bounded UTM/last-touch tokens, safe Event IDs, public entity path, and per-event properties. Bare internal-style UUID Event IDs, customer emails/phones, private paths, filenames, unauthorized keys, oversized values, and mismatched replays are rejected. Analytics rejection never invalidates a successfully stored Inquiry.

## 9. Outbox lease implementation

`locked_at`, `locked_by`, `lease_expires_at`, `attempt_count`, `next_attempt_at`, `last_error`, unique `delivery_key`, and Dead state govern delivery. Tests cover two-worker competition, worker crash/lease expiry, duplicate Delivery Key, retry ceiling, and provider success followed by a lost Sent update while reusing the same Delivery Key.

## 10. Upload flow changes

The browser creates a small Intent, uploads one bounded binary per Intent, then sends only controlled tokens in the Inquiry JSON. The binary endpoint validates limits and rate keys before reading its body. The Intent is atomically linked to the quarantined Asset; reservation is Session-bound and expiry-bound; Inquiry creation validates exact Intent/Asset correspondence and consumes the tokens in the Inquiry transaction. Retention covers expired, failed, uploading, passed, and abandoned unconsumed states.

## 11. Migration changes

The schema now has 51 tables and eight migrations (`0000`–`0007`). Round 2 adds Asset rescan evidence/state, declaration version/review decision, random Inquiry public reference, Upload Intents, and Outbox lease/idempotency fields plus their foreign keys and indexes. Drizzle schema/migration consistency passes. No production database or Migration was run.

## 12. File changes

Round 2 currently contains 66 modified tracked files, one deleted obsolete raw-object public route, and 28 new files. New deliverables include migration 0007 and snapshot, ADR-0007/0008, PostgreSQL external checklist, runtime diagnostics, rescan/readiness services, Upload Intent routes/services/tests, controlled public Asset route, Outbox tests, Consent UI/tests, Domain Services, and privacy/bundle tests. `git status` and the local commits are the authoritative complete file manifest.

## 13. Tests added or strengthened

Coverage now includes 0000–0005 upgrade/rescan, readiness failures, Real Product/MIME publication, self-review denial, stale review invalidation, Admin Override audit, public archive/unlink/rights revocation, no raw origin URL, public path-to-entity resolution, top-level PII/UUID/length checks, consent/replay, Outbox leases and recovery, binary pre-body rejection, Session-bound one-time tokens, failed upload cleanup, forged proxy headers, controlled private 404, dynamic OG/Breadcrumb, Consent UI, and stale Bundle refusal.

## 14. Build, lint, and TypeScript

- `pnpm build`: pass under Next.js 16.2.12; 38 static-generation units completed and all dynamic routes compiled.
- `pnpm lint`: pass with zero warnings.
- `pnpm typecheck`: pass under strict TypeScript.
- `pnpm audit --prod`: no known vulnerabilities.

## 15. Vitest and Playwright

- Vitest: 32 files, 68 tests, all passed; no applicable test was skipped or deleted.
- Playwright: 14 desktop/mobile tests, all passed; isolated database/storage/auth per run.
- Public HTTP surfaces: 11 primary paths return 200 in E2E.
- Business paths: text-only Inquiry, image-only Inquiry, private attachment, auth/audit, revision approval, 301, CRM ownership/status/activity all pass.

## 16. Public Bundle

The fresh-build checker inspected 20 non-admin public client manifests and 29 referenced manifest/chunk files. No Refine, `src/admin`, or `RefineAdminProvider` reference was found. The checker also has a negative test proving that absent/stale builds fail clearly.

## 17. UI, Consent, mobile, accessibility, and performance

Consent defaults off and was exercised through allow and withdrawal in unit and browser tests. Desktop and Pixel 7 projects have zero critical/serious Axe findings on Home; the discovered contrast defect was fixed rather than suppressed. Mobile has no horizontal overflow and retains fixed inquiry actions. Optimized production build and bounded public JavaScript are verified; production field Core Web Vitals remain dependent on real assets, host, origin storage, and domain and are not claimed locally.

## 18. Reproducible environment

Locked runtime is Node 24.14.0 ARM64 and pnpm 11.9.0. `pnpm install --frozen-lockfile` succeeds. `env:diagnose` executes Sharp 0.35.3, Lightning CSS 1.32.0, and Next SWC 16.2.12 ARM bindings successfully. `.next` was deleted before the final production build. Framework versions were not upgraded during Round 2.

## 19. Real PostgreSQL validation

Status remains **External Validation Required**. No Docker/PostgreSQL system software was installed. `POSTGRESQL_EXTERNAL_VALIDATION.md` and `db:validate:postgres` define safety guards and checks for fresh/upgrade migrations, deferred constraints, PL/pgSQL triggers, partial indexes, advisory locks, route/primary/idempotency concurrency, multi-worker Outbox leases, token competition, FK/delete behavior, JSONB/enums/timezones, seed idempotency, query plans, failed migration recovery, backup/restore, and R2 origin/media revocation. The scripted check intentionally reports partial pass until multi-connection and restore evidence is witnessed.

## 20. Remaining findings and external dependencies

- Blocker: none remaining in the locally executable/PGlite scope.
- High: none remaining in the locally executable scope; SMTP-provider deduplication and real R2/S3 revocation are external validation items.
- Medium: none known from the specified Round 2 list.
- External gate: real PostgreSQL matrix, backup/restore rehearsal, and provider-origin validation.
- Business data: `Waiting for Real Product Data Validation`; no real 10–15 Product truth/SEO acceptance is claimed.
- Production inputs still absent: formal domain/address/email/WhatsApp, verified company/factory facts, rights-cleared real assets, production accounts/keys, and approved retention periods.

## 21. Git and deployment state

Changes are committed locally in reviewable Round 2 commits. No external Git push, Preview, Production deployment, production database, production key, DNS change, or formal data import occurred.

## 22. Recommendation

Request a third independent read-only Phase 1A review against the Round 2 brief. Do not enter Phase 1B. Phase 1A external database acceptance remains pending until the real PostgreSQL and provider checklist has approved evidence.
