# ADR-0009: Round 3 fail-closed public boundaries

- Status: Accepted
- Date: 2026-08-02
- Scope: Phase 1A Remediation Round 3 only

## Context

The third independent review found four High boundaries and two Medium details that remained weaker for historical/direct database records than for normal Domain Service writes: real-Product public eligibility, Asset rights enforcement, analytics/CRM privacy separation with revocable server Consent, actual upload byte limits, Source Declaration concurrency/atomic audit, and media role/MIME readiness.

## Decision

1. A central Product eligibility predicate is used by public Product list/detail, sitemap/index discovery, analytics entity resolution, publish validation and readiness. It requires Published state, real basis, active Admin or Reviewer/Publisher confirmer and time, current English localization/route, and a Public/Ready/Passed eligible image. Migration 0008 forces Noindex, demotes invalid historical Published rows to In Review, marks a remediation queue reason and writes an Audit Log. It never manufactures truth data.
2. Source Declaration UI state and Effective Rights Decision are independent. Not Allowed, Revoked, Expired, Pending Review, and Restricted without public-website permission remain nonpublic when the UI switch is OFF. Statement Version tracks declaration content; Record Version increments on every edit, review and Admin Override for optimistic concurrency. Each operation and its Audit Log share one transaction.
3. `conversion_events` is provider-safe public analytics and has no Inquiry, Contact, or private Asset foreign key. CRM outcomes stay in CRM status/activity/history data. Server-persisted anonymous Consent with version is authoritative; Unknown, Denied and Revoked reject analytics writes regardless of client state. The provider mapper omits database entity and Consent Session identifiers.
4. Upload binary bodies are read incrementally with a server actual-byte ceiling. Content-Length, when present, is an early/exact check but is never the only control. A missing header remains bounded. Oversized, mismatched or interrupted streams create no storage object and do not consume the Intent.
5. Image roles accept only JPEG, PNG, WebP or AVIF. PDF is allowed only for Document/Download and cannot satisfy Product, Fabric Entry or Content image readiness. Publish, readiness, public read and public delivery all enforce role/MIME compatibility.

## Consequences

- Some formerly reachable historical Product URLs return the normal controlled not-found response until an authorized person confirms and republishes them. Because they did not satisfy the frozen real-Product definition, preserving public availability would be unsafe.
- Operators receive an explicit remediation queue rather than fabricated basis data.
- Rights restrictions cannot be bypassed by hiding the declaration form, and concurrent last-writer-wins review is rejected.
- Public analytics loses its direct Inquiry join by design; internal CRM reporting uses CRM tables and future authorized aggregation, not the provider stream.
- Upload streaming is memory-bounded to the configured per-Intent maximum before quarantine storage begins. Provider-native multipart streaming remains a later storage-adapter concern.

## Migration and compatibility

- `0008_phase1a-remediation-round3.sql` adds Effective Rights, server Consent, external analytics reference and Product remediation fields; backfills rights conservatively; removes the Inquiry FK/column from analytics; deletes old CRM-outcome analytics rows; and demotes invalid Published Products with Audit evidence.
- `0009_source-declaration-record-version.sql` adds the optimistic declaration Record Version with a zero default.
- Existing Statement Version and review fields remain intact. Public Inquiry references remain unchanged.

## Rollback

Application rollback must retain the new columns/table and the demoted Product state; re-exposing invalid Products or restoring the analytics Inquiry FK is prohibited. A compatible code rollback may ignore additive fields only after confirming it still enforces the same public/rights/privacy boundaries. Schema column removal requires a separately approved ADR and data-export plan.

## External validation

No real PostgreSQL, provider object storage, analytics provider, Preview, or Production action is part of this ADR execution. Real PostgreSQL migration/locking behavior remains the next authorized external validation only after the fourth targeted review passes.
