# CWT data model — Phase 1A baseline

## Post-commit boundary closure additions

- Migration `0015_post-commit-boundary-closure.sql` adds `object_cleanup_kind` and complete Cleanup authority fields: Upload Intent, Finalize Recovery, Recovery version, Finalize attempt, Manifest item, Asset, partition/key, role, MIME and byte size. `finalize_recovery_id` is a real nullable foreign key to `upload_recovery_jobs.id` with `ON DELETE RESTRICT`; generic non-Finalize cleanup may keep it null. Intent/Manifest indexes support locked revalidation.
- Finalize Public cleanup rows must be `cleanup_kind = finalize_public`, Public partitioned and carry complete Recovery/Manifest/object identity. The Check Constraint preserves allowed standby, armed, cancelled and terminal state combinations.
- `finalize_object_manifest_items` now records evidence status/source, verified time, observed byte size/MIME and observation time. New Finalize work progresses through planned/written to byte-backed verified. Existing 0013/0014 inferred rows upgrade to unverified with source `migration_0015_legacy_inferred`; inferred metadata is not publication evidence. Eligibility evaluates the completed Recovery's current attempt, so superseded attempts remain non-authoritative history rather than poisoning a later verified attempt.
- Cleanup and Manifest foreign keys use restrictive deletion so recovery authority cannot disappear under live compensation/evidence. Migration aborts on orphan Finalize Recovery references or incomplete Finalize Cleanup identity instead of silently discarding governance history.
- Table count remains 55; Migration 0015 changes authority and evidence fields without adding a relational table.

## Finalize / Cleanup race-closure additions

- `object_cleanup_status` adds `standby`. For Finalize Public compensation, `standby` means registered but disarmed; it has no `armed_at`, cleanup lease or completion and cannot be claimed.
- `object_cleanup_jobs` adds Finalize Recovery/attempt identity, expected role/MIME/byte-size projection, write evidence and explicit arm metadata. A database Check Constraint enforces the standby/cancelled/armed-state combinations.
- `finalize_object_manifest_items` is the independent authoritative object set for one Recovery attempt. Unique `(recovery_job_id, finalize_attempt, object_key)` and Batch/attempt indexes support exact preflight, crash recovery and projection repair. It remains available if a Cleanup row is missing or damaged.
- Migration `0013_lyrical_black_knight.sql` introduces transaction-safe enum replacement, coordination/projection fields, active-lease upgrade backfill, index and Check Constraint. Migration `0014_lumpy_toxin.sql` creates and backfills the Manifest authority. Fresh and 0012→latest upgrade tests execute both paths.
- Phase 1A now has 55 relational tables.

## Final Closure Round 2 additions

- `upload_recovery_jobs` is the durable Saga/lease authority for both `staging` and `finalize`. It links a Batch and, for staging, its Intent and placeholder Asset; records the expected partition/key; and persists status, phase, attempts, schedule, lease owner/times, optimistic version, safe error, start/completion and expiry.
- Staging has one Recovery row per Intent. Finalize has one Recovery row per Batch. Partial unique indexes enforce both rules; the work index supports due/expired-lease scans.
- Recovery status is `pending`, `processing`, `retryable`, `cleanup_required`, `completed`, or `dead`. Persisted stages cover preregistration, storage write, scan, Finalize copy/variant/database work, cleanup, failure and completion.
- Migration `0012_nostalgic_calypso.sql` adds only these forward recovery types/table/indexes. It does not rewrite the semantics of Migrations 0000–0011. Fresh and current-latest Upgrade tests verify it.

## Final Closure additions

- `asset_upload_batches.status` adds `finalizing` so one database compare-and-set claim serializes concurrent Finalize attempts.
- `object_cleanup_jobs` durably records the storage partition/key before each external put, its Batch/Asset context, reason, retry/dead state, attempt schedule, worker lock/lease, safe error and completion time. `(storage_partition, object_key)` is unique, making deletion registration and execution idempotent.
- `conversion_events_public_only_check` has one authoritative expression exported by the current Drizzle schema. It accepts only public funnel event names, permits only `product`, `application`, `fabric_entry` or `content` entity types, and requires `entity_type`/`entity_id` to be both null or both non-null. CRM/internal event names are rejected.
- Migration `0011_clever_inertia.sql` is forward-only: it safely drops the previously inconsistent named constraint, recreates it exactly once from the authoritative expression, and adds the Finalize/cleanup-queue schema. Fresh and Upgrade paths inspect the actual database expression rather than treating the constraint name as proof.

## Final local remediation additions

- `asset_upload_batches` now records authenticated Session binding, declared/completed counts, lifecycle status, expiry/completion/failure and the optional batch declaration payload. Its ordinary declaration state remains OFF with a null payload.
- `upload_intents.kind = admin_asset` adds User, Auth Session, Upload Batch, category, role, association and sort binding to the existing short-lived/single-use Intent model. Inquiry and Admin Intents remain distinguishable and cannot cross-consume.
- `conversion_events_public_only_check` is declared in Drizzle Schema and the current Snapshot as well as its original forward Migration.
- `products_product_code_nonblank_check` permits null and rejects every non-null all-whitespace value; the existing partial-null unique behavior remains.

## Round 3 additions

- `products.publication_remediation_required/reason` records historical public records demoted by the real-Product fail-closed migration.
- `assets.effective_rights_decision`, `rights_public_website_allowed`, and `declaration_record_version` separate public rights enforcement from the declaration UI and provide optimistic concurrency for every declaration operation.
- `analytics_consents` persists anonymous server-side consent state and version. `conversion_events` no longer has an Inquiry foreign key; only an opaque public external reference is permitted.

## Round 2 additions

- `assets`: scan failure reason, historical rescan state/attempt/time, declaration statement version, last editor, reviewed version, decision and reason.
- `upload_intents`: hashed opaque token, anonymous Session binding, declared file facts, status, private Asset link, expiry, single-use and Inquiry consumption fields.
- `inquiries.public_reference`: random unique client-safe reference, distinct from the internal UUID.
- `notification_outbox`: unique Delivery Key, attempt count, lock owner/time, lease expiry, next attempt and safe last error.

Migration 0007 backfills Inquiry public references and Outbox Delivery Keys before NOT NULL/unique constraints. It never backfills historical Asset scans as Passed.

## Principles

- Relational fields are used for core searchable, filterable, constrained, and joined data.
- JSON is limited to editorial revision payloads, provider responses, structured display documents, import raw rows, event context, and audit diffs.
- Foreign keys and compound unique constraints protect relationships.
- Archival is preferred to destructive deletion for published business entities.

## Entity groups

### Identity and governance

Users, Auth Sessions, Audit Logs, Company Facts, Feature Flags, and System Settings.

### Product

Products, Product Localizations, Taxonomy Terms and Localizations, Product Taxonomy Terms, Applications and Localizations, Product Applications, Product Features, Product FAQs, Tags, Product Tags, Product Assets, and Product Field Reviews.

### Assets and library

Assets, Asset Variants, Asset Tags, Asset Upload Batches, Upload Recovery Jobs, Object Cleanup Jobs, Fabric Entries and Localizations, Fabric Entry Assets, Fabric Entry Products, and Fabric Entry Applications.

### Editorial

Contents, Content Localizations, Authors, Content Assets, and Editorial Revisions.

### SEO and routing

Routes, SEO Metadata, Redirects, SEO Topics, Keyword Mappings, Topic Members, and Internal Link Relations.

### CRM and analytics

Organizations, Contacts, Inquiries, Inquiry Assets, Customer Activities, Notification Outbox, Inquiry Status History, Analytics Consents, and Conversion Events.

## Key constraints

- One path per locale.
- One current route per localized routable entity.
- Product Code is null or nonblank, and unique when present. Empty, space-only, tab-only and newline-only direct writes fail at the database boundary.
- `product_taxonomy_terms` is the only Product/Taxonomy authority. A deferred database constraint requires exactly one Primary Category for every Product and prevents concurrent dual-primary writes.
- Join rows are compound-unique.
- Draft save validation requires name, Primary Category, and one product image.
- Public factual fields require verification.
- Inquiry requires description or a successfully stored image.
- Contact matching is only automatic on exact normalized email.
- `idempotency_key` is unique per Inquiry; repeated public requests resolve to the same Inquiry.
- Customer Activity contact must equal its Inquiry contact. Inquiry Owner must be an active Sales/Admin user; Qualified and Lost invariants are database-backed.
- Route and Redirect namespaces are disjoint. Database triggers serialize route mutations, require real redirect destinations, and reject loops/chains.
- Conversion Event ID is unique. Consent and first/last-touch attribution are stored in relational fields; only allowlisted non-PII properties use JSONB. Public analytics has no Inquiry, Contact, or private Asset foreign key.

## Asset source declaration

`source_declaration_enabled` defaults to false. For new ordinary uploads, declaration fields are null and hidden. Declaration fields include source type/provider, rights, subject relationship, public/edit permissions, restrictions, evidence, reviewer, review and expiry dates, facility ownership and an Effective Rights Decision. Disabling a populated declaration hides rather than erases its historical values or decision. Writers cannot set reviewer/date without the declaration-review permission. A later content edit invalidates an older review. Statement Version tracks declaration content; Record Version protects every edit/review/override from concurrent overwrite. Business mutation and Audit Log are atomic.

## Phase 1A table use

- `users` and `auth_sessions` authenticate operators; fixed roles are application-defined.
- `audit_logs`, `company_facts`, `feature_flags`, and `system_settings` govern sensitive changes, factual claims, and environment-specific functions.
- Product, taxonomy, application, feature, FAQ, tag, localization, review, and asset join tables implement the real-product editor and conditional public template.
- Asset, variant, upload-batch, and tag tables implement quarantine, processing, access isolation, optional declarations, and reuse.
- Fabric Entry and its relationship tables provide a browsable visual record that remains distinct from a Product and its underlying files.
- Content, author, localization, asset, and revision tables support three editorial channels and recoverable review history.
- Route, metadata, redirect, topic, keyword mapping, topic member, and internal-link tables enforce URL ownership and one principal page per intent.
- Contact, lightweight Organization, Inquiry, private asset, activity, status history, and persistent notification-outbox tables implement repeat inquiries and accountable/retryable sales follow-up.
- Conversion Events records a consent-aware, deduplicated, PII-free first-party funnel. Aggregated analytics tables are intentionally deferred.

Phase 1A has 55 relational tables. Migration `0006_phase1a-remediation.sql` reconciles the former Product primary-category column into the authoritative join relation before dropping the duplicate column and installs the first remediation constraints. Migration `0007_phase1a-remediation-round2.sql` adds evidence-backed historical Asset rescan state, Source Declaration version/review state, random Inquiry public references, Upload Intents, and Outbox leases/idempotency. Migration `0008_phase1a-remediation-round3.sql` adds server Consent, external-only analytics linkage, effective rights, and historical Product remediation. Migration `0009_source-declaration-record-version.sql` adds one optimistic operation version shared by declaration edits, reviews, and Admin Overrides. Migration `0010_soft_marrow.sql` adds the Admin Upload Intent/Batch state and Product Code database check. Migration `0011_clever_inertia.sql` adds serialized Finalize, durable object cleanup and the forward correction for the conversion-event Check Constraint. Migration `0012_nostalgic_calypso.sql` adds persistent staging Saga state and fenced Finalize recovery/lease state. Migrations `0013_lyrical_black_knight.sql` and `0014_lumpy_toxin.sql` close the Finalize/Cleanup race with standby compensation and the authoritative attempt-scoped Object Manifest. Migration `0015_post-commit-boundary-closure.sql` adds complete Cleanup identity/FKs and byte-backed Manifest evidence governance, marking all legacy inferred Manifest rows unverified.

Source declaration is independent from security scanning, access class, and storage context.

## Deferred models

Custom roles and permissions, complex Organization hierarchy, structured fiber-percentage composition, imports, AI knowledge/prompt/run models, analytics aggregates, translations beyond English publishing, and advanced approval chains are deferred.
