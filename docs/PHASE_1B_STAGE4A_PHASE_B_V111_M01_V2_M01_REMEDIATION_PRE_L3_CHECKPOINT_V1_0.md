# CWT Stage 4A Phase B — V111-M01 V2-M01 Remediation Pre-L3 Checkpoint V1.0

Status: **ESTABLISHED / REPLACEMENT-CYCLE CORRECTION ATTEMPT 1 / NOT DESIGN ACCEPTANCE / NOT IMPLEMENTATION AUTHORITY**

Date: `2026-08-11` (`Asia/Shanghai`)

## 1. Purpose and classification

This record establishes the mandatory local rollback boundary before correcting
the independently reproduced `V2-M01` gap in the V111-M01 replacement
authority. The task is the original Fresh `gpt-5.6-sol/xhigh` Replacement
Design Technician's bounded replacement-cycle correction attempt 1. It is not
ordinary Attempt 4, a reopening of the Max-selected Option A, Product
implementation, independent review or self-approval.

The ordinary V1.12/V1.13/V1.14 attempt loop remains frozen. This checkpoint is
a rollback boundary only and authorizes mutations under `docs/` and
`docs/review-evidence/` for the exact bounded correction.

## 2. Exact checkpoint identity

| Field | Exact value |
| --- | --- |
| checkpoint ref | `codex/checkpoint/phase-1b-stage4a-phase-b-v111-m01-v2-m01-remediation-pre-l3-v1` |
| checkpoint target | `4b626fc9278f4c49957ecf165d7d5c5fc4058dca` |
| checkpoint target parent | `3aaad46b1627191a18fb82763a9627c1e2292d73` |
| checkpoint target tree | `8e4d3b48cef65a418012438d00e677f4169b684e` |
| fixed failed source ref | `codex/phase-1b-stage4a-phase-b-v111-m01-three-strike-replacement-design-v1` |
| remediation branch | `codex/phase-1b-stage4a-phase-b-v111-m01-replacement-design-remediation-v1` |
| formal worktree | `/Users/calvin/.codex/worktrees/c883/CWT（CloudWave Textile）项目` |
| state before checkpoint-ref creation | clean and attached to the fixed failed source ref at the exact target |
| state after branch creation | clean and attached to the remediation branch at the exact target |

The checkpoint ref was created locally before the first file mutation and was
pinned directly to `4b626fc...`. It must not move and must not be pushed
without explicit approval.

## 3. Pre-mutation verification

Before the first file mutation, all mandatory checks passed:

- the failed Candidate ref and `HEAD` were exactly `4b626fc...`, with exact
  parent `3aaad46...` and tree `8e4d3b...`;
- `git status --porcelain=v1 --untracked-files=all` was empty;
- the failed Candidate manifest SHA-256 was
  `9732442a4d20330e34ccb09762b9bf2d78337295dc489583cae3e9058167c508`
  and passed `12/12`;
- the failed Candidate package verifier ran with pinned Node `24.14.0`,
  reported `10 positive / 42 negative / 10 properties`, and emitted
  `acceptanceEligible=false`;
- the accepted Max analysis ref was exactly `c103682...`, parent
  `c19e716...`, tree `d2f0d276...`; its manifest SHA-256 was
  `8ec01bd6b0263e2cd71cb5c765f9ba535fac02ad052be5ced291613232fef7a0`
  and passed `12/12`;
- the prior replacement-design checkpoint ref
  `codex/checkpoint/phase-1b-stage4a-phase-b-v111-m01-replacement-design-pre-l3-v1`
  remained pinned to exact `c103682...`;
- the frozen tag `phase-1b-stage3-approved-2026-08-09` retained object
  `1c626f9b788e4c6ed0480a7040aa54ccef3e6c76` and peeled commit
  `31c0e405acfdd0d05200d0fb2531e897a541a2c4`;
- accepted implementation checkpoint `0793948...`, accepted V1.10
  `234cd902...` and full rollback `3f475e13...` retained their recorded
  ancestry; and
- no merge, cherry-pick, failed-attempt authority mechanism or Product/source
  mutation entered the ancestry.

## 4. Fixed independent FAIL package

The controlling independent Reviewer package was verified byte-identically in
the Reviewer worktree. Its single manifest SHA-256 is
`ac31e83689fec456095ae85f10ec5881e74c22881a1456a24c190bb716ea854a`
and passed `9/9`.

| Reviewer artifact | SHA-256 |
| --- | --- |
| controlling report | `6962e45985f17cccbd978d2069c7adf9b64163da3b7b9d3f05b56cd36b0c0205` |
| independent evidence | `81dbb046264184eb23d399b921494e26c63c75bd2c7c95042eb6d7b1025c163d` |
| Reviewer envelope file | `923b2113efaf391c33b83bd8fa95e533c4afcda958f9b0cdac229cd542f8d063` |
| Reviewer envelope JCS | `76ea4cec640ca30d58bcf9de43315e1cbddbe292ac2da5ddba1ccfbc342902e0` |
| Fresh challenge source | `b6523b448f09d8b3c847efe32b67efc34da6feee38ecad2bd8bab72cda00e089` |
| Fresh challenge output | `cbb8e2422074cae96c2bf16729aa66bdc6ad3cd320321f0fc62a9db101dd3143` |
| attached capture | `54d095560510cdc72b9fa378239595ac0f14be06316849565e890fdc5b5fb9f2` |
| detached capture | `25c5275c5d74a097ede70c7ee297bc06b47091499ed0b0801e055babc5ea74a2` |
| identity/non-regression capture | `0fc0586494bc5cd7d49a2407497aa2ec02600a4d294c11a2ad0375d277e69023` |

The exact Reviewer challenge was rerun before mutation in a disposable
detached exact-HEAD copy with all required local refs. Baseline full-review
passed, while ignored/untracked exact-copy, hard-link and self-consistently
resealed altered-root inputs each incorrectly exited `0`. Porcelain was empty
before the ignored-alias runs. This independently reconfirms the controlling
FAIL rather than relying only on the written report.

## 5. Finding state and authorized replacement

`V2-M01` is Medium and remains the same
`V111-M01.one-fail-closed-executable-authority` root. The deficient V2.0
`loadAuthority` boundary does not join the consumed file to the one exact
tracked Candidate-HEAD root and its sole manifest entry, and it omits the
loaded root from physical-identity injectivity.

The authorized correction is limited to replacing that boundary with one V2.1
canonical root/verifier contract that enforces, before semantic consumption:

1. one fixed, exact repo-relative authority path shared by CLI and envelope;
2. exact case-sensitive `HEAD` tree membership as mode `100644`, with
   index and worktree bytes equal to the exact `HEAD` blob;
3. an exact sole-manifest-entry join to the same path and SHA-256; and
4. the actually loaded root in the same realpath/device/inode injectivity set
   as current roles, checkpoints and proof artifacts.

V2.0 remains immutable failed evidence with zero current executable edge.
There is no V2.0 loader fallback, alternate path table, compatibility alias,
second semantic authority or Candidate-committed Reviewer envelope.

## 6. Scope and prohibited actions

Allowed mutations are only `docs/` and `docs/review-evidence/`.

Prohibited actions include:

- mutation of `src/`, project `scripts/`, test fixtures or configuration;
- Schema, Migration, snapshot, journal, seed, ADR, package or lock changes;
- Prompt runtime/body, Product, public, SEO, URL, Redirect or data changes;
- Provider, API, credential, network, spend, install, materialization,
  download or registry actions;
- merge, cherry-pick, amend, rebase, history rewrite, Push, Deploy, Publish,
  Index or formal import;
- compatibility layering, a fallback to V2.0, a second current root, a second
  seal manifest, a Candidate-committed review envelope or Markdown authority;
- Product implementation, ordinary Attempt 4 or Phase C/D/E; and
- self-review, self-approval or creating/starting the next Reviewer task.

## 7. Rollback and next gate

Rollback map:

1. V2-M01 remediation pre-L3: create a clean worktree/branch from
   `codex/checkpoint/phase-1b-stage4a-phase-b-v111-m01-v2-m01-remediation-pre-l3-v1`
   at `4b626fc...`;
2. V2.0 replacement-design pre-L3: `c103682...`;
3. accepted implementation checkpoint: `0793948...`;
4. accepted V1.10: `234cd902...`;
5. full implementation rollback: `3f475e13d73d9d68a4dfb9a040941c57f1ee92e6`; and
6. frozen Stage 3 baseline: tag object/peel `1c626f9b...` /
   `31c0e405...`.

Prefer abandoning the isolated remediation branch or reverting its later
docs/evidence commits. Do not move either checkpoint or the frozen tag and do
not use a destructive reset.

The next gate is a byte-identical import of the controlling Reviewer FAIL
package, then one standalone atomic V2.1 docs/evidence Candidate replacing the
deficient authority boundary. Completion remains Design-ineligible until a
separate Fresh independent Reviewer returns exact `PASS` and the coordinator
accepts that review. No implementation authority is created.
