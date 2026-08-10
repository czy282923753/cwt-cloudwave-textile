# CWT Stage 4A Phase B Provider-neutral Foundation Implementation Report V2.0

Date: 2026-08-11

Role: fresh Phase B Implementation Engineer

Terminal implementation state: **IMPLEMENTATION COMPLETE — NOT REVIEWED / NOT ACCEPTED**

Next and only gate: Fresh Independent Implementation Review by the original independent Reviewer

## 1. Authority and exact starting state

Owner authorization was recorded byte-for-byte in
`docs/PHASE_1B_STAGE4A_PHASE_B_DESIGN_GATE_ACCEPTANCE_AND_FRESH_IMPLEMENTATION_AUTHORIZATION_V2_0.md`.
That record authorizes only a fresh Phase B implementation Candidate. It does not authorize a real Provider,
Phase C/D/E, Deploy, merge, Push, Publish, Index, or formal import.

| Identity | Exact value | Result |
|---|---|---|
| starting ref | `codex/phase-1b-stage4a-phase-b-corrected-design-v1` | PASS |
| required start / rollback checkpoint | `3f475e13d73d9d68a4dfb9a040941c57f1ee92e6` | PASS |
| earlier accepted design checkpoint | `6bc26cf035608a21a057d6f4e87da8d4f7f23d40` | ancestor PASS |
| frozen baseline commit | `31c0e405acfdd0d05200d0fb2531e897a541a2c4` | ancestor PASS |
| frozen annotated tag object | `1c626f9b788e4c6ed0480a7040aa54ccef3e6c76` | resolves to frozen commit PASS |
| frozen tag | `phase-1b-stage3-approved-2026-08-09` | PASS |
| Candidate branch | `codex/phase-1b-stage4a-phase-b-foundation-implementation-v2` | PASS |
| implementation content checkpoint | `df21fcdfba47ed5c76748a0e81d0744cccf04c85` | clean before report generation |
| content checkpoint parent | `0b37efdbde113d252f459c26897cc5ba89b47e50` | PASS |
| worktree | `/Users/calvin/.codex/worktrees/07a1/CWT（CloudWave Textile）项目` | dedicated local worktree |

The delivery commit containing this report and its manifest is intentionally reported by the coordinator callback
and final handoff rather than embedded here, which would create a self-referential hash.

## 2. Imported independent PASS and acceptance

The complete independent V1.7 PASS package was read from `/tmp/cwt-corrected-design-v17-review.25FfwM`,
rehashed, checked against its manifest from the repository root, and imported byte-identically in the first commit.

| Artifact | SHA-256 |
|---|---|
| independent report | `4ac82227aa361174640fbacb99a77976fdacf25848d6bb374fe9cbf0753382d5` |
| independent evidence | `55b68e863d26121207d27ae4bc556b5f11ee2e53c791fe5890112d94003154c0` |
| official lifecycle proof | `28095a4bc5cf3a7bf0ce6f1072054e2cb4fd1e1d0fd344c2aba0883c0e27683a` |
| Reviewer challenge | `e0ea4247fcb9a74c360f869fab33ee3bc33f1c479849ee54a42935d89123a980` |
| challenge output | `b9755dd1445bb72d24c916f15af996da45b0517aaae4cff2252de7f1177069ba` |
| package manifest | `8b4a3418064f26980c4bff890e81fbba3b5591cc8b639083147be913c334a62e` |
| acceptance/authorization record | `237deb5b00a25837c63eb09d9f0f379ac3ccfe226feb16f66519d943ce3982da` |

The first manifest invocation used the review directory as its current directory and therefore returned only
file-not-found results. It was rerun from the required repository root and passed all five entries. No artifact was
rewritten to make the result pass.

## 3. Delivered Phase B boundaries

The Candidate implements only the V1.7 Provider-neutral foundation:

- application-neutral contracts, typed failures/results, strict canonical JSON and SHA-256 hashing;
- a closed application registry, opaque availability/request binders, the Draft Assistance facade, and exactly
  the four approved Production text use cases;
- application-private Draft and Synthetic scope construction with distinct nominal brands, callback lifetimes,
  authorization, target snapshot, association, context, result, and disposition contracts;
- the sole selected M02 registry, raw SHA-256
  `264ca6358dcec00da5bc17e134c89e52d5321c87683212b8c32ba12756700b66`, with exactly 32 rules
  (30 common plus two DeepSeek-only), one compiler, inline gap ASTs, direct/bounded/structured/overflow behavior,
  fixed Node/V8/ICU/Unicode/CLDR tuple, fail-closed structural limits, and persisted-input byte preservation;
- strict single-root JSON output schemas, finite A-01 through A-10 policy, provenance/evidence references, and
  protected-data reuse;
- a fail-closed feature/config resolver that reads the accepted `ai_model_config` through one `MATERIALIZED` CTE
  snapshot and creates no configuration or mutation authority;
- immutable Prompt tuple/version/hash/history machinery; the Production manifest remains exact-empty and contains
  no Production Prompt prose; Synthetic Prompt bytes remain test-only;
- Provider-neutral preparation, availability, claimed-provenance reconstruction, and a fake provider used only by
  tests; no durable `ai_runs` repository, enqueue, claim, lease, retry, cancellation, Worker execution, or scheduler;
- the selected M03 discriminated seam: one outer composition root switches exhaustively on
  `databaseConnection.kind` and passes the branch-narrowed `AppDatabase` directly to one generic factory, without
  cast/assertion/`any`/`unknown` round trip, wrapper, visitor, or second database authority;
- one V2.2 12-class actual-filesystem architecture gate covering tracked, untracked, ignored, lstat, canonical,
  symlink, hard-link, generated lifecycle, public/server capability edges, exact Next lifecycle, and all 28 required
  in-memory fail-closed mutations;
- Prompt history, server-only and active public-client bundle gates, database seam and read-scope negative fixtures,
  plus an independently distinct Synthetic application proof.

Two pre-existing public-build boundaries were narrowed only as necessary to execute the mandatory offline gate:
remote build-time Google font acquisition was removed in favor of the existing system font stack, and Product page
pagination logic was moved out of the Next route module so the route exports only supported Next page members.

## 4. Frozen scope and data confirmation

Diffs from the exact start contain:

- zero files under `src/db/schema` or `drizzle`;
- zero `pnpm-lock.yaml` changes;
- no dependency or version changes; `package.json` changes only add the four Phase B command wires and include the
  Phase B Prompt/architecture gates in `check`;
- no seed, backfill, schema mutation, formal data, Provider SDK, real adapter, credential projection, endpoint, or
  Provider network call;
- exact Production Provider registry membership `[]` and exact Production Prompt manifest bytes
  `{"manifestVersion":1,"entries":[]}\n` (SHA-256
  `0aa71d065f1783f7bc57a5525e2206a52627fd1fdb9601944aff3edbf374c0e6`);
- no `customer_support`, RAG/retrieval/embedding/vector, vision/tool/file/arbitrary URL, private Inquiry/CRM/customer
  context, business Draft/Revision mutation, Publish, Index, or Phase C/D/E implementation.

`src/ai/internal/worker-entry.ts` is the V1.7-required type-only future facade and exports only
`AiClaimedExecutionService`; it contains no Worker process or execution implementation and has no Production consumer.

## 5. Verification evidence

| Gate | Result |
|---|---|
| lint | PASS, zero warnings |
| TypeScript full typecheck | PASS |
| focused AI suite | PASS, 13 files / 119 tests |
| M02 focused file after hardening | PASS, 46/46 tests |
| full test suite at pre-hardening checkpoint | PASS, 111 files / 536 tests |
| final full test suite after M02 hardening | PASS, 111 files / 539 tests |
| accepted 0020 Candidate verifier | PASS: design identity, 40 historical artifacts, journal append, columns/defaults/nullability/types, constraints, indexes and scope |
| exact Schema map | PASS: `ai_model_config=21/21`, `ai_runs=96/96`, Design=Drizzle=Migration order exact |
| Prompt bundle | PASS, Production and Synthetic |
| Prompt Git-object history | PASS from `6bc26cf035608a21a057d6f4e87da8d4f7f23d40` |
| architecture actual tree at `0b37efd...` | PASS: 501 candidates, 443 executables, 12 classes, `zeroClass=[]`, `ambiguous=[]` |
| architecture type boundary | PASS: two positive and five exact negative fixtures |
| architecture mutations | PASS: 17/17 V1.6 plus 11/11 Attempt 2, all exact fail-closed |
| official Next 16.2.12 absent lifecycle | PASS: 484 candidates / 432 executables; evidence SHA-256 `1568cacb07bf8bf3ea747c369cb62cbbde57b00b45ae8802fb25ffef1903e1ba` |
| official Next 16.2.12 present lifecycle | PASS: 485 candidates / 433 executables; evidence SHA-256 `25d7b371af4d39f2dcaf3d4464d2b224ed558a08325d513fac742b84856cf000` |
| isolated server bundle | PASS: 51 server files, 16 client chunks, three markers/raw Prompt server-only; evidence SHA-256 `a7f1c5162369ad439909ab6360ef32b961fee2d4030bbb8f534dd698f0525dc2` |
| isolated migrated/noindex/Synthetic/`FEATURE_AI=false` build | PASS; evidence SHA-256 `3c4b23102b121b8e93660d2abe1a01f99f9e6f5906f322ead939deeec80ca7f6` |
| active public bundle | PASS: 20 public page manifests / 47 active manifest-and-chunk files |
| isolated database state | PASS: feature process false; zero AI feature/config/run/Asset rows; zero Synthetic persistence |
| global exact-start-to-Candidate `git diff --check` | exit `2`; the sole remaining diagnostic is `docs/PHASE_1B_STAGE4A_PHASE_B_CORRECTED_EXACT_DESIGN_INDEPENDENT_REVIEW_V1_2.md:118: new blank line at EOF.` The artifact is immutable and retains required SHA-256 `4ac82227...`; this global result is not a PASS. |
| V2-owned/scoped whitespace check excluding that immutable imported artifact | PASS, exit `0` |
| final clean state | checked after the final documentation commit |

The pre-review finalization changes only this implementation report and its two hash envelopes. Source, tests,
configuration, package, lockfile, Schema, and Migration bytes remain identical to `530fa35aa08dc9c49b25f97a589cefd1f27617b8`.
Accordingly, the 111-file/539-test result remains applicable and the full suite is not rerun for this docs-only
correction. Verification is proportionally limited to the global and scoped diff checks, all 112 manifest entries,
fixed imported-evidence hashes, changed-path scope, code-tree identity, and clean state.

Evidence output hashes at the final pre-report checkpoint:

- lint: `7cb923eef43dfb4037272f22fcfcefaef37dda0b2e1e9fa038a2f42a43cb5faf`;
- typecheck: `28af0c41f0c7ecbc99a2b92e635965cfb09f1abe0062f623d57f4916dcd636dc`;
- full 536-test run: `a35b121b0e2631a15753eb6ca009815af06148e3e088403ac471d2761ca5227c`;
- focused AI 119-test run: `97834461279180822d3bd37e03dbebc85f09e8fd7ad6efd95e7a7feed04525ef`;
- 0020 verifier: `a7f5039da3842354a63c268260a4ee4fbb85a6f54584b63f14a2b5384ffd2617`;
- Schema mapping: `74354612e3c5fe9f94ba2d0bc2a6d30c524a57dbc137db9ad1ee83fcf565d8bb`;
- Prompt bundle: `1d89bff4e6ae03b5642b6df2d190fc1209e1dfe34eb4526ee973c99b7d022177`;
- Prompt history: `800dcb51e58aa37163215012dfeacecedbf473e491fc34f5282ddbec078b0d6c`;
- architecture JSON at `0b37efd...`: `092cf01225cd6d6bb8c46225578ec83db9726ab153acc2d2c5e228199423ecf9`.

The final post-hardening 539-test output SHA-256 is
`a94333304bd71ae3ddf52e30684b4651a592a3e7c52156d8457975d5a7eac2ca`.
`IMPLEMENTATION_CHANGED_FILES_SHA256_V2_0.txt` covers 112 changed payload files, including this report and excluding
only the manifest and its aggregate envelope to avoid self-reference. The adjacent aggregate file pins the exact
manifest bytes; its final SHA-256 is reported in the delivery callback and final handoff.

## 6. Failed-code isolation and ancestry

All four failed implementation commits are non-ancestors of this Candidate:

- `755e514540351ed53ee96bedd5ea12f3e934387e` — NON-ANCESTOR;
- `a696325fa2608c77e526bb7403bb911d34200064` — NON-ANCESTOR;
- `b1a73bb8aae87f7c862117b32ce5c2a051f21b84` — NON-ANCESTOR;
- `d8a24d48592a8c5e112d20edd24505e9e34d83c9` — NON-ANCESTOR.

The Candidate history contains zero merge commits. No failed ref was merged, cherry-picked, checked out, or used as a
source-tree input; no failed source or failed test was copied or mechanically replayed. Historical defects were read
only through the approved Design/Review/Diagnostic evidence named by the task. The first implementation commit is a
direct child of the exact approved start.

## 7. Atomic commit and rollback map

Every row may be rolled back to its exact parent without rewriting history:

| Candidate commit | Exact rollback parent | Causal boundary |
|---|---|---|
| `f213f664a2f80cc9c0272ce0c39f1af9d0777c6e` | `3f475e13d73d9d68a4dfb9a040941c57f1ee92e6` | import PASS package; accept Design; record fresh authorization |
| `85ed017ff9ed3d6b304495b9bb7b5d3bf93042c0` | `f213f664a2f80cc9c0272ce0c39f1af9d0777c6e` | contracts and canonical hashing |
| `6fafc8722d44330c473d4596dc5d2ec9b4556da9` | `85ed017ff9ed3d6b304495b9bb7b5d3bf93042c0` | application codecs/registry/binders |
| `12ab4e06040fccfbee9a3416a79c94b1e0b8339f` | `6fafc8722d44330c473d4596dc5d2ec9b4556da9` | M02 authority and context protection |
| `44c6f8fdb83f756d48a397a6bdc82e2909bba795` | `12ab4e06040fccfbee9a3416a79c94b1e0b8339f` | strict output and raw JSON |
| `bbf21e64deb493abd12895cf097411d557761b76` | `44c6f8fdb83f756d48a397a6bdc82e2909bba795` | config and Prompt authority |
| `ac38c8c174cfb30216f3a7926afc51ff8bc6a41c` | `bbf21e64deb493abd12895cf097411d557761b76` | availability orchestration |
| `0952817c47f7fa7e59f94a1cbd95fd0ff855ca3e` | `ac38c8c174cfb30216f3a7926afc51ff8bc6a41c` | claimed provenance/provider attempt |
| `403ba897343ffa333218ce75611429659312ca3a` | `0952817c47f7fa7e59f94a1cbd95fd0ff855ca3e` | Synthetic extension proof |
| `04c35eb11eca67ec063f4320ade83118447285b8` | `403ba897343ffa333218ce75611429659312ca3a` | M03 graph/type boundary |
| `de5da189d4bd6fb75300a6eb75a8656258ea3764` | `04c35eb11eca67ec063f4320ade83118447285b8` | isolation-native probes |
| `dad17a69ecbe9a336020f09deb41bc7dd4824ca9` | `de5da189d4bd6fb75300a6eb75a8656258ea3764` | official Next lifecycle evidence |
| `53af33821915cb3db8c6e1b731dde916fac6ba99` | `dad17a69ecbe9a336020f09deb41bc7dd4824ca9` | Prompt/Synthetic bundle isolation |
| `9b60fac250baad9350465978853d71d1c2ccb4c9` | `53af33821915cb3db8c6e1b731dde916fac6ba99` | one snapshot config query |
| `84df65b26d853caf689132e8c8c44a19ca929ae1` | `9b60fac250baad9350465978853d71d1c2ccb4c9` | claimed provenance one-call proof |
| `85f4c5fc4a1dd271119b8429794533799810bef3` | `84df65b26d853caf689132e8c8c44a19ca929ae1` | server bundle fixture |
| `702b1410e7a4ecfa8f264f62c7dd59684f386234` | `85f4c5fc4a1dd271119b8429794533799810bef3` | fixture root pinning |
| `fa8f948d23dbf38f8db01a49860350ac00d77e6c` | `702b1410e7a4ecfa8f264f62c7dd59684f386234` | server bundle evidence |
| `c25f528467f30e9e2ce6a0b07003536add6406f9` | `fa8f948d23dbf38f8db01a49860350ac00d77e6c` | diagnostic-evidence lint separation |
| `3220855aac1192d1e1df9fd6161f118a73061eba` | `c25f528467f30e9e2ce6a0b07003536add6406f9` | offline build and closed page exports |
| `b5e8decb23cffd9be18fe2272862b4846b8d85e6` | `3220855aac1192d1e1df9fd6161f118a73061eba` | active public bundle scan |
| `0eea341ef8957a3c8596492783b09b38108932ff` | `b5e8decb23cffd9be18fe2272862b4846b8d85e6` | isolated final build evidence |
| `0b37efdbde113d252f459c26897cc5ba89b47e50` | `0eea341ef8957a3c8596492783b09b38108932ff` | complete 28-case architecture mutations |
| `df21fcdfba47ed5c76748a0e81d0744cccf04c85` | `0b37efdbde113d252f459c26897cc5ba89b47e50` | M02 semantic identity and limit proofs |
| `530fa35aa08dc9c49b25f97a589cefd1f27617b8` | `df21fcdfba47ed5c76748a0e81d0744cccf04c85` | original report and hash-manifest delivery |

## 8. Failures, retries, and root causes

No single causal condition reached three failed closure attempts. The following events are retained rather than hidden:

1. The first test invocation found no materialized `node_modules`. pnpm materialized 526 packages from the already
   available local content-addressed store (`reused 526`, `downloaded 0`) and did not change the lockfile. This is a
   local install/materialization event, so the report does not claim that no install-like action occurred.
2. The first isolated full-build attempt encountered `next/font/google` and made two failed TLS connection attempts.
   No successful connection or downloaded bytes were reported. The causal dependency was removed by using the
   existing system font stack; the final isolated build completed without a network retry. This means the report does
   not make a blanket claim that no network attempt occurred.
3. Isolated migration first inherited Node 25.8.1 and failed the installed esbuild platform/runtime check. Re-running
   with the required installed Node 24.14.0 passed.
4. The official lifecycle harness initially had a quoted-path/PATH resolution issue and then could not resolve
   dependencies from a detached `/tmp` worktree. Moving the disposable proof worktree under the sealed `tmp/`
   exclusion in this repository preserved isolation while using installed dependencies; both official lifecycle
   states then passed.
5. The server-bundle fixture initially inherited an outer Turbopack root and then could not resolve Next through the
   fixture symlink. Pinning the fixture root and using the supported webpack build path closed the resolver boundary.
6. Lint reported seven warnings only in byte-identical imported Review evidence. Those immutable diagnostic artifacts
   were precisely separated from product lint; architecture, hash, and type probes continue to enumerate them.
7. The first public-bundle scan did not decode URL-encoded chunk paths and then treated inactive global manifest
   modules as active leaks. It now decodes paths and scans only actual client-reference and root-client chunks.
8. A database evidence one-liner first used unsupported top-level await, then a wrong PGlite URL form, then queried a
   nonexistent legacy Asset column. The final query used the migrated isolated database and accepted Schema, showing
   zero AI config/run/feature/Asset rows. These were evidence-harness errors, not product changes.
9. The first M02 total-65 test value allowed a valid suffix to rematch with a smaller insertion total. The replacement
   fixture uses a fixed lexical skeleton that must consume the full transition sequence; 64 matches and 65 returns
   `unsupported_value` without changing limits or loosening the classifier.

## 9. Prohibited-action confirmation and open findings

Confirmed not performed: no real DeepSeek or other Provider call; no AI credential use; no spend; no Staging or
Production access; no Deploy, Publish, Index, formal data import, merge, Push, independent Review, or Phase C/D/E
work. No history was amended or rebased.

Explicit process exceptions are limited to the local dependency materialization and failed font TLS attempts described
in Section 8. They are open disclosure items for the independent Reviewer; they do not grant or imply additional
authority. There is no open product-design, Schema, ADR, dependency, or Owner decision. The Candidate is not self-
approved, and no Phase C/D/E work may begin unless the exact delivered Candidate receives a Fresh Independent
Implementation Review PASS.
