# CWT Stage 4A Phase B — V111-M01 Replacement Corrected Design Pre-L3 Checkpoint V1.0

Status: **ESTABLISHED / IMMUTABLE LOCAL ROLLBACK BOUNDARY / NOT DESIGN ACCEPTANCE / NOT IMPLEMENTATION AUTHORITY**

Date: `2026-08-11` (`Asia/Shanghai`)

## 1. Purpose and classification

This record establishes the mandatory L3 checkpoint before replacing the
`V111-M01.one-fail-closed-executable-authority` Corrected Design boundary. The
task is the fresh `gpt-5.6-sol/xhigh` Corrected Design technician step of the
accepted three-strike protocol. It creates a new Candidate by replacement; it
is not ordinary Attempt 4, Product implementation, independent review or
self-approval.

The checkpoint is a rollback boundary only. It does not authorize merge,
Push, Deploy, Publish, Index, formal import, Product implementation, Phase
C/D/E, or an independent-review verdict.

## 2. Exact checkpoint identity

| Field | Exact value |
| --- | --- |
| checkpoint ref | `codex/checkpoint/phase-1b-stage4a-phase-b-v111-m01-replacement-design-pre-l3-v1` |
| checkpoint target | `c103682e63e9a2cb62b6581d7d62773ddcab1a99` |
| checkpoint target parent | `c19e7163e9a02655461a07dce1ddb1099c6e55a6` |
| checkpoint target tree | `d2f0d2760034e6d5409d40f0dbcae05283b471c3` |
| accepted source branch/ref | `codex/phase-1b-stage4a-phase-b-v111-m01-three-strike-analysis-v1` |
| Candidate branch | `codex/phase-1b-stage4a-phase-b-v111-m01-three-strike-replacement-design-v1` |
| worktree | `/Users/calvin/.codex/worktrees/c883/CWT（CloudWave Textile）项目` |
| pre-mutation HEAD state | clean detached exact checkpoint target |
| post-ref branch state | clean and attached to the exact Candidate branch at the checkpoint target |

The checkpoint ref was created locally before the first file mutation and was
pinned directly to `c103682...`. It must not move and must not be pushed without
explicit approval.

## 3. Clean state, ancestry and protected baseline verification

Before the first file mutation, all checks passed:

- `git status --porcelain=v1 --untracked-files=all` was empty;
- the source ref resolved exactly to `c103682...`;
- `HEAD^` was exactly `c19e716...` and `HEAD^{tree}` was exactly `d2f0d276...`;
- underlying accepted implementation checkpoint `0793948ad115c19f852a9590387ed9ba06738a39` was an ancestor;
- accepted V1.10 `234cd90211c45c6cc86c988d02c8d5dc2f7858d2` was an ancestor;
- failed V1.12 `901edf7b...`, V1.13 `de6c10d...` and V1.14 `aac9169c...` Candidates were not ancestors;
- analysis pre-L3 checkpoint ref `codex/checkpoint/phase-1b-stage4a-phase-b-v111-m01-three-strike-analysis-pre-l3-v1` still resolved to exact `0793948...`;
- frozen tag `phase-1b-stage3-approved-2026-08-09` retained object `1c626f9b788e4c6ed0480a7040aa54ccef3e6c76` and peeled commit `31c0e405acfdd0d05200d0fb2531e897a541a2c4`; and
- no merge, cherry-pick or failed-Candidate authority mechanism entered the ancestry.

## 4. Controlling analysis identity

The accepted Max analysis package was verified with pinned local Node
`24.14.0` in its authoritative clean attached worktree. Its verifier reported
`ok=true`, exact matrix counts `10 positive / 42 negative / 10 properties`,
and its single manifest passed `12/12`.

| Controlling input | SHA-256 |
| --- | --- |
| root-cause analysis V1.0 | `ef0ca1952b2e218ad3e905132c928e6c58a81c053163b7d955e52d41998b5122` |
| exact replacement plan V1.0 | `32e4b54f1cd6aeb1d16a9ae779067368e880c43c84353da3b71d4956a65393c7` |
| analysis manifest (`12/12 PASS`) | `8ec01bd6b0263e2cd71cb5c765f9ba535fac02ad052be5ced291613232fef7a0` |
| minimal reproduction capture | `9ae5ad930221858d7f832b9c856cbc0215560b56d23176f374ae28f9bf9cd75c` |
| analysis package verifier capture | `6fe79f0a6192a975e489ad5dc80decaee531360eb54d8d135807618f7802ba99` |

Selected and authorized design option:
`A-SEALED-STRUCTURED-ROOT-PLUS-EXTERNAL-CONSUMED-REVIEW-ENVELOPE`.
No CommonMark AST lint, dependency, ADR or Owner architecture decision is
selected or required.

## 5. Scope and prohibited actions

Allowed Candidate mutations are limited to `docs/` and
`docs/review-evidence/`.

Prohibited actions include:

- mutation of `src/`, project `scripts/`, test fixtures or configuration;
- Schema, Migration, snapshot, journal, seed, ADR, package or lock changes;
- Prompt runtime/body, Product, public, SEO, URL or Redirect changes;
- Provider, API, credential, network, spend, install, materialization,
  download or registry actions;
- importing, copying, merging or cherry-picking failed V1.12/V1.13/V1.14
  current-authority mechanisms;
- a second manifest, a Candidate-committed review envelope, compatibility
  layering or a Markdown-to-authority parser;
- Push, Deploy, Publish, Index, formal import, Product implementation,
  ordinary Attempt 4 or Phase C/D/E; and
- creating or starting the independent review or any later implementation
  task.

## 6. Rollback and next gate

Rollback map:

1. pre-L3 Corrected Design rollback: create a clean worktree/branch from
   `codex/checkpoint/phase-1b-stage4a-phase-b-v111-m01-replacement-design-pre-l3-v1`
   at `c103682...`;
2. underlying accepted implementation checkpoint: `0793948...`;
3. accepted V1.10: `234cd902...`;
4. full implementation rollback: `3f475e13d73d9d68a4dfb9a040941c57f1ee92e6`; and
5. frozen Stage 3 baseline: tag object/peel `1c626f9b...` / `31c0e405...`.

Prefer abandoning this isolated Candidate branch or reverting its later atomic
docs/evidence commit; do not move the checkpoint or frozen tag and do not use a
destructive reset.

The next authorized gate is one atomic standalone Corrected Exact Design
Candidate commit with the selected replacement authority, followed by an
external disposable full-review-envelope verification. The Candidate remains
Design-ineligible until a separate Fresh independent Reviewer returns exact
`PASS` and the coordinator accepts that gate.
