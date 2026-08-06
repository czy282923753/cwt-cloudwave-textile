# CWT Phase 1B Stage 2 H3 Final Narrow Remediation Report

Status: implementation complete; awaiting the original Independent Joint Review thread for targeted H3 review

Date: 2026-08-06

Production Ready: **No**

Formal data status: **Waiting for Real Product Data Validation**

This is developer implementation evidence. It does not independently close H3, pass the Stage 2 review, authorize Fresh Acceptance, accept or freeze Stage 2, or authorize Stage 3.

## 1. Baseline and commit chain

| Item | Value |
|---|---|
| Starting branch | `phase/1b-stage2` |
| Starting HEAD | `4f5db9998a5746b20e6a540741a3e175d6aa8360` |
| Round 2 implementation commit | `9fd989925772ef35ecdadfb23f6f26b7ff63f42f` |
| Round 2 denial follow-up commit | `fd12750e40ed08fd4e43f18decc91626a917bc94` |
| Round 2 report commit / remediation parent | `4f5db9998a5746b20e6a540741a3e175d6aa8360` |
| H3 narrow code/test commit | `3bc1d6be8f98a2e5c44361d772e36eee9918a7c3` — `fix: stabilize asset library authorization denial` |
| Code/test commit direct parent | `4f5db9998a5746b20e6a540741a3e175d6aa8360` |
| Final branch | `phase/1b-stage2` |
| Final implementation HEAD | `3bc1d6be8f98a2e5c44361d772e36eee9918a7c3`, directly before the pure documentation checkpoint containing this report |

The existing linear history was not rebased, squashed, amended or rewritten.

## 2. Exact diff and scope

The code/test checkpoint changes exactly three files, with 192 insertions and 2 deletions:

- `src/app/admin/assets/page.tsx`
- `src/app/admin/assets/page.test.tsx`
- `tests/e2e/public.spec.ts`

The documentation checkpoint adds only:

- `docs/PHASE_1B_STAGE2_H3_FINAL_REMEDIATION_REPORT.md`

No H2, M3, L1, public Route, SEO, Stage 1 frozen feature, production configuration or formal data implementation changed.

## 3. Root cause and corrected boundary

`src/app/admin/assets/page.tsx` called `requireCurrentUser("assets.read")`. For an authenticated Analyst, the shared permission layer correctly threw `AuthorizationError`, but this page did not translate that expected denial into a controlled HTTP response. The exception could therefore escape through server rendering as an unstable server failure before the Asset Library completed its page flow.

The page now uses the same existing Admin mechanisms already used by governed entries:

1. resolve the current authenticated user;
2. redirect an anonymous request to `/operations-login`;
3. check the existing `assets.read` capability;
4. call Next.js `notFound()` for an authenticated user without that capability;
5. only after authorization, derive write access and construct any Asset, Product, Content, Fabric or retryable-upload query.

No role or permission was added or broadened. No exception is globally swallowed, no client-side redirect or `200` empty page was introduced, and navigation hiding is not used as the security boundary.

## 4. Query-before-denial evidence

`src/app/admin/assets/page.test.tsx` invokes the real page entry with controlled dependency probes. For Analyst and Anonymous it asserts that all of the following remain uncalled:

- `listRetryableAdminUploadBatches`;
- `listAdminAssets`;
- `listAdminProducts`;
- `listAdminContents`;
- `listAdminFabricEntries`.

The Analyst path throws only the test representation of controlled `notFound()`; the anonymous path invokes only the existing `/operations-login` redirect. This proves the denial precedes all record reads rather than querying and filtering afterward.

## 5. Role regression matrix

| Actor | `/admin/assets/` | Upload/retry | Association candidates |
|---|---|---|---|
| Admin | `200` | existing write access retained | Product, Content and Fabric within existing policy |
| Product Editor | `200` | existing write access retained | Product and Fabric; Content Draft candidates absent |
| Content Editor | `200` | existing write access retained | Content and Fabric; Product Draft candidates absent |
| Reviewer / Publisher | `200` | existing review-only behavior retained | no upload form exposed |
| Sales | `200` | existing review-only behavior retained | no Product/Content Draft candidates or upload form exposed |
| Analyst | controlled `404` | none | no query, title, status, route, candidate or record existence exposed |
| Anonymous | existing redirect to `/operations-login` | none | no Asset Library data exposed |

The Round 2 resource-scoped Product/Content list predicates remain unchanged. The new functional page test checks their invocation matrix, and the browser test checks the rendered candidate lists for Product Editor, Content Editor and Sales.

## 6. Forced regression evidence

1. **Analyst direct access:** browser response is controlled `404`; no `500`, `AuthorizationError`, permission detail, Asset Library heading, Product fixture or Content fixture is emitted.
2. **Denial before queries:** functional page test records zero Asset, retryable-upload, Product, Content and Fabric query calls for Analyst.
3. **Sales:** page remains `200` and review-only; no Product or Content Draft association candidate is rendered.
4. **Product Editor:** page remains `200`; Product association candidates are present and Content candidates are absent.
5. **Content Editor:** page remains `200`; Content association candidates are present and Product candidates are absent.
6. **Reviewer / Publisher:** page remains `200` with the existing review-only Asset behavior and no upload form.
7. **Admin:** the retained Asset Library open/upload/retry browser tests remain green.
8. **Anonymous:** direct access still reaches `/operations-login` and exposes no Asset Library heading or records.
9. **H3 Round 2:** the retained editorial policy, list-query, Preview, Preview Asset and cross-resource candidate tests remain in the full green suites.
10. **Leakage and errors:** Analyst DOM contains neither Draft metadata nor internal exception/permission details; `pageerror` count is zero.

Chromium records the denied top-level document itself as one network-console message: `Failed to load resource: ... 404 ... /admin/assets/`. The browser test asserts that this exact message is the only error/warning-class console event. Application JavaScript console errors/warnings, unhandled exceptions, page errors and Hydration errors are zero. This is the expected HTTP denial response, not an application exception or secondary missing resource.

## 7. Verification results

| Gate | Result |
|---|---|
| `pnpm env:diagnose` | passed; Node `v24.14.0`, pnpm `11.9.0`, ARM64 native dependencies healthy |
| `pnpm env:check` | passed |
| `pnpm lint` | passed, zero warnings |
| `pnpm typecheck` | passed |
| `pnpm exec drizzle-kit check` | passed |
| Targeted Vitest | 4 files, **16/16 passed** |
| `pnpm test:run` | 73 files, **280/280 passed** |
| Isolated Production Build | passed; fresh `0000→0018`, **40/40 routes** generated; temporary database/storage removed |
| `pnpm check:bundle` | passed; 23 public manifests and 32 manifest/chunk files |
| `pnpm audit --prod` | passed after authorized network retry; **0 known vulnerabilities** |
| Targeted Playwright | **1/1 passed**, 0 retries |
| `pnpm exec playwright test --retries=0` | **36/36 passed**, 0 retries |
| `git diff --check` | passed for the code/test checkpoint |

The first audit attempt was unable to resolve `registry.npmjs.org` inside the restricted sandbox and was not reported as a security result. The approved network-enabled rerun completed successfully. No dependency was changed.

The first isolated Migration command was blocked by sandbox IPC permissions before database execution. The approved rerun used a new `/tmp` PGlite database and synthetic/test storage, applied `0000→0018`, completed the Production Build, and removed the temporary directory. The repository `.data` and all formal data remained untouched.

No separate PostgreSQL container was necessary because this change has no data, query implementation, transaction, locking or Schema behavior. The required query-before-denial evidence is provided by dependency probes before any database call, while the full integration suite and isolated migrated Build cover retained database paths.

## 8. Migration, dependency and tag integrity

Schema/Migration change: **No**.

- SQL files: 19; latest remains `0018_phase1b_editorial_media_foundation.sql`.
- Snapshots: 19; latest remains `0018_snapshot.json`.
- Journal entries: 19; latest remains `0018_phase1b_editorial_media_foundation`.
- `0019` does not exist.
- `0018` SQL SHA-256: `a7583d03b59d5858cb5e2cb2542dbc43bf6c620e2067ed900fe6d0d1d0257148`.
- `0018` Snapshot SHA-256: `faa9a0819303e82d097874c348d6258533a305da30df00da360055b70dac3073`.
- Journal SHA-256: `dfb08dad283762e80db4978c8381f88998cfde276ffb1f39c0f5de6f73e34867`.
- Diff from the Stage 1 freeze for `drizzle/`, `package.json` and `pnpm-lock.yaml`: empty.
- Diff from the Round 2 starting HEAD for `drizzle/`, `src/db/schema.ts`, `package.json`, `pnpm-lock.yaml` and production configuration: empty.
- Stage 1 Approved Tag remains Annotated Tag object `53893bc936a9d2a1a9adfa75e1f27e265431192f`, peeled commit `3c1d057845b415eaac2ee54ca42001b5ce0a3afb`.
- No Stage 2 Tag exists and no existing Tag moved.

## 9. Complexity, remaining risk and stage boundary

The correction adds no authority or persistent mechanism. It replaces one exception escape with the existing controlled page-denial boundary. No table, field, Enum, Migration, Worker, Lease, queue, Revision, Route authority, Asset relation, role system or authorization helper was added. Total runtime complexity stays level.

Remaining review risk is limited to the original reviewer confirming that the controlled `404` is the approved response semantics for this entry and that the focused proof closes the reported H3 remainder. This report does not make that independent determination.

External Validation remains unchanged from the Stage 2 Round 2 report. Formal Product, Company Fact and authorized Media validation remains pending. Production Ready remains **No**.

No Push, deploy, Tag, real credentials, formal data, Fresh Acceptance, Stage 3 or external business-provider connection occurred.

## 10. Handoff

H3 Final Narrow Remediation implementation is complete. Wait for the original Independent Joint Review thread to perform the H3 targeted review.
