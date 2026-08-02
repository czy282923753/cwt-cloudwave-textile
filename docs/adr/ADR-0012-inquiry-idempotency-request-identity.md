# ADR-0012: Inquiry idempotency request identity

Status: Accepted for the Stage 2C remediation on 2026-08-02. Independent PostgreSQL acceptance remains required.

## Context

`inquiries.idempotency_key` was unique, but the persisted record did not identify the request content represented by that key. Reuse of a key for different Inquiry content could therefore return the first Inquiry as false success. The route also reserved upload tokens before the Inquiry transaction, so failure could separate token state from the authoritative result.

The idempotency result must distinguish a semantic retry from accidental or malicious key reuse without exposing an earlier customer's data.

## Decision

The existing Inquiry row stores an immutable SHA-256 `request_fingerprint` and integer `request_fingerprint_version`. Version 1 is derived by the Inquiry Domain Service from an ordered canonical representation of submitted Inquiry snapshots, attribution fields and an order-insensitive set of attachment identities. Transport-only identifiers, timestamps, User-Agent, retry counters, Auth Session ID and server-derived consent state are excluded. Opaque upload tokens are represented only by their hashes; raw tokens are not persisted in the fingerprint.

The existing global Idempotency Key remains the lookup authority:

- an equal supported-version fingerprint replays the original public result;
- a different fingerprint returns the stable `INQUIRY_IDEMPOTENCY_CONFLICT` result and HTTP 409;
- a legacy row without a fingerprint fails closed as a conflict.

Upload-token reservation, Contact matching, Inquiry/attachment creation, final token consumption, initial status history, notification-outbox row and required Audit execute in one transaction. The public route delegates idempotency to that Domain Service and does not perform an earlier success lookup or token reservation.

## Consequences

- Concurrent equal requests create one Inquiry and one replay.
- Concurrent different requests create one Inquiry and one conflict without disclosing the winner.
- A failed transaction does not consume attachment tokens or leave partial CRM state.
- The fingerprint is versioned so any later semantic change can fail closed and be explicitly migrated or introduced.
- Two nullable fields and one Check Constraint are added to the existing Inquiry table; no idempotency table, Worker, queue or second API is added.
- Existing legacy Inquiries remain readable and are not assigned guessed fingerprints.

## Rejected alternatives

- Return the first Inquiry for every duplicate key: cannot distinguish a different request.
- Reconstruct identity from mutable related records: attachments and normalization semantics are not a stable historical request contract.
- Add a general idempotency table/platform: disproportionate to the single Phase 1A Inquiry authority.
- Reserve upload tokens in the HTTP route: separates one business transaction into competing authorities.
