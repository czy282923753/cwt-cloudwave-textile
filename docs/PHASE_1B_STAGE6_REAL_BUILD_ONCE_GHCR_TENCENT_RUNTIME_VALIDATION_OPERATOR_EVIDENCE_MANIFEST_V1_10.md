# CWT Phase 1B Stage 6 — Exact-Digest Runtime Validation Evidence Manifest V1.10

Status: **COMPLETE EVIDENCE MANIFEST FOR SOLE-WORKFLOW `release_identity_mismatch` FAILURE WITH TEARDOWN COMPLETE**

Recorded at: `2026-09-05T10:19:12Z`

Principal report: [PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_REPORT_V1_10.md](./PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_REPORT_V1_10.md)

This manifest is append-only, supersedes no historical record, and supports no retry or remediation authority.

## 1. Exact authority and input identities

| Evidence | Exact result |
|---|---|
| Operator branch / evidence base | `codex/stage6-runtime-validation-attempt-v1-10` / `7279d0cad3f259b09c9cd99381a1ea104559b3a5` |
| Evidence-base tree | `36896eede33afe22ab9d6a48e4a05a4db94e1cab` |
| Candidate / tree | `a321ea6ce3891e42be4573b44cbce597c05f8f01` / `5f5d249d32868f2d6176e2d0104cffa2f7b97e9b` |
| RW-004 review-only commit | `0e8d8b4730f1e5dbcc339ff2f4bf68409dfec36b`; not in evidence ancestry |
| Remote `main` | `506d92bf396bae52d7d8e54dabc46345036e4f86`; unchanged; no push |
| Runtime workflow blob / SHA-256 | `b5f38ba17ea037009269061bacbe2d67cb6ef413` / `0f52ded0fa0a7957645e6bc98ee997ef642cb39d72d1f35dae9c5cc608eb9584` |
| Release commit / tree | `7e6ef0ad9fd00975da93789421c0d24ec9226e82` / `29ef35dfafd989bfdc08bd2e987f44a0e784af24` |
| Build run / attempt / artifact | `33709304781` / `1` / `9876610372`; Build Once `success` |
| Artifact archive | `8,927,668` bytes; SHA-256 `fed62c295f003bc8ef984ec57fbec0c5b29156eff816de5613b8d0663b520b8f`; unexpired |
| OCI index | `sha256:89e04b0273e213a8c02f39803cb57ec14b83b07b27471f24b2d625702aef06a8` |
| Provisioning blob / SHA-256 | `367332034e2b504353c5b00c563bf27ed6f0c95c` / `c5ac861443d1dd741e78206ab78ab8c7e0b58f55ed87be380260bc4aa613c22e` |
| Registration invocation blob / SHA-256 | `96cb85aa281138385652bd0ea816450107000493` / `0184e5108a4ddd81dbd8edc5060c4c4369e65edd1fbead2c9f2a733179016839` |
| Registration wrapper / embedded payload | `6,894` bytes / `d12e5186d507eebc75fd751b493475034b39d76b740d0fa881c45d9d98f702e7`; `3,752` bytes / `7c773a341cfd629dae2985f7c51792aee6f917ca5df7733f7200d26e780da94b` |
| Fresh nonce | `1f5e9ce24036c86f192cc7e181869406` |

## 2. Preflight and disposable host

| Evidence | Exact result |
|---|---|
| GitHub/GHCR preflight | Passed; authenticated exact index HTTP `200`; anonymous exact index HTTP `401` |
| Runtime Environment | `cwt-stage6-runtime-validation`; reviewer `czy282923753`; self-review permitted; exact `main` branch policy |
| Prior Runner inventory | `total_count: 0` |
| Prior Tencent inventory | Singapore VM `0`; cloud disk `0`; public IP `0`; security group `0` |
| Instance | `ins-8d0043ok` / `cwt-runtime-validation-1f5e9ce24036c86f192cc7e181869406` |
| Platform | Singapore Zone 2; `SA5.MEDIUM4`; Ubuntu Server 24.04 LTS `img-mmytdhbn`; native `amd64`; 2 vCPU / 4 GiB |
| Disk / public IP / private IP | `disk-22hflc4o` (60 GiB general-purpose SSD) / `43.163.122.191` / `172.22.0.17` |
| VPC / subnet | `vpc-piootcsf` / `subnet-6uvqq9wg` |
| Temporary security group | `sg-q0vzpy6o` / `cwt-runtime-validation-1f5e9ce24036c86f192cc7e181869406` |
| Inbound / outbound | `0` inbound rules / exactly one priority-1 `0.0.0.0/0`, protocol `ALL`, allow outbound rule |
| Management / rate | TAT only; no SSH or DIND / CNY `0.41` per hour plus CNY `0.79/GB` at 5 Mbps |

## 3. Exact TAT execution evidence

| Evidence | Provisioning | Runner registration |
|---|---|---|
| Invocation / task | `inv-289v2p0x9i` / `invt-289v2p0x9j` | `inv-289v7kgt3j` / `invt-289v7kgt3k` |
| Command ID | one-shot unsaved command; no durable command authority | `cmd-p68427xl` |
| Time | `2026-09-05 18:04:31`–`18:05:43 +08:00`; 72 seconds | `2026-09-05 18:09:45`–`18:09:51 +08:00`; 6 seconds |
| Result | `命令成功`; ExitCode `0` | `命令成功`; ExitCode `0` |
| Marker | `CWT_PRE_REGISTRATION_OK os=ubuntu-24.04 arch=amd64 docker=29.6.2 compose=5.3.1 runner=2.337.0 runner_tree_owner=ubuntu diag_write_probe=PASS docker_user_probe=PASS` | `CWT_REGISTRATION_MATERIALIZATION_PASS` |
| Count / retry | exactly `1` / none | exactly `1` / none |

One short-lived repository registration token was passed only through the hidden TAT parameter and was not printed, committed or retained in evidence.

## 4. Runner and sole workflow evidence

| Evidence | Exact result |
|---|---|
| Runner before dispatch | id `27`; `cwt-tencent-sg-1f5e9ce24036c86f192cc7e181869406`; `online`; `busy=false` |
| Runner labels | `self-hosted`, `Linux`, `X64`, `cwt-tencent-singapore`, `cwt-single-use`, `cwt-job-1f5e9ce24036c86f192cc7e181869406` |
| Workflow run / attempt | `33959942641` / `1`; exactly one dispatch; no rerun |
| Head / event | `main` / `506d92bf396bae52d7d8e54dabc46345036e4f86`; `workflow_dispatch` |
| Time | created `2026-09-05T10:10:38Z`; completed `2026-09-05T10:11:52Z` |
| Environment gate | sole expected `cwt-stage6-runtime-validation` approval completed |
| Job | `101289959302`; `failure` |
| Passed boundaries | exact release checkout; exact Node.js; unique Runner binding; hash-pinned ORAS; detached artifact download; private GHCR authentication |
| Failing boundary | `Materialize read-only OCI evidence from the same GHCR digest`; exit code `1` |
| Closed failure output | `{"status":"NOT_PASS","reasonCode":"release_identity_mismatch"}` |
| Product Runtime Validation | Skipped; no Runtime result |
| Classification | Operator/integration evidence-identity failure; not a demonstrated Product Runtime defect |

The closed failure output does not identify the mismatching field. This manifest does not infer one.

## 5. Final teardown evidence

| Check | Final result |
|---|---|
| VM `ins-8d0043ok` | Singapore instance inventory total `0` |
| Disk `disk-22hflc4o` | Singapore cloud-disk inventory `暂无数据`; total `0` |
| Public IPv4 `43.163.122.191` | Singapore public-IP inventory total `0` |
| Security group `sg-q0vzpy6o` | Association count `0`, then deleted; Singapore security-group inventory `暂无数据`; total `0` |
| Repository Runner inventory | `total_count: 0`; ephemeral record absent |
| Remaining attempt-created billable resources | None |
| Existing VPC/subnet, Production, Staging, Lighthouse, COS, DNS and `cwt-production-sg` | Not targeted |

## 6. Exact action counts

| Action | Count / result |
|---|---|
| Fresh nonce | `1` |
| VM / disk / public IP / security group created | `1` / `1` / `1` / `1` |
| Provisioning TAT / registration token / registration TAT | `1` / `1` / `1` |
| Runner created / final Runner inventory | `1` / `0` |
| Runtime workflow dispatch / attempt | `1` / `1` |
| Workflow conclusion | `failure` |
| Retry / rerun / replacement VM / second token / second TAT | `0` |
| Push / remote ref movement / rebuild / retag / Registry write / deployment | `0` |

## 7. Closure assertion

This manifest supports only **BLOCKED at the immutable release-identity materialization guard, with teardown complete and zero attempt residue**. Provisioning and Runner registration passed, but the accepted Product Runtime validator did not execute. Stage 6 remains **Partial / HOLD** pending coordinator disposition and an independently reviewed decision on the exact `release_identity_mismatch` evidence boundary.
