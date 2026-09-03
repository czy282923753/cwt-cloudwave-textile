# CWT Phase 1B Stage 6 — Exact-Digest Runtime Recovery Preflight Operator Report V1.2

Status: **NEEDS_OWNER_DECISION — private GHCR credential preflight failed before resource creation**

Recorded at: `2026-09-03T05:52:16Z`

Evidence manifest: [PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_EVIDENCE_MANIFEST_V1_2.md](./PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_EVIDENCE_MANIFEST_V1_2.md)

This document is an append-only successor to the V1.1 blocked/HOLD Operator record. It preserves the historical Runner-registration failure and teardown record unchanged.

## 1. Authorized recovery boundary

The Owner authorized one bounded recovery attempt reusing the existing Build Once subject, with no rebuild and no source change:

| Fact | Exact value |
|---|---|
| Release source | `7e6ef0ad9fd00975da93789421c0d24ec9226e82` |
| Release tree | `29ef35dfafd989bfdc08bd2e987f44a0e784af24` |
| Build run / attempt | `33709304781` / `1` |
| OCI index | `sha256:89e04e7201694e6f202c71cceb368622cc2d584136a7eedfaee9044a45023e8a` |
| Detached artifact | `9876610372` |
| Intended runtime host | One new pay-as-you-go Tencent Singapore Ubuntu 24.04 native `linux/amd64` VM, no public inbound |

The authority required fail-closed handling for a missing account, IAM, MFA or credential permission and prohibited creating avoidable billable resources once such a precondition failed.

## 2. Immutable subject and compatibility-contract revalidation

Before any Tencent resource creation, the following remained exact:

- remote `main` is the authorized release source `7e6ef0ad9fd00975da93789421c0d24ec9226e82`;
- exactly one Build workflow run exists for that commit and it remains successful;
- detached artifact `9876610372` is present, is `8,927,668` bytes and is not expired;
- its `release.json` binds the exact release commit/tree and OCI index plus the accepted `linux/amd64` and `linux/arm64` child identities;
- the frozen Runtime workflow still requires one single-use Tencent Singapore `linux/x64` Runner and exact-digest GHCR materialization;
- the accepted compatibility profile remains Ubuntu `24.04`, native `amd64`, host Docker Engine `29.6.2`, Docker Compose `5.3.1`, no DIND and no shared/persistent Runner;
- `deploy/runtime-validation/linux-amd64-compatibility.v1.json` remains SHA-256 `5e33bd99e412d35a7e0cffb6a1c379f0decf7f8f816cb087dc162906977514f0`.

No rebuild, tag, image copy, archive transfer, alternate subject or Production mutation occurred.

## 3. Private GHCR credential preflight and stop

The registry boundary was checked before opening the Tencent purchase flow:

| Check | Result |
|---|---|
| Anonymous exact-digest request | HTTP `401`; private access remained enforced |
| Current GitHub CLI credential scopes | `gist`, `read:org`, `repo`, `workflow`; `read:packages` absent |
| Authenticated bearer-token exact-digest request | HTTP `404`; exact private descriptor could not be read with the current credential |
| GitHub Packages API version-list request | HTTP `403`; GitHub explicitly reported that `read:packages` is required |

This is a credential-permission failure, not evidence that the immutable image is absent. The accepted Build run and detached artifact remain valid, but the current operator credential cannot independently revalidate or pull the private descriptor. Under the authorized recovery stop conditions, the execution therefore terminated as **NEEDS_OWNER_DECISION** before any paid infrastructure was created.

## 4. No-attempt and no-resource proof

| Check | Final result |
|---|---|
| New Tencent VM/disk/public IP/security group | None created |
| Runner registration token requested or transmitted | No |
| Runner registration attempt | `0` |
| Runtime workflow attempt for the exact release commit | `0` |
| Repository Actions Runner inventory | `0` |
| Rebuild, workflow retry, repair-after-failure | None |
| Promotion, deployment, S6-06, S6-07 or Stage 7 action | None |
| Long-term Production host / `cwt-production-sg` | Untouched |
| COS, DNS, Staging and Production | Untouched |

Because no new external resource existed, no teardown operation or destructive confirmation was required.

## 5. Terminal disposition and next gate

The recovery scope is **NEEDS_OWNER_DECISION** at its credential preflight. No Runtime result exists and no Production-readiness claim is made.

The next gate is an explicit Owner decision to provide or authorize an operator credential with `read:packages` for `czy282923753/cwt-cloudwave-textile`, followed by a newly bounded recovery execution. This record itself grants no credential mutation, new VM purchase, Runner registration, workflow dispatch, retry, promotion or deployment authority.
