# CWT Phase 1B Stage 6 Cloudmersive Withdrawal and Self-Hosted Scanner Owner Decision Record V1.1

Status: **SUPERSEDED HISTORICAL OWNER DECISION — preserved for audit; not forward authority**

Date recorded: **2026-08-30**

Superseded by: `docs/PHASE_1B_STAGE6_CLOUDMERSIVE_RESTORATION_AND_PRIVATE_FILE_TRANSMISSION_OWNER_DECISION_RECORD_V1_2.md`

Chronology note: this V1.1 decision superseded V1.0 for a bounded interval, then the latest Owner decision V1.2 restored Cloudmersive. The body below records V1.1 faithfully and must not be used as current Scanner direction.

Owner instruction source: **then-current explicit Owner instruction delivered by coordinator thread `01a051a7-d4bd-7b11-ae72-a73c2da43656` to the Stage 6 Technical Lead remediation task**

Failed planning Candidate: `68980a98ac7f8f1b72edfbac30b20ab044b52e97`

Failed independent Review: `docs/PHASE_1B_STAGE6_PRE_DEVELOPMENT_PLANNING_INDEPENDENT_REVIEW_V1_0.md`, review-only commit `e27752053b6a8aad49e5ac3003e247bdd87a595b`

Review finding affected: **F-01 — the failed Candidate selected Cloudmersive without the required Owner authority**

## 1. Superseding decision

The Owner removes Cloudmersive from the selected and recommended Stage 6 direction. The earlier limited approval of Cloudmersive Basic / North America is withdrawn and must not be relied upon for planning, implementation, external use or later acceptance.

The decision is specific and bounded:

1. Cloudmersive is rejected as the Stage 6 Scanner target.
2. No other hosted third-party Scanner is silently substituted.
3. No external private-file processing is authorized.
4. Malware scanning remains mandatory under the frozen CWT baseline.
5. Scanner unavailable, stale, unreachable or indeterminate remains fail closed before release.
6. Stage 6 may re-plan around the accepted provider-neutral `FileScanner` interface and evaluate a standard self-hosted engine on an isolated Scanner service/host.

This record supersedes every contrary Cloudmersive approval statement delivered earlier in the remediation task. The failed Candidate and failed independent Review remain unchanged audit history.

## 2. Exact non-authority boundary

This decision does **not** authorize:

- a replacement SaaS or other hosted scanning Provider;
- external processing of an Inquiry, Asset, Import member or any other private file;
- purchase, spend, host/VPS order, account creation, subscription, license acceptance or commercial-term acceptance;
- credentials, WireGuard keys, Provider/API calls, real file transfer or signature-mirror access in this planning task;
- an additional Production/Staging host, protected network, firewall, DNS or external configuration;
- Deploy, Push, Staging/Production mutation, formal data, Publish or Index;
- acceptance of a multi-host architecture or a draft ADR by implication; or
- Stage 7 entry or execution.

If the bounded self-hosted direction requires a material infrastructure, cost or architecture choice, the Technical Lead must return `NEEDS_OWNER_DECISION` with options and a recommendation rather than guessing. A later approval may authorize planning architecture only; purchase, deployment and external validation remain separate gates.

Stage 7 remains **HOLD**. Even after accepted Stage 6, a new explicit Owner authorization is required before Stage 7.

## 3. Relationship to F-01

F-01 was framed against the failed Candidate's Cloudmersive Basic / North America selection. The current Owner decision does not cure that choice by approving it; it removes the choice and forbids reliance on the earlier approval.

The one-to-one remediation evidence is therefore:

| F-01 element | Superseding closure evidence |
| --- | --- |
| Unapproved Cloudmersive selection | Cloudmersive is explicitly removed and may appear only as rejected history. |
| North America private-file processing | No external private-file processing is authorized. |
| Separate Provider account/key model | Not applicable to the rejected option; no replacement hosted Provider/account/key is introduced. |
| Mandatory malware scanning | The provider-neutral `FileScanner` boundary and fail-closed release rule remain frozen. |
| Replacement direction | Only a self-hosted, isolated, standard-engine direction may be evaluated. A material host/cost/architecture choice returns to the Owner. |

F-01 is **remediated as removal of the failed selection**, subject to a fresh independent planning re-review of the revised artifacts. This does not by itself resolve any new material decision exposed by the self-hosted evaluation.

## 4. Unchanged architecture and data authorities

- The modular-monolith application boundary, upload/Asset state machine, storage isolation, public media eligibility, Inquiry authorization, Audit, Publish and Index authorities remain unchanged.
- Existing Asset scan fields remain the one durable scan-result authority. No new Schema/Migration, scan queue, lease, verdict table or recovery type is authorized.
- A self-hosted Scanner must receive only already-bounded bytes through the accepted `FileScanner` boundary; it does not become storage, an origin, a public route or a second scan-history authority.
- Development/EICAR fakes remain local/test-only and can never be a Production/Staging fallback.
- Any Scanner failure leaves bytes quarantined/unreleased and preserves existing Recovery/operator retry authority.

## 5. Evidence custody and terminal boundary

The authoritative evidence for this record is the current explicit Owner instruction relayed by the named coordinator thread. No account, contract, credential, Provider response, real file or protected environment was accessed.

This record preserves the V1.1 interval in the Stage 6 planning-remediation chronology. It was superseded before the final V1.2 remediation Candidate and is not implementation acceptance, infrastructure authority, ADR acceptance or Stage 7 authority.
