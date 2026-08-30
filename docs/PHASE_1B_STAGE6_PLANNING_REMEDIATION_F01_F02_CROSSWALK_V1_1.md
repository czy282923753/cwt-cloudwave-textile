# CWT Phase 1B Stage 6 Planning Remediation F-01 / F-02 Crosswalk V1.1

Status: **TECHNICAL LEAD REMEDIATION CANDIDATE — fresh independent planning re-review required**

Date: **2026-08-30**

Accepted Stage 5 commit: `a200838be34c8834a00bdcf6d1819da96e2ad26c`

Failed planning Candidate: `68980a98ac7f8f1b72edfbac30b20ab044b52e97`

Failed Review report: `docs/PHASE_1B_STAGE6_PRE_DEVELOPMENT_PLANNING_INDEPENDENT_REVIEW_V1_0.md`

Failed Review-only commit: `e27752053b6a8aad49e5ac3003e247bdd87a595b`

Failed Review report SHA-256: `47bb68ef7807e648d6c2c7c0a5c3e2c7ea921426f7cfa6a195f5657532277319`

Remediation base: **the failed Candidate commit, not the Review-only commit**

Current Owner authority: `docs/PHASE_1B_STAGE6_CLOUDMERSIVE_RESTORATION_AND_PRIVATE_FILE_TRANSMISSION_OWNER_DECISION_RECORD_V1_2.md`

Phase authority: **Stage 6 only. Stage 7 remains HOLD and requires new explicit Owner authorization even after accepted Stage 6.**

## 1. Document-control and decision chronology

The failed Candidate V1.0 artifacts and failed Review remain immutable history. This remediation:

- does not edit any V1.0 Candidate artifact;
- does not edit, cherry-pick, merge or absorb the Review-only commit;
- preserves all three Owner decisions as chronological records;
- uses only V1.2 as current forward Owner authority;
- creates complete Recommendation V1.2, Plan Candidate V1.2 and sole current Evidence Manifest V1.3 artifacts; and
- preserves delivered remediation commit `caaa17ee2892890ba7e3da4580bfc7a5b9df861b` with sole parent `68980a98ac7f8f1b72edfbac30b20ab044b52e97`, then permits exactly one docs-only pre-review correction child.

Decision chronology:

| Version | Historical decision | Current authority effect |
| --- | --- | --- |
| Owner Decision V1.0 | Approved Cloudmersive Basic / North America only as a local adapter direction with external use blocked. | Superseded; audit only. |
| Owner Decision V1.1 | Withdrew Cloudmersive and directed self-hosted evaluation. | Superseded by latest V1.2; audit only. No draft self-hosted architecture is forward authority. |
| Owner Decision V1.2 | Restores Cloudmersive; permits future North America transmission/processing of uploaded bytes including Private Inquiry files; preserves all Stage 6 external-action prohibitions. | **Current forward authority.** |

The intended history is:

```text
a200838be34c8834a00bdcf6d1819da96e2ad26c
  └─ 68980a98ac7f8f1b72edfbac30b20ab044b52e97  (failed Candidate V1.0)
       ├─ e27752053b6a8aad49e5ac3003e247bdd87a595b  (immutable review-only FAIL)
       └─ caaa17ee2892890ba7e3da4580bfc7a5b9df861b  (delivered remediation Candidate)
            └─ <pre-review correction Candidate commit>             (exact service names/locators/sidecars only)
```

The Review is a sibling record, never Candidate ancestry.

## 2. One-to-one finding closure crosswalk

| Finding | Failed condition | Exact remediation authority/artifacts | Revised planning locations | Closure evidence required for re-review |
| --- | --- | --- | --- | --- |
| F-01 | Failed Candidate selected Cloudmersive Basic / North America without Owner authority for Provider choice, private Inquiry processing and environment account/key direction. | Current `docs/PHASE_1B_STAGE6_CLOUDMERSIVE_RESTORATION_AND_PRIVATE_FILE_TRANSMISSION_OWNER_DECISION_RECORD_V1_2.md`; V1.0/V1.1 decision records preserve the supersession trail. | Recommendation V1.2 §§1–4, 6–7; Plan V1.2 authority/outcome, S6-03, local gate, acceptance, stop and sequence sections; sole current Evidence Manifest V1.3 authority/source/content checks. | V1.2 explicitly restores Cloudmersive, permits future North America transmission/processing including Private Inquiry bytes, classifies Free as Synthetic evaluation only, retains Basic as future activation target, requires separate Production/Staging accounts/keys/secrets and withholds every actual external action until a newly authorized Stage 7 gate. |
| F-02 | PostgreSQL was attached only to singular `database` while every application service was attached elsewhere; silently sharing that network would violate environment isolation. | Minimum convergence in this record and Plan V1.2: delete singular `database`; create exactly `production-database` and `staging-database`; attach the one PostgreSQL service to both; attach environment app/ops services only to their own database network. | Plan V1.2 §§3.1–3.4, S6-04, acceptance `O-01`/`O-02`/`O-06`, rollback and stop sections; sole current Evidence Manifest V1.3 topology/token checks. | Machine-readable allowlist proves exactly two database networks, one PostgreSQL service on both, no cross-environment app membership, no proxy/Valkey membership, separate DB/users/no-cross-grants and cross-environment denial. |

No finding is combined with the other: F-01 closes only through current Owner authority plus aligned Scanner boundaries; F-02 closes only through the corrected executable topology and aligned proof/rollback/stop text.

## 3. F-01 exact remediation

### 3.1 Current Provider and data-transfer authority

Cloudmersive is the selected Provider behind the provider-neutral `FileScanner` interface. The Owner permits a later separately authorized system to transmit uploaded bytes, including Private Inquiry files, to Cloudmersive for North America processing.

Cloudmersive SDK/response types cannot enter business/domain authority. One adapter maps the fixed API contract into exact CWT `clean`, `malware` or `unavailable` outcomes. Existing Asset scan fields remain the only durable verdict authority.

### 3.2 Tier and file-size convergence

Accepted CWT limits remain exact and are not reduced:

- Public/Inquiry: 12 MiB;
- Import workbook: 10 MiB;
- one Import image/member: 20 MiB; and
- compressed Import archive: 500 MiB.

The current published Free Tier facts (600 calls/month, 1 call/second, 3.5 MB, limited support, North America, evaluation label) make it suitable only for a future authorized bounded Synthetic PoC. It cannot be Production/Staging activation authority or maximum-size proof.

The current public plan-selection page lists Basic with a 1 GB maximum, so Basic / North America remains the Stage 7 activation target. This is a planning target, not a purchase/account/contract fact. Stage 7 must revalidate current terms and exact tier before any external use.

### 3.3 External-use and environment gate

Local/CI uses deterministic fake/development adapters and zero Provider calls. Production and Staging cannot share Cloudmersive accounts, API keys, secret files, quotas or cost identity. If separate accounts require separate paid subscriptions, Stage 7 returns for explicit Owner purchase/access authorization.

Before any Stage 7 real-file validation: verify/authorize current Terms, Privacy/DPA, subprocessors, retention/stateless-processing, exact region, file/rate limits, availability/support, credential separation and spend/cap. Timeout, unavailable, malformed, oversized or indeterminate responses fail closed.

## 4. F-02 exact remediation

### 4.1 Corrected database network model

There are exactly two internal PostgreSQL attachment networks:

1. `production-database`; and
2. `staging-database`.

The one `postgres` service attaches to both. There is no network named `database`, no third/shared database network and no second PostgreSQL instance.

Exact long-running membership is:

| Network | Allowed members only |
| --- | --- |
| `production-database` | `postgres`, `web-production`, `worker-production`, `scheduler-production` |
| `staging-database` | `postgres`, `web-staging`, `worker-staging`, `scheduler-staging` |

Approved one-shot migration/backup/restore commands reuse their environment's scheduler service definition through transient `docker compose run --rm --no-deps` execution and inherit only that environment's networks and secret files.

`proxy` and both Valkey services are prohibited from both database networks. No application service crosses environments. Backend, ingress, edge and Valkey connectivity remain separate.

### 4.2 Assertions, denial tests, rollback and stops

Implementation evidence must prove:

- exactly `production-database` and `staging-database` exist as internal database networks;
- one `postgres` service joins both;
- exact allowlists match;
- proxy and Valkey join neither;
- Production/Staging use different database names/users/password files and SQL grants deny cross-database connection/use;
- Production cannot resolve/connect to Staging app/Valkey endpoints and vice versa; and
- Staging remains normally stopped behind profile/headroom preflight.

The V1.0 singular/disconnected graph is invalid and never a rollback target. Stop on a singular/third/shared database network, second PostgreSQL instance, cross-environment application attachment, proxy/Valkey database membership, shared DB/user/password, missing no-cross-grants or unlisted app/ops member.

## 5. Unchanged boundaries

- One PostgreSQL 18.4 instance remains accepted, with separate Production/Staging databases, users, passwords and no cross-grants.
- Valkey 8.1.9 remains the concrete Rate Limiter selection: one isolated standalone authority per environment, no memory/HTTP/database fallback and no second limiter path.
- No Schema/Migration or new persistent coordination is introduced.
- Public/private/import storage, application-controlled media, publishing, Index, Audit and recovery authorities remain unchanged.
- `O-01`–`O-25` and `X-05`/`X-06` remain Stage 7 `External Validation`; V1.2 supplies preparation hooks only.
- No purchase, account, credential, Provider call, real file, Push, Deploy, DNS or protected-environment action is part of this remediation.

## 6. Technical Lead closure statement

F-01 and F-02 are **addressed by this remediation Candidate for fresh independent Stage 6 planning re-review**. This is not Review PASS, implementation eligibility or self-approval.

Next gate: **fresh independent Stage 6 planning re-review**. Do not start implementation. Stage 7 remains HOLD.
