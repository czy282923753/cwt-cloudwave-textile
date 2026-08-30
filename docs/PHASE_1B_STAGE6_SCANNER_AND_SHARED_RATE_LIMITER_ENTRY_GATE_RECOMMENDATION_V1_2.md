# CWT Phase 1B Stage 6 Scanner and Shared Rate Limiter Entry-Gate Recommendation V1.2

Status: **REMEDIATED TECHNICAL LEAD CANDIDATE — fresh independent planning re-review required; no implementation or external action authorized by this artifact**

Date: **2026-08-30**

Accepted starting commit: `a200838be34c8834a00bdcf6d1819da96e2ad26c`

Accepted starting tree: `00438c32997f9be7d753dfca8325c1765bd90146`

Accepted Stage 5 tag object: `ba8edc69623099a1c22d3be5c5b4fd72a2b1a988` (`refs/tags/phase-1b-stage5-approved-2026-08-30`)

Owner authority delta: **Stage 6 only. After accepted Stage 6, stop. Stage 7 is HOLD and requires new explicit Owner authorization.**

Failed planning Candidate: `68980a98ac7f8f1b72edfbac30b20ab044b52e97`

Failed independent Review: `e27752053b6a8aad49e5ac3003e247bdd87a595b`, `docs/PHASE_1B_STAGE6_PRE_DEVELOPMENT_PLANNING_INDEPENDENT_REVIEW_V1_0.md` (`FAIL`, F-01 and F-02)

Current Owner authority: `docs/PHASE_1B_STAGE6_CLOUDMERSIVE_RESTORATION_AND_PRIVATE_FILE_TRANSMISSION_OWNER_DECISION_RECORD_V1_2.md`

Superseded decision history: `docs/PHASE_1B_STAGE6_CLOUDMERSIVE_BASIC_NORTH_AMERICA_OWNER_DECISION_RECORD_V1_0.md`; `docs/PHASE_1B_STAGE6_CLOUDMERSIVE_WITHDRAWAL_AND_SELF_HOSTED_SCANNER_OWNER_DECISION_RECORD_V1_1.md`

Remediation crosswalk: `docs/PHASE_1B_STAGE6_PLANNING_REMEDIATION_F01_F02_CROSSWALK_V1_1.md`

This V1.2 supersedes Recommendation V1.0 as forward planning authority. V1.0, the failed Review and both superseded Owner decisions remain immutable/auditable history.

## 1. Decision

The Stage 6 technical recommendation is:

1. **Malware Scanner:** Cloudmersive hosted **Virus Scan API**, using `POST /virus/scan/file`, with published **Basic / North America** retained only as the future Stage 7 activation target. The provider-neutral `FileScanner` interface remains application authority and one exact Cloudmersive adapter terminates all Provider-specific request/response types. Production and Staging never fall back to development or another Provider.
2. **Shared Rate Limiter:** self-hosted **Valkey 8.1.9**, one isolated standalone instance for Production and a separate on-demand instance for Staging. All Web/Worker processes in one environment use the same Valkey authority through one neutral `SharedRateLimiter` implementation. Production and Staging never fall back to process memory.

This pairing is the smallest option found that satisfies all of the following without a Schema/Migration change:

- malware decisions fail closed before release;
- no resident antivirus engine consumes the 2 vCPU/4 GB host budget;
- rate-limit decisions are atomic across processes;
- each environment has one limiter authority and independent credentials/state;
- existing Asset scan persistence and Upload/Finalize/Recovery authorities remain unchanged;
- public/private/import storage isolation and controlled media delivery remain unchanged; and
- later provider/component replacement stays behind accepted interfaces instead of adding a parallel path.

The current Owner Decision V1.2 explicitly restores Cloudmersive, permits future North America transmission/processing of uploaded bytes including Private Inquiry files, and resolves F-01's missing Provider/data-transfer direction. It does not authorize an actual transmission. The recommendation is not self-approval and becomes an accepted Stage 6 planning gate only after fresh independent re-review and coordinator acceptance. It does not create an account, accept terms, approve spend, access a credential, call a Provider, send a file, deploy or prove target/provider behavior.

## 2. Authority and non-change analysis

This recommendation implements the frozen provider gate in `docs/PHASE_1B_OWNER_DECISIONS.md`, current Owner Decision V1.2 and the Stage 6 boundary in `docs/PHASE_1B_IMPLEMENTATION_PLAN.md`. It does not change the modular-monolith architecture.

| Impact area | Candidate conclusion |
| --- | --- |
| Business Schema/Migration | None. Existing Asset scan fields remain the durable result authority. Valkey state is expiring operational security state, not business data. |
| Product/publication/SEO | None. Scanner success still cannot Publish or enable Index; public media delivery continues to recheck the persisted Passed scan and live eligibility. |
| URL/Redirect/Canonical | None. No route contract changes. |
| Storage | None. The Scanner receives quarantined/staged bytes through the existing service boundary. It does not become an origin or Asset store. |
| Private data | The Owner permits future Cloudmersive transmission/processing of uploaded bytes, including Private Inquiry files, in North America. Actual use remains blocked on a newly authorized Stage 7 task, current Terms/Privacy/DPA/subprocessor/retention/region review, accounts, credentials and spend. No payload may enter CWT logs. |
| Runtime topology | Adds one small Valkey service per active environment. It replaces the unnamed HTTP limiter dependency; it is not a second application or business queue. The scanner remains off-host. |
| ADR | No new ADR is recommended: current Owner Decision V1.2 supplies the data-transfer direction, while `FileScanner`, storage and Asset authorities remain unchanged. A materially different Provider/tier/region or architecture still requires Owner escalation and, when architectural, a draft ADR. |

## 3. Official-source evidence

All sources below were accessed on 2026-08-30. Claims are limited to what the linked vendor/project documentation states; published plan facts and marketing availability are not treated as CWT production proof or contractual guarantees.

| Source | Evidence used | Decision relevance |
| --- | --- | --- |
| [Cloudmersive Virus Scan API reference](https://api.cloudmersive.com/docs/virus.asp) | HTTPS API-key authentication; `POST /virus/scan/file`; multipart file input; strict `CleanResult` plus `FoundViruses` response shape. | The existing `FileScanner.scan(bytes, fileName)` contract can be implemented without an SDK or a second job authority. |
| [Cloudmersive plan selection](https://portal.cloudmersive.com/selectplan) | Published Free: 600 calls/month, 1 call/second, 3.5 MB, limited support, North America, evaluation label. Published Basic: USD 19.99/month, 10,000 calls/month, 2 calls/second, 1 GB, High Availability label, 24-hour Basic support, North America (U.S. East, Canada), production-starting label. | Free cannot preserve CWT's 10/12/20 MiB accepted files and is evaluation-only. Basic's published 1 GB ceiling covers every CWT file-size contract, including the 500 MiB archive, but exact commercial facts require Stage 7 recheck. |
| [Cloudmersive Terms](https://portal.cloudmersive.com/terms-of-service), [Privacy](https://cloudmersive.com/privacy-policy), [DPA](https://www.cloudmersive.com/data-processing-dpa), [subprocessors](https://cloudmersive.com/subprocessors) and [FAQ](https://cloudmersive.com/faq) | Current public legal/privacy documents exist; DPA states acceptance is required for it to apply; vendor FAQ states HTTPS/stateless in-memory processing and no retained payload after a transaction. | Stage 7 must review and authorize the current complete terms; public statements are not contract acceptance or external proof. |
| [ClamAV recommended requirements](https://docs.clamav.net/) | Current documentation recommends 3 GiB+ RAM for ClamAV on Linux and says additional resources are needed when other applications share the system. | Disqualifies resident ClamAV on the complete 4 GB CWT host. |
| [ClamAV Docker memory guidance](https://docs.clamav.net/manual/Installing/Docker.html) | ClamAV documents roughly 1.2 GiB for the loaded engine, a roughly 2.4 GiB reload peak, and a 3–4 GiB recommendation; reduced-memory settings trade availability or database validation. | Fail-closed cgroup limits would not make the complete host demonstrably operable; ClamAV is not selected. |
| [OPSWAT private scanning](https://www.opswat.com/docs/mdcloud/operation/private-scanning-with-metadefender-cloud-apis) | Private scanning is paid; uploaded bytes are temporarily processed and scan results remain, with stronger private-processing controls available. | Technically viable, but creates a more complex commercial/privacy contract than the selected synchronous API. |
| [OPSWAT product limits](https://www.opswat.com/products/metadefender/cloud) | Published Standard/Professional file limits are 140/256 MB; 1 GB+ is Enterprise, with tiered throttling. | A whole 500 MB import package would require Enterprise or a more complicated entry-only scanning contract. |
| [Valkey 8.1.9 release/download](https://valkey.io/download/) | Official 8.1.9 release and official `valkey/valkey:8.1.9` image are published. | Free, standard, pin-able single-host component with no external account. |
| [Valkey recommended client list](https://valkey.io/clients/) and [GLIDE Node API](https://valkey.io/valkey-glide/node/GlideClient/) | Valkey lists `@valkey/valkey-glide` 2.5.1 as the current recommended Node.js client release; its API supports a standalone client. | Freezes the application dependency and avoids leaving client/protocol selection to implementation. Debian/glibc image compatibility remains a mandatory local test. |
| [Valkey atomic Lua execution](https://valkey.io/topics/eval-intro/) | Server-side Lua scripts execute atomically; scripts are application-owned and must be reloadable. | One constant fixed-window script can update count and TTL atomically across every caller. |
| [Valkey memory and no-eviction behavior](https://valkey.io/topics/lru-cache/) | `maxmemory` bounds the dataset; `noeviction` refuses new writes at the limit instead of deleting existing keys. | Counter loss through eviction is prohibited; an OOM write becomes typed limiter unavailability and fails closed. |
| [Valkey ACL](https://valkey.io/topics/acl/) and [security](https://valkey.io/topics/security/) | ACLs restrict commands/keys; the port must be isolated from untrusted networks; TLS is available when crossing an untrusted network. | Per-environment least-privilege credentials and an unpublished internal port are mandatory. |
| [Cloudflare Rate Limiting rules](https://developers.cloudflare.com/waf/rate-limiting-rules/) | Cloudflare states that edge rate limiting is not a precise request-count authority and may allow excess requests during counter propagation; features vary by plan. | Cloudflare WAF may later provide coarse edge defense, but cannot be the CWT application limiter authority. |

## 4. Malware Scanner option comparison

| Option | Resource/failure fit | Cost/operations | Privacy/contract | Disposition |
| --- | --- | --- | --- | --- |
| Cloudmersive Virus Scan API, Basic | No resident engine; CWT bounds scan concurrency to 1. Network/API failure maps to unavailable and no release. Published 1 GB/call and 2 calls/s cover 12 MiB Public/Inquiry, 10 MiB workbook, 20 MiB member and 500 MiB archive contracts. | Published USD 19.99/month per subscription and 10,000 calls/month. CWT maintains one adapter, quota/spend alerts and credential rotation. | Owner-approved North America/private-file direction; current Terms/Privacy/DPA/subprocessors/retention still require Stage 7 authorization. | **Recommended future activation target.** |
| Cloudmersive Virus Scan API, Free | Same endpoint shape, but published 3.5 MB maximum is below every relevant accepted CWT maximum except tiny fixtures. | USD 0 published, 600 calls/month, 1 call/second, limited support, evaluation label. | No Stage 6 call is authorized; any future use remains North America external processing. | **Synthetic PoC/evaluation only after Stage 7 authority. Never Production/Staging activation and never a reason to reduce CWT limits.** |
| ClamAV `clamd` official container | Fails the whole-host budget: project recommends 3 GiB+ for ClamAV alone and warns of larger reload peaks. Resource caps would turn routine signature reload into scanner outages/OOM. | No subscription; CWT owns daily signature updates, failed-update/reload handling, CVE patching, database volume and capacity. | Bytes remain local. | **Rejected for the 4 GB host.** Reconsider only after a host upgrade and a new resource review. |
| OPSWAT MetaDefender Cloud | Off-host and fail-closed capable, but its normal API is asynchronous upload/poll. Standard/Professional limits do not cover a whole 500 MB package; Enterprise is needed unless CWT narrows the scan unit. | Paid private mode; published throughput tiers, but the needed Enterprise commercial quote is not fixed in the public evidence used here. | Private processing is a paid contract; scan-result retention and region must be reviewed. | **Rejected for Stage 6.** More integration and commercial uncertainty without a CWT benefit over the selected API. |

### 4.1 Selected scanner service contract

The implementation must retain provider-neutral `FileScanner` as the only application-facing malware interface and implement exactly one Production/Staging Cloudmersive adapter. Cloudmersive SDK/response models may not escape that adapter.

| Contract element | Frozen Candidate rule |
| --- | --- |
| Driver | `cloudmersive`; `development` remains local/test only. Generic `http` is retired. |
| Endpoint | Exact configured origin plus fixed path `/virus/scan/file`; the path is code-owned, not caller-controlled. Redirects are rejected. |
| Authentication | `Apikey` header loaded from an environment-specific Docker secret file. No value appears in Git, environment dumps, URLs, logs, screenshots or evidence. |
| Request | HTTPS `multipart/form-data`; one already-size-bounded `Uint8Array`; original file name sanitized and bounded. Adapter scan units are ordinary Public/Inquiry files (12 MiB), Import workbooks (10 MiB) and accepted Import image members (20 MiB). The separate compressed-archive flow boundary remains 500 MiB and scans accepted members serially; it does not pass a second whole-archive buffer through this `Uint8Array` adapter. No raw storage key, customer identifier or public URL is sent. |
| Valid clean decision | HTTP 200; JSON object; `CleanResult === true`; `FoundViruses` is absent or an empty array. Any shape disagreement is unavailable, not clean. |
| Malware decision | A valid response with `CleanResult === false` is rejected. Only a safe generic reference is persisted; vendor payload/file names are not logged. |
| Unavailable decision | DNS/TLS/connect/read timeout, redirect, non-200, 401/403, 429, 5xx, invalid JSON or invalid schema raises a typed scanner-unavailable result. Existing quarantine/Recovery remains authoritative and no Asset releases. |
| Timeout/retry | One call, bounded by a reviewed 60-second hard timeout. No adapter-level automatic retry; existing idempotent Upload/Recovery/operator retry owns another attempt and prevents hidden duplicate Provider cost. |
| Concurrency | Maximum 1 active scan per environment on the target topology. The import archive path continues to scan each accepted image serially. No new scan queue/table/lease is added. |
| Persistence | Existing Asset fields persist provider, safe result reference and completion time before release. Provider response data is not a second scan-history authority. |
| Startup | Production/Staging refuse `development`, a missing key file, an unreadable key, a non-HTTPS endpoint or an endpoint outside the exact allowlisted origin. Startup performs no Provider call. |
| Health | Configuration/readability is a local readiness check. Real API availability is observed from actual scan outcomes and an independently authorized external monitor; readiness does not consume scan quota. |
| Fallback | None. Manual editing and non-file Inquiry remain available, but file release remains blocked while the scanner is unavailable. |

### 4.2 Scanner resource budget

- No scanner daemon, signature database or update process runs on the target host.
- Existing local validation runs before the Provider call; scan concurrency remains 1.
- The adapter must not create more than one additional whole-file copy. At the largest ordinarily materialized scan unit (20 MiB Import member), the design budget is below 64 MiB transient adapter overhead; this is a ceiling, not Stage 7 proof.
- The 500 MiB Import archive contract remains unchanged. The accepted path streams it to isolated Import storage, inspects it under current archive limits and scans accepted image members serially. If a later reviewed contract requires sending the archive itself, the published Basic 1 GB ceiling covers its size, but the adapter must stream it; buffering a 500 MiB second copy is a stop condition. Free cannot validate this path.

### 4.3 Scanner credentials, commercial boundary and replacement

- Production and Staging must use separate Cloudmersive accounts, API keys, secret files, quota/spend identity and logs; no cross-environment use. If this requires separate paid subscriptions/accounts, Stage 7 returns for explicit Owner purchase/access authorization rather than assuming them.
- The published list price is evidence only. This artifact approves no purchase or spend and does not calculate an authorized aggregate cost.
- Free Tier may be used only in a future authorized bounded Synthetic evaluation; it cannot be configured as Production/Staging activation and cannot justify reducing CWT limits.
- Before any external use, recheck current Terms, Privacy/DPA, subprocessors, retention/stateless processing, North America endpoint/region, file/rate limits, availability/support, separate account/key model, price and spend/cap. A materially different Provider/tier/region/account model requires Owner decision; do not silently change selection.
- Replacement uses a new `FileScanner` adapter plus the same strict contract tests. The new adapter replaces Cloudmersive at cutover; two live scanners must not vote, race, shadow-send bytes or become parallel clean authorities.
- A rollback image remains configured for the same Provider contract. Production/Staging may not roll back to the development scanner or to “scan passed” placeholders.

## 5. Shared Rate Limiter option comparison

| Option | Authority/resource fit | Failure/operations | Disposition |
| --- | --- | --- | --- |
| Valkey 8.1.9 standalone per environment | One atomic cross-process authority; bounded expiring keys; approximately 128 MiB hard container ceiling is compatible with the target. No business Schema. | Local network, ACL, health check, memory alerts. `noeviction` plus typed error makes memory exhaustion fail closed. | **Recommended.** |
| Cloudflare WAF Rate Limiting | Shared at the edge but not precise, counter behavior is distributed, and it covers only HTTP ingress—not internal callers or application account/session keys. It also depends on external plan/configuration. | Useful later as coarse abuse protection, but cannot prove application limits and would become a conflicting authority if configured to duplicate the exact policies. | **Rejected as the authoritative limiter.** |
| PostgreSQL counter table | Would be shared and transactional, but requires a new hot-write Schema/Migration and couples abuse traffic to the business database. | Adds retention/index/contention/backup responsibility and consumes the limited DB pool. | **Rejected.** Schema/Migration is not justified. |
| Current generic HTTP limiter | Interface exists, but no concrete service/protocol/atomicity is selected and a custom HTTP sidecar would add a second application. | Ambiguous availability, credentials and update semantics. | **Retire and replace.** |

### 5.1 Selected limiter service contract

| Contract element | Frozen Candidate rule |
| --- | --- |
| Component | Official `valkey/valkey:8.1.9` image, pinned by immutable digest during implementation. No floating tag. |
| Node client | `@valkey/valkey-glide` `2.5.1`, exact lockfile version. Use one standalone client per process, no Cluster discovery, no client-side cache, no replica reads and no dynamic module commands. The runtime image uses Debian/glibc and verifies the package on the deployment architecture. |
| Topology | One Production standalone service; one separate on-demand Staging service. No Cluster, Sentinel or replica on the single host. |
| Application interface | Move the neutral interface out of `src/uploads/` to one server-only shared-rate-limit module. Preserve the `consume(key, action)` caller contract while making typed `allowed`, `limited` and `unavailable` outcomes explicit. |
| Atomic algorithm | One constant, versioned Lua fixed-window script performs `INCR` and first-write `PEXPIRE` atomically. No dynamic script generation and no application read-then-write. |
| Existing policy | Preserve the accepted current default: 30 consumes per 60 seconds for `upload`, `login` and `conversion` until a separately reviewed policy change. Login continues to consume both network and account keys. |
| Key material | `cwt:<environment>:rate:<action>:<sha256-identity>`. Raw IP, email, Session ID, User-Agent, Consent ID and customer identifier never enter Valkey/logs. All keys expire. |
| Memory | `maxmemory 64mb`, `maxmemory-policy noeviction`, nonzero client-memory limit, and a 128 MiB container hard limit. Persistence (RDB/AOF) is disabled because this is expiring operational state, not business or Audit evidence. |
| Network | Port 6379 is never published. Only the environment Web/Worker network may connect. Production and Staging networks, ACL users, passwords and key prefixes are distinct. |
| ACL | Default user off; one environment-specific app user; only connection, authentication, ping and exact scripting/key commands required by the limiter; no admin/config/flush/publish/module permissions. |
| Timeout/retry | Short bounded connect/command timeout; no unbounded client queue and no offline command queue. One command attempt. Connection/script/OOM/protocol error is `unavailable`. |
| Fail behavior | `limited` returns the existing safe 429 path. `unavailable` denies the protected action with safe retry guidance, emits a redacted operational event and makes readiness fail. It never invokes `MemoryUploadRateLimiter` in Production/Staging. |
| Startup/readiness | Startup validates driver, endpoint, key prefix and secret file. Readiness proves authenticated `PING` plus execution of the exact script against a short-lived canary key. |
| Restart | Web readiness fails while Valkey is unavailable. After an intentional Valkey restart, expired security counters begin empty; no traffic is accepted during the unavailable window. No backup/restore is required for counters. |

### 5.2 Trusted-client authority

The limiter selection is valid only with one trusted-client-address boundary:

1. Nginx is the only HTTP ingress and its source allowlist accepts Cloudflare networks only in Production/Staging.
2. Nginx strips every client-supplied internal address header, validates `CF-Connecting-IP` only after the direct peer is trusted, and overwrites one fixed internal header with the resulting address.
3. The Web container has no published host port and shares its ingress network only with Nginx. This network topology is the proxy attestation boundary.
4. One `trusted-client-address` service validates and normalizes the internal header. Upload, login, analytics/conversion and logs reuse it. No caller reads `CF-Connecting-IP`, `X-Forwarded-For` or `X-Real-IP` directly.
5. In Production/Staging, a missing, malformed or unattested internal address is a typed client-identity failure: upload/login are denied before their protected mutation/authentication work, while analytics/conversion is discarded. It never falls back to User-Agent, a shared “unknown” bucket or a caller-provided address. Local/test may inject an explicit Synthetic address through the test seam only.

The current login route's direct header read and the upload-only trusted-address helper are explicit retirement targets. Cloudflare WAF or Nginx may later apply broad volumetric protection, but neither duplicates the exact application counters or becomes a success authority.

### 5.3 Limiter cost, maintenance and replacement

- License/subscription cost is zero; operational cost is the bounded target-host CPU/RAM and routine security-patch review.
- The implementation pins Valkey 8.1.9 by digest and `@valkey/valkey-glide` 2.5.1 in `pnpm-lock.yaml`, disables persistence and exposes no external port. Either dependency upgrade receives its own compatibility/security review; a Valkey major-version change is not bundled into ordinary maintenance.
- Production and Staging use separate ACL secret files under `/etc/cwt/production` and `/etc/cwt/staging`; no values are committed.
- A later managed Valkey/RESP service may replace the local endpoint only after TLS, credentials, latency, outage and cost review. The same `SharedRateLimiter` contract and tests must remain; local and managed authorities cannot run as fallback peers.
- Rollback retains the previous compatible application image and Valkey data-protocol version. It never selects the in-process memory limiter in Production/Staging.

## 6. Entry-gate acceptance and stop conditions

### Candidate pass conclusion

The recommendation is implementation-ready for a local, provider-disabled Stage 6 Candidate because:

- current Owner Decision V1.2 resolves Cloudmersive, North America and Private Inquiry byte-transmission direction while retaining the external-use gate;
- both concrete selections and exact application contracts are named;
- Free Tier is bounded to future Synthetic evaluation and Basic remains only a future activation target without reducing 10/12/20/500 MiB contracts;
- scanner host memory is removed from the 4 GB budget;
- Valkey resource/state bounds are explicit;
- failure and fallback behavior is fail closed;
- credentials have environment-specific custody paths without values;
- no Schema/Migration, new business worker, lease, table or recovery lifecycle is introduced; and
- Stage 7 external proof remains clearly unclaimed.

### Local Stage 6 stop and callback conditions

Stop local implementation if:

1. work would require an account, credential, Provider call, file transmission, purchase, term acceptance or other external action;
2. Cloudmersive-specific types must enter business/domain code or a second Scanner authority/fallback is proposed;
3. the adapter cannot preserve exact 10/12/20/500 MiB CWT contracts without buffering the 500 MiB archive or reducing a limit;
4. an implementation needs a scan queue/table, second verdict authority, Rate Limiter table, Cluster/Sentinel or other persistent coordination;
5. trusted client identity cannot be enforced without a second authority or public Web port; or
6. a Schema/Migration or unapproved architecture change becomes necessary.

### Future external-use stop conditions

Stage 6 does not clear external use. Before any Cloudmersive call or file transmission, stop until a newly authorized Stage 7 task verifies and obtains applicable authorization for current Terms, Privacy/DPA, subprocessors, retention/stateless processing, exact North America region, file/rate limits, availability/support, separate Production/Staging accounts/keys, price and spend/cap. If current facts require a materially different Provider, tier, region, account model or CWT file contract, return `NEEDS_OWNER_DECISION` and do not silently substitute or shrink limits.

## 7. Authorization boundary

This artifact authorizes nothing by itself. Owner Decision V1.2 supplies only Provider/data-transfer direction for planning. Stage 6 planning and later accepted implementation may create local code, configuration templates, fakes and validation hooks only within separate assigned scopes. They may not create accounts, buy/select a live plan, accept terms, access keys, call Cloudmersive, transmit a file, configure Cloudflare on a real host, expose an origin, deploy, mutate Staging/Production or claim X-05/X-06.

After accepted Stage 6, all work stops. **Owner authorization is required before Stage 7.**
