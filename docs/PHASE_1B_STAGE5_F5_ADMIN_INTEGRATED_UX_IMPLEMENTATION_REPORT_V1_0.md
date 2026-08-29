# CWT Phase 1B Stage 5 — S5-F5 Admin and Integrated UX Implementation Report V1.0

| Field | Value |
|---|---|
| Date | 2026-08-30 (Asia/Shanghai) |
| Task | S5-F5 Admin and Integrated UX |
| Branch | `refs/heads/codex/phase-1b-stage5-f5-admin-integrated-ux-v1` |
| Exact accepted S5-F4 rollback | `7e5dce6a351df0e858e0435d9c0f5e3c1f3cf36c`; tree `3502a02a3b2cdf0324a745a79f0832a7b3b9db5b` |
| Code/test checkpoint | `652c45e2db6667e8ef3f5f469f4cbe30467a7bc7`; tree `965e84c574c0ad7820ebbad809b11cc64ad2c040` |
| Checkpoint sole parent | exact accepted S5-F4 rollback |

Status represented by this document: bounded Implementer completion Candidate
only. It is not Independent Review, Owner acceptance, S5-F6, Merge, Push,
Deploy, SMTP/Provider validation, Production/Staging action, Publish, Index, or
any external authority.

The exact report-bearing Candidate identity and tree are supplied in the
terminal coordinator callback after this report and its sidecar are committed.
A Git commit cannot contain its own final identity without changing it.

## 1. Authority and exact starting-state reproduction

The worktree began clean at exact accepted S5-F4 Candidate
`7e5dce6a351df0e858e0435d9c0f5e3c1f3cf36c`, tree
`3502a02a3b2cdf0324a745a79f0832a7b3b9db5b`, on the accepted F4 branch.
That branch remains unmoved and is the exact rollback point. The new F5 branch
was created directly from that Candidate. Review-only commit
`a372a42983e35174a6c96f11b3c3c6b58df3b5bb` is not in Candidate ancestry.

Before mutation, the Implementer read the root `AGENTS.md`,
`docs/ENGINEERING_GOVERNANCE.md`, the complete accepted Stage 5 plan directly
from Candidate `59d5d039c8724560dec6e7ee80b72307d8a3acad`, the applicable Template,
CRM, permission, and testing contracts, and the accepted S5-F2B/S5-F3/S5-F4
implementation evidence. Reports were treated as evidence, not architecture.

Both external Owner records and adjacent sidecars verified before mutation:

- F4 Owner acceptance and remaining Stage 5 standing delegation:
  `784543e33453d3b38986c7d2f6a9500d26189da4ce1d3ccd97e330ff51480bce`;
- F5 development authorization:
  `6b8eb9e9e2f23135ce23c4d9e4a01374590a8d358aa64394e04b1041e65a1d27`.

## 2. Implemented bounded convergence

### 2.1 One governed noindex Email Template namespace

`/admin/email-templates/` is one authenticated, noindex Admin namespace for
exactly the two accepted kinds. The existing Admin home and Refine resource list
now expose this namespace only when the existing `email_template` editorial
resource policy permits it. No role, permission, navigation framework, public
route, or browser-side authorization authority was added.

The page obtains one server-owned `EmailTemplateAdminProjection` per kind from
the accepted Template Domain Service. It presents:

- exact Setting key and sole Active provenance;
- code-fallback, revision, fallback-reason, and canonical-SHA truth;
- one current Draft and one current in-review row where present;
- complete immutable Revision history in descending version order;
- exact kind-specific variable allowlists; and
- fixed-Synthetic rendered subject/body with selected-Revision provenance.

The UI does not import the database Schema, query Inquiry/Contact/Organization,
load private files, or construct a second Settings/Revision projection.

### 2.2 Lifecycle through the accepted Domain Service only

Thin Server Actions parse bounded form data, obtain the authenticated actor,
call only the accepted Domain functions, and request page revalidation. They
contain no `insert`, `update`, `delete`, direct Audit writer, redirect,
Inquiry/CRM writer, SMTP, Provider, or transport construction beyond the
accepted in-memory capture adapter.

The UI exposes only:

- `subjectSource`, maximum 200 characters;
- `textBodySource`, maximum 20,000 characters;
- change summary, required and Domain-bounded to 500 characters; and
- existing Revision/draft-version concurrency identities as hidden server
  expectations.

Browser-native CRLF textarea serialization is normalized to canonical LF only
for the plain-text body adapter. Subject CR/LF remains unmodified and therefore
continues to fail the accepted header-injection contract. Markup, remote
content, unknown variables, nested traversal, expressions, and unsafe controls
remain Domain-rejected.

Draft save/edit, submit-for-review, Review & Apply, and rollback-as-new-copy all
reuse the accepted Template lifecycle. Apply derives its post-mutation page
revalidation kind from the Domain result, not a browser field, avoiding a
post-commit false-failure or wrong-kind authority. Rollback never reactivates or
mutates history in place.

### 2.3 Fixed-Synthetic Preview and capture-only test send

Active and selected-Revision Preview both use
`SYNTHETIC_EMAIL_TEMPLATE_V1`. There is no Inquiry selector, customer record,
customer UUID, Contact/Organization lookup, private-file lookup, or
browser-provided operations URL.

Admin-only test send:

- has no recipient, To, CC, BCC, From, or Reply-To input;
- rejects any directly submitted envelope field before capture;
- uses the accepted renderer, centralized trusted envelope, exact fixed
  `test@cwtextile.com` recipient, canonical prefix policy, and
  `InMemoryCaptureEmailTransport`;
- makes exactly one attempt with no retry; and
- reports `success`, `failure`, or `uncertain` plus the independent
  `outcomeAuditRecorded` truth without reversing or misreporting capture truth.

The shared typed Admin result was narrowly extended with an optional operation
status and action-supplied safe message. The existing form still provides
duplicate suppression, pending disablement, field/form error binding, conflict
reload, safe network handling, refresh/redirect intent, focus, and ARIA
announcements. Test send supplies a purpose-specific pending message and keeps
failure/uncertain transport outcomes visibly distinct from Server Action
exceptions.

### 2.4 CRM integrated UX remains one projection

No CRM source file changed. Existing Inquiry list/detail pages continue to use
the accepted record-scoped CRM projection. Browser regression independently
proved immutable First Touch, Last Non-Direct, Submit Touch, safe current-source
presentation without stored UUID disclosure, outcome transition choices,
Admin mutation, responsive layout, focus, and Axe behavior on desktop and
mobile. Template permissions still grant no Inquiry read access.

## 3. Role and action matrix

The complete server policy, rendered navigation, direct-route, and action
visibility matrix is:

| Role | List/history | Fixed-Synthetic Preview | Draft/edit/submit | Review/Apply | Rollback-as-copy | Capture test send | Inquiry access from template role |
|---|---:|---:|---:|---:|---:|---:|---:|
| Admin | allow | allow | allow | allow | allow | allow | none added |
| Content Editor | allow | allow | allow | deny | deny | deny | deny |
| Reviewer/Publisher | allow | allow | deny | allow | allow | deny | deny |
| Product Editor | deny | deny | deny | deny | deny | deny | none |
| Sales | deny | deny | deny | deny | deny | deny | existing assigned Inquiry scope only |
| Analyst | deny | deny | deny | deny | deny | deny | none |
| Anonymous/public | deny/redirect to login | deny | deny | deny | deny | deny | none |

Browser evidence also proves denied roles have neither the Admin-home link nor
the governed page body. Server Domain tests remain authoritative even when UI
controls are absent.

## 4. Verification record

All identities, users, messages, database rows, and browser data were
conspicuously Synthetic. No browser download, network fetch, SMTP/Provider,
credential, remote service, Production/Staging data, formal data, or external
action occurred.

| Gate | Decisive result |
|---|---|
| Runtime | PASS; Node `v24.14.0`, pnpm `11.9.0`, Darwin ARM64 |
| Focused F5/Template composition | PASS; 6 files / 42 tests, including Domain-only actions, exact role/navigation/static boundary, AdminActionForm truth, projection/lifecycle/Audit, and capture outcomes |
| Zero-warning lint | `pnpm lint` PASS |
| Strict TypeScript | `pnpm typecheck` PASS; optimized Build TypeScript PASS |
| Browser readiness | PASS; Playwright `1.62.1`, Chromium/headless-shell revision `1234`, Chrome for Testing `151.0.7922.34`, FFmpeg `1011`, default per-user cache, Darwin ARM64; no ensure-browser, download, override, or network access |
| Template Admin browser | PASS with `--retries=0`; desktop and Pixel 7 mobile 2/2; lifecycle v1/v2, Apply, rollback new v3, Active/selected Preview, fixed-recipient capture, six-role negative matrix, anonymous denial, keyboard focus, Axe zero Critical/Serious, and no overflow |
| CRM integrated browser | PASS with `--retries=0`; desktop and Pixel 7 mobile 2/2; record-scoped attribution/outcome truth, current-safe link, UUID non-disclosure, focus, Axe, and no overflow |
| Source-clean architecture | Full production/static-resource/URL/protected-capability scan reached; exit 1 only at inherited Phase-D sole-parent lineage assertion. An initial invocation without `CWT_INSTALLED_NODE_MODULES` correctly failed its existing dependency-identity guard; the decisive pinned rerun reached only the inherited Low. |
| Exact unmodified broad command | `pnpm test:run`; 143 files passed / 11 skipped; 1092 tests passed / 85 skipped; exit 1 only for inherited Phase-D fixed-lineage child plus known Vitest source-map JSON error |
| Corrected tracked NUL-safe manifest | PASS; 156 exact tracked arguments, 154 discovered files; 143 passed / 11 skipped; 1092 passed / 85 skipped; excluded only `src/ai/phase-f-m6-one-case-diagnostic.integration.test.ts` |
| Drizzle no-delta | PASS; 60 tables; `No schema changes, nothing to migrate`; protected pre/post digest `364de1c6e29ea4fe98fc27bdb5a691fb8eb50edb85752f793dc5ef3c831a3cb7` |
| Disposable PostgreSQL 18.4 | PASS; Fresh/Upgrade/repeat, Template Draft concurrency, versions `1..4`, sole Active, Audit rollback, rollback-as-copy, Synthetic Preview/capture, plus accepted Inquiry/CRM/Outbox atomicity, idempotency, claim, Lease, concurrency, retry/dead, rollback, and query plans |
| Isolated migrated/core-seeded Build | PASS; migrations, core seed, optimized compile, strict TypeScript, and 44 generated page units including the dynamic `/admin/email-templates` namespace |
| Public bundle | PASS; 391 eligible server runtime files, 20 public manifests, 7 root chunks, 8 manifest chunks, 15 distinct chunks; Admin/Template code remains outside public reachability |
| Post-Build architecture | Same inherited Phase-D sole-parent Low only; generated output did not mask a Candidate failure |
| Scope/privacy/diff | PASS; exact 15 code/test paths; no Schema/Migration/Journal/snapshot, dependency, lockfile, package script, CI, role/permission, CRM/Inquiry, Outbox/email transport, public route/SEO/Publish/Index, or Provider change; `git diff --check` clean |
| Residue | PASS; `.next`, `next-env.d.ts`, TypeScript build metadata, Playwright reports/results, isolated database/storage roots, and verifier container/databases absent from the worktree at checkpoint |

The exact broad command was not filtered, caught, skipped, suppressed,
downgraded, or called PASS. Its only non-zero conditions are the accepted
inherited L-02 Phase-D lineage guard and Vitest source-map parsing diagnostic.
No ordinary Candidate test failed. The source-bound manifest passed every
applicable tracked Vitest source test other than the one exact authorized
obsolete diagnostic exclusion.

The PostgreSQL verifier first demonstrated both existing environment guards by
refusing runs without its isolation sentinel and loopback admin URL. The
decisive run used only the already-local ARM64 `postgres:18.4-alpine` image
`sha256:9a8afca54e7861fd90fab5fdf4c42477a6b1cb7d293595148e674e0a3181de15`,
`--pull=never`, a random loopback host port, Synthetic credentials, randomized
databases, and the existing guarded verifier. The databases and exact container
were removed; a filtered final container listing was empty.

The first desktop browser attempt exposed canonical HTML textarea CRLF
serialization against the strict LF plain-text Domain contract. The adapter was
corrected to normalize body CRLF to LF while retaining subject injection
rejection. A separate early browser assertion also targeted a status node after
refresh replacement; lifecycle proof was corrected to assert persisted page
state, while the non-refresh capture action retains explicit visible outcome
assertions. The final complete desktop/mobile runs passed with retries disabled.

## 5. Exact changed-path inventory

The code/test checkpoint changes exactly 15 paths relative to the accepted F4
rollback:

1. `src/admin/action-result.ts` — optional truthful operation status/message;
2. `src/admin/components/admin-action-form.tsx` — purpose-specific pending text and operation-status exposure;
3. `src/admin/components/admin-action-form.test.tsx` — uncertain/pending/result semantics;
4. `src/admin/invoke-admin-action.ts` — safe action-supplied success/outcome message;
5. `src/admin/email-template-actions.ts` — thin Domain-only lifecycle/Preview-test adapters;
6. `src/admin/email-template-actions.test.ts` — composition, parsing, envelope denial, and outcome matrix;
7. `src/admin/email-template-ux.static.test.ts` — Domain-only, navigation, noindex, privacy, and shared-form proof;
8. `src/admin/refine/refine-admin-provider.tsx` — role-filtered existing-resource navigation entry;
9. `src/app/admin/layout.tsx` — includes the accepted `email_template` resource policy;
10. `src/app/admin/page.tsx` — role-filtered Email Templates Admin link;
11. `src/app/admin/email-templates/layout.tsx` — namespace metadata/noindex;
12. `src/app/admin/email-templates/page.tsx` — governed two-kind integrated Admin UX;
13. `src/email-templates/service.ts` — immutable Admin read projection and 500-character Domain summary bound;
14. `src/email-templates/service.integration.test.ts` — projection, bound, permission, and immutable-state proof; and
15. `tests/e2e/email-templates.spec.ts` — desktop/mobile lifecycle, negative matrix, accessibility, focus, and overflow.

This report and its adjacent sidecar are the only report-bearing successor
artifacts.

## 6. Simplification, state, and security statement

- One existing Template Domain Service remains the lifecycle and read authority.
- One existing Settings/Revision/Audit model remains authoritative; no second
  Active pointer, Revision mechanism, or template table exists.
- One existing `AdminActionForm` remains the mutation UI; the extension is
  optional and backward-compatible.
- One accepted centralized envelope and capture transport remains authoritative.
- One accepted record-scoped CRM projection remains unchanged.
- No durable state, queue, Worker, scheduler, retry path, cache, lock,
  dependency, role, permission, Schema, Migration, or Provider integration was
  added.
- No Template permission grants Inquiry, CRM, Contact, Organization, Upload,
  private Asset, analytics, Product, SEO, Publish, or Index authority.
- Public bundle and public route behavior remain unchanged.

## 7. Open findings, rollback, and next gate

No bounded S5-F5 Blocker or new qualifying finding is known from Implementer
verification. This is not a self-review or finding-closure claim.

One inherited Low remains visible and unsuppressed: the obsolete Phase-D
fixed-lineage assertion and subsequent Vitest source-map JSON diagnostic in the
exact broad/architecture gates. It predates S5-F5 and produced no ordinary test
failure.

SMTP/Zoho authentication, real delivery, Provider acknowledgement/deduplication,
real Staging/Production configuration, and formal Product/customer data remain
External Validation or later-stage work and were not attempted.

Rollback is exact accepted S5-F4 Candidate
`7e5dce6a351df0e858e0435d9c0f5e3c1f3cf36c`. Reverting the bounded code/test
checkpoint and report commit removes the Admin namespace and optional form
result extension without Schema, Migration, durable-state, queue, email, or
external cleanup.

The single next gate is a different fresh Independent Reviewer covering Admin
architecture, Domain-only composition, lifecycle/Audit/concurrency truth,
permissions and record-scope separation, Synthetic Preview, capture-only test
truth, responsive/accessibility/browser evidence, public-bundle isolation,
PostgreSQL evidence, scope, and Security & Test Simplification. Implementer
completion does not authorize S5-F6 or any external action.
