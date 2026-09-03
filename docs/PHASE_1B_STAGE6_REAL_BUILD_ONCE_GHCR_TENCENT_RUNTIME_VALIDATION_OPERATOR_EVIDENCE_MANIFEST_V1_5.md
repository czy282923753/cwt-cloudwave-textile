# CWT Phase 1B Stage 6 — Exact-Digest Runtime Validation Evidence Manifest V1.5

Status: **COMPLETE EVIDENCE MANIFEST FOR BLOCKED / HOLD OCI-MATERIALIZATION OUTCOME**

Principal report: [PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_REPORT_V1_5.md](./PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_REPORT_V1_5.md)

This manifest is append-only and supersedes no historical record.

## 1. Immutable identities and Candidate publication

| Evidence | Exact result |
|---|---|
| Workflow Candidate commit / tree | `faab04781d9be67a1bb185e06a2a6cabb19f6e69` / `72e3a6527f5f8d14e28b714556c4e95a3a3a27ef` |
| Runtime workflow blob | `b5f38ba17ea037009269061bacbe2d67cb6ef413` |
| Provisioning script blob / SHA-256 | `367332034e2b504353c5b00c563bf27ed6f0c95c` / `c5ac861443d1dd741e78206ab78ab8c7e0b58f55ed87be380260bc4aa613c22e` |
| Frozen release commit / tree | `7e6ef0ad9fd00975da93789421c0d24ec9226e82` / `29ef35dfafd989bfdc08bd2e987f44a0e784af24` |
| Candidate pushes | Exactly `1`; remote `main` resolved to exact Candidate |
| Build run / artifact | `33709304781` / `9876610372`; successful source evidence |
| Artifact SHA-256 | `fed62c295f003bc8ef984ec57fbec0c5b29156eff816de5613b8d0663b520b8f` |
| OCI index | `sha256:89e04e7201694e6f202c71cceb368622cc2d584136a7eedfaee9044a45023e8a` |
| Runner nonce | `459639a9780a425e9cd0fdc29057aaf5` |
| Rebuild / retag / copy | None |

## 2. Disposable host and network boundary

| Evidence | Exact result |
|---|---|
| Instance | `ins-cz64xr0g` / `cwt-runtime-validation-459639a9780a425e9cd0fdc29057aaf5` |
| Platform | Singapore Zone 2; Ubuntu 24.04; native `x86_64`; `SA5.MEDIUM4`; 2 vCPU / 4 GiB / 60 GiB |
| Disk / public IP / security group | `disk-iyjup4ma` / `43.134.174.160` / `sg-gorl45ju` |
| Private IP / VPC | `172.22.0.15` / `vpc-piootcsf` |
| Inbound security-group rules | Exactly `0` throughout |
| Outbound security-group rules | Exactly one IPv4 `0.0.0.0/0`, protocol `ALL`, allow rule |
| Management path | Tencent Automation Assistant only; SSH closed |
| Existing long-term resources | Lighthouse, Production, COS and DNS untouched |

## 3. Provisioning and registration evidence

| Evidence | Exact result |
|---|---|
| Provisioning invocation / task | `inv-s87n5igc0r` / `invt-s87n5igc0s` |
| Provisioning time / result | `2026-09-03T17:44:05Z`–`17:45:21Z`; ExitCode `0`; `CWT_PRE_REGISTRATION_OK` |
| Registration invocation / task | `inv-x87n8b0i63` / `invt-x87n8b0i64` |
| Registration time / result | `2026-09-03T17:47:03Z`–`17:47:10Z`; ExitCode `0`; Runner added and started |
| Registration-token transmissions | Exactly `1`; short-lived; value not retained in evidence |
| Runner ID / name | `25` / `cwt-tencent-sg-459639a9780a425e9cd0fdc29057aaf5` |
| Required labels | `self-hosted`, `linux`, `x64`, `cwt-tencent-singapore`, `cwt-single-use`, `cwt-job-459639a9780a425e9cd0fdc29057aaf5` |
| Pre-dispatch state | Online; idle |

## 4. Single Runtime workflow evidence

| Evidence | Exact result |
|---|---|
| Workflow dispatches | Exactly `1` |
| Run / number / attempt | `33786658330` / `2` / `1` |
| Job | `100752972062` |
| Candidate head | `main` / `faab04781d9be67a1bb185e06a2a6cabb19f6e69` |
| Run time | `2026-09-03T17:47:44Z`–`17:49:32Z` |
| Job time | `2026-09-03T17:48:19Z`–`17:49:31Z` |
| Final conclusion | `failure` |
| Successful pre-failure steps | Setup; exact checkout; exact Node.js; unique Runner binding; patched ORAS; detached artifact download; GHCR authentication |
| First substantive failure | Step 8, `Materialize read-only OCI evidence from the same GHCR digest` |
| Failure output | `{"status":"NOT_PASS","reasonCode":"integration_not_pass"}`; exit code `1` |
| Sole Runtime validator | Step 9 skipped; not executed |
| Repair / rerun / second host | None |

## 5. Final teardown evidence

| Check | Final result |
|---|---|
| VM `ins-cz64xr0g` | Absent; Singapore CVM count `0` |
| Disk `disk-iyjup4ma` | Absent; Singapore cloud-disk count `0` |
| Public IPv4 `43.134.174.160` | Absent; Singapore public-IP count `0` |
| Security group `sg-gorl45ju` | Deleted after association count `0`; Singapore security-group count `0` |
| Repository Runner inventory | `0` |
| Lighthouse, Production, COS and DNS | Untouched |

## 6. Closure assertion

This manifest supports only **BLOCKED / HOLD at exact-digest OCI materialization, with teardown complete**. It does not prove Runtime compatibility because the sole accepted validator was skipped. It grants no investigation, correction, retry, new VM, new Runner, dispatch, promotion or deployment authority.
