# CWT Phase 1B Stage 6 S6-04 B-04 Planning Amendment Evidence Manifest V1.6

Status: **TECHNICAL LEAD EVIDENCE MANIFEST — F-04A/F-04B planning remediation only; fresh independent V1.6 Review required**

Date: **2026-08-31**

Companion Candidate: `docs/PHASE_1B_STAGE6_S6_04_B_04_REPRODUCIBLE_IMAGE_TECHNICAL_DISPOSITION_AND_PLANNING_AMENDMENT_CANDIDATE_V1_6.md`

Required Candidate branch/parent: `codex/phase-1b-stage6-s6-04-b04-planning-remediation-v1-6` / `59f356751c34f1a6064925c5bb4c052b737e605f`

This manifest is planning evidence, not an independent Review, implementation report, Owner presentation, Production/Provider proof, or Stage 7 evidence.

## 1. Authority, lineage, and immutable inputs

| Item | Exact identity / result |
| --- | --- |
| V1.5 Candidate | commit `59f356751c34f1a6064925c5bb4c052b737e605f`; tree `924aed29a56dafa3890ca335ca5b20654f56a42c`; sole parent `15d536042d002a251796e45b47b141320c33e56e` |
| V1.5 Review | sibling-only commit `2f36b5a7ecac35e4607c0aa9b706671adecd3777`; tree `e008d601f8817cdf832a9cf9b78d7d6812dfbc73`; sole parent `59f3567...`; Review SHA-256 `0cc40a3dd32167761377200ab7f9191fe57e230e9617064cc47a433ac34191a9` |
| V1.5 Review result | overall `FAIL`; F-04A/F-04B open; F-05 independently `CLOSED` |
| Review ancestry | `git merge-base --is-ancestor 2f36b5a... 59f3567...` exits nonzero; Review is excluded from Candidate ancestry |
| Earlier artifacts | V1.0-V1.5 Candidate artifacts and sidecars are immutable; final control gate re-verifies every adjacent sidecar |
| Implementer boundary | read-only checkpoint remains outside this planning worktree; no Implementer file was written or staged |
| Stage boundary | no implementation, protected/external action, S6-05/S6-06, Owner presentation, or Stage 7; Stage 7 remains HOLD |

Normative F-05 incorporation is exact V1.5 §§2.2 and 4 plus Review `2f36b5a...` §5. This task did not modify, reselect, or broaden the accepted ACL/client/readiness boundary and did not run a competing F-05 implementation path.

## 2. Evidence method and source controls

### 2.1 Disposable boundary

All executable prototypes ran in a task-specific disposable local root and Docker resources. Inputs were Synthetic only. The protected socket fixture was a task-only root:root `0600` Unix relay over the local Docker Desktop socket with an accept counter; it is not a planned component. The real-path fixture reused the accepted root `compose.yaml` topology and exact service/profile tokens in a disposable copy. No Provider, account, credential, real private file, protected Staging/Production environment, or remote endpoint was accessed.

The Implementer worktree was treated read-only. Candidate documentation was written only in the Technical Lead planning worktree rooted at V1.5.

### 2.2 Primary component references

| Contract | Primary/official source | Planning use |
| --- | --- | --- |
| distro static shell | [Ubuntu Noble `bash-static`](https://packages.ubuntu.com/noble/bash-static) | standard package availability/version/architecture source; exact downloaded bytes were independently hashed |
| Bash privileged mode | [GNU Bash `set -p`](https://www.gnu.org/s/bash/manual/html_node/The-Set-Builtin.html) | startup-file/function/shell-option behavior after executable load |
| dynamic loader | [Linux `ld.so(8)`](https://man7.org/linux/man-pages/man8/ld.so.8.html) | establishes why `LD_PRELOAD`, `LD_AUDIT`, and library search variables act before dynamic Bash `main()` absent secure execution |
| signal/trap/wait | [GNU Bash signals](https://www.gnu.org/software/bash/manual/html_node/Signals.html), [job-control builtins](https://www.gnu.org/s/bash/manual/html_node/Job-Control-Builtins.html) | trapped signal interrupts `wait`; `wait -f` requires termination with job control |
| Compose lifecycle | [Docker Compose `up`](https://docs.docker.com/reference/cli/docker/compose/up/) | `up` creates/starts; `--wait` waits for running/healthy state |

No source is used to invent a guarantee. Exact binary/process/descriptor behavior was challenged directly on both supported architectures.

## 3. F-04A clean-exec evidence

### 3.1 Exact package and binary identities

| Evidence ID | `linux/amd64` | `linux/arm64` | Result |
| --- | --- | --- | --- |
| `F04A-PKG-01` base index | `ubuntu:24.04@sha256:33ceb71981b602c1a7443a53469e4dba065f7503eab3078a2d7a57a2ab987517` | same | PASS |
| `F04A-PKG-02` package | `bash-static 5.2.21-2ubuntu4` | same | PASS |
| `F04A-PKG-03` `.deb` SHA-256 | `684691928e746a29d4b97c3b58069666a3cdd73104c90b217501f5c1ae7cbd64` | `1fd25dda094189ac7ad22acad78c298fdd7fedc60c2f45bb00512c13708224a2` | PASS |
| `F04A-PKG-04` installed binary SHA-256 | `ea3065d65dd07162e42e6db082103ef7dda0578436f15da76ff17be7b31cf671` | `923600157c5ec8cbd17c45127cbf34c766ad401722ceb0f0661f2a287538be47` | PASS |
| `F04A-PKG-05` build ID | `d682de4864fa3a62f2cc9cc29b95c7506427897f` | `c7c2ad3d91bd5d9f629a5c6e48b2528779f8df3b` | PASS |
| `F04A-PKG-06` ELF | statically linked; no `INTERP`; no `NEEDED`; `ldd` says not dynamic | same | PASS |
| `F04A-PKG-07` shebang | exact `#!/usr/bin/bash-static -p` | same | PASS |

The task also confirmed V1.5 downstream binary identities after clean exec: coreutils `9.4-3ubuntu6.2`, util-linux `2.39.3-9ubuntu6.5`, Docker CLI `29.6.2`, Compose `5.3.1`, API `1.55`, and Linux daemon. Docker `.deb` SHA-256 values remained `fcc3014d7a8c5c16abda30ce643a498f8b34aa213ad7a14ff8fb30ad07670d7d` / `95b1e7dfee15ffdcbfb8336c3c73fae64d3218ec2300264c489f721e35c7bccd`; Compose `.deb` SHA-256 values remained `19d9473c2f011f94e1e54b035dcac170dab0c19671799db6f015e29eb9f23357` / `6ee2017f5d4909391ac331163e93515a30ca5bd2d892e0e44ab65a46532a64d8`.

### 3.2 Causal loader control

| Evidence ID | Challenge | `amd64` | `arm64` | Decisive result |
| --- | --- | --- | --- | --- |
| `F04A-CTRL-01` dynamic `/bin/bash -p` plus architecture-matched Synthetic `LD_PRELOAD` constructor | exit `65`; loader marker present; gate body absent | same | reproduces V1.5 Review root cause: constructor executes before later scan |
| `F04A-CTRL-02` `/usr/bin/bash-static -p` plus same constructor | exit `65`; loader marker absent; body absent | same | selected correction removes pre-`main()` injection |
| `F04A-CTRL-03` `LD_AUDIT` | exit `65`; no marker/socket/action | same | PASS |
| `F04A-CTRL-04` `LD_LIBRARY_PATH`, `GCONV_PATH`, `LOCPATH` | each exit `65`; no marker/socket/action | same | PASS |

Synthetic constructor SHA-256 values were `1a3b0c975596d2da248e03636c8816e28d05cc5cc1b6dd0f00f82c591e71dcea` (`amd64`) and `33aea8335f4584a7abd60b93fae93c3d371075c40a4160288a6691bb89379a31` (`arm64`). They were local hostile fixtures only, never Candidate artifacts.

### 3.3 Full hostile matrix

Each architecture ran 21 full-bootstrap hostile cells. Every rejected cell compared the protected-socket accept counter and normalized project digest before/after. Required result was socket delta `0`, lifecycle delta `0`, and no loader/startup/function/shadow marker.

| Evidence IDs | Cases | Exact result on both architectures |
| --- | --- | --- |
| `F04A-H01`-`H05` | `LD_PRELOAD`, `LD_AUDIT`, `LD_LIBRARY_PATH`, `GCONV_PATH`, `LOCPATH` | exit `65`; zero marker/socket/lifecycle |
| `F04A-H06`-`H12` | `BASH_ENV`, `ENV`, `SHELLOPTS`, `BASHOPTS`, `CDPATH`, `GLOBIGNORE`, exported function | exit `65`; zero marker/socket/lifecycle |
| `F04A-H13`-`H14` | `DOCKER_HOST`; `COMPOSE_PROFILES=production-ai` | exit `65`; zero socket/lifecycle |
| `F04A-H15` | hostile `PATH`, `HOME`, locale with deliberately absent protected lock/socket | exact environment normalized, then lock-parent refusal; zero marker/socket/lifecycle |
| `F04A-H16`-`H21` | replaced absolute `env`, `id`, `stat`, `flock`, Docker CLI, Compose plugin | exit `68` at hash binding; replacement never executed; zero marker/socket/lifecycle |

The accepted V1.5 Node `24.14.0`, Node-child path/hash, config, root Compose and owner/mode/link tests remain required implementation proof. V1.6 changes the pre-executable trust boundary, not those accepted downstream identities.

## 4. F-04B one-lock/action evidence

### 4.1 Compose-like dual-architecture matrix

The fixture reproduced one parent FD9, one separate-PGID lifecycle child, one validation child, one nonblocking second lock, and lifecycle completion marker. It used no retry, second lock, daemon, or persistent lease.

| Evidence ID | Event | `amd64` / `arm64` gate result | Lock/lifecycle result |
| --- | --- | --- | --- |
| `F04B-L01` | normal | `0` / `0` | second refused while active; child completed; lock acquired after |
| `F04B-L02` | parent `INT` | `130` / `130` | deferred; child completed under lock |
| `F04B-L03` | parent `TERM` | `143` / `143` | deferred; child completed under lock |
| `F04B-L04` | parent `HUP` | `129` / `129` | deferred; child completed under lock |
| `F04B-L05` | parent-only `SIGKILL` | `137` / `137` | child retained FD9 and completed; second refused until completion |
| `F04B-L06` | parent process-group `TERM` | `143` / `143` | separate child PGID retained FD9 and completed |
| `F04B-L07` | parent process-group `SIGKILL` | `137` / `137` | separate child PGID retained FD9 and completed |
| `F04B-L08` | lifecycle process-group `TERM` | `143` / `143` | parent retained FD9 until child terminal; no completion marker, no retry |

Every cell proved parent PGID and child PGID differed, session identity matched, parent/child FD9 were present, validation FD9 was closed, lock-during was refused, and lock-after was acquired. This directly closes the V1.5 universal-`9>&-` and parent-exit race.

### 4.2 Real unchanged 1407/1408 path

The real-path fixture used the exact final tokens, local socket, one root Compose graph, exact application fixture, exact `postgres:18.4-bookworm`, exact `valkey/valkey:8.1.9`, and existing Synthetic secret boundaries.

| Evidence ID | Architecture / condition | Result |
| --- | --- | --- |
| `F04B-R01` | `amd64`, 1407 MiB | exit `1`; exact insufficient-headroom message; project digest unchanged; Staging count `0` |
| `F04B-R02` | `arm64`, 1407 MiB | same |
| `F04B-R03` | `amd64`, 1408 MiB plus parent `TERM` | Docker lifecycle child `0`; gate `143`; concurrent gate `81`; FD9 in parent/child; exact four Staging services healthy |
| `F04B-R04` | `arm64`, 1408 MiB plus parent `TERM` | same; process tree also observed exact Compose plugin descendant |
| `F04B-R05` | `amd64`, all-holder `SIGKILL` after first mutation visible | first gate `137`; immediate second gate nonzero before second `CHILD`; first submitted action continued converging |
| `F04B-R06` | `arm64`, same | same |

The 1408 terminal state retained:

| Service | Exact networks / state |
| --- | --- |
| `proxy` | `edge`, `production-ingress`, `staging-ingress`; healthy |
| `web-production` | `production-backend`, `production-database`, `production-ingress`; healthy |
| `scheduler-production` | `production-backend`, `production-database`; paused |
| `postgres` | `production-database`, `staging-database`; healthy |
| `valkey-production` | `production-backend`; healthy |
| `web-staging` | `staging-backend`, `staging-database`, `staging-ingress`; healthy |
| `worker-staging` | `staging-backend`, `staging-database`; healthy |
| `scheduler-staging` | `staging-backend`, `staging-database`; healthy |
| `valkey-staging` | `staging-backend`; healthy |
| `worker-production` | absent; exact dormant `production-ai` hook unchanged |

The all-holder kill result is intentionally not called automatic recovery. It proves the honest ceiling: after the kernel lock releases, first-action Docker state may still converge. Therefore immediate re-entry must refuse any non-baseline state. After existing operator rollback, the accepted recovery contract requires one initial normalized project/process snapshot, 120 consecutive seconds with zero project lifecycle/health event, and one byte-identical final snapshot before a later action. An event/difference fails the attempt without automatic retry.

## 5. Option disposition

| Option | Disposition | Evidence-based reason |
| --- | --- | --- |
| exact Ubuntu Noble `bash-static` as singular shebang boundary | **SELECTED** | standard distro component; dual architecture; exact static identity; prevents loader constructor; no service/principal/state |
| dynamic Bash plus later variable scan | rejected | constructor already executes before scan |
| dynamic `/usr/bin/env -i` or `sudo` wrapper | rejected | adds a pre-gate dynamic executable/wrapper and does not make the singular interpreter clean |
| custom C/Rust launcher, setuid helper, daemon/systemd service, new principal | rejected / stop boundary | materially expands authority and maintenance; not required by proof |
| parent-only FD9 plus universal child close | rejected | reproduces early reacquisition while lifecycle child continues and breaks acquisition if applied literally |
| forward ordinary signals then exit | rejected | can terminate client before Engine lifecycle is known settled |
| parent + singular lifecycle process tree sharing one FD9; defer and `wait -f` | **SELECTED** | dual-architecture process/real-Compose evidence keeps one action serialized without extra state |
| second lock, lease, sentinel, retry controller, supervisor | rejected | layers coordination and recovery authority; unnecessary for supported signals and forbidden by scope |

No new Owner/ADR decision is required for the selected path. If exact package activation or lock/recovery proof cannot be implemented without a rejected material authority, the Implementer must stop and return the exact decision requirement.

## 6. F-04A/F-04B one-to-one closure ledger

| Review requirement | Candidate section | Evidence IDs | Required implementation proof | Stop / rollback |
| --- | --- | --- | --- | --- |
| clean before dynamic loader | Candidate §3.1-3.2 | `F04A-PKG-01`-`07`, `CTRL-01`-`04` | installed exact shebang/package/architecture/hash and no loader marker | no alternate entry; revert static activation as one unit |
| freeze first environment/tool chain | Candidate §3.2-3.3 | `F04A-H01`-`H21` | source checker plus zero-socket hostile/replacement matrix including accepted Node child | any caller influence stops |
| non-circular trust | Candidate §3.3 | package/hash ledger | activation verifies bootstrap; runtime verifies downstream only | self-proof/floating bytes stop |
| exact FD9 inheritance | Candidate §4.1 | `F04B-L01`-`L08` | acquisition receives FD9; validations close; lifecycle tree holds | any wrong holder stops |
| normal/supported signals | Candidate §4.2 | `L01`-`L04`, `L06`, `R03`-`R04` | process tree, wait/status, lock-during, exact post-state | early release/forward/retry stops |
| parent/child abrupt death | Candidate §4.2-4.3 | `L05`, `L07`, `L08`, `R05`-`R06` | no second lifecycle action; clear operator feedback and stable-state refusal | ambiguity means no start; use existing rollback |
| real headroom/topology | Candidate §§4.4, 5.2 | `R01`-`R04` and network ledger | 1407 zero-start; 1408 exact four/120s/isolation | any state/profile/network drift stops |
| evidence hygiene | Candidate §5.3 | `HYG-01` | named image inspect nonzero; task-resource inventory clean | delete only exact task resources |

## 7. Evidence hygiene and document-control gate

`HYG-01` removed only `cwt-gate-runner:f04-f05` (image ID `sha256:47dcde95ba2f02a322a6e18db2a9a072230cf77031409f7e93fa4755eefc8a5f`). Before removal it had one matching image and zero containers. After removal, exact inspect exited `1`, matching images were `0`, and matching containers were `0`. No unrelated image was selected.

Final cleanup removed every `cwt-v16-*` disposable container, image, network, and volume; exact post-cleanup counts were `0/0/0/0`. The disposable file root was moved recoverably to Trash and no longer exists under `/private/tmp`. No unrelated Docker resource was selected. This cleanup does not alter the evidence conclusions or Candidate ancestry.

Final Git/document checks are frozen as:

1. HEAD before commit is exact `59f3567...`; new commit has that sole parent;
2. exact diff adds only the V1.6 Technical Candidate, Evidence Manifest, and their two adjacent sidecars as mode `100644` files;
3. no V1.0-V1.5 artifact or failed Review path is modified;
4. both V1.6 sidecars and every prior adjacent sidecar verify with lowercase SHA-256, two spaces, basename, one LF;
5. all Review commits remain non-ancestors; `git diff --check` exits `0`; worktree is clean after commit; and
6. searches preserve exact F-05 ACL, `Stage 7` HOLD, no Owner presentation before V1.6 Review PASS, and no implementation/external/Schema/Migration claim.

The Candidate commit/tree are intentionally recorded in the coordinator callback after Git creates them; embedding them in a hashed principal document would create a self-reference.

## 8. Independent next gate

Decisive Technical Lead result: **F-04A/F-04B are closed at planning-candidate level only. F-05 remains independently closed and unchanged. No blocking Owner/ADR decision is introduced by the selected standard correction.**

Next gate: fresh independent Stage 6 S6-04 B-04 planning-amendment Review of V1.6 only. Only a later `PASS` permits coordinator presentation of unchanged `OD-B04-01`. No implementation, S6-05/S6-06, deployment, protected/Provider action, or Stage 7 follows from this manifest.
