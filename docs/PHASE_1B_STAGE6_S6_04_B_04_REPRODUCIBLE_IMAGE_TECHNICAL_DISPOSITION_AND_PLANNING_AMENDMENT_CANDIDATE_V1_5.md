# CWT Phase 1B Stage 6 S6-04 B-04 Reproducible-Image Technical Disposition and Planning Amendment Candidate V1.5

Status: **TECHNICAL LEAD REMEDIATION CANDIDATE — V1.4 F-04/F-05 closed at planning level; fresh independent planning re-review required; not implementation authorization, acceptance, or Owner presentation**

Date: **2026-08-31**

Candidate branch: `codex/phase-1b-stage6-s6-04-b04-planning-remediation-v1-5`

Required sole parent: `15d536042d002a251796e45b47b141320c33e56e` (V1.4 tree `cff5df59dae5ff3fce59765b4ce47ceaf0cbecf5`; sole parent `6da8450e40e54028926dccdccbc002762674196b`)

The V1.4 independent re-review is failed sibling-only evidence: commit `e0cabfc0010e1da1c5afc6815980ecb051e02e35`, tree `10441951101bde75f64ea83f1669ef0ec0f59a2a`, sole parent `15d5360...`, Review-file SHA-256 `168951e87064dc2813bb14bca3a3b031f85a34a7d0cf0bb225b24cdb624aec4b`. It and all earlier Review commits are excluded from this Candidate's ancestry.

V1.0 through V1.4 Candidate artifacts and sidecars remain byte-identical audit history. The read-only implementation checkpoint remains `de40457e2e99d118915998ed57be33257512c0df`; the intentionally dirty Implementer worktree remains outside this Candidate.

Authority boundary: **Stage 6 planning/remediation only. `OD-B04-01` is unchanged and must not be presented until V1.5 receives a fresh independent `PASS`. No implementation, host mutation, S6-05/S6-06, Provider/protected action, deployment, or Stage 7 is authorized. Stage 7 remains HOLD pending new explicit Owner authorization.**

## 1. Disposition and exact supersession

The V1.4 re-review retains F-01, F-02, F-03, exact OCI/Next/key findings, B04-D1 through B04-D5, Options A-E, AI authority, and `OD-B04-01`. It identifies two remaining execution-contract defects:

1. **F-04:** V1.4 freezes Docker subprocesses but not the gate process before its environment, identity, metadata, hash, lock, Node, and child-preflight operations. Caller startup state and command lookup can therefore redirect the sole authorized gate.
2. **F-05:** V1.4 repairs authenticated PING but freezes a named ACL that denies the accepted GLIDE/Lua limiter while granting broad `+script`, including `SCRIPT FLUSH`. The Staging start can therefore appear healthy while rate limiting is continuously unavailable.

V1.5 replaces only those conflicting V1.4 portions. The selected convergence is:

- one installed `/usr/local/sbin/cwt-staging-start` executable whose absolute `#!/bin/bash -p` interpreter establishes privileged-mode startup before any script operation;
- a Bash-builtin-only inherited-environment rejection and normalization phase before the first external command;
- absolute, pinned, root-owned dependencies for every later operation, with an install-time signed-package/source manifest as the non-circular trust root;
- one fixed-descriptor nonblocking host lock held by the parent through the exact Compose action and explicitly closed in every child;
- one existing Node graph/preflight child, with the former host/root shell preflights merged into it and deleted rather than retained as duplicate lookup surfaces;
- one exact named Valkey ACL derived from live `@valkey/valkey-glide@2.5.1` and the accepted fixed Lua script; and
- authenticated PING as container liveness, with the existing two-process functional verifier required by S6-04 acceptance rather than added to the operational start gate or duplicated as S6-05 readiness.

No wrapper framework, daemon, Docker proxy, retry controller, second launcher, second Compose file, second limiter/client, new secret/user, persistent lease, Schema/Migration, or architecture change is introduced. This is Root Cause First, Simplification First, and Replace, Not Layer.

## 2. One-to-one V1.4 Review closure

### 2.1 F-04 crosswalk

| V1.4 Review assertion | Corrected mechanism | Positive proof | Hostile negative proof | Rollback / stop condition | Future implementation locator |
| --- | --- | --- | --- | --- | --- |
| Gate-local `PATH` remains caller authority | Kernel loads absolute `/bin/bash -p`; the gate performs no sourced file, function, command substitution, process substitution, or external invocation before its builtin-only rejection/normalization phase. It then sets readonly `PATH=/usr/sbin:/usr/bin:/sbin:/bin`. Every later invocation still uses an absolute path. | Both architectures proceed with a hostile caller `PATH` and reach only the expected absolute fixtures. | Shadow `env`, `id`, `stat`, `sha256sum`, `flock`, `node`, `docker`, Compose plugin, and child preflight are never executed; protected-socket counter remains zero for rejected cases. | Roll back the single gate/preflight commit. Stop if any pre-sanitization external lookup, relative executable, or caller-selected child path exists. | `deploy/scripts/preflight-staging.sh`; gate-focused tests |
| Shell startup can import code/options | Privileged mode ignores `BASH_ENV`, `ENV`, `SHELLOPTS`, `BASHOPTS`, `CDPATH`, `GLOBIGNORE`, and exported functions during startup. The builtin scan also rejects any non-empty inherited entry in those exact classes or `BASH_FUNC_*`; zero args are required; aliases are cleared and no file is sourced/evaluated. | Exact gate executes under clean and hostile-but-irrelevant `PATH`/`HOME`/locale cases after normalization. | Non-empty `BASH_ENV`, `ENV`, exported function, shell-option, `CDPATH`, `GLOBIGNORE`, or positional argument exits before external operation, socket connection, or lifecycle event; injection markers remain absent. | Stop on another shell, non-privileged entry, sourced profile, `eval`, alias/function import, or an unclassified startup hook. | installed `/usr/local/sbin/cwt-staging-start`; source and static checker |
| Pre-Docker identity/metadata/hash/lock/Node/child paths are not frozen | After normalization, the only external identities are absolute and hash/version checked. V1.4 host/root checks are merged into the existing Node graph child at `/usr/local/libexec/cwt/preflight-compose-graph.mjs`; old shell child paths are removed. | Exact official package/binary identities execute on `linux/amd64` and `linux/arm64`; the child reports exact host/root/graph/state/headroom assertions. | A replacement at any absolute tool or child path fails owner/mode/hash/version validation before socket connection; a caller cannot substitute the path. | Stop on any extra child, unpinned binary, writable executable, hash mismatch, or retained old preflight authority. | gate, `preflight-compose-graph.mjs`, host activation manifest, tests |
| Trust claim can become circular | Protected activation verifies official signed package provenance and the accepted source/install manifest before installing the gate. Runtime treats `/bin/bash` and `/usr/bin/sha256sum` as explicit bootstrap anchors; it does **not** claim that a tool proves its own integrity against malicious root. `sha256sum` verifies all downstream bytes, then metadata/version checks bind custody and platform. | Official Noble package identities and exact `.deb`/binary hashes were independently recorded for both architectures. | Wrong package origin/version/hash or root-writable downstream artifact refuses activation/start. Raw malicious-root replacement remains outside the gate claim. | Stop if activation lacks signed-package/source-manifest custody or if runtime evidence claims self-verification. | host installation procedure and activation manifest; runbook |
| Lock can be bypassed/inherited incorrectly | Parent opens fixed FD `9`, proves path/descriptor device+inode equality, acquires `/usr/bin/flock --nonblock 9`, and retains FD 9 through checks/action. Every child command has literal `9>&-`; parent exit or signal releases the lock. | Concurrent second gate exits nonzero; holder retains exclusion across all checks and Compose start; normal completion releases immediately. | Contention makes zero socket connection/action. `SIGTERM` returns `143`; an immediate reacquire succeeds only after the parent exits. Child processes cannot retain the lock. | Stop if dynamic FD, inherited child FD, blocking wait, retry, stale lease, or a second lock appears. | gate and signal/contention tests |
| V1.4 Docker selector/socket/custody contract must remain | Before lock, builtins reject every non-empty inherited `DOCKER_*` or `COMPOSE_*`. Runtime retains exact root `0:0`, tmpfiles paths/modes, root-only `/run/docker.sock`, fixed empty CLI config, API `1.55`, and literal local endpoint/project/file/profile/service tokens. | Clean input reaches only `unix:///run/docker.sock`; exact root/file/socket/tool/daemon preconditions pass. | Current/future selector, alternate valid endpoint/context, malicious config/plugin path, unsafe lock/socket, non-root, and unknown arg all make zero protected-socket connection/lifecycle action. | Stop on caller-provided endpoint/file/project/profile/service/config, non-root Docker group, remote socket, or second topology. | gate, host templates/config, Node checker, deployment docs |

### 2.2 F-05 crosswalk

| V1.4 Review assertion | Corrected mechanism | Positive proof | Hostile negative proof | Rollback / stop condition | Future implementation locator |
| --- | --- | --- | --- | --- | --- |
| Named ACL was inferred from PING | Inspect exact accepted `src/security/valkey-rate-limiter.ts`, `@valkey/valkey-glide@2.5.1`, and accepted two-process semantics. Freeze the observed handshake/script/key-command closure, not a health-only guess. | Both architectures and both application networks complete client naming, cold script load, `EVALSHA`, atomic `30/31`, TTL/PTTL/reset, and action isolation. | Any required operation returning `NOPERM` or `unavailable` in healthy state fails acceptance. | Roll back the one generated named-user line. Stop on client/script/version change until the wire/ACL closure is re-derived. | `deploy/valkey/entrypoint.sh`; existing S6-02 verifier |
| Required operations are denied | Replace the named line with exact `+ping +client\|setname +script\|load +evalsha +incr +pexpire +pttl`, retaining `-@all`, exact environment key prefix, `resetchannels`, separate named user/secret, and V1.4 disabled default user. | Exact GLIDE clients perform the accepted Lua flow; first write sets TTL; subsequent requests preserve/reset it exactly. | Wrong/cross/default authentication and cross-prefix calls fail; stopped service returns typed unavailable. | Stop if `EVAL`, `SELECT`, `INFO`, broad category access, a second client/user/secret, or a shared prefix is required. | Valkey entrypoint/ACL checker and verifier |
| Broad `+script` permits administration | Delete broad `+script`; grant only `+script\|load`. `SCRIPT FLUSH` and all other unnecessary script administration/discovery remain denied. | Cold cache performs `SCRIPT LOAD`, then `EVALSHA`; warm path uses `EVALSHA`. | `SCRIPT FLUSH`, `KILL`, `EXISTS`, `DEBUG`, and `SHOW` all return authorization denial. | Stop if implementation adds broad script permission or suppresses a denial. | generated ACL exact-byte test and live denial matrix |
| GLIDE initialization boundary is incomplete | Permit only `CLIENT SETNAME`. Exact 2.5.1 attempts `CLIENT SETINFO` best-effort; denial does not prevent cold/repeated readiness and remains an expected audited denial, not permission creep. | Repeated cold clients set the configured name and pass the full limiter matrix. | `CLIENT GETNAME`, `SETINFO`, `ID`, `INFO`, `LIST`, `KILL`, `PAUSE`, `UNPAUSE`, tracking/caching/redirect/unblock and other subcommands are denied. | Stop if a pinned-client update makes `SETINFO` or another subcommand required, changes failure behavior, or produces unbounded log churn. | exact GLIDE pin/source trace; ACL tests |
| PING can make S6-04 false green | Compose health remains authenticated named-user `REDISCLI_AUTH` PING and is described only as container/network/auth liveness. The existing S6-04 acceptance harness must run the accepted functional two-process verifier from each matching backend network after the positive gate. The operational Staging gate does not run a rate-limit canary. | Health becomes exact `PONG`; separate functional acceptance proves real limiter behavior on both architectures/environments. | Healthy PING plus failed limiter verifier fails S6-04. No gate success is accepted from PING alone. | Stop if a runtime canary is layered into the gate, S6-05 readiness is duplicated, or S6-04 omits functional proof. | `compose.yaml`; existing verifier/release-image tests; evidence report |
| Fail-closed/recovery and denial surface need proof | Exact service-stop test holds the same client/process, observes non-success without replay, restarts the same pinned service, and proves later recovery. Administrative/discovery/key/data surfaces outside closure remain denied. | Same process recovers; first post-restart consume is count `1` because Valkey has no persistence and the failed call is not replayed. | Wrong user/password, cross environment/prefix, disabled default, `CONFIG`, `ACL`, `MODULE`, shutdown/flush/key scan/discovery/data commands all deny. | Stop on offline queue/replay, fallback memory limiter, retained cross-environment access, or any denied admin command succeeding. | limiter verifier and Valkey live denial/recovery tests |
| Actual gate must be rerun | Retain the unmodified singular action, exact health strictness, 1408 MiB threshold, and four-service allowlist. Apply only the planned bootstrap/ACL/health corrections. | `1408 MiB` exits `0`; exact four Staging services run; Production Scheduler stays paused and Worker absent. | `1407 MiB` and every selector/lock/state hostile case refuse before start with state unchanged. | Stop on timeout, extra/missing service, Production mutation, cross-network attachment, or a weaker wait/health check. | gate integration test, Compose graph checker, runbook |

## 3. F-04 frozen bootstrap and host authority

### 3.1 First-operation contract

The repository source remains `deploy/scripts/preflight-staging.sh`. Protected activation installs the reviewed bytes as a real root-owned regular file at `/usr/local/sbin/cwt-staging-start`, owner/group `0:0`, mode `0555`, link count `1`, with no symlink or writable parent. Its first line is exactly:

```bash
#!/bin/bash -p
```

The absolute interpreter and privileged flag are part of the executable identity. Before the first external command, the script uses Bash builtins and `/proc/self/environ` redirection only to:

1. require privileged option `p`, `EUID=0`, `UID=0`, and zero positional arguments;
2. read the inherited environment as NUL-delimited entries without invoking `env`, `sed`, `grep`, `awk`, or another process;
3. reject every non-empty `DOCKER_*`, `COMPOSE_*`, `BASH_ENV`, `ENV`, `SHELLOPTS`, `BASHOPTS`, `CDPATH`, `GLOBIGNORE`, or `BASH_FUNC_*` entry;
4. execute builtin `unalias -a`, clear the relevant mutable names, reset the command hash, fix `IFS`, set fail-fast/pipe behavior, and set `umask 077`; and
5. assign readonly/exported `PATH=/usr/sbin:/usr/bin:/sbin:/bin`, `HOME=/root`, `LANG=C`, `LC_ALL=C`, and `TZ=UTC`.

There is no sourced file, `eval`, caller function, command/process substitution, relative command, configurable path, or user argument in this phase. GNU Bash privileged mode is the standard mechanism that prevents startup-file, exported-function, and inherited shell-option influence; the explicit rejection provides a reviewable fail-closed record instead of silently accepting ignored hostile intent.

After this phase, exact `/usr/bin/id` confirms effective and real UID/GID `0:0`. Any mismatch exits before lock or Docker access. Root can invoke raw Docker or replace trusted host packages outside this gate; V1.5 does not claim otherwise. The claim is narrower: no inherited caller selector or command-search authority is accepted inside the one repository-controlled start path.

### 3.2 Non-circular tool identity

Host activation, not runtime self-hashing, is the trust root. It verifies official signed package provenance, exact package bytes, accepted repository source hashes, root ownership/modes, and the release manifest before exposing the gate. At runtime `/bin/bash` and `/usr/bin/sha256sum` are explicit bootstrap anchors. The plan does not claim they can prove themselves against a malicious root; `sha256sum` binds every downstream executable/config/script to the activation manifest, and exact metadata/version checks detect ordinary drift.

The disposable dual-architecture selection froze these official identities:

| Identity | `linux/amd64` | `linux/arm64` |
| --- | --- | --- |
| Ubuntu base | `ubuntu:24.04@sha256:33ceb71981b602c1a7443a53469e4dba065f7503eab3078a2d7a57a2ab987517` | same multi-arch index |
| Node base | `node@sha256:d8e448a56fc63242f70026718378bd4b00f8c82e78d20eefb199224a4d8e33d8` | same multi-arch index |
| Bash package / binary SHA-256 | `5.2.21-2ubuntu4` / `bc5945feb8bd26203ebfafea5ce1878bb2e32cb8fb50ab7ae395cfb1e1aaaef1` | same package version / `af955ef55333c8fc9c5aa50df91ad1a629d9a79a9afa125cd5e9629585f78015` |
| `/usr/bin/env` | `0aefff8f912fb75716c5d4de3b6acde93edbe8fa280fc8ee895c1226d3e373ef` | `dde57443115af498aa981159ba6517b156547173342af36487ed58631d9e47c3` |
| `/usr/bin/id` | `9f2e8d80e1c357b889e1b827566e882411ddc6ff45a70196e808f00e62a6c7c5` | `3b3b0197ad50b7e388e433e4e116bca4c860214148c108909154eb516d2dc9ed` |
| `/usr/bin/stat` | `3b87d297111f11d30b3c51fd2663f131a161e09d8e130e1842adaefb74307efe` | `86b89355842f54a49698069b345eabb94c2f26d2f33b5734ec91c68de8fe6f7a` |
| `/usr/bin/sha256sum` | `9992e1f1feb6f0f396bc8d6691ebc1adbfc269fd628bce84eda1d4ba5c3995c7` | `f3d040161f5c29e4c7cd4e3d6bb513ce9a43b9d1bd06f456a6aab3d34d0f1e33` |
| `/usr/bin/flock` | `487fc764723f08f70a630c517b6847165efab683d42a62f03956320a150cf801` | `2cd7af43ad6967d6049c882ccd914623e30db81e29e7d69e430c4aaa59d44144` |
| `/usr/bin/node` `24.14.0` | `e237a2839d0cbdc9a9a2adda1a184afc0f5b20306ffbe923af5686550472d8a8` | `9fbdfa827e8827fe757d063f791df12f94092a4e7f0d32df758b2799114311e5` |
| `/usr/bin/docker` `29.6.2` | `628af575ee8499596e7d266c221ee6bb74fbc20de3a81dd6fe5106f81e652db4` | `a35dd75f7309ee7ab912cc108cba220a4864cb058d091c4515ae27e8c7126c11` |
| Compose plugin `5.3.1` | `f9ebc6ebdb19d769b793c245a736caaeb198c62587f13b25c660c13b4987f959` | `aa611e811d0ea25897839c404bfb5bf93ce706dc51c500a4457890f5d0606a86` |

Coreutils is exact `9.4-3ubuntu6.2`; util-linux is `2.39.3-9ubuntu6.5`. Official Docker `.deb` SHA-256 values are `fcc3014d...` / `95b1e7df...` for CLI amd64/arm64 and `19d9473c...` / `6ee2017f...` for Compose amd64/arm64; the evidence manifest carries the complete values. Implementation must record exact final gate, Node-child, root `compose.yaml`, and config hashes in the activation manifest after those bytes exist. A placeholder, dynamic lookup, architecture mismatch, or unrecorded upgrade is a stop condition.

### 3.3 Exact paths and singular child

Every protected path is a real, non-symlink, root-owned object with the exact mode/link constraints below:

| Path | Exact contract |
| --- | --- |
| `/usr/local/sbin/cwt-staging-start` | regular `0:0`, `0555`, link count `1`, activation-manifest SHA-256 |
| `/usr/local/libexec/cwt/preflight-compose-graph.mjs` | regular `0:0`, `0444`, link count `1`, activation-manifest SHA-256 |
| `/etc/cwt/compose.yaml` | regular `0:0`, `0444`, link count `1`; byte-identical installed copy of repository-root `compose.yaml`, release-manifest SHA-256 |
| `/etc/cwt/compose.env` | regular `0:0`, `0600`, link count `1`; fixed non-secret schema; no literal secret or selector variable |
| `/etc/cwt/docker-cli/config.json` | regular `0:0`, `0600`, exact `{}` plus LF, SHA-256 `ca3d163bab055381827226140568f3bef7eaac187cebd76878e0b63e9e442356` |
| `/run/lock/cwt` / `staging-start.lock` | V1.4 exact root:root `0700` directory / root:root `0600`, size-zero, link-count-one regular file |
| `/run/docker.sock` | V1.4 exact root:root `0600`, link-count-one Unix socket, no symlink |

`/etc/cwt/compose.yaml` is not a second topology authority: it is the byte-identical protected installation of the sole repository-root `compose.yaml`; activation and the checker reject any hash mismatch or independently edited copy.

The former `deploy/scripts/preflight-host.sh` and `deploy/scripts/preflight-roots.sh` logic is merged into the existing `deploy/scripts/preflight-compose-graph.mjs` and the old shell paths are deleted. The Node child uses Node standard APIs for host memory, filesystem write/fsync/atomic-rename/delete, graph/state/resource checks, and exact absolute Docker subprocesses. This reduces lookup surfaces and leaves one public gate plus one private verifier, not a second start or topology authority.

### 3.4 Lock, Docker, and action contract

The gate opens exact FD `9`, validates the path and open descriptor, then executes `/usr/bin/flock --nonblock 9`. Every child invocation, including `stat`, `sha256sum`, Node, Docker, and Compose, includes literal `9>&-`. Only the parent owns the advisory lock, and it holds it through the final action; normal exit and signals release it automatically.

Every Docker child uses an exact empty environment plus fixed values and the same literal authority:

```text
/usr/bin/env -i PATH=/usr/sbin:/usr/bin:/sbin:/bin HOME=/root LANG=C LC_ALL=C TZ=UTC DOCKER_API_VERSION=1.55 \
  /usr/bin/docker --config /etc/cwt/docker-cli --host unix:///run/docker.sock ... 9>&-
```

The final action is fixed and accepts no appended token:

```text
/usr/bin/docker --config /etc/cwt/docker-cli --host unix:///run/docker.sock \
  compose --env-file /etc/cwt/compose.env --project-name cwt \
  --file /etc/cwt/compose.yaml --profile staging \
  up --detach --wait --wait-timeout 120 --no-deps \
  web-staging worker-staging scheduler-staging valkey-staging
```

V1.4 principal, tmpfiles, root-only socket, exact daemon/security, default-five/profile/network/resource, paused Production Scheduler, absent Production Worker, 1408 MiB headroom, and no raw documented Staging start requirements remain unchanged. A root principal can bypass repository policy with raw Docker; that remains under host custody/audit and outside this gate's authorization claim.

## 4. F-05 exact Valkey/GLIDE boundary

### 4.1 Source-derived least-privilege ACL

The accepted limiter uses exact `@valkey/valkey-glide@2.5.1` behind the singular provider-neutral `RateLimiter` boundary. The fixed Lua script performs `INCR`, first-write `PEXPIRE`, and `PTTL`. Live cold-client tracing against exact Valkey `8.1.9` showed:

```text
HELLO 3 AUTH
CLIENT SETNAME
EVALSHA -> NOSCRIPT
SCRIPT LOAD
EVALSHA
Lua: INCR; first-write PEXPIRE; PTTL
```

The selected generated named-user line is exactly:

```text
user cwt-<environment> on >${password} resetkeys ~cwt:<environment>:rate:* resetchannels -@all +ping +client|setname +script|load +evalsha +incr +pexpire +pttl
```

There is no `+eval`, broad `+script`, `+select`, `+info`, category grant, shared prefix, or cross-environment credential. The V1.4 protected-mode-compatible disabled default user remains exactly:

```text
user default off resetpass >${password} resetkeys ~* resetchannels &* -@all
```

`protected-mode yes`, no persistence, no public port, separate Valkey services/networks/secrets, and exact `cwt:<environment>:rate:*` prefixes remain. `CLIENT SETINFO` is intentionally denied: exact GLIDE 2.5.1 attempts it best-effort, but five repeated cold starts and the complete matrix succeed. A client upgrade that makes it required or changes this behavior requires a new closure derivation and stops implementation.

### 4.2 Liveness versus readiness

The two V1.4 health corrections remain exact:

```text
REDISCLI_AUTH=$$(cat /run/secrets/production-valkey-password) valkey-cli --user cwt-production ping | grep -qx PONG
REDISCLI_AUTH=$$(cat /run/secrets/staging-valkey-password) valkey-cli --user cwt-staging ping | grep -qx PONG
```

They prove authenticated process/network/user liveness only. They do not prove Lua readiness and must never be described as doing so.

The authorized Staging start gate does **not** run a functional canary. Adding one would mutate rate-limit state on every operational start, couple the host lifecycle gate to application semantics, and duplicate the later S6-05 ongoing readiness authority. Instead, S6-04 acceptance must run the already accepted two-process limiter verifier from both matching backend networks against the just-started exact release image and pinned Valkey. A green PING plus a failed functional verifier is an S6-04 failure. S6-05 later retains ongoing `SharedRateLimiter.readiness()` ownership; V1.5 does not pre-implement or duplicate it.

### 4.3 Required positive, recovery, and denial proof

On both `linux/amd64` and `linux/arm64`, and separately for Production and Staging, exact Node `24.14.0`, GLIDE `2.5.1`, and Valkey image `valkey/valkey:8.1.9@sha256:f0ba225266310efba5fb33383e21c64fbd07907304224786c780606e7ebd7327` must prove:

- matching backend network only; `CLIENT SETNAME`; cold `SCRIPT LOAD`; `EVALSHA` invocation;
- two independent processes jointly allow exact `30`, reject `31`, and preserve action isolation;
- first write establishes positive bounded TTL, `PTTL` is returned, and expiry resets the next window;
- stopping/unhealthy service yields typed fail-closed non-success; same-process restart recovery succeeds later without offline replay or fallback; first post-restart count is `1` under no persistence; and
- no secret value appears in command args, environment evidence, inspect output, process listing, or logs; probe clients read mounted Synthetic secret files.

Every environment/architecture must also deny:

- missing/wrong password, wrong user, opposite-environment user/secret, disabled default user, and opposite key prefix;
- `SCRIPT FLUSH`, `SCRIPT KILL`, `SCRIPT EXISTS`, `SCRIPT DEBUG`, and `SCRIPT SHOW`;
- every `CLIENT` subcommand except `SETNAME`, including `GETNAME`, `SETINFO`, `ID`, `INFO`, `LIST`, `KILL`, `PAUSE`, `UNPAUSE`, tracking/caching/no-evict/no-touch/getredir/unblock controls;
- `CONFIG`, `ACL`, `MODULE`, `SHUTDOWN`, `FLUSHALL`, `FLUSHDB`, `KEYS`, `SCAN`, `INFO`, `COMMAND`, `DBSIZE`, `ROLE`, `MONITOR`, `MEMORY`, `SLOWLOG`, `LATENCY`, `PUBSUB`, `PUBLISH`, `SELECT`, and `SWAPDB`; and
- ordinary `GET`, `SET`, and `DEL`, because the accepted Lua path has no direct data-command authority.

Any unexpected success, command not covered by the exact trace, GLIDE offline queue/replay, second limiter, or shared credential/prefix is a stop condition.

## 5. Gate, topology, and resource non-regression

The post-correction disposable replay retained the exact V1.3/V1.4 operational contract:

- at `1407 MiB`, the gate exited nonzero before Staging create/start; existing service state remained unchanged;
- at `1408 MiB`, the unchanged final action exited `0` before `120s` and started exactly `web-staging`, `worker-staging`, `scheduler-staging`, and `valkey-staging`;
- `worker-production` remained absent/stopped, `scheduler-production` remained paused, and the default foundation remained running;
- Staging services attached only to their exact Staging networks; Production services retained their exact Production memberships; no cross-environment attachment appeared; and
- the exact default/profile/resource arithmetic and two private database networks with one PostgreSQL instance remained unchanged.

F-01 direct Node `24.14.0` plus exact `tsx@4.23.1`, package-manager-free runtime, explicit async main/error handling, and dual-architecture role proof remain closed. F-02 exact default five and dormant `production-ai`/restart `no` remain closed. F-03 one root Compose, one locked gate, exact four-service allowlist, and no raw authorized start remain closed.

## 6. Bounded implementation slices

Implementation remains stopped pending a fresh V1.5 planning `PASS`, later unchanged `OD-B04-01` Owner disposition, and the required decision-aligned gate. If those gates pass, the existing Implementer task/worktree may resume its preserved S6-04 state; no new Implementer is required. It must implement these slices serially and submit each as one reviewable replacement, not parallel authority.

| Slice | Scope / ownership | Dependencies | Required verification | Rollback | Independent next gate / stop |
| --- | --- | --- | --- | --- | --- |
| `B04-V15-01` trusted bootstrap | Rewrite `deploy/scripts/preflight-staging.sh`; exact `bash -p`, builtin first phase, full inherited-intent rejection, fixed env/paths, absolute tools, FD9 closure, installation metadata. | accepted V1.4 gate and host contract | static no-pre-external-op checker; dual-arch clean/hostile PATH/startup/function/tool substitution; zero socket/action negatives | revert one gate replacement | focused independent security review; stop on lookup/injection/circular claim |
| `B04-V15-02` singular child convergence | Merge host/root checks into `deploy/scripts/preflight-compose-graph.mjs`; delete `preflight-host.sh` and `preflight-roots.sh`; exact absolute Docker child/env; bind installed root Compose hash and four-service allowlist. | V15-01 | graph/profile/network/resource/root/fs/daemon mutation tests; no old path/reference; exact Node/tool hash | restore the accepted V1.4 three-file plan only if V15-01 is also rolled back; never run both | focused topology/host review; stop on second entry/topology/relative child |
| `B04-V15-03` host activation assets | Retain V1.4 tmpfiles and socket drop-in; add source-to-installed-artifact manifest/config schema and exact package/binary/source hashes; update `deploy/host/README.md`, environment/deployment and operations docs. | V15-01/02 bytes finalized | signed-package/hash/owner/mode/link/path validation; cold/idempotent tmpfiles; socket/lock hostile matrix; runbook search | uninstall only versioned CWT assets under reviewed host recovery; restore previous root Compose/gate as one unit | protected-host action remains separately unauthorized; stop on real host mutation in this task |
| `B04-V15-04` named ACL replacement | In `deploy/valkey/entrypoint.sh`, replace the V1.4 named ACL with §4.1 exact line; retain disabled default line/protected mode/isolation. In `compose.yaml`, retain the two exact `REDISCLI_AUTH` healthchecks. | accepted S6-02 source/client/script | exact generated ACL bytes; live GLIDE matrix and full denial set on both architectures/environments | revert the single named-user line and stop; do not restore broad V1.4 ACL to production eligibility | focused independent security review; stop on missing/broad/new authority |
| `B04-V15-05` functional/lifecycle evidence | Extend the existing S6-02 verifier and deployment tests; no new framework/client. Run matching-network cold/warm/two-process/TTL/recovery/denial/secret scan, then exact 1407/1408 gate matrix. | V15-01 through 04; exact release artifacts | all §4.3 and §5 assertions; zero secret; no replay; exact service/network/state inventory | rollback all V15 runtime-affecting slices together | independent S6-04 Review; stop on semantic-only/PING-only result |
| `B04-V15-06` reproducible-image non-regression | Rerun unchanged B04-D1-D5 evidence contract: two clean-cache dual-arch builds, exact OCI equality, runtime role proof, detached provenance/SBOM/scan, Next/AI/bundle gates. | complete corrected S6-04 tree | exact index/manifest/config/layer/diff-ID/file equality and all accepted role/gate checks | return to accepted pre-S6-04 checkpoint; preserve evidence | independent S6-04 Review; any nondeterminism/unsupported arch stops |

No package or lock change is expected. Node `24.14.0`, pnpm `11.9.0` build toolchain, `tsx@4.23.1`, GLIDE `2.5.1`, Valkey `8.1.9`, Debian/glibc base, Supercronic, and exact dual architectures remain pinned. No Schema/Migration is expected; discovery of one stops for Owner decision and draft ADR.

## 7. Rollback and stop conditions

Rollback is Replace-Not-Layer: revert the V1.5 gate/preflight/host-assets/ACL/health/test/runbook set to the last accepted S6-04 checkpoint and leave S6-04 stopped. Do not keep a legacy gate, broad ACL, alternate client, fallback in-memory/HTTP limiter, or second Compose path beside the selected mechanism.

Stop before implementation/review completion if any of the following occurs:

- the gate performs any external or relative lookup before sanitization, accepts a caller startup/selector/argument influence, or cannot prove zero socket/action for hostile cases;
- absolute tools/scripts/config are writable, wrong-owner/mode/link/type/hash/version, unpinned, architecture-mismatched, or trust evidence becomes self-referential;
- FD9 is inherited by a child, lock exclusion survives only through retry/wait, or signal release is not immediate;
- raw or alternate Docker/Compose invocation becomes a documented authorized Staging path, or a second topology/config authority appears;
- the ACL needs broad categories, `EVAL`, broad `SCRIPT`, another client/user/secret/prefix, cross-environment access, or an untraced command;
- any prohibited script/client/admin/discovery/data command succeeds, any matching operation fails under healthy state, or `CLIENT SETINFO` behavior changes materially;
- health is claimed as functional readiness, the operational gate gains a limiter canary, or S6-05 readiness is duplicated;
- 1408 cannot start exactly four Staging services before 120 seconds, 1407 creates anything, Production state changes, or networks cross;
- exact OCI equality, runtime roles, bundle/AI gates, secret absence, fail-closed behavior, or later same-process recovery fails;
- implementation needs Schema/Migration, persistent state/lease/worker, purchase, external action, Provider/protected access, S6-05/S6-06, or Stage 7.

## 8. Security & Test Simplification Check

| Principle | V1.5 result |
| --- | --- |
| Root Cause First | Freezes the gate before its first external operation and derives ACL from the real accepted client/script path. |
| Simplification First | Deletes two shell child preflights, uses Bash privileged mode/absolute standard tools, and replaces one ACL line. |
| Replace, Not Layer | One gate, one Node verifier, one root Compose, one named limiter user/client/path; old lookup surfaces and broad ACL are removed. |
| Least privilege | Exact root custody, exact local socket, exact command/subcommand ACL, environment prefix, disabled default user, and comprehensive denial matrix. |
| Fail closed | Hostile intent/state refuses before Docker; unavailable limiter returns typed non-success; no replay/fallback. |
| Test integrity | Authenticated PING is liveness only; acceptance requires real GLIDE/Lua/two-process/recovery proof and exact lifecycle inventory. |
| Persistent complexity | No new durable state, daemon, lease, service, client, secret, database, or migration. |

No new Owner decision or ADR is required for this bounded repair: it narrows an already-required host gate and makes the already-accepted limiter executable. If implementation requires any new operational principal, daemon/proxy, second topology/client, materially different runtime, persistent coordination, or architecture/commercial/security direction, stop and escalate before code change.

## 9. Unchanged decisions and next gate

V1.5 does not alter the BuildKit/Next nondeterminism diagnosis, exact reproducibility requirement, release/build-ID and key-secret classification, Options A-E, B04-D1 through B04-D5 as corrected through V1.4, F-01/F-02/F-03 closures, AI prohibition/gates, or `OD-B04-01`. It makes no Production, Provider, deployment, or external validation claim.

Next gate: **fresh independent Stage 6 S6-04 B-04 planning-amendment Review of V1.5 only**. A `PASS` is required before the coordinator may present unchanged `OD-B04-01`. No implementation may resume from this Candidate alone. Stage 7 remains **HOLD** and requires new explicit Owner authorization.
