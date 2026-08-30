# CWT Phase 1B Stage 5 — S5-F5 Admin and Integrated UX Remediation Report V1.1

| Field | Value |
|---|---|
| Date | 2026-08-30 (Asia/Shanghai) |
| Task | S5-F5 remediation attempt 1 — contrast scope delta after M-01/M-02 direct remediation |
| Branch | `refs/heads/codex/phase-1b-stage5-f5-admin-integrated-ux-v1` |
| Exact decision-blocked rollback | `33f8248296de0c2e65e9eec1d8fcf66ce2209ccf`; tree `25a5f09a3cf6d93ef7ee22938b16a79c0393324a` |
| New code/test checkpoint | `2f9789ff4c6a7ae3f7bf171d865d5c4a8f6f407e`; tree `b94ef9f0ec8a7355ce69eae3f748ae4c22514597` |
| Checkpoint sole parent | exact decision-blocked Candidate |
| Status represented | bounded Implementer completion evidence only |

This V1.1 report preserves
`docs/PHASE_1B_STAGE5_F5_ADMIN_INTEGRATED_UX_REMEDIATION_REPORT_V1_0.md`
as immutable decision-blocked history. It does not rewrite the original failed
implementation report or detached Independent FAIL report. It is not
Independent Re-Review, Owner acceptance, S5-F6, Merge, Push, Deploy,
SMTP/Provider validation, Production/Staging action, Publish, Index, or any
external authority.

The exact report-bearing successor identity and tree are supplied in the
terminal coordinator callback after this report and sidecar are committed.

## 1. Authority and custody

Before mutation, the branch and clean worktree reproduced exact
decision-blocked Candidate `33f8248296de0c2e65e9eec1d8fcf66ce2209ccf`, tree
`25a5f09a3cf6d93ef7ee22938b16a79c0393324a`. Original failed Candidate
`b1f46aae30f8bd3bb74f51180762e59a2efa1527` remained an ancestor. Detached
review-only commit `cc6702b18614123a10dc687cb3af946875297c72` remained outside
ancestry. The accepted S5-F4 branch remained exact at
`7e5dce6a351df0e858e0435d9c0f5e3c1f3cf36`.

The complete contrast scope delta and adjacent sidecar verified before
mutation at SHA-256
`3aff18513fe784cd6f40fad378c65c04dc6fe6fab6462e14b6c8460341c5891e`.
The V1.0 remediation report body and sidecar reproduced SHA-256
`d3377a3b6c3b6034390d5fa57cf80521a7b2b3b39a9590ea80eb71302a5e3cc4`.

## 2. Exact bounded correction

The sole production change is one existing utility replacement at the history
canonical-SHA presentation owner:

`text-slate-500` → `text-slate-400`

This uses an existing accessible Slate utility. It changes no background,
font size, font family, wrapping, content, ordering, semantics, SHA byte,
Revision identity, lifecycle, Domain behavior, global CSS, theme, color
system, component, renderer, or accessibility rule.

The code/test checkpoint changes exactly three paths relative to the
decision-blocked Candidate:

1. `src/app/admin/email-templates/page.tsx` — one production class token;
2. `src/admin/email-template-ux.static.test.ts` — exact accessible-utility and
   obsolete-utility absence proof; and
3. `tests/e2e/email-templates.spec.ts` — lifecycle-populated sequential
   computed-contrast and full Axe evidence.

Production diff size is exactly one added line and one deleted line in the
same canonical-SHA element. No other production path changed.

## 3. Decisive sequential lifecycle evidence

The decisive browser command was one non-reset composition with one worker and
retries disabled:

`pnpm exec playwright test tests/e2e/email-templates.spec.ts tests/e2e/public.spec.ts --grep 'Email Template Admin|Inquiry CRM' --retries=0 --workers=1`

It passed `4/4` in configured project order:

1. desktop Email Template lifecycle;
2. desktop Inquiry CRM regression;
3. Pixel 7 Email Template populated-state inspection using the same database;
4. Pixel 7 Inquiry CRM regression.

The desktop flow populated real governed lifecycle state before the decisive
accessibility inspection:

- internal Revision v1: create/save, submit, Review & Apply;
- internal Revision v2: create/save, submit, Review & Apply;
- rollback: historical v1 copied and applied as new Revision v3;
- customer Revision v1: create/save and submit for review; and
- fixed-recipient capture test send with truthful outcome Audit feedback.

The desktop populated page therefore contained three internal history rows and
one customer history row. Pixel 7 subsequently loaded the same four visible
history rows, including live internal Revision v3 and the customer in-review
Revision.

### 3.1 Computed contrast

The test reads the actual computed foreground and nearest opaque background
for every visible history canonical-SHA element. Chromium returns modern CSS
`lab(...)`; the measurement normalizes each computed color through a 1×1
browser Canvas to actual sRGB pixel channels, then applies the WCAG relative
luminance contrast formula.

All four desktop and all four Pixel 7 canonical-SHA rows:

- were visible;
- preserved exactly 64 lowercase hexadecimal characters;
- retained monospace, normal 12 px text and `break-all` wrapping;
- used the unchanged actual history-row background; and
- exceeded the required `4.5:1` normal-text boundary.

The existing Slate-400 foreground and Slate-900 background resolve to an
approximately `6.78:1` sRGB contrast ratio. No font-size workaround,
background change, hidden text, opacity, clipping, or content mutation was
used.

An initial evidence run correctly reached populated desktop and Pixel 7 state,
but the new direct helper mistakenly parsed CSS `lab(...)` coordinates as RGB
and reported a false `1.21` value before Axe execution. Production code was
not changed. The helper was corrected to use browser Canvas sRGB
normalization; the clean decisive rerun above passed both viewports.

### 3.2 Unfiltered Axe and M-01/M-02 continuity

After lifecycle population, unfiltered Axe returned zero violations on the
complete desktop page. Without clearing or replacing lifecycle data, Pixel 7
then returned zero violations on the same populated state. There is no impact
filter, exclusion, allowlist, disabled rule, suppression, or fresh-page-only
acceptance.

M-01 continuity:

- exactly one `Internal inquiry notification Synthetic Preview` landmark;
- exactly one `Customer inquiry confirmation Synthetic Preview` landmark; and
- one shared Preview component and renderer.

M-02 continuity:

- exact code-fallback bytes, including the trusted operations URL, were
  byte-compared before custom lifecycle mutation;
- the valid custom source retained its deliberately unbroken 900-character
  safe token byte-for-byte after rendering;
- desktop `screen.width`, `visualViewport.width`, `innerWidth`, document scroll
  width and body scroll width were each exactly `1280`;
- Pixel 7 corresponding widths were each exactly `412`; and
- both Preview regions plus four essential subject/body boxes remained inside
  the real visual viewport with `scrollWidth <= clientWidth`, no hidden/clip
  overflow, no ellipsis, and preserved `pre-wrap`/`overflow-wrap:anywhere`.

Keyboard focus, role/navigation/direct-route denial matrix, selected Revision
Preview, rollback-as-copy, test-send truth, CRM record scope, attribution,
outcome, UUID non-disclosure, privacy, and public-bundle isolation remained
green.

## 4. Complete verification record

| Gate | Exact result |
|---|---|
| Runtime | Node `v24.14.0`, pnpm `11.9.0`, Darwin ARM64 |
| Focused Template/Admin | PASS; 6 files / 50 tests |
| Accepted cross-domain regression | PASS; 8 files / 115 tests across CRM, Inquiry route/service, Template contract, Outbox payload/processor, Analytics and public composition |
| Zero-warning lint | `pnpm lint` PASS |
| Strict TypeScript | `pnpm typecheck` PASS; isolated Build TypeScript PASS |
| Browser readiness | PASS; Playwright `1.62.1`, Chromium/headless shell revision `1234`, Chrome for Testing `151.0.7922.34`, FFmpeg `1011`, accepted default per-user cache |
| Sequential populated browser | PASS `4/4`; desktop then Pixel 7, one worker, retries `0`, same lifecycle database, full Axe zero and computed contrast ≥4.5 |
| Browser cache | Before/after fingerprint unchanged at `e409ff9a8124ebda239720919c243f6ee0a3700913b176d2a4b4a33e666a8dd8`; no ensure-browser, download, override, or network installation |
| Drizzle no-delta | PASS; 60 tables; `No schema changes, nothing to migrate`; pre/post digest `364de1c6e29ea4fe98fc27bdb5a691fb8eb50edb85752f793dc5ef3c831a3cb7` |
| Corrected tracked NUL-safe manifest | 156 exact tracked arguments; 143 files passed / 11 skipped; 1093 tests passed / 85 skipped; only inherited Phase-D lineage and Vitest source-map diagnostic non-zero |
| Disposable PostgreSQL 18.4 | PASS on local ARM64 `postgres:18.4-alpine` image `sha256:9a8afca54e7861fd90fab5fdf4c42477a6b1cb7d293595148e674e0a3181de15`; Fresh/Upgrade/repeat and accepted Template/CRM/Outbox concurrency, Audit, rollback, lease/retry/dead, fencing, privacy and query-plan evidence |
| Isolated migrated/core-seeded Build | PASS; optimized compile, strict TypeScript and 44/44 page units including `/admin/email-templates` |
| Public bundle | PASS; 391 eligible server runtime files, 20 public manifests, 7 root chunks, 8 manifest chunks, 15 distinct chunks |
| Source-clean architecture | Production/static-resource/URL/protected-capability scan reached; exit 1 only at inherited Phase-D sole-parent assertion |
| Post-Build architecture | Same inherited Phase-D sole-parent assertion only; `.next` did not mask a Candidate failure |
| Exact broad command | `pnpm test:run`; 143 files passed / 11 skipped; 1093 tests passed / 85 skipped; exit 1 only for inherited Phase-D lineage plus known Vitest source-map JSON diagnostic; zero ordinary Candidate failures |
| Scope/diff | PASS; exact three checkpoint paths, production delta exactly one class-token line, no Domain/renderer/contract/CRM/Outbox/Schema/Migration/dependency/config/public-route mutation; `git diff --check` clean |
| Residue | PASS; browser/Build/database/storage outputs absent from worktree, PostgreSQL container absent, browser cache unchanged |

The source manifest and exact broad command were not filtered, caught,
suppressed, skipped, downgraded, or called PASS. Their only non-zero conditions
remain the accepted inherited L-02 Phase-D fixed-lineage assertion and the
Vitest/`convert-source-map` invalid-JSON diagnostic. No ordinary source test
failed.

## 5. Complexity, rollback, open findings, and next gate

Production complexity stayed level: one existing color utility replaced one
existing color utility. No branch, state, table, Worker, Lease, queue, cache,
dependency, permission, lifecycle, renderer, transport, or durable mechanism
was added. The direct M-01/M-02 component and layout corrections from checkpoint
`e7278c7dcbcbc20e1523bd0aa21cc3de6dcc9f0a` remain unchanged.

No bounded S5-F5 ordinary failure is known from Implementer verification. This
is not a self-review or finding-closure claim. The inherited L-02 Phase-D
lineage/Vitest source-map condition remains visible and unsuppressed.

Exact rollback for this delta is decision-blocked Candidate
`33f8248296de0c2e65e9eec1d8fcf66ce2209ccf`. Reverting the checkpoint restores
only the previous SHA text utility and its direct evidence; no Schema,
Migration, data, queue, transport, or external cleanup is required.

The single next gate is a fresh exact-successor Independent Re-Review by the
same separate Reviewer, including the sequential lifecycle-populated desktop
and Pixel 7 contrast/Axe boundary. Implementer completion does not close
M-01/M-02, accept S5-F5, authorize S5-F6, or authorize any external action.
