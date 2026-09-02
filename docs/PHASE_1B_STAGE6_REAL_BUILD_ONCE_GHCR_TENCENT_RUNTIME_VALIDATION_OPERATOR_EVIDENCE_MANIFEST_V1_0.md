# CWT Phase 1B Stage 6 — Real Build Once / GHCR / Tencent Runtime Validation Operator Evidence Manifest V1.0

Status: **COMPLETE EVIDENCE MANIFEST FOR BLOCKED / HOLD OPERATOR OUTCOME**

Principal report: [PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_REPORT_V1_0.md](./PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_REPORT_V1_0.md)

## 1. Accepted source and controller artifacts

| Artifact/fact | SHA-256 or exact value |
|---|---|
| Release commit | `eb18aa94e1bd11d1e5b61714533fbde643d5c5ce` |
| Release tree | `d49c875537208b2963697af52ca14b3141c7cd26` |
| `.github/workflows/cwt-release-publish.yml` | `b24fedeaeeb92f3f7161f3c123637e639fd4e65ac74a1cfbb09f63d45d462527` |
| `.github/workflows/cwt-runtime-validation.yml` | `4400303e9307c71df0a8e42236c857fa3563f92bf87a9c27501aa7ead09ccfae` |
| `deploy/scripts/build-release-once.mjs` | `8dc86d2db65383eb7eb82d2795bd17e22f900b0aa9a0ac610b22f0c4a47bda5e` |
| `deploy/scripts/release-registry-integration.mjs` | `f8e4b114f8b0693df5763e498df93d5f43d4d04959e2fedd73cbb085e7bc8051` |
| `deploy/scripts/preflight-linux-runtime.mjs` | `97cdf2322aff22035763805ef7dae44d06b50dd264c8de816fac6aa9eacbf6c3` |
| `deploy/runtime-validation/linux-amd64-compatibility.v1.json` | `5e33bd99e412d35a7e0cffb6a1c379f0decf7f8f816cb087dc162906977514f0` |

## 2. External execution evidence

| Evidence | Result |
|---|---|
| GitHub release workflow count for the exact release commit | `1` |
| GitHub run / attempt / job | `33631313598` / `1` / `100251178915` |
| Run conclusion | `failure` |
| Build Once step | `success` |
| Emitted OCI index | `sha256:3a9e4f5783e4051d88acc10287219776d354c234fb8827012a9018a1ee5e9cbb` |
| Terminal workflow reason | `ghcr_privacy_unproven` |
| Fresh anonymous raw HTTP probe to exact digest | `401` |
| Detached evidence artifact | Not uploaded; final upload step skipped |
| Runtime workflow count for the exact release commit | `0` |
| Retry/rerun/continuation/repair | None |
| Promotion/deployment/manual PASS | None |
| Final repository Runner inventory | `0` |

The raw HTTP observation is bounded evidence of anonymous denial at the observation time. It does not replace the failed approved checker or change the workflow conclusion.

## 3. Tencent host cleanup evidence

| Check | Result |
|---|---|
| Exact preserved instance | `lhins-3c2vknjb` / `cwt-production-sg` |
| Instance post-cleanup state | Running; future Production host preserved |
| Refund/destruction request | Cancelled before submission; none requested |
| Prospective Runtime job accepted | No; Runtime workflow never dispatched |
| Temporary Runner registration | Removed |
| Temporary Runner root | Absent |
| Runner process count | `0` |
| Runner unit count | `0` |
| Runner sudoers entry count | `0` |
| Temporary validation residue count | `0` |
| Container count | `0` |
| CWT image count | `0` |
| Docker Engine / Compose | Preserved: `29.6.2` / `5.3.1` |
| Public inbound firewall rules | `0` |
| Existing SSH key material | Preserved due non-exclusive/ambiguous provenance and future Production access requirement |
| COS 100 GB package | Untouched and unused |

The Tencent Automation Assistant cleanup command completed with ExitCode `0` at `2026-09-02 21:38:35` Asia/Shanghai. A separate read-only verification completed with ExitCode `0` at `2026-09-02 21:39:26` Asia/Shanghai and returned:

`verify=PASS runner_root=absent runner_processes=0 runner_units=0 containers=0 cwt_images=0 validation_residue=0 docker=29.6.2 compose=5.3.1`

The Tencent instance list was then re-read and showed `cwt-production-sg` running in Singapore. Its firewall page showed `0` total rules and `暂无数据`.

## 4. Evidence limitations

- The failed workflow did not upload its detached `release.json` and evidence directory.
- Build output identities above are taken from the immutable GitHub run log emitted by the accepted Build Once authority.
- No Runtime evidence exists because dispatch did not occur.
- The GHCR subject remains unvalidated/unpromoted and was not mutated after the failure.
- Provider console observations establish current resource state; they do not constitute a deployment or Production-readiness claim.

## 5. Closure assertion

This manifest supports only the Operator conclusion **BLOCKED / HOLD**. It proves bounded cleanup and preservation of the future Production host; it does not prove the authorized chain passed, the image is Runtime-valid, or any deployment is authorized.
