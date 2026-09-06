# Stage 6 reviewed local-stream integration report V1.0

Recorded: 2026-09-06. Status: **LOCAL INTEGRATION CANDIDATE; focused independent integration Review required. Stage 6 remains Partial / HOLD.**

## Inputs and integration identity

This branch starts from the final Backup Review commit `5df3701549983db4add647dd36bbc14b2e13f571`, whose parent is the accepted local Backup Candidate `14c11b9e78274f7280281418a4295a3894f40619`. It merges the final Runtime Review commit `2ad7146b48bc1930332966c47da28b8fddd923a0`, which reviews Runtime tools delivery `7e48c72940261ea264fef20d4a54355a4e14a609`. Both implementation streams originate from nonaccepted Stage 6 source `59d349f5be8bfc5ed3e9fc1157158b4140acdd08`; their implementation paths do not overlap. The source-preserving merge commit is `5eab97f8d4530ce131d4e3c2234e91408ad942c5` on `codex/stage6-local-integration`. Both reviewed ancestries and all implementation/Review reports remain unchanged and reachable.

This merge creates no accepted tag, checkpoint protocol, Release identity, OCI digest or phase advancement. Stage 5 `a200838be34c8834a00bdcf6d1819da96e2ad26c` remains the last accepted Product baseline.

## Composed ownership and result

The merge completed without a content conflict or convergence edit. Runtime tools retain ownership of the workflow, release-header/materialization boundary, host-side Runtime validator and fixed compatibility profile. A future immutable successor subject owns this integrated `compose.yaml`, Drizzle SQL and project-relative binds; its image owns application code, `scripts/migrate.ts` and `deploy/backup`. The Runtime plan selects subject Compose/SQL and the image Migration entrypoint. It does not overlay current files onto the historical immutable subject.

The integrated Compose authority retains ADR-0021 topology A: separate project-scoped Production/Staging outbound bridges, five approved Provider callers, dormant/internal Production AI Worker, internal database/cache/ingress networks, unchanged proxy ports and secret grants, and the **15/30** weekly connection allocation. Scheduler-only writable daily/set roots and the read-only shared backup/Migration mutex file remain enforced. The Runtime workflow retains distinct canonical sibling tools/subject checkouts, exact clean Git identities, tools-owned policy, subject-owned graph, one image-evidence authority and safe early release-header reconciliation.

No interface incompatibility was found. No implementation source was changed after the merge; this report is the only integration-specific repository addition.

## Proportionate local verification

- `node --test deploy/scripts/release-registry-integration.test.mjs deploy/scripts/preflight-linux-runtime.test.mjs`: **23 passed**. This preserves tools/subject identity separation, workflow-selected absolute tools paths, source/profile ownership, release-header privacy, materializer transport and sole OCI authority.
- `pnpm test:deployment`: **164 passed**. The current integrated source validates dynamic/default Compose authority, topology A, outbound gateway/membership, writable environment-private backup/set mounts, read-only shared mutex, denied Web/Worker backup mounts, direct Node schedules, Runtime workflow identity separation and unchanged deployment controls.
- `node --test deploy/scripts/preflight-image.test.mjs`: **16 passed**. Existing OCI index/child/evidence, runtime package-manager absence and Dockerfile runtime-stage source checks remain intact.
- One disposable Linux/network-none probe used two clean canonical sibling checkouts at exact merge commit `5eab97f8...`, one as tools and one as the synthetic successor subject. Actual `prepareRuntimeInputs` selected the tools profile and subject `compose.yaml`/Drizzle mount/Migration image entrypoint. The selected subject contained the approved outbound networks, both environment set roots, shared mutex mount and backup/Migration code; its Dockerfile contained PostgreSQL client acquisition, Restic/flock checks and `deploy/backup` packaging. The release header and digest were conspicuously synthetic, no evidence outcome or CWT image was emitted, and the temporary bundle/checkouts were removed.
- `git diff --check` passed. The exact PostgreSQL Bookworm pin was inspected locally and remains absent; no pull or substitute was attempted.

The module-level PostgreSQL/Restic restore, daily stale-marker convergence, TLS/S3 fixture, network-peer and private storage checks remain valid independently reviewed evidence. They were not repeated as a second Product/backup Review because the merge changed none of those bodies.

## Packaging and external prerequisites

The unchanged input `postgres:18.4-bookworm@sha256:882236b897e39051d2368c5ccc6cda944904723506b2dfc97f2a8f5bc9afa382` is not present on this host. Therefore this integration cannot execute the exact client acquisition layer, either architecture's copied shared-library closure, final slim-runtime tool smoke, linux/amd64 successor image inspection or a full integrated Runtime execution. Cached tooling from a different PostgreSQL base proves only the already-reviewed Synthetic backup behavior.

An authorized builder must first make that exact unchanged pin available, then build one coherent successor from the independently accepted integrated source, create its new real Release/evidence identity, and run the reviewed Runtime chain with tools and subject identities matching that successor. No historical Release record or OCI digest may be reused to claim this integrated source was built.

External Validation Required remains: native Tencent host/sudo/firewall/capacity/timing, live Registry and artifact custody, actual COS/private policy/provider semantics, protected Staging restore/start, teardown, independent scheduler-exit/monitoring transport and Owner-approved RPO/RTO. The external monitoring transport remains the known S6-05/Stage 7 integration item and is not implemented by this merge. O-18, 2 vCPU/4 GB/60 GB limits, the complete Migration chain and all Product/SEO/business-truth rules remain unchanged.

No Push, Registry write, CWT image build/emission, workflow dispatch, cloud/other-host access, real Provider/COS operation, production credential/data use, protected service start or deployment occurred. Next gate: focused independent Review of this local composition and its exact merged source/interfaces. Module acceptance does not substitute for that Review.
