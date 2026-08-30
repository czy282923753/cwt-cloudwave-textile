# CWT Phase 1B Stage 6 S6-04 B-04 Reproducible-Image Planning Amendment Evidence Manifest V1.4

Status: **TECHNICAL LEAD EVIDENCE CANDIDATE — supports F-04/F-05 remediation planning only; fresh independent re-review required**

Date: **2026-08-31**

Principal Candidate: [Technical Disposition and Planning Amendment Candidate V1.4](./PHASE_1B_STAGE6_S6_04_B_04_REPRODUCIBLE_IMAGE_TECHNICAL_DISPOSITION_AND_PLANNING_AMENDMENT_CANDIDATE_V1_4.md)

Authority boundary: **Stage 6 planning only. No implementation, Owner presentation, Provider/protected action, deployment, S6-05/S6-06 or Stage 7.**

## 1. Lineage and immutable inputs

| Evidence | Exact identity / disposition |
| --- | --- |
| Accepted Stage 6 planning Candidate | `cf03e22ce690a1a09b79bba32434a44aaa7046de` |
| Accepted implementation checkpoint | `de40457e2e99d118915998ed57be33257512c0df` |
| B-04 V1.0 Candidate | `75be4d9689be85c2c18d762f44a300fe93c3b40d`; tree `d77e13ffa67c663a85c1b238a244d13889d8e4aa`; sole parent `de40457e...` |
| V1.0 Technical / Manifest SHA-256 | `7048188d9d951553d192138964e1275130318ccc9a14de4864a1015a6c7eb343` / `77f924d9278a92df97adc30229f90d2c783dc05d45be5da8974959e83fd1b53a` |
| Failed V1.0 Review | `a1a4321ae9741f51dd026ca854b7d6d829390dea`; sibling-only |
| B-04 V1.1 Candidate | `e0d3b9d6fea0431d00850b1278b8d3717055311e`; tree `551454854a7f976eb104a19d411c88e160624ba8`; sole parent `75be4d...` |
| V1.1 Technical / Manifest SHA-256 | `ffded21bfc497d352c4e8b753bbadf31144c81bc51f885d7931602ab6ab9b040` / `fee3d6460a6ecd8f074bc3212be7bb480e8598bf2df10f61ab4eda049d9a72a3` |
| Failed V1.1 Review | `a694946af822f122e4a2586a42ee39e5978b244e`; sibling-only |
| B-04 V1.2 Candidate | `d8068e4082eb70f1b41f903f0203626125562d77`; tree `486f53b5229f25c697e772754082d52856ecdccb`; sole parent `e0d3b9d...` |
| V1.2 Technical / Manifest SHA-256 | `b7d6a9cffcecf675c3d863035ecc795b6a09b5c1bd706b11043a1ea0ca315dfb` / `8d229e9dfd9db99d6eb2028e01cfd475e8e8c19cafde48bccf36e3c51db53411` |
| Failed V1.2 Review | `a333f4b71b2c12f7a7164a2d7c4688f87a98bef2`; sibling-only |
| B-04 V1.3 Candidate | `6da8450e40e54028926dccdccbc002762674196b`; tree `fc05ec36a267471186a45cc8727aa8fcd9a05d24`; sole parent `d8068e4...` |
| V1.3 Technical / Manifest SHA-256 | `c02a4db98669632bdd669d83e687444d1e998854c943bc9642d9b2c1fa0c7e2b` / `8d8d09d7c9e4e8bdec3ba49324edb8f43b14ff20ddb84fd6badfc90edaa9d5a6` |
| Failed V1.3 Review | `662e5d28b1575dd276620eb81587a9f651d42863`; tree `ce27e34460c4e597625fb6f98c908be45421c1f7`; sole parent `6da8450...`; Review-file SHA-256 `77e2e24cd23773d2a6884cda4a4901db3912f7209de490c7b6a1e9d4e6f8b998`; sibling-only |
| V1.4 required sole parent | `6da8450e40e54028926dccdccbc002762674196b` |
| Review ancestry rule | all four failed Reviews return nonzero from ancestor checks against V1.4 |
| Implementer tree | dirty S6-04 worktree at `/Users/calvin/.codex/worktrees/39c0/CWT（CloudWave Textile）项目`; read-only and excluded |

V1.0/V1.1/V1.2/V1.3 principal artifacts and sidecars remain byte-identical. V1.4 adds only its two new principal files and adjacent sidecars.

## 2. Accepted evidence carried forward

V1.4 changes none of the following accepted planning evidence:

- F-01 direct Node `24.14.0`, exact `tsx@4.23.1`, pnpm build-only, explicit async main/error handling and dual-architecture role matrix;
- F-02 exact default five, sole dormant `worker-production` profile `production-ai`, restart `no`, exact Production networks and resource arithmetic;
- F-03 one root Compose, one locked repository-controlled Staging start gate, exact four-service allowlist, zero caller arguments and no raw documented authorized start;
- exact OCI equality, BuildKit/Next entropy, key classification, detached SBOM/provenance/scan contract;
- Options A-E, B04-D1 through B04-D5 and unchanged `OD-B04-01`;
- Production AI prohibition and exact AI architecture gates; and
- no Schema/Migration, Provider/account, protected environment, S6-05/S6-06 or Stage 7 action.

Only incomplete Docker/lock custody and broken Valkey readiness/application-network behavior are superseded.

## 3. Read-only source and official evidence

| Item | Exact observation / use |
| --- | --- |
| Dirty Implementer root `compose.yaml` | both Valkey healthchecks used `VALKEYCLI_AUTH`; Valkey image index exact `sha256:f0ba2252...`; current default generated ACL was `off nopass`; `protected-mode yes`; no published Valkey ports |
| Exact Valkey `8.1.9` source | [`CLI_AUTH_ENV "REDISCLI_AUTH"`](https://github.com/valkey-io/valkey/blob/8.1.9/src/valkey-cli.c); no matching `VALKEYCLI_AUTH` token |
| Exact Valkey `8.1.9` config | [protected mode plus passwordless default accepts only local connections](https://github.com/valkey-io/valkey/blob/8.1.9/valkey.conf) |
| Valkey ACL authority | [`off` disallows authentication](https://valkey.io/topics/acl/); supports disabled default plus named least-privilege users |
| Docker target/config authority | [contexts and environment variables select endpoints](https://docs.docker.com/engine/manage-resources/contexts/); [CLI host/config flags](https://docs.docker.com/reference/cli/docker/) |
| Docker socket security | [official security guidance](https://docs.docker.com/engine/security/) supports treating socket access as root-equivalent |
| tmpfiles behavior | [`systemd-tmpfiles --create`](https://www.freedesktop.org/software/systemd/man/systemd-tmpfiles.html) is standard ephemeral-path creation; independent hostile-state validation remains required |
| Ubuntu tool provenance | [Ubuntu Noble systemd package series](https://packages.ubuntu.com/noble/systemd); exact local pinned Ubuntu image evidence below |

Current documentation for a later Valkey release uses a different CLI name in some pages; it is not authority over exact tag/image `8.1.9`. Exact source, both selected architecture binaries and runtime help agree on `REDISCLI_AUTH`.

## 4. Disposable prototype identity and claim ceiling

| Item | Exact value / boundary |
| --- | --- |
| Source | read-only copy of dirty S6-04 Implementer tree, patched only in disposable storage with accepted V1.1-V1.3 graph/gate direction and proposed V1.4 corrections |
| Local Docker Engine / API / Compose | `29.6.2` / `1.55` / `5.3.1` |
| Gate runner base | `docker:29.6.2-cli@sha256:be132a9f282288de4afaf63379dff75711fda0147c6b72a9df44e51841402144` |
| Ubuntu tool fixture | `ubuntu:24.04@sha256:33ceb71981b602c1a7443a53469e4dba065f7503eab3078a2d7a57a2ab987517`; arm64 manifest `sha256:95fa4867...`; Bash `5.2.21`; coreutils `9.4`; util-linux/`flock` `2.39.3` |
| Protected-socket fixture | test-only Python `3.13-slim` relay over the local Docker Desktop socket, creating exact `/run/docker.sock` root:root `0600`; connection count instrumented; not an implementation component |
| Valkey | `valkey/valkey:8.1.9@sha256:f0ba225266310efba5fb33383e21c64fbd07907304224786c780606e7ebd7327`; amd64 manifest `sha256:3d9b17f...`; arm64 manifest `sha256:50e8e85f...` |
| Valkey CLI SHA-256 | amd64 `b17279004b357286f28def4aaf7ff27e5bca94631a6625b7049293c73e60ee0f`; arm64 `f419a2b50494c5ea6ce2f19e2c7ba70db5be29a41047c9c993ac23079137c700` |
| App-role scope | inert local bodies and `json-file` only to isolate gate lifecycle; no F-01/release/journald claim |
| Data/action scope | Synthetic values only; no Provider, real credential/file/data, target host, protected environment or external mutation |
| Cleanup | task containers, networks, volume and two task-built images removed; disposable directory moved to Trash for recoverable cleanup |

Local Docker Desktop cannot satisfy the target Ubuntu/systemd/journald/live-restore boundary. V1.4 proves the selected mechanism and freezes future checks; it does not claim Stage 7 target proof.

## 5. F-04 prototype ledger

| ID | Assertion | Exact observation | Result |
| --- | --- | --- | --- |
| `F04-A01` | exact principal | root gate proceeded; UID/GID `1000:1000` refused before lock/Docker | PASS |
| `F04-A02` | selector prefixes fail closed | 15 injected classes across host/context/config/TLS/API/plugin/platform and Compose file/project/profile/env/path/parallel/experimental refused | PASS |
| `F04-A03` | no selector reaches endpoint | protected socket accept counter remained exact across all 15 selector cases | PASS zero-Docker |
| `F04-A04` | exact lock custody | `/run/lock/cwt` root:root `0700`; exact regular child root:root `0600`, size zero, link count one | PASS |
| `F04-A05` | hostile lock states | 16 missing/type/symlink/hardlink/owner/group/mode/content/link-count cases refused before Docker | PASS zero-Docker |
| `F04-A06` | open and contention | read-only/unopenable mount and held nonblocking lock refused; no socket accept | PASS |
| `F04-A07` | signal/exit release | terminated holder released immediately; exact Ubuntu util-linux `2.39.3` reacquired nonblocking | PASS |
| `F04-A08` | exact socket custody | root:root `0600`, Unix socket, link count one at protected path | PASS |
| `F04-A09` | hostile socket states | wrong mode/owner/group/hardlink plus missing/symlink/regular/FIFO refused before API use | PASS zero-Docker |
| `F04-A10` | argument/service injection | dual profile, extra profile, explicit Production Worker, explicit Staging service and unknown token refused before socket accept | PASS |
| `F04-A11` | prior state negatives retained | active Scheduler, active Worker and unexpected active Staging each refused with state/restart inventory unchanged | PASS zero-start |
| `F04-A12` | exact memory lower boundary | `1407 MiB` refused; full project inventory/state/restart/log fingerprint unchanged | PASS zero-start |
| `F04-A13` | root bypass wording | test proves gate binding only; no claim that root cannot invoke raw Docker | PASS claim ceiling |

The selector and metadata cases used a socket-connection counter in addition to project lifecycle evidence. Starting disposable test-runner containers through the host test harness is not a CWT project lifecycle event and is outside the protected relay being measured.

## 6. F-05 prototype ledger

| ID | Assertion | Exact observation | Result |
| --- | --- | --- | --- |
| `F05-A01` | exact CLI env name, both architectures | amd64 and arm64 `valkey-cli --help` each contained `REDISCLI_AUTH`, no `VALKEYCLI_AUTH`; source tag matched | PASS |
| `F05-A02` | normalized health definitions | exact two healthchecks contained `REDISCLI_AUTH`, file read, named user and `grep -qx PONG`; zero old token/`-a` | PASS |
| `F05-A03` | matching local health | Production and Staging services became healthy on exact pinned image | PASS |
| `F05-A04` | matching network client | separate same-network client returned exact `PONG` for each named user/secret | PASS |
| `F05-A05` | wrong/cross/default denial | wrong secret, opposite secret, opposite username and password-only/default auth never returned `PONG` | PASS |
| `F05-A06` | keyspace isolation | matching environment prefix worked; opposite prefix was denied; separate services retained separate state | PASS |
| `F05-A07` | protected mode retained | exact generated default line used `off resetpass >secret ... -@all`; named ACL unchanged; `protected-mode yes` unchanged | PASS |
| `F05-A08` | rejected alternative | unchanged ACL plus `protected-mode no` also allowed remote named auth, but was rejected as a needless defense-in-depth reduction | PASS decision evidence |
| `F05-A09` | no secret in evidence | inspect, health definition, process args and logs contained no Synthetic password bytes | PASS |
| `F05-A10` | exact positive | singular action exited `0` in `7s`, before `120s`; exact four create/start events; nine total; all four Staging healthy | PASS |
| `F05-A11` | Production preserved | Scheduler remained paused; Worker absent; foundation retained state | PASS |
| `F05-A12` | network isolation | each Staging service had only its exact Staging networks; no cross-environment attachment | PASS |

The initial exact health-token-only test made local health green but separately exposed remote `DENIED` under the current passwordless default user. V1.4's selected ACL prerequisite is necessary to satisfy the assigned application-network credential matrix and avoid false readiness.

## 7. Exact F-04/F-05 crosswalk

| Review requirement | Candidate section | Fresh Reviewer assertion |
| --- | --- | --- |
| exact root principal and lock custody | §§2.1, 3.1-3.2 | `0:0`; exact paths/types/owners/modes/content/link/open descriptor; tmpfiles exact |
| Docker selectors/config/plugins bound | §§2.1, 3.3 | NUL-safe all-prefix refusal; fixed scrubbed host/config/API invocation; malicious context/config/plugin cannot connect |
| exact socket/daemon/tool contract | §§3.2-3.4 | root socket drop-in; no TCP/rootless; exact tool versions and daemon properties before state |
| hostile zero-lifecycle matrix | §§2.1, 7 | every selector, principal, lock and socket case causal; socket accepts and project lifecycle unchanged |
| both healthchecks corrected | §§2.2, 5.1 | exactly two `REDISCLI_AUTH`; all other health tokens unchanged; no old token or weaker substitute |
| Valkey actual credential matrix | §§2.2, 5.2-5.3 | local and remote PONG; wrong/cross/default/prefix denials; secrets absent |
| actual 1408 positive plus 1407 negatives | §§4, 7-8 | exact four start, nine total, Production state/network preserved; 1407 and all state/selector/lock negatives no-start |
| prior findings/non-regression | §§1, 4, 6, 8-10 | F-01/F-02/F-03, OCI/key/AI/OD/resource/database authority unchanged |
| no Owner/ADR expansion | §§1, 6, 9 | narrowed host authority and health/ACL defect repair only; any broader mechanism stops |

## 8. Fresh Reviewer mechanical assertions

A fresh independent Reviewer must prove all of the following:

1. V1.4 has sole parent `6da8450...`; all four Review commits remain sibling-only; V1.0-V1.3 blobs/hashes are exact;
2. the Candidate adds only V1.4 Technical/Manifest documents and adjacent sidecars;
3. one root Compose and one authorized Staging start gate remain; no raw documented start, second daemon/proxy/socket/Compose authority appears;
4. inherited `DOCKER_*`/`COMPOSE_*` rejection is prefix-complete and happens before lock/Docker; every later Docker call uses exact scrubbed host/config/API tokens;
5. root-only principal, tmpfiles template, socket drop-in, lock/socket/config/env metadata and tool/daemon checks are exact;
6. every hostile selector/principal/path/link/type/mode/owner/group/open/contention/signal case has causal zero-Docker or zero-lifecycle evidence;
7. normalized Compose has exact two supported healthchecks and no old token, `-a`, literal secret or weakened readiness;
8. exact pinned Valkey on both architectures and two live environment services pass matching PONG, wrong/cross/default/prefix denial and no-secret evidence;
9. `protected-mode yes`, disabled/no-command default user, named least-privilege ACLs, no persistence/public port and separate networks remain exact;
10. exact `1407` refusal and `1408` positive preserve service count, Production state, resources and networks;
11. F-01/F-02/F-03, exact OCI/Next/key/AI/OD findings and all no-Migration/no-external/Stage 7 boundaries are unchanged; and
12. disposable containers, networks, volume, relay and task-created images are removed after evidence capture, and the temporary tree is moved to Trash or safely deleted.

Any non-root Docker group, alternate endpoint/context, unbounded tool version, disabled protected mode, new Valkey user/secret, health façade, retry, second start authority or semantic-only positive is a fail.

## 9. Document-control verification contract

Before callback and again in fresh re-review:

- `git rev-parse HEAD^` equals `6da8450e40e54028926dccdccbc002762674196b`;
- `git merge-base --is-ancestor` returns nonzero for all four failed Review commits against HEAD;
- the Candidate diff adds only this V1.4 Candidate, this V1.4 manifest and adjacent sidecars;
- V1.0-V1.3 hashes and all four Review identities remain exact;
- each sidecar is exact lowercase SHA-256, two spaces, basename and final LF, and verifies from `docs/`;
- `git diff --check HEAD^ HEAD` passes; the commit has one parent, no rename/mode change and a clean worktree;
- the Implementer HEAD/dirt remains read-only and unchanged; and
- no implementation, Owner presentation, external action or Stage 7 claim is present.

## 10. Claim ceiling and next gate

This manifest supports bounded F-04/F-05 planning closure and preserves F-01/F-02/F-03. It does not prove final release-image OCI equality, accepted implementation, target Ubuntu/Docker/journald/resource behavior, protected-environment behavior, Provider behavior or Stage 7.

Next gate: **fresh independent Stage 6 B-04 planning-amendment re-review of V1.4**. Only a subsequent `PASS` permits coordinator presentation of unchanged `OD-B04-01` to the Owner.
