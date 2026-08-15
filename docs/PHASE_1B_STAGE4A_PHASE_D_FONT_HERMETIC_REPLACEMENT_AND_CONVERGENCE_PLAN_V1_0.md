# CWT Stage 4A Phase D FONT-HERMETIC-01 Replacement and Convergence Plan V1.0

Status: **implementation-ready plan pending Owner decision**

Date: 2026-08-15 (Asia/Shanghai)

Classification: **technical-escalation plan only; no Design acceptance or implementation authority**

## 1. Recommended decision

Adopt exactly one Design/review Build authority:

> **B — hash-bound native Node `24.14.0` → exact project-local Next `16.2.12` public CLI over a verified full task-local installed tree, executed once under an external-network-denied, localhost-IPC-only sandbox.**

Use APFS CoW only to transport verified installed bytes. Do not make CoW state, pnpm workspace metadata, a content-addressed package snapshot, a loader probe or a custom runner into another authority layer.

This Design proof is deliberately narrower than the later implementation gate. It must prove the actual pinned default-Turbopack compiler, exact local-font consumption/emission, no Google/native-Google authority, and public-bundle compatibility. The fresh implementation Candidate must independently prove exact pnpm currentness and invoke unchanged `pnpm build` once at mandatory Gate 8.

No implementation may start until the Coordinator verifies this escalation, the Owner approves the exact decision in section 2, a compact superseding Exact Design/ADR amendment is authored, and a different fresh reviewer returns full Design/security PASS.

## 2. Exact Owner decision required

### 2.1 Recommended wording

> Approve, for FONT-HERMETIC Design/review proof only, hash-bound Node 24.14.0 → project-local Next 16.2.12 public CLI over a verified task-local full installed dependency tree. This does not replace or weaken the fresh implementation's mandatory pnpm currentness and `pnpm build` Gate 8. Permit only ephemeral localhost sandbox capability required by Turbopack internal IPC, with runtime bind/connect fixed to numeric 127.0.0.1 and DNS/non-loopback network denied. Authorize a compact superseding Exact Design and ADR-0020 amendment on a fresh line from `fbe88cdd7639f32f48d92a0627833918b4924458`; G3–G10 implementations and incidental proof mechanics remain historical and may not be cherry-picked. Retain only the named synthetic boundary, G6 semantic generated-root lifecycle, G9 source/checker/proof-ceiling semantics, and the independently reviewed exact local-font proposal material.

### 2.2 Choices and risks

| Choice | Result | Risk/trade-off |
| --- | --- | --- |
| **Approve the recommended wording** | permits a superseding Design/review to close the real Next/Turbopack property, then a separate fresh implementation | requires one explicitly approved localhost-only proof runner; no implementation PASS is implied |
| Decline | keeps the project paused at `fbe88cdd…` with FONT-HERMETIC-01 open | no further Phase D implementation or Candidate may proceed |

A, C, D and E are not equivalent fallback approvals. If the Owner wants one of them, that is a new architecture/proof decision and requires a separate analysis rather than an inferred substitution.

## 3. Replacement architecture

### 3.1 Remove

The superseding Design must expressly retire these as active authority:

- every Google font mock server, request counter, copied-font directory, CSS URL map, `NEXT_FONT_GOOGLE_MOCKED_RESPONSES` environment path, URL grammar/parser and JavaScript/Webpack Google-loader probe from G3–G5;
- the exact ambient source-root `package.json` byte-equality prerequisite;
- Design-level pnpm currentness/package-script execution and injected `CI=1`;
- G6/G7/G8/G9 inode/timestamp/polling/cache-class/full-clone-delta proof ceremony beyond the functional generated-root lifecycle;
- repeated predecessor constants, failed-Gate evidence reuse, raw per-gate logs and full dependency/build-cache inventories;
- any Webpack fallback, loader-only substitute, Google/local dual path, custom Next internal runner, dependency install/snapshot creator or retry path.

Historical bytes and review evidence remain immutable; “remove” means **remove from forward authority**, not delete history.

### 3.2 Retain and merge

Retain these named contracts:

1. the exact Phase D Synthetic-Only Boundary Owner Decision from accepted G9;
2. G6's semantic lifecycle only: official typegen → atomic hold → fresh Build → restore, with no Build retry;
3. G9's synthetic environment, two runtime-output contract, four-probe ceiling, thirteen accepted origin cases, clean/direct-parent checker binding, task-local dependency/error-mode and fresh ten-gate/no-retry implementation sequence;
4. G10's four proposed local-font paths and exact asset semantics as **proposal material only**, until the superseding Design is independently accepted.

Merge the retained pieces into one compact superseding Exact Design. Do not link a chain of G3–G10 execution documents as cumulative instructions.

### 3.3 One Design-proof authority

The proof root has four bounded preflight classes and one Build:

1. Git/source and local-font identity;
2. dependency/Next/SWC identity and completeness;
3. PGlite/generated-root prerequisites;
4. loopback-only sandbox capability and external-network denial;
5. one direct default-Turbopack Build, followed only on PASS by one focused direct public-bundle observation.

The result is one JSON plus its manifest. Failure stops; there is no alternate runner or retry.

## 4. Forward lineage and role separation

The only permitted forward graph is:

```text
fbe88cdd7639f32f48d92a0627833918b4924458
  -> S1 docs-only superseding Owner/ADR/Exact-Design Candidate
  -> independent S1 Design/security review PASS
  -> Coordinator records formal acceptance of exact S1
  -> S2 fresh implementation Candidate by a different gpt-5.6-sol/xhigh implementer
  -> C2 as the sole/direct child of S2, only after every fresh gate passes
  -> different fresh implementation/security review
  -> Coordinator acceptance/checkpoint decision and terminal pause
```

Rules:

- S1 and S2 are not G11 and not Attempt 4.
- S1 starts from the exact frozen checkpoint and imports only named governance artifacts/semantics.
- S2 starts from accepted S1, not from `37056086…`, G10, or any failed implementation successor.
- No Product code may be cherry-picked, patched, checked out or copied from G3–G10 commits. The implementer must apply the approved semantics fresh.
- The two exact binary font bytes may be copied only from the verified installed Next `16.2.12` package after all provenance checks pass.
- The Technical Root-Cause Analyst may not author S2, review S1/S2, accept either, dispatch implementation, or create C2.

## 5. S1 docs-only allowlist

The superseding governance/Design Candidate may change only:

- the exact retained `docs/PHASE_1B_STAGE4A_PHASE_D_SYNTHETIC_ONLY_BOUNDARY_OWNER_DECISION_V1_0.md` blob copied from accepted G9;
- one new Owner decision/amendment record containing section 2's approved wording;
- `docs/adr/ADR-0020-phase-d-synthetic-only-bounded-convergence.md`;
- `docs/adr/README.md` only if needed to bind the amended ADR identity/status;
- one compact superseding Phase D Exact Design;
- its bounded Design author evidence: one result JSON and one manifest JSON;
- this technical-escalation analysis, plan and four-file evidence directory if the Coordinator chooses to place their direct-child Candidate in S1 custody.

No Product, dependency, lock, schema, migration, test, checker, configuration, generated or binary path is permitted in S1.

## 6. S2 exact implementation allowlist

The future fresh implementer may change exactly the following 22 paths relative to accepted S1. Deletion/addition intent is binding; no 23rd path is allowed without a new Owner decision.

| # | Path | Permitted action |
| ---: | --- | --- |
| 1 | `package.json` | exact accepted synthetic script/check convergence only |
| 2 | `pnpm-workspace.yaml` | exact accepted workspace/currentness convergence only |
| 3 | `scripts/validate-deepseek-text-adapter.test.ts` | delete |
| 4 | `scripts/validate-deepseek-text-adapter.ts` | delete |
| 5 | `scripts/verify-ai-architecture.ts` | exact accepted S1 checker binding only |
| 6 | `src/ai/testing/controlled-provider-validation.test.ts` | delete |
| 7 | `src/ai/testing/controlled-provider-validation.ts` | delete |
| 8 | `src/app/api/admin/upload-intents/[token]/route.test.ts` | exact accepted numeric-origin correction only |
| 9 | `src/app/api/conversion-events/route.test.ts` | exact accepted numeric-origin correction only |
| 10 | `src/app/api/upload-intents/[token]/route.test.ts` | exact accepted numeric-origin correction only |
| 11 | `src/app/api/upload-intents/route.test.ts` | exact accepted numeric-origin correction only |
| 12 | `src/integrations/ai/providers/deepseek-official-source-preflight.test.ts` | delete |
| 13 | `src/integrations/ai/providers/deepseek-official-source-preflight.ts` | delete |
| 14 | `src/integrations/ai/providers/deepseek-text-adapter.test.ts` | exact accepted synthetic-contract update only |
| 15 | `test-fixtures/ai-architecture/graph-faults.phase-d.v5_0.json` | delete/rename source |
| 16 | `test-fixtures/ai-architecture/graph-faults.phase-d.synthetic-only.v1_0.json` | add/rename destination |
| 17 | `test-fixtures/ai/deepseek-controlled-validation.v1.json` | delete |
| 18 | `test-fixtures/ai/deepseek-synthetic-contract.v1.json` | add |
| 19 | `src/app/layout.tsx` | exact approved `next/font/local` transform only |
| 20 | `src/seo/nonproduction-indexing.test.ts` | font import-boundary synchronization only; assertions unchanged |
| 21 | `src/app/fonts/geist-latin.woff2` | add exact verified bytes |
| 22 | `src/app/fonts/geist-mono-latin.woff2` | add exact verified bytes |

The Design must specify complete intended bytes/diffs for text paths. G9/G10 commits are review references, not copy sources.

No dependency, lockfile, Next config, global CSS, public raw font route, extra license file, Build runner, proof script, output schema, URL/Redirect, publishing/Index, Product-data or API contract change is permitted.

## 7. Binary asset, provenance and license contract

The only authorized source is the already installed package selected by the proof preflight:

```text
next@16.2.12/dist/next-devtools/server/font/geist-latin.woff2
next@16.2.12/dist/next-devtools/server/font/geist-mono-latin.woff2
```

Required target identities:

| Target | Bytes | SHA-256 | Decoded identity |
| --- | ---: | --- | --- |
| `src/app/fonts/geist-latin.woff2` | 28,356 | `1b5ebfb3a01a97343ac96873e6d59a8cb285c66012b6a1ac509cb2765e995ba8` | WOFF2 TrueType, Geist, v1.401, `wght 100..900` |
| `src/app/fonts/geist-mono-latin.woff2` | 31,288 | `b7ac144b394cbd81052d6397ec0c33397977b1d7e9bc095e744e652a378c6fb3` | WOFF2 TrueType, Geist Mono, v1.401, `wght 100..900` |

Both source and target must be regular, non-executable, non-symlink, single-link files with repository mode `100644`. The package's parallel ESM copies must be byte-identical as a package-internal corroboration, not a second authority.

The decoded embedded notice must remain:

```text
Copyright 2024 The Geist Project Authors (https://github.com/vercel/geist-font.git)
licenseURL=https://openfontlicense.org
```

The superseding Design must record Geist Project provenance, OFL-1.1, the embedded notice, and unrestricted `OS/2.fsType` results in a repository-visible section. Next's package MIT license is not the font license. No additional implementation path is required because the exact asset preserves the embedded notice and the accepted Design records the redistribution authority.

Any unavailable source, different package/version, hash/size/table/name/license mismatch, symlink/hardlink/canonical escape, modified asset or proposed replacement font stops `NEEDS_OWNER_DECISION`. Do not download or substitute.

## 8. Exact Design-review proof sequence

All operations occur in a disposable task-owned root outside the repository and use only already installed local dependencies. The reviewer records logical paths, not host-private paths.

### 8.1 Preflight and materialization

1. Check out exact accepted S1 and prove its sole/direct parent and clean status.
2. Find one full local installed source whose wanted/virtual lock is exact and whose 37 declared direct packages all resolve to the expected versions inside the cloned `node_modules` root.
3. Hash Node, target `package.json`, wanted lock, workspace file, virtual lock, Next package JSON/public bin/typegen entry, native SWC package JSON/binary, and a sorted direct-dependency identity aggregate.
4. APFS-CoW clone the full physical `node_modules` into the disposable root. Do **not** rebind `.pnpm-workspace-state-v1.json`; pnpm is outside Design-proof authority.
5. Apply in memory/on the disposable tree only the exact S1-approved Product/test/font projection. Verify no checker/config/other Product source changed.
6. Verify exact asset physicality, hashes, decoded tables, embedded copyright/OFL notice and no Product occurrence of `next/font/google`, Google mock env, mock host, copied-font map or loader probe.
7. If no exact full installed source exists, stop `BLOCKED`; do not install or create a partial/content-addressed substitute.

### 8.2 Synthetic application prerequisites

Construct the environment from scratch. It must include only:

- `APP_ENV=test`;
- `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3200`;
- accepted noindex behavior;
- task-owned PGlite path and isolated public/private/import roots;
- conspicuously synthetic auth value;
- no proxy, registry, Provider, API, real credential, external DB, or protected environment authority.

Run migrations exactly once with hash-bound native Node and the project-local `tsx` entry. Migrations `0000..0020` must pass; do not seed.

Run typegen exactly once:

```text
node node_modules/next/dist/bin/next typegen .
```

Require the exact three generated files, then atomically hold the generated root on the same filesystem. Failure stops before Build.

### 8.3 Loopback-only runner

Before Build, run one minimal self-connect preflight under the exact macOS sandbox policy:

```scheme
(version 1)
(allow default)
(deny network*)
(allow network-bind (local tcp "localhost:*"))
(allow network-inbound (local tcp "localhost:*"))
(allow network-outbound (remote ip "localhost:*"))
```

The Node probe itself must bind exact numeric `127.0.0.1` on port `0`, discover the assigned port, connect to exact numeric `127.0.0.1`, exchange a fixed marker and close. A hostname/DNS connection, non-loopback listener, fixed externally reachable port or relaxed network profile is prohibited. Profile parse or self-connect failure stops before Build and requires environment remediation/Owner review; it does not authorize a Build retry.

### 8.4 One actual default-Turbopack Build

Under that same profile and unchanged synthetic environment, execute exactly once:

```text
node node_modules/next/dist/bin/next build
```

Required authority facts:

- native Node and the project-local public CLI hashes equal preflight identities;
- Next banner is exactly `16.2.12 (Turbopack)`;
- no `--webpack`, `TURBOPACK=0`, experimental/internal runner, wrapper or package manager participates;
- Build exits zero and produces `BUILD_ID`;
- exactly the two expected local inputs are consumed and emitted as distinct hashed `/_next/static/media/...woff2` artifacts with exact input byte/hash equality;
- generated CSS references only those hashed local media assets;
- zero `next/font/google`, native Google-font request, external DNS/egress, Google hostname, mock response, proxy or raw source-font public route is observed;
- application-controlled public-bundle/security boundaries remain compatible.

Only after Build PASS, run one focused observation through exact native Node:

```text
node scripts/check-public-bundle.mjs
```

That observation is Design-review evidence only. It is not implementation Gate 9 PASS. Any Build or focused-check failure returns FAIL/INCOMPLETE; no retry, alternate compiler or loader probe is allowed.

## 9. Fresh implementation sequence and mandatory gates

The future S2 implementer must repeat all authoritative work from zero. No G10 review/diagnostic result or earlier Gate 1–7 result is reusable.

### 9.1 Dependency/currentness boundary

1. CoW-clone one verified full installed dependency tree into the task-local fresh S2 root.
2. Rebind only the one project-root key in `.pnpm-workspace-state-v1.json` because implementation package commands use pnpm.
3. Construct an explicit environment that omits `CI` and any `enableGlobalVirtualStore` override; set `pnpm_config_verify_deps_before_run=error`.
4. Run exactly one zero-build currentness marker:

```text
pnpm exec node -e 'process.stdout.write("PNPM_CURRENTNESS_OK\\n")'
```

5. Require marker count one and zero non-volatile workspace-state delta after normalizing `lastValidatedTimestamp`.

Failure blocks. No `pnpm install`, `warn` mode, metadata editing beyond the root key, alternative tree or retry is authorized.

### 9.2 Functional lifecycle

1. normalize only clone-local generated/cache state needed for a fresh run; do not recreate four metadata classes or polling state machines;
2. create one empty task-owned PGlite/storage environment and apply migrations once with no seed;
3. invoke exact `pnpm exec next typegen .` once under error-mode currentness;
4. validate three generated files and atomically hold the typegen root;
5. run Gates 1–7 exactly once;
6. execute Gate 8 exactly once as unchanged `pnpm build` under the same verified loopback-only/external-denied sandbox;
7. after Build PASS, execute Gate 9 exact `pnpm check:bundle` once and Gate 10 package/workspace/lock/diff integrity once;
8. hold the Build root, restore the exact original typegen root, and emit the accepted aggregate once;
9. create C2 only if every prerequisite, Gate 1–10, restore and aggregate check passes.

### 9.3 Exact ten gates

The superseding Design must name the final S1-approved package-script spellings. Their semantic order is fixed:

1. synthetic-only architecture/checker validation;
2. Prompt/static-boundary validation;
3. architecture mutation/negative controls;
4. TypeScript typecheck;
5. lint;
6. bounded AI/synthetic contract tests;
7. full test suite;
8. `pnpm build` with pinned Next default Turbopack under loopback-only/no-external execution;
9. `pnpm check:bundle`;
10. exact allowlist, package/workspace/lock and clean-Candidate integrity.

The package-script aggregate follows the ten fresh PASS results; it cannot manufacture or convert a Gate result. No failure cleanup changes FAIL to PASS.

## 10. Evidence ceiling

### 10.1 This technical escalation

Exactly two reports plus four evidence files:

- this plan;
- the root-cause analysis;
- `ROOT_CAUSE_EVIDENCE_V1_0.json`;
- `DIAGNOSTIC_BUILD_RESULT_V1_0.json`;
- `COMPLEXITY_AND_LINEAGE_EVIDENCE_V1_0.json`;
- `MANIFEST_V1_0.json`.

No raw logs, full filesystem listings, `node_modules` inventory, Build cache, database or secret-bearing environment is retained.

### 10.2 Superseding Design author/reviewer

- author: one compact Exact Design, amended ADR/Owner artifacts, one `DESIGN_PROOF_RESULT_V1_0.json`, one manifest;
- reviewer: one full Design/security review report, one `INDEPENDENT_REVIEW_RESULT_V1_0.json`, one manifest.

The reviewer may cite the escalation evidence by identity; it must not duplicate raw logs or build a second proof framework.

### 10.3 Fresh implementation/review

- implementation: the accepted G9 two runtime outputs, one concise C2 report/manifest only after full PASS;
- review: one full implementation/security review report, one result JSON and one manifest.

No per-gate log archive, repeated state snapshots, host-private path, full dependency list, raw `.next`, PGlite database, storage fixture or credential value may enter Git.

## 11. Independent review sequence

1. **Coordinator verification:** verify this artifact-only Candidate, custody bundle and `NEEDS_OWNER_DECISION` conclusion.
2. **Owner decision:** approve or decline section 2 verbatim; resolve ADR/security/lineage authority before S1 authoring.
3. **S1 author:** different from this analyst; create compact superseding Owner/ADR/Exact Design from the checkpoint line only.
4. **S1 fresh independent Design/security reviewer:** inspect full exact S1 and run section 8 once. PASS requires zero Blocker/High/Medium under `docs/REVIEW_POLICY.md`; FAIL/INCOMPLETE stops.
5. **Coordinator acceptance:** record exact accepted S1 identity. Design review evidence is not implementation evidence.
6. **S2 fresh implementation:** different `gpt-5.6-sol/xhigh` task and different from analyst/reviewer; execute section 9 from zero.
7. **C2:** sole/direct child of successful S2 only after full PASS.
8. **Fresh independent implementation/security review:** review exact S2/C2, all gates, asset/license/public-delivery and synthetic boundary. The implementer cannot self-review.
9. **Coordinator decision and pause:** acceptance/checkpoint action requires explicit authority; Phase E/F remains outside scope.

## 12. Rollback, cleanup and stop conditions

### 12.1 Rollback

The immutable rollback point is:

```text
fbe88cdd7639f32f48d92a0627833918b4924458
```

- before S1 acceptance: discard the docs-only S1 Candidate/custody ref;
- after S1 but before successful S2/C2: discard S2 and, if Owner revokes the decision, revert/discard S1 to `fbe`;
- after C2: discard/revert C2, then S2, then S1 in reverse authority order; never rewrite accepted historical commits;
- task-owned dependencies, generated roots, PGlite and storage contain no business state and are removed directly after evidence extraction.

Checkpoint movement, shared ref mutation, push and deploy are separate prohibited actions in this escalation.

### 12.2 Stop `NEEDS_OWNER_DECISION`

Stop for any of:

- Owner has not approved B, loopback-only IPC, ADR amendment and fresh lineage;
- any extra implementation or Design path;
- dependency/lock/Schema/Migration, Product/API, SEO/URL/Redirect/publishing/Index or security-boundary expansion;
- unavailable/mismatched font source, asset, provenance or OFL notice;
- alternate dependency materialization/snapshot/install requirement;
- real/protected/external input or network access;
- request to reuse/cherry-pick a failed implementation.

### 12.3 Stop `FAIL/INCOMPLETE`

Stop without retry if typegen, loopback preflight, the one default-Turbopack Build, font-emission proof, focused public-bundle observation, a fresh implementation gate, generated-root restore or aggregate fails. No G11/Attempt 4 is permitted. A repeated FONT-HERMETIC causal root returns to Technical Escalation/Owner governance; it cannot be renamed or bypassed.

## 13. Terminal pause

This analyst stops after delivering this plan, analysis, bounded evidence, portable artifact-only Candidate and Coordinator callback. The current status is:

```text
FONT-HERMETIC-01 = OPEN_UNPROVEN
OWNER / ADR / SECURITY-BOUNDARY DECISION = REQUIRED
PRODUCT IMPLEMENTATION = NOT AUTHORIZED
NEXT TASK = DIFFERENT FRESH SUPERSEDING-DESIGN AUTHOR AFTER OWNER APPROVAL
NEXT IMPLEMENTER = DIFFERENT FRESH gpt-5.6-sol/xhigh TASK ONLY AFTER INDEPENDENT DESIGN PASS
```
