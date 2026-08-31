# CWT Phase 1B Stage 6 — S6-05 Implementation Evidence Manifest V1.0

Date: **2026-09-01**

Status: **LOCAL/SYNTHETIC IMPLEMENTATION EVIDENCE — fresh independent security/test/operations Review required**

Principal report: `docs/PHASE_1B_STAGE6_S6_05_IMPLEMENTATION_REPORT_V1_0.md`

Principal report SHA-256: `7061bdef9cffabc28a44108c1c5019bfc75bb3f829a4e5cf0a705b3275152a74`

## 1. Subject and claim ceiling

The Review subject is the linear S6-05 implementation/correction chain `41b5962744e9ea136da4a85fea03a97b26b518ed` through `c0d1e646e55f709cfed335db6ad8dfbf968cbc96`, followed by one documentation-only closure containing this manifest, the principal report and their adjacent SHA-256 sidecars.

This manifest binds local/Synthetic evidence only. The current release is `built`, unrevoked and untransitioned. No Registry push, external Provider/account call, protected deployment, production credential, DNS/traffic action, S6-06 action or Stage 7 action is claimed or authorized.

## 2. Exact linear ancestry

| Commit | Sole parent | Tree | Role |
| --- | --- | --- | --- |
| `41b5962744e9ea136da4a85fea03a97b26b518ed` | `0842443b61b42dc1a24f5902960cf97a0faf0121` | `2bbd74cff5999230b82c35543749c62df3cbab31` | S6-05 health/work/monitoring/log/semaphore implementation; emitted subject later revoked |
| `f0096d5109000678efc5b65041375c4341151e1c` | `41b5962744e9ea136da4a85fea03a97b26b518ed` | `ab619699070eefa5e3efb9f3da44a9b06a5e5586` | health namespace proxy bypass; emitted subject later revoked |
| `c0d1e646e55f709cfed335db6ad8dfbf968cbc96` | `f0096d5109000678efc5b65041375c4341151e1c` | `4d7b3cf55d538206d9bb032617038eefb8f629ef` | narrow Sharp standalone closure and executable proof; current release source |

The documentation closure must have sole parent `c0d1e646e55f709cfed335db6ad8dfbf968cbc96` and exactly the four paths named in Section 10.

## 3. Revoked historical subjects

| Retained item | SHA-256 / identity |
| --- | --- |
| `/tmp/cwt-s605-stage6-41b59627/release.json` | `b0af753842c1192a612a30b86734266207e73a2af9203229a7ca2754a80f66ca` |
| First index | `sha256:7e87834db55581f12db87d9cd8558a091e75f8a4f5e89c4c38083ed2e832a445` |
| `/tmp/cwt-s605-stage6-41b59627/revoked/7e87834db55581f12db87d9cd8558a091e75f8a4f5e89c4c38083ed2e832a445.json` | `a845994d859f43d5672fd3ce62821c14147060bb29d78b6cdc3e02753c231d93`; `runtime_validation_failed` |
| `/tmp/cwt-s605-stage6-f0096d51/release.json` | `bb50f0bd9595823d6b4204a3e877d3dbd972151fc7d700c0f35242713ce9d707` |
| Second index | `sha256:b1ca00024187a896cff240c011642db546a9c1ea9e91405e6b2d80bf81d97039` |
| `/tmp/cwt-s605-stage6-f0096d51/revoked/b1ca00024187a896cff240c011642db546a9c1ea9e91405e6b2d80bf81d97039.json` | `5bfd50ca4c64f3e1c7656f070bb62096b099341c81697b0fffaff32688eb44c8`; `runtime_validation_failed` |

Both revocation markers are immutable additions under retained old release roots. Their presence, rather than a source-level workaround, permanently excludes those exact subjects.

## 4. Current OCI graph and lifecycle

| Item | Exact identity |
| --- | --- |
| Release ID | `c0d1e646e55f709cfed335db6ad8dfbf968cbc96` |
| Source tree | `4d7b3cf55d538206d9bb032617038eefb8f629ef` |
| Source archive SHA-256 | `d59707194d2ef94937d457d113c5fe4f867fc080db74659712c0a4976b97fade` |
| OCI index | `sha256:03e032006e4b2c8a819f6cce5a1425d57e4d34a11bd2e9939d8910d23ce8a867` |
| `linux/amd64` manifest | `sha256:91cda39ef658437ff8666b9f980b607a3c37f02927ff4cf955fcf540de2e0fa3` |
| `linux/amd64` config | `sha256:2c2dd0d635e83a8dd76bce8fb79ed8fa584a31258cab7ce3ed471bb41ffd278c` |
| `linux/arm64` manifest | `sha256:8d9f80d0e3bf688e301af06f68220e2fcfa15081a82bb4929a27466938e1bdcc` |
| `linux/arm64` config | `sha256:fe1a9fe5f4cc0a8ac62be58bcfaf7439c5b118be45535a718efcd1467d37a74e` |
| Platform order | `linux/amd64`, then `linux/arm64` |
| Release state | `built`; no transition file; not revoked |

Exactly one `build:release-once` invocation for `c0d1e646...` emitted this subject. No successor was built after the V2 runtime dependency matrix.

## 5. Current retained release evidence

Root: `/tmp/cwt-s605-stage6-c0d1e646`

| Relative path | SHA-256 | Binding |
| --- | --- | --- |
| `release.json` | `e99efdd4e11a9fa123815b932cfe7625c709575a5ba238eb63c8dadf5071adb8` | release/source/index/children/evidence/retention; state `built` |
| `subject.oci/index.json` | `176619ea7ebaea01231c3af22cbc6eccb9189729067c16145b418871610f621d` | canonical OCI index descriptor |
| `subject.oci/oci-layout` | `18f0797eab35a4597c1e9624aa4f15fd91f6254e5538c1e0d193b2a95dd4acc6` | OCI layout version |
| `evidence/amd64.provenance.json` | `e0077ee3580a6ca3aa976dfa6d6998f48d7b342585d8b000c6349a30b7ca6a4e` | amd64 manifest/config/source |
| `evidence/amd64.sbom.spdx.json` | `e82e8a02d6c942de22a1a904843ef8374ef3d7d0129bf6920fbe6f313edcb938` | amd64 manifest; 439 packages |
| `evidence/amd64.scan.json` | `9f44ac7fabad694c3544fc71d3e9334e4ecaf43c0158e79f114cadf0fdc30028` | amd64 exact runtime/Sharp/package-manager checks |
| `evidence/arm64.provenance.json` | `57e9015c20e72f84e7fd92aa4dae787c8d6f80a7f342aa0e6415b47676870f5e` | arm64 manifest/config/source |
| `evidence/arm64.sbom.spdx.json` | `1fbe27b0f1fcee289e8327bbd6f55db1318547d46d2a29f72538840f6f0d5ad9` | arm64 manifest; 439 packages |
| `evidence/arm64.scan.json` | `5cc94240f2d0167dbddecbc7e955d628d84daebd7c234067df111f54914abfad` | arm64 exact runtime/Sharp/package-manager checks |
| `evidence/buildx-metadata.sanitized.json` | `e70ff2a9ac595d47627806b5c65fd783ccd834229d487bf5a870b1b26ac4967f` | sanitized build/index metadata |

Both scans bind the exact child manifest, package-manager rootfs/SPDX counts `0/0`, Sharp `0.35.3`, libvips `8.18.3`, closure-contained native files and successful executable 1×1 PNG decode. `externalVulnerabilityFeedClaimed` is `false`.

## 6. Retained closure generations

### 6.1 Historical Sharp/partial-runtime closure

| Relative path under `closure/` | SHA-256 |
| --- | --- |
| `S6-05_SHARP_STANDALONE_CLOSURE.md` | `f87352b2835186d9c6510a6f26be85caf5e6d925e414218d82e0f223c7368b7f` |
| `runtime-matrix.json` | `d55c0622d96d523c192cfe06da3eb2a8296f9e1dc587749fc5edfc6924d0ec73` |
| `SHA256SUMS` | `610a2b921e6b5cab5c9ea613bbc8dd7afed9d5211c1770343fc967f43f5e6054` |

The historical report's narrative package count `438` is not authoritative and differs from the retained exact SPDX/scan count `439`. Historical bytes remain unchanged; the principal report records the correction.

### 6.2 Real PostgreSQL/Valkey closure V2

| Relative path under `closure-v2/` | SHA-256 |
| --- | --- |
| `S6-05_RUNTIME_DEPENDENCY_CLOSURE_V2.md` | `08d13ccc45824a1b268268e6d104689531e0799e59d2756e1fa8fa1430ac84d5` |
| `run-runtime-dependency-matrix.mjs` | `491bb485cd7093f32349b2ce82708ae581c72b2c764f8a5ab81eaf1751e1a237` |
| `runtime-dependency-matrix-v2.json` | `3272ee4b5f25d49a3138aaaf91e791e4027b10f474e6b7208c2eb0eea33d59c4` |
| `SHA256SUMS` | `d51895b3e921d5ba3f30ad5a5221d7b478f064466672c4cac66063214a779984` |

The V2 result records no secret values, container IDs, host identity or private host paths. Its source bindings are:

| Authority | SHA-256 |
| --- | --- |
| PostgreSQL environment initializer | `fe6f028b4d26dc532616d7c3577f750034713e918a3ddb7e9676182698c7d684` |
| Valkey ACL entrypoint | `13e44c6184c1c0a5c098a1f91f3d06a0df7c9eb311ba58cabff3d01239f41c3e` |
| Valkey rate limiter/canary | `f57940826cb01e11031199d27adf117612c252532865824e34535e30a55c0513` |
| Readiness runtime | `e07b17c40b606ef23805065b496710f45ea27dd334f424c694d21d99bd6a3e7f` |

## 7. V2 runtime matrix

Pinned dependencies:

- PostgreSQL `18.4`: `postgres@sha256:882236b897e39051d2368c5ccc6cda944904723506b2dfc97f2a8f5bc9afa382`.
- Valkey `8.1.9`: `valkey/valkey@sha256:f0ba225266310efba5fb33383e21c64fbd07907304224786c780606e7ebd7327`.

| Case | Platform | Live | Ready | Exact failed checks |
| --- | --- | ---: | ---: | --- |
| `positive-amd64` | linux/amd64 | 200 | 200 | none; all five pass |
| `positive-arm64` | linux/arm64 | 200 | 200 | none; all five pass |
| `database-unavailable-arm64` | linux/arm64 | 200 | 503 | `database` only |
| `valkey-wrong-acl-arm64` | linux/arm64 | 200 | 503 | `valkey` only |
| `storage-missing-arm64` | linux/arm64 | 200 | 503 | `storage` only |

Isolation record: Docker internal network `true`; published ports `0`; Provider calls `0`; external runtime calls `0`; Synthetic protected configuration `true`; secret values recorded `false`.

Cleanup record: the three service/application container classes, internal network, PostgreSQL volume, loaded application tag and ephemeral secret workspace were all absent after the accepted run.

## 8. Principal source bindings

| Path | SHA-256 |
| --- | --- |
| `Dockerfile` | `6abe4092df8a271a0c0e4a35ece0e5acc367ccff9245a75d8b19eb0e4f71f783` |
| `compose.yaml` | `5777ded8d5a2c36af911be9d755bc3bd915d5747b084c245865697758a1db0b1` |
| `next.config.ts` | `754ca014d2294f6b350c492df8097a71433bff416b6c86bd73dbc814127dc85a` |
| `deploy/host/README.md` | `bb807d4d58afb8009b5344d73df899d3df64e60be691e999c387b081d26c2bb7` |
| `deploy/monitoring/journald-cwt.conf` | `51b1c2e1ec39b65ffa6d8e2808d57af4f69e38f5e57a3d767e463ff6f8072cd6` |
| `deploy/monitoring/monitoring-policy.v1.json` | `be9c69a5cbf66a354c31347c96b64f874a804c423b502ce5488dd5f25e06bc74` |
| `deploy/scripts/build-release-once.mjs` | `8dc86d2db65383eb7eb82d2795bd17e22f900b0aa9a0ac610b22f0c4a47bda5e` |
| `deploy/scripts/preflight-image.mjs` | `159cc7b7501fbc9044ff8964c5af47bfabe6f41b4cb52f272210c870462965ea` |
| `docs/OPERATIONS_RUNBOOK.md` | `856ce492dd513d36fd2b8c29855c05c837b2bce6aa227f962f0913b16a198783` |
| `scripts/check-work-health.ts` | `44df4bae5463b555dd737a126b492123c12c715d28375b32e6c5f20788fffbe2` |
| `scripts/process-ai-runs.ts` | `d5a7a1dbf20886acb2221d205e875fc0c09f9a9e1e4453ad1b8b278baf064c57` |
| `scripts/process-notification-outbox.ts` | `d29b2ebe398c9c2daebf935e5ae82a72cc198d44b1df6c6420ac5e89a65c3106` |
| `scripts/verify-ai-architecture.ts` | `47943a4c82708e95f0d653219292d16db27fdeb635ca0e02f9083b81afd69d65` |
| `src/operations/health.ts` | `ef3c3aade922c0aa965e9650d5d33a6057a054bb0180d3de8322a35d4661f56a` |
| `src/operations/readiness-runtime.ts` | `e07b17c40b606ef23805065b496710f45ea27dd334f424c694d21d99bd6a3e7f` |
| `src/operations/work-health.ts` | `e22138cf0f1d96ed81725cb3ffc8351553b4174f2a164858a98bc1d741d97707` |
| `src/operations/work-health-runtime.ts` | `8731eada408120edc36f65de01f1c2d6281512a4066f6346241973fc77791d70` |
| `src/operations/monitoring.ts` | `000c8c6496e8097aad6c9283e8beb1ef3f12b27dc01fe343f39acd4d8d383237` |
| `src/proxy.ts` | `b1020decd7b58fa954c5681feecd44e5f2ce8620a1ecad82c7028b4a8a7a2d9c` |
| `src/uploads/file-validation.ts` | `8327fbecc8e56a6c78198d553c4c7acaeed27db0c08805f1e9b6d42825107b0a` |
| `src/uploads/image-derivatives.ts` | `59091ee9ed11f038b9432dd07d6243d4f89662f991af83c4e1048af27a6094eb` |

The Git tree is the complete source authority; this table highlights the principal causal boundaries. There is no Schema or Migration path in the implementation delta.

## 9. Gate ledger and review stop conditions

| Gate | Result |
| --- | --- |
| Two prior exact subjects revoked | PASS; retained immutable markers |
| Current Build Once count | PASS; exactly one |
| Current exact release verifier | PASS; state `built` |
| amd64/arm64 Sharp closure and executable smoke | PASS / PASS |
| Runtime package-manager absence | PASS; rootfs/SPDX `0/0` on both children |
| AI Prompt/history | PASS; 24/24 |
| AI architecture/current authority | PASS |
| Lint / typecheck | PASS / PASS |
| Full Vitest | PASS; 165 passed, 11 skipped files; 1,260 passed, 85 skipped tests |
| Deployment tests | PASS; 34/34 |
| Production dependency audit | PASS; zero known vulnerabilities |
| Source build / public bundle | PASS / PASS |
| Real PostgreSQL/Valkey positive matrix | PASS on amd64 and arm64 |
| Selected arm64 dependency negatives | PASS; fixed single-component failures, live remains 200 |
| Provider/network action | NONE; internal local lab only |
| Cleanup | PASS; all disposable runtime resources/secrets absent |

Independent Review must stop on any ancestry/tree/hash mismatch, missing or altered revocation, release state other than `built`, unexpected transition, digest graph mismatch, evidence mismatch, readiness response outside the fixed contract, failed cleanup, secret/private identity leakage, external action, Schema/Migration delta, dual health/monitor/semaphore authority, revived old AI hash, or claim beyond this local/Synthetic ceiling.

## 10. Documentation closure scope

Exactly these four paths are authorized in the documentation-only closure:

```text
docs/PHASE_1B_STAGE6_S6_05_IMPLEMENTATION_REPORT_V1_0.md
docs/PHASE_1B_STAGE6_S6_05_IMPLEMENTATION_REPORT_V1_0.md.sha256
docs/PHASE_1B_STAGE6_S6_05_IMPLEMENTATION_EVIDENCE_MANIFEST_V1_0.md
docs/PHASE_1B_STAGE6_S6_05_IMPLEMENTATION_EVIDENCE_MANIFEST_V1_0.md.sha256
```

The sidecars bind the final Markdown bytes. Review should verify the sidecars, confirm the closure commit's sole parent is `c0d1e646e55f709cfed335db6ad8dfbf968cbc96`, confirm no other path changed, and independently rerun non-mutating identity/evidence checks.

Fresh independent security/test/operations Review is the next gate. **Stage 7 remains HOLD.**
