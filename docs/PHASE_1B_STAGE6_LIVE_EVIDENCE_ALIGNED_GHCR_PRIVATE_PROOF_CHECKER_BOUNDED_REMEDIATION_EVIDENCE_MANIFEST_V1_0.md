# CWT Phase 1B Stage 6 — Live-Evidence-Aligned GHCR Private-Proof Checker Bounded Remediation Evidence Manifest V1.0

Status: **COMPLETE IMPLEMENTATION EVIDENCE — acceptance pending Fresh Independent Review**

Principal report: [PHASE_1B_STAGE6_LIVE_EVIDENCE_ALIGNED_GHCR_PRIVATE_PROOF_CHECKER_BOUNDED_REMEDIATION_IMPLEMENTATION_REPORT_V1_0.md](./PHASE_1B_STAGE6_LIVE_EVIDENCE_ALIGNED_GHCR_PRIVATE_PROOF_CHECKER_BOUNDED_REMEDIATION_IMPLEMENTATION_REPORT_V1_0.md)

## 1. Git identity and ancestry

| Fact | Exact value |
|---|---|
| Starting Operator closure | `5012e003fc80594e3b4edd474c885075815e9522` |
| Starting tree | `35d4cd8d049b37574a7c318f86233a8ad35ea1f9` |
| Implementation commit | `a77e8d1a9cd5dc1c494fc4a44987e8cf983f8094` |
| Implementation tree | `29d18dbe470671f771c14330523d99bf97983db8` |
| Prior review-only commit in Candidate ancestry | No |
| Remote push | None |

## 2. Accepted prior live evidence

No new Provider observation was made in this task. The offline fixture comes from the append-only `5012e003` Operator evidence:

| Fact | Recorded value |
|---|---|
| ORAS version / commit / tree | `1.3.3` / `210747c29c1d38732b3194878dfd8b5a6b9ad7eb` / `clean` |
| Invocation identity | credential-free, exact GHCR digest, empty mode-`0600` `{"auths":{}}` config |
| Exit / signal / spawn error | `1` / `null` / `false` |
| stdout | empty |
| stderr | `Error response from registry: unauthorized: authentication required` |
| stderr bytes | `68` |
| stderr SHA-256 | `5d6686e20f5726d3ec038e6f4e3bfd917c1de44a231f88346a34e1a2838a2cc0` |
| Prior predicate result | `false` |

Source evidence:

- `docs/PHASE_1B_STAGE6_PRIVATE_GHCR_NEW_BUILD_TENCENT_RUNTIME_OPERATOR_REPORT_V1_0.md`
- `docs/PHASE_1B_STAGE6_PRIVATE_GHCR_NEW_BUILD_TENCENT_RUNTIME_OPERATOR_EVIDENCE_MANIFEST_V1_0.md`

## 3. Modified artifacts

| Artifact | SHA-256 |
|---|---|
| `deploy/scripts/release-registry-integration.mjs` | `5f94aeefdf36971cfc885b9347fbcc79c433bc27daa9762331483fd156ef9c61` |
| `deploy/scripts/release-registry-integration.test.mjs` | `b3c50dc586e12b7d5d6ead534237e9affab0189af04148923035057ed1551521` |

No other implementation file changed in commit `a77e8d1a`.

## 4. Decisive verification

| Command/check | Result |
|---|---|
| Focused Node checker tests | PASS — 8/8 |
| Scoped ESLint for both changed files | PASS |
| Repository lint | PASS |
| TypeScript typecheck | PASS |
| `git diff --check` | PASS |
| Code/test changed-file count before docs | `2` |

The adversarial matrix covers public success; bare Registry 401; former token 403 assumption; generic/ambiguous authorization text; not found; DNS/TLS/timeout; malformed, multiline and oversized output; process drift; and host/repository/digest disagreement.

## 5. Architecture and external-state assertion

The old 403-specific assumption was removed. One small semantic parser/predicate remains the only verdict inside the existing boundary. No workflow, infrastructure, Product, package, dependency, schema, Migration, Compose, runtime validator or external state changed. The GHCR package was not observed or mutated in this task; the old digest remains permanently unpromotable.

## 6. Closure assertion

This manifest supports only a local implementation Candidate. It does not prove current Provider behavior, resume the stopped external chain, or authorize Build Once, Runtime Validation, promotion or deployment. Fresh Independent Review is the sole next gate.
