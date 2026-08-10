# CWT Stage 4A Phase B — Three-Strike Technical Escalation Evidence V1

## Status and scope

This is an offline, docs/evidence-only proof package for the technical escalation Candidate. It is not an independent review, an Owner approval, a corrected Design or implementation authority.

Repository product code, Schema, Migration, package, lockfile, ADR and accepted Design are unchanged. Historical failed implementations are counterexample evidence only.

## Reports

- [Technical escalation report](../../PHASE_1B_STAGE4A_PHASE_B_THREE_STRIKE_TECHNICAL_ESCALATION_V1_0.md)
- [Owner decision package](../../PHASE_1B_STAGE4A_PHASE_B_THREE_STRIKE_TECHNICAL_ESCALATION_OWNER_DECISION_PACKAGE_V1_0.md)

## Fixed identities

- [FIXED_INPUTS_V1_0.json](FIXED_INPUTS_V1_0.json) — accepted checkpoint, frozen tag, diagnostic isolation, failed evidence refs, authority-file hashes, paused Fresh Review hashes and exact runtime tuple.

## M02 — protected-data authority

- [M02_PROTECTED_DATA_AUTHORITY_PROFILE_V2_0.json](M02_PROTECTED_DATA_AUTHORITY_PROFILE_V2_0.json) — sole-authority selection rule, input/result domains, traversal, Unicode runtime, normalization, controls, insertion semantics, limits, compiler/consumer identity and fail-closed conditions.
- [M02_GRAMMAR_REGISTRY_INCLUDE_DEEPSEEK_V2_0.json](M02_GRAMMAR_REGISTRY_INCLUDE_DEEPSEEK_V2_0.json) — recommended 31-rule closed AST, including whole-token `DeepSeek` and `deepseek-`.
- [M02_GRAMMAR_REGISTRY_EXCLUDE_DEEPSEEK_V2_0.json](M02_GRAMMAR_REGISTRY_EXCLUDE_DEEPSEEK_V2_0.json) — 30-rule security-exception alternative without the DeepSeek/provider-model literal family.
- [M02_DEEPSEEK_OWNER_DECISION_PROFILE_V1_0.json](M02_DEEPSEEK_OWNER_DECISION_PROFILE_V1_0.json) — exact mutually exclusive effects, recommendation and ADR consequences; `ownerSelection` is `null`.
- [M02_FALSE_POSITIVE_AND_SECURITY_CORPUS_V1_0.json](M02_FALSE_POSITIVE_AND_SECURITY_CORPUS_V1_0.json) — mandatory direct, insertion, Unicode, false-positive, control, unsupported-value and byte-identity cases.

The two grammar registries are decision artifacts. They are never simultaneous runtime authorities.

## M03 — capability graph and literal type seam

- [M03_CAPABILITY_GRAPH_AND_DATABASE_SEAM_PROFILE_V2_0.json](M03_CAPABILITY_GRAPH_AND_DATABASE_SEAM_PROFILE_V2_0.json) — complete root taxonomy, protected/excluded edges, exact five-edge Phase B composition root, actual database types, future adapter template, unsupported syntax and build/bundle proof contract.
- [M03_DATABASE_DISCRIMINATED_SEAM_POSITIVE_V1_0.ts](M03_DATABASE_DISCRIMINATED_SEAM_POSITIVE_V1_0.ts) — the recommended no-erasure outer switch.
- [M03_DATABASE_UNION_PROJECTION_NEGATIVE_V1_0.ts](M03_DATABASE_UNION_PROJECTION_NEGATIVE_V1_0.ts) — proves the unnarrowed union cannot enter the generic protected factory.
- [M03_DATABASE_DRIVER_SWAP_NEGATIVE_V1_0.ts](M03_DATABASE_DRIVER_SWAP_NEGATIVE_V1_0.ts) — proves a PGlite database cannot be handed to a Postgres-HKT contract.
- [tsconfig.m03-positive.json](tsconfig.m03-positive.json), [tsconfig.m03-union-negative.json](tsconfig.m03-union-negative.json), [tsconfig.m03-driver-swap-negative.json](tsconfig.m03-driver-swap-negative.json) — strict, no-emit probe configurations.
- [M03_DATABASE_DISCRIMINATED_SEAM_OUTPUT_V1_0.txt](M03_DATABASE_DISCRIMINATED_SEAM_OUTPUT_V1_0.txt), [M03_DATABASE_UNION_PROJECTION_OUTPUT_V1_0.txt](M03_DATABASE_UNION_PROJECTION_OUTPUT_V1_0.txt), [M03_DATABASE_DRIVER_SWAP_OUTPUT_V1_0.txt](M03_DATABASE_DRIVER_SWAP_OUTPUT_V1_0.txt) — normalized captured results.

The positive probe is outside Product build scope and imports the repository's real types. The negative probes are expected to fail with `TS2375`; those failures are PASS evidence.

## Offline verification

- [VERIFY_TECHNICAL_ESCALATION_V1_0.mjs](VERIFY_TECHNICAL_ESCALATION_V1_0.mjs) — validates fixed identities, exact runtime, both closed ASTs, direct/insertion derivation, corpus, decision delta, graph/root/type contracts, strict TypeScript probes, links, scope, manifest and clean state.
- [VERIFY_TECHNICAL_ESCALATION_OUTPUT_V1_0.txt](VERIFY_TECHNICAL_ESCALATION_OUTPUT_V1_0.txt) — captured successful verifier output.
- [SHA256SUMS.txt](SHA256SUMS.txt) — hashes every stable report/evidence artifact except itself.

Run from repository root with the exact runtime recorded in `FIXED_INPUTS_V1_0.json`:

```sh
node docs/review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-v1/VERIFY_TECHNICAL_ESCALATION_V1_0.mjs
```

No Provider/API/credential/network/spend is used. The verifier reads the paused Fresh Review V1.1 artifacts only to recompute the callback hashes. A missing/moved paused worktree is a fixed-evidence verification failure, not permission to modify it.

## Interpretation limits

A full verifier PASS proves that this Candidate is internally consistent, hash-bound, offline-repeatable and implementable at the specified proof boundaries. It does not prove a later Product implementation, Production bundle, Provider behavior, external service, database runtime or independent acceptance.

The only next gate is Fresh Independent Technical Escalation Review by the original independent Reviewer.
