# CWT Phase 1B Stage 5 S5-F1 Choice A Replacement Remediation Report V1.1

Date: 2026-08-29 (Asia/Shanghai)
Task: Choice A replacement correction attempt 2 for H-01 and M-01
Branch: `refs/heads/codex/phase-1b-stage5-f1-choice-a-replacement-v1`
Immutable failed Candidate: `8cf4fa97f17ce97119b5bfbfff23facbbcce1f7b`
Code/test checkpoint: `b9083afbb0b7b2776263602c3726065070f20a82`
Checkpoint sole parent: `8cf4fa97f17ce97119b5bfbfff23facbbcce1f7b`
Status represented by this document: Implementer correction completion only; not independent acceptance, Owner acceptance, or S5-F2 authority.

## 1. Executive result

Correction attempt 2 makes two bounded production changes:

1. The actual public Inquiry handler no longer assigns
   `submitSourcePagePath` when it records the server-side `inquiry_created`
   conversion event. `routePath` and the Inquiry Domain-sanitized First/Last
   values remain. Browser `quote_submit_success` remains attribution-free.
2. The Inquiry-only v2 required-path boundary rejects every raw consecutive
   slash run before the shared path normalizer can collapse it. Exact v1 replay
   and the shared SEO normalizer are unchanged.

No production analytics module, Provider mapper, Conversion Schema, consent
authority, event identity mechanism, shared SEO path module, Schema, Migration,
Drizzle metadata, dependency, package, lockfile, tooling, or CI file changed.

## 2. Authority and immutable custody

| Evidence | Reproduced identity | Result |
|---|---|---|
| Failed correction-attempt-1 Candidate | `8cf4fa97f17ce97119b5bfbfff23facbbcce1f7b` | exact clean starting point; preserved as ancestor |
| Review-only re-review commit | `74f52f2a9580bd7f0125fc3d9630f3bb4fdaeb67` | sole parent exact `8cf4fa97...`; not merged or cherry-picked |
| Re-review report | `docs/PHASE_1B_STAGE5_F1_CHOICE_A_REPLACEMENT_INDEPENDENT_REREVIEW_V1_0.md` | read in full from Git object |
| Authoritative re-review SHA-256 | `0b5fd25266c10065812a180ada9dfeba6ef6e39607772818ec0630645d169d1c` | exact report content and adjacent sidecar match |
| Re-review outcome | `FAIL` | H-01 High, M-01 Medium, inherited Low unchanged |

The first delegated hash omitted its final `c` and was only 63 hexadecimal
characters. Work stopped before mutation. The Coordinator corrected that Task
Context Package transcription error; the 64-character authority above then
matched both Git content and sidecar. That blocked preflight was not an
implementation attempt.

V1.0 remediation evidence, both independent review-only commits, and all prior
Candidates remain immutable history.

## 3. H-01 closure

### 3.1 Production boundary

The single dedicated assignment
`submitSourcePagePath: attribution.sourcePagePath` was deleted from the
`inquiry_created` call in `src/app/api/inquiries/route.ts`.

The event still receives:

- `routePath` from the Domain-canonical required public path;
- Domain-sanitized landing/referrer and First Touch values;
- Domain-sanitized Last Non-Direct values in the conversion row;
- the existing public reference, attribution confidence, persisted Granted
  consent session, and deterministic event identity.

It receives no Submit Touch field. The unchanged Provider mapper consequently
exports `submitSourcePagePath: null`. It retains its existing sanitized First
Touch fields; Last Non-Direct remains an internal conversion-row field because
the pre-existing Provider contract does not export Last fields. No analytics
production code was changed to expand that contract.

The browser `quote_submit_success` request remains limited to event identity,
event name, route, and safe placement. It sends no First, Last, Submit,
attribution-confidence, or Inquiry anonymous-session field. Server-persisted
Granted consent remains the actual Conversion Domain write authority.

### 3.2 Decisive execution

The actual consent-granted public handler, Inquiry Domain, Conversion Domain,
`conversion_events`, and real `toPublicAnalyticsPayload` mapping were exercised
for four independent omission shapes:

- unsafe First-only;
- unsafe Last-only;
- unsafe Submit-only; and
- combined unsafe First, Last, and Submit.

Each case proves field-local CRM omission, safe sibling persistence, sanitized
First/Last server analytics where allowed, correct `/get-quote/` route, and
literal `null` Provider Submit path. Every Submit value, including safe Submit
siblings, is absent from all Inquiry-success analytics event/provider payloads.
Each omitted raw value and deterministic SHA-256 is absent from CRM, Audit,
Outbox, conversion row, Provider payload, public response, and captured
stdout/stderr. Existing Audit contains only field/reason tuples.

The actual `InquiryForm` plus real tracking, actual Inquiry handler/Domain,
actual Conversion handler/Domain, disposable database, and persisted Granted
consent prove both initial success and uncertain retry:

- one frozen attribution observation;
- byte-identical Inquiry body and Idempotency Key across retry;
- byte-identical Upload Token array (empty in this full composition case);
- exactly one `inquiry_created` and one attribution-free
  `quote_submit_success`;
- sanitized First/Last only on `inquiry_created`;
- `submitSourcePagePath: null` in its row and Provider mapping; and
- no omitted raw value/hash in any governed sink.

The existing production-form attachment retry case independently proves one
Upload Intent, one upload, a non-empty frozen Upload Token array, two
byte-identical Inquiry bodies, and no re-upload. A new actual-handler attachment
case consumes one ready private token, persists one attachment relation, and
on exact replay retains exactly one `image_upload_completed` and one
`inquiry_created` event. Both have correct route and null Submit path. This
reconfirms `image_upload_completed`, private attachment, and event-deduplication
contracts without changing upload production code.

An unrelated real non-Inquiry `quote_cta_click` retains its accepted
attribution and consent behavior.

## 4. M-01 closure

### 4.1 Production boundary

`normalizeRequiredSourcePagePath` now rejects `//` on the NFC-normalized and
trimmed raw v2 value before calling `normalizePath`. This single raw-form check
covers any consecutive slash position or run while preserving canonical `/`.

The following malformed required paths generically fail:

- leading `//products/synthetic-fabric/`;
- internal `/products//synthetic-fabric/`;
- longer internal `/products///synthetic-fabric/`;
- trailing `/products/synthetic-fabric//`; and
- root-only `///`.

Actual Domain and actual public POST tests prove generic failure and zero delta
for Contact, Inquiry, `inquiry_assets`, status history, Outbox, and Audit.
Query, fragment, origin, private, admin, storage, control, encoded-slash,
Unicode slash-lookalike, backslash, unsupported grammar, and Unicode route
non-regressions also fail without mutation.

Legitimate v2 routes remain accepted and canonicalized, including root,
Products collection/detail, Fabric Types, Applications, Fabric Library,
Resources, Fabric Knowledge collection/detail, both China-guide
collection/detail namespaces, Authors, About, Get Quote, and Markets
representatives. Case and missing trailing slash canonicalization remains
available for legitimate v2 input.

The shared `src/seo/path.ts` normalizer is byte-identical to the failed
Candidate. Optional attribution-path semantics are also unchanged; an optional
landing observation containing a repeated slash continues through its existing
field-local canonicalization rather than acquiring the required-core hard
failure.

### 4.2 Exact v1 compatibility

The frozen v1 implementation remains read-only and unchanged. Its golden input
still hashes to
`edc9c0a1ba6afb6cf9fee6cfbf8ed1371498ff44153f41a8467b2a9fcd6d0b85`.
A recorded-version replay with historical query, case, and repeated-slash input
(`/GET-QUOTE//?historical=true`) resolves against the stored canonical
`/get-quote/` identity without backfill, Outbox, Audit, or new-row side effects.
V2 remains the sole writer; null, unsupported, malformed, uppercase, and
unequal stored identities remain fail-closed.

## 5. Preserved Choice A and transactional behavior

Focused and broad gates reconfirm:

- all token grammar/date/digit insertion properties and named campaign cases;
- `D <= 6` retention, `D >= 7` omission, and declared bounded residual risks;
- exact sanitized/null v2 fingerprinting, unsafe-null equality, safe-null and
  different-safe conflicts, attachment identity, and concurrency;
- Contact no-overwrite and record-scoped private attachment behavior;
- required Audit atomic rollback across all six governed tables;
- one-kind Outbox, notification post-commit truthfulness, stable delivery key,
  finite retry/dead handling, and expired-lease recovery;
- L-01 one frozen capture and uncertain retry identity; and
- no source resolver, second event kind, generalized dispatch, S5-F2, Product,
  SEO, Publish, Index, Provider, Production, or external action.

The claim remains bounded structural data minimization. It is not an absolute
PII-detection claim and adds no generalized detector or obfuscation framework.

## 6. Exact changed-path scope

The code/test checkpoint changes exactly seven paths relative to failed
Candidate `8cf4fa97...`:

1. `src/app/api/inquiries/route.ts`
2. `src/crm/inquiry-attribution.ts`
3. `src/app/api/inquiries/route.integration.test.ts`
4. `src/crm/inquiry-attribution.test.ts`
5. `src/crm/inquiry-request-identity.integration.test.ts`
6. `src/public-site/inquiry-success-composition.integration.test.tsx`
7. `scripts/verify-stage5-f1-postgres.ts`

Only the first two are production files. No path under `src/analytics`,
`src/db/schema`, or `drizzle` changed. `src/seo/path.ts`, `package.json`,
`pnpm-lock.yaml`, Playwright tooling, dependencies, and CI are unchanged.
`git diff --check` passed before the checkpoint and before this report.

## 7. Verification record

| Gate | Decisive result |
|---|---|
| Runtime authority | Node `v24.14.0`, Darwin ARM64; pnpm `11.9.0`; guard passed |
| Native diagnosis | Sharp `0.35.3`, Lightning CSS, and Next SWC Darwin ARM64 loaded |
| Browser-scoped readiness | Playwright `1.62.1`, Chrome for Testing `151.0.7922.34`; no ensure/download/network |
| ESLint | pass with zero warnings |
| Strict TypeScript | pass |
| Drizzle generate/no-delta | `No schema changes, nothing to migrate`; pre/post status SHA-256 identical |
| Full-composition stability | 1 file / 3 tests passed on each of five consecutive runs after deterministic Synthetic reference fixture |
| Focused/adversarial final suite | 11 files / 153 tests passed |
| Corrected NUL-safe source-bound manifest | exit 0; 131 files / 984 tests passed; 11 files / 85 tests skipped |
| Isolated migrated/core-seeded Build | Migration, core seed, optimized Build, strict TS, and 43 static pages passed; temporary DB directory absent |
| Public bundle boundary | pass; 376 eligible server runtime files, 20 public page manifests, 15 distinct public chunks |
| Scope and whitespace | protected paths unchanged; `git diff --check` pass |

The final unmodified `pnpm test:run` reported 131 files / 984 tests passed and
11 files / 85 tests skipped. It then exited 1 only from the inherited obsolete
Phase D diagnostic rejecting a generated `.next/node_modules/@aws-sdk/...`
root and Vitest's resulting source-map JSON parse unhandled error. No H-01,
M-01, or new test failed. The corrected source-bound manifest excludes exactly
`src/ai/phase-f-m6-one-case-diagnostic.integration.test.ts` and passes. The
historical Low is reported, not suppressed.

An earlier broad run exposed nondeterminism in actual-handler evidence: a
random but valid public reference could occasionally match the unchanged
analytics guard's conservative digit pattern, causing the post-commit event to
be rejected. Tests now use Node's standard `syncBuiltinESMExports()` to install
and restore a deterministic letter-only Synthetic `randomBytes` fixture before
dynamically importing the real Domain. Production reference generation,
analytics validation, event behavior, and assertions are unchanged. Five
standalone composition passes, the final focused pass, final raw broad result,
and corrected manifest establish stability.

## 8. Real PostgreSQL 18.4 evidence

The final verifier used absolute Docker executable
`/Users/calvin/.docker/bin/docker`, active context `desktop-linux`, client and
server `29.6.2`, Linux ARM64 server, and already-local
`postgres:18.4-alpine` image ID
`sha256:9a8afca54e7861fd90fab5fdf4c42477a6b1cb7d293595148e674e0a3181de15`.

It used `--pull=never`, a unique exact container name, random loopback-only
port, and conspicuously Synthetic credentials/database names. It passed:

- Fresh `0000 -> 0022`, repeat/no-op, constraints, and index plan;
- Upgrade `0021 -> 0022` with representative legacy Inquiry, Outbox, Audit,
  route, analytics consent/event, and AI rows preserved;
- equal/different concurrency;
- v2 unsafe-null equality and exact v1 historical query/case/slash replay;
- raw v2 query, fragment, and all repeated-slash positions/runs with zero
  six-table mutation; and
- injected required-Audit rollback.

The exact final container and its disposable databases were absent after
cleanup, and local image identity remained exact. No install, pull, registry,
remote database, external endpoint, formal data, or Production credential was
used.

## 9. Rollback and next gate

The correction lineage is the code/test checkpoint followed only by this V1.1
report and adjacent sidecar. To remove correction attempt 2 while preserving
all failed evidence, move the branch back to immutable Candidate
`8cf4fa97f17ce97119b5bfbfff23facbbcce1f7b`. That rollback point remains a
reviewed FAIL and is not acceptance. The broader replacement rollback remains
exact accepted Stage 4 baseline
`f05852dbd3c5cff80421793a4ea345e401d50361`.

The next gate is a different fresh independent re-review of the exact final
Candidate, including lightweight Security & Test Simplification and normal
architecture, data, security, privacy, Migration, replacement-integrity, and
scope review. Implementer completion is not acceptance. If the same H-01 or
M-01 causal root remains independently open after correction attempt 3,
ordinary remediation must stop for escalation assessment.
