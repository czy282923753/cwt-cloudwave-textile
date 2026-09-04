# CWT Phase 1B Stage 6 — Exact-Digest Runtime Validation Evidence Manifest V1.7

Status: **COMPLETE EVIDENCE MANIFEST FOR BLOCKED / HOLD PRE-REGISTRATION TOKEN-TRANSPORT OUTCOME**

Principal report: [PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_REPORT_V1_7.md](./PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_REPORT_V1_7.md)

This manifest is append-only and supersedes no historical record.

## 1. Exact inputs and read-only gates

| Evidence | Exact result |
|---|---|
| Remote `main` | `506d92bf396bae52d7d8e54dabc46345036e4f86`; unchanged; no push |
| Registration Candidate / tree | `f26809ad82ff50c9c93e2bf635208e7ec153b117` / `d59c64a18095b5dec7ae51436ba74330e05b13f5` |
| Docs closure / review-only PASS | `acfec4182a41c4504a9b85cfaced517b60cd4ea7` / `6307da3929b65099a89ffe2d47a33b29c4a52465` |
| Registration payload blob / SHA-256 | `1281a207e5ebe58b7fb78900213a44ef26ad7e0a` / `7c773a341cfd629dae2985f7c51792aee6f917ca5df7733f7200d26e780da94b` |
| Registration TAT contract blob / SHA-256 | `5ab9405bc487d8cf74ab32c4daa9c1a51dfab759` / `3c65d0b05ae694885b7bb9c32ebed048758a3369bcf2d4637721506eaec448a1` |
| Provisioning payload blob / SHA-256 | `367332034e2b504353c5b00c563bf27ed6f0c95c` / `c5ac861443d1dd741e78206ab78ab8c7e0b58f55ed87be380260bc4aa613c22e` |
| Release commit / tree | `7e6ef0ad9fd00975da93789421c0d24ec9226e82` / `29ef35dfafd989bfdc08bd2e987f44a0e784af24` |
| Build run / attempt | `33709304781` / `1`; success; exact release head |
| Artifact | `9876610372`; present; unexpired; `8927668` bytes |
| Artifact ZIP SHA-256 | `fed62c295f003bc8ef984ec57fbec0c5b29156eff816de5613b8d0663b520b8f` |
| Artifact internal evidence | Exact release/tree/index and six evidence-file hashes independently matched |
| OCI descriptor | Anonymous HTTP `401`; authenticated HTTP `200`; exact index digest and OCI index media type |
| Pre-attempt Runner inventory | `0` |
| Rebuild / retag / Registry write | None |

## 2. Disposable host and network evidence

| Evidence | Exact result |
|---|---|
| Attempt nonce | `f6d2be34d8bb3189259808d3c315936e` |
| Instance | `ins-jzyexfb6` / `cwt-runtime-validation-f6d2be34d8bb3189259808d3c315936e` |
| Platform | Singapore Zone 2; `SA5.MEDIUM4`; Ubuntu 24.04 LTS; native `amd64`; 2 vCPU / 4 GiB |
| Disk / public IP / private IP | `disk-gr2i30kk` / `43.134.44.115` / `172.22.0.5` |
| VPC / subnet | `vpc-piootcsf` / `subnet-6uvqq9wg` |
| Temporary security group | `sg-5287wkt0` / `自定义模板-20260904115841127` |
| Inbound rules | Exactly `0` |
| Outbound rules | Exactly one `0.0.0.0/0`, `ALL`, allow rule |
| Management | TAT only; no SSH, no DIND |
| Existing protected resources | Untouched |

## 3. Provisioning evidence

| Evidence | Exact result |
|---|---|
| Invocation / task | `inv-2888b00rhc` / `invt-2888b00rhd` |
| Time | `2026-09-04 12:04:17 +08:00`–`12:05:23 +08:00`; 66 seconds |
| Result | `命令成功`; ExitCode `0` |
| Marker | `CWT_PRE_REGISTRATION_OK os=ubuntu-24.04 arch=amd64 docker=29.6.2 compose=5.3.1 runner=2.337.0 runner_tree_owner=ubuntu diag_write_probe=PASS docker_user_probe=PASS` |
| Timeout / parameters / COS output | `600` seconds / disabled / disabled |
| Editor round-trip payload SHA-256 | Exact `c5ac861443d1dd741e78206ab78ab8c7e0b58f55ed87be380260bc4aa613c22e` |

## 4. Registration boundary evidence

| Evidence | Exact result |
|---|---|
| Initial live transport decision | Non-PASS: no separate TAT environment-input field; available prefix or substitution paths would materialize token into Content/executed script under the then-active prohibition |
| Classification | Operator/platform token-transport boundary; not product/Runtime failure |
| Token generated / transmitted | `0` / `0` |
| Registration invocation | None |
| Runner record | None |
| Later Owner risk acceptance | Accepted transient TAT hidden-parameter/script/argv materialization for this short-lived repository registration token only |
| Timing effect | Acceptance arrived after final destruction submission and irreversible VM/disk absence |
| Continuation rule | Same VM only if deletion remained cancelable; replacement VM explicitly not authorized |
| Result | Attempt could not resume; no token or registration action followed |

The later acceptance does not apply to a GitHub CLI/PAT, GHCR credential, Tencent credential, business/API secret or Production/Staging credential.

## 5. Workflow non-dispatch evidence

| Evidence | Exact result |
|---|---|
| Runtime workflow dispatches in this attempt | `0` |
| Latest historical Runtime run | `33786658330`; `2026-09-03T17:47:44Z`; prior head `faab04781d9be67a1bb185e06a2a6cabb19f6e69` |
| Exact-digest validator | Not executed |
| Runtime compatibility result | None |
| Retry / replacement VM / second path | None |

## 6. Final teardown evidence

| Check | Final result |
|---|---|
| VM `ins-jzyexfb6` | Absent; Singapore CVM count `0` |
| Disk `disk-gr2i30kk` | Absent; Singapore cloud-disk count `0` |
| Public IPv4 `43.134.44.115` | Absent; Singapore public-IP count `0` |
| Security group `sg-5287wkt0` | Deleted after association count `0`; Singapore security-group count `0` |
| Repository Runner inventory | `0` |
| Remaining attempt-created billable resources | None |
| Production / Staging / Lighthouse / COS / DNS / `cwt-production-sg` | Untouched |

## 7. Closure assertion

This manifest supports only **BLOCKED / HOLD at the pre-registration TAT token-transport boundary, with teardown complete**. No Runner registration or Runtime workflow dispatch occurred. The later Owner risk acceptance could not resume the already-destroyed same attempt and did not authorize a replacement VM. This record grants no retry, new VM, Runner, token, workflow dispatch, Build Once, promotion or deployment authority.
