# CWT data model — Phase 1A baseline

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

Assets, Asset Variants, Asset Tags, Fabric Entries and Localizations, Fabric Entry Assets, Fabric Entry Products, and Fabric Entry Applications.

### Editorial

Contents, Content Localizations, Authors, Content Assets, and Editorial Revisions.

### SEO and routing

Routes, SEO Metadata, Redirects, SEO Topics, Keyword Mappings, Topic Members, and Internal Link Relations.

### CRM and analytics

Organizations, Contacts, Inquiries, Inquiry Assets, Customer Activities, Notification Outbox, Inquiry Status History, and Conversion Events.

## Key constraints

- One path per locale.
- One current route per localized routable entity.
- Product Code is unique when present.
- `product_taxonomy_terms` is the only Product/Taxonomy authority. A deferred database constraint requires exactly one Primary Category for every Product and prevents concurrent dual-primary writes.
- Join rows are compound-unique.
- Draft save validation requires name, Primary Category, and one product image.
- Public factual fields require verification.
- Inquiry requires description or a successfully stored image.
- Contact matching is only automatic on exact normalized email.
- `idempotency_key` is unique per Inquiry; repeated public requests resolve to the same Inquiry.
- Customer Activity contact must equal its Inquiry contact. Inquiry Owner must be an active Sales/Admin user; Qualified and Lost invariants are database-backed.
- Route and Redirect namespaces are disjoint. Database triggers serialize route mutations, require real redirect destinations, and reject loops/chains.
- Conversion Event ID is unique. Consent and first/last-touch attribution are stored in relational fields; only allowlisted non-PII properties use JSONB.

## Asset source declaration

`source_declaration_enabled` defaults to false. For new ordinary uploads, declaration fields are null and hidden. Declaration fields include source type/provider, rights, subject relationship, public/edit permissions, restrictions, evidence, reviewer, review and expiry dates, and facility ownership. Disabling a populated declaration hides rather than erases its historical values. Writers cannot set reviewer/date without the declaration-review permission. A later content edit invalidates an older review. All changes are audited.

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

Phase 1A has 51 relational tables. Migration `0006_phase1a-remediation.sql` reconciles the former Product primary-category column into the authoritative join relation before dropping the duplicate column and installs the first remediation constraints. Migration `0007_phase1a-remediation-round2.sql` adds evidence-backed historical Asset rescan state, Source Declaration version/review state, random Inquiry public references, Upload Intents, and Outbox leases/idempotency.

Source declaration is independent from security scanning, access class, and storage context.

## Deferred models

Custom roles and permissions, complex Organization hierarchy, structured fiber-percentage composition, imports, AI knowledge/prompt/run models, analytics aggregates, translations beyond English publishing, and advanced approval chains are deferred.
