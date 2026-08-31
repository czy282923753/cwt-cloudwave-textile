# CWT Phase 1B Stage 6 — S6-05 Release-Validation Repair Implementation Report V1.0

Date: **2026-09-01**

Status: **IMPLEMENTATION IN PROGRESS — post-emission evidence closure pending**

Role: **Fresh Technical Implementer; no self-approval**

Technical Escalation Candidate: `6a8f3ceea1d1369a9e3b1306d756be075eba3a6a`, tree `85d67f4ef31a887f90a98efbf2fbfb8beae3a876`, parent `32835fcd84dde6842e4e577be8186933f340aae5`.

## 1. Bounded replacement

The repair replaces the accidental split custody path with one versioned release validator, one explicit disposable owner endpoint and one exclusive containerd store tuple. The validator reuses `verifyReleaseRecord` and `validateComposeGraph`; it adds no release record, lifecycle state, database table, daemon service, lease, retry controller, Product authority or second topology.

Compose authority is `Q=cwt.local/release@I`, where `I` is the emitted OCI index. The annotation-created tag remains a repository association only. The owner holds the reference through consumer teardown and performs image cleanup only after zero Compose containers and networks.

The validator opens one subject gate only after exact release-record, no-revocation, owner-store, index, native-child and source-revision identity succeeds. Harness/process/cleanup failures remain separate from authenticated subject assertion failures. Root `compose.yaml` becomes the one post-emission positive; the revoked-predecessor pre-emission runtime and duplicate native Web positive are deleted from the acceptance workflow.

## 2. Exact implementation scope

Implementation and evidence closure are restricted to the ten paths frozen in the repair plan. The only AI-architecture change is the exact `deploy/scripts/preflight-release-compose.mjs` non-AI tooling classification plus mechanically updated sealed hashes. No wildcard, AI capability, Provider authority, package/lock/workspace, Compose, Dockerfile, application, Schema or Migration change is permitted.

## 3. Pre-emission custody result

The non-CWT custody self-test used an existing pinned small base in a run-unique isolated containerd namespace. It proved outer invisibility, outer deletion refusal, owner retention after the outer attempt, digest-qualified owner resolution and owner-only image cleanup. The disposable controller, daemon process, mount and exact data/exec roots were then removed. Final post-emission identities and the complete gate ledger will be written only after the sole successor Build Once and authoritative validation pass.

## 4. Complexity and rollback

Responsibility moves to the one correct owner boundary. The old dual-client reference ownership and duplicate positive runtime path are not retained. Persistent complexity is unchanged; the added code is an ephemeral orchestration and proof boundary. Rollback is the frozen Technical Escalation Candidate and never changes, restores or un-revokes any historical subject.

## 5. Pending closure fields

- implementation commit/tree/parent and exact path diff;
- complete pre-emission gate ledger;
- sole Build Once output root and successor OCI/release identities;
- same-owner direct/runtime/root-Compose results and gate-open classification;
- complete cleanup and unchanged historical revocation ledger;
- final `built`, unrevoked and untransitioned state;
- docs-only evidence closure commit and next independent Review gate.
