# CWT Phase 1B Stage 6 — S6-05 Release-Validation Repair Implementation Report V1.0

Date: **2026-09-01**

Status: **IMPLEMENTATION IN PROGRESS — post-emission evidence closure pending**

Role: **Fresh Technical Implementer; no self-approval**

Current correction baseline and exact rollback: `d12610ad98d5f0de5ff81ae04215bf187028dd47`, tree `85866825b16007043396d19dc4eb284141886112`, sole parent `8dfe564333536572b12a01470263d690bd17723e`.

Accepted private-DIND addendum: Git object `f97c3ae67f35aa4680a2d5d5ea9cf8e45e93c6c6`, document SHA-256 `aca0366f6bfc8524ad3af9df97ebf3eb664cfecd76621d77487f3cf97f658d4f`.

Accepted Docker Desktop volume-projection addendum: Git object `ded4625fa5513923f7b86f741ad1fc453b6a853c`, document SHA-256 `fad291d9fd520055f531596c4b79e1fc928b7c6be22506a9fb52118a88aebb26`, with coordinator-frozen journal address type `UNIX-RECVFROM` plus `fork`.

## 1. Bounded replacement

The correction replaces the external owner-host and host-network owner-helper path with one validator-owned ephemeral private DIND controller. The controller is pinned to `docker:29.6.2-dind@sha256:bfec1f5159c63a81ca6fdedbd81404d2c0e16378ed0feec3bb3fbf3998847659`, joins outer `--network none`, publishes no port, mounts no outer Docker/containerd socket and owns six exact named volumes: API, Docker data, containerd data, Synthetic config, Synthetic storage and journal. The validator reuses `verifyReleaseRecord` and `validateComposeGraph`; it adds no release record, lifecycle state, database table, persistent daemon service, lease, retry controller, Product authority or second topology.

Every owner/helper operation mounts the API volume and only an additional named volume genuinely required by that operation. Host-network owner `nsenter`, TCP owner transport, external `--owner-host`, shared containerd, VM-only bind sources and compatibility mode are removed. Repository/workspace remain the only macOS binds. Config and storage are populated through pinned network-none helpers, then mounted with `volume-nocopy` at `/etc/cwt` read-only and `/srv/cwt` read-write. The exact disposable journal helper mounts the journal volume and runs VM-host `socat` through `/proc/<helper-pid>/root` with `UNIX-RECVFROM` and `fork`; no raw volume Mountpoint, new image/package or VM-host journal directory is used.

Compose authority is `Q=cwt.local/release@I`, where `I` is the emitted OCI index. The annotation-created tag remains a repository association only. The owner holds the reference through consumer teardown and performs image cleanup only after zero Compose containers and networks.

The validator opens one subject gate only after exact release-record, no-revocation, owner-store, index, native-child and source-revision identity succeeds. Harness/process/cleanup failures remain separate from authenticated subject assertion failures. Root `compose.yaml` becomes the one post-emission positive; the revoked-predecessor pre-emission runtime and duplicate native Web positive are deleted from the acceptance workflow.

## 2. Exact implementation scope

This correction Candidate is restricted to exactly six paths: the validator, its focused test, host README, operations runbook, this pending report and the pending evidence manifest. No AI-classification, wildcard, AI capability, Provider authority, package/lock/workspace, Compose, Dockerfile, Build Once, image verifier, Compose graph, application, Product, Schema, Migration, historical evidence or release-lifecycle change is permitted.

## 3. Pre-emission custody result

Pending at source-commit time. The consumed `d12610ad...` bind-source reproduction remains historical and is not reclassified. After the exact named-volume Candidate is committed, one new formal non-CWT reproduction is authorized to prove config/storage/journal named-volume population, `0444` config closure, UID/GID `10001:10001` storage write, `UNIX-RECVFROM` journal socket and journald emission, private Unix API/store, outer invisibility, internal Compose networking, repository/workspace bind, no published port, retained controller/helper diagnostics and zero exact residue. No CWT subject or Build Once is authorized in this correction task.

## 4. Complexity and rollback

Responsibility moves to the validator boundary that already owns workspace, Synthetic state, command planning and cleanup. The VM-only bind projection, raw VM directory lifecycle, external owner endpoint and shared-containerd parameter path are not retained. Persistent complexity is unchanged: six temporary volumes and one bounded journal helper remain ephemeral run resources, not a daemon service or new authority. Controller/helper diagnostics precede exact removal, consumer teardown precedes image cleanup, helper removal precedes volume deletion, and cleanup cannot mask the primary error. Rollback is exactly `d12610ad98d5f0de5ff81ae04215bf187028dd47` and never changes, restores or un-revokes any historical subject.

## 5. Pending closure fields

- correction commit/tree/sole parent and exact six-path diff;
- exact local DIND platform/version verification, sole named-volume non-CWT reproduction and complete source-gate ledger;
- sole Build Once output root and successor OCI/release identities;
- same-owner direct/runtime/root-Compose results and gate-open classification;
- complete cleanup and unchanged historical revocation ledger;
- final `built`, unrevoked and untransitioned state;
- docs-only evidence closure commit and next independent Review gate.
