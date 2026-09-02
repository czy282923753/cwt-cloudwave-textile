# CWT Phase 1B Stage 6 — Validation Simplification V1.1 F-01/F-02 Bounded Remediation Implementation Report V1.0

Date: **2026-09-02**

Status: **BOUNDED REMEDIATION CANDIDATE COMPLETE — Fresh Independent Re-Review required**

Role: **Remediation Implementer; no self-approval**

Evidence manifest: `docs/PHASE_1B_STAGE6_VALIDATION_SIMPLIFICATION_V1_1_F_01_F_02_BOUNDED_REMEDIATION_EVIDENCE_MANIFEST_V1_0.md`

## 1. Authority and exact candidate

| Field | Exact identity |
| --- | --- |
| Authorized remediation root | `1bd3dc73d2cce70095927d6d9b6d7f880c864e38` |
| Root tree | `888a1804491d45748d78d7c8b94018bdf3953fa7` |
| Failed Review, read-only | `35d3882c779b840ab6ba801754614441265f0a8d` (`FAIL — HOLD`; not an ancestor) |
| Remediation code/test Candidate | `964ee51db1cdd66b60d41cf45fefb93a655206c6` |
| Candidate tree | `ab962b712b04ca3b8a82a680152fee62345e9d1e` |
| Candidate sole parent | `1bd3dc73d2cce70095927d6d9b6d7f880c864e38` |
| Branch | `codex/stage6-validation-simplification-v1-1` |

The failed Review was inspected as evidence only and was not merged or cherry-picked. The remediation commit changes exactly three authorized paths: the native Linux entry, its focused test, and the minimum operator documentation.

## 2. Finding dispositions

### F-01 — non-root services could not read root-owned mode `0400` file secrets

Disposition: **CORRECTED in the Candidate**.

- Root-owned configuration directories remain mode `0700`, preventing host users from traversing `/etc/cwt`.
- `runtime.env` remains root-owned mode `0400` because only the root Compose CLI reads it.
- File-backed secret leaves are root-owned mode `0444`. Docker bind-mounts only the explicitly granted leaf files into each unchanged non-root service, so UID `999:999` PostgreSQL/Valkey and UID `10001:10001` Web can read their mounted secret while the existing Compose allowlists remain the authority for which files each service receives.
- No secret value moved into an environment literal, image, repository file, log, evidence record, alternate secret mechanism, or broader directory mount.

The focused proof checks ownership/mode metadata, standard Unix readability for root and the selected service UIDs, unchanged normalized Compose service UIDs, the root-only `runtime.env` contract, and the exact per-service protected-secret allowlists.

### F-02 — caller-selectable Docker endpoint and compatibility profile

Disposition: **CORRECTED in the Candidate**.

- Every Docker/Compose subprocess is centrally required to use `DOCKER_HOST=unix:///var/run/docker.sock`.
- The entry requires `/var/run/docker.sock` itself to be a Unix socket.
- Caller `DOCKER_*` authority other than the credential-directory path and all caller `COMPOSE_*` state are rejected. `DOCKER_CONTEXT`, TLS selectors, and project selectors cannot survive environment construction.
- Docker CLI endpoint switches (`--context`, `-c`, `--host`, and `-H` forms) are centrally rejected.
- `DOCKER_CONFIG` remains only the future private-Registry credential location; its saved current context cannot override the fixed `DOCKER_HOST`.
- `--profile` was deleted from the accepted CLI contract. Compatibility evaluation always uses the tracked `deploy/runtime-validation/linux-amd64-compatibility.v1.json`, whose real path must equal the path inside the exact clean release checkout.
- Engine/Compose fact capture occurs only after release evidence and clean exact repository identity have passed.

This narrows the existing path; it adds no Docker context framework, alternate endpoint, compatibility authority, persistent state, or coordination mechanism.

## 3. Scope and preserved boundaries

No `compose.yaml`, Dockerfile, workflow, package/lock, Schema/Migration, Product behavior, SEO/URL, storage architecture, Build Once authority, protected-host authority, private DIND implementation, or compatibility-profile data changed. The root Compose topology, non-root service UIDs, file-backed secret allowlists, image verifier, topology verifier, bundle checker, and frozen historical subjects remain unchanged.

Security & Test Simplification Check: **PASS**.

- **Delete/narrow:** caller profile substitution and endpoint selection were removed.
- **Reuse:** the unchanged Compose graph is normalized and checked by the existing authority.
- **Standard mechanism:** one standard local Unix socket plus ordinary Unix file permissions and file bind mounts.
- **No new system:** no state machine, retry loop, validator framework, custody path, secret subsystem, or second authority.

## 4. Verification ledger

| Gate | Result |
| --- | --- |
| Focused Linux entry tests | **PASS**, 10/10 |
| Deployment suite | **PASS**, 105/105 |
| Full ESLint | **PASS**, zero warnings |
| Strict TypeScript | **PASS** |
| AI architecture | **PASS**, 931 candidates / 616 executable nodes |
| Full Vitest | **PASS**, 165 files passed / 11 skipped; 1,260 tests passed / 85 skipped |
| Fresh ordinary source Next build | **PASS**, exact remediation Candidate release ID supplied |
| Public bundle checker | **PASS**, 400 eligible server runtime JS files / 20 public manifests / 15 distinct chunks |
| `git diff --check` | **PASS** |
| Remediation code path set | **PASS**, exactly 3 authorized paths |
| Failed Review ancestry | **PASS**, absent |
| Prohibited implementation/configuration delta | **0** |

One non-decisive focused attempt compared the Web secret allowlist in Compose emission order and failed only on ordering. The assertion was corrected to compare the sets deterministically; no production code or Compose behavior was changed for that test-only correction. The decisive 10/10 run and the full 105/105 deployment suite passed.

The ordinary source build is a source-quality gate only. No OCI Build Once, image publication, external Registry pull, actual Runtime Validation, transition, promotion, Provider action, credential acquisition, or protected-environment action occurred.

## 5. Complexity, rollback, and claim ceiling

Persistent and production complexity remain unchanged. The remediation adds two small pure testable boundaries for Docker environment construction and Unix readability, centralizes local endpoint enforcement in the existing subprocess wrapper, and narrows CLI input. Rollback is an exact revert of `964ee51db1cdd66b60d41cf45fefb93a655206c6` to `1bd3dc73d2cce70095927d6d9b6d7f880c864e38`; doing so restores both reviewed High findings and therefore cannot authorize Runtime Validation.

This Candidate proves only the bounded code correction and Local/Synthetic verification. It does not self-close the failed Review, prove a real Runner, authorize Build Once or Runtime Validation, or advance S6-06, S6-07, or Stage 7.

The only next gate is one **Fresh Independent Implementation / Operations / Security Re-Review** of the exact remediation Candidate plus its docs-only evidence closure. The Implementer does not dispatch that Review.
