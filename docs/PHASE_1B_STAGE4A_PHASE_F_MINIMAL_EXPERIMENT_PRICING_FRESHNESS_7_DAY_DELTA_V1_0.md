# CWT Phase F Pricing Freshness 7-Day Delta V1.0

## 1. Status and scope

**PRICING_DELTA_CANDIDATE / NOT INDEPENDENTLY REVIEWED / NOT ACCEPTED**

This report records the Project Owner-authorized pricing-only delta for the existing Strategy A Candidate. It replaces the fixed `CacheSplitPricingSnapshotV2` 24-hour freshness contract with exactly seven days (`604,800` seconds) and installs the already captured, independently PASS-reviewed 2026-08-23 DeepSeek peak-conservative snapshot.

This delta does not authorize or perform Provider retrieval, network access, credentials, Staging, materialization, activation, external execution, Production, Push, Deploy, Publish, Index, formal-data use, Phase F acceptance, checkpoint creation, or Phase G.

## 2. Exact identity and authority

| Item | Identity |
| --- | --- |
| Authorized parent HEAD/tree | `30cac106f561c5a0d8a7b1ed7b09ce046fcd2da7` / `5d474e89bf9fc367e1fc9230291702efe281861e` |
| Pricing code/test commit/tree | `e8ff76d63cd44e55e6b4ef4b5b22704cc4005892` / `0d0aa4667473079bd2a252f1d8b699924561eb63` |
| Branch | `codex/phase-f-minimal-experiment-v1` |
| Accepted P/freeze HEAD/tree | `41dfc135f5f124e68aaac416c049c2e387e38d57` / `f85182ad8d4519d58e1d829967cfc889b8f1e830` |
| T3 report SHA-256 | `83125812f12e4ca0f1892870c8309de3258a024da508fcd36c752a2b17a940e9` |
| T3 facts JSON SHA-256 | `9671cf6c8a2ec22a30d452d71887b5801521dcd0f5048ecd5bd98c112e9da359` |
| Independent T3 PASS SHA-256 | `6991d8b83f1f508753b85140d67a1b7500d5c31aff554fae7e8668106caa92b2` |

The authorized parent HEAD/tree, branch, clean worktree, accepted freeze identity, private runtime executable hashes, all three T3 evidence hashes, and the available adjacent sidecars were verified before mutation. History was appended only; no amend, rebase, rewrite, or freeze movement occurred.

## 3. Exact accepted snapshot

The Candidate now contains one static reviewed pricing authority for the accepted mapping:

| Field | Exact value |
| --- | --- |
| Provider/model | `deepseek` / `deepseek-v4-flash` |
| Model alias | `deepseek-v4-flash` |
| Published model version | `DeepSeek-V4-Flash-0731` |
| Cache-hit input | `14,000` microusd per 1M tokens |
| Cache-miss input | `440,000` microusd per 1M tokens |
| Output | `1,320,000` microusd per 1M tokens |
| Formula | `ceil-cache-split-v1` |
| Source URL | `https://api-docs.deepseek.com/quick_start/pricing/` |
| Source content SHA-256 | `d321546b99bc77060c1716c86228810e84ccfee6c157a3ee5aee5296a3cdec51` |
| Source version | `2026-08-23-deepseek-v4-flash-peak-conservative` |
| Effective/observed instant | `2026-08-23T10:23:53.657Z` |
| Freshness | `604,800` seconds |
| Inclusive current-through instant | `2026-08-30T10:23:53.657Z` |

The existing comparison remains singular: before the effective/observed instant is `pricing_stale`; the observed instant and the exact seven-day endpoint are current; one millisecond after the endpoint is `pricing_stale`. No alternate time source, dynamic refresh, override, stale exception, compatibility mode, or second pricing authority was added.

## 4. Exact changed-file inventory

The pricing code/test commit changes exactly seven authorized files:

| File | Change |
| --- | --- |
| `src/ai/runs/pricing-policy.ts` | Replace the V2 type/validation literal with exact `604,800`; preserve the existing inclusive comparison |
| `src/ai/runs/repository.ts` | Require and reconstruct exact `604,800` when persisted snapshots are reloaded |
| `src/integrations/ai/providers/deepseek-pricing.ts` | Replace the old snapshot with the exact independently reviewed 2026-08-23 mapping |
| `src/ai/runs/pricing-policy.test.ts` | Verify the new peak-rate cost arithmetic |
| `src/integrations/ai/providers/deepseek-pricing.test.ts` | Verify exact identity and before/start/inclusive-end/after-end freshness boundaries |
| `src/ai/runs/repository.integration.test.ts` | Verify PG persistence/reload and rejection of the superseded `86,400` value |
| `scripts/verify-ai-architecture.ts` | Mechanical new resource hash and exact pricing/report change-budget paths only |

This report and its adjacent sidecar are the only packaging files. There is no Schema, Migration, dependency/lockfile, ADR, Provider/API transport, public API, ObjectStorage, SEO, Publish/Index, CI, deployment, or runtime-executable change. New service, scheduler, loader, registry layer, time abstraction, compatibility path, persistent mechanism, public export, and runtime file counts are zero. Architecture rules and Phase F authority boundaries are unchanged.

Both private Strategy A executables remain byte-identical:

- bootstrap: `c0d01a8a4676d02088efc4765cd73dd5646ffd60d80c5e8c5b890076d4f14143`
- exercise: `dc72feb2920501240b8137fa5ab129e8be42dfd3f321b053cdaac7a3ef329ed6`

## 5. Cost and behavior proof

- Cache-split example, 6 cache-hit input tokens, 4 cache-miss input tokens, and 2 output tokens: `6` microusd after separate ceilings.
- Conservative incomplete-cache example, 10 cache-miss input tokens and 2 output tokens: `8` microusd.
- Existing 2,048 input / 64 output, one-attempt upper bound under the peak rates: `987` microusd.
- The per-run USD `0.02` cap, four-row USD `0.08` reservation cap, and same-day USD `5` backstop are unchanged; none of their authority files or executable values changed.
- Worker comparison continues to compare the complete stored and resolved V2 snapshot, including `max_age_seconds`; repository parsing and policy validation now agree on the single exact value.
- A disposable PostgreSQL `statement_timestamp()` of `2026-08-24 16:37:29.688332Z` resolved the exact snapshot successfully with source version `2026-08-23-deepseek-v4-flash-peak-conservative` and `max_age_seconds: 604800`.

## 6. Verification results

All required bounded gates passed:

| Gate | Result |
| --- | --- |
| Focused pricing-policy and DeepSeek pricing tests | PASS — 2 files, 5 tests |
| Focused config/Worker/Strategy A tests | PASS — 2 files passed, 1 environment-conditional file skipped; 13 tests passed, 3 skipped |
| PostgreSQL 17 exact persistence/reload proof | PASS — 1 test; 13 unrelated tests skipped |
| PostgreSQL 18 exact persistence/reload proof | PASS — 1 test; 13 unrelated tests skipped |
| PostgreSQL 17 single four-case fake-Provider Strategy A composition | PASS — 1 test; 2 unrelated tests skipped |
| PostgreSQL 18 single four-case fake-Provider Strategy A composition | PASS — 1 test; 2 unrelated tests skipped |
| Present DB-time snapshot resolution | PASS at `2026-08-24 16:37:29.688332Z` |
| Full Vitest, run exactly once | PASS — 127 files passed, 11 skipped; 857 tests passed, 77 skipped |
| ESLint | PASS |
| TypeScript `tsc --noEmit` | PASS |
| Exact AI architecture checker | PASS — `ok: true`; six Phase F runtime-authority mutations and one protected-boundary control preserved |
| `git diff --check` | PASS |
| Parent/freeze/ancestry/runtime hashes/changed-file budget | PASS |

Build and E2E were **NOT RUN** because the affected imports and runtime path supplied no concrete reason and the Owner did not require them. `pnpm audit` was **NOT RUN** as prohibited; there is no dependency delta and no network retrieval was performed.

## 7. Transparent harness observations

Four setup-only fail-closed results occurred before the final passing commands and were not hidden:

1. The first combined focused run encountered the expected old `pricing-policy.ts` architecture resource hash. The authorized mechanical hash/path classification was applied, and the same focused run passed.
2. A direct architecture invocation without `CWT_INSTALLED_NODE_MODULES` was rejected by the existing dependency-identity guard. Binding it to the current pinned `node_modules` directory produced the passing exact gate.
3. The first PG17 Strategy A attempt used a disposable database name outside the executable's required `cwt_phase_f_synthetic_*` pattern and was correctly refused as non-isolated. A new matching isolated disposable database was created; PG17 and PG18 then passed without changing or bypassing the executable guard.
4. The first standalone present-time probe omitted the existing `react-server` condition and was rejected by `server-only`. Re-running with the repository's normal server condition passed.

These observations required no Product/runtime workaround, protection weakening, additional mechanism, or external action.

## 8. Cleanup and rollback

The two disposable PostgreSQL containers, their local credentials, databases, and temporary state were removed after verification. No build artifact, test process, Provider credential, network session, Staging state, or external state remains.

Local rollback is the authorized parent `30cac106f561c5a0d8a7b1ed7b09ce046fcd2da7`. Reverting the pricing code/test commit restores the prior snapshot contract; no Schema or data rollback is required. There is no external rollback because no external action occurred.

## 9. Residual risk and next gate

- The reviewed snapshot fails closed immediately after `2026-08-30T10:23:53.657Z`; any later operational exercise requires a separately reviewed current snapshot or a new Owner decision.
- Peak-conservative static pricing may reserve more than an off-peak schedule, intentionally favoring the existing budget boundary over optimistic estimation.
- This implementation has not independently reviewed or accepted itself.

**Next gate:** Fresh Independent combined Pricing Delta Code/Security and Acceptance Review of the exact immutable Candidate only. Operational planning and execution remain paused pending PASS.
