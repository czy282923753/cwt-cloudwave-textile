# CWT Stage 4A Phase B — Design Remediation V1.3

- Status: **N-M04 SCOPE-CONSTRUCTION REMEDIATION RECORD / CORRECTED DESIGN CANDIDATE V1.4 NOT SELF-APPROVED / IMPLEMENTATION NOT YET ELIGIBLE**
- Prepared: `2026-08-10` (Asia/Shanghai)
- Scope: fourth design remediation, only `N-M04` scope construction
- Corrected standalone design: `docs/PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_EXACT_DESIGN_V1_4.md`
- Next gate: another Fresh independent re-review by the original Phase B Design Reviewer

> This record is an audit index, not implementation, approval, Schema/ADR erratum, or substitute for standalone V1.4. It changes no source, test, package, lockfile, Prompt runtime resource, configuration, Schema, Migration, ADR, Provider, credential, network, environment, deployment, formal data, Publish, or Index state.

## 1. Fixed remediation identity

The remediation began only after this fail-fast gate passed:

| Identity | Required/observed value | Result |
|---|---|---|
| Branch | `codex/phase-1b-stage4a-phase-b-design-v1` | PASS |
| Exact start HEAD | `7fdc92b880fda9dc264db5bc99b37a1fae65ddb4` | PASS |
| Direct parent | `ce1fda20aa061f3f121992602bb81f4ed8465323` | PASS |
| Phase B Entry ancestor | `c6f9714750622d9b977c284b5eeceea93da007a5` | PASS |
| Accepted Phase A ancestor | `717cbac284350ec23f786ee239a354085ee0d827` | PASS |
| Exact accepted `0020` ancestor | `15bc6462d2e314f50ff238af70ad31fc6502c40f` | PASS |
| Frozen baseline | `31c0e405acfdd0d05200d0fb2531e897a541a2c4` | PASS |
| Frozen tag | `phase-1b-stage3-approved-2026-08-09`, annotated object `1c626f9b788e4c6ed0480a7040aa54ccef3e6c76`, peeled to frozen baseline | PASS |
| Pre-edit worktree | clean | PASS |

Fixed inputs were recomputed before editing:

| Input | SHA-256 | Result |
|---|---|---|
| Fresh Re-review report V1.2 | `5e050ba8ca3b3d7e714ad8138c0e7a0a067497f012c8a4bb0654073f3a89a097` | PASS |
| Fresh Re-review evidence V1.2 | `fe93ce2172a19698b886c3480c4899130dd6150d44e897ae43c8296b6ae6f46f` | PASS |
| Fresh Re-review manifest V1.2 | `db02b805f4738c5f19eb4916db007db64842ff4dd667e45526e4152a9c25553b` | PASS |
| `APPLICATION_READ_SCOPE_CORE_PROBE_V1_0.ts` | `704aff804e8610ade36d9171f30ac641d5ca89a002abca87355becd4e4a37751` | PASS |
| `DUAL_BINDER_POSITIVE_PROBE_V1_0.ts` | `94565ac744ac1e9633a826963e79c601f92bdb30639b44249111a4c2df513c54` | PASS |
| `DUAL_BINDER_SCOPE_MISMATCH_NEGATIVE_PROBE_V1_0.ts` | `3cd387270e535449d05062a21e2f67c01e9c6a39545b442b5d6d7383e41e1a66` | PASS |
| `READ_SCOPE_CONSTRUCTION_NEGATIVE_PROBE_V1_0.ts` | `ca20e60614f0efd5053f60d775599e18d1f5224287cc3df061b3fff28870d212` | PASS |
| immutable failed V1.3 | `75b356c796c066e20e66ae069a12096c7771d69480faed5250cf4bf94e54b688` | PASS |
| immutable Remediation V1.2 | `94286ff852d5100cc7ed569a10a56ee29a714c95b5a77b4b3b207753d753d393` | PASS |
| immutable V1.2 | `ab11ebee887acc342da03d83c3c5bb803f34a4633e0b82944de664c44325e621` | PASS |
| immutable Remediation V1.1 | `26f0475ceb2ead89272a9f07fd0aa8eb0b630236cb30ee3013f92707361769ad` | PASS |
| immutable V1.1 | `bc4f8b6ccb35a85ecfcc2cc9385f23ff5b43c9b9e4868f4f3c85de0ed5976f2d` | PASS |
| immutable Remediation V1.0 | `290d0d2dde42d55af20595c56db71a6c03f0e6ee252037b1634fe3e09e47aea8` | PASS |
| immutable V1.0 | `a0dd322de815e4b627b3f20f78454303e262756f2d209699379db5d56a4fa247` | PASS |
| Phase A acceptance | `b9e00b41ba561fe434fb2f1bdb136c7e43098d2765e4c34e16f267557cefe833` | PASS |

The report, evidence, manifest, and four manifest-protected probes were read completely. Manifest verification passed all six entries. No package install/download/registry/network action was used.

## 2. Review disposition accepted as input

Fresh Re-review V1.2 returned **FAIL / NOT IMPLEMENTATION ELIGIBLE** with Blocker `0`, High `0`, Medium `1`, Low `0`.

- V1.3's dual authorization policies/binders, one availability read/zero lock, one request authorize-lock-snapshot/zero unlocked target read, exact object flow, opaque core, §18 order/counts, Synthetic shape, and all 12 older finding closures passed.
- Only open Medium: `N-M04` construction path.
- Exact failure: separate Draft/Synthetic modules could not populate generic `contracts.ts`'s module-private `applicationReadScopeBrand`; strict construction returned `TS2741` and all type escapes were correctly forbidden.
- No Schema, Migration, ADR, or Owner decision is required for the selected narrow correction.
- `PD-04` through `PD-07` remain non-blocking references.

## 3. Root cause and selected simplification

Generic `ApplicationReadScope` attempted nominal branding even though it neither owned nor could own an application database/executor/factory. The actual construction authority already belonged to each application's `read-scopes.ts`. That redundant generic brand made the correct module boundary unimplementable.

V1.4 deletes the generic brand. It does not add a generic base constructor, factory hierarchy, class, exported brand token, cast helper, or Draft/DB dependency in generic contracts. `ApplicationReadScope` becomes only `{ readonly mode: string }`. Draft and Synthetic retain distinct same-module private symbols, nested executor state, direct contextually typed object literals, and callback runners.

## 4. Unique closure assertion

**N-M04 scope construction is closed in V1.4 if and only if all of the following hold together:**

1. generic `ApplicationReadScope` contains exactly `readonly mode: string` and no unique symbol, constructor, class, factory, database/select/lock/transaction member, or construction authority;
2. the protected implementation graph contains zero declaration/reference named `applicationReadScopeBrand`;
3. Draft `read-scopes.ts` alone owns unexported `draftConsistentReadScopeBrand` and `draftReadExecutor`, nested private state, both direct object-literal creators, and both callback runners;
4. the read-only runner constructs exactly once inside one `READ ONLY`/`REPEATABLE READ` callback, while the request runner constructs exactly once from the existing governed transaction's select projection and exact four same-transaction closures without opening another transaction;
5. public scopes expose no raw database/transaction/private symbol, scopes do not escape callbacks, and no cast/assertion/`any`/suppression/typed-to-unknown/`Object.assign`/reflection/post-construction mutation is used;
6. external base+mode fabrication fails `TS2741`, factory-returned scope mismatch fails `TS2345`, and base authority calls fail `TS2339`;
7. Synthetic constructs both scopes through its own private factories without Draft/generic private brand/customer-support/0020/core edit; and
8. V1.3's accepted dual-binder authorization, one target lock/zero unlocked target read, exact association object flow, opaque generic core, replay/config/commit order, and all closed findings remain unchanged.

No subset is sufficient. Exporting the brand, adding a generic factory/base class, or permitting an assertion does not close the finding.

## 5. Section-by-section correction index

| V1.4 section | V1.3 defect/ambiguity | V1.4 correction | Verification |
|---|---|---|---|
| §1/§4 | Dual binders were correct, but construction owner was unstated/unimplementable | Declares removal of redundant generic brand and application-owned construction | decision/root-cause review |
| §6 | Diagram began with already-existing scope values | Adds application-private factory step before both binders; core remains scope-free | dependency graph gate |
| §7 | Generic contracts and read-scope file responsibilities omitted legal construction | Exact mode-only base, Draft/Synthetic private factory ownership, and fixture paths | path/symbol review |
| §8 | Generic private brand was inaccessible; Draft factories had prose only | Exact no-brand base; nested Draft private carrier; real read-only/request creators/runners; callback lifetime and operation closure contract | positive/negative compile + AST |
| §9 | Registry did not say who supplies real concrete scope values | Registry only constrains generics; application runners supply privately branded values; real Synthetic factories included | registry/Synthetic compilation |
| §10.2 | Assignability proof consumed declared scopes but did not prove construction | Actual factory-returned repository/binder positives plus TS2741/TS2345/TS2339 negatives | focused `tsc` probes |
| §18.2/§18.3 | Normative sequences began after an unspecified scope appeared | Adds exact one construction before each bind, no scope escape, unchanged business read/lock counts | sequence/count tables |
| §18.5/§18.6 | Static matrix assumed valid scope values | Adds creator/runner rows, caller types, transaction counts, returned lifetime, next consumers, and no-authority proof | row-by-row static audit |
| §19.5 | Gate banned casts but not inaccessible generic brand or reflective fabrication | Zero generic-brand rule, exact symbol/factory import allowlists, escape/reflection/mutation gates | AST/module fixtures |
| §20 | Positives used already-declared scopes | Adds independently runnable real Draft/Synthetic/factory-binder positives and exact negatives; records local results | local TypeScript 5.9.3 evidence |
| §22/§23 | Implementation order/checklist could reproduce unconstructible base | Makes unbranded base and application factories first-class gates | Fresh reviewer checklist |
| §25 | Complexity proof omitted redundant generic brand | Records deletion, bounded application-local factories, no state/authority/factory hierarchy | complexity review |

## 6. Local construction-probe evidence

Disposable probes were created outside the repository and compiled directly with the installed TypeScript `5.9.3` binary under strict/no-emit/NodeNext settings. Downloads were `0`.

| Probe | Actual result |
|---|---|
| generic base + separate Draft read-only factory | exit `0` |
| current real `AppDatabase`/Drizzle transaction-select projection | exit `0` |
| separate Draft transaction factory with exact four operations | exit `0` |
| separate Synthetic read/request factories | exit `0` |
| dual binders consuming factory-returned values, no `declare const` | exit `0` |
| external read-only/transaction fabrication | exit `2`; two `TS2741` missing-private-brand diagnostics |
| factory-returned scope mismatch | exit `2`; two `TS2345` diagnostics |
| generic base lock/replay/insert | exit `2`; three `TS2339` diagnostics |
| AST/source forbidden-node counts | exit `0`; all named counts `0` |

These are design evidence only. The disposable directory is not a Candidate deliverable and the later implementation must add the exact checked-in fixtures specified by V1.4.

## 7. Authority, Schema, and non-regression impact

| Authority/boundary | Effect |
|---|---|
| Generic application contracts | Lose a redundant inaccessible type brand; gain no factory or runtime authority. |
| Draft/Synthetic construction | Existing intended application ownership becomes implementable through module-private factory state. |
| Product/Content/Revision | Unchanged live authorization/editability/version authority. |
| Target/context/config/Prompt | Exact hashes, vectors, repositories, and authorities unchanged. |
| `ai_runs` / `ai_model_config` | Exact sole durable/config authorities unchanged; mappings remain `96/96` and `21/21`. |
| Request sequence | Still one target authorize-lock-snapshot, one target lock, zero unlocked target reads; replay/config/commit order unchanged. |
| Schema/Migration/ADR/Owner | No field, Check, FK, index, table, Migration, ADR, or Owner decision. |

All closed findings remain preserved: `H-01`, `H-02`, `M-01` through `M-06`, `L-01`, `N-M01`, `N-M02`, and `N-M03`. Exact three target vectors, 20-key config vector, A-01–A-10, Prompt/output/Product/static gates, 21/21 and 96/96 remain. Frozen absence remains: no fallback, RAG/retrieval, vision, `customer_support`, customer/private data, Provider integration/network, Production Prompt prose, Phase C implementation, business integration, Deploy, Publish, Index, or formal import.

## 8. Candidate verification contract

Before commit, the Candidate must prove:

- exact fixed identity/ancestry/tag and every input/probe hash;
- only standalone V1.4 and this Remediation V1.3 are added;
- every older artifact remains byte-identical;
- the exact local construction probe results above;
- existing offline Candidate verifier with downloads `0`;
- exact `21/21` and `96/96` extraction;
- TypeScript contract blocks, Markdown headings/fences/links/whitespace/final LF, and `git diff --check` pass;
- exactly one N-M04 scope-construction closure assertion exists; and
- the final commit is documentation-only, clean, and not pushed.

Full Lint, Build, browser, bundle, and unimplemented Phase B suites are not meaningful for this design-only Candidate. The checked-in implementation fixtures remain future pass criteria after design PASS.

## 9. Finding disposition and next gate

Author disposition: **N-M04 SCOPE-CONSTRUCTION CORRECTION DESIGNED / AWAITING FRESH INDEPENDENT RE-REVIEW.**

Candidate status: **CORRECTED DESIGN CANDIDATE V1.4 / NOT SELF-APPROVED / IMPLEMENTATION NOT YET ELIGIBLE.**

Open architecture/Schema/Owner decision: **none identified for this bounded correction.** The original independent reviewer must perform another Fresh independent review against the exact new commit and both new document hashes. Phase B implementation must not begin unless that review returns PASS. No Push is authorized.
