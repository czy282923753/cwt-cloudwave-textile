# CWT Phase 1B Stage 6 — Exact-Digest Runtime Validation Operator Report V1.5

Status: **BLOCKED / HOLD — the single authorized Runtime workflow failed at exact-digest OCI materialization; teardown complete**

Recorded at: `2026-09-03T18:13:40Z`

Evidence manifest: [PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_EVIDENCE_MANIFEST_V1_5.md](./PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_EVIDENCE_MANIFEST_V1_5.md)

This document is an append-only successor to V1.4. It does not modify or supersede the historical V1.0–V1.4 execution records.

## 1. Execution authority and immutable subject

The Owner authorized exactly one further corrected exact-digest Runtime Validation execution. Test-stage provisioning and teardown did not require repeated approval; direct Tencent MFA remained an Owner action. The immutable identities were:

| Fact | Exact value |
|---|---|
| Workflow Candidate commit / tree | `faab04781d9be67a1bb185e06a2a6cabb19f6e69` / `72e3a6527f5f8d14e28b714556c4e95a3a3a27ef` |
| Runtime workflow blob | `b5f38ba17ea037009269061bacbe2d67cb6ef413` |
| Provisioning script blob / SHA-256 | `367332034e2b504353c5b00c563bf27ed6f0c95c` / `c5ac861443d1dd741e78206ab78ab8c7e0b58f55ed87be380260bc4aa613c22e` |
| Frozen release commit / tree | `7e6ef0ad9fd00975da93789421c0d24ec9226e82` / `29ef35dfafd989bfdc08bd2e987f44a0e784af24` |
| Build run / attempt | `33709304781` / `1`; success |
| Detached artifact | `9876610372`; downloaded successfully by the Runtime job |
| Detached artifact SHA-256 | `fed62c295f003bc8ef984ec57fbec0c5b29156eff816de5613b8d0663b520b8f` |
| OCI index | `sha256:89e04e7201694e6f202c71cceb368622cc2d584136a7eedfaee9044a45023e8a` |
| Runner nonce | `459639a9780a425e9cd0fdc29057aaf5` |
| Compatibility profile | Ubuntu 24.04; native `amd64`; Docker 29.6.2; Actions Runner 2.337.0; no DIND |

The Candidate was pushed to remote `main` exactly once and post-push verification resolved `origin/main` to the exact Candidate. No later local documentation closure commit was pushed.

## 2. Disposable Tencent host and network boundary

The originally selected SA9 shape was unavailable at purchase time. After explicit Owner approval of the exact substitute, exactly one disposable SA5 host was created:

| Fact | Exact value |
|---|---|
| Instance | `ins-cz64xr0g` / `cwt-runtime-validation-459639a9780a425e9cd0fdc29057aaf5` |
| Region / zone | Singapore / Singapore Zone 2 |
| Platform | Ubuntu Server 24.04 LTS; native `x86_64`; `SA5.MEDIUM4`; 2 vCPU / 4 GiB |
| System disk | `disk-iyjup4ma`; general-purpose SSD; 60 GiB |
| Temporary public IPv4 | `43.134.174.160` |
| Private IPv4 | `172.22.0.15` |
| VPC | `vpc-piootcsf` |
| Temporary security group | `sg-gorl45ju` / `自定义模板-20260904013854100` |
| Public inbound | Exactly `0` rules throughout |
| Outbound | Exactly one IPv4 `0.0.0.0/0`, protocol `ALL`, allow rule required for setup and validation egress |
| Management | Tencent Automation Assistant only; no SSH, ICMP, HTTP/S or internal inbound allow rule |

The displayed hourly configuration price was CNY `0.41` plus public traffic at CNY `0.79/GB`. No existing Lighthouse, Production, COS or DNS resource was modified.

## 3. Provisioning and single-use Runner registration

The reviewed provisioning script was submitted once through Tencent Automation Assistant with a 600-second timeout:

| Evidence | Exact result |
|---|---|
| Provisioning invocation / task | `inv-s87n5igc0r` / `invt-s87n5igc0s` |
| Started / ended | `2026-09-03T17:44:05Z` / `2026-09-03T17:45:21Z` |
| Result | `命令成功`; ExitCode `0`; marker `CWT_PRE_REGISTRATION_OK` |
| Registration invocation / task | `inv-x87n8b0i63` / `invt-x87n8b0i64` |
| Started / ended | `2026-09-03T17:47:03Z` / `2026-09-03T17:47:10Z` |
| Result | `命令成功`; ExitCode `0`; markers `Runner successfully added`, `Settings Saved`, `CWT_RUNNER_STARTED` |
| Runner | ID `25`; `cwt-tencent-sg-459639a9780a425e9cd0fdc29057aaf5` |
| Labels | `self-hosted`, `linux`, `x64`, `cwt-tencent-singapore`, `cwt-single-use`, `cwt-job-459639a9780a425e9cd0fdc29057aaf5` |
| Registration token | One short-lived token generated and transmitted through the registration command; no token value recorded in evidence |

The Runner was verified online and idle before dispatch. It was configured as a single-use ephemeral Runner and automatically deregistered after the job.

## 4. Single Runtime workflow and substantive failure

Exactly one Runtime workflow was dispatched with the immutable release commit, OCI index, evidence run ID and Runner nonce:

| Fact | Exact value |
|---|---|
| Workflow run / number / attempt | `33786658330` / `2` / `1` |
| Job | `100752972062`; `One Tencent Singapore ephemeral linux/amd64 Runtime Validation` |
| Candidate ref / head | `main` / `faab04781d9be67a1bb185e06a2a6cabb19f6e69` |
| Run created / updated | `2026-09-03T17:47:44Z` / `2026-09-03T17:49:32Z` |
| Job started / completed | `2026-09-03T17:48:19Z` / `2026-09-03T17:49:31Z` |
| Final conclusion | `failure` |

The job successfully completed setup, exact release checkout, exact Node.js installation, unique Runner binding verification, hash-pinned patched ORAS installation, detached artifact download and private GHCR authentication. Runner verification emitted `status=PASS` for the exact name, nonce label, provider, region and single-use lifecycle binding.

The first substantive failure occurred in step 8, `Materialize read-only OCI evidence from the same GHCR digest`. After approximately 43 seconds the integration command emitted:

`{"status":"NOT_PASS","reasonCode":"integration_not_pass"}`

and exited with code `1`. The evidence does not establish a narrower causal classification, so this operator record does not infer one.

Step 9, `Run the sole accepted Linux Runtime Validation authority`, was skipped. Therefore this execution does not prove or disprove application Runtime compatibility; it proves only that the authorized integration path did not materialize the exact-digest OCI evidence successfully. No workflow edit, repair command, rerun, rebuild, retag, copy, second Runner, second VM, promotion or deployment was performed.

## 5. Mandatory teardown and final absence

After the terminal workflow failure, the disposable resources were immediately destroyed. The Tencent destruction detail identified exactly one instance and its one system disk, with zero retained disks and zero retained elastic public IPs. The ordinary public IPv4 was released with the instance. The temporary security group was verified at association count `0` and then deleted.

| Resource/check | Final result |
|---|---|
| VM `ins-cz64xr0g` | Absent; Singapore CVM count `0` |
| System disk `disk-iyjup4ma` | Absent; Singapore cloud-disk count `0` |
| Public IPv4 `43.134.174.160` | Absent; Singapore public-IP count `0` |
| Security group `sg-gorl45ju` | Association count `0`, then deleted; Singapore security-group count `0` |
| Repository Actions Runner inventory | `0` |
| Long-term Lighthouse / Production resources | Untouched |
| COS, DNS, Staging and Production | Untouched |

No billable resource created for this execution remains.

## 6. Terminal disposition and next gate

The single authorized exact-digest execution is **BLOCKED / HOLD at exact-digest OCI materialization, with teardown complete**. The sole accepted Runtime validator did not execute and no PASS authority exists.

Any future attempt requires a separately governed investigation, correction and review of the integration/materialization boundary before a new Runner, VM or workflow dispatch. This record grants no retry, workflow edit, new Runner, new VM, promotion, deployment, S6-06, S6-07 or Stage 7 authority.
