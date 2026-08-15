# CWT Phase 1B Stage 4A Phase D FONT-HERMETIC S1.1 Hybrid-C Byte-Oracle Authority Amendment / Exact Design V1.0

Status: **S1.1 AUTHOR-READINESS CANDIDATE / DOCS-EVIDENCE ONLY / FRESH INDEPENDENT FULL DESIGN-SECURITY REVIEW REQUIRED / S2 PROHIBITED / PHASE D NOT ACCEPTED**

Prepared: `2026-08-16` (`Asia/Shanghai`)

Immutable accepted S1: `adcbfe7984466f87ba7e530c0c9903dc02ce1260`

Immutable S1 independent PASS review: `17b6cb7add4238b33bf08e7837d68cca48ea6388` (sole/direct child of S1; review evidence only, not S1.1 ancestry)

S1 authority amended narrowly: [Phase D FONT-HERMETIC Superseding Exact Design V1.0](./PHASE_1B_STAGE4A_PHASE_D_FONT_HERMETIC_SUPERSEDING_EXACT_DESIGN_V1_0.md)

Architecture: [ADR-0020](./adr/ADR-0020-phase-d-synthetic-only-bounded-convergence.md)

Canonical fixture authority: [DeepSeek Synthetic Contract Canonical V1.0](./review-evidence/phase-1b-stage4a-phase-d-font-hermetic-s1-1-hybrid-c-v1/DEEPSEEK_SYNTHETIC_CONTRACT_CANONICAL_V1_0.json)

Evidence manifest: [S1.1 Manifest V1.0](./review-evidence/phase-1b-stage4a-phase-d-font-hermetic-s1-1-hybrid-c-v1/MANIFEST_V1_0.json)

## 1. Exact Owner authority and ceiling

The Owner explicitly approved:

```text
“批准 Phase D S1.1 按 Hybrid C 修正 byte-oracle authority：唯一 canonical JSON fixture 可作为 docs/evidence authority 纳入 S1.1；删除 TypeScript test 的 exact-byte normative oracle，改由完整 semantic/runtime contract 约束。保持 22-path allowlist、synthetic-only、Gates 1–10、two-output 及 Phase E/F 禁令不变。批准形成 ADR-0020 narrow clarification 和 docs/evidence-only S1.1，完成 fresh independent full Design/security review 后再决定是否恢复 S2。”
```

This authorizes only one docs/evidence-only S1.1 sole/direct child of exact S1, the narrow ADR-0020 clarification, one canonical JSON authority artifact and one manifest. It is not S1.1 acceptance, S2 authority, a gate PASS, checkpoint movement or Phase D/E/F authority.

## 2. Blocker and exact supersession boundary

S1 §4.3/§4.4 contained a real authority contradiction: it required exact future bytes for both the JSON fixture and TypeScript adapter test, prohibited copying the only known historical bytes, and simultaneously required a fresh implementation. Hash equality cannot be a fresh semantic implementation rule when no current canonical byte source is authorized.

Hybrid C removes the contradiction without weakening runtime coverage:

| S1 authority | S1.1 current disposition |
|---|---|
| §4.3 semantic/security contract | **Retained unchanged** and joined to the exact repository-visible canonical artifact in §3 |
| §4.3 statement that the exact fixture identity is only a validator and not copy authority | **Superseded**; exact accepted S1.1 artifact is the sole authorized copy source for this fixture |
| §4.4 complete adapter-test semantic contract | **Replaced and strengthened** by §4; it remains a fresh executable specification |
| §4.4 17,163-byte / blob `a82f31ed8b981190d93c00226c16e6e3d4fc0617` / SHA-256 `9420547d503a0a0d1c4ac2f540af909214e432d00b3e6151f4e0867a1845476a` oracle | **Historical evidence only / non-normative / not copy or generative authority** |
| every other S1 section and ADR-0020 decision | **Unchanged** |

The S1 PASS review remains immutable evidence of its exact review and Authority-B execution. Its `implementation-ready` / zero-open-finding disposition is superseded only for the two §4.3/§4.4 byte-oracle authority conclusions. S1.1 does not invalidate or require repetition of the unchanged Authority-B local-font Build, localhost-IPC, emission or public-bundle security proof.

## 3. The one canonical JSON byte authority

The only G3–G10 historical-byte exception is this S1.1 docs/evidence file:

```text
path=docs/review-evidence/phase-1b-stage4a-phase-d-font-hermetic-s1-1-hybrid-c-v1/DEEPSEEK_SYNTHETIC_CONTRACT_CANONICAL_V1_0.json
sourceGitBlob=1082d3cb3449118b259177601b13e43bdc22587d
bytes=5201
sha256=01a41b23f31667b158d57c81f77957e5da4648219a385c83dda81cd6c79cac34
encoding=UTF-8
bom=ABSENT
lineTermination=EXACTLY_ONE_FINAL_LF
trailingBytes=ABSENT
```

Its raw serialization binds every member name, nesting relationship, array order, scalar value and byte. S1 §4.3 remains the semantic/security interpretation of those exact bytes. The complete fixture-owned inventory is exactly 39 cases: configuration 5; HTTP 12; invalid-response mutations 7; body failures 6; partial body 1; timeout 1; finish reasons 2; already-aborted 1; insufficient-resource 1; one-shot 1; redirect 1; success 1.

Author verification proved the exact request/body, all cases and expected values described by S1 §4.3, JSON parse, 39-case cardinality, UTF-8/no-BOM/one-final-LF serialization and absence of credential/placeholder, environment key/value, database identity/query, private path, account/project identity, official-source content and timestamp fields or values. The manifest records those bounded results without duplicating the raw JSON.

Only after exact S1.1 is independently accepted may S2 obtain `test-fixtures/ai/deepseek-synthetic-contract.v1.json` from this exact accepted S1.1 artifact. The final implementation file must be byte-identical to it. S2 may not obtain it from G9, another commit, a generated reconstruction, a download or another authority. No other G3–G10 Product/source/test/checker/profile byte may be copied.

## 4. Fresh TypeScript semantic executable specification

`src/integrations/ai/providers/deepseek-text-adapter.test.ts` is implemented fresh from exact accepted S1.1 and the canonical fixture. No future byte length, Git blob or SHA-256 is normative. Its final bytes/hash are recorded only as C2 evidence after full PASS.

### 4.1 Exact fixture-owned 39-case inventory

The test derives and asserts these exact, duplicate-free case-ID sets, and no other case ID:

| Group | Count | Exact IDs in fixture order |
|---|---:|---|
| configuration | 5 | `configuration:model-unsupported`, `configuration:temperature-and-top-p`, `configuration:temperature-high`, `configuration:top-p-negative`, `configuration:endpoint-parameter` |
| HTTP | 12 | `http:400`, `http:408`, `http:403`, `http:404`, `http:409`, `http:429`, `http:500`, `http:401`, `http:402`, `http:422`, `http:302`, `http:204` |
| invalid response | 7 | `invalid-response:extra_service_tier`, `invalid-response:unknown_top_level`, `invalid-response:reasoning_content`, `invalid-response:usage_totals`, `invalid-response:tool_calls`, `invalid-response:second_choice`, `invalid-response:unknown_finish_reason` |
| body failure | 6 | `body:empty`, `body:malformed-json`, `body:duplicate-key-json`, `body:invalid-utf8`, `body:response-too-large`, `body:transport` |
| partial body | 1 | `partial-body:transport` |
| timeout | 1 | `timeout:total-deadline` |
| finish reason | 2 | `finish:length`, `finish:content_filter` |
| already aborted | 1 | `transport:already-aborted` |
| insufficient resource | 1 | `transport:insufficient-system-resource` |
| one shot | 1 | `transport:one-shot` |
| redirect | 1 | `transport:redirect` |
| success | 1 | `success:complete-normalization` |

Each ID is derived by a closed exhaustive mapping from its fixture member/fields. Unknown field combinations throw before test registration. The test asserts group counts, total count 39, exact ordered ID arrays, global set cardinality 39 and zero duplicate/unknown ID.

Every fixture array entry is registered directly with `it.each`/equivalent one-to-one table registration. Every singleton is registered exactly once. No `filter`, conditional omission, `skip`, `todo`, `only`, slice, subset, default/fallback case or unregistered fixture member is allowed. The seven invalid-response mutations use exhaustive dispatch; an unknown mutation name throws.

### 4.2 Mandatory non-fixture regression cases

In addition to the 39 fixture-owned cases, preserve exactly these four explicit invalid-credential variants: `undefined`, `"short"`, one leading space before `synthetic-test-value-phase-d-01`, and one trailing LF after that value. Each fails `provider_auth_failed` with zero fetch.

Also preserve the Prompt mismatch check before credential read; reviewed envelope hash; 543-token estimate; exact endpoint, POST method, `redirect="manual"`, exact `Accept`, `Content-Type` and single `Authorization` headers; exact canonical outbound request body; credential read exactly once; fetch zero before execute and once after first execute; second execute failure without another fetch; and complete success normalization.

### 4.3 Explicit seams and import ceiling

Every fixture-owned Provider instance explicitly injects an in-memory `fetchImplementation` and a `credentialReader` returning exact `synthetic-test-value-phase-d-01`. The four invalid-credential negative instances also inject in-memory fetch and an explicit reader returning their exact negative variant; this is their sole allowed deviation. Default fetch and the default credential reader never execute in any case.

The complete import allowlist is only:

```text
vitest
@/ai/canonical-json
@/ai/providers/text-provider
./deepseek-text-adapter
../../../../test-fixtures/ai/deepseek-synthetic-contract.v1.json
```

Ban `node:*`, environment/config, database, network-client, real-validation, official-source, future composition/Worker, dynamic `import()` and `require`. Test helpers must remain module-local, stateless and deterministic.

### 4.4 Complete assertions

For every registered case, assert `kind`/`ok` plus every relevant normalized field supplied by the fixture; no assertion may stop at only one discriminator when the fixture supplies response status, failure code, retry class, HTTP status, completion, output, model, request identity or usage/cache values.

- configuration cases assert exact error code and zero credential/fetch calls;
- every HTTP case asserts exact `httpStatus`, `responseStatus`, `failureCode`, `retryClass`, one credential read, one in-memory fetch and the exact endpoint/method/manual-redirect/header/body tuple;
- every invalid-response mutation asserts `invalid_response_schema/not_retryable`, one credential read and one fetch;
- every body/partial/timeout case asserts the full fixture failure tuple and call counts; `durationMs` is accepted only when finite and nonnegative and exact fixture value `120000` drives the timer;
- finish-reason and insufficient-resource cases assert their complete success/failure completion tuple and call counts;
- already-aborted asserts `cancelled_no_response/not_retryable`, zero fetch and no destination hit;
- redirect asserts `302/unknown/unknown`, manual redirect, exactly one source fetch, zero redirect-destination hits and no response metadata/body follow;
- one-shot asserts first success, second `failure/not_retryable`, credential read once and total fetch count exactly one; and
- success asserts complete completion, output `{"safe":true}`, returned model, request/fingerprint identities, input/output/total/cache-hit/cache-miss `10/4/14/6/4`, exact request tuple, one credential read and one fetch.

### 4.5 Proportional acceptance authority

Coverage authority is exactly: this S1.1 inventory, runtime validation against the canonical fixture, Gate 1 `pnpm check:ai-phase-d-synthetic`, the existing Gate 3 checker and fresh independent source review. Do not add an AST/IR/schema package, code generator, coverage framework, runner, persistent state, extra output, new mutation class or new proof framework.

## 5. Preserved S1 authority

The exact 22-path S2 allowlist in S1 §3 remains byte-for-byte authoritative as a path/action set and still contains exactly 22 paths. S1.1 adds no implementation path. Package/workspace/checker/profile, four route tests, eight deletions, fixture destination, local-font transform/assets and SEO-test action remain unchanged.

Synthetic-only classification, zero external egress/DNS, numeric localhost IPC, local-font/public-bundle contract, task-owned migrated PGlite, G6 generated-root lifecycle, G9 semantic controls, no-`CI` error-mode pnpm currentness, fresh Gates 1–10/no retry, exactly two runtime/proof outputs, `ROTATION_REQUIRED_BEFORE_ANY_REUSE`, and Phase E/F/Production/Push/Deploy/checkpoint prohibitions remain unchanged.

No Product, test, script, fixture implementation, profile, font, package, lock, config, Schema, Migration, API, URL, SEO, publishing, Index or Product-data mutation occurs in S1.1.

## 6. Lineage, review and rollback

The exact authority graph is:

```text
fbe88cdd7639f32f48d92a0627833918b4924458
  -> accepted S1 adcbfe7984466f87ba7e530c0c9903dc02ce1260
       -> immutable S1 PASS review 17b6cb7add4238b33bf08e7837d68cca48ea6388 (evidence branch)
       -> S1.1 docs/evidence-only Candidate (forward authority branch)
            -> different fresh independent full S1.1 Design/security review
            -> Coordinator acceptance of exact S1.1
            -> fresh S2 only if separately resumed
```

S1.1 must be one clean sole/direct child of exact S1. The fresh reviewer independently verifies the Hybrid-C Blocker closure, canonical artifact bytes/semantics, 39-case executable contract, single copy exception, unchanged 22-path scope and continued applicability/integrity of the immutable Authority-B proof. The prior byte-oracle conclusion is not reusable. Because no font/Build/network authority changes, S1.1 does not authorize or require a second Authority-B Build; any request to rerun it requires separate authority.

The author does not self-review or accept S1.1 and does not start S2. Rollback discards S1.1 and returns current authority to immutable S1 plus its recorded Blocker; it does not rewrite S1 or review history.

## 7. Terminal status

```text
S1.1 = AUTHOR-READINESS CANDIDATE / NOT_ACCEPTED
HYBRID-C BYTE-ORACLE BLOCKER = REMEDIATED BY DESIGN / PENDING FRESH INDEPENDENT REVIEW
AUTHORITY-B FONT/SECURITY PROOF = IMMUTABLE AND UNCHANGED
S2 = PROHIBITED
NEXT GATE = DIFFERENT FRESH INDEPENDENT FULL S1.1 EXACT DESIGN/SECURITY REVIEW
```
