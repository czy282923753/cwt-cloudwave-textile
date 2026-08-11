# CWT Stage 4A Phase B — V2.2 Fresh Implementation Needs Owner Decision V1.0

Status: **NEEDS_OWNER_DECISION / PARTIAL CANDIDATE / NOT ACCEPTED**

Date: 2026-08-11 (Asia/Shanghai)

## 1. Immutable start and checkpoint

- accepted start and immutable pre-L3 ref: `9aa9735f422975780585e62eaec1a4759f9894c9`;
- start parent: `156cbafc061d36ce2395529a3150b0c974f3c603`;
- start tree: `33b01e701ac279b9a04868c7b14b068c84cc81b5`;
- fresh checkpoint-record commit: `414ead493e351d48f82847404a6161f85d55a246`;
- checkpoint-record parent/tree: `9aa9735f422975780585e62eaec1a4759f9894c9` / `11c422303e7cc7669873813e2f7464d4eda738c7`;
- immutable ref: `refs/heads/codex/checkpoint/phase-1b-stage4a-phase-b-v2-2-fresh-implementation-pre-l3-v1`;
- implementation branch: `codex/phase-1b-stage4a-phase-b-v2-2-fresh-replacement-implementation-v1`.

The immutable ref was verified before and after the implementation mutation and remains at the accepted start. No merge, cherry-pick, amend, rebase, history rewrite, push, install, materialization, network request or Provider call occurred.

## 2. Completed bounded work

M02 replacement commit `6d21a1fce8701ab25b93bb1b797173ef0003b5de` is a direct linear successor of the checkpoint-record commit. It replaces the edge/deletion/ordered-core family logic with the sole position-insensitive Unicode token-multiset relation, adds schema-directed preorder collection, applies the `1,826` EvidenceText and `60` block ceilings, and retains exact-text, canonical-block, token, byte, run, A-07 and mandatory human-review boundaries.

Verification completed for this bounded commit:

- `src/ai/output/common.test.ts`: `24/24` PASS;
- all `src/ai/output` tests: `54/54` PASS;
- focused ESLint: PASS;
- strict `tsc --noEmit`: PASS;
- `git diff --check`: PASS.

The already-installed Node `24.14.0`, TypeScript `5.9.3`, Vitest `4.1.10`, ICU `78.2`, Unicode `17.0` and CLDR `48.0` were exposed through a temporary symlink to an existing installed dependency tree. The symlink was removed after each command. No package manager ran and no dependency bytes were installed or generated.

## 3. Blocking accepted-contract conflict

The accepted V3.1 authority denies `capture or alias of globalThis` and permits only direct named non-loader property access after any required `src/db/client.ts` mechanical convergence. The current accepted-start Product source contains:

```ts
const globalDatabase = globalThis as typeof globalThis & {
  cwtDatabaseConnection?: DatabaseConnection;
};
```

It then reads and writes the cached connection through the `globalDatabase` alias. The exact current file SHA-256 is `fda8e496113f7d7658e94942d6f93c392fcaf403fcfd77a888852d0f18207800`.

A faithful M04 V3.1 origin scan must reject this Production executable before reachability. Passing it would require an unaccepted exception, compatibility path or weakened origin rule. Replacing it with direct named `globalThis.cwtDatabaseConnection` access requires a mutation to `src/db/client.ts` and potentially a focused colocated test.

The current implementation authorization permits mutations only under `src/ai/**`, the existing `src/server/ai/**` composition when required, `scripts/verify-ai-architecture.ts`, `test-fixtures/ai-architecture/**`, and versioned `docs/**`. It explicitly requires `NEEDS_OWNER_DECISION/BLOCKED` when a required mutation falls outside that allowlist. The embedded V3.1 `implementationAllowlist` likewise marks all other Product/runtime paths forbidden and requires owner decision before expansion.

Therefore no M04 checker/fixture, NM01, M01 reconstruction, final evidence authority or proof bundle was implemented after discovering this conflict. Doing so would either knowingly build an architecture gate that rejects the accepted tree or conceal the required Product mutation.

## 4. Exact decision required

The Coordinator/Owner must choose one of the following before a continuation task:

1. expand the implementation allowlist narrowly to `src/db/client.ts` and a pre-existing or specifically named colocated focused test, authorizing only the direct-named-property mechanical convergence required by V3.1 while preserving database behavior; or
2. issue an accepted V3.1 Design/profile successor that changes the global acquisition boundary, with the required architecture review and rollback detail.

No broader database, connection, Schema, Migration, environment or compatibility change is requested or implied. The first option is the bounded recommendation because it preserves the selected static capability boundary without adding a second authority.

## 5. Rollback and review state

This branch is a partial, unaccepted Candidate and is not eligible for Fresh Independent Implementation Review yet. Before acceptance, rollback remains abandoning this branch and recreating from immutable start `9aa9735f422975780585e62eaec1a4759f9894c9`; the checkpoint ref must never move. If the allowlist is expanded, continuation must remain linear, independently reconstruct the direct access, complete M04/NM01/M01 and exact evidence, then request Fresh Independent Implementation Review. This record is not a review or approval.
