# CWT Phase F Minimal Experiment Checker Remediation V1.2

## 1. Status and boundary

**REMEDIATION_CANDIDATE / NOT INDEPENDENTLY REVIEWED / NOT ACCEPTED**

This is the Owner-authorized final ordinary checker-only correction for H-01. It does not self-close H-01, reopen the independently closed CSR-01/CSR-02 findings, or authorize Fresh Acceptance or any operational gate. If the same H-01 root survives the next independent review, ordinary remediation stops; there is no A3.

## 2. Exact identity

| Item | Identity |
| --- | --- |
| Authorized A2 start HEAD/tree | `776a232a27677f4ce04416ee043201ed4b57af8a` / `d47e52dce9f04ea625d36861e53bc4d1aee613d0` |
| Prior checker commit/tree | `64e035a0e77ab736f9217f5c1fc1d3c2031bda13` / `1523ab4107e2b80b73960b868b767dd492ddff55` |
| A2 checker commit/tree | `12a86aa7cd9dcf035089b287b31b1efdb5d1cc2f` / `c35a531fb1c3334c2dd4b6b5e583b345c3013aa6` |
| Branch | `codex/phase-f-minimal-experiment-v1` |
| Accepted P/freeze | `41dfc135f5f124e68aaac416c049c2e387e38d57` / `f85182ad8d4519d58e1d829967cfc889b8f1e830` |
| Authoritative V1.1 re-review SHA-256 | `f27c09f0873d14a5d752ce7369bd8479f5dcdb5e6d03b7a0527f4231d49b4889` |

The re-review report and adjacent sidecar were verified before mutation. Starting HEAD/tree, branch, clean state, freeze and runtime hashes matched exactly.

## 3. Minimal code delta

The A2 code commit changes exactly the two authorized files:

| File | Delta | Change |
| --- | ---: | --- |
| `scripts/verify-ai-architecture.ts` | +13/-1 | One `scripts/**` runtime-target rejection, one exact probe, and the four exact V1.2 evidence paths in the existing change budget |
| `src/ai/phase-f-bounded-experiment.integration.test.ts` | +2/-1 | Require the new probe identity and six-probe count |

Both runtime executables remain byte-identical:

- bootstrap: `c0d01a8a4676d02088efc4765cd73dd5646ffd60d80c5e8c5b890076d4f14143`
- exercise: `dc72feb2920501240b8137fa5ab129e8be42dfd3f321b053cdaac7a3ef329ed6`

No Product, PostgreSQL test, Schema, Migration, dependency/lockfile, CI, ObjectStorage, ADR, public API, SEO, Publish/Index or deployment file changed. New framework, closure propagation, registry, mechanism, runtime file, persistent state and public export counts are zero.

## 4. Exact correction

Within the existing `enforcePhaseFLocalTarget` exact-source boundary, any local edge is rejected with:

- source: either exact Phase F executable;
- edge kind: `runtime`;
- immediate canonical target: any path below `scripts/`;
- result: `phase_f_runtime_authority_violation`;
- reason: `project_tooling_target`.

There is no exception or allowed tuple for `scripts/**`. No authority is propagated through closures. Existing direct test/evidence/protected/server/public probes, ten exact privileged tuples, eleven accepted Draft business pairs and the protected `canonical-json → db/client` control remain unchanged.

The new deterministic actual-path probe is exactly:

`scripts/phase-f-bounded-exercise.ts → import "./process-ai-runs" → scripts/process-ai-runs.ts`

It now fails closed before the existing Phase D CLI authority can be reached.

## 5. Focused verification

All focused gates passed against exact A2 checker commit `12a86aa7cd9dcf035089b287b31b1efdb5d1cc2f`:

| Gate | Result |
| --- | --- |
| Clean architecture gate | PASS — six Phase F adversarial probes and one protected control |
| Existing five direct probes | PASS — fail-closed with their preserved rules |
| `./process-ai-runs` probe | PASS — `phase_f_runtime_authority_violation/project_tooling_target` |
| Focused regression | PASS — 1 file, 6 tests |
| Approved current imports | PASS |
| ESLint | PASS |
| TypeScript `tsc --noEmit` | PASS |
| `git diff --check` | PASS |
| Runtime checksum, identity, ancestry and freeze checks | PASS |

PG17/18, combined fake Provider, full Vitest, RW-004, build, bundle, Playwright and `pnpm audit` were **NOT RUN**, exactly as required by the checker-only verification boundary.

## 6. Rollback and next gate

Local rollback is the authorized A2 parent `776a232a27677f4ce04416ee043201ed4b57af8a`. No external rollback exists because no Provider, account, credential, network, Staging, Production, Push, Deploy, Publish or Index action occurred.

**Next gate:** Fresh Independent checker-focused Re-review by the same reviewer. H-01 remains open pending that result. If the same root is still open, the required disposition is hard stop with no ordinary A3.
