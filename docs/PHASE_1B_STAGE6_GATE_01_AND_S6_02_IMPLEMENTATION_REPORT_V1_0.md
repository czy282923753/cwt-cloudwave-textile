# CWT Phase 1B Stage 6 GATE-01 and S6-02 Implementation Report V1.0

Status: **LOCAL IMPLEMENTATION CANDIDATE — selected path A; fresh independent implementation/security review required**

Date: **2026-08-30**

Authority boundary: **GATE-01 and S6-02 only. S6-03 and Stage 7 were not entered. No self-approval is claimed.**

## 1. Outcome

The accepted GATE-01 and S6-02 continuation is implemented as two distinct checkpoints:

| Checkpoint | Commit | Tree | Sole parent |
| --- | --- | --- | --- |
| Accepted Stage 6 planning | `cf03e22ce690a1a09b79bba32434a44aaa7046de` | `d568010aa7cd1bc9781d14636d0bc2e8863f1a08` | `caaa17ee2892890ba7e3da4580bfc7a5b9df861b` |
| S6-01 | `5a02d5392217b27ad57c513f07b1fa8c44fbf191` | `60ec17110de3f81c8bc40215e0c3677df68bbe4b` | `cf03e22ce690a1a09b79bba32434a44aaa7046de` |
| GATE-01 | `877799b17adbe39eec01b0bfbefa3cd51597e5ab` | `7d11e2984a67586af8f02417f3622ebfa76b4683` | `5a02d5392217b27ad57c513f07b1fa8c44fbf191` |
| S6-02A | `18aea0acd03e460b56d6dc0499258b7081cb1231` | `a35b47a14d7c6f6182138a347b3c9c59fcf1a4d2` | `877799b17adbe39eec01b0bfbefa3cd51597e5ab` |

The implementation branch is `codex/phase-1b-stage6-implementation-v1`. Planning amendment `96772363e95ca944fa1720d5f6a4b4cbfbd852f3`, its corrected independent PASS `07a6d030035969e4473ed85c1d1302af9990cce2`, and prior planning review `01540fa5753a245579fabe1aa45581cdb663cedc` are sibling authority records and are not ancestors of the implementation Candidate.

Selected path **A** passed. Fallback B was not activated; `iovalkey` is absent.

## 2. GATE-01

GATE-01 changes exactly `scripts/verify-ai-architecture.ts`.

The checker now separates:

1. immutable Phase D S2.5 historical identity read from fixed Git objects; and
2. accepted Stage 4 freeze ancestry plus current-tree AI semantic authority.

No current AI hash, protected-path classification, external allowlist, Provider uniqueness, Prompt identity, bundle boundary or negative authority was relaxed. Historical evidence was not rewritten.

Decisive proof from a clean detached worktree:

- direct architecture gate: `ok: true`;
- full suite: 146 files passed, 11 skipped; 1115 tests passed, 85 skipped; exit 0; zero assertion failure and zero unhandled error;
- an unrelated same-tree non-descendant failed the Stage 4 ancestry check;
- a Git replacement of immutable S2.5 failed the historical object identity check;
- a current DeepSeek adapter mutation failed the current semantic hash check; and
- the commit diff contained only `scripts/verify-ai-architecture.ts`.

All disposable negative-test worktrees and the tampered clone were removed after proof.

## 3. S6-02A implementation

### 3.1 Single runtime authority

- Added one provider-neutral `SharedRateLimiter` contract with exact `allowed`, `limited`, and `unavailable` outcomes.
- Added one protected factory and one GLIDE-backed Valkey implementation.
- Kept memory limiting only as an explicit Local/Test seam; Production and Staging require Valkey and have no runtime fallback.
- Deleted `src/uploads/rate-limit.ts` and retired its generic HTTP/memory protected authority.
- Removed the old boolean-compatible upload test seam; Admin/import callers and fixtures now use the same `RateLimitOutcome` contract.
- Converged login, Inquiry, public Upload Intent, binary Upload, Admin Upload, and conversion-event callers on the singular factory.
- Conversion telemetry discards safely on limiter/address unavailability; protected authentication and upload paths deny/fail closed.

### 3.2 Trusted address and isolation

- Added one `trustedClientAddressFromRequest` authority for the Nginx-attested `x-cwt-client-address` header.
- Removed Vercel and user-agent/header fallback identity paths.
- Enforced exact environment prefixes `cwt:production:rate:` and `cwt:staging:rate:`.
- Identities are SHA-256 hashed before becoming Valkey keys; action namespaces remain isolated.

### 3.3 Atomic Valkey contract

- Exact package: `@valkey/valkey-glide@2.5.1`.
- Exact one-key Lua authority: `INCR`, first-write `PEXPIRE`, and `PTTL`, with maximum 30 and window 60,000 ms.
- Endpoint parsing accepts one credential-free `redis:` origin; ACL username/password remain separate.
- Static node discovery, DB 0, 250 ms request/connect bounds, inflight bound 128, and bounded reconnect configuration are explicit.
- Malformed replies and all transport/auth/outage errors map only to `unavailable`.
- Readiness requires authenticated `PING` plus the same Lua canary.

### 3.4 Next and public-bundle boundary

- Extended the existing `serverExternalPackages` list, preserving `@electric-sql/pglite` and adding `@valkey/valkey-glide`.
- Added the accepted `output: "standalone"`; no alternate build, loader, plugin, manual native copy, or trace-rescue glob exists.
- Extended the existing public-bundle checker to require server-only limiter evidence and reject GLIDE packages, native identifiers, limiter modules/algorithm, and every `.node` file from public/static closure.
- Added focused negative tests for missing server markers, public-client GLIDE/native/limiter leaks, and native files under `.next/static`.

## 4. Verification

### 4.1 Exact S6-02 commit gates

All commands below ran against exact commit `18aea0acd03e460b56d6dc0499258b7081cb1231` or its byte-identical staged tree immediately before the commit; the final clean-commit run is listed explicitly.

| Gate | Result |
| --- | --- |
| `pnpm lint` | PASS, exit 0, zero warnings |
| `pnpm typecheck` | PASS, exit 0 |
| Focused limiter/request/auth/Inquiry contract | PASS, 7 files, exactly 25 tests |
| Direct caller/integration regression | PASS, 5 files, 62 tests |
| Bundle-policy unit tests | PASS, 1 file, 131 tests |
| Admin/import outcome-contract regression | PASS, 10 files, 42 tests |
| Final clean-commit `pnpm test:run` | PASS, 150 files passed and 11 skipped; 1134 tests passed and 85 skipped; exit 0; zero assertion failure and zero unhandled error |
| Final direct AI architecture gate with explicit pinned `node_modules` | PASS, `ok: true`, `head: 18aea0ac...` |
| Schema/Migration no-delta | PASS, no changed path under `src/db`, `drizzle`, or `migrations` |
| `git diff --check` | PASS |

The first full-suite attempt exposed 16 import-time `server-only` fixture gaps plus stale bundle fixtures. These tests were corrected without removing the production `server-only` imports or weakening the checker. A later direct AI invocation without its mandatory `CWT_INSTALLED_NODE_MODULES` precondition failed closed as designed; the decisive invocation supplied the exact installed dependency directory and passed.

### 4.2 Exact Linux/glibc build identities

| Item | Exact identity |
| --- | --- |
| Node image index | `node@sha256:d8e448a56fc63242f70026718378bd4b00f8c82e78d20eefb199224a4d8e33d8` |
| Node linux/amd64 manifest | `sha256:4bd6219054c8bebcd26a66bfd8ca0bd6e1024b4b97474c59bb7ee3bbcbef4fe8` |
| Node linux/arm64 manifest | `sha256:b3e8b37cd3102ef30c77d039f15baffe72c18fa23058c6e18b75a2e2faaad2e3` |
| Runtime | Node `24.14.0`; pnpm `11.9.0`; Debian glibc `2.36` |
| Valkey image index | `valkey/valkey@sha256:f0ba225266310efba5fb33383e21c64fbd07907304224786c780606e7ebd7327` |
| Valkey linux/amd64 manifest | `sha256:3d9b17f2fa3d938c63c0e951a669f8752f57fdee2d771a757830f66b4c8cc0bf` |
| Valkey linux/arm64 manifest | `sha256:50e8e85f91d18480a262ca8fe6ee296945c5f00ee73a966da823de44ae54e2b4` |
| GLIDE main integrity | `sha512-vtYyMJ2L42RH5CgBNtG2ffupNxu8c6KTzWvhXsUI2zChIFJQwUcuHuEdqXeOjTJZ9XfWs1E4w1TMiwnZSqGlkw==` |
| GLIDE arm64/glibc integrity | `sha512-D3AnYqMefXaaZJLPa4Q5A506On0/zg2ikI+YKWQsVXSgegf+YRXMrjfYqXa+LQD8s8jMMlZB/FAmSr4g+iv3CQ==` |
| GLIDE x64/glibc integrity | `sha512-VUXP852lmBp09WSG1/Yd9SFoATUW+MRRVaXhFabQkRlHm/7sm/0X9K2xyU5j41OeoHYK6Zne7YyGIyE1zgkV4Q==` |

Both platforms completed `pnpm install --frozen-lockfile`, disposable PGlite migration, and default Next `16.2.12 (Turbopack)` build from a clean `.next`. Both compiled and typechecked successfully and generated 44/44 static pages. `check:bundle` passed with 392 eligible server JavaScript files, 20 public manifests, 7 root chunks, 8 manifest chunks, and 15 distinct public chunk files.

### 4.3 Standalone and native artifact inventory

| Field | linux/arm64 | linux/amd64 |
| --- | --- | --- |
| Standalone files | 2561 | 2561 |
| Standalone tree SHA-256 | `41ff8ccd3fc8ccc30ed39daaca460b17b2e0c9857e2a8d690566ce84647f1494` | `ecfd127401ca8bdd4a97d0503ac2363b8b2796d0b7fc26744d433a96d1cf6f27` |
| `.nft.json` files | 157 | 157 |
| NFT-set SHA-256 | `475183307719092cb69201a010c80168e917d774be449d58ddf45606efd08c16` | `bac3013373009f8e7d326e59b3dc4ae1864b58b950e328a8605e04ea693a5840` |
| Valkey-bound NFT files | 72 | 72 |
| Native binary bytes | 12,386,344 | 14,733,768 |
| Native binary SHA-256 | `8132078c5fe901715c0bf819900f3a368deaed65eba8e0057a8ae27961eaaf18` | `b9f1cf7c3873db3ba90cada6b8aa367dc0c8f4f4518c3beb511b32a6e98596bf` |

Each artifact contained exactly one matching `linux-{architecture}-gnu@2.5.1` native package and binary, no Darwin, musl, or wrong-architecture binary, and the one traced external alias `.next/node_modules/@valkey/valkey-glide-42d1ca00f27d7ccd`. The copied artifact resolved and loaded `GlideClient.createClient` under Node `24.14.0` with only `.next/standalone` mounted; repository `node_modules` was absent.

### 4.4 Built-server and Valkey behavior

For both linux/arm64 and linux/amd64:

- the exact `.next/standalone/server.js` started in the digest-pinned Node runtime;
- the exact platform-selected Valkey 8.1.9 image ran on an isolated Docker network with no published host port;
- Synthetic production-shaped file secrets and a deliberately unreachable Synthetic database were used;
- the built login route created two expected hashed login keys and the verifier proved counter and TTL values;
- two independent Node processes proved atomic 30/31, action isolation, TTL reset, wrong ACL denial, and malformed/stopped-service fail-closed behavior;
- stopping Valkey caused the built route to return the existing `rate_unavailable` outcome before database work; and
- restarting Valkey allowed a later fresh request through the same running app process, proving recovery without replaying the denied request.

Initial runtime fixture attempts correctly failed because the test ACL omitted GLIDE's required `CLIENT SETNAME` permission and the synthetic protected config did not explicitly clear the local default literal session secret. A verifier URL used a non-accepted Docker alias in one initial attempt. Only the disposable fixture was corrected; no Candidate code, timeout, assertion, or expected outcome changed. All decisive reruns exited 0.

No database, Cloudmersive, SMTP, DNS, Provider, protected Staging, or Production action succeeded. All containers, networks, volumes, and temporary secret files were removed after proof.

## 5. Security & Test Simplification Check

Implementation self-check result: **PASS for review submission; not independent approval.**

- **Root Cause First:** fixed the historical/current AI authority split and the native packaging boundary.
- **Simplification First:** deleted the old upload limiter and boolean compatibility seam; reused the existing Next externalization and bundle-checker mechanisms.
- **Replace Not Layer:** one GLIDE transport exists; no iovalkey, HTTP limiter, protected memory fallback, alternate build, or second trusted-address authority remains.
- **Single authority:** one interface, one factory, one Lua command, one protected singleton, and one trusted address parser.
- **No gate weakening:** failure states remained observable and fail closed; new public/native negatives were added.

## 6. Rollback and residuals

Rollback is commit-scoped: revert `18aea0ac...` as a unit to its GATE-01 parent only with a separately validated Valkey-protected predecessor. Do not selectively restore `src/uploads/rate-limit.ts`, HTTP limiting, protected memory limiting, or a second client. GATE-01 can be reviewed/reverted independently through `877799b1...` without rewriting historical evidence.

Open blocking findings: **none identified by the Implementer**.

Residual claim boundaries:

- this is local/Synthetic evidence, not target-host, Nginx end-to-end, DNS, Cloudflare, Cloudmersive, protected Staging, or Production proof;
- O-01 through O-25 and X-05/X-06 remain preparation-only/unproved where they require external or protected-environment evidence;
- S6-03 and later slices remain unstarted; and
- the mandatory next gate is a separate independent implementation/security Review of exact GATE-01 and S6-02. Stage 7 remains HOLD.
