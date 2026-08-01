# CWT Phase 1A Final Closure implementation report

Date: 2026-08-02

Baseline: frozen CWT Product and Technical Architecture V1.1

Scope: the fifth independent review's two Medium and two Low findings only. Phase 1B, real PostgreSQL/R2/S3 acceptance, provider integration, deployment and formal data remain excluded.

## 1. Two Medium findings

1. **Governed mutation/Audit atomicity — fixed locally.** A shared governed-mutation context opens the transaction and supplies a transaction-bound Audit writer. Product, Application, Fabric Library, Content, Taxonomy, SEO and identity session paths no longer commit their required Audit after the business mutation. Existing CRM, governance and Asset services were re-audited and already use explicit transactions. Injected Audit failure rolls every related mutation back.
2. **Asset Finalize orphan prevention — fixed locally.** A Finalize Batch is atomically claimed, every expected storage key is registered in a persistent cleanup queue before the put, public activation remains database-gated, and failure cleanup survives process interruption with lease recovery, retry, dead-letter state and audited alerting. Concurrent/repeated Finalize cannot double-activate.

## 2. Two Low findings

1. **Conversion Event Check Constraint — fixed by forward Migration.** Drizzle Schema, Snapshot, Migration 0011, documentation and tests share one expression. It allowlists public event names and entity types, requires entity type/ID pairing, and rejects CRM/internal event names. Fresh and Upgrade tests inspect the actual database constraint definition.
2. **Admin operation feedback — fixed consistently.** Governed forms now share a typed Action Result with pending, success, safe validation/permission/conflict/network/unknown failures, repeat-submit prevention, refresh/redirect intent, focused error summary and ARIA live announcements. Asset Upload/Finalize has the equivalent protected feedback flow. Raw database/provider errors are sanitized.

## 3. Governed Domain Service audit inventory

- Identity: authenticated session creation, User last-login update and session revocation.
- Product: drafts/revisions, factual review, submit/reject/publish, structure relations, Index, archive and Slug/Redirect.
- Application/Taxonomy: drafts/revisions, review/publish/reject, terms, Product relations and Index.
- Fabric Library: draft/revision, review/publish/reject, independent value and Index.
- Content: draft/revision, review/publish/reject and Index.
- SEO: Metadata, Topic, Keyword Mapping, Route and Redirect.
- Governance: Authors, Company Facts, Contacts/Organizations and Feature Flags.
- CRM: Inquiry assignment/status/priority/qualification/lost reason, Activities and status history.
- Assets: source declaration edit/review/override, Batch/Intent lifecycle, release, relation changes, inquiry-orphan cleanup, retention and cleanup dead-letter alerts.

All mutation paths above use the shared helper or an existing explicit transaction with a transaction-bound Audit writer. Read access and unsuccessful-attempt Audits have no business mutation to roll back. A static scan covers every governed service family and rejects transaction-outside `writeAuditLog(db, …)` calls; Admin Server Actions still contain no direct business writes.

## 4. Audit atomicity implementation

`runGovernedMutation` accepts a database, callback and optional injectable Audit writer. It supplies only the transaction and a bound `audit(input)` function. Nested Product Slug changes pass the same transaction/Audit dependency into Redirect handling. Audit failure rejects the transaction, including relation replacement, state transitions, Metadata/Index, Route/Redirect and identity-session rows. Direct Domain Service calls still run their own server permission checks.

External side effects are intentionally outside database transactions. Object storage now uses durable compensation; notifications retain the existing persistent outbox.

## 5. Asset Finalize compensation model

1. Claim `ready_to_finalize → finalizing` by compare-and-set; only one caller proceeds.
2. Revalidate actor Session, files, scanner/decode facts, roles and association targets.
3. Before each public original/variant put, upsert a pending cleanup record for the exact partition/key.
4. Perform storage writes while all database Assets remain Private/Internal and therefore unavailable to the media route.
5. Atomically activate Asset/Variants/relations, consume Intents, complete Batch, cancel public compensation jobs, retain a Private staging cleanup job and write required Audits.
6. On any failure, mark/release the Batch and compensation records transactionally, then let the cleanup worker delete idempotently.

This covers provider `put` persisting bytes and then throwing, derivative interruption, mid-variant failure, relation/database/Audit rollback, concurrency and replay.

## 6. Cleanup Queue and recovery

`object_cleanup_jobs` stores Batch/Asset context, partition/key, reason, pending/processing/completed/cancelled/dead status, attempt count, schedule, lock/lease, safe error and timestamps. Partition/key uniqueness makes registration and deletion idempotent. Workers reclaim expired leases, retry with exponential delay and produce `object_cleanup.dead` Audit evidence after exhaustion. A failed Batch returns to ready only after all released public compensation completes; a dead job keeps it failed. `pnpm cleanup:objects` is the local/worker entry point.

Selected R2/S3 semantics remain **External Validation Required**: private bucket policy, SDK retry/acknowledgement behavior, conditional overwrite, delete idempotency, read/list consistency, versioning/lifecycle and interruption testing.

## 7. Check Constraint authority

`conversion_events_public_only_check` enforces all three conditions:

1. Event name is one of `product_view`, `quote_cta_click`, `whatsapp_click`, `upload_started`, `image_upload_completed`, `quote_submit_success`, or `inquiry_created`.
2. Entity type is null or one of `product`, `application`, `fabric_entry`, or `content`.
3. Entity type and entity ID are either both null or both non-null.

Internal CRM outcomes stay in CRM tables and cannot be inserted into public Conversion Events. Migration 0011 safely drops the earlier inconsistent named constraint and adds the authoritative expression once; no historical Migration was rewritten.

## 8. Admin feedback pattern

`AdminActionResult` is a discriminated union carrying success/message/entity/intent or safe form/field errors and an error kind. `AdminActionForm` disables its fieldset while pending, holds an immediate repeat-submit guard, announces pending/success, focuses an assertive error alert and refreshes server-rendered data after success. All Author, Company Fact, Organization, Contact, Feature Flag, Product, Application, Fabric Library, Content, Source Declaration, Taxonomy and main CRM forms use it. Asset Upload/Finalize implements the equivalent Fetch/API pattern and focus behavior.

Unit tests cover success, validation, permission, conflict, unknown database-error sanitization, repeat suppression, focus/ARIA and Finalize error feedback. Browser acceptance creates an Author, observes the success status and confirms the persisted field after refresh.

## 9. Migration and Schema changes

- Added `finalizing` to `asset_upload_batch_status`.
- Added `object_cleanup_status` enum.
- Added `object_cleanup_jobs` with unique key, work/batch indexes, lease/retry/dead fields and Batch/Asset foreign keys.
- Replaced `conversion_events_public_only_check` by forward Migration `0011_clever_inertia.sql`.
- Added Snapshot 0011 and journal entry; Drizzle Generate reports no remaining change.
- Fresh, full-chain repeat and Upgrade paths pass locally; actual `pg_get_constraintdef` is asserted.

## 10. File changes

New: Migration/Snapshot 0011, governed-mutation helper and atomicity tests, object-cleanup service/worker script, typed Admin Action Result/invoker/form and tests, plus Asset Finalize feedback test.

Modified: package cleanup script; Audit-governed Product/Application/Fabric/Taxonomy/Content/SEO/Auth/Upload services; Admin upload APIs/UI and governed module forms; Asset/Analytics enums/schema and migration tests; Playwright browser acceptance; `AGENTS.md`; `ARCHITECTURE.md`, `DATA_MODEL.md`, `CMS_AND_PERMISSIONS.md`, `ASSET_AND_UPLOADS.md`, `TESTING_AND_ACCEPTANCE.md`, `OPERATIONS_RUNBOOK.md`, and this report. No project file was deleted in the delivered tree.

## 11. Tests added or strengthened

- Audit-failure rollback for Product, Application, Fabric Entry, Content, Taxonomy/Application relations, SEO Metadata, publish/review/archive, nested Slug/Redirect and identity sessions.
- Static coverage of all governed service families and direct-service permission enforcement.
- Persistent pre-put compensation; put-after-persist; original/first/mid variant; database/Audit/relation failure; cleanup retry/idempotency; worker lease recovery/dead Audit; concurrent/repeated Finalize; inaccessible media/no permanent unrecorded orphan.
- Fresh/Upgrade actual constraint-expression checks, legal/illegal events and entity pairing, one-add/snapshot/schema parity.
- Typed feedback classification, raw-error sanitization, pending/repeat/success/refresh, error focus/ARIA and Asset Finalize failure.
- Browser Author success and persisted refresh while retaining every prior Desktop/Pixel 7 scenario.

No prior test was deleted or weakened; no skip, TODO or only marker was added.

## 12. Local quality results

- Environment: Node 24.14.0 arm64, pnpm 11.9.0, Sharp 0.35.3, Lightning CSS 1.32.0 and Next SWC 16.2.12 load.
- ESLint: pass with zero warnings.
- Strict TypeScript: pass.
- Drizzle Check: pass; Generate: no schema delta after 0011.
- Vitest: 43 files / 100 tests pass, including Fresh/Upgrade migrations, constraint introspection and repeatable Seed coverage.
- Production Build: pass; 40 static/dynamic route units generated.
- Public Bundle: 20 public manifests / 29 referenced files contain no Refine/admin dependency.
- Playwright: 17/17 pass across Desktop Chromium and Pixel 7.
- HTTP/A11y/mobile: 11 principal public paths return 200; Home has zero Axe Critical/Serious findings; Pixel 7 has no horizontal overflow.
- Production dependency audit: no known vulnerability.

## 13. Existing capability regression

Historical Asset rescan/readiness, real Product eligibility, Effective Rights, Source Declaration separation/versioning, Analytics/CRM privacy, server Consent, public/admin streaming Upload Intents, Fabric/Content role-MIME, Published/Index separation, Revision, true HTTP 301/slash URLs, controlled public media, CRM record authorization, Outbox lease, Contact snapshot protection, Inquiry idempotency, Refine public-bundle isolation, non-production Noindex and Product Code nonblank enforcement remain active and pass.

## 14. Severity and phase state

Local authorized-scope self-check after full gates: Blocker 0, High 0, Medium 0, Low 0 identified. This is not a substitute for the requested independent Final Closure review. Phase 1B remains paused. Real Product validation remains `Waiting for Real Product Data Validation`.

## 15. External validation

Not executed: real PostgreSQL migration/locking/query behavior; R2/S3 policy and compensation semantics; production scanner, SMTP/Outbox provider, analytics providers, Preview/Production deployment, DNS, backup/restore, formal retention, Company Facts/rights, 10–15 real Products, production Core Web Vitals and crawler behavior.

## 16. Source control and external state

Implementation/tests/Migration are committed locally as `5c6698d` (`fix: close phase 1a final review findings`). The documentation/evidence commit is the next local commit and its immutable hash is available from `git log`. No external push, provider account call, Preview/Production deployment, production database/key, DNS mutation or formal data import occurred.

## 17. Final review recommendation

A final independent closing review is recommended. Review the Closure commits against the preceding accepted checkpoint with focus on Audit transaction propagation, external-side-effect compensation, Migration 0011 expression parity and Admin error sanitization/interaction behavior.

## 18. External PostgreSQL recommendation

Only if the independent closing review confirms no remaining Blocker/High/Medium should the frozen real PostgreSQL external acceptance plan begin. Passing local Closure does not authorize Phase 1B or production/provider work.
