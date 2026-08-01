# CWT architecture — frozen V1.1

## Style

CWT is a modular monolith: one deployable Next.js application with explicit public, admin, domain, persistence, workflow, and integration boundaries.

## Modules

1. Public web: server-first SEO pages and inquiry UI.
2. Admin: authenticated operational UI; Refine may provide list and simple CRUD primitives only.
3. Domain services: authorization, validation, workflows, publishing, route transactions, CRM rules, and audits.
4. Persistence: PostgreSQL with Drizzle schemas and reviewed migrations.
5. Assets: S3-compatible public, private-inquiry, and internal-import storage contexts.
6. Jobs: durable adapters for image derivation, file scanning, notifications, and future AI/import work.
7. Integrations: email, analytics, search data, storage, and monitoring behind interfaces.

## Rendering

- Public marketing, product, taxonomy, application, library, and content pages are server components using static or incremental regeneration where appropriate.
- Admin, preview, and CRM surfaces are dynamic and authenticated.
- Publishing invalidates only affected pages and structured outputs.
- Non-production environments are noindex.

## Business boundaries

- UI never writes directly to the database.
- Permissions and invariants run on the server.
- Public rendering reads the approved published state, not an editor's pending revision.
- Published and indexable are independent states.
- Routes are centrally registered; changing a published path creates a redirect transactionally.
- Public and private file access policies are separate.

## Technology baseline

Use the current patched Next.js Active LTS line verified at initialization, React compatible with it, Node.js 24 LTS, strict TypeScript, Tailwind CSS, PostgreSQL 18 or a compatible supported 17 release, Drizzle stable releases pinned exactly, an S3-compatible storage interface, and Sharp-compatible image processing.

## Environment boundary

Local, test, preview, and production configurations use different databases, buckets, secrets, auth, and analytics identifiers. Missing production-critical capabilities fail closed.
