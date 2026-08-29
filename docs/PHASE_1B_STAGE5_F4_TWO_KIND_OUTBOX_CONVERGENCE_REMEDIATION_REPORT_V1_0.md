# CWT Phase 1B Stage 5 — S5-F4 Two-Kind Outbox Convergence Remediation Report V1.0

Date: 2026-08-30
Role: original bounded S5-F4 Implementer
Status: COMPLETED FOR FRESH INDEPENDENT RE-REVIEW; NOT ACCEPTED
Branch: `codex/phase-1b-stage5-f4-two-kind-outbox-v1`

## 1. Authority, custody, and rollback

This report records bounded remediation attempt 1 for independent-review
findings M-01, M-02, M-03, and L-01 only. The Owner authorization body and its
adjacent sidecar both verified as SHA-256
`9801ea366d7fae6120dba76a0637b8c337f0adb0dd87b319bff4ba22cc1a99c0`.
The original S5-F4 authority also verified through its adjacent sidecar as
`b647408fac5bde1bfd4f98aa2890e0e2c4b067f94c1cb5715e21509ffd2edaf6`.

Pre-mutation custody reproduced exactly:

- failed Candidate and remediation rollback:
  `3fac009e8ea64e08c4df6d9cc2b997eeb59a1851`;
- failed Candidate tree:
  `bd7a57eb33dfcf404b0617a43b4ca3d6a54c773c`;
- branch: `refs/heads/codex/phase-1b-stage5-f4-two-kind-outbox-v1`;
- clean worktree;
- review-only commit:
  `6f5bda36d182d461f3f5dcfbc3ff4918b6ac43a6`, with sole parent the failed
  Candidate and excluded from Candidate ancestry;
- independent FAIL report SHA-256:
  `52a5bcde4b386fde6f3f53e99e3adacb926386b841829d0628f0c903d94a86e8`;
  and
- accepted S5-F3 ultimate rollback:
  `183185f5041c960a117877d8cf9248e31cfb3ce5`.

The original implementation report remains immutable failed history at
`docs/PHASE_1B_STAGE5_F4_TWO_KIND_OUTBOX_CONVERGENCE_IMPLEMENTATION_REPORT_V1_0.md`,
SHA-256
`03ccb9b9d5a6c7f9fec1633128f96daccab462e595ab4c5c33b1a4fa54169899`.
This remediation report does not edit or supersede that historical body; it
supersedes only the failed implementation/evidence claim for the successor
Candidate.

The local remediation code/test checkpoint is:

- commit `389f4ab6930c6a0324f9b3d13ebfb7f068685c79`;
- tree `9992b42218153cbc565b32d39e64b32238858727`;
- sole parent exact failed Candidate
  `3fac009e8ea64e08c4df6d9cc2b997eeb59a1851`.

The report-bearing successor Candidate is the sole child of this checkpoint.
Its exact commit/tree are recorded by Git and in the terminal coordinator
callback, avoiding any circular self-hash inside this report-bearing commit.

## 2. Implemented bounded remediation

### 2.1 M-01 — truthful strict legacy compatibility

The false code-owned `2026-08-30` cutover and all `createdAt` payload-format
authority were deleted. The parser now:

1. attempts the strict versioned v1 parser first;
2. permits legacy only for exact kind `inquiry_notification`;
3. permits legacy only for active `pending`, `processing`, or `failed` rows;
4. parses only the exact strict historical legacy object with no unknown field;
   and
5. rejects customer-confirmation, terminal, malformed, mixed, polluted, and
   unsupported-version rows.

The new Inquiry writer remains v1-only and has no legacy import or dual-write
path. No calendar, environment variable, deployment inference, database marker,
or persistent cutover state was added.

Focused and PostgreSQL evidence delivers exact strict internal legacy rows with
timestamps before, exactly at, and ten years after the deleted date. Actual
customer-kind, terminal, unknown-field, mixed-shape, and unsupported-version
rows make zero capture calls. The claimed job no longer returns or passes
`createdAt` to the parser.

### 2.2 M-02 — exact five-attempt ceiling

The one existing Outbox processor now uses one shared attempt-counter predicate
for due listing and atomic claim. Both require:

- `attempts = attempt_count`;
- `attempts < 5`; and
- `attempt_count < 5`.

The same processor contains one bounded terminalization helper. It atomically
marks supported equal-counter rows Dead without transport when:

- status is `pending` or `failed` and counters are at or above five; or
- status is `processing`, counters are at or above five, and the Lease has
  expired.

Terminalization does not increment or repair counters, clears lock/Lease state,
uses only `outbox_attempts_exhausted` plus one fixed sanitized message, records
the terminal time, and does not mutate the sibling job or Inquiry. `sent`,
`dead`, unsupported-kind, and mismatched-counter rows remain unchanged. An
unexpired fifth worker remains `processing`; its existing fenced settlement
right is not taken away.

Focused and PostgreSQL matrices prove attempts 0 through 4 claim as 1 through
5, a fifth success can become Sent, a fifth ordinary failure becomes Dead,
pending/failed rows at five and a polluted equal row above five terminalize
with zero transport, an expired fifth Lease terminalizes with zero sixth
transport, and concurrent direct/batch terminalization cannot increment above
five. A 4/5 mismatch is neither repaired nor transported.

### 2.3 M-03 — fresh discovery, claim, and outcome time

The batch-frozen `Date` option was replaced by one injected
`clock: () => Date`, defaulting to a new current `Date` on every call. The
ordinary product composition obtains separate instants for:

1. batch discovery;
2. every individual claim and Lease start; and
3. every success, failure, uncertain, exception, or contract-rejection
   settlement.

Discovery time is never passed as later jobs' claim or settlement time.
`processed_at`, `next_attempt_at`, and retry backoff derive from the fresh
outcome instant. Existing row ID, processing status, worker ownership, and
`lease_expires_at > outcome_time` fencing remains unchanged.

Deterministic focused and PostgreSQL sequences prove two claims at `03:00:10`
and `03:00:30` receive independent Lease expiries `03:01:10` and `03:01:30`,
then settle at `03:00:20` and `03:00:40`. Success, failure, and thrown transport
outcomes observed at `03:32` after a `03:31` Lease expiry cannot persist Sent,
Failed, Dead, or a stale `processed_at`. A first-attempt failure observed at
`04:00:30` schedules retry at `04:01:30`, not relative to the claim time.
Default current-time delivery remains successful.

No heartbeat, Lease renewal, exactly-once mechanism, Provider deduplication, or
second worker/fence was added. Stable Delivery Key/Message-ID and the honest
at-least-once boundary remain.

### 2.4 L-01 — one canonical reserved-prefix path

The shared envelope now normalizes the complete leading exact-uppercase
reserved marker set once whenever a policy prefix is required:

1. trim leading whitespace;
2. strip all leading `[TEST]` and `[STAGING]` markers in any order/repetition;
3. trim remaining leading whitespace; and
4. add exactly the policy sequence: `[TEST]`, `[STAGING]`, or
   `[STAGING] [TEST]`.

Ordinary envelopes with no required policy prefix retain authored subject text
unchanged after existing safety validation. Mixed-case lookalikes remain
ordinary text. Actual ordinary envelope and S5-F3 Synthetic test-send tests
cover both marker orders, repetitions, leading whitespace, marker-only text,
test-only, Staging-only, combined Staging test send, mixed-case lookalikes, and
idempotent envelope reconstruction. No second renderer or subject authority was
introduced.

## 3. Preserved S5-F4 and cross-domain authority

The existing S5-F4 convergence remains unchanged outside the four findings:

- exactly two v1 Outbox rows commit atomically with a new Inquiry and required
  Audit;
- replay and legacy Inquiry rows do not manufacture a confirmation job;
- the immutable, PII-minimized v1 payload and captured Template snapshot remain
  retry-stable;
- one job-ID claim path, existing status/Lease/backoff/Dead state, sibling
  independence, and stable Message-ID remain authoritative;
- both kinds render through the accepted S5-F3 renderer from internal immutable
  Inquiry data, safe source-label snapshot, trusted operations URL, and
  attachment count only;
- no private file, Object Key, signed URL, Contact/CRM identity, rendered body,
  or browser authority enters the payload;
- one shared envelope/transport boundary remains capture-only in Local/Test,
  completely replaces Staging recipients, and fails closed for incomplete
  Production policy; and
- the public Inquiry request path remains free of notifier/Provider delivery.

The source-bound suite regressed all accepted S5-F1/F2/F3, Inquiry, CRM,
attribution, Analytics, Upload/private-file, Settings/Revision/Audit, Template,
test-send, request-path, Outbox, privacy, and public-bundle tests.

## 4. Decisive verification record

All fixtures, identities, configuration, and database rows were conspicuously
Synthetic. No browser, SMTP/Provider, credential, remote service,
Production/Staging data, formal data, or external action was used.

| Gate | Final result on the checkpoint tree |
|---|---|
| Runtime | PASS; Node `v24.14.0`, Darwin ARM64 |
| Focused payload/processor/envelope/test-send/static suite | PASS; 5 files / 64 tests |
| Zero-warning lint | `pnpm lint` PASS |
| Strict TypeScript | `pnpm typecheck` PASS; optimized Build TypeScript PASS |
| Source-clean architecture | Current graph/static-resource/URL/protected-capability checks reached; exit 1 only at inherited Phase-D sole-parent guard |
| Source-clean exact broad command | 141 files passed / 11 skipped; 1080 tests passed / 85 skipped; exit 1 only for inherited fixed-lineage child plus known Vitest source-map JSON error |
| Corrected tracked NUL-safe manifest | PASS; 152 exact tracked arguments; 141 files passed / 11 skipped; 1080 tests passed / 85 skipped; excluded only the authorized obsolete Phase-F diagnostic |
| Drizzle no-delta | PASS; 60 tables; `No schema changes, nothing to migrate`; protected digest `7ac8474854c473fd38cc923bbcb46e7e6998cacf52800dc311663c7c26488b7d` |
| Disposable PostgreSQL 18.4 | PASS; Fresh/Upgrade/repeat plus M-01/M-02/M-03 matrices, transaction/idempotency/claim/Lease/concurrency/rollback/query-plan evidence |
| Isolated migrated/core-seeded Build | PASS; migrations, core seed, optimized compile, strict TypeScript, 43 static pages |
| Public bundle | PASS; 382 eligible server runtime files, 20 public manifests, 7 root chunks, 8 manifest chunks, 15 distinct chunks |
| Post-Build architecture | Same inherited fixed-lineage Low only; generated output did not mask another failure |
| Post-Build exact broad command | Same 141/11 files and 1080/85 tests; same inherited fixed-lineage/source-map result and no new ordinary failure |
| Diff/whitespace/protected scope | PASS; 9 code/test paths; no prohibited path; `git diff --check` clean |
| Browser | NOT RUN by Owner authorization; no browser was ensured or downloaded |

The unmodified `pnpm test:run` command was not caught, filtered, skipped,
suppressed, downgraded, or blessed. Both source-clean and post-Build runs have
153 discovered files, 1172 discovered tests, and the identical inherited L-02
ordering. The source-bound manifest has 152 tracked arguments and 1165 tests.

The real database used only the already-local ARM64
`postgres:18.4-alpine` image
`sha256:9a8afca54e7861fd90fab5fdf4c42477a6b1cb7d293595148e674e0a3181de15`,
`--pull=never`, a random loopback-only port, Synthetic credentials, randomized
Fresh/Upgrade databases, and the existing guarded verifier. Every prefixed
database and exact container was removed; a final filtered `docker ps` returned
empty.

Isolated PGlite/database/storage roots and generated Build roots were placed in
recoverable macOS Trash locations. They are ignored local evidence and not
Candidate artifacts.

## 5. Exact bounded changed paths

The code/test checkpoint changes exactly nine paths relative to the failed
Candidate:

1. `src/integrations/notification-outbox-payload.ts`;
2. `src/integrations/notification-outbox-payload.test.ts`;
3. `src/integrations/notification-outbox.ts`;
4. `src/integrations/notification-outbox.integration.test.ts`;
5. `src/integrations/email.ts`;
6. `src/integrations/email.test.ts`;
7. `src/email-templates/test-send.integration.test.ts`;
8. `src/integrations/outbox-convergence.static.test.ts`; and
9. `scripts/verify-stage5-f1-postgres.ts`.

This report and its adjacent sidecar are the only report-bearing successor
additions.

There is no Schema, Migration, Snapshot, Journal, table, column, enum, index,
constraint, dependency, lockfile, package script, CI, role, permission, Inquiry
lifecycle, CRM, Template contract, Analytics/Provider, Route/SEO/Product,
Publish/Index, Admin UI, browser, external configuration, queue, state, Worker,
scheduler, cache, heartbeat, retry controller, or Provider action change.

## 6. Complexity and simplification statement

- M-01 deletes a false pseudo-deployment mechanism; it adds no replacement
  state and keeps one strict read-only legacy parser.
- M-02 adds predicates and terminal transition coverage inside the existing
  Outbox processor; it adds no state, counter, queue, Worker, or cleanup path.
- M-03 replaces one frozen timestamp option with one injected clock and removes
  the batch-time propagation; it adds no Lease lifecycle.
- L-01 merges two sequential prefix normalizers into one canonical shared
  subject policy path.
- Total persistent and cross-process complexity is unchanged. Runtime branching
  increases only for the required existing-state exhaustion terminalization;
  duplicate and false authorities decrease.

## 7. Open finding and next gate

No new remediation-scope failure is known from Implementer verification. This
is not an Independent Review conclusion and does not itself close M-01, M-02,
M-03, or L-01.

The inherited Phase-D fixed-lineage/Vitest source-map L-02 remains visible,
unchanged, and unsuppressed. It is not authorized for change in this attempt and
did not mask a Candidate-related ordinary failure.

Rollback is the exact failed Candidate
`3fac009e8ea64e08c4df6d9cc2b997eeb59a1851`. The next gate is a fresh
Independent Re-Review of the exact report-bearing successor Candidate. This
report grants no Owner acceptance, S5-F5, Merge, Push, Deploy, SMTP/Provider,
Production/Staging, DNS, formal data, Publish, Index, or external authority.
