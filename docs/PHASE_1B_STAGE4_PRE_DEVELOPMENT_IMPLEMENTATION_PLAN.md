# CWT Phase 1B Stage 4A Pre-Development Implementation Plan

Status: **ARCHITECTURE APPROVED / DEVELOPMENT AUTHORIZED — PHASE A INTEGRATION CANDIDATE PREPARED / COMPLETION REVIEW PENDING**  
Plan version: `1.4`  
Prepared: `2026-08-10` (Asia/Shanghai)  
Planning baseline: `31c0e405acfdd0d05200d0fb2531e897a541a2c4`  
Frozen tag preserved: `phase-1b-stage3-approved-2026-08-09`  
Architecture authority: [ADR-0017](./adr/ADR-0017-ai-run-work-and-provenance-authority.md), [ADR-0018](./adr/ADR-0018-provider-agnostic-ai-service-and-model-configuration.md), and the [Stage 4A Pre-Development Final Review](./PHASE_1B_STAGE4A_PRE_DEVELOPMENT_FINAL_REVIEW.md)  
Review evidence: [PD-04–PD-11 Review Report](./PHASE_1B_STAGE4A_PD04_PD11_REVIEW_REPORT.md), [DeepSeek Enterprise Evidence Questionnaire](./PHASE_1B_STAGE4A_DEEPSEEK_ENTERPRISE_EVIDENCE_QUESTIONNAIRE.md), [DeepSeek Submission Record](./PHASE_1B_STAGE4A_DEEPSEEK_EVIDENCE_REQUEST_SUBMISSION_RECORD.md), and [PD-11 Synthetic Evaluation Contract](./PHASE_1B_STAGE4A_PD11_SYNTHETIC_EVALUATION_CONTRACT.md)

Phase A integration evidence: [Completion / Integration Report V1.0](./PHASE_1B_STAGE4A_PHASE_A_COMPLETION_INTEGRATION_REPORT_V1_0.md), [Acceptance-Oracle Erratum V1.0](./PHASE_1B_STAGE4A_PHASE_A_ACCEPTANCE_ORACLE_ERRATUM_V1_0.md), [Independent Migration Design Review V1.0](./PHASE_1B_STAGE4A_PHASE_A_0020_INDEPENDENT_MIGRATION_REVIEW_V1_0.md), and [Independent Migration Candidate Review V1.0](./PHASE_1B_STAGE4A_PHASE_A_0020_INDEPENDENT_CANDIDATE_REVIEW_V1_0.md)

> The design-freeze PASS permitted `PD-04` through `PD-11` evidence collection and independent review only. The completed public-evidence review found unresolved Provider-assurance gates, so `PD-12` is not eligible. Nothing here authorizes Schema changes, Migration generation/execution, product code, Provider credentials, account mutation, real API calls, Stage 4 development, Staging deployment, Production enablement, Deploy, formal data import, Publish, or Index.

> **Current superseding authorization:** The [Stage 4A Owner Development Authorization](./PHASE_1B_STAGE4A_OWNER_DEVELOPMENT_AUTHORIZATION_V1_0.md) later cancels DeepSeek enterprise-evidence review as a prerequisite, makes `PD-04` through `PD-07` non-blocking references, accepts the supplier-information risk for the frozen data/use-case boundary, and authorizes P1-02A development. The quoted pre-development state is retained as history. Provider/API calls, credentials, Staging/Production deployment, Production AI, Deploy, Publish, Index, and formal import remain unauthorized.

## 1. Objective

Deliver a bounded current Stage 4 text-AI capability that:

- uses one Provider-agnostic AI Service Layer;
- defaults all approved text use cases to DeepSeek API / `deepseek-v4-flash`;
- resolves Provider, model, use case, bounded parameters, and enabled state through `ai_model_config`;
- resolves versioned Prompt templates through a dedicated Prompt Registry;
- records every call and work transition in the single `ai_runs` authority;
- keeps the core orchestration application-neutral so future reviewed `customer_support` use cases can be registered without refactoring the AI Service Layer;
- accepts only explicit, structured, or operator-selected input;
- returns human-reviewable Draft proposals only; and
- preserves manual editing and all existing public behavior when AI is disabled or fails.

## 2. Current Stage 4 scope

### Included: P1-02A text AI

The first Candidate covers exactly four use cases:

| Use case ID | User-facing purpose | Permitted output |
|---|---|---|
| `seo_content_draft` | SEO content Draft generation | Draft title/description, outline or allowlisted Blocks; no route, Canonical, Publish, or Index mutation. |
| `fabric_knowledge_draft` | Fabric Knowledge Draft generation | Draft article structure and allowlisted narrative Blocks from explicit approved context. |
| `product_description_draft` | Product-description assistance | Draft name/summary/description/features/FAQ/Alt/Caption proposals from supplied facts; no factual-field mutation. |
| `sourcing_guide_draft` | China sourcing/procurement guide assistance | Draft guide structure and narrative Blocks from explicit approved sources and Company Facts. |

All four use cases initially resolve to:

```text
provider = deepseek
model = deepseek-v4-flash
capability = text
enabled = false until the approved rollout step
fallback = null
```

### Excluded from current Stage 4

- P1-02B visual AI, visual Provider/model, image Prompt, image API, or model-bound Asset transfer;
- AI Customer Service, `customer_support` use cases, conversations, customer-message generation/sending, CRM/Inquiry actions, or Customer Service UI/workflows;
- complete RAG;
- `ai_knowledge_base`;
- document ingestion/parsing for AI;
- chunking, chunk versioning, embedding, vector storage, similarity retrieval, or automatic knowledge retrieval;
- fallback execution or multi-Provider routing;
- live free-form Admin Prompt-body editing;
- tools, web search, remote retrieval, Files, Agents, conversations, or Provider-managed long-lived application state;
- direct business-module Provider calls;
- AI auto-accept, factual mutation, Publish, Index, Route, Redirect, rights approval, or public-state mutation;
- Production enablement, formal Product data, customer/private data, and external deployment.

## 3. Required pre-development gates

### Design-freeze prerequisite

The owner confirmed these items on 2026-08-10. They are detailed in the [Stage 4A Pre-Development Final Review](./PHASE_1B_STAGE4A_PRE_DEVELOPMENT_FINAL_REVIEW.md).

| ID | Frozen boundary | State |
|---|---|---|
| DF-01 | Draft-only business workflow, no automatic Production SEO/public change, complete provenance, and durable human quality evaluation. | **Closed** |
| DF-02 | Allowlisted company/Product/Fabric/operator-input context; customer/private/sensitive/unauthorized/unreviewed data prohibited. | **Closed** |
| DF-03 | Admin configuration/Prompt/log/review authority; resource-scoped Editor generation/Draft/submit authority; Editor cannot configure Prompt/model or Publish. | **Closed** |
| DF-04 | Canonical `pending`, `processing`, `draft_ready`, `failed`, `cancelled` lifecycle plus separate retry, error, cancellation, and Provider-response evidence. | **Closed** |
| DF-05 | Protected Synthetic-only Staging validation before any Production decision. | **Closed** |
| DF-06 | DeepSeek initial default with configuration-driven future GPT/Claude/other Provider switching and no business-code dependency. | **Closed** |

Read-only/contractual evidence collection for `PD-04` through `PD-11` was authorized on 2026-08-10. The Owner separately authorized the prepared DeepSeek questionnaire, and the official portal returned successful submission on the same date. Provider replies may be preserved and reviewed as reference evidence; any further outbound message, account mutation, credential use, real Provider request, or other external write still requires explicit authorization. The later Owner record authorizes development without requiring the unresolved supplier evidence to close.

### PD gates

| ID | Gate | Current state | Required evidence / decision |
|---|---|---|---|
| PD-01 | Architecture | **Closed** | Owner-approved ADR-0017 and ADR-0018. |
| PD-02 | RAG and vision scope | **Closed** | Complete RAG excluded; P1-02B excluded from current Stage 4. |
| PD-03 | Provider/model selection | **Closed** | DeepSeek API / `deepseek-v4-flash` selected as initial text default. |
| PD-04 | API training/use of inputs and outputs | **Non-blocking reference — Provider response pending** | The evidence gap remains recorded; Owner accepts the current risk for the frozen data/use-case boundary. |
| PD-05 | Processing/storage region | **Non-blocking reference — Provider response pending** | The complete API data path remains unconfirmed; it is no longer a development/testing/release prerequisite. |
| PD-06 | Default cache | **Non-blocking reference — Provider response pending** | Cache control/retention/isolation gaps remain historical risk evidence rather than a blocking gate. |
| PD-07 | Enterprise data security | **Non-blocking reference — Provider response pending** | Enterprise assurance gaps remain tracked without blocking current Stage 4A work. |
| PD-08 | Endpoint and account capability | **Reference / live evidence deferred** | Public contract is confirmed; actual account/project/key, entitlement, quota, billing, and behavior require separate Provider-call/Staging authority. |
| PD-09 | Cost and token ceilings | **Closed — Owner approved** | Stage 4A Staging budget approved on 2026-08-10; existing token ceilings remain unchanged and fail-closed enforcement is an input to PD-10. |
| PD-10 | Security/Privacy review | **Not a current pre-development blocking gate** | May continue as reference review; it cannot imply Provider-call, credential, Staging, or Production authority. |
| PD-11 | Synthetic fixtures and evaluation contract | **Closed — contract only** | Versioned manifest and acceptance contract cover all four use cases without formal/private/customer data; execution remains post-authorization work. |
| PD-12 | Development authorization | **Closed — Owner authorized 2026-08-10** | Bounded P1-02A development is authorized under the frozen architecture and explicit external-action prohibitions. |

The review did not identify a defect in ADR-0018 or a reason to change Stage 4A, RAG, visual-AI, fallback, or Provider-agnostic boundaries. The unresolved supplier findings remain reference risks, not current development blockers. DeepSeek remains selected but disabled-first.

### Owner-approved PD-09 Stage 4A Staging budget

The Owner approved the following limits on 2026-08-10 for Stage 4A Staging testing only:

| Limit | Approved value | Enforcement |
|---|---:|---|
| Per logical text run, all attempts combined | `USD 0.02` | Preflight denial plus post-run actual accounting; retries cannot multiply the cap. |
| Stage 4A Staging daily hard stop | `USD 5.00` | Stop new claims; manual editing remains available. |
| Stage 4A Staging monthly warning | `USD 50.00` | Controlled Admin/Operations warning; no automatic limit increase. |
| Stage 4A Staging monthly hard stop | `USD 100.00` | Stop new claims. |
| Production | `USD 0.00` | Production AI remains disabled and has no spend authority. |

These limits cover AI-flow validation, Prompt validation, output-quality evaluation, and cost evaluation in Stage 4A Staging only. The price source and cost formula must be revalidated immediately before development authorization and again before any external validation. Unknown or unreportable cost fails closed.

A Production budget must be designed after `PD-12` against evidenced use cases and actual Staging results. `PD-12` alone does not authorize Production AI, Production spend, deployment, or enablement; those remain subject to later independent review and explicit Owner authorization.

## 4. Target architecture

### 4.1 Dependency direction

```text
Product / Content / SEO Domain Services
  -> AI Service Layer contracts
     -> application/use-case registry
     -> context policy
     -> model configuration resolver
     -> Prompt Registry
     -> ai_runs service/worker
     -> TextAiProvider registry
        -> DeepSeek adapter
```

Allowed dependency direction is inward toward Provider-neutral contracts. Provider adapters may depend on Provider clients; business modules may not depend on adapters or Provider clients.

An automated architecture test must fail if business modules import a Provider package, Provider adapter, Provider URL, concrete model name, or Provider DTO.

### 4.2 Provider-neutral request contract

The AI Service Layer receives a typed command containing only:

- use case;
- actor and target Draft/entity identity;
- expected Draft/editor version;
- explicitly selected context-source references;
- Prompt ID or the use-case default Prompt selection;
- output contract version; and
- stable request/idempotency identity.

The caller cannot provide Provider, model, endpoint, API key, arbitrary system Prompt, arbitrary tool, arbitrary URL, raw private file, or raw database query.

The command/result envelope and orchestration lifecycle are not specific to Product/Content Drafts. Each compiled use-case definition supplies its application class, authorization/context policy, Prompt/output schema, and reviewed target/result association. Current Stage 4 registers only the four `draft_assistance` cases. A future `customer_support` application can add definitions and an application integration without changing the core AI Service Layer, Provider adapter, model configuration, Prompt Registry, or run lifecycle.

This extension point grants no present Customer Service authority. Any future Customer Service scope requires a separate owner-approved architecture and security/privacy decision before it may register a use case or access conversations, Inquiry/CRM/customer data, retrieval, tools, or outbound-message actions.

### 4.3 Explicit context builder

The context builder, not the caller or Provider adapter, owns data selection. It permits only fields approved for the use case and records safe provenance.

Permitted sources:

- current verified Company Facts and approved CWT public/editorial company content deliberately selected for the task;
- the current actor-authorized Product or Content Draft;
- use-case-allowlisted structured Product fields whose provenance is supplied or verified;
- actor-authorized Fabric Knowledge content deliberately selected for the task;
- approved Taxonomy/Application labels and relationships;
- bounded explicit operator input that passes the same authorization, factual, privacy, file, and size policy; and
- versioned Prompt/schema policy.

Prohibited sources:

- Inquiry, Contact, Organization, Customer Activity, private attachments, or customer identifiers;
- email, phone, WhatsApp, IP, cookies, sessions, CRM IDs, or analytics identities;
- unauthorized internal material, commercially sensitive business data outside the explicit allowlist, or unreviewed files;
- credentials, Secrets, headers, environment values, Object Keys, or private/permanent URLs;
- arbitrary uploaded PDF/Word/TXT/ZIP content;
- automatic search, knowledge-base, vector, web, file, or remote-tool results;
- unverified company/facility/capacity/ownership claims; and
- unknown/null facts represented as placeholders or inferred values.

### 4.4 `ai_model_config`

The Migration design must implement the ADR-0018 fields and enforce:

- one enabled default per capability/use case;
- current capability `text` only;
- exactly the four initially approved use cases;
- registry agreement between each use case and its application class, capability, authorization/context policy, Prompt, output schema, and result rules;
- known adapter-backed Provider keys;
- bounded model identifiers and adapter-specific parameter schemas;
- one reviewed immutable Prompt ID/version matching the use case and capability;
- `enabled=false` by default;
- `fallback_config_id IS NULL` for every current Stage 4 configuration;
- optimistic record version;
- no physical delete after run reference;
- authorized Domain Service mutation; and
- atomic required Audit.

Configuration and reviewed Prompt-version selection are Admin operations through the authorized Domain Service. They change only new runs, use optimistic concurrency, and commit required Audit atomically. The run stores both the configuration reference and immutable resolved snapshots. Product Editor and Content Editor cannot perform either operation.

### 4.5 Prompt Registry

Initial Prompt resources are proposed as:

| Prompt ID | Initial version | Use case |
|---|---:|---|
| `seo-content-draft` | `1` | `seo_content_draft` |
| `fabric-knowledge-draft` | `1` | `fabric_knowledge_draft` |
| `product-description-draft` | `1` | `product_description_draft` |
| `sourcing-guide-draft` | `1` | `sourcing_guide_draft` |

Each resource has a metadata/schema companion, variable allowlist, maximum sizes, output contract, and content hash. Prompt text is absent from business feature modules.

Changing a Prompt creates a new immutable version. Existing runs continue to point to the exact previous version/hash. Removing a referenced Prompt version is prohibited.

Stage 4A Admin Prompt management means inspecting the registry and activating, disabling, or rolling back among reviewed immutable versions through the configuration boundary. It does not include live free-form Prompt-body editing. Prompt body changes require a new repository-reviewed version.

### 4.6 `ai_runs`

One row is both the durable work item and the complete call/provenance record. The exact reviewed Schema must cover:

- task/use case, actor, target and expected target version;
- request/idempotency identity;
- model-config reference and resolved Provider/model/parameter snapshots;
- Prompt and Provider-envelope versions/hashes;
- bounded input-source references and hash;
- status limited to `pending`, `processing`, `draft_ready`, `failed`, or `cancelled`;
- attempts, separate retry state/backoff, cancellation evidence, claim owner/lease/version;
- queued/generation-started/generated/completed timestamps and duration;
- input/output/total tokens and cost evidence;
- typed safe failure code/detail and normalized Provider response status/error/request identity;
- normalized validated candidate JSON or protected result reference; and
- human disposition, optional bounded rating/allowlisted labels/sanitized comment/evaluator/time, plus linked ordinary Draft/Revision when accepted.

`draft_ready` is protected, non-public Draft-scoped content; no successful AI-content state exists outside the Draft boundary. It is not an accepted Draft mutation, approval, Publish, Index, or Production SEO change. Retry exhaustion is `failed` plus `retry_state=exhausted`; `dead` is not an additional AI Run status. A cancellation fence prevents a late Provider response from becoming `draft_ready`.

Provider calls occur outside business save/apply transactions. Provider success cannot report a Draft mutation as successful until a separate authorized human action commits through the existing Domain Service and Audit boundary.

The target/result association is application-neutral but type-constrained. Current Stage 4 accepts only reviewed Product/Content Draft and Editorial Revision associations. A future Customer Service integration must use a separately reviewed association type and must not create another AI run or provenance authority.

### 4.7 DeepSeek adapter

The adapter is responsible only for translating the CWT text contract to the approved DeepSeek request and normalizing the response.

Initial contract proposal, still subject to PD-04–PD-10:

- approved HTTPS DeepSeek host only;
- `deepseek-v4-flash` only;
- non-thinking mode initially;
- JSON Output with strict local schema validation;
- maximum 16,000 input tokens and 4,000 output tokens;
- non-streaming;
- no tools, web/file retrieval, FIM, Beta prefix, conversation state, arbitrary endpoint, or silent model substitution;
- finite timeout and maximum three total attempts for approved transient classes only; and
- requested and returned model identifiers plus token/cost evidence recorded.

Auth/permission, invalid request, context-policy, safety, schema, cost, unsupported model, or model-drift failures are not retried. Current Stage 4 never retries through another Provider/model.

## 5. Current Stage 4 use-case contracts

### 5.1 SEO content Draft

Allowed input: selected Draft text, approved page intent/keyword metadata, verified/supplied facts, approved internal-link candidates.  
Allowed output: Draft title, meta description, outline, narrative Blocks, internal-link suggestions.  
Forbidden: route, Canonical, intent owner, Redirect, Publish, Index, structured factual data, or eligibility mutation.

### 5.2 Fabric Knowledge Draft

Allowed input: selected approved editorial sources, Taxonomy/Application terms, verified/supplied facts.  
Allowed output: article outline and allowlisted narrative Blocks.  
Forbidden: invented specifications, facility facts, partner ownership, unsupported claims, external retrieval, or direct publication.

### 5.3 Product description Draft

Allowed input: current Product Draft plus explicitly selected supplied/verified fields and relationships.  
Allowed output: name, summary, description, feature, FAQ, Alt Text, Caption, and Block candidates.  
Forbidden: Product Code, composition, GSM, Width, MOQ, lead time, inventory, certification/test/performance values, category/application authority mutation, rights, route, Publish, or Index.

### 5.4 Sourcing guide Draft

Allowed input: selected approved editorial text and current verified Company Facts.  
Allowed output: guide outline and allowlisted narrative Blocks.  
Forbidden: unverified company history, facilities, capacity, equipment, employees, certifications, customers, factory ownership, remote retrieval, or direct publication.

## 6. Authorized sequential implementation

The phases below are sequential. No phase starts on plan approval alone.

### Phase A — Migration design, Candidate, and integration

1. Produce the exact `0020_phase1b_ai_foundation` Schema proposal.
2. Review database constraints, foreign keys, indexes, lifecycle, lease, optimistic concurrency, and Audit transaction boundaries.
3. Define Fresh, Upgrade, repeat/no-op, rollback compatibility, and query-plan evidence.
4. Receive independent Migration-design approval before generating the Migration.

Current progress: the exact Schema design and exact nine-file `0020` Migration Candidate passed their independent reviews. Integration management preserved the Candidate through a non-fast-forward merge, incorporated the exact review evidence, issued the L-01 oracle Erratum, and prepared the Phase A Integration Candidate. Exit still requires an independent Phase A Completion Review. No Provider call and no automatic Phase B start.

### Phase B — Provider-neutral foundation

1. Add CWT AI contracts, use-case registry, context policy, configuration resolver, Prompt Registry loader, output schemas, and fake adapter.
2. Add static dependency enforcement against direct Provider imports/models/endpoints.
3. Implement disabled/missing configuration and manual-editor degradation first.
4. Prove model/config switching with approved fake adapters without business-code changes.
5. Prove a test-only Synthetic application class can reuse the same configuration, Prompt, run, and typed-result lifecycle without changing the core AI Service Layer; keep every `customer_support` key absent from the Production registry.

Exit: all Provider-neutral tests pass; no DeepSeek credential or network.

### Phase C — Durable run and Worker boundary

1. Implement the canonical `pending`/`processing`/`draft_ready`/`failed`/`cancelled` lifecycle, claim/lease, separate retry state, cancellation fence, response-loss, idempotency, timing, token/cost, Provider response, and disposition/evaluation behavior.
2. Keep Provider calls outside business transactions.
3. Prove bounded text concurrency `2` and safe shutdown/recovery.
4. Prove required Audit atomicity for configuration changes and accepted Draft mutations.

Exit: fake-adapter PostgreSQL suite passes.

### Phase D — DeepSeek text adapter

1. Implement only in its later sequential phase; development authorization exists, but this Phase A integration task does not start it.
2. Use the approved endpoint/model/parameter/timeout/retry/data policy.
3. Normalize every Provider result/failure; reject unknown model or usage behavior.
4. Run authorized Synthetic contract/evaluation fixtures only.

Exit: DeepSeek contract tests and redacted evidence pass; no formal/private data.

### Phase E — Four use-case integrations

For each use case:

1. add explicit authorized enqueue action;
2. build allowlisted context;
3. render the versioned Prompt;
4. show pending/processing/draft-ready/failed/cancelled state and safe retry/cancellation feedback;
5. present candidate and before/after Diff;
6. support Block accept/reject/lock/Undo as applicable; and
7. save only through the existing Draft/Revision Domain Service.

No shared integration may broaden another use case's context or output contract.

### Phase F — Protected Staging validation

1. Deploy only under a separate Provider-call and Staging authorization to the isolated, access-protected, noindex, Synthetic-only environment.
2. Validate approved DeepSeek API behavior and normalized failures.
3. Validate Admin, Product Editor, Content Editor, Reviewer/Publisher, unrelated-role, and anonymous permissions.
4. Validate redacted provenance/logs, lifecycle, retry, cancellation, Provider status, token/cost, and quality evaluation.
5. Validate the `draft_ready`→Editor Diff/edit→Draft→review→Publish flow and independent Index control using Synthetic content only.
6. Prove Staging cannot access or mutate Production data, SEO content, credentials, or public state.

Exit: independent Staging PASS. This is not Production authorization.

### Phase G — Independent review and freeze

1. Developer produces Candidate and complete implementation report.
2. Independent Reviewer audits architecture, security/privacy, Schema, concurrency, output policy, and regression risk.
3. Developer remediates accepted findings; Reviewer rechecks exact Candidate.
4. Fresh Acceptance runs from a clean independent checkout with no Developer environment reuse.
5. Version Manager verifies Candidate identity, clean state, report hashes, locks/writers, and complete gates.
6. Only the Owner may accept the Stage 4A checkpoint; Push, Deploy, Publish, Index, and formal import remain separately prohibited.

## 7. Verification matrix

### Architecture and configuration

- business modules cannot import Provider adapters/SDKs or contain concrete model names/endpoints;
- every use case resolves configuration through `ai_model_config`;
- a test-only application class extends the standard lifecycle without core-service changes, while current Production registration remains limited to the four Draft-assistance use cases and rejects `customer_support`;
- configuration switch affects new runs only;
- no current fallback can be configured or dispatched;
- disabled/no-default/unknown Provider/model/use case fails closed;
- stale config updates fail without losing the newer value;
- required Audit failure rolls back configuration mutation.

### Roles and business acceptance

- Admin can manage model configuration, activate/rollback reviewed Prompt versions, inspect redacted AI logs, and use the existing review/Publish workflow;
- Product Editor and Content Editor can invoke only resource-scoped approved use cases, edit Draft, and submit review;
- Editors cannot manage model/Prompt configuration, inspect unrelated runs, Publish, or Index;
- Reviewer/Publisher can review/publish under existing authority but gains no model/Prompt management merely from that role;
- AI output reaches `draft_ready` only and no automated path changes Production SEO/public content;
- Publish and Index remain independent;
- every run contains task, operator, Provider, requested/returned Model, Prompt version/hash, generation time, and output association; and
- disposition, optional rating/labels/comment, evaluator, time, and linked Draft/Revision support later human quality analysis without sending feedback to the Provider.

### Prompt

- no Prompt text is embedded in business-feature modules;
- exact Prompt ID/version/hash is retained in every run;
- missing/extra/oversized variables and unsupported versions fail;
- Provider envelope cannot add tools, retrieval, or broader context;
- referenced versions cannot be removed or silently modified.

### Context and RAG exclusion

- only explicit, structured, or operator-selected allowlisted sources serialize;
- null/unknown facts remain absent;
- Inquiry/CRM/customer/private/PII/Secret/Object-Key data is structurally unavailable;
- arbitrary documents and URLs cannot be supplied;
- repository/schema/dependency tests prove no knowledge-base, chunk, embedding, vector, similarity-retrieval, automatic-retrieval, or vision implementation exists.

### Lifecycle and exception handling

- only `pending`, `processing`, `draft_ready`, `failed`, and `cancelled` are valid statuses;
- retry state, attempts/backoff, cancellation actor/reason/time, typed error, and normalized Provider response status are retained separately;
- retry exhaustion maps to `failed`, not a second `dead` status;
- a late response after cancellation cannot store or expose a candidate; and
- retry never switches Provider/model because fallback is absent.

### Provider and output

- timeout, connection reset, approved 408/429/5xx, quota, auth, safety, malformed/empty/truncated JSON, unknown keys, invalid enums, forbidden facts, unknown Blocks, and model drift map to typed safe outcomes;
- JSON is locally schema-validated;
- no silent model substitution or fallback occurs;
- token, cost, start/end/duration, Provider/model, Prompt, attempts, and output association are complete;
- logs and errors contain no Prompt payload, selected protected content, Secrets, headers, or private URLs.

### Draft/public boundary

- AI never mutates Product facts, Company Facts, routes, rights, Publish, Index, or public state;
- human acceptance rechecks permission, expected Draft version, factual denylist, lock state, and output schema;
- stale/locked Draft fails without overwriting current work;
- provider failure never reverses Product Import or ordinary Draft save;
- manual editing and existing public reads work with AI entirely disabled.

### PostgreSQL and operations

- Fresh `0000→0020`, Upgrade `0019→0020`, repeat/no-op, constraint catalog, and query plans pass;
- concurrent workers cannot claim the same active run;
- expired leases recover without duplicate accepted output;
- retry and response loss do not duplicate a run or Draft mutation;
- text concurrency `2` fits the target non-Production resource envelope;
- application and Provider cost stops agree or fail closed.

### Staging and portability

- isolated Synthetic-only Staging passes API, role, logging/provenance, lifecycle, and Draft/review/Publish checks before any Production decision;
- Staging has no Production data, credentials, SEO/public write path, or Index authority;
- configuration switches between approved fake Providers/models for new runs without Product/Content/SEO code changes; and
- Staging PASS never enables Production automatically.

## 8. Roles and evidence separation

| Role | Responsibility | Must not rely on |
|---|---|---|
| Project Coordinator | Scope, gates, task order, identity and evidence inventory. | Developer self-acceptance. |
| Provider Security/Privacy Reviewer | PD-04–PD-10 evidence and data boundary. | Marketing claims or unverified assumptions. |
| Migration Reviewer | Exact `0020` Fresh/Upgrade/repeat/constraint/query-plan design. | Generated Migration alone. |
| Developer | Bounded implementation after PD-12. | Authority to approve own Candidate. |
| Independent Reviewer | Code/Schema/security/concurrency/root-cause review. | Developer environment or mutable report identity. |
| Fresh Acceptance | Clean checkout, full applicable gates, exact Candidate. | Prior build/cache/database state. |
| Version Manager | Candidate/report identity, clean state, lock/writer/occupancy and checkpoint evidence. | Functional review substitution. |
| Project Owner | Design freeze, budget/security decisions, development authorization, Staging/Production decisions, and Stage acceptance. | Implied authorization from technical completion. |

Stage 4A product permissions remain distinct from implementation roles: Admin manages configuration/Prompt selection/log access and governed Publish; Product Editor and Content Editor use AI within record scope, edit Draft, and submit review; Reviewer/Publisher retains the existing review/Publish boundary. Editors cannot configure models/Prompts or directly Publish AI output.

Required terminal evidence for each implementation role includes conclusion, complete Candidate SHA, findings, report path/SHA, HEAD/branch/detached/clean state, Git locks/writers, worktree occupancy, and prohibited external-action boundary.

## 9. Stop conditions

Stop and return to the Owner if:

- any change would exceed the Owner-accepted supplier-risk/data boundary, or any cost condition cannot fail closed;
- implementation requires business code to know a Provider/model;
- a second AI queue/history or Prompt authority appears;
- fallback, visual AI, AI Customer Service, RAG, automatic retrieval, arbitrary document/URL input, or any other unapproved use case enters scope;
- private/customer/PII/Secret data can enter context, logs, or Provider payload;
- Provider output can mutate facts, routes, rights, Publish, Index, or public state;
- Prompt, Provider/model, token/cost, timing, output association, or failure provenance is incomplete;
- role enforcement, canonical lifecycle, Provider response evidence, cancellation fencing, or quality-evaluation traceability diverges from `DF-01`–`DF-04`;
- worker claim/retry can duplicate an accepted Draft mutation;
- Migration Fresh/Upgrade/repeat or real PostgreSQL concurrency evidence fails;
- a required Audit can fail after its governed mutation commits;
- manual editing or existing public behavior depends on AI availability; or
- any task attempts Push, Deploy, formal import, Publish, or Index without separate authorization.

## 10. Rollback and operational recovery

The global AI feature and every model configuration default disabled. Enabling is a later controlled step after acceptance.

Operational rollback:

1. disable the active configuration and global feature;
2. stop new Worker claims;
3. allow in-flight work to finish only as unaccepted output or typed failure;
4. retain configuration and run evidence;
5. keep manual editing and all non-AI paths available; and
6. if necessary, restore the previous approved default for new runs without rewriting history.

Code rollback must remain compatible with applied `ai_model_config` and `ai_runs` records. Rollback never deletes run history, requeues completed work, or reverses an independently committed Product/Content Draft.

## 11. Planned deliverables after authorization

- reviewed `0020_phase1b_ai_foundation` design and Migration evidence;
- Provider-neutral contracts and architecture dependency gate;
- `ai_model_config` Domain Service/Admin boundary;
- versioned Prompt Registry and four Prompt templates;
- single `ai_runs` service/Worker/provenance flow;
- DeepSeek text adapter and Provider contract evidence;
- four bounded use-case integrations;
- complete automated/PostgreSQL/browser/target-pressure evidence;
- protected Synthetic-only Staging validation report covering API, roles, logs, lifecycle, and Draft/review/Publish;
- independent Security/Privacy and code review reports;
- Fresh Acceptance report; and
- Version Manager checkpoint report.

No P1-02B, AI Customer Service, RAG, Deploy, formal-data, Publish, or Index artifact is a deliverable of this plan.

## 12. Next approval checkpoints

The design freeze is confirmed. Remaining decisions stay separate:

1. **Phase A Completion Review:** independently review the exact Integration Candidate, preserved Candidate identity, reports/evidence, Erratum, history integrity, and verification results. Do not start Phase B before this gate.
2. **Provider evidence reference:** preserve and assess any Provider response without treating acknowledgment, silence, marketing language, or a generic consumer policy as resolution or automatic authority.
3. **Later development phases:** proceed sequentially only after each preceding independent gate; this plan does not let an Integration Manager self-accept their own Candidate.
4. **Staging authorization and acceptance:** separately authorize the first external Staging deployment/Provider call, then decide on the resulting independent evidence.
5. **Production budget and enablement decision:** redesign the Production budget using actual approved use cases and Staging evidence; Production remains separate from Staging PASS and from Publish/Index authority.

The Owner has granted P1-02A development authorization. The current Integration Manager may prepare only the Phase A Integration Candidate and must stop for independent Phase A Completion Review.

Current design-freeze status: **PASS / `DF-01`–`DF-06` CLOSED**  
Current PD-04–PD-07 status: **NON-BLOCKING REFERENCE / PROVIDER RESPONSE PENDING**  
Current PD-08/PD-10 status: **REFERENCE / LIVE PROVIDER EVIDENCE AND EXTERNAL ACTION DEFERRED**  
Current PD-09/PD-11 status: **CLOSED AS BUDGET DESIGN / CONTRACT**  
Current PD-12 status: **CLOSED — OWNER DEVELOPMENT AUTHORIZATION RECORDED**  
Current P1-02A status: **DEVELOPMENT AUTHORIZED / PHASE A INTEGRATION CANDIDATE PREPARED / COMPLETION REVIEW PENDING**  
Current P1-02B status: **DEFERRED / OUTSIDE CURRENT STAGE 4**  
Current complete-RAG status: **NOT AUTHORIZED / FUTURE ADR REQUIRED**  
Future AI Customer Service status: **EXTENSION BOUNDARY RESERVED / CURRENT DEVELOPMENT NOT AUTHORIZED**
