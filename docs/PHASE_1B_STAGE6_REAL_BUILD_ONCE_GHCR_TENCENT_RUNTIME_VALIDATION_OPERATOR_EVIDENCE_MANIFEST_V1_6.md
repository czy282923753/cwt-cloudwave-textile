# CWT Phase 1B Stage 6 — Exact-Digest Runtime Validation Evidence Manifest V1.6

Status: **COMPLETE EVIDENCE MANIFEST FOR BLOCKED / HOLD PRE-DISPATCH RUNNER-START OUTCOME**

Principal report: [PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_REPORT_V1_6.md](./PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_REPORT_V1_6.md)

This manifest is append-only and supersedes no historical record.

## 1. Immutable identities and Candidate publication

| Evidence | Exact result |
|---|---|
| Workflow Candidate commit / tree | `506d92bf396bae52d7d8e54dabc46345036e4f86` / `d1e61ef09baccbb2229886a97394ec65156e7797` |
| Candidate parent | `b4fc86f63cbea918032880fd40b6054780738b09` |
| Independent Review | `PASS`; review commit `161235c2bef7bb483dabb530abc30629a3a4211d`; not Candidate ancestry and not pushed |
| Runtime workflow blob | `b5f38ba17ea037009269061bacbe2d67cb6ef413` |
| Provisioning script blob / SHA-256 | `367332034e2b504353c5b00c563bf27ed6f0c95c` / `c5ac861443d1dd741e78206ab78ab8c7e0b58f55ed87be380260bc4aa613c22e` |
| Frozen release commit / tree | `7e6ef0ad9fd00975da93789421c0d24ec9226e82` / `29ef35dfafd989bfdc08bd2e987f44a0e784af24` |
| Candidate pushes | Exactly `1`; `faab0478..506d92bf`; remote `main` verified at exact Candidate |
| Extra ref, tag, docs or review push | None |
| Build run / artifact | `33709304781` attempt `1` / `9876610372`; successful source evidence |
| Artifact | `cwt-release-evidence-7e6ef0ad9fd00975da93789421c0d24ec9226e82`; not expired; `8927668` bytes |
| Artifact SHA-256 | `fed62c295f003bc8ef984ec57fbec0c5b29156eff816de5613b8d0663b520b8f` |
| OCI index | `sha256:89e04e7201694e6f202c71cceb368622cc2d584136a7eedfaee9044a45023e8a`; authenticated descriptor HTTP `200`; exact digest header |
| Attempt nonce | `a07663635ffe5a61e1bfb77a63ad2289` |
| Rebuild / retag / copy | None |

## 2. Disposable host and network boundary

| Evidence | Exact result |
|---|---|
| Instance | `ins-gd9jvdvm` / `cwt-runtime-validation-a07663635ffe5a61e1bfb77a63ad2289` |
| Platform | Singapore Zone 2; Ubuntu 24.04 LTS; native `amd64`; `SA5.MEDIUM4`; 2 vCPU / 4 GiB |
| Disk / public IP / security group | `disk-lsnl28co` / `124.156.207.11` / `sg-cj9fpkvw` |
| Private IP / VPC / subnet | `172.22.0.6` / `vpc-piootcsf` / `subnet-6uvqq9wg` |
| Inbound security-group rules | Exactly `0` throughout |
| Outbound security-group rules | Exactly one IPv4 `0.0.0.0/0`, protocol `ALL`, allow rule |
| Management path | Tencent Automation Assistant only; SSH closed; no DIND |
| Displayed price | CNY `0.41`/hour configuration plus CNY `0.79`/GB traffic; 5 Mbps traffic billed |
| Existing long-term resources | Lighthouse, Production, COS, DNS and Staging untouched |

## 3. Provisioning evidence

| Evidence | Exact result |
|---|---|
| Provisioning invocation / task | `inv-s87qwc0mt3` / `invt-s87qwc0mt4` |
| Provisioning time | `2026-09-04 03:18:48 +08:00`–`03:20:01 +08:00`; 73 seconds |
| Provisioning result | `命令成功`; ExitCode `0` |
| Marker | `CWT_PRE_REGISTRATION_OK os=ubuntu-24.04 arch=amd64 docker=29.6.2 compose=5.3.1 runner=2.337.0 runner_tree_owner=ubuntu diag_write_probe=PASS docker_user_probe=PASS` |
| TAT timeout | `600` seconds |
| Submitted script integrity | Browser-editor round-trip SHA-256 exactly `c5ac861443d1dd741e78206ab78ab8c7e0b58f55ed87be380260bc4aa613c22e` |

## 4. Registration/start failure evidence

| Evidence | Exact result |
|---|---|
| Registration invocation / task | `inv-s87r0s0en2` / `invt-s87r0s0en3` |
| Registration time | `2026-09-04 03:21:24 +08:00`–`03:21:29 +08:00`; 5 seconds |
| Registration result | Command failed; ExitCode `1` |
| Successful pre-failure output | Connected to GitHub; Runner successfully added; Settings Saved |
| First substantive failure | `unset: CWT_REGISTRATION_TOKEN: cannot unset: readonly variable` at TAT temporary script line 10 |
| Causal classification | Readonly token variable was unset under `set -e`; shell exited before Runner start command |
| Token transmissions | Exactly `1`; short-lived; value not retained in evidence |
| Runner ID / name | `26` / `cwt-tencent-sg-a07663635ffe5a61e1bfb77a63ad2289` |
| Required labels | `self-hosted`, `linux`, `x64`, `cwt-tencent-singapore`, `cwt-single-use`, `cwt-job-a07663635ffe5a61e1bfb77a63ad2289` |
| Observed state | `offline`; `busy=false`; exact record deleted by ID |
| Final repository Runner inventory | `total_count: 0`; empty Runner list |
| Retry / repair / second token or host | None |

## 5. Runtime workflow non-dispatch evidence

| Evidence | Exact result |
|---|---|
| Workflow dispatches in this attempt | Exactly `0` |
| Latest historical Runtime run | `33786658330`; created `2026-09-03T17:47:44Z`; head `faab04781d9be67a1bb185e06a2a6cabb19f6e69` |
| Candidate Runtime execution | None for `506d92bf396bae52d7d8e54dabc46345036e4f86` |
| Sole accepted Runtime validator | Not executed |
| Compatibility result | None; Candidate repair not exercised |

## 6. Final teardown evidence

| Check | Final result |
|---|---|
| VM `ins-gd9jvdvm` | Absent; Singapore CVM count `0` |
| Disk `disk-lsnl28co` | Absent; Singapore cloud-disk count `0` |
| Public IPv4 `124.156.207.11` | Absent; Singapore public-IP count `0` |
| Security group `sg-cj9fpkvw` | Deleted after association count `0`; Singapore security-group count `0` |
| Repository Runner inventory | `0` |
| Lighthouse, Production, COS, DNS and Staging | Untouched |
| Remaining attempt-created billable resources | None |

## 7. Closure assertion

This manifest supports only **BLOCKED / HOLD at the Runner registration/start boundary, with no Runtime workflow dispatch and teardown complete**. It does not prove Runtime compatibility because the Candidate repair and sole accepted validator were never executed. It grants no investigation, correction, retry, token, new VM, new Runner, dispatch, promotion or deployment authority.
