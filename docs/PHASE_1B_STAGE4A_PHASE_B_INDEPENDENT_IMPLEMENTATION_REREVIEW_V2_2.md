# CWT Stage 4A Phase B — Foundation Implementation V2 Remediation V2 Fresh Independent Implementation Re-review

## 1. Review result

**Conclusion: FAIL**

**Finding counts:** Blocker 0 / High 0 / Medium 4 / Low 0 / External Validation 1.

Exact Candidate `b7ad96b24da45de00cae2cdb961a9aefcbc99496` is **not eligible for Phase B implementation acceptance**. IMP2-NH01 is closed after correction attempt 1. IMP2-M01, IMP2-M02, and IMP2-M04 remain open after correction attempt 2. One genuinely new Medium root, IMP2-NM01, was found in the interaction between the selected M02 classifier and the exact reconstructible-context metadata.

No root has yet remained open after three independently reviewed correction attempts. Three-strike technical escalation is therefore not triggered by this review. M01/M02/M04 each have one final correction attempt remaining; NH01 is closed; NM01 is a newly discovered root and has no correction strike.

This result authorizes no remediation, merge, Push, Provider work, external action, or Phase C/D/E work.

## 2. Exact identity and scope

- Candidate ref: `codex/phase-1b-stage4a-phase-b-foundation-implementation-v2-remediation-v2`.
- Exact HEAD: `b7ad96b24da45de00cae2cdb961a9aefcbc99496`.
- Direct parent: `846888a409b2b62869ff7ff8fca36b88b70d0bf9`.
- Exact final code HEAD: `111301aea82569768661c6401b16054161ed19ff`.
- Failed Remediation V1: `2e6dc7a520404b629c795447ce710b36740ff972`.
- Exact Design/full rollback: `3f475e13d73d9d68a4dfb9a040941c57f1ee92e6`.
- Formal Candidate worktree: `/Users/calvin/.codex/worktrees/07a1/CWT（CloudWave Textile）项目`; exact HEAD and clean tracked/untracked state at terminal verification.
- Detached review snapshots: `/tmp/cwt-imp2-v2-review.ExCyn2/{candidate,baseline,lifecycle,full2}` at the exact HEAD.

The history from failed Remediation V1 is linear. The code sequence is the imported prior FAIL, NH01, M01, M02, M04, and final code/evidence confirmation; every successor after `111301a...` is documentation/evidence only. Earlier failed implementation commits `755e514...`, `a696325...`, `b1a73bb...`, and `d8a24d4...` are non-ancestors.

The failed-V1-to-final delta is 42 paths: the exact 40-entry payload plus its manifest and aggregate envelope; zero deleted paths. The 40/40 manifest, aggregate, deletion record, and immutable prior FAIL 4/4 manifest independently verify. No Schema, Migration, snapshot, journal, seed, package dependency, or lockfile change exists in this remediation.

The four public blobs are byte-identical to Design start:

- `src/app/layout.tsx`;
- `src/app/globals.css`;
- `src/app/products/page.tsx`;
- `src/app/products/page.test.ts`.

`src/public-site/product-pagination.ts` is absent at Design start, failed Remediation V1, and this Candidate. No public UX, SEO, URL, route, or rendering change remains.

Global `git diff --check 3f475e1.....b7ad96b...` correctly exits 2 with exactly the two immutable diagnostics: the V1.7 independent report's final blank line and the imported prior Reviewer patch's line-153 trailing space. The owned scope, excluding only those two immutable artifact sets, exits 0.

## 3. Findings

### Medium — IMP2-M01 remains OPEN after correction attempt 2

**Location:** `src/ai/applications/draft-assistance/context.ts`, especially the Revision binding at lines 114–130 and the selector/source/target check at lines 226–284; accepted Design V1.7 Sections 9.2 and 13.3–13.5.

The new strict DTO correctly closes the prior literal `1111/2222/3333/version99` substitution for Product Draft and binds selector ID, returned ID, returned/current version, and the durable target tuple. It does not mechanically bind a selected Product or Fabric source to the entity underlying an `editorial_revision`.

For a Product Revision, `targetBinding` contains only Revision ID and Revision version. A reader can return any Product whose ID equals the selector, self-confirm `recordVersion === authoritativeRecordVersion`, and copy the correct Revision ID/version into `targetBinding`. The central policy accepts it because the Revision's authoritative `entity_type`/`entity_id` is absent from the DTO and association. Fresh PGlite execution accepted Product `2222...` at record version 5 for unrelated Revision `5b1890ce...` version 7 and built a valid Product Description context. This contradicts V1.7's exact `product_description_draft` boundary of **target Product structured** and exact editable Revision snapshot. The analogous Content/Fabric Revision relationship has the same missing mechanical proof.

**Impact:** an eventual authorized source reader can attach a selected but unrelated Product/Fabric record to the target Revision while the one central policy labels the context reconstructed and provenance-checked. Exact source identity is persisted, but the target/source relationship is wrong.

**Required correction:** preserve one application-owned context authority and make the authoritative Revision entity type/ID/current snapshot version part of the closed source-to-target proof. The policy must reject selector/source/current-version/Revision-entity substitutions before values, provenance, fingerprints, or Prompt variables. Do not add a second projector or reader-local compatibility authority.

### Medium — IMP2-M02 remains OPEN after correction attempt 2

**Location:** `src/ai/output/common.ts:194–248`, especially the prefix/suffix-only core generation at lines 215–237.

The common-core rule closes the prior 30 suffix variants and the checked prefix/suffix family. It removes at most two tokens only from the beginning and end. A Fresh 30-paragraph family with the same proposition and one alternating cosmetic token in the middle — `Repeated plain <variant> weave narrative.` — passes every individual control and the combined A-08 policy. Case, punctuation, whitespace, and NFKC normalization do not fix the positional gap.

**Impact:** mechanically repetitive output still receives `automaticEvidenceStatus="structural_provenance_checked"` and `semanticReviewStatus="human_review_required"`, contrary to the finite A-08 meaningfulness/repetition gate. Human review remains mandatory, but the automatic structural label overstates the completed finite check.

**Required correction:** replace the edge-only family fingerprint with one bounded deterministic authority that covers mechanically equivalent cosmetic tokens at permitted positions while retaining safe non-repetitive B2B positives. Do not use semantic entailment, an LLM verifier, a broad block-count/common-word ban, or a second classifier.

### Medium — IMP2-M04 remains OPEN after correction attempt 2

**Location:** `scripts/verify-ai-architecture.ts:764–880` and enforcement at lines 971–993.

The sole checker now rejects the exact old non-foldable `import()` fault and the checked direct/alias/template/createRequire/resource variants. Its acquisition collector handles identifier aliases and direct/property `module.require`, but not a valid CommonJS destructured acquisition:

```js
const { require: load } = module;
const selected = Date.now() > 0
  ? "@/server/ai/phase-b-composition"
  : "./product-state";
module.exports = load(selected);
```

Placed as an untracked executable `src/public-site/reviewer-indirect-acquisition.cjs`, the sealed selector classified it uniquely as `business-consumer`, but the checker returned exit 0. The protected Phase B composition root therefore remained invisible to both unsupported-acquisition and incoming-edge enforcement.

**Impact:** a supported Production executable syntax can acquire the protected composition root without appearing in the proof graph, so the four generated proof artifacts and public/server nonreachability claim are incomplete.

**Required correction:** within the Owner-selected bounded containment model, make acquisition-origin aliases such as destructuring/binding either part of the one supported language or fail closed before graph capability checks. Keep one checker; do not add filename exceptions, a parallel scanner, or a claim of arbitrary JavaScript dataflow.

### Medium — IMP2-NM01 is a genuinely new root

**Location:** `src/ai/applications/draft-assistance/context.ts:568–596` and `src/ai/context/protected-data-registry.v2_1.json:961–1012`; accepted Design V1.7 Sections 13.2 and 13.6.

`strictContext` applies the selected M02 classifier to the complete reconstructible context, including the machine-generated 64-hex `association.snapshotHash`. The structured phone rule accepts a run of at least seven decimal digits surrounded by non-numeric characters. Cryptographic hashes commonly contain such runs. A deterministic 1,000-Revision corpus derived from SHA-256 seeds produced 590 `protected_match` results, all `value.personal-phone.structured.v2`; only 410 hashes were allowed. A concrete otherwise-valid Revision context failed at `/association/snapshotHash` as `context_prohibited_data`.

**Impact:** target identity alone pseudo-randomly makes legitimate Phase B availability fail closed before config/Prompt readiness. The measured deterministic corpus rejects 59% of valid Revision snapshot hashes. Manual editing remains available, but AI availability is materially unreliable and unrelated to protected source data.

**Required decision/correction:** this is not the A-08 IMP2-M02 root. V1.7 simultaneously fixes the exact registry, includes `snapshotHash` in the strict context, and requires scanning the complete accepted JSON value. Implementation cannot silently exempt the field or change the selected phone grammar. Owner/corrected-Design authority must specify one mechanical domain boundary: either classify only the untrusted/provider-evidence portions while keeping one authority, or revise the exact structured-rule boundary without weakening protected-value coverage. Persisted bytes and single-registry authority must remain unchanged. No Schema/Migration is implied.

## 4. Finding dispositions

| Finding | Disposition | Review attempt |
|---|---|---:|
| IMP2-NH01 | **CLOSED** — authoritative returned `entity_type` determines Product/Content role before state/version; missing and wrong-role cases share `authorization_denied`; one select, zero lock | correction attempt 1 |
| IMP2-M01 | **OPEN** — Draft literal substitution is closed, but Revision underlying entity/source binding is absent | correction attempt 2; one final attempt remains |
| IMP2-M02 | **OPEN** — edge cosmetic variants close, middle cosmetic variants pass | correction attempt 2; one final attempt remains |
| IMP2-M03 | **CLOSED / non-regression PASS** — common carrier remains exactly select-only; positive and six expected-negative probes pass | frozen |
| IMP2-M04 | **OPEN** — exact old dynamic fault closes, destructured CommonJS acquisition passes | correction attempt 2; one final attempt remains |
| IMP2-M05 | **CLOSED / non-regression PASS** — public blobs exact and pagination helper absent; no full-site build claim | frozen |
| IMP2-L01 | **CLOSED / non-regression PASS** — Production composition exports availability only; request/enqueue/Worker contracts are type-only/non-callable seams | frozen |
| IMP2-L02 | **CLOSED / non-regression PASS** — executable evidence is bound to code HEAD `111301a...`; historical local-store/TLS events remain disclosed | frozen |
| IMP2-NM01 | **NEW / OPEN** — machine snapshot hashes are classified as phone values | new root; no correction attempt yet |

## 5. Verification

All verification was offline with pinned Node `24.14.0`, pnpm `11.9.0` installed but not used for successful checks, TypeScript `5.9.3`, Vitest `4.1.10`, and Next `16.2.12`. Disposable snapshots used filesystem copy-on-write copies of already installed dependencies. Downloads and registry/network access were zero.

- Exact fixed hashes and manifests: 40/40 and prior 4/4 PASS; aggregate/deletion records exact.
- Focused `src/ai`: 13 files / 149 tests PASS.
- Selected M02 classifier: 46/46 PASS; raw JSON/output: 2 files / 47 tests PASS.
- Exact prior M01/M02/NH01 reproductions: now rejected/authorized as claimed by the remediation.
- Fresh M01 and M02 probe: 2/2 tests record the two still-accepted defects.
- DB verifier: PASS; independent accepted Schema extraction is exactly `ai_model_config` 21/21 and `ai_runs` 96/96 in Design/snapshot/Drizzle/Migration order.
- Prompt bundle: PASS; Production manifest exact-empty. Prompt history: PASS for `c6f9714.....111301a...`.
- Architecture baseline: PASS at exact final docs HEAD, 528 candidates / 446 executables / 12 classes / zero unclassified/ambiguous; 2 positive / 6 expected-negative type probes; 19 checked graph faults; 28 lifecycle mutations.
- Official Next lifecycle in a clean disposable snapshot: absent 528/446; present 529/447; `next-env.d.ts` 247 bytes, SHA-256 `7b550d...`; two `next typegen` runs stable; zero unclassified/ambiguous.
- Exact old conditional dynamic import: checker exits 1 with path/rule/AST/acquisition diagnostics.
- Fresh destructured `module.require`: checker exits 0 despite the protected-root target.
- Lint: PASS, zero warnings. Strict typecheck: PASS.
- Full suite: 111 files / 566 tests PASS in the final clean dependency snapshot. An earlier local dependency copy had a stale peer symlink and produced framework matcher/module-resolution failures; those were not Candidate failures and were not counted as verification.
- Fresh isolated migrated/noindex proof: memory-only accepted migrations through 0020, `APP_ENV=test`, `FEATURE_AI=false`, `NON_PRODUCTION_NOINDEX=true`, public Index false, and zero `ai_model_config`/`ai_runs` rows.
- Isolated server fixture: webpack build PASS; 51 server files / 16 client chunks; all server/Prompt markers retained server-only and the client positive control fired.
- Public full-site build was intentionally not claimed or run: the exact-start Google Font path remains unchanged and its network-dependent offline debt is outside this Candidate. This is the single External Validation/process item, not a Candidate waiver.
- Final Candidate and formal worktree: exact HEAD and clean. Fault injections existed only in disposable snapshots and were restored or discarded.

Two Reviewer package-manager invocations were attempted before the direct local-runtime method was selected; both aborted at the dependency-status prompt before any package change, materialization, download, or registry/network action. One default Turbopack fixture invocation failed on fixture-root resolution; the explicit repository-authorized webpack fixture then passed. These are disclosed Reviewer process exceptions and did not mutate the Candidate.

## 6. Frozen-boundary non-regression

M02-D1-INCLUDE registry identity, Unicode/runtime tuple, invalid-control/gap/counter limits, and persisted bytes are unchanged; its checked 46-case corpus passes. IMP2-NM01 is a new consumer-domain interaction and does not silently redefine that Owner choice. The M03 discriminated database seam, private Draft/Synthetic scopes, Prompt authority, raw JSON parser, four strict outputs, claimed projection/tamper fences, telemetry allowlist, server/public boundary, and exact four Production Draft use cases otherwise remain intact.

No Provider adapter/SDK/endpoint/credential/network/spend, fallback, RAG/retrieval, vision/tool/file/URL authority, customer_support, private Inquiry/CRM context, Production Prompt prose, durable enqueue/run repository/Worker/claim/lease/retry/cancel/dispatch runtime, or business/Admin integration was added.

## 7. Governance and next gate

- Schema/Migration/snapshot/journal/seed impact: **none**.
- ADR/dependency/Complexity Approval impact: **none identified** for the three implementation roots. IMP2-NM01 requires Owner/corrected-Design clarification, but no new dependency or persistent coordination is implied.
- Owner decision: **required only for IMP2-NM01's exact classifier domain/rule boundary**; the existing M02-D1-INCLUDE and M03-D1-DISCRIMINATED-SEAM selections are not silently changed.
- Phase B implementation eligibility: **NO**.
- Next gate: coordinator pauses Phase B acceptance, obtains the exact Owner/corrected-Design decision for IMP2-NM01, and returns IMP2-M01/M02/M04 for their final correction attempt 3. After one exact corrected Candidate exists, perform another Fresh independent implementation re-review. Do not merge, Push, call a Provider, or begin Phase C/D/E.

## 8. Deliverables

- This report.
- `docs/review-evidence/phase-1b-stage4a-phase-b-independent-implementation-rereview-v2-2/INDEPENDENT_IMPLEMENTATION_REREVIEW_EVIDENCE_V2_2.md`.
- `docs/review-evidence/phase-1b-stage4a-phase-b-independent-implementation-rereview-v2-2/REVIEWER_FRESH_CHALLENGES_V2_2.patch`.
- `docs/review-evidence/phase-1b-stage4a-phase-b-independent-implementation-rereview-v2-2/REVIEWER_FRESH_VERIFICATION_OUTPUT_V2_2.txt`.
- `docs/review-evidence/phase-1b-stage4a-phase-b-independent-implementation-rereview-v2-2/SHA256SUMS.txt`.
