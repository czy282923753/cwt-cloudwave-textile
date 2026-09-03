# CWT Phase 1B Stage 6 — Real Build Once / GHCR / Tencent Runtime Validation Operator Report V1.1

Status: **BLOCKED / HOLD — Build Once PASS; Runtime Validation was not dispatched**

Recorded at: `2026-09-03T05:38:42Z`

Evidence manifest: [PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_EVIDENCE_MANIFEST_V1_1.md](./PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_EVIDENCE_MANIFEST_V1_1.md)

This document is an append-only successor to the V1.0 Operator record. It does not revise the historical V1.0 outcome.

## 1. Scope and authority

The Owner authorized exactly one external chain:

`exact release source -> one Build Once -> private GHCR exact digest -> one disposable Tencent Singapore linux/amd64 Runner -> one Runtime Validation attempt -> mandatory teardown`

The authority excluded the Fresh Review-only commit, retries, reruns, self-repair, alternate evidence, promotion, deployment and Production-host use. The long-term Tencent Lighthouse host `lhins-3c2vknjb` / `cwt-production-sg` and the separately purchased COS 100 GB package remained out of scope and untouched.

## 2. Immutable release source and Review separation

| Fact | Exact value |
|---|---|
| Release source commit | `7e6ef0ad9fd00975da93789421c0d24ec9226e82` |
| Release source tree | `29ef35dfafd989bfdc08bd2e987f44a0e784af24` |
| Remote release branch | `main` |
| Remote `main` after the authorized fast-forward | `7e6ef0ad9fd00975da93789421c0d24ec9226e82` |
| Fresh Review-only commit excluded from release ancestry | `8adbcc124d3b1f0efdac746f84feca0b460cdb76` |
| Review-only ancestry check | Not an ancestor of the release source (`git merge-base --is-ancestor` exit `1`) |

The accepted source was fast-forwarded to remote `main` without merge, rebase, force-push or source modification. The local docs-only closure commit created from this record is intentionally not part of the release source and is not pushed.

## 3. Build Once and private GHCR outcome

| Fact | Exact value |
|---|---|
| Workflow run / attempt | `33709304781` / `1` |
| Job | `100505190849` |
| Run number | `2` |
| Trigger | `workflow_dispatch` |
| Head | `main` / `7e6ef0ad9fd00975da93789421c0d24ec9226e82` |
| Started | `2026-09-03T02:53:07Z` |
| Completed | `2026-09-03T03:07:21Z` |
| Workflow conclusion | `success` |
| Run URL | `https://github.com/czy282923753/cwt-cloudwave-textile/actions/runs/33709304781` |

Exactly one release workflow run exists for the exact release commit. Every Build job step passed, including the exact-source guard, accepted tool boundary, dependency installation, Build Once authority, credential-safe GHCR authentication, exact-digest publication/private proof and detached evidence upload.

| OCI subject | Digest |
|---|---|
| OCI index | `sha256:89e04e7201694e6f202c71cceb368622cc2d584136a7eedfaee9044a45023e8a` |
| `linux/amd64` manifest | `sha256:301db86bc22329b01dd3ef3d4754c75c92de4d6577f26c218d638014335d90b3` |
| `linux/amd64` config | `sha256:bca984917ba83b271989fc00b5d23201178c4e5bbe7dc2012f4e0d2e33a3ac87` |
| `linux/arm64` manifest | `sha256:b30d5700d36242ea1582e74b611c169e5c02f85b9ee9f2d8a6b7816eb49b918b` |
| `linux/arm64` config | `sha256:5968d3bd08a6433a9d04939385432f1c82415932b23144f9dd241dba1f774959` |

The accepted publication checker returned `status=PASS` for:

`ghcr.io/czy282923753/cwt-cloudwave-textile@sha256:89e04e7201694e6f202c71cceb368622cc2d584136a7eedfaee9044a45023e8a`

It also recorded `mutableTagIsAuthority=false`.

The detached artifact is:

| Fact | Exact value |
|---|---|
| Artifact ID | `9876610372` |
| Name | `cwt-release-evidence-7e6ef0ad9fd00975da93789421c0d24ec9226e82` |
| Size | `8,927,668` bytes |
| Created | `2026-09-03T03:06:23Z` |
| Expires | `2026-10-03T03:06:18Z` |
| State at closure | Not expired |

The ephemeral macOS ARM64 Build Runner automatically deregistered after the successful job. Its local temporary Runner root was removed. The final repository Runner inventory is `0`.

## 4. Disposable Tencent Runtime host preparation

After Build PASS, exactly one disposable CVM was created for Runtime setup:

| Fact | Verified value |
|---|---|
| Instance | `ins-ghpikn3a` / `cwt-runtime-validation-5c2ab8307c8c47ccb66d62eaecbcad08` |
| Region / zone | Singapore / Singapore Zone 2 |
| Billing | Pay-as-you-go |
| Architecture | Native `x86_64` / `amd64` |
| Capacity | 2 vCPU, 4 GiB RAM |
| Operating system | Ubuntu Server 24.04 LTS 64-bit |
| System disk | `disk-evhuxch0`, general-purpose SSD, 60 GiB |
| Temporary public IPv4 | `43.134.51.186` |
| Temporary security group | `sg-mpz5n3wy` |
| Public inbound rules before setup | `0`; console stated `当前无入站规则` |
| Management path | Tencent Automation Assistant; no SSH ingress |

Tencent Automation Assistant installed and verified:

- Docker Engine `29.6.2`;
- Docker Compose `5.3.1`;
- GitHub Actions Runner `2.337.0`;
- official Runner archive SHA-256 `70920811a4f8ad4328818682bca5c6469c1c942fab52448868071d0063816613`;
- `ubuntu` membership in the `docker` group.

The installation command `inv-s86wtf0ci8` completed successfully in 77 seconds. The concise verification command `inv-286ww30rdq` completed successfully and returned:

`Docker version 29.6.2 ... Docker Compose version v5.3.1 2.337.0 ... docker ... CWT_VERIFY_OK`

## 5. First failure and fail-closed stop

With explicit Owner confirmation, one short-lived GitHub Actions registration token was transmitted through Tencent Automation Assistant solely to register the disposable ephemeral Runner. It was not written to the repository, evidence documents or final report.

The first Runner registration setup command `inv-286xdh07wv` failed in less than one second with ExitCode `134`:

`System.UnauthorizedAccessException: Access to the path '/opt/cwt-actions-runner/_diag/Runner_20260903-044730-utc.log' is denied.`

The causal boundary was a host filesystem-ownership defect: the `ubuntu` Runner process could not write its diagnostic directory after dependency installation had recreated or changed ownership below the Runner root.

The failure occurred before registration completed. Repository Runner inventory remained `0`. No Runtime workflow was dispatched, so Runtime Validation attempt count for the exact release commit is `0`. No repair, setup retry, Runtime retry, rerun, promotion, deployment or manual PASS occurred.

## 6. Mandatory teardown and absence proof

Following explicit Owner confirmation, the disposable host was immediately destroyed and its system disk released. Provider-console absence checks then established:

| Resource/check | Final result |
|---|---|
| CVM `ins-ghpikn3a` | Absent; Singapore CVM instance list returned to the no-instance state |
| System disk `disk-evhuxch0` | Absent; Singapore cloud-disk list contained no matching disk and showed no data |
| Public IPv4 `43.134.51.186` | Absent; Singapore public-IP inventory count `0` |
| Attached security group `sg-mpz5n3wy` | Deleted; absent after refresh |
| Purchase-flow residue `sg-k3bb0z2o` | Zero associated instances, then explicitly deleted; absent after refresh |
| Purchase-flow residue `sg-55v6wo5s` | Zero associated instances, then explicitly deleted; absent after refresh |
| Singapore security-group inventory | Count `0`; `暂无数据` |
| Repository Actions Runner inventory | Count `0` |

Tencent identity verification was completed by the Owner before the destructive operation. No Production instance, Production security group, COS bucket/package, DNS, release image, detached evidence artifact or GitHub Environment was deleted or mutated during teardown.

## 7. Complexity and architecture disposition

No code, workflow, schema, Migration, dependency, application configuration, accepted Candidate or architecture baseline changed. No persistent Runner, VM, disk, public IP, security group, credential, coordination mechanism or alternate evidence authority remains.

The Build PASS and private exact-digest publication remain bounded evidence. They do not establish Runtime compatibility or Production readiness because Runtime Validation never ran.

## 8. Terminal disposition and next gate

The authorized chain is **BLOCKED / HOLD** at disposable Runner registration. The Build portion passed; the Runtime portion has no result because it was never dispatched.

Any next action requires a new explicit Owner decision defining whether to authorize a bounded setup correction and a new execution scope, and whether that scope may reuse the still-valid exact-digest artifact or must start from a newly reviewed release source. This record grants no repair, retry, promotion, deployment, S6-06, S6-07 or Stage 7 authority.
