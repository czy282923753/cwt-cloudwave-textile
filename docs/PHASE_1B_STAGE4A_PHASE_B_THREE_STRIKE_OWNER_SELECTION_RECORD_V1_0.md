# CWT Stage 4A Phase B — Three-Strike Owner Selection Record V1.0

Status: **OWNER SELECTION RECORDED / CORRECTED DESIGN AUTHORSHIP AUTHORIZED / IMPLEMENTATION NOT AUTHORIZED**

Date: 2026-08-10 Asia/Shanghai

## 1. Authoritative Owner instruction

The Project Owner's exact instruction is:

> “批准 M02-D1-INCLUDE；批准 M03-D1-DISCRIMINATED-SEAM。”

This record preserves that instruction without reinterpretation. The two approvals are separate selections and both are required by Corrected Exact Design V1.5.

## 2. M02 selection

Selected option: `M02-D1-INCLUDE`.

Selected closed registry:

- ID: `cwt.phase1b.stage4a.phaseb.m02-grammar-registry.include-deepseek.v2_1`
- version: `2.1.0`
- path: `docs/review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-remediation-v1/M02_GRAMMAR_REGISTRY_INCLUDE_DEEPSEEK_V2_1.json`
- SHA-256: `264ca6358dcec00da5bc17e134c89e52d5321c87683212b8c32ba12756700b66`
- rules: `32` total, comprising `30` common rules and exactly `2` DeepSeek-only rules

The selection accepts direct whole-token `DeepSeek`, the `deepseek-` model-family prefix including `deepseek-v4-flash`, and bounded inserted `Default_Ignorable_Code_Point`, `Mark`, or LF. It intentionally does not make visible Punctuation, Separator, or ordinary White_Space equivalent inside the two DeepSeek literals. Accordingly `deep-seek`, `deep; seek`, `deep seek`, `deep—seek`, and `deep<U+2028>seek` are `allow` unless another independent registered rule matches. TAB, CR, and every scalar in `invalid-control-set-v1` remain `invalid_control` before grammar evaluation.

This is the Owner-selected security/false-positive boundary. It requires no security-exception ADR. The unselected EXCLUDE registry remains immutable decision history and is not a runtime, build, test, compatibility, or fallback authority.

The immutable V1.1 registry still contains pre-selection status metadata (`ownerApproved=false`, `correctedDesign=false`, `implementationAuthorized=false`). It is not edited after selection. This record is the later approval envelope for the exact hash; it does not turn the embedded historical field into a second decision source. Implementation remains unauthorized.

## 3. M03 selection

Selected option: `M03-D1-DISCRIMINATED-SEAM`.

Selected graph/profile:

- ID: `cwt.phase1b.stage4a.phaseb.m03-protected-graph.v2`
- version: `2.0.0`
- path: `docs/review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-v1/M03_CAPABILITY_GRAPH_AND_DATABASE_SEAM_PROFILE_V2_0.json`
- SHA-256: `ce5bdd54c7924e86fcf36e89f10c96a039814366862382c2df81e0a15cf13141`

The sole Phase B outer composition root exhaustively switches on `databaseConnection.kind`. The `pglite` and `postgres` branches each pass the branch-narrowed `.db` directly to the same generic protected factory. The seam permits no cast/assertion, `any`, `unknown` round trip, overload erasure, wrapper, visitor, proxy, second connection/database authority, or generalized bypass. The Production Provider registry remains exactly empty; the Phase D composition and Provider adapter zone remain absent; unsupported or ambiguous acquisition syntax fails closed.

The immutable M03 profile also retains pre-selection status metadata. This record selects its exact ID/version/hash without rewriting it and without granting implementation authority.

## 4. Authority granted and not granted

The Owner instruction authorizes only:

- incorporation of these two exact selected contracts into a standalone corrected Exact Design;
- design-level machine profiles and offline evidence; and
- submission of the exact corrected Design Candidate to Fresh Independent Design Review.

It does not authorize:

- a Phase B implementation attempt or reuse of failed V1/V2/V3 code;
- modification of accepted Design V1.4, ADR-0018, Schema, Migration, package, lockfile, source or test fixtures;
- Provider adapter, API, credential, endpoint, network, spend, Staging or Production work;
- Phase C, D or E;
- merge, Push, Deploy, Publish, Index or formal data import; or
- self-approval or commencement of the independent review by the design author.

## 5. Governance and impact disposition

The selected INCLUDE plus discriminated-seam route creates:

- Schema/Migration impact: **none**;
- ADR impact: **none**; ADR-0018 remains unchanged;
- dependency/package/lock impact: **none**;
- new persistent coordination or Complexity Approval: **none**;
- SEO/URL/Redirect impact: **none**; and
- rollback data reconciliation: **none**.

If implementation later cannot satisfy either selected contract without one of those impacts, work must stop for a new Owner decision. This record does not pre-authorize a workaround.

## 6. Next gate

The only next gate is Fresh Independent Design Review by the original independent Reviewer against the exact Corrected Exact Design V1.5 commit. Implementation remains unauthorized before that review returns PASS and a later gate explicitly opens a new implementation cycle.
