# Accepted Phase C Inventory V1.0

Inventory base: `9006b638ed51f981f7477829086244627c488d6b`
Proof-bound code: `6de5fac1d676c5d01ccfedaeb90c1bcb0285c89a`
Independent PASS review: `5d7371c0b83d0a90c271b403c392b8a978411bd4`, direct parent `9006b638ed51f981f7477829086244627c488d6b`
Inventory date: `2026-08-12`

## 1. Baseline identity

- Checkpoint ref `refs/heads/codex/checkpoint/phase-1b-stage4a-phase-c-implementation-accepted-v1` resolved exactly to `9006b638ed51f981f7477829086244627c488d6b` before branch creation.
- The isolated worktree was clean before mutation.
- Branch `codex/phase-1b-stage4a-phase-d-exact-design-v1` was created from that exact checkpoint without reset, rebase, amend or ref movement.
- The Owner Decision record commit is an ordinary direct child of the accepted checkpoint and contains only its authorized document.

## 2. Exact accepted authorities

| Boundary | Path | Exact current authority/symbol |
|---|---|---|
| Provider contract | `src/ai/providers/text-provider.ts` | `ProviderNeutralTextRequestV1`, `ResolvedAdapterConfigurationV1`, `NormalizedTokenUsage`, `NormalizedCompletionV1`, `NormalizedProviderResponseStatus`, `ProviderNeutralFailureCode`, `ProviderTextResultV1`, `TextAiProvider` |
| Provider registry | `src/ai/providers/registry.ts` | `TextProviderRegistryV1`, `createTextProviderRegistryV1`, exact-empty `productionTextProviderRegistryV1` |
| Core | `src/ai/core/orchestrator.ts` | sole request/Prompt/estimate/dispatch/Provider-call/output-protection path; exact returned-model equality |
| Config | `src/ai/config/model-config-resolver.ts`, `model-config-service.ts`, repository | one `ai_model_config` resolution/mutation authority; immutable resolved snapshot |
| Prompt | `src/ai/prompts/loader.ts`, renderer, compiled bundle | one loader/renderer; exact-empty Production bundle at checkpoint |
| Pricing | `src/ai/runs/pricing-policy.ts` | one compiled registry, V1 snapshot/calculators, exact-empty Production registry, nonbillable local/test registry |
| Run evidence | `src/ai/runs/contracts.ts`, `attempt-evidence.ts`, repository | one normalized evidence/history and `ai_runs` provenance authority |
| Retry | `src/ai/runs/retry-policy.ts`, Worker/repository | same-run/same-provider only; maximum three; no fallback |
| Worker | `src/ai/runs/worker.ts` through `src/ai/internal/worker-entry.ts` | one modular-monolith Worker; two text slots; claim/heartbeat/dispatch/settlement fencing |
| Root | `src/server/ai/phase-c-composition.ts` | sole root; exact exports `createPhaseCServerAiServiceV1`, `createPhaseCAiRunWorkerV1` |
| CLI | `scripts/process-ai-runs.ts` | sole current root incoming runtime edge; imports Worker factory only |
| Architecture | `scripts/verify-ai-architecture.ts` + `test-fixtures/ai-architecture/graph-faults.phase-c.v4_0.json` | one checker, standalone schema `40`, profile `cwt.phase1b.stage4a.phasec.durable-run-worker-boundary.v4_0_candidate` |

## 3. Direct consumer scan

The literal/symbol scan over `src`, `scripts`, `test-fixtures` and `package.json` produced these bounded consumer sets.

### 3.1 Provider contract/registry consumers

```text
scripts/verify-ai-architecture.ts
src/ai/applications/draft-assistance/composition.ts
src/ai/config/model-config-resolver.test.ts
src/ai/config/model-config-resolver.ts
src/ai/config/model-config-service.integration.test.ts
src/ai/config/model-config-service.ts
src/ai/core/claimed-execution.integration.test.ts
src/ai/core/orchestrator.ts
src/ai/provider-neutral-foundation.integration.test.ts
src/ai/providers/registry.ts
src/ai/providers/text-provider.ts
src/ai/runs/service.integration.test.ts
src/ai/runs/worker-shutdown.integration.test.ts
src/ai/runs/worker.integration.test.ts
src/ai/runs/worker.ts
src/ai/testing/fake-text-provider.ts
src/server/ai/phase-c-composition.test.ts
src/server/ai/phase-c-composition.ts
test-fixtures/ai-architecture/graph-faults.phase-c.v4_0.json
```

Only `src/ai/core/orchestrator.ts`, `src/ai/testing/fake-text-provider.ts`, and two inline adapter objects in `src/ai/runs/worker.integration.test.ts` directly call/implement `generateText`. The Phase D contract replaces all of them and the checker rule. Result/usage type consumers move atomically to V2; no other consumer requires a semantic change.

### 3.2 Attempt-evidence consumers

```text
src/ai/core/contracts.ts
src/ai/core/orchestrator.ts
src/ai/runs/attempt-evidence.test.ts
src/ai/runs/attempt-evidence.ts
src/ai/runs/contracts.ts
src/ai/runs/repository.integration.test.ts
src/ai/runs/repository.ts
src/ai/runs/service.integration.test.ts
```

These paths are the complete direct `NormalizedAttemptEvidenceV2`/`AttemptHistoryEntryV1`/normalizer consumer set. Phase D moves all source writers and typed consumers atomically to V3/V2; only a private historical JSON reader remains for retained entries.

### 3.3 Pricing consumers

```text
src/ai/applications/draft-assistance/composition.ts
src/ai/applications/draft-assistance/read-scopes.ts
src/ai/config/model-config-resolver.ts
src/ai/config/model-config-service.integration.test.ts
src/ai/config/model-config-service.ts
src/ai/provider-neutral-foundation.integration.test.ts
src/ai/runs/pricing-policy.test.ts
src/ai/runs/pricing-policy.ts
src/ai/runs/repository.ts
src/ai/runs/service.integration.test.ts
src/ai/runs/service.ts
src/ai/runs/worker-shutdown.integration.test.ts
src/ai/runs/worker.integration.test.ts
src/ai/runs/worker.ts
src/server/ai/phase-c-composition.test.ts
src/server/ai/phase-c-composition.ts
test-fixtures/ai-architecture/graph-faults.phase-c.v4_0.json
```

The Phase D design preserves the registry/calculator names and return shapes needed by config/service/read-scope consumers. Required semantic changes are confined to the pricing authority, repository parsing/accounting, Worker exact-snapshot comparison, their tests and the successor root.

### 3.4 Prompt consumers

```text
src/ai/applications/draft-assistance/composition.ts
src/ai/config/model-config-resolver.test.ts
src/ai/config/model-config-resolver.ts
src/ai/config/model-config-service.integration.test.ts
src/ai/config/model-config-service.ts
src/ai/core/claimed-execution.integration.test.ts
src/ai/core/orchestrator.ts
src/ai/prompts/loader.ts
src/ai/provider-neutral-foundation.integration.test.ts
src/ai/runs/service.integration.test.ts
src/ai/runs/worker.integration.test.ts
src/ai/runs/worker.ts
src/ai/testing/synthetic-prompts/synthetic-prompt.test.ts
src/server/ai/phase-c-composition.test.ts
src/server/ai/phase-c-composition.ts
test-fixtures/ai-architecture/graph-faults.phase-c.v4_0.json
```

No Prompt path is changed in Phase D. The exact-empty Production bundle/loader remains the root's Prompt dependency.

### 3.5 Root/profile consumers

```text
package.json
scripts/process-ai-runs.ts
scripts/verify-ai-architecture.ts
src/ai/runs/worker-shutdown.integration.test.ts
src/server/ai/phase-c-composition.test.ts
src/server/ai/phase-c-composition.ts
test-fixtures/ai-architecture/graph-faults.phase-c.v4_0.json
```

The root, its test, CLI import, sole checker and standalone profile are one atomic replacement set. V4 remains historical and is not edited.

## 4. Accepted contract facts affecting Phase D

- `ProviderNeutralTextRequestV1` contains instructions, input, JSON-object response identity and max output tokens; no business endpoint/model/header field exists.
- Phase C performs all local reconstruction before a fenced dispatch authorization, then calls the adapter at most once.
- `ai_model_config` ceilings are `16,000` input, `4,000` output, `1..3` attempts and `<=20,000` microusd per run.
- Staging budget authority is already `USD 5` daily hard, `USD 50` monthly warning and `USD 100` monthly hard; Production is zero/disabled.
- Top-level token columns are aggregate input/output/total only. `attempt_history_json` and `pricing_snapshot_json` are bounded JSON and can carry additive normalized fields without Schema/Migration.
- Raw Provider body, Prompt/request, headers, secrets, exception messages/stacks and unprotected output are already excluded from persistence.
- Production Provider/Prompt/pricing registries are exact-empty. Fake/Synthetic adapters are test-only.
- V4 reserves `src/integrations/ai/providers/<approved-adapter>.ts` and `src/server/ai/phase-d-provider-composition.ts` as the later reviewed Phase D seams.

## 5. Closed unchanged disposition

The following direct consumers remain unchanged by exact design because their accepted interface usage survives the successor: Draft-assistance application composition/read scopes, model config resolver/service and their Production logic, run service/retry policy, Prompt loader/renderer/resources, Provider registry factory, internal Worker entry, application registries, UI/Server Actions, Schema/Migration and every business/public/storage module.

If compiler/static proof shows that an unchanged path actually requires mutation, implementation must return `NEEDS_OWNER_DECISION`; the design does not authorize a hidden compatibility layer.
