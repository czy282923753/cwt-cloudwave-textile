# CWT Phase 1B Stage 4A — Phase E Coordinator Handoff V1.0

## Document control

| Field | Value |
|---|---|
| Prepared at | 2026-08-17, Asia/Shanghai |
| Prepared by role | Outgoing Project Coordinator |
| Handoff scope | Phase D final accepted baseline and Phase E pre-entry business authority only |
| Package type | Initial, minimal-sufficient coordinator handoff |
| Exact accepted major-phase commit | `de51dff2b519f1ecacfb73e067c9d68361939c29` |
| Accepted freeze reference | annotated tag `refs/tags/phase-1b-stage4a-phase-d-approved-2026-08-17` |
| Phase E pre-entry design/decision source | `2e52d6c0d1e5e8112cb7086945d29a13a2626eba` |
| Current Phase E authority branch | `refs/heads/codex/phase-1b-stage4a-phase-e-pre-entry-owner-decision-v1` |
| Package SHA-256 sidecar | `docs/handoff/PHASE_1B_STAGE4A_PHASE_E_COORDINATOR_HANDOFF_V1_0.md.sha256` |
| Audit status | Not audited |
| Eligible for formal takeover | Not yet audited; incoming Coordinator must verify the exact identities below |

This package intentionally excludes the closed Phase D remediation, Runner, custody, proof-framework and aggregate history. Those items have no live Phase E execution authority. The accepted Phase D freeze record remains the sole concise authority for their terminal disposition.

## Executive status

- Phase D is **complete and frozen** as `ACCEPTED_WITH_OWNER_ACCEPTED_RESIDUAL_RISK`.
- Phase E implementation has **not started** and is **not authorized** by this handoff.
- The Owner has approved **Option A** for Production Prompt v1 authoring and has frozen the business reviewer assignments below.
- The next and only authorized gate after this handoff is a **fresh Prompt Author task** that writes four Production Prompt v1 resources. This handoff does not create that task.
- Phase F, real Provider/API, credentials, external validation, Staging, Production, Push and Deploy remain separately unauthorized.

## 1. Phase D authoritative final state

| Item | Authoritative identity/status |
|---|---|
| Accepted/frozen commit | `de51dff2b519f1ecacfb73e067c9d68361939c29` |
| Tree | `87375a4c5afed67e614fd4496dc20dfb1755a894` |
| Freeze branch | `refs/heads/codex/phase-d-s2-5-route-c-accepted-freeze-v1` |
| Local annotated checkpoint tag | `refs/tags/phase-1b-stage4a-phase-d-approved-2026-08-17` |
| Tag peeled target | `de51dff2b519f1ecacfb73e067c9d68361939c29` |
| Product rollback identity | exact S2.5 `d7655385e37330927c53e60fbb108b56950c9794` |
| Final status | `PHASE_D_STATUS=ACCEPTED_WITH_OWNER_ACCEPTED_RESIDUAL_RISK` |
| Production Ready | `NO` |
| External validation | `NOT_RUN_DEFERRED_TO_PHASE_F` |
| Affected validation credential | `ROTATION_REQUIRED_BEFORE_ANY_REUSE` |

Baseline verification on the exact Phase D worktree passed: full SHA, annotated tag type and peel target, clean worktree, acceptance record and R2 evidence identities. The checkpoint is local only and was not pushed.

Authoritative closure record: [`PHASE_1B_STAGE4A_PHASE_D_ACCEPTANCE_AND_FREEZE_V1_0.md`](../PHASE_1B_STAGE4A_PHASE_D_ACCEPTANCE_AND_FREEZE_V1_0.md).

Phase D has no remaining gate. Do not rerun, repair or reinterpret its formal/aggregate result for Phase E.

## 2. Phase E authoritative starting state

Phase E pre-entry analysis is recorded in exact commit `2e52d6c0d1e5e8112cb7086945d29a13a2626eba`, the sole/direct child of the Phase D freeze. It changes only current planning/docs/evidence and no Product, Schema, Migration, dependency or lock bytes.

Primary design/decision source: [`PHASE_1B_STAGE4A_PHASE_E_PRE_ENTRY_EXACT_DESIGN_OWNER_DECISION_V1_0.md`](../PHASE_1B_STAGE4A_PHASE_E_PRE_ENTRY_EXACT_DESIGN_OWNER_DECISION_V1_0.md).

Evidence manifest: [`PHASE_E_PRE_ENTRY_EVIDENCE_MANIFEST_V1_0.json`](../review-evidence/phase-1b-stage4a-phase-e-pre-entry-owner-decision-v1/PHASE_E_PRE_ENTRY_EVIDENCE_MANIFEST_V1_0.json).

The current Production Prompt manifest is intentionally empty and the generated Production bundle has zero tuples. Phase E cannot enter implementation until the four Prompt resources are authored, hash-bound, Owner-approved and independently reviewed.

## 3. Frozen Owner business authority

The Owner approved the following exact decision on 2026-08-17:

| Decision | Frozen authority |
|---|---|
| Prompt authoring option | **Option A — bounded fresh Prompt-authoring Candidate** |
| Prompt Author | a future **fresh Codex Prompt-authoring task** created by the incoming Coordinator; its real task identity must be recorded before authoring |
| Product reviewer | the Project Owner who approved this handoff, internally bound to coordinator thread `codex://threads/019ff421-33c5-73c2-a0ef-11abaa8a2d37` |
| Content reviewer | the same Project Owner |
| SEO reviewer | the same Project Owner |
| Multiple-authority assignment | explicitly approved |
| Use-case mapping | accepted exactly as recorded in the Phase E pre-entry design |
| Additional constraints | none |

The Owner approval authorizes Prompt authoring and later exact-hash business review only. It is not Prompt-byte approval, Design/security acceptance or Phase E implementation authority.

The four required Prompt tuples are:

1. `product-description-draft@1` → Product reviewer;
2. `seo-content-draft@1` → SEO reviewer;
3. `fabric-knowledge-draft@1` → Content reviewer; and
4. `sourcing-guide-draft@1` → Content reviewer.

Each later approval must bind the exact resource SHA-256, tuple, decision, reviewer identity and date.

## 4. Frozen Phase E architecture, security and business boundaries

- Scope is exactly four integrations: Product Description, SEO title/meta assistance, Fabric Knowledge editorial content and Sourcing Guide.
- AI may create protected Draft candidates only. It may never create factual authority, Publish or enable Index.
- Product Code, composition, GSM, width, MOQ, lead time, inventory, certification/test/performance facts, category/application authority, routes, rights and public approval state remain outside AI input/output/apply authority.
- Product/Content Domain readers are the only business-data input seam. UI and Server Actions do not query or mutate business tables directly.
- Every enqueue and apply reauthorizes the actor and target. Draft/Revision expected versions, run version and candidate hash fail closed on staleness.
- Candidate Apply, run disposition/link and required Audit commit atomically through the owning Product/Content Domain Service.
- Published targets remain approved-revision-only publicly; AI changes go only to the existing Draft/current Draft Revision.
- Inquiry/CRM/customer/PII/private Asset/Secret/arbitrary URL/file/retrieval inputs remain structurally unavailable.
- Phase E adds no Schema/Migration, dependency/lock change, public API route, SEO namespace/URL/Redirect/Canonical/Sitemap/Index change, storage boundary or new ADR.
- Phase E verification is local/synthetic only. No real Secret, database, Provider/API, DNS/non-loopback egress, Staging, Production, Deploy, Publish, Index or formal Product data.
- Do not create a new custody, Merkle/full-tree provenance, Git carrier, permission seal, host-identity, custom Runner or proof-framework subsystem.
- The Phase D formal/aggregate commands are historical evidence, not Phase E gates.

## 5. Work status

| ID | Work | State | Remaining gate |
|---|---|---|---|
| D-FREEZE | Phase D closure | Completed | None |
| E-AUTH | Option A and reviewer assignment | Completed | Preserved by this versioned handoff/authority record |
| E0-AUTHOR | Four Production Prompt v1 resources | Not Started | Fresh Prompt Author creates exact resources, manifest tuples and generated bundle |
| E0-OWNER | Business approval of exact Prompt hashes | Not Started | Owner reviews and approves exact bytes/hashes under the frozen mapping |
| E-DESIGN-REVIEW | Fresh full Design/security review | Not Started | PASS on the exact Prompt/design Candidate |
| E1-E5 | Phase E Product/UI integration | Not Started | Separate explicit implementation authorization after review PASS |
| F-EXTERNAL | Protected Staging/Provider validation | Not Started | Separate Phase F authority; credential rotation before any reuse |

No Phase D work is Partial or open.

## 6. Remaining work register and execution order

| ID | Priority | Task | Acceptance criteria | Owner/role |
|---|---|---|---|---|
| RW-E0-01 | P0 | Fresh Prompt Author writes four immutable Production Prompt v1 resources | exact frozen tuples/variables/schema/policy; UTF-8/LF; no secrets/private data/invented facts/tools/URLs/Provider-specific business behavior; manifest and generated bundle exact | incoming Coordinator dispatches a fresh Prompt Author |
| RW-E0-02 | P0 | Owner business review | each tuple approved against exact SHA-256 by the frozen reviewer mapping | Project Owner |
| RW-E0-03 | P0 | Fresh independent full Design/security review | `REVIEW_POLICY.md` PASS; Prompt/resource, architecture, security and Phase F separation verified | different independent reviewer |
| RW-E1-05 | P1 | Phase E implementation slices E1–E5 | separately authorized Candidate; local/synthetic gates and independent implementation/security review PASS | future implementer/reviewer |
| RW-F-01 | P3 | Phase F protected validation | separate Owner authorization; affected credential rotated before reuse | future Phase F owner |

Execution order is strictly `RW-E0-01 → RW-E0-02 → RW-E0-03 → explicit Phase E implementation decision`. Do not create the later tasks automatically.

## 7. Verification, limitations and risks

- Phase D baseline/tag verification: PASS.
- Phase E pre-entry commit parent/scope/clean state and evidence manifest: PASS in the author task.
- Prompt authoring, Prompt hash approval, Design/security review and Phase E implementation: NOT RUN.
- This handoff is a preparer package, not an independent audit or takeover acceptance.
- The Owner reviewer identity is intentionally represented by the approving Owner authority plus stable coordinator-thread identity; no real name was supplied or inferred.
- No secret value, credential, private path or external action is included.

Main live risk: the incoming Coordinator could mistake Option A approval for approval of as-yet-unwritten Prompt bytes or for Phase E implementation authority. The gates above prevent that conflation.

## 8. Exact incoming-Coordinator reading list

Read in this order:

1. root [`AGENTS.md`](../../AGENTS.md);
2. [`PHASE_1B_STAGE4A_PHASE_D_ACCEPTANCE_AND_FREEZE_V1_0.md`](../PHASE_1B_STAGE4A_PHASE_D_ACCEPTANCE_AND_FREEZE_V1_0.md);
3. this handoff and its adjacent `.sha256` sidecar;
4. [`PHASE_1B_STAGE4A_PHASE_E_PRE_ENTRY_EXACT_DESIGN_OWNER_DECISION_V1_0.md`](../PHASE_1B_STAGE4A_PHASE_E_PRE_ENTRY_EXACT_DESIGN_OWNER_DECISION_V1_0.md);
5. [`PHASE_E_PRE_ENTRY_EVIDENCE_MANIFEST_V1_0.json`](../review-evidence/phase-1b-stage4a-phase-e-pre-entry-owner-decision-v1/PHASE_E_PRE_ENTRY_EVIDENCE_MANIFEST_V1_0.json);
6. [`PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_EXACT_DESIGN_V1_2.md`](../PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_EXACT_DESIGN_V1_2.md), only for the Phase E contracts referenced by the pre-entry design;
7. [`ENGINEERING_GOVERNANCE.md`](../ENGINEERING_GOVERNANCE.md) and [`REVIEW_POLICY.md`](../REVIEW_POLICY.md).

Exact refs/commits required to start:

```text
accepted Phase D commit: de51dff2b519f1ecacfb73e067c9d68361939c29
accepted Phase D tag: refs/tags/phase-1b-stage4a-phase-d-approved-2026-08-17
Phase E pre-entry decision commit: 2e52d6c0d1e5e8112cb7086945d29a13a2626eba
Phase E authority branch: refs/heads/codex/phase-1b-stage4a-phase-e-pre-entry-owner-decision-v1
Product rollback identity: d7655385e37330927c53e60fbb108b56950c9794
```

The incoming Coordinator's first action is to verify this package commit/sidecar and the branch head, then create one fresh Prompt Author task from the exact handoff branch state. Do not create a Design reviewer until the Prompt Candidate and Owner hash decisions exist.

## 9. Outgoing-owner declaration

- [x] Phase D baseline identifiers and accepted tag were reproduced exactly.
- [x] Completed claims are tied to acceptance evidence.
- [x] All known Phase E pre-entry work is listed.
- [x] No secret values are present.
- [x] Phase D closed history is intentionally excluded except for still-binding constraints.
- [x] Audit status remains `Not audited`; this package does not self-approve takeover or Phase E.

Declaration: accurate to the repository evidence and the Owner decision available on 2026-08-17. Preparation stops after this package is hashed and committed. No Prompt Author, reviewer or Phase E implementation task is created by the outgoing Coordinator.
