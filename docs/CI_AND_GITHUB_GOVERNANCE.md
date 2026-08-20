# CI and GitHub governance

## Authority and scope

This document governs the GitHub Free and Private Repository foundation used before Phase E. It does not change the frozen Product architecture, Phase D acceptance, or deployment design.

The immutable Product authority is:

- annotated tag `refs/tags/phase-1b-stage4a-phase-d-approved-2026-08-17`;
- tag object `f9967d6b73d7c2add66c2f33a4ce969d8d68c4de`;
- peeled Phase D commit `F=de51dff2b519f1ecacfb73e067c9d68361939c29`.

The accepted pre-Phase-E coordination commit is `P=f2f9037778070268f55d13cb7df6c309d9ec8579`, a descendant of `F`. The infrastructure candidate `C` descends from `P`. The approved integration commit `I` must be a two-parent merge commit with `I^1=F` and `I^2=C`; final remote `main=I`, while the annotated tag remains unchanged.

Only `F`, the original annotated tag, `C`, and the resulting PR/merge lineage are imported. Local `main`, dirty or untracked Owner work, scratch/checkpoint branches, archival refs, and unrelated tags remain local and untouched.

## Single CI workflow

`.github/workflows/ci.yml` is the only CI workflow authority. Pull requests and pushes to `main` run the accepted Phase D checks. A weekly schedule runs the full dependency audit only.

| Job | Required evidence for an applicable PR | Contract |
| --- | --- | --- |
| `Quality + PostgreSQL` | PASS | Exact Node/pnpm, AI prompt/synthetic checkers, lint, typecheck, fresh PostgreSQL 18.4 Migration through `0020`, full Vitest with all seven existing PostgreSQL suites enabled; image-processing suites execute the pinned Sharp native binding |
| `AI architecture proof` | PASS | Candidate Product-tree equivalence followed by the unchanged proof-bound checker at `d7655385e37330927c53e60fbb108b56950c9794` on the accepted macOS ARM64 filesystem semantics |
| `Build + public bundle` | PASS | Clean migrated PGlite database, real Next Build without seed data, native SWC/Lightning CSS execution, public-bundle boundary check |
| `Browser` | PASS | Clean Playwright database/storage lifecycle, real Next server startup, and Chromium acceptance with retries disabled |
| `Dependency security` | PASS or explicitly not applicable | Exact install and High/Critical hard gate only when `package.json` or `pnpm-lock.yaml` changes; scheduled full-severity visibility is separate |

The Product workload jobs use the standard `ubuntu-24.04-arm` GitHub-hosted runner because the accepted runtime guard requires ARM64. The proof-bound architecture job alone uses the standard `macos-15` ARM64 runner for the checker platform contract described below. Both are available to a GitHub Free Private Repository from its included Actions allowance; no larger runner or paid GitHub feature is required. If the included allowance is exhausted and no runner starts, the result is INDETERMINATE rather than PASS. Official setup actions use their current Node 24 runtimes and every action plus the PostgreSQL 18.4 service image is pinned by immutable SHA/digest. Caching is limited to the pnpm store. Workflow permissions are read-only.

### Proof-bound checker platform identity

The frozen Phase D architecture checker includes a case-variant negative probe whose expected failure identity depends on the case-insensitive, same-inode filesystem semantics of its accepted macOS ARM64 execution environment. On Linux, the unchanged probe fails earlier as `unresolved_static_edge` because the case-variant path does not exist; that is a checker-platform mismatch, not a Product architecture regression.

The workflow therefore runs that checker unchanged in one standard `macos-15` ARM64 job, after proving that the candidate has no change outside `docs/**` and `.github/**` relative to the proof-bound Product tree. It does not patch the checker, manufacture aliases, mount a custom filesystem, or add a second proof authority. PostgreSQL, Build, bundle, and Browser verification remain on Linux ARM64.

### Linux ARM64 native-binding evidence

The accepted `pnpm env:diagnose` helper constructs the generic package name `@next/swc-${platform}-${arch}`. Next.js 16.2.12 uses libc-qualified Linux packages instead (`@next/swc-linux-arm64-gnu` or `@next/swc-linux-arm64-musl`), so that helper produces a Linux-only false negative even when the locked native package is present. The infrastructure workflow does not modify the frozen helper and does not add an alias, symlink, fallback download, or replacement proof script.

CI instead keeps `pnpm env:check` as the exact Node/ARM64 guard and uses the real workload as native-binding evidence: the full test suite executes pinned Sharp image processing, `pnpm build` executes the installed Next SWC and Lightning CSS bindings, and browser acceptance starts the built application before running Chromium. A missing or unloadable native binding fails its applicable job. This is direct execution evidence, not a bypass of a failed native dependency.

The accepted Phase D architecture checker is intentionally proof-bound to code commit `d7655385e37330927c53e60fbb108b56950c9794`; it refuses descendant documentation/governance commits by design. CI first proves that the candidate has no change outside `docs/**` and `.github/**` relative to that proof-bound Product tree, then runs the unchanged checker at the proof-bound commit with the explicit locked-install `node_modules` input. This preserves the checker contract without modifying Phase D or inventing a second architecture authority.

## Isolation boundary

CI uses only conspicuously local/test values and disposable runner storage. It must never receive or contact:

- Production or Staging databases, buckets, credentials, or data;
- real AI Provider/API credentials or calls;
- SMTP delivery credentials or real recipients;
- formal customer, Product, Inquiry, or private Production assets;
- Cloudflare or deployment credentials.

Production deployment, Stage 6/7, Cloudflare, backup/restore, monitoring, and real Provider validation are outside this foundation.

## Dependency security semantics

For a dependency-changing PR, the authoritative hard gate is:

1. deterministic `package.json` / `pnpm-lock.yaml` state;
2. `pnpm install --frozen-lockfile`;
3. `pnpm audit --prod --audit-level=high`.

High and Critical advisories block the governance gate. A registry or network failure is `INDETERMINATE`, never PASS, and requires a later rerun or an explicitly documented Owner decision. The weekly `pnpm audit --prod` supplies full Critical/High/Medium/Low visibility but is not a normal PR merge gate. It is not a second dependency authority.

Any vulnerability exception must preserve the advisory evidence and record: advisory ID, affected package/scope and versions, risk reason, compensating controls, approver, creation and expiry dates, review cadence, remediation owner, and next action. Expired exceptions return to blocking status.

## GitHub Free manual merge gate

The Private Repository uses GitHub Free. The project does not claim platform enforcement for required checks, required review, branch/tag immutability, or force-push/delete prevention where the plan does not provide it. The Owner has accepted this residual risk and no custom enforcement substitute is added.

Normal integration is PR-first. Before merging, the Owner and Coordinator verify the exact latest candidate SHA and confirm:

- every applicable CI job actually ran and passed;
- no applicable result is pending, cancelled, indeterminate, unexpectedly skipped, or stale;
- fresh independent Codex Review covers that SHA and has no open BLOCKER/HIGH finding;
- the PR scope and external-isolation boundary are intact;
- merge method is **Create a merge commit**.

Squash, rebase, force-push, and branch/tag deletion are excluded from the normal workflow. Owner emergency merge authority remains available as an explicit residual-risk decision. Any use must be recorded in the PR or Coordinator evidence with the reason, exact SHA, missing evidence, decision time, recovery action, and later verification; it must never be described as ordinary PASS.

After merge, the Coordinator verifies `main` CI on `I`, the two-parent lineage, `F` and `P` ancestry, and the unchanged annotated tag. Recovery does not rewrite accepted history: disable Actions if required, preserve evidence, and use a new reviewed revert PR/commit. Never reset or force-push `main` or mutate the Phase D tag.

## Phase E contract

Phase E remains HOLD until all of the following are true:

1. the Private Repository and single CI workflow are implemented;
2. candidate and post-merge CI evidence is PASS for the exact revisions;
3. fresh independent Infrastructure Implementation Review is PASS with no blocking finding;
4. the Project Coordinator accepts the infrastructure gate and recommends lifting HOLD.

Later Stage 4A work must receive a Final CI Delta Review before its own integration. That review updates only the CI command/Migration/test/Build delta required by later accepted work; it does not reopen frozen Phase D.
