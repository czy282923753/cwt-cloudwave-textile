# CWT Stage 4A Phase B — IMP2-NM01 Pre-Design Checkpoint V1.0

Status: **RECORDED / IMMUTABLE LOCAL CHECKPOINT**

Recorded: 2026-08-11 (Asia/Shanghai)

Scope: architecture/security boundary clarification before Corrected Exact Design V1.8; no implementation authority

## 1. Trigger and Owner authority

Fresh Independent Implementation Re-review V2.2 found that the V1.7 whole-context scalar traversal sends application-generated `association.snapshotHash` through the natural-language protected-data classifier. In a deterministic set of 1,000 valid Revision snapshot hashes, 590 valid lowercase SHA-256 hex strings collided with `value.personal-phone.structured.v2`. This is IMP2-NM01, a genuinely new proof-boundary root; it is not another correction attempt for IMP2-M01, IMP2-M02, or IMP2-M04.

The Owner explicitly approved this pre-design direction:

- keep the selected M02 32-rule registry byte-identical and single-authority;
- continue scanning all human-entered, business-source, and Provider-bound text;
- validate application-generated association metadata, including `snapshotHash`, through exact structural and integrity rules instead of natural-language classification;
- recompute and match `snapshotHash` as exactly 64 lowercase hexadecimal characters, while keeping association type, version, and alias strict;
- create no second scanner or consumer-local exception list;
- keep persisted context bytes, JCS, `input_hash`, Schema/Migration, and Provider-neutral architecture unchanged; and
- require a Corrected Exact Design and Fresh Independent Design PASS before implementation.

This approval authorizes only the V1.8 design package. It does not authorize implementation, correction attempt 3, merge, Push, Provider activity, or any Phase C/D/E work.

## 2. Exact identities

| Identity | Fixed value |
|---|---|
| start / rollback commit | `b7ad96b24da45de00cae2cdb961a9aefcbc99496` |
| direct parent | `846888a409b2b62869ff7ff8fca36b88b70d0bf9` |
| source ref | `codex/phase-1b-stage4a-phase-b-foundation-implementation-v2-remediation-v2` |
| implementation code HEAD | `111301aea82569768661c6401b16054161ed19ff` |
| accepted V1.7 / full rollback ancestor | `3f475e13d73d9d68a4dfb9a040941c57f1ee92e6` |
| immutable local checkpoint ref | `codex/checkpoint/phase-1b-stage4a-phase-b-nm01-pre-design-v1` |
| checkpoint ref target | `b7ad96b24da45de00cae2cdb961a9aefcbc99496` |
| design branch | `codex/phase-1b-stage4a-phase-b-corrected-design-v1-8` |
| formal worktree | `/Users/calvin/.codex/worktrees/07a1/CWT（CloudWave Textile）项目` |
| frozen tag | `phase-1b-stage3-approved-2026-08-09` |
| frozen tag peeled commit | `31c0e405acfdd0d05200d0fb2531e897a541a2c4` |

The source ref resolved exactly to the start commit; `HEAD^` resolved exactly to the stated parent; both the accepted V1.7 commit and code HEAD are ancestors of the start commit. The formal worktree had zero tracked, untracked, ignored-in-scope, or staged changes before checkpoint creation. Both the checkpoint ref and design branch were absent before their atomic creation. No Tag was created or moved.

## 3. Fixed review authority

The following V2.2 Fresh Independent FAIL artifacts were read only and recomputed before this record:

| Artifact | SHA-256 |
|---|---|
| independent report | `54a52f15b93de13bef6c9e0b692bf22c755ac592f0794914cebe643ad327b73a` |
| independent evidence | `106e547aae4576ece7bc8dd12cc3c330b275e7541c34792dff4917eb39579d79` |
| Fresh challenge patch | `d3c66f50289a01e5d0d371a4f8845702c446ef28007b2d60fa6d0e0bd1068fd6` |
| Fresh verification output | `5ab2ff49aa5ed817606c7d2c8e839f3efd1d8e3adcd1ffde7b45f04a4b8669fe` |
| reviewer manifest | `a2bcea3136dade24690a0db49d3dd49dbe2a7ba655d17d03cf3f6b4b2a6fbf93` (`4/4 PASS`) |

Reviewer source worktree: `/Users/calvin/.codex/worktrees/2a07/CWT（CloudWave Textile）项目`. Its artifacts remain unmodified.

## 4. Fixed accepted V1.7 authority

| Artifact | SHA-256 |
|---|---|
| Corrected Exact Design V1.7 | `e432fbd96029c423e5f206cbd17c5abfc48518ce4254b36095a26537afd2c834` |
| V1.7 remediation audit | `a89c8ee2f42d1a1133bba00c13363a804140b65860dbebddf64f5bef979ea2d1` |
| M03 graph/database seam profile V2.2 | `1f0b56a870ecbab61c970e1c7000dff591674e0f8ad0a04341538c724a36c173` |
| V1.7 verifier | `d4043c6d39459d2d431afd129e5cad6ea7b2df7cfe09bfc1f15db3cd1001de63` |
| V1.7 evidence manifest | `f10a9eacfc40d8aa3be8cd0c495736d47de957f99cd999280409b3c09de2f1e0` (`31/31 PASS`) |

V1.7 and its evidence remain byte-identical. V1.8 may replace only the IMP2-NM01 context-domain proof boundary and must preserve all other V1.7 clauses and Owner-selected M02/M03 contracts.

## 5. Rollback and prohibited actions

The rollback point for all V1.8 documentation and proof work is the immutable checkpoint target `b7ad96b24da45de00cae2cdb961a9aefcbc99496`. The checkpoint ref must be reverified before and after design work and must never move.

This task prohibits changes to product source, test fixtures, Schema, Migration, snapshots, journals, seeds, packages, lockfiles, Prompt runtime, Provider integrations, and business pages. It also prohibits installation/download/network use, credentials, Provider calls, Staging/Production activity, Deploy, Publish, Index, import, merge, Push, self-approval, implementation, and the remaining ordinary correction attempts.

## 6. Required next gate

After a complete, mechanically verifiable V1.8 Candidate is committed and the worktree is clean, only the original independent Design Reviewer may perform a Fresh Independent Corrected Design V1.8 Review of that exact commit. Implementation remains unauthorized until that review returns PASS and the governing coordinator explicitly opens a later implementation task.
