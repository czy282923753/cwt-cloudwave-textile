# CWT Phase 1B Stage 6 — S6-05 Release-Validation Technical Escalation Frozen Repair Plan Candidate V1.0

Date: **2026-09-01**

Status: **FROZEN REPAIR-PLAN CANDIDATE — coordinator verification and fresh implementation are required; this document does not authorize implementation or acceptance**

Root-cause authority: `docs/PHASE_1B_STAGE6_S6_05_RELEASE_VALIDATION_TECHNICAL_ESCALATION_ROOT_CAUSE_ANALYSIS_V1_0.md`

Accepted architecture authority: **Option F Trusted CI Build Once + Exact Digest Promotion remains unchanged.**

Authority boundary: **Validation-mechanics replacement only. No Product/config fix, Candidate image build, lifecycle transition, Registry/Provider/protected action, S6-06, S6-07 or Stage 7 action is authorized in the analysis task.**

## 1. Frozen decision

Replace the two ad hoc actual-root-Compose runtime paths with one versioned post-emission release validator.

The replacement validator must:

1. use one explicitly named validation daemon for every release-image operation;
2. require that daemon to own an exclusive image store: either a private containerd socket/root or, when a containerd socket is shared, an isolated namespace distinct from the outer Docker Desktop `moby` namespace;
3. import the complete emitted OCI layout directly into that daemon without first creating the release tag in the outer daemon;
4. resolve and pass `repository@sha256:<index>` as `CWT_IMAGE_REFERENCE`, never a tag-only reference;
5. bind the selected platform child and source revision to the immutable release record before Compose;
6. run the unchanged repository root `compose.yaml` as the only positive Compose file;
7. keep the imported tag/repository-digest association alive until every Compose consumer is down and evidence is captured;
8. perform image cleanup only through the owning validation daemon, after Compose teardown; and
9. classify harness/setup failures separately from subject-gate failures.

No second image checker, Compose graph, release record, lifecycle state, database record, lease, daemon service or promotion authority is added. The validator is an ephemeral orchestration tool that reuses `verifyReleaseRecord` and `validateComposeGraph` as existing authorities.

## 2. Baseline, rollback point and preserved source

### 2.1 Governance and accepted baseline

- Accepted Option F source/docs checkpoint: `7a63f4647b652857c3882f004a7bcb54b38cca5b` plus `0842443b61b42dc1a24f5902960cf97a0faf0121`.
- Independent accepted Option F Review: `aa82efe825efee3202c0f5e5773048d83352873b` (`PASS`, sibling evidence).
- Accepted authority remains one Build Once subject, exact index/child identity, immutable revocation and exact-digest promotion.

### 2.2 Repair baseline and exact rollback

The fresh Implementer must start from the coordinator-verified docs-only Technical Escalation Candidate whose source parent is:

- commit `32835fcd84dde6842e4e577be8186933f340aae5`;
- tree `6fc4cc2d74714a11b873aa00e707722d3d181682`.

This plan explicitly permits preserving that exact source line despite its revoked release subjects, because the five revocations govern artifact eligibility, not a mandatory rollback of source fixes. This is the narrow named exception required by the Technical Escalation workflow; no temporary harness or failed release evidence becomes source authority.

If implementation fails or is rejected, revert the implementation delta to the coordinator-verified Technical Escalation docs Candidate, leaving the `32835fcd...` source tree and every revocation marker unchanged. Rollback must not select, restore, un-revoke or rebuild any of the five historical indexes.

### 2.3 Closed fixes that must not regress

- health namespaces bypass redirect lookup;
- Sharp `0.35.3` / libvips `8.18.3` standalone trace and executable smoke;
- Valkey ACL, authenticated healthcheck and singular readiness canary;
- application lifecycle/FD9 lock and accepted stop behavior;
- exact root Compose `HOSTNAME=0.0.0.0` / loopback readiness convergence;
- exact PostgreSQL/Valkey `tmpfs` scalars and split-fragment rejection;
- bounded image-work semaphore and AI concurrency separation;
- safe logging, monitoring and redacted work-health behavior; and
- private/public/import, Product, Publish/Index, URL/SEO, CRM and Audit boundaries.

## 3. Exact allowed mutation scope

The fresh Implementer may change only:

```text
A deploy/scripts/preflight-release-compose.mjs
A deploy/scripts/preflight-release-compose.test.mjs
M scripts/verify-ai-architecture.ts
M test-fixtures/ai-architecture/graph-faults.phase-d.synthetic-only.v1_0.json
M deploy/host/README.md
M docs/OPERATIONS_RUNBOOK.md
A docs/PHASE_1B_STAGE6_S6_05_RELEASE_VALIDATION_REPAIR_IMPLEMENTATION_REPORT_V1_0.md
A docs/PHASE_1B_STAGE6_S6_05_RELEASE_VALIDATION_REPAIR_IMPLEMENTATION_REPORT_V1_0.md.sha256
A docs/PHASE_1B_STAGE6_S6_05_RELEASE_VALIDATION_REPAIR_EVIDENCE_MANIFEST_V1_0.md
A docs/PHASE_1B_STAGE6_S6_05_RELEASE_VALIDATION_REPAIR_EVIDENCE_MANIFEST_V1_0.md.sha256
```

The two AI-architecture files may change only to classify the one exact new non-AI deployment tool and update its sealed integrity/mutation bindings mechanically. No wildcard, directory-wide selector, AI reachability, capability exception or Product/Provider authority is allowed.

No change is permitted to:

- `compose.yaml`;
- `Dockerfile`, `.dockerignore`, `package.json` or lock/workspace files;
- `deploy/scripts/build-release-once.mjs`;
- `deploy/scripts/preflight-image.mjs` or its tests;
- `deploy/scripts/preflight-compose-graph.mjs` or its tests;
- `deploy/scripts/preflight-staging.sh` or protected activation behavior;
- application, health, upload, AI runtime, database, Schema or Migration paths; or
- any existing historical report, sidecar, release evidence or revocation marker.

If the exact scope is insufficient, stop and return `BLOCKED`; do not broaden it in place.

## 4. Single-source image-custody contract

### 4.1 Owner and store identity

The validator receives or creates exactly one disposable validation daemon endpoint. At start it must capture a sanitized owner record containing:

- one run-local owner token;
- Docker server version;
- containerd snapshotter status;
- containerd socket identity class; and
- the exact isolated container namespace selected for the run.

The image-store identity is the tuple of containerd socket/root plus image namespace. It must be exclusive to the validation run and must not equal the outer endpoint's tuple. When the socket is shared with Docker Desktop, the namespace must be unique and must not be outer `moby`; a daemon with its own private containerd socket/root may use its conventional namespace. A distinct Docker API endpoint is insufficient by itself. Every `image load`, `image inspect`, `compose config`, `compose up`, container inspection, `compose down` and `image rm` call must use the same explicit daemon endpoint. Ambient `DOCKER_HOST`, Docker context and Compose environment are not authority.

The outer Docker endpoint may create/stop the disposable daemon or a helper CLI container, but it must never create, inspect for acceptance, tag or delete the successor release reference.

### 4.2 Reference identity

Let:

```text
I = release.json oci.indexDigest
C = release.json child manifest for the validation daemon's platform
R = release.json releaseId
Q = cwt.local/release@I
T = cwt.local/release:R
```

The emitted OCI layout is the transfer authority. The validator imports that layout directly into the owning daemon. The annotation-created tag `T` is only the repository association needed to resolve `Q`; it is not evidence or Compose authority.

Before any runtime action, the validator must prove through the same daemon:

- `T` was absent before import;
- the loaded repository digest is exactly `Q`;
- platform-neutral inspection of `Q` resolves exact index `I`;
- platform-aware inspection resolves exact child `C`;
- the child config label `org.opencontainers.image.revision` equals `R`;
- `verifyReleaseRecord` independently derives the same index/children/evidence and state `built`;
- no revocation marker exists for `I`; and
- root Compose normalization receives `CWT_IMAGE_REFERENCE=Q`, `CWT_IMAGE_INDEX_DIGEST=I` and `CWT_IMAGE_CHILD_DIGEST=C`.

A tag-only value, wrong repository digest, wrong child, missing label, pre-existing same-name reference or outer-store-only reference is a refusal before the subject gate opens.

### 4.3 Lifetime and cleanup ordering

The owner holds `T`/`Q` for this entire interval:

```text
successful import
  -> exact digest/child verification
  -> Compose create/up
  -> runtime assertions and evidence capture
  -> Compose down/remove-orphans
  -> zero related containers/networks verified
  -> owning-daemon image removal
  -> owning daemon stop
  -> isolated data/exec root removal
```

No image cleanup may occur between import and verified Compose teardown. No second client may remove the release reference. A `finally` block may stop/remove Compose consumers first; it may remove the image only after confirming no consumer remains.

Cleanup failure is a harness/process failure. It blocks evidence closure and leaves the subject `built`/untransitioned, but it is not evidence that the subject runtime failed.

## 5. Replacement release-validation workflow

### Phase A — pre-emission source and harness readiness

1. Create a fresh implementation worktree/branch from the coordinator-verified Technical Escalation Candidate. Do not reuse the former remediation task or this analyst task.
2. Implement only the exact paths in Section 3.
3. The new validator must expose pure/testable command planning so its tests can prove one daemon argument reaches every image/Compose operation and that early cleanup, outer deletion, tag-only Compose input and a shared outer store/namespace tuple are rejected.
4. Run the focused deployment and validator mutation tests.
5. Run one disposable non-CWT custody self-test before Build Once:
   - use an existing small base image and a unique temporary tag;
   - import only through the validation daemon's isolated namespace;
   - prove the outer endpoint cannot see or delete that namespace-local tag;
   - prove the digest-qualified reference resolves in the owning daemon; and
   - tear everything down and prove no temporary resource remains.
6. Run the proportional source gates in Section 7.
7. Commit the implementation/source report skeleton, then require a clean worktree and exact committed HEAD. Evidence/result documents are completed only after the post-emission run and committed in a docs-only closure.

There is no pre-emission CWT actual-root-Compose runtime run. Static normalized Compose checks and the non-CWT custody test are the complete pre-emission proof for these mechanics.

### Phase B — exactly one fresh successor Build Once

Only after Phase A passes may the Implementer invoke the existing unchanged command exactly once with a new empty absolute evidence root:

```text
pnpm build:release-once -- --output <new-empty-absolute-release-root>
```

The invocation must use the clean committed implementation HEAD as release ID. No old release root, OCI subject, evidence byte or revoked tag may be copied into the successor root.

Exactly **one authorized invocation** is allowed in the fresh implementation task:

- failure before subject emission creates no Candidate and requires an immediate `BLOCKED` callback; do not retry automatically;
- after subject emission, no second build or successor is allowed in that task under any outcome; and
- Build Once's internal per-child materialization/Sharp checks are part of the one invocation, not additional release builds.

### Phase C — one post-emission exact-subject validation sequence

1. Verify immutable OCI/release/evidence identity at `built`.
2. Start/confirm the one isolated validation daemon and owner record.
3. Import the complete OCI layout only through that daemon.
4. Establish `Q`, `I`, `C` and `R` exactly as Section 4 requires.
5. Run the existing bounded exact-subject runtime matrix without creating a second image store:
   - one complete positive for the non-native intended child;
   - retain native Worker/Scheduler/one-shot/signal checks and any other role checks not covered by root Compose;
   - let the root Compose run supply the overlapping native Web/dependency positive instead of repeating it in a direct harness; and
   - selected native child database-unavailable, wrong-Valkey-ACL and storage-missing cases retain liveness `200` and readiness `503` with only the intended component failed.
6. Run the unchanged repository root `compose.yaml` once, with no positive override/alternate Compose file and with `--pull never --no-build`, for:
   - PostgreSQL;
   - Production Valkey;
   - Staging Valkey;
   - Production Web; and
   - Staging Web.
7. Require all five services healthy and inspect exact daemon-accepted `tmpfs`, Web command, `HOSTNAME=0.0.0.0`, loopback readiness healthcheck, internal networks, no published application/dependency ports and exact `I`/`C` labels.
8. Retain one mutation proving the former split `tmpfs` form is rejected before a running container. This mutation is source/Compose proof, not a second positive runtime topology.
9. Capture sanitized evidence, tear down in Section 4 order and verify complete cleanup.
10. Verify the release remains `built`, unrevoked and untransitioned. The fresh independent Review is the next gate; the Implementer must not append `staging_validated` or `promotion_authorized`.

## 6. Failure and revocation rules

The validator must record a single gate-open boundary only after exact import/digest/child/revision resolution succeeds and immediately before the first subject runtime action.

| Failure class | Required disposition | Revocation |
| --- | --- | --- |
| Source/static gate or non-CWT custody preflight fails before Build Once | Stop, clean disposable resources, `BLOCKED` | None; no subject exists |
| Build invocation fails before subject emission | Stop, preserve sanitized build failure, `BLOCKED` | None; no subject exists |
| OCI subject emits but release/evidence/digest identity is invalid | Stop, preserve evidence, invoke existing immutable revocation for the emitted index | **Required** |
| Harness daemon/import/namespace/disk/path/Synthetic setup fails before gate-open | Stop; retain subject `built` and untransitioned; no automatic retry; callback `BLOCKED` | **No** — the subject did not run or fail a gate |
| Exact subject fails package/runtime/security/readiness/root Compose assertion after gate-open | Stop, teardown, preserve evidence, revoke exact index, callback `BLOCKED` | **Required** |
| Harness loses/deletes the reference or fails cleanup without a subject assertion | Stop, preserve harness evidence, no transition, callback `BLOCKED` | **No** — process failure is not Product evidence |
| All retained subject/evidence copies are lost | Existing `NEW_RELEASE_REQUIRED` path | Existing subject cannot be reconstructed or accepted |

No automatic retry occurs after any failure. A harness-only failure may be analyzed later against the same unrevoked `built` subject only through a separately coordinated task because the subject itself did not fail; this is not an Implementer-loop permission. A subject-gate failure always revokes and requires a new authorized source/release.

The five historical markers remain untouched. This clarified taxonomy applies prospectively and does not reinterpret them into eligibility.

## 7. Proportional proof obligations

### 7.1 Blocking pre-emission gates

- exact baseline ancestry, allowed-path inventory, clean committed HEAD and `git diff --check`;
- no Schema/Migration/package/lock/workspace/Product/application/config delta;
- `pnpm test:deployment`, including all new validator custody/order mutations;
- focused S6-05 health/work/monitor/proxy/image tests;
- ESLint and strict TypeScript;
- AI Prompt/history and exact AI architecture, with one exact new non-AI tool classification only;
- one fresh source Next build and immediate public-bundle boundary;
- Production dependency audit; and
- non-CWT isolated-namespace custody self-test with complete cleanup.

The full Vitest suite is required once before Build Once because the fresh release source identity changes. Repeating it after an unchanged successful Build Once is diagnostic, not a second blocking gate.

### 7.2 Blocking post-emission gates

- existing `preflight-image` exact release/OCI/evidence verification;
- both exact children: source label, non-root user, package-manager absence and Sharp/libvips executable closure;
- bounded dual-architecture positive coverage, retaining non-overlapping native role/signal checks without duplicating the native Web/root Compose positive;
- selected native readiness negatives for database, Valkey and storage;
- one actual-root-Compose native positive using exact digest-qualified `Q`;
- exact PostgreSQL/Valkey `tmpfs`, Web bind/health convergence and dependency health;
- no secret/evidence leakage, external Provider call or published application/dependency port;
- same-daemon teardown and complete cleanup; and
- state remains `built`, unrevoked and untransitioned for independent Review.

### 7.3 Non-blocking diagnostics or deleted gates

- byte-identical independent rebuild equality;
- pre-entry or controlled-root `LD_PRELOAD` resistance beyond accepted Option F;
- a CWT pre-release actual-root-Compose runtime run using a revoked predecessor;
- a second native positive direct runtime run after root Compose covers it;
- optional alternate-layout AI bundle-agreement experiments;
- repeated identity-field experiments after the exact resolver tests pass;
- external vulnerability-feed clearance, private Registry/replica/audit and protected host behavior, which remain explicit later external gates rather than local S6-05 claims; and
- harness self-failures presented as Product blockers.

No blocking gate is weakened: redundant execution is removed while exact artifact, architecture, security and supported-root-Compose correctness remain covered.

## 8. Evidence deliverables for the fresh Implementer

The implementation report and evidence manifest must bind:

- Technical Escalation analysis/plan Candidate identity supplied by the coordinator;
- implementation commit/tree/sole parent and exact path diff;
- non-CWT namespace-isolation reproduction result and cleanup;
- one Build Once invocation and exact output root;
- successor release ID, source archive hash, index, both child manifests/configs and release-record hash;
- exact validator source hash;
- sanitized validation-daemon owner/namespace class;
- digest-qualified `Q` and exact `I`/`C` resolution before Compose;
- direct runtime and root Compose results;
- failure/gate-open classification and cleanup outcome;
- unchanged five historical revocation identities;
- complete source/post-emission gate ledger; and
- explicit `built`, unrevoked, untransitioned final subject status.

The two Markdown deliverables require adjacent SHA-256 sidecars. Temporary secrets, container IDs, host identity, private host paths and secret values must not appear.

## 9. Stop conditions

Stop and return `BLOCKED` if:

- the allowed path list is insufficient;
- a new Product/config/runtime change is needed;
- a second image checker, topology, persistent state, service/daemon, lease or retry controller is proposed;
- the validation daemon cannot obtain an exclusive image store through either a private containerd socket/root or an isolated namespace;
- Compose cannot use a digest-qualified imported reference without a Registry/Provider/protected action;
- any outer endpoint must create/delete the release reference;
- any historical subject/marker must be edited or restored;
- a second Build Once invocation would be needed;
- a real blocking subject gate fails;
- cleanup cannot prove zero disposable consumers/resources;
- AI classification requires a wildcard/capability/authority change;
- Schema/Migration, S6-06/S6-07, external/protected action or Stage 7 is needed; or
- evidence cannot distinguish whether failure occurred before or after gate-open.

Return `NEEDS_OWNER_DECISION` only if standard single-store digest validation is impossible without changing accepted Option F, selecting/using an external Provider or protected environment, expanding architecture/security authority, or adding persistent coordination. No such decision is presently required.

## 10. Success and next gates

Implementation success requires:

- exact allowed scope;
- all proportional gates pass;
- one new successor subject only;
- one authoritative post-emission validation sequence;
- no harness/subject ambiguity;
- complete cleanup;
- subject `built`, unrevoked and untransitioned; and
- a clean docs-only evidence closure commit.

The Implementer then sends `COMPLETED` to the coordinator and stops. A separate fresh independent implementation/security/operations Reviewer must review the exact Candidate and subject. Only a later coordinator decision after `PASS` may advance lifecycle state. S6-06, S6-07 and Stage 7 remain blocked; Stage 7 still requires explicit Owner authorization.

## 11. Owner/ADR disposition

**No new Owner or ADR decision is required.**

This plan does not change:

- one Build Once subject;
- exact index/child identity;
- immutable revocation;
- exact-digest promotion;
- narrow shared Next framework-material authority;
- registry/replica/loss requirements;
- modular-monolith, data, Product, URL/SEO, Publish/Index, storage or AI architecture; or
- any Schema/Migration.

It replaces an accidental validation implementation detail that violated the already-accepted tag-is-not-authority rule. The coordinator may freeze and dispatch this plan without a new Owner decision.
