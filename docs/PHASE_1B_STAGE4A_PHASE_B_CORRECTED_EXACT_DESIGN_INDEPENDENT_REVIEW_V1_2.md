# CWT Stage 4A Phase B — Corrected Exact Design V1.7 Fresh Independent Review V1.2

## 1. Review conclusion

**PASS**

The exact Corrected Exact Design V1.7 Candidate at `3f475e13d73d9d68a4dfb9a040941c57f1ee92e6` is sufficiently accurate, bounded and implementable to pass the Phase B corrected-design gate. `V15-M01` Attempt 2 is **CLOSED**. The Fresh official Next.js generation proof, the absent/present filesystem proof, the sealed 12-class selector contract and the generated-resource lifecycle are mutually consistent and reproducible without modifying the formal Candidate or relying on deletion.

Finding counts:

| Severity | Count |
|---|---:|
| Blocker | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |
| External Validation | 0 |

No Schema, Migration, ADR, dependency, package/lock, persistent Complexity Approval, SEO/URL or data decision is required. No new Owner decision is required.

## 2. Exact Candidate and isolation

- Branch/ref: `codex/phase-1b-stage4a-phase-b-corrected-design-v1`.
- Exact HEAD: `3f475e13d73d9d68a4dfb9a040941c57f1ee92e6`.
- Direct parent/lifecycle checkpoint: `595e2f9a5372b0ec682772b7fe379252845c29c4`.
- Attempt-2 import parent: `799b2dd4340c244d9f609942bd097acbb2ff6ecc`.
- Attempt-2 start/V1.6 HEAD: `49ba05ff0e40efce4ba8feb1bc87528414e3fad9`.
- Accepted rollback: `6bc26cf035608a21a057d6f4e87da8d4f7f23d40`.
- Frozen tag object/peel: `1c626f9b788e4c6ed0480a7040aa54ccef3e6c76` / `31c0e405acfdd0d05200d0fb2531e897a541a2c4`.
- Formal Candidate worktree: `/Users/calvin/.codex/worktrees/263d/CWT（CloudWave Textile）项目`.
- Detached reviewer worktree: `/tmp/cwt-corrected-design-v17-review.25FfwM`.
- Disposable official-lifecycle worktree: `/tmp/cwt-v17-reviewer-official-lifecycle.98ayba/repo`.

Identity, ref, parents, ancestry, tag peel and clean tracked state passed. Failed implementation V1/V2/V3 refs remain non-ancestors. The V1.6-to-V1.7 scope is exactly 16 added paths and 23,752 insertions, all confined to `docs/` and `docs/review-evidence/`; there are no source, config, test-fixture, Schema, Migration, ADR, package or lockfile changes.

The formal Candidate remained byte-identical and clean. `next-env.d.ts` remained absent there before and after review. Official framework generation occurred only in a disposable detached exact-HEAD worktree. Installation, download, package-registry access, network, Provider/API/credential/spend, Staging/Production, Deploy/Publish/Index/formal import, merge and Push were all zero.

## 3. Inputs and artifact integrity

The review completely read and applied the root `AGENTS.md`, `ENGINEERING_GOVERNANCE`, `REVIEW_POLICY`, ADR-0018, the Owner selection, accepted V1.4, V1.5 through V1.7 and their audits, both controlling FAIL packages, V2.2 profile, verifier, official proof and captures. Unchanged V1.6 material was byte-compared; V1.7 normative changes were read directly.

All fixed hashes matched, including:

- V1.7 design: `e432fbd96029c423e5f206cbd17c5abfc48518ce4254b36095a26537afd2c834`.
- audit: `a89c8ee2f42d1a1133bba00c13363a804140b65860dbebddf64f5bef979ea2d1`.
- profile V2.2: `1f0b56a870ecbab61c970e1c7000dff591674e0f8ad0a04341538c724a36c173`.
- verifier: `d4043c6d39459d2d431afd129e5cad6ea7b2df7cfe09bfc1f15db3cd1001de63`.
- official typegen proof: `bf7495a98a95ac543b65c8e007471fbd790be05843a933f51f98f3760ebf0b37`.
- absent capture: `9af475cd554b48abf336d9e95838cd0f20bcb5cb6a260f89452b036139caaf60`.
- present and repeat captures: `d8a4fef3e3dae2fff5e7cda7a91730e96814c64b57961cd2a8842aea4be2a16f`.
- generated `next-env.d.ts` bytes: `7b550dda9686c16f36a17bf9051d5dbf31e98555b30d114ac49fc49a1e712651`.
- verifier capture: `536f3ae2fe45c7f6a7a9805e438aa4839da1bd44153a819301ac4247b3e3f37f`.
- V1.7 manifest: `f10a9eacfc40d8aa3be8cd0c495736d47de957f99cd999280409b3c09de2f1e0`.

Manifest verification passed: V1.7 31/31, imported V1.6 FAIL 4/4, V1.6 28/28 and V1.5 22/22. Imported review artifacts remained byte-identical. Profile integrity independently recomputed to `ff40d348d7b23c0a3e9156d5c5eec3236fae879e13fc44153004778d9d3eae0f`.

## 4. Fresh official generation proof

Using installed Node `24.14.0` and public installed Next.js `16.2.12`, the ordinary `next typegen .` CLI was run twice in the disposable exact-HEAD worktree with telemetry disabled and no cleanup between runs. Both runs exited 0 and produced the normal framework success output.

The first run created a regular, Git-ignored and `tsconfig`-included `next-env.d.ts`; the second run reproduced it without deletion. Its exact size was 247 bytes and SHA-256 was `7b550dda9686c16f36a17bf9051d5dbf31e98555b30d114ac49fc49a1e712651`. It matched only `root-control-file`, was marked generated, and entered neither Production runtime nor public/server closure.

The sealed generated `.next/types` set was stable across both runs:

| Path | Bytes | SHA-256 |
|---|---:|---|
| `.next/types/cache-life.d.ts` | 5,854 | `d1986184a09a52db8228cb2bb2a61a8c05c9354e5b93cec8e2628d8579c892d7` |
| `.next/types/routes.d.ts` | 6,832 | `e838150498c7e8464a1a0d7e25d7dfc79aa6f77358a8d83ac0aa7b28c5904fb4` |
| `.next/types/validator.ts` | 26,616 | `8ed142360153811ab434bbd2f2486b0052d9d5bbdcf067d206fc8d7eb15f28df` |

Generated-root SHA-256 was `fc4e44647d4941f5f392d80cb98db04227995133cb23ee99d2c2c3df501caccb` in both states. The proof therefore demonstrates a normal, repeatable framework lifecycle, not a handwritten or delete-to-pass artifact.

## 5. Independent filesystem and selector proof

The reviewer independently implemented a raw sorted `lstat` walk and hash reconstruction without importing the author verifier or project implementation code.

| State | Candidates / executables | Source states | zero / ambiguous |
|---|---:|---|---|
| absent | 406 / 364 | 406 tracked, 0 untracked, 0 ignored | `[]` / `[]` |
| generated present | 407 / 365 | 406 tracked, 0 untracked, 1 ignored | `[]` / `[]` |

No additional ignored or untracked candidate was omitted. Independent inventory/content/classification hashes matched the documented semantic state. `node_modules/` and `.next/` remained exact excluded physical roots; only the generated root `next-env.d.ts` joined the Candidate set.

Only the causal `root-control-file` selector accepts `next-env.d.ts`. It is not a six-path whitelist, a general ignored-TypeScript allowance, a wildcard or a second authority. Its capability ceiling permits only sealed framework type declarations and grants no Provider, adapter, endpoint, credential, network, Production runtime, public bundle or server bundle authority.

All 28 author-declared mutations were independently recreated and failed closed. Fresh unnamed challenges also rejected misleading suffixes and prefixes, CRLF/extra-reference byte drift, tracked or ordinary-untracked lifecycle states, extra generated nodes and path-alias lookalikes. Original six path dispositions and `src/test/**` classifications remained exact.

## 6. Non-regression rulings

- `V15-M01` Attempt 2: **CLOSED**.
- Official Next generation proof: **PASS**.
- M02-D1-INCLUDE: **PASS**, exactly 32 rules, 30 common plus two DeepSeek-only; Unicode transition and persisted-byte boundaries did not regress.
- M03-D1-DISCRIMINATED-SEAM: **PASS**. Both positives compiled; unnarrowed union, cross-driver and destructured negatives failed with `TS2375` as designed.
- `ai_model_config`: **21/21**; `ai_runs`: **96/96**, exact accepted order and no Schema assumption.
- H-01, H-02, M-01 through M-06, L-01 and N-M01 through N-M04: **CLOSED / no regression**.
- Exactly four Draft Assistance use cases, `human_review_required`, no fallback/RAG/vision/customer_support/private data, no Provider/network and Phase B/C/D/E separation: **PASS**.
- Owner selections remain exactly `M02-D1-INCLUDE` and `M03-D1-DISCRIMINATED-SEAM`; no additional scope or implementation permission was inferred.

## 7. Findings and impacts

There are no open findings and no External Validation item. The generated-lifecycle contract is deterministic under the exact pinned runtime and locally installed framework version, and the Candidate explicitly fails closed on drift.

Impacts:

- Schema/Migration: none.
- ADR: none.
- dependency/package/lock: none.
- persistent coordination or Complexity Approval: none.
- SEO/URL/Redirect: none.
- formal Product/customer data: none.
- Owner decision: none pending.

## 8. Eligibility and next gate

Exact commit `3f475e13d73d9d68a4dfb9a040941c57f1ee92e6` is **implementation eligible at the corrected-design gate only**.

PASS authorizes only the Coordinator to accept the Corrected Exact Design V1.7 gate and, under a separately authorized task, create a fresh Phase B implementation Candidate from the accepted checkpoint. It does not start implementation, accept a future implementation, authorize Phase C/D/E or permit any external action.

