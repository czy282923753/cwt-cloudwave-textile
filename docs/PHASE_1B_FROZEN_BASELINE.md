# CWT Phase 1B pre-development frozen baseline

Status: **Approved product and deployment decision input; implementation not authorized by this document**
Baseline version: **CWT Phase 1B Pre-Development Frozen Decision Baseline V1.1 — Final**
Discovery date: **2026-08-05**

## 1. Provenance and authority

Phase 1B starts from the approved Phase 1A baseline:

- Tag: `phase-1a-postgres-stage2c-approved-2026-08-03`
- Commit: `9e8437ca22ecfd114babda49e13c676bbc6a8899`
- Parent candidate: `3a93c8ddae96f4cf70a721bfc9cbf6ed2404ee10`
- Owner-supplied frozen input SHA-256: `28503506cbc2ca4f3ae8bb35e590766fa7e37a82aefcc528c73a713e1cbccda6`

For Phase 1B product and deployment requirements, the owner-approved V1.1 Final input is authoritative over older non-frozen suggestions and historical implementation reports. It is applied together with the root `AGENTS.md`, accepted ADRs, domain specifications, `ENGINEERING_GOVERNANCE.md`, and `REVIEW_POLICY.md`.

Historical Migrations `0000`–`0017`, their snapshots, and the Drizzle Journal are immutable. Any approved database change must be a new forward Migration. This document records decisions; it does not authorize a Migration or implementation.

## 2. Inherited non-negotiable invariants

1. CWT remains a B2B fabric SEO acquisition and inquiry-conversion platform, not an online shop.
2. English remains at `/`; it does not move to `/en/`.
3. One primary search intent has one primary indexable owner page.
4. Draft, Review, Publish, and Index remain separate controls.
5. AI may generate reviewable Draft material only. It may not invent facts, publish, or enable Index.
6. Product, Applications, and Fabric Library remain separate business entities.
7. Changes to live Product and Content state use the existing Editorial Revision authority.
8. Public Assets, private Inquiry attachments, and internal Import files remain isolated.
9. Inquiry, Contact, Organization, CRM history, and the persistent notification Outbox remain authoritative business records; email is a notification channel.
10. The application remains a modular monolith. No microservice split is approved.
11. UI and transport adapters never become business-write authorities. Domain Services recheck authorization and invariants, and governed mutation plus required Audit remains atomic.
12. Existing upload Intent, Batch, Finalize, Manifest, Recovery, Cleanup, Asset relation, Revision, route/redirect, Inquiry idempotency, and Outbox authorities must be reused and converged—not duplicated.

## 3. Frozen public navigation and URLs

The public navigation is:

```text
Home
Products
Applications
Fabric Library
Fabric & Sourcing
About CWT
Get a Quote
```

The logo continues to link to `/`. `Home` is also an explicit navigation item. `Resources` changes only its displayed name to `Fabric & Sourcing`; its route remains `/resources/`.

The following namespaces remain unchanged:

```text
/resources/
/fabric-knowledge/
/china-textile-guide/
/china-sourcing-guide/
```

Canonical, redirect, route ownership, Sitemap, Index eligibility, and one-intent/one-owner rules remain authoritative. A label change creates no route migration or redirect.

## 4. Frozen Home and About CWT model

The Home page is a fixed template with replaceable governed media and copy—not an unbounded page builder. The fixed order is:

```text
Hero
Products
Applications
Fabric Library
Fabric & Sourcing
CWT Manufacturing & Service Strength
Inquiry CTA
Footer
```

Home media settings support desktop and mobile images, direct upload or Asset Library selection, focal point, overlay strength, Alt Text, module visibility, Draft, Preview, Review, and Publish. They do not allow arbitrary HTML, typography, colors, animation, text positioning, or structural reordering.

The trust module may show only verified CWT-owned manufacturing media and the approved service headings:

- Own Manufacturing
- Fabric Development & Matching
- Sampling & Customization
- Quality Check
- Packing & Delivery Support

It must not show partner factories, a partner network, unattributed facilities/equipment, or unverified capacity, employee, area, equipment, or certification claims. About CWT follows the same rule. The owner-confirmed CWT-owned, publicly licensed media is an approved collection, while factual copy still requires Verified Company Facts with public-use permission.

## 5. Frozen Product data contract

- `Product Type = Primary Fabric Category`; no duplicate free-text Product Type field is created.
- A Product has exactly one Primary Category and may have Additional Categories, Applications, and free-text Tags.
- Primary Category and Applications are searchable and support quick creation. A new record does not automatically create or index a public page.
- Product Code is permanently unique. Existing codes are retained. Generated codes follow `CWT-[TYPE]-[three digits]`, contain no year/color/GSM/width, Chinese, or spaces, and are not reused after discontinuation.
- English names follow `[Material or Structure] + [Commercial Fabric Name] + [Application or Feature when necessary]`; AI may suggest, but a human confirms.
- Composition uses a canonical percentage format without changing the supplied ratios.
- GSM stores a number with the fixed display unit `g/m²`.
- Width stores a number with the fixed display unit `cm`.
- MOQ stores the numeric value and unit separately.
- Unknown facts remain empty and are never inferred. Existing field-review and real-Product gates continue to apply.

## 6. Frozen Product import model

The operator flow is:

```text
Excel + image ZIP/folder
→ validation
→ deterministic image matching
→ duplicate checks
→ Draft creation
→ optional AI Draft copy/layout
→ human edit and preview
→ Review
→ human Publish
```

The importer must support partial success, row-level errors, independent retry, and retry without duplicate Product or Asset creation. AI failure preserves the imported Draft and original images. Initial creation and bulk update are separate explicit modes. Import never publishes or enables Index.

Image matching priority is exact Product Code folder, an explicit Excel filename, then a filename starting with the complete Product Code. Anything else becomes `Unmatched Images`; fuzzy guessing is prohibited. Supported roles are Primary, Gallery, Detail, and Application. Product Code and unresolved Slug conflicts block a row. Similar names/specifications/images produce warnings only; the system never auto-merges, overwrites, or deletes Products.

Import file bytes must extend the existing isolated upload, scanning, Asset, Finalize, Recovery, and Cleanup mechanisms. A second upload/finalize system is prohibited.

## 7. Frozen Product media and structured editor model

Product media supports direct upload, Asset Library selection, multiple images, ordering, Primary/Gallery/Detail/Application roles, replace, hide, remove, Alt Text, Caption, and desktop/mobile preview. Live Product changes remain behind Editorial Revision approval.

Product and article content use a versioned structured Block document, not arbitrary HTML. The approved Block allowlist is:

```text
Heading
Paragraph
Image
Gallery
Specification Table
Comparison Table
Feature List
Bullet List
Callout
Quote
FAQ
Related Products
Related Articles
CTA
Divider
```

Articles additionally support Cover and Inline images, H2/H3/H4, internal links, autosave, ordering, Undo/Redo, and desktop/mobile Preview. Raw HTML, JavaScript, arbitrary styles, unapproved components, and unknown AI-generated Block types are prohibited. The new structured editor must replace the current plain-text authority through a bounded compatibility migration; it may not create a permanent old/new editor dual path.

## 8. Frozen AI boundary

Production AI uses external cloud APIs only and requires `AI_PROVIDER_MODE=cloud_api`. The 4 GB server must not run local model servers, model weights, GPU inference, or local image generation.

AI may draft names, summaries, descriptions, features, Application copy, FAQ, SEO metadata, Alt Text, Caption, Block layout, and internal-link suggestions. It may only suggest Category, Applications, Slug, image role, duplicate assessment, and Index recommendations. It must not create or modify Product Code, composition ratios, GSM, Width, MOQ, lead time, inventory, certification/test values, performance measurements, or company/facility/capacity facts.

AI UX supports multiple candidates, before/after Diff, Block-level accept/reject, Undo, locked Blocks, and preservation of the original version. AI detail images use a real Product image, an approved template, and a cloud image API; false fabric structures, factories, or production capabilities are prohibited. Provider, Model, token usage, cost, outcome, and safe failure evidence are retained. Missing configuration fails safely with manual editing still available. Private Inquiry files never enter model context or an AI knowledge base.

## 9. Frozen Inquiry, CRM, email, and attribution model

Inquiry and PostgreSQL remain authoritative. Each new Inquiry creates two independent jobs in the existing Outbox authority:

1. internal notification;
2. customer confirmation.

Production SMTP uses `sales@cwtextile.com` as the account and From address, `info@cwtextile.com` as Reply-To and internal recipient, and an independently managed Production app password. Staging uses a separate app password, prefixes subjects with `[STAGING]`, and server-side overrides every To/CC/BCC recipient to `test@cwtextile.com`.

Internal and customer templates support safe variables, Draft and Active versions, Preview, test send, version history, rollback, default fallback, and Audit. Test sends always go to `test@cwtextile.com`. Private images are never email attachments; internal messages link to the authorized Operations record.

The frozen CRM states are New, Reviewing, Qualified, Quoted, Sample, Negotiation, Won, Lost, Spam, and Archived. Attribution retains Landing Page, Referrer, UTM, First Touch, Last Non-Direct, Submit Touch, Country, and the source Product/Application/article. Lost Reason and First Response remain governed CRM data. Third-party analytics never receives PII, Inquiry/Contact identifiers, filenames, private Asset identifiers, or attachments.

Online chat, WebSocket customer service, AI customer service, customer accounts, inbox synchronization, automatic quotes/replies, SMS, and marketing automation are outside the initial Phase 1B scope.

## 10. Frozen Production and Staging topology

The target is a Tencent Cloud Singapore Lighthouse server running Ubuntu 24.04 LTS with 2 vCPU, 4 GB RAM, 60 GB SSD, 30 Mbps peak bandwidth, and 1.5 TB/month transfer.

The deployment is Docker Compose with reverse proxy, Next.js Web/Admin, Worker/Scheduler, and PostgreSQL 18.4. Production and on-demand Staging share the host and PostgreSQL instance but use different databases, database users, secrets, authentication, admins, media roots, SMTP app passwords, AI environment identity, analytics configuration, and logs.

Production and Staging media are separated into Public, Private Inquiry, and Internal Import roots. PostgreSQL data, backups, and logs are separate roots. The directory and volume contract must permit later attachment of a data disk without changing business identifiers or public URLs.

Staging is on-demand, fully noindex, has no Production analytics, is protected by Cloudflare Access or equivalent, forces all email to the test recipient, and cannot read Production data or media.

The resource policy is 2 GB Swap, image concurrency 1, AI text concurrency 2, AI image concurrency 1, Production pool about 8–10, Staging pool about 2–4, rotated Docker logs, one current and one rollback image, immutable prebuilt application images, and no local AI. Disk usage at 70% starts expansion review; 80% pauses nonessential bulk uploads.

The owner-approved baseline stores live media on isolated local host volumes initially and uses COS for backup, not as the initial online-media origin. This differs from the older `ENVIRONMENT_AND_DEPLOYMENT.md` production S3 requirement and therefore requires a reviewed storage/deployment ADR before implementation. Storage isolation, private origin access, application-controlled public media, revocation, and backup/restore remain unchanged.

## 11. Frozen Cloudflare boundary

Alibaba Cloud remains only the registrar. Cloudflare is authoritative DNS, CDN/WAF/reverse proxy, HTTPS layer, and future cache layer for `cwtextile.com`, `www`, and `staging`.

- The three web records are proxied.
- SSL is Full (strict), with a valid origin certificate.
- Zoho MX/SPF/DKIM/DMARC/verification records are DNS Only.
- Origin ports 80/443 should accept Cloudflare source ranges only where operationally feasible.
- SSH accepts trusted access sources only; PostgreSQL is never public.
- The application trusts visitor-IP headers only across the verified Cloudflare proxy boundary.
- Controlled media does not depend on Cloudflare cache initially.
- Future shared media caching requires versioned delivery or verified purge/invalidation and revocation tests.

## 12. Frozen backup, recovery, logging, and monitoring boundary

PostgreSQL receives a daily compressed custom-format `pg_dump` with seven local copies. COS receives one weekly off-site backup with four retained copies and an extra backup before major deployments or Migrations.

Backups include database dumps, original approved public media, adopted AI detail images, private Inquiry originals, deployment/reverse-proxy configuration, Migration version, restore tooling, and required encrypted configuration. Rebuildable derivatives, thumbnails, Next cache, temporary ZIP/import staging, failed AI images, ordinary access logs, and Staging test data are excluded.

Every backup has checksums, a completion result, and independent failure alerting. Before Production launch, a complete restore into an empty isolated environment must restore PostgreSQL, original media, deployment configuration, rebuild derivatives, run readiness, and verify Product, Content, Inquiry, and attachment authorization. The restored environment forces staging mail override and noindex.

Monitoring uses Tencent server monitoring, hosted Sentry Free, and external Home/Health uptime checks. Logs retain 14 days within a 2–4 GB budget and Docker rotation. Alerts cover disk, memory, CPU, uptime, Health, Outbox failures/backlog, local/COS backup failure, COS verification failure, dead Worker work, and server unavailability. Outbox/SMTP failure alerting cannot rely only on the same Zoho SMTP path.

## 13. Explicitly deferred scope

The initial Phase 1B does not implement managed PostgreSQL, online media on COS, multiple servers, Kubernetes, microservices, Elasticsearch, local models, local image generation, chat, AI customer service, customer accounts, SMS, a complete email system, an unlimited page builder, Raw HTML, AI auto-publish/Index, partner-factory display, or Production/Staging data sharing.

Scaling follows observed pressure: add/expand disk, upgrade to 8 GB, move online media to object storage, move PostgreSQL to managed hosting, then consider multiple application instances.

## 14. Status vocabulary used by Discovery

- **Implemented** — current HEAD contains the complete in-scope behavior and enforceable boundary.
- **Partially Implemented** — a reusable foundation exists, but at least one required behavior or enforcement point is absent.
- **Missing** — no current implementation satisfies the requirement.
- **Conflicting** — current behavior or accepted older configuration contradicts this approved baseline.
- **External Configuration Only** — implementation is not principally a repository change; an authorized operator/provider configuration is required.
- **External Validation Required** — local code or reasoning cannot prove the selected provider, deployment, capacity, or real-data behavior.
- **Deferred by Frozen Scope** — the approved baseline explicitly excludes the capability from initial Phase 1B.

## 15. Readiness statement

This baseline does not claim that Phase 1B has started, that external providers are configured, or that CWT is Production Ready. Formal implementation requires a later explicit authorization, approved architecture decisions, forward Migration review, Stage acceptance, Staging deployment, provider validation, formal Product/media validation, and a complete restore drill.
