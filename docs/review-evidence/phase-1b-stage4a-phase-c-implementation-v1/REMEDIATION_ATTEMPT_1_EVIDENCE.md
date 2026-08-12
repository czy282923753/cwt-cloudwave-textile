# Stage 4A Phase C PCIR-H-01 remediation attempt 1 evidence

## Role and status

This is implementation-engineer evidence, not self-review, implementation acceptance, Phase acceptance, checkpoint authority, merge authority, Production readiness, release, Push, Deploy, or authorization to begin Phase D–G.

- Finding: `PCIR-H-01`
- Proof-bound clean code commit: `ac8101d17713727266c2076969834d201090c268`
- Pre-remediation reviewed Candidate: `e10073c4602d91fa944245864b0b5637017d81b7`
- Failed independent review commit: `91c5805b609ff687370be6610f586f641e382097`
- Accepted Exact Design base and merge-base: `21662c2c110f17cd095249fe91c2c019f6f508ab`
- Branch: `codex/phase-1b-stage4a-phase-c-implementation-v1`
- Accepted Phase B checkpoint ref target, unchanged: `cc5715f4a9eb07293bf932cfbd822bfa6bf14a45`

The implementation commits after the reviewed Candidate are ordinary local remediation commits. The final evidence commit is intentionally an evidence-only descendant of the proof-bound code commit. The new V4 proof manifest binds the executable tree to `ac8101d...`.

## Root cause and corrected authority

The root cause was caller-role authority at the Domain Service/repository boundary. A syntactically valid actor DTO was treated as sufficient, `admin` bypassed protected-run scope, configuration mutation trusted the DTO, requester equality was overused for reads/disposition, and Reviewer/Publisher had no accepted branch.

The corrected responsibility boundary is one transaction-local resolver in the Phase C PostgreSQL repository. It selects exactly one active `users` row by actor ID, derives the role type from the persisted schema, and requires exact agreement with the DTO claim. Unknown, inactive, malformed, and role-mismatched claims return the same authorization failure before protected target/config existence or state becomes distinguishable.

One capability-local Phase C operation policy implements the accepted Section 15 matrix over that persisted role. It is neither a caller-supplied permission, a Server Action/UI check, a copied permission map, nor a second repository. Protected AI does not cross the V4 capability graph into business/UI authorization runtime.

Run authorization derives Product/Content scope before distinguishable output. Direct targets require their closed target shape and English locale. Revision targets query `editorial_revisions.entity_type` and English locale inside the same service/repository transaction. Inspect/disposition allows Admin, the matching editor, and Reviewer/Publisher; enqueue allows Admin or the matching editor; cancel/manual retry additionally requires the matching editor to be the requester unless the persisted actor is Admin. Sales and Analyst receive no raw run. Config mutation requires persisted active Admin.

Required Audit uses the resolved persisted actor ID. Unauthorized attempts make no run/config mutation and no Audit. Required-Audit failure continues to roll the authorized business mutation back atomically.

## Persisted-role proof

The authorized real-PostgreSQL integration paths prove:

- persisted Sales plus claimed Admin is denied for protected read, enqueue, cancel, manual retry, disposition, and all four config commands;
- persisted active Admin positives cover protected read, enqueue, cancel, manual retry, disposition, and config create/update/activate/disable;
- Reviewer/Publisher reads Product Draft, Content Draft, Product Revision, and Content Revision runs and records Product/Content rejection/quality disposition, while enqueue/cancel/manual retry/config remain denied;
- Product and Content Editors pass only matching direct/Revision scope; cross-scope actors are denied; unrelated same-scope editors may inspect/disposition but cannot cancel/manual-retry another requester's run;
- unknown, inactive, malformed, and claim-mismatched actors fail closed;
- a persisted role change invalidates an exact replay when the authoritative target scope no longer matches; and
- existing-run and missing-run authorization failures are indistinguishable for a denied actor.

The original independent review reproduction was extracted byte-for-byte from review commit `91c5805b...` into a disposable directory and run with its original config. The test that previously passed only when all defects existed now fails at its first defect assertion: it expected the persisted Sales actor claiming Admin to read the protected Product run, but the corrected Candidate returned `ok=false`. The committed persisted-role tests separately prove the legitimate Reviewer positive and the config-mutation denial, so all three original defect observations are impossible.

## Commands and decisive results

The environment used Node `v24.14.0`, pnpm `11.9.0`, Next `16.2.12`, and one disposable local Docker PostgreSQL `17.10` database containing only conspicuously Synthetic test data. No Production credential, data, account, Provider, or external service was used.

```text
pnpm lint
pnpm typecheck
pnpm check:ai-prompts
pnpm test:ai-foundation
pnpm test:run

CWT_PHASE_C_POSTGRES_URL=<disposable-local-pg17> pnpm exec vitest run \
  src/ai/runs \
  src/ai/config/model-config-service.integration.test.ts \
  src/ai/config/model-config-repository.integration.test.ts \
  src/ai/testing/accepted-draft-atomicity-harness.integration.test.ts \
  --maxWorkers=1 --reporter=verbose

DATABASE_DRIVER=postgres DATABASE_URL=<disposable-local-pg17> pnpm build
```

Results:

- Lint, TypeScript and Prompt gate: PASS.
- AI foundation: 17 files and 174 tests PASS; 7 files/35 PostgreSQL-conditioned tests skipped.
- Full regression: 117 files and 594 tests PASS; 7 files/35 PostgreSQL-conditioned tests skipped.
- Real PostgreSQL Phase C: 11 files and 44 tests PASS.
- H-01 R1/R2/R3 barrier: PASS in both advisory-owner orders; the full real-PostgreSQL run included the exact 11.2-second database-time barrier.
- PostgreSQL application Build: PASS, 43/43 static pages generated.
- Dedicated webpack server/public fixture: PASS with 51 server files, 16 client files, all three server markers and raw Synthetic Prompt retained, zero public-client leaks, and positive controls firing.

## EV-01 and EV-02

EV-01 reran from the retained accepted harness source against disposable PostgreSQL `17.10`. It passed 13/13 plans at 100,000 `ai_runs`, 10,000 configs, all five statuses, all three target types, 365 charge days and 24 charge months. Planner controls stayed enabled. Final observations were zero advisory locks, tuple locks and idle-in-transaction sessions. The scale database was dropped and the remaining matching-database inventory was empty. Full fresh plans and cleanup facts are in `REMEDIATION_ATTEMPT_1_EV-01_POSTGRESQL_SCALE_QUERY_PLANS.json` (SHA-256 `5049975f2740da1d314f2eca1c7a084254280916fde5ad0b28db4c597d403378`).

EV-02 was freshly bundled after the proof-bound code commit from the retained harness source (SHA-256 `5e1362fd8795b86d288efc456099815d6d28094ba2b6f8982288f1fd2351e444`). It passed with maximum two simultaneous fake Provider calls, two processing plus one pending under pressure, 3/3 `draft_ready`, five heartbeat lock-busy observations, one `lease_renewal_unavailable` abort, candidate null on the abandoned processing row, and zero advisory locks/idle-in-transaction sessions. Measured demand was about `0.253` vCPU with `178,946,048` bytes maximum RSS, below the 2-vCPU/4-GiB-equivalent envelope. Full fresh output is `REMEDIATION_ATTEMPT_1_EV-02_TWO_SLOT_RESOURCE_AND_CONTENTION.json`.

## V4 proof and frozen boundaries

The sole V4 checker ran from the clean proof-bound code commit with the fresh dedicated server/public bundle inputs and emitted exactly five proofs plus one manifest under `architecture-v4-remediation1/`. It passed all inherited gates, all 28 inherited mutation probes and all six Phase C Synthetic probes. Its profile/checker identities remain unchanged; the manifest candidate is `ac8101d...`.

No Schema, Migration, ADR, dependency, lockfile, environment-authority, Provider/Prompt Production registry, Product/Content/Public/SEO/CRM/Inquiry/Asset/Upload/Import implementation, Phase D–G adapter, real Provider, SDK/network/credential/endpoint, queue, Outbox, second run history, Phase B checkpoint, or accepted review/design artifact changed. C-002 and C-003 remain active.

## Next gate

The only next gate is a Fresh independent Phase C implementation re-review of the exact evidence Candidate. This implementer does not grant acceptance or create the reviewer task/checkpoint.
