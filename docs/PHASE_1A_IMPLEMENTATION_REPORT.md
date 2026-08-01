# CWT Phase 1A Final Closure Round 2 implementation report

Date: 2026-08-02

Baseline: frozen CWT Product and Technical Architecture V1.1 plus `AGENTS.md`

Scope: only the final review's two Medium and one Low findings. Phase 1B, real PostgreSQL/R2/S3/SMTP acceptance, Excel import, AI, multilingual work, deployment, DNS and formal data remain excluded.

## 1. Closure result

- Medium 1 — Upload Staging partial-success state: fixed locally.
- Medium 2 — Finalize claim crash window: fixed locally.
- Low — Admin Action Result, Redirect Intent and field feedback: fixed locally.
- Authorized-scope self-check: Blocker 0, High 0, Medium 0, Low 0.
- Phase 1B remains paused. Independent Final Closure Round 2 review is still required.

## 2. Upload Staging consistency model

Admin upload completion is a persistent three-phase Saga:

1. **Preregister transaction:** revalidate User, Auth Session, permission and Intent; generate the expected Private/Internal key; create a nonpublic Asset placeholder, staging `upload_recovery_jobs` row and idempotent private `object_cleanup_jobs` row; move Intent/Batch to controlled receiving states; write required Audit. Failure of the Recovery insert, any database step or Audit rolls the transaction back and prevents `storage.put`.
2. **External write and scan:** persist `storage_writing`, `storage_written`, `scanning` and `scan_passed` progress around the bounded write, MIME/magic/decode validation and malware scan. The expected key and compensation path already exist in the database, including when a provider persists bytes and then throws or the process crashes.
3. **Completion transaction:** set the Asset Ready/Passed, Intent passed, Batch ready/uploading, close the staging Recovery lease, delay the private cleanup row and write Audit atomically. A database or Audit failure rolls this transaction back; the staged object remains private and its earlier Recovery/Cleanup rows remain discoverable.

No failure branch depends on a process-local object-key array or a second call to the writer that just failed. The Recovery worker can restart, claim expired work, schedule cleanup and reconcile Batch/Intent/Asset state through the Domain Service.

## 3. Recovery Job creation timing

`upload_recovery_jobs.kind = staging` is unique per Upload Intent and is created before the first byte is written externally. It stores Batch, Intent, placeholder Asset, partition/key, phase, status, attempt schedule, lease, version, safe last error, expiry and timestamps. An idempotent private cleanup record is created in the same preregistration transaction. This proves there is no path where a staging object exists but its expected key has never been persisted for recovery.

## 4. Finalize lease model

Finalize uses `upload_recovery_jobs.kind = finalize`, unique per Batch, as the independent persistent Finalize Job. One claim transaction:

1. validates Batch state and absence/expiry of another lease;
2. sets `finalizing`;
3. creates or claims the Finalize Recovery row;
4. records lease owner, lock/expiry, attempt count and optimistic version;
5. writes the required Audit.

Claim Audit/database failure rolls everything back. A Batch cannot normally become `finalizing` without its recoverable lease record. Progress persists through `claimed`, source copy, original, variants, database finalization, cleanup/failure and completion. Every stage advance and final commit is fenced by Recovery ID, current owner, unexpired lease and version. Once a lease expires or a new worker takes over, the old worker cannot commit.

## 5. Finalize crash recovery

The recovery worker scans due/retryable/cleanup work and expired processing leases. An immediate post-claim crash leaves an active lease plus Recovery row; expiry permits a safe claim by another worker. If legacy/corrupt state contains a `finalizing` Batch with a missing, completed or dead recovery record, audited reconciliation recreates/repairs an explicit retryable/failed state. It never silently resets to `ready_to_finalize` or discards history. Retry exhaustion reaches `dead` for operator handling. Successful Finalize clears the lease and completes Recovery atomically with Batch/Asset/Intent/relation/Audit changes.

## 6. Cleanup reconciliation and Audit

Cleanup and upload-recovery reconciliation use `system:upload-recovery-worker` through Domain Services. Cleanup deletion is idempotent, but database completion is a transaction containing Cleanup status, affected Batch/Intent/Asset/Recovery state and Audit. If Audit fails, the transaction rolls back and the job remains reclaimable; a deleted object can safely be deleted again. Retry/dead transitions use the same rule. Persistent Audit failure cannot mark Recovery or Cleanup complete, and an Admin upload or Finalize result cannot be reported successful without its mandatory Audit.

## 7. Admin Action Result pattern

All 66 governed Admin write Actions return `Promise<AdminMutationOutcome>` and no write Action directly calls `redirect()` or returns `void`. The shared adapter returns a discriminated `AdminActionResult`:

- success: safe message, optional Entity ID, `refresh | redirect | none`, optional `redirectTo`;
- failure: safe message/form error, field-error map and `VALIDATION_ERROR | FORBIDDEN | CONFLICT | NOT_FOUND | AUDIT_FAILURE | NETWORK_ERROR | UNKNOWN_ERROR`.

Domain Services still own authorization, constraints, workflows and Audit transactions. Database/provider details are sanitized. The client has an immediate duplicate-submit guard, explicit pending state, success/error ARIA regions, focused error summary and field `aria-invalid`/descriptions.

## 8. Redirect Intent and field errors

Create Actions return the created Entity ID. Product, Application, Content, Fabric Entry and Company-detail-capable flows use their stable Admin destinations; Author creation uses a distinct `/admin/authors/?created={id}` intent so a same-URL refresh cannot obscure the committed read. The client stores success before scheduling `router.push`; navigation failure leaves the business success result visible on the current form. Browser tests follow Author and Application Redirect Intents and confirm the target reads the committed entity.

Required-field validation collects multiple missing fields in one result. Enum/schema parsing binds issues to the submitting field. Covered forms include Product, Taxonomy, Application, Content, Fabric Entry, Author, Company Fact, Organization, Contact, Feature Flag, Asset operations and principal CRM mutations. Permission, optimistic conflict and Audit failure remain form-level business errors rather than being mislabeled as field errors.

## 9. Migration changes

Forward Migration `0012_nostalgic_calypso.sql` adds:

- enums `upload_recovery_kind`, `upload_recovery_status`, `upload_recovery_stage`;
- table `upload_recovery_jobs` with Batch/Intent/Asset foreign keys, expected storage identity, progress, retry, lease, version and lifecycle fields;
- unique Intent and partial unique Finalize-per-Batch indexes;
- due-work and Batch/kind indexes.

Drizzle Schema, Snapshot `0012_snapshot.json` and Journal agree. Fresh migration and Upgrade from Migration 0011 pass. Existing Migration semantics were not modified. Phase 1A now has 54 relational tables.

## 10. File changes

New implementation files: Migration/Snapshot 0012, `src/uploads/upload-recovery-service.ts`, `src/uploads/upload-saga-recovery.integration.test.ts`, and `src/admin/invoke-admin-action.test.ts`.

Modified implementation areas: Upload staging/Finalize service, object-cleanup worker/service, Audit error typing, Admin Action result/invoker/forms/actions, upload API adapters and feedback UI, database schema/migration integration tests, governed-mutation static tests and browser acceptance. Modified documentation is limited to `AGENTS.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `CMS_AND_PERMISSIONS.md`, `ASSET_AND_UPLOADS.md`, `TESTING_AND_ACCEPTANCE.md`, `OPERATIONS_RUNBOOK.md` and this report. No tracked project file was deleted.

## 11. Tests added or strengthened

The prior 43 Vitest files/100 tests and 17 Playwright scenarios remain active. Current totals are 45 Vitest files/116 tests and 18 Playwright scenarios. New substantive coverage includes:

- preregistration Audit, Recovery insert and database failure before put;
- put persistence followed by throw, post-put/process crash and restart;
- scan and Asset/Intent/Batch completion failures;
- persistent Audit outage, cleanup Audit rollback and idempotent retry;
- Finalize claim interruption/Audit failure and immediate crash;
- active lease exclusion, expired takeover, stale-worker fencing and version conflict;
- Recovery-worker crash/restart, retry exhaustion/dead and abnormal-gap reconciliation;
- Action success/message/Entity ID/Redirect, field and multi-field errors, permission/conflict/Audit/network/unknown failures, repeat suppression, ARIA/error focus and Asset Finalize failure;
- browser navigation to real persisted Author and Application results.

No `skip`, `todo` or `only` was added; no critical test was deleted or weakened.

## 12. Targeted gate result

Targeted Admin/upload/recovery/migration suites pass. The upload Saga suite proves the persistent-record-before-object invariant, Audit rollback, cleanup retry, crash restart, Finalize lease takeover and stale-worker rejection. Admin unit/component/static tests prove typed result, Redirect Intent, field feedback, duplicate suppression and forbidden direct write/redirect/void patterns. The Author Redirect/persistence flow passes 10 sequential repetitions with Playwright retries disabled.

## 13. Full local quality gate

- Environment: Node 24.14.0 arm64, pnpm 11.9.0, Sharp 0.35.3, Lightning CSS 1.32.0 and Next SWC 16.2.12 load.
- ESLint: pass, zero warnings.
- TypeScript strict: pass.
- Drizzle Check: pass; Generate reports no schema delta after Migration 0012.
- Vitest: 45 files / 116 tests pass. PGlite files use one Vitest worker for deterministic local resource use; explicit concurrency and lease races execute inside the integration suites.
- Fresh/Upgrade Migration and repeatable Seed: pass.
- Production Build: fresh Next.js 16.2.12 build passes; 40 route/static-generation units complete.
- Public Bundle: 20 public manifests / 29 referenced files contain no Refine/admin dependency.
- Dependency audit: no known production vulnerability.
- Playwright: 18/18 pass across Desktop Chromium and Pixel 7 with retries disabled.
- HTTP/mobile/accessibility: 11 principal public paths return 200; Pixel 7 has no horizontal overflow; sampled Home has zero Axe Critical/Serious findings.

## 14. Existing capability regression

Governed Domain Service/Audit transactions, Product Revision, Published/Index separation, real Product Eligibility, historical Asset rescan, Effective Rights, Source Declaration separation/concurrency, Analytics/CRM privacy, server Consent, public/admin streaming upload, Fabric/Content MIME roles, real 301/slash URLs, controlled public media, CRM record authorization, Notification Outbox leases, Inquiry idempotency, Conversion Event and Product Code constraints, Refine public-bundle isolation and non-production global Noindex remain active and pass the retained regression suite.

## 15. External validation required

Not executed: real PostgreSQL locking/migration/query behavior; R2/S3 private policy, acknowledgement/retry/overwrite/delete/consistency/interruption semantics; scanner and SMTP providers; Preview/Production deployment; DNS; backup/restore; production retention; formal Company Facts/rights; 10–15 real Products; production Core Web Vitals/crawler checks. Real Product validation remains `Waiting for Real Product Data Validation`.

## 16. Source control and external state

Implementation, Migration and tests are committed locally as `d5ac8f3` (`fix: harden upload recovery and admin action results`). Documentation/evidence is a separate local commit recorded in final `git log`. No external push, provider call, Preview/Production deployment, production database/key, DNS mutation or formal data import occurred.

## 17. Review and next-step recommendation

Re-run the independent Final Closure directed review against the Round 2 commits. Phase 1B must remain paused. If and only if that review confirms Blocker 0, High 0 and Medium 0, begin the separately authorized real PostgreSQL external acceptance plan. Local closure does not itself authorize external validation, production work or Phase 1B.
