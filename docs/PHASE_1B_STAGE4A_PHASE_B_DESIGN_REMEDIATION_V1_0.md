# CWT Stage 4A Phase B — Design Remediation Record V1.0

- Status: **REMEDIATION CANDIDATE — AUTHOR-CLAIMED CLOSURE ONLY / NOT INDEPENDENTLY APPROVED**
- Prepared: `2026-08-10` (Asia/Shanghai)
- Failed reviewed Design: `PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_EXACT_DESIGN_V1_0.md`
- Failed Design SHA-256: `a0dd322de815e4b627b3f20f78454303e262756f2d209699379db5d56a4fa247`
- Failed exact commit: `de0c3e4ec63331837baefd1ff755ecd0ffb9d46f`
- Corrected Design Candidate: `PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_EXACT_DESIGN_V1_1.md`
- Branch: `codex/phase-1b-stage4a-phase-b-design-v1`
- Next gate: **Fresh Re-review by the original independent Phase B Design Reviewer**

> This record is an audit index from every independent finding to the complete V1.1 design. It is not an erratum, does not replace V1.1, does not approve closure, and authorizes no implementation. V1.0 remains byte-identical as the failed-review input.

## 1. Remediation input identity

| Input | Exact identity | Recomputed before remediation |
|---|---|---|
| branch/current starting HEAD | `codex/phase-1b-stage4a-phase-b-design-v1` / `de0c3e4ec63331837baefd1ff755ecd0ffb9d46f` | PASS |
| starting parent | `c6f9714750622d9b977c284b5eeceea93da007a5` | PASS |
| immutable V1.0 | SHA-256 `a0dd322de815e4b627b3f20f78454303e262756f2d209699379db5d56a4fa247` | PASS |
| Independent Design Review V1.0 | SHA-256 `89adab2aa9466437105840d68248703a63a2703f696d4950f73e4d0635cc4ad2` | PASS |
| Independent Review Evidence V1.0 | SHA-256 `a3958624e0b013907b8f27dd75e7bd315500637eba1f6f944fef6a89ea0fe1b5` | PASS |
| review evidence manifest | SHA-256 `f57a7d01488af9dc80f4baa2d416775d1e8c3638d058546e569eeb4799b02f6b` | PASS |

The independent result was Blocker `0`, High `2`, Medium `6`, Low `1`; implementation was **NOT ELIGIBLE**. The reviewer found no required current Schema, ADR, or Owner decision if the design followed the corrective path. This remediation therefore narrows contracts without changing accepted `0020`, ADR-0017/0018, or frozen scope.

## 2. Closure disposition summary

| Finding | Author disposition | Primary V1.1 sections | Unique closure assertion |
|---|---|---|---|
| H-01 | claimed corrected; pending Fresh Re-review | §§1, 6–9, 18.5, 20, 25 | application-neutral core |
| H-02 | claimed corrected; pending Fresh Re-review | §§7, 14–16, 17, 20 | strict Provider output |
| M-01 | claimed corrected; pending Fresh Re-review | §§10.2–10.3, 10.6, 20 | complete config read |
| M-02 | claimed corrected; pending Fresh Re-review | §§7, 12, 19.6, 20 | Prompt authority/package/history |
| M-03 | claimed corrected; pending Fresh Re-review | §§10.1, 18.1–18.3, 20 | normative order/replay |
| M-04 | claimed corrected; pending Fresh Re-review | §§8, 11.2, 13.2, 18.4, 20 | durable reconstruction |
| M-05 | claimed corrected; pending Fresh Re-review | §§3, 13.3, 14.3–14.5, 20 | Product provenance |
| M-06 | claimed corrected; pending Fresh Re-review | §§7, 19.3–19.7, 20 | transitive structural/bundle gate |
| L-01 | claimed corrected; pending Fresh Re-review | §§7, 10.4, 20 | RFC 8785/JCS |

Each assertion occurs exactly once in this record. “Claimed corrected” means the author supplied an implementable contract and verification obligation; only the independent Fresh Re-review may mark it accepted.

## 3. H-01 — Application-neutral core

### Old problem

V1.0 placed Draft-specific `AiTarget`, Production use-case, `PrepareDraftRunCommand`, allowed-target union, and fixed `protected_draft_candidate_only` result rule in the purported core. The Synthetic entry could only prove another Draft-shaped use case.

### Corrected mechanism

V1.1 makes the core command carry an opaque application payload. Each immutable application definition supplies its command codec, association codec/policy, context policy, Prompt-variable builder, output codec, protected-result kind, and disposition kind. Draft targets and `draft_candidate` / `draft_human_review` live only under the Draft application facade/policies. Core owns only ordering, resolution, reconstruction, one adapter call, framing, and normalization.

The Synthetic proof uses:

- association `synthetic_case_association { suiteKey, sampleOrdinal, epochLabel }`;
- result `synthetic_review_packet`;
- disposition `synthetic_probe_verdict` with `acknowledged/discarded`;
- a fresh test registry and Synthetic policies/schema/resources.

It imports no Draft contracts, edits no core file, uses no `customer_support`, and never persists to `0020`. Future Customer Service still needs a separate application/security/privacy design and forward Schema support, but not a core-orchestration contract change.

### Verification contract

- Core production graph contains no Draft target/result/disposition literals or Draft application import.
- Compile the distinct Synthetic application against only generic interfaces.
- Run generic prepare/reconstruct/fake-call/protect with its distinct shapes.
- Assert no Draft persistence port/`ai_runs` access and Production registry exact four keys.

### Schema/ADR impact

No current Schema/Migration or ADR change. Accepted `0020` remains Draft-only. The correction implements ADR-0018 rather than widening it.

**Closure assertion `CLOSE-H01-APPLICATION-NEUTRAL-CORE`:** V1.1 permits a non-Draft association/result/disposition through application codecs and the unchanged generic core while Production and `0020` remain exactly Draft-only.

## 4. H-02 — Strict Provider output

### Old problem

V1.0 referenced undefined narrative Block types, did not fix keys/sourceRefs/identity/lock/conversion behavior, relied on an unspecified duplicate-key check, and lacked a mandatory completion signal able to reject syntactically complete length-stopped output.

### Corrected mechanism

V1.1 defines strict heading, paragraph, feature list, bullet list, callout, and FAQ objects; four explicit use-case discriminated unions; four complete outer output objects; all string/array/block/total limits; and sourceRefs at every EvidenceText leaf. Provider output cannot include `id`, `candidateRef`, or `locked`. Core derives deterministic non-durable candidate refs after policy validation; Phase E creates fresh existing-format Block IDs and never accepts Provider locks.

The raw boundary is a dependency-free 96 KiB/depth/node-bounded recursive-descent parser. It rejects fences, commentary/comments, multiple/concatenated values, trailing bytes, nested exact/NFC-equivalent duplicate keys, invalid escapes/surrogates/numbers, prototype keys, oversize, and token-level truncation before Zod. It returns one root object without a later `JSON.parse`.

`ProviderTextResultV1.success` contains mandatory completion `complete | length_limit | content_filter | cancelled | unknown`. Only `complete` reaches the parser; all other variants normalize to exact typed failure.

### Verification contract

- Direct parser test for every framing/duplicate/Unicode/limit/truncation case.
- Direct strict-key/bound test for every Block and outer schema.
- Reject Provider identity/lock keys; verify candidate-ref derivation and Phase E conversion.
- Feed valid JSON with `length_limit`/`unknown` and assert parser call count zero.
- Assert one adapter call maximum and no second model.

### Schema/ADR impact

None. Protected Draft output still maps to existing `candidate_json`/`candidate_hash` only in Phase C.

**Closure assertion `CLOSE-H02-STRICT-PROVIDER-OUTPUT`:** V1.1 fixes a mechanically implementable pre-Zod parser, complete candidate grammar/identity conversion, and completion gate so no incomplete or ambiguously framed output can reach `draft_ready`.

## 5. M-01 — Deterministic configuration query

### Old problem

V1.0 ordered enabled rows first and limited to three, allowing three enabled non-default rows to hide a disabled default and misreport `config_default_missing`.

### Corrected mechanism

V1.1 specifies one parameterized SQL statement with a materialized scoped relation and complete aggregate counts for total/default/enabled-default rows plus all enabled-default rows. The repository returns one consistent result within the supplied read/transaction scope. No active-default cache or follow-up diagnostic query exists.

The resolver validates port consistency, then uniquely distinguishes no rows, disabled default, no default, one enabled default, multiple enabled defaults, and impossible/corrupt port results.

### Verification contract

Test three and 100 enabled non-default rows plus disabled defaults, arbitrary larger row sets, one enabled default plus disabled rows, two corrupt enabled defaults, and every count/list/flag/key inconsistency. Assert one repository read and no `LIMIT`.

### Schema/ADR impact

None. The partial unique enabled-default index remains authority.

**Closure assertion `CLOSE-M01-COMPLETE-CONFIG-READ`:** V1.1 derives every resolution code from complete same-snapshot default facts and cannot truncate a disabled default.

## 6. M-02 — Prompt manifest, bundle, and history

### Old problem

V1.0 relied on an undefined static manifest and did not specify raw-byte deployment packaging, manifest/resource authority, protected-history refs, or first-empty-Production behavior.

### Corrected mechanism

V1.1 fixes:

- authoritative `src/ai/prompts/resources/production/manifest.v1.json` and tuple schema;
- immutable raw path/UTF-8/final-LF/SHA/metadata contract;
- exact membership versus content authority;
- deterministic checked-in `production-prompt-bundle.generated.ts` with exact base64 bytes;
- generator and check-only byte-regeneration verifier;
- runtime static ESM loader with no directory scan/dynamic import/filesystem dependency;
- explicit Git-object history command with required `--base`/`--candidate`;
- initial base `c6f971...` absence treated as empty history;
- stale/unreferenced/missing/duplicate/repoint/version/history failures;
- separate Synthetic manifest/resources; and
- test-only Next standalone proof of exact server bytes and client absence.

### Verification contract

Byte-regenerate, decode/hash exact resources, run every manifest/history negative case, verify explicit base refusal rules, build/execute standalone fixture, and scan client bundles. Production Phase B manifest and generated tuple are exactly empty.

### Schema/ADR impact

None. Prompt files/manifest remain repository authority; config selects and run snapshots an exact tuple.

**Closure assertion `CLOSE-M02-PROMPT-MANIFEST-BUNDLE-HISTORY`:** V1.1 supplies one authoritative manifest/resource model and one byte-exact verified deployment derivative with explicit immutable history and first-empty behavior.

## 7. M-03 — Normative ordering and replay

### Old problem

V1.0 contradicted itself about use-case, authorization, context, feature, and config ordering and did not define availability input or Phase A replay-first semantics.

### Corrected mechanism

V1.1 Section 18 is the sole normative source. Both APIs parse, coarse-authorize, resolve registry, authorize/snapshot target, and validate explicit context first. Unauthorized roles see no registry/readiness; a coarse-authorized unknown key returns `use_case_unknown` before target/config.

Availability then checks environment/process/DB feature, config, adapter/Prompt, and returns a safe readiness shape. Request executes inside Phase C's governed transaction: reauthorization/context/fingerprint, scoped idempotency lookup, exact replay before current feature/config/Prompt, otherwise new-run resolution/insert/Audit. Fingerprint includes current target version/snapshot/source/input, so replay does not bypass freshness. Only committed run summaries replay; pre-insert errors are recomputed.

### Verification contract

Assert exact first error and port read counts for every stop, unauthorized non-disclosure, unknown key position, exact/mismatched/unauthorized/concurrent replay, no current config reads on exact replay, and one run/Audit winner.

### Schema/ADR impact

None. This adopts the accepted Phase A enqueue contract.

**Closure assertion `CLOSE-M03-NORMATIVE-ORDER-REPLAY`:** V1.1 defines one availability order and one mutation/replay order with exact authorization, freshness, error precedence, and read counts.

## 8. M-04 — Durable claimed provenance

### Old problem

V1.0 allowed the Worker to pass a pre-rendered request while omitting durable Prompt/input/config hashes from the claimed command, so the brand could not prove request provenance.

### Corrected mechanism

The Worker now supplies only a strict durable database projection carrying association/target hash, config snapshot/hash, Prompt tuple/hash, envelope version/hash, schema/policy versions, reconstructible input context/hash, and lease/state/dispatch authority. Core reloads exact Prompt raw bytes, rebuilds and hashes config/context, checks envelope/policy/schema/association, deterministically rebuilds variables/request, then calls one adapter.

`input_context_json` has an exact strict shape containing every Prompt-variable input. There is no rendered-request field or unclaimed execution entry. The brand is explicitly only a zone guard.

### Verification contract

Independently tamper every Prompt/context/config/envelope/policy/association/lease component, inject a `request` key, and assert exact provenance error plus zero calls. A valid DB-shaped round-trip must reconstruct byte-identical request and make one call.

### Schema/ADR impact

None. The compositional hashes use existing accepted columns; no request-hash column is invented.

**Closure assertion `CLOSE-M04-DURABLE-RECONSTRUCTION`:** V1.1 makes core—not Worker—the sole rendered-request constructor from verified durable snapshots and exact Prompt bytes.

## 9. M-05 — Product provenance

### Old problem

V1.0 did not distinguish structural Product values from reviewed facts or explain provenance for optional fields without `product_field_reviews`; it also allowed hidden Product Code ambiguously.

### Corrected mechanism

V1.1 maps every requested field to actual Schema/Domain Service authority. Name/category/Application are structural. Composition/GSM/Width/MOQ require exact `provided/verified` review rows. Fabric Style/Color Options/MOQ Note/Custom/Sample are current stored Domain-Service values labelled `provided` only, never verified. Null/blank/unknown/empty/rejected/missing-review explicit selections fail; optional unselected values remain absent. MOQ requires both values/reviews and allowlisted unit.

Product Code is hidden/internal: it is not in `input_context_json`, not sent to Provider, and forbidden from all AI candidate narrative. Eligible technical evidence may support sourced narrative only; output Schema has no fact/category/Application mutation field.

### Verification contract

Test each matrix cell, both provenance statuses, every ineligible status/value, MOQ combinations, Product Code selection/output, and narrative evidence requirements.

### Schema/ADR impact

None. No new provenance table/column is assumed.

**Closure assertion `CLOSE-M05-PRODUCT-PROVENANCE`:** V1.1 gives every Product field one actual authority and exact send/narrative rule while excluding Product Code and all factual-field mutation.

## 10. M-06 — Structural and bundle gate

### Old problem

V1.0 named an AST check without enumerating import/module/computed forms, canonical resolution, transitive re-exports, generated resources, stable marker retention, or positive-leak proof.

### Corrected mechanism

V1.1 enumerates ImportDeclaration, export-from, import-equals, ImportType, dynamic import, require/resolve, and resource URL forms; literal/template/concatenation constant folding; fail-closed nonliteral specifiers; TypeScript/tsconfig alias/relative/index/package realpath resolution; transitive re-export graph; protected zones and generated/test isolation; endpoint/network/SDK/literal decisions; and no inline suppression.

A high-entropy server marker and generated Prompt marker are referenced by a test-only Next standalone server fixture. The fixture proves server retention/exact bytes/client absence. A positive public-leak fixture must fail the existing checker and a fresh clean build must pass.

### Verification contract

One fixture per bypass/module/literal form, unresolved/symlink/computed cases, transitive dependency assertions, standalone marker/raw-byte execution, positive leak, and clean real build.

### Schema/ADR impact

None. This is build/test enforcement only.

**Closure assertion `CLOSE-M06-TRANSITIVE-STRUCTURAL-BUNDLE-GATE`:** V1.1 converts the claimed static boundary into a canonical transitive graph and retained-marker bundle proof with fail-closed computed forms.

## 11. L-01 — RFC 8785/JCS

### Old problem

V1.0 called the hash format a canonical JSON subset without fully closing accepted RFC 8785 number/Unicode/order behavior and risked conflating adapter parameter policy with core canonicalization.

### Corrected mechanism

V1.1 accepts the I-JSON-compatible JCS domain, finite IEEE-754 decimals, negative zero -> zero, raw Unicode preservation, UTF-16 key order, deterministic escaping/UTF-8, and explicitly rejects non-finite/invalid/non-plain/cyclic/sparse JS values. Adapter parameter policies may be narrower but return `parameters_invalid`; they do not redefine JCS.

### Verification contract

Embed the published RFC sample/property vectors and complete Appendix B number vectors, Unicode preservation/invalid cases, and JSONB round-trip decimals/negative zero with separate adapter-policy assertions.

### Schema/ADR impact

None. It implements the exact Phase A fingerprint/config-hash requirement.

**Closure assertion `CLOSE-L01-RFC8785-JCS`:** V1.1 fixes the accepted RFC 8785 domain and conformance evidence independently of adapter-specific parameter restrictions.

## 12. Cross-finding consistency

- H-01 application codecs own the strict context/output shapes fixed by H-02/M-05; core stays generic.
- M-03 prepares the exact context/fingerprint used by M-04 reconstruction and Phase A replay.
- M-02 raw Prompt bytes plus M-04 context/config/envelope hashes are the compositional request provenance; no nonexistent request-hash column is assumed.
- M-06 scans the generated Prompt derivative and Synthetic isolation introduced by M-02 and proves the server/client boundary.
- L-01 supplies one canonicalization algorithm for fingerprint, input, config, association, and candidate hashes.
- Every change remains design-only; no `PD-04`–`PD-07` gate is reinstated.

## 13. Remediation acceptance boundary

Author assessment: all nine findings have a specific V1.1 contract and direct verification obligation; no current Schema/ADR/Owner decision is required. This assessment is not approval.

The exact next action is a Fresh Re-review by the original independent reviewer against the new commit, both new document hashes, immutable V1.0 hash, and actual repository. Phase B implementation remains prohibited until that reviewer returns PASS. No Provider/network/credential, Staging/Production, Deploy, formal import, Publish, Index, or Push is authorized by this remediation.
