# CWT Phase 1B Stage 6 — Exact-Digest Runtime Validation Operator Report V1.6

Status: **BLOCKED / HOLD — the one post-Technical-Escalation attempt failed after Runner registration but before Runner start; no Runtime workflow dispatch; teardown complete**

Recorded at: `2026-09-03T19:28:37Z`

Evidence manifest: [PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_EVIDENCE_MANIFEST_V1_6.md](./PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_EVIDENCE_MANIFEST_V1_6.md)

This document is an append-only successor to V1.5. It does not modify or supersede the historical V1.0–V1.5 execution records.

## 1. Execution authority and immutable subject

Following Technical Escalation, the Owner authorized one corrected post-escalation attempt. Test-stage provisioning and teardown did not require repeated approval; direct Tencent MFA remained an Owner action. The Coordinator delegated teardown only after the first substantive failure. The immutable identities were:

| Fact | Exact value |
|---|---|
| Workflow Candidate commit / tree | `506d92bf396bae52d7d8e54dabc46345036e4f86` / `d1e61ef09baccbb2229886a97394ec65156e7797` |
| Candidate parent | `b4fc86f63cbea918032880fd40b6054780738b09` |
| Independent Review | `PASS`; review commit `161235c2bef7bb483dabb530abc30629a3a4211d`; review commit is not an ancestor of the Candidate and was not pushed |
| Runtime workflow blob | `b5f38ba17ea037009269061bacbe2d67cb6ef413` |
| Provisioning script blob / SHA-256 | `367332034e2b504353c5b00c563bf27ed6f0c95c` / `c5ac861443d1dd741e78206ab78ab8c7e0b58f55ed87be380260bc4aa613c22e` |
| Frozen release commit / tree | `7e6ef0ad9fd00975da93789421c0d24ec9226e82` / `29ef35dfafd989bfdc08bd2e987f44a0e784af24` |
| Build run / attempt | `33709304781` / `1`; success |
| Detached artifact | `9876610372`; name `cwt-release-evidence-7e6ef0ad9fd00975da93789421c0d24ec9226e82`; not expired; size `8927668` bytes |
| Detached artifact SHA-256 | `fed62c295f003bc8ef984ec57fbec0c5b29156eff816de5613b8d0663b520b8f` |
| OCI index | `sha256:89e04e7201694e6f202c71cceb368622cc2d584136a7eedfaee9044a45023e8a`; authenticated descriptor HTTP `200` and exact `Docker-Content-Digest` |
| Attempt nonce | `a07663635ffe5a61e1bfb77a63ad2289` |

The Candidate was a verified fast-forward descendant of the prior remote `main` at `faab04781d9be67a1bb185e06a2a6cabb19f6e69`. It was pushed to remote `main` exactly once (`faab0478..506d92bf`), and post-push verification resolved `refs/heads/main` to the exact Candidate. No documentation closure, review commit, tag or additional ref was pushed.

## 2. Disposable Tencent host and network boundary

Exactly one disposable host was created for this attempt:

| Fact | Exact value |
|---|---|
| Instance | `ins-gd9jvdvm` / `cwt-runtime-validation-a07663635ffe5a61e1bfb77a63ad2289` |
| Created | `2026-09-04 03:01:44` China Standard Time |
| Region / zone | Singapore / Singapore Zone 2 |
| Platform | Ubuntu Server 24.04 LTS 64-bit; native `amd64`; `SA5.MEDIUM4`; 2 vCPU / 4 GiB |
| System disk | `disk-lsnl28co`; general-purpose SSD; 60 GiB; created `2026-09-04 03:01:26` China Standard Time |
| Public / private IPv4 | `124.156.207.11` / `172.22.0.6` |
| VPC / subnet | `vpc-piootcsf` / `subnet-6uvqq9wg` |
| Temporary security group | `sg-cj9fpkvw` / `自定义模板-20260904030121535` |
| Public inbound | Exactly `0` rules throughout |
| Outbound | Exactly one IPv4 `0.0.0.0/0`, protocol `ALL`, allow rule; last modified `2026-09-04 03:16:43 +08:00` |
| Management | Tencent Automation Assistant only; no SSH, ICMP, HTTP/S or internal inbound allow rule; no DIND |

The displayed hourly configuration price was CNY `0.41` plus public traffic at CNY `0.79/GB`, with a 5 Mbps traffic-billed public interface. Security hardening and monitoring were off; Tencent Automation Assistant was on. No existing Lighthouse, Production, COS, DNS or Staging resource was modified.

## 3. Provisioning passed

The exact reviewed provisioning script was submitted once through Tencent Automation Assistant with a 600-second timeout. The browser-editor round-trip content hash remained the exact reviewed SHA-256.

| Evidence | Exact result |
|---|---|
| Provisioning invocation / task | `inv-s87qwc0mt3` / `invt-s87qwc0mt4` |
| Started / ended | `2026-09-04 03:18:48 +08:00` / `2026-09-04 03:20:01 +08:00`; 73 seconds |
| Result | `命令成功`; ExitCode `0` |
| Marker | `CWT_PRE_REGISTRATION_OK os=ubuntu-24.04 arch=amd64 docker=29.6.2 compose=5.3.1 runner=2.337.0 runner_tree_owner=ubuntu diag_write_probe=PASS docker_user_probe=PASS` |

Provisioning therefore passed before the terminal registration/start failure.

## 4. First substantive failure before Runner start

One short-lived Runner registration token was generated and transmitted through Tencent Automation Assistant only. Its value was not retained in evidence. The intended single-use ephemeral Runner identity was:

- Name: `cwt-tencent-sg-a07663635ffe5a61e1bfb77a63ad2289`
- Labels: `self-hosted`, `linux`, `x64`, `cwt-tencent-singapore`, `cwt-single-use`, `cwt-job-a07663635ffe5a61e1bfb77a63ad2289`

| Evidence | Exact result |
|---|---|
| Registration invocation / task | `inv-s87r0s0en2` / `invt-s87r0s0en3` |
| Started / ended | `2026-09-04 03:21:24 +08:00` / `2026-09-04 03:21:29 +08:00`; 5 seconds |
| Result | Command failed; ExitCode `1` |
| Successful output before failure | `√ Connected to GitHub`; `√ Runner successfully added`; `√ Settings Saved.` |
| First substantive failure | `/usr/local/qcloud/tat_agent/tmp/invt-s87r0s0en3.sh: line 10: unset: CWT_REGISTRATION_TOKEN: cannot unset: readonly variable` |
| Causal classification | The registration command declared `CWT_REGISTRATION_TOKEN` readonly and then attempted to unset it. With `set -e`, the shell exited before the Runner start command. |
| Temporary Runner record | Repository Runner ID `26`; correct name and labels; `offline`; `busy=false` |

The exact temporary Runner record was deleted by ID after failure. A subsequent repository Runner inventory returned `total_count: 0` and an empty `runners` array.

The operator stopped at this first substantive failure. No command was patched, no registration or start was retried, no second token was generated, no second Runner or VM was created, and no repair path was exercised.

## 5. No Runtime dispatch

There was no Runtime workflow dispatch in this attempt. The repository's latest `CWT authorized exact-digest Linux Runtime Validation` run remained historical run `33786658330`, created `2026-09-03T17:47:44Z` against prior head `faab04781d9be67a1bb185e06a2a6cabb19f6e69`.

Therefore the Candidate repair at `506d92bf396bae52d7d8e54dabc46345036e4f86` was not exercised by the Runtime workflow, and the sole accepted Runtime validator did not run. This attempt provides no Runtime compatibility result.

## 6. Mandatory teardown and final absence

After Owner MFA verification, the Coordinator delegated teardown only. The Tencent destruction detail identified exactly one instance and one system disk, with zero retained disks and zero retained elastic public IPs. The ordinary public IPv4 was released with the instance. The temporary security group was verified at association count `0` and deleted.

| Resource/check | Final result |
|---|---|
| VM `ins-gd9jvdvm` | Absent; Singapore CVM count `0` |
| System disk `disk-lsnl28co` | Absent; Singapore cloud-disk count `0` |
| Public IPv4 `124.156.207.11` | Absent; Singapore public-IP count `0` |
| Security group `sg-cj9fpkvw` | Association count `0`, then deleted; Singapore security-group count `0` |
| Repository Actions Runner inventory | `0` |
| Long-term Lighthouse / Production resources | Untouched |
| COS, DNS, Staging and Production | Untouched |

No billable resource created for this attempt remains.

## 7. Terminal disposition and next gate

This post-Technical-Escalation attempt is **BLOCKED / HOLD at the Runner registration/start boundary, with no Runtime workflow dispatch and teardown complete**. The Candidate validator repair was not exercised, so no PASS authority exists.

Any future attempt requires a separately governed correction and review of the Runner registration/start command boundary before a new token, Runner, VM or workflow dispatch. This record grants no correction, retry, new resource, dispatch, promotion, deployment, S6-06, S6-07 or Stage 7 authority.
