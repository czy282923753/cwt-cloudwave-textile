# CWT Stage 4A Phase B — Corrected Exact Design V1.8 Independent Review Evidence

## 1. Evidence identity

- Task: `CWT Stage 4A Phase B｜Corrected Exact Design V1.8 Fresh Independent Review`
- Reviewer role: original independent Corrected Design Reviewer
- Review date: 2026-08-11 Asia/Shanghai
- Candidate ref: `codex/phase-1b-stage4a-phase-b-corrected-design-v1-8`
- Exact Candidate: `a2cd31f53c34dad479862a1c67260ab71fda9805`
- Direct parent: `8eac88210d41b5e37ab5963acc7ee28d007c4fd3`
- Exact start/checkpoint: `b7ad96b24da45de00cae2cdb961a9aefcbc99496`
- Accepted V1.7 ancestor: `3f475e13d73d9d68a4dfb9a040941c57f1ee92e6`
- Formal Candidate worktree: `/Users/calvin/.codex/worktrees/07a1/CWT（CloudWave Textile）项目`
- Detached review snapshot: `/tmp/cwt-v18-design-review.sKxr51/candidate`
- Reviewer worktree: `/Users/calvin/.codex/worktrees/2a07/CWT（CloudWave Textile）项目`

The Candidate was not modified. Reviewer-only evidence was created only in the reviewer worktree. No install, dependency materialization, download, registry, network, Provider, credential, Staging/Production, Deploy, Publish, Index, import, merge, Push, implementation, or Phase C/D/E action occurred.

## 2. Complete review inputs

The reviewer read the complete root `AGENTS.md`, `docs/ENGINEERING_GOVERNANCE.md`, `docs/REVIEW_POLICY.md`, ADR-0018, the Owner M02/M03 selection record, the IMP2-NM01 Owner decision, the pre-design checkpoint, accepted V1.7, the V1.8 standalone design, the derivation/remediation report, the context-domain profile, fixed vectors, fixed-input identities, author verifier and capture, and the imported independent V2.2 FAIL report/evidence/probe/output/manifest.

V1.7 and V1.8 were also compared mechanically as complete files. The V1.8 additions integrate IMP2-NM01, update identity/status/entry/exit text and preserve the remaining standalone contract; the non-IMP2 contract was sampled against its actual repository and schema authorities rather than accepted from the derivation report.

## 3. Identity, history, checkpoint and scope

All fail-fast gates passed:

- local Candidate ref, formal worktree HEAD and detached snapshot all resolve to `a2cd31f...`;
- direct parent is exactly `8eac882...`;
- `b7ad96b...` and accepted V1.7 are ancestors;
- checkpoint ref resolves exactly to `b7ad96b...` and its reflog contains no later movement;
- first checkpoint-record commit `a90d642...` is a direct child of `b7ad96b...` and changes exactly one path, the checkpoint record;
- frozen tag peels to `31c0e405acfdd0d05200d0fb2531e897a541a2c4`;
- formal Candidate and detached review snapshot tracked states were clean;
- `b7ad96b...a2cd31f` contains 15 added paths and 5,341 insertions, all below `docs/` or `docs/review-evidence/`;
- no source, test, fixture, Schema, Migration, snapshot, journal, seed, package, lockfile or ADR path changed in that range;
- start-to-HEAD `diff --check` exited 0;
- no merge, Push or frozen-tag mutation was observed.

The 21-entry Candidate manifest is an artifact/input envelope, not a claim of 21 Git-diff paths. It verified 21/21 and includes immutable V1.7/M02/M03 inputs in addition to the 15 newly added paths.

See `IDENTITY_SCOPE_AND_HASH_CAPTURE_V1_0.txt` for the compact identity and fixed-hash capture.

## 4. Fixed artifact and immutable-history verification

All task-provided hashes recomputed exactly, including:

- checkpoint record `07e6c7a6...`;
- Owner decision `277b0f8a...`;
- V1.8 design `4fc11c42...`;
- derivation report `bb623d36...`;
- context-domain profile `16084d40...`;
- vectors `435f8f6f...`;
- author verifier `22f304c5...`;
- author capture `8cac7702...`;
- Candidate manifest `ca51146d...`.

The imported V2.2 FAIL report/evidence/patch/output/manifest recomputed to the five exact supplied hashes; its manifest verified 4/4. The Candidate 21-entry manifest verified 21/21.

## 5. Offline author-verifier reproduction

Runtime used:

`/Users/calvin/.nvm/versions/node/v24.14.0/bin/node`

with the already-installed local TS loader:

`/Users/calvin/.codex/worktrees/07a1/CWT（CloudWave Textile）项目/node_modules/tsx/dist/loader.mjs`

Exact runtime tuple:

`Node 24.14.0 / V8 13.6.233.17-node.41 / ICU 78.2 / Unicode 17.0 / CLDR 48.0 / darwin arm64`

The verifier was executed twice to completion with exit 0. Both outputs are byte-identical to one another. A third fresh execution piped directly to SHA-256 produced `8cac7702a0332cb3fbb0d97c88228caabe38eb4eda738ae0904c24157f4aa27d`, exactly the fixed capture hash.

This establishes deterministic execution, not correctness of every assertion. Fresh source and semantic inspection found that the displayed `TRAVERSAL_AND_AUTHORITY_MUTATIONS=10/10_DETECTED` is false for its domain-demotion member. The verifier also orders coverage before strict shape and implements only shallow primitive-array/one-level-object evidence values rather than the normative recursive subtree. These are proof-model defects under Finding V18-M03.

## 6. Independent field-domain challenge

`REVIEWER_FIELD_DOMAIN_CHALLENGE_V1_0.mjs` uses Node built-ins for traversal, RFC-8785-compatible canonicalization of the accepted fixed domain and SHA-256. It imports only the repository's selected M02 classifier so that protected-surface challenges use the exact selected authority. It does not import or call the author verifier.

Fresh results:

- exact profile SHA and all 35 assignments verified;
- four use cases materialized 165 nodes, including nested arrays/objects and keys containing `/`, `*` and `**`; missing and ambiguous sets were empty;
- removing each of 35 assignments produced an unclassified witness; duplicating each produced an ambiguous witness;
- unknown future field and overlapping assignment failed;
- deterministic Revision corpus independently recomputed 1,000/1,000 lowercase SHA-256 values; 594 contained a decimal run of length at least seven; snapshot lexical-classifier invocations were zero;
- Reviewer first hash `b574a4fc...` matched only the exact accepted snapshot/persisted tuple;
- nine integrity tamper cases and arbitrary text in all five association fields rejected;
- seven fresh protected payload classes rejected through nested key/value surfaces;
- all four Prompt projections excluded association paths;
- closed error-code and claimed-order contradictions were reproduced directly from the standalone design/profile;
- the author domain-demotion case was independently shown to leave coverage exact while removing the protected scan from `guideIntent`; the author code calls `validateContext` normally and increments the detection counter rather than expecting rejection.

The exact output is in `REVIEWER_FIELD_DOMAIN_CHALLENGE_OUTPUT_V1_0.txt`.

## 7. Schema and non-regression evidence

The existing accepted AI foundation verifier was run directly with the pinned Node and installed TS loader. It exited 0 and reported exact approved design identity, 40 historical artifacts, journal append, exact columns/defaults/nullability/types, constraints, indexes and scope.

Process note: one final manifest check was accidentally invoked from the detached Candidate root while pointing to the reviewer manifest by absolute path. Because manifest entries are intentionally relative to the reviewer repository root, that invocation reported seven files not found. It performed no write. The same manifest was rerun from the reviewer root and verified 7/7; this is a reviewer working-directory mistake, not a Candidate or artifact failure.

Independent inspection confirmed:

- V1.8 §11 mapping remains byte-identical to V1.7;
- `ai_model_config` remains 21/21 and `ai_runs` remains 96/96;
- no Schema/Migration assumption was introduced by V1.8;
- selected M02 registry identity remains `...include-deepseek.v2_1@2.1.0`, SHA `264ca635...`, 32 rules;
- M03 profile remains SHA `1f0b56a8...` and the Owner-selected discriminated seam is not edited;
- Prompt authority, raw JSON/output contracts, four Draft use cases, Provider-neutral core, no fallback/RAG/vision/customer_support/private data, no Production Provider body/adapter, and Phase B/C/D/E boundaries are not broadened by the V1.8 diff;
- H-01, H-02, M-01..M-06, L-01, N-M01..N-M04 and V15-M01 remain non-regressed at the design-text boundary;
- current implementation review state is preserved: IMP2-NH01 closed; IMP2-M01/M02/M04 remain open after attempt 2; this design review does not consume correction attempt 3.

Because this is a docs/profile-only design Candidate, unrelated full application build/test execution would not increase confidence in the three discovered normative/evidence defects. The proportional checks were identity/history, complete-document comparison, profile/Schema verification, pinned-runtime verifier execution, independent corpus/traversal/protected-surface probes and static contract contradiction checks.

## 8. Evidence disposition

- Checkpoint: PASS.
- Owner decision direction: incorporated in the field-domain model, but the exact Candidate is not acceptance-ready because integration and evidence defects remain.
- IMP2-NM01 design: OPEN.
- Candidate implementation eligibility: NO.
- Schema/Migration/ADR/dependency/Complexity/SEO/URL/formal-data impact: none introduced by the Candidate or required to correct the findings.
- Owner decision: no new Owner choice is required; the three findings are docs/evidence exactness corrections within the already selected direction.
