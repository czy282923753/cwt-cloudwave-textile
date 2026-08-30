# CWT Phase 1B Stage 6 S6-04 B-04 Reproducible-Image Planning Amendment Evidence Manifest V1.3

Status: **TECHNICAL LEAD EVIDENCE CANDIDATE — supports F-03 remediation planning only; fresh independent re-review required**

Date: **2026-08-31**

Principal Candidate: [Technical Disposition and Planning Amendment Candidate V1.3](./PHASE_1B_STAGE6_S6_04_B_04_REPRODUCIBLE_IMAGE_TECHNICAL_DISPOSITION_AND_PLANNING_AMENDMENT_CANDIDATE_V1_3.md)

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
| Failed V1.2 Review | `a333f4b71b2c12f7a7164a2d7c4688f87a98bef2`; tree `509c05e88936fdc2a22ef4df97527339842157c5`; sole parent `d8068e4...`; Review-file SHA-256 `ecd36087c7edf8b3b93e86a19a7f48195f30ce7dd260ccd7db636f339dd8be96` |
| V1.3 required sole parent | `d8068e4082eb70f1b41f903f0203626125562d77` |
| Review ancestry rule | all three failed Reviews return nonzero from ancestor checks against V1.3 |
| Implementer tree | dirty S6-04 worktree at `/Users/calvin/.codex/worktrees/39c0/CWT（CloudWave Textile）项目`; read-only and excluded |

V1.0/V1.1/V1.2 principal artifacts and sidecars remain byte-identical. V1.3 adds only its two new principal files and adjacent sidecars.

## 2. Accepted evidence carried forward

F-01 and original F-02 remain closed. V1.3 changes none of the following accepted planning evidence:

- Node `24.14.0`, exact `tsx@4.23.1`, pnpm `11.9.0` build-only, explicit async main/error handling and direct role entries;
- removal of runtime package-manager state and the hardened `linux/amd64`/`linux/arm64` role matrix;
- default five, sole dormant `worker-production` profile `production-ai`, exact restart `no`, Production-only networks and resource arithmetic;
- exact OCI equality, BuildKit/Next entropy, key classification and detached SBOM/provenance/scan contract;
- Options A-E, B04-D1 through B04-D5 and unchanged `OD-B04-01`;
- Production AI prohibition and exact AI architecture gates; and
- no Schema/Migration, Provider/account, protected environment, S6-05/S6-06 or Stage 7 action.

Only the optional V1.2 Staging preflight/start boundary is superseded.

## 3. Disposable prototype identity and scope

| Item | Exact value / boundary |
| --- | --- |
| Source | read-only copy of dirty S6-04 Implementer tree, patched only in disposable storage with accepted V1.2 graph and proposed V1.3 gate |
| Docker Engine / Compose | `29.6.2` / `5.3.1` |
| Gate runner base | `docker:29.6.2-cli@sha256:be132a9f282288de4afaf63379dff75711fda0147c6b72a9df44e51841402144` |
| Disposable script Node | Alpine package `24.18.1`; host-script execution only, not product runtime authority |
| Product/runtime identity | accepted Node `24.14.0` and F-01 artifact contract unchanged; role bodies were inert lifecycle fixtures for F-03 only |
| Logging limitation | Docker Desktop `json-file`; no target `journald` or protected-host claim |
| Inputs | conspicuously Synthetic; no Provider, credential, real file/data, protected host or external action |
| Cleanup | exact project containers/networks and task-created gate-runner image removed |

The prototype establishes host-gate sequencing and lifecycle effects. It is not an application image, reproducibility, Provider, target resource or deployment proof.

## 4. F-03 prototype ledger

| ID | Assertion | Exact observation | Result |
| --- | --- | --- | --- |
| `F03-A01` | static graph remains singular | one root Compose; exact default five, four `staging` members, one `production-ai` member, ten full services and two exact database networks | PASS |
| `F03-A02` | allowlist cannot drift | focused Node suite `3/3`; missing/extra/duplicate gate declaration and profile/default/network/resource mutations reject | PASS |
| `F03-A03` | simultaneous intent rejected | arguments `--profile staging --profile production-ai` exited nonzero before Compose | PASS zero-start |
| `F03-A04` | inherited profiles rejected | `COMPOSE_PROFILES=production-ai` and `staging,production-ai` each exited nonzero | PASS zero-start |
| `F03-A05` | extra/profile/service/unknown tokens rejected | extra `--profile`, explicit `worker-production` and unknown argument each exited nonzero | PASS zero-start |
| `F03-A06` | active Production Worker rejected | running `worker-production` caused nonzero refusal | PASS zero-start |
| `F03-A07` | active Production Scheduler rejected | unpaused/running `scheduler-production` caused nonzero refusal | PASS zero-start |
| `F03-A08` | exact memory lower boundary | `1407 MiB` caused nonzero refusal | PASS zero-start |
| `F03-A09` | lock contention | held advisory lock caused immediate nonzero refusal | PASS zero-start |
| `F03-A10` | every negative is non-mutating | project container inventory/state and service-log SHA-256 remained exact; no create/start/restart/pause/unpause/die/destroy action occurred | PASS |
| `F03-A11` | positive exact boundary | paused Scheduler, inactive Worker and `1408 MiB` started exactly four Staging services; first gate exited `0` | PASS |
| `F03-A12` | Production state preserved | `worker-production` absent; `scheduler-production` remained paused; other four foundation services retained state/log hashes | PASS |
| `F03-A13` | network isolation | each started service attached only to accepted Staging networks; no Production attachment | PASS |
| `F03-A14` | concurrent authorized caller loses | second gate during first gate’s Compose readiness exited `1` on `flock`; no Compose action | PASS |

For event comparison, healthcheck `exec_create/exec_start/exec_die` noise was classified separately from container lifecycle actions. No negative produced a project container lifecycle event or changed a service log.

## 5. Exact F-03 review crosswalk

| Review requirement | Candidate section | Fresh Reviewer assertion |
| --- | --- | --- |
| one repository-controlled authorized start | §§1, 4 | exactly `deploy/scripts/preflight-staging.sh`; all runbooks point to it and no raw start remains |
| root Compose only | §§4.1, 4.4 | fixed absolute root `compose.yaml`; caller cannot supply Compose file/project/profile/service |
| nonblocking lock held through start | §4.2 | contention is immediate; concurrent second gate has no action; lock remains until Compose exits |
| reject inherited/extra/dual intent | §§4.1, 7 | exact environment and argument negatives all fail before lifecycle action |
| active-state and `1408` boundary | §§4.3, 5, 7 | Worker active, Scheduler active and `1407` reject; exact positive state at `1408` passes |
| exact four-service action | §4.4 | only four create/start actions; `--no-deps`; Production state retained |
| allowlist bound to graph | §§4.4, 6 | checker parses one declaration and exact-compares normalized Staging profile members |
| no launcher/topology layering | §§1, 10 | ephemeral host critical section only; no role launcher, daemon, retry, second Compose file or persistent state |
| honest root bypass residual | §§1, 9 | root/socket bypass described as possible but unauthorized; custody/audit and claim ceiling explicit |
| future Production AI still gated | §§2, 9, 11 | no current gate acceptance; future change requires separate explicit Production-AI/Stage 7 authority |
| F-01/F-02/OCI/OD non-regression | §§3, 5, 6 | prior artifacts byte-identical; exact accepted contracts unchanged |

## 6. Fresh Reviewer mechanical assertions

A fresh independent Reviewer must prove all of the following from the committed V1.3 package and a disposable implementation prototype:

1. the V1.3 Candidate has sole parent `d8068e4...`; all three Review commits remain sibling-only; V1.0/V1.1/V1.2 blobs and hashes are exact;
2. exactly one root Compose and exactly one authorized repository Staging start entry exist;
3. no runbook documents separate raw Staging `up`, `create`, `start`, explicit service selection or profile combination;
4. the gate accepts zero args, rejects every inherited Compose selector named in Candidate §4.1 and owns the exact root/project/profile/service tokens;
5. nonblocking `flock` is acquired before mutable-state checks and held through the final `exec`; signal/failure releases it without retry;
6. exact foundation/paused/inactive states and exact `1407/1408 MiB` boundary are enforced;
7. each negative leaves project inventory, container state, service-log hashes and exact lifecycle actions unchanged;
8. the positive creates/starts only the four exact Staging members, preserves Production state and has no cross-environment network;
9. a concurrent second authorized invocation exits nonzero without Compose action;
10. graph mutations reject gate-list, default/profile/restart/database/network/resource drift, while F-01/F-02 and exact resource sums remain unchanged;
11. raw root/Docker-socket bypass is not claimed impossible, but all authorized repository paths and operator documentation remain singular; and
12. no code implementation, package/lock, Schema/Migration, Provider/protected/external action, Owner presentation or Stage 7 claim entered this docs-only Candidate.

Any optional preflight followed by a separate raw start, waiting lock, second start authority, Production-AI acceptance, auto-retry, idle shim or semantic-only OCI comparison is a fail.

## 7. Document-control verification contract

Before callback and again in fresh re-review:

- `git rev-parse HEAD^` equals `d8068e4082eb70f1b41f903f0203626125562d77`;
- `git merge-base --is-ancestor` returns nonzero for `a1a4321...`, `a694946...` and `a333f4b...` against HEAD;
- the Candidate diff adds only this V1.3 Candidate, this V1.3 manifest and adjacent sidecars;
- V1.0/V1.1/V1.2 hashes and all three Review identities remain exact;
- each sidecar is exact lowercase SHA-256, two spaces, basename and final LF, and verifies from `docs/`;
- `git diff --check HEAD^ HEAD` passes; the commit has one parent, no rename/mode change and a clean worktree;
- the Implementer HEAD/dirt remains read-only and unchanged by this task; and
- no implementation, Owner presentation, external action or Stage 7 claim is present.

## 8. Claim ceiling and next gate

This manifest supports bounded F-03 planning closure and preserves F-01/F-02. It does not prove final exact OCI equality, accepted implementation, Production AI readiness, target `flock`/logging/resource behavior, protected-environment behavior, Provider behavior or Stage 7.

Next gate: **fresh independent Stage 6 B-04 planning-amendment re-review of V1.3**. Only a subsequent `PASS` permits coordinator presentation of unchanged `OD-B04-01` to the Owner.
