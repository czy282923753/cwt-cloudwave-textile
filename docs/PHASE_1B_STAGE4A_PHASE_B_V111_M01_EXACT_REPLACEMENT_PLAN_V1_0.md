# CWT Stage 4A Phase B — V111-M01 Exact Replacement Plan V1.0

Status: **REPLACEMENT PLAN COMPLETE / RECOMMENDED / NOT CORRECTED DESIGN / NOT IMPLEMENTED / NOT REVIEWED / NOT IMPLEMENTATION ELIGIBLE**

Date: `2026-08-11` (`Asia/Shanghai`)

This plan is the handoff from the independent Max root-cause analysis to a
future Corrected Design task and, only after Fresh independent Design `PASS`, to
a different new `gpt-5.6-sol/xhigh` implementer. It does not authorize either
task and must not be treated as ordinary Attempt 4.

## 1. Selected replacement

Select `A-SEALED-STRUCTURED-ROOT-PLUS-EXTERNAL-CONSUMED-REVIEW-ENVELOPE`:

1. one Candidate-committed canonical JSON root owns every machine subject,
   current role, proof contract, checkpoint, frozen input, historical evidence
   identity and seal;
2. Markdown/prose is a non-authoritative rendered Design whose exact file bytes
   are hashed by the root but whose content is never parsed for machine roles;
3. one reviewer-owned JSON envelope is created **after** the final Candidate
   commit, outside that Candidate, and supplies the exact expected Git identity;
4. one dependency-free verifier consumes both structures, cross-binds them,
   checks the exact Git state and emits reviewer evidence; and
5. one derived `SHA256SUMS.txt` provides package-byte integrity but is not a
   second semantic authority.

The authoritative machine plan is
[V111_M01_REPLACEMENT_DECISION_PROFILE_V1_0.json](review-evidence/phase-1b-stage4a-phase-b-v111-m01-three-strike-analysis-v1/V111_M01_REPLACEMENT_DECISION_PROFILE_V1_0.json).
The complete proof matrix is
[V111_M01_REPLACEMENT_PROOF_MATRIX_V1_0.json](review-evidence/phase-1b-stage4a-phase-b-v111-m01-three-strike-analysis-v1/V111_M01_REPLACEMENT_PROOF_MATRIX_V1_0.json).

## 2. Preconditions and gate sequence

The future Corrected Design task must stop before mutation unless all of these
are true:

1. the coordinator has verified and explicitly accepted this analysis package;
2. the accepted analysis Candidate descends only from checkpoint
   `0793948ad115c19f852a9590387ed9ba06738a39` and not from V1.12/V1.13/V1.14;
3. the immutable analysis checkpoint ref still resolves to `0793948...`;
4. the analysis checkpoint record remains its one-path direct child;
5. the frozen tag object/peel remain `1c626f9b...` / `31c0e405...`;
6. the controlling V1.14 Reviewer package remains byte-exact and `6/6 PASS`;
7. the worktree is clean; and
8. a new pre-L3 checkpoint ref is created at the exact accepted analysis commit,
   followed by a direct one-path checkpoint-record commit.

The future sequence is fixed:

```text
accepted Max analysis
  -> new Corrected Design pre-L3 checkpoint
  -> replacement Corrected Design package
  -> external exact-Candidate envelope
  -> Fresh independent Design review
  -> coordinator/Owner gate acceptance
  -> different new gpt-5.6-sol/xhigh implementation task
  -> separate independent implementation review
```

No step implies authorization for the next step.

## 3. Unique canonical machine source

### 3.1 File and schema

The future Corrected Design must create exactly one semantic root named:

`V111_M01_CANONICAL_REVIEW_AUTHORITY_V2_0.json`

Its top-level keys are exactly, with no additional or missing key:

1. `authorityId`;
2. `authorityVersion`;
3. `canonicalization`;
4. `checkpoints`;
5. `currentRoles`;
6. `frozenInputs`;
7. `historicalEvidence`;
8. `proofContracts`;
9. `roleGraph`;
10. `rolePolicy`;
11. `seal`;
12. `status`; and
13. `subject`.

The file must be UTF-8 RFC 8785-compatible JCS followed by exactly one LF. Raw
duplicate-aware decoding must reject decoded duplicate member names, including
equivalent escaped names, before any value is consumed. Unknown keys,
non-I-JSON values, non-finite values, unsafe integers, invalid Unicode, wrong
types and non-canonical bytes fail closed.

### 3.2 Exact cardinalities and roles

The future root has these exact cardinalities:

| Object | Exact count |
| --- | ---: |
| authority root | 1 |
| embedded subject | 1 |
| seal | 1 |
| current roles | 3 |
| executable current roles | 2 |
| proof contracts | 5 |
| checkpoints | 2 |
| failed-attempt historical records | 3 |

The three current roles are exactly:

| Role | Executable authority | Required binding |
| --- | --- | --- |
| `renderedDesign` | no | exact path and SHA-256 of the standalone human Design; `machineAuthority=false` |
| `currentTechnicalProfile` | yes | exact path, SHA-256, profile ID/version and selected-pointer integrity |
| `currentVerifier` | yes | exact path, SHA-256 and verifier schema/version |

The five proof contracts retain the accepted V3.1 role meanings:

1. `proof.actualTreeAndStaticLanguage`;
2. `proof.staticModuleAndResourceGraph`;
3. `proof.capabilityOriginAndNonReachability`;
4. `proof.phaseBComposition`; and
5. `proof.serverPublicBundleBoundary`.

Every proof role binds an exact role, filename, repo-relative output path,
profile ID/version, schema version, JCS contract and contract-subtree SHA-256.
Future output content hashes come only from the later generated implementation
proof manifest; missing future files are required at Corrected Design time.

The two checkpoint roles are exactly:

1. `checkpoint.analysisPreL3`, bound to target `0793948...`, record commit
   `c19e716...`, exact record path and record SHA-256; and
2. `checkpoint.correctedDesignPreL3`, bound to the future accepted analysis
   commit and its one-path direct-child record.

The Corrected Design must fill the second checkpoint's exact values from the
established Git state. Placeholders, shortened hashes and `TBD` are forbidden
in the sealed root.

`historicalEvidence` has exactly three closed records for V1.12, V1.13 and
V1.14. Each binds the failed commit/ref/tree/parent, controlling report and
manifest hashes, attempt number and `nonExecutable=true`. Historical evidence
may explain derivation but cannot supply a current path, compile input,
verifier, capture, proof contract or Git expectation.

### 3.3 Embedded subject and seal

The subject is embedded in the root. It has exactly these keys:

- `candidateRef`;
- `markdownAuthority`;
- `renderedDesignRole`;
- `subjectId`;
- `technicalProfileRole`; and
- `verifierRole`.

`candidateRef` is one full `refs/heads/codex/...` value. It is the only
Candidate-side copy. `markdownAuthority` is exactly `false`.

The seal contains:

- `subjectJcsSha256 = SHA-256(JCS(subject))`; and
- `authorityJcsSha256 = SHA-256(JCS(root with only
  seal.authorityJcsSha256 omitted))`.

No role may hash itself, the final Candidate commit, a reviewer envelope, the
package manifest or an independent review capture.

### 3.4 Path and physical identity

Every current, proof, checkpoint and applicable history path must be:

- repository-relative POSIX text;
- NFC and case-exact at every filesystem segment;
- inside the exact Git root;
- a tracked regular file when it is required to exist; and
- unique by canonical path and by `device:inode` physical identity.

Reject absolute paths, empty/dot/dot-dot segments, duplicate slash, backslash,
percent encoding, controls, NFD aliases, case aliases, symlinks, hard-link role
aliases and out-of-root resolution. No “same hash means same role” exception is
allowed.

### 3.5 One-way DAG

The graph is exactly:

```text
authorityRoot
  -> embeddedSubject
  -> renderedDesign
  -> currentTechnicalProfile
  -> currentVerifier
  -> proofContracts
  -> checkpoints
  -> frozenInputs
  -> historicalEvidence

embeddedSubject
  -> renderedDesign
  -> currentTechnicalProfile
  -> currentVerifier

proofContracts
  -> currentTechnicalProfile
```

All other nodes are leaves. A graph cycle, undeclared node, missing node,
duplicate edge, current/history overlap or role/path overlap fails.

The generation order is:

1. rendered Design;
2. current technical profile;
3. verifier;
4. embedded subject;
5. canonical authority root;
6. derived package capture; and
7. one `SHA256SUMS.txt`.

This order is mandatory because it eliminates self-hash and capture cycles.

## 4. Markdown and prose boundary

Markdown is non-authoritative rendered documentation. The future verifier may
read the Design bytes only to hash them against the `renderedDesign` role. It
must not parse or search:

- headings or sections;
- current/history markers;
- code-fence delimiters, lengths, indentation or info strings;
- JSON blocks or a reserved declaration key;
- paths, filenames, hashes or ref strings in prose; or
- case/literal/substring variants.

Delete the `cwt-current-authority-view-v1` machine fence,
`cwtCurrentAuthorityMachineDeclaration` reserved key and all related contract
claims. Prose can link to the canonical root but cannot mirror an executable
hash table and call it a required gate.

If a human-readable table is useful, generate it from the root as display-only
output and label it `NON-AUTHORITATIVE`. A mismatch requires regeneration and
review but does not create a second source.

No CommonMark parser is needed. The repository declares and resolves none, and
Node has no supported built-in CommonMark AST. Installing one is outside the
recommended plan and prohibited without explicit dependency/license/offline-CI
authorization. A real AST lint, if separately selected later, must be advisory
and must never enumerate roles or decide acceptance.

## 5. Review envelope and exact Git closure

### 5.1 Envelope ownership and timing

The future envelope is named `CANDIDATE_REVIEW_ENVELOPE_V2_0.json`. It is
created after the final Candidate commit by the reviewer/coordinator in a
disposable path or independent-review evidence. It is never committed inside
the Candidate it identifies and is never listed in the Candidate manifest.

This placement is necessary, not optional: a file inside a commit cannot name
and hash that containing final commit without a self-reference.

### 5.2 Envelope schema

Its top-level keys are exactly:

1. `authorityBinding`;
2. `expectedGit`;
3. `provenance`;
4. `schemaId`;
5. `status`; and
6. `version`.

`authorityBinding` has exactly:

- `authorityJcsSha256`;
- `fileSha256`;
- `path`; and
- `role`, exact `canonicalReviewAuthority`.

`expectedGit` has exactly:

- `attachmentPolicy`, exact `detached-or-exact-ref`;
- `cleanRequired`, exact `true`;
- `head`, one full 40-hex commit;
- `parent`, one full 40-hex commit;
- `ref`, one full `refs/heads/codex/...` ref; and
- `tree`, one full 40-hex tree.

`provenance` records that the coordinator/reviewer supplied the pinned ref and
HEAD after the final Candidate commit. It does not grant acceptance.

The envelope is duplicate-aware parsed and JCS-hashed. Its JCS hash is emitted
in review output; no self-hash field is required.

### 5.3 Verifier inputs

The future verifier accepts exactly one of two explicit modes:

```text
--authority <canonical-root> --package-only
--authority <canonical-root> --review-envelope <external-envelope>
```

The first mode creates deterministic pre-commit package evidence only and must
emit `acceptanceEligible=false`. The second always runs the same package checks
and adds exact Git/review checks. Neither mode accepts separate `--expected-ref`,
`--expected-head`, `--expected-tree`, `--expected-parent`, `--identity` or
`--bundle` arguments.

Acceptance review must use `--review-envelope`. Package-only success cannot be
reported as Design PASS.

### 5.4 Required cross-binding order

The review verifier must execute in this order:

1. strict-parse and validate the canonical root;
2. strict-parse and validate the external envelope;
3. hash the exact root file and compare both root self-hash and envelope
   authority binding;
4. assert `envelope.expectedGit.ref === root.subject.candidateRef`;
5. resolve the ref and assert its target equals `expectedGit.head`;
6. assert observed `HEAD` equals `expectedGit.head`;
7. require exactly one expected-HEAD parent;
8. derive tree and parent from `expectedGit.head` and compare them to envelope
   tree/parent;
9. compare observed `HEAD^{tree}` and `HEAD^` to the same values;
10. require empty `git status --porcelain=v1 --untracked-files=all`;
11. inspect symbolic HEAD:
    - empty means detached and is valid;
    - non-empty must equal the exact full expected ref;
    - another branch at the same commit fails;
12. verify every manifest entry and exact package inventory; and
13. emit one normalized JSON result including envelope JCS hash, root hashes,
    ref/HEAD/tree/parent booleans, clean state and attachment diagnostic.

Attached and detached runs must produce byte-identical normalized semantic
payloads after the non-authoritative attachment diagnostic is excluded.

Every envelope leaf must be read. A mutation-coverage assertion must prove that
changing each leaf independently either fails or changes the exact normalized
evidence. A nominal, ignored envelope is prohibited.

## 6. Required deletions and non-imports

Because the successor starts from the accepted analysis branch rather than a
failed branch, most V1.12–V1.14 files should be absent. They must not be copied.
If any are present in a proposed successor, delete them rather than wrapping
them.

| Failed mechanism/artifact | Required disposition |
| --- | --- |
| separate `CURRENT_AUTHORITY_SUBJECT_V1_0.json` | embed subject in one root; do not import |
| separate `CURRENT_AUTHORITY_IDENTITY_V1_0.json` | replace with one root; do not import |
| `CORRECTED_EXACT_DESIGN_REVIEWED_PROFILE_CANDIDATE_V1_14.json` | delete pointer bundle |
| Candidate-committed `CANDIDATE_REVIEW_ENVELOPE_V1_0.json` | delete; external V2 envelope only |
| `SEAL_SHA256SUMS.txt` | delete; one derived manifest only |
| `markdownAuthorityView` / `expectedView` / `designViewContract` | delete |
| `markedBlock` / `withoutHistoricalBlocks` / `scanCurrentAuthority` | do not restore |
| exact stale/current literal inventories | chronology evidence only, never acceptance authority |
| generated `currentAuthority` / `components.currentM04.path` pointer namespaces | delete |
| Markdown semantic/fence/case/indent/marker mutation corpus as acceptance proof | replace with zero Markdown-to-role dataflow property |
| separate CLI expected ref/tree/parent copies | envelope only |
| current §20.0.5 manually copied hash table | delete or render non-authoritatively from root |

Historical V1.12–V1.14 commits, reports and manifests remain immutable evidence.
They are not deleted from Git history and are not made new authority.

## 7. Package layout and derived evidence

The future Corrected Design package contains at least:

1. standalone rendered Corrected Design;
2. one canonical review authority root;
3. one current technical profile;
4. one dependency-free verifier;
5. one machine-readable proof/mutation matrix;
6. one package-only deterministic capture;
7. one fixed-input ledger; and
8. one `SHA256SUMS.txt`.

The manifest is generated last and lists every Candidate package path except
itself. It rejects missing, extra, duplicate, aliased, malformed or wrong-hash
entries. It does not create roles and is not referenced by the root seal.

The package-only capture is derived evidence. The root does not hash it. The
manifest does. Full final-Git review output is produced after the Candidate
commit and belongs to the independent reviewer, not to the Candidate.

Do not keep attached, detached and subject captures as three machine
authorities. One normalized package capture plus reviewer-owned review output
is sufficient.

## 8. Atomic commit plan

### Commit 0 — future Corrected Design checkpoint record

- parent: exact coordinator-accepted analysis commit;
- one new checkpoint record path only;
- record contains ref/target/parent/tree/worktree/clean/ancestry/tag, this
  analysis manifest/hash, rollback and prohibited actions; and
- immutable checkpoint ref stays at the record parent.

If this commit cannot be created as a one-path direct child, callback `BLOCKED`.

### Commit 1 — replacement Corrected Design Candidate

One atomic docs/evidence commit must:

- add the standalone rendered Corrected Design;
- add the current technical profile reconstructed from accepted/frozen inputs;
- add the dependency-free verifier;
- add the embedded-subject canonical root and proof matrix;
- add the package-only capture and fixed ledger;
- add one manifest generated last;
- contain no failed parser/bundle/envelope mechanism; and
- remain within `docs/` and `docs/review-evidence/`.

If an unchanged closed technical facet is intentionally reconstructed
byte-identically from failed V1.14 evidence, the derivation audit must say so
and bind its accepted upstream facts. It becomes current only through the new
root and Fresh PASS, never because V1.14 supplied authority or ancestry.

After Commit 1, create the reviewer envelope externally and run full review
mode. Do not amend the Candidate to insert its own final Git identity. Any
Candidate byte change creates a new commit and requires a new external envelope
and Fresh run.

### Independent review commit

The independent reviewer may commit its envelope, capture, challenge and report
on a separate review/evidence branch after reviewing the exact Candidate. Those
files must not be merged into the Candidate and then cited as if they reviewed
the changed commit.

## 9. Proof obligations

The exact machine matrix contains 10 positive cases, 42 negative cases and 10
properties. The following groups are mandatory.

### 9.1 Positive

- exact canonical root;
- exact attached expected ref;
- exact detached HEAD;
- attached/detached normalized equivalence;
- deterministic repeat;
- five CommonMark presentation witnesses produce **zero** machine-role change
  because Markdown has no authority edge.

The CommonMark cases are no longer parser-coverage cases. They are proof that
no parser is consulted.

### 9.2 Structured negative

- literal and escaped duplicate JSON keys;
- missing/extra current/proof/checkpoint/history roles;
- unknown keys;
- subject/self hash drift;
- role/path/hash swaps;
- current/history overlap;
- DAG cycle;
- absolute/backslash/dot/dot-dot/duplicate-slash/percent/control/NFD/case paths;
- symlink and hard-link alias; and
- manifest omission, extra path and physical alias.

### 9.3 Git/review negative

- sealed ref versus envelope ref mismatch;
- missing/moved ref;
- wrong HEAD;
- wrong external/derived/observed tree;
- wrong external/derived/observed parent;
- merge commit;
- dirty state;
- attached wrong branch;
- authority file/JCS hash mismatch; and
- mutation of every envelope leaf.

### 9.4 Properties

- one root only;
- exact closed cardinality;
- path and physical injectivity;
- acyclic complete graph;
- sealed-ref/envelope-ref/ref-target/HEAD closure;
- tree/parent derivation closure;
- attachment orthogonality;
- external-envelope no-cycle;
- manifest derived-only; and
- zero Markdown-to-authority source/dataflow edge.

The verifier and mutation runner must execute twice with byte-identical output.
No fixture may pass only because the relevant code was not reached.

## 10. Verification commands and captures

The future Corrected Design must provide copy-ready commands equivalent to:

```text
node VERIFY_<SUCCESSOR>.mjs --authority <root> --package-only
node VERIFY_<SUCCESSOR>.mjs --authority <root> --review-envelope <external-envelope>
shasum -a 256 -c <single-manifest>
git diff --check
git status --porcelain=v1 --untracked-files=all
```

The exact paths, Node version and output hashes must be recorded in the
Candidate/reviewer packages. All commands use already-installed local tooling.
No package manager, install, download, registry, network, Provider or credential
operation is permitted by this plan.

Documentation-only Design verification does not require unrelated application
Build, unit or browser suites. The later product implementation task must run
the full risk-proportionate gates enumerated by the Fresh-passed Corrected
Design.

## 11. Scope and prohibited expansion

The replacement Corrected Design package is limited to `docs/` and
`docs/review-evidence/`.

It must not modify:

- `src/`, project `scripts/` or product test fixtures;
- configuration, Schema, Migration or ADR;
- package or lock files;
- Prompt, Product, public, SEO, URL or Redirect behavior;
- Provider/network/credentials;
- Phase C/D/E; or
- failed refs through merge or cherry-pick.

Any need to modify those boundaries stops the task for coordinator/Owner
direction. A future product implementation allowlist must come from the exact
Fresh-passed Corrected Design; this analysis plan does not infer one.

## 12. Guarantee, false-positive/false-negative and maintenance boundary

### Guarantee

For the exact consumed root, external envelope and local Git object database,
the verifier proves one closed current-role graph and point-in-time equality of
sealed ref, expected ref, ref target, HEAD, tree, parent, clean state and
attachment policy. Markdown cannot create authority.

### Deliberate false positives

The gate rejects unknown roles/keys, noncanonical but value-equivalent JSON,
alternate case/Unicode/path aliases and another attached branch at the same
commit. This strictness is deliberate and mechanically reviewable.

### False-negative / out-of-scope boundary

The gate does not prove semantic agreement between prose and root, future ref
immobility, remote signing/actor authority or Product behavior. Fresh human
review and later implementation verification own those questions.

### Maintenance

Maintenance responsibility decreases from multiple parsers/projections to:

1. one closed JSON schema and role graph;
2. one external-envelope schema;
3. one verifier; and
4. one derived manifest.

There is no compatibility layer, transition dual-write or second current
authority.

## 13. Dependency, ADR, complexity and operations decision

Recommended Option A requires:

- no new dependency or license;
- no package/lock change;
- no ADR change;
- no Schema/Migration;
- no persistent coordination; and
- no Complexity Approval.

It adds one understandable reviewer step: generate an external envelope after
the final Candidate commit and pass it to the verifier. That step replaces
multiple CLI identity arguments and a nominal ignored file, so total
operational ambiguity falls.

If the Owner instead selects real CommonMark AST lint, the task must stop until
an explicit decision names the parser/version/license, offline cache/integrity,
CI ownership, package/lock scope, bundle isolation and maintenance owner. That
alternative is optional hygiene only and remains non-authoritative.

## 14. Rollback

Before acceptance, rollback means abandon the future Candidate branch and
create a new clean branch/worktree from the immutable future pre-L3 checkpoint.
Do not move the checkpoint, frozen tag or failed evidence refs. Do not use a
destructive reset when a clean worktree is available.

After Commit 1 but before review, revert that atomic docs/evidence commit or
abandon the branch. There is no Product data, Schema, Migration, Provider or
external-state rollback.

An external envelope or review capture can be discarded and regenerated. It
does not mutate Candidate bytes.

## 15. Copy-ready contract for future tasks

### 15.1 Future Corrected Design task

> Start from the coordinator-accepted V111-M01 Max analysis commit, establish a
> new immutable pre-L3 checkpoint and one-path record, then author the
> replacement Corrected Design package defined by this plan. Do not merge,
> cherry-pick or copy V1.12/V1.13/V1.14 authority mechanisms. Preserve their
> bytes only as historical evidence. Use one embedded-subject canonical root,
> non-authoritative Markdown, one dependency-free verifier, one derived
> manifest and a reviewer-owned external envelope. Remain docs/evidence-only.
> Run the full proof matrix, request Fresh independent Design review and stop.

### 15.2 Different future xhigh implementation task

> Begin only after the exact successor Corrected Design receives Fresh
> independent PASS and the coordinator explicitly accepts that gate. Use a
> different new `gpt-5.6-sol/xhigh` task and a new branch/worktree at the exact
> accepted checkpoint. Treat failed V1.12/V1.13/V1.14 implementations/designs as
> immutable evidence only. Implement the Fresh-passed Design by replacement,
> not compatibility layering or case accumulation. Prove failed mechanisms are
> absent, run every accepted focused/aggregate gate, produce exact manifests
> and callback without self-approval. Product/source mutation scope must be the
> explicit allowlist in the Fresh-passed Design; this plan grants none.

Neither quoted contract dispatches a task.

## 16. Next gate and stop condition

This plan's status is **complete but not approved**. The next gate is coordinator
verification and acceptance, followed by a separate Corrected Design task. No
Owner architecture/ADR/dependency decision is needed for recommended Option A.

This analysis task must send its coordinator callback and stop. It must not
create the Corrected Design, xhigh implementation or independent review task.
