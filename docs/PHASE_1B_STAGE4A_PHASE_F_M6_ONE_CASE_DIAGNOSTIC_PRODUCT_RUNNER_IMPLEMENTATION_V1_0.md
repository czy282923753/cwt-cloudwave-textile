# CWT Phase F M6 One-Case Diagnostic Product Runner Implementation V1.0

Date: `2026-08-26`

Classification: **`ONE_CASE_DIAGNOSTIC_PRODUCT_CANDIDATE / NOT INDEPENDENTLY REVIEWED / NOT ACCEPTED / NO OPERATIONAL AUTHORITY`**

## 1. Outcome and authority boundary

The obsolete fixed four-case Phase F exercise path was deleted and replaced by one private, no-argument, zero-export `product_description_draft` K1 diagnostic executable. The replacement uses the existing controlled-validation attestor/authority, Prompt/config resolution, DeepSeek adapter/pricing registry, durable orchestrator/repository, claimed application registry and Worker. It creates no second execution path, selector, public export, persistent authority or compatibility layer.

This Candidate is Product code and local-test evidence only. It does not authorize K1 control implementation, provisioning, migration execution outside disposable tests, credential use, Provider/network access, external execution, retry, Reviewer contact, Fresh Acceptance, Production, Push/Deploy/Publish/Index, Phase F acceptance or phase advancement.

## 2. Authoritative inputs and identity

- Parent HEAD/tree: `c85304cec59aa59364d221cc2c2a56016d2161d8` / `0143158aba6ef600076277899bba9116fc0af732`.
- Branch: `codex/phase-f-minimal-experiment-v1`.
- Reviewed Plan SHA-256: `830cf9b1e029b5a2baa035d5f828d6a0c9ac5773a02d14f222ef5614f8c499da`.
- Fresh Independent Plan PASS SHA-256: `cce260303eda2ed172c18a3db8b6403d0f3fbc1df1fe77867638550d2c0fd498`.
- Sanitized adapter implementation/review SHA-256: `1361e42a99ae84ebdeefcaed14030eca01ffee10a370a050438500f6d4cc5d77` / `0dcde8c62e104fc6f8ac382a8f5c6b01d2014477ce6a0c95559c6c50822387c6`.
- Implementation commit/tree: `b117d6a3ea31d8f8aa397a2138d0f611c3f27346` / `2dfd6acb4ddd030783b11ac9e29dbe9a1a645c77`.
- Linear ancestry: the implementation commit has the exact parent above; one append-only commit; no amend, rebase or rewrite.
- The final report-packaging commit/tree cannot be embedded self-referentially in its own bytes; its exact identity is emitted in the required Coordinator callback and handoff.

## 3. Exact mutation inventory

| Path | Action |
| --- | --- |
| `scripts/phase-f-bounded-exercise.ts` | deleted |
| `scripts/phase-f-m6-one-case-diagnostic.ts` | added |
| `src/ai/phase-f-bounded-experiment.integration.test.ts` | deleted |
| `src/ai/phase-f-m6-one-case-diagnostic.integration.test.ts` | added |
| `src/ai/phase-f-bounded-experiment.postgres.integration.test.ts` | deleted |
| `src/ai/phase-f-m6-one-case-diagnostic.postgres.integration.test.ts` | added |
| `scripts/verify-ai-architecture.ts` | mechanical exact runner path/hash/import/change-budget and mutation-source replacement |
| this report and adjacent sidecar | packaging only |

The implementation delta is `633 insertions / 1,289 deletions` across the seven Product/test/checker paths. Phase F executable count remains two: bootstrap plus the one-case diagnostic. No Product `src` runtime, UI/API/route, Prompt/config service, adapter, orchestrator, repository, Worker, Domain Service, Schema/Migration, dependency/lockfile, pricing, SEO, Apply/Publish/Index, control or ADR path changed.

## 4. Implemented fixed contract

- No CLI input; `process.argv.length !== 2` fails before preflight query or Provider construction.
- Exact database `cwt_phase_f_synthetic_20260826_k1`; exact `APP_ENV=staging`, `FEATURE_AI=true`, PostgreSQL requirement.
- Exactly `product_description_draft` / `product_draft` / `en` / `concise_professional_b2b`; zero selected media.
- Exact reviewed brief, fixture ID/hash, Prompt V1/hash, DeepSeek Provider/model and envelope identity.
- Fixed idempotency UUID `702a422b-4bee-4130-bd8b-8f39c6e90528`.
- One read-only preflight requires the unique Synthetic Admin, unique named Draft Product/localization/version 1, exact primary category, one ready public/public-partition Asset, zero Content/authors/runs, unused idempotency key, enabled database AI flag and the exact active/default version-2 config.
- The prepared-run authority rechecks actor/target/source, config ID/version, `{temperature:0}`, `16000/200`, `maxAttempts=1`, `20000` microusd cap, Prompt and Provider envelope.
- Exactly one `requestDraftAssistance`, one returned run ID, one Worker with `slotCount=1`, and terminal polling for that row alone. Re-entry is rejected before dispatch once any run exists or the idempotency key is used.
- Safe stdout is limited to `status`, `runId`, `attemptCount`, `publish:false`, and `index:false`.

## 5. Verification

### Focused static and adapter/orchestrator

- One-case static/architecture focused suite: PASS, `6/6`.
- Final combined one-case + sanitized adapter + claimed-execution propagation suite: PASS, `3 files / 74 tests`.
- Existing sanitized adapter closed 11-code behavior remains unchanged; no raw Provider-controlled content is introduced.
- Clean architecture checker: PASS, `ok:true`, seven Phase F runtime-authority mutation probes fail closed, protected-boundary control preserved.

### Disposable PostgreSQL composition

- Cached `postgres:17-alpine` proved exact PostgreSQL `17.10`: PASS, `2/2`.
- Cached `postgres:18.4` proved exact PostgreSQL `18.4`: PASS, `2/2`.
- Fake-Provider success produced exactly one `draft_ready` row, one dispatched attempt, complete usage/cost, candidate present, one enqueue Audit, zero Apply Audit, and unchanged Product/localization/Asset rows.
- Fake `cwt_response_usage_shape` produced exactly one failed attempt with `invalid_response / output_schema_invalid`, fixed sanitized code, null usage, `actual_cost_complete=false`, conservative `7304`-microusd accounting, zero reservation and no candidate.
- A second executable entry after the first row failed in preflight and did not create a second row or fake call.

### Final quality gates

- ESLint: PASS, zero warnings.
- TypeScript `tsc --noEmit`: PASS.
- `git diff --check`: PASS.
- Full Vitest, run exactly once after focused PASS: `127 files passed / 11 skipped; 872 tests passed / 76 skipped`.
- Next build, bundle and E2E: NOT RUN; no affected public/build path and not required by the authorization.
- `pnpm audit`: NOT RUN; prohibited network/non-dependency gate.

## 6. Preservation and no-run evidence

- Bootstrap SHA-256 remains `21b15c2fe90488664e087fd0bcf7f7b077ec1d4dce99f36e74a5c55dea95b3ee`.
- Sanitized DeepSeek adapter SHA-256 remains `38e6c44965c7fa612b47c02227c13cb92d906868a90f43eade28403de05c740c`.
- `package.json` / `pnpm-lock.yaml` remain `7fac662d864eb10703abb3d80eeec16bd48731ce43ce2b4240f3c57019e88943` / `fd9f24c7cc27d2faff8d08f98f815ac60876c45d4b51f32b81118da2e6b40266`.
- Final diagnostic runner SHA-256: `c514c3e5d81074911dae1b9b21580f9cf8ab0b1065eb24b490d9b9124fe78ffe`.
- No real Provider, external network, credential, K1 operational environment, formal Product data, provisioning, Publish or Index action occurred.
- Both task-owned PostgreSQL containers were force-removed after verification; final absence was checked. No task process or temporary test artifact remains.

## 7. Rollback, residual risk and next gate

Code rollback is the exact parent HEAD/tree `c85304cec59aa59364d221cc2c2a56016d2161d8` / `0143158aba6ef600076277899bba9116fc0af732`. No database rollback is needed because only disposable local fixtures were used and removed.

Residual risks are bounded: the runner has not observed a real Provider response; generated K1 UUID bindings remain later provisioning evidence; current compiled pricing still requires a later realtime freshness HOLD check. This Candidate does not close the historical M6 finding and is not operational authority.

Next and only gate: **Fresh Independent Product Code/Security Review of the exact immutable Candidate.** K1 provisioning/control work does not start from this completion.
