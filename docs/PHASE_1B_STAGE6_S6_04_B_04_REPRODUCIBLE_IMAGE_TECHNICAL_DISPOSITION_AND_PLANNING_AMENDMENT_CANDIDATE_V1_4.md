# CWT Phase 1B Stage 6 S6-04 B-04 Reproducible-Image Technical Disposition and Planning Amendment Candidate V1.4

Status: **TECHNICAL LEAD REMEDIATION CANDIDATE — F-04/F-05 CLOSED AT PLANNING LEVEL; fresh independent planning re-review required; not implementation authorization, Owner presentation or acceptance**

Date: **2026-08-31**

Required sole parent: `6da8450e40e54028926dccdccbc002762674196b` (V1.3 tree `fc05ec36a267471186a45cc8727aa8fcd9a05d24`)

Sibling-only failed Reviews, excluded from Candidate ancestry:

- V1.0 Review `a1a4321ae9741f51dd026ca854b7d6d829390dea`;
- V1.1 re-review `a694946af822f122e4a2586a42ee39e5978b244e`;
- V1.2 re-review `a333f4b71b2c12f7a7164a2d7c4688f87a98bef2`; and
- V1.3 re-review `662e5d28b1575dd276620eb81587a9f651d42863` (tree `ce27e34460c4e597625fb6f98c908be45421c1f7`; sole parent `6da8450...`; Review-file SHA-256 `77e2e24cd23773d2a6884cda4a4901db3912f7209de490c7b6a1e9d4e6f8b998`).

V1.0 through V1.3 artifacts remain byte-identical audit history. The read-only implementation checkpoint remains `de40457e2e99d118915998ed57be33257512c0df`; the dirty Implementer worktree remains outside this Candidate.

Authority boundary: **Stage 6 planning/remediation only. `OD-B04-01` is unchanged and must not be presented until V1.4 receives a fresh independent `PASS`. No implementation, host mutation, S6-05/S6-06, Provider/protected action, deployment or Stage 7 is authorized. Stage 7 remains HOLD pending new explicit Owner authorization.**

## 1. Disposition and exact supersession

The V1.3 re-review accepts the singular locked Staging gate direction and keeps F-01, original F-02 and the F-03 mechanism closed. It identifies two executable defects:

1. **F-04:** the gate can inherit a caller-selected Docker daemon/context/config/plugin authority, and its protected principal, lock and socket custody are not exact; and
2. **F-05:** both real Valkey healthchecks use an environment name unsupported by the pinned Valkey `8.1.9` binary, so the exact `--wait-timeout 120` positive cannot complete.

V1.4 supersedes only the conflicting V1.3 lock/target/tool wording and the incomplete Valkey ownership. It retains one root `compose.yaml`, one repository-controlled Staging start gate, exact default five, the exact four-service Staging allowlist, dormant `production-ai`, resource and database-network arithmetic, direct Node/`tsx` roles, exact OCI equality, Next/key findings, B04-D1 through B04-D5, Options A-E, AI authority and unchanged `OD-B04-01`.

The selected correction is standard and bounded:

- one root-only operations principal (`UID:GID 0:0`), no Docker-equivalent non-root group;
- one `systemd-tmpfiles`-provisioned lock parent/file and one root-only local Docker socket;
- fail-closed rejection of every non-empty inherited `COMPOSE_*` or `DOCKER_*` variable, followed by a sanitized exact Docker invocation;
- exact two healthcheck token corrections from `VALKEYCLI_AUTH` to `REDISCLI_AUTH`; and
- one causal Valkey startup correction required by the mandated cross-container proof: keep `protected-mode yes`, keep the named least-privilege ACLs, and give the disabled default user the same environment-private password so protected mode permits authenticated non-loopback clients. The default user remains `off` and `-@all`; no new secret or authentication authority is created.

Disabling Valkey protected mode also made remote named-user authentication work in a disposable comparison, but is rejected because the selected one-line generated-ACL correction preserves defense in depth. A custom socket relay, Docker proxy, daemon, launcher, sidecar, lease or second Compose file is not part of implementation.

These changes narrow authority and repair broken readiness/connectivity. They add no service, database, Schema/Migration, Provider capability or durable coordination. No new Owner decision or ADR is required. If implementation instead needs a non-root Docker group, remote Docker endpoint, daemon/proxy, additional Valkey secret/user, second topology authority or architecture change, stop and escalate.

## 2. One-to-one Review closure

### 2.1 F-04

| F-04 element | V1.4 closure | Decisive gate |
| --- | --- | --- |
| Docker endpoint/context can be inherited | Before lock or Docker access, the gate rejects every non-empty environment entry whose name begins `DOCKER_` or `COMPOSE_`. This includes `DOCKER_HOST`, `DOCKER_CONTEXT`, `DOCKER_CONFIG`, `DOCKER_CERT_PATH`, `DOCKER_TLS_VERIFY`, `DOCKER_API_VERSION`, `DOCKER_CLI_PLUGIN_EXTRA_DIRS` and all prior Compose selectors. | Prefix-complete hostile matrix plus alternate valid context/socket; each rejection makes zero connection to the protected Docker socket and zero project lifecycle change. |
| Root CLI config/currentContext/plugin path can redirect | Every Docker call uses a scrubbed environment, fixed `/usr/bin/docker --config /etc/cwt/docker-cli --host unix:///run/docker.sock`, fixed API `1.55`, and exact root-owned `{}` config bytes. | Malicious root-home config, credential helper and plugin-dir fixtures are ignored/rejected; exact socket alone receives connections. |
| Principal is unnamed | Protected invocation is only root, exact `UID:GID 0:0`; no `docker` group or second operator principal is created. | UID or primary GID other than zero refuses before opening the lock or Docker socket. |
| Lock custody is vague | Exact parent `/run/lock/cwt`, root:root `0700`; exact regular file `/run/lock/cwt/staging-start.lock`, root:root `0600`, size zero and link count one. | Missing/wrong type/symlink/hardlink/owner/group/mode/content/unopenable and parent-link-count cases refuse before Docker. |
| Lock creation authority is absent | One `systemd-tmpfiles` template and one exact root installation/create workflow own ephemeral `/run` creation. Gate verification remains mandatory because tmpfiles creation alone is not proof of safe pre-existing paths. | Cold create, idempotent create and every hostile pre-created state are replayed; no daemon or persistent lease appears. |
| Socket identity is vague | Exact `/run/docker.sock`, Unix socket, root:root `0600`, link count one, no symlink; standard `docker.socket` drop-in owns creation. | Missing/symlink/regular/FIFO/hardlink/wrong-owner/group/mode sockets refuse before Docker API use. |
| Selected daemon could still be wrong | Host preflight freezes Linux/Ubuntu, Docker/Compose/API, storage/cgroup/security/log/live-restore/rootless/listener properties before project-state inspection. | Each property mutation refuses; no target-host claim is made from the local Docker Desktop lab. |
| Raw root bypass | Root can still invoke raw Docker outside the repository gate; that remains outside the authorized operational contract and under root custody/audit. | Runbooks expose only the gate; no false technical-impossibility claim is made. |

### 2.2 F-05

| F-05 element | V1.4 closure | Decisive gate |
| --- | --- | --- |
| Both healthchecks use unsupported `VALKEYCLI_AUTH` | Exactly the Production and Staging tests use `REDISCLI_AUTH`; every other token, secret-file read, username, `grep -qx PONG`, interval, timeout, retries and start period remains unchanged. | Normalized Compose contains exactly two `REDISCLI_AUTH` tests and zero `VALKEYCLI_AUTH`, `-a`, unauthenticated or process-only substitute. |
| Matching credentials must return `PONG` | Exact `valkey/valkey:8.1.9@sha256:f0ba2252...` runs both environment-private services; health and a separate same-network client use matching named credentials. | Both local health and cross-container named-user commands return exactly `PONG`. |
| Existing protected config blocks non-loopback clients | Generated default ACL becomes `user default off resetpass >${password} resetkeys ~* resetchannels &* -@all`; named environment ACL is byte-semantically unchanged and `protected-mode yes` remains. | Remote named user succeeds; default user remains unable to authenticate even with the environment password; no new secret/user exists. |
| Wrong/cross credentials or keyspace could pass | Production/Staging use different Synthetic secrets, separate services/networks and exact `~cwt:<environment>:rate:*` patterns. | Missing, wrong, opposite-environment secret/user and opposite prefix are non-`PONG`/denied; environment keys are not visible across services. |
| Secret could enter process/evidence | Password is read inside `CMD-SHELL` from the environment-specific secret file into `REDISCLI_AUTH`; no `-a` or literal appears. | Container args, health definition, process list and logs contain no password bytes. |
| Actual positive timed out | The singular gate command is unchanged; with the two corrected healthchecks and the selected ACL prerequisite, exact `1408 MiB` local/Synthetic replay completes before `120s`. | Exit `0`; exact four Staging creates/starts; nine total; paused Production Scheduler; absent Production Worker; exact Staging networks. |

F-05's cross-container proof exposed the current `protected-mode yes` plus disabled-`nopass` default-user incompatibility. Treating only the local healthcheck would have produced a false green while application clients remained denied. The default-user line above is therefore part of F-05 root-cause closure, not an optional expansion or second authentication path.

## 3. Frozen protected host contract

### 3.1 Principal and protected paths

The sole protected operations principal is root, exact `0:0`. There is no `docker`-socket group member, sudo-to-Docker role, delegated API proxy or remote endpoint.

| Path | Exact type / custody / content |
| --- | --- |
| `/run/lock/cwt` | real directory, not symlink; `root:root`; `0700`; no unexpected subdirectory/link-count drift |
| `/run/lock/cwt/staging-start.lock` | real regular file, not symlink; `root:root`; `0600`; link count `1`; size `0`; read/write open succeeds |
| `/run/docker.sock` | real Unix socket, not symlink; `root:root`; `0600`; link count `1` |
| `/etc/cwt/docker-cli` | real directory; `root:root`; `0700` |
| `/etc/cwt/docker-cli/config.json` | real regular file; `root:root`; `0600`; exact bytes `{}` plus LF; SHA-256 `ca3d163bab055381827226140568f3bef7eaac187cebd76878e0b63e9e442356` |
| `/etc/cwt/compose.env` | real regular file; `root:root`; `0600`; exact reviewed CWT non-secret/config-key allowlist; no `DOCKER_*`, `COMPOSE_*` or literal secret values |

The gate validates with non-following metadata calls, opens the lock read/write, compares the opened descriptor's device/inode to the validated path, then calls nonblocking `/usr/bin/flock`. The descriptor remains inherited through the final Compose `exec`; normal exit, error or signal closes it automatically. No wait, retry, recovery lease or stale-lock semantics exist.

### 3.2 Exact tmpfiles and socket templates

The one versioned tmpfiles template, proposed path `deploy/host/cwt-tmpfiles.conf`, is exactly:

```text
d /run/lock/cwt 0700 root root -
f /run/lock/cwt/staging-start.lock 0600 root root -
```

Future authorized installation is exact and root-owned:

```text
install -o root -g root -m 0644 deploy/host/cwt-tmpfiles.conf /etc/tmpfiles.d/cwt.conf
/usr/bin/systemd-tmpfiles --create --prefix=/run/lock/cwt /etc/tmpfiles.d/cwt.conf
```

The standard `docker.socket` drop-in, proposed path `deploy/host/docker.socket.d/cwt-root-only.conf`, resets the listener and freezes:

```text
[Socket]
ListenStream=
ListenStream=/run/docker.sock
SocketUser=root
SocketGroup=root
SocketMode=0600
RemoveOnStop=true
```

Installing either template or reloading/restarting systemd/Docker is a future protected-host action and is **not** authorized here. Repository tests parse these exact templates; the gate independently rejects unsafe runtime state because [`systemd-tmpfiles --create`](https://www.freedesktop.org/software/systemd/man/systemd-tmpfiles.html) does not replace hostile-path verification.

### 3.3 Input and sanitized Docker invocation

The singular `deploy/scripts/preflight-staging.sh` uses fixed Bash on Ubuntu and accepts zero positional arguments. Before lock or Docker access, it scans the inherited environment as NUL-delimited entries and rejects every non-empty name under the two prefixes:

```text
COMPOSE_*
DOCKER_*
```

Prefix rejection covers current and future selector/config/plugin variables, rather than maintaining a porous enumeration. Required mutation cases include at least `COMPOSE_FILE`, `COMPOSE_PROJECT_NAME`, `COMPOSE_PROFILES`, `COMPOSE_ENV_FILES`, `COMPOSE_PATH_SEPARATOR`, `COMPOSE_PARALLEL_LIMIT`, `DOCKER_HOST`, `DOCKER_CONTEXT`, `DOCKER_CONFIG`, `DOCKER_CERT_PATH`, `DOCKER_TLS_VERIFY`, `DOCKER_API_VERSION`, `DOCKER_CLI_PLUGIN_EXTRA_DIRS`, `DOCKER_DEFAULT_PLATFORM`, content-trust/build variables and an unknown future-prefixed name.

After rejection, each Docker subprocess is launched with `/usr/bin/env -i`, fixed `PATH=/usr/sbin:/usr/bin:/sbin:/bin`, `HOME=/root`, C locale and `DOCKER_API_VERSION=1.55`. No caller CWT value survives. Compose interpolation comes only from the exact `/etc/cwt/compose.env` allowlist; credentials remain separate file secrets.

Every call begins with the same literal authority:

```text
/usr/bin/docker --config /etc/cwt/docker-cli --host unix:///run/docker.sock
```

The root Compose file, project `cwt`, profile `staging`, wait limit and four services remain literal gate-owned tokens. [`DOCKER_HOST`, contexts and CLI configuration select Docker targets/configuration](https://docs.docker.com/engine/manage-resources/contexts/); explicit host/config plus the scrubbed environment prevents a root-home `currentContext` or plugin path from becoming gate authority.

### 3.4 Tool and daemon identity

The protected Ubuntu `24.04` contract is narrow and machine checked:

| Tool | Accepted identity |
| --- | --- |
| Bash | GNU `5.2.21`; Ubuntu Noble package series `5.2.21-2ubuntu4` |
| `env`, `stat`, `sha256sum` | GNU coreutils `9.4`; Noble package series `9.4-3ubuntu6.*` |
| `flock` | util-linux `2.39.3`; Noble package series `2.39.3-9ubuntu6.*` |
| `systemd-tmpfiles` | systemd upstream `255.4`; Noble security package series `255.4-1ubuntu8.*` |
| Node for existing graph checker | exact `24.14.0` |
| Docker CLI / Engine / API | exact `29.6.2` / `29.6.2` / `1.55` |
| Docker Compose plugin | exact `5.3.1` |

The implementation evidence records selected-architecture package versions and executable SHA-256 values. A version outside these ranges, unsigned/unexpected package origin or path drift is a stop condition, not an automatic upgrade. Ubuntu's maintained package identities are independently published for [systemd](https://packages.ubuntu.com/noble/systemd); Docker CLI behavior is governed by the [official CLI reference](https://docs.docker.com/reference/cli/docker/).

Before project-state inspection, `preflight-host.sh` requires:

- Linux on Ubuntu `24.04`; target architecture exactly one of reviewed `amd64` or `arm64` and matching the selected release manifest;
- local socket/config/path custody above; no Docker TCP/SSH listener or rootless/userns mode;
- exact CLI/Engine/API/Compose versions;
- `overlay2`, cgroup v2 with `systemd`, Docker root `/var/lib/docker`, Swarm inactive;
- exact security set containing AppArmor, built-in seccomp and cgroup namespaces, with no unreviewed additional authority;
- `live-restore=true`, default logging `journald`, and exact accepted `/etc/docker/daemon.json` keys `live-restore`, `log-driver` and `no-new-privileges`; and
- no caller-selected endpoint/config and no second Docker service/socket.

The Docker socket remains root-equivalent; [Docker's security guidance](https://docs.docker.com/engine/security/) is the reason for root-only custody. Local Docker Desktop cannot prove target `journald`, live restore, systemd or Ubuntu package state. Those are implementation hooks and future Stage 7 external validation, not claims in V1.4.

## 4. Singular start, topology and resource non-regression

The exact pre-start state and final action remain V1.3, with Docker's observable paused state normalized as `status=paused`, `paused=true`:

- `proxy`, `web-production`, `postgres`, `valkey-production`: running, unpaused and healthy;
- `scheduler-production`: exact Docker state `status=paused`, `paused=true`; the runbook requires a successful health result immediately before the operator pauses it, while the gate does not misclassify later paused-healthcheck timeouts as an active Scheduler;
- `worker-production`: absent or stopped, never active/restarting;
- all four Staging services: absent or stopped;
- exact `MemAvailable >= 1408 MiB`; and
- root/roots/graph/tool/socket/daemon prerequisites all pass under the same lock.

The final sanitized command remains semantically exact:

```text
/usr/bin/docker --config /etc/cwt/docker-cli --host unix:///run/docker.sock \
  compose --env-file /etc/cwt/compose.env --project-name cwt \
  --file <canonical-repository-root>/compose.yaml --profile staging \
  up --detach --wait --wait-timeout 120 --no-deps \
  web-staging worker-staging scheduler-staging valkey-staging
```

No caller token is appended. `preflight-compose-graph.mjs` compares the one gate allowlist to exact normalized `staging` members and retains exact default/profile/restart/network/resource assertions.

All V1.2 resource values remain exact: default `1984 MiB`; dormant Worker `512 MiB`; default plus Production AI `2496 MiB`; Staging increment `1216 MiB`; default plus Staging `3200 MiB`; paused-Scheduler rehearsal `2944 MiB`; both profiles `3712 MiB`; threshold `1408 MiB`. Exact database-network members remain unchanged.

## 5. Exact Valkey correction and verification contract

### 5.1 Compose healthchecks

Only these two environment-variable names change in `compose.yaml`:

```text
REDISCLI_AUTH=$$(cat /run/secrets/production-valkey-password) valkey-cli --user cwt-production ping | grep -qx PONG
REDISCLI_AUTH=$$(cat /run/secrets/staging-valkey-password) valkey-cli --user cwt-staging ping | grep -qx PONG
```

The image, exact usernames, secret-file paths, command pipe, intervals/timeouts/retries/start periods, ACL restrictions, no persistence, internal networks and absence of published ports remain unchanged. No `-a`, unauthenticated ping, process-only liveness or reduced `--wait` is permitted.

The pinned `8.1.9` source defines `CLI_AUTH_ENV` as `REDISCLI_AUTH` and contains no `VALKEYCLI_AUTH`: [exact source](https://github.com/valkey-io/valkey/blob/8.1.9/src/valkey-cli.c). Future documentation for another Valkey release cannot override the pinned binary/source contract.

### 5.2 Protected-mode/root-cause prerequisite

The current generated line `user default off nopass ...` causes Valkey protected mode to deny every non-loopback application connection before the named ACL can be useful. Exact `8.1.9` configuration documentation states that protected mode with a passwordless default user accepts only loopback/Unix-socket connections: [exact configuration](https://github.com/valkey-io/valkey/blob/8.1.9/valkey.conf).

`deploy/valkey/entrypoint.sh` therefore replaces that one generated line with:

```text
user default off resetpass >${password} resetkeys ~* resetchannels &* -@all
```

The password is the already-read environment-private Valkey secret and is unset before `exec`, exactly as for the named user. `off` still prevents authentication as default; `-@all` still grants no commands. The named `cwt-production` / `cwt-staging` ACL lines and their exact key patterns/commands remain unchanged. [`off` disallows user authentication](https://valkey.io/topics/acl/). `protected-mode yes` is retained; no public port, cross-network attachment, default-user access, new user or new secret is allowed.

### 5.3 Required matrix

Both `linux/amd64` and `linux/arm64` image manifests must prove the exact CLI identity and `REDISCLI_AUTH` behavior. Each environment must then prove:

1. local health returns exact `PONG`;
2. a separate client on only the matching backend network returns exact `PONG` with matching username/secret;
3. missing, wrong, opposite-environment secret and opposite username do not return `PONG`;
4. password-only/default authentication does not return `PONG`, even with the matching secret;
5. the named user can operate only on `cwt:<environment>:rate:*`; opposite prefix is denied;
6. Production/Staging services, ACLs, keyspaces and networks remain separate;
7. password bytes are absent from command args, health definition, logs and committed evidence; and
8. stopped/unhealthy Valkey remains fail-closed through the accepted singular RateLimiter boundary.

Any need for TLS, a shared Valkey, another user/secret, persistence, Cluster/Sentinel or a second rate-limit path stops for a new review; none is selected here.

## 6. Exact implementation ownership

This is planning only. After fresh V1.4 `PASS`, unchanged `OD-B04-01` Owner disposition and a decision-aligned reviewed amendment, the existing Implementer task/worktree may resume the single coherent S6-04 slice.

| Path | Bounded V1.4 ownership | Required proof |
| --- | --- | --- |
| `deploy/scripts/preflight-staging.sh` | Replace V1.3 vague custody with root-only identity, NUL-safe prefix rejection, exact lock/path/descriptor checks, fixed `1408`, exact state, scrubbed/fixed Docker invocation and final `exec`. | selector/argument/path/contention/signal/state/1407/1408 matrices; socket-connection and lifecycle counters |
| `deploy/scripts/preflight-host.sh` | Verify exact paths, tool versions, local Docker socket/daemon/security/listener/config properties before state inspection. | target-shaped static fixtures and local exact-endpoint lab; each property mutation causal |
| `deploy/scripts/preflight-compose-graph.mjs` and tests | Use fixed Docker target/config/env-file; retain F-01/F-02/F-03 graph; bind gate allowlist; assert exact two `REDISCLI_AUTH` healthchecks and exact protected Valkey configuration. | real normalized graph plus selector, health-token, ACL, profile/network/resource mutations |
| `deploy/host/cwt-tmpfiles.conf` | Add only the two exact `d`/`f` records in §3.2. | parser/cold/idempotent/hostile-preexistence tests; exact owner/mode/type |
| `deploy/host/docker.socket.d/cwt-root-only.conf`, Docker CLI config/schema | Add exact root socket drop-in, exact `{}` CLI config template and exact protected Compose-env key schema without values. | template parser; no second listener/context/plugin/config authority; no secret values |
| `compose.yaml` | Change exactly both auth environment names; retain every other health token and Valkey boundary. | normalized exact count `2`; dual-arch binary and live matrix |
| `deploy/valkey/entrypoint.sh` | Replace only disabled default-user `nopass` with exact `resetpass` line in §5.2; retain named ACL and `protected-mode yes`. | cross-container PONG/denial/prefix matrix; generated ACL exact; no secret disclosure |
| deployment/Valkey focused tests | Extend existing deployment suite; do not create a parallel acceptance framework. | actual pinned image, both architectures, secret/log scan and singular gate positive/negative |
| `deploy/host/README.md`, `docs/ENVIRONMENT_AND_DEPLOYMENT.md`, applicable operations runbook | Expose only the singular gate; document root/socket/config custody, installation commands, residual root bypass, Valkey health/ACL recovery and Stage 7 claim ceiling. | repository search finds no raw authorized Staging start or alternative Docker authority |

V1.1/V1.2/V1.3 implementation ownership remains in force and must be applied in the same uncommitted S6-04 Replace-Not-Layer Candidate. No package/lock, application business source, Schema/Migration or Provider boundary is added by V1.4.

## 7. Disposable prototype result

All work used disposable local copies/containers and conspicuously Synthetic values. The Implementer worktree remained read-only. No Provider, real credential/file/data, target host or protected environment was accessed.

### 7.1 F-04

- exact Docker CLI `29.6.2` / API `1.55` / Compose `5.3.1` used a test-only root-owned Unix relay at exact `/run/docker.sock` mode `0600`; the relay existed only because Docker Desktop's mounted socket is `0660` and is not an implementation component;
- 15 non-empty Docker/Compose selector classes refused before the relay accepted another connection;
- 16 lock parent/file hostile states, non-root invocation, read-only/unopenable lock, contention and signal release refused/passed as required;
- 8 socket type/custody/link hostile states refused before API use;
- exact Ubuntu `24.04` image `sha256:33ceb719...` reported Bash `5.2.21`, coreutils `9.4`, util-linux/`flock` `2.39.3`; nonblocking contention and `SIGTERM` release passed; and
- arguments, active Production Scheduler/Worker, unexpected Staging and `1407 MiB` all refused without changing the pre-existing project state/restart/log fingerprint.

### 7.2 F-05 and positive gate

- both `linux/amd64` and `linux/arm64` pinned Valkey CLI binaries exposed `REDISCLI_AUTH` and no `VALKEYCLI_AUTH`;
- exact arm64 CLI SHA-256 was `f419a2b50494c5ea6ce2f19e2c7ba70db5be29a41047c9c993ac23079137c700`; amd64 was `b17279004b357286f28def4aaf7ff27e5bca94631a6625b7049293c73e60ee0f`;
- two actual Valkey `8.1.9` services passed local and cross-container matching PONG, wrong/cross/default denial and prefix/keyspace isolation with the selected generated default ACL;
- no Synthetic password appeared in inspect/process/log evidence; and
- the actual root service/profile/network/resource graph used inert app role bodies and local `json-file` solely to isolate the gate; both Valkey services and their corrected healthchecks/ACLs were real. At exact `1408 MiB`, the unchanged singular start action exited `0` in `7s`, emitted exactly four create/start events, produced nine project containers, kept Production Scheduler paused and Worker absent, and retained exact Staging network isolation.

The inert roles/local log substitution do not prove release-image roles, target `journald`, target resource behavior or exact OCI identity. Accepted F-01/F-02/OCI evidence remains carried forward and must be rerun after implementation.

## 8. Verification, rollback and stop conditions

A fresh Reviewer must replay all F-04/F-05 matrices from the exact committed plan. Zero-start cases compare project container inventory, state, restart count, logs and filtered lifecycle actions; pre-Docker cases also compare Docker-socket connection count. The positive uses the actual root graph and exact two Valkey services; any local role/log fixture is explicit and cannot substitute for later release-image/target proof.

Rollback before implementation acceptance restores checkpoint `de40457e...` and leaves S6-04 blocked. It does not restore V1.3's vague lock/endpoint, `VALKEYCLI_AUTH`, disabled-`nopass` remote denial, optional raw start, default Worker, runtime pnpm or any retry/idle path. No data rollback exists because V1.4 adds no state or Migration. A future host-template rollback is a separately authorized protected operation and must keep ingress closed until the exact prior validated socket/config bundle is restored.

Stop if any of the following occurs:

- a non-root/docker-group principal, remote/TCP/context-selected daemon, second socket/service/proxy/Compose file or caller-selected path is needed;
- any non-empty `DOCKER_*`/`COMPOSE_*` value reaches lock/Docker, or Docker runs without exact scrubbed environment/host/config/API tokens;
- lock/socket/config/env paths have wrong type, symlink, hardlink, owner/group/mode/content/link count, cannot be opened, or can be replaced between validation/open;
- tool/daemon identity or security properties fall outside §3.4;
- any selector/path/lock/state/1407 refusal reaches project lifecycle mutation;
- either healthcheck uses `VALKEYCLI_AUTH`, `-a`, literal password, unauthenticated/process-only health or weaker wait policy;
- protected mode is disabled, default user becomes enabled/command-capable, a new Valkey secret/user appears, named ACL/key prefix changes, or remote matching authentication/denials fail;
- the `1408 MiB` positive takes `>=120s`, starts anything outside the exact four, changes Production state or creates cross-environment attachment;
- F-01/F-02/F-03, exact OCI/key/AI/resource/database-network authority is weakened;
- Schema/Migration, Provider/protected action, architecture change or persistent coordination becomes necessary; or
- `OD-B04-01` is presented before V1.4 `PASS`, or S6-05/S6-06/deployment/Stage 7 begins.

## 9. Security & Test Simplification Check

| Check | V1.4 result |
| --- | --- |
| Root Cause First | PASS — bind the actual Docker authority and make both local health and application-network Valkey authentication real. |
| Simplification First | PASS — root-only existing principal, one standard tmpfiles template, one standard socket drop-in, one `flock`, two token fixes and one generated ACL-line correction. |
| Replace Not Layer | PASS — unsafe/vague entry and broken health/remote config are replaced; no fallback entry, proxy, second user/client or topology remains. |
| Singular authority | PASS as plan — root Compose owns topology; one gate owns authorized Staging start; one local root socket owns Docker access. |
| Fail closed | PASS as plan/prototype — selectors, custody, state, capacity and health failures are nonzero without retry or lifecycle mutation. |
| Secret/privacy | PASS as plan/prototype — file secrets only; no command-line/literal evidence; environments remain isolated. |
| Proportionality | PASS — hostile metadata/selector tests and real Valkey/lifecycle tests target the causal boundaries; accepted OCI/role proof is preserved rather than duplicated. |
| Persistent complexity | none — `/run` lock is ephemeral; no daemon, lease, Schema/Migration or new credential. |

## 10. Sequence and terminal boundary

1. A fresh independent task re-reviews V1.4, all four failed-Review crosswalks, exact lineage/sidecars, host principal/socket/lock/tool contract, Valkey matrix and F-01/F-02/F-03 non-regression.
2. Only a fresh `PASS` permits the coordinator to present unchanged `OD-B04-01` to the Owner.
3. Only the later Owner disposition plus a decision-aligned reviewed amendment permits the existing Implementer to resume S6-04.
4. S6-04 implementation requires independent implementation Review before any later Stage 6 slice.
5. No S6-05/S6-06, deployment, Provider/protected action or Stage 7 begins here. After accepted Stage 6, stop; Stage 7 requires new explicit Owner authorization.

Technical Lead result: **COMPLETED planning remediation Candidate; awaiting fresh independent Stage 6 B-04 planning re-review of V1.4.**
