# CWT Phase 1B Stage 6 Cloudmersive Restoration and Private-File Transmission Owner Decision Record V1.2

Status: **CURRENT AUTHORITATIVE OWNER DECISION — Cloudmersive direction restored for Stage 6 planning; all actual external use and Stage 7 remain unauthorized**

Date recorded: **2026-08-30**

Owner instruction source: **latest explicit Owner instruction delivered by coordinator thread `01a051a7-d4bd-7b11-ae72-a73c2da43656` to the Stage 6 Technical Lead remediation task**

Failed planning Candidate: `68980a98ac7f8f1b72edfbac30b20ab044b52e97`

Failed independent Review: `docs/PHASE_1B_STAGE6_PRE_DEVELOPMENT_PLANNING_INDEPENDENT_REVIEW_V1_0.md`, review-only commit `e27752053b6a8aad49e5ac3003e247bdd87a595b`

Review finding addressed: **F-01 — concrete Scanner/data-processing direction lacked required Owner authority**

## 1. Chronological authority

The decision history is preserved, not collapsed:

1. `docs/PHASE_1B_STAGE6_CLOUDMERSIVE_BASIC_NORTH_AMERICA_OWNER_DECISION_RECORD_V1_0.md` initially approved Cloudmersive Basic / North America only as a local Stage 6 adapter target.
2. `docs/PHASE_1B_STAGE6_CLOUDMERSIVE_WITHDRAWAL_AND_SELF_HOSTED_SCANNER_OWNER_DECISION_RECORD_V1_1.md` then withdrew Cloudmersive and directed self-hosted evaluation.
3. This V1.2 is the latest Owner decision. It supersedes V1.1 and restores Cloudmersive as the selected malware-scanning Provider direction.

V1.0 and V1.1 remain chronological audit records. Neither is current forward authority. No self-hosted draft or rejected intermediate proposal becomes accepted architecture through this supersession.

## 2. Current decision

The Owner explicitly chooses to continue the **Cloudmersive** direction and permits uploaded file bytes, including **Private Inquiry files**, to be transmitted to and processed by Cloudmersive in **North America** during a later separately authorized external-use stage.

The Owner made this decision after being informed that the Cloudmersive Free Tier was described as:

- North America;
- 600 calls/month;
- 1 call/second;
- 3.5 MB maximum file size;
- limited support; and
- an evaluation plan.

The Owner's permission resolves the Provider, North America processing and Private Inquiry byte-transmission direction. It does not reduce CWT file-size limits and does not turn the Free Tier into a Production/Staging activation tier.

## 3. Tier and file-size decision

CWT preserves these accepted byte contracts:

| File class | Accepted CWT limit |
| --- | ---: |
| Ordinary Public upload | 12 MiB |
| Private Inquiry upload | 12 MiB |
| Import workbook | 10 MiB |
| One Import image/member | 20 MiB |
| Compressed Import archive | 500 MiB |

The Free Tier's published 3.5 MB maximum cannot cover those contracts and is therefore classified only as a future **bounded Synthetic PoC/evaluation option**. It cannot validate maximum-size behavior, cannot be a Production/Staging activation tier and cannot justify lowering an accepted CWT limit.

The current public Cloudmersive plan-selection page, checked on 2026-08-30, lists Basic at a 1 GB maximum file size, 10,000 calls/month, 2 calls/second, North America and a production-starting label. Accordingly, **Cloudmersive Basic / North America remains the Stage 7 activation target**, subject to complete current official/commercial verification before any purchase, account or call. A public plan page is evidence for planning only, not a contractual guarantee or proof that separate environment accounts/subscriptions are available.

## 4. Exact non-authority boundary

This V1.2 decision does **not** authorize:

- purchase, spend, reimbursement, subscription or commercial-term acceptance;
- account, organization, project or API-key creation;
- DPA, Privacy, subprocessor, retention, stateless-processing or data-transfer-term acceptance;
- credential access, custody, rotation or injection;
- a Cloudmersive or other Provider call;
- a Free Tier PoC call, EICAR upload or any real/Synthetic file transmission;
- use of real Inquiry, customer, Product or Production data;
- protected Staging/Production access or mutation;
- DNS, Cloudflare, COS, Sentry, Tencent, Zoho or external monitoring configuration;
- Deploy, Push, Publish, Index or Production-readiness claims; or
- Stage 7 entry or execution.

Stage 6 local/CI validation must use deterministic fake/development transports with zero Provider calls. Startup/readiness must not consume quota or transmit bytes.

## 5. Environment, account and secret boundary

Production and Staging must not share:

- Cloudmersive accounts;
- subscriptions where separate account custody is commercially required;
- API keys or other credentials;
- Docker secret files;
- quota/cost-alert identities; or
- logs/evidence containing Provider identifiers beyond safe environment-tagged metadata.

No account or subscription is assumed to exist. If distinct Production/Staging accounts/keys require two paid subscriptions or different terms, that fact becomes an explicit Stage 7 Owner purchase/access decision. The implementer/operator may not silently reuse an account/key, change Provider/tier/region, accept terms or buy a subscription.

## 6. Stage 7 external-use gate

Before any real-file or Provider validation, a newly authorized Stage 7 task must recheck and obtain applicable Owner authorization for:

1. current Terms of Service and Privacy obligations;
2. applicable DPA acceptance and the current subprocessors list;
3. payload retention/stateless-processing terms and operational evidence;
4. exact North America endpoint/processing region;
5. exact file-size and call-rate limits for the selected API/tier;
6. availability, support and incident/escalation contract;
7. separate Production/Staging account, API-key and quota boundaries;
8. current price, taxes/currency, spend cap and alerting; and
9. safe Synthetic validation scope before any authorized real Private Inquiry test.

If current evidence requires a materially different Provider, tier, region, file contract or account model, stop and return to the Owner. Do not silently substitute or reduce CWT limits.

## 7. F-01 relationship and architecture effect

F-01 required explicit Owner authority for the selected Cloudmersive direction, North America processing and Private Inquiry data transfer. This V1.2 provides that authority while retaining every actual-use gate.

- Provider-neutral `FileScanner` remains the application boundary.
- Cloudmersive response types terminate inside one adapter; business/domain code consumes only typed CWT results.
- Existing Asset scan fields remain the durable result authority.
- No Schema/Migration, scan queue, lease, verdict table or second recovery authority is introduced.
- Scanner unavailable, timeout, malformed, oversized or indeterminate response fails closed and no file releases.
- Cloudmersive Free remains evaluation-only; Basic remains a future activation target, not a purchased fact.

F-01 is therefore **addressed for a fresh independent planning re-review**, not self-approved or accepted by this Technical Lead.

## 8. Terminal boundary

This record is current Owner input to the Stage 6 Planning Remediation Candidate V1.2. It is not implementation acceptance and cannot authorize any external action.

Stage 7 remains **HOLD**.

After accepted Stage 6, all workers stop. **Owner authorization is required before Stage 7.**
