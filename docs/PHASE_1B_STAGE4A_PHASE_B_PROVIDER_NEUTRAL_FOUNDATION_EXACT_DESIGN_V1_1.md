# CWT Stage 4A Phase B — Provider-neutral Foundation Exact Design

- Status: **DESIGN CANDIDATE — NOT APPROVED / NO IMPLEMENTATION AUTHORIZED BY THIS DOCUMENT**
- Design version: `1.1`
- Supersedes for implementation eligibility: failed Design V1.0 at exact commit `de0c3e4ec63331837baefd1ff755ecd0ffb9d46f`; V1.0 remains immutable review history
- Remediates independent findings: `H-01`, `H-02`, `M-01`–`M-06`, and `L-01`
- Prepared: `2026-08-10` (Asia/Shanghai)
- Entry branch/ref: `codex/phase-1b-stage4a-phase-b-entry-v1`
- Exact entry commit: `c6f9714750622d9b977c284b5eeceea93da007a5`
- Accepted Phase A parent: `717cbac284350ec23f786ee239a354085ee0d827`
- Exact reviewed `0020` Candidate ancestor: `15bc6462d2e314f50ff238af70ad31fc6502c40f`
- Frozen baseline: `31c0e405acfdd0d05200d0fb2531e897a541a2c4`
- Frozen tag: `phase-1b-stage3-approved-2026-08-09`
- Next gate: **Fresh Re-review by the original independent Phase B Design Reviewer**

> This corrected document is a complete Design Candidate and Complex Task Analysis only. It does not implement Phase B, approve itself, create a Provider account or credential, call a Provider, use a network, spend money, modify Schema/Migration, deploy, import formal data, Publish, or enable Index. The failed V1.0 remains byte-identical. Phase B implementation must not begin until the original independent reviewer completes a Fresh Re-review of the exact V1.1 commit and returns PASS.

## 1. Decision summary and Phase B exit

Phase B establishes one server-only, Provider-neutral CWT AI foundation. The orchestration core is application-neutral: it owns ordering, feature/config/Prompt resolution, durable-snapshot reconstruction, one adapter dispatch, output framing, and typed normalization, while each registered application owns its command codec, association shape, authorization/context policies, output codec, protected-result kind, and disposition kind. The core contains no Draft target union and no Draft result/disposition literal.

The current `draft_assistance` application adds a narrow facade with three deliberately separated boundaries:

1. `inspectDraftAssistanceAvailability` is a read-only Domain-Service-facing query for an exact actor/use-case/target/context request. It maps a Draft command into the generic core and reports only safe usable/manual-editor state.
2. `requestDraftAssistance` is the only Domain-Service-facing Draft mutation API. It maps the Draft command into generic core preparation, then hands the immutable prepared envelope directly to Phase C's one durable enqueue composition. It cannot be operational in Production until Phase C supplies that port.
3. `executeClaimedTextAttempt` is a Worker-only core API. The Worker supplies a claimed durable database projection—not a rendered request. The core reloads the exact immutable Prompt bytes, validates every durable hash and registered policy/envelope identity, reconstructs the Provider-neutral request, performs at most one adapter call, parses one complete raw JSON object, and returns an application-owned protected result envelope.

There is no synchronous public `generate()`, no business-visible prepared/rendered request, no in-memory run repository, and no fake durable enqueue. Every future real adapter call therefore requires an `ai_runs` identity, processing lease, state version, and committed dispatch marker. `ai_runs` remains the sole work/lifecycle/provenance authority; the compile-time claimed brand is only a zone guard.

Phase B also defines:

- exact generic core contracts plus the current Draft application facade and codecs;
- a closed Production registry containing exactly the four approved `draft_assistance` text cases;
- a test-only Synthetic application with a non-Draft association and non-Draft result/disposition, registered without editing core files and never persisted to `0020`;
- strict explicit-context schemas, Product field provenance, serialization, and reconstructible `input_context_json`;
- one consistent `ai_model_config` aggregate/default query with no row-truncation ambiguity;
- an immutable Prompt resource manifest, checked-in raw-byte bundle, loader, renderer, history verifier, and server-bundle proof;
- an exact raw JSON parser and four complete strict candidate grammars;
- a capability-specific `TextAiProvider` contract with mandatory normalized completion state;
- deterministic test-only fake adapters with no network or Provider claims;
- manual-editor degradation for disabled, missing, ambiguous, unsupported, or invalid readiness;
- exact availability/request/replay ordering and error precedence; and
- transitive AST/module/resource/public-bundle gates covering static, dynamic, alias, re-export, computed, generated, and fixture forms.

Phase B exit is met only when every Provider-neutral unit, integration, architecture, Prompt-bundle, raw-parser, Synthetic-extensibility, and public-bundle test in Section 20 passes; `ai_model_config` and `ai_runs` still map exactly `21/21` and `96/96`; V1.0 is byte-identical; the repository contains no real Provider adapter/SDK/credential/network path; and the implementation Candidate later receives its own independent review. No DeepSeek fact or behavior is claimed, and `PD-04` through `PD-07` remain non-blocking reference items rather than reinstated gates.

## 2. Fixed authority and verified entry identity

The entry checks for this design Candidate are:

| Check | Verified identity | Result |
|---|---|---|
| Detached worktree HEAD | `c6f9714750622d9b977c284b5eeceea93da007a5` | PASS |
| Entry branch ref | `refs/heads/codex/phase-1b-stage4a-phase-b-entry-v1` resolves to the same commit | PASS |
| Direct parent | `717cbac284350ec23f786ee239a354085ee0d827` | PASS |
| Exact `0020` Candidate ancestry | `15bc6462d2e314f50ff238af70ad31fc6502c40f` is an ancestor | PASS |
| Frozen annotated tag object | `1c626f9b788e4c6ed0480a7040aa54ccef3e6c76` | PASS |
| Frozen tag peeled commit | `31c0e405acfdd0d05200d0fb2531e897a541a2c4` | PASS |
| Phase A acceptance record SHA-256 | `b9e00b41ba561fe434fb2f1bdb136c7e43098d2765e4c34e16f267557cefe833` | PASS |

The detached checkout was explicitly accepted by the coordinator as the normal Codex isolated-worktree state because both the detached HEAD and entry branch ref resolve to the exact entry commit. Before this document was added, the worktree was switched to `codex/phase-1b-stage4a-phase-b-design-v1`.

The V1.1 remediation starts from exact Design commit `de0c3e4ec63331837baefd1ff755ecd0ffb9d46f`, whose direct parent is the entry commit above. The following review inputs were independently recomputed before revision:

| Remediation input | Exact SHA-256 |
|---|---|
| immutable failed V1.0 Design | `a0dd322de815e4b627b3f20f78454303e262756f2d209699379db5d56a4fa247` |
| Independent Design Review V1.0 | `89adab2aa9466437105840d68248703a63a2703f696d4950f73e4d0635cc4ad2` |
| Independent Review Evidence V1.0 | `a3958624e0b013907b8f27dd75e7bd315500637eba1f6f944fef6a89ea0fe1b5` |
| review evidence `SHA256SUMS.txt` manifest | `f57a7d01488af9dc80f4baa2d416775d1e8c3638d058546e569eeb4799b02f6b` |

The FAIL count was Blocker `0`, High `2`, Medium `6`, Low `1`; implementation remained **NOT ELIGIBLE**. V1.1 corrects those nine contracts without changing accepted Schema, ADRs, or frozen scope. V1.0 must not be edited, deleted, renamed, or treated as eligible design.

## 3. Actual repository baseline and reuse inventory

The design uses the repository as it exists at the exact entry commit. It does not assume a generic framework that is absent.

| Existing path/symbol | Actual responsibility and Phase B reuse |
|---|---|
| `src/db/schema/ai.ts` — `aiModelConfig`, `aiRuns` | Accepted Drizzle mapping of the two Phase A tables. Phase B imports `aiModelConfig` for a read-only repository only; it does not change either table. |
| `drizzle/0020_phase1b_ai_foundation.sql` | Accepted physical Schema, constraints, indexes, and empty/additive Migration. It is immutable input to this design. |
| `src/db/schema/ai.integration.test.ts` | Existing PGlite evidence for current Schema scope, uniqueness, checks, cancellation fence, and RESTRICT behavior. It is not a service test. |
| `src/db/schema/settings.ts` — `featureFlags` | Existing database global feature switch. Key `ai` is seeded false. It remains the runtime global kill switch; it is not model configuration. |
| `src/config/env.ts` — `env.FEATURE_AI`, `env.APP_ENV` | Existing trusted process configuration. `FEATURE_AI` defaults false and acts as an environment-level upper bound; `APP_ENV` is the trusted environment identity. |
| `src/db/seed.ts` | Seeds the existing `ai` feature flag as false and creates no AI model configuration. Phase B adds no seed. |
| `src/audit/governed-mutation.ts` — `runGovernedMutation` | Existing atomic business-mutation/Audit wrapper. Phase B is read-only and does not use it; Phase C configuration mutation and later Draft application must reuse it. |
| `src/audit/service.ts` — `writeAuditLog`, `AuditWriteError` | Existing required Audit authority and typed failure. No AI Audit table is added. |
| `src/auth/permissions.ts` | Existing roles, permissions, `requirePermission`, and `AuthorizationError`. AI contracts use `UserRole`; application policies recheck resource scope rather than inventing AI-only roles. |
| `src/admin/preview-policy.ts` — `requireEditorialResourceAccess` | Existing Product/Content resource-role boundary. Later application policy implementations reuse the relevant write boundary and add target/channel checks. |
| `src/catalog/product-service.ts` — `Actor`, Product Domain Service patterns | Evidence for actor shape, resource authorization, Zod validation, optimistic Draft versions, and governed mutations. AI core must not import this service to avoid a reverse domain dependency. |
| `src/content/content-service.ts` | Evidence for Content Draft/Revision authorization, strict Zod snapshots, channel identity, and `editor_document_version`. Later Phase E adapters implement the AI application policy port through this domain boundary. |
| `src/content/company-facts-service.ts` — `currentPublicCompanyFactConditions` | Authoritative predicate for verified, public-use-approved, evidenced, current Company Facts. A later context source reader must reuse this predicate; Phase B must not reproduce it. |
| `src/db/schema/catalog.ts` | Actual Product, localization/version, field-review, Taxonomy/Application, and Fabric Library fields used to define narrow context projection contracts. |
| `src/catalog/product-service.ts` — `updateProductFacts`, `reviewProductField` | Exact Product provenance behavior: only composition/GSM/Width/MOQ fields receive `product_field_reviews`; other stored optional fields are supplied-only; MOQ is normalized as a pair. |
| `docs/PRODUCT_DATA_DICTIONARY.md`, Stage 4 plan §5.3 | Product Code is hidden/internal and Product Description output forbids Product Code/factual-field mutation. V1.1 excludes it from Provider context and all candidates. |
| `src/db/schema/content.ts` | Actual Content channels, localizations, structured Blocks, editor versions, and Editorial Revision fields used by target/context contracts. |
| `src/editorial/blocks.ts` — strict `blockSchema`, `blockDocumentSchema`, `parseBlockDocument` | Existing strict Block vocabulary and 256 KiB document boundary. AI output uses a narrower narrative subset and never creates factual specification tables, media, routes, or arbitrary CTAs. |
| `src/editorial/conflict.ts` | Existing typed Draft conflict pattern. Phase E maps stale AI application to the existing Draft conflict boundary. |
| `src/admin/action-result.ts`, `src/admin/invoke-admin-action.ts` | Existing safe UI-result translation. Future Server Actions translate AI typed results; they do not catch raw Provider errors or write AI/business tables. |
| `src/settings/feature-flag-service.ts` | Existing authorized feature-flag mutation. Phase B only reads the flag. Model-config mutation remains a separate future governed service because a feature flag is not configuration authority. |
| `src/public-site/public-bundle-check.test.ts`, `scripts/check-public-bundle.mjs` | Existing fresh-build and client-reference/chunk boundary. Phase B extends its forbidden server-AI markers. |
| `src/admin/stage2-editor-boundaries.static.test.ts`, `src/uploads/post-commit-boundary.static.test.ts` | Existing repository precedent for focused static architecture tests. Phase B adds an AST-based gate rather than relying only on substring tests. |
| `src/db/types.ts`, `src/db/client.ts` | Existing generic Drizzle database type and environment-selected connection. The config repository follows this pattern and never opens a separate database. |
| `package.json`, `tsconfig.json` | Current Node 24/TypeScript 5.9 strict settings, Zod 4, Vitest 4, and no AI SDK. Phase B uses current dependencies only. |

There is no `src/ai` tree, Provider adapter, Provider SDK, AI credential lookup, Prompt Registry, application registry, context policy, output schema, or AI Service Layer at the entry commit. There is therefore no legacy AI implementation to preserve.

## 4. Root cause and Complex Task Analysis

### 4.1 Root cause and misplaced responsibility

The immediate gap is not “DeepSeek code is missing.” The causal gap is that CWT has accepted durable database authorities but no application boundary that makes those authorities usable without leaking Provider, data-selection, Prompt, or output semantics into Product/Content/SEO code.

If a business feature directly reads `ai_model_config`, renders a Prompt, or calls an SDK, responsibility is misplaced in six ways:

1. model/config selection becomes duplicated business behavior;
2. Provider DTOs and errors escape the adapter boundary;
3. callers can bypass explicit context and strict output policy;
4. future model switches require business-code edits;
5. Phase C cannot make `ai_runs` the unavoidable durable call authority; and
6. a synchronous or in-memory spike can survive as a second execution/history path.

The corrected boundary is one generic AI Service Layer whose preparation is reached through an application facade and whose execution occurs only after a Phase C durable claim. Application registry entries—not core or feature switches—own command/association/context/output/protected-result/disposition semantics. Core owns the one ordering, resolution, reconstruction, adapter-call, framing, and normalization algorithm.

The independent V1.0 FAIL exposed two root causes inside that boundary: Draft target/result literals still constrained the supposed generic core, and Provider-output framing/grammar/completion was not mechanically complete. Its Medium findings were consequences of the same missing exactness: partial config observation, implicit Prompt packaging, contradictory sequencing, unverified rendered requests, ambiguous Product provenance, and an underspecified structural graph. V1.1 removes those ambiguities at their authority boundaries rather than layering exception paths.

### 4.2 Why current mechanisms are insufficient

- `feature_flags` can stop the whole capability but cannot select a model, Prompt, limits, or immutable configuration identity.
- environment variables alone have no durable row identity, one-default constraint, record version, or future Audit evidence.
- `system_settings` is unstructured JSON and was rejected by ADR-0018 for model configuration authority.
- `ai_model_config` alone does not validate compiled adapter, Prompt, use-case, or output-policy agreement.
- `ai_runs` is Schema only at entry; using it directly from features would bypass authorization/context/Prompt policy and create repeated SQL state logic.
- the notification Outbox has unrelated delivery semantics and is expressly rejected as an AI queue.
- existing Product/Content Zod schemas validate business Drafts, not untrusted Provider output or explicit Provider-bound context.

### 4.3 Simplification and Replace-not-Layer result

The design adds no compatibility facade around a direct Provider path because none exists. It introduces one Draft facade over one generic core and bans every other path. It reuses the existing feature flag, authorization, Audit, Draft/Revision, Blocks, database, and accepted two-table Schema. It adds no table, queue, outbox kind, active-default/readiness/request cache, Worker, lease, fallback graph, Prompt database, retrieval state, or second history. A full-tuple immutable Prompt-byte cache is content caching only and cannot select config or run work.

The Phase B fake path is test infrastructure, not a runtime alternative:

- fake adapters live only under `src/ai/testing/`;
- the Production provider registry imports nothing from that directory;
- test code cannot bypass the same strict claimed projection constructor or inject a rendered request;
- bundle and architecture gates reject testing imports from production modules;
- no in-memory run repository exists, even in tests;
- Synthetic execution tests create an isolated claimed snapshot through a test helper and persist nothing;
- Phase C deletes no “temporary runtime” because none is introduced; it only supplies the durable claim/persistence implementation required by the existing execution contract.

### 4.4 Complexity approval disposition

Phase B adds compiled definitions and pure/read-only services only. It adds no persistent or cross-process coordination, so a new Complexity Approval is not required beyond accepted ADR-0018. Phase C remains the phase governed by the accepted `ai_runs` lifecycle, Worker, lease, retry, cancellation, cost, and concurrency complexity.

## 5. Scope

### 5.1 In scope

- Provider-neutral TypeScript contracts, results, errors, safe telemetry types, and exact RFC 8785/JCS/hash utilities.
- Exactly one application class in Production: `draft_assistance`.
- Exactly four Production use cases: `seo_content_draft`, `fabric_knowledge_draft`, `product_description_draft`, `sourcing_guide_draft`.
- Generic registry definitions containing application-owned command/association codecs, authorization/context policy, Prompt contract, output codec, protected-result kind, and disposition kind.
- Strict explicit-context source selectors, envelopes, serialization, byte limits, key/value denial, and source-reference separation.
- Read-only resolution of `feature_flags.key='ai'` and `ai_model_config` from the current environment database.
- Immutable Prompt manifest/resource/generated-bundle loading, exact bytes/hash, variables, version, render, packaging, and protected-history rules.
- Dependency-free raw JSON framing plus four strict output schemas, exact candidate Block unions, and deterministic protection/conversion rules.
- `TextAiProvider` contract and adapter registry contract.
- Test-only fake providers and a structurally non-Draft Synthetic application extensibility proof.
- Preparation and claimed-attempt methods of the one AI Service Layer.
- Transitive AST/module/resource architecture, Prompt-bundle, no-capability, test-only server-bundle, and public-client-bundle gates.

### 5.2 Out of scope

- Any `ai_model_config` create/update/enable/disable/default switch/Prompt selection mutation.
- Admin model/Prompt UI or Server Action.
- Audit writes for configuration; these belong to Phase C's governed configuration service.
- `ai_runs` insert, enqueue transaction, idempotent replay implementation, status transition, claim, lease, heartbeat, retry, cancellation, Worker, cost admission/accounting, or evaluation mutation; these belong to Phase C. Phase B fixes their ports/order/contracts only.
- Real DeepSeek adapter, SDK, HTTP endpoint, API key, retry behavior, tokenization, price, cache, region, account, credential, or network; these belong to Phase D and later external validation.
- Product/Content/SEO UI or Domain Service integration, candidate Diff/apply/Undo, or Admin screens; these belong to Phase E.
- Any Product, Content, Company Fact, Draft, Revision, route, Redirect, Asset, Publish, Index, or public mutation.
- Complete RAG, knowledge base, document ingestion, chunking, embedding, vector storage/search, retrieval, citation corpus, web/file tools, arbitrary URL/file, or Provider conversation state.
- Vision, image input/output, image Prompt, Asset bytes, or generated media.
- Runtime fallback, alternate model retry, silent substitution, or fallback-chain validation beyond rejecting non-null `fallback_config_id`.
- Production `customer_support` key, registration, configuration, Prompt, context, data, route, table, message, conversation, tool, or action.
- Provider credential/network, Staging/Production, Deploy, Publish, Index, formal import, or Push.

## 6. Module and dependency design

```text
Phase E Product/Content Domain Service (server only)
  -> src/ai/index.ts request-facing exports
     -> src/ai/applications/draft-assistance/facade.ts
        -> Draft command/association codec + Draft policy bundle
        -> GenericAiOrchestrator.inspect | request
           -> immutable ApplicationRegistry entry
              -> application command codec
              -> application association codec
              -> authorization + context policy
              -> output codec + protected-result/disposition policy
           -> AiFeatureGateRepository
           -> AiModelConfigRepository single consistent resolution result
           -> ModelConfigResolver
           -> PromptManifestLoader / PromptRenderer
           -> PreparedCoreRunV1
           -> Phase C DraftAiRunEnqueuePort -> ai_runs.pending

Phase C Worker after durable claim + dispatch marker
  -> src/ai/internal/worker-entry.ts
     -> GenericAiOrchestrator.executeClaimedTextAttempt
        <- ClaimedAiRunProjectionV1 from ai_runs (never rendered request)
        -> exact Prompt bytes reload + tuple/hash/history validation
        -> input_context_json strict decode + input_hash validation
        -> config/envelope/policy/output identity revalidation
        -> deterministic variable and request reconstruction
        -> TextProviderRegistry exact key only
        -> one TextAiProvider.generateText call
        -> completion gate -> RawJsonObjectParser -> application output codec
        -> ProtectedApplicationResultEnvelopeV1
        -> Phase C fenced ai_runs transition

src/ai/testing/synthetic-application/*
  -> registry builder + generic core only
  -> association { kind: synthetic_case_association, ... }
  -> result kind synthetic_review_packet
  -> disposition kind synthetic_probe_verdict
  -> test Prompt manifest + fake adapter
  -X no Draft union, no customer_support, no 0020 persistence
  -X never imported by Production registry/facade/business/app/public modules
```

Dependency rules:

1. `src/ai/core/**` may depend only on Provider-neutral contracts, registry interfaces, canonicalization/framing utilities, Prompt/config/provider ports, Node standard library, Zod, and `server-only`. It must not import `src/ai/applications/draft-assistance/**` or any Synthetic application.
2. The Draft application may depend inward on core contracts and type-only authorization roles, but core must not import Draft targets, Product, Content, SEO, Import, CRM, Inquiry, Asset, Admin UI, or public-site services. Phase E implements its narrow target/context reader ports through Product/Content Domain Services.
3. Business modules may import only the Draft facade re-exported by `@/ai`; generic preparation, registries, config repositories, Prompt loaders, raw parser, providers, claimed execution, and testing modules are non-public.
4. Provider adapters may depend inward on Provider-neutral contracts. Core and business modules may not depend outward on an adapter or Provider SDK.
5. `src/public-site/**` and public `src/app/**` pages may not import any `src/ai` module. Server Actions/API handlers may only call an authorized business Domain Service, never the AI facade directly.
6. `src/db/schema/**` remains lower-level and does not import `src/ai`. Phase C's Draft persistence adapter maps the application-owned durable association/result to accepted `0020`; generic core never imports Drizzle `aiRuns`.
7. Production Prompt resources and their generated byte bundle are server-only protected resources. Synthetic resources remain under testing and cannot enter the Production manifest or server application graph.

## 7. Exact Phase B implementation file plan

The following is the implementation file set to be reviewed after this design passes. Files marked “test only” cannot be imported by production modules.

| Path | Responsibility, public export, dependencies |
|---|---|
| `src/ai/index.ts` | Imports `server-only`; re-exports only the Draft application facade, `AiServiceResult`, safe availability/run-summary DTOs. It exports no generic core command, application registry, prepared/rendered/claimed/provider type. |
| `src/ai/core/contracts.ts` | Application-neutral command envelope, opaque application payload/association/result envelopes, prepared core run, claimed durable projection, normalized attempt, JSON, and result types. It contains no Draft target/result/disposition literal and imports no business domain. |
| `src/ai/applications/contracts.ts` | Generic application codec/policy interfaces: command codec, association codec, authorization/context policy, Prompt-variable builder, output codec, protected-result/disposition policy, and optional persistence mapping descriptor. Core depends only on these interfaces. |
| `src/ai/applications/draft-assistance/contracts.ts` | Current `AiActor`, `DraftTarget`, four use-case command/query types, Draft durable association/result/disposition codecs, and safe facade DTOs. Type-only domain role dependency. |
| `src/ai/applications/draft-assistance/facade.ts` | Implements `inspectDraftAssistanceAvailability` and `requestDraftAssistance`; maps typed Draft commands to generic core commands and maps safe results back. No orchestration, config, Prompt, adapter, or database logic. |
| `src/ai/applications/draft-assistance/policies.ts` | Draft target authorization/association/context/result/disposition policy bundle and exact `0020` persistence mapping descriptor. Later Phase E supplies narrow Product/Content readers. |
| `src/ai/errors.ts` | Closed error-code taxonomy, safe error factory, manual-degradation mapping, and exhaustive helpers. No raw exception message exposure. |
| `src/ai/canonical-json.ts` | RFC 8785/JCS canonicalization for the accepted I-JSON domain and SHA-256 helpers used by request/config/input/candidate hashes. Depends only on `node:crypto`; no adapter-policy narrowing. |
| `src/ai/telemetry.ts` | Strict allowlisted telemetry event schema and no-op/test sink contract. Contains no general logger payload API. |
| `src/ai/registry/application-registry.ts` | Generic immutable application/use-case registry builder; validates complete codec/policy bundles, duplicate keys/kinds/schema identities, and returns opaque definitions to core. No Draft import. |
| `src/ai/registry/production-use-cases.ts` | Exactly four frozen Draft definitions composed from Draft-owned codecs/policies. Exports `productionApplicationRegistry` only. Contains no `customer_support`. |
| `src/ai/context/contracts.ts` | Generic strict reconstructible context-envelope primitives and source provenance tags; no Draft selector or generic table/query/file/URL source. |
| `src/ai/applications/draft-assistance/context.ts` | Draft selectors, source DTO schemas, Product provenance matrix, per-use-case allowlists, limits, forbidden-data scan, stable aliases, Prompt-variable reconstruction, and Provider payload projection. |
| `src/ai/config/feature-gate-repository.ts` | Read-only lookup of `feature_flags.key='ai'` plus trusted `env.FEATURE_AI`/`env.APP_ENV` composition. No mutation. |
| `src/ai/config/model-config-repository.ts` | Read-only Drizzle port/implementation returning one consistent aggregate/default result for a capability/use-case: complete counts plus at most two enabled-default rows from one SQL statement/transaction snapshot. No partial-row inference or active-default cache. |
| `src/ai/config/model-config-resolver.ts` | Validates repository-result consistency; distinguishes missing/disabled/no-default/one-enabled-default/ambiguous/corrupt; validates registry/adapter/Prompt/limits/parameters/fallback and produces immutable JCS-hashed snapshot. |
| `src/ai/prompts/contracts.ts` | Strict Prompt resource metadata, authoritative manifest tuple, generated-bundle entry, variable, loader, and renderer schemas. |
| `src/ai/prompts/resources/production/manifest.v1.json` | Repository-reviewed authoritative membership/order list of Production Prompt tuples. Phase B value is exactly `{"manifestVersion":1,"entries":[]}` plus final LF; no body is invented. |
| `src/ai/prompts/resources/production/<prompt-id>/v<n>.<sha256>.json` | Future reviewed immutable Production raw-byte resources. None are added in Phase B. Resource bytes are content authority; manifest membership is registry authority. |
| `src/ai/prompts/generated/production-prompt-bundle.generated.ts` | Checked-in deterministic derivative containing static tuple metadata and exact raw bytes encoded as canonical base64. Phase B contains the empty tuple. Runtime imports this module; it is never hand-edited. |
| `scripts/generate-ai-prompt-bundle.ts` | Mechanical generator from authoritative manifest/resources to the checked-in static bundle; no network or facts. Write mode is an explicit developer command, never runtime. |
| `scripts/verify-ai-prompt-bundle.ts` | Check-only regeneration/diff plus manifest/resource/hash/stale/unreferenced/duplicate and Production/Synthetic isolation validation. Required before build. |
| `scripts/verify-ai-prompt-history.ts` | Git-object-based immutable history verifier requiring explicit approved `--base` and exact `--candidate`; rejects inferred/shallow/nonancestor inputs and historical mutation/deletion/rename/repoint. |
| `src/ai/prompts/loader.ts` | Server-only static bundle loader; decodes exact raw bytes, verifies byte length/SHA/UTF-8/metadata/tuple, parses strict resource, and caches only full immutable tuple. No filesystem scan or dynamic import. |
| `src/ai/prompts/renderer.ts` | Exact variable-set and per-variable byte/type validation, placeholder validation, deterministic rendering. It accepts only builder-produced variables. |
| `src/ai/prompts/resources/README.md` | Append-only format, manifest/resource authority, review, generation, naming, bytes/hash, protected-history base, retention, and rollback contract. Contains no Prompt body. |
| `src/ai/output/raw-json.ts` | Dependency-free bounded recursive-descent parser for one root object; validates framing, Unicode, duplicate keys at every depth, JSON grammar/depth/node limits, and returns the only parsed value before Zod. |
| `src/ai/output/common.ts` | Complete strict EvidenceText and heading/paragraph/list/callout/FAQ candidate Block schemas, derived candidate-ref function, canonical protected form, and Phase E conversion descriptors. It does not re-export business mutation types. |
| `src/ai/output/seo-content-draft.ts` | Strict version-1 SEO candidate schema and policy. |
| `src/ai/output/fabric-knowledge-draft.ts` | Strict version-1 Fabric Knowledge candidate schema and policy. |
| `src/ai/output/product-description-draft.ts` | Strict version-1 Product-description candidate schema and policy. |
| `src/ai/output/sourcing-guide-draft.ts` | Strict version-1 sourcing-guide candidate schema and policy. |
| `src/ai/output/registry.ts` | Draft-owned output codecs map the four schema IDs/versions to raw-object Zod parse, evidence policy, canonical protected result, and Draft disposition kind. Generic core sees only the codec interface. |
| `src/ai/providers/text-provider.ts` | Capability-specific Provider-neutral adapter/config/request/result interfaces, including mandatory normalized completion kind. No real adapter. |
| `src/ai/providers/registry.ts` | Exact provider-key lookup; Production starts empty in Phase B. No fallback selection. |
| `src/ai/core/orchestrator.ts` | One server-only generic AI Service Layer implementing normative availability/new-request preparation and claimed execution. It is the only production module allowed to invoke `TextAiProvider.generateText`; contains no Draft switch/union/result kind. |
| `src/ai/internal/preparation.ts` | Non-public generic preparation helper and Phase C Draft enqueue composition seam. Business modules cannot import it; Phase B provides no implementation of the durable port. |
| `src/ai/internal/worker-entry.ts` | Worker-only facade exporting `AiClaimedExecutionService`; import gate permits only the later Phase C Worker/run module and its tests. |
| `src/ai/internal/claimed-run-authority.ts` | Strict `ClaimedAiRunProjectionV1` parser and branded constructor from durable fields. It validates shape/lease/state but does not render a request; core performs provenance reconstruction. |
| `src/ai/server-bundle-marker.ts` | Imports `server-only` and exports the stable literal `CWT_SERVER_AI_BOUNDARY_V1_5F4D7C2A`; generic service and the test-only Next server fixture reference it so minification cannot erase the fixture proof. |
| `src/ai/testing/fake-text-provider.ts` | Test-only deterministic fake adapters and request recorder; no endpoint, SDK, credential, fetch, or Provider claims. |
| `src/ai/testing/synthetic-application/{definition,association,context,output}.ts` | Test-only application bundle with association kind `synthetic_case_association`, result kind `synthetic_review_packet`, and disposition kind `synthetic_probe_verdict`; no Draft imports, no `customer_support`, no `0020`. |
| `src/ai/testing/synthetic-prompts/manifest.v1.json`, `resources/*.json` | Test-only authoritative manifest/resources containing `SYNTHETIC TEST DATA — NOT A CWT FACT`; isolated from the Production mode/root/output and runtime manifest. |
| `src/ai/testing/synthetic-prompts/synthetic-prompt-bundle.generated.ts` | Test-only deterministic derivative generated in an explicit `synthetic-test` mode to a fixed testing path; imports/bytes are rejected from the Production graph/manifest. |
| `src/ai/**/*.test.ts` | Focused unit/contract tests beside the modules above. |
| `src/ai/provider-neutral-foundation.integration.test.ts` | PGlite/read-only config/feature gate/preparation integration tests and no-write assertions. No Provider/network. |
| `src/ai/architecture.static.test.ts` | Runs the architecture verifier and fixtures for every import/re-export/dynamic/computed/alias/literal bypass plus exact Production registry/no-capability conditions. |
| `scripts/verify-ai-architecture.ts` | TypeScript-program/AST/module-resolution/resource/package/transitive-graph verifier specified in Section 19. |
| `test-fixtures/ai-server-bundle/` | Test-only minimal Next server project importing the stable marker and generated Prompt bundle. Its standalone/server output must retain the marker/tuple bytes and contain no client marker. Excluded from Production registry and app graph. |
| `test-fixtures/ai-architecture/` | Positive/negative source fixtures for each supported or rejected module/literal form; not compiled into Production. |
| `scripts/check-public-bundle.mjs` | Add server-AI/testing/provider markers to the current forbidden list. |
| `src/public-site/public-bundle-check.test.ts` | Extends the current checker with a generated positive public-leak fixture containing the stable marker and a clean fresh production-build assertion. |
| `next.config.ts` | No Production route or AI integration. The test-only bundle fixture has its own standalone config; Production config changes only if later raw-file tracing replaces the accepted static-byte bundle, which V1.1 does not choose. |
| `package.json` | Adds `generate:ai-prompts`, check-only `check:ai-prompts`, `check:ai-architecture`, and test-only bundle-probe commands; adds them to the applicable Phase B check chain. Adds no dependency. |

Phase B must not create `src/ai/adapters/`, a Production Prompt body, an AI credential variable, an application route, an Admin screen, a run repository, or a Worker. Production raw bytes are deliberately absent; manifest/generator/loader behavior is proven with isolated Synthetic resources and the test-only server-bundle fixture. Generated Production bundle files are checked-in derivatives, not a second authority: every build verifies exact regeneration from manifest/resource authority.

## 8. TypeScript contract draft

The signatures below are normative. Implementation names may change only if Fresh Re-review records an exact equivalent. Core types deliberately do not mention Draft, Product, Content, Editorial Revision, protected Draft candidate, or human disposition values.

```ts
export type JsonPrimitive = null | boolean | number | string;
export type ReadonlyJsonValue =
  | JsonPrimitive
  | readonly ReadonlyJsonValue[]
  | ReadonlyJsonObject;
export type ReadonlyJsonObject = { readonly [key: string]: ReadonlyJsonValue };

export type AiServiceResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: SafeAiError };

declare const applicationReadScopeBrand: unique symbol;
export interface ApplicationReadScope {
  readonly [applicationReadScopeBrand]: true;
  readonly mode: "read_only" | "governed_enqueue_transaction";
}

export interface TransactionBoundReadScope extends ApplicationReadScope {
  readonly mode: "governed_enqueue_transaction";
}

export interface AuthorizedAssociationSnapshot<TAssociation> {
  readonly association: TAssociation;
  readonly snapshot: ReadonlyJsonObject;
  readonly snapshotHash: string;
}

export type PromptVariablesV1 = Readonly<Record<
  string,
  string | ReadonlyJsonValue
>>;

export type AiCapability = "text";

export interface CoreAiActorV1 {
  readonly principalId: string;
  readonly roleKey: string;
}

export interface CoreOrchestrationCommandV1 {
  readonly version: 1;
  readonly applicationClass: string;
  readonly useCase: string;
  readonly capability: AiCapability;
  readonly actor: CoreAiActorV1;
  readonly idempotencyKey?: string;
  readonly applicationPayload: unknown;
}

export interface ApplicationAssociationEnvelopeV1 {
  readonly kind: string;
  readonly snapshot: ReadonlyJsonObject;
  readonly snapshotHash: string;
}

export interface DurableApplicationAssociationV1 {
  readonly kind: string;
  readonly persistenceVersion: number;
  readonly value: ReadonlyJsonObject;
}

export interface ProtectedApplicationResultEnvelopeV1 {
  readonly version: 1;
  readonly resultKind: string;
  readonly dispositionKind: string;
  readonly schemaId: string;
  readonly schemaVersion: number;
  readonly policyVersion: string;
  readonly value: ReadonlyJsonObject;
  readonly canonicalJson: string;
  readonly hash: string;
}

export interface ApplicationCommandCodec<TCommand, TAssociation> {
  readonly applicationClass: string;
  readonly useCase: string;
  parse(payload: unknown): AiServiceResult<TCommand>;
  associationFrom(command: TCommand): AiServiceResult<TAssociation>;
}

export interface ApplicationAssociationPolicy<TCommand, TAssociation> {
  readonly associationKind: string;
  authorizeAndSnapshot(input: {
    readonly actor: CoreAiActorV1;
    readonly command: TCommand;
    readonly association: TAssociation;
    readonly scope: ApplicationReadScope;
  }): Promise<AiServiceResult<AuthorizedAssociationSnapshot<TAssociation>>>;
  encodeDurable(snapshot: AuthorizedAssociationSnapshot<TAssociation>):
    AiServiceResult<DurableApplicationAssociationV1>;
  decodeDurable(input: ReadonlyJsonObject):
    AiServiceResult<AuthorizedAssociationSnapshot<TAssociation>>;
}

export interface ApplicationContextPolicy<TCommand, TAssociation, TContext> {
  readonly contextPolicyId: string;
  buildReconstructibleContext(input: {
    readonly actor: CoreAiActorV1;
    readonly command: TCommand;
    readonly association: AuthorizedAssociationSnapshot<TAssociation>;
    readonly scope: ApplicationReadScope;
  }): Promise<AiServiceResult<TContext>>;
  parseDurableContext(input: unknown): AiServiceResult<TContext>;
  buildPromptVariables(context: TContext): AiServiceResult<PromptVariablesV1>;
}

export interface ApplicationProtectedResultPolicy<
  TContext,
  TOutput extends ReadonlyJsonObject,
> {
  readonly outputSchemaId: string;
  readonly outputSchemaVersion: number;
  readonly resultKind: string;
  readonly dispositionKind: string;
  parseAndProtect(input: {
    readonly rawObject: ReadonlyJsonObject;
    readonly context: TContext;
  }): AiServiceResult<
    ProtectedApplicationResultEnvelopeV1 & { readonly value: TOutput }
  >;
}

export interface AiApplicationDefinition<
  TCommand,
  TAssociation,
  TContext,
  TOutput extends ReadonlyJsonObject,
> {
  readonly applicationClass: string;
  readonly useCase: string;
  readonly capability: "text";
  readonly commandCodec: ApplicationCommandCodec<TCommand, TAssociation>;
  readonly associationPolicy: ApplicationAssociationPolicy<TCommand, TAssociation>;
  readonly contextPolicy: ApplicationContextPolicy<TCommand, TAssociation, TContext>;
  readonly resultPolicy: ApplicationProtectedResultPolicy<TContext, TOutput>;
  readonly promptContractId: string;
  readonly inputSchemaVersion: number;
  readonly policyVersion: string;
}
```

The generic registry erases type parameters only after validating that all members agree on the same application/use-case/capability and that the association/result/disposition kinds are non-empty, bounded, versioned, and unique where required. Erasure yields opaque callable closures, not casts that let core inspect application values.

The current Draft facade owns these types:

```ts
export type ProductionAiUseCase =
  | "seo_content_draft"
  | "fabric_knowledge_draft"
  | "product_description_draft"
  | "sourcing_guide_draft";

export interface AiActor {
  readonly userId: string;
  readonly role: UserRole;
}

export type DraftTarget =
  | { readonly type: "product_draft"; readonly productId: string; readonly locale: "en"; readonly expectedVersion: number }
  | { readonly type: "content_draft"; readonly contentId: string; readonly locale: "en"; readonly expectedVersion: number }
  | { readonly type: "editorial_revision"; readonly revisionId: string; readonly expectedVersion: number };

export interface DraftAssistanceCommandV1 {
  readonly useCase: ProductionAiUseCase;
  readonly actor: AiActor;
  readonly target: DraftTarget;
  readonly idempotencyKey: string;
  readonly contextSelections: readonly ExplicitContextSelector[];
  readonly explicitInput?: string;
}

export interface DraftAssistanceAvailabilityQueryV1 {
  readonly useCase: ProductionAiUseCase;
  readonly actor: AiActor;
  readonly target: DraftTarget;
  readonly contextSelections: readonly ExplicitContextSelector[];
  readonly explicitInput?: string;
}

export interface AiAvailabilityV1 {
  readonly available: boolean;
  readonly manualEditorAvailable: boolean;
  readonly code: AiErrorCode | "available";
}

export interface AiRunSummaryV1 {
  readonly runId: string;
  readonly applicationClass: "draft_assistance";
  readonly useCase: ProductionAiUseCase;
  readonly status: "pending" | "processing" | "draft_ready" | "failed" | "cancelled";
  readonly queuedAt: string; // canonical UTC ISO-8601 from durable row
}

export interface DraftAssistanceService {
  inspectDraftAssistanceAvailability(
    query: DraftAssistanceAvailabilityQueryV1,
  ): Promise<AiServiceResult<AiAvailabilityV1>>;
  requestDraftAssistance(
    command: DraftAssistanceCommandV1,
  ): Promise<AiServiceResult<AiRunSummaryV1>>;
}
```

`facade.ts` maps a Draft command to `CoreOrchestrationCommandV1` with `applicationClass="draft_assistance"` and a strict Draft application payload. It performs no orchestration and core never imports the Draft types.

The interface is the future composed surface, but Phase B Production constructs only its availability half. The request factory requires a real `DraftAiRunEnqueuePort` at construction; Phase B supplies none and does not create a callable Production request instance. Availability reports `integration_not_ready` only after the shared actor/target/context checks. Phase C supplies the first request composition.

Preparation returns only durable, reconstructible material:

```ts
export interface PreparedRequestIdentityV1 {
  readonly idempotencyKey: string;
  readonly fingerprintVersion: 1;
  readonly fingerprint: string;
  readonly requestedByPrincipalId: string;
}

export interface PromptTupleV1 {
  readonly promptId: string;
  readonly promptVersion: number;
  readonly promptHash: string;
}

export interface ProviderEnvelopeIdentityV1 {
  readonly version: number;
  readonly hash: string;
}

export interface SafeInputSourceReferenceV1 {
  readonly alias: string;
  readonly sourceClass: string;
  readonly sourceIdentity: ReadonlyJsonObject; // persistence/Audit scope only
  readonly selectedFields: readonly string[];
  readonly fieldProvenance: readonly {
    readonly field: string;
    readonly provenance: "structural" | "provided" | "verified";
  }[];
}

export interface ResolvedModelConfigV1 {
  readonly modelConfigId: string;
  readonly modelConfigVersion: number;
  readonly resolvedConfigHash: string;
  readonly requestedProvider: string;
  readonly actualProvider: string;
  readonly requestedModel: string;
  readonly parametersSnapshot: ReadonlyJsonObject;
  readonly maxInputTokens: number;
  readonly maxOutputTokens: number;
  readonly maxAttempts: number;
  readonly runCostLimitMicrousd: number;
}

export interface PreparedCoreRunV1 {
  readonly version: 1;
  readonly applicationClass: string;
  readonly useCase: string;
  readonly capability: "text";
  readonly requestIdentity: PreparedRequestIdentityV1;
  readonly association: DurableApplicationAssociationV1;
  readonly associationSnapshotHash: string;
  readonly resolvedConfig: ResolvedModelConfigV1;
  readonly promptIdentity: PromptTupleV1;
  readonly providerEnvelope: ProviderEnvelopeIdentityV1;
  readonly inputSchemaVersion: number;
  readonly outputSchemaId: string;
  readonly outputSchemaVersion: number;
  readonly policyVersion: string;
  readonly resultKind: string;
  readonly dispositionKind: string;
  readonly inputSources: readonly SafeInputSourceReferenceV1[];
  readonly inputContext: ReadonlyJsonObject;
  readonly inputHash: string;
}

interface AuthorizedReplayLookupV1 {
  readonly idempotencyKey: string;
  readonly requestedByPrincipalId: string;
  readonly association: DurableApplicationAssociationV1;
  readonly fingerprintVersion: 1;
  readonly fingerprint: string;
}

type ReplayLookupResultV1 =
  | { readonly kind: "new_request" }
  | { readonly kind: "exact_replay"; readonly summary: AiRunSummaryV1 };

interface TransactionBoundDraftEnqueueScope extends TransactionBoundReadScope {
  findReplay(input: AuthorizedReplayLookupV1): Promise<AiServiceResult<ReplayLookupResultV1>>;
  insertPrepared(input: PreparedCoreRunV1): Promise<AiServiceResult<AiRunSummaryV1>>;
}

interface DraftAiRunEnqueuePort {
  withGovernedTransaction<T>(work: (
    scope: TransactionBoundDraftEnqueueScope,
  ) => Promise<AiServiceResult<T>>): Promise<AiServiceResult<T>>;
}
```

The generic request orchestrator owns the callback ordering: authorize/context/fingerprint, `findReplay`, and only for a new request feature/config/Prompt preparation followed by `insertPrepared`. The Phase C scope owns scoped run lookup, the unique-conflict fetch, insert/Audit atomics, and transaction lifetime; it cannot call an adapter. This split prevents a port from resolving config before replay and prevents core from issuing run SQL.

`PreparedCoreRunV1` contains no rendered Prompt/request and no credential/endpoint. `inputContext` contains every sanitized value required to rebuild Prompt variables; Phase C persists it unchanged as `input_context_json`. The Draft enqueue adapter is the only module that maps Draft durable association/result semantics to accepted `0020`. Phase B supplies no fake or in-memory implementation of this port.

The Worker supplies the durable projection below. It must never supply a ready-made `ProviderNeutralTextRequestV1`.

```ts
declare const claimedRunBrand: unique symbol;

export interface ClaimedAiRunProjectionV1 {
  readonly [claimedRunBrand]: true;
  readonly version: 1;
  readonly runId: string;
  readonly applicationClass: string;
  readonly capability: "text";
  readonly useCase: string;
  readonly durableAssociation: ReadonlyJsonObject;
  readonly targetSnapshotHash: string;

  readonly modelConfigId: string;
  readonly modelConfigVersion: number;
  readonly resolvedConfigHash: string;
  readonly requestedProvider: string;
  readonly requestedModel: string;
  readonly parametersSnapshot: ReadonlyJsonObject;
  readonly maxInputTokens: number;
  readonly maxOutputTokens: number;
  readonly maxAttempts: number;
  readonly runCostLimitMicrousd: number;

  readonly promptId: string;
  readonly promptVersion: number;
  readonly promptHash: string;
  readonly providerEnvelopeVersion: number;
  readonly providerEnvelopeHash: string;
  readonly inputSchemaVersion: number;
  readonly outputSchemaId: string;
  readonly outputSchemaVersion: number;
  readonly policyVersion: string;
  readonly inputContext: ReadonlyJsonObject;
  readonly inputHash: string;

  readonly status: "processing";
  readonly retryState: "none";
  readonly attemptCount: number;
  readonly leaseToken: string;
  readonly leaseExpiresAt: Date;
  readonly stateVersion: number;
  readonly activeAttemptDispatchedAt: Date;
  readonly providerDispatchedAt: Date;
}

export interface ExecuteClaimedTextAttemptCommand {
  readonly claimed: ClaimedAiRunProjectionV1;
  readonly signal: AbortSignal;
}

export type AiAttemptResult<TProtected> =
  | {
      readonly kind: "protected_result";
      readonly protectedResult: TProtected;
      readonly returnedModel: string;
      readonly responseStatus: "success";
      readonly usage?: NormalizedTokenUsage;
      readonly providerRequestId?: string;
      readonly durationMs: number;
    }
  | {
      readonly kind: "failure";
      readonly error: SafeAiError;
      readonly responseStatus: NormalizedProviderResponseStatus;
      readonly retryClass: "same_provider_transient" | "not_retryable";
      readonly durationMs: number;
    };

export interface AiClaimedExecutionService {
  executeClaimedTextAttempt(
    command: ExecuteClaimedTextAttemptCommand,
  ): Promise<AiAttemptResult<ProtectedApplicationResultEnvelopeV1>>;
}
```

The internal core-owned constructor accepts the exact Phase C database projection, resolves `outputSchemaId` only from durable `(application_class,use_case,output_schema_version)` through the immutable registry, verifies all required fields/non-null lease state, deep-copies JSON values, deep-freezes the projection, and creates the brand. The Worker cannot nominate a schema ID. The brand proves only that the constructor ran. The durable row plus registered application definition, exact Prompt bytes, JCS hashes, envelope/policy identities, and lease/state checks are authority.

Caller matrix:

| API/boundary | May call | Must not call |
|---|---|---|
| `inspectDraftAssistanceAvailability` | Future authorized Product/Content Domain Services through the Draft facade | UI/client/public pages, anonymous or API routes directly, unrelated roles |
| `requestDraftAssistance` | Future authorized Product/Content Domain Services; operational only with Phase C durable enqueue | UI/Server Actions directly, public modules, Admin loaders, Worker, adapter, arbitrary scripts |
| generic preparation | Draft facade + Phase C transaction composition; focused tests | Business features, UI/action/route, Worker, adapter |
| `executeClaimedTextAttempt` | Phase C Worker through `internal/worker-entry.ts` after durable claim and dispatch marker | Business modules, UI/actions/routes, unclaimed jobs, prepared requests, pre-rendered requests |
| application registry builder | Production composition and test-only Synthetic composition | Business modules/public code; runtime mutation |
| Text adapter | Generic orchestrator only | Draft facade, application policies, business code, Worker direct call |

## 9. Production application/use-case registry

### 9.1 Application-owned definition contract

A registry key is the tuple `(applicationClass, capability, useCase)`. Every entry is a complete immutable `AiApplicationDefinition`. Registry construction fails on a duplicate tuple, missing codec/policy, codec metadata disagreement, duplicate output schema identity within an application, duplicate result/disposition kind with incompatible schemas, unsupported capability, or unversioned policy. Lookup never defaults.

Core calls opaque entry closures in the normative order; it does not branch on association/result/disposition kind. Application-owned codecs must produce strict JSON-compatible envelopes and versioned hashes. Current Draft codecs are responsible for:

- parsing the three-member `DraftTarget` union;
- mapping it to/from the accepted `ai_runs.target_*` columns;
- enforcing Draft authorization/context rules;
- protecting candidate output with `resultKind="draft_candidate"`;
- declaring `dispositionKind="draft_human_review"` and current allowed human outcomes; and
- mapping protected results to `candidate_json`/`candidate_hash` only in Phase C.

Those literals occur under `applications/draft-assistance/**` and the accepted database mapping, never in `core/**`.

### 9.2 Exact Production table

| Use case | Application/capability | Association and condition | Policy caller scope | Context policy | Prompt contract | Output/result/disposition |
|---|---|---|---|---|---|---|
| `seo_content_draft` | `draft_assistance` / `text` | Draft-owned `draft_target.v1`: Product Draft, Content Draft, or editable Product/Content Editorial Revision; parent Draft and English | Admin; Product Editor for Product; Content Editor for Content. Reviewer/Publisher role alone grants no generation. | `ctx.seo-content.v1` | `seo-content-draft` | `cwt.seo-content-draft.v1` / `draft_candidate` / `draft_human_review` |
| `fabric_knowledge_draft` | same | `draft_target.v1`: Content Draft or editable Content Revision with channel exactly `fabric_knowledge` | Admin or Content Editor within record scope | `ctx.fabric-knowledge.v1` | `fabric-knowledge-draft` | `cwt.fabric-knowledge-draft.v1` / same Draft kinds |
| `product_description_draft` | same | `draft_target.v1`: Product Draft or editable Product Revision | Admin or Product Editor within record scope | `ctx.product-description.v1` | `product-description-draft` | `cwt.product-description-draft.v1` / same Draft kinds |
| `sourcing_guide_draft` | same | `draft_target.v1`: Content Draft or editable Content Revision with channel exactly `china_sourcing_guide` | Admin or Content Editor within record scope | `ctx.sourcing-guide.v1` | `sourcing-guide-draft` | `cwt.sourcing-guide-draft.v1` / same Draft kinds |

All use `inputSchemaVersion=1`, `outputSchemaVersion=1` and versioned policy strings. The Production tuple is statically declared as exactly these four keys; a set-equality test rejects missing/extra/duplicate entries. Production source, resources, configuration bootstrap, and application graph contain no `customer_support` key. Runtime untrusted lookup of that string reaches the unknown-key path described in Section 18 only after the coarse actor shield and before feature/config reads.

Accepted `0020` remains intentionally Draft-specific: `application_class='draft_assistance'` and the four use cases only. That physical constraint is not generalized in Phase B.

### 9.3 Strong Synthetic application-neutral proof

The test-only registry is created in a test file by adding one definition to a fresh registry builder. It imports only generic core/application interfaces and Synthetic files, not Draft contracts or Production registry internals:

```ts
type SyntheticAssociation = {
  readonly kind: "synthetic_case_association";
  readonly suiteKey: string;       // /^[a-z][a-z0-9_]{0,31}$/
  readonly sampleOrdinal: number;  // integer 1..100
  readonly epochLabel: string;     // 1..32, no Draft/entity UUID
};

type SyntheticProtectedValue = {
  readonly kind: "synthetic_review_packet";
  readonly observation: string;    // bounded conspicuous fixture text
  readonly evidenceLabels: readonly string[];
};

const syntheticDisposition = {
  kind: "synthetic_probe_verdict",
  values: ["acknowledged", "discarded"] as const,
};
```

Its tuple is `("synthetic_test_application","text","synthetic_extensibility_probe")`. Its association cannot be assigned to `DraftTarget`, its result is not a Draft Block/candidate, and its disposition values are not `not_evaluated/accepted/accepted_with_edits/rejected`. It owns a separate command codec, authorization/context policy, Prompt manifest/resource, output schema, result protector, and fake configuration. The generic preparation/reconstruction/one-call/parser/result flow passes by composing the registry in test code only.

The proof has two enforcement assertions:

1. the test patch/fixture imports no file below `applications/draft-assistance` and does not modify/import-switch `core/orchestrator.ts` or `core/contracts.ts`; an architecture fixture compiles the second application against the published generic interfaces; and
2. no Synthetic association/result is offered to the Draft enqueue port or inserted into `ai_runs`. The test uses an ephemeral claimed projection helper and no run repository.

A future `customer_support` application must receive a separate Owner-approved security/privacy/application design plus forward Schema support for its association and disposition. It can supply new application codecs/policies/registry entry without changing generic core orchestration contracts. Current Production still contains no key, data, Prompt, route, message, tool, retrieval, or customer capability.

## 10. Feature and `ai_model_config` resolution

### 10.1 Environment and feature boundary

`ai_model_config` has no `app_environment` column. This remains sufficient because CWT environments use isolated databases. Trusted `env.APP_ENV` and the current environment-selected `AppDatabase` are supplied by server composition; neither actor, request, config row, Prompt, nor adapter may override them. Phase B allows preparation only in `local` or `test` and fails closed in `staging`/`production` because Provider/network/deployment is not authorized.

After the actor/use-case/association authorization steps fixed in Section 18, preparation checks occur exactly once in this order:

1. application context construction/validation and request-fingerprint inputs;
2. request mutation only: scoped idempotency replay lookup and immediate exact replay;
3. availability only: trusted durable-enqueue composition readiness;
4. trusted environment allowlist;
5. process upper bound `env.FEATURE_AI`;
6. one read of `feature_flags.key='ai'` in the same read/transaction scope;
7. one `ai_model_config` resolution query;
8. adapter policy, Prompt manifest/resource, envelope, parameter, token/cost validation.

This list is not a second orchestration algorithm; Section 18 is the sole normative availability/request sequence and error precedence.

### 10.2 Single consistent repository result

The repository port is:

```ts
interface AiModelConfigResolutionReadV1 {
  readonly version: 1;
  readonly applicationClass: string;
  readonly capability: "text";
  readonly useCase: string;
  readonly totalRowCount: number;
  readonly defaultRowCount: number;
  readonly enabledDefaultRowCount: number;
  readonly enabledDefaultRows: readonly AiModelConfigRow[];
}

interface AiModelConfigRepository {
  readResolutionState(
    scope: TransactionBoundReadScope,
    key: { readonly applicationClass: string; readonly capability: "text"; readonly useCase: string },
  ): Promise<AiModelConfigResolutionReadV1>;
}
```

The accepted-`0020` PostgreSQL implementation first requires `applicationClass="draft_assistance"`, because the current table/checks are Draft-only, then executes one parameterized SQL statement through the supplied scope. It does not use `LIMIT`, issue a later diagnostic query, or return arbitrary alternatives. Synthetic tests supply their own application-aware read port and never call this implementation. A future forward persistence design can add application-aware storage without changing the core selection-key contract.

```sql
WITH scoped AS MATERIALIZED (
  SELECT <all 21 ai_model_config columns>
  FROM ai_model_config
  WHERE capability = $1 AND use_case = $2
),
facts AS (
  SELECT
    count(*)::integer AS total_row_count,
    count(*) FILTER (WHERE is_default)::integer AS default_row_count,
    count(*) FILTER (WHERE enabled AND is_default)::integer AS enabled_default_row_count
  FROM scoped
)
SELECT
  'draft_assistance' AS application_class,
  $1 AS capability,
  $2 AS use_case,
  facts.total_row_count,
  facts.default_row_count,
  facts.enabled_default_row_count,
  COALESCE(
    jsonb_agg(to_jsonb(scoped) ORDER BY scoped.id)
      FILTER (WHERE scoped.enabled AND scoped.is_default),
    '[]'::jsonb
  ) AS enabled_default_rows
FROM facts
LEFT JOIN scoped ON true
GROUP BY facts.total_row_count, facts.default_row_count, facts.enabled_default_row_count;
```

The materialized scoped relation and aggregate are one statement/snapshot. In Phase B availability it runs in the caller's read scope; in Phase C new-request preparation it runs inside the enqueue transaction and can be followed by locking the selected row before insert. No result is cached across requests. Immutable Prompt bytes may be cached by full tuple, but active configuration facts may not.

### 10.3 Repository-result validation and resolution algorithm

Before selecting anything, the resolver validates:

- version/application/capability/use-case equality with the requested tuple;
- all three counts are non-negative safe integers;
- `defaultRowCount <= totalRowCount` and `enabledDefaultRowCount <= defaultRowCount`;
- `enabledDefaultRows.length === enabledDefaultRowCount`;
- every returned row has the exact capability/use case, `enabled=true`, `isDefault=true`, and a distinct ID;
- all 21 row fields pass the accepted Schema-shaped runtime codec.

Any impossible count/list/row combination from a fake port or database decoder is `config_repository_invalid`. No row is dispatched.

Resolution is then exactly:

1. `totalRowCount === 0` -> `config_missing`.
2. `enabledDefaultRowCount > 1` -> `config_ambiguous`. Accepted PostgreSQL prevents this, but corrupt/test ports are fail-closed.
3. `enabledDefaultRowCount === 1` -> select that sole row, regardless of any additional disabled defaults/non-defaults.
4. Otherwise, `defaultRowCount > 0` -> `config_disabled`. This includes one or many disabled defaults even when any number of enabled non-default rows exists.
5. Otherwise -> `config_default_missing`.
6. Validate capability/use case, non-null-forbidden fallback, accepted limits, budget, provider registry key, adapter model/parameter policy, Prompt tuple/hash/contract, Provider-envelope identity, and policy/output schema agreement.
7. Produce `ResolvedModelConfigV1` and `resolved_config_hash` from exactly the Phase A field set using RFC 8785/JCS in Section 10.4.

No branch chooses another row, disabled row, non-default row, environment-variable model, fallback, alternate Provider/model, or caller override.

Required adversarial cases include:

- three enabled non-default rows plus one disabled default -> `config_disabled`;
- 100 enabled non-default rows plus multiple disabled defaults -> `config_disabled`;
- any positive row count with zero defaults -> `config_default_missing`;
- one enabled default plus arbitrary disabled/default/non-default rows -> sole enabled default;
- two enabled defaults from a corrupt port -> `config_ambiguous`;
- mismatched counts, duplicate selected IDs, wrong flags/key, omitted selected row, or unsafe count -> `config_repository_invalid`.

### 10.4 RFC 8785/JCS canonical JSON

The core utility implements RFC 8785/JCS for an accepted I-JSON-compatible value domain, not a custom integer-only subset:

- accepted values are `null`, booleans, Unicode strings without lone surrogates, finite ECMAScript/IEEE-754 numbers, dense arrays, and plain own-property objects;
- `NaN`, positive/negative infinity, `undefined`, BigInt, Symbol, Function, sparse arrays, cyclic values, Dates/Maps/Sets/classes/accessors, and non-plain prototypes fail `canonicalization_failed`;
- finite decimals are accepted by core; an adapter parameter policy may independently impose integer/range/step constraints and must report `parameters_invalid` rather than redefining canonicalization;
- number serialization follows ECMAScript shortest round-trippable form required by JCS; negative zero canonicalizes to `0`;
- object keys sort lexicographically by raw UTF-16 code units; array order is preserved;
- strings/keys are preserved exactly with no NFC/NFD or case normalization; required JSON escaping is deterministic; invalid lone surrogates are rejected;
- the canonical string is encoded as UTF-8 and SHA-256 is lowercase hex.

Implementation uses no new JCS dependency: first recursively validate the accepted domain and cycle/prototype constraints; serialize validated strings and finite numbers with the Node 24 ECMAScript `JSON.stringify` primitive algorithm (after mapping negative zero to numeric zero); sort object own keys by UTF-16 code units; recursively concatenate `{`, `}`, `[`, `]`, comma, and colon without whitespace. `JSON.stringify` is never used to parse Provider output and is not allowed to silently drop/replace an invalid value.

Tests embed the complete published RFC 8785 sample vector (including `333333333.33333329 -> 333333333.3333333`, `4.50 -> 4.5`, `2e-3 -> 0.002` and `-0 -> 0`), the published property-order vector (`CR`, `1`, U+0080, `ö`, `€`, grinning-face surrogate pair, Hebrew ligature), and all RFC 8785 Appendix B IEEE-754 serialization vectors. Tests also cover Unicode preservation versus normalization, invalid surrogates, every invalid JS value above, and nested key ordering.

A PGlite/PostgreSQL-shaped round-trip test inserts and reads `parameters_json` cases such as `{"temperature":0.25,"top_p":0.9,"count":1,"negative_zero":-0}`, applies the adapter policy separately, and proves the JCS hash is stable after JSONB semantic round-trip. Values outside an adapter's policy fail there even though JCS can canonicalize them.

The exact `resolved_config_hash` input remains the Phase A object:

```text
model_config_id, model_config_version, capability, use_case,
requested_provider, requested_model, canonical parameters_snapshot_json,
max_input_tokens, max_output_tokens, max_attempts, run_cost_limit_microusd,
prompt_id, prompt_version, prompt_hash,
provider_envelope_version, provider_envelope_hash,
input_schema_version, output_schema_version, policy_version
```

Keys are fixed snake_case as shown; no timestamp, actor, environment, credential, endpoint, fallback, or mutable config object is included.

### 10.5 Switch consistency

A model/config switch remains a later Phase C governed mutation. Every new request performs the one resolution read inside its enqueue transaction and locks/rechecks the sole selected configuration before inserting `pending`. A switch committed before that snapshot affects the new run; one committed after it does not rewrite the run. No active-default cache exists. Historical/claimed runs use only durable snapshots and never re-resolve the active default. Business code is unchanged by a switch.

### 10.6 Configuration/readiness failures

This table applies only after the authorization/ordering decisions in Section 18:

| Condition | Typed code | Effect |
|---|---|---|
| unauthorized environment | `environment_not_authorized` | no config read/run/adapter; manual editor |
| process or DB feature false | `feature_disabled` | authorized context has been validated; no config/run/adapter; manual editor |
| DB feature row missing | `feature_flag_missing` | same |
| no scoped config rows | `config_missing` | no run/adapter |
| disabled default exists; no enabled default | `config_disabled` | no run/adapter |
| rows but no default | `config_default_missing` | no run/adapter |
| more than one enabled default | `config_ambiguous` | no run/adapter; structural alert |
| corrupt port result | `config_repository_invalid` | no run/adapter; structural alert |
| fallback non-null | `fallback_forbidden` | no run/adapter |
| unsupported provider/model/parameter | `provider_unsupported` / `model_unsupported` / `parameters_invalid` | no run/adapter |
| Prompt/contract/hash/bundle failure | Prompt code in Section 17 | no run/adapter |
| zero run budget | `budget_disabled` | no run/adapter |

### 10.7 Mutation, Admin, and Audit ownership

Phase B exposes no config mutation repository, Domain Service, Server Action, route, page, seed, or bootstrap. It performs no create/edit/enable/disable/default switch/Prompt selection/rollback/delete and writes no Audit.

Phase C owns the first governed `ai_model_config` mutation service: Admin-only authorization, optimistic `record_version`, stable locking for a default switch, disable-not-delete retirement, complete registry/Prompt/adapter revalidation, and required Audit in one `runGovernedMutation` transaction. Phase E may add Admin UI/Server Actions that call it. The existing feature-flag service remains only the global kill switch.

## 11. Exact `0020` field mapping

No field below is added, removed, reinterpreted, or migrated in Phase B.

### 11.1 `ai_model_config`

| Field | Phase B mapping |
|---|---|
| `id` | Stable selected config identity copied to prepared snapshot/Phase C `model_config_id`. |
| `capability` | Must be `text` and agree with registry/adapter. |
| `use_case` | Must equal the resolved registry key. |
| `provider` | Exact adapter-registry key; never shown to or set by business caller. |
| `model` | Exact adapter-approved model ID; never hardcoded in business code. |
| `parameters_json` | Strict adapter-specific input, max 8192 DB bytes; unknown/forbidden keys fail. |
| `max_input_tokens` | Copied ceiling; adapter estimator/rendered input must fit. |
| `max_output_tokens` | Copied ceiling passed through Provider-neutral request. |
| `max_attempts` | Copied provenance only in Phase B; Phase C owns attempt/retry enforcement. |
| `run_cost_limit_microusd` | Copied limit; zero degrades disabled. Pricing/budget enforcement is Phase C/D. |
| `prompt_id` | Exact immutable resource ID. |
| `prompt_version` | Exact positive immutable version. |
| `prompt_hash` | Must equal computed resource SHA-256. |
| `enabled` | Only true rows can resolve. |
| `is_default` | Only true rows can resolve. |
| `fallback_config_id` | Must be null; non-null is rejected, not traversed. |
| `record_version` | Copied to `model_config_version`; later locks/switches use it. |
| `created_by_user_id` | Read as provenance but not emitted to Provider or ordinary telemetry. |
| `updated_by_user_id` | Read as provenance but not emitted to Provider or ordinary telemetry. |
| `created_at` | Read-only diagnostic/provenance; not part of resolved config hash. |
| `updated_at` | Read-only diagnostic/provenance; not part of resolved config hash. |

### 11.2 `ai_runs`

| Field | Source/owner under this design |
|---|---|
| `id` | Phase C durable insert; never synthesized by Phase B execution. |
| `application_class` | Registry: `draft_assistance`. |
| `capability` | Registry: `text`. |
| `use_case` | Exact Production registry key. |
| `requested_by_user_id` | Authorized request actor; omitted from Provider payload/ordinary telemetry. |
| `idempotency_key` | Caller-generated UUID validated in preparation; Phase C uniqueness authority. |
| `request_fingerprint_version` | Phase B constant `1`. |
| `request_fingerprint` | Phase B canonical semantic request hash per Phase A contract. |
| `target_type` | Draft association codec output; Phase C maps only accepted `product_draft`/`content_draft`/`editorial_revision`. Generic core sees a durable association envelope. |
| `target_product_id` | Set only for Product Draft target. |
| `target_content_id` | Set only for Content Draft target. |
| `target_revision_id` | Set only for editable Revision target. |
| `target_locale` | `en` for Product/Content Draft; null for Revision. |
| `expected_target_version` | Application policy's rechecked `editor_document_version` or Revision `draftVersion`. |
| `target_snapshot_hash` | Draft association policy JCS hash of the authorized target snapshot; claimed core recomputes it from the durable association projection before dispatch. |
| `model_config_id` | Resolved `ai_model_config.id`. |
| `model_config_version` | Resolved `record_version`. |
| `resolved_config_hash` | Phase B RFC 8785/JCS hash over the exact Phase A field set; claimed core reconstructs that object from durable columns and requires equality before dispatch. |
| `requested_provider` | Resolved config provider. |
| `actual_provider` | Phase C/D dispatch marker/result; must equal requested for usable candidate. |
| `requested_model` | Resolved config model. |
| `returned_model` | Normalized adapter result; mismatch becomes `model_drift`. |
| `parameters_snapshot_json` | Adapter-validated canonical safe parameters. |
| `max_input_tokens` | Copied config ceiling. |
| `max_output_tokens` | Copied config ceiling. |
| `max_attempts` | Copied config ceiling; enforced in Phase C. |
| `prompt_id` | Resolved resource ID. |
| `prompt_version` | Resolved resource version. |
| `prompt_hash` | SHA-256 of exact manifest-bundled raw resource bytes; claimed core reloads the stored tuple and recomputes it. |
| `provider_envelope_version` | Exact adapter-registry envelope identity; fake identity only in tests until Phase D. |
| `provider_envelope_hash` | Exact adapter-registry envelope hash; claimed execution compares stored version/hash to the compiled adapter descriptor and never substitutes. |
| `input_schema_version` | Registry/context contract, initially `1`. |
| `output_schema_version` | Use-case output contract, initially `1`. |
| `policy_version` | Registry policy identity. |
| `input_sources_json` | Phase B safe source references only; no bodies/URLs/Object Keys. |
| `input_context_json` | Exact strict `ReconstructibleDraftContextV1`: application/use-case/association identity, locale, ordered sanitized source values/provenance, task controls, and every Prompt-variable input. It excludes rendered Prompt/request and is sufficient for deterministic reconstruction. |
| `input_hash` | RFC 8785/JCS SHA-256 of the whole strict `input_context_json`; claimed core recomputes it before variable building. |
| `attempt_history_json` | Phase C/D append-only normalized summaries; Phase B returns one normalized attempt object but does not persist it. |
| `candidate_json` | Draft application's protected result value only (`resultKind=draft_candidate`); persisted only by Phase C fenced transition after raw framing/Zod/evidence policy. Synthetic/non-Draft results never map here. |
| `candidate_hash` | RFC 8785/JCS hash of the final protected Draft result, including core-derived candidate refs; Phase C persists it under lease/state fencing. |
| `status` | Phase C only; inserted `pending`, never set by Phase B. |
| `retry_state` | Phase C only. |
| `attempt_count` | Phase C only. |
| `next_attempt_at` | Phase C only. |
| `lease_owner` | Phase C Worker only. |
| `lease_token` | Phase C claim authority; required by claimed execution. |
| `lease_acquired_at` | Phase C only. |
| `lease_expires_at` | Phase C only; execution receives snapshot but cannot extend it. |
| `active_attempt_dispatched_at` | Phase C dispatch marker before adapter call. |
| `state_version` | Phase C compare-and-swap authority; claimed execution carries expected value. |
| `cancelled_lease_token` | Phase C cancellation/late-accounting authority. |
| `cancelled_by_user_id` | Phase C authorized cancellation. |
| `cancellation_reason` | Phase C bounded safe reason. |
| `cancelled_at` | Phase C. |
| `queued_at` | Phase C insert timestamp. |
| `provider_dispatched_at` | Phase C first successful dispatch-marker timestamp. |
| `generated_at` | Phase C persistence of normalized completion time. |
| `completed_at` | Phase C terminal transition. |
| `generation_duration_ms` | Normalized attempt duration accumulated by Phase C. |
| `updated_at` | Phase C persistence. |
| `input_tokens` | Adapter-normalized optional usage; Phase C/D accounting. |
| `output_tokens` | Adapter-normalized optional usage; Phase C/D accounting. |
| `total_tokens` | Adapter-normalized optional usage; Phase C validates arithmetic. |
| `provider_response_status` | Normalized Phase B contract value persisted by Phase C. |
| `provider_http_status` | Optional safe normalized status; real semantics begin Phase D. |
| `provider_error_code` | Optional bounded sanitized code; never raw body. |
| `provider_request_id` | Optional bounded sanitized ID; never header dump. |
| `failure_code` | Closed CWT safe code mapped by Phase C. |
| `failure_detail` | Fixed/bounded safe detail only, max 500; never raw exception. |
| `execution_environment` | Trusted `env.APP_ENV`; request cannot supply it. Phase C inserts only local/test/staging allowed by Schema. |
| `budget_policy_version` | Trusted Phase C/D pricing/budget registry; test uses `nonbillable-v1`. |
| `budget_timezone` | Phase C accepted value `Asia/Shanghai`. |
| `budget_currency` | Phase C accepted value `USD`. |
| `text_concurrency_limit` | Phase C accepted value `2`. |
| `budget_charge_day` | Phase C first claim. |
| `budget_charge_month` | Phase C first claim. |
| `run_cost_limit_microusd` | Copied resolved config; Phase C admission. |
| `daily_hard_limit_microusd` | Phase C trusted policy. |
| `monthly_warning_limit_microusd` | Phase C trusted policy. |
| `monthly_hard_limit_microusd` | Phase C trusted policy. |
| `estimated_max_cost_microusd` | Phase C/D approved pricing calculation; fake tests remain zero/nonbillable. |
| `actual_cost_microusd` | Phase C/D normalized accounting. |
| `actual_cost_complete` | Phase C/D evidence. |
| `budget_accounted_cost_microusd` | Phase C. |
| `budget_reserved_cost_microusd` | Phase C. |
| `cost_accounting_state` | Phase C. |
| `pricing_snapshot_json` | Phase C/D approved safe pricing evidence; never endpoint/credential. |
| `human_disposition` | Draft application persistence mapping for `dispositionKind=draft_human_review`; Phase E action, initial `not_evaluated`. Generic core does not define these values. |
| `quality_rating` | Phase E optional evaluation. |
| `quality_labels` | Phase E allowlisted evaluation labels. |
| `quality_comment` | Phase E bounded sanitized evaluation. |
| `evaluated_by_user_id` | Phase E authorized evaluator. |
| `evaluated_at` | Phase E. |
| `applied_target_version` | Phase E atomic Draft application result. |
| `applied_revision_id` | Phase E existing Editorial Revision association. |
| `applied_revision_version` | Phase E exact applied Draft version. |

This mapping confirms the Schema is sufficient for Phase B and the planned Phase C handoff. No Schema/ADR finding requires a stop. The future extension of physical checks to a new application/use case is a normal separately reviewed forward Migration, not a core-service refactor.

## 12. Prompt Registry, manifest, raw-byte bundle, and history

### 12.1 Authoritative Production manifest

The authoritative membership file is exactly:

```text
src/ai/prompts/resources/production/manifest.v1.json
```

Its strict JSON schema is:

```ts
interface ProductionPromptManifestV1 {
  readonly manifestVersion: 1;
  readonly entries: readonly {
    readonly promptId: string;
    readonly promptVersion: number;
    readonly sha256: string;
    readonly relativePath: string;
  }[];
}
```

Only those keys are legal. Entries sort by UTF-16 `promptId` then ascending `promptVersion`. `relativePath` is exactly `<prompt-id>/v<version>.<sha256>.json`, uses forward slashes, and contains no `..`, absolute path, backslash, percent-encoding, symlink, or path outside the Production resource root.

Phase B adds no Production body. Its authoritative manifest is exactly one LF-terminated JSON object equivalent to:

```json
{"manifestVersion":1,"entries":[]}
```

The four Production registry definitions reserve Prompt contract IDs but do not create manifest entries. An `ai_model_config` tuple therefore cannot become ready until later reviewed Prompt resources are added; this is intentional manual degradation, not a hidden placeholder.

### 12.2 Immutable raw resource

A later separately reviewed body uses:

```text
src/ai/prompts/resources/production/<prompt-id>/v<positive-integer>.<lowercase-sha256>.json
```

The file is UTF-8 with fatal decoding, no BOM, LF-only, exactly one final LF, at most 32 KiB raw bytes, and one strict JSON object with these keys only:

```ts
interface PromptResourceFileV1 {
  readonly resourceFormatVersion: 1;
  readonly promptId: string;
  readonly promptVersion: number;
  readonly applicationClass: string;
  readonly capability: "text";
  readonly useCase: string;
  readonly locale: "en";
  readonly inputSchemaVersion: number;
  readonly outputSchemaVersion: number;
  readonly policyVersion: string;
  readonly variables: readonly PromptVariableDefinitionV1[];
  readonly body: string;
}
```

The lowercase SHA-256 covers the exact raw file bytes, including final LF. It must equal both filename and manifest `sha256`, and later `ai_model_config.prompt_hash`/`ai_runs.prompt_hash`. The file has no self-hash. Any whitespace, key order, metadata, variable, or body change requires a new version/file/manifest tuple.

Authority is intentionally split without overlap:

- the manifest is the sole Production membership and tuple/path authority;
- the raw resource is the sole Prompt metadata/body byte authority;
- the checked-in generated module is a reproducible transport derivative and never an authority;
- `ai_model_config` selects an existing manifest tuple but cannot create/change Prompt bytes;
- `ai_runs` snapshots the selected tuple/hash but is not a Prompt store.

Every resource must be referenced by exactly one manifest tuple and every tuple must resolve to exactly one regular file. The first version of a Prompt ID is exactly `1`; later versions are consecutive positive integers. Unreferenced/stale files, missing files, symlinks, duplicate `(promptId,promptVersion)`, duplicate paths, duplicate tuple objects, duplicate hash across distinct tuples, internal metadata disagreement, skipped/non-monotonic version, or a manifest entry for an unknown Production registry contract fail the check. A file cannot be found by directory scanning at runtime.

### 12.3 Deterministic checked-in byte bundle

`scripts/generate-ai-prompt-bundle.ts --scope production` reads only the authoritative Production manifest and named resources and deterministically emits:

```text
src/ai/prompts/generated/production-prompt-bundle.generated.ts
```

The module contains a fixed marker and a statically enumerated tuple:

```ts
export const CWT_PRODUCTION_PROMPT_BUNDLE_MARKER =
  "CWT_SERVER_AI_PROMPT_BUNDLE_V1_91B6E4A3";

export const productionPromptBundleV1 = [
  {
    promptId: "...",
    promptVersion: 1,
    sha256: "...",
    relativePath: "...",
    rawByteLength: 1234,
    rawBase64: "...", // RFC 4648 standard alphabet, padded, no whitespace
  },
] as const;
```

Generation uses exact file bytes; base64 decode must reproduce byte-for-byte input. The generated file has stable formatting/order and a header saying generated/do-not-edit. `scripts/verify-ai-prompt-bundle.ts` generates expected text in memory and byte-compares it with the checked-in module. Any stale/manual generated edit fails before typecheck/build. Phase B's Production bundle is an empty tuple but still carries the marker.

The generator accepts only two closed modes: `production` with the exact Production input/output paths above, and `synthetic-test` with exact `src/ai/testing/synthetic-prompts/{manifest.v1.json,resources/**,synthetic-prompt-bundle.generated.ts}` paths. It accepts no caller-provided root/output. Production mode rejects the Synthetic marker/path; Synthetic mode requires it. Runtime Production imports only the Production derivative.

Runtime `loader.ts` uses one static ESM import of this generated module. It never calls `readdir`, constructs a dynamic import, imports JSON as an object, or reads a deployment-relative file. On load it decodes base64, checks declared byte length, SHA-256, fatal UTF-8, resource schema, internal/manifest tuple equality, and registry agreement. Cache key is the full `(promptId,promptVersion,sha256)` only. This preserves the exact raw bytes in Next server output without relying on filesystem output tracing.

The test-only Next project at `test-fixtures/ai-server-bundle/` builds with `output: "standalone"`. Its server route imports the stable server marker, the empty Production generated bundle, and a separately generated Synthetic raw-byte fixture bundle. The gate proves:

1. the server chunk/standalone tree contains `CWT_SERVER_AI_BOUNDARY_V1_5F4D7C2A` and `CWT_SERVER_AI_PROMPT_BUNDLE_V1_91B6E4A3`;
2. executing the standalone fixture decodes the Synthetic embedded base64 to exact resource bytes and hash;
3. neither marker nor Synthetic/Production raw bytes appears in any client reference manifest or client chunk; and
4. the ordinary fresh CWT Production build also contains neither marker in public client bundles.

When Phase E first imports the service into the real server application, the same check additionally requires every Production tuple marker/base64 to be present in a server trace/chunk and absent from clients. Phase B does not add an app route merely to force inclusion.

### 12.4 Protected history comparison

The check-only command is explicit and refuses an inferred base:

```text
tsx scripts/verify-ai-prompt-history.ts \
  --base <exact-approved-git-object> \
  --candidate <exact-candidate-git-object>
```

It uses `git ls-tree` and `git show <object>:<path>`, not working-tree timestamps. The coordinator/review gate supplies the exact last accepted Prompt-history commit as `--base`; `--candidate` is the exact reviewed commit. It refuses missing/unresolvable objects, a dirty implied worktree, merge-base guessing, shallow-missing history, or non-ancestor base.

For the first Phase B implementation, `--base=c6f9714750622d9b977c284b5eeceea93da007a5` has no Prompt resource tree. That absence is defined as the empty protected history, and the Candidate's empty Production manifest/bundle passes. After the first reviewed Production body is accepted, the exact acceptance commit becomes the next protected base.

For every tuple/resource present at the base, Candidate must retain identical tuple, relative path, and raw bytes. Modification, deletion, rename, version reuse, repoint, or removal from the manifest fails. Candidate may append only the next consecutive version after its Prompt ID's maximum. Generated-module differences are accepted only when exact regeneration from the appended authority matches. This history gate is separate from normal Git diff review and cannot be disabled by a comment/allowlist.

Synthetic manifest/resources are under `src/ai/testing/synthetic-prompts/`, use a separate generator/loader fixture, and are never considered Production history. Architecture checks reject any Production manifest/generated entry whose path traverses into `testing` or whose bytes contain the Synthetic promotion marker.

### 12.5 Variable contract and renderer

Placeholder syntax is exactly `{{variable_name}}` with names `^[a-z][a-z0-9_]{0,63}$`. Loader requires exact set equality between placeholders and metadata definitions; duplicate definitions, undeclared placeholders, unused definitions, malformed braces, or a placeholder in metadata keys fails.

Renderer input is built only by the registered application context policy from durable reconstructible context. It requires the exact declared key set; missing/extra keys fail. Variable types are bounded string, strict enum, or strict accepted canonical JSON. Strings preserve Unicode, permit LF but no other control, and meet declared UTF-8 byte limits. JSON passes its application schema before JCS. Caller-supplied Prompt/model/provider/endpoint/tool/file/URL/Secret values are structurally absent.

Rendered instructions plus input are at most 96 KiB and must fit adapter-estimated `max_input_tokens`. Claimed execution reruns the same builder/renderer from stored `input_context_json`; it does not trust preparation-time text.

### 12.6 Four exact variable contracts

| Prompt contract | Version rule | Exact first-version variables/maxima |
|---|---|---|
| `seo-content-draft` | first reviewed body is `v1`; later body/metadata change increments | `locale='en'`; `page_intent` 500 bytes; `primary_phrase` 200; `selected_context_json` JCS 64 KiB; `internal_link_candidates_json` JCS 8 KiB using opaque refs/labels only; `requested_tone` enum `concise_professional_b2b` or `neutral_editorial` |
| `fabric-knowledge-draft` | same | `locale`; `topic` 300; `selected_context_json` 64 KiB; `requested_tone` same enum |
| `product-description-draft` | same | `locale`; `product_context_json` 48 KiB; `media_placement_refs_json` 8 KiB using opaque placement refs only; `requested_tone` same enum |
| `sourcing-guide-draft` | same | `locale`; `guide_intent` 500; `selected_context_json` 64 KiB; `requested_tone` same enum |

No variable carries a database/actor/config ID, Product Code, endpoint, credential, system-Prompt override, tool, retrieval query, file, URL, Object Key, Provider/model override, Publish/Index/Route command, or private/customer record.

### 12.7 Mandatory body policy and Phase B body disposition

Every later Production body must say in reviewed Provider-neutral language that context is untrusted data, only supplied evidence may be used, unknown facts are omitted, no tools/retrieval/files/URLs/external knowledge/actions exist, output is one strict JSON object, and the result is a non-public candidate with no fact/route/Publish/Index authority. It must repeat the use-case factual boundary and forbid empty headings/placeholders.

Phase B invents no Production prose. Synthetic resources are conspicuous fixtures only and cannot be renamed/promoted. With the Production Provider registry empty and Production Prompt manifest empty, all real readiness paths fail closed as `provider_unsupported` or `prompt_not_found` according to Section 18 ordering, leaving manual editing available. Exact Production Prompt prose remains a later business-content review artifact, not an architecture decision and not a reinstated `PD-04`–`PD-07` gate.

## 13. Explicit context, reconstructibility, and Product provenance

### 13.1 Draft selectors and source contracts

The Draft facade accepts selectors, never source bodies or arbitrary field maps:

```ts
export type ExplicitContextSelector =
  | { readonly sourceClass: "public_company_fact"; readonly sourceId: string; readonly fields: readonly CompanyFactField[] }
  | { readonly sourceClass: "product_structured"; readonly sourceId: string; readonly fields: readonly ProductContextField[] }
  | { readonly sourceClass: "fabric_knowledge"; readonly sourceId: string; readonly fields: readonly FabricKnowledgeField[] }
  | { readonly sourceClass: "explicit_human_input"; readonly origin: "typed_brief" | "operator_selected_target_text" };
```

There is no `table`, generic record type, path, URL, file, document, query, raw payload, retrieval request, or automatic source selector. Draft application readers load only narrow authorized projections. The central strict application context policy validates those DTOs; a reader cannot pass extra keys.

`input_sources_json` and `input_context_json` have separate purposes:

- `input_sources_json` is a bounded provenance list that may retain internal source/record/version identities and selected field names for authorized later inspection. It is never sent to a Provider or ordinary telemetry.
- `input_context_json` is the exact Provider-safe retry snapshot. It contains no database/actor/config IDs, URLs, Object Keys, or credentials and is sufficient by itself to rebuild every Prompt variable and Provider-neutral request.

### 13.2 Exact reconstructible durable context

`input_context_json` must pass this strict application-owned shape:

```ts
interface ReconstructibleDraftContextV1 {
  readonly version: 1;
  readonly applicationClass: "draft_assistance";
  readonly capability: "text";
  readonly useCase: ProductionAiUseCase;
  readonly locale: "en";
  readonly association: {
    readonly kind: "draft_target.v1";
    readonly targetType: "product_draft" | "content_draft" | "editorial_revision";
    readonly targetAlias: "target_01";
    readonly expectedVersion: number;
    readonly snapshotHash: string;
  };
  readonly task: {
    readonly tone: "concise_professional_b2b" | "neutral_editorial";
    readonly pageIntent?: string;
    readonly primaryPhrase?: string;
    readonly topic?: string;
    readonly guideIntent?: string;
  };
  readonly sources: readonly ReconstructibleSourceEntryV1[];
  readonly internalLinkCandidates: readonly {
    readonly candidateRef: string;
    readonly label: string;
  }[];
  readonly mediaPlacementRefs: readonly string[];
}
```

Each strict source entry is:

```ts
interface ReconstructibleSourceEntryV1 {
  readonly alias: string; // src_01..src_99, order fixed by selector order then field order
  readonly sourceClass:
    | "public_company_fact"
    | "product_structured"
    | "fabric_knowledge"
    | "explicit_human_input";
  readonly selectedBy: "request_actor";
  readonly fields: readonly {
    readonly field: string;
    readonly ref: string; // <alias>:<field>, unique
    readonly provenance: "structural" | "provided" | "verified";
    readonly value: JsonPrimitive | readonly JsonPrimitive[] | ReadonlyJsonObject;
  }[];
}
```

Sources and fields are in deterministic selector/allowlist order, not database incidental order. Every Prompt JSON variable is a pure projection of this context: SEO uses task page fields, source values, link candidates; Fabric uses topic/source values; Product uses Product source values/media refs; Sourcing uses guide intent/source values. `buildPromptVariables` has no database port and is run both at preparation and claimed execution. JCS of the entire strict object is `input_hash`.

The claimed executor verifies application/use-case/association identity, strict parses the context, recomputes `input_hash`, checks every `ref`/alias/provenance/field against the registered policy version, then rebuilds variables. Any missing value needed by the Prompt contract, added key, reordered/duplicated identity, altered policy field, or hash mismatch stops before adapter resolution.

### 13.3 Product field-by-field provenance matrix

The selector type is closed and intentionally excludes Product Code:

```ts
type ProductContextField =
  | "name"
  | "primaryCategoryLabel"
  | "additionalCategoryLabels"
  | "applicationLabels"
  | "composition"
  | "weightGsm"
  | "widthCm"
  | "moqPair"
  | "fabricStyle"
  | "colorOptions"
  | "moqNote"
  | "customAvailable"
  | "sampleAvailable";
```

The matrix below is exhaustive for `product_structured`. “Structural” means the current Product/relationship schema and authorized Domain Service make the value an identity/editorial association rather than a reviewed technical fact. For optional Product columns that the current service does not place in `product_field_reviews`, a nonblank current database value is classified only as `provided`: the Product row is the supplied-value authority, while no reviewer identity/verification is inferred. Arbitrary review rows for field names outside `reviewProductField`'s five-field union are ignored as invalid provenance. “Provided” never means verified.

| Field | Existing authority / actual service behavior | Eligibility and serialized provenance | Provider-bound? | Narrative use |
|---|---|---|---|---|
| `productCode` | `products.product_code`; generated/corrected by dedicated immutable/Audited flows; Product Data Dictionary marks it Hidden/internal | structural identity only, but excluded from Provider context | **No** | **No**. It cannot appear in title, description, feature, FAQ, Block, Alt Text, Caption, or other AI candidate. It may remain internal target/provenance identity outside `input_context_json`. |
| English `name` | `product_localizations.name` or exact editable Revision snapshot, with `editor_document_version`/`draft_version` rechecked by Product Domain policy | nonblank current authorized value -> `structural`; max 300 chars/UTF-8 1 KiB | Yes | May inform/propose name/narrative; proposed text is still candidate, never direct fact mutation. |
| Primary Category label | `product_taxonomy_terms.is_primary=true` + `taxonomy_term_localizations(locale='en').name`; one-primary unique authority and Product structure service | relation must exist and English label be nonblank -> `structural`; max 200 chars | Yes | Exact label may inform narrative; output has no category ID/mutation/suggestion field in Product Description. |
| Additional Category labels | same tables with `is_primary=false`; Product structure service | explicitly selected relations with English labels, sorted by relation ID before aliasing -> `structural`; max 16 labels, 200 each | Yes | Exact labels may inform narrative only; cannot change authority. |
| Application labels | `product_applications` + `applications` + `application_localizations(locale='en').name`; Product structure service | explicitly selected current relations with nonblank English labels -> `structural`; max 16, 200 each | Yes | Exact labels may inform narrative only; cannot create/remove Applications. |
| `composition` | `products.composition` plus `product_field_reviews`; `updateProductFacts` writes `provided/empty` and `reviewProductField` permits `verified/rejected` | nonblank value and exact review row status `provided` or `verified`; provenance preserved | Yes when explicitly selected | May be repeated/paraphrased only in narrative with the field ref; no composition field/table/patch is emitted. |
| `weightGsm` | `products.weight_gsm numeric(10,2)` plus exact review row | non-null positive value and `provided/verified`; serialize canonical decimal string with no unit embedded | Yes when selected | May support narrative exact GSM only with ref; no GSM field/patch/table. |
| `widthCm` | `products.width_cm numeric(10,2)` plus exact review row | non-null positive value and `provided/verified`; canonical decimal string | Yes when selected | May support narrative exact width only with ref; no width field/patch/table. |
| `moqValue` + `moqUnit` | paired DB Check; `products.moq_*` plus separate review rows; service normalizes unit to `m/kg/roll/yd` | both values non-null, both review rows `provided/verified`, unit allowlisted. Pair provenance is `verified` only if both verified; otherwise `provided`. Never serialize one alone | Yes only as pair | May support narrative exact MOQ only with both refs; no MOQ field/patch/table. |
| `fabricStyle` | `products.fabric_style` written by authorized `updateProductFacts`; no current field-review API/row authority | nonblank current stored value -> `provided` only, never `verified`; max 500 | Yes when selected | May inform bounded narrative with ref; no factual-field output. |
| `colorOptions` | `products.color_options` via same service; no review status authority | nonblank exact stored string -> `provided` only; do not parse/infer a color list; max 2 KiB | Yes when selected | May repeat/summarize only with ref; cannot create options/field patch. |
| `moqNote` | `products.moq_note` via same service; no review status authority; display override is not truth provenance | nonblank current stored string -> `provided` only; max 1 KiB | Yes when selected | May inform MOQ narrative with ref; cannot establish or change MOQ. |
| `customAvailable` | non-null tri-state `products.custom_available` via same service; no review status authority | `yes`/`no` -> `provided`; `unknown` ineligible/omitted | Yes when selected | Exact yes/no may inform narrative with ref; no availability field patch. |
| `sampleAvailable` | non-null tri-state `products.sample_available` via same service; no review status authority | `yes`/`no` -> `provided`; `unknown` ineligible/omitted | Yes when selected | Exact yes/no may inform narrative with ref; no availability field patch. |

`supplierType`, tags, price, evidence/reviewer notes, display overrides, status, user/timestamps, routes/SEO/index, Asset IDs/keys/URLs, real-product evidence note, and every internal ID are excluded.

`ProductContextField` does not include `productCode`; an untrusted selector/raw source that attempts it returns `context_field_forbidden`. The matrix retains the row only to make the explicit No/No decision auditable.

The `moqPair` selector emits exactly two adjacent serialized fields, `moqValue` and `moqUnit`, with separate refs under the same source alias; it emits neither if the pair rule fails. Relationship-list selectors emit one array-valued field each after deterministic sorting. Decimal strings use fixed non-exponent canonical decimal form with trailing fractional zeroes removed; this field serialization rule is separate from RFC 8785 number serialization.

For explicitly selected Product fields, `null`, blank, `unknown`, review `empty`/`rejected`, missing required review row, missing English label, half MOQ pair, invalid unit, nonpositive/invalid decimal, or a field not in this matrix returns `context_field_ineligible`; it is never silently upgraded or sent. Optional values that the actor did not select are simply absent. Unknown direct keys fail strict parsing.

This resolves the Product Description “forbidden output” boundary: Product Code is neither input nor output; technical facts with existing `provided/verified` evidence may assist narrative only. The output grammar has no Product fact/category/Application fields and Phase E conversion can create only narrative/editorial candidate values. It cannot create or modify composition, GSM, Width, MOQ, Product Code, category, or Application authority.

### 13.4 Other source authorities

| Source class | Eligibility | Field provenance | Allowed Provider-safe fields |
|---|---|---|---|
| `public_company_fact` | reuse `currentPublicCompanyFactConditions()` at selection time; deliberate actor selection | `verified` for each emitted field; AI never upgrades/adds a Fact | `factKey`, `subject`, `statement`, `relationshipToCwt`; evidence reference/reviewer/dates/IDs stay provenance-only |
| `fabric_knowledge` | actor-authorized Content with channel exactly `fabric_knowledge`; selected current Draft or approved/public revision under policy | current Draft/selected target text is `provided`; exact approved current revision is `verified` | English title/excerpt and plain text from allowed narrative Blocks; no media/URL/ID/route/SEO/author/legacy unknown Block |
| `explicit_human_input` | typed/selected in current authorized request; strict denial/size scan | `provided` only | bounded plain task brief or selected target text; it cannot create factual/permission authority |

Taxonomy/Application labels exist only inside `product_structured`, not as an automatic corpus. Target text is not auto-included.

### 13.5 Per-use-case source allowlist

| Use case | Allowed source classes |
|---|---|
| `seo_content_draft` | explicit input; Product structured only for Product target; deliberately selected Fabric Knowledge; relevant eligible Company Facts; opaque link refs/labels, never URLs |
| `fabric_knowledge_draft` | target/selected Fabric Knowledge, selected Product structured, explicit input; no Company claim by default |
| `product_description_draft` | target Product structured, selected Fabric Knowledge, explicit input; no Company Facts and no Product Code |
| `sourcing_guide_draft` | selected eligible Company Facts, selected Fabric Knowledge, explicit input; no automatic Product corpus |

Any other combination fails `context_source_forbidden` before config/Prompt rendering according to Section 18.

### 13.6 Denylist and limits

Strict objects reject unknown keys. Before JCS, a bounded recursive scanner rejects normalized key fragments or values representing Inquiry/Contact/Organization/CRM/customer/PII; email/phone/WhatsApp/IP/cookie/session/analytics identity; private attachment/file/document/path/bucket/Object Key; credential/Secret/password/token/header/env; any URL/scheme/domain; tool/function/retrieval/search/knowledge-base/embedding/vector; Provider/model/endpoint override; or Publish/Index/Route/Redirect/Canonical/Sitemap/rights/public-state command. It rejects rather than redacts.

Limits remain:

- explicit input: 8 KiB/item, 16 KiB total;
- Company Facts: 20 entries, 2 KiB statement each, 16 KiB total;
- Product structured context: 32 selected fields/relationships, 16 KiB total;
- Fabric Knowledge: 8 sources, 8 KiB each, 48 KiB total;
- `input_sources_json`: 32 KiB;
- `input_context_json`: 64 KiB, below accepted 128 KiB;
- rendered request: 96 KiB and not above `max_input_tokens`.

## 14. Raw JSON framing, exact candidate grammars, and protection

### 14.1 Completion gate and raw parser

Provider output is untrusted text. The service runs no parser unless the normalized result is `kind="success"`, returned model exactly matches, abort/lease checks pass, and `completion.kind="complete"`. `length_limit` and `unknown` become `output_truncated`; `content_filter` becomes `provider_safety_rejected`; `cancelled` becomes `provider_cancelled`. No partial output is parsed.

`parseOneJsonObjectV1(outputText)` is implemented in `src/ai/output/raw-json.ts` with current dependencies only. It is a bounded recursive-descent JSON lexer/parser, not `JSON.parse` plus Zod. Exact contract:

1. Require a JavaScript string whose UTF-8 byte length is `1..98,304` (96 KiB). Zero/whitespace-only is `output_empty`; oversize is `output_too_large`.
2. Reject BOM, unpaired UTF-16 surrogates, NUL, and invalid Unicode scalar sequences. Adapters that decode bytes must use fatal UTF-8; a replacement character created by non-fatal decoding is an adapter contract failure.
3. Permit only JSON whitespace (`SP`, `TAB`, `LF`, `CR`) before/after the value. First non-whitespace must be `{`. Markdown fences, prose/comments, or any other prefix fail `output_invalid_json`.
4. Parse the RFC 8259 object/array/string/number/`true`/`false`/`null` grammar with maximum nesting depth 32, 10,000 total values, 2,000 object members, and 10,000 array entries. Numbers must become finite ECMAScript numbers; overflow fails.
5. Decode keys while parsing. Every object maintains both exact decoded keys and NFC comparison keys. A duplicate exact key or canonically equivalent key at any nesting depth fails before assignment. Original key/value code points are otherwise preserved; no normalization occurs.
6. Strings reject unescaped control characters, malformed escapes, lone escaped surrogates, and prototype-bearing construction. Objects are built with null prototype and own data properties; `__proto__`, `prototype` and `constructor` are rejected as defense in depth.
7. After one root object, allow JSON whitespace only and require EOF. Concatenated/multiple JSON values, commentary, comments, or trailing bytes fail. Unexpected EOF inside any token is `output_truncated`; other grammar/framing failures are `output_invalid_json`.
8. Return one `ReadonlyJsonObject`. No second JSON parse occurs. The selected application output Zod schema receives exactly this object.

Direct unit cases cover plain/indented valid objects, fences, prefix/suffix prose, line/block comments, two concatenated objects, object+array, trailing comma/bytes, nested exact duplicates, nested NFC-equivalent duplicates, invalid escape/surrogate/number, BOM, NUL, depth/node/member limits, whitespace-only, every token-level truncation point, and 96 KiB boundary ±1 byte.

### 14.2 Evidence primitive and exact candidate Blocks

Provider raw output may not contain `id`, `candidateRef`, `locked`, database/Asset ID, URL, route, or durable association. Every object below is Zod `.strict()`.

`EvidenceText<N>` is exactly:

```ts
interface EvidenceText<N extends number> {
  readonly text: string;            // 1..N Unicode scalar values and use-case byte ceiling
  readonly sourceRefs: readonly string[]; // 0..8, unique, input-order
}
```

`text` must already be trimmed, use LF only, contain no forbidden control/URL/Secret/placeholder, and cannot be transformed by the parser. Each ref matches `^src_[0-9]{2}:[a-z][A-Za-z0-9_]{0,63}$` and must exist in the exact context. Empty refs are allowed only for post-policy-classified connective/editorial language; a factual/numeric/date/currency/percentage/company/technical claim requires at least one supporting field ref.

Raw Block alternatives have these exact keys and bounds:

```ts
type HeadingCandidateBlockV1 = {
  readonly type: "heading";
  readonly level: 2 | 3 | 4;
  readonly text: EvidenceText<500>;
};

type ParagraphCandidateBlockV1 = {
  readonly type: "paragraph";
  readonly text: EvidenceText<20_000>;
};

type FeatureListCandidateBlockV1 = {
  readonly type: "feature_list";
  readonly items: readonly EvidenceText<1_000>[]; // 1..20
};

type BulletListCandidateBlockV1 = {
  readonly type: "bullet_list";
  readonly items: readonly EvidenceText<1_000>[]; // 1..20
};

type CalloutCandidateBlockV1 = {
  readonly type: "callout";
  readonly title?: EvidenceText<500>;
  readonly text: EvidenceText<20_000>;
};

type FaqCandidateBlockV1 = {
  readonly type: "faq";
  readonly items: readonly {
    readonly question: EvidenceText<500>;
    readonly answer: EvidenceText<5_000>;
  }[]; // 1..15
};
```

The four application-specific discriminated unions are explicit:

```ts
type SeoNarrativeBlockV1 =
  | HeadingCandidateBlockV1 | ParagraphCandidateBlockV1
  | BulletListCandidateBlockV1 | CalloutCandidateBlockV1 | FaqCandidateBlockV1;

type FabricNarrativeBlockV1 =
  | HeadingCandidateBlockV1 | ParagraphCandidateBlockV1
  | FeatureListCandidateBlockV1 | BulletListCandidateBlockV1
  | CalloutCandidateBlockV1 | FaqCandidateBlockV1;

type ProductNarrativeBlockV1 =
  | HeadingCandidateBlockV1 | ParagraphCandidateBlockV1
  | FeatureListCandidateBlockV1 | BulletListCandidateBlockV1
  | CalloutCandidateBlockV1 | FaqCandidateBlockV1;

type SourcingNarrativeBlockV1 =
  | HeadingCandidateBlockV1 | ParagraphCandidateBlockV1
  | BulletListCandidateBlockV1 | CalloutCandidateBlockV1 | FaqCandidateBlockV1;
```

No union contains image/gallery/specification/comparison/related/CTA/quote/divider/HTML/script/style or unknown type. Array-level limits are applied by the four outer schemas below.

### 14.3 Exact four outer schemas

```ts
interface SeoContentDraftV1 {
  readonly schemaVersion: 1;
  readonly useCase: "seo_content_draft";
  readonly locale: "en";
  readonly titleProposal?: EvidenceText<120>;
  readonly metaDescriptionProposal?: EvidenceText<320>;
  readonly outline: readonly EvidenceText<300>[]; // 0..20
  readonly blocks: readonly SeoNarrativeBlockV1[]; // 0..40
  readonly internalLinkSuggestions: readonly {
    readonly candidateRef: string; // exact supplied opaque ref; no URL
    readonly anchorText: EvidenceText<200>;
  }[]; // 0..12
}

interface FabricKnowledgeDraftV1 {
  readonly schemaVersion: 1;
  readonly useCase: "fabric_knowledge_draft";
  readonly locale: "en";
  readonly titleProposal?: EvidenceText<300>;
  readonly summaryProposal?: EvidenceText<1_000>;
  readonly outline: readonly EvidenceText<300>[]; // 0..20
  readonly blocks: readonly FabricNarrativeBlockV1[]; // 0..50
}

interface ProductDescriptionDraftV1 {
  readonly schemaVersion: 1;
  readonly useCase: "product_description_draft";
  readonly locale: "en";
  readonly displayNameProposal?: EvidenceText<300>;
  readonly summaryProposal?: EvidenceText<1_000>;
  readonly descriptionBlocks: readonly ProductNarrativeBlockV1[]; // 0..30
  readonly featureProposals: readonly EvidenceText<500>[]; // 0..20
  readonly faqProposals: readonly {
    readonly question: EvidenceText<500>;
    readonly answer: EvidenceText<5_000>;
  }[]; // 0..20
  readonly mediaTextProposals: readonly {
    readonly placementRef: string; // exact supplied opaque placement ref
    readonly altText?: EvidenceText<500>;
    readonly caption?: EvidenceText<1_000>;
  }[]; // 0..12
}

interface SourcingGuideDraftV1 {
  readonly schemaVersion: 1;
  readonly useCase: "sourcing_guide_draft";
  readonly locale: "en";
  readonly titleProposal?: EvidenceText<200>;
  readonly summaryProposal?: EvidenceText<1_000>;
  readonly outline: readonly EvidenceText<300>[]; // 0..24
  readonly blocks: readonly SourcingNarrativeBlockV1[]; // 0..60
}
```

Each outer object is strict, has exactly the required arrays (which may be empty), no unknown keys, and a final protected JCS size at most 64 KiB. Product output has no Product Code, composition/GSM/Width/MOQ/category/Application/specification field. Link/media refs must match the supplied opaque allowlists and never resolve to a URL/Object Key in Provider output.

### 14.4 Post-schema policy, canonical form, and candidate refs

After Zod:

1. verify every source/link/media ref against exact reconstructed context;
2. reject forbidden data/action/public-state content;
3. require exact supporting evidence for numeric/currency/percentage/date/contact/certification/capacity/facility/ownership/MOQ/specification claims;
4. enforce the Product matrix and use-case-specific factual denylist;
5. require at least one meaningful proposal across the outer object and reject empty/placeholder/repeated-spam content and invalid heading progression;
6. compute a pre-ref JCS form for each Block;
7. add a core-derived, non-durable ref to the protected DTO only:
   `cand_<four-digit-ordinal>_<64-lowercase-hex>`, where the hex is SHA-256 of JCS `{useCase,containerPath,ordinal,block}` before refs;
8. require generated refs unique and matching `^cand_[0-9]{4}_[0-9a-f]{64}$`; Provider-supplied `candidateRef`/`id`/`locked` was already rejected by strict schemas;
9. form the final protected application value with schema/use-case/locale/payload plus derived refs, JCS serialize it, enforce 64 KiB, and compute `candidate_hash`.

No whitespace/key sorting/text normalization occurs beyond JCS representation; semantic strings preserve exact code points. Candidate refs are UI/Diff correlation only, not Editorial Block IDs and not a lock authority.

Non-Block proposals have no ID field. The protected UI projection addresses them by deterministic JSON Pointer (for example `/outline/0` or `/faqProposals/2/answer`) derived after validation; the pointer is not stored inside Provider output and is not a lock. No AI proposal can set or clear a target lock.

### 14.5 Phase E conversion to existing Blocks

Only a later authorized Phase E Draft application command may convert accepted candidate items. It reauthorizes actor/target, checks current expected version, presents Diff/Block selection, preserves all existing locked Blocks, and writes Draft/Revision plus required Audit atomically.

For a selected candidate Block, conversion strips `sourceRefs` wrappers and maps:

- heading -> existing `{id,type:"heading",level,text}`;
- paragraph -> `{id,type:"paragraph",text}`;
- feature/bullet list -> `{id,type,items:text[]}`;
- callout -> `{id,type:"callout",title?:text,text}`;
- FAQ -> `{id,type:"faq",items:{question:text,answer:text}[]}`.

The Domain Service—not Provider/core—generates a fresh durable ID using the existing `block_<UUID-without-hyphens>` convention and sets no `locked` property (equivalent false). Candidate refs are never persisted as Block IDs. Existing locked Blocks cannot be replaced/moved/removed; accepting a candidate cannot manufacture a locked Block. The resulting document must pass `parseBlockDocument`; Product context separately rejects specification tables. Title/summary/feature/FAQ/media-text proposals map only through their existing reviewed Draft commands, never direct table writes.

## 15. Provider-neutral request/result normalization

### 15.1 Capability-specific adapter contract

```ts
export interface TextAiProvider {
  readonly key: string;
  readonly capability: "text";
  resolveConfiguration(input: {
    readonly model: string;
    readonly parameters: unknown;
  }): AiServiceResult<ResolvedAdapterConfigurationV1>;
  describeEnvelope(): ProviderEnvelopeIdentityV1;
  estimateInputTokens(request: ProviderNeutralTextRequestV1): AiServiceResult<number>;
  generateText(input: {
    readonly model: string;
    readonly parameters: ReadonlyJsonObject;
    readonly request: ProviderNeutralTextRequestV1;
    readonly signal: AbortSignal;
  }): Promise<ProviderTextResultV1>;
}

export interface ProviderNeutralTextRequestV1 {
  readonly version: 1;
  readonly instructions: string;
  readonly input: string;
  readonly responseFormat: {
    readonly kind: "json_object";
    readonly schemaId: string;
    readonly schemaVersion: number;
  };
  readonly maxOutputTokens: number;
}
```

The request has no tools/functions, retrieval/search, URL/file/image/audio/media, conversation/thread/store ID, endpoint, key/header, fallback, Provider DTO, or caller model override. Application policy builds content; generic core renders; adapter only translates the exact request.

### 15.2 Mandatory completion signal

```ts
export type NormalizedCompletionV1 =
  | { readonly kind: "complete" }
  | { readonly kind: "length_limit" }
  | { readonly kind: "content_filter" }
  | { readonly kind: "cancelled" }
  | { readonly kind: "unknown"; readonly safeCode?: string };

export type ProviderTextResultV1 =
  | {
      readonly kind: "success";
      readonly returnedModel: string;
      readonly completion: NormalizedCompletionV1;
      readonly outputText: string;
      readonly usage?: NormalizedTokenUsage;
      readonly providerRequestId?: string;
      readonly durationMs: number;
    }
  | {
      readonly kind: "failure";
      readonly responseStatus: NormalizedProviderResponseStatus;
      readonly failureCode: ProviderNeutralFailureCode;
      readonly retryClass: "same_provider_transient" | "not_retryable";
      readonly httpStatus?: number;
      readonly providerErrorCode?: string;
      readonly providerRequestId?: string;
      readonly durationMs: number;
    };
```

A transport/protocol success is not necessarily a complete generation. Every adapter must emit one completion variant. If Provider semantics cannot prove terminal completeness, it emits `unknown`; it may not guess `complete`. Real Provider finish-reason mapping is Phase D evidence, but this Provider-neutral obligation is fixed now.

Service order is exact:

1. normalize unexpected adapter throw to fixed `adapter_unexpected_failure`;
2. reject aborted/expired claim;
3. require returned model exact;
4. inspect completion: `complete` continues; `length_limit`/`unknown` -> `output_truncated`; `content_filter` -> `provider_safety_rejected`; `cancelled` -> `provider_cancelled`;
5. only then invoke Section 14 raw parser/Zod/application policy;
6. never invoke a second adapter/model.

A syntactically complete JSON prefix with `length_limit` or `unknown` is rejected before parsing. Empty output with `complete` is `output_empty`. Raw Provider finish string/body/header/exception is never returned/logged; `safeCode` is adapter-allowlisted max 40 ASCII and optional.

No adapter exception/SDK type crosses this boundary. Safe IDs/status/usage are bounded and validated. Credential, endpoint, raw request/response, Prompt/input/output text, headers, exception message, and stack trace are absent from ordinary telemetry.

## 16. Fake adapter contract and limits

Two deterministic test adapters use keys/models that cannot be confused with real Providers, for example:

```text
synthetic_alpha / synthetic-text-alpha-v1
synthetic_beta  / synthetic-text-beta-v1
```

They may test:

- exact configuration/model/parameter selection;
- new-request switching between two fake configs without business/core changes;
- exact rendered request capture in a test recorder;
- mandatory `complete`, `length_limit`, `content_filter`, `cancelled`, and `unknown` completion normalization;
- valid strict JSON plus every raw framing/duplicate/trailing/truncation/Unicode failure in Section 14;
- empty, malformed, unknown-key, wrong-enum, oversized, and forbidden-fact output;
- returned-model drift;
- normalized timeout/transport/rate/quota/auth/safety/server classifications as scripted values;
- abort signal handling; and
- no fallback after any failure.

They must not simulate or imply facts about DeepSeek or another Provider, including endpoint shape, authentication, tokenizer accuracy, price, billing, caching, retention, training, region, cross-border transfer, HTTP behavior, quota, SLA, concurrency, latency, content filtering, idempotency, or retry safety. Fake token/usage values are explicitly `SYNTHETIC_TEST_ONLY` and nonbillable. Fake adapters use no `fetch`, socket, SDK, credential, endpoint, or environment secret.

Fakes do not construct a durable enqueue port, claim/lease authority, retry scheduler, Provider finish mapping, or in-memory history. Claimed-path tests receive a strict durable-shaped fixture through the internal test constructor and then exercise the same Prompt/context/config hash validation and deterministic request reconstruction as Production core. A scripted output proves only CWT normalization; it is never evidence about a real Provider.

## 17. Typed error/result taxonomy

`SafeAiError` is a strict discriminated object:

```ts
interface SafeAiError {
  readonly code: AiErrorCode;
  readonly category: "authorization" | "availability" | "configuration" | "prompt" | "context" | "provenance" | "provider" | "output" | "conflict" | "internal";
  readonly safeMessage: string;
  readonly retryable: boolean;
  readonly manualEditorAvailable: boolean;
  readonly fieldPaths?: readonly string[];
}
```

Error codes are lowercase snake case so Phase C can map approved execution failures directly into the accepted `ai_runs.failure_code` representation:

| Category | Codes |
|---|---|
| Authorization | `authorization_denied`, `target_not_found`, `target_not_editable`, `target_scope_mismatch`, `target_version_conflict` |
| Availability | `environment_not_authorized`, `feature_disabled`, `feature_flag_missing`, `integration_not_ready` |
| Registry/config | `use_case_unknown`, `registry_invalid`, `config_missing`, `config_disabled`, `config_default_missing`, `config_ambiguous`, `config_repository_invalid`, `config_invalid`, `budget_disabled`, `provider_unsupported`, `model_unsupported`, `parameters_invalid`, `fallback_forbidden` |
| Prompt | `prompt_not_found`, `prompt_invalid`, `prompt_manifest_invalid`, `prompt_bundle_invalid`, `prompt_hash_mismatch`, `prompt_contract_mismatch`, `prompt_variables_missing`, `prompt_variables_extra`, `prompt_variable_invalid`, `prompt_too_large` |
| Context | `context_source_forbidden`, `context_field_forbidden`, `context_field_ineligible`, `context_record_unauthorized`, `context_prohibited_data`, `context_too_large`, `input_token_limit_exceeded` |
| Claimed provenance | `association_provenance_mismatch`, `config_provenance_mismatch`, `prompt_provenance_mismatch`, `context_provenance_mismatch`, `envelope_provenance_mismatch`, `policy_provenance_mismatch`, `request_reconstruction_failed` |
| Provider-normalized | `provider_timeout`, `provider_transport_error`, `provider_rate_limited`, `provider_quota_exceeded`, `provider_auth_failed`, `provider_safety_rejected`, `provider_cancelled`, `provider_client_error`, `provider_server_error`, `adapter_unexpected_failure`, `model_drift` |
| Output | `output_empty`, `output_truncated`, `output_invalid_json`, `output_schema_invalid`, `output_policy_rejected`, `output_too_large` |
| Internal/conflict | `claimed_run_required`, `claim_expired`, `state_conflict`, `idempotency_conflict`, `canonicalization_failed`, `internal_failure` |

Only Phase C decides retry scheduling based on `retryClass`, attempt/budget/lease/cancellation policy, and the stored run. Phase B's `retryable` flag is advisory classification; it never loops or dispatches again. Section 18 exclusively defines authorization/read/error precedence. All claimed-provenance mismatch codes are non-retryable until operator/code correction and occur before adapter call. Unknown errors become `internal_failure`; raw messages are not copied.

Manual degradation is represented as the same typed result with `manualEditorAvailable=true` and one of the availability/config/Prompt readiness codes. The UI later maps these to a fixed message and leaves all ordinary edit/save/review controls intact. There is no empty “AI result” placeholder or automatic Draft change.

## 18. Normative Service sequences and Phase C handoff

The sequences in this section are the only normative ordering. Other sections describe validations but do not reorder them. Canonical statuses remain exactly `pending`, `processing`, `draft_ready`, `failed`, `cancelled`; retry state is `none`, `scheduled`, `exhausted`, `not_retryable`. `succeeded` and `dead` are invalid.

### 18.1 Shared boundary and error precedence

Both Draft APIs receive exact actor/use-case/target/context inputs from an authorized Domain Service and apply this prelude:

1. strict facade runtime parse: malformed/missing actor identity is `authorization_denied`, malformed target discriminator/identity/version is `target_scope_mismatch`, and malformed context selector is `context_field_forbidden`; no repository read occurs;
2. coarse Draft caller shield: role must be `admin`, `product_editor`, or `content_editor`. All other roles return `authorization_denied` before registry/database/readiness access;
3. Production registry lookup. For a coarse-authorized actor, an unregistered key—including `customer_support`—returns `use_case_unknown` before target/feature/config reads;
4. Draft command/association codec parse;
5. one application-policy call rechecks current actor activity/role, record scope, target kind/channel/editability, expected target version, and authorized target snapshot. Nonexistence outside scope and scope denial both return `authorization_denied`; only a caller already authorized to the record may receive `target_not_editable` or `target_version_conflict`;
6. context readers batch-load the explicitly selected sources under the same scope; context policy validates eligibility/provenance/denylist/limits, builds exact reconstructible context, target snapshot hash, ordered source references, explicit-input hash, and—on request—the Phase A request fingerprint.

Thus unauthorized actors cannot probe registry/config readiness, unknown use cases do not consult configuration, and feature/config state is visible only as a safe manual-availability code after exact target/source authorization.

### 18.2 Availability query sequence

`inspectDraftAssistanceAvailability` performs the shared prelude in a read-only consistent scope, then:

7. trusted composition check that a real durable enqueue port is available; Phase B Production returns `integration_not_ready` here;
8. trusted `APP_ENV` allowlist;
9. process `FEATURE_AI` upper bound;
10. exactly one `feature_flags.ai` read;
11. exactly one `readResolutionState` call and resolver;
12. exact adapter policy/envelope lookup;
13. exact Prompt manifest/bundle tuple/hash/contract lookup;
14. rebuild Prompt variables/render and token/size preflight;
15. return only `{available,manualEditorAvailable,code}` plus no provider/model/Prompt/config/context body.

It performs no idempotency/run read, write, Audit, candidate parse, or adapter call. Error precedence is the first failed numbered step.

Downstream availability unit tests inject only the immutable capability fact `durableEnqueueAvailable=true`; this object has no enqueue/run method and cannot persist or dispatch. It is not an in-memory port or Production runtime path. Phase B Production composition keeps the fact false.

Read-count assertions:

| Path | target-policy calls | feature DB reads | context source batch reads | config resolution reads | Prompt loads | run reads/writes |
|---|---:|---:|---:|---:|---:|---:|
| coarse role denied | 0 | 0 | 0 | 0 | 0 | 0/0 |
| authorized role, unknown use case | 0 | 0 | 0 | 0 | 0 | 0/0 |
| target/scope denied | 1 | 0 | 0 | 0 | 0 | 0/0 |
| context rejected | 1 | 0 | at most one per selected source class | 0 | 0 | 0/0 |
| durable enqueue unavailable | 1 | 0 | same context batches | 0 | 0 | 0/0 |
| environment/process flag denied | 1 | 0 | same context batches | 0 | 0 | 0/0 |
| DB flag denied/missing | 1 | 1 | same context batches | 0 | 0 | 0/0 |
| config failure | 1 | 1 | same context batches | exactly 1 | 0 or 1 according to failure point | 0/0 |
| ready Synthetic path | 1 | 1 | same context batches | exactly 1 | exactly 1 full tuple | 0/0 |

No cross-request readiness/default cache is allowed.

### 18.3 Phase C request mutation and replay-first idempotency

Phase B has no callable Production request-service instance. Once Phase C supplies the required port, `requestDraftAssistance` performs shared steps 1–4 (strict parse, coarse shield, registry, Draft codec) without database reads, then invokes the port. The port opens one governed transaction; shared steps 5–6 (target authorization/snapshot and context) occur inside it exactly once as numbered steps 1–2 below. Within the transaction:

1. application policy rechecks actor/target scope/editability/current expected version and creates target snapshot;
2. context sources/policy validate and create exact source references/context;
3. compute Phase A fingerprint version 1 over exactly actor ID, application class, capability, use case, target type/identity, locale, expected version, target snapshot hash, ordered explicitly selected safe source references, and explicit-input hash; exclude idempotency key and all current config/Prompt/registry state;
4. scoped lookup by `idempotency_key` under actor/target authorization occurs before environment/feature/config/Prompt reads:
   - same authorized actor/scope and exact fingerprint returns the existing run summary immediately, with no feature/config/Prompt read and no second Audit;
   - same key with different semantic fingerprint returns `idempotency_conflict` and exposes no prior payload;
   - wrong actor/record scope returns `authorization_denied` with no existence detail;
5. only for no existing row: trusted environment, process flag, and one DB feature read;
6. one consistent config resolution read, selected-row lock/recheck, adapter/envelope/Prompt/policy validation;
7. build Prompt variables/render only for preflight; persist no rendered request;
8. insert one `pending` row with exact snapshots and required enqueue Audit atomically;
9. on unique-key contention, `ON CONFLICT DO NOTHING RETURNING` then scoped fetch and repeat the comparison in step 4; only the winner writes Audit;
10. return safe `AiRunSummaryV1`.

The current target freshness is not bypassed by replay: steps 1–3 rerun first, and the fingerprint includes the current expected version and target snapshot hash. A target/source change makes the fingerprint differ and returns conflict. Exact response-loss replay may return a persisted `pending`, `processing`, `draft_ready`, `failed`, or `cancelled` summary because it is the same authoritative run; it never redispatches.

Only committed run summaries are replayable. Authorization, target/context validation, environment/feature/config/Prompt/integration errors that occurred before insert have no `ai_runs` row and are recomputed, not cached/replayed. A previously persisted `failed/cancelled` run remains replayable as its safe status; retry is a separate authorized Phase C transition on the same ID.

Phase B defines/tests the callback contract and ordering but implements no port, transaction, run SQL, replay store, or Audit.

### 18.4 Claimed durable projection and core-owned reconstruction

Phase C Worker sequence:

1. claim due `ai_runs` under Phase C PostgreSQL authority and commit `processing`/lease;
2. in a fenced transaction validate cancellation/lease and commit `active_attempt_dispatched_at` plus new `state_version`;
3. select the exact durable projection required by `ClaimedAiRunProjectionV1`: application/capability/use-case; target association columns/hash; config ID/version/hash/requested+actual provider/model/parameters/limits; Prompt tuple/hash; envelope version/hash; input/output schema and policy versions; `input_context_json`/`input_hash`; attempt/status/retry/lease/state/active+first dispatch fields;
4. call the core-owned constructor, which resolves the exact output-schema ID from the durable registry tuple, constructs the strict claimed brand—never a rendered request—and invokes `executeClaimedTextAttempt`.

Core then performs, in order and before adapter call:

5. strict claimed shape; status exactly `processing`, retry state `none`, attempt count `1..maxAttempts`; lease token/state/both dispatch markers present; `actualProvider===requestedProvider`; lease not expired; signal not aborted;
6. registry exact tuple; application association codec reconstructs the Draft durable association from target columns and verifies `target_snapshot_hash`;
7. reconstruct the exact Phase A resolved-config JCS object from durable columns and require `resolved_config_hash`; validate limits/fallback absence/model/parameters through the exact requested adapter only; do not read current default/config row;
8. load exact raw Prompt bytes by stored `(prompt_id,prompt_version,prompt_hash)` from the generated Production/Synthetic bundle, recompute raw SHA, strict parse resource, and require registry/application/capability/use-case/schema/policy agreement;
9. require compiled adapter envelope version/hash equals stored `provider_envelope_*`; no alternate envelope/provider/model;
10. strict parse `input_context_json` with the registered application context codec, require association/application/use-case/input-schema/policy identity, recompute JCS `input_hash`, and validate every alias/ref/provenance/limit;
11. deterministically rebuild Prompt variables and Provider-neutral request from that context and exact raw Prompt; recheck byte/token ceilings and output schema identity;
12. make exactly one adapter call;
13. after return recheck abort signal and local lease-expiry deadline; a cancelled/late result cannot become a candidate. Then enforce returned model/completion, raw-parse one object, and let the application output codec return its protected result/disposition envelope;
14. return normalized attempt to Worker; Worker alone performs fenced candidate/failure/usage/cost lifecycle persistence.

There is no durable rendered-request column, so core does not claim a request-hash comparison that Schema cannot store. Integrity is compositional: exact Prompt raw hash + input JCS hash + config JCS hash + envelope hash + registered schema/policy identities uniquely govern deterministic reconstruction. Strict claimed projection rejects an injected `request` key. Test recorder asserts rebuilt request exact bytes.

Tamper tests independently change Prompt raw bytes/manifest tuple, Prompt hash, context value/key/order/ref, input hash, config parameter/limit/provider/model, resolved config hash, envelope version/hash, policy/schema version, target association/hash, and an injected pre-rendered request. Every case fails with the corresponding provenance code and adapter call count zero. A valid unchanged durable fixture makes one call with exact expected request.

### 18.5 No second authority proof

- Generic preparation cannot dispatch and returns no rendered request to business code.
- Draft request cannot succeed without Phase C's one durable enqueue port.
- Claimed execution accepts only a durable projection, never `PreparedCoreRunV1` or a rendered request.
- Phase B adds no run repository, queue, state map, retry loop, idempotency cache, or history.
- Fakes script adapters/results only; they do not implement enqueue/claim/history.
- Phase C implements one repository over `ai_runs` and Worker calls the same generic Service Layer, never adapter direct.
- Application-owned codecs map current Draft values to `0020`; they do not create a parallel database authority.
- Provider dashboards/logs, generated Prompt bundle, and compile brands are non-authoritative.

Phase C therefore adds durable lifecycle around already frozen generic contracts without rewriting core, bypassing Service Layer, or introducing another queue/history.

## 19. Authorization, Audit, telemetry, structural and bundle gates

### 19.1 Authorization and Audit

- Every Draft API call begins with the coarse shield then application-owned record authorization in Section 18; UI visibility/session role alone is never authority.
- Product Editor and Content Editor invoke only their record scopes; Admin follows existing scope. Reviewer/Publisher role alone cannot generate. No Sales/anonymous/public/customer role may probe readiness.
- Editors cannot select Provider/model/parameters/Prompt/schema/policy. No caller may submit generic application class, association/result/disposition kind, endpoint, or Provider request.
- Phase B writes no business row, `ai_model_config`, `ai_runs`, or Audit.
- Phase C enqueue/config mutations and Phase E candidate application use existing governed mutation + required Audit rules. Adapter calls occur outside Product/Content/Audit transactions.
- A candidate has no permission method and does not become Draft truth until Phase E reauthorization/version/lock/Diff/Audit.

### 19.2 Strict telemetry/redaction

The only telemetry API accepts a strict union whose fields are limited to:

- event schema/version and fixed event name;
- application/use-case/capability;
- safe error code/category and retry class;
- environment class;
- Prompt ID/version/hash and envelope/policy/schema versions;
- Provider key/requested/returned model only at protected Admin/Worker scope;
- status/attempt/duration and normalized token/cost counts;
- boolean structural flags and aggregate counts.

It cannot contain actor/user/target/source/config IDs; idempotency/fingerprint/input/candidate hashes as correlation substitutes; Prompt body/render/variables; context/input/output/candidate text/JSON; source bodies; Draft text; request/response/error bodies/headers; credentials/env values; URL/path/Object Key; PII/customer/private data; stack; or unrestricted `Error.message`. Zod strict parsing rejects extra fields. Tests inject unique sentinels at every forbidden location and inspect captured sink output. Ordinary logs receive only a rendered safe fixed message from the typed event, never arbitrary objects.

### 19.3 Protected zones and canonical module graph

`scripts/verify-ai-architecture.ts` creates one TypeScript Program from repository `tsconfig.json` for included TypeScript modules, parses any remaining JS/MJS/CJS target with `ts.createSourceFile` and the matching ScriptKind, and uses a separate strict filesystem/resource traversal for JSON/generated resources. It scans:

- all Production code `src/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}` excluding `*.test.*`, `*.integration.test.*` and `src/ai/testing/**` from the Production module graph, plus JSON/resources in the separate scan;
- `src/ai/core/**`, `applications/**`, `config/**`, `prompts/**` including generated Production bundle, `output/**`, `providers/**`, `internal/**` as protected AI zones;
- business consumers `src/catalog/**`, `src/content/**`, `src/seo/**`, `src/imports/**`, `src/admin/**`, `src/app/**`, `src/public-site/**`;
- test/Synthetic/generated fixtures in separate test/isolation scans;
- `package.json`, lockfile, Prompt manifests/resources, `next.config.ts` and bundle scripts.

Resolution uses parsed compiler options and `ts.resolveModuleName`, then `ts.sys.realpath` and repository-relative POSIX path canonicalization. It handles `@/*` aliases, relative paths, explicit/implicit extensions, directory `index`, package exports, and symlinks; a path escaping repository or unresolved protected-zone edge fails. Package edges canonicalize to the top-level package name. Graph traversal follows all re-exports transitively with visited/cycle tracking.

### 19.4 Enumerated AST/module forms

The verifier records an edge for every:

1. `ImportDeclaration`, including type-only/default/namespace/named imports;
2. `ExportDeclaration` with module specifier, including `export * from` and `export {x} from`;
3. `ImportEqualsDeclaration` with external-module reference;
4. `ImportTypeNode` such as `import("module").Type`;
5. dynamic `import()` CallExpression;
6. unshadowed `require()` and `require.resolve()` CallExpressions;
7. `new URL(resource, import.meta.url)` and equivalent resource-specifier forms; and
8. generated Prompt manifest/bundle path references.

Specifier evaluation accepts StringLiteral and NoSubstitutionTemplateLiteral. It constant-folds parenthesized/`as const`/`satisfies` wrappers, template expressions whose substitutions fold to primitive literals, and `+` concatenations of literal strings. Any non-foldable/computed module/resource specifier in Production `src/**` fails closed; it is not skipped. A folded specifier follows the same canonical resolver.

For string/endpoint/provider scans, the same evaluator inspects StringLiteral, template, `+`, tagged/argument/config property initializers, and constant declarations. A non-foldable value passed to an import/resource/network/endpoint/model/provider-registration position fails closed. General dynamic business text outside those positions is not mislabeled as an endpoint.

Fixture tests cover alias/relative, extensionless, directory index, direct and multi-hop re-export, `export *`, type-only re-export, dynamic import, import-equals, ImportType, require/require.resolve, literal template, concatenation, nested constant-fold, unresolved path, symlink escape, computed variable, conditional expression, and runtime template substitution.

### 19.5 Dependency/capability decisions enforced

The transitive graph requires:

- runtime `src/ai/index.ts`, Draft facade, core orchestrator, config repositories, Prompt loader, provider registry, claimed entry, and telemetry import `server-only` directly; low-level pure schemas/JCS/raw parser remain non-client-reachable by graph;
- business zones import request-facing AI only through `@/ai`; Server Actions/routes call their Domain Service rather than AI directly;
- `core/**` cannot reach Draft application or any Product/Content/SEO/Admin/public/testing module;
- Draft application may reach core/application interfaces and type-only auth, but not config repository internals, raw provider adapter, Worker, or UI;
- only `core/orchestrator.ts` may reference/call `TextAiProvider.generateText`;
- only future Phase C Worker paths explicitly added by reviewed verifier change may import `internal/worker-entry.ts`; Phase B production has no such consumer;
- no Production module reaches `src/ai/testing/**` through direct/re-export/generated/resource edges;
- public/client graph reaches no `src/ai/**` or server-only dependency;
- no real adapter directory/SDK/package/lock entry, `fetch`, `Request` network construction, WebSocket, `node:http`/`https`/`net`/`tls`, endpoint/scheme literal, credential/env-key lookup, local-model runtime, or Provider-specific DTO;
- business code contains no hardcoded Provider/model/endpoint. Generic field names such as `requestedProvider` are allowed only in Provider-neutral contracts;
- Production registry/resources/config contain exact four use cases and no `customer_support`;
- no tool/function/retrieval/RAG/knowledge/chunk/embedding/vector/vision/image/audio/file/URL/fallback runtime type or field exists;
- `fallback_config_id` is only read and rejected; no traversal/routing;
- generated Production Prompt bundle entries exactly derive from Production manifest; Synthetic paths/bytes cannot enter it.

The sole media-named exception is Draft-owned opaque `mediaPlacementRefs` / `mediaTextProposals` in the Product text contract: strict tokens only, no Asset ID/key/URL/bytes/image input or output. The verifier permits those exact property declarations only in the named Draft context/output files and asserts they cannot reach a Provider media field.

Forbidden literal matching covers lowercase-normalized Provider SDK/package names, known Provider/model/endpoint identifiers, URL schemes/localhost, credential-key patterns, capability terms in executable schema/config positions, and Synthetic promotion marker. Denylist fixtures themselves are allowed only at one exact policy constant path and are verified to be consumed solely for rejection. There is no inline disable comment. A genuine false positive requires changing the centralized verifier with a reviewed exact AST/path reason and regression fixture; no broad path/string allowlist is accepted.

For Phase B, external imports below `src/ai/**` are an exact allowlist: `server-only`, `zod`, `drizzle-orm` and its already-installed subpaths only in config repositories, plus `node:crypto`, `node:buffer`, and type-only imports from the named CWT auth/database files. Any other package import fails. The `package.json` dependency/devDependency key/value sets and `pnpm-lock.yaml` package set must be byte-equivalent to the parent; only script entries may change.

The Provider/package literal deny set includes `deepseek`, `openai`, `@anthropic-ai/sdk`, `anthropic`, `@google/generative-ai`, `@google/genai`, `cohere-ai`, `groq-sdk`, `ollama`, Bedrock AI runtime packages, and model-family prefixes `gpt-`, `claude-`, `gemini-`, `qwen-`, `llama-`, `mistral-`, `command-r`. Endpoint detection rejects folded strings matching `(?i)\b(?:https?|wss?)://`, `localhost`, `127.0.0.1`, or `[::1]` in executable AI/provider/config positions. Environment/property access for folded names matching `(?i)(api[_-]?key|authorization|bearer|credential|secret)` is forbidden under `src/ai/**`. Provider-neutral field names such as `maxOutputTokens` are checked by AST position and are not credential matches.

### 19.6 Server/public bundle proof

`src/ai/server-bundle-marker.ts` exports the stable, high-entropy literal `CWT_SERVER_AI_BOUNDARY_V1_5F4D7C2A` and imports `server-only`. The orchestrator references it in a nonoptional invariant; the test-only Next server route returns the literal itself to force byte retention. The generated Prompt module carries `CWT_SERVER_AI_PROMPT_BUNDLE_V1_91B6E4A3` and the fixture also reads that literal. These routes exist only in the isolated fixture, never the CWT app.

The test-only Next standalone build must:

- contain both full marker literals in server chunks/standalone trace;
- execute the server fixture and reproduce exact embedded Synthetic raw bytes/hash;
- contain neither marker/raw byte sentinel in its client reference manifests/chunks.

The fixture uses `route.js`/JavaScript plus its own `next.config.mjs` with `output:"standalone"` and `outputFileTracingRoot` fixed to the repository root. Its server route uses fixed relative imports of the actual marker/Production generated module and the test-only Synthetic generated module; it has no package file or dependency. Root `tsconfig.json` (`allowJs=false`) does not treat it as application TypeScript. The architecture verifier still scans the fixture in its explicit test-fixture class and rejects any import from the real CWT app/Production registry into the fixture. Build output goes to a temporary ignored directory, never a checked-in `.next` tree.

The ordinary `pnpm build` is fresh under the existing timestamp rule. `scripts/check-public-bundle.mjs` scans all non-Admin public client-reference manifests and referenced chunks for stable markers, `/src/ai/`, testing paths, generated Prompt sentinels, server table/resource names, and future approved SDK names. `src/public-site/public-bundle-check.test.ts` creates a bounded temporary positive-leak build fixture with a valid manifest/chunk containing the stable marker and proves the checker fails, then proves a clean fixture and the fresh real build pass. Temporary/generated build directories are outside source graph and removed by the test harness; checked-in Prompt generated source remains scanned.

Because Phase B intentionally has no real app consumer, real CWT server output need not contain AI code yet; the standalone server fixture is the positive server-presence proof. Phase E must extend the real-build gate so imported AI server chunks contain the markers/Production tuple bytes while public client chunks do not.

### 19.7 Automated frozen-absence proofs

- **No RAG/retrieval/tool:** type/schema/AST/package/resource scan plus negative compile fixtures for each forbidden field.
- **No vision/media:** Provider request/capability exact-key tests and forbidden symbol scan.
- **No fallback:** request/result types have no fallback, config non-null rejection, one-call adapter recorder.
- **No customer support:** Production exact-set test and source/resource scan; unknown authorized lookup returns `use_case_unknown` before readiness; Synthetic key is different.
- **No Provider/network:** no adapter/SDK/package/credential/endpoint/network AST nodes; fake keys only under testing.
- **No second authority:** no run repository/queue/history implementation, no enqueue fake, and adapter-call graph has one core caller.
- **No implementation leakage from design remediation:** V1.1/Remediation commit itself must contain documents only.

## 20. Verification matrix and pass criteria

### 20.1 Unit and contract tests

| Area | Required direct cases | Pass criterion |
|---|---|---|
| generic application core | registry completeness/duplicates/mismatch; core source compiles with no Draft import/literal; Draft facade mapping | exact typed result; no Draft branch in core |
| Synthetic extension | distinct `synthetic_case_association`, `synthetic_review_packet`, `synthetic_probe_verdict`; compose only by new test registry/policies/schema | prepare/reconstruct/fake-call/protect passes; no Draft union/core edit/`customer_support`/0020 |
| RFC 8785/JCS | published sample/property/complete Appendix B vectors; decimals, -0, Unicode preservation/order; every invalid JS domain value | byte-exact expected strings/hashes; adapter restriction remains separate |
| config repository | no rows; disabled default; no default; one enabled default; 3 and 100 enabled non-default + disabled default(s); enabled default plus arbitrary rows; corrupt counts/list/flags/IDs/key | exact M-01 codes; one read; no `LIMIT`/cache |
| Prompt manifest | empty first Production manifest; valid tuple/resource; missing/unreferenced/stale/duplicate tuple/path/hash; metadata/path/version/order disagreement; traversal/symlink | fail closed; exact authority relationship |
| Prompt generated bundle | deterministic generation, stale/manual derivative, base64 byte equality, exact runtime raw hash, empty Production tuple, Synthetic isolation | check-only regeneration byte-equal; no dynamic/fs load |
| Prompt history | explicit valid base/candidate; missing/inferred/nonancestor base; first base absent; modify/delete/rename/repoint/reuse; append consecutive version | immutable history rules exact |
| renderer | exact variables, missing/extra/type/enum/placeholder/control/size/token failures; reconstruct twice from durable context | identical request bytes; no caller variables |
| raw JSON parser | every Section 14 framing/comment/multiple/trailing/duplicate/nested/NFC/Unicode/number/depth/node/size/truncation case | one root object or exact code; no `JSON.parse` fallback |
| Narrative Blocks | each allowed type for each use case; every unknown/extra/missing key; per-string/item/block bounds; forbidden ID/candidateRef/locked/type | strict union exact; no durable identity/lock accepted |
| candidate protection | factual ref support, invalid/duplicate ref, Product factual output key, candidate-ref derivation/collision/ordering, 64 KiB JCS | deterministic protected DTO/hash |
| Phase E conversion descriptor | each candidate Block to existing Block shape; fresh durable ID, locked absent; Product table refusal | converted fixture passes `parseBlockDocument`; locks preserved |
| Provider completion | complete valid; complete empty; length/unknown with syntactically valid JSON; content filter; cancelled; model drift | only complete reaches parser; adapter calls ≤1 |
| fake adapters | config switch, exact request recorder, scripted safe failures, abort, no fallback | no network/SDK/Provider claims |
| error/telemetry | exhaustive code/category mapping, provenance failures, manual degradation, forbidden sentinel payloads | exhaustive compile and no sensitive capture |

### 20.2 Context, ordering, and integration tests

| Area | Required cases | Pass criterion |
|---|---|---|
| Product matrix | each listed field under eligible/ineligible status; Product Code selected; provided vs verified; null/blank/unknown/empty/rejected/missing review; MOQ half/mixed status/unit; untracked supplied fields | exact send/omit/reject/provenance/narrative policy; Product Code never Provider-bound |
| other context | eligible/ineligible Company Fact, Fabric Knowledge, explicit input; cross-use-case source; URL/file/PII/Secret/tool/retrieval | strict context code; no prohibited payload |
| reconstructible context | preparation -> persisted JSONB-shaped round-trip -> claimed parse/variables/request | identical JCS input hash and request bytes |
| availability order | every stop row in Section 18 read-count table, including unauthorized and unknown key | exact first error and exact port call counts; no readiness leak |
| request/new path | auth/context/fingerprint -> no replay -> feature/config/Prompt -> pending handoff | exact order; one config read; Phase B no DB write |
| request replay | exact committed run before feature/config; changed target/source/input; wrong actor/scope; concurrent unique loser; persisted terminal statuses | exact replay/conflict/denial; one run/Audit winner; no redispatch |
| claimed reconstruction | valid durable projection and exact adapter request | one call; protected result |
| claimed tamper | association/target hash, config fields/hash, Prompt bytes/tuple/hash, context/input hash/ref, envelope, policy/schema, injected request, lease/state/abort | corresponding provenance/claim error; zero adapter calls |
| feature/config switch | sequential/concurrent fake defaults; existing claimed snapshot after switch | new request sees committed default; old run unchanged; business/core files unchanged |
| no-write Phase B | PGlite database fingerprint before/after availability/config tests | zero business/config/run/Audit writes |
| accepted Schema | Candidate verifier and Drizzle extraction | `ai_model_config=21/21`, `ai_runs=96/96`; no Migration/Schema diff |

### 20.3 Architecture, resource, and bundle tests

- Run every `test-fixtures/ai-architecture` bypass form from Sections 19.3–19.5. Allowed literal forms resolve canonically; disallowed edge/computed/unresolved/symlink/transitive import fails with path/node/reason.
- Prove business -> facade only, core -> no Draft/business, Production -> no testing, Worker -> claimed entry only, adapter call -> orchestrator only.
- Prove no real adapter/SDK/package/lock/credential/endpoint/network/local-model/provider-specific DTO/model literal.
- Prove Production registry exact four keys; no Production `customer_support`; no tools/RAG/retrieval/vision/file/URL/fallback types/resources.
- `check:ai-prompts` proves Production manifest/resource/generated/history contract and Synthetic isolation.
- Test-only Next standalone server fixture retains both markers and exact Synthetic raw bytes server-side and none client-side.
- Positive public-leak fixture fails `check-public-bundle`; clean fixture and fresh real `pnpm build && pnpm check:bundle` pass.
- `git diff --check` and design/implementation scope gate show no historical Prompt mutation and, for this remediation Candidate, documentation-only diff.

### 20.4 PD-11 and fake-only quality/security cases

All applicable PD-11 Synthetic cases remain conspicuously fictional/noindex and use no Provider/network: malformed/framed/duplicate JSON, Prompt injection inside context, unsupported factual claims, forbidden Product fields, unknown Blocks, oversized output, stale/locked target conversion descriptor, model drift, abort/cancel, and no fallback. These are local contract/security tests, not Provider quality claims. `PD-04`–`PD-07` remain later non-blocking references.

### 20.5 Exact Phase B implementation pass command set

The later implementation Candidate must report, without weakening existing scripts:

1. focused `src/ai` unit/integration/static suites;
2. `pnpm db:verify:ai-foundation-candidate`;
3. actual Schema regression and 21/96 extraction;
4. `pnpm check:ai-prompts` with explicit protected base;
5. `pnpm check:ai-architecture`;
6. test-only standalone AI server-bundle probe;
7. `pnpm lint` and `pnpm typecheck`;
8. fresh `pnpm build` then `pnpm check:bundle`.

Phase B has no reason to call a Provider, use a credential/network, run formal data, deploy, Publish, or Index. All listed tests must pass; skipped or weakened gates do not satisfy exit.

## 21. Failure, rollback, and manual degradation

Phase B failures occur before dispatch or return a normalized attempt result to the Phase C caller. No failure can mutate Product/Content/Draft/Revision/Public state.

Operational degradation is:

```text
AI unavailable or rejected
  -> fixed safe reason/result
  -> AI action hidden or disabled by later UI
  -> ordinary editor remains fully usable
  -> save/review/publish/index paths retain existing independent authority
```

Do not display a blank generated section, create a placeholder Draft, substitute a model, reuse a stale prepared config, retry in memory, or swallow authorization/config errors.

For an actor already authorized to edit the target, readiness/config/Prompt/integration failures return exactly `{ available:false, manualEditorAvailable:true, code:<safe code> }`. Authorization denial does not assert that the caller has an editor and returns `manualEditorAvailable=false`. Unknown use case returns a generic unavailable result through the Domain Service without readiness detail. Claimed provenance/output/provider failures affect only the existing run outcome under Phase C; the target editor remains unchanged.

Rollback before Phase C is code-only: stop importing the Draft facade and remove Phase B modules/checks while leaving accepted empty/additive `0020` tables intact. `FEATURE_AI` and `feature_flags.ai` remain false. Generated Prompt bundle is regenerated from the retained immutable manifest/resources; accepted historical resources are never deleted as “rollback.” There is no run state to delete or reconcile. After Phase C, rollback follows ADR-0018: disable feature/config, stop claims, preserve configuration/run provenance, and retain manual paths.

## 22. Implementation order and atomic commit plan

Only after V1.1 Fresh Re-review PASS:

1. **Generic contracts/JCS/application registry:** generic opaque command/association/result interfaces, RFC 8785 vectors, registry builder; tests prove no Draft import.
2. **Draft application codecs and exact Production entries:** facade, association/result/disposition policies, exact four keys; distinct Synthetic compile/proof in the same commit or immediately following test commit.
3. **Normative context and Product provenance:** reconstructible context, source readers' narrow ports, field matrix, denial/limit tests; no business integration.
4. **Strict output boundary:** dependency-free raw parser, complete Block/outer schemas, completion contract, candidate refs/canonical form/conversion descriptors and direct tests.
5. **Read-only feature/config:** one-statement repository result, corruption checks, resolver, no-cache/fake switching/order-read tests; no mutation.
6. **Prompt authority:** empty Production manifest, generator/check-only verifier/generated bundle, loader/renderer/history, isolated Synthetic resources, exact bundle/history tests; no Production prose.
7. **Generic orchestrator and claimed reconstruction:** availability/new-request callback contract, no durable port implementation, strict claimed projection, all provenance tamper tests, fake adapter one-call proof.
8. **Structural/bundle gates:** AST/module graph fixtures, Prompt resource isolation, stable markers, test-only standalone server bundle, positive public leak, clean fresh build.
9. **Implementation report and independent Phase B implementation review:** exact commit/hashes/commands/prohibited-action proof.

Recommended atomic commits mirror these boundaries. No commit mixes Phase B foundation with Schema/Migration, real adapter/SDK/credential/network, Worker/run repository, Product/Content integration, Admin UI, Production Prompt prose, or deployment. No Push without separate approval.

## 23. Exact V1.1 design acceptance checklist

The Fresh Re-review may return PASS only if all are true:

- [ ] exact remediation start, immutable V1.0 SHA, FAIL report/evidence/manifest hashes, branch/parent/ancestry/tag/acceptance identity pass;
- [ ] V1.1 and Remediation are the only added files and V1.0 is byte-identical;
- [ ] core command/association/result/disposition contracts contain no Draft union/literal; Draft facade maps current commands;
- [ ] Synthetic association/result/disposition are structurally different, compose via test registry only, edit no core, use no customer-support key, and never enter 0020;
- [ ] Production registry is exactly four frozen Draft text use cases and accepted 0020 remains Draft-only;
- [ ] raw parser algorithm/dependency decision rejects every framing/duplicate/Unicode/truncation/oversize case before Zod;
- [ ] all six candidate Block alternatives, four use-case unions, four outer outputs, strict keys/bounds/sourceRefs/candidate refs/lock rules/canonical form/Phase E conversion are exact;
- [ ] Provider success has mandatory completion kind and only complete output reaches parser;
- [ ] config repository reads complete aggregate/default facts in one statement/snapshot with no truncation/cache and all legal/corrupt states map exactly;
- [ ] Production Prompt manifest/resource/generated-byte-bundle authority, static loader, Next standalone proof, exact history base/ref/first-empty behavior, stale/unreferenced/duplicate rules, and Synthetic isolation are implementable;
- [ ] availability and request have separate single normative sequences, exact error precedence/read counts, authorization anti-leak, and Phase A replay-first semantics;
- [ ] claimed Worker supplies durable projection rather than rendered request; core reloads/reconstructs and validates Prompt/context/config/envelope/policy hashes before one call;
- [ ] strict input_context_json can reconstruct every Prompt variable and tamper tests cover every durable component;
- [ ] Product Code is never sent/narrated; every Product field has actual authority/provenance/eligibility, MOQ pair and rejected/unknown/null behavior; technical facts can only evidence narrative, never fact fields;
- [ ] RFC 8785/JCS accepted domain, decimals/-0/Unicode/order/invalid values, published vectors and DB round-trip are exact and distinct from adapter policy;
- [ ] structural gate enumerates every required AST/module/computed form, canonical resolution/re-export graph, generated/test/resource exclusions, fail-closed behavior, and bypass fixtures;
- [ ] stable markers prove a server bundle exists in the test fixture and public client bundles are clean; positive leak and fresh clean build tests are specified;
- [ ] telemetry cannot log Prompt/input/output/private bodies or identity substitutes;
- [ ] no tool/retrieval/RAG/vision/file/URL/fallback/customer-support/Provider/network capability has behavioral and structural proof;
- [ ] configuration mutation/Admin/Audit is not implemented in Phase B and is assigned to Phase C/E;
- [ ] 21/21 config fields and 96/96 run fields map with no Schema/Migration/ADR change;
- [ ] complexity report proves no persistent coordination, active-default cache, generated-resource authority, fake durable path, second queue/history, or adapter bypass;
- [ ] PD-04 through PD-07 remain non-blocking references;
- [ ] conclusion is corrected Design Candidate only; next gate is Fresh Re-review, not implementation.

## 24. Open questions and findings

### 24.1 Architecture/Schema findings

None. The accepted `0020` Schema is sufficient for the frozen four-use-case Phase B foundation and the planned Phase C handoff. No Owner decision is required to resolve this design.

### 24.2 Later reviewed execution items, not architecture questions

1. Exact production v1 Prompt prose and named Product/Content/SEO reviewers must be supplied and reviewed before Phase E/config bootstrap. Until then, Production Prompt lookup intentionally fails closed.
2. Phase D must provide independently reviewed DeepSeek adapter/model/parameter/envelope/token/cost/error behavior before any real config can resolve. Phase B makes no choice or claim for those mechanics.
3. Phase C must implement the already accepted durable enqueue/claim/lease/retry/cancel/budget/Audit mapping and verify it on real PostgreSQL; it may not change the core API to introduce an in-memory path.
4. External Provider call, credential, Staging, Production, deployment, formal-data, Publish, and Index authority remain separate decisions.

## 25. Complexity report

### Root cause and corrected responsibility

V1.0 consolidated Provider mechanics but left Draft association/result concepts in core and left several integrity checks implicit. V1.1 moves command/association/context/result/disposition ownership to application codecs while core retains one fixed orchestration and one claimed reconstruction sequence. This is narrower than adding application switches: the current Draft application supplies all current semantics; the Synthetic proof demonstrates a second shape without widening Production/Schema.

### Added state and branches

- persistent state/table/column/enum/Migration: **none**;
- Worker/lease/recovery/queue/outbox/scheduler/config mutation/Admin UI: **none**;
- runtime cache: immutable Prompt raw bytes only by full tuple; **no active-default/readiness/request cache**;
- compiled state: generic registry interfaces, four Draft definitions, strict source/output codecs, error codes, empty Production Prompt manifest/generated tuple, provider registry;
- test state: fake adapters, distinct Synthetic application/resources, AST and Next bundle fixtures; no durable repository;
- branch families: coarse auth/registry/target/context; replay-or-new; environment/feature/config/Prompt; claimed provenance reconstruction; one adapter result/completion/raw/output. Every branch terminates in a closed typed result and has direct tests.

### Maintenance cost

Maintainers must keep application codec/policy/schema versions aligned; append Prompt manifest/resources and regenerate the checked derivative; maintain RFC/raw-parser vectors; and update structural/bundle fixtures when module forms evolve. This cost is bounded and central. A new use case adds an application definition; a new application adds codecs/policies and forward persistence support; a Provider adds one adapter/evidence set. None requires adding a core application switch.

### No dual-authority proof

- `ai_model_config` alone selects new-run config; aggregate repository facts and generated Prompt bundle cannot select it.
- `ai_runs` alone owns durable work/lifecycle/provenance; no fake/in-memory enqueue, replay cache, queue, or history exists.
- Production Prompt manifest/resource bytes are authority; generated TS is byte-verified derivative only, config selects a tuple, and run snapshots it.
- Draft association/result persistence mapping is one adapter into accepted `ai_runs`, not another store.
- Feature flag is a kill switch only.
- Worker supplies durable projection and cannot call adapter directly; generic orchestrator is the sole call site.
- Claimed brand and stable bundle markers are guards/evidence, not state authority.
- Provider dashboard/logs, Synthetic fixtures, and candidate refs are non-authoritative.
- No fallback/silent substitution path exists.

### Replacement/deletion conditions

- Phase C adds the first durable enqueue/repository/Worker behind the specified seams; it does not preserve or replace a Phase B temporary runtime.
- Test claimed helpers/fakes/Synthetic manifests remain under testing; any Production import/registration is a release blocker and is deleted, not grandfathered.
- Production Prompt absence ends only by appending separately reviewed immutable resources/manifest entries and regenerating the derivative; Synthetic content is never promoted.
- When Phase E supplies real Domain readers/facade callers, no core sequence is forked; a duplicated business preparation/adapter path must be removed.
- Any combined sync generate API, rendered-request Worker input, active-default cache, directory-scanning Prompt loader, hand-edited generated bundle, alternate queue/history, or permissive string-only architecture scan is a replace-not-layer violation and must be removed before review.

Phase B increases compiled validation/test maintenance but adds no cross-process/persistent coordination. Phase C retains the already approved operational complexity; V1.1 prevents that complexity from being duplicated by fake or application-specific execution paths.

## 26. Design conclusion and next gate

Conclusion: **CORRECTED DESIGN CANDIDATE V1.1 COMPLETE — NOT SELF-APPROVED / IMPLEMENTATION NOT YET ELIGIBLE.**

The next and only gate is a **Fresh Re-review by the original independent Phase B Design Reviewer** against the exact new commit, V1.1 SHA, Remediation record, immutable V1.0 SHA, and repository baseline. Phase B implementation must not start until that Fresh Re-review returns PASS. No Provider call, credential, network, Staging/Production, Deploy, formal import, Publish, Index, or Push is authorized or performed by this design.
