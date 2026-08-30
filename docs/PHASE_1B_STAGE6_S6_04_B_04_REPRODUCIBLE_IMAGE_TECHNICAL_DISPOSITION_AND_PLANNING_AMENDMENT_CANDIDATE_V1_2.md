# CWT Phase 1B Stage 6 S6-04 B-04 Reproducible-Image Technical Disposition and Planning Amendment Candidate V1.2

Status: **TECHNICAL LEAD REMEDIATION CANDIDATE — F-02 CLOSED AT PLANNING LEVEL; fresh independent planning re-review required; not implementation authorization, Owner presentation or acceptance**

Date: **2026-08-31**

Required Candidate parent: `e0d3b9d6fea0431d00850b1278b8d3717055311e` (V1.1 tree `551454854a7f976eb104a19d411c88e160624ba8`; sole parent `75be4d9689be85c2c18d762f44a300fe93c3b40d`)

Failed Reviews, sibling evidence only:

- V1.0 Review `a1a4321ae9741f51dd026ca854b7d6d829390dea` (tree `6ccaf83f0396ea9a765a1a86e3371a0a8623cc88`; sole parent `75be4d...`); and
- V1.1 re-review `a694946af822f122e4a2586a42ee39e5978b244e` (tree `e80078cd6af588f7a605a4049159a19135ca127c`; sole parent `e0d3b9d...`).

Both Reviews remain excluded from this Candidate's ancestry. V1.0 and V1.1 artifacts remain immutable audit history.

Accepted implementation checkpoint: `de40457e2e99d118915998ed57be33257512c0df`

Read-only Implementer worktree: `/Users/calvin/.codex/worktrees/39c0/CWT（CloudWave Textile）项目`

Authority boundary: **Stage 6 planning/remediation only. `OD-B04-01` remains valid and unchanged but must not be presented to the Owner until V1.2 receives a fresh independent `PASS`. No implementation, S6-05/S6-06, Provider/protected action, deployment or Stage 7 is authorized. Stage 7 remains HOLD pending new explicit Owner authorization.**

## 1. Disposition

The V1.1 re-review expressly closes prior `F-01`. This V1.2 carries forward without alteration:

- exact Node `24.14.0` plus exact `tsx@4.23.1` as the one runtime TypeScript role entry;
- pnpm `11.9.0` as build tooling only and removal of runtime package-manager surfaces/state;
- explicit async main/error handling, Worker join/stop semantics and all direct Node command tokens;
- the accepted `linux/amd64` and `linux/arm64` hardened role evidence;
- exact OCI equality, BuildKit/Next entropy and key classification;
- `B04-D1` through `B04-D5` as corrected by V1.1, Options A through E and unchanged `OD-B04-01`; and
- exact AI architecture gates, no Schema/Migration and every external/Stage 7 boundary.

New Review finding `F-02` has one root: `worker-production` is currently selected by ordinary default Compose and inherits `restart: unless-stopped`, while accepted AI authority always refuses Production. The exact artifact therefore exits `1` and restart-loops. A healthcheck, retry, launcher or idle shim cannot repair a capability that is intentionally unauthorized.

The selected correction is the existing standard Compose profile mechanism:

1. retain the single `worker-production` service definition;
2. assign exactly one profile, `production-ai`;
3. override its restart policy to exact normalized `no` while Production AI remains unauthorized;
4. remove it from ordinary default service selection; and
5. retain exact `production-backend` and `production-database` membership in the full static graph.

An ordinary default start therefore creates only five executable Production-foundation services. An explicit unauthorized `production-ai` activation remains a negative authority diagnostic: the real Worker command runs once, exits nonzero, stays stopped, and does not churn logs or resources. It is not a readiness path.

This narrows an unauthorized default and introduces no new service, network, process, persistent state or capability. It does **not** independently require a new Owner decision or ADR. Any later change that enables Production AI or gives this Worker an automatic restart policy requires separate explicit Production-AI/Stage 7 authority and a reviewed configuration amendment. That future decision is not part of `OD-B04-01`.

## 2. One-to-one closure of Review F-02

| F-02 element | V1.2 closure | Decisive gate |
| --- | --- | --- |
| `worker-production` is in the default set | Exact default allowlist becomes `proxy`, `web-production`, `scheduler-production`, `postgres`, `valkey-production`; count `5`. | Normalized `config --services`, default `compose create` container inventory and checker mutations reject any sixth/default Worker. |
| The refused Worker inherits `restart: unless-stopped` | Only `worker-production` has exact `restart: "no"`; all other current long-running services retain `unless-stopped`. | Explicit unauthorized activation: exit `1`, `restartCount=0`, `restarting=false`, one refusal log entry; checker rejects restart drift. |
| Production AI authority refuses Production | Authority remains unchanged. `createPhaseDAiRunWorkerV1()`, `FEATURE_AI`, Provider and AI gate scope are not widened. | Exact Worker emits `The Phase D Provider Worker requires enabled Staging.`; any apparent healthy-idle path is a stop condition. |
| Dormant service could lose least-privilege topology | Full graph retains `worker-production` only on `production-backend` and `production-database`; it has no Staging attachment. | Full-profile static membership remains exact; database-network mutation tests fail closed. |
| Accepted plan says Production services are default | Only the activation state of the currently unauthorized Production AI Worker is superseded. The service remains a defined Production service, profile-dormant. | §3 freezes the replacement wording and preserves every other accepted topology rule. |
| Checker, runbook and role matrix still encode the loop | One checker/profile/restart/resource authority and one documentation contract replace the old default/restart assertions. | Exact ownership in §6; no second Compose file, selector or runtime launcher. |
| Resource arithmetic counts a non-executable default Worker | Default, dormant Worker, Staging and combined selections are separate exact sums. | §5 values are derived from the service allowlists and asserted by the checker/tests. |

No part of either failed Review is edited or absorbed into Candidate ancestry.

## 3. Exact supersession boundary

This V1.2 supersedes only the following conflicting text or expectation:

1. Accepted Plan V1.2 §3.1 Rule 1 is replaced with: **`proxy`, `web-production`, `scheduler-production`, `postgres` and `valkey-production` are the ordinary default selection. `worker-production` is a defined Production service under the exact dormant `production-ai` profile. Every Staging service remains under the exact on-demand `staging` profile.**
2. Accepted Plan V1.2 §3.3 no longer counts the 512 MiB Production AI Worker in ordinary default usage. It remains a separately visible dormant/future-activation budget.
3. Accepted Plan V1.2 Staging rehearsal wording changes from “pause Production AI Worker/Scheduler” to “refuse if Production AI Worker is active, and pause Production Scheduler before the rehearsal.”
4. V1.1 §4 and §7.2 Production Worker exit `1` is classified as the explicit dormant-profile negative, never a default role.
5. V1.1 §5 Compose/checker/documentation ownership, §8 runtime proof, §9 rollback, §10 stop conditions and §11 simplification wording are extended by §§4 through 11 below.

Everything else in the accepted Stage 6 Plan, V1.0 and V1.1 remains in force. In particular, V1.2 does not alter the service name, image, command, memory/CPU/PID limits, secret custody, healthcheck, mounts or network membership of `worker-production`; it alters only selection and restart behavior while capability is unauthorized.

## 4. Frozen Compose selection and topology contract

`compose.yaml` remains the only topology/profile authority. Exact sets are compared order-independently but token-exactly.

| Selection | Exact selected services | Count | Authority meaning |
| --- | --- | ---: | --- |
| ordinary default | `proxy`, `web-production`, `scheduler-production`, `postgres`, `valkey-production` | 5 | current executable Production foundation |
| `production-ai` | ordinary default plus `worker-production` | 6 | dormant negative diagnostic only; no Production activation authority |
| `staging` | ordinary default plus `web-staging`, `worker-staging`, `scheduler-staging`, `valkey-staging` | 9 | on-demand Staging; excludes `worker-production` |
| `staging` + `production-ai` | all ten defined services | 10 | static/full-graph validation only; concurrent start is unauthorized and must be refused |

Exact profile/restart rules:

- `worker-production`: `profiles: [production-ai]`, `restart: "no"`;
- each Staging service: `profiles: [staging]`, `restart: unless-stopped`;
- each of the five default services: no profile and existing `restart: unless-stopped`; and
- no service may list both profiles, and no alias/wildcard/second profile name may activate Production AI.

The dormant service remains present so the full static network and future configuration boundary stay reviewable:

| Internal database network | Exact full-graph members |
| --- | --- |
| `production-database` | `postgres`, `web-production`, `worker-production`, `scheduler-production` |
| `staging-database` | `postgres`, `web-staging`, `worker-staging`, `scheduler-staging` |

`worker-production` attaches only to `production-backend` and `production-database`. Profile dormancy never justifies removing its Production database path, attaching it to Staging, adding a shared/third database network or adding another PostgreSQL service. Proxy and both Valkey services remain outside both database networks.

No `compose.override.yaml`, environment-specific Compose file, launcher, shell selector, idle service, sleep loop, retry controller or health façade is allowed. Repository verification must find exactly the root `compose.yaml` as the deployment topology authority.

## 5. Machine-checkable resource and rehearsal contract

All numbers below are sums of Compose hard limits against 4 GiB (`4096 MiB`). They are ceiling arithmetic, not predicted RSS or Stage 7 target proof.

| Selection/state | Hard-limit sum | Arithmetic remainder |
| --- | ---: | ---: |
| ordinary default five | `1984 MiB` | `2112 MiB` |
| dormant `worker-production` increment | `512 MiB` | not counted until explicitly selected |
| default + `production-ai` | `2496 MiB` | `1600 MiB` |
| Staging profile increment | `1216 MiB` | separate on-demand budget |
| default + Staging selected | `3200 MiB` | `896 MiB` |
| Staging rehearsal after pausing `scheduler-production` | `2944 MiB` | `1152 MiB` |
| both profiles selected | `3712 MiB` | `384 MiB`; unauthorized/refused |

The checker emits exact byte values for each row and mutation tests bind the service allowlists to the arithmetic. `preflight-staging.sh` retains the current minimum `MemAvailable` threshold of `1408 MiB` (`1216 MiB` Staging limits plus `192 MiB` reserve), refuses if `worker-production` is active under any invocation, and separately requires `scheduler-production` to be paused. It must not count the dormant Worker as active, omit it from the future-activation sum, or silently permit simultaneous Staging and `production-ai` profiles.

Actual RSS, Docker/host consumption, Swap behavior, pressure and coexistence remain Stage 7 `O-03` through `O-05` proof and remain HOLD.

## 6. Exact implementation ownership

This is a plan, not implementation. Only after V1.2 planning `PASS`, the unchanged `OD-B04-01` Owner decision and a decision-aligned reviewed amendment may the existing Implementer resume the one S6-04 correction slice.

| Path | Bounded V1.2 change | Required verification |
| --- | --- | --- |
| `compose.yaml` | Add exact `profiles: [production-ai]` and `restart: "no"` only to `worker-production`. Retain its exact V1.1 direct Node/tsx command and exact Production networks. | four exact selection sets; normalized restart/profile; default create has no Worker; explicit negative exits once; full network allowlists unchanged |
| `deploy/scripts/preflight-compose-graph.mjs` | Remove `worker-production` from exact default set; add exact profile map; permit `restart: no` only for that service; retain full ten-service and database allowlists; emit exact resource matrix. | real normalized Compose plus fixture mutations for default/profile/restart/network/resource drift |
| `deploy/scripts/preflight-compose-graph.test.mjs` | Replace default count `6` with `5`; add exact `production-ai` fixture and mutations for absent/renamed/multiple profile, default re-entry and restart-loop policy. | all positive and negative cases pass; each mutation fails for its causal assertion |
| `deploy/scripts/preflight-staging.sh` | Treat any running `worker-production` as unauthorized and refuse; require only `scheduler-production` to be intentionally paused; retain `1408 MiB` headroom refusal. | lab memory boundary; running-Worker denial; Scheduler-running denial; no hidden profile start |
| `deploy/host/README.md`, `docs/ENVIRONMENT_AND_DEPLOYMENT.md` | Document exact default five, dormant profile, one-shot negative activation, Staging interaction and future authority gate. Remove instructions to resume an unauthorized Production Worker. | docs-to-normalized-graph exact comparison |

V1.1 implementation ownership for `package.json`, `pnpm-lock.yaml`, four operational scripts, Dockerfile, crontabs, Worker tests and exact AI gate files remains unchanged. V1.2 authorizes no additional source or dependency mutation. The final implementation must apply V1.1 and V1.2 as one coherent replace-not-layer Candidate because the Implementer has not committed S6-04.

The existing Implementer task/worktree remains technically reusable after all gates. It stays idle and unmodified by this planning task.

## 7. Disposable prototype result

All work used disposable local copies/containers and Synthetic values. The dirty Implementer worktree was read-only. No Provider, real file/data, account, protected environment or external action was used.

### 7.1 Static graph and checker

The amended normalized graph passed:

- all ten defined services in the two-profile full graph;
- exact default count `5` and exact default container creation set;
- exact `production-ai` count `6`, `staging` count `9`, full count `10`;
- exact two database networks and four members per environment;
- `worker-production` only on Production backend/database networks; and
- exact resource byte values in §5.

The focused Node checker suite passed `3/3`, including mutations for database topology, default membership, profile name/presence, restart policy, privilege, resource, secret and image weakening.

### 7.2 Exact direct-Node artifact activation

A disposable `linux/arm64` direct Node/tsx artifact built successfully with Node `24.14.0`, exact `tsx@4.23.1`, Next `16.2.12`, Supercronic `0.2.48`, read-only/non-root runtime and no runtime package-manager surface. This build was only a topology replay; it is not a release image or two-run reproducibility claim.

Ordinary default `compose create` instantiated exactly:

```text
proxy
web-production
scheduler-production
postgres
valkey-production
```

No `worker-production` container was created. Explicit `production-ai` activation ran the exact direct Node/tsx Worker command and produced exactly one authority refusal:

```text
AI run Worker failed: The Phase D Provider Worker requires enabled Staging.
```

It then remained `status=exited`, `exit=1`, `restartCount=0`, `restarting=false`, restart policy `no`. A later recheck retained the same state and one log line. The container was UID/GID `10001:10001`, read-only, and attached only to the two exact Production networks.

Docker Desktop does not enable the target `journald` logging driver, so this one disposable start substituted local `json-file` solely to reach the process. The committed plan and future Linux evidence retain `journald`; this local substitution is not target/logging proof.

### 7.3 Preserved F-01 evidence

The accepted V1.1 re-review already proved the hardened direct Node/tsx role matrix on exact `linux/amd64` and `linux/arm64` artifacts, including enabled-Staging Worker drain exit `0`. V1.2 changes no Worker source, command token, runtime dependency, artifact cleanup or Staging profile. That evidence is carried forward rather than relabeled as a new release proof. Implementation must rerun the complete V1.1 dual-architecture matrix after applying the V1.2 Compose delta.

## 8. Superseding role and verification matrix

| Case | Required result |
| --- | --- |
| normalized ordinary default | exact five services; `worker-production` absent |
| ordinary default container creation/start | no `worker-production` container, restart event or refusal log |
| full static graph | ten services; Production database membership still includes dormant Worker |
| explicit unauthorized `production-ai` activation | real command runs once; nonzero exit; `restartCount=0`; stopped; one bounded refusal; no Provider call |
| enabled-Staging Worker | unchanged V1.1 positive on both architectures; running, then join/stop/drain exit `0`; no residual lock or Provider call with zero jobs |
| Staging selection | exact nine services; Production Worker excluded; environment-private networks/secrets retained |
| simultaneous Staging + `production-ai` start request | preflight refusal before start; no resource arithmetic bypass |
| future Production AI | HOLD until separate explicit Owner/Stage 7 authority and reviewed change; not satisfied by `OD-B04-01` |

Both clean-cache dual-architecture image runs must still meet V1.0/V1.1 exact OCI index, manifest, config, layer/diff-ID, unpacked metadata, key and detached-evidence requirements. Profile correctness never substitutes for exact reproducibility.

## 9. Rollback and recovery

The F-02 implementation delta is atomic with the V1.1 S6-04 correction. Before acceptance, rollback means:

1. stop and remove any disposable/unaccepted `worker-production` container;
2. restore the accepted checkpoint `de40457e...` and keep S6-04 blocked; and
3. preserve the unaccepted work for diagnosis without starting its default topology.

The V1.1 always-on/restart-loop graph is audit evidence, not an operational fallback. A rollback bundle must not reintroduce `worker-production` into ordinary default, `restart: unless-stopped` before capability authority, runtime pnpm, an idle shim or a second Compose file. No database/storage rollback is needed because this planning correction adds no persistent state or Migration.

## 10. Stop conditions

Stop and callback before implementation acceptance on any:

- `worker-production` appears in ordinary default selection or is created by ordinary default startup;
- its unauthorized restart policy is anything other than exact `no`, or its failure restarts/churns;
- a launcher, idle/sleep process, swallowed refusal, retry controller or health façade makes it appear healthy;
- Production AI capability, `FEATURE_AI`, Provider access or `createPhaseDAiRunWorkerV1()` authority is widened;
- a second Compose/profile/topology authority, alternate profile name, wildcard selector or simultaneous-profile bypass appears;
- the dormant Worker loses exact Production backend/database membership, crosses environments, or creates a new database/service/network authority;
- default, dormant, Staging or combined resource sums differ from §5 or preflight double-counts/omits a role;
- V1.1 direct Node/tsx, exact OCI equality, AI gate, security or full-suite gates regress or are suppressed;
- Schema/Migration, new persistent state, Provider/protected/external action or architecture change becomes necessary; or
- `OD-B04-01` Owner presentation occurs before fresh V1.2 `PASS`, or S6-05/S6-06/deployment/Stage 7 begins.

## 11. Security & Test Simplification Check — superseding result

| Check | V1.2 result |
| --- | --- |
| Root Cause First | PASS — default activation is removed because capability rejects Production; the Worker is not taught to idle. |
| Simplification First | PASS — one existing profile plus one no-restart policy; no new process, state or file hierarchy. |
| Replace Not Layer | PASS — exact checker/default contract replaces the six-service assertion; no second Compose path. |
| Standard mechanism | PASS — native Compose profiles and restart policy only. |
| Security authority | PASS as plan — Production AI remains prohibited; explicit failure is bounded and fail-closed. |
| Topology isolation | PASS as plan/prototype — dormant static membership stays Production-only; default runtime excludes it. |
| Test proportionality | PASS — one normalized-graph checker, mutation tests and one real failure replay; V1.1 dual-architecture proof is reused, not duplicated. |
| Reproducibility | unchanged — exact V1.0/V1.1 equality and `OD-B04-01` gates remain mandatory. |

No independent Owner/ADR decision is required for this narrowing correction. Any change from dormancy to enabled/restarting Production AI crosses the stated authority and stops.

## 12. Sequence and terminal boundary

1. A fresh independent task re-reviews V1.2, both failed-Review crosswalks, exact lineage/sidecars, profile/restart/network/resource contracts and non-regression of accepted F-01.
2. Only a fresh `PASS` permits the coordinator to present unchanged `OD-B04-01` to the Owner.
3. Only after the Owner decision and a decision-aligned reviewed amendment may the existing Implementer resume S6-04.
4. S6-04 implementation then requires its independent implementation Review before later Stage 6 slices.
5. No S6-05/S6-06, deployment, Provider/protected action or Stage 7 begins from this Candidate. After accepted Stage 6, stop; Stage 7 still requires new explicit Owner authorization.

Technical Lead result: **COMPLETED planning remediation Candidate; awaiting fresh independent Stage 6 B-04 planning re-review of V1.2.**
