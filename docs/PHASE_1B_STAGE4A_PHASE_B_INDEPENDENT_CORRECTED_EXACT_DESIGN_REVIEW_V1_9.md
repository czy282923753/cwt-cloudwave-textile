# CWT Stage 4A Phase B — Corrected Exact Design V1.9 Fresh Independent Review

## 1. Review result

- Review conclusion: **FAIL**
- Blocker: **0**
- High: **0**
- Medium: **2**
- Low: **0**
- External Validation: **0**
- Exact Candidate: `codex/phase-1b-stage4a-phase-b-corrected-design-v1-9` at `c0fe5b57100ff7fd83ef50b85288e6160397af80`
- Direct parent: `fcb060edb47c04187ccdaea4cb65b1032dffa828`
- V1.8 ancestor: `a2cd31f53c34dad479862a1c67260ab71fda9805`
- Review role: original independent Phase B Design Reviewer
- Review date: 2026-08-11 Asia/Shanghai
- Design implementation eligibility: **NOT ELIGIBLE**

V1.9 closes the contradictory claimed-replay order in V18-M02 and correctly maps traversal cardinality/profile failures into the existing `AiErrorCode` authority. It does not close V18-M01 or V18-M03 completely. The fixed TypeScript proof does not implement the design's claimed profile-derived bidirectional closure, and the fixed verifier's cached baseline profile can be mutated after compilation so protected evidence is accepted under a demoted domain without rechecking the sealed identity.

This result does not authorize implementation correction attempt 3, merge, Push, Provider work, or Phase C/D/E.

## 2. Identity, checkpoint, and scope disposition

All mandatory identity gates passed:

- the Candidate ref resolved exactly to `c0fe5b57100ff7fd83ef50b85288e6160397af80` and the formal Candidate worktree was clean;
- the direct parent, three-commit linear history, V1.8 ancestor, FAIL import commit, remediation content commit, and manifest seal were exact;
- the immutable checkpoint ref remained `b7ad96b24da45de00cae2cdb961a9aefcbc99496`;
- checkpoint record SHA-256 was `07e6c7a6335b34e1c5dd30411e38ff4d7610b4988a31cfd29a51e9f7d414b167`;
- `a90d642da38274ae3fab67ba4d8f284d8ddc5c35` was a direct child of the checkpoint and changed only the checkpoint record;
- the frozen annotated tag peeled to `31c0e405acfdd0d05200d0fb2531e897a541a2c4`;
- `a2cd31f...c0fe5b5` changed exactly 17 added paths and 5,945 lines, all under `docs/` or `docs/review-evidence/`;
- no source, script, test fixture, Schema, Migration, snapshot, journal, seed, ADR, package, lockfile, runtime, or configuration changed;
- Candidate manifest was 21/21 and the imported V1.8 independent FAIL manifest was 7/7;
- start-to-HEAD `git diff --check` exited 0.

The formal worktree remained untouched. Fresh probes were run only in a disposable detached exact-HEAD snapshot; its reviewer-created temporary files are not Candidate artifacts.

## 3. Fixed artifact verification

All supplied fixed hashes recomputed exactly:

| Artifact | SHA-256 |
|---|---|
| Standalone V1.9 Design | `9aea95b94c606e1c8ecdfaf23c92116868742ddd78f273e707107bd09f310f9c` |
| V1.9 remediation/derivation audit | `a3939f2e09d65bb4f3c26a778ff3880941a374df633ca3cce0bf0bd9e2146583` |
| Machine profile | `df86b16d1ec744f0996fdd8b6fbd05033008d89f6b12caf8d44675384630c945` |
| Fixed vectors | `f50c953f93fbc778c5e49ddee8242431b8e33eb213757240c7e1ff7e509e7667` |
| Fixed TypeScript probe | `d8198ba4d6a5d17b9d3e3ca0fd7605291846bee5910c928d1abca69bcc605816` |
| Author verifier | `d1450d9c0fcc65372a0ae7f9ab518cfebca440c97a7765d860eef0f47b236db7` |
| Captured verifier output | `0c4d4ed6aa69f3d8f4c49a31a1ad04a4e922958a636679070ce2919f9f89d703` |
| Fixed identities | `d681de25a4e9ae274ef5ddab63ade4ff9559aa0bdac6d428e5a6033403ef52e3` |
| Candidate manifest | `c3720593a4bd6cbcb23b21bfb3910402c076b00407ca0ed8bb23014837880808` |

The imported V1.8 FAIL report/evidence/challenge/output/manifest hashes also matched `556efabf...`, `9e29864e...`, `ed175fba...`, `b58ab3d1...`, and `73a08831...` respectively.

## 4. Finding dispositions

### V18-M01 — OPEN (Medium M-01): the fixed TypeScript proof does not implement the claimed closed-union contract

Exact locations:

- V1.9 §17, paragraph beginning “The design-level type proof imports the JSON profile”;
- `ERROR_TAXONOMY_CLOSED_UNION_PROBE_V1_0.ts`.

The runtime machine projection is internally sound: the profile lists the exact 69 `aiErrorCodes`, reproduces `aiFailure` category/retry/manual/default-message values, maps zero/multiple/profile mismatch to `context_provenance_mismatch`, and maps unknown caught failures to `internal_failure`.

The claimed TypeScript proof is not present. The fixed probe imports the profile but uses it only through `void profile`; it hard-codes five traversal codes and proves only that those literals are a subset of `AiErrorCode`. It does not derive `ProfileAiErrorCode`, does not compare the 69-member profile union bidirectionally with `AiErrorCode`, and does not implement the claimed inverse assertion.

A Fresh strict TypeScript probe implemented the literal §17 description. It exited 2 because a normal `resolveJsonModule` import widens `errorTaxonomy.codes[number].code` to `string`. Independently, the stated inverse between all 69 profile codes and the five traversal codes cannot be `never`; these are intentionally different sets. The author probe still exited 0 because it omits both failing claims.

Impact: the exact design and its fixed evidence disagree about how the unique error authority is compiled and proved. An implementer must guess whether to generate a literal typed derivative, rely on runtime equality, or redefine the selected traversal subset. This defeats the claimed exact, mechanically closed design gate and can allow future profile/source drift to pass the fixed TypeScript proof.

Required correction: specify one implementable proof without a second authority. If a type proof is retained, generate or import an `as const` derivative from the unique tuple, separately prove all profile codes equal `AiErrorCode`, and define the selected traversal subset explicitly before applying a bidirectional assertion. Otherwise make the exact 69-entry runtime comparison normative and remove the false TypeScript claim. The fixed probe and verifier output must accurately exercise the selected contract.

Root classification: same V18-M01 proof-authority root; not a new architecture root.

### V18-M02 — CLOSED

The machine profile contains exactly `CR-01..CR-14`. §13.2.3, §18.4, and the claimed rows of §18.5 reproduce the same IDs and order. Association/context shape, profile, recursive traversal, M02, JCS, and hashes complete in CR-03..CR-08 before config/Prompt/envelope/adapter resolution; config/Prompt/envelope complete before the sole adapter call at CR-13. Availability and preparation/enqueue remain separate sequences.

The Reviewer independently rejected four new mutations: context after config, a second adapter-call step, a missing context step, and a duplicate call step. No fallback or second call authority was found.

### V18-M03 — OPEN (Medium M-02): cached compilation does not seal the profile consumed by traversal

Exact locations:

- V1.9 §§1, 13.2.3, 20.3, 23, and 25 claims that every demotion/reclassification fails through the compiled identity before traversal;
- `VERIFY_CORRECTED_EXACT_DESIGN_V1_9.mjs`, `baselineProfileCompiled` and `compileProfile(candidateProfile)`.

The verifier correctly rejects demotions made to cloned profiles because it recomputes their identity. It does not seal the baseline profile that subsequent traversal consumes. After the first successful compile, `compileProfile(profile)` returns the same mutable JSON object without recomputing its identity whenever `baselineProfileCompiled` is true.

The Fresh challenge compiled the exact baseline, then changed the live `/task/guideIntent` assignment from protected to machine and supplied `sales@example.com`. Claimed validation accepted it and the child exited 97. A second independent variation demoted `/sources/*/fields/*/value/**` and accepted a nested email. In both cases the protected scanner was bypassed because traversal consumed the mutated cached profile. A cloned-profile demotion still changed the sealed SHA as expected, showing that the defect is specifically the post-compile mutable authority boundary.

Impact: the fixed evidence does not prove the Owner-required invariant that a demotion cannot weaken protected evidence scanning. The design leaves the compiler output's immutability/lifetime unspecified, while its own reference verifier demonstrates an unsafe compile-once cache. A future implementation following that example can turn a repository-reviewed profile into mutable runtime authority and accept prohibited context before adapter resolution.

Required correction: the sole validator must consume an immutable sealed compiled product. Either recompute/compare the identity on the exact value before each traversal, or deep-copy/deep-freeze a compiled representation and never traverse the mutable imported JSON. The fixed verifier must add post-compile in-place demotion/reclassification probes for scalar and recursive protected roots and require actual rejection. No parallel scanner, exception list, or compatibility path may be added.

Root classification: same V18-M03 compiled-profile/demotion proof root; not a new architecture root.

## 5. Non-regression and impact ruling

Non-regression passed for the bounded design review scope:

- Owner `IMP2-NM01-STRUCTURAL-INTEGRITY-DOMAIN` direction remains incorporated;
- M02-D1-INCLUDE remains exact hash `264ca6358dcec00da5bc17e134c89e52d5321c87683212b8c32ba12756700b66`, 32 rules, and one context/A-07 identity;
- M03-D1-DISCRIMINATED-SEAM remains profile hash `1f0b56a870ecbab61c970e1c7000dff591674e0f8ad0a04341538c724a36c173`;
- V1.7 historical closures and V1.8 non-findings remain unchanged;
- `ai_model_config` and `ai_runs` independently resolved to 21 and 96 columns; the offline AI-foundation verifier passed;
- input context shape/bytes, JCS/input hash, input-sources purpose, four Draft use cases, human-review-only status, exact-empty Production Prompt, and Provider-neutral Phase boundaries remain unchanged;
- no fallback, RAG, retrieval, vision, customer-support, private-data, Provider, network, durable Phase C runtime, public-state, Publish, or Index authority was introduced;
- implementation state remains NH01 closed and M01/M02/M04 open after attempt 2; this design review consumes no implementation attempt 3.

Impact disposition:

- Schema/Migration/snapshot/journal/seed: **none**;
- ADR: **none required**;
- dependency/package/lock: **none**;
- persistent coordination/Complexity Approval: **none**;
- SEO/URL/Redirect/public product behavior: **none**;
- formal data/import: **none**;
- new Owner decision: **none**.

## 6. Verification scope and process fidelity

Fresh verification used pinned Node `24.14.0`, V8 `13.6.233.17-node.41`, ICU `78.2`, Unicode `17.0`, CLDR `48.0`, Darwin arm64, and already installed local TypeScript/tsx dependencies. Network, registry, download, materialization, and Provider calls were zero.

The author verifier was run twice after a read-only local dependency link was added only to the disposable snapshot. Both runs exited 0, were byte-identical, and matched the checked-in capture. The Reviewer challenge was independent of the author mutation list and produced the two failures above.

One attempted package-script invocation stopped before its target because pnpm detected the disposable symlinked dependency layout and proposed a modules-directory purge; pnpm aborted non-interactively before any install/materialization. The Reviewer did not override that protection. The underlying read-only verifier was then invoked directly with the installed loader and passed. This is disclosed as a review-process exception, not a Candidate finding.

Full application Build/test was not run: the Candidate is docs/evidence-only and the relevant risks were identity, machine-profile semantics, strict TypeScript proof, recursive proof authority, Schema identity, and static scope. Running unrelated application suites would not cure or further localize either reproduced design defect.

## 7. Eligibility and next gate

Exact Candidate `c0fe5b57100ff7fd83ef50b85288e6160397af80` is **not eligible** for Phase B implementation correction attempt 3.

The next gate is a bounded docs/profile/verifier correction of V18-M01 and V18-M03, followed by another Fresh Independent Corrected Design Review against a new exact commit. V18-M02 remains closed and must not be redesigned. No implementation, merge, Push, Provider work, or Phase C/D/E may start from this result.
