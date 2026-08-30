# CWT Phase 1B Stage 6 S6-04 B-04 Reproducible-Image Technical Disposition and Planning Amendment Candidate V1.0

Status: **TECHNICAL LEAD CANDIDATE — NEEDS_OWNER_DECISION; fresh independent planning-amendment review required; not implementation authorization or acceptance**

Date: **2026-08-31**

Accepted Stage 6 planning Candidate: `cf03e22ce690a1a09b79bba32434a44aaa7046de`

Reviewed S6-02 planning amendment: Candidate `96772363e95ca944fa1720d5f6a4b4cbfbd852f3`; independent review-only `07a6d030035969e4473ed85c1d1302af9990cce2` (`PASS`; neither object is silently absorbed into this document's parent relation)

Accepted implementation checkpoint and required parent: `de40457e2e99d118915998ed57be33257512c0df` (tree `8a151d2a8c20011099d0322ce7d5fd074de215ce`; sole parent `c0950ab8ce1c207758d5bc609b788bf721482447`)

S6-03 review-only sibling evidence: `384e40457c8891a0490a91d89fac498f5112b11d` (tree `96629e33583100d38aa3b7541ea521840d32300a`; sole parent `de40457e...`; not in this Candidate's ancestry)

Read-only Implementer worktree: `/Users/calvin/.codex/worktrees/39c0/CWT（CloudWave Textile）项目`

Authority boundary: **Stage 6 planning only. Stage 7 remains HOLD and requires a new explicit Owner authorization.**

## 1. Disposition

B-04 is a deterministic, reproducible stop condition. The observed digest drift has two independent causal classes:

1. **standard container/build residue**, which has a bounded correction: apply `SOURCE_DATE_EPOCH` to layer entries with the OCI exporter `rewrite-timestamp=true`; provide one explicit non-secret immutable release ID through Next `generateBuildId`; remove non-runtime Next traces/caches, pnpm timestamp state and the final Node compile cache from the release image; and pin every digest-affecting frontend/tool/input; and
2. **Next `16.2.12` cryptographic build entropy**, which cannot be removed while all accepted security constraints remain literal. A fresh build generates Preview/Draft keys and a Server Actions AES key. These values are embedded in server build output. Next exposes a documented build-time override for the Server Actions key, but no supported public override for the Preview key bundle. Stable keys make the bytes reproducible but place secret key material in the image; one shared image also shares those keys between Production and Staging.

`generateBuildId` alone is insufficient. `SOURCE_DATE_EPOCH` alone is insufficient. `rewrite-timestamp=true` alone is necessary but insufficient. A diagnostic-only composite experiment produced byte-identical dual-architecture OCI outputs, but it did so by supplying fixed Synthetic key material and pre-seeding Next's private `.next/cache/.previewinfo` format. That proves causality and feasibility; it does **not** make the private cache format a supported production contract or authorize embedded/shared secrets.

The Technical Lead therefore freezes the noncontroversial deterministic envelope in §4 but does not select a deployable key treatment. Decision `OD-B04-01` in §5 is material to the accepted image-secret and environment-isolation policies. Until an Owner decision is recorded and a decision-aligned amendment passes fresh independent review, S6-04 remains stopped before implementation correction.

No Schema/Migration, data model, SEO/URL, Publish/Index, Cloudmersive, Rate Limiter, database topology, Provider, account or commercial change is proposed.

## 2. Relationship to accepted scope

This document is a narrow overlay on Plan V1.2 S6-04 and its local gate §5.4. It does not edit accepted planning, S6-01 through S6-03 implementation, the dirty S6-04 tree, the S6-03 review-only commit, tags or Git history.

| Accepted contract | Effect of this disposition |
| --- | --- |
| One immutable application image and repeatable digest from identical inputs | Preserved as exact OCI index, per-platform manifest/config/layer equality; no semantic-only substitute. |
| Node `24.14.0`, pnpm `11.9.0`, Debian/glibc base, Supercronic `0.2.48`, frozen install | Preserved; all exact identities remain mandatory. |
| `linux/amd64` and `linux/arm64` | Preserved; both platforms must pass independently and in one ordered OCI index. |
| Next `16.2.12` and accepted bundle/AI gates | Preserved; no alternate bundler, Next patch, gate suppression or test relaxation. |
| One application image selected for all roles | Preserved unless the Owner explicitly chooses an environment-specific image alternative through `OD-B04-01`; no silent split is permitted. |
| No secret in image layers/history | Preserved as the current authority; any exception requires the explicit decision and draft ADR below. |
| Production/Staging secret isolation | Preserved; shared embedded cryptographic keys cannot be reclassified silently. |
| SBOM/license/vulnerability evidence | Preserved and bound to the immutable subject digest in a detached evidence lane; attestations do not redefine the release-image index. |
| O-01–O-25 and X-05/X-06 | Local hook preparation only. No target, protected-environment or Stage 7 proof is claimed. |

The existing Implementer task/worktree may be reused only after a recorded Owner decision and fresh independent review `PASS`. Its uncommitted S6-04 work remains preserved and must not be rebased, committed or edited by this Technical Lead.

## 3. Read-only root-cause diagnosis

### 3.1 Exact inspected state

The read-only dirty tree is based on `de40457e...` and contains only the intended S6-04 scope at inspection time:

- modified `docs/ENVIRONMENT_AND_DEPLOYMENT.md` and `package.json`;
- untracked `.dockerignore`, `Dockerfile`, `compose.yaml` and `deploy/`; and
- no S6-05/S6-06 work.

Decisive inspected hashes include:

| Input | SHA-256 |
| --- | --- |
| `.dockerignore` | `7dd503b46a54394983f38036adc2006765886b20491596cf1f8646e5a4b27c78` |
| `Dockerfile` | `8ea0700eecbf8fae6a8c4718c77aa1128eacb4d1d525f54f94c4696e8863e485` |
| `compose.yaml` | `4f3681052f950571649ab500daef781e92bd870284513a1ac8142428acb0c044` |
| `next.config.ts` | `843756316faf78eb016f57cf50031fe415a0a1ea9bbbecb9789e88722d2a45d0` |
| `package.json` | `fff1fcc134f66cf37e61bc0af23773ead6ed9153ad48b5288ebd0cf5ce9682df` |
| `pnpm-lock.yaml` | `921891ea8fc3083ca348fa47860e853dc405a60ce54e214e553ebac807221974` |
| `pnpm-workspace.yaml` | `f07d2c4f2201a216c7a3ca9cf71005b78cf9fc95e062d71a5aee98df24b5d55e` |

The Dockerfile already pins Node `24.14.0-bookworm-slim@sha256:d8e448a56fc63242f70026718378bd4b00f8c82e78d20eefb199224a4d8e33d8`, pnpm `11.9.0`, both Supercronic `0.2.48` architecture hashes, and performs a frozen install. Its syntax frontend is only tag-selected as `docker/dockerfile:1.20`; build metadata resolved that frontend to `sha256:26147acbda4f14c5add9946e2fd2ed543fc402884fd75146bd342a7f6271dc1d`, so the implementation correction must bind the frontend by immutable identity rather than depend on the tag alone.

The exact local diagnostic toolchain was Docker Buildx `v0.35.0-desktop.2` commit `b554ce1decd8b509893b1e7c6227eabfb923d094`, BuildKit `v0.31.2`, and Docker client/server `29.6.2`. The source timestamp input was `SOURCE_DATE_EPOCH=1788103897` (`2026-08-30T15:31:37Z`). No target host was accessed.

### 3.2 Independent raw reproduction

Two fresh `--no-cache` dual-platform OCI exports from a byte-matched disposable copy, using the Implementer's options (`--provenance=false --sbom=false` and no `rewrite-timestamp`), reproduced the failure:

| Identity | Build 1 | Build 2 | Result |
| --- | --- | --- | --- |
| OCI index | `sha256:c0c66ed6543415b997ab52d9ce64614bd0a32ef07f5dbb77a83d1f86ab3b1541` | `sha256:5e6eab70fae99168a1f746414aa6940fa63996bdf9d8fc09ea62df7d54c5f2dc` | different |
| `linux/amd64` manifest | `sha256:6d4c6e07f2a468304a4d147bf7d48297ad347358949af4d749cc9cea4babbdea` | `sha256:bb4b49dee002b691fca835a3b95c5b78e86a1705a9aa369bdffa5c1624b4aa01` | different |
| `linux/amd64` config | `sha256:47b6e7c463f649b54a242282cfdb6ab98747db529bc8c27ad30336ffb3e154a2` | `sha256:81b29b70e3631670d0420addcf0f0de5d054b1fd92517f9f91901bd879792a16` | different |
| `linux/arm64` manifest | `sha256:cbf1ca29c58957ec20dc81418d7d9a3b470d9892ec7d5cc69f8df7f709afe0b9` | `sha256:37c3014723d9c7f1f1fe89828affb4d3e73ccb3ece6dc4ea006b964d56b37c47` | different |
| `linux/arm64` config | `sha256:cf359405c489ff7b1fbe03bf1e646f0cc303d03e87fcfaeef48f3fd518f063ba` | `sha256:fc0adfb9ec477d437b942b6b39ed1e6af5d119f5861f2f984eeda7bccb8d2076` | different |
| OCI tar SHA-256 | `66539dad68ebf956...` | `8b7cc16e...` | different |

Both indexes used the same `org.opencontainers.image.created=2026-08-30T15:31:37Z`. No provenance/SBOM manifest was attached. Buildx's separate metadata file still described the solve; it was not part of the OCI index.

### 3.3 First causal divergence

The first different layer on both architectures is runtime layer index `5`, the first CWT-created final-stage `RUN` that creates the non-root user/directories:

| Platform | Build 1 compressed layer / diff ID | Build 2 compressed layer / diff ID | Canonical member comparison |
| --- | --- | --- | --- |
| `linux/amd64` | `d72e73be...` / `57e0a854...` | `aad417d3...` / `854c116a...` | same 20 members, contents, uid/gid, mode, link and size; only 13 member mtimes differ |
| `linux/arm64` | `64ddfebc...` / `034f0731...` | `1f8cc236...` / `aaaed3e1...` | same 17 members and contents; only 10 member mtimes differ |

The later Corepack/pnpm/Supercronic copy layers differ for the same metadata reason. This proves `SOURCE_DATE_EPOCH` normalized config/history/index timestamps but did not rewrite image-layer tar entry timestamps. With only OCI exporter `rewrite-timestamp=true`, layers `0` through `8` converged in two fresh `linux/amd64` builds. App layer `9` and final version-assertion layer `10` still differed.

### 3.4 Application-layer divergence

The two raw builds generated different `.next/BUILD_ID` values (`7pzQoDC9yRsVFNcTvbNmG` and `4P_umCqBK1IzsEVoOPEv_`). The ID appeared in 167 files; seven paths differed, including three `.next/static/<BUILD_ID>/...` paths and four content-addressed chunk names. After normalizing the Build ID text, 155 regular-file content differences remained.

The remaining first-order sources were:

- `.next/cache/.previewinfo`: time-dependent `expireAt` plus random Preview ID, signing key and encryption key;
- `.next/cache/.rscinfo`: time-dependent expiry and the Server Actions AES key;
- `prerender-manifest.json`: embedded Preview key bundle;
- `server-reference-manifest.json` and server chunks: embedded Server Actions key and key-dependent action identifiers;
- `.next/trace` and `.next/trace-build`: build-run timing/trace content;
- `node_modules/.modules.yaml`: pnpm `prunedAt`;
- `node_modules/.pnpm-workspace-state-v1.json`: pnpm validation timestamp; and
- `/tmp/node-compile-cache/v24.14...`: nine run-specific compiled-cache blobs produced by the final runtime `node` version assertion.

Next `16.2.12` source confirms that Preview keys use `crypto.randomBytes` and cache expiry uses `Date.now()`. Server Actions uses `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` when supplied, otherwise generates an exportable AES-GCM key and caches it. The only occurrence of `__NEXT_PRIVATE_DETERMINISTIC_BUILD_OUTPUT` in the installed exact package controls whether build-duration text is logged; it does not control artifact entropy.

### 3.5 Diagnostic composite proof and claim ceiling

A disposable, Synthetic-only experiment applied all of the following together:

- explicit validated non-secret release ID through `generateBuildId`;
- `SOURCE_DATE_EPOCH` plus OCI `rewrite-timestamp=true`;
- fixed Synthetic Server Actions key through a BuildKit secret mount;
- fixed Synthetic `.previewinfo` through a BuildKit secret mount;
- deletion of `.next/cache`, `.next/trace`, `.next/trace-build`, the two pnpm timestamp-state files and `/tmp/node-compile-cache` after their owning steps; and
- the same Node/pnpm/base/Supercronic pins and dual architectures.

Two dual-platform builds then produced the same OCI index `sha256:d8453008a35f816631d724b03b7b5cb0d29e10a98e4842e31431e192abc30a8a`; the OCI tar files were byte-identical (`sha256:7e7bc8b0f8d3362f0e7ed58e7ce7650a7521712a622c7123bcf20d12417f869d`). Both used:

- `linux/amd64` manifest `sha256:eaf6f2da9b784e1359a90c1c3bd5f376aa9ff53e68bd078a83e1084212b4b714`, config `sha256:87bc232a9ab9d4c429ce73588a64e80017bebe71746571aeeb6705a5360a6647`;
- `linux/arm64` manifest `sha256:cb476f2840ae4804a49ef8cc05435b91a705a3630935874909198ec50405af46`, config `sha256:b34e43fae397b606d7c8d0c58455569ea01621a2469b09a469b75deea0ed23a1`; and
- exactly 12 ordered layers and identical `rootfs.diff_ids` per platform.

Changing only the Synthetic release identity changed the `linux/amd64` manifest from `sha256:eaf6f2da...` to `sha256:63b593823b0dc3d6f0fa50b21b4ac601ca5c5ab7e49fe1aa8fc56378bd6d77f4`, and the changed image contained exactly the changed `.next/BUILD_ID`. This proves the negative/change-control behavior.

This is causal diagnostic evidence, not S6-04 acceptance evidence. The experiment used Synthetic fixed key material, Next's private cache format, the existing shared BuildKit cache mount and one local builder. The final contract requires clean builder/cache isolation, secret-policy resolution, runtime-role smoke tests, bundle/AI gates, SBOM/scans and independent review.

## 4. Smallest deterministic correction that is already within authority

The following items are selected as one correction envelope, but may be implemented only after this whole amendment is decision-aligned and independently accepted.

| ID | Exact correction and ownership | Required proof | Rollback/stop |
| --- | --- | --- | --- |
| `B04-D1` | `next.config.ts`: add `generateBuildId` that accepts only an explicit non-secret immutable release ID. The release ID is the exact authorized implementation source commit (full lowercase Git object ID), never a branch, timestamp, hostname, username, random value or secret. | Missing/malformed/mismatched ID fails the build; `.next/BUILD_ID` equals the authorized commit; same ID is equal across architectures/runs; deliberate different valid test ID changes BUILD_ID and image identity. | Revert the complete B-04 correction. Never restore random IDs or infer host state. |
| `B04-D2` | `Dockerfile`/build entrypoint: propagate the exact source-commit timestamp as `SOURCE_DATE_EPOCH`; export OCI with `rewrite-timestamp=true`; pin the Dockerfile frontend to the exact reviewed digest; record Buildx/BuildKit/Docker versions and every output option. | All OCI config `created`/history values, index annotations and every unpacked tar member mtime equal the epoch; no unresolved/floating frontend or base material. | Any unsupported exporter, unpinned material or timestamp drift stops. No tool upgrade is inferred. |
| `B04-D3` | `Dockerfile`: remove only non-runtime build residue after its owner runs: `.next/cache`, `.next/trace`, `.next/trace-build`, pnpm's `.modules.yaml` and `.pnpm-workspace-state-v1.json`, and final `/tmp/node-compile-cache`. Prefer deletion over normalization. Do not delete application runtime manifests. | Fresh image starts Web, Worker and Scheduler commands as non-root/read-only; `pnpm ai:runs:process` and each scheduled `pnpm` command resolve without recreating deleted metadata; bundle and AI gates pass. | If a removed file is runtime-required or is regenerated on read-only startup, stop and re-plan the runtime artifact boundary; do not add broad writable mounts. |
| `B04-D4` | Repro harness under the existing `deploy/scripts/` authority and one `package.json` entry: create two byte-identical committed contexts, use two clean/disposable cache states with the same exact builder, run the same ordered platform/options matrix and compare canonical OCI structures and unpacked metadata. No parallel proof framework. | §6 equality contract and negative test pass. Build cache mounts must be absent for the release proof or independently empty and proven identical; `--no-cache` alone does not establish that a mutable cache mount was empty. | Any hidden cache, host path, locale, timezone, VCS dirt, secret or random input stops. |
| `B04-D5` | Build metadata: keep `--provenance=false --sbom=false` on the canonical identity pair so attached attestation manifests cannot redefine the release index. Generate SBOM/provenance/scans in the separate digest-bound evidence lane in §6.4. | Evidence subjects equal the accepted per-platform manifest digests; scanner/tool/generator identities and databases are exact; raw evidence is retained even when timestamps differ. | Missing/stale/floating evidence tooling, a subject mismatch or scan-policy failure blocks. |

`B04-D1` through `B04-D5` do not solve Next key entropy. They must not be landed separately as a claim that B-04 is closed.

## 5. Owner Decision `OD-B04-01` and draft ADR

### 5.1 Decision item

Choose how CWT will reconcile all three current requirements:

1. identical full OCI identity from two fresh builds;
2. no secret in image layers/history; and
3. no Production/Staging secret sharing while using one release image.

Next `16.2.12` has no supported public Preview-key injection or runtime override that satisfies all three. The decision is security/architecture material and cannot be inferred from Stage 6 execution authority.

### 5.2 Options

| Option | Direction | Benefits | Costs/risks | Technical Lead disposition |
| --- | --- | --- | --- | --- |
| **A — HOLD for a supported mechanism** | Preserve all three accepted requirements. Stop S6-04 image closure until an upstream-supported, reviewed Next mechanism or a separately approved architecture change can supply environment-private runtime keys without embedding them. | Strongest baseline fidelity; no private-cache coupling, image-secret exception or shared key. | Stage 6 cannot complete S6-04 now; timing is unknown. | **Recommended default for long-term maintainability and security.** |
| **B — environment-specific immutable images** | Authorize a narrow exception allowing release/environment-scoped Next framework key material in server-only image output. Build Production and Staging images independently, twice each, with separate key bundles. Use the documented Server Actions env input and a version-pinned `.previewinfo` compatibility input. | Smallest operational implementation that preserves cross-environment key separation and exact per-environment reproducibility; no startup mutation. | Replaces the accepted one-image promotion contract with two digests; secrets exist in image blobs; registry/read access becomes key access; Preview injection is a private Next format; rotation/rebuild/recovery become environment-specific. Requires explicit Owner approval and accepted ADR. | Viable only by explicit decision; not recommended over A without a delivery imperative. |
| **C — one deterministic base image plus runtime manifest materialization** | Build with inert deterministic markers, then at container start copy the exact key-bearing server manifests into an environment-private tmpfs and materialize them from mounted secrets before Next starts. | One secret-free base image and separate runtime secrets are theoretically retained. | Custom, version-coupled mutation of private Next output; read-only/startup/rollback complexity; broader test surface; feasibility is not yet production-proved. This is an architecture change and must not be smuggled in as a script. | Rejected for this amendment; would require its own exact design, draft ADR, prototype and review. |
| **D — compare while excluding random files** | Keep random keys and replace exact OCI equality with a semantic/canonical comparison that ignores key-bearing output. | Lowest code change. | Directly weakens the frozen B-04 requirement and permits different release bytes under one claimed identity. | Rejected. |
| **E — deterministic public keys derived from release ID** | Derive keys from non-secret release metadata. | Reproducible and simple. | Makes signing/encryption material predictable; violates key secrecy and separation. | Rejected. |

If the Owner selects B, the decision must explicitly authorize both the image-secret exception and the two-environment-image deviation, require private immutable image storage/access control, separate release key bundles, no key values in Git/logs/metadata/attestations, per-release rotation, and image revocation as credential revocation. The implementation must fail if the exact Next private cache schema changes. A fresh independent security/operations review remains mandatory.

If the Owner selects A, S6-04 remains stopped; no partial deterministic patch is dispatched. If the Owner requests C or another architecture, the Technical Lead must prepare a separate exact design and draft ADR before implementation.

### 5.3 Draft ADR impact record (not accepted)

**Title:** Reproducible Next.js release images and framework cryptographic material

**Status:** DRAFT / decision pending `OD-B04-01`

**Context:** Next generates and embeds build-specific Server Actions and Preview/Draft cryptographic material. Exact OCI reproduction needs stable material; accepted CWT policy forbids secrets in image layers/history and shared environment secrets.

**Decision:** Pending Owner selection in §5.2.

**Affected scope:** `next.config.ts`, root `Dockerfile`, one existing deployment verification authority, application image count/promotion if B, secret custody/rotation, SBOM/provenance redaction, recovery and rollback. No Schema/Migration, public URL, SEO, business data, Cloudmersive, Rate Limiter or database topology impact.

**Compatibility:** Next stays exactly `16.2.12`; Node/pnpm/platform pins and current production behavior remain. Any Next upgrade reopens the exact source/output contract before reuse.

**Rollback:** Roll back only to a separately verified image/config/key bundle. Never reuse a revoked key-bearing image, fall back to a random/untracked build, share an environment key, or weaken digest equality.

## 6. Executable evidence contract after decision alignment

### 6.1 Hermetic inputs and two-run protocol

For each authorized image identity:

1. Start from one clean committed implementation source object. Record commit, tree, sole parent, full diff and `git archive` SHA-256. No dirty/untracked source enters the context.
2. Record exact Dockerfile/frontend/base/package/lock/Corepack/pnpm/Supercronic hashes, Buildx/BuildKit/Docker identities, platform order and exporter options. Do not use a floating image, frontend, tool, package or network download without a checked digest/integrity.
3. Materialize two byte-identical contexts in different disposable directories. Use two clean/disposable builder/cache states or a proved equivalent; run two full `--no-cache` builds with byte-identical material inputs and options. No live target build.
4. Set the same exact authorized release ID and source-commit `SOURCE_DATE_EPOCH`. Any key input permitted by the Owner decision is environment/release-scoped, identical between the two proof runs, supplied only through BuildKit secret mounts and absent from command/history/metadata. A secret mount does not excuse a secret embedded by Next; the selected ADR governs that output explicitly.
5. Export the canonical identity pair as OCI with attached provenance/SBOM disabled and `rewrite-timestamp=true` enabled. Capture sanitized Buildx metadata separately.

### 6.2 Exact equality requirements

Both runs must match exactly at every level:

- OCI tar SHA-256 and canonical `index.json` bytes;
- one ordered OCI index digest and annotations;
- ordered `linux/amd64`, then `linux/arm64` platform descriptors;
- each platform manifest digest/config digest;
- config JSON `created`, `history`, `Env`, `Entrypoint`, `Cmd`, user and `rootfs.diff_ids`;
- ordered compressed layer descriptor digests/sizes/media types and uncompressed diff IDs;
- every unpacked layer member's path, type, content digest, uid, gid, mode, mtime, link target, xattrs and device metadata;
- `.next/BUILD_ID` and every build-ID reference;
- absence of `.next/cache`, `.next/trace`, `.next/trace-build`, pnpm timestamp-state files and `/tmp/node-compile-cache`; and
- absence of source-host absolute paths, usernames, hostname, dirty-state identifiers or undeclared secret values in image config/history/layers.

An equality checker must report the first divergence by platform, layer index, path and field. A top-level digest-only comparison is insufficient.

### 6.3 Negative/change-control and runtime proof

- Build one non-promotable Synthetic control with a deliberately different valid release ID and all other non-secret inputs unchanged. Its `.next/BUILD_ID`, per-platform application layer and final image digest must differ. The control may never overwrite the accepted identity record.
- Run Next `16.2.12` Turbopack `pnpm build`, `check:bundle`, the accepted public/client dependency checks and the accepted AI architecture/full-suite gates with no suppression. GLIDE/native artifacts remain server-only and present for the correct Linux/glibc architecture.
- Start the exact built `linux/amd64` and `linux/arm64` artifacts using the supported local emulation/native matrix. Exercise Web readiness and representative public/admin Server Action behavior; start Worker and Scheduler commands; prove non-root/read-only operation, no recreation of deleted metadata, correct Supercronic/Node/pnpm versions and stopped-dependency fail-closed behavior.
- If an Owner-authorized key path exists, test missing/wrong/cross-environment key refusal, same-release same-environment compatibility, different-release rejection/rotation, rollback with the matching key bundle, and zero key values in logs/Buildx metadata/provenance. Do not use real Production/Staging keys in local proof.

### 6.4 SBOM, provenance and scan evidence

The canonical release index is the reproducibility subject and carries no attached attestation manifests during the equality pair. This does not waive supply-chain evidence.

After equality:

1. Generate an evidence-only OCI index with BuildKit provenance and SBOM enabled, using the same exact source/toolchain/options and an explicitly digest-pinned SBOM generator. A missing generator pin is a stop condition.
2. Prove each attestation subject points to the already accepted per-platform manifest digest. Attestation manifests are evidence, not members of the release-image identity.
3. Preserve raw provenance/SBOM artifacts and their hashes. Compare canonical material/source/package/license/subject sets across the two evidence runs; record but do not erase allowed evidence timestamps and builder-run identifiers. No secret value may appear in either mode; max provenance may not receive secrets as build args.
4. Run the exact-pinned local vulnerability/license scanner against the immutable subject digests under `deploy/host/IMAGE_SECURITY_POLICY.md`; record scanner/version/database age/time and unmodified findings. A stale/unavailable database or threshold failure is non-PASS.

This separation prevents nondeterministic attestation metadata from changing the application image index while retaining complete digest-bound scan evidence.

### 6.5 Stop conditions

Stop and callback on any:

- remaining byte, manifest, config, diff ID, layer, file-content or metadata nondeterminism;
- unsupported/wrong architecture, libc/native package, QEMU-only artifact uncertainty or different platform order;
- unpinned frontend/base/tool/generator/package/download, mutable cache/input or live-target build;
- secret or host identity in an unapproved image/history/config/layer/metadata/attestation location;
- Production/Staging key sharing, missing-key fallback, predictable key, hidden cache seed or unreviewed Next private format;
- runtime failure after cleanup, alternate build, bundle/AI gate failure or suppression;
- attached evidence that does not bind the exact accepted subject digest;
- need for Schema/Migration, another service/sidecar, second application authority, protected environment or external action; or
- any Stage 7 action or claim.

## 7. Conditional implementation slices and gates

| Slice | Scope/dependencies | Verification | Rollback | Independent next gate |
| --- | --- | --- | --- | --- |
| `S6-04/B04-01` deterministic envelope | After Owner decision and amendment `PASS`, modify only `next.config.ts`, `Dockerfile`, the existing deployment verification path and exact script entry needed for §4. Depends on committed S6-04 source and chosen key policy. | Static config tests; missing/invalid release ID; timestamp rewrite; residue absence; exact two-run equality harness dry run. | Revert the whole sub-slice; S6-04 stays blocked. | Build/reproducibility review; no topology acceptance yet. |
| `S6-04/B04-02` decision-specific key boundary | Only the exact Owner-selected and ADR-accepted treatment. No alternative remains live. | §6.3 key isolation/rotation/failure tests, secret scan, Next exact-version guard and recovery proof. | Revert image/config/key bundle together; traffic remains closed if no valid match. | Independent security/operations review. |
| `S6-04/B04-03` full image evidence | Two fresh dual-architecture identity builds; runtime-role/bundle/AI gates; detached SBOM/provenance/scans; update the one image pin/evidence authority. | Every §6 equality/runtime/supply-chain assertion; exact diff; no Migration; clean Candidate. | Retain prior matching validated bundle only; never promote an unknown image. | Fresh independent S6-04 implementation review. |

The current uncommitted Implementer work can be reused after these gates because B-04 is confined to its existing S6-04 ownership. The coordinator must send the accepted decision/amendment delta before resumption. No new Implementer task is technically required, but the current task must remain idle until then.

## 8. Security & Test Simplification Check

The implementer and reviewer must answer all as `yes`:

1. Does one release-build authority replace the ad hoc command without a second image identity path?
2. Are standard Next `generateBuildId` and BuildKit timestamp/export mechanisms used for the parts they actually govern?
3. Are non-runtime caches/traces deleted at their owner rather than normalized through broad post-processing?
4. Is any private Next compatibility input explicit, exact-version guarded and Owner/ADR authorized rather than called a public API?
5. Is there one environment-specific key authority and no shared/fallback/predictable key?
6. Are canonical image identity and detached supply-chain evidence both retained without one weakening the other?
7. Do existing bundle, AI, runtime and deployment checks remain intact, with one narrow first-difference checker instead of a custom proof framework?
8. Are all tests Synthetic/local and all target/Production/Provider/Stage 7 claims absent?

Any `no` blocks the correction.

## 9. Rejected shortcuts

- `generateBuildId` alone;
- `SOURCE_DATE_EPOCH` without `rewrite-timestamp=true`, or timestamp rewriting without controlling application bytes;
- reuse of mutable `.next` or BuildKit caches as the hidden source of stable keys;
- deterministic keys derived from public release metadata;
- custom entropy interception, patched Next package, custom bundler, Webpack fallback, sidecar or HTTP compatibility layer;
- comparing only top-level digests or excluding random files from the equality definition;
- stripping runtime manifests/keys without a supported replacement;
- embedding one shared key bundle in the single Production/Staging image;
- build-gate suppression, ignored failures, stale artifacts, floating tools/images or live-target builds; and
- treating attached SBOM/provenance index drift as permission to omit SBOM/provenance/scans.

## 10. Sequence and terminal boundary

1. A fresh independent Stage 6 planning-amendment reviewer checks this diagnosis, decision classification, evidence contract, exact lineage and sidecars. The Technical Lead does not self-review.
2. The coordinator presents `OD-B04-01` with the review result to the Owner. No option is inferred from silence.
3. A recorded Owner decision is converted into a narrowly decision-aligned Candidate/draft ADR and receives fresh independent review before implementation correction.
4. Only after `PASS` may the coordinator resume the existing Implementer on S6-04. S6-05/S6-06 remain unstarted.
5. Stage 6 acceptance still requires independent implementation review. **After accepted Stage 6, stop. Stage 7 remains HOLD until a new explicit Owner authorization.**

Technical Lead result: **NEEDS_OWNER_DECISION (`OD-B04-01`). This Candidate is ready for fresh independent planning-amendment review of the diagnosis and decision package, not for implementation.**
