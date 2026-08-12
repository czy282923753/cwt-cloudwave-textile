# CWT Stage 4A Phase C Exact Design V1.2 — M-01 Attempt 2 Verification

Status: **DEVELOPER STATIC/DESIGN VERIFICATION / NOT INDEPENDENT REVIEW / NOT ACCEPTANCE / NOT IMPLEMENTATION EVIDENCE**

- Prepared: `2026-08-12` (`Asia/Shanghai`)
- Corrected Candidate: [`PHASE_1B_STAGE4A_PHASE_C_DURABLE_RUN_WORKER_EXACT_DESIGN_V1_2.md`](../../PHASE_1B_STAGE4A_PHASE_C_DURABLE_RUN_WORKER_EXACT_DESIGN_V1_2.md)
- Developer branch: `codex/phase-1b-stage4a-phase-c-exact-design-v1`
- Exact parent before remediation: `cf44be2bc7f0086a87099492b6a75883b0c44083`
- Accepted base/checkpoint target: `cc5715f4a9eb07293bf932cfbd822bfa6bf14a45`
- Finding authority read from exact V1.1 re-review commit: `1ba56c942a15eb243edabeb393ccec8c8ae40972`
- Attempt disposition: `H-01` was already PASS/CLOSED at design level; this evidence covers `M-01` correction attempt 2

## 1. Starting identity and immutable-history proof

The worktree was read-only verified before mutation:

~~~text
HEAD   cf44be2bc7f0086a87099492b6a75883b0c44083
branch codex/phase-1b-stage4a-phase-c-exact-design-v1
status clean
parent 6cdb0df3e9b0565e5cdfd6cac0ca4a315d0e272b
grandparent cc5715f4a9eb07293bf932cfbd822bfa6bf14a45
accepted checkpoint cc5715f4a9eb07293bf932cfbd822bfa6bf14a45
~~~

Immutable failed-Candidate identities reproduced before mutation:

~~~text
0fd2d6a558fdc6485b79069c4d6a7f57b6e84c9c3c9f64262e6ca3b4898035c1  V1.0 Design
0a7a89678fff532fceeea5024d04aa4d4aa848f39c120362a5e51a774e61b632  V1.0 developer evidence
32323b1e1f3b3fc5df57ac83b2206211894e220efea380b2c0c248962576b9b1  V1.1 Design
21b73ef6316966d363bf4f741e45f57d3db9ca75109fef625f3663d2fdb6a608  V1.1 developer evidence
3a5ad42377740ee9072900b6b050ca4ec61ebba716a2238a41f963a63c6b7d45  immutable V3.1 architecture fixture
~~~

The complete V1.1 Fresh independent re-review and both reviewer evidence files were streamed from exact review commit `1ba56c942a15eb243edabeb393ccec8c8ae40972`. Their SHA-256 identities were:

~~~text
abd097b70a1df95ba811bdfabec13905144469edbe21ddfe88a12051c1353f42  review report
9b7201a69fd8d5d8cf76a3f844f9c56fb9ef5386ee3a83335ab9c2dda6fdd079  independent structural checker
69e6cd0ae64eef56961b8d71154e978c77f164c96af91dc7d9f367bcbae247ea  independent structural output
~~~

No failed Design, developer evidence, reviewer artifact, accepted file, branch/ref or checkpoint was edited, materialized or moved.

## 2. Review-root reproduction

The re-review's literal scan result was reproduced exactly, and its supported semantic defect was independently read in the accepted tree:

~~~text
definition request-side integration_not_ready closures = 5
SyntheticCaseTransactionScope durable request operations = 0
~~~

The accepted definition is the real `createSyntheticDefinitionV1` subject. The accepted scope exposes only `authorizeReserveAndSnapshotCase`. The accepted positive fixture constructs that exact scope. Therefore changing only the existing test cannot prove a durable accepted-definition seam without either an out-of-allowlist edit or a duplicate test authority. No Owner/ADR/Schema/Migration/dependency decision is required to correct that inventory.

## 3. Literal 11-path scan reproduction

The accepted `cc5715...` tree was scanned for `ConstructedClaimedRunV1`, `constructClaimedRunV1`, `ExecuteClaimedTextAttemptCommand`, `AiAttemptResult`, `AiClaimedExecutionService`, `createAiClaimedExecutionServiceV1`, both Phase B availability factories, `durableEnqueueAvailable`, `phase-b-composition` and `graph-faults.v3_1`. The exact sorted result remains:

~~~text
scripts/verify-ai-architecture.ts
src/ai/applications/draft-assistance/composition.ts
src/ai/core/claimed-execution.integration.test.ts
src/ai/core/contracts.ts
src/ai/core/orchestrator.ts
src/ai/internal/claimed-run-authority.ts
src/ai/internal/worker-entry.ts
src/ai/provider-neutral-foundation.integration.test.ts
src/ai/testing/synthetic-application/synthetic-application.test.ts
src/server/ai/phase-b-composition.ts
test-fixtures/ai-architecture/graph-faults.v3_1.json
~~~

V1.2 preserves an exact disposition for all 11 but does not treat this literal set as semantic closure.

## 4. Semantic Synthetic/application/type-fixture scan

### 4.1 Exact Synthetic authority consumers

A scan for the accepted definition/scope/factory symbols and paths returned:

~~~text
src/ai/testing/synthetic-application/definition.ts
src/ai/testing/synthetic-application/read-scopes.ts
src/ai/testing/synthetic-application/synthetic-application.test.ts
test-fixtures/ai-types/read-scope/mode-mismatch.negative.ts
test-fixtures/ai-types/read-scope/positive.ts
~~~

Exact dispositions:

| Path | V1.2 future disposition |
|---|---|
| `definition.ts` | modify in place; retain the one definition and delegate all five request operations to the existing transaction scope |
| `read-scopes.ts` | modify in place; retain the private factory and extend its exact operations surface |
| `synthetic-application.test.ts` | modify in place; exercise the accepted definition under the real scope factory for new-run and replay |
| `positive.ts` | modify in place; construct/access the exact corrected scope |
| `mode-mismatch.negative.ts` | preserve unchanged; exact `TS2345` remains required |

The other Synthetic implementation files `association.ts`, `context.ts` and `output.ts` are explicitly unchanged.

### 4.2 Generic application-contract consumers

A scan for `AiApplicationDefinition`, `ApplicationReadScope`, `RequestInvocationBinder`, `OpaqueRequestContextStageV1`, `createOpaqueRequestInvocation` and `PreparedApplicationInvocationBinding` returned:

~~~text
src/ai/applications/contracts.ts
src/ai/applications/draft-assistance/read-scopes.ts
src/ai/applications/draft-assistance/read-scopes.type.test.ts
src/ai/core/contracts.ts
src/ai/core/orchestrator.ts
src/ai/registry/application-registry.ts
src/ai/registry/production-use-cases.ts
src/ai/testing/synthetic-application/definition.ts
src/ai/testing/synthetic-application/read-scopes.ts
~~~

V1.2 gives each path an exact modify/already-authorized or preserve-unchanged disposition. In particular, application contracts, registry, real Draft production-use-case binder and the Draft scope type test remain unchanged; the opaque request-stage five-operation signature remains one application-neutral authority.

### 4.3 Complete fixture/type-checker disposition

The exact accepted read-scope fixture directory contains five TypeScript sources and five tsconfigs. Only `positive.ts` is mutable. These remain byte-immutable and keep their current checker contract:

~~~text
common-authority.negative.ts                TS2339
execute-authority.negative.ts               TS2339
external-fabrication.negative.ts            TS2741
mode-mismatch.negative.ts                   TS2345
tsconfig.positive.json                      unchanged
tsconfig.common-authority-negative.json     unchanged
tsconfig.execute-authority-negative.json    unchanged
tsconfig.external-fabrication-negative.json unchanged
tsconfig.mode-mismatch-negative.json        unchanged
~~~

The sole checker remains `scripts/verify-ai-architecture.ts` and is already in the V1.1 future allowlist. V1.2 binds the corrected positive compile, unchanged negative outcomes, six named Synthetic semantic mutation probes and the relevant actual-file hashes into the one current V4 proof/manifest authority.

### 4.4 Closed mutation conclusion

The exact additional existing-file mutations needed beyond V1.1 are only:

~~~text
src/ai/testing/synthetic-application/definition.ts
src/ai/testing/synthetic-application/read-scopes.ts
test-fixtures/ai-types/read-scope/positive.ts
~~~

The existing Synthetic test and architecture checker were already mutable and now have exact proof obligations. No additional existing/new Product/runtime/test/script/fixture mutation is needed beyond V1.2 Sections 23.2/23.3. Inline replacement definitions, copied request binders, monkey patches, scope fabrication, duplicate tests/checkers/profiles/roots and compatibility paths are forbidden.

## 5. Exact single-authority replacement verification

Static assertions over V1.2 require all of the following:

- the one `SyntheticCaseOperationsV1` holds authorization plus exact replay/feature/config/confirm/commit methods;
- `SyntheticCaseTransactionScope` owns that interface and the one factory explicitly copies all six methods;
- `SyntheticObservationReadScope` has zero durable methods;
- the one `createSyntheticDefinitionV1` request binder delegates all five opaque operations to `input.scope`, with the exact replay identity/association;
- availability keeps its two fail-closed reads and gains no durable write edge;
- the positive type fixture constructs and structurally requires the corrected exact scope;
- the accepted Synthetic test exercises new-run config/commit and exact-replay short-circuit through the real definition;
- the accepted-Draft atomicity harness remains separate and cannot import or implement the Synthetic definition/scope/binder; and
- V4 owns six named fail-closed mutations and no second semantic checker/profile/proof authority.

Required semantic phrases and path rows are checked mechanically in Section 8.

## 6. H-01 and preserved-boundary non-regression

The exact V1.1 Design text from `## 5. State machine` through immediately before `## 13. Complete field ownership ledger` was compared byte-for-byte with V1.2. The blocks are identical and have the same SHA-256:

~~~text
b4ecf66b5c2bbe012eee313ee608441e00a5b481af9a3286897c7843b23c5420 (V1.1 and V1.2; byte-identical, 28,602 UTF-8 bytes)
~~~

Therefore the one advisory key/domain, advisory-before-row order, five attempts, one-second spacing, database ten-second safety window, no-mutation lock-busy behavior, global concurrency two, both R1/R2/R3 owner orders, Provider dispatch fence, response-loss behavior, cancellation/manual/late/shutdown orders and future EV-01/EV-02 requirements are not redesigned or weakened.

The V1.1 full-review PASS boundaries remain explicit in V1.2: five statuses/retry orthogonality; 21/96 fields and 40/11/18 catalog; PC-M01/02/03/04/06; direct PostgreSQL `ai_runs` Worker; one Phase C composition root; V3.1 immutable/one V4 authority; Draft-only/public/security/privacy/Audit/authorization boundaries; exact-empty Production Provider/Prompt; no queue/Outbox/second history/PGlite/in-memory Production runtime; no Schema/Migration/ADR/dependency; no Phase D–G or external authority; and active C-002/C-003.

## 7. Relational and document structural reproduction

The reviewer structural algorithm was rerun against V1.2 using the pinned installed TypeScript dependency tree. It compares ordered Migration columns, ordered Drizzle physical columns and Design ledger rows, then actual normalized Check expressions, FK definitions and index definitions:

~~~text
ai_model_config fields = 21; ordered SHA-256 = 9a1e4a7cbe0ea8ee6eecad22d233c3865ca60658c07eb790b75747a13559368b
ai_runs fields         = 96; ordered SHA-256 = 413824f30e3c74d7b58070c13231985596436e066e65e8f0d4f434cb821cda64
Checks                  = 40; actual expression equality = true
foreign keys            = 11; actual definition equality = true
indexes                 = 18; actual definition equality = true
literal replacement set = 11; exact equality = true
semantic scan includes definition/scope/test/positive fixture = true
~~~

Before this evidence path existed, the only structural-check failure was its expected missing relative link. The final rerun after file creation must report all links present and is recorded in Section 8.

## 8. Accepted source-clean gates and final docs checks

The required commands are run only with the accepted pinned installed-dependency prerequisite where applicable:

~~~text
CWT_INSTALLED_NODE_MODULES='<absolute current worktree>/node_modules' pnpm check:ai-architecture
pnpm check:ai-prompts
pnpm db:verify:ai-foundation-candidate
git diff --check
developer V1.2 structural/semantic assertion
relative-link resolution
~~~

Final results:

~~~text
check:ai-architecture                    PASS / exit 0 with pinned installed dependency prerequisite
check:ai-prompts                         PASS / exit 0 / Synthetic bundle included / Production bundle still empty
db:verify:ai-foundation-candidate        PASS / exit 0 / approved identity, 40 history artifacts, exact catalog/scope
V1.2 structural relational algorithm     PASS / 21+96 ordered; 40/11/18 actual definitions equal; 11 Design links present
semantic inventory/assertion             PASS / 11 literal + 5 Synthetic-authority + 9 generic-contract paths; 16 required assertions
H-01 core byte comparison                PASS / V1.1 = V1.2 / SHA-256 b4ecf66b5c2bbe012eee313ee608441e00a5b481af9a3286897c7843b23c5420
all V1.2 Design/evidence relative links   PASS / 12 checked / 0 missing
git diff --check                         PASS / no whitespace error
working path inventory                   PASS / exactly the two new versioned docs/evidence paths
~~~

These gates verify the accepted source-clean Phase B boundary was not mutated by this docs-only remediation. They do not claim the future V4 checker/profile, corrected Synthetic executable seam or real PostgreSQL Phase C lifecycle has been implemented.

The V1.2 Design SHA-256 after final editing is:

~~~text
7d623657df83056808d28b8ae0f5b2ef208285ed94e96c4989642c3f5b6ef387
~~~

Changed paths before the one Candidate commit must be exactly:

~~~text
docs/PHASE_1B_STAGE4A_PHASE_C_DURABLE_RUN_WORKER_EXACT_DESIGN_V1_2.md
docs/review-evidence/phase-1b-stage4a-phase-c-exact-design-v1-2/DESIGN_REMEDIATION_VERIFICATION_V1_2.md
~~~

The Candidate commit cannot be embedded without a self-reference. The full commit, exact parent, changed paths and clean state are reported in the terminal Coordinator callback.

## 9. External Validation and result boundary

- `EV-01` remains mandatory future supported PostgreSQL 17/18 multi-connection/lock/query-plan evidence, including the unchanged H-01 R1/R2/R3 barrier. It was not executed or claimed here.
- `EV-02` remains mandatory future fake-adapter two-slot resource/contention/shutdown evidence. It was not executed or claimed here.
- `EV-03` remains separately authorized Phase D/F real Provider/API/network/credential/spend/Staging/deployment evidence. No such access occurred.

This developer evidence addresses M-01 Attempt 2 only. It is not independent review, does not accept V1.2, does not authorize implementation and does not unfreeze Phase C. The next gate is a Fresh independent Phase C V1.2 Exact Design Re-review by a new task.
