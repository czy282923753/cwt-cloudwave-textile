# CWT Phase 1B Stage 4A Phase D FONT-HERMETIC S1.2 Canonical Temperature Parameter Authority Amendment / Exact Design V1.0

Status: **S1.2 AUTHOR-READINESS CANDIDATE / DOCS-EVIDENCE ONLY / FRESH INDEPENDENT FULL DESIGN-SECURITY REVIEW REQUIRED / S2 PROHIBITED / PHASE D NOT ACCEPTED**

Prepared: `2026-08-16` (`Asia/Shanghai`)

Immutable accepted S1: `adcbfe7984466f87ba7e530c0c9903dc02ce1260`

Immutable accepted S1.1 and required sole parent: `a545681e027f80932df3978a41cd72a5b3bfc992`

S1.1 authority amended narrowly: [Phase D FONT-HERMETIC S1.1 Hybrid-C Byte-Oracle Authority Amendment V1.0](./PHASE_1B_STAGE4A_PHASE_D_FONT_HERMETIC_S1_1_HYBRID_C_BYTE_ORACLE_AUTHORITY_AMENDMENT_V1_0.md)

Architecture: [ADR-0020](./adr/ADR-0020-phase-d-synthetic-only-bounded-convergence.md)

Proposed canonical fixture authority: [DeepSeek Synthetic Contract Canonical V1.1](./review-evidence/phase-1b-stage4a-phase-d-font-hermetic-s1-2-canonical-temperature-v1/DEEPSEEK_SYNTHETIC_CONTRACT_CANONICAL_V1_1.json)

Evidence manifest: [S1.2 Manifest V1.0](./review-evidence/phase-1b-stage4a-phase-d-font-hermetic-s1-2-canonical-temperature-v1/MANIFEST_V1_0.json)

## 1. Owner authority and exact scope

The Owner approved this exact S1.2 amendment: change only canonical JSON pointer `/request/parameters` from `{}` to `{"temperature":0}`. This restores consistency with the unchanged expected outbound body, which already contains `temperature=0`, and the unchanged Product adapter behavior, which copies explicitly supplied parameters. It does not create or authorize a Product default.

This authority permits only one docs/evidence-only S1.2 sole/direct child of exact accepted S1.1, one minimal ADR-0020 clarification, one newly derived canonical artifact and one manifest. It is not S1.2 acceptance, S2 authority, implementation, a gate PASS, checkpoint movement or Phase D/E/F authority.

## 2. Narrow supersession

| Earlier authority | S1.2 disposition |
|---|---|
| S1 §4.3 and S1.1 statements requiring empty `request.parameters` | **Superseded only at `/request/parameters`** by explicit `{"temperature":0}` |
| S1.1 canonical artifact identity and its future S2 copy-source disposition | **Superseded only after S1.2 independent PASS and Coordinator acceptance** by the artifact in §3 |
| S1.1 Hybrid-C TypeScript semantic/runtime authority | **Unchanged**; no TypeScript test bytes, length, Git blob or SHA-256 become normative |
| S1/S1.1 39-case contract and every other authority | **Unchanged** |

The accepted S1.1 artifact and manifest remain immutable evidence and the sole derivation source for this Candidate. Until exact S1.2 passes a different fresh independent full Design/security review and receives Coordinator formal acceptance, S1.2 and its artifact are proposed authority only. After that acceptance, the S1.2 artifact becomes the sole future S2 canonical-copy authority; the S1.1 artifact remains historical evidence and is no longer a future copy source.

## 3. Exact canonical artifact and delta proof

The proposed canonical artifact is:

```text
path=docs/review-evidence/phase-1b-stage4a-phase-d-font-hermetic-s1-2-canonical-temperature-v1/DEEPSEEK_SYNTHETIC_CONTRACT_CANONICAL_V1_1.json
derivedOnlyFrom=a545681e027f80932df3978a41cd72a5b3bfc992:docs/review-evidence/phase-1b-stage4a-phase-d-font-hermetic-s1-1-hybrid-c-v1/DEEPSEEK_SYNTHETIC_CONTRACT_CANONICAL_V1_0.json
sourceGitBlob=1082d3cb3449118b259177601b13e43bdc22587d
bytes=5216
gitBlob=19ad4373146bc909d66cfdddd2a70d6c2345334d
sha256=bc735f1ed6b9d4807a43f19b190315c72cd7fc56634bbd8bbbe617152531cd42
encoding=UTF-8
bom=ABSENT
lineTermination=EXACTLY_ONE_FINAL_LF
trailingBytes=ABSENT
```

The raw derivation replaces exactly this request-bounded token once:

```text
old="model":"deepseek-v4-flash","parameters":{},"responseFormat"
new="model":"deepseek-v4-flash","parameters":{"temperature":0},"responseFormat"
```

This boundary leaves the separate configuration-failure case's empty `parameters` object untouched. Parsing both artifacts and deleting `/request/parameters` produces structurally equal JSON; the old pointer is exactly `{}` and the new pointer is exactly `{"temperature":0}`. Reapplying the one bounded replacement to the exact accepted S1.1 bytes produces the S1.2 artifact byte-for-byte, proving that no other raw byte changed.

`/request/expectedBody` is therefore byte- and semantic-identical to S1.1. It still contains `temperature=0` and `thinking.type="disabled"`, with the same model, messages, stream flag, response format and maximum-token value. `/cases` is byte- and semantic-identical to S1.1.

## 4. Preserved executable contract and future S2

The complete fixture-owned inventory remains exactly 39 cases with all values unchanged: configuration 5; HTTP 12; invalid-response mutations 7; body failures 6; partial body 1; timeout 1; finish reasons 2; already-aborted 1; insufficient-resource 1; one-shot 1; redirect 1; success 1. Every exact case ID, registration, exhaustive mutation, normalized tuple, injected fetch/credential seam, call-count assertion, invalid-credential variant, Prompt/envelope/token estimate and success-normalization requirement in S1.1 §4 remains current.

Hybrid C remains unchanged: canonical JSON is the sole byte authority; the TypeScript adapter test is a fresh semantic/runtime executable specification. Future test bytes and hashes remain C2 evidence only.

Future S2 remains exactly the same 22 implementation paths. Within those already-authorized paths only:

1. `test-fixtures/ai/deepseek-synthetic-contract.v1.json` copies the exact accepted S1.2 canonical artifact byte-for-byte;
2. the fresh TypeScript adapter test consumes the explicit fixture parameter and proves the unchanged outbound body; and
3. the existing checker path mechanically changes its parent binding from accepted S1.1 to the exact accepted S1.2 commit supplied after formal acceptance.

No implementation occurs in S1.2. Product adapter and all Product/runtime bytes remain unchanged; no default `temperature` behavior is introduced.

## 5. Preserved boundaries

The validation harness authority, exact 22-path allowlist, Gates 1–10 fresh-once/no-retry sequence, exactly two bespoke runtime/proof outputs, synthetic-only classification, zero external egress/DNS, numeric-loopback boundary, local-font/public-bundle contract, task-owned PGlite, generated-root lifecycle and no-`CI` error-mode pnpm currentness remain unchanged.

Real Secret/database/Provider/API and protected environments remain `NOT_RUN / DEFERRED_TO_PHASE_F`; the affected validation credential remains `ROTATION_REQUIRED_BEFORE_ANY_REUSE`. Phase E/F, Push, Deploy and checkpoint actions remain prohibited. No dependency, lock, Schema, Migration, Product/API, SEO/URL, publishing/Index or Product-data decision or mutation is authorized. No ADR-0021 is created.

Author verification confirms the new artifact retains the S1.1 absence of credential/placeholder, environment key/value, database identity/query, private path, account/project identity, official-source content and timestamps. The new scalar is only the non-secret numeric value `0` at the approved pointer.

## 6. Lineage, review and rollback

```text
accepted S1 adcbfe7984466f87ba7e530c0c9903dc02ce1260
  -> accepted S1.1 a545681e027f80932df3978a41cd72a5b3bfc992
       -> proposed docs/evidence-only S1.2
            -> different fresh independent full S1.2 Design/security review
            -> Coordinator formal acceptance of exact S1.2
            -> future fresh S2 using the same 22 paths
            -> C2 only after full fresh PASS
```

Failed S2 `1f2f7b8472ac0357748911ab547bf72cd033ae8e` is immutable failed evidence only. It is excluded from S1.2 ancestry, content/copy authority and every future final lineage.

S1.2 must be one clean sole/direct child of exact accepted S1.1. The author does not self-review or accept it and does not create or start the independent review. Rollback discards S1.2 and restores accepted S1.1 as current authority without rewriting S1, S1.1, their review/custody artifacts or failed evidence.

## 7. Terminal status

```text
S1.2 = AUTHOR-READINESS CANDIDATE / NOT_ACCEPTED
CANONICAL PARAMETER CORRECTION = RECORDED / PENDING FRESH INDEPENDENT REVIEW
S1.1 HYBRID-C AND ALL OTHER S1/S1.1 AUTHORITY = UNCHANGED
S2 = PROHIBITED
NEXT GATE = DIFFERENT FRESH INDEPENDENT FULL S1.2 EXACT DESIGN/SECURITY REVIEW
```
