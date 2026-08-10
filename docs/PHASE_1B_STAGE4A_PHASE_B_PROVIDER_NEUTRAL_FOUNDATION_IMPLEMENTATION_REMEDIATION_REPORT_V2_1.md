# CWT Stage 4A Phase B — Foundation Implementation V2 Remediation Report V2.1

## 1. Status and identity

Status: **COMPLETED as an implementation remediation Candidate; not self-approved**.

- Branch: `codex/phase-1b-stage4a-phase-b-foundation-implementation-v2-remediation-v1`.
- Failed Candidate branch remains fixed at
  `codex/phase-1b-stage4a-phase-b-foundation-implementation-v2 = 0d5b067c0912290ffd91d4d34b064d9c8dacd712`.
- Remediation first commit: `e6e2d2a9c4f33af540d450b9f69a70f5d395660e`, direct parent exact failed
  Candidate `0d5b067c...`.
- Exact V1.7 design start and full rollback checkpoint:
  `3f475e13d73d9d68a4dfb9a040941c57f1ee92e6`.
- Exact final code HEAD: `12817e6727ee2308ea8481d9f0153048f1ce9f18`.
- Final executable-evidence commit: `967551eeb018ef9fba8b3759e92017ff07ff74a1`, a docs-only child of
  the code HEAD.
- The final report/manifest delivery commit is a docs-only successor to `967551e...`; its exact SHA is supplied in
  the Coordinator callback and terminal handoff because a commit cannot name its own final object identity.
- Worktree: `/Users/calvin/.codex/worktrees/07a1/CWT（CloudWave Textile）项目`.

Every final test, verifier, lifecycle, type, and build capture is bound to the exact code HEAD. Source, tests,
configuration, package, lockfile, Schema, Migration, snapshot, and journal remain byte-identical from that code HEAD
through the documentation-only delivery successor.

This report does not approve the Candidate. The only next gate is Fresh Independent Implementation Re-review by the
original Reviewer.

## 2. Independent FAIL authority and scope control

The independent V2.0 FAIL report/evidence/probes were imported byte-identically in the first remediation commit.
Their seven-entry manifest verifies 7/7 and retains SHA-256
`0de273493e7ea1a148469f93459b7e3b9186b79f5f072375c2c2aa536ebda940`; the main report and evidence retain:

- report: `592cc1ebaf1ea7f8aed2c426f5a963aaee3939f4e1b64bc708702c804b45e967`;
- evidence: `e3ca907a0b4c9a1aea554de4cadcee020eab177d7ac46b19a8a522d7b3d7c269`.

No imported Reviewer artifact or historical Candidate V2 report/manifest/history was modified. The accepted 0020
Schema/Migration/snapshot/journal, seeds, `package.json`, and `pnpm-lock.yaml` have zero diff from the failed Candidate.
No dependency, version, second config authority, Schema choice, ADR choice, or Owner decision was introduced.

The final remediation delta has 59 changed paths relative to `0d5b067...`: 58 present paths and one deliberate
deletion, `src/public-site/product-pagination.ts`. The SHA-256 manifest covers the 56 present payload files, including
this report and the deletion-list artifact, and excludes only the manifest and aggregate envelope to avoid
self-reference. The aggregate pins the exact manifest bytes; final report/manifest/aggregate file hashes are supplied
in the callback.

## 3. Root-cause corrections

### IMP2-M01 — exact Draft context, provenance, and Prompt variables

One application-owned context policy now serves both preparation and claimed durable reconstruction. It implements:

- the closed Product field/provenance/value matrix, including positive canonical `weightGsm`, structurally forbidden
  composition, exact MOQ pair completeness, and Product Code absence;
- exact per-class aggregate maxima and order: Fabric Knowledge 8, Company Fact 20, Product 32, explicit input 1,
  plus per-record/class/whole-context/persisted-source byte limits;
- exact source identity/version only in `input_sources_json`, never Provider variables;
- strict use-case source-class revalidation, including Company Fact rejection for Product Description;
- four exact per-use-case Prompt-variable contracts with no generic `context_json`/`input_hash` fallback; and
- accepted JCS/canonical hashing with byte-identical variables/hash through JSONB-shaped durable round trips and
  claimed reconstruction.

The immutable Reviewer reproduction now reports all three invalid Product vectors false, 9/21 aggregate overages
false, exact `{productId,recordVersion}` provenance, cross-use-case durable/output acceptance false, and the exact
four Product variable keys. Its historical field `inputHashMatchesPrepared=false` compares the now-removed Provider
variable `input_hash`; absence of that variable is the required correction, while checked-in round-trip tests prove
the accepted JCS input hash itself is identical.

### IMP2-M02 — finite A-03/A-04/A-08 output policy

Allowed evidence refs are derived from the same corrected context policy and exact use-case eligibility set. Product
Description rejects Company Fact refs. MOQ uses the exact adjacent `moqValue`/`moqUnit` two-ref contract. The bounded
A-08 proposal/repetition policy rejects repeated blocks and token spam; the Reviewer's 30-paragraph vector is false.
No semantic-entailment authority or second protected-data classifier was added. `structural_provenance_checked` and
mandatory human review remain unchanged; no Publish or Index authority exists.

### IMP2-M03 — select-only common read scope

The common carrier/helper/repository/callback capability is exactly
`Pick<AppDatabase<TQueryResult>, "select">`. The model-config repository obtains the complete deterministic aggregate
with one typed Drizzle select and has no raw SQL, `execute`, `LIMIT`, second database, or transaction authority. The
new execute negative fixture fails with `TS2339`; a source scan across carrier/composition/facade/repository finds zero
`execute` matches. Draft/Synthetic brands and the discriminated database seam remain non-interchangeable.

### IMP2-M04 — one transitive architecture graph gate

The single prior checker was replaced in place. It now parses and closes direct, alias, re-export, dynamic, require,
computed, package, and resource acquisitions; unsupported protected acquisitions fail closed. It enforces incoming
and outgoing class ceilings, protected/core/public/server closures, the unique Phase B composition root, reserved
Phase D/adapter absence, unique `generateText` ownership, exact-empty Production Provider/Prompt registries, and the
M03 branch-narrowed database seam.

The actual-tree run has one sealed 12-class selector, 507 candidates / 446 executables, zero unclassified or
ambiguous paths, 2 positive / 6 expected-negative type probes, 2,387 graph edges, 11 real graph faults, and 28
lifecycle mutations. The required four V2.2 artifacts are present. A direct business
`src/app/page.tsx -> @/server/ai/phase-b-composition` fault now exits nonzero with
`fail_closed_composition_incoming_edge`; alias, re-export, dynamic, require, resource, second-root, early Phase D,
early adapter, unknown package, and public-client equivalents also fail closed.

Official Next 16.2.12 typegen passes in disposable isolation in both normal states: absent 507/446 and present
508/447. The present `next-env.d.ts` is exact 247-byte ignored root-control input with SHA-256
`7b550dda9686c16f36a17bf9051d5dbf31e98555b30d114ac49fc49a1e712651`; two typegen runs produce byte-identical
generated manifests.

### IMP2-M05 — exact public baseline restoration and isolated build proof

The four authorized files are exact design-start Git blobs and SHA-256 identities:

- `src/app/layout.tsx`: blob `94e46fb...`, SHA-256 `b8a40521...`;
- `src/app/globals.css`: blob `0ece393...`, SHA-256 `3803f096...`;
- `src/app/products/page.tsx`: blob `50f8d82...`, SHA-256 `65ac3c27...`;
- `src/app/products/page.test.ts`: blob `a384b26...`, SHA-256 `d59979b8...`.

`src/public-site/product-pagination.ts` is absent at both design start and code HEAD. Geist/Geist Mono, public
rendering, route, canonical, SEO, and pagination source behavior are no longer changed by Phase B.

The final Next build is deliberately limited to the existing AI server fixture under a system network-deny policy,
with `APP_ENV=test`, `FEATURE_AI=false`, and `NON_PRODUCTION_NOINDEX=true`. It passes with 51 server files and 16
client chunks; three server markers and raw Synthetic Prompt are present server-side and absent from every client
chunk. This report does not claim a full public-site build: the exact-start Google Font path could attempt network,
and any resulting full-site build debt is pre-existing public-product debt outside this remediation. No temporary
public overlay or product edit was used.

### IMP2-L01/L02 — request surface and process fidelity

Phase B Production construction now returns an availability-only type and runtime object. Its sole key is
`inspectDraftAssistanceAvailability`; `requestDraftAssistance` is absent. Shared command/result/codecs remain
foundation contracts, but the first request service awaits a future authorized Phase C enqueue port.

All final captures name the exact code HEAD and current counts. Historical V2 disclosures remain permanent: 526
local-store packages were materialized and two TLS attempts failed before this remediation. The remediation used only
currently installed binaries and made no install, materialization, download, registry, or network access.

## 4. Final verification

| Gate | Exact result |
|---|---|
| focused AI | PASS, 13 files / 138 tests; capture SHA-256 `d7611db5...` |
| security/context/output | PASS, 5 files / 110 tests; `61a7f141...` |
| full suite | PASS, 111 files / 555 tests, 260.33s; `33c2ba19...` |
| lint | PASS, exit 0, zero warnings; `3a451d87...` |
| strict typecheck | PASS, exit 0; `14de5563...` |
| accepted 0020 verifier | PASS: design identity, 40 historical artifacts, exact journal/schema/constraints/index scope |
| independent Schema mapping | PASS: `ai_model_config=21/21`, `ai_runs=96/96`, exact order |
| Prompt bundle/history | PASS; Production manifest exact-empty; protected history `6bc26cf... -> 12817e6...` |
| raw JSON | PASS: escaped/nested/NFC duplicates, fence, concatenation, truncation, byte/member boundaries |
| M02 Unicode/limits/corpus | PASS: DeepSeek variants protected, approved visible separators/safe Unicode allowed, per-gap 4/5 and total 64/65 exact |
| DB/read-scope types | PASS, 2 positive / 6 expected-negative; execute negative `TS2339`; `b0aa886c...` |
| architecture | PASS, 507/446, 0/0, 2,387 edges, 11 graph faults, 28 mutations; `50615804...` |
| Next lifecycle | PASS absent/present, two generated manifests identical; present capture `421591ed...` |
| isolated AI server bundle | PASS, 51/16, server-only markers; `a7f1c516...` |
| isolated migrated/noindex | PASS through 0020, memory-only, feature false, public Index false, 0 config/run rows, no Synthetic persistence; `267c7284...` |
| public baseline | PASS exact blobs/module absence; `70ec2c18...` |
| global exact-start diff check | exit 2, not PASS; sole diagnostic is immutable V1.7 independent report line 118, `new blank line at EOF` |
| owned/scoped whitespace check | PASS, exit 0 after excluding only the six immutable imported V1.7 PASS artifacts |

The full evidence narrative SHA-256 is `2b3c43584bd63ead3c1b6b6009ea2f34873bd3cde472896e88da37401f795cc9`.

## 5. Commit and rollback map

| Commit | Exact parent | Causal boundary / rollback |
|---|---|---|
| `e6e2d2a9...` | `0d5b067c...` | byte-identical independent FAIL import |
| `a5227f5a...` | `e6e2d2a9...` | IMP2-M01 context/provenance/Prompt variables |
| `01c08b43...` | `a5227f5a...` | IMP2-M02 finite output policy |
| `daf923a7...` | `01c08b43...` | IMP2-M03 select-only reads |
| `9d026556...` | `daf923a7...` | IMP2-M04 transitive graph gate |
| `8a61c4ab...` | `9d026556...` | IMP2-M05 exact public revert |
| `83296042...` | `8a61c4ab...` | IMP2-L01 availability-only surface |
| `193813f9...` | `83296042...` | immutable `.mts` review evidence excluded from product typecheck |
| `b30bb52b...` | `193813f9...` | official Next declaration lifecycle parser correction |
| `12817e67...` | `b30bb52b...` | sealed test-only isolated Next build fixture; final code HEAD |
| `967551ee...` | `12817e67...` | exact-code-HEAD verification evidence, docs only |
| delivery commit | `967551ee...` | V2.1 report, deletion list, SHA manifest, aggregate; docs only |

Each checkpoint is linear, has one exact parent, and was not amended or rebased. Full rollback remains exact V1.7
start `3f475e13...`; narrow rollback uses the direct parent shown.

## 6. Failed-code isolation, attempts, and open findings

The four earlier failed implementation refs remain non-ancestors:

- `755e514540351ed53ee96bedd5ea12f3e934387e`;
- `a696325fa2608c77e526bb7403bb911d34200064`;
- `b1a73bb8aae87f7c862117b32ce5c2a051f21b84`;
- `d8a24d48592a8c5e112d20edd24505e9e34d83c9`.

This remediation necessarily descends linearly from authorized failed Candidate `0d5b067...`; no merge, cherry-pick,
rebase, or force-move occurred. The failed branch remains at its fixed SHA. Corrections were authored at the causal
boundaries identified by the independent Reviewer and not copied from any earlier failed source tree.

Evidence-harness events are retained rather than hidden:

1. one historical branch-pinned technical verifier rejected the current branch name and is not reported as PASS;
2. one sandboxed `tsx` inline command had its local IPC socket denied before migration; the no-IPC Node loader passed
   under the same network-deny policy;
3. the first present-state architecture run exposed `.d.ts` emit misuse and was corrected in the sole checker; and
4. Next's test-fixture tsconfig requirements were made exact before the final code HEAD, after which the isolated build
   produced zero tracked diff; and
5. the first manifest one-liner used `path`, a special zsh variable, and thereby removed the command lookup path
   inside its loop. It wrote no usable manifest. The replacement used a non-special variable plus explicit
   `/usr/bin/shasum`, then verified all 56 entries and the aggregate.

No root reached three consecutive failed closure attempts. No Max escalation or compatibility layer was used. There
is no open Schema, ADR, dependency, public-product adoption, or Owner decision. The only external existing debt noted
is that a full public-site offline build may encounter the restored exact-start Google Font network dependency; it was
not altered or misrepresented through this Phase B task.

## 7. Prohibited-action confirmation and next gate

Confirmed not performed: no real DeepSeek or other Provider API/adapter call; no credential or spend; no fallback,
RAG/retrieval/embedding/vector, vision/tool/file/arbitrary URL, customer_support, private Inquiry/CRM or sensitive
file input; no Production Provider or Prompt prose; no `ai_runs` repository/enqueue/Worker/claim/lease/retry/cancel/
scheduler/outbox runtime; no Schema/Migration/snapshot/journal/seed/backfill/formal data or dependency/lock change; no
Staging/Production access; no Deploy, Publish, Index, merge, Push, self-review, or Phase C/D/E work.

The Candidate is complete but not accepted. The sole next gate is Fresh Independent Implementation Re-review of the
exact delivered Candidate by the original Reviewer. Phase C/D/E remains prohibited until that gate returns PASS.
