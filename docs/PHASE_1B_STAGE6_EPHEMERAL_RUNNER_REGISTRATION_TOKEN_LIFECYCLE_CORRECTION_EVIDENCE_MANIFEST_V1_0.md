# CWT Phase 1B Stage 6 — Ephemeral Runner Registration Token-Lifecycle Correction Evidence Manifest V1.0

Date: **2026-09-04**

Status: **IMPLEMENTATION EVIDENCE COMPLETE — independent Review required; Product Runtime remains HOLD**

Principal report: `docs/PHASE_1B_STAGE6_EPHEMERAL_RUNNER_REGISTRATION_TOKEN_LIFECYCLE_CORRECTION_IMPLEMENTATION_REPORT_V1_0.md`

## 1. Linear authority

| Evidence | Exact identity |
| --- | --- |
| Accepted OCI Candidate / tree | `506d92bf396bae52d7d8e54dabc46345036e4f86` / `d1e61ef09baccbb2229886a97394ec65156e7797` |
| Original V1.6 evidence commit | `3b2801bfbb27d672b2dc2e2d7b88c1cc8fea0c5c` |
| Corrected baseline / tree | `aece565bc062ad47d6e92b4503c0e4c130c802bd` / `5e34a14e6e8b3cc707397bfc7bce6acadda87c57` |
| Corrected baseline sole parent | `506d92bf396bae52d7d8e54dabc46345036e4f86` |
| Code Candidate / tree | `49f4ab86f0801e8aa5f5354c7c0de97bcba09ac2` / `20937e58cea896e612bbd1f141d28813d0648a1e` |
| Candidate sole parent | `aece565bc062ad47d6e92b4503c0e4c130c802bd` |

No merge exists. The original V1.6 evidence commit, prior Technical Escalation artifacts and accepted OCI Candidate remain immutable.

## 2. Preserved accepted blobs

The following corrected-baseline blobs equal the corresponding accepted `506d92bf...` blobs exactly:

| Path | Git blob |
| --- | --- |
| `deploy/scripts/build-release-once.mjs` | `6e731640ab7a02c72be7c08bc256908fe50212e1` |
| `deploy/scripts/preflight-image.mjs` | `940574e8fe83da5a0a2110f98b758c863850eb83` |
| `deploy/scripts/preflight-image.test.mjs` | `9c31ec915a9a666a0fb23bd94cd063bd0b90f004` |
| `deploy/scripts/release-registry-integration.mjs` | `9c30a55dc1c8ca43fb15d02f98a6e1b793113273` |
| `deploy/scripts/release-registry-integration.test.mjs` | `12f319204e08c2a92bc51737a7e269b26d18672f` |

The following corrected-baseline blobs equal the original `3b2801bf...` V1.6 evidence blobs exactly:

| Path | Git blob / SHA-256 where applicable |
| --- | --- |
| `docs/PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_REPORT_V1_6.md` | `580bde7b4e7759b70a669c8babda39337123374d`; SHA-256 `b2bb6d61f748c85ea19ad9fd7ceacfff4ebbc224746d0b556adb183a397dd0cd` |
| `docs/PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_REPORT_V1_6.md.sha256` | `b659ecddfe88a2621d855489c2bc946cf00122df` |
| `docs/PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_EVIDENCE_MANIFEST_V1_6.md` | `d06742a427058e8c48c73bd97a845e1ca75b6cb9`; SHA-256 `ef122e929b769b8e31fa00e7396b42d014efff4364d8efc20eb382206522bb4b` |
| `docs/PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_EVIDENCE_MANIFEST_V1_6.md.sha256` | `0673255780eb5ccb11ffbb901eb12de8f3b7012d` |

Both V1.6 sidecars verify PASS.

## 3. Exact Candidate byte inventory

The code Candidate diff from `aece565b...` contains exactly:

```text
M deploy/host/README.md
A deploy/runtime-validation/register-and-start-ephemeral-runner.sh
A deploy/scripts/register-and-start-ephemeral-runner.test.mjs
```

| Candidate path | Mode / Git blob | SHA-256 |
| --- | --- | --- |
| `deploy/host/README.md` | `100644` / `6c99abee2d21a53186404f327e3e75efd76c8f12` | `a0a8952ad80f862a5f364c5ef324dcb27ec884d9c2b80893ce447c41806d9d68` |
| `deploy/runtime-validation/register-and-start-ephemeral-runner.sh` | `100755` / `ac0e55b823afb0e2af0b6fad5692d3e241fd7d26` | `48f5d4d2166462cdcde9cc691449dbd8e403a5921129d8ab84a1c052770091b0` |
| `deploy/scripts/register-and-start-ephemeral-runner.test.mjs` | `100644` / `7ed448eee343bbe391f52eb415834eeed7f3c5fc` | `a1d9dedd8fadb1425a0271c78cba4d871e0e1d4207f41955c8a8cf2c3821dc22` |

No Product, workflow, OCI checker, provisioning setup, Build, database, Schema/Migration, Registry, lifecycle or Runtime validator path changed.

## 4. Payload contract evidence

| Invariant | Candidate result |
| --- | --- |
| Shell trace | disabled with `set +x` before input read |
| Token variable | ordinary local; never readonly; never re-exported |
| Exported token input | unset immediately after local copy and before config/start |
| Token consumer | one silent `config.sh --token` invocation |
| Local token scope | blanked and unset before start |
| Runner child environment | explicit `/usr/bin/env -u CWT_REGISTRATION_TOKEN` |
| Local token file/log/evidence | none created |
| Repository | exact `czy282923753/cwt-cloudwave-textile` |
| Name | exact `cwt-tencent-sg-<128-bit-lowercase-hex-nonce>` |
| Labels | exact `cwt-tencent-singapore,cwt-single-use,cwt-job-<nonce>` plus GitHub standard labels |
| Runner lifecycle | one `--ephemeral --disableupdate` registration; one start |
| Success state | exact non-symlink `.runner` file required before start |
| Retry/fallback/state/custody | absent |
| Cloud/token/TAT/workflow/Runtime authority | absent |

## 5. Local/Synthetic verification

| Gate | Exact result |
| --- | --- |
| Bash syntax | PASS |
| Focused test | PASS; 6 tests; 0 failed/skipped/cancelled/todo |
| Successful path | one config, one start, exact marker; token absent from output/files/start scope |
| Config failure / state absence | fail closed; no start |
| Launch failure | fail closed; no success marker; no retry |
| Missing/malformed inputs | 8 cases fail before config |
| Readonly-plus-unset mutation | rejected |
| Exact repository/name/labels/ephemeral binding | PASS |
| `pnpm test:deployment` | PASS; 136 tests; 0 failed/skipped/cancelled/todo |
| Focused ESLint | PASS; zero warnings |
| `pnpm typecheck` | PASS |
| `git diff --check` | PASS |
| Security & Test Simplification Check | PASS; no extra mechanism or duplicated test harness |

## 6. Mutation and resource ledger

| Boundary | Result |
| --- | --- |
| Real credential/token acquisition or use | `0` |
| TAT invocation | `0` |
| GitHub Runner registration/deletion | `0 / 0` |
| VM / Runner / external resource creation | `0 / 0 / 0` |
| Workflow dispatch/rerun | `0 / 0` |
| Registry write / Build Once / retag | `0 / 0 / 0` |
| Transition / promotion / deployment | `0 / 0 / 0` |
| Production / Staging / Lighthouse / COS / DNS | untouched |
| S6-06 / S6-07 / Stage 7 | not started |
| Git push | none |

## 7. Claim ceiling and next gate

This manifest proves the bounded local implementation Candidate only. It does not prove live TAT transport semantics, actual Runner registration/start, Runtime compatibility or cleanup of a future external attempt.

Implementation status: **COMPLETED**. Product Runtime: **HOLD**. Next gate: **one separate independent Reviewer task**.
