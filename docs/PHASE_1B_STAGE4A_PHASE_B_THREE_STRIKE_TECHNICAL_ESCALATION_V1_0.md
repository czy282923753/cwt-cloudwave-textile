# CWT Stage 4A Phase B — Three-Strike Technical Escalation V1.0

**Technical-escalation outcome: COMPLETED / OWNER-DECISION-READY CANDIDATE**

**Acceptance status: NOT SELF-APPROVED / REQUIRES FRESH INDEPENDENT TECHNICAL ESCALATION REVIEW**

**Owner selection: NOT YET MADE**

**Implementation status: FROZEN / NOT AUTHORIZED / NO ATTEMPT 4**

Date: 2026-08-10 Asia/Shanghai

## 1. Executive outcome

This package rebuilds the two still-open proof boundaries from the last independently accepted Design checkpoint. It is not a fourth remediation of failed code and retains no compatibility path to the original/V1/V2/V3 implementations.

The two technical recommendations are:

1. **IMP-M02 / DIAG-M01 — select M02-D1-INCLUDE.** Make one closed grammar registry the sole protected-data semantic authority and include both whole-token `DeepSeek` and model-family prefix `deepseek-`. This covers `deepseek-v4-flash` in direct and bounded insertion-aware forms. The mutually exclusive EXCLUDE option is mechanically complete, but it knowingly removes the accepted initial Provider/model literal guarantee and therefore requires an Owner-approved security-exception ADR.
2. **IMP-M03 / DIAG-M02 — select M03-D1-DISCRIMINATED-SEAM.** Keep `src/db/client.ts` as the only connection authority. In the one Phase B outer composition root, exhaustively switch on `databaseConnection.kind`; in each branch pass the now-narrowed `.db` to the same protected generic `AppDatabase<TQueryResult>` factory. The discriminator stays outer-only. No cast, assertion, `any`, `unknown` round trip, wrapper, visitor, alternate factory or second database authority exists.

The package supplies complete machine-readable grammar/policy/decision/corpus profiles, a complete dependency/composition graph profile, strict positive and negative TypeScript probes, an offline verifier and a SHA-256 manifest. It does not modify accepted Design V1.4 or ADR-0018 and does not select either Owner option.

## 2. Fixed authority, identity and isolation

| Item | Exact verified identity |
|---|---|
| Clean restart / accepted Design checkpoint | `6bc26cf035608a21a057d6f4e87da8d4f7f23d40` |
| Accepted Design ref | `codex/phase-1b-stage4a-phase-b-design-v1` |
| Technical-escalation branch | `codex/phase-1b-stage4a-phase-b-three-strike-technical-escalation-v1` |
| Frozen baseline | `31c0e405acfdd0d05200d0fb2531e897a541a2c4` |
| Frozen tag object / peel | `1c626f9b788e4c6ed0480a7040aa54ccef3e6c76` / `31c0e405acfdd0d05200d0fb2531e897a541a2c4` |
| Diagnostic V1.2 Candidate | `f27cadf97a1b3187bdc9655a7411ce7aac1ebc4b`, evidence only and not an ancestor |
| Failed implementation evidence | `755e514...`, `a696325...`, `b1a73bb...`, `d8a24d...`; never cherry-picked or reused |
| Accepted Design V1.4 SHA-256 | `48e6afebfba53f65c03077a1ca27522f0245f17cbd0b3b46ff492929cf1e0c07` |
| ADR-0018 SHA-256 | `c60d71f293da6fe082c94927650e731d26abcdb238ba94863655053e22ab1f2f` |

The paused worktree at `/Users/calvin/.codex/worktrees/e6ca/CWT（CloudWave Textile）项目` was used read-only. Its untracked Fresh Review V1.1 callback identities were recomputed before analysis:

| Artifact | SHA-256 |
|---|---|
| Report | `84760b11d10780483fff185099a25e6874f749af9f126461539c9b48065d8a1f` |
| Evidence | `395e00da31b7201ea5ec3ef8a437ae4bc9288487d9533fbab40059f44aa671a9` |
| Manifest | `0d3148d10c8a706f1f8b314a78642ad75c66904b1d60d0f5dd875b88f2a436a2` |

The complete fixed-input record is [FIXED_INPUTS_V1_0.json](review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-v1/FIXED_INPUTS_V1_0.json).

## 3. Root-cause reconstruction

### 3.1 Shared three-strike cause

Both roots previously claimed closure over an open domain through accumulating handwritten cases:

```text
open semantic or language domain
  -> separately maintained known cases
  -> all authored fixtures pass
  -> claim expands beyond the closed cases
  -> an unseen equivalent form silently passes
```

IMP-M02 had direct key/value rules and a second insertion-shadow table. IMP-M03 attempted increasingly broad JavaScript/TypeScript value-flow modeling. The last counterexamples—DeepSeek omission and an invariant database union—are consequences of those proof-boundary defects, not isolated terms to add.

### 3.2 Corrected responsibility boundaries

- **M02:** one Owner-selected, hash-bound grammar registry owns every rule, category, priority, target domain, direct form, insertion-aware form and structured recognizer. Normalization/control/traversal/resource policy is one linked profile. Context scanning and A-07 consume the same compiled classifier identity.
- **M03:** capability containment proves origins and edges, not arbitrary downstream carrier dataflow. The existing database connection union remains the outer authority. TypeScript control-flow narrowing occurs at exactly one outer composition root; protected code receives only one branch-specific generic database value.

### 3.3 Replace-not-Layer effect

A later authorized implementation must replace together:

- `keyRules`;
- `valueRules`;
- `PROTECTED_AI_SECURITY_SHADOW_POLICY_V1`; and
- `securityShadowRules`.

It must not retain a compatibility classifier. The M03 boundary replaces whole-language carrier accumulation with exact origin/module/composition/bundle containment. It must not add a hidden visitor, wrapper, cast or second connection path.

## 4. IMP-M02 / DIAG-M01 — complete protected-data authority

### 4.1 Normative decision artifacts

- Common Unicode, domain, traversal, limits and compiler profile: [M02_PROTECTED_DATA_AUTHORITY_PROFILE_V2_0.json](review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-v1/M02_PROTECTED_DATA_AUTHORITY_PROFILE_V2_0.json), SHA-256 `eb293c61667831ad4c4a105e98e2603bd53628dbdb88802026926feed5046a33`
- Recommended INCLUDE grammar: [M02_GRAMMAR_REGISTRY_INCLUDE_DEEPSEEK_V2_0.json](review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-v1/M02_GRAMMAR_REGISTRY_INCLUDE_DEEPSEEK_V2_0.json)
- Security-exception EXCLUDE grammar: [M02_GRAMMAR_REGISTRY_EXCLUDE_DEEPSEEK_V2_0.json](review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-v1/M02_GRAMMAR_REGISTRY_EXCLUDE_DEEPSEEK_V2_0.json)
- Exact Owner choice and consequences: [M02_DEEPSEEK_OWNER_DECISION_PROFILE_V1_0.json](review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-v1/M02_DEEPSEEK_OWNER_DECISION_PROFILE_V1_0.json), SHA-256 `348fc43ac71ebec576b1c12c3650b757c48c1fe62359297a98dec4abfaca53c7`
- Mandatory security/false-positive corpus: [M02_FALSE_POSITIVE_AND_SECURITY_CORPUS_V1_0.json](review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-v1/M02_FALSE_POSITIVE_AND_SECURITY_CORPUS_V1_0.json), SHA-256 `0fba5e628a74975faa9f332446a023800b8fb9af3683c6cfa54c7530f7c3a1aa`

The two grammar files are mutually exclusive decision artifacts. They are not parallel runtime authorities. A corrected Design must name exactly one registry ID/version/SHA-256; zero, multiple or mismatched selections fail closed.

### 4.2 Exact input and result domain

The scanner accepts only JSON-like immutable values:

- `null`, boolean, finite ECMAScript number, Unicode-scalar string;
- dense arrays of accepted values; and
- own-enumerable-string-key plain objects with `Object.prototype` or null prototype.

It rejects as `unsupported_value`:

- `undefined`, `bigint`, symbol, function, non-finite number;
- sparse arrays, accessors, symbol or non-enumerable properties;
- class instances, Date/Map/Set/RegExp/typed arrays;
- cycles or repeated object identity;
- lone UTF-16 surrogates or non-fatal UTF-8 replacement; and
- every exact resource-limit breach.

The result is exactly one of:

- `allow`;
- a registered protected match containing category, priority, rule ID, domain and RFC 6901 path;
- `invalid_control`; or
- `unsupported_value`.

The scanner rejects; it never redacts or rewrites input.

### 4.3 Traversal and precedence

The algorithm has two phases:

1. **Structural preflight:** validate the complete domain, scalars, identities and limits without invoking getters; compute raw and NFKC UTF-8 totals. Any failure returns `unsupported_value` and prevents a partial allow.
2. **Classification:** depth-first preorder; arrays use ascending index; objects use `Object.keys` order; classify a key before its value. The first path wins.

Within one string/key:

1. invalid control wins;
2. otherwise the lowest globally unique applicable grammar priority wins;
3. a complete grammar skeleton whose declared gap/state/resource limits overflow is `unsupported_value`; and
4. unrelated nonmatching text is `allow`.

### 4.4 Unicode runtime and byte identity

Property truth is frozen to:

| Component | Exact value |
|---|---|
| Node | `24.14.0` |
| V8 | `13.6.233.17-node.41` |
| ICU | `78.2` |
| Unicode | `17.0` |
| CLDR | `48.0` |
| Platform / architecture | `darwin` / `arm64` |

Any tuple mismatch fails before classifier initialization, verification or build. There is no fallback property table or new Unicode dependency.

Values use detection-only NFKC. Keys use detection-only NFKC followed by ASCII-case-insensitive removal outside `[a-z0-9_]`. Original key/value code points and persisted UTF-8 bytes remain identical.

The invalid-control set is exactly:

- U+0000..U+0009;
- U+000B..U+001F; and
- U+007F.

U+000A LF is the sole admitted C0 exception. U+000D CR is always `invalid_control`, even though Unicode `White_Space` contains it.

The admitted insertion set is the Unicode 17.0 union of:

- `Default_Ignorable_Code_Point`;
- `Mark`;
- `White_Space`;
- `Separator`; and
- `Punctuation`;

minus the invalid-control set. A member of this set is not prohibited by itself.

### 4.5 Closed grammar and compiler boundary

The AST node set is closed:

```text
literal | charClass | unicodeProperty | shorthand
sequence | alternation | group | repeat | reference
wordBoundary | startAnchor | negativeLookbehind | negativeLookahead
```

Unknown/malformed nodes, classes, repetitions, lookarounds, references, fields, flags, domains, categories or priorities fail closed. References must be present, nonrecursive and used. Priorities are the exact contiguous range `1..ruleCount`.

Each selected rule carries:

- regression evidence ID, which is audit evidence and not architecture authority;
- stable rule ID;
- target domain;
- protected category;
- global priority;
- lexical/prefix/structured kind;
- flags and input projection;
- complete AST; and
- exact insertion policy.

The compiler:

1. validates and expands the AST once;
2. lowers it once to canonical transition IR with category/priority/domain;
3. instantiates direct mode with insertion budget zero;
4. instantiates bounded insertion-aware mode from the same transitions;
5. treats `structuredRecognizerId` only as audit metadata on the same AST rule; and
6. derives overflow recognition from the same IR.

There is no direct-regex table, shadow-term table, structured matcher catalog, A-07 local protected-data table or compatibility classifier.

### 4.6 Exact insertion semantics and limits

An eligible gap exists only between consecutive consuming atom transitions on one successful AST path. Literal strings expand to Unicode scalar atoms. Groups are transparent; repetitions produce internal/inter-iteration adjacencies; zero-width assertions, absent optionals and failed alternatives do not manufacture gaps.

No leading/trailing gap or insertion inside a single class/property/shorthand atom exists. Historical key projection is direct and insertion-aware authority for keys; it gains no second gap layer.

Exact limits:

| Limit | Value |
|---|---:|
| Inserted code points per declared gap | `0..4` |
| Inserted code points per matched candidate | `64` |
| Traversal depth | `16` |
| Visited nodes | `4,096` |
| Raw UTF-8 bytes | `131,072` |
| NFKC UTF-8 bytes | `131,072` |
| Scalars per string/key | `65,536` |
| Compiled AST nodes | `8,192` |
| Matcher states per rule/input | `262,144` |
| Registry rules | maximum `64` |

Accepted Design Section 13.6 application limits remain stricter and apply first.

### 4.7 Complete INCLUDE versus EXCLUDE semantics

| Property | M02-D1-INCLUDE — recommended | M02-D1-EXCLUDE — security exception |
|---|---|---|
| Grammar SHA-256 | `bcf67715d51a65b1095dd5435894664afce77392ce0a21b817e7e2dc7cb2b982` | `eb9dd033ef49c41e6267d0c1412c558c8c7d3c6620b08d2085670be78ebfad00` |
| Rule count | `31` | `30` |
| Whole-token `DeepSeek` | `provider_override` | allow unless another generic rule matches |
| Prefix `deepseek-` | `provider_override` | allow unless another generic rule matches |
| `deepseek-v4-flash` | `provider_override` | allow unless another generic rule matches |
| Bounded mark/ignorable/LF insertion | rejected as `provider_override` | not covered by the Provider/model literal grammar |
| Generic `model_override` key / `switch model` phrase | still rejected | still rejected, but does not compensate for a plain literal |
| Section 13.6 / A-07 guarantee | contains the accepted initial family | intentionally incomplete for the accepted initial family |
| Static Phase B source-literal gate | unchanged and separate | unchanged; cannot compensate for runtime text |
| ADR effect | no security-exception ADR | Owner-approved security-exception ADR mandatory |
| Schema/Migration/dependency | none | none |

The EXCLUDE option is not “compatibility.” Failed V3 omission is evidence only. EXCLUDE materially narrows accepted Design V1.4 Sections 13.6/A-07 and ADR-0018's initial Provider/model safety envelope. Its ADR must record reason, precise runtime scope, accepted risk, both consumers, future Provider registration, no change to Provider-neutral/Draft-only/Phase B no-network boundaries, compatibility, rollback and reconsideration trigger.

### 4.8 False-positive boundary and future models

INCLUDE rejects only the whole `deepseek` provider token and `deepseek-` model-family prefix, including their declared bounded insertion forms. The mandatory safe corpus keeps these allowed unless another rule matches:

- `deep-seek`;
- `deep seeker`;
- `deepseeking`;
- `deepseekers`;
- ordinary separated words such as `deep; seek`;
- CJK, accented/decomposed Latin, Persian ZWNJ, Devanagari marks, emoji ZWJ and full-width space.

For every future approved Provider/model, its normalized Provider token and model-family prefix must already be represented as `provider_override` in the one selected grammar. Missing coverage makes configuration/architecture verification fail closed. Runtime dynamic term injection is prohibited.

### 4.9 Consumer agreement and nonclaims

Section 13.6 context scanning and A-07 must expose the same registry ID/version/hash and compiled classifier identity. A-07 may retain only its separately enumerated non-protected-data syntax checks. It may not contain another protected-data rule table.

This contract proves the exact grammar/control result. It does not claim semantic privacy classification, malicious intent detection, factual entailment or protection against arbitrary transformations outside the declared normalization/insertion grammar. A-09 human review remains mandatory.

## 5. IMP-M03 / DIAG-M02 — complete capability/composition graph

### 5.1 Normative profile and probes

- Full graph/type/composition contract: [M03_CAPABILITY_GRAPH_AND_DATABASE_SEAM_PROFILE_V2_0.json](review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-v1/M03_CAPABILITY_GRAPH_AND_DATABASE_SEAM_PROFILE_V2_0.json), SHA-256 `ce5bdd54c7924e86fcf36e89f10c96a039814366862382c2df81e0a15cf13141`
- Strict positive: [M03_DATABASE_DISCRIMINATED_SEAM_POSITIVE_V1_0.ts](review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-v1/M03_DATABASE_DISCRIMINATED_SEAM_POSITIVE_V1_0.ts)
- Invalid union projection: [M03_DATABASE_UNION_PROJECTION_NEGATIVE_V1_0.ts](review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-v1/M03_DATABASE_UNION_PROJECTION_NEGATIVE_V1_0.ts)
- Invalid cross-driver handoff: [M03_DATABASE_DRIVER_SWAP_NEGATIVE_V1_0.ts](review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-v1/M03_DATABASE_DRIVER_SWAP_NEGATIVE_V1_0.ts)

### 5.2 Actual repository type shape

At the accepted checkpoint:

```ts
type AppDatabase<TQueryResult extends PgQueryResultHKT> =
  PgDatabase<TQueryResult, typeof schema>;

type PgliteAppDatabase = PgliteDatabase<typeof schema>;
type PostgresAppDatabase = PostgresJsDatabase<typeof schema>;

type DatabaseConnection =
  | { kind: "pglite"; db: PgliteAppDatabase; close: ... }
  | { kind: "postgres"; db: PostgresAppDatabase; createMigrationClient: ...; close: ... };
```

Before narrowing:

```ts
databaseConnection.db: PgliteAppDatabase | PostgresAppDatabase
```

The Drizzle query-result HKT parameter preserves different session/result types. Under repository TypeScript `5.9.3`, `strict=true` and `exactOptionalPropertyTypes=true`, the invariant union projection cannot infer a single `AppDatabase<TQueryResult>`. The exact direct call fails `TS2375`. This is a genuine type boundary, not a compiler inconvenience to erase.

### 5.3 Recommended literal seam

The corrected Design should require this construction shape in the single outer root:

```ts
function unsupportedDatabaseConnection(connection: never): never {
  throw new Error("Unsupported database connection kind.");
}

export function createPhaseBServerAiAvailabilityV1() {
  const trustedEnvironment = Object.freeze({
    appEnvironment: env.APP_ENV,
    processFeatureAiEnabled: env.FEATURE_AI,
  }) satisfies TrustedPhaseBEnvironmentV1;

  switch (databaseConnection.kind) {
    case "pglite":
      return createPhaseBAvailabilityServiceV1({
        database: databaseConnection.db,
        trustedEnvironment,
      });
    case "postgres":
      return createPhaseBAvailabilityServiceV1({
        database: databaseConnection.db,
        trustedEnvironment,
      });
    default:
      return unsupportedDatabaseConnection(databaseConnection);
  }
}
```

The protected factory remains:

```ts
createPhaseBAvailabilityServiceV1<
  TQueryResult extends PgQueryResultHKT,
>(dependencies: {
  readonly database: AppDatabase<TQueryResult>;
  readonly trustedEnvironment: TrustedPhaseBEnvironmentV1;
}): DraftAssistanceService
```

Each branch preserves the exact HKT and lets generic inference select it. The service return type is independent of `TQueryResult`.

### 5.4 Literal counts and authority consequences

| Property | Exact contract |
|---|---:|
| Phase B outer roots | `1` |
| Exact import edges | `5` |
| Trusted DTO constructions | `1` |
| `databaseConnection.kind` switch reads | `1` |
| Explicit cases | `pglite`, `postgres` |
| `.db` syntactic reads | `2`, mutually exclusive |
| Protected generic factory call sites | `2`, same symbol |
| Runtime factory calls per composition invocation | `1` |
| Local never-helper calls | `1` |
| Connection wrappers/discriminators crossing inward | `0` |
| New connections/factories/repositories/transactions | `0` |
| Cast/assertion/`any`/`unknown` round trips | `0` |

`databaseConnection.kind` is an outer control value, not protected data. It is never passed, returned, stored in the DTO or added to the protected factory. The wrapper remains in the outer root. Both branches read the same singleton connection authority and call the same factory. Therefore two syntactic call sites do not create two runtime/database authorities.

The `never` default provides two fail-closed behaviors:

- a future typed union member fails compilation until a new explicit reviewed branch/profile exists; and
- untyped runtime pollution throws.

### 5.5 Strict type proof

The probes use the actual `src/db/client.ts`, `src/db/types.ts`, Drizzle HKT types and repository compiler settings.

| Probe | Required result |
|---|---|
| Discriminated seam | exit `0` |
| Direct union projection | exit `2`, `TS2375`, names `PgliteAppDatabase | PostgresAppDatabase` |
| PGlite value forced into Postgres HKT | exit `2`, `TS2375` |

The positive source is mechanically checked to contain one switch, two `.db` reads, two same-factory returns and one never-helper call, and to contain no cast/assertion, `any`, `unknown`, suppression, reflection, wrapper or second authority.

### 5.6 Complete root classes

Every tracked or untracked executable/protected-resource node receives exactly one primary root class, one stage status and bundle-zone membership:

| Root class | Phase B treatment |
|---|---|
| `phase-b-outer-composition` | exact required singleton |
| `phase-d-outer-composition-reserved` | exact absent |
| `future-provider-adapter-zone-reserved` | exact absent |
| `synthetic-ai-test-code` | test-only, Production-excluded |
| `protected-ai` | server-only protected graph |
| `business-consumer` | Production; no Phase B incoming edge to composition root |
| `other-production-src` | existing non-AI Production |
| `ai-proof-tooling` | build-only |
| `other-project-tooling` | tooling-only |
| `other-test-fixtures` | test-only |
| `diagnostic-documentation` | evidence-only |
| `root-control-file` | build/dependency authority |

Enumeration includes tracked and untracked nodes, realpath, canonical POSIX path and protected resources. Zero classifications, ambiguous overlaps, undeclared composition roots, symlink escape, case/canonical collision or excluded-root reentry fail closed.

### 5.7 Exact protected and excluded edges

The only protected CWT type edges are:

1. Draft contracts -> `src/auth/permissions.ts#UserRole`;
2. Draft read scopes -> `src/db/types.ts#AppDatabase`; and
3. Draft composition factory -> `src/db/types.ts#AppDatabase`.

Protected AI cannot import or reach:

- `src/db/client.ts` or `DatabaseConnection`;
- `src/config/env.ts` or `AppEnvironment`;
- `src/server/ai/**`;
- `src/integrations/ai/providers/**`;
- driver-specific database/HKT types;
- Provider SDK/network/credential/endpoint authorities; or
- Synthetic/test code.

The Phase B root alone may import `env` and `databaseConnection`, with exact direct member reads. Its exact five imports are:

1. `server-only`;
2. `@/config/env#env`;
3. `@/db/client#databaseConnection`;
4. type-only `TrustedPhaseBEnvironmentV1`; and
5. `createPhaseBAvailabilityServiceV1`.

It does not need an outer `AppDatabase` type import. Removing that unused edge narrows the seam.

### 5.8 Unsupported syntax and capability origins

The exact outer root supports only:

- the five imports;
- direct `Object.freeze` of the two-field DTO;
- direct switch discrimination;
- the two direct branch `.db` reads;
- two same-factory call sites; and
- the exact never-helper.

Destructuring, aliasing, spreading, wrapping, proxying, visitors, conditional/logical/IIFE/Reflect access, computed members, missing exhaustiveness or any extra import/export/member/call fails the architecture gate.

The protected graph fails closed on:

- unresolved/non-foldable imports, re-exports, CommonJS, dynamic imports and resource specifiers;
- unknown external packages;
- network globals/modules;
- `process`/environment acquisition;
- dynamic code;
- Reflect/Proxy or constructor/prototype acquisition;
- repository-escaping symlinks/collisions;
- unclassified nodes;
- database-union erasure; and
- a second composition/connection authority.

This is an exact acquisition/containment claim. It intentionally does not claim sound whole-language taint analysis after prohibited origins have been removed.

### 5.9 Phase D future adapter edge

Phase B requires both of these to be absent:

- `src/server/ai/phase-d-provider-composition.ts`; and
- `src/integrations/ai/providers/`.

The graph records only a non-authorizing future template:

```text
approved adapter
  -> type-only TextAiProviderV1
  -> Provider package/network inside the reviewed adapter zone

sole Phase D outer composition
  -> exact approved adapter value
  -> exact secret/endpoint projection
  -> Provider-neutral registry construction
```

Protected core/business never imports an adapter. Future activation requires a new versioned profile naming adapter path, package/version, license/security/offline/CI decision, secret projection, endpoint policy and rollback. Nothing in this package authorizes that edge.

### 5.10 Build and bundle proofs required later

A future corrected Design/implementation must emit:

1. `AI_PROTECTED_GRAPH_MANIFEST_V2_0.json`;
2. `AI_PHASE_B_COMPOSITION_PROOF_V2_0.json`;
3. `AI_CAPABILITY_ORIGIN_PROOF_V2_0.json`; and
4. `AI_BUNDLE_BOUNDARY_PROOF_V2_0.json`.

The graph profile machine-lists their required node, edge, type, DTO, composition, absence, capability and bundle contents. Public/client closure may not reach AI/server/adapter/server-only. The isolated server proof must retain the Phase B boundary while proving Phase D/adapter/Provider/credential/network absence.

## 6. Technical recommendation, Owner authority and implementation authority

| Item | Technical recommendation | Owner status | Implementation status |
|---|---|---|---|
| M02 Provider/model language | `M02-D1-INCLUDE` | pending | not authorized |
| M02 EXCLUDE exception | do not select | pending; would require security ADR | not authorized |
| M03 database seam | direct outer discriminant switch | pending | not authorized |
| M03 containment mechanism | current TypeScript/module/build facilities | pending | not authorized |
| Corrected Design | required after Owner selection | not authored/approved | not authorized |
| Provider/network/credential | none | not authorized | prohibited |
| Phase C/D/E | none | not authorized | prohibited |

The [Owner Decision Package](PHASE_1B_STAGE4A_PHASE_B_THREE_STRIKE_TECHNICAL_ESCALATION_OWNER_DECISION_PACKAGE_V1_0.md) is intentionally separate from this diagnosis.

## 7. Architecture, Schema, dependency and complexity disposition

For the recommended M02 INCLUDE + M03 discriminated seam:

| Question | Disposition |
|---|---|
| Corrected Design | required |
| New ADR | no; accepted ADR-0018 is preserved |
| Schema/Migration | none |
| URL/SEO/Redirect | none |
| Package/lock/dependency | none |
| Persistent coordination/Complexity Approval | none |
| Provider/API/credential/network/spend | none authorized |
| Runtime/public bundle dependency | none |

If the Owner selects M02 EXCLUDE, a security-exception ADR is mandatory. If the Owner instead requests a database visitor, shared connection-authority change, external analysis engine, generated Unicode dataset or new dependency, this package no longer closes that choice; a new scoped proposal and applicable ADR/dependency/complexity decision must precede Design correction.

## 8. Verification and evidence boundary

Evidence index: [README](review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-v1/README.md)

Offline verifier: [VERIFY_TECHNICAL_ESCALATION_V1_0.mjs](review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-v1/VERIFY_TECHNICAL_ESCALATION_V1_0.mjs)

The verifier checks:

- exact runtime tuple and TypeScript version;
- all fixed refs, tag identities, ancestry isolation and failed-ref objects;
- authority/source/package/lock hashes;
- paused Fresh Review V1.1 hashes read-only;
- all 31/30 closed AST rules, direct compilation, insertion IR and nine structured rules;
- exact INCLUDE/EXCLUDE delta, recommendation and ADR consequences;
- security/false-positive/Unicode/byte-identity corpus plus structural limits;
- complete M03 profile/root/edge/absence contract;
- actual database type shapes and strict positive/negative compilation;
- Markdown links/final LF;
- docs/evidence-only diff scope;
- SHA-256 manifest; and
- final clean worktree.

This proof establishes internal consistency and implementability of the decision contracts. It does not prove a future Product implementation, real Provider behavior, PostgreSQL runtime behavior, Production bundles or external validation.

## 9. Rollback and no-dual-authority report

This package changes documentation/evidence only. Rollback is deletion/reversion of this branch to `6bc26cf...`; accepted `0020` remains unchanged and no data reconciliation exists.

Future implementation rollback must target its independently accepted corrected-Design checkpoint, disable AI, and remove Candidate-only classifier/composition/proof artifacts. It must not restore failed V1/V2/V3 mechanisms.

Complexity is bounded:

- one selected grammar instead of direct/shadow authorities;
- one existing connection authority instead of wrapper/visitor/second connection;
- one outer discriminant instead of type erasure;
- build-only proof artifacts, no runtime coordination; and
- no new state, table, Worker, queue, lease, dependency or external action.

## 10. Completion and next gate

This technical-upgrade package is **Owner-decision-ready as a Candidate, but not accepted**.

The only next gate is:

1. Fresh Independent Technical Escalation Review by the original independent Reviewer;
2. only on PASS, Owner selects exact M02 and M03 options;
3. if M02 EXCLUDE is selected, approve the security-exception ADR;
4. author a versioned corrected Design from the accepted restart;
5. Fresh Independent Design Review PASS; and
6. only then, separately authorize a new implementation cycle.

No self-review, Owner selection, corrected Design, attempt 4, merge, Push, Provider call, credential, network, spend, Staging/Production, Deploy, Publish, Index, formal import or Phase C/D/E action follows automatically.
