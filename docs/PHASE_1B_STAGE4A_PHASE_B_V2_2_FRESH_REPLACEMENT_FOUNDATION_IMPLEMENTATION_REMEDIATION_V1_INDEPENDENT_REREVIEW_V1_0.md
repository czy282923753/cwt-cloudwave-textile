# CWT Stage 4A Phase B — Fresh Replacement Implementation Remediation V1 Independent Re-review V1.0

## 1. Identity and conclusion

- Task: `CWT Stage 4A Phase B｜Fresh Replacement Implementation Remediation V1 Independent Re-review — H-01/H-02`
- Review type: Fresh, read-only, adversarial Independent Implementation Re-review
- Candidate ref: `refs/heads/codex/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-implementation-remediation-v1`
- Candidate HEAD: `49f789a9e4c5c7f2a3dbd7eaddba17e6a248832b`
- Direct parent / corrected code HEAD: `8cd768fada5da140d62aa48b7efc02d60cf1758b`
- Candidate tree: `d241b7df5cb57d6419dfa07b4a6bbe86bc422d94`
- Code parent/tree: `8c43df1719fb550f9849ee6dd26e169a351e0339` / `242b1b8eeff9c38bc872d0f56a1e7bcaf2592752`
- Failed Candidate ref: `b95390c34fc4fe687f6e7577a7505a7394bca80b`, preserved
- Detached review snapshot: `/tmp/cwt-v22-remediation-review.S2PIq6`
- Review conclusion: **FAIL**
- Finding counts: **Blocker 0 / High 1 / Medium 0 / Low 0 / External Validation 2**
- Phase B implementation acceptance eligibility: **NO**

The Candidate was not modified. All reviewer-only mutations were confined to the disposable exact snapshot and restored byte-exactly.

## 2. Fixed identity, scope and evidence gate

Identity, parent/tree, linear two-code-commit remediation history and docs-only successor were independently verified. The failed-to-corrected-code Product delta is exactly four modified paths and has zero additions/deletions:

1. `scripts/verify-ai-architecture.ts`
2. `test-fixtures/ai-architecture/graph-faults.v3_1.json`
3. `src/ai/applications/draft-assistance/composition.ts`
4. `src/ai/provider-neutral-foundation.integration.test.ts`

No Schema, Migration, snapshot, journal, seed, package, lock, dependency, Prompt, Provider, Product/public, SEO, URL or data-path change occurred. Diff whitespace and final clean-state checks pass.

| Fixed artifact | SHA-256 | Result |
| --- | --- | --- |
| Remediation report | `31692ba0e2fe7c83b98db62238e1453c9a6fbd134a0a9d0fff93887089bea847` | exact |
| Remediation authority | `aa8f7f2c2502b08860c6232c852ccc0eac5eb4ba5e1db1d6bd850a0f1912c3b8` | exact |
| Remediation manifest | `f0b98c4c5fefc07cfb7c1ae265b5f88c5a6cfc4428dcc648172eb6f26debce79` | exact; 17/17 |
| Controlling FAIL package | imported manifest | exact; 7/7 |
| M04 proof artifacts | five files | exact; 5/5 |

The evidence verifier returned `CORRECTED_CANDIDATE_REVIEW_REQUIRED_NOT_ACCEPTED`; it was treated only as package consistency evidence.

## 3. REMEDIATION_FINDINGS_REVIEW

This required closure review was completed before the decision on broader full review.

| Finding or preserved boundary | Disposition |
| --- | --- |
| H-01 — M04 exact global capability/member/path boundary | **OPEN / FAIL after correction attempt 1** |
| H-02 — NH01 authorization ordering/no-existence leak | **CLOSED / PASS after correction attempt 1** |
| Owner-approved DB convergence | **PASS / preserved closed** |
| M02 replacement | **PASS / preserved closed** |
| M04 replacement | **OPEN through H-01** |
| NM01 replacement | **PASS / preserved closed** |
| M01 reconstruction | **PASS / preserved closed** |
| NH01 reconstruction | **CLOSED through H-02** |
| M03 select-only seam | **PASS / preserved closed** |
| M05 public-surface boundary | **PASS / preserved closed** |
| L01 availability-only surface | **PASS / preserved closed** |
| L02 evidence/process fidelity | **PASS / preserved closed** |

### H-01 — ambient global network capability bypasses the sole M04 gate

- Severity: **High**
- Root classification: **same H-01/M04 root**, not a new root
- Attempt accounting: **OPEN after correction attempt 1**; the next bounded correction would be attempt 2, not a three-strike escalation
- Exact location: `scripts/verify-ai-architecture.ts`, Production capability-origin traversal around the `globalThis` identifier rule
- Fresh reproduction: in protected `src/ai/canonical-json.ts`, add:

  ```ts
  void fetch("https://api.deepseek.com");
  ```

  The real sole architecture gate exits `0` and emits `ok: true`.
- Cause: the remediation correctly narrows explicit `globalThis` spelling, but the claimed closed Production origin language does not resolve or deny equivalent ambient globals such as bare `fetch`. The implementation proves a token spelling, not the capability origin.
- Real impact: a forbidden network/Provider acquisition can be added to protected Production AI source without the architecture gate noticing it. This invalidates the M04 fail-closed proof and the frozen no-network/no-Provider boundary.
- Required correction: within the sole checker, make the closed ambient/global capability-origin policy complete for equivalent runtime-global forms while preserving the exact DB exception; do not add a second checker, compatibility path or symptom-only file fixture.
- Owner/ADR/Schema decision: none; current design and Owner exception already require this behavior.

### H-02 — closed

The actual availability service and a Fresh PGlite probe show record-scope-first behavior. Malformed existing, missing, wrong-role and unrelated Revision cases are indistinguishable to unauthorized actors (`authorization_denied`). Only an authorized Product Editor sees `target_version_conflict`; Admin sees malformed structure only after authorization. Literal code inspection shows one Revision select, no lock, and no second target authorization authority.

## 4. FULL_REVIEW_NECESSITY

**NOT_REQUIRED.**

Concrete rationale: this remediation is bounded to four Product-code paths, the complete remediation-closure review found a decisive High same-root residual, and the exact Candidate is therefore already ineligible. Mandatory identity/evidence/frozen-boundary checks, all AI tests, Fresh H-01/H-02 probes, lint, strict typing, DB/0020/Prompt gates, architecture/type/fault/mutation gates and public-byte identity were completed. An unrelated exhaustive application suite or optional full public build cannot change the H-01 disposition and is not proportional.

## 5. Mandatory non-regression and verification

Pinned runtime: Node `24.14.0`, V8 `13.6.233.17-node.41`, ICU `78.2`, Unicode `17.0`, CLDR `48.0`, TypeScript `5.9.3`.

| Verification | Result |
| --- | --- |
| Formal identity/ref/clean; detached exact snapshot | PASS |
| All `src/ai` tests | 14 files / 163 tests PASS |
| Fresh H-02 real-service probe | 1 file / 1 test PASS |
| DB cache/Schema and frozen public tests | 4 files / 5 tests PASS |
| Lint / strict typecheck | PASS / PASS |
| DB AI-foundation verifier | PASS; 40 historical artifacts |
| `ai_model_config` / `ai_runs` | exact 21/21 / 96/96 |
| Prompt bundle / history | PASS / PASS |
| Production Prompt manifest / Provider registry | exact-empty / exact-empty |
| Architecture baseline | PASS; 622 candidates, 470 executables, 12 classes, zero unclassified/ambiguous, 39 faults, 28 mutations, five proofs |
| Architecture type seams | 2 positive / 6 expected-negative PASS |
| Fresh explicit-`globalThis` variants | rejected as expected |
| Fresh bare ambient `fetch` | **unexpected PASS; decisive H-01 failure** |
| Public blobs / pagination helper | byte-identical / absent at both checkpoints |
| Final formal and disposable clean state | PASS |

The 0020 ordered-list hashes independently recomputed in this review are:

- `ai_model_config`: `9a1e4a7cbe0ea8ee6eecad22d233c3865ca60658c07eb790b75747a13559368b`
- `ai_runs`: `413824f30e3c74d7b58070c13231985596436e066e65e8f0d4f434cb821cda64`

No real Provider adapter/SDK/endpoint/credential/network runtime, fallback, RAG, vision, customer support, private Inquiry/CRM context, Phase C durable runtime or Phase D/E integration was found in the present source. H-01 means the structural gate does not reliably prevent an ambient network capability from being introduced later.

## 6. External Validation and disclosed debt

1. The accepted V3.1 profile retains a historical `tsconfig` metadata mismatch while the current checker binds actual immutable `tsconfig` content. This remains disclosed evidence/profile debt and does not waive H-01.
2. The unchanged `next/font/google` path remains an offline full-public-build debt. Public blobs are unchanged; no full-public-build PASS is claimed.

## 7. Impacts, eligibility and next gate

- Schema/Migration/ADR/dependency/Complexity Approval impact: **none**
- Product/public/SEO/URL/data impact: **none**
- New Owner decision required: **no**
- Phase B implementation acceptance eligibility: **NO**
- Three-strike status: **not triggered**

Exact next gate: keep this Candidate out of Phase B acceptance. If separately authorized, perform a bounded H-01/M04 correction attempt 2 that closes equivalent ambient/global capability origins in the one checker, then conduct a Fresh independent implementation re-review with the same remediation-first sequencing. H-02 and all preserved-closed findings should remain non-regression checks. Phase C/D/E remain unauthorized.

