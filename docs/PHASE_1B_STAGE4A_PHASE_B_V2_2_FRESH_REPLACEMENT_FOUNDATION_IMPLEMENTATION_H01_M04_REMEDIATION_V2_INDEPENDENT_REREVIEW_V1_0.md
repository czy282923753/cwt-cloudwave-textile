# CWT Stage 4A Phase B — Fresh Replacement Implementation H-01/M04 Remediation V2 Independent Re-review V1.0

## 1. Identity and conclusion

- Task: `CWT Stage 4A Phase B｜Fresh Replacement Implementation H-01/M04 Remediation V2 Independent Re-review`
- Candidate ref: `refs/heads/codex/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-implementation-h01-m04-remediation-v2`
- Candidate HEAD/parent/tree: `d41c9c4bd496f4c3a612c6ac88cc5acf6ae83308` / `75c77797d64636d303cea2e8683c7a093fe8ec1f` / `baa61ca075fb5756876c8aa2eeeceb6a38bfd7f8`
- Exact code HEAD/parent/tree: `75c77797d64636d303cea2e8683c7a093fe8ec1f` / `49f789a9e4c5c7f2a3dbd7eaddba17e6a248832b` / `018d872a3544bbfc9d0f6aa84b08911d262ee2b9`
- Failed remediation ref preserved at: `49f789a9e4c5c7f2a3dbd7eaddba17e6a248832b`
- Detached review snapshot: `/tmp/cwt-h01-m04-v2-review.n05h23`
- Review conclusion: **FAIL**
- Finding counts: **Blocker 0 / High 1 / Medium 0 / Low 0 / External Validation 2**
- Phase B implementation-gate eligibility: **NO**

The formal Candidate was not modified. All disposable faults were restored; formal and detached states ended clean.

## 2. Identity, scope and evidence

The one code commit is linear and changes exactly two existing mode-`100644` Product-code files:

1. `scripts/verify-ai-architecture.ts`
2. `test-fixtures/ai-architecture/graph-faults.v3_1.json`

There are no added/deleted Product-code paths, merges, symlinks, mode changes, Schema/Migration/package/lock/config/Prompt/Provider/public/Product/SEO/URL/data changes. Every successor after code HEAD is docs/evidence only.

| Artifact | SHA-256 | Result |
| --- | --- | --- |
| Remediation report | `12d1b3c15fcb2633861f9b4252e45e015e74edd9d02d22d821317b0c51295fac` | exact |
| Canonical authority | `2f3aa02b13f2f3b927409c18f1c1e7a4ddab55f9f4bc6356d3d86c0c2d4eec8a` | exact |
| Sole remediation manifest | `35cb5029ef89f0b9bfd3ec122b430342290032aee5334a8b8f2927fae6d70fd9` | exact; 18/18 |
| Controlling FAIL manifest | `d1e66f0a1ffdfb898e62508643c6488027ad98eb79eddff05e4543cf66776cd7` | exact; 7/7 |
| M04 proof artifacts | five files | exact; 5/5 |

The attached evidence verifier returned `CORRECTED_CANDIDATE_REVIEW_REQUIRED_NOT_ACCEPTED`, exact identities, 18 entries, 16 semantic faults, two shadow positives, five proofs and clean state. It was treated as package consistency evidence only.

## 3. REMEDIATION_FINDINGS_REVIEW

This review was completed before deciding whether a broader review was needed.

| Boundary | Disposition |
| --- | --- |
| H-01/M04 correction attempt 2 | **OPEN / FAIL** |
| H-02/NH01 correction attempt 1 | **CLOSED / PASS** |
| Owner DB convergence | **PASS / preserved closed** |
| M02 replacement | **PASS / preserved closed** |
| NM01 replacement | **PASS / preserved closed** |
| M01 reconstruction | **PASS / preserved closed** |
| M03 | **PASS / preserved closed** |
| M05 | **PASS / preserved closed** |
| L01 | **PASS / preserved closed** |
| L02 | **PASS / preserved closed** |
| Provider/Prompt/security/phase boundaries | **PASS / preserved closed** |
| Schema/Migration/package/lock | **PASS / preserved closed** |
| Public/Product/SEO/URL/data | **PASS / preserved closed** |

### H-01 — non-emitting declarations bypass the semantic ambient-origin gate

- Severity: **High**
- Root classification: **same H-01/M04 root**, not a genuinely new root
- Attempt accounting: **OPEN after correction attempt 2**; exactly one ordinary attempt 3 remains; three-strike escalation is not yet triggered
- Exact causal boundary: `ambientRuntimeCapabilityOrigin` in `scripts/verify-ai-architecture.ts`
- Fresh witness:

  ```ts
  declare function fetch(url: string): Promise<unknown>;
  declare class WebSocket { constructor(url: string); }
  declare const window: { fetch: typeof fetch };
  void fetch("https://api.deepseek.com");
  void new WebSocket("wss://api.deepseek.com");
  void window.fetch("https://api.deepseek.com");
  ```

  The real sole architecture gate exits `0` and returns `ok=true`.
- Cause: the checker treats every repository declaration as a real runtime-local shadow. `declare` declarations emit no binding, so the runtime reference still resolves to the ambient capability the gate must deny.
- Impact: protected Phase B Production source can conceal direct network/Provider capabilities behind a non-emitting TypeScript declaration while all architecture proof artifacts remain green.
- Required correction: preserve legitimate emitted local/imported shadows, but make the sole semantic origin rule fail closed for non-emitting ambient/repository declarations and equivalent forms. Do not add a second checker, compatibility path or fixture-specific name exception.
- Owner/ADR/Schema decision: none; the accepted contract already requires fail-closed ambient capability origins.

The previous literal `fetch` witness now rejects with deterministic path/rule/AST/origin/capability diagnostics. Wrong-path `globalThis.cwtDatabaseConnection` rejects, the exact approved DB access passes, and a genuine runtime function-parameter shadow passes. The defect is therefore narrower than attempt 1 but remains the same semantic-origin root.

### H-02 — closed

The byte-identical Fresh PGlite service probe reran successfully. Unauthorized Product/Content actors receive indistinguishable `authorization_denied` for missing, malformed and unrelated Revision records; authorized Product Editor and Admin observe only their permitted downstream results. Availability remains one read, zero lock and one authorization authority.

## 4. FULL_REVIEW_NECESSITY

**NOT_REQUIRED.**

Trigger analysis: the remediation is confined to one non-runtime checker and its profile fixture. The complete closure review found a decisive High same-root residual, so Candidate eligibility is already NO. Mandatory identity/evidence/security, all AI tests, Fresh H-01/H-02 probes, lint, strict typing, DB/0020, Prompt, graph/type/mutation/proof and public-boundary checks were completed. An unrelated exhaustive application suite cannot change this static-origin finding and is not proportional.

## 5. Mandatory verification and non-regression

Runtime: Node `24.14.0`, V8 `13.6.233.17-node.41`, ICU `78.2`, Unicode `17.0`, CLDR `48.0`, TypeScript `5.9.3`.

| Verification | Result |
| --- | --- |
| Exact formal/detached identity and clean states | PASS |
| All `src/ai` tests | 14 files / 163 tests PASS |
| Fresh H-02 PGlite probe | 1 file / 1 test PASS |
| DB/cache/schema/noindex/public focused | 7 files / 9 tests PASS |
| Lint / strict typecheck | PASS / PASS |
| AI-foundation/0020 verifier | PASS; 40 historical artifacts |
| `ai_model_config` / `ai_runs` | exact 21/21 / 96/96 |
| Prompt bundle/history | PASS / PASS |
| Production Prompt manifest / Provider registry | exact-empty / exact-empty |
| Architecture final baseline | PASS; 633 candidates, 472 executables, 12 classes, zero unclassified/ambiguous |
| Graph profile / lifecycle | 55 fault+topology cases, seven positives, 28 mutations |
| M03 type seams | 2 positive / 6 expected-negative PASS |
| Five M04 proof artifacts | exact; Phase D/adapter absent, public/client isolation and positive leak control PASS |
| Literal bare `fetch` / wrong-path DB member | rejected / rejected |
| Real runtime-local `fetch` shadow | accepted, correct positive |
| Non-emitting `declare` ambient disguise | **unexpectedly accepted; decisive failure** |
| Public blobs / pagination helper | byte-identical / absent at both |

Independent ordered extraction hashes:

- `ai_model_config`: `9a1e4a7cbe0ea8ee6eecad22d233c3865ca60658c07eb790b75747a13559368b`
- `ai_runs`: `413824f30e3c74d7b58070c13231985596436e066e65e8f0d4f434cb821cda64`

No actual Provider adapter/SDK/endpoint/credential/network runtime, fallback, RAG, vision, customer support, Phase C durable runtime or Phase D/E integration was found in current source. The finding concerns the structural gate that must prevent such capability introduction.

## 6. External Validation and process truth

1. The accepted V3.1 profile retains its disclosed historical `tsconfig` metadata mismatch while the checker binds actual immutable `tsconfig`; this is unchanged evidence debt.
2. The unchanged Google-font route keeps the previously disclosed offline full-public-build debt. Public/font bytes did not change; no full-public-build PASS is claimed.

The code delta passes `diff --check`. The docs successor's only four diagnostics are fixed EOF bytes in the imported controlling FAIL package; excluding that byte-identical set, the owned successor diff passes.

## 7. Impacts, eligibility and next gate

- Schema/Migration/ADR/dependency/Complexity impact: **none**
- Product/public/SEO/URL/data impact: **none**
- New Owner decision required: **no**
- Implementation-gate eligibility: **NO**
- Three-strike status: **not triggered**

Exact next gate: keep this Candidate out of Phase B acceptance. If separately authorized, perform bounded H-01/M04 correction attempt 3 for non-emitting ambient declarations and equivalent semantic-origin disguises within the sole checker, then run a Fresh independent implementation re-review using remediation-first sequencing. If the same H-01/M04 root remains open after that independent attempt-3 review, three-strike escalation becomes mandatory and ordinary attempt 4 is prohibited. Phase C/D/E remain unauthorized.

