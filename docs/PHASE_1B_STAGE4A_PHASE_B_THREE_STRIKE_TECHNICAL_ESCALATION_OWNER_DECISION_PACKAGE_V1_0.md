# CWT Stage 4A Phase B — Three-Strike Technical Escalation Owner Decision Package V1.0

**Package status: CANDIDATE / NOT YET REVIEW-PASSED**

**Owner decisions recorded in this file: NONE**

**Implementation authority created by this file: NONE**

Date: 2026-08-10 Asia/Shanghai

## 1. Gate and use

This package translates the technical escalation into two precise Owner decisions. It may be presented for selection only after the original independent Reviewer gives the accompanying escalation package a Fresh Independent Technical Escalation Review PASS.

Until that PASS:

- no box below is selected;
- no security exception is approved;
- no corrected Design is authored as accepted;
- no implementation cycle is authorized; and
- no Provider/API/credential/network/spend, Staging/Production, Deploy, Publish, Index, formal import or Phase C/D/E action is authorized.

The complete diagnosis is [Three-Strike Technical Escalation V1.0](PHASE_1B_STAGE4A_PHASE_B_THREE_STRIKE_TECHNICAL_ESCALATION_V1_0.md). The machine-readable choice record is [M02_DEEPSEEK_OWNER_DECISION_PROFILE_V1_0.json](review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-v1/M02_DEEPSEEK_OWNER_DECISION_PROFILE_V1_0.json), whose `ownerSelection` remains `null`.

## 2. Decision M02-D1 — Provider/model protection language

Select exactly one option after independent escalation-review PASS.

### M02-D1-INCLUDE — technical recommendation

Select the sole grammar registry:

- ID: `cwt.phase1b.stage4a.phaseb.m02-grammar-registry.include-deepseek.v2`
- version: `2.0.0`
- file: [M02_GRAMMAR_REGISTRY_INCLUDE_DEEPSEEK_V2_0.json](review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-v1/M02_GRAMMAR_REGISTRY_INCLUDE_DEEPSEEK_V2_0.json)
- SHA-256: `bcf67715d51a65b1095dd5435894664afce77392ce0a21b817e7e2dc7cb2b982`
- rule count: `31`

Exact security semantics:

- whole-token `DeepSeek` is `provider_override`;
- prefix `deepseek-` is `provider_override`;
- `deepseek-v4-flash` is therefore `provider_override`;
- declared bounded insertion forms are rejected by the same generated authority;
- generic Provider/model keys and override phrases remain protected;
- both Section 13.6 and A-07 must use the identical compiled registry identity; and
- every future approved Provider/model token and family prefix must enter this registry before activation or configuration fails closed.

Exact false-positive boundary:

- `deep-seek`, `deep seeker`, `deepseeking`, `deepseekers` and ordinary separated `deep`/`seek` text are not rejected by the DeepSeek-specific rules;
- other grammar rules may still reject an input independently; and
- classification is detection-only and never changes persisted bytes.

Architecture consequence:

- preserves accepted Design V1.4 Section 13.6/A-07 and ADR-0018;
- requires a corrected Design referencing the registry tuple and common authority profile by exact hash;
- does not require a new security-exception ADR;
- requires no Schema, Migration, URL/SEO, dependency, package or lockfile change; and
- authorizes no implementation by itself.

### M02-D1-EXCLUDE — not recommended / security exception

Select the sole grammar registry:

- ID: `cwt.phase1b.stage4a.phaseb.m02-grammar-registry.exclude-deepseek.v2`
- version: `2.0.0`
- file: [M02_GRAMMAR_REGISTRY_EXCLUDE_DEEPSEEK_V2_0.json](review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-v1/M02_GRAMMAR_REGISTRY_EXCLUDE_DEEPSEEK_V2_0.json)
- SHA-256: `eb9dd033ef49c41e6267d0c1412c558c8c7d3c6620b08d2085670be78ebfad00`
- rule count: `30`

Exact security semantics:

- `DeepSeek`, `deepseek-`, `deepseek-v4-flash` and their insertion forms are allowed unless another generic rule independently matches;
- generic `model_override`-style keys and phrases such as `switch model` remain protected;
- the static Phase B source-literal gate remains active but cannot compensate for runtime context/output text; and
- future Provider/model coverage becomes exception-led and has higher omission/review risk.

Architecture consequence:

- materially narrows the accepted runtime safety envelope in Design V1.4 Section 13.6/A-07 and ADR-0018;
- requires an Owner-approved security-exception ADR before corrected Design acceptance;
- the ADR must state reason, exact accepted risk/scope, affected consumers, future registration policy, compatibility, rollback and reconsideration/expiry trigger;
- does not change Provider-neutral, Draft-only or Phase B no-network boundaries;
- requires no Schema, Migration, URL/SEO, dependency, package or lockfile change; and
- authorizes no implementation by itself.

### M02-D1 selection record

This Candidate intentionally leaves the selection blank:

| Field | Owner record after review PASS |
|---|---|
| Selected option | `M02-D1-INCLUDE` or `M02-D1-EXCLUDE` |
| Exact registry ID/version/SHA-256 confirmed | pending |
| Security-exception ADR required | `no` for INCLUDE / `yes` for EXCLUDE |
| Owner identity and date | pending |
| Approval reference | pending |

Zero selections, both selections, an altered registry, or a hash mismatch is invalid and fails closed.

## 3. Decision M03-D1 — AppDatabase handoff and capability containment

### M03-D1-DISCRIMINATED-SEAM — technical recommendation

Approve the contract in [M03_CAPABILITY_GRAPH_AND_DATABASE_SEAM_PROFILE_V2_0.json](review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-v1/M03_CAPABILITY_GRAPH_AND_DATABASE_SEAM_PROFILE_V2_0.json), SHA-256 `ce5bdd54c7924e86fcf36e89f10c96a039814366862382c2df81e0a15cf13141`.

Exact seam:

- retain `src/db/client.ts#databaseConnection` as the only connection authority;
- create exactly one Phase B outer composition root;
- construct one two-field trusted environment DTO;
- switch exactly once on `databaseConnection.kind`;
- in explicit `pglite` and `postgres` branches, pass that branch-narrowed `.db` directly to the same generic protected factory;
- use one local `never` helper for exhaustiveness;
- keep the discriminator and connection wrapper outside the protected graph; and
- allow exactly one protected factory invocation at runtime even though the source has two mutually exclusive call sites.

Exact type-safety consequence:

- `PgliteAppDatabase | PostgresAppDatabase` is never projected into one generic argument;
- each branch preserves its actual Drizzle query-result HKT;
- a future typed database union member fails compilation until explicitly reviewed;
- untyped discriminator pollution throws;
- no cast, assertion, `any`, `unknown` round trip, wrapper, visitor, overload escape, alternate factory, second connection or second database authority is allowed.

Exact containment consequence:

- one Phase B root, five imports and one DTO;
- complete protected/excluded root classes and edges;
- Phase D composition root and Provider adapter zone remain exactly absent in Phase B;
- unknown imports, syntax, capabilities, roots, symlink/canonical collisions and bundle reachability fail closed;
- future Provider adapter edges are a non-authorizing template only; and
- no Schema, Migration, ADR, dependency, package or lockfile change is required.

### M03-D1-RETURN-FOR-NEW-PROPOSAL — Owner rejection path

If the Owner does not accept the discriminated seam, return M03 for a new scoped architecture proposal. This package does not pre-approve an alternate.

The following requests materially leave this Candidate and require separate analysis before a corrected Design:

- a connection visitor or wrapper;
- changes to the shared `DatabaseConnection` or `AppDatabase` authority;
- a cast/assertion, `any`, `unknown` round trip or generic erasure;
- another connection/database/repository/factory authority;
- an external analysis engine or new dependency;
- a generated Unicode dataset; or
- an early Phase D/Provider/credential/network edge.

If such a request implies Schema/Migration, ADR, dependency or persistent coordination, the applicable approval must precede any implementation authorization.

### M03-D1 selection record

This Candidate intentionally leaves the selection blank:

| Field | Owner record after review PASS |
|---|---|
| Selected option | `M03-D1-DISCRIMINATED-SEAM` or `M03-D1-RETURN-FOR-NEW-PROPOSAL` |
| Exact graph profile ID/version/SHA-256 confirmed | pending |
| Corrected Design authorized for authorship | pending |
| Implementation authorized | **must remain no at this gate** |
| Owner identity and date | pending |
| Approval reference | pending |

## 4. Common contract independent of either selection

These points are not optional:

- accepted Design checkpoint `6bc26cf035608a21a057d6f4e87da8d4f7f23d40` remains the implementation restart lineage;
- frozen baseline/tag remains unchanged;
- failed implementations and diagnostic Candidate remain evidence only;
- one selected M02 registry is the sole grammar authority for direct, insertion-aware and structured recognizers;
- the common Unicode/runtime/domain/limits policy remains [M02_PROTECTED_DATA_AUTHORITY_PROFILE_V2_0.json](review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-v1/M02_PROTECTED_DATA_AUTHORITY_PROFILE_V2_0.json), SHA-256 `eb293c61667831ad4c4a105e98e2603bd53628dbdb88802026926feed5046a33`;
- accepted Design and ADR-0018 remain unmodified in this escalation branch;
- unknown/unsupported syntax and value shapes fail closed;
- AI remains Draft-only, Provider registry remains empty and no Phase B network authority exists;
- no product code or test fixture in this package is an implementation; and
- later implementation must be a new clean cycle, never a patch atop V1/V2/V3.

## 5. Recommended Owner resolution after review PASS

The technical recommendation is:

1. select `M02-D1-INCLUDE`;
2. select `M03-D1-DISCRIMINATED-SEAM`;
3. authorize authorship—not implementation—of a versioned corrected Design bound to the exact selected profiles and hashes; and
4. send that corrected Design to a Fresh Independent Design Review.

This recommendation does not record the Owner's decision.

## 6. Required next gate

The current next action is only Fresh Independent Technical Escalation Review by the original independent Reviewer.

If that review is PASS, the Owner may make M02-D1 and M03-D1 selections. Only after Owner selection may a corrected Design be authored. Only after Fresh Independent Design Review PASS may the Owner separately consider authorizing a new implementation cycle.
