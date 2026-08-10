# CWT Stage 4A Phase B — Fresh Foundation Implementation V2 Independent Review V2.0

## 1. Review identity and conclusion

- Review role: independent Phase B Implementation Reviewer.
- Review date: 2026-08-11 (Asia/Shanghai).
- Review conclusion: **FAIL**.
- Findings: **Blocker 0 / High 0 / Medium 5 / Low 2 / External Validation 0**.
- Exact Candidate ref: `codex/phase-1b-stage4a-phase-b-foundation-implementation-v2`.
- Exact Candidate commit: `0d5b067c0912290ffd91d4d34b064d9c8dacd712`.
- Direct parent: `530fa35aa08dc9c49b25f97a589cefd1f27617b8`.
- Accepted V1.7 Design Gate / implementation start: `3f475e13d73d9d68a4dfb9a040941c57f1ee92e6`.
- Candidate worktree reviewed read-only: `/Users/calvin/.codex/worktrees/07a1/CWT（CloudWave Textile）项目`.
- Detached review worktree: `/tmp/cwt-phase-b-impl-v2-review.SbRrxf/repo`.
- Candidate implementation eligibility: **NOT ELIGIBLE** for Phase B acceptance until the findings below are corrected in a new Candidate and receive a Fresh independent implementation review.

This FAIL does not reopen the Owner-selected M02-D1-INCLUDE or M03-D1-DISCRIMINATED-SEAM architecture decisions. It records implementation defects against the accepted standalone V1.7 contract. It authorizes no remediation, merge, Push, Provider work, or Phase C/D/E activity.

## 2. Controlling inputs

The review read the complete controlling governance and authority set, including:

- root `AGENTS.md`;
- `docs/ENGINEERING_GOVERNANCE.md`;
- `docs/REVIEW_POLICY.md`;
- `docs/adr/ADR-0018-provider-agnostic-ai-service-and-model-configuration.md`;
- the Owner selection record approving only M02-D1-INCLUDE and M03-D1-DISCRIMINATED-SEAM;
- `docs/PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_CORRECTED_EXACT_DESIGN_V1_7.md`;
- the V1.7 independent PASS report and evidence;
- `docs/PHASE_1B_STAGE4A_PHASE_B_CORRECTED_EXACT_DESIGN_V1_7_ACCEPTANCE_AND_IMPLEMENTATION_AUTHORIZATION_V1_0.md`;
- `docs/PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_IMPLEMENTATION_REPORT_V2_0.md`;
- all 112 payload files in the Candidate manifest and the public/app changes called out by the task.

Implementation reports and failed implementation history were treated as evidence only. V1.7 remained the implementation authority.

## 3. Identity, history, isolation, and manifest

### 3.1 PASS — exact identity and clean restart

- Candidate ref and HEAD resolved to the exact fixed commit.
- HEAD's single direct parent is exact.
- The 27 post-gate commits are linear and contain no merge commit.
- Failed implementation refs `755e514...`, `a696325...`, `b1a73bb...`, and `d8a24d...` are all non-ancestors.
- No merge, rebase, or cherry-pick ancestry was found.
- Among 91 implementation-relevant source/test payloads, only the intentionally exact-empty Production Prompt manifest had a byte-identical blob in a failed ref. This supports a Fresh tree rather than mechanical failed-tree replay. Git cannot prove what a person read, so no stronger mental-process claim is made.
- Formal Candidate tracked state was clean at fail-fast and terminal checks. Review-only probes were kept outside it.

### 3.2 PASS — scope and fixed hashes

- Start-to-HEAD scope is exactly 114 changed paths, 15,003 insertions, and 34 deletions.
- The payload manifest contains exactly 112 entries; the two non-payload paths are the manifest and aggregate envelope.
- All 112 entries verified byte-for-byte.
- Fixed hashes independently matched:
  - Implementation Report V2.0: `edda35f368c31329060566de7f839e6e6693ff8344e86169fc0b349cbc9643ea`;
  - Design Gate acceptance/authorization: `237deb5b00a25837c63eb09d9f0f379ac3ccfe226feb16f66519d943ce3982da`;
  - 112-entry manifest: `24ddca7e51051c0f7921f0358e50b10bef11351de1ecc7d34c0bb951561dfb8c`;
  - aggregate envelope file: `4471d3b02afbf6d42075e2527456b786f80005a048117b8bc30bcf96ae916770`.
- Imported V1.7 PASS authority and its manifest remained byte-identical.
- No Schema, Migration, snapshot, journal, seed, `pnpm-lock.yaml`, or dependency/version-set change was present.
- `package.json` changed scripts/wiring only; dependency, devDependency, engine, and package-manager objects were unchanged.

### 3.3 PASS with exact disclosure — diff check

- Global `git diff --check` from V1.7 start to exact HEAD exits `2` solely for the immutable imported V1.7 independent report at line 118 (`new blank line at EOF`).
- A scoped check excluding exactly the six imported V1.7 PASS artifacts exits `0`.
- The global result is not reported as PASS, and immutable imported evidence was not edited.

## 4. Findings

### IMP2-M01 — Draft context, provenance, and Prompt-variable contract is incomplete

**Severity: Medium.**

**Exact locations:**

- `src/ai/applications/draft-assistance/context.ts:113-148,171-199,243-390`;
- V1.7 §§12.5–12.6, 13.1–13.6, 14.3 A-03, 18.2/18.3 and the §23 test matrix.

**Independent reproduction:**

- A Product source with `weightGsm="-5"`, a half MOQ object, and `composition` carrying `structural` provenance was accepted.
- Nine Fabric Knowledge sources and 21 Company Facts were accepted despite the exact 8/20 aggregate maxima.
- Preparation received an exact source identity/version but `encodePreparedContext` replaced it with `{alias}` in `inputSources`, so `input_sources_json` cannot preserve the accepted source record/version provenance.
- Every use case produced only `context_json` and `input_hash`, instead of the four exact V1.7 variable contracts. Its `input_hash` was made from ordinary `JSON.stringify` and did not equal the prepared JCS input hash.
- `parseDurableContext` accepted a Company Fact in `product_description_draft`. The Product output policy then accepted that Company Fact ref.

**Root cause:** the central context policy validates only source class, count/order, and a coarse Product field-name set. It does not implement the exhaustive Product provenance/eligibility matrix, class aggregate limits, exact per-use-case durable revalidation, exact source identity/version preservation, or per-use-case Prompt-variable projection.

**Impact:** the Phase C transaction adapter and claimed executor cannot safely persist/reconstruct the accepted V1.7 Provider input without architectural guesswork or silent provenance loss. Product Code remains excluded by the selector type, but the broader frozen business-truth boundary is not implemented.

**Required correction:** implement one exact application-owned policy for preparation and claimed reconstruction that enforces every V1.7 field/provenance/eligibility/aggregate rule, retains exact source identity/version only in `input_sources_json`, emits the four exact Prompt variable sets, and proves byte-identical JCS variables/hash across JSONB-shaped durable round trips. Do not add a parallel policy or Schema change.

### IMP2-M02 — A-03 and A-08 output policy does not implement the finite V1.7 rules

**Severity: Medium.**

**Exact locations:**

- `src/ai/output/common.ts:125-213`;
- V1.7 §14.3 A-03, A-04 MOQ, A-08 and mandatory vectors.

**Independent reproduction:**

- A Product Description candidate cited a decoded Company Fact and was accepted.
- Thirty identical paragraph blocks were accepted; no repetition/spam bound is implemented.
- The numeric policy expects `moqValue`/`moqUnit`, while the current context policy emits the selected `moqPair` field as one object. It therefore does not implement the exact adjacent two-ref A-04 contract.

**Root cause:** `AllowedEvidenceRefSetV1` is effectively every field present in context, not the exact reconstructed use-case/eligibility set, and A-08 implements link/media membership and heading order but omits meaningful-proposal and spam/repetition constraints.

**Impact:** mechanically invalid candidates can be labeled `structural_provenance_checked`; mandatory V1.7 negative vectors do not fail closed. Human review remains mandatory and no auto-Publish/Index authority exists, which limits impact but does not satisfy the accepted output contract.

**Required correction:** derive one exact allowed-evidence ref set from the corrected context policy, implement adjacent MOQ refs, and add deterministic bounded A-08 proposal/repetition rules with adversarial positives/negatives. Do not add semantic entailment or a second protected-data classifier.

### IMP2-M03 — common read scopes expose forbidden raw `execute`

**Severity: Medium.**

**Exact locations:**

- `src/ai/applications/draft-assistance/read-scopes.ts:23-27,72-97,123-131`;
- `src/ai/config/model-config-repository.ts:114-175`;
- V1.7 §8 exact `Pick<AppDatabase<T>, "select">` contract and §§20/23 static gates.

**Evidence:** the private common executor is `Pick<..., "select" | "execute">`, and the model-config repository calls raw `database.execute(sql...)`. The accepted contract exposes only `select` and explicitly rejects raw `execute` in common callbacks. The checked negative fixture tests only a request-only method on the scope and therefore does not detect this capability.

**Impact:** both availability and the future request subtype carry an arbitrary raw-SQL capability beyond the selected typed read projection. A read-only transaction reduces write risk on the availability path but does not restore the exact module/capability boundary; the future request transaction would receive the same broad capability.

**Required correction:** return the common executor to select-only, express the single complete config aggregate through the typed/select capability, and add compile/AST/fault probes that reject `execute` in the carrier, helpers, common repositories, and callbacks. No new database or transaction authority is required.

### IMP2-M04 — architecture gate classifies files but does not prove the selected M03 graph

**Severity: Medium.**

**Exact locations:**

- `scripts/verify-ai-architecture.ts`;
- selected M03 V2.2 profile, especially the Phase B composition incoming-edge rule and four required build-only proof artifacts;
- V1.7 §§2.4, 20, 23.

**Independent fault injection:** in a disposable exact worktree, adding
`import "@/server/ai/phase-b-composition";` to `src/app/page.tsx` created the explicitly forbidden Phase B business incoming edge. The checker still exited `0` and reported `ok:true`, `501` candidates, `443` executables, `zeroClass=[]`, and `ambiguous=[]`.

**Inspection result:** the checker validates actual-file classification, selected root source text, limited protected-module string rules, fixed type fixtures, and 28 in-memory helper mutations. It does not construct the declared transitive import/re-export/package/resource graph, enforce incoming/outgoing capability ceilings across all classes, resolve unsupported acquisition forms fail closed, or emit/verify the profile's four exact protected-graph/composition/capability-origin/bundle proof artifacts.

**Impact:** the green architecture gate can miss a real business integration edge and cannot substantiate the V1.7 no-Provider/no-capability-reachability proof. Current exact source remained clean of the injected edge; this finding is gate soundness, not an assertion that the exact Candidate already contains that edge.

**Required correction:** make the one gate implement the selected profile's bounded graph and artifact contracts, with real fault fixtures for direct/aliased/re-export/dynamic/resource edges and class capability ceilings. Replace incomplete logic; do not layer a second checker.

### IMP2-M05 — offline-build remediation made unauthorized public product changes

**Severity: Medium.**

**Exact locations:**

- `src/app/layout.tsx`;
- `src/app/globals.css`;
- `src/app/products/page.tsx`;
- `src/app/products/page.test.ts`;
- new `src/public-site/product-pagination.ts`;
- implementation report §§3 and 8.

**Evidence:** the Candidate removed `next/font/google` Geist/Geist Mono from the root layout and globally replaced the public sans/mono typography with Arial/system stacks after the author's isolated build made two failed TLS attempts. This changes public rendering and visual UX across the site. Product pagination functions were also moved out of the page module to cure an unrelated Next route-export build failure; that move appears behavior-equivalent but is still outside the V1.7 Phase B file/scope plan.

**Impact:** a Phase B AI foundation Candidate changes the public product to make a validation environment pass. The mandatory offline proof does not authorize B2B public UX or unrelated route-module maintenance.

**Required correction:** restore the accepted public rendering/behavior in the Phase B Candidate and obtain build evidence through an isolated, reviewed local proof boundary. If the Owner wants a permanent font or public-route maintenance change, handle it independently under its own product/SEO review; do not couple it to Phase B acceptance.

### IMP2-L01 — Phase B constructs a callable Production request method

**Severity: Low.**

**Exact locations:**

- `src/ai/applications/draft-assistance/composition.ts:123-150`;
- `src/ai/applications/draft-assistance/facade.ts:93-139`;
- V1.7 §§10, 18.3 and 20.

`createPhaseBAvailabilityServiceV1` returns the full `DraftAssistanceService`, including a callable `requestDraftAssistance` method that parses and prepares an invocation before returning `integration_not_ready`. It does not enqueue, write, or dispatch, so no Phase C runtime exists. Nevertheless, V1.7 states that Phase B constructs only the availability half and creates no callable Production request-service instance.

**Required correction:** make the Phase B composition surface availability-only. Construct the first request service only when Phase C supplies the authorized enqueue port. Preserve the shared codecs/contracts without a callable placeholder path.

### IMP2-L02 — verification/process record is not exact

**Severity: Low (process/evidence).**

- The author correctly disclosed an install-like materialization of 526 local-store packages (`downloaded 0`) and two failed external TLS attempts. Both were prohibited by the task even though no lockfile, successful network result, credential, or Provider call occurred.
- The exact Candidate's focused AI run is 13 files / **122** tests, not the report's 119.
- Several author build/lifecycle captures predate exact final HEAD (for example, the isolated build record names `b5e8de...`). Fresh exact-HEAD review reproduced their behavioral results, so this is evidence identity/fidelity rather than a build defect.

**Required correction:** subsequent Candidate work must use preinstalled dependencies and a network-disabled proof path from the start, and final evidence must identify exact HEAD and current counts. Historical events must remain disclosed; do not rewrite them.

## 5. Fresh verification results

### 5.1 Passing gates

- Required runtime: Node `24.14.0`; pnpm `11.9.0`; TypeScript `5.9.3`.
- Focused `src/ai`: **13 files / 122 tests PASS**.
- Full suite: **111 files / 539 tests PASS**.
- lint: PASS, zero output/warnings.
- typecheck: PASS.
- accepted 0020 verifier: PASS, including 40 historical artifacts and exact constraints/index scope.
- Independent mapping: `ai_model_config=21/21`, `ai_runs=96/96`; accepted Design, snapshot, Drizzle, and Migration names/order exact.
- Prompt bundle: PASS; Production manifest exact-empty.
- Prompt history, exact `c6f971... -> 0d5b067...`: PASS.
- Candidate architecture run: PASS as implemented, `501/443`, 12 classes, empty zero/ambiguous, 2 positive / 5 negative type probes, 28 mutation probes. IMP2-M04 explains why that passing gate is incomplete.
- Official Next 16.2.12 lifecycle in disposable isolation: absent `501/443`; present `502/444`; two typegen runs byte-identical; `next-env.d.ts` 247 bytes, SHA `7b550dda...`, ignored and correctly classified.
- Server fixture: build PASS; `51` server files / `16` client chunks; all server markers present and client-clean.
- Fresh isolated PGlite migration and `APP_ENV=test`, noindex, Synthetic-safe, `FEATURE_AI=false` build: PASS; no preserved/default PGlite was changed.
- Public bundle gate: PASS across `20` public page manifests and `47` active manifest/chunk files.
- Fresh raw JSON probes: escaped/nested/NFC duplicate keys, fences, concatenation, truncation, exact/over byte and member bounds all produced the required outcomes.

### 5.2 M02-D1-INCLUDE disposition — PASS / non-regression

- The selected registry is one exact 32-rule authority (30 common plus two DeepSeek-only), SHA `264ca635...`.
- Context and A-07 import the same classifier; no second protected-data scanner was found.
- Fresh variants using U+034F, U+2060, U+20DD and LF were protected; visible hyphen/em dash/ordinary space remained allowed under the explicit Owner tradeoff; safe Persian ZWNJ, emoji ZWJ, accented and CJK text remained allowed.
- Per-gap 4/5 and total 64/65 returned protected/unsupported as specified.

IMP2-M01/M02 concern context eligibility and finite output rules around this classifier; they do not reopen the selected M02 grammar.

### 5.3 M03 discriminated seam disposition — partial PASS, gate/capability FAIL

- `src/server/ai/phase-b-composition.ts` exhaustively switches on `databaseConnection.kind`, passes each branch-narrowed `.db` directly to the same generic factory, and contains no cast/assertion/`any`/`unknown` round trip/wrapper/visitor/second DB authority.
- Positive and five expected-negative type fixtures passed.
- Draft and Synthetic scopes remain nominally distinct and externally nonfabricable/interchangeable.
- The official generated lifecycle and 12-class actual-filesystem inventory passed.
- IMP2-M03 and IMP2-M04 remain: the shared Draft carrier exposes raw execute, and the selected graph checker does not enforce real import/capability edges.

### 5.4 Phase boundary and prohibited capability disposition — PASS

No real Provider SDK/adapter/endpoint/network/credential/spend path, Production Prompt prose, Production Provider registration, `ai_runs` repository, durable enqueue, Worker process, claim/lease/retry/cancel/scheduler runtime, fallback, RAG/retrieval/vector, vision/tool/file/URL capability, customer_support, private Inquiry/CRM source, business Draft mutation, Publish, or Index authority was found. `internal/worker-entry.ts` is type-only and the claimed-run module reconstructs an already claimed physical projection; neither is a Phase C Worker/repository.

## 6. Reviewer process disclosure

The review used only installed local runtimes and made no successful or attempted external network access. During initial command reproduction, invoking repository pnpm wiring in the formal Candidate worktree triggered the project's automatic offline dependency consistency/materialization path against the already installed local content-addressed store. Output reported no download and no tracked change; the reviewer stopped invoking pnpm and used direct installed binaries thereafter. The ignored `node_modules` materialization did not change Candidate bytes. This is disclosed as a reviewer process exception to the requested no-install rule, not hidden as “zero install-like action.”

All build/typegen/fault mutations occurred only in disposable detached worktrees. The formal Candidate remained tracked-clean. No default PGlite, Candidate source, Schema, Migration, ADR, package, lockfile, or prior evidence artifact was edited.

## 7. Decisions and next gate

- Schema/Migration impact: **none required**.
- ADR impact: **none required** for the corrections identified.
- Dependency/lockfile impact: **none required**.
- Complexity Approval: **not required**; no new persistent coordination is needed.
- SEO/URL/data impact: no intended change is required. The unauthorized public typography/product-module changes should be removed or handled separately rather than approved through this gate.
- Owner decision: **none required** to correct these defects. The M02 and M03 Owner selections remain in force. A separate Owner decision would be needed only if the project deliberately wants to adopt the public font/product maintenance changes.
- Implementation eligibility: **NO**.
- Next gate: coordinator returns the exact causal findings to the implementer for a new, narrowly corrected Candidate, followed by a Fresh independent implementation re-review. No Phase C/D/E work may start.

## 8. Review artifacts

- Evidence narrative: `docs/review-evidence/phase-1b-stage4a-phase-b-independent-implementation-review-v2/INDEPENDENT_IMPLEMENTATION_REVIEW_EVIDENCE_V2_0.md`.
- Fresh Context/Output/M02 probe: `REVIEWER_CONTEXT_OUTPUT_AND_M02_CHALLENGE_V2_0.mts`.
- Fresh raw JSON probe: `REVIEWER_RAW_JSON_CHALLENGE_V2_0.mts`.
- Independent Schema mapping probe: `REVIEWER_SCHEMA_MAPPING_V2_0.mjs`.
- Consolidated exact verification capture: `REVIEWER_FRESH_VERIFICATION_OUTPUT_V2_0.txt`.
- Artifact manifest: `SHA256SUMS.txt`.
