# Independent Foundation Implementation V2 Review Evidence V2.0

## 1. Purpose and isolation

This package supports the Fresh independent review of exact Candidate
`0d5b067c0912290ffd91d4d34b064d9c8dacd712`. It contains reviewer-authored probes and condensed hashes/results. It is not Candidate implementation, remediation, or an acceptance record.

- Formal Candidate worktree: `/Users/calvin/.codex/worktrees/07a1/CWT（CloudWave Textile）项目`.
- Detached read-only review worktree: `/tmp/cwt-phase-b-impl-v2-review.SbRrxf/repo`.
- Disposable M03 fault worktree: `/tmp/cwt-phase-b-impl-v2-arch-fault.B0IyMP/repo`.
- Disposable official lifecycle worktree: `/tmp/cwt-phase-b-impl-v2-next-lifecycle.3JFgya/repo`.
- Disposable migrated build worktree: `/tmp/cwt-phase-b-impl-v2-build.712CuO/repo`.
- Required installed runtime: Node `24.14.0`, pnpm `11.9.0`, TypeScript `5.9.3`, Next `16.2.12`.
- No Provider/API/credential/Staging/Production/Deploy/Publish/Index/formal-data action occurred.
- No preserved/default PGlite was used or mutated.

The reviewer initially invoked repository pnpm wiring; repository automation performed an offline consistency/materialization step against the local store (`downloaded 0`) and recreated ignored `node_modules` in the formal worktree. No tracked file changed. All later commands used the installed Node/binaries directly. This exception is retained rather than described as zero install-like action.

## 2. Identity and fixed inputs

- Ref/HEAD: exact PASS.
- Direct parent: `530fa35aa08dc9c49b25f97a589cefd1f27617b8`, exact PASS.
- Start: `3f475e13d73d9d68a4dfb9a040941c57f1ee92e6`, ancestor PASS.
- Linear commits after start: 27; merge commits: 0.
- Failed refs original/V1/V2/V3: all non-ancestors.
- Start-to-HEAD: 114 paths, 15,003 insertions, 34 deletions.
- Manifest: 112/112 payload entries PASS; plus manifest and aggregate envelope = 114 paths.
- Fixed report/authorization/manifest/envelope hashes: PASS.
- Imported V1.7 PASS hashes and 6-file manifest: PASS.
- Schema/Migration/snapshot/journal/seed/lockfile diff: zero.
- Dependency/devDependency/engine/package-manager objects: unchanged.

The independent blob comparison covered 91 source/test payloads against all four failed refs. One exact match was found: the required exact-empty Production Prompt manifest. No other relevant payload blob matched.

## 3. Fresh reviewer probes

### 3.1 Context, output, and M02 challenge

`REVIEWER_CONTEXT_OUTPUT_AND_M02_CHALLENGE_V2_0.mts` uses a fresh PGlite test database and the real implementation. Results:

```json
{
  "invalidProductValuesAccepted": {
    "negativeWeight": true,
    "halfMoqPair": true,
    "structuralComposition": true
  },
  "aggregateLimitsAccepted": {
    "nineFabricSources": true,
    "twentyOneCompanyFacts": true
  },
  "provenanceIdentity": { "alias": "src_01" },
  "promptVariables": {
    "keys": ["context_json", "input_hash"],
    "inputHashMatchesPrepared": false
  },
  "claimedCrossUseCase": {
    "durableContextAccepted": true,
    "productOutputAcceptedWithCompanyFactRef": true
  },
  "repeatedSpamAccepted": true
}
```

The same probe independently verified the selected M02 tradeoff and fresh Unicode variants:

- `deep<U+034F>seek`, `deep<U+2060>seek-v4-flash`, `deep<U+20DD>seek`, and `deep<LF>seek`: protected.
- `deep-seek`, `deep—seek`, and `deep seek`: allowed, matching the Owner-selected visible-separator consequence.
- Persian ZWNJ, emoji ZWJ, accented text, and CJK: allowed.
- per-gap 4/5: protected / unsupported.
- total 64/65: protected / unsupported.

Probe output SHA-256: `92a85062a62e4576dc138448f2a136ee286e4718ed464c122d1de8e8cc571cc7`.

### 3.2 Raw JSON parser challenge

`REVIEWER_RAW_JSON_CHALLENGE_V2_0.mts` produced:

```json
{
  "escapedDuplicate": "output_invalid_json",
  "nestedDuplicate": "output_invalid_json",
  "normalizedDuplicate": "output_invalid_json",
  "fenced": "output_invalid_json",
  "concatenated": "output_invalid_json",
  "truncatedEscape": "output_truncated",
  "exactByteBoundary": "accepted",
  "overByteBoundary": "output_too_large",
  "exactMemberBoundary": "accepted",
  "overMemberBoundary": "output_invalid_json"
}
```

Output SHA-256: `b3a8710df2d7c508c0099f47f326ce06ae2b667b597090b91833c8c3e35b61ea`.

### 3.3 Independent 0020 mapping

`REVIEWER_SCHEMA_MAPPING_V2_0.mjs` parses the accepted Phase A design tables, the 0020 snapshot, TypeScript AST for `src/db/schema/ai.ts`, and the SQL `CREATE TABLE` order independently of the repository verifier.

```json
{
  "ok": true,
  "acceptedDesignSha256": "db6ae44d3548e2c0c23ab2b95ee3550fefedb93224f878f5a9ab3070898b60a8",
  "tables": [
    {
      "table": "ai_model_config",
      "count": 21,
      "orderSha256": "bb8f81617e365e1e8095784b07fb3061f65aca44c8aacc76215456de243fb88c",
      "designSnapshotDrizzleMigrationExact": true
    },
    {
      "table": "ai_runs",
      "count": 96,
      "orderSha256": "177a8c3bbe72fd198459e5da8376154030ed39a865704159d03fda9e1eeeecb4",
      "designSnapshotDrizzleMigrationExact": true
    }
  ]
}
```

Output SHA-256: `0e6172403da4c2ce3fc88b23c1b2fe06b397d2f52a21d71f1aca6cbd5939be74`.

### 3.4 M03 graph fault injection

The disposable fault added one line to `src/app/page.tsx`:

```ts
import "@/server/ai/phase-b-composition";
```

The selected profile explicitly requires no Production business module to import the Phase B composition root. The real checker nevertheless exited `0` and reported:

```json
{
  "ok": true,
  "candidateCount": 501,
  "executableCount": 443,
  "zeroClass": [],
  "ambiguous": []
}
```

Full checker output SHA-256: `4af6b224131063d5e4f4f8c54d52a192d188826c72c6c87fab5224fa065dcec6`.

Source inspection confirmed that `scripts/verify-ai-architecture.ts` does not parse/enforce general import/re-export/resource edges or emit the four build-only graph artifacts required by the selected V2.2 profile. The fault changes a real executable import edge without changing its root class, so classification-only proof remains green.

## 4. Fresh gate captures

Exact output hashes are consolidated in `REVIEWER_FRESH_VERIFICATION_OUTPUT_V2_0.txt`. Material results:

- focused AI: 13/13 files, 122/122 tests PASS;
- full suite: 111/111 files, 539/539 tests PASS;
- lint/typecheck: PASS;
- DB candidate verifier: PASS;
- Prompt bundle/history: PASS;
- selected architecture checker: PASS as implemented, 501/443, 2 positive, 5 negative, 28 mutations;
- official Next absent/present: 501/443 and 502/444; two present runs byte-identical;
- server fixture: 51 server files / 16 client chunks PASS;
- fresh isolated migration/build/public bundle: PASS; 20 public page manifests / 47 active files;
- prohibited Provider/network/runtime source scans: no active Provider SDK/endpoint/network call, no non-test `ai_runs` repository, exact-empty Provider registry and Production Prompt manifest.

The passing current architecture gate does not supersede the independent real-edge fault. The passing full suite does not supersede the context/output behavioral fault, because the checked-in tests do not cover those mandatory V1.7 vectors.

## 5. Public-site and process evidence

Start-to-HEAD public diff:

- `src/app/layout.tsx`: removes Geist and Geist Mono `next/font/google` imports/configuration and root variables.
- `src/app/globals.css`: globally changes sans/mono font stacks.
- `src/app/products/page.tsx`: removes two exported pagination helpers.
- `src/public-site/product-pagination.ts`: adds those helpers unchanged.
- `src/app/products/page.test.ts`: retargets the import.

The pagination move is semantically equivalent in the inspected code. The font change is a real public rendering/UX change. The implementation report connects both to curing offline-build failures, not to a V1.7 AI contract.

Author process disclosures were independently retained:

- local-store materialization: 526 packages reused, downloaded 0, lock unchanged;
- first remote-font build: two failed TLS attempts, no successful connection/download.

These are historical process violations of the explicit no-install/no-network boundary, not evidence of a Provider call or a tracked dependency change.

## 6. Diff-check truth

- Global start-to-HEAD `git diff --check`: exit `2`.
- Sole diagnostic: `docs/PHASE_1B_STAGE4A_PHASE_B_CORRECTED_EXACT_DESIGN_INDEPENDENT_REVIEW_V1_2.md:118: new blank line at EOF.`
- Global log SHA-256: `2ffbc295e49d0e1c2c51de4c47be8a381f7a3ece5397caeb267a0d4c2d6d1aca`.
- Owned scope excluding exactly the six immutable imported V1.7 PASS artifacts: exit `0`, empty-output SHA-256 `e3b0c442...`.

No imported evidence bytes were changed.

## 7. Scope not exercised

No full browser E2E or PostgreSQL external validation was required. The task called for local/offline proportional verification; PGlite migration, all unit/integration tests, type/static gates, official Next generation, server fixture, full isolated build, and public bundle closure exercised the affected local risks. No network or external database was used.
