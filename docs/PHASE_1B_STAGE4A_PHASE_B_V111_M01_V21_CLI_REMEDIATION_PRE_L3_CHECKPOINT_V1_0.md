# CWT Stage 4A Phase B — V111-M01 V2.1 Raw CLI Remediation Pre-L3 Checkpoint V1.0

Status: **ESTABLISHED / REPLACEMENT-CYCLE CORRECTION ATTEMPT 2 / NOT DESIGN ACCEPTANCE / NOT IMPLEMENTATION AUTHORITY**

Date: `2026-08-11` (`Asia/Shanghai`)

## 1. Purpose and classification

This record establishes the mandatory local rollback boundary before replacing
the V2.1 raw `--authority` CLI selection boundary. The task is the original
Fresh `gpt-5.6-sol/xhigh` Replacement Design Technician's bounded
replacement-cycle correction attempt 2. It is not ordinary Attempt 4, a
reopening of Max-selected Option A, Product implementation, independent review
or self-approval. The ordinary V1.12/V1.13/V1.14 attempt loop remains frozen.

## 2. Exact checkpoint and source identity

| Field | Exact value |
| --- | --- |
| checkpoint ref | `codex/checkpoint/phase-1b-stage4a-phase-b-v111-m01-v21-cli-remediation-pre-l3-v1` |
| checkpoint target / fixed failed V2.1 commit | `3d424821aab67c03c3b8ec02a62b5577044837c9` |
| target parent | `ac080b1d8b49906154ecbc44d381a84afe972bad` |
| target tree | `2feaecc44874462929c20ed8670de251244f5bd8` |
| fixed failed source ref | `codex/phase-1b-stage4a-phase-b-v111-m01-replacement-design-remediation-v1` |
| remediation branch | `codex/phase-1b-stage4a-phase-b-v111-m01-replacement-design-remediation-v2` |
| versioned record identifier | `PHASE_1B_STAGE4A_PHASE_B_V111_M01_V21_CLI_REMEDIATION_PRE_L3_CHECKPOINT_V1_0` |
| formal worktree | `/Users/calvin/.codex/worktrees/c883/CWT（CloudWave Textile）项目` |
| state before ref creation | clean, attached to the fixed source ref at exact target |
| state after branch creation | clean, attached to the remediation-v2 branch at exact target |

The checkpoint ref was created locally before this first file mutation and was
pinned atomically to exact `3d424821...`. The commit containing this record is
required to be its direct child and to add this one path only. Its Git object
identity is necessarily assigned after the record bytes are committed and is
reported with the record SHA-256 in the task callback; embedding either value
here would create a self-reference cycle.

## 3. Pre-mutation verification

Before the first file mutation:

- source ref, `HEAD`, sole parent and tree matched the exact values above;
- `git status --porcelain=v1 --untracked-files=all` was empty;
- ancestry from V2.0 `4b626fc9278f4c49957ecf165d7d5c5fc4058dca`
  and accepted Max analysis `c103682e63e9a2cb62b6581d7d62773ddcab1a99`
  was present and linear for this replacement cycle;
- the V2.1 Candidate manifest SHA-256 was
  `3b8929467ee741f156cfcdacd4aaa2a91edbd7c5def6f1bf56c4910683bb98a4`
  and passed `13/13`;
- the accepted Max analysis manifest SHA-256 was
  `8ec01bd6b0263e2cd71cb5c765f9ba535fac02ad052be5ced291613232fef7a0`
  and passed `12/12`;
- the imported V2.0 independent FAIL manifest SHA-256 was
  `ac31e83689fec456095ae85f10ec5881e74c22881a1456a24c190bb716ea854a`
  and passed `9/9`; and
- pinned offline Node was `/Users/calvin/.nvm/versions/node/v24.14.0/bin/node`;
  no package manager, network, Provider, API or credential action occurred.

## 4. Controlling Fresh FAIL and exact reproduction

The controlling V2.1 independent Reviewer package was verified byte-identically
in its original worktree. Its manifest SHA-256 is
`7a6ff7781bd43ef7658fa78e5d29c9a19910e6bf1df02132d1b8a9e19e4ebc57`
and passed `10/10`.

| Reviewer artifact | SHA-256 |
| --- | --- |
| controlling report | `3056465d76a89bef97233fc4554ed7f754c316c20413a352aeaf7803430ab357` |
| independent evidence | `fe15e07c7b587aa6c0d5961b5338a827ab7067dfe3c98758f255823c5712c34f` |
| Reviewer envelope | `9bd3cdefe546a4a7d5f8670ea5c639442bc775f1e707e2192c28c51a879104ee` |
| Fresh challenge source | `648f12a00b855abb9d1596dd2eed886a616c50f905986c9819b50575dc193665` |
| Fresh challenge output | `a95b795f3fcac6e1097aa23f411693b730bb65db1632c9603b18c9fcf72320bd` |
| identity/non-regression capture | `b4d968392b527daa0a3ab8d8077999b2b4f0d29c18f5e0bea614e806945aa2fe` |

The real V2.1 CLI entry was independently rerun before mutation. Exact
repo-relative, `./`-prefixed, cancelling-`..`, duplicate-slash and exact
absolute-realpath authority arguments all incorrectly exited `0` and emitted
the same package-only SHA-256
`012fb82abfa3097f543075a061ba7679b507cde9bc2cfc30a6ba6a7f268c594c`.
This reproduces the controlling finding without relying on helper-only tests.

## 5. Finding and bounded replacement

`V2-M01` remains Medium under the same
`V111-M01.one-fail-closed-executable-authority` root after replacement-cycle
attempt 1. V2.1 joins loaded bytes to the exact tracked `HEAD` root, index,
worktree, sole manifest and physical identity set, so the earlier ignored
copy/hard-link/resealed-root defect is closed. The remaining defect is that the
actual CLI performs `path.resolve` and `path.relative` before lexical equality,
erasing forbidden raw spellings while its author matrix tests only a helper.

Attempt 2 may replace only that raw selection boundary and publish a standalone
V2.2 docs/evidence authority. Raw equality with the one V2.2 canonical path
must occur before path/URL/Unicode/filesystem processing. The actual package CLI
must exercise the path matrix as child processes. V2.0 and V2.1 remain immutable
historical FAIL evidence with zero current executable edge; no loader fallback,
normalization compatibility, alias table or second current authority is allowed.

## 6. Checkpoints, frozen tag and rollback map

All existing checkpoint refs were recorded before mutation and must remain
unchanged:

| Ref suffix under `codex/checkpoint/` | Target |
| --- | --- |
| `phase-1b-stage4a-phase-b-implementation-attempt3-pre-l3-v1` | `0793948ad115c19f852a9590387ed9ba06738a39` |
| `phase-1b-stage4a-phase-b-m02-m04-pre-corrected-design-v1` | `521525bf02394ab49727aca9f8ea00bbb91e487b` |
| `phase-1b-stage4a-phase-b-nm01-pre-design-v1` | `b7ad96b24da45de00cae2cdb961a9aefcbc99496` |
| `phase-1b-stage4a-phase-b-v111-m01-pre-corrected-design-v1` | `66bfd0bb8dd5a0f398bd2a70ee5672acc127a100` |
| `phase-1b-stage4a-phase-b-v111-m01-replacement-design-pre-l3-v1` | `c103682e63e9a2cb62b6581d7d62773ddcab1a99` |
| `phase-1b-stage4a-phase-b-v111-m01-three-strike-analysis-pre-l3-v1` | `0793948ad115c19f852a9590387ed9ba06738a39` |
| `phase-1b-stage4a-phase-b-v111-m01-v2-m01-remediation-pre-l3-v1` | `4b626fc9278f4c49957ecf165d7d5c5fc4058dca` |
| `phase-1b-stage4a-phase-b-v112-v111-m01-attempt2-pre-design-v1` | `901edf7b8207afb39970e8507c86d53668c27196` |
| `phase-1b-stage4a-phase-b-v113-v111-m01-attempt3-pre-design-v1` | `de6c10d9ffc23fefcb1a5bcfd57b2906d4c2d16d` |

Frozen tag `phase-1b-stage3-approved-2026-08-09` retained tag object
`1c626f9b788e4c6ed0480a7040aa54ccef3e6c76` and peeled commit
`31c0e405acfdd0d05200d0fb2531e897a541a2c4`.

Rollback order is: this checkpoint `3d424821...`; V2-M01 attempt-1 checkpoint
`4b626fc...`; replacement-design pre-L3 `c103682...`; accepted implementation
checkpoint `0793948...`; accepted V1.10 `234cd902...`; full rollback
`3f475e13d73d9d68a4dfb9a040941c57f1ee92e6`; then the frozen Stage 3 tag.
Use a new clean branch/worktree or a disclosed revert, never move checkpoints
and never use destructive history rewrite.

## 7. Scope, prohibitions and next gate

Only `docs/` and `docs/review-evidence/` may change. Prohibited actions include
source, project scripts/tests/config, Schema/Migration/snapshot/journal/seed,
ADR/package/lock/dependency, Prompt/Product/public/SEO/URL/Redirect/data,
Provider/API/credential/network/spend/install/materialization/download/registry,
merge/cherry-pick/amend/rebase/history rewrite/Push/Deploy/Publish/Index,
ordinary Attempt 4, implementation, Phase C/D/E, self-review, self-approval or
starting the independent Reviewer.

The immediate next gate is the byte-identical controlling FAIL import followed
by one atomic standalone V2.2 docs/evidence Candidate. Completion remains
Design-ineligible until the original independent Reviewer performs a Fresh
V2.2 re-review and returns PASS accepted by the coordinator.
