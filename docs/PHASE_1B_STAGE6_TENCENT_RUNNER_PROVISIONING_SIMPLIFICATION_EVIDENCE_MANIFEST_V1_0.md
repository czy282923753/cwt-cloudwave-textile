# CWT Phase 1B Stage 6 — Tencent Runner Provisioning Simplification Evidence Manifest V1.0

Status: **COMPLETE IMPLEMENTATION EVIDENCE — awaiting Fresh Independent Review**

Principal report: [PHASE_1B_STAGE6_TENCENT_RUNNER_PROVISIONING_SIMPLIFICATION_IMPLEMENTATION_REPORT_V1_0.md](./PHASE_1B_STAGE6_TENCENT_RUNNER_PROVISIONING_SIMPLIFICATION_IMPLEMENTATION_REPORT_V1_0.md)

## 1. Candidate identity and scope

| Evidence | Exact result |
|---|---|
| Base | `c96900e34287eea9819737252d6df8b29c14ea36` |
| Candidate / tree | `3714a0fb4ef7944c292b1e5abd9e5753cfabda83` / `4e848f247c9b9d4378cc09134505a49bc033e745` |
| Changed implementation paths | One payload, one existing-surface test, one README section |
| Push / Provider / VM / package install | None |
| Token / registration / workflow dispatch | None / `0` / `0` |

## 2. Candidate file identities

| Path | SHA-256 |
|---|---|
| `deploy/runtime-validation/provision-ubuntu-amd64-runner.sh` | `e61d59180e5aa3e72c039541998727939ba9430ed730a842c174189af08c4c57` |
| `deploy/scripts/provision-ubuntu-amd64-runner.test.mjs` | `14960570813574ee044a31ff7b36c313176492597a1c75fc38ba74abc9d1687b` |
| `deploy/host/README.md` | `a3600d79a3391cbe14b375c5e295f7b9f52769921de091b6d69d6b89909b79bf` |

The provisioning payload is executable mode `100755`.

## 3. Exact external identities bound by the Candidate

| Identity | Exact value |
|---|---|
| Docker Engine / Compose / Runner | `29.6.2` / `5.3.1` / `2.337.0` |
| `docker-ce` / `docker-ce-cli` package | `5:29.6.2-1~ubuntu.24.04~noble` |
| Compose package | `5.3.1-1~ubuntu.24.04~noble` |
| `containerd.io` package | `2.3.4-1~ubuntu.24.04~noble` |
| Runner archive SHA-256 | `70920811a4f8ad4328818682bca5c6469c1c942fab52448868071d0063816613` |
| Package authority | Docker official signed Ubuntu Noble stable `binary-amd64` metadata, read-only |

## 4. Decisive checks

| Check | Result |
|---|---|
| Full-output catalog capture; no early-exit package pipeline | PASS |
| Unique exact selection | PASS |
| Zero / duplicate / wrong / malformed / extra-separator / wrong-package rejection | PASS |
| Prior pipeline mutation rejection | PASS |
| Exact package install arguments and post-install Docker/Compose identities | Static PASS; live install outside authority |
| Runner download identity and SHA-256 verification | Static PASS; live download outside authority |
| Whole-tree `ubuntu:ubuntu` convergence | Static PASS |
| Actual `ubuntu` `_diag` create/check/remove and Docker access probes | Static PASS |
| Registration/token/workflow/cloud/Registry responsibilities absent | PASS |
| Focused suite | `5/5 PASS` |
| Full deployment suite | `122/122 PASS` |
| Bash syntax / diff check | PASS / PASS |
| ShellCheck | Unavailable locally; no new dependency added |
| V1.1–V1.4 historical operator sidecars | All PASS |

## 5. Claim boundary

This manifest proves the exact local Candidate structure and safe Synthetic parser behavior only. It does not prove live Ubuntu installation, Tencent Automation Assistant execution, Docker daemon/systemd behavior, Runner registration, private GHCR access, exact-digest Runtime validation, teardown, promotion or deployment. The sole next gate is Fresh Independent Implementation / Operations / Security Review of Candidate `3714a0fb4ef7944c292b1e5abd9e5753cfabda83`.
