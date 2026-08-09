# CWT Phase 1B acceptance matrix

Status: **Stage 4A Phase A accepted / PASS; Phase B entry prepared but not started; all other Stage and external-action gates remain separate**
Baseline: `phase-1a-postgres-stage2c-approved-2026-08-03` → `9e8437ca22ecfd114babda49e13c676bbc6a8899`
Matrix date: **2026-08-05**

## 1. Purpose and use

This matrix translates the approved Phase 1B frozen decisions into testable release gates. It does not mark Phase 1B as implemented or Production Ready. Each future Stage must attach reproducible evidence to the applicable rows and must stop when a required gate fails.

Current authorization is recorded in the [Stage 4A Owner Development Authorization](./PHASE_1B_STAGE4A_OWNER_DEVELOPMENT_AUTHORIZATION_V1_0.md). DeepSeek `PD-04` through `PD-07` are non-blocking reference evaluations under that decision; their unresolved evidence is not a Stage 4A development, testing, or later release prerequisite. Provider/API calls, credentials, Staging/Production deployment, Production AI, Deploy, Publish, Index, and formal import remain separately unauthorized.

The exact Integration HEAD `717cbac284350ec23f786ee239a354085ee0d827` passed the [Independent Phase A Completion Review](./PHASE_1B_STAGE4A_PHASE_A_INDEPENDENT_COMPLETION_REVIEW_V1_0.md) and is accepted by the Project Coordinator in the [Phase A Acceptance and Phase B Entry record](./PHASE_1B_STAGE4A_PHASE_A_ACCEPTANCE_AND_PHASE_B_ENTRY_V1_0.md). Phase A is **ACCEPTED / PASS**. Phase B is eligible to begin only through a separate task; the entry baseline does not start or implement it. The complete Stage 4A checkpoint still requires later Owner acceptance.

Execution-state labels in this matrix are separate from the Discovery gap-status labels:

- **Existing Baseline** — a Phase 1A automated check exists and must continue to pass.
- **Planned Automated** — implementation must add an automated check.
- **Planned Manual** — deterministic UI or operational verification is required.
- **External Validation** — evidence must come from the authorized target/provider environment.
- **Formal Data Acceptance** — the project owner must approve real facts or licensed media.
- **Deferred by Owner** — explicitly outside the current Stage and not required for that Stage's exit; future work needs its own approval.

When a row says one state “plus” another, both named evidence gates are mandatory; the combination is not a weaker intermediate status.

No row may pass using Production data in local or CI environments. Synthetic fixtures remain conspicuously synthetic and noindex.

## 2. Required test environments

| Environment | Permitted data and services | Required isolation | Primary use |
| --- | --- | --- | --- |
| Unit test | In-memory values and synthetic fixtures; provider fakes | No network and no real credentials | Validators, reducers, renderers, template and policy logic |
| Integration test | Synthetic fixtures and local adapters | No external provider; isolated filesystem and database | Domain Services, authorization, Audit, Upload/Finalize, Outbox, Worker |
| PostgreSQL validation | Dedicated disposable PostgreSQL database | Unique database/user; never Production or Staging | Migrations, constraints, transactions, concurrency and query plans |
| Browser acceptance | Local Production build or protected Staging | Synthetic until formal-data Stage; noindex on Staging | Desktop/mobile flows, accessibility, SEO output and admin UX |
| Target-host rehearsal | Tencent topology-equivalent non-Production environment | Separate secrets, DB/user, media roots and forced email override | Capacity, isolation, backup/restore, proxy and operations |
| Production readiness | Authorized Production topology only | Formal credentials and data require separate authorization | Final provider, security, recovery and formal-data approval |

## 3. Unit-test gate

| ID | Capability and test | Pass criteria | State | Stage |
| --- | --- | --- | --- | --- |
| U-01 | Existing Product real-eligibility predicate | Draft, missing real evidence, missing Primary Category, missing image, unpublished, and Index combinations remain fail-closed; every derived public surface reuses the same predicate. | Existing Baseline | Every Stage |
| U-02 | Existing Publish/Index independence | Publish never enables Index; Index requires explicit authorized action and complete eligibility. | Existing Baseline | Every Stage |
| U-03 | Product Code validator and generator | Approved category prefix and three-digit sequence produce canonical `CWT-[TYPE]-NNN`; existing external codes remain unchanged, and year/color/GSM/Width/Chinese/spaces or invalid prefixes are rejected. | Planned Automated | 1 |
| U-04 | Product Code immutability | Established code cannot be silently regenerated after category change; only the approved correction command can change it and requires a reason. | Planned Automated | 1 |
| U-05 | Composition canonical validator | Approved examples normalize predictably; unknown composition stays empty; percentage/name errors are rejected without AI inference. | Planned Automated | 1 |
| U-06 | GSM, Width, and MOQ | GSM is numeric g/m², Width is numeric cm, MOQ value and controlled unit are separate, and empty facts render no empty module. | Planned Automated | 1 |
| U-07 | Product naming rules | English name rules reject disallowed empty or misleading values without fabricating a specification. | Planned Automated | 1 |
| U-08 | Block document schema | Every approved Block type validates; unknown type/version, Raw HTML, JavaScript, event handlers, and arbitrary style payloads fail closed. | Planned Automated | 1 |
| U-09 | Block renderer | Heading, Paragraph, Image, Gallery, Specification Table, Comparison Table, Feature List, Bullet List, Callout, Quote, FAQ, Related Products, Related Articles, CTA, and Divider render through controlled components only. | Planned Automated | 1 |
| U-10 | Legacy Block compatibility | Each approved legacy body deterministically becomes a Paragraph document with semantic and SEO-equivalent text; conversion is idempotent. | Planned Automated | 1 |
| U-11 | Block ordering, undo, redo, and lock reducer | Move, insert, delete, accept, reject, undo, redo, and Block lock yield deterministic states with no mutation of locked Blocks. | Planned Automated | 2 |
| U-12 | Autosave conflict token | A stale editor version is rejected with a typed conflict and never overwrites a newer Draft. | Planned Automated | 2 |
| U-13 | Page media settings schema | Desktop/mobile image, focal point, overlay, Alt Text, visibility, fixed module keys, and allowed ranges validate; arbitrary layout keys fail. | Planned Automated | 1 |
| U-14 | Company Fact presentation | Only verified facts can enter factual strength output; partner-factory claims and unknown facts cannot be inferred or rendered. | Planned Automated | 2 |
| U-15 | Excel header and cell parser | Template version, required/optional columns, typed numbers, controlled units, rows, and safe formula handling are deterministic and bounded. | Planned Automated | 3 |
| U-16 | Product import row validator | One bad row reports a precise row/column reason without invalidating unrelated valid rows. | Planned Automated | 3 |
| U-17 | Duplicate Product detector | Product Code and approved match rule classify create, duplicate, and update-intent without creating records. | Planned Automated | 3 |
| U-18 | Image filename matcher | Exact Product Code and approved role suffix map deterministically; ambiguity, unsupported role, or duplicate Primary is an error. | Planned Automated | 3 |
| U-19 | Archive safety | Traversal paths, links, hidden executable content, unsupported signatures, file-count bombs, expanded-size bombs, and duplicate entries are rejected. | Planned Automated | 3 |
| U-20 | AI factual-field denylist | AI patches touching Product Code, category, composition, GSM, Width, MOQ, Company Facts, Publish, Index, routes, rights, or private Inquiry data are rejected. | Planned Automated | 4 |
| U-21 | AI output schema, Draft state, and Diff | Invalid Provider output cannot alter Draft; valid output becomes `draft_ready` only and is presented as a Block-level Diff with individual accept/reject/edit before the existing Draft/review workflow. | Planned Automated | 4 |
| U-22 | AI provenance and human quality evidence | Task, operator, Provider, requested/returned Model, Prompt version/hash, generation time, tokens/cost, Provider status, output association, disposition, optional bounded rating/labels/comment, failure, and retry classification are normalized without Secrets. | Planned Automated | 4 |
| U-23 | AI configuration, Prompt, roles, and scope | One enabled default and reviewed immutable Prompt version per text use case; Admin can manage configuration/Prompt selection/logs; Editors cannot; fallback remains null; knowledge-base/chunk/embedding/vector/retrieval/vision/Customer-Service paths are absent. | Planned Automated | 4 |
| U-24 | Email template schema | Approved variables render and escape correctly; unknown variables, private Asset URLs, attachments, scripts, and unsafe markup fail. | Planned Automated | 5 |
| U-25 | Email recipient policy | Production and Staging policies resolve From, Reply-To, To/CC/BCC independently; Staging always replaces every recipient with `test@cwtextile.com`. | Planned Automated | 5 |
| U-26 | Two email job identities | Internal notification and customer confirmation have stable, distinct idempotency keys derived from one Inquiry. | Planned Automated | 5 |
| U-27 | Attribution policy | First Touch is immutable, Last Non-Direct follows the approved direct rule, Submit Touch snapshots submit context, and PII never enters analytics payloads. | Planned Automated | 5 |
| U-28 | Trusted visitor IP policy | Forwarded visitor headers are ignored unless the direct peer is in the configured trusted-proxy boundary; malformed chains fail closed. | Planned Automated | 6 |
| U-29 | Environment policy | Staging is noindex, formal analytics is disabled, recipients are overridden, databases/media/secrets cannot equal Production, and required Production providers fail closed. | Planned Automated | 6 |
| U-30 | Backup-set policy | Required inclusions, derivable exclusions, retention, checksum manifest, completion marker, and restore metadata validate before a backup is marked complete. | Planned Automated | 6 |

### Stage 3 Template V1 OOXML resource evidence

`U-15` includes one event-time budget shared by every XML/RELS part consumed by the Template V1 workbook authority: depth 32 with root at 1; 20,000 total start-elements; 32 attributes per element; 20,000 total attributes; 4,096 decoded UTF-8 bytes in one attribute value; 32 KiB in one logical text run accumulated across parser callbacks; 8 MiB total decoded text; and 16 MiB total actual decompressed XML/RELS source bytes. Namespace declarations count as lexical attributes, while semantic matching uses namespace URI plus local name.

For each limit, automated evidence must cover below, exactly-at, and above. Below and exactly-at inputs remain eligible for semantic validation; above-limit inputs fail closed before row apply with typed `invalid_workbook_package` and no parser-internal error disclosure.

## 4. Domain and integration-test gate

| ID | Capability and scenario | Pass criteria | State | Stage |
| --- | --- | --- | --- | --- |
| I-01 | Service authorization and required Audit | UI/Server Action cannot write business tables directly; unauthorized mutation fails; required Audit failure rolls back the business transaction. | Existing Baseline | Every Stage |
| I-02 | Product taxonomy command | Exactly one Primary Category is enforced; Additional Categories do not replace it; Applications and Tags retain separate authorities. | Existing Baseline plus extension | 1 |
| I-03 | Category/Application quick create | Only authorized roles can create; normalized duplicate/collision is rejected; the new record is selectable without bypassing validation or Audit. | Planned Automated | 1 |
| I-04 | Product Draft minimum | Name, one Primary Category, and one eligible image are sufficient for a Draft; missing factual fields stay empty and Draft/noindex. | Planned Automated | 1 |
| I-05 | Product code concurrency | Concurrent creates under one approved prefix never produce duplicate Product Codes; failure rolls back the Product and Audit atomically. | Planned Automated | 1 |
| I-06 | Product media direct upload | Existing Intent/Batch/Finalize/manifest path is used; bytes, signature, decode, scan, rights, and role eligibility are rechecked. | Existing Baseline plus extension | 1 |
| I-07 | Product media library selection | Selecting an Asset creates only a relation; Public/Private/Import boundaries, rights, deletion, processing, and live relationship rules still apply. | Planned Automated | 1 |
| I-08 | Product media roles and ordering | One Primary, ordered Gallery, Detail, and Application placements persist; placement Alt/Caption/visibility are revisioned; invalid duplication fails. | Planned Automated | 1 |
| I-09 | Static page settings | Draft/Review/Publish applies one approved settings Revision for Home/About; unauthorized direct setting changes fail and required Audit is atomic. | Planned Automated | 1 |
| I-10 | Static page media delivery | Desktop/mobile placements use controlled media routes and eligibility checks; removing rights or the live relation revokes public delivery. | Planned Automated | 1 |
| I-11 | Structured Product/Content save | Typed Blocks save through Domain Services, create/apply existing Revisions, and preserve routes/SEO and immutable approved revisions. | Planned Automated | 1 |
| I-12 | Revision concurrency | Two editors cannot silently overwrite each other; public reads stay on the approved revision while Draft changes. | Existing Baseline plus extension | 1 |
| I-13 | Block relation integrity | Related Product/Article and Asset references are record-validated and do not expose Draft, ineligible, deleted, Private, or Import content publicly. | Planned Automated | 1 |
| I-14 | Autosave and explicit review | Autosave updates Draft only; Review/Publish remain explicit authorized actions; browser retry does not duplicate Revisions. | Planned Automated | 2 |
| I-15 | Preview | Authorized users can preview Draft Blocks and desktop/mobile page media; preview routes are noindex and cannot become a public eligibility shortcut. | Planned Automated | 2 |
| I-16 | Product import batch creation | One durable import batch owns template/version/digest/state; supplied images enter the existing Import upload context, not a second file pipeline. | Planned Automated | 3 |
| I-17 | Excel partial success | In one batch, valid rows create Drafts and invalid rows remain rejected with row errors; no valid row is rolled back by an unrelated invalid row. | Planned Automated | 3 |
| I-18 | Duplicate import retry | Retrying the same package and item identity does not duplicate Product, Product Code, Asset, upload finalize, or Product-Asset relation. | Planned Automated | 3 |
| I-19 | Create and bulk update separation | A create-only batch cannot update an existing Product; an update batch requires explicit authorized match/review policy and remains a separate command. | Planned Automated | 3 |
| I-20 | Image match and Finalize | Only unambiguous files attach to the matching Product Code and approved role; each file completes existing scan/finalize before eligibility. | Planned Automated | 3 |
| I-21 | Import crash recovery | A crash after byte upload, Product create, or relation create resumes from durable state; existing recovery/cleanup converges orphaned objects without duplicates. | Planned Automated | 3 |
| I-22 | Import row correction | An operator can correct/retry only rejected items; successful items are immutable batch evidence and are not replayed. | Planned Automated | 3 |
| I-23 | AI enqueue, lifecycle, configuration, and claim | Only authorized resource-scoped Editor/Admin actions enqueue one durable run; configuration resolves by use case; Worker claim is atomic; only pending/processing/draft-ready/failed/cancelled statuses are valid; bounded concurrency and idempotent retry prevent duplicate Draft changes. | Planned Automated | 4 |
| I-24 | AI Provider failure and cancellation | Timeout, malformed output, quota, safety rejection, unavailable Provider, and cancellation retain the original Draft; typed error/retry/Provider response evidence is durable; a late cancelled response cannot become Draft-ready or change Publish/Index. | Planned Automated | 4 |
| I-25 | AI retry | Retry advances the same approved run without duplicate accepted Blocks or factual changes; exhaustion is failed plus separate retry state; no fallback Provider/model is invoked; token/cost/generation-time/provenance are retained. | Planned Automated | 4 |
| I-26 | AI Block accept/reject/undo/lock/review | Each action requires authorization, affects Draft only, records provenance/Audit and human evaluation, respects locks, and never mutates an approved revision; Editor submits review but cannot Publish. | Planned Automated | 4 |
| I-27 | AI disabled degradation | Missing/disabled provider hides or disables AI actions with a clear safe message; manual editing, Publish, and public reads remain healthy. | Planned Automated | 4 |
| I-28 | AI explicit-context and private-data isolation | Only deliberately selected approved company content, authorized allowlisted Product/Fabric data, or bounded operator input is serialized; Inquiry/customer/CRM/PII, sensitive or unauthorized internal data, unreviewed files, Secrets, arbitrary documents/URLs, and automatic retrieval remain unavailable. | Planned Automated | 4 |
| I-29 | Inquiry authority | Anonymous retry remains idempotent, never overwrites Contact master data, and creates the two intended Outbox jobs transactionally with the Inquiry. | Existing Baseline plus extension | 5 |
| I-30 | Internal notification job | One job sends the approved internal template from `sales@cwtextile.com` with `info@cwtextile.com` Reply-To and no private-file attachment. | Planned Automated | 5 |
| I-31 | Customer confirmation job | A distinct job sends the approved confirmation once; failure/retry is independent of internal notification and Inquiry success is not reversed. | Planned Automated | 5 |
| I-32 | Email template lifecycle | Draft, Active, version history, preview/test send, rollback, authorization, and Audit reuse the existing Revision authority; only Active is used by Worker. | Planned Automated | 5 |
| I-33 | Staging recipient override | To, CC, and BCC are all replaced server-side with `test@cwtextile.com` after template/job resolution and before provider call; original recipients are absent from provider payload. | Planned Automated | 5 |
| I-34 | Outbox worker behavior | Claim, lease, retry/backoff, terminal dead state, job-kind dispatch, idempotency, and redacted logs are safe under concurrent workers and restarts. | Planned Automated | 5 |
| I-35 | Attribution persistence | Landing Page, Referrer, UTM, First Touch, Last Non-Direct, Submit Touch, Country, and source Product/Application/Article persist in CRM authority without trusting client identity. | Planned Automated | 5 |
| I-36 | CRM outcomes | Qualified, Quoted, Sample, Won, Lost, Spam, Lost Reason, and First Response transitions are authorized, audited, and queryable without analytics PII leakage. | Existing Baseline plus extension | 5 |
| I-37 | Public analytics boundary | Analytics events contain no Inquiry/Contact/Organization identifier, private Asset identifier, email, phone, message, or untrusted forwarding-header authority. | Existing Baseline plus extension | 5 |
| I-38 | Provider isolation | Test/Development adapters cannot call SMTP, AI, COS, Sentry, or formal analytics; Production-required providers fail closed rather than silently using local fakes. | Planned Automated | 6 |
| I-39 | Production/Staging configuration isolation | Startup fails if DB URL, DB user, media root, secrets, Admin identity, email credentials, or analytics configuration is shared across declared environments. | Planned Automated | 6 |
| I-40 | Health and readiness | Health distinguishes process liveness from DB/storage/Worker readiness without exposing secrets or customer data; failing dependencies create actionable status. | Planned Automated | 6 |

## 5. Real PostgreSQL and Migration gate

| ID | Scenario | Pass criteria | State | Stage |
| --- | --- | --- | --- | --- |
| P-01 | Frozen-history integrity | Migrations, snapshots, and journal entries `0000`–`0017` exactly match the approved Tag. | Existing Baseline | Every Stage |
| P-02 | Fresh database | A new empty PostgreSQL database applies `0000` through the latest forward Migration with no manual edits. | Planned Automated | Each schema Stage |
| P-03 | Upgrade database | A representative Phase 1A PostgreSQL backup upgrades forward with records, relationships, routes, revisions, Assets, Inquiries, and Audit preserved. | Planned Automated | Each schema Stage |
| P-04 | Repeat/no-op behavior | The documented deploy procedure cannot accidentally reapply a completed Migration; a second schema check is clean. | Planned Automated | Each schema Stage |
| P-05 | Migration interruption | Forced interruption at each safe rehearsal point has a documented retry or restore path and produces no falsely successful release marker. | External Validation | 7 |
| P-06 | Enum compatibility | New Asset role and environment/status values do not invalidate historical records or unsupported old application readers. | Planned Automated | 1 and 6 |
| P-07 | New constraints | Product Code prefix, MOQ unit, Block version, relation metadata, and proposed tables enforce intended nullability, uniqueness, foreign keys, Checks, and deletion behavior. | Planned Automated | 1–5 |
| P-08 | Product code contention | High-contention generation produces no duplicate code, deadlock leak, missing Audit, or partial Product. | Planned Automated | 1 |
| P-09 | Revision and route transaction | Revision apply and published route change remain atomic with required Audit and HTTP 301; collisions, loops, chains, and missing destinations are rejected. | Existing Baseline plus extension | 1–2 |
| P-10 | Import idempotency under contention | Concurrent retry of the same batch/item/digest produces one durable result and one intended Product/Asset relation. | Planned Automated | 3 |
| P-11 | AI worker claim contention | Concurrent workers cannot process the same active run lease; expired leases recover without duplicate accepted output. | Planned Automated | 4 |
| P-12 | Outbox claim contention | Independent internal/customer jobs each send at most once per provider idempotency contract and remain separately recoverable. | Existing Baseline plus extension | 5 |
| P-13 | Query plans and indexes | Admin import/AI/Outbox lists, CRM attribution reports, public eligible Product reads, sitemap, and media eligibility avoid unbounded scans at approved data volumes. | External Validation | 7 |
| P-14 | Connection pool budget | Web plus Worker plus on-demand Staging remain below configured PostgreSQL connections with headroom for backup/migration/operations. | External Validation | 7 |
| P-15 | Pre-Migration backup | A checksum-verified extra backup completes before every major deployment/Migration and a failed backup blocks the change. | External Validation | 7 |

## 6. Security, permissions, privacy, and private-file gate

| ID | Scenario | Pass criteria | State | Stage |
| --- | --- | --- | --- | --- |
| S-01 | Admin editorial access | Admin can perform approved editorial operations; every mutation is authorized and audited. | Existing Baseline plus extension | 1–5 |
| S-02 | Sales record scope | Sales can access only assigned Inquiry/Contact records and related private files; unrelated records remain denied across UI, action, service, and media route. | Existing Baseline | Every Stage |
| S-03 | Editorial role isolation | Content/Product editors cannot access Inquiry files, SMTP/AI secrets, environment controls, backups, or administrator settings outside their permission. | Planned Automated | 1–6 |
| S-04 | Public Asset boundary | Public delivery rechecks storage context, scan, processing, deletion, rights, approved relationship, live revision, and Product eligibility; raw keys and permanent bucket/volume URLs never appear. | Existing Baseline plus extension | 1–3 |
| S-05 | Private Inquiry file boundary | Private files use record-scoped authorization, are never promoted to Asset Library by import/editor flows, and never enter email attachments or AI knowledge. | Existing Baseline plus extension | 3–5 |
| S-06 | Import storage boundary | Import bytes remain non-public until scan/finalize and an authorized relation; abandoned files converge through existing recovery/cleanup. | Planned Automated | 3 |
| S-07 | Upload streamed-byte enforcement | Declared length cannot bypass actual streamed-byte limit; signature/decode/scan and archive expanded limits apply before release. | Existing Baseline plus extension | 1 and 3 |
| S-08 | CSRF/session/cookie boundary | New admin actions follow existing origin/session/CSRF policy; no credential, Token, Cookie, app password, or private URL enters logs or browser URLs. | Existing Baseline plus extension | 1–6 |
| S-09 | AI request redaction | Provider payload and logs contain only explicitly selected Draft-safe public/editorial material and no credentials, customer PII, private files, or unpublished factual inference. | Planned Automated | 4 |
| S-10 | Email log redaction | Logs expose job IDs and typed outcomes, not message body, address lists, app password, Token, Cookie, or private file details. | Planned Automated | 5 |
| S-11 | Trusted proxy spoofing | Direct non-Cloudflare requests cannot forge visitor IP using forwarding headers; trusted-hop configuration is explicit and testable. | Planned Automated plus External | 6–7 |
| S-12 | Staging access | Staging is protected by Cloudflare Access or approved equivalent; bypassing Cloudflare cannot reach application HTTP ports. | External Validation | 7 |
| S-13 | Network exposure | PostgreSQL is not public; SSH is limited to approved trusted access; origin 80/443 accept only Cloudflare source networks or equivalent authenticated tunnel. | External Validation | 7 |

## 7. Browser, responsive, accessibility, and editorial UX gate

| ID | Page or workflow | Pass criteria | State | Stage |
| --- | --- | --- | --- | --- |
| B-01 | Public navigation | Desktop and mobile show Home, Products, Fabric & Sourcing, About, and Get a Quote; label changes do not change `/resources/` or its three channel URLs. | Planned Manual plus Automated | 2 |
| B-02 | Home fixed modules | Approved modules, order, visibility, desktop/mobile media, focal point, overlay, Alt Text, CTA, and factual strength module render responsively without arbitrary page building. | Planned Manual plus Automated | 2 |
| B-03 | About CWT | Approved fixed structure and media controls render; only verified CWT-owned factory facts/media appear and no partner factory is represented as owned. | Planned Manual plus Formal Data | 2 and 8 |
| B-04 | Product editor | Searchable Primary/Additional Category, Applications, Tags, quick create, structured facts, Product Code, media roles/order/Alt/Caption, and desktop/mobile Preview are keyboard operable. | Planned Manual plus Automated | 1–2 |
| B-05 | Product public detail | Empty facts render no heading/table/placeholder; media roles and Blocks render responsively; Draft/ineligible Product is not public/indexable. | Planned Manual plus Automated | 1–2 |
| B-06 | Block editor full set | All approved Blocks can insert, edit, reorder, delete, undo/redo, autosave, link internally, preview, and reject unsafe content without data loss. | Planned Manual plus Automated | 2 |
| B-07 | Excel/image import | Template upload, preview, per-row errors, partial success, duplicate classification, image matching, retry, and summary are clear and do not imply rejected rows succeeded. | Planned Manual plus Automated | 3 |
| B-08 | AI assistance | Generate, Diff, Block accept/reject/lock/undo, failure, retry, model/cost visibility, and disabled state are understandable; no Publish/Index control is delegated to AI. | Planned Manual plus Automated | 4 |
| B-09 | Email template admin | Draft, Preview, test send, Active, history, rollback, and recipient override indication are clear and permission-checked. | Planned Manual plus Automated | 5 |
| B-10 | CRM attribution | Authorized staff can view source and funnel facts without exposing private data to unrelated roles or public analytics. | Planned Manual plus Automated | 5 |
| B-11 | Mobile widths | Public and admin critical flows pass at 320, 375, 390, 768, and representative desktop widths with no blocked navigation, CTA, form, table, modal, media crop, or horizontal-loss defect. | Planned Manual | 2–5 |
| B-12 | Keyboard and focus | Every interactive control is reachable in logical order, has visible focus, supports expected keyboard behavior, and does not trap focus. | Planned Manual plus Automated | 1–5 |
| B-13 | Semantics and names | Headings, landmarks, labels, errors, table headers, button/link accessible names, dialogs, status messages, and form associations pass automated and manual inspection. | Planned Manual plus Automated | 1–5 |
| B-14 | Images and contrast | Meaningful images have approved Alt Text, decorative images are correctly silent, text/controls/focus meet WCAG 2.2 AA contrast, and zoom/reflow remains usable. | Planned Manual plus Automated | 2 and 8 |
| B-15 | Motion and errors | Reduced-motion preference is honored; validation and asynchronous failures are announced and recoverable without color-only meaning. | Planned Manual | 1–5 |

## 8. SEO, URL, Canonical, Sitemap, and noindex gate

| ID | Scenario | Pass criteria | State | Stage |
| --- | --- | --- | --- | --- |
| E-01 | Existing public URLs | `/`, `/products/`, `/resources/`, all three approved content-channel namespaces, `/about/`, and Inquiry URL remain stable unless an approved route change creates an audited 301 transactionally. | Existing Baseline plus extension | 2 |
| E-02 | Navigation rename | “Resources” becomes “Fabric & Sourcing” in display only; Canonical, route records, inbound links, and sitemap URLs do not change because of the label. | Planned Automated | 2 |
| E-03 | Canonical host and path | Exactly one canonical host/path is emitted; HTTP/HTTPS and `www` direction follow owner-approved Cloudflare policy with no redirect chain. | External Validation | 7 |
| E-04 | Product eligibility | Sitemap, internal derived surfaces, metadata, and Index control use the authoritative real-Product predicate, never a bare published-status check. | Existing Baseline plus extension | Every Stage |
| E-05 | Empty/unknown content | Unknown facts do not emit empty headings, schema properties, tables, placeholders, or fabricated copy. | Planned Automated | 1–2 |
| E-06 | Draft/Preview/Staging noindex | Draft preview and every Staging response are noindex; Staging robots disallows crawling and sitemap cannot leak formal Production routes/data. | Planned Automated plus External | 2, 6, 7 |
| E-07 | Low-value surfaces | Search, ordinary filters, and low-value Fabric Library entries remain noindex by default. | Existing Baseline | Every Stage |
| E-08 | Block SEO rendering | Structured Blocks preserve semantic headings, link safety, readable server HTML, metadata source, and legacy content parity without hydration-only primary text. | Planned Automated | 1–2 |
| E-09 | Sitemap and robots | Published/index-eligible URLs appear once; Draft, ineligible, redirected, search/filter, and Staging URLs do not; last-modified source is authoritative. | Planned Automated plus External | 2 and 7 |
| E-10 | 301 graph | Collision, missing destination, loop, and chain are rejected; published route change and redirect remain one audited transaction. | Existing Baseline | Every Stage |
| E-11 | Public media contracts | HTML contains only application-controlled media URLs; local object paths/keys, COS backup URLs, private identifiers, and permanent provider URLs never appear. | Existing Baseline plus extension | 1–7 |
| E-12 | Structured data and facts | Any structured data uses only verified Product/Company facts and approved public revision; no AI Draft or partner-factory ownership inference is emitted. | Planned Automated plus Formal Data | 2 and 8 |

## 9. Deployment, capacity, disk, monitoring, and recovery gate

| ID | Scenario | Pass criteria | State | Stage |
| --- | --- | --- | --- | --- |
| O-01 | Compose topology | Web, Worker, PostgreSQL, and reverse proxy start in the approved topology with pinned images, health checks, restart policy, least privilege, and separate persistent roots. | External Validation | 7 |
| O-02 | Production/Staging logical isolation | One PostgreSQL instance has two databases and users with no cross-grants; media, secrets, Admins, email, analytics, and runtime networks are isolated; Staging is normally stopped. | External Validation | 7 |
| O-03 | 2 vCPU/4 GB steady load | Production Web/Worker/PostgreSQL/proxy plus normal OS use stays within approved CPU/memory targets with no OOM, swap thrash, unbounded queue, or unacceptable latency. | External Validation | 7 |
| O-04 | 2 GB Swap | Swap exists with approved ownership/system settings; induced memory pressure degrades predictably and alerts before sustained thrashing/OOM. | External Validation | 7 |
| O-05 | On-demand Staging load | Starting Staging under the approved low-concurrency rehearsal remains within headroom or is operationally blocked during conflicting heavy Production work. | External Validation | 7 |
| O-06 | Database pool | Combined Web/Worker/Staging pools, migrations, and backup connections stay within PostgreSQL limit with documented reserve and no connection storm on restart. | External Validation | 7 |
| O-07 | Image concurrency | Concurrent image decode/derivative/finalize is bounded for 2 cores and memory; queue backpressure prevents process or host exhaustion. | External Validation | 7 |
| O-08 | AI concurrency | AI jobs are bounded independently from email/import work; timeout/cancel/retry does not hold DB connections or saturate Worker. | External Validation | 7 |
| O-09 | Disk budget | Measured OS, Docker images/layers, PostgreSQL, originals, private files, logs, local backups, and working headroom fit the approved 60 GB allocation. | External Validation | 7 |
| O-10 | 70% disk warning | Crossing 70% sends an independent alert with actionable category usage; growth can be attributed to DB, media, Docker, logs, backup, or temporary data. | External Validation | 7 |
| O-11 | Disk full protection | At the approved critical threshold, new imports/uploads/AI image work and unsafe deployment are blocked cleanly; Inquiry/database integrity and existing reads are preserved; no false success is reported. | External Validation | 7 |
| O-12 | Docker/log retention | JSON/file logs rotate and retain 14 days within 2–4 GB; secrets/PII are redacted; a noisy process cannot consume the disk. | External Validation | 7 |
| O-13 | Host resource alerts | CPU, memory, swap, disk, process restart, database health, and bandwidth alarms reach an approved independent channel. | External Validation | 7 |
| O-14 | Application work alerts | Outbox failures/backlog, Worker dead jobs, backup failure, public health, and Sentry errors are detectable with thresholds/runbooks; alerts do not rely only on Zoho SMTP. | External Validation | 7 |
| O-15 | Cloudflare proxy and TLS | `cwtextile.com`, `www`, and protected Staging are proxied; Full (strict) validates origin; Zoho records remain DNS Only; origin bypass is denied. | External Validation | 7 |
| O-16 | Trusted real visitor IP | Application derives visitor IP only through the approved Cloudflare/trusted-proxy boundary; direct spoof attempts fail and logs/limits use the same authority. | External Validation | 7 |
| O-17 | CDN/media initial policy | Application-controlled media responses follow the approved initial non-controlled-cache policy; correctness never depends on Cloudflare cache purge. | External Validation | 7 |
| O-18 | Future media relocation | A rehearsal relocates media/database roots to added data storage without changing public URLs or business relationships; rollback restores the prior mount cleanly. | External Validation | 7 |
| O-19 | Daily PostgreSQL backup | Scheduled `pg_dump` produces checksum, completion state, logs, independent failure alert, and exactly seven valid local retention slots. | External Validation | 7 |
| O-20 | Weekly COS backup | Database, originals, private Inquiry attachments, and deployment config are encrypted/uploaded with checksum and four-week retention; derivable variants/temp files are excluded. | External Validation | 7 |
| O-21 | Pre-deploy backup | Major deployment/Migration cannot start until its extra backup is complete and checksum-verified. | External Validation | 7 |
| O-22 | Corrupt/incomplete backup | Missing object, checksum mismatch, truncated dump, or absent completion marker is rejected and alerts; retention never deletes the last known valid recovery set. | External Validation | 7 |
| O-23 | Complete empty-environment restore | A clean isolated environment restores DB, public originals, private Inquiry files, config, permissions, revisions/routes, and media eligibility; derived files are rebuilt as needed. | External Validation | 7 |
| O-24 | Restored-environment safety | Restored environment is forced to Staging noindex, disabled formal analytics, protected access, and recipient override before any Web/Worker start. | External Validation | 7 |
| O-25 | Recovery objectives and runbook | Owner-approved recovery objectives are met; restore steps, validation evidence, failures, timing, and rollback are recorded before Production launch. | External Validation | 7 |

## 10. External-provider and formal-data gate

| ID | External acceptance | Pass criteria | State | Stage |
| --- | --- | --- | --- | --- |
| X-01 | Zoho DNS and sender | SPF/DKIM/DMARC and required Zoho records remain DNS Only; approved From/Reply-To authenticate with separate Production/Staging app passwords. | External Validation | 7 |
| X-02 | Zoho delivery and retry | Internal/customer templates deliver with expected headers; provider outage, timeout, duplicate response, and rejection map to safe Outbox retry/dead behavior. | External Validation | 7 |
| X-03 | Cloud AI protected Staging | After separate Provider-call and Staging authorization, isolated Synthetic-only Staging proves the configured cloud model/API, schema, timeout, quota, token/cost, roles, redacted logs/provenance, canonical lifecycle/cancellation, and Draft→review→Publish behavior; the accepted supplier-evidence risk remains documented as non-blocking, and no Production data/access or automatic Index exists. | External Validation | 7 |
| X-04 | Future AI image provenance | Reserved for a separately approved P1-02B: any future output must retain Provider/model/template/source Asset provenance and rights review before public relation or Revision approval. | Deferred by Owner | Future P1-02B |
| X-05 | Malware scanner | Actual malicious/test signatures are quarantined, unavailable scanner fails closed, clean media releases only after result persistence, and resource use fits target host. | External Validation | 7 |
| X-06 | Shared rate limiter | Multiple Web/Worker instances share authority; provider outage follows approved fail-closed behavior and cannot be bypassed with spoofed forwarding headers. | External Validation | 7 |
| X-07 | Sentry and monitoring privacy | Events arrive with release/environment context, source maps policy, redaction, sampling, and no PII/private Asset/secret leakage. | External Validation | 7 |
| X-08 | Formal Product data | Each public Product is backed by a real sample/internal code/supply or explicit specification combination; owner validates name, category, code, composition, GSM, Width, MOQ, Applications, copy, and eligibility. | Formal Data Acceptance | 8 |
| X-09 | Formal Company Facts | Legal/factory/service claims and ownership are verified; unknown history, capacity, certification, equipment, employees, customers, contacts, and partner ownership remain absent. | Formal Data Acceptance | 8 |
| X-10 | Authorized public media | Rights, source, scan, original, crop, Alt Text, placement role, desktop/mobile use, and public relationship are approved for every live image. | Formal Data Acceptance | 8 |
| X-11 | SEO editorial acceptance | Final titles/descriptions/canonical/index settings/internal links/structured data reflect verified facts and one primary intent per indexable page. | Formal Data Acceptance | 8 |
| X-12 | Final device/accessibility acceptance | Project owner reviews representative desktop/mobile public and admin flows; unresolved severity-1/2 accessibility or blocking responsive defects prevent launch. | Formal Data Acceptance | 8 |

Until X-08 through X-10 pass, the correct status is **Waiting for Real Product Data Validation**; synthetic records must never be described as formal Product data.

## 11. Stage exit gates

| Stage | Mandatory exit evidence |
| --- | --- |
| 0 — decisions and ADRs | Owner decisions recorded; required ADRs approved; scope, compatibility, Migration/SEO/rollback impacts explicit. |
| 1 — editorial/product/media foundation | U/I/P/S/E rows for Product facts, Product Code, static-page settings, media relations, Blocks, Revision, authorization, Audit, routes, and public eligibility pass. |
| 2 — Home/About and editor UX | Public/admin desktop/mobile, Block Editor compatibility, autosave/conflict, Preview, accessibility, Home/About and navigation rows pass. |
| 3 — Product import | Excel partial success, duplicate/retry, image matching, Upload/Finalize, recovery, archive safety, permission and PostgreSQL contention rows pass. |
| 4 — text AI Draft assistance | Provider-agnostic dependency, application-neutral use-case registration, Admin/Editor/Reviewer permission matrix, configuration, immutable Prompt selection, Provider-disabled, factual-denylist, explicit-context/no-RAG, canonical lifecycle/cancellation, Draft-ready→review→Publish, no automatic Production SEO/Index, quality evaluation, no-fallback, failure/retry, token/cost/generation-time/provenance and concurrency rows pass. Visual AI and AI Customer Service are not part of this exit. |
| 5 — email and CRM | Two independent Outbox tasks, templates, rollback/test, Staging forced recipient, attribution, outcomes, analytics privacy and provider-fake rows pass. |
| 6 — deployment and operations artifacts | Environment isolation, trusted proxy, health, disk protection, backup manifest, alert, Compose and runbook automated/static checks pass without external mutation. |
| 7 — protected Staging validation | All applicable External Validation rows pass on approved isolated topology; full restore rehearsal is complete; no unresolved critical/high risk remains. |
| 8 — formal content and launch readiness | Formal Product, Company Fact, authorized media, SEO, mobile/accessibility owner acceptance pass; Production launch still requires separate authorization. |

## 12. Failure and stop conditions

Implementation or release must stop for the affected Stage when any of these occurs:

1. A proposal changes a frozen Phase 1A invariant without an approved ADR.
2. A historical Migration/Snapshot/Journal differs from the approved baseline.
3. A new path creates a second Revision, Asset relationship, upload/finalize, import-batch, AI-task, email-queue, taxonomy, or long-lived editor authority.
4. Required authorization/Audit, storage isolation, public eligibility, route/redirect, or Publish/Index tests fail.
5. Import/AI/email retry duplicates a business record, Asset relation, accepted Block, or external send.
6. Staging can access Production data, media, secrets, analytics, Admins, or actual recipients.
7. A private Inquiry file can reach public Assets, AI, email attachment, logs, analytics, or an unrelated role.
8. Target-host pressure, disk-critical, backup, restore, proxy, or provider tests have no safe result and rollback evidence.
9. Formal Product/Company/media evidence is absent or unapproved.
10. Any report claims Production Ready without passing all applicable automated, external, and owner acceptance gates.

## 13. Required evidence package

For each future Stage, retain:

- exact Commit and Migration range;
- changed-file and invariant-impact list;
- unit, integration, lint, type, build, and browser results;
- real PostgreSQL Fresh/Upgrade/repeat and concurrency evidence where Schema changes;
- screenshots or recordings for critical responsive/accessibility/admin workflows;
- redacted provider request/result evidence for AI/email/scanner/monitoring;
- target-host resource, pool, queue, log, disk, alert, backup, and restore measurements;
- URL/Canonical/301/Sitemap/noindex diff;
- permission/privacy/Asset boundary review;
- formal Product/Company/media approval records;
- known limitations, rollback boundary, and explicit stop/go decision.

This matrix does not itself grant authority. The separate Owner record authorizes bounded Stage 4A P1-02A development, and the Phase A acceptance record closes only the exact Phase A sub-gate. No row authorizes Provider calls, credentials, external configuration, Staging/Production deployment, Production data, Production AI, Deploy, Publish, Index, formal import, or Push.
