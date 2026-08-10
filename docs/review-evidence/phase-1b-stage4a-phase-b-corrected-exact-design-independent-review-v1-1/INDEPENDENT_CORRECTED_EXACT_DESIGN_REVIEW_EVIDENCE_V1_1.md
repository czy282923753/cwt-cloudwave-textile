# CWT Stage 4A Phase B — Corrected Exact Design V1.6 Fresh Independent Review Evidence V1.1

## 1. Review boundary

- Review type: Fresh independent, design-only, read-only review.
- Exact Candidate ref: `codex/phase-1b-stage4a-phase-b-corrected-design-v1`.
- Exact Candidate commit: `49ba05ff0e40efce4ba8feb1bc87528414e3fad9`.
- Candidate worktree: `/Users/calvin/.codex/worktrees/263d/CWT（CloudWave Textile）项目`.
- Detached reviewer worktree: `/tmp/cwt-corrected-design-v16-review.FV4I0Z`.
- Network, package installation, Provider/API/credential, deployment, formal import, merge and Push actions: zero.
- Candidate changes: zero. Only this independent report/evidence package was added to the detached reviewer worktree.

The reviewer completely read the root `AGENTS.md`, `docs/ENGINEERING_GOVERNANCE.md`, `docs/REVIEW_POLICY.md`, ADR-0018, the Owner selection record, accepted V1.4 and remediation, V1.5 and its independent FAIL, V1.6, its remediation audit, the V2.1 profile, verifier and captured proof. The previously fully reviewed V1.5 body was compared to all V1.6 changed sections; V1.6's M03 replacement and every changed normative acceptance section were read directly.

## 2. Identity, history and scope

| Check | Independent result |
|---|---|
| ref resolves to exact HEAD | `49ba05ff0e40efce4ba8feb1bc87528414e3fad9` — PASS |
| direct parent | `d217a4413bbeb5c0a318caa754f37624be82e763` — PASS |
| V1.5 ancestor | `da2143654a372f70a93ff22f9fcb6e999f1e528e` — PASS |
| technical-escalation ancestor | `377181cd76e5427f344ff0c259fc9bd32ec7b670` — PASS |
| accepted rollback ancestor | `6bc26cf035608a21a057d6f4e87da8d4f7f23d40` — PASS |
| frozen annotated tag object | `1c626f9b788e4c6ed0480a7040aa54ccef3e6c76` — PASS |
| frozen tag peel | `31c0e405acfdd0d05200d0fb2531e897a541a2c4` — PASS |
| failed implementation refs | original/V1/V2/V3 all non-ancestors — PASS |
| V1.5-to-V1.6 scope | 25 added paths, 12,118 insertions, all below `docs/` — PASS |
| forbidden scope | zero source/config/test-fixture/Schema/Migration/ADR/package/lock changes — PASS |
| Candidate tracked state | clean before and after review — PASS |
| `git diff --check` V1.5..V1.6 | PASS |

The eight post-V1.5 commits are linear and docs/evidence-only. Failed implementation code is evidence only and is not an ancestor or code source.

## 3. Fixed hashes and manifests

The following SHA-256 values were independently recomputed and matched:

- V1.6 design: `06fb0795cc05e6651f63f46226c67290e108103cb567e5aa5e80a8b09a33eec2`.
- remediation audit: `d3bcf40c999672f7e7a8b3fb05c09a98457e68c9171294ac0c1ef5494ab73c31`.
- M03 profile V2.1: `12860f30803c14bda5aac2c40cc0dbbf7176093037180ccb2bb50e26addc6702`.
- author verifier: `7cd0f74dfc25d0d5cf9f7a46e556457028d37e36ef52529846b041336fad6ff8`.
- actual inventory capture: `a33cd1e9d0becd92d380911aab4bc325469f1544445ee620749a1acf231c1f2b`.
- verifier capture: `0ffcb97f8fe46a4708fdd8f8d6e5763fc57691530f8c334c6b36531ce2e54aa9`.
- V1.6 manifest: `36da610be6e29ef9fd461bd10b0d12c09fa48573384b33356aa1fc0da79af48b`, 28/28 PASS.
- imported V1.5 FAIL report/evidence/probe/output/manifest: all five fixed hashes matched; its manifest verified 17/17.
- immutable V1.5 Candidate manifest: 22/22 PASS.
- technical-escalation independent PASS manifest: 5/5 PASS through the author verifier and spot verification.

Imported historical Markdown bytes were not rewritten. The owned V1.6 diff passed whitespace checking separately.

## 4. Runtime and author verifier

Installed tools used without package-manager resolution or download:

- pinned Node `24.14.0`;
- V8 `13.6.233.17-node.41`;
- ICU `78.2`;
- Unicode `17.0`;
- CLDR `48.0`;
- `darwin/arm64`;
- TypeScript `5.9.3`;
- pnpm `11.9.0` (version observation only; no pnpm command was needed).

The default shell Node was `25.8.1`, so every positive proof used the pinned Node executable.

The author verifier was run twice independently in the exact attached Candidate worktree. Both runs returned exit `0`; the second output SHA-256 was exactly `0ffcb97f8fe46a4708fdd8f8d6e5763fc57691530f8c334c6b36531ce2e54aa9`, byte-identical to the capture. An independent `--inventory` execution produced SHA-256 `a33cd1e9d0becd92d380911aab4bc325469f1544445ee620749a1acf231c1f2b`, also byte-identical to capture. A safe runtime mismatch returned nonzero and exposed the deliberately wrong `0.0.0-runtime-mismatch` tuple before proof acceptance.

These author results were treated as internal evidence, not review authority.

## 5. Independent actual-tree reconstruction

The reviewer probe `REVIEWER_V16_ACTUAL_TREE_AND_SELECTOR_CHALLENGE_V1_0.mjs` contains a separate raw sorted `lstat` walk and selector evaluator. It reads the normative profile but does not import or call the author verifier or project source. It independently:

- enumerates actual regular files after only the 11 exact physical-root exclusions;
- rejects symlink, hard-link inode alias, special node, canonical alias and repository escape;
- derives tracked/untracked/ignored state after inclusion;
- applies the closed candidate suffix/resource/control sets;
- evaluates all 12 selectors independently with no precedence repair;
- recreates JCS inventory, content-domain and classification-domain hashes;
- exercises classification removal, overlap, generated, Phase D, adapter, second-root, silent-exclusion, sealed-exclusion, symlink, hard-link and alias-import challenges;
- adds fresh path/suffix boundaries not named by the author.

Exact current-tree result:

```text
candidates=402 executable=362 zero=0 ambiguous=0
inventory=af98fecfd5963207855478301dea528dee220057ddb3abbb85379c81f8d49e5d
content=29a1c9d740ae99b491c57412d75c7d68f9f8f6f6fe73b246ea0e70b86030996a
classification=964fb51dad53c886ead8c5506a78cd59014b38fdb5239e3ab821612e150cda6e
```

Class counts independently matched: Phase B 0, Phase D 0, adapter 0, Synthetic 0, protected AI 0, business 144, other Production 64, AI tooling 0, other tooling 25, other tests 104, diagnostic docs 56, root control 9.

All six original paths had their one required class, and every current `src/test/**` candidate was `other-test-fixtures`. The current snapshot itself had `tracked=402`, `untracked-not-ignored=0`, and `untracked-ignored=0`; therefore its successful hash does not exercise the asserted ignored-candidate completeness.

Fresh positive boundaries also passed: a nested `src/test/*.spec.ts` remained one test class despite two test signals; `src/testing/**` did not accidentally match `src/test/**`; an evidence `.test.mjs` was test-only; an unknown root config and a nested `tools/node_modules` executable remained fail-closed instead of being silently broadened.

## 6. Decisive fresh finding reproduction

The independent challenge found one deterministic counterexample on the prescribed local build path:

1. `filesystemEnumeration.executableExtensions` includes `.ts`, so root `next-env.d.ts` is a Candidate node.
2. No V2.1 root selector matches `next-env.d.ts`; its exact classification is `[]`, causing `fail_closed_unclassified`.
3. Repository `.gitignore` explicitly ignores `next-env.d.ts`, and `tsconfig.json` explicitly includes it.
4. Installed Next `16.2.12` build code invokes `startTypeChecking`, which invokes `verifyAndRunTypeScript`.
5. Installed `writeAppTypeDeclarations` joins `baseDir` with `next-env.d.ts` and writes it. The reviewer invoked that installed dependency directly in a disposable external directory; it created the file without network or Candidate mutation.
6. Because V2.1 explicitly states that ignored status cannot narrow the actual-tree scope, the next architecture-verifier run after the required normal Next build deterministically sees an ignored Candidate with zero class and fails.

This is not an unknown future root, a manually corrupted tree, or a theoretical package state. It is a declared repository file (`.gitignore`, `tsconfig`) produced by the already installed framework on the exact Phase B pass-command path. Deleting it before every architecture check would be an undocumented cleanup loop and would contradict the design's claim that actual tracked/untracked/ignored state is completely classified.

Disposition: `V15-M01 OPEN`, same root. V1.6 correctly assigns the six originally reported paths, but its purported complete causal selector still omits a normal generated ignored executable. The author mutation suite's “silent exclusion” removes `tests/**`; it does not test an actual ignored candidate or the normal build-generated state.

## 7. M03 seam and other non-regression

Independent strict TypeScript runs against installed dependencies:

| Probe | Result |
|---|---|
| selected discriminated seam positive | exit 0 |
| reviewer independent discriminated positive | exit 0 |
| unnarrowed union negative | exit 2, `TS2375` only |
| cross-driver negative | exit 2, `TS2375` only |
| destructured union negative | exit 2, `TS2375` only |

Actual `src/db/types.ts` and `src/db/client.ts` retain the stated generic `AppDatabase<TQueryResult>` and discriminated PGlite/Postgres `DatabaseConnection`. The one branch-local factory design remains literally implementable with no cast/assertion/`any`/`unknown` round trip/wrapper/visitor/second database authority.

Other proportional checks:

- selected M02 INCLUDE reviewer probe: 32 rules, 30 common plus two DeepSeek-only, full bounded gaps and byte identity — PASS;
- independent transition challenge: Unicode property sets and 4/5 plus 64/65 limits — PASS;
- exact Schema mapping probe: `ai_model_config=21/21`, `ai_runs=96/96`, order exact — PASS;
- V1.5/V1.6 mapping identity and the 13 historical H/M/L/N closures — PASS/non-regressed;
- exact four Draft use cases, human-review-only semantics, no fallback/RAG/vision/customer_support/private data, no Provider/network and Phase B/C/D/E boundaries — PASS/non-regressed;
- Owner selections `M02-D1-INCLUDE` and `M03-D1-DISCRIMINATED-SEAM` — correctly incorporated and not expanded.

No full application build/test was run. This is a docs/evidence-only design review, and the decisive failure was reproduced more narrowly using the installed Next writer in a disposable directory. Running the application build was unnecessary and would not add proof beyond the exact framework write path and zero-class evaluation.

## 8. Process conclusion

- Candidate tracked state remained clean.
- No Candidate, accepted Design, ADR, Schema/Migration, package/lock, source, test fixture or configuration file was modified.
- No network/download/install/Provider/credential/spend/Staging/Production/Deploy/Publish/Index/import/merge/Push occurred.
- Schema/Migration/ADR/dependency/Complexity/SEO/data/Owner-selection impact from the finding: none. This requires a bounded design/profile/evidence correction within the selected M03 contract, followed by a Fresh independent design review.
