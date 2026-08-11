# CWT Stage 4A Phase B — V111-M01 V2.2 Design Gate Acceptance V1.0

Status: **ACCEPTED / DESIGN GATE COMPLETE FOR EXACT V2.2 / IMPLEMENTATION ELIGIBLE BUT NOT AUTHORIZED**

Date: `2026-08-11` (`Asia/Shanghai`)

## 1. Acceptance decision

The Coordinator accepts the Phase B V111-M01 Replacement Corrected Exact Design Gate for the exact V2.2 Candidate only. This record finalizes the docs/evidence Design Gate after a Fresh independent PASS; it is not a self-review and does not extend acceptance to any other commit, tree, branch state or future implementation.

| Accepted identity | Exact value |
| --- | --- |
| Candidate ref | `refs/heads/codex/phase-1b-stage4a-phase-b-v111-m01-replacement-design-remediation-v2` |
| Candidate HEAD | `156cbafc061d36ce2395529a3150b0c974f3c603` |
| Candidate parent | `626552c4b3eb2ef3f0dbeadddcf5202444102368` |
| Candidate tree | `00a2cf04c8834339f917ba67c05e719acb67108c` |
| Candidate manifest SHA-256 | `44f9f7bbcd5c9338338ba2bf6265b0044b2b3f7e50061edcd49377a9d09a5986` |
| Candidate manifest result | `14/14 PASS` |
| acceptance branch | `refs/heads/codex/phase-1b-stage4a-phase-b-v111-m01-v2-2-design-gate-accepted-v1` |

The accepted completion version identifier is the Git commit that adds this record and the byte-identical independent PASS package as a single docs/evidence-only unit. Its exact commit, parent and tree are recorded by the immediately following versioned completion-checkpoint record; the immutable completion checkpoint ref is pinned to that commit before the checkpoint record is added.

## 2. Independent PASS authority

The controlling Fresh independent re-review report is:

`docs/PHASE_1B_STAGE4A_PHASE_B_V111_M01_REPLACEMENT_CORRECTED_EXACT_DESIGN_V2_2_FRESH_INDEPENDENT_REREVIEW_V1_0.md`

Its SHA-256 is `01da7772c0218f4d9b144e766c0c0b81da995c3ad2eaace06e44dabd3c9a3980`.

The controlling evidence directory is:

`docs/review-evidence/phase-1b-stage4a-phase-b-independent-v111-m01-replacement-corrected-design-rereview-v2-2/`

The imported package was verified in the Reviewer worktree before import and again from the acceptance worktree after import. Its manifest SHA-256 is `93352c303edc460fdd1545ac4c6fcfa33343052f887d8c144eeaef73adad4e45`, with `12/12 PASS`.

| Independent evidence | SHA-256 |
| --- | --- |
| evidence narrative | `a84c0cae2892b6b88a83016e91ffafd0b471f97aac808bf85b4bec2de885a08f` |
| Reviewer external envelope file | `d48a2d9a2eaf59cea53d1970cff1d35cc6b0d6a12e2bbfdc604816078d32fb58` |
| Reviewer external envelope JCS | `aea5b1f08fcdaf4313f5e1b7115f7ac9e78e264ceca6ff246cdad399b0b028fe` |
| real-CLI challenge source | `10c0aeac8a14efa1b52e56b67e64601950d1deb7391e3b16170dd4175fd1b605` |
| real-CLI challenge output | `562e9b79726cf2a3076bdb0fd86c165b65514c934896bc928e28687083ae8fc4` |
| committed-membership challenge source | `8af48fcc89507da24cde7b38d0b828788743352dc176a895036e83be46b86737` |
| committed-membership challenge output | `f4db5d891af32c28ed0975f7f56bfc6bc3d3d3957ae926262ec44d413792ea22` |
| identity and non-regression capture | `7062e7d46ade3d45f33fe9ba125b3e14f6ffc519d7952e4e0c7654c11e703567` |

The imported external envelope is Reviewer-owned historical acceptance evidence for the exact reviewed Candidate. It does not become a Candidate-current authority, does not modify the V2.2 authority package, and creates no dual or fallback authority.

## 3. Review disposition

The independent disposition is **PASS** with these exact finding counts:

| Severity | Count |
| --- | ---: |
| Blocker | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |
| External Validation | 0 |

`REMEDIATION_FINDINGS_REVIEW`: **PASS**. Every V2.2 claimed current closure and every required preserved closure passed independent review.

`FULL_REVIEW_NECESSITY`: **NOT_REQUIRED**. The correction is bounded to docs/evidence and the mandatory Candidate identity, executable evidence, frozen-boundary and non-regression checks passed. No broader application interaction or architecture change was introduced that would make an unrelated full application review proportionate.

## 4. Closed findings and attempt accounting

- `V2-M01` is **CLOSED** after replacement-cycle correction attempt 2.
- The replacement `V111-M01.one-fail-closed-executable-authority` root is **CLOSED**.
- The ordinary V1.12/V1.13/V1.14 three-strike loop remains historical and frozen; this acceptance does not relabel a replacement-cycle correction as ordinary Attempt 4.
- No replacement-cycle attempt 3 is required.
- No further Max escalation is required for this closed root.
- The V2.0 and V2.1 failed Candidates and their findings remain immutable historical evidence, not current authority.
- The exact V2.2 Design Gate is accepted; no other Candidate is accepted by implication.

## 5. Accepted technical boundary

The accepted V2.2 authority remains the standalone successor defined by the Candidate. In particular:

- there is one canonical structured review-authority root, one manifest and one verifier;
- raw `--authority` equality is enforced at the actual CLI entry before normalization, resolution, filesystem or Git discovery;
- exact tracked-HEAD membership, index/worktree equality, sole-manifest joining and physical injectivity remain fail-closed;
- external Reviewer envelope consumption and attached/detached exact identity binding remain required for full review;
- package-only verification remains independently acceptance-ineligible;
- Markdown remains non-authoritative and has no authority parsing or dataflow edge;
- no V2.1 loader fallback, compatibility alias, second path table, Candidate-current envelope, generated pointer bundle, second seal or Markdown authority mechanism exists;
- accepted V1.10 NM01, M02 successor, M03 discriminated seam, M04 V3.1 and frozen Phase B boundaries remain unchanged.

This gate records the independent PASS and Coordinator acceptance; it does not redefine or layer the Candidate's machine authority.

## 6. Scope and impact

The acceptance finalization imports review evidence and adds this record only. It has the following impact disposition:

| Area | Impact |
| --- | --- |
| source / runtime / config / tests | none |
| Schema / Migration / snapshot / journal / seed | none |
| ADR / Owner decision | none required |
| dependency / package / lock | none |
| Complexity Approval | none required |
| Product / public / Prompt / SEO / URL / Redirect / data | none |
| Provider / API / credential / network / spend | none |
| deployment / publishing / indexing | none |

There was no package-manager, install, materialization, download, registry, network, Provider, API, credential or spend action. All repository mutations are under `docs/` or `docs/review-evidence/`.

## 7. Remaining risks and control boundary

No open Design finding or Owner decision remains for the exact V2.2 gate. The remaining risk is execution risk in a future implementation: implementation must preserve the accepted structured-authority, CLI, Git identity, manifest, physical-identity, external-envelope and Phase B boundaries and must undergo its own authorized verification and independent review.

This acceptance creates **implementation eligibility only**. It does not:

- authorize, create or start implementation;
- authorize Product, source, Prompt runtime, Provider, Schema, Migration, dependency or external-system change;
- authorize merge, Push, Deploy, Publish or Index;
- authorize Phase C, D or E;
- replace the requirement for a separately created Fresh implementation task.

## 8. Rollback and next gate

Rollback boundaries are:

1. the immutable completion checkpoint ref, pinned to the accepted completion version containing this record and the PASS import;
2. the exact accepted Candidate `156cbafc061d36ce2395529a3150b0c974f3c603` for rollback before gate-finalization documentation;
3. the frozen historical checkpoints and tag, which remain unchanged.

The exact next gate is a **separately created Fresh `gpt-5.6-sol` / `xhigh` implementation task** beginning from the accepted completion checkpoint. This record neither creates that task nor grants it any authority before explicit Coordinator dispatch.
