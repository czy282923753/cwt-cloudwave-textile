# CWT Stage 4A Phase B — Three-Strike Technical Escalation Owner Decision Package V1.1

**Package status: TECH-M01 CORRECTED CANDIDATE / NOT YET RE-REVIEW-PASSED**

**Owner selections recorded here: NONE**

**Implementation authority created here: NONE**

Date: 2026-08-10 Asia/Shanghai

## 1. Gate

This package may be presented for Owner selection only after the original independent Reviewer gives Technical Escalation V1.1 a Fresh Independent Technical Escalation Re-review PASS.

Until that PASS:

- select no option;
- approve no security exception;
- do not start a corrected Design;
- do not start implementation; and
- do not authorize Provider/API/credential/network/spend, Phase C/D/E or external actions.

The complete diagnosis is [Technical Escalation V1.1](PHASE_1B_STAGE4A_PHASE_B_THREE_STRIKE_TECHNICAL_ESCALATION_V1_1.md).

## 2. TECH-M01 correction the Owner must understand

V1.0 applied the full punctuation/whitespace property union to every adjacency of `deepseek` while promising that punctuation/whitespace examples were allowed. V1.1 removes that contradiction through an inline per-rule gap-set AST.

There is one selected registry, not a direct classifier plus shadow table. Each rule carries its exact gap language and counters. The two INCLUDE-only DeepSeek rules accept:

```text
Default_Ignorable_Code_Point | Mark | LF
minus invalid controls
```

They do not accept visible punctuation, Unicode separators or ordinary whitespace as insertion equivalence.

Common non-DeepSeek rules retain:

```text
Default_Ignorable_Code_Point | Mark | White_Space | Separator | Punctuation
minus invalid controls
```

This distinction is normative, machine-readable and executed by the verifier.

## 3. Decision M02-D1

Select exactly one option after independent re-review PASS.

### M02-D1-INCLUDE — technical recommendation

Exact registry:

- ID: `cwt.phase1b.stage4a.phaseb.m02-grammar-registry.include-deepseek.v2_1`
- version: `2.1.0`
- [file](review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-remediation-v1/M02_GRAMMAR_REGISTRY_INCLUDE_DEEPSEEK_V2_1.json)
- SHA-256: `264ca6358dcec00da5bc17e134c89e52d5321c87683212b8c32ba12756700b66`
- rule count: `32`

Guarantees:

- `DeepSeek` -> `provider_override`;
- `deepseek-v4-flash` -> `provider_override`;
- bounded U+200B/U+2060 Default-Ignorable insertion -> `provider_override`;
- bounded U+20DD/U+034F Mark insertion -> `provider_override`;
- bounded LF insertion -> `provider_override`;
- five admitted scalars in one complete gap -> `unsupported_value`;
- total 65 admitted scalars in one complete transition path -> `unsupported_value`; and
- both Section 13.6 and A-07 consume the same compiled registry identity.

Intentional non-equivalences:

- `deep-seek` -> `allow` unless another rule matches;
- `deep; seek` -> `allow` unless another rule matches;
- `deep seek` -> `allow` unless another rule matches;
- `deep—seek` -> `allow` unless another rule matches; and
- `deep<U+2028>seek` -> `allow` unless another rule matches.

Security consequence:

- visible punctuation/whitespace can split the Provider spelling and evade the two DeepSeek-specific literal rules;
- generic protected keys/phrases and invalid-control checks remain independent; and
- every future Provider/model must receive a reviewed inline gap policy before activation.

False-positive consequence:

- ordinary prose is not rejected merely because deleting visible separators would spell `deepseek`;
- Default-Ignorable/Mark/LF insertions that complete the literal remain rejected.

Architecture disposition:

- preserves direct accepted Provider/model coverage;
- no security-exception ADR is recommended;
- corrected Design remains required after Owner selection;
- no Schema/Migration/dependency/package/lock change; and
- this selection would not itself authorize implementation.

### M02-D1-EXCLUDE — not recommended / security exception

Exact registry:

- ID: `cwt.phase1b.stage4a.phaseb.m02-grammar-registry.exclude-deepseek.v2_1`
- version: `2.1.0`
- [file](review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-remediation-v1/M02_GRAMMAR_REGISTRY_EXCLUDE_DEEPSEEK_V2_1.json)
- SHA-256: `1032f188bd5d53875ba87eb830aaf18f858c073ebadb1a3d3d9c6a83336df03b`
- rule count: `30`

Consequences:

- direct and inserted `DeepSeek`, `deepseek-` and `deepseek-v4-flash` are allowed unless another generic rule matches;
- the static Phase B source-literal gate cannot compensate for runtime text;
- generic keys/phrases remain protected; and
- Provider/model omissions become exception-led.

An Owner-approved security-exception ADR is mandatory before corrected Design acceptance. It must record exact runtime scope/risk, affected consumers, future registration policy, compatibility, rollback and reconsideration trigger.

### M02 selection record

| Field | Owner record after re-review PASS |
|---|---|
| Selected option | `M02-D1-INCLUDE` or `M02-D1-EXCLUDE` |
| Registry ID/version/SHA-256 confirmed | pending |
| Visible-separator security tradeoff acknowledged | pending |
| Security-exception ADR | no for INCLUDE / mandatory for EXCLUDE |
| Owner/date/reference | pending |

Zero selections, both selections, altered artifacts or hash mismatch is invalid.

## 4. Decision M03-D1 — unchanged

The independent Fresh Review passed M03. V1.1 changes no M03 byte or conclusion.

Technical recommendation remains `M03-D1-DISCRIMINATED-SEAM`:

- one Phase B outer composition root;
- exact five imports and one trusted DTO;
- one exhaustive `databaseConnection.kind` switch;
- explicit `pglite` and `postgres` branches;
- each narrowed `.db` enters the same generic protected factory;
- one runtime factory call;
- no cast/assertion, `any`, `unknown` round trip, wrapper, visitor or second database authority; and
- Phase D/Provider adapter remains absent.

Exact profile:

- [M03 profile V2.0](review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-v1/M03_CAPABILITY_GRAPH_AND_DATABASE_SEAM_PROFILE_V2_0.json)
- SHA-256: `ce5bdd54c7924e86fcf36e89f10c96a039814366862382c2df81e0a15cf13141`

### M03 selection record

| Field | Owner record after re-review PASS |
|---|---|
| Selected option | `M03-D1-DISCRIMINATED-SEAM` or return for new scoped proposal |
| Profile ID/version/SHA-256 confirmed | pending |
| Implementation authorized | **must remain no at this gate** |
| Owner/date/reference | pending |

## 5. Common non-decisions

Regardless of later choice:

- Owner selection is currently null;
- the fixed restart remains `6bc26cf...`;
- V1/V2/V3 and V1.0 FAIL remain evidence, not implementation bases;
- AI remains Draft-only;
- Production Provider registry remains empty;
- no Provider/API/credential/network/spend is authorized;
- no Schema/Migration/package/lock change is proposed;
- no corrected Design is approved; and
- no implementation cycle is authorized.

## 6. Recommended resolution after re-review PASS

The technical recommendation is:

1. select `M02-D1-INCLUDE`;
2. acknowledge both its stealth-gap protection and visible-separator false-negative boundary;
3. select unchanged `M03-D1-DISCRIMINATED-SEAM`;
4. authorize authorship—not implementation—of a hash-bound corrected Design; and
5. require Fresh Independent Design Review PASS.

This recommendation does not record an Owner decision.

## 7. Next gate

The only current next gate is Fresh Independent Technical Escalation Re-review by the original Reviewer against the exact V1.1 HEAD.
