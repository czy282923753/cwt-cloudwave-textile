# CWT Stage 4A Phase B — Independent Corrected Design V1.10 Review Evidence

## 1. Purpose and isolation

This package records the Fresh, read-only review of exact Candidate `234cd90211c45c6cc86c988d02c8d5dc2f7858d2`. Candidate content was not edited. The formal worktree remained clean. Execution occurred in a disposable detached exact-HEAD snapshot using a disclosed read-only link to already installed local dependencies.

## 2. Inputs read and inspected

The Reviewer read the root `AGENTS.md`, `docs/ENGINEERING_GOVERNANCE.md`, `docs/REVIEW_POLICY.md`, ADR-0018, Owner records, accepted V1.7 and V1.8/V1.9 material needed for non-regression, the complete V1.9 FAIL authority, standalone V1.10 Design, remediation audit, profile, vectors, four TypeScript fixtures, verifier, capture, fixed identities, and manifests. Actual `src/ai/errors.ts`, protected-data registry, Schema, Migration, M03 profile, database typing, Prompt authority, and Git objects were inspected where material.

## 3. Identity and hashes

`IDENTITY_SCOPE_VERIFICATION_V1_0.txt` records the exact ref, history, checkpoint, Tag, 19-path docs-only scope, manifests, supplied hashes, link/fence scan, whitespace result, and clean-state checks.

All fixed Candidate hashes and imported V1.9 FAIL hashes matched. Candidate manifest passed 35/35; imported FAIL manifest passed 6/6.

## 4. Author verifier reproduction

The dependency-free verifier was invoked directly under pinned Node with the existing local tsx loader. Two Fresh runs exited 0, were byte-identical, and matched the checked-in capture. The preserved output is `AUTHOR_VERIFIER_FRESH_OUTPUT_V1_0.txt`.

This green output was not treated as review authority.

## 5. Independent Fresh challenge

`REVIEWER_V110_FRESH_CHALLENGE_V1_0.mjs` independently performs:

1. exact 69-code/order/category/retry/manual/message comparison with the live `aiErrorCodes`/`aiFailure` authority;
2. 12 new error taxonomy and traversal-subset mutations;
3. one new positive and three new expected-negative strict TypeScript probes;
4. byte-equivalent V18-M02 order/section checks plus four new order mutations;
5. transformation of the exact verifier solely inside the disposable snapshot to exercise its module-private compiler and validator;
6. a getter-backed source that changes after compilation, proving one compile read and zero later source reads across three validations;
7. source replacement, two independent products, protected recursive data, and a product-lookalike attack.

The challenge exited 0. The deterministic summary is `REVIEWER_V110_FRESH_CHALLENGE_OUTPUT_V1_0.txt`.

The artificial getter is not a normative profile input: the contract admits repository-reviewed JSON bytes/plain JSON. It is used to test detachment and lifetime. Its changed post-compile value never became traversal authority.

## 6. Non-regression

`NON_REGRESSION_VERIFICATION_V1_0.txt` records:

- exact runtime tuple and TypeScript version;
- offline AI-foundation verifier PASS;
- independent `ai_model_config=21` and `ai_runs=96` extraction;
- selected M02 and M03 fixed hashes;
- 19 paths, four Markdown files, eight resolved local links, 96 balanced fences, zero missing links, and zero added symlinks;
- author runs 2/2 and independent challenge PASS;
- zero install/download/materialization/registry/network/Provider activity.

No executable application test/build was run because no executable Candidate path changed. This was proportionate to the exact design risks.

## 7. Disposition

| Root | Result | Decisive evidence |
|---|---|---|
| V18-M01 attempt 2 | CLOSED | exact runtime 69/69; honest five-code subset; 12 runtime mutations; positive 1/1 and negative 3/3 strict TS probes |
| V18-M02 | CLOSED / non-regression | exact CR-01..CR-14 authority and V1.9 byte equivalence; 4/4 fresh order mutations rejected |
| V18-M03 attempt 2 | CLOSED | source-detached frozen registered product; original demotions rejected; getter/source replacement/multiple-product/lookalike-product challenges rejected or safely detached |
| New root | none | no new local finding |

Conclusion: PASS. Exact V1.10 is ready only for coordinator Design Gate acceptance.
