# CWT Stage 4A Phase B — Corrected Exact Design V1.5 Derivation Report V1.0

Status: **CORRECTED DESIGN DERIVATION CANDIDATE / NOT SELF-APPROVED / IMPLEMENTATION NOT AUTHORIZED**

Date: 2026-08-10 Asia/Shanghai

## 1. Outcome

Corrected Exact Design V1.5 is a standalone reproduction of accepted Exact Design V1.4 with only the two Owner-selected three-strike proof boundaries replaced:

- `M02-D1-INCLUDE`: one 32-rule closed Unicode/grammar registry with exact rule-specific gap and counter semantics; and
- `M03-D1-DISCRIMINATED-SEAM`: one exhaustive outer `DatabaseConnection` switch handing each branch-narrowed `AppDatabase` directly to the same protected generic factory.

No other V1.4 contract changes. The Candidate is ready only for Fresh Independent Design Review; it is not approved and does not authorize implementation.

## 2. Fixed lineage

| Identity | Exact value |
|---|---|
| Corrected Design branch | `codex/phase-1b-stage4a-phase-b-corrected-design-v1` |
| Branch parent / Technical Escalation PASS Candidate | `377181cd76e5427f344ff0c259fc9bd32ec7b670` |
| Accepted Design checkpoint / clean restart / rollback | `6bc26cf035608a21a057d6f4e87da8d4f7f23d40` |
| Accepted Design V1.4 SHA-256 | `48e6afebfba53f65c03077a1ca27522f0245f17cbd0b3b46ff492929cf1e0c07` |
| Accepted Remediation V1.3 SHA-256 | `6f3868e860a5951951750d7b2e07a4ab7c777b8c9c772db0563348ea0ed7d0a7` |
| Frozen baseline | `31c0e405acfdd0d05200d0fb2531e897a541a2c4` |
| Frozen tag | `phase-1b-stage3-approved-2026-08-09` |

The corrected branch descends from `377181cd...`, which descends from `6bc26cf...`. No history is rewritten.

## 3. Decision and review inputs

The exact Owner instruction is recorded in [Three-Strike Owner Selection Record V1.0](PHASE_1B_STAGE4A_PHASE_B_THREE_STRIKE_OWNER_SELECTION_RECORD_V1_0.md):

> “批准 M02-D1-INCLUDE；批准 M03-D1-DISCRIMINATED-SEAM。”

The Fresh Independent Technical Escalation Re-review returned PASS at `377181cd...`:

| Artifact | SHA-256 |
|---|---|
| imported PASS report | `62089f2891049b3362876491b07e5ee22006629c905cf7d9d3360821414310d4` |
| imported PASS evidence | `309f4bb31aa88316c1738cdaf011043443c7e8179fa4917d7b30f0385b88eb40` |
| imported five-item manifest | `82a56ac807804f0765a6b3d30bd7dca77022d9e412f67838ba601ee3b0d834a8` |

The selected M02 and M03 machine authorities are respectively SHA-256 `264ca6358dcec00da5bc17e134c89e52d5321c87683212b8c32ba12756700b66` and `ce5bdd54c7924e86fcf36e89f10c96a039814366862382c2df81e0a15cf13141`.

## 4. Exact V1.4 → V1.5 change map

| V1.5 location | V1.4 disposition | Exact V1.5 change | Unchanged neighbors |
|---|---|---|---|
| title/status/identity | replace Candidate metadata | bind V1.5 to `377181cd...`, `6bc26cf...`, Owner selections and Fresh Independent Design Review | frozen baseline, Phase A and `0020` lineage |
| §1 | retain plus clarify | state selected M02/M03 proof additions and that text matching makes no Provider behavior claim | application-neutral core, three entry surfaces, Phase exit |
| §2.1 | add | bind Owner record and Fresh Technical Escalation PASS | all prior design-remediation evidence remains immutable |
| §2.2 | replace M02 proof boundary | name one selected 32-rule registry; define input/result domain, Unicode tuple, ASTs, gaps, counters, traversal, limits, compiler, corpus, mutations, consumers and future registration fail-closed | explicit-context scope and Draft-only security boundary |
| §2.3 | replace M03 proof boundary | state actual union/HKT shapes; exact generic factory; literal two-branch root; 12-class graph; protected/excluded roots; Phase D future edge and strict type proofs | application-private read scopes, binders and generic core |
| §2.4 | add | make Phase B/C/D/E allocation explicit after selection | frozen Phase plan |
| §6 | refine dependency graph | add sole outer Phase B root and selected registry/compiler flow | full V1.4 core/Draft/Synthetic graph |
| §7 | extend file plan | add future selected registry transport/compiler, trusted environment DTO, Phase B root, and required-absent Phase D/adapter paths | every V1.4 file responsibility |
| §13.6 | replace scanner wording | context calls the one selected compiled classifier; no local list | context limits and source policy |
| §14.3 A-07 | replace local list | A-07 calls the same compiled identity; no second token/structured/gap catalog | A-01..A-06 and A-08..A-10 |
| §19.3–19.5 | extend graph proof | exact root classes/acquisition fail-closed, M03 root/absence proof, M02 single identity; clarify static source scan is not classifier authority | transitive module/bundle rules |
| §20/§23 | extend verification | add exact M02 transition/runtime/mutation and M03 strict type/graph gates; preserve all V1.4 tests | every accepted quality gate |
| §22/§26 | replace gate language | implementation remains forbidden; next gate is Fresh Independent Design Review | implementation order retained as future plan only |
| §25 | extend complexity report | one compiled registry and one exhaustive switch, with no state/dependency/second authority | all accepted complexity/no-dual-authority findings |

The complete V1.5 document contains the entire retained V1.4 contract. No reader must concatenate V1.4 with this report or an escalation report to derive implementable behavior.

## 5. Closed finding preservation

The design-level contract map treats the following as preserved and mandatory: `H-01`, `H-02`, `M-01`, `M-02`, `M-03`, `M-04`, `M-05`, `M-06`, `L-01`, `N-M01`, `N-M02`, `N-M03`, and `N-M04`.

In particular:

- all four Production Draft Assistance use cases remain exact;
- application-neutral core and Draft-owned association/result/disposition remain separated;
- raw JSON framing, exact output schemas, mandatory completion, evidence/provenance and human-review boundaries remain unchanged;
- config resolution and Prompt byte authority remain unchanged;
- dual Draft binders and private scope construction remain unchanged;
- exact `ai_model_config` `21/21` and `ai_runs` `96/96` mapping tables remain in V1.5 without row mutation; and
- no complete RAG, vision, customer support, fallback, private Inquiry/CRM/file data, real Provider adapter or public-state authority appears.

## 6. Three-strike isolation

Failed implementation refs `755e514...`, `a696325...`, `b1a73bb...`, and `d8a24d...`, and diagnostic ref `f27cadf...`, are counterexample evidence only. None is a code source, parent, cherry-pick, compatibility target or implementation base. V1.5 derives from the accepted V1.4 checkpoint plus the independently passed technical contracts and Owner selections.

There is no attempt 4, no source change, no corrected implementation, and no reuse of failed classifiers, shadow policies, type erasure, wrappers or database seams.

## 7. Impact analysis

| Area | Impact |
|---|---|
| Schema / Migration / snapshot / journal | none |
| ADR | none; ADR-0018 remains unchanged and INCLUDE needs no security-exception ADR |
| dependency / package / lock | none |
| persistent coordination / new Complexity Approval | none |
| Provider/API/credential/network/spend | none; not authorized |
| SEO/URL/Redirect/Publish/Index | none |
| compatibility | manual editing and all non-AI paths remain unchanged; Phase B registry stays empty/disabled-first |
| operational state or data reconciliation | none |

If a later implementation cannot satisfy the selected contracts without changing one of these results, it must stop for Owner decision rather than generalize or layer a workaround.

## 8. Rollback

The design-authoring rollback is a normal revert of commits after branch parent `377181cd...`. The architecture rollback checkpoint remains accepted Design `6bc26cf...`. No Schema, data, Provider, credential, deployment or runtime state exists to reconcile. Imported independent PASS evidence and every accepted historical artifact remain immutable.

## 9. Verification contract

The offline corrected-design verifier must prove:

- all fixed hashes, ancestry and tag identities;
- imported PASS manifest 5/5 and byte identity;
- accepted V1.4 and Remediation V1.3 byte identity;
- exact selected M02/M03 authority hashes and Owner record;
- full selected M02 author verifier under the fixed runtime plus runtime-mismatch negative;
- strict M03 positive and both expected-negative TypeScript probes;
- exact 21/21 and 96/96 mapping rows;
- complete closed-finding and V1.4→V1.5 contract profile;
- docs/evidence-only delta, no prohibited paths, valid Markdown links/fences/final LF and owned-file whitespace;
- SHA-256 manifest and final clean worktree.

Immutable imported Reviewer Markdown may contain deliberate two-space hard breaks. Their bytes must not be rewritten. Any global whitespace diagnostic is reported separately from the strict check over V1.5-owned files.

## 10. Status and next gate

Status: **Corrected Exact Design V1.5 Candidate complete only when its manifest and captures pass; not self-approved; implementation not authorized.**

The next and only gate is Fresh Independent Design Review by the original Reviewer against the exact corrected-design commit. No implementation, merge, Push or later phase may begin before PASS.
