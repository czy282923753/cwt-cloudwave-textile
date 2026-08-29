# CWT Phase 1B Stage 5 Analytics Public Reference Reliability Implementation Report V1.0

Date: 2026-08-29 (Asia/Shanghai)
Task: bounded P1 analytics public-reference reliability correction
Branch: `refs/heads/codex/phase-1b-stage5-analytics-public-reference-reliability-v1`
Immutable accepted parent / rollback point: `ccf233c786ed80036d0779c4aa142076f6795061`
Code/test checkpoint: `a12f4f8b0e92d57dbd01a5549ae4687f9a45cfd3`
Checkpoint sole parent: `ccf233c786ed80036d0779c4aa142076f6795061`
Status represented by this document: Implementer completion only; not independent review, P1 closure, Owner acceptance, S5-F2 authority, or external-action authority.

## 1. Executive result

The inherited analytics measurement loss is corrected at its single causal
boundary. `recordConversionEvent` now recognizes one exact identity contract:

- `eventName === "inquiry_created"`;
- `externalReference` exactly matches case-sensitive
  `CWT-[0-9A-F]{20}`; and
- `eventId === inquiry_created:${externalReference}`.

Only that exact identity bypasses the generic phone-like Event-ID rejection.
The ordinary Event-ID syntax, length, email, UUID, and phone-like guards remain
in the same validation path. All field-level UTM, path, referrer,
`safeProperties`, customer-data, and private-data checks are unchanged.

The correction also makes the same validated public reference authoritative
for insertion and replay comparison. There is no second writer, Provider
branch, compatibility path, queue, state, Schema, Migration, dependency, or
new identifier.

## 2. Authority and immutable custody

| Evidence | Exact identity | Result |
|---|---|---|
| Accepted S5-F1 parent | `ccf233c786ed80036d0779c4aa142076f6795061` | exact HEAD before mutation; preserved as sole checkpoint parent |
| Owner bounded-correction authority | `/Users/calvin/Downloads/CWT（CloudWave Textile）项目/docs/handoff/PHASE_1B_STAGE5_ANALYTICS_PUBLIC_REFERENCE_OWNER_RISK_ACCEPTANCE_AND_BOUNDED_CORRECTION_AUTHORITY_V1_0.md` | SHA-256 `12aa76bd6d6a56364fb5c07d8d07aa61e5528ca907500a78342dac41785e8e45`; exact |
| Accepted S5-F1 acceptance record | `/Users/calvin/Downloads/CWT（CloudWave Textile）项目/docs/handoff/PHASE_1B_STAGE5_F1_OWNER_ACCEPTANCE_V1_0.md` | SHA-256 `a779ddbfe3f7ae3db13998d5c4b882658de9017009bb534aa67cd4d1225ebd1f`; exact |
| Final S5-F1 review-only evidence | `6ebf05be06c02d6cda84d47c9402943a22767415` | read-only evidence; not an implementation parent and not merged |
| Final S5-F1 independent report | `docs/PHASE_1B_STAGE5_F1_CHOICE_A_REPLACEMENT_INDEPENDENT_REREVIEW_V1_1.md` in the review-only commit | SHA-256 `18cd4e8233c5c2014614f188ca28e7d0d9ddb29ebb4ef785426c1df0e95e9089`; exact |

Root `AGENTS.md`, `docs/ENGINEERING_GOVERNANCE.md`, and
`docs/REVIEW_POLICY.md` were read before implementation. No coordinator
handoff file was copied, edited, or committed.

## 3. Root cause and corrected responsibility boundary

The public Inquiry generator already emits ten random bytes as exactly twenty
uppercase hexadecimal characters under `CWT-`. The actual Inquiry handler
already composes the deterministic Event ID from that reference, and the
Provider mapper already exports the same public reference. The only defect was
that the generic `phoneLike` Event-ID classifier interpreted a decimal run
inside a legal random hexadecimal suffix as customer data.

The correction remains inside the Conversion Domain validator. One local
predicate converges event name, raw Event ID, and raw external reference before
any analytics insert. A mismatched or malformed Inquiry identity now fails
closed even when it would not independently match the phone detector. The
validated reference is then reused by the insert and by the existing
deduplication replay check.

This replaces the former separately normalized external-reference acceptance;
there is no duplicate external-reference authority and no old/new dual path.

## 4. Exact fail-closed behavior

The special allowance is unavailable for:

- missing or null references;
- a different event name;
- a different Event ID or external-reference pair;
- wrong prefix or length;
- lowercase hexadecimal;
- leading/trailing whitespace or other extra prefix/suffix;
- unsupported characters; or
- arbitrary phone-like Event IDs.

The tests additionally retain generic email and UUID Event-ID rejection and
the established UTM, private path, non-allowlisted property, and Provider
identity-omission assertions. Consent is checked from persisted server state
before the event path: Unknown, Denied, and Revoked return `null` and produce
no event.

## 5. Completeness proof for canonical references

The production predicate has the exact regular language
`CWT-[0-9A-F]{20}` and exact equality
`inquiry_created:${externalReference}`. For every member of that language:

1. the Event ID is non-empty, below 128 characters, and contains only the
   existing allowed Event-ID characters;
2. it cannot match the email or canonical UUID classifiers;
3. the new predicate is true by construction; and
4. therefore only a possible `phoneLike` match is bypassed, while every other
   guard still executes.

The focused suite executes 304 distinct canonical references covering every
one of the sixteen hexadecimal symbols in every one of the twenty suffix
positions, plus targeted historical collision shapes including
`CWT-12345678901234567890`, an internal eight-digit run, and a leading
eight-digit run.

An independent dynamic recurrence partitions safe suffix prefixes by their
current trailing decimal-run length `0..7`. Extending by one of six letters
resets that run; extending by one of ten digits increments it; extending a
length-seven run by a digit enters the rejected set. Over all twenty positions
it reproduces exactly:

- total suffixes: `16^20 = 1208925819614629174706176`;
- formerly colliding suffixes: `153275237190860800000000`; and
- collision probability: approximately `12.6786304%`.

The proof does not rely on random sampling.

## 6. Actual Inquiry and Provider composition

The actual `POST /api/inquiries` handler test uses the narrowest existing test
seam: Node's `randomBytes` is fixed only in the test before importing the real
handler and restored afterward. Production randomness is unchanged. Ten fixed
bytes generate `CWT-12345678901234567890` through the actual Inquiry Domain.

With persisted Granted consent, initial submission and exact retry prove:

- HTTP `201` then replay HTTP `200`;
- the same canonical public response reference;
- one committed Inquiry and exactly one `inquiry_created` row;
- exact Event ID and external-reference equality;
- deterministic deduplication under replay;
- the Provider payload retains the same canonical reference; and
- Provider output contains no consent-session identity, internal Inquiry or
  Contact ID, customer email, `entityId`, `inquiryId`, `contactId`, or
  `assetId`.

## 7. Real PostgreSQL 18.4 evidence

The committed guarded verifier
`scripts/verify-stage5-analytics-public-reference-postgres.ts` accepts only an
explicit validation flag, a loopback admin URL, a conspicuously Synthetic
username, and the `postgres` admin database. It creates one random-prefixed
disposable database, migrates `0000 -> current`, and drops that database in a
`finally` boundary.

Execution used only:

- Docker executable `/Users/calvin/.docker/bin/docker`;
- client/server `29.6.2`, Linux ARM64 server;
- already-local `postgres:18.4-alpine` image ID
  `sha256:9a8afca54e7861fd90fab5fdf4c42477a6b1cb7d293595148e674e0a3181de15`;
- `--pull=never` and a random loopback-only host port; and
- conspicuously Synthetic local credentials and data.

The verifier passed canonical decimal-run persistence, same-row replay,
exact-pair storage, Provider mapping, mismatch and arbitrary-phone rejection
before mutation, and Unknown/Denied/Revoked zero-event behavior. The exact
container was absent afterward, no prefixed disposable database remained, and
the local image ID was unchanged. No registry, download, network service,
external Provider, remote database, production credential, or formal data was
used.

## 8. Verification record

| Gate | Decisive result |
|---|---|
| Runtime authority | Node `v24.14.0`, pnpm `11.9.0`, Darwin ARM64; pass |
| Native diagnosis | Sharp `0.35.3`, Lightning CSS, and Next SWC Darwin ARM64 loaded |
| Playwright readiness | Playwright `1.62.1`, Chrome for Testing `151.0.7922.34`; dry-run/readiness only, no ensure/download |
| ESLint | pass, zero warnings |
| Strict TypeScript | pass |
| Direct affected suite | 2 files / 63 tests passed |
| Focused analytics/Inquiry composition suite | 6 files / 86 tests passed |
| Drizzle no-delta | 60 tables; `No schema changes, nothing to migrate`; status and journal hashes unchanged |
| Real PostgreSQL 18.4 | pass with exact database/container cleanup and unchanged local image identity |
| Corrected NUL-safe source-bound manifest | 143 discovered, exact obsolete diagnostic excluded, 142 selected; 131 files / 988 tests passed and 11 files / 85 tests skipped |
| Isolated migrated/core-seeded Build | migrations, core seed, optimized compile, strict TypeScript, and 43 static pages passed; original temporary DB path absent and recoverably moved to macOS Trash |
| Public bundle boundary | pass; 376 eligible server runtime files, 20 public page manifests, 7 root chunks, 8 manifest chunks, 15 distinct chunks |
| Diff/protected scope | `git diff --check` pass; Schema/Migration, dependencies/lockfile, CI, Provider mapper/config, Inquiry production, and S5-F2 paths unchanged |

The required unmodified `pnpm test:run` was also run. It reported 131 passed
files, 11 skipped files, 988 passed tests, and 85 skipped tests, then exited 1
only with the inherited obsolete
`src/ai/phase-f-m6-one-case-diagnostic.integration.test.ts` production
static-language diagnostic and Vitest's resulting source-map JSON parse error.
No ordinary test failed. The changed Conversion source naturally moves the
byte position printed for its already-known ordinary global `URL` use, but the
diagnostic still reports no static resource candidate or unresolved edge; the
underlying obsolete Phase D count mismatch predates this correction. It was
not suppressed, reclassified, or changed.

## 9. Changed scope and complexity

The code/test checkpoint changes exactly four paths:

1. `src/analytics/conversion-service.ts` — sole production change;
2. `src/analytics/conversion-service.integration.test.ts`;
3. `src/app/api/inquiries/route.integration.test.ts`; and
4. `scripts/verify-stage5-analytics-public-reference-postgres.ts`.

No table, column, Migration, dependency, lockfile, package script, CI rule,
Provider call/configuration, consent authority, Inquiry production path,
analytics writer, queue, Worker, lease, recovery type, fallback, or
compatibility layer was added. One local identity predicate replaces the old
separate external-reference normalization and reuses the validated value for
insert and replay. Persistent and operational complexity stay level; local
validation is stricter and more explicit.

## 10. Residual risk, rollback, and next gate

The only newly exercised residual risk is the exact risk accepted by Owner
decision `OD-S5-AR-001`: Provider visibility and correlation of the canonical
public Inquiry reference for `inquiry_created`. This Candidate does not broaden
that reference to any other event, field, identifier, or attribution source.

The inherited obsolete Phase D broad-harness/source-map diagnostic remains an
open Low and is reproduced above. No additional open implementation finding is
known. Production Ready remains **No**.

Rollback is the immutable accepted parent
`ccf233c786ed80036d0779c4aa142076f6795061`. The checkpoint is a single-parent
successor and contains no merge. The report-bearing Candidate is the sole
successor adding this report and adjacent SHA-256 sidecar; its exact commit is
recorded in the mandatory Coordinator callback after commit creation.

The single next gate is a different fresh independent Reviewer performing the
lightweight Security & Test Simplification Check plus normal analytics,
security, privacy, consent, Provider-payload, PostgreSQL persistence, and
replay review. Implementer completion does not close P1, accept the Candidate,
authorize S5-F2, or authorize Merge, Push, Deploy, Production, Provider,
Publish, or Index action.
