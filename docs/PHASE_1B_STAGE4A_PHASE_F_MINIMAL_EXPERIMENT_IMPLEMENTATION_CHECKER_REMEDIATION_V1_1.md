# CWT Phase F Minimal Experiment Checker Remediation V1.1

## 1. Status

**REMEDIATION_CANDIDATE / NOT INDEPENDENTLY REVIEWED / NOT ACCEPTED**

This is the Owner-authorized checker-only remediation for independent finding H-01. It does not self-close H-01, reopen the independently closed CSR-01/CSR-02 findings, accept Phase F, or authorize Fresh Acceptance or operational execution.

## 2. Exact identity

| Item | Identity |
| --- | --- |
| Authorized remediation start HEAD/tree | `6a47054f7ad7015f241259bd00ee08e779e1ffff` / `300fc05bd88d888ebd5052aa6b4a1933a7b2c035` |
| Original implementation commit/tree | `49d14edc38b13b3e0c1351f4f99737ffbc556ada` / `8afbdf7a3651fc2fded296917a65ac461dbf8c50` |
| Checker remediation commit/tree | `64e035a0e77ab736f9217f5c1fc1d3c2031bda13` / `1523ab4107e2b80b73960b868b767dd492ddff55` |
| Branch | `codex/phase-f-minimal-experiment-v1` |
| Accepted P/freeze | `41dfc135f5f124e68aaac416c049c2e387e38d57` / tree `f85182ad8d4519d58e1d829967cfc889b8f1e830` |
| Independent FAIL report SHA-256 | `e6a017a9a200bbfda1c7b0b49ad5697e9f45e85d05d20c5b339c70614b72a129` |

The independent report and adjacent sidecar were verified before mutation. The starting branch, HEAD/tree, clean state, freeze identity and both runtime hashes matched the authorization exactly.

## 3. Mutation inventory and immutable boundaries

The remediation code commit changes exactly two authorized files:

| File | Delta | Purpose |
| --- | ---: | --- |
| `scripts/verify-ai-architecture.ts` | +148/-13 | Exact Phase F runtime-root enforcement, removal of broad exceptions, deterministic adversarial probes |
| `src/ai/phase-f-bounded-experiment.integration.test.ts` | +23 | Focused checker regression invoking the real clean gate and its self-probes |

Runtime executables remained byte-identical:

- bootstrap SHA-256: `c0d01a8a4676d02088efc4765cd73dd5646ffd60d80c5e8c5b890076d4f14143`
- exercise SHA-256: `dc72feb2920501240b8137fa5ab129e8be42dfd3f321b053cdaac7a3ef329ed6`

There is no Product, PostgreSQL test, Schema, Migration, dependency/lockfile, framework, CI, ObjectStorage, ADR, public API, SEO, Publish/Index or deployment mutation. New mechanism, export and runtime-file counts are zero.

## 4. H-01 root correction

The former checker classified both exact Phase F executables only as `other-project-tooling`. Its Production target ceiling therefore did not apply, while `exactPhaseFExecutableEdge` broadly exempted `src/ai/**` and Provider-directory targets.

The remediation replaces that behavior as follows:

1. The two exact executable paths are runtime-authority roots for TypeScript Program construction, static-language scanning, unresolved-edge enforcement and target enforcement. No directory or filename pattern creates this authority.
2. External imports from either root are closed to the two exact currently required runtime packages: `server-only` and `drizzle-orm`.
3. Local test/synthetic-test, evidence-only/documentation-only, `src/app/**`, `src/public-site/**` and direct `use client` targets fail unconditionally with `phase_f_runtime_authority_violation`.
4. Protected-AI, `src/server/ai/**` and Provider-adapter targets are privileged. Only the exercise executable's ten existing imports are accepted as exact `(source, form, edge kind, specifier, resolved target)` tuples. Bootstrap has no privileged-import exception.
5. The prefix-broad `exactPhaseFExecutableEdge` was deleted.
6. `acceptedDraftBusinessAiEdge` was narrowed from four source paths plus any `src/ai/**` target to eleven exact current accepted-P runtime source/target tuples. Type-only edges continue through the existing rule and were not broadened.

This reuses the existing graph resolution, canonical target identity, class metadata and `class_capability_violation` machinery. It adds no parallel scanner, policy registry, token, state machine or generic framework.

## 5. Required adversarial probes

The real checker now executes a fixed deterministic self-probe set on every run:

| Probe | Expected exact disposition | Result |
| --- | --- | --- |
| Phase F exercise → `@/ai/testing/accepted-draft-atomicity-harness` | `phase_f_runtime_authority_violation` / `test_only_target` | PASS — fail-closed |
| Phase F exercise → immutable evidence-only executable | `phase_f_runtime_authority_violation` / `evidence_only_target` | PASS — fail-closed |
| Phase F exercise → `@/ai/canonical-json` | `phase_f_runtime_authority_violation` / `unapproved_privileged_target` | PASS — fail-closed |
| Phase F exercise → extra Phase D server authority | `phase_f_runtime_authority_violation` / `unapproved_privileged_target` | PASS — fail-closed |
| Phase F exercise → public application page | `phase_f_runtime_authority_violation` / `public_client_or_browser_target` | PASS — fail-closed |
| Protected `src/ai/canonical-json.ts` → `@/db/client` control | preserved `class_capability_violation` | PASS — fail-closed |

The clean exact Candidate and every currently approved Phase F import pass the same checker. Checker output reports `phaseFRuntimeAuthorityMutationCount: 5` and `phaseFProtectedBoundaryControlCount: 1`.

## 6. Focused verification

All verification was run against exact checker commit `64e035a0e77ab736f9217f5c1fc1d3c2031bda13`:

| Gate | Result |
| --- | --- |
| Focused Vitest | PASS — 1 file, 6 tests, including the real checker regression |
| Clean architecture gate | PASS — 845 candidates, 532 executable nodes, five adversarial fail-closed probes, one protected control |
| ESLint | PASS |
| TypeScript `tsc --noEmit` | PASS |
| `git diff --check` | PASS |
| Runtime byte preservation | PASS — both authorized hashes unchanged |
| Starting ancestry/freeze/branch identity | PASS |
| Changed-file budget | PASS — checker and focused static test only before documentation closure |

Per the authorization boundary, PG17/18, combined fake Provider, full Vitest, RW-004, build, bundle, Playwright and `pnpm audit` were **NOT RUN**. Runtime/Product behavior is unchanged; the V1.0 results remain historical evidence only.

## 7. Rollback, residual risk and next gate

Rollback is the local parent `6a47054f7ad7015f241259bd00ee08e779e1ffff`; no rewrite is needed and no external rollback exists because no external action occurred.

Residual review focus:

- independently confirm each privileged tuple is necessary and exact;
- reproduce the H-01 test-only mutation against the immutable remediation Candidate;
- confirm Phase F root treatment does not weaken existing protected/public/evidence ceilings;
- confirm narrowing `acceptedDraftBusinessAiEdge` preserves only accepted-P current runtime edges.

No Staging, Provider, credential, account, network, Production, Push, Deploy, Publish or Index action occurred.

**Next gate:** Fresh Independent checker-focused Code/Security Re-review by the same independent reviewer. H-01 remains open until that reviewer passes the exact immutable remediation Candidate.
