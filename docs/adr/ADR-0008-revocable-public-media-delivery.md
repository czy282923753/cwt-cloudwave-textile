# ADR-0008: Revocable public media delivery

- Status: Accepted for Phase 1A Remediation Round 2
- Date: 2026-08-01

## Context

The former S3 adapter assembled permanent CDN URLs from raw object keys. Those URLs bypassed the live rule that a Public Asset must still be related to a currently Published entity. Archive, unlink, deletion, scan failure, expiry, and rights revocation therefore could not reliably revoke an already emitted URL.

## Decision

All environments use the application-controlled `/api/public-assets/{assetId}/` media route. Public page data may emit only this route. The route resolves the Asset by ID, verifies Public partition/access, Ready state, Passed scan, image MIME, no deletion, no expired or expressly denied declaration, and an effective relation to a currently Published Product, Fabric Entry, or Content record. Only then does the storage adapter read the origin object.

Raw object keys and permanent Bucket/CDN URLs are never emitted into public HTML. R2/S3 `public` storage is a logical application partition, not an anonymously readable bucket. Private Inquiry Assets cannot satisfy the route query.

## Cache and revocation

Phase 1A responses use `private, no-store, max-age=0, must-revalidate`. Archive, unlink, delete, scan-state and rights changes therefore take effect on the next request without a stale shared-cache window. Future edge delivery may add a bounded shared TTL only together with verified explicit purge or a delivery-version cache key; enabling that remains an external deployment validation decision.

## Environment behavior

Local, Preview, and S3 adapters generate the identical application path. The route uses the configured adapter only after authorization. S3 credentials and buckets remain server-only.

## Production validation still required

Before an R2/S3/CDN deployment, verify bucket public-access blocking, cache-header preservation, cache-key behavior, purge propagation, Range requests if enabled, origin authentication, large-object memory behavior, and revocation at Archive/Unlink/Delete/Rights change. This is **External Validation Required**.
