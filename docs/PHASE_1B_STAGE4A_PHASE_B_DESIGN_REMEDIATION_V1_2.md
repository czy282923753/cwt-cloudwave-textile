# CWT Stage 4A Phase B — Design Remediation V1.2

- Status: **N-M04 REMEDIATION RECORD / CORRECTED DESIGN CANDIDATE V1.3 NOT SELF-APPROVED / IMPLEMENTATION NOT YET ELIGIBLE**
- Prepared: `2026-08-10` (Asia/Shanghai)
- Scope: third design remediation, only `N-M04`
- Corrected standalone design: `docs/PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_EXACT_DESIGN_V1_3.md`
- Next gate: another Fresh independent re-review by the original Phase B Design Reviewer

> This record is an audit index, not an implementation, approval, erratum to an accepted Schema, or substitute for the standalone V1.3 design. It changes no source, test, package, Prompt runtime resource, configuration, Schema, Migration, ADR, Provider, credential, network, environment, deployment, formal data, Publish, or Index state.

## 1. Fixed remediation identity

The remediation began only after this fail-fast gate passed:

| Identity | Required/observed value | Result |
|---|---|---|
| Branch | `codex/phase-1b-stage4a-phase-b-design-v1` | PASS |
| Exact start HEAD | `ce1fda20aa061f3f121992602bb81f4ed8465323` | PASS |
| Direct parent | `3be7cda919cd8d5418d31e81499077cc9d590ac8` | PASS |
| Phase B Entry ancestor | `c6f9714750622d9b977c284b5eeceea93da007a5` | PASS |
| Accepted Phase A ancestor | `717cbac284350ec23f786ee239a354085ee0d827` | PASS |
| Exact accepted `0020` ancestor | `15bc6462d2e314f50ff238af70ad31fc6502c40f` | PASS |
| Frozen baseline | `31c0e405acfdd0d05200d0fb2531e897a541a2c4` | PASS |
| Frozen tag | `phase-1b-stage3-approved-2026-08-09`, annotated object `1c626f9b788e4c6ed0480a7040aa54ccef3e6c76`, peeled to the frozen baseline | PASS |
| Pre-edit worktree | clean | PASS |

Fixed inputs were recomputed before editing:

| Input | SHA-256 | Result |
|---|---|---|
| Fresh Re-review report V1.1 | `7f935dadea4c26892a89508f7cb6597e313611a5153e394f53b0c37bcadf0c55` | PASS |
| Fresh Re-review evidence V1.1 | `e1358f67471c93b3e9804c307a510b4153026c34414fcd987485cdbb9eee3d9a` | PASS |
| Fresh Re-review manifest V1.1 | `d5e23c31635df8358fb3bbc4149426f23283e363927c6f965529a0fc3e715630` | PASS |
| `READ_SCOPE_POSITIVE_PROBE_V1_0.ts` | `343c81a55c0ad9826fd290fe441d35f1e63772151425c3a59d24185829b7015b` | PASS |
| `READ_SCOPE_NEGATIVE_PROBE_V1_0.ts` | `cfa90ae8526f4ab74673ffeef5d33fb5c6251f8084eedcc226f06d42b1a0540d` | PASS |
| immutable V1.2 | `ab11ebee887acc342da03d83c3c5bb803f34a4633e0b82944de664c44325e621` | PASS |
| immutable Remediation V1.1 | `26f0475ceb2ead89272a9f07fd0aa8eb0b630236cb30ee3013f92707361769ad` | PASS |
| immutable V1.1 | `bc4f8b6ccb35a85ecfcc2cc9385f23ff5b43c9b9e4868f4f3c85de0ed5976f2d` | PASS |
| immutable Remediation V1.0 | `290d0d2dde42d55af20595c56db71a6c03f0e6ee252037b1634fe3e09e47aea8` | PASS |
| immutable V1.0 | `a0dd322de815e4b627b3f20f78454303e262756f2d209699379db5d56a4fa247` | PASS |
| Phase A acceptance | `b9e00b41ba561fe434fb2f1bdb136c7e43098d2765e4c34e16f267557cefe833` | PASS |

The manifest-protected report, evidence, positive probe, and negative probe were read completely. The manifest verified all four files. No package install/download/registry/network action was used.

## 2. Review disposition accepted as remediation input

Fresh Re-review V1.1 returned **FAIL / NOT IMPLEMENTATION ELIGIBLE** with Blocker `0`, High `0`, Medium `1`, Low `0`.

- Closed and preserved: `M-04`, `N-M01`, `N-M02`, `N-M03`, `H-01`, `H-02`, `M-01`, `M-02`, `M-03`, `M-05`, `M-06`, `L-01`.
- Only open blocking finding: `N-M04`.
- The reviewer determined that the bounded correction requires no Schema, Migration, ADR, or Owner decision.
- `PD-04` through `PD-07` remain non-blocking references.

## 3. N-M04 root cause

V1.2 bound each Draft definition's sole live association policy to `DraftConsistentReadScope`. That common type intentionally contains no target-lock member. The normative request sequence nevertheless required the same policy call to invoke `lockTargetForNewRequest`, which exists only on `TransactionBoundDraftEnqueueScope`.

A literal implementation therefore had only invalid choices: cast/narrow the common scope, make generic core Draft-aware, call an unlocked target read then a second lock/snapshot operation, bypass the registered policy, or duplicate authorization. The causal defect was one interface representing two different authorities—not a missing database field.

## 4. Unique closure assertion

**N-M04 is closed in V1.3 if and only if all of the following hold together:**

1. application definitions contain statically separate availability and request authorization policies/binders;
2. availability binds only `ReadOnlyDraftAvailabilityScope`, performs one authorized target read/snapshot, and performs no target lock;
3. request binds only `TransactionBoundDraftEnqueueScope`, performs one `authorizeLockAndSnapshotTargetForNewRequest` operation, one target-lock statement, and zero unlocked target reads;
4. that operation combines record-scope authorization, sole row lock, editability/channel/version recheck, and canonical snapshot creation and returns the exact `AuthorizedDraftAssociationV1` captured through context, fingerprint, preparation, and pending projection;
5. the only shared target helper is pure canonical validation/snapshot construction and performs no read, lock, or second live snapshot;
6. typed registry preparation parses once; erasure occurs after the appropriate scope has been bound and uses branded opaque staged closures without `as`, type assertion, `any`, suppression, heterogeneous `unknown`, or a typed-value `unknown` round trip;
7. generic core accepts only opaque availability/request invocations, calls their stages in the normative order, and imports/names no Draft scope, target repository, transaction method, or lock;
8. a structurally different Synthetic application supplies its own two scopes/binders and composes against unchanged core without Draft, `customer_support`, or `0020`; and
9. the positive/negative compile, AST, call-count, ownership, and full Section 18 cross-contract proofs all pass.

No subset of these statements is sufficient. In particular, adding a cast or making the common scope lock-capable does not close the finding.

## 5. Section-by-section correction index

| V1.3 section | V1.2 defect/ambiguity | V1.3 correction | Verification contract |
|---|---|---|---|
| §1 | Summary said application policy owned authorization but did not distinguish availability/read from request/lock | Declares two typed binders and opaque post-binding core entry | conclusion/status plus architecture tests |
| §4.1/§4.3 | Root cause described common assignability but not impossible request composition | Names single-policy/two-authority defect and deletes rather than layers the V1.2 path | absence scan for old contract; complexity proof |
| §6 | Diagram showed core receiving Draft common/transaction scopes | Draft composition now binds scopes; core receives only opaque staged invocations | dependency graph and core symbol gate |
| §7 | File plan lacked an exact dual-authorization composition owner | Adds `authorization.ts`, `composition.ts`, dual Synthetic composition, typed registry/opaque claimed runtime ownership | path/symbol plan review |
| §8 | One `ApplicationAssociationPolicy<TReadScope>` could not lock; erasure was prose-only | Exact availability/request authorization interfaces, binders, prepared binding, typed registry, branded opaque stages, claimed runtime, two Draft factories, and exact transaction method | positive/negative TypeScript fixtures; no-cast AST gate |
| §9 | Registry did not state how typed scope binding and erasure occur | Application-owned registry prepares once, then mode-specific binder erases; four Production entries bind the same exact seven generics | registry set/type tests |
| §10.2 | Target repository was incorrectly described as accepting both common subtypes | Context/feature/config remain common; availability target accepts read-only only; request has no target read repository call | assignability and expected compile failures |
| §18.1 | Shared sequence contained one live application-policy call | Shared prelude ends before live authorization; no shared target read | read-count/precedence tests |
| §18.2 | Availability had no exact binder ownership | Read-only binder, one target read, zero lock, staged readiness closures, exact early-failure counts | availability call-count table |
| §18.3 | Request required a lock absent from policy's static type | Transaction binder calls sole authorize-lock-snapshot operation; same object flows to context/fingerprint/commit; replay-first remains after those steps | new/replay/conflict/unique-loser/denial/version/context counts |
| §18.5 | No exhaustive static-type audit existed | Maps every numbered §18 call to signature, owner, scope, count, return authority, and consumer | reviewer can check every row against §8/§10 |
| §18.6 | No-dual-authority proof did not address duplicate target snapshots | Prohibits shared live target policy, duplicate read/lock/snapshot, and unbound erasure | architecture/call-graph assertions |
| §19.5 | Gate allowed common target read wording and did not ban binder bypass | Exact import/symbol/constructor/cast/duplicate-read/second-lock/parallel-transaction rules | direct, alias, re-export, dynamic, computed fixtures |
| §20 | Tests proved common-scope assignability but reproduced the missing-lock failure | Adds five positive compile fixtures, nine negative compile/AST fixtures, and exact ownership/call-count integration cases | declared compile diagnostics and AST rules |
| §22 | Implementation order could implement common scope before composition | Dual binder/opaque core boundary is established with registry contracts first | atomic commit order |
| §23 | Checklist lacked N-M04 conditions | Adds binding, lock/read count, object identity, core absence, Synthetic, and cross-contract assertions | all checklist items required |
| §25 | Complexity report did not state replacement of invalid path | Records zero persistent state, bounded compile-time interfaces, deleted V1.2 path, and no dual authority | complexity/non-layer review |

## 6. Authority and Schema impact

| Authority | Effect of correction |
|---|---|
| Product/Content/Revision | Remains live actor-scope, Draft/editability, and concurrency authority. Availability performs a consistent read; request performs its one locked authorization operation. |
| `target_snapshot_hash` | Unchanged exact three-kind identity/version JCS/SHA contract and literal vectors. The same pure builder is used after either authoritative operation. |
| `input_context_json` / `input_hash` | Unchanged owner of sanitized mutable/contextual Provider input. |
| request fingerprint/idempotency | Unchanged replay-first semantics after current authorization/context/fingerprint. |
| `ai_model_config` | Unchanged sole new-request configuration authority and exact N-M01 hash/dispatch vector. |
| `ai_runs` | Unchanged sole durable work/lifecycle/provenance/queue/history authority. Request binders add no storage. |
| Prompt Registry | Unchanged manifest/raw-byte authority and empty Phase B Production body. |
| Audit | New-run insert and required Audit remain one Phase C transaction; exact replay writes neither. |
| Schema/Migration | No field, Check, FK, index, table, Migration, or generated artifact change. Exact `21/21` and `96/96` mappings remain. |
| ADR/Owner | No change and no new decision required for this bounded correction. |

The correction needs no value absent from accepted `0020`. The request target operation returns the existing closed `AuthorizedDraftAssociationV1`; persistence still maps it bijectively to `target_type`, exactly one target FK, `target_locale`, `expected_target_version`, and `target_snapshot_hash`.

## 7. Closed-finding non-regression

| Closed finding | V1.3 preservation assertion |
|---|---|
| `H-01` | Core sees only application-neutral opaque invocations/claimed runtime. Draft association/result/disposition/scope/lock remain application-owned; Synthetic is structurally different. |
| `H-02` | Completion gate, raw parser, strict six Block alternatives, four outer schemas, candidate ref/lock/Phase E conversion remain byte-for-design equivalent. |
| `M-01` | One complete no-`LIMIT`, no-cache config resolution observation and full failure matrix remain. |
| `M-02` | Prompt manifest/raw resource/generated bundle/history/static loading/Synthetic isolation remain. |
| `M-03` | Authorization anti-leak, availability/request sequences, error precedence, replay-first and read counts remain; N-M04 makes their callability exact. |
| `M-04` | Exact closed three-kind durable association, seven accepted columns, three literal vectors, and target/input hash boundary remain. |
| `M-05` | Product provenance matrix, Product Code exclusion, MOQ pair, evidence status, and narrative-only boundary remain. |
| `M-06` | AST/module/resource/transitive graph, computed fail-closed, server marker and public-bundle fixtures remain, with tighter binder gates. |
| `L-01` | RFC 8785/JCS accepted domain/vectors/JSONB round trip remain. |
| `N-M01` | Exact 20-key Phase A config hash including `application_class`, requested-only preparation, null pending/claim, and atomic actual-provider dispatch marker remain. |
| `N-M02` | Common select capability and assignable read-only/transaction subtypes remain; only target authorization is deliberately specialized by API mode. |
| `N-M03` | Mandatory refs, finite A-01–A-10, structural-only status, semantic human review, and no machine-entailment claim remain. |

Frozen absence also remains: no fallback, RAG/retrieval, vision/media generation, `customer_support`, customer/private data, Provider integration/network, Production Prompt prose, Publish, Index, route/public authority, or second run/config/Prompt authority.

## 8. Verification contract for this design Candidate

Before commit, the Candidate must prove:

- exact fixed identity/ancestry/tag and every input hash above;
- the manifest-protected positive/negative probes remain exact;
- only V1.3 and this Remediation V1.2 are added from start HEAD;
- every older artifact remains byte-identical;
- V1.3 is standalone and contains the full `21/21` and `96/96` field mapping;
- every §18 numbered call has one matching §8/§10 interface and no static-type gap;
- exactly one N-M04 closure assertion exists and all correction-index rows point to the standalone design;
- all 12 closed findings and frozen prohibitions remain present;
- Markdown headings/fences/links/whitespace/final LF and `git diff --check` pass;
- any accepted repository verifier is run only with local installed dependencies and downloads `0`, or proportionally skipped and disclosed if unavailable; and
- the final Git commit is documentation-only and clean, with no Push.

Full Lint, Build, browser, bundle, and not-yet-implemented Phase B tests are not meaningful for this design-only Candidate. The V1.3 test contracts are specifications for the later implementation Candidate after independent design PASS.

## 9. Finding disposition and next gate

Author disposition: **N-M04 CORRECTION DESIGNED / AWAITING FRESH INDEPENDENT RE-REVIEW.**

Candidate status remains: **CORRECTED DESIGN CANDIDATE V1.3 / NOT SELF-APPROVED / IMPLEMENTATION NOT YET ELIGIBLE.**

Open architecture/Schema/Owner decision: **none identified for the bounded correction.** The original independent reviewer must now perform another Fresh re-review against the exact new commit and both new document hashes. Phase B implementation must not begin unless that review returns PASS. No Push is authorized.
