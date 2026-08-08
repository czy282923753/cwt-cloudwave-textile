# Phase 1B Stage 3 CWT-SEC-DEP-001 nanoid Remediation Report

## Status and authority

- Report date: 2026-08-09.
- Finding: `CWT-SEC-DEP-001` — Inherited nanoid GHSA-2v37-7h3g-55p8 production dependency advisory.
- Finding state at handoff: **Open / Security Remediation Required**. This Developer report does not close the Finding.
- Remediation branch: `codex/cwt-sec-dep-001-nanoid-remediation`.
- Frozen remediation baseline: `e8e6d4da617b05155e774e5bcee679f721bb495e`.
- Dependency remediation commit: `d90b784ff22351c14e690121ac3ce742fefdaf01` (`fix(deps): resolve inherited nanoid advisory`).
- The remediation commit has the single parent `e8e6d4da617b05155e774e5bcee679f721bb495e`.
- Frozen incoming chain: `ee87a0be9ac6740250dc80c563f9eb4b2e135822` -> `f0ea93ecd884f7c2a91288f32a86a39e6e1f92b7` -> `e8e6d4da617b05155e774e5bcee679f721bb495e`.
- This document records Developer remediation and validation evidence only. It does not declare Security Review Passed, Fresh Acceptance, Accepted/Frozen, or Production Ready. A new independent Security Reviewer is required.

## Incoming evidence and inheritance boundary

| Evidence | Identity |
| --- | --- |
| Version B implementation report | `docs/PHASE_1B_STAGE3_BRAND_VISUAL_VERSION_B_IMPLEMENTATION_REPORT.md`; SHA-256 `b00aae34cfce2e10ede7c4e9994232ec39804c14f9aa5b1caa71ced136c3bbc7` |
| Independent review report | `/Users/calvin/Downloads/CWT（CloudWave Textile）项目/.data/PHASE_1B_STAGE3_BRAND_VISUAL_VERSION_B_INDEPENDENT_REVIEW_REPORT.md`; SHA-256 `0634a9c2db50427ae2e638881c4620194c126804a68d12d83bb4d0ca5ef0af96` |
| Baseline `package.json` | SHA-256 `31e8a1698e6abe68e0f78d2118448ef8bdede0e98df9460764e791302e2c2379` |
| Baseline `pnpm-workspace.yaml` | SHA-256 `6b12da06ffe270a1d773f9372400c4cd802324c53d64f217cda86d114aab55ac` |
| Baseline `pnpm-lock.yaml` | SHA-256 `678bfa9f9c12d4bc56adfb9a5ea0bad543c32cff3c28a0e07642fb23fe0a3c4c` |

`package.json` and `pnpm-lock.yaml` did not change across `ee87a0be9ac6740250dc80c563f9eb4b2e135822..e8e6d4da617b05155e774e5bcee679f721bb495e`. The advisory was therefore inherited by the Version B Candidate and was not introduced by the Version B UI diff. The independent Version B UI review remained a separate PASS with zero UI findings, while the overall Candidate remained on Security HOLD.

## Advisory and reachability assessment

- Official advisory: [GitHub Advisory GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8).
- Advisory severity: High (CVSS 8.2).
- Affected versions: `nanoid < 3.3.17`; patched version: `3.3.17`.
- Vulnerable condition: `customAlphabet` or `customRandom` receives an attacker-controlled `size=0`, causing an infinite-loop denial of service.
- Frozen production dependency chain: `next@16.2.12 -> postcss@8.5.25 -> nanoid@3.3.16`. `@refinedev/nextjs-router@7.0.5` repeats the same Next chain through its peer relationship; it is not a second nanoid package.
- Repository searches across `src`, `tests`, and `scripts` found zero calls or imports of `nanoid`, `customAlphabet`, or `customRandom`.
- The installed PostCSS code path imports `nanoid/non-secure` and uses the fixed call `nanoid(6)`.

These observations did not prove project exploitability, but they were not treated as an audit waiver. The frozen Node 24 Reviewer evidence was `pnpm audit --prod` natural exit 1 with one High advisory, so remediation remained mandatory.

## Root-cause remediation

The accepted fix constrains only the affected parent-child edge already permitted by PostCSS 8.5.25:

```yaml
overrides:
  'postcss@<=8.5.17': 8.5.25
  'postcss@8.5.25>nanoid': 3.3.17
  'sharp@<0.35.0': 0.35.3
```

The new parent-scoped override replaces only `postcss@8.5.25`'s transitive nanoid resolution. It does not create a direct nanoid dependency, a global nanoid override, or a second dependency authority. It does not upgrade Next, PostCSS, Refine, Rolldown, OXC, or application code.

### Rejected lock-only mechanism and exact recovery

The first Owner-authorized generation command was run once with absolute Node v24.14.0 and pnpm 11.9.0:

```text
pnpm update nanoid@3.3.17 --depth 100 --lockfile-only --prod --no-save
```

It exited naturally with code 0 but did not satisfy the strict contract: nanoid remained at 3.3.16 and unrelated Rolldown/OXC optional chains drifted. The resulting uncommitted lock had SHA-256 `cfcd53e74f8007fef1cfa6b8c59334cd11b93ee62c65c821f0d81eaf2ac3fcd4`. Work stopped without attempting a second update.

After the Owner verified and authorized the exact recovery preconditions, only `pnpm-lock.yaml` was restored with:

```text
git restore --source=HEAD --worktree -- pnpm-lock.yaml
```

The restored lock SHA-256 was `678bfa9f9c12d4bc56adfb9a5ea0bad543c32cff3c28a0e07642fb23fe0a3c4c`; the worktree was clean and no Git lock remained. No other path was restored.

### Final lock generation

After adding the one parent-scoped override to the existing `pnpm-workspace.yaml` override map, the lock was generated once with absolute Node v24.14.0 and pnpm 11.9.0 using the Owner-authorized command:

```text
pnpm install --lockfile-only
```

The command exited naturally with code 0. There was no second install, manual lock edit, `audit fix`, direct dependency, or package override outside the authorized parent edge.

## Exact persistent diff

Commit `d90b784ff22351c14e690121ac3ce742fefdaf01` contains exactly two files and no other persistent change:

| File | Authorized change | Final SHA-256 |
| --- | --- | --- |
| `pnpm-workspace.yaml` | Add one `'postcss@8.5.25>nanoid': 3.3.17` override | `c996ef64a6382a15c30198d8f9c41938d8524e44e8b7c654ec12b32ccdf14df3` |
| `pnpm-lock.yaml` | Register the override; replace nanoid package, snapshot, integrity, and PostCSS edge | `3ed14b1c3dbafa98fa9034259a4f8a288d7333ed8dedc4a2b7e5a3de7ddec0bb` |

Git reports 6 insertions and 4 deletions: one workspace override line, the matching lock override line, package key `nanoid@3.3.16` to `nanoid@3.3.17`, its integrity, snapshot key, and the `postcss@8.5.25` dependency edge. The final nanoid integrity is `sha512-xQLf0A3HOMlgHq0n247/LRuAOYmB7dXJ/DvAxGvsSBij45XtBSmQycu+F8ODbHwns/XyFZagyL1+J0Offw1E0g==`.

Strict diff checks established:

- `nanoid@3.3.16` is absent; the lock has one `nanoid@3.3.17` package and one corresponding snapshot, referenced by the single PostCSS edge.
- `next@16.2.12`, `postcss@8.5.25`, `@refinedev/nextjs-router@7.0.5`, `rolldown@1.2.1`, and OXC `0.142.0` are unchanged.
- After excluding the authorized override and nanoid package/snapshot/edge fields, normalized old and new lock structures are identical; all other dependency versions and optional chains are unchanged.
- No importer, direct dependency, package script, `package.json`, `.npmrc`, source, test, schema, migration, URL, route, or business behavior changed.
- `package.json` remains byte-identical at SHA-256 `31e8a1698e6abe68e0f78d2118448ef8bdede0e98df9460764e791302e2c2379`.
- `git diff --check` passed before commit A and at final handoff.

## Isolated dependency verification

All dependency and quality verification used a fresh task-owned, non-production root created from commit A:

```text
/tmp/cwt-sec-dep-001-node24.nhdU1n
```

Its source, pnpm store, and cache were isolated at `source`, `store`, and `cache` below that root. The runtime identities were:

- Node: `/Users/calvin/.nvm/versions/node/v24.14.0/bin/node` -> `v24.14.0`, `darwin`, `arm64`.
- pnpm CLI: `/Users/calvin/.nvm/versions/node/v24.14.0/lib/node_modules/pnpm/bin/pnpm.mjs` -> `11.9.0`.

Exactly one frozen install was run against the task-owned store/cache. It exited naturally with code 0 and installed 526 packages. The resulting virtual store contained 528 entries; `.modules.yaml` recorded pnpm 11.9.0, the task-owned store `.../store/v11`, the `.pnpm` virtual store, and the isolated node linker. The source `pnpm-lock.yaml` and `node_modules/.pnpm/lock.yaml` were byte-identical at SHA-256 `3ed14b1c3dbafa98fa9034259a4f8a288d7333ed8dedc4a2b7e5a3de7ddec0bb`.

`pnpm list nanoid postcss next @refinedev/nextjs-router --prod --depth 12` resolved the intended chain, and `pnpm why nanoid --prod` reported exactly one version: `nanoid 3.3.17`. Two optional realpath probes did not resolve: a root-level bare import of the transitive dependency and a probe through a Refine package export. They made no state change and were not used as dependency identity evidence; the frozen virtual lock, canonical `list`/`why`, and audit results remained authoritative.

## pnpm run environment identity record

The following environment/harness interruptions were retained rather than hidden:

1. The first `env:check` call did not carry the task store/cache identity. pnpm's default pre-run dependency verification attempted an internal install and stopped with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`. No package was installed, purged, or deleted.
2. A second call supplied bare `--store-dir` and `--cache-dir` before `run`; pnpm 11.9.0's run parser rejected them as unknown options, so the script did not start.
3. A third call used the accepted `--config.store-dir=...` and `--config.cache-dir=...` form, but default `verifyDepsBeforeRun=install` again attempted internal installation and stopped at the same no-TTY guard. No package was installed, purged, or deleted.
4. The first Owner-authorized `--config.verify-deps-before-run=warn` call preserved dependency status checking without automatic installation. It emitted an `enableGlobalVirtualStore setting has changed` warning, but its child `node` resolved to `/usr/local/bin/node` v25.8.1 x64, and the runtime script correctly failed.
5. The Owner then performed read-only configuration checks in the same source: `pnpm config get enable-global-virtual-store` returned exactly `undefined`, and `.modules.yaml` also had no `enableGlobalVirtualStore` value. With both effective values undefined and the frozen virtual lock byte-identical, the warning was classified as a pnpm dependency-status false positive. No `enable-global-virtual-store` value was added.
6. The single authorized recovery fixed only the child `PATH` and retained `store`, `cache`, and `verify-deps-before-run=warn`. The same warning remained visible, while `env:check` actually ran and naturally exited 0 with `Runtime accepted: v24.14.0 darwin arm64.`

Every subsequent pnpm `run` or `exec` used the same fixed child `PATH`, absolute Node/pnpm binaries, task-owned store/cache, and `verify-deps-before-run=warn`. No `CI=true`, purge confirmation, `verify=false`, reinstall, virtual-store change, or replacement root was used.

## Security and quality gates

| Gate | Final result |
| --- | --- |
| One isolated `pnpm install --frozen-lockfile` | Passed; natural exit 0; source and virtual locks byte-identical |
| Production dependency `list` and `why` | Passed; one nanoid version, 3.3.17, through PostCSS 8.5.25 |
| `pnpm audit --prod` | Passed; natural exit 0; `No known vulnerabilities found` |
| `pnpm run env:check` | Passed with the recorded pnpm status-check false-positive warning; Node v24.14.0 arm64 accepted |
| `pnpm run env:diagnose` | Passed; Node v24.14.0 arm64, pnpm 11.9.0, Sharp 0.35.3, Lightning CSS 1.32.0, SWC 16.2.12 |
| `pnpm run lint` | Passed with zero warnings |
| `pnpm run typecheck` | Passed |
| `pnpm run test:run` | Passed; 95 files and 385 tests |
| Isolated `pnpm run db:migrate` and `pnpm run db:seed` | Passed against task-only PGlite/storage |
| Isolated production `pnpm run build` | Passed; compilation and TypeScript passed; 43/43 static page units generated |
| `pnpm run check:bundle` | Passed; 23 public-page manifests and 31 manifest/chunk files checked |
| Full `pnpm exec playwright test --retries=0` | Passed; 52/52 tests in 1.9 minutes, no retries |
| Final `git diff --check` | Passed |

The isolated production build used `APP_ENV=test`, PGlite, task-owned public/private/import storage roots, `NON_PRODUCTION_NOINDEX=true`, and `FEATURE_PRODUCT_IMPORT=false`. Playwright used only its committed synthetic test fixtures and temporary test data. No Production/Staging credential, database, bucket, formal Product data, or external environment was accessed. The Playwright/Next processes exited, the test server stopped, and TCP port 3100 was closed after the natural test completion.

## Audit before and after

| Point | Runtime evidence | Result |
| --- | --- | --- |
| Frozen incoming Candidate | Independent Node 24 Reviewer environment | Natural exit 1; one High advisory for nanoid GHSA-2v37-7h3g-55p8 |
| Commit A isolated verification | Node v24.14.0 / pnpm 11.9.0, task-owned frozen install | Natural exit 0; no known vulnerabilities |

The exit-0 audit, not the reachability observation, is the remediation evidence.

## Source-control and acceptance boundary

- Commit A changes only `pnpm-workspace.yaml` and `pnpm-lock.yaml`; its unique parent is the frozen Candidate baseline.
- The Version B protected ref `codex/ui-version-b-independent-ee87` remained at `e8e6d4da617b05155e774e5bcee679f721bb495e`.
- No protected ref, existing implementation/report commit, source/test file, Tag, remote branch, deployment, Production/Staging system, or formal data was changed.
- Product Import remains default OFF. Real product-image validation remains `Waiting for Real Product Data Validation`.
- Fresh Acceptance, the UI Developer, UI Reviewer, Version Manager, and overall Candidate remain on HOLD pending Owner-directed independent Security Review.
- This Candidate is suitable only for a new independent Security Reviewer to evaluate. The Developer does not close `CWT-SEC-DEP-001` or make an acceptance/release declaration.
