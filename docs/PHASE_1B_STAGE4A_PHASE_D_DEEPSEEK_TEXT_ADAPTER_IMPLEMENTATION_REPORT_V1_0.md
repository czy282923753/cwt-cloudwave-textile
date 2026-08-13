# CWT Stage 4A Phase D DeepSeek Text Adapter Implementation Report V1.0

Status: **The accepted V1.3 one-file implementation remains frozen; the separately authorized absolute-runtime continuation passed its binding self-test but stopped at a zero-build harness ancestry-result authority error before config import.**

This report is implementation-author evidence only. It does not claim independent review, acceptance, checkpoint movement or authorization for Phase E/F/G.

## Candidate identity

- Exact accepted Design Candidate base: `09eb6b3296dc43f579025213004606e0f0f744c0`; accepted bounded successor: `a3e90244693eb093983e45f5f0e1e0c12d7cb6c7`.
- Branch: `codex/phase-1b-stage4a-phase-d-implementation-v1`.
- Original Phase D proof-bound code commit: `250b07d928fbdddc5b81c31162c601643fd0ee21`; current V1.3 proof-bound code commit: `584b13f6c20a893d42aba9ede69a6e86a2ed04a4`.
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

## Application-role closure and final invocation

The coordinator authorized one application-role normalization/authentication cycle. The existing dedicated role was atomically normalized to the accepted least-privileged tuple; explicit role membership and unrelated database ownership were absent. HBA semantics, listener, exact ownership, empty state and zero-other-session proofs remained closed. A new process-local credential passed wrong-password rejection and correct-password SCRAM authentication, then only the protected launchctl registration was replaced.

The final controlled invocation ran exactly once. Node loopback and both fixed official-source checks passed, consuming two GETs. The runner returned the safe projection `FAIL / controlled_validation_internal_failure` before a terminal durable result could be projected. Billable Provider POST count is zero. Credential-reader reachability is not present in the safe projection and is not inferred.

Historical totals are preserved without relabeling: the first two completed invocations used four official GETs and zero POSTs; all provisioning/HBA/role attempts before invocation used zero external calls; the final invocation used two GETs and zero POSTs. Aggregate authorized history is six official GETs and zero Provider POSTs.

The resource, protected registration and any runner-created state remain retained for authorized disposition. No inspection after the safe failure, retry, cleanup, drop or truncate occurred.

## Blocker and risk treatment

The isolated non-Production PostgreSQL resource now passes the authorized local URL-independent semantic prerequisites: loopback, dedicated identity/ownership, least-privileged role, SCRAM-only HBA/authentication, empty pre-invocation state and zero other sessions. The one controlled invocation nevertheless returned only `controlled_validation_internal_failure`. The safe projection intentionally does not disclose or support inference of the internal subcause; no diagnostic inspection was performed after that result.

The resource and protected registration were retained without drop, truncate or cleanup. Connection information and resource identifiers are absent from code, terminal output, Git, report, evidence and callback.

Because no Provider POST occurred, Provider output validity, cache accounting, observed cost and latency are not evidenced. These facts remain `NOT RUN`, never `PASS`. The successful source preflight cannot substitute for the real durable-path observation.

Supplier questionnaire, DPA, no-training, region, subprocessor and security assurances remain unresolved external assurance under the Owner Decision. C-002/C-003 remain active residual controls.

## Scope and rollback

- All implementation paths are inside the exact accepted mutation allowlist; `package.json` is script-only and no dependency/lockfile changed.
- No Schema, Migration, ADR, environment schema, Production Prompt, business UI, public route, SEO/Redirect, Asset/storage or Phase E/F/G mutation occurred.
- No Production, protected Staging, deploy, traffic, DNS, Index, formal import, Push, PR or checkpoint movement occurred.
- Rollback is a new branch at the exact accepted base or explicit linear reverts; no checkpoint ref is moved.

## Accepted V1.3 implementation and V5 prerequisite result

The Coordinator formally accepted the bounded V1.3 Design successor after fresh independent Design review PASS. The implementation replaces only `test-fixtures/ai-server-bundle/next.config.ts`: `outputFileTracingRoot` and `turbopack.root` now share the one repository root derived exactly from the retained fixture root. The frozen code Candidate changes that sole authorized path relative to evidence HEAD `2848ebc42f90e5fc47fc4ee1606aae354b18f6bd`; the old fixture-local values, fallback and dual authority are absent.

The mandatory ordered proof then stopped at its first prerequisite. The explicit secret-free zero-build environment could not resolve the verified native Node executable, so the Node checker did not start and the config/root/containment/dependency claims were not promoted to PASS. In accordance with V1.3, no retry occurred. The isolated build, unchanged fixture verifier, physical projection, canonical V5 generation, bound/source-clean verification and immutable V4 reference step all remain `NOT_RUN`.

No disposable build or V5 directory was created. Current-task external calls, official-source GETs, Provider POSTs, credential access, protected database/registration access and Staging/Production operations are all zero. Aggregate historical DeepSeek accounting remains six official GETs and zero Provider POSTs.

## Required next action

The separately authorized continuation replaced command-name/PATH authority with the verified physical native Node identity. Its zero-resource matrix passed all nine cases, including altered path, non-file, non-executable, wrong version, alias/physical mismatch, altered ownership identity, missing identity and name-lookup fallback rejection. The formal checker then launched successfully under the explicit secret-free environment.

The formal sequence stopped at its Candidate ancestry assertion before config import. The temporary harness incorrectly treated the successful return value of a synchronous Git command as a status-bearing process result. It therefore emitted the safe fixed failure `ZERO_BUILD_CANDIDATE_ANCESTRY_CHECK_FAILED` with root category `HARNESS_EXIT_STATUS_AUTHORITY_MISMATCH`. This result does not reclassify the already Coordinator-verified Candidate ancestry and does not establish a Product/config/dependency failure.

No retry occurred. Isolated build, unchanged verifier, physical projection, canonical V5 generation, bound verification and immutable V4 reference remain `NOT_RUN`; current external/official-source/Provider/protected-state counts remain zero. Attempt 4 is unchanged and retained.

Status remains `BLOCKED`, not implementation acceptance. The minimum next action is separate authorization to replace only the ancestry-command result authority with success-by-no-throw or an actual status-bearing process result before beginning a new formal sequence. Phase D must complete independent acceptance and its completion checkpoint before the Owner-directed project pause; Phase E–G remain prohibited.
