# CWT Phase 1B Stage 6 — GitHub Actions / Private GHCR / Tencent Ephemeral Runner Integration Implementation Report V1.0

Date: **2026-09-02**

Status: **BOUNDED IMPLEMENTATION CANDIDATE COMPLETE — Fresh Independent Implementation / Operations / Security Review required**

Role: **Implementer; no self-approval**

Evidence manifest: `docs/PHASE_1B_STAGE6_GITHUB_GHCR_TENCENT_EPHEMERAL_RUNNER_INTEGRATION_EVIDENCE_MANIFEST_V1_0.md`

## 1. Authority and exact Candidate

| Field | Exact identity |
| --- | --- |
| Accepted implementation root | `7d6c92718d3e88ec9ab74490da2a81380f33bc3c` |
| Root tree | `6eaae5a052cb26ea65f6296d93bdc7ab12563914` |
| Accepted Validation Simplification Re-Review | `ef7d53be2c00349b3faeb05f557caa7f54121cf6` (`PASS`; review-only and not an ancestor) |
| Integration implementation Candidate | `512e7a517b81eb68d90d24ed98c2b826595ff2da` |
| Candidate tree | `d7caa0ef82f139575ef30f36878e0f24465032e6` |
| Candidate sole parent | `7d6c92718d3e88ec9ab74490da2a81380f33bc3c` |
| Branch | `codex/stage6-validation-simplification-v1-1` |

The Review commit was inspected read-only and remains outside implementation ancestry. This task performed no Review or self-approval.

## 2. Root cause and corrected responsibility boundary

The accepted Build Once authority emitted a complete local OCI image layout and detached evidence, while the accepted Linux Runtime Validation authority already required a private Registry `repository@sha256:<index>` input. The missing boundary was a minimal controller path that could publish that exact OCI descriptor graph without rebuilding it, then bind a separately authorized native Runtime job to the same digest on the selected single-use Runner.

The correction assigns each responsibility once:

- `build-release-once.mjs` remains the sole image producer and is unchanged;
- `release-registry-integration.mjs` performs only standard OCI layout ↔ GHCR graph transfer, exact descriptor verification, evidence-layout reconstruction and job-scoped Runner binding;
- `cwt-release-publish.yml` is the manual Build Once/private-GHCR controller;
- `cwt-runtime-validation.yml` is a separate manual exact-digest Runtime controller;
- `preflight-linux-runtime.mjs` remains the sole formal Runtime Validation authority and is unchanged; and
- Tencent VM provisioning, registration, billing, credential injection and destruction remain external prerequisites, not repository orchestration.

No second image builder, runtime validator, Registry service, custody framework or cloud manager was added.

## 3. Why there are two manual workflows

The OCI index digest does not exist until the one Build Once succeeds. Requiring that digest as an input to the same build invocation would either be impossible or reintroduce a prior-build/rebuild assumption. Automatically starting Runtime Validation after publication would also bypass the required separate Owner authorization.

The minimum correct sequence is therefore two explicit `workflow_dispatch` workflows:

1. the release workflow accepts the exact source commit, requires the dispatch revision to equal it, refuses a rerun, runs the unchanged Build Once once, publishes the emitted index and preserves detached evidence;
2. a later separately authorized runtime workflow must explicitly supply that same release commit, exact lowercase index digest, release evidence run ID and a fresh 128-bit Runner nonce.

Neither workflow has Push, Pull Request, Schedule or `workflow_run` activation. Both name fixed protected GitHub Environments whose protection configuration remains an external prerequisite.

## 4. Exact digest-preserving Registry path

ORAS `1.3.3` is the standard OCI registry client. Each workflow downloads its platform-specific official release asset over HTTPS, verifies the exact SHA-256 before extraction and the integration script verifies ORAS version `1.3.3`, Git commit `210747c29c1d38732b3194878dfd8b5a6b9ad7eb`, and clean tree state. Version `1.3.3` includes the patched ORAS dependency line; no floating installer, action or container tag is used.

The publication path is exactly:

```text
subject.oci@sha256:<index>
  -> ORAS cp --from-oci-layout
  -> ghcr.io/<exact-lowercase-github-owner>/<exact-repository>:<release-commit>
  -> verify tag descriptor == expected OCI index
  -> verify repository@sha256:<index> descriptor == expected OCI index
  -> require anonymous descriptor access to be denied
```

The release-commit tag is a convenience locator only. The emitted OCI index digest remains the sole identity and Runtime input. A descriptor mismatch, Docker media-type conversion, public/anonymous read, missing credential file, tool drift or non-built release record fails closed. The GHCR token is passed only to the login step through standard input, never as an argument, and is not present during dependency installation, Build Once or Runtime Validation. Publish receives `packages: write`; Runtime receives only `packages: read`.

The runtime workflow downloads detached evidence only. It reconstructs read-only `subject.oci` from `ghcr.io/<repository>@sha256:<index>` with ORAS, then the existing image authority independently verifies the full layout and evidence hashes. The subject enters the Docker Engine only through the unchanged validator's exact-digest GHCR pull. No Docker save/load, Docker archive, OCI tar custody, temporary transfer tag, Buildx copy/repair, subject rebuild or host-to-host transfer exists in the new path.

Official primary references used for the bounded mechanism:

- [ORAS distributing OCI layouts](https://oras.land/docs/how_to_guides/distributing_oci_layouts/)
- [ORAS copy command](https://oras.land/docs/commands/oras_cp/)
- [GitHub Container Registry authentication and OCI support](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [GitHub package access and default private visibility](https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility)

## 5. Tencent Singapore single-use Runner binding

The runtime job requires all cumulative labels:

```text
self-hosted
linux
x64
cwt-tencent-singapore
cwt-single-use
cwt-job-<128-bit-lowercase-hex-nonce>
```

The `self-hosted` label prevents fallback to GitHub-hosted execution. The unique job label must be assigned only to the externally provisioned VM. Before GHCR access, repository code also requires first-attempt `workflow_dispatch`, `RUNNER_ENVIRONMENT=self-hosted`, Linux/X64, a clean exact release checkout, and exact Runner name `cwt-tencent-sg-<nonce>`. The fixed selection is Tencent Cloud region `ap-singapore`, matching Tencent's official [Regions and Zones](https://intl.cloud.tencent.com/document/product/213/6091?lang=en); Ubuntu Server 24.04 LTS 64-bit is present in Tencent's official [public image list](https://cloud.tencent.com/document/product/213/93093).

This proves only the GitHub routing/name contract. The sanitized Runner-binding result explicitly records `actualProviderAndDestructionProven: false`. Actual CVM identity, independent provisioning, single-use registration, non-reuse, billing and destruction remain external proof and cannot be inferred from labels or Local/Synthetic tests. The existing runtime validator separately enforces Ubuntu 24.04, native `linux/amd64`, root, host Docker, local Unix socket, no DIND/container state and the reviewed Docker/Compose compatibility profile.

GitHub documents that self-hosted labels are cumulative and all selected labels must match: [Using self-hosted runners in a workflow](https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/use-in-a-workflow).

## 6. Security and Test Simplification Check

Result: **PASS**.

- **Delete/narrow:** no automatic trigger, chained validation, mutable-tag identity, credential argument, alternative endpoint, alternate profile or runtime retry exists.
- **Reuse:** unchanged Build Once, release verifier, compatibility profile and Linux runtime validator remain authoritative.
- **Standard mechanism:** two manual GitHub workflows, pinned official Actions, hash-pinned ORAS, GHCR OCI support and cumulative self-hosted labels.
- **No new system:** no table, Worker, queue, Lease, state machine, registry proxy, cloud provisioner, runner manager, credential store, classifier, automatic revocation, recovery authority or promotion mechanism.

The implementation adds 732 lines across seven paths. Most are explicit workflow wiring and adversarial/static proof. Persistent production complexity is unchanged. CI/operations complexity increases by two manual entry points and one stateless transfer/binding script because the digest cannot be an input before Build Once and Runtime authorization must remain separate afterward. No dual supported Runtime path exists.

## 7. Verification ledger

| Gate | Result |
| --- | --- |
| New registry/workflow focused tests | **PASS**, 6/6 |
| New + existing Linux focused tests | **PASS**, 16/16 |
| Deployment suite at exact Candidate | **PASS**, 111/111 |
| Full ESLint | **PASS**, zero warnings |
| Strict TypeScript | **PASS** |
| AI architecture at exact Candidate | **PASS**, 933 candidates / 618 executable nodes |
| Workflow YAML syntax | **PASS**, both files |
| ORAS official Darwin ARM64 asset SHA-256 | **PASS**, `f33fc12753c54172b0d0d19eaa0318d3f90fe9b094d96e8b259c881713c92e1c` |
| ORAS official Linux AMD64 asset SHA-256 | **PASS**, `9ce999f8d2de03fc03968b29d743077a58783e545e5eaa53917ca177352d0e59` |
| Pinned Action tag identities | **PASS**, checkout `d23441a...`, upload `ea165f8...`, download `d3f86a1...` |
| `git diff --check` | **PASS** |
| Package/lock, Compose, Dockerfile, Build Once, image verifier, runtime validator/profile delta | **0** |
| Provider/API, credentials, GHCR push/pull, Build Once, Runtime Validation | **0** |

One non-decisive AI architecture attempt failed closed because the new deployment script was initially unclassified. The exact file was added to the existing `other-project-tooling` class and the profile's selected-pointer/full-file hashes were updated; the decisive Candidate run passed with no wildcard or capability expansion.

Full Product Vitest and Next build were not rerun because Product/runtime source, dependencies, package/lock, Compose and Dockerfile are byte-identical. The deployment, lint, type, AI, workflow syntax, tool-hash and structural gates directly cover the changed risk. No local gate can substitute for real GHCR or Tencent validation.

## 8. External prerequisites and claim ceiling

This Candidate does not prove or authorize:

- GitHub Environment protection or a real Owner approval event;
- self-hosted trusted Build Once Runner provisioning/cleanliness;
- GHCR account/package creation, write/read permission, retention, immutable no-delete policy, audit or protected complete replica;
- Tencent account, fee, CAM, CVM creation, instance identity, Runner registration or destruction;
- availability of the accepted Docker/Compose profile on a real Tencent VM;
- actual Build Once, external upload/download, Registry push/pull, Runtime Validation, transition, promotion, deployment, S6-06, S6-07 or Stage 7.

Rollback is an exact revert of Candidate `512e7a517b81eb68d90d24ed98c2b826595ff2da` to `7d6c92718d3e88ec9ab74490da2a81380f33bc3c`. It removes both manual workflows, the integration script/test, operator documentation and the exact AI tooling classification without changing any accepted image/runtime authority or historical record.

The only next gate is one **Fresh Independent Implementation / Operations / Security Review** of the exact Candidate plus this docs-only closure. The Implementer does not dispatch it.
