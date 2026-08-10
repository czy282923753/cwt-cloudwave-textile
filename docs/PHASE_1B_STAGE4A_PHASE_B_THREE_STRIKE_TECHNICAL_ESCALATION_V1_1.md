# CWT Stage 4A Phase B — Three-Strike Technical Escalation V1.1

**Remediation outcome: COMPLETED / TECH-M01 CORRECTED CANDIDATE**

**Acceptance status: NOT SELF-APPROVED / REQUIRES FRESH INDEPENDENT TECHNICAL ESCALATION RE-REVIEW**

**Owner selections: NONE**

**Implementation status: FROZEN / NOT AUTHORIZED / NO ATTEMPT 4**

Date: 2026-08-10 Asia/Shanghai

## 1. Executive outcome

This V1.1 package is the first docs/profile/evidence remediation of the V1.0 technical escalation. It closes only Fresh Review finding TECH-M01. It does not modify V1.0 history, accepted Design V1.4, ADR-0018, Product code or M03.

The root correction is:

- the selected grammar registry remains the sole classifier authority;
- every rule now carries its complete closed `gapSetAst` and exact counters inline;
- the two DeepSeek-only rules use a narrower, explicit gap language than common value rules;
- direct, bounded insertion-aware, structured and overflow results execute one canonical transition graph; and
- the verifier evaluates the actual Unicode property nodes and kills the former three-character shortcut by mutation.

The technical recommendation remains M02-D1-INCLUDE, but its guarantee is now exact:

- protect direct whole-token `DeepSeek` and the `deepseek-` family prefix;
- protect bounded `Default_Ignorable_Code_Point`, `Mark` and LF insertions;
- deliberately do not treat visible punctuation, Unicode separators or ordinary whitespace as equivalent inside the two DeepSeek literals; and
- therefore allow `deep-seek`, `deep; seek`, `deep seek`, `deep—seek` and `deep<U+2028>seek` unless another independent rule matches.

This reduces false positives in ordinary prose at the disclosed cost that visibly separated Provider text can evade the DeepSeek-specific literal rules. Invalid TAB/CR and other declared controls still fail before grammar evaluation.

M03-D1-DISCRIMINATED-SEAM remains byte-identical and independently PASS. Its graph, type probes and conclusions have not changed.

## 2. Exact lineage and immutable history

| Item | Exact identity |
|---|---|
| Remediation parent / failed Candidate | `87bf5025587b223aef3929172411cfeeb6fb1ca7` |
| Parent's direct parent | `6bf81cbebbe9c17aff668049fbc6f3c43a44bf80` |
| Clean restart checkpoint | `6bc26cf035608a21a057d6f4e87da8d4f7f23d40` |
| Branch | `codex/phase-1b-stage4a-phase-b-three-strike-technical-escalation-v1` |
| Independent FAIL import checkpoint | `f1af1f8736dfa2d55017444d2dfce75598796779`, parent `87bf5025587b223aef3929172411cfeeb6fb1ca7` |
| TECH-M01 root-contract checkpoint | `2ee5631699de07127f51d90ceca5aa2e7d59679b`, parent `f1af1f8736dfa2d55017444d2dfce75598796779` |
| Report/manifest checkpoint | `c0752ed80b461ebd60ee9192eada9af6beee7abe`, parent `2ee5631699de07127f51d90ceca5aa2e7d59679b` |
| Final package HEAD | recorded in the coordinator callback/final handoff after the content-addressed report and manifest commits |

The V1.0 artifacts remain byte-identical:

| Historical artifact | SHA-256 |
|---|---|
| Technical Escalation V1.0 | `417d52671ba1348407c8daf90005c9c8054694d7e5a8da943eb8d26162d55014` |
| Owner Decision Package V1.0 | `e331f16b86c0f35122fbfa550b5af60d063861756f9dcb11a80dd406e534222e` |
| V1.0 21-item manifest | `8eee38478e3d652520fbc1363b66a0edd47d989c25f7e0e1b15fa2c7d9797908` |

The Fresh Independent FAIL authority was imported byte-for-byte at its original repository-relative paths:

| Reviewer artifact | SHA-256 |
|---|---|
| [Independent Review V1.0](PHASE_1B_STAGE4A_PHASE_B_THREE_STRIKE_TECHNICAL_ESCALATION_INDEPENDENT_REVIEW_V1_0.md) | `6d56bb4f3f632e55e3e3668fcfe67901709ad663edf6edd5c5a8074b56c763cf` |
| [Independent evidence](review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-independent-review-v1/INDEPENDENT_TECHNICAL_ESCALATION_REVIEW_EVIDENCE_V1_0.md) | `06bb7ec59a84015e68c925e0921936b2471a42d323bf792b1631b5c87813082f` |
| Reviewer 8-item manifest | `ab2a9a279288174bd34ce98efef4ef8d3ed948ca7a67647a22146da7f4ab32d5` |

The imported evidence contains three Markdown two-space hard breaks authored by the Reviewer. Repository-wide `git diff --check` therefore reports those preserved bytes. V1.1 verification first requires the exact Reviewer hashes/8-item manifest, then applies strict whitespace checking only to the new V1.1 reports and remediation directory. Rewriting the imported evidence to silence that diagnostic would violate the byte-identity requirement.

No failed implementation or diagnostic Candidate is an ancestor. No V1/V2/V3 mechanism was reused.

## 3. TECH-M01 root cause

V1.0 declared one global insertion set:

```text
Default_Ignorable_Code_Point
| Mark
| White_Space
| Separator
| Punctuation
minus invalid controls
```

and applied it between every consecutive consuming atom of the whole-token `deepseek` rule. That normative language necessarily matched `deep-seek` and `deep; seek`.

The V1.0 corpus and Owner package instead promised `allow`. Its verifier hid the contradiction by removing only LF, U+034F and U+200B:

```text
declared property language != executed witness deletion list
```

The defect was therefore a split semantic authority, not two missing fixtures.

## 4. Corrected single-authority model

### 4.1 Normative V1.1 artifacts

- [M02 protected-data authority V2.1](review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-remediation-v1/M02_PROTECTED_DATA_AUTHORITY_PROFILE_V2_1.json), SHA-256 `5435d258f98952440466e352c23e9d041070d4ded7e81cbb55e1265d739af0c2`
- [INCLUDE grammar V2.1](review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-remediation-v1/M02_GRAMMAR_REGISTRY_INCLUDE_DEEPSEEK_V2_1.json), SHA-256 `264ca6358dcec00da5bc17e134c89e52d5321c87683212b8c32ba12756700b66`
- [EXCLUDE grammar V2.1](review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-remediation-v1/M02_GRAMMAR_REGISTRY_EXCLUDE_DEEPSEEK_V2_1.json), SHA-256 `1032f188bd5d53875ba87eb830aaf18f858c073ebadb1a3d3d9c6a83336df03b`
- [Owner decision profile V1.1](review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-remediation-v1/M02_DEEPSEEK_OWNER_DECISION_PROFILE_V1_1.json), SHA-256 `29351a7b3887cae8725598976840e26deedae8e9912a85159a9195faa513d302`
- [Mandatory corpus V1.1](review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-remediation-v1/M02_FALSE_POSITIVE_AND_SECURITY_CORPUS_V1_1.json), SHA-256 `d40912e09360d1537238bdee1425bbee19bbb378bcd6d321de0a8b197decc820`

The INCLUDE and EXCLUDE files are mutually exclusive decision artifacts. They never coexist as runtime authorities.

### 4.2 Closed gap-set AST

Each selected rule's `insertion` object contains:

- `gapPolicyId`, which is audit metadata only;
- the complete inline `gapSetAst`;
- minimum and maximum per-gap counters;
- total inserted-code-point maximum;
- exact adjacency semantics; and
- leading/trailing/atomic forbidden positions.

The closed gap-set node set is:

```text
emptySet | codePoint | codePointRange | unicodeProperty
union | subtract | reference
```

The only permitted Unicode properties are:

```text
Default_Ignorable_Code_Point
Mark
White_Space
Separator
Punctuation
```

Property truth comes only from ECMAScript Unicode property escapes under:

```text
Node 24.14.0
V8 13.6.233.17-node.41
ICU 78.2
Unicode 17.0
CLDR 48.0
darwin arm64
```

Unknown nodes, properties, references, code points, counters or runtime tuples fail closed.

### 4.3 Rule-specific languages

Key rules:

```text
gapSetAst = emptySet
per-gap = 0
total = 0
```

Common value rules:

```text
(
  Default_Ignorable_Code_Point
  | Mark
  | White_Space
  | Separator
  | Punctuation
)
- invalid-control-set-v1

per-gap = 0..4
total = 64
```

The two INCLUDE-only DeepSeek rules:

```text
(
  Default_Ignorable_Code_Point
  | Mark
  | U+000A
)
- invalid-control-set-v1

per-gap = 0..4
total = 64
```

There is no global admitted-set fallback, named gap-policy lookup table, deletion shortcut, second classifier or consumer-local exception.

### 4.4 One transition graph

The compiler validates grammar AST and gap-set AST together, expands literal strings to Unicode scalar transitions and lowers one graph carrying:

- category, priority and target domain;
- consuming atoms and zero-width assertions;
- the rule's inline gap predicate; and
- per-gap/total counters.

The same graph executes:

1. direct mode with inserted-transition budget zero;
2. bounded insertion-aware mode with the rule's counters;
3. all nine structured rules; and
4. relaxed-counter replay only to distinguish a complete skeleton overflow from unrelated text.

Per-gap or total overflow is `unsupported_value`. Unrelated nonmatching text is `allow`.

## 5. Exact INCLUDE/EXCLUDE consequences

INCLUDE contains 32 rules. EXCLUDE contains 30. All 30 common rules—including grammar AST, inline gap AST and counters—are identical, apart from the documented later priority shift. INCLUDE adds only:

1. whole-token `deepseek`; and
2. prefix `deepseek-`.

Both additions carry byte-identical DeepSeek gap policies.

| Input | INCLUDE | EXCLUDE |
|---|---|---|
| `DeepSeek` | `provider_override` | `allow` unless another rule matches |
| `deepseek-v4-flash` | `provider_override` | `allow` unless another rule matches |
| `d<U+200B>eepseek` | `provider_override` | `allow` unless another rule matches |
| `deep<U+2060>seek` | `provider_override` | `allow` unless another rule matches |
| `deep<U+20DD>seek` | `provider_override` | `allow` unless another rule matches |
| `deep<LF>seek` | `provider_override` | `allow` unless another rule matches |
| `deepseek<U+034F>-v4-flash` | `provider_override` | `allow` unless another rule matches |
| five admitted code points in one complete gap | `unsupported_value` | `allow` unless another rule matches |
| `deep-seek` | `allow` | `allow` |
| `deep; seek` | `allow` | `allow` |
| `deep seek` | `allow` | `allow` |
| `deep—seek` | `allow` | `allow` |
| `deep<U+2028>seek` | `allow` | `allow` |
| `deep<TAB>seek` | `invalid_control` | `invalid_control` |
| `deep<CR>seek` | `invalid_control` | `invalid_control` |

The common full-gap language is unchanged under both options. For example, `g;pt-4`, `g pt-4`, `g<U+2028>pt-4`, `gp<U+20DD>t-4` and `g<U+2060>pt-4` remain `provider_override`.

### 5.1 INCLUDE security tradeoff

INCLUDE preserves the accepted direct Provider/model literal boundary and covers bounded stealth-format evasions. It does not equate visible separators with a Provider token.

Security consequence: a visibly split spelling can evade the DeepSeek-specific rules.

False-positive consequence: ordinary prose and hyphenated/separated words are not rejected merely because deleting punctuation or whitespace would spell `deepseek`.

No security-exception ADR is recommended for INCLUDE because the accepted direct family remains protected and V1.0's contradictory all-adjacency extension never received independent PASS.

### 5.2 EXCLUDE security tradeoff

EXCLUDE omits both DeepSeek rules. Direct and inserted DeepSeek/provider-model literals are not guaranteed at runtime.

This materially narrows accepted Design V1.4 Section 13.6/A-07 and ADR-0018. An Owner-approved security-exception ADR remains mandatory before a corrected Design could adopt EXCLUDE.

## 6. Verifier integrity and mutation proof

The [V1.1 verifier](review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-remediation-v1/VERIFY_TECHNICAL_ESCALATION_REMEDIATION_V1_1.mjs) does not remove a selected character list. It:

- validates both closed grammar and gap-set AST schemas;
- compiles direct regular-language witnesses and a generic Thompson-style NFA;
- evaluates each declared Unicode property through the fixed runtime;
- applies the exact inline predicate and counters per rule;
- checks direct-regex/NFA agreement;
- executes both Owner-option registries over all mandatory cases;
- verifies original UTF-8 byte identity;
- checks zero-gap, gap 4/5 and total 64/65 transitions;
- checks exact structural traversal/byte/scalar limits; and
- re-runs M03 type and graph proofs.

Mandatory mutations must all be killed:

1. restore the V1.0 LF/U+034F/U+200B-only shortcut;
2. give DeepSeek the common full property union;
3. remove `Default_Ignorable_Code_Point`;
4. remove `Mark`;
5. remove `Punctuation`; and
6. disable the total inserted-code-point counter.

This proves the verifier is sensitive to the normative property language, rule-specific distinction and resource limits.

## 7. M03 non-regression

The M03 graph/profile SHA-256 remains:

```text
ce5bdd54c7924e86fcf36e89f10c96a039814366862382c2df81e0a15cf13141
```

The verifier rechecks:

- 12 root classes;
- the exact five-edge Phase B root;
- two explicit `pglite`/`postgres` branches;
- one runtime generic factory call;
- zero wrapper/discriminator crossings;
- Phase D composition and Provider adapter absence;
- empty Production Provider registry;
- strict discriminated positive exit 0;
- union projection exit 2 / TS2375;
- cross-driver handoff exit 2 / TS2375; and
- the independent Reviewer's fresh discriminated positive exit 0.

No M03 profile, probe, capture or conclusion changed.

## 8. Scope, authority and rollback

This remediation adds only:

- byte-identical independent FAIL artifacts;
- V1.1 reports;
- V1.1 machine-readable M02 contracts/corpus;
- offline verifier/captures; and
- a V1.1 SHA-256 manifest.

It does not modify:

- V1.0 history;
- accepted Design or ADR;
- `src/`, project `scripts/`, `test-fixtures/`;
- Schema/Migration;
- package/lockfile;
- M03 artifacts; or
- any Provider/API/credential/network/Production authority.

Rollback is deletion/reversion of commits after `87bf502...`. No data reconciliation exists.

## 9. Status and next gate

TECH-M01 is **corrected as a Candidate, not accepted**.

Technical recommendation:

- M02-D1-INCLUDE with the exact V2.1 rule-specific gap contract; and
- unchanged M03-D1-DISCRIMINATED-SEAM.

Owner approval: pending.

Corrected Design: not authorized.

Implementation: not authorized.

The only next gate is a Fresh Independent Technical Escalation Re-review by the original Reviewer against the exact new HEAD. Only on PASS may the Owner make the two exact selections. Owner selection must then be followed by corrected Design plus Fresh Independent Design Review PASS before any new implementation cycle.
