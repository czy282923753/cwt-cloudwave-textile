# CWT Stage 4A Phase B — Design Remediation Record

- Status: **REMEDIATION CANDIDATE V1.1 — NOT SELF-APPROVED / IMPLEMENTATION NOT YET ELIGIBLE**
- Record version: `1.1`
- Corrected design: `PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_EXACT_DESIGN_V1_2.md`
- Remediation start: `3be7cda919cd8d5418d31e81499077cc9d590ac8`
- Prepared: `2026-08-10` (Asia/Shanghai)
- Next gate: another Fresh Re-review by the original independent Phase B Design Reviewer

This record is the audit index for the four blocking Medium findings in the independent V1.1 Fresh Re-review. It is not the design itself and grants no implementation or external-action authority. V1.2 is standalone; an implementer does not merge this record with V1.1.

## 1. Fixed input identity

| Input | Required SHA-256 | Recomputed before remediation |
|---|---|---|
| Fresh Re-review report V1.0 | `856e79f1652806f73a1327551b6ced7bf2b86c846225c409842500f676ca4841` | PASS |
| Fresh Re-review Evidence V1.0 | `678f228d3a06c269c2883860b5bc8e043a77e9d8b53d24bd927f17368bc99903` | PASS |
| Fresh Re-review manifest | `653d72b5132d453780949779294dc67891a43dbc177cef990320a43183edcba7` | PASS |
| failed V1.1 Design | `bc4f8b6ccb35a85ecfcc2cc9385f23ff5b43c9b9e4868f4f3c85de0ed5976f2d` | PASS |
| V1.0 Remediation record | `290d0d2dde42d55af20595c56db71a6c03f0e6ee252037b1634fe3e09e47aea8` | PASS |
| immutable V1.0 Design | `a0dd322de815e4b627b3f20f78454303e262756f2d209699379db5d56a4fa247` | PASS |
| Phase A acceptance record | `b9e00b41ba561fe434fb2f1bdb136c7e43098d2765e4c34e16f267557cefe833` | PASS |

Branch/commit/parent, Entry/Phase A/`0020` ancestry, and frozen tag were exact; the worktree was clean before adding V1.2 and this record.

## 2. Fresh Re-review disposition and remediation boundary

Fresh Re-review returned **FAIL / NOT IMPLEMENTATION ELIGIBLE** with Blocker `0`, High `0`, Medium `4`, Low `0`.

The original findings `H-01`, `H-02`, `M-01`, `M-02`, `M-03`, `M-05`, `M-06`, and `L-01` were independently CLOSED. V1.2 retains their application-neutral core, strict output/framing, complete config observation, Prompt byte authority, normative ordering, Product provenance, transitive static/bundle gate, and RFC 8785/JCS contracts. The remediation is restricted to remaining `M-04` and new `N-M01` through `N-M03`.

No accepted Schema/Migration/ADR/Owner decision is required. The correction adds no column/table/state/queue/cache/Worker/Provider path. It does not reinstate `PD-04` through `PD-07`; they remain non-blocking reference evaluations.

## 3. Four-finding closure matrix

| Finding | V1.2 exact sections | Old defect | Corrected mechanism | Verification contract | Schema/ADR effect |
|---|---|---|---|---|---|
| `M-04` | §8 Draft union/snapshot/column mapping/vectors; §11.2 target fields; §13.2 context split; §18.4 claimed reconstruction; §20.2 | Claimed core expected an unconstrained association/snapshot that accepted columns did not store. | Closed three-kind Draft union; strict identity/version snapshot; seven-column bijection; application-owned row decoder called by generic core; contextual values under input hash. | Three literal JCS/hash round trips plus per-field/null/type/hash/injection tampers; zero call on mismatch. | None; uses existing target columns/hash only. |
| `N-M01` | §8 `ResolvedModelConfigV1`/claimed DTO; §10.4 exact object/vector; §11.2 config/dispatch fields; §18.3–18.4; §20.2 | Config hash omitted `application_class`; pre-dispatch aggregate invented actual Provider. | Exact Phase A 20-key snake-case object; no pre-dispatch actual Provider; pending/claim null; fenced marker sets actual/timestamps/state; claimed requires equality. | Fixed resolver -> pending -> claim -> marker -> claimed hash/state vector plus all field/null Check tampers. | None; matches accepted hash and dispatch Check. |
| `N-M02` | §7 file plan; §8 common scope/interfaces/type tests; §10.2 four repositories; §18.2–18.3; §19.5; §20.1 | Config repository accepted only transaction scope while availability supplied read-only scope. | One read query capability; assignable read-only and transaction subtypes; mutation/locking only on transaction subtype; no casts/parallel DB. | Positive `expectTypeOf`, conditional-key negatives, expected compile-failure fixtures, AST no-cast/no-lock/no-mutation/no-connection assertions. | None; type/composition correction only. |
| `N-M03` | §14.2 mandatory refs; §14.3 A-01–A-10; §14.5 protection; §19.1–19.5; §20.1/20.4; §21 | Valid refs were overclaimed as exact semantic support without a classifier/entailment rule. | Every text has refs; finite membership/allowlist/numeric/deny rules; otherwise unclassified text remains human-review-required; no machine-verification state. | Positive/negative vector for every automatic rule, including irrelevant-but-valid citation that may pass structure but remains unverified and cannot auto-apply/Publish/Index. | None; strengthens frozen Draft/business-truth boundary. |

## 4. M-04 — exact durable Draft association and target snapshot

### Old problem

V1.1's generic `ReadonlyJsonObject` association/snapshot did not specify the current Draft value or the JCS object behind `target_snapshot_hash`. Accepted `0020` stores only target discriminator, three nullable target FKs, locale, expected version, and hash. A Worker could not reconstruct an unstored arbitrary snapshot.

### Actual authority comparison

Phase A §5.1 and actual `src/db/schema/ai.ts` agree:

- `product_draft`: Product FK only, locale `en`, positive localization `editor_document_version`;
- `content_draft`: Content FK only, locale `en`, positive localization version;
- `editorial_revision`: Revision FK only, locale null, positive parsed `draftVersion`;
- exactly one FK and a lowercase SHA-256 target hash.

No arbitrary snapshot JSON column exists or is needed.

### Corrected mechanism

V1.2 defines a strict version-1 discriminated union and a strict snake-case snapshot for each member. The target hash covers exactly association contract version, target kind/ID, locale where applicable, and expected version. Encoding maps bijectively to the seven accepted columns. Claimed decoding receives those physical columns only, reconstructs the same object, JCS-hashes it, and rejects any mismatch before adapter resolution.

Target text/status/source values/task controls are not mislabeled as target hash input. Exact Provider-safe values are frozen in `input_context_json` and protected by `input_hash`; enqueue and Phase E apply retain live authorization/version rechecks.

### Verification and impact

V1.2 supplies exact Product/Content/Revision canonical byte strings and hashes. Tests cover preparation -> pending columns -> claimed decode/re-encode and every discriminator/FK/locale/version/hash/null/type/extra/omitted/injected-snapshot tamper.

**Closure assertion `CLOSE-M04-DURABLE-DRAFT-ASSOCIATION-V12`:** accepted target columns alone bijectively reconstruct the versioned Draft association and exact target hash; no unstored snapshot or new durable field is assumed.

Schema/Migration/ADR/Owner impact: **none**.

## 5. N-M01 — exact config provenance and dispatch semantics

### Old problem

V1.1 called a field list the exact Phase A configuration hash but omitted `application_class`. It also placed mandatory `actualProvider` in the pre-dispatch resolved aggregate, contradicting the accepted null relationship between `actual_provider` and `provider_dispatched_at`.

### Actual authority comparison

Phase A §5.2 defines exactly 20 resolved snapshot keys, including `application_class` and excluding actual Provider. Actual `ai_runs_active_attempt_dispatch_check` requires `(provider_dispatched_at IS NULL) = (actual_provider IS NULL)`. The dispatch marker owns actual Provider and timestamps.

### Corrected mechanism

V1.2 fixes a strict snake-case `ResolvedConfigHashInputV1` exactly matching Phase A. `ResolvedModelConfigV1` carries requested Provider only. Enqueue and pre-dispatch claim keep actual Provider and both dispatch markers null. The separately committed fenced marker sets actual Provider, first/current dispatch timestamps, and state version before any call. Only its returned row can create the claimed projection, where actual must equal requested.

### Verification and impact

One literal JCS object hashes to `4a31457a0458233e62c0de489f95f3e7cd6463c1fe95b3e0c3620452d82845f3` when independently reconstructed at resolution, prepared, pending, and claimed stages. Tests prove both accepted null/non-null Check branches and reject every field/hash/actual/timestamp tamper.

**Closure assertion `CLOSE-NM01-CONFIG-DISPATCH-PROVENANCE-V12`:** one exact Phase A hash survives preparation and persistence unchanged, while actual Provider exists only as committed post-dispatch evidence.

Schema/Migration/ADR/Owner impact: **none**.

## 6. N-M02 — assignable common read scope

### Old problem

V1.1's config port required `TransactionBoundReadScope`, but the normative availability path passed a read-only scope. Literal implementation needed a cast, duplicate port, or undisclosed transaction.

### Actual authority comparison

Current repositories use the environment-selected database and existing generic Drizzle types. Availability needs consistent reads only. Phase C enqueue additionally needs replay, target/config locks, insert, and required Audit inside its one governed transaction.

### Corrected mechanism

V1.2 defines one opaque common scope whose existing Drizzle `select` capability is held under a private symbol. Only an import-restricted internal helper exposes that read capability to current feature/config implementations and test-only target/context fixtures; later Domain adapters require an exact reviewed allowlist addition. `ReadOnlyDraftAvailabilityScope` and `TransactionBoundDraftEnqueueScope` are structural subtypes of `DraftConsistentReadScope`; all four repository ports accept the common type. Availability explicitly uses one read-only repeatable-read transaction; Phase C supplies its governed transaction subtype. Only the latter owns replay, locks, insert, and Audit.

### Verification and impact

Positive type assertions prove both assignments and all four repository calls. Conditional-key and expected-compile-failure fixtures prove read-only/common scopes cannot even select directly, mutate, lock, audit, raw-execute, open a transaction, or manufacture either private brand. AST checks restrict the internal helper imports and reject casts, row locks, mutations, and parallel DB creation inside read callbacks.

**Closure assertion `CLOSE-NM02-ASSIGNABLE-COMMON-READ-SCOPE-V12`:** one disclosed read capability serves availability and enqueue without casts or parallel repositories; transaction-only operations remain unassignable to read-only callers.

Schema/Migration/ADR/Owner impact: **none**.

## 7. N-M03 — structural provenance versus semantic review

### Old problem

V1.1 validated ref syntax/membership but also demanded “exact supporting evidence” for arbitrary English. It supplied neither a deterministic classifier nor an entailment algorithm, so incompatible implementations could each claim conformance.

### Actual authority comparison

The system can mechanically know strict output shape, exact source-ref membership, source/use-case eligibility, literal numeric/unit equality, closed deny patterns, and canonical result mechanics. It cannot know arbitrary English entailment, paraphrase fidelity, nuanced factual correctness, relevance, or quality without a separately reviewed semantic/human process. Frozen authority already assigns final Draft truth to human review and forbids automatic Publish/Index.

### Corrected mechanism

V1.2 removes zero-ref connective classification and requires refs on every text node. A-01–A-10 is the complete automatic policy: schema, refs, source/use-case allowlists, narrow exact technical numeric forms, fail-closed currency/date/percentage/high-risk/action/data rules, candidate mechanics, and mandatory fixed statuses `structural_provenance_checked` plus `human_review_required`. All other text remains semantically unclassified. Refs are provenance pointers only.

### Verification and impact

Every numbered rule has positive/negative vectors. The decisive vector uses semantically unsupported prose with a valid irrelevant ref: it may pass structural checks but must remain human-review-required, cannot be called supported/verified, and cannot auto-apply, Publish, or Index. PD-11/human Draft review owns semantics.

**Closure assertion `CLOSE-NM03-STRUCTURAL-NOT-SEMANTIC-PROOF-V12`:** automatic checks make finite structural/provenance claims only; semantic truth/fidelity remains mandatory human review and never becomes an AI/public authority.

Schema/Migration/ADR/Owner impact: **none**; the no-invented-fact boundary is strengthened.

## 8. Closed-finding non-regression

| Previously closed finding | V1.2 preservation assertion |
|---|---|
| `H-01` | Core stays application-neutral; Draft owns the new association persistence codec; Synthetic remains distinct/test-only and does not use `0020` or `customer_support`. |
| `H-02` | Raw framing, completion gate, four strict outer schemas, six exact Block variants, candidate IDs/locks/canonical conversion remain intact; N-M03 narrows evidence claims only. |
| `M-01` | Complete no-`LIMIT` config aggregate, all state classifications, and no cache remain intact. |
| `M-02` | Prompt manifest/resource/generated-byte/history/bundle authorities and empty Production body remain intact. |
| `M-03` | Section 18 remains the sole normative ordering; scope types now make that ordering assignable. |
| `M-05` | Product authority/provenance matrix, Product Code exclusion, MOQ pairing, and narrative-only fact use remain intact. |
| `M-06` | Transitive AST/module/resource/bundle graph remains intact and gains read-scope/semantic-overclaim fixtures. |
| `L-01` | RFC 8785 domain/vectors remain intact and now directly anchor target/config vectors. |

## 9. Cross-finding consistency and no dual authority

- Target association hash and input hash have non-overlapping meanings; neither replaces live Domain authority.
- Requested Provider/config hash is immutable preparation provenance; actual Provider is dispatch evidence only.
- The common read scope is a capability view over the existing database/transaction, not a repository/cache/state authority.
- Structural provenance status and human semantic review are separate; no AI truth state is added.
- `ai_model_config` remains the new-request configuration authority and `ai_runs` the only durable lifecycle/provenance authority.
- Phase B still adds no enqueue implementation, Worker, queue, history, retry, config mutation, Provider adapter, or network path.

## 10. Review-process exception record

The Fresh Re-review evidence discloses that its temporary worktree initially lacked local dependencies and the reviewer invocation caused pnpm to download package artifacts. That event is preserved as review-history evidence. It changed no Candidate file and is not one of the four design findings. This remediation neither treats it as a Candidate defect nor repeats it: no package is installed/downloaded and no registry/network access is authorized or used.

## 11. Remediation acceptance boundary

Author assessment: all four blocking Medium findings now have one exact authority, implementable signatures/algorithms, fixed vectors, and direct negative contracts. No current Schema/Migration/ADR/Owner decision is required. This is not approval.

Verification must prove:

- only V1.2 and this record are added;
- V1.0/V1.1/V1.0 Remediation and all review/evidence artifacts are byte-identical;
- actual Schema extraction remains `ai_model_config=21/21` and `ai_runs=96/96`;
- each closure assertion appears exactly once;
- Markdown structure/fences/links/whitespace and Git diff checks pass; and
- the final commit is clean and unpushed.

The exact next action is another Fresh Re-review by the original independent Phase B Design Reviewer against the new commit, both new SHA-256 values, immutable prior hashes, and repository baseline. Phase B implementation remains prohibited until that reviewer returns PASS. No Provider/network/credential, Staging/Production, Deploy, formal import, Publish, Index, or Push is authorized by this remediation.
