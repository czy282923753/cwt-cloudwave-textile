# CWT Phase 1B Stage 6 — External Runtime OCI Materialization Technical Escalation Root-Cause Analysis V1.0

Date: **2026-09-04**

Status: **TECHNICAL ROOT-CAUSE ANALYSIS COMPLETE — one bounded validation-boundary correction is required; Product Runtime Validation remains HOLD**

Role: **Independent Technical Root-Cause Analyst**

Principal plan: `docs/PHASE_1B_STAGE6_EXTERNAL_RUNTIME_OCI_MATERIALIZATION_TECHNICAL_ESCALATION_FROZEN_REPAIR_AND_SIMPLIFICATION_PLAN_CANDIDATE_V1_0.md`

Authority boundary: **Read-only Git/GitHub/Actions/GHCR inspection, one local read-only exact-digest ORAS materialization, local/Synthetic verification, and versioned documentation only. No Product, workflow, provisioning or validator remediation; no Push, Build Once, GHCR mutation, package-visibility change, VM/Runner creation, workflow dispatch/rerun, promotion, deploy, Production/Staging/Lighthouse/COS/DNS access, S6-06, S6-07 or Stage 7 action occurred.**

## 1. Executive disposition

The sole real Runtime workflow did not fail because of GHCR authorization, missing or expired detached evidence, release/source/digest mismatch, OCI referrers, attached SBOM/provenance, checkout/path drift, or an established Product defect.

It failed because CWT's existing OCI checker treats an OCI Image Layout's top-level `index.json` as if it must contain exactly one descriptor. That assumption is false for the standard ORAS OCI content store produced by the exact accepted command. ORAS 1.3.3 successfully copied the exact multi-platform subject and placed three descriptors in the target layout entry point:

1. the exact accepted OCI image index;
2. the `linux/arm64` child image manifest; and
3. the `linux/amd64` child image manifest.

`deploy/scripts/preflight-image.mjs` then evaluated `rootIndex.manifests.length !== 1`, threw `Image evidence refused: OCI root index must name one accepted subject`, and stopped before traversing the exact subject. `release-registry-integration.mjs` deleted the temporary layout and collapsed that ordinary `Error` into `{"status":"NOT_PASS","reasonCode":"integration_not_pass"}`.

This is a **validator false assumption plus duplicate validation placement**, not an OCI subject defect. The authoritative fact is the exact release-record index digest and the content-addressed graph reached from it; the top-level layout index is a multi-descriptor reference entry point, not the release identity.

The exact digest and detached evidence remain trustworthy and reusable at the time of this analysis. No rebuild, retag or replacement digest is required. The Product Runtime validator was skipped, so Runtime compatibility remains unproven and **HOLD**.

## 2. Immutable baseline and evidence

| Fact | Exact identity / result |
| --- | --- |
| Last reviewed execution baseline | `faab04781d9be67a1bb185e06a2a6cabb19f6e69` |
| Execution baseline tree | `72e3a6527f5f8d14e28b714556c4e95a3a3a27ef` |
| Workflow blob | `b5f38ba17ea037009269061bacbe2d67cb6ef413` |
| Frozen release source / tree | `7e6ef0ad9fd00975da93789421c0d24ec9226e82` / `29ef35dfafd989bfdc08bd2e987f44a0e784af24` |
| Build Once run / job | `33709304781` / `100505190849`; success |
| Detached artifact | `9876610372`; digest `sha256:fed62c295f003bc8ef984ec57fbec0c5b29156eff816de5613b8d0663b520b8f` |
| Exact OCI index | `sha256:89e04e7201694e6f202c71cceb368622cc2d584136a7eedfaee9044a45023e8a` |
| Exact children | `linux/amd64` `sha256:301db86bc22329b01dd3ef3d4754c75c92de4d6577f26c218d638014335d90b3`; `linux/arm64` `sha256:b30d5700d36242ea1582e74b611c169e5c02f85b9ee9f2d8a6b7816eb49b918b` |
| Sole Runtime run / job | `33786658330` / `100752972062`; failure |
| Append-only Operator evidence | `b11c1ba6f4dd80add40c6fb856a1a91b30836331` |
| Independent provisioning/TAT Review | `025459b90d4c667e00b115398af7ba382464c47d`; PASS, sibling evidence only |

The Runtime job checked out the frozen release. Its `release-registry-integration.mjs`, `preflight-image.mjs` and `preflight-linux-runtime.mjs` blobs are identical between `7e6ef0ad...` and `faab0478...`; only workflow control changed. The diagnosis therefore reads the code that actually executed.

## 3. Exact failing command, inputs and exit path

The first substantive failure was workflow step 8:

```text
node deploy/scripts/release-registry-integration.mjs materialize \
  --oras "$CWT_ORAS" \
  --auth "$CWT_REGISTRY_AUTH" \
  --release "$RUNNER_TEMP/cwt-release-evidence/release.json" \
  --output "$RUNNER_TEMP/cwt-runtime-subject.oci" \
  --github-repository "czy282923753/cwt-cloudwave-textile" \
  --release-id "7e6ef0ad9fd00975da93789421c0d24ec9226e82" \
  --index-digest "sha256:89e04e7201694e6f202c71cceb368622cc2d584136a7eedfaee9044a45023e8a"
```

The exact internal path was:

```text
materialize()
  -> validate pinned ORAS, credential-file mode, release path, new output path and repository
  -> validate release.json release/source/index identity
  -> authenticated `oras manifest fetch --descriptor` for the exact digest
  -> `oras cp --from-registry-config ... --to-oci-layout ... exact@digest output:release`
  -> verifiedRelease()
  -> verifyReleaseRecord()
  -> inventoryOciLayout()
  -> rootIndex.manifests.length !== 1
  -> ordinary Error
  -> delete temporary output layout
  -> top-level non-RegistryIntegrationFailure fallback
  -> `integration_not_pass`, exit 1
```

The decisive predicate is `deploy/scripts/preflight-image.mjs` line 46 at the execution baseline. The broad reason code is not a predicate; it is the fallback at `deploy/scripts/release-registry-integration.mjs` line 310.

An ORAS descriptor or copy failure cannot explain the observed generic code: the shared `run()` wrapper converts every nonzero ORAS result or spawn error into the typed `registry_command_failed` result. The already validated `release.json` reaches the first ordinary-error boundary only after a successful copy. The 43-second step duration is also consistent with copying the complete graph and then failing immediately at local inventory.

## 4. Independent reproduction and standard semantics

### 4.1 Exact read-only reproduction

Using the accepted ORAS binary identity (`1.3.3`, commit `210747c29c1d38732b3194878dfd8b5a6b9ad7eb`) and existing read-only GHCR credentials:

- authenticated exact-digest descriptor fetch returned media type `application/vnd.oci.image.index.v1+json`, the exact index digest, and size `647`;
- both child descriptor fetches returned the exact recorded manifest digests and size `5092`;
- `oras discover --depth 1` returned `referrers: []`;
- the exact workflow `oras cp` command completed successfully and materialized a 483 MiB layout containing 35 content-addressed blobs;
- the subject blob's recomputed SHA-256 was exactly `89e04e720169...`;
- the generated 738-byte top-level `index.json` had SHA-256 `1990342e9f763a814ca087fa8c253f8778692507e8ef295c40cada23f5d6be81` and exactly the three descriptors listed in Section 1; and
- running the unchanged checker against that direct ORAS output failed immediately with `OCI root index must name one accepted subject`.

No remote write occurred. A slow first GHCR connection on the analyst host was treated as local network noise because the original Runner login completed in approximately 0.8 seconds; it is not used as causal evidence.

### 4.2 Subject-scoped positive control

A temporary read-only view changed only the non-content-addressed top-level entry point so it named the exact release-record digest. It reused every original ORAS blob unchanged. The unchanged full `preflight-image` authority then returned:

```json
{"ok":true,"indexDigest":"sha256:89e04e7201694e6f202c71cceb368622cc2d584136a7eedfaee9044a45023e8a","state":"built"}
```

That 26-second pass traversed and hash-checked the exact index, both child manifests/configs/layers, source/release labels, timestamps, runtime user, framework schema, both SPDX inventories, both scan records, both provenance records, Sharp/libvips closure, package-manager absence, retention contract and revocation absence. This isolates the failure to top-level descriptor selection; no OCI or detached-evidence byte needed correction.

### 4.3 Primary-source semantics

- [OCI Image Spec v1.1.1 — Image Layout](https://github.com/opencontainers/image-spec/blob/v1.1.1/image-layout.md#indexjson-file) defines `index.json` as a **multi-descriptor entry point** and explicitly permits image-index and image-manifest descriptors there.
- [ORAS 1.3.3 dependency manifest](https://github.com/oras-project/oras/blob/v1.3.3/go.mod) pins `oras-go` v2.6.2 and OCI Image Spec v1.1.1.
- [ORAS Go v2.6.2 OCI store](https://github.com/oras-project/oras-go/blob/v2.6.2/content/oci/oci.go) tags each pushed manifest by digest and persists tagged plus otherwise digest-addressed manifests in the layout index. This directly explains one tagged subject index plus two digest-addressed child manifests.
- The pinned ORAS `cp --help` contract states that copying an image index copies all its manifests. Referrers require the separate recursive option and were not requested.

ORAS behaved according to its documented content-store model. This is not a GHCR or ORAS defect.

## 5. Detached evidence and exact-digest trust

| Check | Result |
| --- | --- |
| Artifact availability | Present, `expired: false`; GitHub reports expiry `2026-10-03T03:06:18Z` |
| Artifact archive identity | Exact expected digest `sha256:fed62c...`; upload and Runtime download logs agree |
| Detached file integrity | All six SBOM/scan/provenance SHA-256 values match `release.json` |
| Source identity | Git tree is exact; recomputed `git archive` SHA-256 is `e85460e52ba617e19ed53b8e82f871531bd942e85e2c9e25ba8d5dfc628f0099`, matching `release.json` |
| Registry subject | Authenticated read resolves the exact 647-byte OCI index and both exact children |
| Package state | GitHub package API reports the package `private`; exact version `1203106388` retains tag `7e6ef0ad...` |
| Attached evidence/referrers | None; evidence is detached as designed |
| Revocation | No revocation record for this exact index in the detached evidence; no revocation was performed after the materialization failure |
| Full byte/evidence verification | PASS when the exact digest, rather than layout-entry count, selects the subject |

Conclusion: **the current digest and detached evidence are reusable without rebuild, retag, Registry copy or evidence regeneration while the existing evidence remains available and hash-matching.** The recorded GitHub artifact expiry is an operational deadline, not a reason to add a new custody mechanism in this repair.

## 6. Required cause classification

| Candidate cause | Disposition | Evidence |
| --- | --- | --- |
| a. Private GHCR / ORAS / credential scope | **Not the failure.** ORAS store behavior contributed to exposing the bad assumption, but behaved correctly. | Original login passed; current authenticated descriptor/child/full-copy reads pass; package is private. |
| b. Detached evidence mismatch or expiry | **Rejected.** | Artifact is unexpired; archive and every detached file hash match. |
| c. Source/digest/provenance identity mismatch | **Rejected.** | Commit, tree, archive, index, children, configs and provenance all match. |
| d. OCI referrer/SBOM/provenance semantics | **Rejected as causal.** | No referrers exist; `-r` was not used; evidence is detached and verifies. The relevant semantics are the layout entry point, not referrers. |
| e. Workflow checkout/path/environment error | **Rejected.** | Exact checkout and inputs passed; the same blobs/command reproduce independently. |
| f. Validator/checker duplication or false assumption | **Confirmed primary cause.** | Materializer runs the full checker before the sole Runtime authority; checker assumes a one-entry layout index contrary to standard ORAS output. |
| g. Actual OCI subject/Product defect | **Not evidenced.** | Full byte/evidence verification passes after exact-digest subject selection. Product Runtime execution was skipped, so no Runtime PASS is claimed. |
| Other | **Secondary observability defect only.** | Generic catch hides ordinary checker errors as `integration_not_pass`; removing the duplicate checker from materialization removes this causal opacity without adding a classifier. |

## 7. Authority and test-gap analysis

### 7.1 One authoritative fact

`release.json.oci.indexDigest`, cross-checked against the workflow input and authenticated Registry descriptor, is the subject authority. From that exact content digest, the existing checker verifies the complete child/config/layer and detached-evidence graph. Order or count of unrelated top-level store references has no authority over the subject.

### 7.2 Duplicate validation

`materialize()` currently calls `verifyReleaseRecord()` after transport. The next workflow step, explicitly named the sole accepted Linux Runtime Validation authority, calls the same `verifyReleaseRecord()` again before any Runtime action. The first call adds no independent assurance; it duplicates the authoritative call and is the reason a transport helper prevented the authority from running.

### 7.3 Missing contract test

The existing `preflight-image` fixture hand-writes a top-level `index.json` with one subject descriptor. The registry integration test asserts only the ORAS command arguments. No retained test feeds the existing checker the standard three-entry layout produced by that exact command. All 24 focused tests pass while omitting the real integration shape.

The needed test is not a new harness: extend the existing fixture to model the standard ORAS layout entry point and keep the existing negative matrix.

## 8. Claim ceiling and terminal disposition

- Causal root: **confirmed and evidence-backed**.
- Product/security/data-integrity issue: **none established by this failure**.
- Exact digest/evidence: **trustworthy and currently reusable**.
- Runtime compatibility: **unknown; sole Runtime validator was skipped**.
- Current release state: **built, unrevoked, untransitioned; no promotion authority**.
- New Owner/ADR decision for the bounded correction: **not required**.
- Any new VM, Runner or workflow dispatch: **still requires separate post-implementation/review authorization**.
- Next gate: coordinator verifies and freezes the adjacent plan, then assigns one fresh Implementer and one independent Reviewer at most.

Terminal status: **COMPLETED**. This document authorizes no implementation or external execution.
