# CWT Phase 1B Stage 6 S6-03 Implementation Report V1.0

Status: **LOCAL IMPLEMENTATION CANDIDATE — independent implementation/security review required**

Date: **2026-08-30**

Authority boundary: **S6-03 only. S6-04 and Stage 7 were not entered. No self-approval is claimed.**

## 1. Outcome and exact Candidate

S6-03 is implemented as one code/test checkpoint with a separate docs-only evidence closure:

| Checkpoint | Commit | Tree | Sole parent |
| --- | --- | --- | --- |
| Accepted GATE-01/S6-02A implementation | `882e3eb8dbf4580e8319a122d8879bfe503ac35d` | `34579bc7d8227c85887f6aa7fc7bed55dcb30ca2` | `18aea0acd03e460b56d6dc0499258b7081cb1231` |
| S6-03 implementation | `112d28d44799d50b64416e26ff81360e7f04c9ef` | `bc8d881aa4087e961aa42688d2554a67fa23f88e` | `882e3eb8dbf4580e8319a122d8879bfe503ac35d` |
| S6-03 evidence closure | branch HEAD | docs-only tree | `112d28d44799d50b64416e26ff81360e7f04c9ef` |

Branch: `codex/phase-1b-stage6-implementation-v1`.

The accepted independent GATE-01/S6-02 review commit `2aef4dd64d6143b6656b2f9365a71df33ec59d1e` is a sibling authority record and is not an ancestor of this Candidate.

## 2. Implemented contract

### 2.1 One provider-neutral Scanner authority

- `src/uploads/scanner.ts` remains the application-owned `FileScanner`/`ScanResult` contract.
- `ScannerUnavailableError` is the typed provider-neutral unavailable outcome. It carries only a safe provider and reference.
- `src/uploads/scanner-factory.ts` is the single composition authority. Production and Staging require Cloudmersive; Local and Test permit only `DevelopmentFileScanner`.
- The old `HttpFileScanner`, generic endpoint/token protocol, `http` driver and protected development fallback were deleted.
- All runtime callers now import `createFileScanner` from the one factory. No second Scanner, shadow-send, voting path or automatic Provider retry exists.

### 2.2 Exact Cloudmersive adapter

`src/integrations/malware/cloudmersive-file-scanner.ts` is the sole Cloudmersive adapter.

- Platform `fetch`, `FormData` and `Blob` are used; no SDK or second transport dependency was added.
- Configuration supplies one validated credential-free HTTPS origin. Code owns the fixed `/virus/scan/file` path.
- The request is one `POST`, `redirect: "manual"`, one `inputFile` multipart part and one `Apikey` header. Multipart `Content-Type` is left to the platform.
- Filename transmission is sanitized to a bounded ASCII-safe basename; storage keys, customer identifiers and public URLs are not adapter inputs.
- One reviewed 60,000 ms hard abort covers the request/body operation. There is no adapter retry.
- In-process Provider concurrency is serialized to one without a queue table, lease or other persistent coordination.
- Adapter input is defense-in-depth bounded to one non-empty `Uint8Array` of at most 20 MiB.
- Response JSON is bounded to 64 KiB and decoded strictly. Clean requires HTTP 200, an object, `CleanResult === true`, and absent or empty valid `FoundViruses`.
- A valid `CleanResult === false` plus a non-empty valid virus array maps to the safe malware result. Contradiction, invalid element/schema/JSON, redirect, 401/403/413/429/5xx, DNS/connect/timeout/abort and oversized response all map to typed unavailable.
- Only `cloudmersive:clean`, `cloudmersive:malware-detected`, or `cloudmersive:unavailable` can cross the adapter boundary. Raw Provider bodies and virus details do not.

### 2.3 Fail-closed persistence and recovery

- Ordinary Upload stores bytes only in private quarantine before scanning. Typed unavailable persists only safe provider/reference data and leaves the Asset quarantined with `scanStatus: error`; no public write occurs.
- Malware remains rejected. Clean remains the only path to a persisted passed scan and later release.
- Admin Upload, Recovery and Cleanup retain their existing durable/idempotent ownership. An unavailable request is not replayed inside the adapter; a later operator/recovery request is fresh.
- Readiness and health do not call Cloudmersive or consume quota.

### 2.4 File and archive boundaries

The accepted boundaries remain unchanged:

| Boundary | Limit |
| --- | --- |
| Public / Inquiry file | 12 MiB (`12,582,912` bytes) |
| Import workbook | 10 MiB |
| Import image/member | 20 MiB |
| Compressed Import archive flow | 500 MiB |

The compressed archive is still tee'd and streamed to isolated Import storage while inspected. The stream now enforces its actual compressed-byte ceiling. Extracted members are staged to disposable files and processed serially through `completeAdminUploadIntent`, which performs the one persisted member scan. The prior duplicate pre-scan was deleted. Every member must complete its persisted scan before the first Finalize begins, so malware in a later member releases no earlier member. The adapter never receives or retains a second whole 500 MiB archive buffer.

Cloudmersive Free is not a Production/Staging configuration. No file limit was reduced to match Free. Basic/North America remains only a future Stage 7 activation target subject to fresh external, legal, commercial and operational authorization.

### 2.5 Public bundle evidence

The existing public-bundle checker was extended, not replaced.

- Positive server proof requires `/virus/scan/file`, `CleanResult`, `FoundViruses` and `Apikey` to coexist in one eligible executable server runtime JavaScript file.
- Markers split across eligible files, or present only in source maps, server-reference/client-reference manifests, ineligible output or public chunks, cannot satisfy the proof.
- Public/client output rejects the fixed path, response/request field identifiers, `FILE_SCAN_API_KEY`, adapter module name and class name.
- An initial exported synthetic marker was removed because Turbopack correctly tree-shook it. No runtime side effect, log, no-op reference, plugin, copied artifact or artificial marker was introduced to retain it.

## 3. Verification ledger

### 3.1 Decisive final gates

| Gate | Exact result |
| --- | --- |
| Cloudmersive adapter + checker focused unit set | PASS; 2 files, 182 tests |
| Affected Upload/Admin/Import/Recovery/Cleanup/Asset/bundle/config set | PASS; 12 files, 260 tests |
| Final `pnpm test:run` | PASS; 153 files passed, 11 skipped; 1,196 tests passed, 85 skipped; exit 0; zero assertion failure/unhandled error |
| `pnpm typecheck` | PASS, exit 0 |
| `pnpm lint` | PASS, exit 0, zero warnings |
| AI Prompt governance | PASS; 24 tests |
| Direct AI architecture gate before commit | PASS; `ok: true` using absolute current-worktree pinned `node_modules` |
| Direct AI architecture gate at implementation commit | PASS; `ok: true`; exact head `112d28d44799d50b64416e26ff81360e7f04c9ef` |
| Disposable PGlite migration | PASS, exit 0 |
| Fresh default Next build | PASS; Next 16.2.12 Turbopack; compile and TypeScript pass; 44/44 static pages |
| Immediate fresh `check:bundle` | PASS; 392 eligible server runtime JS files; 20 public manifests; 7 root chunks; 8 manifest chunks; 15 distinct chunks |
| Independent server artifact inspection | PASS; four real markers co-located in two eligible server chunks; synthetic marker absent |
| Public/static artifact inspection | PASS; zero Scanner forbidden marker in `.next/static/chunks` |
| Schema/Migration no-delta | PASS |
| Package/lock no-delta | PASS; no Cloudmersive SDK |
| Retirement/Provider-type/secret/no-egress searches | PASS |
| `git diff --check` | PASS |

The build harness used one newly created disposable PGlite root, explicit `APP_ENV=local`, `DATABASE_DRIVER=pglite`, the same unique `PGLITE_DATA_DIR` for migration and build, and unset ambient `DATABASE_URL`/`DATABASE_URL_FILE`. The exact machine path and database were not committed. The disposable root was validated and removed after evidence.

No test contacted `api.cloudmersive.com` or another Provider domain. Adapter tests supplied deterministic local fake transport only. No account, key, purchase, terms acceptance, real/Synthetic file transmission to a Provider, protected Staging/Production/DNS mutation or external action occurred.

### 3.2 Transparent failed-attempt chronology

No failed attempt was erased or relabelled:

1. The first fresh build compiled and typechecked, then failed `/about` prerender with PostgreSQL `42P01` because the ambient selected database lacked the already-owned `system_settings` relation.
2. Coordinator diagnosis established a harness prerequisite, not a product Schema/Migration defect. A fresh disposable PGlite path was migrated and the exact same path produced a 44/44 build PASS.
3. The first immediate bundle check then failed because an exported-but-unused synthetic Scanner marker was tree-shaken, even though the real runtime contract strings were present.
4. The synthetic marker was deleted and the existing checker was corrected to require four real markers co-located in one eligible server runtime file. Fresh build and bundle then passed.
5. A direct AI architecture invocation without `CWT_INSTALLED_NODE_MODULES` failed closed on its intentional dependency-locator prerequisite.
6. The accepted invocation supplied the absolute current-worktree pinned `node_modules`; it passed before commit and again at exact implementation commit `112d28d4...` without changing gate behavior.

## 4. Security & Test Simplification Check

Implementation self-check result: **PASS for review submission; not independent approval.**

- **Root Cause First:** generic Scanner ambiguity and synthetic bundle evidence were removed at their ownership boundaries.
- **Simplification First:** the generic HTTP adapter/protocol and duplicate archive member scan were deleted; platform transport and the existing checker were reused.
- **Replace Not Layer:** protected composition has one Cloudmersive adapter and no fallback, shadow path or second clean authority.
- **Single authority:** one application interface, one composition factory, one Provider adapter and one trusted configuration origin/path contract.
- **No gate weakening:** every non-clean/indeterminate outcome remains fail closed; bundle negatives and exact malformed/outage tests increased.
- **No persistent complexity:** no queue, table, lease, Migration, second database, SDK, build plugin or custom proof framework was added.

## 5. Rollback, residuals and claim ceiling

Rollback is commit-scoped: revert `112d28d44799d50b64416e26ff81360e7f04c9ef` to accepted parent `882e3eb8dbf4580e8319a122d8879bfe503ac35d`. Do not selectively restore `HttpFileScanner`, `FILE_SCAN_ENDPOINT`, `FILE_SCAN_TOKEN`, protected Development fallback, duplicate archive scanning or a second transport.

Open blocking findings identified by the Implementer: **none**.

Residual claim boundaries:

- this is Local/Synthetic compile, contract and artifact evidence only;
- it is not Cloudmersive account/API/tier/region/terms/DPA/subprocessor/retention, target-host, DNS, protected Staging or Production proof;
- O-01 through O-25 and X-05/X-06 remain preparation-only wherever they require external/protected evidence;
- S6-04 was not started and Stage 7 remains HOLD; and
- the mandatory next gate is a separate independent S6-03 implementation/security Review of the exact implementation and docs closure.
