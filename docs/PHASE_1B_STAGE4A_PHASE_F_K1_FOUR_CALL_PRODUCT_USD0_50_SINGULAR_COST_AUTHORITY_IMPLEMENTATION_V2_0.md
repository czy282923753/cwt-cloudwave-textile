# CWT Phase F K1 Four-Call Product + USD0.50 Singular Cost Authority Implementation V2.0

Date: `2026-08-27`

Classification: **`PRODUCT_IMPLEMENTATION_CANDIDATE / NOT INDEPENDENTLY REVIEWED / NOT ACCEPTED / NO OPERATIONAL AUTHORITY`**

## 1. Outcome and authority boundary

The private K1 Product diagnostic is now one fixed, no-argument, exactly-four-planned-call `product_description_draft` batch. It consumes one credential record from stdin into process memory, uses one accepted Provider registry/service/Worker with `slotCount=1`, dispatches the four fixed idempotency UUIDs sequentially, and proves the completed prefix and final accounting before every later enqueue.

The former `20,000`-microusd Product hard ceiling has been replaced by one `500,000`-microusd authority across Schema, config service/resolver, claimed-run validation, fixed bootstrap config and runner authority. Forward Migration `0021` changes only the config default and the two named checks. The existing repository settlement implementation is byte-identical.

This Candidate does not authorize Control V2, live K1 access, credential use outside offline fake tests, Provider/network calls, provisioning, external execution, Production, Push/Deploy/Publish/Index, formal data, Phase F acceptance or phase advancement.

## 2. Authoritative inputs and immutable ancestry

- Product parent HEAD/tree: `b80379d0b72e878a62edaf9fbfdbbc808a646c22` / `2fb7b4c622865c45323967b0a8153a50864bd817`.
- Branch: `codex/phase-f-minimal-experiment-v1`.
- Design V2.0 SHA-256: `08ced7ff89bfe929aff91f818b14cf9e2300e1bfb58678853269e042f3c4f0ce`.
- Superseding Design V2.1 SHA-256: `ee461ffad7e98c3501c37de291959c74a9e3d71b4c09d2b1d8da91f0f048b3d2`.
- Fresh Independent V2.1 Design PASS SHA-256: `baaca2f12c45c83f4536fb2971aff8a010f6f4877006e945c552ac170dbef1a1`.
- Implementation commit/tree: `d48c1107a4a85837784ab30c575c8d99ed160fb0` / `51452c5aaf33fe1ecbefe3e90ca90cb2d4a05fbd`.
- Linear ancestry: `d48c1107...` has exact parent `b80379d0...`; no amend, rebase, rewrite or earlier-byte mutation occurred.
- The final report-packaging commit/tree cannot be embedded self-referentially in its own report bytes. Its exact identity is emitted in the mandatory Coordinator callback.

## 3. Exact mutation budget

The implementation commit changes exactly the 19 authorized Product/test/gate paths:

- Runtime/Schema: `src/db/schema/ai.ts`, `src/ai/config/model-config-service.ts`, `src/ai/config/model-config-resolver.ts`, `src/ai/internal/claimed-run-authority.ts`, `scripts/phase-f-bounded-bootstrap.ts`, `scripts/phase-f-m6-one-case-diagnostic.ts`.
- Migration metadata: new `drizzle/0021_phase_f_k1_run_cost_ceiling.sql`, new `drizzle/meta/0021_snapshot.json`, appended `drizzle/meta/_journal.json`.
- Focused tests: the seven authorized Schema/config/claim/repository/runner test paths.
- Mechanical gates: `scripts/verify-ai-architecture.ts`, `scripts/verify-ai-foundation-candidate.ts`, `.github/workflows/ci.yml`.
- Packaging: this report and its adjacent sidecar only.

Implementation diff: `10,345 insertions / 411 deletions`; `9,991` added lines are the generated Drizzle snapshot. No migration/snapshot from `0000` through `0020` changed. No repository runtime, orchestrator, adapter, Prompt, output classifier, config repository, Worker, public Product path, business Domain Service, dependency, lockfile, pricing, Control or live-state path changed.

## 4. Fixed four-call Product contract

- Exact immutable UUID order: `702a422b-4bee-4130-bd8b-8f39c6e90528`, `0b197c05-6005-4e3d-98a3-72f811f85a46`, `07cd0500-39fa-4952-a3fe-7bcb8121edae`, `33dec4ca-9690-44bb-8aba-ecc1978970da`.
- One Synthetic actor/config/Draft Product, expected target version `1`, locale `en`, exact Prompt V1/hash, `deepseek-v4-flash`, `{temperature:0}`, `16000/200`, `maxAttempts=1`.
- No CLI input, selector, fifth key, second use case, retry, requeue, fallback, alternate runner, public export or environment credential read.
- Credential input is a single closed stdin record of at most 512 bytes. NUL/newline/CR and empty input fail before Product work; mutable input and retained credential buffers are cleared.
- Before every enqueue, the runner requires the exact completed fixed-key prefix, no other row, exact actor/target/config/version/provider/model binding, one final attempt per prior row, zero reservation and readable final accounting.
- The conservative next-call predicate is `sum(max(accounted, actual, incomplete ? 7,304 : 0)) + 7,304 <= 500,000`. Fixed four-call planned upper cost remains `29,216` microusd.
- Ordinary/content/schema/Provider terminal failure consumes its key and continues because the stop set is closed to authentication, quota, `run_cost_limit_exceeded`, cancellation or inability to prove the prefix/control boundary. No consumed key is revisited.
- Safe stdout contains only bounded status/count, ordinal, run ID, attempt count and `publish:false` / `index:false`; it contains no credential, header, request/response body, candidate or raw JSON.

## 5. Singular cost authority and settlement behavior

- `500,000` is the only Product maximum in the authoritative Schema/service/resolver/claimed-run/bootstrap/runner path.
- USD `0.05` / `50,000` is absent from authorization predicates and test oracles. Existing lower explicitly configured values remain valid for general Product behavior.
- Schema, service, resolver and claimed-run focused proofs accept `500,000` and reject `500,001`.
- Repository settlement with a complete protected candidate preserves `draft_ready` and candidate evidence at `50,001` and `500,000` microusd.
- Settlement at `500,001` records truthful complete actual/accounted cost, removes the candidate, sets `run_cost_limit_exceeded`, and the runner's closed stop rule prevents any later dispatch.
- Missing/invalid usage remains incomplete, absent from actual-cost arithmetic and conservatively accounted at no less than `7,304`; Provider invoice truth remains explicitly unknown.
- Existing daily USD `5` hard limit and monthly policies are unchanged.

## 6. Migration proof

`0021_phase_f_k1_run_cost_ceiling.sql` performs only:

1. Drop/re-add `ai_model_config_limits_check` with maximum `500000`.
2. Set `ai_model_config.run_cost_limit_microusd` default to `500000`.
3. Drop/re-add `ai_runs_environment_budget_policy_check` with maximum `500000` for Staging and local/test.

There is no row/data rewrite, compatibility branch or downgrade path. Generated snapshot `0021` points to `0020`, the journal contains exactly the append at index `21`, and the foundation gate verifies the exact names/default/checks while rejecting DML. Fresh task-owned cached PostgreSQL `17.10` and `18.4` databases applied the full migration chain through `0021`; all `0000..0020` migration and snapshot Git objects remained unchanged.

## 7. Verification

### Focused and static

- Runner static + architecture suite: PASS, `6/6`.
- Resolver + claimed-execution + runner static group: PASS, `3 files / 29 tests`.
- Config service and repository suites on PostgreSQL 17.10 and 18.4: PASS; final repository boundary run `14/14` on each engine.
- Four-call runner composition on PostgreSQL 17.10 and 18.4: PASS, `3/3` on each engine.
- Fake valid response: exactly four sequential calls/rows, one attempt each, fixed bindings, `draft_ready`, candidate retained, no Apply/Publish/Index or Product/public mutation; re-entry fails before dispatch.
- Fake sanitized invalid usage/schema response: exactly four consumed rows, no retry, null usage, incomplete actual cost, `7,304` conservative accounting and no candidate; later fixed slots continue.
- Fake authentication response: exactly one consumed row and no later call.
- Existing sanitized 11-code adapter/propagation behavior remained covered by the full suite; no raw Provider-controlled content was introduced.

### Final gates

- Exact architecture checker: PASS, `ok:true`, seven runtime-authority mutation probes and protected-boundary control preserved.
- AI foundation candidate gate: PASS, including design identity, historical artifacts, exact `0021` journal/snapshot/checks and no DML.
- ESLint: PASS, zero warnings.
- TypeScript `tsc --noEmit`: PASS.
- `git diff --check`: PASS.
- Full Vitest after focused PASS: `127 files passed / 11 skipped; 873 tests passed / 78 skipped`.
- Next build and E2E: NOT RUN; no affected public/build path and explicitly not required.
- `pnpm audit`: NOT RUN; no dependency delta and network use was prohibited.

Implementation iteration was fail-closed and local: an initially unpinned architecture invocation, disposable-database credential typo, invalid test-only fingerprint fixture, exact typed error-code expectation and auth stop-code expectation were corrected before the immutable implementation commit. Every affected focused gate was rerun to PASS; no strictness or Product boundary was weakened.

## 8. Preservation hashes and cleanup

- Bootstrap SHA-256: `1d33249db3eb6a2e89b3c69226d371102395b63f04d9f0d96afd204cc9d295a7`.
- Four-call runner SHA-256: `a50acdaf737f9e0f70d58b8c4ee2339c6a5c0d8bfffad6ebec6444a1e06155bf`.
- Unchanged repository runtime SHA-256, parent/final: `afb6f99090d7d86b7e8d13cbe11094eca50ec054124b8a3d719b3d343487f933`.
- Unchanged `package.json` SHA-256, parent/final: `7fac662d864eb10703abb3d80eeec16bd48731ce43ce2b4240f3c57019e88943`.
- Unchanged `pnpm-lock.yaml` SHA-256, parent/final: `fd9f24c7cc27d2faff8d08f98f815ac60876c45d4b51f32b81118da2e6b40266`.
- Migration SQL SHA-256: `ac7c520f6a8462466ccfa3e74002c6be87dcadd5826e6d51a5859f56ad1f005c`.
- Snapshot SHA-256: `b9b6b458f47f686898ae4d5f56f56573005a5afb950894aa7abf064eab8baaea`.

No real credential, Provider, network, live K1, provisioning or external action occurred. The task-owned PostgreSQL 17.10 and 18.4 containers and their anonymous volumes were removed; their exact absence was checked. No task-owned test process or temporary state remains.

## 9. Rollback, residual risk and next gate

Code rollback is the exact immutable parent `b80379d0b72e878a62edaf9fbfdbbc808a646c22` / `2fb7b4c622865c45323967b0a8153a50864bd817`. Disposable migration state was destroyed. No live database downgrade or data rewrite is authorized or required by this Candidate.

Residual risk remains operational: fake responses cannot establish real Provider behavior or invoice truth; Control V2 and live K1 disposition remain out of scope; the four-call cap depends on later operator isolation and the already accepted credential/egress controls. These are not Product implementation defects and this report does not self-accept the Candidate.

Next and only gate: **Fresh Independent Product Code/Security + Migration Review of the exact immutable Candidate.**
