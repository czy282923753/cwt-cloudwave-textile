# ADR-0011: Deterministic Route and Redirect graph mutations

Status: Accepted for the Stage 2C remediation on 2026-08-02. The 0017 final-state extension awaits joint independent review and PostgreSQL acceptance.

## Context

Routes and Redirects form one directed graph. Domain validation rejected collisions, loops and chains, and PostgreSQL triggers serialized a Redirect source, but the two boundaries used different lock sets. A concurrent Redirect `X → Y` and Route move `Y → Z` could each validate a legal snapshot and commit the illegal chain `X → Y → Z` with two success Audits.

The invariant is graph-wide: one path has one current owner, Redirect sources cannot be current Routes, destinations must be current Routes, and every historical source points directly to its final current destination. Joint review showed the immediate 0016 trigger could still accept a direct SQL Route move that left an existing inbound Redirect pointing to a path that was no longer current.

## Decision

All supported Route/Redirect graph mutations use the existing Domain Services and one shared PostgreSQL transaction-advisory-lock namespace. They:

1. normalize the candidate paths;
2. acquire path locks in deterministic lexical order;
3. reread Routes, Redirects and inbound closure under those locks;
4. validate and flatten the graph;
5. commit the mutation and required Audit in one transaction.

A route move may discover another inbound Redirect after its initial snapshot. It rolls back and retries the whole transaction with the expanded lock closure, up to a bounded limit; exhaustion is a safe conflict. Migration 0016 replaces the immediate Route and Redirect trigger functions so direct database writes use the same lock namespace and retain collision, destination, loop and chain checks.

Forward Migration 0017 adds deferred, initially-deferred constraint triggers for affected Route and Redirect paths. At transaction commit they require every active Redirect source to be absent from current Routes, every active destination to exist as a current Route, and no active destination to be another active Redirect source. Route deletion/movement locks the old path in the same namespace. The database rejects invalid final state; it does not flatten, delete or otherwise author graph mutations.

## Consequences

- Competing graph writers serialize deterministically or one fails safely.
- A successful route move flattens every observed inbound Redirect to the final current path.
- A failed or rolled-back mutation has no success Audit.
- A legal multi-statement Route move may temporarily violate the graph during the transaction, but its final state must pass the deferred guard.
- A direct Route move that leaves an inbound destination dangling fails with the complete transaction, including its required Audit.
- No table, persistent lock, Worker, queue or second route service is added.
- Advisory locks are transaction-scoped and released by commit, rollback or connection loss.
- Real PostgreSQL multi-client behavior remains part of Stage 2C External Validation.

## Rejected alternatives

- Lock only the Redirect source: it does not serialize a destination Route move.
- Rely only on a pre-write graph snapshot: concurrent snapshots are not authoritative.
- Add a persistent graph-lock table or queue: disproportionate and a second coordination system.
- Permit chains and flatten asynchronously: violates the frozen URL and SEO rules.
- Require every intermediate statement to satisfy the final graph: rejects the supported atomic flattening transaction.
- Let the trigger rewrite inbound Redirects: creates a second graph mutation authority.
