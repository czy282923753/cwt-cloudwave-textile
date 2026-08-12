# Accepted Phase C Consumer Closure V1.2

Baseline scanned: `9006b638ed51f981f7477829086244627c488d6b`

Candidate parent: `097d6a570762fb2f19d499fb9fc873bae0dc1d67`

Prepared: `2026-08-13`

## 1. Accepted-tree scan closure

Literal/symbol scans were rerun against the accepted Phase C tree for Provider contracts/results, direct execution, attempt normalization/history, pricing, service/Worker/fence, context source identity, request binding and Product output policy.

| Authority | Direct accepted consumers | V1.2 impact |
|---|---|---|
| `TextAiProvider`, result/usage, `generateText` | Provider contract/registry, core orchestrator, run contracts, fake Provider, Worker integration, architecture checker | V1.0 in-place prepare/execute/result successor remains. No compatibility method. V1.2 fixture proof exercises the accepted boundary; it adds no core Provider API. |
| attempt normalizer/history | core orchestrator, run contracts/repository, attempt evidence and service/repository tests | V1.1's sole successor writer and controlled safe identity remain. V1.2 only replaces exact fixture/request values. |
| `PricingPolicyRegistryV1`/snapshot | Draft composition/read scope, config service/resolver, run service/repository/Worker/tests, root | One compiled pricing registry remains. New official-source preflight observes two documents but cannot calculate, register or dispatch pricing. |
| durable service/Worker/fence | Draft composition, core claimed execution, repository/service/Worker/internal entry/root/tests | Sole billable path remains accepted Domain Service → required Audit/row → one claim → one committed fence → one writer/settlement. |
| `SafeInputSourceReferenceV1`/context policy | Draft composition/context, core contracts/claimed tests | Sole optional fixture attestor remains limited to safe source identity; actual accepted classifier/context is unchanged. |
| request binder/Product output | Draft contracts/facade/context/read scope, production use-case registry, output schema/policy/registry and their consumers | V1.2 fixture is proven through actual accepted binder and policy. No bypass or policy modification is allowed. |
| Phase C root/factories | Worker CLI, Phase C root/test, architecture checker/profile | Replacement-only Phase D root/delete remains as V1.0/V1.1; no alias or dual root. |

Stable schema/config/Prompt/read consumers found by the scan remain unmodified because existing bounded JSON/identity columns and accepted registry/loader interfaces carry the successor values. `src/db/schema/ai.ts` is a consumer of snapshot types in the scan, not a mutation need.

## 2. Exact permitted new edges

V1.1 permitted edges remain, plus exactly:

```text
controlled-provider-validation.ts
  -> deepseek-official-source-preflight.ts::revalidateDeepSeekOfficialSourcesV1

deepseek-official-source-preflight.ts
  -> GET https://api-docs.deepseek.com/quick_start/pricing/
  -> GET https://api-docs.deepseek.com/api/create-chat-completion/

deepseek-text-adapter.ts::prepareTextDispatch
  -> module-private selected credential reader exactly once
```

The official-source module returns only bounded public fact/hash/count projections. It cannot import credential/env config, adapter, Provider dispatch, Worker, repository, budget or business modules. The script still imports only the one controlled runner.

Forbidden edges include any preflight/script/harness/root/config credential probe; any official-source fetch outside the new module; script→adapter/fetch/repository/fence/execute; adapter→runs/pricing/Prompt/business; core→testing/Draft/repository; and business/public/client/Production→controlled fixture/module/DeepSeek.

## 3. Allowlist closure

Every V1.1 semantic consumer remains within its exact Section 10 allowlist. V1.2 names the only newly required files:

```text
src/integrations/ai/providers/deepseek-official-source-preflight.ts
src/integrations/ai/providers/deepseek-official-source-preflight.test.ts
```

No other source/config/test/evidence path is required. `deepseek-pricing.ts` remains compiled pricing authority and loses the V1.1 remote-fetch role. Adapter reader-count tests remain in the already-listed `deepseek-text-adapter.test.ts`; fixture and durable harness tests remain in their already-listed paths.

## 4. Architecture impact

- Core remains Provider/application-neutral; the accepted classifier/binder/policy are unchanged.
- There is one run/Worker/retry/fence/writer/settlement/pricing/Prompt/root/checker authority.
- Official public source observation is preflight-only and credential-independent; it does not become runtime pricing authority.
- Existing JSON columns carry safe fixture/request identities; no table/relation/status/constraint is added.
- Production registries remain empty/disabled and Production budget remains zero.
- Phase E/F/G and unresolved external assurance remain separate.

Conclusion: no Schema, Migration, ADR, env-schema, dependency or lockfile impact is required.
