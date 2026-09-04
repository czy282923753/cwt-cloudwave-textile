# CWT Phase 1B Stage 6 — Exact-Digest Runtime Validation Operator Report V1.7

Status: **BLOCKED / HOLD — pre-dispatch TAT token-transport boundary was non-PASS; later Owner risk acceptance arrived after irreversible VM destruction; no Runner registration or Runtime workflow dispatch; teardown complete**

Recorded at: `2026-09-04T04:17:04Z`

Evidence manifest: [PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_EVIDENCE_MANIFEST_V1_7.md](./PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_EVIDENCE_MANIFEST_V1_7.md)

This document is an append-only successor to V1.6. It does not modify or supersede the historical V1.0–V1.6 execution records.

## 1. Authority and immutable inputs

The Owner authorized exactly one further external exact-digest Runtime Validation attempt, including one disposable Tencent Singapore host, one Runner registration, at most one Runtime workflow dispatch and mandatory teardown. No retry, second workflow or replacement VM was authorized.

| Fact | Exact value |
|---|---|
| Remote `main` before and after the attempt | `506d92bf396bae52d7d8e54dabc46345036e4f86` |
| Accepted registration Candidate / tree | `f26809ad82ff50c9c93e2bf635208e7ec153b117` / `d59c64a18095b5dec7ae51436ba74330e05b13f5` |
| Accepted docs closure | `acfec4182a41c4504a9b85cfaced517b60cd4ea7` |
| Independent PASS Review | `6307da3929b65099a89ffe2d47a33b29c4a52465`; review-only and not an execution source |
| Registration payload blob / SHA-256 | `1281a207e5ebe58b7fb78900213a44ef26ad7e0a` / `7c773a341cfd629dae2985f7c51792aee6f917ca5df7733f7200d26e780da94b` |
| Registration TAT contract blob / SHA-256 | `5ab9405bc487d8cf74ab32c4daa9c1a51dfab759` / `3c65d0b05ae694885b7bb9c32ebed048758a3369bcf2d4637721506eaec448a1` |
| Provisioning payload blob / SHA-256 | `367332034e2b504353c5b00c563bf27ed6f0c95c` / `c5ac861443d1dd741e78206ab78ab8c7e0b58f55ed87be380260bc4aa613c22e` |
| Frozen release commit / tree | `7e6ef0ad9fd00975da93789421c0d24ec9226e82` / `29ef35dfafd989bfdc08bd2e987f44a0e784af24` |
| Build Once run / attempt | `33709304781` / `1`; `success` |
| Detached artifact | `9876610372`; unexpired; `8927668` bytes |
| Artifact ZIP SHA-256 | `fed62c295f003bc8ef984ec57fbec0c5b29156eff816de5613b8d0663b520b8f` |
| OCI index | `ghcr.io/czy282923753/cwt-cloudwave-textile@sha256:89e04e7201694e6f202c71cceb368622cc2d584136a7eedfaee9044a45023e8a` |
| Attempt nonce | `f6d2be34d8bb3189259808d3c315936e` |

No branch or ref was pushed in this task.

## 2. Read-only pre-mutation gates

All required pre-mutation identity gates passed:

- Build run `33709304781` remained a successful manual run at the exact release commit with `run_attempt: 1`.
- Artifact `9876610372` was present and unexpired. Its ZIP SHA-256 matched the prior record, `release.json` bound the exact release commit/tree and OCI index, and all six recorded evidence-file hashes were independently recomputed and matched.
- Anonymous GHCR descriptor access returned HTTP `401`; authenticated exact-digest descriptor access returned HTTP `200`, media type `application/vnd.oci.image.index.v1+json` and exact `Docker-Content-Digest: sha256:89e04e...e8a`.
- Remote `main` remained exact `506d92bf396bae52d7d8e54dabc46345036e4f86`.
- The GitHub principal had repository administration, workflow and package-read access sufficient for the bounded attempt; repository Runner inventory was `0`.
- The review-only commit was not used as an execution source.

No Build Once, rebuild, retag, copy or Registry write occurred.

## 3. Disposable Tencent host and network boundary

Exactly one new disposable Tencent host was created:

| Fact | Exact value |
|---|---|
| Instance | `ins-jzyexfb6` / `cwt-runtime-validation-f6d2be34d8bb3189259808d3c315936e` |
| Created | `2026-09-04 11:58:58 +08:00` |
| Region / zone | Singapore / Singapore Zone 2 |
| Shape / image | `SA5.MEDIUM4`; 2 vCPU / 4 GiB; Ubuntu Server 24.04 LTS 64-bit; `img-mmytdhbn`; native `amd64` |
| System disk | `disk-gr2i30kk`; general-purpose SSD; 60 GiB; created `2026-09-04 11:58:45 +08:00` |
| Public / private IPv4 | `43.134.44.115` / `172.22.0.5` |
| VPC / subnet | `vpc-piootcsf` / `subnet-6uvqq9wg` |
| Temporary security group | `sg-5287wkt0` / `自定义模板-20260904115841127`; created `2026-09-04 11:58:41 +08:00` |
| Public inbound | Exactly `0` rules |
| Outbound | Exactly one IPv4 `0.0.0.0/0`, protocol `ALL`, allow rule; set `2026-09-04 12:02:09 +08:00` |
| Management | Tencent Automation Assistant only; no SSH, ICMP, HTTP/S or internal inbound rule; no DIND |

The displayed configuration price was CNY `0.41` per hour plus CNY `0.79/GB` public traffic at 5 Mbps. Security hardening and monitoring were disabled; Tencent Automation Assistant was enabled. Existing Production, Staging, Lighthouse, COS, DNS and `cwt-production-sg` resources were untouched.

## 4. Provisioning passed

The exact reviewed provisioning payload was submitted once through Tencent Automation Assistant. The editor round-trip remained byte-identical at SHA-256 `c5ac861443d1dd741e78206ab78ab8c7e0b58f55ed87be380260bc4aa613c22e`. The invocation used a 600-second timeout, default root setup identity, no parameter substitution and no COS output.

| Evidence | Exact result |
|---|---|
| Invocation / task | `inv-2888b00rhc` / `invt-2888b00rhd` |
| Started / ended | `2026-09-04 12:04:17 +08:00` / `2026-09-04 12:05:23 +08:00`; 66 seconds |
| Terminal result | `命令成功`; ExitCode `0` |
| Marker | `CWT_PRE_REGISTRATION_OK os=ubuntu-24.04 arch=amd64 docker=29.6.2 compose=5.3.1 runner=2.337.0 runner_tree_owner=ubuntu diag_write_probe=PASS docker_user_probe=PASS` |

Provisioning was the only TAT command executed in this attempt.

## 5. Pre-registration token-transport boundary and later Owner decision

Before generating a registration token, the operator inspected the live Tencent TAT `RunCommand` surface and current official interface semantics. The accepted registration contract required native `Username=ubuntu`, `SaveCommand=false`, output COS disabled and exact execution of the accepted payload bytes with four environment values.

At that time, the available TAT surface exposed command `Content` plus optional ordinary or hidden parameter substitution, but no separate environment-input field. Supplying the token by prefix/export would have changed the accepted payload content and placed the token in command `Content`; hidden-parameter substitution would have materialized it into the executed TAT script. Under the then-active task boundary, either route was non-PASS. This was classified as an **operator/platform token-transport boundary**, not a product or Runtime failure.

The operator therefore generated no GitHub Runner registration token, submitted no registration invocation, registered no Runner and dispatched no Runtime workflow. Mandatory teardown was initiated immediately.

After Owner MFA was completed and the final Tencent destruction confirmation had already been submitted, the Owner issued a narrow residual-risk acceptance permitting this one short-lived repository Runner registration token to be transiently materialized through TAT hidden-parameter substitution and the required wrapper/environment setup. The updated decision explicitly allowed continuation only if destruction had not completed and remained cancelable. By receipt time the VM and disk were already irreversibly absent, so the same attempt could not resume. The decision explicitly prohibited creating a replacement VM without new authorization.

No token was generated or exposed before or after that decision.

## 6. No Runner and no Runtime workflow dispatch

| Evidence | Exact result |
|---|---|
| Registration-token generations / transmissions | `0` / `0` |
| Registration TAT invocations | `0` |
| Repository Runner records created | `0` |
| Repository Runner inventory after teardown | `0` |
| Runtime workflow dispatches in this attempt | `0` |
| Latest historical Runtime run | `33786658330`; created `2026-09-03T17:47:44Z`; head `faab04781d9be67a1bb185e06a2a6cabb19f6e69` |
| Exact-digest Runtime validator | Not executed |

The attempt therefore provides no Runtime compatibility result and does not exercise either the registration Candidate or the accepted exact-digest Runtime path.

## 7. Mandatory teardown and final absence

The Tencent destruction detail identified exactly one instance and one system disk, with zero retained disks and zero retained elastic public IPs. The ordinary public IPv4 was released with the instance. The temporary security group was verified at association count `0` and deleted.

| Resource/check | Final result |
|---|---|
| VM `ins-jzyexfb6` | Absent; Singapore CVM count `0` |
| System disk `disk-gr2i30kk` | Absent; Singapore cloud-disk count `0` |
| Public IPv4 `43.134.44.115` | Absent; Singapore public-IP count `0` |
| Security group `sg-5287wkt0` | Association count `0`, then deleted; Singapore security-group count `0` |
| Repository Actions Runner inventory | `0` |
| Existing Production / Staging / Lighthouse / COS / DNS / `cwt-production-sg` | Untouched |

No billable resource created for this attempt remains.

## 8. Terminal disposition

This attempt is **BLOCKED / HOLD at the pre-registration TAT token-transport boundary, with no Runner registration, no Runtime workflow dispatch and teardown complete**. The later Owner residual-risk acceptance could not apply retroactively because destruction was already irreversible, and it did not authorize a replacement VM.

Any future external attempt requires fresh coordinator authorization for a new VM and must carry forward the Owner's narrow token-materialization acceptance without extending it to any long-lived credential. This record grants no retry, replacement resource, workflow dispatch, Build Once, promotion, deployment, S6-06, S6-07 or Stage 7 authority.
