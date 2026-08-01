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
- Canonical defaults to self; cross-page canonicals require publisher authority.

## Index policy

- Published and Index are independent.
- Draft, review, preview, search, ordinary filters, synthetic fixtures, and thin Fabric Entries are noindex.
- Only current canonical routes whose Published entity still passes its full minimum public/index-quality conditions enter XML sitemaps. A direct erroneous Index flag cannot bypass this query.
- Non-production robots, page metadata, sitemap, and `X-Robots-Tag` agree on Noindex; the non-production sitemap is empty.
- Each primary search intent has one primary indexable owner page.
- Tags do not automatically create indexable pages.

## Structured data

Use only properties supported by visible verified content. Organization, Product, Article, FAQ, and Breadcrumb data never invent price, offers, ratings, technical facts, facilities, or certifications. Structured data eligibility is not presented as a ranking or rich-result guarantee.

## Multilingual reservation

Language-neutral entities are separate from localized copy and routes. Missing translations create no localized route and never silently serve English under a language prefix. Hreflang is emitted only for published equivalents.
