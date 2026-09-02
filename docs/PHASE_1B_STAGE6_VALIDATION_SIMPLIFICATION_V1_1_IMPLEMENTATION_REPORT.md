# CWT Phase 1B Stage 6 — Validation Simplification V1.1 Implementation Report

Date: **2026-09-02**

Status: **BOUNDED IMPLEMENTATION CANDIDATE COMPLETE — Fresh Independent Implementation / Operations / Security Review required**

Role: **Stage 6 Validation Simplification Implementer; no self-approval**

Evidence manifest: `docs/PHASE_1B_STAGE6_VALIDATION_SIMPLIFICATION_V1_1_IMPLEMENTATION_EVIDENCE_MANIFEST.md`

## 1. Candidate identity and authority

| Field | Exact identity |
| --- | --- |
| Accepted Stage 6 starting commit | `e105d68d75032e9ba7eb86f4e8479cc09175c821` |
| Starting tree | `b162f125733332e3278c2fd5458398e8a98e050f` |
| Read-only Planning Review | `866a780ac567d84353d25c6af577542a8faedbb3` (`CONDITIONAL PASS`; not an ancestor) |
| Owner-closed PR-M01 | CWT-controlled, VM-backed, single-use ephemeral native `linux/amd64` CI Runner; host Docker; DIND/shared/long-lived runners forbidden |
| Code Candidate | `b053943414cf099313178788b1c30333886c0e54` |
| Candidate tree | `d243b6509ed0e1af1d97e180074fbbf1cc264646` |
| Candidate sole parent | `e105d68d75032e9ba7eb86f4e8479cc09175c821` |
| Branch | `codex/stage6-validation-simplification-v1-1` |

The Candidate changes exactly six implementation/configuration/test/documentation paths. It does not merge or cherry-pick the read-only Planning Review.

## 2. Outcome and corrected responsibility boundary

The repository had no accepted Provider or single-use VM Runner provisioning/destruction baseline. Existing GitHub Actions jobs use `ubuntu-24.04-arm` and cannot realize the Owner-selected formal authority. The implementation therefore stops at the smallest independently executable provider-neutral boundary:

- `deploy/scripts/preflight-linux-runtime.mjs` is the one future native Linux runtime entry;
- `deploy/runtime-validation/linux-amd64-compatibility.v1.json` owns the initial reviewed Runner compatibility profile;
- the enclosing later-authorized CI lifecycle must create and destroy the independent VM and inject one runtime `DOCKER_CONFIG`;
- the repository does not select a Provider, create an account, purchase resources, acquire credentials or claim VM destruction.

This boundary is executable on the Owner-selected Runner class without introducing a workflow, provisioning control plane, account authority or persistent coordination mechanism.

## 3. Singular supported path

The new entry performs one ordered path:

1. Reject caller Docker/Compose authority and require native root execution on Ubuntu 24.04 LTS `linux/amd64` with host Docker Engine.
2. Capture actual OS, architecture, Engine and Compose versions and fail closed unless one reviewed compatibility profile matches. Docker Engine `29.6.2` and Compose `5.3.1` live in the versioned initial profile, not code architecture constants.
3. Accept only `private-registry/repository@sha256:<index>`. Tags, malformed digests, public Docker Hub subjects and transfer-shaped inputs are rejected.
4. Reuse `verifyReleaseRecord` from `preflight-image.mjs` for exact local Build Once evidence/lifecycle verification. Its OCI layout input is read-only evidence and is never loaded or used to transfer the runtime image.
5. Require clean exact release source identity, reject both permanently revoked historical subjects and select only the recorded `linux/amd64` child.
6. Create fresh Synthetic real-shaped `/etc/cwt/*` and `/srv/cwt/*` paths only on a clean single-use Runner, with runtime secret values never emitted.
7. Reuse `validateComposeGraph` from `preflight-compose-graph.mjs` against standard Compose normalization of the unchanged root `compose.yaml`.
8. Pull the CWT subject only from the private Registry by exact index digest. Pinned PostgreSQL and Valkey dependencies are also pulled by their existing digest-qualified references. No save/load, OCI tar, temporary-tag, host-transfer or DIND path exists.
9. Verify exact index, selected `linux/amd64` child, release label and image user; then run the existing `scripts/check-public-bundle.mjs` inside the exact pulled subject with no network and read-only/non-root constraints.
10. Start only PostgreSQL and `valkey-staging`, apply the existing migration set through one disposable `web-staging` Compose run, then start `web-staging`; all use the standard root Compose file, real `runtime.env`, secret mounts and Synthetic storage.
11. Require exact three-service project membership, Docker Health, live/readiness/root `200`, staging noindex, exact release labels, non-root/read-only/capability boundaries and zero published ports.
12. Emit one sanitized `PASS` or `NOT_PASS` record, attempt bounded Compose/network/reference/host-path teardown and leave VM destruction to the enclosing CI lifecycle.

## 4. Failure and historical boundaries

There is no `gateOpen` state, automatic failure classifier, retry/remediation loop, automatic revocation, lifecycle transition, custody system or second runtime authority. Any internal failure becomes `NOT_PASS`; it blocks later transition/promotion but does not classify a Product defect or revoke a digest.

`deploy/scripts/preflight-release-compose.mjs` and its tests were not modified. Private DIND remains exactly **FROZEN / NO FURTHER EVOLUTION**. The new entry neither imports nor invokes it and does not declare it deprecated or remove it. The later state change remains conditional on this implementation, one fresh independent Review `PASS`, one successful real exact-digest Linux Runtime Validation and separate authorization.

The append-only historical addendum records the second subject as:

> pre-container-start Private DIND Harness failure after gateOpen, incorrectly classified as subject failure.

Both historical release/index pairs remain hard-denied in the new entry and permanently revoked.

## 5. Authority convergence and simplification

| Fact | Preserved authority |
| --- | --- |
| Build emission | `deploy/scripts/build-release-once.mjs` unchanged |
| OCI/evidence/lifecycle | `deploy/scripts/preflight-image.mjs` imported and unchanged |
| Compose topology | `deploy/scripts/preflight-compose-graph.mjs` imported and unchanged |
| Public bundle boundary | `scripts/check-public-bundle.mjs` executed directly and unchanged |
| Runtime behavior | new single `preflight-linux-runtime.mjs` entry |
| Protected-host start | `deploy/scripts/preflight-staging.sh` unchanged |

The AI architecture inventory receives only one exact `other-project-tooling` member for the new non-AI entry. No wildcard, capability grant, Provider authority or Production module edge was added.

Security & Test Simplification Check: **PASS**.

- **Delete/retire in the new path:** all tar/save/load/temp-tag/host-transfer/DIND alternatives are absent.
- **Merge/reuse:** existing image, topology and bundle authorities are called directly.
- **Standard mechanisms:** native host Engine, standard Compose, exact digest pull, Docker Health and HTTP probes.
- **New mechanism:** one stateless runner entry plus one versioned compatibility data file; no persistent state or duplicate verifier.

## 6. Verification ledger

| Gate | Result |
| --- | --- |
| Focused Linux entry tests | **PASS**, 8/8 |
| Deployment suite | **PASS**, 103/103 |
| Full ESLint | **PASS**, zero warnings |
| Strict TypeScript | **PASS** |
| AI architecture | **PASS**, Candidate `b0539434...`, 930 candidates / 615 executable nodes |
| Full Vitest decisive stable rerun | **PASS**, 165 files passed / 11 skipped; 1,260 tests passed / 85 skipped |
| Fresh source Next build | **PASS**, exact Candidate release ID supplied to the ordinary source build; no OCI Build Once |
| Public bundle checker | **PASS**, 400 eligible server runtime JS files, 20 public manifests, 15 distinct chunks |
| `git diff --check` | **PASS** |
| Schema/Migration/package/lock/Compose/Dockerfile/workflow delta | **0** |
| Build Once / Registry pull / Runtime Validation / transition / promotion | **0** |

Non-decisive attempts are retained honestly:

- the first full Vitest run identified the new entry as an unclassified AI architecture candidate; the exact non-AI tooling classification was added;
- that still-running first suite then observed the sealed profile while it was being corrected and ended with one source-map JSON read error, so it was not counted as PASS;
- the final stable rerun at the committed Candidate passed completely;
- the first ordinary Next build failed closed because `CWT_RELEASE_ID` was absent; the decisive rerun supplied exact Candidate `b0539434...` and passed. No Build Once was invoked.

## 7. Complexity report

- Persistent production complexity: **unchanged**. No table, state, Worker, Lease, queue, service, daemon, scheduler, transition or cross-process state was added.
- Authority complexity: **reduced for future validation**. One exact-digest native Linux path directly reuses three existing validators; retired transfer mechanics do not enter it.
- Ephemeral runner-local complexity: **increased proportionally** by one 752-line orchestration entry and focused tests. The entry owns only Runner checks, temporary Synthetic host preparation, ordered standard commands, runtime assertions, sanitized outcome and teardown.
- Product behavior, SEO/URL, Publish/Index, storage architecture, authorization, Schema/Migration and protected-host activation: **unchanged**.

Rollback is an exact revert of Candidate `b0539434...` to `e105d68d...`. Rollback cannot restore either historical subject or make Private DIND eligible for new V1.1 evidence.

## 8. Claim ceiling and next gate

This Candidate proves implementation structure and Local/Synthetic checks only. It does **not** prove or authorize Provider selection, account/fee/credential custody, VM provisioning/destruction, private Registry immutability/audit, Build Once publication, image pull, real Runtime Validation, transition, promotion, protected Staging/Production, S6-06, S6-07 or Stage 7.

The only next gate is one **Fresh Independent Implementation / Operations / Security Review** of the exact Candidate plus this docs-only evidence closure. The Implementer does not self-review or dispatch it.
