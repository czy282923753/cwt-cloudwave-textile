# CWT Phase 1B Stage 6 — Exact-Digest Runtime Validation Evidence Manifest V1.8

Status: **COMPLETE EVIDENCE MANIFEST FOR BLOCKED SOURCE-MATERIALIZATION FAILURE WITH TEARDOWN COMPLETE**

Principal report: [PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_REPORT_V1_8.md](./PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_REPORT_V1_8.md)

This manifest is append-only and supersedes no historical record.

## 1. Exact inputs

| Evidence | Exact result |
|---|---|
| Remote `main` | `506d92bf396bae52d7d8e54dabc46345036e4f86`; unchanged; no push |
| Registration Candidate / tree | `f26809ad82ff50c9c93e2bf635208e7ec153b117` / `d59c64a18095b5dec7ae51436ba74330e05b13f5` |
| Registration payload blob / SHA-256 | `1281a207e5ebe58b7fb78900213a44ef26ad7e0a` / `7c773a341cfd629dae2985f7c51792aee6f917ca5df7733f7200d26e780da94b` |
| Registration TAT contract blob / SHA-256 | `5ab9405bc487d8cf74ab32c4daa9c1a51dfab759` / `3c65d0b05ae694885b7bb9c32ebed048758a3369bcf2d4637721506eaec448a1` |
| Provisioning payload blob / SHA-256 | `367332034e2b504353c5b00c563bf27ed6f0c95c` / `c5ac861443d1dd741e78206ab78ab8c7e0b58f55ed87be380260bc4aa613c22e` |
| Release commit / tree | `7e6ef0ad9fd00975da93789421c0d24ec9226e82` / `29ef35dfafd989bfdc08bd2e987f44a0e784af24` |
| Build run / artifact / OCI index | `33709304781` / `9876610372` / `sha256:89e04e7201694e6f202c71cceb368622cc2d584136a7eedfaee9044a45023e8a` |
| Attempt nonce | `cab7e2c64be280005afe687583f45753` |

## 2. Disposable host

| Evidence | Exact result |
|---|---|
| Instance | `ins-kbaclqku` / `cwt-runtime-validation-cab7e2c64be280005afe687583f45753` |
| Platform | Singapore Zone 2; `SA5.MEDIUM4`; Ubuntu 24.04 LTS; native `amd64`; 2 vCPU / 4 GiB |
| Disk / public IP / private IP | `disk-czmj85l8` / `43.133.35.164` / `172.22.0.10` |
| VPC / subnet | `vpc-piootcsf` / `subnet-6uvqq9wg` |
| Temporary security group | `sg-nwhm1kk2` / `自定义模板-20260904201050639` |
| Inbound / outbound | `0` inbound rules / one `0.0.0.0/0`, `ALL`, allow outbound rule |
| Management | TAT only; no SSH or DIND |

## 3. Provisioning evidence

| Evidence | Exact result |
|---|---|
| Invocation / task | `inv-288pexgacd` / `invt-288pexgace` |
| Time | `2026-09-04 20:40:31 +08:00`–`20:41:52 +08:00`; 81 seconds |
| Result | `命令成功`; ExitCode `0` |
| Marker | `CWT_PRE_REGISTRATION_OK os=ubuntu-24.04 arch=amd64 docker=29.6.2 compose=5.3.1 runner=2.337.0 runner_tree_owner=ubuntu diag_write_probe=PASS docker_user_probe=PASS` |

## 4. Registration failure evidence

| Evidence | Exact result |
|---|---|
| Short-lived registration token | One repository-scoped token generated and supplied through TAT hidden-parameter substitution; not printed or committed |
| Invocation / task | `inv-s88prggf9r` / `invt-s88prggf9s` |
| Time | `2026-09-04 20:51:46 +08:00`; less than one second |
| Result | `命令失败`; ExitCode `22` |
| Output | `curl: (22) The requested URL returned error: 404` |
| Requested immutable source | Candidate `f26809ad82ff50c9c93e2bf635208e7ec153b117` raw GitHub URL |
| Expected payload hash | `7c773a341cfd629dae2985f7c51792aee6f917ca5df7733f7200d26e780da94b` |
| Payload execution | Did not occur; wrapper stopped at `curl` before hash verification and before `config.sh` |
| Candidate on remote `main` | No; remote `main` remained `506d92bf396bae52d7d8e54dabc46345036e4f86` |
| Classification | Operator/integration source-materialization failure; not Product Runtime defect |
| Runner records created / final inventory | `0` / `0` |
| Retry / second token / second registration | None |

## 5. Workflow non-dispatch evidence

| Evidence | Exact result |
|---|---|
| Runtime workflow dispatches in this attempt | `0` |
| Latest historical Runtime run | `33786658330`; `2026-09-03T17:47:44Z`; `completed/failure`; head `faab04781d9be67a1bb185e06a2a6cabb19f6e69` |
| Exact-digest validator / Runtime result | Not executed / none |

## 6. Final teardown evidence

| Check | Final result |
|---|---|
| VM `ins-kbaclqku` | Exact detail `未找到指定资源`; Singapore instance inventory empty |
| Disk `disk-czmj85l8` | Exact detail `未找到指定资源`; Singapore cloud-disk count `0` |
| Public IPv4 `43.133.35.164` | Singapore public-IP count `0` |
| Security group `sg-nwhm1kk2` | Association count `0`, then deleted; Singapore security-group count `0` |
| Repository Runner inventory | `0` |
| Remaining attempt-created billable resources | None |
| Existing VPC/subnet, Production, Staging, Lighthouse, COS, DNS and `cwt-production-sg` | Not targeted |

## 7. Closure assertion

This manifest supports only **BLOCKED due to operator/integration source-materialization failure, with teardown complete and zero attempt residue**. Provisioning passed, but no Runner record or Runtime workflow run was created. Any future attempt requires a fresh authorization and an independently reviewed, remotely reachable immutable payload-materialization decision before VM creation.
