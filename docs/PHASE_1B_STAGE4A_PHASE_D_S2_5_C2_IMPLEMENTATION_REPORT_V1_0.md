# CWT Phase 1B Stage 4A Phase D exact S2.5 Route C C2 Implementation Report V1.0

Status: **C2 CANDIDATE RECORDED FOR EXACT S2.5 UNDER ACCEPTED ROUTE C / PENDING FRESH INDEPENDENT R2 REVIEW / NOT AGGREGATE PASS / NOT FORMAL PASS / NOT PHASE D ACCEPTANCE**

Record date: `2026-08-17` (`Asia/Shanghai`)

Record version: `1.0`

## 1. Purpose and authority boundary

This docs/evidence-only C2 Candidate records the already-existing evidence for exact S2.5 under the Coordinator-accepted Route C governance Candidate. It creates no aggregate, reruns no Gate, and makes no Phase D acceptance claim.

The C2 Candidate is a sole/direct child of exact S2.5. The accepted governance Candidate, its review, and the Technical Escalation remain references from separate non-Product lineages and are not included in Product ancestry.

This record is not:

- aggregate PASS or a canonical aggregate pair;
- formal PASS or a relabeling of the immutable formal result;
- Phase D acceptance or acceptance authority;
- external validation or real Provider evidence; or
- authority for Push, Deploy, Phase E, or Phase F.

## 2. Exact Product identity

```text
commit                    d7655385e37330927c53e60fbb108b56950c9794
tree                      db18f7fdb545d91ad37280af6cc6822b78d6cfd6
sole parent               ee13e743158e245f520a8d7ec68aa1854179fdc3
diff mode                 --no-renames
path count                23
sorted-path SHA-256       10bd74a890f4c01ddfd5a03934e1c7f394bd5a8cf1365608aa298ac22b4345f5
```

## 3. Immutable formal evidence

The retained formal directory was available separately to the recorder. No private absolute path is retained in this report or its manifest. The two immutable artifacts are bound only by filename, size, and SHA-256:

```text
PHASE_D_SIMPLIFIED_FORMAL_VALIDATION_RESULT_V1_0.json
bytes                     4801
SHA-256                   24c035d43a23884b87c8cb99a1252959a82da21b734ad9d40ca086a32deb9459

PHASE_D_SIMPLIFIED_FORMAL_VALIDATION_RUN_MANIFEST_V1_0.json
bytes                     737
SHA-256                   337155e009c54ee4427e5070b8ff92e8068b8f2ec20ea08a03a9d5d7eb828b30

Runner SHA-256            c647187555834efa78fb81ef0e23d5538948818267de7745d158f7a8def4d7e8
static-manifest SHA-256   5c33c416c73db652f8f751ade9d90077edccee4db87cfb79801a5b10fb23fb4c
```

The immutable formal result remains exactly:

```text
classification            FAILED
firstFailure.stage        AGGREGATE
firstFailure.code         AGGREGATE_FAILED
aggregateOutputs          null
```

The formal result is not promoted or relabeled by this record.

## 4. Immutable ordered Gate facts

The following facts were read from the immutable formal result. No Gate was executed, reproduced, revalidated, or promoted while recording C2.

| Order | Gate name | invocationCount | Status |
|---:|---|---:|---|
| 1 | `check:ai-phase-d-synthetic` | 1 | `PASS` |
| 2 | `check:ai-prompts` | 1 | `PASS` |
| 3 | `check:ai-architecture` | 1 | `PASS` |
| 4 | `typecheck` | 1 | `PASS` |
| 5 | `lint` | 1 | `PASS` |
| 6 | `test:ai-foundation` | 1 | `PASS` |
| 7 | `test:run` | 1 | `PASS` |
| 8 | `build` | 1 | `PASS` |
| 9 | `check:bundle` | 1 | `PASS` |
| 10 | `exact-s2-integrity` | 1 | `PASS` |

These ten ordered one-shot Gate facts do not make the overall formal result PASS.

## 5. Accepted Route C governance binding

The Coordinator accepted the following Route C governance Candidate after its independent PASS review:

```text
governance Candidate      ee402e19e1d78af0745474b33dc71ae195a082dc
Candidate parent          2604b460e4025190c302bfeebd62a74be710baa8
governance review PASS    a2992e531b29d8b746c54f0fc5bd9c42e92409e7
review severity           Blocker/High/Medium/Low = 0/0/0/1
FULL_REVIEW_NECESSITY     NOT_REQUIRED
```

The exact governance paths at Candidate `ee402e19e1d78af0745474b33dc71ae195a082dc` are:

- `docs/PHASE_1B_STAGE4A_PHASE_D_POST_GATE_AGGREGATE_RESIDUAL_RISK_OWNER_DECISION_V1_0.md`;
- `docs/adr/ADR-0020-phase-d-synthetic-only-bounded-convergence.md`; and
- `docs/PHASE_1B_STAGE4A_PHASE_D_SIMPLIFIED_FORMAL_VALIDATION_RUNNER_AUTHORITY_AMENDMENT_V1_0.md`, including terminal authority I1.2.9.5.

The review is `docs/PHASE_1B_STAGE4A_PHASE_D_ROUTE_C_RESIDUAL_RISK_GOVERNANCE_REVIEW_V1_0.md` at commit `a2992e531b29d8b746c54f0fc5bd9c42e92409e7`.

The Technical Escalation reference is commit `9a89cb13c98344ac3e44a4ecd694966972a99dd1`, path `docs/PHASE_1B_STAGE4A_PHASE_D_POST_GATE_AGGREGATE_INPUT_SCOPE_TECHNICAL_ESCALATION_V1_0.md`.

## 6. Aggregate disposition and five residual obligations

```text
aggregatePairPresent      false
aggregateDisposition      OWNER_ACCEPTED_RESIDUAL_NOT_PROVED
```

No canonical aggregate pair exists. The following five obligations remain explicitly unproved and Owner-accepted as bounded residual risk for exact S2.5 only:

1. compiled server output contains all three aggregate server markers;
2. compiled server output contains the raw synthetic Prompt marker;
3. every physical `.next/static/chunks/**/*.js`, including orphan chunks not selected by Build/public manifests, lacks all three aggregate server markers and the raw synthetic Prompt marker;
4. aggregate `serverTreeHash`, `publicTreeHash`, `bundleHash`, and `sourceBundleAgreement`; and
5. the canonical aggregate pair itself.

None of these obligations is recorded as PASS, inferred PASS, a new Gate, or Phase D acceptance.

## 7. Compensating evidence and exact proof ceiling

Compensating evidence is limited to immutable Gates 3, 8, 9, and 10 plus the bounded scan fact below:

- Gate 3 records PASS for the exact S2.5 static architecture/security checker.
- Gate 8 records PASS for the exact formal Build.
- Gate 9 records PASS for exact `check:bundle`. Its coverage is build-manifest root chunks plus manifest-referenced browser chunks, not the entire Build root. It requires nonzero manifest-chunk coverage and checks its governed browser chunks for its forbidden set, including the three aggregate symbolic markers.
- Gate 10 records PASS for exact S2.5 identity/currentness.
- The bounded scan proves only that the first encountered non-regular node was the recorded relative-path symlink outside `.next/static`.

Gate 9 does not cover the raw synthetic Prompt marker, every orphan physical chunk, compiled-server positive marker presence, aggregate hashes, `sourceBundleAgreement`, or the canonical aggregate pair. The bounded scan did not follow or inspect the symlink target and proves no target, producer, content, purpose, containment, aggregate outcome, or complete-tree property.

## 8. Terminal final bounded occurrence

Final occurrence `cwt25-post-gate.nx3xo1` is terminal and non-reusable:

```text
PREPARATION_READY                         1
dependency copy completed                 1/1
Migration STARTED/invocation/complete     1/1/1
Build STARTED/invocation/complete         1/1/1
scan STARTED/invocation/disposition       1/1/FOUND
aggregate STARTED/invocation/complete     0/0/0
durableRetention                          0
cleanup                                   PASS
FINAL_OUTPUT                              absent
```

Its bounded diagnostic is:

```json
{"relativePath":"node_modules/@aws-sdk/client-s3-64df096a7e71b28d","nodeType":"symlink","modeType":"0o120000"}
```

The relative path is under the held `.next` root and outside `.next/static`. No root or symlink target was inspected while recording C2. All associated one-off allowances remain consumed and are not restored by this record.

## 9. External boundary, security, and retained-data limits

```text
externalValidation         NOT_RUN_DEFERRED_TO_PHASE_F
affectedCredential         ROTATION_REQUIRED_BEFORE_ANY_REUSE
```

This evidence record contains no copied raw formal JSON, Build output, scan transcript, dependency or PGlite state, credentials, environment values, private absolute path, fabricated aggregate filename/hash, bundle predicate, server marker count, tree hash, or `bundleHash`.

The authorized executable command/argv/cwd set under exact-S2.5 Route C remains empty. This C2 authoring performed no Build, aggregate, Migration, PGlite, typegen, package script, test, typecheck, lint, Runner, preflight, Gate, or checker execution.

## 10. Mutation scope, complexity, rollback, and next gate

The mutation is exactly two added documentation/evidence paths and changes no Product, checker, package, lock, profile, fixture, Runner, static manifest, governance, Schema/Migration, SEO, URL, Redirect, Publish, or Index byte. It adds no persistent coordination or executable mechanism; architectural complexity is unchanged.

Before C2 acceptance, rollback discards or reverts only this exact two-path C2 commit and returns to exact S2.5. Rollback never restores execution allowances, removes retained formal evidence, or alters any historical fact.

Candidate completion is not acceptance. The next gate is a fresh independent R2 implementation/security review of the exact two-path Candidate. Full Product review is not required unless scope expands.
