# CWT Phase 1B Stage 5 — S5-F6 Implementation Evidence and Candidate Gate Report V1.0

## Document control

| Field | Value |
|---|---|
| Project | CWT — CloudWave Textile |
| Version | `V1.0` |
| Evidence date | `2026-08-30` (`Asia/Shanghai`) |
| Role | Bounded S5-F6 Implementer |
| Restart decision | `SD-S5-F6-RESTART-001` under `SD-S5-REMAINDER-001` |
| Corrected accepted baseline | `adf7c01b7397ce10ebfdd880b558930164ee8e99` |
| Baseline tree | `1b2fc9796824bfe0ce272ab2598be06e0634644f` |
| Candidate branch | `refs/heads/codex/phase-1b-stage5-f6-implementation-evidence-restart-v1` |
| Candidate delta | This report and its adjacent `.sha256` sidecar only |
| Production Ready | **No** |
| Formal Product/media status | `Waiting for Real Product Data Validation` |

This report records implementation evidence only. It does not self-review or
accept Stage 5, authorize Stage 6/7, or authorize Merge, Push, Deploy,
SMTP/Provider, Production/Staging, formal data, Publish, Index, DNS, or another
external action.

The exact report-bearing Candidate commit and tree are emitted by Git only
after this self-hashed report is committed. They are therefore recorded in the
implementer callback and are the identities a fresh Independent Reviewer must
reproduce. This avoids an impossible commit/tree self-reference inside content
that contributes to those identities.

## 1. Authority and custody

The complete restart authority, original F6 authority, governance, and
acceptance records were read before evidence collection. Direct SHA-256 and
adjacent-sidecar verification passed for:

| Authority | Verified SHA-256 |
|---|---|
| S5-F6 time-coupling remediation coordinator acceptance | `cdf313c8a8b9b215633563586ffe5c64057c6db34bd23541e82bcb5327bd9adc` |
| S5-F6 implementation-evidence restart authorization | `577e4ef7aa2df0d39ca188223641f841675add683e6d2f86f1bc62e0825a3c99` |
| Original S5-F6 implementation-evidence authorization | `620862b6326239f8c01d286e4f7a97b8600a775fb635657f7e3df048511b2a79` |
| Accepted S5-F5 coordinator record | `7213da0c4da6663a3e987295d3bbd50a7346b612968edaba01c375fb476ee5ed` |
| Accepted Stage 5 plan body at Candidate `59d5d039…` | `91bb6d37e097dcc996256564550280118e5d9eafa48793440a5ed3ed67980510` |

All 16 tracked Stage 5 implementation/remediation report sidecars present on
the corrected baseline verified successfully. The separately adopted TR-P2-01
report has no tracked adjacent sidecar on this lineage; its independent review
sidecar and adoption identity were verified from the Owner handoff record.

### 1.1 Accepted plan, tooling, slices, and independent review identities

| Gate | Accepted Candidate / tree | Final independent review / report SHA-256 |
|---|---|---|
| Stage 5 plan | `59d5d039c8724560dec6e7ee80b72307d8a3acad` | `c9679d47fafa03d6329dc2786950d43dc31dccce` / `4a05e2988f5636ef69e6ccd58a1044c55f964edf385d499c670deb90ed292aa9` |
| S5-F0 / TR-P2-01 | `95910030f61b648aac2b708de293f06f02046c23` | `dfc6cac7a235d1a80f0a17c74a36324b60503d73` / `f8e8ae4428929555b54b66f96cdab54d6f5f7bd16a81c54cca64289cd892c806` |
| S5-F1 | `ccf233c786ed80036d0779c4aa142076f6795061` / `22ca13553f30c2268905138f25a3e39c2b6423c8` | `6ebf05be06c02d6cda84d47c9402943a22767415` / `18cd4e8233c5c2014614f188ca28e7d0d9ddb29ebb4ef785426c1df0e95e9089` |
| Accepted analytics correction | `b4592a997af04a335131e040235416db8ec505c5` / `f045e89ac52ed5523f19128567da7dd2be4484b1` | `6a47c2ceec0e6f9264a4ecd82cb42ee24234b0a0` / `6f0db228da9844d92a1c72ca4839211c25f9b0a70a6f69c2eb4cfec4b9bb426a` |
| S5-F2A | `ef42dfd85b17466a0d1b99a987e6ab31758e8d9b` / `3cc93123e94f7079850d16cf743189f30c299a3b` | `51e33ef3943754b7aee5fd71ef9a035547a7336c` / `5893f833b51f2e9170fda35564b29620e0448f89a8876e659d30fdaa44be1916` |
| S5-F2B | `99108322f3688726f22c3ebc8cf63fa98b71dda8` / `7343ad7832170f8eb0598654c478ab58ab852d75` | `1520e15afedf51f8c1f90eaee4a6401290d0648c` / `6db5c04586d4da90b574945345ed9b28068e1da2ea14bcbcfe649f7bfaf269f1` |
| S5-F3 | `183185f5041c960a117877d8cf9248e31cfb3ce5` / `079e2cce933e5c60b549bba6513f3537c4afc69e` | `476e331e1fa0fcc1fe8d598a10e1a159c914bfe7` / `afe7f1ca8d129157e6a0b3a35408bd03e93ae6f3cb9b00559e489cf5568b5256` |
| S5-F4 | `7e5dce6a351df0e858e0435d9c0f5e3c1f3cf36c` / `3502a02a3b2cdf0324a745a79f0832a7b3b9db5b` | `a372a42983e35174a6c96f11b3c3c6b58df3b5bb` / `211f70a3e9d880a9ae9836cec27ab5b83650ad2d934a9c6a48bdbd636372bb22` |
| S5-F5 | `5f225f181c5c440610192bc70f98cc572bb83535` / `edcfcfca0f0bfafe503a1d7049c7f99fe56fcc8d` | `2b86c048dddbcf2dc9da80ca829b6ff9535f0d04` / `47b6545a17bada144a06246ea871ca9a2383806360bcc46ee3953c0664966108` |
| Accepted F6 test correction | `adf7c01b7397ce10ebfdd880b558930164ee8e99` / `1b2fc9796824bfe0ce272ab2598be06e0634644f` | `eecfbfb04eb1d1c744de6cae8982047ae7a1d1d5` / `7f4c34be0c60a5068e34bf84296decd57cef08543ff9522a94a8dd75adbea3cd` |

The initial FAIL review-only commits for F3, F4, F5, and the first F6 test
remediation remain preserved as evidence. Every named review-only commit was
checked with `git merge-base --is-ancestor` and returned outside the corrected
Candidate ancestry.

### 1.2 Branch and rollback custody

Preflight reproduced a clean worktree at the corrected baseline and created
the restart branch directly there. The following protected refs stayed exact:

- stopped F6 evidence branch: `refs/heads/codex/phase-1b-stage5-f6-implementation-evidence-v1` at `5f225f181c5c440610192bc70f98cc572bb83535`;
- accepted F5 branch at the same `5f225f181c…` commit; and
- F6 test-remediation branch at `adf7c01b7397ce10ebfdd880b558930164ee8e99`.

The corrected baseline is the immediate rollback for this evidence-only
Candidate. The accepted F5 Candidate is the product rollback before the test
correction. The formal Stage 4 freeze remains
`f05852dbd3c5cff80421793a4ea345e401d50361`, tree
`a9c31e1370431d5de02cdff78113b075e80c94c1`.

## 2. Stage 4 to corrected Stage 5 inventory

The exact Stage-4-to-corrected-baseline range is linear: 35 commits, zero merge
commits, 100 changed paths, 25,961 insertions, and 642 deletions. File-based
classification was:

| Area | Changed-path share |
|---|---:|
| Evidence documents | 33% |
| Drizzle Migration/meta | 3% |
| Scripts/verifiers/worker entry point | 7% |
| Admin, Refine, Email Template Admin, Inquiry Admin | 15% |
| Analytics | 2% |
| CRM and Inquiry API | 13% |
| Database schema/runtime tests | 2% |
| Template Domain | 9% |
| Integrations/Outbox/envelope | 7% |
| Public-site composition | 5% |
| Upload regression | 1% |
| Browser evidence | 2% |

The only Stage 5 schema delta is additive Migration
`drizzle/0022_phase1b_stage5_inquiry_attribution.sql` plus its generated
snapshot and one append-only journal entry. It adds six nullable Inquiry
attribution/source columns, one source-entity index, and one paired-nullability
Check. No earlier SQL or snapshot changed and no prior journal entry was
rewritten.

There is no new table, enum, queue, Worker lifecycle, role, permission, public
URL, SEO/Redirect/Publish/Index authority, dependency, lockfile, or CI delta.
The only `package.json` delta from Stage 4 is the two-line Owner-adopted S5-F0
Playwright readiness/ensure script exposure; dependency sections and
`pnpm-lock.yaml` are unchanged. Stage 5 adds only the authenticated/noindex
Admin email-template route, not a public route.

## 3. Integrated verification record

| Gate | Exact fresh result |
|---|---|
| Runtime | `pnpm env:check` PASS: Node `v24.14.0`, Darwin ARM64; pnpm `11.9.0` |
| Focused CRM/Inquiry/Template/Outbox/public composition | PASS: 10 files / 86 tests |
| Focused Admin/Template lifecycle and actions | PASS: 7 files / 52 tests |
| Protected-scope/privacy regression | PASS: 7 files / 150 tests across Template scope, Outbox convergence, public bundle, Admin UX static, analytics privacy, CRM record scope, and Upload isolation |
| Lint | `pnpm lint` PASS with `--max-warnings=0` |
| TypeScript | `pnpm typecheck` PASS; isolated Build TypeScript PASS |
| Drizzle | `pnpm db:generate` reported 60 tables and `No schema changes, nothing to migrate`; no tracked delta; digest `364de1c6e29ea4fe98fc27bdb5a691fb8eb50edb85752f793dc5ef3c831a3cb7` |
| Source-clean architecture | `.next` absent; Production/static-resource/URL/protected-capability scan reached; exit `1` only at inherited obsolete Phase-D sole-parent requirement `ee13e743…` |
| Corrected NUL-safe tracked manifest | 156 exact tracked arguments; Vitest reported 143 files passed / 11 skipped `(155)`, 1093 tests passed / 85 skipped `(1185)`; only inherited Phase-D lineage and Vitest source-map error were non-zero |
| Exact broad command | Unmodified `pnpm test:run`; same 143 passed / 11 skipped files and 1093 passed / 85 skipped tests; exit `1` only for the accepted inherited conditions; zero ordinary Candidate failure |
| Disposable PostgreSQL | PASS on loopback-only local `postgres:18.4-alpine`, image digest `sha256:9a8afca54e7861fd90fab5fdf4c42477a6b1cb7d293595148e674e0a3181de15` |
| Browser readiness | PASS with Playwright `1.62.1`, Chrome for Testing `151.0.7922.34` / revision `1234`, FFmpeg `1011`, Darwin ARM64, accepted default per-user cache |
| Browser/Admin/CRM | PASS 4/4 in 46.1 s: desktop Template lifecycle, desktop CRM, Pixel 7 populated Template accessibility/containment, Pixel 7 CRM; `--retries=0 --workers=1` |
| Browser cache custody | Full relative-path/file-content fingerprint unchanged before/after at `7a8ca986640ecec5fb06b4b4a26f6d3fc20db010e6099656e9fe6d2fa18660dc`; no ensure-browser, download, override, or network install |
| Isolated migrated/core-seeded Build | PASS in a unique `/tmp` root: Migration, core seed, optimized compile, strict TypeScript, 44/44 page units including `/admin/email-templates` |
| Public bundle | PASS: 391 eligible server runtime JavaScript files, 20 public manifests, 7 root chunks, 8 manifest chunks, 15 distinct chunks |
| Post-Build architecture | Same sole inherited Phase-D lineage assertion only; generated `.next` did not mask another failure |
| Diff and whitespace | Stage-4-to-baseline `git diff --check` PASS; final evidence-only range is rechecked after commit |

### 3.1 Inherited L-02 truth

The architecture gate and both broad executions were not filtered, caught,
suppressed, skipped, weakened, downgraded, or called an unconditional PASS.
They exit non-zero because the obsolete Phase-D aggregate verifier still
requires sole parent `ee13e743158e245f520a8d7ec68aa1854179fdc3` and Vitest then
encounters the known `convert-source-map` invalid-JSON diagnostic on the
Unicode workspace path. All ordinary source tests complete with the exact
counts above. This is the accepted inherited Low; it is unchanged and does not
mask a new failure.

### 3.2 PostgreSQL 18.4 detail

The disposable verifier passed Fresh, representative Upgrade, and repeat/no-op
paths. It proved:

- v1 read compatibility and v2-only request-identity writing, exact replay,
  mismatch conflict, equal/different concurrency, and six-table Audit rollback;
- immutable eligible source pairs, later-ineligible replay immutability,
  Admin/assigned-Sales read scope, private/current-route safety, and
  `inquiries_source_entity_idx` plan use;
- Template draft contention, monotonic versions, sole Settings Active pointer,
  Apply Audit rollback, rollback-as-new-later-revision, Synthetic Preview, and
  one fixed-recipient capture-only test-send attempt;
- all-or-nothing two-kind Outbox creation, no replay job, distinct stable
  Delivery Keys, simultaneous different-row claims, same-row fencing, both-kind
  immutable rendering, no private-file load, and
  `notification_outbox_delivery_idx` plan use;
- strict active legacy internal compatibility with customer/terminal/polluted/
  unsupported rows rejected; attempt counts `0..5`, equal-counter enforcement,
  fifth-attempt settlement, eligible exhausted Dead terminalization, zero sixth
  transport, sibling independence, and concurrent direct/batch fencing; and
- fresh injected clock calls for discovery/claim/settlement, lease-expiry truth,
  backoff, and the corrected default-current-time delivery plus explicitly due
  fixed-time legacy fixture.

The loopback container was deleted immediately after evidence and its name no
longer resolves.

### 3.3 Browser and integrated UX detail

The desktop flow created/submitted/applied two internal revisions, rolled back
historical v1 as a new applied v3, created/submitted the customer revision, and
performed the Admin-only fixed-recipient capture test send. Pixel 7 then read
the same lifecycle-populated database.

Both viewports retained unique kind-specific Synthetic Preview landmarks,
exact fallback bytes, the long valid unbroken custom source, real
visual-viewport containment, visible history SHA bytes, computed normal-text
contrast above `4.5:1`, and unfiltered Axe zero violations. Role/navigation/
direct-route denial, keyboard focus, action status/conflict truth, CRM
attribution/outcome and record scope, customer-record isolation, and public
bundle isolation remained green. The browser run used no real Inquiry Preview,
SMTP/Provider, real recipient, Staging/Production configuration, or network
installation.

## 4. Security and privacy disposition

Static composition and executable evidence confirm:

- UI/Server Actions remain narrow adapters to Domain Services; there is no
  direct UI business-table write authority;
- customer PII, Inquiry/Contact/Organization IDs, private Asset/Upload identity,
  filenames, Object Keys, storage URLs, rendered bodies, and browser authority
  are absent from new Outbox payloads and public analytics;
- the strict Template allowlists, whole-template fallback, trusted server-built
  operations URL, fixed Synthetic Preview, and captured immutable provenance
  remain the only rendering inputs;
- logs/Audit expose typed outcomes and safe job/reference data, not address
  lists, bodies, credentials, Cookies, Tokens, app passwords, or private files;
- server-persisted consent and the accepted public-reference eligibility risk
  boundary remain exact; untrusted forwarding headers are not authority;
- the request path commits the Inquiry/two jobs/Audit and performs no ordinary
  delivery attempt; there is one v2 writer, one bounded legacy reader, one
  claim/processor path, and one shared envelope authority; and
- public route HTML/bundles contain no Admin/Refine/Template authority marker,
  private identity, raw Object Key, or permanent provider/storage URL.

No secret, credential, formal customer/product data, captured message, or
external Provider result was collected into this report.

## 5. Acceptance-matrix disposition

| IDs | Disposition and evidence |
|---|---|
| `U-01`, `U-02` | PASS unchanged regression: real-Product eligibility and explicit Publish/Index independence remain authoritative. |
| `U-24` | PASS: strict plain-text kind schemas, allowlists, canonical hash, injection/markup/private-content rejection, deterministic renderer and complete fallback. |
| `U-25` | PASS locally: one shared trusted envelope; Local/Test capture only; complete Synthetic Staging To/CC/BCC replacement; Production incomplete config fails closed. Real provider behavior is not claimed. |
| `U-26` | PASS: two stable distinct Delivery Keys/Message-IDs derived from one Inquiry and independently settled. |
| `U-27` | PASS: immutable First Touch, approved Last Non-Direct, Submit Touch/source resolution, analytics PII exclusion. |
| `I-01` | PASS: service authorization and atomic required Audit, including forced Audit rollback. |
| `I-29` | PASS: anonymous request identity/replay, Contact preservation, transactional Inquiry plus exactly two jobs. |
| `I-30`, `I-31` | PASS locally through capture: strict kind dispatch, trusted envelopes, no private attachment, independent internal/customer result and retry truth. No provider send is claimed. |
| `I-32` | PASS: Revision-backed Draft/review/history/rollback, sole Settings Active pointer, Preview/test send, permission matrix, required Audit. |
| `I-33` | PASS with Synthetic policy: all logical Staging recipients replaced after resolution and before capture boundary. |
| `I-34` | PASS: job-ID claim, Lease/fencing, fresh clocks, bounded backoff, strict attempt ceiling/Dead, stable identity, redacted outcomes. |
| `I-35` | PASS: immutable attribution/source persistence and safe current presentation. |
| `I-36` | PASS unchanged: CRM outcome/qualification/first-response authority, Audit and queryable projection. |
| `I-37` | PASS: public analytics contains no customer/entity/private-Asset identifier or untrusted network identity. |
| `P-01` | PASS: pre-0022 SQL/snapshots unchanged; journal history append-only. |
| `P-02`, `P-03`, `P-04` | PASS on PostgreSQL 18.4 Fresh, representative Upgrade, and repeat/no-op. |
| `P-07` | PASS for applicable 0022 paired source constraint/nullability/index and existing transaction constraints. |
| `P-12` | PASS local contention/fencing/recovery evidence under the application's honest at-least-once boundary. Provider idempotency remains external. |
| Applicable query plans | PASS locally for `inquiries_source_entity_idx` and `notification_outbox_delivery_idx`; scale-volume `P-13` is not reclassified and remains External Validation. |
| `S-01` | PASS: Admin governed operations and atomic Audit. |
| `S-02` | PASS: Admin-all/assigned-Sales-only record scope across projection and UI; unrelated roles denied. |
| `S-03` | PASS: editorial/template permissions grant no CRM/private-file/secret/environment authority. |
| `S-04` | PASS unchanged public-media eligibility and controlled route regression. |
| `S-05` | PASS: private Inquiry files remain record scoped and never become template input, email attachment, public Asset, or AI input. |
| `S-08` | PASS unchanged session/origin/action boundary; no credential/private URL in route or log evidence. |
| `S-10` | PASS: redacted job/outcome evidence only. |
| `B-09`, `B-10` | PASS desktop/Pixel 7: governed Template Admin and record-scoped CRM attribution/outcome UX. |
| `B-11` | PASS for the accepted changed critical surfaces at actual 412 px Pixel 7 and 1280 px desktop visual viewports with no horizontal loss. Unchanged wider matrix/manual widths are not newly claimed. |
| `B-12`, `B-13` | PASS: keyboard/focus, unique landmarks/names, labels, statuses and full-page unfiltered Axe zero. |
| `B-14` | PASS for applicable Template history/Preview: exact visible content, no clipping, and lifecycle-populated SHA contrast above `4.5:1`. Formal media acceptance remains later. |
| `B-15` | PASS for applicable validation/conflict/async capture outcome status, recoverability and non-color-only meaning; unchanged manual motion coverage is not expanded. |
| `E-01`, `E-04`, `E-07`, `E-10`, `E-11` | PASS unchanged regressions: stable public namespaces, authoritative Product eligibility, low-value noindex, audited 301 graph, and application-controlled public media URLs. |
| `X-01` | **EXTERNAL VALIDATION**: Zoho DNS/sender authentication/app-password separation not invoked or locally passed. |
| `X-02` | **EXTERNAL VALIDATION**: actual Zoho delivery, acknowledgement, outage/timeout/rejection, and Provider deduplication not invoked or locally passed. |

## 6. Compatibility, rollback, and operating limits

Compatibility remains bounded and explicit:

- the Inquiry request-identity v2 writer never writes v1, while the exact v1
  compatibility reader remains read-only;
- the new Outbox writer writes only strict v1 two-kind payloads; the sole legacy
  reader accepts only the exact historical internal-notification object and
  never manufactures a customer-confirmation job;
- already-enqueued payloads retain immutable Template snapshot/hash/provenance
  across later Active changes; absent/invalid Active resolves the complete
  code-owned fallback without mixed content; and
- stable Delivery Key/Message-ID supports honest at-least-once recovery, but a
  Provider acknowledgement followed by a lost database fence can duplicate.
  Only later `X-02` can validate Provider deduplication.

Local rollback of this F6 Candidate is branch reset/repoint to corrected
baseline `adf7c01…` because the delta is evidence-only. Product rollback uses
accepted per-slice identities in Section 1.1. Before rolling back a deployed
worker revision in later authorized work, operators must hold/drain the worker
and inspect outstanding strict v1/legacy rows; rolling application code back
does not justify mutating or reactivating historical Outbox/Revision rows.
Migration `0022` is additive and backward-readable as nulls; rollback should
prefer application rollback while retaining the additive columns. A destructive
down Migration is neither present nor authorized.

## 7. Cleanup, open findings, and next gate

The PostgreSQL container, isolated PGlite/database/storage root, `.next`,
`tsconfig.tsbuildinfo`, Playwright report/results, and browser-run temporary
database/storage roots are absent from the worktree. Generated artifacts were
moved to explicit recoverable Trash locations; the accepted per-user browser
cache was unchanged. No remote, Provider, Production/Staging, DNS, formal data,
Merge, Push, Deploy, Publish, or Index action occurred.

Open findings and limits:

1. inherited L-02 remains visible exactly as recorded in Section 3.1;
2. `X-01` and `X-02` remain **EXTERNAL VALIDATION**;
3. target topology, Production/Staging isolation, formal Product/media/company
   facts, and final device/editorial acceptance remain later authorized work;
4. `Production Ready: No`; and
5. formal status remains `Waiting for Real Product Data Validation`.

No new Candidate/product/test defect was found, so neither
`NEEDS_COORDINATOR_REMEDIATION` nor `NEEDS_OWNER_DECISION` was triggered.

The next and only gate is a fresh Independent Review of the exact report-bearing
Candidate, including custody, evidence reproducibility, architecture/data/
security/privacy integrity, acceptance-matrix truth, compatibility/rollback,
evidence-only scope, proportional Security & Test Simplification, inherited
L-02 honesty, and External Validation classification. Implementer completion
does not accept or close Stage 5.
