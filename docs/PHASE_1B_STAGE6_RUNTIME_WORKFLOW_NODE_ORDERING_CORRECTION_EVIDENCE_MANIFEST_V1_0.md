# CWT Phase 1B Stage 6 — Runtime Workflow Node Ordering Correction Evidence Manifest V1.0

Status: **IMPLEMENTATION EVIDENCE COMPLETE / HOLD FOR FRESH INDEPENDENT REVIEW**

Principal report: [PHASE_1B_STAGE6_RUNTIME_WORKFLOW_NODE_ORDERING_CORRECTION_IMPLEMENTATION_REPORT_V1_0.md](./PHASE_1B_STAGE6_RUNTIME_WORKFLOW_NODE_ORDERING_CORRECTION_IMPLEMENTATION_REPORT_V1_0.md)

## 1. Candidate identity

| Evidence | Exact value |
|---|---|
| Implementation Candidate | `5bfbea04597a405061f7760f8b5db8517b69dcfa` |
| Parent | `e83a9a6ae5697e9df93f3ee7adf9474bd882afa3` |
| Candidate tree | `314aa7018dd36ca33c3bf1f94b31247c846ef57f` |
| Frozen release source | `7e6ef0ad9fd00975da93789421c0d24ec9226e82` |
| Frozen release tree | `29ef35dfafd989bfdc08bd2e987f44a0e784af24` |
| Accepted OCI index | `sha256:89e04e7201694e6f202c71cceb368622cc2d584136a7eedfaee9044a45023e8a` |

## 2. Candidate file evidence

| File | SHA-256 | Purpose |
|---|---|---|
| `.github/workflows/cwt-runtime-validation.yml` | `4176536db9e7c18548bd0ef1548c8341c06d7a6c1d457129093582ad57770ed5` | Reuses and moves the exact pinned Node setup before Runner binding |
| `deploy/scripts/release-registry-integration.test.mjs` | `5a445e07f914f8fe36d93f45e2474e0582ea6ba218e2cbd587e88d30bf7b13fe` | Static ordering invariant and causal mutation rejection |

## 3. Verification evidence

| Command/check | Exact result |
|---|---|
| `node --test deploy/scripts/release-registry-integration.test.mjs` | Exit `0`; 9 tests; 9 pass; 0 fail |
| Failed-order causal mutation inside focused test | Rejected with `Exact Node setup must precede every Node-dependent pre-GHCR command` |
| `pnpm test:deployment` | Exit `0`; 116 tests; 116 pass; 0 fail |
| `pnpm exec eslint deploy/scripts/release-registry-integration.test.mjs --max-warnings=0` | Exit `0` |
| Workflow YAML parse | Exit `0`; syntax valid; `actionlint` unavailable |
| `git diff --check` | Exit `0` |

## 4. Negative-scope evidence

- No Product code, dependency manifest, schema or Migration changed.
- No credentials, permission expansion, host Node requirement, fallback, retry, state or classifier was added.
- No V1.1–V1.3 evidence record was edited.
- No external push, workflow run, cloud resource, Runner, promotion or deployment action occurred.

## 5. Gate assertion

This manifest supports only the bounded workflow-control Candidate. It does not prove a successful Linux Runtime execution or Production readiness. The next gate is exactly **one Fresh Independent Implementation/Operations/Security Review** of Candidate `5bfbea04597a405061f7760f8b5db8517b69dcfa`.
