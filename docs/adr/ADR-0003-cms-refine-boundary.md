# ADR-0003: Refine admin boundary

Status: Accepted with a narrow boundary after Checkpoint 1 validation.

Refine may provide admin lists, paging, sorting, filters, detail views, simple forms, and navigation only. Domain services own permissions, constraints, workflows, publishing, SEO, uploads, relationships, CRM, and public rendering. A failed compatibility test selects a custom admin UI without changing the domain model.

## Validation result

Refine Core 5.0.12 and Next.js Router 7.0.5 compile with Next.js 16.2 Active LTS and React 19.2 when isolated beneath the admin layout. Its router provider requires a Suspense boundary because it reads search parameters. The generated public page client manifest contains no Refine or admin modules.

Complex Product relationships, long forms, upload workflows, and publish/review actions remain custom application pages and services. This limitation is intentional and satisfies the frozen boundary; Refine is a Go for the narrow UI-shell role only.
