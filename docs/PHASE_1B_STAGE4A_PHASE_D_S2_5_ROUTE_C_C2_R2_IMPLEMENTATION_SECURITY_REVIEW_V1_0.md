# CWT Phase 1B Stage 4A Phase D exact S2.5 Route C C2 R2 Implementation/Security Review V1.0

Status: **PASS / FRESH INDEPENDENT R2 IMPLEMENTATION/SECURITY REVIEW COMPLETE / C2 ACCEPTANCE PENDING / NOT AGGREGATE PASS / NOT FORMAL PASS / NOT PHASE D ACCEPTANCE**

Review date: `2026-08-17` (`Asia/Shanghai`)

Review type: fresh independent bounded findings-first implementation/security review of the exact docs/evidence-only C2 Candidate; not a redesign of accepted Route C and not a full Product review.

## 1. Subject, independence, and review boundary

```text
Candidate commit              573f0b75013e8fb55ce10ecf5bd54ecc3934beef
Candidate tree                caf386a463b0c2d711c1fb86e2384f340832f257
Candidate sole/direct parent  d7655385e37330927c53e60fbb108b56950c9794
Review branch                 codex/phase-d-s2-5-route-c-c2-r2-review-v1
```

This reviewer is independent from the C2 recorder, Route C governance implementer/reviewer, prior formal operators, and Coordinator. Prior conclusions were treated as evidence to verify rather than inherited authority.

The Candidate worktree was detached at the exact Candidate and clean before review mutation. `git diff-tree`/`git diff --no-renames` established exactly two added regular files, no rename, and no other path action:

```text
A  docs/PHASE_1B_STAGE4A_PHASE_D_S2_5_C2_IMPLEMENTATION_REPORT_V1_0.md
A  docs/review-evidence/phase-1b-stage4a-phase-d-s2-5-c2-v1/PHASE_D_S2_5_C2_EVIDENCE_MANIFEST_V1_0.json
```

Review used read-only Git-object, document, JSON-byte, and exact-source inspection plus hash calculation. Prohibited executable validation count: **0**. No Gate, Runner, preflight, aggregate, Build, Migration, PGlite, typegen, package script, test, typecheck, lint, checker, install/download/update/re-resolution, Provider/API, network, credential, dependency tree, Build output, retained root, or symlink target was run or accessed.

## 2. Candidate and exact Product identity

Candidate commit, tree, and sole/direct parent match the assigned subject. Both Candidate paths are mode `100644` blobs. The parent is exact S2.5 and the Candidate is its one-commit direct child.

Independent Git-object calculation established exact S2.5 as:

```text
commit                    d7655385e37330927c53e60fbb108b56950c9794
tree                      db18f7fdb545d91ad37280af6cc6822b78d6cfd6
sole parent               ee13e743158e245f520a8d7ec68aa1854179fdc3
diff mode                 --no-renames
path count                23
sorted-path SHA-256       10bd74a890f4c01ddfd5a03934e1c7f394bd5a8cf1365608aa298ac22b4345f5
```

The 23-path value is the sorted no-renames path set changed by exact S2.5 relative to its sole parent, not the total repository-tree path count. The Candidate report and manifest record that meaning consistently.

The accepted governance Candidate, governance review, and Technical Escalation are separate reachable Git objects and are not ancestors of the C2 Candidate. Their use as references therefore does not contaminate or alter Product ancestry.

## 3. Immutable formal, Runner, static-manifest, and Gate facts

The Candidate records the immutable formal pair exactly as assigned and as consistently bound by the reachable Technical Escalation, accepted governance Candidate, and accepted governance review:

```text
PHASE_D_SIMPLIFIED_FORMAL_VALIDATION_RESULT_V1_0.json
bytes                     4801
SHA-256                   24c035d43a23884b87c8cb99a1252959a82da21b734ad9d40ca086a32deb9459

PHASE_D_SIMPLIFIED_FORMAL_VALIDATION_RUN_MANIFEST_V1_0.json
bytes                     737
SHA-256                   337155e009c54ee4427e5070b8ff92e8068b8f2ec20ea08a03a9d5d7eb828b30
```

The retained runtime-artifact pair is not present by canonical filename in the Candidate or reachable Git trees, and no safe retained-artifact location was supplied to this reviewer. Under the assigned “if safely available” boundary, this review did not search retired/dependency/Build roots or reconstruct the pair. It instead cross-checked the filenames, sizes, hashes, and selected immutable fields against the authoritative assignment and mutually consistent reachable Git evidence. This is an explicit source-availability limitation, not a missing C2 field or an open finding.

The frozen artifacts are directly present as reachable Git blobs at the accepted governance object and independently hash to:

```text
Runner SHA-256            c647187555834efa78fb81ef0e23d5538948818267de7745d158f7a8def4d7e8
static-manifest SHA-256   5c33c416c73db652f8f751ade9d90077edccee4db87cfb79801a5b10fb23fb4c
```

The formal state remains explicit and unchanged in both C2 paths:

```text
classification            FAILED
firstFailure.stage        AGGREGATE
firstFailure.code         AGGREGATE_FAILED
aggregateOutputs          null
```

The static manifest independently confirms the exact Gate names and order. C2 records each Gate once with `invocationCount=1` and `status=PASS`:

| Order | Gate | Recorded fact |
|---:|---|---|
| 1 | `check:ai-phase-d-synthetic` | one-shot `PASS` |
| 2 | `check:ai-prompts` | one-shot `PASS` |
| 3 | `check:ai-architecture` | one-shot `PASS` |
| 4 | `typecheck` | one-shot `PASS` |
| 5 | `lint` | one-shot `PASS` |
| 6 | `test:ai-foundation` | one-shot `PASS` |
| 7 | `test:run` | one-shot `PASS` |
| 8 | `build` | one-shot `PASS` |
| 9 | `check:bundle` | one-shot `PASS` |
| 10 | `exact-s2-integrity` | one-shot `PASS` |

These are immutable per-Gate facts only. Neither Candidate path promotes them to overall formal PASS, aggregate PASS, C2 acceptance, or Phase D acceptance.

## 4. Route C governance and residual-risk fidelity

The referenced governance objects exist with the recorded identities:

```text
governance Candidate      ee402e19e1d78af0745474b33dc71ae195a082dc
Candidate sole parent     2604b460e4025190c302bfeebd62a74be710baa8
governance review PASS    a2992e531b29d8b746c54f0fc5bd9c42e92409e7
review severity           Blocker/High/Medium/Low = 0/0/0/1
FULL_REVIEW_NECESSITY     NOT_REQUIRED
Technical Escalation      9a89cb13c98344ac3e44a4ecd694966972a99dd1
terminal authority        I1.2.9.5
```

The governance Candidate has exactly the accepted one-added/two-modified docs scope. Its review's sole Low finding is terminology-only: one Owner-record sentence said “Build root” where exact source means build-manifest root chunks. The C2 Candidate uses the precise wording and does not repeat that ambiguity.

Both C2 paths preserve:

```text
aggregatePairPresent      false
aggregateDisposition      OWNER_ACCEPTED_RESIDUAL_NOT_PROVED
```

All five accepted residual obligations are complete and remain unproved:

1. compiled server output contains all three aggregate server markers;
2. compiled server output contains the raw synthetic Prompt marker;
3. every physical `.next/static/chunks/**/*.js`, including orphan chunks not selected by Build/public manifests, lacks all three markers and the raw Prompt;
4. aggregate `serverTreeHash`, `publicTreeHash`, `bundleHash`, and `sourceBundleAgreement`; and
5. the canonical aggregate pair.

No residual is recorded or inferred as PASS. No aggregate filename, aggregate hash, marker count, tree hash, `sourceBundleAgreement=true`, `publicClientAbsence=true`, or substitute predicate is created.

## 5. Compensating-evidence ceiling and final scan fact

Compensating evidence is bounded exactly to immutable Gates 3, 8, 9, and 10 plus the final bounded scan fact.

Independent inspection of exact S2.5 `scripts/check-public-bundle.mjs` confirmed that Gate 9 covers build-manifest root chunks plus manifest-referenced browser chunks, requires nonzero manifest-referenced chunk coverage, and scans its governed files for a forbidden set containing the three aggregate symbolic markers. It does **not** recursively cover the entire Build root, every physical orphan chunk, or the raw synthetic Prompt marker. It also does not prove compiled-server positive marker presence, aggregate hashes, `sourceBundleAgreement`, or a canonical aggregate pair. The Candidate report and manifest preserve this exact ceiling.

The terminal scan fact is recorded only as the first encountered held-`.next`-relative non-regular node:

```json
{"relativePath":"node_modules/@aws-sdk/client-s3-64df096a7e71b28d","nodeType":"symlink","modeType":"0o120000"}
```

Both paths state that it is outside `.next/static`; the target/content was not read; and no target, producer, purpose, containment, historical identity, whole-tree, or aggregate conclusion follows. This is a bounded fact, not a copied scan transcript or a completed scan inventory.

## 6. JSON, evidence-integrity, and security checks

The evidence manifest passed strict static byte and structure checks:

- strict UTF-8 decoding;
- no BOM, CR, or NUL byte;
- exactly one final LF;
- no duplicate JSON key;
- canonical recursive key ordering and deterministic two-space serialization;
- schema/version and all material field invariants consistent with the report; and
- exact ordered Gate array and five-item residual array.

The two-path Candidate contains no private absolute path, credential or environment value, raw formal-result/run-manifest payload, Build output, scan transcript, dependency or PGlite state, retained-root identity, fabricated aggregate artifact/hash/predicate, or hidden third evidence path. The only AWS SDK path is the approved held-root-relative bounded diagnostic.

The phase/security boundaries are explicit and truthful:

```text
externalValidation         NOT_RUN_DEFERRED_TO_PHASE_F
affectedCredential         ROTATION_REQUIRED_BEFORE_ANY_REUSE
authorized live commands   empty
```

No Provider evidence, Push, Deploy, Phase E/F authority, aggregate PASS, formal PASS, Coordinator acceptance, C2 acceptance, or Phase D acceptance is claimed.

Rollback is bounded to discarding or reverting only the exact two-path C2 commit to exact S2.5 before C2 acceptance. It does not restore consumed execution allowances, delete retained formal evidence, or rewrite any historical fact.

## 7. Findings and severity

```text
Blocker  0
High     0
Medium   0
Low      0
```

Material open findings: **none**.

Review limitation: the retained formal pair bytes were not safely available at a supplied location, as disclosed in section 3. That limitation is explicitly permitted by the assignment, does not create a false evidence claim, and does not justify accessing prohibited retired/dependency/Build state or building replacement proof machinery.

## 8. Review decision

`REVIEW_POLICY`: **PASS**.

The exact C2 Candidate is implementation/security acceptable as a docs/evidence record under the accepted exact-S2.5 Route C governance. It has zero Blocker, High, Medium, or Low findings; preserves the immutable formal failure; records the one-shot Gate facts without promotion; retains aggregate absence and all five residuals; respects the compensating-evidence ceiling; and adds no executable or Product mechanism.

`FULL_REVIEW_NECESSITY`: **NOT_REQUIRED**.

The reviewed mutation is complete and correct within exactly two docs/evidence paths. No Product, executable, Schema/Migration, security-boundary, SEO/URL/Redirect, publishing, storage, credential, or Provider scope changed, so a full Product review would be disproportionate unless scope expands.

## 9. Next gate and non-authorization

The next gate is **Coordinator consideration of explicit C2 acceptance** for Candidate `573f0b75013e8fb55ce10ecf5bd54ecc3934beef` together with this independent R2 PASS report.

This review does not itself accept C2, does not claim Coordinator or Owner acceptance, does not constitute Phase D acceptance, and authorizes no Push, Deploy, aggregate, Gate rerun, Provider validation, Phase E, or Phase F action.
