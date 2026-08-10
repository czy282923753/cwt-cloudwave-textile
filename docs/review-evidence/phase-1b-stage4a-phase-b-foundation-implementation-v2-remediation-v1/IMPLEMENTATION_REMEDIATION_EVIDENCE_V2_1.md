# Phase B Foundation Implementation V2 Remediation V1 Evidence V2.1

## 1. Identity and evidence boundary

- Remediation branch: `codex/phase-1b-stage4a-phase-b-foundation-implementation-v2-remediation-v1`.
- Failed Candidate retained at: `0d5b067c0912290ffd91d4d34b064d9c8dacd712`.
- Exact design start and full rollback: `3f475e13d73d9d68a4dfb9a040941c57f1ee92e6`.
- Exact final code HEAD for every final executable capture in this directory:
  `12817e6727ee2308ea8481d9f0153048f1ce9f18`.
- Report, evidence, manifest, and aggregate commits are documentation-only successors. They do not change source,
  tests, configuration, package, lockfile, Schema, Migration, snapshot, or journal bytes from that code HEAD.
- Verification used Node `24.14.0`, TypeScript `5.9.3`, and Next `16.2.12` already present in the worktree.

The four V2.2 graph proof artifacts and both Next lifecycle captures were produced from a disposable detached
worktree at the exact code HEAD. Its top-level `node_modules` was a physical excluded directory containing links to
the already installed dependencies; no dependency installation, store materialization, lock change, download, or
registry access occurred.

## 2. Finding closure

| Finding | Corrected boundary | Direct evidence |
|---|---|---|
| IMP2-M01 | One Draft context policy now owns exact Product field/provenance/value rules, 8/20 class maxima, ordered source identity persistence, per-use-case durable revalidation, four Prompt-variable contracts, and JCS hashes across preparation and claimed reconstruction. | `FOCUSED_AI_TESTS_V2_1.txt`, `SECURITY_CONTEXT_OUTPUT_TESTS_V2_1.txt`, `AUTHORITY_AND_REVIEWER_PROBES_V2_1.txt` |
| IMP2-M02 | A-03 evidence refs derive from that policy; Product Description rejects Company Fact; MOQ uses the adjacent two-ref contract; A-08 deterministically rejects repeated/spam proposals. | Same focused/security captures; Reviewer probe reports both Company Fact and 30-paragraph spam as rejected. |
| IMP2-M03 | The common database capability is exactly `Pick<AppDatabase<T>, "select">`; typed Drizzle selection supplies the complete config aggregate; `execute` is absent from the carrier/helpers/repository/facade. | `TYPE_BOUNDARY_PROBES_V2_1.txt` and exact 21/21 mapping in `AUTHORITY_AND_REVIEWER_PROBES_V2_1.txt` |
| IMP2-M04 | The sole architecture gate now builds the bounded transitive import/re-export/package/resource graph, applies class capability ceilings, rejects unsupported acquisition, exercises 11 real graph faults plus 28 lifecycle mutations, and emits the four required V2.2 proofs. | `ARCHITECTURE_GATE_CODE_HEAD_V2_1.json` and the four `AI_*_PROOF/MANIFEST_V2_2.json` files |
| IMP2-M05 | The four authorized public files are byte-identical to exact design start, and the Candidate-only pagination module is absent. Build proof is isolated to the AI server fixture and does not modify or claim a full public-site build. | `PUBLIC_BASELINE_IDENTITY_V2_1.txt`, `AI_ISOLATED_SERVER_BUILD_V2_1.txt`, `SERVER_BUNDLE_BOUNDARY_V2_1.json` |
| IMP2-L01 | Phase B Production construction returns an availability-only object with no callable request placeholder. Shared request types/codecs remain foundation contracts for a future authorized Phase C port. | `FOCUSED_AI_TESTS_V2_1.txt`; runtime test asserts the sole object key and absence of `requestDraftAssistance`. |
| IMP2-L02 | Counts and captures are fresh at the exact code HEAD; historical local-store materialization and failed TLS attempts remain disclosed; all remediation execution used installed binaries without network or install activity. | This evidence package and the implementation remediation report. |

The immutable Reviewer probe's field `inputHashMatchesPrepared` remains `false` because that old probe compares the
removed Provider variable `input_hash` with the prepared hash. V1.7 requires no `input_hash` Provider variable. The
new exact Product variable keys are `locale`, `media_placement_refs_json`, `product_context_json`, and
`requested_tone`; checked-in tests prove the accepted JCS hash and variables are byte-identical across preparation,
JSONB-shaped round trip, and claimed reconstruction.

## 3. Final verification results

| Gate | Result at code HEAD |
|---|---|
| Focused AI | PASS, 13 files / 138 tests |
| Security/context/output subset | PASS, 5 files / 110 tests |
| Full suite | PASS, 111 files / 555 tests |
| lint | PASS, exit 0, zero warnings |
| strict typecheck | PASS, exit 0 |
| accepted 0020 verifier | PASS, design identity, 40 historical artifacts, journal append, exact columns/defaults/nullability/types/constraints/indexes/scope |
| independent Schema mapping | PASS, `ai_model_config=21/21`, `ai_runs=96/96`, exact order |
| Prompt bundle/history | PASS; Production manifest remains exact-empty; protected history unchanged from `6bc26cf...` |
| raw JSON | PASS: duplicate, normalized duplicate, fence, concatenation, truncation, byte/member boundaries |
| M02/Context/Output | PASS: Unicode variants, per-gap 4/5, total 64/65, false-positive corpus, Product provenance, aggregate limits, cross-use-case and repetition vectors |
| M03 types | PASS: 2 positive; 6 expected-negative; execute negative is `TS2339` |
| architecture absent lifecycle | PASS, 507 candidates / 446 executables, zero unclassified/ambiguous, 2/6 type probes, 11 graph faults, 28 lifecycle mutations |
| official Next present lifecycle | PASS, 508 / 447, exact ignored `next-env.d.ts`, two typegen runs byte-identical |
| isolated AI server build | PASS, 51 server files / 16 client chunks, three markers and raw Synthetic Prompt server-only, positive client control observed |
| isolated in-memory migration | PASS through accepted 0020; `APP_ENV=test`, `FEATURE_AI=false`, noindex true, public Index false, zero config/run rows, no Synthetic persistence |
| public baseline | PASS, four exact-start blobs and pagination behavior restored; Candidate-only module absent |
| fixed FAIL authority | PASS, 7/7 immutable artifacts and manifest SHA-256 `0de273493e7ea1a148469f93459b7e3b9186b79f5f072375c2c2aa536ebda940` |

## 4. Build and bundle claim boundary

The server fixture build ran with `APP_ENV=test`, `FEATURE_AI=false`, `NON_PRODUCTION_NOINDEX=true`, telemetry
disabled, and a system `sandbox-exec` policy denying network. It uses no `next/font/google`, Provider, credential,
real endpoint, or persisted database. Next generated only disposable fixture output; the exact code worktree retained
zero tracked diff. The bundle verifier found all AI/Prompt/Synthetic markers in server files and none in the 16 client
chunks.

This is deliberately not described as a full CWT public-site build. Restored exact-start `src/app/layout.tsx` uses
Google Fonts, so a full build could attempt the prohibited network path. The public proof is therefore limited to:

1. exact Git blob and SHA-256 identity for the four authorized restored files;
2. the full test suite, including the restored pagination contract;
3. the architecture public-client transitive closure and capability-origin proof; and
4. the actual isolated AI server/client bundle boundary.

Any full-site font/build debt remains pre-existing public-product debt outside this Phase B remediation. No overlay,
temporary public source edit, or claimed full-site PASS is used.

## 5. Verification events retained without concealment

1. The historical failed Candidate remains disclosed as having materialized 526 packages from the local store and
   made two failed TLS attempts during its first font build. This remediation did neither.
2. A historical technical-escalation verifier was invoked once during evidence exploration and rejected this branch
   solely because it pins a different historical branch name. It was not modified and is not reported as PASS;
   current executable coverage is the 110-test security/context/output subset plus the immutable Reviewer vectors.
3. The first sandboxed inline migration command used the `tsx` CLI, whose local IPC socket was denied by the same
   system no-network policy. It performed no migration or external access. The replacement used Node's installed
   `tsx` loader without IPC under the unchanged network-denied policy and passed.
4. The first official present-lifecycle run exposed that `transpileModule` cannot emit a `.d.ts`; the sole checker was
   corrected to give declaration input an equivalent syntax-check filename. Both absent and present lifecycle states,
   11 graph faults, and 28 mutations then passed. This was closure within correction attempt 1, not a new attempt or
   compatibility layer.
5. The isolated fixture initially showed Next's documented tsconfig suggestions. The fixture-only tsconfig was made
   exact before the final code HEAD; the final disposable build produced zero tracked diff.

No causal root reached three failed closure attempts. No Max escalation, compatibility layer, second authority, test
deletion, strictness reduction, expanded allowlist, or captured-output substitution was used.

## 6. Prohibited actions and next gate

No real Provider/API/credential/spend, fallback, RAG/retrieval/vector, vision/tool/file/URL capability,
customer_support, private Inquiry/CRM context, `ai_runs` durable repository, enqueue, Worker, claim/lease/retry/cancel,
Phase C/D/E runtime, public product maintenance beyond the authorized exact revert, Schema/Migration/data change,
Deploy, Publish, Index, merge, Push, or independent Review occurred.

This package is implementation evidence, not self-approval. The only next gate is Fresh Independent Implementation
Re-review by the original independent Reviewer against the exact delivered Candidate.
