# CWT Phase 1B Stage 6 — Exact-Digest Runtime Validation Operator Report V1.9

Status: **BLOCKED — mandatory Tencent authenticated-access preflight was unavailable; no VM, token, TAT invocation, Runner registration or Runtime workflow dispatch occurred**

Recorded at: `2026-09-05T08:24:11Z`

Evidence manifest: [PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_EVIDENCE_MANIFEST_V1_9.md](./PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_EVIDENCE_MANIFEST_V1_9.md)

This document is the append-only V1.9 Operator record. It does not modify or supersede V1.0–V1.8 and does not place any review-only commit into Product or evidence ancestry.

## 1. Authority and exact local identity

The Owner authorized one external exact-digest Linux Runtime Validation attempt only if every mandatory preflight fact was available and matched before resource creation. The stop rule required `BLOCKED` without creating a VM when any preflight fact was unavailable, changed, expired, revoked, mismatched or required new credentials or configuration.

The local Operator branch was created cleanly from the exact Product Candidate:

| Fact | Exact value |
|---|---|
| Local branch | `codex/stage6-runtime-validation-attempt-v1-9` |
| Candidate / tree | `a321ea6ce3891e42be4573b44cbce597c05f8f01` / `5f5d249d32868f2d6176e2d0104cffa2f7b97e9b` |
| RW-004 review-only commit / verdict | `0e8d8b4730f1e5dbcc339ff2f4bf68409dfec36b` / `PASS` |
| Provisioning payload blob / SHA-256 | `367332034e2b504353c5b00c563bf27ed6f0c95c` / `c5ac861443d1dd741e78206ab78ab8c7e0b58f55ed87be380260bc4aa613c22e` |
| Registration invocation blob / file SHA-256 | `96cb85aa281138385652bd0ea816450107000493` / `0184e5108a4ddd81dbd8edc5060c4c4369e65edd1fbead2c9f2a733179016839` |
| Decoded registration wrapper | `6,894` bytes; SHA-256 `d12e5186d507eebc75fd751b493475034b39d76b740d0fa881c45d9d98f702e7` |
| Embedded registration payload | `3,752` bytes; SHA-256 `7c773a341cfd629dae2985f7c51792aee6f917ca5df7733f7200d26e780da94b`; byte-equal to the Candidate Git blob |

The registration invocation reproduced canonical Base64, exactly one hidden token placeholder and exactly one each of nonce, Runner-name and repository placeholders. Its settings reproduced exactly: `RunCommand`, `SHELL`, parameter substitution enabled, `username=ubuntu`, `workingDirectory=/home/ubuntu`, timeout `600`, `saveCommand=false`, and COS output disabled.

## 2. GitHub, artifact and GHCR preflight passed

The read-only GitHub/GHCR portion of preflight completed without mutation:

| Check | Exact result |
|---|---|
| Remote `main` | `506d92bf396bae52d7d8e54dabc46345036e4f86` |
| Runtime workflow | Active, manually dispatchable `workflow_dispatch`; Git blob `b5f38ba17ea037009269061bacbe2d67cb6ef413`; SHA-256 `0f52ded0fa0a7957645e6bc98ee997ef642cb39d72d1f35dae9c5cc608eb9584` |
| Candidate vs reviewed workflow | No difference in `.github/workflows/cwt-runtime-validation.yml` |
| Build Once release / tree | `7e6ef0ad9fd00975da93789421c0d24ec9226e82` / `29ef35dfafd989bfdc08bd2e987f44a0e784af24` |
| Build Once run | `33709304781`; attempt `1`; `completed/success` |
| Detached artifact | `9876610372`; `8,927,668` bytes; `expired=false`; expiry `2026-10-03T03:06:18Z` |
| Artifact archive | SHA-256 `fed62c295f003bc8ef984ec57fbec0c5b29156eff816de5613b8d0663b520b8f`; ZIP integrity passed; eight files present; all six detached evidence hashes matched `release.json` |
| Release state / revocation | `built`; no revocation record for the exact index in the detached evidence or current repository record |
| GHCR privacy | Authenticated exact-digest descriptor and both children returned HTTP `200`; anonymous exact-digest request returned HTTP `401` |
| OCI index | `sha256:89e04e7201694e6f202c71cceb368622cc2d584136a7eedfaee9044a45023e8a` |
| `linux/amd64` child / config | `sha256:301db86bc22329b01dd3ef3d4754c75c92de4d6577f26c218d638014335d90b3` / `sha256:bca984917ba83b271989fc00b5d23201178c4e5bbe7dc2012f4e0d2e33a3ac87`; 19 layers |
| `linux/arm64` child / config | `sha256:b30d5700d36242ea1582e74b611c169e5c02f85b9ee9f2d8a6b7816eb49b918b` / `sha256:5968d3bd08a6433a9d04939385432f1c82415932b23144f9dd241dba1f774959`; 19 layers |
| Runtime Environment | `cwt-stage6-runtime-validation` exists; required reviewer `czy282923753`; self-review permitted; only branch policy `main` |
| Repository Runner inventory | `total_count: 0` |

No Environment setting, package, artifact, workflow, Runner or remote Git ref was modified.

## 3. Mandatory Tencent preflight blocker

The live Tencent Cloud console did not have an authenticated session. Direct navigation to the Singapore CVM inventory redirected to the Tencent Cloud login surface. Selecting the previously used WeChat login method exposed a QR-code login boundary rather than an already authenticated provider session.

Therefore the task could not verify, without obtaining new interactive access:

- that all prior attempt-created Singapore VM, disk, public IP and temporary security-group resources remained absent;
- that the exact existing VPC/subnet, `SA5.MEDIUM4`, `img-mmytdhbn`, Singapore Zone 2 and 60 GiB general-purpose SSD boundary remained available without substitution; or
- that the displayed rate was not materially above the V1.8 rate.

The task required authenticated Tencent access to be already available and required an immediate stop when a preflight fact or credential was unavailable. The Operator did not ask for or create a new credential, did not treat an interactive QR login as an existing authenticated session, and did not cross the resource-creation gate.

## 4. Non-execution and residue boundary

| Authorized action | Actual count/result |
|---|---|
| Fresh attempt nonce | Not generated |
| Tencent VM / disk / public IP / security group created | `0` / `0` / `0` / `0` |
| Provisioning TAT invocation | `0` |
| GitHub Runner registration token | `0` |
| Registration TAT invocation | `0` |
| Runner record created | `0`; final GitHub Runner inventory `0` |
| Runtime workflow dispatch | `0` |
| Rebuild, retag, Registry write, retry, replacement or rerun | None |
| Attempt-created billable residue | None, because the attempt stopped before any Tencent mutation |

No teardown mutation was required for V1.9-created resources because none existed. This record does **not** claim a fresh authenticated Tencent inventory proof for historical resources; the inability to obtain that proof is the preflight blocker itself.

## 5. Terminal disposition

Terminal status: **BLOCKED**.

Outcome: the mandatory Tencent authenticated-access preflight was unavailable, so the authorized one-shot external execution did not begin. There is no Product Runtime result and no exact workflow conclusion for V1.9.

Stage 6 remains **Partial / HOLD**. The next gate is coordinator disposition. This record grants no login/credential change, retry, VM, token, TAT invocation, Runner, workflow dispatch, remediation, promotion, Deploy, S6-06, S6-07, Stage acceptance or later-phase authority.
