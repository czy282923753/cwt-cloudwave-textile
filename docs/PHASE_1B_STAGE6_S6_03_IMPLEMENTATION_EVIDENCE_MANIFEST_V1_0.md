# CWT Phase 1B Stage 6 S6-03 Implementation Evidence Manifest V1.0

Status: **LOCAL EVIDENCE CANDIDATE — independent implementation/security review required**

Date: **2026-08-30**

Principal report: `docs/PHASE_1B_STAGE6_S6_03_IMPLEMENTATION_REPORT_V1_0.md`

## 1. Review subject and claim ceiling

The implementation review subject is:

- S6-03 implementation commit `112d28d44799d50b64416e26ff81360e7f04c9ef`; and
- the docs-only evidence closure containing this manifest, the principal report and adjacent SHA-256 sidecars.

The evidence is Local and Synthetic. It does not approve the implementation, authorize S6-04, deploy, contact a Provider, use a credential or formal file, mutate a protected environment, prove external O/X rows, or authorize Stage 7.

## 2. Exact lineage

```text
18aea0acd03e460b56d6dc0499258b7081cb1231  S6-02A
└── 882e3eb8dbf4580e8319a122d8879bfe503ac35d  accepted GATE-01/S6-02A implementation Candidate
    └── 112d28d44799d50b64416e26ff81360e7f04c9ef  S6-03 implementation
        └── docs-only evidence closure (branch HEAD)
```

| Commit | Tree | Exact scope |
| --- | --- | --- |
| `882e3eb8dbf4580e8319a122d8879bfe503ac35d` | `34579bc7d8227c85887f6aa7fc7bed55dcb30ca2` | accepted predecessor |
| `112d28d44799d50b64416e26ff81360e7f04c9ef` | `bc8d881aa4087e961aa42688d2554a67fa23f88e` | 22 code/test/config/script paths; 866 insertions, 82 deletions |

Review-only commit `2aef4dd64d6143b6656b2f9365a71df33ec59d1e` is not an ancestor.

## 3. Exact changed-file inventory

```text
M scripts/check-public-bundle.mjs
M scripts/rescan-legacy-assets.ts
M scripts/seed-e2e-block-projection.ts
M scripts/seed-e2e-retryable-asset.ts
M scripts/seed-fixtures.ts
M src/app/api/admin/upload-intents/[token]/route.test.ts
M src/app/api/admin/upload-intents/[token]/route.ts
M src/app/api/upload-intents/[token]/route.ts
M src/config/env.test.ts
M src/config/env.ts
A src/imports/archive-stream-limits.test.ts
M src/imports/archive-upload.integration.test.ts
M src/imports/archive.ts
A src/integrations/malware/cloudmersive-file-scanner.test.ts
A src/integrations/malware/cloudmersive-file-scanner.ts
M src/public-site/public-bundle-check.test.ts
M src/uploads/admin-upload-service.ts
A src/uploads/scanner-factory.test.ts
A src/uploads/scanner-factory.ts
M src/uploads/scanner.ts
M src/uploads/service.integration.test.ts
M src/uploads/service.ts
```

There is no changed path under Schema/Migration, `package.json` or `pnpm-lock.yaml`.

## 4. Principal implementation identities

| Path | SHA-256 at `112d28d4...` |
| --- | --- |
| `src/integrations/malware/cloudmersive-file-scanner.ts` | `2f53f4953f1b23304730d49e59ea78fcddcc0ccb5b4914e92945ed7502e62c69` |
| `src/integrations/malware/cloudmersive-file-scanner.test.ts` | `55779b7b6b1286d99c35634fe8fdb0dc8f517897fef722afa71ee989b265d6ad` |
| `src/uploads/scanner.ts` | `3af62f4c47f5225741811f77fb3bc2110bd708d8bd8688c1ea424478f7d3d440` |
| `src/uploads/scanner-factory.ts` | `5e0cc418c2eaf2bee52abd9fd218f8b8f3002ba34c9dd0259bd2638615d0598f` |
| `src/uploads/service.ts` | `92d8549cad90ee04ac035c9d0db121259dadbc3dba7b08ee230bb4d1700f2cf3` |
| `src/imports/archive.ts` | `ae5d0dbce608ac4d55c041f6e771b6ad7319b88954ac0378816714806e56bd6c` |
| `src/uploads/admin-upload-service.ts` | `020ab75ba4f731520dbe2a5a2db427299a2c5572f6f182dafa84bd6bd0df8228` |
| `scripts/check-public-bundle.mjs` | `634638da29368941ff6f3f9a5c01e890ca2337ad082b70f650b26f36260b16db` |
| `src/public-site/public-bundle-check.test.ts` | `c44ae89dd13f84b610f91ed327d1798a27eda246d457fcee33718344ec7d327f` |
| `src/imports/archive-stream-limits.test.ts` | `8509cc8d49f7938e39308d2b0af4617924f2f24b7232b05c217f399be1c9eacc` |
| `src/uploads/scanner-factory.test.ts` | `0e1a2f474ff3933d249cf83d0def12dbc3bd616e5687c40f875a87f5ad07c987` |

## 5. Decisive gate ledger

| Evidence | Exact result |
| --- | --- |
| Adapter contract | PASS; clean, malware, contradictions, invalid virus elements/JSON/schema, 401/403/413/429/5xx, redirect, DNS/connect/abort and hard timeout |
| Request/privacy | PASS; fixed path/header/multipart, one call, sanitized bounded filename, no manual multipart content type, no payload/key/error-body logging |
| Concurrency/retry | PASS; maximum active Provider call 1; no hidden retry |
| File boundaries | PASS; 10/12/20 MiB exact adapter units; over-20 MiB rejected before transport |
| Archive boundary | PASS; exact 500 MiB counter accepted, next byte rejected without allocating an archive; tee'd stream; serial one persisted member scan; no second whole-archive buffer |
| Fail closed/release | PASS; unavailable remains quarantined with safe evidence; no public release; all member scans persist before archive Finalize |
| Protected composition | PASS; Cloudmersive only in Production/Staging; Development only in Local/Test; no fallback |
| Checker unit coverage | PASS; co-location, each missing marker, split chunks, ineligible/manifests/source-map/public denial and every real public forbidden marker |
| Focused final suite | PASS; 12 files, 260 tests |
| Full final suite | PASS; 153 files passed, 11 skipped; 1,196 passed, 85 skipped; zero failures/unhandled errors |
| Lint / TypeScript | PASS / PASS |
| AI Prompt governance | PASS; 24 tests |
| Exact final AI gate | PASS; accepted absolute current-worktree pinned `node_modules`; `ok: true`; head `112d28d4...` |
| Fresh build harness | PASS; new disposable migrated PGlite, ambient database variables unset, one exact data path, Next 16.2.12 Turbopack, 44/44 pages |
| Fresh public bundle | PASS; immediate against fresh output; 392 eligible server JS; 20 public manifests; 15 distinct client chunks |
| Independent artifact scan | PASS; four real Scanner markers co-located; synthetic marker absent; zero forbidden marker in static client chunks |
| Retirement/dependency | PASS; no `HttpFileScanner`, endpoint/token/http authority, SDK, package/lock delta, second Scanner or Provider domain |
| Schema/Migration | PASS; no delta |
| `git diff --check` | PASS before implementation commit and at committed code state |
| Cleanup | PASS; exact disposable PGlite/build-attempt roots validated and removed; fresh final `.next` remains ignored local evidence only |

Sanitized exact gate forms:

```text
APP_ENV=local DATABASE_DRIVER=pglite PGLITE_DATA_DIR='<new-disposable-root>/build-db' DATABASE_URL=<unset> DATABASE_URL_FILE=<unset> pnpm db:migrate
APP_ENV=local DATABASE_DRIVER=pglite PGLITE_DATA_DIR='<same-new-disposable-root>/build-db' DATABASE_URL=<unset> DATABASE_URL_FILE=<unset> pnpm build
pnpm check:bundle
CWT_INSTALLED_NODE_MODULES='<absolute-current-worktree>/node_modules' pnpm check:ai-architecture
```

No machine-specific path, database, credential or Provider response is committed.

## 6. Failure-history integrity

Independent review must preserve the complete chronology:

1. ambient PostgreSQL build failed `42P01` at `/about` because the selected unverified database lacked an existing relation;
2. migrated disposable-PGlite build passed 44/44;
3. the first bundle proof failed only on a tree-shaken unused synthetic marker;
4. deletion-based real-runtime co-location proof replaced that defective evidence and fresh bundle passed;
5. direct AI gate without its required dependency locator failed closed; and
6. the accepted absolute current-worktree pinned dependency locator passed unchanged before and at the implementation commit.

No Candidate behavior, assertion, hash, allowlist, threshold or negative was weakened to obtain a PASS.

## 7. Independent review anchors

Suggested immutable checks:

```text
git show --format='%H %T %P' --no-patch 112d28d44799d50b64416e26ff81360e7f04c9ef
git diff-tree --no-commit-id --name-status -r 112d28d44799d50b64416e26ff81360e7f04c9ef
git diff --name-only 882e3eb8dbf4580e8319a122d8879bfe503ac35d..112d28d44799d50b64416e26ff81360e7f04c9ef -- src/db drizzle migrations package.json pnpm-lock.yaml
git grep -n -E 'HttpFileScanner|FILE_SCAN_ENDPOINT|FILE_SCAN_TOKEN|CWT_SERVER_CLOUDMERSIVE_SCANNER_BOUNDARY' 112d28d44799d50b64416e26ff81360e7f04c9ef -- ':!docs/**' ':!**/*.test.ts'
git merge-base --is-ancestor 2aef4dd64d6143b6656b2f9365a71df33ec59d1e 112d28d44799d50b64416e26ff81360e7f04c9ef
```

Expected: exact commit/tree/parent above; 22 listed paths; no Schema/Migration/package/lock path; no retired/synthetic authority; and review-only ancestry check exits nonzero.

## 8. Residuals and next gate

Open blocker or Owner decision: **none identified by the Implementer**.

External Cloudmersive/tier/region/account/key/legal/retention behavior, target-host, protected Staging, Production and O/X external proof remain deliberately unclaimed. Basic/North America is only a future Stage 7 activation target; Free remains evaluation-only. S6-04 was not started and Stage 7 remains HOLD.

Next gate: **separate independent S6-03 implementation/security Review of exact implementation commit `112d28d4...` and this docs-only evidence closure.**
