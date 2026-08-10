# Independent Foundation Implementation V2 Remediation V1 Re-review Evidence V2.1

## 1. Purpose and isolation

This package supports the Fresh independent implementation re-review of exact Candidate `2e6dc7a520404b629c795447ce710b36740ff972`. It is review evidence, not Candidate implementation, remediation, acceptance, or authorization.

- Formal Candidate worktree: `/Users/calvin/.codex/worktrees/07a1/CWT（CloudWave Textile）项目`.
- Detached exact-HEAD review worktree: `/tmp/cwt-phase-b-impl-v2-remediation-review.L4DTz2/repo`.
- Disposable Fresh-fault worktree: `/tmp/cwt-remediation-fault.yHUqy9/repo`.
- Disposable official lifecycle worktree: `/tmp/cwt-remediation-next-review.T5nCZc/repo`.
- Required installed runtime: Node `24.14.0`, TypeScript `5.9.3`, Next `16.2.12`.
- Review commands used only already installed dependencies. No package manager, install, download, registry, network, Provider, API, credential, Staging/Production, Deploy, Publish, Index, formal-data, merge, or Push action occurred.
- No preserved/default PGlite was used or mutated; Fresh behavior probes used disposable in-memory PGlite databases.

The first detached review worktree used a top-level `node_modules` symlink. The architecture gate correctly refused that excluded root because the selected lifecycle profile requires a physical directory. Exact gate verification therefore ran in the formal exact-HEAD worktree, which already had physical installed dependencies, and in a separate disposable exact-HEAD worktree populated by filesystem copy-on-write from those local dependencies. This was no install or download and changed no Candidate bytes.

## 2. Identity and immutable inputs

- Branch ref/HEAD/direct parent/code HEAD/Design start/failed V2: exact PASS.
- Linear commits after failed V2: 12; code changes end at `12817e6...`; later commits are docs/evidence only.
- Original failed implementation refs, V1, V2, and V3: all non-ancestors.
- Failed V2 to final Candidate: exactly 59 paths, one deletion, 35,384 insertions, 295 deletions.
- Remediation manifest: 56/56 PASS; aggregate envelope PASS.
- Imported independent FAIL manifest: 7/7 PASS.
- Schema/Migration/snapshot/journal/seed/lock/dependency objects: unchanged.
- Four public file blobs: exact Design-start identity PASS.
- Pagination helper: absent at Design start and Candidate PASS.
- Global diff check: exit 2 only for the immutable V1.7 review EOF blank line; owned scope: exit 0.

## 3. Decisive Fresh behavior challenges

The exact injected changes are preserved in `REVIEWER_FRESH_CHALLENGES_V2_1.patch`. Each expected a fail-closed result. A failed reviewer assertion therefore demonstrates that the Candidate accepted the prohibited condition.

### 3.1 IMP2-M01 source identity/target binding

Input:

- target Product: `11111111-1111-4111-8111-111111111111`, version 7;
- selected Product source: `22222222-2222-4222-8222-222222222222`;
- repository result identity: Product `33333333-3333-4333-8333-333333333333`, version 99;
- conspicuously synthetic returned name: `SYNTHETIC wrong product`.

Observed:

```json
{
  "builtOk": true,
  "acceptedTargetProduct": "11111111-1111-4111-8111-111111111111",
  "acceptedValue": "SYNTHETIC wrong product",
  "persistedSourceIdentity": {
    "productId": "33333333-3333-4333-8333-333333333333",
    "recordVersion": 99
  }
}
```

The reviewer test exited 1 because it expected `built.ok=false` and received true. The policy binds neither the requested selector ID nor the target Product/version to the repository DTO.

### 3.2 IMP2-M02 equivalent repetition

Input: 30 Product Description paragraph blocks, each referencing the valid `src_01:fabricStyle`, sharing the prefix `Repeated plain weave narrative` and differing only in one harmless alphabetic suffix.

Observed:

```json
{
  "resultOk": true,
  "blockCount": 30,
  "allIndividualControlsOk": true,
  "automaticEvidenceStatus": "structural_provenance_checked",
  "semanticReviewStatus": "human_review_required"
}
```

The reviewer test exited 1 because it expected the bounded A-08 repetition policy to reject the combined spam. Exact-text, exact-block-hash, and same-token-run checks do not cover this equivalent pattern.

### 3.3 IMP2-NH01 Product Revision role authorization

A synthetic Product Editorial Revision was inserted in a disposable PGlite database. The actual Phase B availability service returned:

```json
{
  "productEditor": {
    "ok": true,
    "value": {"available":false,"manualEditorAvailable":false,"code":"authorization_denied"}
  },
  "contentEditor": {
    "ok": true,
    "value": {"available":false,"manualEditorAvailable":true,"code":"integration_not_ready"}
  }
}
```

The reviewer test exited 1. The role gate ran before the authoritative revision `entity_type` read and treated the union member `editorial_revision` as Content.

## 4. Decisive Fresh architecture fault

The disposable Candidate added a non-foldable conditional dynamic import to real `src/app/page.tsx`, selecting either the forbidden Phase B composition root or an ordinary public module at runtime. The checker returned exit 0 and `ok:true`:

```json
{
  "head": "2e6dc7a520404b629c795447ce710b36740ff972",
  "candidateCount": 517,
  "executableCount": 446,
  "zeroClass": [],
  "ambiguous": [],
  "edgeCount": 2388
}
```

The exact unmutated Candidate baseline has 2387 edges. Inspection locates the gap at `enforceCapabilityEdge`: unsupported/unresolved acquisitions are rejected for protected AI, the Phase B root, and a public-client traversal, but not for a Production business consumer. The declared direct/alias/re-export/resource graph faults remain useful and pass; they do not cover this unsupported Production acquisition.

## 5. Fresh exact-Candidate verification

Material results are consolidated in `REVIEWER_FRESH_VERIFICATION_OUTPUT_V2_1.txt`:

- focused AI: 13 files / 138 tests PASS;
- full suite: 111 files / 555 tests PASS;
- lint and strict typecheck PASS;
- DB verifier PASS; 21/21 and 96/96 exact independent mapping PASS;
- Prompt bundle and exact Candidate history PASS;
- architecture baseline PASS as implemented: final Candidate 517/446, 12 classes, zero/ambiguous empty, 2387 edges, 2 positive/6 negative types, 11 graph faults, 28 lifecycle mutations;
- official Next present lifecycle PASS: 518/447, exact ignored/generated `next-env.d.ts`; two generation runs byte-stable;
- isolated AI server build PASS: 51 server files / 16 client chunks and no marker leakage;
- in-memory migration/noindex/Phase B availability subset PASS: 3 files / 5 tests;
- Fresh standalone in-memory migration/noindex proof PASS: accepted through 0020, `APP_ENV=test`, `FEATURE_AI=false`, `NON_PRODUCTION_NOINDEX=true`, public Index false, zero `ai_model_config`/`ai_runs` rows, and no Synthetic persistence;
- exact source prohibited-capability scans found only accepted field/error/contract literals, no active Provider or Phase C/D/E implementation.

The exact checked-in suite is useful regression evidence but cannot close the four Fresh reproductions because those behaviors are absent from its assertions.

## 6. Original finding disposition evidence

- IMP2-M03 CLOSED: `DraftPrivateReadState`, `withDraftReadExecutor`, and both scope constructors expose only `Pick<AppDatabase<T>, "select">`. Raw execute/query/transaction/lock/mutation methods are absent. The execute-negative fixture produces TS2339.
- IMP2-M05 CLOSED: public blobs equal V1.7 start and Candidate pagination helper is absent.
- IMP2-L01 CLOSED: the Phase B factory return type and concrete facade are availability-only. Request codecs/types remain inert contracts and are not exposed as callable runtime authority.
- IMP2-L02 CLOSED: executable captures are tied to code HEAD `12817e6...`; final successors are docs-only; test counts match Fresh runs; the local-store and TLS history remains disclosed.

## 7. Scope not exercised

No browser E2E, external PostgreSQL, real Provider, or full public-site build was needed or permitted. The affected risks were exercised by in-memory database integration, all unit/integration tests, strict types, architecture/lifecycle checks, Prompt/Schema gates, and the isolated server fixture. The pre-existing Google-font full-site offline build debt remains outside the Phase B Candidate and was not represented as PASS.
