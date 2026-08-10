# CWT Stage 4A Phase B — Foundation Implementation V2 Remediation V2 Evidence V2.2

## 1. Evidence identity and claim boundary

- Branch: `codex/phase-1b-stage4a-phase-b-foundation-implementation-v2-remediation-v2`.
- Fixed failed Remediation V1: `2e6dc7a520404b629c795447ce710b36740ff972`.
- Exact final code HEAD for every executable capture in this directory:
  `111301aea82569768661c6401b16054161ed19ff`.
- Exact V1.7 design/full rollback: `3f475e13d73d9d68a4dfb9a040941c57f1ee92e6`.
- Worktree: `/Users/calvin/.codex/worktrees/07a1/CWT（CloudWave Textile）项目`.
- Runtime: Node `24.14.0`, TypeScript `5.9.3`, Next `16.2.12`, all already installed.

The four architecture proof JSON files, the absent/present Next reports, both official typegen captures,
and the isolated server fixture build were generated in a disposable detached worktree at the exact code HEAD.
Its top-level `node_modules` was a physical excluded directory containing only links to the already installed
dependency tree. No install, dependency materialization, download, registry access, or network access occurred.
All later evidence/report/manifest commits are documentation-only successors; source, tests, configuration,
package, lockfile, Schema, Migration, snapshot, and journal remain byte-identical to the code HEAD.

The build evidence is deliberately limited to the reviewed AI server fixture. It is not a full public-site build.
The exact-start Google Font path remains pre-existing offline public-site debt and was neither invoked nor changed.

## 2. Immutable Fresh Re-review FAIL authority

The Fresh Re-review artifacts were imported byte-identically before correction:

- report: `0a191e3e0877a2c97f3865cc6877bd186a06ec8a6c23a468de8b75f0a7813cfe`;
- evidence: `71a6711edc06ea6d98fd5a006a56e9ce9827b1f0cc77a7d5133d1aa3b706fd14`;
- Fresh challenge patch: `b62e115eccac8f961096a1284433f474ab32fa8b41ef41aec15b87677a90c892`;
- Fresh output: `8dcd907c3b0a25d4291e4ed78351e1b1bfe75d9491d2af3db49a2e6e0e2a730c`;
- four-entry manifest: `3a2d57aa0756a03f97d9f403f0058a78247e2664e5b134447d800ece63365691`, 4/4 PASS.

No Reviewer artifact was modified. The first manifest verification invocation was made from the evidence
subdirectory even though its paths are repository-relative; that invocation failed path resolution only. The
unchanged manifest was rerun from repository root and passed 4/4.

## 3. Finding closure evidence

### IMP2-NH01 — correction attempt 1

The sole actor-scoped availability read now obtains the authoritative Editorial Revision `entity_type` before
choosing the non-Admin editor role. Product Draft/Revision permits Product Editor; Content Draft/Revision permits
Content Editor. The role and record scope are enforced before any distinguishable existence, version, state, or
readiness result. The real Phase B service with disposable PGlite covers Product/Content Draft and Revision,
Admin/correct/wrong editor, missing record, and wrong version. The Reviewer Product Revision direction is reversed
without regressing Content Revision. One read and zero locks remain.

### IMP2-M01 — correction attempt 2

The one application-owned context policy now strict-parses a discriminated DTO per source class. Product, Fabric,
and Company Fact identity/version fields are no longer arbitrary JSON. The policy checks selector ID, returned
record identity/current-version confirmation, exact target binding, and the Product/Fabric direct-target version
rule before reading any field value or constructing provenance. Source identity is constructed only after these
checks and appears only in `input_sources_json`.

The exact `1111` target / `2222` selector / `3333` repository Product / version `99` reproduction fails before
value or fingerprint acceptance. Adversarial tests also reject wrong Product/Fabric/Company Fact IDs, stale Product
and Fabric versions, stale Company Fact timestamp, and wrong target identity/version; the schemas themselves are
strict, so undeclared DTO keys fail parsing.
The existing four per-use-case Prompt-variable contracts, field/provenance/value/limit matrix, JCS input hash,
JSONB-shaped round trip, and claimed reconstruction remain one policy and byte/hash-identical.

### IMP2-M02 — correction attempt 2

The single bounded A-08 authority now derives deterministic token cores for each proposal block and counts
equivalent families after removing at most two cosmetic prefix/suffix tokens. A core must retain at least four
tokens and three distinct tokens; more than three occurrences fails closed. The Reviewer 30-block
`Repeated plain weave narrative alpha..dahlia` family and a Fresh prefix-plus-suffix family are rejected, while
eight non-repetitive B2B paragraphs sharing ordinary textile vocabulary pass. No semantic entailment, LLM verifier,
second classifier, or weakened human-review boundary was introduced.

### IMP2-M04 — correction attempt 2

The sole architecture graph authority now applies `production-acquisition-must-resolve-uniquely` to every
Production executable class before capability/class rules. Non-foldable dynamic import, require, createRequire,
computed require.resolve, template/concatenated acquisition, import-meta resource, alias, and re-export variants are
closed by the same AST/acquisition resolver. The checked graph has 19 real faults (11 retained plus eight Fresh
variants), 28 lifecycle mutations, one sealed 12-class selector, and four required proof artifacts.

The Reviewer code was injected temporarily into the real `src/app/page.tsx`. The gate exited `1` with exact path,
rule, AST form `dynamic-import`, edge kind `runtime`, source position, resolution `unsupported`, and reason
`non_foldable_specifier`. The injection was immediately reversed; the file returned to SHA-256
`2e9ff5730c20e6dbdf203da693fba5ceaee446636a0bf9c9865cc784fc8dc994`, zero Git diff, and the full gate passed
again with the same bytes as the pre-injection report.

## 4. Exact final-code verification

| Gate | Exact result |
|---|---|
| Reviewer Fresh reproductions | PASS, 3 files / 6 selected tests; NH01 matrix/no-leak, M01 exact identity, M02 exact/Fresh/safe corpus |
| focused AI | PASS, 13 files / 149 tests |
| security/context/output | PASS, 5 files / 119 tests |
| full suite | PASS, 111 files / 566 tests, 264.07s |
| lint | PASS, exit 0, zero warnings |
| strict typecheck | PASS, exit 0 |
| accepted 0020 verifier | PASS: design identity, 40 historical artifacts, journal/schema/constraints/index scope |
| independent Schema mapping | PASS: `ai_model_config=21/21`, `ai_runs=96/96`, exact order |
| Prompt bundle/history | PASS; Production bundle exact-empty; protected history `6bc26cf... -> 111301a...` |
| raw JSON and M02 Unicode/limits/corpus | PASS within focused/security suites, including duplicate keys/root/bytes and 32-rule limits |
| read/DB type boundary | PASS: 2 positive / 6 expected-negative; execute negative `TS2339`; source execute scan zero |
| architecture source-clean | PASS: 518 candidates / 446 executable / 0 unclassified / 0 ambiguous / 2389 edges / 19 faults / 28 mutations |
| official Next present | PASS: 519 / 447; ignored root `next-env.d.ts` SHA-256 `7b550dda...`; both typegen lists byte-identical |
| isolated AI server build | PASS under network deny: Next webpack, 51 server files / 16 client chunks, 3 markers plus raw Prompt server-only |
| isolated migrated/noindex | PASS through accepted 0020: memory-only, feature false, Index false, 0 config/run rows, no Synthetic persistence authority |
| public baseline | PASS: four exact-start blobs; Candidate pagination helper absent |
| failed-code isolation | PASS: `755e514...`, `a696325...`, `b1a73bb...`, `d8a24d4...` are non-ancestors |

The four public exact-start SHA-256 identities remain:

- `src/app/layout.tsx`: `b8a4052150366d69d48ac4e0449b52f6f991538097f648ab0ded80e73713c797`;
- `src/app/globals.css`: `3803f0969144f92064f85b11e262cecdad0c6ac46942e240a1b013dfd97d46aa`;
- `src/app/products/page.tsx`: `65ac3c2736f7acdcce92e4e21a5a4077c62ff4b7b6c4e43f848303101a0a235d`;
- `src/app/products/page.test.ts`: `d59979b87eb8de6e12c6abbc4f01b2ea11c999a95e21be31a0632f705678a554`.

`package.json`, `pnpm-lock.yaml`, `drizzle/`, and `src/db/schema/` have zero delta from failed Remediation V1.
The failed Remediation V1 branch remains fixed at exact `2e6dc7a...`; the frozen tag resolves to exact
`31c0e405acfdd0d05200d0fb2531e897a541a2c4`.

## 5. Diff-check and process fidelity

The exact Design-start-to-code-HEAD global `git diff --check` exits `2`; it is **not PASS**. Its only diagnostics
are immutable imported evidence:

1. V1.7 independent report line 118: `new blank line at EOF`;
2. Fresh Reviewer challenge patch line 153: one trailing-space line preserved byte-identically.

The V2-owned/scoped check excluding immutable imported artifact sets exits `0`. Final documentation is also checked
before delivery; no new diagnostic is accepted.

Retained process disclosures:

1. Historical Candidate V2 materialized 526 packages from an existing local store and made two failed TLS font
   attempts. This remediation performed neither action.
2. Earlier superseded `95067a...` captures were discarded after the M01 stale-projection hardening commit; every
   delivered executable capture was rerun against `111301a...`.
3. The first prompt-history invocation used separated arguments; the script requires `--base=<sha>` and
   `--candidate=<sha>`. The corrected exact invocation passed and is the only delivered capture.
4. Two superseded Turbopack fixture attempts inferred a package realpath outside the fixture. The reviewed fixture
   was then run with its established local `--webpack` boundary and passed; no product source was changed.
5. The detached worktree's first shell selected system x64 Node 25 instead of project arm64 Node 24, so esbuild
   stopped before verification. Explicit project Node `24.14.0` then produced both final lifecycle states.
6. The first dependency-link loop failed on the workspace path's spaces; it created no dependency content. The
   replacement used quoted paths and links only, with no install/materialization.
7. The first inline migrated proof used a shell-quoted raw SQL literal whose quotes were stripped; the query failed
   without changing state. The replacement used typed table counts plus the closed Schema authority and passed under
   the same system network-deny policy.
8. The final owned whitespace check found double-LF endings in five generated machine logs. A docs-only finalization
   normalized those files to one LF terminator; executable content and results did not change, and the scoped check
   then passed.

These are harness/invocation corrections, not additional finding attempts. No root reached a third failed closure,
no Max escalation occurred, and no compatibility layer or second authority was added.

## 6. Prohibited actions and next gate

No real Provider/API/credential/spend, Provider adapter, fallback, RAG/retrieval/embedding/vector, vision/tool/file/
URL, private Inquiry/CRM data, Production Prompt prose, durable `ai_runs` repository/enqueue/Worker/scheduler,
Schema/Migration/seed/formal data, dependency/lock change, public product/SEO/URL/Redirect/Publish/Index change,
Staging/Production access, Deploy, merge, Push, self-review, or Phase C/D/E work occurred.

This Candidate is **NOT SELF-APPROVED** and **NOT YET ACCEPTED**. The sole next gate is a Fresh Independent
Implementation Re-review of the exact delivered Candidate by the original Reviewer.
