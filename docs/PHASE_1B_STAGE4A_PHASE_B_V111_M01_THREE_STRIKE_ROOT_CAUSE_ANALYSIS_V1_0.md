# CWT Stage 4A Phase B — V111-M01 Three-Strike Root-Cause Analysis V1.0

Status: **COMPLETED / INDEPENDENT TECHNICAL ANALYSIS ONLY / REPLACEMENT RECOMMENDED / NOT CORRECTED DESIGN / NOT IMPLEMENTATION ELIGIBLE**

Date: `2026-08-11` (`Asia/Shanghai`)

Role: `Independent Technical Root-Cause Analyst`

## 1. Executive conclusion

`V111-M01.one-fail-closed-executable-authority` remained open through three
independently reviewed ordinary corrections:

1. V1.12, commit `901edf7b...`, failed after attempt 1;
2. V1.13, commit `de6c10d...`, failed after attempt 2; and
3. V1.14, commit `aac9169c...`, failed after final attempt 3.

The three failures have one causal root. The correction loop tried to prove one
machine authority by synchronizing and scanning several representations of
currentness: human prose, Markdown headings/markers/fences, a subject JSON, an
identity JSON, a generated pointer bundle, a review-envelope JSON and CLI Git
arguments. Each round repaired the latest visible spelling or presentation
case, but it did not relocate authority to one closed structured root and join
that root to one reviewer-controlled Git expectation.

The decisive replacement is therefore not a fourth parser patch:

- make one sealed, duplicate-aware, canonical JSON root the only Candidate
  machine authority;
- embed the subject and seal in that one root rather than maintaining separate
  subject/identity/bundle copies;
- make Markdown/prose a hashed but **non-authoritative rendered document** and
  remove every Markdown-to-authority parser edge;
- delete the Candidate-committed nominal envelope;
- create the final Git review envelope only after the final Candidate commit,
  outside the Candidate, and require the verifier to consume and cross-bind it;
  and
- retain the stronger V1.14 JSON/JCS/path/hash/DAG/physical-alias constraints in
  the replacement root.

This recommendation adds no package, lock, Schema, Migration, ADR, persistent
coordination, Provider or Product boundary. No Owner architecture decision is
required to use the recommended simplification. Coordinator acceptance, a new
Corrected Design task, and a Fresh independent Design PASS remain mandatory
gates. Choosing a CommonMark AST lint instead would require a separate
dependency/license/offline-CI decision and is not recommended.

Ordinary Attempt 4 is prohibited. This analysis does not create the Corrected
Design or implementation and stops after coordinator callback.

## 2. Immutable start, checkpoint and evidence authority

The required L3 checkpoint was established before analysis-file mutation.

| Item | Verified identity |
| --- | --- |
| start/checkpoint target | `0793948ad115c19f852a9590387ed9ba06738a39` |
| exact parent / accepted V1.10 | `234cd90211c45c6cc86c988d02c8d5dc2f7858d2` |
| exact start tree | `affecff8bc55e00d533f08e9d29d1449aa7993ca` |
| source ref | `codex/checkpoint/phase-1b-stage4a-phase-b-implementation-attempt3-pre-l3-v1` |
| new immutable checkpoint ref | `codex/checkpoint/phase-1b-stage4a-phase-b-v111-m01-three-strike-analysis-pre-l3-v1` |
| checkpoint record commit | `c19e7163e9a02655461a07dce1ddb1099c6e55a6` |
| checkpoint record parent | exact `0793948...` |
| checkpoint record diff | one added path only |
| checkpoint record SHA-256 | `d8222dc354511b5dd259226647263e17287a8938f96bb6c2008036553961b558` |
| frozen tag object / peel | `1c626f9b...` / `31c0e405...` |
| full implementation rollback | `3f475e13d73d9d68a4dfb9a040941c57f1ee92e6` |
| analysis branch | `codex/phase-1b-stage4a-phase-b-v111-m01-three-strike-analysis-v1` |
| worktree | `/Users/calvin/.codex/worktrees/e4be/CWT（CloudWave Textile）项目` |

The pre-checkpoint source was clean and detached at the exact target. V1.10 was
both the exact parent and an ancestor. The frozen tag object and peeled commit
matched. The new checkpoint ref remained fixed after the record commit.

The versioned checkpoint record is
[PHASE_1B_STAGE4A_PHASE_B_V111_M01_THREE_STRIKE_ANALYSIS_PRE_L3_CHECKPOINT_V1_0.md](PHASE_1B_STAGE4A_PHASE_B_V111_M01_THREE_STRIKE_ANALYSIS_PRE_L3_CHECKPOINT_V1_0.md).
The complete machine ledger is
[FIXED_INPUTS_V1_0.json](review-evidence/phase-1b-stage4a-phase-b-v111-m01-three-strike-analysis-v1/FIXED_INPUTS_V1_0.json).

### 2.1 Controlling V1.14 review

The controlling report, evidence, challenge, challenge output, identity capture,
normalized author output and manifest matched the supplied SHA-256 values.
Manifest verification from the reviewer repository root passed `6/6`.

| Evidence | SHA-256 |
| --- | --- |
| report | `cfe1ab0c849b1466edcf6ffed3ffeef3fc181eb1a1c293480bfee96bc68a2f93` |
| evidence | `eec29d671079d3585da022e3103270ba221bf602fec9a10e5c22532a2cf1809e` |
| challenge | `ba96041980f7b58f18c4148b45afec3c7d199e9c74d1e96d7ecb1d402fbf4c2d` |
| challenge output | `8021f010ebefb1482fa3eb44613855a3153d4e326bf24e6caffc16d3c937293b` |
| identity capture | `39e29fcb84ec10ede6406ff165e059ab1b7190261e263ad09aac281ff4f81429` |
| normalized author output | `6bb75954946d411fc1fc85923a2fac08bfbc0c37cd0c0dd763b1bd719fcc9f17` |
| manifest | `b002f737ee67009ce2004aa926bade41ef3880dd443595d6bbf9c131a3543dc0` |

### 2.2 Failed V1.14 Candidate

The exact V1.14 author package at `aac9169c...` was read as immutable evidence.
The Design, subject/identity bytes and JCS hashes, bundle, vectors, verifier,
nominal envelope, main manifest and seal manifest all matched the supplied
values. The main manifest passed `15/15`; the seal manifest passed `3/3`.

No failed commit was merged, cherry-picked or made an ancestor of the analysis
branch. Disposable clones derived from exact V1.14 were used only to execute
the reproductions and were removed.

## 3. Independent minimal executable reproductions

The dependency-free runner
[RUN_V111_M01_MINIMAL_REPRO_V1_0.mjs](review-evidence/phase-1b-stage4a-phase-b-v111-m01-three-strike-analysis-v1/RUN_V111_M01_MINIMAL_REPRO_V1_0.mjs)
creates a clean detached exact V1.14 snapshot, evaluates the exact shipped
`markdownAuthorityView` function, runs a bounded structural CommonMark fence
parser for the relevant grammar, and executes the exact V1.14 verifier against
a deterministic envelope/ref mutation in an isolated local clone.

The output is byte-stable across repeated runs. Its fixed capture is
[V111_M01_MINIMAL_REPRO_CAPTURE_V1_0.txt](review-evidence/phase-1b-stage4a-phase-b-v111-m01-three-strike-analysis-v1/V111_M01_MINIMAL_REPRO_CAPTURE_V1_0.txt),
SHA-256 `9ae5ad930221858d7f832b9c856cbc0215560b56d23176f374ae28f9bf9cd75c`.

The exact snapshot identities were:

| HEAD | parent | tree | state |
| --- | --- | --- | --- |
| `aac9169c...` | `089a4936...` | `0057dbb7...` | clean detached exact snapshot |

The exact shipped Markdown function slice has the controlling Reviewer hash
`17ccbe7fc0fb68ea544dd6d0006125e8d665f0a2b29367092c7416511a41ae3a`.

### 3.1 CommonMark witnesses

CommonMark fenced code blocks permit zero to three leading spaces and a closing
delimiter at least as long as the opener. The shipped regex requires column
zero and the exact same delimiter bytes. Every following mutation therefore
received the unchanged green shipped result while the structural parser found
the prohibited declaration:

| Witness | Shipped result | Structural result | Contract result |
| --- | --- | --- | --- |
| 1-space-indented exact machine view | accepted | 2 exact views | reject |
| 3-space-indented exact machine view | accepted | 2 exact views | reject |
| longer valid closing fence | accepted | 2 exact views | reject |
| indented tilde-fenced exact machine view | accepted | 2 exact views | reject |
| indented reserved second-seal JSON | accepted | 1 reserved declaration | reject |

These are not five independent parser omissions. They are members of the same
open presentation-equivalence class. Adding five regex alternatives would
leave other valid CommonMark forms and future prose forms outside the finite
enumeration.

### 3.2 Sealed ref, CLI ref and ignored envelope

The runner changed only `CANDIDATE_REVIEW_ENVELOPE_V1_0.json` in a disposable
clone, committed that mutation with fixed author/time bytes, and invoked the
exact V1.14 verifier against the new exact branch/HEAD/tree/parent. Three ref
copies deliberately differed:

| Copy | Value |
| --- | --- |
| sealed subject/identity ref | `refs/heads/codex/phase-1b-stage4a-phase-b-corrected-exact-design-v1-14` |
| `args.expectedRef` | `refs/heads/codex/v111-m01-repro-actual-review` |
| nominal envelope ref | `refs/heads/codex/v111-m01-repro-envelope-copy` |

The nominal envelope's commit, tree and parent were replaced by `0...0`,
`2...2` and `1...1`; both authority hashes were also replaced. All envelope
Git fields disagreed with the observed clean Git state.

The exact verifier still exited `0` and reproduced the unchanged normalized
output SHA-256 `6bb75954946d411fc1fc85923a2fac08bfbc0c37cd0c0dd763b1bd719fcc9f17`.
Its source contains neither the envelope filename nor an envelope path binding.
This one execution covers four required facts:

1. sealed Candidate ref can differ from `args.expectedRef`;
2. envelope ref can differ from both;
3. envelope HEAD/tree/parent can differ from observed Git; and
4. the verifier does not read or bind the envelope.

The deterministic temporary mutation commit `87c22c5c...` existed only inside
the removed disposable clone. It is not an analysis ancestor or authority.

### 3.3 Section 20.0.5 drift

V1.14 §20.0.5 renders the following V1.13 values:

| Value | Rendered prose | Actual verified file SHA-256 |
| --- | --- | --- |
| V1.13 main manifest | `d266152168236187f4038ee19d70dab341ef68cb5159681197f6287311376bc7` | `d2661521e510e4435e9b8244b4ac24618f1c1b9075442b164670e9a011eae34a` |
| V1.13 seal manifest | `cb9577e525c8c343d4753fa3116a576998232f99b529f30114969afc68ed6e9b` | `cb9577e5fb74ab9d5524abc5fd6f1715b51cac895addd82aeaa242fe321a6af9` |

The prose values are not consumed, so the package can be green while the
rendered “required immutable” gate is wrong. This is supporting evidence for
the same projection root, not a separately counted finding.

### 3.4 Process isolation

The runner performed zero package-manager, install, materialization, network,
Provider or credential action. It used already-installed Node/TypeScript only,
kept the analysis repository status byte-stable, rechecked the checkpoint ref,
and removed both disposable repositories in `finally`.

## 4. V1.12 → V1.13 → V1.14 chronology

| Attempt | Correction mechanism | What it genuinely closed | Decisive remaining witness | Causal ruling |
| --- | --- | --- | --- | --- |
| V1.12 / 1 | V3.1 profile and current proof package | M04 profile materialization, actual-tree and URL/resource technical facets | standalone Design still named V3.0 artifacts and V1.11 verifier/capture | copied current projections had no single source |
| V1.13 / 2 | repaired seven literals; exact current/history strings and marker scan; path-bearing bundle | current exact spellings and three checkpoints | six Markdown/case/marker/fence variants, three path aliases and detached exact-HEAD rejection | case-sensitive presentation scan plus unbound pointers replaced neither authority nor attachment assumption |
| V1.14 / 3 | subject, identity seal, bundle, machine fence, nominal envelope, detached-aware Git function | duplicate-aware JSON/JCS, exact cardinality, role/path/hash, physical alias and DAG baseline | five valid CommonMark bypasses; three divergent ref copies; ignored envelope; prose hash drift | more structured layers still formed parallel authorities instead of one closed graph |

The progression is “fix observed representation, then add another projection,”
not “replace the causal boundary.” V1.14 is materially stronger than V1.13 at
JSON/JCS/path/DAG validation, but the acceptance decision still depends on an
incomplete presentation parser and on locally valid yet unjoined identity
copies.

## 5. Root-cause analysis

### 5.1 Immediate defects

The immediate defects are exact and deterministic:

- a handwritten regex implements less than the CommonMark contract claimed by
  the Design;
- `validateIdentity` joins the identity ref only to the subject ref;
- `exactGit` joins Git only to `args.expectedRef`;
- no assertion joins those two paths;
- the nominal envelope is never read; and
- human §20.0.5 hash values are manually copied and drifted.

Fixing only those statements is insufficient because they are effects of the
authority topology.

### 5.2 Misplaced responsibility

The verifier is asked to infer machine roles from a human presentation
language. Markdown is intentionally flexible: equivalent fenced blocks have
multiple legal delimiters, indentation forms and renderings. Prose also has
unbounded headings, links, case choices, markers and quotations. A finite set
of strings or a local “near-CommonMark” parser cannot prove absence across that
open language.

At the same time, candidate identity is copied into independently validated
structures. Each local validator can pass while the copies disagree. A flag
saying that an envelope is “outside the content seal” does not create a dataflow
edge; only consuming and comparing the envelope does.

### 5.3 One root, different witnesses

The following are the same root's witnesses:

- exact string/regex/presentation-sensitive scanning;
- hand-written approximate CommonMark parsing;
- fence, indentation, case, marker and path mutation accumulation;
- separate subject/seal/view/bundle/envelope/ref validation;
- treating human prose as an executable “required gate”; and
- keeping a nominal file or pointer that the verifier does not consume.

The invariant is not “recognize every current-looking sentence.” The invariant
is “there is exactly one closed structured role graph, and no other input can
create a machine-current role.” Once responsibility is stated this way, the
open CommonMark equivalence class disappears from the correctness boundary.

### 5.4 Why case accumulation cannot close the root

A stronger regex could add `{0,3}` indentation and a longer-closing-fence rule.
A larger hand parser could add more CommonMark blocks. Neither proves the whole
language unless it is a conforming parser with maintained dependencies and a
closed semantic mapping. Even a conforming parser cannot decide whether
arbitrary prose semantically asserts a second authority.

The V1.13→V1.14 progression already shows the cost: exact literals became
machine fences; current markers became a reserved JSON key; branch attachment
became a detached-aware function; bundle pointers became subject and seal
roles. Yet a Reviewer still found a presentation member or unjoined copy just
outside each finite assertion set.

Adding the five Fresh variants would be ordinary Attempt 4 in substance and is
prohibited.

### 5.5 Correct trust boundary

The correct boundary has two intentionally different actors and one-way flow:

```text
Candidate canonical structured root
  -> embedded subject
  -> exact current/proof/checkpoint/history roles and hashes
  -> acyclic content seal

Reviewer-owned external envelope (created after final Candidate commit)
  -> exact canonical-root file/JCS hash
  -> expected ref / HEAD / tree / parent / clean / attachment policy

One verifier consumes both
  -> cross-binds sealed ref == envelope ref
  -> resolves ref target == expected HEAD == observed HEAD
  -> derives and compares tree/parent
  -> permits detached or exact attachment
  -> emits reviewer evidence only
```

The external envelope is not a second content authority. It is the reviewer's
post-commit expectation and therefore cannot be sealed into the commit it
names. Keeping it outside the Candidate eliminates the self-hash cycle. Binding
it to the canonical root and consuming every field closes the review graph.

Markdown remains useful for human design explanation. The canonical root may
hash the rendered Design bytes so the exact prose under review is fixed, but no
Markdown token, AST node, heading or fence creates a role.

## 6. CommonMark and dependency assessment

Read-only inspection found no declared or locally resolvable `commonmark`,
`markdown-it`, `remark-parse`, `micromark` or `unified` package. Node `24.14.0`
does not expose a CommonMark AST parser as a supported standard API.

Two alternatives were evaluated fairly:

| Option | Correctness effect | Cost/decision | Ruling |
| --- | --- | --- | --- |
| remove Markdown from machine authority | eliminates the entire open presentation class | no dependency, license, lock, cache, bundle or CI change | **recommended** |
| use a real CommonMark AST for reserved-declaration lint | can improve prose hygiene, but cannot strengthen a boundary where Markdown is already non-authoritative | new dependency/license/offline cache/CI ownership; separate authorization required | not recommended |

A blocking AST lint would also reintroduce false positives: ordinary historical
examples or quoted JSON could be rejected despite having no machine role. A
non-blocking lint supplies no acceptance guarantee. The simplest complete
correction is therefore to delete the reserved-declaration concept and all
Markdown authority parsing.

No dependency was installed or materialized during this analysis.

## 7. Preserve versus replace

The V1.14 failure does not invalidate every V1.14 mechanism. The replacement
must preserve or strengthen:

- decoded-name duplicate detection before JSON consumption;
- JCS subject/self hashing and SHA-256;
- closed schemas and exact role cardinalities;
- canonical repo-relative NFC/case-exact path rules;
- tracked regular-file, symlink and hard-link alias checks;
- exact role/path/hash and proof-contract bindings;
- acyclic graph and current/history non-overlap; and
- detached exact-HEAD support.

It must replace, not layer:

- separate subject and identity files;
- generated bundle pointers;
- Candidate-committed nominal envelope;
- dual main/seal manifests;
- Markdown machine view and reserved-declaration scanning;
- exact literal/marker/currentness scanners; and
- redundant independent expected ref/tree/parent inputs that are not
  cross-bound.

The exact deletion/retention contract is machine-readable in
[V111_M01_REPLACEMENT_DECISION_PROFILE_V1_0.json](review-evidence/phase-1b-stage4a-phase-b-v111-m01-three-strike-analysis-v1/V111_M01_REPLACEMENT_DECISION_PROFILE_V1_0.json).

## 8. Guarantee and honest boundary

The replacement can guarantee, locally and deterministically, that:

- one canonical root enumerates every executable/current role;
- Markdown creates zero machine roles;
- the reviewer envelope is consumed and bound to the root;
- ref/HEAD/tree/parent/clean/attachment agree at the time of review; and
- closed schema/JCS/hash/path/alias/DAG/current-history mutations fail.

It cannot prove:

- semantic equivalence between human prose and the structured root;
- that a mutable branch will not move after verification;
- remote actor authenticity or signing beyond the fixed local Git boundary; or
- Product/runtime behavior from a docs-only Design package.

Fresh independent human review remains responsible for prose/architecture
meaning. The verifier is responsible for exact machine and Git identity, not
natural-language semantics.

Deliberate false-positive boundary: unknown keys, roles, paths, aliases or a
different attached branch reject even when a human believes the bytes are
equivalent. This is the intended fail-closed machine boundary.

## 9. Architecture, scope and complexity impact

| Area | Impact |
| --- | --- |
| Product/runtime | none |
| Schema/Migration | none |
| ADR-0018 | unchanged |
| SEO/URL/Redirect/public | none |
| Prompt/Provider/network | none |
| package/lock/dependency | none for recommendation |
| persistent coordination | none |
| operational steps | one canonical package verifier and one external review envelope |
| total mechanism complexity | decreases: subject/identity/bundle/view/nominal-envelope/dual-manifest paths converge to one root plus one consumed reviewer expectation |

The external envelope is ordinary bounded review evidence, not persistent or
cross-process product state. No Complexity Approval is required.

## 10. Disposition and next gate

Root-cause analysis is **complete**. The exact replacement plan is
[PHASE_1B_STAGE4A_PHASE_B_V111_M01_EXACT_REPLACEMENT_PLAN_V1_0.md](PHASE_1B_STAGE4A_PHASE_B_V111_M01_EXACT_REPLACEMENT_PLAN_V1_0.md).
Its proof matrix is
[V111_M01_REPLACEMENT_PROOF_MATRIX_V1_0.json](review-evidence/phase-1b-stage4a-phase-b-v111-m01-three-strike-analysis-v1/V111_M01_REPLACEMENT_PROOF_MATRIX_V1_0.json).

Recommended next gate:

1. coordinator verifies and explicitly accepts this analysis/plan;
2. a new Corrected Design task starts from the accepted clean checkpoint and
   creates its own pre-L3 checkpoint;
3. a separate Fresh independent reviewer returns exact Design `PASS`;
4. only then may a **different new** `gpt-5.6-sol/xhigh` implementer receive the
   accepted plan; and
5. a separate independent implementation review remains required.

This task does not perform step 2 or later. It will callback and stop.
