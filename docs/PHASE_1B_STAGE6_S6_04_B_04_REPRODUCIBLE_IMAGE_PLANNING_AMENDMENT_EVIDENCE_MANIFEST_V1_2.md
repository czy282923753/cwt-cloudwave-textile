# CWT Phase 1B Stage 6 S6-04 B-04 Reproducible-Image Planning Amendment Evidence Manifest V1.2

Status: **TECHNICAL LEAD EVIDENCE CANDIDATE — supports F-02 remediation planning only; fresh independent re-review required**

Date: **2026-08-31**

Principal Candidate: [Technical Disposition and Planning Amendment Candidate V1.2](./PHASE_1B_STAGE6_S6_04_B_04_REPRODUCIBLE_IMAGE_TECHNICAL_DISPOSITION_AND_PLANNING_AMENDMENT_CANDIDATE_V1_2.md)

Authority boundary: **Stage 6 planning only. No implementation, Owner presentation, Provider/protected action, deployment, S6-05/S6-06 or Stage 7.**

## 1. Lineage and immutable inputs

| Evidence | Exact identity / disposition |
| --- | --- |
| Accepted Stage 6 planning Candidate | `cf03e22ce690a1a09b79bba32434a44aaa7046de` |
| Accepted implementation checkpoint | `de40457e2e99d118915998ed57be33257512c0df` |
| B-04 V1.0 Candidate | commit `75be4d9689be85c2c18d762f44a300fe93c3b40d`; tree `d77e13ffa67c663a85c1b238a244d13889d8e4aa`; sole parent `de40457e...` |
| V1.0 Technical Disposition / Manifest SHA-256 | `7048188d9d951553d192138964e1275130318ccc9a14de4864a1015a6c7eb343` / `77f924d9278a92df97adc30229f90d2c783dc05d45be5da8974959e83fd1b53a` |
| Failed V1.0 Review | `a1a4321ae9741f51dd026ca854b7d6d829390dea`; tree `6ccaf83f0396ea9a765a1a86e3371a0a8623cc88`; sole parent `75be4d...`; Review-file SHA-256 `52c8b69de8622a21a0377eed353c7f7259a28cf405f552062971d87d850946f9` |
| B-04 V1.1 Candidate | commit `e0d3b9d6fea0431d00850b1278b8d3717055311e`; tree `551454854a7f976eb104a19d411c88e160624ba8`; sole parent `75be4d...` |
| V1.1 Technical Disposition / Manifest SHA-256 | `ffded21bfc497d352c4e8b753bbadf31144c81bc51f885d7931602ab6ab9b040` / `fee3d6460a6ecd8f074bc3212be7bb480e8598bf2df10f61ab4eda049d9a72a3` |
| Failed V1.1 re-review | `a694946af822f122e4a2586a42ee39e5978b244e`; tree `e80078cd6af588f7a605a4049159a19135ca127c`; sole parent `e0d3b9d...`; Review-file SHA-256 `a2623f4b44fb3ec1d3d6b006b1eaea185932a9332e11fbf0f1bf7e54d3699787` |
| V1.2 required sole parent | `e0d3b9d6fea0431d00850b1278b8d3717055311e` |
| Review ancestry rule | both failed Reviews remain sibling-only and must return nonzero from ancestor checks against V1.2 |
| Implementer tree | dirty S6-04 worktree at `/Users/calvin/.codex/worktrees/39c0/CWT（CloudWave Textile）项目`; inspected read-only and excluded from Candidate ancestry |

V1.0 and V1.1 principal artifacts and sidecars remain byte-identical. V1.2 adds new versioned files only.

## 2. Accepted evidence carried forward

The V1.1 re-review explicitly closed `F-01`. V1.2 therefore carries forward, without rerunning as a new release claim:

- direct Node `24.14.0` plus exact `tsx@4.23.1`, explicit async main/error handling and Worker join/stop semantics;
- runtime removal of Corepack/npm/npx/pnpm and pnpm state;
- hardened `linux/amd64` and `linux/arm64` Web, enabled-Staging Worker, Scheduler and one-shot evidence;
- BuildKit mtime and Next Build ID/Preview-Draft/Server Actions entropy diagnosis;
- exact OCI equality and detached SBOM/provenance/scan contract;
- Options A through E, `B04-D1` through `B04-D5` as corrected by V1.1, and unchanged `OD-B04-01`;
- exact AI historical/current hash and four-file tooling-classification boundaries; and
- no Schema/Migration, Provider/account, protected-environment or Stage 7 action.

Only the default activation, restart, resource and related checker/runbook assertions for `worker-production` are superseded.

## 3. Disposable prototype identity and scope

All local inputs were Synthetic. No real Provider key, private file, customer/product data, protected environment or external target was accessed.

| Item | Exact value / boundary |
| --- | --- |
| Docker Engine / Compose / Buildx | `29.6.2` / `5.3.1` / `v0.35.0-desktop.2` |
| Prototype platform | `linux/arm64`; F-02 Compose/restart replay only |
| Prototype loaded image | `sha256:fb672790c307e1332681efee4e481103f2de5360fda2f2a65f268855d3d4222f` |
| Build export manifest / config | `sha256:436f7b6e7ebc1ff9042f54449d74f92b42f7766375fc93b068d2b82b8497a0af` / `sha256:04233e03bc5b12ca45862070eb32c848d7b73a3a9ea961c33bdcb9b9ab07b950` |
| Tool/runtime boundary | Node `24.14.0`; pnpm `11.9.0` build-only; Next `16.2.12`; exact `tsx@4.23.1`; Supercronic `0.2.48`; non-root/read-only; no runtime package manager |
| Accepted dual-architecture F-01 evidence | V1.1 re-review exact hardened artifacts remain authoritative planning evidence; V1.2 does not replace them with this single-platform replay |
| Logging limitation | Docker Desktop refused target `journald`; disposable app containers used local `json-file` solely for process execution. Candidate retains `journald`; no target logging claim is made. |

The prototype changes existed only in a disposable copy. The Candidate contains documentation, not the prototype source, image or Synthetic secret values.

## 4. F-02 prototype ledger

| ID | Assertion | Exact observation | Result |
| --- | --- | --- | --- |
| `F02-A01` | Review root reproduced/accepted | V1.1 re-review exact artifact: Production exit `1`, restart count increased and state remained restarting under `unless-stopped` | accepted causal input |
| `F02-A02` | ordinary default allowlist | `proxy`, `web-production`, `scheduler-production`, `postgres`, `valkey-production`; count `5` | PASS |
| `F02-A03` | ordinary default creates no Production Worker | default `compose create` created exactly five named containers and no `worker-production` | PASS |
| `F02-A04` | exact profile selections | `production-ai` count `6`; `staging` count `9` without Production Worker; both profiles count `10` | PASS |
| `F02-A05` | dormant service keeps exact topology | full graph includes `worker-production` only on `production-backend` and `production-database`; database member allowlists remain four/four | PASS |
| `F02-A06` | unauthorized explicit activation is bounded | exact direct Node/tsx command logged `The Phase D Provider Worker requires enabled Staging.`, exited `1`, policy `no`, `restartCount=0`, `restarting=false` | PASS fail-closed |
| `F02-A07` | no delayed restart/log churn | later state remained exited with restart count `0`; log remained one line | PASS |
| `F02-A08` | runtime hardening retained in replay | UID/GID `10001:10001`, read-only root and exact Production-only networks | PASS |
| `F02-A09` | checker and mutations | focused Node suite `3/3`; default/profile/restart/database/network/resource/security mutations reject | PASS |
| `F02-A10` | one topology authority | Implementer tree contains exactly root `compose.yaml` under Compose filename search | PASS |
| `F02-A11` | F-01 Staging positive remains required | V1.2 changes no Staging Worker source/command/profile; accepted V1.1 dual-architecture running/drain exit `0` evidence remains mandatory and must be rerun by implementation | PASS non-regression contract; not a new release claim |

The explicit Production negative reached the accepted AI capability refusal before any Provider dispatch. No retry, idle compatibility process or external egress path was present.

## 5. Exact machine-checkable resource ledger

The disposable checker returned the following exact byte values:

| Field | Bytes | MiB meaning |
| --- | ---: | ---: |
| host | `4294967296` | `4096` |
| ordinary default | `2080374784` | `1984` |
| dormant Production AI | `536870912` | `512` |
| default + Production AI | `2617245696` | `2496` |
| default + Staging | `3355443200` | `3200` |
| Staging rehearsal after Production Scheduler pause | `3087007744` | `2944` |
| all profiles | `3892314112` | `3712` |
| default headroom | `2214592512` | `2112` |
| default + Production AI headroom | `1677721600` | `1600` |
| default + Staging headroom | `939524096` | `896` |
| rehearsal headroom after Scheduler pause | `1207959552` | `1152` |
| all-profile headroom | `402653184` | `384`; unauthorized/refused |

These are configuration ceilings only. They do not prove target RSS, Swap, pressure or Stage 7 `O-03` through `O-05`.

## 6. F-02 one-to-one review crosswalk

| Review requirement | Candidate section | Reviewer assertion |
| --- | --- | --- |
| remove Worker from ordinary default | Candidate §4 | normalized default and actual default container set equal exact five |
| preserve service and Production database membership | Candidate §4 | full graph retains exact service/networks and four-member Production database allowlist |
| one explicit profile | Candidate §§1, 4 | exact profile token is only `production-ai`; mutation/name/overlap fails |
| no restart loop | Candidate §§1, 7, 8 | exact policy `no`; explicit refusal exits once; later restart count/log count unchanged |
| no Production AI widening or healthy-idle shim | Candidate §§1, 8, 10 | exact refusal remains; source/feature/provider authority unchanged; shim/retry is a stop |
| checker/docs/resource convergence | Candidate §§5, 6 | exact allowlists, byte sums, staging refusal and docs match normalized graph |
| no second topology authority | Candidate §§4, 6, 10 | filename/search and ownership allow only root `compose.yaml` |
| preserve F-01 and reproducibility/key conclusions | Candidate §§1, 3, 7.3, 8 | V1.1 bytes unchanged; exact dual-architecture/equality/AI gates remain mandatory |

## 7. Fresh Reviewer mechanical assertions

A fresh Reviewer must independently prove:

1. normalized no-profile services equal the exact five-service allowlist and default container creation/start produces no `worker-production` container;
2. the full graph has exactly ten services and exactly profiles `production-ai` and `staging` with the selection sets in Candidate §4;
3. `worker-production` has exact profile `[production-ai]`, normalized restart `no`, exact direct Node/tsx command, 512 MiB limit, exact secrets/mounts and only Production backend/database networks;
4. every other service retains its accepted restart/profile/resource rule;
5. explicit unauthorized Worker activation exits nonzero once, remains stopped with restart count zero and never becomes a healthy idle process;
6. full database memberships remain exact and no app/ops service crosses environments;
7. checker mutations fail on Worker default re-entry, absent/renamed/multiple profile, restart drift, network drift and resource drift;
8. Staging preflight refuses a running Production Worker and running Production Scheduler, retains the `1408 MiB` threshold and refuses simultaneous profiles;
9. all exact resource sums match Candidate §5 without double-counting or omission;
10. V1.1 source/launcher/Dockerfile/crontab/AI-gate ownership is unchanged, and the full dual-architecture F-01 matrix remains an implementation gate;
11. `OD-B04-01`, exact OCI equality, Next/key classifications and external/Stage 7 HOLD language remain unchanged; and
12. no second Compose file, launcher, persistent state, Schema/Migration, code implementation or external action entered this planning Candidate.

Any apparent tolerance of the old restart loop, broad profile wildcard, idle compatibility path, Production-AI widening or semantic-only image comparison is a fail.

## 8. Document-control verification contract

Before callback and again in fresh re-review:

- `git rev-parse HEAD^` equals `e0d3b9d6fea0431d00850b1278b8d3717055311e`;
- both `git merge-base --is-ancestor a1a4321... HEAD` and `git merge-base --is-ancestor a694946... HEAD` return nonzero;
- the Candidate diff adds only this V1.2 Candidate, this V1.2 manifest and adjacent sidecars;
- V1.0/V1.1 hashes equal §1 and both Review identities/file hashes remain exact;
- each sidecar is exactly `<lowercase SHA-256><two spaces><basename><LF>` and verifies from `docs/`;
- `git diff --check HEAD^ HEAD` passes;
- Candidate has one parent, no rename/mode change and a clean worktree;
- the Implementer HEAD/dirt remains the pre-task identity/scope; and
- no implementation, Owner presentation, external action or Stage 7 claim is present.

## 9. Claim ceiling and next gate

This manifest proves a bounded planning correction for F-02 and preserves the accepted F-01 planning direction. It does not prove final OCI equality, accepted implementation, Production AI readiness, target logging/resource behavior, Provider behavior, protected-environment behavior or Stage 7.

Next gate: **fresh independent Stage 6 B-04 planning-amendment re-review of V1.2**. Only a subsequent `PASS` permits coordinator presentation of unchanged `OD-B04-01` to the Owner.
