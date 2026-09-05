# CWT Phase 1B Stage 6 — Exact-Digest Runtime Validation Operator Report V1.10

Status: **BLOCKED — the sole Runtime workflow failed at `release_identity_mismatch` before Product Runtime Validation; mandatory teardown completed with zero attempt residue**

Recorded at: `2026-09-05T10:19:12Z`

Evidence manifest: [PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_EVIDENCE_MANIFEST_V1_10.md](./PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_EVIDENCE_MANIFEST_V1_10.md)

This document is the append-only V1.10 Operator record. It does not modify or supersede V1.0–V1.9, does not place the RW-004 review-only commit into evidence ancestry, and grants no retry or remediation authority.

## 1. Authority and immutable inputs

The Owner authorized exactly one additional external attempt: one disposable Tencent Singapore host, one provisioning TAT invocation, one Runner registration TAT invocation, at most one Runtime workflow dispatch, and mandatory teardown. No retry, replacement host, second token, second registration, second workflow dispatch, rebuild, retag, Registry write, push, deployment, promotion, S6-06 or S6-07 was authorized.

| Fact | Exact value |
|---|---|
| Operator branch / evidence base | `codex/stage6-runtime-validation-attempt-v1-10` / `7279d0cad3f259b09c9cd99381a1ea104559b3a5` |
| Evidence-base tree | `36896eede33afe22ab9d6a48e4a05a4db94e1cab` |
| Product Candidate / tree | `a321ea6ce3891e42be4573b44cbce597c05f8f01` / `5f5d249d32868f2d6176e2d0104cffa2f7b97e9b` |
| RW-004 review-only commit / ancestry | `0e8d8b4730f1e5dbcc339ff2f4bf68409dfec36b` / not an ancestor of this evidence branch |
| Remote `main` before dispatch and after teardown | `506d92bf396bae52d7d8e54dabc46345036e4f86` |
| Runtime workflow blob / SHA-256 | `b5f38ba17ea037009269061bacbe2d67cb6ef413` / `0f52ded0fa0a7957645e6bc98ee997ef642cb39d72d1f35dae9c5cc608eb9584` |
| Frozen release commit / tree | `7e6ef0ad9fd00975da93789421c0d24ec9226e82` / `29ef35dfafd989bfdc08bd2e987f44a0e784af24` |
| Build Once run / attempt | `33709304781` / `1`; `completed/success` |
| Detached artifact | `9876610372`; `8,927,668` bytes; archive SHA-256 `fed62c295f003bc8ef984ec57fbec0c5b29156eff816de5613b8d0663b520b8f`; unexpired |
| Exact OCI index | `ghcr.io/czy282923753/cwt-cloudwave-textile@sha256:89e04b0273e213a8c02f39803cb57ec14b83b07b27471f24b2d625702aef06a8` |
| Provisioning blob / SHA-256 | `367332034e2b504353c5b00c563bf27ed6f0c95c` / `c5ac861443d1dd741e78206ab78ab8c7e0b58f55ed87be380260bc4aa613c22e` |
| Registration invocation blob / file SHA-256 | `96cb85aa281138385652bd0ea816450107000493` / `0184e5108a4ddd81dbd8edc5060c4c4369e65edd1fbead2c9f2a733179016839` |
| Registration wrapper | `6,894` bytes; SHA-256 `d12e5186d507eebc75fd751b493475034b39d76b740d0fa881c45d9d98f702e7`; byte-equal to decoded canonical Base64 |
| Embedded registration payload | `3,752` bytes; SHA-256 `7c773a341cfd629dae2985f7c51792aee6f917ca5df7733f7200d26e780da94b` |
| Fresh attempt nonce | `1f5e9ce24036c86f192cc7e181869406` |

All mandatory GitHub, artifact, GHCR, environment, Runner-inventory and authenticated Tencent purchase-boundary preflight gates passed before resource creation. Authenticated access to the exact GHCR index returned HTTP `200` with the exact descriptor; anonymous access returned HTTP `401`. No Environment, repository permission, package, artifact, workflow source or remote ref was changed.

## 2. Disposable Tencent host and network boundary

Exactly one disposable host and its minimum network boundary were created:

| Fact | Exact value |
|---|---|
| Instance | `ins-8d0043ok` / `cwt-runtime-validation-1f5e9ce24036c86f192cc7e181869406` |
| Created | `2026-09-05 17:54:55 +08:00` |
| Region / zone | Singapore / Singapore Zone 2 |
| Shape / image | `SA5.MEDIUM4`; 2 vCPU / 4 GiB; Ubuntu Server 24.04 LTS 64-bit; `img-mmytdhbn`; native `amd64` |
| System disk | `disk-22hflc4o`; general-purpose SSD; 60 GiB; created `2026-09-05 17:54:37 +08:00` |
| Public / private IPv4 | `43.163.122.191` / `172.22.0.17` |
| VPC / subnet | `vpc-piootcsf` / `subnet-6uvqq9wg` |
| Temporary security group | `sg-q0vzpy6o` / `cwt-runtime-validation-1f5e9ce24036c86f192cc7e181869406` |
| Security-group time | created `2026-09-05 17:52:31 +08:00`; outbound rule recorded `2026-09-05 17:53:56 +08:00` |
| Public inbound | Exactly `0` rules |
| Outbound | Exactly one priority-1 IPv4 `0.0.0.0/0`, protocol `ALL`, allow rule |
| Management | Tencent Automation Assistant only; no SSH, HTTP/S, ICMP or DIND |

The displayed rate was CNY `0.41` per hour plus CNY `0.79/GB` public traffic at 5 Mbps, matching the accepted V1.8 boundary without a material increase. Existing VPC/subnet, Production, Staging, Lighthouse, COS, DNS and `cwt-production-sg` were outside the mutation scope and were not targeted.

## 3. Provisioning passed exactly once

The exact reviewed provisioning payload was submitted once through Tencent Automation Assistant as a one-shot command with `saveCommand=false`, parameters disabled, `username=root`, `workingDirectory=/root`, timeout `600`, and COS output disabled.

| Evidence | Exact result |
|---|---|
| Invocation / task | `inv-289v2p0x9i` / `invt-289v2p0x9j` |
| Started / ended | `2026-09-05 18:04:31 +08:00` / `2026-09-05 18:05:43 +08:00`; 72 seconds |
| Terminal result | `命令成功`; ExitCode `0` |
| Marker | `CWT_PRE_REGISTRATION_OK os=ubuntu-24.04 arch=amd64 docker=29.6.2 compose=5.3.1 runner=2.337.0 runner_tree_owner=ubuntu diag_write_probe=PASS docker_user_probe=PASS` |

## 4. Runner registration passed exactly once

One repository-scoped short-lived GitHub Runner registration token was generated and supplied only through TAT hidden-parameter substitution. It was not printed, committed or stored in evidence. The accepted wrapper was restored from the invocation's canonical Base64 and byte-checked before submission.

The registration TAT invocation used exactly `RunCommand`, `SHELL`, parameter substitution enabled, `username=ubuntu`, `workingDirectory=/home/ubuntu`, timeout `600`, `saveCommand=false`, and COS output disabled. Non-secret parameters were the fresh nonce, exact Runner name, and repository `czy282923753/cwt-cloudwave-textile`.

| Evidence | Exact result |
|---|---|
| Command / invocation / task | `cmd-p68427xl` / `inv-289v7kgt3j` / `invt-289v7kgt3k` |
| Started / ended | `2026-09-05 18:09:45 +08:00` / `2026-09-05 18:09:51 +08:00`; 6 seconds |
| Terminal result | `命令成功`; ExitCode `0` |
| Marker | `CWT_REGISTRATION_MATERIALIZATION_PASS` |
| Registered Runner | `cwt-tencent-sg-1f5e9ce24036c86f192cc7e181869406`; id `27`; `online`; `busy=false` |
| Labels | `self-hosted`, `Linux`, `X64`, `cwt-tencent-singapore`, `cwt-single-use`, `cwt-job-1f5e9ce24036c86f192cc7e181869406` |

The repository Runner inventory contained exactly this one Runner before dispatch.

## 5. Sole Runtime workflow dispatch failed before Product Runtime Validation

The Operator dispatched the accepted workflow exactly once from `main` with the frozen workflow commit, release commit, OCI index, Build Once evidence run and fresh nonce. The sole expected `cwt-stage6-runtime-validation` environment gate was approved once; no other gate or setting was changed.

| Evidence | Exact result |
|---|---|
| Workflow run / attempt | `33959942641` / `1`; event `workflow_dispatch` |
| Workflow head | branch `main`; `506d92bf396bae52d7d8e54dabc46345036e4f86` |
| Created / completed | `2026-09-05T10:10:38Z` / `2026-09-05T10:11:52Z` |
| Job | `101289959302`; `One Tencent Singapore ephemeral linux/amd64 Runtime Validation`; `failure` |
| Runner binding check | Passed |
| Detached artifact download | Passed; artifact `9876610372`; observed archive digest `fed62c295f003bc8ef984ec57fbec0c5b29156eff816de5613b8d0663b520b8f` |
| Private GHCR authentication | Passed |
| Failing step | `Materialize read-only OCI evidence from the same GHCR digest`; exit code `1` |
| Machine-readable failure | `{"status":"NOT_PASS","reasonCode":"release_identity_mismatch"}` |
| Accepted Product Runtime validator | Skipped; no Product Runtime result |
| Retry / rerun / replacement workflow | None |

The accepted materializer emitted only the closed reason code `release_identity_mismatch`; it did not disclose the mismatching field. This Operator evidence therefore records the exact guard outcome without inventing a narrower cause. Because failure occurred at the evidence-to-release identity boundary before the accepted Linux Runtime Validation authority, it is classified as an **operator/integration evidence-identity failure, not a demonstrated Product Runtime defect**. No remediation was performed in this bounded attempt.

## 6. Mandatory teardown and final zero-residue proof

The Tencent destruction detail identified exactly one instance and one 60 GiB system disk for destruction, with zero retained disks and zero retained elastic public IPs. The ordinary public IPv4 was released with the instance. After VM absence, the temporary security group showed association count `0` and was deleted. The ephemeral GitHub Runner record removed itself after its one job.

| Resource/check | Final authoritative result |
|---|---|
| VM `ins-8d0043ok` | Singapore instance inventory total `0` / no instance |
| System disk `disk-22hflc4o` | Singapore cloud-disk inventory `暂无数据`; total `0` |
| Public IPv4 `43.163.122.191` | Singapore public-IP inventory total `0` |
| Security group `sg-q0vzpy6o` | Association count `0`, then deleted; Singapore security-group inventory `暂无数据`; total `0` |
| Repository Actions Runner inventory | `total_count: 0` |
| Remaining attempt-created billable resources | None |

## 7. Terminal disposition

This attempt is **BLOCKED with teardown complete and zero attempt residue**. It proves the exact provisioning and Runner-registration paths and proves that the sole workflow reached the immutable release-identity guard. It does not provide a Product Runtime result because the accepted validator was never entered.

Stage 6 remains **Partial / HOLD**. The next gate is coordinator disposition and independent review of the exact `release_identity_mismatch` evidence boundary. This record grants no retry, new VM, token, TAT invocation, Runner, workflow dispatch, artifact or Registry mutation, Build Once, promotion, deployment, S6-06, S6-07, Stage acceptance or later-phase authority.
