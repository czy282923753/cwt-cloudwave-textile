# CWT Stage 4A Phase A Completion / Integration Report

Status: **INTEGRATION CANDIDATE — NOT PHASE A FINAL ACCEPTANCE / PHASE B NOT STARTED**
Report version: `1.0`
Prepared: `2026-08-10` (Asia/Shanghai)
Integration branch: `codex/phase-1b-stage4a-phase-a-integration-v1`
Integration worktree: `/Users/calvin/.codex/worktrees/3762/CWT（CloudWave Textile）项目`
Next gate: independent Phase A Completion Review

## 1. Outcome

The Integration Manager prepared one Phase A Integration Candidate that:

- preserves the frozen Stage 3 baseline and tag;
- records the Owner's current Architecture Approved / Development Authorized decision without changing the accepted architecture;
- incorporates the exact independently reviewed `0020` Candidate through a non-fast-forward merge, preserving its original commit identity;
- incorporates both independent reports and all 19 Candidate evidence payloads at their original byte identities;
- disposes Low `L-01` through a versioned acceptance-oracle Erratum, without changing the fixed design or Candidate;
- contains no Phase B AI Service Layer implementation and performs no Provider or external action; and
- stops at an Integration Candidate for independent Phase A Completion Review.

This report is prepared by the Integration Manager. It is not an independent review, does not self-approve Phase A, and does not authorize Phase B.

## 2. Frozen baseline and Git topology

| Identity | Value |
|---|---|
| Frozen Commit | `31c0e405acfdd0d05200d0fb2531e897a541a2c4` |
| Frozen annotated Tag | `phase-1b-stage3-approved-2026-08-09` |
| Tag object | `1c626f9b788e4c6ed0480a7040aa54ccef3e6c76` |
| Tag peeled Commit | `31c0e405acfdd0d05200d0fb2531e897a541a2c4` |
| Governance/Owner-state Commit | `0964caa45167eee4f66212570955edb3b3e80b40` |
| Governance Commit parent | `31c0e405acfdd0d05200d0fb2531e897a541a2c4` |
| Exact Candidate Commit | `15bc6462d2e314f50ff238af70ad31fc6502c40f` |
| Exact Candidate parent | `31c0e405acfdd0d05200d0fb2531e897a541a2c4` |
| Non-fast-forward merge Commit | `46733d25cbd14f5450ed6c251a8e1b2b72b8b027` |
| Merge first parent | `0964caa45167eee4f66212570955edb3b3e80b40` |
| Merge second parent | `15bc6462d2e314f50ff238af70ad31fc6502c40f` |
| Candidate ancestor check | **PASS** — `15bc6462…` is an ancestor of the integration branch |

The final Integration Candidate HEAD is the branch commit that contains this report and the incorporated evidence. Its non-self-referential full SHA is recorded in the coordinator callback and independent-review handoff. The topology above is stable inside this report and proves that the exact reviewed Candidate was merged rather than recreated or cherry-picked.

## 3. Owner authorization and current authority

The controlling record is [Stage 4A Owner Development Authorization V1.0](./PHASE_1B_STAGE4A_OWNER_DEVELOPMENT_AUTHORIZATION_V1_0.md), SHA-256:

```text
300019a7f80b521f24bb1c9efaf902c0aa30a4501fb273ec73bee99b5e0429c5
```

It records that the Owner:

- cancels DeepSeek enterprise-evidence review as a Stage 4A development, testing, or later release prerequisite;
- makes `PD-04` through `PD-07` non-blocking reference evaluations;
- accepts the current incomplete-supplier-information risk for AI Draft Assistance, content generation, and SEO;
- restricts input to public company information, authorized Product structured data, authorized Fabric Knowledge, and bounded explicit human input;
- prohibits private customer Inquiry data, customer/CRM data, unauthorized internal or sensitive business data, and unreviewed files;
- keeps Provider-agnostic design, no fallback, no complete RAG, no visual AI, and no `customer_support`; and
- authorizes continued bounded Stage 4A development.

It does not authorize a Provider API call, credentials, spend, Staging/Production deployment, Production AI, Deploy, Publish, Index, formal import, private/customer-data transfer, or an automatic Phase B start.

Earlier PD reports retain their evidence-time conclusions. Clear superseding current-disposition notes were added to the current governance copies; the missing supplier evidence is not misrepresented as resolved.

## 4. Exact Candidate integrity

Fixed Schema Design SHA-256:

```text
db6ae44d3548e2c0c23ab2b95ee3550fefedb93224f878f5a9ab3070898b60a8
```

Each Candidate file has the same Git blob in the original Candidate and integration merge:

| Candidate file | Git blob OID | SHA-256 |
|---|---|---|
| `docs/PHASE_1B_STAGE4A_PHASE_A_0020_AI_FOUNDATION_SCHEMA_DESIGN_V1_0.md` | `5a1d2e3b768cd9968eb0ff9c7b7e1791eb29152a` | `db6ae44d3548e2c0c23ab2b95ee3550fefedb93224f878f5a9ab3070898b60a8` |
| `drizzle/0020_phase1b_ai_foundation.sql` | `951df74ebab313eeb1f6f3393a58e5bf58c0e760` | `a7e2192b1dd60f41b66b1f19db1a44e2a35c01d246ae97787ef9aaaec60cac3c` |
| `drizzle/meta/0020_snapshot.json` | `9f0f3cb5cda9bb8bb6a48a50b70f846c57347120` | `274ad623210843981a27d262df2057213230f3943c3faafa16a2f15397792321` |
| `drizzle/meta/_journal.json` | `b4f899456030b4316de6fdf00b6535b53795d9a6` | `bea61c8329c1dd78d6a1620e8357dfc153e05af46beb47629b4510c9f831eef7` |
| `package.json` | `bd5001f02ae758af157ce84b7e905dc9efc6b07d` | `3f288f10bbb11e9a657e038af198bb31f0a471ecacb4f7d9e9ae6848ac241ed4` |
| `scripts/verify-ai-foundation-candidate.ts` | `fe9639730c165ef390a3cc21e91bc10462e1da78` | `bb5d7f945bd17903b6ff492d5a1927528cc6d1a00aa7bcc8274e0abafdc16be1` |
| `src/db/schema/ai.integration.test.ts` | `279c914bfc3136babb06b2eb6cb335e8edf4116c` | `f87d5765c19cd8ac5f0c3be042f2128578dfd9e1fb61eec18600560d77b572b4` |
| `src/db/schema/ai.ts` | `2da1de28d33c03924f3e8e2aea87584115f55aaf` | `9f09c3a2e4532556384c8527886ec235a8ff9d9f390eb91d09e29712f5287449` |
| `src/db/schema/index.ts` | `5aea0db76d6bd8563116a973b39339bd2917f42e` | `09badb6cbc33665d85918f1244a140409908518696a49a690c7df7bddc931070` |

No Integration Manager edit touches these nine files.

## 5. Historical Migration and Journal integrity

| Check | Result |
|---|---|
| Historical Migration/Snapshot artifacts `0000`–`0019` | `40/40` paths unchanged from frozen baseline |
| Aggregate path/blob identity at baseline | `cda5bafccd50e948a6891089806fc965c008a5293c3daa9322b0953741a4dd73` |
| Aggregate path/blob identity at integration | `cda5bafccd50e948a6891089806fc965c008a5293c3daa9322b0953741a4dd73` |
| Baseline Journal entries | `20` |
| Integration Journal entries | `21` |
| First 20 Journal entries | Exact structural equality |
| Final Journal tag | `0020_phase1b_ai_foundation` |
| Number of `0020_phase1b_ai_foundation` entries | `1` |

The Journal change is only the exact Candidate append. The frozen Tag and Commit were not moved, rewritten, or re-tagged.

## 6. Independent reports and incorporated evidence identity

| Artifact | SHA-256 |
|---|---|
| [Independent Migration Design Review V1.0](./PHASE_1B_STAGE4A_PHASE_A_0020_INDEPENDENT_MIGRATION_REVIEW_V1_0.md) | `fe17a42990f1b55fca89e1f038cede9c09aff3c418379ff8d4c54d882ff3e6b2` |
| [Independent Migration Candidate Review V1.0](./PHASE_1B_STAGE4A_PHASE_A_0020_INDEPENDENT_CANDIDATE_REVIEW_V1_0.md) | `898c8917ed0f982b843eb70269a9ca76073f1a0b72b0a66c731ba1c31f80b0ef` |
| [Evidence manifest](./review-evidence/phase-1b-stage4a-0020-candidate-v1/SHA256SUMS.txt) | `57d89f5f11a92444de62dfd894d3582b3718533a490b43831767eae8fc2bcbaf` |

The incorporated evidence directory contains exactly 19 payload files plus the manifest. `shasum -a 256 -c` passes all 19 entries:

| Evidence payload | SHA-256 |
|---|---|
| `build-database-migrate.log` | `f331ce53ded4e4106918189f8c9a11a23419d10ffff07f724921b666b30a3307` |
| `build-with-isolated-postgres.log` | `26c2cd231865f9daa3d3431c3e6af6eff9291bfd46e649813a75405da672e7fe` |
| `build.log` | `e43b5b90fe40c5579eca5885700de8d12160c943831316ca76b6d0888b262e7e` |
| `candidate-static-review.json` | `6ab304d7cef2d79f3f5bf72d0170e3a144224e18ee382228c998e374a61cb195` |
| `candidate-static-review.mjs.txt` | `e75af40046cb62759ef45f8c920acf39931a8edb34b8a22467d35f654feef51b` |
| `candidate-verifier.log` | `b7a123e19cfa98b7eea33ec0c7832b2b32c2de64fdcc5948ad79d589a43c367b` |
| `full-test.log` | `277bcfa2c7ed93b6965d74c984d0ed6ba1643d5af2812785bb0a93f2f13f3eb8` |
| `lint.log` | `b543827ce56a63357c629028555ecec2cc964dda33dbbf2a9a2872b1a2ab20f8` |
| `postgres-contention-lifecycle-budget.json` | `6160a21553b35a7a8fbdef949a5845350e8456313af2302ad4ee881fee721709` |
| `postgres-contention-lifecycle-budget.ts.txt` | `3b7fdf24bb5f280e8cb6f136a29b9ceef090928985b0d3ce6afd4f3aab93f726` |
| `postgres-isolation-identity.json` | `bdcd81f04e9b932f4dc0eaba022613d60cfad126bcb2a9e5e776298099afcda0` |
| `postgres-migration-catalog-constraints.json` | `90a99d1d87fff7c98e25c2040e762140a3dbcee8ee6b0d940a89d63e6c0f2c2d` |
| `postgres-migration-catalog-constraints.ts.txt` | `2538b70b4a2d53c64ef92e5c92f382e1ff58cefbb1f0284f079efb1a86d74ed7` |
| `postgres-scale-query-plans.json` | `f3d2b623637795d877c8f5bb2f6dbad4d3c8261d3d56e0127290eb09558fd0ee` |
| `postgres-scale-query-plans.ts.txt` | `f22fad8a29eae4a649b9a828ecffa5816dafdd1434b69e433c709caabe873eed` |
| `public-bundle-check.log` | `4d55dc37fd5898ef99f94ab382e35d976d7d18e7f1cba47e30688ed65a334252` |
| `snapshot-reproduction.log` | `3425520181908d63c05a1e67d9884639a2d6ba5210d4c89ad1fdff5b608c04d5` |
| `targeted-test.log` | `422e023bc701d3fdea52aa64b7f97af4191e9fdd675c2df02a28da7cd4ab7706` |
| `typecheck.log` | `8366207267355d3e3d5bf3bf6e8c94c5f93f6078c34f08973fa2b38cdda6cc92` |

The copied reports, manifest, and payloads were not edited after copying.

## 7. L-01 disposition

[Acceptance-Oracle Erratum V1.0](./PHASE_1B_STAGE4A_PHASE_A_ACCEPTANCE_ORACLE_ERRATUM_V1_0.md), SHA-256:

```text
0415ec62fbc24faf63c61ff7b98cfb9a22321851f7c1539b90f36c2185dcae08
```

The Erratum preserves the historical Low finding and corrects only the test expectation:

- fixed Design V1.0 §14.2 said `23503`;
- explicit PostgreSQL 18.4 `ON DELETE RESTRICT` correctly returns `23001` (`restrict_violation`);
- all four intended deletes were rejected under the named restrictive constraints; and
- no Schema, Migration, architecture, Domain Service, Worker, Provider, or business-code change is needed.

The Integration Manager did not change `RESTRICT`, the fixed design, or the Candidate to satisfy an erroneous oracle.

## 8. Fresh integration verification

The following checks were rerun from the integration branch after the non-fast-forward merge:

| Check | Result |
|---|---|
| `pnpm db:verify:ai-foundation-candidate` | **PASS** — approved design identity, 40 historical artifacts, Journal append, exact columns/defaults/nullability/types, constraints, indexes, and scope |
| `pnpm lint` | **PASS** — zero warnings |
| `pnpm typecheck` | **PASS** |
| `pnpm exec vitest run src/db/schema/ai.integration.test.ts` | **PASS** — 1 file / 1 test |
| `pnpm test:run` | **PASS** — 98 files / 417 tests |
| Candidate ancestor and nine Git blobs | **PASS** |
| Frozen Tag peeled Commit | **PASS** |
| Two review-report SHA-256 values | **PASS** |
| Evidence manifest SHA-256 and all 19 payloads | **PASS** |
| Historical `0000`–`0019` path/blob comparison | **PASS** — 40/40 unchanged |
| Journal prefix and single `0020` append | **PASS** |

Fresh Build was not rerun by the Integration Manager because this integration adds documentation/evidence around an unchanged exact Candidate and the required fresh verifier, Lint, Typecheck, targeted test, and full suite all passed. The incorporated independent evidence retains the exact isolated PostgreSQL 18.4 migrated-build PASS and public-bundle PASS. No Build result is omitted or represented as newly rerun.

## 9. Scope and complexity report

Integration-manager changes are documentation/evidence only. The only code/Schema/Migration content is the exact nine-file Candidate commit.

- Root cause addressed: current governance text lagged behind the Owner's later authorization, and the single Low finding was a wrong acceptance oracle rather than a Schema defect.
- Correct responsibility boundary: Owner authorization is recorded independently; historical evidence reports retain evidence-time conclusions; the Erratum owns the oracle correction; the Candidate remains immutable.
- Deleted/merged old logic: none; no business implementation exists in this task.
- Added persistent table/state/Worker/Lease/Recovery type: none beyond the exact independently reviewed Candidate.
- Dual authority: none introduced. Owner current state and historical evidence-time state are explicitly separated.
- Complexity effect: integration documentation/evidence increased, runtime complexity unchanged.

## 10. Prohibited-action confirmation

This integration performed no:

- change to the Candidate nine files;
- change to historical Migration/Snapshot artifacts `0000`–`0019`;
- Phase B or AI Service Layer implementation;
- Provider API call, credential access, account mutation, recharge, or spend;
- Staging or Production deployment;
- Production AI action;
- Deploy, Publish, Index, or formal data import;
- Push; or
- independent self-approval.

## 11. Open findings and next gate

Open Blocker/High/Medium findings for this Integration Candidate: **none reported by the incorporated independent Candidate review**.

`L-01`: **documented and disposed by Acceptance-Oracle Erratum V1.0; independent completion verification still required**.

Supplier evidence gaps: **retained as non-blocking reference risk under the Owner decision; not represented as resolved**.

Next gate: an independent **Phase A Completion Review** must verify the exact final branch HEAD, full topology, reports/evidence hashes, Erratum, Candidate blob identity, history/Journal integrity, clean state, and fresh verification. This Integration Candidate does not authorize or start Phase B.
