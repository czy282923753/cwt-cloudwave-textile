# CWT Phase F K1 Four-Call Terminal Continuation Authority Correction V2.1

Date: `2026-08-27`

Classification: **`PRODUCT_CORRECTION_CANDIDATE / NOT INDEPENDENTLY REREVIEWED / NOT ACCEPTED / NO OPERATIONAL AUTHORITY`**

Open finding: **`F-K1-V2-PCSMR-01` remains open pending Fresh Independent focused Product Code/Security re-review.**

## 1. Outcome and prior omission

The V2.0 Product Candidate used a permissive post-terminal fall-through: it stopped only for authentication, quota, cost overrun or cancellation. That implementation and its report omitted the accepted requirement to stop after `model_drift`, non-auth client rejection, transport ambiguity, `not_dispatched`, and unexpected/ambiguous terminal combinations. The Independent FAIL correctly classified this as an external-call authority defect.

This correction deletes that permissive decision. The one private runner now has one closed 11-tuple continuation allowlist based only on persisted terminal `status`, normalized `provider_response_status`, and Product `failure_code`. Every unlisted or mismatched combination returns false and stops later planned calls. Existing prefix, identity, config, target/version, final-accounting, zero-reservation and `500,000`-microusd batch-cap checks still run before every later enqueue.

No classifier framework, second decision path, retry, fallback, selector, fifth key, Schema/Migration, repository/orchestrator/adapter/type-contract or Control mechanism was added.

## 2. Authoritative identity and append-only ancestry

- Exact correction parent HEAD/tree: `c1a9e3732cc7e1930b3131aa0e8c3ea9c0dfd460` / `976e94342823dd6110925febfbbafe6c8539b804`.
- Branch: `codex/phase-f-minimal-experiment-v1`.
- Independent FAIL report SHA-256: `7da510d4ab04bdf38a5b475948ba8629cb689af5ae3526068f954f592205630c`.
- Correction implementation commit/tree: `5943fb5c740f63141b6271ac8bfe39fd58ecc1ca` / `bcb2d3902a07e8da8de3c05efc83fc769781b327`.
- The correction commit has the exact packaged V2.0 Candidate as its sole parent. No amend, rebase, rewrite, merge or historical-byte change occurred.
- The report-packaging commit/tree cannot be embedded self-referentially in its own bytes; its exact identity is emitted in the mandatory Coordinator callback.

## 3. Exact mutation inventory

The correction implementation commit changes exactly four authorized paths:

| Path | Correction |
| --- | --- |
| `scripts/phase-f-m6-one-case-diagnostic.ts` | replace permissive fall-through with the closed tuple decision |
| `src/ai/phase-f-m6-one-case-diagnostic.integration.test.ts` | execute the actual private decision and prove exact allow/default-stop matrices |
| `src/ai/phase-f-m6-one-case-diagnostic.postgres.integration.test.ts` | add real persisted continuation/stop compositions |
| `scripts/verify-ai-architecture.ts` | mechanical runner hash/report budget plus exact closed-tuple semantic identity |

Implementation delta: `214 insertions / 6 deletions`. Packaging adds only this report and adjacent sidecar.

All V2.0 implementation bytes outside these paths are unchanged. Migration `0021`, Schema/config/claim/repository authorities, adapter, Prompt/output policy, orchestrator, Worker, dependencies/lockfile, Control V1.7 and historical reports remain immutable.

## 4. Exact continuation and stop authority

### Continue only

| Persisted status | Normalized Provider status | Product failure code |
| --- | --- | --- |
| `draft_ready` | `success` | `null` |
| `failed` | `invalid_response` | `output_empty` |
| `failed` | `invalid_response` | `output_truncated` |
| `failed` | `invalid_response` | `output_invalid_json` |
| `failed` | `invalid_response` | `output_schema_invalid` |
| `failed` | `invalid_response` | `output_policy_rejected` |
| `failed` | `invalid_response` | `output_too_large` |
| `failed` | `safety_rejected` | `provider_safety_rejected` |
| `failed` | `timeout` | `provider_timeout` |
| `failed` | `rate_limited` | `provider_rate_limited` |
| `failed` | `server_error` | `provider_server_error` |

Continuation remains additionally conditional on the exact completed prefix, fixed binding/version, final readable accounting, zero reservation and batch-cap proof.

### Consume current row and stop later calls

The default is stop. Explicit focused fixtures prove stop for authentication, quota, `model_drift`, non-auth `client_error/provider_client_error`, `transport_error/provider_transport_error`, `not_dispatched`/pricing-control failure, cancellation, cost overrun, `unknown/adapter_unexpected_failure`, missing failure evidence, mismatched success/failure combinations and a synthetic future terminal category. Enqueue-before-row, prefix/binding/accounting drift and any unexpected row already fail before a later dispatch.

A row created for the current fixed UUID remains consumed in every case. No key is retried, revisited or replaced.

## 5. Red/green root proof

Before changing the runner, the new model-drift oracle was run against exact V2.0 packaged HEAD `c1a9e373...` on cached Node `24.14.0` and disposable PostgreSQL `17.10`. The first row persisted `failed / model_drift / model_drift`, but stdout was `status:"completed", completedCount:4` and four rows/calls existed. The oracle failed exactly as the Independent review reported.

After the correction, the same persisted model-drift path on PostgreSQL `17.10` and `18.4` emits `status:"stopped", completedCount:1`, has only the first fixed UUID/row, and makes no later call.

## 6. Focused verification

### Static and closed-graph proof

- Node `24.14.0` runner boundary suite: PASS, `7/7`.
- The test extracts and executes the actual private tuple/function from runner source rather than reimplementing the decision.
- All 11 allowed tuples return true; auth/quota/model/client/transport/not-dispatched/cancelled/unknown/missing/ambiguous/future-category fixtures return false.
- The architecture checker binds the exact runner SHA and independently parses the singular frozen tuple; any added, removed, reordered, wildcard or nonliteral category fails closed.
- Four UUIDs, one request expression, one Worker slot, no CLI/selector/fifth/retry/fallback/export/importer, stdin-only credential and safe-output proofs remain PASS.

### Disposable PostgreSQL composition

- PostgreSQL `17.10`: final exact suite PASS, `10/10`.
- PostgreSQL `18.4`: final exact suite PASS, `10/10`.
- Positive valid path: exactly four `draft_ready` rows/calls, one attempt each, candidate retained, no fifth call or re-entry.
- Invalid usage diagnostic: exactly four consumed failed rows, null usage, incomplete actual cost, `7,304` conservative accounting, no candidate and no reservation.
- Output matrix: `output_empty`, `output_invalid_json`, `output_schema_invalid`, and `provider_safety_rejected` each consume and continue through the four fixed keys.
- Ordinary Provider matrix: timeout, rate limit and server error consume the first three fixed keys; the fourth valid sample is dispatched and becomes `draft_ready`.
- Authentication, quota, model drift, non-auth client error, transport error and normalized unknown ambiguity each produce exactly one row/call and zero later dispatch.
- `not_dispatched`, cancellation, cost/control and unexpected/missing combinations are covered by the executed closed-decision fixtures; their persisted tuple is not in the continuation authority.
- No Apply/Publish/Index or Product/public mutation occurred; fake Provider only, no real credential/network.

One test-harness-only iteration is recorded: HTTP `304` cannot carry the constructed body and therefore normalized as transport instead of the intended unknown fixture. It already stopped safely. The fixture was changed to local synthetic HTTP `299`, then the isolated unknown case and the final full PostgreSQL 17.10/18.4 matrices passed. Product runtime logic was not changed for that harness correction.

## 7. Final gates

- Exact architecture checker: PASS, `ok:true`, existing seven runtime-authority mutation probes and protected-boundary control preserved.
- AI foundation candidate gate: PASS; Migration `0021` and all prior foundation identities unchanged.
- ESLint: PASS, zero warnings.
- TypeScript `tsc --noEmit`: PASS.
- `git diff --check`: PASS.
- Full Vitest run once after focused PASS: `127 files passed / 11 skipped; 874 tests passed / 85 skipped`.
- Next build/E2E: NOT RUN; no public/build path changed and not authorized.
- `pnpm audit`: NOT RUN; no dependency delta and network is prohibited.

## 8. Preservation and evidence integrity

- Old V2.0 runner SHA-256: `a50acdaf737f9e0f70d58b8c4ee2339c6a5c0d8bfffad6ebec6444a1e06155bf`.
- Corrected runner SHA-256: `2fb27979529090ddbf8d7f7182d3bf778ed218ebc790b3b13b425c0f36433fbd`.
- Original V2.0 implementation report SHA-256 remains `d8631bb221b55576c11b22f3a134526de91025f0471c73bcaa97e9eb2543ff3d`; its sidecar file remains `43eb3ef254be2a98842afdcc81a54575496c68ca21aadc484ed0da1fec274308`.
- Migration `0021` SHA-256 remains `ac7c520f6a8462466ccfa3e74002c6be87dcadd5826e6d51a5859f56ad1f005c`.
- `package.json` / `pnpm-lock.yaml` remain `7fac662d864eb10703abb3d80eeec16bd48731ce43ce2b4240f3c57019e88943` / `fd9f24c7cc27d2faff8d08f98f815ac60876c45d4b51f32b81118da2e6b40266`.

No prior implementation/report/review byte was rewritten. This report expressly supersedes only the V2.0 report's incorrect continuation claim; it does not conceal or self-close the Independent FAIL.

## 9. Complexity, cleanup, rollback and next gate

Responsibility remains in the sole private runner at the point where persisted terminal evidence authorizes the next planned call. One permissive branch was replaced by one closed tuple predicate. No persistent state, class, registry, Worker, retry, fallback or compatibility path was added. Local test/checker lines increased to prove the real high-risk external-call boundary; runtime state count and operator steps are unchanged.

All task-owned PostgreSQL 17.10/18.4 containers and anonymous volumes were removed, and their absence was checked. No test process or temporary artifact remains. No live K1, Control, credential, Provider/API/DNS/network, provisioning, external execution, Production, Push/Deploy/Publish/Index or formal-data action occurred.

Rollback is the exact immutable V2.0 packaged parent `c1a9e3732cc7e1930b3131aa0e8c3ea9c0dfd460` / `976e94342823dd6110925febfbbafe6c8539b804`. That rollback restores the known continuation defect and therefore is evidence-only, not operational authority.

Next and only gate: **Fresh Independent focused Product Code/Security re-review of the exact immutable correction Candidate.** Control and all operational gates remain HOLD.
