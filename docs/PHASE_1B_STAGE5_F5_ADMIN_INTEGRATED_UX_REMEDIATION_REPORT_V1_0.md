# CWT Phase 1B Stage 5 — S5-F5 Admin and Integrated UX Remediation Report V1.0

| Field | Value |
|---|---|
| Date | 2026-08-30 (Asia/Shanghai) |
| Task | S5-F5 bounded remediation attempt 1 — M-01 and M-02 only |
| Branch | `refs/heads/codex/phase-1b-stage5-f5-admin-integrated-ux-v1` |
| Exact failed Candidate / rollback | `b1f46aae30f8bd3bb74f51180762e59a2efa1527`; tree `9f203496213bfe6709da3a45942e60bfad8d5297` |
| Code/test checkpoint | `e7278c7dcbcbc20e1523bd0aa21cc3de6dcc9f0a`; tree `848a0d5bbe7f3f530d83a8677aa4e28f8aeee0d6` |
| Checkpoint sole parent | exact failed Candidate |
| Terminal status | `NEEDS_OWNER_DECISION` — direct M-01/M-02 corrections pass, but a newly exposed out-of-scope history-row contrast issue prevents an unqualified completion claim |

This report supersedes only the failed Candidate's current implementation and
evidence claim. It does not edit or erase
`docs/PHASE_1B_STAGE5_F5_ADMIN_INTEGRATED_UX_IMPLEMENTATION_REPORT_V1_0.md`
or the detached Independent FAIL review. It is not Independent Re-Review,
Owner acceptance, S5-F6, Merge, Push, Deploy, SMTP/Provider validation,
Production/Staging action, Publish, Index, or external authority.

The exact report-bearing successor identity and tree are supplied in the
terminal coordinator callback after this report and its sidecar are committed.

## 1. Authority, custody, and starting-state reproduction

Before mutation, the worktree was clean on
`refs/heads/codex/phase-1b-stage5-f5-admin-integrated-ux-v1` at exact failed
Candidate `b1f46aae30f8bd3bb74f51180762e59a2efa1527`, tree
`9f203496213bfe6709da3a45942e60bfad8d5297`. The accepted S5-F4 branch remained
exact at `7e5dce6a351df0e858e0435d9c0f5e3c1f3cf36`.

Detached review-only commit `cc6702b18614123a10dc687cb3af946875297c72`
was verified outside Candidate ancestry. Its report body reproduced SHA-256
`0d08300dfc777abfd63d92c498ec48ef1508779dc5bd58c4d54fb2d3aaf85416`.

The complete remediation authorization and adjacent sidecar verified before
mutation at SHA-256
`4bee658ac51c8a4dce8626c55927cc06efb00ee4d483d21d5f41c42262d37476`.
The root `AGENTS.md`, `docs/ENGINEERING_GOVERNANCE.md`, failed implementation
report, and full Independent FAIL report were read before implementation.

## 2. Root cause and bounded corrections

### 2.1 M-01 — unique Preview landmarks and unfiltered Axe

Root cause: the one shared `TemplatePreview` component used the same fixed
`aria-label` for both accepted Template kinds. The browser test also filtered
Axe results by impact, hiding `landmark-unique` at moderate impact.

Correction:

- the same single `TemplatePreview` now receives the trusted
  `EmailTemplateKind` and derives the accessible region name from the existing
  kind label;
- the two exact landmark names are `Internal inquiry notification Synthetic
  Preview` and `Customer inquiry confirmation Synthetic Preview`;
- actual role queries require exactly one of each landmark; and
- Axe assertions now require `accessibility.violations` to equal the empty
  array with no impact filter, exclusion, allowlist, disabled rule, or
  suppression.

No second Preview component, renderer, accessibility framework, role, or
business authority was added.

### 2.2 M-02 — causal grid minimum and wrapping containment

Root cause: the Preview `dl` had an implicit one-column grid track with an
automatic minimum, while its direct item/content boxes did not consistently
carry a zero minimum. The accepted operations URL could therefore expand the
mobile layout. The old test compared document width with already-expanded
`window.innerWidth`, allowing a 454 px layout to pass against a 412 px Pixel 7
visual viewport.

Correction:

- the existing Preview grid uses the explicit
  `grid-cols-[minmax(0,1fr)]` track;
- direct grid items and body containers carry `min-w-0`;
- subject and body use presentation-only `overflow-wrap:anywhere` while the
  body retains `white-space:pre-wrap`; and
- no overflow hiding, clipping, ellipsis, truncation, fixed mobile width,
  zoom, viewport change, source mutation, renderer change, or validation
  weakening was introduced.

The browser evidence now measures `screen.width`, `visualViewport.width`,
`window.innerWidth`, document/body scroll widths, both Preview regions, and
all four essential subject/body content boxes. It requires zero intrinsic
horizontal overflow, visible in-viewport bounds, non-hidden/non-clipped
overflow, no ellipsis, and the expected wrapping styles.

## 3. Direct M-01/M-02 evidence

### 3.1 Exact viewport and byte evidence

| Case | `screen.width` | `visualViewport.width` | `innerWidth` | document scroll width | body scroll width | Result |
|---|---:|---:|---:|---:|---:|---|
| Desktop Chrome, exact code fallback | 1280 | 1280 | 1280 | 1280 | 1280 | contained |
| Desktop Chrome, custom 900-character unbroken token | 1280 | 1280 | 1280 | 1280 | 1280 | contained |
| Pixel 7, exact code fallback including trusted operations URL | 412 | 412 | 412 | 412 | 412 | contained |

The exact fallback `<pre>` `textContent` was compared byte-for-byte with the
accepted rendered fallback, including
`https://operations.example.test/admin/inquiries/00000000-0000-4000-8000-000000000001/`.
The custom source includes one 900-character unbroken safe token and its
rendered `<pre>` `textContent` was compared byte-for-byte with the expected
renderer output. CSS wrapping changed presentation only; no source or rendered
byte was inserted, removed, or replaced.

For each measured page, all six marked Preview/essential boxes remained within
the visual viewport. Every target had `scrollWidth <= clientWidth`; none used
`overflow-x:hidden`, `clip`, or ellipsis. Both body boxes retained
`white-space:pre-wrap` and `overflow-wrap:anywhere`.

### 3.2 Accessibility, browser, lifecycle, and integration

The decisive standard browser command used both configured projects with
retries disabled and passed `4/4`:

`pnpm exec playwright test tests/e2e/email-templates.spec.ts tests/e2e/public.spec.ts --grep 'Email Template Admin|Inquiry CRM' --retries=0`

It proved on actual desktop and Pixel 7 pages:

- exactly two uniquely named kind-specific Preview landmarks;
- unfiltered Axe zero violations on each fresh actual Template Admin page;
- keyboard focus and visible focus behavior;
- exact fallback containment on both projects;
- desktop custom long-token containment and byte fidelity;
- Draft, submit, Apply, rollback-as-copy, selected Revision Preview, capture
  test-send truth, role/navigation/direct-route matrix, and anonymous denial;
- CRM record-scope, attribution/outcome truth, and UUID non-disclosure; and
- no horizontal document, body, Preview, or essential-content overflow.

`pnpm test:e2e:readiness` passed with Playwright `1.62.1`, Chromium/headless
shell revision `1234`, Chrome for Testing `151.0.7922.34`, FFmpeg `1011`,
Darwin ARM64, and the accepted default per-user cache. The cache metadata
fingerprint was identical before and after all browser work:
`e409ff9a8124ebda239720919c243f6ee0a3700913b176d2a4b4a33e666a8dd8`.
No ensure-browser, download, cache override, or network installation ran.

## 4. Complete verification record

| Gate | Exact result |
|---|---|
| Runtime | Node `v24.14.0`, pnpm `11.9.0`, Darwin ARM64 |
| Focused Template/Admin composition | PASS; 6 files / 50 tests before the browser-only evidence refinement; final static boundary 1 file / 4 tests PASS |
| Accepted CRM/Inquiry/Template/Outbox/Analytics regression selection | PASS; 8 files / 115 tests |
| Zero-warning lint | `pnpm lint` PASS after final checkpoint |
| Strict TypeScript | `pnpm typecheck` PASS after final checkpoint; isolated Build TypeScript PASS |
| Drizzle no-delta | PASS; 60 tables; `No schema changes, nothing to migrate`; pre/post digest `364de1c6e29ea4fe98fc27bdb5a691fb8eb50edb85752f793dc5ef3c831a3cb7` |
| Corrected tracked NUL-safe manifest | 156 exact tracked arguments; 143 files passed / 11 skipped; 1093 tests passed / 85 skipped; non-zero only from inherited Phase-D lineage and Vitest source-map diagnostic |
| Disposable PostgreSQL 18.4 | Decisive PASS on local ARM64 `postgres:18.4-alpine` image `sha256:9a8afca54e7861fd90fab5fdf4c42477a6b1cb7d293595148e674e0a3181de15`; Fresh/Upgrade/repeat plus Template/CRM/Outbox concurrency, Audit, rollback, lease/retry/dead, fencing, privacy, and query-plan evidence |
| Isolated migrated/core-seeded Build | PASS; optimized compile, strict TypeScript, 44/44 generated page units including `/admin/email-templates` |
| Public bundle | PASS; 391 eligible server runtime files, 20 public manifests, 7 root chunks, 8 manifest chunks, 15 distinct chunks |
| Source-clean architecture | Full production/static-resource/URL/protected-capability scan reached; exit 1 only at inherited Phase-D sole-parent assertion |
| Post-Build architecture | Same inherited Phase-D sole-parent assertion only; generated output did not mask a Candidate failure |
| Exact broad command | `pnpm test:run`; 143 files passed / 11 skipped; 1093 tests passed / 85 skipped; exit 1 only for inherited Phase-D lineage plus known Vitest source-map JSON diagnostic; zero ordinary Candidate test failures |
| Scope/privacy/diff | PASS for the authorized checkpoint; exactly 3 code/test paths, no Domain/renderer/contract/CRM/Outbox/transport/Schema/Migration/dependency/config/public-route change; `git diff --check` clean |
| Residue | PASS; build/browser/database/storage outputs absent from worktree, PostgreSQL container absent, default browser cache unchanged |

The first PostgreSQL attempt used the correct loopback/Synthetic guard but
omitted explicit `POSTGRES_DB=postgres`. The image therefore created an extra
database named after the Synthetic user; all business cases printed PASS, then
the verifier correctly failed its zero-residual-database assertion. That
container was removed. The decisive rerun explicitly selected `postgres`,
passed all cases and cleanup assertions, and removed the container and
Synthetic databases.

The exact broad and source-manifest commands were not filtered, caught,
suppressed, skipped, or called PASS. Their only non-zero conditions are the
accepted inherited L-02 Phase-D fixed-lineage assertion and Vitest/
`convert-source-map` invalid-JSON diagnostic. No ordinary source test failed.

## 5. Scope and complexity

The checkpoint changes exactly:

1. `src/app/admin/email-templates/page.tsx` — kind-specific landmark naming and
   causal Preview containment classes/data markers;
2. `src/admin/email-template-ux.static.test.ts` — one-component, naming,
   containment, and unfiltered-evidence structural proof; and
3. `tests/e2e/email-templates.spec.ts` — exact fallback/custom bytes,
   accessibility-tree, full Axe, device/visual viewport, content-box,
   lifecycle, role, capture, CRM, and overflow evidence.

One shared Preview component and one accepted renderer remain. No business
branch, state transition, table, state, Worker, Lease, cache, dependency,
permission, transport, or durable coordination mechanism was added. Total
production complexity stayed level; the change narrows layout behavior at its
existing ownership boundary.

## 6. New open observation and decision required

During an additional non-decisive sequential diagnostic, the desktop lifecycle
was intentionally allowed to populate Revision history before the Pixel 7 Axe
scan. Unfiltered Axe then reported `color-contrast` for existing history-row
canonical-SHA text using `text-slate-500` on `bg-slate-900`: ratio `3.74:1`
versus the required `4.5:1`. This was not the M-01 duplicate-landmark finding,
not caused by the remediation checkpoint, and not inside either Preview region.

Changing that history presentation would exceed the authorization's production
mutation boundary, which is limited to existing Preview accessible naming and
responsive Preview presentation. No allowlist, impact filter, suppression,
rule disablement, or unauthorized color change was used to conceal it. The
standard fresh-project desktop/Pixel gate above still passes unfiltered Axe,
but an unqualified all-lifecycle-state zero-violation claim would be false.

Owner/coordinator decision is required on one of these explicit paths:

1. authorize a separate narrow accessibility correction for the existing
   history canonical-SHA text contrast, followed by rerunning the same
   unfiltered lifecycle-state Axe gate; or
2. explicitly confirm that remediation M-01's Axe acceptance state is the
   fresh actual Template Admin page specified by the failed finding, while the
   history-row contrast becomes a separately tracked finding.

Until that decision, this Implementer does not claim M-01/M-02 closure or
S5-F5 acceptance. Exact rollback remains failed Candidate
`b1f46aae30f8bd3bb74f51180762e59a2efa1527`. The accepted S5-F4 rollback and
branch remain unchanged. No S5-F6 or external action is authorized.
