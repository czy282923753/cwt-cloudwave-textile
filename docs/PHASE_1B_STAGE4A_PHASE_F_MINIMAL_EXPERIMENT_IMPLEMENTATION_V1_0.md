# CWT Phase F Minimal Experiment Implementation V1.0

## 1. Status and review boundary

**IMPLEMENTATION_CANDIDATE / NOT INDEPENDENTLY REVIEWED / NOT ACCEPTED**

This report records the bounded local implementation authorized by the Owner's approval of Strategy A, Section 14.1 of the approved minimal-convergence report. It does not approve CSR-01 or CSR-02, accept Phase F, authorize Staging or Provider execution, or advance the project.

The only next gate is a Fresh Independent Code/Security Review of the exact immutable Candidate identified below.

## 2. Authoritative identity

| Item | Exact identity |
| --- | --- |
| Accepted base commit | `41dfc135f5f124e68aaac416c049c2e387e38d57` |
| Accepted base tree | `f85182ad8d4519d58e1d829967cfc889b8f1e830` |
| Freeze ref | `codex/checkpoint/phase-e-accepted-v1` |
| Candidate branch | `codex/phase-f-minimal-experiment-v1` |
| Implementation commit / Candidate HEAD | `49d14edc38b13b3e0c1351f4f99737ffbc556ada` |
| Implementation tree | `8afbdf7a3651fc2fded296917a65ac461dbf8c50` |
| Failed Candidate explicitly excluded | `702e1a155c350c4a69522f1c167db205bf776e96` / tree `1fe5d5a0d1585576d523321b4de0e2fa2485ca2e` |

The freeze ref remained at the accepted base. `git merge-base --is-ancestor` returned `0` for accepted P to the Candidate and `1` for the failed Candidate to the Candidate. No cherry-pick, copy, port, or adaptation from the failed worktree was used.

The evidence/report closure commit is a documentation-only descendant of the immutable implementation commit. The coordinator callback records the exact final task HEAD after that closure commit; the implementation Candidate identity remains the commit and tree above.

## 3. Starting-state gate

Before mutation:

- HEAD and tree equalled exact accepted P/tree;
- the freeze ref resolved to the same exact P/tree and was not moved;
- the worktree was isolated and clean;
- `codex/phase-f-minimal-experiment-v1` did not exist and was created at exact P;
- the failed T4 Candidate was not an ancestor;
- the approved report and adjacent sidecar were verified, including report SHA-256 `e0859e7c04a9254971ea84721bdb61aa9fccd4e19ad60cdb63225f1517f0a7de`.

## 4. Exact changed-file inventory

| File | Delta | Purpose |
| --- | ---: | --- |
| `scripts/phase-f-bounded-bootstrap.ts` | +116 | Private governed Synthetic Admin plus disabled `ai` bootstrap, one serializable transaction, required Audits |
| `scripts/phase-f-bounded-exercise.ts` | +373 | Private fixed four-case job, one PostgreSQL time observation, one slot, one attempt, fixed caps |
| `scripts/verify-ai-architecture.ts` | +199/-54 | Narrow Phase F absence/reachability rules plus convergence of the checker to the accepted-P Phase E graph |
| `src/ai/phase-f-bounded-experiment.integration.test.ts` | +104 | CSR-01 static/closed-vocabulary/reuse assertions |
| `src/ai/phase-f-bounded-experiment.postgres.integration.test.ts` | +608 | Disposable PG17/18 bootstrap, window and combined composition proofs |

No Product `src/` implementation changed. The only `src/` additions are two test files. There is no Schema, Migration, dependency, lockfile, ObjectStorage, ADR, public API, SEO/URL/Redirect, Publish/Index, CI/deployment or Product runtime change.

## 5. Complexity-budget compliance

- Runtime additions are exactly the two authorized files.
- Both executables contain no export and are not imported by Product runtime, Web, Worker daemon, package entry, or public bundle.
- No third runtime mechanism, controller session, grant/token, cutoff channel, lease, time service, persistent coordinator, state machine, generic runner, compatibility layer, fallback Provider, arbitrary task/brief/model/cap input, or reusable consumer was added.
- The executable adapter/main paths do not directly write business tables. The bootstrap delegates its governed mutation to a private service and performs the business mutations plus both required Audits atomically in one serializable transaction. Product/content/config/feature/apply actions use accepted-P Domain Services.
- Fingerprint, input hash, authorization, target/context/config/Prompt/pricing, Audit, budget, Worker lifecycle, protected output, Diff/edit and Draft Apply remain accepted-P authorities.
- The job obtains exactly one `statement_timestamp()` observation before enqueue. New runtime files contain no `Date.now()` or `new Date()` current-window authority.

## 6. Fixed functional shape

The job accepts only actor, window, four target/version triples and four ordinary idempotency UUIDs. Tasks, typed briefs, target kinds, locale `en`, Provider/model, Prompt identities, one slot, one attempt and caps are fixed in source.

The exact cases are:

1. `product_description_draft`
2. `seo_content_draft`
3. `fabric_knowledge_draft`
4. `sourcing_guide_draft`

Each row is capped at USD `0.02` reservation authority (`20,000` microusd); the four-row total is capped at USD `0.08`; the accepted-P same-day USD `5` backstop remains unchanged. No Publish, Index, Route, Slug, Canonical, factual-column, formal/private data, fallback, live retry or automatic rerun path was added.

## 7. Focused verification A — CSR-01 evidence only

The following focused proof set passed before PostgreSQL proofs:

| IDs | Result | Evidence conclusion |
| --- | --- | --- |
| C1-01, C1-03, C1-06, C1-08 | PASS | New static suite 5/5; zero exports/import consumers; exact argument vocabulary; no rejected mechanism or structural authority |
| C1-02, C1-04, C1-05, C1-07 | PASS | Accepted-P Phase E/service/resolver focused suites 15/15 plus architecture gate; Staging Web denial, existing service authority, idempotency, required Audit and caps retained |
| Exact architecture gate | PASS | 843 candidates, 531 executable nodes, five roots, 35-node acceptance closure; no reuse/reachability/protected-boundary violation |

These are implementer verification results, not independent closure of CSR-01.

## 8. Focused verification B — disposable PostgreSQL 17/18

The test order was respected: B ran only after A passed.

| Environment | Focused result | Conclusion |
| --- | --- | --- |
| PostgreSQL 17.10 | 2/2 selected tests PASS | Required-Audit bootstrap failure rolled back user/flag/Audits; before-start and exact exclusive-end rejected with zero run/enqueue Audit |
| PostgreSQL 18.4 | 2/2 selected tests PASS | Same result |

The selected proofs cover C2-01/C2-02/C2-06 directly and C2-08/C2-09 through the paired static inventory. C2-03/C2-04/C2-05/C2-07 are bounded by the approved Strategy A deletion model: there is no application controller/renewal/cutoff authority; no actual Provider, credential, egress or external action was used; `maxAttempts=1`; signal/cutoff leaves the job `INCOMPLETE`. The platform hard cutoff remains a later operator/platform gate and was not represented as application authority. A Fresh Independent Reviewer must decide whether this proportional proof mapping is sufficient; it is not self-approved here.

## 9. Combined composition proof C

Only after A and B passed, the single combined proof passed once on each disposable version:

| Environment | Result | Decisive observations |
| --- | --- | --- |
| PostgreSQL 17.10 | 1/1 PASS | Four rows, four distinct use cases, four dispatch histories, `maxAttempts=1`, four enqueue Audits, four audited Draft Applies, no factual/public mutation |
| PostgreSQL 18.4 | 1/1 PASS | Same result |

The composition used an in-process local fake Provider/fetch spy. The synthetic credential string was never sent, and no network request occurred. Staging Web without the private controlled authority returned `environment_not_authorized` before any row. The job created exactly four terminal `draft_ready` rows and no fifth/fallback row. Feature/configs were disabled before existing protected review and audited Draft Apply. Product/content factual and public state remained byte-equivalent after excluding the ordinary mutation timestamp.

The accepted-P Production pricing snapshot is intentionally stale at this date and fails closed under its one-day currentness rule. The proof injected a fixed local reviewed fake pricing registry only in the test process; the runtime executable still resolves the accepted-P Production pricing authority. Fresh reviewed pricing evidence is therefore a mandatory later operator prerequisite, not an implementation workaround.

## 10. Applicable full verification

| Gate | Result |
| --- | --- |
| ESLint | PASS |
| TypeScript `tsc --noEmit` | PASS |
| `git diff --check` | PASS |
| Full Vitest | PASS — 127 files passed, 11 skipped; 856 tests passed, 76 skipped; 290.34 s |
| Prompt bundle/history verification | PASS — bundle verifier plus 24/24 tests |
| Architecture/import/no-reuse/protected boundary | PASS — exact Candidate commit |
| RW-004 core on PostgreSQL 17.10 | PASS — fresh, upgrade, repeat/no-op, forced rollback/resume, interruption/re-entry, cleanup |
| RW-004 core on PostgreSQL 18.4 | PASS — same |
| Next production build | PASS after binding `DATABASE_DRIVER=postgres` and the migrated disposable PG17 database |
| Public bundle boundary | PASS — 376 eligible server runtime JS files, 20 public manifests, 15 distinct public chunks, no AI/synthetic leakage |
| Playwright E2E | PASS — 55/55, desktop and mobile, 2.0 min |
| `pnpm audit --prod` | NOT RUN — prohibited because it requires network and there is no dependency delta |

Build diagnostic: the first two build attempts compiled and typechecked but prerendered against an unmigrated local default PGlite database; they failed on missing `system_settings`. No code change was made. Setting both `DATABASE_DRIVER=postgres` and the disposable migrated database URL produced the formal PASS.

Architecture diagnostic: the source-clean architecture gate is the formal PASS. An additional non-required bundle-input experiment was not counted as a pass because that mode expects synthetic-test markers in its server fixture, while the production build correctly excludes those markers. The dedicated public bundle checker is the authoritative production-leak result and passed.

Historical RW-004 runner diagnostic: the exact historical runner's unrelated post-RW constraint fixture predates accepted-P's strengthened `ai_runs_active_attempt_dispatch_check`. The obsolete extra fixture failed without indicating a migration failure. The runner was narrowed only in a disposable temporary copy to the requested RW-004 core cases; both versions passed and all review databases were removed. No tracked runner or Product code was changed.

## 11. External-action and data-boundary proof

- Neither executable was invoked against Staging, Production, an account, a Provider, or any external environment.
- No Provider credential was retrieved. No network/egress call was made.
- No production data, formal customer/product data or private Inquiry file was imported.
- No push, deploy, publish, index, DNS, account, credential or irreversible external action occurred.
- Staging Web remains unavailable; no route, Action, panel, browser DTO or session was added.
- Public Assets and private Inquiry storage boundaries were unchanged.

## 12. Cleanup and rollback

All disposable PG17/PG18 review databases were dropped by their runners. The two local PostgreSQL containers, local build/E2E output, temporary bundle copies, local RW evidence captures and test processes were removed after evidence extraction. The final worktree is clean with no staged or untracked files.

Rollback is local and exact: move the branch pointer back to accepted P or delete the unmerged local branch after review. The freeze ref must remain unchanged. No external rollback is required because no external action occurred.

## 13. Residual risks and next gate

1. Fresh pricing evidence is absent/currently stale; the runtime correctly fails closed until an authorized operator supplies reviewed current pricing authority.
2. Credential availability, egress restriction and the hard exclusive-end cutoff are later platform/operator gates. This Candidate deliberately does not add an application control plane.
3. The fixed exercise is intentionally one-use/fresh-database only. Partial Synthetic state is resolved by atomic Audit rollback where applicable and destruction of the disposable environment, not by a reusable recovery framework.
4. The architecture verifier convergence delta is necessarily larger than the two new assertions because accepted P had already added Phase E edges and hashes that its historical checker did not recognize. The reviewer should independently confirm every accepted-P exception is exact, path-bounded and non-extensible.
5. The Fresh Independent Reviewer must independently assess the proportional mapping for C2-03 through C2-07 and must not infer acceptance from this implementer report.

**Next gate:** Fresh Independent Code/Security Review of commit `49d14edc38b13b3e0c1351f4f99737ffbc556ada`, tree `8afbdf7a3651fc2fded296917a65ac461dbf8c50`, plus this evidence closure. No Fresh Acceptance or operational exercise is authorized.
