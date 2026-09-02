# CWT Phase 1B Stage 6 — Validation Simplification V1.1 Implementation Evidence Manifest

Date: **2026-09-02**

Status: **IMPLEMENTATION / LOCAL-SYNTHETIC EVIDENCE ONLY**

## 1. Immutable identities

| Evidence | Identity |
| --- | --- |
| Required root | `e105d68d75032e9ba7eb86f4e8479cc09175c821` |
| Required root tree | `b162f125733332e3278c2fd5458398e8a98e050f` |
| Read-only Planning Review | `866a780ac567d84353d25c6af577542a8faedbb3`; not in Candidate ancestry |
| Code Candidate | `b053943414cf099313178788b1c30333886c0e54` |
| Candidate tree | `d243b6509ed0e1af1d97e180074fbbf1cc264646` |
| Candidate sole parent | `e105d68d75032e9ba7eb86f4e8479cc09175c821` |
| Branch | `codex/stage6-validation-simplification-v1-1` |

## 2. Exact Candidate path set

```text
M  deploy/host/README.md
A  deploy/runtime-validation/linux-amd64-compatibility.v1.json
A  deploy/scripts/preflight-linux-runtime.mjs
A  deploy/scripts/preflight-linux-runtime.test.mjs
M  scripts/verify-ai-architecture.ts
M  test-fixtures/ai-architecture/graph-faults.phase-d.synthetic-only.v1_0.json
```

No other Candidate path changed.

## 3. Bound file identities

| Path | SHA-256 |
| --- | --- |
| `deploy/scripts/preflight-linux-runtime.mjs` | `eec3c5589f92aa7108145f3a2c90e4a79c2b3884053cdc4bd1f7e1548a538873` |
| `deploy/scripts/preflight-linux-runtime.test.mjs` | `4b48975d0f7b49a434eedfe2ba4f90405937e20ecd16e01feb68ca84bcefc8bb` |
| `deploy/runtime-validation/linux-amd64-compatibility.v1.json` | `5e33bd99e412d35a7e0cffb6a1c379f0decf7f8f816cb087dc162906977514f0` |
| `deploy/host/README.md` | `81754255f18d8b3897b2967c93b96eed6cac53c32a2c932073009c211f57056f` |
| `scripts/verify-ai-architecture.ts` | `633d0334eb54ef7d3337ae54086234b0c249e7df3ebfc10dad22ce1078c31c1d` |
| `test-fixtures/ai-architecture/graph-faults.phase-d.synthetic-only.v1_0.json` | `b3dbd78d9afd9cabff81a8bdfbf10aaec00ba3c81b00729ccbd0a8b3f2e00dd6` |

Preserved authority hashes:

| Authority | SHA-256 |
| --- | --- |
| `compose.yaml` | `c94472509c5000aea77611a9f8c9451c2cff2eddffe96e0885b8953031f277e3` |
| `deploy/scripts/preflight-image.mjs` | `159cc7b7501fbc9044ff8964c5af47bfabe6f41b4cb52f272210c870462965ea` |
| `deploy/scripts/preflight-compose-graph.mjs` | `aa900b2e64f5f07742bb331e08b4afe97762964e4236c68eb4489459c04e7682` |
| `scripts/check-public-bundle.mjs` | `00699127a63b46ac3afc0a1514b3605563bce7c3ec0ad258e46839e926380e0c` |
| `deploy/scripts/preflight-staging.sh` | `65465c47d25b7cefdb9f23cf796168f0cacb44a638a71658a0f9dfa30a84d738` |

## 4. Decisive verification

| Verification | Result |
| --- | --- |
| `node --test deploy/scripts/preflight-linux-runtime.test.mjs` | PASS, 8/8 |
| `pnpm test:deployment` | PASS, 103/103 |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| exact AI architecture gate with installed dependency root | PASS, Candidate `b0539434...`, 930 candidates, 615 executable nodes |
| final stable `pnpm test:run` | PASS, 165 files / 1,260 tests; 11 files / 85 tests skipped |
| ordinary fresh `next build` with exact Candidate `CWT_RELEASE_ID` | PASS |
| `pnpm check:bundle` | PASS, 400 eligible server JS files / 20 public manifests / 15 chunks |
| `git diff --check` | PASS |

The first non-decisive full-suite and build attempts are disclosed in the implementation report; neither is represented as PASS.

## 5. Structural and security negatives

| Check | Result |
| --- | --- |
| Candidate sole parent equals required root | PASS |
| Planning Review absent from Candidate ancestry | PASS |
| `preflight-release-compose.mjs` / Private DIND code delta | `0` |
| `build-release-once.mjs` delta | `0` |
| `compose.yaml`, Dockerfile and workflow delta | `0` |
| Schema/Migration delta | `0` |
| package/lock delta | `0` |
| new path imports existing image and Compose authorities | PASS |
| new path executes existing bundle checker | PASS |
| accepted input is exact private repository/index digest only | PASS |
| tag/malformed/tar/save-load/temp-tag/host-transfer cases rejected | PASS |
| DIND/container/shared-state formal Runner cases rejected | PASS |
| exact Ubuntu/amd64/Engine/Compose compatibility fail-closed | PASS |
| real `runtime.env`, secret and storage contract represented | PASS |
| exact three-service runtime plan | PASS |
| PASS/NOT_PASS only; no classifier/retry/revocation/transition | PASS |
| bounded teardown plan and enclosing Runner-destruction boundary | PASS |
| source/evidence contains no Registry credential, Provider token, production secret or production data | PASS |

## 6. Immutable historical boundary

Hard-denied subjects:

1. `fe6e5b057aa7054d42f02f76d31858d3f71be3a9` / `sha256:0a2f4651c569db1eba3eab465c3092122c0d80b8fe7b81166e11be1b4293fc46`;
2. `e105d68d75032e9ba7eb86f4e8479cc09175c821` / `sha256:57c95535939eef9376563799849ecf27027eea518709faa0705aef0c6a5119ad`.

Required append-only classification for the second subject:

> pre-container-start Private DIND Harness failure after gateOpen, incorrectly classified as subject failure.

Original revocation, audit and validation records were not modified.

## 7. Claim ceiling

No Provider call, account creation, purchase, credential acquisition, external image pull/push, Build Once, CWT release-image transfer, Runtime Validation, transition, promotion, protected action, S6-06, S6-07 or Stage 7 action occurred.

This manifest supports only the implementation Candidate and proportionate Local/Synthetic proof. The next gate is exactly one Fresh Independent Implementation / Operations / Security Review.
