# CWT Stage 4A Phase A Acceptance-Oracle Erratum

Status: **ISSUED — L-01 DOCUMENTATION/ORACLE CORRECTION; NO CANDIDATE CHANGE**
Erratum version: `1.0`
Issued: `2026-08-10` (Asia/Shanghai)
Applies to: `0020_phase1b_ai_foundation` Phase A acceptance
Historical finding: `L-01` in the [Independent Migration Candidate Review](./PHASE_1B_STAGE4A_PHASE_A_0020_INDEPENDENT_CANDIDATE_REVIEW_V1_0.md)

## 1. Corrected oracle

Section 14.2 of the fixed [Schema Design V1.0](./PHASE_1B_STAGE4A_PHASE_A_0020_AI_FOUNDATION_SCHEMA_DESIGN_V1_0.md) says that referenced target, user, and configuration deletion tests return SQLSTATE `23503`.

For the design's explicit `ON DELETE RESTRICT` foreign keys, PostgreSQL 18.4 correctly returns:

```text
23001 — restrict_violation
```

Phase A acceptance therefore uses this corrected oracle:

1. the catalog contains the required named foreign key with explicit `ON DELETE RESTRICT`;
2. deletion of the referenced row is rejected;
3. PostgreSQL 18.4 returns SQLSTATE `23001`; and
4. the reported constraint identity matches the intended restrictive relationship.

The four independently executed cases covered a referenced model configuration, Product localization, Content localization, and Editorial Revision. All four deletes were rejected with `23001`.

## 2. Disposition of L-01

`L-01` is disposed by this versioned documentation/test-oracle correction.

- The historical finding remains visible in the independent review.
- The fixed Design V1.0 remains byte-unchanged at SHA-256 `db6ae44d3548e2c0c23ab2b95ee3550fefedb93224f878f5a9ab3070898b60a8`.
- The exact nine-file Candidate remains byte-unchanged at commit `15bc6462d2e314f50ff238af70ad31fc6502c40f`.
- `RESTRICT` is not changed to `NO ACTION` merely to produce another SQLSTATE.
- No Schema, Migration, TypeScript Schema, architecture, Domain Service, Worker, Provider, or business-code change is required.

## 3. Scope

This Erratum corrects one Phase A acceptance expectation only. It does not:

- revise ADR-0017 or ADR-0018;
- change any lifecycle, foreign-key, provenance, privacy, Draft, Publish, Index, RAG, fallback, vision, or Customer Service boundary;
- alter the fixed Schema Design V1.0;
- authorize Phase A final acceptance or Phase B;
- authorize Provider/API calls, credentials, Staging/Production deployment, Production AI, Deploy, Publish, Index, or formal import; or
- claim a Provider or Production validation result.

The independent Phase A Completion Reviewer must verify this Erratum against the exact Candidate review and evidence set rather than treating the Integration Manager as the final approver.
