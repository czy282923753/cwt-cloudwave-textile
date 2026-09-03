# CWT Phase 1B Stage 6 — Exact-Digest Runtime Recovery Operator Report V1.3

Status: **BLOCKED / HOLD — one Runtime attempt failed before private GHCR access; teardown complete**

Recorded at: `2026-09-03T06:32:31Z`

Evidence manifest: [PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_EVIDENCE_MANIFEST_V1_3.md](./PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_EVIDENCE_MANIFEST_V1_3.md)

This document is an append-only successor to V1.2. It preserves the historical V1.1 Runner-registration failure and the V1.2 credential-preflight stop unchanged.

## 1. Recovery authority and immutable subject

The Owner authorized one new bounded execution after granting only `read:packages` to the active GitHub CLI identity. The execution reused, and did not rebuild, the accepted subject:

| Fact | Exact value |
|---|---|
| Release source / tree | `7e6ef0ad9fd00975da93789421c0d24ec9226e82` / `29ef35dfafd989bfdc08bd2e987f44a0e784af24` |
| Remote `main` | `7e6ef0ad9fd00975da93789421c0d24ec9226e82` |
| Build run / attempt | `33709304781` / `1` |
| Detached artifact | `9876610372`; not expired |
| OCI index | `sha256:89e04e7201694e6f202c71cceb368622cc2d584136a7eedfaee9044a45023e8a` |
| Compatibility profile | Ubuntu 24.04; native `amd64`; host Docker 29.6.2; Compose 5.3.1; no DIND |

After the scope elevation, the active token scopes were exactly the prior scopes plus `read:packages`; no `write:packages`, `delete:packages` or package-admin scope was requested. Authenticated GHCR descriptor retrieval returned HTTP `200` and `Docker-Content-Digest` exactly equal to the authorized OCI index. Anonymous retrieval remained HTTP `401`.

## 2. Disposable Tencent Runner host

Exactly one new disposable host was created:

| Fact | Exact value |
|---|---|
| Instance | `ins-lacsd1yc` / `cwt-runtime-validation-0d30c11033a94b9bbb16a5ce8109aba6` |
| Region / zone | Singapore / Singapore Zone 2 |
| Platform | Ubuntu Server 24.04 LTS; native `x86_64`; 2 vCPU / 4 GiB |
| System disk | `disk-s0iepj5u`; general-purpose SSD; 60 GiB |
| Temporary public IPv4 | `43.128.114.251` |
| Temporary security group | `sg-2rv8foc2` |
| Public inbound | `0` rules throughout |
| Outbound | One IPv4 `0.0.0.0/0`, protocol `ALL`, allow rule required for GitHub/GHCR egress |
| Management | Tencent Automation Assistant only; SSH remained closed |

The initial generated security group had zero outbound rules as well as zero inbound rules. The operator added only the standard outbound allow rule required for package installation and GitHub/GHCR communication. No inbound rule was added or widened.

## 3. Setup and Runner-user permission proof

The bounded setup installed and verified:

- Docker Engine `29.6.2`;
- Docker Compose `5.3.1`;
- GitHub Actions Runner `2.337.0`;
- Runner archive SHA-256 `70920811a4f8ad4328818682bca5c6469c1c942fab52448868071d0063816613`;
- `/opt/cwt-actions-runner` entirely owned by `ubuntu:ubuntu` after dependency installation;
- `_diag` writable by the actual `ubuntu` Runner user;
- an actual create/check/delete probe under `_diag` returned PASS;
- Docker Engine access by the actual `ubuntu` Runner user returned PASS.

Setup invocation `inv-x8721g0ite` completed successfully in 76 seconds. A separate concise verification completed with ExitCode `0` and returned:

`CWT_PRE_REGISTRATION_OK os=ubuntu-24.04 arch=amd64 docker=29.6.2 compose=5.3.1 runner=2.337.0 runner_tree_owner=ubuntu diag_write_probe=PASS`

## 4. Single Runner registration and single Runtime run

After explicit Owner confirmation, one short-lived registration token was transmitted only through Tencent Automation Assistant to `ins-lacsd1yc`. It was not retained in the repository or evidence. Exactly one `config.sh` registration attempt succeeded and launched the ephemeral Runner:

`cwt-tencent-sg-0d30c11033a94b9bbb16a5ce8109aba6`

GitHub reported it `online`, `busy=false`, OS `Linux`, with labels:

`self-hosted`, `Linux`, `X64`, `cwt-tencent-singapore`, `cwt-single-use`, `cwt-job-0d30c11033a94b9bbb16a5ce8109aba6`.

The first dispatch request using the raw commit SHA as the GitHub `ref` was rejected by GitHub with HTTP `422` and created no run. Remote `main` was rechecked as the exact authorized source, then one actual Runtime workflow run was created with `ref=main`. The workflow itself checked out and verified the exact source inputs.

| Runtime fact | Exact result |
|---|---|
| Run / attempt | `33723012086` / `1` |
| Run number | `1` |
| Job | `100545934208` |
| Head | `main` / `7e6ef0ad9fd00975da93789421c0d24ec9226e82` |
| Created / completed | `2026-09-03T06:23:44Z` / `2026-09-03T06:24:21Z` |
| Conclusion | `failure` |
| Run URL | `https://github.com/czy282923753/cwt-cloudwave-textile/actions/runs/33723012086` |

## 5. First failure and fail-closed stop

The job selected the exact Runner and successfully checked out the authorized source. It then failed in `Verify the unique Tencent Singapore Runner binding before GHCR access`:

`/opt/cwt-actions-runner/_work/_temp/d60ae135-0d26-4ef9-ac94-4dc646bb2b46.sh: line 9: node: command not found`

ExitCode was `127`. The frozen workflow invokes `node deploy/scripts/release-registry-integration.mjs verify-runner` in step 3, while its `actions/setup-node` step is step 4. The accepted host compatibility profile does not require a preinstalled host Node.js. Therefore the causal boundary is workflow step ordering/tool availability, not Runner tree ownership, registration, GHCR identity or Runtime compatibility.

All later steps were skipped: exact Node installation, ORAS installation, detached evidence download, workflow-token GHCR authentication, exact-digest materialization and the sole Linux Runtime validator. The Runtime outcome remains unproven. No repair, rerun, second registration, second VM, alternate evidence, rebuild, promotion or deployment occurred.

## 6. Mandatory teardown and final absence

The ephemeral Runner automatically deregistered after the job; repository Runner inventory returned to `0`. After explicit Owner deletion confirmation and direct Tencent MFA, the instance and system disk were immediately released, and the now-unbound temporary security group was deleted.

| Resource/check | Final result |
|---|---|
| VM `ins-lacsd1yc` | Absent; Singapore CVM list returned to no-instance state |
| System disk `disk-s0iepj5u` | Absent; Singapore cloud-disk count `0` |
| Public IPv4 `43.128.114.251` | Absent; Singapore public-IP count `0` |
| Security group `sg-2rv8foc2` | Association count `0`, then deleted; Singapore security-group count `0` |
| Repository Actions Runner inventory | `0` |
| Long-term Production host / `cwt-production-sg` | Untouched |
| COS, DNS, Staging and Production | Untouched |

## 7. Terminal disposition and next gate

The authorized recovery execution is **BLOCKED / HOLD** at the workflow's pre-GHCR Runner-binding step. Teardown is complete and no billable runtime resource remains.

The next gate requires a separately authorized code correction and independent review of the Runtime workflow's Node availability/order before any new execution can be considered. This record grants no workflow edit, retry, new Runner, new VM, promotion, deployment, S6-06, S6-07 or Stage 7 authority.
