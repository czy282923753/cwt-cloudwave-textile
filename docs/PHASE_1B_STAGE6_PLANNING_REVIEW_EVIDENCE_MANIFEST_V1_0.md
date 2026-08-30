# CWT Phase 1B Stage 6 Planning Review Evidence Manifest V1.0

Status: **TECHNICAL LEAD CANDIDATE EVIDENCE — independent planning Review required**

Date: **2026-08-30**

Candidate branch: `codex/phase-1b-stage6-planning-candidate-v1`

Accepted starting commit: `a200838be34c8834a00bdcf6d1819da96e2ad26c`

Accepted starting tree: `00438c32997f9be7d753dfca8325c1765bd90146`

Accepted Stage 5 tag object: `ba8edc69623099a1c22d3be5c5b4fd72a2b1a988`

Owner authority delta: **Stage 6 only. After accepted Stage 6, stop. Stage 7 is HOLD and requires new explicit Owner authorization.**

## 1. Review purpose and boundary

This manifest gives an independent reviewer the minimum evidence needed to decide whether the Stage 6 pre-development package is internally consistent, bounded, maintainable and ready to hand to a separate implementer.

It does not review or approve implementation because no Stage 6 product/runtime implementation exists in this Candidate. It does not prove a Provider contract, target-host behavior, Production readiness or any `External Validation` row. It records no account, credential, secret value, formal data or external-system mutation.

The only permitted Candidate mutations are the three versioned planning artifacts and their adjacent SHA-256 sidecars. The Candidate commit identity and clean state are necessarily external to the self-contained commit and must be verified directly from Git and the coordinator callback.

## 2. Principal deliverables

| Artifact | Review function |
| --- | --- |
| `docs/PHASE_1B_STAGE6_SCANNER_AND_SHARED_RATE_LIMITER_ENTRY_GATE_RECOMMENDATION_V1_0.md` | Concrete Scanner/Rate Limiter decision, option evidence, contracts, cost/operations, credentials and replacement boundaries. |
| `docs/PHASE_1B_STAGE6_PRE_DEVELOPMENT_IMPLEMENTATION_PLAN_CANDIDATE_V1_0.md` | Exact implementation slices, file ownership, old-path retirement, tests, acceptance mapping, rollback, stop conditions and sequencing. |
| `docs/PHASE_1B_STAGE6_PLANNING_REVIEW_EVIDENCE_MANIFEST_V1_0.md` | Baseline/input identity, inspected-interface findings, source ledger and independent review protocol. |
| Each adjacent `.sha256` file | Artifact-byte integrity. |

No existing accepted or frozen document is modified in this planning Candidate. No source, test, configuration, Migration, deployment artifact, tag or ref is modified.

## 3. Accepted-baseline identity evidence

The following read-only Git results were recorded in this isolated worktree before artifact creation:

| Identity | Expected and observed value | Result |
| --- | --- | --- |
| `HEAD` starting commit | `a200838be34c8834a00bdcf6d1819da96e2ad26c` | Match |
| `HEAD^{tree}` starting tree | `00438c32997f9be7d753dfca8325c1765bd90146` | Match |
| `refs/tags/phase-1b-stage5-approved-2026-08-30` object | `ba8edc69623099a1c22d3be5c5b4fd72a2b1a988` | Match; annotated tag object |
| Peeled Stage 5 tag commit | `a200838be34c8834a00bdcf6d1819da96e2ad26c` | Match |
| Starting worktree | Clean, detached at the accepted commit before the Candidate branch was created | Match |

### 3.1 Authoritative input hashes

SHA-256 values below let the reviewer distinguish the exact inputs used from later same-name documents.

| Input | SHA-256 |
| --- | --- |
| `AGENTS.md` | `f7ccb8a2ccc9f5171804511ef4b2c969a546a5ecc50b81c9d68e9ff5100a6a5f` |
| `docs/PHASE_1B_FROZEN_BASELINE.md` | `8f26a00b756352059cc671293f3b8d99cd50404d9ae9aa2418be85252bc6ec2e` |
| `docs/ENGINEERING_GOVERNANCE.md` | `6c27a0075229ebb131643460897e49b891c8fb534cfc6a3026216da6e0028647` |
| `docs/REVIEW_POLICY.md` | `97a8f4fc8dfa13ee2e748cc5c14c61346b4c539345225ea6662c86a8f94829e2` |
| `docs/ASSET_AND_UPLOADS.md` | `d0f382d44268da6d3f4ea208b896fe17aa0841dc8b4cf1e6bb1ba7a514df14c7` |
| `docs/PHASE_1B_IMPLEMENTATION_PLAN.md` | `fb75dae2a0a3fdd47a3884aefcf606a78f49bfb2ce31c461c6c5886ffa94237c` |
| `docs/PHASE_1B_ACCEPTANCE_MATRIX.md` | `108275cdb0a0a42a173c216008f79fca451e7ad2d155984aa60856a0198f3e7d` |
| `docs/PHASE_1B_OWNER_DECISIONS.md` | `98f7b32e7154b2764b0f841c1fb792db021c480e899e18f5a9fb116139e35f5a` |
| `docs/ENVIRONMENT_AND_DEPLOYMENT.md` | `da92f4ea2a27574ffb67c4050755bf76e99b770392cccdb160fd7dd07acf8789` |
| `docs/OPERATIONS_RUNBOOK.md` | `affa68c9588d2444a3fae3a82ee57d5ea78c086d3147bf5f7e7d9ac36243eb02` |
| `docs/adr/ADR-0013-local-production-origin-storage.md` | `e32da7d1d67430bf5d6be0ce9becd8defbea738385c18468992aaceaa46edf13` |
| `docs/adr/ADR-0014-staging-identity-and-preview-retirement.md` | `6ceeb362cedc484df6fea303b4d1baacd04db1dca5beec8c4b79f7120591cebf` |

## 4. Accepted-code interface evidence

The planner inspected the current accepted implementation only to make the plan executable. These files were not modified.

| Accepted input | SHA-256 | Decisive observation |
| --- | --- | --- |
| `src/config/env.ts` | `822cfc5690bd2a6b658e9642dd9800a1bea998a27c89f013578e4516ee87d056` | Production currently requires S3, generic HTTP Scanner/Limiter and a proxy mode; it has no concrete selected contracts or secret-file/pool authority. |
| `src/config/env.test.ts` | `29ed3b0a991bc2894dd2a9950d2c35b4de8c0723f5e5752474536f68c3bf9d5a` | Existing production fixture freezes the superseded S3/generic-HTTP expectation and is an explicit replacement target. |
| `src/uploads/scanner.ts` | `1fd8f7ad8ecf5fb635f7f989b6f9e379fdd94c7a795b4c25caaef46e7670d0c5` | `FileScanner.scan(bytes, fileName)` and `ScanResult` are reusable; the generic adapter lacks timeout/exact Provider response semantics. |
| `src/uploads/rate-limit.ts` | `83feacf2fdb3d0cee5d73029b128d7d84ff602c56fbf863d2a6163e13ee7e940` | Current interface/call actions are reusable, but memory and unnamed HTTP implementations cannot satisfy one cross-process authority. |
| `src/uploads/request-guard.ts` | `0347d36c2b013b6be9fd47dc66ea353c9565ab32327361958b96dfe487cb7d47` | Upload identity trusts a header according to mode without proving the direct proxy peer. |
| `src/app/api/auth/login/route.ts` | `d17a3c3760ecae4b431d2e90dedcd81fd8f6ccfe2652588b3eb0c7694c992224` | Login independently reads raw Cloudflare/X-Real-IP headers, creating a second/spoofable authority. |
| `src/db/client.ts` | `a42da2fc83ed1bd72afe4823cf61266d2da31e779f5817a2ff7c518f092e183b` | Application PostgreSQL pool is hard-coded to 10; accepted Migration client is already correctly bounded to 1. |
| `src/storage/index.ts` | `48c0537ef50e8ef6356602c50f5ec1b4b2b5a7f97ca86d6e7aeadd6c48b464e1` | Existing `ObjectStorage` composition can select local without changing domain callers. |
| `src/storage/local.ts` | `ea42582407aa8d4662e628cb8071d5252eddd8142ffbcfccd16d324a46e54982` | Existing local adapter resolves partitions and blocks key escape; target-root ownership/symlink/startup probes are still missing. |
| `package.json` | `36fb0554263161309f7fd0a820ad9fa496016abd99e1b6527651a9cd33e3b673` | Existing one-shot Outbox/Cleanup/Retention and AI worker scripts can be scheduled directly; no deployment/backup/health scripts exist. |
| `.env.example` | `d4398b79fad408043c231e8fcc3e03cc88ddda5b68e4f0b659a73f2049ab18e0` | Generic endpoint/token fields and literal-secret examples require replacement with exact driver and file-based custody names. |

### 4.1 Current-structure conclusions

- No `Dockerfile`, root Compose authority, reverse-proxy configuration, backup/restore workflow or public liveness/readiness route exists in the accepted tree.
- Current domain persistence already contains the Asset scan result and Upload/Finalize/Recovery authorities. No new scan history, queue or recovery schema is required.
- Current one-shot scripts are sufficient to schedule Outbox/Cleanup/Retention without creating another business worker state machine.
- Existing local storage and application-controlled media URLs can implement ADR-0013 without a domain/storage-interface change.
- No evidence was found that makes a Schema/Migration unavoidable. The planning conclusion is **Schema/Migration: none**.

## 5. Official-source evidence ledger

All sources were accessed on 2026-08-30. The entry-gate recommendation contains the detailed comparison and limitations. This ledger is a review locator, not a cached contract or external validation record.

| Topic | Primary/official source | Fact used and limitation |
| --- | --- | --- |
| Cloudmersive API | [Virus Scan API reference](https://api.cloudmersive.com/docs/virus.asp) | Fixed file endpoint, API-key header and clean/virus response fields support a synchronous adapter. Live behavior is unproved. |
| Cloudmersive plan | [Small Business pricing](https://cloudmersive.com/pricing-small-business) | Published Basic list price, 10,000 calls/month, 2 calls/s, 1 GB maximum file and North America region. Terms/availability must be rechecked before spend. |
| Cloudmersive data handling | [Security statement](https://www2.cloudmersive.com/security) | Vendor states HTTPS/stateless processing/no payload retention after transaction. DPA, subprocessors and region remain an external legal/security gate. |
| ClamAV resource fit | [ClamAV documentation](https://docs.clamav.net/) and [Docker memory guidance](https://docs.clamav.net/manual/Installing/Docker.html) | Project recommends 3 GiB+ for ClamAV and describes larger reload peaks, disqualifying it on the complete 4 GB host. |
| OPSWAT alternative | [Private scanning](https://www.opswat.com/docs/mdcloud/operation/private-scanning-with-metadefender-cloud-apis) and [product limits](https://www.opswat.com/products/metadefender/cloud) | Viable private paid processing, but lower standard file limits/more complex asynchronous/commercial contract. No private account facts were inferred. |
| Valkey component | [Valkey downloads](https://valkey.io/download/) | Official Valkey 8.1.9 release/image is pin-able. Digest must be recorded during implementation. |
| Valkey Node client | [Official recommended client list](https://valkey.io/clients/) and [GLIDE Node API](https://valkey.io/valkey-glide/node/GlideClient/) | `@valkey/valkey-glide` 2.5.1 is the current listed Node release and supports standalone clients. Package/runtime compatibility is locally tested before acceptance. |
| Atomic counter | [Valkey Lua scripting](https://valkey.io/topics/eval-intro/) | Server-side script execution is atomic, supporting one fixed-window increment/expiry command. |
| Memory failure | [Valkey eviction](https://valkey.io/topics/lru-cache/) | `maxmemory` plus `noeviction` refuses writes instead of discarding counters; application must map errors to unavailable/fail closed. |
| Isolation/ACL | [Valkey ACL](https://valkey.io/topics/acl/) and [security](https://valkey.io/topics/security/) | Least command/key permissions and a nonpublic network are required. No public port is acceptable. |
| Rejected edge authority | [Cloudflare Rate Limiting rules](https://developers.cloudflare.com/waf/rate-limiting-rules/) | Edge counters are not a precise application-level authority and cover only ingress; Cloudflare may not duplicate exact CWT limits. |
| Nginx proxy | [Nginx download page](https://nginx.org/en/download.html) and [official image](https://hub.docker.com/_/nginx) | `1.30.4` is the published stable line/image used for the Candidate pin; implementation records an immutable manifest digest. |
| PostgreSQL 18 container layout | [PostgreSQL official image](https://hub.docker.com/_/postgres) | PostgreSQL 18 uses versioned `PGDATA=/var/lib/postgresql/18/docker` and mounts at `/var/lib/postgresql`; the plan binds the accepted host root accordingly. The accepted 18.4 version remains authoritative. |
| Container scheduling | [Supercronic releases](https://github.com/aptible/supercronic/releases) | `0.2.48` is the selected signal/log-aware scheduler binary release; architecture-specific SHA-256 is frozen in implementation. |
| Encrypted backup client | [Restic 0.19.1 release](https://github.com/restic/restic/releases/tag/v0.19.1) | Signed stable release with published assets/checksums; used behind bounded scripts, not as a second backup authority. |

No source is treated as a guarantee of uptime, legal suitability, account separation, price permanence, target performance or Provider acceptance. Those facts require a separately authorized later gate.

Read-only package-registry metadata for `@valkey/valkey-glide@2.5.1` reported Node `>=16`, Apache-2.0 and published Linux x64/ARM64 GNU/musl optional packages. This narrows the compatibility risk but does not replace the required Node 24.14 deployment-image installation/runtime test.

## 6. Planning decisions and rationale trace

| Gate item | Candidate decision | Evidence/risk closure |
| --- | --- | --- |
| Scanner | Cloudmersive Virus Scan API, Basic published capacity reference. | Off-host avoids ClamAV's 4 GB conflict; one synchronous adapter fits `FileScanner`; fail closed on every invalid/unavailable outcome. Region/contract/account remain explicit external blockers, not guessed facts. |
| Shared Rate Limiter | Valkey 8.1.9 standalone per environment with `@valkey/valkey-glide` 2.5.1. | One atomic cross-process authority, 128 MiB container ceiling, expiring nonbusiness state and no Schema. Production/Staging instances/ACL/state are separate. |
| Proxy/client identity | Nginx sole ingress; one overwritten internal address header; one application normalizer. | Replaces both current header paths and makes direct peer/network topology part of the attestation. Real Cloudflare ranges/firewall are external. |
| Live media | Isolated local bind mounts under the accepted `/srv/cwt/...` roots. | Implements ADR-0013; removes current S3 Production gate without changing `ObjectStorage` or public URLs. |
| Topology | One Compose authority; Production default, Staging explicit/on-demand; one PostgreSQL 18.4 instance with different DB/users. | Matches frozen baseline and avoids parallel/declarative drift. |
| Scheduling | Standard Supercronic invokes accepted one-shot commands; AI keeps its existing worker. | No new business worker/table/lease; overlap is refused locally. |
| Backup | `pg_dump`/`pg_restore`, SHA-256 completion manifest and encrypted Restic set. | Standard tools implement daily/local and weekly/COS preparation without a custom backup database. No COS call in Stage 6 local evidence. |
| Schema/Migration | None. | Existing durable authorities are sufficient. Any contrary implementation evidence triggers stop/draft ADR. |

## 7. Acceptance-coverage audit

The implementation plan contains an explicit row for every `O-01` through `O-25` and `X-05`/`X-06`, naming the local artifact/hook and the proof held for later. The following higher-level cross-check prevents a planning omission:

| Coverage group | IDs | Candidate location |
| --- | --- | --- |
| Topology/isolation/capacity | `O-01`–`O-08` | Plan §§3, 4 S6-01/S6-02/S6-04/S6-05, 6. |
| Disk/log/monitoring | `O-09`–`O-14` | Plan §§3.2–3.3, 4 S6-04/S6-05/S6-06, 6. |
| Proxy/media relocation | `O-15`–`O-18` | Plan §§3.1–3.2, 4 S6-01/S6-02/S6-04, 6. |
| Backup/restore/recovery | `O-19`–`O-25` | Plan §4 S6-06, §§5–6, 8. |
| Scanner/Limiter future external proof | `X-05`, `X-06` | Recommendation §§4–6; Plan §4 S6-02/S6-03 and §6. |
| Relevant cross-boundaries | `E-06`, `E-11`, upload/Asset/Audit/environment isolation | Plan §§1–4 and 6–9. |

The accepted matrix continues to mark all `O` rows and `X-05`/`X-06` as `External Validation`, Stage 7. This Candidate does not change those states. Under the Owner delta, Stage 7 is not authorized even after Stage 6 acceptance.

## 8. Independent planning Review protocol

### 8.1 Read-only identity and scope checks

The reviewer should run from the Candidate worktree:

```text
git show --no-patch --format=fuller HEAD
git diff --name-status a200838be34c8834a00bdcf6d1819da96e2ad26c..HEAD
git status --short --branch
git rev-parse a200838be34c8834a00bdcf6d1819da96e2ad26c^{tree}
git cat-file -t ba8edc69623099a1c22d3be5c5b4fd72a2b1a988
git rev-parse ba8edc69623099a1c22d3be5c5b4fd72a2b1a988^{}
cd docs
shasum -a 256 -c PHASE_1B_STAGE6_SCANNER_AND_SHARED_RATE_LIMITER_ENTRY_GATE_RECOMMENDATION_V1_0.md.sha256
shasum -a 256 -c PHASE_1B_STAGE6_PRE_DEVELOPMENT_IMPLEMENTATION_PLAN_CANDIDATE_V1_0.md.sha256
shasum -a 256 -c PHASE_1B_STAGE6_PLANNING_REVIEW_EVIDENCE_MANIFEST_V1_0.md.sha256
```

Expected scope is exactly the three principal Markdown artifacts and three sidecars. Any product code, Migration, frozen baseline, prior report, tag or ref change is a mandatory finding.

### 8.2 Content checks

An independent reviewer must verify:

1. The recommendation names one Scanner and one Rate Limiter, compares viable options and distinguishes published source facts from future proof.
2. Cloudmersive's region/privacy/commercial uncertainty is visible and has a stop boundary; no legal/account fact is invented.
3. Valkey is one atomic authority, not a cache plus fallback; Production/Staging state/credentials are separate and memory/noeviction failures deny.
4. The trusted-client plan deletes the current conflicting raw-header paths and uses the proxy/network as the attestation boundary.
5. The implementation plan owns exact files, dependencies, tests, rollback, stop conditions and an independent next gate for every slice.
6. Local storage implements ADR-0013 and public/private/import isolation without introducing another public URL or storage authority.
7. Database pools, cgroups, Staging preflight, logging and backup/restore hooks are bounded and fit the frozen topology as design ceilings.
8. No Schema/Migration, table, scan queue, custom HTTP limiter sidecar, distributed lock system or parallel topology is hidden in the plan.
9. Every `O-01`–`O-25` and `X-05`/`X-06` preparation row is mapped without a Stage 7/Production claim.
10. The Owner delta is repeated correctly: accepted Stage 6 ends the chain; Stage 7 requires a new explicit Owner authorization.

### 8.3 Planning verdict

Use the accepted `docs/REVIEW_POLICY.md` severity and verification rules. The planning verdict should be:

- **PASS** only if the entry gate and implementation plan are executable, bounded and contain no mandatory finding;
- **CONDITIONAL PASS** only for explicitly nonblocking documentation clarification with a named owner/deadline and no ambiguity in implementation/security authority; or
- **FAIL** for an unresolved architecture/Schema/provider/business-authority choice, dual authority, missing fail-closed path, incomplete `O` mapping, external-action dependency, false proof or scope contamination.

The Technical Lead who produced this Candidate cannot independently review or accept it.

## 9. Planning gate result and open findings

Technical Lead self-check result: **READY FOR INDEPENDENT PLANNING REVIEW; not accepted.**

No current evidence requires a Schema/Migration, draft ADR or immediate Owner choice for local Stage 6 implementation. The published Cloudmersive Basic price/limit/region facts are sufficient to recommend a concrete adapter and capacity reference without committing spend. The following are intentionally unresolved external prerequisites, not Stage 6 local implementation blockers:

- Owner-approved Cloudmersive account/subscription, separate Production/Staging credentials, DPA/subprocessor/retention/region acceptance and current terms;
- real Cloudflare ranges/account/Access/DNS/TLS/origin-firewall configuration;
- Tencent host/COS/CAM, Sentry, uptime/independent alert channel and their separate environment credentials;
- named Production/Staging Admin identities and secret custody;
- target 2 vCPU/4 GB/60 GB behavior, real backup upload/restore and actual Provider failure behavior; and
- Owner-approved recovery objectives.

If a reviewer concludes that North America processing or two paid environment subscriptions is already a material business/authority choice that must precede local adapter implementation, the correct verdict is `NEEDS_OWNER_DECISION`, with the Cloudmersive higher-region tier and another private-scanning Provider as explicit options. Do not substitute a Provider silently.

## 10. Terminal boundary

The next gate is an **independent Stage 6 planning Review**. No implementation starts from this task and no self-approval is valid.

After later independent implementation Review and accepted Stage 6, all work stops. **Owner authorization is required before Stage 7.**
