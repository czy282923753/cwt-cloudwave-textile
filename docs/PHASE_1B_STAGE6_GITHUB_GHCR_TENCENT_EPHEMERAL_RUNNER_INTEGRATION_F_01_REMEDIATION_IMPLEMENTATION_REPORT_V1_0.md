# CWT Phase 1B Stage 6 — GitHub / GHCR / Tencent Runner Integration F-01 Remediation Implementation Report V1.0

Date: **2026-09-02**

Status: **BOUNDED F-01 REMEDIATION CANDIDATE COMPLETE — exactly one Fresh Independent Implementation / Operations / Security Re-Review required**

Role: **Implementer; no Review or self-approval**

Evidence manifest: `docs/PHASE_1B_STAGE6_GITHUB_GHCR_TENCENT_EPHEMERAL_RUNNER_INTEGRATION_F_01_REMEDIATION_EVIDENCE_MANIFEST_V1_0.md`

## 1. Authority and exact Candidate

| Field | Exact identity |
| --- | --- |
| Integration implementation | `512e7a517b81eb68d90d24ed98c2b826595ff2da` |
| Integration docs closure / remediation start | `6b369e2f2abd3396a0776a721f68e1d448f3a81a` |
| Failed Review-only evidence | `e9347b9907e0546154f234e526b7b6740dbf3ed4` (`FAIL`; immutable, read-only and not an ancestor) |
| F-01 code/test Candidate | `50fc12fb466a76acf5037f6d84d79dc442784236` |
| Candidate tree | `d9c467cd218851d8947001ded0ea7c692b746a77` |
| Candidate sole parent | `6b369e2f2abd3396a0776a721f68e1d448f3a81a` |
| Branch | `codex/stage6-validation-simplification-v1-1` |

The failed Review was read from its Git object only. It was not cherry-picked, edited, superseded in place or admitted to implementation ancestry. This remediation changes exactly the Linux Runtime validator and its focused test.

## 2. F-01 root cause and pre-fix reproduction

The Runtime workflow checks out the exact repository as the non-root self-hosted Runner user, then invokes the accepted validator with `sudo`. The validator deliberately reconstructed a root-only child environment for Docker and reused that same environment for its `git rev-parse HEAD` and `git status --porcelain=v1` source checks. Because the reconstructed environment omitted `SUDO_UID`, Git running as root no longer recognized the Runner-owned checkout and rejected it as dubious ownership.

Before changing the source, the exact accepted Developer HEAD `6b369e2f...` was reproduced in the already-present `node:24.14.0-bookworm` image with networking disabled. A self-contained repository was committed and recursively assigned to UID `1000`:

| Pre-fix case | Decisive result |
| --- | --- |
| root, repository owner UID `1000`, sanitized `HOME=/root`, `SUDO_UID` absent | exit `128`; `dubious ownership` observed |
| same root process/repository, canonical `SUDO_UID=1000` | exit `0`; exact HEAD returned |

No external image pull was needed for the decisive proof and no Provider, GitHub API, GHCR or Runtime action occurred.

Git documents that repositories owned by another user are refused by default and that root may additionally trust the UID placed in `SUDO_UID` by `sudo`: [Git `safe.directory` documentation](https://git-scm.com/docs/git-config#Documentation/git-config.txt-safedirectory).

## 3. Corrected responsibility and trust boundary

The correction keeps the existing root/native-host/Docker socket Runtime boundary and introduces no second trust mechanism:

1. The repository input must be one canonical absolute, non-symlink directory and must equal the canonical repository containing the invoked validator. An arbitrary `--repository`, lexical alias, symlink or substituted checkout cannot establish authority.
2. The Git bridge requires effective UID `0`. For a non-root-owned checkout, `SUDO_UID` must be a canonical non-zero decimal Linux UID and must exactly equal the actual UID returned by `lstat` for the canonical repository root.
3. Missing, malformed, root, out-of-range or owner-mismatched `SUDO_UID` fails closed before Git is invoked.
4. A root-owned canonical repository with no `SUDO_UID` remains valid only through Git's normal same-owner behavior.
5. The validated UID is copied only into a dedicated Git child environment used by the exact read-only `rev-parse` and `status` commands. `GIT_OPTIONAL_LOCKS=0` prevents optional index writes.
6. Docker, Compose, registry, application and cleanup subprocesses continue to derive from the unchanged sanitized Docker environment, which does not contain `SUDO_UID`.

No `safe.directory` entry is read as new authority, written, broadened or persisted. There is no wildcard, global/system/local Git mutation, `chown`/`chmod` of the checkout, root copy, alternate checkout, archive handoff, workflow change or host configuration.

The exact commit and clean-worktree checks remain present and are now directly exercised for both wrong-commit and dirty-worktree negatives.

## 4. Security proof

The focused test runs the committed bridge inside a root process in the local, network-disabled Node image against self-contained repositories with explicit UID ownership. It proves:

- matching UID `1000` succeeds and returns the exact clean commit;
- absent, malformed, root and incorrect sudo-origin UIDs fail with typed fail-closed reasons;
- a repository owned by a different UID fails before Git trust is granted;
- symlink repository input and an arbitrary caller-selected repository fail;
- wrong release commit and dirty worktree remain rejected;
- a root-owned repository without the bridge succeeds only under normal Git ownership;
- Git global `safe.directory` state is byte-for-byte unchanged before and after the probe; and
- the bridge environment contains no Docker config, GHCR token or caller environment, while the Docker environment contains no `SUDO_UID`.

Failure messages and the Runtime evidence schema record only bounded reason codes; they do not record `SUDO_UID` or credential values. No new evidence field or log surface was added.

## 5. Security & Test Simplification Check and complexity

Result: **PASS for the implementation role; independent Re-Review remains required**.

- **Root Cause First:** the incorrect environment reuse at the sudo/Git boundary was corrected directly.
- **Simplification:** one existing sanitized base is reused; one narrow Git-only environment adds the documented bridge. No wrapper service or persistent policy was created.
- **Replace, not layer:** the former Git calls using `dockerEnv` were replaced. There is no dual Git identity path or fallback.
- **Persistent complexity:** unchanged. No table, state, Worker, Lease, queue, credential store, cloud manager or host configuration was added.
- **Validator-local complexity:** increased by canonical-path/UID validation and adversarial proof, proportional to a Blocker that otherwise makes every supported Runtime dispatch fail before validation.

The code/test commit contains **229 insertions and 12 deletions across two paths**. The production file accounts for 74 insertions / 10 deletions; tests account for 155 insertions / 2 deletions.

## 6. Verification ledger

| Gate | Result |
| --- | --- |
| Linux Runtime focused suite | **PASS**, 12/12 |
| Registry integration + Linux Runtime focused suites | **PASS**, 18/18 |
| Complete deployment suite | **PASS**, 113/113 |
| Full ESLint | **PASS**, zero warnings |
| Strict TypeScript | **PASS** |
| AI architecture with required installed-dependency locator | **PASS**, 933 candidates / 618 executable nodes |
| `git diff --check` | **PASS** |
| Code/test scope | **PASS**, exactly two paths and one commit |
| Failed Review in Candidate ancestry | **false** |
| Workflow, package/lock, Schema/Migration/Product, Compose/Dockerfile delta | **0** |
| Build Once, image verifier, compatibility profile, registry integration authority delta | **0** |
| Provider/API, credentials, paid resource, Build Once, registry push/pull, Runtime Validation | **0** |

The first direct AI architecture invocation omitted its mandatory `CWT_INSTALLED_NODE_MODULES` prerequisite and correctly failed closed. The decisive invocation bound the exact current worktree `node_modules` directory and passed. No AI verifier, profile or fixture changed.

Full Product Vitest and Next build were not repeated because application/Product source, dependencies, package/lock, Schema/Migration, Compose, Dockerfile and Build Once are unchanged. The focused cross-UID proof, full deployment suite, lint, type and AI gates are proportional to this validator-only correction.

## 7. Compatibility, rollback and claim ceiling

The Runtime workflow is byte-identical. The normal supported contract remains: checkout as the non-root Runner service user, then invoke the formal validator through `sudo --preserve-env=DOCKER_CONFIG`. Standard `sudo` supplies `SUDO_UID`; the validator now checks it rather than forwarding it generally.

Rollback is the exact revert of `50fc12fb466a76acf5037f6d84d79dc442784236` to `6b369e2f2abd3396a0776a721f68e1d448f3a81a`. It changes no external state, but would reopen F-01 and therefore must not be treated as an executable Runtime Candidate.

This remediation does not prove or authorize GitHub Environment configuration, GHCR state, Tencent identity/provisioning/registration/destruction, actual Build Once, registry push/pull, Runtime Validation, transition, promotion, deployment, S6-06, S6-07 or Stage 7.

The only next gate is **exactly one Fresh Independent Implementation / Operations / Security Re-Review** of code/test Candidate `50fc12fb...` plus the docs-only closure. If that Re-Review is not `PASS`, the coordinator must `HOLD`. The Implementer does not dispatch it.
