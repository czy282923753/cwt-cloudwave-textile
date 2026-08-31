# CWT Phase 1B Stage 6 — S6-05 Implementation Report V1.0

Date: **2026-09-01**

Status: **LOCAL/SYNTHETIC IMPLEMENTATION EVIDENCE COMPLETE — fresh independent security/test/operations Review required**

Implementation subject: `41b5962744e9ea136da4a85fea03a97b26b518ed` through corrective release source `c0d1e646e55f709cfed335db6ad8dfbf968cbc96`, followed by one documentation-only closure.

Branch: `codex/phase-1b-stage6-option-f-implementation-v1`

Authority boundary: **S6-05 implementation and local/Synthetic verification only. The release remains `built`. No transition, Registry push, Provider/account action, protected Staging or Production deployment, credential use, DNS/traffic change, S6-06 implementation or Stage 7 action occurred. Stage 7 remains HOLD.**

## 1. Outcome

S6-05 now has one application health authority, one redacted work-health authority, one bounded image-work semaphore, one provider-neutral monitoring boundary and one host log-policy template. The exact corrected multi-architecture release passed a fully healthy readiness matrix against real pinned PostgreSQL and Valkey containers, plus three selected single-dependency failure cases.

This report is a developer evidence handoff, not self-acceptance. Fresh independent Review must inspect the complete linear correction chain, both revoked subjects, the current exact image graph and the retained closure evidence before accepting S6-05.

## 2. Exact lineage and three causal corrections

```text
0842443b61b42dc1a24f5902960cf97a0faf0121  accepted Option F documentation checkpoint
└── 41b5962744e9ea136da4a85fea03a97b26b518ed  S6-05 implementation
    └── f0096d5109000678efc5b65041375c4341151e1c  health proxy correction
        └── c0d1e646e55f709cfed335db6ad8dfbf968cbc96  Sharp standalone correction
            └── documentation-only S6-05 V1.0 closure
```

| Correction | Root cause | Causal correction | Lifecycle result |
| --- | --- | --- | --- |
| `41b59627...` | The prior Web healthcheck observed `robots.txt`; there was no fixed dependency readiness surface, redacted durable-work classification, bounded shared Sharp work, or enforceable log/monitor policy. | Added process-only liveness; fixed-component readiness; redacted Outbox/AI/backup work health; monitoring/log templates; one image-work semaphore; safe operational logging. | Its emitted subject exposed that the proxy performed redirect-database work before health routing. Subject revoked. |
| `f0096d51...` | Health requests were still intercepted by the public redirect lookup, so readiness inherited an unrelated database dependency before reaching its own fixed health contract. | The existing proxy now bypasses redirect lookup for the two exact health namespaces; no second health or redirect authority was introduced. | Its emitted arm64 child lacked the target `libvips-cpp.so.8.18.3` inside Next standalone. Subject revoked. |
| `c0d1e646...` | Next's standalone trace included Sharp's native addon path but omitted the pinned architecture-specific libvips shared object; package/SBOM presence did not prove executable closure. | Added only the pinned `@img/sharp-libvips-linux-*` `lib/**/*` trace include. The existing checker validates pnpm links, exact addon/libvips files, closure-contained realpaths and hashes, and executes a 1×1 PNG smoke at build time and in each exact loaded child. | Exactly one Build Once succeeded. Current subject remains `built`, unrevoked and untransitioned. |

The selected Sharp correction deliberately avoids `LD_LIBRARY_PATH`, host/system libvips, `/usr/lib` copying, startup wrappers, package flattening, Sharp/Next patches and broad unrelated `node_modules` inclusion.

## 3. S6-05 implementation boundary

### 3.1 Health and readiness

- `/api/health/live/` is process-only, always returns the fixed `{status: "live"}` contract when the process can serve, and performs no configuration, database, Valkey, storage or Provider check.
- `/api/health/ready/` is the sole application readiness authority. It checks protected configuration, the three approved local storage roots, one bounded database query, the accepted Valkey readiness canary and required local Node/Sharp dependencies.
- Each readiness component is bounded to 2 seconds. The response exposes only `ready`/`not_ready` and five fixed `pass`/`fail` states; both routes are `no-store` and `noindex, nofollow, noarchive`.
- Protected Production/Staging readiness requires PostgreSQL, local storage, Valkey, Cloudmersive mode, Cloudflare proxy mode and external monitoring mode. Readiness never calls Cloudmersive, Sentry, AI, SMTP, Tencent, uptime or another external Provider.
- Compose Web healthchecks now consume only the exact readiness route.

### 3.2 Work health, logging and monitoring

The redacted work-health hook classifies:

- Outbox backlog older than 30 minutes;
- repeated Outbox failure at two or more attempts;
- dead Outbox rows;
- terminal non-retryable AI work; and
- missing, invalid or older-than-26-hour daily database backup completion evidence.

It returns only fixed states, aggregate counts and the backlog-threshold boolean. Scheduler/one-shot exit `0` means healthy, `2` means observed operationally unhealthy work, and `1` means the probe itself was unavailable. An unhealthy observation never reverses or misreports an already committed business mutation.

Operational scripts no longer print raw caught error messages. The provider-neutral monitoring reporter accepts only fixed release/environment/severity/code identity and a small scrubbed attribute allowlist; transport failure is contained. No Provider adapter/account was configured or called.

Docker remains on the single `journald` path. The future host template specifies persistent compressed/sealed journals, maximum 14-day retention, maximum 4 GiB use, 1 GiB keep-free and one-day file segments. The template was tested locally but not installed on a host. Critical alerting requires an independent non-SMTP channel; SMTP-only alerting is prohibited.

### 3.3 Bounded image work and retained AI boundary

All Production Sharp decode validation and derivative entry points converge on one process-local semaphore: one active image operation and at most eight waiting operations. Capacity refusal is explicit backpressure; no queue, table, lease, worker or second image path was added.

Accepted AI text concurrency remains exactly two and independent of image work. S6-05 changed `scripts/process-ai-runs.ts` only to replace raw caught-error output with a fixed redacted message. `scripts/verify-ai-architecture.ts` updates the one current protected-authority hash for that exact successor (`d5a7a1dbf20886acb2221d205e875fc0c09f9a9e1e4453ad1b8b278baf064c57`). No AI Provider, Prompt, capability, queue, state transition, retry, pricing, concurrency or publication authority changed; the old hash is history, not a fallback.

### 3.4 Retention and rollback

Application retention execution remains the existing Inquiry-asset/upload-intent authority; S6-05 only redacts its terminal error output. Backup completion is observed, not created: until S6-06 creates valid environment-specific completion evidence, missing protected-environment backup evidence is correctly unhealthy and must not be fabricated.

The release record retains the accepted immutable-artifact contract: private Registry, deny overwrite, no early deletion, least-read audited access, a complete protected replica, and `NEW_RELEASE_REQUIRED` after total artifact/evidence loss. These are future external requirements, not locally proven controls. A revoked subject can never be made eligible by code rollback.

## 4. Revoked subject chronology

| Release | Tree | OCI index | Failure | Immutable revocation |
| --- | --- | --- | --- | --- |
| `41b5962744e9ea136da4a85fea03a97b26b518ed` | `2bbd74cff5999230b82c35543749c62df3cbab31` | `sha256:7e87834db55581f12db87d9cd8558a091e75f8a4f5e89c4c38083ed2e832a445` | Proxy redirect lookup intercepted health before the fixed health boundary. | `runtime_validation_failed`; marker SHA-256 `a845994d859f43d5672fd3ce62821c14147060bb29d78b6cdc3e02753c231d93`. |
| `f0096d5109000678efc5b65041375c4341151e1c` | `ab619699070eefa5e3efb9f3da44a9b06a5e5586` | `sha256:b1ca00024187a896cff240c011642db546a9c1ea9e91405e6b2d80bf81d97039` | arm64 Sharp addon could not load because standalone omitted `libvips-cpp.so.8.18.3`. | `runtime_validation_failed`; marker SHA-256 `5bfd50ca4c64f3e1c7656f070bb62096b099341c81697b0fffaff32688eb44c8`. |

Both old release roots, OCI layouts, detached evidence and markers remain retained and unchanged. They are not release candidates.

## 5. Current exact subject

| Item | Exact identity |
| --- | --- |
| Release source | `c0d1e646e55f709cfed335db6ad8dfbf968cbc96` |
| Sole parent | `f0096d5109000678efc5b65041375c4341151e1c` |
| Source tree | `4d7b3cf55d538206d9bb032617038eefb8f629ef` |
| Source archive SHA-256 | `d59707194d2ef94937d457d113c5fe4f867fc080db74659712c0a4976b97fade` |
| OCI index | `sha256:03e032006e4b2c8a819f6cce5a1425d57e4d34a11bd2e9939d8910d23ce8a867` |
| `linux/amd64` manifest / config | `sha256:91cda39ef658437ff8666b9f980b607a3c37f02927ff4cf955fcf540de2e0fa3` / `sha256:2c2dd0d635e83a8dd76bce8fb79ed8fa584a31258cab7ce3ed471bb41ffd278c` |
| `linux/arm64` manifest / config | `sha256:8d9f80d0e3bf688e301af06f68220e2fcfa15081a82bb4929a27466938e1bdcc` / `sha256:fe1a9fe5f4cc0a8ac62be58bcfaf7439c5b118be45535a718efcd1467d37a74e` |
| Release record | SHA-256 `e99efdd4e11a9fa123815b932cfe7625c709575a5ba238eb63c8dadf5071adb8`; state `built` |

Platform order is exactly `linux/amd64`, then `linux/arm64`. Both exact children passed package-manager absence, native Sharp closure inspection and an executable 1×1 PNG smoke. The exact SPDX and scan files record **439 packages on each child**. The earlier retained `closure/S6-05_SHARP_STANDALONE_CLOSURE.md` says 438; that is a non-authoritative narrative count error. The bound SPDX/scan files and this successor report carry the authoritative 439 count. No release/evidence bytes were rewritten to correct the narrative.

## 6. Isolated real-dependency runtime matrix

The accepted V2 lab used an internal Docker network, no published ports, Synthetic protected configuration, ephemeral file-backed secrets, exact local storage roots, user `10001:10001` and a read-only application root. No external network or Provider call occurred.

Service identities were pinned and already present locally:

- PostgreSQL `18.4`: `postgres@sha256:882236b897e39051d2368c5ccc6cda944904723506b2dfc97f2a8f5bc9afa382`; isolated `cwt_staging` database owned by the matching role, separate from bootstrap.
- Valkey `8.1.9`: `valkey/valkey@sha256:f0ba225266310efba5fb33383e21c64fbd07907304224786c780606e7ebd7327`; `cwt-staging` ACL, `cwt:staging:rate:` prefix, authenticated `PING` and the exact fixed-window-v1 `SCRIPT LOAD`/`EVALSHA` canary.

| Case | Exact child | Live | Ready | Configuration | Storage | Database | Valkey | Local dependencies |
| --- | --- | ---: | ---: | --- | --- | --- | --- | --- |
| Positive amd64 | `91cda39e...` | 200 | 200 | pass | pass | pass | pass | pass |
| Positive arm64 | `8d9f80d0...` | 200 | 200 | pass | pass | pass | pass | pass |
| Database unavailable arm64 | `8d9f80d0...` | 200 | 503 | pass | pass | **fail** | pass | pass |
| Wrong Valkey ACL credential arm64 | `8d9f80d0...` | 200 | 503 | pass | pass | pass | **fail** | pass |
| Missing import storage root arm64 | `8d9f80d0...` | 200 | 503 | pass | **fail** | pass | pass | pass |

All responses retained `Cache-Control: no-store` and `X-Robots-Tag: noindex, nofollow, noarchive`. The body contained only fixed states. After the run, all disposable containers, internal network, PostgreSQL volume, loaded application tag and ephemeral secret workspace were absent.

Two V2 harness attempts stopped before any application health assertion because the verifier initially used the wrong Docker multi-platform identity field/semantic. Docker exposed the index digest through container `.Image` and the selected child manifest through platform-aware image inspection. The harness was corrected to assert the exact child manifest, then all five cases ran and passed. These were harness identity errors, not candidate runtime failures. The prior V1 partial matrix's two pre-assertion `HOSTNAME` setup corrections also remain disclosed in the retained historical closure.

## 7. Verification ledger

| Gate | Result |
| --- | --- |
| Node runtime | PASS; `v24.14.0` |
| AI Prompt/history | PASS; 24/24 |
| AI architecture/current protected authority | PASS with pinned installed `node_modules` |
| ESLint / TypeScript | PASS / PASS |
| Full Vitest | PASS; 165 files passed, 11 skipped; 1,260 tests passed, 85 skipped |
| Deployment policy | PASS; 34/34 |
| Production dependency audit | PASS; zero known vulnerabilities |
| Exact source build / public bundle boundary | PASS / PASS |
| Dual-architecture Sharp disposable prototypes | PASS; removed |
| Build Once | PASS; exactly one invocation for `c0d1e646...` |
| Exact release verifier | PASS at `built`; no transition present |
| Exact-child SBOM/scan/provenance | PASS; 439 packages per child; external vulnerability feed not claimed |
| V1 partial runtime matrix | PASS for live/local-dependency/Sharp evidence; database intentionally unavailable |
| V2 real-dependency runtime matrix | PASS; 2 positive + 3 selected negative cases |
| Disposable resource/secret cleanup | PASS |

## 8. Compatibility, complexity and data boundaries

The implementation adds no Schema or Migration and changes no Product, Revision, Publish, Index, Route/Redirect ownership, SEO/URL contract, Inquiry/Contact/Organization relationship, public/private/import storage isolation, customer-data authority or business fact. No new persistent coordination, queue, lease, recovery state or external integration was added.

Complexity is bounded to fixed health/work classifiers, one in-process semaphore and stronger proof inside the existing release checker. The proxy fix removes an accidental dependency. The Sharp fix converges static closure inspection, build-time execution and exact-child execution on the same checker rather than adding a second proof path.

## 9. Claim ceiling, rollback and next gate

This local/Synthetic evidence does **not** prove or authorize:

- fresh independent implementation/security/test/operations acceptance;
- private immutable Registry custody, protected replica, audited least-read access or deny-overwrite/no-early-delete enforcement;
- external vulnerability-feed clearance;
- installation of journald policy or actual external monitoring/alert delivery;
- protected Staging/Production real secrets, host resources, Provider/account behavior, DNS or traffic;
- S6-06 backup creation/restore acceptance; or
- Stage 7 deployment or promotion.

Code rollback may select a prior development checkpoint but may not revive either revoked OCI index. Artifact rollback requires a separately accepted immutable graph and matching evidence. Loss of the current subject or required evidence requires a newly authorized release and a new Build Once; it may not be rebuilt under this release record.

Mandatory next gate: **fresh independent security/test/operations Review of this documentation closure, the full `41b59627... → f0096d51... → c0d1e646...` chain, both revoked subjects, the current exact image graph and both retained closure generations. Stage 7 remains HOLD.**
