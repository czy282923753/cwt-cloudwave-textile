# CWT Stage 4A Phase B — V111-M01 Three-Strike Replacement Corrected Exact Design V2.0 Fresh Independent Review V1.0

Review conclusion: **FAIL**

Status: **COMPLETED / DESIGN GATE INELIGIBLE / NO ORDINARY ATTEMPT 4 / NO IMPLEMENTATION AUTHORITY**

Date: `2026-08-11` (`Asia/Shanghai`)

## 1. Executive ruling

The exact Candidate at `4b626fc9278f4c49957ecf165d7d5c5fc4058dca` is not eligible for the Phase B Corrected Design Gate. The replacement correctly removes Markdown authority, consumes a Reviewer-owned post-commit envelope, preserves the accepted Phase B design, and passes its exact attached/detached baseline. However, one deterministic Medium finding remains in the same three-strike root: the verifier does not bind the loaded canonical authority file to the exact tracked Candidate manifest root.

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
| Candidate ref | `refs/heads/codex/phase-1b-stage4a-phase-b-v111-m01-three-strike-replacement-design-v1` |
| HEAD | `4b626fc9278f4c49957ecf165d7d5c5fc4058dca` |
| parent | `3aaad46b1627191a18fb82763a9627c1e2292d73` |
| tree | `8e4d3b48cef65a418012438d00e677f4169b684e` |
| formal worktree | clean, attached to exact full ref |
| review snapshot | clean, detached exact HEAD |
| L3 checkpoint ref | unchanged at `c103682e63e9a2cb62b6581d7d62773ddcab1a99` |
| checkpoint record | direct one-path child `3aaad46b...`; SHA-256 `8fad6235...` |
| frozen tag | object `1c626f9b...`; peel `31c0e405...` |
| Candidate scope | 13 added docs/evidence paths; no symlink; no product/governance authority change |
| failed V1.12/V1.13/V1.14 | non-ancestors `3/3` |

All fixed Candidate hashes matched. The Candidate manifest passed `12/12`; the Max analysis manifest passed `12/12`.

## 3. Finding

### V2-M01 — Medium — loaded authority can be an ignored/untracked alternate root

Affected contract:

- Design §§17–19, especially the claims that one Candidate-committed root is the only machine authority, paths are tracked and physically injective, and the envelope binds the exact canonical-root path;
- verifier `loadAuthority` at lines 837–849 and the later manifest verification at lines 852–872.

Exact reproduction:

1. Keep the detached exact Candidate clean.
2. Put a root copy under ignored `.next/` and make the external envelope name that path.
3. Run the exact verifier in full-review mode.
4. Repeat with a hard-link alias.
5. Repeat with a modified historical record, recompute the root JCS seal and rebind the Reviewer envelope.

All three alternate-root cases exited `0` and reported acceptance-eligible full-review input while porcelain status remained empty. The third root was not present in commit `4b626fc...`; the Candidate manifest still verified only the original committed root.

Root cause: `loadAuthority` applies in-repository realpath and textual path validation, but not `existingTrackedRegular`; it does not assert the one fixed canonical root path or join loaded bytes to that path's manifest entry, and the loaded root is absent from the physical-injectivity set. Coordinated CLI plus envelope redirection therefore bypasses the author's single-leaf path mutation.

Impact: the verifier can attest a machine authority different from the authority committed in the exact reviewed Candidate. That defeats the replacement's central one-root/Git closure and could make a changed authority appear to belong to a clean exact HEAD.

Required correction, without implementation here:

1. Require `--authority` to resolve to the one exact canonical Candidate root path and to a case-exact tracked regular file.
2. Join the loaded root path/hash to the single manifest entry for that exact path; coordinated CLI/envelope redirection must fail.
3. Include the loaded authority itself in physical path/device/inode injectivity so a hard-link alias cannot stand in for it.
4. Add exact-copy, ignored/untracked, hard-link and self-consistently resealed alternate-root negatives to the executable matrix and Fresh proof.

Root disposition: **same `V111-M01.one-fail-closed-executable-authority` root remains OPEN**. This is not a genuinely new Product/Schema root and does not authorize an ordinary Attempt 4.

## 4. Review-target dispositions

| Target | Disposition |
| --- | --- |
| A. Same-root replacement proof | **OPEN** because the consumed root need not be Candidate-committed |
| B. Markdown boundary | **PASS / CLOSED**; Markdown is hashed documentation only and no parser/dataflow creates roles |
| C. Removed mechanisms | **PASS / CLOSED**; split subject/identity, pointer bundle, committed envelope, second seal and compatibility parsers are absent |
| D. Standalone/non-regression | **PASS except V2-M01**; V1.10/NM01/M02/M03/M04 and Phase B boundaries are preserved |
| E. Independent adversarial work | **FAIL witness reproduced**; ignored copy, hard-link and resealed alternate root accepted |

## 5. Verification summary

- package-only: PASS, `acceptanceEligible=false`, `10/42/10`;
- attached exact-ref full review: baseline PASS;
- detached exact-HEAD full review: baseline PASS;
- external envelope JCS SHA-256: `76ea4cec640ca30d58bcf9de43315e1cbddbe292ac2da5ddba1ccfbc342902e0`;
- envelope leaves: 16 challenged; 14 rejected, 2 descriptive provenance changes altered normalized JCS evidence;
- ref movement, wrong attachment, visible dirty state, duplicate decoded envelope name and Markdown byte mutation: rejected;
- ignored/untracked root copy, hard-link alias and resealed altered root: incorrectly accepted;
- `ai_model_config 21/21` and `ai_runs 96/96`: ordered equality PASS against accepted `0020`;
- M02/M04 embedded values: equality PASS against historical Git objects;
- package/dependency/CommonMark/Schema/Migration/ADR/source diff: none;
- Candidate final state: clean and byte-identical.

Full application Build/tests were not run because this is a docs-only authority-boundary review; dependency-free verifier, Git-object, schema-order and adversarial authority tests directly cover the changed risk.

## 6. Impact and eligibility

| Area | Ruling |
| --- | --- |
| Schema / Migration | none |
| ADR / Owner architecture decision | none required for the identified correction |
| dependency / package / lock | none |
| Complexity Approval | none; correction should narrow the existing boundary |
| Product / public / SEO / URL / data | none |
| Provider / network / credentials | none and unauthorized |
| Design Gate eligibility | **NO** |
| implementation eligibility | **NO** |

## 7. Next gate

The ordinary three-attempt loop remains frozen and no ordinary Attempt 4 is permitted. The next bounded gate is a separately authorized docs/evidence-only remediation of the Max-selected replacement design that closes the exact tracked-root/manifest/physical-identity join, followed by another Fresh independent Design Review. If the coordinator instead determines that this cannot be corrected without reopening the replacement architecture, the task must return to a new Max root-cause analysis. Implementation and Phase C/D/E remain prohibited.

