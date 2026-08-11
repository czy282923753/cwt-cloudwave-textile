# CWT Stage 4A Phase B — Fresh Replacement Implementation H-01/M04 Final Remediation V3.0

## 1. Outcome and identity

This is H-01/M04 correction attempt 3, the final ordinary attempt. It is a bounded implementation Candidate for Fresh independent re-review, not acceptance or self-approval.

- Branch: `codex/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-implementation-h01-m04-final-remediation-v3`
- Preserved failed attempt-2 Candidate: `d41c9c4bd496f4c3a612c6ac88cc5acf6ae83308`
- Exact corrected code HEAD/parent/tree: `df3369e5459c9eaf45186ee3140d94495254bf22` / `d41c9c4bd496f4c3a612c6ac88cc5acf6ae83308` / `6574602ac86d0d30dcc64aa585f83257410c99b2`
- Product-code delta: exactly two modified paths, `scripts/verify-ai-architecture.ts` and `test-fixtures/ai-architecture/graph-faults.v3_1.json`; zero add/delete/mode changes
- Merge commits: zero; no amend, rebase, merge, cherry-pick, checkpoint or history rewrite

Every successor after the corrected code HEAD is docs-only. The final Candidate commit is resolved and checked by the evidence verifier and delivery callback.

## 2. H-01 root correction

The exact attempt-2 Reviewer patch was reproduced before correction. The real gate exited `0` with `ok=true` when protected source declared non-emitting `fetch`, `WebSocket` and `window` symbols and then invoked the corresponding runtime capabilities.

The sole TypeChecker-based capability-origin authority no longer equates a repository declaration with a runtime-local binding. It now accepts a shadow only when the resolved declaration set contains an actual runtime-emitting binding. `declare` variables/functions/classes, ambient contexts, declaration-file declarations, global augmentations, type-only imports and overload-only declarations do not manufacture a safe origin. Mixed overload sets remain safe when they include a real implementation. Value imports, parameters, local variables, function implementations and class implementations remain valid emitted shadows.

After correction, the same protected-source patch makes the real gate exit `1` with exact `path`, rule, `Identifier` AST position, `origin=typescript_resolved_non_emitting_repository_declaration` and `capability=fetch` diagnostics before reachability. Fourteen new non-emitting-origin faults cover the combined witness, individual `declare var/let/const/function/class`, global augmentation, ambient namespace, type-only import and property/container/bind/call/apply/IIFE forms. The inherited attempt-1 `globalThis` and attempt-2 semantic vectors remain fail-closed.

The only Production global exception remains exact direct non-optional `globalThis.cwtDatabaseConnection` access in `src/db/client.ts`. Wrong path, wrong member, computed, captured and destructured forms remain denied. No second checker, compatibility path, Provider exception or runtime source workaround was added.

## 3. Verification at exact code HEAD

- Architecture: PASS; 634 candidates, 473 executables, 12 classes, zero unclassified/ambiguous, 69 fault/topology probes, 10 positives, 28 inherited mutations, 21 ordinary URL values, zero Production static-resource candidates, M03 2 positive / 6 expected-negative seams.
- Complete AST, graph, origin/nonreachability, composition and server/public proof contracts: PASS; exactly five canonical artifacts bound to `df3369e...`.
- All `src/ai`: 14 files / 163 tests PASS.
- H-02/NH01 real-service non-regression: 1 file / 6 tests PASS; H-02 remains CLOSED.
- DB/schema/noindex/public focused: 7 files / 8 tests PASS.
- Repository lint: PASS with zero warnings. Strict typecheck: PASS.
- Accepted 0020 verifier: PASS; 40 historical artifacts.
- Independent Schema mapping: `ai_model_config=21/21`, `ai_runs=96/96`, Design/Snapshot/Drizzle/Migration exact order.
- Prompt bundle/history: PASS. Production Prompt manifest and Provider registry: exact-empty.
- Accepted V2.2 package: `PACKAGE_CONSISTENCY_PASS_NOT_INDEPENDENT_ACCEPTANCE`.
- Official Next 16.2.12 typegen: PASS under OS-level network denial with unchanged generated hashes.
- Isolated Next webpack server/public bundle: PASS under OS-level network denial; 51 server files, 16 public chunks, server-only markers/raw Synthetic Prompt absent from public chunks, positive leak control PASS.
- Frozen diffs: zero `src/**` delta from failed attempt 2; zero public/Product/SEO/URL and Schema/Migration/package/lock/config delta from the accepted start.

The unrelated exhaustive application suite was not rerun. The correction is confined to one non-runtime checker and its single profile fixture; the real semantic gate, all fault/positive/mutation probes, all AI tests, focused DB/public tests, lint, strict typing, Schema, Prompt, typegen and isolated bundle directly cover the changed and preserved risk. An unrelated suite would not exercise the TypeChecker declaration-emission classification further.

## 4. Evidence and process truth

The controlling independent FAIL report and its seven-artifact evidence membership were imported byte-identically. Its report SHA-256 is `c4417c...`, narrative SHA-256 is `61d3b6...`, decisive patch SHA-256 is `b7dc65...`, and independent manifest SHA-256 is `a32892...` with 7/7 verified.

The structured authority is `H01_M04_RUNTIME_EMITTING_ORIGIN_REMEDIATION_V3_AUTHORITY_V1_0.json` with SHA-256 `dc0f89...`. It is the sole current authority; this Markdown is non-authoritative. One current manifest and one verifier bind the authority, verification capture, changed-path inventory, imported FAIL package, five M04 artifacts, exact corrected code HEAD/tree and docs-only successor rule.

The Next standalone tracer produced a small untracked dependency trace and fixture `next-env.d.ts`; both were moved outside the repository before clean proof emission and were not committed. Initial proof invocations either supplied unsupported equals-style arguments or included the standalone symlink and correctly emitted no evidence; the successful exact invocation used alias-free external bundle inputs. No install, dependency materialization, download, registry, Provider/API/credential/network/spend, deployment or Phase C/D/E action occurred.

The accepted V3.1 historical `tsconfig` metadata mismatch and unchanged offline Google Font full-public-build debt remain disclosed external/process debt. Actual immutable compiler inputs are bound; no config, public or font code changed, and no unrelated full public-build PASS is claimed.

## 5. Disposition and next gate

H-01 is a corrected final ordinary Candidate awaiting Fresh independent re-review; it is not independently closed. H-02 remains CLOSED as non-regression-only. DB, M02, NM01, M01, M03, M05, L01, L02 and all frozen Provider/Prompt/security/public/SEO/URL/Schema/Migration/package/lock/phase boundaries remain preserved.

The next gate is Fresh Independent Implementation Re-review. It must first execute `REMEDIATION_FINDINGS_REVIEW` for H-01 attempt 3 and every affected or preserved closure, then decide `FULL_REVIEW_NECESSITY` with rationale. Identity, checkpoints, manifest, frozen boundaries and security are mandatory. If the same H-01/M04 root remains OPEN after that review, THREE-STRIKE escalation is mandatory and ordinary attempt 4 is prohibited.
