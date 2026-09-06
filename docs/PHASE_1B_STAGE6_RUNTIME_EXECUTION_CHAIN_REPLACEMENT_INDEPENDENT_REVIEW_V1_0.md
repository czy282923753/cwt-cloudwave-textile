# Stage 6 Runtime execution-chain replacement — independent Review V1.0

Recorded: 2026-09-06. Role: Fresh independent execution-chain Reviewer.

**Disposition: PASS for this bounded local repair.** No Blocker, High or policy-qualifying Medium remains; no actionable Low finding was identified. This is not Stage 6 acceptance or authorization for an external attempt. Stage 6 remains **Partial / HOLD**.

## Exact subject and authority

- Base: `59d349f5be8bfc5ed3e9fc1157158b4140acdd08`.
- Implementation: `e83bcde0d1e3059b21ea05bc1ae43040f5169946`.
- Reviewed delivery/tools T: `7e48c72940261ea264fef20d4a54355a4e14a609`; its follow-up changes only the implementation report.
- Immutable Release subject S: `7e6ef0ad9fd00975da93789421c0d24ec9226e82`.
- Last accepted Product remains `a200838be34c8834a00bdcf6d1819da96e2ad26c`; the accepted Stage 5 tag was independently dereferenced to that commit.
- Review checkout: `/Users/calvin/.codex/worktrees/cd4b/CWT（CloudWave Textile）项目`, branch `codex/stage6-runtime-chain-independent-review`, created from exact T. The app's initial unrelated HEAD was not reviewed as the Candidate. The Developer worktree was not modified.

Applied `independent-review/SKILL.md`, root `AGENTS.md`, `docs/ENGINEERING_GOVERNANCE.md`, `docs/REVIEW_POLICY.md`, relevant deployment contracts, and coordinator-frozen Sections 4–6 of `PHASE_1B_STAGE6_RUNTIME_EXECUTION_CHAIN_ROOT_CAUSE_AND_REPAIR_PLAN_V1_0.md` at `5b2f88b4dc70043c47ae6d222dd7a67d557e96cd`. Read the owner-convergence coordination document including its repair freeze and exact Review boundary.

The diff is confined to the six permitted implementation paths and one implementation report. The OCI selector, Compose-graph authority, fixed profile content, Compose, SQL, Build Once, Product, backup, provisioning and registration were not changed by this Candidate.

## Security & Test Simplification Check

**PASS.** Applied delete → merge → standard mechanism → new mechanism in this same Review. The change removes the faulty subject-equals-validator requirement and cwd fallback, reuses `workflow_commit` as the sole tools pin, and shares actual input preparation between Runtime and tests. Header reconciliation reuses the existing identity predicate; full OCI verification retains one authority. The required second checkout adds one explicit source boundary, without a third pin, alternative validator, fallback, persistent state or evidence system. Existing same-root assertions are replaced by executable mixed-revision coverage. The added checks and test cost are proportionate to the demonstrated wrong-executable defect; no deletion or convergence request is necessary.

## Findings and decisive verification

| Boundary | Independent result |
|---|---|
| Actual Workflow selection | T and S are canonical sibling checkouts, checked for exact top-level/HEAD/clean status before project tooling executes. `workflow_commit = GITHUB_SHA`; every host-side project entry uses an absolute tools path and relative imports stay in T. Node 24.14.0 precedes Node commands. Manual dispatch, first attempt, nonce-bound Runner, protected-environment reference and read-only job permissions remain intact. Checkout credential persistence and global safe-directory additions are disabled. |
| Source and profile ownership | Actual `validate` calls `prepareRuntimeInputs`. Both roots use the existing effective-root/SUDO_UID bridge and sanitized Git-only environment. Wrong commit, dirty source, owner mismatch, symlink/subdirectory, non-sibling roots and profile substitution remain refusals. The fixed tracked profile belongs to T; subject Compose/project directory/relative binds/proxy ranges and read-only SQL remain S-owned. Application and Migration runner remain image-owned. No overlay or fallback appears. |
| Early checks and privacy | Actual `check-release` accepts the reconciled header and rejects the historical wrong digest with exactly `["oci.indexDigest"]`, without network, credentials or output state. Malformed fields, unknown synthetic secret key/value and invalid JSON produce safe diagnostics. Runtime rejects header/path/profile/source failures before evidence creation or Docker host work. Release, OCI, credential directory/file and output paths are excluded from both sources. |
| Composed execution | The existing mixed-revision test executes old S with current tools and deliberately different tracked tools profile/Compose/SQL fixture bytes. An additional Reviewer challenge uses **unmodified exact T and S Git checkouts**, executing the actual Workflow shell bodies for Runner binding, header check, materialization and Runtime. Shared preparation selects the intended sources; materialization passes; the sole full OCI authority passes; the true Runtime CLI then stops at expected `docker_credentials_unavailable`. The existing outcome contains exact T/profile hash and S/synthetic index. |
| Integrity challenge | In that same exact-checkout Workflow path, corrupting only the synthetic selected-index blob produces `image_evidence_not_pass`, before host setup. Transport success does not bypass full OCI verification. The synthetic detached record remains byte-identical, and both Git checkouts retain exact clean identities. |

Independently executed:

- `node --test deploy/scripts/release-registry-integration.test.mjs deploy/scripts/preflight-linux-runtime.test.mjs`: **23 passed, 0 failed, 0 skipped**, Node 24.14.0. This includes real isolated Linux Git checks for root and SUDO_UID=1000 ownership, retained identity/privacy negatives, and standard Compose normalization.
- Exact T/S composed challenge described above: **PASS**, including wrong workflow SHA, second attempt and wrong Runner refusals, successful header/materializer/full-OCI composition, and corrupt-OCI refusal.
- Four changed MJS files: Node syntax and focused ESLint checks pass. YAML parses with locally available `js-yaml`; manual dispatch, checkout isolation, environment and read-only permissions were checked. All six Workflow shell bodies pass `bash -n`; `git diff --check` passes.

The Linux tests and Reviewer challenge used cached `node:24.14.0-bookworm` with `--pull never --network none`, read-only source/bundle mounts and no Docker socket. The additional probe reused the existing ORAS-shaped OCI fixture generator with a synthetic source identity; it did not reconstruct the real emitted Release. ORAS descriptor/copy was a local synthetic stand-in. For the exact Workflow Runtime command, only sudo transport was shimmed because the container already ran as root; actual project code/imports were unchanged, and the real Git owner bridge ran with SUDO_UID=1000. This proves local composition, not native sudo policy or provider behavior.

Verification limitations/failures retained: the Reviewer's first ad hoc ESLint configuration omitted Node's `structuredClone` global and reported one no-undef error; declaring that real Node 24 global corrected the configuration, with no Candidate edit or rule suppression. All affected tests, the exact composed challenge, and final syntax/Workflow/lint checks passed. No unrelated Product Build or full Product suite was run.

Transient local evidence: `/tmp/cwt-runtime-independent-review-tests.log`, `/tmp/cwt-runtime-independent-review-composed.log`, and the one-off `/tmp/cwt-exact-chain-review-probe.mjs`. These are Review scratch artifacts, not a new repository gate or evidence authority.

## Reused evidence, external limits and next gate

Reused the unchanged analyst/coordinator provider join for Build run `33709304781`, artifact `9876610372`, Release/source S and original index `sha256:89e04e7201694e6f202c71cceb368622cc2d584136a7eedfaee9044a45023e8a`. No contradiction required another provider read. The original artifact, Build Once record and V1.10 incorrect input remain immutable historical evidence. Local synthetic fixtures do not independently prove their current availability.

**External Validation Required:** native Tencent host/sudo and actual GitHub Actions execution, live GHCR custody/availability and finite artifact retention, real exact-image Product Runtime, teardown/VM destruction, and protected-environment readiness. No CWT image was fetched, built, retagged, published or started; no production credentials, cloud/provider mutation, Push or external attempt occurred.

Separate S6-06 scheduler-mount/shared-Compose changes are outside this exact Candidate. Later integration must select a coherent tools/subject graph and handle any successor image through the explicit integrated Release decision. Unmerged future graph changes do not block this bounded PASS and must not be overlaid onto S.

Next gate: coordinator acceptance of this bounded repair, followed by the separate integrated/external Stage 6 disposition. This Reviewer neither advances the phase nor authorizes a retry. Local rollback of the implementation returns to the nonaccepted base/HOLD; accepted Product and original Release identities remain unchanged.
