# CWT Phase 1B Stage 4A Phase E — Pre-Entry Exact Design / Owner Decision V1.0

Status: **NEEDS_OWNER_DECISION / NOT PHASE E ENTRY READY / IMPLEMENTATION NOT AUTHORIZED**  
Document class: **docs-only readiness and decision package; conditional exact design**  
Prepared: `2026-08-17` (`Asia/Shanghai`)  
Exact source baseline: `de51dff2b519f1ecacfb73e067c9d68361939c29`  
Source ref: `refs/heads/codex/phase-d-s2-5-route-c-accepted-freeze-v1`  
Rollback tag: `phase-1b-stage4a-phase-d-approved-2026-08-17`  
Author role: Phase E Pre-Entry Technical Lead / Exact Design Author; not a Phase D implementer or reviewer

## 1. Terminal decision

Phase E implementation is **not ready to enter**. Two material business-authority inputs required by the accepted Phase B design are absent:

| ID | Material gap | Exact observed state | Why it blocks |
| --- | --- | --- | --- |
| `PE-OD-01` | Exact Production Prompt v1 prose | `src/ai/prompts/resources/production/manifest.v1.json` is the exact 35-byte `{"manifestVersion":1,"entries":[]}` plus LF; SHA-256 `0aa71d065f1783f7bc57a5525e2206a52627fd1fdb9601944aff3edbf374c0e6`. The generated Production bundle contains zero tuples; SHA-256 `1e0bbc59446308762ae867f91c42180ac65fb4f6ca8236383124288513e44f5f`. | A Technical Lead must not invent business Prompt prose. No run can resolve the four required immutable Prompt tuples while the authority is empty. |
| `PE-OD-02` | Named and accepted Product / Content / SEO reviewer authority | No accepted Owner record names the human Product, Content and SEO reviewers for Production Prompt v1. Names found in tests are conspicuously test fixtures and are not authority. | Role keys such as `reviewer_publisher` describe application permission, not who is authorized to approve each Prompt's business content. |

The accepted Phase B design already states that exact Production v1 Prompt prose and named Product/Content/SEO reviewers must be supplied and reviewed before Phase E/config bootstrap. This package does not weaken or reinterpret that gate.

No other material architecture decision was found. Subject to closing `PE-OD-01` and `PE-OD-02`, Phase E requires:

- no Schema or Migration;
- no new dependency and no lockfile change;
- no Provider/API, credential, network or external service action;
- no public API route;
- no SEO namespace, URL, Canonical, Redirect, Sitemap or Index change;
- no storage or private-data boundary change; and
- no new ADR or Complexity Approval.

This is a conditional implementation-ready design, not an entry authorization. The only next gate is the Owner decision in Section 2. After that authority is supplied and incorporated into an exact Prompt/design Candidate, a **different fresh independent Design/security reviewer** must return PASS before any Phase E implementation begins.

## 2. Owner decision package

### 2.1 Decision `E-01` — Production Prompt v1 authoring authority

Choose one option:

| Option | Consequence | Risk / tradeoff |
| --- | --- | --- |
| **A — Authorize a bounded Prompt-authoring Candidate (recommended)** | Owner names one Prompt Author and the three reviewer authorities. The author creates exactly four raw v1 resources from the frozen contracts; the reviewers approve exact bytes/hashes by the mapping below. | Best separation of authoring and approval, lowest risk of accidental technical invention; adds one short review gate before the Phase E exact-design Candidate. |
| B — Owner supplies four final exact resources | Owner supplies the four complete JSON resources and the reviewer names/approvals in one authoritative record. | Fastest, but moves detailed Prompt composition and exact variable/body work to the Owner. Technical validation is still required. |
| C — Defer Phase E | Keep the Production manifest empty and all Phase E business integrations unavailable. | Lowest immediate risk; Phase E cannot proceed. |

Synthetic Prompt text must not be copied, renamed or promoted into Production. Whichever option is chosen, the accepted resource contract remains:

- immutable repository resource, UTF-8, LF-terminated, maximum 32,768 raw bytes;
- `resourceFormatVersion=1`, `applicationClass=draft_assistance`, `capability=text`, `locale=en`;
- exact use-case, Prompt ID, version, input/output schema versions, policy version and variable definitions;
- body maximum 30,000 characters, no Secrets, customer/private data, invented facts, tools, URLs or Provider-specific business behavior;
- filename and manifest tuple bind SHA-256 of the exact raw bytes;
- first version is `1`; accepted resources are append-only and are never edited, renamed, repointed or deleted during rollback; and
- generated TypeScript remains a deterministic derivative, never a second authority.

The Prompt Author must preserve these exact application projections and output-policy identities; no alias or additional variable is allowed:

| Prompt tuple | Exact variable keys | Input / output schema | Exact output policy |
| --- | --- | --- | --- |
| `seo-content-draft@1` | `locale`, `page_intent`, `primary_phrase`, `selected_context_json`, `internal_link_candidates_json`, `requested_tone` | `1` / `1` | `draft-seo-content-v1` |
| `fabric-knowledge-draft@1` | `locale`, `topic`, `selected_context_json`, `requested_tone` | `1` / `1` | `draft-fabric-knowledge-v1` |
| `product-description-draft@1` | `locale`, `product_context_json`, `media_placement_refs_json`, `requested_tone` | `1` / `1` | `draft-product-description-v1` |
| `sourcing-guide-draft@1` | `locale`, `guide_intent`, `selected_context_json`, `requested_tone` | `1` / `1` | `draft-sourcing-guide-v1` |

String/JSON maximums may not exceed the existing accepted context limits (`locale` 16 bytes; task fields 500/200/300/500 bytes as applicable; selected context 65,536 bytes, Product context 49,152 bytes, internal-link/media JSON 8,192 bytes). `requested_tone` is an enum over the two accepted values only. Tightening a per-Prompt bound is allowed in the reviewed resource; widening one requires a revised design review.

### 2.2 Decision `E-02` — named reviewer assignments

The Owner must supply stable human names or accepted internal identities for all three authorities. One person may hold more than one authority only if the Owner says so explicitly.

| Prompt tuple | Frozen use case | Required primary approval |
| --- | --- | --- |
| `product-description-draft@1` | `product_description_draft` | named Product reviewer |
| `seo-content-draft@1` | `seo_content_draft` | named SEO reviewer |
| `fabric-knowledge-draft@1` | `fabric_knowledge_draft` | named Content reviewer |
| `sourcing-guide-draft@1` | `sourcing_guide_draft` | named Content reviewer |

The approval record must bind reviewer identity, Prompt tuple, exact resource SHA-256, decision and date. A test user, generic role, code author, AI agent or technical reviewer is not a substitute for the named business reviewer.

### 2.3 Recommended Owner response shape

```text
E-01 option: A | B | C
Prompt Author: <stable name/internal identity, or N/A for option C>
Product reviewer: <stable name/internal identity>
Content reviewer: <stable name/internal identity>
SEO reviewer: <stable name/internal identity>
Multiple-authority assignment explicitly approved: yes | no | N/A
Use-case mapping in Section 4 accepted: yes | changes required
Additional Prompt approval constraints: <bounded text or none>
```

If the Owner intends `editorial_content` to include channels other than `fabric_knowledge`, or intends SEO assistance to apply narrative Blocks rather than only title/meta in Phase E, the response must say so. Either change would require a revised scope/design decision before implementation.

## 3. Exact accepted handoff and Phase E source

### 3.1 Phase A–D identities

| Phase | Accepted Product/design identity | Separate review/checkpoint evidence | Phase E interpretation |
| --- | --- | --- | --- |
| A | Integration HEAD `717cbac284350ec23f786ee239a354085ee0d827` | `docs/PHASE_1B_STAGE4A_PHASE_A_ACCEPTANCE_AND_PHASE_B_ENTRY_V1_0.md` | Accepted `0020` Schema/Migration foundation; immutable. |
| B design | V2.2 design Candidate `156cbafc061d36ce2395529a3150b0c974f3c603`; design acceptance commit `9aa9735f422975780585e62eaec1a4759f9894c9` | checkpoint-record commit `1bb23e8d97e49d25ae5446d22a14202a21ed0f4a` is a separate docs record and is not required in Product ancestry | Four registry IDs, context/output contracts, immutable Prompt authority and server/client boundary are controlling. |
| B implementation | exact Candidate `4a053c0fa9449588e88f2b8519e74e08b1b59956`; accepted checkpoint `cc5715f4a9eb07293bf932cfbd822bfa6bf14a45` | `docs/PHASE_1B_STAGE4A_PHASE_B_IMPLEMENTATION_GATE_ACCEPTANCE_RECORD_V1_0.md` | Provider-neutral foundation is accepted. |
| C design | corrected design Candidate `21662c2c110f17cd095249fe91c2c019f6f508ab` | independent design PASS `40b05d81e503e7d092c99b33bd03cef883f4f162` | Durable run design remains accepted evidence. |
| C implementation | accepted checkpoint/base `9006b638ed51f981f7477829086244627c488d6b` | independent implementation re-review `5d7371c0b83d0a90c271b403c392b8a978411bd4`; later Owner authority records `9006b638...` as accepted | Single `ai_runs` lifecycle, Worker and disposition schema are reused; Phase C is not reopened. |
| D Product rollback | exact S2.5 `d7655385e37330927c53e60fbb108b56950c9794` | C2 `573f0b75013e8fb55ce10ecf5bd54ecc3934beef`; R2 `1f611b5f2433d80d3e0a6bc03a05f4af670623f5` | Exact executable Product rollback identity only; no Phase D rerun or repair. |
| D freeze | `de51dff2b519f1ecacfb73e067c9d68361939c29`, tree `87375a4c5afed67e614fd4496dc20dfb1755a894`, sole parent exact R2 | local annotated tag `phase-1b-stage4a-phase-d-approved-2026-08-17`; acceptance file SHA-256 `c0ea7749ed8fca3cbbad55aa1c133b317d8a922eff1d5fbd6fec3295c184da13` | **Sole Phase E source baseline.** Status remains `ACCEPTED_WITH_OWNER_ACCEPTED_RESIDUAL_RISK`. |

The Phase E source is the exact Phase D freeze, not S2.5 and not a review branch. The Product ancestry contains the accepted A/B/C Product identities. Separate independent review/checkpoint commits remain referenced evidence and are not inserted into or used to rewrite that ancestry.

### 3.2 Preserved Phase D truth

- The Phase D formal/aggregate result and five Owner-accepted residual obligations remain exactly as frozen.
- No Phase D Gate, Provider validation, database action, formal runner, proof, custody or aggregate process is rerun by this package.
- The affected validation credential remains `ROTATION_REQUIRED_BEFORE_ANY_REUSE`; it is not inspected, read, rotated or used here.
- That credential and any real Provider/Staging authorization belong to the later Phase F path. They are not Phase E inputs.

## 4. Exact Phase E scope and stable ID mapping

The user-facing names map to the frozen Production registry without adding aliases or a fifth use case:

| User-facing integration | Stable registry ID | Exact target | Phase E apply surface |
| --- | --- | --- | --- |
| `product_description` | `product_description_draft` | Product Draft or current Product Draft Revision, English only | name/summary, allowlisted narrative Blocks, feature/FAQ proposals and eligible media Alt/Caption only; never Product Code or factual columns |
| SEO title/meta assistance | `seo_content_draft` | Product or Content Draft/current Draft Revision, English only | SEO title and meta description only in Phase E; Route, Slug, Canonical, focus keyword, intent owner, Index and narrative Blocks are unchanged |
| `editorial_content` | `fabric_knowledge_draft` | Content channel exactly `fabric_knowledge`, English Draft/current Draft Revision | title, summary/excerpt and allowlisted narrative Blocks |
| `sourcing_guide` | `sourcing_guide_draft` | Content channel exactly `china_sourcing_guide`, English Draft/current Draft Revision | title, summary/excerpt and allowlisted narrative Blocks |

`china_textile_guide`, Static Pages, Applications, Taxonomy, Fabric Library structured values, Product facts, Company Facts and public SEO settings are not additional Phase E targets. An output field not mapped above remains protected candidate evidence and cannot be saved by a generic fallback.

## 5. Current-code audit and root-cause findings

| ID | Accepted/current seam | Required Phase E convergence | Classification |
| --- | --- | --- | --- |
| `PE-M01` | `DraftAssistanceCommandV1` has use case, actor, target, selectors and optional explicit input, but the context builder hard-codes only tone and emits empty task/link/media values. | Add a closed discriminated task contract and reader-validated selected internal-link/media identities. Keep all existing size limits and Prompt variable names. | Required implementation slice; no Owner/ADR decision. |
| `PE-M02` | Product, Fabric Content and Company Fact context is currently queried directly from the AI composition. | Replace direct business-table reads with injected Product and Content Domain reader ports using the same read-only/enqueue transaction scope. No UI/Server Action may query business tables. | Required security/architecture convergence; no new authority. |
| `PE-M03` | Fabric narrative reads `content_localizations.body`, while the current editor authority writes `structured_blocks`; `body` may be empty or stale. | The Content reader parses the authoritative structured Block document and emits bounded plain narrative text. Empty fields remain absent. | Required correctness fix; no Schema change. |
| `PE-M04` | For `editorial_revision`, AI availability/enqueue uses stable lineage `editorial_revisions.version_number` as `expected_target_version`. Product/Content mutation services use the parsed snapshot `draftVersion` as the optimistic edit fence. | Use the validated Product/Content revision snapshot `draftVersion` everywhere AI snapshots, reconstructs and later applies a Draft Revision. `version_number` remains lineage order only. Existing Phase C/D evidence is not rewritten. | Material forward correctness fix inside Phase E; accepted contracts already imply the Draft edit version. |
| `PE-M05` | `AiRunRepositoryV1` implements read/cancel/retry/reject. Schema columns already support `accepted`/`accepted_with_edits` and direct-target/Revision links, but Production has no owning apply port. | Add one transaction-bound disposition port called only by Product/Content owning Domain Services. Target mutation, run disposition/link and required Audit commit all or none. | Required integration slice; no Schema/Migration. |
| `PE-M06` | No Product/Content AI panel or Server Actions exist. | Add explicit enqueue/read/cancel/retry/reject/apply actions and one reusable candidate/Diff panel on the existing Product and Content admin detail pages. | Required UI slice. |
| `PE-M07` | Current public-bundle check proves public-client absence but not the Phase E real-build server presence created by business integration. | Extend the existing build/bundle check only: require the accepted AI server marker and Production Prompt bundle marker in server output, and continue to require their absence from public client output. | Required proportional gate; no new proof framework. |
| `PE-OD-01/02` | Production Prompt authority and named reviewers are absent. | Owner decision and exact reviewed Prompt bytes. | Blocking external business authority. |

The design fixes causes, not symptoms: authoritative revision edit version, authoritative structured Content text, domain-owned readers and one atomic target/run/Audit mutation replace the unsafe seams. No compatibility reader, parallel context path, generic mutation DTO or second AI history is added.

## 6. Exact interfaces

The names below are the required Phase E contract shape. An implementation may use equivalent local symbol names only if the independent design reviewer confirms identical ownership and closed fields.

### 6.1 Enqueue task contract

`DraftAssistanceCommandV1` gains one required `task` discriminated union:

```ts
type DraftAssistanceTaskV1 =
  | {
      readonly kind: "seo_content_draft";
      readonly tone: "concise_professional_b2b";
      readonly pageIntent: string;          // 1..500 UTF-8 bytes
      readonly primaryPhrase?: string;      // 1..200 UTF-8 bytes
      readonly selectedInternalLinkIds: readonly string[]; // 0..12 UUIDs
    }
  | {
      readonly kind: "fabric_knowledge_draft";
      readonly tone: "neutral_editorial";
      readonly topic: string;               // 1..300 UTF-8 bytes
    }
  | {
      readonly kind: "product_description_draft";
      readonly tone: "concise_professional_b2b";
      readonly selectedMediaPlacementIds: readonly string[]; // 0..12 UUIDs
    }
  | {
      readonly kind: "sourcing_guide_draft";
      readonly tone: "concise_professional_b2b";
      readonly guideIntent: string;         // 1..500 UTF-8 bytes
    };
```

`task.kind` must equal `command.useCase`. Unknown keys, duplicate IDs, empty required strings, wrong role/target/channel and excess cardinality fail before durable enqueue. `idempotencyKey` remains one client-created UUID per explicit enqueue; browser resubmission replays the same request, while manual retry advances the same run.

The existing selector field allowlists remain closed. Product Code is not added to any selector, DTO, context, Prompt variable, output schema, Diff or Audit summary.

### 6.2 Domain reader ports

The AI application receives two injected, transaction-scoped ports:

```ts
interface ProductAiDraftReaderV1 {
  readTargetSnapshot(input: ProductAiTargetReadV1): Promise<AiServiceResult<ProductAiTargetSnapshotV1>>;
  readSelectedStructuredContext(input: ProductAiContextReadV1): Promise<AiServiceResult<DraftContextSourceDtoV1>>;
  readSelectedMediaPlacements(input: ProductAiMediaReadV1): Promise<AiServiceResult<readonly MediaPlacementAliasV1[]>>;
}

interface ContentAiDraftReaderV1 {
  readTargetSnapshot(input: ContentAiTargetReadV1): Promise<AiServiceResult<ContentAiTargetSnapshotV1>>;
  readSelectedFabricContext(input: ContentAiContextReadV1): Promise<AiServiceResult<DraftContextSourceDtoV1>>;
  readSelectedPublicCompanyFact(input: CompanyFactAiContextReadV1): Promise<AiServiceResult<DraftContextSourceDtoV1>>;
  readSelectedInternalLinks(input: InternalLinkAiReadV1): Promise<AiServiceResult<readonly InternalLinkAliasV1[]>>;
}
```

Rules:

- readers execute through the supplied AI read scope/transaction; they do not open a second database transaction or use client-provided role as authority;
- actor is reloaded from `users`, active status and exact role are rechecked before distinguishable target/source results;
- Product source fields remain exactly the accepted 13 selectors; Company Fact fields remain exactly four; Fabric fields remain `title`, `excerpt`, `narrativeText`;
- Product Code, route/slug, private Asset identity/location, Inquiry/CRM/customer/analytics data, credentials, arbitrary files/URLs and unknown fields are absent from DTO types;
- `narrativeText` is derived from `parseBlockDocument(structuredBlocks, "content")` and the existing bounded plain-text projection, not legacy `body`;
- media/link IDs are deliberately selected, current, target-related and authorization-checked; they become opaque `media_XX` / `link_XX` aliases in stable order;
- current Product/Content Draft uses `editor_document_version`; a current Draft Revision uses parsed snapshot `draftVersion`; and
- every selected source's authoritative version/time is rechecked inside the enqueue transaction before its sanitized value is serialized.

### 6.3 Candidate read and Diff contract

The authorized read projection keeps the current lifecycle/candidate data and adds no raw Prompt, Provider payload, Secret, target private data or Object Key. The Server Action returns only the authorized run projection plus a target-owned safe `before` projection needed for Diff.

The client panel maintains a non-authoritative reducer:

```ts
type CandidateDecision = "pending" | "accepted" | "rejected";

interface CandidateReviewStateV1 {
  readonly candidateHash: string;
  readonly decisions: Readonly<Record<string, CandidateDecision>>;
  readonly edits: Readonly<Record<string, string>>;
  readonly undoStack: readonly CandidateReviewSnapshotV1[];
}
```

The panel may preview, accept/reject individual proposal nodes, edit accepted narrative text and undo local decisions. It must not place candidate values into the ordinary autosave document before the explicit apply command succeeds. Existing locked target Blocks remain byte-equal and in their original positions. Candidate Blocks receive server-derived deterministic IDs from `(runId, candidate path)`; the client cannot choose target IDs or relations.

Whole-candidate Reject writes the existing `rejected` disposition. Per-node rejection followed by Apply is `accepted_with_edits`. `accepted` is allowed only when every applicable proposal is applied without text, order or selection change. Any edit, omission, reordering or partial acceptance is `accepted_with_edits`.

The field mapping is closed:

| Use case / candidate field | Existing Draft/Revision target | Mapping rule |
| --- | --- | --- |
| Product `displayNameProposal` | Product localization `name` / Product `editorial_blocks.name` | trim and validate through the existing Product name rule |
| Product `summaryProposal` | `short_description` / `editorial_blocks.shortDescription` | empty remains null; no placeholder |
| Product `descriptionBlocks` | Product `BlockDocument` | only accepted narrative Block kinds; insert at an operator-selected unlocked boundary; existing locked Blocks remain in place |
| Product `featureProposals` | one generated `feature_list` Block | accepted items only; absent or all-rejected creates no empty Block |
| Product `faqProposals` | one generated `faq` Block | accepted complete question/answer pairs only; absent or all-rejected creates no empty Block |
| Product `mediaTextProposals` | Alt/Caption of the exact selected current Product media placement | `media_XX` resolves server-side; no Asset/relation/right/visibility/role creation or change |
| SEO `titleProposal` | existing target `seo_metadata.title` / current Draft Revision `seo.title` | Product/Content owner writes Draft only |
| SEO `metaDescriptionProposal` | existing target `seo_metadata.meta_description` / current Draft Revision `seo.metaDescription` | Product/Content owner writes Draft only |
| SEO `outline`, `blocks`, `internalLinkSuggestions` | none in Phase E | visible as protected planning candidate only; Apply cannot map them |
| Fabric/Sourcing `titleProposal` | Content localization/revision `title` | current exact channel must still match |
| Fabric/Sourcing `summaryProposal` | Content localization/revision `excerpt` | empty remains null |
| Fabric/Sourcing `blocks` | Content `BlockDocument` | only accepted narrative Block kinds at operator-selected unlocked boundaries |
| Fabric/Sourcing `outline` | none in Phase E | visible as protected planning candidate only; Apply cannot map it |

For a published Product, editorial, SEO and media-text changes are merged into the one current Product Draft Revision using its existing `editorial_blocks` base plus pending-change representation. For published Content, title/excerpt/Blocks/SEO are merged into the one current structured Content Draft Revision. No second Revision is created when a current Draft Revision exists, and an `in_review` Revision is never edited.

### 6.4 Atomic apply commands

Product and Content own separate commands with the same closed envelope:

```ts
interface ApplyAiDraftCandidateV1 {
  readonly runId: string;
  readonly expectedRunStateVersion: number;
  readonly candidateHash: string;
  readonly expectedTargetVersion: number;
  readonly expectedRevisionId: string | null;
  readonly expectedRevisionDraftVersion: number | null;
  readonly decisions: readonly CandidateNodeDecisionV1[];
  readonly qualityRating: 1 | 2 | 3 | 4 | 5 | null;
  readonly qualityLabels: readonly AiQualityLabelV1[];
  readonly qualityComment: string | null;
}

interface CandidateNodeDecisionV1 {
  readonly candidatePath: string;           // exact path present in stored candidate
  readonly decision: "accepted" | "rejected";
  readonly editedText?: string;             // only for an evidence-text leaf
  readonly insertAfterBlockId?: string | null; // only for a top-level candidate Block
}
```

The client never supplies a full target snapshot, disposition, applied version, actor identity, Product Code, facts, routes, rights, Publish or Index state. Unknown/duplicate candidate paths, edits on non-text nodes, incomplete FAQ pairs, an insertion anchor that is absent/locked/stale, or any decision for a Section 6.3 preview-only field fails closed. The Domain Service reconstructs the final proposal from the stored protected candidate and allowlisted decisions.

One `runGovernedMutation` transaction performs this exact order:

1. resolve the current authenticated actor and require Product/Content `write` authority for the authoritative target entity;
2. lock the direct Draft target or current Draft Revision and validate target identity, locale, editable status, channel and expected edit version;
3. lock/read the run through `AiCandidateDispositionPortV1` and require `draft_ready`, `not_evaluated`, exact run state version, candidate hash, target association, expected target version and current authorization;
4. revalidate stored candidate schema, evidence/factual policy, selected media/link aliases and every existing locked Block;
5. map only the Section 4 fields and execute the existing Product/Content Draft/Revision mutation kernel without a nested transaction or a second writer;
6. re-read the new direct `editor_document_version` or Revision `draftVersion`;
7. write `accepted` or `accepted_with_edits`, evaluator, quality fields and exactly one valid `applied_target_version` or `applied_revision_id` + `applied_revision_version`; and
8. write required `ai.run.candidate_applied` Audit and commit all changes together.

Any stale run/target/revision, candidate mismatch, invalid decision, locked-Block drift, authorization loss, Audit failure or concurrent winner rolls back both target and run changes. A replay after success returns the existing applied link; it never performs a second Draft mutation.

Reviewer/Publisher may inspect and reject/evaluate an authorized run under the accepted run policy, but cannot apply candidate content because Product/Content `write` authority is absent. Publish and Index remain separate later human actions.

### 6.5 Server Actions and UI state

Server Actions only parse, resolve the authenticated user, call the service, translate typed outcomes, and refresh the existing detail page. They never trust a client actor/role, query or mutate business tables, call a Provider, or expose raw errors.

Required user feedback:

| Durable state | UI behavior |
| --- | --- |
| `pending` | queued, cancel available, no candidate controls |
| `processing` | processing, safe cancel request available, no candidate controls |
| `draft_ready` | candidate, before/after Diff, per-node decisions, local Undo, whole reject and explicit Apply |
| `failed` | safe typed message; manual retry only when current retry policy permits |
| `cancelled` | terminal cancelled message; late result never appears as candidate |

Polling is bounded Server Action refresh with stop on terminal/draft-ready state and page unmount. No WebSocket, browser queue, public API route, persistent UI state or new coordination mechanism is added.

## 7. Phase E implementation slices

These slices are sequential after the Owner decision and independent design/security PASS:

| Slice | Deliverable | Exit condition |
| --- | --- | --- |
| `E0` | Exact four reviewed Production Prompt v1 resources, manifest tuples and generated bundle | exact bytes/hashes approved by named reviewers; prompt bundle/history checks PASS; configurations remain disabled |
| `E1` | task contract, authoritative Revision `draftVersion` convergence and Product/Content Domain readers | no direct AI composition business-table read; all source/target/channel/version/role tests PASS |
| `E2` | explicit enqueue/read/cancel/retry/reject Server Actions and lifecycle panel | no implicit enqueue; five-state UI and disabled/manual degradation tests PASS |
| `E3` | candidate mapper, before/after Diff, per-node decisions, lock and local Undo | no autosave before Apply; locked Blocks and forbidden output cannot change |
| `E4` | Product/Content atomic apply and run disposition port | target + run link + required Audit all-or-none under stale/race/Audit-failure tests |
| `E5` | four page integrations and proportional gates | exact use-case/channel/field matrix, full local suite, real build server-presence/public-client-absence PASS |

No slice may call or configure DeepSeek, read the affected credential, access Staging/Production, deploy, import formal data, Publish or enable Index.

## 8. Conditional closed implementation allowlist

This allowlist becomes executable only after `PE-OD-01/02` close and the exact four Prompt hashes replace the placeholders. Any additional path is `NEEDS_OWNER_DECISION` unless a fresh independent design review proves it is a test/report-only consequence that does not broaden authority.

### 8.1 Existing files permitted to change

```text
package.json                                      # scripts only; no dependency key/value change
scripts/check-public-bundle.mjs
src/ai/applications/draft-assistance/contracts.ts
src/ai/applications/draft-assistance/facade.ts
src/ai/applications/draft-assistance/context.ts
src/ai/applications/draft-assistance/composition.ts
src/ai/applications/draft-assistance/read-scopes.ts
src/ai/runs/contracts.ts
src/ai/runs/repository.ts
src/catalog/product-service.ts
src/content/content-service.ts
src/app/admin/products/[id]/page.tsx
src/app/admin/contents/[id]/page.tsx
src/ai/prompts/resources/production/manifest.v1.json
src/ai/prompts/generated/production-prompt-bundle.generated.ts
src/public-site/public-bundle-check.test.ts
src/ai/applications/draft-assistance/context.test.ts
src/ai/applications/draft-assistance/read-scopes.type.test.ts
src/ai/runs/repository.integration.test.ts
src/catalog/product-service.integration.test.ts
src/content/content-service.integration.test.ts
```

`package.json` may only remove the exact Phase D lineage/formal checker from the active general `check` chain after its relevant live boundaries are covered by ordinary tests and the existing real-build bundle check. The historical command/file remains available as frozen Phase D evidence; it is not rerun or represented as Phase E evidence. This is replacement, not weaker dual authority.

### 8.2 New files permitted

```text
src/catalog/product-ai-context-reader.ts
src/catalog/product-ai-context-reader.integration.test.ts
src/catalog/product-ai-candidate-application.integration.test.ts
src/content/content-ai-context-reader.ts
src/content/content-ai-context-reader.integration.test.ts
src/content/content-ai-candidate-application.integration.test.ts
src/editorial/ai-candidate-diff.ts
src/editorial/ai-candidate-diff.test.ts
src/admin/ai-actions.ts
src/admin/ai-actions.integration.test.ts
src/admin/components/ai-draft-assistance-panel.tsx
src/admin/components/ai-draft-assistance-panel.test.tsx
src/admin/phase-e-ai-boundaries.static.test.ts
src/ai/applications/draft-assistance/phase-e-integration.test.ts
src/ai/prompts/resources/production/product-description-draft/v1.<approved-sha256>.json
src/ai/prompts/resources/production/seo-content-draft/v1.<approved-sha256>.json
src/ai/prompts/resources/production/fabric-knowledge-draft/v1.<approved-sha256>.json
src/ai/prompts/resources/production/sourcing-guide-draft/v1.<approved-sha256>.json
```

The existing `src/server/ai/phase-d-provider-composition.ts` is reused byte-unchanged as the sole server composition. `src/admin/ai-actions.ts` is the only new runtime importer besides `scripts/process-ai-runs.ts`. In local/test execution it remains fail-closed unless an approved injected fake and test-owned configuration are used by tests; Phase E never enters the staging-only DeepSeek branch.

### 8.3 Explicitly forbidden paths and changes

```text
drizzle/**
src/db/schema/**
pnpm-lock.yaml
dependency/devDependency/peerDependency changes
src/integrations/ai/**
src/server/ai/phase-d-provider-composition.ts
scripts/process-ai-runs.ts
scripts/verify-ai-architecture.ts
test-fixtures/ai-architecture/graph-faults.phase-d.synthetic-only.v1_0.json
docs/review-evidence/phase-1b-stage4a-phase-d-*/**
public Product/Content/SEO route, Redirect, Canonical, Sitemap or eligibility code
Upload, Asset, storage, Inquiry, Contact, Organization, CRM or analytics code
config/env/Secret/credential files
historical Migration, Snapshot, Journal, acceptance, review or evidence files
```

No new package, public endpoint, table, queue, cache, WebSocket, fallback, RAG, retrieval, tool, file ingestion, visual AI or second Prompt/config/run/Draft authority is allowed.

## 9. Acceptance and gate matrix

### 9.1 Authority gate

| ID | Required result |
| --- | --- |
| `E-AUTH-01` | exactly four v1 Production Prompt resources exist; IDs/use cases/variables/schema/policy agree with accepted contracts; manifest and generated bundle are exact derivatives |
| `E-AUTH-02` | named Product/Content/SEO reviewers approve exact resource hashes under Section 2 mapping |
| `E-AUTH-03` | a different fresh Design/security reviewer returns PASS on the exact Phase E design Candidate before implementation |

### 9.2 Authorization and context

| ID | Required result |
| --- | --- |
| `E-SEC-01` | Admin/matching Editor may explicitly enqueue within target scope; Reviewer/Publisher, unrelated roles and anonymous users cannot enqueue |
| `E-SEC-02` | every action re-resolves active user/role and target scope; client actor/role and hidden UI are never authority |
| `E-CTX-01` | Product/Content readers emit only the accepted closed fields and exact selected sources; Product Code is absent at type, serialization and output-apply boundaries |
| `E-CTX-02` | Inquiry/CRM/customer/PII/private Asset/Secret/arbitrary URL/file/retrieval inputs are structurally unavailable |
| `E-CTX-03` | Fabric narrative derives from current structured Blocks; direct Draft uses `editor_document_version`; Revision uses snapshot `draftVersion` |
| `E-CTX-04` | selector/source/target version or authorization races fail before enqueue; exact idempotent replay does not duplicate a run |

### 9.3 Lifecycle and UI

| ID | Required result |
| --- | --- |
| `E-UI-01` | `pending`, `processing`, `draft_ready`, `failed`, `cancelled` render exact safe feedback and controls |
| `E-UI-02` | cancellation/retry operate on the same run with state-version fences; late cancelled result never becomes candidate |
| `E-UI-03` | before/after Diff, per-node accept/reject, locked-Block preservation and local Undo are deterministic |
| `E-UI-04` | no candidate reaches ordinary autosave or target state before explicit Apply succeeds |
| `E-UI-05` | disabled/missing config/provider keeps manual editing healthy and exposes no raw failure, Prompt, candidate to unauthorized users or credential detail |

### 9.4 Atomic apply and business boundaries

| ID | Required result |
| --- | --- |
| `E-APP-01` | each use case applies only the Section 4 field/channel/target subset; unmapped output fails closed or remains unapplied |
| `E-APP-02` | stale target, stale Revision `draftVersion`, stale run state, candidate hash mismatch, authorization loss and locked-Block drift all produce zero target/run mutation |
| `E-APP-03` | target mutation, accepted/accepted-with-edits disposition/link and required Audit are one transaction; injected Audit failure rolls back all three |
| `E-APP-04` | two concurrent Apply attempts yield exactly one target version increment and one disposition; retry after committed success is read-only idempotent |
| `E-APP-05` | AI never writes Product Code, factual fields, Company Facts, routes, rights, Publish, Index or public approved Revision state |
| `E-APP-06` | published targets receive changes only in the current existing Draft Revision; public reads remain on the approved revision until ordinary later review/publish |

### 9.5 Build and regression gates

Run only local/synthetic actions:

```text
pnpm check:ai-prompts
pnpm lint
pnpm typecheck
pnpm test:run
pnpm build
pnpm check:bundle
```

Additionally run focused Product/Content/run atomicity cases on one disposable local PostgreSQL database with synthetic fixtures and independent connections. Record no database content in Git.

`pnpm check:ai-architecture` and the Phase D formal/aggregate commands are **not Phase E gates and must not be rerun**. The exact-lineage Phase D checker is preserved as historical frozen evidence. Phase E uses ordinary Vitest boundary tests plus the existing real-build bundle checker; no new custody, Merkle/full-tree provenance, Git-object carrier, permission sealing, host identity, custom formal runner or proof framework is created.

The bundle result must prove both:

1. server output contains the accepted AI server boundary marker, Production Prompt bundle marker and four approved Prompt tuple identities; and
2. public client output contains none of those markers, Prompt bytes, Provider adapter/SDK, `src/ai/testing`, private identifiers or server-only modules.

No Provider call, external network, real Secret, Staging/Production database, deployment, DNS, Publish, Index, formal Product data or Phase D formal action is part of Phase E verification.

## 10. Security, SEO and compatibility analysis

### Security and data integrity

- Context remains explicit and allowlisted; domain readers are the only business-data seam.
- Server Actions have no direct business-table writer and never accept actor authority from the browser.
- Provider output remains untrusted protected candidate data until a fresh authorized atomic Apply.
- Product Code and forbidden fact fields are outside both input and output/apply contracts.
- Private Inquiry files and every customer/CRM identifier remain structurally unreachable.
- Existing public/private/import storage separation is unchanged; Phase E reads no file bytes and creates no Asset relation.
- Required Audit failure rolls back the target and run disposition together.
- Client and analytics payloads contain no PII, target private identifier, Prompt/candidate body or private Asset identifier.

### SEO / URL / public state

- No route, Slug, Redirect, Canonical, Sitemap, intent ownership or Index mutation is added.
- SEO title/meta proposals save only into the target's ordinary Draft or existing Draft Revision.
- Public reads remain approved-revision-only and continue to use the authoritative real-Product eligibility predicate.
- Search/filter/noindex rules are unchanged. Synthetic fixtures remain conspicuously synthetic and noindex.

### Compatibility

- AI remains optional and disabled/fail-closed without approved configuration.
- Manual Product/Content editing, Revision, review, Publish, Index and public reads remain healthy when AI is absent, cancelled, failed or unavailable.
- Existing durable rows/configuration remain readable; no historical run is rewritten.
- Existing output/context schema version remains `1`; unsupported stored/candidate versions fail closed.
- Refine remains an Admin shell and does not enter the public bundle.

## 11. Rollback boundary

Operational rollback is primary:

1. keep global AI/configuration disabled or disable the selected configuration;
2. stop new claims if a Worker is running;
3. allow in-flight work only to settle as protected unaccepted output or typed failure;
4. retain `ai_model_config`, `ai_runs`, Audit and accepted immutable Prompt resources;
5. keep manual editing and all non-AI/public behavior available; and
6. do not replay, delete or rewrite historical runs.

Implementation should separate the approved Prompt-authority commit from Phase E integration commits. Accepted Prompt resources remain append-only during rollback. Application integration can be forward-reverted to the exact Phase D freeze behavior while leaving accepted Prompt bytes and existing additive `0020` data intact. Draft/Revision changes already explicitly accepted by humans remain ordinary Draft history and are not silently undone; a later ordinary authorized edit may supersede them.

There is no down Migration, Schema rollback, dependency rollback, route rollback, public-state rollback or Phase D checkpoint rewrite.

## 12. Active-document synchronization

The following active, non-historical planning/status documents were stale at “Phase A accepted / Phase B not started” and receive only a current-status addendum in this docs Candidate:

- `docs/PHASE_1B_STAGE4_PRE_DEVELOPMENT_IMPLEMENTATION_PLAN.md`;
- `docs/PHASE_1B_IMPLEMENTATION_PLAN.md`; and
- `docs/PHASE_1B_ACCEPTANCE_MATRIX.md`.

Historical descriptions, accepted Phase A–D artifacts, manifests, reviews and evidence remain byte-unchanged. The addenda record only:

- A–C accepted checkpoint identities;
- Phase D exact accepted freeze and residual status;
- Phase E pre-entry `NEEDS_OWNER_DECISION` for Production Prompt/reviewer authority; and
- Phase F/external actions remain outside Phase E.

## 13. Evidence and stop rule

The concise evidence manifest is:

`docs/review-evidence/phase-1b-stage4a-phase-e-pre-entry-owner-decision-v1/PHASE_E_PRE_ENTRY_EVIDENCE_MANIFEST_V1_0.json`

This task stops after committing this docs/evidence-only decision package and sending the required coordinator callback. It does not:

- self-approve Phase E entry;
- create Prompt prose or reviewer identities;
- modify Product/source, Schema/Migration, package/lock, Provider/config/credential, accepted Phase D artifacts or historical evidence;
- run Phase D formal actions, Provider/network/database/build/test actions; or
- start Phase E implementation or Phase F.

Terminal status: **NEEDS_OWNER_DECISION**  
Material open findings: **`PE-OD-01`, `PE-OD-02` only**  
Next gate: **Owner decision in Section 2; then exact authority incorporation and fresh independent full Design/security review**
