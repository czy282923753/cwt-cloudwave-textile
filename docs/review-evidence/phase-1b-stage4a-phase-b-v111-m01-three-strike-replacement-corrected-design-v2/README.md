# V111-M01 Three-Strike Replacement Corrected Design V2 Evidence

Status: `CORRECTED DESIGN CANDIDATE / NOT SELF-APPROVED / IMPLEMENTATION NOT AUTHORIZED`

This package contains one canonical Candidate review authority, one composite
current technical profile, one dependency-free verifier, the accepted
`10/42/10` proof matrix, deterministic package/mutation/historical/absence
captures and one derived `SHA256SUMS.txt`.

The human Design is rendered documentation only. Machine roles come only from
`V111_M01_CANONICAL_REVIEW_AUTHORITY_V2_0.json`.

`CANDIDATE_REVIEW_ENVELOPE_V2_0.json` is intentionally absent. A reviewer or
coordinator creates it only after the final Candidate commit, keeps it outside
the Candidate and supplies it to full-review mode.

Pinned offline commands:

```text
/Users/calvin/.nvm/versions/node/v24.14.0/bin/node docs/review-evidence/phase-1b-stage4a-phase-b-v111-m01-three-strike-replacement-corrected-design-v2/VERIFY_V111_M01_REPLACEMENT_CORRECTED_DESIGN_V2_0.mjs --authority docs/review-evidence/phase-1b-stage4a-phase-b-v111-m01-three-strike-replacement-corrected-design-v2/V111_M01_CANONICAL_REVIEW_AUTHORITY_V2_0.json --package-only
/Users/calvin/.nvm/versions/node/v24.14.0/bin/node docs/review-evidence/phase-1b-stage4a-phase-b-v111-m01-three-strike-replacement-corrected-design-v2/VERIFY_V111_M01_REPLACEMENT_CORRECTED_DESIGN_V2_0.mjs --authority docs/review-evidence/phase-1b-stage4a-phase-b-v111-m01-three-strike-replacement-corrected-design-v2/V111_M01_CANONICAL_REVIEW_AUTHORITY_V2_0.json --review-envelope /external/path/CANDIDATE_REVIEW_ENVELOPE_V2_0.json
shasum -a 256 -c docs/review-evidence/phase-1b-stage4a-phase-b-v111-m01-three-strike-replacement-corrected-design-v2/SHA256SUMS.txt
```

Package-only success always has `acceptanceEligible=false`. Full-review
technical success is input to, not a substitute for, Fresh independent human
Design review.
