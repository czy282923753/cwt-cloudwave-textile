# CWT Phase 1B implementation plan

Status: **Stage 4A P1-02A development authorized on 2026-08-10; other Stages and external actions remain separately gated**
Baseline: `phase-1a-postgres-stage2c-approved-2026-08-03` → `9e8437ca22ecfd114babda49e13c676bbc6a8899`
Plan date: **2026-08-05**

Stage 0 approval: [Owner Decisions](./PHASE_1B_OWNER_DECISIONS.md), [Product Import Template V1](./PRODUCT_IMPORT_TEMPLATE_V1.md), [Email Template Contract](./EMAIL_TEMPLATE_CONTRACT.md), and accepted ADR-0013 through ADR-0017. Post-Stage-3 AI architecture is supplemented by accepted ADR-0018, the owner-confirmed [Stage 4A Pre-Development Final Review](./PHASE_1B_STAGE4A_PRE_DEVELOPMENT_FINAL_REVIEW.md), and the Stage 4A Pre-Development Implementation Plan. The later [Stage 4A Owner Development Authorization](./PHASE_1B_STAGE4A_OWNER_DEVELOPMENT_AUTHORIZATION_V1_0.md) authorizes bounded P1-02A development while preserving every architecture and external-action boundary.

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

### 5.4 `ai_model_config`

Purpose: one auditable model-configuration authority for Provider, model, text use case, bounded parameters, reviewed immutable Prompt selection, enabled/default state, optimistic concurrency, and a disabled future fallback reference.

Current Stage 4 use cases are `seo_content_draft`, `fabric_knowledge_draft`, `product_description_draft`, and `sourcing_guide_draft`. Every initial default is DeepSeek / `deepseek-v4-flash`, defaults disabled, and has no fallback.

Why necessary: environment variables and generic `system_settings` cannot safely provide one constrained default per use case, stable configuration identity, optimistic concurrent updates, and immutable `ai_runs` provenance. This table is configuration only and never becomes a second work, Prompt, Draft, or content authority.

### 5.5 `ai_runs`

Purpose: one durable authority for AI request provenance, work claim/retry, candidates, token/cost records, safe failures, and human disposition.

Minimum draft fields:

- UUID ID, actor, target entity/type, operation kind;
- Provider/Model/Prompt ID/version/hash and input hash;
- status `pending`, `processing`, `draft_ready`, `failed`, or `cancelled`;
- attempt, separate retry state/next attempt, cancellation evidence, lease owner/expiry/version;
- sanitized request metadata and typed candidate JSON;
- input/output token counts and cost in integer micros or provider currency micros;
- safe failure code/detail, normalized Provider response status, operator, generation timestamps and duration;
- accepted/accepted-with-edits/rejected disposition, optional bounded human rating/labels/comment/evaluator/time, and linked Editorial Revision if saved.

Why necessary: Provider latency, retries, cancellation/late-response safety, the frozen text-concurrency limit, provenance, cost, and quality evaluation exceed a synchronous best-effort request. The table is simultaneously the run record and work authority; a separate AI queue or evaluation history is prohibited.

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

### `0020_phase1b_ai_foundation`

- Create `ai_model_config` with use-case defaults, bounded configuration, default-off enablement, optimistic concurrency, atomic required Audit, and nullable-but-disabled fallback reference.
- Create the single `ai_runs` AI Run/work table with lease, retry, model-config and Prompt snapshots, provenance, token/cost/timing, failure, output association, and typed-output JSON fields.
- Add unique request/idempotency constraints as approved.
- No AI knowledge base, chunk, embedding, vector, retrieval, visual-AI, live Prompt-corpus, private-file relation, fallback execution, or Publish/Index field.

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
- approved [Stage 0 Owner Decisions](./PHASE_1B_OWNER_DECISIONS.md).

Outputs:

- approved scope sequence;
- accepted ADR-0013 through ADR-0018 for local Production storage, Staging identity, structured Block compatibility, Product Import durable state, AI Run durable state, and Provider-agnostic AI configuration;
- frozen Product Code prefix rules, [Excel Template V1](./PRODUCT_IMPORT_TEMPLATE_V1.md), [email contract](./EMAIL_TEMPLATE_CONTRACT.md), AI/privacy boundary, and host directory contract.

Files/modules: documentation and ADRs only.

Schema/Migration: detailed review of `0018`–`0021`; none executed.

Security/release invariants: no code, credential, provider, environment, formal-data, deployment, or runtime mutation is authorized by Stage 0; all inherited boundaries must be represented in the approved ADRs.

Tests: document consistency, Migration design review, threat/privacy review.

Stop conditions:

- unresolved Production storage provider/volume design;
- unresolved Staging identity;
- no approved Product Code prefix rules or Excel template;
- no approved AI data-processing/provider boundary;
- any proposal introduces a duplicate authority.

Stage 0 document review closes these architecture/policy stop conditions. It deliberately defers the actual AI, Scanner, shared Rate Limiter, monitoring-account, Admin-identity, and Secret selections to the explicit gates in Section 11. Those deferred values do not authorize Stage 1 and do not reopen the approved architecture.

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

Current scope: P1-02A text Draft assistance only. P1-02B visual AI and AI Customer Service are deferred outside current Stage 4. Complete RAG is excluded and requires a future ADR.

Inputs: Stage 2 Blocks, accepted ADR-0017/ADR-0018, the owner-confirmed [Stage 4A Pre-Development Final Review](./PHASE_1B_STAGE4A_PRE_DEVELOPMENT_FINAL_REVIEW.md), the [Stage 4A Pre-Development Implementation Plan](./PHASE_1B_STAGE4_PRE_DEVELOPMENT_IMPLEMENTATION_PLAN.md), the [Stage 4A Owner Development Authorization](./PHASE_1B_STAGE4A_OWNER_DEVELOPMENT_AUTHORIZATION_V1_0.md), reviewed `0020`, the closed PD-09 budget, and the Synthetic fixture/quality contract. DeepSeek `PD-04` through `PD-07` remain non-blocking reference evaluations; a Provider API call, credentials, or Staging deployment still requires separate authorization.

Outputs:

- one Provider-agnostic AI Service Layer and cloud-only text adapter boundary;
- application-neutral orchestration plus a compiled use-case registry so future reviewed `customer_support` applications do not require an AI Service Layer refactor;
- `ai_model_config` for Provider/model/use-case/parameters/reviewed-Prompt/default-off state;
- versioned Prompt Registry with run-to-Prompt provenance;
- typed copy/layout candidates, Diff, Block accept/reject/lock/Undo;
- one `ai_runs` work/provenance authority with canonical lifecycle, Provider/model/Prompt/operator/token/cost/generation-time/output association/failure/retry/cancellation/Provider-status/human-evaluation records;
- four text use cases: SEO content, Fabric Knowledge, Product description, and sourcing-guide Draft assistance;
- explicit/structured/operator-selected context only, with no automatic retrieval; and
- text concurrency 2.

Primary modules:

- new Provider-neutral `src/ai/*` contracts/service/config/Prompt/worker boundary and isolated DeepSeek adapter;
- Block editor integrations;
- existing Product/Content/Asset/Revision services.

Schema/Migration: `0020` only.

Security/release invariants:

- no localhost/local model Production path;
- no private Inquiry files;
- forbidden factual fields absent/rejected;
- no Publish/Index/route capability;
- prompts/results/cost logs protected and redacted;
- Admin-only model/Prompt configuration; resource-scoped Editor generation/edit/submit; Editor cannot Publish;
- `draft_ready` remains protected and cannot change Production SEO/public state;
- no direct Provider call or model name in business-feature code;
- fallback disabled; and
- no RAG, knowledge base, chunk, embedding, vector retrieval, automatic retrieval, visual AI, or AI Customer Service.

Tests: architecture dependency, configuration switching, Prompt versioning/permissions, role matrix, canonical pending/processing/draft-ready/failed/cancelled lifecycle, no-fallback, no-RAG/no-vision, Provider contract, malformed/prompt-injected output, lease/retry/cancel/late-response, token/cost/generation-time/provenance/human-evaluation, stale/locked Block, no-public-write, protected Synthetic Staging, and 2 vCPU/4 GB bounded text pressure.

Stop conditions: a Provider response can modify truth fields, Production SEO or public state; private/customer/sensitive/unreviewed data enters context; role enforcement or Provider/model/Prompt/operator/generation-time/output provenance is missing; lifecycle, retry/cancellation, Provider-status or quality-evaluation evidence diverges from the design freeze; business code binds to a Provider/model; fallback/RAG/vision/AI Customer Service enters scope; Staging is bypassed; or Worker concurrency is unbounded.

Provider disposition: DeepSeek is selected but disabled-first, `DF-01`–`DF-06` are frozen, the Synthetic/evaluation contract is complete, the Stage 4A Staging budget is Owner-approved, and the enterprise evidence questionnaire has been submitted. The Owner has accepted the incomplete supplier-information risk and made `PD-04` through `PD-07` non-blocking references. Development is authorized, but Provider/API calls, credentials, spend, Staging deployment, and Production remain separately unauthorized. Any later protected Staging run requires an explicit external-action authorization and does not authorize Production.

Phase A current state: the exact `0020` Candidate is preserved through a non-fast-forward integration merge, its two independent reports and 19-item evidence set are incorporated by exact identity, and Low `L-01` is addressed by a documentation/oracle Erratum. See the [Phase A Completion / Integration Report](./PHASE_1B_STAGE4A_PHASE_A_COMPLETION_INTEGRATION_REPORT_V1_0.md). Phase A final acceptance and Phase B remain pending an independent Phase A Completion Review.

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

Inputs: accepted ADR-0013/ADR-0014, approved host-volume contract, and owner-approved concrete malware Scanner and shared Rate Limiter providers. Scanner/Rate Limiter selection is a hard Stage 6 entry gate and does not block Stages 1–5.

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

External identity gate: actual monitoring accounts, named Production/Staging Admins, and real Secrets are not required to complete Stages 1–5. They must be approved and provisioned before any authorized Stage 6/7 external deployment or provider configuration, and remain Production-readiness blockers.

Complexity: Very High operational work.

Rollback boundary: retain one prior image; database schema remains forward-compatible; config/volume switch has checksum-verified rollback; never delete old media until restore/readiness passes.

### Stage 7 — Authorized Staging and external validation

Inputs: Stage 6 topology; owner-approved external monitoring accounts, Production/Staging Admin identities, Secret custody and real environment-specific credentials; authorized Cloudflare/Zoho/COS/Sentry/Scanner/Rate Limiter/AI credentials; Synthetic data only.

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

## 10. Accepted Stage 0 ADR set

| ADR | Status | Primary boundary |
| --- | --- | --- |
| [ADR-0013 — Local Production Origin Storage](./adr/ADR-0013-local-production-origin-storage.md) | Accepted 2026-08-05; not implemented | Exact isolated local roots; existing Asset ID and controlled media route; COS backup only initially. |
| [ADR-0014 — Staging Identity and Preview Retirement](./adr/ADR-0014-staging-identity-and-preview-retirement.md) | Accepted 2026-08-05; not implemented | `staging` replaces `preview`; no permanent alias; protected/noindex/recipient-overridden isolation. |
| [ADR-0015 — Versioned Structured Block Document](./adr/ADR-0015-versioned-structured-block-document.md) | Accepted 2026-08-05; not implemented | One Block writer, deterministic Paragraph backfill, existing Revision, bounded legacy-field exit. |
| [ADR-0016 — Product Import Durable Authority](./adr/ADR-0016-product-import-durable-authority.md) | Accepted 2026-08-05; not implemented | Two import orchestration tables; existing Upload/Finalize/Product/Asset/Revision authorities. |
| [ADR-0017 — AI Run Work and Provenance Authority](./adr/ADR-0017-ai-run-work-and-provenance-authority.md) | Accepted 2026-08-05; not implemented | One Run/work authority; cloud-only, Draft-only, no private Inquiry or public-state capability. |
| [ADR-0018 — Provider-Agnostic AI Service and Model Configuration](./adr/ADR-0018-provider-agnostic-ai-service-and-model-configuration.md) | Accepted and Stage 4A design-frozen 2026-08-10; P1-02A development later authorized | One AI Service Layer; configurable Provider/model/use case/Prompt; canonical run lifecycle; Draft/role/data/Staging/quality boundaries; DeepSeek text default; no current fallback, RAG, vision, or Customer Service. |

Acceptance of an ADR approves architecture and planning only. The separate Stage 4A Owner record now authorizes bounded P1-02A code and `0020` Migration work. Other forward Migrations, Provider configuration/calls, credentials, formal data, deployment, Publish, and Index still require later explicit authorization.

## 11. Stage-gated owner selections

All 15 architecture/policy decisions are recorded in [Phase 1B Stage 0 Owner Decisions](./PHASE_1B_OWNER_DECISIONS.md). No remaining provider/account value blocks Stages 1–3, and the Scanner/Rate Limiter/account/Secret values do not block Stages 1–5 as specified below.

| Gate | Must be approved before | Does not block | Required decision/evidence | Production Ready impact |
| --- | --- | --- | --- | --- |
| AI development authorization | Stage 4A text development starts | Stages 1–3 | **Closed 2026-08-10:** design freeze, Owner-accepted supplier-information risk, non-blocking `PD-04`–`PD-07`, token/cost ceilings, Synthetic fixture/quality contract, and explicit P1-02A authorization | Development gate closed; Provider-call/Staging and Production decisions remain separate |
| Scanner and shared Rate Limiter gate | Stage 6 starts | Stages 1–5 | Concrete providers, service/failure contracts, credentials plan, 2 vCPU/4 GB behavior | Mandatory blocker until approved and externally validated |
| External account and Secret gate | Any authorized Stage 6/7 external deployment/configuration | Stages 1–5 | Monitoring accounts, Sentry project, uptime/independent alert route, Cloudflare/Zoho/COS identities, named Admins, environment-specific real Secrets and custody | Mandatory blocker until provisioned and validated |
| Formal data gate | Stage 8 formal import/public acceptance | Stages 1–7 with Synthetic data | Verified Product/Company facts, managed Category prefixes used by formal Products, licensed media and rights evidence | Mandatory blocker until owner acceptance |

Category prefix syntax/management is already approved. Individual Category prefix values are governed data rather than a new architectural decision: no prefix means no automatic Product Code, and formal values must be reviewed before formal import.

## 12. External configuration checklist

These values follow the approved policy in [Owner Decisions](./PHASE_1B_OWNER_DECISIONS.md) but are not configured in Stage 0. Their actual accounts, identities, and Secrets follow the gates in Section 11.

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

This original plan began as a pre-implementation artifact. The later Stage 4A Owner record supersedes that planning stop only for bounded P1-02A development and the sequential `0020` Phase A work. It does not authorize another Phase 1B Stage, Provider/API calls, credentials, external account mutation, Staging/Production deployment, Production AI, formal data import, Publish, Index, or Push. Each later Stage 4A phase still begins only after its preceding independent gate.
