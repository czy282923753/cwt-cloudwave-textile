# CWT engineering rules

## Frozen baseline

CWT V1.1 is the authoritative product and technical baseline. Do not change the following without an approved architecture change and ADR:

- B2B SEO acquisition-platform positioning.
- Brand and supply-chain fact boundaries.
- The definition of a real Product.
- Taxonomy, Applications, and Fabric Library boundaries.
- English-at-root URL strategy and confirmed URL namespaces.
- One primary indexable page per primary search intent.
- Separate draft, review, publish, and index controls.
- AI may only create drafts; it may not infer technical facts or publish.
- Public assets and private inquiry files remain isolated.
- The minimal inquiry, Contacts, Organizations, and CRM relationships.
- Modular-monolith architecture.

An architecture change requires the reason, impact, schema/migration impact, SEO/URL/redirect impact, compatibility and rollback plan, and a draft ADR. Wait for explicit project approval before implementing it.

## Business truth

- The brand is always `CloudWave Textile`, never `ColudWave Textile`.
- Do not invent founding dates, facilities, employees, equipment, certifications, production capacity, technical specifications, MOQ, factory ownership, customer claims, or contact information.
- Partner factories must never be described as CWT-owned facilities without a verified Company Fact.
- Test fixtures must be conspicuously synthetic and noindex.
- Missing real product data is reported as `Waiting for Real Product Data Validation`.

## Product and publishing rules

- A Product is backed by a real product, sample, internal code, supply specification, or explicit specification combination.
- Saving a Product draft requires only a name, one Primary Category, and at least one image.
- Unknown factual specifications remain empty. Empty fields render no headings, tables, placeholders, or modules.
- Publishing and indexability are separate. AI cannot publish or set index.
- Published Product, Application, Fabric Library, and Content changes are revisions; public reads remain on the approved version until a Reviewer/Publisher or Admin applies the latest revision.
- Route changes for published pages create an audited HTTP 301 redirect in the same transaction. Redirect loops, chains, route collisions, and missing destinations are rejected.
- Search, ordinary filter results, and low-value Fabric Library entries are noindex by default.
- Every public Product read, including Published + Noindex, rechecks real-product basis, an active authorized confirmer and confirmation time, a current English localization/route, and a usable public image. Historical failures are demoted to In Review, forced Noindex, audited, and placed in the remediation queue.

## Asset source declaration

- `Enable Source Declaration` is OFF by default.
- On a new ordinary upload, disabled source, rights, permission, relationship, review, expiry, and facility-ownership fields stay hidden and null. Disabling a declaration that already contains data hides but preserves that history.
- Do not populate `CWT Original Photography`, `CWT Owned`, or other inferred defaults.
- Source declaration may be enabled manually per asset or upload batch.
- Automated person/logo/document hints are non-blocking and never enable declarations automatically.
- Closing a populated declaration does not delete history. Declaration changes are audited.
- Declaration writers cannot self-review. Reviewer identity/date may only be set by the acting Reviewer/Publisher or Admin; later declaration edits invalidate the previous review until reviewed again.
- Declaration editing and review are separate operations. Each statement records its version and last editor. Normal approval/rejection records a different reviewer, reviewed version, time, decision and reason; Admin Override is separate, Admin-only, reason-required and distinctly audited.
- Declaration UI state never overrides the effective rights decision. Every declaration mutation uses an optimistic record version; content/review/override and its Audit Log commit atomically. Only a current-version Reviewer/Publisher or Admin decision can replace an effective restriction.
- Source declaration convenience must not weaken MIME, magic-byte, decode, size/count, rate-limit, malware-scan, isolation, or private-access controls.

## Architecture and security

- Public UI, admin UI, domain services, persistence, jobs, and integrations are separate modules in one deployable application.
- UI code does not write directly to the database. Domain services enforce permissions and invariants server-side.
- Refine, if retained, is only an admin UI shell. It never owns permissions, workflows, validation, imports, uploads, CRM rules, SEO rules, or public rendering.
- Refine and admin-only packages must not enter public-site bundles.
- Never commit secrets or production data. Production must fail closed when a required integration is missing.
- Local, test, preview, and production environments do not share databases, buckets, secrets, authentication, or analytics configuration.
- Inquiry assets are private and cannot automatically enter public assets or any AI knowledge base.
- Public Asset delivery requires a Public partition, Public access, Ready processing, Passed scan, no deletion, and an effective link to a currently Published public entity.
- Historical Assets are never inferred Passed. Migration marks them for byte-backed rescan; missing or failed files remain nonpublic and broken Published/Inquiry links fail database readiness.
- Public HTML may emit only application-controlled `/api/public-assets/{assetId}/` paths, never raw Object Keys or permanent Bucket/CDN URLs.
- Admin may access all Inquiries. Sales may access only assigned records. Analyst, Reviewer/Publisher, Product Editor, and Content Editor receive no raw customer-record or private-file access through their other roles.
- Public Inquiry retries use an Idempotency Key. Contact master data is not overwritten by unauthenticated submissions; submitted values stay on the Inquiry snapshot. Notification delivery uses the persistent outbox.
- Conversion Events use per-event property allowlists, consent state, unique Event IDs, and no customer PII or private identifiers.
- Public Conversion Events contain no Inquiry, Contact, or private Asset UUID. CRM outcomes remain only in CRM status/activity/history data and never enter the analytics adapter.
- Analytics is off until explicit server-persisted consent; client state cannot override Unknown, Denied, or Revoked. Upload Intents are private, short-lived, Session-bound, scanned and single-use; arbitrary `x-forwarded-for` is never trusted.
- Binary uploads are bounded while streaming actual bytes. Missing Content-Length is accepted only with the stream hard limit; mismatched, interrupted, or oversized bodies do not consume an Intent or create a storage object.
- Hero, Gallery, Cover, Thumbnail, Detail, and Inline roles require an allowed image MIME. PDF is accepted only as Document/Download and can never satisfy Product, Fabric Entry, or Content image readiness.
- Server Actions parse input, call a Domain Service, translate errors, and revalidate/redirect only. They never write a business table, relationship, workflow state, or Audit Log directly.
- Business mutation, relationship changes, status transitions, and their required Audit Logs commit in one Domain Service transaction. Domain Services always recheck permissions; Audit failure rolls the mutation back.
- New governed mutations use the shared governed-mutation transaction context (or an equivalent existing transaction) and pass its transaction-bound Audit writer through nested Domain Services. A critical Audit may never be appended after commit.
- Object-storage writes are external side effects. Before any Finalize Public put, an attempt-scoped authoritative Object Manifest and a one-to-one `standby` compensation row must commit with Audit. `standby` is never cleanup-claimable. Only an audited Finalize failure, expired-lease recovery, fencing decision or explicit operator decision may atomically arm it. A valid Finalize lease always fences cleanup; successful publication requires the current lease, exact Manifest/projection match, every object present, and atomic cancellation of all standby compensation. Failed compensation runs through the lease/retry/dead-letter queue. Production storage remains nonpublic behind the controlled media route.
- Admin staging is a durable Saga. Before the first staging `put`, one transaction must persist the expected key, Private/Internal Asset placeholder, staging Recovery Job, cleanup job, controlled Intent/Batch states and required Audit. If that transaction or Audit fails, no storage write is allowed. Later failure must remain discoverable without relying on process memory or a failing Audit writer.
- A Batch may enter `finalizing` only in the same transaction that creates or claims its Finalize Recovery record, records an active lease owner/expiry/version and writes the required Audit. Workers persist stage progress and must fence every final commit by current lease owner, unexpired lease and version; an expired worker cannot commit.
- Finalize workers renew their lease during long storage/image operations, not only between stages. Success, failure arming, crash recovery and cleanup claim share the lock order Batch → Recovery → Manifest → Cleanup. Do not substitute a fixed cleanup grace period for this coordination.
- Cleanup and upload-recovery reconciliation are Domain Service operations under the explicit system actor. Reconciled business state and Audit commit atomically. Audit failure leaves the Recovery/Cleanup work retryable and never reports completion.
- Finalize has a hard core-commit boundary. The core transaction persists Public Asset/relations, consumed Intents, completed Batch/Recovery, cancelled Public compensation, required Audit, and discoverable Private staging cleanup. After that commit, cleanup wake/delete/status/Audit failures are maintenance warnings only: they must never re-arm Public compensation, downgrade the Batch, or turn the committed upload into a failed response.
- A repeated Finalize may return idempotent success only to the original active User/Auth Session after strict Batch, Intent, Asset, Recovery, Manifest, Cleanup-projection and actual-object verification. A mismatched or missing identity/object fails closed.
- Cleanup claim is lock-after-read and revalidates its complete authority after locking Batch, Intent, Recovery, Manifest, Asset and Cleanup. Identity/projection mismatch never deletes storage; it moves the job to audited dead/manual review. Audit failure rolls that transition back.
- Finalize Manifest evidence is verified only from actual stored bytes. Migration-inferred evidence is `unverified`, blocks publication and controlled media delivery, and may become `verified` only through an audited storage revalidation that records observed MIME, byte size and time.
- Taxonomy, Application, Fabric Library, related-Product, sitemap, keyword-owner quality and readiness decisions all reuse the authoritative public real-Product eligibility predicate. A bare `products.status = published` is never sufficient for a derived SEO surface.
- Admin Asset Library files use authenticated, User-and-Auth-Session-bound Upload Intents and a bounded binary API. Server Actions and multipart `FormData` are not a binary upload transport. Release to Public storage and relationship activation happen only after scan/decode and an atomic finalize transaction.
- Drizzle Schema, generated Snapshot and forward Migration must agree on database Check Constraints. Product Code is nullable, unique when present, and database-rejected when non-null but entirely whitespace.
- `conversion_events_public_only_check` has one authoritative expression shared by Schema, Snapshot, forward Migration and tests; it allowlists public event names and entity types and requires entity type/ID to be both absent or both present.
- Governed admin write Actions return the typed Action Result path; they do not directly call `redirect()` or return `void`. Success includes a message and Entity ID when applicable plus an observable refresh/redirect intent. Validation is field-bound where possible; permission, conflict, Audit, network and unknown failures are safely classified. Forms provide pending/repeat protection, error focus and ARIA live feedback. Raw database/provider exceptions are never rendered.

## Quality gates

Before declaring a task complete, run the relevant build, lint, strict typecheck, unit, integration, and end-to-end checks. Do not delete or skip critical tests, add `any` to hide type failures, lower TypeScript strictness, silence lint failures, swallow exceptions, or report incomplete work as complete.

## Source control and external actions

- Preserve checkpoint-level local commits and keep unrelated changes intact.
- Do not push to an external repository, deploy production, modify DNS, use production credentials, import formal customer/product data, or perform irreversible external actions without explicit approval.
