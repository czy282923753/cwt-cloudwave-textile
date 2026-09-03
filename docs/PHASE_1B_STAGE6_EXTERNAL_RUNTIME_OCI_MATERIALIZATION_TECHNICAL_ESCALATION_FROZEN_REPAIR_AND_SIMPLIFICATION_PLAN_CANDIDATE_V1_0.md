# CWT Phase 1B Stage 6 — External Runtime OCI Materialization Technical Escalation Frozen Repair and Simplification Plan Candidate V1.0

Date: **2026-09-04**

Status: **FROZEN PLAN CANDIDATE — coordinator verification is required; no implementation, rerun or acceptance is authorized**

Root-cause authority: `docs/PHASE_1B_STAGE6_EXTERNAL_RUNTIME_OCI_MATERIALIZATION_TECHNICAL_ESCALATION_ROOT_CAUSE_ANALYSIS_V1_0.md`

Accepted architecture: **Option F Trusted CI Build Once + private exact-digest Runtime Validation remains unchanged.**

Authority boundary: **Existing checker and materialization responsibilities only. No Product, image, workflow topology, provisioning, Registry, evidence-custody, lifecycle, promotion, Provider, protected-environment or production change is authorized by this plan.**

## 1. Frozen decision

Perform one replacement-oriented correction:

1. Make the existing `preflight-image` authority select the subject by the exact expected index digest inside the OCI Image Layout's multi-descriptor entry point, rather than by `manifests.length === 1` or array position.
2. Delete the duplicate full `verifyReleaseRecord()` call from the `materialize` transport path. The sole accepted Linux Runtime validator remains the one post-materialization full evidence authority.

Preserve the pinned ORAS command, private GHCR, exact workflow/release/digest inputs, detached evidence, full graph checks and Runtime validator. Do not normalize or rewrite `index.json`, introduce another parser/checker, add a classifier/state machine/retry/custody mechanism, change the OCI subject, or add another workflow step.

The current exact digest is the repair-validation subject and future separately authorized Runtime subject. **Do not rebuild, retag, copy in Registry, regenerate evidence or create a successor release.**

## 2. Authority and replacement boundary

### 2.1 Sole subject authority

The authority tuple remains:

```text
release.json releaseId/source.commit
  + release.json oci.indexDigest
  + workflow exact index_digest
  + authenticated Registry descriptor for repository@digest
```

`inventoryOciLayout` must receive the expected exact digest and select exactly one top-level descriptor with:

- `digest` equal to that expected digest;
- media type `application/vnd.oci.image.index.v1+json`; and
- content bytes whose SHA-256 equals the digest.

It then traverses only that content-addressed subject and preserves all existing child/config/layer/platform/release/evidence checks. Other top-level layout descriptors are store references only; they neither qualify nor disqualify the exact subject and must not become authority.

Missing, duplicated or wrong-media-type matches fail closed. Wrong child/config/layer/order, stale evidence, revocation and all existing negative cases continue to fail.

### 2.2 Deleted duplicate responsibility

`release-registry-integration.mjs materialize` remains an exact-digest transport boundary. It may validate its inputs, pinned ORAS identity, credential-file mode, authenticated remote descriptor and ORAS copy result. It must not call the complete `verifyReleaseRecord()` authority after copying.

`preflight-linux-runtime.mjs validate` already calls `verifyReleaseRecord()` before any Runtime action and maps its refusal to `image_evidence_not_pass`. That single retained call owns full local release/evidence validation for Runtime. No change to the Runtime validator is required.

This replacement removes one expensive duplicate full-graph extraction and prevents the transport helper's generic catch from obscuring checker failures.

## 3. Baseline, branch and rollback

| Boundary | Exact value |
| --- | --- |
| Execution baseline | `faab04781d9be67a1bb185e06a2a6cabb19f6e69` / tree `72e3a6527f5f8d14e28b714556c4e95a3a3a27ef` |
| Frozen release | `7e6ef0ad9fd00975da93789421c0d24ec9226e82` / tree `29ef35dfafd989bfdc08bd2e987f44a0e784af24` |
| Failed-attempt evidence | append-only `b11c1ba6f4dd80add40c6fb856a1a91b30836331` |
| Analysis branch | `codex/stage6-runtime-materialization-technical-escalation-v1` |
| Repair subject | `sha256:89e04e7201694e6f202c71cceb368622cc2d584136a7eedfaee9044a45023e8a` |

The fresh Implementer must start from the coordinator-verified analysis/plan Candidate commit. The independent Review commit remains sibling evidence and must not be merged merely to create ancestry.

If implementation or Review fails, revert only the implementation delta to the verified analysis/plan Candidate. Leave `b11c1ba6...`, the exact digest, artifact, package visibility and all historical evidence unchanged. Rollback grants no workflow rerun or external action.

## 4. Exact implementation scope

The fresh Implementer may modify only:

```text
M deploy/scripts/preflight-image.mjs
M deploy/scripts/preflight-image.test.mjs
M deploy/scripts/build-release-once.mjs
M deploy/scripts/release-registry-integration.mjs
M deploy/scripts/release-registry-integration.test.mjs
A docs/PHASE_1B_STAGE6_EXTERNAL_RUNTIME_OCI_MATERIALIZATION_REPAIR_IMPLEMENTATION_REPORT_V1_0.md
A docs/PHASE_1B_STAGE6_EXTERNAL_RUNTIME_OCI_MATERIALIZATION_REPAIR_IMPLEMENTATION_REPORT_V1_0.md.sha256
A docs/PHASE_1B_STAGE6_EXTERNAL_RUNTIME_OCI_MATERIALIZATION_REPAIR_EVIDENCE_MANIFEST_V1_0.md
A docs/PHASE_1B_STAGE6_EXTERNAL_RUNTIME_OCI_MATERIALIZATION_REPAIR_EVIDENCE_MANIFEST_V1_0.md.sha256
```

`build-release-once.mjs` may change only to pass its already known `emittedIndexDigest` to the corrected inventory function. No build behavior, Docker/Buildx argument, evidence schema or release output may change.

No change is permitted to:

- `.github/workflows/cwt-runtime-validation.yml` or any other workflow;
- `deploy/scripts/preflight-linux-runtime.mjs` or its accepted Runtime behavior;
- ORAS version/hash/source identity;
- `release.json`, detached SBOM/scan/provenance schemas or retained bytes;
- Dockerfile, Compose, application, database, Schema/Migration, Product, URL/SEO, Publish/Index, Asset/storage, AI or Provider code;
- provisioning/TAT files; or
- existing Operator, Review, implementation, release, transition or revocation evidence.

If this scope is insufficient, stop and return `BLOCKED`; do not broaden it in place.

## 5. Required implementation behavior

### 5.1 Exact subject selection

Replace the one-entry predicate with an expected-digest selector in the existing function. The interface must make the expected digest explicit for every call:

- `verifyReleaseRecord()` supplies `record.oci.indexDigest` after structural release-record parsing;
- Build Once supplies its already captured `emittedIndexDigest`; and
- tests supply the fixture's exact subject digest.

Do not select the first descriptor, the only descriptor of an inferred type, a tag annotation, a platform child or a mutable reference. Do not rewrite the layout to manufacture a one-entry file.

The selector must tolerate the exact standard ORAS shape in any top-level descriptor order while refusing zero or multiple matches for the expected digest. Existing graph traversal remains byte/digest based and unchanged after subject selection.

### 5.2 Materialization transport only

Keep these existing `materialize` obligations:

- exact pinned executable identity;
- canonical private repository;
- secure registry-config file;
- exact release/source/index input match;
- authenticated exact-digest descriptor/media-type/size check;
- new absolute destination; and
- successful exact-digest ORAS copy with cleanup on transport failure.

Delete only the post-copy `verifiedRelease(...)` call from `materialize()`. Do not delete `verifiedRelease()` from the publish path, where it verifies the trusted local Build Once subject before publication.

Materialization PASS means only that the exact graph was copied. Full evidence PASS is emitted only by the retained Runtime authority.

## 6. Proportional proof obligations

### 6.1 Focused contract tests

Extend existing tests; add no new test harness.

1. An ORAS-shaped layout entry point containing the exact subject index plus both child manifests passes full `verifyReleaseRecord()` in multiple descriptor orders.
2. The same exact subject passes with irrelevant additional top-level store references because they are non-authoritative.
3. Missing expected digest, duplicate expected-digest entries, wrong subject media type and digest/blob mismatch fail closed.
4. All retained wrong index/child/config/platform-order, stale/leaking evidence, package-manager, Sharp/libvips, lifecycle and revocation negatives still pass.
5. Registry integration tests prove the exact ORAS digest-rooted copy remains unchanged and the materializer no longer invokes the full release checker.
6. Static workflow tests continue to prove the sole Runtime authority is present and ordered immediately after materialization.

### 6.2 Existing focused suites

Require:

```text
node --test deploy/scripts/preflight-image.test.mjs \
  deploy/scripts/release-registry-integration.test.mjs \
  deploy/scripts/preflight-linux-runtime.test.mjs

pnpm test:deployment
git diff --check
```

Run ESLint and strict TypeScript only if the repository's ordinary task wrappers include the changed `.mjs` files or the independent Reviewer requires them. No application build, browser suite, Migration, Provider or Product test is needed for this bounded JavaScript validation correction.

### 6.3 Decisive read-only integration proof

Using existing authorized read-only credentials and the current artifact while available:

1. download artifact `9876610372` and verify GitHub's archive digest;
2. authenticated-fetch the exact Registry descriptor;
3. run the unchanged pinned ORAS copy into one fresh local temporary layout;
4. run the corrected `preflight-image` authority directly against that unmodified ORAS layout and exact detached evidence;
5. require exact index `sha256:89e04e...`, exact two children and `state: built`; and
6. remove local credentials/layout after recording sanitized results.

This is a read-only reproduction, not a workflow rerun, VM request, Product Runtime PASS or lifecycle transition. It requires no new live VM.

## 7. Evidence and completion contract

The implementation report and manifest must bind:

- analysis/plan Candidate supplied by the coordinator;
- implementation commit/tree/sole parent and exact allowed-path diff;
- deleted duplicate validation call;
- corrected exact-digest selector and retained negative boundaries;
- focused suite results;
- exact artifact metadata and hash results;
- exact authenticated Registry descriptor and private package state;
- direct unmodified ORAS-layout verification PASS;
- confirmation that the digest remains built, unrevoked and untransitioned;
- zero remote mutations and zero external resources; and
- explicit statement that Product Runtime remains HOLD.

Reports require adjacent SHA-256 sidecars. Do not retain credentials, downloaded image blobs or detached artifacts in Git.

## 8. Risks and bounded residuals

| Risk | Treatment |
| --- | --- |
| Ignoring unrelated layout references could appear permissive | They are not subject authority; exact expected digest, media type and every traversed blob digest remain mandatory. Test zero/multiple exact matches. |
| Materializer no longer performs a full post-copy verification | The immediately following sole Runtime authority performs the identical full check before Runtime action; duplicate work is deleted, not assurance. ORAS itself verifies copied content digests. |
| Generic `integration_not_pass` remains for unforeseen ordinary errors | Do not add a classifier in this task. The known full-check error moves to the existing typed Runtime boundary; standard transport failures already map to `registry_command_failed`. |
| GitHub detached artifact has finite retention | Use the current exact artifact before its recorded expiry. If unavailable or hash-mismatched, stop under the existing loss/evidence rules; do not add custody machinery here. |
| Product Runtime may still fail later | This correction makes no Product claim. A separately authorized real Runtime run is still required. |

Complexity decreases: one invalid cardinality assumption and one duplicate full verification are removed; no new persistent state, authority, workflow, tool, parser, retry, transfer or custody path is added.

## 9. Owner/ADR and external-action disposition

**No new Owner or ADR decision is required for implementation.** The plan restores OCI-spec-compatible subject selection and the already accepted single Runtime authority without changing Option F, schema, public behavior, security/data boundaries or lifecycle policy.

After implementation and independent Review PASS, any new Tencent VM/Runner creation or Runtime workflow dispatch remains a separately authorized operator action. No such action is part of the implementation or Review task.

## 10. Stop conditions and next gate

Stop and return `BLOCKED` if:

- an exact-digest selector cannot accept the direct standard ORAS layout without weakening graph/evidence checks;
- the current digest, artifact or detached file hashes no longer match;
- a Product/image/evidence-schema/workflow/provisioning change is required;
- a new parser, validator, state, classifier, retry, custody or transfer mechanism is proposed;
- any Registry write, Build Once, retag, package visibility change, VM/Runner, workflow dispatch/rerun, transition, promotion or deployment is needed for implementation proof; or
- the exact allowed path list is insufficient.

One fresh Implementer task may execute this plan. One separate independent Reviewer may review the resulting Candidate. No remediation loop, self-approval or automatic external retry follows.

Next gate: **coordinator verifies and freezes this Candidate, then dispatches the fresh implementation task.**
