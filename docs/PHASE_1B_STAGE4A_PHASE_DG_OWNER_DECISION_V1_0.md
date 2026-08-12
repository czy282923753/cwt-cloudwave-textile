# CWT Phase 1B Stage 4A Phase D–G Owner Decision

Status: **CURRENT OWNER AUTHORITY SUPPLEMENT — RECORDED / EFFECTIVE**

Record version: `1.0`

Decision date: `2026-08-12` (`Asia/Shanghai`)

Recorded against accepted Phase C checkpoint: `9006b638ed51f981f7477829086244627c488d6b`

Authority: the Project Owner's current explicit instruction

## 1. Decision

The Project Owner authorizes the Project Coordinator, using the latest `coordinate-task-threads` Skill and the established Stage 4A sequence, to continuously progress and complete Phase D through Phase G design, implementation, testing, remediation, independent review, Fresh Acceptance, Version Management and established acceptance flows without requesting separate start permission for each Phase.

This decision supersedes the earlier inaccurate interpretation that each Phase D–G start required a new Owner authorization or that the formal DeepSeek supplier questionnaire, DPA, security, no-training, processing-region or subprocessor response had to be obtained before Stage 4A or Phase D could continue. Earlier gate reports, questionnaires, submission records and authorization records remain immutable historical audit evidence. Their evidence-time conclusions are not deleted or rewritten.

The established sequence and independent gates remain mandatory:

```text
Phase D Exact Design
  -> Fresh Independent Phase D Exact Design Review
  -> Phase D implementation / controlled Provider validation
  -> independent implementation review and required remediation
  -> Phase E
  -> Phase F protected Staging validation
  -> Phase G final review / Fresh Acceptance / Version Management / Owner checkpoint decision
```

Continuous progression does not permit a task to self-review or self-accept, skip a failed gate, report an unexecuted test as PASS, or start a dependent step before its prerequisite result is accepted under the established flow.

## 2. Controlled external-action authority

The Owner confirms that a DeepSeek API credential exists. This record preserves only that fact; it neither accesses nor verifies the credential and contains no credential value, derivative, fingerprint or account detail.

The Owner authorizes only the external actions necessary for the accepted Stage 4A Phase D–G sequence:

1. bounded real DeepSeek Provider/API validation under the reviewed Phase D contract;
2. the minimum necessary network reads and API calls for that controlled validation; and
3. Phase F deployment and validation in the isolated, access-protected, noindex, Synthetic-only Staging environment.

This authority is not a general network, account or release authorization. Every live action must use the exact reviewed endpoint/model/data/cost contract, least exposure, bounded requests and spend, redacted evidence, and the existing environment and Draft/public-state boundaries.

## 3. Credential and Secret boundary

Credentials and Secrets must never enter code, Git, documentation, reports, callbacks, logs, telemetry, error details, screenshots, test fixtures, Prompt content or any other persistent project file. No Secret-derived fingerprint is evidence.

The credential may be supplied only through a protected environment variable or the existing approved Secret mechanism, with least exposure to the one server-only Provider dispatch boundary. Credential presence checks must not print, serialize or log the value. Missing, invalid, revoked or unavailable credentials fail closed and must not affect manual Draft editing, Product/Content/public reads or other non-AI behavior.

## 4. Supplier assurance and residual risk

The absence of a formal DeepSeek questionnaire response, DPA, no-training commitment, processing-region commitment, cache-disablement commitment, subprocessor list, enterprise security assurance or comparable supplier guarantee is not a prerequisite for the expressly authorized Phase D–G work.

Those absent guarantees are not closed and are not PASS. They remain **Owner-accepted residual risk / unresolved external assurance** for the frozen public-company, allowlisted Product-structured, Fabric Knowledge and bounded explicit-human-input Draft-assistance scope. No implementation, test, real Provider response or Staging result may infer or record:

- cache disablement or zero retention;
- no-training or no-service-improvement use;
- a processing or storage region;
- an executed DPA;
- a complete subprocessor boundary;
- enterprise security, SLA, tenant-isolation or incident-notification guarantees; or
- any other assurance not supported by exact evidence.

New exact supplier evidence may improve the residual-risk record after independent review. Silence, marketing language, generic consumer terms, protocol behavior, or successful API calls do not establish these assurances.

## 5. Preserved frozen scope

This decision does not change ADR-0017, ADR-0018, the accepted Phase C checkpoint, the single `ai_runs` lifecycle/provenance authority, `ai_model_config`, the Provider-neutral `TextAiProvider` boundary, the immutable Prompt Registry, the four Draft-assistance use cases, the five canonical statuses, disabled fallback, explicit context only, or the no-RAG/no-vision/no-Customer-Service boundary.

It grants no authority for AI to infer factual specifications; mutate Product, Company, facility, capacity or certification facts; accept a candidate into a Draft without an authorized human action; Publish; enable Index; change Routes, Redirects, Canonical or Sitemap; approve rights; access customer/private/Inquiry/CRM data; ingest files or URLs; call tools; retrieve external knowledge; or create public state.

No Schema, Migration or ADR change is authorized or required by this decision. A later material need for one returns to the Owner through the established architecture decision process.

## 6. Explicit exclusions

The following remain outside this authority:

- Production, Production data or Production credentials;
- Production Deploy, Production AI enablement or Production spend;
- public release, traffic switch, launch or Production DNS/CDN change;
- Publish, Index, Route/Redirect/public-truth mutation or formal data import;
- unrelated Push, external message, account mutation, recharge or other action outside Stage 4A; and
- P1-02B visual AI, complete RAG, Customer Service, fallback or any unapproved Provider/model/use case.

Production AI remains disabled/unconfigured with a budget of `USD 0.00`. Phase F Staging PASS, if later achieved, does not authorize Production or public release.

## 7. C-002 and C-003

`C-002` and `C-003` remain active and must be interpreted consistently with this current Owner decision. They cannot re-block the expressly authorized Phase D–G design, implementation, testing, remediation, independent review or protected Staging work.

They continue to constrain the scopes they actually govern:

- `C-002` remains a blocker for Production Ready, Production Deploy, release, launch, formal-data import and public-truth enablement until its own requirements are satisfied.
- `C-003` continues to preserve `FEATURE_PRODUCT_IMPORT=false` and the existing Product Import boundary.

Neither condition grants or removes any authority beyond those stated here.

## 8. Relationship to historical records and current next gate

This document is a current authority supplement. Historical evidence-time BLOCKED reports and the 2026-08-10 Owner Development Authorization remain intact as audit records. Where their current-state authorization interpretation conflicts with this document, this later 2026-08-12 Owner decision controls; their factual evidence gaps remain valid.

The accepted Phase C Design and implementation evidence remain immutable. The immediate authorized work is a docs-only Phase D Exact Design based on accepted Phase C. Its next gate is a **Fresh Independent Phase D Exact Design Review in a different task**. Phase D implementation may begin only after that review gate succeeds under the established sequence; it does not require another per-Phase start request.
