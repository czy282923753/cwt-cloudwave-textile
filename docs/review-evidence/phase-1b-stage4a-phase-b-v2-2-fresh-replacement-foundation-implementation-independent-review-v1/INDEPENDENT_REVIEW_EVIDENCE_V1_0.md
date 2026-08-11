# Independent Review Evidence V1.0

## Review subject

- Exact ref: `refs/heads/codex/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-implementation-v1`
- Exact final HEAD: `b95390c34fc4fe687f6e7577a7505a7394bca80b`
- Exact final parent/tree: `a4b0e2ae92170b615a939ca3f317d9285bd01521` / `dd9992b1273e6247b476593e91682b90dad6d2a8`
- Exact code HEAD/tree: `4ce25e422b79bda62d0489d906e3e871a6279af9` / `9178ba098375df22fc2e7e6395170406c1e6c35e`
- Detached snapshot: `/tmp/cwt-v22-impl-review.b4Y7b5`
- Candidate mutation: none retained; final snapshots clean

## Owner-ordered review sequence

`REMEDIATION_FINDINGS_REVIEW` was completed first. DB convergence, M02, NM01, M01, M03, M05, L01 and L02 passed. M04 and NH01 failed independently. Only then was `FULL_REVIEW_NECESSITY` set to `NOT_REQUIRED`, because the two High defects already determine FAIL and mandatory gate/non-regression work was complete.

## Decisive evidence

### M04

The reviewer applied `REVIEWER_M04_GLOBALTHIS_FETCH_FAULT_V1_0.patch` only to the disposable snapshot. The real architecture entry point returned success. The complete raw baseline/fault outputs were retained temporarily and hashed:

- baseline raw capture SHA-256: `7febd5390356f1f2a9b181aeb4c899f242dab7702bb88bf5638b9c0ad1488d88`
- fault raw capture SHA-256: `85017133af68755f55d5d0c1877e203ae3f0c6dfe5d7606063a3972d0b8cacc6`

The concise captured outcome is in `REVIEWER_M04_GLOBALTHIS_FETCH_GATE_RESULT_V1_0.txt`. The patched source was restored and exact-snapshot clean state was rechecked.

### NH01 and M02

`REVIEWER_FRESH_REPLACEMENT_IMPLEMENTATION_TEST_V1_0.ts` records the decisive reviewer test logic. The M02 family challenge passed; the NH01 secure-equivalence assertion failed with:

- existing malformed authoritative Revision: `target_scope_mismatch`
- missing Revision: `authorization_denied`

The full test output is recorded in `REVIEWER_FRESH_REPLACEMENT_IMPLEMENTATION_TEST_OUTPUT_V1_0.txt`. The temporary test file was removed and exact-snapshot clean state was rechecked.

## Verification scope

The exact commands were run with installed Node 24.14.0 and installed TypeScript 5.9.3. No package manager, install, materialization, download, registry or network operation was used. The disposable snapshot used a physical `node_modules` directory populated with symlinks to already installed individual dependencies because the M04 tree walker intentionally rejects a root-level `node_modules` symlink. This changed only the disposable ignored dependency area and did not change Candidate bytes.

Detailed identities and results are recorded in `IDENTITY_SCOPE_AND_VERIFICATION_CAPTURE_V1_0.txt`.
