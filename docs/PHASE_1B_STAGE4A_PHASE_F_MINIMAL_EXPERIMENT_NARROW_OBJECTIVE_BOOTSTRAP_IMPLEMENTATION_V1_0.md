# CWT Phase F Minimal Experiment Narrow Objective Bootstrap Implementation V1.0

## 1. Status and authority

**IMPLEMENTATION_CANDIDATE / NOT INDEPENDENTLY REVIEWED / NOT ACCEPTED**

This report records the Project Owner-authorized bounded implementation of the effective Narrow Objective Design Erratum V1.0+V1.1. It changes only the existing private bootstrap, the two specified focused tests, the mechanical architecture checker, and this report/sidecar. It does not close implementation-level `F-OSR-01` and creates no operational authority.

| Item | Exact identity |
| --- | --- |
| Authorized parent HEAD/tree | `2ad9373fe1c980d803f91e2492924410867c0643` / `bb990ecf351ed0cbd6839c1facfad3f71dd4239b` |
| Implementation code/test commit/tree | `63d8d60a949ec0653730583eb7e00508614babfa` / `cb5dd0d27b1f43537efd3b59f53242bdd040b908` |
| Branch | `codex/phase-f-minimal-experiment-v1` |
| Accepted P/freeze HEAD/tree | `41dfc135f5f124e68aaac416c049c2e387e38d57` / `f85182ad8d4519d58e1d829967cfc889b8f1e830` |
| Design V1.0 SHA-256 | `36a6447b03cdc34fcc71e8562421803a0189559ecff2fa012dfd307415afaf41` |
| Design V1.1 SHA-256 | `d447ea5ec608938e04890aa92d1603728229bf05d9db60d7d0915da03e913bf0` |
| Fresh Independent Design/Security PASS SHA-256 | `2533e09e16ca75e59888a3c5b64eb9b3b3383737b5d84d8fdc8f502de469d060` |

The starting HEAD/tree, branch, clean state, exercise hash, freeze identity, all three authoritative document hashes, and all adjacent sidecars passed before mutation. History is append-only; no amend, rebase, rewrite, checkpoint, or ref movement occurred.

## 2. Corrected responsibility boundary

The root gap was the absence of an Operator-reachable config ingress despite the intentionally private Phase F topology. The correction moves only the four fixed config create/activate calls into the already governed private no-argument bootstrap. It reuses `createAiModelConfigServiceV1` instead of adding a route, UI, API, direct table write, config runner, or generalized authority mechanism.

After the bootstrap's existing serializable Synthetic Admin plus disabled feature mutation commits, it:

1. resolves the four existing output contracts;
2. creates one exact DeepSeek Provider registry whose bootstrap-only fetch and credential seams throw if invoked;
3. uses the production Prompt loader and compiled reviewed pricing registry;
4. calls the existing service `create` then `activateDefault` exactly once for each fixed use case with the authoritative Synthetic Admin; and
5. reads back the complete bounded state and emits success JSON only after exact postconditions pass.

The bootstrap does not read `DEEPSEEK_API_KEY`, dispatch a Provider request, call fetch, start a Worker/Web path, change feature AI from false, retry, rerun, clean up partial state, or implement the V1.1 operational `READ ONLY` evidence query.

## 3. Exact fixed contract and safe output

Every config uses `deepseek/deepseek-v4-flash`, `{temperature:0}`, `maxInputTokens=16000`, `maxOutputTokens=200`, `maxAttempts=1`, `runCostLimitMicrousd=20000`, `promptVersion=1`, no fallback, and the exact V1.0 Prompt ID/hash for its use case.

Success requires exactly:

- one active Synthetic Admin;
- one `ai` feature row with `enabled=false`;
- four distinct active/default config rows, each `recordVersion=2`, with exact values and actor ownership;
- one create and one activation Audit per config;
- the existing Admin bootstrap and feature-create Audits, for exactly ten bootstrap Audits total; and
- zero `ai_runs`.

Safe stdout adds only four ordered `{useCase,id,recordVersion}` items to the existing classification, actor ID, and `featureAiEnabled:false` fields. It contains no secret, Prompt body, raw pricing page, Provider payload, credential, or Authorization data. Any failed service result, missing contract, stale pricing, unexpected row/count/value/version/Audit, credential access, or fetch attempt exits nonzero without success JSON. Partial disposable state is deliberately neither repaired nor cleaned up.

## 4. Exact changed-file and complexity inventory

| Path | Bounded change |
| --- | --- |
| `scripts/phase-f-bounded-bootstrap.ts` | Four compile-time tuples, existing registry/service composition, create/activate loop, exact postcondition, safe output |
| `src/ai/phase-f-bounded-experiment.integration.test.ts` | Exact imports/tuples, no-argument/no-export/two-executable inventory, exercise hash and 15-value contract, architecture mutation expectations |
| `src/ai/phase-f-bounded-experiment.postgres.integration.test.ts` | PG17/18 bootstrap success/failure proofs and narrowed four-case fake-Provider composition with no Apply/write-back |
| `scripts/verify-ai-architecture.ts` | Exact bootstrap/exercise hashes, six exact bootstrap privileged tuples, preserved exact exercise tuples, one bootstrap-to-Worker negative probe, exact report budget |
| This report and adjacent sidecar | Versioned implementation evidence only |

The exercise remains byte-identical at SHA-256 `dc72feb2920501240b8137fa5ab129e8be42dfd3f321b053cdaac7a3ef329ed6` and retains exactly 15 named values. The new bootstrap SHA-256 is `21b15c2fe90488664e087fd0bcf7f7b077ec1d4dce99f36e74a5c55dea95b3ee`.

No Product/Admin/UI module, model-config service/repository, run service/Worker, Domain Service, Schema/Migration, dependency/lockfile, CI, ADR, ObjectStorage, public export/route/Action/API, pricing value/freshness, Provider transport, materialization path, Publish/Index/Route/factual/public boundary, or exercise file changed. New executable, table, service, framework, controller, session, lease, grant, persistent coordination, compatibility path, reusable authority, and public export counts are zero. Total runtime mechanism count stays level; the only existing bootstrap gains the accepted fixed responsibility.

## 5. Focused verification

| Gate | Result |
| --- | --- |
| Static focused boundary suite | PASS — 1 file, 8 tests |
| PG17.10 full focused bootstrap/Strategy A suite | PASS — 1 file, 7 tests |
| PG18.4 full focused bootstrap/Strategy A suite | PASS — 1 file, 7 tests |
| Bootstrap exact success | PASS — one Admin, feature false, four active defaults, ten required Audits, zero runs, safe output |
| Bootstrap fail-closed set | PASS — wrong env, concurrent topology, nonempty rerun, missing contract, Prompt/Provider/stale pricing, config mutation/Audit, unexpected version, extra CLI input |
| Narrowed four-case fake-Provider composition | PASS on PG17 and PG18 — four single-attempt `draft_ready` candidates; `7304` microusd upper bound each; no Apply Audit or Product/Content/public mutation |
| Architecture checker | PASS — `ok:true`, seven Phase F authority mutation probes, one protected-boundary control |
| ESLint | PASS |
| TypeScript `tsc --noEmit` | PASS |
| `git diff --check` | PASS |
| Full Vitest, run exactly once | PASS — 127 files passed, 11 skipped; 859 tests passed, 81 skipped |
| Exercise/source identity and secret/placeholder checks | PASS |

The PG composition uses only a child-process local fake Provider/fetch and a conspicuously synthetic test credential; it performs no network or real Provider action. The bootstrap success path proves its explicit credential/fetch denial seams were not invoked.

Build, public bundle, and E2E were **NOT RUN** because no affected import/public runtime path supplied a concrete reason and the Owner did not require them. `pnpm audit` was **NOT RUN** as prohibited; there is no dependency delta and no network retrieval occurred.

## 6. Transparent intermediate observations

No failed check was hidden:

1. The first typecheck found a test-only mistaken `.value` access on the already resolved pricing registry. The test was corrected; the next typecheck and all final gates passed.
2. The first focused ESLint found one unused test import left after deleting the old test pricing hook. The import was removed; final full ESLint passed.
3. The first PG17 composition attempt correctly returned `pricing_stale` because the old test fixture backdated bootstrap config timestamps to before the reviewed snapshot's `effective_from`. That obsolete test-only timestamp rewrite was deleted. The bootstrap/service database time and compiled pricing were not changed; final PG17 and PG18 suites passed with current authoritative timestamps.

## 7. Non-authority, cleanup, rollback, and next gate

No Provider/API/account/credential access, network retrieval, real Staging provisioning/materialization/activation/execution, external write, Production, Push, Deploy, Publish, Index, formal data, checkpoint, Fresh Acceptance, Phase F acceptance, or Phase G action occurred. The two disposable local PostgreSQL containers, databases, local credentials, and temporary state were removed. No test process or build artifact remains.

Local rollback is the exact authorized parent `2ad9373fe1c980d803f91e2492924410867c0643`; reverting the implementation and packaging commits restores the prior HOLD-only Candidate. No Schema, data, or external rollback is required.

Compiled pricing remains current only through `2026-08-30T10:23:53.657Z` inclusive and fails closed afterward. This implementation adds no refresh, override, stale exception, or clock manipulation.

`F-OSR-01` remains **OPEN pending Fresh Independent Code/Security Review**. This Implementer does not self-review or self-accept the Candidate.

**Next gate:** Fresh Independent Code/Security Review of the exact immutable Candidate only. No Fresh Acceptance or operational action starts automatically.
