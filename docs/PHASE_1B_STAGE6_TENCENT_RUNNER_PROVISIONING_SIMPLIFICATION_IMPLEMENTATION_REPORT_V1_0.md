# CWT Phase 1B Stage 6 — Tencent Runner Provisioning Simplification Implementation Report V1.0

Status: **IMPLEMENTATION COMPLETE — Candidate ready for one Fresh Independent Implementation / Operations / Security Review**

Recorded at: `2026-09-03T13:18:58Z`

Evidence manifest: [PHASE_1B_STAGE6_TENCENT_RUNNER_PROVISIONING_SIMPLIFICATION_EVIDENCE_MANIFEST_V1_0.md](./PHASE_1B_STAGE6_TENCENT_RUNNER_PROVISIONING_SIMPLIFICATION_EVIDENCE_MANIFEST_V1_0.md)

## 1. Authority and Candidate

| Fact | Exact value |
|---|---|
| Authorized base / prior external-attempt evidence | `c96900e34287eea9819737252d6df8b29c14ea36` |
| Implementation Candidate | `3714a0fb4ef7944c292b1e5abd9e5753cfabda83` |
| Candidate tree | `4e848f247c9b9d4378cc09134505a49bc033e745` |
| Remote action | None; Candidate was not pushed |
| External execution | None |

The Candidate is local implementation evidence only. It creates no VM, installs no host package, acquires or transmits no credential, registers no Runner, dispatches no workflow, accesses no Runtime subject, and performs no cloud lifecycle action.

## 2. Root cause and corrected responsibility boundary

The V1.4 external attempt used an ad-hoc Automation Assistant command. Its Docker package lookup combined `pipefail` with `apt-cache madison ... | awk ... { exit }`; the consumer closed after its first match and the upstream producer returned `SIGPIPE`, observed as ExitCode `141`.

The correction replaces that ad-hoc command path with one repository-versioned, zero-argument payload:

`deploy/runtime-validation/provision-ubuntu-amd64-runner.sh`

The payload captures the complete `apt-cache madison` output before parsing it with Bash built-ins. It accepts exactly one complete expected package-version match and fails closed for zero matches, duplicate matches, another package, malformed records or wrong versions. No early-closing producer/consumer package-selection pipeline remains.

The boundary ends after exact tool verification, full Runner-tree ownership convergence, an actual `ubuntu` `_diag` create/check/remove probe and an actual `ubuntu` Docker access probe. Registration-token acquisition/transmission, Runner registration/launch, workflow dispatch and cloud teardown remain outside the script as separately authorized operator actions.

## 3. Exact identities

The accepted semantic identities remain Docker Engine `29.6.2`, Docker Compose `5.3.1`, GitHub Actions Runner `2.337.0`, and Runner archive SHA-256 `70920811a4f8ad4328818682bca5c6469c1c942fab52448868071d0063816613`.

Read-only Docker official Noble `amd64` package metadata established these complete package identities:

| Package | Exact version | Official package SHA-256 |
|---|---|---|
| `docker-ce` | `5:29.6.2-1~ubuntu.24.04~noble` | `4d32ac53660446a16f3ab39b29ca3c9253568a68aefbdd0d8b6f449b3a953a0a` |
| `docker-ce-cli` | `5:29.6.2-1~ubuntu.24.04~noble` | `fcc3014d7a8c5c16abda30ce643a498f8b34aa213ad7a14ff8fb30ad07670d7d` |
| `docker-compose-plugin` | `5.3.1-1~ubuntu.24.04~noble` | `19d9473c2f011f94e1e54b035dcac170dab0c19671799db6f015e29eb9f23357` |
| `containerd.io` | `2.3.4-1~ubuntu.24.04~noble` | `1c858bacbf367f415cfd9723152f6402f0b8e865ca00d0b701f58fb33c963c59` |

The script requires the complete versions and installs all four explicitly with `--no-install-recommends`. A missing or ambiguous repository identity is a terminal refusal; it does not choose a newer package or alternate source.

## 4. Implementation scope

| Path | Change |
|---|---|
| `deploy/runtime-validation/provision-ubuntu-amd64-runner.sh` | New sole Ubuntu 24.04 `amd64` pre-registration payload; exact package selection/install, identity verification, Runner digest check and actual-user probes |
| `deploy/scripts/provision-ubuntu-amd64-runner.test.mjs` | New tests in the existing deployment test surface; no new framework |
| `deploy/host/README.md` | Minimal operator contract requiring unchanged submission of the reviewed payload and preserving separate registration/lifecycle authority |

The payload also refuses a non-root, non-Ubuntu-24.04, non-native-amd64, missing-`ubuntu`-user, non-fresh Runner root or conflicting host package state. It has no retry, fallback installer, alternate repository, DIND, SSH, host-Node prerequisite, Registry login or cloud API path.

## 5. Verification

| Gate | Result |
|---|---|
| Bash syntax | PASS: `/bin/bash -n deploy/runtime-validation/provision-ubuntu-amd64-runner.sh` |
| Focused package-selection and boundary suite | PASS: `5/5` |
| Full existing deployment suite | PASS: `122/122` |
| Prior operator-record integrity | PASS: V1.1–V1.4 report/manifest sidecars all verified |
| `git diff --check` | PASS |
| ShellCheck | Not run; not installed locally, and no dependency was added solely for this task |
| Live package installation / Tencent execution | Not run; outside authority |

The negative tests cover zero, duplicate, wrong-version, malformed, extra-separator and wrong-package catalogs. A static mutation check proves that the prior `apt-cache ... | awk ... exit` pattern is rejected. Boundary checks prove that token, registration, Runner launch, workflow dispatch, Registry login and cloud-lifecycle responsibilities are absent.

## 6. Security & Test Simplification Check

- Security: no secret input or output exists; the Runner archive is hash-verified; signed APT metadata supplies exact package identities; the script refuses non-fresh/conflicting hosts and verifies the actual unprivileged Runner user before registration.
- Test simplification: tests reuse Node's existing built-in deployment suite and source only the pure selector; no VM fixture, mock framework, retry harness or new test runner was added.
- Replace, not layer: the documented ad-hoc reconstruction path is replaced by one exact repository payload. No second provisioning authority or compatibility wrapper remains.
- Claim ceiling: Local/Synthetic evidence proves parser and responsibility structure only. Real Ubuntu package installation, Docker/systemd behavior, Runner dependency installation and Tencent execution remain External Validation Required.

## 7. Complexity report and next gate

No table, state machine, Worker, queue, Lease, Recovery type, service, persistent daemon, retry controller or generalized provisioning framework was added. Total operational complexity decreases because one versioned payload replaces reconstructed console commands and removes the failure-prone discovery pipeline.

Open risk is intentionally fail-closed: if Docker's official repository no longer carries any exact package identity, a future authorized execution stops rather than floats. The next and only gate is one Fresh Independent Implementation / Operations / Security Review of Candidate `3714a0fb4ef7944c292b1e5abd9e5753cfabda83`. Any non-PASS keeps the work on HOLD. This report grants no external execution, push, VM, registration, workflow dispatch, promotion or deployment authority.
