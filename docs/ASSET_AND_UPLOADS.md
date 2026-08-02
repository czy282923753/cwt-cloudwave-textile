# Asset and upload specification

This is the current normative specification for Upload, Asset, Finalize, Recovery, Cleanup, Storage Adapter and Public Media behavior. It consolidates the active rules; remediation rounds and implementation reports are evidence, not additional state models.

## 1. Business and security invariants

- Public Assets, private Inquiry files and internal Import/staging objects use isolated storage contexts and access policies. Customer files never enter public Assets or an AI knowledge base automatically.
- Production storage is nonpublic. Public HTML emits only `/api/public-assets/{assetId}/`, never an Object Key or permanent Bucket/CDN URL.
- Release requires validated bytes, a Passed scan, compatible role/MIME, Ready processing, no deletion, effective public rights and a live eligible Published relationship.
- External storage side effects are recoverable from durable database state. No external object may first become discoverable only through process memory or a post-failure Audit attempt.
- Core business state and its required Audit commit atomically. Post-commit maintenance cannot reverse or misreport a committed core success.
- Source declaration convenience never weakens byte limits, type/signature checks, decode, rate limits, scanning, isolation or private access.

## 2. Current state model

The implemented state sets are:

- Upload Intent: `created`, `uploading`, `passed`, `failed`, `consumed`, `expired`.
- Upload Batch: `created`, `uploading`, `ready_to_finalize`, `finalizing`, `completed`, `failed`, `expired`.
- Asset: `uploaded`, `quarantined`, `scanning`, `ready`, `rejected`, `deleted`; scan is independently `pending`, `passed`, `failed` or `error`.
- Recovery: `pending`, `processing`, `retryable`, `cleanup_required`, `completed`, `dead`, with persisted stages from preregistration through completion/failure.
- Cleanup: `standby`, `pending`, `processing`, `completed`, `cancelled`, `dead`.
- Manifest evidence: `planned`, `written`, `verified`, `unverified`.

These are descriptions of the current implementation, not authorization to add states. A change follows the frozen architecture-change process and engineering complexity gate.

## 3. Upload Intent and Batch

Public Inquiry and Admin Asset uploads use separate Intent kinds. Intents are private, short-lived, bound to the acting Session, rate-limited and single-use; replay, expiry and cross-Session use fail closed.

Public Inquiry flow is Upload Intent → bounded Private upload → validation/scan → Session-bound Asset Token → small Inquiry JSON. Only a fully accepted Intent may be consumed in the Inquiry transaction. Failed and expired Intents and unlinked assets enter retention handling. Inquiry retries are idempotent.

Admin upload creates a Batch bound to the authenticated User and active Auth Session. Metadata—including category, target association, role, order, declared MIME/size and optional declaration input—is server-bound before bytes arrive and revalidated at Finalize. Each file uses a bounded binary request; Server Actions, multipart Server Action bodies, `file.arrayBuffer()` and large Finalize JSON are not binary transports.

Before the first Admin staging `put`, one transaction persists the expected key, Private/Internal Asset placeholder, staging Recovery, Cleanup projection, controlled Intent/Batch states and required Audit. If any part fails, no storage write occurs. A Batch enters `finalizing` only in the transaction that creates or claims its Finalize Recovery, establishes its lease/fence, increments attempts and writes required Audit.

## 4. Staging and quarantine

Accepted bodies enter Private/Internal staging or Private Inquiry quarantine and remain nonpublic. Staging progress is persisted as preregistered, storage writing/written, scanning and scan passed. A process crash after persistence is recovered from this durable state rather than an in-memory key list.

Expiry retention removes eligible staged objects and marks the Batch or Intent explicitly. A staged object cannot become public merely because bytes exist or metadata says the upload succeeded.

## 5. MIME, magic bytes, decoding and scanning

Uploads enforce configured size/count and rate limits while streaming actual bytes. `Content-Length`, when supplied, is an early and exact consistency check but never the only limit. Missing `Content-Length` remains bounded. Oversized, mismatched or interrupted bodies create no storage object, do not consume the Intent and remain safely retryable.

The pipeline is: metadata and limit checks → declared MIME check → magic-byte inspection → supported-image decode → quarantine/staging → malware scan → safe derivatives → appropriate release. Failed or unknown production security states fail closed.

Hero, Gallery, Cover, Detail, Thumbnail and Inline accept JPEG, PNG, WebP or AVIF only. Document and Download may also accept PDF. PDF, certificate and document files cannot satisfy Product imagery, Fabric Entry Hero or Content Cover readiness.

## 6. Asset, Variant and relationship activation

Originals and generated Variants remain inaccessible until Finalize verifies the active fence, Manifest, compensation projection and actual object existence. One core database transaction then activates Public storage/access, optional declaration data, relationship rows, consumed Intents, completed Batch/Recovery and required Audit.

Public delivery rechecks Public partition/access, Ready, Passed scan, no deletion, role/MIME compatibility, effective rights and a currently eligible Published Product, Fabric Entry or Content relationship before storage read. Private and Import objects cannot satisfy this route. Generic uploads cannot attach directly to an already Published entity; live relationship changes follow that entity's revision workflow.

Phase 1A public media responses remain `private, no-store, max-age=0, must-revalidate` so archive, unlink, delete, scan or rights changes apply on the next request. Edge caching requires separately validated purge or delivery-version invalidation.

## 7. Manifest

Before the first Public original or derivative `put`, one transaction records the complete attempt-scoped Object Manifest and a one-to-one `standby` compensation row for every expected key, with required Audit. A `standby` row is not cleanup-claimable.

Each Manifest item identifies the attempt and expected role, MIME and byte size. Successful publication requires the current lease/fence, an exact Manifest/projection match and every expected object present. The same transaction cancels the exact standby compensation set.

Manifest authority comes from stored-byte evidence. `planned`, `written` or Migration-inferred `unverified` evidence cannot authorize Finalize or delivery. `verified` requires audited storage revalidation that records observed MIME, byte size and time. Evidence from a superseded attempt remains historical and cannot authorize or poison the current attempt.

## 8. Recovery and Cleanup

Staging and Finalize Recovery records persist stage, attempt count, next attempt, last safe error, lease/fence data and completion/failure state. On Public write, derivative, relation, database or required-Audit failure, the authoritative Manifest remains discoverable and compensation is armed atomically with required Audit. The original Asset remains Private/Internal.

An expired Finalize lease may be reclaimed before Manifest registration. When the locked Batch is still `finalizing`, the current Recovery owner/version/lease is valid, the stage is `claimed`, `source_copy_started` or pre-registration `variants_processing`, and there is no Manifest, Public Cleanup projection or Public Asset state, the Recovery Worker does not run an Attempt-scoped Cleanup query. It atomically hands the Batch and Recovery to the existing failed/retryable Finalize path with required system Audit. The next authorized Finalize claim uses the existing entry point; no Manifest or compensation row is fabricated, and the replaced Worker remains fenced.

A stage that requires a Manifest without one, Public Cleanup without corresponding Manifest authority, Public Asset state before the core commit, a Cleanup/Manifest identity mismatch or a Manifest attempt ahead of the Recovery attempt is contradictory. Recovery fails closed through the existing dead/manual-review boundary with required Audit, performs no storage deletion and does not expose the Asset. This contradiction path is distinct from the legal pre-Manifest handoff.

Only an audited Finalize failure, expired-lease recovery, fencing decision or explicit operator decision may arm Public compensation. Successful Finalize cancels it. Cleanup never uses a fixed grace period as a substitute for this authority.

Recovery and Cleanup reconciliation are Domain Service operations under the explicit system actor. A reconciled business transition and required Audit share a transaction; Audit failure rolls back the transition and leaves work reclaimable. No failing Audit writer is needed to discover the already-persisted work.

## 9. Lease, heartbeat and fencing

The Finalize claim transaction establishes the owner, expiry, optimistic version and Recovery record before the Batch can be `finalizing`. A second Worker cannot claim a valid lease; an expired lease may be safely reclaimed. A Worker renews the lease during long storage/image operations and fences each persisted stage and final commit by owner, unexpired lease and version. A pre-Manifest takeover preserves this fencing while it performs the audited handoff; releasing the Recovery to the existing retryable path does not restore authority to the expired Worker.

An expired or replaced Worker cannot commit. Claim, success, failure/recovery and Cleanup coordination use the established lock order Batch → Recovery → Manifest → Cleanup. `finalizing` without a usable Recovery is abnormal; reconciliation creates or repairs a retryable recovery path with required system Audit and never silently resets history to `ready_to_finalize`.

## 10. Finalize Core Commit

Finalize stages persist claim, Manifest registration, source copy, original and Variant writes, database finalization, cleanup/failure and completion. The core success transaction persists:

- Public Asset and relationship activation;
- consumed Intents;
- completed Batch and Recovery;
- cancellation of Public compensation;
- required Audit;
- discoverable Private staging Cleanup.

Final commit revalidates current Session identity, lease owner/expiry/version, Manifest/projection and actual-object evidence. Once committed, that result is authoritative. Repeated Finalize is idempotently successful only for the original active User/Auth Session after exact Batch, Intent, Asset, Recovery, Manifest, Cleanup projection and stored-byte verification; missing or mismatched identity/evidence fails closed.

### Required Audit

Required Audit participates in business correctness. It is written in the same transaction as the governed state change; failure rolls back that state change. Claim, release, compensation arming, rights decisions and reconciled business transitions use this boundary.

## 11. Post-Commit Maintenance

After core success, waking Cleanup, deleting Private staging bytes, persisting Cleanup completion and writing maintenance Audit are non-critical maintenance. Failure yields a warning and continues through the existing durable retry or operator path. It must not downgrade the completed Batch, re-arm Public compensation, revoke the released Asset or turn the successful request into failure.

### Non-critical maintenance records

These records describe maintenance performed after authoritative success. They do not participate in the already-committed business result. Their failure is observable and recoverable, but is not converted into a new critical transaction or coordination mechanism by default.

## 12. Cleanup identity revalidation

A Cleanup Worker locks and revalidates complete authority immediately before deletion: Batch, Intent, Recovery, recovery version, attempt, Manifest item, Asset, partition/kind/key, role, MIME and size. It refuses deletion while a valid Finalize lease exists.

Identity or projection mismatch performs no delete and transitions to required audited dead/manual review. If that required Audit fails, the transition rolls back and the job remains reclaimable. Public media never resolves copied bytes by key alone, so compensation windows remain inaccessible.

## 13. Historical Evidence

Historical Assets are never inferred Passed. Migration marks eligible legacy rows `required/pending`; `assets:rescan-legacy` reads the recorded Public, Private or Import object and records byte-backed validation and scan evidence. Missing, failed or deleted sources remain nonpublic and go to `manual_review`.

`db:verify` fails readiness when a Published public entity has a broken Asset relation or a Product has no eligible image, and when an Inquiry attachment is not a Passed Private Inquiry Asset. Seed and fixtures do not manufacture historical scan evidence. Legacy Manifest metadata remains `unverified` until the authoritative storage revalidation and Audit commit.

## 14. Retry, Dead and manual handling

Workers claim jobs with a lease and perform idempotent deletion. Expired processing leases are reclaimable. Transient failures increment attempts, store only safe errors and use the existing exponential retry. Exhausted work becomes `dead` and produces the existing audited operational alert/manual-review path.

Cleanup Kind determines whether dead-letter exhaustion may affect workflow state. `staging` is pre-release recovery and retains its existing Batch/Staging-Recovery failure behavior. `finalize_public` compensates a Finalize that did not commit and retains its existing Batch/Finalize-Recovery failure behavior. `finalize_private` removes staging bytes only after Finalize Core Commit: exhaustion marks only that Cleanup job `dead`, records a maintenance/manual-cleanup outcome, and must not change the completed Batch, completed Recoveries, consumed Intent, Public Asset/relations or cancelled Public compensation. A standalone `generic` retention job remains scoped to the object and any explicitly registered context.

Failed or recovered Batches remain explicit and retryable until a new authorized Finalize claim; dead work remains failed for investigation; successful Batches remain completed. The operator UI reports actionable results without exposing Lease, Recovery or Manifest concepts.

The approved worker/scheduler runs `pnpm cleanup:objects`. Production scheduling, monitoring and dead-letter alert routing must fail closed before deployment.

## 15. Source declaration and rights

Ordinary upload asks only for file, category, optional association, image role and sort order. `Enable Source Declaration` is OFF by default. When disabled on a new upload, source, copyright, authorization, relationship, review, expiry and facility fields remain hidden and null; the system does not infer `CWT Original Photography`, `CWT Owned` or any equivalent.

Operators may enable declaration per Asset or Batch. The optional fields cover source/provider, rights, subject relationship, public/edit permission, restrictions, evidence, reviewer, review date, expiry and whether a facility is CWT-owned. Non-blocking person, logo and document hints never infer ownership/consent, enable the declaration or block ordinary upload.

Disabling a populated declaration warns, hides and preserves history and is audited. Declaration editing and review are separate: the last editor cannot approve the same statement version; a later edit increments the statement version and invalidates prior review. Reviewer/Publisher or Admin decisions record the acting reviewer and reviewed version. Admin Override is separate, Admin-only, reason-required and audited. Each mutation uses optimistic record versioning and commits content/review/override plus required Audit atomically.

The UI switch is not an authorization input. Effective Rights Decision controls public use and survives switch-off; only a current-version authorized review or Admin Override may replace an effective restriction. A partner factory may be marked `Partner Factory` and `Whether CWT-Owned Facility = No`; CWT photography never proves facility ownership, and public copy remains governed by verified Company Facts.

## 16. External Validation Required

Before production, validate against the selected real providers and deployment:

- PostgreSQL locking, isolation, deadlocks and query behavior for claims and reconciliation;
- R2/S3 conditional/overwrite behavior, `HEAD`, delete idempotency, read-after-write/list consistency, SDK retries and interruption after provider acknowledgement;
- bucket public-access blocking, lifecycle/versioning and credential isolation;
- media-route cache headers, origin authentication, purge/version invalidation, Range behavior if enabled and large-object memory behavior;
- production Worker schedule, monitoring, retry/dead-letter alerts and operator runbooks;
- rate-limit enforcement across multiple application instances.

These boundaries require real external validation; local inference is neither proof nor a reason to invent additional mechanisms.
