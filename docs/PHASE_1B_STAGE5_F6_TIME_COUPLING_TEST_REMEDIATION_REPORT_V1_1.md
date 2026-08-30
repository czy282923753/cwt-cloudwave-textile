# CWT Phase 1B Stage 5 — S5-F6 Time-Coupling Test Remediation Report V1.1

## 1. Document control

| Field | Value |
|---|---|
| Project | CWT — CloudWave Textile |
| Task | `M-01 / F6-T-01 — remaining active-legacy wall-clock coupling` |
| Authority | `SD-S5-F6-R2-001` under `SD-S5-REMAINDER-001` |
| Authority SHA-256 | `77747733fe50f9682a15d4042787e2b0614bd7d1a30246fb286e3386a1f1f7bc` |
| Exact failed Candidate | `5294b95236ee6d8e75774afba55d5d2bebdd9981` |
| Failed Candidate tree | `48af33af2fbc8fed954ba46b5c4e9a979e990953` |
| Exact accepted rollback | `5f225f181c5c440610192bc70f98cc572bb83535` |
| Attempt-2 code/test checkpoint | `94ce165b7e58457251d8ed071c0c5054520478d9` |
| Checkpoint tree | `7e1d47b3ef6036438f043c5708d1afd63ef448ba` |
| Branch | `refs/heads/codex/phase-1b-stage5-f6-test-time-coupling-remediation-v1` |
| Status | **IMPLEMENTER COMPLETED — independent re-review required** |
| Product/runtime mutation | **None** |
| S5-F6 restart | **Not performed; remains stopped** |
| Production Ready | **No** |

The report-bearing Candidate identity is supplied in the Implementer callback
because a commit cannot contain its own final identity. V1.1 supersedes only
the current implementation claim. V1.0, failed Candidate
`5294b95236ee6d8e75774afba55d5d2bebdd9981`, and its independent FAIL remain
immutable evidence history.

## 2. Authority, custody, and failed-review evidence

Before mutation, the complete attempt-2 Coordinator authorization and adjacent
sidecar were read and verified. The body reproduced exact SHA-256
`77747733fe50f9682a15d4042787e2b0614bd7d1a30246fb286e3386a1f1f7bc`.

Preflight reproduced:

- the remediation branch was clean and exact at failed Candidate
  `5294b95236ee6d8e75774afba55d5d2bebdd9981`, tree
  `48af33af2fbc8fed954ba46b5c4e9a979e990953`;
- detached review-only commit
  `3fb1542d40075fae177f751e1557f4efb3184909` had the exact failed Candidate as
  sole parent and remained outside Candidate ancestry;
- the independent review report reproduced SHA-256
  `befbe0fa2639f2d9215278e93feb7722ec03b5bd36f41ea5df80d25dea550dd9`;
- Security & Test Simplification was already `PASS`; one Medium M-01 remained;
  and
- the stopped F6 evidence branch and accepted S5-F5 branch remained at exact
  `5f225f181c5c440610192bc70f98cc572bb83535`.

## 3. Finding and exact correction

Attempt 1 correctly removed six non-scheduling claim-clock dependencies and
preserved the meaningful Lease, retry, backoff, fencing, attempt, fresh-clock,
and legacy timestamp sequences. The active-legacy compatibility fixture still
combined:

1. fixed `createdAt = 2036-08-30T00:00:00.000Z`;
2. implicit real `defaultNow()` for `nextAttemptAt`; and
3. fixed claim time `2036-08-30T00:01:00.000Z`.

That row would cease to be claimable after real wall time passed the fixed 2036
claim instant. The production predicate would be correct; the fixture would be
wrong.

Attempt 2 adds exactly one authorized line to the active-legacy test's existing
row update:

```ts
nextAttemptAt: new Date(0),
```

The failed Candidate to checkpoint source delta is exactly `+1/-0` in
`src/integrations/notification-outbox.integration.test.ts`.

Unchanged in the same test:

- fixed `createdAt = 2036-08-30T00:00:00.000Z`;
- fixed claim time `2036-08-30T00:01:00.000Z`;
- exact strict active internal legacy payload;
- `transport.captured` length exactly `1`; and
- subject assertion `^New CWT inquiry`.

No helper, other clock case, assertion, production/runtime path, Schema,
Migration, dependency, package, lockfile, CI, framework, or test mechanism was
changed.

## 4. Adversarial due-boundary proof

A non-persistent Synthetic direct-composition probe used the accepted
production claim/delivery functions against an isolated in-memory PGlite
database and the exact strict legacy payload shape.

The first execution set:

```text
createdAt    2036-08-30T00:00:00.000Z
claimAt     2036-08-30T00:01:00.000Z
nextAttempt 2036-08-30T00:02:00.000Z
```

Result: delivery returned `false` and capture count remained `0`.

The same row was then changed only to `nextAttemptAt = epoch`, with the same
fixed claim and same strict legacy payload. Result: delivery returned `true`,
capture count became `1`, and the subject retained `^New CWT inquiry`.

Exact probe result:

```json
{"status":"pass","futureDue":"2036-08-30T00:02:00.000Z","claimAt":"2036-08-30T00:01:00.000Z","notDueCaptures":0,"explicitlyDueCaptures":1}
```

This proves production eligibility was not widened. The fixture now explicitly
establishes the scheduling precondition for its actual authority: legacy
compatibility is independent of the removed `createdAt` cutoff.

## 5. Complete clock-class conclusion

The cumulative file-wide classification from V1.0 remains valid with one
correction:

- non-scheduling rendering, privacy, kind-independence, uncertain outcome,
  immutable-template, and pollution cases remain relative to their persisted
  due boundary;
- the active-legacy case now explicitly establishes `due` while keeping its
  fixed 2036 `createdAt` and claim sequence;
- exact attempt `0..5`, fifth-attempt terminalization, counter mismatch,
  live/expired Lease, fresh discovery/claim/settlement, late outcome fencing,
  retry backoff, and lost-fence sequences remain unchanged; and
- no fixed claim instant in the file now depends on an implicit real
  `defaultNow()` due boundary.

The file-local `claimInstantAfter` helper from attempt 1 is unchanged. No global
clock, fake-timer system, production seam, or forced-due shortcut was added.

## 6. Complete verification record

All evidence used conspicuously Synthetic data, local/PGlite state, the
already-local PostgreSQL image, and loopback-only services. No browser download,
SMTP/Provider call, credential access, Production/Staging data, formal data, or
external action occurred.

| Gate | Exact attempt-2 result |
|---|---|
| Attempt-2 source scope | PASS; failed Candidate to checkpoint is exactly one insertion in the authorized active-legacy fixture |
| Full Notification Outbox integration file | PASS twice consecutively; `1 file / 16 tests` on each run |
| Active-legacy assertions | PASS; fixed 2036 created/claim instants retained, explicitly due, exact strict payload, one capture, exact legacy subject assertion |
| Adversarial later-due composition | PASS; later due boundary produced zero capture, then explicitly due produced one capture using unchanged production code |
| Focused Outbox/Inquiry/Template/public regression | PASS; `10 files / 86 tests` |
| Zero-warning lint | `pnpm lint` PASS |
| Strict TypeScript | `pnpm typecheck` PASS; isolated Build TypeScript PASS |
| Drizzle no-delta | PASS; 60 tables; `No schema changes, nothing to migrate`; pre/post digest `364de1c6e29ea4fe98fc27bdb5a691fb8eb50edb85752f793dc5ef3c831a3cb7` |
| Corrected tracked NUL-safe manifest | 156 exact tracked arguments; 143 files passed / 11 skipped; 1093 tests passed / 85 skipped; zero ordinary failures; inherited L-02 only |
| Disposable PostgreSQL 18.4 | PASS; Fresh/Upgrade/repeat plus accepted attribution, Template, two-kind Outbox atomicity/claim/render/attempt/fencing/fresh-clock/query-plan matrices |
| Isolated migrated/core-seeded Build | PASS; optimized compile, strict TypeScript, `44/44` page units including `/admin/email-templates` |
| Public bundle | PASS; 391 eligible server runtime files, 20 public manifests, 7 root chunks, 8 manifest chunks, 15 distinct chunks |
| Source-clean architecture/protected scope | All current production/static-resource/URL/protected-capability checks reached; non-zero only at inherited Phase-D sole-parent assertion |
| Exact unmodified broad command | `pnpm test:run`; 143 files passed / 11 skipped; 1093 tests passed / 85 skipped; zero ordinary failures; inherited L-02 only |
| Cleanup | PASS; PostgreSQL container/databases, Build/PGlite/storage, `.next`, generated Next/TypeScript metadata, and reports/results absent from worktree |

### 6.1 PostgreSQL and query-plan evidence

The guarded verifier used `postgres:18.4-alpine`, `--pull=never`, a random
loopback port, a Synthetic user/database prefix, and the exact
`isolated-synthetic-database` guard. It returned `status: pass`, server version
`18.4`, `notification_outbox_delivery_idx`, simultaneous two-kind claims,
same-row fencing, both-kind rendering, strict legacy compatibility, exact
attempt ceiling, fresh-time lease/settlement/backoff evidence, and v1/v2 Upgrade
compatibility. The exact container and prefixed databases were removed.

### 6.2 Inherited L-02 truth

The corrected manifest and exact broad command both completed every ordinary
test with zero ordinary failure, then exited `1` only for the already accepted:

```text
AI architecture gate failed closed:
aggregate/Gate lineage requires the sole parent ee13e743158e245f520a8d7ec68aa1854179fdc3

Vitest / convert-source-map:
SyntaxError: Unexpected token '�', "�" is not valid JSON
```

This inherited Phase-D fixed-lineage/Vitest source-map Low remained visible,
unsuppressed, unfiltered, and unchanged. It is not called PASS or fixed.

## 7. Scope, complexity, and rollback

The final successor delta from failed Candidate
`5294b95236ee6d8e75774afba55d5d2bebdd9981` is exactly:

1. one inserted `nextAttemptAt: new Date(0)` fixture line in
   `src/integrations/notification-outbox.integration.test.ts`;
2. `docs/PHASE_1B_STAGE5_F6_TIME_COUPLING_TEST_REMEDIATION_REPORT_V1_1.md`;
3. its adjacent `.sha256` sidecar.

V1.0 and its sidecar are unchanged. The review-only commit remains outside
Candidate ancestry. No production state, runtime mechanism, Schema, Migration,
queue, Worker, Lease, retry, role, permission, route, SEO, publishing, external
configuration, dependency, or proof framework changed. Total production
complexity remains exactly level.

Rollback points remain:

- exact attempt-1 failed Candidate
  `5294b95236ee6d8e75774afba55d5d2bebdd9981`; and
- exact accepted S5-F5 baseline
  `5f225f181c5c440610192bc70f98cc572bb83535`.

S5-F6 remains stopped. Production Ready remains **No**. Real SMTP/Zoho,
Provider acknowledgement/deduplication, protected Staging, Production, formal
Product/media truth, Stage 6/7, and release gates remain unauthorized.

## 8. Terminal gate

Implementer status is **COMPLETED** for bounded remediation attempt 2. This does
not close M-01, accept the successor, or restart S5-F6.

The single next gate is a fresh exact-successor Independent Re-Review by the
separate Reviewer. It must reconfirm the cumulative Security & Test
Simplification PASS, exact one-line source scope, active-legacy due semantics,
adversarial later-due denial, complete clock classification, evidence truth,
three-path Candidate delta, and inherited L-02. Only coordinator-recorded
acceptance may authorize a fresh S5-F6 restart.
