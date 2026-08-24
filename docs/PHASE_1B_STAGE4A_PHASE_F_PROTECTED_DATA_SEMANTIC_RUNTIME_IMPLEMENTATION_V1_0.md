# CWT Phase F Protected-Data Semantic Runtime Implementation V1.0

- Classification: **IMPLEMENTATION_CANDIDATE / NOT INDEPENDENTLY REVIEWED / NOT ACCEPTED**
- Operational status: **F1 provisioning remains HOLD**
- Branch: `codex/phase-f-minimal-experiment-v1`
- Authorized immutable parent: `744e903e5d013927a091668c4a9df6cf196b03aa`
- Parent tree: `8c3434ba70a22deb36d051f66887059d3c053098`
- Implementation commit: `2102fccebb949f078baa6aaa0bf22bfb703297a9`
- Implementation tree: `29301cd899c8292085111afd1b0715bd9318e970`
- Next gate: **Fresh Independent Code/Security Review of the exact immutable Candidate only**

## 1. Authority and result

The Owner-authorized deletion-shaped correction is implemented. The sole protected-data
classifier now accepts exactly the pinned Node/V8/ICU/Unicode/CLDR semantic fingerprint.
`platform` and `arch` no longer participate in classifier compilation or acceptance. The
unchanged V3.0 profile remains immutable history and inactive; one V3.1 successor is the sole
active profile.

This Candidate adds no OS/architecture allowlist, override, environment switch, fallback,
adapter, second classifier, compatibility layer, public export, persistent mechanism, Schema,
Migration, dependency, Product surface, Provider authority, or operational authority. It does
not authorize provisioning, external execution, Production, Push, Deploy, Publish, Index,
Phase F acceptance, or Phase G.

The containing packaging commit cannot cryptographically embed its own commit ID or tree in
this report without rewriting the report and changing that identity again. Therefore the
exact final packaged HEAD/tree is resolved after the report/sidecar commit and is supplied in
the mandatory Coordinator callback. The immutable implementation identity above and the
linear assertion `packaged HEAD^ = 2102fccebb949f078baa6aaa0bf22bfb703297a9`
make the package independently verifiable without amend, rebase, or history rewrite.

## 2. Starting gate and authorities

Before mutation, the worktree was clean at the exact authorized branch/HEAD/tree. Freeze ref
`codex/checkpoint/phase-e-accepted-v1` resolved to accepted P
`41dfc135f5f124e68aaac416c049c2e387e38d57` / tree
`f85182ad8d4519d58e1d829967cfc889b8f1e830`. Accepted P was an ancestor, failed T4/replacement
Candidates were not used as implementation bases, and Phase F provisioning resources/roots
`-a` through `-f` were absent.

The complete Design Erratum and Independent PASS were read and checksum-verified:

- Design: `e6cb1d12732ac7813bf049d34ff4f83b315dfabbfb5ce599b80274b3adf5e24d`;
- Independent Design/Security PASS:
  `64624470008746ab2ae083af76f00069f3df2ef6aa9b571fb1936a0d52b80863`.

Root `AGENTS.md` and `docs/ENGINEERING_GOVERNANCE.md` were applied. No network retrieval,
package installation, database, secret, Provider, credential, account, or external action was
used.

## 3. Exact implementation inventory

| Path | Delta | Bounded effect | Final SHA-256 |
|---|---:|---|---|
| `src/ai/context/protected-data.ts` | +1/-8 | Delete platform/arch from the exact runtime, private tuple, current projection, and match predicate | `d4daa1066b714531a04bf55148afdcda6049fe56d7a6ce287285bb87fa0ce838` |
| `src/ai/context/protected-data.test.ts` | +18/-10 | Five independent exact runtime mismatch cases; registry/corpus/security gates retained | `d99b52ffdb0e6cdc93ff452c7aaed134593718cbbf59a82d44e7136f4bf774c8` |
| `src/ai/applications/draft-assistance/context-integrity-profile.v3_1.json` | +1096 | Singular immutable V3.1 successor with five-field runtime | `aaad345536cb76d2312517c61ba317a130f3037926ee94cc02f7356be5219559` |
| `src/ai/applications/draft-assistance/context-integrity.ts` | +3/-3 | Sole production import/version/hash switch to V3.1 | `e09b779148a1bbbac9fb8857535ec037aeb5db0a3c3e86872ff653d82260574f` |
| `src/ai/applications/draft-assistance/context-integrity.test.ts` | +3/-3 | Sole fixture/version/hash switch to V3.1 | `8507096c8b2a4860a1cb73daa6ef3a6d964c33c3587a7d383a8ae83727c6febf` |
| `scripts/verify-ai-architecture.ts` | +7/-0 | Exact path/change-budget tuples only; no semantic rule change | `a5ce37660e49ebed2721175ae18221bccc554015f82826723b07dac5e6a925cd` |

The V3.1 compiled identity projection is exactly
`0b0237bd13be7d0ac48e00b5c6fa4ba0dd1abae55bfb7d67c499cb8c1f690087`.
All V3.1 semantic values equal V3.0 except profile version, removal of the two non-semantic
runtime keys, and the corresponding compiled hash. Repository tracing found only the V3.1
production/test imports; V3.0 is neither imported, compiled, merged, nor used as fallback.

Complexity decreased at runtime: seven acceptance fields became five. Runtime file count,
public export count, authority root count, dependency count, and persistent mechanism count
all changed by zero.

## 4. Focused and cross-platform verification

Focused verification passed before broad gates:

- `protected-data`, context-integrity, Draft context consumer, and output-policy/A-07:
  **4 files / 102 tests PASS**;
- static singularity: exact runtime/type/projection/comparison contain only
  `node`, `v8`, `icu`, `unicode`, `cldr`; zero `process.platform`/`process.arch` reads;
- registry: exact 32-rule bytes/identity preserved; 40/40 corpus cases, controls, traversal,
  structural/Unicode limits, gap `4/5`, aggregate `64/65`, five runtime mismatches, missing
  rule, and changed-gap gates pass/fail closed as specified;
- active profile: V3.1 only, version `3.1.0`, exact five runtime keys, compiled projection
  hash exact; V3.0 inactive and byte-identical;
- architecture checker: **PASS**, `ok: true`, 48 inherited mutations, seven Phase F runtime
  authority mutations, and the protected-boundary control preserved. A direct initial call
  correctly failed closed because `CWT_INSTALLED_NODE_MODULES` was absent; binding it to the
  existing pinned worktree `node_modules` produced the passing exact gate without install or
  checker relaxation.

The one-shot task-owned proof harness SHA-256 was
`fef66c5c21a3613016da9b5576f7dc143fb55d8bcf1a3bdc378a82eac84ceaaf`.
It bundled the actual Candidate classifier with existing local esbuild `0.25.12`; Candidate
and corpus/registry inputs were read-only. Both runs returned the exact accepted projection:

| Runtime | Observed tuple | Bytes | Semantic result SHA-256 | Result |
|---|---|---:|---|---|
| macOS ARM64 Node 24.14.0 | `24.14.0 / 13.6.233.17-node.41 / 78.2 / 17.0 / 48.0 / darwin / arm64` | 15,758 | `9cbbd0edd3a38cbcb1e50b0ab9f78931d27ff5559228187134914e9918c8126b` | PASS |
| cached Linux ARM64 | same five semantic values; `linux / arm64` metadata | 15,758 | `9cbbd0edd3a38cbcb1e50b0ab9f78931d27ff5559228187134914e9918c8126b` | PASS |

The Linux image was exact digest
`node:24.14.0-bookworm@sha256:5a593d74b632d1c6f816457477b6819760e13624455d587eef0fa418c8d0777b`,
with `--network none`, `--pull=never`, read-only mounts, and `--rm`. Both platforms executed
32 rule witnesses, 40 corpus cases, 12 unsupported traversal/limit cases, six mutation-negative
contracts, five compiler-conformance contracts, eight property contracts, and six generated
structural-limit contracts. Each semantic field mismatch and both registry mutations failed
closed independently.

## 5. Broad verification

Only after focused and cross-platform PASS:

- ESLint: **PASS**, zero warnings;
- TypeScript `tsc --noEmit`: **PASS**;
- `git diff --check`: **PASS**;
- full Vitest, run exactly once: **127 files / 864 tests PASS**, with 11 files / 81 tests
  skipped by the existing suite; duration 379.43 seconds.

Next build, Playwright/E2E, PostgreSQL/database, provisioning, Provider/network, and
`pnpm audit` were **NOT RUN**, exactly as authorized.

## 6. Preservation and cleanup

| Preserved item | Parent and final SHA-256 |
|---|---|
| `src/ai/context/protected-data-registry.v2_1.json` | `264ca6358dcec00da5bc17e134c89e52d5321c87683212b8c32ba12756700b66` |
| `context-integrity-profile.v3_0.json` | `f8b469b23cf688599589782ecdcf1580c92f1153aa5600c4692ded369ff36137` |
| `scripts/phase-f-bounded-bootstrap.ts` | `21b15c2fe90488664e087fd0bcf7f7b077ec1d4dce99f36e74a5c55dea95b3ee` |
| `scripts/phase-f-bounded-exercise.ts` | `dc72feb2920501240b8137fa5ab129e8be42dfd3f321b053cdaac7a3ef329ed6` |
| pricing source | `51d5996c73e388a28269603d19453a6003eda162863afb9c85a990c4ca67a93d` |
| `package.json` | `7fac662d864eb10703abb3d80eeec16bd48731ce43ce2b4240f3c57019e88943` |
| `pnpm-lock.yaml` | `fd9f24c7cc27d2faff8d08f98f815ac60876c45d4b51f32b81118da2e6b40266` |
| Draft context consumer | `dff00e64bfc956c475a8f56203b8ac13a71ce1b84a4abd80215c9eee6853f2c2` |
| output-policy consumer | `2c480b1ffee43b572b5198d1aa974f4e6c1c850f92d7a3689535da2ef5a745da` |

The task-owned proof directory, bundle, harness, output, and `--rm` container were removed.
No test process, task container, temporary output, credential, database, volume, network, or
provisioning resource remains. Unrelated pre-existing local Docker resources and historical
temporary build output were not modified.

## 7. Rollback, residual risk, and next gate

Rollback is the exact immutable parent
`744e903e5d013927a091668c4a9df6cf196b03aa` / tree
`8c3434ba70a22deb36d051f66887059d3c053098`. It restores the seven-field Linux rejection and
therefore also restores F1 HOLD; it is not an operational bypass.

Bounded residual risk remains as accepted by the Design: same-version runtimes can differ in
unrelated OS/process behavior, and finite Unicode corpus evidence is not an exhaustive proof.
Those concerns are outside this pure in-memory classifier and do not justify an allowlist,
compatibility mechanism, or second authority.

Open finding: **independent implementation review has not occurred**. This Candidate must not
be accepted or provisioned from this report. The next and only gate is Fresh Independent
Code/Security Review of the exact immutable packaged Candidate; F1 provisioning remains HOLD.
