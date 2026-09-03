# CWT Phase 1B Stage 6 — Runtime Workflow Control/Release Identity Separation Remediation Report V1.0

Status: **F-01 REMEDIATION CANDIDATE COMPLETE / HOLD FOR FRESH INDEPENDENT RE-REVIEW**

Recorded at: `2026-09-03T07:03:22Z`

Evidence manifest: [PHASE_1B_STAGE6_RUNTIME_WORKFLOW_CONTROL_RELEASE_IDENTITY_SEPARATION_REMEDIATION_EVIDENCE_MANIFEST_V1_0.md](./PHASE_1B_STAGE6_RUNTIME_WORKFLOW_CONTROL_RELEASE_IDENTITY_SEPARATION_REMEDIATION_EVIDENCE_MANIFEST_V1_0.md)

This is an append-only remediation record for F-01. It does not alter the V1.1–V1.3 Runtime operator history or the preceding Node-order correction evidence. Failed Review commit `7693614d1f400767d0acf0fee9d672b51fc92b7b` remains review-only and outside the implementation ancestry.

## 1. Causal correction

The corrected workflow must execute from a reviewed control-plane commit that is newer than frozen release source `7e6ef0ad9fd00975da93789421c0d24ec9226e82`. The old assertion `GITHUB_SHA == RELEASE_COMMIT` therefore made the only authorized identity split impossible.

Candidate `10d89c07899527d6e23e358571ae3343529d85e4` deletes that false coupling and introduces one explicit `workflow_commit` dispatch input alongside the existing `release_commit`. Before any GHCR access, the existing Runner-binding step now proves:

- both values are exact lowercase 40-character commit IDs;
- `GITHUB_SHA` equals the separately authorized workflow-control commit;
- checkout `HEAD` equals the separately authorized release commit;
- workflow-control and release commits are distinct.

The existing pinned `actions/setup-node` order remains unchanged and precedes this Node-dependent gate. The frozen release checker remains byte-identical to the checker at `7e6ef0ad...`; no control-plane-only CLI behavior is assumed after the release checkout.

## 2. Preserved authority and negative scope

| Boundary | Exact preserved result |
|---|---|
| Frozen release source / tree | `7e6ef0ad9fd00975da93789421c0d24ec9226e82` / `29ef35dfafd989bfdc08bd2e987f44a0e784af24` |
| Build Once run / artifact | `33709304781` / `9876610372` |
| Accepted OCI index | `sha256:89e04e7201694e6f202c71cceb368622cc2d584136a7eedfaee9044a45023e8a` |
| Registry/evidence | Private GHCR exact digest and detached evidence unchanged |
| Runtime boundary | First attempt; single-use ephemeral Tencent Singapore Runner; no DIND |
| Permissions | `actions: read`, `contents: read`, `packages: read`; no write/delete expansion |
| Product/Production | No Product code, dependency, Schema, Migration, Production, COS or DNS change |
| External action | None; no push, workflow dispatch, Runner, VM, promotion or deployment |

The remediation adds no authority service, registry, state machine, classifier, retry, host runtime or fallback. It uses only standard `workflow_dispatch` input identity, GitHub's event `GITHUB_SHA`, and exact checkout `HEAD` inside the existing gate.

## 3. Future invocation proof — not executed and not authorized here

After a separate Owner-authorized push/ref operation, an operator can select a branch or tag that resolves exactly to the reviewed workflow-control Candidate while independently supplying the frozen release source:

```text
gh workflow run cwt-runtime-validation.yml \
  --ref <authorized-ref-resolving-exactly-to-10d89c07899527d6e23e358571ae3343529d85e4> \
  -f workflow_commit=10d89c07899527d6e23e358571ae3343529d85e4 \
  -f release_commit=7e6ef0ad9fd00975da93789421c0d24ec9226e82 \
  -f index_digest=sha256:89e04e7201694e6f202c71cceb368622cc2d584136a7eedfaee9044a45023e8a \
  -f evidence_run_id=33709304781 \
  -f runner_nonce=<authorized-single-use-128-bit-lowercase-hex-nonce>
```

GitHub resolves `GITHUB_SHA` from the selected dispatch ref, while `actions/checkout` independently checks out `release_commit`. A moved or incorrect control ref fails the `GITHUB_SHA` binding; a release checkout mismatch fails the `HEAD` binding; reusing one identity for both fails the distinctness gate. No external command above was executed.

## 4. Verification

| Check | Result |
|---|---|
| Focused registry-integration tests | PASS — 10/10 |
| Distinct control SHA + frozen release SHA | PASS |
| Expected control SHA mismatch | PASS — rejected before GHCR |
| Release checkout mismatch/substitution | PASS — rejected |
| Old `GITHUB_SHA == RELEASE_COMMIT` coupling | PASS — absent |
| Prior Node-order causal mutation | PASS — rejected |
| Full `pnpm test:deployment` | PASS — 117/117 |
| Scoped ESLint | PASS — zero errors/warnings |
| Workflow YAML/static semantics | PASS — YAML parse plus executable Bash binding test |
| `git diff --check` | PASS |
| Frozen release checker compatibility | PASS — byte-identical across `7e6ef0ad...` and Candidate |

## 5. Candidate and next gate

| Fact | Exact value |
|---|---|
| F-01 Implementation Candidate | `10d89c07899527d6e23e358571ae3343529d85e4` |
| Parent | `06aea5177a649438c1b1b62961e8d5b1705d307a` |
| Candidate tree | `e2f9da99920c5d188cfa4bd67202d1055d1245aa` |

No implementation blocker remains within the bounded scope. The next gate is exactly **one Fresh Independent Implementation/Operations/Security Re-Review** of Candidate `10d89c07899527d6e23e358571ae3343529d85e4`. Future push/ref creation and workflow invocation remain separate Owner gates. This record grants no external execution authority.
