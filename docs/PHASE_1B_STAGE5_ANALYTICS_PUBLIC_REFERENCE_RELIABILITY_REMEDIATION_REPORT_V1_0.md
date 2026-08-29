# CWT Phase 1B Stage 5 Analytics Public Reference Reliability Remediation Report V1.0

Date: 2026-08-29 (Asia/Shanghai)
Task: remediation attempt 1 for independent-review finding M-01 only
Branch: `refs/heads/codex/phase-1b-stage5-analytics-public-reference-reliability-v1`
Immutable failed Candidate: `d11d5a94a474bf8bfe868bcf882b5a293727df95`
Code/test checkpoint: `188f90681839795dd18b9361cf6c75e98b7a51d2`
Checkpoint sole parent: `d11d5a94a474bf8bfe868bcf882b5a293727df95`
Status represented by this document: Implementer remediation completion only; not independent re-review, P1 closure, Owner acceptance, S5-F2 authority, or external-action authority.

## 1. Executive result

M-01 is claimed closed through one route-local control-flow correction. The
actual Inquiry handler now gives its two existing non-critical post-commit
analytics attempts independent best-effort failure boundaries:

1. `image_upload_completed` is attempted and handled independently when an
   Inquiry has upload tokens; and
2. `inquiry_created` is then attempted under its own existing redacted
   failure boundary.

A rejection or outcome from either attempt can no longer prevent the other
from being attempted. The event order, event writers, Event IDs, persisted
consent authority, Provider mapper, Conversion Domain predicate, and generic
redacted log text are unchanged.

For a colliding public reference, `image_upload_completed` correctly remains
outside Owner decision `OD-S5-AR-001`; its generic phone-like Event-ID guard
still rejects it and no row is written. That rejection no longer pre-empts the
separately authorized canonical `inquiry_created` event.

## 2. Failed review authority and custody

| Evidence | Exact identity | Result |
|---|---|---|
| Failed Candidate | `d11d5a94a474bf8bfe868bcf882b5a293727df95` | exact clean starting point; preserved as checkpoint parent |
| Failed Candidate tree | `a5529186f5d35a4bf988c2f0d1d316b9982c2e98` | exact |
| Review-only commit | `2ad7df210f75b068830a4dda5b3cf3206479b608` | sole parent exact failed Candidate; read only, not merged or cherry-picked |
| Independent review report | `docs/PHASE_1B_STAGE5_ANALYTICS_PUBLIC_REFERENCE_RELIABILITY_INDEPENDENT_REVIEW_V1_0.md` at the review-only commit | SHA-256 `beccbd33e0813359b9dcf971cbda788ec98b895f7cd5b81efc7d78a2bf6bd057`; exact |
| Review outcome | FAIL | Blocker 0, High 0, Medium 1, inherited Low 1 |

The prior implementation report and failed review remain immutable history.
The existing Owner authority and exact canonical-reference contract remain
unchanged; no additional Owner decision was needed for this route-local
remediation.

## 3. Root cause and corrected boundary

The failed Candidate correctly admitted only the exact
`inquiry_created:CWT-[0-9A-F]{20}` identity in the Conversion Domain. The
actual uploaded-Inquiry composition nevertheless attempted
`image_upload:${publicReference}` first. A phone-like decimal run correctly
made that different event fail its unchanged generic privacy guard.

Both awaited writes were inside one `try/catch`, so the first rejection skipped
the authorized `inquiry_created` call. Exact Inquiry replay could not recover
it because replayed submissions intentionally skip the entire analytics block.

The responsibility error was the caller exception boundary, not either event
validator. The remediation splits the existing boundary at the two awaited
calls. It adds no helper, framework, writer, retry, queue, state, fallback, or
persistent mechanism. The same generic log line remains in each local catch:
only the request ID and `details omitted` are written. No Event ID, public
reference, Upload Token, customer value, or exception detail is logged.

## 4. Decisive actual composition evidence

The committed regression uses the actual public Inquiry handler, actual
Inquiry and Conversion Domains, a disposable migrated database, persisted
Granted consent, a valid private Upload Token, and deterministic ten-byte
generation of `CWT-12345678901234567890`. Production randomness is unchanged.

Initial submission and exact replay prove:

- HTTP `201` followed by HTTP `200`;
- one Inquiry;
- one `inquiry_assets` relation;
- one Upload Intent, consumed exactly once;
- exactly one conversion row, the canonical `inquiry_created` identity;
- no `image_upload_completed` row for the colliding identity;
- no duplicate business, private, or event state; and
- exactly one generic `[analytics-rejected]` log whose content omits the
  public reference, Upload Token, customer email, and exception detail.

The Provider payload retains only the Owner-accepted canonical public
reference in `eventId` and `externalReference`. It contains no consent session,
conversion-row ID, internal Inquiry ID, Contact ID, Asset ID, Upload Token,
customer email, `entityId`, `inquiryId`, `contactId`, or `assetId`.

The same actual-handler suite also proves both neighboring paths:

- a non-colliding uploaded Inquiry retains one
  `image_upload_completed` plus one `inquiry_created`, both exactly once under
  replay; and
- a no-upload colliding Inquiry retains exactly one canonical
  `inquiry_created` under initial submission and replay.

This regression would fail at the failed Candidate because the first expected
image-event rejection would abort the second call and leave
`conversion_events` empty.

## 5. Preserved consent and privacy boundaries

The unchanged Conversion Domain suites continue to prove:

- Unknown, Denied, and Revoked persisted consent produce zero events;
- Granted persisted consent remains the sole write authority;
- missing/mismatched references, wrong event names, wrong prefix/length,
  lowercase, whitespace, extra prefix/suffix, unsupported characters,
  arbitrary phone-like IDs, email, UUID, and replay mismatch fail before
  analytics mutation;
- UTM, referrer, path, safe-property, customer-data, and private-data guards
  remain authoritative; and
- the special phone-like bypass remains limited exactly to the canonical
  `inquiry_created` event/reference pair.

No allowance, remapping, or Provider exposure was added for
`image_upload_completed`.

## 6. Verification record

| Gate | Decisive result |
|---|---|
| Direct affected suite | 2 files / 64 tests passed |
| Focused analytics/Inquiry composition suite | 6 files / 87 tests passed |
| ESLint | pass, zero warnings |
| Strict TypeScript | pass |
| Drizzle no-delta | 60 tables; `No schema changes, nothing to migrate`; status and journal hashes unchanged |
| Real PostgreSQL 18.4 | pass; fresh migration, canonical persistence, same-row replay, consent zero mutation, rejection boundaries, Provider mapping, exact database/container cleanup, local image unchanged |
| Corrected NUL-safe source manifest, final | 143 discovered, exact obsolete diagnostic excluded, 142 selected; 131 files / 989 tests passed and 11 files / 85 tests skipped |
| Isolated migrated/core-seeded Build | migrations, core seed, optimized compile, strict TypeScript, and 43 static pages passed; original temporary DB path absent and recoverably moved to macOS Trash |
| Public bundle boundary | pass; 376 eligible server runtime files, 20 public page manifests, 7 root chunks, 8 manifest chunks, 15 distinct chunks |
| Diff/protected scope | remediation checkpoint changes exactly two paths; `git diff --check` pass; Conversion Domain, Provider, Inquiry Domain, Schema/Migration, dependencies/lockfile, CI, verifier, and S5-F2 paths unchanged |

The first corrected source-manifest run completed with one unrelated
`src/db/schema/ai.integration.test.ts` five-second timeout under parallel suite
load: 130 files passed, 11 skipped, one timed out; all other 988 tests passed.
The unmodified failing file immediately passed alone in 1.28 seconds. The
complete corrected manifest was then rerun without increasing timeout or
excluding another file and passed with the final aggregate above. No source,
test configuration, or timeout was changed, and the transient result is not
hidden.

The exact unmodified `pnpm test:run` command reported 131 passed files, 11
skipped files, 989 passed tests, and 85 skipped tests, then exited 1 only with
the inherited obsolete Phase D generated-root diagnostic at
`.next/node_modules/@aws-sdk/client-s3-64df096a7e71b28d` and Vitest's resulting
source-map JSON parse error. No ordinary test failed. The inherited Low was
neither suppressed nor reclassified.

Real PostgreSQL used only `/Users/calvin/.docker/bin/docker`, the already-local
`postgres:18.4-alpine` image
`sha256:9a8afca54e7861fd90fab5fdf4c42477a6b1cb7d293595148e674e0a3181de15`,
`--pull=never`, a loopback-only random port, Synthetic credentials, and the
`postgres` admin database. No network service, registry, Provider, remote
database, Production credential, or formal data was accessed.

No Playwright browser execution was relevant to this route-only change. The
ensure/download command was not run and no browser was downloaded.

## 7. Exact remediation scope and complexity

The code/test checkpoint changes exactly two paths relative to the failed
Candidate:

1. `src/app/api/inquiries/route.ts` — sole production change; and
2. `src/app/api/inquiries/route.integration.test.ts`.

Production changes by six net lines: one existing conditional moves outside
the original `try`, and one matching local catch preserves the same log
contract. There is no second analytics path: both calls still use the single
existing `recordConversionEvent` writer.

No table, column, Migration, dependency, lockfile, package script, CI rule,
Provider call/configuration, Event ID, event exception, consent authority,
Inquiry Domain behavior, queue, Worker, retry state, fallback, global helper,
or compatibility layer changed. Persistent complexity stays level; the local
exception boundary now matches the two independent non-critical outcomes.

## 8. M-01 disposition, residual risk, rollback, and next gate

**Implementer disposition claim: M-01 CLOSED at the remediation Candidate.**
This claim requires fresh independent re-review and is not self-approval.

The Owner-accepted residual risk remains exactly Provider visibility and
correlation of the canonical public Inquiry reference for `inquiry_created`
only. `image_upload_completed` retains the generic phone-like privacy guard,
so aggregate upload analytics remains absent for a colliding identity; this is
the explicit unchanged disposition required by the remediation authority.

The inherited obsolete Phase D broad-harness/source-map diagnostic remains an
open Low. No additional implementation finding is known. Production Ready
remains **No**.

The remediation rollback point is immutable failed Candidate
`d11d5a94a474bf8bfe868bcf882b5a293727df95`. The rollback point for the whole
bounded correction remains accepted S5-F1 baseline
`ccf233c786ed80036d0779c4aa142076f6795061`. The checkpoint is a single-parent
successor and contains no merge. The report-bearing Candidate is the sole
successor that adds this report and adjacent SHA-256 sidecar; its exact commit
is recorded in the Coordinator callback after commit creation.

The single next gate is a different fresh independent re-review of the exact
remediation Candidate, including the lightweight Security & Test
Simplification Check and normal analytics/security/privacy/consent/Provider/
replay review. Implementer completion does not close P1, accept the Candidate,
authorize S5-F2, or authorize Merge, Push, Deploy, Provider call, Production,
Publish, or Index action.
