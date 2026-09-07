# Phase 1B Stage 6 Runtime Preparation Recovery Implementation Report V1.0

Status: **IMPLEMENTED LOCALLY — AWAITING INDEPENDENT REVIEW; STAGE 6 REMAINS PARTIAL / HOLD**

Date: 2026-09-07

Role: Fresh Technical Escalation Implementer

## Authority and candidate

- Frozen repair plan: commit `90d52261faf619ce9d2c9fff67e1ba606f61a547`, file `docs/PHASE_1B_STAGE6_RUNTIME_PREPARATION_TECHNICAL_ESCALATION_V1_0.md`, read from that exact Git object.
- Rollback baseline: reviewed tools commit `345f8b15637578d046a9a07c3bfa3e74c0f72e0c`.
- Exact implementation candidate for workflow, payload, tests and operator contract: `a4f137f5e0f964f26bab737fc3a80ae846958e63`.
- This report is a documentation-only follow-up to that implementation commit. Review and rollback must treat the implementation commit and this report as one delivery; attempt-2 permission must never survive without the corresponding acquisition and clean-root recovery contract.

The frozen Product tuple is unchanged: release `78c882345d522d7a83cae9296c26499d49ab2521`; OCI index `sha256:fc96539ee4c51895c1c1fedc8ef873e2fc92b5898c55f273f03d81656d779f0e`; Build Once run/artifact `34082239544` / `10004387422`, expiring 2026-10-07. No Product, Compose, validator, Registry or evidence bytes were changed.

## Root cause and replacement

The causal engineering defect was a misplaced lifecycle boundary. Provisioning bounded only the Runner archive while the Docker signing key and workflow ORAS acquisition remained one-shot; the outer operator text destroyed the host after any preparation failure; and runner binding rejected every attempt except `1`. That coupled public dependency acquisition failure to host replacement even when private GHCR and the sole Product validator had never started.

The implementation replaces, rather than layers over, those conflicting rules:

- The Docker key, Runner archive and ORAS archive retain their exact endpoints and pins while using standard finite HTTPS/TLS, connection, retry, retry-start-window and partial-output controls. Per-transfer ceilings are 60, 390 and 180 seconds respectively.
- One temporary mode-`0600` `APT_CONFIG` applies native APT retry/time controls to direct package operations and the Runner's nested dependency installer, and is removed on success and failure. Signed metadata and exact package selection remain authoritative.
- Fresh provisioning and same-host recovery converge before one fresh Runner installation. Recovery accepts only exact Docker packages plus live Engine/Compose identities, zero containers/CWT networks/private or Runtime residue, no active Listener/Worker, no Runner-root mount, and an absent or verified inactive fixed Runner directory. It deletes only `/opt/cwt-actions-runner`, proves absence and installs hash-verified bytes. Current-process ownership is tracked only in memory so a later failure removes only the root created by that invocation.
- Runner binding now accepts exactly attempts `1` and `2`. The operator contract, not repository state, owns immutable prior-step evidence, server-record absence, fresh credentials, the shared one-recovery count, remaining time/cost and teardown.
- Private-GHCR authentication remains the no-recovery boundary. The workflow retains one ordered Product validator invocation and no Build or Registry-write path. A factual validator `NOT_PASS` remains failure.

Deleted/replaced text includes the claims that the Runner archive was the sole public acquisition, that any setup failure was terminal for the VM, and that only the first workflow attempt could bind. No dual recovery authority remains.

## Focused verification

The final local gate passed:

- `bash -n` for the changed provisioning payload and unchanged registration payload;
- structural YAML parsing of `.github/workflows/cwt-runtime-validation.yml`;
- `git diff --check`;
- 48 passing tests across `provision-ubuntu-amd64-runner.test.mjs`, `release-registry-integration.test.mjs` and the unchanged registration interface suite.

Synthetic HTTPS loopback fixtures proved transient 503 recovery, three-transfer exhaustion with no partial output, stalled-transfer timeout and digest refusal before extraction for Runner/ORAS acquisition. Structural enumeration covers all three direct public sites, including the Docker key through the same provisioning client boundary. APT fixtures proved policy inheritance by a nested process and removal on success/failure. Recovery fixtures covered exact-Docker absent/stale roots, complete stale-tree replacement, current-invocation partial cleanup, and refusal of symlink, active process, mixed Docker, container, CWT network, private/Runtime residue, mounted subtree, unavailable mount state and failed cleanup. Binding tests exercised attempts `1` and `2` and rejected `0` and `3`.

The untouched Runtime validator bodies were not rerun because their implementation and invocation interface did not change; existing accepted module evidence was reused, while the changed workflow contract directly proved one ordered validator call. No public download, root-level destructive operation, Product build/test cycle, formal Runtime execution, credential use or external mutation occurred.

## Complexity, rollback and external limitations

No table, persistent state, marker system, Worker, Lease, timer, manifest hierarchy, mirror, proxy, cache or custom retry loop was added. Local branch count increased only where required to distinguish genuine fresh installation, exact clean recovery and fail-closed mixed state. The former all-or-nothing host rule and attempt-1-only guard were removed, so there is one operator admission authority and one deterministic local cleanup path.

Rollback is one unit to `345f8b15637578d046a9a07c3bfa3e74c0f72e0c`. Do not retain the attempt-2 binding change separately.

Local verification cannot prove Tencent-to-GitHub or redirect-edge routing, GitHub action/toolcache/artifact availability, GHCR or Docker Hub reachability, throughput, repository Runner-record absence, token expiry, provider cost or teardown latency. No cloud resource was created, changed or deleted; no token was generated or transmitted; no Runner was started; no workflow was dispatched or rerun; and no external PASS is claimed.

Next gate: Fresh Independent Review under the coordinator. Any later real one-host attempt requires separate concrete execution authorization.
