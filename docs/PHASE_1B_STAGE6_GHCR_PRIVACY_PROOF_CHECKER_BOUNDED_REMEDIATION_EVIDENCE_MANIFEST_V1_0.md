# CWT Phase 1B Stage 6 — GHCR Privacy-Proof Checker Bounded Remediation Evidence Manifest V1.0

Status: **COMPLETE IMPLEMENTATION EVIDENCE — acceptance pending Fresh Independent Review**

Principal report: [PHASE_1B_STAGE6_GHCR_PRIVACY_PROOF_CHECKER_BOUNDED_REMEDIATION_IMPLEMENTATION_REPORT_V1_0.md](./PHASE_1B_STAGE6_GHCR_PRIVACY_PROOF_CHECKER_BOUNDED_REMEDIATION_IMPLEMENTATION_REPORT_V1_0.md)

## 1. Git identity and bounded ancestry

| Fact | Exact value |
|---|---|
| Accepted source commit retained in ancestry | `eb18aa94e1bd11d1e5b61714533fbde643d5c5ce` |
| Prior Operator closure | `cdb08cd0293163bb573499a04240343d9d74a27c` |
| Implementation commit | `9eb6d1d8fff385a61eb7d6c07f64de5bb4b16e8f` |
| Implementation tree | `22ed1d3993def083c64e6765c0b9d3752b23c66c` |
| Branch | `codex/stage6-validation-simplification-v1-1` |
| Push performed | No |

## 2. Immutable failed-run evidence

| Evidence | Exact value |
|---|---|
| Run / attempt / job | `33631313598` / `1` / `100251178915` |
| Source commit | `eb18aa94e1bd11d1e5b61714533fbde643d5c5ce` |
| Job conclusion | `failure` |
| Publication step conclusion | `failure` |
| Terminal reason | `{"status":"NOT_PASS","reasonCode":"ghcr_privacy_unproven"}` |
| Canonical selected job-metadata JSON SHA-256 | `ed32ad51e2633897bbaada63561b243e30e59c56f4cc4a411e5edf4caa8235df` |
| Complete downloaded job-log stream SHA-256 | `0ebf19d6db2f1aa98c3a34f42cc4af72eb4e4279ec3617965eccd931da0d3985` |
| Job URL | `https://github.com/czy282923753/cwt-cloudwave-textile/actions/runs/33631313598/job/100251178915` |

The immutable log exposes the integration reason code but not ORAS child stderr. This is an explicit evidence limitation, not an omitted PASS condition.

## 3. Pinned upstream derivation evidence

The project pins ORAS commit `210747c29c1d38732b3194878dfd8b5a6b9ad7eb` (`v1.3.3`). Its `go.mod` pins `oras.land/oras-go/v2 v2.6.2`; tag `v2.6.2` resolves to commit `105715ee12eac6895ec736a075285c34d9f2eeb6`.

| Immutable upstream source | SHA-256 |
|---|---|
| `oras/go.mod` | `d127f6cf351642ea154cbf04016846b79fb5624f0f1b326399b11c147f59aea3` |
| `oras/cmd/oras/root/manifest/fetch.go` | `76d7b9dfc7c9aafdde165508600653c01f7398d4b4c2d2aa00875e2336b3d643` |
| `oras/cmd/oras/internal/option/target.go` | `800439115d5c3dcd4a3d9184fcc7f4d0f7d60d87fc0a9b99393d777729d49d72` |
| `oras/cmd/oras/internal/errors/errors.go` | `0c06583d39b461a4c2b5fa563444e762850e4f769c65a6d0987727fe3abe9d27` |
| `oras-go/registry/remote/auth/client.go` | `08cc91b9147bc15908220d57870ebd9a602df625ee3e8eb8d95bc660bce6d84d` |
| `oras-go/registry/remote/errcode/errors.go` | `6ca187e892808451ef78ea8e8cdf1c7d75b582e1c47e72c2341f0ad4e219e083` |

Relevant immutable source links:

- `https://github.com/oras-project/oras/blob/210747c29c1d38732b3194878dfd8b5a6b9ad7eb/go.mod`
- `https://github.com/oras-project/oras/blob/210747c29c1d38732b3194878dfd8b5a6b9ad7eb/cmd/oras/root/manifest/fetch.go`
- `https://github.com/oras-project/oras/blob/210747c29c1d38732b3194878dfd8b5a6b9ad7eb/cmd/oras/internal/option/target.go`
- `https://github.com/oras-project/oras/blob/210747c29c1d38732b3194878dfd8b5a6b9ad7eb/cmd/oras/internal/errors/errors.go`
- `https://github.com/oras-project/oras-go/blob/105715ee12eac6895ec736a075285c34d9f2eeb6/registry/remote/auth/client.go`
- `https://github.com/oras-project/oras-go/blob/105715ee12eac6895ec736a075285c34d9f2eeb6/registry/remote/errcode/errors.go`

These sources establish: descriptor fetch wraps resolution errors; an empty credential causes an anonymous distribution-token request; non-200 token responses are parsed as `ErrorResponse`; a response with no structured error body formats as `response status code 403: Forbidden`; and ORAS applies `Error response from registry:` for a matching target host.

## 4. Modified implementation artifacts

| Artifact | SHA-256 |
|---|---|
| `deploy/scripts/release-registry-integration.mjs` | `b72fa3ef960e82c1806be6ae9bb341e097fb0a4fed5bbc4aec0d1a3d5d40f50a` |
| `deploy/scripts/release-registry-integration.test.mjs` | `64b145ffb4229dff656c5745e9868487f3364d853a5c898f63ae0a68c832b18d` |

No other implementation artifact changed in commit `9eb6d1d8`.

## 5. Verification evidence

| Command | Result |
|---|---|
| `node --test deploy/scripts/release-registry-integration.test.mjs` | PASS — 8 tests, 0 failures |
| `pnpm exec eslint deploy/scripts/release-registry-integration.mjs deploy/scripts/release-registry-integration.test.mjs --max-warnings=0` | PASS |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm test:deployment` | NOT fully PASS — 114 passed, 1 unrelated Docker-dependent preflight test failed because the local Docker daemon was unavailable |
| `git diff --check` | PASS |

The focused suite includes the exact pinned-output fixture and negative cases for public success, bare Registry 401, generic/structured authorization strings, not found, DNS/TLS/timeout, spawn/signal/exit/output malformation, wrong digest/repository/host, and noncanonical token query. It also statically proves the anonymous config is empty and the command remains digest-rooted.

The incomplete Docker-dependent result is retained as an open environmental verification finding. No test was weakened or skipped to manufacture a PASS.

## 6. Closure assertion

This manifest supports only a bounded implementation Candidate. Historical stderr was not recoverable from immutable run evidence, no external post-remediation behavior was exercised, and the failed run remains failed. Fresh Independent Review is the next gate; any rerun or external action requires separate authority.
