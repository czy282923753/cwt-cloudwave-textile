# CWT Phase 1B Stage 6 — Runtime Workflow Node Ordering Correction Implementation Report V1.0

Status: **IMPLEMENTATION CANDIDATE COMPLETE / HOLD FOR FRESH INDEPENDENT REVIEW**

Recorded at: `2026-09-03T06:42:30Z`

Evidence manifest: [PHASE_1B_STAGE6_RUNTIME_WORKFLOW_NODE_ORDERING_CORRECTION_EVIDENCE_MANIFEST_V1_0.md](./PHASE_1B_STAGE6_RUNTIME_WORKFLOW_NODE_ORDERING_CORRECTION_EVIDENCE_MANIFEST_V1_0.md)

This is an append-only correction record. It does not modify or supersede the V1.1–V1.3 Runtime operator records.

## 1. Root cause and bounded correction

Runtime run `33723012086` failed before private GHCR access because the Runner-binding step invoked `node` before the workflow established the pinned Node runtime. The accepted disposable host profile intentionally did not require host Node.js.

Candidate `5bfbea04597a405061f7760f8b5db8517b69dcfa` moves the existing pinned `actions/setup-node` step immediately after exact-source checkout and before the first Node-dependent Runner-binding command. It adds no host fallback, new setup authority, script, harness, retry, persistent state or classifier.

## 2. Preserved authority and scope

| Boundary | Preserved result |
|---|---|
| Frozen release source / tree | `7e6ef0ad9fd00975da93789421c0d24ec9226e82` / `29ef35dfafd989bfdc08bd2e987f44a0e784af24` |
| Accepted OCI index | `sha256:89e04e7201694e6f202c71cceb368622cc2d584136a7eedfaee9044a45023e8a` |
| Build Once / rebuild | Existing accepted Build Once only / no rebuild |
| Registry and evidence | Private GHCR exact digest / detached evidence unchanged |
| Runtime host model | Single-use ephemeral Tencent Singapore Runner; no DIND |
| Permissions | Existing least-privilege workflow permissions; `packages: read`, no package write |
| Production | No Product runtime, schema, Migration, dependency, Production, COS or DNS change |
| External action | None; no push, workflow dispatch, Runner registration, VM creation or deployment |

The workflow-control Candidate is deliberately distinct from the immutable release source. A future authorized workflow dispatch must continue to check out and validate the exact release source and exact OCI digest inputs; this Candidate does not become or rebuild the release subject.

## 3. Test change and simplification check

The existing deployment test surface now asserts that:

- the pinned exact Node setup step exists exactly once;
- it occurs before private GHCR access;
- it precedes every pre-GHCR command that invokes `node`;
- a causal mutation that restores the failed ordering is rejected.

The correction reorders one existing step and adds only a test-local assertion helper. Runtime mechanism count is unchanged. No dual authority or long-lived coordination state was introduced.

## 4. Verification

| Check | Result |
|---|---|
| Focused `release-registry-integration.test.mjs` | PASS — 9/9 |
| Causal failed-order mutation | PASS — rejected by the focused test |
| Full `pnpm test:deployment` | PASS — 116/116 |
| Scoped ESLint | PASS — 0 errors, 0 warnings |
| Workflow YAML syntax | PASS — Ruby YAML parser; `actionlint` unavailable locally |
| `git diff --check` | PASS |

## 5. Candidate and next gate

| Fact | Exact value |
|---|---|
| Implementation Candidate | `5bfbea04597a405061f7760f8b5db8517b69dcfa` |
| Parent | `e83a9a6ae5697e9df93f3ee7adf9474bd882afa3` |
| Candidate tree | `314aa7018dd36ca33c3bf1f94b31247c846ef57f` |

There are no known implementation blockers within the authorized scope. The next gate is exactly **one Fresh Independent Implementation/Operations/Security Review** of Candidate `5bfbea04597a405061f7760f8b5db8517b69dcfa`. This report grants no push, retry, new Runner, new VM, promotion or deployment authority.
