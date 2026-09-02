# CWT Phase 1B Stage 6 — Real Build Once / GHCR / Tencent Runtime Validation Operator Report V1.0

Status: **BLOCKED / HOLD — the authorized chain did not PASS**

Recorded at: `2026-09-02T13:41:39Z`

Evidence manifest: [PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_EVIDENCE_MANIFEST_V1_0.md](./PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_EVIDENCE_MANIFEST_V1_0.md)

## 1. Scope and authority

This is an append-only Operator record for exactly one authorized external chain:

`Build Once -> private GHCR exact-digest publication -> Tencent Singapore single-use ephemeral linux/amd64 Runtime Validation`

The task authorized one first-attempt Build Once execution and, only after its PASS, one Runtime Validation execution. It did not authorize a retry, rerun, repair, alternate publication path, manual evidence substitution, promotion, deployment, remediation, S6-06, S6-07 or Stage 7.

The Owner later clarified that Tencent Lighthouse instance `lhins-3c2vknjb`, named `cwt-production-sg`, is the long-term future Production server. It is not disposable Runtime Validation infrastructure and cannot be the formal Runtime Validation authority. The earlier prospective Runner selection was corrected before any Runtime Validation job was dispatched.

## 2. Immutable release source

| Fact | Exact value |
|---|---|
| Release source commit | `eb18aa94e1bd11d1e5b61714533fbde643d5c5ce` |
| Release source tree | `d49c875537208b2963697af52ca14b3141c7cd26` |
| Remote release branch | `main` |
| Remote `main` after the authorized fast-forward | `eb18aa94e1bd11d1e5b61714533fbde643d5c5ce` |
| Fresh Re-Review commit excluded from release ancestry | `7a57e3c0c12647734bb3eff8d684d328795beada` |

The accepted source was fast-forwarded to remote `main` without merge, rebase, force-push or source modification. The Owner made the repository public before the run so GitHub Free protected Environments could be used. This visibility choice did not change the private-GHCR requirement.

## 3. GitHub execution outcome

| Fact | Exact value |
|---|---|
| Workflow run | `33631313598` |
| Attempt | `1` |
| Job | `100251178915` |
| Workflow conclusion | `failure` |
| Job started | `2026-09-02T12:53:10Z` |
| Job completed | `2026-09-02T13:09:02Z` |
| Run URL | `https://github.com/czy282923753/cwt-cloudwave-textile/actions/runs/33631313598` |

The exact source gate, pinned pnpm and Node setup, patched ORAS installation, Build Once tool-boundary check and frozen dependency installation passed. The sole accepted Build Once authority then completed successfully and emitted:

| OCI subject | Digest |
|---|---|
| OCI index | `sha256:3a9e4f5783e4051d88acc10287219776d354c234fb8827012a9018a1ee5e9cbb` |
| `linux/amd64` manifest | `sha256:8a37be09ee8a697da820fd3dbb419806a7a9885342eae6c6eea8854e1e9b6d0c` |
| `linux/amd64` config | `sha256:95abf53af3a3ab27662785a67f9795050f4c83ee152bc39ea51c48fb516d7038` |
| `linux/arm64` manifest | `sha256:ffd9b9197c842b302570f15667158e210044efdf0856c29324de5e99ded8e3b6` |
| `linux/arm64` config | `sha256:d3937fe5a1e5c5246de20355ac15c958e037c1555e8fa3d0e1ed25b75be95840` |

The GHCR login and authenticated publication/descriptor checks ran. The workflow then stopped fail-closed with:

`{"status":"NOT_PASS","reasonCode":"ghcr_privacy_unproven"}`

The approved checker rejected the actual ORAS anonymous-error shape. A fresh anonymous raw HTTP request to the exact GHCR digest returned HTTP `401`, which is evidence that anonymous access was denied at that later observation time. This observation does not override the workflow verdict and is not a manual PASS.

Because the workflow failed before its final upload step:

- the detached evidence artifact was not uploaded;
- Runtime Validation was never dispatched;
- no Tencent host result exists;
- the GHCR subject remains unvalidated and unpromoted;
- no retry, rerun, continuation, repair, deployment, revocation, deletion, retag or rebuild occurred.

## 4. GitHub protection and Runner cleanup

Two protected Environments were created and limited to branch `main`:

- `cwt-stage6-build-once`
- `cwt-stage6-runtime-validation`

Each used the Owner as required reviewer with self-review permitted so the Owner could approve the explicit manual dispatch. The Build Once run was approved by the Owner before execution.

The macOS ARM64 Build Runner used official Actions Runner `2.337.0`, exact label `cwt-trusted-build-once`, and ephemeral registration. It automatically deregistered after the failed job.

A prospective Tencent Runner was registered with unique nonce `7a152c2e465fa3fa1456e6bc210d4b0f`, but Runtime Validation was never dispatched and the Runner never accepted a job. It was stopped and explicitly deregistered. The final repository Runner inventory was `0`.

## 5. Future Production host correction and cleanup

The preserved Owner-designated future Production host is:

| Fact | Verified value |
|---|---|
| Provider/product | Tencent Cloud Lighthouse |
| Instance | `lhins-3c2vknjb` / `cwt-production-sg` |
| Region | Singapore, Zone 3 |
| State after cleanup | Running |
| Operating system | Ubuntu Server 24.04 LTS 64-bit |
| Architecture | `x86_64` / `amd64` |
| Capacity | 2 vCPU, 4 GB RAM, 60 GB SSD |
| Preserved runtime tooling | Docker Engine `29.6.2`; Docker Compose `5.3.1` |
| Public inbound firewall after cleanup | 0 rules |

The Tencent refund/destruction flow was cancelled before submission. No refund, destruction, release, rebuild, reinitialization or lifecycle request was submitted. The instance, prepaid plan, attached system disk and public-IP allocation were preserved.

Only the exact transient Runner root `/opt/cwt-actions-runner-7a152c2e465fa3fa1456e6bc210d4b0f` and its stopped transient service state were removed. Post-cleanup Tencent Automation Assistant verification returned:

`verify=PASS runner_root=absent runner_processes=0 runner_units=0 containers=0 cwt_images=0 validation_residue=0 docker=29.6.2 compose=5.3.1`

No Runner sudoers entry existed. No GitHub Runner registration, Runner process/service, temporary CWT validation path, GHCR/Docker login material, CWT container, CWT image or deployed CWT workload remained on the host.

The existing Tencent SSH key and local matching private key were preserved because their provenance is not exclusive to the failed Runner attempt and deleting them could impair the Owner's intended Production access. Public SSH ingress remains closed; any future access enablement requires a separate authorized firewall decision.

The separately purchased COS 100 GB package was not configured, mutated or used by this chain.

## 6. Complexity and architecture disposition

No code, workflow, schema, Migration, dependency, application configuration, GHCR package setting, audit/revocation history or accepted Candidate changed. No persistent mechanism, state, Worker, Lease, Recovery type or alternate authority was added. Complexity stayed level.

The future Production server was incorrectly selected as a prospective Runtime Runner, but no Runtime Validation job reached it. Therefore no formal Runtime Validation evidence was produced and no formal-validation contamination occurred. The host is preserved only as future Production infrastructure under the Owner's corrected direction.

## 7. Terminal disposition and next gate

The authorized chain is **BLOCKED / HOLD** because workflow run `33631313598` did not PASS and no detached artifact exists for Runtime Validation.

The only decision item for future work is whether to authorize a separately scoped remediation and Fresh Independent Review of the GHCR anonymous-error classification, followed by a new explicit one-run authorization using a genuinely single-use ephemeral Tencent Singapore `linux/amd64` VM. This record grants none of those authorities.
