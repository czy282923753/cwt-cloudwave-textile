# CWT Stage 4A Phase D FONT-HERMETIC-01 Technical Escalation Root-Cause Analysis V1.0

Status: **NEEDS_OWNER_DECISION / FONT-HERMETIC-01 OPEN_UNPROVEN**

Role: Fresh independent Technical Root-Cause Analyst

Date: 2026-08-15 (Asia/Shanghai)

Classification: **analysis artifact only; not an Exact Design, Design acceptance, implementation, implementation Gate 8, C2, or Phase acceptance**

## 1. Executive finding

G10's mandatory Build proof did not fail because the proposed `next/font/local` Product change was invalid, because Next.js rejected the two local WOFF2 assets, or because the installed packages were demonstrably incomplete. It failed before Next.js started because the review harness injected `CI=1`. In pinned pnpm `11.9.0`, that input converts an otherwise unset `enableGlobalVirtualStore` current setting to `false`; the projected installed state stored the setting as absent. `verify-deps-before-run=error` compares that setting first and rejected the projection before checking or invoking the child command.

An independent zero-build reproduction proved both sides without installation:

- with `CI=1`, `pnpm exec` returned the same `ERR_PNPM_VERIFY_DEPS_BEFORE_RUN` and did not enter the child;
- with `CI` absent, the same exact G10 package, lock, workspace, CoW-installed tree and root rebind passed currentness and entered native Node `24.14.0 arm64`;
- after removing the volatile validation timestamp, the installed workspace-state hash was unchanged.

The first failed authority was therefore **the review harness's pnpm currentness authority**, not Product local-font correctness and not the physical dependency bytes.

The one permitted actual diagnostic Build then exposed a second, independent proof-environment defect. Hash-bound native Node entered the exact project-local Next `16.2.12` public CLI, displayed `Next.js 16.2.12 (Turbopack)`, and reached the generated `geistmono_….module.css` PostCSS path. It stopped when pinned Turbopack attempted to create its internal child-process communication listener on `127.0.0.1:0`; the execution sandbox denied `listen(2)` with `EPERM`. The same sandbox independently denied a minimal numeric-loopback bind. The Build produced no `BUILD_ID`, emitted font, or complete CSS, so the Product proposal remains **not disproved but not conclusively proven**, and FONT-HERMETIC-01 remains open.

The smallest durable replacement is one Design-proof authority:

> **B — hash-bound native Node → exact project-local Next public CLI over a verified full task-local installed tree.**

This authority must run under an approved loopback-only execution profile that permits Turbopack's ephemeral localhost IPC while runtime bind/connect is fixed to numeric `127.0.0.1` and DNS/non-loopback network stays denied. It does not replace or weaken the future implementation Candidate's mandatory pnpm currentness and `pnpm build` Gate 8.

No G11 or Attempt 4 is authorized. A compact superseding Exact Design, an ADR-0020 amendment, and an explicit Owner decision are required before a different fresh implementer may begin from the frozen checkpoint.

## 2. Scope and immutable baseline

### 2.1 Rollback/source checkpoint

| Item | Identity | Finding |
| --- | --- | --- |
| Ref | `refs/heads/codex/checkpoint/phase-1b-stage4a-phase-d-pre-formal-proof-replacement-v1` | unchanged |
| Commit | `fbe88cdd7639f32f48d92a0627833918b4924458` | exact source/rollback base; not a Phase D Candidate |
| Tree | `2525cf1b99b5a99986a959c357ce58235308e18e` | independently resolved |

This analysis does not move the checkpoint and does not use a failed successor as a new base.

### 2.2 Immutable later inputs

The following identities were inspected as evidence only:

- accepted G9 Design `5e6310256c36edbf22ce404d85891c1c869bd9db` and PASS review `ee7a7172f412804ed5c8f973207abcac1fc1cbe4`;
- failed/non-retriable successor `37056086f802b812a096a1907ef089d6fa4a167a`;
- G10 Design `1bc6e16b79b24c429826857ff16a71ae67d75271`, tree `c3e9b6c8733b9ef6d96ce06a7797cd8592064ac2`;
- G10 FAIL/INCOMPLETE review `60811c4d67b5a751ac8ce73df81e3c7df53851f8`;
- accepted G6 `6ca4d486…` and PASS review `03c2428a…`;
- G3 `a22c8d1b…`, G4 `eb388a71…`, G5 `0f7591c9…` and G5 PASS review `d8f5584c…`;
- G7/G8/G9 Designs and their review evidence as historical inputs.

The G10 review commit was absent from the currently shared object store but was recovered read-only from the supplied complete-history custody bundle. The bundle SHA-256 independently matched:

```text
e85612e7477beee78952f4f0dfa8125ddd9eadc58ea159bac3589559df22768b
```

Its explicit review ref resolved to `60811c4…`; clone, ancestry, tree and strict object verification passed. The review commit is the sole child of G10 and adds six review-only files. This makes the supplied review outcome and its recorded projection authoritative immutable evidence even though that object is not in the shared store.

## 3. Exact G10 review failure chain

### 3.1 What was projected

The G10 reviewer discovered six physical pnpm-state candidates at review time. None had both byte-exact G10 root `package.json` and lock identity; one had the exact lock and equal dependency semantics. The reviewer selected that one and constructed a disposable proof root as follows:

1. clone/check out exact G10;
2. preserve G10's target `package.json`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml`;
3. use APFS `clonefile`/CoW semantics to copy the selected full physical `node_modules` tree;
4. change only the project-root key in `node_modules/.pnpm-workspace-state-v1.json` from the source root to the disposable root;
5. project the exact proposed `src/app/layout.tsx`, `src/seo/nonproduction-indexing.test.ts`, and two WOFF2 assets;
6. leave checker, Next config, package config and all other Product source unchanged;
7. create task-owned PGlite/storage state and run migrations through native Node/project-local `tsx`;
8. run `pnpm exec next typegen .` with `pnpm_config_verify_deps_before_run=error` and the review environment's `CI=1`.

Migration completed once. Typegen returned before Next CLI entry. Consequently, no generated-root hold, Build, `BUILD_ID`, font-emission inspection or focused public-bundle observation occurred.

### 3.2 What was and was not incomplete

The selected source root and G10 target differed in these relevant ways:

| Surface | Source versus G10 target | Technical meaning |
| --- | --- | --- |
| `package.json` full bytes | different | source omitted/simplified scripts, including AI/check aliases |
| dependencies, devDependencies, package manager, engines | equal | installed dependency semantics matched |
| `pnpm-lock.yaml` | exact SHA-256 match `3ed14b1c…` | wanted lock matched virtual-store lock |
| `pnpm-workspace.yaml` text | source omitted `packages: ["."]` | installed workspace state already recorded `workspacePackagePatterns: ["."]` |
| full physical packages | present | current inspection resolves all 37 declared direct dependencies with no missing/version/canonical-root defect |
| exact source-root package bytes | absent | not package-content authority because the target checkout retained exact G10 bytes |

Thus the historic projection was not an exact *source-root package-file snapshot*. That fact was accurately reported. It was not evidence that required installed packages or files were missing. The review treated full source-root package-byte identity as a frozen prerequisite even though the difference was script-only and the disposable target continued to own exact G10 package authority. This overbroad criterion prevented the existing full installed tree from being used as an exact proof input.

The currently surviving physical candidate set is three rather than the historical six. The deleted or unavailable leaves and any private state unique to them are **UNKNOWN**. That does not block the diagnosis: the immutable review record, exact selected-state metadata, pinned pnpm source and independent current reproduction prove the first-failure authority without reconstructing those leaves.

### 3.3 Exact first pnpm currentness condition

The first error was:

```text
[ERR_PNPM_VERIFY_DEPS_BEFORE_RUN] The value of the enableGlobalVirtualStore setting has changed
Run "pnpm install"
```

Pinned pnpm `11.9.0` does the following:

1. if `CI` is true and `enableGlobalVirtualStore` is otherwise null, compute current `enableGlobalVirtualStore=false`;
2. include `enableGlobalVirtualStore` in the workspace-state setting keys;
3. compare settings before lockfile/manifest status;
4. return the first settings mismatch;
5. in `verify-deps-before-run=error`, throw before spawning the child.

The projected stored state omitted the key, so its value was `undefined/null`; the G10 review's injected `CI=1` made the computed current value `false`. Those are unequal under pnpm's comparison. No Next process was launched, and the suggested install was correctly prohibited.

Accepted G6 review evidence had already identified the same harness behavior: a `CI=1` reproduction failed, while the no-`CI` typegen entered Next successfully. G10 accidentally reintroduced the known incompatible harness input.

### 3.4 Independent zero-build confirmation

The escalation probe used an exact G10 target checkout, a CoW copy of the full installed dependency source, and the single root-state rebind. It performed no install, update, download, removal or Build.

| Probe | Result |
| --- | --- |
| `pnpm exec` marker, `CI=1`, error mode | same settings error; child marker absent |
| same marker, `CI` absent, error mode | PASS; child entered Node `24.14.0 arm64` |
| workspace state before/after, volatile timestamp normalized | same SHA-256 (`067d981e…`) |
| non-volatile state delta | none |

This proves that the installed projection can be pnpm-current without install. It does not claim that a future `pnpm build` has passed.

## 4. Authority separation

| Authority | What it controls | Escalation finding | Status |
| --- | --- | --- | --- |
| Product local-font correctness | exact `next/font/local` source, WOFF2 bytes, layout/fallback/SEO behavior | static review passed; runtime reached local generated CSS; no completed Build/emission | **unproven, not disproved** |
| pinned Next `16.2.12` default-Turbopack Build semantics | real native Next/Turbopack compilation and emission | exact CLI entered Turbopack; stopped on sandbox IPC before completion | **unproven** |
| dependency snapshot/materialization | exact installed package content available to target | full tree, exact lock and 37/37 direct dependencies verified; adequate for direct CLI | **adequate; not failed** |
| pnpm package-script/currentness | pnpm preflight plus package-script dispatch | G10 review failed because harness `CI=1` changed current settings; no-`CI` zero-build probe passed | **review harness failed; future implementation gate unproven** |
| execution sandbox IPC | ability of Turbopack to run its loopback child-process pool without external egress | default sandbox denied `127.0.0.1:0` bind with `EPERM` | **failed execution authority** |

The fifth row is not a new Product or external-network capability. It is a proof-runner requirement exposed only after the earlier pnpm defect was removed.

## 5. Evaluation of replacement proof authorities

### A. Exact package-script/pnpm authority

Do not use A as the Design-level font proof authority. It conflates Next/Turbopack semantics with package-script dispatch and pnpm workspace currentness, allowing irrelevant root-script or environment settings to stop the proof before Next. A remains mandatory in the later fresh implementation Candidate: currentness must be checked in error mode, and Gate 8 must invoke exact `pnpm build` once.

### B. Hash-bound direct native Node → project-local Next public CLI

**Recommend B, and only B.** Verify the target package/lock/workspace, full task-local installed tree, all direct dependencies, Next package and public CLI bytes, native SWC package/binary, and Node identity. Invoke:

```text
node node_modules/next/dist/bin/next typegen .
node node_modules/next/dist/bin/next build
```

The public CLI is the same pinned Next entry that the package script ultimately executes. This removes pnpm from a property for which pnpm is not authority while keeping the real default-Turbopack compiler. It may not be presented as package-script or implementation Gate 8 evidence.

### C. Complete task-local APFS CoW clone with exact root/state rebind

A complete CoW clone is an efficient byte-transport operation, not a separate proof authority. Under B, the installed tree can be cloned without rebinding pnpm workspace state because pnpm is not invoked. Making C the authority would preserve the workspace-state and currentness machinery that caused the first false stop.

### D. Content-addressed dependency snapshot outside the repository

Reject D. It would add snapshot creation, retention, restoration, manifest, storage and provenance authority to a one-property Design proof. No authorized process currently produces such a snapshot, and creating it as a new baseline risks covert install/update authority. If the verified full local tree is unavailable, the task should block rather than materialize a substitute.

### E. Other mechanisms

Reject `.bin` wrappers, direct pnpm internals, experimental Next internals, loader-only probes, forced Webpack, environment bypasses, or a bespoke runner. They either reintroduce irrelevant layers or prove a different compiler path.

## 6. One bounded actual Build diagnosis

### 6.1 Prerequisites closed before the Build

The disposable tree used:

- exact G10 target package SHA-256 `21d7b63e…`, lock/virtual-lock SHA-256 `3ed14b1c…`, and workspace SHA-256 `735fc96d…`;
- Node `24.14.0 arm64`, Next `16.2.12`, 37/37 direct dependencies, no missing/version/canonical-root defect;
- hash-bound Next public CLI `1938ac0a…` and native SWC binary `388f0483…`;
- exact projected layout SHA-256 `7d4de164…`, SEO test SHA-256 `68b18aa…`;
- exact Geist WOFF2 SHA-256 `1b5ebfb3…` (28,356 bytes) and Geist Mono WOFF2 SHA-256 `b7ac144b…` (31,288 bytes);
- task-owned PGlite migrated through `0020`, with no seed, Product, customer or formal data;
- task-owned public/private/import roots and conspicuously synthetic environment values;
- numeric `http://127.0.0.1:3200`, no Provider/API/real Secret/real DB/proxy/registry authority;
- execution-platform external network restriction;
- exact G6-type semantic lifecycle: one direct typegen, atomic generated-root hold, then one Build.

No Google import/mock/env/host authority remained in Product source. No checker/config/other Product file changed.

### 6.2 Result

The only actual diagnostic Build was:

```text
node node_modules/next/dist/bin/next build
```

There was no `--webpack`, retry or second Build. The process displayed:

```text
Next.js 16.2.12 (Turbopack)
Creating an optimized production build ...
```

It failed in the local-font generated CSS path:

```text
[project]/src/app/geistmono_a59faa87.module.css [app-rsc] (css module)
PostCssTransformedAsset::process
evaluate_webpack_loader
creating new process
binding to a port
Operation not permitted (os error 1)
```

Pinned native-binary inspection corroborates that the Turbopack child-process pool binds/listens/accepts on `127.0.0.1:0`. A separate minimal bind in the same sandbox returned `EPERM`. This is an execution-policy failure, not a native Google-font lookup. The generated `geistmono_…module.css` identifies the reached `next/font/local` transform but does not prove final CSS or media emission.

Terminal Build facts:

- `BUILD_ID`: absent;
- emitted WOFF2: zero;
- complete emitted CSS: zero;
- native/Google-font error: none observed;
- focused `check-public-bundle`: not run because no complete Build;
- diagnostic Build PASS: false;
- implementation Gate 8 PASS: false.

### 6.3 Replacement runner preflight

After the Build ceiling was consumed, a zero-Build OS-sandbox preflight validated a profile with this effective policy:

```text
allow default
deny network*
allow localhost ephemeral bind/inbound/outbound only
```

Within it, runtime Node bound exact numeric `127.0.0.1`, accepted a self-connection and exited successfully. The macOS sandbox grammar accepts the host token `localhost`; an attempted literal-IP profile was rejected at profile parse before Node. The future proof must therefore bind/connect exact numeric `127.0.0.1` at runtime while the enclosing policy uses its platform-supported localhost selector and denies all non-loopback network. No Build was rerun under this profile.

## 7. Which supporting isolation is genuinely necessary

- **Task-owned migrated PGlite:** necessary for whole-application Build/static generation, not evidence about the font itself. Migration must be one direct native Node/project-local `tsx` invocation; no seed/business data.
- **Numeric loopback application origin:** necessary for the accepted synthetic origin contract. It is not authority to contact any service.
- **Loopback IPC:** independently necessary for pinned default Turbopack's child-process pool. It is restricted to ephemeral localhost and is separate from external egress.
- **No external execution:** essential. DNS, non-loopback TCP/UDP, live official-source reads, Provider/API and external databases remain denied/deferred.
- **G6 generated-root lifecycle:** retain typegen → hold → fresh Build → restore semantics because later gates consume the generated root. Do not retain the S0-S6 inode/cache evidence ceremony for a Design-only font proof.

## 8. Complexity drift, G3–G10

| Generation | Added mechanism | Root-cause disposition |
| --- | --- | --- |
| G3 | migrated PGlite, localhost Google mock server/counters, CoW dependencies, pnpm currentness, ten gates/two outputs | retain real isolation/gate contract; remove font mock server/counters |
| G4 | copied-font map and quoted absolute CSS URLs | remove |
| G5 | URL grammar/parser and full JS Google-loader probe | remove; Gate 8 diagnosis showed it proved Webpack JS loader, not native Turbopack Google behavior |
| G6 | official typegen, two holds, S0-S6 inode/hash state machine | retain lifecycle semantics and zero retry; remove per-state filesystem ceremony |
| G7 | four route tests/thirteen origin cases plus cache assumptions | retain accepted origin behavior; remove incidental cache proof |
| G8 | `.vite-temp` state machine, 21 one-second observations/gate, four metadata classes, clone-wide delta | remove and replace with one bounded preflight/result |
| G9 | checker binding plus parent timestamp/temp-leaf obligations | retain checker binding/proof ceiling; remove incidental filesystem ceremony |
| G10 | local fonts correctly replace Google machinery, but exact source package prerequisite remains layered on G6/G9 | retain proposal semantics pending new approval; remove source-package prerequisite and repeated machinery |

The escalation must converge this into one compact Design proof and the existing mandatory implementation gate contract. It must not add a dependency-snapshot service, new proof state machine, or new persistent coordinator.

## 9. Governance and lineage convergence

### 9.1 Retain as named authority

The fresh line from `fbe88cdd…` must explicitly import/reference, rather than silently infer:

1. `docs/PHASE_1B_STAGE4A_PHASE_D_SYNTHETIC_ONLY_BOUNDARY_OWNER_DECISION_V1_0.md` from accepted G9 — synthetic-only Phase D, external validation deferred to Phase F, affected credential rotation required before reuse, terminal pause;
2. accepted G6 `6ca4d486…` plus PASS review `03c2428a…` — semantic typegen/fresh-Build/restore lifecycle and zero retry only;
3. accepted G9 `5e631025…` plus PASS review `ee7a7172…` — synthetic profile, two runtime outputs, four-probe ceiling, thirteen accepted origin cases, clean/direct-parent checker binding, task-local dependency/error-mode, fresh ten-gate/no-retry implementation contract.

### 9.2 Retain only as proposed material

G10's exact `next/font/local` source semantics and the two exact local font assets may be named by a new superseding Exact Design. They are not accepted authority and may not be implemented until that Design receives independent PASS. No failed commit or implementation code may be cherry-picked.

### 9.3 Discard

- all G3–G5 Google mock/copy/env/parser/loader machinery;
- G7–G9 incidental cache/timestamp/polling/metadata/inode proof mechanics;
- G10's exact ambient source-root package-bytes prerequisite and Design-level pnpm invocation;
- failed G3–G10 implementation ancestry constants and code;
- raw per-gate logs, clone-wide inventories, or full `node_modules`/Build-cache manifests.

### 9.4 Required new authority

A new compact **superseding Exact Design** and an **ADR-0020 amendment** are required because the proof runner, loopback security boundary and lineage are changing. The Owner must approve:

- B as Design/review proof authority only;
- loopback-only Turbopack IPC under external-network deny;
- fresh source lineage from `fbe88cdd…`;
- retirement of accepted-but-incidental proof mechanics while retaining the named semantic contracts.

There is no requested dependency/lock, Schema/Migration, URL/Redirect, SEO/publishing, real Product-data or external integration decision. The local-font proposal changes presentation assets only. PGlite migration execution is validation setup, not a schema change.

## 10. Root-cause conclusion

The escalation separates two proof failures from the Product proposal:

1. **G10 review failure:** the harness injected `CI=1`, creating the first pnpm setting mismatch and preventing Next typegen entry. The exact-source-package prerequisite was broader than dependency authority required.
2. **Escalation diagnostic failure:** once pnpm was correctly removed from Design-proof authority, the platform sandbox denied a loopback IPC primitive required by pinned Turbopack.

Neither failure disproves `next/font/local`. Neither permits a PASS claim. The only safe convergence is Owner approval followed by a superseding Exact Design, an independent Design/security review, and then a different fresh implementer working from the frozen checkpoint line. Until then:

```text
FONT-HERMETIC-01 = OPEN_UNPROVEN
G11 / ATTEMPT 4 = NOT AUTHORIZED
IMPLEMENTATION = NOT AUTHORIZED
CHECKPOINT MOVEMENT = NOT AUTHORIZED
NEXT GATE = OWNER DECISION
```

Bounded machine-readable evidence is stored in:

- `docs/review-evidence/phase-1b-stage4a-phase-d-font-hermetic-technical-escalation-v1/ROOT_CAUSE_EVIDENCE_V1_0.json`
- `docs/review-evidence/phase-1b-stage4a-phase-d-font-hermetic-technical-escalation-v1/DIAGNOSTIC_BUILD_RESULT_V1_0.json`
- `docs/review-evidence/phase-1b-stage4a-phase-d-font-hermetic-technical-escalation-v1/COMPLEXITY_AND_LINEAGE_EVIDENCE_V1_0.json`
- `docs/review-evidence/phase-1b-stage4a-phase-d-font-hermetic-technical-escalation-v1/MANIFEST_V1_0.json`
