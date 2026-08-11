# CWT Stage 4A Phase B — V111-M01 Three-Strike Replacement Design Derivation Audit V1.0

Status: **DERIVATION AUDITED / CORRECTED DESIGN CANDIDATE ONLY / NOT SELF-APPROVED / IMPLEMENTATION NOT AUTHORIZED**

Date: `2026-08-11` (`Asia/Shanghai`)

## 1. Result

The standalone successor is
`PHASE_1B_STAGE4A_PHASE_B_PROVIDER_NEUTRAL_FOUNDATION_THREE_STRIKE_REPLACEMENT_CORRECTED_EXACT_DESIGN_V2_0.md`.
It preserves the accepted Phase B technical contract and replaces only the
`V111-M01` current-authority boundary. It is not a delta memo, Product
implementation or ordinary Attempt 4.

The sole Candidate machine root is
`V111_M01_CANONICAL_REVIEW_AUTHORITY_V2_0.json`. The only reviewer Git input is
an external, post-commit `CANDIDATE_REVIEW_ENVELOPE_V2_0.json` that is not part
of the Candidate.

## 2. L3 identity audit

| Check | Exact result |
| --- | --- |
| accepted Max analysis start | `c103682e63e9a2cb62b6581d7d62773ddcab1a99` |
| start parent / tree | `c19e7163e9a02655461a07dce1ddb1099c6e55a6` / `d2f0d2760034e6d5409d40f0dbcae05283b471c3` |
| new checkpoint ref | `codex/checkpoint/phase-1b-stage4a-phase-b-v111-m01-replacement-design-pre-l3-v1` -> exact start |
| checkpoint record commit | `3aaad46b1627191a18fb82763a9627c1e2292d73`, exact one-path direct child |
| checkpoint record SHA-256 | `8fad6235143a9550d8992d2db7462c9f6dcd57362e9db67db712c80aa02c72d7` |
| Candidate branch | `codex/phase-1b-stage4a-phase-b-v111-m01-three-strike-replacement-design-v1` |
| frozen tag object / peel | `1c626f9b788e4c6ed0480a7040aa54ccef3e6c76` / `31c0e405acfdd0d05200d0fb2531e897a541a2c4` |
| pre-mutation status | clean detached exact start; clean attached new branch after ref creation |

The accepted analysis document, replacement plan, 12-entry manifest, minimal
reproduction capture and package-verifier capture matched SHA-256
`ef0ca195...`, `32e4b54f...`, `8ec01bd6...`, `9ae5ad93...` and `6fe79f0a...`.
The Max package verifier passed with pinned Node `24.14.0` in its authoritative
clean attached worktree.

## 3. Fact derivation audit

| Successor fact | Controlling evidence | Derivation ruling |
| --- | --- | --- |
| full Provider-neutral Phase B contract | accepted V1.10 commit `234cd902...`, Design SHA `039c26e3...`, independent Fresh PASS | reproduced normatively; no V1.10 authority file is called current by path |
| NM01 context/error/order | V1.10 profile SHA `8f1c7c9c...` and independent PASS | embedded exact JSON value in the composite profile; 69-code runtime/5-code TypeScript layers, 35-record detached product and `CR-01..CR-14` preserved |
| selected M02 A-07 | accepted registry SHA `264ca635...` | preserved as the sole protected-value classifier identity |
| M02 A-08 successor | independently accepted/closed profile SHA `3a42cb45...` | embedded exact JSON value; deletion-enumeration compatibility mechanism excluded |
| M03 seam and graph | accepted profile `cwt.phase1b.stage4a.phaseb.m03-protected-graph.v2_2`, SHA `1f0b56a8...` | embedded exact JSON value; discriminated actual-type seam preserved |
| M04 V3.1 closed facets | V1.12 independent review: materialization, actual-tree selector and resource/ordinary-URL facets closed; profile SHA `5d353ab7...` | embedded exact JSON value; it is current only through the new root plus future Fresh PASS, never through failed V1.12 ancestry |
| Schema mapping | accepted V1.10 `21/21` and `96/96`, accepted `0020`/Drizzle sources | copied into structured ordered arrays and rechecked by historical verifier; no Markdown runtime authority edge |
| finding dispositions | accepted independent implementation evidence plus later M02/M04 successor audit | NH01/M01/M03/M05/L01/L02 frozen CLOSED; no implementation claim |

The composite profile records source commit/path/file hash and value JCS hash
for every embedded authority. Value equality is evidence of preservation, not a
pointer to failed currentness. The successor root, not a historical bundle,
selects the composite profile.

## 4. Replacement audit

The following failed causal mechanisms are neither current artifacts nor
verifier inputs:

- separate subject JSON;
- separate identity/seal JSON;
- generated current-pointer bundle;
- Candidate-committed nominal review envelope;
- second seal manifest;
- Markdown machine view, reserved declaration or prose/currentness parser;
- V1.12/V1.13/V1.14 stale/current string scanner;
- separate CLI expected ref/tree/parent inputs; and
- compatibility fixtures that preserve parser behavior.

The five CommonMark witnesses remain only presentation-independence properties:
they feed no role-enumeration function and therefore change zero machine roles.

## 5. Boundary and impact audit

The change is docs/evidence only. Schema/Migration, ADR-0018, dependency,
package/lock, Prompt runtime/body, Product, public, SEO, URL, Redirect,
Provider/network/credential/spend, persistent coordination and formal data are
unchanged. There is no Complexity Approval or unresolved Owner decision.

The authority graph has no self cycle: Design/profile/verifier precede the
root; derived captures follow it; the single manifest is generated last; the
external envelope follows the final Candidate commit and remains outside.

## 6. Verification and terminal state

Required author evidence is one deterministic package-only capture with
`acceptanceEligible=false`, one `10/42/10` schema/property/mutation capture,
historical fixed-manifest verification, one single package manifest and, after
the final commit, external attached and detached full-review runs. Any Candidate
byte change after the envelope requires a new commit and regenerated proof.

Completion creates only a Corrected Design Candidate. The original independent
Reviewer must return Fresh `PASS`; this author does not start that task or any
implementation/Phase C/D/E work.
