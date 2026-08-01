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
- Route changes for published pages create a permanent redirect in the same transaction.
- Search, ordinary filter results, and low-value Fabric Library entries are noindex by default.

## Asset source declaration

- `Enable Source Declaration` is OFF by default.
- When disabled, source, rights, permission, relationship, review, expiry, and facility-ownership fields stay hidden and null.
- Do not populate `CWT Original Photography`, `CWT Owned`, or other inferred defaults.
- Source declaration may be enabled manually per asset or upload batch.
- Automated person/logo/document hints are non-blocking and never enable declarations automatically.
- Closing a populated declaration does not delete history. Declaration changes are audited.
- Source declaration convenience must not weaken MIME, magic-byte, decode, size/count, rate-limit, malware-scan, isolation, or private-access controls.

## Architecture and security

- Public UI, admin UI, domain services, persistence, jobs, and integrations are separate modules in one deployable application.
- UI code does not write directly to the database. Domain services enforce permissions and invariants server-side.
- Refine, if retained, is only an admin UI shell. It never owns permissions, workflows, validation, imports, uploads, CRM rules, SEO rules, or public rendering.
- Refine and admin-only packages must not enter public-site bundles.
- Never commit secrets or production data. Production must fail closed when a required integration is missing.
- Local, test, preview, and production environments do not share databases, buckets, secrets, authentication, or analytics configuration.
- Inquiry assets are private and cannot automatically enter public assets or any AI knowledge base.

## Quality gates

Before declaring a task complete, run the relevant build, lint, strict typecheck, unit, integration, and end-to-end checks. Do not delete or skip critical tests, add `any` to hide type failures, lower TypeScript strictness, silence lint failures, swallow exceptions, or report incomplete work as complete.

## Source control and external actions

- Preserve checkpoint-level local commits and keep unrelated changes intact.
- Do not push to an external repository, deploy production, modify DNS, use production credentials, import formal customer/product data, or perform irreversible external actions without explicit approval.
