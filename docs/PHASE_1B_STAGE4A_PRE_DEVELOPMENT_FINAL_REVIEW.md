# CWT Phase 1B Stage 4A Pre-Development Final Review Confirmation

Status: **PASS — DESIGN BOUNDARIES FROZEN; DEVELOPMENT LATER AUTHORIZED BY OWNER**  
Review version: `1.0`  
Owner confirmation date: `2026-08-10` (Asia/Shanghai)  
Frozen input baseline: `31c0e405acfdd0d05200d0fb2531e897a541a2c4`  
Frozen tag preserved: `phase-1b-stage3-approved-2026-08-09`  
Architecture authority: [ADR-0017](./adr/ADR-0017-ai-run-work-and-provenance-authority.md) and [ADR-0018](./adr/ADR-0018-provider-agnostic-ai-service-and-model-configuration.md)  
Execution plan: [Stage 4A Pre-Development Implementation Plan](./PHASE_1B_STAGE4_PRE_DEVELOPMENT_IMPLEMENTATION_PLAN.md)

## 1. Review conclusion

The six Stage 4A pre-development design boundaries are complete and internally consistent after the lifecycle and permission clarifications in this report.

Conclusion: **PASS for design freeze only.**

This PASS:

- closes design-freeze items `DF-01` through `DF-06`;
- identifies `PD-04` through `PD-11` as the next evidence and independent-review scope;
- does not close any open `PD-04` through `PD-12` gate;
- does not authorize Schema, Migration, product code, Provider credentials, a real API call, Stage 4A development, Staging deployment, Production enablement, Deploy, formal data import, Publish, or Index; and
- does not change the Stage 3 frozen Commit or Tag.

Current disposition: the [Stage 4A Owner Development Authorization](./PHASE_1B_STAGE4A_OWNER_DEVELOPMENT_AUTHORIZATION_V1_0.md) later made `PD-04` through `PD-07` non-blocking references, accepted the supplier-information risk, and authorized P1-02A development. That later decision supersedes only this report's implementation/gate status; it does not change the `DF-01` through `DF-06` design freeze or grant Provider/API, credential, Staging/Production, Publish, Index, or formal-import authority.

## 2. DF-01 — Business acceptance and Draft-only workflow

### 2.1 Canonical workflow

```text
Authorized AI request
  -> ai_runs.pending
  -> ai_runs.processing
  -> locally validated Draft candidate
  -> ai_runs.draft_ready
  -> Editor Diff / accept / reject / edit
  -> existing Product or Content Draft / Editorial Revision
  -> submit for human review
  -> Reviewer/Publisher or Admin applies the existing Publish workflow
  -> Index remains a separate explicit control
```

`draft_ready` means that a validated candidate is classified and stored only as protected Draft-scoped content associated with an authorized Draft target. There is no successful AI-content state outside the Draft boundary. It does not mean accepted, approved, Published, Index-enabled, or visible in Production HTML.

AI output never writes directly to Live content. Human acceptance into a Draft is a separate authorized Domain Service mutation with expected-version checks and required Audit. Review and Publish continue through the existing Editorial Revision authority.

### 2.2 SEO and public-state boundary

AI output cannot automatically change:

- Production SEO title, description, narrative content, or structured data;
- URL, Slug, Route, Redirect, Canonical, Sitemap, or intent ownership;
- Publish state;
- Index state; or
- real-Product eligibility or another public eligibility predicate.

Publishing a human-reviewed Draft does not automatically enable Index. Publish and Index remain independent.

### 2.3 Mandatory traceability

Every `ai_run` must retain at least:

- task/use-case identity;
- operator identity;
- target Draft/entity and safe input-source references;
- selected configuration identity;
- actual Provider;
- requested and returned Model;
- Prompt ID, version, and hash;
- queued, generation-started, generated/completed timestamps and duration;
- token and cost evidence when available;
- Provider response status and typed safe failure evidence;
- candidate-output association; and
- subsequent human disposition and linked Draft/Editorial Revision when applied.

Provider dashboards and application logs are not an alternative provenance authority.

### 2.4 Human quality evaluation

Stage 4A must support durable human evaluation without creating a second AI history authority. The evaluation remains associated with `ai_runs` and includes:

- disposition: accepted, accepted with edits, rejected, or not evaluated;
- optional bounded `1–5` quality rating;
- allowlisted quality labels such as factual issue, relevance, clarity, tone, format, duplication, or unsafe claim;
- optional bounded sanitized comment;
- evaluator identity and evaluation time; and
- the linked accepted Draft/Revision where applicable.

Evaluation cannot change Product facts, Publish, or Index. Evaluation data is not automatically sent to a Provider or used for Provider training. Later optimization may use authorized, aggregated evidence under a separately reviewed evaluation process.

## 3. DF-02 — AI data-access boundary

The context builder and use-case policy, not the UI or Prompt, are the authority for data selection.

### 3.1 Allowed in current Stage 4A

| Data class | Frozen boundary |
|---|---|
| Public company material | Current verified Company Facts and approved CWT public/editorial content, deliberately selected for the task. No web crawl or automatic retrieval. |
| Product structured data | Actor-authorized, use-case-allowlisted fields with supplied/verified provenance. Unknown values remain absent. |
| Fabric Knowledge content | Actor-authorized approved or Draft editorial content deliberately selected for the task. No automatic corpus retrieval. |
| Explicit operator input | Bounded task input that passes the same prohibited-data, factual, authorization, and size checks. Manual entry is not a permission bypass. |

### 3.2 Prohibited in current Stage 4A

- private customer Inquiry content or attachments;
- Contact, Organization, Customer Activity, CRM identifiers, or customer profiles;
- email addresses, phone numbers, WhatsApp identifiers, IP addresses, cookies, sessions, or analytics identities;
- unauthorized internal documents or confidential operating material;
- commercially sensitive business data outside the explicit approved allowlist;
- unreviewed, unscanned, arbitrary, or unsupported files;
- Secrets, credentials, headers, environment values, private URLs, Object Keys, or permanent bucket URLs;
- arbitrary external URLs, web results, file tools, remote tools, or automatic retrieval; and
- unknown facts represented as inferred values or placeholders.

Future AI Customer Service or RAG must define a new data-permission architecture and receive separate owner and Security/Privacy approval. The current allowlist cannot be silently broadened.

## 4. DF-03 — AI role and permission model

`Editor` in this freeze means the existing resource-scoped Product Editor or Content Editor. Existing role and record scope remain authoritative.

| Role | Allowed | Not allowed through this role |
|---|---|---|
| Admin | Manage `ai_model_config`; inspect all redacted AI Run logs; manage activation/rollback among reviewed immutable Prompt versions; use AI on authorized records; edit and submit Drafts; review/publish through the existing workflow. | Direct Provider calls, live free-form Prompt-body editing, AI auto-publish, automatic Index, or bypass of Revision/Audit. |
| Product Editor | Use approved Product/Fabric AI use cases on authorized records; inspect authorized run status; edit Draft; submit review. | Model configuration, Prompt management, cross-resource/customer logs, Publish, Index, or direct acceptance into Live content. |
| Content Editor | Use approved Content/Fabric AI use cases on authorized records; inspect authorized run status; edit Draft; submit review. | Model configuration, Prompt management, cross-resource/customer logs, Publish, Index, or direct acceptance into Live content. |
| Reviewer/Publisher | Review submitted Draft/Revision and publish under the existing permission and Audit policy; inspect the AI provenance needed for review. | Model configuration or Prompt management merely because the role can publish; AI generation unless another existing scoped capability explicitly permits it. |
| Sales, Analyst, unrelated or anonymous user | No Stage 4A AI generation, configuration, Prompt, or run-log authority. | All Stage 4A AI operations. |

Stage 4A Prompt management means selecting, activating, disabling, or rolling back a repository-reviewed immutable Prompt version through an authorized, audited configuration boundary. It does not include a live free-form Prompt editor. A Prompt-body change creates a new reviewed repository version; the old version remains available for historical provenance.

The UI is never the authority. Every enqueue, cancel, retry, configuration, Prompt-selection, evaluation, Draft-apply, review, and Publish action is re-authorized in the relevant Domain Service.

## 5. DF-04 — Canonical AI lifecycle and exception handling

### 5.1 Single lifecycle status

Current Stage 4A uses exactly these `ai_runs.status` values:

| Status | Meaning |
|---|---|
| `pending` | Durable work awaits first claim or an approved scheduled retry. |
| `processing` | One Worker holds the valid claim/lease and the attempt is in progress. |
| `draft_ready` | A Provider result passed local schema, factual, security, and policy validation and is stored as a non-public Draft candidate. |
| `failed` | No usable Draft candidate exists for the current outcome. Retry eligibility is recorded separately. |
| `cancelled` | An authorized cancellation or shutdown fence prevents the run from producing a usable candidate. |

The older generic `succeeded` and `dead` terms are not additional Stage 4A statuses. `draft_ready` replaces `succeeded`; terminal retry exhaustion is `failed` plus `retry_state=exhausted`.

### 5.2 State transitions

Allowed transitions are:

```text
pending -> processing
pending -> cancelled
processing -> draft_ready
processing -> failed
processing -> cancelled
processing -> pending       # approved automatic retry scheduled
failed -> pending           # authorized manual retry under policy
```

`draft_ready` and `cancelled` are terminal for generation. Human accept/reject/evaluation is a separate disposition and does not rewrite the generation outcome.

If cancellation is requested after Provider dispatch and remote cancellation cannot be proven, a cancellation fence prevents the response from becoming `draft_ready`; the late response is discarded safely and the run remains `cancelled`.

### 5.3 Retry, error, and Provider evidence

The run records:

- attempt count and maximum attempts;
- retry state: none, scheduled, exhausted, or not retryable;
- next-attempt time where applicable;
- cancellation requester/reason/time where applicable;
- typed sanitized error code and bounded safe detail;
- normalized Provider HTTP/response status;
- safe Provider error code and request ID when supplied;
- requested and returned Model identity; and
- claim/lease/version evidence.

Raw Provider bodies, authorization headers, Secrets, and protected Prompt/input content are not error-log fields. Retry never changes Provider/model in current Stage 4A because fallback is disabled.

## 6. DF-05 — Protected Staging validation gate

The first external Stage 4A validation must occur in the isolated, access-protected, noindex Staging environment after `PD-04` through `PD-11` and explicit `PD-12` development authorization are complete.

Staging uses only approved Synthetic, non-customer, non-private data and independently isolated database, credentials, Secrets, Provider project/account where available, and logs.

The Stage 4A Staging gate must prove:

1. approved DeepSeek endpoint/model calls complete and failures normalize safely;
2. Admin, Product Editor, Content Editor, Reviewer/Publisher, unrelated-role, and anonymous permission behavior matches DF-03;
3. `ai_runs` provenance, status transitions, retries, cancellation, Provider status, timing, token/cost, and redaction are correct;
4. AI output reaches `draft_ready` only, can be reviewed/edited into a Draft, and follows the existing review/Publish workflow;
5. no AI action changes Production or Staging Live SEO/public content before an authorized human Publish action;
6. Publish and Index remain independent; and
7. missing/disabled/misconfigured Provider leaves manual editing and public reads healthy.

Staging PASS is External Validation evidence. It does not authorize Production deployment or enablement. Production requires a later independent acceptance result and explicit Owner authorization; initial Production AI remains disabled by default.

## 7. DF-06 — Provider/model switching

The initial Stage 4A text selection remains:

- Provider: DeepSeek API;
- Provider key: `deepseek`; and
- Model: `deepseek-v4-flash`.

Business modules depend only on Provider-neutral CWT contracts. Provider, Model, parameters, enabled/default state, and the reviewed Prompt selection resolve through governed configuration and registries.

Switching to an already implemented and approved OpenAI GPT, Anthropic Claude, or another Provider/model configuration changes new-run configuration only. It does not require Product, Content, SEO, Draft, review, or publishing code changes. A new Provider still requires its own adapter, contract tests, region/privacy/security/cost evidence, and approval.

Current Stage 4A contains no fallback and no direct Provider path.

## 8. Reconciled design differences

The review found and resolved three terminology differences:

1. ADR-0017 used generic retry/dead terminology. ADR-0018 now supersedes that lifecycle terminology for Stage 4A with the five canonical statuses in DF-04.
2. Earlier planning excluded live Admin Prompt editing. DF-03 preserves that exclusion while defining Admin Prompt management as controlled activation/rollback among immutable reviewed versions.
3. The owner used the general term Editor. DF-03 maps it to the existing resource-scoped Product Editor and Content Editor and preserves the existing Reviewer/Publisher role.

No unresolved design contradiction remains inside DF-01 through DF-06.

## 9. Evidence work identified at confirmation time

The next work is evidence collection and independent review for:

- `PD-04` API input/output training or service-improvement use;
- `PD-05` processing/storage region and cross-border transfer;
- `PD-06` cache behavior and controls;
- `PD-07` enterprise data security;
- `PD-08` endpoint, model, and account capability;
- `PD-09` token/cost ceilings;
- `PD-10` independent Security/Privacy review; and
- `PD-11` Synthetic fixture and quality-evaluation contract.

At confirmation time, `PD-12` was expected to follow those gates. The later Owner decision supersedes that sequence: `PD-04` through `PD-07` are non-blocking references and P1-02A development is authorized. The evidence items may continue as reference work without becoming automatic blocking gates.

## 10. Design-freeze result and current state

Design-freeze conclusion: **PASS**  
Architecture: **APPROVED**  
Evidence-time Stage 4A development: **NOT AUTHORIZED**  
Current Stage 4A P1-02A development: **AUTHORIZED BY OWNER — 2026-08-10**  
DeepSeek credential/API use: **NOT AUTHORIZED**  
Staging deployment/validation: **NOT AUTHORIZED YET**  
Production enablement/Deploy: **NOT AUTHORIZED**  
Publish/Index/formal data import: **NOT AUTHORIZED**
