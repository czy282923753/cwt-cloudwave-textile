# CWT Phase 1B Stage 6 Pre-Development Implementation Plan Candidate V1.0

Status: **TECHNICAL LEAD CANDIDATE — independent planning Review required; not an implementation authorization or acceptance record**

Date: **2026-08-30**

Accepted starting commit: `a200838be34c8834a00bdcf6d1819da96e2ad26c`

Accepted starting tree: `00438c32997f9be7d753dfca8325c1765bd90146`

Accepted Stage 5 tag object: `ba8edc69623099a1c22d3be5c5b4fd72a2b1a988` (`refs/tags/phase-1b-stage5-approved-2026-08-30`)

Entry-gate recommendation: `docs/PHASE_1B_STAGE6_SCANNER_AND_SHARED_RATE_LIMITER_ENTRY_GATE_RECOMMENDATION_V1_0.md`

Owner authority delta: **Stage 6 only. After accepted Stage 6, stop. Stage 7 is HOLD and requires new explicit Owner authorization.**

## 1. Outcome and bounded scope

This Candidate freezes the smallest maintainable implementation path for the accepted single-host deployment and operations foundation. It is intentionally a modular-monolith deployment, not a distributed-system design.

The Candidate adds local, versioned runtime artifacts and validation hooks for:

- one immutable multi-stage CWT application image;
- one Docker Compose topology with always-on Production and an explicitly on-demand Staging profile;
- Nginx as the sole host HTTP ingress, PostgreSQL 18.4 on a private network, and isolated bind-mounted roots;
- Cloudmersive as the one Production/Staging `FileScanner` adapter and Valkey 8.1.9 as the one shared Rate Limiter authority per environment;
- bounded database pools, image/AI work, cgroups, logs and a 2 GB Swap runbook;
- liveness/readiness, redacted monitoring hooks and operator-visible work-health checks;
- daily local PostgreSQL backup, weekly encrypted COS backup preparation, corruption detection and an empty-environment restore path; and
- local/static evidence mapped to `O-01` through `O-25` and preparation for `X-05`/`X-06` without claiming their Stage 7 proof.

The implementation must not create or use an external account, credential or Provider connection; buy anything; mutate DNS, Cloudflare, COS, Sentry, Tencent, Staging or Production; Push or Deploy; use formal/Production data; Publish or enable Index. Real values remain absent. Local tests use Synthetic data, temporary roots, loopback-only services and fake transports.

### Explicit non-goals

- No Schema/Migration change, new business table, hot counter table, scan queue, lease, recovery type or durable proof framework.
- No managed database, Kubernetes, multi-host service, Cluster/Sentinel, replica, online COS media origin or local malware engine.
- No new application authority for Publish, Index, storage eligibility, Inquiry, Outbox, Asset scan persistence, recovery or Audit.
- No Stage 7 external validation or Stage 7 preparation that itself needs an account, credential, Provider call or protected-environment mutation.

If any implementation evidence makes a Schema/Migration or architecture change necessary, stop; do not add it to a slice. Return `NEEDS_OWNER_DECISION` with exact impact and a draft ADR.

## 2. Root-cause inventory and replacement ledger

The implementation is a convergence task. Each causal mismatch has one replacement, and the old live path is retired in the same slice.

| Current accepted path | Root problem | Exact replacement | Retirement requirement |
| --- | --- | --- | --- |
| `src/config/env.ts` requires `STORAGE_DRIVER=s3` and three buckets in Production. | This contradicts accepted ADR-0013 and the frozen local-origin volume contract. | Production/Staging require `local` with absolute, isolated, approved roots and startup probes. | Remove the S3 Production requirement. Keep the S3 adapter dormant for local/future compatibility only; it is not a Production/Staging fallback. |
| `HttpFileScanner` accepts a generic endpoint, raw bytes and a generic `{clean}` response. | No concrete Provider, response schema, timeout or privacy contract exists. | One Cloudmersive adapter behind the existing `FileScanner` interface. | Delete `HttpFileScanner` and the generic `http` driver after all callers/tests move. No shadow scanner. |
| `HttpUploadRateLimiter` delegates to an unnamed HTTP service; `MemoryUploadRateLimiter` is a possible runtime fallback. | There is no cross-process atomic authority or concrete outage contract. | One Valkey-backed neutral `SharedRateLimiter`; memory stays local/test-only. | Delete the generic HTTP implementation and Production/Staging fallback branch. Remove the upload-specific public singleton. |
| `src/uploads/request-guard.ts` and the login route derive client identity differently; login reads raw forwarding headers. | Spoofable and conflicting trusted-proxy authority. | One server-only `trusted-client-address` service consuming only the Nginx-attested internal header. | Delete direct reads of `CF-Connecting-IP`, `X-Forwarded-For` and `X-Real-IP` outside the service. |
| PostgreSQL application pool is hard-coded to `max: 10`. | Multiple processes can exceed the host connection budget. | Per-process `DATABASE_POOL_MAX`, with migration still `max: 1`. | Remove the hard-coded application pool value. Do not add another pool wrapper. |
| No image, Compose, proxy, health, backup or host-control artifacts exist. | The accepted operations boundary is not executable. | One `deploy/` tree plus root `Dockerfile`, `.dockerignore` and `compose.yaml`. | Do not add parallel Compose files for each environment; use profiles and environment-specific secret/config mounts. |

## 3. Frozen target topology

### 3.1 Service and network graph

`compose.yaml` is the only topology authority. It declares:

| Service | Runtime role | Published ports | Persistent writes | Network access |
| --- | --- | --- | --- | --- |
| `proxy` | Nginx TLS/origin ingress and trusted-client attestation | Host 80/443 only | None; read-only config/cert mounts | `edge`, `production-ingress`, optional `staging-ingress` |
| `web-production` | Next.js public/admin/API process | None | Production public/private/import bind mounts only | `production-ingress`, `production-backend` |
| `worker-production` | Existing AI run processor | None | No media root unless a proved current operation requires it | `production-backend` |
| `scheduler-production` | Standard Supercronic runner for existing one-shot Outbox, Cleanup and Retention commands plus ops scripts | None | Only the exact roots needed by each command | `production-backend` |
| `postgres` | PostgreSQL 18.4, one instance | None | `/srv/cwt/postgresql/data` | `database`; only approved app/ops services join |
| `valkey-production` | Production shared Rate Limiter | None | None; persistence disabled | `production-backend` only |
| `web-staging` | On-demand Staging Web | None | Staging roots only | `staging-ingress`, `staging-backend` |
| `worker-staging` | On-demand low-concurrency Staging worker | None | Staging-only required roots | `staging-backend` |
| `scheduler-staging` | On-demand Staging scheduler, disabled unless the rehearsal needs scheduled work | None | Staging-only required roots | `staging-backend` |
| `valkey-staging` | On-demand Staging Rate Limiter | None | None; persistence disabled | `staging-backend` only |

Rules:

1. `proxy`, Production services, `postgres` and `valkey-production` are the default Production profile. Every Staging service is in the explicit `staging` profile and normally stopped.
2. Only `proxy` publishes a host port. PostgreSQL, Web and Valkey never publish ports.
3. Production and Staging have different networks, database names/users, ACL users/passwords, application Secrets, media roots, logs and monitoring identities. `postgres` is the only shared service; it exposes no cross-grants.
4. Nginx receives a mounted, externally provisioned Cloudflare source-range file. A missing, empty or placeholder file refuses Production/Staging ingress. The repository contains only its schema, validator and a loopback lab fixture.
5. The app image is built once and selected by immutable digest/release ID for every role. The current image and one rollback image are retained; no build occurs on a live target.
6. Container root filesystems are read-only where the runtime permits; processes run non-root, use `no-new-privileges`, drop Linux capabilities, have bounded temporary filesystems and explicit health checks.

The implementation freezes these component versions; the reviewed implementation records the multi-architecture manifest digest or architecture-specific SHA-256 rather than using the tag alone:

| Component | Candidate pin | Reason/boundary |
| --- | --- | --- |
| Application build/runtime | Node `24.14.0`, pnpm `11.9.0`, Debian/glibc slim base | Exact accepted runtime; supports current native Next/Sharp/GLIDE packages. |
| Proxy | Official Nginx stable `1.30.4` image | One standard ingress; no third-party modules or floating `stable` tag. |
| Database | Official `postgres:18.4` image | Exact frozen database version; a minor-version change is a separate compatibility/backup review. |
| Shared Rate Limiter | Official `valkey/valkey:8.1.9` plus `@valkey/valkey-glide` `2.5.1` | Exact entry-gate selection. |
| Container scheduler | Supercronic `0.2.48` | Standard signal/log-aware crontab runner; no business state. |
| Encrypted backup client | Restic `0.19.1` | Current stable signed release used only behind the backup scripts. |

The deployment build supports `linux/amd64` and `linux/arm64`; it does not guess the eventual target architecture. The authorized target architecture must select a matching reviewed manifest before deployment. An unavailable or unverifiable version/digest blocks the slice rather than silently floating or upgrading.

### 3.2 Host bind-mount and secret contract

The accepted roots are used exactly:

| Context | Production | Staging |
| --- | --- | --- |
| Public originals/variants | `/srv/cwt/production/media/public` | `/srv/cwt/staging/media/public` |
| Private Inquiry files | `/srv/cwt/production/media/private-inquiries` | `/srv/cwt/staging/media/private-inquiries` |
| Internal Import/quarantine | `/srv/cwt/production/media/import` | `/srv/cwt/staging/media/import` |
| Application logs/evidence | `/srv/cwt/production/logs` | `/srv/cwt/staging/logs` |
| PostgreSQL data | `/srv/cwt/postgresql/data` bound to container `/var/lib/postgresql`, with `PGDATA=/var/lib/postgresql/18/docker` | Shared instance, different database/user only; PostgreSQL 18's versioned data layout is preserved |
| Local database dumps | `/srv/cwt/backups/postgresql` | Environment-prefixed sets, no cross-read by app services |
| Backup working sets | `/srv/cwt/backups/sets` | Environment-prefixed sets |
| Runtime config/secret custody | `/etc/cwt/production` | `/etc/cwt/staging` |

All media paths must be absolute, pairwise nonoverlapping, outside the image/Web serving tree, non-symlink roots with reviewed owner/group/mode, and writable only by the minimum service UID. Startup probes perform canonical-path, type, ownership, permissions, write/fsync/rename/delete and free-space checks using a disposable file. They never inspect or log payload content.

Docker secrets are mounted read-only under `/run/secrets`. Production/Staging require `*_FILE` inputs for database URL, session secret, SMTP password, Scanner API key, Valkey password, Sentry DSN, AI credentials, COS credentials and backup repository password. Literal secret variables are refused outside local/test. Secret-file paths and required names may be documented; values, hashes of values and existence evidence from a real host may not enter Git.

### 3.3 Bounded host budget

The following are implementation ceilings to be encoded in Compose; they are not target-host proof:

| Production component | Memory hard limit | Process/concurrency rule |
| --- | ---: | --- |
| Nginx proxy | 64 MiB | 1 worker on the 2-core target; bounded connections/body/header buffers |
| PostgreSQL 18.4 | 768 MiB | `max_connections=30`; conservative shared/work memory; private only |
| Production Web | 768 MiB | one container; image work semaphore 1 |
| Production AI Worker | 512 MiB | one process; accepted AI text concurrency 2; image concurrency 1 |
| Production Scheduler | 256 MiB | one job at a time per environment; overlap refused |
| Production Valkey | 128 MiB | `maxmemory 64mb`; `noeviction`; bounded clients/buffers |
| Host/Docker/headroom | about 1,600 MiB remaining from 4 GiB before on-demand Staging | 2 GiB Swap, alerts and no normal swap-thrash assumption |

Staging hard limits are Web 512 MiB, Worker 384 MiB, Scheduler 192 MiB and Valkey 128 MiB. The Staging start script must refuse when the resource preflight fails and must normally pause Production AI Worker/Scheduler during a bounded rehearsal. It does not stop Production Web/PostgreSQL/Valkey or weaken public safety. Actual steady-state, pressure, Swap and Staging coexistence results remain Stage 7 `O-03`–`O-05` proof and are HOLD.

### 3.4 Database connection budget

PostgreSQL uses `max_connections=30`. `DATABASE_POOL_MAX` is applied directly in `src/db/client.ts` per process:

| Process | Production | Staging |
| --- | ---: | ---: |
| Web | 6 | 2 |
| AI Worker | 2 | 1 |
| Scheduler/one-shot job | 1 | 1 |
| Migration | 1, only while deploy gate is closed | 1, only while deploy gate is closed |
| Backup | 1 total | No concurrent Staging backup |

The worst planned concurrent application/maintenance total is 14 without migration and 15 with one migration, leaving at least 15 connections for PostgreSQL internals, health/operator reserve and restart overlap. A deploy/migration gate prevents old/new Web pools, backup and migration from starting together. The existing Migration client remains `max: 1` and retains its accepted lock/Journal authority.

## 4. Ordered implementation slices

Every slice is a separate developer checkpoint. A slice may advance only after its own tests pass and an independent reviewer can identify the old path that it replaced.

### S6-01 — Runtime configuration, secret custody and local-origin convergence

| Field | Frozen slice contract |
| --- | --- |
| Scope/ownership | Modify `src/config/env.ts`, `src/config/env.test.ts`, `.env.example`, `src/db/client.ts`; add `src/config/secret-files.ts`, `src/config/secret-files.test.ts`, `src/storage/readiness.ts`, `src/storage/readiness.test.ts`. |
| Dependencies | Accepted ADR-0013/0014; exact roots in Owner Decisions; no Provider or Docker dependency. |
| Work | Replace the Production S3 assertion with required `local` roots; apply the same isolation/fail-closed rules to Staging; add `*_FILE`, `DATABASE_POOL_MAX`, exact Scanner/Rate Limiter driver enums and startup validation; add storage-root canonical/permission/write/free-space probes; make DB pool configurable. |
| Old path retired | Production S3/bucket requirement and hard-coded `max: 10`. S3 remains unreachable as a Production/Staging fallback. |
| Verification | Unit tests for Production/Staging valid/invalid matrices, literal-secret refusal, cross-environment/root overlap, symlink/non-directory/unwritable root, secret-path boundary and pool ranges. `pnpm env:check`, focused tests, lint/typecheck. No real secret file is read. |
| Acceptance preparation | `O-02`, `O-06`, `O-09`, `O-11`, `O-18`, `O-24`; ADR-0013/0014. |
| Rollback | Revert this slice as one commit before any deployment artifact consumes the new variables. No data change exists. |
| Stop conditions | Any Schema/Migration need; current storage interface cannot preserve local public/private/import isolation; secret values would have to enter Git. |
| Independent next gate | Configuration/storage boundary review; confirm S3 is not a live fallback and no root/secret can cross environments. |

### S6-02 — One trusted-client and shared Rate Limiter authority

| Field | Frozen slice contract |
| --- | --- |
| Scope/ownership | Add `src/security/trusted-client-address.ts` and tests; add `src/security/shared-rate-limiter.ts`, `src/security/valkey-rate-limiter.ts`, factory and tests; modify all current imports/callers in upload, login, conversion/analytics and Inquiry routes/services; modify `package.json`/`pnpm-lock.yaml`; delete `src/uploads/rate-limit.ts` after convergence. |
| Dependencies | S6-01 driver/secret contract; entry-gate recommendation. Pin `@valkey/valkey-glide` `2.5.1`; runtime image must be Debian/glibc compatible. |
| Work | Define typed `allowed`, `limited`, `unavailable`; implement one constant Lua fixed-window command; disable offline queue/unbounded retries; hash all identity material; normalize only Nginx's fixed internal header; deny upload/login and discard analytics/conversion when that attestation is absent or invalid; preserve 30 consumes/60 seconds and login network+account keys. |
| Old path retired | `HttpUploadRateLimiter`, Production/Staging memory fallback, upload-specific singleton, upload-only address helper and login's raw proxy-header read. A repository search must show no authority reads of the three public forwarding headers outside the new service/proxy tests. |
| Verification | Unit contract tests; local Valkey 8.1.9 integration with two independent Node processes; atomic boundary at 30/31; TTL reset; concurrent different actions; ACL denial; timeout/restart/OOM/noeviction maps to unavailable and denies; spoofed header matrix; login/upload/conversion use identical client authority. No Cloudflare call. |
| Acceptance preparation | `O-01`, `O-02`, `O-05`, `O-13`, `O-16`, `X-06`. |
| Rollback | Roll back app and client dependency together while retaining the same Valkey version. Production/Staging rollback may not select memory or generic HTTP. |
| Stop conditions | Need for PostgreSQL counters, Cluster/Sentinel, public Valkey port, dual limiter fallback or a second trusted-client authority; or the pinned GLIDE client cannot run on Node 24.14 and the selected deployment architecture. Do not substitute another client without revising/reviewing this entry gate. |
| Independent next gate | Security review of header attestation, hash inputs, atomic script, fail-closed behavior and replacement/deletion evidence. |

### S6-03 — Concrete fail-closed Cloudmersive Scanner adapter

| Field | Frozen slice contract |
| --- | --- |
| Scope/ownership | Retain the interface/types in `src/uploads/scanner.ts`; add `src/integrations/malware/cloudmersive-file-scanner.ts` and tests; modify scanner composition and existing upload/recovery scanner tests; delete the generic implementation. |
| Dependencies | S6-01 secret/driver contract; entry-gate recommendation. Use platform `fetch`/`FormData`; no SDK dependency. |
| Work | Fixed HTTPS origin plus `/virus/scan/file`; `Apikey` header; sanitized multipart filename; 60-second hard abort; redirects rejected; exact `CleanResult`/`FoundViruses` validation; safe provider/reference persistence; typed malware/unavailable mapping; concurrency remains 1. |
| Old path retired | `HttpFileScanner`, generic endpoint/token protocol and any Production/Staging development fallback. No payload shadow-send or two-provider voting. |
| Verification | Fake-server contract tests for clean, malware, disagreement, 401/403/429/5xx, redirect, invalid JSON/schema, DNS/connect/timeout and aborted response; assert zero payload/key logging and no release before persisted pass; existing local EICAR adapter remains local/test-only. Network egress is blocked and no Provider call occurs. |
| Acceptance preparation | `O-03`, `O-07`, `O-14`, `X-05`, upload/Asset invariants. |
| Rollback | Prior image may use the same Cloudmersive contract only. Provider outage leaves files quarantined; do not roll back to development/generic HTTP or edit scan state. |
| Stop conditions | Required asynchronous scan queue/table, whole-archive buffering, response contract change, unapproved region/account dependency or more than one live scanner. |
| Independent next gate | Upload/Asset security review of pre-release fail closure, persistence ordering, response parsing, logs and memory-copy budget. |

### S6-04 — Immutable image, Compose, proxy and host controls

| Field | Frozen slice contract |
| --- | --- |
| Scope/ownership | Add root `Dockerfile`, `.dockerignore`, `compose.yaml`; add `deploy/proxy/`, `deploy/postgres/`, `deploy/valkey/`, `deploy/schedule/`, `deploy/host/`, `deploy/scripts/preflight-*`; update `docs/ENVIRONMENT_AND_DEPLOYMENT.md` without rewriting accepted history. |
| Dependencies | S6-01 through S6-03 runtime contracts and the component-pin table in §3.1. All images and downloaded tools are pinned by digest/SHA-256 in the implementation commit. |
| Work | Multi-stage Node 24.14/pnpm 11.9 build; non-root read-only runtime; one Compose authority/profiles; exact networks/mounts/secrets/cgroups/health/restart policies; Nginx source-peer validation/internal header overwrite; private PostgreSQL; Valkey ACL/no persistence; Supercronic invokes existing one-shot jobs with overlap refusal; 2 GB Swap, firewall, Docker/journald and Staging headroom runbooks. |
| Old path retired | No parallel environment-specific Compose topology, no public Web/PostgreSQL/Valkey port and no raw forwarded-header trust. |
| Verification | `docker build`; SBOM and vulnerability/license scan with reviewed thresholds; `docker compose config --quiet`; static assertions for one published ingress, private DB/Valkey, unique roots/secrets/networks; Nginx config test; non-root/read-only/capability checks; loopback-only proxy spoof lab; default profile excludes Staging; Staging preflight refuses low headroom. No target host or DNS mutation. |
| Acceptance preparation | `O-01`–`O-05`, `O-09`–`O-13`, `O-15`–`O-18`, `E-06`, `E-11`, `X-06`. |
| Rollback | Keep one prior immutable image and previous validated Compose/config bundle. Bind roots are not deleted or renamed; proxy switch rolls back as one config/image selection. |
| Stop conditions | Any shared Secret/root/network, origin bypass, floating image/tool, root container, target-host build, direct Production mutation or inability to keep Staging normally stopped. |
| Independent next gate | Operations/security topology review plus reproducible local image/Compose evidence. |

### S6-05 — Health, monitoring hooks, bounded work and log retention

| Field | Frozen slice contract |
| --- | --- |
| Scope/ownership | Add `src/operations/health.ts`, `src/app/api/health/live/route.ts`, `src/app/api/health/ready/route.ts`, monitoring adapter/config and tests; modify image-work entry points only to reuse one process semaphore; add `deploy/monitoring/` templates and update `docs/OPERATIONS_RUNBOOK.md`. |
| Dependencies | S6-01 configuration/storage probes, S6-02 Valkey readiness, S6-04 topology. |
| Work | Liveness is process-only; readiness checks configuration, storage roots, database query, Valkey canary script and required local dependencies with strict timeouts. It does not call Cloudmersive/Sentry/AI/SMTP. Add redacted work-health probe for Outbox backlog/failure/dead work and backup completion; preserve AI concurrency 2 and image concurrency 1. Use Docker `journald`; host template bounds all system/container logs to 14 days and 4 GiB. |
| Old path retired | No duplicate health authority, unlimited image `Promise.all`, payload/error dumping or SMTP-only alert loop. |
| Verification | Unit/integration readiness failure matrix; health endpoint contains no topology/secret/PII; readiness goes false on DB/Valkey/root failure; scheduler exit codes expose dead/backlog outcomes; log-redaction tests; noisy-log rotation lab; monitoring fake transport asserts environment/release tags and scrubbed event. No Sentry/Tencent/uptime account or call. |
| Acceptance preparation | `O-03`, `O-07`, `O-08`, `O-10`–`O-14`, `O-25`, `X-07` preparation. |
| Rollback | Disable only the new external monitoring adapter while keeping safe local logs/readiness. Resource and concurrency guards cannot be disabled to restore service. |
| Stop conditions | Readiness consumes Provider quota, health exposes private data, alerting needs Zoho only, or concurrency requires new queue/schema. |
| Independent next gate | Security & Test Simplification assessment of checks, logs, backpressure and monitor independence. |

### S6-06 — Backup, corruption rejection, deploy gate and empty restore

| Field | Frozen slice contract |
| --- | --- |
| Scope/ownership | Add `deploy/backup/backup-postgresql`, `backup-weekly`, `verify-backup-set`, `retain-backups`, `restore-empty`, local test fixtures and manifests; add scheduler entries; update both deployment and operations documents. Scripts are narrow shell programs using standard `pg_dump`/`pg_restore`, SHA-256 and Restic, not an application framework. |
| Dependencies | S6-04 image/mounts, S6-05 health/work checks. Use PostgreSQL 18 client matching server major, Restic 0.19.1 and Supercronic 0.2.48 with architecture-specific SHA-256. |
| Work | Daily custom compressed dump to a temporary slot, fsync, checksum manifest, verify with `pg_restore --list`, then atomically create completion marker; retain exactly seven valid daily slots. Weekly set includes a verified DB dump, public originals, private Inquiry files, non-secret deployment config and permission/path manifest; excludes derivatives, temp/import working files, logs, secret values and encryption key. Restic encrypts and targets an environment-specific private COS repository only after future authorization; keep four valid weekly snapshots. Pre-deploy gate requires an extra valid completed backup. Restore always targets empty isolated Staging-safe roots and refuses Web/Worker start until safety/readiness checks pass. |
| Old path retired | No copy-only backup, success-before-checksum, deletion-before-verification, in-place Production restore or secret-in-archive path. |
| Verification | Temporary local PostgreSQL and local Restic repository only: success, truncated dump, missing file, checksum mismatch, absent completion marker, partial upload simulation, retention with corrupt newest/last-valid preservation, pre-deploy refusal, empty restore, forced noindex/analytics disabled/mail override, public/private authorization and derivative rebuild hooks. No COS call. |
| Acceptance preparation | `O-09`, `O-13`, `O-14`, `O-18`–`O-25`. |
| Rollback | Backup scripts/config roll back independently; never delete a completed set created by a newer version. Restore tooling refuses unknown manifest versions and preserves source backups. |
| Stop conditions | Backup requires secret export, cannot restore without Production access, deletes the last valid set, needs new database state/schema, or cannot preserve original/private isolation. |
| Independent next gate | Independent disaster-recovery review of completeness, corruption cases, retention, secret exclusion and safe restore mode. |

### S6-07 — Candidate closure and evidence

| Field | Frozen slice contract |
| --- | --- |
| Scope/ownership | Add one concise Stage 6 implementation report and adjacent hash; update accepted runbooks only where implementation facts changed; capture sanitized local command outputs under a bounded `docs/review-evidence/phase-1b-stage6-candidate-v1/` manifest if independent Review requires them. |
| Dependencies | S6-01 through S6-06 accepted locally. |
| Work | Run all relevant gates, prove no Migration delta, inventory exact files/images/digests, record limitations and map results to this plan. Evidence does not include secret values, host identities, formal data, Provider responses or Production claims. |
| Old path retired | Remove temporary duplicate validators/fixtures that are not runtime tests; do not retain a custom proof framework. |
| Verification | Full repository gate, image/Compose/security/static/backup suites, `git diff` scope review, secret/PII scan, `git status`, Migration Journal/schema identity and SHA-256 verification. |
| Acceptance preparation | All `O-01`–`O-25` local hooks, `X-05`/`X-06` preparation and Stage 6 exit decision. |
| Rollback | Candidate branch remains isolated until independently accepted; no tag/ref/baseline is rewritten. |
| Stop conditions | Hidden failure, unreviewed scope, dirty/untracked evidence, external action, false Stage 7 claim or missing reviewer separation. |
| Independent next gate | Independent Stage 6 implementation Review, remediation/re-review if needed, then Stage 6 acceptance/checkpoint. After accepted Stage 6: stop. |

## 5. Local verification gate

The implementer must provide deterministic local evidence for the following gate. Exact package-script names may be added in S6-01–S6-06, but they must compose standard tests/tools rather than create a parallel acceptance authority.

1. Environment: `pnpm env:check`; valid and invalid Production/Staging configuration tests; no literal secret or cross-environment path accepted.
2. Repository quality: `pnpm check`; `pnpm audit --prod`; targeted Stage 6 integration tests; existing upload, auth, analytics, storage, Outbox, cleanup, AI and Migration suites.
3. Schema: current Drizzle schema/Journal remains unchanged; `git diff` contains no `drizzle/` change and `pnpm db:generate` in a disposable copy yields no Migration.
4. Runtime: repeatable app image digest from identical inputs; SBOM/license/vulnerability record; non-root/read-only checks; no secret in image layers/history.
5. Topology: Compose config parses; only Nginx publishes; networks, volumes and secrets are isolated; Staging absent by default; all images pinned.
6. Security: forwarding-header spoof lab, cross-environment access denials, Cloudmersive fake contract, two-process Valkey atomic/outage test, no fallback paths and repository searches for retired direct authorities.
7. Capacity hooks: cgroup/pool/concurrency/log/swap/headroom settings are machine-checkable; local pressure tests show refusal paths. Results are design evidence only, not the 2 vCPU/4 GB target proof.
8. Recovery: local daily/weekly/extra backup, corruption/retention tests and an empty isolated restore using Synthetic data; restored mode cannot send formal mail, enable analytics/Index or start against Production roots.
9. Evidence: sanitized outputs, sidecar hashes, exact baseline/candidate identities and a clean Candidate tree.

External failures or missing external accounts are expected and must not be worked around. The Stage 6 local gate never sends a probe to Cloudmersive, COS, Sentry, Tencent, Cloudflare, Zoho or AI Providers.

## 6. Acceptance mapping without Stage 7 claims

Every row below remains `External Validation` in the accepted matrix. Stage 6 supplies only the named artifact or hook.

| ID | Stage 6 implementation artifact/hook | Proof explicitly deferred |
| --- | --- | --- |
| O-01 | Pinned image/Compose topology, health, restart, least privilege and root assertions. | Real target start/restart behavior. |
| O-02 | Separate networks, roots, Secrets, DB/users/grant bootstrap and cross-access lab. | Real Admin/provider/account and target isolation. |
| O-03 | Cgroup ceilings, bounded pools/work and local pressure harness. | 2 vCPU/4 GB steady-load measurement. |
| O-04 | 2 GB Swap creation/ownership/sysctl runbook and alert hooks. | Target Swap pressure behavior. |
| O-05 | On-demand profile, Production-heavy-work pause and headroom preflight refusal. | Target coexistence/load result. |
| O-06 | Exact pool budget, configurable clients and restart/deploy overlap gate. | Real PostgreSQL connection/load result. |
| O-07 | One image-work semaphore and backpressure/refusal tests. | Target decode/derivative load. |
| O-08 | Accepted AI text 2/image 1 settings and independent worker/process limits. | Real Provider/target AI load. |
| O-09 | Fixed mount inventory, disk categorizer and capacity preflight. | Measured 60 GB allocation. |
| O-10 | 70% category alert template and disk-growth report. | Independent real alert delivery. |
| O-11 | 80% bulk upload/import/AI-image/deploy refusal hooks that preserve Inquiry/read paths. | Real disk-full behavior/integrity. |
| O-12 | Journald 14-day/4 GiB host template and redaction/noisy-log lab. | Real 14-day retention under load. |
| O-13 | Tencent-compatible metric/threshold templates and independent-channel hook. | Account configuration and delivered alert. |
| O-14 | Outbox/dead-work/backup/health/Sentry checks, exit codes and non-SMTP alert hook. | Real Sentry/uptime/independent delivery. |
| O-15 | Nginx strict-peer/source-range/TLS config schema and origin-bypass lab. | DNS, Cloudflare, certificate, firewall and domain proof. |
| O-16 | One Nginx-attested internal header and shared normalizer/spoof tests. | Real Cloudflare peer/visitor IP proof. |
| O-17 | Existing application-controlled media route preserved; proxy template starts with no controlled-media caching. | Real CDN behavior. |
| O-18 | Bind-root relocation preflight/runbook with stable app paths/URLs and rollback. | Added-disk rehearsal. |
| O-19 | Atomic daily dump/checksum/completion/7-slot scripts and local tests. | Target schedule and independent failure alert. |
| O-20 | Encrypted Restic weekly-set script, exact include/exclude and four-snapshot policy. | COS account, upload, checksum and retention. |
| O-21 | Pre-deploy extra-backup gate and failure tests. | Real deployment enforcement. |
| O-22 | Corruption/incomplete rejection and last-valid preservation tests. | Real partial/corrupt remote object behavior. |
| O-23 | Empty isolated Synthetic restore script and validation hooks. | Complete protected-environment restore drill. |
| O-24 | Restore bootstrap hard-locks Staging/noindex/analytics-off/mail override before startup. | Real protected Staging validation. |
| O-25 | Versioned recovery runbook, timing fields and explicit unapproved recovery-objective placeholder. | Owner-approved objectives and measured target result. |
| X-05 | Exact Cloudmersive adapter, fake response/outage/malware contract and no-release tests. | Actual signature, Provider, region, quota and host-resource proof. |
| X-06 | Valkey two-process local atomic/outage/spoof tests and one-authority search. | Target multi-process/outage behavior. |

Related local invariants also cover `E-06` Staging noindex, `E-11` application-controlled media, and accepted upload/Asset, Audit, environment and privacy boundaries. No row is changed from its accepted matrix state.

## 7. Security & Test Simplification assessment

The implementer and independent reviewer must answer these questions with file-level evidence:

1. **Delete:** Were generic HTTP Scanner/Limiter implementations, direct forwarding-header reads and live Production/Staging fallbacks removed?
2. **Move:** Is the Rate Limiter now neutral/server-only rather than owned by Upload, and is trusted client identity owned once?
3. **Narrow:** Does each adapter expose only the commands/fields needed, with bounded time/memory/connections and redacted errors?
4. **Merge/reuse:** Do scheduler jobs call accepted one-shot commands, the Scanner reuse `FileScanner`, storage reuse `ObjectStorage`, and DB reuse the existing client/Migration authority?
5. **Standard components:** Are Nginx, Compose, PostgreSQL, Valkey, Supercronic, Restic, SHA-256 and journald used directly instead of custom daemons/protocols?
6. **No new persistence:** Is Valkey explicitly ephemeral and are there no new tables, queues, leases, recovery states or duplicate result stores?
7. **No proof inflation:** Are local fakes/static checks clearly separated from Provider/target/Production evidence and removed when redundant?
8. **Replace, not layer:** Can repository searches show exactly one Production/Staging Scanner, Rate Limiter, trusted-client address, topology and backup completion authority?

Any material “no” blocks the slice. Complexity is justified only by a frozen Stage 6 output or a directly mapped failure case.

## 8. Rollback and recovery boundary

- Each slice is independently revertible before deployment; no slice rewrites Git history, the accepted tag or Stage 5 lineage.
- Runtime rollback selects the immediately previous immutable image and the matching validated config bundle. It never changes database Schema, media identifiers or public URLs.
- One current and one rollback image are retained. Image cleanup cannot remove the current, rollback or image referenced by an incomplete deploy record.
- Media/config relocation keeps the old mount intact and read-only until checksum/readiness/rollback validation passes. It is never deleted by the deployment script.
- Scanner and Rate Limiter rollbacks retain the selected Provider/component contract. Development/memory/generic HTTP adapters are not emergency fallbacks.
- Backup tooling is forward-tolerant for known manifest versions, refuses unknown versions, and never modifies source backups during restore.
- If rollback cannot restore readiness without bypassing scanning, rate limiting, trusted proxy, storage separation or Staging safety, traffic remains closed and the coordinator is notified.

## 9. Stop and escalation conditions

Stop the affected implementation and callback immediately if any of these appears:

1. Schema/Migration or a new durable coordination authority is required.
2. Cloudmersive Basic cannot cover permitted payload/privacy/region needs, distinct environment credentials require materially different unapproved business terms, or the exact synchronous API contract changes.
3. The 4 GB design requires resident ClamAV, local AI, unbounded buffering, Cluster/Sentinel, another server or a second application.
4. Production and Staging would share a database/user, Secret, auth identity, media/log/backup root, Rate Limiter state, monitoring identity or real data.
5. Nginx cannot remain sole ingress, origin bypass cannot be denied, or any caller must trust raw forwarding headers.
6. Storage roots must enter the Web tree, overlap, follow symlinks or use COS as the initial live origin.
7. Scanner/Rate Limiter/monitoring/backup failure would fail open or be hidden as success.
8. Local proof would require a real account, credential, Provider call, DNS, Deploy or protected-environment mutation.
9. A Stage 7 claim/action is proposed without a new explicit Owner authorization.

Architecture-impacting findings require the exact affected scope, compatibility/rollback/Schema/SEO analysis and a draft ADR; no silent inclusion is permitted.

## 10. Developer/reviewer sequence and terminal boundary

1. Independent Stage 6 planning Review checks this Candidate, the entry-gate recommendation and evidence manifest against the exact accepted baseline.
2. If accepted under existing Stage 6 authority, a separate developer task implements S6-01 through S6-07 in order, with checkpoint evidence and no self-review.
3. A separate independent reviewer performs implementation, security, operations and Security & Test Simplification review. Material findings return to a separate remediation task and re-review.
4. The coordinator records Stage 6 acceptance/checkpoint only after all mandatory findings close and the Candidate tree is reproducible/clean.
5. **After accepted Stage 6, the coordinator and every worker stop. Owner authorization is required before Stage 7.**

This plan does not authorize its own implementation or acceptance and cannot be used as Stage 7 authority.
