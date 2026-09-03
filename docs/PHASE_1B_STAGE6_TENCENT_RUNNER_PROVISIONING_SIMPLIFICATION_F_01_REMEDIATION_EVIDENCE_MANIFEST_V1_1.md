# CWT Phase 1B Stage 6 — Tencent Runner Provisioning Simplification F-01 Remediation Evidence Manifest V1.1

Status: **COMPLETE REMEDIATION EVIDENCE — awaiting Fresh Independent Review**

Principal report: [PHASE_1B_STAGE6_TENCENT_RUNNER_PROVISIONING_SIMPLIFICATION_F_01_REMEDIATION_IMPLEMENTATION_REPORT_V1_1.md](./PHASE_1B_STAGE6_TENCENT_RUNNER_PROVISIONING_SIMPLIFICATION_F_01_REMEDIATION_IMPLEMENTATION_REPORT_V1_1.md)

## 1. Identity and scope

| Evidence | Exact result |
|---|---|
| Base | `aa1cc95c6f27945ceb65baf241783728e48363f0` |
| Failed Review | `aba7a1b8c4a60bf0ebba63515d01f2e52dc43503`; non-ancestor |
| Candidate / tree | `faab04781d9be67a1bb185e06a2a6cabb19f6e69` / `72e3a6527f5f8d14e28b714556c4e95a3a3a27ef` |
| Candidate paths | Four: one existing script, one current invocation JSON, one existing test, one README |
| Push / VM / live install / registration / workflow | None / none / none / `0` / `0` |

## 2. Candidate file identities

| Path | SHA-256 |
|---|---|
| `deploy/runtime-validation/provision-ubuntu-amd64-runner.sh` | `c5ac861443d1dd741e78206ab78ab8c7e0b58f55ed87be380260bc4aa613c22e` |
| `deploy/runtime-validation/tencent-tat-provisioning-invocation.v1.json` | `98d67f285e0fd5afb57a6a4b7227c57b6214cdb8992d44a552d4059ba81e41b1` |
| `deploy/scripts/provision-ubuntu-amd64-runner.test.mjs` | `897315d05e8ea046983018f54b6b47efd1387d80190471cfb1f8216c9b5f8285` |
| `deploy/host/README.md` | `ae390d29afb738675a3aee796d54451d2f0a137b9b580b380fccdb07fb450600` |

Payload mode remains `100755`. Exact Docker/Compose/Runner/package/archive identities and all pre-registration ownership/user probes are unchanged from the accepted V1.0 parser/package boundary.

## 3. TAT invocation and output authority

| Evidence | Exact result |
|---|---|
| Timeout parameter | Exact `600` seconds; default `60` rejected |
| Completion authority | TAT terminal `SUCCESS` and exact process exit code `0` |
| Marker | `CWT_PRE_REGISTRATION_OK`; `corroborating_only` |
| Fail-closed states | Timeout, cancellation, terminal failure, missing exit code, any nonzero exit |
| Ordinary retained-output ceiling | `24576` bytes |
| Success-output budget | `1024` bytes |
| Failure diagnostic tail | `4096` bytes plus fixed bounded header |
| Full verbose log | Root-created mode `0600`, ephemeral local only, removed on success/failure |

## 4. Decisive verification

| Check | Result |
|---|---|
| Bash syntax | PASS |
| Prior exact package selector matrix | PASS |
| `600 + SUCCESS + 0`, marker absent | Authorizes |
| Default `60 + SUCCESS + 0` | Does not authorize |
| Marker plus failed/timeout/cancelled/nonzero/missing exit | Does not authorize |
| Noisy success output | Full noise discarded; retained output below `1024` bytes |
| Noisy failure output | Original exit `73`; bounded safe tail below TAT ceiling |
| Mandatory-marker authority / unbounded log replay | Absent / absent |
| Focused suite | `10/10 PASS` |
| Full deployment suite | `127/127 PASS` |
| ESLint / JSON / diff | PASS / PASS / PASS |
| Prior V1.0 report and manifest | Sidecars verify; byte-preserved |
| ShellCheck | Unavailable; no dependency added |
| External mutation | None |

## 5. Claim boundary

This manifest proves only the local TAT invocation contract, bounded output/exit semantics and unchanged pre-registration gates. It does not prove live Tencent status/exit transport, real Ubuntu installation, Runner registration, exact-digest Runtime Validation, teardown, promotion or deployment. The sole next gate is Fresh Independent Implementation / Operations / Security Review of Candidate `faab04781d9be67a1bb185e06a2a6cabb19f6e69`.
