# CWT Phase 1B Stage 5 S5-F1 Choice A Replacement Remediation Report V1.0

Date: 2026-08-29 (Asia/Shanghai)
Task: Choice A replacement correction attempt 1 for H-01 and M-01 only
Branch: `refs/heads/codex/phase-1b-stage5-f1-choice-a-replacement-v1`
Immutable failed review Candidate: `0ae5cd5bbd3efff3c26c7996d3300b7d9322da57`
Code/test checkpoint: `901c7715ba7e62222298bb1d7837d6585a85d0b0`
Checkpoint sole parent: `0ae5cd5bbd3efff3c26c7996d3300b7d9322da57`
Status represented by this document: Implementer correction completion only; not independent acceptance, Owner acceptance, or authority for S5-F2.

## 1. Executive result

This bounded correction closes the two findings from the independent review:

- **H-01 (High):** `quote_submit_success` no longer sends First Touch or Last
  Non-Direct attribution in its browser request. It also sends no Submit Touch
  attribution and no anonymous Inquiry session identity. The existing
  server-side `inquiry_created` event remains the sole attribution-bearing
  Inquiry-success path and receives only Inquiry Domain-sanitized attribution.
- **M-01 (Medium):** a raw required v2 `sourcePagePath` containing `?` or `#`
  now fails at the Inquiry attribution required-path boundary before path
  normalization can strip those delimiters. The actual public API returns its
  existing generic `400` and commits no Contact, Inquiry, attachment relation,
  status history, Outbox, or Audit mutation.

No production analytics Domain, Schema, provider mapper, consent mechanism, or
event identity mechanism changed. The correction does not redesign general
analytics and does not copy the Choice A sanitizer into browser tracking or the
analytics Domain.

## 2. Review authority and immutable custody

| Evidence | Reproduced identity | Result |
|---|---|---|
| Failed replacement Candidate | `0ae5cd5bbd3efff3c26c7996d3300b7d9322da57` | exact branch starting point; preserved as ancestor |
| Failed Candidate parent | `2c33b21f5f8fdf5d421b27497e20c2c98f0a8063` | exact |
| Detached independent review commit | `a89c0977dd0c052381b49c74a00fdb9882a733ec` | sole parent exact `0ae5cd5...`; not merged or edited |
| Independent review report | `docs/PHASE_1B_STAGE5_F1_CHOICE_A_REPLACEMENT_INDEPENDENT_REVIEW_V1_0.md` | read in full from review-only commit |
| Independent review report SHA-256 | `8d757301f62b4126eeec2487e6dd136afced7510bf922677bb9e8385c87d72d1` | exact |
| Review outcome | `FAIL` | H-01 High, M-01 Medium; inherited obsolete Phase D Low |

The failed Candidate and detached review evidence remain immutable Git history.
This correction was authored as a clean successor of the failed Candidate; no
review-only commit was cherry-picked or merged.

## 3. H-01 closure: simplified Inquiry success composition

### 3.1 Production behavior

The existing public tracking composition now treats only
`quote_submit_success` as attribution-free. Its browser body is limited to:

- the existing generated event identity;
- `eventName`;
- the normalized public route;
- the existing safe placement property; and
- an entity only when a caller supplies one (the Inquiry form does not).

It does not include landing page, referrer, First Touch UTM, Last Non-Direct
UTM, Submit Touch, attribution confidence, or the Inquiry anonymous session ID.
The already captured attribution object is still reused to evaluate the
accepted client consent state; the success path does not recapture it.

Every other public event name retains the pre-correction attribution body and
the existing event identity/deduplication behavior. Server-persisted Granted
consent remains authoritative in the actual Conversion Domain. Its existing
consent-session binding may populate the conversion row's consent session
identity; that value is distinct from, and was proven unequal to, the Inquiry
anonymous session ID omitted from the browser request.

The `inquiry_created` event remains server-side and receives only the Inquiry
Domain's sanitized `analyticsAttribution`. No Submit Touch or source-entity
value enters that event.

### 3.2 Decisive actual-composition evidence

A fresh integration test composes the actual `InquiryForm`, real public
tracking, actual `/api/inquiries/` handler, actual Inquiry Domain, actual
`/api/conversion-events/` handler, and actual Conversion Domain against a
disposable database with server-persisted Granted consent.

It supplies three independently unsafe raw observations:

| Observation | Synthetic raw value | Domain outcome |
|---|---|---|
| First Touch source | `campaign-1234567` | `null`; safe First siblings persist |
| Last Non-Direct source | `call-13800138000` | `null`; safe Last siblings persist |
| Submit Touch campaign | `phone:138:0013:8000` | `null`; safe Submit sibling persists |

For both initial success and an uncertain retry after the first request has
committed, the evidence proves:

- the Inquiry succeeds through the ordinary public API path;
- the retry reuses a byte-identical Inquiry body and Idempotency Key;
- exactly one `inquiry_created` and one `quote_submit_success` persist;
- the actual browser `quote_submit_success` request has no First, Last, Submit,
  attribution-confidence, or Inquiry-session field;
- the stored quote event and Provider-facing `toPublicAnalyticsPayload` mapping
  contain no attribution values from the Inquiry attempt;
- server `inquiry_created` retains only safe sanitized First/Last siblings;
- each unsafe raw value and its deterministic SHA-256 are absent from the
  Inquiry, required Audit, Outbox, conversion rows, Provider payloads, public
  API responses, browser quote body, and captured stdout/stderr; and
- the Inquiry anonymous session ID is absent from the browser quote body,
  stored quote event representation, and Provider payload.

The same actual Conversion API/Domain composition verifies that an unrelated
non-Inquiry `quote_cta_click` retains its accepted safe attribution behavior.
No production path under `src/analytics` changed.

## 4. M-01 closure: raw required v2 path boundary

The v2 required-path function now rejects control characters, query delimiter
`?`, fragment delimiter `#`, and origin marker `://` on the NFC/trimmed raw
value before the generic public-path normalizer runs. It then applies the
existing normalized public-route allowlist and private/storage/admin/origin
rejections. The error remains generic.

Actual public-handler tests prove generic `400` plus identical before/after
counts for all six required transactional tables for raw query and fragment
inputs. The real PostgreSQL verifier independently repeats those cases and
proves zero six-table delta.

Representative legitimate frozen and future-compatible public namespaces are
accepted, including:

- `/`, `/products/`, and `/products/<slug>/`;
- `/fabric-types/<slug>/`, `/applications/activewear/`, and `/fabric-library/`;
- `/resources/`, `/fabric-knowledge/`, and `/fabric-knowledge/<slug>/`;
- `/china-sourcing-guide/`, `/china-sourcing-guide/<slug>/`,
  `/china-textile-guide/`, and `/china-textile-guide/<slug>/`;
- `/authors/<slug>/`, `/about/`, `/get-quote/`; and
- future `/markets/` and `/markets/<slug>/` representatives.

Origin, private, admin, storage, query, and fragment inputs remain rejected.
The exact recorded-v1 reader is unchanged: it continues to use the frozen v1
normalizer and replays a historical query-bearing input against its stored
normalized path/fingerprint. New writes remain v2-only; unknown or malformed
stored versions remain fail-closed.

## 5. Preserved Choice A and transaction guarantees

The correction does not alter the Choice A classifier, omission reason codes,
fingerprint implementations, Schema, or Migration. Existing focused and
adversarial suites reconfirm:

- independent field-local omission with safe sibling persistence;
- one Inquiry Domain sanitizer/persistence authority;
- exact v1 golden reader and recorded-version dispatch;
- v2-only new-row writer and fingerprinting over exact sanitized/null values;
- unsafe-null equality, safe-null conflict, different-safe conflict, attachment
  identity, equal/different retry, and concurrency semantics;
- Contact no-overwrite and private attachment identity;
- Outbox/Audit atomicity and zero unintended mutation on hard failures or
  injected required-Audit failure; and
- L-01 one frozen capture, byte-identical uncertain retry, and one success event.

The privacy claim remains bounded structural data minimization. It does not
claim absolute PII detection and does not add a generalized detector,
obfuscation framework, persistent state, queue, event, or Worker.

## 6. Exact changed-path scope

The code/test checkpoint changes exactly eight paths relative to the failed
Candidate:

1. `src/public-site/tracking.tsx`
2. `src/crm/inquiry-attribution.ts`
3. `src/public-site/inquiry-success-composition.integration.test.tsx`
4. `src/public-site/inquiry-form.test.tsx`
5. `src/app/api/inquiries/route.integration.test.ts`
6. `src/crm/inquiry-attribution.test.ts`
7. `src/crm/inquiry-service.integration.test.ts`
8. `scripts/verify-stage5-f1-postgres.ts`

Only the first two are production mutations. There is no diff under
`src/analytics`, `src/db/schema`, or `drizzle`; nor in `package.json`,
`pnpm-lock.yaml`, Playwright tooling, dependencies, CI, provider configuration,
S5-F2+, Product, SEO, Publish, or Index code. `git diff --check` passes.

## 7. Verification record

| Gate | Decisive result |
|---|---|
| Runtime authority | Node `v24.14.0`, Darwin ARM64; pnpm `11.9.0`; guard passed |
| Local browser readiness | Playwright `1.62.1`, Chrome for Testing `151.0.7922.34`; run only after runtime guard; no ensure/download/network |
| ESLint | pass with zero warnings |
| strict TypeScript | pass |
| Drizzle check/no-delta | `No schema changes, nothing to migrate`; pre/post worktree-status SHA-256 identical |
| H-01 repeated actual composition | 1 file, 3 tests passed on each of three consecutive runs |
| Focused/adversarial final suite | 11 files, 137 tests passed |
| Corrected NUL-safe source-bound manifest | exit 0; 131 files / 968 tests passed; 11 files / 85 tests skipped |
| Isolated migrated/core-seeded Build | Migration pass, core seed pass, Next production Build pass (43 static pages generated), isolated PGlite directory absent after cleanup |
| Public bundle boundary | pass; 376 eligible server runtime JavaScript files, 20 public page manifests, 15 distinct public chunks |
| Protected scope | no analytics production, Schema/Migration/metadata, dependency, lockfile, CI, or prohibited-module diff |

The full unmodified `pnpm test:run` was also run after the correction. It
reported 131 files / 968 tests passed and 11 files / 85 tests skipped, then
exited 1 solely because the inherited obsolete Phase D diagnostic rejects a
generated `.next/node_modules/@aws-sdk/...` root and Vitest subsequently emits
the already recorded source-map JSON parse unhandled error. No H-01/M-01 test
failed. This historical Low is reported, not suppressed; the corrected
source-bound NUL-safe manifest above excludes exactly
`src/ai/phase-f-m6-one-case-diagnostic.integration.test.ts` and passes.

During verification, the new uncertain-retry composition initially exposed
that Vitest's default five-second test limit and then a ten-second asynchronous
poll were too short under broad parallel integration load. The test-only
timeout was made explicit and bounded (30-second fire-and-forget persistence
window, 60-second case limit); assertions were not weakened. Three repeated
standalone passes, the final 137-test focused pass, and the complete NUL-safe
manifest establish the stable result.

## 8. Real PostgreSQL 18.4 evidence

The authorized local runtime was reproduced with absolute Docker binary
`/Users/calvin/.docker/bin/docker`, active context `desktop-linux`, client and
server `29.6.2`, Linux ARM64 server, and already-local
`postgres:18.4-alpine` image ID
`sha256:9a8afca54e7861fd90fab5fdf4c42477a6b1cb7d293595148e674e0a3181de15`.

The verifier used `--pull=never`, a unique exact container name, a random
loopback-only port, and conspicuously Synthetic credentials/database names. It
passed:

- Fresh `0000 -> 0022` and Upgrade `0021 -> 0022`;
- repeat/no-op, constraints, legacy rows, and forced index plan;
- equal/different concurrency;
- exact v1 query-bearing replay and v2 replay;
- v2 raw query/fragment generic rejection with zero six-table mutation; and
- injected required-Audit rollback.

No install, pull, registry, external endpoint, remote database, formal data, or
Production credential was used. The exact task container was absent after
bounded cleanup; final inspection reproduced only the accepted local image ID.

## 9. Rollback and next gate

The correction is a two-commit lineage: code/test checkpoint, followed only by
this report and its adjacent SHA-256 sidecar. To remove correction attempt 1
while preserving failed-review evidence, move the branch back to immutable
Candidate `0ae5cd5bbd3efff3c26c7996d3300b7d9322da57`. That state remains a reviewed
FAIL and is not deployable acceptance. The broader Stage 5 replacement rollback
authority remains exact accepted Stage 4 baseline
`f05852dbd3c5cff80421793a4ea345e401d50361`.

No external action, Push, Deploy, Provider, Publish, Index, or S5-F2 work was
performed. The next gate is a different fresh independent Reviewer applying
normal architecture, data, security, privacy, Migration, replacement-integrity,
and lightweight Security & Test Simplification checks to the exact final
Candidate. Implementer completion is not acceptance.
