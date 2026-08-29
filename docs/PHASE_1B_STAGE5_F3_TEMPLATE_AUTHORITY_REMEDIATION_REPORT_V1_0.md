# CWT Phase 1B Stage 5 — S5-F3 Template Authority Remediation Report V1.0

| Field | Value |
|---|---|
| Date | 2026-08-29 (Asia/Shanghai) |
| Task | S5-F3 Template Authority — remediation attempt 1 for M-01, L-01, L-02 |
| Branch | `refs/heads/codex/phase-1b-stage5-f3-template-authority-v1` |
| Failed Candidate / rollback | `e2a25f2015c1472b39cf60288fe1106aea6466e1`; tree `5899aae8069e3c407e3e372b76baaf37317dc7a7` |
| Code/test checkpoint | `27a7f22073dc33d27314e7f530d17da658f23b0a`; tree `50f4e65614cad62ba2f8c30bd0848ccb7844609a` |
| Checkpoint sole parent | `e2a25f2015c1472b39cf60288fe1106aea6466e1` |
| Owner authorization | S5-F3 remediation attempt 1; SHA-256 `1e0f36107ccbf4aa144ae62f7f9ed15e3fd576c5ac8275272699c5a4ba87531e` |

Status represented by this document: bounded Implementer remediation completion
Candidate only. It is not independent re-review, Owner acceptance, Merge, Push,
Deploy, S5-F4, S5-F5, Provider, SMTP, Production, or external-action authority.

The final report-bearing Candidate identity and tree are intentionally supplied
in the terminal callback after this report and its sidecar are committed. A Git
commit cannot contain its own identity without changing that identity.

## 1. History and authority reproduction

The worktree began clean on the exact failed Candidate and existing branch. The
failed Candidate remains the sole parent of the remediation code/test
checkpoint and is therefore the exact rollback anchor.

The independent FAIL review is preserved as separate history at
`6efc77333568ecbb893309d60292313a3f04e007`. Its sole parent is the failed
Candidate, and `git merge-base --is-ancestor` returned exit `1`; the review-only
commit is not in Candidate ancestry. The review report at that commit reproduced
SHA-256 `010d06f6d93d655d50e7c6d70b1c55709571ef3cb6c61ba64868290f4dd2cde0`.

The new Owner authorization body reproduced SHA-256
`1e0f36107ccbf4aa144ae62f7f9ed15e3fd576c5ac8275272699c5a4ba87531e`,
and its adjacent sidecar passed `shasum -a 256 -c` before mutation.

This report does not edit or replace
`PHASE_1B_STAGE5_F3_TEMPLATE_AUTHORITY_IMPLEMENTATION_REPORT_V1_0.md`.
That original report and the independent review remain the failed historical
record. This report supersedes only the failed Candidate's current
implementation/evidence claim for the three authorized findings.

## 2. M-01 — causal architecture-verifier correction

The legitimate Template URL builders were left unchanged. No Template path,
position, resource, or URL was allowlisted, and no production/test source was
excluded.

The obsolete production-wide fixed assertion
`ordinaryGlobalUrlValues.length !== 21` was removed rather than rebased to the
current aggregate. The verifier still scans all Production executable sources
and retains:

- static resource candidate detection and exact static target resolution;
- unresolved/unsupported graph-edge rejection;
- denied capability origins and protected graph closure;
- protected-AI and Phase-D ambient runtime capability denial;
- sealed root exclusions, generated candidate controls, and unrelated
  fail-closed invariants.

The fixed URL invariant now belongs only to the governed boundary:
`protected-ai` and `phase-d-outer-composition` reject every ordinary global
`new URL(...)` outside the static resource graph. Ordinary URL construction in
unrelated Template, Product, CRM, Route, and application code remains scanned
and recorded but is not treated as AI architectural authority.

Three executable mutation probes run before the legacy Phase-D lineage guard:

1. an ordinary global URL inside `protected-ai` fails closed with
   `denied_capability_origin`;
2. a dynamic `new URL(resource, import.meta.url)` protected resource acquisition
   fails closed with `unsupported_acquisition_syntax`; and
3. ambient `fetch` inside `protected-ai` fails closed with
   `denied_capability_origin`.

The ignored `.next` directory is no longer recursively walked and compared to
an environment-specific three-file/hash snapshot. Its presence and unrelated
Build contents therefore cannot mask later source checks. The existing exact
`next-env.d.ts` byte/class/ignored-state/tsconfig contract remains fail closed
when present, and its exact generated import target is still resolved through a
canonical physical identity when present. A non-directory or symlinked `.next`
root still fails the sealed physical-root controls. The aggregate evidence labels
ignored Build output as non-authority instead of changing truth by lifecycle.

Both source-clean and post-Build executions reached the same later, inherited
Phase-D fixed-lineage diagnostic. That proves the full Production scan,
legitimate Template URLs, graph/resource checks, and the three new protected
mutation probes completed before the unchanged legacy diagnostic. A fresh
`.next` no longer changed or masked the result.

## 3. L-01 — exactly one canonical test prefix

The sole existing subject/envelope path now:

1. removes leading whitespace;
2. strips repeated leading exact uppercase `[TEST]` markers;
3. normalizes remaining leading whitespace; and
4. adds one canonical uppercase `[TEST]` marker.

The rule is case-sensitive. A mixed-case lookalike remains ordinary subject
text after the one authoritative uppercase marker. A marker-only subject
becomes exactly `[TEST]` without a trailing space.

Actual capture-transport composition proves:

| Input shape | Captured subject |
|---|---|
| leading whitespace plus repeated exact markers | one `[TEST]` plus rendered subject |
| repeated exact markers | one `[TEST]` plus rendered subject |
| mixed-case `[test]` lookalike | `[TEST] [test] ...` with one exact uppercase marker |
| exact marker-only subject | `[TEST]` |

The renderer, fixed recipient, trusted envelope, required attempt Audit,
event-only outcome Audit, exactly-one capture, and zero-retry path are unchanged.

## 4. L-02 — polluted Setting defenses

`email_template_active_v1` is now a strict discriminated source contract:

- `source = revision` requires a UUID `revisionId` and a positive integer
  `revisionVersion`; and
- `source = code_fallback` requires both fields to be exactly `null`.

Unknown fields remain rejected. Unit probes reject every one-field partial
combination for both sources. Direct database-pollution resolver probes also
store representative partial forms and prove a complete immutable exact code
fallback with `fallbackReason = active_invalid`, null revision provenance, and
only the sanitized key/kind/error-code signal. No custom/fallback field mixing
occurs.

Selected-Revision Synthetic Preview now selects and checks
`system_settings.isSensitive` before loading or rendering the Revision. A
direct database-pollution probe proves a sensitive Setting is rejected. The
Admin-only test-send service uses that same Preview path; its direct pollution
probe proves rejection before attempt Audit or capture, with zero captured
envelopes.

No Preview or test-send code reads Inquiry, Contact, Organization, CRM,
private-file, customer-record, or browser-provided operations URL data. The
fixed `SYNTHETIC_EMAIL_TEMPLATE_V1` context and existing role matrix are
unchanged.

## 5. Verification evidence

All database and transport data was conspicuously Synthetic. No browser,
SMTP/Provider, remote service, Production/Staging credential, or formal data
was used.

| Gate | Decisive result |
|---|---|
| Runtime guard | PASS; Node `v24.14.0`, Darwin ARM64 |
| L-01/L-02/Template focused composition | PASS; 3 files / 25 tests |
| Settings/Revision/Outbox/public-bundle focused regression | PASS; 5 files / 145 tests |
| Zero-warning lint | `pnpm lint` PASS |
| Strict TypeScript | `pnpm typecheck` PASS; Build TypeScript PASS |
| Source-clean architecture verifier | Executed with pinned local `node_modules`; M-01 scan/probes PASS through their location, then exit 1 only at the inherited unchanged Phase-D fixed-lineage guard |
| Source-clean exact broad command | `pnpm test:run`; 138 files passed, 11 skipped; 1029 tests passed, 85 skipped; exit 1 only for inherited Phase-D fixed-lineage child failure plus the known Vitest source-map JSON unhandled error |
| Corrected tracked NUL-safe manifest | PASS; 149 selected source files; 138 passed / 11 skipped; 1029 passed / 85 skipped; excluded only the exact obsolete Phase-F diagnostic integration test |
| Drizzle no-delta | PASS; 60 tables; `No schema changes, nothing to migrate`; protected pre/post hash `364de1c6e29ea4fe98fc27bdb5a691fb8eb50edb85752f793dc5ef3c831a3cb7` |
| Disposable PostgreSQL 18.4 | PASS; Fresh/Upgrade/repeat gates plus Template contention, versions `1..4`, sole Active pointer, Audit rollback, rollback-as-copy, Synthetic Preview, and one capture-only fixed-recipient test send |
| Isolated migrated/core-seeded Build | PASS; migration, core seed, optimized compile, strict TypeScript, 43 generated static pages |
| Public bundle | PASS; 380 eligible server runtime files, 20 public page manifests, 7 root chunks, 8 manifest chunks, 15 distinct chunks; Template markers absent |
| Post-Build exact broad command | Same 138/11 files and 1029/85 tests; same inherited fixed-lineage/source-map outcome; no `.next` file-set/hash failure and no new ordinary test failure |
| Diff/whitespace/protected scope | PASS; exact seven remediation code/test paths, `git diff --check` clean, no review-only ancestry and no prohibited domain/configuration mutation |
| Browser | NOT RUN by design and Owner authorization |

The exact broad command was not changed, caught, skipped, suppressed,
downgraded, or blessed. The old umbrella Low previously surfaced first as a
generated-root file-set mismatch. After the authorized causal correction, the
same pre-existing verifier (unchanged at that line) now reaches its historical
single-parent Phase-D lineage assumption, then Vitest emits the same inherited
source-map parsing error. These outcomes are reported as inherited Low evidence,
not PASS, and were not used to hide any new failure.

The PostgreSQL verifier used only `/Users/calvin/.docker/bin/docker`, the
already-local ARM64 `postgres:18.4-alpine` image
`sha256:9a8afca54e7861fd90fab5fdf4c42477a6b1cb7d293595148e674e0a3181de15`,
`--pull=never`, a random loopback-only host port, and Synthetic credentials.
The verifier removed both prefixed databases; the exact container was removed
by the command trap and a subsequent filtered `docker ps` returned empty.

The isolated Build database/storage directory was moved to macOS Trash after
the gate. The pre-Build `.next`, `next-env.d.ts`, and TypeScript build metadata
were also moved to the recoverable Trash path
`/Users/calvin/.Trash/cwt-s5f3-source-clean-sc39Er` to establish the
source-clean lifecycle. The fresh ignored Build output remains untracked
evidence only.

## 6. Exact bounded change scope

The remediation checkpoint changes exactly seven paths relative to the failed
Candidate:

1. `scripts/verify-ai-architecture.ts` — causal AI-boundary URL invariant,
   protected mutation probes, and generated-output lifecycle independence;
2. `src/email-templates/contracts.ts` — source-discriminated Active provenance;
3. `src/email-templates/contracts.test.ts` — complete partial-provenance matrix;
4. `src/email-templates/service.ts` — selected-Revision sensitive Setting guard;
5. `src/email-templates/service.integration.test.ts` — resolver and Preview
   direct database-pollution probes;
6. `src/email-templates/test-send.ts` — canonical exact-prefix normalization;
7. `src/email-templates/test-send.integration.test.ts` — prefix and inherited
   sensitive-Setting test-send composition probes.

This report and its sidecar are the only additions in the report-bearing
successor commit.

There is no Schema, Migration, Journal, snapshot, table, column, enum, index,
constraint, dependency, lockfile, CI, package script, permission, role, Inquiry,
CRM, Contact, Asset, Upload, Analytics, Provider, Outbox, Route, SEO, Product,
Content, Publish, Index, Admin UI, or browser-tool change. S5-F4 and S5-F5 were
not started.

## 7. Security & Test Simplification

- The obsolete global aggregate equality was deleted, not updated or layered
  with a Template exception.
- One protected boundary predicate reuses the existing TypeScript scan and
  graph error taxonomy; no manifest, policy engine, framework, or durable state
  was added.
- Generated Build output is no longer treated as reviewed source authority;
  the exact existing framework control and canonical target checks remain.
- One subject/envelope path remains authoritative for Preview/test send.
- One discriminated Active schema replaces the ambiguous cross-field
  refinement rather than adding a second validation path.
- Selected Preview and test send reuse one sensitive-Setting check through the
  existing service composition.

## 8. Open findings and terminal gate

No remediation-scope Blocker or new qualifying finding is known at bounded
Implementer handoff. This is an implementation statement, not self-review or
finding closure.

The inherited obsolete Phase-D fixed-lineage guard and Vitest source-map JSON
diagnostic remain openly recorded as Low broad-command evidence. They predate
the failed Candidate, are outside the authorized three-finding correction, and
were neither changed nor suppressed.

Rollback is the exact failed Candidate
`e2a25f2015c1472b39cf60288fe1106aea6466e1`. Reverting the remediation
code/test and report commits restores that state without Migration, durable
external state, or Provider cleanup.

The next gate is a different fresh Independent Reviewer covering only the
authorized re-review: M-01 verifier authority and fail-closed probes, L-01
prefix composition, L-02 provenance/sensitive Setting pollution, exact
PostgreSQL and broad-command evidence, ancestry/scope, and Security & Test
Simplification. Implementer completion does not close findings or authorize
S5-F4, S5-F5, or any external action.
