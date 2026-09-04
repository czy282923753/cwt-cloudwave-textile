# CWT Phase 1B Stage 6 — Exact-Digest Runtime Validation Operator Report V1.8

Status: **BLOCKED — sole Runner registration invocation failed before registration; no Runtime workflow dispatch; teardown complete with zero residue**

Recorded at: `2026-09-04T13:35:26Z`

Evidence manifest: [PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_EVIDENCE_MANIFEST_V1_8.md](./PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_EVIDENCE_MANIFEST_V1_8.md)

This document is an append-only successor to V1.7. It does not modify or supersede the historical V1.0–V1.7 execution records.

## 1. Authority and immutable inputs

The Owner authorized exactly one further external exact-digest Runtime Validation attempt: one disposable Tencent Singapore host, one Runner registration, at most one Runtime workflow dispatch and mandatory teardown. No retry, second registration, second workflow dispatch or replacement VM was authorized.

| Fact | Exact value |
|---|---|
| Remote `main` before and after the attempt | `506d92bf396bae52d7d8e54dabc46345036e4f86` |
| Accepted registration Candidate / tree | `f26809ad82ff50c9c93e2bf635208e7ec153b117` / `d59c64a18095b5dec7ae51436ba74330e05b13f5` |
| Registration payload blob / SHA-256 | `1281a207e5ebe58b7fb78900213a44ef26ad7e0a` / `7c773a341cfd629dae2985f7c51792aee6f917ca5df7733f7200d26e780da94b` |
| Registration TAT contract blob / SHA-256 | `5ab9405bc487d8cf74ab32c4daa9c1a51dfab759` / `3c65d0b05ae694885b7bb9c32ebed048758a3369bcf2d4637721506eaec448a1` |
| Provisioning payload blob / SHA-256 | `367332034e2b504353c5b00c563bf27ed6f0c95c` / `c5ac861443d1dd741e78206ab78ab8c7e0b58f55ed87be380260bc4aa613c22e` |
| Frozen release commit / tree | `7e6ef0ad9fd00975da93789421c0d24ec9226e82` / `29ef35dfafd989bfdc08bd2e987f44a0e784af24` |
| Build Once run / attempt | `33709304781` / `1`; `success` |
| Detached artifact | `9876610372`; `8927668` bytes; unexpired during the attempt |
| Artifact ZIP SHA-256 | `fed62c295f003bc8ef984ec57fbec0c5b29156eff816de5613b8d0663b520b8f` |
| OCI index | `ghcr.io/czy282923753/cwt-cloudwave-textile@sha256:89e04e7201694e6f202c71cceb368622cc2d584136a7eedfaee9044a45023e8a` |
| Attempt nonce | `cab7e2c64be280005afe687583f45753` |

All prior Build Once, artifact, evidence-hash, exact OCI descriptor, repository-permission, remote-main and zero-Runner preflight gates passed. No rebuild, retag, image copy, Registry write or push occurred.

## 2. Disposable Tencent host and network boundary

Exactly one disposable host was created:

| Fact | Exact value |
|---|---|
| Instance | `ins-kbaclqku` / `cwt-runtime-validation-cab7e2c64be280005afe687583f45753` |
| Created | `2026-09-04 20:11:08 +08:00` |
| Region / zone | Singapore / Singapore Zone 2 |
| Shape / image | `SA5.MEDIUM4`; 2 vCPU / 4 GiB; Ubuntu Server 24.04 LTS 64-bit; `img-mmytdhbn`; native `amd64` |
| System disk | `disk-czmj85l8`; general-purpose SSD; 60 GiB; created `2026-09-04 20:10:54 +08:00` |
| Public / private IPv4 | `43.133.35.164` / `172.22.0.10` |
| VPC / subnet | `vpc-piootcsf` / `subnet-6uvqq9wg` |
| Temporary security group | `sg-nwhm1kk2` / `自定义模板-20260904201050639` |
| Public inbound | Exactly `0` rules |
| Outbound | Exactly one IPv4 `0.0.0.0/0`, protocol `ALL`, allow rule |
| Management | Tencent Automation Assistant only; no SSH, HTTP/S, ICMP or DIND |

The displayed rate was CNY `0.41` per hour plus CNY `0.79/GB` public traffic at 5 Mbps. Existing VPC/subnet, Production, Staging, Lighthouse, COS, DNS and `cwt-production-sg` were outside the mutation scope and were not targeted.

## 3. Provisioning passed

The exact reviewed provisioning payload was submitted once through Tencent Automation Assistant with a 600-second timeout, root setup identity, parameters disabled and COS output disabled.

| Evidence | Exact result |
|---|---|
| Invocation / task | `inv-288pexgacd` / `invt-288pexgace` |
| Started / ended | `2026-09-04 20:40:31 +08:00` / `2026-09-04 20:41:52 +08:00`; 81 seconds |
| Terminal result | `命令成功`; ExitCode `0` |
| Marker | `CWT_PRE_REGISTRATION_OK os=ubuntu-24.04 arch=amd64 docker=29.6.2 compose=5.3.1 runner=2.337.0 runner_tree_owner=ubuntu diag_write_probe=PASS docker_user_probe=PASS` |

## 4. Sole Runner registration invocation failed before registration

One repository-scoped short-lived GitHub Runner registration token was generated and passed through Tencent TAT hidden-parameter substitution under the Owner's narrow residual-risk acceptance. It was not printed into operator output or committed to the repository. The TAT command executed as `ubuntu`, from `/home/ubuntu`, with a 600-second timeout and COS output disabled.

The wrapper attempted to materialize the accepted registration payload from this immutable URL and verify SHA-256 `7c773a341cfd629dae2985f7c51792aee6f917ca5df7733f7200d26e780da94b` before execution:

`https://raw.githubusercontent.com/czy282923753/cwt-cloudwave-textile/f26809ad82ff50c9c93e2bf635208e7ec153b117/deploy/runtime-validation/register-and-start-ephemeral-runner.sh`

That URL returned HTTP `404`. The wrapper stopped at `curl`; the accepted registration payload did not execute, GitHub did not create a Runner record and the token was never used by `config.sh`.

| Evidence | Exact result |
|---|---|
| Invocation / task | `inv-s88prggf9r` / `invt-s88prggf9s` |
| Started / ended | `2026-09-04 20:51:46 +08:00` / `2026-09-04 20:51:46 +08:00`; less than one second |
| Terminal result | `命令失败`; ExitCode `22` |
| Output | `curl: (22) The requested URL returned error: 404` |
| Repository Runner records created | `0` |
| Retry / second registration invocation | None |

The raw causal fact is that Candidate `f26809ad82ff50c9c93e2bf635208e7ec153b117` was not present on remote `main` `506d92bf396bae52d7d8e54dabc46345036e4f86`; therefore its raw GitHub commit URL was not a valid remote materialization source. This is an **operator/integration source-materialization failure**, not a Product Runtime defect. No remediation is performed in this cleanup record.

## 5. No Runtime workflow dispatch

| Evidence | Exact result |
|---|---|
| Runtime workflow dispatches in this attempt | `0` |
| Latest historical Runtime run after teardown | `33786658330`; created `2026-09-03T17:47:44Z`; `completed/failure`; head `faab04781d9be67a1bb185e06a2a6cabb19f6e69` |
| Exact-digest Runtime validator | Not executed |
| Runtime compatibility result | None |

Per the one-shot boundary, the operator did not generate another token, register another Runner, retry the TAT invocation, create a replacement VM or dispatch the Runtime workflow.

## 6. Mandatory teardown and final zero-residue proof

The Tencent destruction detail identified exactly one instance and one system disk, with zero retained disks and zero retained elastic public IPs. The ordinary public IPv4 was released with the instance. After VM absence, the temporary security group showed association count `0` and was deleted.

| Resource/check | Final authoritative result |
|---|---|
| VM `ins-kbaclqku` | Detail returned `未找到指定资源`; Singapore instance inventory showed no instance / purchase-empty state |
| System disk `disk-czmj85l8` | Detail returned `未找到指定资源`; Singapore cloud-disk inventory `新加坡(0)`, total `0` |
| Public IPv4 `43.133.35.164` | Singapore public-IP inventory showed `暂无数据`, total `0` after loading completed |
| Security group `sg-nwhm1kk2` | Association count `0`, then deleted; Singapore security-group inventory `暂无数据`, total `0` |
| Repository Actions Runner inventory | `0` |
| Remaining attempt-created billable resources | None |

## 7. Terminal disposition and next bounded decision

This attempt is **BLOCKED with teardown complete**. It proves provisioning compatibility only; it provides no Runner or Product Runtime result.

Before any separately authorized external attempt, the coordinator must choose and independently review one immutable source-materialization method that is actually reachable from the VM, for example a remotely present immutable commit/blob or a byte-exact embedded payload with pre-execution hash verification. That decision must be completed before VM creation. This record grants no retry, new VM, token, Runner, workflow dispatch, Build Once, promotion, deployment, S6-06, S6-07 or Stage 7 authority.
