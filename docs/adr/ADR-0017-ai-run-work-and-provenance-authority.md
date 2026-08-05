# ADR-0017: AI Run Work and Provenance Authority

Status: **Accepted by the project owner for Phase 1B Stage 0 on 2026-08-05. Implementation is not authorized by this ADR.**

## Context

Phase 1B may use external cloud AI for reviewable Product/Content copy, Block layout, suggestions, and approved-template detail images. External calls are slow, fail independently, incur token/cost, require bounded concurrency/retry, and need Provider/Model/template/source/result provenance.

AI must remain subordinate to Product truth, Editorial Revision, Publish/Index, Asset rights, and privacy. In-memory tasks cannot recover after process restart, while reusing the notification Outbox would mix unrelated delivery semantics and create ambiguous job ownership.

Stage 0 freezes architecture and privacy boundaries only. Specific Provider, Model, processing region, retention/training terms, price/budget, and approved image templates are a Stage 4 entry gate and do not block Stages 1–3.

## Decision

Introduce one `ai_runs` durable authority that serves both as AI work lifecycle and provenance record. It stores the approved run kind, target Draft/entity, request/idempotency identity, actor, source/template/version references, bounded safe input/output JSON, Provider/Model identifiers, token/cost evidence, status, attempt/backoff, claim/lease, typed failure, and timestamps.

There is no separate AI task queue plus run-history table. The modular-monolith Worker claims `ai_runs` directly with real PostgreSQL concurrency/lease semantics. Text and image work have independently bounded concurrency; initial target limits are text 2 and image 1 on the 2 vCPU/4 GB host.

Production accepts only `AI_PROVIDER_MODE=cloud_api`. Local model servers, localhost model endpoints, model weights, GPU inference, Ollama, llama.cpp, vLLM, LocalAI, Stable Diffusion, and local image generation are prohibited.

AI returns typed proposals only. Human, permission-checked actions may accept/reject individual unlocked Blocks into a Draft/Revision with Diff and Undo. AI has no capability to:

- Publish or enable Index;
- mutate Routes/Redirects or approve Slugs;
- create/modify Product Code, composition ratios, GSM, Width, MOQ, lead time, inventory, certification/test/performance values, or Company/facility/capacity facts;
- approve Asset rights or public eligibility;
- read Private Inquiry attachments, Inquiry/Contact/Organization/customer data, credentials, Secrets, or private storage;
- create an AI knowledge base from private/customer data.

AI image work starts from an eligible real Product Asset plus an approved versioned template. Output enters the existing Import/Public-safe Upload, scan, Asset, Finalize, rights, relation, Revision, and human-review boundaries. Generated output cannot establish Product or factory truth.

## Alternatives

1. **In-memory promises/jobs only.** Cannot recover safely or retain cost/provenance after restart.
2. **Use notification Outbox for AI.** Mixes notification delivery with long-running generative work and creates inappropriate retry/payload/privacy semantics.
3. **Separate AI queue and AI history tables.** Creates two lifecycle authorities that must be reconciled.
4. **Synchronous provider calls inside editorial save/import transaction.** Holds business/DB transactions across external latency and lets provider failure misreport durable Draft success.
5. **Run a local model on the Production host.** Violates the cloud-only decision and 4 GB resource budget.
6. **Allow AI to write Product fields directly.** Violates factual truth and human Draft/review/publish boundaries.

## Schema / Migration impact

The reviewed `0020` forward Migration is expected to create one `ai_runs` table with restrictive target/actor references, request/idempotency uniqueness, status/claim indexes, lease/retry fields, bounded provenance/output fields, and Check Constraints. Stable lifecycle values should prefer Check-Constrained text unless a PostgreSQL enum is explicitly justified and reviewed under ADR-0010.

No AI knowledge, prompt-corpus, private-file relation, second queue, Publish/Index field, or AI-specific Revision table is added. Existing data is not backfilled. Historical Migrations/Snapshots/Journal `0000`–`0017` remain immutable. No Migration is generated or executed in Stage 0.

## URL / SEO impact

AI Run records have no public route and are excluded from Sitemap/Index. AI suggestions cannot create or move public routes, change Canonical, approve metadata, Publish, or enable Index.

Accepted Draft copy/Blocks affect public HTML only after the ordinary Editorial Revision and eligibility workflow. AI-generated SEO text remains human-reviewed Draft. Unknown/invalid Block output fails closed and never renders publicly.

## Security / privacy impact

- Provider credentials are server-only, environment-specific, redacted, and absent from run JSON/logs/browser.
- A centrally validated context builder includes only explicitly selected Draft-safe Product/Content/eligible Asset data.
- Private Inquiry files and all customer/CRM identifiers are structurally unavailable to AI context selection.
- Prompt/result size, schema, model endpoint, timeout, retry, concurrency, token, and cost limits are enforced.
- Provider responses are untrusted input and pass strict schema, factual-field denylist, Block allowlist, URL/Asset eligibility, and locked-Block checks.
- Runs/results require role/record authorization; Audit applies when an accepted proposal mutates a Draft.
- Failure logs use typed safe codes and do not expose prompts containing protected content, Secrets, or provider tokens.
- Provider privacy, region, retention, training opt-out, subprocessors, and deletion terms must pass the Stage 4 gate.

## Compatibility

AI is optional and defaults off. Manual editing, Revision, Publish, Index, public reads, and Product Import remain healthy when no Provider is configured or AI is disabled.

Typed input/output and template versions make recorded runs understandable across model changes. Unsupported output versions fail closed. Provider adapters normalize response/provenance into the single authority; provider-specific payloads do not become public/editorial contracts.

AI may be handed a committed imported Draft after Product Import succeeds. AI failure changes only the AI Run outcome and never reverses or duplicates Product/Asset success.

## Rollout

1. Before Stage 4, the owner approves Provider/Model, processing region, privacy/retention/training terms, token/cost ceilings, endpoint policy, and image templates.
2. Review `0020` with Fresh/Upgrade/repeat, claim/lease, retry/dead, idempotency, and query-plan tests.
3. Implement a disabled cloud-only adapter boundary and prove missing-config/manual-editor degradation.
4. Enable Synthetic text candidates, schema/factual denylist, Diff, Block accept/reject/lock/Undo, and provenance/cost.
5. Prove timeouts, malformed output, prompt injection, quota, response loss, stale/locked Draft, and concurrent claim behavior.
6. Add approved-template image flow through existing Asset pipeline and human rights/revision review.
7. Validate bounded text-2/image-1 behavior on the target 2 vCPU/4 GB Staging topology.

No real Provider configuration or credential use is authorized by this ADR alone.

## Rollback

Disable the AI feature and stop new Worker claims. Manual editing and existing Drafts remain available. AI Run records remain protected provenance/operational evidence and are not deleted to simulate rollback.

An in-flight run may complete into stored unaccepted output or fail safely; it cannot mutate public state. Reverting code requires Schema compatibility with existing run records and must not requeue completed/failed work as new accepted content.

## Rejected duplicate-authority designs

- Notification Outbox as an AI queue.
- One AI task table plus a second provider/run-history table.
- Provider dashboard/logs as the only provenance or cost authority.
- A separate AI Draft/Revision store outside Editorial Revision.
- An AI-created public Asset path outside Upload/Finalize/rights/revision.
- A private Inquiry attachment relation or AI knowledge base.
- Direct AI capability for Publish, Index, Route, factual fields, or rights approval.
- A local Production model or fallback to localhost when cloud configuration fails.
