# CWT Phase 1B Stage 6 S6-03 F-01 Process-Wide Concurrency Remediation Report V1.1

Status: **LOCAL REMEDIATION CANDIDATE — fresh independent implementation/security review required**

Date: **2026-08-30**

Authority boundary: **S6-03 F-01 remediation only. S6-04 and Stage 7 were not entered. No self-approval is claimed.**

## 1. Outcome and exact Candidate

The accepted independent S6-03 Review at review-only commit `635fc9a2f3330a608468e52668fecb29b686be9f` found one blocker: protected `createFileScanner()` calls created separate `CloudmersiveFileScanner` instances, so independent callers could reach Provider concurrency two. The finding was reproduced before correction as `calls=2`, `maximumActive=2`.

The remediation is:

| Checkpoint | Commit | Tree | Sole parent |
| --- | --- | --- | --- |
| Existing S6-03 V1.0 evidence closure | `b83cd4c8576d9e6e78a0a186611f59acf92e2e2f` | `afc692a536b7c43c28cb63c1f040833706222a01` | `112d28d44799d50b64416e26ff81360e7f04c9ef` |
| S6-03 F-01 remediation | `c0950ab8ce1c207758d5bc609b788bf721482447` | `739013498a2aac3689d5d76eed28c404dc055d77` | `b83cd4c8576d9e6e78a0a186611f59acf92e2e2f` |
| V1.1 evidence closure | branch HEAD after docs-only commit | docs-only tree | `c0950ab8ce1c207758d5bc609b788bf721482447` |

Branch: `codex/phase-1b-stage6-implementation-v1`.

Review-only commit `635fc9a2f3330a608468e52668fecb29b686be9f` is a sibling record with sole parent `b83cd4c8...`; it is not in Candidate ancestry. This V1.1 report supersedes only the incorrect process-wide concurrency evidence in V1.0. The V1.0 report and manifest remain unchanged audit records.

## 2. Root-cause correction

`src/uploads/scanner-factory.ts` now owns one lazy, module-scoped protected Scanner authority. Every Production or Staging `createFileScanner()` call in the deployed server module graph returns that same `CloudmersiveFileScanner`. Its existing `previousScan` chain remains the single authoritative serialization mechanism, so there is no competing factory lock.

The factory records only a SHA-256 configuration fingerprint and fails closed with the provider-neutral `ScannerUnavailableError` if the environment, driver, HTTPS origin, account-custody identity or API-key input changes unexpectedly after authority creation. Raw configuration and credentials are neither exported nor logged. Local/Test composition never reads or reuses the protected authority and continues to create only `DevelopmentFileScanner` instances.

The design is deliberately process-local. It adds no `globalThis`, `Symbol.for`, generic registry, DI container, queue, table, lease, worker, sidecar, persistent coordination, alternate Scanner or fallback. Production and Staging remain separate processes/configurations and cannot share this module authority.

## 3. Production-artifact identity proof

The existing public-bundle checker was extended rather than duplicated. It now requires the four real executable Scanner markers (`/virus/scan/file`, `CleanResult`, `FoundViruses`, `Apikey`) and the real `createFileScanner` export to be co-located inside one emitted Turbopack module. Every emitted copy must have one identical numeric module ID, every Scanner chunk must be referenced by a governed application entrypoint, and the common runtime must contain the installed-once `moduleFactories` Map and `moduleCache` contract.

At the exact remediation commit, the fresh Next 16.2.12 build emitted Scanner module `56002` in exactly two server chunks. The Admin Upload and Inquiry Upload entrypoints each referenced one of those chunks through `server/chunks/[turbopack]_runtime.js`; that runtime contained one top-level `moduleFactories` Map, one top-level `moduleCache`, duplicate-ID preservation and cached module installation. Public/client Scanner leakage count was zero.

No unused marker or side effect was introduced. The rejected uncommitted `Symbol.for`/`globalThis` attempt and its synthetic bundle marker were deleted completely and never entered Git history. The AI architecture checker, hashes and allowlists were not changed.

## 4. Behavioral proof

- Repeated independent protected factory calls return one Scanner object.
- Two concurrent calls obtained independently through `createFileScanner()` produce exactly `calls=2`, `maximumActive=1`.
- Concurrent clean, malware and unavailable outcomes remain paired to their original callers.
- An unavailable scan is not replayed and does not poison the queue; a later fresh factory caller reuses the authority and recovers on one new request.
- Environment/origin/custody/credential mismatch fails closed without disclosing either synthetic credential.
- Local/Test returns Development-only scanners, performs no Provider fetch and exposes no reset/export seam.
- All pre-existing one-attempt, 60-second abort, no-retry, strict-schema, file-limit, archive-streaming, quarantine, persist-before-release and recovery behavior remains unchanged.

## 5. Decisive verification ledger

| Gate | Exact result |
| --- | --- |
| Factory challenge | PASS; 1 file, 19 tests; independent callers `calls=2`, `maximumActive=1` |
| Adapter + factory focused set | PASS; 2 files, 54 tests |
| Public-bundle checker | PASS; 1 file, 156 tests, including identical/mismatched module IDs, missing runtime/cache markers, unreferenced chunk and public negatives |
| Affected Upload/Admin/Import/Recovery/Cleanup/Asset set | PASS; 12 files, 277 tests |
| Full `pnpm test:run` | PASS; 153 files passed, 11 skipped; 1,216 tests passed, 85 skipped; exit 0; zero assertion failure/unhandled error |
| TypeScript / Lint | PASS / PASS; zero warnings |
| AI Prompt governance | PASS; 24 tests |
| AI architecture before commit | PASS; accepted absolute current-worktree pinned `node_modules`; `ok: true` |
| AI architecture at exact commit | PASS; `ok: true`; head `c0950ab8ce1c207758d5bc609b788bf721482447` |
| Disposable PGlite migration | PASS; new isolated path, ambient database selectors unset |
| Fresh default build at exact commit | PASS; Next 16.2.12 Turbopack; compile/TypeScript pass; 44/44 static pages |
| Immediate fresh `check:bundle` | PASS; 392 eligible server JS; Scanner module `56002` across 2 emitted chunks and 2 governed entrypoints; 20 public manifests; 15 distinct public chunks |
| Independent artifact/public scan | PASS; common runtime/cache markers present; rejected synthetic slot absent; public/client Scanner leakage count 0 |
| No-delta / retirement / simplification | PASS; no package/lock/Schema/Migration/AI-gate delta; no retired HTTP authority, process slot, second adapter or Provider domain in runtime source |
| `git diff --check` / cleanup | PASS; disposable PGlite roots removed; worktree clean before docs closure |

The build proof is Local/Synthetic compile and prerender evidence only. It is not PostgreSQL, target-host, protected-environment or Production proof.

## 6. Failure-history integrity

The V1.0 chronology remains authoritative: ambient PostgreSQL prerequisite failure, migrated-PGlite build PASS, tree-shaken synthetic-marker bundle failure, real-marker correction PASS, missing AI dependency-locator failure, and accepted-locator PASS.

V1.1 adds:

1. independent Review F-01 reproduction at `calls=2`, `maximumActive=2`;
2. an uncommitted process-global slot attempt rejected because it introduced unauthorized ambient global capability and synthetic evidence;
3. deletion of that attempt without changing the AI gate; and
4. module-scoped composition correction with final independent-caller `calls=2`, `maximumActive=1` and fresh artifact proof.

No failed result was suppressed, relabelled or committed as a PASS.

## 7. Security & Test Simplification Check

Implementation self-check: **PASS for review submission; not independent approval.**

- **Root Cause First:** protected composition now reuses the actual Scanner object instead of attempting to coordinate separate instances.
- **Simplification First:** one module variable and the adapter's existing promise chain solve the defect.
- **Replace Not Layer:** the rejected process-global mechanism was deleted; no compatibility path remains.
- **Single authority:** one factory-owned protected Scanner and one adapter-owned serialization chain.
- **No gate weakening:** negative bundle, failure/recovery, configuration mismatch and public leakage tests were added; no skip, todo, only, assertion reduction or timeout masking was added.
- **No persistent complexity:** no Schema, Migration or cross-process coordination was introduced.

## 8. Rollback, residuals and claim ceiling

Commit-scoped rollback is `c0950ab8...` to parent `b83cd4c8...`; that restores the independently rejected concurrency defect and therefore is only an abandonment rollback, not an acceptable deployment state. Do not selectively restore per-call Scanner construction or the rejected process-global slot.

Open blocker or Owner decision identified by the Implementer: **none**.

Residual ceiling: this proof is per server process and does not claim cross-process serialization. It makes no Cloudmersive call, account/tier/region/legal/retention, target-host, DNS, protected Staging, Production or O/X external claim. S6-04 was not started. Stage 7 remains HOLD.

Next gate: **fresh independent S6-03 remediation implementation/security Review of `c0950ab8...` and the V1.1 docs-only closure.**
