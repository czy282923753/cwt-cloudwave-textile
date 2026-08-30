# CWT Phase 1B Stage 6 S6-03 F-01 Process-Wide Concurrency Remediation Evidence Manifest V1.1

Status: **LOCAL EVIDENCE CANDIDATE — fresh independent implementation/security review required**

Date: **2026-08-30**

Principal report: `docs/PHASE_1B_STAGE6_S6_03_F_01_PROCESS_WIDE_CONCURRENCY_REMEDIATION_REPORT_V1_1.md`

## 1. Review subject and claim ceiling

The exact review subject is remediation commit `c0950ab8ce1c207758d5bc609b788bf721482447` plus the docs-only closure containing this manifest, the V1.1 report and adjacent verified SHA-256 sidecars.

This evidence is Local and Synthetic. It neither approves S6-03 nor authorizes S6-04, deployment, Provider access, protected-environment mutation or Stage 7.

## 2. Exact lineage

```text
112d28d44799d50b64416e26ff81360e7f04c9ef  S6-03 V1.0 implementation
└── b83cd4c8576d9e6e78a0a186611f59acf92e2e2f  S6-03 V1.0 evidence closure
    └── c0950ab8ce1c207758d5bc609b788bf721482447  F-01 remediation
        └── docs-only V1.1 evidence closure (branch HEAD)
```

| Commit | Tree | Parent | Scope |
| --- | --- | --- | --- |
| `b83cd4c8576d9e6e78a0a186611f59acf92e2e2f` | `afc692a536b7c43c28cb63c1f040833706222a01` | `112d28d44799d50b64416e26ff81360e7f04c9ef` | preserved V1.0 evidence closure |
| `c0950ab8ce1c207758d5bc609b788bf721482447` | `739013498a2aac3689d5d76eed28c404dc055d77` | `b83cd4c8576d9e6e78a0a186611f59acf92e2e2f` | four-path F-01 code/test/checker remediation |

Review-only FAIL commit `635fc9a2f3330a608468e52668fecb29b686be9f` has tree `bbde33940c3e93cd823fcf7f21136f509ef71edf` and sole parent `b83cd4c8...`; ancestry verification exits nonzero.

## 3. Exact changed-file inventory and identities

```text
M scripts/check-public-bundle.mjs
M src/public-site/public-bundle-check.test.ts
M src/uploads/scanner-factory.test.ts
M src/uploads/scanner-factory.ts
```

Diffstat: **4 files changed, 386 insertions, 24 deletions**.

| Path | SHA-256 at `c0950ab8...` |
| --- | --- |
| `scripts/check-public-bundle.mjs` | `00699127a63b46ac3afc0a1514b3605563bce7c3ec0ad258e46839e926380e0c` |
| `src/public-site/public-bundle-check.test.ts` | `b719583dfc6745f85fb93da8e3d96ebd1a46fb9bdbe7c70a63a8608b4ed28557` |
| `src/uploads/scanner-factory.test.ts` | `a7440f33570a0b3537b56661a23adb68b79b323ce296cc1bec062baa203431e4` |
| `src/uploads/scanner-factory.ts` | `d287330665c5893ffefe4910f2b8f7ff6b601e00e7d2d8897a764cef8b19c783` |

There is no package, lockfile, Schema, Migration, adapter, archive, file-limit, AI checker, AI hash or allowlist delta.

## 4. Decisive evidence matrix

| Evidence | Result |
| --- | --- |
| Accepted F-01 before-state | FAIL reproduced by independent Review: `calls=2`, `maximumActive=2` |
| Corrected independent-factory challenge | PASS: `calls=2`, `maximumActive=1`; repeated calls return the same protected Scanner |
| Result ownership | PASS: clean, malware and unavailable remain paired to callers |
| Queue recovery | PASS: failed scan not replayed; later independent caller recovers with one fresh call |
| Isolation/config safety | PASS: Local/Test Development-only; protected configuration mismatch fails closed; no reset/export/credential leak |
| Factory focused tests | PASS: 19/19 |
| Adapter + factory | PASS: 54/54 |
| Bundle checker tests | PASS: 156/156 |
| Affected set | PASS: 12 files, 277/277 |
| Full suite | PASS: 153 passed files, 11 skipped; 1,216 passed tests, 85 skipped; zero failure/unhandled error |
| TypeScript / Lint / AI Prompts | PASS / PASS / 24 passed |
| Exact AI architecture gate | PASS at `c0950ab8...` with accepted absolute current-worktree pinned dependency locator; `ok: true` |
| Fresh build | PASS after new disposable PGlite migration; Next 16.2.12; 44/44 pages |
| Fresh bundle | PASS immediately after build; Scanner module `56002`, 2 emissions, 2 governed entrypoints |
| Runtime identity/cache | PASS: one module ID; governed `moduleFactories` Map and `moduleCache`; duplicate-ID preservation and cached installation present |
| Public/client negative | PASS: zero Scanner forbidden-marker leak; rejected synthetic slot absent |
| No-delta/retirement | PASS: no package/lock/Schema/Migration/AI-gate delta; no old HTTP scanner, process-global slot, second Scanner or Provider endpoint |
| Cleanup | PASS: exact disposable database roots removed; no protected/external resource used |

Sanitized build and AI gate forms:

```text
APP_ENV=local DATABASE_DRIVER=pglite PGLITE_DATA_DIR='<new-disposable-root>/build-db' DATABASE_URL=<unset> DATABASE_URL_FILE=<unset> pnpm db:migrate
APP_ENV=local DATABASE_DRIVER=pglite PGLITE_DATA_DIR='<same-new-disposable-root>/build-db' DATABASE_URL=<unset> DATABASE_URL_FILE=<unset> pnpm build
pnpm check:bundle
CWT_INSTALLED_NODE_MODULES='<absolute-current-worktree>/node_modules' pnpm check:ai-architecture
```

No machine-specific temp path, database, API key, Provider response or payload is committed.

## 5. Review anchors

```text
git show --format='%H %T %P' --no-patch c0950ab8ce1c207758d5bc609b788bf721482447
git diff-tree --no-commit-id --name-status -r c0950ab8ce1c207758d5bc609b788bf721482447
git diff --name-only b83cd4c8576d9e6e78a0a186611f59acf92e2e2f..c0950ab8ce1c207758d5bc609b788bf721482447 -- package.json pnpm-lock.yaml src/db drizzle migrations scripts/verify-ai-architecture.ts
git grep -n -E 'Symbol\.for|cwt\.cloudmersive-file-scanner\.process-authority|HttpFileScanner|FILE_SCAN_ENDPOINT|FILE_SCAN_TOKEN' c0950ab8ce1c207758d5bc609b788bf721482447 -- ':!docs/**'
git merge-base --is-ancestor 635fc9a2f3330a608468e52668fecb29b686be9f c0950ab8ce1c207758d5bc609b788bf721482447
```

Expected: exact commit/tree/parent and four changed paths above; no prohibited delta/residue; review ancestry command exits nonzero.

## 6. Audit continuity and next gate

V1.0 remains unchanged. V1.1 preserves its full build/bundle/AI-locator failure chronology and adds the accepted F-01 Review, rejected uncommitted ambient-global attempt, deletion-based convergence and corrected module-authority proof.

Open blocker or Owner decision: **none identified by the Implementer**.

Next gate: **fresh independent S6-03 remediation implementation/security Review. No S6-04 and no Stage 7.**
