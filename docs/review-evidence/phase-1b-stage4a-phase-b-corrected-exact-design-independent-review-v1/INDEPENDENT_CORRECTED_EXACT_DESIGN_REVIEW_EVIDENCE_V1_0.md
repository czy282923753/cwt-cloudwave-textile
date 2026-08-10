# Corrected Exact Design V1.5 — independent review evidence

## Result

**Review conclusion: FAIL**

**Finding count: Blocker 0 / High 0 / Medium 1 / Low 0 / External Validation 0**

The exact Candidate identity, all fixed bytes, both selected options, schema mapping, M02 transition boundary and M03 discriminated database type seam were independently reproduced. A new deterministic design defect remains in the selected M03 complete-graph contract.

## Isolation and method

The Candidate was inspected read-only at `/Users/calvin/.codex/worktrees/263d/CWT（CloudWave Textile）项目`. Reviewer artifacts exist only in detached reviewer worktree `/tmp/cwt-corrected-design-v15-review.NmkiA4`. A read-only `node_modules` symlink to the Candidate's already-installed dependencies was used for TypeScript probes. No install, download, registry, network, Provider/API, credential or external environment was used.

The reviewer read the controlling governance, ADR-0018, accepted V1.4, technical-escalation V1.1 and independent PASS, exact Owner selection, V1.5, derivation, profiles and verifier. Actual repository sources and the accepted Drizzle/SQL Schema were inspected rather than relying on the author closure map.

## Identity and fixed bytes

- exact ref/HEAD: `codex/phase-1b-stage4a-phase-b-corrected-design-v1` / `da2143654a372f70a93ff22f9fcb6e999f1e528e`;
- direct parent: `9cedefd618a168176f8d70a85e3ec8cb684967a7`;
- required escalation ancestor / accepted rollback: `377181cd76e5427f344ff0c259fc9bd32ec7b670` / `6bc26cf035608a21a057d6f4e87da8d4f7f23d40`;
- frozen tag peel: `31c0e405acfdd0d05200d0fb2531e897a541a2c4`;
- Candidate worktree tracked-clean before and after;
- 23 added paths / 5,529 insertions / zero deletions from the escalation ancestor, docs/evidence only;
- fixed Candidate manifest 22/22 and imported independent PASS manifest 5/5 passed;
- all four failed implementation refs are non-ancestors.

## Positive independent results

### Owner selection and standalone preservation

The Owner statement is exact: `批准 M02-D1-INCLUDE；批准 M03-D1-DISCRIMINATED-SEAM。` No implementation authority is inferred. V1.5 has all 26 top-level sections; Sections 3, 4, 5, 9, 10, 11, 12, 15, 16, 17, 18, 21 and 24 are byte-identical to V1.4. The remaining edits are localized to selection derivation and selected M02/M03 proof boundaries.

### M02 selected boundary

The exact INCLUDE registry contains 32 rules: 30 rules are semantically byte-equivalent to EXCLUDE after the documented two-position priority shift, and the only delta is the two DeepSeek rules. A fresh probe admits DICP/Mark/LF witnesses, rejects visible punctuation/Separator/ordinary whitespace as equivalent gaps, rejects TAB/CR as invalid controls, distinguishes per-gap 4/5, preserves original UTF-8 bytes, and confirms exact runtime mismatch fail-closed behavior. The earlier independent all-rule transition compiler was also freshly rerun and covered total 64/65 plus all Unicode property predicates.

### M03 discriminated type seam

The actual `AppDatabase`, `PgliteAppDatabase`, `PostgresAppDatabase` and `DatabaseConnection` types were used. Both author and fresh reviewer branch-local positives compile with exit 0. Unnarrowed union, cross-driver and fresh destructured-union negatives fail with TS2375. No cast/assertion/`any`/`unknown` escape is needed for the selected direct switch seam.

### Accepted Schema mapping

An independent TypeScript-AST and SQL parser confirms exact order and membership across V1.5, `src/db/schema/ai.ts` and `drizzle/0020_phase1b_ai_foundation.sql`: `ai_model_config` 21/21 and `ai_runs` 96/96.

## Controlling finding reproduction

### V15-M01 — selected M03 complete graph cannot classify the accepted repository

The selected profile defines `.ts/.tsx/.mts/.cts/.js/.jsx/.mjs/.cjs` as executable nodes, recursively enumerates tracked plus untracked entries after exact physical exclusions, requires every candidate node to have exactly one of 12 root classes, and sets unclassified behavior to fail closed. Its root-control class lists only six exact root files; its test class covers `test-fixtures/` and declared `.test`/`.integration.test` suffix handling, not the existing `tests/e2e` paths.

The fresh actual-tree classifier intentionally gives the profile the most generous stated test-suffix interpretation and still produces six unclassified executable nodes:

1. `drizzle.config.ts`
2. `playwright.config.ts`
3. `tests/e2e/global-teardown.ts`
4. `tests/e2e/product-import.spec.ts`
5. `tests/e2e/public.spec.ts`
6. `vitest.config.mts`

This directly contradicts V1.5 §2.3's “every tracked or untracked executable/resource node” and `noCandidateNodeLeftAmbiguous=true`. A faithful implementation must fail its mandatory architecture gate on the unchanged accepted repository. An implementation that silently excludes or guesses classes for these paths would violate the exact selected profile.

The author verifier did not challenge this invariant: it asserts the declared root-class count and selected profile shape but does not enumerate the actual Candidate tree through the classification rules. Its reproducible PASS therefore does not close V15-M01.

## Finding classification and correction requirement

V15-M01 is **Medium**. It is deterministic, blocks the required Phase B structural proof, and forces unapproved design judgment before implementation. It is a new corrected-design graph-completeness root, not a reopening of the previous database-union type root and not an implementation fourth attempt.

Required correction: the standalone selected graph/profile/design/verifier must assign the existing root configuration and `tests/e2e` executable paths to explicit bounded classes (including `.spec` and setup/teardown semantics where applicable), then enumerate the actual tree and prove zero unclassified/ambiguous nodes. Narrowing or silently excluding these paths would change the selected complete-graph guarantee and cannot be inferred by an implementer. The corrected exact bytes require a fresh independent Design Review.

No Schema, Migration, ADR, dependency/package/lock, persistent-coordination Complexity Approval, SEO/URL or data reconciliation decision is required for the finding as reproduced. No new Owner selection is required if the exact approved M03 discriminated seam and complete fail-closed graph guarantee are preserved.

## Eligibility

- Owner selections: M02 fully incorporated; M03 type seam incorporated, complete graph not implementation-ready.
- Corrected Design gate: **not eligible for acceptance**.
- Phase B implementation Candidate: **not eligible to start**.
- Next gate: docs/profile/verifier correction of V15-M01 followed by a new Fresh Independent Design Review. No implementation, Phase C/D/E, merge, Push or external action is authorized.
