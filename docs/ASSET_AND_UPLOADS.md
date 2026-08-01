# Asset and upload rules

## Round 2 operational addendum

Historical Assets use ADR-0007's two-phase process: migration produces `required/pending`, `assets:rescan-legacy` reads the recorded Public, Private, or Import object and records fresh scanner evidence, and `db:verify` fails for broken Published or Inquiry relations. Deleted or missing objects are `manual_review`; migration and seed never mark them Passed.

Public images are delivered only through `/api/public-assets/{assetId}/`. The route checks the current Published relation, scan/processing/deletion state, image MIME, declaration denial and declaration expiry before reading Local or S3 origin storage. Public HTML never contains an Object Key or permanent Bucket URL. Phase 1A responses are `private, no-store` so Archive, Unlink, Delete and Rights changes are effective on the next request. A production edge cache may be introduced only after explicit purge or delivery-version invalidation is verified.

Public Inquiry uploads use Upload Intent → bounded private upload → scan/decode → Session-bound Asset Token → small Inquiry JSON. Declared length and MIME are checked before the binary body is read. The quarantined Asset is transactionally linked to its Intent before storage/scanning so failed or interrupted work remains discoverable. Tokens expire, are single-use and are finalized in the Inquiry transaction. Expired and failed Intents and their Assets are handled by retention. The public Inquiry route no longer parses large multipart requests.

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

Inquiry uploads use the Private partition and private access route only. Failed requests and concurrent idempotent losers clean unlinked objects. Customer files cannot be linked to public entities or AI knowledge automatically.
