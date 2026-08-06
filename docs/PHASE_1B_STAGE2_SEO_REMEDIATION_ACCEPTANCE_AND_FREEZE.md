# CWT Phase 1B Stage 2 SEO Controlled Remediation Acceptance and Immutable Local Freeze

Status: **Accepted and Frozen**

Freeze date: **2026-08-07 (Asia/Shanghai)**

Production Ready: **No**

Formal Product Status: **Waiting for Real Product Data Validation**

Stage 3: **Planned / Deferred — not authorized**

This document records the Project Owner's acceptance and immutable local freeze of the exact Stage 2 SEO Controlled Remediation Candidate. It preserves the earlier failed review as audit history and does not authorize Stage 3, Push, deployment, Production, external providers, credentials, or formal data.

## 1. Immutable identities

| Item | Identity or result |
| --- | --- |
| Historical Stage 2 Freeze Commit | `70ae0159ddf5ab4dedf405df1154374f065bd8b9` |
| Historical Stage 2 Approved Tag | `phase-1b-stage2-approved-2026-08-06` |
| Historical Annotated Tag Object | `73cac88d3039ee21ed95c9387553a57c19928319` |
| Historical Tag peeled Commit | `70ae0159ddf5ab4dedf405df1154374f065bd8b9` |
| SEO Remediation Candidate Code Baseline | `56e0ffed39d97876b47d4900ffca45db2a978cf8` |
| New local Annotated Approved Tag | `phase-1b-stage2-seo-remediation-approved-2026-08-07` |
| Fresh Acceptance result | Passed; Blocker 0 / High 0 / Medium 0 / Low 0 |
| Project Owner decision | Record the exact SEO Remediation Candidate as Accepted and Frozen |

The pure-document Freeze Commit is the direct child of `56e0ffed39d97876b47d4900ffca45db2a978cf8` and adds only this document. Its cryptographic identity is recorded in Git history and the completion report because a Commit cannot embed its own hash. The new Annotated Tag identifies the pure-document Freeze Commit, not the Candidate directly.

The historical Stage 2 Tag, Tag Object and peeled Commit remain unchanged. This new freeze is a linear forward SEO amendment to the historical accepted Stage 2 baseline; it does not move, replace, reinterpret, or recreate the historical tag.

## 2. Complete six-Commit SEO remediation chain

The exact first-parent range `70ae0159ddf5ab4dedf405df1154374f065bd8b9..56e0ffed39d97876b47d4900ffca45db2a978cf8` is linear and contains six Commits:

| Commit | Subject | Scope |
| --- | --- | --- |
| `014b09a34e4ec3691c519083e20e227daea52c21` | `fix: align public seo and media authorities` | Initial controlled correction of the thirteen SEO findings |
| `0f6f0e88eaca619b86b637b6478f20d8c177afff` | `test: verify stage 2 seo remediation` | Initial SEO, PostgreSQL, browser, media, crawl and regression evidence |
| `c71a73978c7eb5769ea24903fd6c9e4516d173af` | `docs: record stage 2 seo remediation` | Initial developer remediation evidence report |
| `0e9ecb831fdd30733673d0692dd56287e0a55d5d` | `fix: converge public asset variant and cache contracts` | RR1 correction of Variant identity and governed response-cache authorities |
| `2460cff0177a0143480aca7b81c59a3460cd2363` | `test: verify seo remediation review corrections` | Real Admin Finalize, Public Asset, PostgreSQL and browser regression evidence |
| `56e0ffed39d97876b47d4900ffca45db2a978cf8` | `docs: record seo remediation rr1 correction` | Final Candidate and RR1 developer evidence report |

The six existing Commits were not amended, rebased, squashed, reordered, or rewritten by this freeze.

## 3. Review and acceptance audit history

### 3.1 Original independent Google SEO audit

The original independent audit concluded **Changes Required** and reported:

| Severity | Count |
| --- | ---: |
| Blocker | 0 |
| High | 2 |
| Medium | 7 |
| Low | 4 |

Those thirteen findings defined the authorized controlled-remediation scope. This freeze does not erase the original result or imply that the initial Stage 2 candidate already satisfied the later SEO requirements.

### 3.2 First developer remediation and failed independent re-review

The first three SEO Commits implemented and documented the initial remediation. The first independent re-review of `c71a73978c7eb5769ea24903fd6c9e4516d173af` concluded **Changes Required — not eligible for Fresh Acceptance**:

- 11 Closed;
- 1 Partially Closed (`SEO-M-03`, represented by `RR-L-01`);
- 1 Regressed (`SEO-M-07`, represented by `RR-M-01`);
- resulting Findings: Blocker 0 / High 0 / Medium 1 / Low 1.

The failed review remains an immutable audit fact. It was not deleted, rewritten, downgraded, or presented as a pass.

### 3.3 RR1 correction and second independent re-review

The final three SEO Commits converged the extension-free logical Variant identity and the governed Public Asset response-cache contract. The second independent re-review concluded **Passed — eligible for Fresh Acceptance**:

- `RR-M-01 / SEO-M-07`: Closed;
- `RR-L-01 / SEO-M-03`: Closed;
- original findings: 13 Closed / 0 Partially Closed / 0 Open / 0 Regressed;
- resulting Findings: Blocker 0 / High 0 / Medium 0 / Low 0.

### 3.4 Fresh Acceptance and Owner freeze decision

Fresh Acceptance independently validated the exact Candidate in newly isolated environments and concluded **Fresh Acceptance Passed — eligible for Project Owner to record acceptance and freeze**, with Blocker 0 / High 0 / Medium 0 / Low 0. The Project Owner then explicitly accepted the exact Candidate and authorized this pure-document Freeze Commit and new local Annotated Tag.

## 4. Authoritative evidence records

| Evidence | SHA-256 | Conclusion |
| --- | --- | --- |
| `.data/PHASE_1B_STAGE2_SEO_REMEDIATION_INDEPENDENT_REVIEW.md` | `a9b6e8d757fa628907061e9d3a178ee781c531a3a8b325a8afeb5e87ac079f2b` | Changes Required; 11 Closed / 1 Partially Closed / 1 Regressed |
| `.data/PHASE_1B_STAGE2_SEO_REMEDIATION_INDEPENDENT_REVIEW_R2.md` | `84b7e5ac6c6c68fdd1872e7a09d2fc82d6fe69620499be3c16fe7edd40b5b7aa` | Passed — eligible for Fresh Acceptance; 13/13 Closed |
| `.data/PHASE_1B_STAGE2_SEO_REMEDIATION_FRESH_ACCEPTANCE_REPORT.md` | `cccefb69444f6b33d15e8673ee391ff3ef1fa703c1afc2376507e82a4c6df8c7` | Fresh Acceptance Passed — eligible for Project Owner to record acceptance and freeze; Findings all zero |

The `.data` reports are evidence inputs and are not added to the Freeze Commit.

## 5. Fresh Acceptance summary

Fresh Acceptance used conspicuous Synthetic/Test/noindex data and new isolated PostgreSQL, PGlite, browser, and storage environments. Principal accepted results were:

| Gate | Fresh result |
| --- | --- |
| Git identity and six-Commit ancestry | Exact Candidate; clean entry/exit; historical Tag unchanged |
| PostgreSQL 18.4 Fresh `0000→0018` | Passed; repeat/no-op passed; 19 Migration entries |
| PostgreSQL catalog/readiness | Passed; no invalid published eligibility or Asset readiness state |
| 101-Product pagination matrix | 101 total and unique across 5 pages; Application 101; Taxonomy 101; no omission/duplication |
| Real Admin Finalize media matrix | Six canonical Variants; 7/7 manifest evidence; required Audit/recovery/cleanup passed |
| Targeted SEO/RR1 suite | 10/10 files; 23/23 tests passed |
| Full Vitest | 81/81 files; 300/300 tests passed |
| Production Build | Passed; 40/40 page units generated |
| Public Bundle boundary | Passed; 23 public manifests and 31 manifest/chunk files; no Admin/DB/Private leak |
| Production dependency audit | No known vulnerabilities reported |
| Playwright | 40/40 passed; 0 retries; Desktop Chromium and Pixel 7 |
| Responsive coverage | 320, 375, 390, 768, 1024, and 1440 viewports |
| Browser errors | Console 0; page errors 0; Hydration 0; normal-path server 500 count 0 |
| Axe | Critical 0; Serious 0 |
| `git diff --check` | Passed at entry and exit |

Environment setup incidents and the corrected initial harness invocations remain recorded in the Fresh Acceptance report; they were not hidden or misreported as Candidate failures. The final fresh runs passed without modifying the Candidate.

## 6. Frozen SEO and public-media behavior

The exact Candidate freezes the following controlled-remediation behavior in addition to the existing Stage 2 and Stage 1 frozen invariants:

1. **Authoritative real-Product eligibility:** Product public list/detail and derived Application, Taxonomy, Fabric Library, metadata, robots, internal-link and Sitemap behavior reuse the single authoritative real-Product eligibility predicate. A bare published-status test is not sufficient authority.
2. **Derived indexability:** an active/public derived entity with no eligible Product may remain HTTP 200 but is `noindex,follow` and omitted from Sitemap; inactive or non-public entities remain controlled 404.
3. **Production origin:** the exact accepted Production canonical origin is `https://cwtextile.com`. HTTP, loopback, wrong Host, userinfo, non-default port, path, query, fragment, and trailing-slash origin forms fail closed; generated URLs do not contain an origin-join double slash.
4. **Robots boundary:** `/api/public-assets/` is the narrow governed public-media exception under the otherwise blocked API/Admin/private surface. Inquiry, Private Asset, Admin, operations and other sensitive API paths remain disallowed and inaccessible.
5. **Home/About empty and failure semantics:** a valid but empty Home/About public projection is HTTP 200 with `noindex,follow`; invalid projection or operational failure does not masquerade as an indexable thin page and returns safe temporary failure semantics without sensitive details.
6. **Governed Public Asset status and cache:** malformed or business-ineligible/missing media returns sanitized 404; database or storage failure returns sanitized 503; successful original and Variant delivery returns 200. Every 200/404/503 outcome uses exactly `Cache-Control: private, no-store, max-age=0, must-revalidate`.
7. **Product structured data:** Product JSON-LD omits `brand` unless a verified, approved, page-visible Product brand fact exists. Platform identity alone is not Product-brand authority.
8. **Taxonomy links:** inactive or non-public Taxonomy is not linked from public Product surfaces and cannot create a public 404 link.
9. **Stable crawlable pagination:** Products no longer have a global 100-record cap. Pagination is stable and database-backed, page 1 canonicals to `/products/`, later pages self-canonicalize, and crawlable navigation avoids omission or duplication. Application and Taxonomy relation queries apply authoritative eligibility directly rather than filtering a globally truncated set.
10. **Single Variant logical-key authority:** `asset_variants.variant_key` stores the canonical extension-free derivative identity such as `960w-webp`; `object_key` separately stores the full storage path and extension. Normal Admin Finalize, manifest/evidence/recovery/cleanup, public projection, rendered `srcset`, and governed delivery converge on that contract without a compatibility dual path.
11. **Governed responsive delivery and Hero priority:** public responsive images use application-controlled routes, supported AVIF/WebP candidates, dimensions, `srcset` and `sizes`. Public delivery rechecks Asset, live relation, rights, scan, readiness, deletion, storage and Variant eligibility on every request. Exactly the actual above-the-fold Hero is eager/high priority; other media remains lazy/default, and hidden desktop/mobile Hero alternatives are not both promoted.
12. **Home canonical and Sitemap freshness:** Home emits its correct self-canonical. Sitemap `lastmod` uses only reliable approved significant-page/live-revision time; when reliability cannot be proven, it is omitted rather than fabricated from unrelated Route changes.
13. **Article author and Taxonomy breadcrumb:** Article structured data emits approved `Person` or `Organization` from `isOrganization`. Taxonomy breadcrumb omits the nonexistent `/fabric-types/` hub and does not create a second hierarchy.

This freeze makes no Google ranking, traffic, indexing-time, image-indexing, Core Web Vitals field, or commercial-performance guarantee.

## 7. Existing Stage 2 Low and Technical Debt

### F-L1 — exact-baseline recovery feedback

The previously accepted Stage 2 Low remains open technical debt and was not fixed by the SEO remediation:

- after Block Editor `Save failed`, restoring fields to the exact saved baseline and selecting Save now can show state `Saved` while stale assertive validation feedback remains;
- the feedback is contradictory for users and accessibility technology;
- it does not cause data loss, authorization failure, Revision corruption, Live, Publish, Index, or public-output impact;
- any later minimal correction must clear the stale feedback on baseline-equality success and add regression coverage under separate Owner authorization.

F-L1 is not a Finding against the SEO remediation Fresh Acceptance and is not represented as resolved.

### Non-Hermetic font Build

The default Build remains non-Hermetic because `next/font/google` otherwise depends on Google Fonts availability. Fresh Acceptance passed the unmodified Candidate with an isolated controlled local font-response harness and no external font request. This does not resolve Stage 6 Build reproducibility work or make the project Production Ready.

## 8. Inquiry contract and continuing Owner boundaries

The authoritative first-release Inquiry direction remains:

- Email is required;
- Country is required;
- at least one of Message or a successfully uploaded image is required;
- Company, WhatsApp, and Phone are optional;
- Name has not been frozen as required.

The inherited runtime currently requires Name and Email while Country remains optional. The SEO remediation does not modify Inquiry code, and this inherited difference is not accepted or frozen by this Tag as the Owner's product contract. Disposition: **Owner Confirmation Required**. Controlled convergence and independent validation must complete before Production under separate authorization.

Continuing Owner boundaries:

1. The exact Home H1 and final brand/marketing copy require formal Stage 8 SEO/content acceptance.
2. Public display rules for MOQ and Product Code depend on the final Product page specification; database-field existence does not freeze public presentation.
3. The complete CRM state-transition table remains Stage 5 scope.
4. The suggested Stage 8 initial scale of 30–50 Products remains advisory, not a hard acceptance threshold.

## 9. Migration and dependency freeze

- Migration SQL identities remain exactly `0000–0018`: **19 SQL files**.
- Snapshot identities remain exactly `0000–0018`: **19 Snapshot files**.
- Journal contains **19 entries** and ends at `0018_phase1b_editorial_media_foundation`.
- `0019` or any later Migration: **absent**.
- SEO remediation Schema/Migration change: **No**.
- Package, lockfile, dependency and production-configuration change: **No**.

| Frozen artifact | SHA-256 |
| --- | --- |
| `drizzle/0018_phase1b_editorial_media_foundation.sql` | `a7583d03b59d5858cb5e2cb2542dbc43bf6c620e2067ed900fe6d0d1d0257148` |
| `drizzle/meta/0018_snapshot.json` | `faa9a0819303e82d097874c348d6258533a305da30df00da360055b70dac3073` |
| `drizzle/meta/_journal.json` | `dfb08dad283762e80db4978c8381f88998cfde276ffb1f39c0f5de6f73e34867` |

Any future database change requires separate Project Owner authorization and a forward-only Migration. This Freeze Commit and Tag do not authorize `0019` or changes to historical Migration artifacts.

## 10. External Validation and formal data

The following remain unvalidated and are not claimed by this freeze:

- live DNS, TLS, HTTP→HTTPS and www→canonical-host redirects;
- Cloudflare CDN/WAF/Access, origin-bypass prevention, trusted visitor IP and production cache behavior;
- Production object-storage/CDN MIME, consistency, delivery and invalidation behavior;
- Google Search Console, real Googlebot crawl/render, live Sitemap/robots retrieval, canonical consolidation, SERP, image indexing, ranking, traffic, CrUX, RUM and field Core Web Vitals;
- target Tencent Cloud server resource, disk, pool, concurrency, health, logging, backup and restore behavior;
- Zoho, COS, Scanner, shared Rate Limiter, Sentry, AI, Analytics, monitoring, alerts and other real providers;
- formal Product identity/specification evidence, verified Company Facts, authorized public media, final SEO copy and final Owner desktop/mobile/content acceptance.

Only Synthetic/Test/noindex data was used. No Production database, provider, credential, formal Product, Company Fact, customer, Inquiry, or licensed media was used or accepted. Formal Product Status remains **Waiting for Real Product Data Validation**.

## 11. Immutable freeze and authorization boundary

- **Stage 2 SEO Controlled Remediation Accepted and Frozen** applies only to the recorded behavior and exact Candidate Code Baseline `56e0ffed39d97876b47d4900ffca45db2a978cf8`.
- The pure-document Freeze Commit is the Candidate's direct child and contains only `docs/PHASE_1B_STAGE2_SEO_REMEDIATION_ACCEPTANCE_AND_FREEZE.md`.
- The local Annotated Tag `phase-1b-stage2-seo-remediation-approved-2026-08-07` points to the pure-document Freeze Commit, not directly to the Candidate.
- The historical Stage 2 Approved Tag and Freeze Commit remain unchanged and continue to identify the earlier accepted Stage 2 boundary.
- This freeze does not authorize Stage 3, Push, Tag publication, deployment, Production, DNS, Cloudflare, external providers, Production credentials, or formal data.
- Any later change to this frozen SEO/media behavior requires explicit Project Owner authorization and the applicable governance, ADR, security, SEO, and forward-only Migration review.
- Production Ready remains **No**.
- Stage 3 remains **Planned / Deferred — not authorized**.

Work stops after the pure-document Freeze Commit and local Annotated Tag. The next implementation action requires separate Project Owner authorization.
