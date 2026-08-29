# CWT Phase 1B Stage 5 — S5-F2A Source Resolution Implementation Report V1.0

| Field | Value |
|---|---|
| Date | 2026-08-29 (Asia/Shanghai) |
| Task | S5-F2A Server Source Resolution & Immutable Persistence |
| Implementation branch | `refs/heads/codex/phase-1b-stage5-f2a-source-resolution-v1` |
| Exact starting / rollback baseline | `b4592a997af04a335131e040235416db8ec505c5` |
| Code/test checkpoint | `4ca17fb45af70a82b6e23eded84c6d8c73b989c8` |
| Checkpoint sole parent | `b4592a997af04a335131e040235416db8ec505c5` |

Status represented by this document: bounded Implementer completion Candidate only; not independent acceptance and not authority for S5-F2B, S5-F3+, Merge, Push, Deploy, Publish, Index, Provider, or any external action.

The final report-bearing Candidate identity, tree, parent, branch, and clean
state are recorded by the Implementer callback after the commit is created.
A Git commit cannot contain its own final identity without changing that
identity. The immutable code/test checkpoint and rollback identity above are
therefore the in-document reproducible anchors.

## 1. Executive result

S5-F2A is implemented within the authorized boundary. A new Inquiry now
resolves its immutable source evidence only from the Domain-sanitized canonical
`sourcePagePath`, only after the transaction-local concurrent idempotency gate,
and only through current English Route ownership plus the applicable existing
public eligibility authority.

The existing nullable `source_entity_type` / `source_entity_id` pair is written
with the new Inquiry when and only when the source is fully eligible. Every
missing, stale, non-English, unsupported, Redirect-source, system/static,
Taxonomy, Fabric Library, draft, in-review, archived, or otherwise ineligible
source produces `null/null` without rejecting an otherwise valid Inquiry.

Exact v1/v2 replay and concurrent replay return the existing Inquiry before the
resolver can run. Later Route, entity, image, verifier, or publication changes
therefore cannot rewrite either a populated or null historical snapshot.

## 2. Authority and starting-state reproduction

| Authority | Required identity | Reproduced result |
|---|---|---|
| Continuation baseline | `b4592a997af04a335131e040235416db8ec505c5` | exact detached clean HEAD before branch creation |
| Accepted Stage 5 plan Candidate | `59d5d039c8724560dec6e7ee80b72307d8a3acad` | read only; no implementation copied or cherry-picked |
| Accepted plan SHA-256 | `91bb6d37e097dcc996256564550280118e5d9eafa48793440a5ed3ed67980510` | exact from the named Candidate |
| Owner development authorization | external handoff V1.0 | SHA-256 `1f792b5811d7607326898db7e75a2567cdbd2dc2472fbec9eb34f89a582ea053`; exact |
| Analytics-reliability Owner acceptance | external handoff V1.0 | SHA-256 `15c386ddec4b74401c169dfa69ff97800278241cc7ca3ebacec6c5ad50aa9b40`; exact |
| Runtime | Node `v24.14.0`, pnpm `11.9.0`, Darwin ARM64 | exact; frozen store reused with zero downloaded packages |

Root `AGENTS.md`, `docs/ENGINEERING_GOVERNANCE.md`,
`docs/REVIEW_POLICY.md`, the accepted plan, CRM/publication authority, and both
Owner documents were read before mutation. The branch was created fresh from
the exact accepted continuation baseline.

## 3. Root cause and corrected responsibility boundary

Migration `0022` and the Inquiry schema already owned the paired nullable
columns, Check Constraint, and reporting index. The remaining gap was at the
Inquiry Domain boundary: `createInquiry` deliberately wrote `null/null` and no
server-owned resolver existed.

The correction adds one narrowly scoped read-only query module. The Inquiry
Domain Service calls it inside the existing initial transaction, immediately
after the transaction-local concurrent idempotency check and before Contact,
Inquiry, attachment, Upload Token, history, Outbox, and required Audit writes.
The same transaction object is passed through every resolver query.

There is no client entity identity, Route ID, fallback UUID, post-commit
backfill, replay rewrite, background process, or second mutation path.

## 4. Exact eligibility and path behavior

### 4.1 Product

Product resolution directly invokes
`src/catalog/product-eligibility.ts::publicProductEligibilityConditions` in the
same database/transaction context. It does not copy or approximate the
predicate. The predicate continues to own Published state, verified real basis,
active authorized verifier, eligible public image, non-empty English name, and
current English Route eligibility.

The resolver first binds the exact canonical source path to one current English
Product Route. The authoritative predicate's Route existence check therefore
cannot substitute another entity or a client-supplied identifier.

### 4.2 Application

Application resolution narrowly reuses the existing public-detail semantics:

- entity `status = published`;
- an English localization;
- exact current English Route identity and path; and
- the Route's public SEO projection.

It does not add Index eligibility or the list-page eligible-Product requirement
to an Application detail source.

### 4.3 Content

Content resolution reuses the existing public Content boundary:

- entity `status = published`;
- an English localization and valid Author;
- exact current English Route identity and public SEO projection; and
- the existing Block parser/reference resolver with non-empty readable public
  projection.

Invalid Block versions, malformed documents, unresolved public references, and
empty readable projection fail softly to `null/null` for Inquiry attribution.
They do not create a second Content lifecycle.

### 4.4 Exact path semantics

`src/crm/inquiry-attribution.ts` remains the only sanitizer/normalizer. The
resolver performs no trimming, case folding, prefix matching, slash collapse,
query parsing, fragment parsing, Redirect following, or client-ID
reinterpretation.

The accepted sanitizer lowercases an otherwise valid required public path
before resolution; this existing behavior is covered explicitly. Query,
fragment, and repeated-slash raw input remain hard-rejected by the accepted
required-path contract. A canonical prefix, unmatched path, Redirect source,
or non-English/stale Route remains `null/null`.

## 5. Transaction, replay, and immutability

- The pre-transaction fast replay returns before transaction entry.
- The transaction-local concurrent replay gate returns before source
  resolution.
- Only a genuinely new Inquiry resolves and persists the pair.
- The pair is excluded from request fingerprint v2 because it is server-derived.
- Exact v1 replay remains read-only and never backfills the pair.
- Exact v2 replay cannot change a populated or null pair after later public
  state changes.
- Conflicting replay keeps the existing fail-closed 409 Domain result.
- Concurrent same-key creation produces one Inquiry, one source snapshot, one
  history row, one Outbox row, and one required Audit.
- Required Audit failure rolls back eligible source evidence together with
  Contact, Inquiry, attachment relation, Upload Token reservation/finalization,
  history, Outbox, and Audit. The Upload Intent returns to its original
  unconsumed state.

Existing Contact exact-email matching/no-overwrite, attachment validation,
notification delivery, and accepted S5-F1 Submit Touch/fingerprint behavior are
unchanged.

## 6. Privacy and authority boundaries

The pair is CRM evidence only. It is not consulted for authorization, public
eligibility, Index, Publish, analytics consent, billing, Provider identity, or
Product facts.

The actual public handler test proves:

- client `sourceEntityType`, `sourceEntityId`, and `routeId` input is rejected
  with no Inquiry mutation;
- a valid request persists the server-resolved Application pair;
- the public response remains exactly `ok`, `reference`, and `replayed`;
- Audit and Outbox payloads omit the pair and entity ID;
- `conversion_events` and `toPublicAnalyticsPayload` omit the pair and entity
  ID; and
- captured stdout/stderr contains neither the pair nor the resolved entity ID.

The public-bundle verifier now explicitly rejects all source-pair spellings and
the resolver module marker from the 20 public page manifests and their 15
distinct reachable chunks. The broader `.next/static` tree contains existing
Admin-only CRM schema output; it is not reachable from those public manifests
and is not misreported as public-page leakage.

## 7. Resolver and integration matrix

All fixtures are conspicuously Synthetic. The focused matrix covers:

- exact eligible Product, Application, and Content pairs;
- independent Product failures for Published state, real basis, active
  verifier, authorized verifier role, eligible image, English name, and current
  English Route;
- Application and Content Draft, In Review, and Archived states;
- unreadable Content public projection;
- missing entity, stale Route, non-English Route, active Redirect source,
  Taxonomy, Fabric Library, home/system, static page, unsupported Author, and
  unmatched path;
- accepted sanitizer case normalization, exact-prefix non-match, and hard
  rejection of query, fragment, and duplicate-slash input;
- client identity spoof rejection/ignore boundaries;
- populated and null replay immutability after Route/eligibility change;
- equal and conflicting concurrent replay; and
- required Audit rollback with a real Upload Token fixture.

The existing Inquiry, request-identity, handler, and UI-to-analytics composition
suites provide the preserved Contact, Upload Token, Outbox, notification,
Submit Touch, fingerprint dispatch, P1 analytics, and public response
regressions.

## 8. Verification record

| Gate | Decisive result |
|---|---|
| Runtime guard | pass; Node `v24.14.0`, Darwin ARM64 |
| Focused source/API/Inquiry composition | 5 files / 82 tests passed |
| Resolver/API source-targeted rerun | 2 files / 7 tests passed; 53 unrelated tests skipped by name filter |
| ESLint | pass with zero warnings |
| Strict TypeScript | pass |
| Drizzle generate/no-delta | 60 tables; `No schema changes, nothing to migrate`; pre/post protected hash `7ac8474854c473fd38cc923bbcb46e7e6998cacf52800dc311663c7c26488b7d` |
| Real PostgreSQL 18.4 | pass; Fresh, Upgrade, repeat/no-op, paired constraint, reporting index, eligible three-type persistence, equal/different concurrency, populated replay immutability, v1/v2 idempotency, Audit rollback, and exact cleanup |
| Corrected NUL-safe source-bound manifest | 145 NUL-safe source arguments selected after the one exact obsolete diagnostic exclusion; Vitest: 132 files / 995 tests passed, 11 files / 85 tests skipped |
| Isolated migrated/core-seeded Build | pass; optimized compile, strict TypeScript, and 43 static pages; exact temporary database directory removed |
| Public bundle boundary | pass; 376 eligible server runtime files, 20 public page manifests, 7 root chunks, 8 manifest chunks, 15 distinct public chunks; source pair/resolver forbidden tokens absent |
| Whitespace and protected scope | `git diff --check` pass; no Schema/Migration/Journal/snapshot, analytics/Provider, Route/Redirect, public read, Product/Application/Content mutation, dependency, lockfile, package script, CI, or browser-tool change |

The exact unmodified `pnpm test:run` command reported 132 passed files, 11
skipped files, 995 passed tests, and 85 skipped tests. It then exited 1 only
because the inherited obsolete Phase D static-language baseline diagnostic
failed and Vitest emitted its known follow-on source-map JSON error. No ordinary
test failed. The diagnostic was not changed, excluded from the broad command,
suppressed, or reclassified.

Real PostgreSQL used only `/Users/calvin/.docker/bin/docker`, client/server
`29.6.2`, the already-local ARM64 `postgres:18.4-alpine` image
`sha256:9a8afca54e7861fd90fab5fdf4c42477a6b1cb7d293595148e674e0a3181de15`,
`--pull=never`, loopback-only random ports, conspicuously Synthetic credentials,
and disposable databases. Both verifier containers, every prefixed database,
and temporary Migration directory were removed; the local image identity was
unchanged. No remote database, network service, Provider, Production/Staging
credential, or formal data was accessed.

No browser gate was required or run. Playwright ensure/download was not invoked
and no browser was downloaded.

## 9. Exact bounded changed-path scope

Code/test checkpoint paths relative to the exact baseline:

1. `src/crm/inquiry-source-resolution.ts` — new read-only resolver;
2. `src/crm/inquiry-service.ts` — one transaction-local call and pair insert;
3. `src/crm/inquiry-source-resolution.integration.test.ts` — resolver,
   immutability, concurrency, spoofing, rollback, and matrix evidence;
4. `src/app/api/inquiries/route.integration.test.ts` — actual public/
   analytics/privacy boundary regression;
5. `scripts/verify-stage5-f1-postgres.ts` — existing guarded verifier extended
   for F2A; no second PostgreSQL framework.

Final evidence closure additionally changes:

6. `scripts/check-public-bundle.mjs` — existing public reachability gate adds
   F2A forbidden tokens;
7. this report; and
8. its adjacent `.sha256` sidecar.

No coordinator handoff file was copied, edited, or committed.

## 10. Complexity report

- Root cause fixed at the Inquiry Domain transaction boundary.
- One small resolver module was added because embedding three public authority
  queries inside the already large Inquiry service would increase coupling and
  duplicate comprehension cost.
- No table, column, enum, index, Check, Migration, state, Worker, queue, cache,
  lock, dependency, package script, CI rule, compatibility layer, or second
  eligibility authority was added.
- No old source resolver or writer existed, so no dual path remains.
- Persistent and operational complexity stayed level. Local query complexity
  increased only by the reads required to establish the immutable evidence.
- The existing F1 PostgreSQL and public-bundle mechanisms were extended instead
  of creating new verification frameworks.

## 11. Open finding, rollback, and next gate

The sole open finding is the inherited obsolete Phase D generated-root/
static-language/source-map broad-harness Low. It is unrelated to S5-F2A and is
carried without suppression.

Rollback is exact and local:

```text
git switch --detach b4592a997af04a335131e040235416db8ec505c5
```

This discards no external state because this task performed no Push, Merge,
Deploy, Provider call, Production/Staging access, Publish, Index, DNS, or formal
data operation. If rollback is needed while preserving this Candidate, keep the
`codex/phase-1b-stage5-f2a-source-resolution-v1` branch and create a separate
worktree at the baseline.

The single next gate is a different fresh independent Reviewer covering
architecture/data integrity, Route and eligibility authority, idempotency and
concurrency, privacy, PostgreSQL evidence, scope, and proportional
Simplification/complexity. Implementer completion does not accept S5-F2A or
authorize S5-F2B/S5-F3/external action.
