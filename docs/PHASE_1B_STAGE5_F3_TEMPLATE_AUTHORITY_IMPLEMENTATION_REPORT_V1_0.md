# CWT Phase 1B Stage 5 — S5-F3 Template Authority Implementation Report V1.0

| Field | Value |
|---|---|
| Date | 2026-08-29 (Asia/Shanghai) |
| Task | S5-F3 Template Authority |
| Implementation branch | `refs/heads/codex/phase-1b-stage5-f3-template-authority-v1` |
| Exact starting / rollback baseline | `99108322f3688726f22c3ebc8cf63fa98b71dda8`; tree `7343ad7832170f8eb0598654c478ab58ab852d75` |
| Code/test checkpoint | `66c6a8996ef1351fd1145d96a64e066bcbe770f6` |
| Code/test checkpoint tree | `0b6f3f6a43be9ca02cdb4b31625324e36cc744e3` |
| Checkpoint sole parent | `99108322f3688726f22c3ebc8cf63fa98b71dda8` |
| Owner authorization | `OD-S5-F3-001`; SHA-256 `299ca2a93b0ac1933173aef1842110825bb3afc0a6c2bb5917cb43529de5a09e` |

Status represented by this document: bounded Implementer completion Candidate
only. It is not independent review, Owner acceptance, Merge, Push, Deploy,
Provider, Publish, Index, S5-F4, or S5-F5 authority.

The final report-bearing Candidate identity, tree, parent, branch, and clean
state are sent in the Implementer callback after this report and sidecar are
committed. A Git commit cannot contain its own final identity without changing
that identity. The immutable code/test checkpoint above and exact rollback
baseline are the in-document reproducible anchors.

## 1. Executive result

S5-F3 is implemented within the authorized Template Domain boundary. The
Candidate adds strict plain-text `email_template_revision_v1` and
`email_template_active_v1` contracts, canonical source SHA-256, exact
kind-specific variable validation, deterministic rendering, exact code-owned
fallbacks, governed Draft/review/Apply/history/rollback, a complete immutable
resolver, fixed-Synthetic Preview, and Admin-only capture-transport test send.

The implementation reuses the existing `system_settings`,
`editorial_revisions`, editorial permissions, and `runGovernedMutation`
authority. It adds no table, column, enum, index, constraint, Migration,
Snapshot, Journal entry, role, permission, queue, Worker, Lease, retry state,
cache, dependency, lockfile, CI mechanism, Provider client, or browser surface.

Exactly two non-sensitive Template Setting keys are code-authorized:

- `email_template.inquiry_notification`;
- `email_template.inquiry_customer_confirmation`.

`system_settings.value` is the sole live Active pointer. Applied Revision rows
remain immutable history and are consulted only to validate the exact
provenance named by the live Setting. No “latest Applied” query or second Active
selection exists.

## 2. Authority and starting-state reproduction

| Authority | Required identity | Reproduced result |
|---|---|---|
| Accepted S5-F2B baseline | `99108322f3688726f22c3ebc8cf63fa98b71dda8`; tree `7343ad7832170f8eb0598654c478ab58ab852d75` | exact clean detached HEAD before branch creation |
| Accepted branch | `refs/heads/codex/phase-1b-stage5-f2b-crm-read-outcome-v1` | resolved to exact baseline |
| F3 Owner authorization | supplied file plus adjacent sidecar | sidecar `shasum -a 256 -c` PASS; body SHA matched `299ca2a...` |
| F2B Owner acceptance | supplied file | SHA matched `173653ac5dfc9b18ff084fb45d9cc84ec728f886f95543b9a24b0585e494cdb1` |
| Accepted Stage 5 plan | Candidate `59d5d039c8724560dec6e7ee80b72307d8a3acad` | plan bytes directly hashed to `91bb6d37e097dcc996256564550280118e5d9eafa48793440a5ed3ed67980510` |
| Runtime | Node `v24.14.0`, Darwin ARM64 | exact runtime guard PASS |

Root `AGENTS.md`, `docs/ENGINEERING_GOVERNANCE.md`,
`docs/REVIEW_POLICY.md`, `docs/EMAIL_TEMPLATE_CONTRACT.md`, the accepted fresh
Stage 5 plan, and Owner authorization were read before mutation. The later
fresh-plan strict plain-text choice was applied; older markup-subset language
was not implemented.

## 3. Corrected responsibility and authority boundary

### 3.1 Strict contracts and canonical source

`src/email-templates/contracts.ts` owns:

- the closed two-kind/two-key mapping;
- the exact customer and internal variable allowlists from
  `EMAIL_TEMPLATE_CONTRACT.md`;
- strict Revision and Active schemas with unknown-field rejection;
- canonical JSON source serialization and lowercase SHA-256;
- subject/header and unsafe-control validation;
- rejection of nested traversal, expressions, functions, loops, includes,
  markup, HTML, CSS, script schemes, Markdown markup, and remote content; and
- code construction/parsing paths that recompute and compare canonical hashes.

The canonical hash covers the complete kind, contract version, subject source,
and text-body source. It intentionally excludes editorial metadata such as
Draft concurrency version and rollback source Revision ID.

### 3.2 Deterministic renderer and privacy

`src/email-templates/renderer.ts` performs one non-evaluating token replacement
pass. It never executes code, traverses properties, fetches content, reads an
environment secret, or loads a database record. Optional internal fields use
deterministic complete-line omission. Subject values fail closed on CR/LF or
control injection. Body values fail closed on CR and unsafe controls.

Customer confirmation has access only to:

`customer_name`, `inquiry_reference`, `submitted_at`, `company_name`, and
`reply_to_email`.

It has no variable for customer email, WhatsApp, description, attachments,
attribution, internal IDs/status, Admin URLs, Contact, Organization, or private
identity.

Internal notification has only the approved immutable snapshot/attribution
variables, attachment count, safe source label, and `operations_url`. The URL
builder accepts a bare trusted application origin plus a server-held record ID
and emits only the authenticated Admin Inquiry route. No raw UUID variable,
private Asset identity, Object Key, signed/permanent storage URL, or
browser-provided operations URL exists.

### 3.3 Exact fallback and immutable resolver

`src/email-templates/fallbacks.ts` contains the exact approved English customer
and internal fallback source. It adds no quote, availability, lead-time, MOQ,
certification, facility, Product, capacity, ownership, or supply claim.

`resolveActiveEmailTemplate` returns a frozen complete template snapshot and
frozen provenance:

- absent Setting → complete exact code fallback with `active_absent`;
- valid exact code fallback projection → complete code fallback;
- valid revision-backed Active projection plus matching historical provenance
  → complete custom snapshot; or
- malformed, incompatible, sensitive, hash-drifted, kind-mismatched, missing,
  or history-mismatched Active → complete exact code fallback with
  `active_invalid` and only a sanitized key/kind/error-code signal.

There is no field-level fallback merge. Valid custom content is never completed
from fallback copy, and invalid custom content is never partially rendered.
Failure of the non-critical sanitized signal cannot convert fallback into an
Inquiry outage.

## 4. Lifecycle, concurrency, and Audit

`src/email-templates/service.ts` reuses the accepted static-page pattern while
keeping Template-specific schemas and invariants inside one Domain Service.

- Draft creation locks the exact Setting authority and assigns the next
  monotonic Revision number.
- Draft editing uses an exact Revision ID plus monotonic `draftVersion` and
  rejects stale editors.
- Submit re-locks Setting and Revision, reparses the strict snapshot, checks no
  later Revision exists, then moves Draft to `in_review` with required Audit.
- Apply locks Setting and Revision, rejects stale/non-review history, writes the
  complete Active projection, changes the Revision to historical `applied`, and
  writes required Audit in one transaction.
- Repeat Apply is idempotent only when the same Revision is still named by the
  sole live Setting. A historical Applied row cannot reactivate itself.
- Rollback accepts a compatible historical Applied snapshot, copies it into a
  new later Revision with `rollbackSourceRevisionId`, atomically applies that new
  Revision, and never edits or reorders prior rows.
- Required Audit failure rolls back every related Setting/Revision mutation.
  A compatible rollback can also repair an invalid Active projection.

Real PostgreSQL 18.4 evidence proved simultaneous first-Draft creation produces
one current Draft and one conflict, Revision numbers are `1,2,3,4`, failed Apply
Audit keeps the live Setting at V2 and V3 `in_review`, and rollback copies
historical V1 into new Applied V4.

Audit summaries contain kind, Revision/version, safe canonical hash, actor via
the Audit relation, and transition metadata. They contain no subject, body,
recipient list, customer input, private identity, credential, or file metadata.

## 5. Permissions and data isolation

The implementation adds `email_template` only as an editorial resource mapping
and reuses existing permissions. It adds no role or permission.

| Action | Admin | Content Editor | Reviewer/Publisher | Product Editor | Sales | Analyst/public |
|---|---:|---:|---:|---:|---:|---:|
| List/history | allow | allow | allow | deny | deny | deny |
| Fixed-Synthetic Preview | allow | allow | allow | deny | deny | deny |
| Create/edit Draft | allow | allow | deny | deny | deny | deny |
| Submit for review | allow | allow | deny | deny | deny | deny |
| Review/Apply | allow | deny | allow | deny | deny | deny |
| Rollback | allow | deny | allow | deny | deny | deny |
| Capture-only test send | allow | deny | deny | deny | deny | deny |

Content Editor and Reviewer/Publisher retain no `inquiries.read` permission.
Sales retains its existing record-scoped Inquiry permission but has no Template
resource permission. No Template API accepts or loads Inquiry, Contact,
Organization, CRM, private-file, or customer-record data. Preview and test send
use only `SYNTHETIC_EMAIL_TEMPLATE_V1`; no real-record selector or browser UX was
added.

## 6. Capture-only test-send truth

`src/email-templates/test-send.ts` defines one synchronous `capture_only`
transport boundary. It cannot accept an SMTP/Provider transport kind.

The Admin-only operation:

1. renders the selected compatible Draft/history/Active/fallback with the exact
   production renderer and fixed Synthetic context;
2. commits a required sanitized attempt Audit;
3. builds a trusted envelope with fixed From/Reply-To, exactly
   `test@cwtextile.com`, empty CC/BCC, and exactly one leading `[TEST]` prefix;
4. invokes capture exactly once with no retry; and
5. writes a separate event-only success/failure/uncertain Audit.

If attempt Audit fails, capture is not called. A returned failure stays failure.
A thrown transport exception becomes honest `uncertain` without its message in
Audit. If outcome Audit fails, the function returns the actual transport result
with `outcomeAuditRecorded = false`; it does not reverse success, claim failure,
or retry.

No SMTP client, Zoho credential, Provider call, socket, external address,
persistent job, queue, retry counter, or network fetch was introduced.

## 7. Verification record

All fixtures and databases were conspicuously Synthetic.

| Gate | Decisive result |
|---|---|
| Runtime guard | PASS; Node `v24.14.0`, Darwin ARM64 |
| Focused Template/static-page/Outbox/public-bundle regression | PASS; 9 files / 167 tests before the final complete source manifest |
| Corrected NUL-safe source-bound manifest | PASS; 149 source arguments; 138 files / 1022 tests passed; 11 files / 85 tests skipped |
| Zero-warning lint | `pnpm lint` PASS |
| Strict TypeScript | `pnpm typecheck` PASS |
| Drizzle no-delta | 60 tables; `No schema changes, nothing to migrate`; protected pre/post hash `364de1c6e29ea4fe98fc27bdb5a691fb8eb50edb85752f793dc5ef3c831a3cb7` |
| Real PostgreSQL 18.4 | PASS; Fresh/Upgrade/repeat inherited gates plus real Template Draft contention, monotonic versions, sole pointer, Audit rollback, rollback-as-copy, Synthetic Preview, capture-only test send, and cleanup |
| Isolated migrated/core-seeded Build | PASS; migration, core seed, optimized compile, strict TypeScript, and 43 generated static pages |
| Public bundle | PASS; 380 eligible server runtime files, 20 public page manifests, 7 root chunks, 8 manifest chunks, 15 distinct chunks; Template markers absent |
| Diff/whitespace/protected scope | PASS; no Schema/Migration/Journal/Snapshot, Inquiry/CRM/Contact/Asset/Upload/Analytics/Provider/Outbox/Route/SEO/Product/Content/Publish/Index, dependency, lockfile, package-script, CI, browser-tool, or Admin UI change |
| Browser | NOT RUN by design; Owner authorization explicitly excludes browser gate/download/ensure-browser for this Domain-core slice |

The exact unmodified `pnpm test:run` command reported 138 passed files, 11
skipped files, 1022 passed tests, and 85 skipped tests. It exited 1 only because
the inherited obsolete Phase D generated-root diagnostic encountered
`.next/node_modules/@aws-sdk/client-s3-64df096a7e71b28d`, followed by the known
source-map JSON diagnostic. No ordinary test failed. The result was not hidden,
suppressed, weakened, or reclassified.

The corrected manifest used NUL-delimited tracked paths and excluded only
`src/ai/phase-f-m6-one-case-diagnostic.integration.test.ts`. It passed all 149
selected source test files/arguments. No `--` was inserted before positional
paths, so it did not accidentally invoke full discovery.

Real PostgreSQL used only `/Users/calvin/.docker/bin/docker`, the already-local
ARM64 `postgres:18.4-alpine` image
`sha256:9a8afca54e7861fd90fab5fdf4c42477a6b1cb7d293595148e674e0a3181de15`,
`--pull=never`, a random loopback-only port, Synthetic credentials/data, and the
existing guarded Stage 5 verifier. The exact container and every prefixed
database were deleted after PASS.

The final isolated PGlite database/storage directory and the stale generated
Build directory were moved to macOS Trash for recoverable cleanup. The fresh
`.next` output remains ignored build evidence only and is not part of Candidate.

## 8. Exact bounded changed-path scope

The code/test checkpoint changes exactly 13 paths relative to rollback:

1. `src/email-templates/contracts.ts` — strict schemas, variables, canonical hash,
   validation;
2. `src/email-templates/fallbacks.ts` — exact code-owned fallback sources;
3. `src/email-templates/renderer.ts` — deterministic plain-text renderer and
   trusted context builders;
4. `src/email-templates/service.ts` — resolver, Draft/review/Apply/history/
   rollback, and Synthetic Preview Domain authority;
5. `src/email-templates/test-send.ts` — Admin-only capture transport core and
   attempt/outcome Audit truth;
6. `src/email-templates/contracts.test.ts` — schema/hash/variable/injection/
   fallback/render matrix;
7. `src/email-templates/service.integration.test.ts` — permission, resolver,
   lifecycle, concurrency, sole pointer, and Audit rollback evidence;
8. `src/email-templates/test-send.integration.test.ts` — success/failure/
   uncertain/attempt-Audit/outcome-Audit/zero-retry evidence;
9. `src/email-templates/scope-boundary.test.ts` — S5-F3 dependency and
   no-second-mechanism gate;
10. `src/admin/preview-policy.ts` — existing editorial resource mapping only;
11. `scripts/verify-stage5-f1-postgres.ts` — proportional extension of the
    accepted guarded real-PostgreSQL verifier;
12. `scripts/check-public-bundle.mjs` — Template Domain public leak markers; and
13. `src/public-site/public-bundle-check.test.ts` — positive leak controls.

This report and adjacent sidecar are the only report-bearing commit additions.
No coordinator handoff/authorization file was copied or modified.

## 9. Security & Test Simplification and complexity report

- Existing Settings, Revision, Audit, permission, PostgreSQL verifier, Build,
  and public-bundle authorities were reused; none was duplicated.
- `system_settings` is the sole live Active pointer. No template table, “current
  Revision” query, cache, materialized projection, or dual writer was added.
- One exact plain-text renderer serves Active, fallback, Preview, and test send.
  There is no preview renderer, test renderer, HTML sanitizer, or Provider
  renderer path.
- One fixed Synthetic context replaces the privacy/authorization complexity of
  a real-Inquiry selector in S5-F3.
- One synchronous capture interface replaces any need for a persistent
  test-send job, retry lifecycle, worker, lease, or Provider fake.
- Outcome Audit is explicitly event-only. It does not wrap or compensate an
  already-observed capture result.
- The implementation adds no durable state or cross-process coordination. Code
  volume increases to supply a new authorized Domain capability and adversarial
  tests; persistent and operational complexity remains level.
- No old/new dual path exists because Template authority did not previously
  exist. Existing ordinary Inquiry notification/Outbox code is byte-unchanged.

## 10. Open findings, external validation, and rollback

One inherited Low remains: the obsolete Phase D generated-root/source-map
diagnostic described in section 7. It predates S5-F3 and was neither hidden nor
changed. It is the only broad-command non-PASS item.

No S5-F3 Blocker, High, or qualifying Medium is known at Implementer handoff.
Independent review remains mandatory and may identify findings; this statement
is not self-review or acceptance.

Real SMTP/Zoho authentication, sender/Reply-To headers, Staging envelope,
Provider rejection/timeout semantics, Message-ID/deduplication, and real
delivery remain Stage 7 External Validation and were not invoked or claimed.
S5-F4 Outbox convergence and S5-F5 complete Admin UX remain explicitly
unimplemented and unauthorized.

Rollback is the exact accepted S5-F2B Candidate
`99108322f3688726f22c3ebc8cf63fa98b71dda8`. No Migration, backfill, durable
external state, or Provider action must be reversed. Reverting the bounded
implementation/report commits removes the Template Domain and proportional
gates while preserving accepted S5-F2B bytes.

## 11. Terminal gate

The Implementer stops at the clean report-bearing Candidate. The required next
gate is a different fresh Independent Reviewer covering Template architecture,
sole Settings/Revision authority, permissions, renderer/injection/privacy,
fallback, concurrency/Audit, capture-only test-send truth, PostgreSQL evidence,
scope, and Security & Test Simplification.

No S5-F4, S5-F5, Merge, Push, Deploy, SMTP/Provider, Production/Staging access,
DNS, formal data, Publish, Index, or external authority is implied.
