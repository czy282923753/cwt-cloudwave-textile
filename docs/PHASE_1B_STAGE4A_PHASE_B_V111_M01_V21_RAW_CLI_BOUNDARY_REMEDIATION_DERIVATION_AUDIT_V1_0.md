# CWT Stage 4A Phase B — V111-M01 V2.1 Raw CLI Boundary Remediation Derivation Audit V1.0

Status: **DERIVATION COMPLETE / REPLACEMENT-CYCLE CORRECTION ATTEMPT 2 / SAME-ROOT BOUNDED CORRECTION / FRESH INDEPENDENT PASS STILL REQUIRED**

Date: `2026-08-11` (`Asia/Shanghai`)

## 1. Audit question

This audit asks whether the standalone V2.2 Candidate changes only the
independently identified V2-M01 causal boundary while preserving the accepted
Max Option A and all closed Phase B technical values.

Conclusion: **yes at Candidate construction time; no acceptance claim is
made**. V2.2 replaces, rather than wraps, the V2.1 resolve-before-validation
boundary. V2.0, V2.1 and their Reviewer FAIL packages remain immutable
historical evidence with zero current executable edge.

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
| fixed failed V2.1 ref | `refs/heads/codex/phase-1b-stage4a-phase-b-v111-m01-replacement-design-remediation-v1` |
| failed V2.1 HEAD / parent / tree | `3d424821aab67c03c3b8ec02a62b5577044837c9` / `ac080b1d8b49906154ecbc44d381a84afe972bad` / `2feaecc44874462929c20ed8670de251244f5bd8` |
| failed V2.1 manifest | SHA-256 `3b8929467ee741f156cfcdacd4aaa2a91edbd7c5def6f1bf56c4910683bb98a4`; `13/13 PASS` |
| controlling V2.1 Reviewer report / evidence | `3056465d76a89bef97233fc4554ed7f754c316c20413a352aeaf7803430ab357` / `fe15e07c7b587aa6c0d5961b5338a827ab7067dfe3c98758f255823c5712c34f` |
| controlling V2.1 Reviewer challenge / output / identity | `648f12a00b855abb9d1596dd2eed886a616c50f905986c9819b50575dc193665` / `a95b795f3fcac6e1097aa23f411693b730bb65db1632c9603b18c9fcf72320bd` / `b4d968392b527daa0a3ab8d8077999b2b4f0d29c18f5e0bea614e806945aa2fe` |
| controlling V2.1 Reviewer manifest | SHA-256 `7a6ff7781bd43ef7658fa78e5d29c9a19910e6bf1df02132d1b8a9e19e4ebc57`; `10/10 PASS` |
| V2.1 CLI checkpoint ref | `codex/checkpoint/phase-1b-stage4a-phase-b-v111-m01-v21-cli-remediation-pre-l3-v1` -> `3d424821aab67c03c3b8ec02a62b5577044837c9` |
| V2.1 CLI checkpoint record | `eca7843fa3ced513cc199514bbf5afad30dc5553`; parent `3d424821...`; tree `be9141a4062fe450b799222bc2c28c5407ef8a0e`; SHA-256 `53da981aede0d4e1e0a96c0d9a64cc6ceff7966965b8acade8dc12946a2e699b`; one path |
| V2.1 Reviewer FAIL import | `626552c4b3eb2ef3f0dbeadddcf5202444102368`; parent `eca7843...`; tree `63eeb54c50cc516daff5fb65a305d6d2f2bf1ee2`; 11 byte-identical paths |

The V2.1 Reviewer package was checked before mutation. The real V2.1 package
CLI was independently invoked with the exact relative path, `./` prefix,
cancelling `..`, duplicate slash and exact absolute realpath. All five exited
`0` and emitted the same package-only SHA-256 `012fb82a...`, exactly reproducing
the controlling FAIL. The earlier V2.0 ignored-copy/hard-link/resealed defect
remains closed by V2.1 and is a mandatory V2.2 non-regression target.

## 3. Causal replacement audit

V2.1 correctly joined the loaded root to exact `HEAD`, index, worktree, the
sole manifest entry and global physical injectivity. Its remaining defect was
earlier in the same causal boundary: it called `path.resolve` and
`path.relative` before lexical equality, while the author matrix tested only
`validateRepoPath` directly.

V2.2 deletes that entry model. One constant names the only root path and one
constant names the only manifest path. Before any path/URL/filesystem/Unicode
operation, the actual CLI compares the untouched `--authority` JavaScript
string with that constant by exact code-point equality. The argument is an
assertion, not a locator. Failure is always
`raw_authority_spelling_not_canonical`. Only after equality succeeds does the
verifier:

1. resolve the fixed constant, never the user spelling;
2. read the exact `HEAD` tree entry and require one case-exact mode-`100644`
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

There is no V2.0 or V2.1 loader fallback, CLI-selectable manifest, alternate
path table, normalization allowlist, basename alias, generated pointer, second
manifest or compatibility fixture.

## 4. Closed historical evidence audit

The V2.0 and V2.1 roots, verifiers, package manifests, Candidate identities,
independent FAIL reports, Reviewer envelopes and challenges are recorded only
in `closedReplacementEvidence.failedV20` and `.failedV21`. Each closed record
requires:

- `nonExecutable=true`;
- `currentExecutableEdge=false`; and
- `importedReviewerEnvelopeIsCurrent=false`.

No current role, graph edge, CLI option, manifest policy or fallback imports
either failed loader. Each byte-identical Reviewer envelope is committed solely
as required historical FAIL evidence at its exact path; neither is the external
envelope consumed for V2.2 full-review.

## 5. Phase B technical derivation

The V2.2 composite profile preserves the V2.0 value subtrees for:

- accepted V1.10 NM01/context-domain/error/order authority and its independent
  PASS;
- accepted/closed M02 A-08 successor values;
- the M03 discriminated actual-database seam;
- closed M04 V3.1 static capability/resource facets; and
- frozen NH01/M01/M03/M05/L01/L02 dispositions.

Each selected value retains its independent source commit, path, file hash and
value-JCS hash. The only currentness string changes to
`v2-2-raw-cli-successor-canonical-root-plus-future-fresh-pass`. A byte-identical
technical value copied from a historical failed Candidate is current only
through the new V2.2 root and a future Fresh PASS—not through failed ancestry.

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
- V2.0/V2.1 loader fallback or helper-only acceptance path;
- separate CLI expected ref/tree/parent copies; or
- compatibility fixture preserving failed parser/loader behavior.

## 7. Proof derivation

The accepted `10/42/10` matrix and V2.1 `10/65/14` extension remain intact.
V2.2 appends 24 raw CLI/process-interface negatives plus two killed mutations
and two properties, yielding exact `10 positive / 91 negative / 16
properties`. The raw cases cover absolute realpath, every dot/dot-dot spelling,
duplicate/trailing slash, backslash, percent, NFD/Unicode lookalike, case,
control, whitespace, tilde/home/environment spellings, any other non-identical
value and NUL where the process boundary governs it.

The actual-entry capture is produced by `spawnSync(process.execPath, ...)`
against the real package CLI. It requires a real child PID, exit `1`, empty
stdout and exact `raw_authority_spelling_not_canonical`; the NUL case records
the Node process-interface rejection. Consequently, restoring
resolve-before-validation causes the alias child to exit `0` and kills the
matrix, while replacing process invocations with helper-only calls fails the
transport/PID assertion. Package-only always emits
`acceptanceEligible=false`; attached and detached full review use this same
entry. A final external envelope is created only after the V2.2 Candidate
commit and is never committed into the Candidate.

## 8. Scope, rollback and next gate

The remediation changes only `docs/` and `docs/review-evidence/`. It adds no
dependency, ADR, Schema/Migration, Prompt runtime/body, Product/public/SEO/URL/
Redirect, Provider/API/credential/network/spend or Phase C/D/E work.

Primary rollback is the immutable V2.1 CLI-remediation checkpoint at
`3d424821...`. Earlier rollbacks remain attempt-1 checkpoint `4b626fc...`, V2.0
pre-L3 `c103682...`, accepted implementation
checkpoint `0793948...`, accepted V1.10 `234cd902...`, full rollback
`3f475e13...` and frozen tag object/peel `1c626f9b...` / `31c0e405...`.

The only next gate is a separate Fresh independent Design Review against the
exact final V2.2 Candidate and a Reviewer-owned external envelope. This audit
does not close V111-M01, approve the Candidate or authorize implementation.
