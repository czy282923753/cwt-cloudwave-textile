# CWT Stage 4A Phase B — V2.2 DB Client `globalThis` Convergence Owner Approval and Pre-L3 Checkpoint V1.0

Status: **OWNER APPROVED NARROW ALLOWLIST EXPANSION / PRE-DB-CONVERGENCE L3 CHECKPOINT / NOT IMPLEMENTATION ACCEPTANCE**

Date: 2026-08-11 (Asia/Shanghai)

## 1. Owner decision

The Owner instruction is recorded verbatim:

> 批准方案 1

This approves only the recommended narrow V3.1 implementation-allowlist expansion. It is not a V3.1 boundary change, Design successor, ADR, Schema/Migration decision, dependency approval, Complexity Approval or implementation acceptance.

The two newly permitted paths are exactly:

- `src/db/client.ts`;
- `src/db/client.global-cache.test.ts`.

Their sole authorized purpose is the mechanical convergence from a captured or aliased `globalThis` object to direct statically named `globalThis.cwtDatabaseConnection` property reads and writes, plus one focused behavioral and syntactic-boundary test.

## 2. Exact starting identity

- source branch: `codex/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-implementation-v1`;
- source and checkpoint commit: `d83cfb69a2abb51b95e43db3ea23c87c0410692b`;
- source parent and exact M02 code HEAD: `6d21a1fce8701ab25b93bb1b797173ef0003b5de`;
- source tree: `5d91b03055a8a443f14cd29a8151ea8326ebba9f`;
- source worktree: `/Users/calvin/.codex/worktrees/b62f/CWT（CloudWave Textile）项目`;
- new immutable local checkpoint ref: `refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-v2-2-db-client-convergence-pre-l3-v1`;
- accepted start: `9aa9735f422975780585e62eaec1a4759f9894c9`;
- accepted start parent/tree: `156cbafc061d36ce2395529a3150b0c974f3c603` / `33b01e701ac279b9a04868c7b14b068c84cc81b5`;
- earlier fresh pre-L3 checkpoint ref target: `9aa9735f422975780585e62eaec1a4759f9894c9`;
- accepted V2.2 checkpoint ref target: `9aa9735f422975780585e62eaec1a4759f9894c9`;
- frozen Stage 3 tag peeled commit: `31c0e405acfdd0d05200d0fb2531e897a541a2c4`;
- exact pre-mutation `src/db/client.ts` SHA-256: `fda8e496113f7d7658e94942d6f93c392fcaf403fcfd77a888852d0f18207800`.

The branch, HEAD, parent, tree, database-client SHA-256, both earlier checkpoint refs, accepted start and clean index/worktree were verified before creating the new checkpoint ref. The new ref was created directly at the recorded source commit and verified before this record commit.

## 3. Existing partial Candidate state

The completed M02 replacement remains commit `6d21a1fce8701ab25b93bb1b797173ef0003b5de`. It replaced the former edge/deletion/ordered-core authority with the accepted sole position-insensitive Unicode token-multiset relation. Its focused test was `24/24` PASS; all output tests were `54/54` PASS; focused ESLint and strict typecheck passed. This checkpoint does not re-review, approve or change M02.

The preceding blocker record is commit `d83cfb69a2abb51b95e43db3ea23c87c0410692b`; the Owner decision resolves only its exact two-path allowlist question. M04, NM01, independently reconstructed M01 and final evidence remain unfinished.

## 4. Preserved behavior and prohibitions

The convergence must preserve exactly:

- current PGlite and Postgres `DatabaseConnection` construction;
- singleton connection reuse;
- the non-production cache write;
- no Production cache write or new authority; and
- all connection, Schema, environment and API behavior.

It may not introduce destructuring, a local global-object alias, computed access, `Reflect`, proxy, getter wrapper, helper, service locator, `any`/`unknown` round trip, suppression, compatibility fallback or second cache.

No other `src/db/**`, config, Schema, Migration, snapshot, journal, seed, package/lock, environment, service locator, wrapper, compatibility, public/SEO/URL/Redirect, Provider/network or Phase C/D/E mutation is authorized. No install, dependency materialization, merge, Push, deployment or external action is authorized. The checkpoint ref must never move or be pushed.

## 5. Rollback and next gate

Before Candidate acceptance, rollback is to abandon this implementation branch and recreate from immutable accepted start `9aa9735f422975780585e62eaec1a4759f9894c9`. For the bounded convergence alone, its linear commit may be reverted only from a clean worktree without rewriting history or moving any checkpoint ref.

After this record becomes an exact one-file direct child and the new checkpoint ref is reverified, the next authorized gate is the two-path database convergence. On success, implementation continues linearly through M04, NM01, independently reconstructed M01, exact final code HEAD, evidence and aggregate verification. A separate Fresh Independent Implementation Review must first perform `REMEDIATION_FINDINGS_REVIEW`, including this convergence and all repaired/preserved-closed findings, and only then decide `FULL_REVIEW_NECESSITY`. This record authorizes no self-review or next-phase acceptance.
