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

Conditional Go for admin navigation, lists, paging, sorting, filters, detail views, and simple CRUD only. Refine Core 5.0.12 and Next.js Router 7.0.5 require a Suspense boundary under App Router. Public bundle inspection confirms isolation from the public home route.

## Local substitutes

PGlite provides PostgreSQL-compatible local and integration-test execution. PostgreSQL remains required for preview/production. Local filesystem storage and a development scanner are permitted only outside production; S3-compatible storage and a real scanner are production gates.

## Security and version policy

Dependencies are pinned exactly. Production initialization uses the patched Active LTS framework line and excludes RC database tooling. The initialization-day lockfile is authoritative until a reviewed dependency update.
