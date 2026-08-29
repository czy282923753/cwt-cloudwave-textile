# CWT Phase 1B Stage 5 S5-F1 Choice A Replacement Implementation Report V1.0

Date: 2026-08-29 (Asia/Shanghai)
Task: S5-F0 tooling adoption plus S5-F1 Request Identity / attribution foundation
Implementation branch: `refs/heads/codex/phase-1b-stage5-f1-choice-a-replacement-v1`
Code/test checkpoint: `2c33b21f5f8fdf5d421b27497e20c2c98f0a8063`
Checkpoint sole parent: `f05852dbd3c5cff80421793a4ea345e401d50361`
Status represented by this document: Implementer completion candidate only; not acceptance and not authority for S5-F2.

## 1. Executive result

This is a fresh replacement implementation from the exact accepted Stage 4
baseline. It implements Owner-selected OD-S5-F1-01 Choice A: independently
unsafe optional attribution observations normalize to `null`, safe siblings
remain, and an otherwise valid Inquiry continues through the ordinary success
path. The Inquiry Domain Service is the sole new-write normalization and
omission authority.

The implementation also integrates the separately Owner-adopted S5-F0 local
Playwright readiness delta byte-for-byte. It does not cherry-pick or merge the
tooling commit or any failed S5-F1 Candidate.

The claim is deliberately bounded. It proves the specified path/origin/token
grammar and data-minimization behavior; it does not claim absolute PII
detection and does not add a generalized detector or obfuscation framework.

## 2. Authority and identity reproduction

| Authority | Reproduced identity | Result |
|---|---|---|
| Accepted Stage 4 code baseline | `f05852dbd3c5cff80421793a4ea345e401d50361` | exact |
| Annotated Stage 4 tag object | `d5a8828197282f2d5d2929bf59bd5589949b650b` | object type `tag`; peels exactly to `f05852...` |
| Accepted Stage 5 plan Candidate | `59d5d039c8724560dec6e7ee80b72307d8a3acad` | sole parent `f05852...` |
| Accepted plan SHA-256 | `91bb6d37e097dcc996256564550280118e5d9eafa48793440a5ed3ed67980510` | exact |
| Technical Escalation commit | `9c9b666e5cdf919af225ba22c33b7b2d101b18e6` | sole parent `f05852...` |
| Technical Escalation report SHA-256 | `cfc30fdeb5365f3f769e6fdd454187d081273af4e1212821f20cabefea130e4b` | exact |
| Owner amendment SHA-256 | `ce26c8ca865492945d38ad8ac6227bc611d2f7e14943926a07273403207c6173` | exact; Choice A selected |
| Adopted tooling Candidate | `95910030f61b648aac2b708de293f06f02046c23` | sole parent `f05852...` |
| Migration Journal before work | ended at `0021` | no `0022` collision |

The root `AGENTS.md`, `docs/ENGINEERING_GOVERNANCE.md`, applicable CRM,
privacy/security, analytics, testing, Migration, ADR, accepted plan, complete
Technical Escalation report, and frozen Owner amendment were read before
mutation.

## 3. Owner-selected contract implemented

### 3.1 Choice A omission boundary

- Browser First Touch, Last Non-Direct, and Submit Touch are optional,
  untrusted observations.
- NFC normalization, trim, empty, maximum length, grammar, origin/path shape,
  private namespace, UUID, email, file-like, control/unsupported-character,
  and digit-budget decisions execute in the Inquiry Domain Service.
- Each optional field is independent. Unsafe content becomes literal `null`;
  safe siblings persist.
- The required `sourcePagePath` and required core Inquiry input remain hard
  failure boundaries with zero business mutation.
- Existing required `inquiry.created` Audit may add only omitted field names and
  stable reason codes. It contains no raw omitted value or hash and creates no
  extra event, state, table, column, queue, or Worker.
- S5-F1 writes `source_entity_type = null` and `source_entity_id = null` and
  does not accept either as public input.

### 3.2 Token and date behavior

Persistable optional tokens use the exact ASCII grammar
`^[A-Za-z0-9][A-Za-z0-9 ._:-]*$` after NFC/trim. Calendar-valid,
non-digit-adjacent `YYYY-MM-DD` spans are masked; every remaining ASCII digit
across the complete token is counted. `D <= 6` is eligible and `D >= 7`
normalizes to `null`.

Deterministic properties insert every allowed ASCII letter plus space, period,
underscore, colon, and hyphen at every partition of every 7-15 digit sequence.
They also cover prefixes, suffixes, multiple separators, aggregate sequences
above 15 digits, valid/invalid calendars, leap years, multiple dates, digit
adjacency, and date-plus-phone combinations.

Named cases include:

| Class | Representative cases | Choice A result |
|---|---|---|
| Safe campaigns | `spring-launch`, `launch-2026-08-29`, `2024-02-29` | retained |
| Whole phone-shaped | `+86 138 0013 8000`, `13800138000`, `138-0013-8000` | field `null`; Inquiry succeeds |
| Embedded/labeled | `call-13800138000`, `promo_138-0013-8000`, `phone:138:0013:8000` | field `null`; Inquiry succeeds |
| Aggregate | `13800138000-13900139000`, `1380013800013900139000` | field `null`; Inquiry succeeds |
| Grammar segmentation | space, period, underscore, colon, letters and multiple separators | invariant `null` for `D >= 7` |
| Date-mixed | valid date plus phone, adjacent date digits, invalid leap date plus phone | only valid non-adjacent dates masked; remaining digit budget applied |
| Conservative false positive | `campaign-1234567` | only that field `null`; Inquiry succeeds |
| Other bounded unsafe classes | email, canonical UUID, known filename, private path, invalid origin, credentials/path/query/fragment origin, control, Unicode, oversize | affected field `null`; safe sibling retained |

### 3.3 Bounded residual risk

The focused tests intentionally document values outside the structural claim:
word-encoded numbers, a six-digit local number, a valid date-shaped value, and a
syntactically safe private business identifier may persist. This is an explicit
residual risk, not a detector defect hidden by the report. Choice A also
intentionally omits non-private campaign identifiers with seven or more
post-date digits; the availability cost is limited to that optional field.

## 4. Request identity and transaction behavior

- Fingerprint v2 is the sole new-row writer and hashes the exact sanitized/null
  canonical values, including four Submit Touch values and attachment identity.
- Different unsafe raw values that both normalize to `null` are equal under the
  same Idempotency Key.
- Safe versus `null`, and different safe values, conflict.
- The exact frozen v1 reader remains read-only under recorded-version dispatch.
  The golden v1 input produces
  `edc9c0a1ba6afb6cf9fee6cfbf8ed1371498ff44153f41a8467b2a9fcd6d0b85`.
- A v1 replay ignores v2-only Submit values and creates no backfill, Outbox, or
  Audit side effect.
- Null, malformed, unsupported, uppercase/non-64-hex, and unequal stored
  identities fail closed.
- Attachment identity remains order-insensitive; raw Upload Tokens do not enter
  the fingerprint.
- Required Audit failure rolls back Contact, Inquiry, attachment relation,
  status history, existing one-kind Outbox, and Audit effects.

Actual public-handler tests use the production handler, actual Domain Service,
and a disposable database. They prove ordinary `201` success for all stable
omission reason classes, safe sibling persistence, version-2 fingerprinting,
only public `ok/reference/replayed` response keys, and absence of each unsafe raw
value/hash from Inquiry, Outbox, Audit, response, captured logs, and analytics.
Malformed optional type, unsafe required path, and invalid core input return the
generic `400` with zero six-table mutation.

## 5. L-01 single frozen capture

`InquiryForm` obtains exactly one synchronous attribution observation per
logical attempt. The captured attribution object, request payload, Upload Token
array, and visible attachment-name array are frozen together. Initial request,
uncertain retry, and success tracking reuse this one object; no success-path
recapture occurs.

The actual-form/real-tracking composition tests prove one observation for
initial success and one observation across uncertain send plus retry, byte-
identical Inquiry request bodies and Idempotency Key/Upload Tokens across retry,
one `quote_submit_success` event, and reuse of the same attribution object.
Submit Touch and anonymous Session identity are not copied into the analytics
event body. Unrelated tracking call sites retain their normal capture behavior.

## 6. Schema and Migration 0022

Migration `0022_phase1b_stage5_inquiry_attribution` is additive only:

- four nullable Submit Touch text columns;
- nullable `source_entity_type` text and `source_entity_id` UUID;
- composite `inquiries_source_entity_idx`;
- one paired-null Check that allows a non-null pair only for `product`,
  `application`, or `content`.

There is no backfill, raw/omission column, registry, trigger, FK, enum, table, or
historical Migration edit. Journal entries `0000..0021` reproduce the baseline
object sequence exactly; the sole new entry is `idx = 22`. Drizzle generation
reported `No schema changes, nothing to migrate`, and worktree status was
unchanged by the no-delta generation.

Real PostgreSQL validation used local `postgres:18.4-alpine`, image ID
`sha256:9a8afca54e7861fd90fab5fdf4c42477a6b1cb7d293595148e674e0a3181de15`,
Docker client/server `29.6.2`, server Linux ARM64, `--pull=never`, a unique exact
container name, Synthetic credentials/database names, and a random loopback-only
published port. No install, pull, registry contact, external endpoint, or
Production/Staging credential was used.

The verifier passed Fresh `0000 -> 0022`, Upgrade `0021 -> 0022`, repeat/no-op,
all valid/invalid source-pair cases, legacy nulls, forced index plan, equal and
different concurrency, v1/v2 replay, and required-Audit rollback. Upgrade
preserved representative Inquiry, Outbox, Audit, route, analytics-consent,
conversion-event, AI config, and AI run rows. The exact disposable databases and
container were absent after cleanup.

## 7. Analytics, logs, provider, URLs, and bundle boundary

- No analytics Schema, conversion-service, provider mapper, monitoring, or log
  module was changed.
- New Submit Touch and source-entity values are never copied into
  `conversion_events`, analytics provider payloads, browser success-event
  payloads, logs, monitoring, or browser URLs.
- Granted server-persisted consent remains the analytics write gate; the actual
  handler test proves Unknown consent writes no conversion row and the existing
  analytics suites remain green.
- Public analytics receives only Domain-sanitized First/Last values. CRM
  sanitization is not exported as analytics authority.
- The fresh bundle gate scanned 20 public page manifests, 7 root chunks, 8
  manifest chunks, and 15 distinct public chunks. Source-entity fields and the
  server CRM Schema occur only in admin-referenced output, not a public
  manifest-referenced chunk.
- Authorized InquiryForm Submit transport field names and capture logic are
  necessarily client code, but no observed raw value is compiled into the
  bundle, placed in a browser URL, or forwarded to analytics.

## 8. S5-F0 exact tooling adoption

| Path | Working/adopted Git blob |
|---|---|
| `package.json` | `03d899629a8470645555bfbbd185e6f18041f5d4` |
| `scripts/check-playwright-readiness.mjs` | `25e1276ed3c4669583926c306cf048435d812498` |
| `docs/TR_P2_01_LOCAL_PLAYWRIGHT_READINESS_IMPLEMENTATION_REPORT_V1_0.md` | `4a65bd1bc847a0fdeec5f19ee06ca97174196601` |

All three blobs are byte-identical to adopted Candidate `95910030...`.
`pnpm-lock.yaml` remains byte-identical to `f058` with blob
`bcfbaf81ae4d976bea347c49940479f5b98834c3`. No dependency, CI, browser/cache
path, lockfile, or tooling-semantic change was made. Runtime authority was run
before browser-scoped readiness. No ensure/download/network command was run.

## 9. Verification record

| Gate | Decisive result |
|---|---|
| Runtime authority | Node `v24.14.0`, Darwin ARM64; pnpm `11.9.0`; runtime accepted |
| Native diagnosis | `sharp 0.35.3`, Lightning CSS, and Next SWC Darwin ARM64 loaded |
| Offline install | frozen install from existing user store; zero downloads; no network |
| Playwright readiness | ready; Playwright `1.62.1`, Chrome for Testing `151.0.7922.34`; no ensure/download |
| ESLint | zero warnings |
| strict TypeScript | pass |
| Drizzle generate/no-delta | pass; no Schema changes |
| Focused final suites | 7 files, 80 tests passed |
| Broad repository command | 130 files / 914 tests passed, 11 files / 85 tests skipped; exit 1 only from the inherited obsolete Phase D Low static-language/source-map diagnostic |
| Corrected NUL-safe complete manifest | exact obsolete diagnostic excluded; 130 files / 926 tests passed, 11 files / 85 tests skipped |
| Real PostgreSQL 18.4 | Fresh, Upgrade, repeat, constraints, legacy preservation, index, concurrency, v1/v2, Audit rollback, cleanup passed |
| Isolated migrated/core-seeded Build | production build compiled, strict TS passed, 43 static pages generated |
| Public bundle boundary | pass: 376 eligible server runtime files; 20 public manifests; 15 distinct public chunks |
| Source/scoping integrity | `git diff --check` pass; changed-path allowlist pass; historical Migration prefix pass |

The broad-command exception is not hidden: the frozen
`src/ai/phase-f-m6-one-case-diagnostic.integration.test.ts` invokes the obsolete
AI static-language baseline. The underlying checker reports current Production
static-language positions and Vitest then raises the known source-map parsing
error. This is the exact inherited Low finding recorded by the accepted
Technical Escalation report. The source-bound, NUL-safe complete manifest
demonstrates all other discovered test files to completion.

## 10. Exact changed-path scope and SHA-256 manifest

The checkpoint contains exactly these 18 authorized paths:

```text
b18231ab3fcb8d845e5f93ebfe17e5f59a650b699edabea07243f135af29523b  docs/TR_P2_01_LOCAL_PLAYWRIGHT_READINESS_IMPLEMENTATION_REPORT_V1_0.md
7f1bed64d3a8e60d3eefcbecd96fceb6b2ba18e3eb345966153e80d09921dbb5  drizzle/0022_phase1b_stage5_inquiry_attribution.sql
357aa390be971f18abbe5024a38202395578160ae4e83233f3ba407b678d7818  drizzle/meta/0022_snapshot.json
ee7de661e8470eb52c65caed25d5990c8af6130cf25a628ad95894ea89f8b243  drizzle/meta/_journal.json
36fb0554263161309f7fd0a820ad9fa496016abd99e1b6527651a9cd33e3b673  package.json
14ffc44fe38a6affc8ff41cbc37bff96f1a5cc19a42a6f07a6f60d1c57b915b7  scripts/check-playwright-readiness.mjs
85b32e9f41e3ee15abf7d57a20d938b022e11b0319615342f46e281340393875  scripts/verify-stage5-f1-postgres.ts
7de32895fddec36295749f559c3d2b27a5c38dc9b502dd4975fcf6403e31367e  src/app/api/inquiries/route.integration.test.ts
67a814f92b75efae357a14db99fa29b7baef88aec615b13d7d148a295755ac65  src/app/api/inquiries/route.ts
65e730e5ea8c4352af95b8aa17e26d3498f9fe6018a563ffc05e4eeb442de02e  src/crm/inquiry-attribution.test.ts
758dd488a9c19252afc23c1ba05c7735c6b05f8ec920bfdb96f9252fb5959cdf  src/crm/inquiry-attribution.ts
5ba8816235de67eb4ffe39b0d6edb9f0bf757e21ef165a71c4bc4239b76e7e6c  src/crm/inquiry-request-identity.integration.test.ts
3265752bf8cfc467206537ac96e11780a2873eed8f189a89f2bb05c4a1f706ce  src/crm/inquiry-service.ts
71ea1162b1b6f0183bd91f96dfc67a9140e5a80d57a8381288955dd57e1d132e  src/db/schema/crm.ts
a7cfa870b574d812b0af0b6e8ac26fcb07f48edd8c0add129210a830bec4fdf6  src/db/stage5-f1-migration.integration.test.ts
fd0c86773420c4b3cd44d5a4c973b82d1e0e0ed075703454ebcd328cdf70b7fb  src/public-site/inquiry-form.test.tsx
145dbbabe7e1eaac501f97886a96b1b487051f9ef26a04e1287d77e3597db3e2  src/public-site/inquiry-form.tsx
8392e34fe932507a3dd1f6b9bedfb8c18ff94eb68807c2f079865cd744fdd3f9  src/public-site/tracking.tsx
```

The implementation-report file and its adjacent `.sha256` sidecar are the only
paths added by the final documentation successor commit.

## 11. Failed-code custody and replacement integrity

Failed Candidates `c4112c87...`, `ddc282ee...`, `7938ebeb...`, and
`547e04cf...`, including checkpoints and reports, remained immutable evidence.
No failed commit was cherry-picked, merged, or used as an implementation
baseline. No failed v2 output, classifier, case-matrix source, actual-route test,
PostgreSQL verifier, Migration/Snapshot/Journal body, or report text was copied.

The permitted oracles were limited to Technical Escalation Section 12:

1. independently reconstruct Migration 0022;
2. independently reconstruct L-01 one-frozen-capture design;
3. use the exact v1 golden digest/input semantics;
4. integrate the separately adopted S5-F0 tooling delta.

As a mechanical integrity check, every fresh S5-F1 working blob was compared
against the same-path blob in all four failed Candidate trees; there was no
equality. The only deliberate external blob equality is the three-path adopted
tooling delta documented in Section 8. The clean checkpoint lineage is a single
commit whose sole parent is exact `f058`.

## 12. Prohibited scope confirmation

No analytics conversion-service/Schema/provider, S5-F2 resolver, CRM outcome
UX, template, two-kind Outbox, generalized dispatch, admin, Product/public/SEO/
URL/Redirect/Publish/Index, Asset/Upload/AI, dependency/lockfile/CI, SMTP/
credential, Production/Staging/formal data, Push/Deploy/DNS, or other external
action is included. No new architecture mechanism, ADR, persistent
coordination state, detector registry, queue, or Worker is introduced.

## 13. Rollback

Application rollback is the exact Stage 4 baseline
`f05852dbd3c5cff80421793a4ea345e401d50361`. Because Migration 0022 is additive
and nullable, an application rollback in an isolated Synthetic environment may
leave the six unused columns, composite index, and paired Check in place. There
is no destructive down Migration and no historical Migration rewrite. No formal
Production/Staging data or external system was touched by this implementation.

## 14. Open finding and next gate

The sole open finding is the inherited obsolete Phase D Low broad-harness/
source-map diagnostic described in Section 9; it is historical and is not
suppressed or changed here. No unresolved non-historical gate failure remains.

The next gate must be performed by a different fresh independent Reviewer. It
must include the lightweight Security & Test Simplification Check plus normal
architecture, data, security, privacy, Migration, request-identity, L-01, and
replacement-integrity review of the exact final Candidate. This Implementer
report does not accept the Candidate and grants no S5-F2 authority.
