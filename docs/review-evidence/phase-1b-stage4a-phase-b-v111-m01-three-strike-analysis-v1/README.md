# V111-M01 Three-Strike Analysis Evidence V1

Status: `ANALYSIS COMPLETE / REPLACEMENT RECOMMENDED / NOT CORRECTED DESIGN / NOT IMPLEMENTATION ELIGIBLE`

This package supports the independent Max root-cause analysis of the V1.12,
V1.13 and V1.14 `V111-M01` correction loop. It contains no Product/source,
configuration, Schema, Migration, ADR, package or lock change.

## Inventory

- `FIXED_INPUTS_V1_0.json` — checkpoint, failed-attempt, controlling-review,
  V1.14 Candidate, dependency and process-action ledger.
- `V111_M01_REPLACEMENT_DECISION_PROFILE_V1_0.json` — selected replacement,
  exact future authority/envelope schemas, removals, guarantees and decisions.
- `V111_M01_REPLACEMENT_PROOF_MATRIX_V1_0.json` — 10 positive, 42 negative
  and 10 property obligations plus legacy-removal rules.
- `RUN_V111_M01_MINIMAL_REPRO_V1_0.mjs` — dependency-free deterministic runner
  for the required CommonMark, ref/envelope/Git and §20.0.5 witnesses.
- `V111_M01_MINIMAL_REPRO_CAPTURE_V1_0.txt` — exact stable runner output.
- `ANALYSIS_IDENTITY_AND_SCOPE_CAPTURE_V1_0.txt` — exact final Git/scope/input
  capture generated before sealing.
- `VERIFY_V111_M01_THREE_STRIKE_ANALYSIS_PACKAGE_V1_0.mjs` — offline package
  verifier.
- `ANALYSIS_PACKAGE_VERIFICATION_OUTPUT_V1_0.txt` — exact deterministic verifier
  output.
- `SHA256SUMS.txt` — one derived package manifest; it is not semantic authority.

The two main documents are at repository `docs/`:

- `PHASE_1B_STAGE4A_PHASE_B_V111_M01_THREE_STRIKE_ROOT_CAUSE_ANALYSIS_V1_0.md`;
- `PHASE_1B_STAGE4A_PHASE_B_V111_M01_EXACT_REPLACEMENT_PLAN_V1_0.md`.

The L3 checkpoint record is:

- `PHASE_1B_STAGE4A_PHASE_B_V111_M01_THREE_STRIKE_ANALYSIS_PRE_L3_CHECKPOINT_V1_0.md`.

## Offline commands

```text
node docs/review-evidence/phase-1b-stage4a-phase-b-v111-m01-three-strike-analysis-v1/RUN_V111_M01_MINIMAL_REPRO_V1_0.mjs --repo .
node docs/review-evidence/phase-1b-stage4a-phase-b-v111-m01-three-strike-analysis-v1/VERIFY_V111_M01_THREE_STRIKE_ANALYSIS_PACKAGE_V1_0.mjs
shasum -a 256 -c docs/review-evidence/phase-1b-stage4a-phase-b-v111-m01-three-strike-analysis-v1/SHA256SUMS.txt
```

The reproducer creates and removes local disposable shared clones. It performs
no package-manager, install, materialization, registry, network, Provider or
credential action.

## Disposition

The package recommends one canonical structured Candidate root, non-authority
Markdown, and a reviewer-owned external Git envelope that the verifier actually
consumes. No new dependency, ADR or Owner architecture decision is required for
that recommendation. Coordinator acceptance and a Fresh independently reviewed
Corrected Design remain required before a different xhigh implementation task.
