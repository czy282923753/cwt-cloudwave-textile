# CWT Phase 1B Stage 0 owner decisions

Status: **Approved by the project owner; Stage 4A Architecture Approved / Development Authorized on 2026-08-10**

Authority: CWT Phase 1B Pre-Development Frozen Decision Baseline V1.1 — Final, owner-supplied SHA-256 `28503506cbc2ca4f3ae8bb35e590766fa7e37a82aefcc528c73a713e1cbccda6`

Discovery checkpoint: `7278c936b267c97e44d411d38dbbdd2bed104359`

This document closes the 15 Stage 0 decisions identified by Discovery. Stage 0 itself authorized documentation and architecture approval only. The later [Stage 4A Owner Development Authorization](./PHASE_1B_STAGE4A_OWNER_DEVELOPMENT_AUTHORIZATION_V1_0.md) separately authorizes bounded P1-02A development and `0020` Phase A work; it does not authorize Provider calls, credentials, Staging/Production deployment, Production AI, formal data, Publish, Index, or Push.

## 1. Local Production and Staging absolute roots

Initial live media uses isolated local host volumes. Tencent COS is an off-site backup destination, not the initial online media origin.

Approved persistent roots:

| Context | Absolute host path |
| --- | --- |
| Production public media originals/derivatives | `/srv/cwt/production/media/public` |
| Production private Inquiry media | `/srv/cwt/production/media/private-inquiries` |
| Production internal Import/staging bytes | `/srv/cwt/production/media/import` |
| Production application logs | `/srv/cwt/production/logs` |
| Staging public media | `/srv/cwt/staging/media/public` |
| Staging private Inquiry media | `/srv/cwt/staging/media/private-inquiries` |
| Staging internal Import bytes | `/srv/cwt/staging/media/import` |
| Staging application logs | `/srv/cwt/staging/logs` |
| PostgreSQL instance data | `/srv/cwt/postgresql/data` |
| Local PostgreSQL dumps | `/srv/cwt/backups/postgresql` |
| Complete backup-set working area | `/srv/cwt/backups/sets` |
| Production deployment configuration/secrets | `/etc/cwt/production` |
| Staging deployment configuration/secrets | `/etc/cwt/staging` |

These are host paths and future mount contracts, not public web roots. Reverse proxy/static-file configuration must not expose them. Production and Staging paths must never overlap or be bind-mounted into the other environment. A later data disk may be mounted underneath `/srv/cwt` or bound to the same approved paths so application contracts remain stable.

Public media continues to use the existing Asset ID and application-controlled route. Filesystem paths and Object Keys are not URL contracts.

Decision record: [ADR-0013](./adr/ADR-0013-local-production-origin-storage.md).

## 2. Staging identity and Preview retirement

`staging` formally replaces `preview`. New runtime configuration, documentation, environment validation, cookies, noindex rules, email override, analytics policy, monitoring, database identity, and hostnames use `staging` only.

No permanent `preview` alias or dual semantic authority is permitted. A one-time forward compatibility operation may rename existing persisted enum/config values during the approved Stage 1 Migration/deploy sequence. After cutover, `preview` is rejected as configuration.

Decision record: [ADR-0014](./adr/ADR-0014-staging-identity-and-preview-retirement.md).

## 3. Structured Block backfill and legacy-field exit

Non-empty legacy Product and Content text is deterministically converted to a version-1 Paragraph Block document. Empty source text becomes an empty document; no copy or facts are inferred.

At writer cutover there is exactly one authoritative writer: the structured Block document. Legacy text fields become read-only rollback evidence and are not dual-written.

Legacy fields remain until all of these are true:

1. Production launch has completed;
2. the complete empty-environment restore drill has passed;
3. the structured editor/renderer has remained stable in Production for 30 consecutive days.

Removal requires a separate, explicitly authorized forward Migration. Stage 1 is not authorized to delete the fields.

Decision record: [ADR-0015](./adr/ADR-0015-versioned-structured-block-document.md).

## 4. Product Code category prefix and correction

`product_code_prefix` is a managed field on the Primary Category authority. A prefix:

- contains 3–8 uppercase ASCII letters only;
- is unique when present;
- contains no spaces, numbers, punctuation, year, color, GSM, Width, or Chinese characters;
- does not create a public route or enable Index.

Existing Product Codes are retained. When a Product has no existing code, automatic generation uses `CWT-[TYPE]-NNN`. If its Primary Category has no approved prefix, automatic generation is refused and the Product remains unassigned until an authorized operator resolves it. Codes are permanently unique and never reused.

After assignment, ordinary editing is prohibited. Only an Admin may execute a dedicated correction command, and a non-empty reason plus atomic Audit is mandatory. A Category change does not silently regenerate the Product Code.

Actual category-prefix values are governed Category data. Synthetic prefixes may be used in tests; formal prefixes must be reviewed before formal Product import.

## 5. MOQ units and legacy note

The Phase 1B MOQ unit allowlist is exactly:

```text
m
kg
roll
yd
```

MOQ value is a positive numeric field and the unit is stored separately. Both may remain empty when unknown. `moq_note` remains an optional note and is not automatically parsed, split, normalized into facts, or used by AI to infer value/unit.

## 6. Composition representation

Composition remains one nullable, normalized factual string in Phase 1B. Approved examples include `100% Polyester` and `92% Polyester / 8% Spandex`.

Validation may normalize spacing, separators, and approved material capitalization but must not change ratios, infer missing fibers, force a total, or convert unknown data into a fact. Phase 1B does not add a fiber-percentage table or second composition authority.

## 7. Product Import Template V1 limits and modes

The owner approves Product Import Template V1 with these hard limits:

- no more than 100 Product rows per batch;
- Excel file no larger than 10 MB;
- no more than 500 images per batch;
- each image no larger than 20 MB actual streamed bytes;
- compressed archive no larger than 500 MB actual bytes;
- expanded archive content no larger than 2 GB actual bytes.

Create mode requires Name, one Primary Category, and at least one deterministically matched eligible image. Product Code may use an approved existing code or be generated only when the Primary Category has an approved prefix.

Update mode matches only the complete normalized Product Code. It never matches by name, Slug, filename fragment, specifications, image similarity, or fuzzy logic. Create and Update are separate immutable batch modes.

The complete field, image, partial-success, Row Error, retry, and archive contract is [Product Import Template V1](./PRODUCT_IMPORT_TEMPLATE_V1.md).

## 8. Approved email-template variables

Templates use an exact allowlist. Arbitrary property access, expressions, functions, filters, loops, includes, remote content, and unknown variables are rejected.

Customer confirmation allowlist:

```text
customer_name
inquiry_reference
submitted_at
company_name
reply_to_email
```

Internal notification allowlist:

```text
inquiry_reference
submitted_at
customer_name
customer_email
country_code
whatsapp
inquiry_description
attachment_count
source_page_path
landing_page_path
referrer
utm_source
utm_medium
utm_campaign
last_non_direct_source
last_non_direct_medium
last_non_direct_campaign
source_entity_type
source_entity_label
operations_url
```

`operations_url` is an authenticated record-scoped Admin link, never an Asset Object Key, raw storage URL, or private-file download URL. Missing optional values use an approved neutral fallback or omit the corresponding line; templates cannot invent values.

The complete sender, recipient, lifecycle, fallback, and safety contract is [Email Template Contract](./EMAIL_TEMPLATE_CONTRACT.md).

## 9. AI Stage gate

Stage 0 freezes these boundaries:

- Production uses an external cloud API only and requires `AI_PROVIDER_MODE=cloud_api`;
- no local model server, model weights, local image generation, or localhost model endpoint;
- AI writes reviewable Draft proposals only;
- AI has no Publish, Index, route, factual-field, private Inquiry file, Contact, Organization, credential, or customer-data capability;
- manual editing remains available when AI is disabled or fails.

The owner approved the following Stage 4 architecture on 2026-08-10:

- one Provider-agnostic AI Service Layer is the only AI call boundary;
- business-feature code never calls or names a concrete Provider/model;
- `ai_model_config` controls Provider, model, use case, bounded parameters, reviewed immutable Prompt selection, and enabled/default state;
- the versioned Prompt Registry is independent from business-code strings and every `ai_run` records the exact Prompt version;
- `ai_runs` remains the single AI work and call-provenance authority;
- fallback is reserved for future extension but is disabled and unimplemented in current Stage 4;
- DeepSeek API / `deepseek-v4-flash` is the initial default for `seo_content_draft`, `fabric_knowledge_draft`, `product_description_draft`, and `sourcing_guide_draft`;
- current Stage 4 is P1-02A text AI only;
- P1-02B visual AI is deferred for separate future evaluation; and
- the audited RAG state is Level 0, complete RAG is excluded, and any future RAG work requires a separate ADR.

The owner additionally requires the AI Service Layer to remain application-neutral. A future `customer_support` application class must be addable through reviewed use-case registration, application policies/schemas/configuration, and a Customer Service integration without refactoring the core AI Service Layer. Current Stage 4 does not register or develop AI Customer Service, conversation state, customer-message sending, CRM/Inquiry actions, or customer-data access. Any future Customer Service capability requires separate architecture and security/privacy approval.

Current Stage 4 context is limited to explicit input, allowlisted structured business data, and data deliberately selected by an authorized operator. It performs no automatic knowledge retrieval.

The owner completed the Stage 4A pre-development design freeze on 2026-08-10:

- AI results become protected `draft_ready` candidates only, then require Editor Diff/edit into Draft, human review, and the existing Reviewer/Publisher or Admin Publish workflow; Publish and Index remain independent;
- AI cannot automatically change Production SEO/public content, facts, routes, Canonical, Publish, Index, or eligibility;
- every run retains task, operator, Provider, requested/returned Model, Prompt version/hash, generation timing, output association, Provider status, and human disposition/quality evidence;
- current context is limited to deliberately selected verified/approved company content, authorized allowlisted Product/Fabric data, and bounded explicit operator input; customer/private/CRM/PII, sensitive or unauthorized internal data, unreviewed files, arbitrary URLs, and automatic retrieval remain prohibited;
- Admin manages model configuration, reviewed Prompt-version activation/rollback, redacted AI logs, and governed review/Publish; Product Editor and Content Editor may generate/edit/submit within their existing scope but cannot manage model/Prompt configuration or Publish;
- the only AI Run statuses are `pending`, `processing`, `draft_ready`, `failed`, and `cancelled`; retry state, typed errors, cancellation, and Provider response evidence are separate; and
- protected Synthetic-only Staging must validate API, roles, logs/provenance, lifecycle, and Draft→review→Publish behavior before any separate Production decision.

The generic earlier `succeeded/dead` planning terminology is superseded for Stage 4A: success is `draft_ready`, while terminal retry exhaustion is `failed` plus separate retry state. Live free-form Prompt editing remains excluded; Admin Prompt management operates only on reviewed immutable versions.

The Owner closed `PD-09` on 2026-08-10 with this Stage 4A Staging-only AI budget:

- `USD 0.02` maximum per logical AI run across all permitted attempts;
- `USD 5.00` daily hard stop;
- `USD 50.00` monthly warning;
- `USD 100.00` monthly hard stop; and
- `USD 0.00` Production budget.

This budget is limited to Stage 4A Staging AI-flow, Prompt, output-quality, and cost evaluation. It does not authorize credentials, a Provider call, Staging deployment, or development. A Production budget must be redesigned after `PD-12` against approved use cases and actual Staging evidence; `PD-12` alone does not authorize Production AI, spend, deployment, or enablement.

The Owner separately authorized submission of the prepared DeepSeek enterprise evidence questionnaire for supplier capability, security, data-processing, service-term, stability/support, account/model/quota, and suitability assessment only. The official DeepSeek portal returned successful submission on 2026-08-10. This external inquiry does not authorize API integration, credentials, a model call, Production use, formal/private/customer data, development, deployment, `PD-12`, Publish, Index, or formal import. The immutable [Questionnaire](./PHASE_1B_STAGE4A_DEEPSEEK_ENTERPRISE_EVIDENCE_QUESTIONNAIRE.md) and [Submission Record](./PHASE_1B_STAGE4A_DEEPSEEK_EVIDENCE_REQUEST_SUBMISSION_RECORD.md) preserve the exact scope and evidence.

The Owner's later development decision cancels DeepSeek enterprise-evidence review as a Stage 4A development, testing, or later release prerequisite. `PD-04` through `PD-07` are non-blocking reference evaluations, and the Owner accepts the current supplier-information gap for the approved public-company, Product-structured, Fabric Knowledge, and explicit-human-input Draft-assistance scope. The earlier evidence conclusions remain historical facts; their blocking disposition is superseded. The approved `PD-09` budget remains a fixed fail-closed design input.

Current Stage 4A status is **Architecture Approved / Development Authorized**. Provider-agnostic design, the four text use cases, explicit-context/no-RAG boundary, disabled fallback, no visual AI, no AI Customer Service, and Draft/review/Publish/Index separation remain unchanged. No Provider API call, credential use, Staging/Production deployment, Production AI, Deploy, Publish, Index, or formal data import is authorized.

Decision records: [ADR-0017](./adr/ADR-0017-ai-run-work-and-provenance-authority.md), [ADR-0018](./adr/ADR-0018-provider-agnostic-ai-service-and-model-configuration.md), the [Stage 4A Owner Development Authorization](./PHASE_1B_STAGE4A_OWNER_DEVELOPMENT_AUTHORIZATION_V1_0.md), the [Stage 4A Pre-Development Final Review](./PHASE_1B_STAGE4A_PRE_DEVELOPMENT_FINAL_REVIEW.md), the [Stage 4A Pre-Development Implementation Plan](./PHASE_1B_STAGE4_PRE_DEVELOPMENT_IMPLEMENTATION_PLAN.md), the [Phase A Completion / Integration Report](./PHASE_1B_STAGE4A_PHASE_A_COMPLETION_INTEGRATION_REPORT_V1_0.md), the [DeepSeek Questionnaire](./PHASE_1B_STAGE4A_DEEPSEEK_ENTERPRISE_EVIDENCE_QUESTIONNAIRE.md), and the [DeepSeek Submission Record](./PHASE_1B_STAGE4A_DEEPSEEK_EVIDENCE_REQUEST_SUBMISSION_RECORD.md).

## 10. Scanner and shared Rate Limiter gate

The current fail-closed Production boundaries remain mandatory. The specific malware Scanner and shared Rate Limiter providers, credentials, service levels, outage behavior, and target-host resource behavior are a Stage 6 entry gate.

Provider selection does not block Stages 1–5 when tests use isolated fakes/local validation permitted by the test environment. It does block Stage 6 provider integration, Stage 7 external validation, and Production readiness.

## 11. Canonical host

The canonical public origin is:

```text
https://cwtextile.com/
```

`https://www.cwtextile.com/` performs one HTTP 301 hop to the corresponding path and query on the canonical host. HTTP-to-HTTPS and `www` canonicalization must not create a redirect chain. Canonical metadata, Sitemap, robots, route ownership, and absolute public URLs use `https://cwtextile.com`.

## 12. Cloudflare origin and SSH security

- Alibaba Cloud remains only the registrar; Cloudflare is authoritative DNS, proxied CDN/WAF, and TLS reverse proxy.
- `cwtextile.com`, `www.cwtextile.com`, and `staging.cwtextile.com` are proxied; TLS mode is Full (strict) with a valid origin certificate.
- Zoho MX/SPF/DKIM/DMARC/verification records remain DNS Only.
- Origin TCP 80/443 accepts only current official Cloudflare source ranges or a separately approved authenticated tunnel with equivalent denial of direct origin access.
- Staging requires Cloudflare Access or equivalent additional access protection.
- PostgreSQL 5432 is never publicly exposed.
- SSH 22 uses key authentication and a Tencent firewall/security-group allowlist for owner-approved fixed/trusted access. Root/password login and `0.0.0.0/0` SSH exposure are prohibited.
- The application trusts Cloudflare visitor-IP headers only when the direct peer is inside the configured trusted proxy boundary. Ordinary clients cannot make `X-Forwarded-For`, `X-Real-IP`, or `CF-Connecting-IP` authoritative.

Actual Cloudflare account, Access identities, IP allowlists, keys, and origin certificate are Stage 6/7 external configuration values and are not stored in this repository.

## 13. COS backup, CAM, encryption, and key custody

- Use a new Tencent COS **Private** bucket in the Singapore region for off-site backup only.
- Public ACLs, anonymous listing, website hosting, and direct online-media delivery are prohibited.
- Use a dedicated least-privilege CAM identity restricted to the approved backup bucket/prefix and required list/put/get/retention-delete operations. Do not use a Tencent root-account key or an application-wide cloud credential.
- Production and Staging do not share COS credentials. Staging has no Production backup read access.
- Backup archives containing database, private Inquiry media, or deployment configuration are encrypted before upload; COS server-side encryption is also enabled where supported.
- Encryption keys are never committed, embedded in images, written into backup archives, stored in the same COS prefix, or printed in logs.
- The active key is injected from root-readable Production secret storage. Recovery copies are held separately in the project owner's approved password manager and sealed offline recovery custody.
- Key rotation and recovery must be proven through a restore rehearsal before the old key is retired.

Actual bucket name, CAM identity, SecretId/SecretKey, encryption key, and recovery custodian identity are Stage 6/7 external values and remain Production-readiness blockers.

## 14. Monitoring and independent alerts

The approved monitoring stack is:

- Tencent Cloud host monitoring for CPU, memory, disk, network, process/unreachable conditions;
- hosted Sentry Free for application errors, with environment/release tags and PII/secret scrubbing;
- an external Uptime monitor for Home and Health;
- at least one owner-approved Tencent/Sentry/push/SMS or equivalent alert path that does not depend on Zoho SMTP.

Approved thresholds:

- disk 70% warning; disk 80% pauses nonessential batch upload/work;
- memory above 80% for 10 minutes;
- CPU above 85% for 15 minutes;
- Home every five minutes and three consecutive failures;
- Health consecutive failure;
- Outbox repeated failure or oldest backlog over 30 minutes;
- daily database backup failure;
- weekly COS backup missing, upload failure, or checksum failure;
- Worker dead task;
- server unreachable.

Email to `info@cwtextile.com` may be an additional channel but cannot be the only critical alert route. Actual accounts, DSNs, tokens, recipients, and escalation identities are Stage 6/7 gates and remain Production-readiness blockers.

## 15. Administrator and Secret isolation

- Production and Staging use separate Admin accounts and independently generated passwords. Named identities and initial credentials are supplied only through the approved Stage 6/7 provisioning ceremony.
- No shared Session secret, database password/user, SMTP app password, AI key/environment identity, analytics configuration, media root, Sentry environment/project credential, backup credential, or application Secret is permitted between Production and Staging.
- Production credentials are absent from local Development, automated tests, Staging, Git, container images, build logs, URLs, screenshots, and documentation.
- Secrets are injected from root-readable environment-specific secret storage or a subsequently approved secret manager. `/etc/cwt/production` and `/etc/cwt/staging` must have distinct ownership/access and must not be bind-mounted across environments.
- Access follows least privilege, is auditable, and is revoked when an operator no longer needs it. Default/test credentials are prohibited. Production secrets are rotated before launch and after suspected exposure.
- Staging cannot query Production databases, read Production media/backups, use Production SMTP credentials, send to real recipients, or enable formal analytics.

External account identities and actual Secret values are deliberately not selected or recorded in Stage 0. They must be approved before Stage 6/7 deployment and remain mandatory for Production readiness.

## Stage 0 closure

All 15 owner-decision categories are closed at the architecture/policy level. Remaining provider names, external accounts, named administrators, and Secret values are deliberate later Stage gates, not unresolved blockers for Stages 1–3 or, where stated, Stages 1–5.

No Stage 1 business development is authorized by this Stage 0 approval. The separate Stage 4A Owner record authorizes P1-02A development only and does not broaden any other Stage or external-action authority.
