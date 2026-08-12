# CWT Stage 4A Phase D DeepSeek Text Adapter Implementation Report V1.0

Status: **Implementation code candidate frozen; controlled real-Provider validation BLOCKED by unavailable isolated database.**

This report is implementation-author evidence only. It does not claim independent review, acceptance, checkpoint movement or authorization for Phase E/F/G.

## Candidate identity

- Exact accepted Design Candidate base: `09eb6b3296dc43f579025213004606e0f0f744c0`.
- Branch: `codex/phase-1b-stage4a-phase-d-implementation-v1`.
- Proof-bound code commit: `3b923ffd88166e0d03cf8d309a92b5cd98f09a50`.
- Evidence directory: `docs/review-evidence/phase-1b-stage4a-phase-d-implementation-v1/`.
- The final evidence/report commit is docs-only relative to the proof-bound code commit.

## Implemented outcome

- Replaced the Phase C composition root with one Phase D root; Production, local/test, disabled and PGlite configurations remain exact-empty or fail closed as designed.
- Added one strict DeepSeek text adapter using Node 24 built-in `fetch`, manual redirects, literal application headers, one-shot prepared dispatch, bounded timeout/bytes/UTF-8 parsing, strict success/failure allowlists and accepted retry classification.
- Added the sole lazy credential reader after all zero-network/zero-credential gates. No runner, CLI, preflight, root, repository or evidence writer can read or project the credential.
- Added accepted cache-hit/cache-miss pricing and normalized V2/V3 usage/attempt evidence without raw request, response, Prompt, context, exception, reasoning or credential material.
- Preserved the durable `ai_runs`/Worker/committed dispatch-fence authority, persisted active-actor authorization, atomic Audit, budget and terminal settlement boundaries.
- Added the exact PD-11 fixture, strict canonical loader and the authoritative `createSyntheticDefinitionV1` to `SyntheticCaseTransactionScope` route; no duplicate inline synthetic authority exists.
- Added one controlled validation authority with `maxAttempts=1`, `slotCount=1`, one pending/processing ceiling and at most one billable Provider POST.
- Added the exact two-source official DeepSeek preflight before database-secret or Provider-credential access.
- Replaced the architecture profile with V5.0 proof-bound Phase D topology, origin, non-reachability, secret, bundle and mutation-probe evidence.

## Verification outcome

- Final zero-secret `typecheck`, zero-warning `lint`, Prompt gate, Phase D contract suites, AI foundation and full repository regression: **PASS**.
- Full regression: 122 files / 653 tests passed; 7 files / 36 PostgreSQL-dependent tests skipped where that external fixture was absent.
- Separate selected durable-path suites against a temporary isolated PostgreSQL container: **PASS**.
- Full application build and isolated server/public bundle proof: **PASS**.
- Phase D V5.0 source-clean proof-bound architecture verification at the exact code commit: **PASS**.
- Official-source revalidation: **PASS** with exactly two fixed GETs and exact accepted hashes/facts.
- Controlled real-Provider validation: **NOT RUN / BLOCKED** at the isolated database prerequisite. The credential reader, durable controlled row and Provider POST were not reached; billable POST count is zero.

## Blocker and risk treatment

The accepted design requires a protected connection to an isolated non-Production PostgreSQL database whose name, role, host, session state and public-table emptiness pass strict guards. That prerequisite was unavailable in this task environment. Creating a substitute database secret, weakening the guard, using PGlite, using Production/protected Staging, or bypassing the durable path would violate the accepted design; none was attempted.

Because no Provider POST occurred, Provider output validity, cache accounting, observed cost and latency are not evidenced. These facts remain `NOT RUN`, never `PASS`. The successful source preflight cannot substitute for the real durable-path observation.

Supplier questionnaire, DPA, no-training, region, subprocessor and security assurances remain unresolved external assurance under the Owner Decision. C-002/C-003 remain active residual controls.

## Scope and rollback

- All implementation paths are inside the exact accepted mutation allowlist; `package.json` is script-only and no dependency/lockfile changed.
- No Schema, Migration, ADR, environment schema, Production Prompt, business UI, public route, SEO/Redirect, Asset/storage or Phase E/F/G mutation occurred.
- No Production, protected Staging, deploy, traffic, DNS, Index, formal import, Push, PR or checkpoint movement occurred.
- Rollback is a new branch at the exact accepted base or explicit linear reverts; no checkpoint ref is moved.

## Required next action

Status is `BLOCKED`, not implementation acceptance. The coordinator should provide or separately authorize a compliant protected isolated-validation database context and a fresh bounded validation task. That task must not replay the two official GETs or attempt a Provider POST without explicit renewed authorization. Only after a complete real durable-path result and an immutable clean evidence Candidate should a different fresh independent reviewer begin the Phase D implementation review.
