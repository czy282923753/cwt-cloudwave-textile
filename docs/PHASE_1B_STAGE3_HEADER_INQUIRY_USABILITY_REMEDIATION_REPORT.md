# Phase 1B Stage 3 Header and Inquiry Usability Remediation Report

## Candidate status

This report records the implementation Candidate requested by the Owner for desktop Header spacing, Header Home-link removal, Inquiry country-code handling, and the English custom file chooser.

- Frozen baseline: `4a3f2835d0d39c026b3dd4fdb4d15fb83100438c`
- Baseline ref verified at the gate: `codex/cwt-sec-dep-001-nanoid-remediation`
- Candidate branch: `codex/header-inquiry-usability-remediation`
- Code and test commit: `e111ee0d500044da99f6f934ee1ace569118d1a8`
- Report commit: recorded after this report-only commit is created
- Review state: awaiting a fresh independent Reviewer

This report does not claim Review Passed, Accepted, Frozen, Production Ready, Tag, Push, Deploy, or Production validation.

## Identity and scope gate

The task began from a clean detached worktree. `HEAD`, the frozen baseline, and `codex/cwt-sec-dep-001-nanoid-remediation` all resolved exactly to `4a3f2835d0d39c026b3dd4fdb4d15fb83100438c`. The task branch was then created without moving an existing ref.

The implementation remained within the authorized public shell/CSS, Inquiry form, shared country authority, Inquiry API/Domain Service/outbox validation, and corresponding tests. It did not change Schema, Migration, package dependencies, lockfile, URL, Canonical, Redirect, SEO, analytics events, upload services, storage adapters, authorization, scan rules, or publishing architecture.

All database, storage, server, and browser verification used task-owned test/noindex resources. No running Draft import, existing database/storage, existing server, or existing Browser session was reused or modified.

## Root causes and corrected responsibility boundaries

### Header

The Logo, desktop Primary Navigation, and `Get a Quote` CTA were three siblings under `justify-content: space-between`. The remaining container width therefore became a second, variable separation between `About CWT` and the CTA.

The Logo remains the independent left-side element. Desktop navigation and the CTA now share one `desktop-actions` right-side group with an exact `2rem` (`32px`) CSS gap. The existing `1.65rem` navigation gap is unchanged. The Owner-added removal of the visible `Home` item is implemented once in the shared `primaryLinks` authority, so both desktop and mobile Header menus omit it. The unchanged official Logo remains the clear accessible link to `/`.

### Country

The API previously enforced only a two-character maximum, while the Domain Service treated country as generic optional text. Values such as `ZZ` and `C` could reach persistence, and lowercase normalization was not authoritative.

`src/crm/country-codes.ts` is now the dependency-free shared authority. It contains the complete 249-code ISO 3166-1 alpha-2 set plus English display names. The Inquiry form, API, Domain Service, and notification outbox all reuse that authority. The Domain Service replaces generic optional-text handling with uppercase ISO normalization and validation before fingerprint evaluation or any mutation.

The optional Inquiry contract is unchanged. Empty input becomes `null`; `cn` becomes `CN`; `ZZ`, `China`, `C`, digits, and mixed arbitrary text are rejected. The code-only value flows to initial Contact master data, immutable submitted Inquiry snapshots, request fingerprints, outbox payloads, and email notifications. Existing exact-email retry behavior still prevents an anonymous later Inquiry from overwriting Contact master data.

### File chooser

The visible native file input exposed browser chrome localized by the operating system, which cannot be reliably forced to English with page language settings.

The existing file input remains the sole upload input and retains its `accept`, `multiple`, FileList, Upload Intent, private storage, scan, size/type, and submission behavior. It is now visually hidden with a clipped, transparent, non-pointer surface. A keyboard-operable `type="button"` control displays `Choose files`, while an `aria-live` status displays `No files selected`, a safe single filename, or `N files selected`. `Clear files` clears the real input value and then derives status from the resulting FileList. Reselection and upload/submission errors retain synchronization with that same FileList. Display names strip path separators/control characters and are bounded before they appear in status or the frozen retry summary.

## Owner-visible behavior

- Desktop Header: Logo at left; `Products` through `About CWT` plus CTA form one right-side group; `About CWT` to CTA gap is exactly 32px.
- Desktop and mobile Header: no visible `Home` navigation item.
- Desktop and mobile Header: the official, unchanged Logo still links to `/` with `CloudWave Textile home` as its accessible label.
- Country: the datalist shows English country names with code-valued options, including `China (CN)` with value `CN`; manual code entry is limited to two characters and normalized uppercase.
- Country helper: `Select a country or enter its 2-letter code (optional).`
- File chooser: English `Choose files` and `No files selected` controls replace visible native locale chrome.
- Mobile menu/CTA behavior, all Header links/URLs, quote analytics events, SEO, Inquiry required fields, idempotency, and private upload behavior remain unchanged.

## Business and security invariants

- Name and Email remain required; Country and WhatsApp remain optional; description-or-one-stored-image remains required.
- API validation is not authoritative by itself. `createInquiry` re-normalizes and revalidates country before reads used for idempotency and before its transaction.
- Exact semantic replay treats lowercase and uppercase forms of the same country code identically.
- Repeated Inquiries with the same normalized email create immutable per-Inquiry submitted snapshots and do not overwrite the first Contact master name, country, or WhatsApp.
- Outbox and email use validated uppercase code values only; analytics receives no new property or PII.
- The native image input, Upload Intent flow, private Asset relationship, quarantine/scan controls, expiring access, attachment replay, and Audit semantics are unchanged.
- No full country names are converted or persisted. A full name is rejected rather than truncated into a coincidentally valid code.
- The official Logo SVG bytes, dimensions, ratio, colors, and whitespace were not edited.

## Complexity report

- Added table/state/Worker/Lease/Recovery/queue/outbox: none. The existing outbox was not changed structurally.
- Added dependency: none.
- Persistent coordination complexity: unchanged.
- Local code volume: increased to carry the complete dependency-free ISO authority, accessible UI state, and executable evidence.
- Old mechanisms replaced: generic country normalization in the Inquiry Domain Service; visible native chooser chrome; three-way desktop Header spacing; visible Header Home entries.
- Duplicate authority: none. API, UI, Domain Service, and outbox reuse the same country module.
- Dual path: none. There is one real file input and one country-code authority.
- State transitions: no business or upload state transition changed. File-selection state is a direct UI projection of the current FileList.

The local increase is bounded to the requested usability/data-integrity surface and does not add persistent runtime coordination or architecture.

## Files in code commit

### Production code

- `src/public-site/shell.tsx`
- `src/app/globals.css`
- `src/public-site/inquiry-form.tsx`
- `src/crm/country-codes.ts`
- `src/app/api/inquiries/route.ts`
- `src/crm/inquiry-service.ts`
- `src/integrations/notification-outbox.ts`

### Tests

- `src/crm/country-codes.test.ts`
- `src/app/api/inquiries/route.test.ts`
- `src/crm/inquiry-service.integration.test.ts`
- `src/public-site/inquiry-form.test.tsx`
- `src/public-site/brand-visual-contract.test.tsx`
- `tests/e2e/public.spec.ts`

## Verification evidence

Environment diagnosis:

- Node `v24.14.0`
- architecture `arm64`
- pnpm `11.9.0`
- Sharp `0.35.3`: OK
- Lightning CSS: OK
- Next SWC darwin-arm64: OK

Static and unit/integration gates:

- Focused country/API/Service/form/Header suites: 5 files, 35 tests passed.
- Inquiry/CRM/Upload-related suites: 20 files, 100 tests passed.
- Final full Vitest at the final code state: 96 files, 403 tests passed; one worker; no skip/only/retry.
- Strict TypeScript: passed.
- ESLint with `--max-warnings=0`: passed with zero warnings.
- `git diff --check`: passed.
- Added-line scan found no `skip`, `only`, retry configuration, type suppression, lint suppression, or TODO shortcut.

Isolated production build:

- Task-owned root: `/private/tmp/cwt-header-inquiry-build.aj28EV`
- `APP_ENV=test`
- `NON_PRODUCTION_NOINDEX=true`
- isolated PGlite plus Public/Private/Import storage roots
- `FEATURE_PRODUCT_IMPORT=false`
- Migration, core synthetic seed, and conspicuously synthetic fixture seed: passed.
- Fresh Next.js `16.2.12` production build: passed; 43 static-generation units.
- Public bundle boundary: passed across 23 public page manifests and 31 manifest/chunk files.

Browser gate:

- Command: Playwright with `CI=1` and `--retries=0`.
- Final result: 52/52 passed across Desktop Chromium and Pixel 7 projects.
- The existing E2E harness explicitly enables Product Import only for its dedicated Product Import tests; the default-off isolated build above remained OFF.
- Header coverage: desktop/mobile no visible Home, Logo-to-`/`, desktop/mobile focus order, resource menu keyboard access, exact 32px gap at 1024px and 1440px, and no Header or page horizontal overflow across fixed responsive widths.
- Country coverage: `China (CN)` code-valued option, `maxLength=2`, full-name client rejection, lowercase normalization, and submitted JSON containing only `CN`.
- File coverage: native locale control visually hidden, English button/status, one/multiple/reselected FileList status, real private image submission, admin private attachment access path, and frozen retry without another upload.
- Inquiry/CRM/upload and existing full browser regression coverage passed without weakening assertions.

The first full zero-retry browser run produced 51/52 because a new evidence assertion required the clipped one-pixel input box to measure at most exactly one CSS pixel. The implementation was strengthened with explicit `opacity: 0` and `pointer-events: none`, the evidence was changed to assert the actual visibility contract rather than a subpixel box threshold, the failed scenario passed 1/1, and the complete fresh zero-retry suite then passed 52/52. No Playwright retry mechanism was used.

## External validation and exclusions

No new external validation item was created. Existing Production PostgreSQL, R2/S3, SMTP, multi-instance rate limiting, production deployment/cache/DNS/traffic, and formal data/media validation remain outside this local Candidate and retain their prior External Validation Required status.

No Tag, Push, Deploy, production credentials, production data, or irreversible external action occurred.

## Handoff

The intended linear Candidate is:

1. `4a3f2835d0d39c026b3dd4fdb4d15fb83100438c` — frozen baseline
2. `e111ee0d500044da99f6f934ee1ace569118d1a8` — code and tests
3. report-only commit — this document

The next step is a fresh independent review against the final report commit.
