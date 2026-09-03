# CWT Phase 1B Stage 6 — Real Build Once / GHCR / Tencent Runtime Validation Operator Evidence Manifest V1.1

Status: **COMPLETE EVIDENCE MANIFEST FOR BLOCKED / HOLD OPERATOR OUTCOME**

Principal report: [PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_REPORT_V1_1.md](./PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_REPORT_V1_1.md)

This manifest is append-only and supersedes no historical record.

## 1. Accepted source and controller artifacts

| Artifact/fact | SHA-256 or exact value |
|---|---|
| Release commit | `7e6ef0ad9fd00975da93789421c0d24ec9226e82` |
| Release tree | `29ef35dfafd989bfdc08bd2e987f44a0e784af24` |
| Excluded Fresh Review commit | `8adbcc124d3b1f0efdac746f84feca0b460cdb76` |
| `.github/workflows/cwt-release-publish.yml` | `b24fedeaeeb92f3f7161f3c123637e639fd4e65ac74a1cfbb09f63d45d462527` |
| `.github/workflows/cwt-runtime-validation.yml` | `4400303e9307c71df0a8e42236c857fa3563f92bf87a9c27501aa7ead09ccfae` |
| `deploy/scripts/build-release-once.mjs` | `8dc86d2db65383eb7eb82d2795bd17e22f900b0aa9a0ac610b22f0c4a47bda5e` |
| `deploy/scripts/release-registry-integration.mjs` | `5f94aeefdf36971cfc885b9347fbcc79c433bc27daa9762331483fd156ef9c61` |
| `deploy/scripts/preflight-linux-runtime.mjs` | `97cdf2322aff22035763805ef7dae44d06b50dd264c8de816fac6aa9eacbf6c3` |
| `deploy/runtime-validation/linux-amd64-compatibility.v1.json` | `5e33bd99e412d35a7e0cffb6a1c379f0decf7f8f816cb087dc162906977514f0` |

## 2. Build and GHCR evidence

| Evidence | Result |
|---|---|
| Release workflow count for exact commit | `1` |
| GitHub run / attempt / job | `33709304781` / `1` / `100505190849` |
| Workflow and job conclusion | `success` / `success` |
| Exact source checkout | `success` |
| Build Once | `success` |
| Private exact-digest publication proof | `PASS` |
| OCI index | `sha256:89e04e7201694e6f202c71cceb368622cc2d584136a7eedfaee9044a45023e8a` |
| `linux/amd64` manifest/config | `sha256:301db86bc22329b01dd3ef3d4754c75c92de4d6577f26c218d638014335d90b3` / `sha256:bca984917ba83b271989fc00b5d23201178c4e5bbe7dc2012f4e0d2e33a3ac87` |
| `linux/arm64` manifest/config | `sha256:b30d5700d36242ea1582e74b611c169e5c02f85b9ee9f2d8a6b7816eb49b918b` / `sha256:5968d3bd08a6433a9d04939385432f1c82415932b23144f9dd241dba1f774959` |
| Detached artifact | ID `9876610372`; `8,927,668` bytes; expires `2026-10-03T03:06:18Z`; not expired at closure |
| Runtime workflow count for exact commit | `0` |
| Retry/rerun/repair/promotion/deployment | None |

## 3. Tencent disposable-host setup evidence

| Check | Result |
|---|---|
| Instance | `ins-ghpikn3a` / `cwt-runtime-validation-5c2ab8307c8c47ccb66d62eaecbcad08` |
| Runtime platform | Singapore Zone 2; Ubuntu 24.04 LTS; native `x86_64`; 2 vCPU / 4 GiB / 60 GiB |
| Temporary security group before setup | `sg-mpz5n3wy`; console returned `当前无入站规则` |
| Management path | Tencent Automation Assistant; SSH remained closed |
| Installation invocation | `inv-s86wtf0ci8`; success; 77 seconds |
| Docker Engine | `29.6.2` |
| Docker Compose | `5.3.1` |
| GitHub Actions Runner | `2.337.0` |
| Runner archive SHA-256 | `70920811a4f8ad4328818682bca5c6469c1c942fab52448868071d0063816613`; verified |
| Concise verification invocation | `inv-286ww30rdq`; success; `CWT_VERIFY_OK` |

## 4. First-failure evidence

| Evidence | Result |
|---|---|
| Runner registration invocation | `inv-286xdh07wv` |
| Start | `2026-09-03 12:47:31` Asia/Shanghai |
| Duration / outcome | Less than one second; command failed |
| ExitCode | `134` |
| First causal error | `System.UnauthorizedAccessException` writing `/opt/cwt-actions-runner/_diag/Runner_20260903-044730-utc.log` |
| Runner registered | No |
| Runtime workflow dispatched | No |
| Runtime attempt consumed | No; count remains `0` |
| Registration token retention | Not recorded in repository or evidence; short-lived provider/GitHub transmission only |

## 5. Teardown and final absence evidence

| Check | Final result |
|---|---|
| VM `ins-ghpikn3a` | Absent; Singapore instance list in no-instance state |
| Disk `disk-evhuxch0` | Absent; Singapore cloud-disk inventory had no matching resource and no data |
| Public IPv4 `43.134.51.186` | Absent; public-IP inventory count `0` |
| Security group `sg-mpz5n3wy` | Deleted; absent after refresh |
| Residue security group `sg-k3bb0z2o` | Association count `0`, then deleted; absent after refresh |
| Residue security group `sg-55v6wo5s` | Association count `0`, then deleted; absent after refresh |
| Singapore security-group inventory | Count `0`; `暂无数据` |
| Repository Actions Runner inventory | `0` |
| Long-term Production host `lhins-3c2vknjb` / `cwt-production-sg` | Untouched |
| COS 100 GB package | Untouched and unused |

## 6. Evidence limitations and closure assertion

- Provider-console observations establish resource absence at the final observation time; they are not Runtime Validation evidence.
- Runtime Validation has no run, job, artifact or PASS/FAIL conclusion because it was never dispatched.
- The Build PASS and exact private GHCR digest remain valid bounded Build evidence, but do not prove `linux/amd64` Runtime compatibility or Production readiness.
- No secret value is retained in this manifest or the principal report.

This manifest supports only **BLOCKED / HOLD at Runner registration, with mandatory teardown complete**. It grants no repair, retry, promotion or deployment authority.
