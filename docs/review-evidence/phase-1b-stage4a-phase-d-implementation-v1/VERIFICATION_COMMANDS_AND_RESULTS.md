# CWT Stage 4A Phase D Verification Commands and Results

Proof-bound code commit: `3b923ffd88166e0d03cf8d309a92b5cd98f09a50`

This is implementation evidence, not independent review or acceptance. The controlled real-Provider gate is blocked and is explicitly recorded as `NOT_RUN`.

## Exact-base and allowlist

- Exact base/branch/ancestry and 39-path mutation allowlist comparison: **PASS**.
- `git diff --check` against `09eb6b3296dc43f579025213004606e0f0f744c0`: **PASS**.
- Dependency, lockfile, Schema, Migration, ADR and environment-schema mutation count: **0**.
- `package.json` mutation is one script only: **PASS**.

## Zero-network gates

All final commands in this section ran with both Provider and isolated-database secret variables removed from the child environment.

- `pnpm typecheck`: **PASS**.
- `pnpm lint`: **PASS**, zero-warning limit.
- `pnpm check:ai-prompts`: **PASS**.
- Phase D focused Vitest aggregate: **PASS**, 6 files / 57 tests.
- `pnpm test:ai-foundation`: **PASS**, 18 files / 184 tests passed; 7 files / 36 PostgreSQL-dependent tests skipped.
- `pnpm test:run`: **PASS**, 122 files / 653 tests passed; 7 files / 36 PostgreSQL-dependent tests skipped.
- Five selected suites against a temporary isolated PostgreSQL container: **PASS**.
- Full application build: **PASS** after the local test PGlite database received its existing migrations; no Schema/Migration source was changed.
- Isolated Next server/public bundle build and verifier: **PASS**; 51 server files, 15 public-client files, three server markers and the raw Synthetic Prompt positive marker remained server-only; positive leak control fired.
- Phase D V5.0 proof generation and source-clean proof-bound verification: **PASS**, bound to the exact code commit above.
- Credential/redaction negative tests and safe evidence projection: **PASS**.

## Authorized controlled external validation

The controlled command was invoked exactly once after zero-network gates. Two earlier local CLI-entry diagnostics failed before module execution and performed no network request; after the executable-entry correction, the authorized controlled invocation was not retried.

- Node 24 loopback semantic gate: **PASS**.
- Official pricing source GET: **PASS**, one request.
- Official chat-completion schema source GET: **PASS**, one request.
- Official-source combined status/hash/fact check: **PASS**.
- Isolated non-Production validation database gate: **NOT RUN / BLOCKED** because the protected database prerequisite was unavailable.
- Credential read: **NOT REACHED**.
- Durable controlled `ai_runs` row/Worker execution: **NOT RUN**.
- Billable Provider POST: **NOT RUN**, count `0`.
- Real Provider output/cache/cost/latency observation: **NOT RUN**.

The external request total is exactly two fixed official-source GETs and zero Provider POSTs. The flow must not be rerun without a separately authorized task and a compliant isolated database. `NOT RUN` is not represented as `PASS` anywhere in this package.

## Governance and unresolved facts

- Production registry remains exact-empty; no Production, protected Staging, deploy, traffic, DNS, Index, import, Push or PR action occurred.
- Supplier questionnaire, DPA, no-training, region, subprocessor and security assurances remain Owner-accepted unresolved external assurance and are not marked `PASS`.
- C-002/C-003 remain active residual controls.
- Next gate after prerequisite resolution and a newly authorized controlled run is a fresh independent Phase D implementation review; this implementation task does not self-review or self-accept.
