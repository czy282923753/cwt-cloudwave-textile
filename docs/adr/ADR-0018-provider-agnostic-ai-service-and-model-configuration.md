# ADR-0018: Provider-Agnostic AI Service and Model Configuration

Status: **Accepted by the project owner for Phase 1B Stage 4 architecture on 2026-08-10. P1-02A development is authorized by a separate Owner decision; this ADR alone grants no external-action authority.**

Decision source: the project owner's final decisions after review of `CWT Phase 1B Stage 4 AI Entry Decision Package V2.0`, the proposed ADR-0018, the CWT RAG capability audit, and the [Stage 4A Pre-Development Final Review](../PHASE_1B_STAGE4A_PRE_DEVELOPMENT_FINAL_REVIEW.md).  
Frozen input baseline: `31c0e405acfdd0d05200d0fb2531e897a541a2c4`  
Frozen tag preserved: `phase-1b-stage3-approved-2026-08-09`

This is a post-Stage-3 architecture decision. It does not move or rewrite the frozen commit or tag. ADR acceptance originally approved architecture and planning only. The later [Stage 4A Owner Development Authorization](../PHASE_1B_STAGE4A_OWNER_DEVELOPMENT_AUTHORIZATION_V1_0.md) authorizes bounded P1-02A development and `0020` Phase A work without changing this ADR. Provider configuration/calls, credentials, Staging/Production deployment, Production AI, Deploy, formal data import, Publish, and Index remain separately unauthorized.

## Context

ADR-0017 established the cloud-only, Draft-only, single-`ai_runs` work/provenance boundary. It also prohibited customer/private data, factual/public-state authority, a second AI queue, and direct AI mutation of Product, Content, Asset, Revision, Publish, Index, Route, or rights state.

The Stage 4 entry review selected DeepSeek as the initial text Provider but identified two architecture risks:

1. binding business modules directly to DeepSeek would make later Provider replacement expensive and unsafe; and
2. model, parameter, Prompt, run provenance, and enablement decisions need explicit authorities rather than hardcoded strings or environment-only switches.

A read-only RAG audit of the frozen baseline found **Level 0 / Not Implemented**:

- no `ai_knowledge_base`;
- no document chunking;
- no embedding generation;
- no `pgvector` or other vector database;
- no vector-similarity retrieval interface; and
- no AI generation flow that automatically retrieves knowledge.

The owner accepted that audit and decided that current Stage 4 will not implement complete RAG. Current AI context is limited to explicit input, structured business data, and data deliberately selected by an authorized operator.

## Decision

### 1. One Provider-agnostic AI Service Layer

Every AI call passes through one CWT-owned AI Service Layer. Product, Content, SEO, Import, Admin UI, Server Actions, and other business modules must not:

- import a Provider SDK or Provider adapter;
- construct a Provider endpoint or authentication request;
- send Provider-specific request DTOs;
- inspect Provider-specific response or error DTOs; or
- name a concrete Provider or model in business behavior.

Business modules call only versioned, Provider-neutral CWT contracts. The AI Service Layer owns:

- authorization and record-scope rechecks;
- use-case, feature-state, context, factual-field, token, cost, and concurrency policy;
- active model-configuration resolution;
- Prompt version resolution and bounded variable rendering;
- creation and lifecycle of the single `ai_runs` work/provenance record;
- dispatch to an approved capability adapter;
- response and failure normalization;
- strict local output-schema and CWT policy validation; and
- return of typed Draft proposals only.

Provider SDK types terminate inside the adapter. Supporting a new Provider requires a new reviewed adapter and Provider policy, but switching among already supported and approved configurations must not require changes to Product, Content, SEO, or other business-feature code.

### 2. Capability-specific Provider interfaces

Provider abstraction is capability-specific rather than one unbounded `generate(any)` interface.

- `TextAiProvider` is the only capability in current Stage 4 P1-02A.
- Any future visual capability must use a separate `VisionAiProvider` contract under P1-02B.

DeepSeek V4 Flash is registered only as a text model. Protocol compatibility with another API is not evidence that an unsupported capability exists.

P1-02B visual AI is outside current Stage 4. Current Stage 4 must not implement a visual adapter, select a visual Provider/model, send Asset bytes to a model, add image Prompt templates, or call a visual endpoint. P1-02B requires a later evaluation and separate authorization.

#### Application-extensible use-case boundary

The AI Service Layer orchestration contract is application-neutral and keyed by a stable `use_case`. A compiled, reviewed use-case registry maps each active use case to:

- an application class;
- an AI capability;
- authorization and context policies;
- Prompt and output-schema identities;
- result/disposition rules; and
- the application-owned target association.

The four current text use cases belong to the `draft_assistance` application class. The architecture reserves `customer_support` as a future application class, but does not register or enable a Customer Service use case in current Stage 4.

A future Customer Service application is added through new reviewed use-case definitions, context/authorization policies, Prompt/output schemas, model configurations, and an application integration. It must not require changes to the core AI Service Layer orchestration contract, Provider adapter contract, configuration resolution, Prompt resolution, or `ai_runs` lifecycle. Application-specific actions remain outside the AI Service Layer; a generated answer cannot itself send a message, update CRM/Inquiry state, or create another business side effect.

Customer Service may introduce customer conversations, PII, private Inquiry/CRM data, retrieval, tools, retention, escalation, or outbound communication risks that are prohibited in current Stage 4. Enabling any such capability requires a separate owner-approved architecture task and security/privacy decision covering record-scoped authorization, allowed data sources, consent/disclosure, retention/deletion, human escalation, Prompt Injection defense, tool and send authority, Audit, region/Provider policy, and failure recovery.

Current Stage 4 adds no `customer_support` configuration, Prompt, table, conversation state, route, UI, workflow, Provider call, or customer-data access.

### 3. `ai_model_config` model-configuration authority

The physical table name is `ai_model_config`. It is the authority for selectable model configuration; it is not a queue, run history, Prompt store, or content authority. `ai_runs` remains the only AI work lifecycle and provenance authority.

Minimum reviewed design fields:

| Field | Purpose |
|---|---|
| `id` | UUID primary key. |
| `capability` | Check-constrained capability; current Stage 4 permits `text` only. |
| `use_case` | Stable bounded key validated against the compiled, reviewed use-case registry; current Stage 4 permits only the four approved Draft-assistance cases. |
| `provider` | Stable key resolved only through the compiled, allowlisted adapter registry. |
| `model` | Provider model identifier, such as `deepseek-v4-flash`. |
| `parameters_json` | Bounded JSON validated by the selected adapter's allowlisted parameter schema. |
| `prompt_id` / `prompt_version` | Reference to one reviewed immutable Prompt Registry version approved for the use case; the Prompt body is not stored here. |
| `enabled` | Whether new runs may resolve the configuration; defaults false. |
| `is_default` | Whether this is the default for its capability/use-case pair. |
| `fallback_config_id` | Nullable reserved self-reference for a future separately authorized fallback feature. |
| `record_version` | Optimistic concurrency version for every mutation. |
| `created_by_user_id` / `updated_by_user_id` | Authorized operator evidence. |
| `created_at` / `updated_at` | Lifecycle evidence. |

Current use cases are exactly:

1. `seo_content_draft`;
2. `fabric_knowledge_draft`;
3. `product_description_draft`; and
4. `sourcing_guide_draft`.

Required constraints and Domain Service invariants:

- at most one enabled default per capability/use-case pair;
- every use case is present in the compiled registry and its application class, capability, authorization/context policy, Prompt, output schema, and result rules agree;
- a resolved configuration must be enabled and backed by a compiled, approved adapter and Provider policy;
- Provider, model, capability, and use-case identifiers are non-empty, bounded, and normalized;
- parameters pass a Provider/model-specific allowlist; unknown keys fail closed;
- the selected Prompt ID/version exists, is immutable, matches the use case/capability, and passes its content-hash check;
- API keys, Secrets, raw headers, arbitrary endpoints, Prompt bodies, tools, private URLs, customer data, and Object Keys are forbidden in `parameters_json`;
- configuration mutation and its required Audit commit atomically;
- required Audit failure rolls the mutation back;
- optimistic concurrency prevents a stale operator from overwriting a newer selection;
- configurations referenced by historical runs are disabled rather than deleted;
- a switch affects new runs only; claimed, in-flight, and historical runs keep immutable resolved snapshots; and
- ordinary content editors cannot override Provider, model, or parameters per request.

The initial logical configuration contains one disabled-first row per approved text use case:

| Capability | Use case | Provider | Model | Prompt | Default | Enabled before entry gates |
|---|---|---|---|---|---|---|
| `text` | `seo_content_draft` | `deepseek` | `deepseek-v4-flash` | `seo-content-draft@1` | Yes | No |
| `text` | `fabric_knowledge_draft` | `deepseek` | `deepseek-v4-flash` | `fabric-knowledge-draft@1` | Yes | No |
| `text` | `product_description_draft` | `deepseek` | `deepseek-v4-flash` | `product-description-draft@1` | Yes | No |
| `text` | `sourcing_guide_draft` | `deepseek` | `deepseek-v4-flash` | `sourcing-guide-draft@1` | Yes | No |

No row is created or enabled by this ADR.

### 4. Fallback is reserved but disabled

Current Stage 4 does not implement or enable runtime fallback. Every initial `fallback_config_id` is null, and the AI Service Layer must reject non-null fallback configuration during P1-02A.

The nullable relation reserves an explainable extension point without creating active routing, retry-to-another-Provider, fallback-chain, or cross-region behavior. Enabling fallback later requires a separate owner decision that defines:

- allowed failure classes;
- same- or cross-Provider rules;
- region, privacy, retention/training, and data-transfer approval for every fallback;
- cost ceilings;
- maximum depth and cycle prevention;
- actual-Provider provenance; and
- tests proving fallback cannot bypass authorization, safety, budget, or data policy.

Current Provider failure produces a typed `failed` `ai_run` or an approved retry on the same run; it never dispatches to another Provider/model. Manual editing remains available.

### 5. Versioned Prompt Registry

Prompt text must not be distributed through business-code string literals. Current Stage 4 uses a dedicated, versioned Prompt Registry implemented as reviewed immutable repository resources, not a live database Prompt corpus.

Each Prompt template has:

- stable Prompt ID and immutable version;
- applicable capability and use case;
- Provider-neutral CWT instructions;
- an allowlist of variables with types and maximum sizes;
- input and output schema versions;
- factual-field denylist and Block allowlist references where applicable;
- locale and content-policy metadata; and
- a content hash.

A separately versioned Provider envelope may satisfy protocol-specific formatting requirements, but it cannot broaden context, add tools, change the CWT task, or weaken local validation. `ai_runs` records the CWT Prompt ID/version/hash and Provider-envelope version/hash used for every attempt.

Unknown Prompt IDs, missing or extra variables, oversized values, unsupported versions, and hash mismatches fail closed. Prompt resources never contain Secrets, private/customer data, formal facts, private Asset locations, or arbitrary remote content.

Stage 4A Admin Prompt management is limited to inspecting the registry and selecting, activating, disabling, or rolling back among repository-reviewed immutable Prompt versions through the authorized configuration Domain Service with required Audit. Live free-form Prompt-body editing is not approved. A Prompt-body change creates a new reviewed repository version; ordinary Editors cannot manage or select Prompt versions.

### 6. `ai_runs` is the single AI call record and work authority

`ai_runs` remains the only durable AI work lifecycle and provenance source. There is no separate AI queue plus history table and no Provider dashboard as the authoritative record.

Every run must retain at least:

- task/use-case type;
- actor and target Draft/entity identity;
- request/idempotency identity;
- selected `ai_model_config` identity and immutable configuration snapshot;
- actual Provider and requested/returned model identifiers;
- Prompt ID, version, and hash;
- bounded, sanitized input source references and input hash;
- input, output, and total token usage when reported;
- estimated and actual cost evidence under the approved policy;
- queued, generation-started, generated/completed timestamps and execution duration;
- canonical status, attempt, retry state/backoff, cancellation, claim/lease, typed failure, and normalized Provider response-status evidence;
- normalized, schema-validated candidate output or protected output reference; and
- human disposition, bounded optional quality rating/labels/comment, evaluator/time, and linked ordinary Draft/Editorial Revision when a human saves a proposal.

The target and output association are application-neutral identifiers with reviewed type constraints. Current Stage 4 permits only Product/Content Draft and Editorial Revision associations. A future `customer_support` application may add its own reviewed association type without creating a second AI run/history authority or changing historical runs.

Raw credentials, Authorization headers, private URLs, Object Keys, private/customer content, and unbounded Prompt/result logs are prohibited.

### 7. Initial text Provider and model

Current Stage 4 text defaults are:

- Provider: DeepSeek API;
- adapter key: `deepseek`;
- model: `deepseek-v4-flash`; and
- current intended endpoint family: an approved DeepSeek text endpoint behind the adapter.

DeepSeek is the initial default, not a business-domain dependency. Future approved adapters may support OpenAI GPT, Anthropic Claude, Google Gemini, Qwen, or other models. Switching to an already implemented and approved adapter/model occurs through `ai_model_config` and must not change business-feature code.

Initial DeepSeek parameter policy is proposed by the pre-development plan and remains subject to Provider contract and security review. Valid JSON is never treated as schema-valid by itself; every response remains untrusted and passes strict local validation.

### 8. Explicit context only; complete RAG excluded

Current Stage 4 inputs are limited to:

- data explicitly supplied for the current task;
- allowlisted structured business data; and
- data deliberately selected by an authorized operator.

The context builder records source type, source identity where safe, selected fields, provenance status, actor, and input hash. Unknown values remain absent. Supplied facts are not upgraded to verified facts by AI.

Current Stage 4 must not add or simulate:

- `ai_knowledge_base`;
- automatic document ingestion or parsing for AI;
- chunking or chunk-version lifecycle;
- embedding generation;
- `pgvector` or another vector database;
- vector-similarity or semantic retrieval;
- automatic knowledge retrieval before generation; or
- private Inquiry/CRM/customer knowledge ingestion.

Complete RAG is a future independent architecture task and requires its own ADR. That ADR must cover Knowledge Source, data permission, document parsing, chunk strategy and versioning, embedding model, vector storage, retrieval, citation/provenance, Prompt Injection protection, private Inquiry isolation, cost control, and backup/restore.

### 9. DeepSeek supplier-evidence disposition

The original pre-development review treated the following DeepSeek evidence as blocking:

1. whether API inputs and outputs are used for model training or service improvement, including the applicable opt-out or contract;
2. processing and storage region, including any Singapore-to-provider cross-border transfer;
3. default and optional cache behavior, cache persistence, and whether it can be disabled or bounded; and
4. enterprise data-security policy, including access control, transport protection, retention/deletion, incident handling, subprocessors/terms, and account/project isolation relevant to CWT.

Those evidence gaps remain accurate historical supplier-risk findings. The Owner later cancelled DeepSeek enterprise-evidence review as a prerequisite for Stage 4A development, testing, and later release workflow, reclassified `PD-04` through `PD-07` as non-blocking references, and accepted the incomplete supplier-information risk for the frozen public-company, Product-structured, Fabric Knowledge, and explicit-human-input Draft-assistance scope.

The accepted risk does not broaden the data boundary or relax Provider-agnostic contracts, strict local validation, redaction, Draft-only handling, human review, disabled fallback, no-RAG/no-vision/no-customer-support scope, cost controls, or Publish/Index separation. Provider evidence may continue to be collected as reference material without automatically restoring a blocking gate.

No real DeepSeek input, credential, account mutation, or API call is authorized by this ADR.

### 10. Stage 4A pre-development design freeze

The owner-approved [Stage 4A Pre-Development Final Review](../PHASE_1B_STAGE4A_PRE_DEVELOPMENT_FINAL_REVIEW.md) freezes the following boundaries before `PD-04` through `PD-11`:

#### Draft, review, Publish, and SEO

- AI produces a protected Draft-scoped candidate only; no successful AI-content state exists outside the Draft boundary.
- A validated candidate reaches `draft_ready`; an authorized Editor reviews the Diff and accepts/edits it into the existing Draft/Editorial Revision.
- Human review and Publish use the existing Reviewer/Publisher or Admin workflow.
- AI cannot directly or automatically change Production SEO/public content, routes, Canonical, Sitemap, Publish, Index, or eligibility.
- Publish and Index remain independent controls.

#### Data access

Current Stage 4A may use only deliberately selected verified Company Facts/approved public company content, actor-authorized allowlisted Product structured data, actor-authorized Fabric Knowledge content, and bounded explicit operator input. Explicit input does not bypass authorization, factual, privacy, file, or size policy.

Private customer Inquiry data, Contact/Organization/CRM data, PII, unauthorized internal or sensitive business material, unreviewed files, arbitrary URLs, and automatic retrieval are prohibited. Future Customer Service or RAG requires a new data-permission design and separate approval.

#### Roles

- Admin manages model configuration, reviewed Prompt-version activation/rollback, redacted AI logs, and content review/Publish under existing governance.
- Product Editor and Content Editor may invoke approved use cases within their existing resource scope, edit Drafts, inspect authorized run status, and submit review.
- Editors cannot manage model configuration or Prompt versions and cannot Publish or Index AI-generated content.
- Reviewer/Publisher retains the existing human review/Publish boundary; publisher status alone does not grant model/Prompt management.
- Every action is re-authorized by a Domain Service; UI visibility is not authority.

#### Canonical run lifecycle and errors

Current Stage 4A uses exactly `pending`, `processing`, `draft_ready`, `failed`, and `cancelled` as `ai_runs.status` values. `draft_ready` replaces the earlier generic `succeeded` term. Retry exhaustion is represented as `failed` plus `retry_state=exhausted`; `dead` is not an additional AI Run status.

Allowed lifecycle transitions are:

```text
pending -> processing | cancelled
processing -> draft_ready | failed | cancelled | pending
failed -> pending   # authorized manual retry only
```

Retry status is recorded separately as none, scheduled, exhausted, or not retryable. Errors retain typed sanitized reason, attempt/retry evidence, normalized Provider response status, and safe Provider error/request identifiers. A late response after cancellation cannot become a Draft candidate.

#### Quality evaluation

Every run retains task, operator, Provider, requested/returned Model, Prompt version/hash, generation time, output association, and human disposition. Stage 4A also supports an optional bounded `1–5` human rating, allowlisted quality labels, sanitized comment, evaluator, and evaluation time in the single `ai_runs` authority. Feedback is not automatically sent to a Provider or used for Provider training.

#### Staging and model portability

After separate Provider-call and Staging authorization, the first external validation occurs in isolated, noindex, Synthetic-only Staging. It must validate API behavior, the complete role matrix, provenance/redaction, lifecycle/retry/cancellation, and the Draft→review→Publish boundary. Staging PASS does not authorize Production.

DeepSeek / `deepseek-v4-flash` remains the initial text default. Switching to an already implemented and approved GPT, Claude, or another Provider/model occurs through configuration and adapters without changes to Product, Content, SEO, Draft, review, or publishing code.

## Runtime flow

```text
Authorized business Domain Service
  -> Provider-neutral AI Service Layer
  -> use-case + authorization + context + budget policy
  -> ai_model_config resolution
  -> Prompt Registry resolution
  -> ai_runs (single work + provenance authority)
  -> Worker claim
  -> TextAiProvider adapter
  -> DeepSeek V4 Flash (initial default, only after all gates)
  -> normalized untrusted response
  -> strict CWT schema + factual/security validation
  -> ai_runs.draft_ready candidate result
  -> human Diff / accept / reject / lock / Undo
  -> ordinary Draft or Editorial Revision only
```

No Provider call occurs inside a Product, Content, Import, Asset, Revision, Publish, or Index transaction. No retrieval or vision step exists in current Stage 4.

## Schema / Migration impact

Under the later P1-02A development authorization, the reviewed forward Migration previously planned as `0020_phase1b_ai_runs` is revised to `0020_phase1b_ai_foundation` and may create only:

1. `ai_model_config`, as the configuration authority described above; and
2. `ai_runs`, as the single work/provenance authority described by ADR-0017 and this ADR.

`ai_runs` references the selected configuration but also stores immutable Provider/model/Prompt/policy snapshots so later configuration changes cannot rewrite historical meaning. Its reviewed design uses the five canonical lifecycle statuses, separate retry/cancellation and Provider-response evidence, and bounded human quality-evaluation fields defined above.

The Migration requires independent review of exact columns, partial unique indexes, Checks, foreign keys, delete behavior, optimistic concurrency, lease/retry constraints, Fresh `0000→0020`, Upgrade `0019→0020`, repeat/no-op behavior, rollback compatibility, and real PostgreSQL query plans.

No existing row is backfilled. Historical Migrations, snapshots, and Journal entries remain immutable. No knowledge-base, chunk, embedding, vector, visual-AI, Customer Service/conversation, Prompt-database, second queue/history, AI Draft/Revision, private-file relation, Publish, or Index table/field is added.

## Complexity approval

The owner accepts the following complexity explanation.

### Why existing mechanisms are insufficient

`system_settings` is a generic key/JSON value store. It cannot safely enforce one enabled default per capability/use case, stable configuration identity, optimistic concurrency, model-specific bounded parameters, or immutable `ai_runs` provenance without moving critical authority into unstructured application-only checks.

Environment variables alone require a deployment for every switch and lack record identity and atomic operator/Audit evidence. `feature_flags` can disable the overall feature but cannot represent multiple Provider/model/use-case configurations.

### Reuse and simplification

The design reuses:

- `ai_runs` for work and provenance;
- existing Audit for configuration and accepted-Draft mutations;
- existing feature flags for the global kill switch;
- existing Editorial Revision for accepted content; and
- existing Product, Content, SEO, Company Fact, and authorization authorities for explicit context.

Only one configuration relation is new. There is no RAG state, visual state, fallback runtime, second queue, new Revision authority, or live Prompt database in current Stage 4.

### Replaced mechanism and removed code

AI is not implemented, so no legacy Provider path is retained. The AI Service Layer is the only permitted path from the first implementation commit. Any direct-Provider spike must remain isolated test evidence and be removed before Candidate review. No direct/Service dual path is permitted.

### New states and failure modes

The configuration authority adds enabled/disabled and default/non-default states. `ai_runs` adds one canonical pending/processing/draft-ready/failed/cancelled lifecycle, with retry state and human disposition kept orthogonal. New failures include missing or disabled configuration, unknown adapter/model/use case, stale version, invalid parameters, Prompt mismatch, Provider drift, cost denial, cancellation/late response, and configuration/Audit failure. All fail before dispatch, schedule an approved retry on the same run, or become typed run failures.

Fallback execution is intentionally absent, eliminating cross-Provider fallback states from P1-02A.

### Operational and maintenance cost

The cost is one indexed configuration resolution per new run, an Admin configuration boundary, permission/Audit checks, versioned Prompt resources, Provider policy/adapter contract tests, and model-drift review. Each future Provider adds its own adapter and external evidence burden.

The benefit exceeds this bounded cost because business behavior remains independent from DeepSeek, switches are auditable and reversible, run provenance remains exact, and future Provider replacement does not create a second business path.

## Security / privacy impact

- Provider credentials are server/Worker-only, environment-specific, redacted, and absent from configuration, runs, logs, and browser payloads.
- Provider selection cannot introduce an arbitrary endpoint or bypass a compiled endpoint/data-policy allowlist.
- Private Inquiry files, Inquiry/Contact/Organization/customer data, PII, Secrets, private storage, Object Keys, and permanent bucket URLs are structurally unavailable to context selection.
- RAG and automatic retrieval are absent; an operator cannot point the model at an arbitrary document or URL.
- Provider responses are untrusted and cannot directly mutate factual fields, routes, rights, Publish, Index, or public state.
- Configuration change, human acceptance into a Draft/Revision, and all governed mutations retain required authorization and atomic Audit behavior.
- DeepSeek remains disabled-first. A live Provider call or Staging/Production enablement requires separate authority even though supplier-evidence review is no longer a blocking prerequisite.

## URL / SEO impact

There is no public URL, Sitemap, Canonical, Redirect, or Index change. Model configuration and AI Run records are private/Admin only. SEO output is a Draft proposal and cannot change intent ownership, route, Canonical, Publish, Index, or real-Product eligibility.

## Compatibility

- Manual editing, Product Import, Asset processing, Revision, Publish, Index, and public reads remain healthy when AI is absent, disabled, misconfigured, or unavailable.
- Provider/model switches affect new runs only.
- Historical runs remain understandable through immutable configuration, Prompt, Provider/model, input, token, cost, timing, and disposition evidence.
- Unsupported Prompt/output/schema versions fail closed.
- Adding a supported Provider changes only adapter/policy/configuration layers, not Product, Content, SEO, or other business-feature contracts.
- Adding a future reviewed `customer_support` application class extends the use-case registry, application policies/schemas/configuration, and Customer Service integration without refactoring the core AI Service Layer or changing existing Draft-assistance behavior.
- Vision and complete RAG remain separate future architecture decisions.

## Alternatives considered

1. **Direct DeepSeek calls from business modules — rejected.** Couples business rules to Provider DTOs, endpoints, errors, and model identity.
2. **One unbounded `generate(any)` interface — rejected.** Erases use-case and capability safety boundaries.
3. **Environment-only Provider/model switching — rejected as sole authority.** Requires deploys and lacks durable configuration identity and Audit.
4. **Store all model configurations in `system_settings` JSON — rejected.** Weakens relational/default/use-case constraints and run provenance.
5. **Enable fallback in the first text Stage — deferred by owner.** Adds routing, privacy, region, cost, and failure complexity before need is proven.
6. **Implement visual AI in current Stage 4 — deferred by owner to P1-02B.** Requires a separate Provider, rights, Asset, template, cost, and review gate.
7. **Implement complete RAG in current Stage 4 — rejected for current scope.** The audited project is Level 0 and the required ingestion, embedding, vector, retrieval, permission, citation, and recovery authorities need a separate ADR.
8. **Live database Prompt editing in current Stage 4 — deferred.** Adds a separate content/version/review authority without current need.

## Rollout

1. Record ADR-0018 and the Stage 4A design freeze as accepted.
2. Record the separate Owner decision that accepts the current supplier-information risk, makes `PD-04` through `PD-07` non-blocking references, and authorizes P1-02A development.
3. Implement each sequential phase only after its preceding independent gate; Phase A covers the disabled-first `0020` foundation and has no Provider call.
4. Keep DeepSeek enterprise evidence as reference material without treating it as an automatic implementation/release blocker.
5. Require a separate authorization before any Provider credential, API call, spend, or protected Staging deployment.
6. Complete the applicable independent review, Fresh Acceptance, and Version Manager gates before any Stage 4 completion claim.
7. Require a separate Owner decision before any Production enablement or deployment.
8. Evaluate P1-02B visual AI, AI Customer Service, or complete RAG only under later, independent decisions.

## Required verification after development is authorized

- static dependency tests prove business modules do not import Provider SDKs/adapters or name models;
- model switches among approved fake adapters require no business-code change;
- a test-only Synthetic application class can reuse configuration, Prompt, run, and typed-result orchestration without changing the core AI Service Layer, while the Production registry rejects every `customer_support` use case in current Stage 4;
- configuration permission, unique default per use case, optimistic concurrency, disable, and Audit rollback tests pass;
- every Stage 4A fallback reference is null and no fallback dispatch path exists;
- Prompt ID/version/hash/variable/size/schema tests and a no-hardcoded-business-Prompt scan pass;
- Admin can select/rollback reviewed immutable Prompt versions; Editors cannot manage model or Prompt configuration;
- every `ai_run` retains task, operator, Provider, requested/returned Model, Prompt, tokens, generation timing, canonical status, retry/cancellation, Provider response status, cost, output association, failure, disposition, and quality-evaluation evidence;
- lifecycle tests permit only `pending`, `processing`, `draft_ready`, `failed`, and `cancelled`, with retry exhaustion represented separately and late responses fenced after cancellation;
- explicit context allowlist and PII/private/Secret/factual-field denial tests pass;
- tests prove no knowledge-base, chunk, embedding, vector, retrieval, or vision path exists;
- DeepSeek timeout, quota, auth, malformed JSON, empty/truncated output, schema mismatch, content rejection, and model drift fail safely;
- `ai_runs` lease/retry/cancel/idempotency/response-loss/concurrency tests pass on real PostgreSQL;
- text concurrency remains bounded at `2` on the approved host envelope;
- human Diff/accept/reject/lock/Undo changes Draft/Revision only; Editor cannot Publish; AI cannot change SEO/public state;
- protected Synthetic Staging validates API, roles, redacted logs/provenance, lifecycle, and Draft/review/Publish behavior before any Production decision; and
- missing/disabled Provider preserves manual editing and all public behavior.

## Rollback

Disable the active text configuration and global AI feature, then stop new AI Worker claims. Do not delete configuration or run records to simulate rollback. Manual editing and all non-AI systems remain available.

A model switch is rolled back by atomically restoring the previous approved default for new runs. Historical runs are not rewritten or replayed. In-flight work remains bound to its resolved configuration and may finish as unaccepted output or fail safely. Application rollback must remain Schema-compatible with existing configuration and run records.

## Relationship to prior decisions

This ADR:

- preserves ADR-0017's single `ai_runs`, cloud-only, Draft-only, privacy, factual, human-review, and no-public-state boundaries;
- supersedes ADR-0017's generic `succeeded`/retry-`dead` terminology for Stage 4A with the five canonical lifecycle statuses and separate retry state defined here;
- adds the `ai_model_config` configuration authority;
- makes the Service Layer Provider-agnostic and use-case aware;
- adds an independently versioned Prompt Registry without a live Prompt database;
- selects DeepSeek / `deepseek-v4-flash` as the initial disabled text default, with supplier evidence retained as non-blocking reference risk;
- disables fallback in current Stage 4 while reserving a future extension point;
- removes P1-02B visual AI from current Stage 4;
- confirms complete RAG is not part of current Stage 4 and requires a future ADR;
- reserves an application-neutral extension boundary for future `customer_support` applications while excluding all AI Customer Service functionality from current Stage 4; and
- freezes the Stage 4A business acceptance, data, role, lifecycle, quality-evaluation, Staging, and model-portability boundaries in `DF-01` through `DF-06`.

## Approval record

Owner architecture decision: **APPROVED — 2026-08-10**  
Complexity approval: **APPROVED — 2026-08-10**  
RAG audit disposition: **ACCEPTED; LEVEL 0; COMPLETE RAG EXCLUDED**  
Current text Provider/model: **DeepSeek API / `deepseek-v4-flash`**  
Fallback: **DISABLED**  
P1-02A text development: **AUTHORIZED BY SEPARATE OWNER DECISION — 2026-08-10**  
P1-02B visual development: **NOT AUTHORIZED / OUTSIDE CURRENT STAGE 4**  
AI Customer Service: **FUTURE EXTENSION BOUNDARY RESERVED / CURRENT DEVELOPMENT NOT AUTHORIZED**  
Stage 4A design freeze (`DF-01`–`DF-06`): **PASS / CONFIRMED — 2026-08-10**  
`PD-04`–`PD-07`: **NON-BLOCKING REFERENCE EVALUATIONS / OWNER-ACCEPTED RISK**  
`PD-08`: **REFERENCE / LIVE ACCOUNT AND API EVIDENCE DEFERRED UNTIL SEPARATELY AUTHORIZED**  
`PD-09`: **CLOSED — OWNER-APPROVED STAGING BUDGET DESIGN**  
`PD-10`: **NO LONGER A PRE-DEVELOPMENT BLOCKING GATE**  
`PD-11`: **CLOSED — CONTRACT ONLY**  
Phase A: **INTEGRATION CANDIDATE PREPARED / INDEPENDENT COMPLETION REVIEW PENDING**  
Deploy/Publish/Index/formal import: **NOT AUTHORIZED**
