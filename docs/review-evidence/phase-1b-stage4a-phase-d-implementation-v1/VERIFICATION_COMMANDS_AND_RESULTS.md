# CWT Stage 4A Phase D Verification Commands and Results

Proof-bound code commit: `250b07d928fbdddc5b81c31162c601643fd0ee21`

This is implementation evidence, not independent review or acceptance. The controlled real-Provider gate is blocked and is explicitly recorded as `NOT_RUN`.

## Exact-base and allowlist

- Exact base/branch/ancestry and mutation allowlist comparison: **PASS**.
- `git diff --check` against `09eb6b3296dc43f579025213004606e0f0f744c0`: **PASS**.
- Dependency, lockfile, Schema, Migration, ADR and environment-schema mutation count: **0**.
- `package.json` mutation is one script only: **PASS**.

## Zero-network gates

All final commands in this section ran with both Provider and isolated-database secret variables removed from the child environment.

- `pnpm typecheck`: **PASS**.
- `pnpm lint`: **PASS**, zero-warning limit.
- `pnpm check:ai-prompts`: **PASS**.
- Phase D focused Vitest aggregate: **PASS**, 6 files / 58 tests.
- `pnpm test:ai-foundation`: **PASS**, 18 files / 185 tests passed; 7 files / 36 PostgreSQL-dependent tests skipped.
- `pnpm test:run`: **PASS**, 122 files / 654 tests passed; 7 files / 36 PostgreSQL-dependent tests skipped.
- Five selected suites against a temporary isolated PostgreSQL container: **PASS**.
- Full application build: **PASS** after the local test PGlite database received its existing migrations; no Schema/Migration source was changed.
- Isolated Next server/public bundle build and verifier: **PASS**; 51 server files, 15 public-client files, three server markers and the raw Synthetic Prompt positive marker remained server-only; positive leak control fired.
- Phase D V5.0 proof generation and source-clean proof-bound verification: **PASS**, bound to the exact code commit above.
- Credential/redaction negative tests and safe evidence projection: **PASS**.

## Database-guard correction and final provisioning

- Root cause: PostgreSQL renders `inet_server_addr()::text` as CIDR-form text for the accepted loopback transport.
- Correction: **PASS**. The query now uses PostgreSQL `host(inet_server_addr())::text`; the unchanged allowlist still accepts only bare `127.0.0.1` or `::1`.
- Positive/negative proof: **PASS** for CIDR-to-bare-host canonicalization, bare IPv4/IPv6 loopback acceptance and non-loopback rejection.
- All database-name, non-superuser, zero-session, migration, first-start/retained-state, table-emptiness, seed, Audit, `ai_runs`, Worker, fence, attempt, settlement and fail-closed checks remain unchanged.
- One new retained local provisioning attempt was made only after zero-network gates and proof-bound architecture verification.
- Provisioning stopped fail-closed at the final host-HBA compliance proof: `hba_verification_failed`.
- Protected registration update: **NOT RUN**.
- Final controlled invocation: **NOT RUN**.
- Final-attempt official-source GET: `0`; Provider POST: `0`; Provider credential path: **NOT REACHED**.
- The prior registered database target was not reused, inspected or mutated. The newly created resource was not dropped, truncated, cleaned up or disclosed after the failure.

## Authorized controlled external validation

The original implementation task invoked the controlled command once after zero-network gates. It performed two fixed official-source GETs, then stopped with `isolated_database_unavailable`; the credential path and Provider POST were not reached. Two still-earlier local CLI-entry diagnostics failed before module execution and performed no network request. That first authorized result is preserved immutably at evidence HEAD `e13690c47f44848bb2304cb093f347654bf944f8`.

The coordinator then authorized one bounded continuation using the existing launchctl registration as operator secret injection. That renewed controlled command was invoked exactly once and was not retried.

- Node 24 loopback semantic gate: **PASS**.
- Renewed-invocation official pricing source GET: **PASS**, one request.
- Renewed-invocation official chat-completion schema source GET: **PASS**, one request.
- Renewed-invocation official-source combined status/hash/fact check: **PASS**.
- Isolated non-Production validation database gate: **NOT RUN / BLOCKED**, safe code `isolated_database_guard_failed`.
- Credential read: **NOT REACHED**.
- Durable controlled `ai_runs` row/Worker execution: **NOT RUN**.
- Billable Provider POST: **NOT RUN**, count `0`.
- Real Provider output/cache/cost/latency observation: **NOT RUN**.

The controlled projection remains the immutable per-invocation result of the second authorized invocation: two fixed official-source GETs and zero Provider POSTs. The third authorized invocation never started, so its counters are zero GET/zero POST. Aggregate external history remains four official-source GETs and zero Provider POSTs. The flow must not be rerun without a separately authorized task and a compliant isolated database. `NOT RUN` is not represented as `PASS` anywhere in this package.

## Governance and unresolved facts

- Production registry remains exact-empty; no Production, protected Staging, deploy, traffic, DNS, Index, import, Push or PR action occurred.
- Supplier questionnaire, DPA, no-training, region, subprocessor and security assurances remain Owner-accepted unresolved external assurance and are not marked `PASS`.
- C-002/C-003 remain active residual controls.
- Next gate is a coordinator decision on the retained resource whose final SCRAM HBA proof failed. Any inspection, correction, cleanup, replacement or new controlled invocation requires separate authorization. Fresh independent Phase D implementation review begins only after a complete immutable real-validation Candidate; this implementation task does not self-review or self-accept.
