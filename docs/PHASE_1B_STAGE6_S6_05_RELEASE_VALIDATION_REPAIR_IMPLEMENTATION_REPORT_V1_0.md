# CWT Phase 1B Stage 6 — S6-05 Release-Validation Repair Implementation Report V1.0

Date: **2026-09-01**

Status: **IMPLEMENTATION IN PROGRESS — post-emission evidence closure pending**

Role: **Fresh Technical Implementer; no self-approval**

Correction baseline and exact rollback: `54e62a266b4201b589037e623618094329d02f88`, tree `465beaaf17a9b6e0a88053126841b51fa2f2e95e`, sole parent `07b6156b4e6a0ba1d4d30087fb76df98fc964163`.

Accepted private-DIND addendum: Git object `f97c3ae67f35aa4680a2d5d5ea9cf8e45e93c6c6`, document SHA-256 `aca0366f6bfc8524ad3af9df97ebf3eb664cfecd76621d77487f3cf97f658d4f`.

## 1. Bounded replacement

The correction replaces the external owner-host and host-network owner-helper path with one validator-owned ephemeral private DIND controller. The controller is pinned to `docker:29.6.2-dind@sha256:bfec1f5159c63a81ca6fdedbd81404d2c0e16378ed0feec3bb3fbf3998847659`, joins outer `--network none`, publishes no port, mounts no outer Docker/containerd socket and owns private Docker/containerd data plus one run-unique Unix API volume. The validator reuses `verifyReleaseRecord` and `validateComposeGraph`; it adds no release record, lifecycle state, database table, persistent daemon service, lease, retry controller, Product authority or second topology.

Every owner/helper operation mounts the one API volume and addresses `unix:///run/cwt-owner-api/docker.sock`. Host-network `nsenter`, TCP owner transport, external `--owner-host`, shared containerd and compatibility mode are removed. Conventional `moby` / `plugins.moby` namespaces are accepted only when the containerd address is under the run-unique private exec root and differs from outer containerd. Repository, workspace, `/etc/cwt`, `/srv/cwt` and `/run/systemd/journal` are projected at the same paths.

Compose authority is `Q=cwt.local/release@I`, where `I` is the emitted OCI index. The annotation-created tag remains a repository association only. The owner holds the reference through consumer teardown and performs image cleanup only after zero Compose containers and networks.

The validator opens one subject gate only after exact release-record, no-revocation, owner-store, index, native-child and source-revision identity succeeds. Harness/process/cleanup failures remain separate from authenticated subject assertion failures. Root `compose.yaml` becomes the one post-emission positive; the revoked-predecessor pre-emission runtime and duplicate native Web positive are deleted from the acceptance workflow.

## 2. Exact implementation scope

This correction Candidate is restricted to exactly six paths: the validator, its focused test, host README, operations runbook, this pending report and the pending evidence manifest. No AI-classification, wildcard, AI capability, Provider authority, package/lock/workspace, Compose, Dockerfile, Build Once, image verifier, Compose graph, application, Product, Schema, Migration, historical evidence or release-lifecycle change is permitted.

## 3. Pre-emission custody result

Pending at source-commit time. After the exact Candidate is committed, the authorized sequence is: seed and verify the one exact DIND reference; run exactly one non-CWT Alpine reproduction; retain first-run controller inspect/log evidence and log SHA; prove private Unix API/store, outer invisibility, owner-only import, internal Compose networking, same-path bind, journald, no published port, inner communication and zero exact residue; then run every frozen source gate. No CWT subject or Build Once is authorized in this correction task.

## 4. Complexity and rollback

Responsibility moves to the validator boundary that already owns workspace, Synthetic state, command planning and cleanup. The external owner endpoint, host-network owner helper and shared-containerd parameter path are not retained. Persistent complexity is unchanged; three temporary volumes and one bounded controller lifecycle replace two failed external-daemon patterns. Controller diagnostics precede exact removal, consumer teardown precedes image cleanup, and cleanup cannot mask the primary error. Rollback is exactly `54e62a266b4201b589037e623618094329d02f88` and never changes, restores or un-revokes any historical subject.

## 5. Pending closure fields

- correction commit/tree/sole parent and exact six-path diff;
- exact DIND seed/platform/version verification, sole non-CWT reproduction and complete source-gate ledger;
- sole Build Once output root and successor OCI/release identities;
- same-owner direct/runtime/root-Compose results and gate-open classification;
- complete cleanup and unchanged historical revocation ledger;
- final `built`, unrevoked and untransitioned state;
- docs-only evidence closure commit and next independent Review gate.
