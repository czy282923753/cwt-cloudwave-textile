# CWT Phase 1A handoff

This document is the concise navigation and boundary record for work after the Phase 1A final candidate freeze. It does not replace the frozen baseline, accepted ADRs or domain specifications.

## 1. Current baseline

| Baseline item | Value |
| --- | --- |
| Branch | `main` |
| Candidate code baseline | `3a93c8ddae96f4cf70a721bfc9cbf6ed2404ee10` |
| Documentation freeze commit | The commit containing this file, immutably identified by the annotated Tag below; resolve with `git rev-list -n 1 phase-1a-postgres-stage2c-approved-2026-08-03` after the local freeze commit is created |
| Final candidate Tag | `phase-1a-postgres-stage2c-approved-2026-08-03` |
| Earlier local-approved Tag | `phase-1a-local-approved-2026-08-02` → `ad70d02192eaff6cb460ebd828b5f3e706a59c44` |
| Earlier PostgreSQL Stage 2B Tag | `phase-1a-postgres-stage2b-approved-2026-08-02` → `e65b816630d9adcdc8a143672976315d5f55eb3b` |
| Latest Migration | `0017_redirect_graph_final_state.sql`; Journal `0000`–`0017` (18 entries) |

The two earlier Tags remain immutable historical approvals. The final candidate Tag points to a documentation-only child of the candidate code baseline, so the accepted code is preserved without a self-referential commit hash in this file.

## 2. Current phase

- Phase 1A Candidate: **Frozen**.
- PostgreSQL Stage 2A / Stage 2B / Stage 2C: **Passed / Passed / Passed**.
- Findings: Blocker **0**, High **0**, Medium **0**, Low **2 existing non-blocking items**, **0 new**.
- Phase 1B: **Paused**.
- Production Ready: **No**.
- Real-product status: **Waiting for Real Product Data Validation**.

## 3. Authoritative document navigation

- [Root project rules](../AGENTS.md)
- [Engineering governance](./ENGINEERING_GOVERNANCE.md)
- [Independent review policy](./REVIEW_POLICY.md)
- [Phase plan](./PHASE_PLAN.md)
- [Phase 1A implementation and acceptance record](./PHASE_1A_IMPLEMENTATION_REPORT.md)
- [PostgreSQL external validation](./POSTGRESQL_EXTERNAL_VALIDATION.md)
- [Data model](./DATA_MODEL.md)
- [Asset and upload specification](./ASSET_AND_UPLOADS.md)
- [CRM and attribution](./CRM_AND_ATTRIBUTION.md)
- [SEO URL strategy](./SEO_URL_STRATEGY.md)
- [Publishing rules](./PUBLISHING_RULES.md)
- [ADR index](./adr/README.md)

Authority order remains the one defined in `AGENTS.md`. Implementation reports and Git history are evidence, not sources of new permanent architecture.

## 4. Current critical designs

| Design | Current authority and invariant | Boundary that must not be broken | Code and ADR |
| --- | --- | --- | --- |
| PostgreSQL Enum A+ Migration Compatibility | The standard migration entry uses one dedicated PostgreSQL Session, a bounded 0010 compatibility preflight and the original Drizzle Journal. | Do not edit historical Migrations, forge Journal rows, introduce a second Runner/Journal or broaden the adapter beyond the approved boundary. | [migration entry](../scripts/migrate.ts), [compatibility service](../src/db/postgres-enum-migration-compatibility.ts), [ADR-0010](./adr/ADR-0010-postgresql-enum-migration-compatibility.md) |
| Pre-Manifest Recovery | Durable Batch/Recovery ownership may hand an expired pre-Manifest Finalize attempt to the existing retryable path only after locked, audited invariant checks. | Do not fabricate a Manifest/compensation row, delete storage without identity authority, restore an expired Worker's authority or add a second Finalize path. | [recovery service](../src/uploads/upload-recovery-service.ts), [Asset specification](./ASSET_AND_UPLOADS.md), [ADR-0006](./adr/ADR-0006-phase1a-remediation-invariants.md) |
| Retryable Asset Batch admin entry | Asset Library queries Session-scoped eligible handoffs through the Upload Domain Service and retries the original `batchId` through the existing Finalize entry. | Do not create a new Intent, upload, Asset, relation path, Batch manager or second Finalize API; internal Lease/Recovery/Manifest details remain hidden from operators. | [admin upload service](../src/uploads/admin-upload-service.ts), [admin component](../src/admin/components/retryable-asset-batches.tsx), [Asset specification](./ASSET_AND_UPLOADS.md) |
| Redirect graph deterministic lock and deferred final-state guard | The Route/Redirect Domain Service sorts normalized paths, uses the shared transaction advisory-lock namespace, rereads/flattens the graph and commits required Audit; Migration 0017 validates final graph state at commit. | One path has one current owner; no loop, chain or dangling destination; the database guard validates but does not become a second graph writer. | [graph service](../src/seo/redirects.ts), [Migration 0017](../drizzle/0017_redirect_graph_final_state.sql), [ADR-0011](./adr/ADR-0011-deterministic-route-graph-mutations.md) |
| Inquiry fingerprint and Frozen Attachment Retry Snapshot | One global Idempotency Key names one immutable versioned fingerprint. Exact retries replay; different requests return 409. Once uploads finish, Key, payload and ordered Upload Tokens freeze together in component memory. | Do not expose an earlier Inquiry, reserve Tokens outside the Domain transaction, re-upload under the old Key, persist Tokens in browser storage or add a general replay platform. | [Inquiry service](../src/crm/inquiry-service.ts), [public form](../src/public-site/inquiry-form.tsx), [ADR-0012](./adr/ADR-0012-inquiry-idempotency-request-identity.md) |
| Product Revision compare-and-set | Applying a Product Revision atomically claims `in_review → applied` before copying the snapshot; the same reviewer may replay, while another reviewer conflicts. | Do not copy before ownership, create a Review Lease/new approval state machine or let a pending revision leak into approved public reads. | [Product service](../src/catalog/product-service.ts), [ADR-0005](./adr/ADR-0005-publishing-and-indexing.md), [Publishing rules](./PUBLISHING_RULES.md) |
| Required Audit atomicity | Governed business mutation and required Audit share one database transaction; Audit failure rolls the mutation back. Post-commit maintenance is explicitly separate. | Do not report success without its required Audit or let non-critical maintenance reverse an already committed core success. | [governed mutation](../src/audit/governed-mutation.ts), [Audit writer](../src/audit/service.ts), [ADR-0006](./adr/ADR-0006-phase1a-remediation-invariants.md) |
| Lease and fencing | Finalize ownership is established before `finalizing`; owner, expiry and version fence every stage and final commit. The lock order is Batch → Recovery → Manifest → Cleanup. | A stale or replaced Worker cannot commit, and `finalizing` cannot be made an unaudited or ownerless success path. | [admin upload service](../src/uploads/admin-upload-service.ts), [recovery service](../src/uploads/upload-recovery-service.ts), [Cleanup service](../src/uploads/object-cleanup-service.ts), [Asset specification](./ASSET_AND_UPLOADS.md) |
| Migration Session Lock | One Session Advisory Lock and Backend PID fence cover catalog inspection, compatibility preflight, Drizzle execution and final verification. | Do not use a persistent lock table, multiple physical Sessions or manual secret SQL; loss of ownership fails closed and is safely rerunnable. | [database migration](../src/db/migrate.ts), [compatibility service](../src/db/postgres-enum-migration-compatibility.ts), [ADR-0010](./adr/ADR-0010-postgresql-enum-migration-compatibility.md) |

## 5. Rejected designs

Do not reintroduce these without a new approved impact analysis and ADR:

- editing historical Migrations;
- a second Migration Runner or Journal;
- a persistent Migration lock table;
- a general distributed graph-lock framework;
- a new Idempotency table or general replay platform;
- a Review Lease or new approval state machine;
- a new Batch management system;
- parallel old/new Finalize paths;
- long-lived Upload Tokens in `localStorage` or IndexedDB;
- new states used to mask a Recovery root cause.

## 6. Lock and transaction invariants

- Redirect graph locks use the shared `cwt:redirect-graph:` namespace, normalized paths and deterministic lexical acquisition inside the mutation transaction.
- Upload/Finalize coordination locks in the established order: Batch → Recovery → Manifest → Cleanup.
- Product Revision Apply has one compare-and-set owner; snapshot application and required Audit are in the same transaction.
- An Inquiry Idempotency Key is valid only with its immutable versioned fingerprint; an attachment retry resends the same Frozen Request Snapshot.
- Every governed business state transition and required Audit commit atomically. Non-critical Post-Commit Maintenance does not redefine core success.
- Lease owner, expiry and optimistic version fence stale Finalize and Recovery Workers before persisted progress or commit.
- Deferred Redirect constraints verify the transaction's final graph; they do not repair or rewrite it.
- The migration compatibility boundary retains one Session Advisory Lock and verifies Backend PID continuity until migration verification finishes.

## 7. External Validation remaining

- R2/S3 Conditional Write, HEAD consistency, deletion, interruption recovery, Origin isolation and Public Media revocation.
- SMTP Provider delivery, Delivery Key deduplication, retry and failure recovery.
- Multi-instance distributed rate limiting against shared authoritative storage.
- Production-scale Query Plans, Index selection and fallback.
- Backup, Restore and rollout Restore Drill.
- Preview/Production deployment, required Linux architectures, Cache, DNS, CDN, monitoring and real traffic.
- Formal Product evidence, authorized Media and verified Company Facts.

These do not block the Phase 1A candidate freeze, but they block Production readiness.

## 8. Rules for the next full-stack thread

1. Rebuild context read-only from this handoff, `AGENTS.md`, the applicable domain specification and accepted ADRs before proposing changes.
2. Start new development from `phase-1a-postgres-stage2c-approved-2026-08-03`; do not redesign a frozen mechanism by default.
3. A development thread never approves its own work.
4. The first entry into a new Phase begins with one complete Discovery pass over the authorized scope.
5. Consolidate discovered problems into a bounded remediation batch instead of sending isolated partial fixes for acceptance.
6. First-stage joint review covers the whole batch and all requested rework.
7. Second-stage Acceptance reruns the complete proportional matrix from a clean environment.
8. Do not splice unrelated historical pass results into a new approval claim.
9. Phase 1B, External Validation, deployment and production actions require their own explicit authorization.
