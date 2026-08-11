# CWT Stage 4A Phase B — Independent Corrected Design V1.9 Review Evidence

## 1. Evidence purpose

This package records the Fresh, read-only review of exact Candidate `c0fe5b57100ff7fd83ef50b85288e6160397af80`. Candidate content was not edited. The formal worktree remained clean; probe-generated files existed only in a disposable detached snapshot.

## 2. Inputs read

The Reviewer read the root `AGENTS.md`, `docs/ENGINEERING_GOVERNANCE.md`, `docs/REVIEW_POLICY.md`, ADR-0018, both Owner records, accepted V1.7/V1.8 authority needed for comparison, the complete V1.8 independent FAIL report/evidence/challenge, the standalone V1.9 Design, derivation audit, machine profile, vectors, fixed TypeScript probe, verifier, capture, identities, and both manifests. Actual `src/ai/errors.ts`, telemetry, Schema, Migration, Prompt/M02, M03 profile, and database typing facts were inspected as required.

## 3. Identity and immutable evidence

See `IDENTITY_SCOPE_VERIFICATION_V1_0.txt`. Highlights:

- exact ref/HEAD/parent/history: PASS;
- immutable checkpoint and first-child one-path record: PASS;
- frozen tag peel: PASS;
- formal worktree: clean;
- 17-path docs/evidence-only scope: PASS;
- Candidate manifest 21/21: PASS;
- imported V1.8 FAIL manifest 7/7: PASS;
- all supplied fixed hashes: PASS;
- start-to-HEAD whitespace/diff check: exit 0.

## 4. Author verifier reproduction

Command shape:

```text
/Users/calvin/.nvm/versions/node/v24.14.0/bin/node \
  --import <existing-local-node_modules>/tsx/dist/loader.mjs \
  docs/review-evidence/.../VERIFY_CORRECTED_EXACT_DESIGN_V1_9.mjs
```

Two Fresh runs exited 0, were byte-identical, and matched the checked-in capture. The captured stream is preserved as `AUTHOR_VERIFIER_FRESH_OUTPUT_V1_0.txt`.

This green result was not treated as review authority. The verifier was read completely and challenged at its type and compiled-profile boundaries.

## 5. Reviewer Fresh challenge

`REVIEWER_V19_FRESH_CHALLENGE_V1_0.mjs` uses Node built-ins, the exact Candidate files, installed local `tsc`, and the installed local tsx loader. It performs:

1. independent extraction of all 69 source `aiErrorCodes` and exact comparison with the profile;
2. independent recomputation of the compiled profile identity;
3. the fixed author TypeScript probe;
4. a literal implementation of the V1.9 §17 profile-derived and inverse TypeScript claims;
5. independent order extraction from the profile, §13 marker, §18.4 list, and §18.5 matrix;
6. four new order mutations;
7. a cloned-profile demotion identity mutation;
8. post-compile in-place demotion of `/task/guideIntent` with an email payload; and
9. post-compile in-place demotion of recursive source values with a nested email payload.

The literal profile-derived TypeScript probe exited 2. Both in-place demotion children accepted the prohibited payload and exited 97. The deterministic summary is preserved as `REVIEWER_V19_FRESH_CHALLENGE_OUTPUT_V1_0.txt`.

The challenge intentionally creates transformed verifier files only inside the disposable snapshot. Those files are not Candidate changes and are not part of the deliverable manifest.

## 6. Schema and non-regression checks

- Direct offline `scripts/verify-ai-foundation-candidate.ts`: PASS.
- Independent Drizzle `getTableColumns` extraction: `ai_model_config=21`, `ai_runs=96`.
- Selected M02 registry SHA-256: `264ca6358dcec00da5bc17e134c89e52d5321c87683212b8c32ba12756700b66`.
- Selected M03 V2.2 profile SHA-256: `1f0b56a870ecbab61c970e1c7000dff591674e0f8ad0a04341538c724a36c173`.
- No Candidate source/Schema/Migration/ADR/package/lock/runtime change.
- No Provider/API/network/credential/build/deployment action.

## 7. Finding evidence summary

| Finding | Decisive evidence | Result |
|---|---|---|
| V18-M01 | fixed probe imports profile but only `void profile`; literal §17 probe widens profile code to `string` and the 69-to-5 inverse is non-empty | OPEN, Medium |
| V18-M02 | profile/marker/list/matrix exact; 4 new order mutations rejected | CLOSED |
| V18-M03 | baseline compile cache returns mutable profile without identity recheck; two post-compile demotions accept email payloads | OPEN, Medium |

No genuinely new architecture root was found. The two open findings are residual failures of the corresponding V18 proof-authority roots.

## 8. Proportionality and exception

No package installation or download was performed. A package-script attempt aborted before execution when pnpm proposed reconciling the disposable symlinked `node_modules`; the Reviewer did not authorize that operation. The verifier was run directly using the already installed local runtime.

Because the Candidate is documentation/evidence-only, unrelated full Build and application tests were not run. Exact identity, manifests, TypeScript, machine profile, recursive mutation behavior, Schema identity, and non-regression hashes are the proportionate evidence for this review.
