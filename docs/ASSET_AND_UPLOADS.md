# Asset and upload rules

## Post-commit success and evidence addendum

- Finalize core success includes every business write, required Audit, verified Manifest evidence, cancellation of Public compensation and creation of durable Private staging cleanup. Once committed, it is authoritative.
- Running Private cleanup is best-effort post-commit maintenance. Failure to wake the worker, delete staging bytes, persist cleanup completion, or write maintenance Audit is reported as a non-blocking cleanup warning. The Batch remains completed, the Public Asset remains released, and Public compensation is never re-armed.
- Retrying a completed Finalize is idempotently successful only for the original active User/Auth Session after exact identity and stored-byte verification. Batch/Intent/Asset/Recovery/Manifest/Cleanup mismatches or a missing/mutated Public object fail closed.
- A Cleanup worker re-locks and revalidates complete authority immediately before deletion. Any Batch, Intent, Recovery, version, attempt, Manifest item, Asset, partition/kind/key, role, MIME or size mismatch performs no delete and becomes audited dead/manual review. If that Audit fails, the state change rolls back and the work remains retryable.
- Public eligibility and `/api/public-assets/{assetId}/` require verified Manifest evidence for the authoritative completed Recovery attempt. Legacy Migration 0013/0014 metadata is unverified after Migration 0015 and cannot satisfy Finalize or public gates until storage bytes are read, magic MIME and size match, observations are persisted, and the system revalidation Audit commits. Evidence from superseded attempts remains unverified for diagnosis and cannot authorize the current release.

## Round 2 operational addendum

Historical Assets use ADR-0007's two-phase process: migration produces `required/pending`, `assets:rescan-legacy` reads the recorded Public, Private, or Import object and records fresh scanner evidence, and `db:verify` fails for broken Published or Inquiry relations. Deleted or missing objects are `manual_review`; migration and seed never mark them Passed.

Public images are delivered only through `/api/public-assets/{assetId}/`. The route checks the current Published relation, scan/processing/deletion state, role/MIME compatibility and Effective Rights Decision before reading Local or S3 origin storage. The declaration UI switch is not an authorization input. Public HTML never contains an Object Key or permanent Bucket URL. Phase 1A responses are `private, no-store` so Archive, Unlink, Delete and Rights changes are effective on the next request. A production edge cache may be introduced only after explicit purge or delivery-version invalidation is verified.

Public Inquiry uploads use Upload Intent → bounded private upload → scan/decode → Session-bound Asset Token → small Inquiry JSON. Intent, Session, TTL, rate, declared MIME and any supplied Content-Length are checked before streaming. Actual bytes are counted during the stream and aborted immediately above the Intent limit. Missing Content-Length is supported; mismatched, interrupted or oversized bodies create no object, do not consume the Intent and remain retryable. Only a fully bounded body enters private quarantine and scan. Tokens expire, are single-use and are finalized in the Inquiry transaction. Expired and failed Intents and their Assets are handled by retention. The public Inquiry route never uses `arrayBuffer`, `blob`, `formData`, or large multipart parsing.

Admin Asset Library uploads use a separate `admin_asset` Intent kind: create an authenticated Batch bound to the acting User and active Auth Session; send each file to a raw binary PUT; scan it into Private/Internal staging; then finalize with small JSON. Before the PUT, one preregistration transaction creates the expected Object Key, a nonpublic Asset placeholder, staging Recovery and Cleanup rows, controlled Intent/Batch state and required Audit. Only a complete transaction permits the external write. Category, association target, role, order, declared MIME/size and optional declaration state are server-bound before bytes arrive and revalidated at finalization. Each Intent is TTL-limited and single-use; cross-User, cross-Session, replay and expired requests fail. Expiry retention deletes staged objects and marks the Batch expired.

Public release occurs only after every Batch Intent passes. A ready Batch is atomically claimed as `finalizing` in the same transaction that creates/claims its Finalize Recovery row, establishes an owner/expiry/version lease, increments attempts and writes Audit. Concurrent or repeated callers cannot both activate it. Before the first original or derivative put, one transaction writes the complete attempt-scoped Object Manifest and one `standby` compensation row per expected key. `standby` cannot delete. Object copies and image derivatives remain unaddressable until one database transaction revalidates the lease fence, Manifest, all compensation states and object existence, then activates Public storage/access, optional declaration statement, relation rows, consumed Intents, completed Batch, Recovery completion and Audit Logs. On success, the lease is cleared and the exact compensation set is cancelled. On put, derivative, relation, database or Audit failure, authoritative Manifest state remains discoverable, compensation is atomically armed with Audit and the original Asset remains Private/Internal. The Admin UI never sends file bytes through a Server Action, multipart Server Action body, `file.arrayBuffer()`, or large finalize JSON.

## Finalize compensation and recovery

- Staging phases are persisted as preregistered, storage writing/written, scanning and scan passed. A process crash after object persistence is recovered from database state, never an in-memory key list.
- Finalize phases are persisted from claim through Manifest registration, source copy, original, variants, database finalization, cleanup/failure and completion. The worker renews/fences progress by lease owner, unexpired lease and optimistic version, including periodic heartbeat while a single storage or image operation is in flight.
- `finalizing` without a usable Recovery record is an abnormal state. Reconciliation recreates or repairs a retryable record, moves the Batch to an explicit failed recovery state and writes a system Audit; it never silently resets history to `ready_to_finalize`.
- The complete Manifest and standby Cleanup projection precede every Public put, including a provider that persists bytes and then throws. Failure/recovery arms the projection; success cancels it. No fixed grace interval decides deletion eligibility.
- Claim, success, failure and recovery serialize with lock order Batch → Recovery → Manifest → Cleanup. Cleanup also validates exact Manifest identity/role/MIME/size and refuses a valid Finalize lease.
- Workers claim jobs with a lease, delete idempotently, and mark completion. An expired processing lease is reclaimable after a worker crash.
- Transient deletion failure increments the attempt, records only a safe error and schedules exponential retry. Exhausted attempts enter `dead` and create an audited `object_cleanup.dead` operational alert.
- Recovery/Cleanup reconciliation uses the explicit system actor. Business state and Audit commit in one transaction; if Audit fails, work is not marked complete and remains reclaimable. Failed/recovered Batches stay in an explicit failed/retryable state until a new authorized Finalize claim. Dead work remains failed for investigation. Successful Batches stay completed.
- Public media delivery never resolves a copied key by key alone. It requires an activated Public/Ready/Passed Asset and effective Published relation, so compensation windows remain inaccessible.
- Run `pnpm cleanup:objects` from an approved worker/scheduler context. Production schedule, monitoring and dead-letter alert routing must fail closed and are required before deployment.
- R2/S3 provider behavior remains external validation: conditional/overwrite behavior, delete idempotency, read-after-write/list consistency, SDK retry semantics, private bucket policy, lifecycle/versioning and interruption after provider acknowledgement must be rehearsed against the selected provider.

## Default operator experience

Ordinary asset upload asks only for the file, asset category, optional Product/Fabric Entry/Content association, image role, and sort order.

`Enable Source Declaration` defaults to OFF. No source, copyright, authorization, restriction, review, expiry, or facility fields are displayed or populated. Upload, validation, scanning, derivation, association, and use continue normally.

## Optional declaration

The operator may enable declarations per asset or upload batch. Optional fields are source type/provider, rights, subject relationship, public/edit permissions, restrictions, evidence, reviewer, review date, expiry date, and whether the facility is CWT-owned.

Disabling a populated declaration warns the operator, hides it from normal editing, preserves values/history, and writes an Audit Log.

An operator with `assets.write` may edit declaration content but cannot approve the same statement version. A Reviewer/Publisher or Admin with `assets.declaration.review` records only their own reviewer identity, reviewed version, decision, time and optional reason. The last editor cannot perform normal review. A later declaration-content change increments the statement version and clears the previous review. Admin Override is a separate explicit action with a mandatory reason and Audit Log; it is never presented as normal two-person review.

## Hints

Person, logo, certificate/document, or other exception hints are non-blocking. They do not enable declarations, infer ownership or consent, or prevent an ordinary upload.

## Partner factories

When declared, a partner factory may use `Subject Relationship = Partner Factory` and `Whether CWT-Owned Facility = No`. CWT photography does not make a facility CWT-owned. Public copy is governed by verified Company Facts.

## Security pipeline

Receive metadata → rate/limit checks → inspect MIME and signature → decode supported images → store in quarantine → malware scan → create safe derivatives → release to the appropriate public/private context. Failed or unknown production security states fail closed.

Public delivery performs a second fail-closed authorization check: Public partition, Public access, Ready status, Passed scan, no deletion, and an effective association with a Published Product, Published Fabric Entry, or Published Content. Private and Import objects never receive public URLs. A generic upload cannot attach directly to a Published entity; relationship changes for live entities must travel through its revision workflow.

## Role and MIME matrix

Hero, Gallery, Cover, Detail, Thumbnail and Inline are image roles and accept only JPEG, PNG, WebP or AVIF. Document and Download accept those image types or PDF. PDF/certificate/document files cannot satisfy Product imagery, Fabric Entry Hero or Content Cover readiness, and public image queries filter them even if a direct database write creates an invalid relation.

## Effective rights and concurrency

`source_declaration_enabled` controls only field visibility/editability. Effective Rights Decision controls public use and survives switch-off. Declaration content has a statement version; every edit, review or Admin Override also increments an optimistic record version. Requests carry the expected record version. Content change, review invalidation and Audit Log—or review/override and Audit Log—commit in one transaction. A stale record version is rejected. Only an explicit current-version Reviewer/Publisher decision or reason-required Admin Override can replace an effective restriction.

Inquiry uploads use the Private partition and private access route only. Failed requests and concurrent idempotent losers clean unlinked objects. Customer files cannot be linked to public entities or AI knowledge automatically.
