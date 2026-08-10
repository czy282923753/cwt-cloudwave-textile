# CWT Stage 4A Phase B — Foundation Implementation V2 Remediation Report V2.2

## 1. Status and exact identity

Status: **COMPLETED as a corrected implementation Candidate; NOT SELF-APPROVED and NOT YET ACCEPTED**.

- Branch: `codex/phase-1b-stage4a-phase-b-foundation-implementation-v2-remediation-v2`.
- Fixed failed Remediation V1 ref:
  `codex/phase-1b-stage4a-phase-b-foundation-implementation-v2-remediation-v1 = 2e6dc7a520404b629c795447ce710b36740ff972`.
- Exact V1.7 design/full rollback: `3f475e13d73d9d68a4dfb9a040941c57f1ee92e6`.
- Exact final code HEAD: `111301aea82569768661c6401b16054161ed19ff`.
- Exact executable-evidence commit: `1f389ad4510551d7e3c6a7b54125a52fac39bd7b`, a docs-only child of the code HEAD.
- Worktree: `/Users/calvin/.codex/worktrees/07a1/CWT（CloudWave Textile）项目`.

The final report and SHA-manifest commits are documentation-only successors. Their exact final identities are
supplied in the Coordinator callback and terminal handoff because a commit cannot embed its own object identity.
Source, tests, configuration, package, lockfile, Schema, Migration, snapshot, and journal stay byte-identical from
the exact code HEAD through the final Candidate.

The only next gate is Fresh Independent Implementation Re-review by the original Reviewer. This report creates no
acceptance, Provider, Phase C/D/E, merge, or Push authority.

## 2. Fixed FAIL authority and scope control

The Fresh Re-review FAIL authority was read in full, recomputed, and imported byte-identically in the first commit:

- report SHA-256 `0a191e3e0877a2c97f3865cc6877bd186a06ec8a6c23a468de8b75f0a7813cfe`;
- evidence `71a6711edc06ea6d98fd5a006a56e9ce9827b1f0cc77a7d5133d1aa3b706fd14`;
- challenge patch `b62e115eccac8f961096a1284433f474ab32fa8b41ef41aec15b87677a90c892`;
- Fresh output `8dcd907c3b0a25d4291e4ed78351e1b1bfe75d9491d2af3db49a2e6e0e2a730c`;
- manifest `3a2d57aa0756a03f97d9f403f0058a78247e2664e5b134447d800ece63365691`, 4/4 PASS.

No Reviewer artifact was changed. Closed IMP2-M03, IMP2-M05, IMP2-L01, and IMP2-L02 remain non-regression
boundaries. `package.json`, `pnpm-lock.yaml`, `drizzle/`, and `src/db/schema/` have zero delta from failed
Remediation V1. The four public blobs remain exact design-start identities and
`src/public-site/product-pagination.ts` remains absent.

## 3. Finding dispositions and attempt accounting

| Finding | Attempt | Disposition | Root correction |
|---|---:|---|---|
| IMP2-NH01 High | 1 | **CLOSED in Candidate; pending independent re-review** | authoritative Revision `entity_type` selects Product/Content editor role inside the sole actor-scoped read before distinguishable state |
| IMP2-M01 Medium | 2 | **CLOSED in Candidate; pending independent re-review** | one strict class-discriminated DTO/policy binds selector ID, authoritative identity/version confirmation, target association, then values/provenance |
| IMP2-M02 Medium | 2 | **CLOSED in Candidate; pending independent re-review** | the one bounded A-08 policy replaces incomplete equality with deterministic common-core family counting |
| IMP2-M04 Medium | 2 | **CLOSED in Candidate; pending independent re-review** | the sole graph authority fails all Production unsupported/unresolved runtime acquisitions before capability rules |
| IMP2-M03 Medium | prior closure | **NON-REGRESSION PASS** | select-only common carrier, typed Drizzle read, 2 positive/6 negative probes |
| IMP2-M05 Medium | prior closure | **NON-REGRESSION PASS** | four public blobs exact design start; Candidate pagination helper absent |
| IMP2-L01 Low | prior closure | **NON-REGRESSION PASS** | Production composition exposes availability only; no callable request/enqueue placeholder |
| IMP2-L02 Low | prior closure | **NON-REGRESSION PASS** | final executable captures bind exact code HEAD and true counts/hashes |

No root reached a third failed closure. No Max escalation, compatibility authority, second context policy, second
A-08 classifier, second architecture checker, or bypass allowlist was added.

### IMP2-NH01

The prior target-union role decision was deleted. Product/Content editor eligibility is now derived from the actual
row read for Product Draft, Content Draft, and Editorial Revision. Wrong-role existing/missing/wrong-version results
are indistinguishable `authorization_denied`; the correct role may reach the appropriate downstream availability
result. The matrix uses the real Phase B service and disposable PGlite, preserves exactly one actor-scoped read and
zero lock, and covers Admin, correct/wrong editor, both entity types, record absence, and version conflict.

### IMP2-M01

The arbitrary JSON `sourceIdentity` repository field was removed. Each source class has one closed application DTO.
The policy validates requested source ID, returned class identity/current-version confirmation, exact target
binding, and Product/Fabric direct-target version before accepting any field. It then constructs the sole persisted
identity. The Reviewer `1111/2222/3333/version99` vector and wrong/stale Product, Fabric, and Company Fact vectors
fail before value, Prompt variable, provenance, or fingerprint acceptance.

The existing one policy still owns all field/provenance/value/aggregate limits, four use-case Prompt-variable
contracts, Product Code absence, MOQ adjacency, JCS hashing, JSONB-shaped round trip, and claimed reconstruction.
Identity/version stays only in `input_sources_json` and does not enter Provider variables.

### IMP2-M02

Within the existing finite A-08 authority, each proposal block has a bounded normalized token sequence and a
deterministic family core obtained by removing at most two cosmetic tokens from each edge. Repeated meaningful cores
over the fixed threshold reject the entire candidate. The Reviewer's 30 suffix variants and a Fresh prefix/suffix
family fail; eight distinct professional B2B paragraphs sharing textile vocabulary pass. A-03 evidence eligibility,
A-04 adjacent MOQ refs, `structural_provenance_checked`, and mandatory `human_review_required` remain unchanged.

### IMP2-M04

The existing checker was replaced in place. Every Production executable class now rejects unsupported/unresolved
import, dynamic import, require, package, or resource acquisition before class/capability ceilings. The same resolver
covers conditional/computed/concatenated/template/indirect, alias, re-export, createRequire, computed require.resolve,
and import-meta URL forms. The actual tree retains one 12-class selector, four proof artifacts, 19 graph faults
(11 original plus eight Fresh variants), 28 mutations, protected/public/server closure, unique Phase B root, reserved
Phase D/adapter absence, and the Owner-selected database seam.

The Reviewer's exact non-foldable conditional import was temporarily injected into real `src/app/page.tsx`; the
gate exited nonzero with path/rule/AST/acquisition diagnostics. The source was restored byte-exactly and the gate
then returned the identical passing report.

## 4. Final exact-code verification

| Gate | Exact result |
|---|---|
| Reviewer reproductions | PASS, 3 files / 6 selected tests |
| focused AI | PASS, 13 files / 149 tests; SHA-256 `5fe3df990dd92619ecbb3d3a52285b6bc57826a4347a4998c540ee703546c38b` |
| security/context/output | PASS, 5 files / 119 tests; `ac2f5b6bead1626e27bd16199659bce7215f3d8f6efa0bd3e93a2bbc8c9ddda9` |
| full suite | PASS, 111 files / 566 tests, 264.07s; `bebc7e07481d373fe6b74d7515c498f4bca0096985571daacf03171bd8a7f3b7` |
| lint | PASS, exit 0, zero warnings |
| strict typecheck | PASS, exit 0 |
| accepted 0020 verifier | PASS: approved design identity, 40 artifacts, exact journal/schema/constraints/index scope |
| independent Schema mapping | PASS: `ai_model_config=21/21`, `ai_runs=96/96`, exact order |
| Prompt bundle/history | PASS; Production manifest exact-empty; `6bc26cf... -> 111301a...` |
| M02/raw JSON | PASS within 119-test security subset: 32-rule Unicode/runtime/limits/corpus and duplicate/root/byte cases |
| M03 types | PASS: 2 positive / 6 expected-negative; execute negative `TS2339`; source execute matches 0 |
| architecture | PASS: 518/446, zero unclassified/ambiguous, 2389 edges, 19 faults, 28 mutations; `6f1113ce...` |
| official Next lifecycle | PASS: absent 518/446; present 519/447; two typegen lists byte-identical |
| isolated AI server fixture | PASS under network deny: Next 16.2.12 webpack, 51 server / 16 client, server-only markers |
| isolated migrated/noindex | PASS through 0020: memory-only, feature false, Index false, zero config/run rows/Synthetic authority |
| public baseline | PASS: four exact-start blobs; pagination helper absent |
| imported FAIL manifest | PASS 4/4 |

The evidence narrative SHA-256 is
`29267e444a2e51c89e05c5bb2275cc6ef7918680c3c8d945e861e185598ab36b`.

The four public exact-start SHA-256 identities are `b8a40521...` (layout), `3803f096...` (globals),
`65ac3c27...` (products page), and `d59979b8...` (products test). No full public-site build was run or claimed;
the pre-existing Google Font offline debt remains outside Phase B.

## 5. Commit and rollback map

| Commit | Exact parent | Causal boundary / narrow rollback |
|---|---|---|
| `d0ef3c205fb1aa388875e3b807fd505d7cb559ca` | `2e6dc7a520404b629c795447ce710b36740ff972` | byte-identical Fresh Re-review FAIL import |
| `4367535f12b49a2e7a7f9b69eb8ee88d2b8f12ca` | `d0ef3c205fb1aa388875e3b807fd505d7cb559ca` | IMP2-NH01 authoritative entity-type roles |
| `cdb158870c9d681ecee7869ac06f8cee94304ae4` | `4367535f12b49a2e7a7f9b69eb8ee88d2b8f12ca` | IMP2-M01 selector/target/source identity binding |
| `c62c3af9512660791f86e20f448cfedc77b24588` | `cdb158870c9d681ecee7869ac06f8cee94304ae4` | IMP2-M02 cosmetic repetition families |
| `95067a085f05f4c48236d23cf3dc3f2e4169121f` | `c62c3af9512660791f86e20f448cfedc77b24588` | IMP2-M04 Production acquisition fail-closed |
| `111301aea82569768661c6401b16054161ed19ff` | `95067a085f05f4c48236d23cf3dc3f2e4169121f` | M01 stale projection confirmation; final code HEAD |
| `1f389ad4510551d7e3c6a7b54125a52fac39bd7b` | `111301aea82569768661c6401b16054161ed19ff` | exact-code verification evidence, docs only |
| report delivery commit | `1f389ad4510551d7e3c6a7b54125a52fac39bd7b` | this V2.2 report, docs only |
| final manifest commit | report delivery commit | changed-file SHA manifest and aggregate, docs only |

All commits are linear and atomic with no amend/rebase/history rewrite. Full rollback remains exact V1.7
`3f475e13...`; each narrow rollback uses the direct parent above. The Remediation V1 ref remains fixed at `2e6dc7a...`.

## 6. Diff, ancestry, and process evidence

The Design-start-to-Candidate global `git diff --check` exits `2` and is explicitly **not PASS**. The only
diagnostics are the immutable V1.7 independent report EOF blank line and the byte-identical Fresh Reviewer challenge
patch trailing-space line. The V2-owned scope excluding imported immutable artifact sets exits `0`.

Failed implementation refs `755e514...`, `a696325...`, `b1a73bb...`, and `d8a24d4...` are all non-ancestors.
This Candidate necessarily descends from authorized failed Remediation V1; no failed source was cherry-picked,
merged, copied, mechanically replayed, or used as a second authority.

Process disclosures retained rather than hidden:

1. Historical V2: 526 packages materialized from an existing local store and two failed TLS font attempts.
2. Fresh FAIL manifest first invoked from the wrong working directory; unchanged rerun from repository root passed.
3. Superseded `95067a...` captures were discarded after M01 hardening; all delivered captures were rerun.
4. Prompt-history arguments were first passed in the wrong form; exact `--base=<sha>/--candidate=<sha>` rerun passed.
5. Two superseded Turbopack fixture attempts crossed the reviewed fixture root; the established `--webpack` fixture passed.
6. Detached lifecycle first selected system x64 Node 25; explicit project arm64 Node 24.14.0 produced final evidence.
7. The first dependency-link loop mishandled spaces; the quoted link-only replacement performed no materialization.
8. One inline raw SQL proof lost shell quotes and failed read-only; typed counts/closed Schema rerun passed under network deny.

No current remediation action installed, materialized, downloaded, contacted a registry, or attempted network.

## 7. Prohibited-action confirmation and next gate

Confirmed not performed: real DeepSeek/other Provider call or adapter; credential/spend; fallback; RAG/retrieval/
embedding/vector; vision/tool/file/URL; customer_support or private Inquiry/CRM input; Production Prompt prose;
durable run repository/enqueue/Worker/claim/lease/retry/cancel/scheduler/outbox runtime; Schema/Migration/snapshot/
journal/seed/backfill/formal data or dependency/lock change; public product/SEO/URL/Redirect/Publish/Index change;
Staging/Production access; Deploy; merge; Push; self-review; or Phase C/D/E work.

The Candidate is complete but not accepted. The sole next gate is Fresh Independent Implementation Re-review of
the exact final Candidate by the original Reviewer.
