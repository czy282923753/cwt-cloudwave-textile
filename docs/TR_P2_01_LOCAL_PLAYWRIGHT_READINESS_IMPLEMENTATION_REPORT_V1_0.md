# TR-P2-01 local Playwright readiness and implementation report V1.0

## Control and scope

- Baseline: `f05852dbd3c5cff80421793a4ea345e401d50361`, accepted by local annotated tag `refs/tags/phase-1b-stage4-approved-2026-08-28`.
- Scope: local Playwright readiness only. CI caching, production code, dependencies, lockfile, Playwright scenarios and retry policy are unchanged.
- Cache authority: Playwright's standard default per-user OS cache. No CWT-specific cache, browser copy, downloader or persistent cache state exists.

## Operator path

From a worktree-local dependency installation, run:

```sh
pnpm test:e2e:readiness
```

This non-downloading preflight:

1. Refuses any defined `PLAYWRIGHT_BROWSERS_PATH`, so an override cannot silently replace the default policy.
2. Uses the accepted installed `@playwright/test` package and the standard `playwright install --dry-run chromium` command to report the dependency-selected browser build, revision and install destination without downloading.
3. Uses Playwright's public `chromium.executablePath()` API to check executable presence.
4. Launches and closes headless Chromium, proving the selected browser works on the current OS and architecture. The package version, runtime architecture and launched browser version are derived at runtime rather than hardcoded.

If and only if the exact browser is absent, or the accepted Playwright dependency changed, run the Playwright-managed idempotent ensure path and repeat preflight:

```sh
pnpm test:e2e:ensure-browser
pnpm test:e2e:readiness
```

The ensure command may use the network. It is not part of normal readiness and was not run for this Candidate.

## Isolation exception and dependency policy

A task-specific `PLAYWRIGHT_BROWSERS_PATH` is an explicit isolation exception, never the default. The task record must state the material isolation reason, exact Playwright/browser revision and cleanup action. Run that exceptional evidence outside the default readiness command and remove its cache after the recorded evidence no longer needs it.

Each worktree keeps its own `node_modules`. Install it with the frozen lockfile and pnpm's normal shared user store; never symlink or share `node_modules` across worktrees. Browser binaries and cache paths must not be committed or copied into a worktree.

## Implementation and verification evidence

Observed locally on 2026-08-29 without network access or browser download:

- Node `24.14.0`, pnpm `11.9.0`, `darwin/arm64`, and `@playwright/test` `1.62.1` matched the frozen toolchain.
- A worktree-local `pnpm install --frozen-lockfile --offline` completed from the existing shared user store.
- Standard Playwright dry-run derived Chrome for Testing `151.0.7922.34`, Chromium revision `1234`, headless-shell revision `1234` and FFmpeg revision `1011` for macOS ARM64.
- `pnpm test:e2e:readiness` used the default cache and launched Chrome for Testing `151.0.7922.34` successfully.
- A defined temporary `PLAYWRIGHT_BROWSERS_PATH` caused the default readiness path to fail before selection or launch.
- `pnpm env:diagnose`, focused script syntax checking and `git diff --check` passed. The lockfile remained byte-identical and no browser binary, cache directory or absolute user cache path entered Git.

The missing-browser negative case was not manufactured because moving or deleting the real shared cache would be destructive and could disrupt other worktrees. The preflight contains executable-validation and launch-failure handling, but no missing-browser execution claim is made. A fresh independent Reviewer may use a non-destructive controlled environment if additional negative evidence is required.

## Complexity and residual risk

The root cause was inconsistent task-local cache overrides, not missing cache infrastructure. This implementation adds two package entry points and one narrow stateless script around standard Playwright mechanisms. It adds no table, state machine, Worker, Lease, Recovery path, daemon, lock or second source of truth; no dual cache authority remains in the default path. Tooling complexity increases only by the bounded preflight while operational cache complexity stays level.

Browser security and update lifecycle remains tied to the exact accepted Playwright dependency. Ephemeral CI download cost and CI caching remain out of scope.

## Next gate

This is an unapproved Candidate. A fresh independent Toolchain Reviewer must first perform the lightweight Security & Test Simplification Check, then complete the normal implementation review. The Implementer does not self-review or approve this Candidate.
