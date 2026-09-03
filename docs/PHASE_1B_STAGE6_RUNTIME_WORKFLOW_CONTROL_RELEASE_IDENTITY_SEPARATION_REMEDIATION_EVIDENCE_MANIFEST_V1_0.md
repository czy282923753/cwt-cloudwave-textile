# CWT Phase 1B Stage 6 — Runtime Workflow Control/Release Identity Separation Remediation Evidence Manifest V1.0

Status: **F-01 REMEDIATION EVIDENCE COMPLETE / HOLD FOR FRESH INDEPENDENT RE-REVIEW**

Principal report: [PHASE_1B_STAGE6_RUNTIME_WORKFLOW_CONTROL_RELEASE_IDENTITY_SEPARATION_REMEDIATION_IMPLEMENTATION_REPORT_V1_0.md](./PHASE_1B_STAGE6_RUNTIME_WORKFLOW_CONTROL_RELEASE_IDENTITY_SEPARATION_REMEDIATION_IMPLEMENTATION_REPORT_V1_0.md)

## 1. Candidate identity and lineage

| Evidence | Exact value |
|---|---|
| F-01 Implementation Candidate | `10d89c07899527d6e23e358571ae3343529d85e4` |
| Parent | `06aea5177a649438c1b1b62961e8d5b1705d307a` |
| Candidate tree | `e2f9da99920c5d188cfa4bd67202d1055d1245aa` |
| Failed Review commit | `7693614d1f400767d0acf0fee9d672b51fc92b7b`; not an ancestor |
| Frozen release source / tree | `7e6ef0ad9fd00975da93789421c0d24ec9226e82` / `29ef35dfafd989bfdc08bd2e987f44a0e784af24` |
| Accepted OCI index | `sha256:89e04e7201694e6f202c71cceb368622cc2d584136a7eedfaee9044a45023e8a` |

## 2. Candidate file evidence

| File | SHA-256 | Purpose |
|---|---|---|
| `.github/workflows/cwt-runtime-validation.yml` | `0f52ded0fa0a7957645e6bc98ee997ef642cb39d72d1f35dae9c5cc608eb9584` | Separately names and binds exact workflow-control and release commits before GHCR |
| `deploy/scripts/release-registry-integration.test.mjs` | `bfead1111c1229a561b0108c4dafb48316dc332a220b91df6c4b0dbd144ceaa5` | Executes the workflow identity gate under positive and fail-closed mutations and retains Node-order mutation coverage |

The Candidate modifies exactly these two existing paths. `deploy/scripts/release-registry-integration.mjs` is unchanged and byte-identical to frozen release source `7e6ef0ad...`.

## 3. Verification evidence

| Check | Exact result |
|---|---|
| `node --test deploy/scripts/release-registry-integration.test.mjs` | Exit `0`; 10 tests; 10 pass; 0 fail |
| Distinct expected/actual control SHA and frozen expected/actual release SHA | Exit `0` |
| Expected workflow-control SHA mismatch | Nonzero; rejected before GHCR |
| Expected release vs checkout SHA mismatch | Nonzero; rejected before GHCR |
| Workflow-control identity reused as release identity | Nonzero; rejected before GHCR |
| Old equality coupling static check | Absent |
| Prior Node-order mutation | Rejected |
| `pnpm test:deployment` | Exit `0`; 117 tests; 117 pass; 0 fail |
| Scoped ESLint | Exit `0` |
| Runtime workflow YAML parse | Exit `0`; `actionlint` unavailable locally |
| Executable Bash binding semantics | PASS through the focused test against the actual workflow block |
| `git diff --check` | Exit `0` |
| Failed Review ancestry check | Exit `1` from `git merge-base --is-ancestor`; sibling-only preserved |

## 4. Historical and negative-scope evidence

- V1.1–V1.3 operator report/manifest sidecars verify and those files are unchanged.
- Prior Node-order correction report/manifest and sidecars are unchanged.
- No Product, dependency, package/lock, Schema, Migration, Compose, runtime validator or other workflow changed.
- No credential, permission scope, host runtime, retry, fallback, state or classifier was added.
- No push, Build Once, cloud resource, Runner, Runtime Validation, promotion or deployment occurred.

## 5. Gate assertion

This evidence supports only the bounded F-01 control-plane/release-source separation Candidate. It does not prove successful Linux Runtime execution or Production readiness. The next gate is exactly **one Fresh Independent Implementation/Operations/Security Re-Review** of `10d89c07899527d6e23e358571ae3343529d85e4`; future push/ref creation and invocation remain separately Owner-gated.
