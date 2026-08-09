# CWT Phase 1B Stage 4A Owner Development Authorization

Status: **OWNER DECISION RECORDED — ARCHITECTURE APPROVED / DEVELOPMENT AUTHORIZED**  
Record version: `1.0`  
Decision date: `2026-08-10` (Asia/Shanghai)  
Frozen baseline preserved: `31c0e405acfdd0d05200d0fb2531e897a541a2c4`  
Frozen tag preserved: `phase-1b-stage3-approved-2026-08-09`

## 1. Decision

The Project Owner authorizes continued Stage 4A P1-02A development within the accepted ADR-0017/ADR-0018 architecture and the frozen Stage 4A text Draft-assistance scope.

This is the controlling current implementation-authorization record. It supersedes earlier current-state text that said Stage 4A development was not authorized or that `PD-04` through `PD-07` had to close before development, testing, or a later release workflow could continue. It does not delete, rewrite, or invalidate the evidence-time conclusions in the earlier PD-04–PD-11 report, questionnaire, submission record, or design-freeze report.

## 2. Provider-evidence disposition and accepted risk

The Owner:

- cancels DeepSeek enterprise-evidence review as a prerequisite gate for Stage 4A development, testing, and later release workflow;
- reclassifies `PD-04` through `PD-07` as non-blocking reference evaluations;
- accepts the current risk that supplier information is not fully closed for the approved AI Draft Assistance, content-generation, and SEO use cases; and
- permits supplier correspondence and future evidence to remain tracked as reference material without restoring an automatic blocking gate.

This disposition does not assert that the earlier evidence gaps were resolved. The historical finding remains accurate for its evidence cut-off; only its gate effect is superseded by this Owner decision.

## 3. Authorized data boundary

Current Stage 4A AI input is limited to:

1. public company information;
2. actor-authorized allowlisted Product structured data;
3. actor-authorized Fabric Knowledge content; and
4. bounded input explicitly supplied by an authorized human for the current task.

Current Stage 4A prohibits:

- private customer Inquiry content or attachments;
- Contact, Organization, CRM, customer-profile, or customer-identifier data;
- unauthorized internal material or sensitive business data;
- unreviewed files, arbitrary URLs, automatic document ingestion, or automatic retrieval;
- credentials, Secrets, raw headers, private URLs, Object Keys, or permanent storage URLs; and
- unknown facts represented as inferred or verified facts.

This accepted supplier-evidence risk does not broaden the data allowlist or weaken record-scoped authorization, factual validation, redaction, Draft, review, Publish, Index, or public-state boundaries.

## 4. Architecture and scope remain frozen

The authorization preserves without change:

- one Provider-agnostic CWT AI Service Layer;
- `ai_model_config` as the bounded selectable configuration authority;
- `ai_runs` as the single work/lifecycle/provenance/cost/disposition authority;
- the four text Draft-assistance use cases only;
- the repository-owned immutable Prompt Registry;
- Draft-only candidates and human review through existing Editorial Revision authority;
- separate Publish and Index controls;
- no runtime fallback;
- no complete RAG, knowledge base, chunking, embedding, vector retrieval, or automatic retrieval;
- no visual AI; and
- no `customer_support`, Customer Service conversation, CRM/Inquiry action, tool, or outbound-message authority.

Any change to these boundaries still requires the architecture/ADR process in `AGENTS.md`.

## 5. Authorized and unauthorized actions

Authorized:

- bounded Stage 4A development under the approved sequential plan;
- Phase A `0020_phase1b_ai_foundation` design, Migration Candidate, local automated tests, isolated real-PostgreSQL verification, evidence integration, and independent review;
- later non-network development phases only after their preceding independent gates and exact scope are satisfied; and
- Synthetic-only local tests using fakes and isolated disposable databases.

Not authorized by this decision:

- a Provider API call or live model request;
- Provider credentials, account mutation, recharge, or spend;
- Staging or Production deployment;
- Production AI configuration, budget, enablement, or use;
- Deploy, Publish, Index, formal data import, or Production action;
- private/customer/Inquiry data transfer; or
- automatic transition from Phase A to Phase B without the Phase A Completion Review gate.

## 6. Current phase state and next gate

At the time this record is integrated, the exact Phase A `0020` Candidate has passed independent Migration-design review and independent Migration Candidate review. Integration management may preserve those exact reviewed identities, record the L-01 acceptance-oracle Erratum, and prepare a Phase A Integration Candidate.

The Integration Manager does not provide the independent Phase A completion decision. The next gate after the Integration Candidate is an independent **Phase A Completion Review**. Phase B must not start automatically.

## 7. Relationship to earlier records

- ADR-0017 and ADR-0018 remain the architecture authorities.
- The Stage 4A Pre-Development Final Review remains the authoritative design-freeze record for `DF-01` through `DF-06`.
- The PD-04–PD-11 report remains an immutable historical account of evidence available at its cut-off.
- The DeepSeek questionnaire and submission record remain supplier-evidence records; response status may remain pending without blocking current Stage 4A work.
- The Synthetic Evaluation Contract remains the quality/data contract; live Provider execution remains separately unauthorized.

No frozen tag or baseline commit is moved, rewritten, or re-tagged by this decision record.
