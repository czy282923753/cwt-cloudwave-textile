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

## Asset source declaration

- `Enable Source Declaration` is OFF by default.
- On a new ordinary upload, disabled source, rights, permission, relationship, review, expiry, and facility-ownership fields stay hidden and null. Disabling a declaration that already contains data hides but preserves that history.
- Do not populate `CWT Original Photography`, `CWT Owned`, or other inferred defaults.
- Source declaration may be enabled manually per asset or upload batch.
- Automated person/logo/document hints are non-blocking and never enable declarations automatically.
- Closing a populated declaration does not delete history. Declaration changes are audited.
- Declaration writers cannot self-review. Reviewer identity/date may only be set by the acting Reviewer/Publisher or Admin; later declaration edits invalidate the previous review until reviewed again.
- Declaration editing and review are separate operations. Each statement records its version and last editor. Normal approval/rejection records a different reviewer, reviewed version, time, decision and reason; Admin Override is separate, Admin-only, reason-required and distinctly audited.
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
- Analytics is off until explicit consent. Upload Intents are private, short-lived, Session-bound, scanned and single-use; arbitrary `x-forwarded-for` is never trusted.

## Quality gates

Before declaring a task complete, run the relevant build, lint, strict typecheck, unit, integration, and end-to-end checks. Do not delete or skip critical tests, add `any` to hide type failures, lower TypeScript strictness, silence lint failures, swallow exceptions, or report incomplete work as complete.

## Source control and external actions

- Preserve checkpoint-level local commits and keep unrelated changes intact.
- Do not push to an external repository, deploy production, modify DNS, use production credentials, import formal customer/product data, or perform irreversible external actions without explicit approval.
