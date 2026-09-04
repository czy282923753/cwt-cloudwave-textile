# CWT Phase 1B Stage 6 — Source and Documentation Authority Convergence Evidence Manifest V1.0

Date: **2026-09-05**

Status: **COMPLETE LOCAL EVIDENCE FOR RW-003 / TC-P1-001 AND RW-004 PLANNING ONLY — awaiting fresh independent Review; Stage 6 remains Partial / HOLD**

Principal report: [PHASE_1B_STAGE6_SOURCE_AND_DOCUMENTATION_AUTHORITY_CONVERGENCE_IMPLEMENTATION_REPORT_V1_0.md](./PHASE_1B_STAGE6_SOURCE_AND_DOCUMENTATION_AUTHORITY_CONVERGENCE_IMPLEMENTATION_REPORT_V1_0.md), SHA-256 `69b200240ae6d5cb24c01d6a65c0f03b2d4e21baeef9a7d35a0e23589a5e1191`

## 1. Identity and ancestry

| Evidence | Exact result |
| --- | --- |
| Accepted Stage 5 commit / tree | `a200838be34c8834a00bdcf6d1819da96e2ad26c` / `00438c32997f9be7d753dfca8325c1765bd90146` |
| Accepted annotated tag / object | `refs/tags/phase-1b-stage5-approved-2026-08-30` / `ba8edc69623099a1c22d3be5c5b4fd72a2b1a988` |
| Published Stage 6 inventory / tree | `506d92bf396bae52d7d8e54dabc46345036e4f86` / `d1e61ef09baccbb2229886a97394ec65156e7797` |
| Common post-inventory evidence commit | `aece565bc062ad47d6e92b4503c0e4c130c802bd` |
| Registration closure / tree | `acfec4182a41c4504a9b85cfaced517b60cd4ea7` / `0505cf4f3df69190506d6266f8d2008c3e33eaca` |
| Registration Review | `6307da3929b65099a89ffe2d47a33b29c4a52465`; `PASS`; non-ancestor |
| V1.8 evidence line / tree | `31b17ec04105334e64975900a09c8176ca26b717` / `2f08973449672c7ce081fa59d3cf29780e2d443d` |
| Integration merge / tree / parents | `933852b76677f03bad510a5ebc42f8cded62fadb` / `ffad0f4263d97fb633009887d248fd3e92636964` / `acfec4182a41c4504a9b85cfaced517b60cd4ea7 31b17ec04105334e64975900a09c8176ca26b717` |
| Implementation/documentation Candidate / tree / sole parent | `67f42e739a120253a4d0ef979550ea55fb0088d0` / `883fac551020273744fe65bde33255d574b3a544` / `933852b76677f03bad510a5ebc42f8cded62fadb` |
| Branch | local `codex/stage6-source-doc-authority-convergence-v1`; no Push or remote ref movement |
| Accepted Stage 6 ref | none |

Expected graph from the published inventory:

```text
506d92bf  published Stage 6 inventory
└── aece565b  common append-only V1.6 evidence
    ├── 49f4ab86 ── 3b211373 ── f26809ad ── acfec418  reviewed registration closure
    └── c9b1f377 ── 31b17ec0                         append-only V1.7/V1.8 evidence
                         ╲                               ╱
                          933852b7  exact two-parent integration merge
                          └── 67f42e73  TC-P1-001 documentation Candidate
```

## 2. Exact implementation/documentation Candidate path manifest

Comparison: `506d92bf396bae52d7d8e54dabc46345036e4f86..67f42e739a120253a4d0ef979550ea55fb0088d0` — **27 files, +1,439/-10**.

| Status | Mode | Git blob | SHA-256 | Path |
| --- | --- | --- | --- | --- |
| `M` | `100644` | `0e22111e7fca4dd2859a974ce950632be08c7400` | `41da623cffe4655670017d3181a7aecf53a999f06fe383df6a7fb59f89d8de84` | `deploy/host/README.md` |
| `A` | `100755` | `1281a207e5ebe58b7fb78900213a44ef26ad7e0a` | `7c773a341cfd629dae2985f7c51792aee6f917ca5df7733f7200d26e780da94b` | `deploy/runtime-validation/register-and-start-ephemeral-runner.sh` |
| `A` | `100644` | `5ab9405bc487d8cf74ab32c4daa9c1a51dfab759` | `3c65d0b05ae694885b7bb9c32ebed048758a3369bcf2d4637721506eaec448a1` | `deploy/runtime-validation/tencent-tat-runner-registration-invocation.v1.json` |
| `A` | `100644` | `af23836ffb4a46e3c1098d72c99e9f3f05f5b1cc` | `c64b12cf0e67deee07bc8e2f9f712fc94231d466fa35afb0ac68486bad05478e` | `deploy/scripts/register-and-start-ephemeral-runner.test.mjs` |
| `M` | `100644` | `910138add8e1e43053619d661e072f6171c09922` | `9c3b8733de7e9873fa936c99da1b2d19056429d1f4889c46f661c2f73d5f4363` | `docs/ENVIRONMENT_AND_DEPLOYMENT.md` |
| `M` | `100644` | `a32df2d24af567fc3dbf369b74c9cb24a627318a` | `3bf779be53c35b19985f6cab23b47eec007836ff9e14522e4116e8250db82122` | `docs/PHASE_1B_ACCEPTANCE_MATRIX.md` |
| `A` | `100644` | `856c29f8695eaa1298ea79372892822afaba62f8` | `d52ac15a811fd8d320e5e11611bcd3d69f35473cf78b1a6cc89861f0c7e554d4` | `docs/PHASE_1B_STAGE6_EPHEMERAL_RUNNER_REGISTRATION_TOKEN_LIFECYCLE_CORRECTION_EVIDENCE_MANIFEST_V1_0.md` |
| `A` | `100644` | `c56edfcf82d2998dc260a355fcd77288bc18a4ca` | `3319e2f35e30984a2bd1d395be7205f774470e723ff8b3cd87be8041c0e2e6d5` | `docs/PHASE_1B_STAGE6_EPHEMERAL_RUNNER_REGISTRATION_TOKEN_LIFECYCLE_CORRECTION_EVIDENCE_MANIFEST_V1_0.md.sha256` |
| `A` | `100644` | `1472f86b308ca02a67f93638b90da8a89b7ef7d0` | `3475832e5b59bbef7ba6272d777efe41e0137ed603dd4843197da699d1ad76a3` | `docs/PHASE_1B_STAGE6_EPHEMERAL_RUNNER_REGISTRATION_TOKEN_LIFECYCLE_CORRECTION_IMPLEMENTATION_REPORT_V1_0.md` |
| `A` | `100644` | `8c6b6241d64406220c7b18a80fb948ea92cc124d` | `1e8d808ed7a7978a3b546afbe3894b9a3c824bb01de384e0c09e45c5d9754b63` | `docs/PHASE_1B_STAGE6_EPHEMERAL_RUNNER_REGISTRATION_TOKEN_LIFECYCLE_CORRECTION_IMPLEMENTATION_REPORT_V1_0.md.sha256` |
| `A` | `100644` | `a720f90dcc548a18428d2b04e5eb122750746603` | `2e9f0faca297064684952d7506a016848b36942de4a1a60fa99755089ca7b731` | `docs/PHASE_1B_STAGE6_EPHEMERAL_RUNNER_REGISTRATION_TOKEN_LIFECYCLE_CORRECTION_REMEDIATION_EVIDENCE_MANIFEST_V1_1.md` |
| `A` | `100644` | `641bed3c2b445df18e9d6fbc89d7b075e111970e` | `f1237d19ee984747217443cb8ac5e76375a43976ff3df523986733f8d0930b59` | `docs/PHASE_1B_STAGE6_EPHEMERAL_RUNNER_REGISTRATION_TOKEN_LIFECYCLE_CORRECTION_REMEDIATION_EVIDENCE_MANIFEST_V1_1.md.sha256` |
| `A` | `100644` | `6ce7858ca050f133311c3186be4bd570836d156f` | `fb4b99c5314f3ebb43a3295220fa6d31e9110804fedd7d6afe7e8907cbbd2a89` | `docs/PHASE_1B_STAGE6_EPHEMERAL_RUNNER_REGISTRATION_TOKEN_LIFECYCLE_CORRECTION_REMEDIATION_IMPLEMENTATION_REPORT_V1_1.md` |
| `A` | `100644` | `4df52a3c6ba47ca1eeabfd246c972350202e7c6a` | `be8183978c56890247593de974cc06e3a76946ab15ae8d01582c5410b94a1a18` | `docs/PHASE_1B_STAGE6_EPHEMERAL_RUNNER_REGISTRATION_TOKEN_LIFECYCLE_CORRECTION_REMEDIATION_IMPLEMENTATION_REPORT_V1_1.md.sha256` |
| `A` | `100644` | `d06742a427058e8c48c73bd97a845e1ca75b6cb9` | `ef122e929b769b8e31fa00e7396b42d014efff4364d8efc20eb382206522bb4b` | `docs/PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_EVIDENCE_MANIFEST_V1_6.md` |
| `A` | `100644` | `0673255780eb5ccb11ffbb901eb12de8f3b7012d` | `6c621d8c386fc433c77ea3ba7b506fec90c366f792b1031991afe39225f8b8ae` | `docs/PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_EVIDENCE_MANIFEST_V1_6.md.sha256` |
| `A` | `100644` | `6c1e608093126ffeec0edf9d9fdc184b39291479` | `0af048332bcce410d4605a98ee026accce8caa4d36e89e36613cb23259016058` | `docs/PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_EVIDENCE_MANIFEST_V1_7.md` |
| `A` | `100644` | `bbddfe9d9402751f2ed04de1d349feadbce890e4` | `4357e521bf9492215cf5c4398b462312cb609b7f4b94f70811c64bf0e20c7814` | `docs/PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_EVIDENCE_MANIFEST_V1_7.md.sha256` |
| `A` | `100644` | `92cf75b4f8943cafaa415f8eef3f07f6e5f190e8` | `279ac925da16d487738de96ecdf541a4e0005efe27a97d5165f6508721b9e0fc` | `docs/PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_EVIDENCE_MANIFEST_V1_8.md` |
| `A` | `100644` | `095cdfeeb3b56555211de525050a8c76be814da0` | `fcce8e3dffde23edc6297dc2630cba3c51b418aa1bb454157960c211f7c6da1f` | `docs/PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_EVIDENCE_MANIFEST_V1_8.md.sha256` |
| `A` | `100644` | `580bde7b4e7759b70a669c8babda39337123374d` | `b2bb6d61f748c85ea19ad9fd7ceacfff4ebbc224746d0b556adb183a397dd0cd` | `docs/PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_REPORT_V1_6.md` |
| `A` | `100644` | `b659ecddfe88a2621d855489c2bc946cf00122df` | `273d230ba6d5ce761e60ee12f61f76ae84caeb6a7de626a95a6215b6ccc403db` | `docs/PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_REPORT_V1_6.md.sha256` |
| `A` | `100644` | `83ae00f97b9c630d266877e3381b4d02f89d1d2c` | `3d843c319ad74fe46807e2dd71e19b8ff99c095107042a663afe9b0948ffb9f8` | `docs/PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_REPORT_V1_7.md` |
| `A` | `100644` | `a9004a2aecdc9d3abd2a0879a16f40ff54347fab` | `06816118806d19180d741eb69b4ebedc1cdbc2543b9bff5e3a7c5edd4e5f5590` | `docs/PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_REPORT_V1_7.md.sha256` |
| `A` | `100644` | `0889a5c35c7797bbef6f38990627497df23bdf85` | `d0bfe757c7c8a8357dfd6b80e92db5d6a879dc4c71b38bcf35598c6bd3ccb26a` | `docs/PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_REPORT_V1_8.md` |
| `A` | `100644` | `30eae2c103ebdbff30ee357f884926b54c918fba` | `125bcf15de618b09b876a6fe40146265d21aa473957c3d42c880583ba32311b6` | `docs/PHASE_1B_STAGE6_REAL_BUILD_ONCE_GHCR_TENCENT_RUNTIME_VALIDATION_OPERATOR_REPORT_V1_8.md.sha256` |
| `M` | `100644` | `8f36be9a1bd0c23781218581aa824ea908aa67eb` | `e9839f464b970a888c49455e709f3ea8552856af5dde5b9e8f0607772f773e02` | `docs/PHASE_PLAN.md` |

The later evidence-only closure adds exactly this manifest, the principal report and their two adjacent sidecars. It does not change the 27-path Candidate above.

## 3. Source/evidence preservation checks

| Check | Exact result |
| --- | --- |
| `a200838b…` ancestor of `506d92bf…` | yes |
| `506d92bf…` ancestor of `acfec418…` and `31b17ec0…` | yes / yes |
| Either local tip ancestor of the other before convergence | no / no |
| Merge parents | exact first `acfec418…`, second `31b17ec0…` |
| Merge conflict or manual evidence edit | none |
| V1.8 report SHA-256 | `d0bfe757c7c8a8357dfd6b80e92db5d6a879dc4c71b38bcf35598c6bd3ccb26a` |
| V1.8 manifest SHA-256 | `279ac925da16d487738de96ecdf541a4e0005efe27a97d5165f6508721b9e0fc` |
| V1.6–V1.8 + registration report/manifest sidecars | `10/10 OK` |
| Registration Review `6307da39…` in Candidate ancestry | no |
| C-001 `FAIL`/successor `PASS` Review commits in Candidate ancestry | no for all four |
| Review-history interpretation | `aba7a1b8… FAIL → 025459b9… PASS`; `7693614d… FAIL → cce0aac6… PASS` |

## 4. TC-P1-001 evidence

| Document | Candidate Git blob / SHA-256 | Current authority result |
| --- | --- | --- |
| `docs/ENVIRONMENT_AND_DEPLOYMENT.md` | `910138add8e1e43053619d661e072f6171c09922` / `9c3b8733de7e9873fa936c99da1b2d19056429d1f4889c46f661c2f73d5f4363` | protected initial Staging/Production uses hardened local origin roots under ADR-0013 and `src/config/env.ts`; no S3/COS simultaneous origin fallback |
| `docs/PHASE_PLAN.md` | `8f36be9a1bd0c23781218581aa824ea908aa67eb` / `e9839f464b970a888c49455e709f3ea8552856af5dde5b9e8f0607772f773e02` | Stage 6 `Partial / HOLD`; Stage 5 latest accepted; no Stage 6 accepted ref; Production Ready `No`; formal data waiting |
| `docs/PHASE_1B_ACCEPTANCE_MATRIX.md` | `a32df2d24af567fc3dbf369b74c9cb24a627318a` / `3bf779be53c35b19985f6cab23b47eec007836ff9e14522e4116e8250db82122` | current header/chronology converged; historical Stage 4A evidence remains dated and unrewritten; later gates remain separate |

Accepted ADR-0013 and `src/config/env.ts` were read as authority and not modified. Old reports, old sidecars and append-only evidence were not rewritten.

## 5. RW-004 plan evidence and claim ceiling

Selected future mechanism: one byte-exact embedded payload in the existing TAT `RunCommand`, with pre-execution SHA-256, no GitHub/COS fetch and no fallback.

| Boundary | Exact planning result |
| --- | --- |
| Payload blob / SHA-256 / bytes | `1281a207e5ebe58b7fb78900213a44ef26ad7e0a` / `7c773a341cfd629dae2985f7c51792aee6f917ca5df7733f7200d26e780da94b` / `3752` |
| Inner Base64 size | `5004` bytes |
| Provider Content limit | Base64-encoded TAT `RunCommand.Content` at most `64KB`, per current official documentation |
| Reachability | authenticated Tencent TAT delivery to its agent; no source-fetch network path |
| Secret delta | none; short-lived registration token remains the existing hidden input; no PAT/GHCR/Tencent/COS/business/Stage/Production credential added |
| Implementation | not performed; exact wrapper/request bytes do not yet exist |
| External readiness | not complete; no VM before future exact Candidate receives fresh independent `PASS` |

This manifest does not claim RW-004 implementation, provider behavior, Runner registration or Runtime success.

## 6. Verification ledger

| Verification | Result |
| --- | --- |
| Read-only handoff sidecars | `4/4 OK` with exact instructed hashes |
| Git object types, commit trees, tag object/peel and refs | `PASS` |
| Candidate graph and excluded-ancestor assertions | `PASS` |
| Candidate path manifest and blob/SHA inventory | `PASS` |
| `git diff --check` | `PASS` |
| Local shell syntax | `/bin/bash -n`: `PASS`; `/usr/bin/bash` unavailable on Darwin and not claimed |
| Focused registration suite | `8 tests; 8 PASS; 0 fail/skip/cancel/todo` |
| Full deployment suite | `138 tests; 138 PASS; 0 fail/skip/cancel/todo` |
| ESLint | `PASS`, zero warnings |
| TypeScript | `PASS` |
| Schema/Migration path delta from published inventory | zero |
| Full Vitest / Next build / bundle / browser / dependency audit | not run; no proportional application or package delta |
| Live GitHub/Tencent/GHCR/VM/Runner/workflow | not run; unauthorized |

## 7. Mutation and acceptance ledger

| Boundary | Result |
| --- | --- |
| Owner dirty root checkout | read-only; no files modified or copied |
| Git Push / PR / remote branch or tag | `0 / 0 / 0` |
| New accepted Stage 6 checkpoint/tag | none |
| Credential/token acquisition or use | `0` |
| Registry / Build Once / artifact credentialed download | `0 / 0 / 0` |
| Tencent / VM / Runner / workflow dispatch | `0 / 0 / 0 / 0` |
| Provider / protected Staging / Production / DNS | untouched |
| Schema / Migration | unchanged |
| S6-06 / S6-07 / Stage 7 / Stage 8 | not started |
| Deploy / Publish / Index / formal data | not performed |

## 8. Terminal disposition

RW-003 and TC-P1-001 are implementer-complete and ready for independent Review. RW-004 is planning-complete only and remains non-executable. Stage 6 is `Partial / HOLD`; Stage 5 is the latest accepted/tagged baseline; Production Ready is `No`; formal Product/media remains `Waiting for Real Product Data Validation`.

Next gate: one separate fresh independent Review of the exact evidence-closure branch tip, including implementation Candidate `67f42e739a120253a4d0ef979550ea55fb0088d0`, this report/manifest/sidecars and the RW-004 plan. No external Runtime action follows automatically.
