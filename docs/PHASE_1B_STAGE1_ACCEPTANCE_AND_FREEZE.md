# CWT Phase 1B Stage 1 Acceptance and Immutable Freeze

Status: **Stage 1 Accepted**

Acceptance date: 2026-08-06 (Asia/Shanghai)

Production Ready: **No**

Formal Product Status: **Waiting for Real Product Data Validation**

Stage 2: **Paused — not authorized**

This document records the project owner's acceptance and immutable local freeze of the Phase 1B Stage 1 scope. It does not authorize Stage 2, deployment, Push, external-service configuration or formal-data import.

## 1. Authoritative baselines

| Milestone | Commit |
|---|---|
| Stage 0 baseline | `90f386f09cd0a117b93b2ac639f785663544c911` |
| Stage 1 original candidate | `a589ff98e156554048b2b007baf7e7c739fa8fc8` |
| Final Accepted code baseline | `99688a9a65ea9d4bc55636c4c7050e6f7b48dcce` |

The final Accepted code baseline is the Candidate Code Baseline. The Freeze Commit is its direct child and contains only this acceptance/freeze document. The local annotated tag `phase-1b-stage1-approved-2026-08-06` identifies that document-only Freeze Commit; its object and peeled Commit identities are recorded by Git and in the project-owner handoff.

The authoritative Fresh Acceptance input is `.data/PHASE_1B_STAGE1_FRESH_ACCEPTANCE_REPORT.md`, SHA-256 `478db8fd2e17b22ee6e3c442617a4e9e4fe46bdecd1fdc4202b3a400001fac7f`.

## 2. Stage 1 implementation and remediation Commit chain

The complete linear chain after Stage 0 and through the Accepted code baseline is:

| Commit | Subject | Role |
|---|---|---|
| `4959d88f4576a5c4fd3d81ec840957f2c650f0a4` | `feat: add phase 1b stage 1 editorial foundation` | Product data, media and editorial foundation |
| `cb3317047a8b11829b75c7054171b34961ca35ae` | `test: verify phase 1b stage 1 foundation` | Stage 1 foundation verification |
| `a589ff98e156554048b2b007baf7e7c739fa8fc8` | `docs: record phase 1b stage 1 implementation` | Original Stage 1 candidate report |
| `f599e4cde9d39566fd7306c3553a001456052682` | `fix: align static page live projection` | Consolidated remediation |
| `e4a60a36cf8d8aadc8e3ccd0b498008e5191baca` | `fix: enforce renderable block integrity` | Consolidated remediation |
| `f92ed7a5af47a83a9cafbe69708bf8eedf392f51` | `test: verify stage 1 review remediation` | Remediation verification |
| `45bc6097a6a5eb127abc133a758839c6ebe46c07` | `docs: record stage 1 remediation` | Remediation report |
| `8a2176fc1135544716aa4c650c6d2c62d37b5807` | `fix: use renderable product block projection` | Final narrow Medium remediation |
| `87fcbdfe344e4f0a873721fead5bb005da38f944` | `fix: improve content author contrast` | Final narrow Low remediation |
| `8f2f9457e620e245f324cc1ed5f4ceeeec1e0812` | `test: verify final stage 1 remediation` | Final targeted verification |
| `d765d27ad396b7efe417264a3866d3b81722c0c0` | `docs: record final stage 1 remediation` | Final remediation report |
| `99688a9a65ea9d4bc55636c4c7050e6f7b48dcce` | `docs: normalize final remediation report formatting` | Final Accepted code baseline |

No earlier Commit was amended, rebased or otherwise rewritten for this freeze.

## 3. Fresh Acceptance conclusion

- Phase 1B Stage 1: **Accepted**.
- Candidate Code Baseline: `99688a9a65ea9d4bc55636c4c7050e6f7b48dcce`.
- Blocker: **0**.
- High: **0**.
- Medium: **0**.
- Low: **1**.
- Production Ready: **No**.
- Formal Product Status: **Waiting for Real Product Data Validation**.
- Stage 2: **Paused; not authorized**.

Acceptance belongs only to the Stage 1 scope and the code baseline above. It is not a Production approval.

## 4. Fresh Acceptance verification summary

| Gate | Accepted result |
|---|---|
| PostgreSQL 18.4 Fresh `0000→0018` | Passed |
| PostgreSQL Upgrade `0017→0018` | Passed |
| Fresh and Upgrade repeat/no-op | Passed |
| PostgreSQL compatibility harness | 19/19 Passed |
| Stage 1 remediation harness | 13/13 Passed |
| Vitest | 61 files; 227/227 Passed |
| Playwright | 29/29 Passed; 0 retries |
| Axe Critical | 0 |
| Axe Serious | 0 |
| Production Build | 40/40 page-generation units Passed |
| Public Bundle boundary | Passed; 20 public page manifests and 29 files checked |
| Production dependency audit | 0 known vulnerabilities |
| Console warning/error | 0 |
| Page/Hydration errors | 0 |
| Responsive widths | 320, 375, 390, 768 and 1440 Passed |

The independent acceptance used only new isolated PostgreSQL/PGlite environments, localhost-only services and conspicuously synthetic/noindex data. It did not connect to a CWT Production, Preview, Staging or shared database or to a real external Provider.

## 5. Migration freeze state

- Historical Migration SQL `0000–0017` retains its accepted identity.
- Latest Migration: `0018_phase1b_editorial_media_foundation`.
- Migration SQL files: **19**, continuously `0000–0018`.
- Snapshot files: **19**, continuously `0000–0018`.
- Journal entries: **19**, continuously `idx 0–18`.
- Journal final entry: `idx 18`, tag `0018_phase1b_editorial_media_foundation`, timestamp `1785909346377`.
- `0019` or any later Migration: **Absent**.

Accepted Stage 1 identities:

| Artifact | SHA-256 |
|---|---|
| `drizzle/0018_phase1b_editorial_media_foundation.sql` | `a7583d03b59d5858cb5e2cb2542dbc43bf6c620e2067ed900fe6d0d1d0257148` |
| `drizzle/meta/0018_snapshot.json` | `faa9a0819303e82d097874c348d6258533a305da30df00da360055b70dac3073` |
| `drizzle/meta/_journal.json` | `dfb08dad283762e80db4978c8381f88998cfde276ffb1f39c0f5de6f73e34867` |

Any later database change requires a separately authorized forward-only Migration. This freeze does not authorize modification of `0000–0018`.

## 6. Frozen Stage 1 invariants

1. **Product Code generation and correction:** managed Primary Category Prefix, canonical `CWT-[PREFIX]-NNN` generation, uniqueness/concurrency safety, no silent regeneration, and Admin-only reasoned correction with required Audit remain authoritative.
2. **MOQ and Composition facts:** MOQ value/unit remain separated with the approved `m`, `kg`, `roll`, `yd` unit boundary; `moq_note` remains a note; Composition remains a normalized string and must not invent missing proportions or facts.
3. **Shared Product/Content Block authority:** one versioned Block document, Validator, owner-aware public resolver/projection and Renderer authority is reused by Product and Content; duplicate Block authorities are prohibited.
4. **Legacy text rollback window:** deterministic legacy Paragraph backfill remains compatible and legacy text remains read-only through launch, recovery rehearsal and 30 stable days; deletion requires separate forward-Migration authorization.
5. **Renderable Block Projection:** template visibility, Renderer input and readable public projection use the shared resolved result; Empty, Divider-only and fully filtered references do not emit narrative headings or empty containers.
6. **Product/Content media Placement:** ordered roles, visibility, Alt/Caption and owner relationships remain separate from Asset identity; public output requires eligible live relationships and application-controlled Asset URLs.
7. **Static Page live projection:** fixed Home/About module and Placement rules use one approved live projection; disabled/hidden modules revoke public delivery without a second settings authority.
8. **Editorial Revision:** Draft, Review, Apply, Publish and Index boundaries remain separate; published public reads use approved Revisions and AI may never publish or enable Index.
9. **Required Audit:** governed business mutation and required Audit commit atomically; Audit failure rolls back the business mutation, and retry/concurrency behavior remains idempotent.
10. **Asset isolation:** Public, Private and Internal/Import storage contexts remain isolated; Inquiry/private/import Assets cannot enter public delivery or AI knowledge automatically.
11. **Staging identity:** `preview` is retired as a long-term environment name and replaced by `staging`; Production and Staging remain isolated in database, user, media, secrets and noindex/recipient controls.
12. **Navigation and URL stability:** `Fabric & Sourcing` is the display label while `/resources/`, `/fabric-knowledge/`, `/china-textile-guide/`, `/china-sourcing-guide/`, existing public namespaces, canonical rules and audited redirect invariants remain stable.

Changing these invariants requires the authority, compatibility analysis and ADR/Migration process defined by project governance.

## 7. Remaining Low

### L-01 — default Production Build is not completely offline-reproducible

`next/font/google` attempts to retrieve a Google font when no approved local fixture or controlled cache is present. Fresh Acceptance proved the Build with outbound HTTP/HTTPS blocked by routing the font response to a localhost fixture drawn from existing dependencies; candidate code and configuration were not changed.

- Severity: Low.
- Stage 1 impact: non-blocking.
- Disposition: Stage 6 deployment and Build-reproducibility scope.
- Expected later treatment: vendor the approved font or provide a controlled, integrity-checked Build cache without weakening the external-connection boundary.

## 8. Technical Debt and readiness orchestration

- A stale local PGlite Schema can expose a lower-level missing-column error during a database-dependent Build instead of an explicit Migration-readiness message.
- Target-environment Migration, readiness and Build ordering is deferred to Stage 6 deployment orchestration.
- The retained repository-default local PGlite was intentionally not migrated, cleared, rebuilt or used as acceptance authority.

These items do not block the Stage 1 freeze and do not authorize changes in this acceptance-record task.

## 9. External Validation remaining

The following remain outside Stage 1 acceptance and block any future Production-ready claim where applicable:

- production canonical origin, HTTP/HTTPS and `www` one-step redirect behavior, Cloudflare DNS/CDN/WAF/TLS and trusted-proxy boundary;
- Tencent Cloud target-server 2 vCPU/4 GB resource, disk, Swap, connection-pool, concurrency and alert validation;
- Production/Staging database, user, administrator, secret, media, analytics, email and network isolation;
- Tencent COS private Singapore buckets, CAM, encryption, backup, checksum and complete restore rehearsal;
- Zoho Production/Staging applications, sender/reply-to rules, staging recipient override and independent alert path;
- malware Scanner and shared Rate Limiter Providers;
- Hosted Sentry, Tencent Cloud monitoring, external uptime and non-Zoho alerting;
- approved cloud AI Provider, Model and budget, with Draft-only/provenance/privacy enforcement;
- formal Product data, Company Facts, licensed Media, SEO editorial evidence and final owner device/accessibility validation.

No item in this list is claimed complete by the Stage 1 Accepted status.

## 10. Freeze and authorization boundary

- Stage 1 Accepted does **not** mean Production Ready.
- Production Ready remains **No**.
- Formal data remains **Waiting for Real Product Data Validation**.
- Stage 2 requires a separate explicit project-owner authorization and remains paused.
- This freeze does not authorize deployment, Push, DNS/Cloudflare changes, external Provider configuration, Production credentials, formal-data import or an Approved Tag beyond the specifically authorized local Stage 1 tag.
- The acceptance record and annotated tag freeze this exact Stage 1 lineage locally; they are not a release or deployment artifact.

Work stops after the pure-document Freeze Commit and local annotated Approved Tag. The next permitted implementation step is a separately authorized Stage 2 task.
