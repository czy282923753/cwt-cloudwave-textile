# CWT Phase 1B Stage 6 — Source and Documentation Authority Convergence Implementation Report V1.0

Date: **2026-09-05**

Status: **RW-003 AND TC-P1-001 IMPLEMENTATION COMPLETE; RW-004 PLANNING COMPLETE ONLY — fresh independent Review required; Stage 6 remains Partial / HOLD**

Evidence manifest: [PHASE_1B_STAGE6_SOURCE_AND_DOCUMENTATION_AUTHORITY_CONVERGENCE_EVIDENCE_MANIFEST_V1_0.md](./PHASE_1B_STAGE6_SOURCE_AND_DOCUMENTATION_AUTHORITY_CONVERGENCE_EVIDENCE_MANIFEST_V1_0.md)

Authority boundary: **Local isolated-worktree convergence and verification only. No Push, PR, remote ref/tag movement, Build Once, Registry mutation, artifact download requiring credentials, GitHub workflow dispatch, token generation, Tencent/cloud action, VM/Runner creation, Provider call, Deploy, DNS, protected Staging/Production, formal data, Publish, Index, S6-06, S6-07, Stage 7 or Stage 8 action occurred or is authorized by this report.**

## 1. Outcome and exact Candidate lineage

The implementation/documentation Candidate is `67f42e739a120253a4d0ef979550ea55fb0088d0`, tree `883fac551020273744fe65bde33255d574b3a544`, on local branch `codex/stage6-source-doc-authority-convergence-v1`.

| Boundary | Exact identity and disposition |
| --- | --- |
| Latest accepted baseline | commit `a200838be34c8834a00bdcf6d1819da96e2ad26c`; tree `00438c32997f9be7d753dfca8325c1765bd90146` |
| Accepted tag | annotated `refs/tags/phase-1b-stage5-approved-2026-08-30`; tag object `ba8edc69623099a1c22d3be5c5b4fd72a2b1a988`; unchanged |
| Published Stage 6 inventory | `origin/main` `506d92bf396bae52d7d8e54dabc46345036e4f86`; tree `d1e61ef09baccbb2229886a97394ec65156e7797`; unaccepted and unchanged |
| Reviewed registration closure | `acfec4182a41c4504a9b85cfaced517b60cd4ea7`; tree `0505cf4f3df69190506d6266f8d2008c3e33eaca`; selected as merge first parent |
| Registration independent Review | `6307da3929b65099a89ffe2d47a33b29c4a52465`; formal `PASS`; inspected read-only and excluded from Candidate ancestry |
| Append-only Operator-evidence line | `31b17ec04105334e64975900a09c8176ca26b717`; tree `2f08973449672c7ce081fa59d3cf29780e2d443d`; selected as merge second parent |
| Integration merge | `933852b76677f03bad510a5ebc42f8cded62fadb`; tree `ffad0f4263d97fb633009887d248fd3e92636964`; parents exactly `acfec4182… 31b17ec0…` |
| Documentation Candidate | `67f42e739a120253a4d0ef979550ea55fb0088d0`; tree `883fac551020273744fe65bde33255d574b3a544`; sole parent `933852b76677f03bad510a5ebc42f8cded62fadb` |
| Evidence closure | The later local commit containing this report, its manifest and adjacent sidecars is evidence-only. Its exact commit/tree is supplied from Git to the coordinator and must be included in the fresh Review scope. |

The merge is intentional. Both source tips share `aece565bc062ad47d6e92b4503c0e4c130c802bd` after exact published inventory `506d92bf…`; a non-fast-forward merge preserves the reviewed registration commits and the original V1.7/V1.8 evidence commits without cherry-picking or rewriting either append-only line. No merge conflict occurred.

This is a Stage 6 **Candidate**, not an accepted Stage 6 baseline. No accepted Stage 6 tag, checkpoint or remote ref was created or moved.

## 2. RW-003 — one source/evidence authority Candidate

### 2.1 Converged responsibility boundary

The root problem was split authority: published implementation ended at `506d92bf…`, the reviewed registration correction ended at local `acfec4182…`, and the latest Operator evidence ended at local `31b17ec…`; neither local tip contained the other. The correction is Git convergence, not another runtime or evidence mechanism:

1. use `acfec4182…` as first parent because it contains the intended registration/operations code and its immutable implementation evidence;
2. merge exact `31b17ec…` as second parent so V1.7 and V1.8 remain their original commits and blobs;
3. apply only the three TC-P1-001 current-state documentation corrections on the resulting merge; and
4. add this versioned report/manifest as evidence, without copying the separate handoff package into product ancestry.

The exact 27-path delta from `506d92bf…` to the implementation/documentation Candidate is in the evidence manifest. It consists of the previously reviewed registration line, original V1.6–V1.8 evidence, and three current-state documentation corrections. There is no Schema/Migration delta and no product, workflow, provisioning, OCI, database or runtime-validator edit made by this convergence task.

### 2.2 Append-only evidence and C-001 handling

V1.8 remains byte-exact:

| Artifact | SHA-256 | Result |
| --- | --- | --- |
| V1.8 Operator Report | `d0bfe757c7c8a8357dfd6b80e92db5d6a879dc4c71b38bcf35598c6bd3ccb26a` | unchanged; sidecar `OK` |
| V1.8 Evidence Manifest | `279ac925da16d487738de96ecdf541a4e0005efe27a97d5165f6508721b9e0fc` | unchanged; sidecar `OK` |

The report continues to state only the evidenced result: provisioning `PASS`; registration source HTTP `404`; zero Runner; zero Runtime workflow dispatch; complete teardown with zero recorded attempt residue. It is not reclassified as Runtime success.

Audit condition C-001 remains explicit and is not rewritten:

- `aba7a1b8c4a60bf0ebba63515d01f2e52dc43503` is `FAIL` and closes only through `025459b90d4c667e00b115398af7ba382464c47d` `PASS`;
- `7693614d1f400767d0acf0fee9d672b51fc92b7b` is `FAIL` and closes only through `cce0aac67190685c95b83f11cd791e4af047b217` `PASS`;
- all four Review commits remain non-ancestors of this product Candidate; the two successor `PASS` records are evidence authority only, while failed Reviews and failed Candidates remain immutable rejected history; and
- registration Review `6307da39…` likewise remains a non-ancestor evidence commit.

### 2.3 Read-only handoff authority

The outgoing package, Audit, Takeover Confirmation and locator in `/Users/calvin/Downloads/CWT（CloudWave Textile）项目/docs/handoff` were verified against their adjacent sidecars and used read-only:

| Artifact | SHA-256 / state |
| --- | --- |
| Stage 6 Partial / HOLD outgoing package V1.0 | `601642aa134803bf8f8930cf68c6928da7bbcc8c45048a4c58848c1cf93298a5` |
| Package Audit V1.0 | `bdafa8980d54197e6e79f3ed805491bb56fad58ea1b0b82b5ffe917ea28677cd`; `CONDITIONAL PASS` |
| Takeover Confirmation V1.0 | `0279f0498e172ff36752fae8738ae5a78b81a735b4150040da3d031868bcded3`; `READY WITH CONDITIONS` |
| Latest locator V1.4 | `9f204965303e7bdffd77185613d4415acbffe036d5dff429f373b495ea12ad0c` |

No file from that dirty root checkout was modified, copied or absorbed into this Candidate.

## 3. TC-P1-001 — current documentation authority

Exactly three current authoritative documents changed:

| Path | Correction |
| --- | --- |
| `docs/ENVIRONMENT_AND_DEPLOYMENT.md` | Removes the false statement that Production refuses local storage. It now states the accepted ADR-0013 and `src/config/env.ts` rule: initial protected Staging/Production require `STORAGE_DRIVER=local` plus exact canonical absolute nonoverlapping environment roots; S3 is a future migration target and COS remains backup-only. |
| `docs/PHASE_PLAN.md` | Adds a dated current-state section and updates the active Phase 1B status to Stage 6 `Partial / HOLD`; Stage 5 is the latest accepted/tagged baseline; Stage 6 has no accepted checkpoint; Production Ready is `No`; formal Product/media remains `Waiting for Real Product Data Validation`. |
| `docs/PHASE_1B_ACCEPTANCE_MATRIX.md` | Replaces the stale current header/baseline/date, separates the dated Stage 4A chronology from present authority, and makes the open Runtime, S6-06, S6-07, acceptance/freeze and later external gates explicit. |

Accepted ADR-0013, `src/config/env.ts`, historical Stage 4A/Phase 1A chronology, old reports, sidecars and append-only Operator evidence were not modified. The Candidate does not claim that TC-P1-001 is independently accepted; it is ready for that fresh Review.

## 4. RW-004 — planning decision only

### 4.1 Selected mechanism

**Select a byte-exact embedded registration payload inside the existing single Tencent TAT `RunCommand`, with a SHA-256 comparison before execution.** This replaces the failed private raw-URL fetch for the future bounded attempt; it does not add a second transfer or secret-custody path.

The exact source authority for the future materialization is:

| Field | Exact value |
| --- | --- |
| Candidate path | `67f42e739a120253a4d0ef979550ea55fb0088d0:deploy/runtime-validation/register-and-start-ephemeral-runner.sh` |
| Git blob | `1281a207e5ebe58b7fb78900213a44ef26ad7e0a` |
| SHA-256 | `7c773a341cfd629dae2985f7c51792aee6f917ca5df7733f7200d26e780da94b` |
| Exact byte count | `3752` |
| Inner Base64 length | `5004` bytes |
| Existing TAT contract | blob `5ab9405bc487d8cf74ab32c4daa9c1a51dfab759`; SHA-256 `3c65d0b05ae694885b7bb9c32ebed048758a3369bcf2d4637721506eaec448a1` |

Tencent's current official `RunCommand` documentation states that `Content` is Base64-encoded, the encoded value is limited to 64KB, hidden parameters are supported, and `Username` selects the instance execution user. The current payload leaves substantial room for one small wrapper even after inner and outer Base64 expansion. Sources inspected on 2026-09-05:

- <https://cloud.tencent.com/document/product/1340/52676>
- <https://cloud.tencent.com/document/product/1340/52695>

Reachability comes from the already selected authenticated Tencent TAT control plane delivering the one `RunCommand` to its agent. The VM performs no GitHub/COS/network fetch for registration source. Integrity comes from the reviewed Candidate blob/SHA and the wrapper's pre-execution comparison. Provider authentication and the independent Review of the exact rendered command establish custody; SHA-256 alone is not treated as source authentication.

### 4.2 Minimum future implementation contract

RW-004 implementation, under a later bounded authority, should change only the existing registration invocation contract, the existing operator paragraph and the existing focused registration test unless Review proves a smaller complete delta:

1. deterministically render one non-secret TAT shell wrapper containing the literal Base64 of the exact 3,752-byte payload and the exact expected SHA-256;
2. retain `RunCommand`, `username=ubuntu`, working directory `/home/ubuntu`, timeout `600`, `saveCommand=false` and COS output disabled;
3. begin with tracing disabled and `umask 077`, create one mode-restricted temporary file, decode the embedded bytes, calculate SHA-256 and compare it before any payload execution;
4. on exact match, invoke that one file once with the unchanged four-input registration boundary, then best-effort remove the non-secret temporary payload through one shell trap;
5. on decode, size, hash, identity or execution failure, emit only a fixed non-secret reason, create no fallback fetch/path, and stop before registration whenever the payload has not begun; and
6. delete the raw-URL/`curl` materialization from the active operator procedure. Do not retain both paths.

The existing registration payload remains the only config/start authority. The embedded copy is a reviewed transport snapshot and must byte-compare to that file; it cannot evolve independently. No new renderer framework, daemon, service, queue, table, state machine, retry, alternate URL, artifact store or persistent coordination state is justified.

### 4.3 Secret boundary

- The embedded payload, its hashes and the TAT wrapper are non-secret and may be versioned/reviewed.
- The existing repository-scoped, short-lived Runner registration token remains the only narrowly accepted secret in this invocation and stays in the existing TAT hidden-parameter/environment-input boundary.
- No PAT, GitHub App token, GHCR credential, Tencent credential, COS signed URL, business secret, Staging secret or Production secret may be added to source materialization.
- The registration token value must not enter Git, command source, the embedded payload, files, ordinary output, sidecars or Review evidence. The prior narrow trace-risk acceptance does not generalize to any other credential.

### 4.4 Alternatives and tradeoffs

| Option | Benefit | Material cost/risk | Decision |
| --- | --- | --- | --- |
| Remotely present immutable private Git commit/blob fetched with authentication | Small TAT command and familiar URL-shaped source | Requires remote publication plus a separate GitHub content credential on the pre-registration VM; the Runner token cannot authorize private repository content. Adds network/service dependency and credential custody, while unauthenticated private raw URLs may return 404 as V1.8 proved. | Rejected for RW-004 |
| Public immutable raw source | No content credential | Requires public source publication or repository visibility change and external Push/visibility authority; expands exposure and custody. | Rejected |
| Artifact/COS/release-object source | Can be immutable if separately governed | Adds retention, upload, object permissions, URL/signing and a second transfer/custody framework. | Rejected |
| Byte-exact payload embedded in the existing TAT command | No GitHub content credential or second network source; one existing authenticated channel; payload is well below provider limit | Duplicates bytes inside a transport snapshot and requires deterministic byte/hash/size verification; non-secret command content remains in the TAT invocation record. | **Selected** |

### 4.5 Failure, evidence, rollback and no-VM gate

The exact rendered wrapper and request do **not** exist in this Candidate. Therefore RW-004 external readiness is not complete and no VM may be created from this plan.

Before any VM creation, a fresh independent Reviewer must receive the exact future Candidate and prove:

- outer TAT `Content` Base64 decodes exactly to the reviewed wrapper and stays at or below the provider's 64KB encoded limit;
- the inner Base64 decodes to exactly Git blob `1281a207…`, 3,752 bytes, SHA-256 `7c773a34…`, with no extra newline or normalization;
- mismatch/decode/truncation/extra-byte/second-path mutations fail before payload execution;
- the exact TAT execution settings and hidden-secret boundary remain fixed;
- the active procedure contains no raw URL, `curl`, authenticated GitHub-content token or fallback; and
- focused registration/materialization tests, shell syntax, `git diff --check`, ancestry and secret scans pass.

Only an exact independent `PASS` may be presented to the Owner for a separate one-shot external-attempt decision. A non-`PASS` remains `HOLD`; it does not authorize a fallback, retry, VM or workflow dispatch.

Rollback is Replace, Not Layer: revert the one future materialization change, keep Stage 6 `HOLD`, and do not restore the failed raw-URL path as an active fallback. If a later authorized attempt has already created a disposable host, any materialization failure stops before retry and follows the mandatory teardown boundary.

## 5. Verification ledger

| Check | Result |
| --- | --- |
| Exact commit/tree/tag/ref object verification | `PASS` |
| Stage 5 → published inventory → both local tips ancestry | `PASS` |
| Integration parent order and no merge conflict | `PASS` |
| Review-only / C-001 Review commits excluded from Candidate ancestry | `PASS` |
| Registration and V1.6–V1.8 adjacent sidecars | `10/10 OK` |
| Handoff package/Audit/Confirmation/locator adjacent sidecars | `4/4 OK`, read-only |
| V1.8 report/manifest byte hashes | exact `d0bfe757…` / `279ac925…`; `PASS` |
| Registration shell syntax | `/bin/bash -n` on local Darwin: `PASS`; target `/usr/bin/bash` is not present on this host and was not claimed as fresh Linux evidence |
| Focused Runner-registration suite | `8/8 PASS` |
| Full deployment suite | `138/138 PASS` |
| Full repository ESLint | `PASS`, zero warnings |
| TypeScript strict typecheck | `PASS` |
| `git diff --check` | `PASS` |
| Schema/Migration delta from `506d92bf…` | none |

The full Vitest application suite, Next build, public-bundle check, browser tests, Production dependency audit and real Linux/Tencent/GitHub/GHCR checks were not rerun. This convergence introduces no application source, package, Schema/Migration, workflow, image, Compose, provisioning or runtime-validator delta beyond the already reviewed registration line; focused and full deployment tests plus Lint/TypeScript are proportionate. External behavior remains explicitly unproved and unauthorized.

## 6. Complexity, rollback and known limitations

- **Root cause / corrected boundary:** split Git authority is resolved by one merge; stale live documentation now defers to ADR-0013/source and the latest accepted Stage 5/current Stage 6 state.
- **Deleted or replaced logic:** no product logic was added or deleted. Current prose replaces the contradictory/stale statements. RW-004 plans one future replacement of raw-URL materialization, not a layered fallback.
- **Persistent complexity:** no table, field, Migration, Worker, Lease, Recovery type, queue, state machine, retry framework or cross-process state was added.
- **Complexity direction:** level to lower. Git history gains one necessary merge node; operational planning removes a remote-fetch credential/path rather than adding one.
- **Rollback:** because no accepted or remote ref moved, the authoritative rollback remains exact Stage 5 tag `phase-1b-stage5-approved-2026-08-30`. Before acceptance, the local Candidate can be abandoned; any retained rollback commit should revert the documentation commit and the merge through its first parent without rewriting history.
- **Known limitations:** RW-004 has no rendered implementation or Review; exact-digest Linux Runtime remains unproved; no current external artifact/provider availability was queried; S6-06/S6-07 and Stage 6 acceptance/freeze remain open; Stage 7/8 and Production remain unauthorized; formal Product/media status remains `Waiting for Real Product Data Validation`.

## 7. Claim ceiling and next gate

RW-003 and TC-P1-001 are implementer-complete only. RW-004 is a selected plan only. Phase 1B Stage 6 remains **Partial / HOLD**, Stage 5 remains the latest accepted/tagged baseline, Production Ready remains **No**, and no external action follows automatically.

The sole next gate is a separate fresh independent Review of the exact terminal Candidate/evidence closure. The Reviewer must verify the implementation Candidate, this report/manifest/sidecars and the RW-004 plan. Any non-`PASS` returns to the coordinator. This Implementer does not self-approve or advance to execution.
