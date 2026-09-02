# CWT Phase 1B Stage 6 — GitHub / GHCR / Tencent Runner Integration F-01 Remediation Evidence Manifest V1.0

Date: **2026-09-02**

Status: **LOCAL / STATIC / SYNTHETIC REMEDIATION EVIDENCE ONLY — Fresh Independent Re-Review required**

Principal report: `docs/PHASE_1B_STAGE6_GITHUB_GHCR_TENCENT_EPHEMERAL_RUNNER_INTEGRATION_F_01_REMEDIATION_IMPLEMENTATION_REPORT_V1_0.md`

## 1. Exact lineage

```text
512e7a517b81eb68d90d24ed98c2b826595ff2da  integration implementation
└── 6b369e2f2abd3396a0776a721f68e1d448f3a81a  integration docs closure / remediation start
    └── 50fc12fb466a76acf5037f6d84d79dc442784236  F-01 code/test remediation Candidate
        └── documentation-only closure containing this manifest, principal report and adjacent sidecars

e9347b9907e0546154f234e526b7b6740dbf3ed4  failed Review-only evidence; not an ancestor
```

| Field | Exact value |
| --- | --- |
| Starting commit | `6b369e2f2abd3396a0776a721f68e1d448f3a81a` |
| Candidate commit | `50fc12fb466a76acf5037f6d84d79dc442784236` |
| Candidate tree | `d9c467cd218851d8947001ded0ea7c692b746a77` |
| Candidate sole parent | `6b369e2f2abd3396a0776a721f68e1d448f3a81a` |
| Code/test commits after start | `1` |
| Failed Review `e9347b99...` ancestor | `false` |

## 2. Exact implementation scope and hashes

| Path | Pre-fix SHA-256 | Candidate SHA-256 | Delta |
| --- | --- | --- | --- |
| `deploy/scripts/preflight-linux-runtime.mjs` | `62f51e46fbdc1dcbcd81c4c6e34c5b901886a45a5fa3dacdf68ff4b909ea1903` | `97cdf2322aff22035763805ef7dae44d06b50dd264c8de816fac6aa9eacbf6c3` | 74 insertions / 10 deletions |
| `deploy/scripts/preflight-linux-runtime.test.mjs` | `8b73e23255667b878a437e2c71fce5de14d8c3bc82b83843873e5788e5fcf471` | `404f08da364e802c3c7bdacdb7b150727a22a9128f2b3de0f4a35e49e7db06ce` | 155 insertions / 2 deletions |

Total code/test delta: **two paths; 229 insertions; 12 deletions**.

Preserved authority identities:

| Path | SHA-256 |
| --- | --- |
| `.github/workflows/cwt-release-publish.yml` | `b24fedeaeeb92f3f7161f3c123637e639fd4e65ac74a1cfbb09f63d45d462527` |
| `.github/workflows/cwt-runtime-validation.yml` | `4400303e9307c71df0a8e42236c857fa3563f92bf87a9c27501aa7ead09ccfae` |
| `deploy/scripts/build-release-once.mjs` | `8dc86d2db65383eb7eb82d2795bd17e22f900b0aa9a0ac610b22f0c4a47bda5e` |
| `deploy/scripts/preflight-image.mjs` | `159cc7b7501fbc9044ff8964c5af47bfabe6f41b4cb52f272210c870462965ea` |
| `deploy/scripts/release-registry-integration.mjs` | `f8e4b114f8b0693df5763e498df93d5f43d4d04959e2fedd73cbb085e7bc8051` |
| `deploy/scripts/release-registry-integration.test.mjs` | `71ee5ad9f5c590e9fe2a9ca8d0eb7a76933d2b618811d2e903438d8f0af7293d` |
| `deploy/runtime-validation/linux-amd64-compatibility.v1.json` | `5e33bd99e412d35a7e0cffb6a1c379f0decf7f8f816cb087dc162906977514f0` |
| `compose.yaml` | `c94472509c5000aea77611a9f8c9451c2cff2eddffe96e0885b8953031f277e3` |
| `Dockerfile` | `6abe4092df8a271a0c0e4a35ece0e5acc367ccff9245a75d8b19eb0e4f71f783` |
| `package.json` | `6abc2d9288551a4f4fbb37a49985c15c1c673f884b60f3ff680fda938a03ea0d` |
| `pnpm-lock.yaml` | `a56f4762153297db148ffed5a4ef4dfa0e37fd2b495736b58f70e391e1fcdf9e` |
| `scripts/verify-ai-architecture.ts` | `6231c3a2b6266b6292bfc0a89897d92aa5f7414df33d0b1a6df5409b83debea0` |
| `test-fixtures/ai-architecture/graph-faults.phase-d.synthetic-only.v1_0.json` | `a9fab9ff77fa7362fc9c774e3c0e4dd4cacc4b582a0da5250e470597ed20de72` |

No workflow, package/lock, Schema/Migration/Product, Compose, Dockerfile, Build Once, image verifier, compatibility profile or registry-integration authority changed.

## 3. Invariant-to-proof matrix

| Required invariant | Candidate proof |
| --- | --- |
| accepted sudo boundary remains root-only | bridge creation rejects every effective UID other than `0`; existing native-host root gate remains |
| exact standard Git authority | only canonical, validated `SUDO_UID` is used; no `safe.directory`, wildcard or alternate trust |
| exact repository owner | actual canonical root `lstat.uid` must equal canonical non-zero `SUDO_UID` |
| exact repository path | absolute canonical non-symlink input must equal the source root containing the invoked validator |
| missing/malformed/root/out-of-range UID | each fails closed with a typed reason before Git |
| incorrect/different owner UID | mismatch fails closed before Git |
| normal root-owned repository | accepted without `SUDO_UID` only through Git's same-owner behavior |
| exact source commit and cleanliness | unchanged `rev-parse HEAD` and `status --porcelain=v1`; wrong commit and dirty tree negatives pass |
| read-only Git subprocesses | dedicated Git environment sets `GIT_OPTIONAL_LOCKS=0` and is used only twice |
| no SUDO_UID leakage | Docker environment omits it; all Compose/registry/application commands derive from that environment; evidence schema is unchanged |
| global ownership policy unchanged | network-disabled root probe compares global `safe.directory` state before/after and observes exact equality |
| no path substitution | symlink and arbitrary repository probes fail closed |

## 4. Pre-fix and post-fix cross-UID evidence

The pre-fix proof ran before source modification in the already-present `node:24.14.0-bookworm` image with `--network none`:

| Case | Result |
| --- | --- |
| owner UID `1000`, root Git, no `SUDO_UID` | exit `128`; dubious ownership |
| same repository, root Git, `SUDO_UID=1000` | exit `0`; exact HEAD |

The committed post-fix focused probe uses the same local image with `--pull never --network none` and directly invokes the Candidate's `verifyRepositoryIdentity` function as root:

| Case | Result |
| --- | --- |
| owner UID `1000`, `SUDO_UID=1000`, exact clean commit | `PASS` |
| wrong commit / dirty worktree | `source_identity_mismatch` / `source_identity_mismatch` |
| missing / malformed / root origin | `source_owner_bridge_missing` / `source_owner_bridge_invalid` / `source_owner_bridge_invalid` |
| incorrect UID / different owner | `source_owner_bridge_mismatch` / `source_owner_bridge_mismatch` |
| symlink / arbitrary repository | `repository_invalid` / `repository_source_mismatch` |
| root-owned repository, bridge absent | `PASS` under normal ownership |
| global `safe.directory` before vs after | unchanged |

The test output contains only PASS labels and typed reason codes. It does not emit the accepted UID, caller environment, credentials or repository contents.

## 5. Decisive verification ledger

| Verification | Result |
| --- | --- |
| Linux Runtime focused suite | PASS, 12/12 |
| Registry integration + Linux Runtime focused suites | PASS, 18/18 |
| Deployment suite | PASS, 113/113 |
| Full ESLint | PASS, zero warnings |
| Strict TypeScript | PASS |
| AI architecture, exact installed dependency locator | PASS; `ok: true`; head `6b369e2f...`; 933 candidates / 618 executable nodes |
| `git diff --check` before code commit | PASS |
| Exact two-path / one-commit code scope | PASS |
| Failed Review ancestry exclusion | PASS |

The first direct AI architecture invocation without `CWT_INSTALLED_NODE_MODULES` failed closed on its existing prerequisite. The decisive invocation was otherwise unchanged and passed after binding the current worktree's exact `node_modules` directory. No verifier or fixture was edited.

Independent Re-Review may reproduce the core gates with:

```text
git rev-parse 50fc12fb466a76acf5037f6d84d79dc442784236^{tree}
git rev-parse 50fc12fb466a76acf5037f6d84d79dc442784236^
git diff --name-status 6b369e2f2abd3396a0776a721f68e1d448f3a81a..50fc12fb466a76acf5037f6d84d79dc442784236
git merge-base --is-ancestor e9347b9907e0546154f234e526b7b6740dbf3ed4 50fc12fb466a76acf5037f6d84d79dc442784236
node --test deploy/scripts/preflight-linux-runtime.test.mjs
node --test deploy/scripts/release-registry-integration.test.mjs deploy/scripts/preflight-linux-runtime.test.mjs
pnpm test:deployment
pnpm lint
pnpm typecheck
CWT_INSTALLED_NODE_MODULES='<absolute-current-worktree>/node_modules' pnpm check:ai-architecture
```

The failed-Review ancestry command must exit `1`; every identity, scope and quality command must pass.

## 6. External-action and claim ceiling

No Provider/API call, credential use, paid resource, workflow dispatch, GitHub Environment change, Runner provisioning, Build Once, GHCR package creation, registry push/pull, Runtime Validation, transition, promotion, deployment, S6-06, S6-07 or Stage 7 action occurred.

This manifest proves only the bounded F-01 code/test correction and Local/Static/Synthetic evidence. Actual GitHub, GHCR and Tencent prerequisites remain exactly as recorded by the original integration report. The failed Review remains immutable read-only evidence.

The next gate is **exactly one Fresh Independent Implementation / Operations / Security Re-Review** of the exact Candidate and docs-only closure. If it is not `PASS`, the coordinator must `HOLD`. This Implementer does not dispatch Review or advance any release/stage.
