# Stage 6 Runtime execution-chain replacement — local implementation V1.0

Recorded: 2026-09-06. Role: Fresh Developer. **LOCAL CANDIDATE; independent Review required. Stage 6 remains Partial / HOLD.**

## Delivery identity and authority

- Exact nonaccepted integration base: `59d349f5be8bfc5ed3e9fc1157158b4140acdd08`.
- Exact implementation head: `e83bcde0d1e3059b21ea05bc1ae43040f5169946` (six permitted source/documentation files). This report is added by a following documentation-only delivery commit; the coordinator callback identifies that final delivery HEAD.
- Isolated branch: `codex/stage6-runtime-chain-replacement`; worktree: `/Users/calvin/.codex/worktrees/4cd0/CWT（CloudWave Textile）项目`.
- Last accepted Product baseline remains `a200838be34c8834a00bdcf6d1819da96e2ad26c`, annotated `refs/tags/phase-1b-stage5-approved-2026-08-30`.
- Authority: coordinator-frozen analyst plan V1.0 Sections 4–6, document commit `5b2f88b4dc70043c47ae6d222dd7a67d557e96cd`, and the owner-convergence document's “Runtime repair contract frozen for local implementation”. No new Owner/ADR decision was needed.

## Root-cause closure and replacement

The workflow previously executed frozen Release scripts, while Runtime required the subject to contain the executing validator and profile. The replacement uses two canonical sibling checkouts: reviewed tools at existing `workflow_commit = GITHUB_SHA`, immutable subject at `release_commit`. Checkout credentials are not persisted and checkout actions do not add global `safe.directory` entries. Both checkout identities/cleanliness are checked before project tooling runs; all host-side script paths are absolute tools paths.

Runtime now requires explicit `--repository` and adds only `--tools-commit`. One `prepareRuntimeInputs` function, called by actual `validate` and executable mixed-revision tests, derives the tools root from the executable, checks both exact clean Git top-level roots with the existing root/SUDO_UID owner bridge, and binds the fixed tracked profile to tools. It checks source/profile/header agreement and outside-source paths before Docker work or evidence creation. Release, OCI, credential directory/file and output cannot reside under either source root. The existing outcome gains only a tools commit/profile-hash object; the Build Once record is unchanged.

Tools own host-side validators and compatibility policy. Subject still owns Compose/project directory, relative binds, proxy ranges and read-only SQL; the immutable image owns application and migration runner. No current Compose/SQL/backup overlay is introduced. The existing reviewed OCI selector and transport-only materializer behavior remain unchanged.

The registry entry adds no-network, no-state `check-release`, reusing `validateReleaseIdentity`. Workflow order is artifact download → header check → pinned ORAS install → login → materialize → sole Runtime authority. README documents the equivalent pre-resource Operator check. `release_identity_mismatch` now reports only the six literal allowlisted field names; no arbitrary key, value, expected/actual pair, raw Error.message or credential is emitted.

Deleted: subject-equals-validator binding, subject-owned profile lookup, cwd fallback, single-checkout workflow execution and obsolete positive same-root/variable-only tests. No alternate validator, persistent coordination state, table, Worker, Lease, Recovery type, retry, classifier or third dispatch pin was added. Source/path branches increase only for the required second identity and exclusions; ownership becomes clearer, while tests replace the disconnected proof with one composed path.

## Verification and failure history

Final combined command: `node --test deploy/scripts/release-registry-integration.test.mjs deploy/scripts/preflight-linux-runtime.test.mjs` — **23 passed, 0 failed, 0 skipped**, Node `24.14.0`.

Decisive executable coverage:

- Actual frozen subject `7e6ef0ad9fd00975da93789421c0d24ec9226e82`, exported through a temporary detached-checkout bundle, with current tools in a separate clean synthetic commit. Tracked tools profile/Compose/SQL deliberately differ from subject bytes. The same Runtime preparation selects tools policy, subject Compose/SQL and the supplied exact image.
- Both roots under root ownership and exact `SUDO_UID=1000` ownership; wrong commit, dirty root, missing/malformed/mismatched sudo owner, different root owner, symlink and subdirectory rejection; global Git ownership policy unchanged.
- Same/nested roots, tools-profile substitution (dirty and clean tracked symlink), missing required CLI inputs, profile override, and release/OCI/evidence/credential paths under either source root are rejected. Symlinked output parents are rejected.
- Actual workflow shell blocks execute both checkout checks and selected tools entrypoints with an older subject. Routing the header step to the old subject fails because that version lacks `check-release`. Actual selected Runtime CLI parsing is exercised; the root/sudo behavior is proved separately in the isolated Linux test.
- Existing `preflight-image.test.mjs` ORAS-shaped fixture generator is reused in memory, changing only its synthetic source identity. A synthetic pinned-ORAS stand-in performs version/descriptor/copy locally. The actual tools materializer succeeds, the actual Runtime invokes the sole full OCI authority successfully, and stops at expected `docker_credentials_unavailable`. The unchanged record, exact release/index and tools/profile identities are checked in the existing outcome. No Product runtime or host setup occurs.
- Header privacy uses malformed fields, an unknown synthetic secret key/value and invalid JSON. The reconciled original index is accepted; the historical V1.10 input yields exactly `["oci.indexDigest"]`, before output creation. PATH and credential locations are unavailable to the no-network CLI test.

Additional checks: four changed `.mjs` files pass `node --check`; focused ESLint syntax/unused-variable checks pass; workflow parses with local `js-yaml 4.3.0`, preserves manual dispatch/two checkout isolation, and all six shell blocks pass `bash -n`; `git diff --check` passes. OCI selector SHA-256 remains `a0fdbe24ac5802ebe09f435c7671a2e32bdf32b9743769d42fce9ee5f4146695`; Compose, SQL and fixed profile content are unchanged from base. Existing unaffected OCI/standalone evidence is reused; no full Product Build/suite was run.

Failures retained: initial combined run was 21/23 (unnamed SHA was insufficient for `git bundle`, and the workflow dirty-root assertion exposed macOS Bash 3.2's loop/errexit behavior). Export now uses temporary detached `HEAD`; checkout refusals explicitly exit, including Git status-command failure. Two subsequent runs were 22/23 because the embedded test probe had newline escaping errors; these were test-source syntax failures before any validator or Product execution. After those fixture corrections, combined runs passed 23/23, including the final run. Local logs remain `/tmp/cwt-runtime-chain-tests.log`, `-2.log`, `-3.log`, `-4.log` and `-final.log` under that common prefix. Python YAML was unavailable; the installed Node YAML parser supplied the completed workflow check without installation or network access.

The isolated test uses the already-local `node:24.14.0-bookworm` image with `--pull never --network none`, read-only source/bundle mounts and no Docker socket. Synthetic fixture ownership changes occur only inside that disposable container. No real CWT image was pulled, rebuilt, published or started.

## Limits, rollback and next gate

The original Build Once record was not retrieved or mutated during implementation. Synthetic header assertions use the frozen reconciled tuple: release/source `7e6ef0ad9fd00975da93789421c0d24ec9226e82`, index `sha256:89e04e7201694e6f202c71cceb368622cc2d584136a7eedfaee9044a45023e8a`. Run `33709304781`, artifact `9876610372` and the incorrect historical V1.10 input remain preserved evidence.

External Validation Required remains: native Tencent host behavior, live GHCR custody/availability and finite artifact retention, real exact-image Product Runtime, teardown/VM destruction and protected-environment readiness. No Push, Registry write/retag, release mutation, rebuild, VM/token/Runner/TAT/workflow dispatch, production credential, formal data or deployment action occurred. Backup work remains separate and is not overlaid onto the immutable subject.

Rollback the local implementation commit to return to the preserved nonaccepted Stage 6 base/HOLD; accepted Product refs and original Release stay unchanged. There is no schema/data/URL rollback. Next gate: a separate fresh independent execution-chain Review of this delivery and its composed tests. This report is not independent PASS, Stage 6 acceptance or authority for an external attempt.
