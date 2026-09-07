# Stage 6 Bundle / Image Contract Technical Escalation V1.0

Recorded: 2026-09-07

Role: **Independent Technical Root-Cause Analyst**

Status: **ANALYSIS COMPLETE / REPAIR-PLAN CANDIDATE — awaiting coordinator verification and freeze; Stage 6 remains Partial / HOLD**

This is a report-only Technical Escalation artifact. It neither changes Product code nor authorizes a Product build, Push, Registry write, workflow run, cloud/Runner action, Runtime execution, deployment, lifecycle transition or Phase acceptance.

## 1. Authority, baseline and immutable failure evidence

- Last accepted Product/phase baseline: `a200838be34c8834a00bdcf6d1819da96e2ad26c`.
- Exact analysis and rollback point: integrated checkpoint and remote `main` `1eecba71e6768661156d0292951f0918d29c00be`.
- `1eecba71...` preserves both accepted lines: Runtime preparation/recovery Review `da2fa43dd9c4a1b2b669766b8afeecee8ebaa95c` and Product bundle dependency/outcome correction Review `c38b073a89802d0c53bcc7c61d4c95d292e94212`. Neither line may be discarded.
- Principal live-attempt record: report-only commit `bb3395ff0c384337a43d87d7900b07bffcdd82ed`, `docs/PHASE_1B_STAGE6_LOCAL_STREAM_INTEGRATION_REPORT_V1_0.md`.
- Earlier accepted correction evidence: `docs/PHASE_1B_STAGE6_LOCAL_STREAM_INTEGRATION_INDEPENDENT_REVIEW_V1_0.md` at `c38b073a...`.
- Old Runtime subject `78c882345d522d7a83cae9296c26499d49ab2521` / index `sha256:fc96539ee4c51895c1c1fedc8ef873e2fc92b5898c55f273f03d81656d779f0e` remains unusable because its shipped checker cannot import TypeScript.
- New Build Once run `34132330763`, job `101775159015`, attempt `1`, head `1eecba71...` emitted index `sha256:5ea0592ea6dbebcb26efd744e087cd4d7f527ca82e10dc3509f4342ef52bff93`, then failed its first `linux/amd64` exact-image checker before a bundle assertion. Revocation artifact `10022838887` binds that index to `post_emission_gate_failed`; it is not a Runtime subject. `linux/arm64` was not evaluated.

The frozen CWT V1.1 Product/domain/security/public-private/AI-draft/noindex rules are unaffected. No schema, Migration, SEO URL, Redirect, storage, publication or modular-monolith boundary changes are proposed, so no architecture ADR is required for this repair plan.

## 2. Decisive diagnosis

### Immediate cause

`scripts/check-public-bundle.mjs` starts `assertFreshBuild()` before any AST, server marker, client manifest or public-leak assertion. Its ordered workspace input list is:

1. `src`
2. `scripts`
3. `package.json`
4. `pnpm-lock.yaml`
5. `next.config.ts`

The runtime stage copies `src`, `scripts`, `package.json` and `tsconfig.json`, but copies neither `pnpm-lock.yaml` nor `next.config.ts`. The emitted `linux/amd64` child therefore failed at the first absent item, `stat('pnpm-lock.yaml')`. Copying only that file would deterministically move the startup failure to the also-absent `next.config.ts`; it would not close the interface.

### Root cause and misplaced responsibility

One executable currently mixes two different responsibilities:

- **Workspace freshness:** detect a developer checking an old `.next` after editing source.
- **Artifact content authority:** inspect the actual generated Next server/client output for required server-only evidence and forbidden public leakage.

The second responsibility is valid in all three callers: development verification, each emitted Build Once child and the exact-digest Runtime validator. The first belongs only at the mutable development-workspace boundary. It is not a meaningful property of a read-only immutable image.

Build Once already owns source/image identity through a clean exact Git commit/tree, `CWT_RELEASE_ID`, one no-cache Docker build graph, `COPY . .`, `pnpm build`, the build-stage `BUILD_ID == CWT_RELEASE_ID` assertion, OCI child digests and the digest-bound release record. Runtime already owns exact-image identity through the release header, exact index/child materialization and digest inspection. Re-reading copied source mtimes inside the image duplicates neither authority correctly.

The mtime rule is also transport-dependent rather than content-dependent. The Build Once exporter uses `SOURCE_DATE_EPOCH=<commit time>` with `rewrite-timestamp=true`; BuildKit documents that this rewrites timestamps of files inside the exported image to the epoch ([BuildKit reproducible-build documentation](https://github.com/moby/buildkit/blob/master/docs/build-repro.md#source_date_epoch)). On a fresh Actions checkout, source mtimes later than the commit epoch may therefore become equal to the generated `BUILD_ID` mtime. In another local checkout, older mtimes may remain older. Equal or older timestamps say nothing additional about whether the digest contains the intended source/build relationship.

Even in a workspace, the list is not a complete Next build-input model: it omits at least `public`, `tsconfig.json` and `pnpm-workspace.yaml`, while treating every operational file under `scripts` as a bundle input. It is therefore a convenience heuristic, not a content or provenance proof.

### Why supplying build-only files is the wrong default

Adding both missing files to the final image is mechanically small but semantically weak:

- it ships build-resolution/configuration inputs that the runtime checker does not read for content;
- it converts exporter-normalized timestamps into a tautological pass rather than an image-integrity proof;
- it leaves the next change to the workspace input list capable of breaking a future external Build Once again;
- it preserves duplicate authority between source freshness and exact OCI identity; and
- it does not prove that the checker can finish all real bundle assertions in the emitted filesystem.

No timestamp touching, copied repository closure, hash manifest, new evidence state, alternate checker or skip/bypass flag is justified.

## 3. Complete checker contract at `1eecba71...`

| Contract input | Current origin | Workspace meaning | Immutable-image meaning | Disposition |
| --- | --- | --- | --- | --- |
| Node.js plus `typescript@5.9.3` | Host install or runtime `/app/node_modules`; exact dependency is now production-scoped and SBOM-gated | Required to execute the checker and parse emitted JavaScript AST | Genuinely required shipped runtime dependency | **Keep unchanged** |
| Checker program | `scripts/check-public-bundle.mjs`; runtime `/app/scripts/check-public-bundle.mjs` | Artifact policy implementation | Same policy implementation executed from the shipped image | **Keep one checker** |
| Base path / current working directory | Relative source/freshness paths currently resolve from `process.cwd()`; image relies implicitly on `WORKDIR /app` | Usually repository root | Hidden caller/config dependency | **Anchor repository-layout paths to the checker’s own `scripts/..` root** |
| `CWT_BUILD_DIR` | Defaults to `.next`; both image callers pass `/app/.next/standalone/.next` | Selects build under inspection | Selects the exact shipped standalone build | **Keep; resolve canonically from the anchored root when relative** |
| `BUILD_ID` bytes | Next build output; Docker build already asserts equality to `CWT_RELEASE_ID` | Confirms a production build artifact exists | Genuinely present artifact; identity equality is already owned by Docker/OCI gates | **Keep non-empty presence check; remove mtime comparison** |
| `src/ai/prompts/generated/production-prompt-bundle.generated.ts` | Build source copied under runtime `/app/src/...` | Supplies the four approved tuples and raw Base64 values | Needed so raw prompt bytes, not only IDs/hashes, are forbidden in public chunks | **Keep as the one genuine non-build data file; anchor its path** |
| Entire `src`, entire `scripts`, `package.json`, `pnpm-lock.yaml`, `next.config.ts` mtimes | Mutable workspace input inventory | Weak stale-build heuristic; incomplete as a complete Next input model and sensitive to clock/checkout behavior | Invalid duplicate freshness authority; two files are not shipped and exporter normalization destroys the intended ordering meaning | **Delete this mtime inventory from the checker** |
| `.next/server` executable JavaScript | Next standalone output copied from the same build stage | Proves required server emission exists | Proves shipped server emission exists | **Keep all current eligibility, realpath and regular-file assertions** |
| AI markers and exact Prompt tuple AST bindings | Hard-coded accepted constants plus emitted server JS | Prevents server authority disappearance/drift | Same security/content invariant | **Keep unchanged** |
| Rate Limiter, File Scanner and governed Turbopack runtime/entrypoint evidence | Emitted server JS/chunks | Proves server-only infrastructure is emitted and linked | Same security/runtime invariant | **Keep unchanged** |
| Public client-reference manifests | `.next/server/app/**/*page_client-reference-manifest.js`, excluding the governed admin/preview/login prefixes | Defines public client chunk reachability | Same shipped reachability | **Keep framing, route-key, descriptor and path validation unchanged** |
| `.next/build-manifest.json` root chunks | Next output | Adds root chunk coverage | Same shipped coverage | **Keep unchanged** |
| `.next/static` and referenced chunks | Next output copied into standalone `.next/static` | Detects forbidden strings, native `.node` leakage, missing files and path/symlink escape | Same public-exposure invariant | **Keep unchanged** |
| Embedded forbidden needles and exact framework markers | Checker source | Policy data | Policy data | **Keep unchanged** |
| File mtimes / `SOURCE_DATE_EPOCH` | Workspace filesystem and OCI exporter | Useful only as a heuristic when no build sequencing exists | Reproducibility metadata, not freshness evidence | **Workspace uses command sequencing; image identity remains digest-owned** |

The artifact checker therefore needs only: its Node/TypeScript runtime; its own anchored root; the one generated Prompt authority source; a non-empty `BUILD_ID`; and the generated `.next` server/static/manifests/chunks it actually inspects. `pnpm-lock.yaml`, `next.config.ts`, `pnpm-workspace.yaml`, `tsconfig.json`, the whole repository and an input hash manifest are not checker runtime inputs.

## 4. Why accepted local tests missed the emitted filesystem interface

1. `deploy/scripts/build-release-once.test.mjs` production-only smoke copied `package.json`, `pnpm-lock.yaml` and `pnpm-workspace.yaml`, installed production dependencies, then deliberately pointed the checker at a missing build. It proved TypeScript bootstrap only and stopped before the checker could enumerate the later runtime filesystem contract.
2. Its two-platform `verifyLoadedBundle` test injects a fake process executor and verifies only Docker arguments plus nonzero rejection. No container, rootfs or checker assertion runs.
3. `src/public-site/public-bundle-check.test.ts` runs the repository copy of the checker with `cwd=process.cwd()`. Its temporary fixture supplies only `CWT_BUILD_DIR`; all `src/scripts/package/lock/config` reads silently come from the full development repository.
4. That fixture sets `BUILD_ID` sixty seconds into the future. This intentionally makes semantic bundle cases independent of source mtimes, but also prevents them from validating the actual emitted-image time model.
5. The 157 passing bundle cases are strong evidence for individual AST/manifest/path/leak assertions, not for production dependency closure or final-image filesystem closure.

The test design checked three fragments separately—dependency startup, command envelope and bundle semantics—but never composed them under one runtime-shaped root. The new external run found the first uncomposed edge.

## 5. Alternatives and recommendation

| Alternative | Benefit | Cost / risk | Decision |
| --- | --- | --- | --- |
| Copy `pnpm-lock.yaml` and `next.config.ts` into runtime | Small Dockerfile edit; likely passes the two missing stats | Ships irrelevant build inputs; normalized mtime check remains non-authoritative; future list drift repeats the failure class | **Reject** |
| Add `--skip-freshness` / environment bypass for images | Small apparent diff | Negative bypass is easy to misuse and preserves mixed responsibilities | **Reject** |
| Add a source/build hash manifest or second image validator | Can prove a stronger relation if designed fully | New state/evidence authority, duplication and maintenance cost; existing Git/OCI/build graph already owns identity | **Reject** |
| Remove all build-presence checks | Simplest | Weakens clear refusal when no production build exists | **Reject** |
| Move freshness to existing workspace command order; keep one context-neutral artifact checker | Uses standard process sequencing, narrows the checker, preserves exact-image assertions and avoids new state | `pnpm check:bundle` becomes intentionally build-producing and therefore slower when invoked alone | **Recommend** |

Recommended replacement:

- `pnpm check:bundle` becomes `pnpm build && node scripts/check-public-bundle.mjs`.
- The aggregate `pnpm check` removes its separate direct `pnpm build` and calls `pnpm check:bundle` once, so it still performs exactly one build.
- The checker retains a clear non-empty `BUILD_ID` presence assertion but deletes the source-input mtime walk and stale-build comparison.
- Repository-layout data is resolved from the checker’s own location, not ambient cwd.
- Build Once and Runtime continue calling the same checker directly against the same absolute shipped build root under their existing no-network/read-only/non-root envelopes.
- No lock/config files are added to the runtime image, and no accepted AST/security/public-leak assertion is skipped or weakened.

This is replacement, not layering: command sequencing replaces mtime freshness; existing OCI/digest authority remains the sole image-identity authority; the checker remains the sole bundle-content authority.

## 6. Exact allowed implementation scope

A fresh Implementer may modify only:

1. `scripts/check-public-bundle.mjs`
   - derive the repository/runtime layout root from `import.meta.url` (`scripts/..`);
   - resolve the default/relative build root and generated Prompt authority from that root;
   - retain the non-empty `BUILD_ID` check;
   - delete `inputRoots`, recursive source mtime collection and the `newest > BUILD_ID.mtime` branch;
   - leave every downstream AST, server marker, Scanner, Rate Limiter, Turbopack, manifest, path-containment, native-leak and forbidden-public-content assertion unchanged.
2. `package.json`
   - make `check:bundle` build immediately before running the artifact checker;
   - remove the now-duplicate direct build step from `check`, preserving one build and the existing gate order.
3. `src/public-site/public-bundle-check.test.ts`
   - remove future/stale mtime fixture manipulation and the obsolete stale-mtime assertion;
   - preserve all semantic positive/negative bundle cases and the dependency-bootstrap diagnostic case;
   - retain a clear missing/invalid `BUILD_ID` rejection.
4. `deploy/scripts/build-release-once.test.mjs`
   - replace the current “production install reaches missing-build” ceiling with a production-only, runtime-shaped full-checker probe as specified below;
   - retain both platform command-envelope checks and nonzero Build Once rejection.

No new file is required. In particular, the Implementer must not modify `Dockerfile`, `pnpm-lock.yaml`, `.github/workflows/*`, `deploy/scripts/build-release-once.mjs`, `deploy/scripts/preflight-linux-runtime.mjs`, `deploy/scripts/preflight-image.mjs`, release/registry logic, Product/domain code or frozen governance documents. If implementation shows one of those files truly must change, stop and return a plan delta to the coordinator instead of widening scope.

The accepted TypeScript production dependency, runtime version assertion, SBOM pin, both emitted-child gate, sanitized diagnostics, Runtime outcome handoff and recovery work remain intact.

## 7. Minimum meaningful local proof obligations

The fresh implementation must complete all of the following without a CWT Product build:

1. **Runtime-shaped success:** in one disposable root, copy the real checker to `scripts/`, the exact generated Prompt authority to its anchored `src/...` path, and install the locked production dependencies offline. Materialize a valid Synthetic compiled build at `.next/standalone/.next` containing:
   - non-empty `BUILD_ID`;
   - valid `build-manifest.json`;
   - eligible server runtime JS with both AI markers, both Rate Limiter markers, the exact four closed Prompt tuples, one co-located Scanner factory/module identity, the governed Turbopack runtime and a referencing application entrypoint;
   - one valid public client-reference manifest;
   - its referenced public chunk and static tree.

   Remove the temporary install-only `.npmrc`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `node_modules/.modules.yaml` and `node_modules/.pnpm-workspace-state-v1.json` before execution; do not add `next.config.ts`. Run the copied checker from a different ambient cwd with `CWT_BUILD_DIR` set to the runtime-shaped absolute path. It must exit `0` and emit the normal `Public bundle boundary verified` completion line. This proves the whole checker, production dependency and anchored shipped layout compose without build-only files.
2. **Intended rejection:** mutate only the Synthetic public referenced chunk to contain one existing forbidden marker (for example `@refinedev`) and rerun the same checker. It must exit nonzero, emit exactly the existing allowlisted `bundle_assertion_or_unknown_failed` detail and retain the specific public-leak refusal on stderr. This proves the layout correction did not bypass the security/content gate.
3. **Required-data rejection:** remove or corrupt the anchored generated Prompt authority or `BUILD_ID`; the checker must fail closed. This distinguishes genuinely required data from deleted workspace-only inputs.
4. **Semantic regression:** run the complete `src/public-site/public-bundle-check.test.ts` suite. All retained AST, Scanner, Rate Limiter, manifest framing, traversal/symlink, root-chunk, native-addon and forbidden-needle cases must pass.
5. **Production dependency:** the disposable `pnpm install --prod --offline --frozen-lockfile --trust-lockfile --ignore-scripts` must succeed, TypeScript must resolve from that root, and bootstrap must not depend on development packages.
6. **Caller preservation:** `deploy/scripts/build-release-once.test.mjs` must still prove both `linux/amd64` and `linux/arm64` use `--pull never`, network none, read-only root, UID/GID `10001:10001`, all capabilities dropped, `no-new-privileges:true`, the absolute standalone build root and the shipped checker; nonzero remains fatal.
7. **Workspace sequencing:** parse `package.json` and prove `check:bundle` contains exactly one successful-build-then-checker sequence, while aggregate `check` reaches it once and no longer runs a second direct build.
8. **Static quality:** `node --check` for changed `.mjs`, targeted ESLint, JSON parsing, `git diff --check` and an exact four-file diff inventory must pass. `pnpm-lock.yaml` must be byte-unchanged.

Current baseline evidence, not completion evidence for the future implementation:

- `src/public-site/public-bundle-check.test.ts`: **157/157 PASS** on `1eecba71...`; semantic-only ceiling described above.
- `deploy/scripts/build-release-once.test.mjs`: **6/6 PASS** on `1eecba71...`; fragmented-interface ceiling described above.
- A read-only probe of retained older local image `cwt.local/release:7a63f4647b652857c3882f004a7bcb54b38cca5b` observed `BUILD_ID`, `src`, `scripts`, `package.json` and `tsconfig.json`, but no `pnpm-lock.yaml` or `next.config.ts`; its differing older mtimes confirm filesystem history varies. This older image is structural evidence only and does not prove the current source, current checker or failed `1eecba71...` subject.
- No new Product build, image, OCI layout, Release or Registry object was created for this analysis.

These local proofs close the complete known checker interface and prevent another one-missing-file-per-external-build loop. They do not prove that a fresh real Next 16.2.12 emission satisfies every checker marker; that residual boundary is addressed below.

## 8. Pre-release rehearsal and formal Build Once

The previous blanket interpretation of “no local Product build” was too broad as a validation policy: it prevented an end-to-end test of the actual Dockerfile runtime filesystem before spending the single external Build Once. The missing lock/config mismatch would have been visible in such a rehearsal. It does not follow that every correction needs a Product build or that release Build Once may be repeated.

The mandatory runtime-shaped Synthetic probe above is sufficient to implement and review this repair without a Product build. After implementation and independent Review, the Owner may separately choose one optional disposable **non-release rehearsal** before authorizing the formal Build Once:

- one locally built single-platform runtime image from the exact reviewed Candidate, using the existing Dockerfile and a unique `cwt.local/rehearsal-*` tag;
- run only the existing shipped checker under the same no-network/read-only/non-root restriction envelope;
- no `release.json`, lifecycle state, GHCR/Registry access, workflow dispatch, external Runner/cloud action or reuse as a release subject;
- record only sanitized pass/fail and immediately remove the uniquely owned tag/container/output; do not prune shared caches or unrelated images;
- treat a pass as pre-release risk reduction only, never as Build Once, native Ubuntu/amd64 Runtime or acceptance evidence.

**Owner execution decision:** optional and not required to freeze or implement this plan. Approving it reduces the residual risk that real Next/Docker emission differs from the Synthetic fixture, at the cost of one local Product build and cleanup. Declining it leaves that risk to the separately authorized formal Build Once. The current task grants no authority to execute the rehearsal.

After a fresh implementation and separate independent Review PASS, the formal Build Once remains exactly one new immutable dual-platform emission from the exact accepted Candidate. Both child gates must pass before release evidence, GHCR authentication or publication. A new failure remains a new failed subject and cannot be repaired in place or reused for Runtime.

## 9. Rollback, residual risks and decisions

### Rollback

The rollback point is exact `1eecba71e6768661156d0292951f0918d29c00be`. Revert the future four-file implementation commit as one unit. That rollback restores the known deterministic image/checker contract defect and therefore is source recovery only, not an operationally valid release path. It does not make either failed subject usable.

### Residual risks

- Synthetic compiled fixtures prove the complete checker interface and assertion behavior, but not a fresh Next/Turbopack emission. Optional rehearsal or the formal Build Once supplies that evidence.
- The first failed emitted child stopped before downstream assertions, so a distinct real-output incompatibility may still exist. The full local fixture prevents filesystem-interface serial discovery but cannot manufacture real Next output evidence.
- `linux/arm64` was not evaluated in run `34132330763`. The checker logic is architecture-neutral, while the formal Build Once must still execute it for both exact children.
- The accepted production TypeScript footprint remains a deliberate runtime/SBOM cost; changing or bundling it is outside this plan.
- Removing mtime comparison intentionally gives up direct `node scripts/check-public-bundle.mjs` stale-workspace detection. The supported workspace command `pnpm check:bundle` replaces that heuristic with a successful immediate build, which is stronger and deterministic.

### Required decisions and next gates

- **Architecture / Owner Product decision:** none required for the four-file repair; no frozen CWT V1.1 boundary changes.
- **Coordinator decision required:** verify and freeze this exact replacement plan, then assign a different fresh `gpt-5.6-sol/high` Implementer under Technical Escalation. This analyst must not implement it.
- **Independent Review required:** a separate Reviewer must verify the exact implementation Candidate and proof obligations. Implementation success alone does not close the escalation.
- **Optional Owner execution decision:** approve or decline the bounded local non-release rehearsal after Review.
- **Separate Owner authorization required later:** one formal Build Once/Push/workflow/Registry operation from the exact accepted Candidate. Nothing in this plan consumes or pre-authorizes that action.

Until those gates complete, Stage 6 remains **Partial / HOLD**. S6-06, S6-07, deployment and Phase advancement remain blocked.
