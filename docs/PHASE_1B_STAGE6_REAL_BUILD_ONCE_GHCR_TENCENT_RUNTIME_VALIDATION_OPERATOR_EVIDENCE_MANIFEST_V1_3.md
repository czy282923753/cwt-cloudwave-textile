# CWT Phase 1B Stage 6 — Exact-Digest Runtime Recovery Evidence Manifest V1.3

Status: **COMPLETE EVIDENCE MANIFEST FOR BLOCKED / HOLD RUNTIME OUTCOME**

Principal report: [PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_REPORT_V1_3.md](./PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_REPORT_V1_3.md)

This manifest is append-only and supersedes no historical record.

## 1. Immutable subject and registry preflight

| Evidence | Exact result |
|---|---|
| Release commit / tree | `7e6ef0ad9fd00975da93789421c0d24ec9226e82` / `29ef35dfafd989bfdc08bd2e987f44a0e784af24` |
| Build run / attempt | `33709304781` / `1`; success |
| Detached artifact | `9876610372`; not expired |
| OCI index | `sha256:89e04e7201694e6f202c71cceb368622cc2d584136a7eedfaee9044a45023e8a` |
| Anonymous GHCR request | HTTP `401` |
| Authenticated GHCR request after minimal scope elevation | HTTP `200`; `Docker-Content-Digest` exact match |
| New scope | `read:packages` only; no package-write/delete/admin scope requested |
| Rebuild / copy / tag / archive transfer | None |

## 2. Disposable host and permission probe

| Evidence | Exact result |
|---|---|
| Instance | `ins-lacsd1yc` / `cwt-runtime-validation-0d30c11033a94b9bbb16a5ce8109aba6` |
| Platform | Singapore Zone 2; Ubuntu 24.04; native `x86_64`; 2 vCPU / 4 GiB / 60 GiB |
| Disk / public IP / security group | `disk-s0iepj5u` / `43.128.114.251` / `sg-2rv8foc2` |
| Inbound security-group rules | `0` |
| Outbound security-group rules | One IPv4 allow-all egress rule; no inbound mutation |
| Setup invocation | `inv-x8721g0ite`; success; 76 seconds |
| Docker / Compose / Runner | `29.6.2` / `5.3.1` / `2.337.0` |
| Runner archive SHA-256 | `70920811a4f8ad4328818682bca5c6469c1c942fab52448868071d0063816613` |
| Tree ownership | Entire Runner tree `ubuntu:ubuntu` |
| `_diag` actual-user write probe | PASS; create/check/delete under `ubuntu` |
| Docker actual-user access | PASS |

## 3. Registration and Runtime attempt

| Evidence | Exact result |
|---|---|
| Runner name | `cwt-tencent-sg-0d30c11033a94b9bbb16a5ce8109aba6` |
| Required nonce label | `cwt-job-0d30c11033a94b9bbb16a5ce8109aba6` |
| Registration attempts | `1`; success; ephemeral Runner online before dispatch |
| Runtime workflow runs | Exactly `1` actual run |
| Runtime run / attempt / job | `33723012086` / `1` / `100545934208` |
| Exact checkout | Success; HEAD `7e6ef0ad9fd00975da93789421c0d24ec9226e82` |
| First failed step | `Verify the unique Tencent Singapore Runner binding before GHCR access` |
| Error / exit | `node: command not found` / `127` |
| Exact Node setup | Skipped because it is ordered after the failing Node-dependent step |
| Private GHCR workflow access | Not reached |
| Runtime validator | Not reached |
| Rerun / repair | None |

The rejected HTTP `422` dispatch request using a raw SHA created no GitHub run and consumed no Runtime execution. The sole actual run used `ref=main` only after remote `main` was reverified as the exact release commit; workflow checkout retained the exact source authority.

## 4. Final teardown evidence

| Check | Final result |
|---|---|
| VM `ins-lacsd1yc` | Absent; Singapore CVM inventory empty |
| Disk `disk-s0iepj5u` | Absent; cloud-disk count `0` |
| Public IPv4 `43.128.114.251` | Absent; public-IP count `0` |
| Security group `sg-2rv8foc2` | Deleted after association count reached `0`; security-group count `0` |
| Repository Runner inventory | `0` |
| Production host/SG, COS and DNS | Untouched |

## 5. Closure assertion

This manifest supports only **BLOCKED / HOLD at the pre-GHCR workflow binding step, with teardown complete**. It does not prove exact-digest Runtime compatibility or Production readiness and grants no correction, rerun, promotion or deployment authority.
