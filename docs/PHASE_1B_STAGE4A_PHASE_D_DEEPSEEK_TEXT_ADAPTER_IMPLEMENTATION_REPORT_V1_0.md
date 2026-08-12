# CWT Stage 4A Phase D DeepSeek Text Adapter Implementation Report V1.0

Status: **Database-guard correction proof-bound; retained-resource HBA semantics closed, but final controlled validation BLOCKED before invocation by application-role semantic proof.**

This report is implementation-author evidence only. It does not claim independent review, acceptance, checkpoint movement or authorization for Phase E/F/G.

## Candidate identity

- Exact accepted Design Candidate base: `09eb6b3296dc43f579025213004606e0f0f744c0`.
- Branch: `codex/phase-1b-stage4a-phase-d-implementation-v1`.
- Proof-bound code commit: `250b07d928fbdddc5b81c31162c601643fd0ee21`.
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
- Renewed-invocation official-source revalidation: **PASS** with exactly two fixed GETs and exact accepted hashes/facts.
- Renewed controlled real-Provider validation: **NOT RUN / BLOCKED**, safe code `isolated_database_guard_failed`. The credential reader, durable controlled row and Provider POST were not reached; billable POST count is zero.
- Historical external-call accounting is explicit: the first authorized invocation preserved at evidence HEAD `e13690c47f44848bb2304cb093f347654bf944f8` used two official GETs and zero Provider POSTs before `isolated_database_unavailable`; the renewed invocation used two official GETs and zero Provider POSTs. Aggregate authorized history is four GETs and zero Provider POSTs, while the final controlled projection correctly remains per-invocation.

## Database-guard causal correction

The coordinator's read-only reproduction identified a representation mismatch: PostgreSQL returns IPv4 `inet_server_addr()::text` with a CIDR suffix, while the semantic guard accepts the bare loopback host. The correction changes only the query projection to `host(inet_server_addr())::text`; the exact bare IPv4/IPv6 loopback allowlist and all following guards remain unchanged.

Tests bind the SQL operation, prove canonical CIDR-to-bare-host behavior, accept only the two existing bare loopbacks and retain a non-loopback negative. Final `typecheck`, zero-warning `lint`, Prompt, focused Phase D, AI foundation, full regression and proof-bound V5 architecture gates passed against the new code commit.

## Final provisioning result

After all zero-network gates passed, one new local resource was provisioned from a pinned local PostgreSQL image using host networking and protected ephemeral initialization inputs. Provisioning stopped fail-closed at the final host-HBA compliance proof with safe code `hba_verification_failed`. No protected launchctl registration update occurred, so the authorized controlled invocation did not start: current-attempt official GET count `0`, Provider POST count `0`, Provider credential path not reached.

The prior registered target was not reused, inspected or mutated. The newly created resource was left retained without drop, truncate, cleanup or disclosure as required after the single failed attempt. The report does not infer the failing HBA subcondition.

## Retained-resource HBA closure result

The coordinator authorized one disposition cycle against only the exact retained resource. Resource provenance, pinned local image, host-network state, dedicated catalog identity, zero business/AI/Audit rows and zero other client sessions were established without projecting any identifier. The unreadable failed HBA state was replaced once with a minimal local-admin plus IPv4/IPv6 loopback SCRAM-only policy and reloaded.

The effective HBA semantic proof and loopback listener proof passed. A newly generated protected application credential was rotated through stdin without disclosure. Closure then stopped fail-closed at the application-role semantic proof with safe code `role_semantic_proof_failed`. Wrong-password/correct-password proofs, launchctl registration replacement and the controlled invocation were not reached. This task therefore used `0` official GET and `0` Provider POST; aggregate history remains `4` official GET and `0` Provider POST.

The one HBA correction cycle was not retried. The exact resource remains retained without cleanup, drop or truncate, and the prior protected registration target remains untouched.

## Blocker and risk treatment

The accepted design requires a protected connection to an isolated non-Production PostgreSQL database whose URL shape, loopback address, database name, role, session state and public-table state pass strict guards. The coordinator-provided launchctl registration was injected exactly once into the controlled child process without separate value observation, but the runner returned `isolated_database_guard_failed`. The safe projection intentionally does not disclose or infer which individual database guard rejected the context. Creating a substitute database, weakening the guard, using PGlite, using Production/protected Staging, or bypassing the durable path would violate the accepted design; none was attempted.

The database was not dropped, truncated, cleaned up or inspected outside the accepted runner. Its connection information is not present in code, terminal output, Git, report or evidence.

Because no Provider POST occurred, Provider output validity, cache accounting, observed cost and latency are not evidenced. These facts remain `NOT RUN`, never `PASS`. The successful source preflight cannot substitute for the real durable-path observation.

Supplier questionnaire, DPA, no-training, region, subprocessor and security assurances remain unresolved external assurance under the Owner Decision. C-002/C-003 remain active residual controls.

## Scope and rollback

- All implementation paths are inside the exact accepted mutation allowlist; `package.json` is script-only and no dependency/lockfile changed.
- No Schema, Migration, ADR, environment schema, Production Prompt, business UI, public route, SEO/Redirect, Asset/storage or Phase E/F/G mutation occurred.
- No Production, protected Staging, deploy, traffic, DNS, Index, formal import, Push, PR or checkpoint movement occurred.
- Rollback is a new branch at the exact accepted base or explicit linear reverts; no checkpoint ref is moved.

## Required next action

Status is `BLOCKED`, not implementation acceptance. The coordinator must decide whether and how to disposition the retained resource after its application-role semantic proof failed despite compliant HBA semantics. Any further inspection, mutation, cleanup, replacement or controlled invocation requires separate authorization. Only after a complete real durable-path result and an immutable clean evidence Candidate should a different fresh independent reviewer begin the Phase D implementation review.
