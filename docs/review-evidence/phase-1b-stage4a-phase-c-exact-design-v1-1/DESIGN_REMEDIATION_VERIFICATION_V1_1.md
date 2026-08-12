# CWT Stage 4A Phase C Exact Design V1.1 — Remediation Verification

Status: **DEVELOPER STATIC/DESIGN VERIFICATION / NOT INDEPENDENT REVIEW / NOT ACCEPTANCE / NOT IMPLEMENTATION EVIDENCE**

- Prepared: `2026-08-12` (`Asia/Shanghai`)
- Corrected Candidate: [`PHASE_1B_STAGE4A_PHASE_C_DURABLE_RUN_WORKER_EXACT_DESIGN_V1_1.md`](../../PHASE_1B_STAGE4A_PHASE_C_DURABLE_RUN_WORKER_EXACT_DESIGN_V1_1.md)
- Developer branch: `codex/phase-1b-stage4a-phase-c-exact-design-v1`
- Exact parent before remediation: `6cdb0df3e9b0565e5cdfd6cac0ca4a315d0e272b`
- Accepted base/checkpoint target: `cc5715f4a9eb07293bf932cfbd822bfa6bf14a45`
- Finding authority read from exact review commit: `8572f678cb608ff7dc41fd60a241fcbb0b4b18f3`

## 1. Starting identity and immutable-history proof

The worktree was read-only verified before mutation:

```text
HEAD   6cdb0df3e9b0565e5cdfd6cac0ca4a315d0e272b
branch codex/phase-1b-stage4a-phase-c-exact-design-v1
status clean
parent cc5715f4a9eb07293bf932cfbd822bfa6bf14a45
accepted checkpoint cc5715f4a9eb07293bf932cfbd822bfa6bf14a45
```

Immutable V1.0 identities before and after V1.1 drafting:

```text
0fd2d6a558fdc6485b79069c4d6a7f57b6e84c9c3c9f64262e6ca3b4898035c1  docs/PHASE_1B_STAGE4A_PHASE_C_DURABLE_RUN_WORKER_EXACT_DESIGN_V1_0.md
0a7a89678fff532fceeea5024d04aa4d4aa848f39c120362a5e51a774e61b632  docs/review-evidence/phase-1b-stage4a-phase-c-exact-design-v1/DESIGN_VERIFICATION_V1_0.md
```

The independent FAIL report was read with `git show` from the exact reviewer commit; its streamed SHA-256 was:

```text
15e55083867d8d4e2dfaa90d25f68da06400ba5811272edd1367c76b35468952
```

No reviewer artifact was cherry-picked, edited or materialized on the developer branch. The accepted V3.1 architecture fixture remained:

```text
3a5ad42377740ee9072900b6b050ca4ec61ebba716a2238a41f963a63c6b7d45  test-fixtures/ai-architecture/graph-faults.v3_1.json
```

## 2. H-01 design correction verification

The V1.1 design was checked for all of these exact authorities:

- the only lifecycle key is `pg_try_advisory_xact_lock(1129792594, 1)`;
- every claim, recovery, active-count/admission, heartbeat, dispatch marker, settlement, cancellation, manual retry, late accounting and shutdown persistence obtains that non-blocking transaction lock before any run-row lock/update;
- heartbeat lock-busy reads no run for update and writes no row, lease, version, dispatch or persisted error/state;
- heartbeat uses five total lock attempts, exact one-second retry spacing and a database-authoritative ten-second safety window;
- the renewal update requires `lease_expires_at > observed_at + interval '10 seconds'`, so expiry/safety-window renewal is impossible;
- an unresolved heartbeat occupies its Worker slot and prevents dispatch/replacement claim;
- settlement/shutdown lock-busy cannot manufacture success and hands off conservatively to expiry recovery; and
- no run-row-to-advisory order or second advisory key/domain remains.

The two supported H-01 commit-order arguments are closed at design level:

| First advisory owner | Permitted sequence | Maximum committed unexpired processing rows |
|---|---|---:|
| Heartbeat H | H updates R1 and may pause across old expiry while retaining advisory ownership; C is lock-busy and executes no recovery/count/admission; after H commit, C counts renewed R1+R2 and cannot claim R3. | 2 |
| Claim/recovery C | H is lock-busy and never locks R1; C either counts unexpired R1+R2 and admits none, or recovers expired R1 and may admit R3; later H status/token/version/safety fence fails. | 2 |

This is a design/static proof obligation only. The exact multi-connection R1/R2/R3 barrier, real lock observations and no-three-active invariant remain mandatory future PostgreSQL EV-01 evidence.

## 3. M-01 exact-tree consumer closure

The accepted source tree was rescanned with literal identifiers/paths covering V1 claimed execution/result, Phase B factories/flag/root and V3.1 current profile. The exact 11-path result was:

```text
scripts/verify-ai-architecture.ts
src/ai/applications/draft-assistance/composition.ts
src/ai/core/claimed-execution.integration.test.ts
src/ai/core/contracts.ts
src/ai/core/orchestrator.ts
src/ai/internal/claimed-run-authority.ts
src/ai/internal/worker-entry.ts
src/ai/provider-neutral-foundation.integration.test.ts
src/ai/testing/synthetic-application/synthetic-application.test.ts
src/server/ai/phase-b-composition.ts
test-fixtures/ai-architecture/graph-faults.v3_1.json
```

Every path appears in V1.1 Section 23.1 with an exact `MODIFY`, `REPLACE IN PLACE`, `DELETE`, or `PRESERVE BYTE-UNCHANGED` disposition. The rescan also inspected `src/ai/providers/text-provider.ts` and `src/ai/testing/fake-text-provider.ts`; both remain unchanged because the safe fields already exist and loss occurs in core normalization.

The closed successor authority is:

```text
sole checker: scripts/verify-ai-architecture.ts
sole current profile: test-fixtures/ai-architecture/graph-faults.phase-c.v4_0.json
schemaVersion: 40
profileId: cwt.phase1b.stage4a.phasec.durable-run-worker-boundary.v4_0_candidate
profileVersion: 4.0.0-candidate
sole root: src/server/ai/phase-c-composition.ts
obsolete root: src/server/ai/phase-b-composition.ts (required absent)
```

V1.1 names every existing file mutation/deletion, every new Product/test/script/fixture path, the exact six V4 proof/manifest outputs, raw/profile-integrity/checker/proof hash bindings, inherited/new mutation authority and the no-expansion rule. Generic existing-test mutation and import-compatible/dual-root options are absent.

## 4. Relational and document structural reproduction

A read-only Node/TypeScript AST check compared ordered Migration columns, ordered Drizzle physical column literals and V1.1 field-ledger rows:

```text
fields ai_model_config migration=21 drizzle=21 ledger=21 ordered=true
fields ai_runs migration=96 drizzle=96 ledger=96 ordered=true
catalog checks=40/40 equal=true fks=11/11 equal=true indexes=18/18 equal=true
```

The same check resolves every relative Markdown link. After this evidence file was added, the final link check is rerun and recorded in Section 6.

Required/forbidden semantic assertions before evidence creation:

```text
semantic_required=16/16
forbidden_absent=3/3
direct_consumer_paths=11
```

The five status block remains exactly `pending`, `processing`, `draft_ready`, `failed`, `cancelled`; retry remains orthogonal and no `dead`/`succeeded` status is authorized.

## 5. Accepted source-clean gates

The architecture gate was run sequentially with its required absolute pinned installed-dependency prerequisite:

```text
env CWT_INSTALLED_NODE_MODULES='<absolute-current-worktree>/node_modules' pnpm check:ai-architecture
exit_code=0
ok=true
profileId=cwt.phase1b.stage4a.phaseb.m04-static-capability-boundary.v3_1_candidate
head=6cdb0df3e9b0565e5cdfd6cac0ca4a315d0e272b
lifecycleState=source-clean-file-absent
candidateCount=690
executableCount=483
mutationProbes=28/28 fail-closed
bundleProofReady=false (expected accepted source-clean state)
```

This verifies that the docs-only remediation did not mutate the accepted executable/source boundary. It does not claim the future V4.0 Phase C checker exists or passed.

Prompt boundary:

```text
pnpm check:ai-prompts
AI Prompt bundle verification passed.
exit_code=0
```

The command includes the Synthetic test bundle; the Production Prompt bundle remains empty.

Accepted AI foundation verifier:

```text
pnpm db:verify:ai-foundation-candidate
AI foundation candidate verification passed: approved design identity, 40 historical artifacts, journal append, exact columns/defaults/nullability/types, constraints, indexes, and scope.
exit_code=0
```

## 6. Final docs-only scope checks

Before commit, the following must all pass and are rerun after this record is complete:

- `git diff --check`;
- relative-link resolution for V1.1 and this evidence file;
- ordered 21/96 and name-set 40/11/18 comparison;
- immutable V1.0/V3.1 hashes;
- changed paths exactly the new V1.1 Design and this new evidence record; and
- branch still based directly on `6cdb0df3e9b0565e5cdfd6cac0ca4a315d0e272b` with clean status after the single Candidate commit.

The V1.1 Design SHA-256 immediately before this evidence record was added is:

```text
32323b1e1f3b3fc5df57ac83b2206211894e220efea380b2c0c248962576b9b1
```

The Candidate commit cannot be embedded without a self-reference; the exact full commit, parent, changed paths and clean state are reported in the terminal coordinator callback.

## 7. Boundary and result

The developer design pass addresses H-01 and M-01 without a Schema, Migration, ADR, dependency, persistent state, second lock, second checker/root/profile or Phase D–G expansion. This record is not independent review and does not close either finding. EV-01/EV-02 remain future Phase C implementation validation; EV-03 remains separately authorized Phase D/F validation. Only a different Fresh independent Phase C Exact Design Re-review and later Coordinator acceptance can unfreeze implementation.
