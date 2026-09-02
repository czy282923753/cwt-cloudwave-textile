# CWT Phase 1B Stage 6 — Validation Simplification V1.1 F-01/F-02 Bounded Remediation Evidence Manifest V1.0

Date: **2026-09-02**

Status: **REMEDIATION / LOCAL-SYNTHETIC EVIDENCE ONLY**

## 1. Immutable identities

| Evidence | Identity |
| --- | --- |
| Authorized remediation root | `1bd3dc73d2cce70095927d6d9b6d7f880c864e38` |
| Root tree | `888a1804491d45748d78d7c8b94018bdf3953fa7` |
| Failed Review | `35d3882c779b840ab6ba801754614441265f0a8d`; read-only and not in Candidate ancestry |
| Remediation code/test Candidate | `964ee51db1cdd66b60d41cf45fefb93a655206c6` |
| Candidate tree | `ab962b712b04ca3b8a82a680152fee62345e9d1e` |
| Candidate sole parent | `1bd3dc73d2cce70095927d6d9b6d7f880c864e38` |
| Branch | `codex/stage6-validation-simplification-v1-1` |

## 2. Exact remediation code path set

```text
M  deploy/host/README.md
M  deploy/scripts/preflight-linux-runtime.mjs
M  deploy/scripts/preflight-linux-runtime.test.mjs
```

No other path changed between the authorized root and the remediation code/test Candidate.

## 3. Bound file identities

| Path | SHA-256 |
| --- | --- |
| `deploy/scripts/preflight-linux-runtime.mjs` | `62f51e46fbdc1dcbcd81c4c6e34c5b901886a45a5fa3dacdf68ff4b909ea1903` |
| `deploy/scripts/preflight-linux-runtime.test.mjs` | `8b73e23255667b878a437e2c71fce5de14d8c3bc82b83843873e5788e5fcf471` |
| `deploy/host/README.md` | `d4a2c8d9241a350af88eebb4e54d967250cfe02ec42f548b2797a1f42696ae42` |

Preserved authorities:

| Path | SHA-256 |
| --- | --- |
| `compose.yaml` | `c94472509c5000aea77611a9f8c9451c2cff2eddffe96e0885b8953031f277e3` |
| `deploy/runtime-validation/linux-amd64-compatibility.v1.json` | `5e33bd99e412d35a7e0cffb6a1c379f0decf7f8f816cb087dc162906977514f0` |

## 4. Finding-to-proof matrix

| Finding | Candidate control | Focused proof |
| --- | --- | --- |
| F-01 secret readability | root `0700` parents; root-owned `0444` secret leaves; root-owned `0400` `runtime.env` | Unix readability for root/UID 999/UID 10001; normalized unchanged Compose UIDs, env-file contract, and exact per-service secret allowlists |
| F-02 Docker endpoint | fixed `unix:///var/run/docker.sock`; actual socket required; caller Docker/Compose state and CLI endpoint selectors rejected | remote-current-context-shaped input is neutralized; environment override classes and missing/non-socket conditions fail closed |
| F-02 compatibility profile | `--profile` deleted; tracked release-checkout profile realpath required | CLI substitution rejected and no `args.profile` authority remains |

## 5. Decisive verification

| Verification | Result |
| --- | --- |
| `node --test deploy/scripts/preflight-linux-runtime.test.mjs` | PASS, 10/10 |
| `pnpm test:deployment` | PASS, 105/105 |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| exact AI architecture gate with installed dependency root | PASS, 931 candidates / 616 executable nodes |
| `pnpm test:run` | PASS, 165 files / 1,260 tests; 11 files / 85 tests skipped |
| ordinary source build with exact Candidate `CWT_RELEASE_ID` | PASS |
| `pnpm check:bundle` | PASS, 400 eligible server JS files / 20 public manifests / 15 distinct chunks |
| `git diff --check` | PASS |

The implementation report discloses the one non-decisive ordering-only focused assertion attempt. It is not represented as a product-code failure or as PASS.

## 6. Structural and security negatives

| Check | Result |
| --- | --- |
| Candidate sole parent equals authorized remediation root | PASS |
| Failed Review absent from Candidate ancestry | PASS |
| Exact remediation code path set | PASS, 3 paths |
| `compose.yaml`, Dockerfile, workflow delta | `0` |
| Schema/Migration and package/lock delta | `0` |
| Build Once and Private DIND implementation delta | `0` |
| compatibility-profile data delta | `0` |
| alternate Docker endpoint/context/profile authority added | `0` |
| alternate secret mechanism or broader secret mount added | `0` |
| secret/credential values in source or evidence | `0` |
| retry/classifier/revocation/transition/promotion state added | `0` |

## 7. Claim ceiling and next gate

No Provider call, account creation, purchase, credential acquisition, external push/pull, OCI Build Once, actual Linux Runtime Validation, Runner provisioning/destruction proof, transition, promotion, protected action, S6-06, S6-07, or Stage 7 action occurred.

This manifest supports only the bounded remediation Candidate and Local/Synthetic proof. The next gate is exactly one Fresh Independent Implementation / Operations / Security Re-Review after this docs-only closure is committed.
