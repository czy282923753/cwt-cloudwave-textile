# CWT Phase 1B Stage 6 — Corrected Exact-Digest Runtime Validation Operator Report V1.4

Status: **BLOCKED / HOLD — the single authorized setup invocation failed before Runner registration; teardown complete**

Recorded at: `2026-09-03T13:01:19Z`

Evidence manifest: [PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_EVIDENCE_MANIFEST_V1_4.md](./PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_EVIDENCE_MANIFEST_V1_4.md)

This document is an append-only successor to V1.3. It does not modify or supersede the historical V1.0–V1.3 execution records.

## 1. Execution authority and immutable subject

The Owner authorized exactly one corrected exact-digest Runtime Validation execution with the following immutable identities:

| Fact | Exact value |
|---|---|
| Workflow Candidate commit / tree | `10d89c07899527d6e23e358571ae3343529d85e4` / `e2f9da99920c5d188cfa4bd67202d1055d1245aa` |
| Runtime workflow blob | `b5f38ba17ea037009269061bacbe2d67cb6ef413` |
| Frozen release commit / tree | `7e6ef0ad9fd00975da93789421c0d24ec9226e82` / `29ef35dfafd989bfdc08bd2e987f44a0e784af24` |
| Build run / attempt | `33709304781` / `1`; success |
| Detached artifact | `9876610372`; available and not expired at preflight |
| OCI index | `sha256:89e04e7201694e6f202c71cceb368622cc2d584136a7eedfaee9044a45023e8a` |
| Compatibility profile | Ubuntu 24.04; native `amd64`; Docker 29.6.2; no DIND |

The local documentation closure commit `8924a783` and independent review commit `cce0aac` were evidence-only authorities and were not treated as workflow source authority.

## 2. Preflight and one-time Candidate publication

The operator verified that the Candidate was a fast-forward descendant of the frozen release, its tree and Runtime workflow blob matched the authorized values, and the worktree was clean. Remote `main` initially resolved to the frozen release.

The Candidate was then pushed to `main` exactly once:

`7e6ef0ad9fd00975da93789421c0d24ec9226e82 -> 10d89c07899527d6e23e358571ae3343529d85e4`

Post-push verification confirmed remote `main` at the exact Candidate and the workflow blob remained `b5f38ba17ea037009269061bacbe2d67cb6ef413`. No documentation closure, review-only commit or tag was pushed.

Authenticated GHCR descriptor retrieval returned HTTP `200` with `Docker-Content-Digest` exactly equal to the authorized OCI index; anonymous retrieval returned HTTP `401`. The detached build evidence was downloaded and verified against the frozen release commit/tree, built state, OCI index and native `amd64` provenance. No rebuild, retag, copy or alternate artifact was used.

## 3. Disposable Tencent host

Exactly one new disposable host was created:

| Fact | Exact value |
|---|---|
| Instance | `ins-2vgnfesi` / `cwt-runtime-validation-5c2ab8307c8c47ccb66d62eaecbcad08` |
| Region / zone | Singapore / Singapore Zone 2 |
| Platform | Ubuntu Server 24.04 LTS; native `x86_64`; standard SA9; 2 vCPU / 4 GiB |
| System disk | `disk-garz34ne`; general-purpose SSD; 60 GiB |
| Temporary public IPv4 | `43.134.49.250` |
| VPC / subnet | `vpc-piootcsf` / `subnet-6uvqq9wg` |
| Temporary security group | `sg-9scxv3xa` |
| Public inbound | `0` rules throughout |
| Outbound | One IPv4 `0.0.0.0/0`, protocol `ALL`, allow rule required for setup egress |
| Management | Tencent Automation Assistant only; SSH remained closed |

The purchase form's preset ICMP, SSH 22, RDP 3389, HTTP 80, HTTPS 443 and internal allow-all inbound rules were all disabled. The generated security group was verified with zero inbound rules before setup. No existing Lighthouse, Production, COS or DNS resource was modified.

## 4. Single setup invocation and first substantive failure

After explicit Owner confirmation to run the setup software, exactly one Tencent Automation Assistant invocation was submitted:

| Fact | Exact result |
|---|---|
| Invocation / task | `inv-287dgig5rb` / `invt-287dgig5rc` |
| Started / ended | `2026-09-03T12:48:38Z` / `2026-09-03T12:48:57Z` |
| Duration | 19 seconds |
| Result | `命令失败`; ExitCode `141` |
| Last completed boundary | Docker apt repository metadata fetched; second `apt-get update` reached `Reading package lists...` |

The setup ran with `pipefail` and selected the pinned Docker package using an `apt-cache madison docker-ce | awk ... { print $3; exit }` pipeline. The observed ExitCode `141` is consistent with the upstream command receiving `SIGPIPE` when `awk` exits after its first match. This is an evidence-based causal inference from the submitted command and exit status; no repair command was run to test the inference.

The invocation stopped before Docker installation verification, Actions Runner download, Runner-directory ownership/write probes, Runner registration and workflow dispatch. Per the terminal rule, this was treated as the first substantive failure. The operator performed no command correction, second invocation, second VM, registration attempt, workflow dispatch, rerun, rebuild, promotion or deployment.

## 5. GitHub non-registration and non-dispatch proof

After the failure:

| Check | Exact result |
|---|---|
| Repository self-hosted Runner inventory | `0` |
| Registration-token transmission | None |
| Runner registration attempts | `0` |
| Runtime workflow run for Candidate `10d89c07899527d6e23e358571ae3343529d85e4` | None |
| Workflow dispatches in this execution | `0` |
| Most recent historical Runtime run | `33723012086`, frozen release head `7e6ef0ad...`, created before this execution |

The historical failed run `33723012086` was not rerun and is not evidence of a Candidate execution.

## 6. Mandatory teardown and final absence

After explicit Owner confirmation and Tencent MFA, the disposable resources were immediately destroyed. The instance termination detail identified exactly one instance and one system disk, with no retained disk or elastic public IP. The ordinary public IP was released with the instance. The unbound temporary security group was then deleted.

| Resource/check | Final result |
|---|---|
| VM `ins-2vgnfesi` | Absent; Singapore CVM count `0` |
| System disk `disk-garz34ne` | Absent; Singapore cloud-disk count `0` |
| Public IPv4 `43.134.49.250` | Absent; Singapore public-IP count `0` |
| Security group `sg-9scxv3xa` | Association count `0`, then deleted; Singapore security-group count `0` |
| Repository Actions Runner inventory | `0` |
| Long-term Lighthouse / Production resources | Untouched |
| COS, DNS, Staging and Production | Untouched |

No billable resource created for this execution remains.

## 7. Terminal disposition and next gate

The single authorized corrected exact-digest execution is **BLOCKED / HOLD at pre-registration setup**. It does not prove exact-digest Runtime compatibility, and it does not classify the Candidate workflow as failed because that workflow was never dispatched.

Any future attempt requires separately authorized correction and review of the external provisioning procedure before a new VM, setup invocation, registration or dispatch. This record grants no retry, workflow edit, new Runner, new VM, promotion, deployment, S6-06, S6-07 or Stage 7 authority.
