# CWT Stage 4A Phase D DeepSeek Text Adapter Implementation Report V1.0

Status: **The accepted V1.3 one-file implementation remains frozen; the first separately authorized formal sequence stopped at Step 1 with an unexpected closed zero-build failure before any build or V5 action.**

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

## V1.3 runtime-binding continuation result

The separately authorized continuation replaced command-name/PATH authority with the verified physical native Node identity. Its zero-resource matrix passed all nine cases, including altered path, non-file, non-executable, wrong version, alias/physical mismatch, altered ownership identity, missing identity and name-lookup fallback rejection. The formal checker then launched successfully under the explicit secret-free environment.

The formal sequence stopped at its Candidate ancestry assertion before config import. The temporary harness incorrectly treated the successful return value of a synchronous Git command as a status-bearing process result. It therefore emitted the safe fixed failure `ZERO_BUILD_CANDIDATE_ANCESTRY_CHECK_FAILED` with root category `HARNESS_EXIT_STATUS_AUTHORITY_MISMATCH`. This result does not reclassify the already Coordinator-verified Candidate ancestry and does not establish a Product/config/dependency failure.

No retry occurred. Isolated build, unchanged verifier, physical projection, canonical V5 generation, bound verification and immutable V4 reference remain `NOT_RUN`; current external/official-source/Provider/protected-state counts remain zero. Attempt 4 is unchanged and retained.

That attempt ended `BLOCKED`, not implementation acceptance. Its required next action was separate authorization to replace only the ancestry-command result authority with success-by-no-throw before beginning a new formal sequence. Phase D acceptance and checkpoint state did not change.

## V1.3 ancestry-authority continuation result

The next separately authorized continuation retained the verified physical native Node authority and replaced the temporary ancestry check with success-by-no-throw as its sole result authority. Its eight-case zero-resource matrix passed: valid ancestry data was accepted without inspecting a return status; non-ancestor and missing refs threw and failed closed; a fake status-bearing payload could not affect the outcome; status-property access remained zero; no fallback or alternate command path was used.

The one formal sequence then passed the exact Candidate ancestry assertion and reached the corrected config import. It stopped at the fixed safe boundary `ZERO_BUILD_CONFIG_ROOT_PHYSICAL_IDENTITY_ASSERTION` with code `ROOT_IDENTITY`. The projection did not expose which root-identity subcondition differed, so this report does not infer or relabel it. No further diagnostic or retry occurred.

Attempts 4 and 5 remain immutable. For this continuation, isolated build, verifier, projection, canonical V5 generation, bound verification and immutable V4 reference remain `NOT_RUN`; current external/official-source/Provider/protected-state counts are zero. The minimum next action is a Coordinator decision on a bounded read-only root-identity subcondition diagnosis before any new formal sequence. Phase E–G remain prohibited, and the project pause still follows only after independent Phase D acceptance and completion-checkpoint verification.

## V1.3 Candidate-bound root-authority continuation result

The Coordinator accepted independent diagnosis `c733a38feace0739a55e7b980a9101606ddb3dc3`, which proves all 30 frozen config/root subconditions pass and classifies Attempt 6 as a temporary ambient-workspace authority failure rather than Product/config/filesystem state. A new continuation created one clean disposable exact-`584b…` Candidate root and prepared the required Candidate-bound, `git -C`, single-realpath/device/inode self-test.

The temporary self-test entrypoint failed to parse before executing any case. It emitted no Product/config/build/V5 result and the formal sequence did not start. In accordance with the one-shot fail-closed contract, the syntax error was not corrected or retried. The exact disposable Candidate worktree and task root were removed, with zero registry or process residue.

Attempts 4–6 and the independent 30/30 diagnosis remain unchanged. This continuation used zero external/official-source/Provider/protected-state calls; build, verifier, projection, V5 and V4 reference remain `NOT_RUN`. The minimum next action is separate authorization for one corrected zero-resource root-authority self-test before any formal sequence. Phase E–G remain prohibited.

## V1.3 corrected root-authority self-test result

The next bounded task generated one fresh temporary entrypoint from the accepted Candidate-bound replacement plan. The verified physical Node executed exactly one native syntax preflight, which passed without executing a self-test case, importing Product config, mutating Git, building, accessing network or touching protected state.

The self-test entrypoint then launched exactly once with retry zero. Fourteen of 21 closed cases passed; seven case expectations returned false. The safe projection retained the case booleans but not the observed leaf for each false case, so this report does not infer a single causal subcondition. It records the fixed task result `ROOT_AUTHORITY_SELF_TEST_MATRIX_FAILED` rather than reclassifying the independent 30/30 Product/config/root diagnosis.

The formal V1.3 sequence remained frozen with launch count zero. Build, verifier, projection, V5 and immutable V4 reference remain `NOT_RUN`; all current external, official-source, Provider and protected-state counts remain zero. The temporary entrypoint, exact Candidate worktree, fixture state and task root were removed with zero scoped residue. The minimum next step is a Coordinator decision on a bounded zero-resource diagnosis or a revised closed projection that retains the observed leaf for every failed self-test case. Phase E–G remain prohibited.

## V1.3 root-authority self-test Attempt 9 result

Independent diagnosis `62d297bd7641aa7e8e2502a5de593c64b9a367a5` resolved every Attempt 8 failed case with `UNKNOWN=0` and froze the deterministic replacement order and fixtures. Attempt 9 regenerated one self-test authority from that plan rather than layering patches over discarded harness text.

The verified physical Node completed exactly one native syntax preflight and exactly one self-test launch, both with retry zero. All 21 cases matched their expected closed leaves; every executable route reported `authority_path_count=1`; the distinct-ambient exact-Candidate control passed; and the matrix retained full case id, construction class, expected leaf, observed leaf, terminal status and expectation correctness. `UNKNOWN`, generic `ROOT_IDENTITY`, mismatch and alternate authority counts are all zero.

The detailed result was atomically retained before fixture cleanup and revalidated before removal of the temporary result. The entrypoint, result, exact Candidate worktree, fixtures and task root were removed with zero scoped process or worktree residue. No Product config was imported and the formal V1.3 sequence, build, verifier, projection, V5 and immutable V4 reference remained unexecuted. Current external, official-source, Provider and protected-state counts remain zero.

This is a completed self-test gate, not Phase D acceptance or authorization to proceed automatically. The next gate is Coordinator verification and separate authorization for one formal V1.3 sequence. Phase E–G remain prohibited, and the Owner-directed project pause still follows only after independent Phase D acceptance and completion-checkpoint verification.

## V1.3 formal proof sequence Attempt 10 result

After Coordinator verification of Attempt 9, one formal V1.3 sequence was separately authorized. The pre-execution seal passed the exact clean evidence head, frozen config blob, accepted authority identities, Attempt 9 hash/PASS projection and immutable V4 object hash. A fresh formal harness then passed one native syntax preflight and an eleven-condition static semantic-binding comparison to the Attempt 9 authority contract; the 21-case self-test was not rerun.

The formal zero-build gate launched exactly once with retry zero. Its bound Candidate authority path count was one, but it returned the safe leaf `UNEXPECTED_ZERO_BUILD_FORMAL_FAILURE`, outside the harness's distinct closed formal-leaf allowlist. No raw exception or subcondition was retained, and this report does not infer the cause. No additional diagnostic, harness edit or retry occurred.

The failure stopped the ordered sequence at Step 1. Isolated build, unchanged fixture verifier, physical projection, canonical V5 generation, bound/source-clean verification and the formal immutable V4 reference step all remain `NOT_RUN`. The pre-execution V4 identity seal is not relabeled as the unexecuted Step 6 authority. Current official-source GET, Provider POST, credential and protected-state access counts are zero; aggregate history remains six GETs and zero POSTs.

The temporary formal harness, exact Candidate worktree, copied dependency topology and task root were removed with zero scoped residue; no fixture build, projection or canonical V5 directory was created. Status is `BLOCKED`, not Phase D acceptance. The minimum next step is Coordinator disposition of a bounded read-only diagnosis for the unexpected Step 1 leaf before any new formal sequence. Phase E–G remain prohibited.
