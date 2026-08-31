# CWT Phase 1B Stage 6 — Option F Trusted CI Build Once Implementation Report V1.0

Date: **2026-08-31**

Status: **IMPLEMENTATION CANDIDATE COMPLETE — separate independent implementation/security/operations Review required**

Implementation baseline: `96659bfb7cd722af09c293cdfe270cbf84efdaa8`

Release source commit: `fedc9ee804ad2073a75e08966df140ff8bea0bf7`

Release source tree: `88e85e8b9eddaa76ba0bbac2835a32aa91ee22b6`

Branch: `codex/phase-1b-stage6-option-f-implementation-v1`

Authority boundary: **Stage 6 local/Synthetic implementation only. No Registry push, Provider selection, protected Staging or Production deployment, DNS/traffic change, Production credential use, or Stage 7 action occurred. Stage 7 remains HOLD.**

## 1. Outcome

The selected Option F contract is implemented as one trusted, no-cache, dual-architecture Buildx build that emits one exact OCI index. The emitted subject is verified by its index, child manifest, child config, layers, source identity, tool pins and detached evidence. Runtime validation used the emitted child bytes, after which the immutable transition chain reached `staging_validated` and then `promotion_authorized` for the same index and the host-selected `linux/arm64` child.

`promotion_authorized` is a local evidence state. It is not proof of a Registry copy, target-host entry, protected Staging validation or Production promotion.

The final exact subject is:

| Identity | Exact value |
| --- | --- |
| Release ID / source commit | `fedc9ee804ad2073a75e08966df140ff8bea0bf7` |
| Source tree | `88e85e8b9eddaa76ba0bbac2835a32aa91ee22b6` |
| Source archive SHA-256 | `c35044f14ebdf2da911afb68368b6db3b8455d80f41a6f9afe7b426f635a5305` |
| OCI index | `sha256:ba865c03cf91c06cda171eccac38ce96012853a0dc3c57e7aeed80cd67d5973b` |
| `linux/amd64` manifest | `sha256:46bf145ab7bc20b32227b47377400b53cb5890363d013338dc58a67c453f24d3` |
| `linux/amd64` config | `sha256:be8ef5f3fa93db094241a94b7e7caa81de1ded7df37ffc2fd2c86906af097135` |
| `linux/arm64` manifest | `sha256:5ba1af2bc4e85b8e85d9fdf45b7eff200aa5f9e6d5b184c3cc3dc4889401b87c` |
| `linux/arm64` config | `sha256:1999e32eebc87aaba590bb0bcc3b17df560c2b878639f87725ff799ac39d6bdc` |
| Selected local validation child | `linux/arm64` / `sha256:5ba1af2bc4e85b8e85d9fdf45b7eff200aa5f9e6d5b184c3cc3dc4889401b87c` |
| Derived state | `promotion_authorized` |

The release record remains immutable with its emitted `state: built`; state advancement is represented only by append-only transition records. A tag was used only as a disposable local runtime handle and never as identity or authority.

## 2. Implemented architecture

### 2.1 OF-01 — source/runtime convergence

- `CWT_RELEASE_ID` is the full 40-character source commit and is the exact Next build ID.
- Environment-dependent URL, HSTS, CSP, noindex and robots behavior is resolved at runtime rather than frozen into one environment-specific image.
- Production returns an indexable robots policy; Staging returns `Disallow: /` and `X-Robots-Tag: noindex, nofollow` from the same image subject.
- Preview responses remain private/no-store and noindex. Cross-Origin Server Action requests remain rejected.

### 2.2 OF-02 — one build authority

- `deploy/scripts/build-release-once.mjs` is the single repository build/release entry.
- It requires a clean committed source, an empty output location and a previously unused release identity.
- Two platform-specific dependency acquisitions produce hash-checked tar inputs. One final ordered `linux/amd64,linux/arm64` Buildx invocation consumes them.
- The final build is no-cache. Dependency install, production-dependency convergence and the Next build use `--network=none`; no runtime credential is accepted as a build input.
- Dockerfile frontend, Node base, Node, pnpm, Next, tsx and Supercronic are pinned. Supercronic binaries are platform-specific and checksum-verified before use.
- The OCI output is written once. Evidence is generated against the exact emitted children, not a later reconstruction.

### 2.3 OF-03 — runtime artifact and direct roles

- Runtime identity is UID:GID `10001:10001`, Node `24.14.0`, Next `16.2.12`, tsx `4.23.1`, GLIDE `2.5.1` and Supercronic `0.2.48`.
- npm, npx, Corepack, pnpm launchers and pnpm installation metadata are absent from the runtime image.
- Web, Worker, scheduler and one-shot commands execute directly through Node/tsx or Supercronic; runtime package-manager execution is absent.
- AI Worker signal ownership is explicit. Shutdown stops the Worker and closes its database connection; Compose grants a 30-second graceful-stop window.
- Notification outbox, object cleanup and retention commands use explicit async entry/error handling and close database resources.
- Scheduler overlap uses one environment-specific `/tmp` lock and exits `75` on collision.

### 2.4 OF-04 — topology and protected entry

- Compose has the exact ten-service graph: five default services, four `staging` services and one dormant `production-ai` Worker.
- Production Worker remains profile-only, restart `no`; every other long-lived service keeps `unless-stopped`.
- Production and Staging application/database/backend/ingress networks remain disjoint except for explicitly shared infrastructure placement.
- Exact memory arithmetic is enforced: default `1,984 MiB`, Staging `1,216 MiB`, combined `3,200 MiB`, and minimum Staging-start availability `1,408 MiB`.
- The Staging entry remains one zero-argument, static-shell lifecycle with a single FD9 `flock`; the protected pre/post graph checker refuses drift.
- All application services use immutable digest labels, read-only roots, bounded tmpfs, capability drop, `no-new-privileges`, PID limits and explicit signal behavior.
- Nginx runs as UID `101`, read-only and capability-dropped. Every configured client/proxy/FastCGI/uWSGI/SCGI temporary path is under the bounded `/tmp` mount.

### 2.5 OF-05 — exact evidence and lifecycle checker

- `deploy/scripts/preflight-image.mjs` validates exact keys and exact identities for source, index, ordered children, configs, layers, diff IDs, release labels, time bounds, tool pins, evidence subjects and retention assertions.
- It rejects tag-only identity, wrong platform order, index/child/config substitution, stale or leaking evidence, framework-schema drift, illegal transitions and any revoked subject.
- The only legal path is `built -> staging_validated -> promotion_authorized`. A missing complete release returns exit `78` with `NEW_RELEASE_REQUIRED`.
- Revocation records are exclusive/immutable and make later verification or promotion fail closed.

### 2.6 OF-06 — framework-material isolation

- The narrow accepted shared-image exception contains only Next `16.2.12` build-generated Preview/Draft and Server Actions material.
- Evidence records only schema facts: Preview lengths `32/64/64`, Server Actions encryption-key length `44`, Node action count `87`, Edge action count `0`. Values and hashes are absent from Git, reports and callbacks.
- Runtime environment-private authentication/session, database, Valkey, scanner, SMTP, AI, storage, monitoring and backup inputs remain file-injected and outside image history/config/layers and detached public evidence.
- Host/Origin enforcement, host-only secure cookie custody, current-user/role/record-scoped authorization and Draft/Review/Publish/Index boundaries remain independent of the shared framework material.

### 2.7 OF-07 — AI architecture gate maintenance

- Deployment checkers were classified only through the existing exact-file `other-project-tooling` authority.
- The accepted implementation includes one narrow planning deviation: the build entry `deploy/scripts/build-release-once.mjs` also required exact-file classification because the full accepted AI gate enumerates executable project tooling. No wildcard, directory-wide classification, Production AI authority, Provider reachability or capability exception was added.
- The sealed graph-fault fixture and integrity expectations were updated together; the full architecture gate passes on the release source commit.

### 2.8 OF-08 — detached evidence, retention and loss

- Each child has digest-bound detached SPDX SBOM, local policy scan and sanitized provenance records.
- Local scans prove the pinned runtime package inventory, runtime package-manager absence, zero business-secret matches and zero framework value/hash evidence matches.
- No external vulnerability-feed result is claimed. The local policy record explicitly says `externalVulnerabilityFeedClaimed: false`.
- The future external contract remains private immutable Registry custody, no overwrite/early deletion, least-privilege audited reads and one complete protected replica. These are encoded requirements, not claims of an activated Registry.
- Total retained-copy/evidence loss has one disposition: create a newly authorized source/release and repeat the full path. Same-digest reconstruction is not promised.

## 3. Exact failure and revocation chronology

Five post-emission subjects failed implementation-time gates. Each was immediately revoked and never reused. This history is retained as evidence of fail-closed convergence, not as accepted release material.

| Release source | OCI index | Revocation reason | Causal defect corrected in successor source |
| --- | --- | --- | --- |
| `4c90dba334ed7eb9d632ab373efe6f8a3fa85dca` | `sha256:9260fd258e08359d503588fa3c8d3b6d1fe0782cf9afa6dd4a269ee6969bf2f9` | `post_emission_gate_failed` | Local scan loaded an image by architecture but did not bind analysis tightly enough to the exact child manifest. |
| `727b1325e76404011cf07052c95e47b20119140a` | `sha256:48a0a426116389c257d8c95d67c59f35df63d423b44b3949149cedf24774f337` | `post_emission_gate_failed` | OCI timestamps were compared as strings rather than parsed epochs. |
| `b8186ad547f858c3a336e3ced6491aed82270095` | `sha256:2e83d4a5bd4ff4a88be531d4c9187c4df8f3f334b48321418d4bcbe6c9988880` | `runtime_validation_failed` | AI Worker shutdown did not close the database connection. |
| `4129b4b1f98623dee4f8e5f619cd3557b6129571` | `sha256:52e466c2d19c9dbf4b51231424436b5983c76ad80fc080bdfac82b4fcc903adb` | `runtime_validation_failed` | Compose's former 10-second stop window was shorter than the Worker drain contract. |
| `368d45e090c71b401e22bcaebe99fdfb141e23a1` | `sha256:29439552a54fad78ecf1cf98fff23efd694b4c1cf62bd1c0fc51ad9aedc46c69` | `runtime_validation_failed` | Read-only Nginx lacked bounded tmpfs paths for FastCGI/uWSGI/SCGI temporary files. |

No revoked index is an accepted fallback. A later fix created a new source identity and a new one-build subject.

## 4. Validation results

### 4.1 Exact release construction and evidence

| Gate | Result |
| --- | --- |
| Clean committed source/tree/archive | PASS; exact identities in §1 |
| Dependency acquisition | PASS; two architecture-specific acquisitions, checksummed bundles |
| Final Buildx | PASS; one `--no-cache` ordered multi-platform invocation |
| Network isolation after acquisition | PASS; install/build/prod convergence use `--network=none` |
| OCI inventory/evidence verification | PASS; exact index, children, configs, layers, diff IDs and subjects |
| Loss behavior | PASS; missing release exits `78`, `NEW_RELEASE_REQUIRED` |
| Lifecycle | PASS; exact subject derived as `promotion_authorized` through two append-only transitions |

Docker Desktop emitted transient content-store `rpc ... ref layer ... locked ... unavailable` diagnostic lines while Docker Scout loaded the newly emitted children. The command continued, both exact children were loaded/indexed, both SPDX records were written, the release builder exited `0`, and later independent OCI loads plus both architecture runtime probes passed. This diagnostic is disclosed; it is not treated as external vulnerability-feed evidence or suppressed from the implementation record.

### 4.2 Runtime validation of the exact emitted subject

| Gate | Exact result |
| --- | --- |
| `linux/amd64` runtime | PASS; Node `24.14.0`, UID:GID `10001:10001`, Next `16.2.12`, tsx `4.23.1`, GLIDE `2.5.1` native import, Supercronic `0.2.48`, package managers absent |
| `linux/arm64` runtime | PASS; same pins and controls, native arm64 import |
| Production robots/security | PASS; HTTP 200, indexable policy, HSTS and CSP |
| Staging robots/security | PASS; HTTP 200, `Disallow: /`, noindex/nofollow, HSTS and CSP |
| Preview | PASS; exact trailing-slash route returns 404 with noindex/nofollow and private/no-store |
| Cross-Origin Server Action | PASS; rejected with HTTP 500 |
| Production Worker | PASS; refuses with exit 1 and no secret leakage |
| Staging Worker disabled | PASS; refuses with exit 1 and no secret leakage |
| Staging Worker disconnected DB | PASS; fails closed with exit 1 and no secret leakage |
| Staging Worker graceful stop | PASS; SIGTERM exits 0 after 20 seconds, within 30-second grace; database closes |
| Notification outbox one-shot | PASS; empty Synthetic queue exits 0 |
| Object cleanup one-shot | PASS; empty Synthetic queue exits 0 |
| Retention preview one-shot | PASS; empty Synthetic scope exits 0 |
| One-shot overlap | PASS; collision exits 75 |
| Staging scheduler | PASS; SIGTERM exits 0 and no secret leakage |
| Nginx syntax/runtime constraints | PASS; real `nginx -t` as UID 101, read-only, cap-drop, bounded tmpfs |
| Normalized Compose graph | PASS; exact 10 services and resource/profile/network arithmetic |

All application runtime tests used only synthetic file secrets and isolated local databases. No real credential, customer/product data, protected environment or public traffic was used.

### 4.3 Final source quality gates

| Gate | Result |
| --- | --- |
| `pnpm lint` | PASS; exit 0, zero warnings |
| `pnpm typecheck` | PASS; exit 0 |
| `pnpm test:deployment` | PASS; 18/18 |
| `pnpm check:ai-prompts` | PASS; bundle verification plus 24/24 Prompt/history tests |
| AI architecture with explicit installed dependency root | PASS; `ok: true`, head `fedc9ee8...`, 908 candidates, 593 executable nodes |
| `pnpm test:run` | PASS; 155 files passed, 11 skipped; 1221 tests passed, 85 skipped; exit 0 |
| Exact-release local `pnpm build` | PASS; Next `16.2.12`, all routes remain dynamic |
| `pnpm check:bundle` | PASS; 392 eligible server runtime JS files, 20 public manifests, 15 distinct public chunk files |
| `git diff --check` | Recorded in the final evidence closure before documentation commit |

## 5. Change scope and compatibility

The implementation changes 43 paths relative to the accepted Option F planning baseline: 1,762 insertions and 131 deletions before this documentation closure. The change adds the container/deployment surface and narrows existing source/runtime boundaries; it does not add a second application authority.

There is no Schema/Migration change. There is no new database authority, Provider integration, sidecar, custom Next patch, runtime manifest writer, persistent promotion table or environment-specific application build.

The implementation preserves:

- modular-monolith domain boundaries;
- Draft/Review/Publish/Index separation;
- real-Product eligibility authority;
- public/private/import storage separation;
- Audit atomicity and Server Action/Domain Service boundaries;
- F-01 direct Node/tsx roles;
- F-02 dormant Production Worker;
- F-03 singular Staging start;
- F-04 one-lock lifetime and fail-stop; and
- F-05 granular GLIDE/Valkey behavior.

## 6. Rollback and operational constraints

Code rollback is commit-scoped to the accepted baseline or a separately reviewed successor. Do not selectively reintroduce runtime pnpm, an environment-specific rebuild, a second Compose path, a startup materializer, tag authority or a revoked digest.

Artifact rollback may select only a previously accepted immutable digest graph with its complete matching evidence. None of the five revoked subjects in §3 is eligible. If complete retained artifact/evidence custody is lost, return `NEW_RELEASE_REQUIRED` and produce a new release identity through the full path.

The protected host entry uses absolute `/usr/bin` paths, a root-only Docker socket/config and Linux `/proc/meminfo`. This macOS implementation host cannot execute that protected Linux static-shell lifecycle at its final filesystem locations. The normalized Compose checker, shell contract tests, FD9 negative tests and local runtime probes passed, but target Linux host preflight remains mandatory before external activation.

## 7. Claim ceiling and mandatory next gate

This report is an implementation handoff, not an independent review or acceptance record. It makes no claim that:

- a private immutable Registry or protected replica has been selected or configured;
- detached evidence has been uploaded or retained externally;
- an external vulnerability feed has cleared the image;
- protected Staging or Production selected the digest;
- Cloudflare/DNS/traffic or target-host host controls are active; or
- Stage 7 is authorized.

Mandatory next gate: a separate independent implementation/security/operations Review must inspect exact release source `fedc9ee8...`, exact OCI index `sha256:ba865c...`, both children, the transition/revocation evidence, framework-material isolation, retained F-01–F-05 controls, and this documentation closure. **Stage 7 remains HOLD pending explicit Owner authorization.**
