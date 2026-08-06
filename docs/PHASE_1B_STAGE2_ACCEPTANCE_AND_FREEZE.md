# CWT Phase 1B Stage 2 Acceptance and Immutable Freeze

Status: **Accepted and Frozen**

Acceptance date: **2026-08-06 (Asia/Shanghai)**

Production Ready: **No**

Formal Product Status: **Waiting for Real Product Data Validation**

Stage 3: **Planned / Deferred — not authorized**

This document records the project owner's acceptance and immutable local freeze of the exact Phase 1B Stage 2 scope and Candidate Code Baseline. It does not authorize Stage 3, Push, deployment, Production, external-provider configuration, credentials or formal-data use.

## 1. Authoritative baselines and acceptance authority

| Item | Identity or result |
| --- | --- |
| Stage 1 Approved Tag | `phase-1b-stage1-approved-2026-08-06` |
| Stage 1 Annotated Tag Object | `53893bc936a9d2a1a9adfa75e1f27e265431192f` |
| Stage 1 Tag peeled Commit | `3c1d057845b415eaac2ee54ca42001b5ce0a3afb` |
| Stage 2 Candidate Code Baseline | `0a748e828d0b1265fce801879e4d3f2136ae0702` |
| Stage 2 Approved Tag | `phase-1b-stage2-approved-2026-08-06` |
| Fresh Acceptance report | `.data/PHASE_1B_STAGE2_FRESH_ACCEPTANCE_REPORT.md` |
| Fresh Acceptance report SHA-256 | `eaf66ad61cd03b4cdb68541c089aa49b070796500f4ffe340535b490e876cfdf` |
| Independent conclusion | Stage 2 Fresh Acceptance Passed — eligible for Project Owner to record acceptance and freeze |
| Project Owner decision | Accept the recorded non-blocking Low and record Stage 2 as Accepted and Frozen |

The document-only Freeze Commit is the direct child of the Stage 2 Candidate Code Baseline and contains only this file. The local Annotated Approved Tag identifies that Freeze Commit, not the Candidate Commit directly. The Freeze Commit and Tag do not alter or reinterpret the Candidate Code Baseline.

## 2. Complete Stage 2 linear Commit chain

The complete first-parent Stage 2 range is `3c1d057845b415eaac2ee54ca42001b5ce0a3afb..0a748e828d0b1265fce801879e4d3f2136ae0702`. It is linear, begins as a direct child of the Stage 1 frozen Commit and was not rebased, squashed, amended or rewritten.

| Commit | Subject | Scope |
| --- | --- | --- |
| `261cf72d551da29110d7534a677aa7279ade95a8` | `feat: add phase 1b stage 2 editorial experiences` | Initial Stage 2 Home/About and editor implementation |
| `abbe55174dd96e127061e078605ad5e017f5dfbf` | `fix: complete stage 2 editor accessibility` | Initial accessibility completion |
| `e51a03e117bbb174c5c22bb37b91e67eb3adbad7` | `docs: record phase 1b stage 2 implementation` | Initial implementation report |
| `ad0f085530bc13ce58b90f1c028c77911dbef124` | `fix: complete stage 2 consolidated remediation` | Consolidated review remediation |
| `0429cbb011fea8b7979aa97ae6613214d3817487` | `docs: record stage 2 consolidated remediation` | Consolidated remediation report |
| `9fd989925772ef35ecdadfb23f6f26b7ff63f42f` | `fix: close stage 2 remaining authority gaps` | Focused authority remediation |
| `fd12750e40ed08fd4e43f18decc91626a917bc94` | `fix: stabilize anonymous admin denial` | Stable anonymous denial follow-up |
| `4f5db9998a5746b20e6a540741a3e175d6aa8360` | `docs: record stage 2 focused remediation round 2` | Focused remediation Round 2 report |
| `3bc1d6be8f98a2e5c44361d772e36eee9918a7c3` | `fix: stabilize asset library authorization denial` | H3 final narrow remediation |
| `0a748e828d0b1265fce801879e4d3f2136ae0702` | `docs: record stage 2 h3 final narrow remediation` | Final Candidate and H3 remediation report |

## 3. Fresh Acceptance summary

Fresh Acceptance independently exercised the complete Stage 2 range in new isolated environments. The accepted finding count is:

| Severity | Count |
| --- | ---: |
| Blocker | 0 |
| High | 0 |
| Medium | 0 |
| Low | 1 |

Accepted verification evidence from the authoritative Fresh Acceptance report:

| Gate | Accepted evidence |
| --- | --- |
| PostgreSQL 18.4 Fresh `0000→0018` | Passed |
| PostgreSQL Upgrade `0017→0018` | Passed |
| Fresh and Upgrade repeat/no-op | Passed |
| PostgreSQL compatibility matrix | 19/19 passed, including direct upgrade, locking, interruption/retry and Product Code contention/Audit cases |
| Stage 1 final-remediation matrix | 13/13 passed |
| Stage 2 Static Page harnesses | 7/7 and Round 2 6/6 passed |
| Vitest | 73/73 files; 280/280 tests passed |
| Production Build | Compiled, typechecked and generated 40/40 pages in an isolated controlled environment |
| Public Bundle boundary | Passed; 23 public page manifests and 32 manifest/chunk files checked |
| Production dependency audit | 0 known production dependency vulnerabilities |
| Playwright official run | 36/36 passed; 0 failed, 0 skipped and 0 retries |
| Additional pointer-drag harness | 1/1 passed; 0 retries after restoring its synthetic fixture precondition |
| Axe | Critical 0; Serious 0 across 50 analyses |
| Official browser/server errors | Console error/warning 0; page error 0; Hydration error 0; server 500 count 0 |
| Responsive/browser coverage | Desktop Chromium, Pixel 7, and 320/375/390/768/1024/1440 viewports |
| `git diff --check` | Passed at Fresh Acceptance entry and exit |

The isolated Acceptance environment used conspicuous Synthetic/Test, `example.test` and noindex fixtures only. It did not validate real providers, Production infrastructure or formal CWT data. Environment-only font-harness setup attempts described in the Fresh Acceptance report were not Candidate failures and are retained as Technical Debt below.

## 4. Frozen Stage 2 implementation boundary

1. **Fixed Home structure:** Home retains the fixed order Hero → Products → Applications → Fabric Library → Fabric & Sourcing → CWT Manufacturing & Service Strength → Inquiry CTA → Footer. Operators cannot add, delete or reorder fixed modules.
2. **Single Static Page authority:** Home and About share the governed Static Page configuration, Draft, Review, Apply, Live projection and renderer family. Invalid, absent, corrupt, mismatched or disabled live configuration fails closed instead of falling back to a second Bootstrap/Default public authority.
3. **Fact and owned-media evidence gate:** fact-sensitive modules require enabled configuration, current Verified/public-use Company Fact evidence and current eligible CWT-owned facility media. Revocation, expiry, deletion, partner status, rights/scan/readiness failure or relation closure removes the complete module from Preview/Public output and controlled delivery.
4. **Shared Block authority:** Product and Content reuse one versioned Block document, schema/parser, reducer/history, resolver/projection, save boundary and controlled renderer family. The approved allowlist excludes Raw HTML, JavaScript and arbitrary styling.
5. **Block Editor behavior:** insertion, editing, copy with new ID, deletion, ordering, locked sorting anchors, explicit unlock, Undo/Redo, bounded history, autosave, Save now, typed validation failure and conflict handling remain the accepted Stage 2 behavior.
6. **Single Revision behavior:** Product and Content Draft saves, including autosave, converge on the existing single pending Draft Revision for a Published entity. They do not create autosave-per-Revision history or authorize automatic Review, Apply, Publish or Index.
7. **Product/Content media:** ordered Product Hero/Gallery/Detail/Application and Content Cover/Inline/Gallery/Detail/Block placements reuse existing Asset identity and Intent/Batch/Finalize/Recovery/Cleanup. Placement Alt/Caption/visibility do not create a second Asset authority, and unlink does not delete shared Assets.
8. **Internal links:** fixed and dynamic public destinations resolve through the existing current Route table and stable Route IDs. Approved documents, public hrefs and `internal_link_relations` remain synchronized; missing, unsafe, chained, looped, Draft or ineligible destinations fail closed.
9. **Preview:** Home, About, Product and Content Preview remains authenticated, resource-authorized, noindex/nofollow/noarchive and private/no-store. Preview reuses public rendering semantics, uses the controlled Preview Asset route and never becomes a public eligibility, Route, Sitemap, Live or permanent media shortcut.
10. **Legacy writer exit:** Product `full_description` and Content `body` textareas and normal Server Action writers are retired. Normal edits write structured Blocks only; legacy columns remain read-only rollback evidence under the Stage 1 exit conditions and are not dual-written or dropped.
11. **Resource-level permissions and stable denial:** Product, Content and Static Page navigation, pages, queries, services, Preview and Preview Assets use the accepted resource policy. Asset Library role/candidate boundaries remain query-before-data; Analyst receives controlled denial, Sales retains accepted read-only Asset access, and no cross-resource Draft metadata is exposed.
12. **Stage 1 and public invariants:** navigation labels and existing URL namespaces remain stable; Publish and Index remain independent; Product eligibility, Canonical, Sitemap, noindex, audited HTTP 301, required Audit, public/private/import Asset isolation, Product Code, MOQ and Composition authorities do not regress.

This freeze does not claim Product Import/Excel/ZIP, AI Draft assistance, email-template administration, Stage 5 CRM/attribution expansion, deployment artifacts, provider integration, target-host validation, formal data or launch work from Stages 3–8 as implemented.

## 5. Accepted remaining Low

### F-L1 — stale assertive validation feedback after exact baseline recovery

- The shared Block Editor can enter `Save failed` after invalid input. If the operator restores the fields to the exact persisted baseline and chooses Save now, the state changes to `Saved`, but the prior assertive validation feedback remains visible and exposed through `role="alert"`.
- The result is contradictory user and accessibility feedback.
- It causes no data loss, unauthorized mutation, Revision corruption, Live, Publish, Index or public-output impact.
- Severity: **Low**.
- Acceptance disposition: **non-blocking and explicitly accepted by the Project Owner for the Stage 2 freeze**.
- Minimal later correction: clear obsolete feedback in the baseline-equality success path and add a failed-save → exact-baseline recovery regression test.

This acceptance/freeze task does not fix F-L1. Any later correction requires separate Owner authorization and must preserve the exact frozen Candidate as the approved baseline.

## 6. Technical Debt

1. **Non-Hermetic default font Build:** `next/font/google` means the default Production Build is not completely Hermetic. Fresh Acceptance blocked outbound provider traffic and passed the unmodified Candidate using an isolated controlled local font response harness. This proof does not make the repository Production Ready or complete Stage 6 Build reproducibility work.
2. **Exact-baseline recovery browser coverage:** the contradictory feedback path in F-L1 was independently reproduced manually. A future authorized minimal correction should add browser-level exact-baseline recovery coverage together with the Low fix.

## 7. Owner boundary and inherited Inquiry contract gap

The Owner's current authoritative first-release Inquiry contract is:

- Email is required;
- Country is required;
- at least one of Message or a successfully uploaded image is required;
- Company, WhatsApp and Phone are optional;
- Name has not been frozen as required.

The current Stage 2 Candidate inherits the unchanged Stage 1 runtime behavior:

- Name and Email are required;
- Country is optional.

Disposition: **Owner Confirmation Required**.

- This difference is not a Stage 2 Diff or a Stage 2 regression and did not block the scoped Stage 2 Fresh Acceptance.
- The inherited runtime behavior is not recorded, accepted or frozen as the Owner's Inquiry product contract by this document or Tag.
- The Owner direction above remains the authoritative product direction.
- The controlled later Stage in which the runtime contract will converge requires a separate Owner decision and authorization.
- This freeze task does not modify Inquiry code, tests, Schema, Migration, or existing Inquiry documentation.
- Runtime/product-contract convergence and independent validation must complete before Production.

The following Owner boundaries also remain open at their assigned later gates:

1. The exact Home H1 and final brand/marketing copy require Stage 8 SEO and Owner content acceptance.
2. Public display rules for MOQ and Product Code depend on the final Product page specification and are not frozen merely because database fields exist.
3. The complete CRM state-transition table remains Stage 5 work.
4. The suggested Stage 8 initial scale of 30–50 Products is advisory, not a hard acceptance threshold.

## 8. Migration freeze

- Historical Migration SQL, Snapshot and Journal identities remain exactly `0000–0018`.
- SQL files: **19**.
- Snapshot files: **19**.
- Journal entries: **19**; final entry is `idx 18`, tag `0018_phase1b_editorial_media_foundation`, timestamp `1785909346377`.
- `0019` or any later Migration: **absent**.
- Stage 2 Schema/Migration change: **No**.

| Frozen artifact | SHA-256 |
| --- | --- |
| `drizzle/0018_phase1b_editorial_media_foundation.sql` | `a7583d03b59d5858cb5e2cb2542dbc43bf6c620e2067ed900fe6d0d1d0257148` |
| `drizzle/meta/0018_snapshot.json` | `faa9a0819303e82d097874c348d6258533a305da30df00da360055b70dac3073` |
| `drizzle/meta/_journal.json` | `dfb08dad283762e80db4978c8381f88998cfde276ffb1f39c0f5de6f73e34867` |

Any future database change requires separately authorized forward-only Migration analysis and implementation. This freeze and Approved Tag do not authorize `0019`, do not permit changes to `0000–0018`, and do not provide Migration authority for Stage 3 or any later Stage.

## 9. External Validation and Formal Data remaining

The following remain incomplete and outside this Stage 2 acceptance:

### Stage 6 — deployment and operations artifacts

- Production/Staging environment validation and identity/secret/media/database isolation artifacts;
- Compose, reverse proxy, Health/readiness, trusted-proxy, log rotation, disk protection, resource budgets, backup/restore tooling and operational runbooks;
- approved malware Scanner and shared Rate Limiter providers and fail-closed configuration;
- final monitoring accounts, actual administrators, secret provisioning and reproducible Build/font treatment.

### Stage 7 — protected Staging and external validation

- Tencent Cloud 2 vCPU/4 GB/60 GB/Swap/pool/concurrency/disk-pressure validation;
- Cloudflare DNS, Access, Full (strict), canonical/redirect and origin-bypass/trusted visitor-IP validation;
- Production/Staging isolation on the approved topology;
- Zoho sender, Reply-To, recipient override, two-job delivery/retry and independent alert validation;
- Tencent COS private Singapore backup, CAM, encryption, checksums, retention and full empty-environment restore rehearsal;
- Hosted Sentry, Tencent monitoring, external Uptime and non-Zoho alert routing;
- selected cloud AI, Scanner, shared Rate Limiter and other authorized provider behavior;
- backup, Worker, Outbox, Health, disk and dead-work alert/runbook validation.

### Stage 8 — formal content and launch readiness

- real Product identity/specification evidence and Owner validation;
- verified Company Facts and CWT-owned-facility claims;
- licensed/authorized public media, source, rights, scan, crop, Alt and placement approval;
- final SEO titles/descriptions/Canonical/Index/internal links/structured data and exact Home/brand copy;
- final Owner desktop/mobile/accessibility acceptance.

No real Company Fact, formal SEO, authorized Production media, real provider, DNS, target-host deployment, restore rehearsal or formal Product/customer data is claimed complete. Production Ready remains **No**, and Formal Product Status remains **Waiting for Real Product Data Validation**.

## 10. Immutable freeze and authorization boundary

- **Stage 2 Accepted and Frozen** applies only to the recorded Stage 2 scope and exact Candidate Code Baseline `0a748e828d0b1265fce801879e4d3f2136ae0702`.
- The pure-document Freeze Commit and local Annotated Approved Tag create the immutable local acceptance point; they are not release or deployment artifacts.
- Stage 3 remains **Planned / Deferred — not authorized**.
- This freeze does not authorize Push, Tag publication, deployment, Production, DNS, Cloudflare, Zoho, COS, Sentry, AI, Scanner, Rate Limiter, external credentials, formal Product/Company/customer data or real-provider connections.
- Any later change to frozen Stage 2 behavior requires explicit Owner authorization and must follow governance, including ADR and forward-only Migration analysis when the change affects an approved architecture or database contract.
- F-L1 and the Inquiry contract convergence remain recorded, not implemented, by this task.
- Work stops after the pure-document Freeze Commit and local Annotated Approved Tag.

The next implementation action requires separate Project Owner authorization. This acceptance and Tag do not authorize Stage 3.
