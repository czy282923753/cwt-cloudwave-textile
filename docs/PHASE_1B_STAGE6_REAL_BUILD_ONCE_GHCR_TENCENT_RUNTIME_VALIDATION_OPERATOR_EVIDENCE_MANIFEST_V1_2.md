# CWT Phase 1B Stage 6 — Exact-Digest Runtime Recovery Preflight Evidence Manifest V1.2

Status: **COMPLETE EVIDENCE MANIFEST FOR NEEDS_OWNER_DECISION PREFLIGHT OUTCOME**

Principal report: [PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_REPORT_V1_2.md](./PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_REPORT_V1_2.md)

This manifest is append-only and supersedes no historical record.

## 1. Reused immutable subject

| Evidence | Exact result |
|---|---|
| Release commit / tree | `7e6ef0ad9fd00975da93789421c0d24ec9226e82` / `29ef35dfafd989bfdc08bd2e987f44a0e784af24` |
| Remote `main` | `7e6ef0ad9fd00975da93789421c0d24ec9226e82` |
| Release workflow count | `1` |
| Build run / attempt / conclusion | `33709304781` / `1` / `success` |
| OCI index | `sha256:89e04e7201694e6f202c71cceb368622cc2d584136a7eedfaee9044a45023e8a` |
| `linux/amd64` manifest/config | `sha256:301db86bc22329b01dd3ef3d4754c75c92de4d6577f26c218d638014335d90b3` / `sha256:bca984917ba83b271989fc00b5d23201178c4e5bbe7dc2012f4e0d2e33a3ac87` |
| Detached artifact | ID `9876610372`; `8,927,668` bytes; not expired; expires `2026-10-03T03:06:18Z` |
| Compatibility profile SHA-256 | `5e33bd99e412d35a7e0cffb6a1c379f0decf7f8f816cb087dc162906977514f0` |
| Accepted host profile | Ubuntu `24.04`; native `amd64`; host Docker `29.6.2`; Compose `5.3.1`; no DIND |

## 2. Credential-boundary evidence

| Check | Exact result |
|---|---|
| Anonymous GHCR descriptor request | HTTP `401` |
| Active account | `czy282923753` |
| Current CLI token scopes | `gist`, `read:org`, `repo`, `workflow` |
| Required scope | `read:packages` |
| Authenticated GHCR exact-digest request | HTTP `404` |
| GitHub Packages API request | HTTP `403`; `You need at least read:packages scope to get a package's versions.` |
| Secret retention | No token value was printed, stored in repository evidence or sent to Tencent |

The HTTP `404` is recorded only as credential-boundary behavior. It is not interpreted as an image-absence verdict because the same credential lacks the required package-read scope.

## 3. Stop and absence evidence

| Check | Final result |
|---|---|
| New Tencent runtime resources | None created |
| Runner registration token | Not requested |
| Runner registration attempts | `0` |
| Runtime workflow count for exact release commit | `0` |
| Repository Actions Runner inventory | `0` |
| Rebuild / retry / repair / promotion / deployment | None |
| Production host, Production security group, COS and DNS | Untouched |
| Teardown required | No; there was no new resource to destroy |

## 4. Closure assertion

This manifest supports only **NEEDS_OWNER_DECISION at private-GHCR credential preflight**. It does not establish Runtime compatibility or Production readiness and grants no further external-action authority.
