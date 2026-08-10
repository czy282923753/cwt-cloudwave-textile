# Corrected Exact Design V1.5 evidence

This directory contains design-only, offline evidence for the Owner-selected `M02-D1-INCLUDE` and `M03-D1-DISCRIMINATED-SEAM` contracts.

It is not Product code, an implementation attempt, a Provider adapter, a corrected implementation, or an independent review.

Authority order inside this evidence set:

1. `FIXED_INPUTS_V1_0.json` pins immutable inputs and Owner selections.
2. `CORRECTED_DESIGN_CONTRACT_PROFILE_V1_0.json` maps the standalone V1.5 contract.
3. The selected immutable M02 registry and M03 graph profile at their existing repository paths remain the sole semantic authorities; they are not copied or modified here.
4. The TypeScript files are positive/expected-negative design probes, not product source.
5. `VERIFY_CORRECTED_DESIGN_V1_0.mjs` reproduces fixed hashes, manifests, mapping counts, selected M02 proof, M03 type outcomes, document structure and scope.
6. Captured outputs and `SHA256SUMS.txt` freeze the reproducible Candidate evidence.

The imported independent Reviewer artifacts remain byte-identical. Their Markdown hard-break whitespace is immutable and excluded from any claim that all historical files pass a global whitespace check. V1.5-owned artifacts must pass their own strict whitespace check.
