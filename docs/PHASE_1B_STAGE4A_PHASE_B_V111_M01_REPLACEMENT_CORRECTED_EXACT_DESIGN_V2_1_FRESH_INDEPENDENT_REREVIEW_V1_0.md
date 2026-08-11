# CWT Stage 4A Phase B — V111-M01 Replacement Corrected Exact Design V2.1 Fresh Independent Re-review V1.0

Review conclusion: **FAIL**

Status: **COMPLETED / DESIGN GATE INELIGIBLE / V2-M01 OPEN AFTER REPLACEMENT-CYCLE CORRECTION ATTEMPT 1 / IMPLEMENTATION NOT AUTHORIZED**

Date: `2026-08-11` (`Asia/Shanghai`)

## 1. Executive ruling

The exact Candidate at `3d424821aab67c03c3b8ec02a62b5577044837c9` is not eligible for the Phase B Corrected Design Gate.

V2.1 closes the prior alternate-root defect: the consumed root is now joined to the exact tracked `HEAD` blob, index, worktree, sole manifest and global physical-identity set. The prior ignored copy, ignored hard-link and resealed altered-root witnesses all reject. Attached and detached full review pass with a Fresh Reviewer-owned post-commit envelope.

One deterministic Medium finding remains in the same authority-identity root. The actual `--authority` entry boundary resolves path aliases before validating the path spelling, so `./`, a cancelling `..`, duplicate slash and the canonical absolute realpath all succeed even though Design §§17–19 require each to fail closed. The author matrix tests an internal helper rather than this real entry boundary and therefore falsely records the exact-path property as proved.

Finding counts:

| Severity | Count |
| --- | ---: |
| Blocker | 0 |
| High | 0 |
| Medium | 1 |
| Low | 0 |
| External Validation | 0 |

## 2. Exact Candidate and checkpoint

| Item | Independently verified value |
| --- | --- |
| Candidate ref | `refs/heads/codex/phase-1b-stage4a-phase-b-v111-m01-replacement-design-remediation-v1` |
| HEAD / parent / tree | `3d424821...` / `ac080b1d...` / `2feaecc...` |
| formal worktree | clean, attached to exact full ref |
| review snapshot | clean, detached exact HEAD |
| failed V2.0 ref | unchanged at `4b626fc...` |
| remediation checkpoint | unchanged at `4b626fc...` |
| checkpoint record | direct one-path child `3c387781...`; SHA-256 `24c59acc...` |
| Candidate scope | 14 added mode-`100644` docs/evidence paths; no symlink or product/governance authority change |
| frozen tag | object `1c626f9b...`; peel `31c0e405...` |
| V2.1 manifest | `13/13 PASS`; SHA-256 `3b892946...` |
| prior FAIL package | byte-identical `9/9 PASS` |

## 3. Finding

### V2-M01 — Medium — exact authority argument aliases are normalized into acceptance

Affected contract:

- Design §17: the only accepted authority argument is the exact closed repo-relative path; absolute, dot, dot-dot and duplicate slash fail closed;
- Design §19 and the `exact-canonical-authority-path` proof claim;
- verifier `loadAuthorityBoundary` lines 1121–1128;
- proof matrix path negatives and property claim.

Exact Fresh reproduction on a clean detached V2.1 clone under Node `24.14.0`:

| `--authority` spelling | Expected | Actual |
| --- | --- | --- |
| exact repo-relative path | pass | exit `0` |
| `./` + exact path | reject | exit `0` |
| package path with cancelling `..` | reject | exit `0` |
| `docs//...` duplicate slash | reject | exit `0` |
| exact canonical absolute realpath | reject | exit `0` |

All five successful runs emitted the byte-identical package-only capture SHA-256 `012fb82a...`.

Root cause: `loadAuthorityBoundary` computes `path.resolve(authorityArgument)` and then a normalized `path.relative(...)` before calling the lexical validator. The validator cannot detect syntax erased by resolution. The author tests feed forbidden spellings directly to `validateRepoPath`, so they do not test the supported CLI path and self-match the intended rule.

Impact: an alternate authority file can no longer be selected, so the V2.0 byte-substitution risk is closed. But the central exact-argument fail-closed contract and its proof are materially false. An implementation/CI author cannot rely on the declared `exact-canonical-authority-path` property as reviewed.

Required correction, without implementation here:

1. validate the raw `--authority` string against the exact repo-relative constant before any path normalization or resolution;
2. retain the existing resolved path, tracked `HEAD`, index/worktree, manifest and physical-identity checks as downstream defense;
3. replace the helper-only path cases with real CLI/package entry-boundary negatives for absolute, `./`, dot-dot cancellation and duplicate slash; and
4. rerun Fresh package-only, attached/detached, prior witnesses and manifest/Git negatives.

Root disposition: **same `V111-M01.one-fail-closed-executable-authority` root remains OPEN after replacement-cycle correction attempt 1**. This is not a new Product/Schema root and does not trigger a three-strike escalation.

## 4. Review-target dispositions

| Target | Disposition |
| --- | --- |
| prior V2.0 ignored copy/hard-link/resealed root | **CLOSED**; all reject on exact V2.1 |
| exact root path boundary | **OPEN**; four forbidden aliases exit `0` |
| exact reviewed HEAD membership | **PASS**; mode/blob/index/worktree drift rejects |
| sole manifest join | **PASS**; missing/duplicate/wrong/reordered committed variants reject |
| physical injectivity | **PASS**; root participates in current package/checkpoint/manifest identity checks |
| external envelope and Git closure | **PASS**; 16 leaves, moved ref, attachment, dirty state and historical envelope behave as contracted |
| package-only ineligibility | **PASS**; always `acceptanceEligible=false` |
| Markdown/removed mechanisms | **PASS**; no current executable Markdown or failed-mechanism edge |
| Phase B design non-regression | **PASS** |

## 5. Verification summary

- Candidate fixed hashes and manifest: PASS;
- controlling prior FAIL hashes and `9/9`: PASS;
- root file/JCS/subject seals: independently recomputed PASS;
- package-only: exit `0`, `10/65/14`, not acceptance eligible;
- attached exact-ref and detached exact-HEAD full review: exit `0`;
- prior V2.0 defect: Fresh reproduced `3/3` incorrect exit `0`;
- exact V2.1 prior witnesses: rejected `3/3`;
- envelope leaves: 16 challenged; 14 rejected, two descriptive leaves changed recorded JCS evidence;
- staged/unstaged root, dirty, moved ref, wrong attachment, historical envelope: rejected;
- committed manifest missing/duplicate/wrong/reordered: rejected `4/4`;
- actual entry-boundary forbidden aliases: incorrectly accepted `4/4`;
- `ai_model_config 21/21` and `ai_runs 96/96`: independent ordered equality PASS;
- V1.10/M02/M03/M04 selected value hashes: Git-object equality PASS `4/4`;
- package manager/install/materialization/download/registry/network/Provider actions: zero;
- Candidate final formal and detached states: clean and byte-identical.

Full application Build/tests were proportionately omitted because this is docs-only and the direct authority/Git/schema checks cover the changed risk.

## 6. Impact and eligibility

| Area | Ruling |
| --- | --- |
| Schema / Migration | none |
| ADR / Owner decision | none required for this defect |
| dependency / package / lock | none |
| Complexity Approval | none; correction narrows the existing boundary |
| Product / public / SEO / URL / data | none |
| Provider / network / credentials | none and unauthorized |
| Design Gate eligibility | **NO** |
| implementation eligibility | **NO** |

## 7. Next gate

The next bounded gate is a docs/evidence-only V2-M01 replacement-cycle correction attempt 2 that fixes the actual raw CLI path boundary and replaces the helper-only proof with real entry-boundary negatives, followed by another Fresh independent Design re-review. No ordinary implementation, merge, Push, Provider work or Phase C/D/E action is authorized.
