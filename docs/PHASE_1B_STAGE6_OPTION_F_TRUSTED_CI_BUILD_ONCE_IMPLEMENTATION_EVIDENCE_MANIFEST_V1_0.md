# CWT Phase 1B Stage 6 — Option F Trusted CI Build Once Implementation Evidence Manifest V1.0

Date: **2026-08-31**

Status: **LOCAL/SYNTHETIC IMPLEMENTATION EVIDENCE — independent implementation/security/operations Review required**

Principal report: `docs/PHASE_1B_STAGE6_OPTION_F_TRUSTED_CI_BUILD_ONCE_IMPLEMENTATION_REPORT_V1_0.md`

## 1. Subject and claim ceiling

The review subject is the code range from accepted planning baseline `96659bfb7cd722af09c293cdfe270cbf84efdaa8` through release source `fedc9ee804ad2073a75e08966df140ff8bea0bf7`, followed by one documentation-only closure containing this manifest, the principal report and their SHA-256 sidecars.

Evidence is local and Synthetic. It does not approve the implementation, select or configure a Registry/Provider, authorize a push, access protected Staging/Production, deploy, change DNS/traffic, use a real credential or authorize Stage 7.

## 2. Exact lineage

```text
96659bfb7cd722af09c293cdfe270cbf84efdaa8  accepted Option F planning baseline
└── f33301d78e9bf4902b9967361ad46c7eb591c584  initial Option F implementation
    ├── 85476652  hash dependency symlinks without traversal
    ├── 670204b4  stream dependency bundles as tar archives
    ├── 41d9c4b2  bundle pnpm for isolated builds
    ├── 44b37285  bound dependency download retries
    ├── aed2e148  trust the verified lockfile offline
    ├── 6b4fba07  create runtime dependencies offline
    ├── 4c90dba3  retry complete dependency downloads
    ├── 727b1325  scan exact child images locally
    ├── b8186ad5  compare OCI timestamps by epoch
    ├── 4129b4b1  close Worker database on shutdown
    ├── 368d45e0  preserve Worker shutdown window
    └── fedc9ee804ad2073a75e08966df140ff8bea0bf7  keep proxy temporary files on tmpfs
        └── documentation-only evidence closure
```

Release source tree: `88e85e8b9eddaa76ba0bbac2835a32aa91ee22b6`.

The implementation commits after the baseline are all ancestors of the exact release source. Planning/review sibling branches do not become runtime authority through this manifest.

## 3. Changed-path inventory before documentation closure

```text
A .dockerignore
A Dockerfile
A compose.yaml
A deploy/host/README.md
A deploy/host/cwt-tmpfiles.conf
A deploy/host/docker.socket.d/cwt-root-only.conf
A deploy/postgres/init-environments.sh
A deploy/proxy/cloudflare-ranges.lab.conf
A deploy/proxy/nginx.conf
A deploy/schedule/production.crontab
A deploy/schedule/run-one-at-a-time.sh
A deploy/schedule/staging.crontab
A deploy/scripts/build-release-once.mjs
A deploy/scripts/preflight-compose-graph.mjs
A deploy/scripts/preflight-compose-graph.test.mjs
A deploy/scripts/preflight-image.mjs
A deploy/scripts/preflight-image.test.mjs
A deploy/scripts/preflight-proxy-config.mjs
A deploy/scripts/preflight-proxy-ranges.mjs
A deploy/scripts/preflight-proxy.test.mjs
A deploy/scripts/preflight-staging.sh
A deploy/scripts/preflight-staging.test.mjs
A deploy/valkey/entrypoint.sh
M docs/ENVIRONMENT_AND_DEPLOYMENT.md
M docs/OPERATIONS_RUNBOOK.md
M next.config.ts
M package.json
M pnpm-lock.yaml
M scripts/enforce-retention.ts
M scripts/process-ai-runs.ts
M scripts/process-notification-outbox.ts
M scripts/process-object-cleanup.ts
M scripts/verify-ai-architecture.ts
M src/admin/stage2-editor-boundaries.static.test.ts
M src/app/layout.tsx
M src/app/robots.ts
M src/app/sitemap.ts
A src/proxy.test.ts
M src/proxy.ts
A src/security/option-f-framework-isolation.test.ts
M src/seo/nonproduction-indexing.test.ts
M src/server/ai/phase-d-provider-composition.ts
M test-fixtures/ai-architecture/graph-faults.phase-d.synthetic-only.v1_0.json
```

Pre-documentation diffstat: **43 paths; 1,762 insertions; 131 deletions**. No path under `src/db`, `drizzle` or `migrations` changed.

## 4. Exact OCI subject

| Platform/item | Digest |
| --- | --- |
| OCI index | `sha256:ba865c03cf91c06cda171eccac38ce96012853a0dc3c57e7aeed80cd67d5973b` |
| `linux/amd64` manifest | `sha256:46bf145ab7bc20b32227b47377400b53cb5890363d013338dc58a67c453f24d3` |
| `linux/amd64` config | `sha256:be8ef5f3fa93db094241a94b7e7caa81de1ded7df37ffc2fd2c86906af097135` |
| `linux/arm64` manifest | `sha256:5ba1af2bc4e85b8e85d9fdf45b7eff200aa5f9e6d5b184c3cc3dc4889401b87c` |
| `linux/arm64` config | `sha256:1999e32eebc87aaba590bb0bcc3b17df560c2b878639f87725ff799ac39d6bdc` |

Platform order is exactly `linux/amd64`, then `linux/arm64`. The selected local host-validation child is `linux/arm64`. Complete layer descriptors, diff IDs, history-entry counts and timestamp facts are inside the immutable release record and are intentionally not duplicated here.

## 5. Detached accepted-subject evidence

Local evidence root: `/tmp/cwt-option-f-stage6-fedc9ee8`

| Evidence path under root | SHA-256 | Bound subject |
| --- | --- | --- |
| `release.json` | `d540c4bb5bec9975cf20460baf879e85d18632e7eb4de7eca0abe74b0704b16f` | index and both ordered children |
| `evidence/amd64.provenance.json` | `b6698465c755ff8f31b3c36708aafa73fa6467e454c3f068131c258564216bfd` | amd64 manifest |
| `evidence/amd64.sbom.spdx.json` | `385302de188763467cfaa5065adeab94851cfbbeb86b93ae5c4f6aba52e38c20` | amd64 manifest |
| `evidence/amd64.scan.json` | `9e27641aa12860471e106e4d55d993344137444204ecbb2a082c2c78a6642928` | amd64 manifest |
| `evidence/arm64.provenance.json` | `cab5e89e671b2225daa5f9362d559f62cfcbc8ba5eb940b4c577f36b66fc6653` | arm64 manifest |
| `evidence/arm64.sbom.spdx.json` | `db46f2ffd1db9c00dc61949956d423e3720a14258aaf47756b115caa4fb36215` | arm64 manifest |
| `evidence/arm64.scan.json` | `dd596ccd5c3713cdc6eaa71d2aff69fbc0924ee82d7191567b4b9302b999e67c` | arm64 manifest |
| `evidence/buildx-metadata.sanitized.json` | `0136479ad10f3e248fcdf770dfc93c4e54b4a7f074e1a3ee23e7029815bbe569` | emitted index/build metadata |
| `transitions/001-staging-validated.json` | `43fa21872eb937913e6c416675f05f3382627f8ece9b581f67e604bd59c55a04` | `built -> staging_validated` |
| `transitions/002-promotion-authorized.json` | `f7776b48db8de9a45a35897074a7f59ca780b5bcd761078c6c4ba42a09445e5f` | `staging_validated -> promotion_authorized` |

The second transition binds the SHA-256 of the first transition. Both transitions bind the same index and selected child. The release verifier derives `promotion_authorized` without mutating `release.json`.

Framework evidence contains only the following schema facts for each platform: Next `16.2.12`; Preview lengths `32/64/64`; Server Actions encryption-key length `44`; Node action count `87`; Edge action count `0`. Framework values and their hashes are excluded.

## 6. Revoked-subject evidence

| Release source | Revoked index | Marker path | Marker SHA-256 | Reason |
| --- | --- | --- | --- | --- |
| `4c90dba334ed7eb9d632ab373efe6f8a3fa85dca` | `sha256:9260fd258e08359d503588fa3c8d3b6d1fe0782cf9afa6dd4a269ee6969bf2f9` | `/tmp/cwt-option-f-stage6-4c90dba3/revoked/9260fd258e08359d503588fa3c8d3b6d1fe0782cf9afa6dd4a269ee6969bf2f9.json` | `707c44822953d9486154127908a6aa1b6bd2c64ba4348a1bb2472422b45321d7` | `post_emission_gate_failed` |
| `727b1325e76404011cf07052c95e47b20119140a` | `sha256:48a0a426116389c257d8c95d67c59f35df63d423b44b3949149cedf24774f337` | `/tmp/cwt-option-f-stage6-727b1325/revoked/48a0a426116389c257d8c95d67c59f35df63d423b44b3949149cedf24774f337.json` | `6bd9fd92ab185da6cf9e791a0d68d00df8bd2c9d61f8519196cee2c4000bac40` | `post_emission_gate_failed` |
| `b8186ad547f858c3a336e3ced6491aed82270095` | `sha256:2e83d4a5bd4ff4a88be531d4c9187c4df8f3f334b48321418d4bcbe6c9988880` | `/tmp/cwt-option-f-stage6-b8186ad5/revoked/2e83d4a5bd4ff4a88be531d4c9187c4df8f3f334b48321418d4bcbe6c9988880.json` | `018c7105d5a6a7afa725ad0b22b82764aef9282ddd23dd4988ed9fa6241fa168` | `runtime_validation_failed` |
| `4129b4b1f98623dee4f8e5f619cd3557b6129571` | `sha256:52e466c2d19c9dbf4b51231424436b5983c76ad80fc080bdfac82b4fcc903adb` | `/tmp/cwt-option-f-stage6-4129b4b1/revoked/52e466c2d19c9dbf4b51231424436b5983c76ad80fc080bdfac82b4fcc903adb.json` | `09cd6abd6b97b593c2a157d2a5eb256cc373f1a60a8e4220e748a04acc166e26` | `runtime_validation_failed` |
| `368d45e090c71b401e22bcaebe99fdfb141e23a1` | `sha256:29439552a54fad78ecf1cf98fff23efd694b4c1cf62bd1c0fc51ad9aedc46c69` | `/tmp/cwt-option-f-stage6-368d45e0/revoked/29439552a54fad78ecf1cf98fff23efd694b4c1cf62bd1c0fc51ad9aedc46c69.json` | `a41e003ea2ddd668f8c2dc8d37bd0f0e4915c3b937d96a31081b71bc2ba32bb3` | `runtime_validation_failed` |

These markers are immutable. Verification of any listed index fails; none may be used as rollback or fallback.

## 7. Principal source-file identities at release source

| Path | SHA-256 |
| --- | --- |
| `Dockerfile` | `c0e2a5fce615e572c08218ada50e32d4374ea336fc1b1e5da49fad3a0a31d3a3` |
| `.dockerignore` | `cfbd07c72106f47195630372b559e6b7426c3c3de448276d322427d0bbc0159f` |
| `compose.yaml` | `7c6913d2883ac0d8875ed51c4e00569750665ed04c0dc3d114b87e5595d34c2d` |
| `package.json` | `6abc2d9288551a4f4fbb37a49985c15c1c673f884b60f3ff680fda938a03ea0d` |
| `next.config.ts` | `63ebea4124ac01c9267c56240757201ef31c044e56c0b9a919442748864ed627` |
| `src/proxy.ts` | `e276345ce8361f5051662a57af0ba6bb6d079e9636853f2484968ecaaf962aef` |
| `scripts/process-ai-runs.ts` | `3594eb1acbbeae01637c3a45c2941be9ce195c8e1401c20a93cfcb42a4653c09` |
| `src/server/ai/phase-d-provider-composition.ts` | `c8c7c09b9a308f3a5128ef1a3723b5c0b06ecc32bd58740af4daaab1a72263ab` |
| `deploy/scripts/build-release-once.mjs` | `7f34688b66e9ef7365f0151b6f2f4f18107da5232eacbccb62a8e9fb45ba87a0` |
| `deploy/scripts/preflight-image.mjs` | `f3878fe250da0e030cd179f8103927cff3a8e7be5e851639ebd79fa3f57c8616` |
| `deploy/scripts/preflight-compose-graph.mjs` | `e55c93bcf93c5f1faaed2c0f2150303efe89869777039c3bb0c8d990d0e584a1` |
| `deploy/scripts/preflight-staging.sh` | `65465c47d25b7cefdb9f23cf796168f0cacb44a638a71658a0f9dfa30a84d738` |
| `deploy/scripts/preflight-proxy-config.mjs` | `2194e7bbf7ab94b6881278bea3f346d3c67a066f4ec80bcc83e268d34536afd3` |
| `deploy/proxy/nginx.conf` | `ed9ebd99f134ab9b364724f412f557dd35bdfa621047ebb57385303c60b61203` |
| `deploy/schedule/run-one-at-a-time.sh` | `9d1b70c166a5a0786f495891825c70ee21d8866020350c6845ce69d9979cc571` |
| `scripts/verify-ai-architecture.ts` | `f90d74b967177247cf89069c4859c775822dafad6a4079fa3599c2984e79f093` |
| `test-fixtures/ai-architecture/graph-faults.phase-d.synthetic-only.v1_0.json` | `0affb8039548f79cadc4180570317e84ef484744de7e5c10119d2675700d2c40` |

## 8. Gate ledger

| Gate | Exact evidence/result |
| --- | --- |
| Release build | PASS; one emitted OCI index, builder exit 0 |
| Release verification | PASS in `built`, `staging_validated`, then `promotion_authorized` derived states |
| Substitution/revocation negatives | PASS through 18/18 deployment tests |
| Runtime pins | PASS on amd64 and arm64; Node/Next/tsx/GLIDE/Supercronic exact, package managers absent |
| Runtime Web policies | PASS; Production indexable, Staging/Preview noindex, HSTS/CSP, cross-Origin rejection |
| Runtime Worker fail-closed | PASS; Production, disabled Staging and disconnected Staging exit 1 with no secret leak |
| Runtime Worker graceful stop | PASS; exit 0 after 20 seconds within 30-second grace |
| One-shots and scheduler | PASS; three zero-work exits 0, overlap exit 75, scheduler SIGTERM exit 0 |
| Nginx | PASS; real syntax test as UID 101, read-only, cap-drop, bounded tmpfs |
| Compose graph | PASS; 10 services; exact profile/network/resource arithmetic |
| Lint / typecheck | PASS / PASS |
| Deployment tests | PASS; 18/18 |
| AI Prompt/history | PASS; direct verifier and 24/24 tests |
| AI architecture | PASS; `ok: true` on exact release source |
| Full Vitest | PASS; 155 files passed, 11 skipped; 1221 passed, 85 skipped |
| Next production build | PASS; exact release ID, Next `16.2.12`, all routes dynamic |
| Public bundle | PASS; 392 eligible server JS, 20 public manifests, 15 distinct public chunks |

## 9. Review reproduction and stop conditions

Independent Review should begin by verifying:

```text
git rev-parse fedc9ee804ad2073a75e08966df140ff8bea0bf7^{tree}
git diff --name-status 96659bfb7cd722af09c293cdfe270cbf84efdaa8..fedc9ee804ad2073a75e08966df140ff8bea0bf7
node deploy/scripts/preflight-image.mjs verify \
  --release /tmp/cwt-option-f-stage6-fedc9ee8/release.json \
  --oci /tmp/cwt-option-f-stage6-fedc9ee8/subject.oci \
  --state promotion_authorized
```

Review must stop on any source/tree mismatch, changed evidence hash, missing OCI descriptor, wrong architecture child, mutable/replaced transition, secret or framework value/hash disclosure, eligible revoked subject, tag-only authority, F-01–F-05 regression, or claim beyond the local/Synthetic ceiling.

The macOS implementation host cannot reproduce the protected Linux host's absolute static-shell locations or Linux `/proc/meminfo` gate. Before any external activation, an authorized target Linux host must pass the protected pre-start/post-start lifecycle with the exact accepted digest, final environment isolation and retained evidence. Registry immutability/replica/audit and external vulnerability-feed clearance also remain unproved.

Next gate: **separate independent implementation/security/operations Review. Stage 7 remains HOLD.**
