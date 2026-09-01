# CWT Phase 1B Stage 6 — S6-05 Dependency Custody and Failure-Classification Remediation Implementation Report V1.0

Date: **2026-09-01**

Status: **BOUNDED IMPLEMENTATION CANDIDATE COMPLETE — fresh independent implementation / operations / security Review required**

Role: **Fresh bounded Technical Escalation Implementer; no self-approval**

Evidence manifest: `docs/PHASE_1B_STAGE6_S6_05_DEPENDENCY_CUSTODY_AND_FAILURE_CLASSIFICATION_REMEDIATION_EVIDENCE_MANIFEST_V1_0.md`

## 1. Candidate and authority

| Field | Exact identity |
| --- | --- |
| Starting implementation commit | `fe6e5b057aa7054d42f02f76d31858d3f71be3a9` |
| Starting tree | `c977c129d0076c0e279d8c6f45cc66f461d29d7d` |
| Accepted Review-only sibling | `034a2f3786bfc56d0c75a716c5962cfaa7a37df8` (`PASS`; not an ancestor) |
| Code/test Candidate | `8aebfb50d2ed05132f901026c99cd353ef6294aa` |
| Candidate tree | `c9bb71961fba19e7778acc2701113c6bb692964c` |
| Candidate sole parent | `fe6e5b057aa7054d42f02f76d31858d3f71be3a9` |
| Branch | `codex/stage6-dependency-custody-remediation` |

The Owner authorized only dependency-custody and failure-classification remediation plus one later independent Review. A later delta authorized exactly one public-registry pull of the immutable PostgreSQL fixture and accepted the outer Docker dependency store as a disposable local cache. No other pull, Provider/account/credential action, Build Once, release validation, lifecycle transition, protected-environment action, deployment, S6-06, S6-07 or Stage 7 action was authorized or performed. Stage 7 remains `HOLD`.

The revoked release rooted at `/tmp/cwt-stage6-option-f-release-fe6e5b05-0901a`, its validation evidence and index `sha256:0a2f4651...` remain immutable and ineligible. They were used only for the already-completed read-only diagnosis. This remediation did not validate, modify, restore, transition, promote, rebuild or reuse that subject.

## 2. Outcome and corrected responsibility boundary

The failed validator saved the two dependency images directly by digest-qualified Compose strings and loaded that archive into the private owner. Docker preserved content but not the repository-name associations required by the unchanged root Compose references. The validator opened its subject gate without mechanically proving dependency name, native image, rootfs or complete owner image-set custody. Root Compose then returned `No such image` for PostgreSQL and Valkey, and the failure was incorrectly wrapped as a subject failure that revoked a valid subject.

Candidate `8aebfb50...` replaces that path at the validator boundary:

1. Each exact dependency pin has two explicit identities:
   - immutable source authority: canonical `repository@sha256:index`;
   - unchanged runtime authority: the existing Compose `repository:tag@sha256:index`.
2. The outer disposable cache must first prove the exact index, native arm64 child/platform and complete rootfs identity.
3. Collision-free run-local transfer tags are created under the dependencies' original repositories:
   - `postgres:cwt-<run-token>-postgres`;
   - `valkey/valkey:cwt-<run-token>-valkey`.
4. The tagged identities are rechecked, exactly one standard `docker image save` archives both tags, and every outer transfer tag is removed.
5. The private owner starts with an empty image set, collision-checks the transfer, canonical and unchanged Compose references, then performs exactly one standard `docker image load`.
6. Before gate-open, both the transfer tags and the unchanged Compose references must agree on exact index, native child/platform, rootfs and canonical repository digest. The owner image inventory must contain exactly the two expected dependency image IDs; after release import, it must contain exactly those dependencies plus the exact release image ID.
7. Root Compose remains unchanged and continues to use its exact digest-qualified PostgreSQL/Valkey references with `--pull never --no-build`.
8. Dependency preparation, collision, save, import, missing-name, identity, image-set and topology failures stay before gate-open and cannot revoke a valid subject. A true authenticated `SubjectFailure` after gate-open still revokes. Cleanup-only failures never revoke.
9. Owner dependency transfer tags are removed only after Compose consumers and networks are proven absent. Final owner image inventory must be empty before the private owner is removed.

`gateOpen = true` now occurs only after dependency custody, release identity, normalized root Compose authority and the split-`tmpfs` topology negative have all succeeded, immediately before the first actual CWT subject runtime action: authoritative root Compose `up`.

## 3. Deletion and convergence

The invalid direct call:

```text
docker image save <two digest-qualified dependency references>
docker image load <archive>
```

is deleted. There is no fallback to it and no second dependency importer.

The correction reuses the already accepted Synthetic Alpine/Nginx standard temporary-tag custody pattern and factors its common save/load command plan through one in-file `createImageTransferPlan` helper. Dependency-specific logic is limited to the exact PostgreSQL/Valkey repositories, their immutable pins and their native/rootfs/complete-set proof. No archive-format parser, registry, raw containerd path, persistent cache tag, retry controller or second generic transfer framework was added.

## 4. Outer local-cache disposition and fixture chronology

The outer Docker endpoint is a disposable local dependency cache, not a protected release artifact. After exact source verification and successful archive creation, retaining the original outer repository locator is not a correctness or security invariant. Transfer-tag cleanup may consume the last outer locator; the validator neither requires nor recreates it. Deterministic coverage explicitly proves this accepted behavior.

The exact fixture chronology was:

1. Before restoration, both `postgres:18.4-bookworm@sha256:882236...` and canonical `postgres@sha256:882236...` were absent. Exact Valkey `sha256:f0ba225...` remained present and unchanged.
2. The Owner authorized exactly one pull of:

   ```text
   postgres:18.4-bookworm@sha256:882236b897e39051d2368c5ccc6cda944904723506b2dfc97f2a8f5bc9afa382
   ```

3. Exactly one pull was made, with no retry and no other network fetch.
4. The restored PostgreSQL identity was verified as index `sha256:882236...`, arm64 child `sha256:83b963...`, platform `linux/arm64/v8` and the exact 13-entry rootfs diff-ID list.
5. Valkey remained index `sha256:f0ba225...`, arm64 child `sha256:50e8e85...`, platform `linux/arm64` and the exact seven-entry rootfs diff-ID list.
6. The later bounded challenge removed its run-local outer tags after the successful single save. That cleanup consumed the restored PostgreSQL cache locator again, which is permitted under the accepted disposable-cache boundary. No second pull was attempted.

## 5. Real-Docker evidence and explicit limitation

The bounded post-Candidate challenge positively established only this outer portion:

- exact PostgreSQL and Valkey source index/native/rootfs inspection passed;
- both run-local same-repository tags were collision-free and identity-equal to their sources;
- exactly one two-tag dependency archive save completed; and
- both outer transfer tags were removed with zero tag residue.

The ad hoc challenge then used `docker cp` to place the archive in a disposable DIND controller. The controller-local Docker CLI failed before owner load with:

```text
open /tmp/dependencies.tar: no such file or directory
```

The challenge therefore did not execute the Candidate's owner load/identity path. It is neither a positive end-to-end proof nor a negative Candidate result. It did not reach owner dependency import, owner identity, root Compose, CWT subject runtime or revocation.

The Coordinator accepted this as a non-blocking evidence limitation because:

- the failed path was an ad hoc `docker cp` transport, not the committed validator path;
- the validator continues to use its existing explicit owner-helper bind-mount transport;
- that unchanged owner-helper transport already loaded the dependency archive in the prior real validation; the observed defect there occurred after load and was repository-name loss; and
- Candidate correctness for the newly changed owner name/native/rootfs/image-set gates is covered deterministically, including the original missing-name regression and material mutations.

No second pull or replacement challenge was authorized. This Candidate therefore makes no fresh end-to-end private-owner runtime claim. Independent Review must assess the code, deterministic coverage, the prior proven owner-helper transport boundary and this explicit evidence limit without treating the failed ad hoc transport as Product evidence.

All disposable challenge resources were removed: controller `0`, outer transfer tags `0`, owner containers/references `0` and temporary workspace `0`.

## 6. Deterministic verification

The focused validator suite increased from 34 to 41 tests and proves:

- deterministic same-repository dependency transfer-tag names;
- exact source index/native/rootfs binding before save;
- one save and one load only;
- outer and owner collision refusal;
- accepted consumption of the last outer cache locator;
- unchanged Compose reference resolution in owner fixtures;
- owner tag/runtime-reference agreement;
- complete expected dependency image sets;
- original missing-name refusal before subject runtime;
- wrong index, native architecture, rootfs and extra image refusal;
- zero-consumer owner cleanup and zero image residue;
- pre-gate harness/no-revoke classification, including a misplaced pre-gate `SubjectFailure`; and
- genuine post-gate `SubjectFailure` revocation.

## 7. Gate ledger

| Gate | Result |
| --- | --- |
| Focused validator | **PASS**, 41/41 |
| Deployment suite | **PASS**, 95/95 |
| Full ESLint | **PASS**, zero warnings |
| Strict TypeScript | **PASS** |
| AI Prompt bundle/history | **PASS**, direct verifier plus 24/24 tests |
| AI architecture | Initial invocation correctly failed closed without mandatory `CWT_INSTALLED_NODE_MODULES`; decisive pinned invocation **PASS**, head `8aebfb50...`, 928 candidates, 613 executable nodes |
| Full Vitest | **PASS**, 165 files passed, 11 skipped; 1,260 tests passed, 85 skipped |
| Source Next build | **PASS**, Next `16.2.12`; all routes dynamic |
| Public bundle | **PASS**, 400 eligible server runtime JS files, 20 public manifests, 15 distinct chunks |
| `git diff --check` | **PASS** |
| Exact scope/ancestry | **PASS**; one code commit, two paths, sole parent `fe6e5b05...`; Review-only `034a2f37...` is not an ancestor |
| Schema/package/Compose/Dockerfile/Build Once/lifecycle delta | **0** |

No Build Once or release validator command was invoked. The ordinary source `pnpm build` was a local Next quality gate only and emitted no OCI successor.

## 8. Complexity report

Relative to `fe6e5b05...`, the code/test Candidate changes exactly two paths: 551 insertions and 35 deletions.

- Production/operational persistent complexity: **unchanged**. No table, state, Worker, Lease, queue, service, daemon authority, lifecycle state or cross-process coordination was added.
- Validator-local ephemeral complexity: **increased**. The source file adds 307 net lines to prove two exact dependency identities, custody continuity, complete image-set closure and cleanup; the test file adds 244 lines of deterministic positive/negative coverage.
- Authority complexity: **reduced**. One invalid direct digest-only transfer path is removed. One standard tagged transfer path is authoritative; no dual path or fallback remains.
- Reuse: the existing self-test and dependency transfer plans converge on one standard in-file save/load plan helper.

The increase is proportional to a high-impact release-evidence invariant: a harness-only dependency name-loss failure previously revoked an otherwise valid Build Once subject. The new logic prevents both false revocation and silent owner image-set drift without adding persistent coordination or archive internals.

## 9. Compatibility, rollback and claim ceiling

There is no change to `compose.yaml`, Dockerfile, dependency pins, Build Once, release format, lifecycle transition code, application/Product behavior, secrets, Schema/Migration, AI authority, URL/SEO, Publish/Index, storage or Stage 7 authority.

Code rollback is exact revert of `8aebfb50...` to `fe6e5b05...`. Rollback must never make the revoked index eligible, restore a revocation marker, validate the revoked subject or reinstate the direct digest-only dependency transfer as accepted release evidence.

This Candidate does **not** prove or authorize:

- a fresh end-to-end private-owner dependency load/runtime positive;
- validation, transition, promotion or restoration of any revoked or new CWT subject;
- private Registry/replica/audit behavior;
- protected Staging/Production, real secrets, Provider behavior, deployment, DNS or traffic;
- S6-06, S6-07 or Stage 7.

The only next gate is a fresh independent implementation / operations / security Review of the exact code/test Candidate plus this documentation-only closure. The Implementer does not self-approve or dispatch that Review. Stage 7 remains `HOLD` pending explicit Owner authorization.
