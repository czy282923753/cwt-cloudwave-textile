# Accepted Phase C Consumer Closure V1.1

Baseline scanned: `9006b638ed51f981f7477829086244627c488d6b`

Candidate parent inspected: `52244f7f80bec29ccedb0ba1faa0075be50db36f`

Prepared: `2026-08-12`

## 1. Existing authority closure

The V1.0 accepted-tree inventory remains authoritative and byte-immutable. This remediation reran literal/symbol scans for Provider contract/results, direct execution, attempt normalization/history, pricing, root/CLI, service/Worker/fence and controlled-context insertion points.

| Contract/authority | Current direct consumers requiring Phase D semantic change | V1.1 disposition |
|---|---|---|
| `TextAiProvider`, `ProviderTextResultV1`, `NormalizedTokenUsage`, `.generateText(` | `src/ai/providers/text-provider.ts`; `src/ai/providers/registry.ts`; `src/ai/core/orchestrator.ts`; `src/ai/runs/contracts.ts`; `src/ai/testing/fake-text-provider.ts`; affected Worker/core tests; architecture checker/profile | Covered by V1.0 in-place V2/prepare-execute replacement. Registry interface shape remains otherwise stable. No compatibility method. |
| `normalizeAttemptEvidenceV2`, `createAttemptHistoryEntryV1`, `AttemptHistoryEntryV1` | `src/ai/core/orchestrator.ts`; `src/ai/runs/contracts.ts`; `src/ai/runs/attempt-evidence.ts`; `src/ai/runs/repository.ts`; their direct tests | Covered. V1.1 adds controlled identity only to successor writer/entry, never a second writer. Historical reader remains read-only. |
| `PricingPolicyRegistryV1`, snapshot/calculators | Draft composition/read scope; config resolver/service; provider-neutral tests; run service/repository/Worker/tests | Covered by V1.0 V1/V2 strict union. V1.1 changes current raw pricing hash and frozen fixture only. No second calculator/registry. |
| Phase C server root/factories | `scripts/process-ai-runs.ts`; `src/server/ai/phase-c-composition.test.ts`; checker/V4 profile | Covered by exact Phase D root replacement/delete. No alias/re-export. |
| durable Draft service/Worker/fence | Draft composition, run service/repository/Worker, core claimed execution, internal worker entry and integration tests | Preserved as the only billable path. The controlled runner calls accepted factories and never reimplements a lifecycle method. |
| explicit-input `SafeInputSourceReferenceV1` | `src/ai/applications/draft-assistance/context.ts` and `context.test.ts`; durable insert reads prepared sources | V1.1 bounded modification: optional exact attestor extends source identity only for the sole fixture; ordinary shape and Provider context stay unchanged. |
| claimed reconstruction | `src/ai/internal/claimed-run-authority.ts`; core/Worker/repository tests | V1.1 validates safe controlled identity before dispatch and derives the request identity from persisted columns. No application data is exposed to core beyond existing claimed contract. |

## 2. Newly authorized exact edges

Only these new edges are permitted:

```text
scripts/validate-deepseek-text-adapter.ts
  -> src/ai/testing/controlled-provider-validation.ts::runControlledDeepSeekValidationV1

controlled-provider-validation.ts
  -> strict sole fixture resource
  -> existing migration/database schema for isolated test seed
  -> createPromptBundleLoaderV1
  -> createPhaseCDurableDraftAssistanceServiceV1
  -> createAiRunWorkerV1
  -> DeepSeek Provider/pricing registry factories

draft context composition
  -> optional ControlledValidationSourceAttestorV1 interface only

generic orchestrator
  -> optional ControlledValidationExecutionAuthorityV1 interface only

claimed authority/repository
  -> pure safe controlled identity parser/hash helper in the one attempt-evidence module
```

Forbidden edges include script→adapter/fetch/repository/fence/execute, core→testing/Draft/repository, business/public/client/Production→controlled module/fixture/DeepSeek, adapter→run/Worker/pricing/Prompt/business and any root→fixture/controlled authority.

## 3. Mutation coverage conclusion

Every semantic consumer requiring a change is included in the V1.1 Section 10 closed allowlist. Scanned consumers whose stable interfaces do not change—Provider registry lookup, model-config repository/service, Prompt loader/renderer, run read service, internal worker re-export and business/provider-neutral callers—remain unmodified.

The newly required implementation paths are named explicitly:

```text
src/ai/applications/draft-assistance/composition.ts
src/ai/applications/draft-assistance/context.ts
src/ai/applications/draft-assistance/context.test.ts
src/ai/core/contracts.ts
src/ai/core/orchestrator.ts
src/ai/internal/claimed-run-authority.ts
src/ai/testing/controlled-provider-validation.ts
src/ai/testing/controlled-provider-validation.test.ts
src/integrations/ai/providers/deepseek-text-adapter.node-fetch.integration.test.ts
test-fixtures/ai/deepseek-controlled-validation.v1.json
```

All other add/modify/delete paths are retained from the V1.0 closed list. There is no wildcard. A compile/test/proof need outside the V1.1 exact list is `NEEDS_OWNER_DECISION`.

## 4. Architecture impact

- Core remains Provider- and application-neutral: the injected authority contract consumes only safe generic tuple/hashes.
- Draft remains the owning application for its target/context/authorization; the attestor adds no business mutation.
- `ai_runs`/Worker/repository remain one work/provenance authority.
- Existing JSON columns carry bounded versioned metadata; no relation/status/constraint is added.
- The successor server root remains singular; the controlled module is test-only and unreachable from it.
- Production Provider/Prompt/pricing registries stay empty and Production budget remains zero.
- Phase E/F/G and external assurance remain separate.

Conclusion: no Schema, Migration, ADR or dependency impact is required by this closure.
