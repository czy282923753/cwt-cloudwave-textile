# CWT Phase 1B Stage 6 — Option F Trusted CI Build Once Implementation Evidence Manifest V1.1

Date: **2026-08-31**

Status: **CORRECTED LOCAL/SYNTHETIC IMPLEMENTATION EVIDENCE — fresh independent implementation/security/operations Review required**

Principal report: `docs/PHASE_1B_STAGE6_OPTION_F_TRUSTED_CI_BUILD_ONCE_IMPLEMENTATION_REPORT_V1_1.md`

## 1. Subject and claim ceiling

The corrected Review subject is failed Candidate documentation closure `8944439a0d0d795358848a358b585a466be2500c` through corrected release source `7a63f4647b652857c3882f004a7bcb54b38cca5b`, followed by one documentation-only V1.1 closure containing this manifest, the principal report and their adjacent SHA-256 sidecars.

Failed independent Review commit `4475313dacf5177f848a0a49264cc4311e2089e5` was consulted read-only and remains a sibling/non-ancestor. The remediation implements only F-01 and F-02. Evidence is local and Synthetic; it does not approve the Candidate or authorize any external/protected action, S6-05, S6-06 or Stage 7.

## 2. Exact lineage and remediation delta

```text
fedc9ee804ad2073a75e08966df140ff8bea0bf7  failed release source
└── 8944439a0d0d795358848a358b585a466be2500c  failed Candidate V1.0 documentation closure
    └── 7a63f4647b652857c3882f004a7bcb54b38cca5b  corrected F-01/F-02 release source
        └── documentation-only V1.1 evidence closure

4475313dacf5177f848a0a49264cc4311e2089e5  failed independent Review (sibling/non-ancestor)
```

Corrected release source tree: `0f1039b232c744a7eefaa63f6a7deff89715094e`.

Changed implementation paths from `8944439...` to `7a63f464...`:

```text
M Dockerfile
M compose.yaml
M deploy/host/README.md
M deploy/scripts/build-release-once.mjs
M deploy/scripts/preflight-compose-graph.mjs
M deploy/scripts/preflight-compose-graph.test.mjs
M deploy/scripts/preflight-image.mjs
M deploy/scripts/preflight-image.test.mjs
M src/config/env.test.ts
M src/config/env.ts
```

Pre-documentation remediation diffstat: **10 paths; 298 insertions; 51 deletions**. No V1.0 document, schema, migration, database, Product, SEO/URL, storage or external-action path changed.

## 3. Failed-subject revocation evidence

| Item | Exact value |
| --- | --- |
| Failed source | `fedc9ee804ad2073a75e08966df140ff8bea0bf7` |
| Failed tree | `88e85e8b9eddaa76ba0bbac2835a32aa91ee22b6` |
| Failed index | `sha256:ba865c03cf91c06cda171eccac38ce96012853a0dc3c57e7aeed80cd67d5973b` |
| Marker path | `/tmp/cwt-option-f-stage6-fedc9ee8/revoked/ba865c03cf91c06cda171eccac38ce96012853a0dc3c57e7aeed80cd67d5973b.json` |
| Marker SHA-256 | `2cc53dc0df992d2b69f2de69cbbbebd068b384eca4edd17e560e8e1f146b87e0` |
| Reason | `post_emission_gate_failed` |

The corrected verifier refuses the failed subject independently because the actual child rootfs/SPDX inventory contains Yarn. The marker adds immutable revocation. Verification loss returns exit `78` and `NEW_RELEASE_REQUIRED`; the old subject/evidence remains retained and unchanged.

## 4. Corrected OCI subject

| Platform/item | Digest |
| --- | --- |
| OCI index | `sha256:9af936d47ab8a037e95f52b389a9f31cb80866de3044087476638b9ec1f45162` |
| `linux/amd64` manifest | `sha256:9d5bdf87605138884632b4697848f8551b2f2069cfc0a66946bf9340168bcbe4` |
| `linux/amd64` config | `sha256:2808ee7bb5bea793950a6380f48a100701be09aa57c98f7223c2c66c1293aa50` |
| `linux/arm64` manifest | `sha256:56dd5f0b6e26e49e08ea9ddfb996109806902c03d8ca18f5bdb798e0e916d323` |
| `linux/arm64` config | `sha256:5933b165619b20db797e9f09446ea9a7084b742793881a19f770d8dc079d19bb` |

Platform order is exactly `linux/amd64`, then `linux/arm64`. Selected local host-validation child is `linux/arm64`. Release ID is `7a63f4647b652857c3882f004a7bcb54b38cca5b`; source archive SHA-256 is `832c2959244a3a865eb22c88c29a22f8bfb5ccb15dedbe64ad08e15e7132ddfb`.

Exactly one new `pnpm build:release-once -- --output /tmp/cwt-option-f-stage6-7a63f464` invocation produced this subject and exited `0`. No second successor was built.

## 5. Detached corrected-subject evidence

Local evidence root: `/tmp/cwt-option-f-stage6-7a63f464`

| Evidence path under root | SHA-256 | Bound subject |
| --- | --- | --- |
| `release.json` | `eda565b46afaf1ba93437d84c6c12cd00d4dc9e152b7b68bccfe85ca5cdf4275` | index and both ordered children |
| `evidence/amd64.provenance.json` | `e214d5f931585e806c3bad8e0c19c9b9d2f18348fd25e4a079bde3c308a7b074` | amd64 manifest |
| `evidence/amd64.sbom.spdx.json` | `eb026318f2815966f3ec48872572f49f75366f82305ef5397e7132c897126303` | amd64 manifest |
| `evidence/amd64.scan.json` | `19e46ec4419b0259f4c4ff32aa2c9209eb73e6e9f1b64263659d800da822b78c` | amd64 manifest |
| `evidence/arm64.provenance.json` | `14f2f5356ac13e819eafd7c059bd65008a3e8e9aaf1f0c5308a407d3fb802b7c` | arm64 manifest |
| `evidence/arm64.sbom.spdx.json` | `82e331766a0b71e34ea539441e9efee2091c8ea07c040f8b0b2d9677e2be11f9` | arm64 manifest |
| `evidence/arm64.scan.json` | `e6e6b7c42af1f6688348283da35d668e8b515e197e9c2aff80b6f7c532f3d3e4` | arm64 manifest |
| `evidence/buildx-metadata.sanitized.json` | `f4d4a02fd649ceec710c0a3b92e9ea860fd08d1a4627e01307f2b89387011978` | emitted index/build metadata |
| `transitions/001-staging-validated.json` | `870d9a421a54cc24423b28e3a651d5c1fb6a1256b3a6c590f314efe4891c5d4d` | `built -> staging_validated` |
| `transitions/002-promotion-authorized.json` | `eea071b02bbd709610b346533c66a0386ef1f43e82c05f0fadc75c0cf08d1687` | `staging_validated -> promotion_authorized` |

Transition 2 binds the SHA-256 of transition 1. Both transitions bind the same index and selected child. The verifier derives `promotion_authorized` without mutating `release.json`.

For both platforms, the scan binds the exact manifest, SPDX package count `439` and independently derived package-manager evidence `{status: pass, rootfsMatchCount: 0, sbomMatchCount: 0}`. `externalVulnerabilityFeedClaimed` is `false`.

Framework evidence remains schema-only: Next `16.2.12`; Preview lengths `32/64/64`; Server Actions key length `44`; Node action count `87`; Edge action count `0`. Values and hashes are excluded.

## 6. Principal corrected source identities

| Path | SHA-256 |
| --- | --- |
| `Dockerfile` | `14a3e5fe1bf4662858c8a064708336d7180b8bbb4b177d7bfdcbe3195c5176bd` |
| `compose.yaml` | `ad61d358725d979f757ae1883bb83d88ba5826b5a552aefc5b68034eaa66243e` |
| `deploy/host/README.md` | `93b1d48045526f6ee38235a65a38c1f807a43cf4832381158186ed49456876cf` |
| `deploy/scripts/build-release-once.mjs` | `303a71277b59d3d34ec649fe4806f18b3caa904376a7fc5092db4e796a8e7ecc` |
| `deploy/scripts/preflight-image.mjs` | `22dac8ef7004e33b38737c504fb803f77fcce228f11490886678d3e0db89b63d` |
| `deploy/scripts/preflight-image.test.mjs` | `59e2fc719fd759997e772fa096292a718ed0b98b2fdf5cdc74b4b31fe4123d45` |
| `deploy/scripts/preflight-compose-graph.mjs` | `0e9f10817f2772ba56687b8b8050df5f6290de5c9ae1a9c20bb6726bd43b86b9` |
| `deploy/scripts/preflight-compose-graph.test.mjs` | `7fed61c7ec60e32023d2eb6e487e2e5320403010a7a630eef7f094c8e7486119` |
| `src/config/env.ts` | `e809cac071866e649a2246edf515c9c69783cc7736f8c1e20afea3fdc81a5df3` |
| `src/config/env.test.ts` | `8c607ce4213cd612284e43be72b806074e9a94e78409ef82d71ef86b6eeffcc8` |

## 7. F-01/F-02 proof inventory

| Review requirement | Corrected evidence |
| --- | --- |
| Delete Yarn executable/module surfaces | Dockerfile removal plus exact-path absence assertions; both emitted children probed directly |
| Derive instead of caller-written pass | OCI overlay-aware rootfs extraction + SPDX inventory; producer and verifier use same declared inventory |
| Refuse rootfs Yarn | Real tar fixture mutation test |
| Refuse backing module | Real tar fixture mutation test |
| Refuse bound SPDX Yarn | SPDX mutation test |
| Refuse forged pass | Scan-field forgery test while subject bytes remain prohibited |
| Add COS access-key-ID subjects | Exact Production/Staging top-level files, mappings and grants in root Compose |
| Exact one-to-one closure | Parser tuple list equals checker list; 10 classes × 2 environments |
| Missing/cross-environment negatives | Compose/config mutation tests reject definition, mapping and grant drift |
| Protected direct roles | Production/Staging Web, Worker and Scheduler parsers all PASS with normalized role-only Synthetic inputs |

## 8. Gate ledger

| Gate | Exact evidence/result |
| --- | --- |
| Old revocation / rejection / loss | PASS / PASS / exit `78`, `NEW_RELEASE_REQUIRED` |
| New Build Once | PASS; exactly one invocation, builder exit 0 |
| Release verification/lifecycle | PASS; built → staging_validated → promotion_authorized |
| Runtime pins and package-manager absence | PASS on amd64 and arm64; derived rootfs/SPDX counts `0/0` |
| Compose graph and secret closure | PASS; 10 services, 23 top-level secrets, exact arithmetic and role mappings |
| Six protected parser roles | PASS; exact normalized environment and mounted Synthetic secrets |
| Runtime Web policies | PASS; Production indexable; Staging/Preview noindex; HSTS/CSP; cross-Origin rejected |
| Worker fail-closed/graceful stop | PASS; refusal paths exit 1 without leaks; graceful SIGTERM exit 0 |
| One-shots/scheduler/overlap | PASS; three exits 0, scheduler exit 0, collision exit 75 |
| Nginx | PASS; real syntax test under declared restrictions |
| Deployment tests | PASS; 27/27 |
| Focused protected env/secret tests | PASS; 11/11 |
| Lint / typecheck | PASS / PASS |
| AI Prompt/history | PASS; direct verifier and 24/24 tests |
| AI architecture | PASS; `ok: true` on exact corrected release source |
| Full Vitest | PASS; 155 files passed, 11 skipped; 1,221 passed, 85 skipped |
| Exact-release Next build / public bundle | PASS / PASS; all routes dynamic; 392 server JS, 20 manifests, 15 chunks |

Temporary runtime-lab assertion/input corrections are disclosed in the principal report. They did not change committed source, OCI bytes, detached evidence or accepted gate outcomes and are not classified as post-emission Candidate failures.

## 9. Review reproduction and stop conditions

Independent Review should begin with:

```text
git rev-parse 7a63f4647b652857c3882f004a7bcb54b38cca5b^{tree}
git diff --name-status 8944439a0d0d795358848a358b585a466be2500c..7a63f4647b652857c3882f004a7bcb54b38cca5b
git merge-base --is-ancestor 4475313dacf5177f848a0a49264cc4311e2089e5 7a63f4647b652857c3882f004a7bcb54b38cca5b
node deploy/scripts/preflight-image.mjs verify \
  --release /tmp/cwt-option-f-stage6-7a63f464/release.json \
  --oci /tmp/cwt-option-f-stage6-7a63f464/subject.oci \
  --state promotion_authorized
```

The ancestry command must exit `1`; the other identity/verifier commands must pass. Review must stop on any source/tree/evidence mismatch, missing or replaced transition/revocation marker, package-manager rootfs/SPDX match, caller-written evidence authority, incomplete/cross-environment secret closure, framework value/hash leak, tag-only authority, or claim beyond the local/Synthetic ceiling.

Target Linux, external Registry/replica/audit, external vulnerability feed, protected Staging/Production, Provider/account/credential and DNS/traffic evidence remain mandatory future work. Next gate is a **fresh independent implementation/security/operations Review**. **S6-05, S6-06 and Stage 7 remain HOLD.**
