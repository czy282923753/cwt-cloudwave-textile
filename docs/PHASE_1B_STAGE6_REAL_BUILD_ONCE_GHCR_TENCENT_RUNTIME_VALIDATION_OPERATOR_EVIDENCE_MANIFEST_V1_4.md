# CWT Phase 1B Stage 6 — Corrected Exact-Digest Runtime Validation Evidence Manifest V1.4

Status: **COMPLETE EVIDENCE MANIFEST FOR BLOCKED / HOLD PRE-REGISTRATION OUTCOME**

Principal report: [PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_REPORT_V1_4.md](./PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_REPORT_V1_4.md)

This manifest is append-only and supersedes no historical record.

## 1. Immutable identities and Candidate publication

| Evidence | Exact result |
|---|---|
| Workflow Candidate commit / tree | `10d89c07899527d6e23e358571ae3343529d85e4` / `e2f9da99920c5d188cfa4bd67202d1055d1245aa` |
| Runtime workflow blob | `b5f38ba17ea037009269061bacbe2d67cb6ef413` |
| Frozen release commit / tree | `7e6ef0ad9fd00975da93789421c0d24ec9226e82` / `29ef35dfafd989bfdc08bd2e987f44a0e784af24` |
| Remote `main` before / after | Frozen release / exact Candidate |
| Candidate pushes | Exactly `1`; fast-forward |
| Documentation/review commits pushed | None |
| Build run / artifact | `33709304781` / `9876610372`; success / unexpired at preflight |
| OCI index | `sha256:89e04e7201694e6f202c71cceb368622cc2d584136a7eedfaee9044a45023e8a` |
| Authenticated / anonymous GHCR descriptor | HTTP `200`, exact digest / HTTP `401` |
| Rebuild / retag / copy | None |

## 2. Disposable host and network boundary

| Evidence | Exact result |
|---|---|
| Instance | `ins-2vgnfesi` / `cwt-runtime-validation-5c2ab8307c8c47ccb66d62eaecbcad08` |
| Platform | Singapore Zone 2; Ubuntu 24.04; native `x86_64`; 2 vCPU / 4 GiB / 60 GiB |
| Disk / public IP / security group | `disk-garz34ne` / `43.134.49.250` / `sg-9scxv3xa` |
| VPC / subnet | `vpc-piootcsf` / `subnet-6uvqq9wg` |
| Inbound security-group rules | `0` throughout |
| Outbound security-group rules | One IPv4 allow-all egress rule; no inbound mutation |
| Management path | Tencent Automation Assistant; SSH closed |

## 3. Setup failure boundary

| Evidence | Exact result |
|---|---|
| Setup invocations | Exactly `1` |
| Invocation / task | `inv-287dgig5rb` / `invt-287dgig5rc` |
| Started / ended | `2026-09-03T12:48:38Z` / `2026-09-03T12:48:57Z` |
| Result | ExitCode `141`; command failed |
| Last observed output | Docker repository metadata fetched; `Reading package lists...` |
| Causal inference | `pipefail` plus early-exit `awk` in the Docker-version selection pipeline caused an upstream `SIGPIPE` |
| Docker verification | Not reached |
| Runner installation and permission probes | Not reached |
| Repair / second invocation | None |

## 4. Registration and Runtime non-occurrence

| Evidence | Exact result |
|---|---|
| Registration-token transmission | None |
| Runner registrations | `0` |
| Repository Runner inventory after failure | `0` |
| Candidate Runtime workflow runs | `0` |
| Workflow dispatches in this execution | `0` |
| Historical run `33723012086` | Unchanged; frozen release head; not rerun |
| Exact-digest Runtime validator | Not reached |

## 5. Final teardown evidence

| Check | Final result |
|---|---|
| VM `ins-2vgnfesi` | Absent; Singapore CVM count `0` |
| Disk `disk-garz34ne` | Absent; Singapore cloud-disk count `0` |
| Public IPv4 `43.134.49.250` | Absent; Singapore public-IP count `0` |
| Security group `sg-9scxv3xa` | Deleted after association count reached `0`; Singapore security-group count `0` |
| Repository Runner inventory | `0` |
| Lighthouse, Production, COS and DNS | Untouched |

## 6. Closure assertion

This manifest supports only **BLOCKED / HOLD at pre-registration setup, with teardown complete**. It does not prove exact-digest Runtime compatibility and does not record a Candidate workflow failure because no Candidate workflow run existed. It grants no correction, retry, new VM, registration, dispatch, promotion or deployment authority.
