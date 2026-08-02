# CWT engineering rules

## Authority

Apply project guidance in this order:

1. The project owner's current explicit instruction.
2. The frozen CWT V1.1 product baseline and accepted ADRs.
3. This root `AGENTS.md` for cross-module rules.
4. The applicable domain specification.
5. `docs/ENGINEERING_GOVERNANCE.md` or `docs/REVIEW_POLICY.md`.
6. Testing and acceptance documents.
7. Implementation reports and Git history as evidence.

Implementation reports and historical remediation notes do not create permanent architecture. If a task conflicts materially with the frozen baseline or long-term governance, explain the conflict and wait for approval rather than working around it.

## Frozen baseline

CWT V1.1 is the authoritative product and technical baseline. The following require an approved architecture change and ADR before implementation:

- B2B SEO acquisition-platform positioning and brand/supply-chain fact boundaries.
- The real-Product definition and the Taxonomy, Applications and Fabric Library boundaries.
- English at `/`, the confirmed URL namespaces and one primary indexable page per primary search intent.
- Separate Draft, Review, Publish and Index controls.
- AI may create drafts only; it may not infer factual specifications, publish or enable Index.
- Isolation between public Assets and private Inquiry files.
- The minimal Inquiry, Contacts, Organizations and CRM relationships.
- The modular-monolith architecture.

An architecture proposal must state the reason, affected scope, schema/Migration impact, SEO/URL/Redirect impact, compatibility and rollback plan, and include a draft ADR. Wait for explicit project approval before implementing it.

## Business truth

- The brand is always `CloudWave Textile`, never `ColudWave Textile`.
- Do not invent company history, facilities, employees, equipment, capacity, certifications, MOQ, technical specifications, customers, contact details or factory ownership.
- A partner factory is never described as CWT-owned without a verified Company Fact.
- Fixtures are conspicuously synthetic and noindex.
- Missing real product evidence is reported as `Waiting for Real Product Data Validation`.

## Product, publishing and SEO

- A Product is backed by a real product, sample, internal code, supply specification or explicit specification combination. A draft needs only a name, one Primary Category and one image.
- Unknown facts stay empty, and empty fields render no empty heading, table, placeholder or module.
- Published and Index are independent. Published entities use revisions and authorized human review; public reads stay on the approved revision.
- A published route change creates an audited HTTP 301 in the same transaction. Route collisions, missing destinations, loops and chains are rejected.
- Search, ordinary filters and low-value Fabric Library entries are noindex by default.
- Derived SEO eligibility reuses the authoritative real-Product eligibility predicate. A bare `products.status = published` check never qualifies a Product or a derived public surface.

## Cross-module security and data boundaries

- UI and Server Actions do not write business tables directly. Domain Services recheck authorization and enforce invariants; Server Actions only parse, call the service, translate typed results and request refresh or navigation.
- A business mutation and its required Audit commit atomically. Required Audit failure rolls back that mutation. Non-critical post-commit maintenance records are explicitly separate and may not reverse or misreport an already committed business success.
- Public, Private and Import storage contexts remain isolated. Inquiry files never enter public Assets or an AI knowledge base automatically.
- Public HTML uses only application-controlled media routes. Public delivery rechecks storage, scan, processing, deletion, rights and live relationship eligibility; raw Object Keys and permanent bucket URLs are not public contracts.
- Inquiry and private-file access remains record-scoped: Admin may access all; Sales only assigned records; unrelated roles gain no customer access through another role.
- Anonymous Inquiry retries are idempotent, do not overwrite Contact master data, and use the persistent notification outbox.
- Analytics uses server-persisted consent and contains no PII, Inquiry/Contact identifiers or private Asset identifiers. Client state and untrusted forwarding headers are not authority.
- Uploads enforce actual streamed-byte limits, type/signature validation, image decoding where applicable and malware scanning before release.
- Refine is an optional admin UI shell only; Refine and admin-only dependencies must not enter the public bundle.
- Environments do not share databases, buckets, secrets, authentication, analytics configuration or production data. Required production integrations fail closed.

## Engineering governance summary

- **Root Cause First:** fix the causal boundary, not only the symptom.
- **Simplification First:** prefer delete, move, narrow, merge and reuse before adding mechanisms.
- **Replace, Not Layer:** a new mechanism replaces or converges the old path; do not preserve accidental dual authority.
- **Proportional Quality:** verification and complexity match real business risk.
- **Complexity Approval:** justify new persistent coordination or cross-process state before implementation.
- **Operational Simplicity:** keep operator steps, feedback and recovery understandable.
- **Quality Gates:** run the checks relevant to the affected risk; never hide failures, weaken strictness or misreport incomplete work.

## Governance documents

All development, maintenance, bug-fix and refactoring tasks must follow:

- `docs/ENGINEERING_GOVERNANCE.md`

Independent review and Phase acceptance tasks must additionally follow:

- `docs/REVIEW_POLICY.md`

Tasks involving Upload, Asset, Finalize, Recovery, Cleanup, Storage Adapter or Public Media must additionally follow:

- `docs/ASSET_AND_UPLOADS.md`

## Source control and external actions

- Never commit secrets or production data. Preserve reasonable local checkpoint commits and unrelated changes.
- Without explicit approval, do not push externally, deploy production, modify DNS, use production credentials, import formal customer/product data or perform an irreversible external action.
