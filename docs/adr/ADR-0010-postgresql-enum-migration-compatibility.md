# ADR-0010: PostgreSQL enum migration compatibility at the 0010 boundary

Status: Accepted for implementation on 2026-08-02. Independent Stage 2B revalidation remains required.

## Context

Real PostgreSQL 18.4 rejected the supported `0010 → latest` upgrade with SQLSTATE `55P04`. Migration 0011 adds `finalizing` to the already committed `asset_upload_batch_status` enum, while Migration 0013 uses that value. Drizzle ORM 0.45.2 runs every pending PostgreSQL migration in one transaction, so the added value has not committed when 0013 uses it. Fresh migration is different because 0010 creates the enum type inside that same transaction; PostgreSQL permits values added to an enum type created in the current outer transaction.

Migration 0016 alone cannot help because execution stops at 0013. Editing 0011/0013 would fork the frozen migration identity. A general per-migration transaction runner would change every migration's atomicity and maintenance model for one bounded historical edge.

## Decision

The formal PostgreSQL migration entry uses one dedicated `postgres.js` client configured with `max: 1`. One Session Advisory Lock covers inspection, any enum preflight transaction, Drizzle migration, and final verification. `postgres.js` 3.4.9 exposes `reserve()`, but its reserved runtime client does not expose the `begin()` operation required by Drizzle's PostgreSQL Migrator. The documented single-connection `max: 1` client is therefore the equivalent connection mechanism; Backend PID fencing verifies that the lock, preflight and Migrator remain on that physical PostgreSQL session. A changed PID fails closed.

The compatibility module recognizes only these states:

| Journal and catalog | Action |
| --- | --- |
| Empty Journal; enum absent | Standard Fresh migration |
| Journal at 0009 or earlier; enum absent | Standard migration; 0010 creates the type in the current transaction |
| Journal exactly 0010; exact 0010 enum without `finalizing` | Commit a narrow enum preflight, then adapt the one approved 0011 statement in memory |
| Journal exactly 0010; exact final enum | Treat as recovery after a committed preflight; adapt the same statement in memory |
| Journal at 0011 or later; exact final enum | Standard remaining/no-op migration |
| Any other combination | Fail closed without catalog or Journal repair |

The adapter verifies the approved 0011 SHA-256, folder timestamp and exactly one normalized target statement. Only for the two 0010 compatibility states, that statement executes as `ADD VALUE IF NOT EXISTS`; every other statement remains byte-derived from the on-disk migration. The `MigrationMeta.hash` remains the approved original hash because the exact enum addition has already committed and Drizzle records 0011 only after its remaining SQL succeeds. The adapter never inserts Journal rows itself and does not modify the migration file.

## Failure and recovery

- Failure before or inside the enum preflight leaves the Journal and enum unchanged.
- Failure after the enum commit but before Drizzle leaves Journal 0010 plus the exact final enum. The next run recognizes that recovery state.
- Failure in the remaining 0011–0015 batch rolls back those DDL and Journal rows while retaining the committed enum, then resumes through the same recovery state.
- A second migration client cannot acquire the Session Advisory Lock and exits safely.
- Connection loss releases the Session Advisory Lock. A surviving process re-inspects Journal and catalog after acquiring it.
- Unknown Journal timestamps, missing types/values, unexpected value order, changed 0011 identity, a non-dedicated client or Backend PID change fail closed with sanitized errors.

## Consequences

- No historical Migration, Snapshot, Drizzle Journal metadata, business Schema or business data changes.
- No new table, state, Worker, Lease, queue or second Migration Journal.
- One bounded compatibility branch and one non-persistent Session Advisory Lock are added to the PostgreSQL migration path only.
- PGlite and ordinary application database operations do not enter this path.
- Linux x64/ARM64 and macOS ARM64 use only Node.js, postgres.js and PostgreSQL-standard behavior; no host path, Docker API or architecture detail is embedded in runtime code.

## Rejected alternatives

- A future-only 0016: unreachable from the failing 0010 path.
- Manual SQL or Journal edits: non-repeatable and not deployment-safe.
- `COMMIT` inside 0011: breaks Drizzle's outer transaction and Journal atomicity.
- Historical 0011/0013 edits: create divergent frozen migration identities.
- A general per-migration runner or squash: disproportionate scope and a parallel migration model.

## Retirement condition

Removal requires separate approval after every supported deployment and recoverable backup is confirmed at Journal 0011 or later and no 0010 preflight-recovery instance remains. Until then, the exact hash and state checks remain fail-closed compatibility evidence, not a general repair framework.
