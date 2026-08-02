# Phase plan

## Phase 1A

A0–A13: frozen docs; project/version and Refine validation; schema/migrations; auth/roles/audit; asset security; products/taxonomy/applications; content/authors/revisions/facts; routes/SEO/publishing; Fabric Library; public templates; inquiries/contacts/CRM; events/attribution; 10–15 synthetic noindex fixtures and complete local quality validation.

### Local acceptance status — 2026-08-02

- Phase 1A Local Executable Scope: **Passed**
- Independent Review: **Passed**
- Findings: Blocker **0**, High **0**, Medium **0**, Low **0**
- Technical Debt: **0 new items**
- Local development-review loop: **Closed**
- Accepted code baseline: `94c7ee5df5dc58bb9e28d8a555e90a93d24846da`
- PostgreSQL Stage 2A: **Passed**
- PostgreSQL Stage 2B: **Passed**
- PostgreSQL candidate code baseline: `4b092be396ca54a3e6fe6ec37dc75a7d327ea146`
- External status: **Stage 2C and remaining providers Waiting**
- Real-product status: **Waiting for Real Product Data Validation**

The local acceptance remains a local-scope result. PostgreSQL 18.4 Stage 2A and Stage 2B subsequently passed independently against the candidate baseline above; this does not complete PostgreSQL External Validation. Stage 2C, R2/S3, SMTP, distributed rate limiting, deployment, backup/restore and real-product validation remain pending. Production Ready: **No**.

### PostgreSQL Stage 2B status — 2026-08-02

- PostgreSQL: **18.4 ARM64**
- Findings: Blocker **0**, High **0**, Medium **0**, Low **1**
- Code review: **Passed**
- Stage 2C: **Waiting; not authorized**
- Phase 1B: **Paused**

The non-blocking Low is Harness automation debt for directly terminating a running Migrator Backend and for competing two operating-system Migration processes. Independent review used temporary real fault injection to validate the current implementation safely. The debt may be addressed when the Migration Harness is next maintained; it does not block Stage 2B acceptance.

Real product authenticity and final product SEO review remain `Waiting for Real Product Data Validation` until real data arrives.

## Phase 1B

Status: **Paused**. Phase 1A local acceptance does not authorize Phase 1B work.

Basic Excel import with template, preview, row validation, error reporting, duplicate protection; 30–50 reviewed products; initial real topic clusters/content; production integrations and launch readiness.

## Phase 2

ZIP/folder packages, Word/PDF/TXT parsing, advanced mapping, advanced Fabric Library filters, structured composition, and richer Organization/CRM operations.

## Phase 3

Knowledge base, AI product/content assistants, evidence-aware drafts, prompt/run governance, human review, and SEO Assistant.

## Phase 4

GA4/GSC synchronization and dashboards, aggregates, advanced attribution, CRM analysis, and optimization recommendations.

## Phase 5

Reviewed multilingual publishing, country/market pages, AI service, and marketing automation.

No later-phase feature may bypass the frozen truth, publishing, indexing, URL, security, or data-boundary rules.
