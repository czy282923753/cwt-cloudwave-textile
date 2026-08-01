# Technology validation — Checkpoint 1

## Locked runtime

- Node.js 24.14.0 LTS
- pnpm 11.9.0
- Next.js 16.2.12 Active LTS patch line
- React and React DOM 19.2.8
- TypeScript 5.9.3 with strict, exact optional properties, unchecked indexed access, and no implicit override checks
- Tailwind CSS 4.3.3
- Drizzle ORM 0.45.2 and Drizzle Kit 0.31.10 stable channels; 1.0 RC is intentionally excluded

## Refine

Conditional Go for admin navigation, lists, paging, sorting, filters, detail views, and simple CRUD only. Refine Core 5.0.12 and Next.js Router 7.0.5 require a Suspense boundary under App Router. Fresh-build inspection of every non-admin public page manifest and referenced chunk confirms public-bundle isolation.

## Local substitutes

PGlite provides PostgreSQL-compatible local and integration-test execution. It is not accepted as the final Phase 1A database proof; the real PostgreSQL migration/constraint/concurrency/query matrix remains blocked until an engine is provided. PostgreSQL remains required for preview/production. Local filesystem storage and a development scanner are permitted only outside production; S3-compatible storage and a real scanner are production gates.

Local PGlite builds use one Next.js page-data worker to avoid concurrent WebAssembly access to the same development database file. PostgreSQL builds retain the framework's normal worker selection. This setting affects local build concurrency, not public runtime behavior or the production data model.

## Security and version policy

Dependencies are pinned exactly. Production initialization uses the patched Active LTS framework line and excludes RC database tooling. The initialization-day lockfile is authoritative until a reviewed dependency update.

The final Phase 1A audit found vulnerable transitive Sharp and PostCSS resolutions under Next.js. Workspace-level overrides now resolve one Sharp 0.35.3 and one PostCSS 8.5.25 instance. `pnpm audit --prod` reports no known vulnerabilities. These overrides are covered by build, image-processing, public-bundle, unit/integration, and E2E checks and must remain until the parent dependency ranges no longer need them.

## Final Go / No-Go

Refine is **Go with conditions** for the narrow operations UI shell. It is isolated under `/admin`, wrapped in Suspense for App Router compatibility, and absent from the public home client manifest. Custom domain services remain authoritative for every permission, state transition, route transaction, upload, relationship, CRM, publishing, and indexing rule. A future compatibility regression changes the shell to custom UI; it does not change the frozen domain model.
