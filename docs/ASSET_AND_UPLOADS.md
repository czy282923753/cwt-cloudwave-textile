# Asset and upload rules

## Default operator experience

Ordinary asset upload asks only for the file, asset category, optional Product/Fabric Entry/Content association, image role, and sort order.

`Enable Source Declaration` defaults to OFF. No source, copyright, authorization, restriction, review, expiry, or facility fields are displayed or populated. Upload, validation, scanning, derivation, association, and use continue normally.

## Optional declaration

The operator may enable declarations per asset or upload batch. Optional fields are source type/provider, rights, subject relationship, public/edit permissions, restrictions, evidence, reviewer, review date, expiry date, and whether the facility is CWT-owned.

Disabling a populated declaration warns the operator, hides it from normal editing, preserves values/history, and writes an Audit Log.

An operator with `assets.write` may edit declaration content but cannot record a review. A Reviewer/Publisher or Admin with `assets.declaration.review` records only their own reviewer identity and review date. A later declaration-content change clears the previous review unless an authorized reviewer reviews that same update. Review-only users receive a read-only summary plus a dedicated review action.

## Hints

Person, logo, certificate/document, or other exception hints are non-blocking. They do not enable declarations, infer ownership or consent, or prevent an ordinary upload.

## Partner factories

When declared, a partner factory may use `Subject Relationship = Partner Factory` and `Whether CWT-Owned Facility = No`. CWT photography does not make a facility CWT-owned. Public copy is governed by verified Company Facts.

## Security pipeline

Receive metadata → rate/limit checks → inspect MIME and signature → decode supported images → store in quarantine → malware scan → create safe derivatives → release to the appropriate public/private context. Failed or unknown production security states fail closed.

Public delivery performs a second fail-closed authorization check: Public partition, Public access, Ready status, Passed scan, no deletion, and an effective association with a Published Product, Published Fabric Entry, or Published Content. Private and Import objects never receive public URLs. A generic upload cannot attach directly to a Published entity; relationship changes for live entities must travel through its revision workflow.

Inquiry uploads use the Private partition and private access route only. Failed requests and concurrent idempotent losers clean unlinked objects. Customer files cannot be linked to public entities or AI knowledge automatically.
