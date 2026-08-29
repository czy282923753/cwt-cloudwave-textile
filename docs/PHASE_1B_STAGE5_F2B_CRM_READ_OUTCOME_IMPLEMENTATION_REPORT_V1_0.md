# CWT Phase 1B Stage 5 — S5-F2B CRM Read & Outcome Implementation Report V1.0

| Field | Value |
|---|---|
| Date | 2026-08-29 (Asia/Shanghai) |
| Task | S5-F2B CRM Read Projection & Outcome Closure |
| Implementation branch | `refs/heads/codex/phase-1b-stage5-f2b-crm-read-outcome-v1` |
| Exact starting / rollback baseline | `ef42dfd85b17466a0d1b99a987e6ab31758e8d9b` |
| Code/test checkpoint | `f49c6f6b3c54c56bc78ee40f8842712fd2eb7428` |
| PostgreSQL evidence checkpoint | `56b6ef9e52fd26e1def9746d6b86d192f7c28727` |
| Evidence checkpoint sole parent | `f49c6f6b3c54c56bc78ee40f8842712fd2eb7428` |

Status represented by this document: bounded Implementer completion Candidate
only; not independent acceptance and not authority for S5-F3+, Merge, Push,
Deploy, Publish, Index, Provider, or any external action.

The final report-bearing Candidate identity, tree, parent, branch, and clean
state are recorded by the Implementer callback after the commit is created. A
Git commit cannot contain its own final identity without changing that
identity. The immutable checkpoints and rollback identity above are therefore
the in-document reproducible anchors.

## 1. Executive result

S5-F2B is implemented within the authorized boundary. The existing Inquiry
CRM detail and list surfaces now consume one server-owned CRM read projection.
It exposes the accepted immutable First Touch, Last Non-Direct, Submit Touch,
Submit source path, and source-entity evidence only after the existing
record-scoped authorization boundary has passed.

Admin may read every Inquiry. Sales may read only an Inquiry assigned to that
Sales user. Unassigned Sales and roles without `inquiries.read` receive no
customer record. The projection never returns Contact identity or the stored
source entity UUID.

The stored source pair remains historical evidence. A current human-readable
label and safe public link are resolved at read time through the existing
Route and public eligibility authorities. Missing, stale, non-English,
unsupported, private-path, or currently ineligible targets produce no link and
never rewrite the Inquiry snapshot.

The accepted CRM outcome contract is now rendered and exhaustively tested:
the existing ten-state transition table, qualification, Lost Reason, Spam
reporting exclusion, ownership scope, activity directions, and First Response
calculation are preserved without adding a lifecycle state or mutation path.

## 2. Authority and starting-state reproduction

| Authority | Required identity | Reproduced result |
|---|---|---|
| Accepted S5-F2A Candidate | `ef42dfd85b17466a0d1b99a987e6ab31758e8d9b` | exact clean HEAD before branch creation; tree `3cc93123e94f7079850d16cf743189f30c299a3b` |
| Independent F2A review | report SHA-256 `5893f833b51f2e9170fda35564b29620e0448f89a8876e659d30fdaa44be1916` | accepted as evidence only; review-only commit `51e33ef3943754b7aee5fd71ef9a035547a7336c` is not in branch ancestry |
| Owner F2A acceptance / F2B authorization | external handoff V1.0 | file and adjacent sidecar verified; SHA-256 `b063616f6398912f5f35528afbc862a920490afdcfad757ad454251cafe986c1` |
| Accepted Stage 5 plan Candidate | `59d5d039c8724560dec6e7ee80b72307d8a3acad` | plan SHA-256 `91bb6d37e097dcc996256564550280118e5d9eafa48793440a5ed3ed67980510` |
| Runtime | Node `v24.14.0`, Darwin ARM64 | exact; frozen/offline pnpm environment; no dependency or browser download |

Root `AGENTS.md`, `docs/ENGINEERING_GOVERNANCE.md`,
`docs/REVIEW_POLICY.md`, the accepted Stage 5 plan, CRM/auth/public
specifications, and Owner authorization were read before mutation. The new
branch was created from the exact accepted S5-F2A Candidate. The accepted
Candidate remains the immutable rollback point.

## 3. Corrected responsibility boundary

### 3.1 One CRM read projection

`src/crm/inquiry-read-projection.ts` now owns Inquiry CRM read composition:

- `listInquiryCrmSummaries` applies `inquiries.read`, then scopes non-Admin
  results to `owner_user_id = actor.userId`;
- `getInquiryCrmReadProjection` first invokes the existing
  `requireInquiryRecordAccess`, then reads Contact presentation, files,
  activities, history, attribution, source evidence, and outcome fields; and
- the projection returns display values but never `contactId`,
  `sourceEntityId`, raw private Upload/Asset identity, or a client authority.

`src/admin/data.ts` no longer assembles a parallel Inquiry list/detail read.
It delegates to this projection, so authorization and CRM presentation cannot
drift into a second path.

No UI or Server Action gained a business-table write. Existing Domain Services
continue to own assignment, status, activity, Audit, and transaction rules.

### 3.2 Historical evidence versus current public presentation

The CRM projection labels the two concepts separately:

1. historical immutable evidence: the stored source entity type and Submit
   source path from the accepted S5-F2A snapshot; and
2. mutable current presentation: a current public label/link computed from the
   stored pair through the existing public Route and eligibility authority.

`resolveInquirySourcePresentation` queries only the stored pair. Product uses
`publicProductEligibilityConditions` directly. Application and Content reuse
the same current English Route plus accepted public/published semantics as the
existing public reads. The returned presentation contains only a label and
safe application-controlled path.

Current Route or lifecycle changes can change or remove the presentation but
cannot update `source_page_path`, `source_entity_type`, or `source_entity_id`.
Private/system paths are rejected by the existing canonical Inquiry path
contract. There is no UUID fallback, Redirect following, stale label cache, or
weakened public eligibility.

The F2A source resolver was narrowly converged onto the shared presentation
query and still requires the returned current path to equal the original
canonical Submit source path. This preserves initial exact-path resolution
while avoiding two entity-eligibility authorities.

## 4. Record-scoped authorization and privacy

The authorization matrix is enforced before customer data is returned:

| Actor | List | Detail |
|---|---|---|
| Admin | all Inquiries | allowed |
| Assigned Sales | assigned Inquiries only | allowed for assigned record |
| Unassigned Sales | no unassigned record | denied |
| Analyst / unrelated role | permission denied | denied |

The CRM route never accepts a client source type, entity UUID, or Route ID as
read authority. A current public link is presentation only and does not grant
CRM, Product, billing, Publish, Index, or analytics authority.

Focused server, actual public-handler, public-bundle, and browser evidence
proves the stored source identity, Contact identity, attribution values,
customer PII, and private-file identifiers do not enter:

- `conversion_events` or `toPublicAnalyticsPayload`;
- Provider/customer notification payloads;
- public Inquiry responses;
- logs or public URLs; or
- any chunk reachable from a public page manifest.

The public-bundle gate now rejects the CRM projection module marker in addition
to the accepted F2A source-pair/resolver markers.

## 5. CRM outcome closure

The implementation does not add or reinterpret a durable CRM state. It exports
the existing `allowedInquiryStatusTransitions` table for read presentation and
tests every valid and invalid ordered state pair across the accepted ten
states.

The CRM detail projection and UI expose:

- current outcome status and only its existing legal next statuses;
- qualification independently from lifecycle status;
- Lost Reason when present;
- Spam's effective exclusion from ordinary reporting;
- existing inbound/outbound/internal activity directions; and
- First Response as the first outbound activity timestamp minus Inquiry
  creation time, with no outbound response represented as absent.

Assignment remains the sole Sales record scope. First Response is derived at
read time from existing activities and adds no clock, writer, column, cache, or
background process.

## 6. Verification record

All persisted and browser fixtures were conspicuously Synthetic.

| Gate | Decisive result |
|---|---|
| Runtime guard | pass; Node `v24.14.0`, Darwin ARM64 |
| Focused CRM/F2A/request/API/bundle tests | 7 files / 204 tests passed |
| Outcome transition matrix | every accepted valid/invalid pair across the existing ten states passed; no lifecycle addition |
| ESLint | pass with zero warnings |
| Strict TypeScript | pass |
| Drizzle generate/no-delta | 60 tables; `No schema changes, nothing to migrate`; protected pre/post hash `364de1c6e29ea4fe98fc27bdb5a691fb8eb50edb85752f793dc5ef3c831a3cb7` |
| Real PostgreSQL 18.4 | pass; Fresh, Upgrade, repeat/no-op, F2A resolver/idempotency/concurrency/paired constraint/index/Audit+Upload rollback, plus Admin/assigned Sales allow, unassigned Sales/Analyst deny, current presentation change, private current Route null, and immutable snapshot |
| Corrected NUL-safe source-bound manifest | 145 source arguments; 134 files / 1000 tests passed, 11 files / 85 tests skipped |
| Browser readiness | pass against default per-user cache; Playwright `1.62.1`, Chromium revision `1234`, Chrome for Testing `151.0.7922.34`, Darwin ARM64; no ensure-browser or download |
| CRM browser gate | desktop and mobile passed with `--retries=0`; attribution/evidence separation, safe current link, no UUID, legal outcome transitions, responsive layout, keyboard focus, labels, and Axe zero violations |
| Isolated migrated/core-seeded Production Build | pass; migrations, core seed, optimized compile, strict TypeScript, and 43 generated pages; exact temporary PGlite/storage root deleted |
| Public bundle boundary | pass on fresh Build; 380 eligible server runtime files, 20 public page manifests, 7 root chunks, 8 manifest chunks, 15 distinct chunks; CRM/source forbidden tokens absent |
| Whitespace and protected scope | `git diff --check` pass; no Schema/Migration/Journal/snapshot, Route/Redirect/SEO/Publish/Index mutation, analytics/Provider/Outbox/template/SMTP behavior, dependency, lockfile, package script, CI, or browser-tool change |

The exact unmodified `pnpm test:run` command reported 134 passed files, 11
skipped files, 1000 passed tests, and 85 skipped tests. It exited 1 only because
the inherited obsolete Phase D generated-root diagnostic encountered
`.next/node_modules/@aws-sdk/client-s3-64df096a7e71b28d`, followed by the known
source-map JSON diagnostic. No ordinary test failed. The broad command was not
modified, suppressed, weakened, or reclassified.

The corrected NUL-safe source-bound manifest used tracked NUL-delimited paths,
excluded only the exact obsolete
`src/ai/phase-f-m6-one-case-diagnostic.integration.test.ts`, and passed all
selected source tests. An earlier attempted invocation placed a `--` before
positional paths and therefore caused full discovery; it was not reported as
source-bounded evidence. The corrected invocation and counts above are the
decisive result.

Real PostgreSQL used only `/Users/calvin/.docker/bin/docker`, the already-local
ARM64 `postgres:18.4-alpine` image
`sha256:9a8afca54e7861fd90fab5fdf4c42477a6b1cb7d293595148e674e0a3181de15`,
`--pull=never`, disposable loopback-only ports/databases, and Synthetic data.
The verifier container and prefixed databases were removed. No remote service,
Production/Staging credential, Provider, or formal data was accessed.

The first browser pass identified genuine contrast and form-label issues in
the changed CRM surface; these were corrected. A subsequent mobile run timed
out only after all mobile UI and Axe assertions while repeating a post-proof
mutation already proven on desktop. The final proportional test keeps the full
read/layout/accessibility proof on both viewports and the existing mutation
proof on desktop; both final projects passed without retry.

## 7. Exact bounded changed-path scope

Code/test/evidence paths relative to the exact rollback baseline:

1. `src/crm/inquiry-read-projection.ts` — sole record-scoped CRM detail/list
   projection;
2. `src/crm/inquiry-source-resolution.ts` — shared safe current public
   presentation using existing Route/entity authorities;
3. `src/crm/inquiry-service.ts` — exports the existing transition table for
   read presentation; no mutation semantics change;
4. `src/admin/data.ts` — replaces direct CRM list/detail assembly with the
   Domain projection;
5. `src/app/admin/inquiries/[id]/page.tsx` — historical attribution, current
   source presentation, and outcome closure UI;
6. `src/crm/inquiry-read-projection.integration.test.ts` — authorization,
   snapshot/presentation, outcome, and privacy matrix;
7. `src/crm/inquiry-outcome-contract.test.ts` — exhaustive accepted transition
   table proof;
8. `tests/e2e/public.spec.ts` — desktop/mobile CRM read, outcome, focus, ARIA,
   and Axe proof;
9. `scripts/verify-stage5-f1-postgres.ts` — existing guarded Stage 5 verifier
   extended for F2B; no second PostgreSQL framework;
10. `scripts/check-public-bundle.mjs` — existing reachability gate adds the
    CRM projection marker;
11. this report; and
12. its adjacent `.sha256` sidecar.

No coordinator handoff file was copied, edited, or committed.

## 8. Simplification and complexity report

- The old Admin query assembly was replaced, not layered, by one CRM Domain
  projection.
- One resolver query owns both F2A entity eligibility and F2B current
  presentation, preventing a second eligibility authority.
- Existing `requireInquiryRecordAccess`, permission mapping, public Route
  projection, Product eligibility, Domain mutations, test harnesses, browser
  cache, and PostgreSQL verifier were reused.
- No table, column, enum, index, Check, Migration, lifecycle state, auth path,
  writer, Worker, queue, cache, lock, dependency, package script, CI rule, or
  compatibility layer was added.
- Mutable current labels remain a read concern; immutable evidence remains an
  Inquiry write-once concern.

## 9. Open findings and rollback

One inherited Low remains: the obsolete Phase D generated-root/source-map
diagnostic described in section 6. It predates S5-F2B, produces no ordinary
test failure, and was neither hidden nor changed. It does not alter the bounded
implementation result and remains for its owning future cleanup authority.

Rollback is the exact accepted S5-F2A Candidate
`ef42dfd85b17466a0d1b99a987e6ab31758e8d9b`. No migration, backfill, durable
state, or external operation must be reversed. Reverting the bounded commits
removes the CRM projection/UI/evidence changes while preserving every accepted
S5-F2A snapshot byte-for-byte.

## 10. Terminal gate

This Implementer stops at the clean report-bearing Candidate. The required
next gate is a different fresh Independent Reviewer covering CRM architecture,
record-scope authorization, data integrity, attribution/outcome semantics,
privacy/public-bundle isolation, PostgreSQL/browser evidence, and Security &
Test Simplification. This report does not self-approve S5-F2B or authorize any
later phase or external action.
