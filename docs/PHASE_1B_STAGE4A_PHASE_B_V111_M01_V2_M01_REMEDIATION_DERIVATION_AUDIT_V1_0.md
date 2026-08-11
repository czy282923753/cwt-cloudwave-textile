# CWT Stage 4A Phase B — V111-M01 V2-M01 Remediation Derivation Audit V1.0

Status: **DERIVATION COMPLETE / SAME-ROOT BOUNDED CORRECTION / FRESH INDEPENDENT PASS STILL REQUIRED**

Date: `2026-08-11` (`Asia/Shanghai`)

## 1. Audit question

This audit asks whether the standalone V2.1 Candidate changes only the
independently identified V2-M01 causal boundary while preserving the accepted
Max Option A and all closed Phase B technical values.

Conclusion: **yes at Candidate construction time; no acceptance claim is
made**. The V2.0 loader is replaced, not wrapped. V2.0 and its Reviewer FAIL
remain immutable historical evidence with zero current executable edge.

## 2. Fixed identities

| Evidence | Exact identity |
| --- | --- |
| fixed failed V2.0 ref | `refs/heads/codex/phase-1b-stage4a-phase-b-v111-m01-three-strike-replacement-design-v1` |
| failed V2.0 HEAD / parent / tree | `4b626fc9278f4c49957ecf165d7d5c5fc4058dca` / `3aaad46b1627191a18fb82763a9627c1e2292d73` / `8e4d3b48cef65a418012438d00e677f4169b684e` |
| failed V2.0 manifest | SHA-256 `9732442a4d20330e34ccb09762b9bf2d78337295dc489583cae3e9058167c508`; `12/12 PASS` |
| accepted Max analysis | `c103682e63e9a2cb62b6581d7d62773ddcab1a99`; manifest SHA-256 `8ec01bd6b0263e2cd71cb5c765f9ba535fac02ad052be5ced291613232fef7a0`; `12/12 PASS` |
| controlling Reviewer report | SHA-256 `6962e45985f17cccbd978d2069c7adf9b64163da3b7b9d3f05b56cd36b0c0205` |
| controlling Reviewer evidence | SHA-256 `81dbb046264184eb23d399b921494e26c63c75bd2c7c95042eb6d7b1025c163d` |
| controlling Reviewer manifest | SHA-256 `ac31e83689fec456095ae85f10ec5881e74c22881a1456a24c190bb716ea854a`; `9/9 PASS` |
| Reviewer challenge source / capture | `b6523b448f09d8b3c847efe32b67efc34da6feee38ecad2bd8bab72cda00e089` / `cbb8e2422074cae96c2bf16729aa66bdc6ad3cd320321f0fc62a9db101dd3143` |
| remediation checkpoint ref | `codex/checkpoint/phase-1b-stage4a-phase-b-v111-m01-v2-m01-remediation-pre-l3-v1` -> `4b626fc9278f4c49957ecf165d7d5c5fc4058dca` |
| remediation checkpoint record | `3c387781cb0b8b6889e32883f637ddfe9d9c36e7`; parent `4b626fc...`; tree `beee1774d9bc51ff700807de6f9b22fce3eda020`; one added path |
| Reviewer FAIL import | `ac080b1d8b49906154ecbc44d381a84afe972bad`; parent `3c387781...`; tree `3871f32de97baed44e283aa145d1a70265534156`; ten byte-identical paths |

The Reviewer package was checked before mutation. Its exact challenge was also
rerun in a disposable detached exact-HEAD copy with the required local refs:
baseline full review passed and each ignored exact copy, ignored hard-link, and
ignored self-consistently resealed altered root incorrectly exited `0`.

## 3. Causal replacement audit

V2.0's deficient `loadAuthority` accepted any in-repository canonical-looking
path. Manifest verification later authenticated the committed package but did
not prove that the loaded root was that package root. The loaded file was also
absent from the physical identity set.

V2.1 deletes that selection model. One constant names the only root path and
one constant names the only manifest path. Before semantic JSON is parsed, the
verifier:

1. normalizes the CLI path and requires exact equality with the root constant;
2. reads the exact `HEAD` tree entry and requires one case-exact mode-`100644`
   blob;
3. requires the stage-0 index blob and worktree bytes to equal that `HEAD`
   blob;
4. reads the one exact manifest from `HEAD`, requires exactly one root entry,
   and joins its SHA-256 to the same `HEAD` and loaded bytes; and
5. inserts the loaded root, manifest, manifest members and checkpoints into one
   realpath/device/inode injectivity set.

The external V2.0 envelope schema remains the Max-selected Reviewer-owned
post-commit expectation. Its `authorityBinding.path` is also required to equal
the same root constant. A coordinated CLI plus envelope redirection therefore
fails before either alternate root's semantic contents or seal can matter.

There is no V2.0 loader fallback, CLI-selectable manifest, alternate path table,
basename alias, generated pointer, second manifest or compatibility fixture.

## 4. Closed historical evidence audit

The V2.0 root, verifier, package manifest, Candidate identity, independent FAIL
report, Reviewer envelope and challenge are recorded only in
`closedReplacementEvidence`. The closed record requires:

- `nonExecutable=true`;
- `currentExecutableEdge=false`; and
- `importedReviewerEnvelopeIsCurrent=false`.

No current role, graph edge, CLI option, manifest policy or fallback imports
the V2.0 loader. The byte-identical Reviewer envelope is committed solely
because the coordinator required the fixed FAIL package to be imported at its
exact historical paths; it is not the external envelope consumed for V2.1
full-review.

## 5. Phase B technical derivation

The V2.1 composite profile preserves the V2.0 value subtrees for:

- accepted V1.10 NM01/context-domain/error/order authority and its independent
  PASS;
- accepted/closed M02 A-08 successor values;
- the M03 discriminated actual-database seam;
- closed M04 V3.1 static capability/resource facets; and
- frozen NH01/M01/M03/M05/L01/L02 dispositions.

Each selected value retains its independent source commit, path, file hash and
value-JCS hash. The only currentness string changes to
`v2-1-successor-canonical-root-plus-future-fresh-pass`. A byte-identical
technical value copied from a historical failed Candidate is current only
through the new V2.1 root and a future Fresh PASS—not through failed ancestry.

The ordered Schema mirror remains exactly `ai_model_config 21/21` and
`ai_runs 96/96` against accepted `0020`; `mutationAllowed=false`.
Provider-neutral, Draft-only, no-RAG/no-vision/no-customer-support,
private-data isolation, empty Production Provider registry and Phase C/D/E
boundaries are unchanged.

## 6. Markdown and removed-mechanism audit

The rendered Design is a hash-bound `renderedDesign` role with
`machineAuthority=false`. The verifier contains no Markdown read or parse
edge. It does not interpret headings, markers, indentation, fences, info
strings, JSON blocks, paths or prose. All five CommonMark witnesses preserve
the same structured role projection and are presentation witnesses, not parser
acceptance cases.

Current execution has no:

- separate `CURRENT_AUTHORITY_SUBJECT_V1_0.json` or
  `CURRENT_AUTHORITY_IDENTITY_V1_0.json`;
- generated current pointer bundle;
- Candidate-current review envelope;
- `SEAL_SHA256SUMS.txt`;
- Markdown authority view, scanner or reserved declaration;
- V1.12/V1.13/V1.14 stale/current string scanner;
- V2.0 `loadAuthority` fallback;
- separate CLI expected ref/tree/parent copies; or
- compatibility fixture preserving failed parser/loader behavior.

## 7. Proof derivation

The accepted `10/42/10` matrix remains intact. V2.1 appends 23 causal
negatives and four properties, yielding exact `10 positive / 65 negative / 14
properties`. The extension covers every case required by the controlling FAIL,
including four distinct root hard-link collision targets and fresh ignored
directory names beyond `.next`.

The boundary capture records deterministic rule/path/identity diagnostics. The
package verifier recomputes both the full proof capture and boundary capture
twice under pinned Node `24.14.0` and requires byte equality. Package-only
always emits `acceptanceEligible=false`. A final external envelope is created
only after the V2.1 Candidate commit and is never committed into the Candidate.

## 8. Scope, rollback and next gate

The remediation changes only `docs/` and `docs/review-evidence/`. It adds no
dependency, ADR, Schema/Migration, Prompt runtime/body, Product/public/SEO/URL/
Redirect, Provider/API/credential/network/spend or Phase C/D/E work.

Primary rollback is the immutable remediation checkpoint at `4b626fc...`.
Earlier rollbacks remain V2.0 pre-L3 `c103682...`, accepted implementation
checkpoint `0793948...`, accepted V1.10 `234cd902...`, full rollback
`3f475e13...` and frozen tag object/peel `1c626f9b...` / `31c0e405...`.

The only next gate is a separate Fresh independent Design Review against the
exact final V2.1 Candidate and a Reviewer-owned external envelope. This audit
does not close V111-M01, approve the Candidate or authorize implementation.
