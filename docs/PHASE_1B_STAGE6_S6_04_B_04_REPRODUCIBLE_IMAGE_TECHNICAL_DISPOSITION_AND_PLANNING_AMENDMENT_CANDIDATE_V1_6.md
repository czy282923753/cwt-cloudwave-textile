# CWT Phase 1B Stage 6 S6-04 B-04 Reproducible-Image Technical Disposition and Planning Amendment Candidate V1.6

Status: **TECHNICAL LEAD F-04-ONLY REMEDIATION CANDIDATE — fresh independent planning re-review required; not self-approved, implementation authorization, Owner presentation, or Stage 7 authority**

Date: **2026-08-31**

Candidate branch: `codex/phase-1b-stage6-s6-04-b04-planning-remediation-v1-6`

Required sole parent: `59f356751c34f1a6064925c5bb4c052b737e605f` (V1.5 tree `924aed29a56dafa3890ca335ca5b20654f56a42c`; sole parent `15d536042d002a251796e45b47b141320c33e56e`)

The V1.5 independent Review is failed sibling-only evidence: commit `2f36b5a7ecac35e4607c0aa9b706671adecd3777`, tree `e008d601f8817cdf832a9cf9b78d7d6812dfbc73`, sole parent `59f3567...`, Review-file SHA-256 `0cc40a3dd32167761377200ab7f9191fe57e230e9617064cc47a433ac34191a9`. It and every earlier Review commit remain excluded from Candidate ancestry.

V1.0 through V1.5 Candidate artifacts and sidecars remain byte-identical audit history. The read-only Implementer checkpoint and intentionally dirty Implementer worktree remain outside this Candidate.

Authority boundary: **Stage 6 planning/remediation only. `OD-B04-01` is unchanged and must not be presented until V1.6 receives a fresh independent `PASS`. No implementation, protected/external action, S6-05/S6-06, deployment, Provider access, or Stage 7 is authorized. Stage 7 remains HOLD pending new explicit Owner authorization.**

## 1. Disposition and exact supersession

Review `2f36b5a...` independently closes V1.5 F-05 and accepts its exact GLIDE/Valkey boundary. V1.6 does not reopen it. In particular, the following V1.5 line remains normative without addition or broadening:

```text
user cwt-<environment> on >password resetkeys ~cwt:<environment>:rate:* resetchannels -@all +ping +client|setname +script|load +evalsha +incr +pexpire +pttl
```

Authenticated `REDISCLI_AUTH` PING remains container/network/auth liveness only. The existing matching-network, two-process GLIDE verifier remains mandatory S6-04 functional acceptance evidence; the operational Staging gate still runs no limiter canary and does not duplicate S6-05 readiness.

V1.6 supersedes only the conflicting F-04 portions of V1.5 §§1-3, the F-04 implementation slices, rollback/stop language, and Security & Test Simplification wording:

1. **F-04A:** replace dynamically linked `#!/bin/bash -p` with exact distro-provided statically linked `/usr/bin/bash-static -p`, so caller dynamic-loader variables cannot execute before the first gate instruction;
2. **F-04B:** replace parent-only lock lifetime and universal `9>&-` with one FD9 held by the parent and the singular Compose lifecycle process tree until the lifecycle action settles;
3. preserve one gate, one private Node verifier, one root Compose graph, one lock, one lifecycle action, one root principal, and all V1.5 downstream path/hash/selector/socket controls; and
4. delete only the named V1.5 Synthetic evidence image and record the cleanup.

No wrapper framework, daemon, persistent service, setuid helper, new principal/group, second launcher, second lock, lease/state machine, second Compose file, retry controller, or custom compiled bootstrap is selected. No Schema/Migration or package-lock change is expected.

## 2. One-to-one F-04A/F-04B Review closure

| Review assertion | Corrected mechanism | Positive proof | Hostile / signal proof | Rollback / stop condition | Future implementation locator |
| --- | --- | --- | --- | --- | --- |
| Dynamic loader consumes caller state before `/bin/bash -p` reaches `main()` | Exact shebang `#!/usr/bin/bash-static -p`; activation pins Ubuntu Noble `bash-static 5.2.21-2ubuntu4` separately for `amd64` and `arm64`. The selected binary has no ELF interpreter or dynamic dependency. | Both exact architecture binaries execute the clean gate and reach only the frozen downstream tools. | `LD_PRELOAD` constructor control executes under dynamic `/bin/bash -p`; the same constructor never executes under `bash-static`. `LD_PRELOAD`, `LD_AUDIT`, `LD_LIBRARY_PATH`, `GCONV_PATH`, and `LOCPATH` all exit `65`, with zero marker/socket/lifecycle delta. | Revert the single gate/activation replacement and keep S6-04 stopped. Stop if the selected interpreter is dynamic, floating, unsupported on either architecture, or unavailable from the signed pinned package. | `deploy/scripts/preflight-staging.sh`; protected installation `/usr/local/sbin/cwt-staging-start`; activation manifest/tests |
| Shell/startup/caller environment can redirect the first operation | From the first executable instruction, Bash builtins and `/proc/self/environ` redirection only reject hostile classes, clear inherited names, reset aliases/hash/options, and freeze exact environment before any dynamic child. | Hostile caller `PATH`, `HOME`, and locale normalize to the frozen values; absolute official tools execute on both architectures. | `BASH_ENV`, `ENV`, exported functions, `SHELLOPTS`, `BASHOPTS`, `CDPATH`, `GLOBIGNORE`, positional args, `DOCKER_*`, and `COMPOSE_*` refuse before protected-socket connection or lifecycle action. | Stop on a sourced file, `eval`, relative command, command/process substitution, caller token, or pre-normalization external invocation. | same gate source; static source checker and hostile matrix |
| Trust bootstrap can be circular or downstream paths can be replaced | Signed package metadata plus the protected activation manifest bind `/usr/bin/bash-static` and `/usr/bin/sha256sum` as bootstrap anchors. After clean exec, that exact hash tool binds every downstream absolute tool, Node child, config, and root Compose byte sequence before use. It never claims to prove itself against malicious raw root. | Exact `.deb`, binary, build-ID, owner/group/mode/link, architecture, version, and downstream hashes are recorded. | Replaced `env`, `id`, `stat`, `flock`, Docker CLI, or Compose plugin exits `68` before socket/action on both architectures; implementation must retain the accepted Node/child-path replacement tests. | Stop on unsigned/floating package input, self-verification language, root-writable artifact, wrong hash/metadata, or an unbound downstream child. | activation manifest; `preflight-compose-graph.mjs`; host README/tests |
| V1.5 says every child closes FD9, which would also break acquisition | Exact `/usr/bin/flock --exclusive --nonblock 9` is the explicit acquisition exception and receives FD9. Every unrelated validation child has literal `9>&-`. Only the final Compose lifecycle child and its causally necessary plugin descendants inherit FD9. | Parent, Docker CLI, and observed Compose plugin stay in one lifecycle tree; parent and lifecycle child show FD9 open; validation child shows it closed. | Contention returns `81`; a second gate remains refused throughout the first lifecycle action. | Stop if acquisition closes FD9, any validation child retains it, a second lock appears, or a lifecycle descendant loses exclusion before settling. | gate; FD/process-tree checker; contention tests |
| Parent signal releases the lock while Compose continues | Parent and lifecycle process tree both hold the one lock. The parent gives the lifecycle child a separate process group, defers `INT`/`TERM`/`HUP`, loops on Bash `wait -f`, then returns the child failure or the deferred signal status only after lifecycle settlement and read-only post-state verification. | Normal and supported-signal paths settle once; exact statuses are `0`, `130`, `143`, and `129`. | Parent-only and parent-process-group signals leave the child holding FD9. Child-group termination leaves the parent holding FD9 until termination is observed. No forwarding, retry, idle shim, or replacement action occurs. | Stop if parent exit is equated with action completion, a trap forwards before settlement, `wait` observes only a state change, or a second action can acquire early. | gate signal/wait block; signal/process-tree tests; runbook |
| Abrupt death can outlive a process-scoped lock | Parent-only `SIGKILL` still leaves the separate lifecycle process tree holding FD9. Simultaneous destruction of all holders is the honest kernel-lock ceiling; every later gate must perform the exact pre-start state/quiescence checks and refuse partial, changing, or ambiguous engine state. | Dual-architecture Compose-like proof shows the child completes and lock remains refused after parent-only kill. | Real dual-architecture total-kill proof leaves first-action Staging state; an immediate second gate acquires the released kernel lock but exits before a second lifecycle child because Staging is not inactive. | No automatic cleanup or retry. Operator uses the existing rollback path, proves no prior process/event/state mutation remains and exact baseline is restored, then re-enters the same gate. Stop/escalate if stable state cannot be established without new persistent authority. | same gate preflight/postflight; operations recovery section; kill/recovery tests |
| Real action and headroom contract must still hold | The final literal Compose action, root graph, exact four-service list, `--wait-timeout 120`, 1408 MiB threshold, Production isolation, and health strictness are unchanged. | Both architecture-specific gate fixtures complete exact four-service Staging startup while Production Scheduler stays paused and Worker absent. | `1407 MiB` refuses with zero Staging lifecycle delta; `1408 MiB` concurrent second invocation returns `81`; network inventory remains exact. | Stop on changed service/profile token, missing/extra service, Production mutation, cross-network link, timeout, or weaker health/headroom gate. | gate integration tests; graph checker; deployment/runbook docs |

F-01, F-02, F-03, F-05, exact OCI/Next/key findings, B04-D1 through B04-D5, Options A-E, AI authority, and unchanged `OD-B04-01` remain incorporated from V1.5 and its accepted predecessors.

## 3. F-04A frozen clean-exec boundary

### 3.1 Selected standard component

The selected interpreter is the standard Ubuntu 24.04 Noble `bash-static` package, not a CWT-built binary. The disposable proof used the same pinned Ubuntu multi-architecture base and exact signed repository package on both target architectures:

| Identity | `linux/amd64` | `linux/arm64` |
| --- | --- | --- |
| Ubuntu base index | `ubuntu:24.04@sha256:33ceb71981b602c1a7443a53469e4dba065f7503eab3078a2d7a57a2ab987517` | same index |
| package | `bash-static 5.2.21-2ubuntu4` | same version |
| downloaded `.deb` SHA-256 | `684691928e746a29d4b97c3b58069666a3cdd73104c90b217501f5c1ae7cbd64` | `1fd25dda094189ac7ad22acad78c298fdd7fedc60c2f45bb00512c13708224a2` |
| installed `/usr/bin/bash-static` SHA-256 | `ea3065d65dd07162e42e6db082103ef7dda0578436f15da76ff17be7b31cf671` | `923600157c5ec8cbd17c45127cbf34c766ad401722ceb0f0661f2a287538be47` |
| GNU build ID | `d682de4864fa3a62f2cc9cc29b95c7506427897f` | `c7c2ad3d91bd5d9f629a5c6e48b2528779f8df3b` |
| static identity | `file`: statically linked; `readelf -l`: no `INTERP`; `readelf -d`: no `NEEDED`; `ldd`: not dynamic | same assertions |

Official component references are the [Ubuntu Noble `bash-static` package](https://packages.ubuntu.com/noble/bash-static), [GNU Bash privileged-mode contract](https://www.gnu.org/s/bash/manual/html_node/The-Set-Builtin.html), and the [Linux loader environment/secure-execution contract](https://man7.org/linux/man-pages/man8/ld.so.8.html). The activation implementation must use exact signed package/version/architecture plus the frozen SHA-256; an unqualified `apt install bash-static`, alternate mirror bytes, or newer package is not accepted evidence.

This is the smallest supported host correction: one distro package changes only the interpreter of the already-singular repository gate. It adds no service, daemon, principal, network, persistent state, or runtime application dependency.

### 3.2 First-instruction and environment contract

Protected activation installs the reviewed gate bytes at `/usr/local/sbin/cwt-staging-start`, regular root:root `0555`, link count `1`, with exact activation-manifest SHA-256 and this first line:

```bash
#!/usr/bin/bash-static -p
```

Before the first external process, the static Bash process must:

1. require option `p`, real/effective UID and GID `0:0`, and zero positional arguments;
2. NUL-scan `/proc/self/environ` with Bash builtins and reject any non-empty `LD_*`, `GCONV_PATH`, `LOCPATH`, `BASH_ENV`, `ENV`, `SHELLOPTS`, `BASHOPTS`, `CDPATH`, `GLOBIGNORE`, `BASH_FUNC_*`, `DOCKER_*`, or `COMPOSE_*` entry;
3. unset every non-required inherited name, remove export attributes from shell option variables, clear aliases and command hash, fix `IFS`, `umask 077`, and exact fail-fast options; and
4. export and make readonly `PATH=/usr/sbin:/usr/bin:/sbin:/bin`, `HOME=/root`, `LANG=C`, `LC_ALL=C`, and `TZ=UTC`.

No external command, dynamic library, profile, source/eval operation, function import, command/process substitution, relative lookup, or caller argument is permitted before that sequence completes. The static interpreter prevents loader execution; the scan provides explicit fail-closed intent handling rather than silently accepting hostile variables.

### 3.3 Non-circular activation and downstream binding

The trust sequence is exact:

1. protected host activation validates Ubuntu signed repository metadata, architecture, package version and `.deb` SHA-256 before installation;
2. activation binds `/usr/bin/bash-static`, `/usr/bin/sha256sum`, the gate source/install bytes, owner/group/type/mode/link metadata, and the release manifest before exposing the gate;
3. the statically loaded gate clears caller execution influence before invoking the activation-trusted `/usr/bin/sha256sum`; and
4. that hash anchor binds the accepted V1.5 absolute `env`, `id`, `stat`, `flock`, Node `24.14.0`, Node child, Docker `29.6.2`, Compose `5.3.1`, fixed config/env/root Compose bytes, and every later child before use.

The gate does not claim to defend against a malicious root replacing both the bootstrap and its manifest. Raw root can also invoke Docker outside the repository gate. Those remain the honest V1.4/V1.5 custody ceiling, not caller-controlled authority accepted inside the gate.

## 4. F-04B one-lock/action-lifetime contract

### 4.1 Exact descriptor ownership

The one gate uses the existing exact root:root `0700` `/run/lock/cwt` directory and root:root `0600`, size-zero, link-count-one `/run/lock/cwt/staging-start.lock`. It opens one fixed FD9, proves the descriptor and path device/inode are identical, and acquires:

```text
/usr/bin/flock --exclusive --nonblock 9
```

That acquisition receives FD9. All preflight, hash, metadata, Node, and read-only Docker children explicitly close it with `9>&-`. The final literal Compose lifecycle child does not close it; its Compose plugin descendants may inherit it as the same causally necessary action tree. The parent also retains FD9 until the child has settled and post-state verification ends. There is no universal `9>&-` rule.

### 4.2 Process-group, signal, wait, and exit rules

Immediately before the final action, the non-interactive static Bash enables job control only long enough to start that one child in a distinct process group, records PID/PGID/session for audit, and disables job control again. The child uses the unchanged command:

```text
/usr/bin/docker --config /etc/cwt/docker-cli --host unix:///run/docker.sock \
  compose --env-file /etc/cwt/compose.env --project-name cwt \
  --file /etc/cwt/compose.yaml --profile staging \
  up --detach --wait --wait-timeout 120 --no-deps \
  web-staging worker-staging scheduler-staging valkey-staging
```

`INT`, `TERM`, and `HUP` traps set exactly one pending terminal status and emit immediate operator feedback. They do not forward the signal, start cleanup, or release FD9. The parent repeats `wait -f <lifecycle-pid>` after trap interruption until the lifecycle child is terminal. Bash documents that a trapped signal interrupts `wait` and that `wait -f` with job control waits for termination rather than a mere state change; those are the exact semantics required here: [Bash signals](https://www.gnu.org/software/bash/manual/html_node/Signals.html), [Bash job-control builtins](https://www.gnu.org/s/bash/manual/html_node/Job-Control-Builtins.html).

Exit precedence is deterministic:

| Event | Lock/action result | Gate result |
| --- | --- | --- |
| normal child success | post-state exact; release after completion | `0` |
| parent `INT` / `TERM` / `HUP`, child succeeds | signal deferred; child and post-state complete while locked | `130` / `143` / `129` |
| child exits nonzero or its process group is terminated | parent retains lock through terminal wait and fail-closed post-state observation; no retry/rollback | exact child status |
| parent-only `SIGKILL` or original parent-process-group `SIGKILL` | separate lifecycle tree retains FD9 and completes/terminates; second gate stays excluded | parent `137`; child result is audited by engine state |
| all FD9 holders forcibly killed | kernel releases the process lock; no claim to impossible persistence | next gate may inspect but may not start until §4.3 stability contract passes |

### 4.3 SIGKILL ceiling and bounded recovery

A process-scoped advisory lock cannot survive simultaneous `SIGKILL` of every holder or host failure. V1.6 does not disguise that ceiling with a lease, daemon, sentinel, or second lock.

Instead, the same gate's pre-action verifier always treats Docker Engine state as fail-closed input. It must confirm no live prior CWT gate/Compose process targets the exact project, exact default foundation is stable, Production Scheduler is paused, Production Worker is absent, all four Staging services are absent/inactive, and no transition/restart is present. After an abrupt all-holder kill, the protected operator recovery is exact: record one normalized project/process snapshot; observe **120 consecutive seconds** of Docker Engine events filtered to `com.docker.compose.project=cwt`; require zero create/start/die/destroy/health/pause/unpause/restart event; then record a second byte-identical snapshot. Any event or difference fails that recovery attempt without retry. Any partial service, health transition, restart, project event, changing snapshot, unknown state, or unavailable daemon refuses before a second lifecycle child.

If partial Staging state exists, the operator uses the already-reviewed S6-04 rollback/recovery procedure under root custody, then performs one new 120-second observation attempt and invokes the same zero-argument gate only after `PASS`. The event observation and snapshots are read-only recovery evidence, not an alternate start path or topology authority. There is no automatic cleanup, retry, resume, alternate Compose selection, or generic recovery mode. If stable Engine state cannot be established with the existing read-only Docker/process evidence, stop and escalate; do not start. Root can bypass this contract with raw Docker, but that action remains outside the authorized repository path and under host custody/audit.

### 4.4 Post-action truth

`docker compose up --detach --wait` is the sole lifecycle action; Docker documents `--wait` as waiting for services to be running/healthy: [Docker Compose `up`](https://docs.docker.com/reference/cli/docker/compose/up/). Before releasing FD9, the same private verifier rechecks the exact four Staging services, paused Production Scheduler, absent Production Worker, default foundation, restart counts, and environment-private networks. A green CLI exit with wrong state is failure. A signal-derived terminal status is reported only after this observation.

## 5. Executable proof and acceptance freeze

The disposable proof used only Synthetic local data and the local Docker Desktop engine; it made no Provider, protected-environment, credential, or real-file call. It is planning evidence, not Production/Stage 7 proof.

### 5.1 Clean-exec proof

Both `linux/amd64` and `linux/arm64` passed:

- static identity (`file`, `ldd`, `readelf`), exact package/binary/hash/build ID and shebang execution;
- clean invocation and hostile `PATH`/`HOME`/locale normalization;
- loader/startup/function/options/path/selector rejection with no injected marker;
- downstream `env`, `id`, `stat`, `flock`, Docker and Compose-plugin substitution rejection; and
- for every hostile rejection, unchanged protected-socket accept counter and unchanged project lifecycle digest.

The dynamic `/bin/bash -p` control wrote the `LD_PRELOAD` constructor marker on both architectures; `/usr/bin/bash-static -p` did not. This proves the first causal divergence rather than relying on a later variable scan.

### 5.2 Lock/signal proof

The exact Compose-like child matrix passed on both architectures for normal, `INT`, `TERM`, `HUP`, parent-only kill, parent-process-group `TERM`/`KILL`, and child-process-group termination. Parent and lifecycle PGIDs were distinct, session identity stayed common, FD9 was present in the parent/lifecycle action, validation FD9 was closed, the second lock was refused while any action holder remained, and reacquisition succeeded only after settlement.

The real unchanged 1408 MiB path then passed on both architecture-specific gate fixtures. Each observed the real Docker CLI/Compose plugin process tree, parent and lifecycle FD9, deferred `TERM`, second-gate `81`, child `0`, gate `143`, exact four healthy Staging services, paused Production Scheduler, absent Production Worker, and exact environment networks. Both 1407 MiB runs exited nonzero with zero Staging container delta.

The real all-holder `SIGKILL` ceiling was also challenged on both architectures after first-action mutation became visible. The first gate exited `137`; an immediate second invocation exited before creating a second lifecycle child because `web-staging` was no longer inactive. Engine state continued converging from the first submitted action, demonstrating why an operator must not equate released FD9 with stable Engine state and why §4.3 is mandatory.

### 5.3 Evidence hygiene

The Review-named local image `cwt-gate-runner:f04-f05` had no associated container. V1.6 removed only that exact Synthetic tag/image (`sha256:47dcde95ba2f02a322a6e18db2a9a072230cf77031409f7e93fa4755eefc8a5f`). Subsequent exact inspect returned nonzero, matching image count was `0`, and matching container count was `0`. This corrects the V1.5 non-qualifying evidence-hygiene discrepancy without changing Candidate ancestry or protected state.

Final cleanup removed every `cwt-v16-*` disposable container, image, network, and volume (post-cleanup counts `0/0/0/0`) and moved the disposable file root recoverably to Trash. No unrelated local resource was selected.

## 6. Bounded implementation slices

Implementation remains stopped pending a fresh V1.6 planning `PASS`, later unchanged `OD-B04-01` Owner disposition, and the decision-aligned S6-04 gate. A subsequent authorization may reuse the existing Implementer task/worktree and preserved S6-04 state; this Candidate does not dispatch it.

| Slice | Scope / ownership | Dependencies | Required verification | Rollback | Independent gate / stop |
| --- | --- | --- | --- | --- | --- |
| `B04-V16-01` static activation | In `deploy/scripts/preflight-staging.sh` and host activation assets, replace only the dynamic shebang/bootstrap with §3 exact static package, manifest, first-instruction normalization, and downstream binding. Preserve V1.5 singular Node verifier and V1.4 custody/socket/tmpfiles contract. | accepted V1.5 source plan | signed package and dual-arch hashes; no `INTERP`/`NEEDED`; dynamic-control/static-hostile matrix; replaced-path zero-socket negatives | revert one bootstrap/activation replacement; S6-04 remains stopped | focused independent security review; stop on dynamic/floating/circular/new authority |
| `B04-V16-02` lock/action lifetime | In the same gate, implement §4 one FD9 ownership, exact acquisition exception, validation closure, lifecycle inheritance, separate PGID, traps, `wait -f`, status precedence, post-state and fail-closed recovery checks. | V16-01; unchanged Compose graph/action | dual-arch process tree, descriptor, contention, supported signals, parent/child/total-kill and no-second-action proof | revert the V16 gate as one unit; never retain V1.5 signal path beside it | focused lifecycle review; stop on early release/retry/second lock/launcher |
| `B04-V16-03` checker/runbook convergence | Update the existing checker tests, activation manifest, `deploy/host/README.md`, `docs/ENVIRONMENT_AND_DEPLOYMENT.md`, and `docs/OPERATIONS_RUNBOOK.md`; delete every conflicting dynamic-bootstrap/immediate-reacquire statement. No second documented raw start/recovery path. | V16-01/02 exact bytes | repository search, owner/mode/hash/link tests, exact signal feedback/recovery steps, raw-root ceiling | revert documentation/checker with V16 gate | independent planning/implementation review; stop on dual authority or ambiguous recovery |
| `B04-V16-04` unchanged whole-S6-04 evidence | Re-run V1.5 F-05 GLIDE/Valkey acceptance unchanged, real 1407/1408 matrix, exact OCI equality, runtime roles, detached SBOM/provenance/scan, bundle/AI gates. | V16-01 through 03 plus accepted V1.5 F-05 | every accepted V1.5 check plus V1.6 clean-exec/signal/recovery gates | return to accepted pre-S6-04 checkpoint and preserve evidence | independent S6-04 Review; any regression/nondeterminism stops |

No source Schema/Migration, application API, Provider, credential, network topology, secret, RateLimiter, FileScanner, package-manager runtime, or Production-AI authority changes are included.

## 7. Rollback, stop conditions, and Security & Test Simplification

Rollback is Replace, Not Layer: revert the single V1.6 gate/activation/checker/runbook replacement to the last accepted pre-S6-04 checkpoint and keep S6-04 stopped. Do not restore V1.5's dynamic interpreter or early-release lock as a fallback; do not retain both entries.

Stop immediately if:

- either architecture lacks the exact signed/static package or any loader/startup injection marker appears;
- the bootstrap needs a custom binary, service, daemon, setuid helper, new principal/group, persistent marker/lease, wrapper, or second launcher;
- any hostile execution/selector/path case reaches the protected socket or lifecycle action;
- acquisition does not receive FD9, a validation child retains FD9, the lifecycle tree loses it early, or a second gate acquires while first-action mutation may continue;
- supported signal/status behavior differs, child failure is hidden, automatic retry/cleanup appears, or Engine state is called stable while partial/changing/ambiguous;
- the 1407/1408, exact service/network/profile/resource, OCI, bundle, AI, secret, role, or reproducibility gates regress;
- F-05's exact ACL is broadened/reduced, a second limiter/readiness path appears, or the functional verifier is omitted; or
- implementation requires Schema/Migration, external/protected action, S6-05/S6-06, Owner presentation before Review PASS, or Stage 7.

| Principle | V1.6 result |
| --- | --- |
| Root Cause First | Removes the pre-`main()` loader surface and makes the lock lifetime equal the one lifecycle action, including supported-signal settlement. |
| Simplification First | One distro static interpreter and one Bash/flock process composition replace two defective assumptions; no new authority or state machine. |
| Replace, Not Layer | Dynamic bootstrap and parent-only lock semantics are deleted, not preserved as fallback. F-05 remains one accepted limiter path. |
| Fail closed | Hostile execution intent refuses before socket; contention refuses; ambiguous post-kill Engine state refuses before a second action. |
| Test integrity | Dynamic control proves causality; both architectures run hostile, descriptor, signal, real 1407/1408, and total-kill recovery challenges. |
| Operational honesty | Ordinary signals are deferred with feedback; simultaneous all-holder `SIGKILL` is documented as a process-lock ceiling with bounded recovery, not impossible persistence. |
| Persistent complexity | No new daemon, service, principal, lock, lease, database, table, Migration, or recovery authority. |

This bounded correction does not require a new Owner decision or ADR: it replaces a broken execution detail inside the already-reviewed singular Staging gate and uses a standard distro component. If implementation evidence instead requires any material authority listed in the stop conditions, return for the appropriate decision before code change.

## 8. Unchanged decisions and next gate

V1.6 does not alter the BuildKit/Next nondeterminism diagnosis, exact reproducibility requirement, release/build-ID/key classification, Options A-E, B04-D1 through B04-D5 as corrected through V1.5, direct Node/tsx runtime, profile/network/resource topology, AI prohibition/gates, exact closed F-05 boundary, or `OD-B04-01`. It makes no Production, Provider, deployment, or external-validation claim.

Next gate: **fresh independent Stage 6 S6-04 B-04 planning-amendment Review of V1.6 only**. Only a later `PASS` permits the coordinator to present unchanged `OD-B04-01`. No implementation, S6-05/S6-06, Owner presentation, or Stage 7 may start from this Candidate alone.
