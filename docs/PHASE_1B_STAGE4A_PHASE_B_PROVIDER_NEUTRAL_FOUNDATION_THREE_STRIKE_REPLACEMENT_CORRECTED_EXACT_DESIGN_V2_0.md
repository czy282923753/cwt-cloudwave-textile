# CWT Stage 4A Phase B — Provider-neutral Foundation Three-Strike Replacement Corrected Exact Design V2.0

Status: **CORRECTED EXACT DESIGN CANDIDATE / THREE-STRIKE REPLACEMENT / NOT SELF-APPROVED / IMPLEMENTATION NOT AUTHORIZED**

Date: `2026-08-11` (`Asia/Shanghai`)

Candidate ref: `refs/heads/codex/phase-1b-stage4a-phase-b-v111-m01-three-strike-replacement-design-v1`

## 1. Decision and authority

This is a complete standalone Phase B successor. It preserves the independently
accepted V1.10 Provider-neutral foundation, the accepted M02 successor, the
selected M03 discriminated database seam and the independently closed M04 V3.1
capability/resource facets. It replaces the failed V1.12–V1.14 current-authority
topology with selected Option
`A-SEALED-STRUCTURED-ROOT-PLUS-EXTERNAL-CONSUMED-REVIEW-ENVELOPE`.

This Candidate is not ordinary Attempt 4. It changes no Product code and does
not approve itself. Its exact bytes remain Design-ineligible until the original
independent Phase B Design Reviewer returns Fresh `PASS` and the coordinator
accepts that gate.

The only Candidate-side machine authority is
`V111_M01_CANONICAL_REVIEW_AUTHORITY_V2_0.json`. Its embedded subject names the
exact Candidate ref, its current roles bind the Design, one composite technical
profile and one verifier, and its seal binds that closed graph. Markdown is
rendered human documentation only: `markdownAuthority=false`. No heading,
marker, indentation, code fence, info string, JSON block, filename, path, hash,
case choice or prose sentence creates a machine role.

The reviewer-controlled Git expectation is a different kind of input. A
reviewer creates `CANDIDATE_REVIEW_ENVELOPE_V2_0.json` only after the final
Candidate commit, keeps it outside the Candidate, and supplies it to the
verifier. The envelope is consumed and cross-bound; it is not content authority
and cannot be part of the Candidate seal.

## 2. Fixed derivation and rollback authority

The exact accepted starting identities are:

| Authority | Exact identity |
| --- | --- |
| accepted V1.10 Design | commit `234cd90211c45c6cc86c988d02c8d5dc2f7858d2`; independent Fresh PASS, 0/0/0/0 |
| accepted V1.10 standalone Design SHA-256 | `039c26e3026bddff4b398fd516005cb2e2a664e7fd914be6cf31ff8ed1f0ea22` |
| accepted V1.10 machine profile SHA-256 | `8f1c7c9c023ed98477cfe9420ceac3648e3e20d2e59032493a1d9f8db15aba83` |
| underlying accepted entry checkpoint | `0793948ad115c19f852a9590387ed9ba06738a39` |
| accepted V1.10 rollback | `234cd90211c45c6cc86c988d02c8d5dc2f7858d2` |
| full implementation rollback | `3f475e13d73d9d68a4dfb9a040941c57f1ee92e6` |
| frozen tag object / peel | `1c626f9b788e4c6ed0480a7040aa54ccef3e6c76` / `31c0e405acfdd0d05200d0fb2531e897a541a2c4` |
| accepted Max replacement analysis | `c103682e63e9a2cb62b6581d7d62773ddcab1a99` |
| replacement pre-L3 checkpoint ref | `codex/checkpoint/phase-1b-stage4a-phase-b-v111-m01-replacement-design-pre-l3-v1` -> exact `c103682...` |
| checkpoint record commit | `3aaad46b1627191a18fb82763a9627c1e2292d73`, one-path direct child of `c103682...` |

The technical profile contains audited value copies of accepted/closed profiles.
An embedded value that is identical to a historical failed-Candidate technical
artifact becomes current only because this new root binds it and a future Fresh
Reviewer passes this Candidate. The failed commit, branch, pointer bundle or
old verifier never supplies current authority or ancestry.

## 3. Phase B outcome and system boundary

Phase B defines one server-only Provider-neutral AI foundation. The generic core
owns ordering, readiness resolution, immutable Prompt loading, durable-context
reconstruction, one adapter dispatch, raw-object framing and typed result/error
normalization. Each application owns its command and association codecs,
availability and mutation authorization, context construction, output grammar,
protected result kind and human disposition.

The Production application registry is closed to exactly four
`draft_assistance` text use cases:

1. Product short-description assistance;
2. Product SEO-title assistance;
3. Content summary assistance; and
4. Editorial Revision rewrite assistance.

All output is a human-review Draft Candidate. AI may draft only; it cannot infer
unknown business facts, publish, enable Index, change a public route, create a
Redirect, modify a Product revision, or apply content. Missing evidence remains
empty and may surface as `Waiting for Real Product Data Validation` where the
existing Product contract requires that status.

The core exposes three separated seams:

- `inspectDraftAssistanceAvailability` is read-only and returns safe usable or
  manual-editor state;
- `requestDraftAssistance` is the only Domain-Service-facing future mutation
  seam and is non-operational until a separately accepted Phase C durable port
  exists; and
- `executeClaimedTextAttempt` is Worker-only and accepts one claimed durable
  projection, never a caller-rendered request.

There is no synchronous public generation API, no in-memory run repository, no
fake Production enqueue, no business-visible prepared Provider request and no
Provider call without an authoritative `ai_runs` identity, lease, state version
and committed dispatch marker.

## 4. Scope and dependencies

The later Phase B implementation allowlist remains limited to Provider-neutral
types, application codecs and scopes, config/context/Prompt/output logic,
server-only composition, offline fake adapters and architecture proof tooling.
This docs-only task grants no source allowlist and implements none of it.

The design adds no dependency, package, lock, Schema, Migration, snapshot,
journal, seed, ADR, table, state, Worker, queue, Recovery, lease, Outbox or
persistent coordination mechanism. Refine and admin-only packages remain absent
from the public bundle.

No real Provider adapter, SDK, endpoint, credential, API call, network path,
spend, fallback Provider, RAG/retrieval, vision, customer-support workflow or
private Inquiry data is part of Phase B. The Production Provider registry is
exactly empty. Fake adapters are deterministic, test-only and non-billable.

## 5. Application, authorization and read-scope contracts

`ApplicationReadScope` is an unbranded structural bound with only
`readonly mode: string`. It owns no constructor, database, transaction, lock,
factory or authority. Draft and Synthetic applications each own module-private
nominal carriers and private executors. The mode string alone cannot enter a
Draft binder.

Draft owns two scopes:

- `ReadOnlyDraftAvailabilityScope`, which exposes only the accepted select
  capability; and
- `TransactionBoundDraftEnqueueScope`, which in Phase C will own replay lookup,
  authoritative target lock/snapshot, configuration lock and atomic run+Audit
  insertion.

The generic core never receives the application scope, database, target,
repository, lock or transaction method. Availability authorization and request
authorization remain separate binders. A Server Action may parse and call a
Domain Service only; it may not write a business table directly. Any future
business mutation and its required Audit must commit atomically.

The Synthetic application must prove extensibility with a non-Draft association,
result and disposition without editing generic core files. It is test-only and
cannot map to Production `0020` persistence.

## 6. Feature and configuration resolution

Readiness is the conjunction of trusted `env.FEATURE_AI`, the server-persisted
global `ai` feature flag, one enabled exact default `ai_model_config` row, a
registered application/use-case/capability, an immutable Prompt resource, and
an available compatible adapter descriptor. Missing, duplicate, disabled,
ambiguous, incompatible or invalid input degrades safely to the manual editor.
There is no fallback traversal; `fallback_config_id` must be null.

The model-config repository returns one explicit aggregate, not a truncated row:
zero, one or multiple matching enabled defaults are distinct results. The
resolved configuration is strict, recursively immutable and JCS-hashed. A
request cannot supply Provider, model, Prompt, environment, endpoint,
credential, pricing or budget authority.

Phase B exposes no config mutation service, Server Action, route, page, seed or
bootstrap. Phase C may later add an Admin-only optimistic mutation with stable
locking, disable-not-delete retirement, complete revalidation and required
Audit in the same transaction.

## 7. Frozen Schema mapping

`drizzle/0020_phase1b_ai_foundation.sql` and `src/db/schema/ai.ts` remain
unchanged. The structured technical profile freezes the accepted ordered field
sets and exact mapping counts:

- `ai_model_config`: `21/21`;
- `ai_runs`: `96/96`.

The 21 configuration fields retain their accepted meanings: stable identity;
capability/use-case/provider/model; validated parameters; input/output/attempt
and cost ceilings; immutable Prompt identity/version/hash; enabled/default and
null fallback; optimistic record version; actor provenance; and timestamps.

The 96 run fields retain their accepted ownership groups: application and
request identity; target association/snapshot; selected config and Provider
envelope; Prompt/input schema/policy; strict source/context hashes; protected
candidate; lifecycle, retry, lease, dispatch and cancellation; normalized
usage/error; trusted environment/budget/cost; and human review/application
metadata. Phase B reads/prepares only its assigned values. Phase C owns durable
enqueue/claim/retry/cancel/budget/Audit transitions; Phase D owns real Provider
semantics; Phase E owns human disposition and application.

Any missing, extra, reordered or reinterpreted field fails the exact mapping
gate. A bare status check is never Product or publication eligibility.

## 8. Prompt resources

The authoritative Production Prompt membership is one strict manifest under
`src/ai/prompts/resources/production/`. Each resource is immutable raw UTF-8
bytes with final LF, exact ID/version/hash and a checked-in deterministic bundle.
The loader permits no filesystem path supplied by a request, no runtime fetch,
no dynamic resource discovery and no unmanifested generated file.

The four Prompt variable contracts are application-owned and strict. Rendering
uses only the accepted sanitized context and exact raw template bytes. Variables
cannot introduce a Provider/model/credential/URL/Object Key/private Asset or
new business fact. Production Prompt bodies remain exact-empty in Phase B;
only test resources may exercise rendering. A later Production body change is
separately reviewed and versioned.

Protected history verification detects mutation, deletion, duplicate ID/version,
hash drift, unmanifested bytes, path alias and public-bundle inclusion. No Prompt
resource is shipped to a client/public bundle.

## 9. Context, Product provenance and NM01 authority

The accepted `IMP2-NM01-STRUCTURAL-INTEGRITY-DOMAIN` direction remains exact.
Application-generated association metadata is validated by one closed typed
field-domain traversal plus target-snapshot recomputation. Human/business and
Provider-evidence strings continue to use the selected M02 classifier. There is
no second visitor, path exception list, compatibility traversal or
consumer-local bypass.

The current NM01/compiler authority is the accepted V1.10 two-layer successor:

- the normative runtime error closure has exactly 69 codes and is compared in
  source order with category, retryability, manual-editor availability and safe
  default message against the unique `src/ai/errors.ts` authority;
- TypeScript proves only the selected five-code traversal subset; it does not
  infer the 69-code union from JSON or claim the inverse;
- the compiler accepts only the fixed reviewed profile, validates all 35
  records and identities, detaches the complete input, recursively freezes it,
  pre-tokenizes it and exposes only one module-private registered product;
- runtime retains zero raw profile references; source replacement, mutation,
  cache replacement or a lookalike product cannot change or enter traversal;
- zero/multiple domain assignment and profile-identity drift map only to
  `context_provenance_mismatch`; protected data maps to
  `context_prohibited_data`; an unknown caught failure maps to
  `internal_failure`; and
- `CR-05..CR-07` finish before config resolution at `CR-08`.

`input_context_json` is one strict reconstructible application context containing
application/use-case, exact association identity, locale, ordered sanitized
target/source values and provenance, task controls and every Prompt-variable
input. It excludes the rendered Prompt/request. `input_hash` is SHA-256 of its
RFC 8785 JCS bytes. `input_sources_json` stores safe references only—never body,
URL, Object Key, private Asset or Inquiry identifier.

Product inputs are field-by-field allowlisted from the authoritative editable
Draft/Revision. Unknown values remain absent. Company, facility, certification,
capacity, MOQ, customer, ownership and technical claims require verified source
facts and are never inferred. A partner factory is never described as CWT-owned
without a verified Company Fact.

## 10. M02 protected evidence and A-08 successor

The selected A-07 classifier remains the single identity
`264ca6358dcec00da5bc17e134c89e52d5321c87683212b8c32ba12756700b66`.
It uses one compiled grammar for direct and bounded-insertion recognition,
structured tokens and overflow distinction; raw and normalized bytes remain
bounded. All context/provenance and A-07 consumers use that same instance.

The independently accepted M02 A-08 successor is
`M02-A08-D1-POSITION-INSENSITIVE-MULTISET`:

- normalize with NFKC then `toLocaleLowerCase("en")`, without changing stored
  bytes;
- tokenize with Unicode letter/number runs and retain multiplicity;
- ignore token order for the family relation;
- require at least four shared distinct tokens, half containment and maximum
  `2:1` token-length ratio;
- permit family size at most three and reject at the third neighbor;
- use deterministic schema preorder and unordered pair order;
- enforce raw/protected byte limits `98,304/65,536`, Blocks `60`, EvidenceText
  `1,826`, per-node/aggregate tokens `10,000/32,000`, exact duplicate/block
  maximum `2`, and identical-token run rejection at `8`; and
- retain the explicit lexical false-positive/false-negative boundary and
  mandatory human review.

There is no stopword/cosmetic lexicon, arbitrary deletion enumeration, ordered
core hash, semantic model, persistent state, compatibility checker or second
M02 instance. M02 classifies text only and proves no DeepSeek or other Provider
behavior.

## 11. Raw output, evidence and Provider-neutral normalization

The raw parser accepts exactly one complete UTF-8 JSON object with bounded bytes,
depth, members, arrays, strings and numbers. It rejects BOM, leading/trailing
non-whitespace, concatenated objects, duplicate decoded keys, invalid Unicode,
unsafe numbers, prototype keys, unexpected fields and incomplete Provider
completion.

Each of the four use cases has one strict outer schema and application-owned
candidate grammar. Candidate refs are core-derived, not trusted from Provider
output. Evidence is bounded to accepted source identifiers and exact spans; it
cannot contain URL, credential, Provider payload, private file or new business
fact. Human semantic review is mandatory before any Phase E application.

`TextAiProviderV1` is capability-specific and receives only the normalized text
request and trusted resolved descriptor. Completion state is mandatory. Result
normalization preserves safe provider/model/usage/status/request identifiers but
never raw response bodies, headers, Prompt text, target bodies, credentials or
private identifiers.

Fake adapters are deterministic injections selected only by test composition.
They perform zero network access and claim no real Provider semantics.

## 12. Typed errors and normative order

`src/ai/errors.ts` is the sole runtime error authority. The structured technical
profile is a checked derivative, not a second tuple/map. Errors carry a closed
code, category, retryability, manual-editor availability and a fixed bounded safe
message. Raw exceptions are never persisted or telemetered.

The one claimed replay sequence is exactly `CR-01..CR-14`:

1. validate claim/lease/state/environment identity;
2. resolve the application/use-case/capability/schema/policy registry member;
3. decode the durable association;
4. recompute and validate the target snapshot;
5. validate compiled context-profile identity;
6. validate the closed field-domain traversal;
7. validate M02-protected values and exact `input_context_json`/`input_hash`;
8. resolve and confirm the stored configuration snapshot;
9. load and hash the immutable Prompt resource;
10. validate the Provider-envelope identity;
11. build variables and render the exact request;
12. enforce input/output/token/budget readiness;
13. call the injected adapter at most once; and
14. frame, parse, protect, hash and return one normalized attempt result.

The exact machine order in the technical profile is the authority. A copied
array or consumer-local order is forbidden. Context validation never moves
after config/Prompt/adapter resolution, and no second adapter call exists.

## 13. M03 discriminated database seam

The selected M03 authority remains profile
`cwt.phase1b.stage4a.phaseb.m03-protected-graph.v2_2`, version `2.2.0`, SHA-256
`1f0b56a870ecbab61c970e1c7000dff591674e0f8ad0a04341538c724a36c173`.

One outer server root switches on the actual `databaseConnection.kind`. Each
`pglite` or `postgres` branch passes its branch-narrowed `.db` directly to the
same generic Phase B factory. The union is never projected before narrowing;
cross-driver handoff and unnarrowed union compile-fail. A `never` default makes
a new driver fail until separately reviewed.

No cast, `any`, `unknown` round-trip, suppression, overload erasure, generic
widening, bivariant callback, union destructuring, proxy, service locator,
reflection, second connection, second factory, second composition root or new
transaction authority is permitted.

The current graph retains 12 exact root classes, 11 exact physical exclusions,
the protected/excluded roots, root-control lifecycle, public/server/build zones,
reserved absent Phase D root and absent Provider adapter zone. Exactly one class
must match each candidate; zero or multiple fail closed. Symlink, hard-link,
case/canonical collision, escape, special file, unresolved edge and unknown
package fail closed.

## 14. M04 V3.1 static capability/resource boundary

The independently closed M04 V3.1 facets replace whole-JavaScript loader flow
with a closed static acquisition language. The current composite technical
profile embeds the exact V3.1 value and records source hash
`5d353ab7f53831d50cdc2d3d0c3a9b67f246866ab3168f039cb18330af4c7356`.

Production acquisition permits only:

- literal static ESM import/export/type-import forms; and
- exact literal `new URL(resource, import.meta.url)` for protected resource
  acquisition.

There is no specifier constant folding. Before reachability, the checker denies
dynamic import, CommonJS/native require variants, eval/Function/vm, reflection,
constructor escape, ambient/computed/global acquisition, unresolved specifiers
and forbidden capability origins. Class fields, decorators, static blocks,
IIFEs and callbacks are covered by ordinary descendant traversal, not special
dataflow cases.

Ordinary application `new URL(...)` construction is not a protected-resource
edge unless it matches the exact literal relative resource plus unaliased
`import.meta.url` contract. The independently measured actual tree had 21
ordinary Production URL constructors and zero resource edges; all remain
ordinary URL behavior. Product/public/SEO/URL/Redirect behavior is unchanged.

The V3.1 profile fully materializes its compiler inputs and is detached and
recursively frozen before proof. It preserves the 12 classes, 11 exclusions,
M03 seam, 28 lifecycle/classification mutations, reserved absence and bundle
zones. It requires exactly five canonical implementation proof artifacts:

1. actual tree and static language;
2. static module and resource graph;
3. capability origin and non-reachability;
4. Phase B composition; and
5. server/public bundle boundary.

Those future outputs are absent at Design time. Their exact paths, schema/JCS
contracts and contract-subtree hashes live only in the canonical root/profile.
No V3.0 name, whole-JavaScript loader map, compatibility fixture, external taint
engine or second checker is current.

## 15. Security, telemetry and public bundle

Authorization is rechecked by the application Domain Service using the
authoritative target role and state. Product and Content roles are determined
from authoritative entity type before distinguishable state/version outcomes.
Unrelated roles cannot gain Draft or customer access through another role.

Private Inquiry files never enter this foundation. Public/Private/Import storage
contexts stay isolated. No raw Object Key or permanent bucket URL is emitted.
The AI context contains no private Asset identifier and cannot become an AI
knowledge base automatically.

Telemetry contains only allowlisted operational enums, bounded timings/counts,
safe closed errors and non-PII technical identities. It excludes Prompt bodies,
input/output text, Contact/Inquiry IDs, private Asset IDs, credentials, endpoints,
headers, raw exceptions and Provider payloads. Consent remains server-persisted;
client state and forwarding headers are not authority.

The protected graph proves that no public/client module can reach core,
application, config, context, Prompt, output, provider, registry, database,
environment or server composition capability. Server-only and public-bundle
proofs fail on static, dynamic, alias, re-export, computed, generated and
resource paths.

## 16. Phase boundaries

| Phase | Exact boundary |
| --- | --- |
| Phase B | Provider-neutral contracts, Draft/Synthetic applications and scopes, readiness, context, Prompt/raw-output logic, selected M02/M03/M04 static gates, empty Production Provider registry and offline fake proofs |
| Phase C | separately accepted durable `ai_runs` enqueue/claim/lease/retry/cancel/budget/Audit composition; no temporary parallel runtime |
| Phase D | separately reviewed real Provider adapter/model/envelope/credential/network/spend and real external validation |
| Phase E | authorized business UI/integration, Production Prompt bodies, human Diff/application into existing Draft/Revision; Publish and Index remain independent |

This Candidate authorizes none of Phase C/D/E. Production integrations fail
closed until separately configured and validated.

## 17. Canonical review authority V2.0

The canonical root has exactly 13 top-level keys and closed nested schemas. It
is UTF-8 RFC 8785-compatible JCS plus exactly one LF. Decoded duplicate member
names—including escaped equivalents—are rejected before any value is consumed.
Unknown keys, non-I-JSON Unicode, unsafe numbers, wrong types, cardinality drift
and noncanonical bytes fail closed.

It contains exactly one embedded subject, one seal, three current roles, two
executable current roles, five proof contracts, two checkpoints and three
failed-attempt history records. The current roles are:

- `renderedDesign`: this file, exact SHA-256, `machineAuthority=false`;
- `currentTechnicalProfile`: one canonical composite profile, exact SHA-256,
  profile ID/version and selected-authorities JCS hash; and
- `currentVerifier`: one dependency-free verifier, exact SHA-256 and schema.

All current/checkpoint/proof/applicable-history paths are repo-relative POSIX,
NFC, case-exact and unique. Existing roles must be tracked regular files.
Absolute, dot, dot-dot, duplicate slash, backslash, percent/control, NFD/case
alias, escape, symlink and shared device/inode fail closed.

The one-way graph is exactly root to embedded subject/current roles/proofs/
checkpoints/frozen inputs/history; subject to the three current roles; and proof
contracts to the current technical profile. All other nodes are leaves. Missing,
extra or duplicate node/edge, cycle, or current/history role/path overlap fails.

The seal is:

- `subjectJcsSha256 = SHA-256(JCS(subject))`; and
- `authorityJcsSha256 = SHA-256(JCS(root with only that field omitted))`.

The root does not hash itself as a file, the final Candidate commit, an external
envelope, a review capture or `SHA256SUMS.txt`. The single manifest is derived
package-byte integrity only and cannot create a role.

## 18. External review envelope V2.0

The external envelope has exactly six top-level keys: `authorityBinding`,
`expectedGit`, `provenance`, `schemaId`, `status` and `version`. It is strict
duplicate-aware JSON and is JCS-hashed by the verifier.

`authorityBinding` binds role `canonicalReviewAuthority`, exact canonical-root
path, exact root-file SHA-256 and exact authority JCS SHA-256. `expectedGit`
contains the full Candidate ref, exact HEAD/tree/one parent, `cleanRequired=true`
and `attachmentPolicy=detached-or-exact-ref`.

The verifier accepts only:

- `--authority <root> --package-only`; or
- `--authority <root> --review-envelope <external-envelope>`.

Package-only mode can run before final commit but always emits
`acceptanceEligible=false`. Full-review mode consumes every envelope leaf and
requires: envelope ref equals sealed ref; ref target equals expected and observed
HEAD; expected/derived/observed tree and parent agree; the commit has one parent;
status is clean; and symbolic HEAD is either empty or exactly the full expected
ref. Another branch at the same commit fails. Attached exact-ref and detached
exact-HEAD are both valid and have the same normalized semantic result apart
from a diagnostic attachment label.

Because the envelope is created after the final commit and outside it, there is
no self-hash/commit cycle. Any Candidate byte change requires a new commit,
new envelope and Fresh proof; the Candidate is never amended after envelope
creation.

## 19. Proof and acceptance contract

The successor executes the accepted `10 positive / 42 negative / 10 property`
matrix twice with byte-identical output. It covers duplicate-aware parsing,
closed schema/cardinality, JCS subject/self hashes, role/path/hash/DAG/history,
symlink/hard-link/case/NFC aliases, one manifest, every envelope leaf, ref/HEAD/
tree/parent/clean/attachment, package-only ineligibility and external-envelope
no-cycle.

The five CommonMark witnesses are presentation mutations only. Each must leave
machine-role enumeration byte-identical because the role projection accepts only
the root object and never receives Markdown bytes. They are not parser coverage
or accepted/rejected fence cases.

Historical fixed manifests, the accepted V1.10 verifier, the Max analysis
package verifier and exact `21/21` + `96/96` mapping are non-regression checks.
They cannot become a parallel current root. Full application Build/tests are
not required for this docs-only Candidate.

## 20. Frozen finding dispositions

| Finding | Disposition carried by this Design |
| --- | --- |
| `IMP2-NH01` | **CLOSED**, authoritative entity type determines role before distinguishable state/version; non-regression only |
| `IMP2-M01` | **CLOSED**, one strict class-discriminated DTO/policy binds selector, identity/version, association and values/provenance; non-regression only |
| `IMP2-M03` | **CLOSED**, select-only private carrier and discriminated actual database seam; non-regression only |
| `IMP2-M05` | **CLOSED**, public blobs unchanged and pagination helper absent; non-regression only |
| `IMP2-L01` | **CLOSED**, Production composition exports availability only; future request/Worker seams are not callable |
| `IMP2-L02` | **CLOSED**, executable evidence remains code-HEAD bound and historical process exceptions remain disclosed |
| M02 A-08 / M04 V3.1 technical facets | **ACCEPTED/CLOSED DESIGN SUCCESSORS**, current only through this root plus future Fresh PASS |
| `V111-M01` | **CANDIDATE CORRECTION CREATED, NOT CLOSED BY AUTHOR** |

No finding disposition authorizes a Product mutation or consumes an ordinary
implementation correction attempt.

## 21. Complexity, rollback and next gate

Complexity decreases. One structured root replaces subject/identity copies,
generated pointer bundles, prose scanners, a nominal Candidate envelope and a
second seal manifest. One external reviewer expectation replaces separate CLI
Git copies. No compatibility or dual-authority path remains.

Before Fresh PASS, rollback is to abandon this branch and start clean from
`codex/checkpoint/phase-1b-stage4a-phase-b-v111-m01-replacement-design-pre-l3-v1`
at `c103682...`. The atomic Candidate docs/evidence commit may be reverted as a
unit. Underlying rollbacks remain `0793948...`, accepted V1.10 `234cd902...`,
full rollback `3f475e13...`, and frozen tag peel `31c0e405...`.

The only next gate is Fresh Independent Corrected Exact Design Review by the
original Phase B Design Reviewer against the exact final Candidate commit,
external envelope, canonical root, profile, verifier, proof captures and single
manifest. This author stops after coordinator callback and does not create that
review task, implementation work, merge, Push, Deploy, Publish, Index or Phase
C/D/E work.
