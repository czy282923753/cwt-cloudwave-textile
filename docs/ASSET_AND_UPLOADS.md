# Asset and upload rules

## Round 2 operational addendum

Historical Assets use ADR-0007's two-phase process: migration produces `required/pending`, `assets:rescan-legacy` reads the recorded Public, Private, or Import object and records fresh scanner evidence, and `db:verify` fails for broken Published or Inquiry relations. Deleted or missing objects are `manual_review`; migration and seed never mark them Passed.

Public images are delivered only through `/api/public-assets/{assetId}/`. The route checks the current Published relation, scan/processing/deletion state, role/MIME compatibility and Effective Rights Decision before reading Local or S3 origin storage. The declaration UI switch is not an authorization input. Public HTML never contains an Object Key or permanent Bucket URL. Phase 1A responses are `private, no-store` so Archive, Unlink, Delete and Rights changes are effective on the next request. A production edge cache may be introduced only after explicit purge or delivery-version invalidation is verified.

Public Inquiry uploads use Upload Intent → bounded private upload → scan/decode → Session-bound Asset Token → small Inquiry JSON. Intent, Session, TTL, rate, declared MIME and any supplied Content-Length are checked before streaming. Actual bytes are counted during the stream and aborted immediately above the Intent limit. Missing Content-Length is supported; mismatched, interrupted or oversized bodies create no object, do not consume the Intent and remain retryable. Only a fully bounded body enters private quarantine and scan. Tokens expire, are single-use and are finalized in the Inquiry transaction. Expired and failed Intents and their Assets are handled by retention. The public Inquiry route never uses `arrayBuffer`, `blob`, `formData`, or large multipart parsing.

Admin Asset Library uploads use a separate `admin_asset` Intent kind: create an authenticated Batch bound to the acting User and active Auth Session; send each file to a raw binary PUT; scan it into Private/Internal staging; then finalize with small JSON. Category, association target, role, order, declared MIME/size and optional declaration state are server-bound before bytes arrive and revalidated at finalization. Each Intent is TTL-limited and single-use; cross-User, cross-Session, replay and expired requests fail. Expiry retention deletes staged objects and marks the Batch expired.

Public release occurs only after every Batch Intent passes. A ready Batch is atomically claimed as `finalizing`; concurrent or repeated callers cannot both activate it. Before each original or derivative put, an `object_cleanup_jobs` row records the expected partition/key. Object copies and image derivatives remain unaddressable until one database transaction activates Public storage/access, optional declaration statement, relation rows, consumed Intents, completed Batch and Audit Logs. On success, Public compensation jobs are cancelled and Private staging deletion remains a durable cleanup job. On put, derivative, relation, database or Audit failure, Public cleanup jobs are released for immediate retry and the original Asset remains Private/Internal. The Admin UI never sends file bytes through a Server Action, multipart Server Action body, `file.arrayBuffer()`, or large finalize JSON.

## Finalize compensation and recovery

- Cleanup registration precedes every external put, including a provider that persists bytes and then throws.
- Workers claim jobs with a lease, delete idempotently, and mark completion. An expired processing lease is reclaimable after a worker crash.
- Transient deletion failure increments the attempt, records only a safe error and schedules exponential retry. Exhausted attempts enter `dead` and create an audited `object_cleanup.dead` operational alert.
- A failed/finalizing Batch returns to `ready_to_finalize` only after all released Public compensation jobs complete; a dead job keeps it failed for investigation. Successful Batches stay completed.
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
