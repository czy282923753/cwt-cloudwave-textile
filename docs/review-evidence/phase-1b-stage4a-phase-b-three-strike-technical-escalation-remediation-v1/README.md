# CWT Stage 4A Phase B — Technical Escalation Remediation V1 Evidence

## Status

TECH-M01 is corrected as a Candidate, not accepted. Owner selections remain null and implementation remains unauthorized.

The only next gate is Fresh Independent Technical Escalation Re-review by the original Reviewer.

## Chronology and immutable evidence

- [Technical Escalation V1.0](../../PHASE_1B_STAGE4A_PHASE_B_THREE_STRIKE_TECHNICAL_ESCALATION_V1_0.md) — immutable failed Candidate history.
- [Owner Package V1.0](../../PHASE_1B_STAGE4A_PHASE_B_THREE_STRIKE_TECHNICAL_ESCALATION_OWNER_DECISION_PACKAGE_V1_0.md) — immutable.
- [Independent FAIL report](../../PHASE_1B_STAGE4A_PHASE_B_THREE_STRIKE_TECHNICAL_ESCALATION_INDEPENDENT_REVIEW_V1_0.md) — imported byte-identically, SHA-256 `6d56bb4f3f632e55e3e3668fcfe67901709ad663edf6edd5c5a8074b56c763cf`.
- [Independent FAIL evidence](../phase-1b-stage4a-phase-b-three-strike-technical-escalation-independent-review-v1/INDEPENDENT_TECHNICAL_ESCALATION_REVIEW_EVIDENCE_V1_0.md) — imported byte-identically.
- [Independent 8-item manifest](../phase-1b-stage4a-phase-b-three-strike-technical-escalation-independent-review-v1/SHA256SUMS.txt) — SHA-256 `ab2a9a279288174bd34ce98efef4ef8d3ed948ca7a67647a22146da7f4ab32d5`.

## V1.1 reports

- [Technical Escalation V1.1](../../PHASE_1B_STAGE4A_PHASE_B_THREE_STRIKE_TECHNICAL_ESCALATION_V1_1.md)
- [Owner Decision Package V1.1](../../PHASE_1B_STAGE4A_PHASE_B_THREE_STRIKE_TECHNICAL_ESCALATION_OWNER_DECISION_PACKAGE_V1_1.md)

## Fixed identities

- [FIXED_INPUTS_V1_1.json](FIXED_INPUTS_V1_1.json) — remediation parent, frozen identities, immutable V1.0 hashes, imported FAIL hashes, M03 byte identities and exact runtime.

## M02 corrected authority

- [M02_PROTECTED_DATA_AUTHORITY_PROFILE_V2_1.json](M02_PROTECTED_DATA_AUTHORITY_PROFILE_V2_1.json) — validation, runtime, per-rule gap authority, consequences and limits.
- [M02_GRAMMAR_REGISTRY_INCLUDE_DEEPSEEK_V2_1.json](M02_GRAMMAR_REGISTRY_INCLUDE_DEEPSEEK_V2_1.json) — recommended 32-rule option.
- [M02_GRAMMAR_REGISTRY_EXCLUDE_DEEPSEEK_V2_1.json](M02_GRAMMAR_REGISTRY_EXCLUDE_DEEPSEEK_V2_1.json) — 30-rule security-exception option.
- [M02_DEEPSEEK_OWNER_DECISION_PROFILE_V1_1.json](M02_DEEPSEEK_OWNER_DECISION_PROFILE_V1_1.json) — exact unselected options and consequences.
- [M02_FALSE_POSITIVE_AND_SECURITY_CORPUS_V1_1.json](M02_FALSE_POSITIVE_AND_SECURITY_CORPUS_V1_1.json) — property witnesses, 40 dual-option cases, transition limits and six mutation negatives.
- [M02_MUTATION_NEGATIVE_OUTPUT_V1_1.txt](M02_MUTATION_NEGATIVE_OUTPUT_V1_1.txt) — normalized mutation capture.

The two registries are mutually exclusive decision artifacts. No second classifier or gap table exists.

## M03 non-regression

- Historical M03 profile remains [M03_CAPABILITY_GRAPH_AND_DATABASE_SEAM_PROFILE_V2_0.json](../phase-1b-stage4a-phase-b-three-strike-technical-escalation-v1/M03_CAPABILITY_GRAPH_AND_DATABASE_SEAM_PROFILE_V2_0.json), SHA-256 `ce5bdd54c7924e86fcf36e89f10c96a039814366862382c2df81e0a15cf13141`.
- [M03_NON_REGRESSION_OUTPUT_V1_1.txt](M03_NON_REGRESSION_OUTPUT_V1_1.txt) captures the unchanged graph/type results.

## Offline verifier

- [VERIFY_TECHNICAL_ESCALATION_REMEDIATION_V1_1.mjs](VERIFY_TECHNICAL_ESCALATION_REMEDIATION_V1_1.mjs) executes the actual closed grammar/gap AST through direct and NFA transition modes.
- [VERIFY_TECHNICAL_ESCALATION_REMEDIATION_OUTPUT_V1_1.txt](VERIFY_TECHNICAL_ESCALATION_REMEDIATION_OUTPUT_V1_1.txt) is the full captured result.
- [SHA256SUMS.txt](SHA256SUMS.txt) hashes the V1.1 reports, remediation evidence and imported independent FAIL package, excluding itself.

Run from repository root with the fixed Node 24.14.0 runtime:

```sh
node docs/review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-remediation-v1/VERIFY_TECHNICAL_ESCALATION_REMEDIATION_V1_1.mjs
```

No install, Provider/API/credential/network/spend, database mutation or external action is used.

## Interpretation limit

A verifier PASS proves internal consistency, byte identity, transition-language execution and offline reproducibility. It does not constitute independent acceptance, Owner approval, corrected Design or Product implementation proof.
