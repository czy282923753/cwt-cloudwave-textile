# CWT data model — Phase 1A baseline

## Principles

- Relational fields are used for core searchable, filterable, constrained, and joined data.
- JSON is limited to editorial revision payloads, provider responses, structured display documents, import raw rows, event context, and audit diffs.
- Foreign keys and compound unique constraints protect relationships.
- Archival is preferred to destructive deletion for published business entities.

## Entity groups

### Identity and governance

Users, Audit Logs, Company Facts, Feature Flags, and System Settings.

### Product

Products, Product Localizations, Taxonomy Terms and Localizations, Product Taxonomy Terms, Applications and Localizations, Product Applications, Product Features, Product FAQs, Tags, Product Tags, Product Assets, and Product Field Reviews.

### Assets and library

Assets, Asset Variants, Asset Tags, Fabric Entries and Localizations, Fabric Entry Assets, Fabric Entry Products, and Fabric Entry Applications.

### Editorial

Contents, Content Localizations, Authors, Content Assets, and Editorial Revisions.

### SEO and routing

Routes, SEO Metadata, Redirects, SEO Topics, Keyword Mappings, Topic Members, and Internal Link Relations.

### CRM and analytics

Organizations, Contacts, Inquiries, Inquiry Assets, Customer Activities, Inquiry Status History, and Conversion Events.

## Key constraints

- One path per locale.
- One current route per localized routable entity.
- Product Code is unique when present.
- One Primary Category per product.
- Join rows are compound-unique.
- Draft save validation requires name, Primary Category, and one product image.
- Public factual fields require verification.
- Inquiry requires description or a successfully stored image.
- Contact matching is only automatic on exact normalized email.

## Asset source declaration

`source_declaration_enabled` defaults to false. For new ordinary uploads, declaration fields are null and hidden. Declaration fields include source type/provider, rights, subject relationship, public/edit permissions, restrictions, evidence, reviewer, review and expiry dates, and facility ownership. Disabling a populated declaration hides rather than erases its historical values. Changes are audited.

## Phase 1A table use

- `users` and `auth_sessions` authenticate operators; fixed roles are application-defined.
- `audit_logs`, `company_facts`, `feature_flags`, and `system_settings` govern sensitive changes, factual claims, and environment-specific functions.
- Product, taxonomy, application, feature, FAQ, tag, localization, review, and asset join tables implement the real-product editor and conditional public template.
- Asset, variant, upload-batch, and tag tables implement quarantine, processing, access isolation, optional declarations, and reuse.
- Fabric Entry and its relationship tables provide a browsable visual record that remains distinct from a Product and its underlying files.
- Content, author, localization, asset, and revision tables support three editorial channels and recoverable review history.
- Route, metadata, redirect, topic, keyword mapping, topic member, and internal-link tables enforce URL ownership and one principal page per intent.
- Contact, lightweight Organization, Inquiry, private asset, activity, and status history tables implement repeat inquiries and accountable sales follow-up.
- Conversion Events records a PII-free first-party funnel. Aggregated analytics tables are intentionally deferred.

Source declaration is independent from security scanning, access class, and storage context.

## Deferred models

Custom roles and permissions, complex Organization hierarchy, structured fiber-percentage composition, imports, AI knowledge/prompt/run models, analytics aggregates, translations beyond English publishing, and advanced approval chains are deferred.
