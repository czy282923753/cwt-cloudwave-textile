# CWT Phase 1B Stage 6 — Exact-Digest Runtime Validation Evidence Manifest V1.9

Status: **BLOCKED — Tencent authenticated-access preflight unavailable; no external execution or resource creation**

Recorded at: `2026-09-05T08:24:11Z`

Principal report: [PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_REPORT_V1_9.md](./PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_REPORT_V1_9.md)

## 1. Exact authority identities

| Evidence | Exact result |
|---|---|
| Operator branch | `codex/stage6-runtime-validation-attempt-v1-9` |
| Candidate / tree | `a321ea6ce3891e42be4573b44cbce597c05f8f01` / `5f5d249d32868f2d6176e2d0104cffa2f7b97e9b` |
| Fresh Independent Review | `0e8d8b4730f1e5dbcc339ff2f4bf68409dfec36b`; `PASS` |
| Remote `main` | `506d92bf396bae52d7d8e54dabc46345036e4f86` |
| Runtime workflow blob / SHA-256 | `b5f38ba17ea037009269061bacbe2d67cb6ef413` / `0f52ded0fa0a7957645e6bc98ee997ef642cb39d72d1f35dae9c5cc608eb9584` |
| Release commit / tree | `7e6ef0ad9fd00975da93789421c0d24ec9226e82` / `29ef35dfafd989bfdc08bd2e987f44a0e784af24` |
| Provisioning blob / SHA-256 | `367332034e2b504353c5b00c563bf27ed6f0c95c` / `c5ac861443d1dd741e78206ab78ab8c7e0b58f55ed87be380260bc4aa613c22e` |
| Registration invocation blob / file SHA-256 | `96cb85aa281138385652bd0ea816450107000493` / `0184e5108a4ddd81dbd8edc5060c4c4369e65edd1fbead2c9f2a733179016839` |
| Registration wrapper | `6,894` bytes; SHA-256 `d12e5186d507eebc75fd751b493475034b39d76b740d0fa881c45d9d98f702e7`; canonical Base64 |
| Embedded registration payload | `3,752` bytes; SHA-256 `7c773a341cfd629dae2985f7c51792aee6f917ca5df7733f7200d26e780da94b`; byte-equal to Candidate source |

## 2. Read-only GitHub and GHCR evidence

| Evidence | Exact result |
|---|---|
| Workflow | Active, manual `workflow_dispatch`; exact reviewed source unchanged |
| Build run | `33709304781`; attempt `1`; `completed/success` |
| Artifact | `9876610372`; name `cwt-release-evidence-7e6ef0ad9fd00975da93789421c0d24ec9226e82`; `8,927,668` bytes; unexpired |
| Artifact archive SHA-256 | `fed62c295f003bc8ef984ec57fbec0c5b29156eff816de5613b8d0663b520b8f` |
| Artifact completeness | ZIP integrity passed; eight files; all six `release.json` evidence hashes passed |
| Release state / index | `built` / `sha256:89e04e7201694e6f202c71cceb368622cc2d584136a7eedfaee9044a45023e8a` |
| Revocation | No revocation record for the exact index was found in detached evidence or current repository records |
| GHCR authenticated descriptor | HTTP `200`; exact index digest |
| GHCR anonymous descriptor | HTTP `401` |
| `linux/amd64` descriptor / config | HTTP `200`; `sha256:301db86bc22329b01dd3ef3d4754c75c92de4d6577f26c218d638014335d90b3` / `sha256:bca984917ba83b271989fc00b5d23201178c4e5bbe7dc2012f4e0d2e33a3ac87`; 19 layers |
| `linux/arm64` descriptor / config | HTTP `200`; `sha256:b30d5700d36242ea1582e74b611c169e5c02f85b9ee9f2d8a6b7816eb49b918b` / `sha256:5968d3bd08a6433a9d04939385432f1c82415932b23144f9dd241dba1f774959`; 19 layers |
| Environment | `cwt-stage6-runtime-validation`; reviewer `czy282923753`; self-review permitted; exact `main` branch policy |
| Runner inventory | `total_count: 0` |

## 3. Tencent blocker evidence

| Evidence | Exact result |
|---|---|
| Intended region page | Tencent Cloud Singapore CVM inventory (`rid=5`) |
| Authentication result | Redirected to Tencent Cloud login; no authenticated console session |
| Previous login method | WeChat login produced an interactive QR-code boundary, not an existing authenticated session |
| Prior-resource absence check | Unavailable without authenticated Tencent access |
| Exact shape/image/network/price checks | Unavailable without authenticated Tencent access |
| Stop-rule classification | Required authenticated access and mandatory preflight facts unavailable; stop before VM |

No credential, QR authorization, account setting or provider configuration was created or changed.

## 4. Exact non-execution counts

| Evidence | Exact result |
|---|---|
| Fresh nonce | Not generated |
| VM / disk / public IP / security group created | `0` / `0` / `0` / `0` |
| Provisioning invocation | `0` |
| Registration token | `0` |
| Registration invocation | `0` |
| Runner created / final GitHub Runner inventory | `0` / `0` |
| Runtime workflow dispatch | `0` |
| Exact Runtime workflow conclusion | None for V1.9 |
| Attempt-created billable residue | None |
| Push / remote ref movement / rebuild / Registry write / retry / rerun | None |

## 5. Closure assertion

This manifest supports only **BLOCKED at mandatory Tencent authenticated-access preflight, before external execution, with no V1.9-created resource residue**. It does not provide a fresh authenticated Tencent inventory proof for historical resources and does not provide a Product Runtime result.

Stage 6 remains **Partial / HOLD**. The only next gate is coordinator disposition; no remediation, S6-06, S6-07, promotion, Deploy or later phase starts automatically.
