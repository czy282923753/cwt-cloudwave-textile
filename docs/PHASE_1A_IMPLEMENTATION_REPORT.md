# CWT Phase 1A implementation report

Initial report: 2026-08-02; final candidate freeze: 2026-08-03

Baseline: frozen CWT Product and Technical Architecture V1.1 plus `AGENTS.md`

## Phase 1A final candidate freeze — 2026-08-03

| Acceptance field | Final status |
| --- | --- |
| Phase 1A Local Executable Scope | **Passed** |
| Independent Review | **Passed** |
| PostgreSQL Stage 2A / 2B / 2C | **Passed / Passed / Passed** |
| Blocker | **0** |
| High | **0** |
| Medium | **0** |
| Low | **2 existing non-blocking items; 0 new** |
| Phase 1A Candidate | **Frozen** |
| Local development-review loop | **Closed** |
| Phase 1B | **Paused** |
| Remaining external validation | **Waiting** |
| Real-product validation | **Waiting for Real Product Data Validation** |
| Production Ready | **No** |

The final candidate code baseline is `3a93c8ddae96f4cf70a721bfc9cbf6ed2404ee10`. Its Stage 2C freeze is recorded by the annotated tag `phase-1a-postgres-stage2c-approved-2026-08-03` on the documentation-only closure commit. The independently accepted earlier local code baseline remains `94c7ee5df5dc58bb9e28d8a555e90a93d24846da`, and its original Tag remains immutable.

The PostgreSQL Stage 2B candidate code baseline is `4b092be396ca54a3e6fe6ec37dc75a7d327ea146`. The original local-acceptance Tag remains immutable at its original documentation closure commit.

Stage 2A, Stage 2B and Stage 2C passed independently against PostgreSQL 18.4 ARM64. This freezes the Phase 1A candidate but does not mean R2/S3, SMTP, distributed rate limiting, production-scale Query Plans, Backup/Restore or Deployment has passed. Production Ready: **No**.

## PostgreSQL Stage 2C independent acceptance — 2026-08-03

| Acceptance field | Result |
| --- | --- |
| Candidate code baseline | `3a93c8ddae96f4cf70a721bfc9cbf6ed2404ee10` |
| PostgreSQL | **18.4 ARM64; official image digest locked** |
| Stage 2A / Stage 2B / Stage 2C | **Passed / Passed / Passed** |
| Journal / tables / enums / triggers | **18 (`0000`–`0017`) / 55 / 44 / 8** |
| Blocker / High / Medium | **0 / 0 / 0** |
| Low | **2 existing non-blocking items; 0 new** |
| Phase 1B | **Paused** |
| Production Ready | **No** |

Independent acceptance used a new isolated container, Volume, Role and database with synthetic data only. Fresh `0000 → 0017`, repeat no-op, and `0005`, `0010`, `0011`, `0012`, `0014`, `0015`, `0016 → 0017` upgrades passed without Enum-compatibility regression. Upload/Finalize/Recovery/Cleanup concurrency, exact Inquiry attachment replay, Route/Redirect graph locking and deferred final-state constraints, Product Revision compare-and-set, Migration Session Lock, normal lock order and the deliberate `40P01` deadlock-victim rollback passed. Seed and Readiness were idempotent, the complete quality gate passed, and the final database had no idle-in-transaction Session, waiting lock or Advisory Lock.

The two retained Low items are Harness-maintenance debt, not product defects: the ordinary suite does not continuously carry the complete race between two operating-system Migration processes, and part of the broader Stage 2C matrix remains in temporary Acceptance Harnesses. The critical D01/D02/D03 PostgreSQL Harness is Git-managed. No code, test, Schema, Migration, Snapshot, Journal or dependency changed during independent acceptance.

## Independently reproduced local evidence

- Runtime: Node 24.14.0 ARM64 and pnpm 11.9.0.
- ESLint: passed.
- TypeScript strict: passed.
- Drizzle Check and Generate: passed with no schema delta.
- Vitest: 47/47 files and 142/142 tests passed.
- Fresh/Upgrade Migration and repeatable Seed checks: passed in the local validation environment.
- Production Build: passed; 40/40 route/static-generation units completed.
- Playwright: 18/18 passed with `retries=0`.
- Principal public HTTP paths: 11/11 passed.
- Public Bundle check: passed; Refine and Admin dependencies did not enter the public Bundle.
- Dependency Audit: no known production vulnerabilities.
- Desktop Chromium and Pixel 7 coverage: passed.
- Sampled Axe checks: no Critical or Serious findings.
- Git working tree at independent acceptance: clean.

These results are local-scope evidence. They do not replace validation against real providers, production infrastructure, or reviewed real data.

## PostgreSQL Stage 2B independent acceptance — 2026-08-02

| Acceptance field | Result |
| --- | --- |
| PostgreSQL | **18.4 ARM64** |
| Stage 2A | **Passed** |
| Stage 2B | **Passed** |
| Candidate code baseline | `4b092be396ca54a3e6fe6ec37dc75a7d327ea146` |
| Blocker / High / Medium | **0 / 0 / 0** |
| Low | **1 non-blocking Harness automation debt** |
| Code review | **Passed** |
| Stage 2C | **Waiting; not authorized** |
| Phase 1B | **Paused** |

Independent evidence records Fresh and repeat Migration success; successful upgrades from 0005, 0010, 0011, 0012 and 0014; correction of the original SQLSTATE `55P04` path; preservation of the Journal and original 0011 hash; and the expected catalog of 55 tables, 44 enums and 6 triggers. Constraint behavior, idempotent Seed and Readiness checks passed, identifier truncation produced no actual collision, the Git worktree was clean, and no formal data or production credential was used.

The retained Low is that the formal Harness does not yet automate direct termination of a running Migrator Backend or competition between two operating-system Migration processes. Independent review used temporary real fault injection to validate the implementation safely. This debt is non-blocking and may be completed during future Migration Harness maintenance; no code change is required for this freeze.

## PostgreSQL Stage 2C-1 Pre-Manifest Recovery remediation — 2026-08-02

Independent PostgreSQL Stage 2C-1 stopped with one High: after an expired Finalize lease was reclaimed before Manifest registration, `recoverUploadRecoveryJob()` passed an absent `latestManifestAttempt` into the Attempt-scoped Cleanup query. Real PostgreSQL rejected the undefined value and left the new Recovery owner in `processing` with the Batch still `finalizing` and no continuing action.

The correction removes that non-null assumption and separates three existing conditions without adding persistent state:

- a legal pre-Manifest takeover uses the existing audited `Batch=failed` and `Recovery=retryable` Finalize handoff;
- a present Manifest keeps the existing Manifest, compensation and Cleanup path;
- a stage, Public state or projection that contradicts Manifest authority fails closed through the existing audited dead/manual-review path without storage deletion or Asset release.

The handoff transaction revalidates Batch, current Recovery owner, unexpired lease and optimistic version under the established lock order. A required-Audit failure rolls back the handoff and leaves the claimed Recovery lease discoverable for later expiry/retry. The next authorized Finalize claim completes through the existing entry point; the expired Worker remains fenced.

Directed local evidence passes 22/22 tests across the Upload Saga and Finalize/Cleanup race suites. The complete local gate passes ESLint, TypeScript strict, Drizzle Check, Drizzle Generate with no Schema delta, 48/48 Vitest files and 150/150 tests, a fresh Next.js production build with 40/40 generated page units, and Playwright 18/18.

A new disposable PostgreSQL `18.4 (Debian 18.4-1.pgdg13+1)` database with two independent connections passes valid-lease denial, unique expired-lease takeover, second-worker `not_claimed`, stale-worker fencing, pre-Manifest retry and completed Finalize, required-Audit rollback, zero idle-in-transaction sessions and zero residual locks. The disposable development container was removed after validation; the retained independent Stage 2C-1 evidence container/database/volume was not modified.

No table, Migration, Schema field, state, enum, Worker, Lease, Recovery type, queue or scheduler was added. The persistent state machine is unchanged. Independent review subsequently confirmed this High is fixed. This paragraph records the remediation checkpoint; the later independent Stage 2C acceptance at candidate `3a93c8ddae96f4cf70a721bfc9cbf6ed2404ee10` supersedes its interim stopped status. Phase 1B remains paused.

## PostgreSQL Stage 2C-1 retryable Asset Admin recovery remediation — 2026-08-02

Independent review confirmed the prior Pre-Manifest Recovery High is fixed and identified one remaining Medium: the server could preserve an eligible `Batch=failed`, `failure_reason=finalize_recovered_retryable`, `Recovery=retryable` handoff, but Asset Library did not surface the original `batchId` or provide a retry action. Operators could only start another upload, making the persisted recovery path operationally inaccessible.

The correction adds one read model to the existing Admin Upload Domain Service and one small Asset Library recovery section. Eligibility is fail-closed and Session-scoped: it checks the authorized failure reason, due/unlocked retryable Finalize Recovery, unconsumed passed Intents, Private/Internal Ready and scan-passed Assets, completed Staging Recoveries, unexpired records, available association targets, existing Private objects, and absence of a Manifest or Public compensation state. The UI shows safe file name/time and an understandable interrupted-processing reason, calls the existing Finalize API with the original `batchId`, prevents duplicate clicks, announces pending/success/safe failures, and navigates back to freshly persisted Asset data. Lease, version, Manifest, Cleanup and provider errors remain hidden from operators.

No new Intent, upload, Asset or Finalize path is created. No table, Migration, Schema field, state, enum, Worker, Lease, queue, Recovery type or service layer was added. The existing Finalize claim, owner/Session checks, lease/version fencing, idempotent completed result, relationship insertion and compensation rules remain authoritative; there is no new/old dual path. Complexity rises only by the bounded eligibility query and UI component while operational complexity falls because the existing recovery is now usable without re-upload.

Directed PGlite and UI evidence passes 2 integration tests and 3 component tests, covering eligibility/exclusions, permissions and owner/Session isolation, active-lease exclusion, stale-version rejection, original-Batch Finalize, idempotent completion, no duplicate Intent/Asset/relation/Cleanup identity, pending/duplicate-click behavior, ARIA feedback and sanitized failure handling. A dedicated Playwright fixture uses only synthetic test data and a test-only Session; the complete browser suite passes 19/19 with retries disabled, including removal of the retry prompt and display of the persisted Public Asset.

A new disposable PostgreSQL `18.4 (Debian 18.4-1.pgdg13+1)` database with two independent connections verifies the original retryable Batch query and Finalize, no duplicate Intent/Asset and exactly one intended relation, active-lease denial, expired takeover, stale-worker fencing, required-Audit rollback, zero idle-in-transaction sessions and zero residual locks. The disposable container was removed; the retained independent Stage 2C evidence environment was not touched.

The full local gate passes ESLint, TypeScript strict, Drizzle Check/Generate with no Schema or Migration delta, 50/50 Vitest files and 155/155 tests, a fresh Next.js production build with 40/40 generated page units, Public Bundle isolation, dependency audit with no known production vulnerability, and Playwright 19/19 with `retries=0`. This was the remediation checkpoint. Independent review and the complete Stage 2C rerun later passed at the final candidate baseline; Phase 1B remains paused.

## PostgreSQL Stage 2C Discovery D01–D03 combined remediation — 2026-08-02

The Discovery Sweep found three independent concurrency ownership gaps on supported paths: Route/Redirect graph mutations could validate different snapshots; one Inquiry Idempotency Key did not identify the immutable request it represented; and two Product Revision reviewers could apply the same `in_review` revision. The project owner authorized one combined remediation batch after the shared calling-chain and transaction analysis.

- **D01:** Route and Redirect graph mutations now normalize the affected paths, take shared path-scoped transaction advisory locks in deterministic order, reread the graph and commit only a flattened valid result. A route move uses a bounded closure retry when newly discovered inbound Redirects expand the lock set. Forward Migration 0016 replaces the existing database trigger functions with the same lock namespace and last-defense invariants.
- **D02:** the existing Inquiry row now stores an immutable versioned request fingerprint. The Inquiry Domain Service owns lookup, comparison, upload-token reservation/consumption, Contact/Inquiry/attachment/history/Outbox creation and required Audit in one transaction. Exact semantic retries replay the first result; different content with the same key returns the stable `INQUIRY_IDEMPOTENCY_CONFLICT` HTTP 409 and never exposes the prior Inquiry. No separate idempotency table or API was added.
- **D03:** Product Revision Apply conditionally claims the existing revision state before any snapshot side effect. The claim, Product/SEO copy, reviewer identity and required Audit are atomic; the recorded reviewer has an idempotent retry while another reviewer receives a conflict. No approval state or workflow was added.

Migration `0016_lumpy_whistler.sql` adds only the two nullable Inquiry fingerprint columns and their consistency Check Constraint, plus the forward trigger-function replacements. It adds no table, Worker, queue, lease, Recovery type or parallel authority. The route-side Inquiry idempotency shortcut, separate reserve/finalize/release token path and late Product Revision state update were removed or replaced rather than retained as dual paths.

A new disposable PostgreSQL `18.4 (Debian 18.4-1.pgdg13+1)` instance with independent clients and explicit database barriers passed all three overlap scenarios: the Route graph ended flattened with no chain; equal Inquiry requests produced one creation and one replay while different requests produced one creation and one conflict; and competing Product Revision reviewers produced one owner, one required Audit and one conflict. No advisory lock or idle-in-transaction Session remained. This paragraph records local remediation evidence; the later joint review and independent Stage 2C run passed at the final candidate baseline. Phase 1B remains paused.

The final local gate passes Node 24.14.0 ARM64/pnpm 11.9.0 environment diagnosis, ESLint, TypeScript strict, Drizzle Check and Generate with no additional Schema delta, 52/52 Vitest files and 165/165 tests, Fresh/repeat and 0005/0010/0011/0012/0014/0015 PostgreSQL upgrades, repeat Seed and Readiness, a fresh Production Build with 40/40 generated page units, Public Bundle isolation, Production Dependency Audit with no known vulnerability, and Playwright 19/19 with retries disabled. The disposable remediation database/container and temporary Harness were removed; the retained independent Discovery evidence environment was not modified.

## Stage 2C joint-review D01/D02 remediation — 2026-08-03

The joint independent review passed D03 Product Revision Apply and returned two blocking Mediums: the 0016 immediate database trigger could accept a direct SQL Route move whose final state left an inbound Redirect dangling, and the public Inquiry form retried a lost attachment response with the old Idempotency Key but newly uploaded Tokens. This batch addresses only those two findings and keeps the previously accepted D03 design as regression scope.

- **D01:** forward Migration `0017_redirect_graph_final_state.sql` adds affected-path deferred constraint triggers. The existing Domain Service remains the only graph writer and retains its deterministic lock/flattening behavior. At commit the database rejects a current Route at an active source, a non-current destination, or an active Redirect destination/source chain. Direct failure rolls Route, Redirect and required Audit back together; legal `X → Z`, `Y → Z` flattening commits.
- **D02:** after uploads finish, the form stores one immutable component-memory attempt containing the exact Key, request/attribution payload, ordered Upload Tokens and safe filenames. Network/timeout/interrupted-response and result-uncertain 5xx retry the same snapshot without a new Intent or upload. A definitive 4xx/409 requires explicit start-over, which clears the attempt and uses a new Key and uploads. Controlled fields and a focused ARIA summary prevent React reset from erasing the understandable request state.
- **D03 regression:** real PostgreSQL still produces one Apply owner, one required Audit and one loser conflict; winner replay is idempotent and required-Audit failure rolls ownership and copy back.

New disposable PostgreSQL 18.4 evidence passes the dangling direct write (`23514`), legal flattened move, real advisory-lock wait/closure retry, reciprocal adversarial write protection, same/different Inquiry fingerprint races, D03 ownership and zero residual advisory lock/idle transaction. The Migration matrix passes Fresh/repeat and 0005/0010/0011/0012/0014/0015/0016 upgrades. Repeat Seed and Readiness pass with 55 tables. Browser fault injection lets the server commit the first attachment request, hides that response from the page, then confirms an exact 200 replay with one Upload Intent and one object upload.

No existing table, field, enum, state, Worker, Lease, queue, Recovery type, API or approval path was added. There is no old/new parallel submission or graph mutation path. Persistent complexity is unchanged; runtime complexity increases only by final-state validation over changed graph endpoints and one bounded in-memory public-form state machine. The complete local gate passes environment diagnosis, ESLint, TypeScript strict, Drizzle Check/Generate with no Schema delta, 53/53 Vitest files and 169/169 tests, a fresh Production Build with 40/40 generated page units, Public Bundle isolation, Production Dependency Audit with no known vulnerability, and Playwright 20/20 with `retries=0`. Joint independent review and the fresh PostgreSQL Stage 2C run subsequently passed at candidate `3a93c8ddae96f4cf70a721bfc9cbf6ed2404ee10`. The approved freeze is recorded at the top of this report; Phase 1B remains paused.

## Remaining External Validation Required

1. R2/S3 Conditional Write, HEAD consistency, deletion, interruption recovery, Origin isolation and Public Media revocation against the real provider.
2. SMTP Provider delivery, Delivery Key deduplication, retry and failure recovery.
3. Multi-instance distributed rate limiting using shared authoritative storage, including contention, Trusted Proxy and fail-closed behavior.
4. Production-scale Query Plans, Index selection and fallback behavior.
5. Backup, Restore and rollout Restore Drill.
6. Preview/Production deployment across required Linux architectures, Cache, DNS, CDN, monitoring and real traffic.
7. Formal Product evidence, authorized Media and verified Company Facts.

PostgreSQL Stage 2A, Stage 2B and Stage 2C are completed evidence and are not repeated in this remaining list. These remaining items do not block the Phase 1A candidate freeze, but they do block Production readiness. They do not start automatically, and Phase 1B remains paused.

## Document authority

This implementation report records final status, reproducible evidence, external-validation boundaries, and the Git baseline. It does not define new permanent architecture. Permanent rules remain governed by `AGENTS.md`, approved ADRs, the applicable domain specifications, `docs/ENGINEERING_GOVERNANCE.md`, and `docs/REVIEW_POLICY.md`.

---

## Historical implementation evidence

The remaining sections preserve pre-acceptance implementation and remediation evidence. They are historical records, not newer architecture rules or current Phase recommendations; the final status above supersedes their interim review recommendations.

### PostgreSQL enum compatibility implementation evidence — 2026-08-02

Independent Stage 2B found SQLSTATE `55P04` on the real PostgreSQL 18.4 `0010 → latest` path. The cause was limited to Drizzle's one-transaction pending-migration batch: 0011 added `finalizing` to an enum committed by 0010, and 0013 used the uncommitted value. Fresh did not expose the boundary because PostgreSQL permits values added to an enum type created in the current outer transaction.

ADR-0010 adds one migration-only compatibility module. A dedicated `max: 1` postgres.js client holds one Session Advisory Lock; Backend PID checks fence inspection, an independently committed enum preflight, Drizzle execution and final verification. `reserve()` was evaluated but postgres.js 3.4.9's reserved runtime client does not expose the `begin()` required by Drizzle. The documented single-connection client is used as the equivalent mechanism and is rejected unless `options.max === 1`.

The adapter validates the approved 0011 hash and exact target statement. Only exact Journal-0010 compatibility/recovery states receive an in-memory `IF NOT EXISTS` form for that one statement; the original hash continues into Drizzle's existing Journal, and all remaining SQL is unchanged. There is no second Journal, historical Migration edit, business Schema change or manual SQL step.

New disposable PostgreSQL `18.4 (Debian 18.4-1.pgdg13+1)` evidence passes Fresh/repeat; 0005, 0010, 0011, 0012 and 0014 upgrades/repeat; the real `pnpm db:migrate` 0010 entry; preflight failure and post-commit recovery; SQLSTATE 42501 enum rollback; 0011/0013 SQLSTATE 42710 batch rollback with Journal retained at 0010; two-client exclusion; backend-termination lock release; and Journal/catalog fail-closed handling. Catalog signatures and one synthetic taxonomy fixture match/persist across upgrade paths. This implementation evidence was subsequently accepted by independent PostgreSQL 18.4 Stage 2B review. At that checkpoint Stage 2C had not started and Phase 1B was paused; the final status at the top of this report supersedes that interim state.

### Post-Commit Boundary Closure record

Scope: only the sixth independent review's one Medium and three Low findings: Finalize core/post-commit result consistency, completed-Finalize idempotency, lock-after-read Cleanup identity, Finalize Recovery FK integrity, and historical Manifest evidence governance. Phase 1B, real PostgreSQL/R2/S3/SMTP acceptance, Excel import, AI, multilingual work, deployment, DNS, formal data and unrelated redesign remain excluded.

## 1. Authorized finding results

- Medium — a committed Finalize could return failure when later Private Cleanup/Audit failed: fixed locally.
- Low — Cleanup did not explicitly compare the complete authority after locking: fixed locally.
- Low — `object_cleanup_jobs.finalize_recovery_id` lacked a database FK: fixed locally.
- Low — inferred historical Variant Manifest metadata could be treated as verified evidence: fixed locally.
- Authorized-scope self-check after the full gate: Blocker 0, High 0, Medium 0, Low 0. Independent review remains authoritative; Phase 1B stays paused.

## 2. Finalize core transaction boundary

The fenced core path validates User/Auth Session/permission, Batch, Recovery owner/lease/version/attempt, exact Manifest and Public compensation projection, and actual Public object bytes. One database transaction then activates Assets/Variants and relations, consumes Intents, completes Batch and Recovery, cancels every exact Public compensation row, preregisters durable Private staging cleanup, records byte-backed Manifest evidence and writes all required Audit Logs. Any core business write or Audit failure rolls this transaction back and enters the existing fail-closed compensation path; it cannot report success.

## 3. Post-Commit Cleanup isolation

Private cleanup wake/claim/delete/status reconciliation begins only after the core transaction returns. Its error boundary is structurally outside the core Finalize catch. Wake failure, provider delete failure, cleanup-state Audit failure, persistent Audit-writer outage and maintenance-warning Audit failure keep the cleanup row pending/retryable and return committed success plus a sanitized, non-blocking warning. These paths never call `markFinalizeRecoveryRequired`, re-arm Public compensation, alter the completed Batch/Recovery or expose provider/database errors. The Admin UI announces “uploaded and released,” may append the cleanup warning, navigates to the persisted Asset and never suggests re-uploading.

## 4. Completed Finalize idempotency and catch defense

The Finalize entry and core catch both re-read authoritative state. A completed result is returned only for the original active User/Auth Session when all Intents belong to the Batch and are consumed, every Asset is Public/Ready/Passed, Recovery is completed with no lease, attempt/version-aligned Manifest evidence is verified, every Public compensation row is exactly matched/cancelled, and each actual stored object still matches MIME and byte size. It returns the same Asset IDs, Batch ID, `alreadyFinalized: true`, cleanup state and safe message without another Public write. Another User/Session, mismatched Batch/Intent/Asset/Recovery/projection, or missing/mutated object fails closed. A genuinely completed Finalize is never converted into a lease error or failure compensation.

## 5. Cleanup lock-after-read identity

The worker may pre-read a candidate only to locate work. In the transaction it locks Batch, Intent, Recovery, Manifest, Asset and Cleanup, re-reads the job and compares Job/Batch/Intent/Recovery/version/attempt/Manifest/Asset/partition/kind/key/role/MIME/byte size plus current Cleanup and Recovery states. Deletion occurs only from this locked authority. Any mismatch makes zero storage-delete calls and writes an audited `dead`/manual-review result with a safe reason. If that Audit fails, the status transition rolls back and the work remains retryable.

## 6. Migration 0015 and schema changes

`0015_post-commit-boundary-closure.sql` is forward-only; Migrations 0013/0014 are unchanged. It adds cleanup-kind and Manifest-evidence enums; complete Cleanup Intent/Recovery-version/Manifest identity; observed Manifest MIME/size/time and verification source/status; Intent and Manifest indexes; a nullable restrictive `finalize_recovery_id → upload_recovery_jobs.id` FK; a restrictive Manifest/Recovery FK; and a restrictive Cleanup/Manifest FK. Finalize Cleanup rows are Check-constrained to Public partition plus complete Recovery/Manifest/object metadata. Null remains legal for generic cleanup. Existing orphan Finalize references or incomplete Finalize identity abort upgrade for manual governance instead of being deleted or fabricated.

All pre-0015 Manifest records are conservatively marked `unverified` with source `migration_0015_legacy_inferred`; old inferred byte/time fields remain historical diagnostics only. Public eligibility and controlled media delivery reject unverified evidence for the authoritative completed Recovery attempt. Superseded attempts remain unverified history and cannot authorize or poison the later fenced attempt. The authorized revalidation reads actual original and Variant storage bytes, verifies magic MIME/size and complete Asset/Recovery/attempt/Cleanup identity, updates actual Asset/Variant sizes, and records observed values/time plus `verified` status with system Audit in one transaction. Audit failure rolls it back.

## 7. Files changed

New files: Migration/Snapshot `0015_post-commit-boundary-closure` and `src/uploads/post-commit-boundary.static.test.ts`.

Modified implementation files: Drizzle journal/schema/enums; Admin upload service and feedback component; Upload Recovery and Object Cleanup services; public Asset eligibility/delivery; Migration, Finalize, Recovery, Cleanup and component tests. Modified documentation is limited to `AGENTS.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `ASSET_AND_UPLOADS.md`, `TESTING_AND_ACCEPTANCE.md`, `OPERATIONS_RUNBOOK.md`, and this report. No tracked file was deleted; Migrations 0013/0014 were not modified.

## 8. Directed fault-injection result

The two-stage directed gate passed 40/40 assertions across the selected suites. It proves exact committed-core/private-cleanup-Audit failure behavior; post-commit wake/delete/state/warning/persistent-Audit isolation; later cleanup-worker completion; strict same-owner idempotency and unauthorized/mismatched/object-missing refusal; every requested Cleanup identity mismatch with zero delete; Audit rollback; historical unverified evidence blocking and audited byte-backed promotion; valid/null/invalid/restrictive FK behavior; orphan-upgrade rejection; and Fresh/Upgrade Migration. Core Audit, Manifest, object, lease and Public-compensation failures remain fail-closed rather than being converted into success.

## 9. Full local quality gate

- Environment: Node 24.14.0 arm64, pnpm 11.9.0, Sharp 0.35.3, Lightning CSS 1.32.0 and Next SWC 16.2.12 load.
- ESLint: pass, zero warnings. TypeScript strict: pass.
- Drizzle Check: pass. Generate reports no schema delta after 0015.
- Vitest: 47 files / 139 tests pass. The previous 129 remain; 10 substantive tests were added. No `skip`, `todo` or `only` exists in the searched test source.
- Migration/Seed: Fresh, retained Upgrade, executable 0012→latest and 0014→0015 orphan/fail-closed paths pass; repeatable core/Fixture Seeds pass.
- Production Build: a fresh Next.js 16.2.12 build passes after applying 0015 to the isolated local PGlite database; 40 route/static-generation units complete.
- Public Bundle: the fresh build's 20 public page manifests / 29 referenced files contain no Refine/admin dependency.
- Dependency audit: no known production vulnerability.
- Playwright: 18/18 pass on Desktop Chromium and Pixel 7 with `--retries=0`. Public-path HTTP, authenticated Admin operations, upload persistence, inquiries, revision/301, mobile layout and sampled Axe Critical/Serious assertions pass.

The first browser run exposed a success-copy mismatch after the new typed server message (17/18). Core success and maintenance warning were separated without changing the business result; a new build and zero-retry rerun then passed 18/18. This failed run is retained in the report rather than hidden.

## 10. Existing capability regression

All retained tests pass for governed Domain Service/Audit transactions, Product Revision, Published/Index separation, real Product eligibility, historical Asset rescan, Effective Rights, Source Declaration separation/concurrency, Analytics/CRM privacy, server Consent, public/admin streaming upload, Fabric/Content MIME roles, HTTP 301/slash URLs, controlled public media, CRM record authorization, Notification Outbox leases, Inquiry idempotency, Conversion Event/Product Code constraints, Refine public-bundle isolation and non-production global Noindex. The Finalize/Public Compensation state machine and lease/heartbeat design were not redesigned.

## 11. External boundary and remaining validation

Not executed and still **External Validation Required**: real PostgreSQL locking/FK/migration/query behavior; R2/S3 HEAD/get/delete/consistency/interruption semantics; SMTP/scanner providers; Preview/Production deployment; DNS; backup/restore; production retention; formal data and credentials. Real Product validation remains `Waiting for Real Product Data Validation`.

No external Git push, production database, provider account, production key, DNS mutation, Preview/Production deployment or formal data import occurred.

## 12. Local Git record

- Implementation, Migration and executable tests: `adb6a54 fix: isolate finalize post-commit maintenance`.
- Authoritative-attempt evidence follow-up: `8bc7b26 fix: scope manifest evidence to current attempt`.
- Documentation/evidence is committed separately after this implementation record. No external push was performed.

## 13. Recommendation and phase status

Re-run the independent Post-Commit Boundary directed review. If it reports Blocker 0, High 0 and Medium 0, execute the separately requested independent full regression review before any external validation decision. Phase 1B remains paused and this work does not authorize real PostgreSQL acceptance.

---

The following sections preserve the prior Finalize/Cleanup Race Closure report as historical evidence.

## 1. Race-closure result

- Medium — long-running Finalize/Public Compensation Cleanup race: fixed locally.
- Authorized-scope self-check: Blocker 0, High 0, Medium 0, Low 0.
- Phase 1B remains paused. Independent directed re-review is still required.

## 2. Final consistency model

Each Finalize attempt now persists two coordinated sets before its first Public write:

1. `finalize_object_manifest_items`, the authoritative attempt-scoped set containing Batch, Recovery, attempt, Asset, Object Key, original/variant role, MIME, expected byte size and write-completion evidence.
2. A one-to-one `object_cleanup_jobs` projection in `standby`, carrying the same identity/metadata but no arm, worker lease or deletion authority.

`standby` replaces the former fixed five-minute safety delay. Time alone cannot make a compensation row claimable. Cleanup claim locks Batch → Recovery → Manifest → Cleanup; it requires an audited arm, exact Manifest match, allowed Recovery state and no valid Finalize lease. Finalize success, explicit failure and expired-lease recovery use the same lock order.

## 3. Lease and Heartbeat

Finalize claim remains owner/expiry/version fenced and attempt-counted. Progress updates renew the lease. In addition, a periodic heartbeat runs while a single storage read/write/head or image-derivative operation is still in flight, at one third of the configured lease capped at 30 seconds. Only the current `locked_by` plus current version and an unexpired lease can renew. Heartbeat failure fences the old worker from publication; lease expiry allows the Recovery worker to claim and arm compensation.

## 4. Success transaction and fail-closed preflight

The publication transaction locks Batch, Recovery, current Manifest and every Batch Public compensation row. It then requires:

- current owner, version and unexpired lease;
- the persisted Manifest exactly equals the worker's expected key/role/MIME/size set;
- one matching Cleanup projection per Manifest row;
- every projection remains standby, unarmed, unlocked, incomplete and has write evidence;
- every Public object passes a fresh storage existence check.

Any missing row/object, count/key/metadata mismatch, or `pending`, `processing`, `completed`, `dead` or `cancelled` projection aborts publication. Asset/Variant state, relations, Intent consumption, Batch/Recovery completion, exact compensation cancellation, lease clearing and required Audit commit in one transaction. Audit failure rolls all of it back.

## 5. Failure arming, recovery and Cleanup Audit

An owned Finalize failure locks the same coordination set, reconstructs missing projections from the authoritative Manifest, sets Batch/Recovery failure state, clears the Finalize lease, arms only verified Manifest objects and writes Audit atomically. Unexpected projection keys become `dead` manual-review evidence rather than deletion authority. If Audit fails, all arming/state changes roll back and the Manifest plus Recovery lease remain discoverable.

After lease expiry, Recovery selects the latest persisted Manifest attempt, recreates missing projections and atomically arms standby/cancelled or expired-processing work with system Audit. It does not steal an unexpired Cleanup lease. Cleanup completion/retry/dead reconciliation remains a Domain Service transaction with the explicit system actor and Audit. An Audit outage cannot report cleanup/recovery completion.

## 6. Schema and Migration

- Migration `0013_lyrical_black_knight.sql`: transaction-safe enum replacement adding `standby` and `manifest_registered`; Finalize projection/arm/write fields; active-lease upgrade backfill; work index; state Check Constraint.
- Migration `0014_lumpy_toxin.sql`: independent `finalize_object_manifest_items` table, foreign keys, unique Recovery/attempt/key index, Batch/attempt index and upgrade backfill from 0013 projections.
- Drizzle Schema, Snapshots `0013_snapshot.json`/`0014_snapshot.json` and Journal agree; `drizzle-kit generate` reports no delta.
- Fresh migration and an executable 0012→latest in-flight Finalize upgrade both pass. The upgrade test proves an active pending compensation becomes standby/unarmed and gains one authoritative Manifest row.
- Phase 1A now contains 55 relational tables.

## 7. Tests added or strengthened

New directed integration coverage is in `src/uploads/finalize-cleanup-race.integration.test.ts`; Migration and whole-`src` boundary assertions are strengthened in their existing suites. The 31-case traceability matrix is recorded in `TESTING_AND_ACCEPTANCE.md`. Substantive cases include 6-minute fake-clock Finalize pauses with 20-minute leases, original/first derivative/all six derivatives, deliberately armed-but-valid-lease cleanup refusal, 150ms lease heartbeat during a 350ms storage call, crash recovery at Manifest/original/variant boundaries, Audit rollback and restart, success/failure race, stale-worker/takeover fencing, exact preflight failures for every forbidden state, missing row/object and key/metadata mismatch, lease expiry during the locked storage-existence preflight, and Fresh/Upgrade Migration.

No prior Vitest or Playwright test was deleted, skipped or weakened. No `skip`, `todo`, `only`, `any`, TypeScript/lint suppression or empty catch was added to manufacture a pass.

## 8. Full local quality gate

- Environment: Node 24.14.0 arm64, pnpm 11.9.0, Sharp 0.35.3, Lightning CSS 1.32.0 and Next SWC 16.2.12 load.
- ESLint: pass, zero warnings.
- TypeScript strict: pass.
- Drizzle Check: pass; Generate: no schema delta.
- Vitest: 46 files / 129 tests pass with one Vitest worker; explicit races remain concurrent inside integration tests.
- Migration: Fresh and 0012→latest Upgrade pass; retained pre-remediation Upgrade and repeatable core/fixture Seed tests pass.
- Production Build: fresh Next.js 16.2.12 build passes; 40 route/static-generation units complete.
- Public Bundle: 20 public page manifests / 29 referenced files contain no Refine/admin dependency.
- Dependency audit: no known production vulnerability.
- Playwright: 18/18 pass with retries disabled across Desktop Chromium and Pixel 7. The authenticated Asset upload/list persistence flow additionally passes 10 consecutive zero-retry repetitions; it validates the Finalize response's Asset IDs and uses the first persisted ID as a unique same-page navigation intent, avoiding a same-route refresh result being discarded during client-state reconciliation.
- HTTP/mobile/accessibility: 11 principal public paths return 200; Pixel 7 has no horizontal overflow; sampled Home has zero Axe Critical/Serious findings.

## 9. Existing capability regression

All retained tests pass for governed Domain Service/Audit transactions, Product Revision, Published/Index separation, real Product Eligibility, historical Asset rescan, Effective Rights, Source Declaration separation/concurrency, Analytics/CRM privacy, server Consent, public/admin streaming upload, Fabric/Content MIME roles, real 301/slash URLs, controlled public media, CRM record authorization, Notification Outbox leases, Inquiry idempotency, Conversion Event and Product Code constraints, Admin Action Results/Redirect Intents/field errors, Refine public-bundle isolation and non-production global Noindex.

## 10. Files and external boundary

New files: Migrations/Snapshots 0013 and 0014 plus `src/uploads/finalize-cleanup-race.integration.test.ts`. Modified implementation areas are limited to upload Finalize/Recovery/Cleanup, storage existence adapters, related Drizzle schema/Migration tests, the full-source governance check, the authenticated Asset upload persistence-navigation closure and authorized documentation. No tracked file was deleted.

Not executed and still **External Validation Required**: real PostgreSQL locking/migration/query behavior; R2/S3 HEAD/delete/consistency/interruption semantics; SMTP/scanner providers; Preview/Production deployment; DNS; backup/restore; production retention; formal data. Real Product validation remains `Waiting for Real Product Data Validation`.

## 11. Local Git record

- Implementation, Migrations and executable tests: `8b16d78 fix: serialize finalize and public compensation`.
- The documentation/evidence commit follows this implementation commit. No external push was performed.

## 12. Recommendation

Re-run the independent Finalize/Cleanup directed closure review. Phase 1B and real PostgreSQL external acceptance remain paused until that review reports Blocker 0, High 0 and Medium 0 and the project explicitly authorizes the next step.

---

The following sections preserve the prior Final Closure Round 2 implementation evidence as historical baseline.

## Historical Round 2: Upload Staging consistency model

## 2. Upload Staging consistency model

Admin upload completion is a persistent three-phase Saga:

1. **Preregister transaction:** revalidate User, Auth Session, permission and Intent; generate the expected Private/Internal key; create a nonpublic Asset placeholder, staging `upload_recovery_jobs` row and idempotent private `object_cleanup_jobs` row; move Intent/Batch to controlled receiving states; write required Audit. Failure of the Recovery insert, any database step or Audit rolls the transaction back and prevents `storage.put`.
2. **External write and scan:** persist `storage_writing`, `storage_written`, `scanning` and `scan_passed` progress around the bounded write, MIME/magic/decode validation and malware scan. The expected key and compensation path already exist in the database, including when a provider persists bytes and then throws or the process crashes.
3. **Completion transaction:** set the Asset Ready/Passed, Intent passed, Batch ready/uploading, close the staging Recovery lease, delay the private cleanup row and write Audit atomically. A database or Audit failure rolls this transaction back; the staged object remains private and its earlier Recovery/Cleanup rows remain discoverable.

No failure branch depends on a process-local object-key array or a second call to the writer that just failed. The Recovery worker can restart, claim expired work, schedule cleanup and reconcile Batch/Intent/Asset state through the Domain Service.

## 3. Recovery Job creation timing

`upload_recovery_jobs.kind = staging` is unique per Upload Intent and is created before the first byte is written externally. It stores Batch, Intent, placeholder Asset, partition/key, phase, status, attempt schedule, lease, version, safe last error, expiry and timestamps. An idempotent private cleanup record is created in the same preregistration transaction. This proves there is no path where a staging object exists but its expected key has never been persisted for recovery.

## 4. Finalize lease model

Finalize uses `upload_recovery_jobs.kind = finalize`, unique per Batch, as the independent persistent Finalize Job. One claim transaction:

1. validates Batch state and absence/expiry of another lease;
2. sets `finalizing`;
3. creates or claims the Finalize Recovery row;
4. records lease owner, lock/expiry, attempt count and optimistic version;
5. writes the required Audit.

Claim Audit/database failure rolls everything back. A Batch cannot normally become `finalizing` without its recoverable lease record. Progress persists through `claimed`, source copy, original, variants, database finalization, cleanup/failure and completion. Every stage advance and final commit is fenced by Recovery ID, current owner, unexpired lease and version. Once a lease expires or a new worker takes over, the old worker cannot commit.

## 5. Finalize crash recovery

The recovery worker scans due/retryable/cleanup work and expired processing leases. An immediate post-claim crash leaves an active lease plus Recovery row; expiry permits a safe claim by another worker. If legacy/corrupt state contains a `finalizing` Batch with a missing, completed or dead recovery record, audited reconciliation recreates/repairs an explicit retryable/failed state. It never silently resets to `ready_to_finalize` or discards history. Retry exhaustion reaches `dead` for operator handling. Successful Finalize clears the lease and completes Recovery atomically with Batch/Asset/Intent/relation/Audit changes.

## 6. Cleanup reconciliation and Audit

Cleanup and upload-recovery reconciliation use `system:upload-recovery-worker` through Domain Services. Cleanup deletion is idempotent, but database completion is a transaction containing Cleanup status, affected Batch/Intent/Asset/Recovery state and Audit. If Audit fails, the transaction rolls back and the job remains reclaimable; a deleted object can safely be deleted again. Retry/dead transitions use the same rule. Persistent Audit failure cannot mark Recovery or Cleanup complete, and an Admin upload or Finalize result cannot be reported successful without its mandatory Audit.

## 7. Admin Action Result pattern

All 66 governed Admin write Actions return `Promise<AdminMutationOutcome>` and no write Action directly calls `redirect()` or returns `void`. The shared adapter returns a discriminated `AdminActionResult`:

- success: safe message, optional Entity ID, `refresh | redirect | none`, optional `redirectTo`;
- failure: safe message/form error, field-error map and `VALIDATION_ERROR | FORBIDDEN | CONFLICT | NOT_FOUND | AUDIT_FAILURE | NETWORK_ERROR | UNKNOWN_ERROR`.

Domain Services still own authorization, constraints, workflows and Audit transactions. Database/provider details are sanitized. The client has an immediate duplicate-submit guard, explicit pending state, success/error ARIA regions, focused error summary and field `aria-invalid`/descriptions.

## 8. Redirect Intent and field errors

Create Actions return the created Entity ID. Product, Application, Content, Fabric Entry and Company-detail-capable flows use their stable Admin destinations; Author creation uses a distinct `/admin/authors/?created={id}` intent so a same-URL refresh cannot obscure the committed read. The client stores success before scheduling `router.push`; navigation failure leaves the business success result visible on the current form. Browser tests follow Author and Application Redirect Intents and confirm the target reads the committed entity.

Required-field validation collects multiple missing fields in one result. Enum/schema parsing binds issues to the submitting field. Covered forms include Product, Taxonomy, Application, Content, Fabric Entry, Author, Company Fact, Organization, Contact, Feature Flag, Asset operations and principal CRM mutations. Permission, optimistic conflict and Audit failure remain form-level business errors rather than being mislabeled as field errors.

## 9. Migration changes

Forward Migration `0012_nostalgic_calypso.sql` adds:

- enums `upload_recovery_kind`, `upload_recovery_status`, `upload_recovery_stage`;
- table `upload_recovery_jobs` with Batch/Intent/Asset foreign keys, expected storage identity, progress, retry, lease, version and lifecycle fields;
- unique Intent and partial unique Finalize-per-Batch indexes;
- due-work and Batch/kind indexes.

Drizzle Schema, Snapshot `0012_snapshot.json` and Journal agree. Fresh migration and Upgrade from Migration 0011 pass. Existing Migration semantics were not modified. Phase 1A now has 54 relational tables.

## 10. File changes

New implementation files: Migration/Snapshot 0012, `src/uploads/upload-recovery-service.ts`, `src/uploads/upload-saga-recovery.integration.test.ts`, and `src/admin/invoke-admin-action.test.ts`.

Modified implementation areas: Upload staging/Finalize service, object-cleanup worker/service, Audit error typing, Admin Action result/invoker/forms/actions, upload API adapters and feedback UI, database schema/migration integration tests, governed-mutation static tests and browser acceptance. Modified documentation is limited to `AGENTS.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `CMS_AND_PERMISSIONS.md`, `ASSET_AND_UPLOADS.md`, `TESTING_AND_ACCEPTANCE.md`, `OPERATIONS_RUNBOOK.md` and this report. No tracked project file was deleted.

## 11. Tests added or strengthened

The prior 43 Vitest files/100 tests and 17 Playwright scenarios remain active. Current totals are 45 Vitest files/116 tests and 18 Playwright scenarios. New substantive coverage includes:

- preregistration Audit, Recovery insert and database failure before put;
- put persistence followed by throw, post-put/process crash and restart;
- scan and Asset/Intent/Batch completion failures;
- persistent Audit outage, cleanup Audit rollback and idempotent retry;
- Finalize claim interruption/Audit failure and immediate crash;
- active lease exclusion, expired takeover, stale-worker fencing and version conflict;
- Recovery-worker crash/restart, retry exhaustion/dead and abnormal-gap reconciliation;
- Action success/message/Entity ID/Redirect, field and multi-field errors, permission/conflict/Audit/network/unknown failures, repeat suppression, ARIA/error focus and Asset Finalize failure;
- browser navigation to real persisted Author and Application results.

No `skip`, `todo` or `only` was added; no critical test was deleted or weakened.

## 12. Targeted gate result

Targeted Admin/upload/recovery/migration suites pass. The upload Saga suite proves the persistent-record-before-object invariant, Audit rollback, cleanup retry, crash restart, Finalize lease takeover and stale-worker rejection. Admin unit/component/static tests prove typed result, Redirect Intent, field feedback, duplicate suppression and forbidden direct write/redirect/void patterns. The Author Redirect/persistence flow passes 10 sequential repetitions with Playwright retries disabled.

## 13. Full local quality gate

- Environment: Node 24.14.0 arm64, pnpm 11.9.0, Sharp 0.35.3, Lightning CSS 1.32.0 and Next SWC 16.2.12 load.
- ESLint: pass, zero warnings.
- TypeScript strict: pass.
- Drizzle Check: pass; Generate reports no schema delta after Migration 0012.
- Vitest: 45 files / 116 tests pass. PGlite files use one Vitest worker for deterministic local resource use; explicit concurrency and lease races execute inside the integration suites.
- Fresh/Upgrade Migration and repeatable Seed: pass.
- Production Build: fresh Next.js 16.2.12 build passes; 40 route/static-generation units complete.
- Public Bundle: 20 public manifests / 29 referenced files contain no Refine/admin dependency.
- Dependency audit: no known production vulnerability.
- Playwright: 18/18 pass across Desktop Chromium and Pixel 7 with retries disabled.
- HTTP/mobile/accessibility: 11 principal public paths return 200; Pixel 7 has no horizontal overflow; sampled Home has zero Axe Critical/Serious findings.

## 14. Existing capability regression

Governed Domain Service/Audit transactions, Product Revision, Published/Index separation, real Product Eligibility, historical Asset rescan, Effective Rights, Source Declaration separation/concurrency, Analytics/CRM privacy, server Consent, public/admin streaming upload, Fabric/Content MIME roles, real 301/slash URLs, controlled public media, CRM record authorization, Notification Outbox leases, Inquiry idempotency, Conversion Event and Product Code constraints, Refine public-bundle isolation and non-production global Noindex remain active and pass the retained regression suite.

## 15. External validation required

Not executed: real PostgreSQL locking/migration/query behavior; R2/S3 private policy, acknowledgement/retry/overwrite/delete/consistency/interruption semantics; scanner and SMTP providers; Preview/Production deployment; DNS; backup/restore; production retention; formal Company Facts/rights; 10–15 real Products; production Core Web Vitals/crawler checks. Real Product validation remains `Waiting for Real Product Data Validation`.

## 16. Source control and external state

Implementation, Migration and tests are committed locally as `d5ac8f3` (`fix: harden upload recovery and admin action results`). Documentation/evidence is a separate local commit recorded in final `git log`. No external push, provider call, Preview/Production deployment, production database/key, DNS mutation or formal data import occurred.

## 17. Review and next-step recommendation

Re-run the independent Final Closure directed review against the Round 2 commits. Phase 1B must remain paused. If and only if that review confirms Blocker 0, High 0 and Medium 0, begin the separately authorized real PostgreSQL external acceptance plan. Local closure does not itself authorize external validation, production work or Phase 1B.
