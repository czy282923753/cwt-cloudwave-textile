# CWT Stage 4A Phase B — Corrected Exact Design V1.7 Fresh Independent Review Evidence V1.2

## 1. Boundary and isolation

- Review: Fresh independent, design-only and read-only.
- Exact Candidate ref: `codex/phase-1b-stage4a-phase-b-corrected-design-v1`.
- Exact Candidate HEAD: `3f475e13d73d9d68a4dfb9a040941c57f1ee92e6`.
- Formal Candidate worktree: `/Users/calvin/.codex/worktrees/263d/CWT（CloudWave Textile）项目`.
- Detached reviewer worktree: `/tmp/cwt-corrected-design-v17-review.25FfwM`.
- Disposable official-lifecycle worktree: `/tmp/cwt-v17-reviewer-official-lifecycle.98ayba/repo`, detached at the exact final HEAD.
- Candidate modification, generation, deletion and cleanup: zero. `next-env.d.ts` remained absent in the formal Candidate before and after review.
- Network, package installation/download/registry, Provider/API/credential/spend, Staging/Production, Deploy/Publish/Index/formal import, merge and Push: zero.

The review completely read the root governance and review policy, ADR-0018, Owner selection, accepted V1.4, V1.5/V1.6 designs and audits, both controlling FAIL packages, V1.7 and its audit, profile V2.2, verifier, official proof and all captures. Unchanged V1.6 material was byte-compared; every V1.7 changed normative section was read directly. Both full inventory captures and all profile records were parsed and independently evaluated rather than accepted from their summaries.

## 2. Identity, history and scope

| Check | Result |
|---|---|
| ref and exact HEAD | `3f475e13d73d9d68a4dfb9a040941c57f1ee92e6` — PASS |
| direct parent | `595e2f9a5372b0ec682772b7fe379252845c29c4` — PASS |
| Attempt-2 import parent | `799b2dd4340c244d9f609942bd097acbb2ff6ecc` — PASS |
| Attempt-2 start | `49ba05ff0e40efce4ba8feb1bc87528414e3fad9` — PASS |
| accepted rollback | `6bc26cf035608a21a057d6f4e87da8d4f7f23d40` — PASS |
| frozen tag object/peel | `1c626f9b788e4c6ed0480a7040aa54ccef3e6c76` / `31c0e405acfdd0d05200d0fb2531e897a541a2c4` — PASS |
| failed implementation refs | original/V1/V2/V3 remain non-ancestors — PASS |
| Attempt-2 history | three linear, coherent docs/evidence commits — PASS |
| scope from V1.6 HEAD | exactly 16 added paths / 23,752 insertions, all `docs/` or `docs/review-evidence/` — PASS |
| forbidden scope | zero source/config/test-fixture/Schema/Migration/ADR/package/lock changes — PASS |
| Candidate tracked state | clean before and after review — PASS |
| owned diff whitespace | PASS; imported evidence bytes retained |

## 3. Fixed hashes and manifests

All requested fixed hashes matched:

| Artifact | SHA-256 |
|---|---|
| Corrected Exact Design V1.7 | `e432fbd96029c423e5f206cbd17c5abfc48518ce4254b36095a26537afd2c834` |
| Attempt-2 audit | `a89c8ee2f42d1a1133bba00c13363a804140b65860dbebddf64f5bef979ea2d1` |
| M03 profile V2.2 | `1f0b56a870ecbab61c970e1c7000dff591674e0f8ad0a04341538c724a36c173` |
| author verifier | `d4043c6d39459d2d431afd129e5cad6ea7b2df7cfe09bfc1f15db3cd1001de63` |
| official typegen proof | `bf7495a98a95ac543b65c8e007471fbd790be05843a933f51f98f3760ebf0b37` |
| absent inventory capture | `9af475cd554b48abf336d9e95838cd0f20bcb5cb6a260f89452b036139caaf60` |
| present inventory capture | `d8a4fef3e3dae2fff5e7cda7a91730e96814c64b57961cd2a8842aea4be2a16f` |
| repeat present capture | `d8a4fef3e3dae2fff5e7cda7a91730e96814c64b57961cd2a8842aea4be2a16f` |
| generated `next-env.d.ts` bytes | `7b550dda9686c16f36a17bf9051d5dbf31e98555b30d114ac49fc49a1e712651` |
| author verifier capture | `536f3ae2fe45c7f6a7a9805e438aa4839da1bd44153a819301ac4247b3e3f37f` |
| V1.7 manifest | `f10a9eacfc40d8aa3be8cd0c495736d47de957f99cd999280409b3c09de2f1e0` |

Manifest results: V1.7 31/31; imported V1.6 FAIL 4/4; immutable V1.6 28/28; immutable V1.5 22/22; prior relevant manifests also passed through the author verifier. The five V1.6 FAIL artifacts matched `50289f...`, `00ccf4...`, `1c389f...`, `b08562...`, and `0c33a9...` byte-for-byte.

Profile integrity was independently recomputed as `ff40d348d7b23c0a3e9156d5c5eec3236fae879e13fc44153004778d9d3eae0f`. Only `root-control-file` has a selector matching `next-env.d.ts`; the class count remains 12. The additional exact path references are orthogonal candidate/generated/lifecycle/capability assertions inside the same sealed profile, not a second classifier or wildcard.

## 4. Runtime and author verifier

Positive checks used only installed local tools:

- Node `24.14.0`;
- V8 `13.6.233.17-node.41`;
- ICU `78.2`, Unicode `17.0`, CLDR `48.0`;
- `darwin/arm64`;
- Next `16.2.12`;
- TypeScript `5.9.3`;
- pnpm `11.9.0` observed only; no package-manager resolution was invoked.

The author verifier was run twice on the exact attached Candidate using pinned Node. Both runs returned exit 0. The second output SHA-256 was exactly `536f3ae2fe45c7f6a7a9805e438aa4839da1bd44153a819301ac4247b3e3f37f`, byte-identical to capture. A deliberate runtime mismatch failed before acceptance. These were treated as author evidence, not review authority.

## 5. Fresh official Next lifecycle proof

The reviewer created a new detached worktree at exact final HEAD, not the formal Candidate. Its physical excluded `node_modules/` contained only local links required for Next's ordinary TypeScript setup. The public installed CLI was invoked directly; no private writer or handwritten file was used.

Exact positive command, run twice:

```text
NEXT_TELEMETRY_DISABLED=1 CI=1 \
/Users/calvin/.nvm/versions/node/v24.14.0/bin/node \
/Users/calvin/.codex/worktrees/263d/CWT（CloudWave Textile）项目/node_modules/next/dist/bin/next \
typegen .
```

Both executions returned exit 0 and printed the normal `Generating route types...` / `Types generated successfully` result.

The lifecycle never depended on deletion:

1. absent proof ran before generation;
2. first typegen created `next-env.d.ts` and `.next/types`;
3. present proof ran with them in place;
4. second typegen ran without cleanup;
5. repeat proof reproduced the same bytes, file set and hashes.

Generated `next-env.d.ts` was a regular 247-byte UTF-8 file with final LF and exact SHA-256 `7b550dda9686c16f36a17bf9051d5dbf31e98555b30d114ac49fc49a1e712651`. It was Git-ignored, `tsconfig`-included, marked generated, and classified only as `root-control-file`. Its exact two triple references, one `.next/types/routes.d.ts` import, blank line and comments matched the sealed contract.

The separately audited `.next/types` root contained exactly:

| Path | Bytes | SHA-256 |
|---|---:|---|
| `.next/types/cache-life.d.ts` | 5,854 | `d1986184a09a52db8228cb2bb2a61a8c05c9354e5b93cec8e2628d8579c892d7` |
| `.next/types/routes.d.ts` | 6,832 | `e838150498c7e8464a1a0d7e25d7dfc79aa6f77358a8d83ac0aa7b28c5904fb4` |
| `.next/types/validator.ts` | 26,616 | `8ed142360153811ab434bbd2f2486b0052d9d5bbdcf067d206fc8d7eb15f28df` |

Generated-root hash: `fc4e44647d4941f5f392d80cb98db04227995133cb23ee99d2c2c3df501caccb`.

The author's captured lifecycle used the docs-only direct parent `595e2f9...`; the Fresh reviewer used final exact HEAD `3f475e13...`. Final capture-only `.txt` additions are not Candidate nodes. All semantic counts, bytes, members and hash domains matched exactly.

## 6. Independent absent/present filesystem reconstruction

`REVIEWER_V17_LIFECYCLE_AND_SELECTOR_CHALLENGE_V1_0.mjs` implements a separate raw sorted `lstat` walk, source-state derivation, candidate compiler, 12-selector evaluation, hard-link/canonical checks, JCS inventory and hash domains. It imports neither the author verifier nor project implementation code.

| State | Candidates / executables | Source states | zero / ambiguous |
|---|---:|---|---|
| source-clean absent | 406 / 364 | 406 tracked, 0 untracked, 0 ignored | `[]` / `[]` |
| official generated present | 407 / 365 | 406 tracked, 0 untracked, 1 ignored | `[]` / `[]` |

Independent hashes:

| State | Inventory | Content | Classification |
|---|---|---|---|
| absent | `629cb40fcfdc5ca7683d6713f3bffd57ed021de98aac8bcad494affd497a6e01` | `bf3efe209323a5acdd8fcd3a20659efd865ca0058083ca56f033f1779f89de46` | `05e984ed1534bedc093e69aa30df85d86aa53d73fc7eda263b80c4714acd701c` |
| present | `f7f6bda0ee1e9f50b8a3a836769ee5c96cafb3116d28b58f1319953f7ea991d4` | `5befb5f8ceefccdb7eabec9dfa03025d7b96b217c4f24c22b44987f40c65909e` | `4ad6e82924306b19761c82fed045a981fce3341bbf78928bf60f34eb6a943b14` |

No other ignored or untracked Candidate existed. `node_modules/` and `.next/` remained exact physical excluded roots; only `next-env.d.ts` entered the Candidate set in the present state.

## 7. Mutations and fresh boundaries

The reviewer independently recreated all 28 declared negative cases:

- the 17 retained V1.6 cases: unknown executable, overlap, six independent disposition removals, silent exclusion, symlink, hard-link/canonical alias, alias import, unmanifested generated node, early Phase D, early adapter, second composition root and sealed exclusion change;
- the 11 Attempt-2 cases: next-env no class, double class, silent ignored exclusion, other ignored root TS, next-env symlink, hard-link, byte change, path change, type-reference change, deletion prerequisite and `.next` bypass.

All 28 reached their expected fail-closed boundary.

Fresh unnamed equivalents also passed:

- `next-env.d.tsx`, `framework-next-env.d.ts` and `.next-escape/types/routes.d.ts` do not inherit the exact class;
- CRLF and an extra triple reference violate the exact byte contract;
- tracked and ordinary untracked source states are rejected for the generated present lifecycle;
- an extra `.next/types` file violates the exact set;
- a nested path+suffix test signal still yields one test class; similar directory prefixes do not overmatch.

The exact `root-control-file` capability ceiling grants no runtime, public/server Production closure, Provider/adapter, credential/endpoint or external-network authority. Exact bytes allow only framework type declarations and the sealed `.next` route-type import.

## 8. Non-regression

- Original six path dispositions and every current `src/test/**` candidate: PASS.
- M02-D1-INCLUDE: 32 rules, 30 common plus two DeepSeek-only, full Unicode transition and persisted-byte probes PASS.
- M03 discriminated seam: selected and reviewer positives exit 0; unnarrowed union, cross-driver and destructured negatives exit 2 with `TS2375`.
- Actual `DatabaseConnection`/`AppDatabase` types remain unchanged.
- Schema mapping: `ai_model_config=21/21`, `ai_runs=96/96`, exact Drizzle/Migration/design order PASS.
- H-01, H-02, M-01..M-06, L-01, N-M01..N-M04: CLOSED/non-regressed.
- Exactly four Draft use cases, `human_review_required`, no fallback/RAG/vision/customer_support/private data, no Provider/network, and Phase B/C/D/E boundaries: PASS.
- Owner selections remain exactly `M02-D1-INCLUDE` and `M03-D1-DISCRIMINATED-SEAM`; no scope expansion or implementation authorization was inferred.

No unrelated application build/test was run. The Candidate is docs/evidence-only, and the requested official Next lifecycle, raw inventories, static contracts, type probes and Schema checks directly cover the affected risk.

## 9. Process and impact conclusion

- `V15-M01` Attempt 2: CLOSED.
- Findings: none.
- Schema/Migration/ADR/dependency/package/lock/persistent Complexity/SEO/URL/data impact: none.
- New Owner decision: none.
- Formal Candidate remained clean and file-absent; disposable generated state was retained and never used as Candidate authority.
- This evidence supports design-gate PASS only. It does not authorize implementation, Phase C/D/E or any external action.
