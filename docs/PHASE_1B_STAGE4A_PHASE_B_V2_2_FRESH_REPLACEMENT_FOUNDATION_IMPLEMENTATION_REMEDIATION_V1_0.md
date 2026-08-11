# CWT Stage 4A Phase B V2.2 Fresh Replacement Implementation Remediation V1.0

Status: **Corrected Candidate complete; Fresh Independent Implementation Re-review required. Not accepted.**

This Markdown file is explanatory only. The canonical current authority is `H01_H02_REMEDIATION_AUTHORITY_V1_0.json`; the current SHA-256 manifest and verifier are the integrity boundary. This correction is attempt 1 for H-01 and H-02 and does not self-approve either finding.

## Identity and scope

- Failed Candidate preserved at `b95390c34fc4fe687f6e7577a7505a7394bca80b`; failed code HEAD `4ce25e422b79bda62d0489d906e3e871a6279af9`.
- Remediation branch: `codex/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-implementation-remediation-v1`.
- Exact corrected code HEAD: `8cd768fada5da140d62aa48b7efc02d60cf1758b`; parent `8c43df1719fb550f9849ee6dd26e169a351e0339`; tree `242b1b8eeff9c38bc872d0f56a1e7bcaf2592752`.
- The two linear commits are `8c43df1…` for H-01 and `8cd768f…` for H-02. There are no merge commits and no history rewrite.
- Relative to the failed Candidate, exactly four Product-code paths changed: the sole architecture gate, its V3.1 fixture, the NH01 composition, and the existing Provider-neutral integration test. Added/deleted Product-code paths: zero.
- The failed Candidate ref and all existing checkpoints remain unmoved. No new checkpoint was created, as directed.

## Corrections

H-01 is closed in the single existing M04 gate. Production now permits only direct, statically named, non-optional `globalThis.cwtDatabaseConnection` access at exact path `src/db/client.ts`. Every other `globalThis` origin fails before reachability. The exact Reviewer `globalThis.fetch("https://api.deepseek.com")` witness plus wrong-path approved-member, wrong-member approved-path, computed, destructured, aliased, and static-field variants all produce `denied_capability_origin`. The direct DB convergence and its focused behavior remain byte-identical.

H-02 is closed by placing non-admin authoritative Revision entity-type record scope before distinguishable malformed structure and downstream target details. Missing, malformed, wrong-type, wrong-actor, and wrong-version variants for an actor that has not passed scope all collapse to `authorization_denied`. Authorized Product/Content editors and Admin still pass the valid Draft/Revision paths; authorized version mismatches remain `target_version_conflict`, and Admin may receive `target_scope_mismatch` for a malformed authoritative row only after authorization. The availability path retains one target read, zero locks, and one authorization authority.

## Verification

- Exact pre-correction Reviewer failures were reproduced: H-01 gate exit 0 for the protected `globalThis.fetch` witness; H-02 returned `target_scope_mismatch` for malformed existing versus `authorization_denied` for missing.
- H-02 real-service disposable-database matrix: 6/6 test cases passed, including 21 valid/denied/conflict/admin matrix invocations.
- All `src/ai` tests: 14/14 files and 163/163 tests passed.
- Focused DB convergence, 0020/schema, `FEATURE_AI=false`, noindex, public pagination/publication and public-bundle tests: 8/8 files and 12/12 tests passed.
- Repository ESLint passed with zero warnings. Strict TypeScript passed in source-clean and official Next typegen states.
- Accepted 0020 foundation verifier passed. Independent Schema extraction remains `ai_model_config=21/21` and `ai_runs=96/96`, exact order. The accepted V2.2 package verifier returned `PACKAGE_CONSISTENCY_PASS_NOT_INDEPENDENT_ACCEPTANCE`.
- Prompt bundle and protected Prompt history passed; Production Prompt manifest and Provider registry remain exact-empty.
- Official Next 16.2.12 typegen passed with telemetry and network denied; exact `next-env.d.ts` SHA-256 is `7b550dda…`.
- The isolated Next webpack server/public fixture passed under OS-level network denial: 51 server files, 16 public client chunks, three server markers, raw Synthetic Prompt retained server-only, and positive leak control passed.
- The sole M04 gate passed at the exact code HEAD with 612 candidates, 469 executables, zero unclassified/ambiguous, 21 ordinary URL values, 39 fault probes, 5 positive probes, 2 positive and 6 expected-negative type seams, 28 lifecycle mutations, bundle proof ready, and exactly five artifacts.

The broader full Vitest suite was not rerun. The task expressly limits broader/full execution to the actual correction scope; all 163 AI tests, the real-service matrix, actual-tree gate, targeted preserved-boundary tests, repository lint, and strict typecheck cover the two causal changes without expanding the remediation.

## Preserved closures and exceptions

The remediation diff is empty for all `src/db/**`, public Product/SEO/URL/Redirect/font/pagination, Production Prompt/Provider, Schema/Migration/snapshot/journal/seed, package/lock/dependency and config paths. M02, NM01, M01, M03, M05, L01 and L02 remain byte/semantically closed; no Phase C/D/E or Provider/API/credential/network path was added.

The isolated fixture’s default Turbopack mode rejected the external pinned dependency symlink before compilation. The accepted installed Next webpack path was selected explicitly and passed under the same network denial. Standalone tracing created an untracked `2a07/` dependency trace plus fixture `next-env.d.ts`; those exact generated outputs were removed before clean-HEAD proof emission. The unrelated public build’s unchanged Google Font offline debt remains disclosed and was not modified or claimed fixed.

The controlling independent FAIL report and its seven evidence entries are imported at their original relative paths and reverify byte-identically against original manifest SHA-256 `506276ef…`.

## Next gate

Stop for Fresh Independent Implementation Re-review. It must begin with `REMEDIATION_FINDINGS_REVIEW` for H-01 and H-02 and audit all preserved-closed DB convergence, M02, M04, NM01, M01, NH01, M03, M05, L01 and L02 boundaries, then decide `FULL_REVIEW_NECESSITY` with rationale. Identity, checkpoint, manifest, frozen-boundary and security checks remain mandatory.
