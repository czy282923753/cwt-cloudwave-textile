# CWT Stage 4A Phase B — Foundation Implementation V2 Remediation V1 Fresh Independent Implementation Re-review

## 1. Review identity and conclusion

- Review role: original independent Phase B Implementation Reviewer.
- Review date: 2026-08-11 (Asia/Shanghai).
- Review conclusion: **FAIL**.
- Findings: **Blocker 0 / High 1 / Medium 3 / Low 0 / External Validation 0**.
- Exact Candidate ref: `codex/phase-1b-stage4a-phase-b-foundation-implementation-v2-remediation-v1`.
- Exact final Candidate: `2e6dc7a520404b629c795447ce710b36740ff972`.
- Direct parent: `967551eeb018ef9fba8b3759e92017ff07ff74a1`.
- Exact final code HEAD: `12817e6727ee2308ea8481d9f0153048f1ce9f18`.
- Accepted V1.7 Design / full rollback: `3f475e13d73d9d68a4dfb9a040941c57f1ee92e6`.
- Failed V2 Candidate: `0d5b067c0912290ffd91d4d34b064d9c8dacd712`.
- Formal exact-HEAD Candidate worktree: `/Users/calvin/.codex/worktrees/07a1/CWT（CloudWave Textile）项目`.
- Detached exact-HEAD review worktree: `/tmp/cwt-phase-b-impl-v2-remediation-review.L4DTz2/repo`.
- Candidate implementation eligibility: **NOT ELIGIBLE** for Phase B acceptance.

The remediation closes IMP2-M03, IMP2-M05, IMP2-L01, and IMP2-L02, but leaves IMP2-M01, IMP2-M02, and IMP2-M04 open after correction attempt 1. Fresh testing also found one new authorization root on the supported Phase B availability path. This FAIL does not reopen the Owner-selected M02-D1-INCLUDE or M03-D1-DISCRIMINATED-SEAM decisions and authorizes no implementation, merge, Push, Provider work, or Phase C/D/E activity.

## 2. Controlling inputs and method

The review read the controlling material completely or, for code, inspected every changed implementation path and all material transitive authorities:

- root `AGENTS.md`;
- `docs/ENGINEERING_GOVERNANCE.md` and `docs/REVIEW_POLICY.md`;
- ADR-0018;
- the Owner selection record;
- standalone Corrected Exact Design V1.7;
- the V1.7 independent PASS and Design acceptance/implementation authorization;
- the original V2 independent FAIL report, evidence, and seven-file manifest;
- the V2.1 remediation report, evidence, executable captures, manifest, and changed implementation files.

V1.7, not the remediation narrative or failed implementations, remained the implementation authority. Review mutations were confined to disposable worktrees. The formal Candidate was not edited.

## 3. Identity, history, scope, and immutable evidence

### 3.1 PASS — exact identity and linear remediation history

- The branch ref, exact HEAD, direct parent, code HEAD, failed Candidate, and Design start resolve exactly.
- The failed Candidate and Design start are ancestors of the exact final Candidate.
- The remediation is a linear 12-commit descendant of the failed V2 Candidate; the final code change is `12817e6...`, and every successor is documentation/evidence only.
- Earlier failed implementations `755e514...`, `a696325...`, `b1a73bb...`, and `d8a24d...` are all non-ancestors.
- Frozen tag `phase-1b-stage3-approved-2026-08-09` peels to `31c0e405acfdd0d05200d0fb2531e897a541a2c4`.
- The formal Candidate tracked state was clean at fail-fast and terminal checks.

### 3.2 PASS — remediation scope and fixed hashes

- Failed V2 to final Candidate is exactly **59 paths**, 35,384 insertions, 295 deletions, with one deliberate deletion: `src/public-site/product-pagination.ts`.
- The remediation manifest verifies **56/56** entries, and its aggregate envelope verifies exactly.
- Fixed artifact SHA-256 values independently match:
  - remediation report: `fa48bc4e794f3c1b0f2dd9ddbc268b7445b8a0ed8ef8587b992fe523155ecfac`;
  - remediation evidence: `2b3c43584bd63ead3c1b6b6009ea2f34873bd3cde472896e88da37401f795cc9`;
  - 56-entry manifest: `5e2bd3b0676fc9dd3468e75adbc289e5f49979c3f4d0867f8ba5b6cf01066850`;
  - aggregate envelope: `792b41a4903b50f075d51f9d9b55eecbe34e0733825a2c602be2e8e6acb754c9`.
- Imported original FAIL report/evidence/manifest match `592cc1eb...e967`, `e3ca907a...c269`, and `0de27349...a940`; the imported manifest verifies **7/7**.
- No Schema, Migration, snapshot, journal, seed, lockfile, dependency-set, engine, or package-manager change exists. `package.json` changes scripts/wiring only.

### 3.3 PASS — public baseline and exact diff-check disclosure

The following public files have the exact same Git blobs as the accepted V1.7 Design start:

- `src/app/layout.tsx`;
- `src/app/globals.css`;
- `src/app/products/page.tsx`;
- `src/app/products/page.test.ts`.

`src/public-site/product-pagination.ts` is absent at both Design start and exact Candidate. No remaining Phase B public UX, SEO, route, pagination, or rendering change was found.

Global Design-start-to-Candidate `git diff --check` exits `2` solely because the immutable imported V1.7 independent report has a fixed blank line at EOF. The owned scope excluding exactly that six-file immutable PASS set exits `0`. The global check is not misreported as PASS.

## 4. Findings

### IMP2-NH01 — Editorial Revision role authorization uses target union shape instead of the authoritative entity type

**Severity: High. New root.**

**Exact locations:**

- `src/ai/applications/draft-assistance/composition.ts:35-39,54-112`;
- V1.7 §9.2 exact Production table and §§18/19 authorization anti-leak requirements.

`actorCanEdit` authorizes `product_draft` as Product Editor and every other target union member as Content Editor before the Editorial Revision row is read. An Editorial Revision target does not encode whether the underlying entity is Product or Content; that authority is `editorial_revisions.entity_type`, returned by the single actor-scoped read.

Fresh PGlite reproduction inserted a conspicuously synthetic Product Editorial Revision and called the actual Phase B availability service:

```json
{
  "productEditor": {"ok":true,"value":{"available":false,"manualEditorAvailable":false,"code":"authorization_denied"}},
  "contentEditor": {"ok":true,"value":{"available":false,"manualEditorAvailable":true,"code":"integration_not_ready"}}
}
```

The Product Editor is wrongly denied. More seriously, a Content Editor reaches the valid Product record and receives a different result, disclosing record validity/readiness beyond the authorized Product record scope. This is a reproducible authorization bypass/information leak on the current Phase B availability path, so REVIEW_POLICY classifies it High.

**Required correction:** within the one authoritative actor-scoped target read, determine Product-versus-Content role eligibility from the returned `entity_type` and enforce the existing record scope before returning any distinguishable target state. Product Editor must be the non-admin editor for Product Draft/Revision; Content Editor for Content Draft/Revision. Preserve one read, zero locks, exact no-existence-leak ordering, and no second authorization authority.

### IMP2-M01 — selected context source identity/version is not bound to the selector or target association

**Severity: Medium. Same root remains OPEN after correction attempt 1.**

**Exact locations:**

- `src/ai/applications/draft-assistance/context.ts:115-143,292-354,556-690`;
- V1.7 §§12.5-12.6, 13, 18.2/18.3, and §23 context/provenance vectors.

The remediation now enforces the field/value/provenance matrix, Product Code exclusion, aggregate limits, Prompt variables, and durable JCS round trip. However, `DraftContextSourceDtoV1.sourceIdentity` remains an arbitrary JSON object. `serializeSelectedSource` checks only that it is canonically serializable. It does not prove that the returned identity/version equals the requested selector, the authorized target, or the authoritative record version.

Fresh reproduction requested Product source ID `2222...` for Product target `1111...`. The repository returned Product identity `3333...`, record version `99`, and values from that other Product. The real policy returned `ok:true`, put those values under the `1111...` target association, and persisted the mismatching `3333.../99` identity in `input_sources_json`.

This breaks selector-to-result bijection, target/version association, and the frozen business-truth boundary. Durable provenance faithfully recording a mismatching source does not make the mismatch authorized.

**Required correction:** make each repository result a closed, typed, application-owned DTO whose exact identity and version can be checked against the selector and target association. Product source selection for a Product target must follow the exact V1.7 target/source rule; Fabric and Company Fact identities must likewise match the requested selector and authoritative record version. Reject mismatch before accepting values or computing any fingerprint. Keep one context policy/projector and no Schema change.

### IMP2-M02 — A-08 accepts equivalent 30-block spam with cosmetic suffixes

**Severity: Medium. Same root remains OPEN after correction attempt 1.**

**Exact locations:**

- `src/ai/output/common.ts:194-220`;
- V1.7 §14.3 A-08 and §23 mandatory meaningfulness/repetition vectors.

The remediation rejects exact duplicate normalized texts, exact duplicate canonical blocks, and eight immediately repeated identical tokens. A fresh equivalent-spam vector used 30 paragraphs sharing the same four-token proposition and differing only in one harmless suffix (`alpha` through `dahlia`). Every individual paragraph was structurally valid, and the combined 30-block result was accepted as `automaticEvidenceStatus="structural_provenance_checked"`.

This is the same causal A-08 root, not a demand for semantic entailment: the finite policy must reject bounded mechanically repetitive output even when cosmetic suffixes defeat exact-string equality.

**Required correction:** extend the single finite A-08 meaningfulness/repetition policy with a deterministic bounded equivalence rule that rejects this class of repeated proposal while retaining safe non-repetitive B2B prose. Do not add a semantic verifier, second classifier, or weaken `human_review_required`.

### IMP2-M04 — unsupported Production business acquisition does not fail closed

**Severity: Medium. Same root remains OPEN after correction attempt 1.**

**Exact locations:**

- `scripts/verify-ai-architecture.ts:744-899,923-1012`;
- V1.7 selected M03 graph profile and §§20/23.

The remediation builds the real graph, proves direct/aliased/re-export/package/resource paths, emits the four proof artifacts, and passes the declared 11 graph faults plus 28 lifecycle mutations. But `enforceCapabilityEdge` rejects unsupported/unresolved acquisitions only for `protected-ai`, `phase-b-outer-composition`, or the public-client traversal. A non-foldable acquisition in a Production `business-consumer` returns without rejection.

Fresh fault injection added to real `src/app/page.tsx`:

```ts
const reviewerComputedServerEdge = process.env.REVIEWER_AI_EDGE === "1"
  ? "@/server/ai/phase-b-composition"
  : "@/public-site/data";
void import(reviewerComputedServerEdge);
```

The checker exited `0`, reported `ok:true`, and increased the graph edge count from 2387 to 2388. This hides the exact prohibited business incoming edge behind an unresolved Production acquisition. Current Candidate source does not contain the injected edge; the defect is proof-gate soundness.

**Required correction:** the one graph authority must fail closed for unsupported/unresolved runtime acquisitions from every Production class, then apply the existing class/capability rules to the resolved target. Add a real business-consumer computed dynamic import fault plus equivalent `require`/resource acquisition variants. Replace the gap in the sole checker; do not add a second checker or broad filename allowlist.

## 5. Original finding dispositions and attempt accounting

| Finding | Disposition | Evidence and attempt accounting |
|---|---|---|
| IMP2-M01 | **OPEN after correction attempt 1** | field/value/provenance/limit/JCS work is materially improved, but selector/result identity/version/target binding still accepts a wrong Product source |
| IMP2-M02 | **OPEN after correction attempt 1** | exact duplicate checks exist, but a fresh 30-block cosmetic-suffix repetition vector passes |
| IMP2-M03 | **CLOSED** | private common carrier and callback are literally select-only; execute/query/mutation/lock/transaction are absent; positive drivers and six negative type probes pass |
| IMP2-M04 | **OPEN after correction attempt 1** | real graph/proof artifacts exist, but a Production business unresolved dynamic acquisition bypasses fail-closed enforcement |
| IMP2-M05 | **CLOSED** | four public blobs exactly match Design start and the pagination helper is absent; no public product change remains |
| IMP2-L01 | **CLOSED** | Phase B Production composition returns only `DraftAssistanceAvailabilityService`; no callable request/enqueue/Worker placeholder is exposed |
| IMP2-L02 | **CLOSED** | final executable evidence names code HEAD `12817e6...` with an exact docs-only successor rationale; counts/hashes match; historical process events remain disclosed |

IMP2-NH01 is genuinely new and therefore is not counted as a strike against an old root. No root has reached three failed closure attempts, and no Max/three-strike escalation is triggered.

## 6. Fresh verification

### 6.1 Passing exact-Candidate gates

- Runtime: Node `24.14.0`, TypeScript `5.9.3`, Next `16.2.12`; installed pnpm reports `11.9.0` but was not used for review execution.
- Focused `src/ai`: **13 files / 138 tests PASS**.
- Security/migration/noindex subset: **3 files / 5 tests PASS** in an in-memory/test configuration; `FEATURE_AI` defaults false in the test environment.
- Fresh isolated in-memory migration/noindex proof: PASS through accepted 0020 with `APP_ENV=test`, `FEATURE_AI=false`, `NON_PRODUCTION_NOINDEX=true`, public Index false, zero config/run rows, and no Synthetic persistence.
- Full suite: **111 files / 555 tests PASS**.
- lint: PASS, zero warnings.
- strict typecheck: PASS.
- accepted 0020 verifier: PASS, including 40 historical artifacts.
- Independent mapping: `ai_model_config=21/21`, `ai_runs=96/96`; Design/snapshot/Drizzle/Migration order exact.
- Prompt bundle: PASS; Production Prompt manifest exact-empty.
- Prompt history: PASS for `c6f971... -> 2e6dc7...`.
- Architecture baseline: PASS as implemented, exact final Candidate `517` candidates / `446` executables, 12 classes, zero unclassified/ambiguous, 2387 graph edges, 2 positive / 6 expected-negative type probes, 11 graph faults, and 28 lifecycle mutations. IMP2-M04 explains the independent bypass.
- Official Next 16.2.12 lifecycle in disposable exact-HEAD isolation:
  - absent: `517/446`;
  - present: `518/447`, `next-env.d.ts` 247 bytes, SHA `7b550dda...`, ignored/generated/root-control;
  - two typegen runs produced stable `next-env.d.ts` and `.next/types` hashes.
- Isolated AI server fixture: build PASS, **51 server files / 16 client chunks**; all AI/Prompt/Synthetic markers server-only and the client positive control observed.
- Raw JSON duplicate/root/framing/truncation/depth/node/byte probes and the four strict output schemas passed the checked-in focused tests.
- Exact Candidate source scans found no real Provider SDK/endpoint/network/credential, Production Prompt prose, Production Provider registration, durable `ai_runs` repository/enqueue/Worker/scheduler, fallback execution, RAG/retrieval/vector, vision/tool/file/URL, customer_support, private Inquiry/CRM context, business Draft mutation, Publish, or Index authority.

The green suite cannot supersede the four Fresh reproductions because the checked-in tests do not cover those exact mandatory/adversarial boundaries.

### 6.2 M02-D1-INCLUDE and M03 Owner seam — non-regression PASS

- One selected 32-rule registry remains the sole context/A-07 classifier authority: 30 common rules plus two DeepSeek rules.
- Direct, bounded insertion-aware, structured, overflow, runtime-tuple, invalid-control, per-gap 4/5, total 64/65, persisted-byte, and safe Persian/emoji/accented/CJK vectors passed the focused suite and source inspection.
- Visible punctuation/separator/ordinary-space tradeoffs remain exactly the selected Owner consequence; no EXCLUDE path or second scanner was found.
- `DatabaseConnection.kind` remains exhaustively narrowed in the one outer root and passes each branch-narrowed `.db` directly to the same generic factory, without cast/assertion/`any`/`unknown` round trip/wrapper/visitor/second database authority.
- Draft and Synthetic private carriers remain structurally different, nonfabricable, and non-interchangeable.

IMP2-M01/M02 concern application context/output contracts around the selected classifier; IMP2-M04 concerns checker fail-closed completeness. None reopens the Owner choices.

### 6.3 Build claim and process fidelity

The reviewer independently reproduced only the authorized isolated AI server bundle, not a full public-site build. Exact-start `next/font/google` remains a pre-existing offline full-site build debt outside this Candidate; the remediation does not conceal or claim that build.

Historical V2 events remain disclosed: 526 packages were materialized from an existing local store with zero downloads, and the first font build made two failed TLS attempts. This Fresh re-review performed no package-manager resolution, install, download, registry access, or network attempt. Local dependencies were copied with filesystem copy-on-write only into disposable review worktrees.

## 7. Decisions, impacts, and next gate

- Schema/Migration impact: **none required**.
- ADR impact: **none required**.
- Dependency/lockfile impact: **none required**.
- Complexity Approval: **not required**; no persistent coordination is needed.
- SEO/URL/public-data impact: **none required**.
- Owner decision: **none required**. Existing M02/M03 Owner selections remain in force.
- Phase B implementation eligibility: **NO**.
- Next gate: return IMP2-M01, IMP2-M02, and IMP2-M04 for correction attempt 2, and IMP2-NH01 for its first correction; then perform another Fresh independent implementation re-review. Do not merge, Push, call a Provider, or begin Phase C/D/E.

## 8. Review artifacts

- Evidence narrative: `docs/review-evidence/phase-1b-stage4a-phase-b-independent-implementation-rereview-v2-1/INDEPENDENT_IMPLEMENTATION_REREVIEW_EVIDENCE_V2_1.md`.
- Exact Fresh challenge patch: `REVIEWER_FRESH_CHALLENGES_V2_1.patch`.
- Consolidated Fresh verification: `REVIEWER_FRESH_VERIFICATION_OUTPUT_V2_1.txt`.
- Artifact manifest: `SHA256SUMS.txt`.
