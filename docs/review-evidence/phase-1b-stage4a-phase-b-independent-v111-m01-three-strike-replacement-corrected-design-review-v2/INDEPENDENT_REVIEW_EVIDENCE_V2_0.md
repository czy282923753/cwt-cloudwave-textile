# CWT Stage 4A Phase B — V111-M01 Replacement Corrected Design V2.0 Independent Review Evidence

Status: **FRESH REVIEW COMPLETE / CANDIDATE READ-ONLY / ONE SAME-ROOT FINDING REPRODUCED**

Date: `2026-08-11` (`Asia/Shanghai`)

## 1. Isolation and process

- Formal Candidate: `/Users/calvin/.codex/worktrees/c883/CWT（CloudWave Textile）项目`, clean and attached to the exact full Candidate ref.
- Independent snapshot: `/tmp/cwt-v111-m01-v2-review.yzbv1m`, clean and detached at exact `4b626fc9278f4c49957ecf165d7d5c5fc4058dca`.
- Reviewer package: `/Users/calvin/.codex/worktrees/2a07/CWT（CloudWave Textile）项目/docs/review-evidence/phase-1b-stage4a-phase-b-independent-v111-m01-three-strike-replacement-corrected-design-review-v2/`.
- Runtime: `/Users/calvin/.nvm/versions/node/v24.14.0/bin/node`, `darwin arm64`.
- Package-manager, install, materialization, registry, network, Provider, credential and external-environment actions: zero.
- Temporary ignored files and the disposable local clone used by the challenge were removed. The exact Candidate snapshots finished clean.

## 2. Identity and byte evidence

The exact ref, HEAD `4b626fc...`, parent `3aaad46...`, tree `8e4d3b...`, one-path checkpoint record, checkpoint target `c103682...`, frozen tag object/peel and formal attachment all matched. The content commit contains exactly 13 added `docs/` or `docs/review-evidence/` paths and 1,916 insertions. It changes no source, configuration, test fixture, Schema, Migration, ADR, package or lock file. V1.12, V1.13 and V1.14 are non-ancestors.

All supplied artifact hashes matched. The single Candidate manifest passed `12/12`; the accepted Max analysis manifest passed `12/12`. The canonical root independently recomputed to:

- file SHA-256 `43bfab75b2cf79adabd68d46272ec0ece732440af5bedfab84a8716ae06fafb7`;
- subject JCS SHA-256 `889caa5dd9894a594f0d2fd276f516cefebfbf0e8a15d94a2a27efd9fe1442a5`;
- authority JCS SHA-256 `e31ee8c3c63d3e8cc4a8a2895f5692d3cff26149efe7869dca90cc4db3ef53a9`.

The Reviewer-created post-commit envelope JCS SHA-256 is `76ea4cec640ca30d58bcf9de43315e1cbddbe292ac2da5ddba1ccfbc342902e0`.

## 3. Positive verification

- Fresh package-only mode passed `10 positive / 42 negative / 10 properties` and emitted `acceptanceEligible=false`.
- Full-review mode passed in the exact attached Candidate and exact detached snapshot with the same authority/envelope/Git facts; only the attachment diagnostic differed.
- Sixteen envelope leaves were independently mutated: fourteen rejected, and the two descriptive provenance-string mutations changed the normalized evidence through the envelope JCS hash.
- Wrong/moved ref, wrong symbolic attachment, visible untracked dirty state, duplicate decoded envelope member and rendered-Markdown byte mutation rejected.
- Markdown has no parser/dataflow into role enumeration; no CommonMark package or handwritten compatibility parser is present. Removed V1.12–V1.14 subject/identity/bundle/committed-envelope/second-seal mechanisms are absent from current executable authority.
- The embedded accepted V1.10, M02, M03 and M04 values were compared to their Git-object sources. M02 and M04 value equality passed even though the failed source commits are not ancestors.
- `ai_model_config` is ordered `21/21` and `ai_runs` is ordered `96/96` against accepted `0020` SQL. Provider-neutral, Draft-only, no-fallback/no-RAG/no-vision/no-customer-support/private-data, empty Production Provider/Prompt and phase boundaries did not regress.

## 4. Decisive Fresh reproduction

The exact verifier's `loadAuthority` path checks only that the realpath is inside the repository and that its text has canonical path syntax. Unlike current roles and checkpoints, it does not require the loaded authority file to be tracked, case-exact, manifest-listed at that exact path, or physically included in the role-injectivity set.

In the clean detached snapshot, the Reviewer created temporary files under ignored `.next/reviewer-v111-m01-v2/` and regenerated only the external envelope as appropriate:

1. an exact copied root was accepted with exit `0` while `git status --porcelain=v1 --untracked-files=all` was empty;
2. a hard-link alias of the committed root was accepted with exit `0`; and
3. an untracked root whose V1.12 historical commit was changed to forty zeroes, then correctly JCS-resealed and envelope-rebound, was accepted with exit `0` and `acceptanceEligible=true`.

The Candidate manifest continued to validate the original committed root in every run. The loaded alternate root was never joined to that manifest entry. This demonstrates a coordinated `--authority` plus envelope-path mutation outside the author's single-leaf fixture: the verifier accepts a root that the reviewed Candidate commit does not contain.

The exact reproduction and cleanup logic is in `REVIEWER_FRESH_AUTHORITY_CHALLENGE_V2_0.mjs`; its normalized disposition is in `REVIEWER_FRESH_AUTHORITY_CHALLENGE_OUTPUT_V2_0.json`.

## 5. Process exception

The first local-clone negative probe used a non-canonical temporary path, so the Candidate verifier's `invokedAsMain` guard produced an empty successful process rather than executing. The Reviewer corrected only the Reviewer-owned probe by canonicalizing the clone path and reran it. The final captured moved-ref and wrong-attachment results are genuine exit `1`. This did not modify Candidate bytes and is not used as a Candidate finding.

## 6. Evidence ruling

The exact package is internally consistent for its intended canonical root, but the machine boundary does not enforce that the consumed root is that committed root. The same `V111-M01.one-fail-closed-executable-authority` root therefore remains open. The ordinary attempt loop remains frozen; this review neither creates nor authorizes Attempt 4.

