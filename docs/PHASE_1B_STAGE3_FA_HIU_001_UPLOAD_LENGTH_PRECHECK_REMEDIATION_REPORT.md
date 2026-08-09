# Phase 1B Stage 3 FA-HIU-001 Upload Length Precheck Remediation Report

## 1. Developer conclusion and delivery boundary

The Developer remediation Candidate for Finding `FA-HIU-001` has been formed from the fixed entering Candidate. Local Developer evidence is green for the corrected Admin binary-upload request boundary.

This report does **not** close the Finding and does not declare Independent Review Passed, Fresh Acceptance Passed, Accepted, Frozen, Production Ready, Tag, Push or Deploy. A new independent review and a new Fresh Acceptance run remain Owner-controlled next roles.

## 2. Fixed identity

- Entering Candidate: `9070906a48bef469abf7f598c22e6875969ee067`
- Entering parent chain: `4a3f2835d0d39c026b3dd4fdb4d15fb83100438c -> e111ee0d500044da99f6f934ee1ace569118d1a8 -> 9070906a48bef469abf7f598c22e6875969ee067`
- Developer branch: `codex/fa-hiu-001-upload-length-precheck`
- Commit A, implementation and tests: `cc66fe183e2f0024077e333c5427162ff4b0a02c` (`fix: precheck admin upload request length`)
- Fixed implementation ref: `codex/header-inquiry-usability-remediation` remained at exact `9070906a48bef469abf7f598c22e6875969ee067` and was not moved, attached or rewritten by this task.
- Fresh finding report SHA-256 entering identity: `936dd4c25a515e9a4d8baf3f10217378241d83125803b0c3e0bc6501fc79a4e7`

The Developer worktree started clean and detached at the exact entering Candidate. The remediation branch did not exist before creation. No Git lock was present.

## 3. Governance and scope

The root `AGENTS.md`, `docs/ENGINEERING_GOVERNANCE.md`, `docs/ASSET_AND_UPLOADS.md`, `docs/TESTING_AND_ACCEPTANCE.md` and `docs/REVIEW_POLICY.md` were read before implementation.

The correction is limited to the existing Admin Upload Intent binary route and its retained route test. There is no Schema, Migration, dependency, URL, SEO, Inquiry, Version B UI, country, navigation or chooser-contract change. Product Import remains default OFF outside its established dedicated test environment. No Production/Staging credential, database, bucket or formal Product data was used.

## 4. Root cause

Before the governed Product Import pipeline, the Admin binary route applied `assertRequestLength(request, env.MAX_PUBLIC_FILE_BYTES)` immediately after the same-origin check and before authentication.

Commit `82c32b1f42016eaa228eec1fee0e7cfa71a9df00` added the isolated Import archive path, whose accepted ZIP ceiling is 500 MiB. That change removed the pre-authentication `MAX_PUBLIC_FILE_BYTES` guard so a valid Import ZIP could exceed the ordinary public-file limit. It replaced only the later authorized check with an Intent-specific exact check. The replacement accidentally removed the route-wide header ceiling instead of replacing it with a ceiling covering every legal Admin binary upload.

The resulting order was:

1. same-origin check;
2. authentication and permission resolution;
3. token parameter resolution;
4. database and Upload Intent inspection;
5. Intent-exact `Content-Length` check;
6. MIME and body/stream processing.

An obviously oversized declared request could therefore enter authentication and database work. In the retained Fresh test, `cookies()` had no request scope and failed before the length guard; the generic Admin error converter returned HTTP 500 instead of the required stable validation 400.

## 5. Corrected responsibility boundary

The route now derives one unconditional Admin binary-upload ceiling from the existing authoritative limits:

```ts
Math.max(env.MAX_PUBLIC_FILE_BYTES, PRODUCT_IMPORT_LIMITS.archiveBytes)
```

It applies the existing `assertRequestLength` mechanism immediately after same-origin validation and before authentication, parameter resolution, database access, Upload Intent state inspection or request-stream consumption.

The resulting single path is:

1. same-origin check;
2. route-wide header-only ceiling across ordinary Admin files and the existing 500 MiB Import ZIP contract;
3. authentication and `assets.write` authorization;
4. authorized, User/Auth-Session-bound Upload Intent inspection;
5. Intent-exact `Content-Length` validation;
6. declared MIME validation;
7. actual streamed-byte enforcement;
8. the existing validation, scan, staging, Recovery, Cleanup and Finalize behavior.

These checks are not duplicate authorities:

- the first check rejects a header that exceeds every legal Admin binary upload without consulting a user, token or record;
- the second check enforces the already-authorized Intent's exact declared size;
- the stream boundary treats the header as untrusted and enforces actual bytes.

Missing `Content-Length` remains allowed and bounded by actual streamed bytes. A forged exact header cannot bypass the stream limit. Ordinary Admin uploads still use `readRequestBodyWithLimit`; Import archives still use the existing bounded `putStream`/digest path. MIME/signature/decode/scan behavior and Public/Private/Import storage isolation are unchanged.

## 6. Files and executable coverage

### Implementation

- `src/app/api/admin/upload-intents/[token]/route.ts`
  - imports the existing ordinary-file and Import archive limits;
  - derives the legal route-wide maximum;
  - restores the header-only guard before authentication and database work.

### Tests

- `src/app/api/admin/upload-intents/[token]/route.test.ts`
  - rejects a route-wide oversized header before authentication, Intent lookup, completion, `arrayBuffer`, `formData` or `ReadableStream.getReader`;
  - rejects an invalid `Content-Length` at the same pre-authentication boundary;
  - verifies a stable HTTP 400 `VALIDATION_ERROR` without token, User ID or Auth Session ID disclosure;
  - preserves authentication, actor binding, Intent lookup and ordinary successful completion;
  - rejects an Intent-exact header mismatch before body consumption;
  - accepts missing `Content-Length` for an exactly bounded chunked body;
  - rejects actual streamed-byte overflow with both missing and forged-exact headers;
  - preserves the existing Import archive ceiling above the ordinary public-file limit;
  - preserves authentication 403 and invalid/expired/used Intent 400 behavior without completion.

The shared request guard and Upload Domain Services were not duplicated or changed. Their existing focused and full suites remain the downstream executable evidence for byte limits, type/signature validation, scanning, Session/Intent state, Saga recovery, storage isolation and Finalize.

## 7. Verification evidence

### Runtime and dependency identity

- Node: `v24.14.0`, macOS `arm64`
- pnpm: `11.9.0`
- Sharp: `0.35.3`, loaded successfully
- Lightning CSS: loaded successfully
- Next SWC `darwin-arm64`: loaded successfully
- Frozen install: 526 packages from the unchanged lockfile
- `package.json` SHA-256 before and after: `31e8a1698e6abe68e0f78d2118448ef8bdede0e98df9460764e791302e2c2379`
- `pnpm-lock.yaml` SHA-256 before and after: `3ed14b1c3dbafa98fa9034259a4f8a288d7333ed8dedc4a2b7e5a3de7ddec0bb`

The final dependency evidence used the task-owned store `/private/tmp/cwt-fa-hiu-001-dev.eADCm7/pnpm-store/v11`, task-owned cache/temp roots, and exact package/lock identity.

### Focused upload safety

- Route plus shared request guard: `2/2` files and `15/15` tests passed.
- Expanded upload matrix: `6/6` files and `39/39` tests passed.
- The expanded matrix included the route, request guard, Admin Upload Service, Import archive upload, Upload Saga Recovery and Admin Finalize public Variant suites.

### Static and full unit/integration gates

- `pnpm env:check`: passed.
- `pnpm env:diagnose`: passed.
- `pnpm lint`: passed with zero warnings.
- `pnpm typecheck`: strict TypeScript passed.
- `pnpm exec drizzle-kit check`: passed.
- Isolated Drizzle no-delta generate: `58 tables`; `No schema changes, nothing to migrate`.
- `pnpm test:run`: `96/96` files and `411/411` tests passed in `270.46s`, one worker, no retry.
- `git diff --check`: passed.
- Added-line shortcut scan found no skip/only/retry setting, TypeScript suppression, ESLint suppression, `any` shortcut or TODO gate bypass.

### Fresh database and build

A task-owned PGlite database and separate Public, Private and Import storage roots used `APP_ENV=test`, `NON_PRODUCTION_NOINDEX=true` and `FEATURE_PRODUCT_IMPORT=false`.

- Fresh migrations `0000 -> 0019`: passed.
- Migration repeat/no-op: passed.
- Core synthetic seed and repeat: passed with the same Admin User identity.
- Conspicuously synthetic fixture seed and repeat: first created 12 Products; repeat created 0.
- `pnpm db:verify`: passed. All reported invalid Product/taxonomy, Inquiry Asset, published Asset/eligibility, Fabric/Content Asset, historical rescan/manual-review and derived indexability counts were 0.
- A separate fresh migrated/seeded PGlite root was used for Production Build.
- Next.js `16.2.12` Production Build: passed; `43/43` static-generation units completed.
- `pnpm check:bundle`: passed across `23` public page manifests and `31` referenced manifest/chunk files.
- `pnpm audit --prod`: `No known vulnerabilities found`.

### Browser and real HTTP upload evidence

- Focused Desktop Chromium upload E2E: `2/2` passed in `38.0s`, retries explicitly 0.
  - Asset Library authenticated binary Intent upload.
  - Product Import real Upload Saga.
- Full Playwright: `52/52` passed in `2.1m` across Desktop Chromium and Pixel 7, retries explicitly 0.
- The full run retained Asset Library upload and interrupted-Batch retry, Inquiry private attachment and replay, Product Import workbook/folder/ZIP/lost-response recovery, permission boundaries, Finalize media, responsive/accessibility, publishing/301 and CRM regression coverage.
- TCP port `3100` had no listener after Playwright teardown.

Playwright emitted only the established `NO_COLOR`/`FORCE_COLOR` harness warning.

## 8. Dependency-store observation

The initial task-owned frozen install used the isolated store. When the focused Playwright command started, the local `pnpm exec` wrapper automatically recreated `node_modules` against the workstation pnpm store because the command-level store configuration had not propagated to its child `pnpm` commands. It reused all 526 packages, downloaded none, retained the exact package/lock hashes, and the focused E2E passed. That run was retained as an environment observation rather than treated as the final isolated dependency proof.

Before the full browser gate, the generated dependency tree was moved intact to the task-owned temporary root. A new frozen install recreated `node_modules` from the task-owned store, reusing all 526 packages with zero downloads. `node_modules/.modules.yaml` was verified to identify `/private/tmp/cwt-fa-hiu-001-dev.eADCm7/pnpm-store/v11`. The full `52/52` zero-retry Playwright evidence then ran with the task-owned store propagated to child commands. Package/lock hashes, native-module diagnosis, Git source and test definitions remained unchanged.

## 9. Complexity report

- Added table, field, enum, state, Worker, Lease, Recovery type, queue or persistent coordination: none.
- Added dependency or upload entry point: none.
- Old mechanism replaced: the accidentally missing route-wide ceiling is restored using the existing request guard and existing limit authorities.
- Duplicate body parsing or buffering path: none.
- Old/new dual path: none.
- State transition change: none.
- Total persistent and operational complexity: unchanged.
- Local code complexity: a single derived ceiling and one guard call were added; test coverage increased to make the three distinct length responsibilities executable.

## 10. External validation and exclusions

No new External Validation item was created. Existing real PostgreSQL locking/isolation, R2/S3 provider streaming and consistency, multi-instance rate limiting, Production deployment/cache/DNS/traffic and formal Product/media validation remain outside this local Developer task.

Real product launch remains `Waiting for Real Product Data Validation`.

No Tag, Push, Deploy, Production/Staging action, formal data import or irreversible external action occurred.

## 11. Handoff

The intended Developer chain is:

1. `9070906a48bef469abf7f598c22e6875969ee067` — fixed entering Candidate;
2. `cc66fe183e2f0024077e333c5427162ff4b0a02c` — implementation and tests;
3. one report-only commit containing this report.

The branch is ready only for Owner-directed independent review. The Developer does not close `FA-HIU-001` or start a Reviewer/Fresh Acceptance role.
