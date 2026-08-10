# CWT Stage 4A Phase B — Provider-neutral Foundation Exact Design

- Status: **CORRECTED DESIGN CANDIDATE V1.3 / NOT SELF-APPROVED / IMPLEMENTATION NOT YET ELIGIBLE**
- Design version: `1.3`
- Supersedes for implementation eligibility: failed Design V1.2 at exact commit `ce1fda20aa061f3f121992602bb81f4ed8465323`; V1.0, V1.1, V1.2, all prior remediations, and all review histories remain immutable
- Remediates only Fresh Re-review finding `N-M04`; preserves closed `M-04`, `N-M01`, `N-M02`, `N-M03`, `H-01`, `H-02`, `M-01`, `M-02`, `M-03`, `M-05`, `M-06`, and `L-01`
- Prepared: `2026-08-10` (Asia/Shanghai)
- Entry branch/ref: `codex/phase-1b-stage4a-phase-b-entry-v1`
- Exact entry commit: `c6f9714750622d9b977c284b5eeceea93da007a5`
- Accepted Phase A parent: `717cbac284350ec23f786ee239a354085ee0d827`
- Exact reviewed `0020` Candidate ancestor: `15bc6462d2e314f50ff238af70ad31fc6502c40f`
- Frozen baseline: `31c0e405acfdd0d05200d0fb2531e897a541a2c4`
- Frozen tag: `phase-1b-stage3-approved-2026-08-09`
- Next gate: **another Fresh Re-review by the original independent Phase B Design Reviewer**

> This corrected document is a complete, standalone Design Candidate and Complex Task Analysis only. It does not implement Phase B, approve itself, create a Provider account or credential, call a Provider, use a network, spend money, modify Schema/Migration, deploy, import formal data, Publish, or enable Index. Every older design, remediation, review, and evidence artifact remains byte-identical. Phase B implementation must not begin until the original independent reviewer completes another Fresh Re-review of the exact V1.3 commit and returns PASS.

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

Phase B exit is met only when every Provider-neutral unit, integration, architecture, Prompt-bundle, raw-parser, Synthetic-extensibility, and public-bundle test in Section 20 passes; `ai_model_config` and `ai_runs` still map exactly `21/21` and `96/96`; every older design/remediation/review artifact is byte-identical; the repository contains no real Provider adapter/SDK/credential/network path; and the implementation Candidate later receives its own independent review. No DeepSeek fact or behavior is claimed, and `PD-04` through `PD-07` remain non-blocking reference items rather than reinstated gates.

V1.3 retains those four V1.2 closures and corrects only their transaction composition. The Draft application now has two statically distinct authorization binders: availability binds only `ReadOnlyDraftAvailabilityScope`, while request binds only `TransactionBoundDraftEnqueueScope` and invokes one application-owned authorize-lock-snapshot operation. Both erase to opaque staged closures before generic core entry. Core receives no Draft scope, target, repository, or lock method; no cast, duplicate target read, second lock, or second snapshot authority is needed. The same pattern composes a structurally different Synthetic application without editing core.

## 2. Fixed authority and verified remediation identity

The mandatory pre-edit gate for this V1.3 Candidate is:

| Check | Verified identity | Result |
|---|---|---|
| Design branch | `codex/phase-1b-stage4a-phase-b-design-v1` | PASS |
| Exact remediation HEAD | `ce1fda20aa061f3f121992602bb81f4ed8465323` | PASS |
| Direct parent | `3be7cda919cd8d5418d31e81499077cc9d590ac8` | PASS |
| Phase B Entry ancestor | `c6f9714750622d9b977c284b5eeceea93da007a5` | PASS |
| Accepted Phase A ancestor | `717cbac284350ec23f786ee239a354085ee0d827` | PASS |
| Exact `0020` Candidate ancestor | `15bc6462d2e314f50ff238af70ad31fc6502c40f` | PASS |
| Frozen annotated tag object | `1c626f9b788e4c6ed0480a7040aa54ccef3e6c76` | PASS |
| Frozen tag peeled commit | `31c0e405acfdd0d05200d0fb2531e897a541a2c4` | PASS |
| Phase A acceptance record SHA-256 | `b9e00b41ba561fe434fb2f1bdb136c7e43098d2765e4c34e16f267557cefe833` | PASS |

The worktree was attached to the required existing design branch and clean before V1.3 was added. These fixed Fresh Re-review inputs, including every manifest-protected positive/negative probe, were read completely and recomputed before revision:

| Remediation input | Exact SHA-256 |
|---|---|
| Fresh Re-review report V1.1 | `7f935dadea4c26892a89508f7cb6597e313611a5153e394f53b0c37bcadf0c55` |
| Fresh Re-review Evidence V1.1 | `e1358f67471c93b3e9804c307a510b4153026c34414fcd987485cdbb9eee3d9a` |
| Fresh Re-review `SHA256SUMS.txt` | `d5e23c31635df8358fb3bbc4149426f23283e363927c6f965529a0fc3e715630` |
| immutable failed V1.2 Design | `ab11ebee887acc342da03d83c3c5bb803f34a4633e0b82944de664c44325e621` |
| immutable V1.1 Remediation record | `26f0475ceb2ead89272a9f07fd0aa8eb0b630236cb30ee3013f92707361769ad` |
| immutable failed V1.1 Design | `bc4f8b6ccb35a85ecfcc2cc9385f23ff5b43c9b9e4868f4f3c85de0ed5976f2d` |
| immutable V1.0 Remediation record | `290d0d2dde42d55af20595c56db71a6c03f0e6ee252037b1634fe3e09e47aea8` |
| immutable failed V1.0 Design | `a0dd322de815e4b627b3f20f78454303e262756f2d209699379db5d56a4fa247` |

Fresh Re-review V1.1 disposition was Blocker `0`, High `0`, Medium `1`, Low `0`; implementation remained **NOT ELIGIBLE**. It closed `M-04`, `N-M01`, `N-M02`, and `N-M03` and reconfirmed all eight earlier closures. Only `N-M04` is corrected here. The review recorded downloads `0`; any still-earlier reviewer process exception remains review-history evidence only, is not a Candidate defect, and is not repeated. This design task performs no package install/download or registry access.

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
| `docs/PRODUCT_DATA_DICTIONARY.md`, Stage 4 plan §5.3 | Product Code is hidden/internal and Product Description output forbids Product Code/factual-field mutation. V1.3 excludes it from Provider context and all candidates. |
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

V1.2 correctly narrowed the target snapshot, configuration provenance, common reads, and evidence claims, but its single `ApplicationAssociationPolicy<TReadScope=DraftConsistentReadScope>` placed request locking behind a static type that deliberately cannot lock. The root cause is one interface carrying two different authorities: availability needs an authorized consistent read, while a new request needs record authorization and the sole row lock in the governed enqueue transaction. V1.3 replaces that single policy path with two application-owned binders and erases their already-bound closures before core entry. It does not add a scope downcast, second target repository call, duplicated snapshot, or Draft branch in core.

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

The correction is Replace-not-Layer: the V1.2 single-scope `associationPolicy.authorizeAndSnapshot` contract is absent from V1.3. It is replaced by one availability binder and one request binder. Their only permitted shared implementation is pure parsing, invariant checking, and canonical snapshot construction over values already returned by the authoritative operation. They may not share a function that reads, authorizes, locks, or constructs a second live snapshot.

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
        -> Draft composition + typed Draft registry lookup
           -> availability binder(ReadOnlyDraftAvailabilityScope)
              -> one authorized target read/snapshot, no lock
              -> common-scope context/feature/config closures
              -> erase to OpaqueAvailabilityInvocationV1
           -> request binder(TransactionBoundDraftEnqueueScope)
              -> one authorize/lock/snapshot operation, no unlocked target read
              -> same-transaction context/replay/feature/config/commit closures
              -> erase to OpaqueRequestInvocationV1
        -> GenericAiOrchestrator.inspect(opaque availability invocation)
        -> GenericAiOrchestrator.request(opaque request invocation)
           -> no Draft scope, target, repository, SQL, or lock symbol
           -> ModelConfigResolver
           -> PromptManifestLoader / PromptRenderer
           -> PreparedCoreRunV1
           -> bound commit closure -> ai_runs.pending + required Audit

Phase C Worker after durable claim + dispatch marker
  -> src/ai/internal/worker-entry.ts
     -> GenericAiOrchestrator.executeClaimedTextAttempt
        <- exact ai_runs row projection (never association/snapshot/rendered request JSON)
        -> Draft persistence codec reconstructs target union/hash from accepted columns
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
  -> separate typed Synthetic registry and structurally different binders
  -> same opaque availability/request invocation contracts + generic core
  -> association { kind: synthetic_case_association, ... }
  -> result kind synthetic_review_packet
  -> disposition kind synthetic_probe_verdict
  -> test Prompt manifest + fake adapter
  -X no Draft union, no customer_support, no 0020 persistence
  -X never imported by Production registry/facade/business/app/public modules
```

Dependency rules:

1. `src/ai/core/**` may depend only on Provider-neutral opaque invocation contracts, the application-neutral `ClaimedApplicationRuntimeRegistryV1` interface, canonicalization/framing utilities, Prompt/config/provider result types, Node standard library, Zod, and `server-only`. It must not import any typed/application registry implementation, read scope, repository, transaction port, Draft/Synthetic application, or identifier containing `Draft`, `TargetForNewRequest`, or `lock`.
2. The Draft application/composition layer may depend inward on core opaque contracts, the typed registry builder, Draft scopes, repositories, and type-only authorization roles. It statically binds the correct scope and repository operations before calling core. Core must not import Draft targets, Product, Content, SEO, Import, CRM, Inquiry, Asset, Admin UI, or public-site services. Phase E implements its narrow target/context reader ports through Product/Content Domain Services.
3. Business modules may import only the Draft facade re-exported by `@/ai`; generic preparation, registries, config repositories, Prompt loaders, raw parser, providers, claimed execution, and testing modules are non-public.
4. Provider adapters may depend inward on Provider-neutral contracts. Core and business modules may not depend outward on an adapter or Provider SDK.
5. `src/public-site/**` and public `src/app/**` pages may not import any `src/ai` module. Server Actions/API handlers may only call an authorized business Domain Service, never the AI facade directly.
6. `src/db/schema/**` remains lower-level and does not import `src/ai`. Phase C's Draft transaction composition maps the application-owned durable association/result to accepted `0020`; generic core never imports Drizzle `aiRuns` or receives a database/transaction scope.
7. Production Prompt resources and their generated byte bundle are server-only protected resources. Synthetic resources remain under testing and cannot enter the Production manifest or server application graph.

## 7. Exact Phase B implementation file plan

The following is the implementation file set to be reviewed after this design passes. Files marked “test only” cannot be imported by production modules.

| Path | Responsibility, public export, dependencies |
|---|---|
| `src/ai/index.ts` | Imports `server-only`; re-exports only the Draft application facade, `AiServiceResult`, safe availability/run-summary DTOs. It exports no generic core command, application registry, prepared/rendered/claimed/provider type. |
| `src/ai/core/contracts.ts` | Application-neutral command envelope, opaque application payload/association/result envelopes, prepared core run, claimed durable projection, normalized attempt, JSON, and result types. It contains no Draft target/result/disposition literal and imports no business domain. |
| `src/ai/applications/contracts.ts` | Generic command/context/result codecs; statically typed availability and request binder contracts; homogeneous typed registry definition; staged opaque runtime invocation contracts. Core imports only the opaque stages/result envelopes, never a scope or application definition. |
| `src/ai/applications/draft-assistance/contracts.ts` | Current `AiActor`, `DraftTarget`, four use-case command/query types, exact closed `DraftDurableAssociationV1`, three canonical target-snapshot unions, target-column projection, result/disposition codecs, and safe facade DTOs. Type-only domain role dependency. |
| `src/ai/applications/draft-assistance/facade.ts` | Implements `inspectDraftAssistanceAvailability` and `requestDraftAssistance`; maps typed Draft commands to generic core commands and maps safe results back. No orchestration, config, Prompt, adapter, or database logic. |
| `src/ai/applications/draft-assistance/association.ts` | Strict preparation/encode/decode codec for the three Draft target kinds; canonical target snapshot/JCS/hash and bijective accepted-`0020` seven-column mapping. No core import of Draft literals. |
| `src/ai/applications/draft-assistance/read-scopes.ts` | Common opaque `DraftConsistentReadScope`, read-only repeatable-read availability subtype, Phase C governed-transaction subtype, private select capability, and import-restricted internal read helper. Public scope exposes no query/mutation/lock; transaction methods remain subtype-only. |
| `src/ai/applications/draft-assistance/authorization.ts` | Two non-interchangeable application-owned policies: availability authorizes/reads through `ReadOnlyDraftAvailabilityScope`; request calls `authorizeLockAndSnapshotTargetForNewRequest` on `TransactionBoundDraftEnqueueScope` exactly once. Both call the same pure canonical snapshot builder only after their authoritative operation. |
| `src/ai/applications/draft-assistance/composition.ts` | Owns the Draft availability/request binders. It closes over typed command, association, correct scope, context/read repositories, and Phase C transaction operations; returns staged opaque closures to core without `as`, `any`, assertions, or an `unknown` round trip. This is the only Production layer that sees both Draft scopes and generic opaque invocations. |
| `src/ai/applications/draft-assistance/policies.ts` | Draft context/result/disposition policy bundle and exact `0020` persistence codec. It contains no live target authorization/read/lock; those are owned by `authorization.ts` and the binders above. Later Phase E supplies narrow Product/Content readers. |
| `src/ai/errors.ts` | Closed error-code taxonomy, safe error factory, manual-degradation mapping, and exhaustive helpers. No raw exception message exposure. |
| `src/ai/canonical-json.ts` | RFC 8785/JCS canonicalization for the accepted I-JSON domain and SHA-256 helpers used by request/config/input/candidate hashes. Depends only on `node:crypto`; no adapter-policy narrowing. |
| `src/ai/telemetry.ts` | Strict allowlisted telemetry event schema and no-op/test sink contract. Contains no general logger payload API. |
| `src/ai/registry/application-registry.ts` | Generic homogeneous typed registry builder parameterized by command/association/context/output/common scope/availability scope/request scope. It validates complete dual binders/codecs and exposes `prepareInvocation`; it also emits a separate application-neutral `ClaimedApplicationRuntimeRegistryV1` from each definition's opaque claimed runtime. Neither path uses a heterogeneous map/cast or imports Draft. |
| `src/ai/registry/production-use-cases.ts` | Exactly four frozen Draft definitions composed from Draft-owned codecs, dual binders, and policies. Exports the Draft-typed `productionApplicationRegistry` to Draft composition only; core never imports it. Contains no `customer_support`. |
| `src/ai/context/contracts.ts` | Generic strict reconstructible context-envelope primitives and source provenance tags; no Draft selector or generic table/query/file/URL source. |
| `src/ai/applications/draft-assistance/context.ts` | Draft selectors, source DTO schemas, Product provenance matrix, per-use-case allowlists, limits, forbidden-data scan, stable aliases, Prompt-variable reconstruction, and Provider payload projection. |
| `src/ai/config/feature-gate-repository.ts` | Read-only lookup of `feature_flags.key='ai'` through `DraftConsistentReadScope` plus trusted `env.FEATURE_AI`/`env.APP_ENV` composition. No mutation or own connection. |
| `src/ai/config/model-config-repository.ts` | Read-only Drizzle port/implementation accepting either assignable common-scope subtype and returning one consistent aggregate/default result: complete counts plus every enabled-default row from one SQL statement/snapshot. It cannot lock/open a transaction and has no partial-row inference or active-default cache. |
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
| `src/ai/output/common.ts` | Complete strict EvidenceText with mandatory refs, heading/paragraph/list/callout/FAQ candidate Block schemas, finite A-01–A-10 structural/provenance policy, fixed human-review labels, derived candidate-ref function, canonical protected form, and Phase E conversion descriptors. It does not claim entailment or re-export business mutation types. |
| `src/ai/output/seo-content-draft.ts` | Strict version-1 SEO candidate schema and policy. |
| `src/ai/output/fabric-knowledge-draft.ts` | Strict version-1 Fabric Knowledge candidate schema and policy. |
| `src/ai/output/product-description-draft.ts` | Strict version-1 Product-description candidate schema and policy. |
| `src/ai/output/sourcing-guide-draft.ts` | Strict version-1 sourcing-guide candidate schema and policy. |
| `src/ai/output/registry.ts` | Draft-owned output codecs map the four schema IDs/versions to raw-object Zod parse, evidence policy, canonical protected result, and Draft disposition kind. Generic core sees only the codec interface. |
| `src/ai/providers/text-provider.ts` | Capability-specific Provider-neutral adapter/config/request/result interfaces, including mandatory normalized completion kind. No real adapter. |
| `src/ai/providers/registry.ts` | Exact provider-key lookup; Production starts empty in Phase B. No fallback selection. |
| `src/ai/core/orchestrator.ts` | One server-only generic AI Service Layer accepting only `OpaqueAvailabilityInvocationV1` or `OpaqueRequestInvocationV1`, calling their staged closures in Section 18 order, and implementing claimed execution through the application-neutral claimed-runtime interface. It is the only production module allowed to invoke `TextAiProvider.generateText`; contains no request-path typed registry lookup, read scope, transaction, Draft switch/union/result kind, target authorization, or lock method name. |
| `src/ai/internal/preparation.ts` | Non-public application-neutral helpers for config/Prompt preparation after the opaque request stage reports `new_request`. It accepts generic values/closures only; business modules cannot import it and Phase B provides no durable port. |
| `src/ai/internal/worker-entry.ts` | Worker-only facade exporting `AiClaimedExecutionService`; import gate permits only the later Phase C Worker/run module and its tests. |
| `src/ai/internal/claimed-run-authority.ts` | Strict branded constructor from the raw accepted row projection. It resolves only `ClaimedApplicationRuntimeRegistryV1`, invokes its opaque association/context closures, forbids caller association/snapshot/request injection, and requires post-dispatch actual Provider/timestamps/lease/state; no Draft/typed registry import enters core. |
| `src/ai/server-bundle-marker.ts` | Imports `server-only` and exports the stable literal `CWT_SERVER_AI_BOUNDARY_V1_5F4D7C2A`; generic service and the test-only Next server fixture reference it so minification cannot erase the fixture proof. |
| `src/ai/testing/fake-text-provider.ts` | Test-only deterministic fake adapters and request recorder; no endpoint, SDK, credential, fetch, or Provider claims. |
| `src/ai/testing/synthetic-application/{definition,association,context,output}.ts` | Test-only application bundle with association kind `synthetic_case_association`, result kind `synthetic_review_packet`, and disposition kind `synthetic_probe_verdict`; no Draft imports, no `customer_support`, no `0020`. |
| `src/ai/testing/synthetic-application/{read-scopes,composition}.ts` | Structurally different read-only/request scopes and dual binders that erase to the same opaque core contracts. They use no Draft symbol, target lock name, customer data, or `0020`; adding these files and a fresh Synthetic registry is sufficient—no core edit. |
| `src/ai/testing/synthetic-prompts/manifest.v1.json`, `resources/*.json` | Test-only authoritative manifest/resources containing `SYNTHETIC TEST DATA — NOT A CWT FACT`; isolated from the Production mode/root/output and runtime manifest. |
| `src/ai/testing/synthetic-prompts/synthetic-prompt-bundle.generated.ts` | Test-only deterministic derivative generated in an explicit `synthetic-test` mode to a fixed testing path; imports/bytes are rejected from the Production graph/manifest. |
| `src/ai/**/*.test.ts` | Focused unit/contract tests beside the modules above. |
| `src/ai/provider-neutral-foundation.integration.test.ts` | PGlite/read-only config/feature gate/preparation integration tests and no-write assertions. No Provider/network. |
| `src/ai/architecture.static.test.ts` | Runs the architecture verifier and fixtures for every import/re-export/dynamic/computed/alias/literal bypass plus exact Production registry/no-capability conditions. |
| `scripts/verify-ai-architecture.ts` | TypeScript-program/AST/module-resolution/resource/package/transitive-graph verifier specified in Section 19. |
| `test-fixtures/ai-server-bundle/` | Test-only minimal Next server project importing the stable marker and generated Prompt bundle. Its standalone/server output must retain the marker/tuple bytes and contain no client marker. Excluded from Production registry and app graph. |
| `test-fixtures/ai-architecture/` | Positive/negative source fixtures for each supported or rejected module/literal form; not compiled into Production. |
| `test-fixtures/ai-types/read-scope/` | Positive and expected-compile-failure fixtures proving common-scope assignability plus distinct availability/request binder inputs, request-only target lock, same closed association envelope, and forbidden lock/mutation/connection/bypass capabilities without casts or suppression comments. |
| `scripts/check-public-bundle.mjs` | Add server-AI/testing/provider markers to the current forbidden list. |
| `src/public-site/public-bundle-check.test.ts` | Extends the current checker with a generated positive public-leak fixture containing the stable marker and a clean fresh production-build assertion. |
| `next.config.ts` | No Production route or AI integration. The test-only bundle fixture has its own standalone config; Production config changes only if later raw-file tracing replaces the accepted static-byte bundle, which V1.3 does not choose. |
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
  readonly mode: string;
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

export interface ApplicationAvailabilityAuthorization<
  TCommand,
  TAssociation,
  TAvailabilityScope extends ApplicationReadScope,
> {
  readonly associationKind: string;
  authorizeAndSnapshotForAvailability(input: {
    readonly actor: CoreAiActorV1;
    readonly command: TCommand;
    readonly association: TAssociation;
    readonly scope: TAvailabilityScope;
  }): Promise<AiServiceResult<AuthorizedAssociationSnapshot<TAssociation>>>;
}

export interface ApplicationRequestAuthorization<
  TCommand,
  TAssociation,
  TRequestScope extends ApplicationReadScope,
> {
  readonly associationKind: string;
  authorizeAndSnapshotForRequest(input: {
    readonly actor: CoreAiActorV1;
    readonly command: TCommand;
    readonly association: TAssociation;
    readonly scope: TRequestScope;
  }): Promise<AiServiceResult<AuthorizedAssociationSnapshot<TAssociation>>>;
}

export interface ApplicationPersistenceCodec<TAssociation> {
  readonly persistenceSchemaId: string;
  toOpaqueEnvelope(snapshot: AuthorizedAssociationSnapshot<TAssociation>):
    AiServiceResult<ApplicationAssociationEnvelopeV1>;
  encodePrepared(snapshot: AuthorizedAssociationSnapshot<TAssociation>):
    AiServiceResult<DurableApplicationAssociationV1>;
  decodeClaimedRow(input: unknown):
    AiServiceResult<ApplicationAssociationEnvelopeV1>;
}

export interface ApplicationContextPolicy<
  TCommand,
  TAssociation,
  TContext,
  TCommonReadScope extends ApplicationReadScope,
> {
  readonly contextPolicyId: string;
  buildReconstructibleContext(input: {
    readonly actor: CoreAiActorV1;
    readonly command: TCommand;
    readonly association: AuthorizedAssociationSnapshot<TAssociation>;
    readonly scope: TCommonReadScope;
  }): Promise<AiServiceResult<TContext>>;
  encodePreparedContext(context: TContext):
    AiServiceResult<PreparedApplicationContextV1>;
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

export interface PreparedApplicationContextV1 {
  readonly version: 1;
  readonly inputSources: readonly SafeInputSourceReferenceV1[];
  readonly inputContext: ReadonlyJsonObject;
  readonly inputHash: string;
  readonly explicitInputHash: string;
  readonly requestFingerprintInput: ReadonlyJsonObject;
}

export interface OpaqueAuthorizedAvailabilityStageV1 {
  readonly association: ApplicationAssociationEnvelopeV1;
  readonly durableAssociation: DurableApplicationAssociationV1;
  buildContext(): Promise<AiServiceResult<OpaqueAvailabilityContextStageV1>>;
}

export interface OpaqueApplicationContextStageV1 {
  readonly preparedContext: PreparedApplicationContextV1;
  buildPromptVariables(): AiServiceResult<PromptVariablesV1>;
}

export interface OpaqueAvailabilityContextStageV1
  extends OpaqueApplicationContextStageV1 {
  readFeatureState(): Promise<AiServiceResult<AiFeatureStateReadV1>>;
  readConfigResolution(): Promise<AiServiceResult<AiModelConfigResolutionReadV1>>;
}

declare const opaqueApplicationInvocationBrand: unique symbol; // module-private

export interface AvailabilityInvocationOperationsV1 {
  readonly version: 1;
  readonly applicationClass: string;
  readonly capability: "text";
  readonly useCase: string;
  authorizeAssociation():
    Promise<AiServiceResult<OpaqueAuthorizedAvailabilityStageV1>>;
}

export interface OpaqueAvailabilityInvocationV1
  extends AvailabilityInvocationOperationsV1 {
  readonly [opaqueApplicationInvocationBrand]: "availability";
}

export interface CoreAvailabilityV1 {
  readonly available: boolean;
  readonly manualEditorAvailable: boolean;
  readonly code: AiErrorCode | "available";
}

export interface CoreCommittedRunSummaryV1 {
  readonly runId: string;
  readonly applicationClass: string;
  readonly useCase: string;
  readonly status:
    | "pending"
    | "processing"
    | "draft_ready"
    | "failed"
    | "cancelled";
  readonly queuedAt: string;
}

export interface OpaqueRequestContextStageV1
  extends OpaqueApplicationContextStageV1 {
  readonly requestIdentity: PreparedRequestIdentityV1;
  findReplay(): Promise<AiServiceResult<ReplayLookupResultV1>>;
  readFeatureState(): Promise<AiServiceResult<AiFeatureStateReadV1>>;
  readConfigResolution(): Promise<AiServiceResult<AiModelConfigResolutionReadV1>>;
  confirmResolvedConfiguration(input: {
    readonly modelConfigId: string;
    readonly expectedRecordVersion: number;
  }): Promise<AiServiceResult<AiModelConfigRow>>;
  commitPreparedRun(input: PreparedCoreRunV1):
    Promise<AiServiceResult<PreparedRunCommitResultV1>>;
}

export interface OpaqueAuthorizedRequestStageV1 {
  readonly association: ApplicationAssociationEnvelopeV1;
  readonly durableAssociation: DurableApplicationAssociationV1;
  buildContextAndFingerprint():
    Promise<AiServiceResult<OpaqueRequestContextStageV1>>;
}

export interface RequestInvocationOperationsV1 {
  readonly version: 1;
  readonly applicationClass: string;
  readonly capability: "text";
  readonly useCase: string;
  authorizeAssociation():
    Promise<AiServiceResult<OpaqueAuthorizedRequestStageV1>>;
}

export interface OpaqueRequestInvocationV1 extends RequestInvocationOperationsV1 {
  readonly [opaqueApplicationInvocationBrand]: "request";
}

export declare function createOpaqueAvailabilityInvocation(
  operations: AvailabilityInvocationOperationsV1,
): OpaqueAvailabilityInvocationV1;

export declare function createOpaqueRequestInvocation(
  operations: RequestInvocationOperationsV1,
): OpaqueRequestInvocationV1;

export interface OpaqueClaimedContextStageV1 {
  readonly preparedContext: PreparedApplicationContextV1;
  buildPromptVariables(): AiServiceResult<PromptVariablesV1>;
  parseAndProtect(rawObject: ReadonlyJsonObject):
    AiServiceResult<ProtectedApplicationResultEnvelopeV1>;
}

export interface OpaqueClaimedApplicationRuntimeV1 {
  readonly applicationClass: string;
  readonly capability: "text";
  readonly useCase: string;
  readonly inputSchemaVersion: number;
  readonly outputSchemaVersion: number;
  readonly policyVersion: string;
  decodeClaimedAssociation(row: unknown):
    AiServiceResult<ApplicationAssociationEnvelopeV1>;
  decodeClaimedContext(inputContext: unknown):
    AiServiceResult<OpaqueClaimedContextStageV1>;
}

export interface ClaimedApplicationRuntimeRegistryV1 {
  resolve(input: {
    readonly applicationClass: string;
    readonly capability: "text";
    readonly useCase: string;
    readonly inputSchemaVersion: number;
    readonly outputSchemaVersion: number;
    readonly policyVersion: string;
  }): AiServiceResult<OpaqueClaimedApplicationRuntimeV1>;
}

export interface AvailabilityInvocationBinder<
  TCommand,
  TAssociation,
  TAvailabilityScope extends ApplicationReadScope,
> {
  bindAvailability(input: {
    readonly actor: CoreAiActorV1;
    readonly command: TCommand;
    readonly association: TAssociation;
    readonly scope: TAvailabilityScope;
  }): AiServiceResult<OpaqueAvailabilityInvocationV1>;
}

export interface RequestInvocationBinder<
  TCommand,
  TAssociation,
  TRequestScope extends ApplicationReadScope,
> {
  bindRequest(input: {
    readonly actor: CoreAiActorV1;
    readonly command: TCommand;
    readonly association: TAssociation;
    readonly scope: TRequestScope;
    readonly idempotencyKey: string;
  }): AiServiceResult<OpaqueRequestInvocationV1>;
}

export interface PreparedApplicationInvocationBinding<
  TAvailabilityScope extends ApplicationReadScope,
  TRequestScope extends ApplicationReadScope,
> {
  bindAvailability(scope: TAvailabilityScope):
    AiServiceResult<OpaqueAvailabilityInvocationV1>;
  bindRequest(input: {
    readonly scope: TRequestScope;
    readonly idempotencyKey: string;
  }): AiServiceResult<OpaqueRequestInvocationV1>;
}

export interface AiApplicationDefinition<
  TCommand,
  TAssociation,
  TContext,
  TOutput extends ReadonlyJsonObject,
  TCommonReadScope extends ApplicationReadScope,
  TAvailabilityScope extends TCommonReadScope,
  TRequestScope extends TCommonReadScope,
> {
  readonly applicationClass: string;
  readonly useCase: string;
  readonly capability: "text";
  readonly commandCodec: ApplicationCommandCodec<TCommand, TAssociation>;
  readonly availabilityAuthorization:
    ApplicationAvailabilityAuthorization<
      TCommand,
      TAssociation,
      TAvailabilityScope
    >;
  readonly requestAuthorization: ApplicationRequestAuthorization<
    TCommand,
    TAssociation,
    TRequestScope
  >;
  readonly availabilityBinder: AvailabilityInvocationBinder<
    TCommand,
    TAssociation,
    TAvailabilityScope
  >;
  readonly requestBinder: RequestInvocationBinder<
    TCommand,
    TAssociation,
    TRequestScope
  >;
  readonly claimedRuntime: OpaqueClaimedApplicationRuntimeV1;
  readonly persistenceCodec: ApplicationPersistenceCodec<TAssociation>;
  readonly contextPolicy: ApplicationContextPolicy<
    TCommand,
    TAssociation,
    TContext,
    TCommonReadScope
  >;
  readonly resultPolicy: ApplicationProtectedResultPolicy<TContext, TOutput>;
  readonly promptContractId: string;
  readonly inputSchemaVersion: number;
  readonly policyVersion: string;
}

export interface TypedApplicationRegistry<
  TCommand,
  TAssociation,
  TContext,
  TOutput extends ReadonlyJsonObject,
  TCommonReadScope extends ApplicationReadScope,
  TAvailabilityScope extends TCommonReadScope,
  TRequestScope extends TCommonReadScope,
> {
  prepareInvocation(input: {
    readonly applicationClass: string;
    readonly capability: "text";
    readonly useCase: string;
    readonly actor: CoreAiActorV1;
    readonly applicationPayload: unknown;
  }): AiServiceResult<PreparedApplicationInvocationBinding<
    TAvailabilityScope,
    TRequestScope
  >>;
}

export declare function createTypedApplicationRegistry<
  TCommand,
  TAssociation,
  TContext,
  TOutput extends ReadonlyJsonObject,
  TCommonReadScope extends ApplicationReadScope,
  TAvailabilityScope extends TCommonReadScope,
  TRequestScope extends TCommonReadScope,
>(definitions: readonly AiApplicationDefinition<
  TCommand,
  TAssociation,
  TContext,
  TOutput,
  TCommonReadScope,
  TAvailabilityScope,
  TRequestScope
>[]): AiServiceResult<TypedApplicationRegistry<
  TCommand,
  TAssociation,
  TContext,
  TOutput,
  TCommonReadScope,
  TAvailabilityScope,
  TRequestScope
>>;

export interface GenericAiOrchestratorV1 {
  inspect(invocation: OpaqueAvailabilityInvocationV1):
    Promise<AiServiceResult<CoreAvailabilityV1>>;
  request(invocation: OpaqueRequestInvocationV1):
    Promise<AiServiceResult<CoreCommittedRunSummaryV1>>;
}
```

The current Draft application defines one and only one consistent read/query scope. It is structural, not a second repository. The underlying existing Drizzle `select` member shared by database and transaction objects is stored under a non-exported symbol and can be reached only by one internal helper imported by the four named repository implementations. The public scope exposes no query builder, `insert`, `update`, `delete`, raw `execute`, `transaction`, or row-lock operation:

```ts
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import type { AppDatabase } from "@/db/types";

declare const draftConsistentReadScopeBrand: unique symbol;
declare const draftReadExecutor: unique symbol; // module-private, not exported

export interface DraftConsistentReadScope<
  TQueryResult extends PgQueryResultHKT,
> extends ApplicationReadScope {
  readonly [draftConsistentReadScopeBrand]: true;
  readonly [draftReadExecutor]: Pick<AppDatabase<TQueryResult>, "select">;
  readonly mode: "read_only" | "governed_enqueue_transaction";
}

// Internal server export. Architecture gate permits imports only from the
// exact target/context/feature/config repository implementation files.
export declare function withDraftReadExecutor<
  TQueryResult extends PgQueryResultHKT,
  T,
>(
  scope: DraftConsistentReadScope<TQueryResult>,
  work: (query: Pick<AppDatabase<TQueryResult>, "select">) => Promise<T>,
): Promise<T>;

export interface ReadOnlyDraftAvailabilityScope<
  TQueryResult extends PgQueryResultHKT,
> extends DraftConsistentReadScope<TQueryResult> {
  readonly mode: "read_only";
}

export interface TransactionBoundDraftEnqueueScope<
  TQueryResult extends PgQueryResultHKT,
> extends DraftConsistentReadScope<TQueryResult> {
  readonly mode: "governed_enqueue_transaction";
  findReplay(input: AuthorizedReplayLookupV1):
    Promise<AiServiceResult<ReplayLookupResultV1>>;
  authorizeLockAndSnapshotTargetForNewRequest(input: {
    readonly actor: CoreAiActorV1;
    readonly command: DraftAssistanceCommandV1;
    readonly association: DraftDurableAssociationWithoutHashV1;
  }):
    Promise<AiServiceResult<AuthorizedDraftAssociationV1>>;
  lockSelectedConfigForNewRequest(input: {
    readonly modelConfigId: string;
    readonly expectedRecordVersion: number;
  }): Promise<AiServiceResult<AiModelConfigRow>>;
  insertPreparedWithRequiredAudit(input: PreparedCoreRunV1):
    Promise<AiServiceResult<PreparedRunCommitResultV1>>;
}
```

`withReadOnlyDraftAvailabilityScope` opens exactly one disclosed database transaction with `READ ONLY` and `REPEATABLE READ`, creates `ReadOnlyDraftAvailabilityScope`, invokes the availability composition once, and closes the scope. It writes no row and exposes no transaction/mutation member. `DraftAiRunEnqueuePort.withGovernedTransaction` later creates the transaction subtype around Phase C's one governed enqueue transaction. Both subtypes remain assignable to `DraftConsistentReadScope`, so context, feature, and configuration read repositories accept the same common capability. Target authorization is intentionally different: availability uses `DraftTargetReadRepository.authorizeAndReadTargetForAvailability(readOnlyScope, ...)`; request does not call that repository and uses only the transaction method above.

Each Production Draft definition binds these exact generic arguments:

```ts
type DraftDefinitionV1<TQueryResult extends PgQueryResultHKT> =
  AiApplicationDefinition<
    DraftAssistanceCommandV1,
    DraftDurableAssociationWithoutHashV1,
    ReconstructibleDraftContextV1,
    ProtectedDraftCandidateV1,
    DraftConsistentReadScope<TQueryResult>,
    ReadOnlyDraftAvailabilityScope<TQueryResult>,
    TransactionBoundDraftEnqueueScope<TQueryResult>
  >;

export declare function createDraftAvailabilityBinder<
  TQueryResult extends PgQueryResultHKT,
>(dependencies: {
  readonly authorization: ApplicationAvailabilityAuthorization<
    DraftAssistanceCommandV1,
    DraftDurableAssociationWithoutHashV1,
    ReadOnlyDraftAvailabilityScope<TQueryResult>
  >;
  readonly persistenceCodec:
    ApplicationPersistenceCodec<DraftDurableAssociationWithoutHashV1>;
  readonly contextPolicy: ApplicationContextPolicy<
    DraftAssistanceCommandV1,
    DraftDurableAssociationWithoutHashV1,
    ReconstructibleDraftContextV1,
    DraftConsistentReadScope<TQueryResult>
  >;
  readonly featureRepository: AiFeatureGateRepository;
  readonly configRepository: AiModelConfigRepository;
}): AvailabilityInvocationBinder<
  DraftAssistanceCommandV1,
  DraftDurableAssociationWithoutHashV1,
  ReadOnlyDraftAvailabilityScope<TQueryResult>
>;

export declare function createDraftRequestBinder<
  TQueryResult extends PgQueryResultHKT,
>(dependencies: {
  readonly authorization: ApplicationRequestAuthorization<
    DraftAssistanceCommandV1,
    DraftDurableAssociationWithoutHashV1,
    TransactionBoundDraftEnqueueScope<TQueryResult>
  >;
  readonly persistenceCodec:
    ApplicationPersistenceCodec<DraftDurableAssociationWithoutHashV1>;
  readonly contextPolicy: ApplicationContextPolicy<
    DraftAssistanceCommandV1,
    DraftDurableAssociationWithoutHashV1,
    ReconstructibleDraftContextV1,
    DraftConsistentReadScope<TQueryResult>
  >;
  readonly featureRepository: AiFeatureGateRepository;
  readonly configRepository: AiModelConfigRepository;
}): RequestInvocationBinder<
  DraftAssistanceCommandV1,
  DraftDurableAssociationWithoutHashV1,
  TransactionBoundDraftEnqueueScope<TQueryResult>
>;
```

The availability binder can therefore receive only the read-only subtype. Its `authorizeAssociation()` closure calls `availabilityAuthorization.authorizeAndSnapshotForAvailability`, which performs exactly one authorized target read and no lock. The request binder can receive only the transaction subtype. Its same-named opaque `authorizeAssociation()` closure calls `requestAuthorization.authorizeAndSnapshotForRequest`, whose Draft implementation delegates exactly once to `authorizeLockAndSnapshotTargetForNewRequest`. It performs no preliminary/common target read.

`authorizeLockAndSnapshotTargetForNewRequest` is the sole request target authority. In one actor-scoped `SELECT ... FOR UPDATE` operation it: (1) resolves only a row visible to the actor; (2) returns `authorization_denied` for absent/out-of-scope records without existence detail; (3) checks target kind/channel and current Draft/editability; (4) compares the current concurrency version; and (5) invokes the pure `buildAuthorizedDraftAssociationV1(validatedLockedProjection)` helper. The error precedence is therefore authorization denial, `target_not_editable`, then `target_version_conflict`. On success the returned object is the one exact `AuthorizedDraftAssociationV1` captured by the opaque authorized stage and consumed by context, fingerprint, prepared association encoding, and pending-column mapping. It is never reconstructed from a second live read.

`authorizeAndReadTargetForAvailability` issues one actor-scoped nonlocking select within the read-only snapshot. It applies the same no-existence-leak and check order—authorization denial, `target_not_editable`, then `target_version_conflict`—and then calls the same pure helper. It neither calls nor exposes the transaction request operation.

The pure helper accepts no repository/scope/callback and performs only strict invariant checks, construction of `DraftAuthorizedTargetSnapshotV1`, JCS, and SHA-256. If availability and request observe identical actor-visible target identity/version, their returned association/snapshot/hash are byte-identical; this is deterministic construction, not cross-request freshness authority. A later target change may legitimately yield a different version/hash on a later operation.

The scope factory projects the current database/transaction object to `Pick<..., "select">` under the private symbol. `withDraftReadExecutor` and the scope expire with the callback. Phase B's Production import allowlist contains exactly `config/feature-gate-repository.ts` and `config/model-config-repository.ts`; availability target and context are typed ports until Phase E supplies separately reviewed Domain adapters. Test-only fixtures may import the helper only under `src/ai/testing/**`. Phase E adds exact adapter paths rather than another database. An AST gate rejects `.for("update")`, raw locking SQL, `insert`, `update`, `delete`, `execute`, or `transaction` inside allowed common-read callbacks. The only selected-row locks are the two named transaction operations: target authorize-lock-snapshot and selected-config confirmation. There is no cast, duplicate repository, independently opened config transaction, or parallel database connection.

Registry construction is homogeneous per application composition. The Production Draft registry's four definitions all have the exact `DraftDefinitionV1` type; the Synthetic registry has its own command/association/context/output/scopes. `createTypedApplicationRegistry` stores and finds definitions as one readonly array of the already common generic type, so lookup needs no heterogeneous union recovery or assertion. `prepareInvocation` performs the only raw `applicationPayload: unknown` trust-boundary parse, obtains typed `TCommand` and `TAssociation`, and returns a `PreparedApplicationInvocationBinding` whose two methods close over those typed values. A parsed value is never converted back to `unknown` and reparsed.

Erasure occurs only when `PreparedApplicationInvocationBinding.bindAvailability(scope)` or `.bindRequest({scope,idempotencyKey})` passes a fully typed operations object to `createOpaqueAvailabilityInvocation` or `createOpaqueRequestInvocation`. Those generic constructors add a module-private brand and perform no parsing/cast. Architecture allows their calls only from registered application binder modules and isolated tests; facade/core/business code cannot structurally manufacture an invocation. Each operations object lexically captures the typed scope, command, association, policy, repositories, and later the exact typed authorized association/context; it does not store them in `unknown`, `any`, or a generic JSON slot. Core receives only the opaque staged interface and cannot name or recover the hidden types. Implementations may use neither `as`/angle-bracket assertions nor `any`, suppression comments, runtime discriminator casts, or a hidden map typed as `unknown`. The sole allowed `unknown` values are untrusted input at an explicit codec boundary (`applicationPayload`, durable row/JSON, Provider parameters/output); successful typed values never round-trip through it.

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

export type DraftDurableAssociationWithoutHashV1 =
  | {
      readonly persistenceVersion: 1;
      readonly kind: "draft_target.v1";
      readonly targetType: "product_draft";
      readonly targetProductId: string;
      readonly targetLocale: "en";
      readonly expectedTargetVersion: number;
    }
  | {
      readonly persistenceVersion: 1;
      readonly kind: "draft_target.v1";
      readonly targetType: "content_draft";
      readonly targetContentId: string;
      readonly targetLocale: "en";
      readonly expectedTargetVersion: number;
    }
  | {
      readonly persistenceVersion: 1;
      readonly kind: "draft_target.v1";
      readonly targetType: "editorial_revision";
      readonly targetRevisionId: string;
      readonly expectedTargetVersion: number;
    };

export type DraftDurableAssociationV1 =
  DraftDurableAssociationWithoutHashV1 & {
    readonly targetSnapshotHash: string;
  };

export type DraftAuthorizedTargetSnapshotV1 =
  | {
      readonly association_version: 1;
      readonly expected_target_version: number;
      readonly target_locale: "en";
      readonly target_product_id: string;
      readonly target_type: "product_draft";
    }
  | {
      readonly association_version: 1;
      readonly expected_target_version: number;
      readonly target_content_id: string;
      readonly target_locale: "en";
      readonly target_type: "content_draft";
    }
  | {
      readonly association_version: 1;
      readonly expected_target_version: number;
      readonly target_revision_id: string;
      readonly target_type: "editorial_revision";
    };

export interface AuthorizedDraftAssociationV1 {
  readonly association: DraftDurableAssociationWithoutHashV1;
  readonly snapshot: DraftAuthorizedTargetSnapshotV1;
  readonly snapshotHash: string;
}

export interface DraftTargetColumnProjectionV1 {
  readonly targetType:
    | "product_draft"
    | "content_draft"
    | "editorial_revision";
  readonly targetProductId: string | null;
  readonly targetContentId: string | null;
  readonly targetRevisionId: string | null;
  readonly targetLocale: "en" | null;
  readonly expectedTargetVersion: number;
  readonly targetSnapshotHash: string;
}

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

The Draft association codec is strict and closed. Every UUID is canonical lowercase `8-4-4-4-12` text accepted by the existing UUID columns; `expectedTargetVersion` is an integer `1..2147483647`; hashes are lowercase 64-hex. No union member accepts a key from another member. For Product and Content, `targetLocale` is required and exactly `en`; for Revision it is absent, never `null` inside the union. `persistenceVersion`/`association_version` is the compiled constant `1`; the immutable registry resolves that decoder by the already durable `(application_class,use_case,input_schema_version,policy_version)` tuple and must retain historical decoders. No database column is needed because any future incompatible association contract requires a new versioned codec and separately reviewed forward persistence decision rather than reinterpretation.

The Draft definition binds `TAssociation=DraftDurableAssociationWithoutHashV1`: its command codec maps the request-facing `DraftTarget` bijectively to that union before authorization, so the generic `AuthorizedAssociationSnapshot<TAssociation>` is structurally the exact `AuthorizedDraftAssociationV1`. There is no intermediate untyped Draft association.

The authorized-target snapshot is deliberately the minimal projection reproducible from accepted `0020`: association contract version, exact target kind and ID, locale when the physical target has one, and expected concurrency version. Its exact hash procedure is:

1. construct the matching strict snake-case `DraftAuthorizedTargetSnapshotV1` with no null or extra key;
2. JCS serialize under Section 10.4, which sorts keys by raw UTF-16 code units and emits no whitespace;
3. SHA-256 the UTF-8 canonical bytes; and
4. encode lowercase hex into `target_snapshot_hash`.

The mapping is bijective:

| Union member | `target_type` | `target_product_id` | `target_content_id` | `target_revision_id` | `target_locale` | `expected_target_version` | `target_snapshot_hash` |
|---|---|---|---|---|---|---:|---|
| Product | `product_draft` | exact Product UUID | `NULL` | `NULL` | `en` | exact positive version | hash of Product snapshot |
| Content | `content_draft` | `NULL` | exact Content UUID | `NULL` | `en` | exact positive version | hash of Content snapshot |
| Revision | `editorial_revision` | `NULL` | `NULL` | exact Revision UUID | `NULL` | exact positive `draftVersion` | hash of Revision snapshot |

`encodeDraftTargetColumnsV1` accepts only `AuthorizedDraftAssociationV1`, recomputes its snapshot from the association rather than trusting the supplied `snapshot`, requires both hashes equal, and produces the row tuple above. `decodeDraftTargetColumnsV1` accepts exactly the seven accepted columns in `DraftTargetColumnProjectionV1`, enforces the table's exactly-one-FK/locale/type/version shape, reconstructs `persistenceVersion=1`, reconstructs the snapshot, recomputes its hash, and requires equality before returning `DraftDurableAssociationV1`. Encode then decode is identity; decode then encode reproduces the same seven column values. The decoder has no `snapshot`, `durableAssociation`, or arbitrary JSON input.

The generic claimed constructor receives the exact selected `ai_runs` row. After application-neutral claimed-runtime lookup it passes the accepted row projection to the runtime's opaque association decoder; the Draft-owned closure reads only those seven physical columns, performs the decoder above, and returns `ApplicationAssociationEnvelopeV1` to core. Thus `core/**` remains application-neutral and never contains the Draft union, while no Worker can provide an unstored association snapshot. A future application supplies its own erased claimed runtime only after its separately reviewed forward Schema; Synthetic tests never use this `0020` codec.

`target_snapshot_hash` does **not** claim to hash all mutable target text, status, source values, actor scope, selector choices, task controls, or explicit input. Those values have different authorities:

- enqueue rechecks current actor scope, target Draft/editability, and the exact version before creating the association;
- `input_context_json` freezes every sanitized target/source/task value used to rebuild Prompt variables, and `input_hash` protects its exact JCS value;
- `request_fingerprint` binds actor, association identity/version/hash, ordered selected sources, and explicit-input hash for replay;
- Phase E reauthorizes and rechecks the live target/version before any candidate is applied.

This separation is sufficient: target identity plus the authoritative concurrency version and reproducible target hash prevent column/target substitution, while `input_hash` prevents Provider-input substitution. The Worker executes the frozen authorized input; it does not pretend to revalidate current business truth or to own target freshness.

The following literal association vectors are mandatory and independently recomputable:

| Kind | Exact JCS bytes | SHA-256 |
|---|---|---|
| Product | `{"association_version":1,"expected_target_version":7,"target_locale":"en","target_product_id":"11111111-1111-4111-8111-111111111111","target_type":"product_draft"}` | `95a697f896416f7a808ef3364f99e5bc0510c5d103f44ba4ac871e5e4c9a1b3f` |
| Content | `{"association_version":1,"expected_target_version":9,"target_content_id":"22222222-2222-4222-8222-222222222222","target_locale":"en","target_type":"content_draft"}` | `bb107bd612e64448ba153731e6a4e77b76cf0335bb3519380a92789d48b4f378` |
| Revision | `{"association_version":1,"expected_target_version":12,"target_revision_id":"33333333-3333-4333-8333-333333333333","target_type":"editorial_revision"}` | `052b71a6215d4661761e1e045410d864915770a7abf9ddea60bcee998edaf8ea` |

Each vector test performs `DraftTarget` preparation -> authorized snapshot -> seven pending-row columns -> JSONB/driver-shaped row read -> claimed decoder -> re-encoded columns and requires exact deep equality and the listed hash. For each of the three kinds, separate cases tamper contract version at preparation, discriminator, each UUID position/value/case/type, each nullable FK, locale null/value/type, expected version value/zero/fraction/string, stored hash value/type/case, added key, omitted key, and swapped hash from either other kind. Every tamper is `association_provenance_mismatch` and makes zero adapter calls.

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
  | {
      readonly kind: "exact_replay";
      readonly summary: CoreCommittedRunSummaryV1;
    };

type PreparedRunCommitResultV1 =
  | {
      readonly kind: "inserted";
      readonly summary: CoreCommittedRunSummaryV1;
    }
  | {
      readonly kind: "unique_loser_exact_replay";
      readonly summary: CoreCommittedRunSummaryV1;
    };

interface DraftAiRunEnqueuePort<
  TQueryResult extends PgQueryResultHKT,
> {
  withGovernedTransaction<T>(work: (
    scope: TransactionBoundDraftEnqueueScope<TQueryResult>,
  ) => Promise<AiServiceResult<T>>): Promise<AiServiceResult<T>>;
}
```

`ResolvedModelConfigV1` is strictly pre-dispatch and therefore contains no `actualProvider`, returned model, dispatch time, attempt, lease, or response evidence. `requestedProvider` is the selected adapter/configuration identity. `actualProvider` exists only in a post-dispatch claimed projection constructed from an accepted row after the separately committed Phase C dispatch marker.

The Draft facade performs strict outer parsing/coarse shielding, then calls the Draft-typed registry's `prepareInvocation` once. Availability composition calls the returned binding's `bindAvailability(readOnlyScope)`; the request transaction callback calls `bindRequest({scope:transactionScope,idempotencyKey})`. Only then does it pass the returned opaque invocation to `GenericAiOrchestratorV1`. `core/**` does not perform a Production registry lookup and never receives a scope.

The generic request orchestrator owns the opaque staged order: `authorizeAssociation`, `buildContextAndFingerprint`, `findReplay`, and only for `new_request`, feature/config/Prompt preparation followed by `confirmResolvedConfiguration` and `commitPreparedRun`. The request binder maps those generic closures to the captured transaction's `findReplay`, selected-config lock/recheck, and `insertPreparedWithRequiredAudit`. The transaction scope owns the unique-conflict fetch, target/config row locks, insert/Audit atomics, and lifetime; it cannot call an adapter. The commit operation returns `inserted` or, after a unique loser performs one scoped fetch and the same comparison, `unique_loser_exact_replay`; mismatched fingerprint/scope returns the existing typed conflict/denial instead of this union. This prevents resolution before replay and prevents core from issuing run SQL or naming a Draft lock.

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
  readonly applicationAssociation: ApplicationAssociationEnvelopeV1;
  readonly targetSnapshotHash: string;

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

The internal core-owned constructor accepts the raw exact Phase C database row projection, not a caller-built `durableAssociation`. It strict-parses common columns and resolves only an `OpaqueClaimedApplicationRuntimeV1` from the application-neutral claimed registry. For current Draft runs its hidden decoder reads only `target_type`, all three nullable target FKs, `target_locale`, `expected_target_version`, and `target_snapshot_hash`, then performs the closed reconstruction above. The constructor resolves output behavior only from durable `(application_class,use_case,input_schema_version,output_schema_version,policy_version)`, verifies all required fields/non-null lease and post-dispatch state, deep-copies JSON values, deep-freezes the projection, and creates the brand. The Worker cannot nominate a schema ID, association JSON, snapshot JSON, actual Provider, or rendered request independently of the row. The brand proves only that the constructor ran. The durable row plus opaque claimed runtime, exact Prompt bytes, JCS hashes, envelope/policy identities, and lease/state checks are authority.

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

A registry key is the tuple `(applicationClass, capability,useCase)`. Every entry is a complete immutable `AiApplicationDefinition` with both authorization policies and both binders. Registry construction fails on a duplicate tuple, missing/mismatched binder or codec/policy, unequal association kind between availability/request/persistence, codec metadata disagreement, duplicate output schema identity within an application, duplicate result/disposition kind with incompatible schemas, unsupported capability, or unversioned policy. Lookup never defaults.

The typed registry is owned by the application composition, not core. It parses the raw payload once and returns a prepared dual-scope binding that can invoke the availability binder only with `TAvailabilityScope` or the request binder only with `TRequestScope`. The selected binder returns an opaque staged invocation; generic core calls only those opaque closures in the normative order and does not branch on association/result/disposition kind. Application-owned codecs must produce strict JSON-compatible envelopes and versioned hashes. Current Draft definitions are responsible for:

- parsing the three-member `DraftTarget` union;
- binding availability target authorization to `ReadOnlyDraftAvailabilityScope` and request authorize-lock-snapshot to `TransactionBoundDraftEnqueueScope`;
- mapping it to/from the accepted `ai_runs.target_*` columns;
- enforcing Draft authorization/context rules;
- protecting candidate output with `resultKind="draft_candidate"`;
- declaring `dispositionKind="draft_human_review"` and current allowed human outcomes; and
- mapping protected results to `candidate_json`/`candidate_hash` only in Phase C.

Those literals, scope types, target repository calls, and transaction method names occur under `applications/draft-assistance/**` and the accepted database mapping, never in `core/**`. All four Production entries share the same seven generic type arguments shown in Section 8; a mixed-scope entry fails registry construction/compilation.

### 9.2 Exact Production table

| Use case | Application/capability | Association and condition | Availability/request authorization binders | Context policy | Prompt contract | Output/result/disposition |
|---|---|---|---|---|---|---|
| `seo_content_draft` | `draft_assistance` / `text` | Draft-owned `draft_target.v1`: Product Draft, Content Draft, or editable Product/Content Editorial Revision; parent Draft and English | availability: one scoped authorized read/no lock; request: one transaction authorize-lock-snapshot. Admin; Product Editor for Product; Content Editor for Content. Reviewer/Publisher alone denied | `ctx.seo-content.v1` | `seo-content-draft` | `cwt.seo-content-draft.v1` / `draft_candidate` / `draft_human_review` |
| `fabric_knowledge_draft` | same | `draft_target.v1`: Content Draft or editable Content Revision with channel exactly `fabric_knowledge` | same dual binder; Admin or Content Editor within record scope | `ctx.fabric-knowledge.v1` | `fabric-knowledge-draft` | `cwt.fabric-knowledge-draft.v1` / same Draft kinds |
| `product_description_draft` | same | `draft_target.v1`: Product Draft or editable Product Revision | same dual binder; Admin or Product Editor within record scope | `ctx.product-description.v1` | `product-description-draft` | `cwt.product-description-draft.v1` / same Draft kinds |
| `sourcing_guide_draft` | same | `draft_target.v1`: Content Draft or editable Content Revision with channel exactly `china_sourcing_guide` | same dual binder; Admin or Content Editor within record scope | `ctx.sourcing-guide.v1` | `sourcing-guide-draft` | `cwt.sourcing-guide-draft.v1` / same Draft kinds |

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

Its tuple is `("synthetic_test_application","text","synthetic_extensibility_probe")`. Its association cannot be assigned to `DraftTarget`, its result is not a Draft Block/candidate, and its disposition values are not `not_evaluated/accepted/accepted_with_edits/rejected`. It owns `SyntheticObservationReadScope` and `SyntheticCaseTransactionScope`, whose request-only operation is named `authorizeReserveAndSnapshotCase` and returns a non-Draft association. Its availability and request binders erase to the same two opaque core interfaces. It owns a separate command codec, context policy, Prompt manifest/resource, output schema, result protector, and fake configuration. The generic preparation/reconstruction/one-call/parser/result flow passes by composing a fresh Synthetic typed registry in test code only.

The proof has two enforcement assertions:

1. the test patch/fixture imports no file below `applications/draft-assistance`, introduces no Draft type or lock identifier, and does not modify/import-switch `core/orchestrator.ts` or `core/contracts.ts`; positive compilation proves both Synthetic binders and both opaque core calls against the published generic interfaces; and
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

Context, feature, and configuration repositories accept the same common scope; none accepts a mutation-only interface or opens a connection itself. The availability target repository deliberately accepts only the read-only subtype. The request path has no target read repository call and uses only the transaction authority from Section 8:

```ts
interface DraftTargetReadRepository {
  authorizeAndReadTargetForAvailability<
    TQueryResult extends PgQueryResultHKT,
  >(
    scope: ReadOnlyDraftAvailabilityScope<TQueryResult>,
    input: StrictDraftTargetAuthorizationInputV1,
  ): Promise<AiServiceResult<AuthorizedDraftTargetReadV1>>;
}

interface DraftContextReadRepository {
  readSelectedSources<TQueryResult extends PgQueryResultHKT>(
    scope: DraftConsistentReadScope<TQueryResult>,
    input: StrictDraftContextSelectionV1,
  ): Promise<AiServiceResult<readonly StrictDraftSourceProjectionV1[]>>;
}

interface AiFeatureGateRepository {
  readAiFeatureState<TQueryResult extends PgQueryResultHKT>(
    scope: DraftConsistentReadScope<TQueryResult>,
  ): Promise<AiServiceResult<AiFeatureStateReadV1>>;
}
```

The configuration repository port uses the same scope:

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
  readResolutionState<TQueryResult extends PgQueryResultHKT>(
    scope: DraftConsistentReadScope<TQueryResult>,
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

The materialized scoped relation and aggregate are one statement/snapshot. In Phase B availability it runs through a closure bound to `ReadOnlyDraftAvailabilityScope`; in Phase C new-request preparation it runs through a closure bound to the assignable `TransactionBoundDraftEnqueueScope`. Only after resolution succeeds does generic core invoke the opaque `confirmResolvedConfiguration` closure; Draft composition maps that closure to the transaction-only selected-config lock/recheck. The repository and core cannot name or perform the lock. No result is cached across requests. Immutable Prompt bytes may be cached by full tuple, but active configuration facts may not.

Compile-contract tests use `expectTypeOf`/conditional key checks, not casts or suppression comments:

```ts
expectTypeOf<ReadOnlyDraftAvailabilityScope<PgQueryResultHKT>>()
  .toMatchTypeOf<DraftConsistentReadScope<PgQueryResultHKT>>();
expectTypeOf<TransactionBoundDraftEnqueueScope<PgQueryResultHKT>>()
  .toMatchTypeOf<DraftConsistentReadScope<PgQueryResultHKT>>();

type ReadOnlyHasInsert = "insertPreparedWithRequiredAudit" extends
  keyof ReadOnlyDraftAvailabilityScope<PgQueryResultHKT> ? true : false;
type CommonHasLock = "lockSelectedConfigForNewRequest" extends
  keyof DraftConsistentReadScope<PgQueryResultHKT> ? true : false;
type CommonHasSelect = "select" extends
  keyof DraftConsistentReadScope<PgQueryResultHKT> ? true : false;
type TxHasInsert = "insertPreparedWithRequiredAudit" extends
  keyof TransactionBoundDraftEnqueueScope<PgQueryResultHKT> ? true : false;
type ReadOnlyHasTargetAuthorization =
  Parameters<DraftTargetReadRepository[
    "authorizeAndReadTargetForAvailability"
  ]>[0] extends ReadOnlyDraftAvailabilityScope<PgQueryResultHKT>
    ? true
    : false;
type TxHasRequestTargetAuthority =
  "authorizeLockAndSnapshotTargetForNewRequest" extends
  keyof TransactionBoundDraftEnqueueScope<PgQueryResultHKT> ? true : false;

expectTypeOf<ReadOnlyHasInsert>().toEqualTypeOf<false>();
expectTypeOf<CommonHasLock>().toEqualTypeOf<false>();
expectTypeOf<CommonHasSelect>().toEqualTypeOf<false>();
expectTypeOf<TxHasInsert>().toEqualTypeOf<true>();
expectTypeOf<ReadOnlyHasTargetAuthorization>().toEqualTypeOf<true>();
expectTypeOf<TxHasRequestTargetAuthority>().toEqualTypeOf<true>();
```

Positive fixtures compile context/feature/config repository calls with both scope subtypes, compile the target repository only with the read-only subtype, compile the availability binder only with read-only, and compile the request binder only with the transaction subtype. Separate negative `tsc --noEmit` fixtures intentionally attempt: availability insert/Audit/lock; target availability authorization from common/transaction scope; request binder from read-only/common scope; direct common-scope select/row-lock/mutation/raw execute/transaction; and construction without private brands. Each must fail compilation. An AST assertion proves allowed common-read callbacks and both binder implementations contain no cast (`as`, angle-bracket assertion), `any`, parsed-value `unknown` round trip, parallel DB import/open, unauthorized row lock, mutation, raw execute, or transaction. Transaction-only fixtures prove replay, target/config locks, insert, and required Audit are unavailable outside `TransactionBoundDraftEnqueueScope`; a core-source fixture rejects every Draft/scope/repository/lock identifier.

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

```ts
interface ResolvedConfigHashInputV1 {
  readonly application_class: "draft_assistance";
  readonly capability: "text";
  readonly use_case: ProductionAiUseCase;
  readonly model_config_id: string;
  readonly model_config_version: number;
  readonly requested_provider: string;
  readonly requested_model: string;
  readonly parameters_snapshot_json: ReadonlyJsonObject;
  readonly max_input_tokens: number;
  readonly max_output_tokens: number;
  readonly max_attempts: number;
  readonly run_cost_limit_microusd: number;
  readonly prompt_id: string;
  readonly prompt_version: number;
  readonly prompt_hash: string;
  readonly provider_envelope_version: number;
  readonly provider_envelope_hash: string;
  readonly input_schema_version: number;
  readonly output_schema_version: number;
  readonly policy_version: string;
}
```

These are exactly the Phase A Section 5.2 fields, including `application_class`. Keys are fixed snake_case as shown; no `actual_provider`, returned model, timestamp, actor, environment, credential, endpoint, fallback, or mutable config object is included. `model_config_version` and microusd values must be positive/nonnegative safe integers before JCS; accepted database `bigint` values outside ECMAScript safe integer range fail decoding rather than hash approximately.

The fixed independent reconstruction vector is:

```json
{"application_class":"draft_assistance","capability":"text","input_schema_version":1,"max_attempts":3,"max_input_tokens":16000,"max_output_tokens":4000,"model_config_id":"44444444-4444-4444-8444-444444444444","model_config_version":4,"output_schema_version":1,"parameters_snapshot_json":{"temperature":0,"top_p":1},"policy_version":"draft-product-description-v1","prompt_hash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","prompt_id":"product-description-draft","prompt_version":1,"provider_envelope_hash":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","provider_envelope_version":1,"requested_model":"synthetic-text-alpha-v1","requested_provider":"synthetic_alpha","run_cost_limit_microusd":20000,"use_case":"product_description_draft"}
```

Its exact UTF-8 JCS SHA-256 is `4a31457a0458233e62c0de489f95f3e7cd6463c1fe95b3e0c3620452d82845f3`. A mandatory test independently builds the object four times—from the resolver, from the prepared aggregate, from the pending row, and from the post-dispatch claimed row—and requires byte-identical canonical JSON and this hash.

The same vector proves dispatch semantics:

1. resolver/preparation contains `requestedProvider="synthetic_alpha"` and no `actualProvider` property;
2. enqueue inserts `actual_provider=NULL`, `provider_dispatched_at=NULL`, `active_attempt_dispatched_at=NULL`, `status='pending'`, `attempt_count=0`, and `provider_response_status='not_dispatched'`; the accepted equality `(provider_dispatched_at IS NULL) = (actual_provider IS NULL)` is true;
3. claim may set processing/lease/attempt/state, but both Provider dispatch fields and the active marker remain null;
4. the separately committed fenced first-dispatch marker atomically sets `actual_provider='synthetic_alpha'`, first-fills `provider_dispatched_at='2026-08-10T00:00:02.000Z'`, sets `active_attempt_dispatched_at` to the same literal instant, and increments `state_version`; the accepted equality remains true in its non-null branch;
5. only the row returned by that committed marker is decoded as a claimed projection with required `actualProvider`; claimed construction requires `actualProvider===requestedProvider` and both dispatch timestamps, or returns `config_provenance_mismatch`/`claimed_run_required` with zero adapter calls; and
6. every retry retains the immutable first-dispatch time/actual Provider and sets a new active marker only through its own fenced dispatch transaction. No fallback or substitution is inferred.

The fixed state projection is:

| Stage | Exact relevant accepted values |
|---|---|
| Prepared | config object/hash above; `requestedProvider="synthetic_alpha"`; property `actualProvider` absent |
| Pending insert | `status="pending"`, `retry_state="none"`, `attempt_count=0`, `state_version=1`, `queued_at="2026-08-10T00:00:00.000Z"`, `next_attempt_at` same, `actual_provider=NULL`, both dispatch timestamps `NULL`, response `not_dispatched` |
| Claimed, not dispatched | `status="processing"`, `attempt_count=1`, `state_version=2`, `lease_owner="synthetic-worker-01"`, `lease_token="55555555-5555-4555-8555-555555555555"`, acquired `2026-08-10T00:00:01.000Z`, expires `2026-08-10T00:01:01.000Z`, actual Provider and both dispatch timestamps still `NULL` |
| Dispatch marker result / claimed input | same lease/attempt, `state_version=3`, `actual_provider="synthetic_alpha"`, `provider_dispatched_at="2026-08-10T00:00:02.000Z"`, `active_attempt_dispatched_at` same, hash unchanged |

The vector builder must materialize all 20 hash fields from each stage's accepted columns, not carry the prior object forward by reference. It asserts the pending and claimed canonical bytes/hash are identical, pending/claim satisfy the null branch, marker/claimed satisfy the non-null branch, and the constructor refuses the claimed DTO when given the pre-marker row.

Tamper cases delete/add `application_class`, use a camel-case key, change any of the 20 values, change nested parameter value/order semantics, add `actual_provider`, set pending actual Provider without dispatch time, set dispatch time without actual Provider, or change actual Provider after marker. Hash/projection mismatches fail before adapter; physical null/non-null violations are also rejected by accepted `ai_runs_active_attempt_dispatch_check`.

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
| `target_type` | Exact Draft codec discriminator: `product_draft`, `content_draft`, or `editorial_revision`. |
| `target_product_id` | Exact Product UUID only for Product member; otherwise null. |
| `target_content_id` | Exact Content UUID only for Content member; otherwise null. |
| `target_revision_id` | Exact editable Revision UUID only for Revision member; otherwise null. |
| `target_locale` | Exact `en` for Product/Content members; null for Revision and omitted from its canonical snapshot. |
| `expected_target_version` | Positive integer rechecked `editor_document_version` or Revision `draftVersion`; exact snapshot input. |
| `target_snapshot_hash` | SHA-256 of Section 8's exact JCS identity/version projection. Claimed core/application codec reconstructs it from these accepted columns only; no arbitrary snapshot is stored or assumed. |
| `model_config_id` | Resolved `ai_model_config.id`. |
| `model_config_version` | Resolved `record_version`. |
| `resolved_config_hash` | Phase B RFC 8785/JCS hash over the exact Phase A field set including `application_class`; claimed core reconstructs that object from durable columns and requires equality before dispatch. |
| `requested_provider` | Resolved config provider. |
| `actual_provider` | Enqueue and claim-before-dispatch insert/retain null. The separately committed dispatch marker sets it with both dispatch timestamps/state version. Only post-dispatch claimed execution sees it and requires equality to requested. |
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
| `input_context_json` | Exact strict `ReconstructibleDraftContextV1`: application/use-case/association identity, locale, ordered sanitized target/source values/provenance, task controls, and every Prompt-variable input. It protects mutable/contextual values deliberately excluded from the identity/version-only `target_snapshot_hash`; it excludes rendered Prompt/request and is sufficient for deterministic reconstruction. |
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
| `active_attempt_dispatched_at` | Phase C current-attempt dispatch marker; remains null through enqueue/claim and is set with `actual_provider` plus first dispatch time before adapter call. |
| `state_version` | Phase C compare-and-swap authority; claimed execution carries expected value. |
| `cancelled_lease_token` | Phase C cancellation/late-accounting authority. |
| `cancelled_by_user_id` | Phase C authorized cancellation. |
| `cancellation_reason` | Phase C bounded safe reason. |
| `cancelled_at` | Phase C. |
| `queued_at` | Phase C insert timestamp. |
| `provider_dispatched_at` | Null on pending/claimed-undispatched rows; Phase C first successful dispatch-marker transaction first-fills it atomically with `actual_provider`. |
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

“Narrative use” below means only that a field may be included in a human-review-required candidate under Section 14's finite structural rules. It never means the ref mechanically proves the English claim or that AI may establish the field as truth.

| Field | Existing authority / actual service behavior | Eligibility and serialized provenance | Provider-bound? | Narrative use |
|---|---|---|---|---|
| `productCode` | `products.product_code`; generated/corrected by dedicated immutable/Audited flows; Product Data Dictionary marks it Hidden/internal | structural identity only, but excluded from Provider context | **No** | **No**. It cannot appear in title, description, feature, FAQ, Block, Alt Text, Caption, or other AI candidate. It may remain internal target/provenance identity outside `input_context_json`. |
| English `name` | `product_localizations.name` or exact editable Revision snapshot, with `editor_document_version`/`draft_version` rechecked by Product Domain policy | nonblank current authorized value -> `structural`; max 300 chars/UTF-8 1 KiB | Yes | May inform/propose name/narrative; proposed text is still candidate, never direct fact mutation. |
| Primary Category label | `product_taxonomy_terms.is_primary=true` + `taxonomy_term_localizations(locale='en').name`; one-primary unique authority and Product structure service | relation must exist and English label be nonblank -> `structural`; max 200 chars | Yes | Exact label may inform narrative; output has no category ID/mutation/suggestion field in Product Description. |
| Additional Category labels | same tables with `is_primary=false`; Product structure service | explicitly selected relations with English labels, sorted by relation ID before aliasing -> `structural`; max 16 labels, 200 each | Yes | Exact labels may inform narrative only; cannot change authority. |
| Application labels | `product_applications` + `applications` + `application_localizations(locale='en').name`; Product structure service | explicitly selected current relations with nonblank English labels -> `structural`; max 16, 200 each | Yes | Exact labels may inform narrative only; cannot create/remove Applications. |
| `composition` | `products.composition` plus `product_field_reviews`; `updateProductFacts` writes `provided/empty` and `reviewProductField` permits `verified/rejected` | nonblank value and exact review row status `provided` or `verified`; provenance preserved | Yes when explicitly selected | May be repeated/paraphrased only in narrative with the field ref; no composition field/table/patch is emitted. |
| `weightGsm` | `products.weight_gsm numeric(10,2)` plus exact review row | non-null positive value and `provided/verified`; serialize canonical decimal string with no unit embedded | Yes when selected | Exact `<value> GSM` token may enter a candidate only under A-04 and human review; no GSM field/patch/table. |
| `widthCm` | `products.width_cm numeric(10,2)` plus exact review row | non-null positive value and `provided/verified`; canonical decimal string | Yes when selected | Exact `<value> cm` token may enter a candidate only under A-04 and human review; no width field/patch/table. |
| `moqValue` + `moqUnit` | paired DB Check; `products.moq_*` plus separate review rows; service normalizes unit to `m/kg/roll/yd` | both values non-null, both review rows `provided/verified`, unit allowlisted. Pair provenance is `verified` only if both verified; otherwise `provided`. Never serialize one alone | Yes only as pair | Exact `<value> <unit>` token may enter a candidate only with both refs under A-04 and human review; no MOQ field/patch/table. |
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
  readonly sourceRefs: readonly string[]; // 1..8, unique, input-order
}
```

`text` must already be trimmed, use LF only, contain no forbidden control/URL/Secret/placeholder, and cannot be transformed by the parser. Each ref matches `^src_[0-9]{2}:[a-z][A-Za-z0-9_]{0,63}$` and must exist in the exact context. Every nonempty text node requires at least one ref; there is no connective/editorial zero-ref classifier. A ref is only a provenance pointer to an input field. Its presence never proves that the English sentence is entailed by, faithful to, or factually supported by that field.

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

### 14.3 Finite automatic evidence policy and human semantic boundary

The automatic policy is deliberately finite and fail-closed. It does not run a natural-language classifier, semantic similarity model, external lookup, or entailment engine. It evaluates each exact `EvidenceText.text` and its refs under these numbered rules only:

1. **A-01 strict structural node:** the applicable strict Zod schema, length/byte/control/LF/trim bounds, and outer use-case/locale discriminator pass; unknown fields or types fail.
2. **A-02 mandatory provenance refs:** `sourceRefs` has `1..8` unique entries in context order. Every entry exactly matches one `ReconstructibleSourceEntryV1.fields[].ref`; missing, duplicate, reordered, fabricated, or cross-run refs fail.
3. **A-03 field/use-case eligibility:** build one `AllowedEvidenceRefSetV1` from the exact reconstructed context by retaining only source classes allowed for the current use case in §13.5 and fields that passed the authority/eligibility rules in §13.3–§13.4. Every `EvidenceText` location uses that same finite set; there is no inferred location classifier. Product Code and ineligible/rejected/unknown fields never enter it. Link/media placement refs use their separate exact supplied allowlists and are never evidence refs.
4. **A-04 numeric/unit literals:** scan an NFKC-normalized lowercase copy without changing stored text. The only accepted digit-bearing narrative spans are canonical positive decimal plus one ASCII space plus `gsm`, `cm`, `m`, `kg`, `roll`, or `yd`. `gsm` requires a cited `weightGsm` field whose canonical decimal string equals the span; `cm` requires the same equality to cited `widthCm`; MOQ units require cited adjacent `moqValue` and `moqUnit` refs from the same alias and exact value/unit equality. Leading `+`, minus, exponent, comma/grouping, extra decimal zero, half MOQ pair, wrong/case-altered canonical unit, or any other Unicode decimal digit after removing accepted spans fails. This is token equality only, not sentence entailment.
5. **A-05 currency/percentage/date/time:** reject any `$`, `¢`, `£`, `¥`, `€`, `₹`, `₩`, `%`, full-width equivalent, or whole token `usd`, `eur`, `gbp`, `cny`, `rmb`, `jpy`, `percent`, or `percentage`. Reject whole tokens for all English month names/three-letter abbreviations, weekdays/three-letter abbreviations, `today`, `tomorrow`, `yesterday`, `am`, `pm`, `utc`, and `gmt`. Numeric dates/times already fail A-04. No current allowed context grants a currency/percentage/date output exception.
6. **A-06 forbidden category/action lexicon:** on the same NFKC lowercase scan copy, split whole words on non-letter/digit boundaries and also scan listed phrases. Reject exact whole tokens/phrases in these closed sets: certification `{certification,certified,certificate,iso,oeko,grs,gots,bci}`; facility/ownership/capacity/history `{factory,facility,plant,workshop,equipment,machine,loom,capacity,employees,staff,founded,established,ownership,"our factory","in house","years of experience"}`; customer/contact `{customer,client,crm,inquiry,email,phone,telephone,whatsapp,wechat,"contact us"}`; privileged action `{publish,index,noindex,route,redirect,canonical,sitemap,deploy,"send message","call tool","search web",retrieve,retrieval,browse,upload,download,"open file","read file"}`. This conservative ban applies even with a ref; a human may author such content outside AI when existing authorities permit it.
7. **A-07 forbidden data syntax:** scan the NFKC copy with these fixed Unicode-aware patterns/sets: scheme `\b(?:https?|wss?|ftp|s3|r2):\/\/`; web prefix `\bwww\.`; hostname `\b[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z]{2,24})+\b`; email `[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}`; phone-like `(?<!\p{N})\+?\p{N}[\p{N} ()-]{5,}\p{N}(?!\p{N})`; HTML/tag `</?[a-z][^>]{0,500}>`; absolute/relative path boundary `(?:^|[\s"'(])(?:/|\.{1,2}/|[a-z]:\\)`; and whole token/phrase set `{api key,authorization,bearer,credential,password,secret,access token,object key,system prompt,ignore previous,function call,tool call,retrieval query}`. Any match, any Section 13.6 protected-data key/value match, or any C0 control other than permitted LF rejects. This is an exact local pattern/denylist result, not a privacy classifier claim.
8. **A-08 candidate mechanics:** exact ref/link/media membership, meaningful-proposal minimum, placeholder/spam/repetition bounds, heading progression, derived candidate refs, canonical size/hash, and no Provider `id`/`locked` pass.
9. **A-09 fixed protection labels:** application protection adds `automaticEvidenceStatus="structural_provenance_checked"` and `semanticReviewStatus="human_review_required"` outside the Provider payload before candidate JCS/hash. Provider output cannot set either. No enum/value named `machine_verified`, `fact_verified`, `entailed`, `semantically_supported`, or equivalent is permitted in output DTOs, telemetry, Audit, or UI mapping.
10. **A-10 conservative unclassified text:** text containing no A-04–A-07 mechanically recognized token is not semantically classified. If A-01–A-03/A-08 pass, it may remain a protected Draft candidate only with A-09's mandatory human-review status. The system makes no automatic truth/support assertion about it.

Automatic rule vectors are mandatory:

| Rule | Positive vector | Negative vector / expected result |
|---|---|---|
| A-01 | strict paragraph with bounded text and exact keys | extra `confidence` or wrong locale -> `output_schema_invalid` |
| A-02 | `"A balanced hand feel."` + `src_01:fabricStyle` | same text with `[]`, duplicate, reordered, or nonexistent ref -> `output_policy_rejected` |
| A-03 | Product narrative cites selected eligible `fabricStyle` | Product output cites Company Fact/Product Code/rejected field -> rejected |
| A-04 GSM | `"180 GSM"` + cited `weightGsm="180"` | `"185 GSM"`, `"180.0 GSM"`, or width ref -> rejected |
| A-04 width | `"150 cm"` + cited `widthCm="150"` | `"150 in"` or value mismatch -> rejected |
| A-04 MOQ | `"100 kg"` + same-alias `moqValue="100"` and `moqUnit="kg"` refs | only one ref, `100 m` with `kg`, `Top 3`, `-5 kg`, or `1e2 kg` -> rejected |
| A-05 | text with no date/currency/percentage token | `"$5"`, `"20%"`, `"August"`, `"2026-08-10"`, or `"10 am"` -> rejected |
| A-06 | ordinary bounded textile wording without listed terms | `"ISO certified"`, `"our factory"`, `"founded in"`, `"contact us"`, or `"publish now"` even with valid ref -> rejected |
| A-07 | plain text with no URL/private/action syntax | URL, email, phone run, Secret/header, HTML, file path, retrieval instruction -> rejected |
| A-08 | meaningful ordered candidate and core-derived refs | placeholder, repeated spam, invalid heading jump, Provider ID/lock -> rejected |
| A-09 | protector adds exactly both fixed labels | Provider-supplied label or any machine-verified synonym -> schema/policy rejected |
| A-10 | `"This fabric is ideal for every climate."` with a real but irrelevant `fabricStyle` ref may pass structural rules | test must assert it remains `human_review_required`, is never described as supported/verified, cannot auto-apply, Publish, or Index |

The final A-10 vector is intentionally semantically unsupported cited prose. It demonstrates the limit of local proof: ref membership is machine-verifiable; English entailment is not. PD-11 evaluation and an authorized human Draft review own semantic entailment, paraphrase fidelity, nuanced numeric/factual correctness, relevance, tone, and content quality. Phase E must show source refs and the mandatory review status in Diff; it may save only after human action and existing authorization/version/Audit checks. AI never owns fact fields and cannot Publish or enable Index.

### 14.4 Exact four outer schemas

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

### 14.5 Post-schema policy, canonical form, and candidate refs

After Zod:

1. run exactly A-01 through A-08; do not add an entailment/classifier step;
2. enforce the Product matrix and use-case-specific output-location allowlist;
3. require at least one meaningful proposal across the outer object;
4. compute a pre-ref JCS form for each Block;
5. add a core-derived, non-durable ref to the protected DTO only:
   `cand_<four-digit-ordinal>_<64-lowercase-hex>`, where the hex is SHA-256 of JCS `{useCase,containerPath,ordinal,block}` before refs;
6. require generated refs unique and matching `^cand_[0-9]{4}_[0-9a-f]{64}$`; Provider-supplied `candidateRef`/`id`/`locked` was already rejected by strict schemas;
7. add exactly A-09's two fixed labels, form the final protected application value with schema/use-case/locale/payload plus derived refs, JCS serialize it, enforce 64 KiB, and compute `candidate_hash`.

No whitespace/key sorting/text normalization occurs beyond JCS representation; semantic strings preserve exact code points. Candidate refs are UI/Diff correlation only, not Editorial Block IDs and not a lock authority.

Non-Block proposals have no ID field. The protected UI projection addresses them by deterministic JSON Pointer (for example `/outline/0` or `/faqProposals/2/answer`) derived after validation; the pointer is not stored inside Provider output and is not a lock. No AI proposal can set or clear a target lock.

### 14.6 Phase E conversion to existing Blocks

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

Both Draft APIs receive exact actor/use-case/target/context inputs from an authorized Domain Service and apply only this database-free prelude:

1. `draft-assistance/facade.ts` strict-parses the outer request: malformed/missing actor identity is `authorization_denied`, malformed target discriminator/identity/version is `target_scope_mismatch`, malformed context selector is `context_field_forbidden`, and malformed idempotency key on request is `idempotency_conflict`; no repository/scope exists;
2. the Draft facade performs the coarse caller shield: role must be `admin`, `product_editor`, or `content_editor`; every other role receives `authorization_denied` before registry/database/readiness access;
3. Draft composition calls `productionApplicationRegistry.prepareInvocation` for the exact tuple. For a coarse-authorized actor, an unregistered key—including `customer_support`—returns `use_case_unknown` before target/feature/config reads;
4. `prepareInvocation` calls the selected Draft command codec once, derives the typed `DraftDurableAssociationWithoutHashV1` once, and returns `PreparedApplicationInvocationBinding<ReadOnlyDraftAvailabilityScope,TransactionBoundDraftEnqueueScope>`. It performs no authorization/read/lock and no erasure yet.

Steps 1–4 are the only shared operations. Availability and request do **not** share a live association-policy call. Their statically different bindings begin below. Thus unauthorized actors cannot probe registry/config readiness, unknown use cases do not consult configuration, and no request can accidentally run availability's unlocked target read.

### 18.2 Availability query sequence

After shared steps 1–4, `inspectDraftAssistanceAvailability` opens exactly one `ReadOnlyDraftAvailabilityScope` (`READ ONLY`, `REPEATABLE READ`) and performs:

5. Draft composition calls `preparedBinding.bindAvailability(readOnlyScope)` and passes the returned `OpaqueAvailabilityInvocationV1` to `GenericAiOrchestratorV1.inspect`; binding itself performs no read;
6. core calls opaque `authorizeAssociation()` once. The captured Draft availability binder calls `authorizeAndSnapshotForAvailability`, whose only target operation is `DraftTargetReadRepository.authorizeAndReadTargetForAvailability(readOnlyScope,...)`; it returns one exact `AuthorizedDraftAssociationV1`, encodes the same association envelope, and acquires no lock;
7. core calls the returned authorized stage's `buildContext()` once; the captured Draft context policy batch-loads selected sources through the same common read capability and returns `OpaqueAvailabilityContextStageV1` with strict context/hash/material, pure Prompt-variable closure, and only the later readiness-read closures;
8. trusted composition check that a real durable enqueue port is available; Phase B Production returns `integration_not_ready` here;
9. trusted `APP_ENV` allowlist;
10. process `FEATURE_AI` upper bound;
11. core calls the context stage's `readFeatureState()` exactly once; the closure uses the same read-only scope;
12. core calls the context stage's `readConfigResolution()` exactly once and resolves the result;
13. exact adapter policy/envelope lookup;
14. exact Prompt manifest/bundle tuple/hash/contract lookup;
15. call the context stage's pure `buildPromptVariables`, render, and perform token/size preflight;
16. return only `{available,manualEditorAvailable,code}` plus no provider/model/Prompt/config/context body.

It performs no idempotency/run read, row lock, write, Audit, candidate parse, or adapter call. Error precedence is the first failed numbered step. The scope exposes no mutation member and no repository may open another transaction/connection.

Downstream availability unit tests inject only the immutable capability fact `durableEnqueueAvailable=true`; this object has no enqueue/run method and cannot persist or dispatch. It is not an in-memory port or Production runtime path. Phase B Production composition keeps the fact false.

Read-count assertions:

| Availability outcome | bind calls | authorized target reads | target lock statements/rows | context batches | feature reads | config reads | Prompt loads | run reads/writes |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| outer parse/coarse denial | 0 | 0 | 0/0 | 0 | 0 | 0 | 0 | 0/0 |
| authorized role, unknown use case/codec failure | 0 | 0 | 0/0 | 0 | 0 | 0 | 0 | 0/0 |
| target absent/scope denied/not editable/version conflict | 1 | 1 | 0/0 | 0 | 0 | 0 | 0 | 0/0 |
| context rejected | 1 | 1 | 0/0 | `1` per reached selected class, then stop | 0 | 0 | 0 | 0/0 |
| durable enqueue unavailable | 1 | 1 | 0/0 | completed selected batches | 0 | 0 | 0 | 0/0 |
| environment/process flag denied | 1 | 1 | 0/0 | completed selected batches | 0 | 0 | 0 | 0/0 |
| DB flag denied/missing | 1 | 1 | 0/0 | completed selected batches | 1 | 0 | 0 | 0/0 |
| config failure | 1 | 1 | 0/0 | completed selected batches | 1 | 1 | `0..1` by failure point | 0/0 |
| ready Synthetic/implemented path | 1 | 1 | 0/0 | completed selected batches | 1 | 1 | 1 exact tuple | 0/0 |

No cross-request readiness/default cache is allowed.

### 18.3 Phase C request mutation and replay-first idempotency

Phase B has no callable Production request-service instance. Once Phase C supplies the required port, `requestDraftAssistance` completes shared steps 1–4 without database reads, then opens exactly one governed enqueue transaction. Within that callback:

1. Draft composition calls `preparedBinding.bindRequest({scope:transactionScope,idempotencyKey})` and passes the returned `OpaqueRequestInvocationV1` to `GenericAiOrchestratorV1.request`; binding performs no read or lock;
2. core calls opaque `authorizeAssociation()` once. The captured Draft request binder calls `authorizeAndSnapshotForRequest`, whose entire implementation is one call to `transactionScope.authorizeLockAndSnapshotTargetForNewRequest(...)`. That operation performs record-scope authorization, the sole target `FOR UPDATE` statement, editability/channel/version recheck, and canonical snapshot construction, and returns the exact `AuthorizedDraftAssociationV1`. There is zero unlocked target read and no call to `DraftTargetReadRepository`;
3. core calls `buildContextAndFingerprint()` once. Its captured context policy uses the inherited common select capability inside the same transaction, consumes the exact authorized association object from step 2, creates exact source references/context/input hash, and computes Phase A fingerprint version 1 over exactly actor ID, application class, capability, use case, target type/identity, locale, expected version, target snapshot hash, ordered explicitly selected safe source references, and explicit-input hash; it excludes idempotency key and all current config/Prompt/registry state;
4. core calls the context stage's opaque `findReplay()` once, before environment/feature/config/Prompt reads:
   - same authorized actor/scope and exact fingerprint returns the existing run summary immediately, with no feature/config/Prompt read and no second Audit;
   - same key with different semantic fingerprint returns `idempotency_conflict` and exposes no prior payload;
   - wrong actor/record scope returns `authorization_denied` with no existence detail;
5. only for `new_request`: trusted environment and process flag, then core calls opaque `readFeatureState()` exactly once;
6. core calls opaque `readConfigResolution()` exactly once and resolves the complete result;
7. core calls opaque `confirmResolvedConfiguration()` once immediately after resolution; Draft composition maps it to `lockSelectedConfigForNewRequest`, which locks/rechecks only the sole resolved row and returns its exact accepted row. Core then validates adapter/envelope/Prompt/policy against that returned row;
8. call the captured pure Prompt-variable builder and render only for preflight; persist no rendered request;
9. core calls opaque `commitPreparedRun()` once. Draft composition maps it to `insertPreparedWithRequiredAudit`: the winner inserts one `pending` row plus required enqueue Audit atomically with `actual_provider`, `provider_dispatched_at`, and `active_attempt_dispatched_at` null. A unique loser performs exactly one scoped fetch and the same actor/scope/fingerprint comparison; exact match returns `unique_loser_exact_replay`, mismatch returns `idempotency_conflict`, and wrong actor/scope returns `authorization_denied`. Only the winner writes Audit;
10. return the inserted or exact-replayed safe `AiRunSummaryV1`.

The current target freshness is not bypassed by replay: steps 1–3 rerun first, and the fingerprint includes the current expected version and target snapshot hash. A target/source change makes the fingerprint differ and returns conflict. Exact response-loss replay may return a persisted `pending`, `processing`, `draft_ready`, `failed`, or `cancelled` summary because it is the same authoritative run; it never redispatches.

Only committed run summaries are replayable. Authorization, target/context validation, environment/feature/config/Prompt/integration errors that occurred before insert have no `ai_runs` row and are recomputed, not cached/replayed. A previously persisted `failed/cancelled` run remains replayable as its safe status; retry is a separate authorized Phase C transition on the same ID.

Phase B defines/tests the callback contract and ordering but implements no port, transaction, run SQL, replay store, or Audit.

Request call-count and ownership assertions are exact:

| Request outcome | request bind | target authorization operation | target lock statements/rows | unlocked target reads | context batches | replay/fetch reads | feature/config reads | config lock | insert/Audit |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| outer parse/coarse/unknown/codec failure | 0 | 0 | 0/0 | 0 | 0 | 0 | 0/0 | 0 | 0/0 |
| target absent/scope denial | 1 | 1 | 1/0 | 0 | 0 | 0 | 0/0 | 0 | 0/0 |
| target not editable/version conflict | 1 | 1 | 1/1 | 0 | 0 | 0 | 0/0 | 0 | 0/0 |
| context failure | 1 | 1 | 1/1 | 0 | `1` per reached class, then stop | 0 | 0/0 | 0 | 0/0 |
| exact replay / fingerprint conflict / replay scope denial | 1 | 1 | 1/1 | 0 | completed selected batches | 1/0 | 0/0 | 0 | 0/0 |
| feature failure | 1 | 1 | 1/1 | 0 | completed selected batches | 1/0 | 1/0 | 0 | 0/0 |
| config resolution failure before confirm | 1 | 1 | 1/1 | 0 | completed selected batches | 1/0 | 1/1 | 0 | 0/0 |
| selected-config conflict or adapter/Prompt/preflight failure | 1 | 1 | 1/1 | 0 | completed selected batches | 1/0 | 1/1 | 1 | 0/0 |
| new request winner | 1 | 1 | 1/1 | 0 | completed selected batches | 1/0 | 1/1 | 1 | 1/1 |
| unique loser exact replay | 1 | 1 | 1/1 | 0 | completed selected batches | 1/1 | 1/1 | 1 | 1 attempt/0 |
| unique loser mismatch/scope denial | 1 | 1 | 1/1 | 0 | completed selected batches | 1/1 | 1/1 | 1 | 1 attempt/0 |

Every request row above has at most one target authorization operation, exactly one target-lock statement once step 2 is reached, and zero unlocked target reads. A context/config/replay failure rolls back the governed transaction and releases its target/config locks; it creates no run or Audit. Target authorization denial precedes target editability/version information, and all target/context/fingerprint work remains before replay exactly as accepted.

### 18.4 Claimed durable projection and core-owned reconstruction

Phase C Worker sequence:

1. claim due `ai_runs` under Phase C PostgreSQL authority and commit `processing`/lease;
2. in a fenced transaction validate cancellation/lease and atomically commit `actual_provider=requested_provider`, `active_attempt_dispatched_at`, first-fill `provider_dispatched_at`, and increment `state_version`; no network call begins unless this marker commits;
3. select the exact durable row projection required by the constructor: application/capability/use-case; all seven accepted target association columns/hash; config ID/version/hash/requested and now-non-null actual Provider/model/parameters/limits; Prompt tuple/hash; envelope version/hash; input/output schema and policy versions; `input_context_json`/`input_hash`; attempt/status/retry/lease/state/active+first dispatch fields. There is no association/snapshot/rendered-request JSON column or Worker field;
4. call the core-owned constructor, which resolves one `OpaqueClaimedApplicationRuntimeV1` through the application-neutral `ClaimedApplicationRuntimeRegistryV1` using the durable application/use-case/schema/policy tuple, constructs the strict claimed brand—never a rendered request—and invokes `executeClaimedTextAttempt`.

Core then performs, in order and before adapter call:

5. strict claimed shape; status exactly `processing`, retry state `none`, attempt count `1..maxAttempts`; lease token/state/both dispatch markers present; `actualProvider===requestedProvider`; lease not expired; signal not aborted;
6. call the opaque claimed runtime's `decodeClaimedAssociation` with the accepted row projection. Its Draft-owned closure strict-decodes only the seven Draft target columns, reconstructs the closed union and exact snake-case snapshot, and verifies `target_snapshot_hash` using Section 8's literal contract; core sees only `ApplicationAssociationEnvelopeV1`;
7. reconstruct the exact Phase A resolved-config JCS object—including `application_class` and excluding `actual_provider`—from durable columns and require `resolved_config_hash`; validate limits/fallback absence/model/parameters through the exact requested adapter only; require the separately marked `actualProvider===requestedProvider`; do not read current default/config row;
8. load exact raw Prompt bytes by stored `(prompt_id,prompt_version,prompt_hash)` from the generated Production/Synthetic bundle, recompute raw SHA, strict parse resource, and require registry/application/capability/use-case/schema/policy agreement;
9. require compiled adapter envelope version/hash equals stored `provider_envelope_*`; no alternate envelope/provider/model;
10. call the opaque claimed runtime's `decodeClaimedContext(input_context_json)`, require association/application/use-case/input-schema/policy identity, recompute JCS `input_hash`, and validate every alias/ref/provenance/limit; the returned `OpaqueClaimedContextStageV1` captures the typed application context;
11. call that stage's pure Prompt-variable builder and deterministically rebuild the Provider-neutral request from exact context/Prompt; recheck byte/token ceilings and output schema identity;
12. make exactly one adapter call;
13. after return recheck abort signal and local lease-expiry deadline; a cancelled/late result cannot become a candidate. Then enforce returned model/completion, raw-parse one object, and call the captured claimed-context stage's `parseAndProtect` closure to return its protected result/disposition envelope;
14. return normalized attempt to Worker; Worker alone performs fenced candidate/failure/usage/cost lifecycle persistence.

There is no durable rendered-request column, so core does not claim a request-hash comparison that Schema cannot store. Integrity is compositional: exact Prompt raw hash + input JCS hash + config JCS hash + envelope hash + registered schema/policy identities uniquely govern deterministic reconstruction. Strict claimed projection rejects an injected `request` key. Test recorder asserts rebuilt request exact bytes.

Tamper tests independently change Prompt raw bytes/manifest tuple, Prompt hash, context value/key/order/ref, input hash, every config-hash field including `application_class`, pending/dispatch actual-Provider nullability, requested/actual Provider, parameter/limit/model, resolved config hash, envelope version/hash, policy/schema version, every target type/FK/locale/version/hash field, and an injected association/snapshot/pre-rendered request. Every case fails with the corresponding provenance code and adapter call count zero. The literal Product/Content/Revision round trips and fixed config/dispatch vector each make one call only after exact reconstruction.

### 18.5 Cross-contract static caller and ownership audit

This matrix is normative. “DB count” is the maximum operation introduced by that row; context class batches and unique-loser fetches are separately named. No row requires a member absent from its static type.

| Sequence step | Static caller -> exact callable | Concrete owner | Scope/capability visible to callable | DB/read/lock/write count | Returned authority | Next consumer |
|---|---|---|---|---|---|---|
| 18.1.1 | `DraftAssistanceService` -> facade strict codec | Draft facade | none | `0/0/0` | strict outer Draft DTO | 18.1.2 |
| 18.1.2 | Draft facade -> coarse shield | Draft facade/auth role utility | none | `0/0/0` | coarse-authorized actor or denial | 18.1.3 |
| 18.1.3 | Draft composition -> `TypedApplicationRegistry.prepareInvocation` | typed Production Draft registry | none | `0/0/0` | exact definition or `use_case_unknown` | 18.1.4 |
| 18.1.4 | typed registry -> `ApplicationCommandCodec.parse/associationFrom` | selected Draft definition | no scope | `0/0/0` | typed `PreparedApplicationInvocationBinding<ReadOnlyDraftAvailabilityScope,TransactionBoundDraftEnqueueScope>` | 18.2.5 or 18.3.1 |
| 18.2.5 | Draft availability composition -> `binding.bindAvailability(readOnlyScope)` | availability binder | exact `ReadOnlyDraftAvailabilityScope` | `0/0/0` | `OpaqueAvailabilityInvocationV1` | core 18.2.6 |
| 18.2.6 | `GenericAiOrchestrator.inspect` -> opaque `authorizeAssociation()` | captured Draft availability binder -> `ApplicationAvailabilityAuthorization` -> availability target repository | captured read-only scope only | target read `1`; lock/write `0/0` | `OpaqueAuthorizedAvailabilityStageV1` containing the encoded exact authorized association | 18.2.7 |
| 18.2.7 | core -> authorized-stage `buildContext()` | captured Draft context policy/repository | captured common select projection of same read-only scope | up to one batch per reached source class; lock/write `0/0` | `OpaqueAvailabilityContextStageV1` + input/source hashes/readiness closures | 18.2.8 |
| 18.2.8 | core -> trusted `durableEnqueueAvailable` fact | server composition | none | `0/0/0` | readiness fact | 18.2.9 |
| 18.2.9 | core -> trusted environment predicate | server composition | none | `0/0/0` | allowed environment | 18.2.10 |
| 18.2.10 | core -> process feature upper bound | server composition | none | `0/0/0` | process-enabled fact | 18.2.11 |
| 18.2.11 | core -> context-stage `readFeatureState()` | captured feature repository | same read-only common scope | read `1`; lock/write `0/0` | `AiFeatureStateReadV1` | 18.2.12 |
| 18.2.12 | core -> context-stage `readConfigResolution()` | captured model-config repository/resolver | same read-only common scope | read `1`; lock/write `0/0` | one resolved requested-only config or typed failure | 18.2.13 |
| 18.2.13 | core -> provider registry policy/envelope lookup | core/provider-neutral registry | none | `0/0/0` | exact approved adapter policy identity | 18.2.14 |
| 18.2.14 | core -> Prompt loader | Prompt manifest/generated-byte authority | none | cached exact tuple only; DB `0` | verified Prompt tuple/raw bytes | 18.2.15 |
| 18.2.15 | core -> context-stage `buildPromptVariables()` then renderer/token estimator | captured application context closure + core renderer/adapter policy | no scope; pure | `0/0/0` | preflight success/failure | 18.2.16 |
| 18.2.16 | core -> safe availability mapper | core/facade | none | `0/0/0` | `AiAvailabilityV1` | authorized Domain Service |
| 18.3.1 | governed transaction callback -> `binding.bindRequest({scope,idempotencyKey})` | Draft request composition/binder | exact `TransactionBoundDraftEnqueueScope` | `0/0/0` | `OpaqueRequestInvocationV1` | core 18.3.2 |
| 18.3.2 | `GenericAiOrchestrator.request` -> opaque `authorizeAssociation()` | captured Draft request binder -> `ApplicationRequestAuthorization` -> `authorizeLockAndSnapshotTargetForNewRequest` | captured transaction subtype; core sees none | one actor-scoped target `FOR UPDATE`; locked rows `0..1`; unlocked target reads/write `0/0` | `OpaqueAuthorizedRequestStageV1` capturing the exact `AuthorizedDraftAssociationV1` | 18.3.3 |
| 18.3.3 | core -> `buildContextAndFingerprint()` | captured Draft context policy/fingerprint builder | common select capability inherited from same transaction | up to one batch per reached source class; no second target read/lock | `OpaqueRequestContextStageV1` with prepared context, exact fingerprint, and transaction closures | 18.3.4 |
| 18.3.4 | core -> context-stage `findReplay()` | captured transaction run repository | same transaction, scoped actor/association/fingerprint | replay read `1`; lock/write `0/0` | new/exact replay or safe conflict/denial | exact replay returns; new -> 18.3.5 |
| 18.3.5 | core -> trusted env/process + context-stage `readFeatureState()` | server composition + captured feature repository | same transaction common read capability | feature read `1`; lock/write `0/0` | feature readiness | 18.3.6 |
| 18.3.6 | core -> context-stage `readConfigResolution()` | captured config repository/resolver | same transaction common read capability | config read `1`; lock/write `0/0` | sole requested-only config | 18.3.7 |
| 18.3.7 | core -> context-stage `confirmResolvedConfiguration(...)`, then adapter/envelope/Prompt/policy checks | captured transaction config operation + core registries | opaque closure maps to transaction-only selected-config lock | config lock statement/row `1/0..1`; writes `0` | exact locked config row and validated identities | 18.3.8 |
| 18.3.8 | core -> context-stage `buildPromptVariables()` + renderer | captured pure application closure + core renderer | no scope needed | `0/0/0` | `PreparedCoreRunV1`, no rendered request persisted | 18.3.9 |
| 18.3.9 | core -> context-stage `commitPreparedRun(prepared)` | captured transaction insert/Audit operation | same governed transaction | winner: insert/Audit `1/1`; unique loser: insert attempt `1`, scoped fetch `1`, Audit `0` | inserted or exact-replayed committed summary | 18.3.10 |
| 18.3.10 | core/facade -> safe summary mapper | core/facade | none | `0/0/0` | `AiRunSummaryV1` | authorized Domain Service |
| 18.4.1 | Phase C Worker -> claim repository | Phase C only | accepted advisory/row-lock authority | accepted claim transaction | durable processing lease/state | 18.4.2 |
| 18.4.2 | Worker -> fenced dispatch-marker command | Phase C only | claimed run/lease/state | one fenced write; no network before commit | actual=requested plus dispatch timestamps/new state version | 18.4.3 |
| 18.4.3 | Worker -> exact row projection query | Phase C only | durable accepted columns | one read | raw accepted claimed row | 18.4.4 |
| 18.4.4 | Worker entry -> core-owned claimed constructor + `ClaimedApplicationRuntimeRegistryV1.resolve` | generic claimed boundary + application-neutral erased registry | no enqueue/read scope | DB `0` | branded claimed projection + opaque claimed runtime | 18.4.5 |
| 18.4.5 | core claimed validator | generic core | durable lease/state only | `0/0/0` | valid claim authority | 18.4.6 |
| 18.4.6 | core -> opaque claimed runtime `decodeClaimedAssociation` | application-owned closure selected by durable tuple | exact accepted row projection; no scope | `0/0/0` | opaque reconstructed association/hash | 18.4.7 |
| 18.4.7 | core -> config reconstruction/adapter policy | generic core/provider registry | durable fields only | `0/0/0` | verified exact config | 18.4.8 |
| 18.4.8 | core -> Prompt loader | Prompt byte authority | durable tuple only | DB `0` | verified raw Prompt | 18.4.9 |
| 18.4.9 | core -> envelope identity check | provider-neutral registry | durable/compiled identities | `0/0/0` | verified exact envelope | 18.4.10 |
| 18.4.10 | core -> opaque claimed runtime `decodeClaimedContext` | selected application-owned closure | durable `input_context_json`; no DB | `0/0/0` | `OpaqueClaimedContextStageV1` + verified input hash | 18.4.11 |
| 18.4.11 | core -> claimed-context stage Prompt-variable builder/renderer | captured pure application closure + core | no DB/scope | `0/0/0` | exact Provider-neutral request | 18.4.12 |
| 18.4.12 | core -> `TextAiProvider.generateText` | sole core call site | no DB transaction | adapter call exactly `1` | normalized untrusted result | 18.4.13 |
| 18.4.13 | core completion/parser -> claimed-context stage `parseAndProtect` | generic core + captured application result closure | no DB/scope | adapter `0` additional | protected result or typed failure | 18.4.14 |
| 18.4.14 | Worker -> fenced lifecycle repository | Phase C only | lease/state authority | one accepted transition transaction | durable run outcome | authorized run readers |

Static audit conclusion: every call has a member on its declared static type. The only Draft target-lock identifier is owned by `TransactionBoundDraftEnqueueScope` and Draft request authorization; the generic core matrix names only opaque `authorizeAssociation()`. The request authorized association is an object-identity capture through steps 18.3.2–18.3.9; application encoding recomputes and compares its canonical hash but never performs a second live target read or constructs a competing snapshot authority.

### 18.6 No second authority proof

- Generic preparation cannot dispatch and returns no rendered request to business code.
- Availability and request share only pure codecs/snapshot construction; they have distinct live authorization operations. Request has one transaction-bound target operation and no unlocked target read.
- Registry erasure happens after typed command parse and scope binding; opaque closures retain object identity without an `unknown`/cast escape. Core cannot recover or bypass application types.
- Draft request cannot succeed without Phase C's one durable enqueue port.
- Claimed execution accepts only a durable projection, never `PreparedCoreRunV1` or a rendered request.
- Phase B adds no run repository, queue, state map, retry loop, idempotency cache, or history.
- Fakes script adapters/results only; they do not implement enqueue/claim/history.
- Phase C implements one repository over `ai_runs` and Worker calls the same generic Service Layer, never adapter direct.
- Application-owned codecs map current Draft values to `0020`; they do not create a parallel database authority.
- Provider dashboards/logs, generated Prompt bundle, and compile brands are non-authoritative.

Phase C therefore adds durable lifecycle around already frozen generic contracts without rewriting core, bypassing the bound request authorization closure, bypassing Service Layer, or introducing another queue/history.

## 19. Authorization, Audit, telemetry, structural and bundle gates

### 19.1 Authorization and Audit

- Every Draft API call begins with the coarse shield then application-owned record authorization in Section 18; UI visibility/session role alone is never authority.
- Product Editor and Content Editor invoke only their record scopes; Admin follows existing scope. Reviewer/Publisher role alone cannot generate. No Sales/anonymous/public/customer role may probe readiness.
- Editors cannot select Provider/model/parameters/Prompt/schema/policy. No caller may submit generic application class, association/result/disposition kind, endpoint, or Provider request.
- Phase B writes no business row, `ai_model_config`, `ai_runs`, or Audit.
- Phase C enqueue/config mutations and Phase E candidate application use existing governed mutation + required Audit rules. Adapter calls occur outside Product/Content/Audit transactions.
- A candidate has no permission method, always carries `semanticReviewStatus="human_review_required"`, and does not become Draft truth until Phase E reauthorization/version/lock/Diff/Audit. Structural provenance checks are never authorization or factual verification.

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

It cannot contain actor/user/target/source/config IDs; idempotency/fingerprint/input/candidate hashes as correlation substitutes; Prompt body/render/variables; context/input/output/candidate text/JSON; source bodies; Draft text; request/response/error bodies/headers; credentials/env values; URL/path/Object Key; PII/customer/private data; stack; unrestricted `Error.message`; or any machine-verified/entailed/supported claim. Zod strict parsing rejects extra fields. Tests inject unique sentinels at every forbidden location and inspect captured sink output. Ordinary logs receive only a rendered safe fixed message from the typed event, never arbitrary objects.

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
- `core/**` cannot reach a typed/application registry implementation, Draft/Synthetic application, read scope, repository, transaction port, or any Product/Content/SEO/Admin/public/testing module. It may consume only the application-neutral `ClaimedApplicationRuntimeRegistryV1` interface on claimed execution. Its source cannot contain `Draft`, `DraftConsistentReadScope`, `TransactionBoundDraftEnqueueScope`, `authorizeLockAndSnapshotTargetForNewRequest`, `lockSelectedConfigForNewRequest`, or another target/row-lock identifier;
- Draft application may reach core/application interfaces and type-only auth, but not config repository internals, raw provider adapter, Worker, or UI;
- only `core/orchestrator.ts` may reference/call `TextAiProvider.generateText`;
- only future Phase C Worker paths explicitly added by reviewed verifier change may import `internal/worker-entry.ts`; Phase B production has no such consumer;
- Draft context/feature/config reads accept `DraftConsistentReadScope`, and both subtypes are assignable; availability target authorization accepts only `ReadOnlyDraftAvailabilityScope`; request target authorization exists only as the transaction method and never calls the target read repository. Read callbacks contain no lock/mutation/raw execute/cast/connection-open path, while replay/target-config locks/insert/Audit occur only on `TransactionBoundDraftEnqueueScope`;
- the Draft request facade/composition can enter generic request orchestration only through `PreparedApplicationInvocationBinding.bindRequest`; direct construction/import of `OpaqueRequestInvocationV1` outside the approved application binder and test fixtures fails the graph/constructor-brand gate;
- `createOpaqueAvailabilityInvocation` and `createOpaqueRequestInvocation` call sites are exact-allowlisted to registered `applications/*/composition.ts` binders and `src/ai/testing/**`; core/facade/business code may consume but cannot call either constructor;
- application composition and registry implementations contain no `as`, angle-bracket assertion, `any`, suppression directive, typed-to-`unknown` round trip, hidden heterogeneous `unknown` map, dynamic property dispatch, duplicate target authorization call, or parallel database/transaction open;
- no Production module reaches `src/ai/testing/**` through direct/re-export/generated/resource edges;
- public/client graph reaches no `src/ai/**` or server-only dependency;
- no real adapter directory/SDK/package/lock entry, `fetch`, `Request` network construction, WebSocket, `node:http`/`https`/`net`/`tls`, endpoint/scheme literal, credential/env-key lookup, local-model runtime, or Provider-specific DTO;
- business code contains no hardcoded Provider/model/endpoint. Generic field names such as `requestedProvider` are allowed only in Provider-neutral contracts;
- Production registry/resources/config contain exact four use cases and no `customer_support`;
- no tool/function/retrieval/RAG/knowledge/chunk/embedding/vector/vision/image/audio/file/URL/fallback runtime type or field exists;
- `fallback_config_id` is only read and rejected; no traversal/routing;
- generated Production Prompt bundle entries exactly derive from Production manifest; Synthetic paths/bytes cannot enter it.
- output policy source/telemetry/UI code cannot introduce zero-ref exceptions, a language classifier, or any `machine_verified`/`fact_verified`/`entailed`/`semantically_supported` state; the two fixed protection labels are exact.

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
- **No semantic-proof overclaim:** every EvidenceText requires refs, automatic A-01–A-10 rules are finite, and compile/string/schema gates reject machine-verification states; PD-11/human review remains mandatory.
- **No implementation leakage from design remediation:** V1.3/Remediation V1.2 commit itself must contain documents only.

## 20. Verification matrix and pass criteria

### 20.1 Unit and contract tests

| Area | Required direct cases | Pass criterion |
|---|---|---|
| generic application core | typed homogeneous request-registry completeness/duplicates/mismatch; staged opaque invocation calls; core source compiles with no typed/request registry implementation, scope, Draft, target, or lock import/identifier; claimed execution may consume only `ClaimedApplicationRuntimeRegistryV1` | exact typed result; no Draft branch, scope, transaction, or lock in core |
| dual authorization binders | availability binder accepts read-only only and returns opaque availability invocation; request binder accepts transaction only and returns opaque request invocation; both return the same `ApplicationAssociationEnvelopeV1` shape after authorization | positive fixtures compile without cast/assertion; exact binder chosen; no interchangeable scope |
| Synthetic extension | distinct `synthetic_case_association`, `synthetic_review_packet`, `synthetic_probe_verdict`, `SyntheticObservationReadScope`, and `SyntheticCaseTransactionScope`; compose only by new test registry/binders/policies/schema | both opaque paths prepare/reconstruct/fake-call/protect; no Draft import/core edit/`customer_support`/0020 |
| RFC 8785/JCS | published sample/property/complete Appendix B vectors; decimals, -0, Unicode preservation/order; every invalid JS domain value | byte-exact expected strings/hashes; adapter restriction remains separate |
| config repository | no rows; disabled default; no default; one enabled default; 3 and 100 enabled non-default + disabled default(s); enabled default plus arbitrary rows; corrupt counts/list/flags/IDs/key | exact M-01 codes; one read; no `LIMIT`/cache |
| Prompt manifest | empty first Production manifest; valid tuple/resource; missing/unreferenced/stale/duplicate tuple/path/hash; metadata/path/version/order disagreement; traversal/symlink | fail closed; exact authority relationship |
| Prompt generated bundle | deterministic generation, stale/manual derivative, base64 byte equality, exact runtime raw hash, empty Production tuple, Synthetic isolation | check-only regeneration byte-equal; no dynamic/fs load |
| Prompt history | explicit valid base/candidate; missing/inferred/nonancestor base; first base absent; modify/delete/rename/repoint/reuse; append consecutive version | immutable history rules exact |
| renderer | exact variables, missing/extra/type/enum/placeholder/control/size/token failures; reconstruct twice from durable context | identical request bytes; no caller variables |
| raw JSON parser | every Section 14 framing/comment/multiple/trailing/duplicate/nested/NFC/Unicode/number/depth/node/size/truncation case | one root object or exact code; no `JSON.parse` fallback |
| Narrative Blocks | each allowed type for each use case; every unknown/extra/missing key; per-string/item/block bounds; forbidden ID/candidateRef/locked/type | strict union exact; no durable identity/lock accepted |
| candidate protection | every A-01–A-10 positive/negative vector; mandatory/membership/use-case refs; exact technical numeric token equality; currency/date/percent and closed category/action rejection; unsupported cited prose | deterministic protected DTO/hash with `structural_provenance_checked` + `human_review_required`; never machine-verified |
| Phase E conversion descriptor | each candidate Block to existing Block shape; fresh durable ID, locked absent; Product table refusal | converted fixture passes `parseBlockDocument`; locks preserved |
| Provider completion | complete valid; complete empty; length/unknown with syntactically valid JSON; content filter; cancelled; model drift | only complete reaches parser; adapter calls ≤1 |
| fake adapters | config switch, exact request recorder, scripted safe failures, abort, no fallback | no network/SDK/Provider claims |
| error/telemetry | exhaustive code/category mapping, provenance failures, manual degradation, forbidden sentinel payloads | exhaustive compile and no sensitive capture |
| common read scopes | both subtype assignability; context/feature/config with both; availability target with read-only only; request target method with transaction only; conditional-key negatives and expected `tsc` failures | availability has one authorized read/no lock; request has one authorize-lock-snapshot/no unlocked target read; no cast/parallel repository |
| erasure/bypass gate | parsed command/association captured into both binders; staged object literals; negative `as`/angle assertion/`any`/typed-to-unknown/reparse/heterogeneous-map/dynamic-dispatch/direct opaque construction/core Draft-lock reference fixtures | every negative fails compile or AST gate; no suppression or runtime type escape |

Exact type-probe fixture plan:

| Fixture | Required assertion and expected result |
|---|---|
| `test-fixtures/ai-types/read-scope/availability-binder.positive.ts` | Construct the typed Draft registry, `prepareInvocation`, bind a `ReadOnlyDraftAvailabilityScope`, and call core `inspect`; conditional keys prove no target/config lock or mutation member. `tsc --noEmit`: exit `0`. |
| `test-fixtures/ai-types/read-scope/request-binder.positive.ts` | Bind only `TransactionBoundDraftEnqueueScope`; a recorder invokes the transaction target operation exactly once and the availability target repository zero times; request proceeds through opaque staged methods. Compile exit `0`; runtime counts exact. |
| `test-fixtures/ai-types/read-scope/association-envelope.positive.ts` | `Awaited` success values of both authorization stages expose exactly `ApplicationAssociationEnvelopeV1`; their hidden Draft association types are not reachable from core. Compile exit `0`. |
| `test-fixtures/ai-types/read-scope/opaque-core.positive.ts` | Import only opaque contracts/core; pass both branded invocations from approved constructors; source contains no Draft/scope/repository/lock symbol. Compile and AST gate pass. |
| `test-fixtures/ai-types/read-scope/synthetic-binders.positive.ts` | Build a fresh Synthetic typed registry with `SyntheticObservationReadScope`/`SyntheticCaseTransactionScope`, bind both modes, and call unchanged core. No Draft/customer-support/0020 import. Compile exit `0`. |
| `test-fixtures/ai-types/read-scope/common-target-lock.negative.ts` | Call `authorizeLockAndSnapshotTargetForNewRequest` on `DraftConsistentReadScope`; expected `TS2339`. |
| `test-fixtures/ai-types/read-scope/read-only-target-lock.negative.ts` | Call the same request operation on `ReadOnlyDraftAvailabilityScope`; expected `TS2339`. |
| `test-fixtures/ai-types/read-scope/request-with-read-only.negative.ts` | Pass read-only/common scope to `PreparedApplicationInvocationBinding.bindRequest`; expected `TS2322`/`TS2345`. |
| `test-fixtures/ai-types/read-scope/availability-with-transaction.negative.ts` | Pass transaction scope to `bindAvailability`; expected `TS2345`, preserving deliberate non-interchangeability even though both extend the common read capability. |
| `test-fixtures/ai-types/read-scope/direct-opaque-construction.negative.ts` | Construct either opaque invocation without the module-private brand; expected missing-property type error. |
| `test-fixtures/ai-types/read-scope/erasure-cast.negative.ts` | Contains representative `as`, angle assertion, `any`, typed-to-`unknown`-then-parse, heterogeneous unknown map, and suppression forms; architecture fixture must fail each exact node/reason. |
| `test-fixtures/ai-architecture/request-duplicate-target-read.negative.ts` | Request binder calls availability target reader before/after transaction authority; AST/call-graph gate fails. |
| `test-fixtures/ai-architecture/request-second-lock.negative.ts` | Request binder/closure calls target authority twice or issues direct `FOR UPDATE`/raw query; AST/call-count gate fails. |
| `test-fixtures/ai-architecture/request-bypass.negative.ts` | Facade/core constructs/calls opaque request operations without the registered request binder, imports a DB client, or opens a parallel transaction; graph/brand gate fails. |
| `test-fixtures/ai-architecture/core-draft-lock.negative.ts` | Core imports/re-exports/references any Draft scope/target/lock name through direct, alias, re-export, dynamic, require, or computed forms; graph/string gate fails. |

Negative compile fixtures are each compiled independently and pass the test harness only when their declared diagnostic is present. AST-negative fixtures are not placed in the Production TypeScript Program; the architecture verifier parses them separately and must report the exact fixture/node/rule. No `@ts-expect-error`, ignore directive, cast, or suppression appears in a positive fixture.

### 20.2 Context, ordering, and integration tests

| Area | Required cases | Pass criterion |
|---|---|---|
| Product matrix | each listed field under eligible/ineligible status; Product Code selected; provided vs verified; null/blank/unknown/empty/rejected/missing review; MOQ half/mixed status/unit; untracked supplied fields | exact send/omit/reject/provenance/narrative policy; Product Code never Provider-bound |
| other context | eligible/ineligible Company Fact, Fabric Knowledge, explicit input; cross-use-case source; URL/file/PII/Secret/tool/retrieval | strict context code; no prohibited payload |
| durable association | literal Product/Content/Revision preparation -> exact seven pending columns -> driver-shaped row -> claimed decode/re-encode; every key/null/type/value/hash tamper | exact Section 8 JCS/hash/column identity; zero unstored snapshot; tamper call count zero |
| reconstructible context | preparation -> persisted JSONB-shaped round-trip -> claimed parse/variables/request; target/context separation | identical JCS input hash and request bytes; target hash covers identity/version only |
| availability order | every stop row in Section 18 read-count table, including unauthorized, unknown key, denial/editability/version/context/readiness/config | exact first error; one availability binder/authorized target read after bind, zero lock, exact downstream counts; no readiness leak |
| request target composition | Product/Content/Revision success plus denial/not-editable/version/context failure | one request binder; one transaction authorize-lock-snapshot operation; one lock statement/`0..1` row; zero unlocked target reads; exact returned association object captured through preparation |
| request/new path | bound request authorization -> context/fingerprint -> no replay -> feature/config lock/Prompt -> pending handoff | exact Section 18 order/counts; one target lock and config read/lock; Phase B no DB write implementation |
| request replay | exact committed run before feature/config; changed target/source/input; wrong actor/scope; concurrent unique loser; persisted terminal statuses | exact replay/conflict/denial; current target lock/context precede replay; one run/Audit winner; loser one conflict fetch/Audit zero; no redispatch |
| config/dispatch vector | fixed resolver -> prepared -> pending nulls -> claim nulls -> atomic dispatch marker -> claimed projection | identical exact Phase A hash including application class; accepted dispatch null equation at every state |
| claimed reconstruction | valid exact row projection, application-owned target decoder, and exact adapter request | one call; protected result; actual=requested only after marker |
| claimed tamper | every target column/null/hash, application class/config fields/hash, pending/dispatch actual-provider semantics, Prompt bytes/tuple/hash, context/input hash/ref, envelope, policy/schema, injected association/snapshot/request, lease/state/abort | corresponding provenance/claim error; zero adapter calls |
| feature/config switch | sequential/concurrent fake defaults; existing claimed snapshot after switch | new request sees committed default; old run unchanged; business/core files unchanged |
| no-write Phase B | PGlite database fingerprint before/after availability/config tests | zero business/config/run/Audit writes |
| accepted Schema | Candidate verifier and Drizzle extraction | `ai_model_config=21/21`, `ai_runs=96/96`; no Migration/Schema diff |

### 20.3 Architecture, resource, and bundle tests

- Run every `test-fixtures/ai-architecture` bypass form from Sections 19.3–19.5. Allowed literal forms resolve canonically; disallowed edge/computed/unresolved/symlink/transitive import fails with path/node/reason.
- Positive compile fixtures prove: availability binding with read-only/no lock; request binding with transaction/one target authority; both authorized stages expose the same closed association envelope; core accepts both opaque invocations only; and a structurally different Synthetic binder composes with no core edit.
- Negative compile/AST fixtures prove: common/read-only cannot call the request target authority; request binding rejects common/read-only scope; no cast/assertion/`any`/typed-to-unknown round trip; no duplicate target read, second target lock, raw/direct DB operation, parallel transaction, direct opaque request construction, or request bypass; and core cannot reference Draft/scope/repository/lock symbols.
- Prove business -> facade only, Draft composition -> typed registry/binders -> opaque core only, core -> no Draft/business, Production -> no testing, Worker -> claimed entry only, adapter call -> orchestrator only.
- Prove no real adapter/SDK/package/lock/credential/endpoint/network/local-model/provider-specific DTO/model literal.
- Prove Production registry exact four keys; no Production `customer_support`; no tools/RAG/retrieval/vision/file/URL/fallback types/resources.
- `check:ai-prompts` proves Production manifest/resource/generated/history contract and Synthetic isolation.
- Test-only Next standalone server fixture retains both markers and exact Synthetic raw bytes server-side and none client-side.
- Positive public-leak fixture fails `check-public-bundle`; clean fixture and fresh real `pnpm build && pnpm check:bundle` pass.
- `git diff --check` and design/implementation scope gate show no historical Prompt mutation and, for this remediation Candidate, documentation-only diff.

### 20.4 PD-11 and fake-only quality/security cases

All applicable PD-11 Synthetic cases remain conspicuously fictional/noindex and use no Provider/network: malformed/framed/duplicate JSON, Prompt injection inside context, unsupported factual claims, irrelevant-but-valid citations, forbidden Product fields, numeric/date/currency/percentage cases, closed high-risk/action lexicon, unknown Blocks, oversized output, stale/locked target conversion descriptor, model drift, abort/cancel, and no fallback. Tests must distinguish “automatically rejected,” “structural provenance passed but semantic review required,” and later human accept/reject. Structurally valid semantically unsupported cited prose is never called verified/supported and cannot auto-apply, Publish, or Index. These are local contract/security tests, not Provider quality claims. `PD-04`–`PD-07` remain later non-blocking references.

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

A candidate that passes automatic rules is still not a success claim about factual correctness. The UI must display it as human-review-required, expose its provenance refs, and offer reject/edit/manual-editor paths. No automatic status may bypass Diff, apply the candidate, create a fact, Publish, or enable Index.

For an actor already authorized to edit the target, readiness/config/Prompt/integration failures return exactly `{ available:false, manualEditorAvailable:true, code:<safe code> }`. Authorization denial does not assert that the caller has an editor and returns `manualEditorAvailable=false`. Unknown use case returns a generic unavailable result through the Domain Service without readiness detail. Claimed provenance/output/provider failures affect only the existing run outcome under Phase C; the target editor remains unchanged.

Rollback before Phase C is code-only: stop importing the Draft facade and remove Phase B modules/checks while leaving accepted empty/additive `0020` tables intact. `FEATURE_AI` and `feature_flags.ai` remain false. Generated Prompt bundle is regenerated from the retained immutable manifest/resources; accepted historical resources are never deleted as “rollback.” There is no run state to delete or reconcile. After Phase C, rollback follows ADR-0018: disable feature/config, stop claims, preserve configuration/run provenance, and retain manual paths.

## 22. Implementation order and atomic commit plan

Only after V1.3 receives PASS from another Fresh Re-review:

1. **Generic contracts/JCS/application registry:** homogeneous typed registry, dual binder generics, staged opaque invocation interfaces, exact Phase A resolved-config object/vector, RFC 8785 vectors; tests prove core has no Draft/scope/lock import or pre-dispatch actual Provider.
2. **Draft application codecs, dual composition, and exact Production entries:** facade, closed three-kind association/snapshot/column codec with literal round trips, read-only availability binder, transaction request binder, result/disposition policies, exact four keys; distinct Synthetic dual-binder compile/proof in the same commit or immediately following test commit.
3. **Normative read scopes, context, and Product provenance:** one common scope plus two assignable subtypes, availability-only target port, request-only authorize-lock-snapshot method, compile/AST negative fixtures, reconstructible context, narrow readers, field matrix, denial/limit/call-count tests; no business integration.
4. **Strict output boundary:** dependency-free raw parser, complete Block/outer schemas, finite A-01–A-10 rules, mandatory human-review labels, completion contract, candidate refs/canonical form/conversion descriptors and direct tests.
5. **Read-only feature/config:** common-scope one-statement repository result, corruption checks, resolver, no-cache/fake switching/order-read tests; no mutation/own transaction.
6. **Prompt authority:** empty Production manifest, generator/check-only verifier/generated bundle, loader/renderer/history, isolated Synthetic resources, exact bundle/history tests; no Production prose.
7. **Generic orchestrator and claimed reconstruction:** availability/new-request callback contract, no durable port implementation, strict claimed projection, all provenance tamper tests, fake adapter one-call proof.
8. **Structural/bundle gates:** AST/module graph fixtures, Prompt resource isolation, stable markers, test-only standalone server bundle, positive public leak, clean fresh build.
9. **Implementation report and independent Phase B implementation review:** exact commit/hashes/commands/prohibited-action proof.

Recommended atomic commits mirror these boundaries. No commit mixes Phase B foundation with Schema/Migration, real adapter/SDK/credential/network, Worker/run repository, Product/Content integration, Admin UI, Production Prompt prose, or deployment. No Push without separate approval.

## 23. Exact V1.3 design acceptance checklist

The Fresh Re-review may return PASS only if all are true:

- [ ] exact V1.3 remediation start, immutable V1.0/V1.1/V1.2/prior-Remediation hashes, Fresh Re-review V1.1 report/evidence/manifest/probe hashes, branch/parent/ancestry/tag/acceptance identity pass;
- [ ] V1.3 and Remediation V1.2 are the only added files and all older artifacts are byte-identical;
- [ ] core command/association/result/disposition contracts contain no Draft union/literal; Draft facade maps current commands;
- [ ] Synthetic association/result/disposition are structurally different, compose via test registry only, edit no core, use no customer-support key, and never enter 0020;
- [ ] Production registry is exactly four frozen Draft text use cases and accepted 0020 remains Draft-only;
- [ ] raw parser algorithm/dependency decision rejects every framing/duplicate/Unicode/truncation/oversize case before Zod;
- [ ] all six candidate Block alternatives, four use-case unions, four outer outputs, strict keys/bounds/sourceRefs/candidate refs/lock rules/canonical form/Phase E conversion are exact;
- [ ] Provider success has mandatory completion kind and only complete output reaches parser;
- [ ] config repository reads complete aggregate/default facts in one statement/snapshot with no truncation/cache and all legal/corrupt states map exactly;
- [ ] Production Prompt manifest/resource/generated-byte-bundle authority, static loader, Next standalone proof, exact history base/ref/first-empty behavior, stale/unreferenced/duplicate rules, and Synthetic isolation are implementable;
- [ ] availability and request have separate single normative sequences, exact error precedence/read counts, authorization anti-leak, and Phase A replay-first semantics;
- [ ] typed registry `prepareInvocation` parses once and returns a dual-scope binding; availability binds only read-only, request binds only governed transaction, and erasure occurs only after scope binding with no cast/assertion/`any`/typed-to-unknown round trip;
- [ ] availability performs exactly one authorized target read and zero lock; request performs exactly one transaction authorize-lock-snapshot operation, one target lock statement, zero unlocked target reads, and passes the same captured `AuthorizedDraftAssociationV1` to context/fingerprint/preparation;
- [ ] generic core accepts only the two opaque staged invocation interfaces and contains no typed registry, Draft scope/target/repository/transaction/lock import or identifier; request cannot bypass the bound transaction closure;
- [ ] the Section 18.5 matrix maps every numbered step to an exact Section 8/10 callable, owner, static scope, call count, returned authority, and next consumer with no absent method;
- [ ] claimed Worker supplies durable projection rather than rendered request; core reloads/reconstructs and validates Prompt/context/config/envelope/policy hashes before one call;
- [ ] Draft durable association is a strict versioned three-member union; exact canonical target snapshot and seven-column bijection reconstruct from accepted columns only; all three literal round trips/tampers pass;
- [ ] `target_snapshot_hash` covers exact association identity/version only, while mutable/contextual Provider values are explicitly under `input_context_json/input_hash` and Phase E retains live reauthorization/version checks;
- [ ] exact Phase A config hash includes `application_class`; pre-dispatch aggregate has no actual Provider; pending/claim nulls and atomic dispatch-marker non-nulls satisfy the accepted Check and fixed vector;
- [ ] one common read capability accepts both subtypes for context/feature/config; availability target port accepts only read-only, request target authority only transaction; locking/mutation/Audit stay transaction-only and no cast/parallel connection exists;
- [ ] Synthetic dual binders use structurally different scopes/association/action naming, compile to the same opaque core contracts, and require no Draft import/core edit/customer-support/0020 persistence;
- [ ] EvidenceText always has refs; A-01–A-10 are the entire automatic policy; refs are provenance pointers, all candidates remain `human_review_required`, and no machine entailment/verification claim exists;
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

V1.0 consolidated Provider mechanics but left Draft association/result concepts in core and several integrity checks implicit. V1.1 moved application semantics outward; V1.2 closed target/config/read/evidence gaps. N-M04 exposed one remaining misplaced responsibility: a single common-scope association policy was asked to perform request-only locking. V1.3 removes that contract and assigns availability read authorization and request transaction authorization to two application-owned binders. Scope erasure now occurs only after the appropriate binder has statically captured its authority; core remains application-neutral.

### Added state and branches

- persistent state/table/column/enum/Migration: **none**;
- Worker/lease/recovery/queue/outbox/scheduler/config mutation/Admin UI: **none**;
- runtime cache: immutable Prompt raw bytes only by full tuple; **no active-default/readiness/request cache**;
- ephemeral scope: one disclosed read-only repeatable-read availability transaction or Phase C's one governed enqueue transaction; no extra connection, transaction, lock, or state authority;
- compiled state: generic homogeneous registry interfaces, dual typed binder definitions, two staged opaque invocation interfaces, four Draft definitions, strict three-kind association codec, common read-scope interfaces, strict source/output codecs with fixed human-review labels, error codes, empty Production Prompt manifest/generated tuple, provider registry;
- test state: fake adapters, distinct Synthetic application/resources, AST and Next bundle fixtures; no durable repository;
- branch families: API mode selects exactly one binder; thereafter coarse auth/registry/target/context; replay-or-new; environment/feature/config/Prompt; claimed provenance reconstruction; one adapter result/completion/raw/output. Availability/request are distinct entry types, not a runtime fallback or duplicated request branch. Every branch terminates in a closed typed result and has direct tests.

### Maintenance cost

Maintainers must keep application codec/policy/schema versions and both binders aligned; retain the three target/hash and config/dispatch vectors; preserve common-scope/binder assignability and negative fixtures; maintain the finite A-01–A-10 lexicon and human-review boundary; append Prompt manifest/resources and regenerate the checked derivative; maintain RFC/raw-parser vectors; and update structural/bundle fixtures when module forms evolve. This cost is bounded and central. A new use case adds an application definition with two binders; a new application supplies its own typed registry/binders/codecs and forward persistence support; a Provider adds one adapter/evidence set. None requires adding a core application switch.

### No dual-authority proof

- `ai_model_config` alone selects new-run config; aggregate repository facts and generated Prompt bundle cannot select it.
- `ai_runs` alone owns durable work/lifecycle/provenance; no fake/in-memory enqueue, replay cache, queue, or history exists.
- Production Prompt manifest/resource bytes are authority; generated TS is byte-verified derivative only, config selects a tuple, and run snapshots it.
- Draft association/result persistence mapping is one adapter into accepted `ai_runs`, not another store.
- `target_snapshot_hash` owns only reproducible target identity/version integrity; `input_hash` owns exact Provider-safe contextual values. Neither duplicates the live Product/Content/Revision authority, which is rechecked at enqueue/apply.
- requested Provider is configuration provenance; actual Provider is dispatch evidence written only by the accepted marker. No pre-dispatch alias or alternate actual-Provider state exists.
- read-only and governed enqueue paths share one query capability; the transaction subtype only adds operations. No parallel repository/connection or hidden transaction exists.
- availability and request do not share a live target authorization result: each has one appropriate authority operation. Within a request, the transaction return object is captured once and reused through context/fingerprint/insert; there is no second read/lock/snapshot authority.
- opaque closure erasure is type-level encapsulation only; it stores no durable state and cannot become a queue/history/authorization authority.
- automatic output status records structural provenance only; human review owns semantics. There is no second factual-verification authority.
- Feature flag is a kill switch only.
- Worker supplies durable projection and cannot call adapter directly; generic orchestrator is the sole call site.
- Claimed brand and stable bundle markers are guards/evidence, not state authority.
- Provider dashboard/logs, Synthetic fixtures, and candidate refs are non-authoritative.
- No fallback/silent substitution path exists.

### Replacement/deletion conditions

- Phase C adds the first durable enqueue/repository/Worker behind the specified seams; it does not preserve or replace a Phase B temporary runtime.
- the V1.2 common-scope `associationPolicy.authorizeAndSnapshot` path is deleted rather than retained. No adapter or compatibility overload may keep it; any direct target-read-plus-lock request implementation must be removed before review.
- Test claimed helpers/fakes/Synthetic manifests remain under testing; any Production import/registration is a release blocker and is deleted, not grandfathered.
- Production Prompt absence ends only by appending separately reviewed immutable resources/manifest entries and regenerating the derivative; Synthetic content is never promoted.
- When Phase E supplies real Domain readers/facade callers, no core sequence is forked; a duplicated business preparation/adapter path must be removed.
- Any combined sync generate API, rendered-request Worker input, active-default cache, directory-scanning Prompt loader, hand-edited generated bundle, alternate queue/history, or permissive string-only architecture scan is a replace-not-layer violation and must be removed before review.

Phase B increases compiled validation/test maintenance but adds no cross-process/persistent coordination. V1.3 replaces one ambiguous policy path with two explicit entry compositions; it adds no runtime choice because API mode selects exactly one binder before core. Phase C retains the already approved operational complexity without a fake, duplicate authorization, or application-specific core path.

## 26. Design conclusion and next gate

Conclusion: **CORRECTED DESIGN CANDIDATE V1.3 / NOT SELF-APPROVED / IMPLEMENTATION NOT YET ELIGIBLE.**

The next and only gate is **another Fresh Re-review by the original independent Phase B Design Reviewer** against the exact new commit, V1.3 SHA, Remediation V1.2 record, immutable V1.2/V1.1/V1.0/prior-remediation hashes, and repository baseline. Phase B implementation must not start until that Fresh Re-review returns PASS. No Provider call, credential, network, Staging/Production, Deploy, formal import, Publish, Index, or Push is authorized or performed by this design.
