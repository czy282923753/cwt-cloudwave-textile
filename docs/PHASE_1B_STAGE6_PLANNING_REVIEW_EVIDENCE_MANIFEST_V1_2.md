# CWT Phase 1B Stage 6 Planning Review Evidence Manifest V1.2

Status: **REMEDIATED TECHNICAL LEAD CANDIDATE EVIDENCE — fresh independent planning re-review required**

Date: **2026-08-30**

Candidate branch: `codex/phase-1b-stage6-planning-remediation-v1`

Accepted baseline commit/tree: `a200838be34c8834a00bdcf6d1819da96e2ad26c` / `00438c32997f9be7d753dfca8325c1765bd90146`

Failed planning Candidate: `68980a98ac7f8f1b72edfbac30b20ab044b52e97`

Failed independent Review-only commit: `e27752053b6a8aad49e5ac3003e247bdd87a595b`

Failed Review report: `docs/PHASE_1B_STAGE6_PRE_DEVELOPMENT_PLANNING_INDEPENDENT_REVIEW_V1_0.md` at the Review-only commit

Current Owner authority record: `docs/PHASE_1B_STAGE6_CLOUDMERSIVE_RESTORATION_AND_PRIVATE_FILE_TRANSMISSION_OWNER_DECISION_RECORD_V1_2.md`

Owner boundary: **Stage 6 only. Stage 7 is HOLD and requires new explicit Owner authorization.**

## 1. Purpose and decision boundary

This manifest gives a fresh independent reviewer the minimum evidence needed to determine whether the remediated Stage 6 pre-development package closes failed Review findings `F-01` and `F-02`, preserves the full Owner-decision chronology, and remains bounded and executable for a later separate implementer.

It does not approve itself or any implementation. It does not prove a Provider contract, account, credential, external file transfer, target-host behavior, Production readiness, or an `External Validation` row. No account, purchase, Provider call, real file, secret value, deployment, Push, Staging/Production mutation, DNS change, Stage 7 action, product code, Migration, tag, or accepted ref is within this Candidate.

The Candidate starts from failed Candidate `68980a98ac7f8f1b72edfbac30b20ab044b52e97`. Review-only commit `e27752053b6a8aad49e5ac3003e247bdd87a595b` is read-only evidence and must not be an ancestor of or absorbed into the remediation Candidate.

## 2. Candidate scope and principal deliverables

The intended Candidate mutation is exactly these seven new Markdown artifacts and their adjacent SHA-256 sidecars:

| Artifact | Review function |
| --- | --- |
| `docs/PHASE_1B_STAGE6_CLOUDMERSIVE_BASIC_NORTH_AMERICA_OWNER_DECISION_RECORD_V1_0.md` | Immutable audit record of the first limited Cloudmersive approval; explicitly superseded. |
| `docs/PHASE_1B_STAGE6_CLOUDMERSIVE_WITHDRAWAL_AND_SELF_HOSTED_SCANNER_OWNER_DECISION_RECORD_V1_1.md` | Immutable audit record of the later Cloudmersive withdrawal/self-host direction; explicitly superseded. |
| `docs/PHASE_1B_STAGE6_CLOUDMERSIVE_RESTORATION_AND_PRIVATE_FILE_TRANSMISSION_OWNER_DECISION_RECORD_V1_2.md` | Current controlling Owner decision: Cloudmersive restored, North America and Private Inquiry file transmission permitted as direction, with non-authority boundaries. |
| `docs/PHASE_1B_STAGE6_PLANNING_REMEDIATION_F01_F02_CROSSWALK_V1_1.md` | One-to-one closure map from failed Review `F-01`/`F-02` to exact decision and revised planning sections. |
| `docs/PHASE_1B_STAGE6_SCANNER_AND_SHARED_RATE_LIMITER_ENTRY_GATE_RECOMMENDATION_V1_2.md` | Remediated Scanner/Rate Limiter selection, option evidence, contracts, cost/operations, credentials plan, failure and replacement boundaries. |
| `docs/PHASE_1B_STAGE6_PRE_DEVELOPMENT_IMPLEMENTATION_PLAN_CANDIDATE_V1_2.md` | Remediated exact implementation slices, file ownership, retirement, tests, acceptance mapping, rollback, stops and sequencing. |
| `docs/PHASE_1B_STAGE6_PLANNING_REVIEW_EVIDENCE_MANIFEST_V1_2.md` | Lineage, evidence, mechanical checks and fresh independent re-review protocol. |

The failed V1.0 Candidate artifacts remain byte-identical at their original commit. The failed Review remains byte-identical at its Review-only commit. The V1.0/V1.1 Owner Decision Records are historical facts only; the V1.2 record is controlling.

## 3. Identity and lineage evidence

| Identity | Expected value and interpretation |
| --- | --- |
| Accepted starting commit | `a200838be34c8834a00bdcf6d1819da96e2ad26c` |
| Accepted starting tree | `00438c32997f9be7d753dfca8325c1765bd90146` |
| Accepted Stage 5 annotated tag object | `ba8edc69623099a1c22d3be5c5b4fd72a2b1a988` |
| Failed planning Candidate | `68980a98ac7f8f1b72edfbac30b20ab044b52e97`, sole parent is the accepted starting commit |
| Failed Review-only commit | `e27752053b6a8aad49e5ac3003e247bdd87a595b`, sole parent is the failed Candidate |
| Failed Review artifact SHA-256 | `47bb68ef7807e648d6c2c7c0a5c3e2c7ea921426f7cfa6a195f5657532277319` |
| Remediation base | Exactly the failed Candidate, not the Review-only commit |
| Required remediation lineage | The final Candidate has exactly one new commit whose sole parent is `68980a98ac7f8f1b72edfbac30b20ab044b52e97`; `e277520...` is not an ancestor |

### 3.1 Authoritative accepted-input hashes

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

## 4. Failed Review evidence and closure map

The failed Review result is `FAIL` with two Blockers. The authoritative detailed crosswalk is `docs/PHASE_1B_STAGE6_PLANNING_REMEDIATION_F01_F02_CROSSWALK_V1_1.md`; this summary lets the reviewer detect any mismatch.

| Finding | Failed condition | Required closure evidence in this Candidate |
| --- | --- | --- |
| `F-01` | The failed Candidate selected Cloudmersive Basic/North America and possible separate Production/Staging commercial boundaries without recorded Owner approval. | Owner Decision Record V1.2 records the latest controlling choice after V1.0 approval and V1.1 withdrawal: Cloudmersive restored behind `FileScanner`; North America and future transmission/processing of Private Inquiry file bytes are approved as direction. Free is evaluation-only; Basic/North America is the future Stage 7 activation target subject to current-term validation. Purchase, accounts, credentials, calls, real transfer, deployment and Stage 7 remain unauthorized. Production and Staging cannot share account/key/secret authority. Recommendation V1.2 and Plan V1.2 repeat exactly this boundary. |
| `F-02` | The failed topology placed PostgreSQL only on a singular disconnected/shared `database` network while application services used other networks. | Plan V1.2 deletes that model and defines exactly two internal environment-private database attachments: `production-database` and `staging-database`. The one PostgreSQL service joins both. Only `web-prod`, `worker-prod`, `scheduler-prod` join the Production network; only matching Staging services join the Staging network. No application service crosses; proxy and Valkey networks remain separate; no third/shared database network and no second PostgreSQL exist. Assertions, denial tests, rollback and stop rules use this same graph. Separate DBs/users/passwords and no cross-grants remain required. |

No other Review finding is hidden or merged into either closure. Fresh review must verify both independently.

## 5. Current Owner-decision chronology

| Version | Decision at that time | Current status |
| --- | --- | --- |
| V1.0 | Limited Cloudmersive Basic/North America local adapter direction, with future private Inquiry processing acknowledged. | **SUPERSEDED AUDIT HISTORY** |
| V1.1 | Cloudmersive removed and a self-hosted direction requested; no replacement SaaS authorized. | **SUPERSEDED AUDIT HISTORY** |
| V1.2 | Cloudmersive restored. Owner permits future file-byte transmission, including Private Inquiry files, and North America processing as the Provider direction. | **CURRENT CONTROLLING DECISION** |

The V1.2 direction does not authorize purchase, spend, account creation, commercial-term acceptance, DPA/subprocessor/retention acceptance, credentials, Provider calls, real file transfer, deployment, protected environment mutation, or Stage 7. It preserves current application limits rather than lowering them to Free Tier capacity: ordinary Public/Inquiry `12 MiB`, Import workbook `10 MiB`, one Import image/member `20 MiB`, and Import archive `500 MiB` at the archive-flow boundary.

## 6. Accepted-code interface evidence

The planner inspected accepted implementation only to make the plan executable. No listed file is modified.

| Accepted input | SHA-256 | Decisive observation |
| --- | --- | --- |
| `src/config/env.ts` | `822cfc5690bd2a6b658e9642dd9800a1bea998a27c89f013578e4516ee87d056` | Production has generic Scanner/Limiter and S3 gates but no selected contracts or file-based secret authority. |
| `src/config/env.test.ts` | `29ed3b0a991bc2894dd2a9950d2c35b4de8c0723f5e5752474536f68c3bf9d5a` | Existing Production expectations are explicit replacement targets. |
| `src/uploads/scanner.ts` | `1fd8f7ad8ecf5fb635f7f989b6f9e379fdd94c7a795b4c25caaef46e7670d0c5` | `FileScanner.scan(bytes, fileName)` and provider-neutral `ScanResult` are reusable; the generic adapter lacks exact timeout/response semantics. |
| `src/uploads/rate-limit.ts` | `83feacf2fdb3d0cee5d73029b128d7d84ff602c56fbf863d2a6163e13ee7e940` | Call sites/interfaces are reusable, but memory and generic HTTP paths cannot satisfy one cross-process authority. |
| `src/uploads/request-guard.ts` | `0347d36c2b013b6be9fd47dc66ea353c9565ab32327361958b96dfe487cb7d47` | Current upload identity trusts forwarding input without the final proxy-peer proof. |
| `src/app/api/auth/login/route.ts` | `d17a3c3760ecae4b431d2e90dedcd81fd8f6ccfe2652588b3eb0c7694c992224` | Login independently reads forwarding headers, creating conflicting client-identity authority. |
| `src/db/client.ts` | `a42da2fc83ed1bd72afe4823cf61266d2da31e779f5817a2ff7c518f092e183b` | Application PostgreSQL pool is hard-coded to 10; Migration client is already bounded to 1. |
| `src/storage/index.ts` / `src/storage/local.ts` | `48c0537ef50e8ef6356602c50f5ec1b4b2b5a7f97ca86d6e7aeadd6c48b464e1` / `ea42582407aa8d4662e628cb8071d5252eddd8142ffbcfccd16d324a46e54982` | Existing `ObjectStorage` and isolated partitions are reusable for ADR-0013; host-root probes are missing. |
| `package.json` | `36fb0554263161309f7fd0a820ad9fa496016abd99e1b6527651a9cd33e3b673` | Existing Outbox/Cleanup/Retention/AI commands can be scheduled; no deployment/backup/health authority exists. |
| `.env.example` | `d4398b79fad408043c231e8fcc3e03cc88ddda5b68e4f0b659a73f2049ab18e0` | Generic endpoint/token examples require replacement by exact drivers and file-based custody names. |

The accepted tree has no root `Dockerfile`, Compose authority, reverse-proxy configuration, backup/restore workflow, or public liveness/readiness route. Existing Asset scan/Upload/Finalize/Recovery authorities are sufficient. No evidence makes a Schema/Migration unavoidable; any contrary evidence is a mandatory stop and draft-ADR/escalation condition.

## 7. Official-source evidence ledger

Sources were read on 2026-08-30. They support planning only and are not cached commercial, legal, availability, privacy, or runtime proof.

| Topic | Primary/official source | Planning fact and limitation |
| --- | --- | --- |
| Cloudmersive API | [Virus Scan API reference](https://api.cloudmersive.com/docs/virus.asp) | `POST /virus/scan/file`, `multipart/form-data`, `Apikey`, and clean/virus fields support a synchronous adapter; live response behavior remains unproved. |
| Cloudmersive plans | [Official plan selector](https://portal.cloudmersive.com/selectplan) | Published display observed: Free is North America, 600 calls/month, 1 call/s, 3.5 MB max, limited support and labelled evaluation; Basic is North America, 10,000 calls/month, 2 calls/s, 1 GB max, 24-hour Basic support and production-oriented. Exact current tier/price/limits require revalidation before external use or spend. |
| Cloudmersive Terms | [Terms of Service](https://portal.cloudmersive.com/terms-of-service) | Current legal terms must be reviewed/authorized before external use. |
| Cloudmersive privacy/DPA/subprocessors | [Privacy Policy](https://cloudmersive.com/privacy-policy), [DPA](https://www.cloudmersive.com/data-processing-dpa), [Subprocessors](https://cloudmersive.com/subprocessors) | These are future legal/privacy gates; this Candidate does not accept them. |
| Cloudmersive retention statement | [Official FAQ](https://cloudmersive.com/faq) | Vendor describes stateless/in-memory processing and no retained payload; future Stage 7 must validate the then-current statement and applicable agreement. |
| ClamAV alternative | [ClamAV documentation](https://docs.clamav.net/) and [Docker memory guidance](https://docs.clamav.net/manual/Installing/Docker.html) | Standard self-hosted option, but official container guidance describes a 3 GiB+ allowance and reload peaks; it is not a stable fit to assume on the entire 4 GB application host. No new host is authorized. |
| Valkey component/client | [Valkey downloads](https://valkey.io/download/), [recommended clients](https://valkey.io/clients/), [GLIDE Node API](https://valkey.io/valkey-glide/node/GlideClient/) | Pin-able standalone component and supported client direction; immutable image/package identity and runtime compatibility are local implementation gates. |
| Valkey atomic/failure semantics | [Lua scripting](https://valkey.io/topics/eval-intro/), [eviction](https://valkey.io/topics/lru-cache/), [ACL](https://valkey.io/topics/acl/), [security](https://valkey.io/topics/security/) | One atomic command, `noeviction`, scoped ACL and nonpublic network support one fail-closed cross-process boundary. |

No source is treated as a guarantee of uptime, legal suitability, account separation, price permanence, exact future plan availability, target performance, or Provider acceptance. Before any real-file validation, Stage 7 must have new Owner authorization and revalidate Terms, Privacy/DPA, subprocessors, retention/stateless-processing, exact region, file/rate limits, availability/support, credential separation, and spend/caps.

## 8. Remediated planning decisions

| Gate item | V1.2 decision | Decisive boundary |
| --- | --- | --- |
| Scanner | Provider-neutral `FileScanner`; deterministic local/CI fake; Cloudmersive adapter as the selected future external direction. | Free may only support a later separately authorized bounded synthetic evaluation. Basic/North America is the future Stage 7 activation target unless fresh official evidence requires escalation. Business/domain code never consumes a Provider SDK/response model. All unavailable, timeout, malformed, oversized, throttled or indeterminate results fail closed before release. |
| File-size compatibility | Keep `10/12/20/500 MiB` CWT boundaries. | Do not lower product contracts to Free's observed 3.5 MB ceiling. The current archive flow scans validated members; it does not require a second in-memory copy of a 500 MiB archive. Any proposal for whole-archive Provider transfer is a stop/re-plan condition. |
| Environment credentials | Production and Staging have different account/key/secret authorities; local/CI has none and makes no Provider call. | If separate paid subscriptions/accounts are commercially required, that is a future Stage 7 Owner purchase/access gate, not an assumed purchase. No fallback key or cross-environment account is permitted. |
| Shared Rate Limiter | One standalone Valkey per environment with the selected official Node client. | Atomic fixed-window operation, scoped ACL, no public port, `noeviction`, and deny-on-error. No memory or generic HTTP fallback remains in protected environments. |
| Database graph | Exactly `production-database` and `staging-database`, both internal; one PostgreSQL joins both. | Exact environment app allowlists; no app crosses; no shared/third database network; proxy and Valkey networks stay separate; separate DBs/users/passwords and no cross-grants. |
| Schema/Migration | None. | Existing persistent authorities are reused. Contrary evidence stops the slice and requires coordinator escalation/draft ADR. |

## 9. Acceptance coverage and claim boundary

Plan V1.2 maps every `O-01` through `O-25` and `X-05`/`X-06` to a local artifact or future validation hook. The higher-level cross-check is:

| Coverage group | IDs | Candidate locator |
| --- | --- | --- |
| Topology/isolation/capacity | `O-01`–`O-08` | Plan §§3, 4 (`S6-01`, `S6-02`, `S6-04`, `S6-05`), 6 |
| Disk/log/monitoring | `O-09`–`O-14` | Plan §§3.2–3.3, 4 (`S6-04`–`S6-06`), 6 |
| Proxy/media relocation | `O-15`–`O-18` | Plan §§3.1–3.2, 4 (`S6-01`, `S6-02`, `S6-04`), 6 |
| Backup/restore/recovery | `O-19`–`O-25` | Plan §4 `S6-06`, §§5–6, 8 |
| Future Scanner/Limiter external proof | `X-05`, `X-06` | Recommendation §§4–7; Plan §4 `S6-02`/`S6-03`, §6 |

All remain `External Validation` preparation only. This Candidate does not change an acceptance state or claim Provider/Production proof. Even after accepted Stage 6, work stops; Stage 7 requires new explicit Owner authorization.

## 10. Fresh independent re-review protocol

### 10.1 Lineage, immutable-history and scope checks

Run from the committed Candidate worktree:

```text
git show --no-patch --format=fuller HEAD
test "$(git rev-parse HEAD^)" = "68980a98ac7f8f1b72edfbac30b20ab044b52e97"
if git merge-base --is-ancestor e27752053b6a8aad49e5ac3003e247bdd87a595b HEAD; then exit 1; fi
git diff --name-status 68980a98ac7f8f1b72edfbac30b20ab044b52e97..HEAD
git diff --exit-code 68980a98ac7f8f1b72edfbac30b20ab044b52e97..HEAD -- \
  docs/PHASE_1B_STAGE6_SCANNER_AND_SHARED_RATE_LIMITER_ENTRY_GATE_RECOMMENDATION_V1_0.md \
  docs/PHASE_1B_STAGE6_PRE_DEVELOPMENT_IMPLEMENTATION_PLAN_CANDIDATE_V1_0.md \
  docs/PHASE_1B_STAGE6_PLANNING_REVIEW_EVIDENCE_MANIFEST_V1_0.md
git status --short --branch
git rev-parse a200838be34c8834a00bdcf6d1819da96e2ad26c^{tree}
git cat-file -t ba8edc69623099a1c22d3be5c5b4fd72a2b1a988
git rev-parse ba8edc69623099a1c22d3be5c5b4fd72a2b1a988^{}
git show e27752053b6a8aad49e5ac3003e247bdd87a595b:docs/PHASE_1B_STAGE6_PRE_DEVELOPMENT_PLANNING_INDEPENDENT_REVIEW_V1_0.md | shasum -a 256
```

Expected diff: exactly 14 added files from §2. Any modification to a V1.0 Candidate artifact, Review-only artifact, source, test, configuration, Migration, accepted/frozen document, tag or ref is a mandatory finding.

Verify all seven sidecars from `docs/`:

```text
shasum -a 256 -c PHASE_1B_STAGE6_CLOUDMERSIVE_BASIC_NORTH_AMERICA_OWNER_DECISION_RECORD_V1_0.md.sha256
shasum -a 256 -c PHASE_1B_STAGE6_CLOUDMERSIVE_WITHDRAWAL_AND_SELF_HOSTED_SCANNER_OWNER_DECISION_RECORD_V1_1.md.sha256
shasum -a 256 -c PHASE_1B_STAGE6_CLOUDMERSIVE_RESTORATION_AND_PRIVATE_FILE_TRANSMISSION_OWNER_DECISION_RECORD_V1_2.md.sha256
shasum -a 256 -c PHASE_1B_STAGE6_PLANNING_REMEDIATION_F01_F02_CROSSWALK_V1_1.md.sha256
shasum -a 256 -c PHASE_1B_STAGE6_SCANNER_AND_SHARED_RATE_LIMITER_ENTRY_GATE_RECOMMENDATION_V1_2.md.sha256
shasum -a 256 -c PHASE_1B_STAGE6_PRE_DEVELOPMENT_IMPLEMENTATION_PLAN_CANDIDATE_V1_2.md.sha256
shasum -a 256 -c PHASE_1B_STAGE6_PLANNING_REVIEW_EVIDENCE_MANIFEST_V1_2.md.sha256
```

### 10.2 Content checks

The independent reviewer must verify:

1. Decision chronology is exactly V1.0 approval → V1.1 withdrawal/self-host → V1.2 Cloudmersive restoration, with only V1.2 controlling.
2. `F-01` closure records North America and Private Inquiry byte transmission authority as direction while preserving every non-authority boundary.
3. Free is synthetic evaluation-only; current CWT size contracts remain `10/12/20/500 MiB`; Basic is only a future Stage 7 activation target pending current official/commercial/legal validation.
4. `FileScanner` remains provider-neutral; local/CI cannot call the Provider; all indeterminate outcomes fail closed before release.
5. Production and Staging do not share Cloudmersive account/key/secret authority; separate commercial access is a future explicit purchase/access gate.
6. `F-02` closure has exactly two environment-private database networks; one PostgreSQL on both; exact app allowlists; no crossed app, third/shared database network, second PostgreSQL, proxy or Valkey membership.
7. Separate environment DBs/users/passwords and no cross-grants align with assertions, denial tests, rollback and stops.
8. Valkey is one atomic protected-environment authority with no memory/generic HTTP fallback and denial on unavailable/full/malformed behavior.
9. Every slice has scope, dependencies, verification, rollback, stop conditions and an independent next gate; no Schema/Migration or hidden persistent coordination is introduced.
10. Every `O-01`–`O-25` and `X-05`/`X-06` row is preparation only and Stage 7 remains HOLD.

### 10.3 Verdict boundary

Apply `docs/REVIEW_POLICY.md`. `PASS` requires both `F-01` and `F-02` to be independently closed and the package to be executable and bounded. Any unresolved provider/business authority, contradictory network graph, dual authority, missing fail-closed path, incomplete acceptance mapping, false external proof, architecture/Schema change, or scope contamination is `FAIL` or an Owner-decision callback according to the governing policy. The Technical Lead cannot perform or accept this review.

## 11. Technical Lead planning gate result

Technical Lead self-check result: **READY FOR FRESH INDEPENDENT STAGE 6 PLANNING RE-REVIEW; not reviewed or accepted.**

The latest Owner decision resolves the local provider-direction question. No immediate Owner decision, Schema/Migration, or draft ADR is required to hand this plan to independent re-review. Future external prerequisites remain deliberately unproved and unauthorized: current commercial/legal/privacy terms; Provider account and separate environment credentials/subscriptions; spend/caps; real Provider behavior; Cloudflare/DNS/TLS/origin rules; target-host behavior; external monitoring; backup destinations; real restore; and named protected-environment access.

If future Stage 7 evidence shows Basic/North America cannot satisfy the preserved file contracts or environment separation without a materially different tier, region, processing, or commercial direction, stop before external use and return to the Owner. Do not silently lower CWT limits, share credentials, substitute another Provider, or add a fallback scanner.

## 12. Terminal boundary

Next gate: **fresh independent Stage 6 planning re-review**.

No implementation, self-approval, implementation Review, Provider action, or Stage 7 work starts from this task. After later accepted Stage 6, all work stops. **Owner authorization is required before Stage 7.**
