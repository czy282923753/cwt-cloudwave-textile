# Independent Technical Escalation Review Evidence V1.0

Task: CWT Stage 4A Phase B — Three-Strike Technical Escalation Fresh Independent Review V1  
Date: 2026-08-10 Asia/Shanghai  
Conclusion: **FAIL**  
Findings: Blocker 0 / High 0 / Medium 1 / Low 0 / External Validation 0

## 1. Candidate identity and clean restart

```text
branch/ref  codex/phase-1b-stage4a-phase-b-three-strike-technical-escalation-v1
HEAD        87bf5025587b223aef3929172411cfeeb6fb1ca7
parent      6bf81cbebbe9c17aff668049fbc6f3c43a44bf80
restart     6bc26cf035608a21a057d6f4e87da8d4f7f23d40
tag object  1c626f9b788e4c6ed0480a7040aa54ccef3e6c76
tag peel    31c0e405acfdd0d05200d0fb2531e897a541a2c4
```

Escalation chain from the accepted checkpoint:

```text
f854c3e1f52c5a323efcd40de8c9dafcce0965f4 <- 6bc26cf...  establish contracts
8d7622c8b39e48b1e02a922d593a47f39dc0a188 <- f854c3e1...  complete package
6bf81cbebbe9c17aff668049fbc6f3c43a44bf80 <- 8d7622c8...  freeze evidence
87bf5025587b223aef3929172411cfeeb6fb1ca7 <- 6bf81cbe...  normalize index
```

The Candidate worktree `/Users/calvin/.codex/worktrees/263d/CWT（CloudWave Textile）项目` remained tracked-clean before and after verifier execution. The independent review worktree is `/private/tmp/cwt-three-strike-technical-escalation-review-v1.xO5nYn`; Candidate tracked files remain clean and only the new reviewer package is untracked.

The checkpoint-to-HEAD diff is exactly 22 added paths / 8,637 insertions, all reports and `docs/review-evidence`. No Product source, project script, test fixture, package, lockfile, Schema, Migration, ADR, accepted Design, runtime or configuration path changed.

Independent ancestry tests returned non-ancestor for:

```text
f27cadf97a1b3187bdc9655a7411ce7aac1ebc4b
755e514540351ed53ee96bedd5ea12f3e934387e
a696325fa2608c77e526bb7403bb911d34200064
b1a73bb8aae87f7c862117b32ce5c2a051f21b84
d8a24d48592a8c5e112d20edd24505e9e34d83c9
```

## 2. Fixed hashes and manifest

```text
417d52671ba1348407c8daf90005c9c8054694d7e5a8da943eb8d26162d55014  docs/PHASE_1B_STAGE4A_PHASE_B_THREE_STRIKE_TECHNICAL_ESCALATION_V1_0.md
e331f16b86c0f35122fbfa550b5af60d063861756f9dcb11a80dd406e534222e  docs/PHASE_1B_STAGE4A_PHASE_B_THREE_STRIKE_TECHNICAL_ESCALATION_OWNER_DECISION_PACKAGE_V1_0.md
8eee38478e3d652520fbc1363b66a0edd47d989c25f7e0e1b15fa2c7d9797908  docs/review-evidence/phase-1b-stage4a-phase-b-three-strike-technical-escalation-v1/SHA256SUMS.txt
```

Candidate manifest result: **21/21 PASS**.

Accepted authorities remained exact:

```text
48e6afebfba53f65c03077a1ca27522f0245f17cbd0b3b46ff492929cf1e0c07  accepted Design V1.4
c60d71f293da6fe082c94927650e731d26abcdb238ba94863655053e22ab1f2f  ADR-0018
```

`FIXED_INPUTS_V1_0.json` authority/type/package/lock hashes and paused prior-review artifacts were also independently verified.

## 3. Inputs reviewed

The review read the governing and Candidate inputs necessary for a fresh ruling:

- root `AGENTS.md`;
- `docs/ENGINEERING_GOVERNANCE.md`;
- `docs/REVIEW_POLICY.md`;
- accepted ADR-0018 and accepted Design V1.4;
- Technical Escalation V1.0 and Owner Decision Package V1.0;
- `FIXED_INPUTS_V1_0.json`;
- M02 common authority, decision, INCLUDE, EXCLUDE and mandatory-corpus JSON artifacts;
- M03 complete graph/seam JSON profile;
- all M03 checked-in positive/negative probes, configurations and captured results;
- complete offline verifier and captured result; and
- actual database/environment/type/package/compiler source facts.

Failed V1/V2/V3 implementations and V1.2 diagnostic material were treated only as counterexample evidence.

## 4. Offline verifier reproduction

Exact positive runtime:

```text
Node 24.14.0
V8 13.6.233.17-node.41
ICU 78.2
Unicode 17.0
CLDR 48.0
darwin arm64
TypeScript 5.9.3
```

Results from the clean Candidate worktree:

```text
fresh run 1: exit 0
fresh run 2: exit 0
run 1 versus run 2: byte-identical
fresh payload versus capture after command/exit header: byte-identical
default Node 25.8.1 mismatch: exit 1 before profile acceptance
```

No dependency install, download, registry or network access occurred.

The author verifier's deterministic execution does not establish the normative M02 insertion language. Its `classifyWitness` function creates only these candidates:

```text
normalized
normalized with [U+000A, U+034F, U+200B] removed
```

It never compiles or evaluates `Default_Ignorable_Code_Point | Mark | White_Space | Separator | Punctuation` as the selected grammar requires.

## 5. Independent M02 semantic challenge

`REVIEWER_M02_SEMANTIC_CHALLENGE_V1_0.mjs` uses Node built-ins and Candidate JSON/text only. It does not import the author verifier or project implementation code.

### Structural results

- Owner selection remains `null`.
- Options are exactly INCLUDE and EXCLUDE.
- Rule counts are 31 and 30.
- Every non-DeepSeek rule is semantically identical after the documented later-priority shift.
- The prefix rule adds only `deepseek-`.
- INCLUDE adds exactly one whole-token rule for `deepseek`.
- Both DeepSeek rules use the same `grammar-adjacency-v1` insertion policy.

### Fresh normative matcher

The challenge derives the admitted insertion atom directly from the five declared Unicode properties minus invalid controls, expands the literal `deepseek` to code-point atoms, and inserts the exact 0..4 gap between each consecutive atom.

Expected security cases reproduced:

```text
DeepSeek                         -> match
d<U+200B>eepseek                 -> match
deep<LF>seek                     -> match
deepseek<U+034F>-v4-flash        -> prefix match
deepseek-v4-flash                -> prefix match
deepseeking / deepseekers        -> no whole-token match
```

Decisive false-positive contradiction:

```text
deep-seek textile research                    -> normative whole-token match
The analysis is deep; seek durable textiles.  -> normative whole-token match
```

`-` and `;` are Unicode Punctuation; ordinary space is White_Space/Separator. Each sequence fits the 0..4 p→s gap. The mandatory corpus and Owner package instead state `allow`.

The reviewer challenge ran twice byte-identically and matched its capture.

## 6. Independent M03 audit

Actual type facts:

```text
AppDatabase<TQueryResult extends PgQueryResultHKT>
PgliteAppDatabase
PostgresAppDatabase
DatabaseConnection = pglite branch | postgres branch
databaseConnection.db before narrowing = PgliteAppDatabase | PostgresAppDatabase
```

Strict local probes used the installed TypeScript 5.9.3 and repository `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` settings:

```text
checked-in discriminated positive    exit 0
checked-in union projection negative exit 2 / TS2375
checked-in cross-driver negative      exit 2 / TS2375
fresh reviewer discriminated positive exit 0
```

The fresh positive accepts an actual `DatabaseConnection` parameter, exhaustively switches on `kind`, passes only the branch-narrowed `.db` to the generic protected factory, and then applies the same function to the actual singleton. It uses no cast, assertion, `any`, `unknown`, suppression, wrapper, visitor or second authority.

Profile audit also confirmed:

- one required Phase B outer composition root and exactly five imports;
- `kind` stays outer control flow and no wrapper/discriminator crosses;
- protected AI cannot reach broad environment/connection/Provider/network authority;
- reserved Phase D composition and adapter zone are exactly absent in Phase B;
- Production Provider registry remains exact-empty;
- unresolved acquisition, unsupported syntax, symlink/collision and union erasure fail closed; and
- future proof artifacts are build-only and create no dependency/runtime/public path.

M03-D1-DISCRIMINATED-SEAM is technically precise and implementable at this decision boundary.

## 7. Finding and root classification

| Finding | Severity | Root | Status |
|---|---|---|---|
| TECH-M01 — M02 INCLUDE grammar contradicts its safe corpus/Owner consequence | Medium | M02 exact security/false-positive decision contract | OPEN |

The incomplete author witness classifier is part of TECH-M01, not a second finding. No M03 finding or genuinely new implementation root was found.

## 8. Decision and governance ruling

- Technical review conclusion: **FAIL**.
- Owner-decision eligibility: **NO**.
- M02-D1 Owner choice: not eligible.
- M03-D1 option: independently PASS but cannot advance alone through the combined gate.
- Corrected Design: not eligible for authorship from this FAIL.
- Implementation: not eligible; no attempt 4.
- Schema/Migration: none indicated.
- Dependency/package/lock: none indicated for the recommended architecture.
- Complexity Approval: none indicated for the recommended architecture.
- ADR: INCLUDE none; EXCLUDE still requires the disclosed security-exception ADR.
- External validation: none for this docs/evidence gate.

Required next gate: docs/profile/evidence-only correction of TECH-M01, then Fresh independent technical-escalation re-review. The correction must make the selected grammar, full Unicode-property evaluator, corpus and Owner-facing false-positive consequence one exact authority.

## 9. Process compliance

- Candidate tracked files were not changed.
- Reviewer artifacts are isolated under a new versioned path.
- No commit, merge, Push, Provider/API/credential/network/spend, Staging/Production, Deploy, Publish, Index, formal import or Phase C/D/E action occurred.
- No Owner option was selected.
- No corrected Design or implementation was started.
