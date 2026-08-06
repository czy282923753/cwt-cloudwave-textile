# CWT Phase 1B Stage 2 SEO Remediation RR1 Correction Report

Status: Developer correction evidence complete; independent re-review required

Date: 2026-08-06 (Asia/Shanghai)

Branch: `codex/phase-1b-stage2-seo-remediation`

Correction start: `c71a73978c7eb5769ea24903fd6c9e4516d173af`

Production Ready: No

Stage 3: Planned / Deferred — not authorized

## 1. Authority and prior independent result

This correction is limited to RR-M-01 / SEO-M-07 and RR-L-01 / SEO-M-03 under the Project Owner's controlled-remediation authorization. The independent review of `c71a73978c7eb5769ea24903fd6c9e4516d173af` concluded **Changes Required — not eligible for Fresh Acceptance**. Its disposition was 11 original SEO findings Closed, SEO-M-03 Partially Closed, and SEO-M-07 Regressed, producing Blocker 0 / High 0 / Medium 1 / Low 1.

This report does not erase or replace that failed review. It is developer evidence for a second independent review and does not declare the findings Closed, the review Passed, or this revision Accepted or Frozen.

## 2. Root causes and corrections

### RR-M-01 / SEO-M-07 — canonical Variant identity

Root cause: `createImageDerivatives` produced an extension-free logical key such as `480w-webp`, while normal Admin Finalize derived `asset_variants.variant_key` from the last segment of the storage object key. The stored value therefore became `480w-webp.webp`, which the governed Public Asset Route correctly rejected.

Correction:

- Added one shared logical Variant identity contract in `src/uploads/asset-variant.ts`.
- Derivative generation creates the canonical extension-free logical key through that contract.
- Admin Finalize now carries `logicalKey` and `objectKey` as separate fields. It persists the logical key in `asset_variants.variant_key` and the full path plus extension in `asset_variants.object_key`; it no longer derives identity with `split("/")`.
- Manifest registration, storage writes, evidence verification, recovery, compensation and cleanup continue to use the storage object key.
- Public projection accepts only canonical logical keys. The governed route retains its narrow validation; no extension-bearing compatibility path or second Variant authority was added.

Real Admin chain evidence:

- A real decodable 1200×800 synthetic JPEG passes through the normal Admin Batch, Upload Intent, scanner, Finalize and derivative generator.
- Six rows persist as `480w-webp`, `480w-avif`, `960w-webp`, `960w-avif`, `1600w-webp`, and `1600w-avif`.
- Each object key remains `<original>.variants/<logical-key>.<format>` and exists in Public storage.
- The seven-object Finalize manifest (one original plus six Variants), storage evidence, required Audit, completed recovery, cancelled public compensation jobs and repeat-finalize behavior remain valid.
- The public Product projection emits the logical key in `srcset`; a governed request for `960w-webp` returns HTTP 200, `image/webp`, the governed cache contract, and a decodable 960-pixel image.

### RR-L-01 / SEO-M-03 — governed cache contract

Root cause: successful responses already used the complete cache contract, but business/malformed 404 responses had no explicit policy and operational 503 responses omitted `must-revalidate`.

Correction:

- Added one governed response helper and one exported cache constant in `src/public-site/public-asset-response.ts`.
- Malformed 404, business-ineligible/missing 404, operational 503, original 200 and Variant 200 now all use exactly:

  `Cache-Control: private, no-store, max-age=0, must-revalidate`

- Existing status semantics remain unchanged: malformed or ineligible is 404; database or storage failure is a sanitized 503.
- Error bodies and logs do not disclose object keys, provider URLs, database addresses or storage secrets.

## 3. Modified files

Production implementation:

- `src/uploads/asset-variant.ts`
- `src/uploads/image-derivatives.ts`
- `src/uploads/admin-upload-service.ts`
- `src/public-site/data.ts`
- `src/public-site/public-asset-response.ts`
- `src/app/api/public-assets/[assetId]/route.ts`

Verification only:

- `src/app/api/public-assets/[assetId]/route.test.ts`
- `src/uploads/admin-upload-service.integration.test.ts`
- `src/uploads/admin-finalize-public-variant.integration.test.tsx`
- `scripts/seed-e2e-block-projection.ts`
- `scripts/verify-seo-rr1-postgres.ts`
- `tests/e2e/public.spec.ts`

No Schema, Migration, Snapshot, Journal, package, lockfile, dependency, production configuration or formal data changed.

## 4. Automated and runtime verification

Final quality-gate results:

| Check | Result |
| --- | --- |
| `pnpm env:diagnose` | Passed; Node 24.14.0, pnpm 11.9.0, native toolchain healthy |
| `pnpm env:check` | Passed |
| `pnpm lint` | Passed, zero errors |
| `pnpm typecheck` | Passed |
| `pnpm exec drizzle-kit check` | Passed |
| Relevant correction tests | Passed, 3 files / 13 tests |
| `pnpm test:run` | Passed, 81/81 files and 300/300 tests |
| Production build | Passed, 40/40 generated pages |
| `pnpm check:bundle` | Passed, 23 public manifests / 31 public chunks; no Admin, DB or Private boundary leak |
| `pnpm audit --prod` | Passed; no known production dependency vulnerabilities reported |
| `pnpm exec playwright test --retries=0` | Passed, 40/40 tests, zero retries |
| `git diff --check` | Passed |
| Hygiene scan | No new skip/only/todo, TypeScript suppression, ESLint disable, dangerous explicit `any`, or empty catch |

During focused test construction, an initial six-file run reported 27/28 because the new Product fixture inserted its Primary Taxonomy relation after Product creation, violating the existing transaction boundary. The fixture was corrected to create Product and Primary Taxonomy atomically. The final focused and complete suites above passed without weakening or skipping a test.

The known accepted local-font harness was used for the isolated Production Build because `next/font/google` remains non-hermetic. That pre-existing debt was not modified or represented as resolved.

## 5. PostgreSQL 18.4 evidence

An isolated PostgreSQL 18.4 container was bound to `127.0.0.1:55439` and used only with synthetic data. Results:

- Fresh 0000→0018: Passed.
- Repeat/no-op migration: Passed.
- Migration state: 19 entries, latest 0018.
- Normal Admin Finalize and all six canonical Variant rows: Passed.
- Seven Finalize manifest objects with current storage evidence: Passed.
- Required Audit and recovery/cleanup boundaries: Passed.
- Public projection and governed WebP delivery/decode: Passed.
- Idle in transaction: 0; waiting locks: 0; advisory locks: 0.

The temporary container, database, role, volume and synthetic storage were removed after verification.

## 6. Browser evidence

Playwright and a separate in-app Chromium check used a locally isolated PGlite database and synthetic storage populated through real Admin Finalize.

- Desktop Chromium and Pixel 7 both selected an extension-free governed AVIF/WebP Variant URL.
- The selected network response was HTTP 200 with the corresponding `image/avif` or `image/webp` MIME and exact governed cache header.
- The selected image decoded with `naturalWidth > 0`.
- Exactly one actual Hero used `loading=eager` and `fetchPriority=high`; hidden alternatives were not promoted.
- Existing 320, 375, 390, 768, 1024 and 1440 viewport coverage passed.
- Console errors, page errors and hydration errors: 0.
- Critical horizontal overflow: none observed.

The temporary browser service and all isolated PGlite/storage/font-harness artifacts were stopped and removed.

## 7. Commits and candidate handoff

Linear correction commits after `c71a73978c7eb5769ea24903fd6c9e4516d173af`:

1. `0e9ecb8` — `fix: converge public asset variant and cache contracts`
2. `2460cff` — `test: verify seo remediation review corrections`
3. The final report-only commit is recorded as the branch HEAD in the delivery response and Git history; a commit cannot embed its own cryptographic hash.

Developer disposition only: RR-M-01 addressed; RR-L-01 addressed. Developer self-reported remaining count is Blocker 0 / High 0 / Medium 0 / Low 0, subject to the required second independent review. The original Independent Google SEO Audit task remains the only authority that may close these findings or determine Fresh Acceptance eligibility.

## 8. Frozen identities and scope boundaries

- Stage 2 historical Approved Tag remains `phase-1b-stage2-approved-2026-08-06`; it was not moved, deleted or recreated.
- SQL/Snapshot/Journal remain 19/19/19, latest 0018; 0019 does not exist.
- 0018 SQL SHA-256: `a7583d03b59d5858cb5e2cb2542dbc43bf6c620e2067ed900fe6d0d1d0257148`.
- 0018 Snapshot SHA-256: `faa9a0819303e82d097874c348d6258533a305da30df00da360055b70dac3073`.
- Journal SHA-256: `dfb08dad283762e80db4978c8381f88998cfde276ffb1f39c0f5de6f73e34867`.
- No Tag, Push or Deploy was performed.
- Inquiry contract, unrelated SEO findings, Stage 3, formal data and font debt were not changed.
- Production Ready remains No.
- Formal Product Status remains `Waiting for Real Product Data Validation`.

## 9. Remaining review and external validation

No additional implementation issue is known within the two-item correction scope based on developer verification. Independent Google SEO re-review remains mandatory. Production origin, Cloudflare/CDN behavior, production storage/provider behavior, formal Product and authorized media validation, and target-server operational validation remain external and are not claimed by this report.
