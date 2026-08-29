# CWT Phase 1B Stage 5 — S5-F4 Two-Kind Outbox Convergence Implementation Report V1.0

Date: 2026-08-30  
Role: bounded S5-F4 Implementer  
Status: COMPLETED FOR INDEPENDENT REVIEW; NOT ACCEPTED  
Branch: `codex/phase-1b-stage5-f4-two-kind-outbox-v1`

## 1. Authority, baseline, and rollback

Implementation started from the exact accepted S5-F3 Candidate
`183185f5041c960a117877d8cf9248e31cfb3ce5`, tree
`079e2cce933e5c60b549bba6513f3537c4afc69e`. The accepted S5-F3 branch
`refs/heads/codex/phase-1b-stage5-f3-template-authority-v1` remained at that
commit and was not moved.

The new implementation branch was created directly from that Candidate. The
code/test checkpoint is:

- commit `7b82567f3175f05b1e1cdb15a171d896a1873314`;
- tree `61968cdb1631fc651c8ec399d1c86afc46bbf132`; and
- sole parent `183185f5041c960a117877d8cf9248e31cfb3ce5`.

The Owner authorization body and adjacent sidecar both verified as SHA-256
`b647408fac5bde1bfd4f98aa2890e0e2c4b067f94c1cb5715e21509ffd2edaf6`.
The S5-F3 Owner acceptance body verified as
`9806895c6d56922baecb7546918f628d9e167dcd41c3e1457eb63cb6f5bb99cb`.
Root `AGENTS.md`, `docs/ENGINEERING_GOVERNANCE.md`, the accepted Stage 5 plan
from Candidate `59d5d039c8724560dec6e7ee80b72307d8a3acad`, and the accepted S5-F3
Template contracts were read before mutation.

The exact S5-F3 Candidate remains the rollback point. No review-only commit,
merge, external branch, Push, or deployment entered Candidate ancestry.

## 2. Implemented convergence

### 2.1 Atomic two-kind writer

`createInquiry` no longer accepts an `EmailNotifier` and has no post-commit
delivery attempt. A new Inquiry transaction resolves the complete S5-F3 Active
or code-fallback snapshot for both approved kinds and inserts exactly:

1. `inquiry_notification:{inquiryId}`; and
2. `inquiry_customer_confirmation:{inquiryId}`.

Contact, Inquiry, eligible attachment links, Upload consumption/finalization,
initial status history, both Outbox rows, and required `inquiry.created` Audit
remain in the same transaction. The second-row failure-injection seam exists
only as a focused transaction test option and is absent from public call paths.
Second-job failure and required Audit failure leave zero partial mutation.

Exact replay returns before enqueue. Concurrent equal requests converge on one
Inquiry and its original two jobs; mismatched requests conflict. Historical and
legacy Inquiry rows do not manufacture a customer-confirmation job.

### 2.2 Strict immutable payload

Every new writer emits only strict `schema_version: 1` with these top-level
fields:

- `schema_version`;
- `inquiry_id`;
- `template_snapshot`; and
- nullable `source_entity_label_snapshot`.

The template snapshot contains exact kind, contract version, source-specific
revision provenance, canonical SHA-256, subject source, and text-body source.
Revision provenance requires both Revision ID/version; code fallback requires
both null. Kind mismatch, unknown kind/version/field, partial provenance,
canonical drift, unsafe label, and invalid Template source fail closed.

The payload contains no submitted customer values, customer email/WhatsApp/
description, rendered body, filename, private Asset ID, Object Key, storage URL,
Contact/CRM/Consent identity, or browser authority. The only Inquiry identifier
is the internal pointer required for worker loading. The optional safe source
label is normalized, trimmed, control-free, bounded, and server-resolved.

### 2.3 Strict bounded legacy read

The old internal payload has one `.strict()` read-only parser. It is accepted
only when all of these are true:

- kind is exactly `inquiry_notification`;
- status is active (`pending`, `processing`, or `failed`);
- row creation precedes the code-owned
  `2026-08-30T00:00:00.000Z` cutover; and
- every legacy field passes its exact schema with no unknown field.

Customer-confirmation, post-cutover, terminal, unknown-field, and malformed
legacy rows are rejected. No new writer can emit the legacy shape.

### 2.4 One job-ID processor and immutable rendering

Due listing returns Outbox job IDs. Claim is by job ID, exact aggregate/kind,
claimable status/time, and equal historical `attempts`/`attempt_count`. It uses
the existing one-minute row Lease and increments both counters together.
Same-row contention produces one owner; different-kind rows can be claimed
simultaneously.

After claim, the worker:

1. strictly dispatches kind/version;
2. checks payload Inquiry pointer against the Outbox aggregate;
3. loads immutable Inquiry submission fields directly, without Contact or CRM;
4. counts `inquiry_assets` without selecting Asset/private-file identity;
5. reconstructs and hash-verifies the captured Template snapshot;
6. builds the trusted operations URL from server policy plus Inquiry ID;
7. renders through the accepted S5-F3 renderer; and
8. sends through the one shared envelope/transport boundary.

Active Template changes do not affect a queued job. New Inquiries capture the
new Active identity while earlier jobs retain their original snapshot. Legacy
internal rows load the Inquiry and use the exact internal code fallback.

Success, failure, uncertain result, expired-Lease recovery, exponential bounded
backoff, fifth-attempt Dead, lost fence after acknowledgement, stable Delivery
Key/Message-ID, and equal counters use the existing row-scoped state. One job
never mutates its sibling or the Inquiry. Stored errors are fixed sanitized
classes/messages and contain no transport detail.

### 2.5 Central envelope and environment policy

`src/integrations/email.ts` is now the sole envelope/capture/SMTP-construction
authority shared by ordinary Outbox delivery and S5-F3 Synthetic test send.
From and Reply-To remain code-owned. Header/control/multi-address injection is
rejected.

- Local/Test: SMTP construction and SMTP calls are refused; capture-only is
  required.
- Staging: To is replaced with exactly `test@cwtextile.com`; each non-empty
  CC/BCC field becomes exactly that one address; empty fields stay empty. Test
  send prefix order is exactly `[STAGING] [TEST]`.
- Production: incomplete driver, trusted From/internal recipient, SMTP host/
  user/password, isolated PostgreSQL, or external monitoring fails closed.
- Test send: still Admin-only, Synthetic-only, fixed recipient, capture-only,
  one attempt, required attempt Audit before transport, event-only outcome
  Audit, and honest success/failure/uncertain truth.

The only `nodemailer.createTransport` and `sendMail` call are inside the
central SMTP adapter. No real SMTP/Provider/network email was constructed or
invoked during implementation or verification.

## 3. Decisive evidence matrix

| Contract | Executable evidence and result |
|---|---|
| Two-row atomicity | PGlite and PostgreSQL tests prove exactly two unique kind/Delivery-Key rows. Forced second-row and required Audit failures restore Contact/Inquiry/history/Outbox/Audit counts. Existing attachment and Upload rollback suites remain green. |
| Replay/concurrency | Accepted request-fingerprint suites plus PostgreSQL Fresh prove initial/replay/mismatch, concurrent equal and different submissions, and no replay enqueue. Upgrade preserves a legacy one-job row without retroactive confirmation. |
| Payload/privacy | Strict schema tests cover exact keys, source-specific provenance, kind/version/field/hash rejection, fallback capture, safe label, and direct-DB pollution. Serialized payload probes exclude actual customer/private/CRM/Consent values. |
| Retry immutability | An Inquiry queued under fallback renders fallback after a later custom Apply; a new Inquiry captures/renders the custom Active. |
| Claim/Lease | PGlite and PostgreSQL prove job-ID listing/claim, same-row contention, simultaneous two-kind claim, counter equality, expired recovery, sibling independence, deterministic backoff, fifth-attempt Dead, and lost-fence truth. |
| Legacy | Parser matrix and actual delivery prove only strict active pre-cutover internal rows; post-cutover pollution reaches no transport. New writer always has `schema_version: 1`. |
| Rendering/private isolation | Actual internal/customer captures use Inquiry snapshots, trusted operations URL, source-label snapshot, and attachment count. Static and runtime probes show no Asset/Object Key/filename/private URL load or attachment. |
| Envelope | Tests cover local/test SMTP construction/call refusal, complete Staging To/CC/BCC replacement, empty arrays, exact `[STAGING] [TEST]`, Production incomplete-config refusal, CR/LF/control/multi-address rejection, stable Message-ID, and sanitized outcome state. |
| Request path | Static proof and route tests show no notifier import/constructor/call, no post-commit sender, and public success depends only on the committed transaction. |
| S5-F3 regression | Template contract, renderer, exact fallback, resolver, Settings/Revision/Audit, permission, Preview, pollution, rollback, and test-send suites remain green. The prior scope test was narrowed only to permit the newly authorized shared envelope import in `test-send.ts`; Template core remains integration-free. |

## 4. Verification record

All data and credentials were conspicuously Synthetic. No browser, SMTP,
Provider, remote service, Production/Staging data/config mutation, formal data,
or external action was used.

| Gate | Decisive result |
|---|---|
| Runtime guard | PASS; Node `v24.14.0`, Darwin ARM64 |
| Focused F4 contract/static suite | PASS; 4 files, 33 tests |
| Zero-warning lint | `pnpm lint` PASS |
| Strict TypeScript | `pnpm typecheck` PASS; optimized Build TypeScript PASS |
| Corrected NUL-safe source manifest | PASS; 152 source arguments; 141 files passed, 11 skipped; 1059 tests passed, 85 skipped; excluded only `src/ai/phase-f-m6-one-case-diagnostic.integration.test.ts` |
| Drizzle no-delta | PASS; 60 tables; `No schema changes, nothing to migrate`; protected pre/post digest `7ac8474854c473fd38cc923bbcb46e7e6998cacf52800dc311663c7c26488b7d` |
| PostgreSQL 18.4 | PASS; Fresh/Upgrade/repeat plus Template authority and F4 two-row atomicity, replay, payload privacy, concurrent job-ID claim/fencing, rendering, stable identity, and `notification_outbox_delivery_idx` plan |
| Isolated Build | PASS; fresh migrated/core-seeded PGlite; optimized compile; TypeScript; 43 static pages |
| Public bundle | PASS; 382 eligible server runtime files, 20 public manifests, 7 root chunks, 8 manifest chunks, 15 distinct chunks |
| Diff/whitespace/scope | PASS; `git diff --check`; no Schema/Migration/Snapshot/Journal, dependency, lockfile, package script, CI, role/permission, second queue/state/Worker, S5-F5 UI, Inquiry lifecycle, CRM, Analytics, Product/SEO/Publish/Index behavior change |
| Browser | NOT RUN by authorization; no browser download/ensure-browser |

The disposable real database used only the already-local
`postgres:18.4-alpine` image
`sha256:9a8afca54e7861fd90fab5fdf4c42477a6b1cb7d293595148e674e0a3181de15`,
a random loopback port, and Synthetic credentials. The guarded verifier
confirmed server `18.4`, removed every prefixed database, and the exact
container was removed after PASS.

### 4.1 Exact broad command truth

The unmodified `pnpm test:run` was run both source-clean and after Build. Each
run reported:

- 141 files passed and 11 skipped out of 153;
- 1059 tests passed and 85 skipped out of 1151; and
- exit 1 only because the inherited architecture child requires historical
  sole parent `ee13e743158e245f520a8d7ec68aa1854179fdc3`, followed by the known
  Vitest `convert-source-map` invalid-JSON unhandled error.

There was no ordinary or Candidate-related failed test. The exact command was
not changed, caught, skipped, suppressed, downgraded, or blessed.

Source-clean architecture initially had two non-decisive setup calls: one was
correctly rejected because `CWT_INSTALLED_NODE_MODULES` was absent; after
`.next` moved away, one was correctly rejected because generated
`next-env.d.ts` still referenced absent `.next/types`. After both generated
artifacts were moved and pinned dependencies were supplied, the verifier passed
its Production graph/static-resource/URL/protected-capability probes and stopped
only at the inherited lineage Low above.

After Build regenerated `.next` and `next-env.d.ts`, direct architecture and
the second exact broad run reached the same inherited lineage guard. Generated
output therefore did not mask or reorder the protected checks.

## 5. Bounded changed-path summary

The code/test checkpoint changes 20 paths, grouped as follows:

- new strict payload authority and tests:
  `notification-outbox-payload.ts` and its focused test;
- converged Outbox processor and integration/static evidence;
- centralized `email.ts` envelope/transport authority and tests;
- S5-F3 test-send adapter convergence;
- Inquiry Domain atomic two-row writer and removal of post-commit delivery;
- public route and accepted Inquiry/CRM/Upload regression updates;
- local processor adapter update; and
- proportional real-PostgreSQL verifier extension.

No schema, Migration, Journal, Snapshot, dependency, lockfile, package script,
CI configuration, persistent coordination state, second queue, Worker,
scheduler, cache, provider deduplication, Admin UI, browser path, or ordinary
delivery fallback was added.

## 6. Open findings and next gate

No new S5-F4 implementation finding remains open. The inherited obsolete
Phase-D fixed-lineage/Vitest source-map Low remains visible and unchanged; it
is not an S5-F4 acceptance claim.

Implementer completion is not acceptance. The next gate is a different fresh
Independent Reviewer covering two-kind atomicity, immutable payload/provenance,
strict legacy boundary, sole Outbox state/claim/Lease authority, renderer and
private-file isolation, shared envelope/environment behavior, capture-only
truth, PostgreSQL evidence, request-path removal, scope, and Security & Test
Simplification. This report does not authorize S5-F5, Merge, Push, Deploy,
Provider validation, or any external action.
