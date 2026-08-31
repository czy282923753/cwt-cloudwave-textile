# CWT Phase 1B Stage 6 — Option F Trusted CI Build Once Feasibility and Implementation Plan Candidate V1.0

Date: 2026-08-31

Status: **CANDIDATE — implementation-ready after fresh independent planning Review PASS; not self-approved**

Authoritative parent: `be8c8867ed0b35ac725a4f02d5addf55e65f1677` (V1.7 Candidate)

Sibling planning Review: `be2bbb79059444a97b7cadebbea545e530fd6890` (`PASS`; excluded from Candidate ancestry)

Owner direction: `OD-B04-01-SUCCESSOR-OPTION-F` in the adjacent Owner Decision Record V1.0

Authority boundary: **Stage 6 only. No implementation in this task. No external/protected action. Stage 7 remains HOLD.**

## 1. Outcome and bounded recommendation

Option F is locally feasible with standard components and no Schema/Migration: one trusted CI build emits one exact dual-architecture OCI index, local/Synthetic Staging validates that subject, and promotion marks the same digest without rebuilding. The feasibility subject passed both platform runtime/bundle/role gates and the decisive shared-framework-material isolation negatives.

The implementation recommendation is therefore **proceed with Option F only after fresh independent planning Review PASS**. Historical A–E remain historical dispositions; none is a fallback.

The feasibility image is evidence, not an implementation Candidate or Production claim. It used only disposable local/Synthetic resources and made no registry Push, Provider call, protected-environment mutation or Stage 7 claim.

## 2. Frozen contracts

### 2.1 Identity chronology

1. The accepted implementation source is clean and committed. Its full lowercase commit is `CWT_RELEASE_ID`; its commit timestamp is `SOURCE_DATE_EPOCH`.
2. One CI invocation materializes exact per-platform dependency inputs, validates their hashes and runs one multi-platform Buildx build. Build network is disabled after dependency acquisition.
3. On successful index emission, the release record freezes the index, child manifest/config/layer identities and sanitized build metadata.
4. All validation refers to those identities. A mismatched index or child fails before runtime action.
5. Only after every required gate passes may the same digest be marked promotion-authorized. A tag is never proof.
6. Any post-emission gate failure revokes the subject. Re-entry requires a new authorized release source identity and the whole path; a rebuild is not substituted.

An independent rebuild/digest-equality experiment may run as nonblocking engineering evidence, but its result cannot replace, delay or weaken the one accepted subject.

### 2.2 Shared framework material and separate business authority

The single permitted shared image material is the build-generated Next Preview/Draft bundle and Server Actions encryption material. Evidence records only schema lengths/counts, never values or hashes.

Required environment-private runtime inputs include, without limitation: database URLs/passwords, auth/session secret, Valkey credentials/prefix, Cloudmersive key/account custody, SMTP, AI/Provider, COS/storage, monitoring/analytics and backup credentials. Production and Staging share none of these, no database/session rows and no storage roots.

### 2.3 Multi-architecture subject

The ordered index is `linux/amd64`, then `linux/arm64`. The single-host Production and on-demand Staging topology must select the same host-architecture child. Every future intended Production child must pass the same staging-like gates before both environments select it. An index match with a wrong/unvalidated child, or mixed-architecture replicas within one environment, is a refusal, not partial acceptance.

### 2.4 Retention and rollback

The future registry must be private and immutable, deny overwrite/early deletion, and retain one access-controlled complete backup/replica. Rollback selects a previously accepted digest graph and matching evidence. Loss of all copies requires a new release; no same-digest rebuild promise exists.

## 3. Exact implementation slices

Each slice has one owner, one proof boundary and an independent stop. The coordinator may combine them into one bounded implementation Candidate; no slice is independently deployable.

| Slice | Exact scope / file ownership | Dependencies and verification | Rollback / stop | Independent next gate |
| --- | --- | --- | --- | --- |
| `OF-01` source/runtime convergence | `next.config.ts`: exact `generateBuildId`; keep `@valkey/valkey-glide` in existing `serverExternalPackages`. `src/proxy.ts`: runtime response headers. `src/app/layout.tsx`, `robots.ts`, `sitemap.ts`: prevent environment policy from becoming build-frozen. | Missing/malformed/revision-mismatched release ID fails. One image returns Production HSTS/index policy and Staging HSTS/noindex policy from separate runtime env. `pnpm build`, `check:bundle`, public/client dependency checks pass. | Revert the whole slice. Stop on cached environment origin/index policy, public GLIDE/scanner/AI material or changed Next behavior. | Source/security review within final implementation Review. |
| `OF-02` one build authority | Add one narrow `deploy/scripts/build-release-once.mjs` and one `package.json` command under existing deployment-tool ownership. `.dockerignore` and `Dockerfile` pin frontend/base, Node `24.14.0`, pnpm `11.9.0` build tool, Next `16.2.12`, Supercronic `0.2.48`, platform order and non-secret build args. Dependency acquisition emits exact per-platform immutable bundles outside Git; the release build consumes them with `--network=none`. | Clean committed source/tree/archive; exact dependency-bundle hashes; empty output; Buildx `--no-cache`, `--network=none`, OCI `rewrite-timestamp=true`, attached provenance/SBOM disabled; no live-target build. The CI entry refuses a pre-existing accepted release record and emits one subject only. | Delete/revoke the failed local subject and evidence; do not retry under its release record. Stop on floating input, mutable cache, host identity, secret input or unsupported architecture. | Build/evidence section of final Review. |
| `OF-03` runtime artifact and roles | `Dockerfile`, `package.json`, `scripts/process-ai-runs.ts`, `process-notification-outbox.ts`, `process-object-cleanup.ts`, `enforce-retention.ts`, `compose.yaml`, `deploy/schedule/*.crontab`. Preserve accepted F-01 direct Node `24.14.0` + tsx `4.23.1`, explicit async main/error handling, no runtime package manager. Remove only proven build residue. | Web, Staging Worker, both schedulers and every Production/Staging one-shot run as UID:GID `10001:10001`, read-only root, bounded tmpfs. No install/cache/source mutation. A pre-readiness signal must terminate promptly with zero claimed business action; after observable signal-handler/readiness establishment, `INT`/`TERM` must stop gracefully with exit `0`. Dependency failures remain fail-closed on both architectures. | Stop on runtime pnpm/Corepack, implicit install, recreated metadata, role fallback, permission error, restart loop or missing native binary. | Runtime/operations section of final Review. |
| `OF-04` unchanged topology/gates | `compose.yaml`, singular Staging gate, `deploy/scripts/preflight-compose-graph.mjs`, host/runbooks/tests. Integrate exact digest input while preserving F-02 Production Worker `production-ai` dormant profile/restart `no`, F-03 singular locked Staging start and F-04 trusted bootstrap/FD9 fail-stop. | Default-five/profile/network/resource allowlists; 1407 refusal/1408 positive; hostile selector/lock/signal matrix; no raw documented alternate start; no second Compose/build/promotion authority. | Revert digest integration only. Stop if any accepted F-02/F-03/F-04 boundary changes or total-holder-loss re-entry appears. | Operations/security section of final Review. |
| `OF-05` exact image/evidence checker | Extend existing `deploy/scripts/preflight-image.mjs` and tests; do not add a parallel proof framework. Validate release manifest schema, source identity, index/child/config/layers, release ID, tool/pin identities, detached evidence subjects, gate results, state transition and revoked-digest denylist. | Wrong index/child/config, different platform order, Next/schema drift, missing SBOM, stale subject, rejected digest, tag-only input and “promotion after rebuild” all fail. Only `built -> staging_validated -> promotion_authorized` is legal for one digest. | Revert checker and emitted local evidence together. Stop on ambiguous/mutable authority or an evidence record that can be edited in place. | Evidence-chain section of final Review. |
| `OF-06` framework-material isolation | Existing auth/request-security/Preview/Server Action tests plus focused local production-artifact probes. No new auth mechanism. | Same exact image: Staging session succeeds only in Staging; Production rejects it; Preview cookies alone reject; cross-Origin Server Action rejects; auth cookie has no Domain and retains Secure/HttpOnly/SameSite Strict; zero production `draftMode()` call; protected Domain Services recheck role/record scope. Secret scan proves only framework schema exists, with no values/hashes in evidence. | Any bypass revokes the subject and this ADR. Do not add a compatibility facade. | Independent security review. |
| `OF-07` AI gate maintenance | `scripts/verify-ai-architecture.ts` and `test-fixtures/ai-architecture/graph-faults.phase-d.synthetic-only.v1_0.json`: add only `deploy/scripts/preflight-compose-graph.mjs`, `preflight-image.mjs`, `preflight-proxy-config.mjs`, `preflight-proxy-ranges.mjs` to the existing `other-project-tooling` exact-file list; update sealed file/integrity hashes and exact mutation tests. | Full accepted AI gate on Node `24.14.0`, complete accepted Git history and pinned dependencies. New wildcard/directory coverage, AI reachability, capability, Provider or Production authority fails. `check:bundle` remains independent and passes. | Revert the two-file gate update. Stop if classification requires an AI authority change rather than exact non-AI disposition. | AI-boundary section of final Review. |
| `OF-08` detached SBOM/retention/promotion record | Existing implementation evidence report plus future protected registry/runbook ownership. Generate per-child SBOM and scan/provenance records after build, bound by digest and kept outside the canonical image index. Define private immutable retention, least-read audit, replica and loss procedure. | Both children contain pinned Next/tsx/GLIDE/runtime packages; zero business-secret or framework-key value/hash leakage; same digest at Staging and promotion; prior rejected subjects remain revoked. Local Stage 6 uses only Synthetic storage and proves schema/checkers. | Revoke promotion record; retain evidence for audit; roll back to prior accepted digest. Missing replica/retention capability blocks external activation. | Final implementation/security/operations Review; external validation waits for Stage 7. |

No slice may add Schema/Migration, a second database, sidecar, daemon, lease, persistent promotion table, custom Next patch, startup manifest writer or environment-specific image.

## 4. Accepted F-01–F-05 non-regression map

| Accepted finding closure | Option F binding |
| --- | --- |
| F-01 direct Node/tsx role boundary | `OF-03`; runtime pnpm and top-level-await failure paths remain retired. |
| F-02 dormant Production Worker | `OF-04`; `worker-production` stays outside default selection, exact `production-ai` profile, restart `no`, with unchanged static Production networks. |
| F-03 singular Staging start | `OF-04`; exact locked four-service start remains the only repository-authorized Staging path. |
| F-04 clean bootstrap and one-lock lifetime/fail-stop | `OF-04`; trusted static-shell, local socket, FD9 and total-holder-loss escalation remain unchanged. |
| F-05 granular GLIDE/Valkey ACL | Unchanged. Image/runtime proof must retain `CLIENT SETNAME`, `SCRIPT LOAD`, `EVALSHA`, Lua `INCR`/`PEXPIRE`/`PTTL` and all accepted denials; no second limiter. |

Option F does not reopen these findings. A concrete regression stops the implementation; a theoretical issue outside the accepted trust ceiling does not create an amendment loop.

## 5. Exact acceptance gates

### Build and identity

- one clean source commit/tree/archive and one non-secret release ID;
- one successful Buildx invocation and one emitted ordered OCI index;
- exact index, per-platform manifest/config, layer descriptor and `rootfs.diff_ids` inventory;
- fixed `created`/history/source epoch, pinned tools/materials and no attached evidence manifests;
- no build-only dependency bundle, `.next/cache`, traces, pnpm state, package manager or source-host identity in runtime; and
- no accepted rebuild after subject emission.

### Runtime and security

- both architectures pass public bundle, Web/Worker/Scheduler/one-shot and signal/exit matrices;
- Production/Staging runtime policy differs correctly from the same image;
- session, Preview-cookie and cross-Origin Server Action negatives pass;
- framework material is recorded only as schema lengths/counts; no value or hash is exported;
- all business credentials are absent from image and evidence and are environment-private at runtime;
- Production AI remains fail-closed; and
- existing database/storage/network/Valkey/Cloudmersive boundaries remain unchanged.

### Promotion, rollback and loss

- Staging and promotion records contain the same index and intended child digest;
- rejected subjects cannot transition to promotion-authorized;
- wrong digest/child/tag-only input fails before lifecycle action;
- prior accepted digest retention and rollback are proven locally; and
- total subject/replica loss yields `NEW_RELEASE_REQUIRED`, never rebuild/re-entry authorization.

## 6. Stop conditions

Stop and return to the coordinator if any of the following occurs:

- shared framework material bypasses an environment/auth/authz/Origin boundary;
- any non-framework secret or framework key value/hash reaches image evidence, Git, logs, metadata, SBOM or provenance;
- a second build, environment image, startup writer or alternate promotion authority is required;
- the exact Next version/schema changes or private framework output must be modified;
- an intended Production architecture is not validated;
- Production and Staging select different children or one environment mixes child architectures;
- image/evidence immutability, least-read retention or the backup/replica cannot be satisfied;
- an accepted F-01–F-05, bundle, AI, database, storage, Publish/Index or Stage boundary regresses;
- Schema/Migration, new persistent coordination or an architecture/commercial/security direction beyond this ADR becomes necessary; or
- external/protected action or Stage 7 is needed to continue this Stage 6 task.

## 7. Security & Test Simplification Check

The implementation and reviewer must answer `yes`:

1. Is there exactly one build subject and no rebuild-based promotion?
2. Does one existing image checker own digest/evidence state, with no parallel proof framework?
3. Are environment response policies runtime-resolved while business secrets remain runtime-only?
4. Is the only shared material the exact Owner-approved Next framework material?
5. Do session, Preview, Origin, role and record-scope negatives prove that material has no independent business authority?
6. Are non-runtime files deleted at their owner and runtime package managers absent?
7. Are F-01–F-05 and the singular Compose/RateLimiter authorities unchanged?
8. Do rollback and total-loss handling select retained evidence or require a new release without inference?
9. Are all Stage 6 tests local/Synthetic with no external or Production claim?

Any `no` blocks.

## 8. Developer/reviewer sequence and terminal boundary

1. Fresh independent planning/feasibility Review of this four-artifact package.
2. If and only if `PASS`, the coordinator may reuse the existing Implementer task/worktree based at `de40457e...`; first re-verify and preserve its intentional S6-04 dirt, then provide this exact delta. No new Implementer task is technically required.
3. Produce one bounded Stage 6 implementation Candidate for `OF-01`–`OF-08`. Do not begin S6-05/S6-06.
4. Run one independent implementation/security/operations Review. Reopen planning only for a material supported-path correctness/security issue.
5. After accepted Stage 6, stop. **Stage 7 remains HOLD until the Owner gives a new explicit authorization.**

This Candidate neither dispatches implementation nor performs its independent Review.
