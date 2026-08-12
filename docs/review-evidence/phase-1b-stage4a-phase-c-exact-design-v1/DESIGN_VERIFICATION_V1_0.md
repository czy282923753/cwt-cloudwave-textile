# CWT Stage 4A Phase C Exact Design — Candidate Verification Evidence V1.0

Status: **DEVELOPER DESIGN-VERIFICATION EVIDENCE / NOT AN INDEPENDENT REVIEW / NOT ACCEPTANCE**

- Prepared: `2026-08-12` (`Asia/Shanghai`)
- Candidate document: [`PHASE_1B_STAGE4A_PHASE_C_DURABLE_RUN_WORKER_EXACT_DESIGN_V1_0.md`](../../PHASE_1B_STAGE4A_PHASE_C_DURABLE_RUN_WORKER_EXACT_DESIGN_V1_0.md)
- Exact base: `cc5715f4a9eb07293bf932cfbd822bfa6bf14a45`
- Accepted checkpoint: `refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-implementation-accepted-v1`
- Task-local branch: `codex/phase-1b-stage4a-phase-c-exact-design-v1`

## 1. Baseline and scope proof

Before the Candidate was written:

```text
git rev-parse HEAD
cc5715f4a9eb07293bf932cfbd822bfa6bf14a45

git rev-parse refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-implementation-accepted-v1
cc5715f4a9eb07293bf932cfbd822bfa6bf14a45

git branch --show-current
codex/phase-1b-stage4a-phase-c-exact-design-v1
```

The generated worktree had initially been detached at an unrelated clean commit. A new task-local branch was created directly from the accepted checkpoint; no existing branch, checkpoint or tag was moved or rewritten.

The Candidate mutation scope is exactly:

```text
docs/PHASE_1B_STAGE4A_PHASE_C_DURABLE_RUN_WORKER_EXACT_DESIGN_V1_0.md
docs/review-evidence/phase-1b-stage4a-phase-c-exact-design-v1/DESIGN_VERIFICATION_V1_0.md
```

No Product code, test, package, lockfile, configuration, Schema, Migration, accepted document or existing evidence was modified.

## 2. Schema-to-ledger structural proof

A read-only Node check extracted column names directly from the two `CREATE TABLE` blocks in `drizzle/0020_phase1b_ai_foundation.sql`. It independently extracted the first-column field names from Candidate Sections 13.2–13.6, then compared counts, missing names, extra names and duplicates.

```text
ai_model_config: schema=21, ledger=21, missing=0, extra=0, duplicate=0
ai_runs: schema=96, ledger=96, missing=0, extra=0, duplicate=0
```

The same check extracted every non-anchor/non-URL Markdown link from the Candidate, resolved it from the Candidate's directory and checked filesystem existence:

```text
relative_links: checked=10, missing=0
```

The five-status block was also inspected against Migration 0020 and contains only `pending`, `processing`, `draft_ready`, `failed`, and `cancelled`; retry remains an orthogonal four-value state and no `dead` state is designed.

## 3. Accepted-foundation gates

The Phase B architecture gate requires an explicit pinned installed dependency directory. The first invocation without that variable failed closed before source evaluation with:

```text
AI architecture gate failed closed: CWT_INSTALLED_NODE_MODULES must name the pinned installed dependency directory
```

This was an invocation precondition, not a Candidate/source finding. It was rerun with the current worktree's absolute installed `node_modules` path:

```text
env CWT_INSTALLED_NODE_MODULES='<absolute-current-worktree>/node_modules' pnpm check:ai-architecture
```

Result:

```text
exit_code=0
ok=true
profileId=cwt.phase1b.stage4a.phaseb.m04-static-capability-boundary.v3_1_candidate
head=cc5715f4a9eb07293bf932cfbd822bfa6bf14a45
lifecycleState=source-clean-file-absent
bundleProofReady=false
mutationProbes=28/28 fail-closed as expected
```

`bundleProofReady=false` is the accepted source-clean Phase B lifecycle state, not a failure. This design task does not generate or mutate accepted proof artifacts.

Prompt-boundary verification:

```text
pnpm check:ai-prompts
AI Prompt bundle verification passed.
exit_code=0
```

The command includes the Synthetic test bundle while the Production Prompt manifest remains empty.

## 4. Documentation integrity and terminal checks

```text
git diff --check
PASS (no output)
```

There is no repository Markdown/docs linter script. Relative-link resolution, exact field-ledger comparison, accepted AI architecture and Prompt gates are the proportionate non-mutating checks for this docs-only Candidate. Final changed-path inventory, Candidate commit identity and clean Git status are recorded in the task callback after commit so this evidence file does not create a self-referential commit hash.

## 5. Result and boundary

The design-verification checks found no Schema/Migration/ADR/dependency gap requiring an Owner decision. They do not self-approve the Candidate. The only next gate is a Fresh independent Phase C Exact Design Review from the exact committed Candidate.
