# CWT Phase 1B Stage 6 S6-04 B-04 Reproducible-Image Technical Disposition and Planning Amendment Candidate V1.1

Status: **TECHNICAL LEAD REMEDIATION CANDIDATE — F-01 CLOSED AT PLANNING LEVEL; fresh independent planning re-review required; not implementation authorization, Owner presentation or acceptance**

Date: **2026-08-31**

Required Candidate parent: `75be4d9689be85c2c18d762f44a300fe93c3b40d` (V1.0 tree `d77e13ffa67c663a85c1b238a244d13889d8e4aa`; sole parent `de40457e2e99d118915998ed57be33257512c0df`)

Failed independent Review, sibling evidence only: `a1a4321ae9741f51dd026ca854b7d6d829390dea` (tree `6ccaf83f0396ea9a765a1a86e3371a0a8623cc88`; sole parent `75be4d9689be85c2c18d762f44a300fe93c3b40d`; excluded from this Candidate's ancestry)

Accepted implementation checkpoint: `de40457e2e99d118915998ed57be33257512c0df`

Read-only Implementer worktree: `/Users/calvin/.codex/worktrees/39c0/CWT（CloudWave Textile）项目`

Authority boundary: **Stage 6 planning/remediation only. `OD-B04-01` must not be presented to the Owner until this V1.1 receives a fresh independent `PASS`. Stage 7 remains HOLD and requires a new explicit Owner authorization.**

## 1. Disposition

This V1.1 preserves every substantive V1.0 conclusion accepted by the failed Review, including the BuildKit timestamp diagnosis, Next entropy diagnosis, secret classification, `OD-B04-01`, Options A–E, and `B04-D1`, `B04-D2`, `B04-D4`, and `B04-D5`. It supersedes only the failing runtime-artifact boundary in `B04-D3`, V1.0 §6.2/§6.3 runtime assertions, affected scope, rollback/stop wording, and the related Security & Test Simplification Check.

The selected F-01 correction is **Option A: direct Node `24.14.0` with exact-pinned `tsx@4.23.1` at runtime, with pnpm `11.9.0` retained as build tooling only**.

The correction has four indivisible parts:

1. every Worker and one-shot TypeScript entry converges from top-level `await` to one explicit `async main()` and terminal error handling;
2. the Worker additionally awaits `worker.join()`, routes `SIGINT`/`SIGTERM` through the existing awaited `worker.stop(signal)` boundary, and exits only after the join/stop outcome is known;
3. Compose and both crontabs invoke the exact Node/`tsx` command directly; no runtime command invokes pnpm or Corepack; and
4. pnpm/Corepack/npm/npx executables and both pnpm timestamp-state files are absent from the runtime image, while the exact `tsx` package and its runtime dependency graph remain.

This is Root Cause First: it removes the package manager from role startup and repairs the source-level CommonJS/top-level-`await` defect. It is Simplification First: no metadata normalization, writable package directory, install-on-start, wrapper, precompiler, bundler, sidecar or fallback is introduced. It is Replace Not Layer: the direct Node role entry replaces runtime pnpm; both cannot remain live.

No Schema/Migration, persistent state, product/domain authority, Provider, credential, network service, public URL, SEO, storage, Rate Limiter, database topology or commercial direction changes. This bounded correction does **not** independently require an Owner decision or ADR. `OD-B04-01` remains separately required for the accepted Next key/reproducibility conflict and is neither answered nor weakened here.

## 2. One-to-one closure of Review F-01

| F-01 element | V1.1 closure | Decisive evidence/gate |
| --- | --- | --- |
| V1.0 deletes pnpm state while roles launch through pnpm | Runtime pnpm/Corepack is removed; Compose/crontabs use direct Node + `--conditions=react-server --import=tsx`; both pnpm state files remain deletable build residue under the new boundary. | Both files and `/opt/pnpm/pnpm` absent; exact `tsx@4.23.1` present; all selected role commands run read-only on both architectures without install/recreation. |
| Worker/outbox/cleanup top-level `await` fails under current `tsx` CommonJS output | Four operational scripts use explicit `async main()`; all terminal rejections are surfaced; database-owning one-shots close in `finally`; cleanup preserves exit `2` for durable dead results. | Both architecture builds pass Next TypeScript; six Production/Staging one-shots per architecture exit `0` on empty isolated fixtures; injected dependency failure exits nonzero. |
| Worker liveness depends incidentally on an open PostgreSQL handle | Worker awaits `join()` after `start()` and centralizes signal-stop failure into the terminal promise; terminal success/failure uses explicit process exit only after the Worker outcome. | Enabled-Staging/Synthetic-PostgreSQL Worker remains running, then `SIGTERM` drains and exits `0` on both architectures; wrong database credential exits `1` promptly on both. |
| Runtime-role proof covered only four examples | The exact Web, Worker, both Scheduler supervisors, and all three one-shots in both Production and Staging schedules form a closed allowlist. | §4 and §7 cover every current `compose.yaml` and `deploy/schedule` role/command on `linux/amd64` and `linux/arm64`. |
| V1.0 §6.2/§6.3 and rollback/stop text still assume pnpm runtime | §§8–10 replace those assertions and prohibit pnpm runtime restoration. | Fresh re-review must reject any runtime `pnpm`, metadata recreation, second launcher or relaxed equality claim. |

No part of the failed Review is edited or absorbed. V1.0 remains immutable audit history rather than an alternate current package.

## 3. Options evaluated

### 3.1 Option A — selected: direct Node + exact pinned `tsx`

Benefits:

- uses the already installed `tsx@4.23.1` and Node `24.14.0`; no new package or custom compiler;
- eliminates pnpm's runtime dependency-status/install behavior and its two time-bearing state files;
- retains the same TypeScript entry source, one Domain/Worker authority and current error codes;
- works on the exact built glibc artifacts for both supported architectures; and
- makes runtime mutation structurally unnecessary under read-only root filesystems.

Costs:

- `tsx@4.23.1` becomes an explicit Production dependency and runtime supply-chain member;
- the exact `react-server` condition is mandatory because the operational closure imports `server-only`; and
- source-level main/error convergence and focused signal/exit tests are required.

These costs are bounded and already implicit in the former pnpm scripts. Making them explicit is lower risk than retaining package-manager state at runtime.

### 3.2 Option B — rejected: retain and normalize pnpm metadata

An unnormalized fresh image with both pnpm files present can run `pnpm outbox:process` read-only. That does not satisfy reproducibility: two no-cache builds generated different contents solely through runtime state:

| File | Build 1 | Build 2 |
| --- | --- | --- |
| `.modules.yaml` | SHA-256 `e497a164...`; `prunedAt=Sun, 30 Aug 2026 17:56:57 GMT` | SHA-256 `0b3e0c33...`; `prunedAt=Sun, 30 Aug 2026 17:59:08 GMT` |
| `.pnpm-workspace-state-v1.json` | SHA-256 `18ac5fb3...`; `lastValidatedTimestamp=1788112617415` | SHA-256 `5fb56e57...`; `lastValidatedTimestamp=1788112748491` |

A narrow diagnostic normalization to the accepted source epoch (`1788103897000`) was then tested. Exact pnpm `11.9.0` treated the normalized state as requiring dependency validation, invoked implicit `pnpm install`, and failed on the read-only image with `EROFS` (pnpm inner exit `226`). A future-dated value or format-specific mutation would make an undocumented pnpm internal freshness heuristic part of CWT runtime authority. Retaining pnpm would also retain Corepack/pnpm code and duplicate the direct Node capability already available.

Option B is therefore rejected under Simplification First and reproducibility, even though a newly generated, still-fresh unnormalized state can temporarily start.

### 3.3 Option C — rejected as unnecessary: precompiled operational artifact

Option A satisfies the exact build/runtime boundary. A separate compiler output, custom bundler, wrapper or duplicated compiled/source entry would add artifact authority, source-map/release-proof work and rollback complexity without solving an unmet need. If Option A later fails an independently reproduced mandatory gate, implementation stops and returns for a new reviewed plan; Option C is not a fallback.

Custom RESP clients, sidecars, HTTP compatibility layers, build-gate suppression and writable runtime package stores remain prohibited.

## 4. Closed role-entry allowlist

The deployment verifier must parse exact array/tokens, not substring-match them.

| Role | Sole deployed command |
| --- | --- |
| Web, Production and Staging | `node .next/standalone/server.js` |
| AI Worker role entry | `node --conditions=react-server --import=tsx /app/scripts/process-ai-runs.ts` |
| Production Scheduler supervisor | `supercronic -passthrough-logs /app/deploy/schedule/production.crontab` |
| Staging Scheduler supervisor | `supercronic -passthrough-logs /app/deploy/schedule/staging.crontab` |
| Production outbox one-shot | `/app/deploy/schedule/run-one-at-a-time.sh production node --conditions=react-server --import=tsx /app/scripts/process-notification-outbox.ts` |
| Production cleanup one-shot | `/app/deploy/schedule/run-one-at-a-time.sh production node --conditions=react-server --import=tsx /app/scripts/process-object-cleanup.ts` |
| Production retention one-shot | `/app/deploy/schedule/run-one-at-a-time.sh production node --conditions=react-server --import=tsx /app/scripts/enforce-retention.ts --execute` |
| Staging outbox one-shot | `/app/deploy/schedule/run-one-at-a-time.sh staging node --conditions=react-server --import=tsx /app/scripts/process-notification-outbox.ts` |
| Staging cleanup one-shot | `/app/deploy/schedule/run-one-at-a-time.sh staging node --conditions=react-server --import=tsx /app/scripts/process-object-cleanup.ts` |
| Staging retention one-shot | `/app/deploy/schedule/run-one-at-a-time.sh staging node --conditions=react-server --import=tsx /app/scripts/enforce-retention.ts --execute` |

`run-one-at-a-time.sh` remains only the already-scoped single-lock overlap guard. It must continue to `exec`/invoke the exact supplied command once, preserve its exit status, remove its `/tmp` lock by trap, and add no retry, install, fallback or command selection. Root `package.json` scripts may remain developer/build aliases to the same Node tokens, but pnpm is absent from the deployed image and those aliases are not a second runtime entry.

The current AI capability boundary is unchanged. `createPhaseDAiRunWorkerV1` permits enabled Staging only. Therefore:

- the positive local artifact smoke uses isolated Synthetic PostgreSQL, `APP_ENV=staging`, `FEATURE_AI=true`, zero queued work and zero Provider calls;
- `APP_ENV=production` and disabled Staging are mandatory negative controls that exit `1` with the existing capability refusal; and
- this amendment makes no Production AI activation/readiness claim. If S6-04 attempts to make a prohibited profile healthy by widening the AI environment boundary, it stops for separate architecture/Owner disposition rather than modifying that boundary here.

## 5. Exact implementation ownership

This is an executable plan, not implementation. After all prior gates in §12, one Implementer changes the following as one replace-not-layer slice:

| Path | Bounded change | Focused verification |
| --- | --- | --- |
| `package.json` | Move exact `tsx` `4.23.1` from `devDependencies` to `dependencies`; make the four operational aliases use the exact Node tokens in §4. No new dependency. | exact dependency/version assertion; no runtime alias contains another launcher |
| `pnpm-lock.yaml` | Move only the root importer classification for `tsx`; retain the same resolved `tsx@4.23.1` and transitive identities. | frozen install; exact lock diff; supply-chain policy |
| `scripts/process-ai-runs.ts` | One explicit `async main`; create the existing Worker once; signal-aware idempotent `stop`; await `start` then `join`; surface stop/join rejection; explicit terminal exit after the outcome. No direct database import or business logic. | SIGINT/SIGTERM drain; join rejection; bad-database exit `1`; exact sole composition import; no lost lock |
| `scripts/process-notification-outbox.ts` | Move existing flow into `async main`; retain one transport and one delivery call; close database in `finally`; terminal catch sets exit `1`. | zero-work success; delivery failure nonzero; close exactly once |
| `scripts/process-object-cleanup.ts` | Move existing recovery/import-expiry/cleanup sequence into `async main`; close database in `finally`; preserve dead-result exit `2`; terminal failure exit `1`. | zero-work success; dead/failure codes and call order unchanged |
| `scripts/enforce-retention.ts` | Retain the existing explicit main/`--execute` semantics and `finally` close; add terminal catch/exit `1`. | preview/execute distinction; failure nonzero; close exactly once |
| `compose.yaml` | Replace both Worker `pnpm` arrays with the exact Worker command; do not add an entrypoint, shell, retry or fallback. Web/Scheduler arrays remain exact. | parsed Compose command allowlist; no complete `pnpm` token in any app role |
| `deploy/schedule/production.crontab`, `deploy/schedule/staging.crontab` | Replace all six pnpm command tails with the exact Node one-shot tokens; retain schedules and environment lock wrapper. | exact six-row allowlist; Supercronic parse; environment mismatch/overlap exits preserved |
| `Dockerfile` | Keep pnpm/Corepack only in build stages; copy no pnpm/Corepack executable or `PNPM_HOME` into runtime; remove the Node base's bundled Corepack/npm/npx executable/module surfaces after build assertions; delete both pnpm state files after all build-stage pnpm commands; retain exact `tsx` graph; keep accepted Next/trace/compile-cache cleanup. | exact stage/file inventory; Node/tsx module resolution; no package-install binary/state in runtime |
| `src/ai/runs/worker-shutdown.integration.test.ts` | Extend the existing test to assert `join`, terminal signal/error behavior and the unchanged sole composition root/no-direct-database boundary. | real local PostgreSQL focused test; both signals; no residual advisory lock |
| `scripts/verify-ai-architecture.ts` | Preserve the immutable historical S2.5 Worker hash; update only the current Worker protected hash after review; retain exact sole CLI root edge. | historical hash still validates; current hash and graph pass; mutation probes remain fail-closed |
| `test-fixtures/ai-architecture/graph-faults.phase-d.synthetic-only.v1_0.json` | Classify only `deploy/scripts/preflight-compose-graph.mjs`, `deploy/scripts/preflight-image.mjs`, `deploy/scripts/preflight-proxy-config.mjs` and `deploy/scripts/preflight-proxy-ranges.mjs` as `other-project-tooling`; update profile integrity/hash bindings mechanically. Do not add `deploy/` as a broad directory selector or any capability exception. | exact four paths, 12 classes unchanged, zero ambiguity/unclassified nodes, no Product/AI capability edge |
| existing S6-04 deployment verification authority and `docs/ENVIRONMENT_AND_DEPLOYMENT.md` | Assert the exact command/file/runtime matrix in §§4, 6 and 8; document pnpm as build-only. Do not create a second proof framework. | first-divergence/equality gate plus role matrix; docs match executable allowlist |

No other source path is authorized by this amendment. If a new runtime module, service, state, Schema/Migration or architecture change is needed, stop.

## 6. Runtime artifact and residue boundary

### 6.1 Runtime-required files

The exact release artifact must retain:

- Node `24.14.0`, Supercronic `0.2.48`, the accepted Debian/glibc base and architecture-specific native packages;
- Next standalone/runtime/static/public output required by Web;
- the four operational TypeScript entries and their reachable `src/**` modules;
- root `package.json` and `tsconfig.json` needed for module classification and `@/*` path resolution;
- the installed `node_modules` link graph required by those entries, including exact `tsx@4.23.1`; and
- both crontabs and `run-one-at-a-time.sh`.

The implementation-time tracer inventories the complete reachable regular files and symlink targets separately per architecture. A missing or wrong-architecture native file is a stop condition.

### 6.2 Build-only/deletable residue

After every owning build command completes, the release image must omit:

- Corepack, npm, npx and pnpm executable/module surfaces, `COREPACK_HOME`, `PNPM_HOME` and a pnpm-added `PATH` segment;
- `node_modules/.modules.yaml` and `node_modules/.pnpm-workspace-state-v1.json`;
- `.next/cache`, `.next/trace`, `.next/trace-build`; and
- `/tmp/node-compile-cache`.

It must not create a writable `/app`, `/app/node_modules`, package cache or source-tree mount to compensate. Only the already-authorized role tmpfs/mounts remain. Runtime proof occurs after cleanup, from the exact built image.

## 7. Disposable prototype result

The Technical Lead used only disposable copies/local containers. The Implementer worktree remained read-only; no Provider, protected environment, account, credential, real file or target was accessed.

### 7.1 Selected Option A builds

Both no-cache builds used Node `24.14.0`, pnpm `11.9.0` as build tool, Next `16.2.12`, exact `tsx@4.23.1`, the pinned Debian/glibc base and Supercronic hashes. Next Turbopack compilation and TypeScript passed.

The full no-cache application builds first produced:

| Platform | Base prototype manifest | Config |
| --- | --- | --- |
| `linux/amd64` | `sha256:8a6fdee5a931dfbe24df6faff7b752dc1cb4327bb19a03127dd3170792ff66f3` | `sha256:f800ced617175e0c43877df3a058ef0bc603ddd04be44c2944bd97ed4233f175` |
| `linux/arm64` | `sha256:e6219d6bb2b64a363a8d1a3eff50e5ad74ade31035e1efe84477912a7ec6ce6e` | `sha256:274cd3c22b2c7dcf97e8cd66b40ee9540aaaf106f950a8ecaf64e3c2060544ab` |

The Node base was then challenged and found to contain bundled Corepack/npm even though no role invoked them. A disposable final hardening layer removed those package-install surfaces and reran the complete role matrix:

| Platform | Hardened runtime manifest | Config | Artifact assertions |
| --- | --- | --- | --- |
| `linux/amd64` | `sha256:87b310b408ecec4845fa4915d28d65a4b8c0d7a2df5f82694704625cfd78188f` | `sha256:ce7f688f571b55280ae04723bf141899bfc94526317bc3c3bf369c30f46706d6` | Node/Supercronic exact; Corepack/npm/npx/pnpm absent; both pnpm state files absent; exact tsx graph present |
| `linux/arm64` | `sha256:cb10ad28e083afc808810ff744869fa40aa669c47992e457faee5b2633f7fab4` | `sha256:2f046209b55bb366e6d8e709edaa6ff8871870846b5e060dab1716e042cbd2e4` | same; correct native architecture loaded |

These are diagnostic artifacts, not release Candidates and not reproducibility proof. V1.0's Next key/Owner-decision stop remains.

### 7.2 Exact role matrix

| Case | `linux/amd64` | `linux/arm64` | Expected meaning |
| --- | --- | --- | --- |
| Production Web `/robots.txt` | HTTP `200`; non-root/read-only | HTTP `200`; non-root/read-only | positive; SIGTERM ended by normal signal status `143`, not OOM/forced kill |
| Staging Web `/robots.txt` | HTTP `200`, noindex response | HTTP `200`, noindex response | positive; same signal behavior |
| enabled-Staging Worker on isolated PostgreSQL, zero jobs | running, SIGTERM drain exit `0` | running, SIGTERM drain exit `0` | positive role-entry/signal proof; zero Provider calls |
| wrong PostgreSQL credential | prompt exit `1` | prompt exit `1` | fail closed; no hanging database handle |
| Production Worker / disabled-Staging Worker | exit `1` / exit `1` | exit `1` / exit `1` | existing capability refusal; not a Production activation defect claimed fixed here |
| Production and Staging Supercronic supervisors | both parse/start; SIGTERM exit `0` | both parse/start; SIGTERM exit `0` | exact crontabs and supervisor |
| Production outbox/cleanup/retention one-shots | `0` / `0` / `0` | `0` / `0` / `0` | isolated empty database/storage/secrets; no external delivery |
| Staging outbox/cleanup/retention one-shots | `0` / `0` / `0` | `0` / `0` / `0` | same |

Focused real-local-PostgreSQL Worker shutdown tests passed `3/3`. One initial direct-Node diagnostic without `--conditions=react-server` correctly failed on `server-only`; the exact condition in §4 is therefore mandatory, not cosmetic.

### 7.3 Option B contrast

Two unnormalized no-cache `linux/amd64` Option B images differed (`sha256:050ec7d4...` versus `sha256:49340f19...`) and contained the time-bearing pnpm state values in §3.2. Fresh unnormalized state ran read-only, but deterministic source-epoch normalization triggered implicit install and read-only `EROFS`. This closes the comparison without inventing a supported pnpm normalization guarantee.

## 8. Superseding evidence contract

V1.0 §6.1, OCI equality, Next/key change-control and SBOM/provenance/scanning obligations remain unchanged. The following text replaces the runtime-related portions of V1.0 §6.2 and §6.3.

### 8.1 Exact image equality additions/replacements

Both clean-cache dual-architecture proof runs must additionally match exactly on:

- `package.json`, `pnpm-lock.yaml`, the four operational entry sources, both crontabs and the parsed command allowlist;
- the exact `tsx@4.23.1` runtime package and all reachable file/symlink/native identities;
- absence of Corepack/npm/npx/pnpm runtime executable/module surfaces and pnpm environment, both pnpm state files, all previously accepted Next/Node residue and any undeclared cache; and
- the full runtime-required file inventory in §6.1.

The role-entry correction introduces no runtime-generated file. The two clean-cache builds still must be byte-identical at OCI index, manifest, config, layer/diff-ID and unpacked metadata levels after the separately reviewed `OD-B04-01` treatment. Equality is never claimed merely because the role matrix passes.

### 8.2 Runtime proof after cleanup

For each exact `linux/amd64` and `linux/arm64` image produced by the two-run evidence sequence:

1. assert non-root UID/GID, read-only root, declared tmpfs/mount allowlist and absence of Corepack/npm/npx/pnpm/state files before startup;
2. run both Web environment profiles to readiness and exercise the accepted representative public/admin behavior;
3. run the enabled-Staging Worker against pinned local PostgreSQL with zero queued work and a network-deny/no-Provider harness; exercise `SIGINT` and `SIGTERM`, join/drain, clean exit and residual-lock checks;
4. run wrong/unavailable PostgreSQL and malformed protected configuration negative cases; require bounded nonzero exit without install, retry wrapper or writable residue;
5. run both Scheduler supervisors, parse both crontabs, signal them, and execute every six one-shot rows with isolated environment-specific local databases/storage/secrets;
6. assert exact outbox/cleanup/retention success/failure/dead exit codes and database-close semantics; and
7. compare before/after image/container file inventories. Changes are permitted only in declared tmpfs or explicit data/log mounts; `/app`, source, `node_modules` and package-manager state remain unchanged.

Production and disabled-Staging Worker refusals are negative authority controls. They are not substituted for the enabled-Staging positive entry proof and are not described as Production readiness.

### 8.3 Build, bundle and AI gates

The implementation gate remains:

- exact frozen install and Next `16.2.12` Turbopack build;
- typecheck, zero-warning lint, `check:bundle`, accepted public/client dependency checks and GLIDE/native deployment proof;
- focused operational main/exit tests and real-local-PostgreSQL Worker shutdown tests;
- the accepted AI architecture checker with the immutable historical S2.5 hash unchanged, the new current Worker hash exact, and only the four exact deployment preflight scripts classified as build-only project tooling; and
- the full repository gate through the already reviewed Stage 6 AI accepted-ancestor/checkpoint authority path, with no sole-parent workaround, skip or suppression.

Any gate failure is reported at its real cause. No broad allowlist, hash wildcard or historical evidence rewrite is permitted.

## 9. Rollback and recovery

The F-01 correction is one atomic implementation slice. Rollback means:

1. stop the unaccepted S6-04 image/roles;
2. revert the complete role-entry/package/lock/Dockerfile/Compose/crontab/test/checker delta to accepted checkpoint `de40457e...`; and
3. keep S6-04 blocked while preserving the dirty work or a reviewed checkpoint for diagnosis.

The broken V1.0 runtime pnpm path is audit evidence, not an operational fallback. Rollback must not restore pnpm in the release image, retain two command paths, make `/app` writable, normalize future timestamps, or run an implicit install. Database rows and storage objects require no rollback because this correction creates no Schema/Migration or persistent state.

## 10. Stop conditions

Stop and callback before implementation acceptance on any:

- any Corepack/npm/npx/pnpm package-install surface in runtime, complete `pnpm` token reachable from a deployed role, or multiple role-entry mechanisms;
- implicit install, package validation mutation, pnpm metadata recreation, writable `/app`/`node_modules`, undeclared cache or source-tree mutation;
- `tsx` version/resolution drift, missing `react-server` condition, unsupported architecture/native file or failure of any positive role row;
- top-level `await` in an operational CommonJS-transformed entry, swallowed rejection, database connection left open, wrong exit code, Worker signal/join timeout or residual lock;
- attempt to widen the existing AI Production/environment capability while repairing role startup;
- reproducibility, bundle, AI, security or full-suite gate failure/suppression;
- need for precompiler, bundler, wrapper, sidecar, second authority, Schema/Migration, protected/external action or Provider call; or
- Owner presentation of `OD-B04-01`, S6-05/S6-06, deployment or Stage 7 before their required gates.

## 11. Security & Test Simplification Check — superseding result

| Check | V1.1 result |
| --- | --- |
| Root Cause First | PASS — source async boundaries and runtime launcher are corrected; no mtime-only workaround. |
| Simplification First | PASS — package manager, Corepack and two time-bearing state files leave runtime; no new dependency or state. |
| Replace Not Layer | PASS — one direct Node mechanism; pnpm runtime and metadata normalization are prohibited. |
| Standard mechanism | PASS — Node `--import=tsx`, explicit conditions, existing Supercronic and existing shell overlap lock only. |
| Error/signal integrity | PASS as plan/prototype — one-shots close in `finally`; Worker awaits join/stop and fails closed. |
| Security boundary | PASS as plan — non-root/read-only/no-install; exact dependency/native inventory; no Production AI widening or Provider call. |
| Test proportionality | PASS — exact two-architecture role matrix plus focused source/signal/failure tests; no duplicate proof framework. |
| Reproducibility | PASS as executable contract, not final proof — selected launcher removes known timestamp state; V1.0 exact OCI and `OD-B04-01` gates remain. |

Any future `no` blocks implementation.

## 12. Sequence and terminal boundary

1. A different task performs a fresh independent planning re-review of V1.1, the failed Review F-01 crosswalk, exact lineage, sidecars, Option A/B evidence and executable gates.
2. Only a fresh `PASS` permits the coordinator to present the unchanged `OD-B04-01` decision to the Owner.
3. Only after an Owner decision, a decision-aligned amendment/draft ADR and its required review may S6-04 implementation correction resume.
4. The existing Implementer task/worktree can be reused technically because its preserved dirty S6-04 scope is the correct base and no conflicting implementation began. It must receive the accepted delta and remain idle until all preceding gates pass.
5. No implementation, S6-05/S6-06, deployment or Stage 7 begins from this Candidate. After accepted Stage 6, stop; Stage 7 still requires a new explicit Owner authorization.

Technical Lead result: **COMPLETED planning remediation Candidate; awaiting fresh independent Stage 6 B-04 planning re-review.**
