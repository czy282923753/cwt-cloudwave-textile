# CWT Phase 1B Stage 6 S6-04 B-04 Reproducible-Image Technical Disposition and Planning Amendment Candidate V1.3

Status: **TECHNICAL LEAD REMEDIATION CANDIDATE — F-03 CLOSED AT PLANNING LEVEL; fresh independent planning re-review required; not implementation authorization, Owner presentation or acceptance**

Date: **2026-08-31**

Required sole parent: `d8068e4082eb70f1b41f903f0203626125562d77` (V1.2 tree `486f53b5229f25c697e772754082d52856ecdccb`)

Sibling-only failed Reviews, excluded from Candidate ancestry:

- V1.0 Review `a1a4321ae9741f51dd026ca854b7d6d829390dea`;
- V1.1 re-review `a694946af822f122e4a2586a42ee39e5978b244e`; and
- V1.2 re-review `a333f4b71b2c12f7a7164a2d7c4688f87a98bef2` (tree `509c05e88936fdc2a22ef4df97527339842157c5`; sole parent `d8068e4...`).

V1.0, V1.1 and V1.2 artifacts remain byte-identical audit history. The read-only implementation checkpoint remains `de40457e2e99d118915998ed57be33257512c0df`; the dirty Implementer worktree remains outside this Candidate.

Authority boundary: **Stage 6 planning/remediation only. `OD-B04-01` is unchanged and must not be presented until V1.3 receives a fresh independent `PASS`. No implementation, S6-05/S6-06, Provider/protected action, deployment or Stage 7 is authorized. Stage 7 remains HOLD pending new explicit Owner authorization.**

## 1. Disposition

The V1.2 re-review confirms that F-01 and original F-02 remain closed. It finds one new root, F-03: Compose profiles are additive and Compose has no repository pre-start hook. The V1.2 state-only `preflight-staging.sh` and a later raw `docker compose ... up` are two optional steps, so native Compose accepts `staging` plus `production-ai` before the check can prevent creation or start.

The selected correction reuses the existing `deploy/scripts/preflight-staging.sh` path and **replaces its check-only behavior with the one repository-controlled authorized Staging start gate**. The script remains an ephemeral host operation: it is not an application/container launcher, service, topology source, retry controller or persistent coordination mechanism. It reads the sole root `compose.yaml`, takes one nonblocking host `flock`, performs all prerequisite and state checks while holding that lock, and then `exec`s one exact Compose start command. All repository runbooks must remove the former “preflight, then raw start” sequence and expose this script as the only authorized Staging start entry.

The gate cannot make raw Docker access technically impossible for a root or Docker-socket principal. Such invocation is explicitly outside the authorized operational contract. Docker-socket custody is root-equivalent and must be limited to the smallest audited operations-principal set; repository instructions, change records and review evidence may direct Staging start only through the gate. This residual does not justify a second wrapper or false non-bypass claim.

This correction enforces an already-required operational boundary. It adds no service, Compose file, application process, database, Schema/Migration, secret, Provider capability or durable state. The advisory lock exists only for the host process lifetime. No new Owner decision or ADR is required. If implementation needs a daemon, generic orchestrator, second topology/profile authority or persistent lease, stop and escalate instead.

## 2. One-to-one F-03 closure

| F-03 element | V1.3 closure | Decisive evidence gate |
| --- | --- | --- |
| Native Compose accepts both profiles | The gate accepts zero arguments and rejects any non-empty inherited `COMPOSE_PROFILES`; flags, service targets, `production-ai`, multiple selections and unknown tokens cannot reach Compose. | Each injected form exits nonzero before any project container lifecycle event. |
| Preflight and start are separable | `preflight-staging.sh` now owns check **and** exact start in one process; raw start text is removed from every repository runbook. | Source/runbook search finds one authorized Staging start entry and no documented raw `up/create/start` path. |
| A concurrent caller can change state after checks | Nonblocking `flock` is acquired before host/root/graph/state/headroom checks and held through the final Compose command. | A concurrent second authorized invocation loses the lock, exits nonzero and performs no Compose action. |
| Existing check sees only already-running state | Under the lock, the gate requires the four ordinary foundation services running/unpaused, `scheduler-production` running/paused, `worker-production` inactive and all four Staging services inactive. | Running Worker, active Scheduler and unexpected active Staging each refuse before start. |
| Resource threshold can drift or be bypassed | `1408 MiB` is a script constant, not an operator override. `1407` refuses; `1408` is the positive boundary after all prerequisites pass. | Exact boundary tests plus unchanged resource arithmetic in §5. |
| A hard-coded start list can become topology authority | One token-exact gate allowlist is mechanically compared with the services whose sole profile is `staging` in normalized root Compose. | Missing, extra, renamed or duplicated token mutations fail the graph checker. |
| Raw root/socket bypass remains possible | It is declared outside the authorized repository contract; no claim says root cannot bypass Docker. | Runbooks expose only the gate; operator/socket custody and audit are reviewed separately. |
| Future Production AI could reuse this path silently | `production-ai` remains an unauthorized static hook/negative diagnostic. Future enablement must amend this same gate under separate explicit Production-AI/Stage 7 authority. | Any present gate acceptance of `production-ai` is a stop condition. |

No failed Review is edited or absorbed into Candidate ancestry.

## 3. Exact supersession boundary

V1.3 supersedes only these conflicting V1.2 expectations:

1. V1.2 §4’s both-profile row remains a static/full-graph validation set, but the enforceable runtime refusal is now the singular gate in §4 below.
2. V1.2 §§5-6 replace the optional state-only `preflight-staging.sh` with the atomic check-and-start contract below.
3. V1.2 §8’s simultaneous-profile row is bound to zero arguments, inherited-environment refusal, `flock` and zero-start evidence rather than an optional preflight.
4. V1.2 §§9-11 rollback, stop and simplification language is replaced by §§8-10 below where it conflicts.
5. Accepted deployment/runbook wording “run preflight, then start the Staging profile” is replaced by “invoke the singular gate”; no separate documented raw Compose start remains.

Everything else remains unchanged: exact OCI equality; Node `24.14.0`; exact `tsx@4.23.1`; pnpm `11.9.0` build-only; direct Node/tsx roles; explicit async main/error handling; F-01 dual-architecture role matrix; F-02 default five, `worker-production` profile/restart/network/resource contract; B04-D1 through B04-D5; Options A-E; Next/key classification; AI authority; and unchanged `OD-B04-01`.

V1.3 does not authorize or alter the normal Staging teardown operation. It only replaces every Staging **start** path. A teardown command cannot be documented as a start/resume alias.

## 4. Frozen singular Staging start contract

### 4.1 Entry and input grammar

The sole authorized repository entry is:

```text
deploy/scripts/preflight-staging.sh
```

Despite its retained historical filename, its documented contract is “validate and start Staging atomically.” It accepts **zero positional arguments**. Any argument exits nonzero, including `--profile`, `--file`, `--project-name`, `up`, `create`, `start`, an explicit service name or an unknown token. It rejects non-empty inherited `COMPOSE_PROFILES`, `COMPOSE_FILE`, `COMPOSE_PROJECT_NAME`, `COMPOSE_ENV_FILES` and `COMPOSE_PATH_SEPARATOR`. The script supplies the canonical repository root, root `compose.yaml` and fixed project name itself; lab-only isolation may use a separately named Synthetic project under tests, never protected operation.

Protected CWT configuration and secret-file roots continue through the accepted root-readable environment/secret custody. The gate does not accept a caller-selected Compose file, profile set or service set. Missing required Compose values fail during normalized config before any start.

### 4.2 Lock and check order

The protected lock is exact `/run/lock/cwt-staging-start.lock`. Host setup verifies a local Linux `flock`, non-symlink lock path, restrictive owner/group/mode and write custody by the one authorized operations principal. The script opens the lock and calls nonblocking `flock`; contention exits nonzero immediately. The file is not application state and carries no recovery semantics.

Argument/environment syntax rejection may occur before the lock because it performs no Docker action. After lock acquisition, the exact order is:

1. `preflight-host.sh` validates the accepted Linux/Docker/RAM/Swap boundary;
2. `preflight-roots.sh` validates the accepted canonical roots and disposable filesystem probe;
3. `preflight-compose-graph.mjs` normalizes only root `compose.yaml` and validates the exact graph/profile/resource/gate allowlists;
4. current Compose state is inspected without mutation;
5. exact `MemAvailable >= 1408 MiB` is enforced; and
6. only then is the exact Staging start command executed.

The lock descriptor remains open through the Compose process and releases automatically on process exit, signal or failure. There is no wait/retry loop for lock or dependencies.

### 4.3 Exact pre-start state

The gate requires:

- `proxy`, `web-production`, `postgres` and `valkey-production`: running and unpaused;
- `scheduler-production`: running but intentionally paused;
- `worker-production`: absent or stopped, never running, paused or restarting; and
- `web-staging`, `worker-staging`, `scheduler-staging`, `valkey-staging`: absent or stopped.

This is the machine boundary for the accepted rehearsal state. The full static graph still retains the exact Production Worker network membership. The check does not start, unpause, stop or remove any Production service.

### 4.4 Exact Compose action

The one embedded allowlist is:

```text
web-staging worker-staging scheduler-staging valkey-staging
```

The final operation is equivalent to the token-exact command below, with the repository root resolved by the script and no caller-supplied tokens:

```text
docker compose --project-name cwt --file <repo-root>/compose.yaml --profile staging \
  up --detach --wait --wait-timeout 120 --no-deps \
  web-staging worker-staging scheduler-staging valkey-staging
```

The shell uses `exec` for this final command, so its exit status and signals are the gate’s exit status and signals. `--no-deps` prevents Compose from creating/resuming Production roles. There is no retry, fallback selector, idle process, health façade or second Compose file.

The graph checker must parse exactly one allowlist declaration from this script and compare its token set to exactly the four normalized `staging`-profile members. It also retains exact default five, sole `production-ai` member, restart rules, full ten-service graph and both database-network allowlists. The allowlist is an execution permission projection of `compose.yaml`, not a second topology authority.

## 5. Topology and resource non-regression

All V1.2 values remain exact:

| State | Hard-limit sum | Arithmetic remainder on 4096 MiB |
| --- | ---: | ---: |
| ordinary default five | `1984 MiB` | `2112 MiB` |
| dormant Production Worker | `512 MiB` | separately visible; not default |
| default + `production-ai` | `2496 MiB` | `1600 MiB`; unauthorized diagnostic only |
| Staging increment | `1216 MiB` | separate on-demand budget |
| default + Staging | `3200 MiB` | `896 MiB` |
| rehearsal after Production Scheduler pause | `2944 MiB` | `1152 MiB` |
| both profiles | `3712 MiB` | `384 MiB`; unauthorized/refused |

The `1408 MiB` pre-start threshold remains `1216 MiB` plus `192 MiB` reserve. It is checked against current available memory after the Production Scheduler is paused. The checker must calculate every row from exact normalized service allowlists and must neither double-count the dormant Worker nor omit its future budget.

The exact database members remain:

```text
production-database: postgres, scheduler-production, web-production, worker-production
staging-database:    postgres, scheduler-staging, web-staging, worker-staging
```

No application service crosses environments; proxy and both Valkey services remain outside database networks. Actual RSS, Swap pressure and target coexistence remain future Stage 7 O-03 through O-05 proof and remain HOLD.

## 6. Exact implementation ownership and tests

This is planning only. After fresh V1.3 `PASS`, unchanged `OD-B04-01` Owner disposition and a decision-aligned reviewed amendment, the existing Implementer task/worktree may resume the one coherent S6-04 slice.

| Path | Bounded V1.3 ownership | Required proof |
| --- | --- | --- |
| `deploy/scripts/preflight-staging.sh` | Replace check-only behavior with §§4.1-4.4; zero args; fixed `1408`; nonblocking `flock`; exact state checks; final `exec` of exact four services. | focused shell/lifecycle tests for every negative and positive; exact Compose exit propagation; signal/lock release |
| `deploy/scripts/preflight-compose-graph.mjs` | Retain F-02 graph; bind exactly one gate allowlist to exact Staging profile members; verify default/future/resource sets; normalize only root Compose. | real normalized graph plus gate-list/profile/default/resource mutations |
| `deploy/scripts/preflight-compose-graph.test.mjs` and deployment tests | Add missing/extra/duplicate gate list, input grammar, state, memory, concurrency and lifecycle-event cases. | causal failure per mutation; no generic snapshot-only acceptance |
| `deploy/scripts/preflight-host.sh`, host templates | Assert `flock`, protected lock path/custody and existing root/host prerequisites; add no daemon/service. | disposable lab and protected-mode static checks; unsafe/symlink/unwritable lock fails |
| `deploy/host/README.md`, `docs/ENVIRONMENT_AND_DEPLOYMENT.md`, applicable operations runbook | Replace all preflight-plus-raw-start text with the singular gate; state root/socket bypass residual, operator custody, exact rehearsal/teardown and future Production-AI amendment gate. | repository search finds no second documented authorized Staging start |

No package, lockfile, application role source, Dockerfile, crontab, Schema/Migration or Provider boundary is added by F-03. V1.1/V1.2 implementation ownership remains unchanged and must be applied as one Replace-Not-Layer Candidate because S6-04 is still uncommitted.

## 7. Disposable prototype result

The exact dirty S6-04 tree was copied read-only into a disposable directory, then patched only in the copy with the accepted V1.2 profile/restart graph and the V1.3 gate. Static checks used Docker Engine `29.6.2`, Compose `5.3.1` and Node built-in tests. The focused graph suite passed `3/3`; exact default five, four Staging members, sole Production-AI member, two database networks and gate-list drift were mechanically asserted.

A local Linux gate runner used pinned `docker:29.6.2-cli@sha256:be132a9f282288de4afaf63379dff75711fda0147c6b72a9df44e51841402144` and disposable Node `24.18.1` only to execute the host scripts. Long-running role bodies were inert local fixtures; accepted F-01/F-02 artifact behavior was not reinterpreted. Docker Desktop used local `json-file`. This is an operational-gate prototype, not a release image, target `journald`, exact OCI or protected-host claim.

With the default foundation already running and `scheduler-production` paused, each negative below exited nonzero before a project container create/start/restart/pause/unpause/die/destroy event. Exact existing container state and service-log hashes were unchanged:

- arguments representing `staging + production-ai`, another `--profile`, explicit `worker-production` and an unknown token;
- inherited `COMPOSE_PROFILES=production-ai` and `COMPOSE_PROFILES=staging,production-ai`;
- running `worker-production`;
- active/unpaused `scheduler-production`;
- `1407 MiB` available memory; and
- lock contention.

At exact `1408 MiB`, the positive gate produced only four create and four start events for `web-staging`, `worker-staging`, `scheduler-staging` and `valkey-staging`. The project then had exact nine containers: the default five plus the four Staging services. `worker-production` stayed absent; `scheduler-production` stayed paused; the other four Production foundation services retained state and log hashes. Every Staging service was healthy and attached only to its accepted Staging networks. A second concurrent authorized invocation exited `1` on the lock while the first gate remained inside Compose readiness, with no Compose action.

All disposable containers, networks and the task-created gate-runner image were removed. No Provider, credential, real file/data, protected environment, target host or external service was used.

## 8. Verification, rollback and recovery

A fresh Reviewer must independently replay the exact input grammar, state, `1407/1408`, lock and positive lifecycle boundaries. Refusal evidence must compare project container inventory/state, service-log hashes and exact lifecycle actions before/after; healthcheck `exec_*` noise is not a container lifecycle mutation and must be classified separately. Positive evidence must prove the exact four start set, retained paused Scheduler, absent Production Worker and no cross-environment network.

The implementation slice is atomic with V1.1/V1.2. Before acceptance, rollback means stop/remove any disposable Staging containers, release the advisory lock by terminating the gate process, restore checkpoint `de40457e...`, and keep S6-04 blocked. The optional two-step V1.2 flow, raw dual-profile start, default Production Worker, runtime pnpm and retry/idle compatibility paths are audit evidence, never fallbacks.

A failed Compose command propagates nonzero exactly; operators then inspect the unchanged/partially created Staging set under the same bounded S6-04 recovery procedure. The gate does not auto-retry, auto-remove or mutate Production. Any recovery that requires an additional controller or service stops for review.

## 9. Stop conditions

Stop before implementation acceptance if any of the following occurs:

- any repository runbook retains a separate raw Staging `up`, `create`, `start` or profile-selection path;
- the gate accepts arguments, inherited Compose selectors, `production-ai`, multiple profiles or an explicit service target;
- the lock blocks instead of failing immediately, is released before Compose finishes, is bypassed by a second authorized entry, or requires a daemon/persistent lease;
- any refusal creates/starts/resumes/stops/removes a project container, changes an existing service state/log, or proceeds at `1407 MiB`;
- the positive starts anything except the exact four Staging services, resumes `scheduler-production`, creates `worker-production` or introduces cross-environment attachment;
- the gate allowlist drifts from normalized `staging` members or becomes a second topology source;
- a launcher, retry, idle shim, health façade, second Compose file or generic orchestration framework appears;
- Production AI capability/restart authority, F-01/F-02, exact OCI/key/AI gates or resource arithmetic is widened/weakened;
- raw root/socket access is represented as technically impossible instead of an explicitly custodied residual;
- Schema/Migration, new persistent state, external action or architecture change becomes necessary; or
- `OD-B04-01` is presented before V1.3 `PASS`, or S6-05/S6-06/deployment/Stage 7 begins.

## 10. Security & Test Simplification Check

| Check | V1.3 result |
| --- | --- |
| Root Cause First | PASS — the start request and check are one critical section; a later state-only warning is removed. |
| Simplification First | PASS — reuse one existing script, one standard host `flock` and one root Compose file. |
| Replace Not Layer | PASS — the check-only plus raw-start sequence is deleted; no compatibility entry remains. |
| Singular authority | PASS as plan — `compose.yaml` owns topology; the gate’s four tokens are mechanically derived/checked execution permission. |
| Fail closed | PASS as plan/prototype — bad intent, bad state, low memory, contention and Compose failure are nonzero without retry. |
| Security | PASS as plan — Production AI remains prohibited; Docker-socket/root bypass is honestly scoped and custodied. |
| Test proportionality | PASS — focused static mutations and real lifecycle/state/event checks cover the causal boundary; accepted F-01/F-02/OCI proof is preserved, not duplicated. |
| Persistent complexity | none — advisory lock lifetime equals one host process; no Schema/Migration or recovery authority. |

## 11. Sequence and terminal boundary

1. A fresh independent task re-reviews V1.3, all three failed-Review crosswalks, exact lineage/sidecars, singular gate, lock/input/state/resource contracts and F-01/F-02 non-regression.
2. Only a fresh `PASS` permits the coordinator to present unchanged `OD-B04-01` to the Owner.
3. Only the later Owner disposition plus a decision-aligned reviewed amendment permits the existing Implementer to resume S6-04.
4. S6-04 implementation then requires independent implementation Review before any later Stage 6 slice.
5. No S6-05/S6-06, deployment, Provider/protected action or Stage 7 begins here. After accepted Stage 6, stop; Stage 7 requires new explicit Owner authorization.

Technical Lead result: **COMPLETED planning remediation Candidate; awaiting fresh independent Stage 6 B-04 planning re-review of V1.3.**
