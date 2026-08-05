# CWT Phase 1B implementation plan

Status: **Planning only; implementation and Migrations are not authorized**
Baseline: `phase-1a-postgres-stage2c-approved-2026-08-03` → `9e8437ca22ecfd114babda49e13c676bbc6a8899`
Plan date: **2026-08-05**

## 1. Recommendation

Phase 1B should use **one pre-implementation decision gate (Stage 0) followed by eight consecutive delivery Stages (Stages 1–8)**, with explicit acceptance between them. A single undifferentiated implementation round would combine editorial-format migration, file ingestion, external AI, customer email, CRM attribution, and Production infrastructure in one rollback boundary. That would be difficult to review and unsafe on a 2 vCPU/4 GB single host.

The Stages are cumulative and remain on one modular-monolith branch/release line. They are not separate products or parallel authorities.

## 2. Plan invariants

Every Stage must preserve:

1. Phase 1A Product public eligibility and separate Publish/Index controls.
2. Existing Route/Redirect graph and transactional HTTP 301 behavior.
3. Existing Editorial Revision as the live-change authority.
4. Existing Public/Private/Import Asset isolation and controlled public delivery.
5. Existing Upload Intent/Batch/Finalize/Manifest/Recovery/Cleanup authority.
6. Existing Inquiry idempotency and immutable submission snapshots.
7. Existing notification Outbox as the only email job queue.
8. Existing Taxonomy/Application entities and relationships.
9. Domain Service authorization plus atomic required Audit.
10. Synthetic-only local/testing data until formal Product/media import is separately authorized.
11. No historical Migration, Snapshot, or Journal edit.
12. No Production claim before real provider, deployment, backup/restore, and formal-data acceptance.

## 3. Reusable current data model

### 3.1 Reuse without a new authority

| Existing authority | Phase 1B reuse |
| --- | --- |
| `products`, `product_localizations`, `product_field_reviews` | Draft creation/update, factual review, English copy, Block document owner. |
| `taxonomy_terms`, `product_taxonomy_terms` | Product Type/Primary Category, Additional Categories, Product Code prefix metadata. |
| `applications`, `product_applications` | Managed Application selection and quick create. |
| `product_tags`, `product_tag_assignments` | Free-text Product Tags. |
| `assets`, `asset_variants`, `product_assets`, `content_assets`, Fabric Asset relations | Direct upload, library reuse, scan/rights/readiness, Product/Content media placements. |
| `asset_upload_batches`, `upload_intents`, `upload_recovery_jobs`, `finalize_object_manifest_items`, `object_cleanup_jobs` | Import-package file transport and recovery; no second file pipeline. |
| `editorial_revisions` | Product, Content, Home/About, and email-template Draft/history/apply flows. |
| `system_settings` | Approved fixed Home/About config and approved email-template snapshot; values are schema-validated and non-sensitive. |
| `company_facts` | Only authority for factual Home/About strength claims. |
| `routes`, `seo_metadata`, `redirects`, topics/mappings/links | Current URLs, Preview link resolution, SEO/Canonical/Sitemap/Index. |
| `inquiries`, `contacts`, `organizations`, `customer_activities`, `inquiry_status_history` | CRM authority, attribution, Lost/First Response. |
| `notification_outbox` | Internal and customer email jobs; no second queue. |
| `feature_flags` | Default-off rollout of Import, Blocks, AI, and new Home settings; flags never bypass security. |

### 3.2 Existing fields retained as authoritative

- Product Code remains `products.product_code` with the existing unique/nonblank constraint.
- Composition remains a nullable factual string, with a new canonical validator rather than a second composition table. This follows the approved examples and avoids prematurely implementing Phase 2 fiber-percentage search.
- GSM and Width remain numeric `weight_gsm` and `width_cm`.
- Product/Content routes and SEO metadata remain separate records.
- Asset bytes and rights remain on `assets`; placement metadata belongs on relationship rows, not duplicate Asset records.
- CRM outcomes remain in Inquiry status/history/activity tables and never move into public analytics.

## 4. Proposed ordinary fields

These are drafts for later review, not generated Schema changes.

| Owner | Proposed field | Purpose |
| --- | --- | --- |
| `taxonomy_terms` | `product_code_prefix` nullable text, unique when present | Approved `[TYPE]` token for code generation; managed category record remains authority. |
| `products` | `product_code_assigned_at` nullable timestamptz | Distinguish unassigned from established code and support correction policy/Audit. |
| `products` | `moq_value` nullable numeric | MOQ numeric fact. |
| `products` | `moq_unit` nullable text with Check Constraint | Controlled unit separate from value; `moq_note` remains an optional note. |
| `product_localizations` | `structured_blocks` nullable JSONB | Versioned Product narrative document. |
| `product_localizations` | `blocks_version` nullable integer | Block compatibility and fail-closed future versions. |
| `product_localizations` | `editor_document_version` nonnegative integer | Optimistic autosave conflict token if a timestamp is insufficient. |
| `content_localizations` | Same three Block/editor fields | One shared Product/Content Block authority. |
| `product_assets` | `alt_text`, `caption`, `is_visible` | Placement semantics without duplicating file/rights data. |
| `content_assets` | `alt_text`, `caption`, `is_visible`, optional `block_key` | Cover/Inline placement and deterministic Block references. |
| `fabric_library_entry_assets` | Compatible placement fields if shared editor requires them | Consistent relation semantics; add only if used in the approved Stage. |
| `inquiries` | Submit source/medium/campaign/referrer fields | Explicit Submit Touch. |
| `inquiries` | `source_entity_type`, `source_entity_id` | CRM-only source Product/Application/Content identity resolved from Route. |

Focal points and overlay are placement/module presentation, not file facts. Home/About placement fields belong on the proposed static-page Asset relation; module visibility and overlay live in schema-validated approved page JSON.

## 5. Proposed tables

### 5.1 `site_page_assets`

Purpose: connect an approved Home/About `system_settings` page record to eligible Assets while retaining public-delivery revocation and relational authorization.

Minimum draft fields:

- UUID ID;
- `system_setting_id` FK;
- `asset_id` FK;
- page/placement key;
- desktop/mobile placement kind;
- role and sort order;
- placement Alt Text and Caption;
- normalized focal X/Y;
- visible flag;
- timestamps.

Why necessary: a JSON Asset ID alone would bypass the current relational public-media authorization query, while misusing `content_assets` would falsely turn Home/About into editorial-channel Contents. This is one additional relationship for a new static-page owner, not a second Asset system.

Old mechanism replaced: CSS placeholder/static media wiring for governed slots. Public delivery still uses `assets` and `/api/public-assets/{assetId}/`.

### 5.2 `product_import_batches`

Purpose: one durable authority for a Product import attempt, its immutable create/update mode, source fingerprint, actor/session, template version, counts, and lifecycle.

Minimum draft fields:

- UUID ID and actor/Auth Session;
- mode `create` or `update`;
- source workbook Asset ID and package/manifest fingerprint;
- template schema version;
- status `draft`, `validated`, `applying`, `completed`, or `failed`;
- row counts and timestamps;
- safe failure summary and Audit correlation.

Partial success is derived from item results and counts; it does not require a second `completed_with_errors` state.

### 5.3 `product_import_items`

Purpose: one row/item authority for deterministic partial success, row errors, media matching, retries, and target IDs. A single item table may use a constrained item kind (`row` or `media`) rather than separate row/media job systems.

Minimum draft fields:

- UUID ID and Batch FK;
- kind, source row/path key, Product Code, and source SHA-256 where applicable;
- raw and normalized allowlisted JSON;
- proposed media role/order;
- target Product/Asset IDs after apply;
- status `pending`, `valid`, `applied`, `error`, or `skipped`;
- warning/error codes and safe detail;
- attempt/timestamps.

Unique Batch/kind/source-key and persisted target IDs make same-batch retry idempotent. Existing Product Code, Route, Asset SHA-256, and Product relation constraints remain final authorities.

Why two import tables are necessary: partial row success, exact retry, crash recovery, error export, and separate create/update modes cannot be represented truthfully by the Asset upload Batch alone. The Asset Batch owns bytes; the Product Import Batch owns row interpretation. No other import batch system may exist.

### 5.4 `ai_runs`

Purpose: one durable authority for AI request provenance, work claim/retry, candidates, token/cost records, safe failures, and human disposition.

Minimum draft fields:

- UUID ID, actor, target entity/type, operation kind;
- provider/model/template version and input hash;
- status `pending`, `processing`, `succeeded`, `failed`, or `dead`;
- attempt, next attempt, lease owner/expiry/version;
- sanitized request metadata and typed candidate JSON;
- input/output token counts and cost in integer micros or provider currency micros;
- safe failure code/detail and timestamps;
- accepted/rejected disposition summary and linked Editorial Revision if saved.

Why necessary: provider latency, retries, the frozen concurrency limits, provenance, cost, and image work exceed a synchronous best-effort request. The table is simultaneously the run record and work authority; a separate AI queue is prohibited.

Old mechanism replaced: none—AI does not exist. The design does not reuse the email Outbox for unrelated AI semantics.

## 6. Structures deliberately not added

The recommended plan adds no:

- Product Type field or second taxonomy;
- Product Code counter table—the service uses a deterministic category-prefix lock/query and the existing unique constraint/retry;
- Block-per-row table—the authoritative document is bounded versioned JSONB;
- general page-builder/page-component table;
- Home/About revision table—use `editorial_revisions`;
- email-template version table—use `system_settings` plus `editorial_revisions`;
- second email queue—use `notification_outbox` kinds;
- second Asset/media table or upload/finalize path;
- backup-status business table initially—use atomic checksum manifests and monitoring;
- general distributed workflow platform.

## 7. Proposed status and enum changes

1. Add `application` to the existing Asset role enum before Product media code can store that role.
2. Resolve the `preview` versus `staging` environment decision. Recommendation: add/use `staging`, stop accepting `preview` after a bounded compatibility window, and avoid a permanent alias.
3. Prefer Check-Constrained text fields for new Import/AI lifecycles when stable enum semantics do not justify PostgreSQL enum migration risk. If PostgreSQL enums are selected, their first use must respect ADR-0010 compatibility and the Fresh/Upgrade migration transaction behavior.
4. Add no new Product editorial/publish/index state.
5. Add no new Outbox state.
6. Add no new Upload/Finalize/Recovery/Cleanup state unless a directed failure analysis proves an existing state cannot represent internal Import finalization.

## 8. Draft forward Migration order

No Migration is generated or executed in Discovery. Names and numbers are provisional.

### `0018_phase1b_editorial_media_foundation`

- Add Asset role `application`.
- Add database environment `staging` only if the owner approves formal replacement of `preview` and the currently unused DB enum is retained.
- Order any enum additions before dependent fields/constraints, and deploy code that writes new values only after the Migration commits successfully.
- Require Fresh `0000→0018`, Upgrade `0017→0018`, repeat no-op, enum order/catalog, and existing 0010 compatibility Harness tests.

- Add Product Code prefix/assignment and separate MOQ fields.
- Add Product/Content versioned Block document and editor version fields.
- Backfill non-empty legacy Product/Content text into deterministic Paragraph Blocks with version 1; preserve empty values as empty documents.
- Add placement metadata/visibility to existing media relations.
- Create `site_page_assets` with restrictive FKs and indexes.
- Do not delete legacy text columns. New code stops writing them after the compatibility gate; their removal is a later separately approved forward Migration after rollback support expires.

### `0019_phase1b_product_import`

- Create `product_import_batches` and `product_import_items`.
- Add unique source/item/idempotency constraints, restrictive FKs, indexes, and state Check Constraints.
- Extend the existing Upload Intent/Batch metadata only as needed for internal Import package ownership; do not create a second upload Batch.
- Backfill nothing; existing data is not an import.

### `0020_phase1b_ai_runs`

- Create the single AI Run/work table with lease, retry, provenance, cost, failure, and typed-output JSON fields.
- Add unique request/idempotency constraints as approved.
- No AI knowledge base, prompt corpus, private file relation, or publish/index field.

### `0021_phase1b_attribution`

- Add explicit Submit Touch fields and nullable typed source entity identity to Inquiry.
- Legacy rows remain null; do not guess historical attribution.
- Add Check Constraints for type/ID null pairing and allowed source types.
- Update the immutable Inquiry fingerprint version only for new requests after a reviewed compatibility design; legacy fingerprints remain valid under their recorded version.

Email templates, Staging envelope safety, Compose, Cloudflare, backups, and monitoring require no business Migration under the recommended design.

## 9. Stage plan

### Stage 0 — Owner decisions and architecture approval

Inputs:

- approved Phase 1B V1.1 Final baseline;
- this Discovery report, plan, and acceptance matrix;
- owner answers in Section 11.

Outputs:

- approved scope sequence;
- approved draft ADRs for local Production storage, Staging identity, structured Block compatibility, Product Import durable state, and AI Run durable state;
- frozen Excel template, Product Code prefix mapping, email variable set, AI/provider privacy contract, and host directory contract.

Files/modules: documentation and ADRs only.

Schema/Migration: detailed review of `0018`–`0021`; none executed.

Security/release invariants: no code, credential, provider, environment, formal-data, deployment, or runtime mutation is authorized by Stage 0; all inherited boundaries must be represented in the approved ADRs.

Tests: document consistency, Migration design review, threat/privacy review.

Stop conditions:

- unresolved Production storage provider/volume design;
- unresolved Staging identity;
- no approved Product Code prefix map or Excel template;
- no approved AI data-processing/provider boundary;
- any proposal introduces a duplicate authority.

Complexity: Medium design effort, no runtime change.

Rollback boundary: documentation revision only.

### Stage 1 — Editorial, Product data, and media foundation

Inputs: Stage 0 approvals and reviewed `0018`.

Outputs:

- exact navigation labels/links;
- separate MOQ fields, Product Code generator/correction flow, Composition validator;
- placement-aware Product/Content media roles, visibility, Alt, Caption;
- versioned shared Block schema, renderer, deterministic legacy backfill;
- static-page approved config and Asset relationship foundation.

Primary modules:

- `src/db/schema/*`, `drizzle/0018*`;
- `src/catalog/*`, `src/content/*`, `src/uploads/*`, `src/public-site/*`, `src/seo/*`;
- Product/Content admin pages and shared editor/media components.

Schema/Migration: `0018` only, applied before any code writes new enum values or fields.

Security/release invariants:

- legacy public content renders identically after backfill;
- live changes remain revision-controlled;
- new roles do not weaken Asset delivery;
- unknown Blocks/versions fail closed;
- no old/new editor dual write.

Tests:

- unit Block/Composition/code generation;
- PGlite and real PostgreSQL Fresh/Upgrade/repeat;
- Revision, rights, delivery, SEO, bundle, accessibility, desktop/mobile E2E;
- current Phase 1A suite remains green.

Stop conditions:

- content parity failure;
- enum upgrade incompatibility;
- any public/private Asset regression;
- a legacy writer remains active after the new editor becomes authoritative.

Complexity: High.

Rollback boundary: additive Schema permits previous compatible release; new writes stay disabled until migration/read parity passes. Legacy columns remain read-only rollback evidence.

### Stage 2 — Home/About and full Block Editor UX

Inputs: Stage 1 schema/renderer.

Outputs:

- frozen Home module order;
- Home/About settings, direct upload/library selection, focus/overlay/visibility;
- owned-factory eligibility and Verified Company Fact references;
- Block ordering, keyboard moves, Undo/Redo, autosave, internal links, Preview;
- retirement of legacy textarea write path.

Primary modules:

- new settings/page Domain Service within modular monolith;
- shared Block editor components;
- Home/About public renderers and authenticated preview routes;
- existing Asset upload/finalize and Editorial Revision services.

Schema/Migration: no new Migration expected beyond `0018`.

Security/release invariants:

- Home/About public reads approved state only;
- partner/unverified media cannot enter owned slots;
- Preview is authenticated/noindex;
- raw HTML/styles/unknown Blocks rejected.

Tests: service authorization/Audit rollback, public Asset revocation, autosave concurrency, preview parity, accessibility/mobile/browser suite.

Stop conditions: factual claim or partner media can leak, live page changes before approval, or static fallback becomes a second authority.

Complexity: High.

Rollback boundary: code-owned default config uses the same renderer/schema; no parallel page implementation.

### Stage 3 — Product Excel and image import

Inputs: approved template/mapping, Stage 1 Product/media foundation, reviewed `0019`.

Outputs:

- template download/upload and validation preview;
- internal Excel/ZIP/folder ingestion through existing Upload/Finalize/Recovery;
- deterministic Product Code matcher and Unmatched Images;
- create/update modes, partial success, row errors, duplicate blockers/warnings;
- idempotent retry and optional post-commit AI handoff placeholder.

Primary modules:

- new `src/imports/*` Domain Service/parser/matcher;
- admin import pages/API transport adapters;
- existing `src/uploads/*`, `src/catalog/*`, `src/seo/*`.

Schema/Migration: `0019` only.

Security/release invariants:

- archive traversal/decompression/byte/count limits;
- Import partition only until approved Asset finalization;
- Draft/noindex only;
- Product Code/Slug conflicts block without overwrite;
- Published updates produce Revisions.

Tests: parser/property tests, ZIP threats, mixed partial success, response loss/crash/concurrent retry, Asset Finalize, PostgreSQL constraints, no duplicate Product/Asset, mobile/accessibility.

Stop conditions: retry duplicates data, invalid row rolls back valid rows, import can Publish/Index, or a second upload/finalize path appears.

Complexity: Very High.

Rollback boundary: feature flag defaults off; applied Drafts/Assets remain ordinary records; incomplete batches remain diagnosable and can be disabled without data deletion.

### Stage 4 — Cloud AI Draft assistance

Inputs: approved provider/model/privacy/cost policy, Stage 2 Blocks, reviewed `0020`.

Outputs:

- cloud-only adapter and production env checks;
- typed copy/layout candidates, Diff, Block accept/reject/lock/Undo;
- AI image template flow through existing Asset pipeline;
- provenance/token/cost/failure/retry/dead records;
- text concurrency 2 and image concurrency 1.

Primary modules:

- new `src/ai/*` service/adapter/worker;
- Block editor integrations;
- existing Product/Content/Asset/Revision services.

Schema/Migration: `0020` only.

Security/release invariants:

- no localhost/local model Production path;
- no private Inquiry files;
- forbidden factual fields absent/rejected;
- no Publish/Index/route capability;
- prompts/results/cost logs protected and redacted.

Tests: provider contract, malformed/prompt-injected output, lease/retry/dead, cost accounting, stale/locked Block, no-public-write, AI image provenance/cleanup, 2 vCPU/4 GB bounded pressure.

Stop conditions: a provider response can modify truth fields or public state, private files enter context, cost/provenance is missing, or worker concurrency is unbounded.

Complexity: Very High.

Rollback boundary: feature flag off leaves manual editor and existing Drafts intact; AI Runs remain historical evidence.

### Stage 5 — Email templates, two-message Outbox, and attribution closure

Inputs: approved email copy/variables and Staging safety policy; reviewed `0021`.

Outputs:

- two Outbox jobs per Inquiry;
- internal/customer templates with Draft/Active/history/rollback/Preview/test;
- centralized From/Reply-To and Staging recipient envelope policy;
- explicit Submit Touch and source entity attribution.

Primary modules:

- `src/integrations/email*`, Outbox worker, Inquiry service;
- settings/revision services and admin template pages;
- Inquiry form/API/CRM admin and analytics mapper.

Schema/Migration: `0021`; no template/queue table.

Security/release invariants:

- Inquiry commits despite email outage;
- both jobs commit atomically with Inquiry;
- Staging overrides all recipients after rendering;
- no attachments/raw keys/private URLs;
- new CRM IDs never enter analytics.

Tests: two-job idempotency/concurrency, template revision/rollback/fallback, header injection, To/CC/BCC override, SMTP-down behavior, attribution fingerprint compatibility, privacy mapper.

Stop conditions: any Staging message can reach an unapproved address, email failure rolls back Inquiry, or analytics gains CRM identifiers.

Complexity: High.

Rollback boundary: code-owned defaults and existing Outbox states remain compatible; customer-confirmation kind can be disabled only before launch with explicit operator visibility.

### Stage 6 — Single-host deployment and operations foundation

Inputs: approved local-storage/Staging ADRs, host volume contract, provider selections.

Outputs:

- immutable multi-stage image;
- Compose Production plus on-demand Staging profiles;
- reverse proxy, private PostgreSQL network, separate DB/users/volumes/secrets;
- resource/pool/concurrency/log limits and 2 GB Swap runbook;
- Health/readiness endpoints;
- daily local and weekly COS backup workflow, checksum manifests, restore tooling;
- Sentry/Tencent/uptime and Outbox/backup/dead-work monitoring adapters.

Primary files/modules:

- Dockerfile/Compose/reverse-proxy configuration;
- deployment validation and backup/restore scripts;
- `src/config/env.ts`, database pool, trusted-client-address service, Health/monitoring integration;
- operations runbooks.

Schema/Migration: none expected.

Security/release invariants:

- local media roots are absolute, nonpublic, nonoverlapping, permissioned;
- origin is not directly exposed; PostgreSQL is private;
- Staging noindex/analytics-disabled/mail-overridden/no Production mounts;
- login/upload/analytics use one trusted-proxy boundary;
- logs/backups contain no secrets or unnecessary PII.

Tests: image/Compose config, secret scan, cross-env denial, origin/firewall lab, rotation/disk pressure, backup corruption/retention, restart/recovery, mobile/public smoke.

Stop conditions: shared DB/user/media/secret, local root under web serving path, origin bypass, missing restore path, or alerts rely only on SMTP.

Complexity: Very High operational work.

Rollback boundary: retain one prior image; database schema remains forward-compatible; config/volume switch has checksum-verified rollback; never delete old media until restore/readiness passes.

### Stage 7 — Authorized Staging and external validation

Inputs: Stage 6 topology, authorized Cloudflare/Zoho/COS/Sentry/scanner/rate-limit/AI credentials, synthetic data.

Outputs:

- Cloudflare DNS/proxy/TLS/Access and origin firewall evidence;
- Zoho Staging delivery/override/duplicate/retry evidence;
- scanner/rate-limit/AI provider validation;
- real PostgreSQL latest Fresh/Upgrade/query/concurrency evidence;
- Tencent 2 vCPU/4 GB pressure and disk-full behavior;
- backup upload and full empty-environment restore drill;
- complete acceptance matrix results.

No formal customer/Product data is used unless separately authorized.

Files/modules: approved deployment/runtime artifacts from Stage 6 plus redacted validation reports and acceptance evidence; provider configuration is external and secrets never enter the repository.

Schema/Migration: no new Stage 7 Migration; validate and apply only the reviewed `0000`–`0021` chain in the isolated Staging databases.

Security/release invariants: Staging remains access-protected, noindex, formal-analytics-disabled, recipient-overridden, Synthetic-only, and unable to read Production databases, media, secrets, or Admin identities.

Tests: execute all applicable External Validation rows in `PHASE_1B_ACCEPTANCE_MATRIX.md`, including real PostgreSQL, trusted proxy, provider failures, target-host pressure, disk protection, backup, and full restore.

Stop conditions: any Blocker/High, unresolved qualifying Medium, cross-environment access, mail leak, private media exposure, failed restore, or resource instability.

Complexity: Very High validation/operations.

Rollback boundary: destroy/recreate isolated Staging; Production remains untouched.

### Stage 8 — Formal Product/media acceptance and launch readiness

Inputs: separately authorized real Product data and rights-approved media, accepted Staging/providers/restore.

Outputs:

- controlled import of reviewed real Products/media;
- Company Fact and owned-media review;
- content/SEO/Canonical/Sitemap/mobile/accessibility approval;
- Production configuration review and explicit launch recommendation.

Files/modules: no new platform module is expected; use the accepted Product Import, Asset, Company Fact, Revision, SEO, and public-rendering authorities plus formal acceptance evidence.

Schema/Migration: none expected; if formal data exposes a model defect, stop and return to an approved forward-Migration design rather than changing data or Schema ad hoc.

Security/release invariants: formal data requires verified facts and rights, Imports remain Draft/noindex, human review controls Publish/Index, and Production launch remains a separate explicit authorization.

Tests: run the complete regression suite and formal Product, rights, public media, SEO, mobile, accessibility, backup/readiness, and owner acceptance rows.

Stop conditions: `Waiting for Real Product Data Validation`, missing rights, failed SEO intent ownership, missing backups/restore, or missing owner launch approval.

Complexity: High business acceptance.

Rollback boundary: import batches remain traceable; unpublished/noindex records can be corrected without public exposure. Production launch is a separate explicit action.

## 10. Draft ADR set required before implementation

### ADR-P1B-01 — Local Production origin storage

- Reason: approved Phase 1B replaces the older S3-required online-media assumption with isolated local host volumes and COS backup.
- Scope: storage startup validation, volume topology, public/private/import roots, backup, later data-disk/object-storage migration.
- Schema: none.
- URL/SEO: `/api/public-assets/{id}/` remains stable; no raw path.
- Compatibility: local and S3 adapters share contracts; Production local mode requires absolute safe roots.
- Rollback: checksum-copy back to prior mount/provider before switch; never expose raw directories.

### ADR-P1B-02 — Staging identity and `preview` retirement

- Reason: approved environment name/semantics are Staging.
- Scope: env enum, cookies, noindex, analytics, email override, Compose profile.
- Schema: optional forward enum addition; no historical edit.
- URL/SEO: `staging.cwtextile.com`, global noindex.
- Compatibility: bounded alias only if a real existing Preview installation requires upgrade.
- Rollback: restore previous app config while retaining additive enum value.

### ADR-P1B-03 — Versioned structured Block document

- Reason: one Product/Content editor, AI Block Diff, autosave, and safe rendering require typed structure.
- Scope: localization fields, Revision snapshots, renderer/editor, legacy text backfill.
- Schema: additive JSONB/version/editor token.
- URL/SEO: content and routes unchanged; render parity required.
- Compatibility: deterministic Paragraph backfill; one authoritative writer after cutover.
- Rollback: legacy columns retained read-only for bounded prior-release compatibility.

### ADR-P1B-04 — Product Import durable authority

- Reason: partial success, row errors, crash recovery, and idempotent retry cannot be represented by Asset Batch alone.
- Scope: two import tables, parser/matcher/service/admin; reuse Upload/Product/Revision.
- Schema: `0019` only.
- URL/SEO: Draft/noindex; route collisions block.
- Compatibility: no existing data backfill.
- Rollback: disable feature, preserve applied ordinary records and batch evidence.

### ADR-P1B-05 — AI Run as one work/provenance authority

- Reason: external latency, retries, cost, provenance, and concurrency require durable state.
- Scope: one table, worker, adapters, editor integration.
- Schema: `0020` only.
- URL/SEO: no public mutation capability.
- Compatibility: feature defaults off; manual editor independent.
- Rollback: disable Worker/UI; retain run records.

## 11. Decisions requiring project-owner confirmation

The frozen baseline supplies direction, but the following values or compatibility choices still require explicit owner confirmation before code:

1. Approve the Local Production Origin Storage ADR and exact absolute host volume roots.
2. Confirm that runtime `preview` is replaced by `staging`, or identify a real existing Preview deployment that needs a bounded compatibility alias.
3. Approve the legacy text-to-Paragraph Block backfill and the bounded period during which old text columns remain for rollback only.
4. Approve each Primary Category Product Code prefix (`TYPE`) and the dedicated audited correction policy for an established code.
5. Approve the canonical MOQ unit allowlist and whether any legacy `moq_note` should be manually split or simply retained as note.
6. Confirm that Composition remains a validated canonical string in Phase 1B rather than introducing structured fiber rows; structured filtering can remain Phase 2.
7. Approve the exact Excel template version, required/optional columns, maximum rows/files/archive size, and update matching rule.
8. Approve the safe email-template variable allowlist and final internal/customer English copy.
9. Select the cloud AI provider/model(s), data-processing region, retention/training opt-out terms, per-run/monthly cost ceilings, and approved image templates.
10. Select the Production malware scanner and shared rate-limit provider required by existing fail-closed Production rules.
11. Approve the canonical public host (`cwtextile.com` or `www`) and redirect direction.
12. Approve the Cloudflare origin-access method and SSH trusted-access method.
13. Approve backup encryption/key custody, COS bucket/region/account, and offline SSD custody/cadence.
14. Select external uptime and independent alert channels, Sentry organization/project, and escalation recipients.
15. Approve Production/Staging administrator provisioning and secret custody procedure.

## 12. External configuration checklist

- Tencent Lighthouse instance, Ubuntu hardening, 2 GB Swap, firewall/security group, time sync, disk monitoring.
- Production/Staging PostgreSQL databases/users/grants and private network.
- Separate absolute media/log/backup roots and OS ownership/modes.
- Production/Staging secret sets and Admin credentials.
- Cloudflare nameservers, proxied DNS, Full (strict), origin certificate, WAF, Access, origin allowlist.
- Zoho DNS-only records, separate app passwords, From/Reply-To/internal/test addresses.
- COS bucket/account/lifecycle/encryption for off-site backup only.
- Hosted Sentry project/DSN, Tencent alarms, uptime monitor, non-SMTP alert path.
- Cloud AI key/project, approved models/budgets/privacy options.
- Malware scanner and shared rate-limit service credentials/endpoints.
- Formal Product, Company Fact, and authorized media inventory.

## 13. External validation checklist

- PostgreSQL Fresh/Upgrade/repeat, constraints, concurrency, query plans, pool budgets, migration interruption, and backup/restore on the target topology.
- Local-volume permissions, traversal protection, public-media revocation, disk relocation, and full backup/restore.
- Cloudflare DNS/TLS/WAF/Access, origin bypass denial, trusted visitor IP, Canonical/301/robots/sitemap behavior.
- Zoho authentication, forced Staging recipients, Reply-To, Message-ID/deduplication, retry/dead behavior, and SMTP-down independent alert.
- AI provider schema/failure/timeout/cost behavior, data retention, image provenance, and concurrency.
- Scanner and shared rate limiter provider behavior and fail-closed degradation.
- Tencent 2 vCPU/4 GB/60 GB/30 Mbps pressure, restart, image/AI concurrency, disk 70/80 controls, and log rotation.
- Daily/local and weekly/COS backup completion, corruption detection, retention, pre-Migration backup, and complete empty-environment restore.
- Sentry/Tencent/uptime alert delivery including when Zoho is unavailable.
- Mobile, accessibility, Core Web Vitals/real traffic, and formal Product/media/SEO acceptance.

## 14. Final planning stop

This plan stops before implementation. It authorizes no Schema edit, Migration generation/execution, dependency change, code change, external configuration, credential use, deployment, formal data import, Commit, or Push. Work resumes only after project-owner review and explicit Phase 1B development authorization.
