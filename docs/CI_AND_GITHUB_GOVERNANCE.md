# CI and GitHub governance

## Authority and scope

This document governs the current GitHub Free Private Repository CI boundary through Phase 1B Stage 6. It does not change the frozen Product architecture, accepted ADRs, historical Phase D evidence, deployment design, or the separation between Draft, Review, Publish and Index.

The latest accepted and tagged Product baseline is Phase 1B Stage 5, `phase-1b-stage5-approved-2026-08-30` at `a200838be34c8834a00bdcf6d1819da96e2ad26c`. Stage 6 remains Partial / HOLD and has no accepted checkpoint or tag. A later source Candidate, workflow run, report commit, Release image or OCI digest does not replace that accepted Product authority until its applicable Review, CI and acceptance gates complete.

The earlier Phase D tag `refs/tags/phase-1b-stage4a-phase-d-approved-2026-08-17`, tag object `f9967d6b73d7c2add66c2f33a4ce969d8d68c4de`, peeled commit `de51dff2b519f1ecacfb73e067c9d68361939c29`, ADR-0020, and their recorded integration lineage remain immutable historical evidence. Their facts are not rewritten, but their former pre-Phase-E integration maneuver is not the execution authority for current Stage 5/Stage 6 Candidates. Current checks run against the exact checked-out candidate source and bind emitted Build identity to that source through `CWT_RELEASE_ID`.

## Single CI workflow

`.github/workflows/ci.yml` is the only ordinary CI workflow authority. Pull requests and pushes to `main` run the current substantive gates. A weekly schedule runs the full dependency audit only.

| Job | Required evidence for an applicable PR | Contract |
| --- | --- | --- |
| `Quality + PostgreSQL + AI proof` | PASS | Exact Node/pnpm on the governed Darwin/ARM64 proof environment; AI Prompt authority and append-only history; Phase D synthetic boundary; lint and typecheck; exact hash-verified PostgreSQL 18.4 source lifecycle; fresh Migration through `0021`, including explicit `0020`/`0021` presence; one unfiltered full Vitest run with all currently discovered PostgreSQL suites enabled and the current architecture checker operating against the candidate tree; pinned native image processing executes where exercised |
| `Build + public bundle` | PASS | Clean migrated PGlite database, real Next Build without seed data, native SWC/Lightning CSS execution, public-bundle boundary check |
| `Browser` | PASS | Clean Playwright database/storage lifecycle, real Next server startup, and Chromium acceptance with retries disabled |
| `Dependency security` | PASS or explicitly not applicable | Exact install and High/Critical hard gate only when `package.json` or `pnpm-lock.yaml` changes; scheduled full-severity visibility is separate |

Quality uses the standard `macos-15` ARM64 GitHub-hosted runner. Build, public-bundle, Browser and dependency-security evidence remains on the standard `ubuntu-24.04-arm` Linux runner. Darwin is the execution environment for accepted proof assets; it is not a statement that Production runs on Darwin and it does not replace Linux Build, Browser, dual-platform packaging or native Runtime evidence. If runner capacity is unavailable and no job starts, the result is INDETERMINATE rather than PASS. Official setup actions are pinned by immutable commit SHA; Node is exactly `24.14.0`, pnpm is exactly `11.9.0`, caching is limited to the pnpm store, and workflow permissions are read-only.

### Product semantic runtime and Darwin proof execution

The authoritative protected-data Product classifier is platform-neutral. It compares exactly five semantic runtime fields: Node, V8, ICU, Unicode and CLDR. It does not make Darwin or ARM64 Product-classifier inputs. Those semantics must remain identical across supported execution environments.

The complete Quality proof still runs on Darwin/ARM64 because accepted proof executables retain narrower host assumptions: the built-in Node fetch integration identifies Darwin/ARM64, a Production-decoder test executes its substantive assertions only there, and architecture-checker adversarial cases depend on case-insensitive same-inode filesystem behavior. These are proof-environment constraints, not additional Product-classifier fields. CI must not spoof platform values, skip conditional assertions or reinterpret a different checker failure as equivalent.

The current architecture checker runs against the exact candidate tree through the current suite. The obsolete docs-only bridge to `d7655385e37330927c53e60fbb108b56950c9794` is historical evidence, not a current checker authority. The workflow does not manufacture filesystem aliases, add a second proof tree or weaken the actual-tree symlink, collision, hard-link or canonical-spelling controls.

### Exact PostgreSQL source lifecycle

Quality owns one disposable PostgreSQL authority. After the AI, lint and typecheck gates, it downloads only `https://ftp.postgresql.org/pub/source/v18.4/postgresql-18.4.tar.bz2` using bounded HTTPS/TLS transport. Before extraction it verifies the workflow-embedded SHA-256 `81a81ec695fb0c7901407defaa1d2f7973617154cf27ba74e3a7ab8e64436094`. It does not trust a separately downloaded same-channel checksum, use Homebrew, select a rolling package, choose a mirror or fallback version, retain a permanent cache, or run a second database service.

The source is configured with task-local `--prefix`, `--without-readline`, `--without-zlib` and `--without-icu`, compiled and installed only below the task-owned runner-temporary root. Before cluster initialization, the binary identity must equal `postgres (PostgreSQL) 18.4` exactly. CI then creates one new UTF8 / locale C cluster and synthetic `cwt_ci` role/database, binds the server only to `127.0.0.1:55432`, and requires live `server_version=18.4`, `server_encoding=UTF8` and a successful synthetic query.

Fresh Migration must traverse the repository chain through `0021`, with `0020` and `0021` explicitly present, before one unfiltered `pnpm test:run`. Ten suites currently discover `CWT_PHASE_C_POSTGRES_URL`; that observation is coverage inventory, not execution authority. The unfiltered command and repository test discovery are authoritative, so adding or removing a PostgreSQL-aware suite cannot be hidden behind a frozen allowlist or count.

Failure diagnostics are bounded to the disposable PostgreSQL server log and may not emit environment secrets or application data. Cleanup runs with `if: always()`, stops only the verified task-owned server, rejects unrelated process identity, removes its source/build/install/data/log root, and fails closed if an owned server remains live. Network/source unavailability, checksum mismatch, compile failure, version mismatch, startup/Migration/test failure or cleanup failure is FAIL or INDETERMINATE, never PASS. No failed substantive gate is retried as a way to manufacture acceptance.

### Linux ARM64 workload evidence

CI keeps `pnpm env:check` as the exact Node/ARM64 guard on all substantive jobs. Linux Build executes the installed Next SWC and Lightning CSS bindings and the public-bundle checker; Linux Browser starts the built application and runs Chromium with retries disabled; dependency security retains its applicable Linux semantics. A missing or unloadable native binding fails its applicable job. These are direct Linux workload signals and remain separate from the Darwin-bound Quality proof.

## Isolation boundary

CI uses only conspicuously local/test values and disposable runner storage. It must never receive or contact:

- Production or Staging databases, buckets, credentials, or data;
- real AI Provider/API credentials or calls;
- SMTP delivery credentials or real recipients;
- formal customer, Product, Inquiry, or private Production assets;
- Cloudflare or deployment credentials.

Real Provider validation, protected activation, formal Build Once/publication, Production deployment, Cloudflare, backup/restore, monitoring transport and Phase acceptance remain separately authorized boundaries. CI success alone authorizes none of them.

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

After merge, the Coordinator verifies `main` CI on the exact merged source, expected ancestry, and unchanged accepted tags. Recovery does not rewrite accepted history: disable Actions if required, preserve evidence, and use a new reviewed forward correction or revert PR/commit. Never reset or force-push `main` or mutate an accepted tag. The earlier `F` / `P` / `I` integration record remains immutable history but is not imposed as the merge shape of later Stage 5/Stage 6 work.

## Current Stage 6 gate

Stage 6 remains Partial / HOLD. A CI correction is not accepted until all of the following are true:

1. the exact source Candidate receives fresh independent Review with no blocking finding;
2. after independent Review, the Owner may explicitly authorize one concrete exact-source operation covering normal non-force Push, real CI, and one conditional Build Once/private GHCR publication;
3. the first applicable hosted run proves every substantive job executed on the intended runner and completed successfully, including PostgreSQL acquisition, hash, build, startup, Migration, unfiltered suite and unconditional cleanup;
4. the Coordinator accepts the exact CI evidence and determines the next existing Stage 6 gate.

A local Darwin/ARM64 PASS is supporting evidence only and cannot replace hosted CI. The conditional Build Once/private publication in an explicit grant becomes executable only after all applicable hosted-CI and independent-evidence conditions pass; no second permission turn is required when that existing grant already covers the same exact source and scope. The grant is not blanket future Release authority and cannot expand to another source or scope without authorization. A source correction creates a new Release identity, so no earlier Product tag, OCI index, child digest or evidence artifact may be substituted or reused. Stage 7 remains HOLD until separately approved.
