# Independent Technical Escalation Remediation Re-review Evidence V1.0

Task: CWT Stage 4A Phase B — Technical Escalation Remediation V1 Fresh Independent Re-review

Date: 2026-08-10 Asia/Shanghai

Conclusion: **PASS**

Findings: Blocker 0 / High 0 / Medium 0 / Low 0 / External Validation 0

## 1. Isolation and exact Candidate

The Candidate was inspected read-only in its supplied worktree and in a fresh detached reviewer worktree.

```text
Candidate worktree  /Users/calvin/.codex/worktrees/263d/CWT（CloudWave Textile）项目
Reviewer worktree   /private/tmp/cwt-technical-escalation-remediation-rereview-v1.dUEhq8
branch/ref          codex/phase-1b-stage4a-phase-b-three-strike-technical-escalation-v1
HEAD/ref            377181cd76e5427f344ff0c259fc9bd32ec7b670
direct parent       6a74823666cebc67912ed90c44381d8399076fc3
remediation parent  87bf5025587b223aef3929172411cfeeb6fb1ca7
accepted restart    6bc26cf035608a21a057d6f4e87da8d4f7f23d40
tag object          1c626f9b788e4c6ed0480a7040aa54ccef3e6c76
tag peel            31c0e405acfdd0d05200d0fb2531e897a541a2c4
```

The Candidate worktree was tracked-clean before and after every verifier/type-probe run. The detached reviewer worktree has no tracked Candidate modification; only this new untracked reviewer package exists.

The exact chain after the remediation parent is linear:

```text
f1af1f8736dfa2d55017444d2dfce75598796779 <- 87bf502...  import immutable independent FAIL
2ee5631699de07127f51d90ceca5aa2e7d59679b <- f1af1f8...  replace TECH-M01 contract
c0752ed80b461ebd60ee9192eada9af6beee7abe <- 2ee5631...  reports and manifest
6a74823666cebc67912ed90c44381d8399076fc3 <- c0752ed...  whitespace-boundary record
377181cd76e5427f344ff0c259fc9bd32ec7b670 <- 6a74823...  final evidence freeze
```

`87bf502...` and `6bc26cf...` are ancestors. Failed implementation refs and the prior diagnostic ref remain evidence-only and are not Candidate ancestors.

## 2. Scope and immutable identity

The remediation-parent-to-HEAD scope is exactly 23 added paths and 10,839 insertions. Every path is under `docs/` or `docs/review-evidence/`. The scope contains:

- byte-identical prior independent FAIL artifacts;
- Technical Escalation and Owner Package V1.1;
- machine-readable M02 registries/profiles/corpus;
- an offline verifier and captures; and
- no Product source, project runtime script, test fixture, Schema, Migration, ADR, package, lockfile, accepted Design or configuration change.

Fixed hashes independently recomputed:

```text
ab561395788756a285e54b91486124e8c2bda830a4c38ae8692a94dcba85b2bf  Technical Escalation V1.1
342e88e61292e2e25fce21ddaf5e769402f5086e8195d02a5fbe8b083f08e7ea  Owner Decision Package V1.1
7613959e9dadded7261f68e9b2dfbc5c51d5969a0435f87a3cb2187c62bb9c34  V1.1 SHA256SUMS.txt
```

The manifest verifies 22/22 entries. V1.0 report/package/manifest and the imported prior independent FAIL report/evidence/manifest match their fixed SHA-256 values byte-for-byte. Accepted Design V1.4, ADR-0018, database/environment types, TypeScript configuration, package and lockfile hashes match the fixed profile.

## 3. Review inputs and authority

The re-review read the applicable authority and decision package completely, including:

- root `AGENTS.md`, `docs/ENGINEERING_GOVERNANCE.md`, `docs/REVIEW_POLICY.md` and ADR-0018;
- accepted Provider-neutral Foundation Design V1.4 and its fixed constraints;
- Technical Escalation V1.1 and Owner Decision Package V1.1;
- prior independent FAIL report, evidence and decisive semantic challenge;
- all V1.1 M02 authority, INCLUDE, EXCLUDE, corpus and decision profiles;
- the complete V1.1 offline verifier and captures;
- unchanged M03 graph profile, type probes, configurations and captures; and
- actual `src/db/types.ts`, `src/db/client.ts`, runtime/package/compiler facts.

Accepted Design/ADR/Owner instructions outrank every failed implementation. No failed implementation mechanism was treated as a compatibility base.

## 4. Author verifier reproduction

Fixed positive runtime:

```text
Node 24.14.0
V8 13.6.233.17-node.41
ICU 78.2
Unicode 17.0
CLDR 48.0
darwin arm64
TypeScript 5.9.3
```

Two fresh runs in the clean Candidate worktree exited 0 and were byte-identical:

```text
fresh output SHA-256  1a281f30425e99b18af46893b161949017dcc6780cb81133e56ff3dc5d44ad78
capture relation       captured file ends with the exact fresh payload after command/exit header
default Node 25.8.1   exit 1 at the runtime-node assertion before profile acceptance
```

The verifier now compiles `gapSetAst` property nodes to ECMAScript Unicode property predicates. It no longer uses the old LF/U+034F/U+200B deletion list as the normal classifier. That three-character predicate exists only as an explicit mutation negative, and fresh non-table witnesses kill it.

## 5. Fresh TECH-M01 semantic challenge

`REVIEWER_TECH_M01_TRANSITION_CHALLENGE_V1_0.mjs` is a dependency-free independent compiler/matcher. It imports neither the author verifier nor project implementation code. It:

1. validates/compiles every INCLUDE and EXCLUDE rule from that rule's grammar AST;
2. independently compiles every inline closed `gapSetAst`, including references and subtraction;
3. uses the same compiled NFA for zero-gap direct, bounded insertion-aware and structured forms;
4. applies each rule's own per-gap and total counters;
5. independently checks INCLUDE/EXCLUDE semantic identity;
6. enumerates the full Unicode scalar space for every declared property under the fixed runtime; and
7. hashes original UTF-8 input before and after classification.

The script ran twice with exit 0 and byte-identical output SHA-256 `45a16622ec33e0602c3b3a08e1eb2e997d93dbf8226ef392be70af82cc8d31fd`.

### 5.1 Registry identity and single authority

```text
INCLUDE rules          32
EXCLUDE rules          30
common semantic rules 30
INCLUDE-only rules      2
structured rules        9 per registry
```

All 30 common rules are deep-equal after deleting only the documented later priority shift. INCLUDE adds exactly:

- `value.provider-selected-model-prefix.v1`; and
- `value.provider-selected-name.lexical.v2_1`.

Those two rules carry byte-identical inline DeepSeek gap AST/counters. Every common value rule carries the common five-property gap AST. Key rules carry the empty gap AST and zero counters. No named policy table supplies membership at runtime; `gapPolicyId` is audit metadata.

### 5.2 Full property execution

The independent full scalar enumeration observed nonzero membership for every declared property:

```text
Default_Ignorable_Code_Point  4174
Mark                          2543
White_Space                     25
Separator                       19
Punctuation                    856
```

Fresh witnesses not used by the former shortcut included U+061C and U+FE00 for Default-Ignorable, U+05B0 for Mark, U+00B7 for Punctuation, U+1680 for Separator and U+0085 for White_Space.

### 5.3 DeepSeek exact outcomes

The complete INCLUDE registry independently produced:

| Input | INCLUDE | EXCLUDE | Ruling |
|---|---|---|---|
| `DeepSeek` | `provider_override` | `allow` | exact direct choice delta |
| `deepseek-v4-flash` | `provider_override` | `allow` | exact prefix choice delta |
| `deep<U+200B>seek` | `provider_override` | `allow` | Default-Ignorable admitted |
| `deep<U+2060>seek` | `provider_override` | `allow` | Default-Ignorable admitted |
| `deep<U+061C>seek` | `provider_override` | `allow` | fresh Default-Ignorable witness |
| `deep<U+20DD>seek` | `provider_override` | `allow` | Mark admitted |
| `deep<U+05B0>seek` | `provider_override` | `allow` | fresh Mark witness |
| `deep<U+034F>seek` | `provider_override` | `allow` | Mark/Default-Ignorable admitted |
| `deep<LF>seek` | `provider_override` | `allow` | exact LF exception |
| `deep-seek` | `allow` | `allow` | visible Punctuation excluded |
| `deep; seek` | `allow` | `allow` | Punctuation/ordinary space excluded |
| `deep seek` | `allow` | `allow` | ordinary White_Space excluded |
| `deep—seek` | `allow` | `allow` | visible Punctuation excluded |
| `deep<U+2028>seek` | `allow` | `allow` | Separator excluded |
| `deep<U+1680>seek` | `allow` | `allow` | fresh Separator witness |
| `deep<U+0085>seek` | `allow` | `allow` | fresh non-C0 White_Space witness |
| `deep<TAB>seek` | `invalid_control` | `invalid_control` | control precedence |
| `deep<CR>seek` | `invalid_control` | `invalid_control` | control precedence |

Four admitted scalars in one gap match; five return `unsupported_value`. A fresh synthetic 18-atom grammar using the exact same DeepSeek transition/counter compiler accepted total 64 inserted scalars and returned `unsupported_value` at 65. No persisted input byte changed.

Common rules retain the broader property language. Fresh forms `g<U+061C>pt-4`, `g<U+05B0>pt-4`, `g<U+00B7>pt-4`, `g<U+1680>pt-4` and `g<U+0085>pt-4` remained `provider_override` under both Owner options.

### 5.4 TECH-M01 disposition

**CLOSED.** The prior contradiction no longer exists. The selected registry is the sole proposed semantic authority; direct, bounded insertion-aware, structured and overflow results derive from the same rule graph. The mandatory corpus and Owner-facing consequences agree with the normative DeepSeek gap language. The old three-character shortcut cannot make the package falsely pass.

The visible-separator tradeoff is explicit rather than hidden: INCLUDE deliberately protects direct and bounded stealth-format variants but allows visible punctuation/separator/ordinary-whitespace splits unless another independent rule matches.

## 6. M03 non-regression

The unchanged M03 profile SHA-256 is `ce5bdd54c7924e86fcf36e89f10c96a039814366862382c2df81e0a15cf13141`.

Independent strict TypeScript 5.9.3 results:

| Probe | Result |
|---|---|
| checked-in discriminated PGlite/Postgres seam | exit 0, no diagnostics |
| unnarrowed `databaseConnection.db` union projection | exit 2, TS2375 |
| PGlite value passed to Postgres-HKT seam | exit 2, TS2375 |
| prior independent Reviewer `DatabaseConnection`-parameter positive | exit 0, no diagnostics |

Actual `AppDatabase<TQueryResult>` and `DatabaseConnection` types remain unchanged. The exact five-edge Phase B outer root, explicit `pglite`/`postgres` branches, one runtime generic factory call, zero wrapper/discriminator crossing, Phase D/adapter absence and exact-empty Production Provider registry remain coherent. V1.1 contains no M03 semantic mutation.

Disposition: **NON-REGRESSION PASS / CLOSED**.

## 7. Whitespace and process boundary

The requested global remediation-parent diff check was not misreported:

```text
git diff --check 87bf502...377181c  exit 2
```

Its only three diagnostics are Markdown two-space hard breaks in the imported, SHA-protected prior independent evidence. Rewriting them would violate byte identity.

The V1.1-owned check is clean:

```text
git diff --check f1af1f8...377181c  exit 0
```

This is a disclosed immutable-history exception, not a V1.1 quality finding.

## 8. Decision/package and governance ruling

- Technical recommendation, Owner selection and implementation authority are separated correctly.
- Owner selection remains null.
- M02-D1-INCLUDE versus M02-D1-EXCLUDE is exact, mutually exclusive and hash-bound.
- INCLUDE's direct/stealth coverage and visible-separator false-negative boundary are accurately disclosed.
- EXCLUDE accurately states loss of direct runtime DeepSeek/model protection and the need for an Owner-approved security-exception ADR.
- M03-D1-DISCRIMINATED-SEAM versus return for a new scoped proposal is clear.
- Clean restart remains `6bc26cf...`; failed implementation refs remain evidence-only.
- No fourth implementation, cherry-pick, compatibility layer, corrected Design, Owner choice or later-phase action exists.

No Schema, Migration, dependency, package/lock or new persistent-coordination Complexity Approval is required by the recommended INCLUDE + discriminated-seam route. INCLUDE requires no new ADR. EXCLUDE requires the stated security-exception ADR. A corrected, hash-bound Design and another independent Design PASS remain mandatory after Owner choice.

## 9. Proportional verification and prohibited actions

This docs/profile/evidence gate used local Git, Node 24.14.0 and installed TypeScript 5.9.3 only. Full application build/tests were not run because no Product source, runtime, package, Schema or Migration changed; the risk-bearing proofs were the Unicode transition compiler and M03 strict type probes.

Install/download/registry/network/Provider/API/credential/spend, database mutation, Staging/Production, Deploy, Publish, Index, formal import, merge, Push and Phase C/D/E actions: **0**.

## 10. Final evidence conclusion

Conclusion: **PASS**.

TECH-M01 is CLOSED. M03 is NON-REGRESSION PASS. The exact package is eligible only for Coordinator presentation of the two exact decisions to the Owner. It is not implementation-eligible and does not authorize corrected Design authorship before Owner selection.
