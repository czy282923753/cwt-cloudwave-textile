# CWT Stage 4A Phase B — V2.2 Fresh Replacement Foundation Implementation Independent Review V1.0

## 1. Review identity and conclusion

- Task: `CWT Stage 4A Phase B｜Fresh Three-Strike Replacement Foundation Implementation Independent Review`
- Review type: Fresh, read-only, adversarial Independent Implementation Review
- Candidate ref: `refs/heads/codex/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-implementation-v1`
- Candidate HEAD: `b95390c34fc4fe687f6e7577a7505a7394bca80b`
- Direct parent: `a4b0e2ae92170b615a939ca3f317d9285bd01521`
- Candidate tree: `dd9992b1273e6247b476593e91682b90dad6d2a8`
- Final code HEAD: `4ce25e422b79bda62d0489d906e3e871a6279af9`
- Code tree: `9178ba098375df22fc2e7e6395170406c1e6c35e`
- Detached review snapshot: `/tmp/cwt-v22-impl-review.b4Y7b5`
- Review conclusion: **FAIL**
- Finding counts: **Blocker 0 / High 2 / Medium 0 / Low 0 / External Validation 2**
- Phase B implementation acceptance eligibility: **NO**

The Candidate remains unmodified. No Provider, network, credential, package-manager, install, materialization, registry, Staging/Production, Deploy, Publish, Index, merge, Push, or Phase C/D/E action was performed.

## 2. Authority and review inputs

The review applied root `AGENTS.md`, `docs/ENGINEERING_GOVERNANCE.md`, `docs/REVIEW_POLICY.md`, ADR-0018, the accepted replacement Corrected Exact Design V2.2, its acceptance/implementation-entry record, the Owner DB-convergence decision, and the exact implementation report/evidence. Historical implementations and reports were treated as evidence only.

Fixed implementation artifacts independently rehashed:

| Artifact | SHA-256 | Result |
| --- | --- | --- |
| Implementation report | `0f39d8f8b8b3aa6466faf6c38c6bc0b1c4834b22f667ac449d96641b18fe0808` | exact |
| Canonical authority | `140fa0e93d9e6c88334a78078af9d9b9b1bc628233b61b1ac49ab2b8ca14481f` | exact |
| Sole manifest | `7a0ba8884152f73b7b7c66db288ed2d3e7c769a84e7fdffc177d69629c1bacfe` | exact; 12/12 |
| Inventory | `525d751a469810adf74700d286eeb979e6e8e0014b1f8f2dc3262541c2277220` | exact |

The evidence verifier returned `IMPLEMENTATION_EVIDENCE_CONSISTENT_NOT_ACCEPTANCE`; this was accepted only as package consistency evidence, never as a review conclusion.

## 3. REMEDIATION_FINDINGS_REVIEW

This section was completed before deciding whether a broader full review was necessary.

| Repaired or preserved boundary | Disposition | Independent basis |
| --- | --- | --- |
| Owner-approved DB `globalThis` convergence | **PASS** | Production DB source uses only direct named `globalThis.cwtDatabaseConnection`; cache behavior tests pass; only the two Owner-authorized DB paths changed and no DB/Schema/config semantics changed. |
| M02 replacement | **PASS** | Fresh position-insensitive multiset families were tested: a three-member pivot family passed, the fourth mechanically equivalent member was rejected, and eight genuinely distinct B2B positives remained candidates. Existing output/security coverage and all AI tests passed. No second classifier was found. |
| M04 replacement | **FAIL / OPEN — H-01** | The real sole architecture checker accepted a protected Production file containing `globalThis.fetch("https://api.deepseek.com")`; details in Finding H-01. |
| NM01 replacement | **PASS** | The detached/frozen 35-record, 3-domain compiled product, 69-code/14-order authority, 1,000 snapshot hashes, claimed replay checks, and CR-05..CR-08 ordering were inspected and exercised by focused tests. No raw profile override or second whole-context scanner was found. |
| M01 reconstruction | **PASS** | Source selector/result/target/version binding occurs before value/provenance acceptance; Product/Fabric/Company Fact boundaries, four Prompt-variable contracts, and JSONB/JCS/claimed round trip passed focused tests. No second projector was found. |
| NH01 reconstruction | **FAIL / OPEN — H-02** | The actual availability service distinguishes a malformed existing Revision row from a missing row for an unrelated actor; details in Finding H-02. |
| M03 preserved | **PASS** | Common read carrier remains select-only; the architecture gate reported 2 positive and 6 expected-negative type probes, and no execute/query/mutation/lock/transaction structural escape was found. |
| M05 preserved | **PASS** | `layout.tsx`, `globals.css`, Products page and test are byte-identical to the accepted design start; the pagination helper is absent at both points. |
| L01 preserved | **PASS** | Production Phase B composition exposes availability only; no callable request/enqueue/Worker/claim runtime is present. Shared codecs/types are not a second runtime authority. |
| L02 preserved | **PASS** | Executable evidence binds the exact code HEAD/tree and explains all docs-only successors; fixed manifest is 12/12 and the historical local-store/TLS events remain disclosed. |

### H-01 — M04 origin gate admits arbitrary direct `globalThis` capabilities

- Severity: **High**
- Root: M04 complete static capability/acquisition boundary
- Reproduction: in a disposable exact-Candidate snapshot, add this statement to protected Production AI source `src/ai/canonical-json.ts`:

  ```ts
  void globalThis.fetch("https://api.deepseek.com");
  ```

  The real sole gate, invoked through the installed pinned runtime, exits 0 and emits `ok: true`.
- Cause: `scripts/verify-ai-architecture.ts` lines 950–954 admit every direct named `globalThis.<member>` unless that member happens to be in a small loader-member deny set. The Owner decision authorized only direct named `globalThis.cwtDatabaseConnection` in two DB files. The implementation generalized this into an ambient capability allow path.
- Impact: forbidden Provider/network capability can enter protected Production source without the mandatory fail-closed architecture proof noticing it. This invalidates the claimed M04 replacement and frozen no-Provider/no-network proof.
- Required correction: narrow the single gate to the exact Owner-authorized member and exact Owner-authorized paths, while all other ambient/global capability origins fail closed; preserve one checker and re-run Fresh adversarial review.
- Schema/ADR/Owner decision: none. The existing Owner decision is already precise.

### H-02 — malformed authoritative Revision discloses record existence before actor scope

- Severity: **High**
- Root: NH01 actor-scoped target authorization/no-existence-leak ordering
- Reproduction: insert an `editorial_revisions` row with an unsupported authoritative `entity_type`, then inspect it through the actual Phase B availability service as an unrelated Content Editor. Compare with an otherwise identical missing Revision request.
- Actual results:

  - malformed existing row: `target_scope_mismatch`
  - missing row: `authorization_denied`

- Cause: `src/ai/applications/draft-assistance/composition.ts` lines 108–113 validates the authoritative `entityType` before applying actor record scope. A malformed row therefore produces a distinguishable state before the authorization fence.
- Impact: an unauthorized caller can distinguish the existence/state of a Revision row. This reopens the preserved NH01 no-existence-leak root.
- Required correction: make every pre-authorization malformed/missing/wrong-type outcome indistinguishable to an actor who has not passed authoritative record scope, while retaining one read, zero lock, and one authorization authority.
- Schema/ADR/Owner decision: none.

## 4. FULL_REVIEW_NECESSITY

**NOT_REQUIRED.**

Rationale: the Owner-ordered complete remediation-closure review above covered every repaired and preserved-closed boundary, and two independently reproduced High defects already make the exact Candidate ineligible. The mandatory identity, evidence, history, Schema, Prompt, public-surface, phase/security, lint, strict typing, focused AI and architecture gates were still completed. An unrelated exhaustive application suite or the known unchanged Google-font full-public build debt cannot restore eligibility or change either causal finding. Proportional review therefore stopped after the complete closure review plus mandatory gates.

No unrelated full application build or full application test suite is claimed as Fresh PASS in this review.

## 5. Mandatory identity, scope, and non-regression gates

- Formal worktree was clean and attached to the exact full ref; disposable snapshot was detached, clean, and fixed at exact HEAD.
- Both V2.2 design/implementation checkpoints resolve to `9aa9735f422975780585e62eaec1a4759f9894c9`.
- Owner DB-convergence checkpoint resolves to `d83cfb69a2abb51b95e43db3ea23c87c0410692b`.
- Frozen tag object/peel is `1c626f9b788e4c6ed0480a7040aa54ccef3e6c76` / `31c0e405acfdd0d05200d0fb2531e897a541a2c4`.
- Code successors after `4ce25e4…` are docs/evidence only.
- No Schema, Migration, snapshot, journal, seed, dependency set, package lock, public route, SEO, URL, or Product behavior change was found.
- Earlier failed implementation refs remain non-ancestors except the explicitly accepted evidence/history incorporated through the accepted checkpoint; no failed source branch was used as the replacement implementation base.
- Diff whitespace checks for accepted start → final Candidate and code HEAD → docs-only final Candidate pass.
- Public blobs are byte-identical to the design start and pagination helper remains absent.
- Production Prompt manifest remains exact-empty; Prompt bundle/history gates pass.
- Independent accepted-0020 extraction remains 21/21 and 96/96:
  - `ai_model_config` ordered mapping SHA-256 `bb8f81617e365e1e8095784b07fb3061f65aca44c8aacc76215456de243fb88c`
  - `ai_runs` ordered mapping SHA-256 `177a8c3bbe72fd198459e5da8376154030ed39a865704159d03fda9e1eeeecb4`
- No real Provider adapter/SDK/endpoint/credential/network runtime, fallback, RAG, vision, customer support, private Inquiry/CRM context, Phase C durable lifecycle, or Phase D/E integration was found in the unchanged Candidate baseline. H-01 demonstrates the structural proof would not reliably prevent one from being added.

## 6. Fresh verification summary

Runtime: Node `24.14.0`, V8 `13.6.233.17-node.41`, ICU `78.2`, Unicode `17.0`, CLDR `48.0`, TypeScript `5.9.3`.

| Verification | Result |
| --- | --- |
| Evidence consistency verifier | PASS, `IMPLEMENTATION_EVIDENCE_CONSISTENT_NOT_ACCEPTANCE` |
| Sole architecture gate baseline | PASS; 611 candidates, 468 executables, 2,500 edges, 32 declared faults, 5 positives, 28 mutations, zero unclassified/ambiguous |
| Reviewer M04 real-source fault | **FAIL SECURE EXPECTATION**: injected `globalThis.fetch` gate exit 0 |
| Reviewer M02/NH01 test file | M02 PASS; **NH01 FAIL SECURE EXPECTATION** |
| Focused implementation suite | 7 files / 71 tests PASS |
| All `src/ai` tests | 14 files / 162 tests PASS |
| Strict typecheck | PASS |
| Lint | PASS, zero warnings |
| DB AI-foundation verifier | PASS; 40 history artifacts and exact accepted Schema identity |
| Prompt bundle/history | PASS |
| Diff checks and final clean state | PASS |

The reviewer-only source mutations were made only in the disposable snapshot and restored byte-exactly. Final disposable and formal Candidate worktrees were clean.

## 7. External Validation / disclosed debt

1. The accepted V3.1 profile retains a historical `tsconfig` metadata identity while the current checker binds the immutable actual `tsconfig`. This is disclosed evidence/profile debt, not a new Candidate code finding and does not waive H-01.
2. The ordinary full public build remains blocked offline by the unchanged `next/font/google` path. Public blobs are unchanged; this is pre-existing local-environment/product debt, not a Candidate-caused failure. No full-public-build PASS is claimed.

## 8. Impact and next gate

- Schema/Migration/ADR/dependency/Complexity Approval impact: **none**
- Product/public/SEO/URL/data impact: **none**
- New Owner decision required: **no**
- Phase B implementation acceptance eligibility: **NO**
- Three-strike status: **not triggered by this review**; this is the first independent review of these defects in the replacement implementation Candidate.

Recommended next gate: the Coordinator must keep this exact Candidate out of Phase B acceptance and separately authorize a bounded implementation remediation for (1) exact-path/exact-member M04 ambient capability denial and (2) NH01 authorization-order/no-existence-leak. The corrected exact Candidate then requires a Fresh independent implementation re-review using the same remediation-first sequencing. Phase C/D/E remain unauthorized.
