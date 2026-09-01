# CWT Phase 1B Stage 6 — S6-05 Dependency Custody and Failure-Classification Remediation Evidence Manifest V1.0

Date: **2026-09-01**

Status: **LOCAL / DETERMINISTIC CANDIDATE EVIDENCE — fresh independent implementation / operations / security Review required**

Principal report: `docs/PHASE_1B_STAGE6_S6_05_DEPENDENCY_CUSTODY_AND_FAILURE_CLASSIFICATION_REMEDIATION_IMPLEMENTATION_REPORT_V1_0.md`

## 1. Evidence and claim boundary

This manifest binds the exact two-path code/test Candidate and its proportionate non-network repository gates. It records a partial real-Docker outer transfer proof and an explicit pre-load ad hoc DIND transport limitation. It does not claim a fresh end-to-end owner load/root-Compose positive, accept the Candidate, authorize a release transition or authorize Stage 7.

The revoked release root, validation evidence and index `sha256:0a2f4651...` remain immutable and ineligible. No Build Once, release validation, revocation, transition, promotion, restoration or reuse occurred in this remediation.

## 2. Exact lineage

```text
fe6e5b057aa7054d42f02f76d31858d3f71be3a9  accepted implementation checkpoint
└── 8aebfb50d2ed05132f901026c99cd353ef6294aa  dependency custody / classification code+test Candidate
    └── documentation-only evidence closure containing this manifest, principal report and two adjacent sidecars

034a2f3786bfc56d0c75a716c5962cfaa7a37df8  accepted Review-only sibling; not an ancestor
```

| Field | Exact value |
| --- | --- |
| Starting tree | `c977c129d0076c0e279d8c6f45cc66f461d29d7d` |
| Candidate tree | `c9bb71961fba19e7778acc2701113c6bb692964c` |
| Candidate sole parent | `fe6e5b057aa7054d42f02f76d31858d3f71be3a9` |
| Code/test commits after baseline | `1` |
| Review-only `034a2f37...` ancestor | `false` |

## 3. Exact implementation scope and hashes

| Path | SHA-256 | Delta |
| --- | --- | --- |
| `deploy/scripts/preflight-release-compose.mjs` | `7c0fd690abd369e357dfbf4eec222145320276db473a028682921beda5be0f51` | 307 insertions / 35 deletions |
| `deploy/scripts/preflight-release-compose.test.mjs` | `3620725c58b0e28992f254c300101027bf92ea5ff14055449238a24c0d37287a` | 244 insertions / 0 deletions |

Total code/test delta: **2 paths; 551 insertions; 35 deletions**.

No Schema, Migration, package, lockfile, workspace, Compose, Dockerfile, Build Once, image verifier, application, Product, release record, transition or revocation path changed.

The documentation-only closure adds exactly:

```text
docs/PHASE_1B_STAGE6_S6_05_DEPENDENCY_CUSTODY_AND_FAILURE_CLASSIFICATION_REMEDIATION_IMPLEMENTATION_REPORT_V1_0.md
docs/PHASE_1B_STAGE6_S6_05_DEPENDENCY_CUSTODY_AND_FAILURE_CLASSIFICATION_REMEDIATION_IMPLEMENTATION_REPORT_V1_0.md.sha256
docs/PHASE_1B_STAGE6_S6_05_DEPENDENCY_CUSTODY_AND_FAILURE_CLASSIFICATION_REMEDIATION_EVIDENCE_MANIFEST_V1_0.md
docs/PHASE_1B_STAGE6_S6_05_DEPENDENCY_CUSTODY_AND_FAILURE_CLASSIFICATION_REMEDIATION_EVIDENCE_MANIFEST_V1_0.md.sha256
```

## 4. Exact dependency identities

| Dependency | Immutable index | Native child / platform | Rootfs proof |
| --- | --- | --- | --- |
| PostgreSQL `18.4-bookworm` | `sha256:882236b897e39051d2368c5ccc6cda944904723506b2dfc97f2a8f5bc9afa382` | `sha256:83b9631dbb4121d9235ef910018272798b7d3041ef5b716aa481122d4c49353f` / `linux/arm64/v8` | exact 13 ordered diff IDs |
| Valkey `8.1.9` | `sha256:f0ba225266310efba5fb33383e21c64fbd07907304224786c780606e7ebd7327` | `sha256:50e8e85f91d18480a262ca8fe6ee296945c5f00ee73a966da823de44ae54e2b4` / `linux/arm64` | exact seven ordered diff IDs |

The committed validator derives and binds the complete ordered rootfs arrays from the immutable outer source before save and requires exact equality for both transfer tags and unchanged owner Compose references.

## 5. Authorized pull chronology

| Check | Result |
| --- | --- |
| Exact PostgreSQL tag@digest before pull | absent |
| Canonical PostgreSQL repository@digest before pull | absent |
| Exact Valkey before pull | present and unchanged |
| Authorized PostgreSQL pull count | exactly `1` |
| Pulled reference | exact tag@digest `postgres:18.4-bookworm@sha256:882236...` |
| Floating/other pull | `0` |
| PostgreSQL post-pull index/native/rootfs | exact PASS |
| Valkey post-pull index/native/rootfs | exact unchanged PASS |
| Second pull after cache consumption | `0` |

The outer cache locator may disappear after successful save and transfer-tag cleanup. This is accepted local-cache consumption and is not release evidence or a protected-artifact loss.

## 6. Deterministic custody and classification evidence

The focused 41-test suite proves:

| Required behavior | Deterministic result |
| --- | --- |
| Original dependency missing-name regression | rejected before runtime; `harness_pre_gate`; `revoke: false` |
| Outer/owner transfer/reference collisions | every exact collision rejected |
| Wrong index digest | rejected |
| Wrong native architecture/platform | rejected |
| Wrong ordered rootfs | rejected |
| Extra/missing dependency owner image | rejected by complete image-set gate |
| Outer transfer | exact two run-local same-repository tags; one save; all tags removed |
| Outer cache last-locator consumption | accepted after successful save; no persistent fallback tag |
| Owner transfer | one load in command/behavior coverage; unchanged Compose references required |
| Owner cleanup | only after zero consumers; transfer/canonical/Compose refs absent; empty image set |
| Pre-gate `SubjectFailure` wrapper | classified harness/no-revoke |
| Post-gate genuine `SubjectFailure` | classified subject/revoke |
| Cleanup-only failure | harness cleanup/no-revoke |

## 7. Real-Docker evidence limitation

### Positively observed

- exact PostgreSQL/Valkey source index/native/rootfs binding;
- collision-free run-local same-repository tags;
- tagged identity continuity;
- exactly one dependency archive save; and
- complete outer transfer-tag cleanup.

### Not observed in the fresh challenge

The ad hoc DIND transport used `docker cp`; before owner load the controller-local CLI reported:

```text
open /tmp/dependencies.tar: no such file or directory
```

Consequently the challenge provides no fresh owner-load, owner-identity, unchanged-Compose-reference runtime or root-Compose positive. It also provides no negative Candidate result because the Candidate's owner-helper bind-mount load path was not executed.

The unchanged owner-helper transport had already loaded the dependency archive in the prior real release validation. Candidate `8aebfb50...` changes the names and post-load gates around that proven transport, not the transport itself. The Coordinator accepted deterministic owner-side coverage plus that unchanged prior transport evidence as proportionate for independent Review. No rerun or replacement challenge occurred.

Disposable resource result: controller `0`; outer transfer tags `0`; owner references/containers `0`; workspace `0`.

## 8. Repository gate ledger

| Gate | Exact result |
| --- | --- |
| Focused release-compose validator | PASS, 41/41 |
| Deployment suite | PASS, 95/95 |
| Full ESLint | PASS, zero warnings |
| Strict TypeScript | PASS |
| AI Prompt direct verifier | PASS |
| AI Prompt/history tests | PASS, 24/24 |
| AI architecture decisive pinned invocation | PASS; `ok: true`; head `8aebfb50...`; 928 candidates; 613 executable nodes |
| Full Vitest | PASS; 165 files passed, 11 skipped; 1,260 tests passed, 85 skipped; duration `550.45s` |
| Source Next build | PASS; Next `16.2.12`; all routes dynamic |
| Public bundle | PASS; 400 eligible server runtime JS; 20 public manifests; 15 distinct chunks |
| Candidate and cumulative `git diff --check` | PASS |
| Exact clean committed code checkpoint | PASS |
| Exact two-path scope / one-commit ancestry | PASS |
| No Schema/package/Compose/Dockerfile/Build Once/lifecycle delta | PASS |

The first direct AI architecture invocation omitted its mandatory installed-dependency locator and correctly failed closed. The decisive unchanged invocation bound `CWT_INSTALLED_NODE_MODULES` to the exact current worktree `node_modules` directory and passed. No verifier or profile was changed.

The source Next build used local PGlite state under a new disposable temporary root and `CWT_RELEASE_ID=8aebfb50...`; that root was removed. It was not Build Once and emitted no OCI subject.

## 9. Reproduction commands and review stop conditions

Independent Review may begin with:

```text
git rev-parse 8aebfb50d2ed05132f901026c99cd353ef6294aa^{tree}
git rev-parse 8aebfb50d2ed05132f901026c99cd353ef6294aa^
git diff --name-status fe6e5b057aa7054d42f02f76d31858d3f71be3a9..8aebfb50d2ed05132f901026c99cd353ef6294aa
git merge-base --is-ancestor 034a2f3786bfc56d0c75a716c5962cfaa7a37df8 8aebfb50d2ed05132f901026c99cd353ef6294aa
node --test deploy/scripts/preflight-release-compose.test.mjs
pnpm test:deployment
pnpm lint
pnpm typecheck
CWT_INSTALLED_NODE_MODULES='<absolute-current-worktree>/node_modules' pnpm check:ai-architecture
```

The Review-only ancestry command must exit `1`; the identity, scope and applicable gate commands must pass.

Review must stop on any Candidate/tree/parent mismatch, scope expansion, restored direct digest-only dependency path, transfer fallback, owner image-set ambiguity, pre-gate revocation, post-gate subject no-revoke, transfer-tag residue, cache-retention mechanism, raw containerd/archive-parser authority, claim that the ad hoc failed DIND transport is a fresh owner positive, use of the revoked subject, or Stage 7 authority claim.

The next gate is a **fresh independent implementation / operations / security Review**. This manifest is not acceptance. Stage 7 remains `HOLD`.
