# CWT Phase 1B Stage 5 — S5-F6 Time-Coupling Test Remediation Report V1.0

## 1. Document control

| Field | Value |
|---|---|
| Project | CWT — CloudWave Textile |
| Task | `F6-T-01 — wall-clock-coupled Notification Outbox integration evidence` |
| Authority | `SD-S5-F6-R1-001` under `SD-S5-REMAINDER-001` |
| Authority SHA-256 | `ff3acb0d2b527f131b7ef65fc75d6f55f77178f93100592f1ae37e8de65ca524` |
| Exact baseline | `5f225f181c5c440610192bc70f98cc572bb83535` |
| Baseline tree | `edcfcfca0f0bfafe503a1d7049c7f99fe56fcc8d` |
| Code/test checkpoint | `6a1a8a8860c62bda120483b301cdd9283a1caf0a` |
| Checkpoint tree | `520a7d8b37f2d1b4d2b766e524f61487c2bcb36d` |
| Branch | `refs/heads/codex/phase-1b-stage5-f6-test-time-coupling-remediation-v1` |
| Status | **IMPLEMENTER COMPLETED — independent review required** |
| Product/runtime change | **None** |
| S5-F6 restart | **Not performed; remains stopped** |
| Production Ready | **No** |
| Formal Product status | `Waiting for Real Product Data Validation` |

The exact report-bearing Candidate identity is recorded in the Implementer
callback because a commit cannot contain its own final identity. This report is
implementation evidence, not architecture, independent review, acceptance,
release, or external-action authority.

## 2. Authority and preflight

Before mutation, the complete Coordinator authorization and adjacent sidecar
were read and verified. Its body SHA-256 reproduced exactly as
`ff3acb0d2b527f131b7ef65fc75d6f55f77178f93100592f1ae37e8de65ca524`.

Preflight reproduced:

- the stopped F6 evidence branch
  `refs/heads/codex/phase-1b-stage5-f6-implementation-evidence-v1` remained at
  exact accepted S5-F5 Candidate
  `5f225f181c5c440610192bc70f98cc572bb83535`;
- the accepted S5-F5 branch remained at the same exact Candidate;
- the starting worktree was clean with tree
  `edcfcfca0f0bfafe503a1d7049c7f99fe56fcc8d`;
- the new remediation branch did not exist and was created directly from the
  exact accepted Candidate; and
- no F6 report or F6 Candidate existed or was created in this task.

## 3. Reproduced failure and root cause

Before remediation, both the eight-file cross-domain selection and the exact
single file reproduced the same ordinary failure:

```text
src/integrations/notification-outbox.integration.test.ts
15 passed / 1 failed
renders both kinds from captured templates and immutable Inquiry data
line 116: deliverNotificationOutboxJob(...).resolves.toBe(true)
received false
```

The causal ordering was:

1. `setupInquiry` created both actual Outbox rows through `createInquiry`.
2. The production insert intentionally supplied no `nextAttemptAt`.
3. The accepted schema populated `nextAttemptAt` through `defaultNow()`.
4. The test injected the fixed claim instant
   `2026-08-30T01:00:00.000Z`.
5. At reproduction, real UTC time was already after `01:03`, so each persisted
   due boundary was later than the injected instant.
6. The accepted production predicate correctly required
   `nextAttemptAt <= claimAt`; the row was not due and delivery returned
   `false`.

This was a test-evidence wall-clock dependency. No evidence established a
production Outbox defect, and no product/runtime code was changed.

## 4. Correction and responsibility boundary

The correction remains wholly inside
`src/integrations/notification-outbox.integration.test.ts`:

- one local `claimInstantAfter(nextAttemptAt)` helper expresses a claim instant
  exactly one millisecond after an actual persisted due boundary;
- the formerly failing rendering case now explicitly places both persisted due
  boundaries one minute after the old fixed instant, proves every boundary is
  later than that old instant, then claims each row relative to its persisted
  boundary;
- non-scheduling rendering, privacy, kind-independence, uncertain-outcome,
  immutable-template, and polluted-payload cases use their own selected row's
  persisted boundary;
- the lost-fence case explicitly makes the row due when it resets the row from
  processing to pending, while preserving its fixed Lease/fencing sequence;
- assertions for both distinct jobs, two captures, terminal `sent` state,
  equal counters, immutable templates, backoff, redaction, and transport denial
  remain intact; and
- no arbitrary later calendar date, global fake time, shared clock abstraction,
  production clock seam, global claimability shortcut, skipped assertion, or
  weaker expectation was introduced.

The checkpoint delta is 21 insertions and 9 deletions in the one authorized
test source. Production state, branches, mechanisms, and operational behavior
remain unchanged.

## 5. Complete absolute-clock classification

| Clock use | Classification and disposition |
|---|---|
| `sequenceClock` constructor | Semantic clock utility for exact per-call sequences; unchanged. |
| `publishedAt: new Date()` in the safe-source fixture | Current publication eligibility fixture, not a claim clock; unchanged. |
| Both-kind rendering | Non-scheduling behavior; replaced fixed claim time with actual persisted-boundary-relative time and an explicit adversarial boundary later than the old instant. |
| Operations URL/source label/attachment privacy rendering | Non-scheduling behavior; now relative to the internal row's persisted boundary. |
| Fifth-failure and sibling-kind independence | Attempt/kind behavior, not calendar time; each claim is now relative to its own persisted boundary. |
| Attempt `0..5`, due epoch, `2099` non-due rows, mismatch and terminalization instants | Exact attempt-ceiling and due/non-due semantics; explicit row state makes the calendar independent, so fixed instants remain unchanged. |
| Live/expired fifth Lease | Exact Lease expiry and fifth-worker fencing deltas; unchanged. |
| Fresh discovery/claim/settlement sequence | Exact five-call fresh-clock authority and Lease/settlement values; unchanged. |
| Late success/failure/exception outcomes | Exact fresh-time Lease expiry during transport; unchanged. |
| Fresh failure/backoff sequence | Exact settlement-relative retry delay; unchanged. |
| Uncertain first attempt | Outcome/backoff behavior is retained, while its starting instant is now derived from the persisted due boundary; the exact `+60_000 ms` assertion remains. |
| Expired Lease recovery and lost fence | Epoch Lease fixtures and fixed recovery/fencing deltas remain; the pending reset now explicitly sets `nextAttemptAt` to epoch so scheduling is not accidental. |
| Active-template change immutability | Non-scheduling behavior; old and new jobs each claim relative to their own persisted boundary. |
| Legacy `createdAt` in 2036 and claim one minute later | Exact proof that compatibility does not use the deleted timestamp cutoff; unchanged. |
| Polluted legacy-shaped payload rejection | Non-scheduling behavior; now claims relative to the polluted row's persisted boundary. |

No semantic Lease, retry, backoff, fencing, attempt, fresh-clock, or legacy
timestamp interval was replaced by wall time.

## 6. Decisive verification

All evidence used conspicuously Synthetic data, local/PGlite state, the already
available local PostgreSQL image, and loopback-only services. There was no
browser download, SMTP/Provider call, credential access, Production/Staging
data, formal data, or external action.

| Gate | Exact result |
|---|---|
| Runtime | PASS; Node `v24.14.0`, Darwin ARM64 |
| Formerly failing Outbox file | PASS twice consecutively; each run `1 file / 16 tests` |
| Adversarial old-time boundary | PASS; both persisted due boundaries were explicitly later than `2026-08-30T01:00:00.000Z`, and both jobs still rendered and reached `sent` |
| Focused Outbox/Inquiry/Template/public regression | PASS; `10 files / 86 tests` |
| Zero-warning lint | `pnpm lint` PASS |
| Strict TypeScript | `pnpm typecheck` PASS; isolated Build TypeScript PASS |
| Drizzle no-delta | PASS; 60 tables; `No schema changes, nothing to migrate`; pre/post digest `364de1c6e29ea4fe98fc27bdb5a691fb8eb50edb85752f793dc5ef3c831a3cb7` |
| Corrected tracked NUL-safe manifest | 156 exact tracked arguments; 143 files passed / 11 skipped; 1093 tests passed / 85 skipped; zero ordinary failures; inherited L-02 only |
| PostgreSQL 18.4 | PASS; loopback-only `postgres:18.4-alpine`; Fresh/Upgrade/repeat, attribution, Audit rollback, Template authority, two-kind Outbox atomicity/claim/render/attempt/fencing/fresh-clock/query-plan matrices |
| Isolated migrated/core-seeded Build | PASS; optimized compile, strict TypeScript, and `44/44` page units including `/admin/email-templates` |
| Public bundle | PASS; 391 eligible server runtime files, 20 public manifests, 7 root chunks, 8 manifest chunks, 15 distinct chunks |
| Source-clean architecture/protected scope | Production/static-resource/URL/protected-capability checks reached; exit 1 only at inherited Phase-D sole-parent assertion |
| Exact unmodified broad command | `pnpm test:run`; 143 files passed / 11 skipped; 1093 tests passed / 85 skipped; zero ordinary failures; exit 1 only for inherited L-02 |
| Diff/whitespace | `git diff --check` PASS before checkpoint; final three-path check is recorded at Candidate creation |

### 6.1 Corrected tracked source manifest

The manifest used exact tracked NUL-delimited paths, excluded only preserved
review evidence and the explicitly authorized obsolete Phase-F diagnostic,
and passed 156 arguments to Vitest without whitespace splitting. It was not
filtered after execution or represented as an aggregate PASS.

### 6.2 Inherited L-02 truth

Both the corrected manifest and exact unmodified broad command exited `1` only
after all ordinary tests completed successfully. They reproduced:

```text
AI architecture gate failed closed:
aggregate/Gate lineage requires the sole parent ee13e743158e245f520a8d7ec68aa1854179fdc3

Vitest / convert-source-map diagnostic:
SyntaxError: Unexpected token '�', "�" is not valid JSON
```

This is the already accepted inherited Phase-D fixed-lineage/Vitest source-map
Low. It was not caught, suppressed, skipped, downgraded, repaired, or called
PASS. No ordinary Candidate test failed.

### 6.3 PostgreSQL evidence

The disposable verifier used the already-local `postgres:18.4-alpine` image,
`--pull=never`, a random loopback port, Synthetic user/database names, the
required `isolated-synthetic-database` guard, and no remote service. It returned
`status: pass`, PostgreSQL version `18.4`, the expected
`notification_outbox_delivery_idx` query plan, simultaneous two-kind claims,
same-row fencing, both-kind rendering, exact attempt ceiling, expired-fifth
terminalization, counter mismatch rejection, fresh-clock sequences, and v1/v2
upgrade compatibility. The container and prefixed databases were removed.

## 7. Scope and protected-boundary proof

The final Candidate delta is limited to exactly:

1. `src/integrations/notification-outbox.integration.test.ts`;
2. `docs/PHASE_1B_STAGE5_F6_TIME_COUPLING_TEST_REMEDIATION_REPORT_V1_0.md`;
3. its adjacent `.sha256` sidecar.

There is no change to product/runtime source, Schema, Migration, Snapshot,
Journal, dependency, lockfile, package script, CI, role, permission, Template
contract, Inquiry writer, Outbox processor, envelope/transport, queue, Worker,
Lease/retry state, public route, SEO, Publish, Index, Stage 6/7, or external
configuration. The stopped F6 evidence branch and accepted S5-F5 branch remain
unchanged at the accepted baseline.

## 8. Complexity and maintainability

Root Cause First was applied at the persisted due-boundary/claim-clock ordering.
One narrow local helper replaces six non-semantic hard-coded claim clocks and
expresses the actual contract directly. The correction adds no framework,
fixture service, fake-timer system, wrapper, global state, clock authority,
durable mechanism, or production branch. Total production complexity and state
remain exactly level.

## 9. Cleanup, rollback, and limitations

- the disposable PostgreSQL container and databases were removed;
- `.next`, generated `next-env.d.ts`, TypeScript build metadata, and the
  isolated PGlite/storage Build root were removed from the worktree and moved
  to a recoverable local Trash location;
- no Playwright report, browser result, database, storage, or Build residue
  remains in the worktree; and
- rollback is the exact accepted S5-F5 Candidate:

```text
git switch --detach 5f225f181c5c440610192bc70f98cc572bb83535
```

The one open finding is the inherited L-02 broad-harness/source-map Low. Real
SMTP/Zoho delivery, Provider acknowledgement/deduplication, protected Staging,
Production, formal Product/media truth, and release readiness remain later
unauthorized gates. Production Ready remains **No**.

## 10. Terminal gate

Implementer status is **COMPLETED** for the bounded test-only remediation. This
does not accept the Candidate or restart S5-F6.

The single next gate is a fresh Independent Reviewer bound to the exact final
Candidate and report SHA-256. Review must begin with the lightweight Security &
Test Simplification Check, then verify the root-cause correction, the complete
clock classification, preserved semantic timing, adversarial/repeated evidence,
three-path scope, and inherited L-02 truth. Only coordinator-recorded acceptance
may authorize a fresh S5-F6 restart.
