# SEO and URL strategy — frozen V1.1

## Canonical English routes

| Surface | Route |
|---|---|
| Home | `/` |
| Products | `/products/` |
| Product | `/products/{slug}/` |
| Fabric type | `/fabric-types/{slug}/` |
| Applications | `/applications/` |
| Application | `/applications/{slug}/` |
| Fabric Library | `/fabric-library/` |
| Fabric Entry | `/fabric-library/{slug}/` |
| Resources | `/resources/` |
| Fabric Knowledge | `/fabric-knowledge/` and `/fabric-knowledge/{slug}/` |
| China Textile Guide | `/china-textile-guide/` and `/china-textile-guide/{slug}/` |
| China Sourcing Guide | `/china-sourcing-guide/` and `/china-sourcing-guide/{slug}/` |
| Author | `/authors/{slug}/` |
| About | `/about/` |
| Inquiry | `/get-quote/` |
| Future market | `/markets/{slug}/` |

English remains at root. Reserved future language prefixes are `/es/`, `/vi/`, `/tr/`, and `/zh-cn/`. English URLs will not migrate to `/en/`.

## Route rules

- Lowercase ASCII slugs with hyphens.
- Locale plus path is globally unique.
- Published route changes create a real HTTP 301 in the same transaction; framework 308 redirects are not the content-migration mechanism.
- Old paths are not silently reused for unrelated pages.
- Redirect loops, route/source conflicts, missing destinations, and multi-hop chains are rejected in both the domain transaction and database constraints. Inbound historical redirects are flattened to the new current route and the change is audited.
- Every Route/Redirect graph mutation normalizes the affected paths, acquires the shared path-scoped PostgreSQL transaction advisory locks in deterministic order, then rereads and validates the authoritative graph before writing. A route move expands and retries its lock closure only through the bounded Domain Service path; database triggers use the same lock namespace as a last defense. Competing mutations may serialize or return a safe conflict, but they may not commit a redirect chain, cycle, duplicate route owner, partial route move or success Audit for a rolled-back change.
- Canonical defaults to self; cross-page canonicals require publisher authority.

## Index policy

- Published and Index are independent.
- Draft, review, preview, search, ordinary filters, synthetic fixtures, and thin Fabric Entries are noindex.
- Only current canonical routes whose Published entity still passes its full minimum public/index-quality conditions enter XML sitemaps. A direct erroneous Index flag cannot bypass this query.
- Non-production robots, page metadata, sitemap, and `X-Robots-Tag` agree on Noindex; the non-production sitemap is empty.
- Each primary search intent has one primary indexable owner page.
- Tags do not automatically create indexable pages.

### Derived-page Product authority

Taxonomy, Application and Fabric Library Index gates, XML sitemap rows, related-Product queries, primary keyword-owner quality and database readiness all reuse the same real-Product public predicate used by Product public reads. It requires Published state, verified real basis by a currently active Admin/Reviewer-Publisher and time, a current nonblank English localization and current route, plus a Public/Ready/Passed allowed image with effective rights. An invalid direct database `Published` row cannot qualify a derived page. If the last eligible Product is removed, the route is excluded from the sitemap immediately and readiness fails any stale Index flag.

## Structured data

Use only properties supported by visible verified content. Organization, Product, Article, FAQ, and Breadcrumb data never invent price, offers, ratings, technical facts, facilities, or certifications. Structured data eligibility is not presented as a ranking or rich-result guarantee.

## Multilingual reservation

Language-neutral entities are separate from localized copy and routes. Missing translations create no localized route and never silently serve English under a language prefix. Hreflang is emitted only for published equivalents.
