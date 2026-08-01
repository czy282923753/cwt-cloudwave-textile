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

## Final local remediation boundaries

- A Server Action is a transport adapter only: parse/validate, call one Domain Service, map a known error, and revalidate or redirect. Author, Company Fact, Asset relation/batch, Organization, Contact and Feature Flag writes are domain-owned.
- Required Audit Logs share the exact transaction with the mutation and relationship/status writes. The shared governed-mutation context supplies a transaction-bound Audit writer to the owning service and any nested service. A failed Audit insert fails the operation. Permission and target-state checks run again inside the Domain Service transaction.
- `publicProductEligibilityConditions` is the single Product public-truth predicate. Correlated helpers expose it to Taxonomy, Application and Fabric Library queries without copying a weaker Published-only condition.
- Admin uploads use a three-step boundary: small authenticated Intent JSON; a raw bounded binary PUT into Private/Internal staging with MIME, signature, decode and scan; then small finalize JSON. Finalize is serialized by an atomic `ready_to_finalize → finalizing` claim. Every expected destination key receives a durable cleanup record before its storage put. Public activation, variants, relations, Intent consumption, Batch completion and Audit commit atomically; compensation is lease-based, idempotent, retryable and dead-lettered instead of relying on process memory.

## Final Closure boundaries

- Database transactions never wait on object-storage writes. Storage compensation is an explicit durable workflow; controlled public delivery cannot see a copied object until its database Asset and relation are Ready and eligible.
- Governed admin mutations return a typed, sanitized Action Result. The client form owns pending state, repeat-submit suppression, result announcements, error focus and refresh/redirect intent; Domain Services remain the only business-write authority.
- Database constraints with application policy meaning have one exported SQL expression. Migration 0011 replaces the old conversion-event constraint by forward migration and tests the actual `pg_get_constraintdef` result for both Fresh and Upgrade paths.

## Final Closure Round 2 boundaries

- Admin staging is a three-phase persistent Saga. Its preregistration transaction creates the expected key, nonpublic Asset placeholder, staging Recovery/Cleanup work, controlled Intent/Batch state and Audit before any external write. Storage/scan progress is persisted; the completion transaction makes the staged Asset ready and closes the Saga. A post-put failure always has a database recovery path.
- Finalize claim is an atomic database operation that combines `finalizing`, a Finalize Recovery record, active lease owner/expiry/version, attempt count and Audit. Finalize persists progress, and every final commit is fenced by current owner, unexpired lease and version. Expired work can be reclaimed; the old worker is rejected.
- Recovery and Cleanup workers use explicit system identity. Reconciliation state plus Audit is atomic. An Audit outage rolls the state transition back and leaves work retryable; it cannot manufacture a completed job.
- Admin writes return `AdminActionResult` through the common adapter, never direct Server Action redirects or `void`. Success carries message, Entity ID and observable navigation intent; failures carry field/form feedback and a sanitized error code.

## Technology baseline

Use the current patched Next.js Active LTS line verified at initialization, React compatible with it, Node.js 24 LTS, strict TypeScript, Tailwind CSS, PostgreSQL 18 or a compatible supported 17 release, Drizzle stable releases pinned exactly, an S3-compatible storage interface, and Sharp-compatible image processing.

## Environment boundary

Local, test, preview, and production configurations use different databases, buckets, secrets, auth, and analytics identifiers. Missing production-critical capabilities fail closed.
